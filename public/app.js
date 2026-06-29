
var SURL = 'https://lqxnyuewcwrdjllvsyfb.supabase.co';
var SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxeG55dWV3Y3dyZGpsbHZzeWZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NTE0OTIsImV4cCI6MjA5ODIyNzQ5Mn0.GHcNTHteugUQAbFVUfugeFBNltZSTrorj4Gg2_wIZVI';
var PINS = { logger: '1234', viewer: '0000' };

var CHECKS = [
  {k:'calories',   label:'Calories on target', icon:'<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>'},
  {k:'gym',        label:'Gym / workout',       icon:'<svg viewBox="0 0 24 24"><path d="M6.5 6.5h11M6.5 17.5h11"/><path d="M3 9.5v5M21 9.5v5"/><path d="M6.5 6.5v11M17.5 6.5v11"/></svg>'},
  {k:'steps',      label:'Steps goal',          icon:'<svg viewBox="0 0 24 24"><path d="M4 19h6V9h4V4h6"/></svg>'},
  {k:'skincare_am',label:'Morning skincare',    icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'},
  {k:'skincare_pm',label:'Evening skincare',    icon:'<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'},
];
var MW = ['','Low','Low','Low','Okay','Okay','Good','Good','Great','Great','Amazing'];
var TICK  = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
var CROSS = '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
var DASH  = '<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>';

// state
var pendingProfile = null;
var pinBuf = '';
var checkState = {};
var moodVal = 5.0;
var isDragging = false;
var rafId = null;
var logTimer = null;
var rtSub = null;

// ── SCREENS ──
function show(id) { document.getElementById(id).style.display = 'flex'; }
function hide(id) { document.getElementById(id).style.display = 'none'; }
function showBlock(id) { document.getElementById(id).style.display = 'block'; }

// ── PROFILE SELECTION ──
function selectProfile(p) {
  pendingProfile = p;
  pinBuf = '';
  hide('login-screen');
  show('pin-screen');
  var who = p === 'logger' ? 'Daddiebear' : 'Kitty Cat';
  document.getElementById('pin-who').textContent = who;
  document.getElementById('pin-err').textContent = '';
  renderDots();
}

function backToLogin() {
  hide('pin-screen');
  show('login-screen');
  pinBuf = '';
}

// ── PIN PAD ──
function renderDots() {
  for (var i = 0; i < 4; i++) {
    var dot = document.getElementById('dot' + i);
    if (dot) dot.classList.toggle('filled', i < pinBuf.length);
  }
}

function numPress(n) {
  if (pinBuf.length >= 4) return;
  pinBuf += n;
  renderDots();
  if (pinBuf.length === 4) {
    setTimeout(verifyPin, 120);
  }
}

function numDel() {
  if (pinBuf.length === 0) return;
  pinBuf = pinBuf.slice(0, -1);
  document.getElementById('pin-err').textContent = '';
  renderDots();
}

function verifyPin() {
  if (pinBuf === PINS[pendingProfile]) {
    localStorage.setItem('kcm_profile', pendingProfile);
    hide('pin-screen');
    loadApp(pendingProfile);
  } else {
    document.getElementById('pin-err').textContent = 'Wrong PIN — try again';
    var dotsEl = document.getElementById('pin-dots');
    dotsEl.classList.add('shaking');
    setTimeout(function() { dotsEl.classList.remove('shaking'); }, 400);
    pinBuf = '';
    setTimeout(renderDots, 150);
  }
}

// ── APP LOAD ──
function loadApp(profile) {
  showBlock('app');
  document.getElementById('hdate').textContent = new Date().toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long'});

  if (profile === 'logger') {
    showBlock('logger-ui');
    hide('viewer-ui');
    buildChecks();
    initSlider();
    setTimeout(syncLoggerNotifBtn, 100);
    if (localStorage.getItem('kcm_lnotif') === '1' && Notification && Notification.permission === 'granted') {
      startLogTimer();
    }
  } else {
    hide('logger-ui');
    showBlock('viewer-ui');
    renderView();
    if (localStorage.getItem('kcm_vnotif') === '1' && Notification && Notification.permission === 'granted') {
      startRealtime();
    }
  }
}

function signOut() {
  localStorage.removeItem('kcm_profile');
  if (rtSub) { try { rtSub.close(); } catch(e){} rtSub = null; }
  if (logTimer) { clearInterval(logTimer); logTimer = null; }
  hide('app');
  hide('pin-screen');
  show('login-screen');
  pendingProfile = null;
  pinBuf = '';
}

// ── SLIDER ──
function initSlider() {
  setSlider(5.0);
}

function setSlider(v) {
  moodVal = Math.max(1, Math.min(10, v));
  var pct = ((moodVal - 1) / 9) * 100;
  document.getElementById('sfill').style.width = pct + '%';
  document.getElementById('sthumb').style.left = pct + '%';
  document.getElementById('mood-num').textContent = moodVal.toFixed(1);
  document.getElementById('mood-word').textContent = '— ' + MW[Math.max(1, Math.min(10, Math.round(moodVal)))];
}

function sliderPct(e) {
  var track = document.getElementById('strack');
  var rect = track.getBoundingClientRect();
  var clientX = e.touches ? e.touches[0].clientX : e.clientX;
  return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
}

document.addEventListener('DOMContentLoaded', function() {
  var wrap = document.getElementById('slider-wrap');
  if (!wrap) return;

  function onDown(e) {
    isDragging = true;
    document.getElementById('sthumb').classList.add('drag');
    var p = sliderPct(e);
    setSlider(1 + (p / 100) * 9);
    e.preventDefault();
  }
  function onMove(e) {
    if (!isDragging) return;
    if (rafId) cancelAnimationFrame(rafId);
    var captured = e.touches ? {clientX: e.touches[0].clientX} : {clientX: e.clientX};
    rafId = requestAnimationFrame(function() {
      var p = sliderPct(captured);
      setSlider(1 + (p / 100) * 9);
    });
  }
  function onUp() {
    if (!isDragging) return;
    isDragging = false;
    document.getElementById('sthumb').classList.remove('drag');
    moodVal = Math.round(moodVal * 2) / 2;
    setSlider(moodVal);
  }

  wrap.addEventListener('mousedown', onDown);
  wrap.addEventListener('touchstart', onDown, {passive: false});
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, {passive: false});
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchend', onUp);

  // Auto-login
  var saved = localStorage.getItem('kcm_profile');
  if (saved === 'logger' || saved === 'viewer') {
    loadApp(saved);
  } else {
    show('login-screen');
  }
});

