/* CLOCKCHAIN SHADOW · "the record and its shadow" (scene for the shared player, agents/player.js).
   Not a timeline. The record is a ring of step tiles around Clockchain's light; every tile casts its shadow onto the
   ledger, and that shadow is its fingerprint. Checking moves the record along the light onto its shadow: every tile fits.
   One changed character moves one notch of tile 07, and it no longer fits.
   Each tile's notched edge is drawn from its step's hash, so "fits" and "doesn't fit" are literal.
   Every value comes from BRIEF.md (the film and the kit page). Everything is a pure function of story time t. */
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

THREE.ColorManagement.enabled = false;
const V3 = THREE.Vector3;

/* ---------- maths ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eout = (x) => 1 - Math.pow(1 - x, 3);
const backOut = (x) => { const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const win = (t, a, b, fi = 0.4, fo = 0.4) => Math.min(ramp(t, a, a + fi), 1 - ramp(t, b - fo, b));
const RAD = THREE.MathUtils.degToRad;

/* ---------- facts (BRIEF.md) ---------- */
const STEPS = [
  ['01', '', ''], ['02', '', ''], ['03', '', ''],
  ['04', 'Task', '701b6153'], ['05', 'Tool call', '3eaed678'], ['06', 'Tool result', 'a8cb9a96'], ['07', 'Message', 'be62ef5d'],
  ['08', '', ''], ['09', '', ''], ['10', '', ''],
];
const CHECKS = [['format', 'pass'], ['content', 'fail'], ['sequence', 'pass'], ['membership', 'pass'], ['signature', 'pass'], ['trust', 'pass'], ['identity', 'not applicable'],
  ['coverage', 'pass'], ['provenance', 'pass'], ['completion', 'pass'], ['anchors', 'pass'], ['witness', 'indeterminate'], ['time', 'indeterminate'], ['truth', 'not applicable']];
const CLOCK0 = 1 * 3600 + 29 * 60 + 34.197;
const VIEW_LINK = 'mcp.clockchain.network/shadow/s/••••••';

/* ---------- world ---------- */
const N = 10, RR = 2.55, TW = 0.98, TD = 0.62, TH = 0.07, H0 = 1.05;
const ANG = (i) => RAD(30 + i * 31);              /* clockwise from 12 o'clock, seen from above; the gap at the top is where Codex works */
const DX = 0.36, DZ = 0.36;                        /* the light's slant: a tile at height h casts its shadow h·(DX, DZ) away */
const LIGHT = new V3(-DX * 3.6, 3.6, -DZ * 3.6);   /* Clockchain, the light above the record */
const AG = new V3(0, 0, -4.9), PP = new V3(0.2, 0, 5.0);   /* Codex (12 o'clock) and the second person (6 o'clock) */
const RIM = 3.75;
const BLOCKS = [[RAD(12), '313,491', 'Start'], [RAD(30 + 6 * 31 + 15.5), '313,492', 'Checkpoint · steps 1–7'], [RAD(30 + 9 * 31 + 16), '313,493', 'Signed']];
const slot = (i, r = RR) => { const a = ANG(i); return new V3(r * Math.sin(a), 0, -r * Math.cos(a)); };
const prof = (i, changed) => {
  const s = STEPS[i][2] || ['3a1c9e07', '72e05b1d', 'c519a4f2', '', '', '', '', '0d7b93e6', '5f28c1a4', 'e1946b3d'][i];
  const v = [...s].map((c) => parseInt(c, 16) % 4);
  if (changed) v[5] = (v[5] + 2) % 4;              /* one character changes: one notch moves */
  return v;
};
function shapeOf(v) {
  const s = new THREE.Shape(), n = v.length, sw = TW / n, w = TW / 2, d = TD / 2;
  s.moveTo(-w, d); s.lineTo(-w, -d);
  for (let k = 0; k < n; k++) { const y = -d + v[k] * 0.075; s.lineTo(-w + k * sw, y); s.lineTo(-w + (k + 1) * sw, y); }
  s.lineTo(w, -d); s.lineTo(w, d); s.lineTo(-w, d);
  return s;
}
/* outline in tile space (x along the ring, +z outward, y up); the notched edge faces out */
const outl = (v, y) => shapeOf(v).getPoints().flatMap((p) => [p.x, y, -p.y]);

/* ---------- state ---------- */
let R, LR, scene, cam, root, ov, W = 1, H = 1, SM = false, C, PAL = {};
let ST = {}, TOTAL = 63.5;
const hooks = [], lineMats = [], ACT = [];
const fogU = { near: 10, far: 30 };
const at = (id, line = 0, f = 0) => { const s = ST[id]; return s.s + (line + f) * s.d / s.n; };
const F = { T: 0 };

function derive(c) {
  const col = (x) => new THREE.Color(x), mix = (a, b, k) => col(a).lerp(col(b), k);
  return {
    accent: col(c.accent), ink: col(c.fg), fg3: col(c.fg3), surface: col(c.surface), line: col(c.line), line2: col(c.line2),
    red: col('#e5484d'),
    grid: mix(c.surface, c.fg, c.dark ? 0.06 : 0.055),
    dial: mix(c.surface, c.fg, c.dark ? 0.22 : 0.24),
    dialMajor: mix(c.surface, c.fg, c.dark ? 0.4 : 0.42),
    band: mix(c.surface, c.accent, c.dark ? 0.06 : 0.05),
    rail: mix(c.surface, c.accent, c.dark ? 0.4 : 0.5),
    tileTop: c.dark ? mix(c.surface, c.fg, 0.09) : col('#ffffff'),
    tileSide: mix(c.surface, c.fg, c.dark ? 0.2 : 0.16),
    edge: mix(c.surface, c.fg, c.dark ? 0.55 : 0.6),
    ghost: mix(c.surface, c.fg, c.dark ? 0.3 : 0.3),
    shadow: mix(c.surface, c.fg, c.dark ? 0.2 : 0.12),
    sEdge: mix(c.surface, c.fg, c.dark ? 0.36 : 0.34),
    fitFill: mix(c.surface, c.accent, c.dark ? 0.26 : 0.2),
    badFill: mix(c.surface, '#e5484d', c.dark ? 0.3 : 0.2),
    beam: mix(c.surface, c.accent, c.dark ? 0.5 : 0.55),
    link: mix(c.surface, c.fg, c.dark ? 0.42 : 0.4),
  };
}

