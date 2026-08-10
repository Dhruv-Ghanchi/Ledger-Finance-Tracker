# Ledger — Codebase & Live Deployment Audit

*Reviewed: 2026-08-10. Covers the FastAPI backend, the React web app, the Flutter mobile app, and the live production deployment (Render backend + Vercel frontend).*

## Executive summary

Both deployed services answer right now — the Render backend and the Vercel frontend are both live and returning `200`. Under the hood the picture is mixed: the backend's core (auth, entries, categories, debts, exports) is well-structured and consistently guarded, but **the Razorpay payment integration has a code-level bug that will crash upgrade and cancellation requests outright** wherever Razorpay is actually configured — meaning premium upgrades are likely broken on the live site today.

The web app is the most mature surface: clean routing, a single API layer, no dangling code. The mobile app is genuinely further along than a prototype — real data, real CRUD, a working AI import pipeline — but it's built to roughly two-thirds of its own design spec, is iOS-unbuildable in its current state, and is missing two features the product markets as flagship (PDF invoices, billing history).

**Most urgent:** Razorpay subscribe/cancel/webhook calls `razorpay.Client(...)` without ever importing the `razorpay` module — a guaranteed `NameError` on every paid-upgrade attempt. See [Backend → Payments & subscriptions](#payments--subscriptions).

**Most impactful gap:** Mobile has no build path on iOS at all — `GoogleService-Info.plist` is missing, so Firebase never initializes and the login screen cannot function. See [Mobile → Platform readiness](#platform-readiness).

**Counts:** 1 critical · 6 high · 11 medium/low findings across the stack.

---

## Live production status

Checked directly against the deployed URLs in `README.md`.

| Service | URL | Result | Note |
|---|---|---|---|
| Backend root | `ledger-finance-tracker-backend.onrender.com/` | 200 OK | Responds in ~0.4s — Render free-tier cold start is not currently an issue |
| Backend docs | `/docs` | 200 OK | Swagger UI publicly reachable (fine for a solo project, worth knowing) |
| Protected route probe | `/api/categories` (no token) | 401 | Correctly rejects unauthenticated calls |
| Frontend | `ledger-dhruv-ghanchi.vercel.app/` | 200 OK | Loads in <1s |

**✅ Render sleep/cold-start mitigation is in place.** `app/backend/main.py:74-91` — an uncommitted change adds a `keep_alive_task()` that self-pings `RENDER_EXTERNAL_URL` every 5 minutes from inside the running process. On Render's free tier this is a legitimate, working way to dodge the ~15-minute idle spin-down, as long as it's deployed. If users have previously reported "first load is slow," this fix addresses it directly — worth shipping.

**🔴 Premium upgrade is very likely broken in production right now.** This is the single highest-priority item in this audit — it sits directly on the revenue path. Confirm by attempting a real upgrade from the live Pricing page, or by checking Render's runtime logs for `NameError: name 'razorpay' is not defined`.

---

## Backend — FastAPI

Python 3.11+, Motor (async MongoDB), Firebase Admin for auth verification, Gemini/Groq for AI, Razorpay for payments. Eight routers mounted from `main.py`, all under `/api`. No standalone auth routes — Firebase ID tokens are verified as a dependency on every protected endpoint, not issued by the backend itself.

### Route inventory

| Router | Prefix | Key endpoints | Access |
|---|---|---|---|
| users | `/api/users` | `POST /sync` · `PUT /profile` | Auth required |
| categories | `/api/categories` | list · add · delete | Auth; add/delete premium-gated |
| entries | `/api` | CRUD · monthly/yearly summary · CSV/XLSX/PDF export · **email export** (new) · receipt/statement import (preview+confirm) | Auth; import premium-gated |
| debts | `/api/debts` | CRUD · settle (auto-creates linked entry) | Auth; free tier capped at 5 pending |
| payments | `/api/payments` | subscribe · subscription · history · cancel · webhook | Auth (webhook public) |
| invoices | `/api/invoices` | branded PDF statement · year history | Auth; download premium-gated |
| chat | `/api/chat` | KOIN AI (Gemini → Groq fallback) | Auth, premium-gated, 5 req/min |
| contact | `/api/contact` | landing-page contact form | Public, IP-rate-limited |

### Uncommitted changes in the working tree — assessed

Four files carry uncommitted edits (`main.py`, `entries/routes.py`, `users/routes.py`, `core/email.py`). Together they form one coherent, complete feature: **emailing a finance report as an attachment**, plus a **promo-code system** applied server-side at first sync. The export endpoints were refactored to share byte-building helpers rather than duplicating inline logic across CSV/XLSX/PDF — a genuine cleanup, not just new surface area. This diff is ready to commit as-is; no half-finished branches found in it.

### Payments & subscriptions

**🔴 CRITICAL — `razorpay` module is used but never imported**
`app/backend/app/payments/routes.py:1, 19`

Line 1 only does `from razorpay.errors import SignatureVerificationError` — that binds `SignatureVerificationError` alone, it does **not** bind the name `razorpay` in the module namespace. Line 19's `get_rzp_client()` then calls `razorpay.Client(...)`, which raises `NameError: name 'razorpay' is not defined`. Verified by reproducing the exact import shape in isolation — confirmed, not speculative.

Every call to `get_rzp_client()` hits this — `POST /subscribe`, `POST /cancel`, and the webhook handler's status-sync path — whenever `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are set. **If those keys are configured on Render (they need to be for Razorpay to work at all), no user can currently upgrade to premium or cancel a subscription** — both surface as an unhandled 500. The fix is a one-line addition: `import razorpay` at the top of the file.

**🟠 HIGH — Webhook signature check is skippable**
`app/backend/app/payments/routes.py:138`

Signature verification only runs `if client and settings.RAZORPAY_WEBHOOK_SECRET`. The local `.env` has no `RAZORPAY_WEBHOOK_SECRET` at all, and it's also absent from `.env.example` — worth confirming it's actually set on Render. If it isn't, `POST /api/payments/webhook` accepts unsigned payloads, and the handler trusts `notes.firebase_uid` from the request body to decide whose plan to activate — a spoofable free-premium vector if the secret is missing in production.

**✅ Everything else about the money path is designed correctly.** The client never sets `plan`/`subscription_status` directly — those fields are only ever written by the (signature-verified, once the secret above is set) webhook or by the server-side promo-code lookup. `GET /subscription` deliberately strips Razorpay IDs from its response. This is the right shape; it just needs the import fixed and the webhook secret confirmed.

### Debts / IOU — the ObjectId fix, verified

**✅ Recent fix (commit `4e1b2db`) is correct and complete.** Motor's `insert_one()` mutates the dict you pass it, injecting a non-JSON-serializable `ObjectId` under `_id`. The fix strips it after inserting the linked entry in `settle_debt`. Checked every other write path in `debts/routes.py` and the rest of the backend for the same pattern — every other insert either discards the mutated dict or explicitly `.copy()`s before inserting. This was the one spot the convention was missed, and it's now fixed. No remaining leaks found.

### Other backend findings

- **🟠 HIGH — No amount or date validation on entries/debts.** `EntryCreate`/`DebtCreate` accept `amount: float` with negative or zero values, and `date: str` isn't validated as a real date. Summary and export queries do string-prefix matching on the raw date string, so a malformed date silently corrupts a user's monthly/yearly rollups rather than failing loudly at write time.
- **🟡 MEDIUM — `.env.example` is missing 5 variables the code actually reads.** Not documented: `GEMINI_API_KEY`, `GROQ_API_KEY`, `GROQ_MODEL`, `RAZORPAY_WEBHOOK_SECRET`, `ENVIRONMENT`. This is exactly why the webhook-secret gap above was easy to miss — the template doesn't prompt for it.
- **🟡 MEDIUM — `print()` debugging left in two spots.** `app/backend/app/entries/routes.py:1219, 1387`. Rest of the codebase uses `logging` consistently; these two OCR/import error paths print to stdout instead, which won't show up structured in Render's log viewer the way everything else does.
- **⚪ LOW — In-memory rate limiting won't survive a second instance.** `chat/routes.py`, `contact/routes.py`. Fine today on a single Render worker. If the backend ever scales horizontally, both rate limiters reset per-instance and stop being effective.
- **⚪ LOW — Test coverage is concentrated on one feature.** `app/backend/tests/` has real, well-written pytest suites for premium-gating logic and the chat fallback path — but nothing automated covers `entries`, `debts`, `payments`, `invoices`, or `categories`. The dozen ad hoc `test_*.py` scripts in the backend root are manual/local scripts (hardcoded local file paths), correctly excluded from `pytest.ini`'s `testpaths`.

---

## Web app — React

React 19 + React Router 7, Tailwind/shadcn, SWR for data, a single Axios instance for every network call. This is the cleanest of the three codebases — no dangling imports, no duplicate API layers, no stray debug logging.

### Routing

| Path | Page | Access |
|---|---|---|
| `/` | Landing | Public |
| `/login`, `/register` | Auth/Login.jsx, Auth/Register.jsx | Public |
| `/pricing` | Pricing | Public (checkout requires login) |
| `/dashboard` | Dashboard — entries, summaries, debts, KOIN chat | Protected |
| `/profile`, `/subscription` | ProfileSettings, Subscription | Protected |
| `/terms`, `/privacy`, `/refund` | Static legal pages | Public |
| `*` | Redirect → `/` | — |

**✅ The deleted `PinLock.jsx` is a clean removal.** It was never wired into the router or into `AuthContext` — abandoned scaffolding from an early PIN-lock concept mentioned in the project's original PRD, superseded by Firebase auth. No dangling imports, nothing else references it. Safe to let this deletion land.

### Known issues

- **🟠 HIGH — KOIN AI chat panel overflows on most phones.** `AIChatAssistant.jsx:189`. The open chat panel is a hard-coded `w-[380px]` with no responsive fallback, anchored `fixed bottom-6 right-6`. Most phones in portrait are narrower than 380px plus that offset, so the panel clips off the right edge of the screen. This is the app's flagship AI feature and it's currently broken on mobile web — the August responsive-design pass touched the dashboard tabs and tables but didn't reach this component.
- **🟡 MEDIUM — Razorpay checkout logic is implemented three times, inconsistently.** `Pricing.jsx`, `Subscription.jsx`, `PremiumUpgradeModal.jsx`. Each page independently loads the Razorpay script and opens its own checkout. Only `PremiumUpgradeModal.jsx` re-syncs plan state and handles `payment.failed`; `Pricing.jsx`'s success handler just alerts and navigates without refreshing `dbUser`, so a user who upgrades from the Pricing page may still see their old (free) plan on the dashboard until the next auth refresh. None of the three handle a user simply closing the checkout modal.
- **🟡 MEDIUM — `.env.example` documents 1 of 9 required variables.** `app/frontend/.env.example`. Only `REACT_APP_BACKEND_URL` is listed. Seven Firebase variables and `REACT_APP_RAZORPAY_KEY_ID` are read by the code but absent from the template — a new environment setup would silently fail auth and payments with no clue why.
- **⚪ LOW — No forgot-password flow.** `pages/Auth/Login.jsx`. `sendPasswordResetEmail` is imported and exported from `lib/firebase.js` but never called from any UI — password reset appears to be dead code waiting for a "Forgot password?" link.
- **⚪ LOW — Auth pages use browser `alert()` instead of the app's toast system.** `Login.jsx`, `Register.jsx`, `Pricing.jsx`. Everywhere else in the app, errors surface as a `sonner` toast. These three use native `alert()`, which is jarring and blocks the thread — cosmetic, but worth normalizing.

---

## Mobile app — Flutter

Riverpod throughout, `go_router` for the two top-level auth routes, Dio for networking. Measured against the project's own two design documents (`LEDGER_MOBILE_FRONTEND_DESIGN_PLAN_V3.md` for functional scope, `V5` for the visual/interaction system). The honest read: **this is a working app, not a scaffold** — real CRUD, real charts, a real AI import pipeline, all hitting the live backend — but it's built to roughly its functional spec and largely skips the tactile "delight" layer V5 asks for, plus two features the web app treats as flagship.

### Feature completeness against the design spec

| Area | Status | Est. |
|---|---|---|
| Auth | Email/Google sign-in works; no PIN/biometric lock, no password reset | ~85% |
| Home / Dashboard | Hero balance card + activity feed built; AI action carousel and "smart alert" banner from the spec are absent | ~65% |
| Analytics | Most complete screen — real KPIs, bar/pie/line charts on live data; touch-scrub interactivity disabled | ~80% |
| Activity / Entries | Full CRUD with swipe gestures; search bar in the header is decorative only | ~80% |
| IOUs / Debts | Full CRUD + settle; no partial-settlement slider despite the backend and spec both supporting it | ~75% |
| KOIN chat | Functions as a plain chatbot; the spec's structured "action confirmation card" for write-actions isn't built | ~65% |
| Reports / Subscription | Export & premium checkout work; PDF invoices and billing history aren't called at all | ~55% |
| Settings / Profile | Complete | ~85% |

### Platform readiness

- **🟠 HIGH — iOS cannot run — Firebase never initializes.** `ios/Runner/`. `firebase.json` declares an iOS app ID, but the actual `GoogleService-Info.plist` is missing from the repo entirely. Since every API call authenticates via a Firebase ID token, this isn't a cosmetic gap — the login screen itself cannot function on iOS until this file is added from the Firebase console.
- **🟡 MEDIUM — Backend URL is hardcoded to production, no dev/staging switch.** `core/network/api_client.dart`. Every build — including local debug builds — talks directly to `ledger-finance-tracker-backend.onrender.com`. There's no `--dart-define` or flavor setup, so testing against a local backend means editing source. Worth a simple build-config split before this scales past one developer.
- **🟡 MEDIUM — IOUs aren't actually scope-isolated.** `app/backend/app/debts/routes.py`. The mobile app sends a `workspace` query param on `GET /debts`, implying Personal/Business separation — but the backend's debt model has no `workspace`/`scope` field at all and ignores the param, returning all of a user's debts regardless of workspace. This is a backend gap the mobile UI is quietly papering over; it contradicts the design spec's explicit rule that every query must respect the active workspace.

### Bugs found in the app itself

- **🟠 HIGH — New-entry sheet always defaults to "Personal," even in Business workspace.** `features/entries/add_entry_sheet.dart:41`. `ProviderContainer().read(workspaceProvider)` spins up a brand-new, disconnected Riverpod container instead of using the widget's own `ref` — so it always reads that container's default (Personal), never the user's actual selection. The user can still flip the toggle manually, so nothing is silently miscategorized, but the default is wrong every time a user is in Business mode. One-line fix: `ref.read(workspaceProvider)`.
- **🟡 MEDIUM — Trial countdown on the Home screen is a hardcoded string.** `features/dashboard/screens/home_screen.dart`. Literally shows "36 days remaining on trial" for every user regardless of their real trial state — even though the correct entitlement logic already exists and is used correctly on the Profile screen (`core/utils/premium.dart`). This is a one-line swap to the real value, but as-is it's actively misleading users about their account status.
- **⚪ LOW — Dead screens from a prior dashboard architecture.** `overview_section.dart`, `tabs/monthly_summary_tab.dart`, `tabs/yearly_summary_tab.dart`. Not imported anywhere in the app — leftovers from before the Home/Analytics/Activity/More bottom-nav replaced an earlier tabbed layout. Safe to delete; also means there's currently no dedicated Yearly Summary screen on mobile even though the data layer supports it.
- **⚪ LOW — Two inert UI elements.** `home_screen.dart` · `activity_screen.dart`. "See all" button next to Recent Transactions has an empty `onPressed`. The Activity screen's search field has no controller — it's decorative and filters nothing.
- **✅ `flutter analyze` is clean.** 25 findings, all info/warning level (unused imports, one unused method) — zero compile-breaking or correctness-critical static issues. The codebase is in good static health even where features are incomplete.

---

## How web and mobile actually connect

Both clients are genuinely independent consumers of the same backend — there's no shared code between them, which is expected (React vs. Flutter), but worth stating plainly since it means every backend contract change has to be applied twice by hand.

**Shared identity, shared data, separate implementations.** Both apps authenticate the same way — Firebase ID token attached as a Bearer header, both call `POST /users/sync` on every auth-state change to keep a backend user profile in sync. A user's entries, categories, debts, and subscription state are the same regardless of which client they log data in from, since both read/write the identical MongoDB collections through the identical routes.

**Route coverage matches; feature coverage doesn't.** Every mobile network call was checked against the actual backend route table — paths line up correctly (no broken/mismatched endpoints found on mobile). The gap isn't wiring, it's that mobile simply never calls two backend routes the web app depends on: `/api/invoices/download` and `/api/payments/history`.

**⚪ Business rules are duplicated across three languages.** "Is this user premium?" is implemented once in the backend (`subscriptions/checker.py`), then re-implemented in `src/lib/premium.js` on web and `core/utils/premium.dart` on mobile. Both client copies currently agree with the backend — but there's no shared source of truth, so a future change to trial/plan rules has to be replicated correctly in three places or the clients will silently disagree with the server about what a user is entitled to.

---

## Feature parity — web vs. mobile

Against the feature set the README markets.

| Feature | Web | Mobile |
|---|---|---|
| Personal / Business workspaces | Full | Full |
| KOIN AI chat | Full (panel overflows on mobile web) | Chat works; no action-confirmation UI |
| IOU / Debts + settlement | Full & partial settle | Full settle only, no partial |
| Receipt / statement AI import | Full | Full, with review step |
| Professional PDF invoices | Full | Not called |
| CSV / Excel / PDF export + email | Full | Full |
| Razorpay premium checkout | Full (see critical bug) | Full (same backend bug applies) |
| Payment / billing history | Full | Not called |
| Yearly FY summary view | Full | Data used in KPIs; no dedicated screen |

---

## Priority roadmap

Ordered by impact — what to fix first if time is limited.

1. **[backend · 1 line]** Add `import razorpay` to `payments/routes.py` and redeploy. Every premium upgrade and cancellation is broken without this.
2. **[backend · config]** Confirm `RAZORPAY_WEBHOOK_SECRET` is actually set on Render, and add it to `.env.example`. If unset, the webhook accepts unsigned requests.
3. **[web · CSS]** Fix the KOIN chat panel's fixed 380px width so it doesn't clip off mobile screens — it's the product's headline AI feature.
4. **[mobile · config]** Add the missing `GoogleService-Info.plist` so the iOS build can run at all.
5. **[backend · validation]** Reject non-positive amounts and unparseable dates on entry/debt creation before they corrupt summaries silently.
6. **[mobile · 1 line]** Fix the `ProviderContainer()` misuse in the add-entry sheet so new entries default to the workspace the user is actually in.
7. **[docs]** Fill in both `.env.example` files — 8/9 web vars and 5 backend vars are undocumented, which is how the webhook-secret gap happened in the first place.
8. **[mobile · feature]** Wire up PDF invoice generation and billing history on mobile — both endpoints already exist server-side, this is pure client work.
9. **[web · consistency]** Consolidate the three Razorpay checkout implementations into one shared handler so success/failure/cancel behavior stops diverging by page.
10. **[backend · dedup]** Centralize the premium/entitlement rule so web, mobile, and backend can't drift — even a shared JSON-serializable rule set the clients evaluate identically would remove the risk.

---

*Reviewed by static analysis of the working tree plus live probes against the deployed backend and frontend. No destructive actions or deploys were taken as part of this review.*