// ── CHECKS ──
function buildChecks() {
  var c = document.getElementById('checks');
  if (!c) return;
  c.innerHTML = '';
  checkState = {};
  CHECKS.forEach(function(ch) {
    checkState[ch.k] = null;
    var row = document.createElement('div');
    row.className = 'check-row';
    row.innerHTML =
      '<span class="check-lbl">' + ch.icon + ch.label + '</span>' +
      '<div class="tpair">' +
        '<button class="tbtn" id="y-' + ch.k + '" onclick="tick(\'' + ch.k + '\',true,event)">' +
          '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</button>' +
        '<button class="tbtn" id="n-' + ch.k + '" onclick="tick(\'' + ch.k + '\',false,event)">' +
          '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>';
    c.appendChild(row);
  });
}

function tick(k, v, e) {
  checkState[k] = v;
  document.getElementById('y-' + k).className = 'tbtn' + (v === true ? ' yes' : '');
  document.getElementById('n-' + k).className = 'tbtn' + (v === false ? ' no' : '');
  // ripple
  var btn = e.currentTarget;
  var rp = document.createElement('span');
  rp.style.cssText = 'position:absolute;border-radius:50%;background:rgba(0,0,0,.1);transform:scale(0);animation:rip .4s linear;pointer-events:none;width:60px;height:60px;left:' + (e.offsetX - 30) + 'px;top:' + (e.offsetY - 30) + 'px';
  btn.appendChild(rp);
  setTimeout(function() { rp.remove(); }, 450);
}

