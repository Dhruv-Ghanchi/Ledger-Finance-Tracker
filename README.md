# Ledger – Personal & Business Finance Tracker

**Ledger** is a full‑stack web application that replaces the traditional Excel workbook for managing personal and business finances.  
Built for a single user (like your father), it provides a clean, intuitive interface to log income and expenses, automatically computes monthly/yearly summaries, and exports data to Excel/CSV.

---

## 🔗 Live Demo

- **Frontend**: [https://ledger-dhruv-ghanchi.netlify.app](https://ledger-dhruv-ghanchi.netlify.app)  
- **Backend API**: [https://ledger-finance-tracker-backend.onrender.com](https://ledger-finance-tracker-backend.onrender.com)

---

## ✨ Features

- 🔐 **PIN‑based authentication** – set a 4‑8 digit PIN on first launch; session stored securely.
- 📊 **Dual scope**: log entries as **Personal** or **Business** with separate summaries.
- 💰 **Income / Expense tracking** with 20+ pre‑loaded expense categories and 10 income categories (custom categories can be added/deleted).
- 📅 **Indian Financial Year** (April–March) – view monthly and yearly summaries in FY order.
- 📈 **Visual insights** – Recharts dashboard with:
  - Monthly income vs expense bar chart
  - Expense breakdown pie chart
  - Yearly net trend line chart
- 📤 **Export** to CSV or Excel (.xlsx) with filters for FY, year, month, or scope.
- 🌐 **Cloud‑native** – data stored in MongoDB Atlas, accessible from anywhere.

---

## 🧰 Tech Stack

| Layer       | Technology |
|-------------|------------|
| **Frontend** | React 19, Tailwind CSS, shadcn/ui, Recharts, React Hook Form, Axios |
| **Backend**  | FastAPI (Python 3.11+), Motor (async MongoDB driver), bcrypt, PyJWT |
| **Database** | MongoDB (Atlas or local) |
| **Deployment** | Render (backend), Netlify (frontend), MongoDB Atlas (database) |

---

## 📁 Project Structure

```
Ledger/
├── app/
│   ├── backend/
│   │   ├── server.py              # FastAPI main application
│   │   ├── requirements.txt       # Python dependencies
│   │   └── .env.example           # Environment template
│   ├── frontend/
│   │   ├── public/                # Static assets
│   │   ├── src/
│   │   │   ├── components/        # React components (UI + feature)
│   │   │   ├── context/           # Auth context
│   │   │   ├── lib/               # Utilities (API, formatting, FY helpers)
│   │   │   ├── pages/             # Dashboard & PinLock
│   │   │   ├── App.js             # Root component
│   │   │   ├── index.js           # Entry point
│   │   │   └── index.css          # Global styles + Tailwind
│   │   ├── package.json
│   │   ├── tailwind.config.js
│   │   └── craco.config.js
│   ├── memory/                    # Documentation & screenshots
│   └── .gitignore
├── README.md
└── LICENSE (optional)
```

---

## 🚀 Getting Started (Development)

### 1. Prerequisites

- **Node.js** (v18+) and **npm** / **yarn**
- **Python** (3.11+) and **pip**
- **MongoDB** (local or Atlas account)

### 2. Backend Setup

```bash
cd app/backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` with your MongoDB connection string and other variables.  
Then run:

```bash
uvicorn server:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

### 3. Frontend Setup

```bash
cd app/frontend
cp .env.example .env
```

Add your backend URL to `.env` (or set it to `http://localhost:8000` during development).  
Install dependencies:

```bash
npm install --legacy-peer-deps
npm start
```

The app will open at `http://localhost:3000`.

---

## 🔐 Environment Variables

### Backend (`.env`)

| Variable | Description |
|----------|-------------|
| `MONGO_URL` | MongoDB connection string (local or Atlas) |
| `DB_NAME` | Database name (e.g., `finance_tracker`) |
| `CORS_ORIGINS` | Comma‑separated allowed frontend origins (e.g., `http://localhost:3000,https://yourapp.netlify.app`) |

### Frontend (`.env`)

| Variable | Description |
|----------|-------------|
| `REACT_APP_BACKEND_URL` | Full URL of the backend API (e.g., `http://localhost:8000` or `https://your-backend.onrender.com`) |

> **Important**: Frontend environment variables are **embedded at build time** – they must be set **before running `npm run build`**.

---

## 🌍 Production Deployment

### 1. Backend (Render)

1. Push your code to a GitHub repository.
2. On [Render](https://render.com), create a **New Web Service**, connect your repo.
3. Set:
   - **Root Directory**: `app/backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port 10000`
4. Add environment variables (`MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`).
5. Deploy – you'll get a public URL like `https://your-backend.onrender.com`.

### 2. Frontend (Netlify)

1. On [Netlify](https://netlify.com), import your GitHub repo.
2. Set:
   - **Root Directory**: `app/frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `build`
3. Add environment variable: `REACT_APP_BACKEND_URL` = your Render URL.
4. Deploy – you'll get a public URL like `https://your-app.netlify.app`.

### 3. Database (MongoDB Atlas)

- Create a free M0 cluster.
- In **Network Access**, add `0.0.0.0/0` (or your Render IP range) to allow connections.
- Copy the connection string and use it as `MONGO_URL` (ensure password is properly URL‑encoded).

---

## 📖 User Guide

1. **Open the live link** (e.g., `https://ledger-dhruv-ghanchi.netlify.app`).
2. On first visit, you'll be prompted to **set a 4‑digit PIN**. Remember it – you'll need it each time.
3. After unlocking, you'll see the **Dashboard**:
   - **Add Entry**: Click the "Add Entry" button, select scope (Personal/Business), type (Income/Expense), fill amount, date, category, and optional note.
   - **Daily Entries** tab: view, search, edit, or delete entries.
   - **Monthly Summary** tab: see income/expense breakdown per scope and category.
   - **Yearly Summary** tab: view 12‑month table for the current Financial Year.
   - **Export**: Download data as CSV or Excel (you can filter by scope).
4. **Manage Categories**: Click the three‑dots menu → "Manage Categories" to add or delete custom categories.
5. **Lock**: Use the same menu to lock the app (requires PIN again).

---

## 📦 Database Schema

### `entries`
| Field     | Type   | Description |
|-----------|--------|-------------|
| `id`      | string | UUID       |
| `date`    | string | YYYY-MM-DD |
| `amount`  | float  |            |
| `type`    | string | `income` or `expense` |
| `scope`   | string | `personal` or `business` |
| `category`| string |            |
| `note`    | string | optional   |
| `created_at` | string | ISO timestamp |

### `categories`
| Field      | Type    | Description |
|------------|---------|-------------|
| `id`       | string  | UUID       |
| `name`     | string  |            |
| `type`     | string  | `income` or `expense` |
| `is_preset`| boolean | true for seeded categories |

### `auth`
| Field | Type   | Description |
|-------|--------|-------------|
| `key` | string | `"pin"`     |
| `hash`| string | bcrypt hash |

### `sessions`
| Field        | Type   | Description |
|--------------|--------|-------------|
| `token`      | string | random session token |
| `created_at` | string | ISO timestamp |

---

## 🤝 Contributing

This is a personal project, but feel free to fork and adapt.  
If you find a bug or have an idea, open an issue or a pull request.

---

## 📄 License

This project is open‑source and available under the MIT License.

---

## 🙏 Acknowledgements

- [shadcn/ui](https://ui.shadcn.com) for beautiful components  
- [Recharts](https://recharts.org) for charts  
- [FastAPI](https://fastapi.tiangolo.com) for the robust backend  
- [Render](https://render.com) and [Netlify](https://netlify.com) for free hosting  
- [MongoDB Atlas](https://www.mongodb.com/atlas) for cloud database

---

## 👤 Author

**Dhruv Chandrakant Ghanchi**

- GitHub: [Dhruv-Ghanchi](https://github.com/Dhruv-Ghanchi)
- LinkedIn: [dhruv-ghanchi-9b0180371](https://www.linkedin.com/in/dhruv-ghanchi-9b0180371/)

---

Made with ❤️ for easier financial tracking.
