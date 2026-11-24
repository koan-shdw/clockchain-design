# Clockchain Shadow page: redesign brief (2026-11-24)

Review mockup for KOAN only. Not a change to the live page (mcp.clockchain.network/shadow/kit/ is YT's, not in our repos).

KOAN's ask: match our style; find areas to improve; add the main-page infographic animation to illustrate, push the CTA and promote Clockchain; subtle touches that show it's a product, still on brand.

Background: Claude Doc "Clockchain Shadow: what it is and where it goes" (https://claude.ai/artifact/58B6isdzLG68vHSPEq6YAs).

## Captured (2026-11-24, built-in browser; the cloud proxy blocks mcp.clockchain.network)

- `current/live-desktop-hero.jpg`, `current/live-phone-hero.jpg`: the live kit page.
- `current/film-*.jpg`: frames of the 17 s film (assets/shadow-promo.mp4, 16.8 s, 1920x1080). Source of every value in the animation.
- Dark mode: none. kit.css has no `prefers-color-scheme` and no theme switch, so there is nothing to capture.

## Audit: what's off today

Style (vs clockchain.network, preview-r2 main):
- Display type is Space Grotesk 600. Site is Inter Light (`data-font="inter"`, `data-headweight="light"`).
- Green is forest `#0a9d44`. Site is the logo green `#00cc00` (`data-accent="bright"`).
- Primary button is black. Site primary is green, secondary is outline.
- Own small nav (clock icon + "Clockchain Shadow"). No Clockchain logo, no site nav, no way back to clockchain.network.
- No dark mode. Site has Daylight / Eclipse with a switch.
- Footer is one line. No Clockchain footer, no company, no legal links.
- No site motifs: no ruler / time axis, no live dot, no grid, no clock card.

Content and flow:
- Primary CTA is broken: "Book a demo" (nav, hero, booking section) goes to `#book`, where the button reads "Booking link not set yet" (CALENDLY_URL). Three dead ends, one of them the first thing on the page.
- On phone the film is below the fold; first screen is headline + copy + dead button.
- "How it works" is a 4-row text list next to a film that already shows it. The film can't be paused per step, has no captions in the page, and isn't reachable for people who turn motion off (poster only).
- Clockchain isn't explained. "Anchors their fingerprints on a ledger": which ledger, whose? No link to Proof, Audit, Trusted Time, the MCP site or the main site.
- "Design partners" is in the eyebrow but the program is 5 sections down.
- The honest limits are good and must stay, but they read as a wall of 8 dashes.
- "For agents" box is last, after the booking section; the copy prompt is one of the best CTAs on the page.

Keep (it's good):
- Headline, lede, the six feature rows, the honest limits, partner terms, the agent prompt, the Markdown / llms.txt links.

## Redesign: what changes

Style:
- Site nav and footer (components.js), Clockchain logo, theme switch, Daylight + Eclipse.
- Site type and green: Inter Light display, `.h2` with green `<em>`, mono green `.tag` eyebrows, green primary + outline buttons, site cards, radius, shadows, `--band` rhythm.

Product touches (subtle, on brand):
- Product bar: a slim sticky bar under the site nav: Shadow mark, "Flight recorder for AI agents", Testnet pill, page links, one CTA. Tells you you're on a product inside Clockchain.
- Shadow mark: the Clockchain ring with a soft offset copy behind it (its shadow). Only on this page.
- Product chip on every section tag: "Shadow ·" before the section name.
- One extra motif: a dashed "recorded" line next to the solid ledger line (the record, and its shadow on the ledger). Used in the hero card and the animation's ruler only.

CTA (works with and without a booking link):
- One setting: `SHADOW_BOOKING_URL` in the page (empty today).
- Link set: primary "Book a demo" (opens the link), secondary "Start free".
- Link empty: primary "Start free on testnet" (Quickstart), secondary "Talk to the team" (the site's existing contact form, `data-contact`). No disabled button anywhere.
- Same CTA in 4 places: product bar, hero, after the animation, closing card. Agent prompt moves up beside the closing card as the third way in.
- Mockup has a switch to show both states.

Promote Clockchain:
- "Built on Clockchain" band after the hero: Shadow = Proof + Commitments & Audit + Trusted Time, each one line, linked to the services and MCP docs. Says "the five services are the toolbox; Shadow is made from it."
- The animation shows the Clockchain card and the ledger with real block numbers.
- Footer of the page: "Shadow is built on Clockchain, the verifiable time network" + link to the home page.

Infographic animation (main-page style, shared player):
- Replaces the "How it works" list. Same player, tabs, ruler, captions, pause, still list for reduced motion as the AI & Agents section and the MCP demo.
- Two chapters: 01 Record and share, 02 Change one character. Both "Live on testnet".
- The film stays in the hero (it's the real run). The animation explains it step by step.
- Small static infographic in "What a pass means": the verifier's checks card from the film (content fail, others as shown).

## Storyboard: the animation

Files: `story-shadow.js` (window.CC_STORY_SHADOW), `scene-shadow.js` (scene, card engine from clockchain-dashboard agents/scene-server.js), shared `agents/player.js`.

Fixed facts (all from the film and the kit page, 2026-11-24):
- Agent: codex. Session "Changelog draft". Started with `node run2.mjs`. Synthetic task, own key.
- Task: "Turn these three testnet release notes into a two-line changelog."
- Recorded steps: seq 4 task 701b6153, seq 5 tool_call 3eaed678 (read_file), seq 6 tool_result a8cb9a96, seq 7 message be62ef5d.
- Step 7 message: "Faster receipt lookups and clearer pending states. Fixed a retry loop when the network is slow."
- Ledger: start marker block 313,491; checkpoint of steps 1–7 block 313,492; signed checkpoint block 313,493. Network clockchain-testnet.
- Close: succeeded, 10 steps. Viewer link mcp.clockchain.network/shadow/s/•••••• plus a pin, sent separately.
- Viewer: "Result: pass. No check failed."
- Edit: "Faster" becomes "Fastor".
- Verifier (offline, on the copy): format pass, content fail, sequence pass, membership pass, signature pass, trust pass, identity not applicable, coverage pass, provenance pass, completion pass, anchors pass, witness indeterminate, time indeterminate, truth not applicable. "One or more steps changed after they were recorded."
- Connector: mcp.clockchain.network/shadow/mcp. Free testnet account, no email.

Banned on screen: compliance-ready, audit-grade, compliant, tamper-proof, immutable, guarantee, proves the agent was right, black box, surveillance, mainnet, production, any number not listed above.

Steps (seconds; each caption line gets an equal share of its step):

| # | Ch | Step | Dur | Caption lines |
|---|----|------|-----|---------------|
| 1 | 01 | Connect | 5 | Add one connector to the agent you already use. Free testnet account, no email. |
| 2 | 01 | Record | 10 | Codex gets a synthetic task: turn three release notes into a two-line changelog. / Each step is recorded as it happens: the task, the tool call, its result, the message. / Steps are numbered and chained, so a missing or reordered step shows up. |
| 3 | 01 | Anchor | 8 | Only fingerprints go to Clockchain. Steps 1–7 are checkpointed in block 313,492. / The content stays on the Shadow server. The ledger holds no step content. |
| 4 | 01 | Share | 7 | Close the session: 10 steps, one link, and a pin. / Send the pin separately. It lets the other person check who signed. |
| 5 | 01 | Check | 8 | A second person opens the link in their own browser. No account. / Result: pass. Each step shows its time window between ledger receipts. |
| 6 | 02 | Change | 6 | Someone changes one character in step 7: Faster becomes Fastor. |
| 7 | 02 | Re-check | 9 | Shadow's verifier checks the copy again, offline. / Content: fail. One or more steps changed after they were recorded. |
| 8 | 02 | What a pass means | 6 | A pass means the record is intact. It doesn't mean the agent was right. |
| 9 | end | | 4 | Something to check, instead of a screenshot. |

Total 63.5 s.

Cards on stage (wide): Agent (codex), Record (step list with seq + hash, chained), Clockchain (clock), ledger ruler with block marks 313,491 / 313,492 / 313,493, Viewer (link, result), Pin, Message (step 7), Checks.
Phone: same cards, stacked, one or two at a time.

## Review checklist

- Every frame reads on its own (screenshots per step, light + dark, desktop + phone).
- No sideways scroll at 390 px.
- Reduced motion: still list shows all steps.
- Both CTA states.
