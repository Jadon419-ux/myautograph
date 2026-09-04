from fastapi import APIRouter, HTTPException

from app.schemas.chatbot import ChatRequest, ChatResponse
from app.services.chatbot import ask_chatbot

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


@router.post("/message", response_model=ChatResponse)
def send_message(payload: ChatRequest):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    reply = ask_chatbot(message, [turn.model_dump() for turn in payload.history])
    return ChatResponse(reply=reply)
