/* Clockchain Shadow · how it works, as cards.
   The card engine from the MCP demo (clockchain-dashboard agents/scene-server.js), telling the Shadow film:
   an agent records each step, Clockchain anchors the fingerprints, one link is shared and checks, then one
   character changes and the verifier fails it. Every card is real HTML in the site's fonts and tokens (CSS3DRenderer),
   linked by WebGL hairlines and travelling pulses drawn with the same camera.
   Everything is a pure function of story time: frame(s) builds the picture from (beat, time in beat).
   Story: story-shadow.js (window.CC_STORY_SHADOW). Values: BRIEF.md, "Fixed facts". */
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

/* ---------------- small maths ---------------- */
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo = (k) => 1 - Math.pow(1 - k, 3);
const eo4 = (k) => 1 - Math.pow(1 - k, 4);
const ei = (k) => k * k * k;
const eio = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const fract = (v) => v - Math.floor(v);
const DEG = Math.PI / 180;

/* ---------------- styles (the Agents card classes, .ag-c-, plus the film's cards) ---------------- */
const CSS = `
.ag-c-gl{position:absolute;inset:0;width:100%;height:100%;display:block}
.ag-c-layer{position:absolute;inset:0;pointer-events:none;
  --c-ink:color-mix(in oklab,var(--accent) 68%,black);
  --c-fill:var(--surface);
  --c-fig:color-mix(in oklab,var(--surface-2) 96%,var(--accent));
  --c-soft:color-mix(in oklab,var(--accent) 11%,var(--c-fill));
  --c-red:#e5484d;--c-red-ink:#c4363b;
  --c-red-soft:color-mix(in oklab,#e5484d 11%,var(--c-fill));
  font-family:var(--f-body);color:var(--fg);-webkit-font-smoothing:antialiased;font-weight:400}
:root[data-variant="eclipse"] .ag-c-layer{--c-ink:var(--accent);--c-fill:var(--surface-2);
  --c-fig:color-mix(in oklab,var(--surface) 94%,var(--accent));--c-red-ink:#ff8084;
  --c-soft:color-mix(in oklab,var(--accent) 16%,var(--c-fill));--c-red-soft:color-mix(in oklab,#e5484d 20%,var(--c-fill))}
.ag-c-layer *,.ag-c-layer *::before,.ag-c-layer *::after{box-sizing:border-box}
.ag-c-layer em,.ag-c-layer i{font-style:normal}
/* --on (0..1) lights a card, --dm (0..1) quiets its content; both are set every frame from story time */
.ag-c-card{background:var(--c-fill);border:1px solid color-mix(in oklab,var(--accent-line) calc(var(--on,0) * 100%),var(--line));border-radius:18px;padding:15px 16px 16px;
  box-shadow:var(--shadow),0 0 0 calc(4px * var(--on,0)) var(--accent-soft);color:var(--fg);backface-visibility:hidden;-webkit-backface-visibility:hidden}
.ag-c-card.is-bad{border-color:color-mix(in oklab,var(--c-red) 70%,var(--line));box-shadow:var(--shadow),0 0 0 4px var(--c-red-soft)}
.ag-c-card > :not(.ag-c-port){opacity:calc(1 - .5 * var(--dm,0))}
.ag-c-k{display:flex;align-items:center;gap:8px;min-height:14px;font:500 10.5px/1.3 var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-2);white-space:nowrap}
.ag-c-k .r{margin-left:auto}
.ag-c-t{margin-top:6px;font:300 20px/1.15 var(--f-display);letter-spacing:-.018em;color:var(--fg);white-space:nowrap}
.ag-c-chip{display:inline-flex;align-items:center;gap:6px;height:21px;padding:0 8px;border-radius:7px;background:var(--accent-soft);color:var(--c-ink);font:500 10px/1 var(--f-mono);letter-spacing:.1em;text-transform:uppercase;white-space:nowrap}
.ag-c-chip.n{background:var(--line);color:var(--fg-2)}
.ag-c-pill{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 13px;border-radius:999px;border:1px solid var(--accent-line);
  background:var(--c-soft);color:var(--c-ink);font:500 10.5px/1 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;
  box-shadow:var(--shadow);backface-visibility:hidden;-webkit-backface-visibility:hidden}
.ag-c-pill.red{background:var(--c-red-soft);color:var(--c-red-ink);border-color:color-mix(in oklab,var(--c-red) 50%,transparent)}
.ag-c-pill svg{width:14px;height:14px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ag-c-ring{display:block;width:18px;height:18px;border-radius:50%;flex:none;border:2.5px solid var(--accent);background:var(--c-fill);box-shadow:0 0 0 5px var(--accent-soft)}
.ag-c-ring.sm{width:11px;height:11px;border-width:2px;box-shadow:0 0 0 3px var(--accent-soft)}
.ag-c-port{position:absolute;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;border:1.5px solid var(--line-2);background:var(--c-fill);opacity:0;z-index:2}
.ag-c-port.g{border-color:var(--accent)} .ag-c-port.r{border-color:var(--c-red)}
.ag-c-time{font:400 11px/1 var(--f-mono);color:var(--fg-2);font-variant-numeric:tabular-nums;white-space:nowrap;letter-spacing:0}
.ag-c-time em{font-style:normal;color:var(--c-ink)}
.ag-c-hash{font:500 10.5px/1 var(--f-mono);letter-spacing:.08em;color:var(--c-ink);white-space:nowrap}
.ag-c-sub{margin-top:10px;display:flex;align-items:center;gap:8px;font:400 10px/1.2 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--fg-3);white-space:nowrap}
.ag-c-sub b{font-weight:500;color:var(--c-ink)}
.ag-c-caret{display:inline-block;width:1.5px;height:1.05em;margin-left:1px;vertical-align:-2px;background:var(--accent)}
/* items: on desktop the label sits above its value */
.ag-c-kvs{margin-top:12px;background:var(--c-fig);border:1px solid var(--line);border-radius:12px;padding:4px;display:flex;flex-direction:column;gap:3px}
.ag-c-kv{display:flex;flex-direction:column;gap:5px;padding:7px 9px 8px;border-radius:8px}
.ag-c-kv > em{display:flex;align-items:center;gap:8px;min-height:11px;font:500 9.5px/1 var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-3);white-space:nowrap}
.ag-c-kv > em i{margin-left:auto;letter-spacing:.1em;color:var(--c-ink);opacity:0}
.ag-c-kv > span{min-height:14px;font:400 11.5px/1.2 var(--f-mono);color:var(--fg-3);white-space:nowrap;letter-spacing:0}
.ag-c-kv.live > span,.ag-c-kv.ok > span{color:var(--fg)}
.ag-c-kv.ok{background:var(--accent-soft)}
.ag-c-kv.tg > em i{opacity:1}
.ag-c-kv.hl{box-shadow:inset 0 0 0 1px var(--fg-3)}
.ag-c-kv.bad{background:var(--c-red-soft)}
.ag-c-kv.bad > em,.ag-c-kv.bad > span{color:var(--c-red-ink)}
/* one status line under a card's items */
.ag-c-note{margin-top:10px;display:flex;align-items:center;gap:8px;height:28px;padding:0 10px;border-radius:8px;background:var(--line);font-size:12px;color:var(--fg-2);white-space:nowrap}
.ag-c-note b{font-weight:400}
.ag-c-note .ic{display:none;width:14px;height:14px;flex:none}
.ag-c-note .ic svg{display:block;width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ag-c-note.ok{background:var(--accent-soft);color:var(--c-ink)} .ag-c-note.ok .ic-ok{display:block}
.ag-c-note.bad{background:var(--c-red-soft);color:var(--c-red-ink)} .ag-c-note.bad .ic-x{display:block}
/* agent */
.ag-c-agent{width:252px}
.ag-c-nokey{margin-top:10px;display:flex;align-items:center;gap:8px;font:400 10px/1.2 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--fg-3);white-space:nowrap}
.ag-c-card > .ag-c-nokey{opacity:calc(var(--nk,0) * (1 - .5 * var(--dm,0)))}
.ag-c-nokey svg{width:15px;height:15px;flex:none;fill:none;stroke:var(--fg-3);stroke-width:1.5;stroke-linecap:round}
.ag-c-nokey b{font-weight:500;color:var(--c-ink)}
/* the tool call */
.ag-c-call{width:214px;padding:12px 14px 13px;border-radius:16px}
.ag-c-line{margin-top:8px;display:flex;align-items:center;gap:6px;font:500 13px/1 var(--f-mono);color:var(--fg);white-space:nowrap}
.ag-c-line i{color:var(--c-ink)}
.ag-c-hashbox{margin-top:10px;padding:8px 10px;border-radius:9px;background:var(--accent-soft);display:flex;flex-direction:column;gap:6px}
.ag-c-hashbox .ag-c-sub{margin-top:0;letter-spacing:.08em}
.ag-c-hashbox .ag-c-hash{min-height:12px}
/* clockchain */
.ag-c-clock{width:220px}
.ag-c-hms{margin-top:10px;font:300 33px/1 var(--f-display);letter-spacing:-.03em;color:var(--fg);font-variant-numeric:tabular-nums;white-space:nowrap}
.ag-c-hms em{font-style:normal;color:var(--accent)}
.ag-c-clockp{gap:9px;color:var(--fg)} .ag-c-clockp b{font-weight:500;color:var(--fg)} .ag-c-clockp .ag-c-time{font-size:11px}
.ag-c-url{margin-top:12px;display:inline-flex;align-items:center;height:28px;padding:0 11px;border-radius:999px;background:var(--accent-soft);font:500 11.5px/1 var(--f-mono);color:var(--c-ink);white-space:nowrap}
/* ledger entry, receipt */
.ag-c-entry{width:286px}
.ag-c-receipt{width:364px}
.ag-c-seal{display:grid;place-items:center;margin-left:auto;width:20px;height:20px;border-radius:50%;border:2px solid var(--accent);box-shadow:0 0 0 4px var(--accent-soft);flex:none;
  opacity:var(--sl,0);transform:scale(calc(.6 + .4 * var(--sl,0)))}
.ag-c-seal svg{width:12px;height:12px;fill:none;stroke:var(--c-ink);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
/* ledger */
.ag-c-lk{font:500 10.5px/1 var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-3);white-space:nowrap}
.ag-c-mark{width:124px;display:flex;flex-direction:column;align-items:center}
.ag-c-mark .ag-c-ring{margin-bottom:9px}
.ag-c-mark .ag-c-time{font-size:11px}
.ag-c-mark b{margin-top:5px;font:500 9.5px/1 var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-3)}
/* phone: compact cards; items sit on one line */
.ag-c-layer.tall .ag-c-card{padding:10px 11px 11px;border-radius:14px}
.ag-c-layer.tall .ag-c-k{font-size:9.5px;letter-spacing:.12em;min-height:12px;gap:6px}
.ag-c-layer.tall .ag-c-t{font-size:15px;margin-top:3px}
.ag-c-layer.tall .ag-c-chip{height:17px;padding:0 6px;font-size:8.5px}
.ag-c-layer.tall .ag-c-kvs{margin-top:7px;padding:3px;border-radius:9px;gap:2px}
.ag-c-layer.tall .ag-c-kv{flex-direction:row;align-items:center;gap:8px;height:22px;padding:0 6px}
.ag-c-layer.tall .ag-c-kv > em{flex:none;width:52px;min-height:0;font-size:8px;letter-spacing:.08em}
.ag-c-layer.tall .ag-c-kv > em i{display:none}
.ag-c-layer.tall .ag-c-kv > span{min-height:0;font-size:9.5px}
.ag-c-layer.tall .ag-c-note{margin-top:6px;height:22px;padding:0 7px;gap:6px;font-size:10.5px}
.ag-c-layer.tall .ag-c-note .ic,.ag-c-layer.tall .ag-c-note .ic svg{width:12px;height:12px}
.ag-c-layer.tall .ag-c-nokey{margin-top:6px;font-size:8.5px;gap:6px}
.ag-c-layer.tall .ag-c-nokey svg{width:12px;height:12px}
.ag-c-layer.tall .ag-c-agent{width:236px}
.ag-c-layer.tall .ag-c-call{width:200px;padding:8px 11px 9px}
.ag-c-layer.tall .ag-c-line{margin-top:5px;font-size:11.5px}
.ag-c-layer.tall .ag-c-hashbox{margin-top:6px;padding:5px 7px;gap:4px}
.ag-c-layer.tall .ag-c-hashbox .ag-c-sub{display:none}
.ag-c-layer.tall .ag-c-hash{font-size:9.5px;letter-spacing:.04em}
.ag-c-layer.tall .ag-c-entry{width:262px}
.ag-c-layer.tall .ag-c-receipt{width:318px}
.ag-c-layer.tall .ag-c-clock{width:196px}
.ag-c-layer.tall .ag-c-hms{font-size:25px;margin-top:6px}
.ag-c-layer.tall .ag-c-sub{margin-top:6px;font-size:9px}
.ag-c-layer.tall .ag-c-url{margin-top:8px;height:22px;padding:0 9px;font-size:10px}
.ag-c-layer.tall .ag-c-seal{width:16px;height:16px;box-shadow:0 0 0 3px var(--accent-soft)}
.ag-c-layer.tall .ag-c-seal svg{width:10px;height:10px}
.ag-c-layer.tall .ag-c-mark{width:100px}
.ag-c-layer.tall .ag-c-mark .ag-c-ring{width:14px;height:14px;border-width:2px;box-shadow:0 0 0 4px var(--accent-soft);margin-bottom:6px}
.ag-c-layer.tall .ag-c-mark .ag-c-time{font-size:9.5px}
.ag-c-layer.tall .ag-c-mark b{font-size:8.5px;margin-top:4px}
.ag-c-layer.tall .ag-c-lk{font-size:9.5px}
.ag-c-layer.tall .ag-c-pill{height:24px;padding:0 9px;font-size:9px;gap:5px}
.ag-c-layer.tall .ag-c-clockp .ag-c-time{display:none}
/* short wide stages: the scene is drawn smaller, so the mono labels step up */
.ag-c-layer.lo .ag-c-k{font-size:12px;letter-spacing:.05em}
.ag-c-layer.lo .ag-c-chip{font-size:11px;letter-spacing:.05em}
.ag-c-layer.lo .ag-c-pill{font-size:11.5px;letter-spacing:.06em}
.ag-c-layer.lo .ag-c-kv > em{font-size:11px;letter-spacing:.06em}
.ag-c-layer.lo .ag-c-kv > span{font-size:12.5px}
.ag-c-layer.lo .ag-c-note{font-size:13px}
.ag-c-layer.lo .ag-c-nokey,.ag-c-layer.lo .ag-c-sub{font-size:11px;letter-spacing:.06em}
.ag-c-layer.lo .ag-c-hash{font-size:11.5px;letter-spacing:.04em}
.ag-c-layer.lo .ag-c-line{font-size:14px}
.ag-c-layer.lo .ag-c-time,.ag-c-layer.lo .ag-c-mark .ag-c-time{font-size:12px}
.ag-c-layer.lo .ag-c-mark b,.ag-c-layer.lo .ag-c-lk{font-size:11px;letter-spacing:.08em}
.ag-c-layer.lo .ag-c-url{font-size:12.5px}
.ag-c-layer.lo .ag-c-agent{width:268px}
.ag-c-layer.lo .ag-c-call{width:230px}
.ag-c-layer.lo .ag-c-entry{width:300px}
.ag-c-layer.lo .ag-c-receipt{width:384px}
/* ---------- Shadow cards ---------- */
.ag-c-layer{--c-amb:#b45309}
:root[data-variant="eclipse"] .ag-c-layer{--c-amb:#f0a14a}
.ag-c-pill.n{background:var(--c-fill);color:var(--fg-2);border-color:var(--line-2)}
.ag-c-sh{width:300px}
.ag-c-sh .ag-c-url{margin-top:12px}
.ag-c-rec{width:318px}
.ag-c-rows{margin-top:12px;background:var(--c-fig);border:1px solid var(--line);border-radius:12px;padding:4px;display:flex;flex-direction:column;gap:3px}
.ag-c-row{position:relative;display:grid;grid-template-columns:16px 24px 92px 1fr;align-items:center;gap:6px;height:30px;padding:0 9px;border-radius:8px;
  font:400 11.5px/1 var(--f-mono);color:var(--fg-3);white-space:nowrap;letter-spacing:0}
.ag-c-row .lk{width:9px;height:9px;border-radius:50%;border:1.5px solid var(--line-2);background:var(--c-fill)}
.ag-c-row .n{color:var(--fg-3)}
.ag-c-row .h{text-align:right;color:var(--fg-3)}
.ag-c-row::before{content:"";position:absolute;left:13.5px;top:-11px;height:16px;width:1.5px;background:var(--line-2)}
.ag-c-row:first-child::before{display:none}
.ag-c-row.live{color:var(--fg)} .ag-c-row.live .h{color:var(--fg-2)}
.ag-c-row.ch .lk{border-color:var(--accent);background:var(--accent)}
.ag-c-row.ch::before{background:var(--accent)}
.ag-c-row.ok{background:var(--accent-soft)} .ag-c-row.ok .h{color:var(--c-ink)}
.ag-c-close{width:344px}
.ag-c-view{width:420px}
.ag-c-view .ag-c-url{margin-top:10px}
.ag-c-vrows{margin-top:10px;display:flex;flex-direction:column;border-top:1px solid var(--line)}
.ag-c-vrow{display:grid;grid-template-columns:20px 1fr auto;gap:8px;align-items:center;height:31px;border-bottom:1px solid var(--line);font-size:12px;color:var(--fg-3);white-space:nowrap}
.ag-c-vrow > em{font:400 10.5px/1 var(--f-mono);color:var(--fg-3)}
.ag-c-vrow > span{overflow:hidden;text-overflow:ellipsis}
.ag-c-vrow > i{font:500 9.5px/1 var(--f-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--c-ink);opacity:0}
.ag-c-vrow.live{color:var(--fg)}
.ag-c-vrow.ok > i{opacity:1}
.ag-c-msg{width:350px}
.ag-c-msgt{margin-top:10px;font:300 19px/1.4 var(--f-display);letter-spacing:-.01em;color:var(--fg);white-space:normal}
.ag-c-msgt u{text-decoration:none;background:var(--c-red-soft);color:var(--c-red-ink);border-radius:3px;box-shadow:0 0 0 2px var(--c-red-soft)}
.ag-c-chk{width:404px}
.ag-c-cgrid{margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:2px 14px;background:var(--c-fig);border:1px solid var(--line);border-radius:12px;padding:6px 10px}
.ag-c-cr{display:flex;align-items:center;justify-content:space-between;gap:8px;height:24px;padding:0 6px;margin:0 -6px;border-radius:6px;font:400 11px/1 var(--f-mono);color:var(--fg-3);white-space:nowrap;letter-spacing:0}
.ag-c-cr > b{font-weight:500}
.ag-c-cr.live{color:var(--fg)}
.ag-c-cr.pass > b{color:var(--c-ink)} .ag-c-cr.ind > b{color:var(--c-amb)} .ag-c-cr.na > b{color:var(--fg-3);font-weight:400}
.ag-c-cr.fail{background:var(--c-red-soft);color:var(--c-red-ink)} .ag-c-cr.fail > b{color:var(--c-red-ink)}
.ag-c-brand{width:340px;text-align:center;display:flex;flex-direction:column;align-items:center}
.ag-c-brand .ag-c-k{justify-content:center}
.ag-c-brand .ag-c-t{font-size:22px;margin-top:10px}
.ag-c-brand .ag-c-url{margin-top:14px}
.ag-c-brand .ag-c-sub{justify-content:center}
.ag-c-mark b{white-space:nowrap}
.ag-c-layer.tall .ag-c-sh{width:262px}
.ag-c-layer.tall .ag-c-rec{width:290px}
.ag-c-layer.tall .ag-c-rows{margin-top:7px;padding:3px;border-radius:9px;gap:2px}
.ag-c-layer.tall .ag-c-row{height:23px;font-size:9.5px;grid-template-columns:12px 18px 76px 1fr;gap:5px;padding:0 6px}
.ag-c-layer.tall .ag-c-row::before{left:9.5px;top:-8px;height:12px}
.ag-c-layer.tall .ag-c-row .lk{width:8px;height:8px}
.ag-c-layer.tall .ag-c-close{width:262px}
.ag-c-layer.tall .ag-c-view{width:318px}
.ag-c-layer.tall .ag-c-vrow{height:24px;font-size:10px;grid-template-columns:14px 1fr auto;gap:6px}
.ag-c-layer.tall .ag-c-vrow > em{font-size:9px}
.ag-c-layer.tall .ag-c-vrow > i{font-size:8px}
.ag-c-layer.tall .ag-c-msg{width:282px}
.ag-c-layer.tall .ag-c-msgt{font-size:15.5px;margin-top:6px}
.ag-c-layer.tall .ag-c-chk{width:318px}
.ag-c-layer.tall .ag-c-cgrid{margin-top:7px;padding:4px 8px;gap:1px 10px}
.ag-c-layer.tall .ag-c-cr{height:19px;font-size:9px}
.ag-c-layer.tall .ag-c-brand{width:290px}
.ag-c-layer.tall .ag-c-brand .ag-c-t{font-size:17px}
.ag-c-layer.lo .ag-c-row,.ag-c-layer.lo .ag-c-cr{font-size:12.5px}
.ag-c-layer.lo .ag-c-vrow{font-size:13px}
.ag-c-layer.lo .ag-c-vrow > em{font-size:11.5px}
.ag-c-layer.lo .ag-c-rec{width:350px}
.ag-c-layer.lo .ag-c-view{width:460px}
.ag-c-layer.lo .ag-c-chk{width:440px}
.ag-c-layer.lo .ag-c-sh{width:330px}
.ag-c-layer.lo .ag-c-close{width:372px}
.ag-c-chk .ag-c-note,.ag-c-view .ag-c-note{height:auto;min-height:28px;padding:6px 10px;white-space:normal;line-height:1.3}
`;

