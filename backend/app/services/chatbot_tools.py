from sqlmodel import Session, select

from app.models.concert import Concert
from app.models.ticket import Ticket
from app.models.ticket_category import TicketCategory
from app.models.ticket_order import TicketOrder
from app.models.user import User
from app.models.withdrawal import WalletWithdrawal

# Every function here is scoped to the authenticated `user` passed in by the
# caller - none of them accept an identifier for "which user" from the model,
# so the AI can never be tricked into fetching someone else's account data.

FUNCTION_DECLARATIONS = [
    {
        "name": "get_wallet_balance",
        "description": "Get the logged-in user's current My Autograph wallet balance in Naira.",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "list_my_tickets",
        "description": (
            "List the logged-in user's purchased event tickets, most recent first, including "
            "each ticket's status (valid, checked_in, cancelled) and event details."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Max number of tickets to return, default 10",
                }
            },
        },
    },
    {
        "name": "list_my_orders",
        "description": (
            "List the logged-in user's ticket purchase orders, most recent first, including "
            "whether each was paid, is still pending, or failed - use this to check if a ticket "
            "purchase went through."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Max number of orders to return, default 10",
                }
            },
        },
    },
    {
        "name": "list_my_withdrawals",
        "description": (
            "List the logged-in user's wallet withdrawal requests, most recent first, including "
            "status (pending, paid, failed) and failure reason if any."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Max number of withdrawals to return, default 10",
                }
            },
        },
    },
]


def _status_value(status_obj) -> str:
    return status_obj.value if hasattr(status_obj, "value") else str(status_obj)


def _clamp_limit(args: dict, default: int = 10, maximum: int = 25) -> int:
    try:
        limit = int(args.get("limit") or default)
    except (TypeError, ValueError):
        limit = default
    return max(1, min(limit, maximum))


def _get_wallet_balance(session: Session, user: User, args: dict) -> dict:
    return {
        "balance_naira": user.wallet_balance_kobo / 100,
        "held_naira": user.wallet_held_kobo / 100,
        "available_naira": (user.wallet_balance_kobo - user.wallet_held_kobo) / 100,
    }


def _list_my_tickets(session: Session, user: User, args: dict) -> dict:
    limit = _clamp_limit(args)
    tickets = session.exec(
        select(Ticket)
        .where(Ticket.buyer_user_id == user.id)
        .order_by(Ticket.created_at.desc())
        .limit(limit)
    ).all()
    items = []
    for ticket in tickets:
        concert = session.get(Concert, ticket.concert_id)
        category = session.get(TicketCategory, ticket.ticket_category_id)
        items.append(
            {
                "event": concert.title if concert else "",
                "category": category.name if category else "",
                "status": _status_value(ticket.status),
                "event_date": concert.event_date.isoformat() if concert else None,
            }
        )
    return {"tickets": items, "count": len(items)}


def _list_my_orders(session: Session, user: User, args: dict) -> dict:
    limit = _clamp_limit(args)
    orders = session.exec(
        select(TicketOrder)
        .where(TicketOrder.buyer_user_id == user.id)
        .order_by(TicketOrder.created_at.desc())
        .limit(limit)
    ).all()
    items = []
    for order in orders:
        concert = session.get(Concert, order.concert_id)
        items.append(
            {
                "event": concert.title if concert else "",
                "quantity": order.quantity,
                "amount_naira": order.amount_kobo / 100,
                "status": _status_value(order.status),
                "created_at": order.created_at.isoformat(),
            }
        )
    return {"orders": items, "count": len(items)}


def _list_my_withdrawals(session: Session, user: User, args: dict) -> dict:
    limit = _clamp_limit(args)
    withdrawals = session.exec(
        select(WalletWithdrawal)
        .where(WalletWithdrawal.user_id == user.id)
        .order_by(WalletWithdrawal.created_at.desc())
        .limit(limit)
    ).all()
    items = [
        {
            "amount_naira": w.amount_kobo / 100,
            "status": _status_value(w.status),
            "failure_reason": w.failure_reason or None,
            "created_at": w.created_at.isoformat(),
        }
        for w in withdrawals
    ]
    return {"withdrawals": items, "count": len(items)}


FUNCTION_HANDLERS = {
    "get_wallet_balance": _get_wallet_balance,
    "list_my_tickets": _list_my_tickets,
    "list_my_orders": _list_my_orders,
    "list_my_withdrawals": _list_my_withdrawals,
}


def execute_function(name: str, args: dict, session: Session, user: User) -> dict:
    handler = FUNCTION_HANDLERS.get(name)
    if not handler:
        return {"error": f"Unknown function '{name}'"}
    try:
        return handler(session, user, args or {})
    except Exception as exc:  # keep the conversation going even if a lookup fails
        return {"error": str(exc)}
