# AsmitA CP Portal

Admin portal with a Node/Express backend and a React frontend.

## Prerequisites

- Node.js 18+ (or 16+ if your environment requires it)
- npm
- MySQL database

## Project Structure

- `backend/` - Express API server
- `frontend/` - React app (Create React App)

## Environment Variables

Create a `.env` file inside `backend/` with these keys:

```
DB_HOST=localhost
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=your_db_name
DB_PORT=3306

PORT=5000
SESSION_SECRET=change_me
CORS_ORIGIN=http://localhost:3000

SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_or_service_key
SUPABASE_BUCKET=channel-partners
```

## Setup

### Backend

```
cd backend
npm install
npm run dev
```

The API server runs on `http://localhost:5000` by default.

### Frontend

```
cd frontend
npm install
npm start
```

The React app runs on `http://localhost:3000` by default.

## Build

```
cd frontend
npm run build
```

## Notes

- `node_modules/` and `.env` are intentionally ignored by Git.
- If you need to change CORS, update `CORS_ORIGIN` in `backend/.env`.
