# Cars Mania 🚗

[![CI](https://github.com/petarnenov/cars-mania/actions/workflows/ci.yml/badge.svg)](https://github.com/petarnenov/cars-mania/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/petarnenov/cars-mania/graph/badge.svg?token=YOUR_CODECOV_TOKEN)](https://codecov.io/gh/petarnenov/cars-mania)
[![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?style=flat&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

A modern browser-based marketplace for buying and selling cars with role-based access  
control, admin moderation, and real-time messaging.

## ✨ Features

### 🔐 **Authentication & Authorization**

- User registration/login with JWT tokens
- Role-based access: **Guest**, **User**, **Admin**
- Protected routes and API endpoints

### 🚗 **Car Management**

- Users can create car listings (drafts)
- Upload up to 3 images per car
- Admin verification workflow before public listing
- Public catalog with filters, sorting, and pagination
- Price range slider and search functionality

### 💬 **Messaging System**

- Direct messaging between buyers and sellers
- Conversation management with unread indicators
- Message history and read receipts

### 🛡️ **Admin Panel**

- Moderation queue for pending car advertisements
- Approve/reject listings with optional reasons
- User role management

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Vue 3, TypeScript, Vite, Vue Router, Tailwind CSS |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM |
| **Database** | SQLite (dev), easily portable to PostgreSQL |
| **Authentication** | JWT with HTTP-only cookies, Argon2 password hashing |
| **File Storage** | Local disk (easily adaptable to cloud storage) |
| **Testing** | Vitest (unit), Vue Test Utils, Playwright (E2E) |
| **DevOps** | Docker, Docker Compose, GitHub Actions CI/CD |

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone and start with Docker
git clone https://github.com/petarnenov/cars-mania.git
cd cars-mania
docker compose up --build -d

# Access the app
open http://localhost:5173
```

### Option 2: Local Development

```bash
# Backend (Terminal 1)
cd backend
npm install
npm run dev

# Frontend (Terminal 2)
cd frontend
npm install
npm run dev

# Access the app
open http://localhost:5173
```

## 🎭 Demo Credentials

### Seed Demo Data

```bash
cd backend
npm run seed
```

This creates:

- **Admin User**: `admin@demo.com` / `123456`
- **Regular User**: `user@demo.com` / `123456`
- **Sample Cars**: Mix of draft, pending, and verified listings
- **Conversations**: Pre-populated message threads

### Manual Admin Promotion

```bash
cd backend
npm run make:admin -- user@example.com
```

## 📋 Development Setup Matrix

| Environment | Frontend | Backend | Database | Notes |
|-------------|----------|---------|----------|-------|
| **Local Dev** | `npm run dev` (5173) | `npm run dev` (3001) | SQLite (`dev.db`) | Hot reload, proxy `/api` |
| **Docker** | Nginx (5173) | Node (3001) | SQLite (`data.db`) | Production-like |
| **CI/CD** | Playwright tests | Supertest + Vitest | SQLite (`:memory:`) | Automated testing |

## 🧪 Testing

### Unit Tests

```bash
# Frontend tests (Vue components, router)
cd frontend
npm run test:cov

# Backend tests (API endpoints, auth)
cd backend
npm run test:cov
```

### E2E Tests

```bash
cd frontend
npm run e2e          # Headless
npm run e2e:ui       # Interactive UI
npm run e2e:report   # View results
```

**Coverage Targets**: 65% statements/branches/functions/lines

**Test Database**: All tests (unit, integration, and E2E) use a single test database (`test.db`) to ensure consistency and isolation.

## 📁 Project Structure

```text
cars-mania/
├── frontend/                 # Vue 3 + TypeScript SPA
│   ├── src/
│   │   ├── views/           # Page components
│   │   ├── components/      # Reusable components
│   │   ├── api.ts          # HTTP client
│   │   ├── auth.ts         # Auth state management
│   │   └── router.ts       # Vue Router config
│   ├── tests-e2e/          # Playwright E2E tests
│   └── src/views/__tests__/ # Vitest unit tests
├── backend/                 # Express + TypeScript API
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth & validation
│   │   ├── lib/           # Utilities (JWT, Prisma)
│   │   └── config/        # Environment config
│   ├── prisma/            # Database schema & migrations
│   ├── scripts/           # CLI tools (seed, admin)
│   └── tests/             # Vitest unit tests
└── uploads/               # Car images (local storage)
```

## 🔧 Configuration

### Environment Variables

```bash
# Backend (.env)
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
DATABASE_URL=file:./data.db
PORT=3001

# Frontend (Docker only)
BACKEND_URL=http://backend:3001
```

### Database Schema

```bash
cd backend
npx prisma studio    # GUI browser
npx prisma db push   # Apply schema changes
```

## 📦 Deployment

### Container Registry

Images are automatically built and pushed to [GitHub Container Registry](https://github.com/petarnenov/cars-mania/pkgs/container/cars-mania%2Fbackend) with multiple tags:

```bash
# Latest stable (main branch)
docker pull ghcr.io/petarnenov/cars-mania/frontend:latest
docker pull ghcr.io/petarnenov/cars-mania/backend:latest

# Specific commit (SHA-based)
docker pull ghcr.io/petarnenov/cars-mania/frontend:main-abc1234
docker pull ghcr.io/petarnenov/cars-mania/backend:main-abc1234

# Pull request builds
docker pull ghcr.io/petarnenov/cars-mania/frontend:pr-42
```

**Retention**: Old images are automatically cleaned up, keeping the latest 10  
versions per component.

### Production Considerations

- Switch to PostgreSQL for production database
- Use cloud storage (AWS S3, Cloudinary) for images
- Set up proper secrets management
- Configure CORS allowlist for your domain
- Add rate limiting and security headers
- Set up monitoring and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Run tests: `npm run test:cov` (both frontend/backend)
4. Run E2E tests: `npm run e2e`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

---

**Built with ❤️ using Vue 3, Node.js, and TypeScript**  
