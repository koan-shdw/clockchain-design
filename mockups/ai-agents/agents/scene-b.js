/* AI & Agents · Scene B · GLOBE
   The wireframe Earth from the site's hero is the stage: accent graticule, tilted north, slow spin,
   mono city tags with local time. Buyer agent in New York, provider agent in Dubai (both from the
   hero's CITIES list). Clockchain rides an orbit above them. The LEDGER is a ruler bent into a ring
   that orbits the globe and collects every anchored step as a ring node with a timestamp.
   Chapter 2: Agent Contract and Verification join Clockchain in orbit (the rules and proof layer);
   the Settlement provider is a point on the ground (London). Money only ever moves on the ground,
   so Clockchain and the contract visibly stay outside the money path.
   Everything is a pure function of the story clock s.t (no history), so seeks and ?t= stills are exact. */
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/* ------------------------------------------------------------------ helpers */
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const eio = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const eout = (x) => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
const lerp = (a, b, k) => a + (b - a) * k;
const fin = (t, a, d = 0.6) => sm((t - a) / d);
const win = (t, a, b, fi = 0.6, fo = 0.5) => fin(t, a, fi) * (1 - fin(t, b - fo, fo));
const prog = (t, a, d) => eio((t - a) / d);
const pad = (n, l = 2) => String(n).padStart(l, '0');

function ll(lat, lon) {
  const la = lat * D2R, lo = lon * D2R;
  return V(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo));
}
function slerp(a, b, u) {
  const d = clamp(a.dot(b), -1, 1), w = Math.acos(d), s = Math.sin(w);
  if (s < 1e-5) return a.clone();
  return a.clone().multiplyScalar(Math.sin((1 - u) * w) / s).add(b.clone().multiplyScalar(Math.sin(u * w) / s));
}
function qbez(p, c, q, s, out = V()) {
  const a = (1 - s) * (1 - s), b = 2 * s * (1 - s), d = s * s;
  return out.set(a * p.x + b * c.x + d * q.x, a * p.y + b * c.y + d * q.y, a * p.z + b * c.z + d * q.z);
}

/* ------------------------------------------------------------------ places (the hero's CITIES) */
const CITY = {
  ny: ['New York', 40.71, -74.01, 'America/New_York', -4],
  dubai: ['Dubai', 25.20, 55.27, 'Asia/Dubai', 4],
  london: ['London', 51.51, -0.13, 'Europe/London', 0],
  sao: ['São Paulo', -23.55, -46.63, 'America/Sao_Paulo', -3],
  mumbai: ['Mumbai', 19.08, 72.88, 'Asia/Kolkata', 5.5],
  ams: ['Amsterdam', 52.37, 4.90, 'Europe/Amsterdam', 1],
};
const DOTS = [[46.99, 6.93], [51.51, -0.13], [50.11, 8.68], [40.71, -74.01], [41.88, -87.63], [37.77, -122.42],
  [-23.55, -46.63], [25.20, 55.27], [19.08, 72.88], [1.35, 103.82], [22.32, 114.17], [35.68, 139.69],
  [-33.87, 151.21], [48.85, 2.35], [47.37, 8.54], [52.37, 4.90], [43.65, -79.38], [34.05, -118.24],
  [31.23, 121.47], [37.57, 126.98]];
const P0 = {}; for (const k in CITY) P0[k] = ll(CITY[k][1], CITY[k][2]);

const fmts = {};
function hm(key, ms) {
  const c = CITY[key];
  try {
    const f = fmts[c[3]] || (fmts[c[3]] = new Intl.DateTimeFormat('en-GB', { timeZone: c[3], hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }));
    return f.format(ms);
  } catch (e) {
    const d = new Date(ms + c[4] * 3600000); return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
  }
}
function stampHTML(ms) {
  const d = new Date(ms);
  return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) +
    '.<span class="ag-b-ms">' + pad(d.getUTCMilliseconds(), 3) + '</span>';
}

/* ------------------------------------------------------------------ fat lines (screen-space width, fades) */
const RES = new THREE.Vector2(1, 1);
const FAT_VS = `
uniform vec2 uRes; uniform float uWidth; uniform float uCap; uniform vec3 uCenter;
attribute vec3 aB; attribute vec2 aS; attribute vec2 aU;
varying float vU; varying float vF;
void main(){
  vec4 wa = modelMatrix * vec4(position, 1.0);
  vec4 wb = modelMatrix * vec4(aB, 1.0);
  vec4 ca = projectionMatrix * viewMatrix * wa;
  vec4 cb = projectionMatrix * viewMatrix * wb;
  vec2 sa = ca.xy / ca.w * uRes * 0.5, sb = cb.xy / cb.w * uRes * 0.5;
  vec2 d = sb - sa; float l = length(d); d = l > 1e-4 ? d / l : vec2(1.0, 0.0);
  vec2 n = vec2(-d.y, d.x);
  bool e = aS.y > 0.5;
  vec4 c = e ? cb : ca;
  vec2 off = n * aS.x * uWidth * 0.5 + d * (e ? 1.0 : -1.0) * uWidth * 0.5 * uCap;
  c.xy += off / (uRes * 0.5) * c.w;
  gl_Position = c;
  vec3 wp = e ? wb.xyz : wa.xyz;
  vU = e ? aU.y : aU.x;
  vF = dot(normalize(wp - uCenter), normalize(cameraPosition - wp));
}`;
const FAT_FS = `
uniform vec3 uColor; uniform float uAlpha; uniform vec2 uP; uniform vec4 uDash; uniform vec3 uFace;
varying float vU; varying float vF;
void main(){
  if (vU < uP.x || vU > uP.y) discard;
  float a = uAlpha * mix(uFace.z, 1.0, smoothstep(uFace.x, uFace.y, vF));
  if (uDash.x > 0.0 && uDash.x < 1.0) { if (fract(vU * uDash.w / uDash.y - uDash.z) > uDash.x) discard; }
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
}`;
const ALL = [];
class Fat {
  /* polys: array of point arrays (static), or a number = capacity of one dynamic polyline */
  constructor(polys, o = {}) {
    const dyn = typeof polys === 'number';
    const segs = dyn ? polys - 1 : polys.reduce((n, p) => n + Math.max(0, p.length - 1), 0);
    const g = new THREE.BufferGeometry();
    this.A = new Float32Array(segs * 12); this.B = new Float32Array(segs * 12); this.U = new Float32Array(segs * 8);
    const S = new Float32Array(segs * 8), I = new Uint32Array(segs * 6);
    for (let i = 0; i < segs; i++) {
      S.set([-1, 0, 1, 0, -1, 1, 1, 1], i * 8);
      const v = i * 4; I.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], i * 6);
    }
    g.setAttribute('position', new THREE.BufferAttribute(this.A, 3));
    g.setAttribute('aB', new THREE.BufferAttribute(this.B, 3));
    g.setAttribute('aS', new THREE.BufferAttribute(S, 2));
    g.setAttribute('aU', new THREE.BufferAttribute(this.U, 2));
    g.setIndex(new THREE.BufferAttribute(I, 1));
    this.g = g;
    this.m = new THREE.ShaderMaterial({
      vertexShader: FAT_VS, fragmentShader: FAT_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        uRes: { value: RES }, uWidth: { value: o.w || 1.25 }, uCap: { value: o.cap || 0 }, uCenter: { value: V() },
        uColor: { value: new THREE.Color() }, uAlpha: { value: 1 }, uP: { value: new THREE.Vector2(0, 1) },
        uDash: { value: new THREE.Vector4(0, 1, 0, 1) }, uFace: { value: new THREE.Vector3(-9, -8, 1) },
      },
    });
    this.u = this.m.uniforms;
    if (o.noDepth) this.m.depthTest = false;
    this.mesh = new THREE.Mesh(g, this.m);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = o.order || 2;
    this.role = o.role || 'accent';
    if (!dyn) this.fill(polys);
    else g.setDrawRange(0, 0);
    ALL.push(this);
  }
  fill(polys) {
    const A = this.A, B = this.B, U = this.U; let k = 0, maxL = 0;
    for (const p of polys) {
      const n = p.length; if (n < 2) continue;
      const cum = [0]; let L = 0;
      for (let i = 1; i < n; i++) { L += p[i].distanceTo(p[i - 1]); cum.push(L); }
      maxL = Math.max(maxL, L); const iL = 1 / (L || 1);
      for (let i = 0; i < n - 1; i++, k++) {
        const a = p[i], b = p[i + 1], ua = cum[i] * iL, ub = cum[i + 1] * iL;
        for (let j = 0; j < 4; j++) {
          const o3 = k * 12 + j * 3, o2 = k * 8 + j * 2;
          A[o3] = a.x; A[o3 + 1] = a.y; A[o3 + 2] = a.z;
          B[o3] = b.x; B[o3 + 1] = b.y; B[o3 + 2] = b.z;
          U[o2] = ua; U[o2 + 1] = ub;
        }
      }
    }
    this.len = maxL; this.u.uDash.value.w = maxL || 1;
    this.g.setDrawRange(0, k * 6);
    this.g.attributes.position.needsUpdate = true; this.g.attributes.aB.needsUpdate = true; this.g.attributes.aU.needsUpdate = true;
    return this;
  }
  /* one dynamic polyline; skipped when it will not be drawn (vis false) or when the points have not moved */
  set(pts, vis = true) {
    if (!vis) return this;
    const n = pts.length * 3; let L = this._last;
    if (L && this._n === n) {
      let same = true;
      for (let i = 0, j = 0; i < pts.length; i++, j += 3) {
        const p = pts[i];
        if (L[j] !== p.x || L[j + 1] !== p.y || L[j + 2] !== p.z) { same = false; break; }
      }
      if (same) return this;
    }
    if (!L || L.length < n) L = this._last = new Float64Array(Math.max(n, 6));
    for (let i = 0, j = 0; i < pts.length; i++, j += 3) { L[j] = pts[i].x; L[j + 1] = pts[i].y; L[j + 2] = pts[i].z; }
    this._n = n;
    return this.fill([pts]);
  }
  dispose() { this.g.dispose(); this.m.dispose(); const i = ALL.indexOf(this); if (i >= 0) ALL.splice(i, 1); }
  a(x) { this.u.uAlpha.value = x; this.mesh.visible = x > 0.003; return this; }
  p(a, b) { this.u.uP.value.set(a, b); return this; }
  dash(duty, period, off = 0) { this.u.uDash.value.set(duty, period, off, this.u.uDash.value.w); return this; }
  face(lo, hi, back) { this.u.uFace.value.set(lo, hi, back); return this; }
  w(px) { this.u.uWidth.value = px; return this; }
}

/* ------------------------------------------------------------------ layout (R units: 1 = globe radius on screen)
   A slot is [u, v] in R units from the globe centre, or { u, b } = centred at u, its bottom edge b px above the
   stage bottom (the band under the ledger ring on narrow stages). */
const WIDE = {
  gy: 0.585, rk: 0.33, rw: 0.165, el: 0.30, rr: 2.15, d: 17,
  cc: [0, 1.17], con: [-1.62, 0.98], ver: [1.62, 0.98],
  buyer: 'l', prov: 'ru', settle: 'd',
  /* signature, certificate and acceptance cards sit just under their own agent */
  cardB: [-1.15, 0.0], cardP: [1.15, -0.2],
  tiles: [[1.26, 0.85], [2.0, 0.85], [2.74, 0.85]], tileW: 100,
  terms: [0, -0.16], contract: [-2.55, 0.74], contractMini: null, rep: [2.62, 0.35], ledger: 'end',
  ccLab: 'ru', conLab: 'l', verLab: 'ru', rules: 'd', ms: 'rd', match: 'd',
  zoomHs: 1.05, zoomLk: 0.955, elLk: 0.035,
};
const PHONE = {
  gy: 0.64, rk: 0.2, rw: 0.206, el: 0.42, rr: 2.0, d: 17,
  cc: [0, 1.6], con: [-1.6, 1.3], ver: [1.6, 1.3],
  buyer: 'l', prov: 'r', settle: 'd',
  cardB: [-1.42, -0.98], cardP: [1.42, -0.98],
  tiles: [{ u: -1.5, b: 6 }, { u: 0, b: 6 }, { u: 1.5, b: 6 }], tileW: 98,
  terms: { u: 0, b: 10 }, contract: { u: 0, b: 7 }, contractMini: [-1.25, 1.28], rep: { u: 1.55, b: 12 }, ledger: 'left',
  ccLab: 'ru', conLab: 'u', verLab: 'd', rules: 'd', ms: 'd', match: 'l',
  zoomHs: 1.03, zoomLk: 0.975, elLk: 0.015,
};
/* provider candidates during discovery: the match (Dubai) plus three others, well apart on screen */
const CANDS = [[-8, 30], [-23.55, -46.63], [14, -17]];

