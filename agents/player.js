/* AI & Agents section player.
   Builds the chapter marks, the progress ruler, the caption and the still list from window.CC_STORY,
   runs the clock (starts when the section is in view, loops, pauses off screen), and drives one 3D scene.

   Scene module contract (its default export):
     init(ctx)        ctx = { host, story, colors, w, h, dpr }   may return a Promise
     frame(s)         s = { t, dt, total, step, stepId, stepT, line, lineT, ch, playing }
                      Draw as a function of (step, stepT) so jumps and pauses always look right;
                      t may drive ambient motion only.
     resize(w, h)
     theme(colors)    colors = { accent, fg, fg2, fg3, line, line2, bg, bgAlt, surface, surface2 } as '#rrggbb'
   The scene module (and Three.js with it) loads only when the section comes near the viewport.
   Visitors who have turned motion off get the steps as a still list instead. */

const STILL = matchMedia('(prefers-reduced-motion: reduce)');
const Q = new URLSearchParams(location.search);

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function clock(t) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return String(m).padStart(2, '0') + ':' + s.toFixed(3).padStart(6, '0');
}

/* CSS colour (any syntax, oklch included) -> '#rrggbb', through a 1px canvas */
const cv = document.createElement('canvas'); cv.width = cv.height = 1;
const cx = cv.getContext('2d', { willReadFrequently: true });
function hex(css) {
  cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = css; cx.fillRect(0, 0, 1, 1);
  const d = cx.getImageData(0, 0, 1, 1).data;
  return '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
}
function readColors(scope) {
  const probe = el('span'); probe.style.display = 'none'; scope.appendChild(probe);
  const out = {};
  const map = { accent: '--accent', fg: '--fg', fg2: '--fg-2', fg3: '--fg-3', line: '--line', line2: '--line-2',
    bg: '--bg', bgAlt: '--bg-alt', surface: '--surface', surface2: '--surface-2' };
  for (const k in map) { probe.style.color = 'var(' + map[k] + ')'; out[k] = hex(getComputedStyle(probe).color); }
  /* lines are translucent in dark mode: give scenes the colour they actually show on the stage */
  for (const k of ['line', 'line2']) {
    probe.style.color = 'color-mix(in srgb, var(' + map[k] + '), var(--surface))';
    out[k] = hex(getComputedStyle(probe).color);
  }
  probe.remove();
  out.dark = document.documentElement.getAttribute('data-variant') === 'eclipse';
  return out;
}

