# 🏛️ NagrikAI — Intelligent Government Services Platform

> Powered by **IBM Granite AI (watsonx)** · Built with **FastAPI + Next.js + TypeScript**

---

## ▶️ Quick Start

### Step 1 — Clone the repo
```bash
git clone https://github.com/OmegaAB2006/NagrikAI.git
cd NagrikAI
```

### Step 2 — Start the Backend
```bash
cd backend
pip install -r requirements.txt
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Step 3 — Start the Frontend *(new terminal)*
```bash
cd frontend
npm install
npm run dev
```

### Step 4 — Open in browser

| URL | Page |
|---|---|
| http://localhost:3000 | 🏠 Landing page |
| http://localhost:3000/citizen | 💬 Citizen AI Assistant |
| http://localhost:3000/admin | ⚙️ Admin Dashboard |
| http://localhost:8000/docs | 📖 API Docs (Swagger) |

### Admin credentials
```
Email:    admin@nagrikai.gov.in
Password: Admin@NagrikAI2024
```

---

## What is NagrikAI?

NagrikAI is a secure, intelligent, multilingual AI platform that helps Indian citizens discover government schemes, check their eligibility, prepare documents, and track applications — all through a single conversational interface.

The system uses **IBM Granite AI** to understand natural language questions, personalise answers based on the citizen's profile, and provide step-by-step guidance with direct links to official government portals.

---

## What NagrikAI Does

### For Citizens
| Capability | Description |
|---|---|
| **Scheme Discovery** | Ask in plain language — "What schemes can I get as an OBC student in Karnataka?" — and get relevant central and state government schemes |
| **Eligibility Assessment** | Your profile (age, income, category, state, occupation) is compared against scheme criteria and a preliminary eligibility verdict is given |
| **Document Guidance** | Generates personalised document checklists; uploaded documents are fed into AI reasoning for better recommendations |
| **Application Assistance** | Step-by-step guidance with clickable links to the correct official government portals |
| **Image Analysis** | Upload a photo of any government document, form, notice, or ID card for instant AI analysis |
| **Application Tracking** | Save and track your government scheme applications |
| **Multilingual Support** | Full UI and AI responses in English, Hindi (हिंदी), and Kannada (ಕನ್ನಡ) |

### For Administrators
| Capability | Description |
|---|---|
| **Agent Monitoring** | Live view of every AI execution — latency, token usage, success rate |
| **LLM Evaluation** | Accuracy, precision, recall, F1 scores against test datasets |
| **Guardrail Monitoring** | Dashboard of blocked inputs, prompt injection attempts, security events |
| **Cost Analytics** | Token consumption and estimated API cost per workflow |
| **Audit Logs** | Records of every important AI decision and security event |
| **Human Approvals** | Review queue for consequential actions |

---

## How the AI Works

Every request builds a structured prompt sent to IBM Granite containing:

1. **Citizen profile** — state, age, income, occupation, education, category, disability/BPL flags (from saved profile)
2. **Available documents** — names of documents the user has uploaded
3. **Conversation history** — last 10 message turns so follow-up questions work naturally
4. **Language instruction** — AI responds in English, Hindi, or Kannada based on preference
5. **Discovered scheme context** — scheme names and eligibility found during the request

This means when you ask *"What schemes am I eligible for?"*, the AI already knows your complete profile and gives a personalised answer — not a generic one.

---

## Request Workflow

```
User sends message
       │
       ▼
INPUT GUARDRAILS
(prompt injection, PII, format validation)
       │
       ▼
User profile loaded from database
(state, age, income, occupation, category, docs)
       │
       ▼
Intent classified
(scholarship / scheme_discovery / eligibility /
 document_help / application_help / general_query)
       │
       ▼
Relevant schemes found + eligibility checked
       │
       ▼
System prompt assembled
(profile + documents + history + scheme context)
       │
       ▼
IBM Granite generates personalised response
       │
       ▼
OUTPUT GUARDRAILS
(hallucination check, PII filter, schema validation)
       │
       ▼
Response returned with:
  • AI answer (URLs rendered as clickable links)
  • Scheme cards with official portal links
  • Eligibility assessment cards
  • Next steps
```

---

## AI Guardrails

| Stage | What is checked |
|---|---|
| **Input** | Prompt injection, malicious content, PII (Aadhaar, PAN, phone, bank), format and length |
| **Output** | Hallucination, sensitive data leakage, schema validation, toxicity |
| **Operational** | Token budget limits, execution timeouts, iteration caps, loop detection |
| **Human-in-the-loop** | Application submission and data deletion require explicit user confirmation |

---

## Tech Stack

### Backend
| Component | Technology |
|---|---|
| API framework | **FastAPI** (Python 3.9) |
| ORM | **SQLAlchemy** (async) |
| Database | **SQLite** (dev) / PostgreSQL-compatible |
| Authentication | **JWT** + **bcrypt** |
| AI | **IBM watsonx** REST API |
| Validation | **Pydantic v2** |

### Frontend
| Component | Technology |
|---|---|
| Framework | **Next.js 15** (App Router) |
| Language | **TypeScript** |
| State management | **Zustand** |
| Multilingual | EN / हिंदी / ಕನ್ನಡ built-in translation |

---

## 🔐 Admin Login

```
Email:    admin@nagrikai.gov.in
Password: Admin@NagrikAI2024
```

The admin dashboard shows:
- AI request statistics and latency
- LLM evaluation metrics
- Guardrail events and security logs
- Token usage and cost analytics
- Workflow execution traces
- Human approval queue

---

## Future Roadmap

- [ ] Real-time application status from DigiLocker / UMANG APIs
- [ ] Aadhaar-based eKYC
- [ ] Automatic document OCR (extract info from uploaded Aadhaar/PAN)
- [ ] Push notifications for application deadlines
- [ ] Voice input (Web Speech API)
- [ ] Offline PWA for low-connectivity areas
- [ ] myscheme.gov.in official API integration

---

## Disclaimer

> NagrikAI provides **preliminary guidance only**. All eligibility assessments are AI-generated estimates and must be verified against official government sources before taking any action.
>
> Official portals: [myscheme.gov.in](https://www.myscheme.gov.in) · [india.gov.in](https://www.india.gov.in) · [services.india.gov.in](https://services.india.gov.in)

---

*© 2024 NagrikAI · Powered by IBM Granite AI (watsonx)*
