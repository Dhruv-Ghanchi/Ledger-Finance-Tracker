from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.lib.colors import HexColor

from app.auth.firebase import get_current_user, CurrentUser
from app.subscriptions.checker import require_premium
from app.core.db import db

router = APIRouter(prefix="/api/invoices", tags=["invoices"])

def format_inr(rupees: float) -> str:
    return f"₹{rupees:,.2f}"

async def get_user_entries(user_id: str, fy_start: int, scope: Optional[str] = None):
    """Get entries for a financial year"""
    q = {"user_id": user_id, "$or": [
        {"date": {"$gte": f"{fy_start:04d}-04-01", "$lte": f"{fy_start:04d}-12-31"}},
        {"date": {"$gte": f"{fy_start+1:04d}-01-01", "$lte": f"{fy_start+1:04d}-03-31"}}
    ]}
    if scope:
        q["scope"] = scope
    docs = await db.db.entries.find(q, {"_id": 0}).sort("date", 1).to_list(100000)
    return docs

async def get_user_info(user_id: str):
    """Get user info for invoice"""
    user = await db.db.users.find_one({"firebase_uid": user_id}, {"_id": 0})
    return user

def build_invoice_pdf(user, entries, fy_start, scope=None):
    """Build a branded PDF invoice"""
    buffer = io.BytesIO()
    
    # Custom colors
    DARK_BG = HexColor("#09090B")
    ACCENT_BLUE = HexColor("#0F52BA")
    ACCENT_AMBER = HexColor("#F59E0B")
    ACCENT_GREEN = HexColor("#059669")
    ACCENT_RED = HexColor("#EF4444")
    LIGHT_GRAY = HexColor("#F4F4F5")
    MEDIUM_GRAY = HexColor("#E4E4E7")
    TEXT_PRIMARY = HexColor("#09090B")
    TEXT_SECONDARY = HexColor("#52525B")
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=20*mm,
        bottomMargin=20*mm,
        leftMargin=20*mm,
        rightMargin=20*mm
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=28,
        textColor=DARK_BG,
        spaceAfter=4,
        alignment=TA_LEFT
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        textColor=TEXT_SECONDARY,
        spaceAfter=20,
        alignment=TA_LEFT
    )
    
    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        textColor=DARK_BG,
        spaceBefore=16,
        spaceAfter=8,
        borderWidth=0,
        borderPadding=0,
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=TEXT_PRIMARY,
        leading=13,
    )
    
    small_style = ParagraphStyle(
        'Small',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        textColor=TEXT_SECONDARY,
        leading=11,
    )
    
    # Build story
    story = []
    
    # ========== HEADER ==========
    # Logo and Company Name
    header_data = [[
        Paragraph('<font color="#09090B" size="24"><b>₹</b></font> <font size="18"><b>Ledger</b></font>', title_style),
        Paragraph('<b>FINANCIAL STATEMENT</b>', ParagraphStyle('InvoiceTitle', parent=title_style, alignment=TA_RIGHT, fontSize=16, textColor=ACCENT_BLUE))
    ]]
    
    header_table = Table(header_data, colWidths=[doc.width * 0.6, doc.width * 0.4])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(header_table)
    
    # Subtitle line
    fy_label = f"FY {fy_start}-{str(fy_start+1)[-2:]}"
    scope_label = f" ({scope.title()})" if scope else " (Consolidated)"
    story.append(Paragraph(f"Financial Year: <b>{fy_label}</b>{scope_label}", subtitle_style))
    story.append(Paragraph(f"Generated on: {datetime.now().strftime('%d %B %Y')}", small_style))
    story.append(Spacer(1, 8))
    
    # Horizontal rule
    story.append(Table([['']], colWidths=[doc.width], style=TableStyle([
        ('LINEBELOW', (0, 0), (-1, -1), 2, ACCENT_BLUE),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ])))
    
    # ========== USER INFO ==========
    story.append(Paragraph("ACCOUNT HOLDER", section_header_style))
    
    user_info_data = [
        ["Name:", user.get("name", "N/A")],
        ["Email:", user.get("email", "N/A")],
        ["Phone:", user.get("phone", "Not provided")],
        ["Plan:", user.get("plan", "free").title()],
    ]
    
    user_table = Table(user_info_data, colWidths=[doc.width * 0.2, doc.width * 0.8])
    user_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), TEXT_SECONDARY),
        ('TEXTCOLOR', (1, 0), (1, -1), TEXT_PRIMARY),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(user_table)
    story.append(Spacer(1, 12))
    
    # ========== SUMMARY CARDS ==========
    # Calculate totals
    personal_income = sum(e["amount"] for e in entries if e["scope"] == "personal" and e["type"] == "income")
    personal_expense = sum(e["amount"] for e in entries if e["scope"] == "personal" and e["type"] == "expense")
    business_income = sum(e["amount"] for e in entries if e["scope"] == "business" and e["type"] == "income")
    business_expense = sum(e["amount"] for e in entries if e["scope"] == "business" and e["type"] == "expense")
    
    total_income = personal_income + business_income
    total_expense = personal_expense + business_expense
    net = total_income - total_expense
    
    summary_data = [
        [
            Paragraph('<b>TOTAL INCOME</b>', small_style),
            Paragraph('<b>TOTAL EXPENSE</b>', small_style),
            Paragraph('<b>NET POSITION</b>', small_style),
        ],
        [
            Paragraph(f'<font color="#059669" size="16"><b>{format_inr(total_income)}</b></font>', ParagraphStyle('amt', parent=body_style, alignment=TA_CENTER)),
            Paragraph(f'<font color="#EF4444" size="16"><b>{format_inr(total_expense)}</b></font>', ParagraphStyle('amt', parent=body_style, alignment=TA_CENTER)),
            Paragraph(f'<font color={"#059669" if net >= 0 else "#EF4444"} size="16"><b>{format_inr(net)}</b></font>', ParagraphStyle('amt', parent=body_style, alignment=TA_CENTER)),
        ],
        [
            Paragraph(f'<font color="#0F52BA"><b>Personal:</b></font> {format_inr(personal_income)}<br/><font color="#F59E0B"><b>Business:</b></font> {format_inr(business_income)}', small_style),
            Paragraph(f'<font color="#0F52BA"><b>Personal:</b></font> {format_inr(personal_expense)}<br/><font color="#F59E0B"><b>Business:</b></font> {format_inr(business_expense)}', small_style),
            Paragraph(f'{"Surplus" if net >= 0 else "Deficit"}', ParagraphStyle('surplus', parent=small_style, alignment=TA_CENTER, textColor=ACCENT_GREEN if net >= 0 else ACCENT_RED)),
        ]
    ]
    
    summary_table = Table(summary_data, colWidths=[doc.width/3]*3)
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
        ('BACKGROUND', (0, 1), (-1, 1), DARK_BG),
        ('TEXTCOLOR', (0, 1), (-1, 1), colors.white),
        ('BACKGROUND', (0, 2), (-1, 2), LIGHT_GRAY),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, MEDIUM_GRAY),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 16))
    
    # ========== SCOPE BREAKDOWN ==========
    if not scope:
        story.append(Paragraph("SCOPE BREAKDOWN", section_header_style))
        
        scope_data = [
            ["Category", "Personal", "Business", "Total"],
            ["Income", format_inr(personal_income), format_inr(business_income), format_inr(total_income)],
            ["Expense", format_inr(personal_expense), format_inr(business_expense), format_inr(total_expense)],
            ["Net", format_inr(personal_income - personal_expense), format_inr(business_income - business_expense), format_inr(net)],
        ]
        
        scope_table = Table(scope_data, colWidths=[doc.width*0.25, doc.width*0.25, doc.width*0.25, doc.width*0.25])
        scope_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BACKGROUND', (0, 0), (-1, 0), DARK_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('TEXTCOLOR', (1, 0), (1, 0), ACCENT_BLUE),
            ('TEXTCOLOR', (2, 0), (2, 0), ACCENT_AMBER),
            ('BACKGROUND', (0, 1), (-1, 1), HexColor("#ECFDF5")),
            ('BACKGROUND', (0, 2), (-1, 2), HexColor("#FEF2F2")),
            ('BACKGROUND', (0, 3), (-1, 3), LIGHT_GRAY),
            ('TEXTCOLOR', (1, 1), (2, 1), ACCENT_GREEN),
            ('TEXTCOLOR', (1, 2), (2, 2), ACCENT_RED),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, MEDIUM_GRAY),
        ]))
        story.append(scope_table)
        story.append(Spacer(1, 16))
    
    # ========== CATEGORY WISE BREAKDOWN ==========
    story.append(Paragraph(f"{'EXPENSE' if scope != 'income' else 'INCOME'} BY CATEGORY", section_header_style))
    
    # Group by category
    cat_map = {}
    for e in entries:
        if scope and e["scope"] != scope:
            continue
        if scope == "income" and e["type"] != "income":
            continue
        if scope == "expense" and e["type"] != "expense":
            continue
        key = f"{e['scope']} - {e['category']}"
        cat_map[key] = cat_map.get(key, {"income": 0, "expense": 0})
        cat_map[key][e["type"]] += e["amount"]
    
    if cat_map:
        cat_rows = [["Category", "Scope", "Income", "Expense", "Net"]]
        for cat, vals in sorted(cat_map.items(), key=lambda x: -(x[1]["income"] + x[1]["expense"])):
            scope_name, cat_name = cat.split(" - ", 1)
            inc = vals["income"]
            exp = vals["expense"]
            net_val = inc - exp
            cat_rows.append([
                cat_name,
                scope_name.title(),
                format_inr(inc) if inc else "—",
                format_inr(exp) if exp else "—",
                format_inr(net_val)
            ])
        
        cat_table = Table(cat_rows, colWidths=[doc.width*0.3, doc.width*0.15, doc.width*0.18, doc.width*0.18, doc.width*0.19])
        cat_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (-1, 0), DARK_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 0), (1, -1), 'LEFT'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, MEDIUM_GRAY),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ]))
        story.append(cat_table)
    else:
        story.append(Paragraph("No entries found for this period.", body_style))
    
    story.append(Spacer(1, 20))
    
    # ========== FOOTER ==========
    story.append(Table([['']], colWidths=[doc.width], style=TableStyle([
        ('LINEABOVE', (0, 0), (-1, -1), 1, MEDIUM_GRAY),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ])))
    
    footer_text = f"""
    <para alignment="center">
    <font size="8" color="#71717A">
    This statement was generated by <b>Ledger</b> on {datetime.now().strftime('%d %B %Y at %I:%M %p')}<br/>
    For queries, contact: hello@ledger.app | This is a computer-generated document, no signature required.
    </font>
    </para>
    """
    story.append(Paragraph(footer_text, small_style))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer

@router.get("/download")
async def download_invoice(
    current_user: CurrentUser = Depends(get_current_user),
    _ = Depends(require_premium),
    fy_start: int = Query(...),
    scope: Optional[str] = Query(None),
):
    """Generate and download branded PDF invoice"""
    entries = await get_user_entries(current_user.firebase_uid, fy_start, scope)
    user = await get_user_info(current_user.firebase_uid)
    
    if not entries:
        raise HTTPException(status_code=404, detail="No entries found for this period")
    
    buffer = build_invoice_pdf(user, entries, fy_start, scope)
    
    scope_suffix = f"_{scope}" if scope else "_consolidated"
    filename = f"ledger_invoice_{fy_start}{scope_suffix}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/history")
async def list_invoices(current_user: CurrentUser = Depends(get_current_user)):
    """List available financial years for invoice generation"""
    # Get distinct years from entries
    pipeline = [
        {"$match": {"user_id": current_user.firebase_uid}},
        {"$project": {"year": {"$substr": ["$date", 0, 4]}}},
        {"$group": {"_id": "$year"}},
        {"$sort": {"_id": -1}}
    ]
    result = await db.db.entries.aggregate(pipeline).to_list(100)
    years = [int(r["_id"]) for r in result if r["_id"].isdigit()]
    
    # Convert to FY format (Apr-Mar)
    fy_years = set()
    for y in years:
        # Determine which FY this year belongs to
        # For simplicity, return the year as FY start
        fy_years.add(y)
    
    return {"financial_years": sorted(list(fy_years), reverse=True)}