/* ---------- lines ---------- */
function mkLine(pts, role, w, o = {}) {
  const g = new LineGeometry(); g.setPositions(pts);
  const m = new LineMaterial({ linewidth: w, transparent: true, depthTest: false, depthWrite: false, fog: true, dashed: !!(o.reveal || o.dash) });
  if (o.reveal) { m.dashSize = 1e6; m.gapSize = 1e7; }
  if (o.dash) { m.dashSize = o.dash[0]; m.gapSize = o.dash[1]; }
  m.opacity = o.op ?? 1; m.resolution.set(W, H);
  const l = new Line2(g, m); l.computeLineDistances();
  l.frustumCulled = false; l.renderOrder = o.ro ?? 2;
  lineMats.push(m);
  if (role) hooks.push(() => m.color.copy(PAL[role]));
  (o.parent || scene).add(l);
  return l;
}
function lineLen(l) { const d = l.geometry.attributes.instanceDistanceEnd; return d ? d.array[d.array.length - 1] : 0; }
function show(obj, a) { obj.visible = a > 0.004; if (obj.material) obj.material.opacity = a; }
const circle = (r, y, n = 128, a0 = 0, a1 = Math.PI * 2) => Array.from({ length: n + 1 }, (_, i) => { const a = lerp(a0, a1, i / n); return [r * Math.sin(a), y, -r * Math.cos(a)]; }).flat();

/* ---------- labels ---------- */
const LABELS = [];
function mkLabel(html, cls, parent, pos) {
  const el = document.createElement('div'); el.className = 'sh-o';
  const inner = document.createElement('div'); inner.className = cls; inner.innerHTML = html; el.appendChild(inner);
  const obj = new CSS2DObject(el); if (pos) obj.position.copy(pos);
  (parent || scene).add(obj);
  const lb = { obj, el, inner, a: -1 };
  LABELS.push(lb); setA(lb, 0);
  return lb;
}
function setA(lb, a) {
  a = a < 0.01 ? 0 : a > 0.995 ? 1 : Math.round(a * 100) / 100;
  if (a === lb.a) return;
  lb.a = a; lb.obj.visible = a > 0; lb.el.style.opacity = String(a);
}
/* screen cards: the long reads (connector, task, verifier...) sit in a fixed corner of the stage so they never clip */
const CARDS = [];
function mkCard(html, pos) {
  const d = document.createElement('div'); d.className = 'sh-card sh-' + pos; d.innerHTML = html; ov.appendChild(d);
  const c = { el: d, a: -1 }; CARDS.push(c); cardA(c, 0); return c;
}
function cardA(c, a) {
  a = a < 0.01 ? 0 : Math.round(a * 100) / 100; if (a === c.a) return; c.a = a;
  c.el.style.opacity = String(a); c.el.style.visibility = a > 0 ? 'visible' : 'hidden';
  c.el.style.transform = 'translateY(' + ((1 - a) * 8).toFixed(1) + 'px)';
}
function sty(el, p, v) { if (el['_' + p] !== v) { el['_' + p] = v; el.style[p] = v; } }
function cls(el, c, on) { if (el['_c' + c] !== on) { el['_c' + c] = on; el.classList.toggle(c, on); } }

const IC = {
  check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 8.6l3 3 6.6-7.2"/></svg>',
  x: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  key: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="4.9" cy="8" r="2.7"/><path d="M7.6 8h6.2M11.6 8v2.3M13.8 8v1.7"/></svg>',
  link: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.6 9.4l2.8-2.8M5.4 7.4L4 8.8a2.4 2.4 0 0 0 3.4 3.4l1.4-1.4M10.6 8.6L12 7.2a2.4 2.4 0 0 0-3.4-3.4L7.2 5.2"/></svg>',
};

const CSS = `
.sh-root{position:absolute;inset:0;pointer-events:none;overflow:hidden;
  --sh-ink:color-mix(in oklab,var(--accent) 64%,black);--sh-chip:color-mix(in oklab,var(--accent) 11%,var(--surface));
  --sh-plate:color-mix(in srgb,var(--surface) 92%,transparent);
  --sh-red:#e5484d;--sh-red-ink:#c4363b;--sh-red-soft:color-mix(in oklab,#e5484d 12%,var(--surface));}
:root[data-variant="eclipse"] .sh-root{--sh-ink:var(--accent);--sh-chip:color-mix(in oklab,var(--accent) 16%,var(--surface));--sh-red-ink:#ff8084;--sh-red-soft:color-mix(in oklab,#e5484d 22%,var(--surface));}
.sh-root>canvas{position:absolute;inset:0;}
.sh-lay{position:absolute;top:0;left:0;}
.sh-o{position:absolute;top:0;left:0;}
.sh-o svg,.sh-card svg{width:12px;height:12px;flex:none;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}
.sh-u{transform:translate(0,calc(-50% - 16px));}
.sh-d{transform:translate(0,calc(50% + 14px));}
.sh-r{transform:translate(calc(50% + 14px),0);}
.sh-l{transform:translate(calc(-50% - 14px),0);text-align:right;}
.sh-n{display:block;font:500 9.5px/1.2 var(--f-mono);letter-spacing:.13em;text-transform:uppercase;color:var(--fg-3);white-space:nowrap;}
.sh-h{display:block;font:400 10.5px/1.2 var(--f-mono);color:var(--fg);white-space:nowrap;font-variant-numeric:tabular-nums;}
.sh-tl{display:flex;flex-direction:column;align-items:center;gap:2px;padding:3px 6px;border-radius:6px;background:var(--sh-plate);transition:none;}
.sh-tl.g .sh-n{color:var(--sh-ink);} .sh-tl.r .sh-n,.sh-tl.r .sh-h{color:var(--sh-red-ink);}
.sh-fl{font:400 10px/1 var(--f-mono);color:var(--fg-3);white-space:nowrap;padding:2px 4px;border-radius:4px;background:var(--sh-plate);}
.sh-bl{display:flex;flex-direction:column;align-items:center;gap:3px;padding:3px 6px;border-radius:6px;background:var(--sh-plate);}
.sh-bl .sh-n{color:var(--sh-ink);} .sh-bl .sh-h{color:var(--fg);}
.sh-tag{display:flex;align-items:center;gap:7px;padding:6px 10px 6px 8px;border-radius:9px;background:var(--surface);border:1px solid var(--line-2);
  font:500 10.5px/1 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--fg);white-space:nowrap;}
.sh-tag>b{width:8px;height:8px;border-radius:2px;background:var(--fg);flex:none;}
.sh-tag em{font-style:normal;color:var(--fg-3);letter-spacing:.02em;text-transform:none;font-weight:400;}
.sh-tag .ck{display:inline-flex;color:var(--sh-ink);overflow:hidden;max-width:0;margin-left:-7px;}
.sh-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border-radius:7px;background:var(--sh-chip);color:var(--sh-ink);
  font:500 9.5px/1 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;}
.sh-chip.out{background:var(--surface);color:var(--fg);box-shadow:inset 0 0 0 1px var(--line-2);}
.sh-chip.ink{background:var(--fg);color:var(--surface);}
.sh-chip.red{background:var(--sh-red-soft);color:var(--sh-red-ink);}
.sh-clock{display:flex;flex-direction:column;gap:3px;padding:3px 6px;border-radius:6px;background:var(--sh-plate);}
.sh-clock .sh-n{color:var(--fg);} .sh-clock .sh-h i{font-style:normal;color:var(--sh-ink);}

.sh-ov{position:absolute;inset:0;pointer-events:none;z-index:2147483000;}
.sh-lay{z-index:1;}
.sh-card{position:absolute;background:var(--surface);border:1px solid var(--line-2);border-radius:12px;padding:11px 13px 12px;
  box-shadow:0 1px 2px color-mix(in oklab,var(--fg) 4%,transparent),0 16px 36px -22px color-mix(in oklab,var(--fg) 38%,transparent);
  font:400 12px/1.35 var(--f-body);color:var(--fg);white-space:nowrap;visibility:hidden;}
:root[data-variant="eclipse"] .sh-card{box-shadow:0 18px 40px -24px rgba(0,0,0,.8);}
.sh-card.r{border-color:color-mix(in oklab,var(--sh-red) 60%,var(--line-2));box-shadow:0 0 0 4px var(--sh-red-soft);}
.sh-tr{top:16px;right:70px;} .sh-tl2{top:16px;left:16px;} .sh-br{bottom:16px;right:16px;}
.sh-k{display:flex;align-items:center;gap:8px;font:500 9.5px/1 var(--f-mono);letter-spacing:.13em;text-transform:uppercase;color:var(--fg-3);}
.sh-k b{color:var(--sh-ink);font-weight:500;} .sh-card.r .sh-k b{color:var(--sh-red-ink);}
.sh-row{display:flex;align-items:center;gap:6px;font:500 9.5px/1 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--sh-ink);margin-top:8px;}
.sh-row.n{color:var(--fg-3);} .sh-row.n s{text-decoration:line-through;}
.sh-row.x{color:var(--sh-red-ink);}
.sh-row.big{font-size:11px;}
.sh-url{font:400 10.5px/1.2 var(--f-mono);color:var(--fg-2);margin-top:8px;}
.sh-p{white-space:normal;width:250px;margin-top:8px;font:400 12.5px/1.4 var(--f-body);color:var(--fg);}
.sh-p u{text-decoration:none;border-radius:3px;padding:0 2px;}
.sh-p u.on{background:var(--sh-red-soft);color:var(--sh-red-ink);}
.sh-cmd{margin-top:9px;padding-top:8px;border-top:1px solid var(--line);font:400 10px/1 var(--f-mono);color:var(--fg-3);}
.sh-chk{display:grid;grid-template-columns:auto auto;gap:3px 12px;margin-top:9px;}
.sh-cr{display:flex;justify-content:space-between;gap:12px;font:400 10px/1 var(--f-mono);color:var(--fg-2);padding:3px 5px;border-radius:4px;}
.sh-cr i{font-style:normal;color:var(--fg-3);} .sh-cr.p i{color:var(--sh-ink);}
.sh-cr.f{background:var(--sh-red-soft);color:var(--sh-red-ink);} .sh-cr.f i{color:var(--sh-red-ink);}
.sh-note{margin-top:9px;font:400 11px/1.3 var(--f-body);color:var(--sh-red-ink);}
.sh-sm .sh-card{transform-origin:100% 0;scale:.78;} .sh-sm .sh-tl2{transform-origin:0 0;}
.sh-sm .sh-tr,.sh-sm .sh-tl2{top:10px;} .sh-sm .sh-tr{right:52px;} .sh-sm .sh-tl2{left:8px;}
.sh-sm .sh-tag{font-size:8.5px;padding:4px 7px 4px 6px;gap:5px;}
.sh-sm .sh-tag em{display:none;}
.sh-sm .sh-tl .sh-h{display:none;}
.sh-sm .sh-n{font-size:8.5px;}
.sh-sm .sh-fl{display:none;}
.sh-sm .sh-tl.un,.sh-sm .sh-hide{display:none;}
.sh-sm .sh-clock{display:none;}
`;

