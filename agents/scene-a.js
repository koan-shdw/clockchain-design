/* V1 · TIME AXIS (scene A) for the AI & Agents section.
   One long hairline time axis runs into depth: Clockchain's one clock, and (from Verify on) the ledger.
   Every party is a lane beside it (a worldline that grows with time). Messages are arcs between lanes,
   from the sender at the moment it sends to the receiver at the moment it arrives, and each step lands
   on the axis as a green ring node with its timestamp. The camera glides along the axis with the story;
   at the end card it cranes back so the whole trail is visible.
   Everything is a pure function of story time, so seeks, pauses and ?t= freezes always look right. */
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

THREE.ColorManagement.enabled = false;   /* site hex colours in, the same hex out (CSS-like blending) */
const V3 = THREE.Vector3;

/* ---------- world ---------- */
const V = 0.8;                 /* world units per story second along the axis */
const L = 2.4;                 /* buyer lane (-L) and provider lane (+L) */
const HEAD = 0.8;              /* agent marker height above its lane */
const XC = -1.15, XV = 1.15, HC = 0.5;   /* agent contract and verification lanes, marker height */
const XS = 1.75, YS = 1.95;    /* the settlement provider: off to the side, high above the ledger plane, outside it */
const XP2 = 3.75, XP3 = 5.1;   /* the other provider agents during discovery */
const CLOCK0 = 12 * 3600 + 4 * 60 + 25.264;   /* clock reading at story time 0 */
const TA0 = -1.6, TA1 = 74;    /* axis extent, story seconds */
const zT = (T) => -V * T;
const EP = { B: [-L, HEAD], P: [L, HEAD], A: [0, 0], C: [XC, HC], V: [XV, HC], S: [XS, YS], P2: [XP2, HEAD], P3: [XP3, HEAD] };

/* ---------- maths ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eout = (x) => 1 - Math.pow(1 - x, 3);
const sine = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
const backOut = (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
/* on between a and b, fading in over fi and out over fo */
const win = (t, a, b, fi = 0.4, fo = 0.4) => Math.min(ramp(t, a, a + fi), 1 - ramp(t, b - fo, b));
const r2 = (x) => String(Math.round(x * 100) / 100);

/* ---------- state ---------- */
let R, LR, scene, cam, root, W = 1, H = 1, SM = false, C = null, PAL = {};
let ST = {}, TOTAL = 71.5, TF = 66.4, TEND = 68;
const hooks = [], lineMats = [], ACT = [], POST = [], KEYS = [], LABELS = [];
const SQ = () => (SM ? 0.68 : 1);   /* phone: the lanes draw in toward the axis so every party fits the narrow stage */
const fogU = { value: new THREE.Vector2(8, 30) };
const viewHU = { value: 400 };
const tmp = new V3();
const F = { T: 0, nT: 0, zN: 0, endK: 0, lab: 1, sm: false, dt: 0, cont: false };

const at = (id, line = 0, f = 0) => { const s = ST[id]; return s.s + (line + f) * s.d / s.n; };

function clockParts(T) {
  const msT = Math.round((CLOCK0 + T) * 1000);
  const s = Math.floor(msT / 1000), ms = msT - s * 1000;
  const p = (n) => String(n).padStart(2, '0');
  return [p(Math.floor(s / 3600)) + ':' + p(Math.floor(s / 60) % 60) + ':' + p(s % 60), String(ms).padStart(3, '0')];
}
const stamp = (T) => { const [h, m] = clockParts(T); return '<span class="ag-a-t">' + h + '<i>.' + m + '</i></span>'; };

/* ---------- palette (from the site tokens only) ---------- */
function derive(c) {
  const col = (x) => new THREE.Color(x);
  const mix = (a, b, k) => col(a).lerp(col(b), k);
  return {
    accent: col(c.accent), ink: col(c.fg), fg2: col(c.fg2), fg3: col(c.fg3), surface: col(c.surface),
    line: col(c.line), line2: col(c.line2),
    axis: mix(c.line2, c.fg3, c.dark ? 0.35 : 0.42),
    tick: mix(c.line2, c.line, 0.15),
    tickMajor: mix(c.line2, c.fg3, c.dark ? 0.4 : 0.48),
    lane: mix(c.fg3, c.surface, c.dark ? 0.32 : 0.28),
    laneFut: mix(c.line, c.line2, 0.6),
    ledger: mix(c.line2, c.accent, c.dark ? 0.26 : 0.3),
    accentRec: mix(c.accent, c.surface, c.dark ? 0.5 : 0.48),
    inkRec: mix(c.line2, c.fg3, c.dark ? 0.35 : 0.3),
    session: mix(c.fg3, c.surface, c.dark ? 0.15 : 0.1),
  };
}

/* ---------- lines (screen-space widths, fogged into the surface) ---------- */
function mkLine(pts, role, w, o = {}) {
  const g = new LineGeometry();
  let flat = pts.flatMap((p) => (p.isVector3 ? [p.x, p.y, p.z] : p));
  if (flat.length === 6) {
    /* long straight lines get short segments: a segment that crosses the camera plane is trimmed on the GPU
       and its dash distance would drift, so a reveal (the trail, a lane) would overshoot the present */
    const [ax, ay, az, bx, by, bz] = flat, len = Math.hypot(bx - ax, by - ay, bz - az), n = Math.max(1, Math.ceil(len / 0.4));
    if (n > 1) { flat = []; for (let i = 0; i <= n; i++) { const k = i / n; flat.push(ax + (bx - ax) * k, ay + (by - ay) * k, az + (bz - az) * k); } }
  }
  g.setPositions(flat);
  const m = new LineMaterial({ linewidth: w, transparent: true, depthTest: false, depthWrite: false, fog: o.fog !== false, dashed: !!(o.reveal || o.dash) });
  if (o.reveal) { m.dashSize = 1e6; m.gapSize = 1e7; }
  if (o.dash) { m.dashSize = o.dash[0]; m.gapSize = o.dash[1]; }
  m.opacity = o.op ?? 1;
  m.resolution.set(W, H);
  const l = new Line2(g, m);
  if (o.reveal || o.dash) l.computeLineDistances();
  l.frustumCulled = false; l.renderOrder = o.ro ?? 1;
  lineMats.push(m);
  if (role) hooks.push(() => m.color.copy(PAL[role]));
  (o.parent || scene).add(l);
  return l;
}
function mkSegs(arr, role, w, o = {}) {
  const g = new LineSegmentsGeometry(); g.setPositions(arr);
  const m = new LineMaterial({ linewidth: w, transparent: true, depthTest: false, depthWrite: false, fog: o.fog !== false });
  m.opacity = o.op ?? 1; m.resolution.set(W, H);
  const l = new LineSegments2(g, m); l.frustumCulled = false; l.renderOrder = o.ro ?? 1;
  lineMats.push(m);
  if (role) hooks.push(() => m.color.copy(PAL[role]));
  (o.parent || scene).add(l);
  return l;
}
function lineLen(l) { const d = l.geometry.attributes.instanceDistanceEnd; return d ? d.array[d.array.length - 1] : 0; }
function show(obj, a) { obj.visible = a > 0.004; if (obj.material) obj.material.opacity = a; }

/* ---------- marks: the site's ring nodes and square agent markers, as crisp camera-facing SDF quads ---------- */
const MVS = `
uniform float uPx, uViewH, uRef, uMinS, uMaxS, uPad;
varying vec2 vP; varying float vR; varying float vD;
void main(){
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float d = max(0.001, -mv.z);
  float px = uPx * clamp(uRef / d, uMinS, uMaxS);
  float q = px + 2.0 * uPad;
  float wpp = 2.0 * d / (projectionMatrix[1][1] * uViewH);
  mv.xy += position.xy * q * wpp;
  vP = position.xy * q; vR = px * 0.5; vD = d;
  gl_Position = projectionMatrix * mv;
}`;
const MFS = `
uniform vec3 uB, uF, uH, uC;
uniform float uBW, uHalo, uHA, uFA, uOp, uShape, uRad, uCore, uSoft;
uniform vec2 uFog;
varying vec2 vP; varying float vR; varying float vD;
float sd(vec2 p, float r){
  if (uShape < 0.5) return length(p) - r;
  float rr = min(r, uRad); vec2 q = abs(p) - vec2(r) + rr;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rr;
}
void main(){
  float d = sd(vP, vR);
  float aa = max(fwidth(d), 0.0001) * 0.7;
  float inS = 1.0 - smoothstep(-aa, aa, d);
  float bw = min(uBW, vR * 0.55);
  float inF = 1.0 - smoothstep(-aa, aa, d + bw);
  float hm = uSoft > 0.5 ? exp(-max(d, 0.0) / max(uHalo * 0.45, 0.01)) : 1.0 - smoothstep(uHalo - aa, uHalo + aa, d);
  if (uHalo <= 0.0) hm = 0.0;
  vec3 c = uH; float a = hm * uHA;
  c = mix(c, uB, inS); a = mix(a, 1.0, inS);
  c = mix(c, uF, inF); a = mix(a, uFA, inF);
  if (uCore > 0.0) { float cm = 1.0 - smoothstep(-aa, aa, sd(vP, vR * uCore)); c = mix(c, uC, cm); a = mix(a, 1.0, cm); }
  a *= uOp * (1.0 - smoothstep(uFog.x, uFog.y, vD));
  if (a < 0.002) discard;
  gl_FragColor = vec4(c, a);
}`;
const QUAD = new THREE.PlaneGeometry(1, 1);
function mkMark(o) {
  const halo = o.halo || 0;
  const u = {
    uPx: { value: o.px }, uViewH: viewHU, uRef: { value: o.ref ?? 9 }, uMinS: { value: o.minS ?? 0.45 }, uMaxS: { value: o.maxS ?? 1.18 },
    uPad: { value: halo * (o.soft ? 2.6 : 1) + 2 },
    uB: { value: new THREE.Color() }, uF: { value: new THREE.Color() }, uH: { value: new THREE.Color() }, uC: { value: new THREE.Color() },
    uBW: { value: o.border ?? 2.5 }, uHalo: { value: halo }, uHA: { value: 0.12 }, uFA: { value: o.fA ?? 1 },
    uOp: { value: 1 }, uShape: { value: o.shape || 0 }, uRad: { value: o.radius ?? 3 }, uCore: { value: o.core ?? 0 }, uSoft: { value: 0 },
    uFog: fogU,
  };
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: MVS, fragmentShader: MFS, transparent: true, depthTest: false, depthWrite: false });
  const mesh = new THREE.Mesh(QUAD, mat); mesh.frustumCulled = false; mesh.renderOrder = o.ro ?? 10;
  const mk = { mesh, u, px: o.px, roles: { b: o.b || 'accent', f: o.f || 'surface', h: o.h || 'accent', c: o.c || o.b || 'accent' } };
  hooks.push(() => {
    u.uB.value.copy(PAL[mk.roles.b]); u.uF.value.copy(PAL[mk.roles.f]); u.uH.value.copy(PAL[mk.roles.h]); u.uC.value.copy(PAL[mk.roles.c]);
    const ha = o.haloA || [0.12, 0.17]; u.uHA.value = C.dark ? ha[1] : ha[0];
    u.uSoft.value = (o.soft === true || (o.soft === 'dark' && C.dark)) ? 1 : 0;
  });
  if (o.pos) mesh.position.copy(o.pos);
  (o.parent || scene).add(mesh);
  return mk;
}
function markA(mk, a, pxK = 1) { mk.mesh.visible = a > 0.004; mk.u.uOp.value = a; mk.u.uPx.value = mk.px * pxK; }

