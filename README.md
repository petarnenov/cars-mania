# Cars Mania

Browser app for buying/selling cars with roles: Guest, User, Admin.

## Stack
- Frontend: Vite + Vue 3 + TS, Vue Router
- Backend: Node.js (Express) + TS, Prisma ORM
- DB: SQLite

## Features
- Auth (register/login/logout), roles (user/admin)
- Post cars (user), admin verify/reject, public catalog
- Upload up to 3 images per car
- Messaging (buyer ↔ seller), inbox with unread badges

## Local Dev
Backend:
```bash
cd backend
npm i
npm run dev
```
Frontend (in another shell):
```bash
cd frontend
npm i
npm run dev
```
Open http://localhost:5173

## Docker (prod-like)
Build and run:
```bash
docker compose up --build -d
```
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

Env secrets (override as needed):
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`

## Admin
Promote a user:
```bash
cd backend
npm run make:admin -- user@example.com
```