/* =====================================================================================
   BUILD
   ===================================================================================== */
function buildGround() {
  /* the ledger: a quiet grid, the clock dial around the record, and the band the shadows land in */
  const grid = [];
  for (let x = -8; x <= 8.01; x += 0.75) grid.push(mkLine([x, 0, -8, x, 0, 8], 'grid', 1, { ro: 0 }));
  for (let z = -8; z <= 8.01; z += 0.75) grid.push(mkLine([-8, 0, z, 8, 0, z], 'grid', 1, { ro: 0 }));
  ACT.push(() => grid.forEach((l) => show(l, ramp(F.T, 0, 0.8))));

  const bandM = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, fog: true });
  hooks.push(() => bandM.color.copy(PAL.band));
  const band = new THREE.Mesh(new THREE.RingGeometry(RR - 0.62, RR + 1.02, 128), bandM);
  band.rotation.x = -Math.PI / 2; band.renderOrder = 0; scene.add(band);
  const rails = [mkLine(circle(RR - 0.62, 0), 'rail', 1, { reveal: true, ro: 1 }), mkLine(circle(RR + 1.02, 0), 'rail', 1, { reveal: true, ro: 1 })];
  const railLen = lineLen(rails[0]), railLen2 = lineLen(rails[1]);
  /* the dial: Clockchain's one clock, ticks around the rim */
  const mi = [], ma = [];
  for (let k = 0; k < 120; k++) {
    const a = (k / 120) * Math.PI * 2, s = Math.sin(a), c = -Math.cos(a), big = k % 10 === 0, r0 = RIM, r1 = RIM + (big ? 0.26 : 0.12);
    (big ? ma : mi).push([r0 * s, 0, r0 * c, r1 * s, 0, r1 * c]);
  }
  const ticks = mi.map((p) => mkLine(p, 'dial', 1, { ro: 1 })).concat(ma.map((p) => mkLine(p, 'dialMajor', 1.2, { ro: 1 })));
  const t0 = at('record', 0, 0.12);
  ACT.push(() => {
    const T = F.T, u = eio(ramp(T, 0.2, 2.4));
    ticks.forEach((l, i) => show(l, ramp(u * 1.15, i / ticks.length * 0.9, i / ticks.length * 0.9 + 0.1)));
    /* the ledger band opens with the start marker */
    const b = eio(ramp(T, t0, t0 + 1.4));
    bandM.opacity = b; band.visible = b > 0;
    rails[0].material.dashSize = Math.max(1e-4, railLen * b); rails[1].material.dashSize = Math.max(1e-4, railLen2 * b);
    rails.forEach((l) => { l.visible = b > 0; });
  });
  const ledL = mkLabel('<span class="sh-chip sh-hide">Ledger · clockchain-testnet</span>', 'sh-r', scene, new V3(RR + 1.05, 0, 0.9));
  ACT.push(() => setA(ledL, win(F.T, t0 + 0.6, at('anchor', 1, 0.95), 0.5, 0.5)));

  /* block marks on the rim: start, checkpoint of steps 1–7, signed checkpoint */
  const tB = [at('record', 0, 0.16), at('anchor', 0, 0.42), at('share', 0, 0.42)];
  BLOCKS.forEach(([a, n, w], i) => {
    const s = Math.sin(a), c = -Math.cos(a);
    const mk = mkLine([(RR - 0.7) * s, 0, (RR - 0.7) * c, (RIM + 0.34) * s, 0, (RIM + 0.34) * c], 'accent', 2.2, { reveal: true, ro: 3 });
    const len = lineLen(mk);
    const glow = mkLine([(RR - 0.7) * s, 0, (RR - 0.7) * c, (RIM + 0.34) * s, 0, (RIM + 0.34) * c], 'accent', 9, { op: 0.15, ro: 2 });
    const lb = mkLabel('<div class="sh-bl"><span class="sh-n">' + w + '</span><span class="sh-h">Block ' + n + '</span></div>', 'sh-o2', scene, new V3((RIM + 0.75) * s, 0, (RIM + 0.75) * c));
    ACT.push(() => {
      const T = F.T, u = eout(ramp(T, tB[i], tB[i] + 0.6));
      mk.visible = u > 0; mk.material.dashSize = Math.max(1e-4, len * u);
      show(glow, 0.15 * win(T, tB[i], tB[i] + 2.2, 0.3, 1.2));
      setA(lb, ramp(T, tB[i] + 0.2, tB[i] + 0.6) * (SM ? win(T, tB[i], tB[i] + 3, 0.3, 0.5) : 1));
    });
  });
}