/* ---------- labels (HTML in the site fonts, styled by the site variables) ---------- */
function mkLabel(html, cls, parent, pos) {
  const el = document.createElement('div'); el.className = 'ag-a-o';
  const inner = document.createElement('div'); inner.className = cls; inner.innerHTML = html; el.appendChild(inner);
  const obj = new CSS2DObject(el);
  if (pos) obj.position.copy(pos);
  (parent || scene).add(obj);
  obj.visible = false; el.style.opacity = '0'; el.style.display = 'none';
  LR.domElement.appendChild(el);   /* in the layer from the start, so it can be measured before its first render */
  const k = (cls.match(/ag-a-(rr|r|lf|u2|u3|ur|u|d|c)\b/) || [])[1] || 'c';
  const kp = /\bsd\b/.test(cls) ? 'sd' : /\bsu\b/.test(cls) ? 'su' : /\blo-l\b/.test(cls) ? 'lf' : /\blo-r\b/.test(cls) ? 'r' : /\bhi3\b/.test(cls) ? 'u3' : /\bpc\b/.test(cls) ? 'c' : /\bhi2\b/.test(cls) ? 'hi2' : /\bhi\b/.test(cls) ? 'u' : /\bdn\b/.test(cls) ? 'lfd' : /\bpr\b/.test(cls) ? 'r' : /\bpl\b/.test(cls) ? 'lf' : /\bsd2\b/.test(cls) ? 'sd2' : k;
  const lb = { obj, el, inner, a: -1, k, kp, card: /ag-a-card/.test(html), w: 0, h: 0, tr: '' };
  LABELS.push(lb);
  return lb;
}
/* where a label's box sits around its anchor (x, y), for each placement class (mirrors the CSS transforms) */
function anchorBox(kind, x, y, w, h) {
  let l = x - w / 2, t = y - h / 2;
  switch (kind) {
    case 'r': l = x + 14; break;
    case 'lf': l = x - 14 - w; break;
    case 'u': t = y - 17 - h; break;
    case 'u2': t = y - 50 - h; break;
    case 'rr': l = x + 78; t = y - 60; break;
    case 'hi2': t = y - 66 - h; break;
    case 'u3': t = y - 72 - h; break;
    case 'd3l': l -= 22; t = y + 13; break;
    case 'd3r': l += 22; t = y + 13; break;
    case 'ur': l = x + 6; t = y - 50 - h; break;
    case 'd': t = y + 15; break;
    case 'sd': t = y + 14; break;
    case 'su': t = y - 44 - h; break;
    case 'lfd': l = x - 14 - w; t = y - h / 2 + 11; break;
    case 'sd2': t = y + 34; break;
  }
  return [l, t];
}
/* keep every visible label inside the stage and below the chapter chips (cards and tags slide in, never clip).
   Then: soft labels (the ledger name, and on the phone the later parties' tags) give way only where they collide with a card;
   message chips pick the clear side of their message (below, above, right, left) and fade only if no side is clear */
const CHIPK = { d: ['d', 'u', 'r', 'lf'], u: ['u', 'd', 'r', 'lf'] };
function fitLabels() {
  const pad = 8, top = SM ? 86 : 58, bot = H - 6, cards = [], solid = [], soft = [], chips = [];
  for (const lb of LABELS) {
    if (lb.a <= 0) { lb.ox = lb.oy = null; continue; }
    if (lb.nofit) { sty(lb.el, 'opacity', String(lb.a)); continue; }
    if (!lb.w) { if (lb.el.style.display === 'none') lb.el.style.display = ''; lb.w = lb.inner.offsetWidth; lb.h = lb.inner.offsetHeight; }
    const sc = lb.card && SM ? lb.sc || 0.84 : 1, w = lb.w * sc, h = lb.h * sc;
    if (lb.pin) {
      /* a card pinned to a free corner of the stage (phone) rides the camera instead of its party */
      if (!lb.base) lb.base = lb.obj.position.clone();
      if (SM) { ndc.set(lb.pin[0], lb.pin[1], 0.5).unproject(cam); lb.obj.parent.worldToLocal(ndc); lb.obj.position.copy(ndc); }
      else lb.obj.position.copy(lb.base);
    }
    lb.obj.getWorldPosition(ndc); ndc.project(cam);
    const x = (ndc.x + 1) * 0.5 * W, y = (1 - ndc.y) * 0.5 * H;
    lb.ax = x; lb.ay = y;
    let [l, t] = anchorBox(SM ? lb.kp : lb.k, x, y, w, h);
    if (lb.sx) { const sx = lb.sx[SM ? 1 : 0]; if (lb._sx !== sx) { lb._sx = sx; lb.inner.style.setProperty('--sx', sx + 'px'); } l += sx; }
    let dx = 0, dy = 0;
    if (l < pad) dx = pad - l; else if (l + w > W - pad) dx = W - pad - (l + w);
    if (t < top) dy = top - t; else if (SM && y < H && t + h > bot) dy = bot - (t + h);   /* phone: labels anchored in frame stay in frame */
    lb.bx = l + dx; lb.by = t + dy; lb.bw = w; lb.bh = h; lb.dx = dx; lb.dy = dy; lb.l0 = l; lb.t0b = t;
    if (lb.arc) { chips.push(lb); continue; }
    place(lb, dx, dy);
    if (lb.avoid || (SM && lb.phoneHide)) { soft.push(lb); continue; }
    sty(lb.el, 'opacity', String(lb.a));
    if (lb.card) cards.push(lb); else if (lb.solid) solid.push(lb);
  }
  for (const lb of soft) {
    let ov = overlap(lb.bx, lb.by, lb.bw, lb.bh, cards);
    if (ov > 0 && lb.avoid) {
      /* slide out below the card it hits, when that stays in frame */
      let yb = 0; for (const c of cards) if (overlap(lb.bx, lb.by, lb.bw, lb.bh, [c]) > 0) yb = Math.max(yb, c.by + c.bh + 6);
      if (yb + lb.bh <= bot) { lb.dy += yb - lb.by; lb.by = yb; place(lb, lb.dx, lb.dy); ov = overlap(lb.bx, lb.by, lb.bw, lb.bh, cards); }
    }
    const f = 1 - Math.min(1, (ov / (lb.bw * lb.bh)) * 3);
    sty(lb.el, 'opacity', (lb.a * f).toFixed(3));
    if (f > 0.25 && lb.solid) solid.push(lb);
  }
  if (!chips.length) return;
  const ref = solid.concat(cards);
  chips.sort((p, q) => q.t0 - p.t0);
  for (const lb of chips) {
    let best = null, bo = Infinity;
    for (const kind of (lb.alt && lb.alt[SM ? 1 : 0]) || CHIPK[lb.k] || [lb.k]) {
      let [l, t] = anchorBox(kind, lb.ax, lb.ay, lb.bw, lb.bh);
      l = clamp(l, pad, W - pad - lb.bw); t = Math.max(t, top);
      const o = overlap(l + 2, t + 3, lb.bw - 4, lb.bh - 6, ref);   /* the chip's pill, not its line box */
      if (o < bo - 1) { bo = o; best = [l, t]; }
      if (o <= 0) break;
    }
    /* during playback the chip glides to its new side instead of jumping */
    const tx = best[0] - lb.l0, ty = best[1] - lb.t0b;
    const k = F.cont && lb.ox != null ? 1 - Math.exp(-F.dt * 16) : 1;
    lb.ox = lb.ox == null ? tx : lerp(lb.ox, tx, k); lb.oy = lb.oy == null ? ty : lerp(lb.oy, ty, k);
    lb.bx = lb.l0 + lb.ox; lb.by = lb.t0b + lb.oy;
    place(lb, lb.ox, lb.oy);
    const f = 1 - Math.min(1, (overlap(lb.bx + 2, lb.by + 3, lb.bw - 4, lb.bh - 6, ref) / (lb.bw * lb.bh)) * 3);
    sty(lb.el, 'opacity', (lb.a * f).toFixed(3));
    if (f > 0.25) ref.push(lb);
  }
}
function place(lb, dx, dy) {
  const v = dx || dy ? dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px' : '';
  if (lb.tr !== v) { lb.tr = v; lb.inner.style.translate = v; }
}
function overlap(x, y, w, h, list) {
  let s = 0;
  for (const b of list) {
    const ix = Math.min(x + w, b.bx + b.bw) - Math.max(x, b.bx), iy = Math.min(y + h, b.by + b.bh) - Math.max(y, b.by);
    if (ix > 0 && iy > 0) s += ix * iy;
  }
  return s;
}
/* a label's own alpha; fitLabels writes the final opacity. Before the end crane every label except the end card's keep list goes */
function setA(lb, a) {
  if (!lb.keep) a *= F.lab;
  a = a < 0.01 ? 0 : a > 0.995 ? 1 : Math.round(a * 200) / 200;
  if (a !== lb.a) { lb.a = a; lb.obj.visible = a > 0; }
}
function dfade(obj, k = 1) {
  obj.getWorldPosition(tmp);
  const d = tmp.distanceTo(cam.position);
  return 1 - ramp(d, fogU.value.x * 1.05 * k, fogU.value.y * 0.72 * k);
}
const ndc = new V3();
/* labels fade before they reach the bottom or side edge of the stage */
function edgeK(obj, both) {
  obj.getWorldPosition(ndc); ndc.project(cam);
  if (ndc.z > 1) return 0;
  const k = Math.min(ramp(ndc.y, -0.97, -0.8), ramp(1 - Math.abs(ndc.x), 0.02, 0.14));
  return both ? Math.min(k, ramp(ndc.y, 0.86, 0.72)) : k;
}
/* records that slide past the camera thin out, so the near field stays quiet (the end card shows them all) */
function nearK(z) {
  const d = fogU.value.x / 0.8;
  return Math.max(F.endK, ramp(cam.position.z - z, d * 0.5, d * 0.86));
}
function sty(el, prop, v) { if (el['_' + prop] !== v) { el['_' + prop] = v; el.style[prop] = v; } }

const IC = {
  check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 8.6l3 3 6.6-7.2"/></svg>',
  key: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="4.9" cy="8" r="2.7"/><path d="M7.6 8h6.2M11.6 8v2.3M13.8 8v1.7"/></svg>',
  lock: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7.2" width="10" height="6.8" rx="1.6"/><path class="sh" d="M5.3 7.2V5.3a2.7 2.7 0 0 1 5.4 0v1.9"/></svg>',
  doc: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.8h5.4L12.4 4.8v9.4H4z"/><path d="M9.2 1.8v3.2h3.2M6 8.4h4.4M6 10.8h3"/></svg>',
};
const pat = (bits) => '<span class="ag-a-pat">' + bits.map((b) => '<i' + (b ? ' class="on"' : '') + '></i>').join('') + '</span>';
const FP = [3, 1, 4, 2, 2, 4, 1, 3, 4, 2, 1, 3, 2, 4];
const fp = () => '<span class="ag-a-fp">' + FP.map((h) => '<i style="height:' + (3 + h * 2.2) + 'px"></i>').join('') + '</span>';

