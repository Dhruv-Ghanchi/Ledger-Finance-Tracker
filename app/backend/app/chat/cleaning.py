import re

# Tokens emitted by the agent that the UI renders as widgets/cards.
# These must survive markdown-stripping untouched.
SPECIAL_TOKENS = [
    r"\[AMOUNT_INPUT:[^\]]*\]",
    r"\[SCOPE_TOGGLE\]",
    r"\[GHANCHI_INVESTMENTS_CARD\]",
]

_TOKEN_RE = re.compile("|".join(SPECIAL_TOKENS))


def strip_markdown(text: str) -> str:
    """Strip common markdown syntax so chat replies read like plain SMS text.

    Special tokens ([AMOUNT_INPUT:...], [SCOPE_TOGGLE], [GHANCHI_INVESTMENTS_CARD])
    are protected and preserved verbatim for the frontend to render.
    """
    if not text:
        return ""

    placeholders = {}

    def protect(match):
        key = f"\x00TOKEN{len(placeholders)}\x00"
        placeholders[key] = match.group(0)
        return key

    protected = _TOKEN_RE.sub(protect, text)

    cleaned = protected
    # Code fences and inline code
    cleaned = re.sub(r"```[a-zA-Z]*\n?([\s\S]*?)```", r"\1", cleaned)
    cleaned = re.sub(r"`([^`]*)`", r"\1", cleaned)
    # Headings
    cleaned = re.sub(r"^#{1,6}\s*", "", cleaned, flags=re.MULTILINE)
    # Blockquotes
    cleaned = re.sub(r"^>\s?", "", cleaned, flags=re.MULTILINE)
    # Bullet and numbered list markers
    cleaned = re.sub(r"^\s*[-*+]\s+", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"^\s*\d+[.)]\s+", "", cleaned, flags=re.MULTILINE)
    # Bold / italic / strikethrough emphasis
    cleaned = re.sub(r"\*\*(.+?)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"\*(.+?)\*", r"\1", cleaned)
    cleaned = re.sub(r"__(.+?)__", r"\1", cleaned)
    cleaned = re.sub(r"(^|\s)_([^\s_][^_]*?)_(?=\s|$)", r"\1\2", cleaned)
    cleaned = re.sub(r"~~(.+?)~~", r"\1", cleaned)
    # Markdown links [text](url) -> text
    cleaned = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", cleaned)
    # Horizontal rules
    cleaned = re.sub(r"^\s*[-*_]{3,}\s*$", "", cleaned, flags=re.MULTILINE)

    # Restore protected tokens
    for key, val in placeholders.items():
        cleaned = cleaned.replace(key, val)

    # Tidy whitespace
    cleaned = re.sub(r"[ \t]+\n", "\n", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()
