# TeamSamir website

Marketing website for TeamSamir / TS Fitness, a personal-training business in Kothrud, Pune.

- **Live site:** https://teamsamir.com (also reachable at https://teamsamir.vercel.app)
- **Repository:** https://github.com/ArshadAttar/teamsamir
- **Local folder:** `C:\samir-website-data\ts-website\team-samir`

Built with React 19, Vite and Tailwind CSS v4. Every page is prerendered to static HTML at build time.

## Run locally

Prerequisite: Node.js.

1. Install dependencies: `npm install`
2. Create a `.env` file with the contact form's Google Apps Script URL:
   `VITE_FORM_ENDPOINT=https://script.google.com/macros/s/.../exec`
   (see `docs/google-apps-script/SETUP.md`)
3. Start the dev server: `npm run dev` (http://localhost:3000)

Other commands:

- `npm run build`: build and prerender the site into `dist/`
- `npm run preview`: serve the built `dist/`
- `npm run lint`: type-check with `tsc --noEmit`

## Deploy

The site is hosted on Vercel (project `teamsamir`), which is connected to this GitHub repo. Every push to `main` deploys to https://teamsamir.com automatically.

- `VITE_FORM_ENDPOINT` is set in the Vercel project's Environment Variables (Production and Preview). After changing it, redeploy.
- The domain the site uses for canonical links, share previews and the sitemap is `SITE_URL` in `src/lib/seo.ts`. Change it there if the domain changes.

## Old version

The earlier copy of this site lived in `C:\samir-website-data\ts-website\ts-v1`, repo `ArshadAttar/team-samir-website`, deployed at https://team-samir-website.vercel.app. It is no longer updated. Make all changes here.
