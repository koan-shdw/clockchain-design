/* The three clock tools (Timer, Stopwatch, Alarm): one infographic each, in the Use cases / V1 graphics
   (hairline ruler with ticks, green ring nodes, mono timestamps with the milliseconds in green).
   Facts from mcp.clockchain.network/clock-tools (read 2026-10-30). Shared by the main page cards and the MCP manual.
   The SVGs draw with CSS classes only (tf-*), so they follow the theme by themselves. */
(function () {
  const W = 300, Y = 74;   /* viewBox width, ruler height */

  function ruler(x0 = 12, x1 = 288) {
    let s = '<line class="tf-rule" x1="' + x0 + '" y1="' + Y + '" x2="' + x1 + '" y2="' + Y + '"/>';
    for (let x = x0, i = 0; x <= x1 + 0.1; x += 12, i++) {
      const maj = i % 4 === 0;
      s += '<line class="' + (maj ? 'tf-tk' : 'tf-tick') + '" x1="' + x + '" y1="' + (Y - (maj ? 6 : 3)) + '" x2="' + x + '" y2="' + (Y + (maj ? 6 : 3)) + '"/>';
    }
    return s;
  }
  const ring = (x, y = Y) => '<circle class="tf-halo" cx="' + x + '" cy="' + y + '" r="11"/><circle class="tf-node" cx="' + x + '" cy="' + y + '" r="6.5"/>';
  const k = (x, y, t, a = 'middle', cls = '') => '<text class="tf-k ' + cls + '" x="' + x + '" y="' + y + '" text-anchor="' + a + '">' + t + '</text>';
  const ts = (x, y, hms, ms, a = 'middle') => '<text class="tf-t" x="' + x + '" y="' + y + '" text-anchor="' + a + '">' + hms + '<tspan class="tf-ms">.' + ms + '</tspan></text>';
  const stem = (x, y0, y1) => '<line class="tf-stem" x1="' + x + '" y1="' + y0 + '" x2="' + x + '" y2="' + y1 + '"/>';
  const check = (x, y) => '<path class="tf-check" d="M' + (x - 3.6) + ' ' + y + 'l2.4 2.4 4.8-5.2"/>';
  const anchored = (x, y) => check(x - 30, y - 3) + k(x + 6, y, 'Anchored');
  const pill = (x, y, w, t) => '<rect class="tf-pill" x="' + (x - w / 2) + '" y="' + (y - 9) + '" width="' + w + '" height="18" rx="9"/>' +
    '<text class="tf-pt" x="' + x + '" y="' + (y + 3.5) + '" text-anchor="middle">' + t + '</text>';
  const svg = (label, body) => '<svg class="tf" viewBox="0 0 ' + W + ' 136" role="img" aria-label="' + label + '">' + body + '</svg>';

  /* TIMER: set, a countdown on consensus time, the target, the fire after it (never early), anchored; the agent can be offline */
  const timer = svg('Timer: set at 12:04:31.114 for 5 seconds, fires after the target at 12:04:36.701 and is anchored, while the agent can be offline',
    ruler() +
    '<line class="tf-run" x1="48" y1="' + Y + '" x2="210" y2="' + Y + '"/>' +
    '<line class="tf-after" x1="210" y1="' + Y + '" x2="236" y2="' + Y + '"/>' +
    '<line class="tf-target" x1="210" y1="50" x2="210" y2="92"/>' +
    k(48, 26, 'Set') + ts(48, 42, '12:04:31', '114') + stem(48, 48, 66) +
    '<rect class="tf-sq" x="43.5" y="' + (Y - 4.5) + '" width="9" height="9" rx="2"/>' +
    k(210, 26, 'Target · 5 s') + ts(210, 42, '12:04:36', '114') +
    ring(236) +
    k(236, 104, 'Fire', 'middle', 'g') + ts(236, 119, '12:04:36', '701') + anchored(236, 133) +
    '<line class="tf-off" x1="56" y1="98" x2="196" y2="98"/>' + k(126, 114, 'Agent can be offline')
  );

  /* STOPWATCH: two anchored markers, the elapsed time between their block times */
  const stopwatch = svg('Stopwatch: start marker at 12:04:31.114, stop marker at 12:04:38.051, elapsed 6.937 seconds, both anchored',
    ruler() +
    '<line class="tf-run" x1="60" y1="' + Y + '" x2="240" y2="' + Y + '"/>' +
    k(60, 26, 'Start') + ts(60, 42, '12:04:31', '114') + stem(60, 48, 63) + ring(60) +
    k(240, 26, 'Stop') + ts(240, 42, '12:04:38', '051') + stem(240, 48, 63) + ring(240) +
    '<line class="tf-br" x1="60" y1="102" x2="240" y2="102"/>' +
    '<line class="tf-br" x1="60" y1="96" x2="60" y2="108"/><line class="tf-br" x1="240" y1="96" x2="240" y2="108"/>' +
    pill(150, 102, 112, 'Elapsed 6.937 s') +
    anchored(60, 128) + anchored(240, 128)
  );

  /* ALARM: an absolute time, then the same time every interval, each fire anchored, until it is cancelled */
  const alarm = svg('Alarm: fires at 09:00:00 and again every 60 seconds, each fire anchored, until it is cancelled',
    ruler() +
    '<line class="tf-run" x1="56" y1="' + Y + '" x2="216" y2="' + Y + '"/>' +
    [[56, '09:00'], [136, '09:01'], [216, '09:02']].map(([x, hm], i) =>
      k(x, 26, i ? 'Fire' : 'Fire at', 'middle', 'g') +
      '<text class="tf-t" x="' + x + '" y="42" text-anchor="middle">' + hm + '<tspan class="tf-ms">:00</tspan></text>' + stem(x, 48, 63) + ring(x)).join('') +
    '<line class="tf-x" x1="262" y1="' + (Y - 5) + '" x2="272" y2="' + (Y + 5) + '"/><line class="tf-x" x1="272" y1="' + (Y - 5) + '" x2="262" y2="' + (Y + 5) + '"/>' +
    k(267, 98, 'Cancel') +
    '<line class="tf-br" x1="56" y1="98" x2="216" y2="98"/>' +
    '<line class="tf-br" x1="56" y1="93" x2="56" y2="103"/><line class="tf-br" x1="136" y1="93" x2="136" y2="103"/><line class="tf-br" x1="216" y1="93" x2="216" y2="103"/>' +
    pill(96, 98, 56, '60 s') + pill(176, 98, 56, '60 s') +
    k(136, 126, 'Once or on an interval')
  );

  window.CC_TOOLS = [
    { id: 'timer', n: '03', name: 'Timer', status: 'Live on testnet', svg: timer,
      text: 'A countdown that fires on verified time, never early, and keeps running while your agent is offline. Each fire is anchored on the ledger, and anyone can verify it with no key.' },
    { id: 'stopwatch', n: '04', name: 'Stopwatch', status: 'Live on testnet', svg: stopwatch,
      text: 'Measures the time between two markers anchored on Clockchain consensus time, not a machine clock. Anyone can recompute the result from the two block times, with no key.' },
    { id: 'alarm', n: '05', name: 'Alarm', status: 'Live on testnet', svg: alarm,
      text: 'Fires at a set time up to 30 days ahead, once or on a repeating interval of a minute or more. Each fire is anchored with the same verifiable receipt as the timer.' }
  ];

  /* main page cards */
  window.CC_renderTools = function (host) {
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    host.innerHTML =
      '<div class="tl-head"><span class="tl-k">Clock tools</span><span class="tl-rule"></span><span class="tl-sub">Measure and schedule on time you can prove</span></div>' +
      '<div class="tl-grid">' + window.CC_TOOLS.map((t) =>
        '<article class="tl-card" id="tool-' + t.id + '">' +
          '<div class="tl-fig">' + t.svg + '</div>' +
          '<div class="tl-top"><span class="tl-n">' + t.n + '</span><h3 class="tl-name">' + esc(t.name) + '</h3><span class="tl-s">' + esc(t.status) + '</span></div>' +
          '<p class="tl-p">' + esc(t.text) + '</p>' +
        '</article>').join('') + '</div>';
  };
})();