/* ---------------- icons ---------------- */
const IC = {
  check: '<svg viewBox="0 0 14 14"><path d="M3.4 7.3l2.4 2.4 4.9-5.4"/></svg>',
  x: '<svg viewBox="0 0 14 14"><path d="M4.2 4.2l5.6 5.6M9.8 4.2l-5.6 5.6"/></svg>',
  key: '<svg viewBox="0 0 16 16"><circle cx="5" cy="8" r="2.9"/><path d="M7.9 8h6.3M12.1 8v2.5M14.2 8v1.9"/></svg>',
  link: '<svg viewBox="0 0 16 16"><path d="M6.6 9.4l2.8-2.8M7.2 4.6l1.1-1.1a2.6 2.6 0 013.7 3.7l-1.1 1.1M8.8 11.4l-1.1 1.1a2.6 2.6 0 01-3.7-3.7l1.1-1.1"/></svg>'
};
/* story clock: 01:29:34.197 at T = 0 (the time window on the film's viewer page, 2026-11-21 UTC) */
const tstr = (T) => {
  const v = 5374.197 + T; const h = Math.floor(v / 3600), m = Math.floor(v / 60) % 60, s = Math.floor(v) % 60;
  const ms = Math.min(999, Math.round((v - Math.floor(v)) * 1000));
  return [String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'), '.' + String(ms).padStart(3, '0')];
};
const tHTML = (T) => { const [a, b] = tstr(T); return a + '<em>' + b + '</em>'; };

/* ---------------- card markup ---------------- */
const kv = (f, label, tag = '') => `<div class="ag-c-kv" data-f="${f}"><em>${label}${tag ? `<i>${tag}</i>` : ''}</em><span>&mdash;</span></div>`;
const note = (f) => `<div class="ag-c-note" data-f="${f}"><span class="ic ic-ok">${IC.check}</span><span class="ic ic-x">${IC.x}</span><b></b></div>`;
const row = (f, n, k) => `<div class="ag-c-row" data-f="${f}"><i class="lk"></i><span class="n">${n}</span><span class="k">${k}</span><span class="h">&nbsp;</span></div>`;
const vrow = (f, n, s) => `<div class="ag-c-vrow" data-f="${f}"><em>${n}</em><span>${s}</span><i>pass</i></div>`;
/* the verifier's checks, in the film's order and with the film's results */
const CHECKS = [['format', 'pass'], ['content', 'fail'], ['sequence', 'pass'], ['membership', 'pass'], ['signature', 'pass'], ['trust', 'pass'], ['identity', 'not applicable'],
  ['coverage', 'pass'], ['provenance', 'pass'], ['completion', 'pass'], ['anchors', 'pass'], ['witness', 'indeterminate'], ['time', 'indeterminate'], ['truth', 'not applicable']];
const ORDER = [0, 7, 1, 8, 2, 9, 3, 10, 4, 11, 5, 12, 6, 13];   /* the grid fills by rows: this puts the film's first seven down the left column */
const MSG = 'Faster receipt lookups and clearer pending states. Fixed a retry loop when the network is slow.';
const VIEW_LINK = 'mcp.clockchain.network/shadow/s/••••••';

const HTML = {
  agent: [`<div class="ag-c-card ag-c-agent"><div class="ag-c-k"><span>Agent</span><span class="ag-c-chip n r">own key</span></div>
    <div class="ag-c-t">codex</div>
    <div class="ag-c-kvs">${kv('cn', 'Connector')}${kv('ac', 'Account')}${kv('lg', 'Logging')}</div></div>`],
  sh: [`<div class="ag-c-card ag-c-sh"><div class="ag-c-k"><i class="ag-c-ring sm"></i><span>Clockchain Shadow</span><span class="ag-c-chip r">Testnet</span></div>
    <div class="ag-c-t">Flight recorder</div>
    <div class="ag-c-url">mcp.clockchain.network/shadow/mcp</div>
    <div class="ag-c-sub"><b>Free account</b>&middot; no email</div></div>`],
  rec: [`<div class="ag-c-card ag-c-rec"><div class="ag-c-k"><span>Record</span><span class="ag-c-chip n r">Changelog draft</span></div>
    <div class="ag-c-rows">${row('r4', '04', 'task')}${row('r5', '05', 'tool_call')}${row('r6', '06', 'tool_result')}${row('r7', '07', 'message')}</div>${note('rn')}</div>`],
  clock: [`<div class="ag-c-card ag-c-clock"><div class="ag-c-k"><i class="ag-c-ring sm"></i><span>Clockchain</span></div>
    <div class="ag-c-hms" data-f="hms">01:29:34<em>.197</em></div><div class="ag-c-sub"><b data-f="st">Verifiable time</b></div></div>`],
  clockp: [`<div class="ag-c-pill ag-c-clockp"><i class="ag-c-ring sm"></i><b>Clockchain</b><span class="ag-c-time" data-f="hms"></span></div>`],
  close: [`<div class="ag-c-card ag-c-close"><div class="ag-c-k"><span>Session closed</span><span class="ag-c-chip r" data-f="cr">&nbsp;</span></div>
    <div class="ag-c-kvs">${kv('cs', 'Steps')}${kv('cc', 'Checkpoint', 'signed')}${kv('cl', 'Viewer link')}</div></div>`],
  link: [`<div class="ag-c-pill">${IC.link}<span>One link</span></div>`],
  pin: [`<div class="ag-c-pill n">${IC.key}<span>Pin &middot; sent separately</span></div>`],
  view: [`<div class="ag-c-card ag-c-view"><div class="ag-c-k"><span>Shadow evidence summary</span><span class="ag-c-seal">${IC.check}</span></div>
    <div class="ag-c-url">${VIEW_LINK}</div>
    <div class="ag-c-vrows">${vrow('v3', '3', 'Start marker on Clockchain, block 313491')}${vrow('v4', '4', 'Task assigned: Turn these three testnet release notes…')}${vrow('v7', '7', 'Message: Faster receipt lookups and clearer…')}${vrow('v8', '8', 'Checkpoint of steps 1–7 on Clockchain, block 313492')}</div>${note('vn')}</div>`],
  msg: [`<div class="ag-c-card ag-c-msg"><div class="ag-c-k"><span>Step 7 &middot; codex &middot; message</span><span class="ag-c-chip n r" data-f="mc">Recorded</span></div>
    <div class="ag-c-msgt" data-f="tx"></div></div>`],
  chk: [`<div class="ag-c-card ag-c-chk"><div class="ag-c-k"><span>Shadow’s verifier</span><span class="ag-c-chip n r">offline &middot; on the copy</span></div>
    <div class="ag-c-cgrid">${ORDER.map((i) => `<div class="ag-c-cr" data-f="c${i}"><span>${CHECKS[i][0]}</span><b>&nbsp;</b></div>`).join('')}</div>${note('kn')}</div>`],
  pOk: [`<div class="ag-c-pill">${IC.check}<span>Pass &middot; the record is intact</span></div>`],
  pNo: [`<div class="ag-c-pill n">${IC.x}<span>Not checked &middot; was the agent right</span></div>`],
  brand: [`<div class="ag-c-card ag-c-brand"><div class="ag-c-k"><i class="ag-c-ring sm"></i><span>Clockchain Shadow</span></div>
    <div class="ag-c-t">A flight recorder for AI agents</div>
    <div class="ag-c-url">mcp.clockchain.network/shadow/mcp</div>
    <div class="ag-c-sub"><b>Testnet</b>&middot; free account, no email</div></div>`],
  lk: [`<div class="ag-c-lk">Ledger</div>`],
  mA: [`<div class="ag-c-mark"><i class="ag-c-ring"></i><span class="ag-c-time">313,491</span><b>Start</b></div>`],
  mB: [`<div class="ag-c-mark"><i class="ag-c-ring"></i><span class="ag-c-time">313,492</span><b>Steps 1–7</b></div>`],
  mC: [`<div class="ag-c-mark"><i class="ag-c-ring"></i><span class="ag-c-time">313,493</span><b>Signed</b></div>`]
};
const HASHES = { r4: '701b6153', r5: '3eaed678', r6: 'a8cb9a96', r7: 'be62ef5d' };
/* story seconds the block marks land on the ledger */
const MA_T = 7.0, MB_T = 17.7, MC_T = 25.6;
/* ---------------- state ---------------- */
let renderer, glScene, camera, css, cssScene, layer, camEl;
let VW = 1, VH = 1, DPR = 1, W = true, FIT = 1, HOST = null;
let BEATS = [], BI = [];               /* beats = caption lines; BI[step] = index of the step's first beat */
const N = {};                          /* nodes (cards) */
let COL = null;
let pools, dots, halos;

/* ---------------- nodes ---------------- */
function makeNode(id) {
  const n = { id, faces: [], size: [{ w: 0, h: 0 }, { w: 0, h: 0 }], ox: 0, ay: 0, group: new THREE.Object3D(), ports: [{}, {}], vis: false, op: 0, face: 0 };
  HTML[id].forEach((h, i) => {
    const wrap = document.createElement('div'); wrap.innerHTML = h.trim();
    const el = wrap.firstElementChild;
    const obj = new CSS3DObject(el);
    el.style.pointerEvents = 'none';
    if (i === 1) { obj.rotation.y = Math.PI; obj.position.z = -0.6; } else obj.position.z = 0.6;
    obj.visible = false;
    n.group.add(obj);
    camEl.appendChild(el);
    n.faces.push({ el, obj, o: '' });
  });
  cssScene.add(n.group);
  N[id] = n;
}
const QC = new Map();
const Q = (id, f, face = 0) => {
  const k = id + '|' + f + '|' + face;
  let el = QC.get(k);
  if (el === undefined) { el = N[id].faces[face].el.querySelector('[data-f="' + f + '"]'); QC.set(k, el); }
  return el;
};

function measure() {
  layer.classList.toggle('tall', !W);
  for (const id in N) for (const f of N[id].faces) f.el.style.display = '';
  {
    const el = N.clock.faces[0].el, hm = el.querySelector('.ag-c-hms');
    el.style.width = '';
    const cs = getComputedStyle(el), need = hm.scrollWidth + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 10;
    if (need > el.offsetWidth) el.style.width = Math.ceil(need) + 'px';
  }
  for (const id in N) {
    const n = N[id];
    n.faces.forEach((f, i) => { n.size[i] = { w: f.el.offsetWidth, h: f.el.offsetHeight }; });
  }
  for (const id of ['mA', 'mB', 'mC']) N[id].ay = -(N[id].size[0].h / 2 - (W ? 9 : 7));
  for (const id in N) for (const f of N[id].faces) f.el.style.display = 'none';
}

/* port: 'r' 'l' 't' 'b' with an offset along the edge (px, world up / right), or 'o' for the layout point */
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function portLocal(n, f, key, pos, dir) {
  const s = n.size[f], side = key[0], off = key.length > 1 ? parseFloat(key.slice(1)) : 0;
  let x = 0, y = 0, dx = 0, dy = 0;
  if (side === 'r') { x = s.w / 2; y = off; dx = 1; }
  else if (side === 'l') { x = -s.w / 2; y = off; dx = -1; }
  else if (side === 't') { x = off; y = s.h / 2; dy = 1; }
  else if (side === 'b') { x = off; y = -s.h / 2; dy = -1; }
  else { x = 0; y = -n.ay; dy = 1; }
  x += n.ox;
  if (f === 1) { x = -x; dx = -dx; }
  pos.set(x, y, f === 1 ? -0.6 : 0.6); dir.set(dx, dy, 0);
}
function specMatrix(n, sp) {
  _e.set(sp.rx, sp.ry + (sp.face > 0.5 ? Math.PI : 0), 0); _q.setFromEuler(_e);
  _p.set(sp.x, sp.y + n.ay, sp.z); _s.setScalar(sp.s);
  return _m4.compose(_p, _q, _s);
}
function portFromSpec(id, key, sp, out, dout) {
  const n = N[id], f = sp.face > 0.5 ? 1 : 0;
  portLocal(n, f, key, out, dout);
  const m = specMatrix(n, sp); out.applyMatrix4(m); dout.transformDirection(m);
}
const bez = (a, b, c, d, u, o) => {
  const v = 1 - u;
  return o.set(v * v * v * a.x + 3 * v * v * u * b.x + 3 * v * u * u * c.x + u * u * u * d.x,
    v * v * v * a.y + 3 * v * v * u * b.y + 3 * v * u * u * c.y + u * u * u * d.y,
    v * v * v * a.z + 3 * v * v * u * b.z + 3 * v * u * u * c.z + u * u * u * d.z);
};
function epSpec(C, ep, P, Tn) {
  if (Array.isArray(ep)) return portFromSpec(ep[0], ep[1], C[ep[0]], P, Tn);
  P.set(ep.x, ep.y, ep.z || 0); Tn.set(ep.dir ? ep.dir[0] : 0, ep.dir ? ep.dir[1] : 0, 0);
}
/* a point at fraction u of a link's length, as the layout describes it (moves a card along its line) */
function alongRaw(C, Lk, u) {
  epSpec(C, Lk.a, _P0, _T0); epSpec(C, Lk.b, _P3, _T3);
  buildPath(Lk);
  pathAt(PATH.len * clamp(u), _Q);
  return { x: _Q.x, y: _Q.y, z: _Q.z };
}

/* ---------------- story beats ---------------- */
function buildBeats(story) {
  BEATS = []; BI = []; let t = 0;
  story.steps.forEach((s, si) => {
    BI[si] = BEATS.length; const n = s.lines.length;
    for (let i = 0; i < n; i++) BEATS.push({ id: s.id + i, t0: t + i * s.dur / n, dur: s.dur / n, step: si });
    t += s.dur;
  });
}

/* ---------------- layout: where every card is in a beat ---------------- */
const A = (x, y, z = 0, o) => Object.assign({ x, y, z, rx: 0, ry: 0, s: 1, o: 1, d: 0, face: 0, on: 0, dm: 0 }, o);
const MOVE = 0.9, FIN = 0.75, FOUT = 0.42;
const LYW = -176, LYT = -150;
/* a card lights up between a and b (story seconds inside the beat), with a short ramp */
const onAt = (lt, a, b = 1e9) => Math.min(seg(lt, a, a + 0.3), 1 - seg(lt, b, b + 0.3));
const PHASES = ['connect0', 'record0', 'record1', 'record2', 'anchor0', 'anchor1', 'share0', 'share1', 'check0', 'check1',
  'change0', 'recheck0', 'recheck1', 'means0', 'end0'];

function L(bi, lt) {
  const id = BEATS[bi].id, t0 = BEATS[bi].t0, T = t0 + lt;
  const C = {}, K = {};
  let cam = { x: 0, y: 0, zoom: 1, yaw: 0, pitch: 2 };
  const w = W;
  const pick = (a, b) => (w ? a : b);
  const AY = pick(10, 26), LY = pick(LYW, LYT), TILT = pick(7 * DEG, 0);
  /* block marks on the ledger, earliest on the left */
  const XA = pick(250, -20), XB = pick(345, 50), XC = pick(440, 120);
  const G = 'g', NN = 'n', R = 'r';
  const pulse = (t, a, b, rev) => { const k = seg(t, a, b); return k > 0 && k < 1 ? [{ u: rev ? 1 - eio(k) : eio(k) }] : []; };
  const pulses = (t, list) => list.reduce((r, [a, b]) => r.concat(pulse(t, a, b)), []);
  const amb = (speed, n, rev, ph = 0) => { const r = []; for (let i = 0; i < n; i++) { const u = fract(T * speed + i / n + ph); r.push({ u: rev ? 1 - u : u, soft: 1 }); } return r; };
  const ledger = (x) => ({ x, y: LY, z: 0, dir: [0, 1] });
  /* to the ledger: down to a bus just above the axis, across, then into the mark (or a straight drop) */
  const anc = (a, x, o, bus) => Object.assign({ a, b: ledger(x), c: G, w: 1.6 }, bus ? { via: [[null, LY + 18, 0], [x, LY + 18, 0]] } : { bend: 0 }, o);
  const ph = PHASES.indexOf(id);

  switch (id) {
    /* ===================== 01 · RECORD AND SHARE ===================== */
    case 'connect0': {
      if (w) {
        C.agent = A(-300, AY, 0, { ry: TILT, d: 0.1, on: onAt(lt, 0.5, 3.4) });
        C.sh = A(300, AY, -30, { ry: -TILT, d: 0.45, on: onAt(lt, 3.4) });
        K.as = { a: ['agent', 'r'], b: ['sh', 'l'], c: NN, d: 1.0 };
        K.asg = { a: ['agent', 'r'], b: ['sh', 'l'], c: G, w: 1.6, d: 1.6, pulses: pulse(lt, 2.6, 3.4) };
      } else {
        C.agent = A(0, 70, 0, { d: 0.1, s: 0.86, on: onAt(lt, 0.5, 3.4) });
        C.sh = A(0, -92, 0, { d: 0.45, s: 0.86, on: onAt(lt, 3.4) });
        K.asg = { a: ['agent', 'b'], b: ['sh', 't'], c: G, w: 1.6, d: 1.6, pulses: pulse(lt, 2.6, 3.4) };
      }
      cam = { x: 0, y: 0, zoom: lerp(0.96, 1, eo(seg(lt, 0, 4))), yaw: -1.5, pitch: 2 };
      break;
    }
    case 'record0': case 'record1': case 'record2': {
      const r = ph - 1;
      if (w) {
        C.agent = A(-390, AY, 0, { ry: TILT, s: 0.86, dm: r === 2 ? 0.6 : 0.2, on: r === 1 ? onAt(lt, 0, 2.9) : r === 0 ? onAt(lt, 0, 1.1) : 0 });
        C.rec = A(-20, AY, 10, { d: r === 0 ? 0.25 : 0, on: r === 2 ? onAt(lt, 0, 2.6) : onAt(lt, r === 0 ? 0.8 : 0) });
        C.clock = A(345, AY, -30, { ry: -TILT, d: r === 0 ? 0.5 : 0, on: r === 0 ? onAt(lt, 1.3, 2.4) : 0, dm: r === 2 ? 0.4 : 0 });
        K.ar = { a: ['agent', 'r'], b: ['rec', 'l'], c: G, w: 1.6, d: r === 0 ? 0.4 : 0, al: r === 2 ? 0.5 : 1,
          pulses: r === 0 ? pulse(lt, 0.55, 1.05) : r === 1 ? pulses(lt, [[0.25, 0.7], [1.25, 1.7], [2.25, 2.7]]) : [] };
        K.rc = { a: ['rec', 'r'], b: ['clock', 'l'], c: NN, d: r === 0 ? 0.8 : 0, al: 0.8 };
        K.cA = anc(['clock', 'b'], XA, { d: r === 0 ? 1.2 : 0, al: r === 0 ? 1 : 0.55, pulses: r === 0 ? pulse(lt, 1.45, 2.0) : [] }, true);
        cam = { x: r === 2 ? -10 : 0, y: 0, zoom: r === 2 ? 1.03 : 1, yaw: [1, -1, 0.5][r], pitch: 2 };
      } else {
        C.rec = A(0, 34, 0, { d: r === 0 ? 0.25 : 0, on: r === 2 ? onAt(lt, 0, 2.6) : onAt(lt, r === 0 ? 0.8 : 0) });
        C.clockp = A(-112, LY, 10, { d: r === 0 ? 0.5 : 0, on: r === 0 ? onAt(lt, 1.3, 2.4) : 0 });
        K.cA = anc(['rec', 'b'], XA, { d: r === 0 ? 1.2 : 0, al: r === 0 ? 1 : 0.55, pulses: r === 0 ? pulse(lt, 1.45, 2.0) : [] });
        cam = { x: 0, y: 0, zoom: 1, yaw: [1, -1, 0.5][r], pitch: 2 };
      }
      break;
    }
    case 'anchor0': case 'anchor1': {
      const a1 = id === 'anchor1';
      if (w) {
        C.rec = A(-250, AY, 10, { ry: TILT, on: a1 ? onAt(lt, 0.2) : onAt(lt, 0, 1.2) });
        C.clock = A(150, AY, -30, { ry: -TILT * 0.5, on: a1 ? 0 : onAt(lt, 1.1), dm: a1 ? 0.2 : 0 });
        K.rc = { a: ['rec', 'r'], b: ['clock', 'l'], c: G, w: 1.6, d: a1 ? 0 : 0.3, al: a1 ? 0.6 : 1, pulses: a1 ? [] : pulses(lt, [[0.4, 0.95], [0.6, 1.15]]) };
        K.cA = anc(['clock', 'b-40'], XA, { al: 0.45 }, true);
        K.cB = anc(['clock', 'b40'], XB, { d: a1 ? 0 : 1.4, pulses: a1 ? amb(0.4, 2, false) : pulse(lt, 1.55, 2.2) }, true);
        cam = { x: -30, y: 0, zoom: 1, yaw: a1 ? 1 : -1, pitch: a1 ? 2 : 2.5 };
      } else {
        C.rec = A(0, 34, 0, { on: a1 ? onAt(lt, 0.2) : onAt(lt, 0, 1.2) });
        C.clockp = A(-112, LY, 10, { on: a1 ? 0 : onAt(lt, 1.1) });
        K.cA = anc(['rec', 'b-60'], XA, { al: 0.45 });
        K.cB = anc(['rec', 'b50'], XB, { d: a1 ? 0 : 1.4, pulses: a1 ? amb(0.4, 2, false) : pulse(lt, 1.55, 2.2) });
        cam = { x: 0, y: 0, zoom: 1, yaw: a1 ? 1 : -1, pitch: 2 };
      }
      break;
    }
    case 'share0': case 'share1': {
      const s1 = id === 'share1';
      if (w) {
        if (!s1) C.clock = A(-395, LY, -30, { o: 0, s: 0.45, mv: 0.7 });
        C.clockp = A(-395, LY, 10, s1 ? {} : { ent: 'fade', d: 0.45 });
        C.close = A(-130, AY, 10, { ry: TILT * 0.5, d: s1 ? 0 : 0.3, on: s1 ? onAt(lt, 0, 0.6) : onAt(lt, 0.5) });
        K.cC = anc(['close', 'b'], XC, { d: s1 ? 0 : 1.5, al: s1 ? 0.55 : 1, pulses: s1 ? [] : pulse(lt, 1.7, 2.3) }, true);
        if (s1) {
          C.link = A(270, AY + 52, 20, { d: 0.25, ent: 'fade', on: 1 });
          C.pin = A(270, AY - 40, 20, { d: 1.05, ent: 'fade' });
          K.cl = { a: ['close', 'r20'], b: ['link', 'l'], c: G, w: 1.6, d: 0.3, pulses: pulse(lt, 0.5, 1.1) };
          K.cp = { a: ['close', 'r-30'], b: ['pin', 'l'], c: NN, dash: 4, d: 1.1, pulses: pulse(lt, 1.3, 1.9) };
        }
        cam = { x: s1 ? 20 : 0, y: 0, zoom: 1, yaw: s1 ? -1 : 1, pitch: 2 };
      } else {
        C.clockp = A(-112, LY, 10);
        C.close = A(0, s1 ? 66 : 34, 0, { s: s1 ? 0.86 : 1, d: s1 ? 0 : 0.3, mv: 0.7, on: s1 ? onAt(lt, 0, 0.6) : onAt(lt, 0.5) });
        K.cC = anc(['close', 'b70'], XC, { d: s1 ? 0 : 1.5, al: s1 ? 0.4 : 1, pulses: s1 ? [] : pulse(lt, 1.7, 2.3) });
        if (s1) {
          C.link = A(-78, -52, 20, { d: 0.35, ent: 'fade', on: 1 });
          C.pin = A(78, -92, 20, { d: 1.05, ent: 'fade' });
          K.cl = { a: ['close', 'b-78'], b: ['link', 't'], c: G, w: 1.6, d: 0.4, bend: 0, pulses: pulse(lt, 0.6, 1.1) };
          K.cp = { a: ['close', 'b78'], b: ['pin', 't'], c: NN, dash: 4, d: 1.1, bend: 0, pulses: pulse(lt, 1.3, 1.9) };
        }
        cam = { x: 0, y: 0, zoom: 1, yaw: s1 ? -1 : 1, pitch: 2 };
      }
      break;
    }
    case 'check0': case 'check1': {
      const c1 = id === 'check1';
      if (w) {
        C.close = A(-345, AY, 0, { ry: TILT, s: 0.78, dm: 0.6 });
        C.clockp = A(-395, LY, 10);
        C.view = A(90, AY + 6, 20, { ry: -TILT * 0.5, d: c1 ? 0 : 0.3, on: c1 ? onAt(lt, 1.6) : onAt(lt, 0.6) });
        K.cv = { a: ['close', 'r'], b: ['view', 'l'], c: G, w: 1.6, d: c1 ? 0 : 0.2, al: c1 ? 0.45 : 1, pulses: c1 ? [] : pulse(lt, 0.25, 0.9) };
        K.vA = anc(['view', 'b-60'], XA, { d: c1 ? 0 : 1.2, al: c1 ? 1 : 0.5, pulses: c1 ? pulse(lt, 0.35, 0.95, true) : [] }, true);
        K.vB = anc(['view', 'b60'], XB, { d: c1 ? 0 : 1.2, al: c1 ? 1 : 0.5, pulses: c1 ? pulse(lt, 0.75, 1.35, true) : [] }, true);
        cam = { x: 0, y: 0, zoom: 1, yaw: c1 ? 1 : -1, pitch: 2 };
      } else {
        C.clockp = A(-112, LY, 10);
        C.view = A(0, 26, 0, { d: c1 ? 0 : 0.3, on: c1 ? onAt(lt, 1.6) : onAt(lt, 0.6) });
        K.vA = anc(['view', 'b-20'], XA, { d: c1 ? 0 : 1.2, al: c1 ? 1 : 0.5, pulses: c1 ? pulse(lt, 0.35, 0.95, true) : [] });
        K.vB = anc(['view', 'b50'], XB, { d: c1 ? 0 : 1.2, al: c1 ? 1 : 0.5, pulses: c1 ? pulse(lt, 0.75, 1.35, true) : [] });
        cam = { x: 0, y: 0, zoom: 1, yaw: c1 ? 1 : -1, pitch: 2 };
      }
      break;
    }
    /* ===================== 02 · CHANGE ONE CHARACTER ===================== */
    case 'change0': {
      if (w) {
        C.view = A(-290, AY, 0, { ry: TILT, s: 0.74, dm: 0.6 });
        C.msg = A(150, AY + 10, 20, { ry: -TILT * 0.5, d: 0.35, on: onAt(lt, 0.8, 2.0) });
        K.vm = { a: ['view', 'r'], b: ['msg', 'l'], c: NN, d: 0.5, al: 0.9 };
        C.clockp = A(-395, LY, 10);
        cam = { x: 0, y: 0, zoom: lerp(1, 1.03, eo(seg(lt, 1, 5))), yaw: -1, pitch: 2 };
      } else {
        C.msg = A(0, 30, 0, { d: 0.35, on: onAt(lt, 0.8, 2.0) });
        C.clockp = A(-112, LY, 10);
        cam = { x: 0, y: 0, zoom: 1, yaw: -1, pitch: 2 };
      }
      break;
    }
    case 'recheck0': case 'recheck1': {
      const k1 = id === 'recheck1';
      if (w) {
        C.msg = A(-300, AY, 0, { ry: TILT, s: 0.86 });
        C.chk = A(150, AY + 18, 20, { ry: -TILT * 0.5, d: k1 ? 0 : 0.3 });
        K.mk = { a: ['msg', 'r'], b: ['chk', 'l'], c: k1 ? R : NN, w: k1 ? 1.6 : 1.2, dash: 4, d: k1 ? 0 : 0.5, pulses: k1 ? [] : pulse(lt, 0.6, 1.3) };
        C.clockp = A(-395, LY, 10);
        cam = { x: 0, y: 0, zoom: k1 ? 1.02 : 1, yaw: k1 ? 0 : 1, pitch: 2 };
      } else {
        C.chk = A(0, 22, 0, { d: k1 ? 0 : 0.3 });
        C.clockp = A(-112, LY, 10);
        cam = { x: 0, y: 0, zoom: 1, yaw: k1 ? 0 : 1, pitch: 2 };
      }
      break;
    }
    case 'means0': {
      if (w) {
        C.view = A(-110, AY + 6, 20, { ry: TILT * 0.5, d: 0.3, on: onAt(lt, 0.6, 3.2) });
        C.pOk = A(300, AY + 50, 20, { d: 0.9, ent: 'fade', on: 1 });
        C.pNo = A(300, AY - 40, 20, { d: 2.4, ent: 'fade' });
        K.vo = { a: ['view', 'r40'], b: ['pOk', 'l'], c: G, w: 1.6, d: 0.9, pulses: pulse(lt, 1.1, 1.7) };
        K.vn = { a: ['view', 'r-50'], b: ['pNo', 'l'], c: NN, dash: 4, d: 2.4 };
        C.clockp = A(-395, LY, 10);
        cam = { x: 0, y: 0, zoom: 1, yaw: 1, pitch: 2 };
      } else {
        C.view = A(0, 66, 0, { s: 0.8, d: 0.3, on: onAt(lt, 0.6, 3.2) });
        C.pOk = A(0, -62, 20, { d: 0.9, ent: 'fade', on: 1 });
        C.pNo = A(0, -100, 20, { d: 2.4, ent: 'fade' });
        K.vo = { a: ['view', 'b-100'], b: ['pOk', 'l'], c: G, w: 1.6, d: 0.9, pulses: pulse(lt, 1.1, 1.7) };
        C.clockp = A(-112, LY, 10);
        cam = { x: 0, y: 0, zoom: 1, yaw: 1, pitch: 2 };
      }
      break;
    }
    case 'end0': {
      C.brand = A(0, pick(20, 8), 0, { d: 0.45 });
      K.bm = { a: ['brand', 'b'], b: { node: 'mB', port: 'o' }, c: G, d: 1.1, al: 0.6, pulses: pulse(lt, 1.3, 2.0) };
      cam = { x: 0, y: pick(-20, 0), zoom: 1, yaw: 0, pitch: 2, mv: 1.2 };
      break;
    }
  }
  /* the ledger and its block marks stay from the moment each lands to the end card */
  if (ph >= 1) {
    const end = ph === 14;
    const lab = Math.max(0, 5.6 - t0);
    if (!end) C.mA = A(XA, LY, 0, { d: Math.max(0, MA_T - t0), mv: 1.1 });
    if (ph >= 4) C.mB = A(end ? 0 : XB, LY, 0, { d: Math.max(0, MB_T - t0), mv: 1.1 });
    if (ph >= 6 && !end) C.mC = A(XC, LY, 0, { d: Math.max(0, MC_T - t0), mv: 1.1 });
    if (w) C.lk = A(-462, LY + 32, 0, { d: lab });
  }
  return { C, K, cam };
}
/* ---------------- mixing beats ---------------- */
const onv = (v) => (v === true ? 1 : v ? +v : 0);
function mixCard(p, c, lt) {
  /* fx: the layout already moves this card itself */
  if (c && c.fx) return Object.assign({}, c, { on: onv(c.on) });
  if (c && p) {
    const k = eio(seg(lt, c.d || 0, (c.d || 0) + (c.mv || MOVE)));
    const r = {};
    for (const key of ['x', 'y', 'z', 'rx', 'ry', 's', 'o', 'face', 'dm']) r[key] = lerp(p[key] || 0, c[key] || 0, k);
    r.on = lerp(onv(p.on), onv(c.on), eo(seg(lt, 0, 0.35)));
    r.ent = c.ent;
    return r;
  }
  if (c) {
    const k = seg(lt, c.d || 0, (c.d || 0) + FIN);
    if (k <= 0) return null;
    const e = eo4(k);
    if (c.ent === 'fade') return Object.assign({}, c, { o: c.o * eo(k), s: c.s * (1.04 - 0.04 * e), on: onv(c.on) });
    return Object.assign({}, c, { ry: c.ry - (1 - e) * 84 * DEG, z: c.z - (1 - e) * 60, o: c.o * clamp(k * 2.4), s: c.s * (0.94 + 0.06 * e), on: onv(c.on) });
  }
  if (p) {
    const k = seg(lt, 0, FOUT);
    if (k >= 1) return null;
    if (p.ent === 'fade') return Object.assign({}, p, { o: p.o * (1 - k), on: onv(p.on) });
    const e = ei(k);
    return Object.assign({}, p, { ry: p.ry + e * 84 * DEG, z: p.z - e * 40, o: p.o * (1 - k), on: onv(p.on) });
  }
  return null;
}
function mixCam(p, c, lt) {
  const k = eio(seg(lt, 0, c.mv || 1.15));
  const r = {};
  for (const key of ['x', 'y', 'zoom', 'yaw', 'pitch']) r[key] = lerp(p[key], c[key], k);
  return r;
}

/* ---------------- WebGL: line pools and points ---------------- */
class Pool {
  constructor(width, max) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 6); this.col = new Float32Array(max * 6);
    this.geo = new LineSegmentsGeometry(); this.geo.setPositions(this.pos); this.geo.setColors(this.col);
    this.mat = new LineMaterial({ linewidth: width, vertexColors: true, worldUnits: false, depthTest: false, depthWrite: false });
    this.mesh = new LineSegments2(this.geo, this.mat); this.mesh.frustumCulled = false;
  }
  begin() { this.n = 0; }
  seg(a, b, ca, cb) {
    if (this.n >= this.max) return;
    const i = this.n * 6, p = this.pos, c = this.col;
    p[i] = a.x; p[i + 1] = a.y; p[i + 2] = a.z; p[i + 3] = b.x; p[i + 4] = b.y; p[i + 5] = b.z;
    c[i] = ca[0]; c[i + 1] = ca[1]; c[i + 2] = ca[2]; c[i + 3] = cb[0]; c[i + 4] = cb[1]; c[i + 5] = cb[2];
    this.n++;
  }
  end() {
    this.geo.instanceCount = this.n;
    this.geo.attributes.instanceStart.data.needsUpdate = true;
    this.geo.attributes.instanceColorStart.data.needsUpdate = true;
  }
}
class Dots {
  constructor(max, soft) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.rgba = new Float32Array(max * 4); this.size = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('rgba', new THREE.BufferAttribute(this.rgba, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uDpr: { value: 1 }, uSoft: { value: soft ? 1 : 0 } },
      vertexShader: `attribute vec4 rgba; attribute float size; uniform float uDpr; varying vec4 vC; varying float vS;
        void main(){ vC = rgba; vS = size * uDpr; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = vS; }`,
      fragmentShader: `uniform float uSoft; varying vec4 vC; varying float vS;
        void main(){ float r = length(gl_PointCoord * 2.0 - 1.0); float a;
          if (uSoft > 0.5) a = exp(-r * r * 3.2) * (1.0 - smoothstep(0.8, 1.0, r));
          else a = 1.0 - smoothstep(1.0 - 2.5 / vS, 1.0, r);
          gl_FragColor = vec4(vC.rgb, vC.a * a); }`,
      transparent: true, depthTest: false, depthWrite: false
    });
    this.mesh = new THREE.Points(g, this.mat); this.mesh.frustumCulled = false;
  }
  begin() { this.n = 0; }
  add(p, rgb, a, size) {
    if (this.n >= this.max) return;
    const i = this.n;
    this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
    this.rgba[i * 4] = rgb[0]; this.rgba[i * 4 + 1] = rgb[1]; this.rgba[i * 4 + 2] = rgb[2]; this.rgba[i * 4 + 3] = a;
    this.size[i] = size; this.n++;
  }
  end() {
    this.geo.setDrawRange(0, this.n);
    for (const k of ['position', 'rgba', 'size']) this.geo.attributes[k].needsUpdate = true;
  }
}

