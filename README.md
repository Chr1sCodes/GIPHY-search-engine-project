# Loop

A responsive GIPHY explorer for GIFs, stickers, and still images. Includes trending content, search, paginated results, previews, copyable media links, and favorites stored on your device.

## Run locally

Requires Node.js 22.9 or later.

```sh
npm install
cp .env.example .env
# Set GIPHY_API_KEY in .env
npm run dev
```

Open http://localhost:3000. Keep `.env` out of version control. The API key stays on the server; the browser uses `/api/giphy`.

```sh
npm run build
npm start
npm test
```

Images are GIPHY GIF still frames, not a separate stock-photo search. All upstream requests use a PG-13 rating ceiling. Favorites are saved to this browser, not an account. A valid GIPHY API key with access to trending and search endpoints is required; API authorization and rate-limit errors appear explicitly in the app.

## Deploy to GitHub Pages

GitHub Pages serves static files only. The site therefore needs a separate Node API service for `/api/giphy`; do not put the GIPHY API key in the Pages build or browser code.

1. In GitHub, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
2. In Render, create a **Blueprint** from this repository using `render.yaml`. Set `GIPHY_API_KEY` as the service's secret environment variable when prompted, then deploy. The API service URL will look like `https://loop-giphy-api.onrender.com`.
3. In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables** and add `VITE_API_URL` with the full Render service URL (no trailing slash).
4. Push to `main` or run the **Deploy GitHub Pages** workflow. It builds the app with the correct repository subpath and publishes `dist`.

The Pages workflow intentionally stops with a clear error if `VITE_API_URL` is not configured. The Render service allows browser API calls only from this repository's GitHub Pages origin. If the repository owner or name changes, update `ALLOWED_ORIGIN` in `render.yaml` and the Pages build base in `package.json`.

## Project overview

Loop is a website for finding GIFs and still images by keyword, powered by the GIPHY API. It is built with React, TypeScript, Vite, and a Node.js API proxy. The account form is currently a UI preview only; account creation and subscriptions require a future authentication backend.
