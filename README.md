# ExpertMatch MCA Project

This project is structured as a full-stack app:

- `client` - React + Vite frontend
- `server` - Express.js backend API
- `sql` - MySQL schema and seed scripts

## Feature 1 Implemented

- Expert Profile API
- Expert Profile page connected to API
- No authentication yet (as requested)

## Run Backend

1. Go to `server`
2. Install dependencies:
   - `npm install`
3. Create `.env` from `.env.example`
4. Start dev server:
   - `npm run dev`

Backend runs on `http://localhost:5000`.

## Run Frontend

1. Go to `client`
2. Install dependencies:
   - `npm install`
3. Create `.env` from `.env.example`
4. Start frontend:
   - `npm run dev`

Frontend runs on `http://localhost:5173`.

## Expert Profile API

- `GET /api/experts/:identifier`
- `identifier` can be expert `id` or `slug`

Example:
- `GET http://localhost:5000/api/experts/elena-rodriguez`

## MySQL Setup

1. Create database tables by running:
   - `sql/001_init_expert_profile.sql`
2. Set DB env values in `server/.env`

If DB is not configured yet, API uses in-memory sample data so you can continue frontend development.
