# Mini System Software Toolkit

A college PBL web application for demonstrating five System Software concepts:

1. Lexical Analyzer
2. Symbol Table
3. Two Pass Assembler
4. Recursive Descent Parser
5. Quadruple Generator

## Technology

- Node.js
- Express.js
- PostgreSQL
- HTML5
- CSS3
- Vanilla JavaScript
- bcryptjs
- JWT
- pg
- dotenv

## Setup

### 1. Install PostgreSQL

Make sure PostgreSQL is installed and the PostgreSQL server is running.

### 2. Configure environment

Copy `.env.example` to `.env` and set your PostgreSQL password.

Example:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mini_system_software_toolkit
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=use_a_long_random_secret
```

The application attempts to create the configured database automatically if it does not exist, provided the PostgreSQL user has permission to create databases.

### 3. Install packages

```bash
npm install
```

### 4. Start

```bash
npm start
```

Open `http://localhost:3000`.

## Application flow

Register → Login → Dashboard → Module → New/Existing Project → Editor → Save/Run → Output and Execution History.

Projects are filtered by the selected module and by the logged-in user.

## Database

The server automatically creates the required tables. The complete schema is also available at `database/schema.sql`.

## API

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`

### Projects

- `POST /api/projects`
- `GET /api/projects?module=lexical`
- `GET /api/projects/:projectId/code`
- `PUT /api/projects/:projectId/code`

### Toolkit

- `POST /api/toolkit/projects/:projectId/run`
- `GET /api/toolkit/projects/:projectId/executions`

All project and toolkit routes require a JWT bearer token.
