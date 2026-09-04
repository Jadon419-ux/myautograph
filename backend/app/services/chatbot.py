import httpx
from fastapi import HTTPException

from app.config import settings

GEMINI_MODEL = "gemini-3.6-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

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
(e.g. "Get tickets", "Shop from Star", "Verify", "Auctions", "Dashboard"). You do NOT have access to \
any specific user's real account data (balances, order status, ticket history) - if asked about \
that, tell them to check their Dashboard once logged in, and if something seems broken, to contact \
support. Never invent order numbers, balances, or transaction details. If a question is unrelated to \
My Autograph, politely redirect to what you can help with."""


def ask_chatbot(message: str, history: list[dict]) -> str:
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="The assistant is not configured yet")

    contents = []
    for turn in history[-10:]:
        role = "model" if turn.get("role") == "assistant" else "user"
        text = (turn.get("content") or "").strip()
        if text:
            contents.append({"role": role, "parts": [{"text": text}]})
    contents.append({"role": "user", "parts": [{"text": message}]})

    try:
        response = httpx.post(
            GEMINI_URL,
            params={"key": settings.gemini_api_key},
            json={
                "contents": contents,
                "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
                "generationConfig": {"maxOutputTokens": 400, "temperature": 0.4},
            },
            timeout=20,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 429:
            raise HTTPException(
                status_code=503, detail="The assistant is busy right now - please try again shortly."
            )
        raise HTTPException(status_code=502, detail="Could not reach the assistant. Please try again.")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not reach the assistant. Please try again.")

    data = response.json()
    try:
        parts = data["candidates"][0]["content"]["parts"]
        reply = "".join(part.get("text", "") for part in parts).strip()
    except (KeyError, IndexError):
        reply = ""

    if not reply:
        raise HTTPException(status_code=502, detail="The assistant could not generate a response.")

    return reply
