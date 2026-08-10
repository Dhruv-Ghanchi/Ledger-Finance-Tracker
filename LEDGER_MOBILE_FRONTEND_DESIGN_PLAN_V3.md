# Ledger Mobile App — Complete Frontend Design & UX Specification v3

> **Purpose:** This document is the source-of-truth frontend/product specification for the Ledger mobile application.
>
> **Important:** The mobile app must provide the same core product capabilities as the existing Ledger web application, while using a genuinely mobile-first UX. Do **not** simply shrink the web dashboard into a phone layout.

---

# 1. Product Definition

**Ledger** is an AI-powered personal and business finance SaaS platform.

It combines:

- Personal finance tracking
- Business finance tracking
- Income/expense management
- AI-powered financial assistance
- AI receipt/statement extraction
- IOU/debt tracking
- Analytics and financial-year reporting
- CSV/Excel export
- Professional PDF invoices/statements
- SaaS subscription management

The mobile application must preserve these capabilities while making everyday actions significantly faster on a phone.

---

# 2. Product Goals

The mobile experience should allow a user to:

1. Understand their financial position immediately.
2. Switch between Personal and Business finances.
3. Add income/expenses quickly.
4. Import a receipt or PDF and let AI extract transaction data.
5. Ask KOIN questions about their finances.
6. Ask KOIN to perform supported financial actions.
7. Track money owed to/from other people.
8. Settle IOUs partially or fully.
9. View spending and income analytics.
10. Export financial data.
11. Generate professional PDF reports/invoices.
12. Manage their premium subscription.
13. Use the complete product comfortably on a phone.

---

# 3. Core UX Philosophy

The mobile app should optimize for:

```text
OPEN APP
    │
    ▼
UNDERSTAND MONEY
    │
    ▼
TAKE ACTION
    │
    ├── Add transaction
    ├── Import receipt
    ├── Ask KOIN
    ├── Check IOUs
    └── View analytics
    │
    ▼
DONE
```

The app should feel like a **finance assistant**, not a spreadsheet.

---

# 4. Critical Product Difference From the Previous UI Plan

The previous design plan focused primarily on traditional finance tracking.

After reviewing the complete product specification, the following features are now **first-class mobile features** and must be represented in the navigation and UI:

### Must add

- Personal / Business workspace switching
- KOIN AI Assistant
- AI receipt/image import
- AI PDF statement extraction
- IOUs & Debts
- Partial/full debt settlement
- - Professional PDF financial statement generation
- 60-day premium trial
- Premium feature gating
- Subscription/trial status
- CSV and Excel import/export where supported by the backend
- Yearly Summary / financial-year reporting

### Must modify

- Home screen must be workspace-aware.
- Add Transaction must support AI import.
- More screen must become an actual product hub rather than only settings.
- Subscription screen must use a **60-day free trial**, not a 7-day trial.
- KOIN should be much more prominent than a generic floating chatbot.
- Analytics must support Personal/Business scope.
- IOUs need a dedicated section.
- Reports/exports need a dedicated mobile workflow.

### Do not remove

Keep the strong mobile patterns from the original design:

- Bottom navigation
- Central Add action
- Bottom sheets
- Compact charts
- Quick actions
- Clear financial numbers
- Loading/empty/error states
- Dark mode support if implemented
- Mobile-first transaction entry

---

# 5. Primary Navigation

Because Ledger now has more functionality, the mobile navigation should be slightly expanded.

Recommended:

```text
┌────────────────────────────────────────┐
│                                        │
│                SCREEN                  │
│                                        │
│                                        │
├────────────────────────────────────────┤
│  Home   Analytics   ＋   Activity   More│
└────────────────────────────────────────┘
```

Where:

- **Home** → Dashboard
- **Analytics** → Financial insights
- **+** → Add/import transaction
- **Activity** → Transactions + IOUs
- **More** → KOIN, reports, accounts, categories, profile, subscription, settings

However, **KOIN should also have a persistent entry point**, such as a small AI button on Home and relevant financial screens.

Do not make KOIN difficult to find.

---

# 6. Global Workspace Switcher

This is a critical feature.

Ledger has two financial scopes:

```text
PERSONAL
BUSINESS
```

The active workspace must be visible throughout the application.

Recommended Home header:

```text
Good morning, Dhruv 👋

[ Personal ▼ ]                         🔔
```

Tapping it:

```text
Switch Workspace

● Personal
  Your personal finances

○ Business
  Your business finances

[ + Create Workspace ]    ← only if supported
```

Alternative compact segmented control:

```text
[ Personal ] [ Business ]
```

### Rules

- Every transaction belongs to a workspace/scope.
- Analytics must respect the selected workspace.
- KOIN must know which workspace the user is asking about.
- IOUs must respect workspace scope if supported by backend.
- Imports must be assigned to the selected workspace.
- Reports must use the selected workspace.
- The selected workspace should persist until changed.

Never silently mix Personal and Business financial data.

---

# 7. Complete Navigation Architecture

