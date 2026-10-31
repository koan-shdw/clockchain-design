/* AI & Agents · V3 CARDS
   The site's cards as floating 3D panels. Every card is real HTML in the site's fonts and tokens
   (CSS3DRenderer), linked by WebGL hairlines and travelling pulses drawn with the same camera.
   The canvas sits under the card layer, so every line runs behind the cards and ends in a port ring
   that belongs to the card (HTML, on top).
   Everything is a pure function of story time: frame(s) builds the picture from (beat, time in beat). */
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

/* ---------------- styles (prefixed .ag-c-) ---------------- */
const CSS = `
.ag-c-gl{position:absolute;inset:0;width:100%;height:100%;display:block}
.ag-c-layer{position:absolute;inset:0;pointer-events:none;
  --c-ink:color-mix(in oklab,var(--accent) 68%,black);
  --c-fill:var(--surface);
  --c-fig:color-mix(in oklab,var(--surface-2) 96%,var(--accent));
  --c-soft:color-mix(in oklab,var(--accent) 11%,var(--c-fill));
  --c-blue:#3b7ddd;--c-blue-ink:#2c66bd;
  --c-blue-soft:color-mix(in oklab,#3b7ddd 11%,var(--c-fill));
  --c-orange:#d2691e;
  font-family:var(--f-body);color:var(--fg);-webkit-font-smoothing:antialiased;font-weight:400}
:root:not([data-theme="light"]) .ag-c-layer{--c-ink:var(--accent);--c-fill:var(--surface-2);
  --c-fig:color-mix(in oklab,var(--surface) 94%,var(--accent));--c-blue-ink:#7aaaf0;
  --c-soft:color-mix(in oklab,var(--accent) 16%,var(--c-fill));--c-blue-soft:color-mix(in oklab,#3b7ddd 20%,var(--c-fill))}
.ag-c-layer *,.ag-c-layer *::before,.ag-c-layer *::after{box-sizing:border-box}
.ag-c-layer em{font-style:normal}
.ag-c-row > span b{font-weight:inherit}
/* --on (0..1) lights a card, --dm (0..1) quiets its content; both are set every frame from story time */
.ag-c-card{background:var(--c-fill);border:1px solid color-mix(in oklab,var(--accent-line) calc(var(--on,0) * 100%),var(--line));border-radius:18px;padding:15px 16px 16px;
  box-shadow:var(--shadow),0 0 0 calc(4px * var(--on,0)) var(--accent-soft);color:var(--fg);backface-visibility:hidden;-webkit-backface-visibility:hidden}
.ag-c-card > :not(.ag-c-port):not(.ag-c-scope):not(.ag-c-stamp),.ag-c-clockp > *{opacity:calc(1 - .5 * var(--dm,0))}
.ag-c-k{display:flex;align-items:center;gap:8px;min-height:14px;font:500 10.5px/1.3 var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-2);white-space:nowrap}
.ag-c-k b{color:var(--c-ink);font-weight:500}
.ag-c-k .r{margin-left:auto}
.ag-c-t{margin-top:6px;font:300 20px/1.15 var(--f-display);letter-spacing:-.018em;color:var(--fg);white-space:nowrap}
.ag-c-t.sm{font-size:17px}
.ag-c-st{width:10px;height:10px;border-radius:50%;border:1.5px solid var(--line-2);margin-left:auto;flex:none}
.ag-c-st.on{border-color:var(--accent);background:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.ag-c-fig{margin-top:12px;background:var(--c-fig);border:1px solid var(--line);border-radius:12px;padding:4px;display:flex;flex-direction:column;gap:3px}
.ag-c-row{display:flex;align-items:center;gap:8px;height:28px;padding:0 9px;border-radius:8px;font-size:12.5px;color:var(--fg-2);white-space:nowrap}
.ag-c-row em{font-style:normal}
.ag-c-row > span{margin-left:auto;font:400 10.5px/1 var(--f-mono);color:var(--fg-3);letter-spacing:.02em}
.ag-c-ic{position:relative;width:14px;height:14px;flex:none;border-radius:50%;border:1.5px solid var(--line-2)}
.ag-c-ic svg{position:absolute;left:-1.5px;top:-1.5px;width:14px;height:14px;fill:none;stroke:var(--c-ink);stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round;opacity:0}
.ag-c-row.live{color:var(--fg)} .ag-c-row.live .ag-c-ic{border-color:var(--accent)}
.ag-c-row.ok{background:var(--accent-soft);color:var(--fg)}
.ag-c-row.ok > span{color:var(--c-ink)}
.ag-c-row.ok .ag-c-ic{border-color:transparent}
.ag-c-row.ok .ag-c-ic svg{opacity:1}
.ag-c-row.neg{color:var(--fg)} .ag-c-row.neg > span{color:var(--fg)}
.ag-c-row.neg .ag-c-ic{border-style:dashed;border-color:var(--fg-3)}
.ag-c-row.hl{box-shadow:inset 0 0 0 1px var(--fg-3)}
.ag-c-chip{display:inline-flex;align-items:center;gap:6px;height:21px;padding:0 8px;border-radius:7px;background:var(--accent-soft);color:var(--c-ink);font:500 10px/1 var(--f-mono);letter-spacing:.1em;text-transform:uppercase;white-space:nowrap}
.ag-c-chip.n{background:var(--line);color:var(--fg-2)}
.ag-c-pill{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 13px;border-radius:999px;border:1px solid var(--accent-line);
  background:var(--c-soft);color:var(--c-ink);font:500 10.5px/1 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;
  box-shadow:var(--shadow);backface-visibility:hidden;-webkit-backface-visibility:hidden}
.ag-c-pill.blue{background:var(--c-blue-soft);color:var(--c-blue-ink);border-color:color-mix(in oklab,#3b7ddd 45%,transparent)}
.ag-c-pill.blue i{width:8px;height:8px;border-radius:50%;background:var(--c-blue)}
.ag-c-ring{display:block;width:18px;height:18px;border-radius:50%;flex:none;border:2.5px solid var(--accent);background:var(--c-fill);box-shadow:0 0 0 5px var(--accent-soft)}
.ag-c-ring.sm{width:11px;height:11px;border-width:2px;box-shadow:0 0 0 3px var(--accent-soft)}
.ag-c-port{position:absolute;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;border:1.5px solid var(--line-2);background:var(--c-fill);opacity:0;z-index:2}
.ag-c-port.g{border-color:var(--accent)} .ag-c-port.b{border-color:var(--c-blue)}
.ag-c-time{font:400 11px/1 var(--f-mono);color:var(--fg-2);font-variant-numeric:tabular-nums;white-space:nowrap;letter-spacing:0}
.ag-c-time em{font-style:normal;color:var(--c-ink)}
.ag-c-hash{font:500 10.5px/1 var(--f-mono);letter-spacing:.08em;color:var(--c-ink);white-space:nowrap}
.ag-c-sub{margin-top:10px;display:flex;align-items:center;gap:8px;font:400 10px/1.2 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--fg-3);white-space:nowrap}
.ag-c-sub b{font-weight:500;color:var(--c-ink)}
/* agents */
.ag-c-agent{width:248px}
.ag-c-agent.back{width:224px}
.ag-c-row.pre .ag-c-pills,.ag-c-row:not(.pre) .ag-c-wd{display:none}
.ag-c-sqs{margin-left:auto;display:flex;gap:5px}
.ag-c-sqs i{width:11px;height:11px;border-radius:3px;background:var(--line-2)}
.ag-c-sqs i.g{background:var(--accent)} .ag-c-sqs i.b{background:var(--c-blue)} .ag-c-sqs i.o{background:var(--c-orange)}
.ag-c-sqs i.x{background:transparent;box-shadow:inset 0 0 0 1.5px var(--line-2)}
.ag-c-k .ag-c-sqs{display:none}
.ag-c-scope{position:absolute;inset:calc(-8px - 16px * (1 - var(--sc,0)));opacity:var(--sc,0);pointer-events:none}
.ag-c-scope i{position:absolute;width:16px;height:16px;border:0 solid var(--accent)}
.ag-c-scope i:nth-child(1){left:0;top:0;border-width:2px 0 0 2px;border-top-left-radius:9px}
.ag-c-scope i:nth-child(2){right:0;top:0;border-width:2px 2px 0 0;border-top-right-radius:9px}
.ag-c-scope i:nth-child(3){left:0;bottom:0;border-width:0 0 2px 2px;border-bottom-left-radius:9px}
.ag-c-scope i:nth-child(4){right:0;bottom:0;border-width:0 2px 2px 0;border-bottom-right-radius:9px}
.ag-c-scope b{position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);padding:0 6px;background:var(--surface);font:500 9.5px/12px var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--c-ink)}
.ag-c-stamp{position:absolute;left:50%;top:-16px;margin-left:-15px;width:30px;height:30px;border-radius:50%;background:var(--c-fill);border:2px solid var(--accent);
  box-shadow:0 0 0 5px var(--accent-soft);transform:scale(var(--ks,0));opacity:var(--ks,0)}
.ag-c-stamp svg{position:absolute;left:5px;top:5px;width:16px;height:16px;fill:none;stroke:var(--c-ink);stroke-width:1.9;stroke-linecap:round}
.ag-c-stamp::after{content:"";position:absolute;inset:-2px;border-radius:50%;border:1.5px solid var(--accent);transform:scale(calc(1 + var(--kr,0) * 1.4));opacity:calc((1 - var(--kr,0)) * .8)}
.ag-c-pills{margin-left:auto;display:flex;gap:4px}
.ag-c-pills i{position:relative;display:grid;place-items:center;width:30px;height:18px;border-radius:6px;border:1px solid var(--line-2);font:500 9.5px/1 var(--f-mono);font-style:normal;color:var(--fg-3);
  background:linear-gradient(to right,var(--accent-soft) var(--p,0%),transparent var(--p,0%))}
.ag-c-pills i.ok{border-color:var(--accent-line);color:var(--c-ink);background:var(--accent-soft)}
.ag-c-pills i.paid::after{content:"";position:absolute;right:-3px;top:-3px;width:7px;height:7px;border-radius:50%;background:var(--c-blue);box-shadow:0 0 0 2px var(--c-fill)}
.ag-c-ghost{width:216px}
.ag-c-ghost .ag-c-t{font-size:16px;display:flex;align-items:center}
/* clockchain */
.ag-c-clock{width:220px}
.ag-c-hms{margin-top:10px;font:300 33px/1 var(--f-display);letter-spacing:-.03em;color:var(--fg);font-variant-numeric:tabular-nums;white-space:nowrap}
.ag-c-hms em{font-style:normal;color:var(--accent)}
.ag-c-clockp{gap:9px;color:var(--fg)} .ag-c-clockp b{font-weight:500;color:var(--fg)} .ag-c-clockp .ag-c-time{font-size:11px}
/* invite */
.ag-c-invite{width:198px;padding:12px 14px 13px;border-radius:16px}
.ag-c-invite .ag-c-k svg{width:15px;height:15px;fill:none;stroke:var(--c-ink);stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round;display:block}
.ag-c-line{margin-top:7px;font-size:12.5px;color:var(--fg);white-space:nowrap}
.ag-c-line i{font-style:normal;color:var(--c-ink);margin:0 4px}
/* session */
.ag-c-session{border:1.5px dashed color-mix(in oklab,var(--accent) 60%,transparent);border-radius:30px;background:color-mix(in oklab,var(--accent) 3.5%,transparent)}
.ag-c-session .ag-c-chip{position:absolute;left:28px;top:-11px;background:var(--c-soft);height:22px}
/* identity check */
.ag-c-erc{width:290px}
.ag-c-erc .ag-c-chip{margin-left:auto}
/* certificate */
.ag-c-cert{width:200px}
.ag-c-seal{display:grid;place-items:center;margin-left:auto;width:20px;height:20px;border-radius:50%;border:2px solid var(--accent);box-shadow:0 0 0 4px var(--accent-soft);flex:none}
.ag-c-seal svg{width:12px;height:12px;fill:none;stroke:var(--c-ink);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.ag-c-hashbox{margin-top:10px;padding:8px 10px;border-radius:9px;background:var(--accent-soft);display:flex;flex-direction:column;gap:6px}
.ag-c-hashbox .ag-c-sub{margin-top:0;letter-spacing:.08em}
/* ledger */
.ag-c-lk{font:500 10.5px/1 var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-3);white-space:nowrap}
.ag-c-mark{width:124px;display:flex;flex-direction:column;align-items:center}
.ag-c-mark .ag-c-ring{margin-bottom:9px}
.ag-c-mark .ag-c-time{font-size:11px}
.ag-c-mark b{margin-top:5px;font:500 9.5px/1 var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-3)}
/* chapter 2 */
.ag-c-prop{width:162px;padding:14px 14px 15px}
.ag-c-cmp{margin-top:12px;display:flex;flex-direction:column;gap:9px}
.ag-c-cmp > div{display:flex;flex-direction:column;gap:5px}
.ag-c-cmp em{font-style:normal;font:400 9.5px/1 var(--f-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--fg-3)}
.ag-c-bar{display:block;height:6px;border-radius:3px;background:var(--line)}
.ag-c-bar u{display:block;height:100%;border-radius:3px;background:var(--fg-3)}
.ag-c-pips{display:flex;gap:5px}
.ag-c-pips u{width:22px;height:6px;border-radius:3px;background:var(--fg-3)}
.ag-c-pips u.x{background:var(--line)}
.ag-c-prop.is-on .ag-c-bar u,.ag-c-prop.is-on .ag-c-pips u:not(.x){background:var(--accent)}
.ag-c-prop.is-on .ag-c-st{border-color:var(--accent);background:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.ag-c-term{gap:7px}
.ag-c-term i{font-style:normal;opacity:.25;font-weight:400}
.ag-c-term.to-r i.r,.ag-c-term.to-l i.l{opacity:1}
.ag-c-ct{width:232px}
.ag-c-terms{margin-top:11px;display:flex;flex-direction:column}
.ag-c-terms > div{display:flex;align-items:center;height:25px;border-top:1px solid var(--line);font-size:12.5px;color:var(--fg-2);white-space:nowrap}
.ag-c-terms > div > span{margin-left:auto;font:400 10.5px/1 var(--f-mono);color:var(--c-ink)}
.ag-c-terms > div.code{font:400 10.5px/1 var(--f-mono);color:var(--fg-2)}
.ag-c-terms > div.code i{font-style:normal;color:var(--c-ink)}
.ag-c-terms > div.code s{text-decoration:none;color:var(--fg-3)}
.ag-c-foot{margin-top:9px;display:flex;align-items:center;gap:8px;height:26px;padding:0 9px;border-radius:8px;background:var(--accent-soft);font:400 10px/1 var(--f-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--fg-2);white-space:nowrap}
.ag-c-foot em{font-style:normal}
.ag-c-foot > span{margin-left:auto;letter-spacing:.06em}
.ag-c-acc{width:206px}
.ag-c-sign{display:block;margin:6px 0 4px;width:132px;height:30px;fill:none;stroke:var(--fg);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:260;stroke-dashoffset:calc(260px * (1 - var(--sg,1)))}
.ag-c-rules{width:218px}
.ag-c-settle{width:264px}
.ag-c-lockrow{margin-top:12px;display:flex;align-items:center;gap:12px;padding:9px 10px;border-radius:12px;background:var(--c-fig);border:1px solid var(--line)}
.ag-c-lock{width:30px;height:32px;flex:none;fill:none;stroke:var(--fg);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ag-c-lock .sh{transform:translateY(var(--lk,-4.5px))}
.ag-c-lock rect{fill:var(--c-fill)}
.ag-c-lock.shut rect{fill:var(--c-blue-soft);stroke:var(--c-blue)} .ag-c-lock.shut path{stroke:var(--c-blue)}
.ag-c-slot{display:grid;place-items:center;width:70px;height:30px;border-radius:999px;border:1.5px dashed var(--line-2);font:500 9.5px/1 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--fg-3)}
.ag-c-lst{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:5px;font:500 10px/1 var(--f-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--fg-2)}
.ag-c-lst b{font-weight:500}
.ag-c-lst .ag-c-time{font-size:10px}
.ag-c-lst.shut{color:var(--c-blue-ink)}
.ag-c-verif{width:218px}
.ag-c-work{width:200px;padding:13px 14px 14px}
.ag-c-prog{margin-top:12px;height:8px;border-radius:4px;background:var(--line);overflow:hidden}
.ag-c-prog i{display:block;height:100%;width:calc(var(--wp,0) * 100%);border-radius:4px;background:var(--accent)}
.ag-c-evid{width:200px;padding:13px 14px 14px}
.ag-c-evrow{margin-top:10px;display:flex;align-items:center;gap:10px}
.ag-c-evrow .doc{display:grid;place-items:center;width:34px;height:40px;border-radius:7px;background:var(--accent-soft);flex:none}
.ag-c-evrow .doc svg{width:18px;height:18px;fill:none;stroke:var(--c-ink);stroke-width:1.5;stroke-linejoin:round}
.ag-c-evrow b{display:block;font-weight:400;font-size:12.5px;color:var(--fg);margin-bottom:5px}
.ag-c-rep{width:200px;padding:14px 15px 15px}
.ag-c-repb{margin-top:10px;display:flex;align-items:flex-end;gap:14px}
.ag-c-bars{display:flex;align-items:flex-end;gap:7px;height:50px;padding-bottom:14px;position:relative}
.ag-c-bars i{position:relative;width:20px;height:100%;display:flex;align-items:flex-end;font-style:normal}
.ag-c-bars u{display:block;width:100%;height:calc(var(--h,0) * 100%);border-radius:4px 4px 2px 2px;background:var(--accent)}
.ag-c-bars b{position:absolute;left:0;right:0;bottom:-14px;text-align:center;font:500 9px/1 var(--f-mono);color:var(--fg-3);letter-spacing:.04em}
.ag-c-reps{display:flex;flex-direction:column;gap:6px;padding-bottom:2px}
.ag-c-reps em{font-size:12.5px;color:var(--fg);white-space:nowrap}
.ag-c-reps span{white-space:nowrap;font:500 10px/1 var(--f-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--c-ink)}
.ag-c-done{width:284px;padding:16px 18px 18px}
.ag-c-donerow{margin-top:12px;display:flex;align-items:center;gap:14px}
.ag-c-donerow .ag-c-seal{margin:0;width:40px;height:40px;border-width:2.5px;box-shadow:0 0 0 7px var(--accent-soft)}
.ag-c-donerow .ag-c-seal svg{width:20px;height:20px}
.ag-c-donerow .ag-c-t{margin:0 0 6px}
/* phone: compact cards */
.ag-c-layer.tall .ag-c-card{padding:10px 11px 11px;border-radius:14px}
.ag-c-layer.tall .ag-c-k{font-size:9.5px;letter-spacing:.12em;min-height:12px;gap:6px}
.ag-c-layer.tall .ag-c-t{font-size:15px;margin-top:3px}
.ag-c-layer.tall .ag-c-t.sm{font-size:14px}
.ag-c-layer.tall .ag-c-fig{margin-top:7px;padding:3px;border-radius:9px}
.ag-c-layer.tall .ag-c-row{height:22px;padding:0 6px;font-size:11px;gap:6px}
.ag-c-layer.tall .ag-c-row > span{font-size:9.5px}
.ag-c-layer.tall .ag-c-ic,.ag-c-layer.tall .ag-c-ic svg{width:12px;height:12px}
.ag-c-layer.tall .ag-c-agent{width:150px}
.ag-c-layer.tall .ag-c-agent .ag-c-st{display:none}
.ag-c-layer.tall .ag-c-row .w{display:none}
.ag-c-layer.tall .ag-c-agent .ag-c-row{display:none}
.ag-c-layer.tall .ag-c-agent .ag-c-row.cur{display:flex}
.ag-c-layer.tall .ag-c-rules [data-f="c"],.ag-c-layer.tall .ag-c-verif [data-f="a"]{display:none}
.ag-c-layer.tall .ag-c-scope{inset:calc(-6px - 12px * (1 - var(--sc,0)))}
.ag-c-layer.tall .ag-c-scope i{width:12px;height:12px}
.ag-c-layer.tall .ag-c-scope b{display:none}
.ag-c-layer.tall .ag-c-stamp{width:22px;height:22px;left:auto;right:8px;top:7px;margin:0;border-width:1.5px;box-shadow:0 0 0 3px var(--accent-soft)}
.ag-c-layer.tall .ag-c-stamp svg{left:2.5px;top:2.5px;width:14px;height:14px}
.ag-c-layer.tall .ag-c-pills i{width:22px;height:15px;font-size:8.5px}
.ag-c-layer.tall .ag-c-agent.back{width:158px}
.ag-c-layer.tall .ag-c-agent.back .ag-c-ic{display:none}
.ag-c-layer.tall .ag-c-agent .ag-c-row > span{font-size:8.5px;letter-spacing:0}
.ag-c-layer.tall .ag-c-sqs{gap:4px} .ag-c-layer.tall .ag-c-sqs i{width:9px;height:9px}
.ag-c-layer.tall .ag-c-ghost{width:158px}
.ag-c-layer.tall .ag-c-ghost .ag-c-t{font-size:14px}
.ag-c-layer.tall .ag-c-clock{width:196px}
.ag-c-layer.tall .ag-c-hms{font-size:25px;margin-top:6px}
.ag-c-layer.tall .ag-c-sub{margin-top:6px;font-size:9px}
.ag-c-layer.tall .ag-c-invite{width:auto;padding:6px 11px;border-radius:999px}
.ag-c-layer.tall .ag-c-invite .ag-c-k{gap:8px}
.ag-c-layer.tall .ag-c-session .ag-c-chip{top:auto;bottom:-11px;left:50%;transform:translateX(-50%)}
.ag-c-layer.tall .ag-c-line{display:none}
.ag-c-layer.tall .ag-c-erc{width:262px}
.ag-c-layer.tall .ag-c-cert{width:148px}
.ag-c-layer.tall .ag-c-seal{width:16px;height:16px;box-shadow:0 0 0 3px var(--accent-soft)}
.ag-c-layer.tall .ag-c-seal svg{width:10px;height:10px}
.ag-c-layer.tall .ag-c-hashbox{margin-top:6px;padding:6px 7px;gap:4px}
.ag-c-layer.tall .ag-c-hash{font-size:9.5px;letter-spacing:.04em}
.ag-c-layer.tall .ag-c-mark{width:100px}
.ag-c-layer.tall .ag-c-mark .ag-c-ring{width:14px;height:14px;border-width:2px;box-shadow:0 0 0 4px var(--accent-soft);margin-bottom:6px}
.ag-c-layer.tall .ag-c-mark .ag-c-time{font-size:9.5px}
.ag-c-layer.tall .ag-c-mark b{font-size:8.5px;margin-top:4px}
.ag-c-layer.tall .ag-c-lk{font-size:9.5px}
.ag-c-layer.tall .ag-c-prop{width:104px;padding:9px 9px 10px;border-radius:12px}
.ag-c-layer.tall .ag-c-prop .ag-c-k{letter-spacing:.06em}
.ag-c-layer.tall .ag-c-cmp{margin-top:8px;gap:6px}
.ag-c-layer.tall .ag-c-cmp em{font-size:8px}
.ag-c-layer.tall .ag-c-pips{gap:3px} .ag-c-layer.tall .ag-c-pips u{width:16px;height:5px}
.ag-c-layer.tall .ag-c-bar{height:5px}
.ag-c-layer.tall .ag-c-pill{height:24px;padding:0 9px;font-size:9px;gap:5px}
.ag-c-layer.tall .ag-c-ct{width:166px}
.ag-c-layer.tall .ag-c-ct .ag-c-k > span:first-child{display:none}
.ag-c-layer.tall .ag-c-ct .ag-c-k .ag-c-chip{margin-left:0}
.ag-c-layer.tall .ag-c-terms{margin-top:6px}
.ag-c-layer.tall .ag-c-terms > div{height:17px;font-size:10px}
.ag-c-layer.tall .ag-c-terms > div > span{font-size:8.5px}
.ag-c-layer.tall .ag-c-terms > div.code{font-size:8px;letter-spacing:-.01em}
.ag-c-layer.tall .ag-c-foot{margin-top:6px;height:21px;font-size:8.5px;padding:0 6px}
.ag-c-layer.tall .ag-c-acc{width:140px}
.ag-c-layer.tall .ag-c-acc .ag-c-hash{display:none}
.ag-c-layer.tall .ag-c-sign{width:96px;height:22px;margin:3px 0 2px}
.ag-c-layer.tall .ag-c-rules{width:160px}
.ag-c-layer.tall .ag-c-settle{width:166px}
.ag-c-layer.tall .ag-c-settle .ag-c-chip{display:none}
.ag-c-layer.tall .ag-c-lockrow{margin-top:7px;padding:6px 7px;gap:8px;border-radius:9px}
.ag-c-layer.tall .ag-c-lock{width:22px;height:24px}
.ag-c-layer.tall .ag-c-slot{width:44px;height:22px;font-size:8.5px}
.ag-c-layer.tall .ag-c-lst{font-size:8.5px}
.ag-c-layer.tall .ag-c-lst .ag-c-time{display:none}
.ag-c-layer.tall .ag-c-verif{width:160px}
.ag-c-layer.tall .ag-c-evid{width:160px;padding:9px 10px 10px}
.ag-c-layer.tall .ag-c-evrow{margin-top:6px;gap:8px}
.ag-c-layer.tall .ag-c-evrow .doc{width:26px;height:30px}
.ag-c-layer.tall .ag-c-evrow b{font-size:11px;margin-bottom:3px}
.ag-c-layer.tall .ag-c-rep{width:160px;padding:10px 11px 11px}
.ag-c-layer.tall .ag-c-repb{margin-top:6px;gap:10px}
.ag-c-layer.tall .ag-c-bars{height:40px;gap:5px} .ag-c-layer.tall .ag-c-bars i{width:15px}
.ag-c-layer.tall .ag-c-reps em{display:none}
.ag-c-layer.tall .ag-c-agent .ag-c-k{display:none}
.ag-c-layer.tall .ag-c-agent .ag-c-t{margin-top:0;padding-right:24px;font-size:14px}
.ag-c-layer.tall .ag-c-cert .ag-c-t{display:none}
.ag-c-layer.tall .ag-c-foot .ag-c-time{font-size:9px}
.ag-c-layer.tall .ag-c-clockp .ag-c-time{display:none}
.ag-c-layer.tall .ag-c-work{width:160px;padding:10px 11px 11px}
.ag-c-layer.tall .ag-c-prog{margin-top:8px;height:6px}
.ag-c-layer.tall .ag-c-done{width:236px;padding:12px 14px 14px}
.ag-c-layer.tall .ag-c-donerow{margin-top:8px;gap:12px}
.ag-c-layer.tall .ag-c-donerow .ag-c-seal{width:32px;height:32px;box-shadow:0 0 0 5px var(--accent-soft)}
/* short wide stages (768 px tall laptops): the scene is drawn smaller, so the mono labels step up */
.ag-c-layer.lo .ag-c-k{font-size:12px;letter-spacing:.05em}
.ag-c-layer.lo .ag-c-row > span{font-size:11.5px;letter-spacing:0}
.ag-c-layer.lo .ag-c-row{font-size:13px}
.ag-c-layer.lo .ag-c-time,.ag-c-layer.lo .ag-c-mark .ag-c-time{font-size:12px}
.ag-c-layer.lo .ag-c-hash{font-size:11.5px;letter-spacing:.04em}
.ag-c-layer.lo .ag-c-sub{font-size:11px;letter-spacing:.06em}
.ag-c-layer.lo .ag-c-mark b,.ag-c-layer.lo .ag-c-lk{font-size:11px;letter-spacing:.08em}
.ag-c-layer.lo .ag-c-chip{font-size:11px;letter-spacing:.05em}
.ag-c-layer.lo .ag-c-pill{font-size:11.5px;letter-spacing:.06em}
.ag-c-layer.lo .ag-c-terms > div > span,.ag-c-layer.lo .ag-c-terms > div.code{font-size:11.5px}
.ag-c-layer.lo .ag-c-foot{font-size:11px;letter-spacing:.05em}
.ag-c-layer.lo .ag-c-lst,.ag-c-layer.lo .ag-c-reps span,.ag-c-layer.lo .ag-c-lst .ag-c-time{font-size:11px;letter-spacing:.05em}
.ag-c-layer.lo .ag-c-cmp em,.ag-c-layer.lo .ag-c-bars b{font-size:10.5px}
`;

