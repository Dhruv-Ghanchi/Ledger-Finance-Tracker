1. Backend

cd backend
python -m venv venv
`venv\Scripts\activate`
pip install -r requirements.txt
uvicorn server:app --reload --port 8000

2. Frontend

cd frontend
npm install
npm install --legacy-peer-deps
npm install ajv@8.12.0 --save-dev --legacy-peer-deps    #if needed
npm start