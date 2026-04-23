# AI Resume Intelligence & Hiring Assistant Platform

A full-stack production-grade SaaS for AI-powered resume analysis, candidate matching, and hiring intelligence.

## Quick Start

### Docker Compose (Recommended)
```bash
cp .env.example .env
docker-compose -f docker/docker-compose.yml up --build
```
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### Local Dev
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

### Kubernetes
```bash
kubectl create namespace ai-hiring
kubectl apply -f kubernetes/ -n ai-hiring
```

See full docs in README for AWS/EKS steps.