/* ------------------------------------------------------------------ CSS (one style tag, .ag-b- prefix) */
const CSS = `
.ag-b-layer{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:1;font-family:var(--f-mono);color:var(--fg);
  --b-ink:color-mix(in oklab,var(--accent) 68%,black);
  --b-chip:color-mix(in oklab,var(--accent) 11%,var(--surface));
  --b-halo:0 0 1px var(--surface),0 0 2px var(--surface),0 0 3px var(--surface),0 0 5px var(--surface),0 0 8px var(--surface);
  --b-fs:11px;--b-fs2:10px;}
:root[data-variant="eclipse"] .ag-b-layer{--b-ink:var(--accent);--b-chip:color-mix(in oklab,var(--accent) 16%,var(--surface));}
:root[data-variant="eclipse"] .ag-b-lab small.ts{color:var(--fg-2);}
.ag-b-layer.is-phone{--b-fs:10px;--b-fs2:10px;}
.ag-b-pin{position:absolute;left:0;top:0;width:0;height:0;}
.ag-b-layer svg{max-width:none;}
.ag-b-pin > *{position:absolute;}
.ag-b-node{--s:16px;left:0;top:0;width:var(--s);height:var(--s);margin:calc(var(--s) / -2) 0 0 calc(var(--s) / -2);box-sizing:border-box;
  border-radius:50%;border:2.5px solid var(--accent);background:var(--surface);box-shadow:0 0 0 5px var(--accent-soft);
  display:grid;place-items:center;color:var(--b-ink);}
.ag-b-node.is-big{--s:22px;}
.ag-b-node.is-sm{--s:12px;border-width:2px;box-shadow:0 0 0 3px var(--accent-soft);}
.ag-b-node.is-ink{border-color:var(--fg);color:var(--fg);box-shadow:0 0 0 5px color-mix(in oklab,var(--fg) 7%,transparent);}
.ag-b-node.is-dim{border-color:var(--fg-3);box-shadow:none;}
.ag-b-node i{position:absolute;inset:0;display:grid;place-items:center;opacity:0;}
.ag-b-node.is-big::after{content:"";width:6px;height:6px;border-radius:50%;background:var(--accent);}
.ag-b-node svg{width:10px;height:10px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;}
.ag-b-pulse{left:0;top:0;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:1.5px solid var(--accent);opacity:0;box-sizing:border-box;}
.ag-b-dot{left:0;top:0;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;background:var(--accent);}
.ag-b-pk{left:0;top:0;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px var(--accent-soft);}
.ag-b-pk.is-ink{background:var(--fg);box-shadow:0 0 0 4px color-mix(in oklab,var(--fg) 10%,transparent);}
.ag-b-lab{font:500 var(--b-fs)/1.45 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--fg);white-space:nowrap;text-shadow:var(--b-halo);}
.ag-b-lab b{font-weight:500;}
.ag-b-lab small{display:block;font:500 var(--b-fs)/1.45 var(--f-mono);letter-spacing:.02em;text-transform:none;color:var(--b-ink);white-space:pre;overflow:hidden;}
.ag-b-lab .br{display:block;}
.ag-b-lab.is-k{color:var(--fg-2);font-size:var(--b-fs2);letter-spacing:.14em;}
.ag-b-tag{font:500 var(--b-fs)/1 var(--f-mono);color:var(--b-ink);white-space:pre;text-shadow:var(--b-halo);}
.ag-b-ms{color:var(--accent);}
.ag-b-chip{display:inline-flex;align-items:center;gap:6px;font:500 var(--b-fs2)/1 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;
  color:var(--b-ink);background:var(--b-chip);padding:6px 8px 6px 8px;border-radius:7px;white-space:nowrap;}
.ag-b-chip svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;flex:none;}
.ag-b-chip.is-ink{color:var(--surface);background:var(--fg);}
.ag-b-card{box-sizing:border-box;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 12px;
  box-shadow:var(--shadow);white-space:nowrap;font:500 var(--b-fs2)/1.4 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--fg-2);}
.ag-b-card .k{display:flex;align-items:center;gap:7px;color:var(--fg-2);}
.ag-b-card .k svg{width:12px;height:12px;fill:none;stroke:var(--b-ink);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;}
.ag-b-card .k b{color:var(--b-ink);font-weight:500;}
.ag-b-card .hx{margin-top:6px;letter-spacing:.04em;text-transform:none;color:var(--fg);font-size:var(--b-fs);}
.ag-b-card .ok{display:flex;align-items:center;gap:6px;margin-top:6px;color:var(--b-ink);}
.ag-b-card .ok svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;}
.ag-b-card.is-on{border-color:var(--accent-line);box-shadow:0 0 0 4px var(--accent-soft),var(--shadow);}
.ag-b-sig{display:block;width:92px;height:22px;margin-top:4px;fill:none;stroke:var(--fg);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}
.ag-b-bars{display:grid;gap:5px;margin-top:9px;}
.ag-b-bars i{display:block;height:4px;border-radius:2px;background:var(--line-2);}
.ag-b-bars i b{display:block;height:100%;border-radius:2px;background:var(--fg-3);}
.ag-b-card.is-on .ag-b-bars i b{background:var(--accent);}
.ag-b-tile{--dim:0;}
.ag-b-tile .k{color:color-mix(in oklab,var(--fg-3) calc(var(--dim) * 100%),var(--fg-2));}
.ag-b-tile .hx{color:color-mix(in oklab,var(--fg-3) calc(var(--dim) * 100%),var(--fg));}
.ag-b-tile .ag-b-bars i b{background:color-mix(in oklab,var(--line-2) calc(var(--dim) * 100%),var(--fg-3));}
.ag-b-tile.is-on .ag-b-bars i b{background:var(--accent);}
.ag-b-terms{display:flex;gap:4px;align-items:center;padding:7px 10px;border-radius:10px;background:var(--b-chip);
  font:500 var(--b-fs2)/1 var(--f-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--fg-3);white-space:nowrap;}
.ag-b-terms span{padding:4px 5px;border-radius:5px;}
.ag-b-terms em{font-style:normal;color:var(--fg-3);opacity:.7;}
.ag-b-ct{display:grid;grid-template-columns:auto 1px auto;gap:0 12px;margin-top:9px;}
.ag-b-ct > i{background:var(--line);}
.ag-b-ct div{display:grid;gap:5px;}
.ag-b-ct div span{display:block;}
.ag-b-ct .tx span{text-align:left;font:300 12.5px/1.25 var(--f-body);letter-spacing:0;text-transform:none;color:var(--fg);}
.ag-b-ct .cd span{font:500 var(--b-fs2)/1.25 var(--f-mono);letter-spacing:.04em;text-transform:none;color:var(--b-ink);}
.ag-b-ct .ft{grid-column:1/-1;display:flex;justify-content:space-between;margin-top:8px;color:var(--fg-3);}
.ag-b-lock{left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;display:grid;place-items:center;border-radius:6px;background:var(--surface);border:1px solid var(--line-2);color:var(--fg);}
.ag-b-lock svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;overflow:visible;}
.ag-b-ring{left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;transform:rotate(-90deg);opacity:0;}
.ag-b-scope{left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;opacity:0;}
.ag-b-scope circle{fill:none;stroke:var(--accent);stroke-width:1.4;stroke-dasharray:3 3.2;}
.ag-b-scope.is-solid circle{stroke-dasharray:none;stroke-width:1.8;}
.ag-b-layer.is-phone .ag-b-scope{width:40px;height:40px;margin:-20px 0 0 -20px;}
.ag-b-ring circle{fill:none;stroke:var(--accent);stroke-width:2.2;stroke-dasharray:1;stroke-linecap:round;}
.ag-b-ring circle.bg{stroke:var(--line-2);stroke-width:1.2;}
.ag-b-seg{display:flex;gap:4px;margin-top:8px;}
.ag-b-seg i{width:30px;height:6px;border-radius:3px;background:var(--line-2);overflow:hidden;}
.ag-b-layer.is-phone .ag-b-seg i{width:26px;}
.ag-b-seg i b{display:block;height:100%;width:0;background:var(--accent);}
.ag-b-seg + .lg{display:flex;justify-content:space-between;margin-top:5px;color:var(--fg-3);letter-spacing:.06em;}
.ag-b-layer.is-phone .ag-b-card{padding:7px 9px;border-radius:10px;}
.ag-b-layer.is-phone .ag-b-terms{flex-wrap:wrap;justify-content:center;width:300px;white-space:normal;row-gap:2px;padding:6px 8px;}
.ag-b-layer.is-phone .ag-b-sig{width:64px;height:16px;}
.ag-b-layer.is-phone .ag-b-ct{margin-top:6px;gap:0 10px;}
.ag-b-layer.is-phone .ag-b-ct div{gap:2px;}
.ag-b-layer.is-phone .ag-b-ct .tx span{font-size:11px;}
.ag-b-layer.is-phone .ag-b-ct .ft{margin-top:5px;}
.ag-b-layer.is-phone .ag-b-node{--s:14px;}
.ag-b-layer.is-phone .ag-b-node.is-big{--s:18px;}
.ag-b-layer.is-phone .ag-b-node.is-sm{--s:10px;}
`;

const ICON = {
  key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3.5M21 12v2.5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  doc: '<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9.5 12h6M9.5 15.5h6"/></svg>',
  seal: '<svg viewBox="0 0 24 24"><circle cx="12" cy="10" r="6"/><path d="M9 15.5L8 21l4-2 4 2-1-5.5"/><path d="M9.5 10l1.8 1.8 3.2-3.4"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path class="shk" d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
};
const SIG = '<svg class="ag-b-sig" viewBox="0 0 92 22"><path pathLength="1" d="M3 15c4-9 8-11 9-6s-3 10 1 9 6-12 10-11-2 11 2 10 5-7 8-6 1 6 4 6 6-9 9-9-1 8 3 8 7-5 10-5 3 4 6 4 8-3 12-4"/></svg>';

