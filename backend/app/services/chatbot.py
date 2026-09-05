import time

import httpx
from fastapi import HTTPException
from sqlmodel import Session

from app.config import settings
from app.models.user import User
from app.services.chatbot_tools import FUNCTION_DECLARATIONS, execute_function

RETRYABLE_STATUS_CODES = {429, 500, 503}

GEMINI_MODEL = "gemini-3.1-flash-lite"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

MAX_FUNCTION_CALL_ROUNDS = 5

SYSTEM_INSTRUCTION = """You are the support assistant for My Autograph, a platform that connects \
celebrities directly with fans, and handles event ticketing.

What the platform does:
- Celebrities share autographs (photos/digital collectibles) and host live streams; fans request \
and collect autographs, and can transfer or resell them (autograph marketplace).
- Fans can browse and buy tickets to events under "Get tickets". Events are created by Agents or \
Managers, each event can have several ticket types (e.g. VIP, Regular), and every purchased ticket \
has a QR code that can be scanned to verify it (page: "Verify"), plus a downloadable PDF, and an \
emailed confirmation with the ticket and receipt.
- "Shop from Star" combines the Marketplace (autographs fans resell/auction to each other) and Merch \
(items celebrities sell directly).
- "Auctions" (Star Auctions) are separate time-limited bidding auctions for items from celebrities.
- Transport: a "Transport Manager" role can register a bus company and list buses under "Get tickets" \
> Transport; only that role can register companies, everyone can browse.
- Every user has a wallet (balance in Nigerian Naira, ₦) used for buying things and receiving \
referral/agent commissions. Agents and Managers (and similar earner roles) can withdraw their wallet \
balance to a verified bank account; the withdrawal account holder's name must match their My \
Autograph account name.

Account roles (chosen at signup):
- Fan: browses, buys tickets, collects autographs, buys from marketplace/merch/auctions.
- Celebrity: shares autographs, goes live, sells merch, can approve a Manager's roster.
- Agent: creates events/concerts directly and sells tickets; can invite Ticket Sales Agents.
- Manager: onboards celebrities into a roster, creates events tied to their roster, sets the agent \
commission percent per event, invites Agents to help sell tickets for a cut of each sale.
- Ticket Sales Agent: invited via a code by a celebrity/manager to help sell tickets and earn a \
commission automatically deposited to their wallet.
- Transport Manager: registers a transport company and buses.
- Admin: internal platform administration.

How referral/agent commissions work: the platform keeps a fixed 7% of a referred ticket sale; the \
event's Manager sets what percent of the remaining amount the referring Agent earns. Buyers always \
pay the exact listed ticket price - no markup.

Be concise, friendly, and practical. Give step-by-step guidance using the actual navigation labels \
(e.g. "Get tickets", "Shop from Star", "Verify", "Auctions", "Dashboard"). Never invent order \
numbers, balances, or transaction details. If a question is unrelated to My Autograph, politely \
redirect to what you can help with.

For any technical issue you can't resolve (a bug, a payment that didn't go through, an account \
problem, something broken, or anything you're not confident about), tell the user to email customer \
support directly at info.myautographma@gmail.com and that the app also has an "Email customer \
support" option right in this chat window."""

LOGGED_OUT_ADDITION = """

The current visitor is NOT logged in. You do NOT have access to any specific user's real account \
data (balances, order status, ticket history) - if asked about that, tell them to log in first, \
then ask again so you can look it up for them."""

LOGGED_IN_ADDITION = """

The current user IS logged in, and you have live function-calling tools to check THEIR OWN account: \
get_wallet_balance, list_my_tickets, list_my_orders, list_my_withdrawals. Use them whenever the user \
asks about their balance, tickets, order/payment status, or withdrawals - always call the relevant \
function rather than guessing or estimating. These tools only ever return the current user's own \
data; there is no way to look up anyone else's account, so never claim to."""


def _call_gemini(payload: dict) -> dict:
    response = None
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            response = httpx.post(
                GEMINI_URL, params={"key": settings.gemini_api_key}, json=payload, timeout=45
            )
            response.raise_for_status()
            last_error = None
            break
        except httpx.HTTPStatusError as exc:
            last_error = exc
            if exc.response.status_code not in RETRYABLE_STATUS_CODES or attempt == 1:
                break
            time.sleep(1.5)
        except httpx.HTTPError as exc:
            last_error = exc
            if attempt == 1:
                break
            time.sleep(1.5)

    if last_error is not None:
        if isinstance(last_error, httpx.HTTPStatusError) and last_error.response.status_code in (
            429,
            503,
        ):
            raise HTTPException(
                status_code=503, detail="The assistant is busy right now - please try again shortly."
            )
        raise HTTPException(status_code=502, detail="Could not reach the assistant. Please try again.")

    return response.json()


def ask_chatbot(
    message: str,
    history: list[dict],
    session: Session | None = None,
    user: User | None = None,
) -> str:
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="The assistant is not configured yet")

    contents = []
    for turn in history[-10:]:
        role = "model" if turn.get("role") == "assistant" else "user"
        text = (turn.get("content") or "").strip()
        if text:
            contents.append({"role": role, "parts": [{"text": text}]})
    contents.append({"role": "user", "parts": [{"text": message}]})

    can_call_functions = user is not None and session is not None
    system_text = SYSTEM_INSTRUCTION + (LOGGED_IN_ADDITION if can_call_functions else LOGGED_OUT_ADDITION)

    payload = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": system_text}]},
        "generationConfig": {"maxOutputTokens": 2048, "temperature": 0.4},
    }
    if can_call_functions:
        payload["tools"] = [{"functionDeclarations": FUNCTION_DECLARATIONS}]

    reply = ""
    for _ in range(MAX_FUNCTION_CALL_ROUNDS):
        data = _call_gemini(payload)
        try:
            parts = data["candidates"][0]["content"]["parts"]
        except (KeyError, IndexError):
            parts = []

        function_calls = [p["functionCall"] for p in parts if "functionCall" in p]
        text_parts = [p.get("text", "") for p in parts if "text" in p]

        if function_calls and can_call_functions:
            payload["contents"].append({"role": "model", "parts": parts})
            response_parts = []
            for call in function_calls:
                result = execute_function(call.get("name", ""), call.get("args") or {}, session, user)
                response_parts.append(
                    {"functionResponse": {"name": call.get("name", ""), "response": result}}
                )
            payload["contents"].append({"role": "function", "parts": response_parts})
            continue

        reply = "".join(text_parts).strip()
        break

    if not reply:
        raise HTTPException(status_code=502, detail="The assistant could not generate a response.")

    return reply
