# Movie Watchlist Manager (MERN Stack)

A comprehensive full-stack MERN application designed to manage, track, and rate personal movie watchlists. Features include auto-generated sequential movie codes, strict state-machine workflow transitions, live MongoDB aggregation analytics, and smart recommendation querying.

---

## 📁 Repository Structure

```text
my-exam-project/
├── backend/
│   ├── models/
│   │   └── Movie.js
│   ├── .env
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── README.md
├── screenshot1.png
└── screenshot2.png
Setup and Installation Instructions
1. Prerequisites
Node.js (v18+ recommended)

MongoDB Atlas cluster credentials (configured in .env)
2. Backend Setup
Bash
cd backend
npm install
node server.js
The backend server runs at http://localhost:5000.

3. Frontend Setup
Bash
cd frontend
npm install
npm run dev
The client dashboard opens at http://localhost:5173
## RESTful API Endpoints

All endpoints return a standardized JSON structure: `{ success: boolean, message: string, data: any }`.

| Method | Endpoint | Description | Request Body / Query | HTTP Codes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/movies` | Get movies with search, filter, and pagination (6/page) | `?status=&genre=&search=&page=` | `200`, `500` |
| `POST` | `/api/movies` | Create movie with auto code (`MV-<year>-<seq>`) | `{ title, genre, releaseYear, runtime, platform, priority }` | `201`, `400`, `409` |
| `PUT` | `/api/movies/:id` | Update editable fields (Title, Genre, Runtime, Platform, Priority) | `{ title, genre, runtime, platform, priority }` | `200`, `400`, `404`, `500` |
| `PATCH` | `/api/movies/:id/status` | Advance status workflow (`To Watch` ⇄ `Watching` → `Watched`) | `{ nextStatus, rating }` | `200`, `400`, `404`, `500` |
| `PATCH` | `/api/movies/:id/rating` | Edit rating for Watched movies | `{ rating }` | `200`, `400`, `404`, `500` |
| `DELETE` | `/api/movies/:id` | Remove movie (blocked for `Watching` status) | N/A | `200`, `400`, `404`, `500` |
| `GET` | `/api/movies/watch-next` | Fetch highest priority `To Watch` movie | N/A | `200`, `404`, `500` |
| `GET` | `/api/movies/stats` | Aggregated dashboard metrics via MongoDB Aggregation | N/A | `200`, `500` |

---

## Key Validation Rules

- **Code Generation:** Auto-generated sequentially as `MV-<releaseYear>-<sequence>` (e.g., `MV-2019-001`).
- **Duplicate Prevention:** Case-insensitive check on `title` + `releaseYear`, returning HTTP `409 Conflict`.
- **Workflow State Machine:** `To Watch` ⇄ `Watching` → `Watched`. `Watched` is final and immutable.
- **Rating Constraint:** Moving to `Watched` strictly requires a mandatory rating between 1 and 10.
- **Deletion Safeguard:** Movies in `Watching` status cannot be deleted.

---

## Application Screenshots

### 1. Watchlist Dashboard

![Dashboard](screenshot1.png)

### 2. Live Stats & Status Workflow

![Movie Management](screenshot2.png)