function h(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
/* place a child relative to its pin: c centre, l/r left/right, u/d above/below, ru/lu/rd/ld corners */
function place(el, side, gap = 12) {
  const key = side + gap; if (el._pl === key) return; el._pl = key;
  const s = el.style; s.left = s.right = s.top = s.bottom = ''; s.transform = ''; s.textAlign = '';
  const g1 = gap * 0.75, g2 = gap * 0.45;
  switch (side) {
    case 'c': s.left = '0'; s.top = '0'; s.transform = 'translate(-50%,-50%)'; s.textAlign = 'center'; s.transformOrigin = '0 0'; break;
    case 'l': s.right = gap + 'px'; s.top = '0'; s.transform = 'translateY(-50%)'; s.textAlign = 'right'; s.transformOrigin = 'calc(100% + ' + gap + 'px) 0'; break;
    case 'r': s.left = gap + 'px'; s.top = '0'; s.transform = 'translateY(-50%)'; s.transformOrigin = (-gap) + 'px 0'; break;
    case 'u': s.left = '0'; s.bottom = gap + 'px'; s.transform = 'translateX(-50%)'; s.textAlign = 'center'; s.transformOrigin = '0 calc(100% + ' + gap + 'px)'; break;
    case 'd': s.left = '0'; s.top = gap + 'px'; s.transform = 'translateX(-50%)'; s.textAlign = 'center'; s.transformOrigin = '0 ' + (-gap) + 'px'; break;
    case 'ru': s.left = g1 + 'px'; s.bottom = g2 + 'px'; s.transformOrigin = (-g1) + 'px calc(100% + ' + g2 + 'px)'; break;
    case 'lu': s.right = g1 + 'px'; s.bottom = g2 + 'px'; s.textAlign = 'right'; s.transformOrigin = 'calc(100% + ' + g1 + 'px) calc(100% + ' + g2 + 'px)'; break;
    case 'rd': s.left = g1 + 'px'; s.top = g2 + 'px'; s.transformOrigin = (-g1) + 'px ' + (-g2) + 'px'; break;
    case 'ld': s.right = g1 + 'px'; s.top = g2 + 'px'; s.textAlign = 'right'; s.transformOrigin = 'calc(100% + ' + g1 + 'px) ' + (-g2) + 'px'; break;
  }
}

/* ------------------------------------------------------------------ state */
let R3, scene, cam, css, layer, globe, ringG, fillMesh;
let W = 1, H = 1, LAY = WIDE, DCAM = 9, RPX = 145, EL = 0.3, RR = 2.2, PHONE_MODE = false, SMALL = false;
let R0 = 145, FOCAL = 1000, CAMZ = -1, CAME = -1;
let COL = null;
const SS = {}; let TOTAL = 71.5; const K = {}; const AN = [];
let base = 0, lastT = -1;
const pins = [];

function at(id, line = 0, f = 0) { const s = SS[id]; return s.s + s.d * (line + f) / s.n; }

function pin(cls = '', inner = '') {
  const el = h('div', 'ag-b-pin ' + cls, inner);
  const o = new CSS2DObject(el); o.visible = false; scene.add(o);
  const p = { o, el, q: (sel) => el.querySelector(sel) };
  pins.push(p); return p;
}
function show(p, pos, a) {
  if (pos) p.o.position.copy(pos);
  const v = a > 0.004; p.o.visible = v;
  if (v) { const s = String(Math.round(a * 1000) / 1000); if (p._a !== s) { p.el.style.opacity = s; p._a = s; } }
}
function setHTML(el, key, html) { if (el._k !== key) { el._k = key; el.innerHTML = html; } }
function setText(el, txt) { if (el._t !== txt) { el._t = txt; el.textContent = txt; } }
function sty(el, prop, val) { const k = '_s' + prop; if (el[k] !== val) { el[k] = val; el.style[prop] = val; } }

/* world helpers */
const RIGHT = V(1, 0, 0), UP = V(), FWD = V();
function vp(u, v, w = 0, out = V()) {
  const k = (DCAM - w) / DCAM;
  return out.copy(RIGHT).multiplyScalar(u * k).addScaledVector(UP, v * k).addScaledVector(FWD, w);
}
/* a slot from the layout -> world point at depth w (see the layout note) */
function slot(sp, w = 2.6, out = V(), hPx = 0) {
  if (Array.isArray(sp)) return vp(sp[0], sp[1], w, out);
  const v = -((H * (1 - LAY.gy)) - sp.b - hPx / 2) / RPX;
  return vp(sp.u, v, w, out);
}
/* the same point moved by (dx, dy) screen px (y down) at depth w */
function nudge(p, dx, dy, w = 2.6, out = V()) {
  const k = (DCAM - w) / DCAM;
  return out.copy(p).addScaledVector(RIGHT, dx / RPX * k).addScaledVector(UP, -dy / RPX * k);
}
function onGlobe(local, alt = 1, out = V()) { return out.copy(local).multiplyScalar(alt).applyMatrix4(globe.matrixWorld); }
function city(k, alt = 1, out = V()) { return onGlobe(P0[k], alt, out); }
const _f1 = V(), _f2 = V();
function facing(p) { _f1.copy(p).normalize(); _f2.copy(cam.position).sub(p).normalize(); return _f1.dot(_f2); }
function ringPt(a, out = V(), y = 0) { return out.set(RR * Math.sin(a), y, RR * Math.cos(a)); }
function ptsArr(n, out) { while (out.length < n) out.push(V()); out.length = n; return out; }

/* curve from a ground point up to a point in space: leaves the ground radially, arrives at Q from below */
const _r1 = V(), _r2 = V();
function rise(P, Q, n = 40, lift = 0.45, out = [], under = 0.3) {
  const L = P.distanceTo(Q);
  const C1 = _r1.copy(P).normalize().multiplyScalar(lift * L).add(P);
  const C2 = _r2.copy(Q).addScaledVector(UP, -under * L);
  ptsArr(n, out);
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1), a = (1 - s) ** 3, b = 3 * s * (1 - s) ** 2, c = 3 * s * s * (1 - s), d = s ** 3;
    out[i].set(a * P.x + b * C1.x + c * C2.x + d * Q.x, a * P.y + b * C1.y + c * C2.y + d * Q.y, a * P.z + b * C1.z + c * C2.z + d * Q.z);
  }
  return out;
}
/* gentle bow between two points in space, bowing toward the camera/up */
const _b1 = V();
function bow(P, Q, k = 0.15, n = 32, out = []) {
  const L = P.distanceTo(Q);
  const C = _b1.copy(P).add(Q).multiplyScalar(0.5).addScaledVector(UP, k * L).addScaledVector(FWD, k * 0.5 * L);
  ptsArr(n, out);
  for (let i = 0; i < n; i++) qbez(P, C, Q, i / (n - 1), out[i]);
  return out;
}
function along(pts, s, out = V()) {
  if (!pts.length) return out.set(0, 0, 0);
  const f = clamp(s) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f));
  if (pts.length < 2) return out.copy(pts[0]);
  return out.copy(pts[i]).lerp(pts[i + 1], f - i);
}
/* along by arc length */
function alongL(pts, s, out = V()) {
  let L = 0; const c = [0];
  for (let i = 1; i < pts.length; i++) { L += pts[i].distanceTo(pts[i - 1]); c.push(L); }
  const x = clamp(s) * L; let i = 1; while (i < c.length - 1 && c[i] < x) i++;
  const k = (x - c[i - 1]) / ((c[i] - c[i - 1]) || 1);
  return out.copy(pts[i - 1]).lerp(pts[i], clamp(k));
}

/* ------------------------------------------------------------------ geometry builders (globe-local) */
function arcLocal(A, B, n, alt) { const o = []; for (let i = 0; i <= n; i++) { const u = i / n; o.push(slerp(A, B, u).multiplyScalar(alt(u))); } return o; }
function stadium(A, B, d, nU = 56, nC = 18, alt = 1.004) {
  const n = A.clone().cross(B).normalize(), ab = A.dot(B);
  const TA = B.clone().sub(A.clone().multiplyScalar(ab)).normalize();
  const TB = A.clone().sub(B.clone().multiplyScalar(ab)).normalize().negate();
  const cd = Math.cos(d), sd = Math.sin(d), o = [];
  for (let i = 0; i <= nU; i++) o.push(slerp(A, B, i / nU).multiplyScalar(cd).addScaledVector(n, sd));
  for (let i = 1; i < nC; i++) { const f = Math.PI / 2 - Math.PI * i / nC; o.push(B.clone().multiplyScalar(cd).addScaledVector(n, sd * Math.sin(f)).addScaledVector(TB, sd * Math.cos(f))); }
  for (let i = nU; i >= 0; i--) o.push(slerp(A, B, i / nU).multiplyScalar(cd).addScaledVector(n, -sd));
  for (let i = 1; i <= nC; i++) { const f = -Math.PI / 2 + Math.PI * i / nC; o.push(A.clone().multiplyScalar(cd).addScaledVector(n, sd * Math.sin(f)).addScaledVector(TA, -sd * Math.cos(f))); }
  return o.map((p) => p.multiplyScalar(alt));
}
function stadiumFill(A, B, d, alt = 1.002) {
  const n = A.clone().cross(B).normalize(), ab = A.dot(B);
  const TA = B.clone().sub(A.clone().multiplyScalar(ab)).normalize();
  const TB = A.clone().sub(B.clone().multiplyScalar(ab)).normalize().negate();
  const pos = [], idx = [];
  const grid = (fn, nu, nv) => {
    const b0 = pos.length / 3;
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const p = fn(i / nu, j / nv).multiplyScalar(alt); pos.push(p.x, p.y, p.z); }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = b0 + i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  };
  grid((u, v) => { const s = (v * 2 - 1) * d; return slerp(A, B, u).multiplyScalar(Math.cos(s)).addScaledVector(n, Math.sin(s)); }, 48, 6);
  const cap = (C, T, sgn) => grid((u, v) => { const f = -Math.PI / 2 + Math.PI * u, r = d * v;
    return C.clone().multiplyScalar(Math.cos(r)).addScaledVector(n, Math.sin(r) * Math.sin(f)).addScaledVector(T, sgn * Math.sin(r) * Math.cos(f)); }, 16, 4);
  cap(A, TA, -1); cap(B, TB, 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return g;
}

/* ------------------------------------------------------------------ the scene objects */
let G = {}; // fat lines
let E = {}; // html pins

function buildLines() {
  /* graticule: 15 degree grid like the hero, faded toward the limb */
  const grat = [];
  for (let lon = -180; lon < 180; lon += 15) { const l = []; for (let lat = -90; lat <= 90; lat += 3) l.push(ll(lat, lon)); grat.push(l); }
  for (let lat = -75; lat <= 75; lat += 15) { const l = []; for (let lon = -180; lon <= 180; lon += 3) l.push(ll(lat, lon)); grat.push(l); }
  G.grat = new Fat(grat, { w: 1, order: 1 }).face(0.0, 0.55, 0);
  globe.add(G.grat.mesh);
  G.limb = new Fat(1 + 128, { w: 1, role: 'line2', order: 1 });
  scene.add(G.limb.mesh);

  const A = P0.ny, B = P0.dubai;
  /* session (join) */
  G.sess = new Fat([stadium(A, B, 11 * D2R)], { w: 1.25 }).face(-0.1, 0.25, 0);
  globe.add(G.sess.mesh);
  fillMesh = new THREE.Mesh(stadiumFill(A, B, 11 * D2R), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color() }, uAlpha: { value: 0 } },
    vertexShader: 'varying float vF; void main(){ vec4 w = modelMatrix*vec4(position,1.0); gl_Position = projectionMatrix*viewMatrix*w; vF = dot(normalize(w.xyz), normalize(cameraPosition-w.xyz)); }',
    fragmentShader: 'uniform vec3 uColor; uniform float uAlpha; varying float vF; void main(){ gl_FragColor = vec4(uColor, uAlpha*smoothstep(0.0,0.3,vF)); }',
  }));
  fillMesh.renderOrder = 1; globe.add(fillMesh);
  /* (the scope around each agent is a screen-space ring in the HTML layer, so both read the same at the limb) */

  /* bounded channel (handshake line 3): a lens of two arcs pinched at each agent */
  const ch = (sgn) => arcLocal(A, B, 72, (u) => 1.004 + 0.13 * Math.sin(Math.PI * u) + sgn * 0.03 * Math.pow(Math.sin(Math.PI * u), 0.55));
  G.chanA = new Fat([ch(1)], { w: 1.4 }); G.chanB = new Fat([ch(-1)], { w: 1.4 });
  G.chanPts = arcLocal(A, B, 72, (u) => 1.004 + 0.13 * Math.sin(Math.PI * u));
  /* the private session's top edge (label point) */
  { const top = slerp(A, B, 0.5).normalize(), n = A.clone().cross(B).normalize(); G.sessEdge = top.multiplyScalar(Math.cos(11 * D2R)).addScaledVector(n, Math.sin(11 * D2R)); }
  globe.add(G.chanA.mesh, G.chanB.mesh);

  /* negotiation arc */
  G.negPts = arcLocal(A, B, 72, (u) => 1.004 + 0.2 * Math.sin(Math.PI * u));
  G.neg = new Fat([G.negPts], { w: 1.25 });
  globe.add(G.neg.mesh);

  /* discovery scan lines from the buyer to each candidate */
  G.scan = [P0.dubai, ...CANDS.map(([la, lo]) => ll(la, lo))].map((c, i) => {
    const pts = arcLocal(A, c, 56, (u) => 1.004 + 0.07 * Math.sin(Math.PI * u));
    const f = new Fat([pts], { w: 1.1, role: i === 0 ? 'accent' : 'fg3' }); f.pts = pts; globe.add(f.mesh); return f;
  });

  /* money: on the ground only, ink */
  G.mon1Pts = arcLocal(A, P0.london, 56, (u) => 1.004 + 0.04 * Math.sin(Math.PI * u));
  G.mon2Pts = arcLocal(P0.london, B, 56, (u) => 1.004 + 0.04 * Math.sin(Math.PI * u));
  G.mon1 = new Fat([G.mon1Pts], { w: 1.75, role: 'fg' }); G.mon2 = new Fat([G.mon2Pts], { w: 1.75, role: 'fg' });
  globe.add(G.mon1.mesh, G.mon2.mesh);

  /* dynamic lines in world space */
  const dyn = (cap, o) => { const f = new Fat(cap, o); scene.add(f.mesh); return f; };
  G.inv1 = dyn(48, { w: 1.5 }); G.inv2 = dyn(48, { w: 1.5 });
  G.idB = dyn(2, { w: 1.25 }); G.idP = dyn(2, { w: 1.25 });
  G.plumb = dyn(2, { w: 1.25 });
  G.wit = dyn(2, { w: 1.1 });
  G.anc = dyn(32, { w: 1.25 });          // contract -> ledger
  G.ev = dyn(32, { w: 1.25 });           // verification -> ledger
  G.auth = dyn(40, { w: 1.25 });         // buyer -> contract
  G.cond = dyn(40, { w: 1.25 });         // contract -> settlement
  G.vset = dyn(40, { w: 1.25 });         // verification -> settlement
  G.pver = dyn(40, { w: 1.25 });         // provider -> verification
  G.orbit = dyn(64, { w: 1.1 });          // the rules layer orbit (contract - clockchain - verification)
  G.cv = dyn(64, { w: 1.5 });             // contract -> verification along the orbit
  G.tB = dyn(2, { w: 1, role: 'fg3', noDepth: true, order: 5 });  // tethers: card -> its agent
  G.tP = dyn(2, { w: 1, role: 'fg3', noDepth: true, order: 5 });

  /* the ledger ring: a ruler bent into an orbit */
  ringG = new THREE.Group(); scene.add(ringG);
  G.ring = new Fat(241, { w: 1.25, role: 'ring', order: 3 }).face(-0.3, 0.15, 0.14);
  scene.add(G.ring.mesh);
  G.trail = new Fat(129, { w: 2, order: 4 }).face(-0.25, 0.2, 0.25);
  ringG.add(G.trail.mesh);
}

