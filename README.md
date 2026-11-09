# 🏛️ NagrikAI — Intelligent Multi-Agent Government Services Platform

> Powered by **IBM Granite AI (watsonx)** · Built with **FastAPI + Next.js + TypeScript**

---

## What is NagrikAI?

NagrikAI is a secure, intelligent, multilingual AI platform that helps Indian citizens discover government schemes, check their eligibility, prepare documents, and track applications — all through a single conversational interface.

The system is built on an **Agentic AI architecture**: instead of a single chatbot, multiple specialised AI agents collaborate under a central orchestrator to give accurate, personalised, and verifiable answers.

---

## What the AI Does

### For Citizens
| Capability | Description |
|---|---|
| **Scheme Discovery** | Understands natural-language queries ("What schemes can I get as an OBC student in Karnataka?") and finds relevant central and state government schemes |
| **Eligibility Assessment** | Compares the citizen's profile (age, income, category, state, occupation) against official scheme criteria and gives a preliminary eligibility verdict |
| **Document Guidance** | Generates personalised document checklists; accepts uploaded documents (Aadhaar, PAN, income certificate, etc.) and feeds them into AI reasoning |
| **Application Assistance** | Walks users through official portal procedures step-by-step with direct clickable links to the correct government websites |
| **Image Analysis** | Accepts photos of government documents, forms, notices, or ID cards and provides AI-powered analysis and actionable guidance |
| **Application Tracking** | Maintains a record of saved applications and allows users to update status manually |
| **Multilingual Support** | Full UI and AI responses available in English, Hindi (हिंदी), and Kannada (ಕನ್ನಡ) |

### For Administrators
| Capability | Description |
|---|---|
| **Agent Monitoring** | Live view of every agent execution — latency, token usage, success rate, tool calls |
| **LLM Evaluation** | Accuracy, precision, recall, F1, semantic similarity, ROUGE, BLEU scores against labelled test datasets |
| **RAG Evaluation** | Context precision, context recall, faithfulness, answer relevancy, groundedness |
| **Guardrail Monitoring** | Real-time dashboard of prompt injection attempts, blocked inputs, redacted outputs, unauthorised tool calls |
| **Cost Analytics** | Token consumption and estimated API cost per agent, per workflow, per time period |
| **Audit Logs** | Immutable records of every important AI decision, security event, and human approval |
| **Human Approvals** | Review queue for consequential actions (application submission, document sharing, data deletion) |

---

## AI Models Used

| Purpose | Model | Provider | Notes |
|---|---|---|---|
| **Primary chat / all text reasoning** | `ibm/granite-4-h-small` | IBM watsonx (us-south) | Handles scheme discovery, eligibility, Q&A, application guidance, conversation history |
| **Image / document analysis** | `meta-llama/llama-4-maverick-17b-128e-instruct-fp8` | IBM watsonx (us-south) | Multimodal vision model; analyses uploaded document photos, ID cards, government notices |

### Authentication
Both models are accessed via **IBM IAM token exchange** — the API key is exchanged for a short-lived Bearer token automatically (refreshed every 50 minutes). No model calls are made without a valid token.

### How the AI is prompted
Every request builds a structured system prompt that includes:
1. **Role definition** — NagrikAI assistant with specific responsibilities
2. **Language instruction** — English / Hindi / Kannada based on user preference
3. **Citizen profile block** — state, age, income, occupation, education, category, disability status, BPL status (from saved profile)
4. **Available documents** — list of documents the user has uploaded this session
5. **Conversation history** — last 10 message turns for follow-up context
6. **Agent context** — scheme names / eligibility results discovered by specialist agents

---

## Multi-Agent Architecture

