/* Clockchain App shell: injected sidebar + topbar, live values, mock interactions.
   Static mockup. Live numbers run on the same simulated feed as the main site
   widget (block 36042 observed 2026-07-03 02:45:28 UTC, 1 block/second). */
(function(){
  var GENESIS = Math.floor(Date.UTC(2026, 6, 3, 2, 45, 28) / 1000) - 36042;
  var TAI_OFFSET_S = 37;
  var OFFSETS = { utc: 57, ntp: -55, system: 348 };

  function pad(n, w){ n = String(n); while(n.length < (w || 2)) n = '0' + n; return n; }
  function fmtTime(ms){
    var d = new Date(ms);
    return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
  }
  function height(ms){ return Math.floor(ms / 1000) - GENESIS; }
  function randHash(len){
    var c = '0123456789abcdef', s = '0x';
    for(var i = 0; i < (len || 12); i++) s += c[Math.floor(Math.random() * 16)];
    return s;
  }

  /* ---- shell ---- */
  var NAV = [
    { group: 'Overview', items: [
      { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>' },
      { id: 'search', label: 'Search & Verify', href: 'search.html', icon: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.2-4.2"/>' }
    ]},
    { group: 'Services', items: [
      { id: 'logging', label: 'Logging', href: 'logging.html', icon: '<path d="M4 6h16M4 12h16M4 18h10"/>' },
      { id: 'contracts', label: 'Smart Contracts', href: 'contracts.html', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>' },
      { id: 'timestamp', label: 'Time API', href: 'timestamp.html', icon: '<path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 5l-2 14"/>' }
    ]},
    { group: 'Connections', items: [
      { id: 'apikeys', label: 'API', href: 'api-keys.html', icon: '<circle cx="9" cy="15" r="3.5"/><path d="M11.5 12.5 20 4M16 8l3 3"/>' },
      { id: 'mcp', label: 'MCP', href: 'docs/mcp.html', icon: '<path d="M9 7V2M15 7V2M6 7h12v4a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>' }
    ]},
    { group: 'Network', items: [
      { id: 'benchmarking', label: 'Network Status', href: 'benchmarking.html', icon: '<path d="M4 19V10M10 19V5M16 19v-7M21 19H3"/>' }
    ]},
    { group: 'Developers', items: [
      { id: 'docs', label: 'Docs', href: 'docs/index.html', icon: '<path d="M5 4h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M14 4v5h5"/>', pub: true }
    ]},
    { group: 'Account', items: [
      { id: 'account', label: 'Billing & Usage', href: 'account.html', icon: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>' },
      { id: 'tokens', label: 'Token Management', href: 'token-management.html', icon: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6"/>' },
      { id: 'payments', label: 'Payment Methods', href: 'payment-methods.html', icon: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>' },
      { id: 'pricing', label: 'Pricing', href: 'pricing.html', icon: '<path d="M20 13l-7 7-8.6-8.6V4h7.4z"/><circle cx="8.5" cy="8.5" r="1.5"/>' }
    ]}
  ];

  function shellPaths(){
    /* docs pages live one level down */
    return document.body.hasAttribute('data-docs') ? '../' : '';
  }

  /* inside the design mockup this dashboard sits in app/, so its site links go to the mockup's own pages */
  function inMockup(){ return /\/app\//.test(location.pathname); }
  function siteBase(){ return inMockup() ? shellPaths() + '../' : 'https://koan-shdw.github.io/clockchain-preview-r2/'; }
  function mcpHref(){ return inMockup() ? shellPaths() + 'docs/mcp.html' : 'https://clockchain.network/service/docs'; }

  function renderSidebar(){
    var slot = document.getElementById('sidebar');
    if(!slot) return;
    var base = shellPaths();
    var active = document.body.getAttribute('data-nav');
    var h = '<div class="sb-logo"><a href="' + siteBase() + 'index.html"><img src="' + base + 'assets/clockchain-logo-full.png" alt="Clockchain" /></a></div>';
    NAV.forEach(function(g){
      h += '<div class="sb-group"><div class="sb-group-label">' + g.group + '</div>';
      g.items.forEach(function(it){
        h += '<a class="sb-link' + (it.id === active ? ' active' : '') + '" href="' + base + it.href + '">'
          + '<svg viewBox="0 0 24 24" aria-hidden="true">' + it.icon + '</svg>' + it.label
          + (it.pub ? '<span class="sb-pub">Public</span>' : '') + '</a>';
      });
      h += '</div>';
    });
    h += '<div class="sb-foot">'
      + '<div class="sb-user"><span class="sb-avatar">AM</span><span><span class="sb-user-name">Alexander Mitchell</span><br/><span class="sb-user-mail">alexander@example.com</span></span></div>'
      + '<button class="sb-signout" onclick="location.href=\'' + base + 'login.html\'">Sign out</button>'
      + '</div>';
    slot.innerHTML = h;
  }

  function renderTopbar(){
    var slot = document.getElementById('topbar');
    if(!slot) return;
    var title = slot.getAttribute('data-title') || '';
    var base = shellPaths();
    var active = document.body.getAttribute('data-nav');
    var opts = '';
    NAV.forEach(function(g){ g.items.forEach(function(it){
      opts += '<option value="' + base + it.href + '"' + (it.id === active ? ' selected' : '') + '>' + it.label + '</option>';
    }); });
    var SITE = siteBase();
    opts += '<optgroup label="Clockchain site">'
      + '<option value="' + SITE + 'about.html">About</option>'
      + '<option value="' + SITE + 'services.html">Services</option>'
      + '<option value="' + SITE + 'newsroom.html">News</option>'
      + '<option value="' + SITE + 'docs.html">Docs</option>'
      + '<option value="' + mcpHref() + '">API/MCP</option>'
      + '</optgroup>';
    opts += '<option value="' + base + 'login.html">Sign out</option>';
    var glinks = '<nav class="tb-global" aria-label="Clockchain site">'
      + '<a href="' + SITE + 'about.html">About</a>'
      + '<a href="' + SITE + 'services.html">Services</a>'
      + '<a href="' + SITE + 'newsroom.html">News</a>'
      + '<a href="' + SITE + 'docs.html">Docs</a>'
      + '<a href="' + mcpHref() + '">API/MCP</a>'
      + '</nav>';
    slot.innerHTML =
      '<div class="tb-title">' + title + ' <span class="net-badge">Testnet</span></div>'
      + '<div class="tb-right">'
      + '<nav class="tb-mobile-nav"><select onchange="location.href=this.value" aria-label="Navigate">' + opts + '</select></nav>'
      + glinks
      + '<div class="tb-stats">'
      + '<span class="tb-stat"><span class="live-dot"></span><span class="tb-label">Clockchain Time</span><span id="tb-time">--:--:--</span></span>'
      + '<span class="tb-stat"><span class="tb-label">Clockchain Block Height</span><span id="tb-height">#—</span></span>'
      + '</div>'
      + '<div class="tb-wallet" id="tb-wallet"></div>'
      + '<a class="tb-signout" href="' + base + 'login.html">Sign out</a>'
      + '<button class="tb-theme" id="tb-theme" type="button" aria-label="Toggle light mode" onclick="ccTheme()"></button>'
      + '</div>';
  }

  /* ---- header wallet (Jeff 09-22 item 4, 09-24 dashboard): dApp-style connect on every page,
     connected state persists across pages for the session mock ---- */
  var WALLET = { addr: '0x8d4f…22b1', bal: '4,335.0921 CCTT', net: 'MetaMask · Ethereum' };
  function walletOn(){
    try{ return localStorage.getItem('ccapp-wallet') !== 'off'; }catch(e){ return true; }
  }
  function paintWallet(){
    var w = document.getElementById('tb-wallet');
    if(!w) return;
    if(!walletOn()){
      w.innerHTML = '<button class="btn btn-primary btn-sm tb-wallet-connect" type="button" onclick="ccWallet(true)">Connect Wallet</button>';
      return;
    }
    w.innerHTML = '<button class="tb-wallet-pill" type="button" aria-haspopup="true" onclick="ccWalletMenu(event)">'
      + '<span class="live-dot"></span><span class="tb-wallet-bal">' + WALLET.bal + '</span>'
      + '<span class="tb-wallet-addr">' + WALLET.addr + '</span>'
      + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>'
      + '<div class="tb-wallet-menu" id="tb-wallet-menu" hidden>'
      + '<div class="tb-wallet-net">' + WALLET.net + '</div>'
      + '<div class="tb-wallet-row"><span>Wallet balance</span><span class="mono">' + WALLET.bal + '</span></div>'
      + '<button class="btn btn-outline btn-sm" type="button" onclick="ccWallet(false)">Disconnect</button></div>';
  }
  /* Token Management: a purchase raises the header balance (mockup) */
  window.ccWalletBal = function(bal){ WALLET.bal = bal; paintWallet(); };
  window.ccWalletBalNum = function(){ return parseFloat(WALLET.bal.replace(/[^0-9.]/g, '')); };
  window.ccWallet = function(on){
    try{ localStorage.setItem('ccapp-wallet', on ? 'on' : 'off'); }catch(e){}
    paintWallet();
    ccToast(on ? 'Mockup: MetaMask wallet connected' : 'Mockup: wallet disconnected');
  };
  window.ccWalletMenu = function(e){
    e.stopPropagation();
    var m = document.getElementById('tb-wallet-menu');
    if(m) m.hidden = !m.hidden;
  };
  document.addEventListener('click', function(e){
    var m = document.getElementById('tb-wallet-menu');
    if(m && !m.hidden && !e.target.closest('.tb-wallet')) m.hidden = true;
  });

  /* ---- Buy More payment chooser (round 5, item 13): card USD vs wallet CCTT ---- */
  window.ccBuy = function(what){
    var old = document.getElementById('cc-buy'); if(old) old.remove();
    var d = document.createElement('div'); d.id = 'cc-buy'; d.className = 'buy-overlay';
    d.innerHTML = '<div class="buy-card"><h4>' + what + '</h4><p>Pay with</p>'
      + '<button class="btn btn-primary btn-sm" onclick="ccBuyPick(\'credit card (USD)\')">Credit card · USD</button>'
      + '<button class="btn btn-outline btn-sm" onclick="ccBuyPick(\'connected MetaMask wallet (CCTT)\')">Connected wallet · CCTT</button>'
      + '<button class="kv-copy" onclick="document.getElementById(\'cc-buy\').remove()">Cancel</button></div>';
    d.onclick = function(e){ if(e.target === d) d.remove(); };
    document.body.appendChild(d);
  };
  window.ccBuyPick = function(method){
    var d = document.getElementById('cc-buy'); if(d) d.remove();
    ccToast('Mockup: purchase via ' + method);
  };
  /* confirm card on the same overlay (Cancel contract, Jeff 10-08) */
  window.ccConfirm = function(title, yes, onYes){
    var old = document.getElementById('cc-buy'); if(old) old.remove();
    var d = document.createElement('div'); d.id = 'cc-buy'; d.className = 'buy-overlay';
    d.innerHTML = '<div class="buy-card" role="dialog" aria-modal="true"><h4></h4>'
      + '<button class="btn btn-primary btn-sm" type="button">' + yes + '</button>'
      + '<button class="kv-copy" type="button">Keep Contract</button></div>';
    d.querySelector('h4').textContent = title;
    var b = d.querySelectorAll('button');
    b[0].onclick = function(){ d.remove(); onYes(); };
    d.onclick = function(e){ if(e.target === d || e.target === b[1]) d.remove(); };
    d.onkeydown = function(e){ if(e.key === 'Escape') d.remove(); };
    document.body.appendChild(d);
    b[0].focus();
  };

  /* ---- sortable tables (Jeff 10-08): <table data-sort="col,dir"> starts sorted there;
     a header click sorts A→Z, the next Z→A. A cell's data-v sorts in place of its text,
     empty values stay last, and an opened detail row (.xrow) moves with its row.
     Headers marked data-nosort or left blank stay plain. ---- */
  function cellV(tr, i){
    var td = tr.cells[i];
    return !td ? '' : td.hasAttribute('data-v') ? td.getAttribute('data-v') : td.textContent.trim();
  }
  function sortTable(table, col, dir){
    table.ccSort = { col: col, dir: dir };
    Array.prototype.forEach.call(table.tHead.rows[0].cells, function(th, i){
      if(th.querySelector('.th-sort')) th.setAttribute('aria-sort', i !== col ? 'none' : dir === 1 ? 'ascending' : 'descending');
    });
    var body = table.tBodies[0], groups = [];
    Array.prototype.forEach.call(body.rows, function(tr){
      if(tr.classList.contains('xrow') && groups.length) groups[groups.length - 1].push(tr);
      else groups.push([tr]);
    });
    groups.sort(function(a, b){
      var x = cellV(a[0], col), y = cellV(b[0], col);
      if(x === '' || y === '') return (x === '') - (y === '');
      var nx = Number(x), ny = Number(y);
      return dir * (isFinite(nx) && isFinite(ny) ? nx - ny : x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' }));
    });
    groups.forEach(function(g){ g.forEach(function(tr){ body.appendChild(tr); }); });
  }
  function initSort(table){
    Array.prototype.forEach.call(table.tHead.rows[0].cells, function(th, i){
      if(th.hasAttribute('data-nosort') || !th.textContent.trim()) return;
      th.innerHTML = '<button class="th-sort" type="button">' + th.innerHTML + '<span class="th-arr" aria-hidden="true"></span></button>';
      th.firstChild.onclick = function(){
        var s = table.ccSort;
        sortTable(table, i, s && s.col === i && s.dir === 1 ? -1 : 1);
      };
    });
    table.ccResort = function(){ if(table.ccSort) sortTable(table, table.ccSort.col, table.ccSort.dir); };
    var a = table.getAttribute('data-sort').split(',');
    if(a[0] !== '') sortTable(table, +a[0], +a[1] || 1);
  }

  /* ---- theme: dark default, light via [data-theme="light"] on <html> ---- */
  var SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 13A8.5 8.5 0 0 1 11 3a8.5 8.5 0 1 0 10 10z"/></svg>';
  function paintTheme(){
    var b = document.getElementById('tb-theme');
    if(b) b.innerHTML = document.documentElement.getAttribute('data-theme') === 'light' ? MOON : SUN;
  }
  window.ccTheme = function(){
    var r = document.documentElement, light = r.getAttribute('data-theme') === 'light';
    if(light) r.removeAttribute('data-theme'); else r.setAttribute('data-theme', 'light');
    try{ localStorage.setItem('ccapp-theme', light ? 'dark' : 'light'); }catch(e){}
    paintTheme();
  };

  /* ---- live values: any [data-live] element updates each second ----
     data-live: time | height | hash | date */
  function tick(){
    var ms = Date.now();
    var t = fmtTime(ms), h = '#' + height(ms).toLocaleString();
    document.querySelectorAll('[data-live]').forEach(function(el){
      var k = el.getAttribute('data-live');
      if(k === 'time') el.textContent = t;
      else if(k === 'height') el.textContent = h;
      else if(k === 'height-raw') el.textContent = height(ms).toLocaleString();
      else if(k === 'hash') el.textContent = randHash(12) + '…';
      else if(k === 'time-utc') el.textContent = t + ' UTC';
      else if(k === 'time-ntp') el.textContent = fmtTime(ms + OFFSETS.ntp);
      else if(k === 'time-sys') el.textContent = fmtTime(ms + OFFSETS.system);
      else if(k === 'time-tai') el.textContent = fmtTime(ms + TAI_OFFSET_S * 1000);
    });
    var tbT = document.getElementById('tb-time'), tbH = document.getElementById('tb-height');
    if(tbT) tbT.textContent = t;
    if(tbH) tbH.textContent = h;
  }

  /* ---- interactions ---- */
  window.ccToast = function(m){
    var e = document.getElementById('toast');
    if(!e){ e = document.createElement('div'); e.className = 'toast'; e.id = 'toast'; document.body.appendChild(e); }
    e.textContent = m; e.classList.add('show');
    clearTimeout(window.__t); window.__t = setTimeout(function(){ e.classList.remove('show'); }, 1800);
  };
  window.ccCopy = function(text, msg){
    navigator.clipboard.writeText(text).then(function(){ ccToast(msg || 'Copied'); })
      .catch(function(){ ccToast('Copy failed'); });
  };
  window.ccCopyEl = function(btn){
    var c = btn.parentElement.querySelector('code, span');
    if(c) ccCopy(c.innerText);
  };
  window.ccTab = function(id, btn){
    var tabs = btn.closest('.tabs'), box = tabs.parentElement;
    box.querySelectorAll('.tabpane').forEach(function(x){ x.hidden = true; });
    var pane = box.querySelector('#' + id);
    if(pane) pane.hidden = false;
    tabs.querySelectorAll('.tabbtn').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
  };
  window.ccMock = function(msg){ ccToast(msg || 'Mockup: action simulated'); };

  /* ---- docs list: one list for every docs page. A page with sub-pages (MCP) opens to show them
     while you are inside it. Desktop: the left list (#docs-toc). Phone: a menu at the top (#docs-mnav).
     Previous / Next (#docs-pn) follow the same order. ---- */
  var DOCS = [
    { group: 'Start here', items: [
      { label: 'Getting started', href: 'index.html' },
      { label: 'Authentication', href: 'index.html#auth' },
      { label: 'Core concepts', href: 'index.html#concepts' }
    ]},
    { group: 'API reference', items: [
      { label: 'Timestamp API', href: 'timestamp-api.html' },
      { label: 'Logging API', href: 'timestamp-api.html#logging' },
      { label: 'Scheduling API', href: 'timestamp-api.html#contracts' }
    ]},
    { group: 'AI Agents', items: [
      { label: 'MCP', href: 'mcp.html', sub: [
        { label: 'Overview', href: 'mcp.html' },
        { label: 'Services', href: 'mcp-services.html' },
        { label: 'Agents', href: 'mcp-agents.html' },
        { label: 'Clock tools', href: 'mcp-clock-tools.html' },
        { label: 'Proof', href: 'mcp-proof.html' },
        { label: 'Install', href: 'mcp-install.html' },
        { label: 'Limits', href: 'mcp-limits.html' },
        { label: 'Repositories', href: 'mcp-repositories.html' },
        { label: 'References', href: 'mcp-references.html' },
        { label: 'Notes for Rasesh', href: 'mcp-notes.html' }
      ]}
    ]}
  ];
  /* Cloudflare serves pages without ".html" (/docs/mcp); locally they keep it. Compare as "name.html". */
  function docsFile(){ var p = location.pathname.split('/').pop() || 'index'; return /\.html$/.test(p) ? p : p + '.html'; }
  function docsPages(){
    var out = [];
    DOCS.forEach(function(g){ g.items.forEach(function(it){
      if(it.sub) it.sub.forEach(function(s){ out.push({ label: it.label + ': ' + s.label, short: s.label, href: s.href }); });
      else if(it.href.indexOf('#') < 0) out.push({ label: it.label, short: it.label, href: it.href });
    }); });
    return out;
  }
  function renderDocsNav(){
    var toc = document.getElementById('docs-toc'), mnav = document.getElementById('docs-mnav'), pn = document.getElementById('docs-pn');
    if(!toc && !mnav && !pn) return;
    var file = docsFile(), h = '', opts = '';
    var CHEV = '<svg class="toc-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
    DOCS.forEach(function(g){
      h += '<div class="docs-toc-label">' + g.group + '</div>';
      opts += '<optgroup label="' + g.group + '">';
      g.items.forEach(function(it){
        if(it.sub){
          /* a submenu: its pages always listed under it; the arrow folds them away (remembered), never while you are inside */
          var inside = it.sub.some(function(s){ return s.href === file; }), open = true;
          try { open = inside || localStorage.getItem('ccdocs-fold-' + it.label) !== '1'; } catch(e){}
          h += '<div class="toc-group' + (open ? ' is-open' : '') + (inside ? ' is-inside' : '') + '">'
            + '<div class="toc-row"><a class="toc-parent" href="' + it.href + '">' + it.label + '</a>'
            + '<button type="button" class="toc-fold" data-fold="' + it.label + '" aria-expanded="' + open + '" aria-label="Show or hide the ' + it.label + ' pages">' + CHEV + '</button></div>'
            + '<div class="toc-sub">';
          it.sub.forEach(function(s){
            h += '<a href="' + s.href + '"' + (s.href === file ? ' class="active" aria-current="page"' : '') + '>' + s.label + '</a>';
          });
          h += '</div></div>';
          it.sub.forEach(function(s){
            opts += '<option value="' + s.href + '"' + (s.href === file ? ' selected' : '') + '>' + it.label + ': ' + s.label + '</option>';
          });
        } else {
          var on = it.href === file;
          h += '<a href="' + it.href + '"' + (on ? ' class="active" aria-current="page"' : '') + '>' + it.label + '</a>';
          opts += '<option value="' + it.href + '"' + (on ? ' selected' : '') + '>' + it.label + '</option>';
        }
      });
      opts += '</optgroup>';
    });
    if(toc){
      toc.innerHTML = h;
      toc.querySelectorAll('.toc-fold').forEach(function(b){
        b.addEventListener('click', function(){
          var g = b.closest('.toc-group'), open = !g.classList.contains('is-open');
          g.classList.toggle('is-open', open); b.setAttribute('aria-expanded', open);
          try { localStorage.setItem('ccdocs-fold-' + b.getAttribute('data-fold'), open ? '0' : '1'); } catch(e){}
        });
      });
    }
    if(mnav) mnav.innerHTML = '<span class="docs-mnav-k">Docs</span><select onchange="location.href=this.value" aria-label="Docs pages">' + opts + '</select>';
    if(pn){
      var pages = docsPages(), i = -1;
      pages.forEach(function(p, k){ if(p.href === file && i < 0) i = k; });
      var prev = i > 0 ? pages[i - 1] : null, next = i >= 0 && i < pages.length - 1 ? pages[i + 1] : null;
      pn.innerHTML = (prev ? '<a href="' + prev.href + '"><span class="dir">Previous</span>← ' + prev.label + '</a>' : '<span></span>')
        + (next ? '<a href="' + next.href + '"><span class="dir">Next</span>' + next.label + ' →</a>' : '<span></span>');
    }
  }

  renderSidebar();
  renderTopbar();
  renderDocsNav();
  document.querySelectorAll('table[data-sort]').forEach(initSort);
  /* the header grows when its stats wrap (Jeff 10-08); anchors and the docs menu sit below it */
  var tb = document.getElementById('topbar');
  function tbH(){ if(tb) document.documentElement.style.setProperty('--tb-h', tb.offsetHeight + 'px'); }
  tbH();
  if(tb && window.ResizeObserver) new ResizeObserver(tbH).observe(tb);
  paintWallet();
  paintTheme();
  if(location.hash){ var jump = document.getElementById(location.hash.slice(1)); if(jump) jump.scrollIntoView(); }
  tick();
  setInterval(tick, 1000);
})();