```text
                         SPLASH
                            │
                            ▼
                    AUTHENTICATION
                    /             \
                 Login           Signup
                    \             /
                     \           /
                      ONBOARDING
                          │
                          ▼
                         HOME
                          │
        ┌─────────────────┼──────────────────┐
        │                 │                  │
        ▼                 ▼                  ▼
    ANALYTICS           ADD (+)          ACTIVITY
                          │                 │
                ┌─────────┼─────────┐       ├── Transactions
                │         │         │       └── IOUs / Debts
             Manual    Receipt    PDF
            Entry      Import    Import
                │         │         │
                └─────────┴─────────┘
                          │
                          ▼
                    Transaction

MORE
 │
 ├── KOIN AI
 ├── Reports
 │   ├── Yearly Summary
 │   ├── PDF Statement
 │   └── PDF Invoice
 │
 ├── Accounts / Payment Methods
 ├── Categories
 ├── Subscription
 ├── Profile
 ├── Export / Import
 ├── Settings
 └── Help & Support
```

---

# 8. Authentication

Ledger uses Firebase authentication.

Support:

- Google OAuth
- Email/password
- Forgot password
- Secure session handling
- Authentication loading state
- Error states

---

## 8.1 Login

```text
←

Welcome back 👋

Manage your money
without the headache.

[ Continue with Google ]

──────── OR ────────

Email
[________________]

Password
[________________]

[ Login ]

Forgot password?

Don't have an account?
Create account
```

---

# 9. Signup + 60-Day Trial

The previous plan incorrectly used a 7-day trial.

The actual Ledger product provides:

> **60-day premium trial**

Every new user should clearly understand that they receive premium access for 60 days.

Signup success should transition to onboarding/trial activation.

---

# 10. Trial Status

The app should show trial status without aggressively interrupting the user.

Example Home element:

```text
Ledger Premium

60-day trial
Day 24 of 60

██████████████░░░░░░

36 days remaining
```

Near expiry:

```text
Premium trial

5 days remaining

[ View Plans ]
```

After expiry:

```text
Your Premium Trial Has Ended

Continue using Ledger by
choosing a Premium plan.

[ View Plans ]
```

### Important

The exact premium gating must follow backend entitlement state.

Do not hard-code "60 days remaining" or feature access on the frontend.

---

# 11. HOME SCREEN

Home must now be **workspace-aware** and include access to AI/import functionality.

Recommended hierarchy:

```text
┌─────────────────────────────────────┐
│ Good morning, Dhruv              🔔 │
│                                     │
│ [ Personal ▼ ]                      │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Total Balance                   │ │
│ │                                 │ │
│ │ ₹42,850                         │ │
│ │                                 │ │
│ │ ↑ ₹35,000    ↓ ₹18,420         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ August 2026                    ‹ ›  │
│                                     │
│ ┌──────────┐ ┌──────────┐           │
│ │ + Income │ │ -Expense │           │
│ └──────────┘ └──────────┘           │
│                                     │
│ AI Quick Actions                    │
│                                     │
│ [ Import Receipt ] [ Ask KOIN ]     │
│                                     │
│ Spending Overview                  │
│                                     │
│          [ CHART ]                  │
│                                     │
│ Recent Transactions         See all │
│                                     │
│ 🍔 Swiggy                 -₹340    │
│ 🚕 Uber                   -₹220    │
│ 💼 Salary              +₹35,000    │
│                                     │
├─────────────────────────────────────┤
│ Home Analytics ＋ Activity      More│
└─────────────────────────────────────┘
```

---

# 12. Home Quick Actions

Recommended quick actions:

```text
+ Income
- Expense
Import Receipt
Ask KOIN
```

The exact number of actions can adapt based on screen size.

The user should never have to enter More to perform common financial actions.

---

# 13. ADD TRANSACTION

Manual entry remains a core capability.

The flow should be:

```text
Type
  ↓
Amount
  ↓
Category
  ↓
Workspace
  ↓
Date / Details
  ↓
Payment Method / Account
  ↓
Save
```

Workspace should normally be inherited from the currently selected workspace.

Do not ask the user to repeatedly select Personal/Business unless necessary.

---

# 14. Add Transaction — UI

```text
Add Transaction

[ Expense ] [ Income ]

Amount

₹
[ 500 ]

Category

[ 🍔 Food                         > ]

Description

[ What was this for?              ]

Date

[ 08 August 2026                 ]

Payment Method

[ UPI                            > ]

Account

[ HDFC Bank                      > ]

Workspace

[ Personal                       > ]

[ Save Transaction ]
```

Workspace can be hidden when the active workspace is already obvious.

---

# 15. AI RECEIPT IMPORT

This is a **first-class feature**, not just another upload button.

Entry point:

```text
Home
  ↓
Import Receipt
```

---

## 15.1 Import Choice

```text
AI Import

What do you want to import?

┌─────────────────────────────┐
│ 📷 Receipt / Bill           │
│ Upload or capture a photo   │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 📄 PDF Statement             │
│ Upload a PDF document       │
└─────────────────────────────┘
```

If the mobile implementation supports camera capture, provide:

```text
[ Take Photo ]
[ Choose From Gallery ]
```

---

# 16. Receipt Processing State