/* colours: lines are opaque and fake their alpha by mixing toward the stage surface (exact on the stage) */
const hexRGB = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const toLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
function mixA(col, a) {
  const s = COL.surf; a = clamp(a);
  return [toLin(s[0] + (col[0] - s[0]) * a), toLin(s[1] + (col[1] - s[1]) * a), toLin(s[2] + (col[2] - s[2]) * a)];
}
function setColors(c) {
  COL = { dark: !!c.dark, surf: hexRGB(c.surface), n: hexRGB(c.fg3), g: hexRGB(c.accent), r: hexRGB('#e5484d'), tick: hexRGB(c.fg3), nA: c.dark ? 0.5 : 0.62, tA: c.dark ? 0.42 : 0.5 };
  if (halos) { halos.mat.blending = COL.dark ? THREE.AdditiveBlending : THREE.NormalBlending; halos.mat.needsUpdate = true; }
}

/* ---------------- paths ---------------- */
const PATH = { x: new Float32Array(256), y: new Float32Array(256), z: new Float32Array(256), l: new Float32Array(256), n: 0, len: 0 };
const _P0 = new THREE.Vector3(), _P3 = new THREE.Vector3(), _T0 = new THREE.Vector3(), _T3 = new THREE.Vector3(), _B1 = new THREE.Vector3(), _B2 = new THREE.Vector3(), _Q = new THREE.Vector3();
function endpoint(ep, P, Tn, usage) {
  if (Array.isArray(ep)) {
    const n = N[ep[0]]; if (!n || !n.vis) return -1;
    const f = n.face > 0.5 ? 1 : 0;
    portLocal(n, f, ep[1], P, Tn);
    P.applyMatrix4(n.group.matrixWorld); Tn.transformDirection(n.group.matrixWorld);
    if (usage) usage.push([n, f, ep[1]]);
    return n.op;
  }
  if (ep.node) {
    const n = N[ep.node]; if (!n || !n.vis) return -1;
    portLocal(n, 0, ep.port, P, Tn);
    P.applyMatrix4(n.group.matrixWorld); Tn.set(0, 1, 0);
    return n.op;
  }
  P.set(ep.x, ep.y, ep.z || 0); Tn.set(ep.dir ? ep.dir[0] : 0, ep.dir ? ep.dir[1] : 0, 0);
  return 1;
}
function pushPt(x, y, z) {
  const i = PATH.n; if (i >= 255) return;
  PATH.x[i] = x; PATH.y[i] = y; PATH.z[i] = z;
  if (i === 0) PATH.l[0] = 0;
  else { const dx = x - PATH.x[i - 1], dy = y - PATH.y[i - 1], dz = z - PATH.z[i - 1]; PATH.l[i] = PATH.l[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz); }
  PATH.n++;
}
function buildPath(Lk) {
  PATH.n = 0;
  if (Lk.via) {
    const pts = [[_P0.x, _P0.y, _P0.z]];
    for (const v of Lk.via) { const q = pts[pts.length - 1]; pts.push([v[0] == null ? q[0] : v[0], v[1] == null ? q[1] : v[1], v[2] == null ? _P0.z : v[2]]); }
    pts.push([_P3.x, _P3.y, _P3.z]);
    pushPt(pts[0][0], pts[0][1], pts[0][2]);
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i], a = pts[i - 1], b = pts[i + 1];
      const da = Math.hypot(p[0] - a[0], p[1] - a[1]) || 1, db = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1;
      const r = Math.min(10, da / 2, db / 2);
      const s = [p[0] + (a[0] - p[0]) / da * r, p[1] + (a[1] - p[1]) / da * r], e = [p[0] + (b[0] - p[0]) / db * r, p[1] + (b[1] - p[1]) / db * r];
      for (let j = 0; j <= 6; j++) { const u = j / 6, v = 1 - u; pushPt(v * v * s[0] + 2 * v * u * p[0] + u * u * e[0], v * v * s[1] + 2 * v * u * p[1] + u * u * e[1], p[2]); }
    }
    const l = pts[pts.length - 1]; pushPt(l[0], l[1], l[2]);
  } else {
    const dist = _P0.distanceTo(_P3), k = (Lk.bend == null ? 0.42 : Lk.bend) * dist;
    _B1.copy(_P0).addScaledVector(_T0, k); _B2.copy(_P3).addScaledVector(_T3, k);
    const steps = k === 0 ? 1 : 30;
    for (let i = 0; i <= steps; i++) { bez(_P0, _B1, _B2, _P3, i / steps, _Q); pushPt(_Q.x, _Q.y, _Q.z); }
  }
  PATH.len = PATH.l[PATH.n - 1];
}
function pathAt(d, out) {
  if (d <= 0) return out.set(PATH.x[0], PATH.y[0], PATH.z[0]);
  for (let i = 1; i < PATH.n; i++) {
    if (PATH.l[i] >= d) {
      const k = (d - PATH.l[i - 1]) / Math.max(1e-6, PATH.l[i] - PATH.l[i - 1]);
      return out.set(lerp(PATH.x[i - 1], PATH.x[i], k), lerp(PATH.y[i - 1], PATH.y[i], k), lerp(PATH.z[i - 1], PATH.z[i], k));
    }
  }
  const j = PATH.n - 1; return out.set(PATH.x[j], PATH.y[j], PATH.z[j]);
}
const _S0 = new THREE.Vector3(), _S1 = new THREE.Vector3();
const mixC = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
function emit(pool, d0, d1, colA, colB, dash) {
  if (d1 <= d0) return;
  const span = d1 - d0, piece = dash || 1e9, gap = dash ? dash * 0.9 : 0;
  let d = d0;
  while (d < d1) {
    const e = Math.min(d1, d + piece);
    pathAt(d, _S0);
    let ca = colA === colB ? colA : mixC(colA, colB, (d - d0) / span);
    for (let i = 1; i < PATH.n; i++) {
      if (PATH.l[i] <= d) continue;
      const stop = Math.min(PATH.l[i], e);
      pathAt(stop, _S1);
      const cb = colA === colB ? colA : mixC(colA, colB, (stop - d0) / span);
      pool.seg(_S0, _S1, ca, cb);
      _S0.copy(_S1); ca = cb;
      if (stop >= e) break;
    }
    d = e + gap;
  }
}