function rebuildRing() {
  /* ring line in world space (not rotated) */
  const pts = []; for (let i = 0; i <= 240; i++) pts.push(ringPt(i / 240 * Math.PI * 2));
  G.ring.set(pts); G.ring.u.uCenter.value.set(0, 0, 0);
  /* ticks (rotate with the ledger): minor every 2.5 deg, major every 15 */
  if (G.ticksS) { ringG.remove(G.ticksS.mesh); G.ticksS.dispose(); }
  const tk = [];
  for (let i = 0; i < 144; i++) {
    const a = i * 2.5 * D2R, maj = i % 6 === 0, hh = (maj ? 0.06 : 0.026) * (PHONE_MODE ? 1.25 : 1);
    tk.push([ringPt(a, V(), -hh), ringPt(a, V(), hh)]);
  }
  G.ticksS = new Fat(tk, { w: 1, role: 'ring', order: 3 }).face(-0.3, 0.15, 0.08);
  ringG.add(G.ticksS.mesh);
  if (COL) applyTheme();
}

/* ------------------------------------------------------------------ HTML */
function agentPin(role, key, cls = '') {
  const p = pin('', '<i class="ag-b-pulse"></i><svg class="ag-b-ring" viewBox="0 0 34 34"><circle class="bg" cx="17" cy="17" r="15"/><circle class="fg" cx="17" cy="17" r="15" pathLength="1"/></svg>' +
    '<svg class="ag-b-scope" viewBox="0 0 46 46"><circle cx="23" cy="23" r="21.5"/></svg>' +
    '<i class="ag-b-node ' + cls + '"><i class="ic-key">' + ICON.key + '</i><i class="ic-ok">' + ICON.check + '</i></i>' +
    '<div class="ag-b-lab"><b>' + role + '</b><small></small></div><div class="ag-b-lab is-k ag-b-sclab">Scope</div>');
  p.lab = p.q('.ag-b-lab'); p.small = p.q('small'); p.node = p.q('.ag-b-node'); p.pulse = p.q('.ag-b-pulse');
  p.key = p.q('.ic-key'); p.ok = p.q('.ic-ok'); p.ring = p.q('.ag-b-ring'); p.ringFg = p.q('circle.fg'); p.city = key;
  p.scope = p.q('.ag-b-scope'); p.scLab = p.q('.ag-b-sclab');
  return p;
}
function nodePin(label, cls, kick) {
  const p = pin('', '<i class="ag-b-pulse"></i><i class="ag-b-node ' + cls + '"><i class="ic-ok">' + ICON.check + '</i></i>' +
    '<div class="ag-b-lab"><b>' + label + '</b>' + (kick ? '<small></small>' : '') + '</div>');
  p.lab = p.q('.ag-b-lab'); p.small = p.q('small'); p.node = p.q('.ag-b-node'); p.pulse = p.q('.ag-b-pulse'); p.ok = p.q('.ic-ok');
  return p;
}
function chipPin(html, cls = '') { const p = pin('', '<span class="ag-b-chip ' + cls + '">' + html + '</span>'); p.c = p.el.firstChild; place(p.c, 'c'); return p; }
function cardPin(html, cls = '') { const p = pin('', '<div class="ag-b-card ' + cls + '">' + html + '</div>'); p.c = p.el.firstChild; place(p.c, 'c'); return p; }

function buildHTML() {
  /* faint city dots for every hero city, plus two hero-style tags in chapter 1 */
  E.dots = DOTS.map(([la, lo]) => { const p = pin('', '<i class="ag-b-dot"></i>'); p.loc = ll(la, lo); return p; });
  E.amb = ['london', 'sao'].map((k) => { const p = pin('', '<span class="ag-b-tag"></span>'); p.c = p.el.firstChild; place(p.c, 'r', 7); p.city = k; return p; });

  E.buyer = agentPin('Buyer agent', 'ny');
  E.prov = agentPin('Provider agent', 'dubai');
  E.cc = nodePin('Clockchain', 'is-big');
  E.cc.lab.classList.add('is-cc');

  E.invite = chipPin('Invite');
  E.sessLab = pin('', '<div class="ag-b-lab is-k">Private session</div>'); place(E.sessLab.el.firstChild, 'u', 4);

  E.ledger = pin('', '<div class="ag-b-lab is-k" style="text-align:right">Ledger<span style="display:block;margin-top:5px"><span class="ag-b-chip">ERC-8004</span></span></div>');
  E.ledgerChip = E.ledger.q('.ag-b-chip').parentNode;
  E.idB = chipPin(ICON.check + 'Identity'); E.idP = chipPin(ICON.check + 'Identity');
  place(E.idB.c, 'u', 8); place(E.idP.c, 'u', 8);

  const sigCard = () => cardPin('<div class="k">' + ICON.key + '<span>Signature</span></div>' + SIG + '<div class="k" style="margin-top:4px;color:var(--fg-3)">Key · local</div>');
  E.sigB = sigCard(); E.sigP = sigCard();
  const certCard = () => cardPin('<div class="k">' + ICON.seal + '<b>Certificate</b></div><div class="hx">0x7f3a…c91e</div><div class="ok">' + ICON.check + 'Verified</div>');
  E.certB = certCard(); E.certP = certCard();
  E.pk = [0, 1, 2, 3, 4, 5, 6, 7].map(() => pin('', '<i class="ag-b-pk"></i>'));
  E.pkInk = [0, 1].map(() => pin('', '<i class="ag-b-pk is-ink"></i>'));
  E.pkInk[0].el.firstChild.style.background = 'var(--accent)';

  E.anchors = ['Handshake', 'Contract', 'M1', 'M2', 'M3', 'Project complete'].map((name) => {
    const p = pin('', '<i class="ag-b-pulse"></i><i class="ag-b-node is-sm"></i><div class="ag-b-lab is-k"><b>' + name + '</b><small class="ts"></small></div>');
    p.lab = p.q('.ag-b-lab'); p.ts = p.q('.ts'); p.pulse = p.q('.ag-b-pulse'); p.node = p.q('.ag-b-node'); p.side = '';
    return p;
  });

  E.chanLab = pin('', '<div class="ag-b-lab is-k">Channel</div>'); place(E.chanLab.el.firstChild, 'u', 6);
  E.witLab = pin('', '<div class="ag-b-lab is-k">Witness</div>'); place(E.witLab.el.firstChild, 'r', 8);
  E.flow = [0, 1, 2, 3].map(() => pin('', '<i class="ag-b-pk" style="width:6px;height:6px;margin:-3px 0 0 -3px;box-shadow:none"></i>'));

  E.cand = CANDS.map(([la, lo]) => {
    const p = pin('', '<i class="ag-b-pulse"></i><i class="ag-b-node is-sm is-dim"></i><div class="ag-b-lab is-k">Provider</div>');
    p.node = p.q('.ag-b-node'); p.pulse = p.q('.ag-b-pulse'); p.lab = p.q('.ag-b-lab'); p.loc = ll(la, lo); return p;
  });
  E.match = chipPin(ICON.check + 'Match');

  const tile = (name) => cardPin('<div class="k">Proposal</div><div class="hx">' + name + '</div><div class="ag-b-bars"><i><b></b></i><i><b></b></i><i><b></b></i></div>', 'ag-b-tile');
  E.tiles = ['Provider A', 'Provider B', 'Provider C'].map((n) => { const p = tile(n); p.bars = [...p.el.querySelectorAll('.ag-b-bars b')]; return p; });

  const TERMS = ['Scope', 'Milestones', 'Evidence', 'Pricing', 'Payment gates'];
  E.terms = pin('', '<div class="ag-b-terms">' + TERMS.map((x, i) => (i ? '<em>·</em>' : '') + '<span>' + x + '</span>').join('') + '</div>');
  E.terms.c = E.terms.el.firstChild; place(E.terms.c, 'c'); E.terms.spans = [...E.terms.el.querySelectorAll('span')];

  const HEX = ['0x4be1 7d20', '0x91c4 e2a0', '0xc93f 0a17', '0x15d8 b6e2', '0x8e40 2fa9'];
  E.contract = cardPin('<div class="k"><b>Agent contract</b></div><div class="ag-b-ct"><div class="tx">' + TERMS.map((x) => '<span>' + x + '</span>').join('') +
    '</div><i></i><div class="cd">' + HEX.map((x) => '<span>' + x + '</span>').join('') + '</div><div class="ft"><span>Text</span><span>Code</span></div></div>');
  E.contract.rows = [...E.contract.el.querySelectorAll('.tx span, .cd span')];

  const accCard = () => cardPin('<div class="k">' + ICON.seal + '<b>Acceptance</b></div><div class="hx">0x4be1…7d20</div><div class="ok">' + ICON.check + 'Signed</div>');
  E.accB = accCard(); E.accP = accCard();

  E.con = nodePin('Agent contract', '');
  E.rules = chipPin('Rules');
  E.ver = nodePin('Verification', '');
  E.settle = nodePin('Settlement <span class="br">provider</span>', 'is-ink', false);
  E.lock = pin('', '<i class="ag-b-lock">' + ICON.lock + '</i>'); E.lock.shk = E.lock.q('.shk');
  E.funds = chipPin('Funds', 'is-ink');
  E.money = pin('', '<div class="ag-b-lab is-k">Money</div>'); place(E.money.el.firstChild, 'u', 8);
  E.ms = chipPin('M1'); E.msTxt = E.ms.c;
  E.evid = chipPin(ICON.doc + 'Evidence');
  E.rep = cardPin('<div class="k"><b>Reputation</b></div><div class="ag-b-seg"><i><b></b></i><i><b></b></i><i><b></b></i></div><div class="lg"><span>M1</span><span>M2</span><span>M3</span></div>');
  E.rep.segs = [...E.rep.el.querySelectorAll('.ag-b-seg b')];
  E.cards = [E.sigB, E.sigP, E.certB, E.certP, ...E.tiles, E.terms, E.contract, E.accB, E.accP, E.rep, E.evid, E.funds];
}

/* card sizes in px (layout size, before any scale), read once per resize so placement needs no per-frame reads */
function measure() {
  for (const p of E.cards) {
    const d = p.el.style.display; p.el.style.display = '';
    const c = p.c || p.el.firstChild; p.w = c.offsetWidth; p.h = c.offsetHeight;
    p.el.style.display = d;
  }
}

/* label sides depend on layout */
function applyLayoutHTML() {
  const L = LAY;
  place(E.buyer.lab, L.buyer, 14); place(E.prov.lab, L.prov, 14);
  /* desktop: Clockchain and Verification labels sit above the orbit that leaves them to the right */
  place(E.cc.lab, L.ccLab, L.ccLab === 'ru' ? 20 : 16); place(E.con.lab, L.conLab, 13); const verSide = PHONE_MODE && !SMALL ? 'ru' : L.verLab;
  place(E.ver.lab, verSide, verSide === 'ru' ? 16 : 13);
  /* two lines under the node, low enough for the payment line to the provider to pass above it */
  place(E.settle.lab, L.settle, PHONE_MODE ? 13 : 17);
  /* scope labels sit inside the session band, on the side facing the other agent */
  /* phone: the band is too thin for text, so each label sits just under the band, beside its own ring */
  if (PHONE_MODE && SMALL) { place(E.buyer.scLab, 'rd', 34); place(E.prov.scLab, 'ld', 34); }
  else { place(E.buyer.scLab, 'r', 29); place(E.prov.scLab, 'l', 29); }
  place(E.ledger.el.firstChild, L.ledger === 'end' ? 'l' : L.ledger === 'left' ? 'r' : 'u', 12);
  E.cand.forEach((c) => place(c.lab, 'd', 9));
  E.tiles.forEach((p) => { p.c.style.width = L.tileW + 'px'; });
  place(E.rules.c, L.rules, PHONE_MODE ? 11 : 16);
  place(E.match.c, L.match, PHONE_MODE ? 14 : 16);
  place(E.ms.c, L.ms, PHONE_MODE ? 14 : 22);
  place(E.money.el.firstChild, 'u', 8);
  place(E.evid.c, PHONE_MODE ? 'd' : 'c', PHONE_MODE ? (SMALL ? 30 : 20) : 0);
}