const CSS = `
.ag-a-root{position:absolute;inset:0;pointer-events:none;overflow:hidden;
  --ag-ink:color-mix(in oklab,var(--accent) 64%,black);
  --ag-chip:color-mix(in oklab,var(--accent) 11%,var(--surface));
  --ag-plate:color-mix(in srgb,var(--surface) 94%,transparent);}
:root[data-variant="eclipse"] .ag-a-root{--ag-ink:var(--accent);--ag-chip:color-mix(in oklab,var(--accent) 16%,var(--surface));}
.ag-a-root>canvas{position:absolute;inset:0;}
.ag-a-lay{position:absolute;top:0;left:0;pointer-events:none;}
.ag-a-o{position:absolute;top:0;left:0;}
.ag-a-o svg{width:12px;height:12px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
.ag-a-r{transform:translate(calc(50% + 14px),0);}
.ag-a-lf{transform:translate(calc(-50% - 14px),0);text-align:right;}
.ag-a-u{transform:translate(0,calc(-50% - 17px));}
.ag-a-u2{transform:translate(var(--sx,0px),calc(-50% - 50px));}
.ag-a-u3{transform:translate(var(--sx,0px),calc(-50% - 72px));}
.ag-a-rr{transform:translate(calc(50% + 78px),calc(50% - 60px));}
.ag-a-d{transform:translate(0,calc(50% + 15px));}
.ag-a-c{transform:none;}
.ag-a-ur{transform:translate(calc(50% + 6px),calc(-50% - 50px));}

.ag-a-n{display:block;font:500 9.5px/1.2 var(--f-mono);letter-spacing:.13em;text-transform:uppercase;color:var(--fg-2);white-space:nowrap;}
.ag-a-t{display:block;font:400 11px/1.2 var(--f-mono);letter-spacing:.01em;color:var(--fg);white-space:nowrap;font-variant-numeric:tabular-nums;}
.ag-a-t i{font-style:normal;color:var(--ag-ink);}
.ag-a-node{display:flex;flex-direction:column;gap:3px;padding:3px 6px;border-radius:6px;background:var(--ag-plate);}
.ag-a-node .ag-a-n{color:var(--ag-ink);}
.ag-a-node.big{background:var(--surface);}
.ag-a-node.big .ag-a-n{font-weight:600;}
.ag-a-cur{display:flex;flex-direction:column;gap:3px;align-items:flex-end;padding:3px 6px;border-radius:6px;background:var(--ag-plate);}
.ag-a-cur .ag-a-n{color:var(--fg);}
.ag-a-tk{font:400 10px/1 var(--f-mono);color:var(--fg-3);letter-spacing:.02em;white-space:nowrap;font-variant-numeric:tabular-nums;}
.ag-a-ch{font:500 9.5px/1 var(--f-mono);letter-spacing:.13em;text-transform:uppercase;color:var(--fg-3);white-space:nowrap;padding:3px 5px;border-radius:5px;background:var(--ag-plate);}
.ag-a-ch b{color:var(--ag-ink);font-weight:500;margin-right:7px;}
.ag-a-lab{font:500 9.5px/1 var(--f-mono);letter-spacing:.13em;text-transform:uppercase;color:var(--fg-3);white-space:nowrap;padding:3px 5px;border-radius:5px;background:var(--ag-plate);}
.ag-a-lab.g{color:var(--ag-ink);}

.ag-a-tag{display:flex;align-items:center;gap:7px;padding:6px 10px 6px 8px;border-radius:9px;background:var(--surface);
  border:1px solid var(--line-2);font:500 10.5px/1 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--fg);white-space:nowrap;}
.ag-a-tag>b{width:8px;height:8px;border-radius:2px;background:var(--fg);flex:none;}
.ag-a-tag.g{color:var(--ag-ink);border-color:color-mix(in oklab,var(--accent) 40%,var(--line-2));}
.ag-a-tag.g>b{background:var(--accent);}
.ag-a-o .ag-a-tag svg{width:13px;height:13px;}
.ag-a-o .ag-a-tag svg.ag-a-lk{width:18px;height:18px;margin:-4px -1px -3px -2px;overflow:visible;stroke-width:1.7;}
.ag-a-tag.lk{color:var(--fg);border-color:color-mix(in oklab,var(--accent) 60%,var(--line-2));}
.ag-a-tag.lk svg.ag-a-lk{color:var(--ag-ink);}
.ag-a-ld{position:relative;}
.ag-a-u3.ag-a-ld{--ld:62px;}
.ag-a-sm .ag-a-u3 .ag-a-card{transform-origin:50% 100%;}
.ag-a-ld::after{content:"";position:absolute;left:calc(50% - var(--sx,0px));top:100%;height:var(--ld,41px);border-left:1px solid color-mix(in oklab,var(--accent) 55%,var(--line-2));}
.ag-a-ck{display:inline-flex;overflow:hidden;max-width:0;margin-left:-7px;color:var(--ag-ink);}
.ag-a-ck svg{stroke-width:2.2;}

.ag-a-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border-radius:7px;background:var(--ag-chip);color:var(--ag-ink);
  font:500 9.5px/1 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;}
.ag-a-chip.ink{background:var(--fg);color:var(--surface);}
.ag-a-chip.out{background:var(--surface);color:var(--fg);box-shadow:inset 0 0 0 1px var(--line-2);}
.ag-a-chip svg{stroke-width:2;}
.ag-a-o .ag-a-sig{width:46px;height:14px;display:block;margin-top:5px;}
.ag-a-sig path{fill:none;stroke:var(--fg);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;}
.ag-a-sigw{display:flex;flex-direction:column;align-items:flex-start;}
.ag-a-lf .ag-a-sigw{align-items:flex-end;}

.ag-a-card{background:var(--surface);border:1px solid var(--line-2);border-radius:12px;padding:10px 12px 11px;
  box-shadow:0 1px 2px color-mix(in oklab,var(--fg) 4%,transparent),0 14px 34px -22px color-mix(in oklab,var(--fg) 35%,transparent);font:400 12px/1.35 var(--f-body);color:var(--fg);white-space:nowrap;}
:root[data-variant="eclipse"] .ag-a-card{box-shadow:0 18px 40px -24px color-mix(in oklab,var(--bg) 90%,transparent);}
.ag-a-k{display:flex;align-items:center;gap:6px;font:500 9.5px/1 var(--f-mono);letter-spacing:.13em;text-transform:uppercase;color:var(--fg-3);}
.ag-a-k b{color:var(--ag-ink);font-weight:500;}
.ag-a-k .ag-a-ok{margin-left:auto;color:var(--ag-ink);display:inline-flex;}
.ag-a-fp{display:flex;align-items:flex-end;gap:2px;height:13px;margin:9px 0 8px;}
.ag-a-fp i{width:3px;border-radius:1px;background:var(--fg);}
.ag-a-row{display:flex;align-items:center;gap:6px;font:500 9.5px/1 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--fg-3);margin-top:6px;}
.ag-a-row.g{color:var(--ag-ink);}
.ag-a-o .ag-a-row svg{width:11px;height:11px;stroke-width:2.2;}
.ag-a-cert{min-width:128px;}
.ag-a-eq{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--surface);border:1px solid var(--line-2);
  font:500 13px/1 var(--f-mono);color:var(--ag-ink);}

.ag-a-pat{display:inline-flex;gap:3px;}
.ag-a-pat i{width:7px;height:7px;border-radius:2px;box-shadow:inset 0 0 0 1.3px currentColor;}
.ag-a-pat i.on{background:currentColor;}
.ag-a-cap{display:inline-flex;align-items:center;gap:6px;padding:5px 7px;border-radius:7px;background:var(--surface);color:var(--fg-3);
  box-shadow:inset 0 0 0 1px var(--line-2);font:500 9.5px/1 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;}
.ag-a-cap.m{color:var(--ag-ink);background:var(--ag-chip);box-shadow:inset 0 0 0 1px color-mix(in oklab,var(--accent) 45%,transparent);}

.ag-a-props{display:flex;gap:8px;}
.ag-a-prop{width:96px;padding:9px 10px 10px;border-radius:10px;}
.ag-a-prop .ag-a-k{font-size:9px;}
.ag-a-prop>i{display:block;height:4px;border-radius:2px;background:var(--line-2);margin-top:7px;}
.ag-a-prop>i:first-of-type{margin-top:10px;}
.ag-a-prop.m{border-color:color-mix(in oklab,var(--accent) 55%,var(--line-2));}
.ag-a-prop.m>i{background:color-mix(in oklab,var(--accent) 35%,var(--line-2));}

.ag-a-terms{width:214px;white-space:normal;padding:9px 10px 10px;}
.ag-a-terms .ag-a-k{margin-bottom:8px;}
.ag-a-tl{display:flex;flex-wrap:wrap;gap:5px;}
.ag-a-terms .ag-a-chip{background:var(--surface);color:var(--fg-3);box-shadow:inset 0 0 0 1px var(--line-2);}
.ag-a-terms .ag-a-chip svg{display:none;}
.ag-a-terms .ag-a-chip.on{background:var(--ag-chip);color:var(--ag-ink);box-shadow:none;}
.ag-a-terms .ag-a-chip.on svg{display:block;}

.ag-a-con{padding:11px 13px 12px;}
.ag-a-cols{display:grid;grid-template-columns:auto auto;gap:0 14px;margin-top:9px;}
.ag-a-col{display:flex;flex-direction:column;gap:5px;}
.ag-a-col+.ag-a-col{border-left:1px solid var(--line);padding-left:14px;}
.ag-a-colh{font:500 8.5px/1 var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-3);margin-bottom:2px;}
.ag-a-tx{font:400 11.5px/1.15 var(--f-body);color:var(--fg);}
.ag-a-cd{font:400 10px/1.15 var(--f-mono);color:var(--fg-2);}
.ag-a-cd b{font-weight:400;color:var(--ag-ink);}
.ag-a-hash{margin-top:9px;padding-top:8px;border-top:1px solid var(--line);display:flex;align-items:center;gap:6px;
  font:400 10px/1 var(--f-mono);color:var(--fg-3);}
.ag-a-hash b{font-weight:500;color:var(--ag-ink);margin-left:auto;display:inline-flex;align-items:center;gap:5px;letter-spacing:.12em;}
.ag-a-rules .ag-a-row{font-size:10px;margin-top:7px;}
.ag-a-rules .ag-a-row.no{color:var(--fg-3);}
.ag-a-rules .ag-a-row.no span{text-decoration:line-through;}

.ag-a-set{display:flex;align-items:center;gap:6px;}
.ag-a-ev{min-width:132px;}
.ag-a-rep{min-width:124px;}
.ag-a-bars{display:flex;align-items:flex-end;gap:6px;height:30px;margin-top:9px;}
.ag-a-bars span{display:flex;flex-direction:column;align-items:center;gap:4px;}
.ag-a-bars i{display:block;width:22px;border-radius:3px;background:var(--line);overflow:hidden;position:relative;}
.ag-a-bars i u{position:absolute;left:0;right:0;bottom:0;background:var(--accent);}
.ag-a-bars em{font:500 8.5px/1 var(--f-mono);font-style:normal;letter-spacing:.1em;color:var(--fg-3);}

.ag-a-sm .ag-a-tag{font-size:8.5px;letter-spacing:.1em;padding:4px 7px 4px 6px;gap:5px;border-radius:7px;}
.ag-a-sm .ag-a-tag>b{width:6px;height:6px;}
.ag-a-sm .ag-a-chip,.ag-a-sm .ag-a-cap{font-size:8.5px;letter-spacing:.1em;padding:4px 6px;}
.ag-a-sm .sd{transform:translate(0,calc(50% + 14px));}
.ag-a-sm .sd .ag-a-sigw,.ag-a-sm .su .ag-a-sigw{align-items:center;}
.ag-a-sm .su{transform:translate(0,calc(-50% - 44px));}
.ag-a-sm .ag-a-lf.dn{transform:translate(calc(-50% - 14px),11px);}
.ag-a-sm .ag-a-lf.pr{transform:translate(calc(50% + 14px),0);}
.ag-a-sm .ag-a-r.pl{transform:translate(calc(-50% - 14px),0);}
.ag-a-sm .ag-a-node.pl{align-items:flex-end;}
.ag-a-sm .sd2{transform:translate(0,calc(50% + 34px));}
.ag-a-sm .ag-a-u.lo-l{transform:translate(calc(-50% - 14px),0);}
.ag-a-sm .ag-a-u.lo-r{transform:translate(calc(50% + 14px),0);}
.ag-a-sm .ag-a-u2.hi3{transform:translate(var(--sx,0px),calc(-50% - 72px));--ld:62px;}
.ag-a-sm .ag-a-rr.pc{transform:none;}
.ag-a-sm .ag-a-o .ag-a-tag svg.ag-a-lk{width:15px;height:15px;}
.ag-a-sm .ag-a-r.hi{transform:translate(0,calc(-50% - 17px));}
.ag-a-sm .ag-a-u2.hi2{transform:translate(0,calc(-50% - 66px));}
.ag-a-sm .ag-a-ur .ag-a-card{transform-origin:0 100%;}
.ag-a-sm .ag-a-con{padding:9px 10px 10px;position:relative;}
.ag-a-sm .ag-a-hash{position:absolute;top:9px;right:10px;margin:0;padding:0;border:0;font-size:0;}
.ag-a-sm .ag-a-hash b{font-size:8.5px;}
.ag-a-sm .ag-a-cols{gap:0 10px;margin-top:7px;}
.ag-a-sm .ag-a-col{gap:3px;}
.ag-a-sm .ag-a-col+.ag-a-col{padding-left:10px;}
.ag-a-sm .ag-a-tx{font-size:10.5px;}
.ag-a-sm .ag-a-cd{font-size:9px;}
.ag-a-sm .ag-a-card{transform:scale(.84);}
.ag-a-sm .ag-a-u2 .ag-a-card{transform-origin:50% 100%;}
.ag-a-sm .ag-a-t{font-size:10.5px;}
.ag-a-sm .ag-a-n{font-size:9px;}
.ag-a-sm .ag-a-prop{width:78px;}
.ag-a-sm .ag-a-props{gap:5px;}
`;

/* =====================================================================================
   BUILD
   ===================================================================================== */
function segsCap(T) { return mkSegs([-(L + 0.45), 0, zT(T), L + 0.95, 0, zT(T)], 'tickMajor', 1.2, { ro: 1 }); }

