# Border Identity Intelligence System (BIIS)

**SIH26188 — AI-Based Fake Identity & Document Screening System**

Ministry of Home Affairs | Smart India Hackathon 2026 Prototype

## Overview

AI-assisted multi-signal identity and document screening platform for border-security personnel. The system performs explainable risk assessment — not binary fake/genuine verdicts.

**Core flow:** Document → AI analysis → evidence → risk → identity/encounter intelligence → officer decision → tamper-evident audit

## Demo Access

```
Officer ID: DEMO-SSB-001 (or any ID)
Password:   None / Optional
```
Click **"Enter Demo Mode (No Password)"** for 1-click instant login!


## How to Run the Prototype

### ⚡ 1-Click Launch (Easiest Way)

Simply double-click **`run.bat`** in the project folder, or run in terminal:

```cmd
.\run.bat
```

This automatically:
1. Starts the **FastAPI Backend** on `http://localhost:8000`
2. Starts the **React Frontend** on `http://localhost:5173`
3. Opens **http://localhost:5173** directly in your default web browser!

---

### Manual Launch Options

### Option 2: Full-Stack Web Application (FastAPI Backend + React Frontend)

#### 1. Start the Backend Server (FastAPI)

```bash
cd backend

# Create & activate virtual environment (optional but recommended)
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# Create upload directory & run FastAPI server
mkdir -p data/uploads
uvicorn app.main:app --reload --port 8000
```
- Backend running at: **http://localhost:8000**
- Interactive Swagger API docs: **http://localhost:8000/docs**

#### 2. Start the Frontend Application (React + Vite)

Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
- Frontend app running at: **http://localhost:5173**

---

### Option 3: Docker Compose (All-in-One Containerized Setup)

If you have Docker installed, you can spin up both the FastAPI backend and React frontend together with a single command:

```bash
docker-compose up --build
```
- Frontend: **http://localhost:5173**
- Backend API: **http://localhost:8000**

---

### Running Automated Tests

To execute unit tests for the backend services and forensic algorithms:

```bash
cd backend
pip install -r requirements.txt
pytest ../tests -v
```

## Demo Scenarios

On the **Document Screening** page, use the three scenario buttons:

| Scenario | Expected Result |
|----------|----------------|
| **A — Normal Document** | LOW risk, consistent template, MRZ valid |
| **B — Tampered Document** | HIGH risk (82/100), manipulation indicators with clickable region highlights |
| **C — Identity Switching** | CRITICAL alert, same biometric ref with different identity refs |

## Architecture

```
Document/Person → Quality Check → Classification → Region Detection
    → OCR → Forensics → MRZ Validation → Face Match (optional)
    → Encounter Analysis → Fraud Patterns → Risk Engine → Officer Review → Audit Chain
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, Pydantic |
| Database | SQLite (PostgreSQL-ready design) |
| CV/AI | OpenCV (optional), PaddleOCR interface, Demo Mode fallback |

### Modular Services

- `OCRService` — PaddleOCR interface with deterministic demo outputs
- `ForgeryAnalyzer` — Document forensics
- `DocumentValidator` — Passport/PAN/Licence MRZ & format checks
- `FaceVerifier` — AI-assisted similarity (not definitive proof)
- `EncounterService` — Demo authorized encounter database
- `RiskEngine` — Configurable evidence-fusion engine
- `AuditService` — SHA-256 tamper-evident hash chain

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Officer authentication |
| GET | `/api/dashboard` | Dashboard statistics |
| POST | `/api/documents/analyze` | Full document analysis pipeline |
| POST | `/api/documents/ocr` | OCR extraction only |
| POST | `/api/documents/forensics` | Forensic analysis only |
| POST | `/api/face/verify` | Face similarity check |
| GET | `/api/encounters` | List encounters |
| GET | `/api/identity/{id}/timeline` | Identity timeline |
| GET | `/api/identity/{id}/graph` | Relationship graph |
| GET | `/api/fraud-patterns` | Fraud pattern intelligence |
| POST | `/api/reviews` | Officer review decision |
| GET | `/api/audit` | List audit records |
| GET | `/api/audit/{id}` | Single audit record |
| POST | `/api/audit/verify` | Verify hash chain integrity |

Interactive API docs: **http://localhost:8000/docs**

## Real vs Demo Components

| Component | Mode | Notes |
|-----------|------|-------|
| Authentication | Demo | Fixed demo credentials |
| Encounter database | Demo | Fictional DEMO / AUTHORIZED DATA SOURCE |
| OCR | Demo | Deterministic outputs; PaddleOCR when `DEMO_MODE=false` |
| Forensics | Demo/Real | OpenCV basic checks when available; demo indicators otherwise |
| Face verification | Demo | Deterministic similarity scores |
| Government DB lookup | **Not implemented** | Mock layer designed for future authorized API swap |
| Audit chain | Real | SHA-256 hash chain, fully functional |

## Known Limitations

- No access to Aadhaar, passport, SSB, police, or immigration databases
- ML models run in DEMO MODE by default — deterministic outputs for demonstration
- Face matching is AI-assisted similarity, not definitive identity proof
- All personal data is fictional demo data
- Blockchain uses local hash chain abstraction (permissioned blockchain ready)

## Future Integration Points

- Authorized government identity verification APIs (replace mock encounter DB)
- Production PaddleOCR / YOLO models for region detection
- Permissioned blockchain for audit records
- PostgreSQL for production deployment
- Hardware document scanner integration

## Security & Privacy

- Document hashes stored in audit chain, not raw PII on-chain
- Upload type and size validation
- JWT authentication for API access
- Environment variables for secrets (see `.env.example`)

## License

Prototype for SIH26188 demonstration purposes.
