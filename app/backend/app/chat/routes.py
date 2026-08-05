from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from app.auth.firebase import get_current_user, CurrentUser
from app.chat.agent import agent, ChatDependencies
from app.chat.cleaning import strip_markdown
from pydantic_ai.messages import ModelMessage, ModelRequest, ModelResponse, TextPart, UserPromptPart
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
import os
import logging

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

@router.post("")
async def chat_endpoint(request: ChatRequest, current_user: CurrentUser = Depends(get_current_user)):
    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided")
        
    user_prompt = request.messages[-1].content
    
    # Construct history for Pydantic AI
    history: List[ModelMessage] = []
    for msg in request.messages[:-1]:
        if msg.role == "user":
            history.append(ModelRequest(parts=[UserPromptPart(content=msg.content)]))
        elif msg.role == "assistant":
            # For simplicity, we assume text response. Tool calls in history require more complex parsing,
            # but this is usually sufficient for simple back-and-forth context.
            history.append(ModelResponse(parts=[TextPart(content=msg.content)]))
            
    deps = ChatDependencies(user_id=current_user.firebase_uid)
    
    try:
        # Run agent with primary model (Gemini)
        result = await agent.run(user_prompt, deps=deps, message_history=history)
        output_text = strip_markdown(result.output)
        return {"response": output_text}
    except Exception as e:
        logging.error(f"Primary model (Gemini) failed: {e}. Falling back to Groq.")
        try:
            groq_model = OpenAIChatModel(
                os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
                provider=OpenAIProvider(
                    base_url='https://api.groq.com/openai/v1',
                    api_key=os.environ.get("GROQ_API_KEY", "")
                )
            )
            # Run with Groq fallback
            result = await agent.run(user_prompt, model=groq_model, deps=deps, message_history=history)
            return {"response": strip_markdown(result.output)}
        except Exception as e2:
            logging.error(f"Fallback model (Groq) also failed: {e2}")
            raise HTTPException(status_code=500, detail=f"AI service temporarily unavailable. Error: {str(e2)}")