/* ---------- the record: ten tiles in a ring, each with its shadow ---------- */
const TILES = [];
function buildRecord() {
  const tDrop = [];
  const rec = (l, f) => at('record', l, f);
  /* steps 01–03 in the first line, 04–07 in the second, 08–10 when the session closes */
  for (let i = 0; i < 3; i++) tDrop.push(rec(0, 0.32 + i * 0.16));
  for (let i = 0; i < 4; i++) tDrop.push(rec(1, 0.06 + i * 0.22));
  for (let i = 0; i < 3; i++) tDrop.push(at('share', 0, 0.04 + i * 0.09));
  const tCast = (i) => (i < 7 ? at('anchor', 0, 0.06 + i * 0.045) : at('share', 0, 0.36 + (i - 7) * 0.05));

  for (let i = 0; i < N; i++) {
    const a = ANG(i), base = slot(i), rotY = Math.PI - a;
    const v0 = prof(i, false), v1 = prof(i, true), seven = i === 6;
    /* the shadow on the ledger: cast once, at anchoring; it never moves */
    const sg = new THREE.Group(); sg.rotation.y = rotY; sg.position.set(base.x + DX * H0, 0.004, base.z + DZ * H0); scene.add(sg);
    const sGeo = new THREE.ShapeGeometry(shapeOf(v0)); sGeo.rotateX(-Math.PI / 2);
    const sMat = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, fog: true });
    const sMesh = new THREE.Mesh(sGeo, sMat); sMesh.renderOrder = 1; sg.add(sMesh);
    const sEdge = mkLine(outl(v0, 0), null, 1, { parent: sg, ro: 2 });
    const sGlow = mkLine(outl(v0, 0), null, 8, { parent: sg, ro: 1 });
    const sHash = STEPS[i][2] ? mkLabel('<span class="sh-fl">' + STEPS[i][2] + '</span>', 'sh-d', sg, new V3(0, 0, TD / 2)) : null;

    /* the tile */
    const tg = new THREE.Group(); tg.rotation.y = rotY; scene.add(tg);
    const mkTile = (v) => { const g = new THREE.ExtrudeGeometry(shapeOf(v), { depth: TH, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g; };
    const topM = new THREE.MeshBasicMaterial({ transparent: true, fog: true, depthWrite: false }), sideM = new THREE.MeshBasicMaterial({ transparent: true, fog: true, depthWrite: false });
    const geoA = mkTile(v0), geoB = seven ? mkTile(v1) : null;
    const mesh = new THREE.Mesh(geoA, [topM, sideM]); mesh.renderOrder = 4; tg.add(mesh);
    const eA = mkLine(outl(v0, TH), null, 1.2, { parent: tg, ro: 5 });
    const eB = seven ? mkLine(outl(v1, TH), null, 1.2, { parent: tg, ro: 5 }) : null;
    const tGlow = mkLine(outl(v0, TH), null, 7, { parent: tg, ro: 4 });
    /* the moved notch, marked red on the copy and on its shadow */
    let notch = null, sNotch = null;
    if (seven) {
      const sw = TW / 8, k = 5, y1 = -TD / 2 + v1[k] * 0.075, y0 = -TD / 2 + v0[k] * 0.075;
      notch = mkLine([-TW / 2 + k * sw, TH + 0.004, -y1, -TW / 2 + (k + 1) * sw, TH + 0.004, -y1], 'red', 3.2, { parent: tg, ro: 7 });
      sNotch = mkLine([-TW / 2 + k * sw, 0.002, -y0, -TW / 2 + (k + 1) * sw, 0.002, -y0], 'red', 3.2, { parent: sg, ro: 7 });
    }
    const ghost = mkLine(outl(new Array(8).fill(0), 0.0), 'ghost', 1, { dash: [0.05, 0.05], ro: 3 });
    const ghG = new THREE.Group(); ghG.rotation.y = rotY; ghG.position.set(base.x, H0, base.z); scene.add(ghG); ghG.add(ghost);
    const drop = mkLine([0, 0, 0, DX * H0, -H0, DZ * H0], 'accent', 1.2, { dash: [0.06, 0.05], ro: 3 });
    drop.position.set(base.x, H0, base.z);
    const beam = mkLine([LIGHT.x, LIGHT.y, LIGHT.z, base.x, H0 + TH, base.z], 'beam', 1, { reveal: true, ro: 2 });
    const beamLen = lineLen(beam);
    const lab = mkLabel('<div class="sh-tl' + (STEPS[i][2] ? '' : ' un') + '"><span class="sh-n">' + STEPS[i][0] + (STEPS[i][1] ? ' · ' + STEPS[i][1] : '') + '</span>' + (STEPS[i][2] ? '<span class="sh-h">' + STEPS[i][2] + '</span>' : '') + '</div>', 'sh-u', tg, new V3(0, TH, -TD / 2));
    TILES.push({ i, tg, base, tDrop: tDrop[i], tCast: tCast(i), lab });

    hooks.push(() => {
      topM.color.copy(PAL.tileTop); sideM.color.copy(PAL.tileSide);
    });
    ACT.push(() => {
      const T = F.T, td = tDrop[i], tc = tCast(i);
      /* in: the tile drops into its slot */
      const din = ramp(T, td, td + 0.55), on = din > 0;
      /* fit: the record moves along the light onto its shadow (check), back up for the change, down again (re-check) */
      const ck = at('check', 1, 0.04 + i * 0.012), up = at('change', 0, 0.02), rk = at('recheck', 0, 0.42 + i * 0.012), out = ST.end.s + 0.3;
      const fit = Math.max(eio(ramp(T, ck, ck + 1.3)) * (1 - eio(ramp(T, up, up + 1.1))), eio(ramp(T, rk, rk + 1.3)) * (1 - eio(ramp(T, out, out + 1.6))));
      const h = H0 * (1 - fit) + (1 - backOut(din)) * 0.9 * (din < 1 ? 1 : 0);
      const lift = 0.002 + 0.006 * fit;
      tg.position.set(base.x + DX * H0 * fit, Math.max(lift, h), base.z + DZ * H0 * fit);
      const ta = eout(din);
      tg.visible = on;
      topM.opacity = ta * lerp(1, 0.35, fit); sideM.opacity = ta * (1 - fit * 0.85);
      mesh.renderOrder = 4;
      /* the copy of step 07 changes in chapter 02 */
      const chg = seven ? ramp(T, at('change', 0, 0.52), at('change', 0, 0.58)) >= 1 && T < out + 1.6 : false;
      if (seven) { mesh.geometry = chg ? geoB : geoA; }
      /* colours: grey while recorded, green when its fit is checked, red when it doesn't fit */
      const checkOn = (T >= ck + 1.1 && T < up) || (T >= rk + 1.1);
      const bad = seven && chg && checkOn;
      const good = checkOn && !bad;
      const edgeC = bad ? PAL.red : good ? PAL.accent : PAL.edge;
      const chainHi = win(T, at('record', 2, 0.08 + i * 0.07), at('anchor', 0, 0.05), 0.15, 0.4) * (i < 7 ? 1 : 0);
      [eA, eB].forEach((l) => { if (!l) return; l.material.color.copy(chainHi > 0.5 && !good && !bad ? PAL.accent : edgeC); l.material.linewidth = good || bad ? 1.6 : 1.2; });
      show(eA, ta * (seven && chg ? 0 : 1)); if (eB) show(eB, ta * (chg ? 1 : 0));
      tGlow.material.color.copy(bad ? PAL.red : PAL.accent);
      show(tGlow, ta * Math.max(good || bad ? 0.2 : 0, chainHi * 0.16, win(T, td + 0.25, td + 1.2, 0.1, 0.6) * 0.18));
      if (notch) show(notch, chg ? ta * (0.6 + 0.4 * win(T, at('change', 0, 0.55), at('change', 0, 0.95), 0.1, 0.4)) : 0);
      /* the shadow: cast at anchoring */
      const ca = eout(ramp(T, tc, tc + 0.6));
      sg.visible = ca > 0;
      sMat.color.copy(good ? PAL.fitFill : bad ? PAL.badFill : PAL.shadow); sMat.opacity = ca;
      sEdge.material.color.copy(good ? PAL.accent : bad ? PAL.red : PAL.sEdge); sEdge.material.linewidth = good || bad ? 1.6 : 1;
      show(sEdge, ca);
      sGlow.material.color.copy(bad ? PAL.red : PAL.accent); show(sGlow, ca * (good || bad ? 0.18 : 0));
      if (sNotch) show(sNotch, bad ? 1 : 0);
      if (sHash) setA(sHash, ca * win(T, tc + 0.3, at('anchor', 1, 0.95), 0.3, 0.4));
      /* the cast: beam from the light to the tile, dashed drop to its shadow */
      const bu = ramp(T, tc - 0.35, tc + 0.05);
      beam.visible = bu > 0; beam.material.dashSize = Math.max(1e-4, beamLen * eout(bu));
      beam.material.opacity = 0.5 * win(T, tc - 0.35, (i < 7 ? at('anchor', 1, 0.5) : at('share', 1, 0.2)), 0.1, 0.6);
      const da = win(T, tc - 0.05, i < 7 ? at('anchor', 1, 0.95) : at('share', 1, 0.6), 0.25, 0.5);
      show(drop, da * 0.85); drop.scale.y = Math.max(0.001, ramp(T, tc - 0.1, tc + 0.35));
      drop.scale.x = drop.scale.z = drop.scale.y;
      /* the empty slot, waiting */
      show(ghost, (1 - ramp(T, td, td + 0.2)) * ramp(T, 0.6 + i * 0.12, 1.2 + i * 0.12) * 0.9);
      /* labels: named while it matters, quiet otherwise */
      const named = STEPS[i][2] ? 1 : 0.85;
      let la = ramp(T, td + 0.2, td + 0.6) * win(T, td, i < 7 ? at('anchor', 1, 0.05) : at('share', 1, 0.6), 0.2, 0.4) * named;
      la = Math.max(la, (good || bad) ? 1 : 0, seven ? win(T, ST.change.s, at('recheck', 1, 0.95), 0.3, 0.4) : 0);
      setA(lab, la * (1 - ramp(T, ST.means.s + 0.2, ST.means.s + 0.8)));
      cls(lab.inner.firstChild, 'g', good); cls(lab.inner.firstChild, 'r', !!(seven && chg));
    });
  }

  /* the chain: each step links to the one before it (numbered and chained) */
  for (let i = 1; i < N; i++) {
    const l = mkLine([0, 0, 0, 1, 0, 0], 'link', 1.4, { ro: 3 });
    const A = TILES[i - 1], B = TILES[i], pa = new V3(), pb = new V3();
    ACT.push(() => {
      const T = F.T, a = ramp(T, B.tDrop + 0.4, B.tDrop + 0.7);
      if (a <= 0) { l.visible = false; return; }
      /* from the far end of the earlier tile to the near end of the later one, at tile height */
      pa.set(-TW / 2, TH / 2, 0).applyEuler(A.tg.rotation).add(A.tg.position);
      pb.set(TW / 2, TH / 2, 0).applyEuler(B.tg.rotation).add(B.tg.position);
      l.geometry.setPositions([pa.x, pa.y, pa.z, pb.x, pb.y, pb.z]);
      const hi = win(T, at('record', 2, 0.08 + (i - 1) * 0.07), at('anchor', 0, 0.05), 0.15, 0.4) * (i < 7 ? 1 : 0);
      const fitOk = TILES[i].lab.inner.firstChild.classList.contains('g') && TILES[i - 1].lab.inner.firstChild.classList.contains('g');
      l.material.color.copy(hi > 0.5 || fitOk ? PAL.accent : PAL.link);
      l.material.linewidth = hi > 0.5 ? 2 : 1.4;
      show(l, a);
    });
  }
}