function buildGround() {
  /* the clock: a hairline with minor ticks every 250 ms and major ticks every second of clock time */
  mkLine([[0, 0, zT(TA0)], [0, 0, zT(TA1)]], 'axis', 1, { ro: 1 });
  const mi = [], ma = [], labs = [];
  const k0 = Math.ceil((CLOCK0 + TA0) * 4), k1 = Math.floor((CLOCK0 + TA1) * 4);
  for (let k = k0; k <= k1; k++) {
    const T = k / 4 - CLOCK0, z = zT(T);
    if (k % 4 === 0) { ma.push(-0.17, 0, z, 0.17, 0, z); if (k % 8 === 0 && T > 0.5 && T < 70) labs.push(T); }
    else mi.push(-0.075, 0, z, 0.075, 0, z);
  }
  mkSegs(mi, 'tick', 1, { ro: 1 });
  mkSegs(ma, 'tickMajor', 1, { ro: 1 });
  mkSegs([-0.2, 0, zT(TA0), 0.2, 0, zT(TA0), -0.2, 0, zT(TA1), 0.2, 0, zT(TA1)], 'tickMajor', 1.2, { ro: 1 });
  for (const T of labs) {
    const lb = mkLabel(clockParts(T)[0], 'ag-a-lf ag-a-tk', scene, new V3(-0.22, 0, zT(T)));
    ACT.push(() => {
      const near = zT(T) - F.zN;                    /* > 0: behind the present */
      const a = (near > 0 ? ramp(near, 1.5, 2.6) : ramp(-near, 2.6, 3.6)) * dfade(lb.obj, 0.9) * edgeK(lb.obj, true);
      setA(lb, F.sm ? 0 : a * 0.95 * (1 - F.endK));
    });
  }

  /* the trail: the axis turns green up to the present */
  const trail = mkLine([[0, 0, zT(0)], [0, 0, zT(TF + 0.02)]], 'accent', 2, { reveal: true, ro: 2 });
  ACT.push(() => { trail.material.dashSize = Math.max(1e-4, V * F.nT); });

  /* the ledger: block rails along the axis, drawn outward from the Verify moment */
  const tc = at('verify', 0, 0.12), zc = zT(tc), X = 0.26;
  const rails = [
    mkLine([[-X, 0, zc], [-X, 0, zT(TA1)]], 'ledger', 1, { reveal: true }), mkLine([[X, 0, zc], [X, 0, zT(TA1)]], 'ledger', 1, { reveal: true }),
    mkLine([[-X, 0, zc], [-X, 0, zT(TA0)]], 'ledger', 1, { reveal: true }), mkLine([[X, 0, zc], [X, 0, zT(TA0)]], 'ledger', 1, { reveal: true }),
  ];
  const bl = [];
  for (let s = Math.ceil(CLOCK0 + TA0); s <= CLOCK0 + TA1; s++) bl.push(s + 0.5 - CLOCK0);
  bl.sort((a, b) => Math.abs(a - tc) - Math.abs(b - tc));
  const blocks = mkSegs(bl.flatMap((T) => [-X, 0, zT(T), X, 0, zT(T)]), 'ledger', 1);
  const fm = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, fog: true });
  hooks.push(() => { fm.color.copy(PAL.accent); });
  const fills = [new THREE.Mesh(QUAD, fm), new THREE.Mesh(QUAD, fm)];
  fills.forEach((m) => { m.rotation.x = -Math.PI / 2; m.renderOrder = 0; scene.add(m); });
  const backLen = zT(TA0) - zc;
  ACT.push(() => {
    const u = ramp(F.T, tc, tc + 2.4), r = 80 * u * u, a = ramp(F.T, tc, tc + 0.25);
    rails.forEach((l) => { l.material.dashSize = Math.max(1e-4, r * V); show(l, a); });
    let n = 0; while (n < bl.length && Math.abs(bl[n] - tc) <= r) n++;
    blocks.geometry.instanceCount = n; show(blocks, n ? a : 0);
    fm.opacity = a * (C.dark ? 0.05 : 0.04);
    const len = Math.max(0.001, r * V), lb = Math.max(0.001, Math.min(len, backLen));
    fills[0].scale.set(2 * X, len, 1); fills[0].position.set(0, 0, zc - len / 2);
    fills[1].scale.set(2 * X, lb, 1); fills[1].position.set(0, 0, zc + lb / 2);
    fills.forEach((m) => { m.visible = a > 0; });
  });
  /* LEDGER name rides just ahead of the present while it matters */
  const ledL = mkLabel('Ledger', 'ag-a-r ag-a-lab g', scene);
  ledL.avoid = true;   /* it slides clear of a card instead of hiding under it */
  ACT.push(() => {
    ledL.obj.position.set(X, 0, F.zN - (F.sm ? 2.2 : 3.0));
    const a = Math.max(win(F.T, tc + 0.4, at('handshake', 0, 0.1), 0.5, 0.5), win(F.T, at('agree', 1, 0), at('agree', 1, 0.95), 0.4, 0.4));
    setA(ledL, a);
  });

  /* chapter starts on the axis, for the settled end composition */
  [0, at('align', 0, 0)].forEach((T) => {
    const cap = segsCap(T);
    ACT.push(() => show(cap, F.endK * 0.9));
  });
}

/* ---------- parties: a marker on a stem, a lane (worldline) behind it, a faint guide ahead ---------- */
const ENT = {};
function mkEntity(key, o) {
  const [x, y] = EP[key];
  const g = new THREE.Group(); scene.add(g);
  const e = { key, x, y, g, t0: o.t0, t1: o.t1, ap: o.ap ?? o.t0, o };
  const ly = o.air ? y : 0;
  if (!o.air) e.stem = mkLine([[0, 0, 0], [0, y, 0]], o.stemRole || 'lane', 1, { parent: g, ro: 5 });
  e.head = mkMark({ shape: 1, px: o.px || 15, border: o.bw || 2, radius: o.rad ?? 3.5, b: o.role, f: 'surface', core: o.core ?? 0.42, c: o.role, halo: o.halo || 0, haloA: [0.12, 0.2], soft: o.halo ? 'dark' : false, parent: g, pos: new V3(0, y, 0), ro: 12, ref: 9 });
  if (!o.air) e.foot = mkMark({ shape: 0, px: 5, border: 2.5, b: o.laneRole || 'lane', f: o.laneRole || 'lane', parent: g, ro: 6 });
  if (o.tag) { e.tag = mkLabel(o.tag, o.tagCls || 'ag-a-u', g, new V3(0, y, 0)); e.tag.solid = true; e.tag.phoneHide = !!o.phoneHide; }
  /* the end card names the two agents once, at the start of their lanes (nearest the camera) */
  if (o.endTag) { e.name = mkLabel(o.tag, 'ag-a-lf' + (o.endTag === 'r' ? ' pr' : ''), scene, new V3(x, 0, zT(o.t0))); e.name.keep = true; }
  e.lane = mkLine([[x, ly, zT(o.t0)], [x, ly, zT(o.t1)]], o.laneRole || 'lane', o.laneW || 1.25, { reveal: true, ro: 1 });
  e.fut = mkLine([[0, ly, 0], [0, ly, -15]], 'laneFut', 1, { parent: g, ro: 1 });
  e.caps = mkSegs([x - 0.13, ly, zT(o.t0), x + 0.13, ly, zT(o.t0)], o.laneRole || 'lane', 1.25, { ro: 1 });
  e.endCap = mkSegs([x - 0.13, ly, zT(o.t1), x + 0.13, ly, zT(o.t1)], o.laneRole || 'lane', 1.25, { ro: 1 });
  ENT[key] = e;
  ACT.push(() => {
    const T = F.T, tz = clamp(F.nT, e.t0, e.t1);
    g.position.set(x, 0, zT(tz));
    const a = o.alpha ? o.alpha(T) : ramp(T, e.ap, e.ap + 0.5);
    const pop = backOut(ramp(T, e.ap, e.ap + 0.45));
    markA(e.head, a, 0.3 + 0.7 * pop);
    if (e.foot) markA(e.foot, a);
    if (e.stem) show(e.stem, a);
    const live = T >= e.t0, la = o.laneA ? o.laneA(T) : 1;
    e.lane.visible = live && a > 0.004;
    e.lane.material.dashSize = Math.max(1e-4, V * (tz - e.t0));
    e.lane.material.opacity = la;
    show(e.caps, live ? la : 0);
    show(e.endCap, T >= e.t1 ? la : 0);
    show(e.fut, (T < e.t1 ? a : 0) * 0.9);
    e.tagA = (o.tagA ? o.tagA(T) : a) * ramp(T, e.ap + 0.25, e.ap + 0.7);
    if (e.tag) setA(e.tag, e.tagA);
    if (e.name) setA(e.name, ramp(T, TEND + 1.3, TEND + 1.75));   /* only once the crane has settled */
  });
  return e;
}

/* ---------- arcs: a message between two lanes. In flight it rides the present (so it always joins the
   two parties); when it arrives it stays on the record at its arrival time, a rung across the lanes ---------- */
const ARCS = [];
function mkArc(k0, t0, k1, t1, kind, o = {}) {
  const [x0, y0] = EP[k0], [x1, y1] = EP[k1];
  const grp = new THREE.Group(); scene.add(grp);
  const p0 = new V3(x0, y0, 0), p1 = new V3(x1, y1, 0);
  const lift = o.lift ?? (0.35 + 0.13 * Math.abs(x1 - x0));
  const c = p0.clone().add(p1).multiplyScalar(0.5); c.y = Math.max(y0, y1) + lift;
  const N = 56, pts = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, a = (1 - s) * (1 - s), b = 2 * (1 - s) * s, d = s * s;
    pts.push(new V3(a * p0.x + b * c.x + d * p1.x, a * p0.y + b * c.y + d * p1.y, 0));
  }
  const ln = mkLine(pts, null, o.w || 1.5, { reveal: true, ro: 4, parent: grp });
  const cum = [0]; for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const g = kind === 'g';
  const head = mkMark({ shape: 0, px: 7, border: 3.5, b: g ? 'accent' : 'ink', f: g ? 'accent' : 'ink', halo: g ? 5 : 0, soft: true, haloA: [0.25, 0.4], ro: 14, ref: 9, minS: 0.7, parent: grp });
  const A = { t0, t1, grp, ln, pts, cum, len: cum[N], head, g, rec: o.rec ?? 1, w: o.w || 1.5, chip: null };
  /* once on the record, each end that belongs to a grounded party drops a hairline to its lane */
  const drops = [[k0, x0, y0], [k1, x1, y1]].filter(([k, , y]) => k !== 'A' && k !== 'S' && y > 0).flatMap(([, x, y]) => [x, 0, 0, x, y, 0]);
  if (drops.length) A.drop = mkSegs(drops, null, 1, { parent: grp, ro: 3 });
  /* the chip rides the message: under it when it leaves an agent (clear of the tag above), over it when it leaves the axis */
  if (o.chip) { A.chip = mkLabel(o.chip, k0 === 'A' ? 'ag-a-u' : 'ag-a-d', grp); A.chip.arc = true; A.chip.t0 = t0; }
  ARCS.push(A);
  return A;
}
function arcPoint(A, f, out) {
  const s = f * A.len; let i = 1;
  while (i < A.cum.length - 1 && A.cum[i] < s) i++;
  const k = (s - A.cum[i - 1]) / Math.max(1e-6, A.cum[i] - A.cum[i - 1]);
  return out.copy(A.pts[i - 1]).lerp(A.pts[i], clamp(k));
}
function updArcs() {
  const T = F.T;
  for (const A of ARCS) {
    if (T < A.t0) { A.ln.visible = false; A.head.mesh.visible = false; if (A.chip) setA(A.chip, 0); if (A.drop) A.drop.visible = false; continue; }
    const u = ramp(T, A.t0, A.t1), e = sine(u);
    A.grp.position.z = zT(Math.min(F.nT, A.t1));
    A.ln.visible = true;
    A.ln.material.dashSize = Math.max(1e-4, e * A.len);
    const k = ramp(T, A.t1 + 0.15, A.t1 + 1.1);
    A.ln.material.color.copy(A.g ? PAL.accent : PAL.ink).lerp(A.g ? PAL.accentRec : PAL.inkRec, k);
    A.ln.material.linewidth = lerp(A.w, 1, k);
    A.ln.material.opacity = (A.rec + (1 - A.rec) * (1 - k)) * (1 - 0.35 * F.endK) * nearK(A.grp.position.z);
    if (A.drop) { A.drop.material.color.copy(A.ln.material.color); show(A.drop, k * A.ln.material.opacity * 0.45); }
    const ha = win(T, A.t0, A.t1 + 0.12, 0.1, 0.18);
    arcPoint(A, e, A.head.mesh.position);
    markA(A.head, ha);
    if (A.chip) { A.chip.obj.position.copy(A.head.mesh.position); setA(A.chip, Math.min(ramp(u, 0.04, 0.18), 1 - ramp(u, 0.62, 0.8)) * (1 - F.endK)); }
  }
}

/* ---------- landing nodes on the axis: the site's green ring with its timestamp ---------- */
const NODES = [];
const RING = Array.from({ length: 65 }, (_, i) => { const a = (i / 64) * Math.PI * 2; return [Math.cos(a), 0, Math.sin(a)]; }).flat();
function mkNode(T, noun, o = {}) {
  const z = zT(T);
  const m = mkMark({ shape: 0, px: o.big ? 19 : 15, border: 2.5, b: 'accent', f: 'surface', halo: o.big ? 6 : 4.5, haloA: [0.13, 0.2], soft: 'dark', pos: new V3(0, 0, z), ro: 13, ref: 9, minS: 0.5 });
  const lb = mkLabel('<span class="ag-a-n">' + noun + '</span>' + stamp(T), 'ag-a-r ag-a-node' + (o.big ? ' big' : '') + (o.pl ? ' pl' : ''), scene, new V3(0, 0, z));
  const rip = mkLine(RING, 'accent', 1.25, { ro: 3 });
  rip.position.set(0, 0, z);
  lb.keep = !!o.keep;
  NODES.push({ T, m, lb, rip, o });
}
function updNodes() {
  const T = F.T;
  for (const N of NODES) {
    const on = ramp(T, N.T, N.T + 0.4);
    markA(N.m, on, 0.35 + 0.65 * backOut(on));
    const u = ramp(T, N.T, N.T + 1.15);
    N.rip.visible = u > 0 && u < 1;
    if (N.rip.visible) { const s = lerp(0.1, N.o.big ? 0.95 : 0.6, eout(u)); N.rip.scale.set(s, 1, s); N.rip.material.opacity = (1 - u) * 0.8; }
    let a = ramp(T, N.T + 0.12, N.T + 0.5) * dfade(N.lb.obj) * nearK(zT(N.T)) * edgeK(N.lb.obj);
    if (SM) a *= 1 - ramp(T, N.next, N.next + 0.35);
    a *= N.o.keep ? 1 : 1 - F.endK;
    if (N.o.keep) a = Math.max(a, F.endK * ramp(T, TEND + 0.8, TEND + 1.4));
    setA(N.lb, a);
  }
}

