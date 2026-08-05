from app.chat.cleaning import strip_markdown


def test_strips_double_asterisks():
    assert strip_markdown("Hello **world**!") == "Hello world!"


def test_strips_single_asterisks():
    assert strip_markdown("Hello *world*!") == "Hello world!"


def test_strips_backticks():
    assert strip_markdown("Use `create_entry` for that.") == "Use create_entry for that."


def test_strips_bullet_and_numbered_lists():
    text = "- one\n- two\n1. three\n2. four"
    assert strip_markdown(text) == "one\ntwo\nthree\nfour"


def test_strips_headings():
    assert strip_markdown("## Heading\nbody") == "Heading\nbody"


def test_strips_markdown_links():
    assert strip_markdown("Visit [our site](https://example.com) now") == "Visit our site now"


def test_preserves_amount_input_token():
    text = "Could you let me know the amount spent on milk? [AMOUNT_INPUT:milk]"
    out = strip_markdown(text)
    assert "[AMOUNT_INPUT:milk]" in out


def test_preserves_scope_toggle_token():
    text = "Was this personal or business? [SCOPE_TOGGLE]"
    out = strip_markdown(text)
    assert "[SCOPE_TOGGLE]" in out


def test_preserves_ghanchi_card_token():
    text = "Here is who can guide you: [GHANCHI_INVESTMENTS_CARD]"
    out = strip_markdown(text)
    assert "[GHANCHI_INVESTMENTS_CARD]" in out


def test_strips_markdown_around_tokens():
    text = "**milk** and **curd** [AMOUNT_INPUT:milk,curd]"
    out = strip_markdown(text)
    assert "**" not in out
    assert "[AMOUNT_INPUT:milk,curd]" in out


def test_empty_and_none():
    assert strip_markdown("") == ""
    assert strip_markdown(None) == ""
