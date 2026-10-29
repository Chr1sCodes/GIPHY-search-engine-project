# Loop

A responsive GIPHY explorer for GIFs, stickers, and still images. Includes trending content, search, paginated results, previews, copyable media links, and favorites stored on your device.

## Run locally

Requires Node.js 22 or later.

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

Christine Bharosi
Loop is a website where you can find GIFs and images by searching for keywords. It uses the GIPHY API to retrieve relevant media.
Users have the option to make an account for easier access. The search bar is readily available and will provide relevant GIFs and images based on the keywords used in the search bar.
Technologies used: Javascript, Node.js, HTML, api.mjs.
Ideas for improvement: Connected backend for account creation, mobile access, and subscription service structure.