/* =====================================================================================
   THE STORY
   ===================================================================================== */
function buildStory() {
  /* round 2 (his call 10-30): a few more log events, so more of the agents' interactions land on the clock */
  const MORE = true;
  const hs = (l, f) => at('handshake', l, f), al = (l, f) => at('align', l, f), ag = (l, f) => at('agree', l, f);
  const lk = (l, f) => at('lock', l, f), rn = (l, f) => at('run', l, f);
  const sc0 = ST.scale.s;
  const tagAg = (name) => '<div class="ag-a-tag"><b></b>' + name + '<em class="ag-a-ck">' + IC.check + '</em></div>';

  /* ---- parties ---- */
  const B = mkEntity('B', { t0: -0.6, t1: TF, ap: 0.08, role: 'ink', tag: tagAg('Buyer agent'), endTag: true });
  const P = mkEntity('P', { t0: -0.6, t1: TF, ap: 0.3, role: 'ink', tag: tagAg('Provider agent'), endTag: 'r' });
  /* the agent tag gets a green check once its identity is verified */
  const idT = at('verify', 0, 0.55);
  [B, P].forEach((e) => {
    const ck = e.tag.inner.querySelector('.ag-a-ck');
    ACT.push(() => {
      const k = eout(ramp(F.T, idT, idT + 0.4)) * (1 - ramp(F.T, al(0, 0), al(0, 0.12)));
      sty(ck, 'maxWidth', (k * 13).toFixed(1) + 'px'); sty(ck, 'marginLeft', (-7 + 7 * k).toFixed(1) + 'px');
    });
  });
  const candLane = (T) => 1 - 0.55 * ramp(T, al(2, 0), al(2, 0.3));
  mkEntity('P2', { t0: al(0, 0.1), t1: al(2, 0.05), role: 'fg3', laneRole: 'line2', stemRole: 'line2', px: 13, alpha: (T) => win(T, al(0, 0.1), al(2, 0.12), 0.5, 0.45), laneA: candLane });
  mkEntity('P3', { t0: al(0, 0.16), t1: al(2, 0.05), role: 'fg3', laneRole: 'line2', stemRole: 'line2', px: 13, alpha: (T) => win(T, al(0, 0.16), al(2, 0.12), 0.5, 0.45), laneA: candLane });
  const tCon = ag(0, 0.15), tSet = lk(0, 0.08), tVer = rn(0, 0.08);
  mkEntity('C', { t0: tCon, t1: TF, role: 'accent', laneRole: 'accentRec', stemRole: 'accentRec', px: 13, halo: 4, tagCls: 'ag-a-u lo-l', phoneHide: true, tag: '<div class="ag-a-tag g"><b></b>Agent contract</div>' });
  mkEntity('S', { t0: tSet, t1: TF, role: 'ink', air: true, px: 16, core: 0, bw: 2, rad: 4, laneRole: 'lane', tagCls: 'ag-a-r hi', phoneHide: true, tag: '<div class="ag-a-set"><div class="ag-a-tag">' + IC.lock.replace('<svg ', '<svg class="ag-a-lk" ') + 'Settlement provider</div><span class="ag-a-chip ink sf">Funds</span></div>' });
  mkEntity('V', { t0: tVer, t1: TF, role: 'accent', laneRole: 'accentRec', stemRole: 'accentRec', px: 13, halo: 4, tagCls: 'ag-a-u lo-r', phoneHide: true, tag: '<div class="ag-a-tag g"><b></b>Verification</div>' });

  /* ---- the present on the axis: Clockchain's clock ---- */
  const nowG = new THREE.Group(); scene.add(nowG);
  const cur = mkMark({ shape: 0, px: 18, border: 2.5, b: 'accent', f: 'surface', halo: 6, haloA: [0.14, 0.24], soft: 'dark', parent: nowG, ro: 15, ref: 9, minS: 0.6 });
  const pulse = mkMark({ shape: 0, px: 18, border: 1.5, b: 'accent', f: 'surface', fA: 0, parent: nowG, ro: 11, ref: 9, minS: 0.6 });
  const curL = mkLabel('<span class="ag-a-n">Clockchain</span><span class="ag-a-t"><b style="font-weight:400"></b><i></i></span>', 'ag-a-lf ag-a-cur dn', nowG);
  curL.solid = true;
  const curH = curL.inner.querySelector('b'), curM = curL.inner.querySelector('i');
  ACT.push(() => {
    const T = F.T;
    nowG.position.set(0, 0, F.zN);
    const a = ramp(T, 0.05, 0.5) * (1 - ramp(T, TF + 0.2, TF + 0.7));
    markA(cur, a);
    const f = ((CLOCK0 + T) % 1 + 1) % 1;
    /* one ring at a time: the clock's pulse rests while a new node's ripple spreads from it */
    let rip = 0;
    for (const N of NODES) { const u = ramp(T, N.T - 0.1, N.T + 1.15); if (u > 0 && u < 1) rip = Math.max(rip, Math.min(ramp(u, 0, 0.08), 1 - ramp(u, 0.75, 1))); }
    markA(pulse, a * Math.pow(1 - f, 2) * 0.55 * (1 - rip), 1 + 1.4 * eout(f));
    setA(curL, a * ramp(T, 0.6, 1.1));
    const [h, ms] = clockParts(F.nT);
    if (curH.textContent !== h) curH.textContent = h;
    const m = '.' + ms; if (curM.textContent !== m) curM.textContent = m;
  });

  /* ---- 02 Invite: buyer -> Clockchain -> provider ---- */
  mkArc('B', at('invite', 0, 0.06), 'A', at('invite', 0, 0.3), 'i', { chip: '<span class="ag-a-chip out">Invite</span>' });
  mkNode(at('invite', 0, 0.3), 'Invite');
  mkArc('A', at('invite', 0, 0.38), 'P', at('invite', 0, 0.66), 'g', { chip: '<span class="ag-a-chip">Invite</span>' });

  /* ---- 03 Join: one private session (a bounded space), a scope around each agent ---- */
  const tS = at('join', 0, 0.1), tSE = al(0, 0), SX = L + 0.78, SR = 0.38, zs = zT(tS);
  mkNode(tS + 0.05, 'Session');
  const arcPts = (cx, cz, a0, a1) => Array.from({ length: 9 }, (_, i) => { const a = lerp(a0, a1, i / 8); return [cx + SR * Math.cos(a), 0, cz + SR * Math.sin(a)]; });
  /* the near edge draws out from the axis to both corners, then the sides run on */
  const nears = [-1, 1].map((s) => mkLine([[0, 0, zs], ...arcPts(s * (SX - SR), zs - SR, Math.PI / 2, s < 0 ? Math.PI : 0)], 'session', 1, { reveal: true, ro: 1 }));
  const nearLen = lineLen(nears[0]);
  const farG = new THREE.Group(); scene.add(farG);
  const far = mkLine([...arcPts(-SX + SR, SR, Math.PI, Math.PI * 1.5), ...arcPts(SX - SR, SR, Math.PI * 1.5, Math.PI * 2)], 'session', 1, { parent: farG, ro: 1 });
  const sides = [-SX, SX].map((x) => mkLine([[x, 0, zs - SR], [x, 0, zT(tSE) - 0.6 + SR]], 'session', 1, { reveal: true, ro: 1 }));
  const sfm = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, fog: true });
  hooks.push(() => sfm.color.copy(PAL.ink));
  const sfill = new THREE.Mesh(QUAD, sfm); sfill.rotation.x = -Math.PI / 2; sfill.renderOrder = 0; scene.add(sfill);
  const sesL = mkLabel('Private session', 'ag-a-r ag-a-lab', scene);
  ACT.push(() => {
    const T = F.T, on = ramp(T, tS, tS + 0.7);
    const rec = T < tSE ? 1 : lerp(1, 0.5, ramp(T, tSE, tSE + 0.8));
    const zFar = zT(clamp(F.nT, tS, tSE)) - 0.6;
    nears.forEach((l) => { l.material.dashSize = Math.max(1e-4, nearLen * eio(on)); show(l, on > 0 ? rec : 0); });
    sides.forEach((l) => { l.material.dashSize = Math.max(1e-4, (zs - SR) - (zFar + SR)); show(l, ramp(T, tS + 0.35, tS + 0.7) * rec); });
    farG.position.set(0, 0, zFar); show(far, ramp(T, tS + 0.35, tS + 0.7) * rec);
    const len = Math.max(0.001, zs - zFar);
    sfill.scale.set(2 * SX, len, 1); sfill.position.set(0, 0, zs - len / 2);
    sfm.opacity = ramp(T, tS + 0.2, tS + 0.9) * (C.dark ? 0.04 : 0.022) * rec; sfill.visible = T > tS;
    sesL.obj.position.set(-SX, 0, Math.min(zs - 0.4, F.zN + 1.25));
    setA(sesL, win(T, tS + 0.45, tSE + 0.3, 0.5, 0.5) * dfade(sesL.obj, 1.2) * (F.sm ? 0 : 1));
  });
  /* scope brackets on the ground around each agent */
  const sq = 0.44, arm = 0.15;
  const br = []; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => { br.push(sx * sq, 0, sz * sq, sx * (sq - arm), 0, sz * sq, sx * sq, 0, sz * sq, sx * sq, 0, sz * (sq - arm)); });
  [B, P].forEach((e, i) => {
    const s = mkSegs(br, 'ink', 1.4, { parent: e.g, ro: 5 });
    const lb = mkLabel('Scope', (i ? 'ag-a-r' : 'ag-a-lf') + ' ag-a-lab', e.g, new V3((i ? 1 : -1) * sq, 0, sq));
    ACT.push(() => {
      const T = F.T;
      const a = win(T, at('join', 0, 0.42), al(0, 0.1), 0.45, 0.45);
      const k = 0.55 + 0.45 * win(T, hs(0, 0), hs(1, 0.05), 0.35, 0.35) + 0.45 * win(T, at('join', 0, 0.42), at('verify', 0, 0), 0.4, 0.6);
      show(s, a * Math.min(1, k));
      const z = lerp(1.35, 1, eout(ramp(T, at('join', 0, 0.42), at('join', 0, 0.62))));
      s.scale.set(z, 1, z);
      setA(lb, (SM ? 0 : 1) * a * win(T, at('join', 0, 0.5), hs(1, 0.05), 0.4, 0.4) * dfade(lb.obj));
    });
  });

  /* ---- 04 Verify: the ledger appears; each identity is checked against it (ERC-8004) ---- */
  mkArc('B', at('verify', 0, 0.26), 'A', at('verify', 0, 0.5), 'g');
  mkArc('P', at('verify', 0, 0.26), 'A', at('verify', 0, 0.5), 'g');
  mkNode(at('verify', 0, 0.5), 'ERC-8004');
  [B, P].forEach((e, i) => {
    const lb = mkLabel('<span class="ag-a-chip">' + IC.check + 'Identity</span>', (i ? 'ag-a-r' : 'ag-a-lf') + ' su', e.g, new V3(0, HEAD, 0));
    ACT.push(() => setA(lb, win(F.T, at('verify', 0, 0.55), hs(0, 0.04), 0.35, 0.3)));
  });

  /* ---- 05 Handshake ---- */
  /* line 0: each agent signs on its own machine; nothing travels to Clockchain */
  const SIG = '<svg class="ag-a-sig" viewBox="0 0 46 14" aria-hidden="true"><path pathLength="1" stroke-dasharray="1" d="M2 10.5c3-7 6-8 6.5-3s2.4 5 5-1.2 4.6-5 5.2.4 3 4.4 5.6-1.6 4-3.8 5.6.6 3.6 3 5.8-.8 4.4-2.6 8.3-.4"/></svg>';
  [B, P].forEach((e, i) => {
    const lb = mkLabel('<div class="ag-a-sigw"><span class="ag-a-chip out">' + IC.key + 'Signature</span>' + SIG + '</div>', (i ? 'ag-a-r' : 'ag-a-lf') + ' su', e.g, new V3(0, HEAD - 0.06, 0));
    const path = lb.inner.querySelector('path');
    ACT.push(() => {
      const T = F.T;
      setA(lb, win(T, hs(0, 0.06), hs(1, 0.12), 0.35, 0.35));
      sty(path, 'strokeDashoffset', (1 - eio(ramp(T, hs(0, 0.2), hs(0, 0.75)))).toFixed(3));
    });
  });
  /* line 1: each signed message goes through Clockchain to the other agent (no direct link yet: that is the channel, line 3);
     the same certificate appears at both agents */
  mkArc('B', hs(1, 0.03), 'A', hs(1, 0.2), 'i');
  mkArc('P', hs(1, 0.03), 'A', hs(1, 0.2), 'i');
  mkArc('A', hs(1, 0.22), 'P', hs(1, 0.39), 'i');
  mkArc('A', hs(1, 0.22), 'B', hs(1, 0.39), 'i');
  if (MORE) mkNode(hs(1, 0.2), 'Certificate');   /* both signed messages reach Clockchain */
  const certHTML = '<div class="ag-a-card ag-a-cert"><div class="ag-a-k">Certificate<span class="ag-a-ok">' + IC.check + '</span></div>' + fp() +
    '<div class="ag-a-row">' + IC.key + 'Signed</div><div class="ag-a-row g anc">' + IC.check + 'Anchored</div></div>';
  [B, P].forEach((e) => {
    const lb = mkLabel(certHTML, 'ag-a-u2', e.g, new V3(0, HEAD, 0));
    const anc = lb.inner.querySelector('.anc');
    ACT.push(() => {
      const T = F.T;
      setA(lb, win(T, hs(1, 0.36), al(0, 0.08), 0.35, 0.4));
      sty(anc, 'opacity', r2(ramp(T, hs(2, 0.5), hs(2, 0.62))));
    });
  });
  const eq = mkLabel('<span class="ag-a-eq">=</span>', 'ag-a-c', scene);
  eq.inner.style.transform = 'translate(0,-92px)';   /* level with the twin cards */
  eq.nofit = true;
  ACT.push(() => {
    eq.obj.position.set(0, HEAD, F.zN);
    setA(eq, win(F.T, hs(1, 0.62), hs(2, 0.15), 0.3, 0.3));
  });
  /* line 2: the outcome is anchored to the ledger with a timestamp */
  mkArc('B', hs(2, 0.06), 'A', hs(2, 0.42), 'g');
  mkArc('P', hs(2, 0.06), 'A', hs(2, 0.42), 'g');
  mkNode(hs(2, 0.42), 'Anchored', { big: true });
  /* line 3: a witnessed, bounded channel opens between the two agents */
  const chG = new THREE.Group(); scene.add(chG);
  const cw = 0.075, cx = L - 0.2;
  const chEdges = [mkLine([[-cx, HEAD + cw, 0], [cx, HEAD + cw, 0]], 'accent', 1.5, { parent: chG, ro: 6, reveal: true }),
    mkLine([[-cx, HEAD - cw, 0], [cx, HEAD - cw, 0]], 'accent', 1.5, { parent: chG, ro: 6, reveal: true })];
  const chCaps = mkSegs([-cx, HEAD - cw * 2.2, 0, -cx, HEAD + cw * 2.2, 0, cx, HEAD - cw * 2.2, 0, cx, HEAD + cw * 2.2, 0], 'accent', 2, { parent: chG, ro: 6 });
  const witness = mkLine([[0, 0.12, 0], [0, HEAD - cw - 0.02, 0]], 'accent', 1.25, { parent: chG, ro: 6, dash: [0.06, 0.05] });
  const chDots = Array.from({ length: 6 }, () => mkMark({ shape: 0, px: 5, border: 2.5, b: 'accent', f: 'accent', parent: chG, ro: 14, ref: 9, minS: 0.7 }));
  const chL = mkLabel('Channel', 'ag-a-u ag-a-lab g', chG, new V3(0, HEAD + cw, 0));
  const wiL = mkLabel('Witness', 'ag-a-r ag-a-lab g', chG, new V3(0, HEAD * 0.42, 0));
  const tCh = hs(3, 0.08);
  mkNode(hs(3, 0.2), 'Channel');
  ACT.push(() => {
    const T = F.T;
    chG.position.set(0, 0, F.zN);
    const a = win(T, tCh, al(0, 0.08), 0.25, 0.4);
    const r = eio(ramp(T, tCh, tCh + 0.7));
    chEdges.forEach((l) => { show(l, a); l.material.dashSize = Math.max(1e-4, 2 * cx * r); });
    show(chCaps, a * ramp(T, tCh + 0.55, tCh + 0.8));
    show(witness, a * ramp(T, tCh + 0.6, tCh + 1.0));
    witness.scale.y = Math.max(0.0001, ramp(T, tCh + 0.6, tCh + 1.0));
    chDots.forEach((d, i) => {
      const dir = i % 2 ? -1 : 1, f = ((T * 0.55 + i / 6) % 1 + 1) % 1;
      d.mesh.position.set(dir * lerp(-cx + 0.12, cx - 0.12, f), HEAD, 0);
      markA(d, a * ramp(T, tCh + 0.7, tCh + 1.1) * Math.sin(Math.PI * f));
    });
    setA(chL, a * ramp(T, tCh + 0.5, tCh + 0.9));
    setA(wiL, a * ramp(T, tCh + 0.8, tCh + 1.2));
  });

  /* ---- 06 Initial alignment ---- */
  /* line 0: discovery, needs matched to capabilities; one provider agent matches */
  const NEED = [1, 0, 1, 1, 0];
  const needL = mkLabel('<span class="ag-a-cap m">Needs ' + pat(NEED) + '</span>', 'ag-a-lf su', B.g, new V3(0, HEAD, 0));
  ACT.push(() => setA(needL, win(F.T, al(0, 0.08), al(1, 0.15), 0.35, 0.35)));
  const tMatch = al(0, 0.62);
  [['P', NEED, 'ag-a-r su'], ['P2', [1, 1, 0, 1, 0], 'ag-a-u sd'], ['P3', [0, 0, 1, 1, 1], 'ag-a-u sd2']].forEach(([k, bits, cls], i) => {
    const lb = mkLabel('<span class="ag-a-cap">' + pat(bits) + (i === 0 ? '<span class="mt" style="display:inline-flex;overflow:hidden;max-width:0">' + IC.check + '</span>' : '') + '</span>', cls, ENT[k].g, new V3(0, HEAD, 0));
    const cap = lb.inner.firstChild, mt = lb.inner.querySelector('.mt');
    ACT.push(() => {
      const T = F.T, m = T >= tMatch;
      setA(lb, win(T, al(0, 0.18), al(1, 0.15), 0.35, 0.35) * (i && m ? lerp(1, 0.45, ramp(T, tMatch, tMatch + 0.3)) : 1));
      if (i === 0) { cap.classList.toggle('m', m); sty(mt, 'maxWidth', m ? '14px' : '0px'); }
    });
  });
  mkArc('B', al(0, 0.22), 'P2', al(0, 0.52), 'i', { lift: 0.78, rec: 0.6 });
  mkArc('B', al(0, 0.22), 'P3', al(0, 0.55), 'i', { lift: 1.1, rec: 0.6 });
  mkArc('B', al(0, 0.22), 'P', al(0, 0.5), 'g', { lift: 0.45 });
  mkNode(tMatch, 'Discovery');
  /* line 1: proposals, compared side by side. They arrive with the line: the first tile is in by +0.4 s, the others 0.25 s apart */
  const pIn = (i) => al(1, 0) + 0.4 + i * 0.25;
  mkArc('P', al(1, 0) - 0.05, 'B', pIn(0), 'i', { lift: 0.3, rec: 0.7 });
  mkArc('P2', al(1, 0) + 0.05, 'B', pIn(1), 'i', { lift: 0.36, rec: 0.6 });
  mkArc('P3', al(1, 0) + 0.15, 'B', pIn(2), 'i', { lift: 0.42, rec: 0.6 });
  const prop = (m) => '<div class="ag-a-card ag-a-prop' + (m ? ' m' : '') + '"><div class="ag-a-k">Proposal' + (m ? '<span class="ag-a-ok mk">' + IC.check + '</span>' : '') + '</div><i style="width:84%"></i><i style="width:58%"></i><i style="width:70%"></i></div>';
  const props = mkLabel('<div class="ag-a-props">' + prop(true) + prop(false) + prop(false) + '</div>', 'ag-a-u2', scene);
  const pCards = props.inner.querySelectorAll('.ag-a-prop'), pMk = props.inner.querySelector('.mk');
  mkNode(pIn(2), 'Proposals');
  ACT.push(() => {
    const T = F.T;
    props.obj.position.set(F.sm ? -0.2 : -L * 0.42, HEAD, F.zN);
    setA(props, win(T, al(1, 0) + 0.05, al(2, 0.1), 0.3, 0.35));
    pCards.forEach((c, i) => sty(c, 'opacity', r2(eout(ramp(T, pIn(i) - 0.3, pIn(i))) * (i ? 1 - 0.45 * ramp(T, al(1, 0.6), al(1, 0.7)) : 1))));
    sty(pMk, 'opacity', r2(ramp(T, al(1, 0.6), al(1, 0.7))));
  });
  /* line 2: negotiation, terms go back and forth */
  const TERMS = ['Scope', 'Milestones', 'Evidence', 'Pricing', 'Payment gates'];
  const tArr = [];
  TERMS.forEach((t, i) => {
    const b2p = i % 2 === 0, t0 = al(2, 0.06 + i * 0.13), t1 = t0 + 0.72;
    mkArc(b2p ? 'B' : 'P', t0, b2p ? 'P' : 'B', t1, 'i', { lift: b2p ? 0.62 : 0.2, chip: '<span class="ag-a-chip out">' + t + '</span>', rec: 0.8 });
    tArr.push(t1);
  });
  const terms = mkLabel('<div class="ag-a-card ag-a-terms"><div class="ag-a-k">Terms</div><div class="ag-a-tl">' + TERMS.map((t) => '<span class="ag-a-chip">' + IC.check + t + '</span>').join('') + '</div></div>', 'ag-a-u2', B.g, new V3(0, HEAD, 0));
  const tRows = terms.inner.querySelectorAll('.ag-a-chip');
  mkNode(al(2, 0.9), 'Terms');
  ACT.push(() => {
    const T = F.T;
    setA(terms, win(T, al(2, 0.06), ag(0, 0.1), 0.3, 0.3));
    tRows.forEach((r, i) => { const on = T >= tArr[i] - 0.06; if (r._on !== on) { r._on = on; r.classList.toggle('on', on); } });
  });

  /* ---- 07 Agreement: one contract, text and code; anchored; acceptance certificates both sides ---- */
  const con = mkLabel('<div class="ag-a-card ag-a-con"><div class="ag-a-k"><b>Agent contract</b></div><div class="ag-a-cols">' +
    '<div class="ag-a-col tx"><span class="ag-a-colh">People</span>' + TERMS.map((t) => '<span class="ag-a-tx">' + t + '</span>').join('') + '</div>' +
    '<div class="ag-a-col cd"><span class="ag-a-colh">Machines</span>' + ['scope', 'milestones', 'evidence', 'pricing', 'payment_gates'].map((k) => '<span class="ag-a-cd"><b>' + k + '</b>: {…}</span>').join('') + '</div></div>' +
    '<div class="ag-a-hash">#9f3a…c27e<b class="anc">' + IC.check + 'ANCHORED</b></div></div>', 'ag-a-u2 hi2', ENT.C.g, new V3(1.25, HC, 0));
  const conTx = con.inner.querySelector('.tx'), conCd = con.inner.querySelector('.cd'), conAnc = con.inner.querySelector('.anc');
  ACT.push(() => {
    const T = F.T;
    setA(con, win(T, ag(0, 0.12), lk(0, 0.1), 0.35, 0.35));
    sty(conTx, 'opacity', r2(ramp(T, ag(0, 0.25), ag(0, 0.4))));
    sty(conCd, 'opacity', r2(ramp(T, ag(0, 0.5), ag(0, 0.65))));
    sty(conAnc, 'opacity', r2(ramp(T, ag(1, 0.32), ag(1, 0.42))));
  });
  mkArc('C', ag(1, 0.04), 'A', ag(1, 0.3), 'g');
  mkNode(ag(1, 0.3), 'Agent contract', { big: true });
  mkArc('C', ag(1, 0.42), 'B', ag(1, 0.72), 'g', { chip: '<span class="ag-a-chip">' + IC.key + 'Acceptance</span>' });
  mkArc('C', ag(1, 0.42), 'P', ag(1, 0.72), 'g', { chip: '<span class="ag-a-chip">' + IC.key + 'Acceptance</span>' });
  [B, P].forEach((e, i) => {
    const lb = mkLabel('<span class="ag-a-chip">' + IC.check + 'Acceptance</span>', (i ? 'ag-a-r' : 'ag-a-lf') + ' sd', e.g, new V3(0, HEAD, 0));
    /* fitted like a message chip: on the phone the contract's tag sits beside its marker, so the chip takes a clear side */
    lb.arc = true; lb.t0 = ag(1, 0.74); lb.alt = [[i ? 'r' : 'lf', 'd', 'u'], ['sd', i ? 'r' : 'lf', i ? 'lf' : 'r', 'u']];
    ACT.push(() => setA(lb, win(F.T, ag(1, 0.74), lk(0, 0.1), 0.3, 0.35)));
  });

  /* ---- 08 Conditional lock: the buyer authorizes; the funds go to the settlement provider, never the contract ---- */
  mkArc('B', lk(0, 0.1), 'C', lk(0, 0.3), 'g', { chip: '<span class="ag-a-chip">Authorization</span>', lift: 0.25 });
  mkArc('C', lk(0, 0.32), 'A', lk(0, 0.5), 'g', { lift: 0.2 });
  mkNode(lk(0, 0.5), 'Authorization');
  mkArc('B', lk(0, 0.42), 'S', lk(0, 0.76), 'i', { lift: 0.55, chip: '<span class="ag-a-chip ink">' + IC.lock + 'Funds</span>', w: 2 });
  /* the lock holds the funds for every milestone: it opens at each release, pays that milestone, and closes again on the rest.
     After the last milestone it stays open (nothing left to hold) */
  const SE = ENT.S, setTag = SE.tag.inner, setBox = setTag.querySelector('.ag-a-tag'), setLock = setTag.querySelector('.sh'), setFunds = setTag.querySelector('.sf');
  const tLockOn = lk(0, 0.8);
  if (MORE) { mkArc('S', lk(0, 0.8), 'A', lk(0, 0.97), 'g', { lift: 0.2 }); mkNode(lk(0, 0.97), 'Lock'); }   /* the lock closing is logged */
  const REL = [rn(2, 0.3), sc0 + 1.37, sc0 + 1.55 + 1.37], CLOSE = [tLockOn, rn(2, 0.72) + 0.2, sc0 + 1.95];
  const lockK = (T) => { let k = 0; for (let i = 0; i < 3; i++) k = Math.max(k, Math.min(eout(ramp(T, CLOSE[i], CLOSE[i] + 0.3)), 1 - eout(ramp(T, REL[i], REL[i] + 0.25)))); return k; };
  const lockRing = mkMark({ shape: 1, px: 16, rad: 4, border: 1.5, b: 'accent', f: 'surface', fA: 0, parent: SE.g, pos: new V3(0, YS, 0), ro: 11, ref: 9, minS: 0.6 });
  ACT.push(() => {
    const T = F.T, k = lockK(T);
    sty(setLock, 'transform', 'translateY(' + (-3.8 * (1 - k)).toFixed(2) + 'px)');
    const on = k > 0.5; if (setBox._lk !== on) { setBox._lk = on; setBox.classList.toggle('lk', on); }
    /* each close is a beat: a ring goes out from the provider's node and an accent halo from its tag */
    let pu = 0; for (const c of CLOSE) { const u = ramp(T, c, c + 0.9); if (u > 0 && u < 1) pu = u; }
    markA(lockRing, pu > 0 ? (1 - pu) * 0.9 * SE.tagA : 0, 1 + 1.8 * eout(pu));
    sty(setBox, 'boxShadow', pu > 0 ? '0 0 0 ' + (1 + 7 * eout(pu)).toFixed(1) + 'px color-mix(in oklab,var(--accent) ' + Math.round(42 * (1 - pu)) + '%,transparent)' : 'none');
    sty(setFunds, 'opacity', r2(win(T, tLockOn - 0.05, REL[2] + 0.1, 0.2, 0.2)));
  });
  /* line 1: the contract runs the rules, never holds the money. Its card stands on the contract's own node */
  mkArc('C', lk(1, 0.08), 'S', lk(1, 0.38), 'g', { lift: 0.25, chip: '<span class="ag-a-chip">Rules</span>' });
  const rules = mkLabel('<div class="ag-a-card ag-a-rules"><div class="ag-a-k"><b>Agent contract</b></div>' +
    '<div class="ag-a-row g">' + IC.check + 'Rules</div><div class="ag-a-row g">' + IC.check + 'Conditions</div><div class="ag-a-row no">&mdash;&nbsp;<span>Funds</span></div></div>', 'ag-a-u3 ag-a-ld', ENT.C.g, new V3(0, HC, 0));
  ACT.push(() => setA(rules, win(F.T, lk(1, 0.04), rn(0, 0.12), 0.35, 0.35)));

  /* ---- 09 Bounded transaction ---- */
  /* line 0: the provider agent does the work (milestone progress) */
  const ringPts = Array.from({ length: 73 }, (_, i) => { const a = -Math.PI / 2 - (i / 72) * Math.PI * 2; return [0.36 * Math.cos(a), 0, 0.36 * Math.sin(a)]; }).flat();
  const ringBg = mkLine(ringPts, 'line2', 1, { parent: P.g, ro: 4 });
  const ring = mkLine(ringPts, 'ink', 2, { parent: P.g, ro: 5, reveal: true });
  const ringLen = lineLen(ring);
  const mL = mkLabel('<span class="ag-a-lab">M1</span>', 'ag-a-r', P.g, new V3(0.36, 0, 0));
  const mTxt = mL.inner.firstChild;
  const CYC = [[rn(0, 0.1), rn(0, 0.95), 'M1'], [sc0 + 0.15, sc0 + 0.75, 'M2'], [sc0 + 1.7, sc0 + 2.3, 'M3']];
  ACT.push(() => {
    const T = F.T;
    let a = 0, p = 0, name = 'M1';
    for (const [w0, w1, n] of CYC) {
      const aa = win(T, w0 - 0.1, w1 + 0.55, 0.2, 0.35);
      if (aa > a) { a = aa; p = ramp(T, w0, w1); name = n; }
    }
    show(ringBg, a * 0.9); show(ring, a);
    ring.material.dashSize = Math.max(1e-4, ringLen * eio(p));
    setA(mL, a);
    if (mTxt.textContent !== name) mTxt.textContent = name;
  });
  if (MORE) { mkArc('P', rn(0, 0.78), 'A', rn(0, 0.96), 'i', { lift: 0.25 }); mkNode(rn(0, 0.96), 'Work · M1'); }   /* the delivered work is logged */
  /* line 1: verification against the agreed criteria; an evidence package; anchored */
  mkArc('C', rn(1, 0.04), 'V', rn(1, 0.32), 'g', { lift: 0.3, chip: '<span class="ag-a-chip">Criteria</span>' });
  mkArc('P', rn(1, 0.1), 'V', rn(1, 0.38), 'i', { lift: 0.3 });
  const ev = mkLabel('<div class="ag-a-card ag-a-ev"><div class="ag-a-k">' + IC.doc + 'Evidence</div>' +
    '<div class="ag-a-row g">' + IC.check + 'Criteria</div><div class="ag-a-row g">' + IC.check + 'Work · M1</div><div class="ag-a-row g">' + IC.check + 'Audit trail</div></div>', 'ag-a-u2 ag-a-ld hi3', ENT.V.g, new V3(0, HC, 0));
  ev.sx = [-44, -26];   /* px toward the axis, desktop / phone */
  const evRows = ev.inner.querySelectorAll('.ag-a-row');
  ACT.push(() => {
    const T = F.T;
    /* the evidence package stands on Verification, which produced it; it gives way when settlement takes over */
    setA(ev, win(T, rn(1, 0.38), rn(2, 0.14), 0.3, 0.35));
    evRows.forEach((r, i) => sty(r, 'opacity', r2(ramp(T, rn(1, 0.42 + i * 0.07), rn(1, 0.5 + i * 0.07)))));
  });
  mkArc('V', rn(1, 0.52), 'A', rn(1, 0.74), 'g', { lift: 0.22 });
  mkNode(rn(1, 0.74), 'Evidence · M1');
  mkArc('V', rn(1, 0.8), 'P', rn(1, 0.98), 'g', { lift: 0.22 });
  /* line 2: settlement releases the lock and pays the provider */
  mkArc('V', rn(2, 0.04), 'S', rn(2, 0.28), 'g', { lift: 0.25, chip: '<span class="ag-a-chip">Release</span>' });
  mkArc('S', rn(2, 0.38), 'P', rn(2, 0.72), 'i', { lift: 0.4, chip: '<span class="ag-a-chip ink">Funds</span>', w: 2 });
  const paid = mkLabel('<span class="ag-a-chip ink">' + IC.check + 'Funds</span>', 'ag-a-r sd', P.g, new V3(0, HEAD, 0));
  paid.arc = true; paid.t0 = rn(2, 0.74); paid.alt = [['r', 'd', 'lf'], ['sd', 'r', 'lf', 'u']];   /* clear of the verification tag on the phone */
  if (MORE) { mkArc('S', rn(2, 0.74), 'A', rn(2, 0.92), 'g', { lift: 0.2 }); mkNode(rn(2, 0.92), 'Paid · M1'); }   /* the payment is logged */
  ACT.push(() => setA(paid, win(F.T, rn(2, 0.74), rn(3, 0.95), 0.25, 0.35)));
  /* line 3: escrow without being the escrow. The money path (ink) arches over; Clockchain and the contract stay outside it */
  const mpG = new THREE.Group(); scene.add(mpG);
  const mpPts = (xa, ya, xb, yb, lift) => Array.from({ length: 33 }, (_, i) => {
    const s = i / 32, cxm = (xa + xb) / 2, cy = Math.max(ya, yb) + lift;
    return [(1 - s) * (1 - s) * xa + 2 * (1 - s) * s * cxm + s * s * xb, (1 - s) * (1 - s) * ya + 2 * (1 - s) * s * cy + s * s * yb, 0];
  }).flat();
  const mp1 = mkLine(mpPts(-L, HEAD, XS, YS, 0.4), 'ink', 2.25, { parent: mpG, ro: 7, reveal: true });
  const mp2 = mkLine(mpPts(XS, YS, L, HEAD, 0.25), 'ink', 2.25, { parent: mpG, ro: 7, reveal: true });
  const mpL1 = lineLen(mp1), mpL2 = lineLen(mp2);
  /* the Funds name sits on the buyer's leg of the arch, well clear of the contract below it */
  const mpLab = mkLabel('<span class="ag-a-chip ink">Funds</span>', 'ag-a-u', mpG, new V3(-L * 0.62, HEAD + 0.62, 0));
  const glow = [mkLine([[XC, 0, 0], [XC, 0, 6]], 'accent', 2, { parent: mpG, ro: 2 }), mkLine([[XV, 0, 0], [XV, 0, 6]], 'accent', 2, { parent: mpG, ro: 2 })];
  const r3 = rn(3, 0.06);
  ACT.push(() => {
    const T = F.T;
    mpG.position.set(0, 0, F.zN);
    const a = win(T, r3, sc0 + 0.25, 0.25, 0.4);
    show(mp1, a); show(mp2, a);
    mp1.material.dashSize = Math.max(1e-4, mpL1 * eio(ramp(T, r3, r3 + 0.6)));
    mp2.material.dashSize = Math.max(1e-4, mpL2 * eio(ramp(T, r3 + 0.5, r3 + 1.1)));
    setA(mpLab, a * ramp(T, r3 + 0.5, r3 + 0.9));
    const ga = win(T, r3 + 0.9, sc0 + 0.25, 0.4, 0.4);
    glow.forEach((l) => show(l, ga * 0.85));
  });

  /* ---- 10 Reputation and scale: the cycle repeats per milestone; reputation updates; the record closes ---- */
  const cyc = (o, m) => {
    mkArc('P', sc0 + o + 0.6, 'V', sc0 + o + 0.95, 'i', { lift: 0.25 });
    mkArc('V', sc0 + o + 1.0, 'A', sc0 + o + 1.3, 'g', { lift: 0.2 });
    mkNode(sc0 + o + 1.3, m);
    mkArc('V', sc0 + o + 1.05, 'S', sc0 + o + 1.35, 'g', { lift: 0.2 });
    mkArc('S', sc0 + o + 1.4, 'P', sc0 + o + 1.75, 'i', { lift: 0.3, w: 2 });
  };
  cyc(0, 'M2'); cyc(1.55, 'M3');
  const repT = [rn(2, 0.75), sc0 + 1.8, sc0 + 3.35];
  const rep = mkLabel('<div class="ag-a-card ag-a-rep"><div class="ag-a-k"><b>Reputation</b></div><div class="ag-a-bars">' +
    ['M1', 'M2', 'M3'].map((m, i) => '<span><i style="height:' + (10 + i * 7) + 'px"><u></u></i><em>' + m + '</em></span>').join('') + '</div></div>', 'ag-a-rr pc', P.g, new V3(0, HEAD, 0));
  rep.pin = [-0.6, 0.3];   /* phone: no room beside the provider, so the scorecard sits in the free top-left corner */
  const repU = rep.inner.querySelectorAll('u');
  ACT.push(() => {
    const T = F.T;
    setA(rep, win(T, sc0 + 0.05, TEND + 0.5, 0.35, 0.45));
    repU.forEach((u, i) => sty(u, 'height', (eout(ramp(T, repT[i], repT[i] + 0.45)) * 100).toFixed(1) + '%'));
  });
  /* project complete: the closing node, and a closing line across every lane */
  mkNode(TF, 'Project complete', { big: true, keep: true, pl: true });   /* on the phone its name sits to the left, over the empty corner */
  const close = mkLine([[-(L + 0.75), 0, zT(TF)], [L + 0.75, 0, zT(TF)]], 'accent', 1.5, { reveal: true, ro: 2 });
  const closeLen = lineLen(close);
  ACT.push(() => { const u = eio(ramp(F.T, TF + 0.1, TF + 0.8)); close.visible = u > 0; close.material.dashSize = Math.max(1e-4, closeLen * u); });
}

