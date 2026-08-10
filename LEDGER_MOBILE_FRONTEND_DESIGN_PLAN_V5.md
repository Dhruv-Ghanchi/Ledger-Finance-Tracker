# LEDGER MOBILE UI/UX ARCHITECTURE & DESIGN SYSTEM SPECIFICATION

> **Document Version:** `v5.0-LIGHT-THEME-ALIGNED`  
> **Target Audience:** AI Developer Agents (Cursor, Claude Dev, Windsurf), Mobile Engineers, Frontend Architects.  
> **Core Objective:** Implement a high-tactility, ultra-sleek, mobile-first financial application aligned with the existing Ledger web light-theme color system (Tailwind HSL variables).

---

# 1. Design System & Visual Tokens

The mobile app mirrors the web application's HSL color system while using mobile-native depth, tactile feedback, soft elevated cards, and monospaced financial typography.

## 1.1 Scope-Aware Color System (Tailwind HSL Alignment)

Whenever the user toggles between **Personal** and **Business** scopes, key UI highlights, status accents, and ambient container glows smoothly transition over **250ms**.

```css
/* Web System CSS Variables Reference */
:root {
  --background: 0 0% 96%;           /* #f5f5f5 */
  --foreground: 240 6% 6%;          /* #0f0f10 */
  --card: 0 0% 100%;                /* #ffffff */
  --card-foreground: 240 6% 6%;     /* #0f0f10 */
  --primary: 240 6% 10%;            /* #18181b */
  --primary-foreground: 0 0% 98%;   /* #fafafa */
  --secondary: 240 5% 96%;          /* #f4f4f5 */
  --secondary-foreground: 240 6% 10%;
  --muted: 240 5% 92%;              /* #e4e4e7 */
  --muted-foreground: 240 4% 40%;   /* #64646a */
  --border: 240 6% 90%;             /* #e2e2e5 */
  --destructive: 0 72% 45%;         /* #dc2626 */
  
  /* Workspace Semantic Highlights */
  --personal-accent: 217 82% 39%;   /* #0F52BA - Sapphire Blue */
  --business-accent: 38 92% 50%;    /* #F59E0B - Amber Gold */
}
```

### Color Token Mapping Table

| Element Token | HSL / Hex Code | Usage & Context |
|---|---|---|
| Canvas Background | `hsl(0, 0%, 96%)` (`#F5F5F5`) | App-wide screen background canvas |
| Surface Card / Modal | `hsl(0, 0%, 100%)` (`#FFFFFF`) | Elevated cards, bottom sheets, popovers |
| Primary Text | `hsl(240, 6%, 6%)` (`#0F0F10`) | Headings, primary amounts, active labels |
| Secondary/Muted Text | `hsl(240, 4%, 40%)` (`#64646A`) | Timestamps, secondary tags, helper text |
| Personal Accent | `hsl(217, 82%, 39%)` (`#0F52BA`) | Personal scope badge, primary personal highlight |
| Business Accent | `hsl(38, 92%, 50%)` (`#F59E0B`) | Business scope badge, primary business highlight |
| Primary Action CTA | `hsl(240, 6%, 10%)` (`#18181B`) | Main action buttons, solid navigation state |
| Secondary Action CTA | `hsl(240, 5%, 96%)` (`#F4F4F5`) | Neutral option buttons, filter pills |
| Card Borders | `hsl(240, 6%, 90%)` (`#E2E2E5`) | 1px subtle divider lines & card borders |
| Income / Positive | `hsl(158, 64%, 40%)` (`#10B981`) | Credit indicators, positive net flow |
| Expense / Loss | `hsl(0, 72%, 45%)` (`#DC2626`) | Debit indicators, destructive actions |
| KOIN AI Brand Accent | `linear-gradient(135deg, #7C3AED, #EC4899)` | AI Copilot entry badges and glow rings |

## 1.2 Typography & Numerical Mechanics

- **Primary Font:** System Font (SF Pro Display on iOS, Roboto / Inter on Android).
- **Monospaced Financial Figures:** All currency values, account balances, and table figures MUST use tabular numbers (`font-variant-numeric: tabular-nums` / `tnum`).
- **Implementation Rule:** Prevents layout jittering when balances animate or refresh.

