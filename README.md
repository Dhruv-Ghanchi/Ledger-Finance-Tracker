  # Ledger – Personal & Business Finance Tracker

  **Ledger** is a full‑stack web application that serves as a modern, multi-user SaaS platform for managing personal and business finances.  
  It provides a clean, intuitive interface to log income and expenses, automatically computes monthly/yearly summaries, offers data exports, and includes premium subscription plans.

  ---

  ## 🔗 Live Demo

  - **Frontend**: [https://ledger-dhruv-ghanchi.vercel.app](https://ledger-dhruv-ghanchi.vercel.app)  
  - **Backend API**: [https://ledger-finance-tracker-backend.onrender.com](https://ledger-finance-tracker-backend.onrender.com)

  ---

  ## ✨ Features

  - 🔐 **Multi-User Authentication** – Secure sign-up and login via Email/Password or Google (powered by Firebase).
  - 🚀 **SaaS Landing Page & Pricing** – Clean public landing page with Razorpay integration for Monthly and Yearly premium subscriptions.
  - 📊 **Dual scope**: log entries as **Personal** or **Business** with separate summaries.
  - 💰 **Income / Expense tracking** with 11 pre‑loaded default categories per user (custom categories can be added/deleted).
  - 📅 **Indian Financial Year** (April–March) – view monthly and yearly summaries in FY order.
  - 📈 **Visual insights** – Recharts dashboard with:
    - Monthly income vs expense bar chart
    - Expense breakdown pie chart
    - Yearly net trend line chart
  - 📤 **Export** to CSV or Excel (.xlsx) with filters for FY, year, month, or scope.
  - 🌐 **Cloud‑native** – API built with FastAPI, data stored securely in MongoDB Atlas.

  ---

  ## 🧰 Tech Stack

  | Layer       | Technology |
  |-------------|------------|
  | **Frontend** | React 19, Tailwind CSS, shadcn/ui, Recharts, Firebase Auth, Razorpay SDK |
  | **Backend**  | FastAPI (Python 3.11+), Motor (async MongoDB driver), Firebase Admin, Razorpay SDK |
  | **Database** | MongoDB (Atlas or local) |
  | **Deployment** | Render (backend), Vercel (frontend), MongoDB Atlas (database) |
  | **AI Tools** | Serena MCP (Semantic IDE code analysis) & Ponytail (minimal code generation) |

  ---

  ## 📁 Project Structure

  ```
  Ledger/
  ├── app/
  │   ├── backend/
  │   │   ├── app/                   # FastAPI routes (auth, categories, entries, payments)
  │   │   ├── server.py              # Application entrypoint
  │   │   ├── requirements.txt       # Python dependencies
  │   │   └── .env.example           # Environment template
  │   ├── frontend/
  │   │   ├── public/                # Static assets
  │   │   ├── src/
  │   │   │   ├── components/        # React components (UI + feature)
  │   │   │   ├── context/           # Auth context
  │   │   │   ├── pages/             # Landing, Dashboard, Pricing, Login, Register
  │   │   │   ├── App.js             # Root routing
  │   │   │   └── index.css          # Global styles + Tailwind
  │   │   ├── package.json
  │   │   └── tailwind.config.js
  │   └── .gitignore
  └── README.md
  ```

  ---

  ## 🚀 Getting Started (Development)

  ### 1. Prerequisites

  - **Node.js** (v18+) and **npm** / **yarn**
  - **Python** (3.11+) and **pip**
  - **MongoDB** (local or Atlas account)
  - **Firebase** Project (for Auth credentials)
  - **Razorpay** Account (for Payment keys)

  ### 2. Backend Setup

  ```bash
  cd app/backend
  python -m venv venv
  source venv/bin/activate   # Windows: venv\Scripts\activate
  pip install -r requirements.txt
  cp .env.example .env
  ```

  Edit `.env` with your MongoDB connection string, Firebase Admin credentials (JSON stringified), and Razorpay API keys.  
  Then run:

  ```bash
  uvicorn server:app --reload --port 8000
  ```

  ### 3. Frontend Setup

  ```bash
  cd app/frontend
  cp .env.example .env
  ```

  Add your Firebase client config, Razorpay Key ID, and Backend URL to `.env`.  
  Install dependencies:

  ```bash
  npm install --legacy-peer-deps
  npm start
  ```

  ---

  ## 🔐 Environment Variables

  ### Backend (`.env`)

  | Variable | Description |
  |----------|-------------|
  | `MONGO_URL` | MongoDB connection string (local or Atlas) |
  | `DB_NAME` | Database name (e.g., `finance_tracker`) |
  | `CORS_ORIGINS` | Comma‑separated allowed frontend origins |
  | `FIREBASE_CREDENTIALS_JSON` | Firebase Admin SDK service account JSON (minified) |
  | `RAZORPAY_KEY_ID` | Razorpay Key ID |
  | `RAZORPAY_KEY_SECRET` | Razorpay Key Secret |
  | `RAZORPAY_PLAN_MONTHLY` | Razorpay Monthly Plan ID |
  | `RAZORPAY_PLAN_YEARLY` | Razorpay Yearly Plan ID |

  ### Frontend (`.env`)

  | Variable | Description |
  |----------|-------------|
  | `REACT_APP_BACKEND_URL` | Full URL of the backend API |
  | `REACT_APP_FIREBASE_API_KEY` | Firebase API Key |
  | `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
  | `REACT_APP_FIREBASE_PROJECT_ID` | Firebase Project ID |
  | `REACT_APP_RAZORPAY_KEY_ID` | Razorpay Key ID |

  ---

  ## 🌍 Production Deployment

  ### 1. Backend (Render)
  - Deploy as a Web Service. Ensure the build command installs requirements and start command runs `uvicorn`.
  - Inject all environment variables including the stringified Firebase JSON.

  ### 2. Frontend (Vercel)
  - Deploy the React app and ensure all `REACT_APP_` environment variables are set before the build step.

  ---

  ## 📖 User Guide

  1. **Visit the Platform**: Open the live link to view the Landing Page.
  2. **Sign In**: Click "Login" or "Get Started" to authenticate via Google or Email/Password.
  3. **Dashboard**:
    - **Add Entry**: Click the "Add Entry" button, select scope (Personal/Business), type (Income/Expense), fill amount, date, category, and optional note.
    - **Daily Entries** tab: view, search, edit, or delete entries.
    - **Monthly / Yearly Summary**: See comprehensive breakdowns per scope and category.
    - **Export**: Download data as CSV or Excel.
  4. **Manage Categories**: Click the three‑dots menu → "Manage Categories" to add or delete custom categories.
  5. **Upgrade**: Visit the Pricing page to subscribe to a Monthly or Yearly premium plan via Razorpay.

  ---

  ## 📦 Database Schema

  ### `users`
  | Field | Type | Description |
  |-------|------|-------------|
  | `firebase_uid` | string | Unique Firebase ID |
  | `email` | string | User email |
  | `name` | string | User display name |
  | `razorpay_customer_id`| string | External payment customer ID |
  | `plan` | string | `free`, `monthly`, or `yearly` |

  ### `entries`
  | Field     | Type   | Description |
  |-----------|--------|-------------|
  | `id`      | string | UUID       |
  | `user_id` | string | Owner's Firebase UID |
  | `date`    | string | YYYY-MM-DD |
  | `amount`  | float  |            |
  | `type`    | string | `income` or `expense` |
  | `scope`   | string | `personal` or `business` |

  ### `categories`
  | Field      | Type    | Description |
  |------------|---------|-------------|
  | `id`       | string  | UUID       |
  | `user_id`  | string  | Owner's Firebase UID |
  | `name`     | string  |            |
  | `type`     | string  | `income` or `expense` |

  ### `subscriptions`
  | Field | Type | Description |
  |-------|------|-------------|
  | `id` | string | UUID |
  | `user_id` | string | Owner's Firebase UID |
  | `razorpay_subscription_id` | string | External subscription ID |
  | `status` | string | `active`, `cancelled`, etc. |

  ---

  ## 🤝 Contributing

  This project welcomes contributions. Feel free to fork and adapt. If you find a bug or have an idea, open an issue or a pull request.

  ---

  ## 🙏 Acknowledgements

  - **[shadcn/ui](https://ui.shadcn.com)** for beautiful components  
  - **[Recharts](https://recharts.org)** for charts  
  - **[FastAPI](https://fastapi.tiangolo.com)** for the robust backend  
  - **[Firebase](https://firebase.google.com)** for robust multi-user authentication
  - **[Razorpay](https://razorpay.com)** for smooth payment gateways
  - **Serena MCP & Ponytail** for accelerating agentic AI development.

  ---

  ## 👤 Author

  **Dhruv Chandrakant Ghanchi**

  - GitHub: [Dhruv-Ghanchi](https://github.com/Dhruv-Ghanchi)
  - LinkedIn: [dhruv-ghanchi-9b0180371](https://www.linkedin.com/in/dhruv-ghanchi-9b0180371/)

  ---

  Made with ❤️ for easier financial tracking.
