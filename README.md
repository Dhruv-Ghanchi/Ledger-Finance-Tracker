# 💸 Ledger – The Intelligent Personal & Business Finance Tracker

**Ledger** is a next-generation, AI-powered SaaS platform designed to effortlessly manage your personal and business finances.  
Moving beyond traditional manual entry, Ledger leverages advanced Artificial Intelligence to automate data extraction, provide conversational financial insights, and generate professional invoices, all wrapped in a beautifully modern interface.

---

## 🔗 Live Demo

- **Frontend**: [https://ledger-dhruv-ghanchi.vercel.app](https://ledger-dhruv-ghanchi.vercel.app)  
- **Backend API**: [https://ledger-finance-tracker-backend.onrender.com](https://ledger-finance-tracker-backend.onrender.com)

---

## ✨ Why Choose Ledger?

Ledger goes beyond standard dashboards by integrating intelligent automation directly into your financial workflow.

### 🤖 AI-Powered Capabilities (Premium)
- **Nova AI Co-pilot**: Chat with your personalized AI assistant. Ask questions like *"How much did I spend on food this month?"* or *"Log a $50 business travel expense"* and watch Nova instantly analyze your data or log entries for you.
- **Smart Receipt & Invoice Extraction**: Simply upload a photo of a receipt or a PDF statement. Our AI instantly extracts the date, amount, category, and vendor, turning unstructured images into perfectly categorized financial data.
- **Professional PDF Generation**: Instantly generate and download beautiful, itemized PDF invoices and financial statements with a single click.

### 💼 Core Financial Tracking
- **Dual Workspace Scope**: Switch seamlessly between **Personal** and **Business** workspaces to keep your finances strictly separated but easily accessible.
- **Intuitive Dashboards**: Visualize your cash flow with dynamic Recharts (Income vs. Expense bars, Category breakdowns, and Net Trend lines).
- **Financial Year Alignment**: Native support for the Indian Financial Year (April–March) for accurate tax-season reporting.
- **Custom Categorization**: Start with 11 smart default categories, and create unlimited custom categories tailored to your life.
- **Flexible Exports**: One-click exports of your filtered financial data to CSV or Excel (.xlsx).

### 🚀 Seamless SaaS Experience
- **60-Day Premium Trial**: All new users receive a 60-day free trial with full access to all AI and premium features.
- **Razorpay Integration**: Frictionless upgrades to Monthly or Yearly premium plans.
- **Multi-User Security**: Secure Google OAuth and Email/Password authentication powered by Firebase.

---

## 🧰 Tech Stack

| Layer       | Technology |
|-------------|------------|
| **Frontend** | React 19, Tailwind CSS, shadcn/ui, Recharts, Firebase Auth, Razorpay SDK |
| **Backend**  | FastAPI (Python 3.11+), Motor (async MongoDB driver), Firebase Admin, Google Gemini AI |
| **Database** | MongoDB (Atlas or local) |
| **Deployment** | Render (backend), Vercel (frontend), MongoDB Atlas (database) |
| **AI Tools** | Serena MCP (Semantic IDE code analysis) & Ponytail (minimal code generation) |

---

## 🚀 Getting Started (Development)

### 1. Prerequisites
- **Node.js** (v18+) and **npm** / **yarn**
- **Python** (3.11+) and **pip**
- **MongoDB** (local or Atlas account)
- **Firebase** Project (for Auth credentials)
- **Razorpay** Account (for Payment keys)
- **Google Gemini API Key** (for AI features)

### 2. Backend Setup
```bash
cd app/backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```
Edit `.env` with your MongoDB connection string, Firebase Admin credentials (JSON stringified), Razorpay API keys, and Gemini API key.  
Then run:
```bash
uvicorn main:app --reload --port 8000
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

## 📖 How to Use Ledger

1. **Sign Up**: Create an account via Google or Email to start your 60-day free trial.
2. **Log Transactions**: 
   - *Manual*: Click "Add Entry", select your scope (Personal/Business), and enter the details.
   - *AI Import*: Click "Import Receipt", upload a photo of your bill, and let the AI fill out the form for you.
3. **Chat with Nova**: Click the AI Assistant button in the bottom right corner to ask questions about your spending trends or to log expenses conversationally.
4. **Generate Reports**: Use the "Export" button on the dashboard to download CSVs, or generate professional PDF statements directly from the Yearly Summary tab.
5. **Upgrade**: Once your trial expires, visit the Pricing page to seamlessly subscribe via Razorpay.

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
- **Google Gemini** for powering the Nova AI features
- **Serena MCP & Ponytail** for accelerating agentic AI development.

---

## 👤 Author

**Dhruv Chandrakant Ghanchi**

- GitHub: [Dhruv-Ghanchi](https://github.com/Dhruv-Ghanchi)
- LinkedIn: [dhruv-ghanchi-9b0180371](https://www.linkedin.com/in/dhruv-ghanchi-9b0180371/)

---

Made with ❤️ for easier financial tracking.