```text
Analyzing receipt...

████████████████░░░░

AI is extracting:

✓ Vendor
✓ Date
✓ Amount
✓ Category
○ Payment method
```

Do not leave the user looking at a blank spinner.

---

# 17. AI Extraction Review

AI must not silently create financial data without user review unless explicitly supported by the product.

Recommended:

```text
Review Transaction

Vendor
[ Swiggy                     ]

Amount
[ ₹340                      ]

Date
[ 08 Aug 2026               ]

Category
[ Food                     > ]

Payment Method
[ UPI                      > ]

Workspace
[ Personal                > ]

────────────────────────────

AI confidence
High

[ Edit ]

[ Save Transaction ]
```

The user should be able to correct extracted values.

---

# 18. PDF Statement Import

For PDF statements:

```text
Import PDF

[ Select PDF ]

Selected:
HDFC_August_2026.pdf

Workspace
[ Personal ▼ ]

[ Analyze PDF ]
```

Processing:

```text
Analyzing PDF...

Finding transactions
██████████████░░░░

124 transactions detected
```

Then provide a review/import screen.

```text
124 transactions found

☑ Select All

08 Aug   Swiggy       -₹340
08 Aug   Uber         -₹220
07 Aug   Amazon     -₹1,250
...

[ Import Selected ]
```

The exact PDF extraction behavior must match backend capabilities.

---

# 19. KOIN AI CO-PILOT

KOIN is a major differentiator and should be treated as a core product experience.

It must support two broad interaction types:

### A. Financial questions

Examples:

```text
How much did I spend on food this month?

How much did I spend on business travel
this financial year?

What category did I spend the most on?

Compare my spending with last month.
```

### B. Supported financial actions

Examples:

```text
Log a ₹50 business travel expense.

Add ₹500 food expense.

Show my unpaid IOUs.
```

The frontend must clearly distinguish:

- Information/analysis response
- Action request
- Confirmation required
- Action completed
- Action failed

---

# 20. KOIN Entry Point

KOIN should be accessible from:

- Home
- More
- Transaction-related contexts
- Potentially a floating AI button

Recommended floating button:

```text
             ┌─────────────┐
             │ ✦ KOIN      │
             └─────────────┘
```

Avoid covering important content or the bottom navigation.

---

# 21. KOIN Chat Screen

```text
← KOIN

Your AI Finance Copilot

────────────────────────────

KOIN
How can I help with your
finances?

You
How much did I spend on
food this month?

KOIN
You spent ₹5,240 on food
this month across 18
transactions.

────────────────────────────

[ Ask KOIN...                 ]  ➤
```

Provide suggested prompts:

```text
[ Spending this month ]
[ Biggest expense ]
[ Business expenses ]
[ Unpaid IOUs ]
```

---

# 22. KOIN Action Confirmation

When KOIN is asked to create data, use confirmation where appropriate.

Example:

```text
KOIN wants to add:

Expense
₹500

Category
Business Travel

Workspace
Business

Date
08 Aug 2026

[ Cancel ]    [ Confirm ]
```

After completion:

```text
✓ Expense added successfully

₹500 Business Travel
Business workspace
```

Do not make destructive or financially meaningful changes silently.

---

# 23. KOIN Context Awareness

KOIN should receive the correct context:

```text
Current workspace:
Personal

Current period:
August 2026

User:
Authenticated

Relevant financial data:
Backend-provided
```

If the user switches to Business and opens KOIN, the interface should make that context clear.

Example:

```text
KOIN
Business workspace

Ask me about your business finances.
```

---

# 24. IOUs & DEBTS

This is a dedicated product capability and requires a first-class mobile section.

Use a dedicated Activity sub-section or dedicated screen.

```text
Activity

[ Transactions ] [ IOUs ]
```

---

# 25. IOU Overview

```text
IOUs & Debts

You owe
₹4,500

You're owed
₹8,200

Net
+₹3,700
```

Then:

```text
You're owed

Rahul
₹2,000
Due 15 Aug

Aman
₹1,200
No due date

Priya
₹5,000
Due 30 Aug
```

And:

```text
You owe

Rohan
₹1,500
Due 12 Aug

Neha
₹3,000
Due 20 Aug
```

---

# 26. Create IOU

```text
Add IOU

Type

[ I Owe ] [ I'm Owed ]

Person

[ Rahul                     ]

Amount

₹
[ 2000 ]

Due Date

[ 15 Aug 2026              ]

Note

[ Dinner split              ]

Workspace

[ Personal                 ]

[ Save IOU ]
```

---

# 27. IOU Details

```text
Rahul

₹2,000

You're owed

Due:
15 August 2026

Note:
Dinner split

────────────────────

Payment history

₹500 paid
08 Aug 2026

Remaining
₹1,500

[ Record Payment ]

[ Settle Fully ]

[ Edit ]

[ Delete ]
```

---

# 28. Partial Settlement

Partial payments must be supported.

Example:

```text
Record Payment

Outstanding
₹1,500

Payment amount
[ ₹500 ]

Remaining
₹1,000

[ Record Payment ]
```

After settlement:

```text
✓ Payment recorded

Remaining:
₹1,000
```

---

# 29. Full Settlement