/* ------------------------------------------------------------------ theme */
function applyTheme() {
  const c = COL; const dark = !!c.dark;
  const ringCol = new THREE.Color(c.fg3).lerp(new THREE.Color(dark ? c.fg2 : c.surface), dark ? 0.2 : 0.58);
  for (const f of ALL) {
    const col = f.role === 'accent' ? c.accent : f.role === 'fg' ? c.fg : f.role === 'fg3' ? c.fg3 : f.role === 'line2' ? c.line2 : null;
    if (col) f.u.uColor.value.set(col); else f.u.uColor.value.copy(ringCol);
  }
  fillMesh.material.uniforms.uColor.value.set(c.accent);
}

/* ------------------------------------------------------------------ choreography helpers */
const PULSED = new Set();
function pulse(p, t, t0, d = 0.8, big = 2.6) {
  const k = (t - t0) / d;
  if (!p._pk) p._pk = { o: 0, s: 1 };
  PULSED.add(p);
  if (k < 0 || k > 1) return;
  const o = (1 - k) * 0.9;
  if (o > p._pk.o) { p._pk.o = o; p._pk.s = 1 + (big - 1) * eout(k); }
}
function flushPulses() {
  for (const p of PULSED) {
    const o = p._pk.o; sty(p.pulse, 'opacity', String(Math.round(o * 1000) / 1000));
    if (o > 0) sty(p.pulse, 'transform', 'scale(' + p._pk.s.toFixed(3) + ')');
    p._pk.o = 0; p._pk.s = 1;
  }
}
function pop(t, t0, d = 0.35) { const k = clamp((t - t0) / d); return k <= 0 ? 0 : k >= 1 ? 1 : eout(k) * (1 + 0.12 * Math.sin(k * Math.PI)); }
function scaleEl(el, s) { sty(el, 'scale', s.toFixed(3)); }

/* ------------------------------------------------------------------ frame */
const _a = V(), _b = V(), _c = V(), _d = V(), _e = V(), _g = V(), _h = V(), _s = V();
const pts1 = [], pts2 = [], ptsA = [], ptsB = [], ptsC = [], ptsD = [];
const limbPts = [], trailPts = [], orbPts = [], cvPts = [];
const seg2 = [V(), V()], seg2b = [V(), V()], seg2c = [V(), V()], seg2d = [V(), V()], segT = [V(), V()];
const vB = V(), vP = V(), vCC = V(), vCon = V(), vVer = V(), vL0 = V(), vFront = V(), vCardB = V(), vCardP = V(), vCs = V(), vSrc = V(), vStart = V();
let CYC = [];

function svar(el, name, val) { const k = '_v' + name; if (el[k] !== val) { el[k] = val; el.style.setProperty(name, val); } }
function cls(el, name, on) { const k = '_c' + name; if (el[k] !== on) { el[k] = on; el.classList.toggle(name, on); } }
/* emphasis for a rule line: full during its own caption line(s), 30% outside them */
function em(t, ranges) { let m = 0; for (const r of ranges) m = Math.max(m, win(t, r[0], r[1], 0.4, 0.5)); return 0.3 + 0.7 * m; }
/* lock state: closed from a, open again at b */
function shut(t, a, b) { return prog(t, a, 0.2) * (1 - prog(t, b, 0.25)); }
/* screen px of a world point */
function spx(p, out) { _s.copy(p).project(cam); return out.set((_s.x + 1) * 0.5 * W, (1 - _s.y) * 0.5 * H, 0); }

/* hairline from a card to its agent, leaving the card edge that faces the agent */
const _tA = V(), _tC = V();
function tether(f, agent, card, cpos, sc, a) {
  if (!card || a <= 0.003) { f.a(0); return; }
  const w = (card.w || 120) * sc, hh = (card.h || 70) * sc;
  spx(agent, _tA); spx(cpos, _tC);
  const dx = _tA.x - _tC.x, dy = _tA.y - _tC.y;
  let ox, oy;
  if (Math.abs(dy) > hh / 2 + 4) { oy = Math.sign(dy) * hh / 2; ox = clamp(dx, -w / 2 + 12, w / 2 - 12); }
  else { ox = Math.sign(dx) * w / 2; oy = clamp(dy, -hh / 2 + 10, hh / 2 - 10); }
  segT[0].copy(agent); nudge(cpos, ox, oy, 2.6, segT[1]);
  f.set(segT).a(a);
}

/* camera: R and elevation for zoom z and extra elevation de (the globe keeps its tilt; the ledger ring opens) */
function applyCam(z, de) {
  CAMZ = z; CAME = de;
  EL = LAY.el + de; RPX = R0 * z;
  DCAM = Math.sqrt((FOCAL / RPX) ** 2 + 1);
  cam.position.set(0, DCAM * Math.sin(EL), DCAM * Math.cos(EL)); cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(true);
  UP.set(0, Math.cos(EL), -Math.sin(EL)); FWD.set(0, Math.sin(EL), Math.cos(EL));
}