## 1.3 Elevation, Shadows & Glassmorphism

- **Light Glassmorphism:** Bottom bar & top header floating elements use `rgba(255, 255, 255, 0.85)` with `backdrop-filter: blur(16px)`.
- **Card Shadows:** Cards use soft, multi-layered diffuse drop shadows rather than heavy borders:
  `box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)`
- **Border Radii:**
  - **Cards:** 20px (`rounded-2xl`).
  - **Modals & Bottom Sheets:** 28px top corner radius (`rounded-t-[28px]`).
  - **Pills & Action Buttons:** 9999px (`rounded-full`).

# 2. Navigation Architecture & Layout Shell

```text
┌────────────────────────────────────────────────────────┐
│  [👤]             [ 🟦 Personal ▾ ]          [✦ KOIN]  │  <-- Header
├────────────────────────────────────────────────────────┤
│                                                        │
│                    MAIN VIEWPORT                       │
│             (Home / Analytics / Activity)              │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [ Home ]  [ Analytics ]   ( ＋ )   [ Activity ] [ More ] │  <-- Light Glass Floating Bar
└────────────────────────────────────────────────────────┘
```

## 2.1 Header Zone
- **Left Element:** Avatar (36x36px) with a subtle border ring indicating trial/subscription status.
- **Center Element:** Interactive Workspace Switcher Pill
  - Displays active scope badge + indicator:
    - Personal: `[ 🟦 Personal ▾ ]` (Accent: `#0F52BA`)
    - Business: `[ 🟧 Business ▾ ]` (Accent: `#F59E0B`)
  - Tapping triggers the Workspace Switcher Bottom Drawer.
- **Right Element:** KOIN Copilot Chip (`[✦ KOIN]`)
  - Features a delicate gradient border. Tapping opens the KOIN AI Overlay.

## 2.2 Floating Light Glass Bottom Navigation Bar
- Suspended 16px above the bottom screen margin on a `hsl(0, 0%, 96%)` canvas.
- **Background:** `rgba(255, 255, 255, 0.88)` with `backdrop-filter: blur(20px)` and a 1px border of `hsl(240, 6%, 90%)`.
- **Center (+) Command Button:**
  - **Size:** 56x56px floating circular button.
  - **Background:** High-contrast `hsl(240, 6%, 10%)` with white icon (`hsl(0, 0%, 98%)`).
  - **Behavior:** Long-press or single tap opens the Quick Command Spring Sheet.

# 3. Screen Specifications & Spatial UX

## 3.1 Home Dashboard ("The Financial Heartbeat")
The Home screen layout uses 4 vertical zones on a clean light canvas (`hsl(0, 0%, 96%)`):

**Zone 1: Hero Financial Card (Top)**
- **Surface:** Pure White (`hsl(0, 0%, 100%)`) with a subtle scope-colored accent strip on top (Blue for Personal, Amber for Business).
- **Total Balance Display:** Large numerical text with tabular spacing.
- **Odometer Motion:** When the user switches month or scope, digits roll smoothly vertically over 350ms.
- **Privacy Masking:** Tapping the eye icon (👁) transforms digits into `₹ ••••••`.
- **Cash Flow Mini-Badges:**
  - `▲ ₹35,000` (Income - Mint Green pill `hsl(158, 64%, 95%)`)
  - `▼ ₹18,420` (Expense - Light Red pill `hsl(0, 72%, 96%)`)

**Zone 2: Contextual AI Carousel (Horizontal Scroll)**
A horizontal pill row with standard light-gray secondary styling:
- `[ 📸 Scan Receipt ]` (Scope border highlight)
- `[ ＋ Manual Expense ]`
- `[ 💬 "Food spend this month?" ]` (Instant KOIN query trigger)

**Zone 3: Dynamic Smart Alert Banner (Conditional)**
Displays only when immediate visual attention is needed.
- **Example:** Light Amber Card (`hsl(38, 92%, 96%)` background, `hsl(38, 92%, 50%)` left border):
- `⚠️ Rahul owes you ₹2,000 due today` → Button: `[ Remind ]`.

