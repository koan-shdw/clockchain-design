# AI & Agents section: builder brief (shared by every version)

Folder: `I:/DEV/clockchain/mockups/ai-agents/` (mockup only; the site repo `I:/DEV/clockchain/design` is NOT touched).

## Who and why

Clockchain (clockchain.network) is a verifiable time network: "The verifiable time layer for the digital world", "What time is it? Prove it." Its main promo page sells three services: Logging, Smart Contract Scheduling, Time Services. The team wants a new section on that page, after Use cases and before News, reached from a new nav item "AI & Agents". It tells visitors and investors that Clockchain does agents. It must not take attention from the three services.

Alex (designer, the client's frontend lead) asked for "a really dope motion graphic presentation", "not so much a slideshow", "in the style of Clockchain: the graphics, colours and themes we have established". It is a Three.js motion graphic that plays on its own (60-70 s loop), with captions under it. Three versions are built, one per visual direction, and Alex picks one. Every version must be fully designed and finished. He has a hard rule: never present undesigned work.

## What is already built (do not change these files)

- `v1.html`, `v2.html`, `v3.html`: the real page around the section. The nav comes from `site/components.js` with the new link. The Use cases bottom and News top are captured images. The section sits between them. Each page loads one scene: v1 `agents/scene-a.js`, v2 `agents/scene-b.js`, v3 `agents/scene-c.js`. These three files are placeholders now (a spinning wireframe). Your job is to replace YOUR ONE scene file.
- `agents/story.js`: the storyboard. Steps, durations and caption lines. Captions are rendered by the player under the stage, NOT by you. Read it.
- `agents/player.js`: the clock, the chapter marks, the progress ruler, the captions, lazy loading. Read its header for the scene contract.
- `agents/section.css`: the section styles. The stage is a rounded card. Desktop is about 1080 x 470 px (wide). Phone is about 350 x 370 px (nearly square). Chapter chips sit top-left over the stage, and a 44 px pause button sits top-right. Keep the important action clear of those corners.
- `site/styles.css`, `site/site.css`: the real site CSS. Read the tokens at the top of styles.css and the Use cases styles in site.css (`.uc-*`).

## The scene contract (from player.js)

```js
export default {
  init(ctx),   // ctx = { host, story, colors, w, h, dpr }. Append your canvas (and any CSS2D/CSS3D layer) to ctx.host. May be async.
  frame(s),    // s = { t, dt, total, step, stepId, stepT, line, lineT, ch, playing }
  resize(w, h),
  theme(colors) // colors = { accent, fg, fg2, fg3, line, line2, bg, bgAlt, surface, surface2, dark } as '#rrggbb'
}
```
- Draw as a pure function of (step, stepT) and (line, lineT). The viewer can jump to any step (chapter chips, ruler dots) or pause, and `?t=SECONDS` freezes any moment. Every frame must look right with no history. Ambient motion (slow drift, pulses, particles) may use `s.t`.
- Transitions: ease between step states inside the first ~0.6 s of a step (use stepT * dur). The loop goes end card to step 1, so make that seam clean (fade or settle).
- Colours come ONLY from `colors` and update live in `theme()`. The stage background is the site's `--surface`, so use a transparent WebGL canvas (`alpha: true`) and let it show. Light mode: white surface, dark ink, green #00cc00. Dark mode: near-black green-tinted surface, white ink, the same green. Both themes must look designed. Don't simply invert one. Additive glow that is gorgeous on black is mud on white, so branch on `colors.dark` where needed.
- Import Three.js as `import * as THREE from 'three'` and addons from `'three/addons/...'` (import map in the page, three@0.160.0). Nothing else external: no fetch, no other CDNs, no fonts beyond the page's (Inter, JetBrains Mono, Space Grotesk are loaded).
- Labels: use `CSS2DRenderer` (or `CSS3DRenderer` where the direction calls for it) from `three/addons/renderers/...` for crisp HTML text in the site fonts. Inject one `<style>` with classes prefixed `.ag-a-` / `.ag-b-` / `.ag-c-` (your version's letter). Style labels with the site CSS variables (`var(--fg)`, `var(--accent)`, `var(--f-mono)` ...) so they follow the theme by themselves. Use the site's label voice: JetBrains Mono, 10-11 px, uppercase, letter-spacing .12em; timestamps in mono like `12:04:31.114` with the milliseconds in green (that is how the hero clock shows time).
- Performance: cap pixel ratio at 2, keep geometry light, no heavy post-processing. It must run smoothly on a laptop and a phone. Pause cost is zero (the player stops calling frame).
- Phone: the stage is about 350 x 370. Re-frame the camera or layout by aspect ratio so everything stays readable. Labels may thin out on phone, but the key ones stay.
- No sound. No logos. No emoji.

## The site's established graphics (build from these)

Look at the captures `assets/now-1440-light.png`, `assets/now-1440-dark.png` and `assets/uc-bottom-1440-*.png`, and at `I:/DEV/clockchain/design/index.html` plus `hero-earth.js`.
- **Green ring nodes:** an 18 px circle, 2.5 px green border, background fill, soft green halo (`.uc-mark i`).
- **The ruler:** a hairline with major and minor ticks and mono timestamps (`12:04:31.114`) above it (`.uc-ruler`, `.uc-scale`, `.uc-mark span`).
- **Cards:** radius 18, 1 px `--line` border, `--surface` fill, 24 px padding; mono uppercase kickers; small mini-diagrams inside (e.g. "Agent A / Agent B / Agent C" lanes with dots on a time axis; dots in green, blue #3b7ddd, orange #d2691e).
- **Green chip text:** mono on a pale green fill (`Finance · Regulation · ...`).
- **The globe:** a fixed background wireframe Earth (graticule lines in accent green, faint) with city tags in mono ("London 11:55").
- **The hero clock card:** big light Inter digits `10:40:54` plus green `.159`, "BLOCK HEIGHT #10,086,970" in mono.
- **Typography:** headings are Inter Light (weight 300), large, tight tracking, with the key words in green. Body is Inter, grey.
- **Restraint:** thin lines, lots of air, one accent colour. "Dope" here means precise, cinematic and smooth, not neon clutter.

## The storyboard (story.js) and what each step must SHOW

Facts are fixed. Show only these, with no extra claims, actors or numbers. On-screen labels are short nouns from this list.

Chapter 01, AGENT HANDSHAKE (live on testnet). It is about identity only. NO money, NO contract, NO agreement may appear in chapter 1.

| id | what must be seen |
|---|---|
| meet | Two agents that have never met, apart and unconnected: BUYER AGENT (left) and PROVIDER AGENT (right). CLOCKCHAIN between them. |
| invite | An invite travels buyer agent → Clockchain → provider agent. |
| join | Both agents enter one private session (a bounded space) with scoped permissions (a visible limit or scope around each). |
| verify | The LEDGER appears. Each agent's identity is checked against it (a line from each agent to the ledger, a check). Label ERC-8004 once. |
| handshake, line 0 | Each agent signs locally (a signature or key mark at each agent). Nothing secret travels to Clockchain. |
| handshake, line 1 | The SAME certificate appears at both agents (identical twins). |
| handshake, line 2 | The outcome is anchored to the ledger with a timestamp. |
| handshake, line 3 | A witnessed, bounded channel opens between the two agents, with Clockchain as witness. |

Chapter 02, AGENT CONTRACT (in development).

| id | what must be seen |
|---|---|
| align, line 0 | Discovery: buyer needs matched to provider capabilities (several provider agents may appear; one matches). |
| align, line 1 | Provider agents send proposals that can be compared side by side (2-3 proposal tiles). |
| align, line 2 | Negotiation: terms go back and forth. Show the term labels SCOPE, MILESTONES, EVIDENCE, PRICING, PAYMENT GATES. |
| agree | The terms become one contract, readable by people and machines (e.g. text side + code/hash side). It is anchored to the ledger, and both sides get a signed acceptance certificate. |
| lock | The buyer authorizes funding. The funds go to a SETTLEMENT PROVIDER (external, its own node), where a lock closes. The AGENT CONTRACT node holds the rules and conditions and never holds the funds. The money must visibly go to the settlement provider, not to the contract. |
| run | Line 0: the provider agent does the work (milestone progress). Line 1: VERIFICATION checks it against the agreed criteria and produces an evidence package. Line 2: settlement releases the lock and pays the provider. Line 3: "We enable escrow without being the escrow": Clockchain and the contract stay outside the money path. Flow (deck slide 7): Buyer → Agent Contract → Settlement provider ← Verification → Provider, plus Agent Contract → Verification. |
| scale | The cycle repeats per milestone (M1 → M2 → M3). REPUTATION updates after each one (a scorecard ticking up). Then PROJECT COMPLETE closes the record. |
| end | End card. Caption: "Time your agents can prove." A calm settled composition, e.g. the whole trail visible on the ledger/time axis. Then the loop restarts. |

Never show: the names Clark or Clint, AI model names, internal component names (Tunnel, Bootstrap, Relay, Operator, Publisher), tool names, gate numbers, real company names, prices or amounts.

## Testing your scene (do this, and look at the images)

- `node tools/cap.mjs shot v1 light 1440 900 7000 "#agents" 12` saves `shots/v1-1440-light-t12.png`, frozen at t = 12 s, desktop light. Use `dark`, `390 844` for phone, and any t.
- Step start times (s): meet 0, invite 4.5, join 9, verify 13, handshake 17.5 (lines every 2.75), align 28.5 (lines every 3), agree 37.5, lock 44, run 50.5 (lines every 2.75), scale 61.5, end 68. Total 71.5. Sample mid-step (start + 2) and each handshake/run line.
- Read the PNGs with the Read tool and judge them honestly: composition, readability, both themes, phone. Iterate until every step reads clearly on its own.
- Console errors print in the capture output. There must be none from your scene (the CORS lines from the site's live clock widget are expected; ignore them).
- Headless Chrome renders WebGL through SwiftShader. Frame timing there is slow, which is fine, but the visuals must be right.