```text
Settle IOU?

Rahul
₹1,500 remaining

[ Cancel ]

[ Mark as Fully Settled ]
```

After completion:

```text
✓ IOU settled

Rahul
₹2,000
Fully settled
```

---

# 30. Transaction Screen

The Transactions screen should remain focused on actual financial entries.

```text
Transactions

🔍                         ⚙

August 2026

[ All ] [ Income ] [ Expense ]

TODAY

🍔 Swiggy
Food
-₹340

🚕 Uber
Transport
-₹220
```

IOUs should not clutter the normal transaction list unless they are represented as actual financial transactions by the backend.

---

# 31. Search & Filters

```text
Search transactions

[ 🔍 Swiggy................ ]

Filters

Type
[ All ] [ Income ] [ Expense ]

Category
[ All categories       > ]

Workspace
[ Personal             > ]

Date
[ This month           > ]

Amount
[ Min ] — [ Max ]

[ Apply Filters ]
```

If workspace is already globally selected, the filter can default to that workspace.

---

# 32. Transaction Details

```text
← Transaction

              -₹340

🍔
Food

Swiggy

08 August 2026
10:42 PM

Payment method
UPI

Account
HDFC Bank

Workspace
Personal

Note
Dinner

────────────────────

[ Edit Transaction ]

Delete
```

---

# 33. ANALYTICS

Analytics must respect the selected workspace.

Header:

```text
Analytics

[ Personal ▼ ]

August 2026
```

Summary:

```text
Income
₹35,000

Expenses
₹18,420

Net
₹16,580
```

---

# 34. Spending Trend

```text
Spending Trend

₹
│        ╭──╮
│    ╭───╯  ╰──╮
│ ╭──╯          ╰
└──────────────────
 Jan Feb Mar Apr...
```

Support relevant periods:

- Month
- Quarter
- Financial year

---

# 35. Category Breakdown

```text
Where your money goes

Food             ₹5,240     28%
██████████████

Shopping         ₹3,420     18%
█████████

Transport        ₹2,850     15%
███████

Bills            ₹2,400     13%
██████
```

The chart should complement the numbers.

---

# 36. Financial Year

Ledger uses the Indian Financial Year:

> **April 1 → March 31**

UI:

```text
Period

○ Month
○ Quarter
● Financial Year

FY 2026–27
```

Show:

```text
Apr  May  Jun  Jul  Aug  Sep ...
```

All financial-year totals must match the web application's backend logic.

---

# 37. YEARLY SUMMARY

The existing web application generates professional financial summaries.

The mobile application should provide:

```text
Yearly Summary

FY 2026–27

Income
₹4,25,000

Expenses
₹2,80,000

Net
₹1,45,000

Top Category
Business Travel

Transactions
428

[ Generate PDF Statement ]
```

The report should be based on the active workspace.

---

# 38. PROFESSIONAL PDF GENERATION

Ledger supports professional PDF generation.

Provide a Reports section:

```text
Reports

Financial Reports

[ Yearly Summary ]
[ PDF Statement ]

Invoices

[ Create Invoice ]
[ Invoice History ]
```

If the backend supports additional report types, expose them without redesigning the overall information architecture.

---

# 39. PDF FINANCIAL STATEMENT

```text
Generate Statement

Workspace
[ Personal ▼ ]

Period
[ FY 2026–27 ▼ ]

Include

☑ Income
☑ Expenses
☑ Category breakdown
☑ Financial summary

[ Generate PDF ]
```

After generation:

```text
✓ Statement generated

[ Preview ]
[ Share ]
[ Save ]
```

Use the platform's native share/save mechanisms where possible.

---

# 40. SUBSCRIPTION BILLING DOCUMENTS

The app should **not** contain a customer/business invoice-generation system for creating invoices for other people.

The requirement here is different: when a user purchases or renews a Ledger Premium plan, Ledger should retain the payment history and provide the corresponding billing document when available.

Use UI terminology such as:

- **Payment History**
- **Billing Documents**
- **Invoice / Receipt / Tax Invoice** only according to what the payment provider/backend actually supplies.

Recommended flow:

```text
More
  │
  ▼
Subscription
  │
  ├── Current Plan
  ├── Payment History
  └── Billing Documents
```

Example:

```text
Billing Documents

10 Aug 2026
Ledger Premium — Yearly
₹499
Paid

[ View / Download ]

10 Jul 2026
Ledger Premium — Monthly
₹49
Paid

[ View / Download ]
```

Document detail:

```text
Billing Document

Ledger Premium
₹499

Payment date
10 August 2026

Payment status
Paid

Payment reference
XXXXXXXX

────────────────────

[ Preview ]
[ Download PDF ]
[ Share ]
```

Important:

- This is for **the user's payments to Ledger**, not invoices the user creates for their own customers.
- Keep billing documents separate from Ledger's financial reports.
- Keep billing documents separate from CSV/XLSX/PDF data exports.
- The payment provider/backend is the source of truth for payment status and document availability.
- If no downloadable billing document is available from the backend/payment provider, show an unavailable state instead of fabricating one.
- Do not invent GST/tax/invoice fields that the backend does not support.

---

