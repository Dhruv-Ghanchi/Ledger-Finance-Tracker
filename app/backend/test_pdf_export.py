import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

def generate_pdf():
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
    elements = []
    
    styles = getSampleStyleSheet()
    elements.append(Paragraph("Ledger Finance Export", styles['Title']))
    elements.append(Spacer(1, 20))
    
    data = [["Date", "Scope", "Type", "Category", "Amount (INR)", "Note"]]
    
    docs = [
        {"date": "2026-08-01", "scope": "personal", "type": "expense", "category": "Food", "amount": 120.50, "note": "Lunch"},
        {"date": "2026-08-02", "scope": "business", "type": "income", "category": "Salary", "amount": 5000.00, "note": ""},
    ]
    
    for d in docs:
        data.append([
            d["date"],
            d["scope"].capitalize(),
            d["type"].capitalize(),
            d["category"],
            f"{d['amount']:.2f}",
            d.get("note", "")[:50]
        ])
        
    t = Table(data, colWidths=[70, 60, 60, 100, 80, 180])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#09090b")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (4, 0), (4, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
    ]))
    
    elements.append(t)
    doc.build(elements)
    
    with open("test_export.pdf", "wb") as f:
        f.write(buf.getvalue())
        
generate_pdf()