/* ---------- Clockchain: the light above ---------- */
function buildLight() {
  const g = new THREE.Group(); g.position.copy(LIGHT); scene.add(g);
  const ring = mkLine(circle(0.36, 0), 'accent', 2.2, { parent: g, ro: 8 });
  const halo = mkLine(circle(0.36, 0), 'accent', 12, { parent: g, ro: 7 });
  const pulse = mkLine(circle(0.36, 0), 'accent', 1.2, { parent: g, ro: 7 });
  const lb = mkLabel('<div class="sh-clock"><span class="sh-n">Clockchain</span><span class="sh-h"><b style="font-weight:400"></b><i></i></span></div>', 'sh-r', g, new V3(0.4, 0, 0));
  const hb = lb.inner.querySelector('b'), mi = lb.inner.querySelector('i');
  const p = (n) => String(n).padStart(2, '0');
  ACT.push(() => {
    const T = F.T, a = ramp(T, 0.3, 1.0) * (1 - ramp(T, TOTAL - 0.6, TOTAL));
    /* bright while it casts (anchoring, the signed checkpoint), dim otherwise */
    const lit = Math.max(win(T, at('anchor', 0, 0), at('anchor', 1, 0.6), 0.4, 0.8), win(T, at('share', 0, 0.3), at('share', 1, 0.3), 0.3, 0.6), win(T, at('record', 0, 0.1), at('record', 0, 0.3), 0.15, 0.4));
    show(ring, a * (0.55 + 0.45 * lit)); show(halo, a * (0.06 + 0.16 * lit));
    const f = ((CLOCK0 + T) % 1 + 1) % 1;
    pulse.scale.setScalar(1 + 1.3 * eout(f)); show(pulse, a * Math.pow(1 - f, 2) * 0.5);
    setA(lb, a * (1 - ramp(T, ST.end.s, ST.end.s + 0.4)));
    const ms = Math.round((CLOCK0 + T) * 1000), s = Math.floor(ms / 1000);
    const h = p(Math.floor(s / 3600)) + ':' + p(Math.floor(s / 60) % 60) + ':' + p(s % 60), m = '.' + String(ms - s * 1000).padStart(3, '0');
    if (hb.textContent !== h) hb.textContent = h;
    if (mi.textContent !== m) mi.textContent = m;
  });
}

