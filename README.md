# Loop

A responsive GIPHY explorer for GIFs, stickers, and still images. Includes trending content, search, paginated results, previews, copyable media links, and favorites stored on your device.

## Run locally

Requires Node.js 22.9 or later.

```sh
npm install
cp .env.example .env
# Set VITE_GIPHY_API_KEY in .env
npm run dev
```

Open http://localhost:3000. Keep `.env` out of version control. Requests go directly from the browser to GIPHY's GIF/sticker trending and search endpoints, as required by GIPHY. Because a browser must send the API key, it is visible to site visitors in the built JavaScript; keep it out of source control and use a key intended for this client-side application.

```sh
npm run build
npm start
npm test
```

Images are GIPHY GIF still frames, not a separate stock-photo search. All upstream requests use a PG-13 rating ceiling. Favorites are saved to this browser, not an account. A valid GIPHY API key with access to trending and search endpoints is required; API authorization and rate-limit errors appear explicitly in the app.

## Project overview

Loop is a static HTML and JavaScript website for finding GIFs and still images by keyword, built with Vite. GIPHY API requests are made directly by the browser. The account form is currently a UI preview only; account creation and subscriptions require a future authentication backend.

## Deploy to GitHub Pages

GitHub Pages hosts the static site. The API key is injected at build time and is included in the public client bundle because GIPHY API requests must come directly from the browser.

1. In GitHub, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
2. In GitHub, open **Settings → Secrets and variables → Actions → Secrets** and add `GIPHY_API_KEY`. The Pages workflow passes it to Vite as `VITE_GIPHY_API_KEY` during the build. The generated JavaScript is public, so this secret only protects the key from source control; it does not hide it from site visitors.
3. Push to `main` or run **Deploy GitHub Pages** from the Actions tab. The workflow builds the site under the repository path and publishes `dist`.

To deploy on Render instead, create a Blueprint from this repository using `render.yaml` and set `VITE_GIPHY_API_KEY` when prompted. If the GitHub Pages owner/repository changes, update the build base in `package.json`.