/* ---------------- drawing ---------------- */
const _cp = new THREE.Vector3();
function drawLinks(K) {
  const usage = [];
  for (const key in K) {
    const Lk = K[key];
    if (Lk.al <= 0.005 || (Lk.draw != null && Lk.draw <= 0.001)) continue;
    const u0 = [];
    const oa = endpoint(Lk.a, _P0, _T0, u0), ob = endpoint(Lk.b, _P3, _T3, u0);
    if (oa < 0 || ob < 0) continue;
    const al = Lk.al * Math.min(oa, ob);
    if (al <= 0.01) continue;
    buildPath(Lk);
    const col = COL[Lk.c] || COL.n;
    const lineCol = mixA(col, Lk.c === 'n' ? al * COL.nA : al);
    const len = PATH.len, dEnd = len * clamp(Lk.draw == null ? 1 : Lk.draw);
    const pool = (Lk.w || 1.2) >= 1.55 ? pools.w16 : pools.w12;
    emit(pool, 0, dEnd, lineCol, lineCol, Lk.dash || 0);
    for (const p of Lk.pulses || []) {
      const pc = COL[p.c || (Lk.c === 'n' ? 'g' : Lk.c)];
      const d = len * p.u;
      pathAt(d, _cp);
      const a = al * (p.soft ? 0.85 : 1);
      const tail = Math.min(d, 70);
      emit(pools.w22, d - tail, d, mixA(pc, 0.04 * a), mixA(pc, a), 0);
      dots.add(_cp, pc, a, 7);
      halos.add(_cp, pc, (COL.dark ? 0.5 : 0.3) * a, 26);
    }
    if (len >= 30) for (const u of u0) usage.push([u[0], u[1], u[2], Lk.c, clamp(al * 1.3)]);
  }
  return usage;
}
const PRI = { n: 0, g: 1, r: 2 };
function updatePorts(usage) {
  const want = new Map();
  for (const [n, f, key, c, a] of usage) {
    const k = n.id + '|' + f + '|' + key, v = want.get(k);
    if (!v) want.set(k, { n, f, key, c, a });
    else { if (PRI[c] > PRI[v.c]) v.c = c; v.a = Math.max(v.a, a); }
  }
  for (const v of want.values()) {
    let el = v.n.ports[v.f][v.key];
    if (!el) {
      el = document.createElement('i'); el.className = 'ag-c-port';
      const side = v.key[0], off = v.key.length > 1 ? parseFloat(v.key.slice(1)) : 0;
      if (side === 'r' || side === 'l') { el.style.left = side === 'r' ? '100%' : '0'; el.style.top = `calc(50% - ${off}px)`; }
      else if (side === 't' || side === 'b') { el.style.top = side === 'b' ? '100%' : '0'; el.style.left = `calc(50% + ${off}px)`; }
      else el.style.display = 'none';
      v.n.faces[v.f].el.appendChild(el); v.n.ports[v.f][v.key] = el;
    }
    const s = v.c + v.a.toFixed(2);
    if (el.__s !== s) { el.__s = s; el.className = 'ag-c-port ' + v.c; el.style.opacity = v.a.toFixed(2); }
  }
  for (const id in N) {
    const n = N[id];
    for (let f = 0; f < 2; f++) for (const key in n.ports[f]) {
      if (!want.has(n.id + '|' + f + '|' + key)) { const el = n.ports[f][key]; if (el.__s !== '0') { el.__s = '0'; el.style.opacity = '0'; } }
    }
  }
}