/* =====================================================================================
   CAMERA: one preset per beat, eased in turn; it rides the present along the axis
   ===================================================================================== */
function buildCamera() {
  const K = (id, line, p, dur = 1.7) => KEYS.push({ t: at(id, line, 0), p, dur });
  K('meet', 0, { x: 0, y: 0.6, zo: -0.3, dist: 9.6, el: 15, az: -7, W: 3.6 });
  K('invite', 0, { x: 0, y: 0.6, zo: -0.4, dist: 9.4, el: 17, az: -3, W: 3.6 });
  K('join', 0, { x: 0, y: 0.45, zo: -0.2, dist: 9.8, el: 22, az: 5, W: 3.9 });
  K('verify', 0, { x: 0, y: 0.45, zo: -0.5, dist: 9.6, el: 24, az: 8, W: 3.7 });
  K('handshake', 0, { x: 0, y: 0.75, zo: 0, dist: 8.6, el: 14, az: -5, W: 3.6 });
  K('handshake', 1, { x: 0, y: 1.0, zo: 0, dist: 9.0, el: 13, az: 2, W: 3.6 });
  K('handshake', 2, { x: 0, y: 0.7, zo: -0.3, dist: 9.2, el: 19, az: 5, W: 3.6 });
  K('handshake', 3, { x: 0, y: 0.8, zo: -0.2, dist: 9.0, el: 16, az: -3, W: 3.6 });
  K('align', 0, { x: 1.3, y: 0.7, zo: -0.3, dist: 10.4, el: 19, az: -6, W: 4.7 });
  K('align', 1, { x: 0.9, y: 1.05, zo: -0.2, dist: 10.6, el: 15, az: -3, W: 4.5 });
  K('align', 2, { x: 0, y: 1.05, zo: -0.2, dist: 9.6, el: 15, az: 4, W: 3.6 });
  K('agree', 0, { x: -0.3, y: 1.1, zo: -0.1, dist: 9.6, el: 15, az: 5, W: 3.6 });
  K('agree', 1, { x: 0, y: 0.85, zo: -0.3, dist: 9.8, el: 19, az: -3, W: 3.6 });
  K('lock', 0, { x: 0, y: 1.2, zo: -0.1, dist: 10.4, el: 11, az: -5, W: 3.6 });
  K('lock', 1, { x: 0, y: 1.15, zo: -0.1, dist: 10.4, el: 13, az: 4, W: 3.6 });
  K('run', 0, { x: 0.3, y: 1.1, zo: -0.1, dist: 10.2, el: 14, az: 6, W: 3.6 });
  K('run', 1, { x: 0.4, y: 1.0, zo: -0.3, dist: 10.2, el: 16, az: 3, W: 3.6 });
  K('run', 2, { x: 0, y: 1.2, zo: -0.1, dist: 10.6, el: 11, az: -3, W: 3.6 });
  K('run', 3, { x: 0, y: 1.15, zo: -0.1, dist: 11, el: 10, az: 0, W: 3.7 });
  K('scale', 0, { x: 0.2, y: 0.85, zo: -0.1, dist: 11, el: 20, az: -8, W: 3.8 });
  K('scale', 1, { x: 0.3, y: 0.85, zo: -0.2, dist: 10.8, el: 18, az: -5, W: 3.8 });
  KEYS.push({ t: TEND + 0.2, p: { end: true }, dur: 1.3 });   /* the crane starts once every label is gone (TEND + 0.15) */
}
const vshift = () => (SM ? 0.12 : 0.05);
const RAD = THREE.MathUtils.degToRad;
const fitCam = new THREE.PerspectiveCamera(), fitP = new V3(), fitT = new V3(), fitD = new V3();
/* the end card: the camera cranes up and out behind the provider's side and looks along the whole record, steeply enough
   that time climbs the stage corner to corner: the start (with the two agents named) near, PROJECT COMPLETE at the far end.
   The distance is fitted so the trail fills the free part of the stage (below the chapter chips, room kept for the labels) */