// ── DB ──
function dbGet(table, params) {
  return fetch(SURL + '/rest/v1/' + table + '?' + (params || ''), {
    headers: {'apikey': SKEY, 'Authorization': 'Bearer ' + SKEY}
  }).then(function(r) {
    if (!r.ok) throw r.status;
    return r.json();
  });
}

function dbUpsert(table, body) {
  return fetch(SURL + '/rest/v1/' + table, {
    method: 'POST',
    headers: {
      'apikey': SKEY,
      'Authorization': 'Bearer ' + SKEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(body)
  }).then(function(r) {
    if (!r.ok) return r.text().then(function(t) { throw new Error(t); });
    return r.json();
  });
}

function today() { return new Date().toISOString().slice(0, 10); }

function toast(msg, err) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show' + (err ? ' err' : '');
  clearTimeout(t._to);
  t._to = setTimeout(function() { t.className = ''; }, 2500);
}

function setBtn(id, loading, label) {
  var b = document.getElementById(id);
  if (!b) return;
  b.disabled = loading;
  b.innerHTML = loading ? '<span class="spinner"></span>Saving…' : label;
}

// ── SAVE ──
function saveDaily() {
  setBtn('btn-daily', true, 'Save check-in');
  dbUpsert('daily_checkins', {
    date: today(),
    calories: checkState.calories,
    gym: checkState.gym,
    steps: checkState.steps,
    skincare_am: checkState.skincare_am,
    skincare_pm: checkState.skincare_pm,
    mood: Math.round(moodVal * 2) / 2
  }).then(function() {
    toast('Check-in saved');
    setBtn('btn-daily', false, 'Save check-in');
  }).catch(function(e) {
    toast('Could not save', true);
    console.error(e);
    setBtn('btn-daily', false, 'Save check-in');
  });
}

function saveWeekly() {
  setBtn('btn-weekly', true, 'Save weekly review');
  var weight = parseFloat(document.getElementById('ww').value) || null;
  var gym = parseInt(document.getElementById('wg').value);
  var sk = parseInt(document.getElementById('ws').value);
  var win = document.getElementById('wwin').value.trim();
  var imp = document.getElementById('wimp').value.trim();
  dbGet('weekly_reviews', 'order=date.desc&limit=1').then(function(prev) {
    var lw = (prev.length && prev[0].date !== today()) ? prev[0].weight : null;
    var chg = (lw && weight) ? parseFloat((weight - lw).toFixed(1)) : null;
    return dbUpsert('weekly_reviews', {
      date: today(), weight: weight, weight_change: chg,
      gym_sessions: isNaN(gym) ? null : gym,
      skincare_days: isNaN(sk) ? null : sk,
      win: win || null, improve: imp || null
    });
  }).then(function() {
    ['ww','wg','ws'].forEach(function(id) { document.getElementById(id).value = ''; });
    document.getElementById('wwin').value = '';
    document.getElementById('wimp').value = '';
    toast('Weekly review saved');
    setBtn('btn-weekly', false, 'Save weekly review');
  }).catch(function(e) {
    toast('Could not save', true);
    console.error(e);
    setBtn('btn-weekly', false, 'Save weekly review');
  });
}

// ── TABS ──
function switchTab(t) {
  document.querySelectorAll('.tab').forEach(function(el, i) {
    el.classList.toggle('active', ['daily','weekly','history'][i] === t);
  });
  document.querySelectorAll('.panel').forEach(function(el) { el.classList.remove('active'); });
  document.getElementById('p-' + t).classList.add('active');
  if (t === 'history') renderHistory();
}