const ensure = (el, prop, v) => { if (!el) return; const k = '__' + prop; if (el[k] !== v) { el[k] = v; el.style.setProperty(prop, v); } };
const cls = (el, c, on) => { if (!el) return; const k = '__c_' + c; if (el[k] !== on) { el[k] = on; el.classList.toggle(c, on); } };
const txt = (el, v) => { if (el && el.__t !== v) { el.__t = v; el.innerHTML = v; } };
/* an item: state is a space-separated list of live / ok / bad / hl / tg (tg shows the item's tag) */
function setKV(el, state, val) {
  if (!el) return;
  const s = state.split(' ');
  for (const c of ['live', 'ok', 'bad', 'hl', 'tg']) cls(el, c, s.indexOf(c) >= 0);
  txt(el.querySelector(':scope > span'), val);
}
function setNote(el, state, val, op) {
  if (!el) return;
  cls(el, 'ok', state === 'ok'); cls(el, 'bad', state === 'bad');
  txt(el.querySelector('b'), val);
  ensure(el, 'opacity', op.toFixed(3));
}
const typed = (s, k) => { const n = Math.round(s.length * clamp(k)); return n <= 0 ? '&nbsp;' : s.slice(0, n) + (n < s.length ? '<i class="ag-c-caret"></i>' : ''); };

