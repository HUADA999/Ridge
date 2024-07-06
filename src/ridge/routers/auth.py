import asyncio
import datetime
import logging
import os
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from starlette.authentication import requires
from starlette.config import Config
from starlette.requests import Request
from starlette.responses import HTMLResponse, RedirectResponse, Response
from starlette.status import HTTP_302_FOUND

from ridge.database.adapters import (
    acreate_ridge_token,
    aget_or_create_user_by_email,
    aget_user_validated_by_email_verification_code,
    delete_ridge_token,
    get_ridge_tokens,
    get_or_create_user,
)
from ridge.routers.email import send_magic_link_email, send_welcome_email
from ridge.routers.helpers import get_next_url, update_telemetry_state
from ridge.utils import state

logger = logging.getLogger(__name__)

auth_router = APIRouter()


class MagicLinkForm(BaseModel):
    email: EmailStr


if not state.anonymous_mode:
    missing_requirements = []
    from authlib.integrations.starlette_client import OAuth, OAuthError

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except ImportError:
        missing_requirements += ["Install the Ridge production package with `pip install ridge-assistant[prod]`"]
    if not os.environ.get("RESEND_API_KEY") and (
        not os.environ.get("GOOGLE_CLIENT_ID") or not os.environ.get("GOOGLE_CLIENT_SECRET")
    ):
        missing_requirements += [
            "Set your RESEND_API_KEY or GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET as environment variables"
        ]
    if missing_requirements:
        requirements_string = "\n   - " + "\n   - ".join(missing_requirements)
        error_msg = f"🚨 Start Ridge with --anonymous-mode flag or to enable authentication:{requirements_string}"
        logger.error(error_msg)

    config = Config(environ=os.environ)

    oauth = OAuth(config)

    CONF_URL = "https://accounts.google.com/.well-known/openid-configuration"
    oauth.register(name="google", server_metadata_url=CONF_URL, client_kwargs={"scope": "openid email profile"})


@auth_router.get("/login")
async def login_get(request: Request):
    redirect_uri = str(request.app.url_path_for("auth"))
    return await oauth.google.authorize_redirect(request, redirect_uri)


@auth_router.post("/login")
async def login(request: Request):
    redirect_uri = str(request.app.url_path_for("auth"))
    return await oauth.google.authorize_redirect(request, redirect_uri)


@auth_router.post("/magic")
async def login_magic_link(request: Request, form: MagicLinkForm):
    if request.user.is_authenticated:
        # Clear the session if user is already authenticated
        request.session.pop("user", None)

    email = form.email
    user = await aget_or_create_user_by_email(email)
    unique_id = user.email_verification_code

    if user:
        await send_magic_link_email(email, unique_id, request.base_url)

    return Response(status_code=200)


@auth_router.get("/magic")
async def sign_in_with_magic_link(request: Request, code: str):
    user = await aget_user_validated_by_email_verification_code(code)
    if user:
        id_info = {
            "email": user.email,
        }

        request.session["user"] = dict(id_info)
        return RedirectResponse(url="/")
    return RedirectResponse(request.app.url_path_for("login_page"))


@auth_router.post("/token")
@requires(["authenticated"], redirect="login_page")
async def generate_token(request: Request, token_name: Optional[str] = None):
    "Generate API token for given user"
    if token_name:
        token = await acreate_ridge_token(user=request.user.object, name=token_name)
    else:
        token = await acreate_ridge_token(user=request.user.object)
    return {
        "token": token.token,
        "name": token.name,
    }


@auth_router.get("/token")
@requires(["authenticated"], redirect="login_page")
def get_tokens(request: Request):
    "Get API tokens enabled for given user"
    tokens = get_ridge_tokens(user=request.user.object)
    return tokens


@auth_router.delete("/token")
@requires(["authenticated"], redirect="login_page")
async def delete_token(request: Request, token: str):
    "Delete API token for given user"
    return await delete_ridge_token(user=request.user.object, token=token)


@auth_router.post("/redirect")
async def auth(request: Request):
    form = await request.form()
    next_url = get_next_url(request)
    for q in request.query_params:
        if not q == "next":
            next_url += f"&{q}={request.query_params[q]}"

    credential = form.get("credential")

    csrf_token_cookie = request.cookies.get("g_csrf_token")
    if not csrf_token_cookie:
        logger.info("Missing CSRF token. Redirecting user to login page")
        return RedirectResponse(url=next_url)
    csrf_token_body = form.get("g_csrf_token")
    if not csrf_token_body:
        logger.info("Missing CSRF token body. Redirecting user to login page")
        return RedirectResponse(url=next_url)
    if csrf_token_cookie != csrf_token_body:
        return Response("Invalid CSRF token", status_code=400)

    try:
        idinfo = id_token.verify_oauth2_token(credential, google_requests.Request(), os.environ["GOOGLE_CLIENT_ID"])
    except OAuthError as error:
        return HTMLResponse(f"<h1>{error.error}</h1>")
    ridge_user = await get_or_create_user(idinfo)

    if ridge_user:
        request.session["user"] = dict(idinfo)

        if datetime.timedelta(minutes=3) > (datetime.datetime.now(datetime.timezone.utc) - ridge_user.date_joined):
            asyncio.create_task(send_welcome_email(idinfo["name"], idinfo["email"]))
            update_telemetry_state(
                request=request,
                telemetry_type="api",
                api="create_user",
                metadata={"user_id": str(ridge_user.uuid)},
            )
            logger.log(logging.INFO, f"🥳 New User Created: {ridge_user.uuid}")
            return RedirectResponse(url=next_url, status_code=HTTP_302_FOUND)

    return RedirectResponse(url=next_url, status_code=HTTP_302_FOUND)


@auth_router.get("/logout")
async def logout(request: Request):
    request.session.pop("user", None)
    return RedirectResponse(url="/")