function switchHist(t) {
  document.getElementById('ht-d').classList.toggle('active', t === 'daily');
  document.getElementById('ht-w').classList.toggle('active', t === 'weekly');
  document.getElementById('hd').style.display = t === 'daily' ? 'block' : 'none';
  document.getElementById('hw').style.display = t === 'weekly' ? 'block' : 'none';
}

function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {weekday:'short',day:'numeric',month:'short',year:'numeric'});
}

// ── HISTORY ──
function renderHistory() {
  document.getElementById('hd').innerHTML = '<div class="loading"><span class="spinner"></span>Loading…</div>';
  document.getElementById('hw').innerHTML = '<div class="loading"><span class="spinner"></span>Loading…</div>';
  Promise.all([
    dbGet('daily_checkins', 'order=date.desc&limit=30'),
    dbGet('weekly_reviews', 'order=date.desc&limit=20')
  ]).then(function(res) {
    var daily = res[0], weekly = res[1];
    document.getElementById('hd').innerHTML = !daily.length
      ? '<div class="empty">No check-ins yet.</div>'
      : daily.map(function(e) {
          var chips = CHECKS.map(function(ch) {
            var v = e[ch.k];
            return v === true
              ? '<span class="chip cy">' + TICK + ch.label + '</span>'
              : v === false
              ? '<span class="chip cn">' + CROSS + ch.label + '</span>'
              : '<span class="chip cs">' + DASH + ch.label + '</span>';
          }).join('');
          return '<div class="entry"><div class="edate">' + fmtDate(e.date) + '</div><div class="chips">' + chips + '</div><div class="mline">Mood — <strong>' + e.mood + ' / 10</strong></div></div>';
        }).join('');

    document.getElementById('hw').innerHTML = !weekly.length
      ? '<div class="empty">No weekly reviews yet.</div>'
      : weekly.map(function(e) {
          var chg = '';
          if (e.weight_change != null) {
            var cls = e.weight_change > 0 ? 'wup' : e.weight_change < 0 ? 'wdown' : 'wsame';
            chg = '<span class="wchg ' + cls + '">' + (e.weight_change > 0 ? '+' : '') + e.weight_change + ' kg</span>';
          }
          return '<div class="entry"><div class="edate">' + fmtDate(e.date) + '</div>' +
            (e.weight != null ? '<div class="wstat">Weight — <span>' + e.weight + ' kg</span>' + chg + '</div>' : '') +
            (e.gym_sessions != null ? '<div class="wstat">Gym — <span>' + e.gym_sessions + ' / 7</span></div>' : '') +
            (e.skincare_days != null ? '<div class="wstat">Skincare — <span>' + e.skincare_days + ' / 7</span></div>' : '') +
            (e.win ? '<div class="wnote"><b>Win</b>' + e.win + '</div>' : '') +
            (e.improve ? '<div class="wnote"><b>Improve</b>' + e.improve + '</div>' : '') +
            '</div>';
        }).join('');
  }).catch(function() {
    document.getElementById('hd').innerHTML = '<div class="empty">Could not load.</div>';
    document.getElementById('hw').innerHTML = '<div class="empty">Could not load.</div>';
  });
}

