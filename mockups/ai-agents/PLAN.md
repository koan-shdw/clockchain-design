# AI & Agents section: mockup run (GO 2026-10-27)

Purpose (his words): a new section on the main promo page, "a really dope motion graphic presentation" that explains how agents handshake and contract with Clockchain, in the site's established graphics, colours and themes, same width as everything else. Nav item "AI & Agents" jumps straight to it. It must not take away from the three services; it tells investors and visitors Clockchain does agents.

Decisions so far:
- Sources: Yang's deck slides 28 (handshake), 2, 3, 7 (agent contract), plus mcp.clockchain.network/#handshake. Slide 7 cleared for public use (Alex, 10-27).
- Tags: Agent Handshake = Live on testnet; Agent Contract = In development (Alex yes).
- Slide 28 internals stay out: Clark/Clint, models, Tunnel/Bootstrap/Relay/Operator/Publisher, tool names (Alex yes).
- Placement: after Use cases, before News. Nav "AI & Agents" after Services.
- Plays on its own when scrolled into view, loops (~60 s), pause button, two chapter marks, no sound, light + dark, still list for reduced motion, Three.js loads only near the section.

Run steps:
- [x] 1. Capture Now (current page around Use cases / News), desktop 1440 + phone 390, light + dark (tools/cap.mjs now)
- [x] 2. Shared parts: story.js (storyboard), player.js (timing, captions, chapters, pause, lazy load), section.css, version pages v1-v3, BRIEF.md
- [x] 3. Workflow: 3 builders (A time axis, B globe, C cards) + review per version + fixes (run wf_28026811-9eb)
- [x] 4. Mockup shell index.html + now.html: Now / V1 / V2 / V3, theme, speed + picture height sliders, desktop + phone frames
- [x] 5. Check every version myself: desktop + phone, light + dark, screenshots (fixed: V3 phone verification turned before its rows ticked; caption kicker column 232px; jump lands 94px under the top)
- [x] 6. Publish private artifact https://claude.ai/artifact/H7Y2fF8vV56wfDbNUWXoHg; one line in Clockchain memory
