from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.deps import get_current_user_optional
from app.models.user import User
from app.schemas.chatbot import ChatRequest, ChatResponse
from app.services.chatbot import ask_chatbot

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


@router.post("/message", response_model=ChatResponse)
def send_message(
    payload: ChatRequest,
    session: Session = Depends(get_session),
    user: User | None = Depends(get_current_user_optional),
):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    reply = ask_chatbot(
        message, [turn.model_dump() for turn in payload.history], session=session, user=user
    )
    return ChatResponse(reply=reply)
