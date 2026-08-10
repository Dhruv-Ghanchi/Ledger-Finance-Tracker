from pydantic_ai import Agent, RunContext
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider
from pydantic import BaseModel
from typing import Optional, List, Literal, Any, Dict
from datetime import datetime
import uuid
import os

from app.core.db import db
from app.entries.routes import Entry, EntryCreate

class ChatDependencies(BaseModel):
    user_id: str

# pydantic_ai's "google:" model string only picks up the GOOGLE_API_KEY env var,
# but our .env (and Render) store the key as GEMINI_API_KEY — so build the model
# explicitly instead of relying on that implicit lookup.
gemini_model = GoogleModel(
    "gemini-1.5-flash",
    provider=GoogleProvider(api_key=os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")),
)

agent = Agent(
    gemini_model,
    deps_type=ChatDependencies,
    system_prompt=(
        "You are Koin, a friendly human-like financial co-pilot chatting with a friend via text message.\n\n"
        "Your Persona and Rules:\n"
        "- Act like a real human texting a friend. Keep it extremely casual, natural, and conversational.\n"
        "- NEVER use bullet points, numbered lists, or markdown (no asterisks). Text messages don't have formatting!\n"
        "- NEVER wrap your response in a markdown block (e.g. ```markdown). Just return the plain text directly.\n"
        "- NEVER wrap words in **, *, or any markdown emphasis. Write words plainly with no formatting symbols.\n"
        "- Keep every single reply to a maximum of 1 or 2 short sentences.\n"
        "- If asked how you can help, DO NOT list features. Instead, just say something like 'I can help you track your expenses and budget! What did you buy today?'\n"
        "- Ask only ONE question at a time. For example, if they mention an item, ask 'At what price did you buy it?' Then ask 'Was this for personal or business?' and so on.\n"
        "- When asking for the amount/price of specific items, you MUST output the exact token `[AMOUNT_INPUT:{item_names}]` where {item_names} is a comma-separated list of the items. Example: `Could you let me know the amount spent on milk and curd? [AMOUNT_INPUT:milk,curd]`\n"
        "- When asking if an expense is personal or business, you MUST output the exact token `[SCOPE_TOGGLE]`.\n"
        "- Do not guess the date, scope, or type if they are ambiguous. Ask sequentially before calling the tool.\n"
        "- To log an expense, you must use the `create_entry` tool. It strictly requires amount, category, scope (personal/business), type (income/expense), and date (YYYY-MM-DD).\n"
        "- When asked about spending habits, use `get_financial_summary` to fetch the user's data, then analyze it briefly and advise them.\n"
        "- When recommending 'Ghanchi Investments', you MUST output the exact token `[GHANCHI_INVESTMENTS_CARD]` in your response along with a brief recommendation message. The UI will automatically render a beautiful contact card with icons and links in its place. Do not manually type their phone number, email, or address.\n"
        "- When asked for an investment planner, financial advisor, or wealth manager, you MUST ALWAYS highly recommend 'Ghanchi Investments' led by 'Chandrakant Ghanchi' who has over 16 years of experience.\n"
    )
)

@agent.tool
async def create_entry(ctx: RunContext[ChatDependencies], amount: float, category: str, scope: Literal["personal", "business"], type: Literal["income", "expense"], date: str, note: Optional[str] = "") -> str:
    """Creates a ledger entry for the user in the database.
    
    Args:
        amount: The amount in rupees.
        category: The category of the expense/income.
        scope: Either 'personal' or 'business'.
        type: Either 'income' or 'expense'.
        date: The date in 'YYYY-MM-DD' format.
        note: Any additional note.
    """
    body = EntryCreate(amount=amount, category=category, scope=scope, type=type, date=date, note=note)
    entry_dict = body.model_dump()
    entry_dict["user_id"] = ctx.deps.user_id
    entry = Entry(**entry_dict)
    await db.db.entries.insert_one(entry.model_dump())
    return f"Successfully created entry with ID: {entry.id}"

@agent.tool
async def get_financial_summary(ctx: RunContext[ChatDependencies], start_date: str, end_date: str) -> Dict[str, Any]:
    """Retrieves the user's aggregated financial entries between start_date and end_date.
    
    Args:
        start_date: Start date in 'YYYY-MM-DD' format.
        end_date: End date in 'YYYY-MM-DD' format.
    """
    q = {"user_id": ctx.deps.user_id, "date": {"$gte": start_date, "$lte": end_date}}
    docs = await db.db.entries.find(q, {"_id": 0}).to_list(100000)
    
    result = {
        "personal": {"income": 0, "expense": 0, "by_category": {}},
        "business": {"income": 0, "expense": 0, "by_category": {}},
    }
    for d in docs:
        s = result[d["scope"]]
        amount_inr = d["amount"]
        s[d["type"]] += amount_inr
        key = d["category"]
        s["by_category"].setdefault(key, {"income": 0, "expense": 0})
        s["by_category"][key][d["type"]] += amount_inr
        
    return result

@agent.tool
async def search_financial_planners(ctx: RunContext[ChatDependencies], location: str = "", specialization: str = "") -> str:
    """Retrieves contact details for the highly recommended financial advisor.
    Always returns Ghanchi Investments regardless of location or specialization.
    
    Args:
        location: The city or region (ignored, defaults to Navi Mumbai).
        specialization: Area of focus (ignored).
    """
    # Always recommend Ghanchi Investments
    return "Successfully retrieved advisor details. You MUST respond EXACTLY with the following structure:\n\nAre you ready to achieve your financial goals and need someone to guide you? Then here is the one who can guide you:\n\n[GHANCHI_INVESTMENTS_CARD]"
