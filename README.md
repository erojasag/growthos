# GrowthOS — Personal Growth Tracker

A modern PWA for tracking fitness, finances, and habits — built with Next.js 16, Tailwind CSS, and Supabase.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + custom shadcn-style components
- **Icons**: Lucide React
- **Charts**: Recharts
- **Backend**: Supabase (Auth + PostgreSQL + Row Level Security)
- **PWA**: Web App Manifest for installability

## Features

- **Dashboard** — overview cards, weekly charts, recent activity feed
- **Fitness** — log workouts, track exercises, weight progress chart
- **Finances** — income/expense tracking, budget progress, category breakdown
- **Habits** — daily habit tracker with streaks, weekly grid view, color-coded

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the contents of `supabase/schema.sql`
3. Copy `.env.local.example` to `.env.local` and fill in your keys:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the dashboard.

## Project Structure

```
src/
├── app/
│   ├── (app)/              # App shell with sidebar
│   │   ├── dashboard/      # Dashboard module
│   │   ├── fitness/        # Fitness module
│   │   ├── finances/       # Finances module
│   │   └── habits/         # Habits module
│   ├── layout.tsx          # Root layout (fonts, metadata, PWA)
│   └── page.tsx            # Redirects to /dashboard
├── components/
│   ├── ui/                 # Reusable UI components (button, card, etc.)
│   └── sidebar.tsx         # Navigation sidebar
└── lib/
    ├── supabase/           # Supabase client (browser + server)
    ├── types/              # TypeScript types & DB schema
    └── utils.ts            # Utility functions
```

## Current State

The app currently runs with **demo data** (in-memory state). To connect it to Supabase:

1. Set up the database schema (see above)
2. Replace the `useState` demo data in each module with Supabase queries
3. Add authentication flow (login/signup pages + middleware)

## Next Steps

- [ ] Add Supabase auth (email/password + OAuth)
- [ ] Wire modules to real database queries
- [ ] Add data export (CSV/JSON)
- [ ] Add dark mode toggle
- [ ] Add goal setting & progress tracking
- [ ] Add notifications/reminders