**Zone 4: Live Activity Feed**
White elevated card container housing recent transaction rows.
- **Row Architecture:**
  - **Left:** Category icon inside a subtle `hsl(240, 5%, 96%)` circular badge.
  - **Center:** Title (Near black) + Category/Time (Muted Gray).
  - **Right:** Amount formatted in tnum (+/- color coded).
- **Swipe Gestures:**
  - **Swipe Left:** Reveals `[ Delete ]` (Red) and `[ Edit ]` (Gray).
  - **Swipe Right:** Quick-duplicate transaction.

## 3.2 Add / Command Center (+ Button Spring Sheet)
Tapping the center + button blurs the background and springs up a pure white elevated modal:

```text
┌────────────────────────────────────────────────────────┐
│                      Quick Action                      │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📸  Scan Receipt / Bill                           │  │
│  │     Camera OCR / Image Gallery Upload             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─────────────────────────┐  ┌──────────────────────┐ │
│  │ 💸 Manual Transaction   │  │ 📑 Import PDF        │ │
│  └─────────────────────────┘  └──────────────────────┘ │
│                                                        │
│  ┌─────────────────────────┐  ┌──────────────────────┐ │
│  │ 🤝 Log IOU / Debt       │  │ 📄 Generate Report   │ │
│  └─────────────────────────┘  └──────────────────────┘ │
└────────────────────────────────────────────────────────┘
```
**Camera OCR Experience:**
- Launches viewfinder with active laser scan animation.
- **Live Extracted Chips:** Real-time feedback pills pop up at the bottom:
  `[ Vendor: Starbucks ✓ ] [ Amount: ₹450 ✓ ] [ Date: Today ✓ ]`
- Directly opens the Review & Edit Screen before saving to database.

## 3.3 Activity Feed & IOU Interactive Hub
- Segmented top toggle: `[ Transactions | Debts & IOUs ]` (Styled using `hsl(240, 5%, 96%)` container with active white pill indicator).

**Debts & IOUs View**
- **Summary Split Card:**
  - **Left Column:** You Owe (`₹4,500` - Amber/Destructive text)
  - **Right Column:** You're Owed (`₹8,200` - Personal Blue/Cyan text)
  - **Bottom Center:** Net Balance (`+₹3,700`)
- **Interactive Settlement Accordion:**
  - Tapping an IOU card expands in-place without page transitions.
  - **Partial Payment Slider:** Interactive track allowing instant recording of partial settlements (e.g., "Record ₹500 paid of ₹1,500 balance").
  - **Full Settlement Button:** Single-tap `[ Mark Fully Settled ]` triggers success micro-animation and updates workspace balance.

## 3.4 KOIN AI Co-Pilot Architecture
KOIN is integrated as a smart co-pilot layer across the app.

**1. Contextual Inline Insight Cards**
Inject subtle light cards into the Home feed and Analytics screen.
- Example: `✦ KOIN Insight: "Your dining expenses are 18% higher than last month." [ Show Details ]`

**2. Action Confirmation Safety Card**
When KOIN is commanded to write or alter data (e.g., "Log a ₹500 travel expense for business"), present a confirmation card before making API updates:

```text
┌────────────────────────────────────────────────────────┐
│ ✦ KOIN Action Request                                  │
│                                                        │
│ Action: Create Expense                                 │
│ Amount: ₹500.00                                        │
│ Category: Business Travel                              │
│ Workspace: Business 🟧                                 │
│                                                        │
│  [ Cancel ]                             [ Confirm ✓ ]  │
└────────────────────────────────────────────────────────┘
```

## 3.5 Analytics & Financial Reporting
Supports monthly, quarterly, and Indian Financial Year (April 1 → March 31) views.
- **Period Segmented Control:** `[ Month | Quarter | FY 2026–27 ]`
- **Scrubbable SVG Graph:**
  - Smooth spline curve line chart with fill gradient using active workspace accent color (`hsl(217, 82%, 39%)` for Personal, `hsl(38, 92%, 50%)` for Business).
- **Touch Scrubbing:** Slide finger across chart to display vertical pointer line + floating tooltip displaying exact date and value.
- **Category Breakdown List:** Progress indicator bars showing percentage spend per category.

## 3.6 Data, Reports & Subscription Hub (More Screen)
Structured into clean grouped card lists:

