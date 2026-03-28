# AI Chat Application

A full-stack AI chat application built with Next.js 14, PostgreSQL, and Claude AI.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Local Development Setup](#local-development-setup)
- [Docker Compose Usage](#docker-compose-usage)
- [Environment Variables](#environment-variables)
- [Vercel Deployment](#vercel-deployment)
- [Database Setup](#database-setup)
- [Authentication](#authentication)

---

## Overview

This application provides an authenticated AI chat interface powered by Anthropic's Claude model. Users can sign in, start conversations, and interact with the AI assistant. All conversations are persisted in a PostgreSQL database.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via `pg`
- **AI**: Anthropic Claude via `@anthropic-ai/sdk`
- **Authentication**: NextAuth.js
- **Validation**: Zod
- **Styling**: Tailwind CSS
- **Containerization**: Docker & Docker Compose

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker & Docker Compose (for local PostgreSQL)
- An Anthropic API key

### Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/your-repo.git
   cd your-repo
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the example environment file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your configuration (see [Environment Variables](#environment-variables) below).

4. **Start the PostgreSQL database**

   ```bash
   docker-compose up -d postgres
   ```

5. **Run database migrations**

   ```bash
   npm run db:migrate
   ```

6. **Seed the admin user** (optional)

   ```bash
   npm run db:seed
   ```

7. **Start the development server**

   ```bash
   npm run dev
   ```

8. **Open the application**

   Navigate to [http://localhost:3000](http://localhost:3000)

---

## Docker Compose Usage

A `docker-compose.yml` is provided to run the full application stack locally, including PostgreSQL.

### Start all services

```bash
docker-compose up
```

### Start in detached mode

```bash
docker-compose up -d
```

### Start only the database

```bash
docker-compose up -d postgres
```

### Stop all services

```bash
docker-compose down
```

### Stop and remove volumes (wipes database data)

```bash
docker-compose down -v
```

### View logs

```bash
# All services
docker-compose logs -f

# Only the app
docker-compose logs -f app

# Only postgres
docker-compose logs -f postgres
```

### Rebuild the app image

```bash
docker-compose up --build
```

### Example `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: ai_chat_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ai_chat
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ai_chat_app
    restart: unless-stopped
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/ai_chat
      NEXTAUTH_SECRET: your-secret-here
      NEXTAUTH_URL: http://localhost:3000
      ANTHROPIC_API_KEY: your-anthropic-api-key
      ADMIN_EMAIL: admin@example.com
      ADMIN_PASSWORD: your-admin-password
    ports:
      - '3000:3000'

volumes:
  postgres_data:
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/dbname` |
| `NEXTAUTH_SECRET` | Secret used to sign/encrypt NextAuth tokens and cookies | `openssl rand -base64 32` output |
| `NEXTAUTH_URL` | Canonical URL of your application | `http://localhost:3000` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude access | `sk-ant-api03-...` |
| `ADMIN_EMAIL` | Email address for the seeded admin account | `admin@example.com` |
| `ADMIN_PASSWORD` | Password for the seeded admin account | `SuperSecurePassword123!` |

### Variable Details

#### `DATABASE_URL`

The full PostgreSQL connection string used by the `pg` client.

**Format**: `postgresql://[user]:[password]@[host]:[port]/[database]`

**Examples**:
- Local: `postgresql://postgres:postgres@localhost:5432/ai_chat`
- Docker: `postgresql://postgres:postgres@postgres:5432/ai_chat`
- Vercel Postgres: `postgresql://user:pass@host.vercel-storage.com/verceldb?sslmode=require`
- Neon: `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`

> **Note**: For production databases (Vercel Postgres, Neon, Supabase, etc.), always append `?sslmode=require` to enforce SSL connections.

---

#### `NEXTAUTH_SECRET`

A random string used by NextAuth.js to hash tokens, sign cookies, and generate cryptographic keys.

**Generate a secure value**:

```bash
openssl rand -base64 32
```

Or using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> **Warning**: Never commit this value to source control. Use a unique, randomly generated value for each environment (development, staging, production).

---

#### `NEXTAUTH_URL`

The canonical URL of your deployed application. NextAuth uses this for OAuth callback URLs and redirects.

**Examples**:
- Development: `http://localhost:3000`
- Production: `https://your-app.vercel.app`
- Custom domain: `https://chat.yourdomain.com`

> **Note**: On Vercel, this is often automatically set, but it's best practice to set it explicitly to avoid issues with preview deployments.

---

#### `ANTHROPIC_API_KEY`

Your API key for accessing Anthropic's Claude models.

**How to obtain**:
1. Sign up at [https://console.anthropic.com](https://console.anthropic.com)
2. Navigate to **API Keys** in your account settings
3. Create a new key and copy it immediately (it won't be shown again)

**Format**: `sk-ant-api03-...`

> **Warning**: Keep this key secret. It grants access to your Anthropic account and will be billed for usage.

---

#### `ADMIN_EMAIL`

The email address used to create the initial admin user when running the database seed script.

**Example**: `admin@yourdomain.com`

This account can be used to log in to the application immediately after setup.

---

#### `ADMIN_PASSWORD`

The password for the admin account created during database seeding.

**Requirements**:
- Minimum 8 characters
- Mix of uppercase, lowercase, numbers, and symbols recommended

**Example**: `MySecureAdminPass123!`

> **Warning**: Change this immediately after first login in production environments.

---

### `.env.example` Template

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_chat

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Admin Seed Account
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe123!
```

---

## Vercel Deployment

### Step-by-Step Deployment

1. **Push your code to GitHub** (or GitLab/Bitbucket)

2. **Import the project in Vercel**
   - Go to [https://vercel.com/new](https://vercel.com/new)
   - Select your repository
   - Choose **Next.js** as the framework (auto-detected)

3. **Configure Environment Variables**

   In the Vercel project settings under **Settings → Environment Variables**, add:

   | Name | Value | Environments |
   |---|---|---|
   | `DATABASE_URL` | Your production PostgreSQL URL | Production, Preview |
   | `NEXTAUTH_SECRET` | Generated random string | Production, Preview |
   | `NEXTAUTH_URL` | `https://your-app.vercel.app` | Production |
   | `ANTHROPIC_API_KEY` | Your Anthropic API key | Production, Preview |
   | `ADMIN_EMAIL` | Admin email address | Production |
   | `ADMIN_PASSWORD` | Admin password | Production |

4. **Deploy**

   Click **Deploy**. Vercel will build and deploy your application.

5. **Run migrations on production**

   After deployment, run your database migrations against the production database:

   ```bash
   DATABASE_URL=your-production-url npm run db:migrate
   ```

   Or use Vercel CLI:

   ```bash
   vercel env pull .env.production.local
   npm run db:migrate
   ```

### Recommended PostgreSQL Providers for Vercel

- **[Neon](https://neon.tech)** — Serverless PostgreSQL, generous free tier, excellent Vercel integration
- **[Vercel Postgres](https://vercel.com/storage/postgres)** — Native Vercel integration, powered by Neon
- **[Supabase](https://supabase.com)** — Full-featured PostgreSQL with additional services
- **[Railway](https://railway.app)** — Simple PostgreSQL hosting with easy setup

### Preview Deployments

For Vercel preview deployments (pull requests), you may want to use a separate database or schema to avoid affecting production data. Set environment variables scoped to **Preview** environments separately in Vercel's dashboard.

---

## Database Setup

### Schema

The application uses the following tables:

- **`users`** — Stores user accounts (id, email, hashed password, created_at)
- **`sessions`** — NextAuth session storage
- **`conversations`** — Chat conversation metadata
- **`messages`** — Individual chat messages with role (user/assistant) and content

### Running Migrations

```bash
npm run db:migrate
```

### Seeding the Database

Creates the initial admin user defined by `ADMIN_EMAIL` and `ADMIN_PASSWORD`:

```bash
npm run db:seed
```

### Resetting the Database (Development Only)

```bash
npm run db:reset
```

> **Warning**: This will drop all tables and re-run migrations. Never run this in production.

---

## Authentication

This application uses **NextAuth.js** with a **Credentials provider** backed by the PostgreSQL database.

- Passwords are hashed using **bcrypt** before storage
- Sessions are JWT-based and stored in secure HTTP-only cookies
- The `NEXTAUTH_SECRET` is used to sign all tokens

### Default Admin Account

After running `npm run db:seed`, you can log in with:

- **Email**: Value of `ADMIN_EMAIL`
- **Password**: Value of `ADMIN_PASSWORD`

---

## Scripts Reference

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed initial data |
| `npm run db:reset` | Reset database (dev only) |

---

## License

MIT