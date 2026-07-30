# 🚀 DecisionOS 2026 — Complete Deployment & Portable Execution Guide

DecisionOS is engineered for **universal portability** and **production cloud deployment**.
This guide covers:
1. **Running on any computer/laptop** (with 0 external DB dependencies)
2. **Deploying to Cloud Production** (Vercel + Render / Railway + Groq LPU AI)
3. **AI LLM Configuration** (Groq Llama 3.3 70B Versatile)

---

## ⚡ 1. How to Run on ANY Laptop / Computer (Zero-Config)

DecisionOS runs out-of-the-box using an embedded SQLite database (`backend/decisionos_local.db`) and local filesystem storage. **No external PostgreSQL or Redis installation is required to run locally.**

### Option A: One-Command Docker Compose (Recommended)
If you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed:
```bash
git clone https://github.com/Shivansh191005/DecisionOS.git
cd DecisionOS
docker compose up --build
```
* Frontend: **http://localhost:3000**
* Backend API & Swagger Docs: **http://localhost:8000/docs**

### Option B: Local Developer Mode (Node.js + Python 3.10+)

#### 1. Start Backend API Server
```bash
cd backend
python -m venv .venv
# On Windows: .venv\Scripts\activate
# On Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Start Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## 🔑 2. Supercharging AI with Groq (Llama 3.3 70B LPUs)

DecisionOS includes native integration with **Groq LPUs** for lightning-fast Generative AI in **Module 6 (Ask Data / NLQ)** and **Module 9 (Executive Briefings & Q&A Assistant)**.

1. Your Groq API key is configured in `backend/app/core/config.py` (`GROQ_API_KEY`).
2. Alternatively, set it as an environment variable:
   ```bash
   export GROQ_API_KEY="gsk_your_groq_api_key_here"
   ```
3. **Offline Resilience**: If `GROQ_API_KEY` is missing or unreachable, DecisionOS automatically falls back to deterministic DuckDB SQL synthesis so the application never breaks.

---

## ☁️ 3. Cloud Production Deployment Blueprint

### A. Deploy Frontend to Vercel (Free & Instant)
1. Go to **[vercel.com/new](https://vercel.com/new)** and connect your GitHub repository (`Shivansh191005/DecisionOS`).
2. Set the **Root Directory** to `frontend`.
3. Add the following **Environment Variable**:
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://your-backend-app.onrender.com/api/v1` |
4. Click **Deploy**. Your frontend is live!

### B. Deploy Backend to Render.com or Railway.app (Free / Serverless)
1. Go to **[render.com](https://render.com)** and select **New Web Service** -> Select GitHub repo `Shivansh191005/DecisionOS`.
2. Set **Root Directory** to `backend`.
3. Set **Runtime** to `Docker` (using our `docker/backend.Dockerfile`).
4. Add the following **Environment Variables** in Render:
   | Key | Value |
   |---|---|
   | `GROQ_API_KEY` | `gsk_your_groq_api_key_here` |
   | `SECRET_KEY` | `generate-a-secure-random-32-char-string` |
   | `ENVIRONMENT` | `production` |
   | `CORS_ORIGINS` | `https://your-frontend-app.vercel.app` |
5. Click **Create Web Service**.

### C. Cloud Database (Optional for Cloud Multi-User Persistence)
To share persistent datasets across multiple team members in production:
1. Create a free serverless PostgreSQL database on **[Neon.tech](https://neon.tech)**.
2. Copy the Postgres connection string and add it as `DATABASE_URL` in your Render backend settings:
   ```env
   DATABASE_URL="postgresql+asyncpg://user:password@ep-xxxx.us-east-2.aws.neon.tech/decisionos"
   ```

---

## 🧪 4. Verifying Production Deployment

1. Visit your Vercel URL (e.g. `https://decisionos.vercel.app`).
2. Go to **Ask Data Studio (Module 6)** and type: *"What region generates the highest revenue?"* -> Verify that Llama 3.3 70B returns the SQL query and an executive answer in `< 2 seconds`.
3. Go to **Executive Co-Pilot Studio (Module 9)** and ask a strategic question in the Co-Pilot Chat -> Verify evidence-based executive recommendations!
