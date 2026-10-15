# Oakland School Portal

This repository is organized into separated **FRONTEND** and **BACKEND** directories:

## Project Structure

```
Oakland-school/
├── FRONTEND/           # Next.js Fullstack Client & App Router
│   ├── src/
│   │   ├── app/        # Next.js App Router (Public, Admin, Teacher, Bursar, Proprietor)
│   │   ├── components/ # Reusable UI components
│   │   ├── lib/        # Utility helpers and Supabase browser/server clients
│   │   └── types/      # TypeScript interfaces and type definitions
│   ├── public/         # Static assets and media
│   ├── package.json    # Frontend dependencies and scripts
│   └── .env.local      # Frontend environment variables
│
├── BACKEND/            # Supabase Database Schemas & Migrations
│   ├── supabase/
│   │   ├── migrations/ # SQL migration files
│   │   └── clean_test_reset.sql # Test database reset and seed script
│   └── README.md       # Backend database instructions
│
├── package.json        # Root scripts to run frontend from root directory
└── TESTING_WALKTHROUGH_GUIDE.md
```

## Getting Started

### 1. Running the Frontend
From the root directory, you can run:
```bash
npm run dev
```
Or navigate into the `FRONTEND` directory:
```bash
cd FRONTEND
npm run dev
```

### 2. Setting Up the Backend
See [BACKEND/README.md](file:///c:/Users/USER/Desktop/Oakland-school/BACKEND/README.md) for details on applying migrations and seeding the database.