let endCache = null;
function endPose() {
  const key = W + 'x' + H;
  if (endCache && endCache.key === key) return { ...endCache.p };
  const sq = W / H < 1.3, s = SQ(), zE = zT(TF);
  const az = sq ? 14 : 56, el = sq ? 44 : 38;
  fitD.set(Math.sin(RAD(az)) * Math.cos(RAD(el)), Math.sin(RAD(el)), Math.cos(RAD(az)) * Math.cos(RAD(el)));
  fitCam.copy(cam);
  const top = 1 - 2 * ((SM ? 92 : 66) / H), xr = sq ? 0.84 : 0.62;
  /* [x, y, z, max ndc x, min ndc x]: the record's corners, the agents, the settlement provider, the end node.
     The lane starts keep room for the agents' names (to the left; on the phone the provider's goes to the right) */
  const z0 = zT(-0.6);
  const P = [[0, 0, z0, 0.9, -0.9], [-L * s, 0, z0, 0.9, sq ? -0.36 : -0.62], [L * s, 0, z0, sq ? 0.32 : 0.9, sq ? -0.9 : -0.62], [-L * s, HEAD, zE, 0.9, -0.9], [L * s, HEAD, zE, 0.9, -0.9],
    [XS * s, YS, zE, 0.9, -0.9], [0, 0, zE, xr, -0.9], [0, -0.25, zE, xr, -0.9]];
  const fits = (d) => {
    fitCam.position.copy(fitT).addScaledVector(fitD, d); fitCam.lookAt(fitT); fitCam.updateMatrixWorld();
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9, ok = true;
    for (const [x, y, z, xm, xn] of P) {
      fitP.set(x, y, z).project(fitCam);
      if (fitP.z > 1 || fitP.x < xn || fitP.x > xm || fitP.y < -0.84 || fitP.y > top) ok = false;
      x0 = Math.min(x0, fitP.x); x1 = Math.max(x1, fitP.x); y0 = Math.min(y0, fitP.y); y1 = Math.max(y1, fitP.y);
    }
    return { ok, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  };
  fitT.set(0, 0.6, zT(TF * (sq ? 0.62 : 0.6)));
  let d = 20;
  for (let pass = 0; pass < 3; pass++) {
    let lo = 4, hi = 260;
    for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (fits(m).ok) hi = m; else lo = m; }
    d = hi;
    if (pass < 2) {
      /* centre the record in the free part of the stage (between the chips and the bottom; the label room on the right) */
      const r = fits(d), mx = sq ? 0.05 : 0, my = (-0.84 + top) / 2;
      fitCam.updateMatrixWorld();
      const right = new V3().setFromMatrixColumn(fitCam.matrixWorld, 0), up = new V3().setFromMatrixColumn(fitCam.matrixWorld, 1);
      const hw = d * Math.tan(RAD(fitCam.fov / 2));
      fitT.addScaledVector(right, (r.cx - mx) * hw * (W / H)).addScaledVector(up, (r.cy - my) * hw);
    }
  }
  fitCam.position.copy(fitT).addScaledVector(fitD, d);
  let far = 0;
  for (const [x, y, z] of P) far = Math.max(far, fitP.set(x, y, z).distanceTo(fitCam.position));
  /* no fog over the record: it begins past its far end */
  const fn = (far + 2) / d;
  const p = { x: fitT.x, y: fitT.y, z: fitT.z, dist: d, el, az, fn, ff: fn + 14 / d };
  endCache = { key, p };
  return { ...p };
}
function evalP(p) {
  const aspect = W / (H * (1 + 2 * vshift()));
  const tanH = Math.tan(RAD(cam.fov / 2));
  if (p.end) return endPose();
  const dist = Math.max(p.dist, (SM ? p.W * SQ() + 0.5 : p.W) / (tanH * aspect));
  return { x: p.x * SQ(), y: p.y, z: F.zN + p.zo, dist, el: p.el, az: p.az, fn: 0.8, ff: 2.6 };
}
function camAt() {
  let p = evalP(KEYS[0].p);
  for (let i = 1; i < KEYS.length; i++) {
    const K = KEYS[i], u = ramp(F.T, K.t - 0.1, K.t - 0.1 + K.dur);
    if (u <= 0) break;
    const q = evalP(K.p), e = eio(u);
    for (const k in p) p[k] = lerp(p[k], q[k], e);
  }
  /* the loop seam: while the end card fades out the camera glides back to the opening pose, so the restart has no cut */
  const back = eio(ramp(F.T, TOTAL - 0.75, TOTAL));
  if (back > 0) {
    const q = evalP(KEYS[0].p); q.z = zT(0) + KEYS[0].p.zo;
    for (const k in p) p[k] = lerp(p[k], q[k], back);
  }
  const amb = 1 - F.endK * 0.7;
  const az = THREE.MathUtils.degToRad(p.az + 1.3 * Math.sin(F.T * 0.23) * amb);
  const el = THREE.MathUtils.degToRad(p.el + 0.6 * Math.sin(F.T * 0.19 + 1) * amb);
  cam.position.set(p.x + p.dist * Math.sin(az) * Math.cos(el), p.y + p.dist * Math.sin(el), p.z + p.dist * Math.cos(az) * Math.cos(el));
  cam.lookAt(p.x, p.y, p.z);
  cam.updateMatrixWorld();   /* label fades project with this frame's camera */
  fogU.value.set(p.dist * p.fn, p.dist * p.ff);
  scene.fog.near = fogU.value.x; scene.fog.far = fogU.value.y;
}
function setView() {
  cam.aspect = W / H;
  cam.fov = SM ? 32 : 30;
  const k = vshift();
  cam.setViewOffset(W, H * (1 + 2 * k), 0, 0, W, H);
  cam.updateProjectionMatrix();
}

