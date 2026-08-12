# MedAI — AWS Serverless Production Deployment Guide

This document outlines the production deployment architecture for MedAI migrating from a monolithic EC2 instance to a serverless AWS setup (**S3 Static Hosting + CloudFront** for the React frontend, and **AWS Lambda + API Gateway** for the Express backend).

---

## 1. System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                     MEDAI AWS SERVERLESS ARCHITECTURE                  │
└────────────────────────────────────────────────────────────────────────┘

  [ Patient / Doctor / User ]
               │
               ▼
     [ MedAI Custom Subdomain ]
      (e.g., medai.yourdomain.com / app.medai.yourdomain.com)
               │
      ┌────────┴──────────────────────────┐
      │                                   │
      ▼ (Static Assets & Web UI)          ▼ (API Requests /api/*)
┌───────────────────────────┐       ┌───────────────────────────┐
│     AWS CloudFront CDN    │       │      AWS API Gateway      │
│             │             │       │      (HTTP API / REST)    │
│             ▼             │       │             │             │
│    AWS S3 Static Bucket   │       │             ▼             │
│   (Vite / React dist/)    │       │     AWS Lambda Function   │
└───────────────────────────┘       │    (Node.js 20.x Runtime) │
                                    │    (backend/lambda.js)    │
                                    │             │             │
                                    │             ▼             │
                                    │    Express Clinical Engine│
                                    │     (Routes, RAG, Triage) │
                                    └─────────────┬─────────────┘
                                                  │
                      ┌───────────────────────────┼───────────────────────────┐
                      │                           │                           │
                      ▼                           ▼                           ▼
            ┌───────────────────┐       ┌───────────────────┐       ┌───────────────────┐
            │   PostgreSQL DB   │       │  AI Providers     │       │ Provider Services │
            │ (Neon / AWS RDS)  │       │ (Gemini / OpenAI) │       │ (OSM/Google/MOH)  │
            │ + pgvector search │       │ Clinical reasoning│       │ Care navigation   │
            └───────────────────┘       └───────────────────┘       └───────────────────┘
```

---

## 2. Environment Variables Summary

### Backend (AWS Lambda Environment Variables)

| Variable | Description | Example (Production) |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@ep-xyz.neon.tech/medai_prod?sslmode=require` |
| `DB_POOL_MAX` | Max connections per Lambda container | `3` |
| `JWT_SECRET` | Strong secret for signing user tokens | `(Generate a 64-char random hex string)` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` |
| `GOOGLE_PLACES_API_KEY` | Google Places API key (Provider card enrichment) | `AIzaSy...` |
| `CLOUDINARY_URL` | Cloud storage for medical documents | `cloudinary://api_key:api_secret@cloud_name` |
| `CORS_ORIGINS` | Comma-separated allowed frontend domains | `https://medai.yourdomain.com,https://app.medai.yourdomain.com` |

### Frontend (Build-time Environment Variables in S3 / CI/CD)

| Variable | Description | Example (Production) |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL of API Gateway / Lambda backend | `https://api.medai.yourdomain.com` or `https://xyz.execute-api.us-east-1.amazonaws.com` |

---

## 3. Step-by-Step Deployment Procedure

### Step 1: Prepare & Deploy the Backend (AWS Lambda)

1. **Package Backend**:
   In the `backend` directory, install production dependencies:
   ```bash
   cd backend
   npm install --production
   ```
2. **Create Lambda Function**:
   * **Function Name**: `medai-clinical-backend`
   * **Runtime**: `Node.js 20.x`
   * **Architecture**: `x86_64` or `arm64`
   * **Handler**: `lambda.handler`
   * **Memory**: `1024 MB` (optimal for fast cold starts and document parsing)
   * **Timeout**: `30 seconds`
3. **Upload Code**:
   * Zip the `backend` folder (including `lambda.js`, `src/`, `package.json`, and `node_modules/`).
   * Upload the zip file via AWS Console or AWS CLI (`aws lambda update-function-code`).
4. **Set Environment Variables**:
   In the AWS Lambda Console $\rightarrow$ **Configuration** $\rightarrow$ **Environment variables**, enter all backend production variables listed above.

---

### Step 2: Configure AWS API Gateway

1. **Create API**:
   * Choose **HTTP API** (recommended for lower latency and cost) or **REST API**.
2. **Configure Routes**:
   * Create route `ANY /{proxy+}` integrating with Lambda `medai-clinical-backend`.
   * Create route `GET /` integrating with Lambda.
3. **Enable CORS in API Gateway**:
   * **Access-Control-Allow-Origin**: `https://medai.yourdomain.com`
   * **Access-Control-Allow-Headers**: `Content-Type, Authorization, X-Requested-With, Accept`
   * **Access-Control-Allow-Methods**: `GET, POST, PUT, DELETE, OPTIONS`
4. **Deploy & Copy Endpoint**:
   * Deploy to stage `$default` or `prod`.
   * Note the invoke URL: `https://[api-id].execute-api.[region].amazonaws.com`.

---

### Step 3: Prepare & Deploy the Frontend (AWS S3 + CloudFront)

1. **Configure Production URL**:
   In `frontend/.env.production` or CI/CD environment:
   ```env
   VITE_API_BASE_URL=https://[api-id].execute-api.[region].amazonaws.com
   ```
2. **Build Production Bundle**:
   ```bash
   cd frontend
   npm run build
   ```
   This generates the optimized static files in `frontend/dist/`.

3. **Upload to S3 Bucket**:
   * Create an S3 bucket (e.g., `medai-frontend-prod`).
   * Enable **Static Website Hosting** or configure CloudFront Origin Access Control (OAC).
   * Sync the files:
     ```bash
     aws s3 sync dist/ s3://medai-frontend-prod --delete
     ```

4. **CloudFront SPA Routing Configuration (Important)**:
   Because MedAI is a Single Page Application (SPA), all route paths (`/app`, `/login`, `/signup`) must resolve to `/index.html`:
   * Under CloudFront Distribution $\rightarrow$ **Error Pages**:
     * **HTTP Error Code**: `403: Forbidden` $\rightarrow$ **Response Page Path**: `/index.html` $\rightarrow$ **HTTP Response Code**: `200: OK`
     * **HTTP Error Code**: `404: Not Found` $\rightarrow$ **Response Page Path**: `/index.html` $\rightarrow$ **HTTP Response Code**: `200: OK`

---

### Step 4: Connect Existing Subdomain (Custom Domain & SSL)

1. **Frontend Subdomain** (e.g. `medai.yourdomain.com`):
   * Request a free public SSL certificate in **AWS Certificate Manager (ACM)** in `us-east-1` for your subdomain.
   * Attach the certificate and alternate domain name (CNAME) to the CloudFront distribution.
   * Create a DNS CNAME / Route 53 Alias record pointing `medai.yourdomain.com` to the CloudFront distribution domain (`d1234.cloudfront.net`).
2. **Backend API Subdomain** (Optional, e.g. `api.medai.yourdomain.com`):
   * In API Gateway, navigate to **Custom Domain Names**.
   * Attach your ACM certificate and map the custom domain to the API stage.
   * Point DNS CNAME to the API Gateway domain name.

---

## 4. Post-Deployment Health Check & Verification

1. **API Health**:
   Visit `https://api.medai.yourdomain.com/api/health` or `https://[api-id].execute-api.[region].amazonaws.com/api/health`.
   Expected response:
   ```json
   {
     "success": true,
     "message": "MedAI Clinical Engine is running smoothly.",
     "environment": "production",
     "runtime": "AWS Lambda"
   }
   ```
2. **Landing Page**:
   Open `https://medai.yourdomain.com` $\rightarrow$ Landing page loads instantly with zero errors.
3. **User Flow & Auth**:
   Sign in $\rightarrow$ Verify patient dashboard loads $\rightarrow$ Verify Care Navigation provider search $\rightarrow$ Verify AI chatbot response.