export function mount(root, opts) {
  const story = window.CC_STORY;
  const steps = story.steps, chapters = story.chapters;
  const starts = []; let total = 0;
  steps.forEach((s) => { starts.push(total); total += s.dur; });
  const chStart = chapters.map((c, i) => starts[steps.findIndex((s) => s.ch === i)]);
  const chEnd = chapters.map((c, i) => { const last = steps.map((s) => s.ch).lastIndexOf(i); return starts[last] + steps[last].dur; });

  /* ---------- DOM ---------- */
  root.classList.add('ag-player');
  const stage = el('div', 'ag-stage');
  const host = el('div', 'ag-canvas'); host.setAttribute('aria-hidden', 'true');
  const chips = el('div', 'ag-chips');
  chapters.forEach((c, i) => {
    const b = el('button', 'ag-chip',
      '<span class="ag-chip-n">' + c.n + '</span><span class="ag-chip-l">' + esc(c.label) + '</span>' +
      '<span class="ag-chip-s ' + (i === 0 ? 'is-live' : 'is-dev') + '">' + esc(c.status) + '</span>');
    b.type = 'button'; b.dataset.ch = i;
    b.setAttribute('aria-label', 'Play from ' + c.label + ' (' + c.status + ')');
    b.addEventListener('click', () => { seek(chStart[i]); });
    chips.appendChild(b);
  });
  const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
  const pauseBtn = el('button', 'ag-pause'); pauseBtn.type = 'button';
  pauseBtn.addEventListener('click', () => { userPaused = !userPaused; sync(); });
  stage.append(host, chips, pauseBtn);

  /* round 2: the two animations as two clear buttons, each with its sentence and its own progress.
     opts.ui: 'chips' (round 1, in the stage) | 'tabs' (above the stage) | 'timeline' (under the ruler, sized to each part) | 'cards' (under the caption) */
  const ui = opts.ui || 'chips';
  root.dataset.ui = ui;
  const navBtns = [];
  let nav = null;
  if (ui !== 'chips') {
    nav = el('div', 'ag-nav ag-nav-' + ui);
    nav.setAttribute('role', 'group'); nav.setAttribute('aria-label', 'Two animations');
    const len = (i) => { const s = Math.round(chEnd[i] - chStart[i]); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    chapters.forEach((c, i) => {
      const b = el('button', 'ag-nb',
        '<span class="ag-nb-top"><span class="ag-nb-n">' + c.n + '</span><span class="ag-nb-l">' + esc(c.label) + '</span>' +
        '<span class="ag-nb-s ' + (i === 0 ? 'is-live' : 'is-dev') + '">' + esc(c.status) + '</span><span class="ag-nb-d">' + len(i) + '</span></span>' +
        (c.blurb ? '<span class="ag-nb-b">' + esc(c.blurb) + '</span>' : '') +
        '<span class="ag-nb-go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg><em>Play</em></span>' +
        '<span class="ag-nb-bar"><i></i></span>');
      b.type = 'button'; b.dataset.ch = i;
      b.setAttribute('aria-label', 'Play ' + c.label + ' (' + c.status + ')');
      b.addEventListener('click', () => { seek(chStart[i] + 0.001); if (userPaused) { userPaused = false; sync(); } });
      nav.appendChild(b);
      navBtns.push({ b, fill: b.querySelector('.ag-nb-bar i'), i });
    });
    if (ui === 'timeline') {
      /* each button spans its own part of the ruler above it; the end card keeps its short tail */
      nav.style.gridTemplateColumns = chapters.map((c, i) => (chEnd[i] - chStart[i]) + 'fr').join(' ') + ' ' + Math.max(0.001, total - chEnd[chapters.length - 1]) + 'fr';
    }
  }

  const foot = el('div', 'ag-foot');
  const scale = el('div', 'ag-scale', '<span class="ag-now"></span><span class="ag-total">' + clock(total) + '</span>');
  const ruler = el('div', 'ag-ruler');
  const fill = el('div', 'ag-fill');
  ruler.appendChild(fill);
  chapters.forEach((c, i) => {
    const seg = el('div', 'ag-seg');
    seg.style.left = (chStart[i] / total * 100) + '%';
    seg.style.width = ((chEnd[i] - chStart[i]) / total * 100) + '%';
    ruler.appendChild(seg);
  });
  const dots = steps.map((s, i) => {
    if (s.ch < 0) return null;
    const d = el('button', 'ag-dot'); d.type = 'button';
    d.style.left = (starts[i] / total * 100) + '%';
    d.setAttribute('aria-label', 'Play from ' + (s.title || 'the end'));
    d.addEventListener('click', () => seek(starts[i] + 0.001));
    ruler.appendChild(d);
    return d;
  });
  const cap = el('div', 'ag-cap'); cap.setAttribute('aria-hidden', 'true');
  const capK = el('span', 'ag-cap-k'); const capT = el('p', 'ag-cap-t');
  cap.append(capK, capT);
  foot.append(scale, ruler);
  if (ui === 'timeline') foot.append(nav);
  foot.append(cap);
  if (ui === 'cards') foot.append(nav);

  /* the full story as text: read by screen readers always, shown to everyone when motion is off */
  const still = el('div', 'ag-still');
  chapters.forEach((c, i) => {
    const g = el('div', 'ag-still-ch');
    g.appendChild(el('h3', 'ag-still-h', '<span>' + c.n + '</span> ' + esc(c.label) + ' <em>' + esc(c.status) + '</em>'));
    const ol = el('ol');
    steps.filter((s) => s.ch === i).forEach((s) => {
      ol.appendChild(el('li', null, '<b>' + esc(s.title) + '.</b> ' + s.lines.map(esc).join(' ')));
    });
    g.appendChild(ol); still.appendChild(g);
  });
  still.appendChild(el('p', 'ag-still-end', esc(steps[steps.length - 1].lines[0])));
  if (ui === 'tabs') root.append(nav);
  root.append(stage, foot, still);
  const nowEl = scale.querySelector('.ag-now');

  /* ---------- clock ---------- */
  let t = Q.has('t') ? Math.min(total - 0.001, Math.max(0, +Q.get('t') || 0)) : 0;
  let userPaused = Q.has('t');            /* ?t= freezes on that moment (for review captures) */
  let inView = false, speed = 1, scene = null, loading = null, raf = 0, last = 0;
  let colors = readColors(root);
  let shownKey = '';

  function stateAt(tt) {
    let i = 0; while (i < steps.length - 1 && tt >= starts[i + 1]) i++;
    const s = steps[i];
    const stepT = Math.min(1, Math.max(0, (tt - starts[i]) / s.dur));
    const n = s.lines.length;
    const line = Math.min(n - 1, Math.floor(stepT * n));
    return { t: tt, total, step: i, stepId: s.id, stepT, line, lineT: Math.min(1, stepT * n - line), ch: s.ch };
  }

  function paintUI(st) {
    const s = steps[st.step];
    const key = st.step + ':' + st.line;
    if (key !== shownKey) {
      shownKey = key;
      const nInCh = s.ch < 0 ? 0 : steps.slice(0, st.step + 1).filter((x) => x.ch === s.ch).length;
      capK.textContent = s.ch < 0 ? 'Clockchain' : String(nInCh).padStart(2, '0') + ' / ' + s.title;
      capT.classList.remove('in'); void capT.offsetWidth;
      capT.textContent = s.lines[st.line]; capT.classList.add('in');
      cap.classList.toggle('is-end', s.ch < 0);
      chips.querySelectorAll('.ag-chip').forEach((b, i) => {
        if (i === s.ch) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      navBtns.forEach(({ b, i }) => { if (i === s.ch) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      dots.forEach((d, i) => { if (d) d.classList.toggle('is-done', i <= st.step); });
    }
    navBtns.forEach(({ fill: f, i }) => {
      const p = Math.min(1, Math.max(0, (st.t - chStart[i]) / (chEnd[i] - chStart[i])));
      f.style.width = (p * 100).toFixed(2) + '%';
    });
    fill.style.width = (st.t / total * 100) + '%';
    nowEl.textContent = clock(st.t);
  }

  function render(dt) {
    const st = stateAt(t);
    st.dt = dt; st.playing = isPlaying();
    paintUI(st);
    if (scene) scene.frame(st);
  }
  function isPlaying() { return inView && !userPaused && !!scene; }
  function loop(now) {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    if (isPlaying()) { t = (t + dt * speed) % total; render(dt); raf = requestAnimationFrame(loop); }
  }
  function sync() {
    const playing = isPlaying();
    pauseBtn.innerHTML = userPaused ? PLAY : PAUSE;
    pauseBtn.setAttribute('aria-label', userPaused ? 'Play animation' : 'Pause animation');
    root.classList.toggle('is-paused', userPaused);
    if (playing && !raf) { last = 0; raf = requestAnimationFrame(loop); }
    if (!playing) render(0);
  }
  function seek(tt) { t = Math.max(0, Math.min(total - 0.001, tt)); render(0); }

  /* ---------- scene loading ---------- */
  function size() { const r = host.getBoundingClientRect(); return { w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) }; }
  function load() {
    if (loading) return loading;
    root.classList.add('is-loading');
    loading = import(opts.scene).then(async (mod) => {
      const sc = mod.default; const { w, h } = size();
      await sc.init({ host, story, colors, w, h, dpr: Math.min(2, window.devicePixelRatio || 1) });
      scene = sc;
      root.classList.remove('is-loading'); root.classList.add('is-ready');
      sync();
    }).catch((err) => { console.error('AI & Agents scene failed to load', err); root.classList.add('is-failed'); });
    return loading;
  }

  if (STILL.matches || Q.get('still') === '1') {
    root.classList.add('is-still');
    return;
  }
  render(0); sync();

  new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) load(); }, { rootMargin: '700px 0px' }).observe(root);
  new IntersectionObserver((en) => { inView = en[0].isIntersecting; sync(); }, { threshold: 0.3 }).observe(stage);
  new ResizeObserver(() => { if (scene) { const { w, h } = size(); scene.resize(w, h); render(0); } }).observe(host);
  document.addEventListener('visibilitychange', () => { inView = !document.hidden && inView; sync(); });
  new MutationObserver(() => {
    colors = readColors(root);
    if (scene) { scene.theme(colors); render(0); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-variant'] });

  window.__ag = { seek, total, starts, state: () => stateAt(t), pause: () => { userPaused = true; sync(); }, play: () => { userPaused = false; sync(); }, ready: () => loading };
}
