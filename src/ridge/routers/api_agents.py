import json
import logging

from fastapi import APIRouter, Request
from fastapi.requests import Request
from fastapi.responses import Response

from ridge.database.adapters import AgentAdapters
from ridge.database.models import RidgeUser
from ridge.routers.helpers import CommonQueryParams

# Initialize Router
logger = logging.getLogger(__name__)


api_agents = APIRouter()


@api_agents.get("", response_class=Response)
async def all_agents(
    request: Request,
    common: CommonQueryParams,
) -> Response:
    user: RidgeUser = request.user.object if request.user.is_authenticated else None
    agents = await AgentAdapters.aget_all_accessible_agents(user)
    agents_packet = list()
    for agent in agents:
        agents_packet.append(
            {
                "slug": agent.slug,
                "avatar": agent.avatar,
                "name": agent.name,
                "personality": agent.personality,
                "public": agent.public,
                "creator": agent.creator.username if agent.creator else None,
                "managed_by_admin": agent.managed_by_admin,
                "color": agent.style_color,
                "icon": agent.style_icon,
            }
        )

    # Make sure that the agent named 'ridge' is first in the list. Everything else is sorted by name.
    agents_packet.sort(key=lambda x: x["name"])
    agents_packet.sort(key=lambda x: x["slug"] == "ridge", reverse=True)
    return Response(content=json.dumps(agents_packet), media_type="application/json", status_code=200)
