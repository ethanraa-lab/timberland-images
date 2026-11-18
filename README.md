# Timberland Image Workbench

Standalone internal image curation tool. No GitHub, login, backend, API key or build step required.

## Run locally
Open the extracted project folder in VS Code. In the terminal run `npm start` (Node.js 20 or newer), then open http://localhost:3000. Click “Try verified sample”. The sample hero is bundled for a reliable first preview. Its exported URL is still the original Timberland URL.

## Regional sources
The initial lookup checks the official CDN and, if empty, queries the US, UK storefront for Europe, and Japan. Open “Regional sources” on any product card to check individual stores or supply an official product URL. Lookup requires the Node server locally. Only exact style matches with usable images are included. Stores may block automated requests, render their catalog with JavaScript, or use a different style code in another region.

## Deploy to Netlify without GitHub
Deploy from the project root with Netlify CLI (for example, `npx netlify-cli deploy --build` for a draft and add `--prod` when ready). The configuration publishes `public` and bundles the regional lookup function. Drag-and-drop of `public` alone serves the static app and sample, with no regional lookup function.

## Hosting choice checked 5 November 2026
Netlify Free permits commercial projects and currently includes 300 credits/month. Production deployments use 15 credits each; bandwidth and requests also count. Free usage is capped; check the dashboard before workplace rollout. Images load from Timberland, rather than consuming Netlify image-transfer bandwidth. Vercel Hobby is personal/non-commercial only, so it was not selected for this workplace tool.
Sources:
- https://www.netlify.com/blog/introducing-netlify-free-plan/
- https://www.netlify.com/pricing/
- https://vercel.com/docs/limits/fair-use-guidelines

## Verified retrieval, not an assumed pattern
On 5 November 2026, the official TB010061713 product HTML exposed HERO and ALT2–ALT7, all downloaded successfully as 2600×2600 photos. The hero was visually inspected. A separately tested short `/images/` URL returned a 2000×2000 logo placeholder and is deliberately NOT used.

The official CDN route `https://assets.timberland.com/image/upload/f_png,w_400/TB010061713-HERO` returned a genuine 400×400 boot photo. HERO and ALT2–ALT7 returned usable image files; ALT1, ALT8–ALT10 and ALT99 returned HTTP 404. Runtime retrieval uses this verified `/image/upload/` route with width 1200, checks HERO and ALT1–ALT10, and removes failed or undersized responses and the observed 2000×2000 default placeholder. The verified sample uses explicit full URLs extracted from the official product page. Results are never padded with blank slots. Official page extraction utilities are included for future maintenance but are not needed to run or deploy the app.

Limits: TB010061713 and TB010073001 were verified in the browser, with seven photos each before editing. Other styles can use different asset names or be unavailable in the US catalog. Such styles show an explicit failure with Retry, rather than fabricated images. Assets beyond ALT10 or alternate naming schemes are not automatically discovered. CDN availability and naming can change. Verify the pictured style and colour before importing into Shopify. The browser does not recognize every possible logo visually; protection relies on exact style-specific paths, failed-image filtering and observed placeholder dimensions.

## Inputs and output
Paste full 11-character TB codes, separated by lines, spaces, commas or semicolons. Pasted handles default to lowercase codes. Spreadsheet imports read all worksheets, find Handle and Item Code headers, and preserve handle values as strings. Blank rows are ignored; incomplete/invalid rows are reported. Duplicate handle + code pairs are skipped. The same code may be used with different handles.

Drag within a product or use arrow buttons to reorder; delete photos with ×. The first remaining image is always the hero. Edit a handle in its field if needed.

Export produces real .xlsx files with exactly: Handle, Item Code, Image Position, Image Src, Image Alt Text. One image per row. Position restarts at 1 per product. Alt text follows the current order: `<TB code>- hero view`, then `<TB code>- Alt 1`, etc. Export preview uses the same row builder as export.

New batch asks before clearing existing work. Workspace autosaves in localStorage on this browser and origin. It does not sync devices or keep previous batches. Imported file contents stay in the browser; style-specific photo requests go to Timberland. A no-login deployment can be opened by anyone who has its URL; local workspace data is not uploaded to Netlify. This is an independent tool, not an official Timberland service.