# 42. IMPORT / EXPORT HUB

Because Ledger supports AI imports and multiple export formats, give the More/Data area a clear data-management section.

```text
Data

Import
  AI Receipt
  PDF Statement

Export
  CSV
  Excel (.xlsx)
  PDF
```

### Export formats

Ledger mobile must support:

- **CSV**
- **Excel (.xlsx)**
- **PDF**

The user should explicitly select the desired format.

```text
Export Data

Workspace
[ Personal ▼ ]

Date range
[ This month ▼ ]

Data
[ Transactions ▼ ]

Format

[ CSV ] [ XLSX ] [ PDF ]

[ Export ]
```

CSV/XLSX should provide structured financial data where supported.

PDF should provide a readable financial report/statement where supported.

**PDF export is a financial-data/report export, not a subscription billing invoice.**

Do not bury import/export under random settings.

---

# 43. CSV / XLSX / PDF EXPORT

```text
Export Data

Workspace
[ Personal ▼ ]

Date range
[ Apr 2026 — Aug 2026 ]

Data
[ Transactions ▼ ]

Format
● CSV
○ Excel (.xlsx)
○ PDF

[ Export ]
```

Supported formats:

### CSV
Best for raw transaction/data export.

### Excel (.xlsx)
Best for spreadsheet analysis and further editing.

### PDF
Best for readable financial reports/statements.

The export flow should preserve supported:

- Active workspace
- Date range
- Filters
- Selected data type

Do not confuse these exports with subscription billing documents.

---

# 44. ACCOUNTS / PAYMENT METHODS

The mobile design may retain an Accounts/Payment Methods section if the existing backend supports it.

Example:

```text
Accounts

HDFC Bank
₹24,500

Cash
₹4,250

UPI
₹8,100

Credit Card
₹6,000

                    ＋
```

Important:

> Do not invent account-management behavior if the current backend does not support it.

This section should be implemented only to the extent that the existing product/data model supports it.

---

# 45. CATEGORIES

Ledger has 11 smart default categories and unlimited custom categories.

UI:

```text
Categories

Expense

🍔 Food
🚕 Transport
🛍 Shopping
💡 Bills
🎬 Entertainment
🏠 Rent
...

＋ Add Category
```

Support:

- Default categories
- Custom categories
- Category editing where supported
- Category-specific transaction history

Do not hard-code the 11 categories into the UI if categories are backend-configurable.

---

# 46. PROFILE

```text
Profile

        [Avatar]

        Dhruv Ghanchi
        dhruv@email.com

────────────────────

Personal Information      >

Subscription              >

Workspace                 >

Security                  >

Appearance                >

Help & Support            >

────────────────────

Log out
```

---

# 47. MORE SCREEN

Because Ledger now has significantly more functionality, More should act as a **product hub**.

Recommended:

```text
More

┌────────────────────────────┐
│ ✦ KOIN AI                  │
│ Your financial copilot    │
└────────────────────────────┘

Finance
  Accounts
  Categories
  IOUs & Debts

Reports
  Yearly Summary
  PDF Statements

Data
  Import
  Export

Account
  Subscription
  Profile
  Settings

Help
  Help & Support
```

This is better than putting everything into one long flat settings list.

---

# 48. SUBSCRIPTION

The actual Ledger trial is **60 days**, not 7 days.

Subscription UI:

```text
Ledger Premium

Unlock the complete Ledger experience.

✓ KOIN AI
✓ AI receipt extraction
✓ PDF statement extraction
✓ IOUs & debt tracking
✓ Advanced analytics
✓ PDF reports
✓ Invoice generation
✓ Data exports
✓ Business finance tools

────────────────────────

Monthly

₹49 / month

[ Choose Monthly ]

────────────────────────

Yearly

₹499 / year

[ Choose Yearly ]
```

During the trial:

```text
60-day Premium Trial

24 days used
36 days remaining

[ View Plans ]
```

The actual price values must remain configurable from the backend/payment configuration rather than hard-coded where possible.

---

# 49. PREMIUM FEATURE GATING

The frontend should handle entitlement states cleanly.

Example:

```text
✦ KOIN AI

Premium Feature

Your 60-day trial has ended.

Upgrade to continue using KOIN.

[ View Premium Plans ]
```

During the trial:

```text
✓ Premium active

36 days remaining
```

Do not rely only on local device dates.

The backend/subscription state is the source of truth.

---

# 50. Settings

```text
Settings

Account
  Profile
  Change password

Finance
  Currency
  Financial year
  Default workspace

Notifications
  Transaction reminders
  Monthly summary

Appearance
  Theme
  Dark mode

Security
  App lock / biometric
```

Security features such as biometric lock should only be implemented if they are actually supported/required by the project.

Do not introduce unnecessary backend requirements merely for UI completeness.

---

# 51. EMPTY STATES

Every major feature needs an intentional empty state.

## Transactions

```text
No transactions yet

Start tracking your first
income or expense.

[ + Add Transaction ]
```

## IOUs

```text
No IOUs yet

Track money you owe or
money others owe you.

[ + Add IOU ]
```

## Invoices