function frame(s) {
  const t = s.t;
  /* wall clock for city tags and ledger stamps: rebased per loop, stable within it */
  if (lastT < 0 || t < lastT - 0.5 || (s.playing && Math.abs(Date.now() - t * 1000 - base) > 4000)) base = Date.now() - t * 1000;
  lastT = t;
  const now = base + t * 1000;
  const dark = !!COL.dark, NARROW = PHONE_MODE, TINY = SMALL;
  const C = CYC;

  /* ---- camera: a slow push-in on the agents for the handshake, a pull-out with a little more elevation once the
     rules layer is in orbit, then a settle back to the opening framing for the end card (the loop seam) ---- */
  {
    const push = win(t, K.hs0 - 0.6, K.al0 + 0.4, 1.8, 1.8);
    const wide = fin(t, K.ag1 + 2.2, 2.2) * (1 - eio((t - K.end) / (TOTAL - K.end - 0.25)));
    const z = 1 + (LAY.zoomHs - 1) * push + (LAY.zoomLk - 1) * wide, de = LAY.elLk * wide;
    if (Math.abs(z - CAMZ) > 1e-5 || Math.abs(de - CAME) > 1e-6) applyCam(z, de);
  }

  /* slow spin (periodic over the loop so the seam is seamless), tilted north like the hero */
  const spin = (-2.0 + 4.5 * Math.sin((t / TOTAL) * Math.PI * 2)) * D2R;
  globe.rotation.set(0.42 - EL, spin, 0); globe.updateMatrixWorld(true);

  const outro = 1 - fin(t, TOTAL - 0.8, 0.7);
  let centreBusy = 0, bandBusy = 0;   // narrow stages: cards in the band under the ring (hide the ledger labels they would cover)
  let tBa = 0, tBc = null, tBp = null, tPa = 0, tPc = null, tPp = null;
  const offer = (side, a, card, pos) => {
    if (side === 0) { if (a > tBa) { tBa = a; tBc = card; tBp = pos; } } else if (a > tPa) { tPa = a; tPc = card; tPp = pos; }
  };

  /* ---- globe ---- */
  G.grat.a(dark ? 0.26 : 0.3);
  /* limb: a precise hairline silhouette */
  {
    const d = DCAM, r = Math.sqrt(1 - 1 / (d * d)), off = 1 / d;
    const ctr = _a.copy(cam.position).normalize().multiplyScalar(off);
    ptsArr(129, limbPts);
    for (let i = 0; i <= 128; i++) { const f = i / 128 * Math.PI * 2; limbPts[i].copy(ctr).addScaledVector(RIGHT, r * Math.cos(f)).addScaledVector(UP, r * Math.sin(f)); }
    G.limb.set(limbPts).a(dark ? 0.65 : 0.75);
  }
  for (const p of E.dots) { onGlobe(p.loc, 1.0, _a); const f = facing(_a); show(p, _a, sm((f - 0.15) / 0.35) * 0.55); }
  E.amb.forEach((p, i) => {
    city(p.city, 1, _a); const f = facing(_a);
    const a = win(t, 1.1 + i * 0.25, K.join + 0.5) * sm((f - 0.2) / 0.3) * 0.75;
    if (a > 0.004) setText(p.c, CITY[p.city][0] + '  ' + hm(p.city, now));
    show(p, _a, a);
  });

  /* ---- agents + clockchain ---- */
  const B = city('ny', 1, vB), P = city('dubai', 1, vP);
  const CC = vp(LAY.cc[0], LAY.cc[1], 1, vCC);
  const aB = fin(t, 0.15, 0.7) * outro, aP = fin(t, 0.45, 0.7) * outro;
  setText(E.buyer.small, 'New York  ' + hm('ny', now));
  setText(E.prov.small, 'Dubai  ' + hm('dubai', now));
  /* phone: the city lines step aside in chapter 2 so the label stacks stay short; they stay away through the
     end card (the ledger labels rise to the agents there) and return with the next loop, under the outro fade */
  {
    const thin = TINY ? fin(t, K.al0 + 0.2, 0.6) : 0;
    for (const p of [E.buyer, E.prov]) { sty(p.small, 'maxHeight', ((1 - thin) * 17).toFixed(2) + 'px'); sty(p.small, 'opacity', (1 - thin).toFixed(3)); }
  }
  /* during discovery the provider is one candidate among several, until it matches */
  const provDim = 1 - 0.55 * win(t, K.al0 + 0.25, K.al0 + 1.15, 0.3, 0.35);
  show(E.buyer, B, aB); show(E.prov, P, aP);
  sty(E.prov.lab, 'opacity', provDim.toFixed(3));
  show(E.cc, CC, fin(t, 0.8, 0.7) * outro);

  /* node icons: check after identity verify, key while signing locally */
  const keyOn = win(t, K.hs0 + 0.25, K.hs1 + 0.35, 0.35, 0.35);
  const idOn = win(t, K.ver + 2.45, K.hs0 + 0.3, 0.3, 0.3);
  sty(E.buyer.key, 'opacity', keyOn.toFixed(3)); sty(E.prov.key, 'opacity', keyOn.toFixed(3));
  const authOn = win(t, K.lk0 + 0.95, K.lk1 + 0.2, 0.3, 0.4);
  sty(E.buyer.ok, 'opacity', Math.max(idOn, authOn).toFixed(3)); sty(E.prov.ok, 'opacity', idOn.toFixed(3));

  /* ================= INVITE ================= */
  {
    const i0 = K.inv;
    rise(B, CC, 48, 0.35, pts1, 0.45);
    rise(P, CC, 48, 0.35, pts2, 0.45); pts2.reverse();
    const ip1 = prog(t, i0 + 0.25, 0.9), ip2 = prog(t, i0 + 1.45, 1.15);
    const ia = win(t, i0 + 0.4, K.join + 0.7, 0.25, 0.7) * outro * (1 - 0.45 * fin(t, i0 + 3.6, 0.6));
    G.inv1.set(pts1, ia > 0.003).p(0, ip1).a(ia);
    G.inv2.set(pts2, ia > 0.003).p(0, ip2).a(ia);
    /* Clockchain takes the invite in and sends it on; the chip hands over before it reaches the provider node */
    const leg2 = t >= i0 + 1.3;
    const pos = leg2 ? alongL(pts2, Math.min(ip2, 0.86), _a) : alongL(pts1, ip1, _a);
    const through = 1 - win(t, i0 + 1.1, i0 + 1.55, 0.1, 0.12);
    const land = leg2 ? 1 - sm((ip2 - 0.62) / 0.22) : 1;
    show(E.invite, pos, fin(t, i0 + 0.1, 0.3) * through * land * outro);
    scaleEl(E.invite.c, (0.85 + 0.15 * pop(t, i0 + 0.1, 0.4)) * (0.6 + 0.4 * through));
    pulse(E.buyer, t, i0 + 0.2); pulse(E.cc, t, i0 + 1.2, 0.8, 2.8); pulse(E.prov, t, i0 + 2.6, 0.8, 2.8);
  }

  /* ================= JOIN ================= */
  const j0 = K.join;
  {
    const sessA = win(t, j0 + 0.05, K.al0 + 0.7, 0.5, 0.7) * outro;
    const grow = prog(t, j0 + 0.05, 1.0);
    if (Math.abs((G.sess._g ?? -1) - grow) > 1e-3) {
      const d = Math.max(0.0005, 11 * D2R * grow);
      G.sess.fill([stadium(P0.ny, P0.dubai, d)]);
      fillMesh.geometry.dispose(); fillMesh.geometry = stadiumFill(P0.ny, P0.dubai, d);
      G.sess._g = grow;
    }
    const hsDim = 1 - 0.55 * fin(t, K.ver, 0.6);
    G.sess.a(sessA * 0.8 * hsDim);
    fillMesh.material.uniforms.uAlpha.value = sessA * (dark ? 0.09 : 0.065) * (0.6 + 0.4 * hsDim);
    fillMesh.visible = sessA > 0.003;
    show(E.sessLab, onGlobe(G.sessEdge, 1.004, _a), win(t, j0 + 0.6, K.ver + 0.6, 0.5, 0.5) * outro);
    /* scoped permissions: a screen-space ring around each agent (dashed; solid while it signs locally) */
    const scopeA = win(t, j0 + 0.7, K.al0 + 0.6, 0.35, 0.6) * outro;
    const solid = win(t, K.hs0 + 0.1, K.hs1 + 0.4, 0.4, 0.5);
    const g2 = eout((t - j0 - 0.7) / 0.7);
    const op = (scopeA * (0.85 + 0.15 * solid) * (1 - 0.4 * fin(t, K.hs1 + 0.3, 0.5))).toFixed(3);
    const lbA = (win(t, j0 + 1.3, K.ver + 0.4, 0.4, 0.4) * outro).toFixed(3);
    for (const p of [E.buyer, E.prov]) {
      sty(p.scope, 'opacity', op); sty(p.scope, 'scale', (0.5 + 0.5 * g2).toFixed(3));
      cls(p.scope, 'is-solid', solid > 0.5);
      sty(p.scLab, 'opacity', lbA);
    }
  }

  /* ================= VERIFY: the ledger ring ================= */
  const v0 = K.ver;
  const ringIn = eout((t - v0) / 1.1);
  const ringA = (t < v0 ? 0 : 1) * outro;
  const rs = lerp(0.62, 1, ringIn);
  G.ring.mesh.scale.setScalar(rs); G.ring.a(ringA * ringIn);
  ringG.scale.setScalar(rs);
  /* ratchet: newest anchor always lands at the front ("now"); the record slides left; the end card centres it */
  const AD = LAY.d * D2R;
  let psi = 0;
  for (let k = 1; k < AN.length; k++) psi -= AD * prog(t, AN[k] - 0.95, 0.7);
  psi += 2.5 * AD * prog(t, K.end + 0.05, 1.3);
  ringG.rotation.y = psi;
  G.ticksS.a(ringA * fin(t, v0 + 0.35, 0.8));
  /* green trail: from the first anchor to the newest (the Use cases ruler's green fill, running) */
  {
    let n = 0; for (let k = 0; k < AN.length; k++) if (t >= AN[k]) n = k;
    const grow2 = n >= 1 ? prog(t, AN[n] - 0.15, 0.5) : 1;
    const end = (n - 1) * AD + grow2 * AD;
    const ta = t >= AN[0] && n >= 1 ? ringA : 0;
    ptsArr(129, trailPts);
    for (let i = 0; i <= 128; i++) ringPt(end * i / 128, trailPts[i], 0);
    G.trail.set(trailPts, ta > 0.003).a(ta);
  }
  /* LEDGER label */
  show(E.ledger, ringPt(-Math.PI / 2, _a).multiplyScalar(rs), fin(t, v0 + 0.5, 0.6) * outro);
  sty(E.ledgerChip, 'opacity', win(t, v0 + 0.8, K.al0 + 0.6, 0.4, 0.6).toFixed(3));
  /* identity checks: a line from each agent down to the ledger */
  {
    const aimB = Math.asin(clamp(B.x / RR, -0.9, 0.9)), aimP = Math.asin(clamp(P.x / RR, -0.9, 0.9));
    const rb = ringPt(aimB, _b), rp = ringPt(aimP, _c);
    const la = win(t, v0 + 0.75, K.hs0 + 0.5, 0.2, 0.5) * outro;
    seg2[0].copy(B).multiplyScalar(1.01); seg2[1].copy(rb);
    seg2b[0].copy(P).multiplyScalar(1.01); seg2b[1].copy(rp);
    G.idB.set(seg2, la > 0.003).p(0, prog(t, v0 + 0.8, 0.6)).a(la);
    G.idP.set(seg2b, la > 0.003).p(0, prog(t, v0 + 0.95, 0.6)).a(la);
    const cB = win(t, v0 + 1.4, K.hs0 + 0.5, 0.01, 0.5), cP = win(t, v0 + 1.6, K.hs0 + 0.5, 0.01, 0.5);
    show(E.idB, rb, cB * outro); scaleEl(E.idB.c, pop(t, v0 + 1.4));
    show(E.idP, rp, cP * outro); scaleEl(E.idP.c, pop(t, v0 + 1.6));
  }
  pulse(E.buyer, t, v0 + 1.45, 0.7, 2.2); pulse(E.prov, t, v0 + 1.65, 0.7, 2.2);

  /* ================= HANDSHAKE ================= */
  const cardB = slot(LAY.cardB, 2.6, vCardB), cardP = slot(LAY.cardP, 2.6, vCardP);
  /* line 0: each agent signs on its own machine (the key never leaves the scope ring) */
  {
    const a = win(t, K.hs0 + 0.3, K.hs1 + 0.45, 0.45, 0.4) * outro;
    show(E.sigB, cardB, a); show(E.sigP, cardP, a);
    const sp = (1 - prog(t, K.hs0 + 0.75, 1.3)).toFixed(3);
    for (const c of [E.sigB, E.sigP]) { const path = c.path || (c.path = c.q('path')); sty(path, 'strokeDasharray', '1'); sty(path, 'strokeDashoffset', sp); }
    offer(0, a, E.sigB, cardB); offer(1, a, E.sigP, cardP);
    if (NARROW) bandBusy = Math.max(bandBusy, a);
  }
  /* line 1: only the signatures go up (from the signature line, away from KEY · LOCAL); the same certificate comes back to both */
  {
    const up = prog(t, K.hs1 + 0.05, 0.55), dn = prog(t, K.hs1 + 0.7, 0.65);
    nudge(cardB, 0, -(E.sigB.h || 70) / 2 + 4, 2.6, _g); nudge(cardP, 0, -(E.sigP.h || 70) / 2 + 4, 2.6, _h);
    rise(_g, CC, 24, 0.2, pts1); rise(_h, CC, 24, 0.2, pts2);
    const pa = win(t, K.hs1 + 0.05, K.hs1 + 0.65, 0.12, 0.12) * outro;
    show(E.pk[0], alongL(pts1, up, _a), pa);
    show(E.pk[1], alongL(pts2, up, _b), pa);
    pulse(E.cc, t, K.hs1 + 0.6, 0.7, 2.6);
    const ca = win(t, K.hs1 + 0.7, K.hs3 + 0.75, 0.2, 0.5) * outro;
    show(E.certB, _c.copy(CC).lerp(cardB, dn), ca); show(E.certP, _d.copy(CC).lerp(cardP, dn), ca);
    const sc = (0.55 + 0.45 * dn).toFixed(3); sty(E.certB.c, 'scale', sc); sty(E.certP.c, 'scale', sc);
    const twin = win(t, K.hs1 + 1.45, K.hs2 + 0.6, 0.2, 0.5) > 0.5;
    cls(E.certB.c, 'is-on', twin); cls(E.certP.c, 'is-on', twin);
    const tA = ca * sm((dn - 0.75) / 0.25);
    offer(0, tA, E.certB, cardB); offer(1, tA, E.certP, cardP);
    if (NARROW) bandBusy = Math.max(bandBusy, ca);
  }
  /* line 2: the outcome is anchored to the ledger with a timestamp */
  const front = ringPt(0, vFront);
  {
    const pa = win(t, K.hs2 + 0.05, K.hs3 + 0.45, 0.2, 0.45) * outro;
    seg2c[0].copy(CC); seg2c[1].copy(front);
    G.plumb.set(seg2c, pa > 0.003).p(0, prog(t, K.hs2 + 0.05, 0.5)).a(pa);
  }
  /* line 3: a witnessed, bounded channel opens between the two agents */
  {
    const a = win(t, K.hs3 + 0.0, K.al0 + 0.7, 0.25, 0.6) * outro, cp = prog(t, K.hs3 + 0.0, 0.75);
    G.chanA.p(0, cp).a(a * 0.95); G.chanB.p(0, cp).a(a * 0.95);
    const apex = onGlobe(G.chanPts[36], 1.03, _g);
    const wa = win(t, K.hs3 + 0.25, K.al0 + 0.6, 0.15, 0.5) * outro * 0.9;
    seg2d[0].copy(CC); seg2d[1].copy(apex);
    G.wit.set(seg2d, wa > 0.003).p(0, prog(t, K.hs3 + 0.3, 0.45)).dash(0.5, 0.045, t * 1.2).a(wa);
    const lb = win(t, K.hs3 + 0.4, K.al0 + 0.55, 0.3, 0.45) * outro;
    onGlobe(G.chanPts[20], 1.0, _a); show(E.chanLab, _a, lb);
    show(E.witLab, _b.copy(CC).lerp(apex, 0.45), lb);
    const fa = win(t, K.hs3 + 0.6, K.al0 + 0.5, 0.3, 0.4) * outro;
    E.flow.forEach((p, i) => {
      const dir = i % 2 ? -1 : 1; let u = ((t - K.hs3) * 0.42 + i * 0.25) % 1; if (dir < 0) u = 1 - u;
      onGlobe(along(G.chanPts, u, _a), 1, _a);
      show(p, _a, fa * sm(Math.min(u, 1 - u) / 0.08));
    });
  }

  /* ================= ALIGN ================= */
  /* line 0: discovery. Several provider agents, well apart; one matches */
  {
    const a0 = K.al0;
    E.cand.forEach((p, i) => {
      onGlobe(p.loc, 1, _a);
      const out = i === 2 ? a0 + 2.6 : K.al2 + 0.55;
      const a = win(t, a0 + 0.45 + i * 0.12, out, 0.4, 0.45) * outro * sm((facing(_a) - 0.1) / 0.25);
      show(p, _a, a);
      /* a small PROVIDER kicker on each (phones keep just the rings and the grey scan lines) */
      sty(p.lab, 'opacity', (TINY ? 0 : win(t, a0 + 0.6 + i * 0.12, Math.min(out, K.al1 + 0.5), 0.4, 0.4)).toFixed(3));
      pulse(p, t, a0 + 1.55 + i * 0.1, 0.6, 2.2);
    });
    pulse(E.prov, t, a0 + 1.05, 0.8, 2.8);
    G.scan.forEach((f, i) => {
      const end = i === 3 ? a0 + 2.55 : i === 0 ? K.al1 + 0.6 : K.al1 + 0.3;
      const sa = win(t, a0 + 0.4, end, 0.2, 0.45) * outro * (i === 0 ? 1 : dark ? 0.95 : 0.7);
      f.p(0, prog(t, a0 + 0.45 + i * 0.08, 0.6)).dash(0.55, 0.03, (t - a0) * 2.2).a(sa);
      if (i === 0) { const on = fin(t, a0 + 1.0, 0.3); f.dash(on > 0.5 ? 1 : 0.55, 0.03, (t - a0) * 2.2).w(1.1 + 0.4 * on); }
    });
    show(E.match, P, win(t, a0 + 1.05, K.al2 + 0.4, 0.25, 0.4) * outro);
    scaleEl(E.match.c, pop(t, a0 + 1.05));
  }
  /* line 1: proposals, side by side */
  {
    const a1 = K.al1;
    E.tiles.forEach((p, i) => {
      const k = prog(t, a1 + 0.1 + i * 0.16, 0.95);
      onGlobe(i === 0 ? P0.dubai : E.cand[i - 1].loc, 1, _a);
      const sl = slot(LAY.tiles[i], 2.6, _b, p.h || 70);
      const ta = win(t, a1 + 0.1 + i * 0.16, K.al2 + 0.55, 0.3, 0.45) * outro;
      show(p, _c.copy(_a).lerp(sl, k), ta);
      if (NARROW) centreBusy = Math.max(centreBusy, ta * sm((k - 0.3) / 0.4));
      sty(p.c, 'scale', (0.5 + 0.5 * k).toFixed(3));
      const cmp = prog(t, a1 + 0.6 + i * 0.1, 0.6);
      const L = [[0.92, 0.7, 0.84], [0.62, 0.86, 0.48], [0.74, 0.5, 0.66]][i];
      p.bars.forEach((b, j) => sty(b, 'width', (L[j] * cmp * 100).toFixed(1) + '%'));
      cls(p.c, 'is-on', i === 0 && t > a1 + 1.45);
      /* the others step back: their contents dim, the card itself stays opaque */
      svar(p.c, '--dim', (i === 0 ? 0 : 0.85 * fin(t, a1 + 1.45, 0.4)).toFixed(3));
    });
  }
  /* the contract slot (terms fly there; the contract card forms there) */
  const cBase = TINY ? 0.85 : 1;
  const cslot = slot(LAY.contract, 2.6, vCs, (E.contract.h || 150) * cBase);
  /* line 2: negotiation, terms go back and forth */
  {
    const a2 = K.al2;
    const na = win(t, a2 + 0.15, K.ag0 + 0.55, 0.4, 0.45) * outro;
    G.neg.dash(0.5, 0.03, 0).a(na * 0.75);
    for (let i = 0; i < 2; i++) {
      const ph = ((t - a2 - 0.3) / 1.05 + i * 0.5); const tri = Math.abs(((ph % 2) + 2) % 2 - 1); // 0..1..0
      const u = i ? 1 - tri : tri;
      onGlobe(along(G.negPts, u, _a), 1, _a);
      show(E.pk[2 + i], _a, na * fin(t, a2 + 0.3, 0.3) * (1 - fin(t, K.ag0 - 0.2, 0.3)));
    }
    const tA = win(t, a2 + 0.25, K.ag0 + 0.75, 0.4, 0.45) * outro;
    const sl = slot(LAY.terms, 2.6, _a, E.terms.h || 40);
    const fly = prog(t, K.ag0 + 0.05, 0.7);
    show(E.terms, _c.copy(sl).lerp(cslot, fly), tA);
    if (NARROW) centreBusy = Math.max(centreBusy, tA);
    sty(E.terms.c, 'scale', (1 - 0.3 * fly).toFixed(3));
    E.terms.spans.forEach((sp, i) => {
      const tt = a2 + 0.75 + i * 0.4;
      const active = t > tt - 0.35 && t < tt + 0.05, done = t >= tt + 0.05;
      sty(sp, 'color', done ? 'var(--b-ink)' : active ? 'var(--fg)' : '');
      sty(sp, 'background', active ? 'var(--surface)' : '');
    });
  }

  /* ================= AGREE ================= */
  const conPos = vp(LAY.con[0], LAY.con[1], 1, vCon);
  const verPos = vp(LAY.ver[0], LAY.ver[1], 1, vVer);
  {
    const g0 = K.ag0;
    /* narrow stages: the card forms in the band under the ring, then steps up beside the orbit so the ledger front is free */
    const miniK = LAY.contractMini ? prog(t, K.ag1 - 0.05, 0.6) : 0;
    const base0 = _g.copy(cslot);
    if (miniK > 0) base0.lerp(vp(LAY.contractMini[0], LAY.contractMini[1], 2.6, _a), miniK);
    const collapse = prog(t, K.ag1 + 2.3, 0.55);
    const ca = fin(t, g0 + 0.35, 0.45) * (1 - fin(t, K.ag1 + 2.35, 0.35)) * outro;
    const cs = lerp(0.85, 1, fin(t, g0 + 0.35, 0.5)) * cBase * lerp(1, 0.6, miniK) * (1 - 0.75 * collapse);
    const cpos = _b.copy(base0).lerp(conPos, collapse);
    show(E.contract, cpos, ca);
    sty(E.contract.c, 'scale', cs.toFixed(3));
    if (NARROW) centreBusy = Math.max(centreBusy, ca * (1 - miniK));
    E.contract.rows.forEach((r, i) => {
      const tt = i < 5 ? g0 + 0.55 + i * 0.1 : g0 + 1.25 + (i - 5) * 0.12;
      sty(r, 'opacity', fin(t, tt, 0.3).toFixed(3));
    });
    /* line 1: anchored to the ledger from the card's lower edge (drawn and gone before the certificates move) */
    const cw = (E.contract.w || 200) * cs, chh = (E.contract.h || 150) * cs;
    if (miniK > 0.5) nudge(cpos, cw / 2, 0, 2.6, vSrc); else nudge(cpos, cw * 0.3, chh / 2, 2.6, vSrc);
    bow(vSrc, front, 0.08, 32, ptsA);
    const ancA = win(t, K.ag1 + 0.4, K.ag1 + 1.4, 0.15, 0.3) * outro;
    G.anc.set(ptsA, ancA > 0.003).p(0, prog(t, K.ag1 + 0.45, 0.5)).a(ancA);
    /* both sides get a signed acceptance certificate: they start beside the contract card, never under it */
    const go = prog(t, K.ag1 + 1.25, 0.8);
    const aa = win(t, K.ag1 + 1.2, K.lk0 + 0.6, 0.25, 0.5) * outro;
    /* desktop: from beside the card's lower corner, so the flight passes under the buyer's label;
       narrow stages (card parked small at the top): out of the contract's ledger anchor, splitting along the band */
    if (miniK > 0.5) vStart.copy(cardB).lerp(cardP, 0.5);
    else nudge(cpos, cw / 2 + 8 + (E.accB.w || 120) * 0.55 / 2, chh / 2, 2.6, vStart);
    show(E.accB, _d.copy(vStart).lerp(cardB, go), aa); show(E.accP, _e.copy(vStart).lerp(cardP, go), aa);
    const s2 = (0.55 + 0.45 * go).toFixed(3); sty(E.accB.c, 'scale', s2); sty(E.accP.c, 'scale', s2);
    const on = t > K.ag1 + 2.05; cls(E.accB.c, 'is-on', on); cls(E.accP.c, 'is-on', on);
    const tA = aa * sm((go - 0.75) / 0.25);
    offer(0, tA, E.accB, cardB); offer(1, tA, E.accP, cardP);
    if (NARROW) bandBusy = Math.max(bandBusy, aa);
  }
  /* tethers: each signature / certificate / acceptance card hangs from its own agent */
  tether(G.tB, B, tBc, tBp, 1, tBa * (dark ? 0.75 : 0.9));
  tether(G.tP, P, tPc, tPp, 1, tPa * (dark ? 0.75 : 0.9));

  /* ================= the rules layer in orbit (from the end of Agree) ================= */
  const layerA = fin(t, K.ag1 + 2.65, 0.4) * (1 - fin(t, K.end + 0.1, 0.8)) * outro;
  show(E.con, conPos, layerA);
  sty(E.con.lab, 'opacity', fin(t, K.ag1 + 3.0, 0.4).toFixed(3));
  pulse(E.con, t, K.ag1 + 2.7, 0.7, 2.4);
  {
    /* orbit through contract, clockchain, verification: the contract side first, the verification side at Run */
    const [cu, cv] = LAY.cc, [ku, kv] = LAY.con;
    const by = cv, cth = kv / by, th1 = Math.acos(clamp(cth, -1, 1)), ax = Math.abs(ku) / Math.sin(th1);
    /* the orbit runs on a little past contract and verification; less on narrow stages, where labels sit under the nodes */
    const tm = th1 * (NARROW ? 1.12 : 1.32);
    ptsArr(64, orbPts); ptsArr(64, cvPts);
    for (let i = 0; i < 64; i++) { const th = -tm + 2 * tm * i / 63; vp(cu + ax * Math.sin(th), by * Math.cos(th), 1, orbPts[i]); }
    for (let i = 0; i < 64; i++) { const th = -th1 + 2 * th1 * i / 63; vp(cu + ax * Math.sin(th), by * Math.cos(th), 1, cvPts[i]); }
    const gl = prog(t, K.ag1 + 2.65, 0.9), gr = prog(t, K.ru1 - 0.1, 0.9);
    const oa = layerA * 0.5;
    G.orbit.set(orbPts, oa > 0.003).dash(0.45, 0.04, t * 0.25).a(oa).p(0.5 - 0.5 * gl, 0.5 + 0.5 * gr);
  }

  /* ================= LOCK ================= */
  const L0 = city('london', 1, vL0);
  {
    const k0 = K.lk0;
    const sa = fin(t, k0 + 0.1, 0.5) * (1 - fin(t, K.end + 0.1, 0.8)) * outro;
    show(E.settle, L0, sa);
    pulse(E.settle, t, k0 + 0.15, 0.7, 2.2); pulse(E.settle, t, k0 + 1.8, 0.7, 2.4);
    /* authorization: buyer -> agent contract (rules only) */
    rise(B, conPos, 40, 0.35, pts1);
    const ap = prog(t, k0 + 0.4, 0.6);
    const authA = win(t, k0 + 0.35, K.end + 0.5, 0.25, 0.6) * outro * 0.85 * em(t, [[k0 + 0.3, K.lk1 + 0.4]]);
    G.auth.set(pts1, authA > 0.003).p(0, ap).dash(0.5, 0.035, t * 0.8).a(authA);
    show(E.pk[4], alongL(pts1, ap, _a), win(t, k0 + 0.4, k0 + 1.05, 0.1, 0.15) * outro);
    pulse(E.con, t, k0 + 1.0, 0.6, 2.2);
    /* conditions: agent contract -> settlement provider */
    bow(conPos, _g.copy(L0).multiplyScalar(1.01), 0.12, 40, ptsB);
    const condA = win(t, k0 + 0.95, K.end + 0.5, 0.25, 0.6) * outro * 0.85 * em(t, [[k0 + 0.95, K.ru0 + 0.3]]);
    G.cond.set(ptsB, condA > 0.003).p(0, prog(t, k0 + 1.0, 0.6)).dash(0.5, 0.035, t * 0.8).a(condA);
    /* funds: buyer -> settlement provider, on the ground */
    const fp = prog(t, k0 + 0.95, 0.85);
    const monA = (t < K.end ? 1 : 1 - fin(t, K.end + 0.1, 0.8)) * outro;
    const bold = win(t, K.ru3 + 0.05, K.sc0 + 0.4, 0.5, 0.5);
    G.mon1.p(0, fp).a(t > k0 + 0.95 ? monA : 0).w(1.75 + 1.0 * bold);
    /* the lock is a badge on the settlement provider's own node, on the side away from the buyer */
    const lockA = fin(t, k0 + 0.3, 0.4) * (1 - fin(t, K.end + 0.1, 0.8)) * outro;
    show(E.lock, L0, lockA);
    const lo = TINY ? 12 : 13;
    sty(E.lock.el.firstChild, 'translate', lo + 'px ' + (-lo) + 'px');
    /* closed while funds are held: opens to release M1, closes on what is left, opens per milestone, open for good after M3 */
    const closed = Math.max(shut(t, k0 + 1.75, K.ru2 + 0.7), shut(t, K.ru2 + 2.2, C[1].rel + C[1].rd), shut(t, C[1].pay + C[1].pd + 0.2, C[2].rel + C[2].rd));
    sty(E.lock.shk, 'transform', 'translateY(' + (-3.6 * (1 - closed)).toFixed(2) + 'px)');
    /* funds chip: rides in with the money, parks beside the lock, then pays the provider */
    /* desktop: beside the lock; phone: stacked on the lock, clear of the Evidence chip and the release line */
    const parkX = TINY ? lo : lo + 11 + 6 + (E.funds.w || 56) / 2, parkY = TINY ? -lo - 11 - 4 - (E.funds.h || 18) / 2 : -lo;
    let fa, ox, oy;
    if (t < K.ru2 + 0.9) {
      if (TINY) { _c.copy(L0); fa = fin(t, k0 + 1.65, 0.3); ox = parkX; oy = parkY; }
      else {
        onGlobe(alongL(G.mon1Pts, fp, _c), 1.0, _c); fa = fin(t, k0 + 1.3, 0.3);
        const pk = prog(t, k0 + 1.8, 0.4); ox = lerp(0, parkX, pk); oy = lerp(-16, parkY, pk);
      }
    } else {
      const pp = prog(t, K.ru2 + 0.9, 1.0); onGlobe(alongL(G.mon2Pts, pp, _c), 1.0, _c);
      fa = 1 - fin(t, K.ru3 + 0.2, 0.45);
      /* at the provider the chip settles under the node, clear of its label */
      const land = sm((pp - 0.55) / 0.45); ox = lerp(parkX, 0, land); oy = lerp(parkY, 26, land);
    }
    show(E.funds, _c, fa * outro);
    sty(E.funds.c, 'translate', ox.toFixed(1) + 'px ' + oy.toFixed(1) + 'px');
    G.mon2.p(0, prog(t, K.ru2 + 0.9, 1.0)).a(t > K.ru2 + 0.9 ? monA : 0).w(1.75 + 1.0 * bold);
    show(E.money, onGlobe(alongL(G.mon1Pts, 0.5, _d), 1.0, _d), bold * outro * (TINY ? 0 : 1));
    /* line 1: the contract runs the rules */
    show(E.rules, conPos, win(t, K.lk1 + 0.15, K.end + 0.3, 0.4, 0.5) * outro);
  }

  /* ================= RUN / SCALE: the milestone cycle ================= */
  const verA = fin(t, K.ru1, 0.5) * (1 - fin(t, K.end + 0.1, 0.8)) * outro;
  show(E.ver, verPos, verA);
  {
    let cyc = C[0]; for (const c of C) if (t >= c.w0 - 0.2) cyc = c;
    const evOn = t >= K.ru1 ? 1 : 0;
    /* work: milestone progress around the provider */
    const wp = prog(t, cyc.w0, cyc.wd);
    const ringOn = win(t, cyc.w0 - 0.1, cyc.res + cyc.rsd + 0.3, 0.2, 0.3) * (t >= K.ru0 && t < K.end ? 1 : 0) * outro;
    sty(E.prov.ring, 'opacity', ringOn.toFixed(3));
    sty(E.prov.ringFg, 'strokeDashoffset', (1 - wp).toFixed(3));
    setText(E.msTxt, cyc.label);
    show(E.ms, P, ringOn);
    sty(E.ms.c, 'translate', NARROW ? '0px 0px' : '4px 6px');
    const runA = win(t, K.ru1 + 0.2, K.end + 0.4, 0.3, 0.6) * outro;
    /* contract -> verification: the agreed criteria, along the orbit */
    const cvA = runA * 0.9 * em(t, [[K.ru1, K.ru2], [C[1].up - 0.3, C[1].chk + 0.4], [C[2].up - 0.3, C[2].chk + 0.4]]);
    G.cv.set(cvPts, cvA > 0.003).p(0, prog(t, K.ru1 + 0.1, 0.8)).dash(0.5, 0.04, t * 0.9).a(cvA);
    show(E.pk[6], alongL(cvPts, prog(t, cyc.up, cyc.ud), _a), win(t, cyc.up, cyc.up + cyc.ud + 0.05, 0.08, 0.1) * evOn * outro);
    /* check at verification */
    const chk = win(t, cyc.chk, cyc.chk + 1.2, 0.15, 0.3);
    sty(E.ver.ok, 'opacity', chk.toFixed(3)); pulse(E.ver, t, cyc.chk, 0.6, 2.4);
    /* verification -> provider (deck slide 7): drawn from Verification down, the checked result goes to the provider */
    rise(P, verPos, 40, 0.35, pts2); pts2.reverse();
    const pvA = runA * 0.85 * em(t, [[K.ru1, K.ru2], [C[1].chk - 0.3, C[1].res + C[1].rsd + 0.4], [C[2].chk - 0.3, C[2].res + C[2].rsd + 0.4]]);
    G.pver.set(pts2, pvA > 0.003).p(0, prog(t, K.ru1 + 0.25, 0.6)).dash(0.5, 0.035, t * 0.8).a(pvA);
    show(E.pk[5], alongL(pts2, prog(t, cyc.res, cyc.rsd), _b), win(t, cyc.res, cyc.res + cyc.rsd + 0.05, 0.08, 0.1) * evOn * outro);
    pulse(E.prov, t, cyc.res + cyc.rsd, 0.6, 2.2);
    /* evidence package -> the ledger */
    const evk = prog(t, cyc.ev, cyc.evd);
    if (NARROW) {
      /* narrow stages: the package sits under the Verification label; a dot carries it to the ledger */
      show(E.evid, verPos, win(t, cyc.ev - 0.1, cyc.ev + cyc.evd + 0.5, 0.2, 0.3) * evOn * outro);
      scaleEl(E.evid.c, 0.85 + 0.15 * pop(t, cyc.ev - 0.1, 0.35));
      nudge(verPos, 0, (TINY ? 30 : 20) + (E.evid.h || 20), 1, _g);
      bow(_g, front, 0.06, 32, ptsC);
      show(E.pk[7], alongL(ptsC, evk, _c), win(t, cyc.ev, cyc.ev + cyc.evd + 0.05, 0.08, 0.1) * evOn * outro);
    } else {
      nudge(verPos, 0, 0.12 * RPX, 1, _g);
      bow(_g, front, 0.06, 32, ptsC);
      show(E.evid, alongL(ptsC, evk, _c), win(t, cyc.ev - 0.05, cyc.ev + cyc.evd + 0.1, 0.15, 0.2) * evOn * outro);
      scaleEl(E.evid.c, cyc === C[0] ? 1 : 0.88);
      show(E.pk[7], null, 0);
    }
    const eva = win(t, cyc.ev, cyc.ev + cyc.evd + 0.6, 0.1, 0.4) * evOn * outro;
    G.ev.set(ptsC, eva > 0.003).p(0, evk).a(eva);
    /* release: verification -> settlement provider */
    bow(verPos, _h.copy(L0).multiplyScalar(1.01), 0.12, 40, ptsD);
    const vsA = win(t, K.ru2 + 0.05, K.end + 0.4, 0.25, 0.6) * outro * 0.85 *
      em(t, [[K.ru2, K.ru3], [C[1].rel - 0.3, C[1].rel + C[1].rd + 0.5], [C[2].rel - 0.3, C[2].rel + C[2].rd + 0.5]]);
    G.vset.set(ptsD, vsA > 0.003).p(0, prog(t, K.ru2 + 0.1, 0.6)).dash(0.5, 0.035, t * 0.8).a(vsA);
    show(E.pkInk[0], alongL(ptsD, prog(t, cyc.rel, cyc.rd), _d), win(t, cyc.rel, cyc.rel + cyc.rd + 0.05, 0.08, 0.1) * (t >= K.ru2 ? 1 : 0) * outro);
    pulse(E.settle, t, cyc.rel + cyc.rd, 0.6, 2.2);
    /* later milestones: a payment hop on the ground */
    if (cyc.pay) {
      const pk = prog(t, cyc.pay, cyc.pd);
      show(E.pkInk[1], onGlobe(alongL(G.mon2Pts, pk, _e), 1, _e), win(t, cyc.pay, cyc.pay + cyc.pd + 0.05, 0.08, 0.1) * outro);
      pulse(E.prov, t, cyc.pay + cyc.pd, 0.6, 2.2);
    } else show(E.pkInk[1], null, 0);
    pulse(E.prov, t, K.ru2 + 2.0, 0.7, 2.6);
    /* reputation scorecard, ticking up after each milestone */
    const repA = fin(t, K.sc0 + 0.05, 0.5) * (1 - fin(t, K.end + 0.1, 0.8)) * outro;
    show(E.rep, slot(LAY.rep, 2.6, _e, E.rep.h || 60), repA);
    const fills = [K.sc0 + 0.25, K.sc0 + 2.75, K.sc1 + 2.25];
    E.rep.segs.forEach((b, i) => sty(b, 'width', (prog(t, fills[i], 0.45) * 100).toFixed(1) + '%'));
  }

  /* ================= LEDGER ANCHORS ================= */
  {
    let newest = -1; for (let k = 0; k < AN.length; k++) if (t >= AN[k]) newest = k;
    E.anchors.forEach((p, k) => {
      const ta = AN[k];
      const ang = k * AD + psi;
      ringPt(ang, _a).multiplyScalar(rs);
      const f = Math.cos(ang);
      const a = (t >= ta ? 1 : 0) * sm((f - 0.25) / 0.35) * outro * ringIn;
      show(p, _a, a);
      if (a > 0) {
        setHTML(p.ts, 'k' + Math.floor(base), stampHTML(base + ta * 1000));
        const side = k % 2 ? 'u' : 'd';
        if (p.side !== side) { place(p.lab, side, 14); p.side = side; }
        scaleEl(p.node, pop(t, ta, 0.4));
        /* narrow stages: a label steps aside while a card occupies the band under the ring */
        const hide = NARROW ? (k === newest ? centreBusy : Math.max(centreBusy, bandBusy)) : 0;
        /* the contract anchor's label waits for the line from the card to clear it (narrow: for the acceptance cards to split) */
        sty(p.lab, 'opacity', (fin(t, ta + (k === 1 ? (NARROW ? 0.95 : 0.45) : 0.05), 0.35) * sm((f - 0.6) / 0.12) * (1 - hide)).toFixed(3));
      }
      pulse(p, t, ta, 0.8, 2.8);
    });
  }

  flushPulses();
  R3.render(scene, cam);
  css.render(scene, cam);
}

