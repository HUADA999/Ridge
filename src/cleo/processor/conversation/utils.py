# Standard Packages
import os
import logging
from datetime import datetime

# External Packages
from langchain.chat_models import ChatOpenAI
from langchain.schema import ChatMessage
import openai
import tiktoken
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    wait_random_exponential,
)

# Internal Packages
from ridge.utils.helpers import merge_dicts


logger = logging.getLogger(__name__)
max_prompt_size = {"gpt-3.5-turbo": 4096, "gpt-4": 8192}


@retry(
    retry=(
        retry_if_exception_type(openai.error.Timeout)
        | retry_if_exception_type(openai.error.APIError)
        | retry_if_exception_type(openai.error.APIConnectionError)
        | retry_if_exception_type(openai.error.RateLimitError)
        | retry_if_exception_type(openai.error.ServiceUnavailableError)
    ),
    wait=wait_random_exponential(min=1, max=30),
    stop=stop_after_attempt(6),
    before_sleep=before_sleep_log(logger, logging.DEBUG),
    reraise=True,
)
def completion_with_backoff(**kwargs):
    openai.api_key = kwargs["api_key"] if kwargs.get("api_key") else os.getenv("OPENAI_API_KEY")
    return openai.Completion.create(**kwargs, request_timeout=60)


@retry(
    retry=(
        retry_if_exception_type(openai.error.Timeout)
        | retry_if_exception_type(openai.error.APIError)
        | retry_if_exception_type(openai.error.APIConnectionError)
        | retry_if_exception_type(openai.error.RateLimitError)
        | retry_if_exception_type(openai.error.ServiceUnavailableError)
    ),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    stop=stop_after_attempt(6),
    before_sleep=before_sleep_log(logger, logging.DEBUG),
    reraise=True,
)
def chat_completion_with_backoff(messages, model, temperature, **kwargs):
    openai_api_key = kwargs["api_key"] if kwargs.get("api_key") else os.getenv("OPENAI_API_KEY")
    chat = ChatOpenAI(
        model_name=model,
        temperature=temperature,
        openai_api_key=openai_api_key,
        request_timeout=60,
    )
    return chat(messages).content


def generate_chatml_messages_with_context(
    user_message, system_message, conversation_log={}, model_name="gpt-3.5-turbo", lookback_turns=2
):
    """Generate messages for ChatGPT with context from previous conversation"""
    # Extract Chat History for Context
    chat_logs = [f'{chat["message"]}\n\nNotes:\n{chat.get("context","")}' for chat in conversation_log.get("chat", [])]
    rest_backnforths = []
    # Extract in reverse chronological order
    for user_msg, assistant_msg in zip(chat_logs[-2::-2], chat_logs[::-2]):
        if len(rest_backnforths) >= 2 * lookback_turns:
            break
        rest_backnforths += reciprocal_conversation_to_chatml([user_msg, assistant_msg])[::-1]

    # Format user and system messages to chatml format
    system_chatml_message = [ChatMessage(content=system_message, role="system")]
    user_chatml_message = [ChatMessage(content=user_message, role="user")]

    messages = user_chatml_message + rest_backnforths + system_chatml_message

    # Truncate oldest messages from conversation history until under max supported prompt size by model
    encoder = tiktoken.encoding_for_model(model_name)
    tokens = sum([len(encoder.encode(content)) for message in messages for content in message.content])
    while tokens > max_prompt_size[model_name]:
        messages.pop()
        tokens = sum([len(encoder.encode(content)) for message in messages for content in message.content])

    # Return message in chronological order
    return messages[::-1]


def reciprocal_conversation_to_chatml(message_pair):
    """Convert a single back and forth between user and assistant to chatml format"""
    return [ChatMessage(content=message, role=role) for message, role in zip(message_pair, ["user", "assistant"])]


def message_to_prompt(
    user_message, conversation_history="", gpt_message=None, start_sequence="\nAI:", restart_sequence="\nHuman:"
):
    """Create prompt for GPT from messages and conversation history"""
    gpt_message = f" {gpt_message}" if gpt_message else ""

    return f"{conversation_history}{restart_sequence} {user_message}{start_sequence}{gpt_message}"


def message_to_log(user_message, gpt_message, user_message_metadata={}, ridge_message_metadata={}, conversation_log=[]):
    """Create json logs from messages, metadata for conversation log"""
    default_ridge_message_metadata = {
        "intent": {"type": "remember", "memory-type": "notes", "query": user_message},
        "trigger-emotion": "calm",
    }
    ridge_response_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Create json log from Human's message
    human_log = merge_dicts({"message": user_message, "by": "you"}, user_message_metadata)

    # Create json log from GPT's response
    ridge_log = merge_dicts(ridge_message_metadata, default_ridge_message_metadata)
    ridge_log = merge_dicts({"message": gpt_message, "by": "ridge", "created": ridge_response_time}, ridge_log)

    conversation_log.extend([human_log, ridge_log])
    return conversation_log


def extract_summaries(metadata):
    """Extract summaries from metadata"""
    return "".join([f'\n{session["summary"]}' for session in metadata])
