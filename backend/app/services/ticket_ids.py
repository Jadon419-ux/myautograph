def ma_unique_id(user_id: int) -> str:
    return f"MA-{user_id:08d}"


def ticket_number(ticket_id: int) -> str:
    return f"MA-TKT-{ticket_id:06d}"