/* ------------------------------------------------------------------ contract */
function resize(w, h) {
  W = Math.max(1, w); H = Math.max(1, h);
  R3.setSize(W, H, false); css.setSize(W, H);
  /* narrow (phone-like) layout below 1.25:1; phone type sizes only on small stages; mid stages scale with the stage */
  const narrow = W / H < 1.25 || W < 560;
  PHONE_MODE = narrow; SMALL = W < 560; LAY = narrow ? PHONE : WIDE;
  layer.classList.toggle('is-phone', SMALL);
  RR = LAY.rr;
  R0 = narrow && !SMALL ? Math.min(H * 0.26, W * 0.21) : Math.min(H * LAY.rk, W * LAY.rw);
  const fov = 20; cam.fov = fov; cam.aspect = W / H;
  FOCAL = (H / 2) / Math.tan(fov * D2R / 2);
  cam.near = 0.1; cam.far = 100; cam.up.set(0, 1, 0);
  const gx = W * 0.5, gy = H * LAY.gy;
  cam.setViewOffset(W, H, W / 2 - gx, H / 2 - gy, W, H);
  cam.updateProjectionMatrix();
  RES.set(W, H);
  applyCam(CAMZ > 0 ? CAMZ : 1, CAME > 0 ? CAME : 0);
  rebuildRing();
  applyLayoutHTML();
  measure();
}

