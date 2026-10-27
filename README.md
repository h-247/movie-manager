# Movie Watchlist Manager

A full-stack personal movie tracking website built with **React**, **TypeScript**, **Tailwind CSS**, and **Cloudflare D1 (SQLite) with Drizzle ORM**, powered by the official **ChatGPT Sites Vinext** starter.

The application allows you to import movies using IMDb links or title IDs, automatically retrieves metadata from **The Movie Database (TMDB)**, tracks watching progress across three distinct statuses (**To do**, **Doing**, **Done**), and synchronizes seamlessly across both laptops and smartphones.

---

## 🌟 Key Features

### 1. IMDb Link & ID Import
- Accepts any IMDb movie URL or title ID:
  - `https://www.imdb.com/title/tt0111161/`
  - `https://www.imdb.com/title/tt0111161`
  - `https://www.imdb.com/title/tt0111161/?ref_=...`
  - `https://m.imdb.com/title/tt0111161/`
  - Standalone title ID: `tt0111161`
- Canonical URL normalization (`https://www.imdb.com/title/tt0111161/`).
- Interactive live preview displaying movie poster, title, release year, runtime, genres, and overview before adding to your collection.
- **Bulk Import**: Paste multiple IMDb links or IDs line-by-line; inspect for duplicates and import all valid movies in one batch.
- **Duplicate Protection**: Prevents duplicate entries within your collection by enforcing uniqueness on `(userId, imdbId)`.
- **Manual Fallback**: If TMDB metadata is unavailable or no API key is configured, you can enter movie details manually while retaining the validated IMDb ID.
- **Movie-Only Scope**: Clear error messages and rejection if an IMDb ID resolves to a TV series, season, or episode.

### 2. Three Watching Statuses & Date Tracking
- **To do (Yellow)**: Movies you plan to watch in the future.
- **Doing (Blue)**: Movies you are currently watching. Automatically records the viewing start date (`startedAt`).
- **Done (Green)**: Movies you have finished watching. Automatically records the completion date (`completedAt`) and start date.
- Transitioning back to **To do** resets active viewing dates while safely preserving your personal ratings and notes.

### 3. Collection Management & Personal Tracking
- **Dashboard Counters**: Real-time stats for Total Movies, To do, Doing, and Done. Tapping any counter instantly filters your collection.
- **Personal Ratings**: Optional 1 to 10 rating scale separate from public IMDb/TMDB ratings.
- **Personal Notes**: Multiline notes for personal reflections, reviews, and quotes.
- **Search**: Fast, case-insensitive search across title, original title, and IMDb ID.
- **Filters & Sorting**:
  - Filter by watching status, genre, and release year.
  - Sort by recently added, oldest added, Title A–Z, Title Z–A, release year (newest/oldest), and recently updated.
- **Delete Protection**: Permanent deletion requires an explicit confirmation modal displaying the movie title and IMDb ID.
- **Data Portability**: Full JSON export and JSON import/restore with conflict policies.

### 4. Responsive Dark-Mode UI
- Built according to strict dark theme design standards:
  - Background: `#212121`
  - Cards & Dialogs: `#262626`
  - Input Fields: `#1A1A1A`
  - Text: `#ECECEC` (primary) and Light Gray (secondary)
  - Buttons: White primary button with black text, dark gray secondary buttons
  - Status Indicators: Yellow (To do), Blue (Doing), Green (Done), Red (Destructive)
- Mobile-first responsive design tailored for smartphones, tablets, and desktop displays.
- Permanent dark theme (no light mode toggle; ignores OS override).

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS, Lucide Icons, Vinext Starter |
| **Backend** | Vinext / Next.js API Route Handlers running on Cloudflare Workers Runtime |
| **Database** | Cloudflare D1 (SQLite-compatible) + Drizzle ORM |
| **Validation** | Zod schemas on all server endpoints |
| **Metadata** | TMDB API (The Movie Database Find by ID with `external_source=imdb_id`) |
| **Testing** | Vitest (Unit & Integration tests) + Playwright (Browser E2E workflows) |
| **Deployment** | ChatGPT Sites (`sites()` Vite plugin & Cloudflare D1 bindings) |

---

## 💻 Windows 11 Local Development Setup

### 1. Prerequisites
- **Node.js**: `v22.13.0` or newer (LTS recommended)
- **PowerShell**: Windows 11 default PowerShell 5.1 or PowerShell 7+
- **Git**

Verify your Node version in PowerShell:
```powershell
node --version
npm --version
```

### 2. Installation
Clone the repository and install all dependencies:
```powershell
git clone <repository-url> "movie-manager"
cd "movie-manager"
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

Edit `.env` to configure your free TMDB API key:
```env
# Free TMDB API Key from https://www.themoviedb.org/settings/api
TMDB_API_KEY=your_tmdb_api_key_here

# Local Development Authentication Simulation
ALLOW_DEV_AUTH=true
DEV_USER_ID=dev-user-001
```
*(Note: If you do not have a TMDB key, the app still functions completely via manual metadata entry fallback).*

### 4. Database Migrations

#### Generate Drizzle SQL Migrations:
```powershell
npm run db:generate
```
This inspects `db/schema.ts` and updates migration SQL files in `drizzle/`.

#### Apply Migrations to Local D1 Emulation:
```powershell
npm run db:migrate
```
Local D1 SQLite database files are stored locally in `.wrangler/state/v3/d1`.

### 5. Start the Development Server
```powershell
npm run dev
```
Open your browser at `http://localhost:3000`.

### 6. Run TypeScript Type Checking
```powershell
npm run typecheck
```

### 7. Run Unit and Integration Tests (Vitest)
```powershell
npm run test
```
Or run with watch mode:
```powershell
npm run test:watch
```

### 8. Run Browser End-to-End Tests (Playwright)
```powershell
npm run test:e2e
```

### 9. Build for Production
To build the application for Cloudflare Workers runtime packaging:
```powershell
npm run build
```

### 10. Local Production Preview
To preview the production build using local Miniflare/Wrangler workers emulation:
```powershell
npm run start
```
By default, the worker will be accessible at `http://127.0.0.1:8787` with local D1 database bindings.

---

## 📱 Cross-Device Synchronization & Mobile Access

- **Source of Truth**: The hosted Cloudflare D1 database maintains all records. Browser `localStorage` is not used for collection storage.
- **Laptop & Phone**: Log in with your ChatGPT account on both devices. Changes made on your laptop will reflect on your smartphone upon refreshing or navigating the app.
- **Responsive Controls**: Buttons, dialogs, status tags, and cards adapt automatically to touch screen interactions on smartphones.

---

## 🚀 Deployment to ChatGPT Sites

The project is structured according to the official ChatGPT Sites specification:
1. `.openai/hosting.json` configures the Cloudflare D1 database binding:
   ```json
   {
     "d1": "DB",
     "r2": null
   }
   ```
2. `vite.config.ts` incorporates `sites()` from `@openai/sites-vite-plugin` and Cloudflare worker adapters.
3. Configure your production secret `TMDB_API_KEY` in your ChatGPT Site settings.
4. Run database migrations on the remote production D1 instance:
   ```powershell
   npm run db:migrate:prod
   ```
5. Deploy using the Sites workflow.

---

## 📄 License & Attribution

- **TMDB Attribution**: This product uses the TMDB API but is not endorsed or certified by TMDB.
- Personal movie tracking application built for educational and private organizational use.