```text
No invoices yet

Create your first professional
invoice.

[ + Create Invoice ]
```

## KOIN

```text
Hi, I'm KOIN ✦

Ask me anything about your
Ledger finances.

[ Ask a question ]
```

## Analytics

```text
Not enough data yet

Add transactions to unlock
financial insights.
```

---

# 52. LOADING STATES

Do not display blank screens.

Use:

- Skeleton balance card
- Skeleton transaction rows
- Chart skeleton
- AI processing animation
- Import progress
- PDF generation progress

Example:

```text
Analyzing receipt...

██████████████░░░░

Extracting:
✓ Vendor
✓ Date
✓ Amount
○ Category
○ Payment method
```

---

# 53. ERROR STATES

Never expose raw implementation errors.

Bad:

```text
HTTP 500
FirebaseException
AxiosError
```

Good:

```text
Something went wrong

We couldn't load your transactions.

[ Try Again ]
```

AI-specific:

```text
KOIN couldn't complete that request.

Please try again or check your
connection.

[ Try Again ]
```

Import-specific:

```text
We couldn't read this file.

Try a clearer receipt or a supported PDF.

[ Choose Another File ]
```

---

# 54. CONFIRMATION FOR FINANCIAL ACTIONS

Financially meaningful actions should be explicit.

For example:

```text
Add this expense?

₹500

Business Travel
Business workspace

[ Cancel ] [ Confirm ]
```

Especially important for KOIN actions.

---

# 55. MOBILE UX FOR FILES

The app should use native mobile file/image selection where possible.

For receipt import:

```text
Import Receipt

[ Take Photo ]
[ Choose From Gallery ]
```

For PDFs:

```text
Select PDF
```

Do not create a desktop-style file browser inside the application.

---

# 56. KOIN + Import Integration

KOIN should eventually be able to guide the user toward imports.

Example:

User:

```text
Can you add this receipt?
```

KOIN:

```text
Sure.

Upload or photograph the receipt
and I'll extract the transaction details.

[ Import Receipt ]
```

This creates a coherent AI workflow rather than treating KOIN and AI imports as unrelated features.

---

# 57. Workspace + AI + IOU Interaction

These three systems must work together.

Example:

```text
Current workspace:
Business

User:
How much do I owe this month?

KOIN:
You currently owe ₹12,500
in the Business workspace.

[ View IOUs ]
```

If the user asks:

```text
Log ₹500 travel expense.
```

KOIN should use the active Business workspace unless the user explicitly says otherwise.

---

# 58. Dark Mode

Dark mode should be designed at the system level.

Requirements:

- Semantic color tokens
- Accessible contrast
- Chart readability
- Correct income/expense colors
- Proper modal/bottom-sheet backgrounds
- No hard-coded white/black values throughout the UI

Do not treat dark mode as a final screen-by-screen patch.

---

# 59. Accessibility

Support:

- 44–48 px minimum touch targets where practical
- Screen reader labels
- Dynamic text sizing
- Accessible contrast
- Semantic icons
- Keyboard-safe forms
- Do not rely solely on red/green to communicate meaning

---

# 60. Micro-interactions

Recommended:

- Balance number animation
- Successful transaction animation
- Receipt processing progress
- KOIN typing indicator
- Bottom-sheet entrance
- Tab transition
- Chart entrance
- IOU settlement confirmation
- PDF generation progress
- Subscription success state

Keep animations subtle and fast.

---

# 61. Mobile vs Web Strategy

The mobile app and web app should contain the **same product capabilities**, but they do not need identical layouts.

### Web

Best for:

- Dense dashboards
- Tables
- Detailed analytics
- Large reports
- Bulk data operations
- Administration

### Mobile

Best for:

- Quick expense entry
- Receipt capture
- KOIN conversations
- Checking balances
- IOU management
- Reviewing transactions
- Quick analytics
- Sharing reports/invoices

Therefore:

> **Same capabilities, different interaction model.**

---

# 62. Feature Parity Matrix

| Web Capability | Mobile Requirement | Priority |
|---|---|---:|
| Personal workspace | Full support | P0 |
| Business workspace | Full support | P0 |
| Manual income | Full support | P0 |
| Manual expense | Full support | P0 |
| Dashboard | Full support | P0 |
| Transactions | Full support | P0 |
| Analytics | Full support | P0 |
| Indian Financial Year | Full support | P0 |
| Custom categories | Full support | P0 |
| KOIN AI | Full support | P0 |
| AI receipt extraction | Full support | P0 |
| AI PDF statement extraction | Full support | P0 |
| IOUs/debts | Full support | P0 |
| Partial debt settlement | Full support | P0 |
| Full debt settlement | Full support | P0 |
| CSV export | Full support | P1 |
| Excel (.xlsx) export | Full support | P1 |
| PDF export | Full support | P1 |
| PDF financial statement | Full support | P1 |
| Google authentication | Full support | P0 |
| Email/password | Full support | P0 |
| 60-day premium trial | Full support | P0 |
| Razorpay subscription | Full support | P0 |
| Premium feature gating | Full support | P0 |
| Accounts/payment methods | Match existing backend | P1 |
| Profile | Full support | P1 |
| Settings | Full support | P1 |