```text
More Hub
 │
 ├── ✦ KOIN AI Copilot
 │
 ├── 📊 Reports & Data Hub
 │    ├── Financial Statements (PDF)
 │    ├── Yearly Financial Summary (FY Apr-Mar)
 │    └── Export Engine (CSV / Excel / PDF)
 │
 ├── 🤝 Finances & Accounts
 │    ├── Accounts & Payment Methods
 │    ├── Categories
 │    └── Debts & IOUs
 │
 └── ⚙️ Account & Plan
      ├── Premium Subscription (60-Day Trial Status)
      ├── Payment History & Billing Receipts
      ├── App Settings
      └── Profile
```
**Document Separation Rules:**
- **Billing Receipts:** Invoices for user payments to Ledger. Located under Subscription → Billing Documents.
- **Financial Reports:** Generated accounting statements of user data. Located under Reports → PDF Statement.
- **Data Exports:** Raw export files. Located under Data → CSV / Excel Export.

# 4. Micro-Interactions & Motion Specifications
- **Tactile Haptic Feedback:**
  - **Selection:** Toggling workspace scope, switching tabs, expanding accordions.
  - **Impact Light:** Long pressing the command + button.
  - **Notification Success:** Settling an IOU, successfully scanning a receipt.
- **Odometer Counter Roll:**
  - Animate financial balance digits vertically over 350ms with easing curve `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Light Theme Skeleton Shimmer:**
  - Use animated light gradient placeholders (`hsl(240, 5%, 92%)` → `hsl(0, 0%, 100%)` → `hsl(240, 5%, 92%)`) for loading states instead of full-screen spinners.
- **Spring Sheet Physics:**
  - Bottom sheets use spring physics (stiffness: 320, damping: 32) for velocity-based swipe-to-dismiss interactions.

# 5. Component Tree & File Directory

```text
/src
  ├── /components
  │     ├── /ui
  │     │     ├── ScreenCanvas.tsx          (App shell applying background hsl(0, 0%, 96%))
  │     │     ├── ElevatedCard.tsx          (White card with shadow & 1px border)
  │     │     ├── OdometerNumber.tsx        (Animated tabular figure counter)
  │     │     ├── SpringSheet.tsx           (Swipeable bottom sheet wrapper)
  │     │     └── WorkspacePill.tsx         (Dynamic Blue/Amber scope switcher)
  │     ├── /financial
  │     │     ├── TransactionRow.tsx        (Swipeable list row item)
  │     │     ├── IOUAccordionCard.tsx      (Expandable debt card with payment slider)
  │     │     ├── ScrubbableChart.tsx       (Touch-interactive spending graph)
  │     │     └── ActionConfirmationCard.tsx (KOIN action confirmation UI)
  │     └── /navigation
  │           ├── GlassBottomBar.tsx        (Light blur floating bottom navigation)
  │           └── CenterCommandButton.tsx   (Floating '+' button)
  └── /theme
        └── colors.ts                       (Tailwind HSL color mapping & scope rules)
```

# 6. Non-Negotiable Rules for AI Developer Agents
When generating mobile code for this project, you MUST adhere to the following strict constraints:
- **Strict Color System Adherence:** Use the exact HSL Tailwind variables provided in this spec (`hsl(0, 0%, 96%)` background, `hsl(0, 0%, 100%)` card surfaces, `hsl(217, 82%, 39%)` Personal Blue, `hsl(38, 92%, 50%)` Business Amber). Do not substitute with random hex codes.
- **Tabular Financial Numbers:** Always apply `font-variant-numeric: tabular-nums` or `tnum` to financial numbers to avoid horizontal displacement during value changes.
- **Scope Isolation:** Every transaction query, balance fetch, KOIN prompt, and analytics calculation must explicitly filter by active Workspace Scope (Personal vs Business). Never mix workspace data.
- **Indian Financial Year Standard:** Annual summary calculations must execute across April 1 to March 31.
- **Receipt Review Verification:** OCR scans must always open the confirmation/review screen before committing data to the database.
- **Real Backend Entitlement:** Premium subscription state and trial countdowns must be retrieved directly from the backend entitlement state. Do not hardcode trial timers locally.
- **Native Touch Ergonomics:** Ensure all interactive elements have a minimum touch target size of 44x44px.
