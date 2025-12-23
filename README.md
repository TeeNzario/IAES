# IAES

This is a web application for examination adaptive system.

## Features
- Create course
- Create student
- Create staff
- Create exam

## Tech Stack
- Frontend: NextJS
- Backend: NestJS
- Database: PostgreSQL

## Installation

### Prerequisites
- Node.js (v20.19.0 or later)
- npm
- PostgreSQL


1. Clone the repository
```bash
    git clone https://github.com/TeeNzario/IAES.git
    cd IAES
```
2. Backend Setup

```bash
    cd server
    npm install
    npm run start:dev
```

create .env file in server directory
PORT=3002
DATABASE_URL=postgresql://user:password@localhost:5432/db_name
   
3. Frontend Setup

```bash
    cd client
    npm install
    npm run dev
```

create .env.local file in client directory
NEXT_PUBLIC_API_URL=http://localhost:3002

4. Database Setup

Run database migration
```bash
cd server
    npx prisma migrate dev --name init
    npx prisma generate
```

Seed database
```bash
cd server
    npm run seed
```