/* =====================================================================================
   CONTRACT
   ===================================================================================== */
export default {
  async init(ctx) {
    C = ctx.colors; W = Math.max(1, ctx.w); H = Math.max(1, ctx.h); SM = W < 560;
    let acc = 0;
    ctx.story.steps.forEach((s) => { ST[s.id] = { s: acc, d: s.dur, n: s.lines.length }; acc += s.dur; });
    TOTAL = acc; TEND = ST.end.s; TF = at('scale', 1, 0.5);

    if (!document.getElementById('ag-a-style')) {
      const st = document.createElement('style'); st.id = 'ag-a-style'; st.textContent = CSS; document.head.appendChild(st);
    }
    root = document.createElement('div'); root.className = 'ag-a-root' + (SM ? ' ag-a-sm' : '');
    ctx.host.appendChild(root);

    R = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    R.outputColorSpace = THREE.LinearSRGBColorSpace;
    R.setPixelRatio(Math.min(2, ctx.dpr || 1));
    R.setClearColor(0x000000, 0);
    R.setSize(W, H, false);
    root.appendChild(R.domElement);
    LR = new CSS2DRenderer();
    LR.domElement.className = 'ag-a-lay';
    LR.setSize(W, H);
    root.appendChild(LR.domElement);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xffffff, 8, 30);
    cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 400);
    setView();

    buildGround();
    buildStory();
    NODES.sort((a, b) => a.T - b.T).forEach((N, i) => { N.next = i + 1 < NODES.length ? NODES[i + 1].T : 1e9; });
    buildCamera();
    this.theme(C);
    this.resize(W, H);
  },

  frame(s) {
    const st = ST[s.stepId] || ST.meet;
    const T = st.s + clamp(s.stepT) * st.d;
    F.cont = s.dt > 0 && s.dt < 0.25 && T >= F.T && T - F.T < 0.3;   /* plain playback (not a seek or a freeze): chips may glide */
    F.dt = s.dt || 0;
    F.T = T; F.nT = Math.min(T, TF); F.zN = zT(F.nT); F.sm = SM;
    F.endK = eio(ramp(T, TEND + 0.1, TEND + 1.4));
    F.lab = 1 - ramp(T, TEND - 0.3, TEND + 0.15);   /* every label but the end card's keep list is gone before the crane */
    camAt();
    for (const f of ACT) f();
    updArcs();
    updNodes();
    for (const f of POST) f();
    fitLabels();
    /* the loop seam: settle out at the end card, in at the start */
    const ga = Math.min(ramp(T, 0, 0.45), 1 - ramp(T, TOTAL - 0.55, TOTAL));
    sty(R.domElement, 'opacity', ga.toFixed(3));
    sty(LR.domElement, 'opacity', ga.toFixed(3));
    R.render(scene, cam);
    LR.render(scene, cam);
  },

  resize(w, h) {
    W = Math.max(1, w); H = Math.max(1, h); SM = W < 560;
    root.classList.toggle('ag-a-sm', SM);
    scene.scale.x = SQ();
    LABELS.forEach((lb) => { lb.w = 0; });
    R.setSize(W, H, false);
    LR.setSize(W, H);
    setView();
    viewHU.value = H;
    lineMats.forEach((m) => m.resolution.set(W, H));
  },

  theme(colors) {
    C = colors; PAL = derive(colors);
    hooks.forEach((f) => f());
    if (scene) scene.fog.color.copy(PAL.surface);
  }
};
