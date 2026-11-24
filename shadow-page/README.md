# Clockchain Shadow page: handoff

The page is `shadow.html`, in the repo root. Everything that belongs only to this page is in this folder.

## Files to upload

| File | What it is |
|---|---|
| `shadow.html` (repo root) | The page |
| `shadow-page/shadow.css` | Page styles. Uses the site tokens only. |
| `shadow-page/story.js` | Animation storyboard: steps, timings, captions |
| `shadow-page/scene.js` | Animation scene: "the record and its shadow" (Three.js) |
| `shadow-page/player.js` | Shared animation player: chapters, captions, pause, reduced-motion still list |
| `shadow-page/player.css` | Player styles (agents/section.css + agents/r2.css from this repo) |

The page also uses these site files, which the live site already has at the root:
- `styles.css`, `site.css`, `app.js`, `components.js`, `contact.js`, `consent.js`
- `assets/favicon-32.png`, `assets/clockchain-logo-full.png`

Compared against koan-shdw/clockchain-preview-r2 `main` (the live site) on 2026-11-24:
- `styles.css`, `app.js`, `contact.js` and `consent.js` are identical.
- `site.css` and `components.js` differ only in parts this page doesn't use: the `.cmp-card` padding and the nav/footer link targets.

External resources the page loads:
- Three.js 0.160.0 from cdn.jsdelivr.net, via the import map in `shadow.html`
- Google Fonts


## Before it goes live

1. **Booking link.** Set `window.SHADOW_BOOKING_URL` near the top of `shadow.html`.
   - Empty (today): the buttons read "Start free on testnet" (Quickstart) and "Talk to the team" (the site's contact form).
   - Set: the buttons read "Book a demo" and "Start free".
2. **Review-only pieces.** Remove these:
   - the `<div class="sp-review">` block (the booking-state switch)
   - the `?book=1` line in the CTA setup script
   - `<meta name="robots" content="noindex">`
3. **MCP docs link.** In the "Built on Clockchain" section, the link goes to `app/docs/mcp.html` (this preview's copy of the docs). On the live site, point it at the real MCP docs.
4. **Cache tags.** Bump the `?v=` numbers if the files change after upload.

## Review material (not uploaded)

Kept in `mockups/shadow/`:
- `BRIEF.md`: the audit of the old kit page, storyboard, fixed facts and banned words
- `concept/`: concept key frames