---

# 63. What Should NOT Be Added Without Backend Support

The AI/developer must not invent backend features simply because they appear in a UI concept.

Do not assume support for:

- Bank synchronization
- Automatic bank feeds
- Push notifications
- Biometric authentication
- Multi-currency accounting
- Recurring transactions
- Budgets
- Investments
- Tax filing
- Credit scores
- OCR beyond the existing AI extraction system
- Offline sync
- Real-time collaboration

If the backend does not support it, leave it out.

---

# 64. Design System Components

Create reusable components rather than implementing each screen independently.

Recommended component library:

```text
AppShell
BottomNavigation
WorkspaceSwitcher
BalanceCard
SummaryCard
QuickAction
TransactionRow
TransactionList
CategoryIcon
CategorySelector
AmountInput
DateSelector
AccountSelector
PaymentMethodSelector
FilterSheet
ChartCard
AIButton
KoinMessage
KoinActionConfirmation
ImportCard
ReceiptReviewCard
IOUCard
SettlementDialog
ReportCard
InvoiceCard
SubscriptionCard
EmptyState
ErrorState
LoadingSkeleton
ConfirmationDialog
BottomSheet
```

---

# 65. Recommended Implementation Order

## Phase 1 — Design Foundation

1. Design tokens
2. Typography
3. Colors
4. Icons
5. Buttons
6. Inputs
7. Cards
8. Bottom sheets
9. Navigation
10. Workspace switcher

---

## Phase 2 — Core Financial UX

1. Home
2. Manual Expense
3. Manual Income
4. Transactions
5. Transaction Details
6. Categories
7. Workspace switching

---

## Phase 3 — AI + Import

1. KOIN Home entry point
2. KOIN Chat
3. KOIN action confirmation
4. Receipt import
5. AI extraction review
6. PDF statement import
7. PDF transaction review/import

---

## Phase 4 — IOUs

1. IOU overview
2. Add IOU
3. IOU details
4. Partial settlement
5. Full settlement
6. IOU history

---

## Phase 5 — Analytics + Reports

1. Analytics
2. Financial-year reporting
3. Yearly Summary
4. PDF statement
5. Invoice creation
6. Invoice history
7. CSV export
8. Excel export

---

## Phase 6 — SaaS

1. Trial status
2. Premium feature gating
3. Pricing
4. Razorpay checkout
5. Subscription success
6. Subscription state
7. Trial expiry state

---

## Phase 7 — Production Polish

1. Empty states
2. Loading states
3. Error states
4. Dark mode
5. Accessibility
6. Micro-interactions
7. Performance
8. Device-size testing
9. Network failure testing
10. Authentication/session testing

---

# 66. Figma Workflow

Do not design all screens at once.

Start with these **five critical screens**:

### 1. Home

Must establish:

- Workspace switcher
- Balance
- Month selector
- Quick actions
- AI entry point
- Spending overview
- Recent transactions
- Bottom navigation

### 2. Add Transaction

Must establish:

- Amount input
- Income/expense switch
- Category selection
- Workspace
- Account/payment method
- Save interaction

### 3. Transactions

Must establish:

- Transaction row
- Search
- Filters
- Date grouping
- Income/expense semantics

### 4. KOIN

Must establish:

- AI visual language
- Chat bubbles
- Suggested prompts
- Action confirmation
- AI loading state

### 5. IOUs

Must establish:

- Owed vs owing
- IOU card
- Settlement interaction
- Financial status

Once these five are visually strong, the remaining screens can inherit the design language.

---

# 67. Final Mobile Information Architecture

```text
LEDGER MOBILE
│
├── AUTH
│   ├── Splash
│   ├── Login
│   ├── Signup
│   └── Onboarding
│
├── MAIN APP
│   │
│   ├── GLOBAL
│   │   ├── Workspace Switcher
│   │   ├── Notifications
│   │   └── Premium Status
│   │
│   ├── HOME
│   │   ├── Balance
│   │   ├── Income / Expense
│   │   ├── Spending Overview
│   │   ├── Recent Transactions
│   │   ├── Quick Add
│   │   ├── Import Receipt
│   │   └── KOIN
│   │
│   ├── ANALYTICS
│   │   ├── Income
│   │   ├── Expenses
│   │   ├── Net
│   │   ├── Spending Trends
│   │   ├── Categories
│   │   └── Financial Year
│   │
│   ├── ADD
│   │   ├── Expense
│   │   ├── Income
│   │   ├── Receipt Import
│   │   └── PDF Import
│   │
│   ├── ACTIVITY
│   │   ├── Transactions
│   │   │   ├── Search
│   │   │   ├── Filters
│   │   │   └── Details
│   │   │
│   │   └── IOUs
│   │       ├── Overview
│   │       ├── Add IOU
│   │       ├── Details
│   │       ├── Partial Settlement
│   │       └── Full Settlement
│   │
│   └── MORE
│       ├── KOIN
│       ├── Reports
│       │   ├── Yearly Summary
│       │   ├── PDF Statement
│       │   └── Invoices
│       │
│       ├── Data
│       │   ├── AI Receipt Import
│       │   ├── PDF Import
│       │   ├── CSV Export
│       │   └── Excel Export
│       │
│       ├── Accounts
│       ├── Categories
│       ├── Subscription
│       ├── Profile
│       ├── Settings
│       └── Help
│
└── SYSTEM UX
    ├── Loading
    ├── Empty
    ├── Error
    ├── Confirmation
    ├── Dark Mode
    ├── Accessibility
    └── Network Failure
```