/* ---------------- icons ---------------- */
const IC = {
  check: '<svg viewBox="0 0 14 14"><path d="M3.4 7.3l2.4 2.4 4.9-5.4"/></svg>',
  key: '<svg viewBox="0 0 16 16"><circle cx="5" cy="8" r="2.9"/><path d="M7.9 8h6.3M12.1 8v2.5M14.2 8v1.9"/></svg>',
  mail: '<svg viewBox="0 0 16 16"><rect x="1.8" y="3.4" width="12.4" height="9.2" rx="1.6"/><path d="M2.4 4.4L8 8.6l5.6-4.2"/></svg>',
  doc: '<svg viewBox="0 0 16 16"><path d="M4 1.8h5.2L12.4 5v9.2H4z"/><path d="M9 1.8v3.4h3.4M6 8.4h4.4M6 10.8h4.4"/></svg>',
  lock: '<svg class="ag-c-lock" viewBox="0 0 30 32"><path class="sh" d="M9.5 15v-4.5a5.5 5.5 0 0 1 11 0V15"/><rect x="5.5" y="15" width="19" height="13.5" rx="3.5"/><path d="M15 20.2v3"/></svg>',
  sign: '<svg class="ag-c-sign" viewBox="0 0 132 30"><path d="M3 22c5-9 9-15 12-13s-4 13 1 13 9-16 13-15-2 12 3 12 7-10 11-10 1 9 6 9 9-7 13-8 5 5 10 5 9-4 13-6 11 1 18-2 10-3 17-4"/></svg>'
};
const row = (f, label, cls = '', icon = IC.check) => `<div class="ag-c-row ${cls}" data-f="${f}"><i class="ag-c-ic">${icon}</i><em>${label}</em><span>&mdash;</span></div>`;
/* story clock: 12:04:31.114 at T = 0, so every timestamp on screen comes from the same clock */
const tstr = (T) => {
  const v = 43471.114 + T; const h = Math.floor(v / 3600), m = Math.floor(v / 60) % 60, s = Math.floor(v) % 60;
  const ms = Math.min(999, Math.round((v - Math.floor(v)) * 1000));
  return [String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'), '.' + String(ms).padStart(3, '0')];
};
const tHTML = (T) => { const [a, b] = tstr(T); return a + '<em>' + b + '</em>'; };

/* ---------------- card markup ---------------- */
const SQ = '<i class="g"></i><i class="b"></i><i class="o"></i>';
function agentFront(name) {
  return `<div class="ag-c-card ag-c-agent">
    <div class="ag-c-k"><span>Agent</span><i class="ag-c-st"></i></div>
    <div class="ag-c-t">${name}</div>
    <div class="ag-c-fig">${row('ses', 'Session')}${row('id', 'Identity')}${row('sig', 'Signature', '', IC.key)}</div>
    <div class="ag-c-scope"><i></i><i></i><i></i><i></i><b>Scoped</b></div>
    <div class="ag-c-stamp">${IC.key}</div></div>`;
}
function agentBack(name, buyer) {
  return `<div class="ag-c-card ag-c-agent back">
    <div class="ag-c-k"><span>Agent</span><i class="ag-c-st on"></i></div>
    <div class="ag-c-t">${name}</div>
    <div class="ag-c-fig">
      <div class="ag-c-row cur" data-f="sq"><em>${buyer ? 'Needs' : 'Capabilities'}</em><span class="ag-c-sqs">${SQ}</span></div>
      ${buyer ? row('st', 'Contract') : `<div class="ag-c-row pre" data-f="st"><i class="ag-c-ic">${IC.check}</i><em>Work</em><span class="ag-c-wd">&mdash;</span><span class="ag-c-pills"><i>M1</i><i>M2</i><i>M3</i></span></div>`}
    </div></div>`;
}
const ghost = (sq) => `<div class="ag-c-card ag-c-ghost"><div class="ag-c-k"><span>Agent</span><i class="ag-c-st on"></i></div>
  <div class="ag-c-t">Provider agent<span class="ag-c-sqs">${sq}</span></div></div>`;
const prop = (L, scope, ms, ev) => `<div class="ag-c-card ag-c-prop"><div class="ag-c-k"><span><b>${L}</b>&nbsp;Proposal</span><i class="ag-c-st"></i></div>
  <div class="ag-c-cmp"><div><em>Scope</em><i class="ag-c-bar"><u style="width:${scope}%"></u></i></div>
  <div><em>Milestones</em><i class="ag-c-pips">${[0, 1, 2].map((i) => `<u class="${i < ms ? '' : 'x'}"></u>`).join('')}</i></div>
  <div><em>Evidence</em><i class="ag-c-pips">${[0, 1, 2].map((i) => `<u class="${i < ev ? '' : 'x'}"></u>`).join('')}</i></div></div></div>`;
const certHTML = `<div class="ag-c-card ag-c-cert"><div class="ag-c-k"><span>Certificate</span><span class="ag-c-seal">${IC.check}</span></div>
  <div class="ag-c-t sm">Handshake</div>
  <div class="ag-c-hashbox"><span class="ag-c-hash">9f3a 61c2 e07b 5d14</span><span class="ag-c-sub" data-f="cs">Buyer &middot; Provider</span></div></div>`;
const accHTML = `<div class="ag-c-card ag-c-acc"><div class="ag-c-k"><span>Acceptance</span><span class="ag-c-seal">${IC.check}</span></div>
  ${IC.sign}<span class="ag-c-hash">7c1e a94f 22d0</span></div>`;

const HTML = {
  session: [`<div class="ag-c-session"><span class="ag-c-chip">Private session</span></div>`],
  buyer: [agentFront('Buyer agent'), agentBack('Buyer agent', true)],
  provider: [agentFront('Provider agent'), agentBack('Provider agent', false)],
  clock: [`<div class="ag-c-card ag-c-clock"><div class="ag-c-k"><i class="ag-c-ring sm"></i><span>Clockchain</span></div>
    <div class="ag-c-hms" data-f="hms">12:04:31<em>.114</em></div>
    <div class="ag-c-sub"><b data-f="st">Verifiable time</b></div></div>`],
  clockp: [`<div class="ag-c-pill ag-c-clockp"><i class="ag-c-ring sm"></i><b>Clockchain</b><span class="ag-c-time" data-f="hms"></span></div>`],
  invite: [`<div class="ag-c-card ag-c-invite"><div class="ag-c-k"><span>Invite</span><span class="r">${IC.mail}</span></div>
    <div class="ag-c-line">Buyer<i>&rarr;</i>Provider agent</div></div>`],
  erc: [`<div class="ag-c-card ag-c-erc"><div class="ag-c-k"><span>Identity check</span><span class="ag-c-chip">ERC-8004</span></div>
    <div class="ag-c-fig">${row('b', 'Buyer agent')}${row('p', 'Provider agent')}</div></div>`],
  certA: [certHTML], certB: [certHTML],
  same: [`<div class="ag-c-pill">Identical</div>`],
  chan: [`<div class="ag-c-pill">Witnessed channel</div>`],
  lk: [`<div class="ag-c-lk">Ledger</div>`],
  pg1: [ghost('<i class="g"></i><i class="x"></i><i class="o"></i>')],
  pg2: [ghost('<i class="x"></i><i class="b"></i><i class="x"></i>')],
  match: [`<div class="ag-c-pill">Match</div>`],
  propA: [prop('A', 58, 2, 1)], propB: [prop('B', 92, 3, 3)], propC: [prop('C', 74, 3, 1)],
  ctl: [`<div class="ag-c-card ag-c-ct"><div class="ag-c-k"><span>Agent contract</span><span class="ag-c-chip n r">People</span></div>
    <div class="ag-c-terms">
      <div><em>Scope</em><span>agreed</span></div><div><em>Milestones</em><span>M1 &middot; M2 &middot; M3</span></div>
      <div><em>Evidence</em><span>per milestone</span></div><div><em>Pricing</em><span>agreed</span></div>
      <div><em>Payment gates</em><span>per milestone</span></div></div>
    <div class="ag-c-foot"><em>Anchored</em><span class="ag-c-time" data-f="at">&mdash;</span></div></div>`],
  ctr: [`<div class="ag-c-card ag-c-ct"><div class="ag-c-k"><span>Agent contract</span><span class="ag-c-chip n r">Machines</span></div>
    <div class="ag-c-terms">
      <div class="code"><i>scope</i><s>:</s>&nbsp;agreed</div><div class="code"><i>milestones</i><s>:</s>&nbsp;[M1, M2, M3]</div>
      <div class="code"><i>evidence</i><s>:</s>&nbsp;per_milestone</div><div class="code"><i>pricing</i><s>:</s>&nbsp;agreed</div>
      <div class="code"><i>payment_gates</i><s>:</s>&nbsp;per_milestone</div></div>
    <div class="ag-c-foot"><em>Hash</em><span class="ag-c-hash">7c1e a94f 22d0</span></div></div>`],
  accA: [accHTML], accB: [accHTML],
  rules: [`<div class="ag-c-card ag-c-rules"><div class="ag-c-k"><span>Agent contract</span><i class="ag-c-st on"></i></div>
    <div class="ag-c-fig">${row('r', 'Rules')}${row('c', 'Conditions')}${row('f', 'Funds', 'neg')}</div></div>`],
  settle: [`<div class="ag-c-card ag-c-settle"><div class="ag-c-k"><span>Settlement provider</span><span class="ag-c-chip n r">External</span></div>
    <div class="ag-c-lockrow">${IC.lock}<div class="ag-c-slot">Funds</div><div class="ag-c-lst"><b data-f="ls">Open</b><span class="ag-c-time" data-f="lt">&nbsp;</span></div></div></div>`],
  funds: [`<div class="ag-c-pill blue"><i></i>Funds</div>`],
  pay: [`<div class="ag-c-pill blue"><i></i>M1</div>`],
  work: [`<div class="ag-c-card ag-c-work"><div class="ag-c-k"><span>Work</span><span class="ag-c-chip r">M1</span></div>
    <div class="ag-c-prog"><i data-f="wp"></i></div><div class="ag-c-sub"><b data-f="ws">In progress</b></div></div>`],
  money: [`<div class="ag-c-pill blue"><i></i>Money path</div>`],
  verif: [`<div class="ag-c-card ag-c-verif"><div class="ag-c-k"><span>Verification</span><span class="ag-c-chip r" data-f="m">M1</span></div>
    <div class="ag-c-fig">${row('a', 'Scope')}${row('b', 'Milestone')}${row('c', 'Evidence')}</div></div>`],
  evid: [`<div class="ag-c-card ag-c-evid"><div class="ag-c-k"><span>Evidence package</span></div>
    <div class="ag-c-evrow"><span class="doc">${IC.doc}</span><div><b>Audit trail</b><span class="ag-c-hash">e5d1 0b7a 93c4</span></div></div></div>`],
  rep: [`<div class="ag-c-card ag-c-rep"><div class="ag-c-k"><span>Reputation</span></div>
    <div class="ag-c-repb"><div class="ag-c-bars"><i><u data-f="b1"></u><b>M1</b></i><i><u data-f="b2"></u><b>M2</b></i><i><u data-f="b3"></u><b>M3</b></i></div>
    <div class="ag-c-reps"><em>Provider agent</em><span data-f="rs">Updated</span></div></div></div>`],
  done: [`<div class="ag-c-card ag-c-done"><div class="ag-c-k"><span>Project complete</span></div>
    <div class="ag-c-donerow"><span class="ag-c-seal">${IC.check}</span><div><div class="ag-c-t sm">Record closed</div><span class="ag-c-time" data-f="at"></span></div></div></div>`]
};
const TERMS = ['Scope', 'Milestones', 'Evidence', 'Pricing', 'Payment gates'];
TERMS.forEach((t, i) => { HTML['term' + i] = [`<div class="ag-c-pill ag-c-term"><i class="l">&larr;</i><span>${t}</span><i class="r">&rarr;</i></div>`]; });
const MARKS = [
  { id: 'mHS', label: 'Handshake', T: 23.8 },
  { id: 'mCT', label: 'Contract', T: 41.65 },
  { id: 'mM1', label: 'M1', T: 55.45 },
  { id: 'mM2', label: 'M2', T: 62.9 },
  { id: 'mM3', label: 'M3', T: 64.5 },
  { id: 'mOK', label: 'Complete', T: 65.95 }
];
MARKS.forEach((m) => { HTML[m.id] = [`<div class="ag-c-mark"><i class="ag-c-ring"></i><span class="ag-c-time">${tHTML(m.T)}</span><b>${m.label}</b></div>`]; });

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
  const ag = N.buyer.faces[0].el, se = N.session.faces[0].el;
  const aw = ag.offsetWidth, ah = ag.offsetHeight;
  if (W) { se.style.width = (2 * 340 + aw + 72) + 'px'; se.style.height = (ah + 60) + 'px'; }
  else { se.style.width = '340px'; se.style.height = (ah + 48) + 'px'; }
  for (const id of ['clock']) {
    const el = N[id].faces[0].el, hm = el.querySelector('.ag-c-hms');
    el.style.width = '';
    const cs = getComputedStyle(el), need = hm.scrollWidth + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 10;
    if (need > el.offsetWidth) el.style.width = Math.ceil(need) + 'px';
  }
  for (const id in N) {
    const n = N[id];
    n.faces.forEach((f, i) => { n.size[i] = { w: f.el.offsetWidth, h: f.el.offsetHeight }; });
  }
  for (const m of MARKS) N[m.id].ay = -(N[m.id].size[0].h / 2 - (W ? 9 : 7));
  /* the machine half of the contract turns about its left edge */
  N.ctr.ox = N.ctr.size[0].w / 2; N.ctr.faces[0].obj.position.x = N.ctr.ox;
  const sl = N.settle.faces[0].el.querySelector('.ag-c-slot'), st = N.settle.faces[0].el;
  N.settle.slot = { x: sl.offsetLeft + sl.offsetWidth / 2 - st.offsetWidth / 2, y: -(sl.offsetTop + sl.offsetHeight / 2 - st.offsetHeight / 2) };
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
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _ta = new THREE.Vector3(), _tb = new THREE.Vector3(), _o = new THREE.Vector3();
/* a point at u along the link a -> b, computed from layout specs (moves a token along its line) */
function alongSpec(C, ep0, ep1, u, bend = 0.42) {
  portFromSpec(ep0[0], ep0[1], C[ep0[0]], _a, _ta); portFromSpec(ep1[0], ep1[1], C[ep1[0]], _d, _tb);
  const k = bend * _a.distanceTo(_d);
  _b.copy(_a).addScaledVector(_ta, k); _c.copy(_d).addScaledVector(_tb, k);
  return bez(_a, _b, _c, _d, eio(u), _o).clone();
}
function slotPos(sp) {
  const n = N.settle, s = n.slot || { x: 0, y: 0 };
  _a.set(s.x, s.y, 2).applyMatrix4(specMatrix(n, sp));
  return { x: _a.x, y: _a.y, z: _a.z + 8 };
}

/* a point at u along a link as the layout describes it (bezier or routed), by arc length like the pulses */
function epSpec(C, ep, P, Tn) {
  if (Array.isArray(ep)) return portFromSpec(ep[0], ep[1], C[ep[0]], P, Tn);
  P.set(ep.x, ep.y, ep.z || 0); Tn.set(ep.dir ? ep.dir[0] : 0, ep.dir ? ep.dir[1] : 0, 0);
}
function alongLink(C, L, u) {
  epSpec(C, L.a, _P0, _T0); epSpec(C, L.b, _P3, _T3);
  buildPath(L);
  pathAt(PATH.len * eio(clamp(u)), _Q);
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
const LYW = -176, LYT = -134, X2W = 1250, X2T = 700;
/* where each ledger mark sits on the axis. Wide: fixed slots. Phone: the newest three, centred. */
const MXW = { mCT: -200, mM1: 110, mM2: 215, mM3: 320, mOK: 425 };
function marksAt(tEnd) { return MARKS.filter((m) => m.T < tEnd); }
function phoneSlots(list) {
  const r = {}, l = list.filter((m) => m.id !== 'mHS').slice(-3);
  const xs = l.length === 1 ? [0] : l.length === 2 ? [-56, 56] : [-104, 0, 104];
  l.forEach((m, j) => { r[m.id] = xs[j]; });
  return r;
}
/* a card lights up between a and b (story seconds inside the beat), with a short ramp */
const onAt = (lt, a, b = 1e9) => Math.min(seg(lt, a, a + 0.3), 1 - seg(lt, b, b + 0.3));

function L(bi, lt) {
  const id = BEATS[bi].id, t0 = BEATS[bi].t0, T = t0 + lt, tEnd = t0 + BEATS[bi].dur;
  const C = {}, K = {};
  let cam = { x: 0, y: 0, zoom: 1, yaw: 0, pitch: 2 };
  const w = W;
  const pick = (a, b) => (w ? a : b);
  const AX = pick(372, 84), AY = pick(18, 41), TILT = pick(7 * DEG, 0);
  const LY = pick(LYW, LYT), X2 = pick(X2W, X2T);
  const PS = w ? null : phoneSlots(marksAt(tEnd));
  const mx = (mid) => X2 + (w ? MXW[mid] : (PS[mid] == null ? 0 : PS[mid]));
  const buyer = (o) => A(-AX, AY, 0, Object.assign({ ry: TILT }, o));
  const provider = (o) => A(AX, AY, 0, Object.assign({ ry: -TILT }, o));
  const G = 'g', NN = 'n', B = 'b';
  const pulse = (t, a, b, rev) => { const k = seg(t, a, b); return k > 0 && k < 1 ? [{ u: rev ? 1 - eio(k) : eio(k) }] : []; };
  const amb = (speed, n, rev, ph = 0) => { const r = []; for (let i = 0; i < n; i++) { const u = fract(T * speed + i / n + ph); r.push({ u: rev ? 1 - u : u, soft: 1 }); } return r; };
  const ledger = (x) => ({ x, y: LY, z: 0, dir: [0, 1] });
  /* anchoring something to the ledger: down to a bus just above the axis, across, then into the mark;
     when the source sits too close to the axis for that, a straight drop. Never below the axis. */
  const anc = (a, x, o, bus) => Object.assign({ a, b: ledger(x), c: G, w: 1.6 }, bus ? { via: [[null, LY + 18, 0], [x, LY + 18, 0]] } : { bend: 0 }, o);
  const lk1 = () => (w ? A(-462, LY + 19, 0) : A(138, LY - 15, 0));
  const CLK1 = pick(AY, -86);            /* where Clockchain sits while the agents meet (phone: under them) */
  const C1Y = pick(20, 18);               /* chapter-1 framing: the group sits on the stage centre */
  /* phone: when a card needs the space under the agents, Clockchain folds into its pill on the ledger */
  const clockToLedger = (d = 0.45) => { C.clock = A(-112, LY, -30, { o: 0, s: 0.45, mv: 0.7 }); C.clockp = A(-112, LY, 10, { ent: 'fade', d }); };

  switch (id) {
    /* ===================== CHAPTER 1 · HANDSHAKE ===================== */
    case 'meet0': {
      C.buyer = buyer({ d: 0.15 }); C.provider = provider({ d: 0.42 }); C.clock = A(0, CLK1, -30, { d: 0.28 });
      cam = { x: 0, y: C1Y, zoom: lerp(0.95, 1, eo(seg(lt, 0, 4.5))), yaw: -1.5, pitch: 2 };
      break;
    }
    case 'invite0': {
      C.buyer = buyer(); C.provider = provider(); C.clock = A(0, CLK1, -30, { on: onAt(lt, 1.6, 2.6) });
      const u1 = eio(seg(lt, 0.8, 1.9)), u2 = eio(seg(lt, 2.4, 3.5)), first = lt < 2.15;
      const fade = seg(lt, 0.25, 0.6);
      if (w) {
        /* it starts just clear of the buyer card, arcs over Clockchain and lands just clear of the provider */
        const e = AX - 124 - 99 - 12;
        const x = first ? lerp(-e, 0, u1) : lerp(0, e, u2);
        C.invite = A(x, AY + 88 + 16 * (1 - (x / e) * (x / e)), 40, { fx: 1, ent: 'fade', o: fade, ry: lerp(TILT, -TILT, first ? u1 * 0.5 : 0.5 + u2 * 0.5) });
      } else {
        const x = first ? lerp(-AX, 0, u1) : lerp(0, AX, u2);
        C.invite = A(x, -18, 20, { fx: 1, ent: 'fade', o: fade });
      }
      const pa = w ? ['buyer', 'r'] : ['buyer', 'b'], pb = w ? ['clock', 'l'] : ['clock', 't-56'];
      const qa = w ? ['clock', 'r'] : ['clock', 't56'], qb = w ? ['provider', 'l'] : ['provider', 'b'];
      K.bc = { a: pa, b: pb, c: NN, d: 0.45 };
      K.cp = { a: qa, b: qb, c: NN, d: 0.6 };
      K.bcg = { a: pa, b: pb, c: G, w: 1.6, draw: u1, pulses: u1 > 0 && u1 < 1 ? [{ u: u1 }] : [] };
      K.cpg = { a: qa, b: qb, c: G, w: 1.6, draw: u2, pulses: u2 > 0 && u2 < 1 ? [{ u: u2 }] : [] };
      cam = { x: 0, y: C1Y, zoom: 1, yaw: 1, pitch: 2 };
      break;
    }
    case 'join0': {
      const J = pick(340, 84);
      C.buyer = A(-J, AY, -10, { ry: TILT * 0.6 }); C.provider = A(J, AY, -10, { ry: -TILT * 0.6 });
      C.clock = A(0, CLK1, -30);
      /* the session is a bounded space: it settles in place behind everything, no flip */
      C.session = A(0, AY, -40, { d: 0.1, ent: 'fade' });
      const pa = w ? ['buyer', 'r'] : ['buyer', 'b'], pb = w ? ['clock', 'l'] : ['clock', 't-56'];
      const qa = w ? ['clock', 'r'] : ['clock', 't56'], qb = w ? ['provider', 'l'] : ['provider', 'b'];
      K.bcg = { a: pa, b: pb, c: G, w: 1.6, al: 0.45 }; K.cpg = { a: qa, b: qb, c: G, w: 1.6, al: 0.45 };
      cam = { x: 0, y: pick(16, 18), zoom: pick(0.985, 1), yaw: 0, pitch: 2 };
      break;
    }
    case 'verify0': {
      C.buyer = buyer(); C.provider = provider();
      if (w) C.clock = A(0, 88, -30); else clockToLedger(0.6);
      C.erc = A(0, pick(-62, -60), 20, { d: 0.35, on: onAt(lt, 1.9) });
      C.lk = lk1(); C.lk.d = 0.9;
      const ep = w ? [['buyer', 'b72'], ['erc', 'l'], ['provider', 'b-72'], ['erc', 'r']] : [['buyer', 'b'], ['erc', 't-62'], ['provider', 'b'], ['erc', 't62']];
      K.be = { a: ep[0], b: ep[1], c: G, d: 0.55, pulses: pulse(lt, 0.8, 1.5) };
      K.pe = { a: ep[2], b: ep[3], c: G, d: 0.65, pulses: pulse(lt, 0.95, 1.65) };
      K.el = { a: ['erc', 'b'], b: ledger(0), c: G, d: 1.0, pulses: pulse(lt, 1.6, 2.1, true) };
      cam = { x: 0, y: pick(-2, 0), zoom: 1, yaw: 0, pitch: 2.5 };
      break;
    }
    case 'handshake0': {
      C.buyer = buyer({ on: onAt(lt, 0.4) }); C.provider = provider({ on: onAt(lt, 0.6) });
      if (w) C.clock = A(0, 88, -30);
      else { C.clock = A(0, -80, -30, { d: 0.15 }); C.clockp = A(-112, LY, 10, { o: 0, mv: 0.5 }); }
      C.lk = lk1();
      cam = { x: 0, y: 0, zoom: 1, yaw: -1, pitch: 2 };
      break;
    }
    case 'handshake1': case 'handshake2': {
      const h2 = id === 'handshake2';
      C.buyer = buyer(); C.provider = provider();
      C.lk = lk1();
      if (w) {
        /* the same certificate lands at each agent; Clockchain issued it (dashed), the agents hold it (solid) */
        const CX = 108, CY = -44;
        C.clock = A(0, 88, -30, { on: h2 ? 1 : 0, dm: h2 ? 0 : 0.4 });
        C.certA = A(-CX, CY, 24, { d: 0.42, ry: 4 * DEG, on: h2 });
        C.certB = A(CX, CY, 24, { d: 0.55, ry: -4 * DEG, on: h2 });
        K.ac = { a: ['buyer', 'r-50'], b: ['certA', 'l' + (AY - 50 - CY)], c: G, w: 1.6, bend: 0, d: 0.75, pulses: h2 ? [] : pulse(lt, 0.85, 1.25) };
        K.pc = { a: ['provider', 'l-50'], b: ['certB', 'r' + (AY - 50 - CY)], c: G, w: 1.6, bend: 0, d: 0.85, pulses: h2 ? [] : pulse(lt, 0.95, 1.35) };
        K.ca = { a: ['clock', 'l'], b: ['certA', 't'], c: G, dash: 4, al: h2 ? 0.35 : 0.75, pulses: h2 ? [] : pulse(lt, 0.0, 0.55) };
        K.cb = { a: ['clock', 'r'], b: ['certB', 't'], c: G, dash: 4, al: h2 ? 0.35 : 0.75, pulses: h2 ? [] : pulse(lt, 0.0, 0.55) };
        if (!h2) {
          K.tw = { a: ['certA', 'b'], b: ['certB', 'b'], via: [[null, -140], [CX, -140]], c: G, dash: 4, d: 0.9 };
          C.same = A(0, -140, 20, { d: 1.0, ent: 'fade' });
        } else {
          C.same = A(0, -140, 20, { o: 0, mv: 0.35 });
          K.an = anc(['certA', 'b'], 0, { d: 0.3, pulses: pulse(lt, 0.35, 0.95) }, true);
          K.an2 = anc(['certB', 'b'], 0, { d: 0.3, pulses: pulse(lt, 0.35, 0.95) }, true);
        }
      } else {
        clockToLedger();
        C.certA = A(-82, -64, 0, { d: 0.42, on: h2 }); C.certB = A(82, -64, 0, { d: 0.55, on: h2 });
        K.ca = { a: ['buyer', 'b'], b: ['certA', 't'], c: G, w: 1.6, al: h2 ? 0.5 : 1, pulses: h2 ? [] : pulse(lt, 0.0, 0.5) };
        K.cb = { a: ['provider', 'b'], b: ['certB', 't'], c: G, w: 1.6, al: h2 ? 0.5 : 1, pulses: h2 ? [] : pulse(lt, 0.0, 0.5) };
        if (h2) {
          K.an = anc(['certA', 'b'], 0, { d: 0.1, pulses: pulse(lt, 0.15, 0.8) });
          K.an2 = anc(['certB', 'b'], 0, { d: 0.1, pulses: pulse(lt, 0.15, 0.8) });
        }
      }
      cam = h2 ? { x: 0, y: 0, zoom: 1, yaw: 0, pitch: 2.5 } : { x: 0, y: 0, zoom: 1, yaw: 1, pitch: 2 };
      break;
    }
    case 'handshake3': {
      C.buyer = buyer({ on: 1 }); C.provider = provider({ on: 1 });
      C.lk = lk1();
      if (w) {
        C.clock = A(0, 96, -40, { on: 1 });
        K.ch1 = { a: ['buyer', 'r-24'], b: ['provider', 'l-24'], c: G, w: 1.6, bend: 0, d: 0.2, pulses: lt > 0.8 ? amb(0.42, 2, false) : [] };
        K.ch2 = { a: ['buyer', 'r-44'], b: ['provider', 'l-44'], c: G, w: 1.6, bend: 0, d: 0.3, pulses: lt > 0.8 ? amb(0.42, 2, true, 0.25) : [] };
        K.wit = { a: ['clock', 'b'], b: { x: 0, y: AY - 20, z: 0, dir: [0, 1] }, c: G, dash: 4, d: 0.55 };
        C.chan = A(0, AY - 84, 30, { d: 0.75 });
      } else {
        /* two parallel lines under the agents, labelled in the middle; Clockchain witnesses from the ledger */
        C.clock = A(-112, LY, -30, { o: 0, s: 0.45 }); C.clockp = A(-112, LY, 10, { on: 1 });
        K.ch1 = { a: ['buyer', 'b-30'], b: ['provider', 'b30'], via: [[null, -38], [AX + 30, -38]], c: G, w: 1.6, d: 0.2, pulses: lt > 0.8 ? amb(0.4, 2, false) : [] };
        K.ch2 = { a: ['buyer', 'b-10'], b: ['provider', 'b10'], via: [[null, -24], [AX + 10, -24]], c: G, w: 1.6, d: 0.3, pulses: lt > 0.8 ? amb(0.4, 2, true, 0.25) : [] };
        C.chan = A(0, -31, 30, { d: 0.75, ent: 'fade' });
        K.wit = { a: ['clockp', 't'], b: ['chan', 'b'], via: [[null, -82], [0, -82]], c: G, dash: 3, d: 0.55 };
      }
      cam = { x: 0, y: 0, zoom: 1, yaw: -1, pitch: 2 };
      break;
    }
    /* ===================== CHAPTER 2 · CONTRACT ===================== */
    case 'align0': case 'align1': {
      const a1 = id === 'align1', mv = 1.35, NX = pick(375, 84);
      if (w) {
        C.buyer = A(X2 - NX, 0, 0, { face: 1, ry: TILT, mv, dm: a1 ? 0.7 : 0 });
        C.provider = A(X2 + NX, 0, 10, { face: 1, ry: -TILT, mv, on: a1 ? 0 : onAt(lt, 1.95), dm: a1 ? 0.7 : 0 });
        const gh = a1 ? 0.5 : lt > 2.05 ? 0.6 : 1;
        C.pg1 = A(X2 + NX, 122, -10, { d: 0.7, ry: -TILT, s: 0.85, o: gh });
        C.pg2 = A(X2 + NX, -120, -10, { d: 0.85, ry: -TILT, s: 0.85, o: gh });
        C.clockp = A(X2 - 400, LY, 10, { d: 0.9 }); C.lk = A(X2 - 262, LY + 19, 0, { d: 1.0 });
        K.d1 = { a: ['buyer', 'r20'], b: ['pg1', 'l'], c: NN, d: 1.0, al: a1 ? 0.35 : lt > 2.05 ? 0.5 : 1, pulses: a1 ? [] : pulse(lt, 1.3, 1.9) };
        K.d2 = { a: ['buyer', 'r-20'], b: ['pg2', 'l'], c: NN, d: 1.1, al: a1 ? 0.35 : lt > 2.05 ? 0.5 : 1, pulses: a1 ? [] : pulse(lt, 1.35, 1.95) };
        K.dm = { a: ['buyer', 'r'], b: ['provider', 'l'], c: NN, d: 1.05, al: a1 ? 0 : 1, pulses: a1 ? [] : pulse(lt, 1.3, 1.85) };
        K.dmg = { a: ['buyer', 'r'], b: ['provider', 'l'], c: G, w: 1.6, al: a1 ? 0.4 : 1, draw: a1 ? 1 : eio(seg(lt, 1.85, 2.3)) };
        if (!a1) C.match = A(X2, 0, 40, { d: 2.1 });
      } else {
        C.buyer = A(X2 - NX, AY, 0, { face: 1, mv, dm: a1 ? 0.7 : 0 });
        C.provider = A(X2 + NX, AY, 0, { face: 1, mv, on: a1 ? 0 : onAt(lt, 1.95), dm: a1 ? 0.7 : 0 });
        if (!a1) {
          const gh = lt > 2.05 ? 0.6 : 1;
          C.pg1 = A(X2 - 84, -95, 0, { d: 0.7, o: gh }); C.pg2 = A(X2 + 84, -95, 0, { d: 0.85, o: gh });
          /* one trunk down from the buyer to both other providers; the match runs under the agents, labelled */
          K.d1 = { a: ['buyer', 'b'], b: ['pg1', 't'], c: NN, d: 1.0, al: lt > 2.05 ? 0.5 : 1, pulses: pulse(lt, 1.3, 1.9) };
          K.d2 = { a: ['buyer', 'b'], b: ['pg2', 't'], via: [[null, -50], [X2 + 84, -50]], c: NN, d: 1.1, al: lt > 2.05 ? 0.5 : 1, pulses: pulse(lt, 1.35, 1.95) };
          K.dmg = { a: ['buyer', 'b40'], b: ['provider', 'b-40'], via: [[null, -22], [X2 + 44, -22]], c: G, w: 1.6, draw: eio(seg(lt, 1.85, 2.3)) };
          C.match = A(X2, -22, 40, { d: 2.1 });
        }
      }
      if (a1) {
        /* proposals leave from just inside each source card's edge and fade in, so text never crosses text */
        const tile = (key, from, tx, d) => {
          const k = eo(seg(lt, d, d + 0.7));
          const f = w ? C[from] : (from === 'pg1' ? A(X2 - 84, -95) : from === 'pg2' ? A(X2 + 84, -95) : C.provider);
          const ty = pick(0, -66), sx = lerp(w ? f.x - 130 : f.x, tx, 0.35), sy = lerp(f.y, ty, 0.35);
          C[key] = A(lerp(sx, tx, k), lerp(sy, ty, k), lerp(pick(40, 20), 6, k),
            { fx: 1, o: seg(lt, d, d + 0.25), ry: lerp(w ? -TILT : 0, 0, k), on: key === 'propB' ? onAt(lt, 1.5) : 0 });
        };
        tile('propA', 'pg1', X2 - pick(166, 112), 0.1); tile('propB', 'provider', X2, 0.4); tile('propC', 'pg2', X2 + pick(166, 112), 0.7);
      }
      cam = a1 ? { x: X2, y: 0, zoom: 1, yaw: -1, pitch: 2 } : { x: X2, y: 0, zoom: 1, yaw: 1, pitch: 2, mv: 1.4 };
      break;
    }
    case 'align2': {
      const NX = pick(375, 84);
      C.buyer = A(X2 - NX, pick(6, AY), 0, { face: 1, ry: TILT, on: 1 });
      C.provider = A(X2 + NX, pick(6, AY), 0, { face: 1, ry: -TILT, on: 1 });
      if (w) { C.clockp = A(X2 - 400, LY, 10); C.lk = A(X2 - 262, LY + 19, 0); }
      const conv = eio(seg(lt, 2.25, 3.0));
      TERMS.forEach((t, i) => {
        const ph = [0, 2.2, 4.1, 1.1, 3.2][i];
        const amp = pick(150, 84);
        const a = 2 * Math.PI * 0.42 * lt + ph;
        C['term' + i] = A(X2 + amp * Math.sin(a) * (1 - conv), pick(78 - i * 38, -18 - i * 25), 30,
          { fx: 1, o: seg(lt, 0.08 * i, 0.08 * i + 0.4), dir: conv > 0.5 ? 0 : Math.cos(a) >= 0 ? 1 : -1 });
      });
      K.ng = { a: w ? ['buyer', 'r'] : ['buyer', 'b'], b: w ? ['provider', 'l'] : ['provider', 'b'], c: NN, d: 0.1, bend: w ? 0.42 : 1.1 };
      cam = { x: X2, y: pick(2, 0), zoom: 1, yaw: 1, pitch: 2 };
      break;
    }
    case 'agree0': case 'agree1': {
      const a1 = id === 'agree1';
      const hinge = a1 ? 0 : -178 * DEG * (1 - eio(seg(lt, 0.6, 1.45)));
      let land;                              /* where term i lands on the people side of the contract */
      if (w) {
        const NX = 375, cy = 8;
        C.buyer = A(X2 - NX, a1 ? -52 : 6, 0, { face: 1, ry: TILT, dm: a1 ? 0.5 : 0 });
        C.provider = A(X2 + NX, a1 ? -52 : 6, 0, { face: 1, ry: -TILT, dm: a1 ? 0.5 : 0 });
        C.clockp = A(X2 - 400, LY, 10); C.lk = A(X2 - 262, LY + 19, 0);
        C.ctl = A(X2 - 120, cy, 0, { d: a1 ? 0 : 0.1, on: a1 });
        C.ctr = A(X2 + 4, cy, 0, { ry: hinge, d: a1 ? 0 : 0.6, nf: 1, fx: 1, on: a1 });
        const kd = a1 ? -60 : 0;
        K.bk = { a: ['buyer', 'r'], b: ['ctl', 'l' + kd], c: a1 ? G : NN, bend: 0, d: 1.35, al: a1 ? 0.8 : 1 };
        K.pk = { a: ['ctr', 'r' + kd], b: ['provider', 'l'], c: a1 ? G : NN, bend: 0, d: 1.45, al: a1 ? 0.8 : 1 };
        if (a1) {
          C.accA = A(X2 - 368, 84, 24, { s: 0.8, d: 0.75, ry: TILT, on: 1 });
          C.accB = A(X2 + 368, 84, 24, { s: 0.8, d: 0.9, ry: -TILT, on: 1 });
          K.ka = { a: ['ctl', 'l60'], b: ['accA', 'r'], c: G, d: 0.35, pulses: pulse(lt, 0.4, 0.85) };
          K.kb = { a: ['ctr', 'r60'], b: ['accB', 'l'], c: G, d: 0.45, pulses: pulse(lt, 0.5, 0.95) };
          K.an = anc(['ctl', 'b'], mx('mCT'), { d: 0.1, pulses: pulse(lt, 0.25, 0.9) }, true);
        }
        land = (i) => [X2 - 150, cy + 52 - i * 25];
      } else {
        /* phone: the agents step aside so the two readings of the contract fill the stage */
        const S = 0.9, cy = 14;
        C.ctl = A(X2 - 75, cy, 0, { s: S, d: a1 ? 0 : 0.1, on: a1 });
        C.ctr = A(X2 + 1, cy, 0, { s: S, ry: hinge, d: a1 ? 0 : 0.6, nf: 1, fx: 1, on: a1 });
        if (a1) {
          C.accA = A(X2 - 90, -92, 0, { s: 0.85, d: 0.75, on: 1 }); C.accB = A(X2 + 90, -92, 0, { s: 0.85, d: 0.9, on: 1 });
          K.an = anc(['ctl', 'b70'], mx('mCT'), { d: 0.1, pulses: pulse(lt, 0.25, 0.9) });
        }
        land = (i) => [X2 - 100, cy + (40 - i * 17) * S];
      }
      if (!a1) {
        /* the five terms fly onto the contract and dissolve into its rows (the rows appear as each pill fades) */
        TERMS.forEach((t, i) => {
          const k = eio(seg(lt, 0.05 + i * 0.05, 0.7 + i * 0.05));
          const y0 = pick(78 - i * 38, -18 - i * 25), [x1, y1] = land(i);
          C['term' + i] = A(lerp(X2, x1, k), lerp(y0, y1, k), lerp(30, 6, k), { fx: 1, dir: 0, o: 1 - seg(lt, 0.42 + i * 0.05, 0.66 + i * 0.05), s: lerp(1, 0.85, k) });
        });
      }
      cam = a1 ? { x: X2, y: pick(-8, 0), zoom: 1, yaw: -1, pitch: 2.5 } : { x: X2, y: pick(2, 0), zoom: 1, yaw: 1, pitch: 2 };
      break;
    }
    case 'lock0': case 'lock1': case 'run0': case 'run1': case 'run2': case 'run3': case 'scale0': case 'scale1': {
      const ph = ['lock0', 'lock1', 'run0', 'run1', 'run2', 'run3', 'scale0', 'scale1'].indexOf(id);
      const s1 = ph === 7, money = ph === 5;
      /* one card is lit per beat; cards outside the beat keep their place but quiet down */
      const Q0 = (on) => (on ? 0 : 1);
      const al = (base) => (s1 ? Math.min(base, 0.3) : money ? Math.min(base, 0.3) : base);
      let bsK, spK, spVia = null;
      const DS = pick(0.92, 0.76);         /* the funds token, docked in the settlement slot */
      if (w) {
        C.buyer = A(X2 - 375, 55, 0, { face: 1, ry: TILT, dm: Q0(ph === 0 || money) });
        C.provider = A(X2 + 375, 55, 0, { face: 1, ry: -TILT, on: ph === 2 ? 1 : 0, dm: Q0(ph === 2 || ph === 4 || money || ph === 6) });
        C.clockp = A(X2 - 400, LY, 10); C.lk = A(X2 - 262, LY + 19, 0, { dm: s1 ? 1 : 0 });
        C.settle = A(X2, -86, 20, { d: ph === 0 ? 0.45 : 0, on: ph === 0 || ph === 4 ? 1 : 0, dm: Q0(ph <= 1 || ph === 4 || money) });
        C.rules = A(X2 - 124, 70, 0, { d: ph === 0 ? 0.35 : 0, on: ph === 1 || money ? 1 : 0, dm: Q0(ph === 1 || money) });
        if (ph >= 3) C.verif = A(X2 + 124, 70, 0, { d: ph === 3 ? 0.05 : 0, on: ph === 3 && lt < 1.3 ? 1 : 0, dm: Q0(ph === 3 || ph === 6) });
        if (ph === 2) C.work = A(X2 + 372, -88, 20, { d: 0.35, on: 1 });
        if (ph === 3) C.evid = A(X2 + 372, -90, 20, { d: 1.15, on: onAt(lt, 1.3) });
        if (ph >= 6) C.rep = A(X2 + 372, -94, 20, { d: 0.15, on: s1 ? 0 : 1, dm: s1 ? 0.6 : 0 });
        /* money leaves the buyer from below and reaches the provider from below: the contract and the
           verification cards sit above the money path, never on it */
        bsK = [['buyer', 'b90'], ['settle', 'l']]; spK = [['settle', 'r'], ['provider', 'b-90']];
        K.br = { a: ['buyer', 'r20'], b: ['rules', 'l'], c: G, al: al(ph <= 1 ? 1 : 0.45), d: 0.45, pulses: ph === 0 ? pulse(lt, 0.45, 0.95) : [] };
        K.rs = { a: ['rules', 'b'], b: ['settle', 't-60'], c: ph === 1 ? G : NN, dash: 4, al: al(ph === 1 ? 1 : 0.6), d: 0.85, pulses: ph === 0 ? pulse(lt, 0.95, 1.45) : ph === 1 ? amb(0.55, 2, false) : [] };
        if (C.verif) {
          K.rv = { a: ['rules', 'r'], b: ['verif', 'l'], c: G, al: al(ph === 3 ? 1 : 0.45), d: 0.15, pulses: ph === 3 ? pulse(lt, 0.2, 0.65) : [] };
          K.pv = { a: ['provider', 'l20'], b: ['verif', 'r'], c: G, al: al(ph === 3 ? 1 : 0.45), d: 0.25, pulses: ph === 3 ? pulse(lt, 0.3, 0.8) : [] };
          if (ph >= 4) K.vs = { a: ['verif', 'b-40'], b: ['settle', 't60'], c: G, al: al(ph === 4 ? 1 : 0.45), d: 0.05, pulses: ph === 4 ? pulse(lt, 0.1, 0.6) : [] };
        }
        if (C.work) K.pw = { a: ['provider', 'b'], b: ['work', 't'], c: G, d: 0.6, pulses: lt > 0.9 ? amb(0.7, 1, false) : [] };
        if (C.evid) K.ve = { a: ['verif', 'b70'], b: ['evid', 'l'], c: G, d: 1.0, pulses: pulse(lt, 1.0, 1.35) };
        if (ph === 3) K.em = anc(['evid', 'b'], mx('mM1'), { d: 1.6, pulses: pulse(lt, 1.7, 2.15) }, true);
        if (ph >= 6) {
          K.pr = { a: ['provider', 'b'], b: ['rep', 't'], c: G, d: 0.3, al: s1 ? 0.35 : 1, pulses: ph === 6 ? pulse(lt, 1.1, 1.4).concat(pulse(lt, 2.7, 3.0)) : [] };
          if (ph === 6) {
            const tx = lerp(mx('mM2'), mx('mM3'), eio(seg(lt, 1.5, 1.8)));
            K.rm = anc(['rep', 'b'], tx, { d: 0.3, pulses: pulse(lt, 1.1, 1.4).concat(pulse(lt, 2.7, 3.0)) }, true);
          }
        }
        if (s1) {
          C.done = A(X2, -6, 110, { d: 0.35, on: 1 });
          K.dn = anc(['done', 'b'], mx('mOK'), { d: 0.75, pulses: pulse(lt, 0.8, 1.2) }, true);
        }
      } else {
        /* phone: two agents on top, one pair of cards underneath, the ledger below */
        const BY = -70;
        C.buyer = A(X2 - 84, AY, 0, { face: 1, dm: Q0(ph === 0 || money) });
        C.provider = A(X2 + 84, AY, 0, { face: 1, on: ph === 2 ? 1 : 0, dm: Q0(ph === 2 || ph === 4 || money || ph === 6) });
        if (ph <= 5) C.settle = A(X2 - 84, BY, 0, { d: ph === 0 ? 0.45 : 0, on: ph === 0 || ph === 4 ? 1 : 0, dm: Q0(ph <= 1 || ph === 4 || money) });
        if (ph <= 1 || money) C.rules = A(X2 + 84, BY, 0, { d: ph === 0 ? 0.35 : money ? 0.15 : 0, on: ph === 1 || money ? 1 : 0 });
        if (ph === 2) C.work = A(X2 + 84, BY, 0, { d: 0.3, on: 1 });
        if (ph === 3) {
          /* the rows tick first (content(): 53.8-54.2), then the card turns away and the evidence package turns in */
          const k = eio(seg(lt, 1.35, 1.55));
          C.verif = A(X2 + 84, BY, 0, { d: 0.15, ry: k * 84 * DEG, o: 1 - seg(lt, 1.4, 1.55), on: 1 });
          C.evid = A(X2 + 84, BY, 0, { d: 1.55, on: 1 });
        }
        if (ph === 4 || ph === 6) C.verif = A(X2 + 84, BY, 0, { d: 0.1, on: ph === 6 ? 1 : 0, dm: Q0(ph === 6) });
        if (ph === 6) C.rep = A(X2 - 84, BY, 0, { d: 0.15, on: 1 });
        if (s1) { C.rep = A(X2 - 84, BY, 0, { fx: 1, dm: 0.5, o: 1 - seg(lt, 0.55, 0.95) }); C.done = A(X2, BY, 20, { d: 0.9, on: 1 }); }
        /* money: straight down into the settlement provider, then up to the provider through the gap
           between the rows, clear of whatever card sits under the provider */
        bsK = [['buyer', 'b'], ['settle', 't']];
        spK = [['settle', 't50'], ['provider', 'b-40']]; spVia = [[null, -12], [X2 + 44, -12]];
        if (C.rules && ph <= 1) K.br = { a: ['buyer', 'b40'], b: ['rules', 't-40'], c: G, al: ph <= 1 ? 1 : 0.5, d: 0.45, pulses: ph === 0 ? pulse(lt, 0.45, 0.95) : [] };
        if (C.work) K.pw = { a: ['provider', 'b'], b: ['work', 't'], c: G, d: 0.5, pulses: lt > 0.8 ? amb(0.7, 1, false) : [] };
        if (ph === 3) {
          K.pv = { a: ['provider', 'b'], b: ['verif', 't'], c: G, d: 0.2, pulses: pulse(lt, 0.3, 0.8) };
          K.em = anc(['evid', 'b-28'], mx('mM1'), { d: 1.9, pulses: pulse(lt, 1.95, 2.35) });
        }
        if (ph === 6) {
          K.vr = { a: ['verif', 't-50'], b: ['rep', 't50'], via: [[null, -8], [X2 - 34, -8]], c: G, d: 0.3, pulses: pulse(lt, 1.15, 1.45).concat(pulse(lt, 2.75, 3.05)) };
          const tx = lerp(mx('mM2'), mx('mM3'), eio(seg(lt, 1.5, 1.8)));
          K.rm = anc(['verif', 'b-30'], tx, { d: 0.3, pulses: pulse(lt, 1.05, 1.4).concat(pulse(lt, 2.65, 3.0)) });
        }
        if (s1) K.dn = anc(['done', 'b'], mx('mOK'), { d: 1.45, pulses: pulse(lt, 1.5, 1.9) });
      }
      /* money moves on its own blue path: buyer -> settlement provider -> provider. The contract is never on it. */
      if (C.settle) {
        K.bs = { a: bsK[0], b: bsK[1], c: B, w: money ? 2 : 1.6, al: money ? 1 : al(ph === 0 ? 1 : 0.55), d: 0.7, glow: money ? 0.14 : 0, pulses: money ? amb(0.5, 2, false) : [] };
        if (ph >= 4) K.sp = { a: spK[0], b: spK[1], via: spVia, c: B, w: money ? 2 : 1.6, al: money ? 1 : al(ph === 4 ? 0.9 : 0.6), d: ph === 4 ? 0.9 : 0, glow: money ? 0.14 : 0, pulses: money ? amb(0.5, 2, false, 0.5) : [] };
        if (money && w) { const mp = alongLink(C, K.bs, 0.5); C.money = A(mp.x, mp.y, 30, { d: 0.35, ent: 'fade' }); }
      }
      if (ph === 0) {
        if (lt > 0.9) {
          const k = seg(lt, 1.0, 2.0), kd = eio(seg(lt, 2.0, 2.3));
          const p = alongLink(C, K.bs, k), sl = slotPos(C.settle);
          C.funds = A(lerp(p.x, sl.x, kd), lerp(p.y, sl.y, kd), lerp(p.z + 30, sl.z, kd), { fx: 1, o: seg(lt, 0.9, 1.1), s: lerp(1, DS, kd) });
          K.bs.draw = 1; K.bs.pulses = k > 0 && k < 1 ? [{ u: eio(k), c: B }] : [];
        }
      } else if (C.settle && ph <= 6) {
        /* the funds stay locked in the slot until the last milestone is paid */
        const sl = slotPos(C.settle);
        C.funds = A(sl.x, sl.y, sl.z, { fx: 1, s: DS, o: ph === 6 ? 1 - seg(lt, 2.95, 3.2) : 1 });
        if (ph === 4) {
          /* M1 is paid out of it: a payment token lifts off the locked funds and travels to the provider */
          const k = seg(lt, 1.15, 2.15), ke = eio(seg(lt, 1.0, 1.2));
          const p = alongLink(C, K.sp, k);
          C.pay = A(lerp(sl.x, p.x, ke), lerp(sl.y, p.y, ke), lerp(sl.z + 4, p.z + 30, ke), { fx: 1, o: seg(lt, 0.95, 1.1) * (1 - seg(lt, 2.1, 2.4)), s: lerp(DS, 1, ke) * lerp(1, 0.8, seg(lt, 2.1, 2.4)) });
          K.sp.pulses = k > 0 && k < 1 ? [{ u: eio(k), c: B }] : [];
        }
      }
      /* the cycle repeats for M2 and M3 */
      if (ph === 6) {
        for (let m = 0; m < 2; m++) {
          const o = m * 1.6;
          if (K.pv) K.pv.pulses = (K.pv.pulses || []).concat(pulse(lt, o + 0.65, 0.95 + o));
          if (K.vs) K.vs.pulses = (K.vs.pulses || []).concat(pulse(lt, o + 1.0, 1.25 + o));
          if (K.sp) K.sp.pulses = (K.sp.pulses || []).concat(pulse(lt, o + 1.2, 1.5 + o).map((p) => Object.assign(p, { c: B })));
        }
      }
      const camK = [
        { zoom: 0.99, yaw: -1.5 }, { zoom: 1, yaw: -1 }, { zoom: 1, yaw: 1 }, { zoom: 0.99, yaw: 1.5 },
        { zoom: 0.99, yaw: 0 }, { zoom: 0.985, yaw: 0 }, { zoom: 0.985, yaw: 1 }, { zoom: 1, yaw: 0 }][ph];
      cam = w ? Object.assign({ x: X2, y: 0, pitch: 2 }, camK) : { x: X2, y: 0, zoom: 1, yaw: 0, pitch: 2 };
      break;
    }
    case 'end0': {
      if (w) {
        MARKS.forEach((m, i) => { C[m.id] = A(X2 - 375 + 150 * i, LY, 0, { d: 0.05 + i * 0.04, mv: 1.1 }); });
        C.clock = A(X2, -14, 0, { d: 0.45 });
        C.lk = A(X2 - 462, LY + 19, 0, { mv: 1.1 });
        /* the whole trail hangs from one clock: a trunk, a bus above the ledger, a drop to every mark */
        MARKS.forEach((m, i) => { const x = X2 - 375 + 150 * i; K['e' + i] = { a: ['clock', 'b'], b: { node: m.id, port: 'o' }, via: [[X2, LY + 46], [x, LY + 46]], c: G, d: 0.95 + i * 0.05, al: 0.6, pulses: pulse(lt, 1.3, 2.2) }; });
        cam = { x: X2, y: -66, zoom: 0.99, yaw: 0, pitch: 2, mv: 1.2 };
      } else {
        MARKS.forEach((m, i) => { C[m.id] = A(X2 + [-104, 0, 104][i % 3], i < 3 ? -46 : -120, 0, { d: 0.05 + i * 0.05, mv: 1.1 }); });
        C.clock = A(X2, 40, 0, { d: 0.45 });
        cam = { x: X2, y: 0, zoom: 1, yaw: 0, pitch: 2, mv: 1.1 };
      }
      break;
    }
  }
  /* ledger marks persist from their moment to the end card */
  if (id !== 'end0') {
    const have = marksAt(tEnd);
    have.forEach((m) => {
      const d = Math.max(0, m.T - t0);
      if (m.id === 'mHS') C.mHS = A(0, LY, 0, { d });
      else if (w || PS[m.id] != null) C[m.id] = A(mx(m.id), LY, 0, { d });
    });
  }
  return { C, K, cam };
}

/* ---------------- mixing beats ---------------- */
const onv = (v) => (v === true ? 1 : v ? +v : 0);
function mixCard(p, c, lt) {
  /* fx: the layout already moves this card itself */
  if (c && c.fx) return c.nf && lt < (c.d || 0) ? null : Object.assign({}, c, { on: onv(c.on) });
  if (c && p) {
    const k = eio(seg(lt, c.d || 0, (c.d || 0) + (c.mv || MOVE)));
    const r = {};
    for (const key of ['x', 'y', 'z', 'rx', 'ry', 's', 'o', 'face', 'dm']) r[key] = lerp(p[key] || 0, c[key] || 0, k);
    r.on = lerp(onv(p.on), onv(c.on), eo(seg(lt, 0, 0.35)));
    r.dir = c.dir; r.ent = c.ent;
    return r;
  }
  if (c) {
    if (c.nf) return lt >= (c.d || 0) ? Object.assign({}, c, { on: onv(c.on) }) : null;
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
  COL = { dark: !!c.dark, surf: hexRGB(c.surface), n: hexRGB(c.fg3), g: hexRGB(c.accent), b: hexRGB('#3b7ddd'), tick: hexRGB(c.fg3), nA: c.dark ? 0.5 : 0.62, tA: c.dark ? 0.42 : 0.5 };
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
function buildPath(L) {
  PATH.n = 0;
  if (L.via) {
    const pts = [[_P0.x, _P0.y, _P0.z]];
    for (const v of L.via) { const q = pts[pts.length - 1]; pts.push([v[0] == null ? q[0] : v[0], v[1] == null ? q[1] : v[1], v[2] == null ? _P0.z : v[2]]); }
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
    const dist = _P0.distanceTo(_P3), k = (L.bend == null ? 0.42 : L.bend) * dist;
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
    const L = K[key];
    if (L.al <= 0.005 || (L.draw != null && L.draw <= 0.001)) continue;
    const u0 = [];
    const oa = endpoint(L.a, _P0, _T0, u0), ob = endpoint(L.b, _P3, _T3, u0);
    if (oa < 0 || ob < 0) continue;
    const al = L.al * Math.min(oa, ob);
    if (al <= 0.01) continue;
    buildPath(L);
    const col = COL[L.c] || COL.n;
    const lineCol = mixA(col, L.c === 'n' ? al * COL.nA : al);
    const len = PATH.len, dEnd = len * clamp(L.draw == null ? 1 : L.draw);
    const pool = (L.w || 1.2) >= 1.55 ? pools.w16 : pools.w12;
    emit(pool, 0, dEnd, lineCol, lineCol, L.dash || 0);
    if (L.glow) emit(pools.glow, 0, dEnd, mixA(col, L.glow * al), mixA(col, L.glow * al), 0);
    for (const p of L.pulses || []) {
      const pc = COL[p.c || (L.c === 'n' ? 'g' : L.c)];
      const d = len * p.u;
      pathAt(d, _cp);
      const a = al * (p.soft ? 0.85 : 1);
      const tail = Math.min(d, 70);
      emit(pools.w22, d - tail, d, mixA(pc, 0.04 * a), mixA(pc, a), 0);
      dots.add(_cp, pc, a, 7);
      halos.add(_cp, pc, (COL.dark ? 0.5 : 0.3) * a, 26);
    }
    if (len >= 30) for (const u of u0) usage.push([u[0], u[1], u[2], L.c, clamp(al * 1.3)]);
  }
  return usage;
}
const PRI = { n: 0, g: 1, b: 2 };
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
function setRow(el, state, val) { if (!el) return; cls(el, 'ok', state === 'ok'); cls(el, 'live', state === 'live'); txt(el.querySelector(':scope > span'), val); }

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
    n.faces.forEach((f, i) => {
      f.obj.visible = n.faces.length === 1 || (i === 0 ? st.face < 0.75 : st.face > 0.25);
      if (f.o !== os) { f.o = os; f.el.style.opacity = os; }
      cls(f.el, 'is-on', st.on > 0.5);
      ensure(f.el, '--on', (st.on || 0).toFixed(2));
      ensure(f.el, '--dm', (st.dm || 0).toFixed(2));
    });
    if (id.startsWith('term')) { const el = n.faces[0].el; cls(el, 'to-r', st.dir > 0); cls(el, 'to-l', st.dir < 0); }
  }
}

/* card contents: a pure function of story time T */
function content(T, id) {
  const ck = tHTML(T);
  txt(Q('clock', 'hms'), ck); txt(Q('clockp', 'hms'), ck);
  const st = { meet0: 'Verifiable time', invite0: 'Carries the invite', join0: 'Hosts the session', verify0: 'Ledger check',
    handshake0: 'Never sees a private key', handshake1: 'Same certificate', handshake2: 'Anchor', handshake3: 'Witness', end0: 'Verifiable time' }[id];
  if (st) txt(Q('clock', 'st'), st);
  /* agents, chapter 1 */
  for (const [who, dt] of [['buyer', 0], ['provider', 0.3]]) {
    const f = N[who].faces[0].el;
    const ses = T >= 10.0 + dt, idok = T >= 14.9 + dt * 1.3, idl = T >= 13.9, sig = T >= 18.0 + dt * 0.7;
    setRow(Q(who, 'ses'), ses ? 'ok' : 'none', ses ? 'private' : '&mdash;');
    setRow(Q(who, 'id'), idok ? 'ok' : idl ? 'live' : 'none', idok ? 'verified' : idl ? 'checking' : '&mdash;');
    setRow(Q(who, 'sig'), sig ? 'ok' : 'none', sig ? 'signed<b class="w"> locally</b>' : '&mdash;');
    const cur = T < 13.9 ? 'ses' : T < 17.5 ? 'id' : 'sig';
    for (const r of ['ses', 'id', 'sig']) cls(Q(who, r), 'cur', r === cur);
    cls(f.querySelector('.ag-c-st'), 'on', idok);
    ensure(f, '--sc', eo(seg(T, 9.55 + dt, 10.3 + dt)).toFixed(3));
    ensure(f, '--ks', (T < 17.5 ? 0 : eo4(seg(T, 17.8 + dt * 0.7, 18.15 + dt * 0.7))).toFixed(3));
    ensure(f, '--kr', (T >= 17.8 && T < 28.5 ? fract((T - 17.8 - dt) * 0.8) : 0).toFixed(3));
  }
  /* identity check */
  setRow(Q('erc', 'b'), T >= 14.9 ? 'ok' : T >= 13.9 ? 'live' : 'none', T >= 14.9 ? 'verified' : T >= 13.9 ? 'checking' : '&mdash;');
  setRow(Q('erc', 'p'), T >= 15.3 ? 'ok' : T >= 14.05 ? 'live' : 'none', T >= 15.3 ? 'verified' : T >= 14.05 ? 'checking' : '&mdash;');
  /* twin certificates */
  const cs = T >= 23.95 ? 'Anchored&nbsp;<b>' + tHTML(23.8).replace('<em>', '').replace('</em>', '') + '</b>' : 'Buyer &middot; Provider';
  txt(Q('certA', 'cs'), cs); txt(Q('certB', 'cs'), cs);
  /* chapter 2 agents */
  const b2 = Q('buyer', 'st', 1);
  const lab = T >= 44.8 ? ['Funding', 'authorized'] : T >= 41.6 ? ['Contract', 'accepted'] : ['Contract', '&mdash;'];
  txt(b2.querySelector('em'), lab[0]); setRow(b2, T >= 41.6 ? 'ok' : 'none', lab[1]);
  cls(b2, 'cur', T >= 41.6); cls(Q('buyer', 'sq', 1), 'cur', T < 41.6);
  const p2 = Q('provider', 'st', 1);
  const prog = [seg(T, 50.7, 53.0), seg(T, 61.5, 62.2), seg(T, 63.1, 63.8)];
  const ver = [54.65, 62.55, 64.15], paid = [58.1, 63.0, 64.6];
  p2.querySelectorAll('.ag-c-pills i').forEach((el, i) => {
    ensure(el, '--p', (prog[i] * 100).toFixed(1) + '%');
    cls(el, 'ok', T >= ver[i]); cls(el, 'paid', T >= paid[i]);
  });
  cls(p2, 'live', T >= 50.6); cls(p2, 'cur', T >= 50.5); cls(Q('provider', 'sq', 1), 'cur', T < 50.5);
  cls(p2, 'pre', T < 41.6);              /* no milestones exist before the contract */
  /* the work itself (M1) */
  ensure(Q('work', 'wp'), '--wp', seg(T, 50.7, 53.0).toFixed(3));
  txt(Q('work', 'ws'), T >= 53.0 ? 'Delivered' : 'In progress');
  /* the people side of the contract: each row appears as its term lands */
  if (!N.ctl.rows) N.ctl.rows = N.ctl.faces[0].el.querySelectorAll('.ag-c-terms > div');
  N.ctl.rows.forEach((el, i) => ensure(el, 'opacity', seg(T - 37.5, 0.5 + 0.05 * i, 0.72 + 0.05 * i).toFixed(3)));
  /* the contract node */
  setRow(Q('rules', 'r'), 'ok', 'holds'); setRow(Q('rules', 'c'), 'ok', 'holds'); setRow(Q('rules', 'f'), 'neg', 'never held');
  cls(Q('rules', 'f'), 'hl', id === 'lock1' || id === 'run3');
  /* settlement provider: the lock closes before the work and opens after verification */
  /* the funds stay locked while each milestone is paid out of them; the lock opens after the last one */
  const shut = T >= 46.35 && T < 64.6;
  if (!N.settle.lock) N.settle.lock = N.settle.faces[0].el.querySelector('.ag-c-lock');
  const lkEl = N.settle.lock;
  const close = T < 64.45 ? eo(seg(T, 46.0, 46.35)) : 1 - eo(seg(T, 64.45, 64.8));
  ensure(lkEl, '--lk', (-4.5 * (1 - close)).toFixed(2) + 'px');
  cls(lkEl, 'shut', shut);
  const ls = T < 46.35 ? ['Open', 0] : T < 56.75 ? ['Locked', 46.35] : T < 63.0 ? ['M1 paid', 56.75] : T < 64.6 ? ['M2 paid', 63.0] : ['Released', 64.6];
  txt(Q('settle', 'ls'), ls[0]);
  txt(Q('settle', 'lt'), ls[1] ? tHTML(ls[1]) : '&nbsp;');
  cls(Q('settle', 'ls').parentElement, 'shut', shut);
  /* verification re-checks per milestone */
  const mi = T < 61.5 ? 0 : T < 63.1 ? 1 : 2;
  txt(Q('verif', 'm'), 'M' + (mi + 1));
  const vt = [W ? [54.05, 54.35, 54.65] : [53.8, 54.0, 54.2], [62.25, 62.4, 62.55], [63.85, 64.0, 64.15]][mi];
  ['a', 'b', 'c'].forEach((r, i) => setRow(Q('verif', r), T >= vt[i] ? 'ok' : 'none', T >= vt[i] ? 'met' : '&mdash;'));
  /* reputation ticks up after each milestone */
  ensure(Q('rep', 'b1'), '--h', '0.380');
  ensure(Q('rep', 'b2'), '--h', (0.06 + 0.58 * eo(seg(T, 62.9, 63.25))).toFixed(3));
  ensure(Q('rep', 'b3'), '--h', (0.06 + 0.88 * eo(seg(T, 64.5, 64.85))).toFixed(3));
  txt(Q('rep', 'rs'), T >= 64.5 ? 'M3 &middot; updated' : T >= 62.9 ? 'M2 &middot; updated' : 'M1 &middot; updated');
  /* contract + acceptance */
  txt(Q('ctl', 'at'), T >= 41.65 ? tHTML(41.65) : '&mdash;');
  for (const a of ['accA', 'accB']) ensure(N[a].faces[0].el, '--sg', eo(seg(T, 41.6, 42.4)).toFixed(3));
  txt(Q('done', 'at'), T >= 65.95 ? tHTML(65.95) : '&mdash;');
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

/* ---------------- the ledger: the site's ruler, as a time axis ---------------- */
function drawRuler(T, endK, fadeAll) {
  if (T < 13.0 || fadeAll < 0.01) return;
  const LY = W ? LYW : LYT;
  const R = eio(seg(T, 13.15, 14.7));
  const x0 = -640, x1 = (W ? X2W : X2T) + 760;
  const lo = Math.max(x0, -R * 900), hi = R >= 1 ? x1 : Math.min(x1, R * 900);
  const rulers = W ? [[LY, lo, hi, 1]] : [[lerp(LY, -46, endK), lo, hi, 1]];
  if (!W && endK > 0) rulers.push([-120, X2T - 168, X2T + 168, endK]);
  const step = W ? 25 : 20;
  for (const [y, a0, a1, k] of rulers) {
    const a = fadeAll * k;
    const c = mixA(COL.tick, a * COL.tA), cm = mixA(COL.tick, a * COL.tA * 0.62);
    _S0.set(a0, y, 0); _S1.set(a1, y, 0); pools.w10.seg(_S0, _S1, c, c);
    for (let x = Math.ceil(a0 / step) * step; x <= a1; x += step) {
      const major = Math.round(x / step) % 4 === 0, h = major ? 8 : 3.5;
      _S0.set(x, y - h, 0); _S1.set(x, y + h, 0); pools.w10.seg(_S0, _S1, major ? c : cm, major ? c : cm);
    }
  }
}

const FOV = 30;
let PREV = { key: '', v: null };
export default {
  async init(ctx) {
    if (!document.getElementById('ag-c-style')) {
      const s = document.createElement('style'); s.id = 'ag-c-style'; s.textContent = CSS; document.head.appendChild(s);
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
    pools = { glow: new Pool(9, 400), w10: new Pool(1, 1600), w12: new Pool(1.25, 3000), w16: new Pool(1.6, 1600), w22: new Pool(2.4, 800) };
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
    drawRuler(T, isEnd ? eio(seg(lt, 0.1, 1.5)) : 0, fadeAll);
    updatePorts(drawLinks(K));
    for (const k in pools) pools[k].end();
    dots.end(); halos.end();
    renderer.render(glScene, camera);
    css.render(cssScene, camera);
  },
  resize(w, h) {
    VW = w; VH = h;
    W = w / h > 1.25;
    /* the free band of the stage: under the chapter chips, above the stage foot */
    let top = W ? 52 : 81;
    try {
      const ch = HOST && HOST.parentElement && HOST.parentElement.querySelector('.ag-chips');
      if (ch) { const r = ch.getBoundingClientRect(), hr = HOST.getBoundingClientRect(); if (r.height > 0) top = r.bottom - hr.top; }
    } catch (e) { /* layout not ready: defaults */ }
    const s0 = top + (W ? 16 : 12), s1 = h - (W ? 12 : 6);
    const FITh = W ? Math.min(w / 1080, h / 460) : Math.min(w / 360, h / 364);
    let b0 = W ? LYW - 46 : LYT - 40, b1 = W ? 150 : 86;
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
