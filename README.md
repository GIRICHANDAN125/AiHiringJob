<div align="center">

# 🧠 AI Hiring Job — Resume Intelligence & Hiring Assistant Platform

### Production-Grade Full-Stack SaaS for Smarter, Faster Recruitment

**Parse resumes in bulk. Score candidates against jobs with transparent, explainable logic. Manage your entire hiring pipeline — in one platform.**

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Manifests-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![JWT](https://img.shields.io/badge/Auth-JWT%20%2B%20OTP-orange?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#-license)

[![Repo Size](https://img.shields.io/github/repo-size/GIRICHANDAN125/AiHiringJob?style=flat-square)](https://github.com/GIRICHANDAN125/AiHiringJob)
[![Last Commit](https://img.shields.io/github/last-commit/GIRICHANDAN125/AiHiringJob?style=flat-square)](https://github.com/GIRICHANDAN125/AiHiringJob/commits/main)
[![Issues](https://img.shields.io/github/issues/GIRICHANDAN125/AiHiringJob?style=flat-square)](https://github.com/GIRICHANDAN125/AiHiringJob/issues)
[![Stars](https://img.shields.io/github/stars/GIRICHANDAN125/AiHiringJob?style=flat-square)](https://github.com/GIRICHANDAN125/AiHiringJob/stargazers)

[Live Demo](https://ai-hiring-job.vercel.app) · [Report Bug](https://github.com/GIRICHANDAN125/AiHiringJob/issues) · [Request Feature](https://github.com/GIRICHANDAN125/AiHiringJob/issues)

</div>

---

## 📖 Overview

Recruiting teams routinely receive hundreds of resumes per role and spend hours manually screening, comparing, and shortlisting candidates. **AI Hiring Job** automates the heavy lifting of that workflow with a rules-based, fully explainable scoring engine — no black-box AI, no unexplainable rankings.

### The Business Problem

- Manual resume screening doesn't scale past a handful of applicants.
- Recruiters lack a consistent, repeatable way to compare candidates against a role's requirements.
- Hiring managers need *evidence*, not just a score, to justify a shortlist decision.
- Disconnected spreadsheets and email threads make pipeline tracking unreliable.

### The Technical Solution

AI Hiring Job centralizes the entire hiring lifecycle — job creation, bulk resume ingestion, structured parsing, weighted candidate-to-job matching, pipeline tracking, and analytics — behind a single authenticated React dashboard backed by a hardened Express + MySQL API.

- **Resume Parsing Engine** — extracts skills, experience, and education from PDF/DOCX resumes using `pdf-parse` and `mammoth`, normalized against a curated skills taxonomy.
- **Explainable Matching Engine** — deterministic, weighted scoring (Required Skills 50% · Nice-to-have 20% · Experience 20% · Education 10%) with a full score breakdown returned per candidate — every score is traceable to its inputs.
- **Duplicate Detection** — content-hash based de-duplication prevents the same resume being scored twice for a role.
- **Interview Question Generator** — produces role- and skill-tailored behavioral/technical question banks per candidate-job pair.
- **Operational Analytics** — dashboard and per-job funnel metrics for data-driven hiring decisions.

### Real-World Use Case

A startup HR team posts a "Senior Backend Engineer" role, bulk-uploads 150 resumes received via email, and within seconds gets a ranked shortlist with a transparent breakdown of *why* each candidate ranked where they did — then moves top candidates through a pipeline (Screening → Interview → Offer) directly in the app.

### Scalability Considerations

- Stateless Express API designed for horizontal scaling — see the included **Kubernetes manifests** with 2-replica Deployments, liveness/readiness probes, and an Ingress with TLS.
- File uploads persisted to a dedicated `ReadWriteMany` PVC so any pod replica can serve uploaded resumes.
- Rate limiting (`express-rate-limit`) isolates auth endpoints (20 req/15min) from general API traffic (200 req/15min) to absorb brute-force attempts without degrading normal usage.
- MySQL schema is fully normalized with foreign keys and targeted indexes (`idx_applications_job_id`, `idx_resumes_user_id`, etc.) to keep matching queries performant as data grows.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔐 **JWT + OTP Authentication** | Email/password registration with OTP email verification, short-lived access tokens + refresh tokens, secure logout/session invalidation |
| 📄 **Bulk Resume Upload** | Upload up to 20 resumes at once (PDF/DOCX), parsed automatically into structured candidate profiles |
| 🧮 **Explainable Matching Engine** | Transparent, weighted scoring against job requirements with a full breakdown — not a black box |
| 🧬 **Duplicate Resume Detection** | SHA-based content hashing flags duplicate submissions per recruiter account |
| 📝 **AI-Style Job Description Generator** | Auto-drafts a structured job description from title, skills, and experience range |
| 🗂️ **Candidate Pipeline Tracking** | Move candidates through configurable pipeline stages (screening → interview → offer) |
| 🎯 **Interview Question Generator** | Generates behavioral & role-specific technical questions per candidate-job pairing |
| 📊 **Recruiter Analytics Dashboard** | Visual funnel metrics, per-job analytics, and hiring KPIs via Recharts |
| 🔔 **In-App Notifications** | Real-time-style notification feed with unread tracking |
| 🛡️ **Hardened API Surface** | Helmet, CORS, rate limiting, centralized error handling, structured Winston logging |
| 🐳 **Container-Native** | Multi-stage Dockerfiles, Docker Compose orchestration with health checks |
| ☸️ **Kubernetes-Ready** | Deployments, Services, ConfigMap/Secret, PVC, and Ingress manifests included |

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    User["👤 Recruiter / Hiring Manager"] -->|HTTPS| FE["⚛️ React 18 + Vite SPA<br/>(Zustand · Recharts · Axios)"]
    FE -->|REST /api/*| GW["🌐 Nginx Reverse Proxy<br/>(Frontend Container)"]
    GW --> API["🚀 Express.js API<br/>(Helmet · CORS · Rate Limiting)"]

    API --> AUTH["🔐 Auth Controller<br/>JWT + OTP + bcrypt"]
    API --> JOBS["💼 Job Controller"]
    API --> RES["📄 Resume Controller"]
    API --> CAND["🧑‍💻 Candidate Controller"]
    API --> ANA["📊 Analytics Controller"]
    API --> NOTIF["🔔 Notification Controller"]

    RES --> PARSE["🧠 Resume Parser Service<br/>(pdf-parse · mammoth)"]
    CAND --> MATCH["🎯 Matching Service<br/>(weighted scoring engine)"]
    JOBS --> JDGEN["📝 Job Description Service"]
    CAND --> INTV["❓ Interview Question Service"]

    AUTH --> DB[("🗄️ MySQL 8.0<br/>users · jobs · candidates<br/>resumes · applications")]
    JOBS --> DB
    RES --> DB
    CAND --> DB
    ANA --> DB
    NOTIF --> DB

    AUTH -.->|OTP email| SMTP["📧 SMTP (Gmail)"]
    RES -.->|stores files| FS[("📁 Uploads Volume")]

    style FE fill:#61DAFB,color:#000
    style API fill:#000,color:#fff
    style DB fill:#4479A1,color:#fff
```

---

## 🔄 Application Flow

### User Journey

```mermaid
flowchart LR
    A[Register Account] --> B[Verify OTP via Email]
    B --> C[Login → JWT Issued]
    C --> D[Create Job Posting]
    D --> E[Generate Job Description]
    D --> F[Bulk Upload Resumes]
    F --> G[Resumes Auto-Parsed]
    G --> H[Run Candidate Matching]
    H --> I[Review Ranked Shortlist]
    I --> J[Move Candidates Through Pipeline]
    J --> K[Generate Interview Questions]
    K --> L[View Analytics Dashboard]
```

### Request Lifecycle (Resume Upload → Match)

```mermaid
sequenceDiagram
    participant U as Recruiter (Browser)
    participant FE as React SPA
    participant API as Express API
    participant MW as Auth Middleware
    participant Parser as Resume Parser Service
    participant Match as Matching Service
    participant DB as MySQL

    U->>FE: Selects resumes + clicks Upload
    FE->>API: POST /api/resumes/upload (multipart)
    API->>MW: authenticate(JWT)
    MW-->>API: user verified
    API->>Parser: extract text + skills (pdf-parse/mammoth)
    Parser->>DB: INSERT candidates, resumes
    API-->>FE: 201 Created (parsed_data, quality_score)
    U->>FE: Clicks "Match Candidates"
    FE->>API: POST /api/candidates/match/:jobId
    API->>Match: calculateMatch(candidate, job)
    Match->>DB: SELECT job requirements
    Match-->>API: match_score + score_breakdown
    API->>DB: UPSERT applications
    API-->>FE: Ranked candidate list
```

---

## 📸 Screenshots

> Replace these placeholders with real screenshots from `/docs/screenshots/`.

| Login | Dashboard |
|---|---|
| ![Login Page](./docs/screenshots/login.png) | ![Dashboard](./docs/screenshots/dashboard.png) |

| Candidate Matching | Job Builder |
|---|---|
| ![Candidate Results](./docs/screenshots/candidates.png) | ![Job Builder](./docs/screenshots/job-builder.png) |

| Analytics | Resume Upload |
|---|---|
| ![Analytics](./docs/screenshots/analytics.png) | ![Resume Upload](./docs/screenshots/upload.png) |

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router 6, Zustand, Axios, Recharts, React Dropzone, Tailwind CSS, Lucide Icons, React Hot Toast |
| **Backend** | Node.js 20, Express 4, express-async-errors, express-validator |
| **Database** | MySQL 8.0 (`mysql2` driver), normalized relational schema with UUID primary keys |
| **Authentication** | JWT (access + refresh tokens), bcryptjs password hashing, email OTP verification |
| **File Processing** | Multer (uploads), pdf-parse, mammoth (DOCX parsing) |
| **Email** | Nodemailer over SMTP (Gmail App Passwords) |
| **Security** | Helmet, CORS, express-rate-limit, centralized error handler |
| **Observability** | Winston structured logging, Morgan HTTP request logs |
| **Containerization** | Docker (multi-stage builds), Docker Compose, Nginx (frontend static serving) |
| **Orchestration** | Kubernetes (Deployments, Services, Ingress, ConfigMap, Secret, PVC) |
| **Deployment Targets** | Vercel (frontend), Render/EKS (backend), Clever Cloud / managed MySQL |

> **Note on "AI":** The matching, scoring, and job-description-generation engines in this codebase are deterministic, rules-based algorithms (weighted skill comparison, template generation) — not third-party LLM API calls. This makes every score fully explainable and reproducible, which is a deliberate design choice for hiring use cases where decisions must be defensible.

---

## 📂 Project Structure

```
AiHiringJob/
├── backend/
│   ├── config/
│   │   └── database.js              # MySQL connection pool + config validation
│   ├── controllers/
│   │   ├── authController.js        # Register, login, OTP, refresh, profile
│   │   ├── jobController.js         # CRUD + description generation
│   │   ├── candidateController.js   # Matching, pipeline, interview Qs
│   │   ├── resumeController.js      # Upload, parse, list, delete
│   │   ├── analyticsController.js   # Dashboard + per-job analytics
│   │   └── notificationController.js
│   ├── middleware/
│   │   ├── authMiddleware.js        # JWT verification
│   │   ├── errorHandler.js          # Centralized AppError handling
│   │   └── uploadMiddleware.js      # Multer config
│   ├── services/
│   │   ├── matchingService.js       # Weighted scoring engine
│   │   ├── resumeParserService.js   # Skill extraction + parsing
│   │   ├── jobDescriptionService.js # Template-based JD generator
│   │   ├── interviewService.js      # Question bank generator
│   │   └── emailService.js          # OTP + notification emails
│   ├── routes/                      # authRoutes, jobRoutes, resumeRoutes, ...
│   ├── sql/
│   │   ├── mysql-schema.sql         # Full relational schema
│   │   └── notifications.sql
│   ├── utils/logger.js
│   ├── Dockerfile
│   ├── .env.example
│   └── server.js / app.js
├── frontend/
│   ├── src/
│   │   ├── components/              # Breadcrumb, NotificationsDropdown, ProfileDropdown
│   │   ├── layouts/DashboardLayout.jsx
│   │   ├── pages/                   # Login, Register, OTP, Dashboard, JobBuilder, Candidates...
│   │   ├── services/api.js          # Axios instance
│   │   └── store/authStore.js       # Zustand auth store
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vercel.json
├── kubernetes/
│   ├── deployment.yaml              # Backend + Frontend Deployments
│   └── k8s-resources.yaml           # Services, ConfigMap, Secret, PVC, Ingress
├── docker-compose.yml                # mysql + backend + frontend orchestration
└── README.md
```

---

## 🌐 API Documentation

### Auth Routes — `/api/auth`

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/register` | Create a recruiter account | Public |
| POST | `/login` | Authenticate, issue JWT pair | Public |
| POST | `/verify-otp` | Verify OTP sent to email | Public |
| POST | `/resend-otp` | Resend OTP code | Public |
| POST | `/refresh` | Exchange refresh token for new access token | Public |
| POST | `/logout` | Invalidate session | 🔒 |
| GET | `/me` | Get current user profile | 🔒 |
| PUT | `/update-profile` | Update recruiter profile | 🔒 |

### Job Routes — `/api/jobs`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Create a job posting |
| GET | `/` | List jobs |
| GET | `/:id` | Get a single job |
| PUT | `/:id` | Update a job |
| DELETE | `/:id` | Delete a job |
| POST | `/generate-description` | Auto-generate a job description |

### Resume Routes — `/api/resumes`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/upload` | Bulk upload up to 20 resumes (multipart) |
| GET | `/` | List parsed resumes |
| GET | `/:id` | Get resume detail + parsed data |
| DELETE | `/:id` | Delete a resume |

### Candidate Routes — `/api/candidates`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List candidates |
| GET | `/:id` | Candidate detail |
| POST | `/match/:jobId` | Run matching engine against a job |
| PUT | `/pipeline/:applicationId` | Update pipeline stage |
| POST | `/:candidateId/interview-questions/:jobId` | Generate interview questions |

### Analytics & Notifications

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/dashboard` | Aggregate hiring metrics |
| GET | `/api/analytics/jobs/:jobId` | Per-job funnel analytics |
| GET | `/api/notifications` | List notifications |
| PATCH | `/api/notifications/:id/read` | Mark notification as read |

All routes other than `/auth/register`, `/auth/login`, `/auth/verify-otp`, `/auth/resend-otp`, and `/auth/refresh` require a valid `Authorization: Bearer <token>` header.

---

## 🗄️ Database Design

```mermaid
erDiagram
    USERS ||--o{ JOBS : creates
    USERS ||--o{ CANDIDATES : owns
    USERS ||--o{ RESUMES : owns
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--|| RECRUITERS : "has profile"
    JOBS ||--o{ APPLICATIONS : receives
    CANDIDATES ||--o{ APPLICATIONS : submits
    CANDIDATES ||--o{ RESUMES : has
    RESUMES ||--o| APPLICATIONS : "linked to"

    USERS {
        char id PK
        string name
        string email
        string password_hash
        string role
        boolean is_verified
        string otp_code
        datetime otp_expires_at
    }
    RECRUITERS {
        char id PK
        char user_id FK
        string company_name
        string job_title
    }
    JOBS {
        char id PK
        char user_id FK
        string title
        json required_skills
        json nice_to_have_skills
        int experience_min
        int experience_max
        string status
    }
    CANDIDATES {
        char id PK
        char user_id FK
        string name
        json skills
        int experience_years
        json education
    }
    RESUMES {
        char id PK
        char candidate_id FK
        string filename
        json parsed_data
        int quality_score
        boolean is_duplicate
    }
    APPLICATIONS {
        char id PK
        char job_id FK
        char candidate_id FK
        char resume_id FK
        int match_score
        json score_breakdown
        string pipeline_stage
    }
    NOTIFICATIONS {
        char id PK
        char user_id FK
        text message
        boolean is_read
    }
```

---

## ⚙️ Installation Guide

### Prerequisites

- Node.js ≥ 20
- MySQL ≥ 8.0 (or use the bundled Docker MySQL container)
- npm

### 1. Clone the Repository

```bash
git clone https://github.com/GIRICHANDAN125/AiHiringJob.git
cd AiHiringJob
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env     # fill in DB + JWT + SMTP values
npm install
npm run dev               # nodemon, http://localhost:5000 (or 5002)
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev               # Vite dev server
```

### 4. Database Setup

```bash
mysql -u root -p < backend/sql/mysql-schema.sql
mysql -u root -p < backend/sql/notifications.sql
```

### 5. Environment Variables (`backend/.env`)

```env
NODE_ENV=production
PORT=5002
FRONTEND_URL=https://your-vercel-app.vercel.app

DB_HOST=
DB_PORT=3306
DB_NAME=
DB_USER=
DB_PASSWORD=
# Or: DATABASE_URL=mysql://user:password@host:port/dbname

JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
EMAIL_FROM=your-email@gmail.com

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

---

## 🐳 Docker

The project ships with a full **Docker Compose** stack: MySQL → Backend → Frontend, wired together with health checks and dependency ordering.

```bash
cp backend/.env.example backend/.env
docker-compose up --build
```

| Service | Image | Port | Notes |
|---|---|---|---|
| `mysql` | `mysql:8.0` | 3306 | Healthcheck via `mysqladmin ping` |
| `backend` | built from `backend/Dockerfile` (node:20-alpine) | 5000 | Waits for MySQL healthcheck, runs as non-root `node` user |
| `frontend` | multi-stage build → `nginx:1.27-alpine` | 3000 → 80 | Serves Vite production build via Nginx |

Build an individual image:

```bash
docker build -t ai-hiring-backend ./backend
docker build -t ai-hiring-frontend ./frontend --build-arg VITE_API_URL=/api
```

---

## ☸️ Kubernetes

Production-style manifests live in `kubernetes/`:

- **Deployments** — `backend` and `frontend`, 2 replicas each, with CPU/memory requests & limits, liveness and readiness probes (`/health` for backend, `/` for frontend).
- **Services** — `backend-service` and `frontend-service` (ClusterIP).
- **ConfigMap** — non-secret runtime config (`NODE_ENV`, `DB_HOST`, etc.).
- **Secret** — `JWT_SECRET`, DB credentials, SMTP credentials (replace placeholder values before applying).
- **PersistentVolumeClaim** — `ReadWriteMany`, 10Gi, for the shared `/app/uploads` volume across backend pods.
- **Ingress** — Nginx ingress class with TLS via `cert-manager` (`letsencrypt-prod` cluster issuer), routing `/api` → backend, `/` → frontend.

```bash
kubectl create namespace ai-hiring
kubectl apply -f kubernetes/ -n ai-hiring
kubectl get pods -n ai-hiring -w
```

### Scaling Strategy

- Backend pods are stateless — scale horizontally with `kubectl scale deployment/backend --replicas=N` or attach a Horizontal Pod Autoscaler (HPA) on CPU utilization (not yet included — see Future Enhancements).
- The shared uploads PVC means any replica can serve any user's files, avoiding sticky-session requirements Improved project overview.

---

## 🔁 CI/CD

> **Current state:** No GitHub Actions / CI pipeline is present in the repository yet. The suggested pipeline below reflects the natural next step given the existing Docker and Kubernetes assets, and is listed under Future Enhancements.

```mermaid
flowchart LR
    A[Push to main] --> B[Lint & Test]
    B --> C[Build Docker Images]
    C --> D[Push to Registry]
    D --> E[kubectl apply -f kubernetes/]
    E --> F[Rolling Update on Cluster]
```

---

## 🚀 Deployment

| Component | Target |
|---|---|
| Frontend | Vercel (static build, `VITE_API_URL` env var) |
| Backend | Render / Railway / AWS EKS (containerized) |
| Database | Clever Cloud MySQL / Amazon RDS for MySQL |
| File Storage | Persistent volume (local) or swap for S3-compatible storage at scale |

The live demo (`https://ai-hiring-job.vercel.app`) follows this exact split: Vercel for the SPA, a managed Node host for the API, and a managed MySQL instance for persistence.

---

## 🔒 Security Features

- **JWT Authentication** — short-lived access tokens (15 min) paired with longer-lived refresh tokens (7 days) to limit exposure of compromised tokens.
- **Password Hashing** — `bcryptjs` with salted hashing; raw passwords are never stored or logged.
- **Email OTP Verification** — accounts must verify a one-time code before becoming active.
- **API Protection** — `helmet` security headers, strict CORS policy, and tiered rate limiting (general API vs. auth endpoints).
- **Environment Security** — all secrets (`JWT_SECRET`, DB credentials, SMTP credentials) are externalized via `.env` / Kubernetes Secrets and never committed to source control.
- **Centralized Error Handling** — `AppError` + `errorHandler` middleware prevent stack traces or internal details from leaking to clients.

---

## ⚡ Performance Optimizations

- **Compression** — `compression` middleware gzips API responses.
- **Connection Pooling** — `mysql2` connection pool avoids per-request connection overhead.
- **Indexed Queries** — targeted indexes on `applications(job_id)`, `applications(candidate_id)`, `resumes(user_id)`, and `notifications(user_id, created_at)` keep dashboard and matching queries fast as data scales.
- **Multi-Stage Docker Builds** — frontend image discards the Node build toolchain, shipping only static assets via Nginx for a minimal runtime footprint.
- **Duplicate Detection** — hash-based dedup avoids re-parsing and re-scoring identical resumes.

---

## 🔮 Future Enhancements

1. Real LLM-backed semantic resume matching (embeddings) as an optional upgrade path over the current rules engine
2. GitHub Actions CI/CD pipeline (lint → test → build → deploy)
3. Horizontal Pod Autoscaler (HPA) for the backend Deployment
4. Redis caching layer for analytics/dashboard queries
5. S3-compatible object storage for resumes instead of local PVC
6. Role-based access control for multi-recruiter organizations
7. Candidate-facing portal for self-service applications
8. Calendar integration for interview scheduling
9. Webhooks for ATS (Applicant Tracking System) integrations
10. Resume parsing support for additional formats (RTF, scanned PDFs via OCR)
11. Audit logging for compliance-sensitive hiring decisions
12. Multi-language resume parsing
13. Automated email digests of weekly hiring funnel metrics
14. Dark mode for the dashboard
15. End-to-end test suite (Playwright/Cypress) and backend integration tests

---

## 👨‍💻 Author

**Chandu Giri**
Full Stack Developer · B.Tech Computer Science & Engineering

[![LinkedIn](https://img.shields.io/badge/LinkedIn-girichandan-0077B5?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/girichandan/)
[![Email](https://img.shields.io/badge/Email-girichandu29%40gmail.com-D14836?style=flat-square&logo=gmail&logoColor=white)](mailto:girichandu29@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-GIRICHANDAN125-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/GIRICHANDAN125)

---

## 💬 Support

If you run into issues or have questions:

- Open an [issue](https://github.com/GIRICHANDAN125/AiHiringJob/issues)
- Start a [discussion](https://github.com/GIRICHANDAN125/AiHiringJob/discussions)
- Reach out directly via the contact links above

If this project helped you, consider giving it a ⭐ — it genuinely helps visibility.

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](./LICENSE) for details.

<div align="center">

Made with ☕ and a lot of `console.log` by **Chandu Giri**

</div>
