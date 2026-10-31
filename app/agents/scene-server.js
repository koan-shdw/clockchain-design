/* MCP Overview · Fig 1.1 · the demo film as cards.
   The Agents animation's card engine (scene-c.js), telling the demo film from mcp.clockchain.network:
   an agent acts, the action is anchored on a testnet block, the receipt verifies, one byte changes and
   re-verification rejects it. Every card is real HTML in the site's fonts and tokens (CSS3DRenderer),
   linked by WebGL hairlines and travelling pulses drawn with the same camera.
   Everything is a pure function of story time: frame(s) builds the picture from (beat, time in beat).
   Story: agents/story-server.js (window.CC_STORY_SERVER). */
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
:root:not([data-theme="light"]) .ag-c-layer{--c-ink:var(--accent);--c-fill:var(--surface-2);
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
`;

/* ---------------- icons ---------------- */
const IC = {
  check: '<svg viewBox="0 0 14 14"><path d="M3.4 7.3l2.4 2.4 4.9-5.4"/></svg>',
  x: '<svg viewBox="0 0 14 14"><path d="M4.2 4.2l5.6 5.6M9.8 4.2l-5.6 5.6"/></svg>',
  key: '<svg viewBox="0 0 16 16"><circle cx="5" cy="8" r="2.9"/><path d="M7.9 8h6.3M12.1 8v2.5M14.2 8v1.9M2 14L14 2"/></svg>'
};
/* story clock: 12:04:31.114 at T = 0, the same clock face as the Agents animation */
const tstr = (T) => {
  const v = 43471.114 + T; const h = Math.floor(v / 3600), m = Math.floor(v / 60) % 60, s = Math.floor(v) % 60;
  const ms = Math.min(999, Math.round((v - Math.floor(v)) * 1000));
  return [String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'), '.' + String(ms).padStart(3, '0')];
};
const tHTML = (T) => { const [a, b] = tstr(T); return a + '<em>' + b + '</em>'; };

/* ---------------- card markup ---------------- */
const kv = (f, label, tag = '') => `<div class="ag-c-kv" data-f="${f}"><em>${label}${tag ? `<i>${tag}</i>` : ''}</em><span>&mdash;</span></div>`;
const note = (f) => `<div class="ag-c-note" data-f="${f}"><span class="ic ic-ok">${IC.check}</span><span class="ic ic-x">${IC.x}</span><b></b></div>`;
const clockCard = (extra) => `<div class="ag-c-card ag-c-clock"><div class="ag-c-k"><i class="ag-c-ring sm"></i><span>Clockchain</span></div>
    <div class="ag-c-hms" data-f="hms">12:04:31<em>.114</em></div>${extra}</div>`;

const HTML = {
  agent: [`<div class="ag-c-card ag-c-agent"><div class="ag-c-k"><span>Agent</span><span class="ag-c-chip n r">disbursements</span></div>
    <div class="ag-c-t">vega</div>
    <div class="ag-c-kvs">${kv('act', 'Action')}${kv('to', 'To')}${kv('amt', 'Amount')}</div>
    <div class="ag-c-nokey">${IC.key}<span><b>No key</b> in the agent</span></div></div>`],
  call: [`<div class="ag-c-card ag-c-call"><div class="ag-c-k"><span>Tool call</span><span class="ag-c-chip r">SHA-256</span></div>
    <div class="ag-c-line">attest_action<i>&nearr;</i></div>
    <div class="ag-c-hashbox"><span class="ag-c-sub">Fingerprint</span><span class="ag-c-hash" data-f="h">&nbsp;</span></div></div>`],
  clock: [clockCard(`<div class="ag-c-sub"><b data-f="st">Verifiable time</b></div>`)],
  clockp: [`<div class="ag-c-pill ag-c-clockp"><i class="ag-c-ring sm"></i><b>Clockchain</b><span class="ag-c-time" data-f="hms"></span></div>`],
  clockE: [clockCard(`<div class="ag-c-sub"><b>50 tools</b>&middot; one endpoint</div><div class="ag-c-url">mcp.clockchain.network</div>`)],
  entry: [`<div class="ag-c-card ag-c-entry"><div class="ag-c-k"><span>Ledger entry</span><span class="ag-c-chip n r">Testnet</span></div>
    <div class="ag-c-kvs">${kv('eh', 'Event hash')}${kv('li', 'Ledger ID')}${kv('bk', 'Block', 'confirmed')}</div>${note('nt')}</div>`],
  receipt: [`<div class="ag-c-card ag-c-receipt"><div class="ag-c-k"><span>Agent attested receipt</span><span class="ag-c-seal">${IC.check}</span></div>
    <div class="ag-c-kvs">${kv('ac', 'Action')}${kv('idn', 'Identity', 'valid-at-T &check;')}${kv('an', 'Anchor', 'confirmed')}${kv('stt', 'Status')}</div>${note('rn')}</div>`],
  lk: [`<div class="ag-c-lk">Ledger</div>`],
  mB: [`<div class="ag-c-mark"><i class="ag-c-ring"></i><span class="ag-c-time">3,746,557</span><b>Block</b></div>`]
};
const HASH = 'c155cd72…b2d2d98e', LEDGER_ID = 'a8b40093-4213-4165…';
const MB_T = 9.0;                       /* story second the block mark lands on the ledger */

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
  for (const id of ['clock', 'clockE']) {
    const el = N[id].faces[0].el, hm = el.querySelector('.ag-c-hms');
    el.style.width = '';
    const cs = getComputedStyle(el), need = hm.scrollWidth + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 10;
    if (need > el.offsetWidth) el.style.width = Math.ceil(need) + 'px';
  }
  for (const id in N) {
    const n = N[id];
    n.faces.forEach((f, i) => { n.size[i] = { w: f.el.offsetWidth, h: f.el.offsetHeight }; });
  }
  N.mB.ay = -(N.mB.size[0].h / 2 - (W ? 9 : 7));
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
const LYW = -176, LYT = -134;
/* a card lights up between a and b (story seconds inside the beat), with a short ramp */
const onAt = (lt, a, b = 1e9) => Math.min(seg(lt, a, a + 0.3), 1 - seg(lt, b, b + 0.3));
const PHASES = ['act0', 'act1', 'anchor0', 'anchor1', 'receipt0', 'receipt1', 'tamper0', 'tamper1', 'tamper2', 'end0'];

function L(bi, lt) {
  const id = BEATS[bi].id, t0 = BEATS[bi].t0, T = t0 + lt;
  const C = {}, K = {};
  let cam = { x: 0, y: 0, zoom: 1, yaw: 0, pitch: 2 };
  const w = W;
  const pick = (a, b) => (w ? a : b);
  const AY = pick(10, 26), LY = pick(LYW, LYT), TILT = pick(7 * DEG, 0);
  const MBX = pick(300, 40);              /* where the block mark sits on the ledger */
  const G = 'g', NN = 'n', R = 'r';
  const pulse = (t, a, b, rev) => { const k = seg(t, a, b); return k > 0 && k < 1 ? [{ u: rev ? 1 - eio(k) : eio(k) }] : []; };
  const amb = (speed, n, rev, ph = 0) => { const r = []; for (let i = 0; i < n; i++) { const u = fract(T * speed + i / n + ph); r.push({ u: rev ? 1 - u : u, soft: 1 }); } return r; };
  const ledger = (x) => ({ x, y: LY, z: 0, dir: [0, 1] });
  /* anchoring to the ledger: down to a bus just above the axis, across, then into the mark (or a straight drop) */
  const anc = (a, x, o, bus) => Object.assign({ a, b: ledger(x), c: G, w: 1.6 }, bus ? { via: [[null, LY + 18, 0], [x, LY + 18, 0]] } : { bend: 0 }, o);
  const ph = PHASES.indexOf(id);

  switch (id) {
    /* ===================== 01 · ATTEST AN ACTION ===================== */
    case 'act0': case 'act1': {
      const a1 = id === 'act1';
      const agOn = a1 ? onAt(lt, -1, 0.8) : onAt(lt, 0.6);
      if (w) {
        C.agent = A(-320, AY, 0, { ry: TILT, d: a1 ? 0 : 0.15, on: agOn });
        C.clock = A(330, AY, -30, { ry: -TILT, d: a1 ? 0 : 0.4, on: a1 ? onAt(lt, 2.9) : 0 });
        K.acn = { a: ['agent', 'r'], b: ['clock', 'l'], c: NN, d: 1.0 };
        if (a1) {
          /* the call leaves the agent and travels the line to Clockchain while the fingerprint is computed */
          const k = eio(seg(lt, 0.5, 2.4)), kd = seg(lt, 2.4, 2.9), u = 0.34 + 0.32 * k;
          const ue = kd > 0 ? lerp(0.66, 1, eio(kd)) : u;
          K.acg = { a: ['agent', 'r'], b: ['clock', 'l'], c: G, w: 1.6, draw: lt < 0.2 ? 0 : ue, pulses: kd > 0 && kd < 1 ? [{ u: ue }] : [] };
          const p = alongRaw(C, K.acg, u);
          C.call = A(p.x, p.y, p.z + 40, { fx: 1, ent: 'fade', o: seg(lt, 0.2, 0.5) });
        }
      } else {
        /* phone: the agent steps up and back so the call fits between it and Clockchain */
        C.agent = a1 ? A(0, 54, 0, { s: 0.7, mv: 0.7, on: agOn }) : A(0, 30, 0, { d: 0.15, on: agOn });
        C.clockp = A(0, LY, 10, { d: a1 ? 0 : 0.4, on: a1 ? onAt(lt, 2.9) : 0 });
        K.acn = { a: ['agent', 'b'], b: ['clockp', 't'], c: NN, d: 1.0 };
        if (a1) {
          C.call = A(0, -64, 30, { d: 0.45, ent: 'fade' });
          K.acg = { a: ['agent', 'b'], b: ['call', 't'], c: G, w: 1.6, d: 0.4, pulses: pulse(lt, 0.5, 1.0) };
          K.ccg = { a: ['call', 'b'], b: ['clockp', 't'], c: G, w: 1.6, d: 2.2, pulses: pulse(lt, 2.4, 2.9) };
        }
      }
      cam = a1 ? { x: 0, y: 0, zoom: 1, yaw: 1, pitch: 2 } : { x: 0, y: 0, zoom: lerp(0.95, 1, eo(seg(lt, 0, 3.5))), yaw: -1.5, pitch: 2 };
      break;
    }
    case 'anchor0': case 'anchor1': {
      const a1 = id === 'anchor1';
      if (w) {
        C.agent = A(-355, AY, 0, { ry: TILT, s: 0.8, dm: 0.6 });
        C.clock = A(-25, AY, -30, { on: a1 ? 0 : onAt(lt, 0.3, 1.6), dm: a1 ? 0.3 : 0 });
        C.entry = A(MBX, AY, 0, { ry: -TILT, d: a1 ? 0 : 0.5, on: a1 ? 1 : onAt(lt, 1.6) });
        K.acg = { a: ['agent', 'r'], b: ['clock', 'l'], c: G, w: 1.6, al: 0.45 };
        K.ce = { a: ['clock', 'r'], b: ['entry', 'l'], c: G, w: 1.6, d: 0.6, al: a1 ? 0.6 : 1, pulses: a1 ? [] : pulse(lt, 0.7, 1.4) };
      } else {
        C.clockp = A(-112, LY, 10, { on: a1 ? 0 : onAt(lt, -1, 1.6) });
        C.entry = A(0, 16, 0, { d: a1 ? 0 : 0.5, on: a1 ? 1 : onAt(lt, 1.6) });
        K.ce = { a: ['clockp', 't'], b: ['entry', 'b-60'], c: G, w: 1.6, d: 0.6, al: a1 ? 0.6 : 1, pulses: a1 ? [] : pulse(lt, 0.7, 1.4) };
      }
      K.em = anc(['entry', w ? 'b' : 'b40'], MBX, { d: a1 ? 0 : 1.8, pulses: a1 ? amb(0.45, 2, false) : pulse(lt, 1.9, 2.5) });
      cam = { x: pick(-25, 0), y: 0, zoom: 1, yaw: a1 ? 1 : -1, pitch: a1 ? 2 : 2.5 };
      break;
    }
    case 'receipt0': case 'receipt1': {
      const r1 = id === 'receipt1';
      if (w) {
        C.agent = A(-300, AY, 0, { ry: TILT, on: r1 ? 0 : onAt(lt, 1.6), dm: r1 ? 0.3 : 0 });
        C.receipt = A(150, AY, 20, { ry: -TILT * 0.5, d: r1 ? 0 : 0.35, on: r1 ? onAt(lt, 1.1) : onAt(lt, 0.5, 1.6) });
        K.ra = { a: ['receipt', 'l'], b: ['agent', 'r'], c: G, w: 1.6, d: 0.9, al: r1 ? 0.45 : 1, pulses: r1 ? [] : pulse(lt, 1.0, 1.6) };
        /* Clockchain folds into its pill on the ledger, as in the Agents animation */
        if (!r1) C.clock = A(-150, LY, -30, { o: 0, s: 0.45, mv: 0.7 });
        C.clockp = A(-150, LY, 10, r1 ? {} : { ent: 'fade', d: 0.45 });
      } else {
        C.receipt = A(0, 18, 0, { d: r1 ? 0 : 0.35, on: r1 ? onAt(lt, 1.1) : onAt(lt, 0.5, 1.6) });
        C.clockp = A(-112, LY, 10);
      }
      /* issued from the ledger entry (up), then verified against the block (down) */
      K.rm = anc(['receipt', w ? 'b' : 'b40'], MBX, { d: r1 ? 0 : 0.2, pulses: r1 ? pulse(lt, 0.2, 1.0) : pulse(lt, 0.3, 0.95, true) }, w);
      cam = { x: pick(-60, 0), y: 0, zoom: 1, yaw: r1 ? 1 : -1, pitch: 2 };
      break;
    }
    /* ===================== 02 · CHANGE ONE BYTE ===================== */
    case 'tamper0': case 'tamper1': case 'tamper2': {
      const t = ph - 6;
      if (w) {
        C.agent = A(-300, AY, 0, { ry: TILT, dm: 0.6 });
        C.receipt = A(150, AY, 20, { ry: -TILT * 0.5 });
        K.ra = { a: ['receipt', 'l'], b: ['agent', 'r'], c: G, w: 1.6, al: 0.3 };
        C.clockp = A(-150, LY, 10);
      } else {
        C.receipt = A(0, 18, 0);
        C.clockp = A(-112, LY, 10);
      }
      const ep = ['receipt', w ? 'b' : 'b40'];
      K.rm = anc(ep, MBX, { al: t >= 1 ? 0.3 : 0.6 }, w);
      if (t >= 1) K.rv = anc(ep, MBX, { c: R, dash: 4, d: t === 1 ? 0.3 : 0, pulses: t === 1 ? pulse(lt, 0.4, 1.3) : [] }, w);
      cam = { x: pick(-60, 0), y: 0, zoom: [1, 1.01, 1.02][t], yaw: [0, -1, 0][t], pitch: 2 };
      break;
    }
    case 'end0': {
      C.clockE = A(0, pick(18, 8), 0, { d: 0.45 });
      K.cm = { a: ['clockE', 'b'], b: { node: 'mB', port: 'o' }, c: G, d: 1.1, al: 0.6, pulses: pulse(lt, 1.3, 2.0) };
      cam = { x: 0, y: pick(-20, 0), zoom: 1, yaw: 0, pitch: 2, mv: 1.2 };
      break;
    }
  }
  /* the ledger and its block mark stay from the moment of anchoring to the end card */
  if (ph >= 2) {
    C.mB = A(ph === 9 ? 0 : MBX, LY, 0, { d: Math.max(0, MB_T - t0), mv: 1.1 });
    C.lk = w ? A(-430, LY + 19, 0, { d: Math.max(0, 7.9 - t0) }) : A(138, LY - 15, 0, { d: Math.max(0, 7.9 - t0) });
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
function content(T, id) {
  const ck = tHTML(T);
  txt(Q('clock', 'hms'), ck); txt(Q('clockp', 'hms'), ck); txt(Q('clockE', 'hms'), ck);
  const st = { act0: 'Verifiable time', act1: 'Receives the call', anchor0: 'Anchors the fingerprint', anchor1: 'Append-only record' }[id];
  if (st) txt(Q('clock', 'st'), st);
  /* the agent and its action */
  setKV(Q('agent', 'act'), T >= 0.9 ? 'live' : '', T >= 0.9 ? 'execute_payment' : '&mdash;');
  setKV(Q('agent', 'to'), T >= 1.25 ? 'live' : '', T >= 1.25 ? 'Northwind Logistics' : '&mdash;');
  setKV(Q('agent', 'amt'), T >= 1.6 ? 'live' : '', T >= 1.6 ? '$180,000' : '&mdash;');
  ensure(N.agent.faces[0].el, '--nk', eo(seg(T, 5.3, 5.8)).toFixed(3));
  /* the tool call: the fingerprint is computed while the call travels */
  txt(Q('call', 'h'), typed(HASH, seg(T, 4.3, 5.8)));
  /* the ledger entry */
  const anchored = T >= 9.7;
  setKV(Q('entry', 'eh'), anchored ? 'ok' : T >= 7.9 ? 'live' : '', T >= 7.9 ? typed(HASH, seg(T, 7.9, 8.8)) : '&mdash;');
  setKV(Q('entry', 'li'), anchored ? 'ok' : T >= 8.8 ? 'live' : '', T >= 8.8 ? LEDGER_ID : '&mdash;');
  setKV(Q('entry', 'bk'), anchored ? 'ok tg' : T >= 9.2 ? 'live' : '', T >= 9.2 ? (W ? '3,746,557' : '3,746,557 &middot; confirmed') : '&mdash;');
  setNote(Q('entry', 'nt'), 'ok', 'Append-only, independently verifiable', seg(T, 10.7, 11.1));
  /* the receipt: verified, then one byte changes and re-verification rejects it */
  const verified = T >= 18.6 && T < 21.5, changed = T >= 21.5, rejected = T >= 26.2;
  const base = verified ? 'ok' : 'live';
  setKV(Q('receipt', 'ac'), changed ? 'bad' : T >= 14.7 ? base : '',
    T < 14.7 ? '&mdash;' : 'execute_payment &middot; Northwind &middot; ' + (changed ? '$1,800,000' : '$180,000'));
  setKV(Q('receipt', 'idn'), T >= 15.05 ? base + ' tg' : '', T >= 15.05 ? 'did:clockchain:meridian:vega' + (W ? '' : ' &check;') : '&mdash;');
  setKV(Q('receipt', 'an'), T >= 15.4 ? base + ' tg' + (T >= 23.8 ? ' hl' : '') : '', T >= 15.4 ? (W ? 'block 3,746,557' : 'block 3,746,557 (confirmed)') : '&mdash;');
  setKV(Q('receipt', 'stt'), T >= 15.75 ? base : '', T >= 15.75 ? 'single-validator-testnet' : '&mdash;');
  const rn = rejected ? ['bad', 'Rejected &middot; tamper detected'] : T >= 23.6 ? ['', 'Re-verifying against the same ledger entry']
    : changed ? ['', 'One byte changed'] : ['ok', 'Verified against the on-chain block'];
  setNote(Q('receipt', 'rn'), rn[0], rn[1], changed ? 1 : seg(T, 18.6, 19.0));
  const rc = N.receipt.faces[0].el;
  ensure(rc, '--sl', (verified ? eo4(seg(T, 18.6, 18.95)) : 0).toFixed(3));
  cls(rc, 'is-bad', rejected);
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
  if (T < 7.0 || fadeAll < 0.01) return;
  const LY = W ? LYW : LYT;
  const R = eio(seg(T, 7.2, 8.6));
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
    let b0 = W ? LYW - 46 : LYT - 40, b1 = W ? 150 : 112;
    FIT = Math.min(FITh, (s1 - s0) / (b1 - b0));
    const lo = W && FIT < 0.85;
    /* short stages draw the labels larger, so the cards grow: fit a taller band */
    if (lo) { b0 = LYW - 54; b1 = 166; FIT = Math.min(FITh, (s1 - s0) / (b1 - b0)); }
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