---

# 68. Non-Negotiable Rules For the AI Developer

The AI implementing this frontend must follow these rules.

1. **Do not simply shrink the web UI.**
2. **Preserve feature parity with the existing Ledger web application.**
3. **Do not invent unsupported backend features.**
4. **Personal and Business workspaces must remain logically separated.**
5. **The active workspace must be visible and respected by transactions, analytics, KOIN, IOUs, imports, and reports.**
6. **The 60-day premium trial is the correct trial period.**
7. **Premium entitlement must come from backend/subscription state.**
8. **KOIN is a first-class product feature, not a decorative chatbot.**
9. **Receipt/photo AI extraction must have a review/edit step.**
10. **PDF statement extraction must provide a transaction review/import step.**
11. **IOUs must support creation, partial settlement, and full settlement.**
12. **Financially meaningful KOIN actions should use confirmation where appropriate.**
13. **Adding a basic expense must remain extremely fast.**
14. **Use bottom sheets for contextual actions where appropriate.**
15. **Do not mix IOUs with transactions unless the backend explicitly models them as transactions.**
16. **Maintain Indian Financial Year reporting: April → March.**
17. **CSV/Excel export must respect active filters/workspace/period where supported.**
18. **PDF statements and invoices must use backend-supported generation.**
19. **Razorpay integration must remain compatible with the existing subscription architecture.**
20. **Do not hard-code subscription entitlement or trial countdown logic.**
21. **Create reusable components instead of duplicating screen-specific UI.**
22. **Every major feature needs loading, empty, and error states.**
23. **Do not expose raw backend/API/Firebase errors to users.**
24. **Do not make the user repeatedly select the workspace when the global workspace is already known.**
25. **Design the critical screens in Figma before implementing the entire frontend.**

---

# 69. Definition of Done

The mobile frontend is complete when:

- Personal and Business workspaces work correctly.
- Home provides a clear financial overview.
- Manual income/expense entry is fast.
- Receipt AI import works through a review flow.
- PDF statement import works through a review flow.
- KOIN is accessible and visually integrated.
- KOIN can display financial insights and supported action confirmations.
- IOUs support owing/owed states.
- IOUs support partial and full settlement.
- Analytics work for the selected workspace.
- Indian Financial Year reporting matches the backend.
- Yearly summaries are available.
- PDF statements can be generated.
- Subscription payment history and billing documents are available where supported by the payment/backend system.
- CSV/XLSX/PDF export is available.
- Authentication works through Firebase.
- The 60-day premium trial is represented correctly.
- Premium feature gating works from backend entitlement.
- Razorpay subscription flow remains compatible.
- Loading, empty, error, and confirmation states exist.
- The application is usable across common Android screen sizes.
- The UI feels like a native finance application rather than a responsive website.

---

# 70. Primary Design Objective

The final Ledger mobile experience should make this possible:

```text
OPEN LEDGER
     │
     ▼
SEE BALANCE
     │
     ├───────────────┐
     ▼               ▼
ADD EXPENSE       ASK KOIN
     │               │
     ▼               ▼
DONE            GET INSIGHT
                     │
                     ▼
              TAKE ACTION
```

The product should feel:

**Fast. Intelligent. Financially clear.**

The mobile application is not a secondary version of Ledger.

It is a **mobile-first interface to the complete Ledger product**.

---

# 71. Terminology: Billing Documents vs Financial Reports vs Exports

These three document concepts must remain separate in the mobile UX.

### A. Subscription billing documents

Documents related to the user's payments **to Ledger**:

```text
Ledger Premium
     │
     ▼
Successful Payment
     │
     ▼
Payment History
     │
     ▼
Billing Document
(Invoice / Receipt / Tax Invoice,
depending on provider/backend)
```

Location:

```text
More
  → Subscription
      → Payment History
      → Billing Documents
```

### B. Financial reports

Documents generated from the user's own Ledger financial data:

- Yearly Summary
- PDF financial statement
- Financial-period reports

Location:

```text
More
  → Reports
```

### C. Data exports

Exports of Ledger financial data:

```text
CSV
XLSX
PDF
```

Location:

```text
More
  → Data
      → Export
```

**Never combine these into a generic "Invoices" area.**

---

# 71. Implementation Principle

When there is a conflict between:

- copying the existing web layout, and
- creating a better mobile interaction,

**preserve the functionality but redesign the interaction for mobile.**

When there is a conflict between:

- adding a visually attractive feature, and
- staying compatible with the existing backend,

**backend compatibility wins.**

When there is a conflict between:

- showing every piece of information, and
- keeping the screen understandable,

**progressive disclosure wins.**

The guiding rule is:

> **Same product. Same data. Same capabilities. Better mobile interaction.**