/* ---------- parties: Codex (12 o'clock), the second person (6 o'clock) ---------- */
function mkParty(pos, html, t0, t1) {
  const g = new THREE.Group(); g.position.copy(pos); scene.add(g);
  const stem = mkLine([0, 0, 0, 0, 0.9, 0], 'edge', 1.2, { parent: g, ro: 5 });
  const foot = mkLine(circle(0.14, 0, 32), 'edge', 1.2, { parent: g, ro: 5 });
  const tag = mkLabel(html, 'sh-u', g, new V3(0, 0.9, 0));
  const P = { g, tag, a: 0 };
  ACT.push(() => {
    const a = win(F.T, t0, t1, 0.5, 0.6);
    P.a = a; show(stem, a); show(foot, a); setA(tag, a);
  });
  return P;
}
/* a message between two points: an arc that draws itself, with a travelling head and an optional chip */
function mkArc(p0, p1, t0, t1, role, o = {}) {
  const c = p0.clone().add(p1).multiplyScalar(0.5); c.y = Math.max(p0.y, p1.y) + (o.lift ?? 1.2);
  const pts = []; for (let k = 0; k <= 48; k++) { const s = k / 48; pts.push(new V3().copy(p0).multiplyScalar((1 - s) * (1 - s)).addScaledVector(c, 2 * (1 - s) * s).addScaledVector(p1, s * s)); }
  const l = mkLine(pts.flatMap((p) => [p.x, p.y, p.z]), role, o.w || 1.5, { reveal: true, ro: 6 });
  const len = lineLen(l);
  const head = mkLine(circle(0.06, 0, 16), role, 3, { ro: 9 });
  const chip = o.chip ? mkLabel(o.chip, 'sh-u', scene) : null;
  ACT.push(() => {
    const T = F.T, u = ramp(T, t0, t1), e = eio(u);
    const a = win(T, t0, t1 + (o.hold ?? 0.9), 0.05, 0.5);
    l.visible = a > 0; l.material.dashSize = Math.max(1e-4, len * e); l.material.opacity = a * (o.op ?? 0.9);
    const k = Math.min(48, Math.floor(e * 48)), p = pts[k];
    head.position.copy(p); show(head, win(T, t0, t1 + 0.1, 0.05, 0.15));
    if (chip) { chip.obj.position.copy(p); setA(chip, win(T, t0 + 0.05, t1 + (o.hold ?? 0.9) * 0.8, 0.15, 0.4)); }
  });
}

