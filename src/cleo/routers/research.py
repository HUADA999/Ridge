import json
import logging
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

import yaml
from fastapi import Request

from ridge.database.adapters import ConversationAdapters, EntryAdapters
from ridge.database.models import Agent, RidgeUser
from ridge.processor.conversation import prompts
from ridge.processor.conversation.utils import (
    InformationCollectionIteration,
    construct_iteration_history,
    remove_json_codeblock,
)
from ridge.processor.tools.online_search import read_webpages, search_online
from ridge.processor.tools.run_code import run_code
from ridge.routers.api import extract_references_and_questions
from ridge.routers.helpers import (
    ChatEvent,
    construct_chat_history,
    extract_relevant_info,
    generate_summary_from_files,
    send_message_to_model_wrapper,
)
from ridge.utils.helpers import (
    ConversationCommand,
    function_calling_description_for_llm,
    is_none_or_empty,
    timer,
)
from ridge.utils.rawconfig import LocationData

logger = logging.getLogger(__name__)


async def apick_next_tool(
    query: str,
    conversation_history: dict,
    user: RidgeUser = None,
    query_images: List[str] = [],
    location: LocationData = None,
    user_name: str = None,
    agent: Agent = None,
    previous_iterations_history: str = None,
    max_iterations: int = 5,
    send_status_func: Optional[Callable] = None,
    tracer: dict = {},
):
    """
    Given a query, determine which of the available tools the agent should use in order to answer appropriately. One at a time, and it's able to use subsequent iterations to refine the answer.
    """

    tool_options = dict()
    tool_options_str = ""

    agent_tools = agent.input_tools if agent else []

    for tool, description in function_calling_description_for_llm.items():
        tool_options[tool.value] = description
        if len(agent_tools) == 0 or tool.value in agent_tools:
            tool_options_str += f'- "{tool.value}": "{description}"\n'

    chat_history = construct_chat_history(conversation_history, agent_name=agent.name if agent else "Ridge")

    if query_images:
        query = f"[placeholder for user attached images]\n{query}"

    personality_context = (
        prompts.personality_context.format(personality=agent.personality) if agent and agent.personality else ""
    )

    # Extract Past User Message and Inferred Questions from Conversation Log
    today = datetime.today()
    location_data = f"{location}" if location else "Unknown"
    username = prompts.user_name.format(name=user_name) if user_name else ""

    function_planning_prompt = prompts.plan_function_execution.format(
        query=query,
        tools=tool_options_str,
        chat_history=chat_history,
        personality_context=personality_context,
        current_date=today.strftime("%Y-%m-%d"),
        day_of_week=today.strftime("%A"),
        username=username,
        location=location_data,
        previous_iterations=previous_iterations_history,
        max_iterations=max_iterations,
    )

    with timer("Chat actor: Infer information sources to refer", logger):
        response = await send_message_to_model_wrapper(
            function_planning_prompt,
            response_type="json_object",
            user=user,
            query_images=query_images,
            tracer=tracer,
        )

    try:
        response = response.strip()
        response = remove_json_codeblock(response)
        response = json.loads(response)
        selected_tool = response.get("tool", None)
        generated_query = response.get("query", None)
        scratchpad = response.get("scratchpad", None)
        logger.info(f"Response for determining relevant tools: {response}")
        if send_status_func:
            determined_tool_message = "**Determined Tool**: "
            determined_tool_message += f"{selected_tool}({generated_query})." if selected_tool else "respond."
            determined_tool_message += f"\nReason: {scratchpad}" if scratchpad else ""
            async for event in send_status_func(f"{scratchpad}"):
                yield {ChatEvent.STATUS: event}

        yield InformationCollectionIteration(
            tool=selected_tool,
            query=generated_query,
        )

    except Exception as e:
        logger.error(f"Invalid response for determining relevant tools: {response}. {e}", exc_info=True)
        yield InformationCollectionIteration(
            tool=None,
            query=None,
        )


