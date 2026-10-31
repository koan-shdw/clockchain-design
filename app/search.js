/* Round 3+4: shared canned dataset + matching + row expansion (certificates: certificate.html)
   for Search & Verify. Quicklinks are invented for the mock (format CC-XXXX-XXXX);
   freshly submitted logs from logging.html join via sessionStorage for the session.
   Global toggle (round 4): off = only your events (usr_9d4f); quicklinks resolve regardless. */
(function(){
  var ME = 'usr_9d4f';
  var ROWS = [
    { type:'Log', cat:'log', hash:'0x9f3c1b8e2d4a71e0', short:'0x9f3c…a71e',
      name:'Q3 board resolution, final', assetId:'BRD-2026-Q3', ver:'3', text:'Q3 board resolution',
      userId:ME, block:36041882, status:'Verified', when:'2 min ago',
      anchored:'2026-07-03 02:12:00 Clockchain Time', key:'CC-4X7K-9M2Q' },
    { type:'API call', cat:'api', detail:'GET api/time/timestamp', code:'200 OK',
      userId:ME, block:36041367, status:'200', when:'10 min ago',
      anchored:'2026-07-03 02:03:25 Clockchain Time', key:'CC-2T6M-8A4P' },
    { type:'Contract', cat:'contract', detail:'escrow-release · execution time 2026-07-04 00:00:00 UVT',
      cname:'escrow-release', trigger:'2026-07-04 00:00:00 UVT', paid:'$38.20 · 764.0 CCTT',
      userId:ME, block:null, status:'Scheduled', when:'1 h ago',
      anchored:'scheduled · 2026-07-04 00:00:00 UVT', key:'CC-3E8S-5C2R' },
    { type:'Log', cat:'log', hash:'0x4b219cd7e60a09dd', short:'0x4b21…09dd',
      name:'supplier-manifest.pdf', assetId:'SUP-0142', ver:'1', text:'',
      userId:ME, block:36037794, status:'Verified', when:'3 h ago',
      anchored:'2026-07-03 01:03:52 Clockchain Time', key:'CC-8N3V-2Q5T' },
    { type:'Contract', cat:'contract', detail:'option-expiry · execution time 2026-06-30 16:00:00 UVT',
      cname:'option-expiry', trigger:'2026-06-30 16:00:00 UVT', paid:'$0.31 USD',
      userId:ME, block:35832362, status:'Executed', when:'3 d ago',
      anchored:'2026-06-30 16:00:00 UVT', key:'CC-7P2L-4K9D' },
    { type:'Log', cat:'log', hash:'0xe7a05f14b92d3c48', short:'0xe7a0…3c48',
      name:'deploy-artifact 4.2.1', assetId:'DPL-421', ver:'421', text:'',
      userId:ME, block:35991207, status:'Verified', when:'yesterday',
      anchored:'2026-07-02 12:07:25 Clockchain Time', key:'CC-6R9W-4H7J' },
    /* other users — surface only with the global toggle on */
    { type:'Log', cat:'log', hash:'0x77d1a4c98b23f6e2', short:'0x77d1…f6e2',
      name:'audit-report-2026H1.pdf', assetId:'AUD-H1', ver:'1', text:'',
      userId:'usr_31bc', block:35896048, status:'Verified', when:'2 d ago',
      anchored:'2026-07-01 09:41:26 Clockchain Time', key:'CC-9J4D-7Q2F' },
    { type:'Contract', cat:'contract', detail:'royalty-split · execution time 2026-08-01 00:00:00 UVT',
      cname:'royalty-split', trigger:'2026-08-01 00:00:00 UVT', paid:'$12.75 · 255.0 CCTT',
      userId:'usr_8ee2', block:null, status:'Scheduled', when:'5 d ago',
      anchored:'scheduled · 2026-08-01 00:00:00 UVT', key:'CC-5W8N-3R6T' }
  ];
  try{
    (JSON.parse(sessionStorage.getItem('cc-fresh-logs') || '[]')).forEach(function(r){
      r.cat = 'log'; r.type = 'Log'; ROWS.unshift(r);
    });
  }catch(e){}

  var last = [];

  function globalOn(){
    var g = document.getElementById('sv-global');
    return !!(g && g.checked);
  }
  function mine(r){ return globalOn() || r.userId === ME; }
  function catsOn(){
    var on = {};
    document.querySelectorAll('.filters input[data-cat]').forEach(function(c){
      on[c.getAttribute('data-cat')] = c.checked;
    });
    return on;
  }
  function chev(){
    return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>';
  }
  function rowHtml(r, i){
    var detail = r.detail || (r.short + ' · ' + r.name);
    var block = r.block ? '#' + r.block.toLocaleString() : 'scheduled';
    var t = timeOf(r), made = created(r);
    /* your own contracts carry their actions under the status (Jeff 10-08): scheduled ones
       Edit (placeholder until that flow is defined) and Cancel, executed ones Schedule Again */
    var acts = '';
    if(r.cat === 'contract' && r.userId === ME){
      if(r.status === 'Scheduled')
        acts = '<button class="kv-copy" type="button" onclick="ccMock(\'Mockup: edit this scheduled contract. Flow to come.\')">Edit</button>'
          + '<button class="kv-copy" type="button" onclick="CCSearch.cancel(' + i + ')">Cancel</button>';
      if(r.status === 'Executed')
        acts = '<a class="kv-copy" style="text-decoration:none;" href="contracts.html?again=' + encodeURIComponent(r.cname) + '">Schedule Again</a>';
    }
    /* the whole row opens the panel (Jeff 10-07); the arrow stays as the cue and keyboard target.
       data-v carries what each column sorts by */
    return '<tr class="xr" onclick="CCSearch.rowClick(event,' + i + ',this)"><td>' + r.type + '</td><td class="mono">' + detail + '</td>'
      + '<td class="mono" data-v="' + (r.block || '') + '">' + block + '</td>'
      + '<td class="mono" data-v="' + (t ? t.ms : '') + '">' + (t ? cellTime(t.ms) : '—') + '</td>'
      + '<td data-v="' + r.status + '"><div class="st-stack"><span class="status-pill">' + r.status + '</span>' + (acts ? '<span class="row-acts">' + acts + '</span>' : '') + '</div></td>'
      + '<td class="mono" data-v="' + made + '">' + cellTime(made) + '</td>'
      + '<td><button class="kv-copy" type="button" onclick="CCSearch.cert(' + i + ',false)" aria-label="Open the proof certificate">.pdf</button></td>'
      + '<td style="text-align:right;"><button class="xbtn" type="button" aria-label="Expand">' + chev() + '</button></td></tr>';
  }
  var COLS = 8;
  /* narrow tables break a time between its date and clock, never inside them */
  function cellTime(ms){
    var p = fmt(new Date(ms)).split(' ');
    return '<span class="nw">' + p[0] + '</span> <span class="nw">' + p[1] + '</span>';
  }
  /* mock "now" for the canned rows: the newest log ("2 min ago") anchored 02:12 */
  var NOW = Date.UTC(2026, 6, 3, 2, 14, 0);
  /* when the entry was made: logs and API calls at their anchor, contracts when they were
     scheduled (the mock clock less their age, seconds seeded per record) */
  function created(r){
    if(r.cat !== 'contract'){ var t = timeOf(r); return t ? t.ms : NOW; }
    var m = /(\d+)\s*(min|h|d)/.exec(r.when || ''), unit = { min: 6e4, h: 36e5, d: 864e5 };
    var back = m ? +m[1] * unit[m[2]] : /yesterday/.test(r.when || '') ? 864e5 : 0;
    return NOW - back + (seedOf(r.key + 'c') % 60) * 1000;
  }
  /* time the record hit the chain, to the second; scheduled contracts show their trigger.
     Fresh logs carry minutes only, so their seconds come from the key (stable per record). */
  function timeOf(r){
    var m = /(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)(?::(\d\d))?/.exec(r.trigger && r.status === 'Scheduled' ? r.trigger : r.anchored || '');
    if(!m) return null;
    var sec = m[6] != null ? +m[6] : seedOf(r.key) % 60;
    return { ms: Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], sec), label: r.cat === 'contract' ? 'UVT' : 'Clockchain Time' };
  }
  function seedOf(s){
    var h = 2166136261;
    for(var k = 0; k < String(s).length; k++){ h ^= String(s).charCodeAt(k); h = Math.imul(h, 16777619) >>> 0; }
    return h;
  }
  /* logs and API calls always show the anchor to the second (fresh logs arrive with minutes only) */
  function consensus(r){
    var t = r.cat !== 'contract' && timeOf(r);
    return t ? fmt(new Date(t.ms)) + ' ' + t.label : r.anchored;
  }
  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function fields(r){
    if(r.cat === 'log') return [
      ['Hash', r.hash, 1], ['Hash type', 'SHA-256'], ['Asset Name', r.name], ['Asset ID', r.assetId],
      ['Version #', r.ver], ['User ID', r.userId, 1], ['Block', r.block ? '#' + r.block.toLocaleString() : '—', 1],
      ['Consensus time', consensus(r), 1], ['Reference key', r.key, 1]
    ];
    if(r.cat === 'api') return [
      ['Endpoint', r.detail, 1], ['Response', r.code || r.status], ['User ID', r.userId, 1],
      ['Block', '#' + r.block.toLocaleString(), 1], ['Consensus time', consensus(r), 1], ['Reference key', r.key, 1]
    ];
    return [
      ['Contract', r.cname || r.detail], ['Trigger', r.trigger || '—', 1], ['Status', r.status],
      ['Paid estimate', r.paid || '—'], ['User ID', r.userId, 1], ['Reference key', r.key, 1]
    ];
  }
  function panelHtml(r, i){
    var label = r.cat === 'log' ? 'Log' : r.cat === 'api' ? 'API call' : 'Contract';
    var h = '<div class="xpanel ' + r.cat + '"><span class="tpill tpill-' + r.cat + '">' + label + '</span><div class="xgrid">';
    fields(r).filter(function(f){ return f[1] != null && f[1] !== ''; }).forEach(function(f){
      h += '<div><div class="k">' + f[0] + '</div><div class="v' + (f[2] ? ' mono' : '') + '">' + esc(f[1]) + '</div></div>';
    });
    h += '</div><div class="xactions">'
      + '<button class="btn btn-outline btn-sm" onclick="CCSearch.cert(' + i + ',false)">Certificate</button>'
      + '<button class="btn btn-outline btn-sm" onclick="CCSearch.cert(' + i + ',true)">Print</button>'
      + '<button class="kv-copy" onclick="CCSearch.copyLink(' + i + ')">Copy quicklink</button>'
      + '</div></div>';
    return h;
  }
  function render(list, tbody){
    last = list;
    tbody.innerHTML = list.length
      ? list.map(rowHtml).join('')
      : '<tr><td colspan="' + COLS + '" class="empty">No matches on the chain for that query.</td></tr>';
    var table = tbody.closest('table');
    if(table.ccResort) table.ccResort();
  }
  function norm(s){ return String(s || '').toLowerCase().trim(); }
  function linkFor(r){
    return location.origin + location.pathname.replace(/[^/]*$/, '') + 'search.html?q=' + encodeURIComponent(r.key);
  }

  /* mock block<->time mapping: 1s blocks, anchored so canned rows land near their stated times */
  var T0 = Date.UTC(2026, 6, 2, 14, 33, 58), B0 = 36000000, SEC = 1;
  function two(n){ return String(n).padStart(2, '0'); }
  function fmt(d){
    return d.getUTCFullYear() + '-' + two(d.getUTCMonth()+1) + '-' + two(d.getUTCDate())
      + ' ' + two(d.getUTCHours()) + ':' + two(d.getUTCMinutes()) + ':' + two(d.getUTCSeconds());
  }

  window.CCSearch = {
    rows: ROWS,
    render: render,
    catsOn: catsOn,
    timeOf: timeOf,
    created: created,
    now: NOW,
    consensus: consensus,
    seedOf: seedOf,
    linkFor: linkFor,
    rowClick: function(e, i, tr){
      /* row actions keep their own job; a drag-select of a hash doesn't toggle */
      if(e.target.closest('a,button:not(.xbtn)')) return;
      if(String(window.getSelection && window.getSelection()).trim()) return;
      var btn = tr.querySelector('.xbtn');
      var next = tr.nextElementSibling;
      if(next && next.classList.contains('xrow')){ next.remove(); btn.classList.remove('open'); tr.classList.remove('open'); return; }
      var open = tr.parentElement.querySelector('.xrow');
      if(open){ open.remove(); }
      tr.parentElement.querySelectorAll('.open').forEach(function(b){ b.classList.remove('open'); });
      var x = document.createElement('tr'); x.className = 'xrow';
      x.innerHTML = '<td colspan="' + COLS + '">' + panelHtml(last[i], i) + '</td>';
      tr.after(x); btn.classList.add('open'); tr.classList.add('open');
    },
    cancel: function(i){
      var r = last[i];
      ccConfirm('Cancel ' + (r.cname || 'this contract') + '?', 'Cancel Contract', function(){
        r.status = 'Canceled';
        render(last, document.getElementById('sv-rows'));
        ccToast('Mockup: ' + (r.cname || 'contract') + ' canceled');
      });
    },
    copyLink: function(i){
      navigator.clipboard.writeText(linkFor(last[i]))
        .then(function(){ ccToast('Quicklink copied'); }).catch(function(){ ccToast('Copy failed'); });
    },
    /* Certificate B (Jeff 10-07): its own page in a new tab; the tab inherits this
       tab's sessionStorage, so freshly submitted logs resolve there too */
    cert: function(i, doPrint){
      var w = window.open('certificate.html?key=' + encodeURIComponent(last[i].key) + (doPrint ? '&print=1' : ''), '_blank');
      if(!w) ccToast('Allow pop-ups to open the certificate');
    },
    blockToTime: function(b){ return fmt(new Date(T0 + (b - B0) * SEC * 1000)) + ' Clockchain Time'; },
    timeToBlock: function(dateStr, timeStr){
      var t = Date.parse(dateStr + 'T' + (timeStr || '00:00:00') + 'Z');
      if(isNaN(t)) return null;
      return B0 + Math.round((t - T0) / (SEC * 1000));
    },
    byKey: function(q){
      q = norm(q).replace(/\s+/g, '');
      var hit = null;
      ROWS.forEach(function(r){ if(norm(r.key).replace(/\s+/g,'') === q) hit = r; });
      return hit; /* quicklinks resolve regardless of the global toggle — that's the share case */
    },
    basic: function(q){
      q = norm(q); var on = catsOn();
      return ROWS.filter(function(r){
        if(!on[r.cat] || !mine(r)) return false;
        if(!q) return true;
        var block = r.block ? String(r.block) : '';
        return (r.hash && norm(r.hash).indexOf(q.replace(/^0x/,'0x')) === 0)
          || (r.hash && norm(r.hash).replace('0x','').indexOf(q.replace(/^0x/,'')) === 0)
          || norm(r.name).indexOf(q) > -1
          || norm(r.detail).indexOf(q) > -1
          || norm(r.assetId) === q
          || norm(r.userId) === q
          || block === q.replace(/[#,]/g, '');
      });
    },
    advanced: function(cat, f){
      return ROWS.filter(function(r){
        if(r.cat !== cat || !mine(r)) return false;
        if(f.hash && !(r.hash && norm(r.hash).replace('0x','').indexOf(norm(f.hash).replace('0x','')) === 0)) return false;
        if(f.content && !(norm(r.text) && norm(r.text).indexOf(norm(f.content)) > -1)) return false;
        if(f.userId && norm(r.userId) !== norm(f.userId)) return false;
        if(f.assetId && norm(r.assetId) !== norm(f.assetId)) return false;
        if(f.assetName && norm(r.name).indexOf(norm(f.assetName)) === -1) return false;
        if(f.block && String(r.block) !== String(f.block).replace(/[#,]/g, '')) return false;
        if(f.ver && String(r.ver) !== String(f.ver)) return false;
        if(f.cname && norm(r.cname || r.detail).indexOf(norm(f.cname)) === -1) return false;
        if(f.cstatus && f.cstatus !== 'Any'){
          var map = { Scheduled: 'Scheduled', Executed: 'Executed', Canceled: 'Canceled' };
          if(r.status !== map[f.cstatus]) return false;
        }
        return true;
      });
    }
  };
})();
