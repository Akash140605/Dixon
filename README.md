# Dixon – Production Management

React + Vite dashboard for hourly production entries (halls, machines, operators, rejects, loss time).

## Run locally (with dummy database)

The app no longer needs the external server. It uses a local **SQLite** database
(`server/data/dixon.sqlite`) that is created automatically with dummy data on first run.

Requirements: **Node.js 22.13 or newer** (uses the built-in `node:sqlite` module, nothing else to install).

```bash
npm install
npm run dev
```

Open http://localhost:5173 . The API is served by the same dev server at `/api/entriesv2.php` and `/api/get_parts.php`.

Dummy data: 251 parts and about 7 days of hourly entries for 4 machines in every hall (Hall 1–4, C8), with rejects and loss-time.

| Command | What it does |
| --- | --- |
| `npm run dev` | Frontend + local API on port 5173 |
| `npm run db:reset` | Delete the database and create fresh dummy data (dates move to today) |
| `npm run server` | Only the API, on port 8000 (optional) |

### Using PHP instead (optional)
`api/config.php` now points to the same SQLite file, so `php -S localhost:8000 -t api` also works
(needs the `pdo_sqlite` extension). Run `npm run db:reset` once first to create the file.
The production build (Vercel) still calls the live server `https://kushalyouth.com/api`; only `npm run dev` uses the local database.
To call a different backend from the frontend, set `VITE_API_BASE` in a `.env` file, e.g. `VITE_API_BASE=http://localhost:8000`.