function applyNodes(C, P, lt, fadeAll) {
  for (const id in N) {
    const n = N[id];
    const st = mixCard(P[id], C[id], lt);
    if (!st || st.o * fadeAll <= 0.004) { n.vis = false; for (const f of n.faces) f.obj.visible = false; continue; }
    n.vis = true; n.face = st.face;
    n.group.position.set(st.x, st.y + n.ay, st.z);
    n.group.rotation.set(st.rx, st.ry + st.face * Math.PI, 0);
    n.group.scale.setScalar(st.s);
    const o = st.o * fadeAll; n.op = o;
    const os = o >= 0.995 ? '' : o.toFixed(3);
    n.faces.forEach((f) => {
      f.obj.visible = true;
      if (f.o !== os) { f.o = os; f.el.style.opacity = os; }
      cls(f.el, 'is-on', st.on > 0.5);
      ensure(f.el, '--on', (st.on || 0).toFixed(2));
      ensure(f.el, '--dm', (st.dm || 0).toFixed(2));
    });
  }
}

/* card contents: a pure function of story time T */
function setRow(el, state, val) {
  if (!el) return;
  const s = state.split(' ');
  for (const c of ['live', 'ok', 'ch']) cls(el, c, s.indexOf(c) >= 0);
  txt(el.querySelector('.h'), val);
}
function content(T, id) {
  const ck = tHTML(T);
  txt(Q('clock', 'hms'), ck); txt(Q('clockp', 'hms'), ck);
  const st = { record0: 'Start marker', record1: 'Verifiable time', record2: 'Verifiable time', anchor0: 'Checkpoint · steps 1–7', anchor1: 'Fingerprints only' }[id];
  if (st) txt(Q('clock', 'st'), st);
  /* 01 connect: the agent and its connector */
  setKV(Q('agent', 'cn'), T >= 1.2 ? 'live' : '', T >= 1.2 ? '/shadow/mcp' : '&mdash;');
  setKV(Q('agent', 'ac'), T >= 2.0 ? 'live' : '', T >= 2.0 ? 'Free &middot; testnet &middot; no email' : '&mdash;');
  setKV(Q('agent', 'lg'), T >= 3.4 ? 'ok' : T >= 2.8 ? 'live' : '', T >= 2.8 ? 'On by default' : '&mdash;');
  /* the record: four steps, then chained, then their fingerprints leave for Clockchain */
  const at = { r4: 6.0, r5: 8.9, r6: 9.9, r7: 10.9 }, chAt = { r4: 12.4, r5: 12.9, r6: 13.4, r7: 13.9 };
  for (const f in at) {
    const on = T >= at[f], sent = T >= 16.0, ch = T >= chAt[f];
    setRow(Q('rec', f), (sent ? 'ok ' : on ? 'live ' : '') + (ch ? 'ch' : ''), on ? typed(HASHES[f], seg(T, at[f], at[f] + 0.5)) : '&nbsp;');
  }
  const rn = T >= 19.6 ? ['', 'Content stays on the Shadow server'] : T >= 16.0 ? ['ok', 'Fingerprints sent &middot; steps 1–7'] : ['ok', 'Numbered and chained &middot; seq 4–7'];
  setNote(Q('rec', 'rn'), rn[0], rn[1], T >= 19.6 ? 1 : seg(T, 14.2, 14.6));
  /* the session closes: 10 steps, the checkpoint is signed, one link */
  txt(Q('close', 'cr'), T >= 24.4 ? 'succeeded' : '&nbsp;');
  setKV(Q('close', 'cs'), T >= 24.2 ? 'live' : '', T >= 24.2 ? '10' : '&mdash;');
  setKV(Q('close', 'cc'), T >= MC_T ? 'ok tg' : T >= 25.0 ? 'live' : '', T >= 25.0 ? 'own key &middot; block 313,493' : '&mdash;');
  setKV(Q('close', 'cl'), T >= 26.2 ? 'live' : '', T >= 26.2 ? (W ? VIEW_LINK : '…/shadow/s/••••••') : '&mdash;');
  /* the viewer: opened by link, every row checks, result pass */
  const vAt = { v3: 31.2, v4: 31.6, v7: 32.0, v8: 32.4 }, okAt = { v3: 34.9, v4: 35.2, v7: 35.5, v8: 35.8 };
  for (const f in vAt) {
    const el = Q('view', f);
    cls(el, 'live', T >= vAt[f]); cls(el, 'ok', T >= okAt[f]);
    ensure(el, 'opacity', T >= vAt[f] ? '1' : '0.35');
  }
  const pass = T >= 36.3;
  setNote(Q('view', 'vn'), pass ? 'ok' : '', pass ? 'Result: pass &middot; no check failed' : 'Opened by link &middot; no account', T >= 31.0 ? 1 : 0);
  ensure(N.view.faces[0].el, '--sl', (pass ? eo4(seg(T, 36.3, 36.65)) : 0).toFixed(3));
  /* 02: one character changes in step 7 */
  const del = T >= 40.6, ins = T >= 41.0;
  let tx;
  if (!del) tx = 'Fast' + (T >= 40.0 ? '<i class="ag-c-caret"></i>' : '') + MSG.slice(4);
  else tx = 'Fast' + (ins ? '<u>o</u>' : '') + (T < 41.6 ? '<i class="ag-c-caret"></i>' : '') + MSG.slice(5);
  txt(Q('msg', 'tx'), tx);
  txt(Q('msg', 'mc'), ins ? 'Edited copy' : 'Recorded');
  cls(Q('msg', 'mc'), 'n', !ins);
  cls(N.msg.faces[0].el, 'is-bad', T >= 41.2);
  /* the verifier, offline, on the copy: the film's results; content fails */
  ORDER.forEach((i, j) => {
    const el = Q('chk', 'c' + i), at = 45.0 + i * 0.24, [, res] = CHECKS[i];
    const shown = T >= at, isContent = i === 1;
    const final = isContent ? (T >= 49.4 ? 'fail' : shown ? '' : '') : res === 'pass' ? 'pass' : res === 'indeterminate' ? 'ind' : 'na';
    for (const c of ['pass', 'fail', 'ind', 'na']) cls(el, c, shown && final === c);
    cls(el, 'live', shown);
    txt(el.querySelector('b'), !shown ? '&nbsp;' : isContent && T < 49.4 ? '&hellip;' : res);
  });
  const failed = T >= 49.8;
  setNote(Q('chk', 'kn'), failed ? 'bad' : '', failed ? 'Fail &middot; one or more steps changed after they were recorded' : 'Checking the copy', T >= 45.0 ? 1 : 0);
  cls(N.chk.faces[0].el, 'is-bad', failed);
}