// ── VIEWER ──
function renderView() {
  document.getElementById('vdate').textContent = new Date().toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long'});
  document.getElementById('vchecks').innerHTML = '<div class="loading"><span class="spinner"></span></div>';
  document.getElementById('vgrid').innerHTML = '<div class="loading" style="grid-column:1/-1"><span class="spinner"></span></div>';
  document.getElementById('vref').style.display = 'none';
  setTimeout(syncViewerNotifBtn, 100);

  Promise.all([
    dbGet('daily_checkins', 'date=eq.' + today() + '&limit=1'),
    dbGet('weekly_reviews', 'order=date.desc&limit=1')
  ]).then(function(res) {
    var todayRow = res[0][0] || null;
    var weekRow = res[1][0] || null;

    if (todayRow) {
      document.getElementById('vchecks').innerHTML = CHECKS.map(function(ch) {
        var v = todayRow[ch.k];
        var cls = v === true ? 'vy' : v === false ? 'vn' : 'vs';
        var icon = v === true ? TICK : v === false ? CROSS : DASH;
        var lbl = v === true ? 'Done' : v === false ? 'Missed' : 'Not logged';
        return '<div class="vrow"><span class="vrow-lbl">' + ch.icon + ch.label + '</span><span class="vstatus ' + cls + '">' + icon + lbl + '</span></div>';
      }).join('');
      var mood = todayRow.mood || 5;
      document.getElementById('vmood-num').textContent = mood;
      document.getElementById('vmood-word').textContent = '— ' + MW[Math.max(1, Math.min(10, Math.round(mood)))];
      setTimeout(function() { document.getElementById('mbar').style.width = ((mood - 1) / 9 * 100) + '%'; }, 80);
    } else {
      document.getElementById('vchecks').innerHTML = '<div class="nodata">Nothing logged yet today.</div>';
      document.getElementById('vmood-num').textContent = '—';
    }

    if (weekRow) {
      var chg = '';
      if (weekRow.weight_change != null) {
        var col = weekRow.weight_change < 0 ? 'var(--green)' : 'var(--red)';
        chg = '<div class="scard-sub" style="color:' + col + '">' + (weekRow.weight_change > 0 ? '+' : '') + weekRow.weight_change + ' kg from last week</div>';
      }
      document.getElementById('vgrid').innerHTML =
        (weekRow.weight != null ? '<div class="scard"><div class="scard-lbl">Weight</div><div class="scard-val ac">' + weekRow.weight + '<span style="font-size:14px;color:var(--muted);font-family:var(--sans)"> kg</span></div>' + chg + '</div>' : '') +
        (weekRow.gym_sessions != null ? '<div class="scard"><div class="scard-lbl">Gym</div><div class="scard-val good">' + weekRow.gym_sessions + '<span style="font-size:14px;color:var(--muted);font-family:var(--sans)"> / 7</span></div></div>' : '') +
        (weekRow.skincare_days != null ? '<div class="scard"><div class="scard-lbl">Skincare</div><div class="scard-val good">' + weekRow.skincare_days + '<span style="font-size:14px;color:var(--muted);font-family:var(--sans)"> / 7</span></div></div>' : '');
      if (weekRow.win || weekRow.improve) {
        document.getElementById('vref').style.display = 'block';
        document.getElementById('vref-content').innerHTML =
          (weekRow.win ? '<div class="ritem"><div class="rlbl">This week\'s win</div><div class="rtxt">' + weekRow.win + '</div></div>' : '') +
          (weekRow.improve ? '<div class="ritem"><div class="rlbl">Working on</div><div class="rtxt">' + weekRow.improve + '</div></div>' : '');
      }
    } else {
      document.getElementById('vgrid').innerHTML = '<div class="nodata" style="grid-column:1/-1">No weekly review yet.</div>';
    }
  }).catch(function(e) { console.error(e); });
}

// ── NOTIFICATIONS ──
var notifOk = (typeof Notification !== 'undefined');
var swReg = null;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(function(reg) { swReg = reg; }).catch(function(){});
}

function fireNotif(title, body) {
  if (!notifOk || Notification.permission !== 'granted') return;
  var opts = { body: body, icon: '/icon-192.png' };
  if (swReg) {
    swReg.showNotification(title, opts);
  } else {
    navigator.serviceWorker.ready.then(function(reg) {
      reg.showNotification(title, opts);
    }).catch(function() {
      try { new Notification(title, opts); } catch(e) {}
    });
  }
}

function syncLoggerNotifBtn() {
  var btn = document.getElementById('nb-log');
  if (!btn) return;
  if (!notifOk) { btn.style.display = 'none'; return; }
  if (Notification.permission === 'denied') { btn.textContent = 'Notifications blocked'; btn.disabled = true; return; }
  if (Notification.permission === 'granted' && localStorage.getItem('kcm_lnotif') === '1') {
    btn.textContent = '9 AM reminder on'; btn.classList.add('on');
  } else {
    btn.textContent = 'Enable 9 AM reminder'; btn.classList.remove('on'); btn.disabled = false;
  }
}

