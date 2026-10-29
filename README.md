# Loop

A responsive GIPHY explorer for GIFs, stickers, and still images. Includes trending content, search, paginated results, previews, copyable media links, and favorites stored on your device.

## Run locally

Requires Node.js 22.9 or later.

```sh
npm install
cp .env.example .env
# Put your private GIPHY_API_KEY in .env.local (it overrides .env and is ignored by Git)
npm run dev
```

Open http://localhost:3000. Keep `.env` and `.env.local` out of version control. The API key stays on the Node server; the browser calls the server proxy at `/api/giphy` and never receives the key.

```sh
npm run build
npm start
npm test
```

Images are GIPHY GIF still frames, not a separate stock-photo search. All upstream requests use a PG-13 rating ceiling. Favorites are saved to this browser, not an account. A valid GIPHY API key with access to trending and search endpoints is required; API authorization and rate-limit errors appear explicitly in the app.

## Project overview

Loop is a static HTML and JavaScript website for finding GIFs and still images by keyword, built with Vite and backed by a Node.js GIPHY API proxy. The account form is currently a UI preview only; account creation and subscriptions require a future authentication backend.

## Deploy to GitHub Pages

GitHub Pages hosts static files only, so search also needs a separate Node API service. The included Render Blueprint hosts that API; keep the GIPHY key in Render and never in the frontend or GitHub Pages.

1. In GitHub, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
2. In Render, create a Blueprint from this repository using `render.yaml`. Set `GIPHY_API_KEY` as a secret when prompted and deploy. Copy the service URL shown by Render; do not assume the example service name is already deployed.
3. In GitHub, open **Settings → Secrets and variables → Actions → Variables** and add `VITE_API_URL` with only the Render service origin, such as `https://your-service.onrender.com` (no path and no trailing slash). Do not use `https://giphy.com`, `https://api.giphy.com`, or include `VITE_API_URL=` in the value; this app requires the separate Node proxy to keep the GIPHY key private.
4. Push to `main` or run **Deploy GitHub Pages** from the Actions tab. The workflow builds the site under the repository path and publishes `dist`.

The workflow intentionally fails if `VITE_API_URL` is missing, to avoid publishing a site whose search cannot work. If the GitHub Pages owner/repository changes, update the build base in `package.json` and `ALLOWED_ORIGIN` in `render.yaml`.