function buildStory() {
  const cn = (l, f) => at('connect', l, f), rc = (l, f) => at('record', l, f), an = (l, f) => at('anchor', l, f), sh = (l, f) => at('share', l, f);
  const ck = (l, f) => at('check', l, f), cg = (l, f) => at('change', l, f), rk = (l, f) => at('recheck', l, f), mn = (l, f) => at('means', l, f);

  /* ---- Codex and the second person ---- */
  const codex = mkParty(AG, '<div class="sh-tag"><b></b>Codex<em class="ss">Changelog draft</em><span class="ck">' + IC.check + '</span></div>', 0.15, ST.end.s + 0.2);
  const ckEl = codex.tag.inner.querySelector('.ck'), ssEl = codex.tag.inner.querySelector('.ss');
  ACT.push(() => {
    const k = eout(ramp(F.T, cn(0, 0.62), cn(0, 0.72)));
    sty(ckEl, 'maxWidth', (k * 14).toFixed(1) + 'px'); sty(ckEl, 'marginLeft', (-7 + 7 * k).toFixed(1) + 'px');
    sty(ssEl, 'display', F.T >= rc(0, 0.05) ? '' : 'none');
  });
  const person = mkParty(PP, '<div class="sh-tag"><b></b>Second person<em>own browser</em></div>', sh(0, 0.6), ST.end.s + 0.2);

  /* ---- 1 Connect: one connector ---- */
  const conn = mkCard('<div class="sh-k"><b>Connector</b></div><div class="sh-url">mcp.clockchain.network/shadow/mcp</div>' +
    '<div class="sh-row r1">' + IC.check + 'Free testnet account</div><div class="sh-row r2">' + IC.check + 'No email</div>', 'tl2');
  const cr = conn.el.querySelectorAll('.sh-row');
  ACT.push(() => {
    const T = F.T; cardA(conn, win(T, cn(0, 0.2), rc(0, 0.05), 0.4, 0.4));
    cr.forEach((r, i) => sty(r, 'opacity', String(ramp(T, cn(0, 0.45 + i * 0.12), cn(0, 0.55 + i * 0.12)))));
  });
  mkArc(AG.clone().setY(0.9), LIGHT.clone().setY(LIGHT.y - 0.05), cn(0, 0.3), cn(0, 0.6), 'ink', { lift: 0.8, chip: '<span class="sh-chip out">' + IC.link + 'Connector</span>', hold: 0.6 });

  /* ---- 2 Record ---- */
  const task = mkCard('<div class="sh-k"><b>Synthetic task</b>Changelog draft</div><div class="sh-p">Turn these three testnet release notes into a two-line changelog.</div><div class="sh-cmd">$ node run2.mjs</div>', 'tl2');
  ACT.push(() => cardA(task, win(F.T, rc(0, 0.02), rc(1, 0.1), 0.35, 0.4)));
  /* each step goes from Codex to its slot as it happens */
  TILES.forEach((t) => {
    if (t.i >= 7) return;
    const named = !!STEPS[t.i][1];
    mkArc(AG.clone().setY(0.9), t.base.clone().setY(H0 + TH), t.tDrop - 0.45, t.tDrop, 'ink', { lift: 0.7, w: 1.3, op: 0.6, hold: 0.3, chip: named ? '<span class="sh-chip out">' + STEPS[t.i][1] + '</span>' : null });
  });
  const chainL = mkLabel('<span class="sh-chip">Numbered and chained · seq 4–7</span>', 'sh-u', scene, new V3(0, H0 + 0.95, 0));
  ACT.push(() => setA(chainL, win(F.T, rc(2, 0.25), an(0, 0.05), 0.35, 0.35)));

  /* ---- 3 Anchor: only fingerprints go to Clockchain ---- */
  const fpL = mkLabel('<span class="sh-chip">Ledger · fingerprints only</span>', 'sh-d', scene, new V3(RR * 0.35, 0, RR + 1.2));
  const ctL = mkLabel('<span class="sh-chip out sh-hide">Content stays on the Shadow server</span>', 'sh-u', scene, new V3(-RR * 0.3, H0 + 0.5, -RR * 0.1));
  ACT.push(() => {
    const T = F.T;
    setA(fpL, win(T, an(0, 0.55), an(1, 0.95), 0.35, 0.4));
    setA(ctL, win(T, an(1, 0.02), an(1, 0.95), 0.35, 0.4));
  });

  /* ---- 4 Share: close, link, pin ---- */
  const close = mkCard('<div class="sh-k"><b>Session closed</b>' + IC.check + '</div><div class="sh-row">' + IC.check + 'Succeeded · 10 steps</div>' +
    '<div class="sh-url">' + VIEW_LINK + '</div><div class="sh-row n pin">' + IC.key + 'Pin · sent separately</div>', 'tr');
  const pinRow = close.el.querySelector('.pin');
  ACT.push(() => { const T = F.T; cardA(close, win(T, sh(0, 0.32), ck(0, 0.1), 0.35, 0.4)); sty(pinRow, 'opacity', String(ramp(T, sh(1, 0.3), sh(1, 0.45)))); });
  mkArc(new V3(0, H0 + 0.2, 0), PP.clone().setY(0.9), sh(1, 0.04), sh(1, 0.4), 'ink', { lift: 1.1, chip: '<span class="sh-chip ink">' + IC.link + 'Link</span>', hold: 1.2 });
  mkArc(AG.clone().setY(0.9).setX(-0.8), PP.clone().setY(0.9), sh(1, 0.36), sh(1, 0.86), 'accent', { lift: 2.6, chip: '<span class="sh-chip">' + IC.key + 'Pin</span>', hold: 0.9 });

  /* ---- 5 Check ---- */
  const view = mkCard('<div class="sh-k"><b>Viewer</b>Changelog draft</div><div class="sh-row n">Own browser · no account</div>' +
    '<div class="sh-row big ok">' + IC.check + 'Result: pass</div><div class="sh-row n ok2">No check failed</div><div class="sh-row ok3">' + IC.check + 'Each step inside its time window</div>', 'tr');
  const okR = [...view.el.querySelectorAll('.ok,.ok2,.ok3')];
  ACT.push(() => {
    const T = F.T; cardA(view, win(T, ck(0, 0.25), ST.change.s + 0.2, 0.35, 0.4));
    okR.forEach((r, i) => sty(r, 'opacity', String(ramp(T, ck(1, 0.45 + i * 0.08), ck(1, 0.55 + i * 0.08)))));
  });
  mkArc(PP.clone().setY(0.9), new V3(0, H0 + 0.2, 0), ck(0, 0.06), ck(0, 0.32), 'ink', { lift: 0.9, chip: '<span class="sh-chip out">' + IC.link + 'Open link</span>' });
  const fitL = mkLabel('<span class="sh-chip">' + IC.check + 'Every step fits its shadow</span>', 'sh-u', scene, new V3(DX * 0.3, 0.5, DZ * 0.3));
  ACT.push(() => setA(fitL, win(F.T, ck(1, 0.62), ST.change.s + 0.15, 0.3, 0.35)));

  /* ---- 6 Change: Faster becomes Fastor ---- */
  const msg = mkCard('<div class="sh-k"><b>Step 07 · Message</b>copy</div><div class="sh-p"><u>Faster</u> receipt lookups and clearer pending states. Fixed a retry loop when the network is slow.</div>', 'tr');
  msg.el.classList.add('r0');
  const word = msg.el.querySelector('u');
  ACT.push(() => {
    const T = F.T; cardA(msg, win(T, cg(0, 0.1), rk(0, 0.1), 0.35, 0.4));
    const ch = T >= cg(0, 0.52);
    const w = ch ? 'Fastor' : 'Faster'; if (word.textContent !== w) word.textContent = w;
    cls(word, 'on', ch); cls(msg.el, 'r', ch);
  });

  /* ---- 7 Re-check: offline, on the copy ---- */
  const ord = [0, 7, 1, 8, 2, 9, 3, 10, 4, 11, 5, 12, 6, 13];
  const ver = mkCard('<div class="sh-k"><b>Shadow verifier</b>offline · on the copy</div><div class="sh-chk">' +
    ord.map((i) => '<div class="sh-cr" data-i="' + i + '">' + CHECKS[i][0] + '<i>…</i></div>').join('') + '</div><div class="sh-note">One or more steps changed after they were recorded.</div>', 'tr');
  const rows = [...ver.el.querySelectorAll('.sh-cr')], note = ver.el.querySelector('.sh-note');
  ACT.push(() => {
    const T = F.T; cardA(ver, win(T, rk(0, 0.05), mn(0, 0.12), 0.35, 0.4));
    const failT = rk(1, 0.1);
    rows.forEach((r) => {
      const i = +r.dataset.i, [n, res] = CHECKS[i];
      const shown = T >= rk(0, 0.2) + i * 0.17;
      const val = !shown ? '…' : i === 1 && T < failT ? '…' : res;
      const it = r.querySelector('i'); if (it.textContent !== val) it.textContent = val;
      cls(r, 'p', shown && res === 'pass'); cls(r, 'f', i === 1 && T >= failT);
    });
    cls(ver.el, 'r', T >= failT); sty(note, 'opacity', String(ramp(T, failT + 0.2, failT + 0.5)));
  });
  const nfL = mkLabel('<span class="sh-chip red">' + IC.x + 'Step 07 doesn’t fit its shadow</span>', 'sh-d', TILES[6].tg, new V3(0, 0, TD / 2 + 0.05));
  ACT.push(() => setA(nfL, win(F.T, rk(1, 0.05), mn(0, 0.15), 0.3, 0.35)));

  /* ---- 8 What a pass means ---- */
  const means = mkCard('<div class="sh-k"><b>A pass means</b></div><div class="sh-row big">' + IC.check + 'The record is intact</div><div class="sh-row n big">—&nbsp;<s>The agent was right</s></div>', 'tr');
  ACT.push(() => cardA(means, win(F.T, mn(0, 0.1), ST.end.s + 0.3, 0.4, 0.4)));
}