/* ---------------- camera ---------------- */
let SHY = 0;
function placeCamera(c, T) {
  const f = (VH / 2) / Math.tan(FOV / 2 * DEG);
  const D = f / FIT / c.zoom;
  const yaw = (c.yaw + 0.5 * Math.sin(T * 0.19)) * DEG, pitch = (c.pitch + 0.3 * Math.sin(T * 0.15 + 1.3)) * DEG;
  const y = c.y + SHY;
  camera.position.set(c.x + Math.sin(yaw) * Math.cos(pitch) * D, y + Math.sin(pitch) * D, Math.cos(yaw) * Math.cos(pitch) * D);
  camera.lookAt(c.x, y, 0);
  camera.near = D * 0.1; camera.far = D * 8; camera.updateProjectionMatrix();
}

/* ---------------- the ledger: the site's ruler, as a time axis, drawn from the moment of anchoring ---------------- */
function drawRuler(T, fadeAll) {
  if (T < 5.2 || fadeAll < 0.01) return;
  const LY = W ? LYW : LYT;
  const R = eio(seg(T, 5.3, 6.8));
  const x0 = W ? -760 : -230, x1 = W ? 760 : 230;
  const lo = Math.max(x0, -R * 900), hi = Math.min(x1, R * 900);
  const step = W ? 25 : 20;
  const c = mixA(COL.tick, fadeAll * COL.tA), cm = mixA(COL.tick, fadeAll * COL.tA * 0.62);
  _S0.set(lo, LY, 0); _S1.set(hi, LY, 0); pools.w10.seg(_S0, _S1, c, c);
  for (let x = Math.ceil(lo / step) * step; x <= hi; x += step) {
    const major = Math.round(x / step) % 4 === 0, h = major ? 8 : 3.5;
    _S0.set(x, LY - h, 0); _S1.set(x, LY + h, 0); pools.w10.seg(_S0, _S1, major ? c : cm, major ? c : cm);
  }
}