export default {
  init(ctx) {
    /* story timing */
    let acc = 0;
    for (const st of ctx.story.steps) { SS[st.id] = { s: acc, d: st.dur, n: st.lines.length }; acc += st.dur; }
    TOTAL = acc;
    Object.assign(K, {
      inv: at('invite'), join: at('join'), ver: at('verify'),
      hs0: at('handshake', 0), hs1: at('handshake', 1), hs2: at('handshake', 2), hs3: at('handshake', 3),
      al0: at('align', 0), al1: at('align', 1), al2: at('align', 2),
      ag0: at('agree', 0), ag1: at('agree', 1), lk0: at('lock', 0), lk1: at('lock', 1),
      ru0: at('run', 0), ru1: at('run', 1), ru2: at('run', 2), ru3: at('run', 3),
      sc0: at('scale', 0), sc1: at('scale', 1), end: at('end'),
    });
    /* milestone cycles: work, criteria to verification (up), check, result back to the provider (res),
       evidence to the ledger (ev), release at settlement (rel), payment hop (pay) */
    CYC = [
      { w0: K.ru0 + 0.3, wd: 2.0, up: K.ru1 + 0.3, ud: 0.6, chk: K.ru1 + 1.0, res: K.ru1 + 1.2, rsd: 0.6, ev: K.ru1 + 1.2, evd: 0.7, rel: K.ru2 + 0.1, rd: 0.6, label: 'M1' },
      { w0: K.sc0 + 0.15, wd: 0.85, up: K.sc0 + 1.0, ud: 0.35, chk: K.sc0 + 1.35, res: K.sc0 + 1.4, rsd: 0.35, ev: K.sc0 + 1.4, evd: 0.4, rel: K.sc0 + 1.85, rd: 0.3, pay: K.sc0 + 2.15, pd: 0.55, label: 'M2' },
      { w0: K.sc1 + 0.0, wd: 0.7, up: K.sc1 + 0.7, ud: 0.3, chk: K.sc1 + 1.0, res: K.sc1 + 1.05, rsd: 0.35, ev: K.sc1 + 1.0, evd: 0.4, rel: K.sc1 + 1.45, rd: 0.25, pay: K.sc1 + 1.7, pd: 0.5, label: 'M3' },
    ];
    /* anchored steps: handshake, contract, M1, M2, M3, project complete */
    AN.push(K.hs2 + 0.55, K.ag1 + 0.95, K.ru1 + 1.9, K.sc0 + 1.8, K.sc1 + 1.4, K.sc1 + 2.45);

    if (!document.getElementById('ag-b-style')) { const st = h('style'); st.id = 'ag-b-style'; st.textContent = CSS; document.head.appendChild(st); }
    R3 = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    R3.setPixelRatio(Math.min(2, ctx.dpr || 1));
    R3.setClearColor(0x000000, 0);
    ctx.host.appendChild(R3.domElement);
    css = new CSS2DRenderer();
    layer = css.domElement; layer.className = 'ag-b-layer';
    ctx.host.appendChild(layer);

    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(20, ctx.w / ctx.h, 0.1, 100);
    globe = new THREE.Group(); globe.rotation.order = 'XYZ'; scene.add(globe);
    /* depth-only core: hides whatever passes behind the Earth */
    const occ = new THREE.Mesh(new THREE.SphereGeometry(0.985, 64, 40), new THREE.MeshBasicMaterial({ colorWrite: false }));
    occ.renderOrder = 0; scene.add(occ);

    buildLines();
    buildHTML();
    COL = ctx.colors;
    resize(ctx.w, ctx.h);
    applyTheme();
    /* card sizes again once the site fonts are in */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => measure());
  },
  frame(s) { frame(s); },
  resize(w, h) { resize(w, h); },
  theme(c) { COL = c; applyTheme(); },
};