```
                        USER INPUT
                             │
                             ▼
                    INPUT GUARDRAILS
                    (injection, PII,
                     format checks)
                             │
                             ▼
               ┌─── ORCHESTRATOR AGENT ───┐
               │   Classifies intent,     │
               │   routes to sub-agents,  │
               │   merges results         │
               └──────────┬───────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   SCHEME DISCOVERY   ELIGIBILITY    INFORMATION
       AGENT           AGENT         VERIFICATION
   (searches official  (matches      (cross-checks
    govt schemes)      profile vs    sources,
                       criteria)     flags unverified
                                     claims)
          └───────────────┼───────────────┘
                          ▼
                   VERIFIED RESULTS
                          │
                          ▼
                 OUTPUT GUARDRAILS
                 (hallucination check,
                  PII filter, schema
                  validation)
                          │
                          ▼
                  CITIZEN DASHBOARD
                  (schemes, eligibility,
                   clickable links)
                          │
                 ┌────────┴────────┐
                 ▼                 ▼
          DOCUMENT AGENT    APPLICATION AGENT
          (checklist,        (step-by-step
           upload,            guidance,
           extraction)        portal links,
                              human approval)
                                   │
                                   ▼
                           TRACKING AGENT
                           (saves application,
                            status updates,
                            reminders)
                                   │
                                   ▼
                      OBSERVABILITY + EVALUATION
                      (traces, metrics, guardrail
                       events, cost tracking)
```

### Agent Descriptions

| Agent | Responsibility |
|---|---|
| **Orchestrator** | Receives the user request, classifies intent using keyword matching + IBM Granite, delegates to the right sub-agents, merges outputs, and generates the final personalised response |
| **Scheme Discovery** | Searches knowledge of Indian central and state government schemes matching the user's profile and query |
| **Eligibility Verification** | Compares scheme eligibility criteria against the citizen profile; returns Potentially Eligible / Not Eligible / Additional Information Required |
| **Information Verification** | Cross-checks scheme details, validates official URLs, detects unsupported claims, marks unverified information |
| **Document Assistance** | Generates document checklists; accepts uploaded images via the vision model; extracts information and highlights missing fields |
| **Application Assistance** | Provides step-by-step application guidance with direct links to official government portals |
| **Tracking Agent** | Maintains application records, distinguishes official vs user-entered status updates, reminds about deadlines |

---

## AI Guardrails

Guardrails run at every stage of the pipeline:

| Stage | Checks |
|---|---|
| **Input** | Prompt injection detection, malicious payload detection, PII handling (Aadhaar, PAN, phone, bank), inappropriate content filter, input size/format validation |
| **Output** | Hallucination detection, factual accuracy validation, sensitive data leakage prevention (no internal credentials, no other users' data), response schema validation, toxicity filter |
| **Tool execution** | Agent-level permission checks, function-call parameter validation, unauthorised action prevention |
| **Operational** | Maximum execution time per agent, token budget limits, API rate limiting, maximum iteration count, loop detection |
| **Human-in-the-loop** | Government application submission, document sharing, and data deletion require explicit user confirmation before execution |
| **Multi-agent** | Cross-agent output verification before forwarding, conflict resolution (compare evidence rather than choosing first result), context isolation (agents only see data they need) |
| **Ethical / compliance** | Bias detection in eligibility explanations, AI assessments never presented as official government decisions, audit trails for every important decision |

---

## Tech Stack

### Backend
| Component | Technology |
|---|---|
| API framework | **FastAPI** (Python 3.9) |
| ORM | **SQLAlchemy** (async) |
| Database | **SQLite** (development) / PostgreSQL-compatible |
| Authentication | **JWT** (python-jose) + **bcrypt** (passlib) |
| AI service | **IBM watsonx** via REST (`/ml/v1/text/chat`) |
| IAM auth | IBM Cloud IAM token exchange |
| Validation | **Pydantic v2** |
| Observability | In-process workflow tracer (structured event logs) |

### Frontend
| Component | Technology |
|---|---|
| Framework | **Next.js 15** (App Router) |
| Language | **TypeScript** |
| Styling | **Inline styles** (no Tailwind dependency) — full i18n support |
| State management | **Zustand** |
| Notifications | **react-hot-toast** |
| Multilingual | Full EN / हिंदी / ಕನ್ನಡ translation dictionary |

### AI / ML
| Component | Technology |
|---|---|
| Text LLM | IBM watsonx `ibm/granite-4-h-small` |
| Vision LLM | IBM watsonx `meta-llama/llama-4-maverick-17b-128e-instruct-fp8` |
| Chat API | IBM watsonx `/ml/v1/text/chat` (OpenAI-compatible message format) |
| IAM | IBM Cloud IAM (`iam.cloud.ibm.com/identity/token`) |

---

## Complete Request Workflow

```
1.  User types a message (e.g. "What schemes am I eligible for?")
2.  Frontend sends: message + language + conversation history (last 12 turns)
                  + citizen profile context + uploaded document names
3.  Backend INPUT GUARDRAILS:
      - Prompt injection check
      - PII detection
      - Format/length validation
      → If blocked: return clear user-friendly error
4.  User profile loaded from DB (state, age, income, occupation, category, etc.)
5.  ORCHESTRATOR AGENT classifies intent:
      → scholarship / scheme_discovery / eligibility / document_help
      → application_help / tracking / general_query
6.  Based on intent, orchestrator calls:
      a. Scheme Discovery Agent  → finds matching schemes
      b. Eligibility Agent       → assesses each scheme against profile
      c. Verification Agent      → validates scheme info, marks unverified claims
7.  SYSTEM PROMPT assembled with:
      - Role + language instruction
      - Full citizen profile (age, income, state, category, flags)
      - Available documents list
      - Scheme/eligibility context from agents
      - Last 10 conversation turns
8.  IBM Granite generates personalised response
9.  OUTPUT GUARDRAILS:
      - Hallucination / unsupported claim check
      - Sensitive data leakage check
      - Schema validation
10. Response returned with:
      - AI text (with clickable URL links rendered in frontend)
      - Scheme cards (name, benefits, verification status, official portal link)
      - Eligibility assessment cards
      - Next steps
11. Workflow trace + token usage saved for admin dashboard
```

---

## Setup & Running

### Prerequisites
- Python 3.9+
- Node.js 18+
- IBM watsonx API key (project `858f90ab-a928-4103-8fff-9f4da13b9e29`)

### Start with one command
```bash
chmod +x start.sh && ./start.sh
```

### Or manually

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Access
| URL | Description |
|---|---|
| http://localhost:3000 | Citizen Portal |
| http://localhost:3000/citizen | Citizen Dashboard |
| http://localhost:3000/admin | Admin Dashboard |
| http://localhost:8000/docs | API Documentation (Swagger) |
| http://localhost:8000/health | Health Check |

### Admin Credentials
```
Email:    admin@nagrikAI.gov.in
Password: Admin@NagrikAI2024
```

---

## Key Design Decisions

**Why multi-agent instead of a single chatbot?**
Each agent has a defined scope, tool permissions, and output contract. This makes failures isolated and traceable — if the Verification Agent rejects a claim, the Eligibility Agent's result is still preserved. A monolithic chatbot would conflate all these concerns.

**Why IBM Granite?**
IBM Granite is an open, enterprise-grade model available on IBM watsonx with transparent documentation, predictable pricing, and support for structured chat-format prompting. The `ibm/granite-4-h-small` model is fast, cost-effective, and accurate for government-service Q&A.

**Why Llama 4 Maverick for vision?**
It is the only vision-capable model available on this watsonx account that supports the `image_url` content type in the chat format, enabling analysis of uploaded document photos.

**Why inline styles instead of Tailwind?**
Tailwind v4 had rendering issues with the Next.js App Router configuration. Inline styles give full control and zero build-time dependency for styling, which also makes the i18n text substitution straightforward.

---

## Future Roadmap

- [ ] Real-time application status from official government APIs (DigiLocker, UMANG)
- [ ] Aadhaar-based eKYC for verified identity
- [ ] Document OCR — extract data from uploaded Aadhaar/PAN automatically
- [ ] Push notifications for application deadlines
- [ ] Voice input support (Web Speech API)
- [ ] Offline PWA mode for low-connectivity areas
- [ ] Integration with myscheme.gov.in official API when available
- [ ] Fine-tuned Granite model on Indian government scheme corpus

---

## Important Disclaimers

> NagrikAI provides **preliminary guidance only**. All eligibility assessments are AI-generated and must be verified against official government sources before taking any action.
>
> Official government portals: [myscheme.gov.in](https://www.myscheme.gov.in) · [india.gov.in](https://www.india.gov.in) · [services.india.gov.in](https://services.india.gov.in)

---

*© 2024 NagrikAI · Powered by IBM Granite AI (watsonx)*