const FOV = 30;
let PREV = { key: '', v: null };
export default {
  async init(ctx) {
    if (!document.getElementById('ag-s-style')) {
      const s = document.createElement('style'); s.id = 'ag-s-style'; s.textContent = CSS; document.head.appendChild(s);
    }
    buildBeats(ctx.story);
    HOST = ctx.host;
    VW = ctx.w; VH = ctx.h; DPR = ctx.dpr;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true });
    renderer.setPixelRatio(DPR); renderer.setSize(VW, VH, false); renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'ag-c-gl';
    ctx.host.appendChild(renderer.domElement);
    css = new CSS3DRenderer(); css.setSize(VW, VH);
    layer = css.domElement; layer.classList.add('ag-c-layer');
    ctx.host.appendChild(layer);
    camEl = layer.firstChild.firstChild;
    glScene = new THREE.Scene(); cssScene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(FOV, VW / VH, 1, 20000);
    pools = { w10: new Pool(1, 1600), w12: new Pool(1.25, 3000), w16: new Pool(1.6, 1600), w22: new Pool(2.4, 800) };
    for (const k in pools) glScene.add(pools[k].mesh);
    halos = new Dots(160, true); dots = new Dots(160, false);
    halos.mesh.renderOrder = 5; dots.mesh.renderOrder = 6;
    glScene.add(halos.mesh, dots.mesh);
    setColors(ctx.colors);
    for (const id in HTML) makeNode(id);
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* fonts optional */ } }
    this.resize(VW, VH);
  },
  frame(s) {
    const bi = BI[s.step] + s.line;
    const beat = BEATS[bi];
    const lt = s.lineT * beat.dur;
    const T = beat.t0 + lt;
    const cur = L(bi, lt);
    let prev;
    if (bi > 0) {
      const key = bi + '|' + W;
      if (PREV.key !== key) PREV = { key, v: L(bi - 1, BEATS[bi - 1].dur) };
      prev = { C: PREV.v.C, K: PREV.v.K, cam: Object.assign({}, PREV.v.cam) };
    } else prev = { C: {}, K: {}, cam: cur.cam };
    const isEnd = beat.id === 'end0';
    const fadeAll = isEnd ? 1 - seg(lt, beat.dur - 0.8, beat.dur - 0.05) : 1;
    applyNodes(cur.C, prev.C, lt, fadeAll);
    content(T, beat.id);
    /* camera: ease from the previous beat, with a slow push-in inside each beat */
    if (bi > 0) prev.cam.zoom *= 1 + 0.006 * BEATS[bi - 1].dur;
    cur.cam.zoom *= 1 + 0.006 * lt;
    placeCamera(bi > 0 ? mixCam(prev.cam, cur.cam, lt) : cur.cam, T);
    cssScene.updateMatrixWorld();
    /* links: mix the previous and current beat by key */
    const K = {}, kk = eio(seg(lt, 0, 0.6));
    for (const key in cur.K) {
      const c = Object.assign({ al: 1 }, cur.K[key]);
      const p = prev.K[key];
      if (p) c.al = lerp(p.al == null ? 1 : p.al, c.al, kk);
      else if (c.draw == null) c.draw = eo(seg(lt, c.d || 0, (c.d || 0) + 0.55));
      c.al *= fadeAll;
      K[key] = c;
    }
    for (const key in prev.K) {
      if (cur.K[key]) continue;
      const p = Object.assign({ al: 1 }, prev.K[key]);
      p.al *= (1 - seg(lt, 0, 0.4)) * fadeAll; p.pulses = [];
      K[key] = p;
    }
    for (const k in pools) pools[k].begin();
    dots.begin(); halos.begin();
    drawRuler(T, fadeAll);
    updatePorts(drawLinks(K));
    for (const k in pools) pools[k].end();
    dots.end(); halos.end();
    renderer.render(glScene, camera);
    css.render(cssScene, camera);
  },
  resize(w, h) {
    VW = w; VH = h;
    W = w / h > 1.25;
    /* the free band of the stage: under the pause button, above the stage foot */
    let top = W ? 52 : 81;
    try {
      const ch = HOST && HOST.parentElement && HOST.parentElement.querySelector('.ag-chips');
      if (ch) { const r = ch.getBoundingClientRect(), hr = HOST.getBoundingClientRect(); if (r.height > 0) top = r.bottom - hr.top; }
    } catch (e) { /* layout not ready: defaults */ }
    const s0 = top + (W ? 16 : 12), s1 = h - (W ? 12 : 6);
    const FITh = W ? Math.min(w / 1000, h / 440) : Math.min(w / 360, h / 364);
    let b0 = W ? LYW - 46 : LYT - 40, b1 = W ? 166 : 150;
    FIT = Math.min(FITh, (s1 - s0) / (b1 - b0));
    const lo = W && FIT < 0.85;
    /* short stages draw the labels larger, so the cards grow: fit a taller band */
    if (lo) { b0 = LYW - 54; b1 = 182; FIT = Math.min(FITh, (s1 - s0) / (b1 - b0)); }
    SHY = (b0 + b1) / 2 - (h / 2 - (s0 + s1) / 2) / FIT;
    layer.classList.toggle('lo', lo);
    renderer.setSize(w, h, false); css.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    for (const k in pools) pools[k].mat.resolution.set(w, h);
    dots.mat.uniforms.uDpr.value = DPR; halos.mat.uniforms.uDpr.value = DPR;
    measure();
    PREV = { key: '', v: null };
  },
  theme(c) { setColors(c); }
};