function requestLoggerNotif() {
  if (!notifOk) { toast('Add to home screen first', true); return; }
  if (Notification.permission === 'granted') {
    startLogTimer(); toast('9 AM reminder set'); syncLoggerNotifBtn(); return;
  }
  Notification.requestPermission().then(function(p) {
    if (p === 'granted') { startLogTimer(); toast('9 AM reminder set'); }
    else toast('Allow notifications in Settings', true);
    syncLoggerNotifBtn();
  });
}

function startLogTimer() {
  localStorage.setItem('kcm_lnotif', '1');
  if (logTimer) clearInterval(logTimer);
  logTimer = setInterval(checkLogNotif, 60000);
}

function checkLogNotif() {
  if (!notifOk || Notification.permission !== 'granted') return;
  var now = new Date();
  var td = now.toISOString().slice(0, 10);
  if (now.getHours() !== 9 || now.getMinutes() !== 0 || localStorage.getItem('kcm_lday') === td) return;
  dbGet('daily_checkins', 'date=eq.' + td + '&limit=1').then(function(rows) {
    if (!rows.length) {
      localStorage.setItem('kcm_lday', td);
      fireNotif('Kitty Cat Monitor', "Don't forget to log Kitty Cat's check-in today!");
    }
  }).catch(function(){});
}

function syncViewerNotifBtn() {
  var btn = document.getElementById('nb-view');
  if (!btn) return;
  if (!notifOk) { btn.style.display = 'none'; return; }
  if (Notification.permission === 'denied') { btn.textContent = 'Notifications blocked'; btn.disabled = true; return; }
  if (Notification.permission === 'granted' && localStorage.getItem('kcm_vnotif') === '1') {
    btn.textContent = 'Notifications on'; btn.classList.add('on');
  } else {
    btn.textContent = 'Get notified when logged'; btn.classList.remove('on'); btn.disabled = false;
  }
}

function requestViewerNotif() {
  if (!notifOk) { toast('Add to home screen first', true); return; }
  if (Notification.permission === 'granted') {
    startRealtime(); toast('Notifications enabled'); syncViewerNotifBtn(); return;
  }
  Notification.requestPermission().then(function(p) {
    if (p === 'granted') { startRealtime(); toast('You will be notified when logged'); }
    else toast('Allow notifications in Settings', true);
    syncViewerNotifBtn();
  });
}

function startRealtime() {
  localStorage.setItem('kcm_vnotif', '1');
  if (rtSub) return;
  var ws;
  try {
    ws = new WebSocket(SURL.replace('https://', 'wss://') + '/realtime/v1/websocket?apikey=' + SKEY + '&vsn=1.0.0');
  } catch(e) { return; }
  ws.onopen = function() {
    ws.send(JSON.stringify({topic:'realtime:public:daily_checkins',event:'phx_join',payload:{},ref:'1'}));
  };
  ws.onmessage = function(raw) {
    try {
      var msg = JSON.parse(raw.data);
      if (msg.event === 'INSERT') {
        if (notifOk && Notification.permission === 'granted') {
          fireNotif('Kitty Cat Monitor', 'Daddiebear just logged your check-in!');
        }
        setTimeout(renderView, 600);
      }
    } catch(e) {}
  };
  var hb = setInterval(function() {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({topic:'phoenix',event:'heartbeat',payload:{},ref:null}));
    } else { clearInterval(hb); }
  }, 25000);
  ws.onclose = function() {
    rtSub = null;
    if (localStorage.getItem('kcm_vnotif') === '1') setTimeout(startRealtime, 5000);
  };
  rtSub = ws;
}

// ripple keyframe injected
var s = document.createElement('style');
s.textContent = '@keyframes rip{to{transform:scale(4);opacity:0}}';
document.head.appendChild(s);