async def execute_information_collection(
    request: Request,
    user: RidgeUser,
    query: str,
    conversation_id: str,
    conversation_history: dict,
    query_images: List[str],
    agent: Agent = None,
    send_status_func: Optional[Callable] = None,
    user_name: str = None,
    location: LocationData = None,
    file_filters: List[str] = [],
    tracer: dict = {},
):
    current_iteration = 0
    MAX_ITERATIONS = 5
    previous_iterations: List[InformationCollectionIteration] = []
    while current_iteration < MAX_ITERATIONS:
        online_results: Dict = dict()
        code_results: Dict = dict()
        compiled_references: List[Any] = []
        summarize_files: str = ""
        inferred_queries: List[Any] = []
        this_iteration = InformationCollectionIteration(tool=None, query=query)
        previous_iterations_history = construct_iteration_history(previous_iterations, prompts.previous_iteration)

        async for result in apick_next_tool(
            query,
            conversation_history,
            user,
            query_images,
            location,
            user_name,
            agent,
            previous_iterations_history,
            MAX_ITERATIONS,
            send_status_func,
            tracer=tracer,
        ):
            if isinstance(result, dict) and ChatEvent.STATUS in result:
                yield result[ChatEvent.STATUS]
            elif isinstance(result, InformationCollectionIteration):
                this_iteration = result

        if this_iteration.tool == ConversationCommand.Notes:
            ## Extract Document References
            compiled_references, inferred_queries, defiltered_query = [], [], None
            async for result in extract_references_and_questions(
                request,
                conversation_history,
                this_iteration.query,
                7,
                None,
                conversation_id,
                [ConversationCommand.Default],
                location,
                send_status_func,
                query_images,
                agent=agent,
                tracer=tracer,
            ):
                if isinstance(result, dict) and ChatEvent.STATUS in result:
                    yield result[ChatEvent.STATUS]
                else:
                    compiled_references.extend(result[0])
                    inferred_queries.extend(result[1])
                    defiltered_query = result[2]
                    this_iteration.context = compiled_references

        if not is_none_or_empty(compiled_references):
            try:
                headings = "\n- " + "\n- ".join(set([c.get("compiled", c).split("\n")[0] for c in compiled_references]))
                # Strip only leading # from headings
                headings = headings.replace("#", "")
                async for result in send_status_func(f"**Found Relevant Notes**: {headings}"):
                    yield result
            except Exception as e:
                # TODO Get correct type for compiled across research notes extraction
                logger.error(f"Error extracting references: {e}", exc_info=True)

        elif this_iteration.tool == ConversationCommand.Online:
            async for result in search_online(
                this_iteration.query,
                conversation_history,
                location,
                user,
                send_status_func,
                [],
                max_webpages_to_read=0,
                query_images=query_images,
                agent=agent,
                tracer=tracer,
            ):
                if isinstance(result, dict) and ChatEvent.STATUS in result:
                    yield result[ChatEvent.STATUS]
                else:
                    online_results: Dict[str, Dict] = result  # type: ignore
                    this_iteration.onlineContext = online_results

        elif this_iteration.tool == ConversationCommand.Webpage:
            try:
                async for result in read_webpages(
                    this_iteration.query,
                    conversation_history,
                    location,
                    user,
                    send_status_func,
                    query_images=query_images,
                    agent=agent,
                    tracer=tracer,
                ):
                    if isinstance(result, dict) and ChatEvent.STATUS in result:
                        yield result[ChatEvent.STATUS]
                    else:
                        direct_web_pages: Dict[str, Dict] = result  # type: ignore

                        webpages = []
                        for web_query in direct_web_pages:
                            if online_results.get(web_query):
                                online_results[web_query]["webpages"] = direct_web_pages[web_query]["webpages"]
                            else:
                                online_results[web_query] = {"webpages": direct_web_pages[web_query]["webpages"]}

                            for webpage in direct_web_pages[web_query]["webpages"]:
                                webpages.append(webpage["link"])
                        this_iteration.onlineContext = online_results
            except Exception as e:
                logger.error(f"Error reading webpages: {e}", exc_info=True)

        elif this_iteration.tool == ConversationCommand.Code:
            try:
                async for result in run_code(
                    this_iteration.query,
                    conversation_history,
                    previous_iterations_history,
                    location,
                    user,
                    send_status_func,
                    query_images=query_images,
                    agent=agent,
                    tracer=tracer,
                ):
                    if isinstance(result, dict) and ChatEvent.STATUS in result:
                        yield result[ChatEvent.STATUS]
                    else:
                        code_results: Dict[str, Dict] = result  # type: ignore
                        this_iteration.codeContext = code_results
                async for result in send_status_func(f"**Ran code snippets**: {len(this_iteration.codeContext)}"):
                    yield result
            except ValueError as e:
                logger.warning(
                    f"Failed to use code tool: {e}. Attempting to respond without code results",
                    exc_info=True,
                )

        elif this_iteration.tool == ConversationCommand.Summarize:
            try:
                async for result in generate_summary_from_files(
                    this_iteration.query,
                    user,
                    file_filters,
                    conversation_history,
                    query_images=query_images,
                    agent=agent,
                    send_status_func=send_status_func,
                ):
                    if isinstance(result, dict) and ChatEvent.STATUS in result:
                        yield result[ChatEvent.STATUS]
                    else:
                        summarize_files = result  # type: ignore
            except Exception as e:
                logger.error(f"Error generating summary: {e}", exc_info=True)

        else:
            # No valid tools. This is our exit condition.
            current_iteration = MAX_ITERATIONS

        current_iteration += 1

        if compiled_references or online_results or code_results or summarize_files:
            results_data = f"**Results**:\n"
            if compiled_references:
                results_data += f"**Document References**: {yaml.dump(compiled_references, allow_unicode=True, sort_keys=False, default_flow_style=False)}\n"
            if online_results:
                results_data += f"**Online Results**: {yaml.dump(online_results, allow_unicode=True, sort_keys=False, default_flow_style=False)}\n"
            if code_results:
                results_data += f"**Code Results**: {yaml.dump(code_results, allow_unicode=True, sort_keys=False, default_flow_style=False)}\n"
            if summarize_files:
                results_data += f"**Summarized Files**: {yaml.dump(summarize_files, allow_unicode=True, sort_keys=False, default_flow_style=False)}\n"

            # intermediate_result = await extract_relevant_info(this_iteration.query, results_data, agent)
            this_iteration.summarizedResult = results_data

        previous_iterations.append(this_iteration)
        yield this_iteration