/* =====================================================================================
   CAMERA: orbiting the record, one pose per beat, eased in turn
   ===================================================================================== */
const KEYS = [];
function buildCamera() {
  const K = (id, line, p, dur = 1.8) => KEYS.push({ t: at(id, line, 0), p, dur });
  const s7 = slot(6);
  K('connect', 0, { x: 0, y: 1.3, z: -1.6, dist: 11.5, el: 30, az: -8 });
  K('record', 0, { x: 0, y: 0.6, z: -0.8, dist: 10.2, el: 30, az: -30 });
  K('record', 1, { x: 0, y: 0.6, z: -0.4, dist: 9.6, el: 34, az: -8 });
  K('record', 2, { x: 0, y: 0.6, z: 0, dist: 9.6, el: 42, az: 22 });
  K('anchor', 0, { x: -0.3, y: 1.2, z: 0, dist: 11.2, el: 28, az: 38 });
  K('anchor', 1, { x: 0.2, y: 0, z: 0.35, dist: 15.5, el: 86, az: 0 }, 2.2);   /* straight down: the record and its shadow ring */
  K('share', 0, { x: 0, y: 0.4, z: 0.4, dist: 11.4, el: 44, az: 20 });
  K('share', 1, { x: 0, y: 0.5, z: 1.6, dist: 11.8, el: 30, az: 8 });
  K('check', 0, { x: 0, y: 0.6, z: 3.0, dist: 8.6, el: 24, az: 160 });
  K('check', 1, { x: 0.2, y: 0.2, z: 0.3, dist: 10.6, el: 50, az: 150 });
  K('change', 0, { x: s7.x * 0.9, y: 0.9, z: s7.z * 0.9, dist: 4.8, el: 28, az: -48 });
  K('recheck', 0, { x: 0.1, y: 0.2, z: 0.2, dist: 10.4, el: 54, az: -30 });
  K('recheck', 1, { x: s7.x + DX * H0, y: 0.1, z: s7.z + DZ * H0, dist: 5.2, el: 48, az: -52 });
  K('means', 0, { x: 0.1, y: 0.2, z: 0.2, dist: 11.6, el: 46, az: -80 });
  K('end', 0, { x: 0.2, y: 0, z: 0.3, dist: 15.5, el: 84, az: 0 }, 2.2);
}
const camP = { x: 0, y: 0, z: 0, dist: 10, el: 30, az: 0 };
function camAt() {
  const p = { ...KEYS[0].p };
  for (let i = 1; i < KEYS.length; i++) {
    const k = KEYS[i], u = ramp(F.T, k.t - 0.15, k.t - 0.15 + k.dur);
    if (u <= 0) break;
    const e = eio(u);
    for (const q in p) p[q] = lerp(p[q], k.p[q], e);
  }
  /* loop seam: glide back to the opening pose as the end fades */
  const back = eio(ramp(F.T, TOTAL - 0.8, TOTAL));
  if (back > 0) for (const q in p) p[q] = lerp(p[q], KEYS[0].p[q], back);
  const sm = SM ? 1.12 : 1, asp = W / H, fit = asp < 1.5 ? 1.5 / asp : 1;
  const dist = p.dist * sm * Math.min(1.6, Math.max(1, fit * 0.92));
  const az = RAD(p.az + 1.6 * Math.sin(F.T * 0.21)), el = RAD(p.el + 0.8 * Math.sin(F.T * 0.17 + 1));
  cam.position.set(p.x + dist * Math.sin(az) * Math.cos(el), p.y + dist * Math.sin(el), p.z + dist * Math.cos(az) * Math.cos(el));
  /* straight down still needs an up: keep 12 o'clock at the top */
  cam.up.set(0, 1, 0);
  if (p.el > 80) cam.up.set(-Math.sin(az), 0, -Math.cos(az)).lerp(new V3(0, 1, 0), ramp(90 - p.el, 0, 10));
  cam.lookAt(p.x, p.y, p.z);
  cam.updateMatrixWorld();
  scene.fog.near = dist * 1.0; scene.fog.far = dist * 2.6;
}

/* =====================================================================================
   CONTRACT
   ===================================================================================== */
export default {
  async init(ctx) {
    C = ctx.colors; W = Math.max(1, ctx.w); H = Math.max(1, ctx.h); SM = W < 560;
    let acc = 0;
    ctx.story.steps.forEach((s) => { ST[s.id] = { s: acc, d: s.dur, n: s.lines.length }; acc += s.dur; });
    TOTAL = acc;
    if (!document.getElementById('sh-style')) { const st = document.createElement('style'); st.id = 'sh-style'; st.textContent = CSS; document.head.appendChild(st); }
    root = document.createElement('div'); root.className = 'sh-root' + (SM ? ' sh-sm' : ''); ctx.host.appendChild(root);
    R = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    R.outputColorSpace = THREE.LinearSRGBColorSpace;
    R.setPixelRatio(Math.min(2, ctx.dpr || 1)); R.setClearColor(0, 0); R.setSize(W, H, false);
    root.appendChild(R.domElement);
    LR = new CSS2DRenderer(); LR.domElement.className = 'sh-lay'; LR.setSize(W, H); root.appendChild(LR.domElement);
    ov = document.createElement('div'); ov.className = 'sh-ov'; root.appendChild(ov);
    scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xffffff, 10, 30);
    cam = new THREE.PerspectiveCamera(SM ? 36 : 30, W / H, 0.1, 200);
    buildGround(); buildRecord(); buildLight(); buildStory(); buildCamera();
    this.theme(C); this.resize(W, H);
  },
  frame(s) {
    F.T = s.t != null ? s.t : (ST[s.stepId] ? ST[s.stepId].s + s.stepT * ST[s.stepId].d : 0);
    camAt();
    for (const f of ACT) f();
    const ga = Math.min(ramp(F.T, 0, 0.45), 1 - ramp(F.T, TOTAL - 0.55, TOTAL));
    sty(R.domElement, 'opacity', ga.toFixed(3)); sty(LR.domElement, 'opacity', ga.toFixed(3)); sty(ov, 'opacity', ga.toFixed(3));
    R.render(scene, cam); LR.render(scene, cam);
  },
  resize(w, h) {
    W = Math.max(1, w); H = Math.max(1, h); SM = W < 560;
    root.classList.toggle('sh-sm', SM);
    R.setSize(W, H, false); LR.setSize(W, H);
    cam.aspect = W / H; cam.fov = SM ? 36 : 30; cam.updateProjectionMatrix();
    lineMats.forEach((m) => m.resolution.set(W, H));
  },
  theme(colors) {
    C = colors; PAL = derive(colors);
    hooks.forEach((f) => f());
    if (scene) scene.fog.color.copy(PAL.surface);
  }
};
