# Backend API

Production-ready Node.js + Express + MongoDB backend for the dashboard app.

## Tech
- Express
- Mongoose
- JWT (access + refresh)
- bcryptjs
- Zod env validation
- Helmet, CORS, express-rate-limit
- SendGrid mail (`@sendgrid/mail`)

## Setup

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

## Required Environment Variables

- `PORT`
- `MONGODB_URI`
- `CORS_ORIGIN`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `SENDGRID_API_KEY`
- `EMAIL_FROM`
- `APP_NAME`
- `FRONTEND_URL`

Startup fails fast when required env variables are missing or invalid.

## Routes

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me` (protected)
- `POST /api/auth/logout` (protected)
- `POST /api/auth/forgot-password` (rate-limited)
- `POST /api/auth/reset-password`
- `GET /api/auth/sessions` (protected)
- `DELETE /api/auth/sessions/:sessionId` (protected)

### Tasks (protected)
- `POST /api/tasks`
- `GET /api/tasks`
- `GET /api/tasks/stats`
- `PUT /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`

### Analytics (protected)
- `GET /api/analytics/overview`

### Health
- `GET /health`
- `GET /ready`

Task and analytics operations are scoped by authenticated user + resolved workspace. Client-provided identity fields are never trusted.
