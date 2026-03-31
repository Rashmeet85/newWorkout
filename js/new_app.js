/* ═══════════════════════════════════════════
   HUNTER'S SYSTEM v4 — App Logic
   Mobile-First RPG Fitness Dashboard
═══════════════════════════════════════════ */
'use strict';

/* ── STATE ── */
let currentUnit  = localStorage.getItem('gym_unit') || 'kg';
let currentWeek  = 1;
let _activePage  = 'home';
let activeAnatomy = null;

/* ── STORAGE ── */
const ls   = (k, v) => v === undefined ? localStorage.getItem(k) : (localStorage.setItem(k, v), v);
const lsj  = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const lssj = (k, v) => localStorage.setItem(k, JSON.stringify(v));

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── WORKOUT STORAGE ── */
function isChecked(w, di, ei)       { return ls(`gym_w${w}_d${di}_e${ei}`) === '1'; }
function setChecked(w, di, ei, v)   { v ? ls(`gym_w${w}_d${di}_e${ei}`, '1') : localStorage.removeItem(`gym_w${w}_d${di}_e${ei}`); }
function getExWeight(w, di, ei, s)  { return ls(`exw_w${w}_d${di}_e${ei}_s${s}`) || ''; }
function setExWeight(w, di, ei, s, v) {
  const k = `exw_w${w}_d${di}_e${ei}_s${s}`;
  v ? ls(k, v) : localStorage.removeItem(k);
}

function getWeekProgress(w) {
  let done = 0, total = 0;
  DAYS.forEach((d, di) => d.exercises.forEach((_, ei) => { total++; if (isChecked(w, di, ei)) done++; }));
  return { done, total, pct: total ? Math.round(done / total * 100) : 0, complete: done === total && total > 0 };
}

function getTotalExDone() {
  let d = 0;
  for (let w = 1; w <= 12; w++) DAYS.forEach((day, di) => day.exercises.forEach((_, ei) => { if (isChecked(w, di, ei)) d++; }));
  return d;
}

function getCompletedWeeksCount() {
  let c = 0;
  for (let w = 1; w <= 12; w++) if (getWeekProgress(w).complete) c++;
  return c;
}

/* ── WEIGHT STORAGE ── */
function getWeights()        { return lsj('gym_weights') || {}; }
function getBodyWeight(w)    { const d = getWeights(); return d[w] !== undefined ? d[w] : null; }
function setBodyWeight(w, v) { const d = getWeights(); v === null ? delete d[w] : (d[w] = parseFloat(v)); lssj('gym_weights', d); }
function toDisp(kg)          { return currentUnit === 'kg' ? +kg.toFixed(1) : +(kg * 2.20462).toFixed(1); }
function toKg(v)             { return currentUnit === 'kg' ? parseFloat(v) : +(parseFloat(v) / 2.20462).toFixed(2); }

/* ── GOALS & PRs ── */
function getGoals() { return lsj('gym_goals') || []; }
function getPRs()   { return lsj('gym_prs')   || {}; }

/* ── CALENDAR / STREAK ── */
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getCalDates()     { return lsj('gym_cal_dates') || []; }
function saveCalDates(arr) { lssj('gym_cal_dates', arr); }

function markTodayWorked() {
  const dates = getCalDates(), t = todayISO();
  if (!dates.includes(t)) { dates.push(t); saveCalDates(dates); }
}

function getStreak() {
  const worked = getCalDates();
  if (!worked.length) return 0;
  const sorted = [...worked].sort().reverse();
  const today  = todayISO();
  const ydate  = new Date(); ydate.setDate(ydate.getDate() - 1);
  const yday   = `${ydate.getFullYear()}-${String(ydate.getMonth()+1).padStart(2,'0')}-${String(ydate.getDate()).padStart(2,'0')}`;
  if (!sorted.includes(today) && !sorted.includes(yday)) return 0;
  let streak = 0;
  let cur = new Date(sorted.includes(today) ? today : yday);
  cur.setHours(0, 0, 0, 0);
  while (true) {
    const iso = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
    if (sorted.includes(iso)) { streak++; cur.setDate(cur.getDate() - 1); }
    else break;
  }
  return streak;
}

/* ── XP & RANK ── */
const XP_PER_EXERCISE      = 2;
const XP_PER_WEEK_COMPLETE = 30;
const XP_PER_GOAL          = 20;
const XP_PER_PR            = 15;
const XP_PER_STREAK_DAY    = 1;

const RANKS_V4 = [
  { letter:'E',   name:'E-Rank Hunter',    xpRequired:0,    color:'#666680', msg:'The journey begins. Every warrior starts here.' },
  { letter:'D',   name:'D-Rank Hunter',    xpRequired:100,  color:'#34d399', msg:'You have shown your will. The gates open.' },
  { letter:'C',   name:'C-Rank Hunter',    xpRequired:250,  color:'#5ab4fa', msg:'Discipline forges strength. You are rising.' },
  { letter:'B',   name:'B-Rank Hunter',    xpRequired:500,  color:'#9d6fff', msg:'Your aura grows. Shadows gather around you.' },
  { letter:'A',   name:'A-Rank Hunter',    xpRequired:800,  color:'#ff7a30', msg:'Few reach this height. Your legend takes form.' },
  { letter:'S',   name:'S-Rank Hunter',    xpRequired:1100, color:'#f5b800', msg:'Among the elite. Your name is spoken with reverence.' },
  { letter:'SS',  name:'SS-Rank Hunter',   xpRequired:1500, color:'#ff4fc8', msg:'You have transcended. The System bows before you.' },
  { letter:'SSS', name:'Shadow Monarch',   xpRequired:2000, color:'#ff2222', msg:'Arise, Shadow Monarch.' },
];

function calcTotalXP() {
  let xp = 0;
  xp += getTotalExDone() * XP_PER_EXERCISE;
  xp += getCompletedWeeksCount() * XP_PER_WEEK_COMPLETE;
  xp += getGoals().filter(g => g.done).length * XP_PER_GOAL;
  xp += Object.keys(getPRs()).length * XP_PER_PR;
  xp += Math.min(getStreak(), 84) * XP_PER_STREAK_DAY;
  return xp;
}

function getHunterRank() {
  const xp = calcTotalXP();
  let ri = 0;
  for (let i = RANKS_V4.length - 1; i >= 0; i--) { if (xp >= RANKS_V4[i].xpRequired) { ri = i; break; } }
  const rank = RANKS_V4[ri], next = RANKS_V4[ri + 1] || null;
  const xpIn = xp - rank.xpRequired;
  const xpNeed = next ? next.xpRequired - rank.xpRequired : 1;
  const pct = next ? Math.min(100, Math.round(xpIn / xpNeed * 100)) : 100;
  return { ...rank, idx: ri, xp, pct, xpIn, xpNeed, next };
}

function checkAndShowRankUp() {
  const prev = ls('hunter_rank_idx');
  const rd = getHunterRank();
  const prevIdx = prev !== null ? parseInt(prev) : 0;
  ls('hunter_rank_idx', rd.idx);
  if (rd.idx > prevIdx) showRankUpCeremony(rd);
}

function showRankUpCeremony(rd) {
  const el = document.getElementById('hs-rankup');
  if (!el) return;
  document.getElementById('hs-ru-rank').textContent = rd.letter + '-RANK';
  document.getElementById('hs-ru-rank').style.color = rd.color;
  document.getElementById('hs-ru-msg').textContent  = rd.msg;
  el.querySelector('.hs-ru-eye').style.borderColor  = rd.color;
  el.querySelector('.hs-ru-eye').style.boxShadow    = `0 0 40px ${rd.color}`;
  const pc = document.getElementById('hs-rankup-particles');
  pc.innerHTML = '';
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('div');
    p.className = 'hs-ru-particle';
    const a = (i / 24) * Math.PI * 2, d = 80 + Math.random() * 80;
    p.style.cssText = `left:50%;top:50%;background:${rd.color};--tx:${Math.cos(a)*d}px;--ty:${Math.sin(a)*d}px;animation-delay:${Math.random()*0.3}s`;
    pc.appendChild(p);
  }
  el.classList.add('show');
}

/* ── UNITS ── */
function setUnit(u) {
  currentUnit = u;
  ls('gym_unit', u);
  document.getElementById('hs-btn-kg').classList.toggle('active', u === 'kg');
  document.getElementById('hs-btn-lbs').classList.toggle('active', u === 'lbs');
  if (_activePage === 'workout') renderWorkoutPage();
  if (_activePage === 'stats')   renderStatsPage();
}

/* ── TOAST ── */
let _toastTimer = null;
function showToast(icon, msg) {
  document.getElementById('hs-toast-ico').textContent = icon;
  document.getElementById('hs-toast-msg').textContent = msg;
  const t = document.getElementById('hs-toast');
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

/* ── XP POP ── */
let _xpTimer = null;
function showXPPop(xp) {
  const el = document.getElementById('hs-xp-pop');
  el.textContent = `+${xp} XP`;
  el.classList.remove('fade');
  el.classList.add('show');
  clearTimeout(_xpTimer);
  _xpTimer = setTimeout(() => {
    el.classList.add('fade');
    setTimeout(() => el.classList.remove('show', 'fade'), 500);
  }, 1500);
}

/* ── PAGE ROUTING ── */
function showPage(page) {
  document.querySelectorAll('.hs-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.hs-nav-btn').forEach(b => b.classList.remove('active'));
  const pg = document.getElementById(`hs-page-${page}`);
  const nb = document.getElementById(`hs-nav-${page}`);
  if (pg) pg.classList.add('active');
  if (nb) nb.classList.add('active');
  _activePage = page;
  const renders = { home: renderHomePage, workout: renderWorkoutPage, stats: renderStatsPage, anatomy: renderAnatomyPage, profile: renderProfilePage };
  if (renders[page]) renders[page]();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════════
   HOME PAGE
══════════════════════════════════════════ */
function renderHomePage() {
  updateHeroCard();
  updateCompactStats();
  renderDailyChallenge();
  renderHeatmap();
  renderRPGStats();
  renderMuscleVolume();
}

function updateHeroCard() {
  const rd = getHunterRank();
  const name = ls('hunter_name') || 'Hunter';
  const streak = getStreak();

  // Name / greeting
  const verbs = ['ARISE,', 'RISE,', 'MOVE,', 'GRIND,'];
  const hr = new Date().getHours();
  document.getElementById('hs-greeting').textContent     = verbs[hr<6?0:hr<12?1:hr<17?2:3];
  document.getElementById('hs-hunter-name').textContent  = name.toUpperCase();

  // Rank gem
  document.getElementById('hs-rank-letter').textContent  = rd.letter;
  const gem = document.getElementById('hs-rank-gem');
  gem.style.borderColor  = rd.color;
  gem.style.background   = `${rd.color}1a`;
  gem.style.boxShadow    = `0 0 20px ${rd.color}55,inset 0 0 20px ${rd.color}11`;

  // XP
  document.getElementById('hs-xp-fill').style.width     = rd.pct + '%';
  document.getElementById('hs-xp-value').textContent    = rd.next ? `${rd.xpIn} / ${rd.xpNeed} XP` : 'MAX';

  // Streak
  document.getElementById('hs-streak-num').textContent  = streak;
  document.getElementById('hs-streak-lbl').textContent  = 'DAY STREAK';

  // Nav badge
  const nb = document.getElementById('hs-rank-badge');
  nb.textContent    = rd.letter;
  nb.style.background  = rd.color;
  nb.style.boxShadow   = `0 0 12px ${rd.color}55`;

  // Today status
  const dowJS  = new Date().getDay();
  const dayIdx = dowJS === 0 ? 6 : dowJS - 1;
  const dayData = DAYS[dayIdx];
  let todayDone = false;
  for (let w = 1; w <= 12; w++) {
    const allDone = dayData.exercises.every((_, ei) => isChecked(w, dayIdx, ei));
    if (allDone && dayData.exercises.length > 0) { todayDone = true; break; }
  }
  const sbox = document.getElementById('hs-status-box');
  const stxt = document.getElementById('hs-status-text');
  const ssub = document.getElementById('hs-status-sub');
  if (todayDone) {
    sbox.classList.remove('pending');
    stxt.textContent = 'COMPLETED';
    ssub.textContent = "Today's workout ✓";
  } else {
    sbox.classList.add('pending');
    stxt.textContent = 'PENDING';
    ssub.textContent = 'Complete today\'s workout';
  }

  // 7-day strip
  renderStreakStrip();
}

function renderStreakStrip() {
  const el = document.getElementById('hs-week-strip');
  if (!el) return;
  const worked = getCalDates();
  const today  = new Date(); today.setHours(0,0,0,0);
  const dayNames = ['M','T','W','T','F','S','S'];
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const dn  = dayNames[d.getDay() === 0 ? 6 : d.getDay() - 1];
    const done  = worked.includes(iso);
    const isToday = i === 0;
    const isPast  = i > 0 && !done;
    const cls = done ? 'done' : isToday ? 'today' : isPast ? 'miss' : '';
    html += `<div class="hs-strip-day ${cls}"><span class="hs-strip-d">${dn}</span><span class="hs-strip-ico">${done ? '✓' : isToday ? '●' : '·'}</span></div>`;
  }
  el.innerHTML = html;
}

function updateCompactStats() {
  const totalEx = DAYS.reduce((s,d) => s+d.exercises.length, 0) * 12;
  const done    = getTotalExDone();
  document.getElementById('hs-stat-wks').textContent  = getCompletedWeeksCount();
  document.getElementById('hs-stat-ex').textContent   = done;
  document.getElementById('hs-stat-q').textContent    = getGoals().filter(g => g.done).length;
  document.getElementById('hs-stat-pct').textContent  = Math.round(done / totalEx * 100) + '%';
}

function renderRPGStats() {
  let str = 0, end = 0, agi = 0, wil = 0;
  for (let w = 1; w <= 12; w++) {
    DAYS.forEach((day, di) => {
      day.exercises.forEach((ex, ei) => {
        if (!isChecked(w, di, ei)) return;
        const m = MUSCLE_MAP[ex.name] || '';
        if (ex.cardio) end++;
        else if (['Chest','Back','Shoulders'].includes(m)) str += (ex.numSets || 1);
        else if (['Legs','Glutes','Hamstrings','Calves'].includes(m)) agi += (ex.numSets || 1);
        else wil++;
      });
    });
  }
  wil += getStreak() + getGoals().filter(g => g.done).length;

  const caps = { str: 200, end: 84, agi: 200, wil: 100 };
  const vals = {
    str: Math.min(str, caps.str), end: Math.min(end, caps.end),
    agi: Math.min(agi, caps.agi), wil: Math.min(wil, caps.wil),
  };
  for (const [k, v] of Object.entries(vals)) {
    const ve = document.getElementById(`hs-rpg-${k}`);
    const be = document.getElementById(`hs-rpg-${k}-bar`);
    if (ve) ve.textContent = v;
    if (be) be.style.width = (v / caps[k] * 100) + '%';
  }
}

function getMuscleData() {
  const data = {};
  for (let w = 1; w <= 12; w++) {
    DAYS.forEach((day, di) => {
      day.exercises.forEach((ex, ei) => {
        if (!isChecked(w, di, ei) || ex.cardio) return;
        const m = MUSCLE_MAP[ex.name];
        if (m) data[m] = (data[m] || 0) + (ex.numSets || 1);
      });
    });
  }
  return data;
}

function renderMuscleVolume() {
  const data   = getMuscleData();
  const maxS   = Math.max(...Object.values(data), 1);
  const el     = document.getElementById('hs-muscle-bars');
  if (!el) return;
  el.innerHTML = Object.entries(data)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, sets]) => {
      const color = MUSCLE_COLORS[name] || '#94a3b8';
      const pct   = Math.round(sets / maxS * 100);
      return `<div class="hs-mbar-row">
        <span class="hs-mbar-name">${name}</span>
        <div class="hs-mbar-track"><div class="hs-mbar-fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="hs-mbar-sets">${sets}</span>
      </div>`;
    }).join('');
}

function renderHeatmap() {
  const el     = document.getElementById('hs-heatmap');
  if (!el) return;
  const worked  = getCalDates();
  const partial = lsj('gym_cal_partial') || [];
  const today   = new Date(); today.setHours(0,0,0,0);
  const dow = today.getDay() === 0 ? 7 : today.getDay();
  const start = new Date(today);
  start.setDate(start.getDate() - (12*7 - 1) - (dow - 1));
  const dayNames = ['M','T','W','T','F','S','S'];

  let html = `<div class="hs-heatmap-wrap">
    <div class="hs-heatmap-days">`;
  dayNames.forEach(d => { html += `<div class="hs-hmap-dn">${d}</div>`; });
  html += `</div><div class="hs-heatmap-cols">`;

  for (let wk = 0; wk < 12; wk++) {
    html += `<div class="hs-hmap-col">`;
    for (let day = 0; day < 7; day++) {
      const d = new Date(start); d.setDate(d.getDate() + wk*7 + day);
      const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const isFuture = d > today;
      const isToday  = iso === todayISO();
      let cls = '';
      if (!isFuture) {
        if (worked.includes(iso))  cls = 'l4';
        else if (partial.includes(iso)) cls = 'l2';
      }
      if (isToday) cls += ' tc';
      html += `<div class="hs-hmap-cell ${cls}" title="${iso}"></div>`;
    }
    html += `</div>`;
  }
  html += `</div></div>`;
  el.innerHTML = html;
}

/* ── DAILY CHALLENGE ── */
function getChallengeKey() {
  const d = new Date();
  return `hs_chal_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
}
function isChallengeCompleted() { return localStorage.getItem(getChallengeKey()) === 'done'; }

function renderDailyChallenge() {
  const ch   = getTodayChallenge();
  const done = isChallengeCompleted();
  const card = document.getElementById('hs-challenge-card');
  if (!card) return;
  card.className = 'hs-challenge' + (done ? ' done' : '');
  document.getElementById('hs-chal-icon').textContent  = ch.icon;
  document.getElementById('hs-chal-title').textContent = done ? '✓ ' + ch.title : ch.title;
  document.getElementById('hs-chal-desc').textContent  = ch.desc;
  document.getElementById('hs-chal-xp').textContent    = done ? '✓ DONE' : `+${ch.xp} XP`;
}

function completeDailyChallenge() {
  if (isChallengeCompleted()) return;
  const ch = getTodayChallenge();
  localStorage.setItem(getChallengeKey(), 'done');
  markTodayWorked();
  renderDailyChallenge();
  showXPPop(ch.xp);
  showToast('🎯', `Challenge: ${ch.title}! +${ch.xp} XP`);
  checkAndShowRankUp();
  updateHeroCard();
}

/* ══════════════════════════════════════════
   WORKOUT PAGE
══════════════════════════════════════════ */
function renderWorkoutPage() {
  renderTodayBanner();
  renderWeekPills();
  renderWeekContent(currentWeek);
}

function renderTodayBanner() {
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dow    = new Date().getDay();
  const dayIdx = dow === 0 ? 6 : dow - 1;
  const day    = DAYS[dayIdx];
  document.getElementById('hs-td-day').textContent  = `TODAY — ${days[dow].toUpperCase()}`;
  document.getElementById('hs-td-focus').textContent = day.focus;
  const exXP = day.exercises.filter(e => !e.cardio && e.numSets > 0).length * XP_PER_EXERCISE;
  document.getElementById('hs-td-xp').textContent   = `+${exXP} XP`;
}

function renderWeekPills() {
  const el = document.getElementById('hs-weeks-scroll');
  if (!el) return;
  el.innerHTML = '';
  for (let w = 1; w <= 12; w++) {
    const p = getWeekProgress(w);
    const btn = document.createElement('button');
    btn.className = `hs-week-pill${w === currentWeek ? ' active' : ''}${p.complete ? ' complete' : ''}`;
    btn.textContent = `Week ${w}`;
    btn.onclick = () => { currentWeek = w; renderWeekPills(); renderWeekContent(w); };
    el.appendChild(btn);
  }
  // scroll active pill into view
  setTimeout(() => {
    const active = el.querySelector('.active');
    if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }, 50);
}

function renderWeekContent(week) {
  const el = document.getElementById('hs-week-content');
  if (!el) return;
  el.innerHTML = '';

  const prog = getWeekProgress(week);

  // Week header row
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
  hdr.innerHTML = `
    <div>
      <span style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--text)">Week ${week}</span>
      <span class="hs-phase-tag phase-${(PHASE_NAMES[week]||'').toLowerCase()}" style="margin-left:8px">${PHASE_NAMES[week]||''}</span>
    </div>
    <span style="font-family:var(--font-display);font-size:14px;font-weight:700;color:${prog.complete?'var(--green)':'var(--text2)'}">
      ${prog.complete ? '🏆 COMPLETE' : prog.pct + '%'}
    </span>`;
  el.appendChild(hdr);

  // Phase guidance
  if (PHASES[week]) {
    const g = document.createElement('div');
    g.style.cssText = 'font-size:12px;color:var(--text2);background:rgba(139,92,246,0.07);border:1px solid rgba(139,92,246,0.14);border-radius:9px;padding:10px 13px;margin-bottom:12px;font-style:italic;';
    g.textContent = PHASES[week];
    el.appendChild(g);
  }

  // Body weight card
  const wt = getBodyWeight(week);
  const bwDiv = document.createElement('div');
  bwDiv.className = 'hs-bw-row';
  bwDiv.innerHTML = `
    <span class="hs-bw-lbl">⚖️ Weigh-In</span>
    <input class="hs-bw-inp" id="hs-wi-${week}" type="number" step="0.1" min="20" max="500"
      placeholder="${currentUnit==='kg'?'70.0':'154'}" value="${wt !== null ? toDisp(wt) : ''}">
    <span class="hs-bw-unit">${currentUnit}</span>
    <button class="hs-bw-save" onclick="saveBodyWt(${week})">Save</button>`;
  el.appendChild(bwDiv);

  // Day cards
  const todayDow   = new Date().getDay();
  const todayDayIdx = todayDow === 0 ? 6 : todayDow - 1;

  DAYS.forEach((dayData, dayIdx) => {
    const dayDone  = dayData.exercises.filter((_, ei) => isChecked(week, dayIdx, ei)).length;
    const isAllDone = dayDone === dayData.exercises.length;
    const isToday   = dayIdx === todayDayIdx;

    const card = document.createElement('div');
    card.className = 'hs-day-card';
    card.id = `hs-day-${dayIdx}`;
    const dayPct = dayData.exercises.length ? Math.round(dayDone / dayData.exercises.length * 100) : 0;

    card.innerHTML = `
      <div class="hs-day-hdr" onclick="toggleDay(${dayIdx})">
        <div class="hs-day-hdr-left">
          <div class="hs-day-circle">${DAY_ICONS[dayIdx]}</div>
          <div>
            <div class="hs-day-name">${dayData.day}${isToday ? ' <span style="font-size:10px;color:var(--accent);font-family:var(--font-display);letter-spacing:0.1em">TODAY</span>' : ''}</div>
            <div class="hs-day-focus">${dayData.focus}</div>
          </div>
        </div>
        <div class="hs-day-badge ${isAllDone ? 'done' : ''}">${isAllDone ? '✓ Done' : dayDone + '/' + dayData.exercises.length}</div>
      </div>
      <div class="hs-day-prog-bar"><div class="hs-day-prog-fill" style="width:${dayPct}%"></div></div>
      <div class="hs-day-body ${isToday ? 'open' : ''}" id="hs-db-${dayIdx}">
        <div class="hs-day-actions">
          <button class="hs-btn-all" onclick="checkAllDay(${week},${dayIdx})">✓ Complete All</button>
        </div>
        <div id="hs-exlist-${week}-${dayIdx}"></div>
      </div>`;
    el.appendChild(card);

    // Build ex list
    setTimeout(() => buildExList(week, dayIdx, dayData), 0);
  });
}

function buildExList(week, dayIdx, dayData) {
  const list = document.getElementById(`hs-exlist-${week}-${dayIdx}`);
  if (!list) return;
  list.innerHTML = '';
  dayData.exercises.forEach((ex, exIdx) => {
    const done       = isChecked(week, dayIdx, exIdx);
    const hasWeights = !ex.cardio && ex.numSets > 0;
    const row        = document.createElement('div');
    row.className    = `hs-ex-row${done ? ' done' : ''}`;
    row.id           = `hs-exr-${week}-${dayIdx}-${exIdx}`;

    let wtPanel = '';
    if (hasWeights) {
      let inputs = '';
      for (let s = 0; s < Math.min(ex.numSets, 4); s++) {
        const cur  = getExWeight(week, dayIdx, exIdx, s);
        const prev = week > 1 ? getExWeight(week-1, dayIdx, exIdx, s) : '';
        inputs += `<div class="hs-set-wrap">
          <span class="hs-set-lbl">SET ${s+1}</span>
          <input class="hs-set-inp" type="number" step="0.5" min="0" max="500"
            placeholder="${currentUnit==='kg'?'kg':'lbs'}" value="${esc(cur)}"
            data-week="${week}" data-day="${dayIdx}" data-ex="${exIdx}" data-set="${s}"
            oninput="onSetWt(this)">
          <span class="hs-set-prev">${prev ? 'prev: '+prev : '—'}</span>
        </div>`;
      }
      wtPanel = `<div class="hs-wt-panel" id="hs-wtp-${week}-${dayIdx}-${exIdx}"><div class="hs-sets-row">${inputs}</div></div>`;
    }

    row.innerHTML = `
      <div class="hs-ex-cb" onclick="toggleEx(${week},${dayIdx},${exIdx})">
        <svg viewBox="0 0 12 10"><polyline points="1 5 4.5 9 11 1"/></svg>
      </div>
      <div class="hs-ex-info" onclick="${hasWeights ? `toggleWtPanel(${week},${dayIdx},${exIdx})` : `toggleEx(${week},${dayIdx},${exIdx})`}">
        <div class="hs-ex-nm">${esc(ex.name)}</div>
        <span class="hs-ex-sets-tag${ex.cardio ? ' cardio' : ''}">${esc(ex.sets)}</span>
      </div>
      ${wtPanel}`;
    list.appendChild(row);
  });
}

function toggleDay(dayIdx) {
  const body = document.getElementById(`hs-db-${dayIdx}`);
  if (body) body.classList.toggle('open');
}

function toggleWtPanel(week, dayIdx, exIdx) {
  const p = document.getElementById(`hs-wtp-${week}-${dayIdx}-${exIdx}`);
  if (p) p.classList.toggle('open');
}

function toggleEx(week, dayIdx, exIdx) {
  const was = isChecked(week, dayIdx, exIdx);
  setChecked(week, dayIdx, exIdx, !was);
  const row = document.getElementById(`hs-exr-${week}-${dayIdx}-${exIdx}`);
  if (row) row.className = `hs-ex-row${!was ? ' done' : ''}`;
  if (!was) {
    markTodayWorked();
    showXPPop(XP_PER_EXERCISE);
    checkAndShowRankUp();
    updateHeroCard();
  }
  refreshDayBadge(week, dayIdx);
  if (!was) {
    const dayDone = DAYS[dayIdx].exercises.filter((_, ei) => isChecked(week, dayIdx, ei)).length;
    if (dayDone === DAYS[dayIdx].exercises.length) showToast('🏆', `${DAYS[dayIdx].day} complete!`);
  }
}

function refreshDayBadge(week, dayIdx) {
  const dayData = DAYS[dayIdx];
  const done    = dayData.exercises.filter((_, ei) => isChecked(week, dayIdx, ei)).length;
  const all     = done === dayData.exercises.length;
  const badge   = document.querySelector(`#hs-day-${dayIdx} .hs-day-badge`);
  if (badge) { badge.className = `hs-day-badge${all ? ' done' : ''}`; badge.textContent = all ? '✓ Done' : done + '/' + dayData.exercises.length; }
  const fill = document.querySelector(`#hs-day-${dayIdx} .hs-day-prog-fill`);
  if (fill) fill.style.width = (dayData.exercises.length ? Math.round(done/dayData.exercises.length*100) : 0) + '%';
}

function checkAllDay(week, dayIdx) {
  DAYS[dayIdx].exercises.forEach((_, ei) => setChecked(week, dayIdx, ei, true));
  markTodayWorked();
  buildExList(week, dayIdx, DAYS[dayIdx]);
  refreshDayBadge(week, dayIdx);
  checkAndShowRankUp();
  updateHeroCard();
  showToast('🏆', `${DAYS[dayIdx].day} — ALL DONE!`);
  showXPPop(DAYS[dayIdx].exercises.length * XP_PER_EXERCISE);
}

function saveBodyWt(week) {
  const inp = document.getElementById(`hs-wi-${week}`);
  if (!inp) return;
  const val = parseFloat(inp.value);
  if (isNaN(val) || val < 20 || val > 500) {
    inp.style.borderColor = '#f87171';
    setTimeout(() => inp.style.borderColor = '', 1200);
    return;
  }
  setBodyWeight(week, toKg(val));
  showToast('⚖️', `Week ${week} weight: ${val} ${currentUnit} saved`);
}

function onSetWt(inp) {
  setExWeight(+inp.dataset.week, +inp.dataset.day, +inp.dataset.ex, +inp.dataset.set, inp.value);
}

function goToTodayWorkout() {
  showPage('workout');
  const dow = new Date().getDay();
  const di  = dow === 0 ? 6 : dow - 1;
  setTimeout(() => {
    const body = document.getElementById(`hs-db-${di}`);
    if (body) { body.classList.add('open'); body.scrollIntoView({ behavior:'smooth', block:'start' }); }
  }, 200);
}

/* ══════════════════════════════════════════
   STATS PAGE
══════════════════════════════════════════ */
function renderStatsPage() {
  renderWeightStats();
  renderXPChart();
  renderPRList();
  updateBMI();
}

function renderWeightStats() {
  const weights = getWeights();
  const entries = [];
  for (let w = 1; w <= 12; w++) if (weights[w] !== undefined) entries.push({ week: w, kg: weights[w] });

  if (entries.length > 0) {
    const first = entries[0], last = entries[entries.length - 1];
    document.getElementById('hs-wt-start').textContent = toDisp(first.kg) + ' ' + currentUnit;
    document.getElementById('hs-wt-cur').textContent   = toDisp(last.kg)  + ' ' + currentUnit;
    const diff = +(toDisp(last.kg) - toDisp(first.kg)).toFixed(1);
    const sign = diff < 0 ? '' : diff > 0 ? '+' : '';
    const cel = document.getElementById('hs-wt-chg');
    cel.textContent = sign + diff + ' ' + currentUnit;
    cel.style.color = diff < 0 ? 'var(--green)' : diff > 0 ? 'var(--red)' : 'var(--text)';
  } else {
    ['hs-wt-start','hs-wt-cur','hs-wt-chg'].forEach(id => { document.getElementById(id).textContent = '—'; document.getElementById(id).style.color = 'var(--text)'; });
  }

  const area = document.getElementById('hs-wt-chart');
  if (!area) return;
  if (entries.length < 2) {
    area.innerHTML = '<div class="hs-empty"><div class="hs-empty-ico">📉</div><div class="hs-empty-txt">Log weight in at least 2 weeks to see your chart.</div></div>';
    return;
  }
  area.innerHTML = '';
  area.appendChild(buildWeightSVG(entries));
}

function buildWeightSVG(entries) {
  const W=340, H=155, P={t:18,r:14,b:30,l:42};
  const iW=W-P.l-P.r, iH=H-P.t-P.b;
  const vals = entries.map(e => toDisp(e.kg));
  const minV=Math.min(...vals), maxV=Math.max(...vals);
  const range=maxV-minV||1, pad=range*0.35;
  const yMin=minV-pad, yMax=maxV+pad;
  const xS = i => P.l + (entries[i].week-1)/11*iW;
  const yS = v => P.t + (1-(v-yMin)/(yMax-yMin))*iH;
  const pts = entries.map((_,i) => `${xS(i).toFixed(1)},${yS(vals[i]).toFixed(1)}`);

  let ytks = '';
  for (let i=0; i<=3; i++) {
    const v = yMin + (yMax-yMin)*i/3;
    ytks += `<line x1="${P.l}" y1="${yS(v).toFixed(1)}" x2="${P.l+iW}" y2="${yS(v).toFixed(1)}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`;
    ytks += `<text x="${P.l-5}" y="${(yS(v)+4).toFixed(1)}" text-anchor="end" font-size="9" fill="#475569" font-family="Rajdhani">${v.toFixed(0)}</text>`;
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  svg.setAttribute('class','hs-svg-chart');
  svg.innerHTML = `
    <defs>
      <linearGradient id="hs-wg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${ytks}
    <path d="M${xS(0).toFixed(1)},${(P.t+iH).toFixed(1)} L${pts.join(' L')} L${xS(entries.length-1).toFixed(1)},${(P.t+iH).toFixed(1)} Z" fill="url(#hs-wg)"/>
    <path d="M${pts.join(' L')}" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${entries.map((_,i) => `
      <circle cx="${xS(i).toFixed(1)}" cy="${yS(vals[i]).toFixed(1)}" r="4" fill="#8b5cf6" stroke="#080b14" stroke-width="2"/>
      <text x="${xS(i).toFixed(1)}" y="${(yS(vals[i])-9).toFixed(1)}" text-anchor="middle" font-size="9" fill="#8b5cf6" font-weight="700" font-family="Rajdhani">${vals[i]}</text>
      <text x="${xS(i).toFixed(1)}" y="${(P.t+iH+16).toFixed(1)}" text-anchor="middle" font-size="9" fill="#475569" font-family="Rajdhani">W${entries[i].week}</text>
    `).join('')}`;
  return svg;
}

function renderXPChart() {
  const area = document.getElementById('hs-xp-chart');
  if (!area) return;
  const weekly = [];
  for (let w = 1; w <= 12; w++) {
    let xp = 0;
    DAYS.forEach((day, di) => day.exercises.forEach((_,ei) => { if (isChecked(w,di,ei)) xp += XP_PER_EXERCISE; }));
    if (getWeekProgress(w).complete) xp += XP_PER_WEEK_COMPLETE;
    weekly.push(xp);
  }
  const maxXP = Math.max(...weekly, 1);
  const W=340, H=100, P={t:12,r:10,b:24,l:8};
  const iW=W-P.l-P.r, iH=H-P.t-P.b;
  const bw = iW/12 - 3;

  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  svg.setAttribute('class','hs-svg-chart');
  let inner = '';
  weekly.forEach((xp, i) => {
    const h = xp > 0 ? Math.max(4, (xp/maxXP)*iH) : 2;
    const x = P.l + i*(iW/12) + 1;
    const y = P.t + iH - h;
    const op = xp > 0 ? 1 : 0.18;
    inner += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="#8b5cf6" opacity="${op}"/>`;
    if (xp > 0) inner += `<text x="${(x+bw/2).toFixed(1)}" y="${(y-3).toFixed(1)}" text-anchor="middle" font-size="8" fill="#8b5cf6" font-family="Orbitron">${xp}</text>`;
    inner += `<text x="${(x+bw/2).toFixed(1)}" y="${(P.t+iH+14).toFixed(1)}" text-anchor="middle" font-size="8" fill="#475569" font-family="Rajdhani">W${i+1}</text>`;
  });
  svg.innerHTML = inner;
  area.innerHTML = '';
  area.appendChild(svg);
}

function renderPRList() {
  const el = document.getElementById('hs-pr-list');
  if (!el) return;
  const prs = getPRs();
  const entries = Object.entries(prs);
  if (!entries.length) {
    el.innerHTML = '<div class="hs-empty"><div class="hs-empty-ico">🏆</div><div class="hs-empty-txt">No PRs yet. Log weights in workouts to auto-detect PRs!</div></div>';
    return;
  }
  el.innerHTML = entries.map(([lift, data]) => `
    <div class="hs-pr-row">
      <span style="font-size:18px">🏆</span>
      <div style="flex:1">
        <div class="hs-pr-name">${esc(lift)}</div>
        <div class="hs-pr-date">${data.date || ''}</div>
      </div>
      <div class="hs-pr-val">${data.kg} kg</div>
    </div>`).join('');
}

function updateBMI() {
  const h = parseFloat(document.getElementById('hs-bmi-h').value);
  const w = parseFloat(document.getElementById('hs-bmi-w').value);
  if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) return;
  const bmi = w / ((h/100)*(h/100));
  const numEl = document.getElementById('hs-bmi-num');
  const catEl = document.getElementById('hs-bmi-cat');
  const ptr   = document.getElementById('hs-bmi-ptr');
  numEl.textContent = bmi.toFixed(1);
  let cat, color, pct;
  if      (bmi < 18.5) { cat='UNDERWEIGHT'; color='#34d399'; pct=bmi/18.5*20; }
  else if (bmi < 25)   { cat='NORMAL';      color='#60a5fa'; pct=20+(bmi-18.5)/6.5*30; }
  else if (bmi < 30)   { cat='OVERWEIGHT';  color='#fbbf24'; pct=50+(bmi-25)/5*25; }
  else                 { cat='OBESE';        color='#f87171'; pct=Math.min(96,75+(bmi-30)/10*20); }
  numEl.style.color = color;
  catEl.style.color = color;
  catEl.textContent = cat;
  if (ptr) ptr.style.left = pct + '%';
}

/* ══════════════════════════════════════════
   ANATOMY PAGE
══════════════════════════════════════════ */
function renderAnatomyPage() {
  const data   = getMuscleData();
  const maxS   = Math.max(...Object.values(data), 1);
  const grid   = document.getElementById('hs-anatomy-grid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.entries(MUSCLE_COLORS).forEach(([muscle, color]) => {
    const sets = data[muscle] || 0;
    const pct  = Math.round(sets / maxS * 100);
    const btn  = document.createElement('button');
    btn.className = `hs-anm-btn${activeAnatomy === muscle ? ' active' : ''}`;
    btn.innerHTML = `
      <div class="hs-anm-name" style="color:${color}">${muscle}</div>
      <div class="hs-anm-bar-track"><div class="hs-anm-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="hs-anm-sets">${sets} sets</div>`;
    btn.onclick = () => {
      activeAnatomy = muscle;
      renderAnatomyPage();
      setTimeout(() => document.getElementById('hs-anm-detail')?.scrollIntoView({ behavior:'smooth', block:'nearest' }), 80);
    };
    grid.appendChild(btn);
  });

  const detail = document.getElementById('hs-anm-detail');
  if (!activeAnatomy || !detail) { if (detail) detail.innerHTML = ''; return; }

  const color = MUSCLE_COLORS[activeAnatomy] || '#94a3b8';
  const exList = Object.entries(MUSCLE_MAP)
    .filter(([_, m]) => m === activeAnatomy)
    .map(([name]) => {
      let done = 0;
      for (let w=1;w<=12;w++) DAYS.forEach((day,di) => day.exercises.forEach((ex,ei) => {
        if (ex.name === name && isChecked(w,di,ei)) done += (ex.numSets||1);
      }));
      return { name, done };
    });

  detail.innerHTML = `
    <div class="hs-anm-detail">
      <div style="font-family:var(--font-ui);font-size:11px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;color:${color};margin-bottom:12px;display:flex;align-items:center;gap:8px">
        ${activeAnatomy} EXERCISES
        <div style="flex:1;height:1px;background:var(--border)"></div>
      </div>
      <div class="hs-anm-exs">
        ${exList.map(e => `
          <div class="hs-anm-ex">
            <span style="font-size:18px">💪</span>
            <span class="hs-anm-ex-name">${esc(e.name)}</span>
            <span class="hs-anm-ex-sets" style="color:${color}">${e.done} sets</span>
          </div>`).join('')}
        ${exList.length === 0 ? '<div class="hs-empty-txt" style="padding:10px">No exercises logged yet.</div>' : ''}
      </div>
    </div>`;
}

/* ══════════════════════════════════════════
   PROFILE PAGE
══════════════════════════════════════════ */
function renderProfilePage() {
  const rd   = getHunterRank();
  const name = ls('hunter_name') || 'Hunter';

  document.getElementById('hs-profile-name').textContent = name.toUpperCase();
  document.getElementById('hs-profile-rank').textContent = rd.name.toUpperCase();
  document.getElementById('hs-profile-msg').textContent  = rd.msg;

  const portrait = document.getElementById('hs-portrait');
  portrait.src   = `images/dark_${rd.letter.toLowerCase()}.png`;
  portrait.style.borderColor = rd.color;
  portrait.style.boxShadow   = `0 0 24px ${rd.color}55`;

  document.getElementById('hs-profile-xp-fill').style.width   = rd.pct + '%';
  document.getElementById('hs-profile-xp-text').textContent   = rd.next ? `${rd.xpIn} / ${rd.xpNeed} XP` : 'MAX';

  const grid = document.getElementById('hs-profile-weeks');
  if (grid) {
    grid.innerHTML = '';
    for (let w = 1; w <= 12; w++) {
      const p = getWeekProgress(w);
      const cell = document.createElement('div');
      cell.className = `hs-pw-cell${p.complete ? ' done' : p.done > 0 ? ' partial' : ''}`;
      cell.innerHTML = `<div class="hs-pw-num">${p.complete ? '✓' : w}</div><div class="hs-pw-pct">${p.pct}%</div>`;
      cell.onclick   = () => { currentWeek = w; showPage('workout'); };
      grid.appendChild(cell);
    }
  }
  const nameInp = document.getElementById('hs-name-inp');
  if (nameInp) nameInp.value = name;

  updateHeroCard();
}

function saveProfileName() {
  const inp  = document.getElementById('hs-name-inp');
  const name = inp?.value?.trim();
  if (!name) return;
  ls('hunter_name', name);
  renderProfilePage();
  showToast('👤', 'Hunter name updated!');
}

/* ══════════════════════════════════════════
   QUEST MODAL
══════════════════════════════════════════ */
const SIDE_QUESTS = [
  { id:'sq1',  icon:'💪', name:'Iron Push-ups',     desc:'Complete 20 push-ups right now',          xp:15 },
  { id:'sq2',  icon:'🦵', name:'Squat Blitz',        desc:'Do 30 bodyweight squats',                 xp:15 },
  { id:'sq3',  icon:'🧱', name:'Plank Protocol',     desc:'Hold a plank for 60 seconds',             xp:20 },
  { id:'sq4',  icon:'🤸', name:'Jumping Jacks',      desc:'Complete 50 jumping jacks',               xp:12 },
  { id:'sq5',  icon:'⚡', name:'Core Crusher',       desc:'Do 3×15 crunches',                        xp:18 },
  { id:'sq6',  icon:'🔥', name:'Burpee Protocol',    desc:'10 burpees as fast as possible',          xp:25 },
  { id:'sq7',  icon:'🧘', name:'Flex Session',       desc:'Stretch for 5 minutes',                   xp:10 },
  { id:'sq8',  icon:'💧', name:'Hydration Quest',    desc:'Drink 500ml of water right now',          xp:8  },
  { id:'sq9',  icon:'🏃', name:'Lunge Assault',      desc:'20 walking lunges (10 each leg)',         xp:15 },
  { id:'sq10', icon:'🏔️', name:'Mountain Climbers',  desc:'30 mountain climbers',                    xp:18 },
];

function getDailyQuestKey() {
  const d = new Date();
  return `sq_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
}

function getDailyQuests() {
  const key = getDailyQuestKey() + '_sel';
  const cached = lsj(key);
  if (cached) return cached;
  const selected = [...SIDE_QUESTS].sort(() => Math.random() - 0.5).slice(0, 3);
  lssj(key, selected);
  return selected;
}

function getQuestState() { return lsj(getDailyQuestKey() + '_state') || {}; }

function openQuestModal() {
  document.getElementById('hs-quest-overlay').classList.add('open');
  renderQuestList();
}

function closeQuestModal(e) {
  if (e.target === document.getElementById('hs-quest-overlay')) {
    document.getElementById('hs-quest-overlay').classList.remove('open');
  }
}

function renderQuestList() {
  const quests  = getDailyQuests();
  const state   = getQuestState();
  const allDone = quests.every(q => state[q.id]);
  const remaining = quests.reduce((s, q) => s + (state[q.id] ? 0 : q.xp), 0);

  document.getElementById('hs-quest-list').innerHTML = quests.map(q => {
    const done = !!state[q.id];
    return `<div class="hs-quest-item${done?' done':''}" onclick="toggleQuest('${q.id}')">
      <div class="hs-q-ico">${q.icon}</div>
      <div class="hs-q-info">
        <div class="hs-q-name">${q.name}</div>
        <div class="hs-q-desc">${q.desc}</div>
      </div>
      <div class="hs-q-xp">${done ? '✓' : '+'+q.xp+' XP'}</div>
    </div>`;
  }).join('');

  const btn = document.getElementById('hs-quest-claim');
  btn.disabled    = !quests.some(q => !state[q.id]);
  const bonusXP   = allDone ? 0 : 25;
  btn.textContent = allDone ? '✓ ALL COMPLETE' : `CLAIM ALL REWARDS (+${remaining + bonusXP} XP)`;

  const sub = document.getElementById('hs-quest-sub');
  sub.textContent = allDone ? '🎉 ALL QUESTS COMPLETE — BONUS EARNED!' : 'COMPLETE ALL FOR +25 BONUS XP';
}

function toggleQuest(id) {
  const quests = getDailyQuests();
  const q      = quests.find(x => x.id === id);
  if (!q) return;
  const state = getQuestState();
  if (state[id]) delete state[id];
  else { state[id] = true; showXPPop(q.xp); showToast(q.icon, `${q.name} — +${q.xp} XP`); }
  lssj(getDailyQuestKey() + '_state', state);
  renderQuestList();
  checkAndShowRankUp();
  if (_activePage === 'home') updateHeroCard();
}

function claimAllQuests() {
  const quests = getDailyQuests();
  const state  = getQuestState();
  let totalXP  = 0;
  quests.forEach(q => { if (!state[q.id]) { state[q.id] = true; totalXP += q.xp; } });
  if (totalXP > 0) totalXP += 25;
  lssj(getDailyQuestKey() + '_state', state);
  markTodayWorked();
  if (totalXP > 0) { showXPPop(totalXP); showToast('⚡', `All quests complete! +${totalXP} XP`); }
  renderQuestList();
  checkAndShowRankUp();
  if (_activePage === 'home') updateHeroCard();
}

/* ══════════════════════════════════════════
   ONBOARDING
══════════════════════════════════════════ */
function onboardConfirm() {
  const inp  = document.getElementById('hs-ob-inp');
  const name = inp?.value?.trim();
  if (!name) { if (inp) { inp.style.borderColor='#f87171'; setTimeout(()=>inp.style.borderColor='',1000); } return; }
  ls('hunter_name', name);
  ls('hunter_rank_idx', '0');
  const overlay = document.getElementById('hs-onboard');
  overlay.classList.add('fade');
  setTimeout(() => { overlay.classList.add('gone'); initApp(); }, 480);
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
function initApp() {
  // Find first incomplete week
  currentWeek = 12;
  for (let w = 1; w <= 12; w++) { if (!getWeekProgress(w).complete) { currentWeek = w; break; } }

  document.getElementById('hs-btn-kg').classList.toggle('active', currentUnit === 'kg');
  document.getElementById('hs-btn-lbs').classList.toggle('active', currentUnit === 'lbs');

  renderHomePage();

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

  renderFoodStreak();
}

/* ══════════════════════════════════════════
   PWA INSTALL PROMPT
══════════════════════════════════════════ */
let _deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  if (!localStorage.getItem('pwa_install_dismissed')) {
    const banner = document.getElementById('hs-install-banner');
    if (banner) banner.classList.remove('gone');
  }
});

window.addEventListener('appinstalled', () => {
  _deferredInstallPrompt = null;
  const banner = document.getElementById('hs-install-banner');
  if (banner) banner.classList.add('gone');
  showToast('⚔️', "Hunter's System installed!");
});

function pwaInstall() {
  if (!_deferredInstallPrompt) return;
  _deferredInstallPrompt.prompt();
  _deferredInstallPrompt.userChoice.then((choice) => {
    _deferredInstallPrompt = null;
    if (choice.outcome === 'accepted') {
      const banner = document.getElementById('hs-install-banner');
      if (banner) banner.classList.add('gone');
    }
  });
}

function pwaDismiss() {
  localStorage.setItem('pwa_install_dismissed', '1');
  const banner = document.getElementById('hs-install-banner');
  if (banner) banner.classList.add('gone');
}

/* ══════════════════════════════════════════
   FAST FOOD / CLEAN DIET STREAK
══════════════════════════════════════════ */
function getDietLog()        { return lsj('diet_log') || {}; }
function saveDietLog(log)    { lssj('diet_log', log); }
function getDietBest()       { return parseInt(localStorage.getItem('diet_best_streak') || '0', 10); }

function getDietStreak() {
  const log   = getDietLog();
  const today = todayISO();
  let streak  = 0;
  let cur     = new Date();
  cur.setHours(0, 0, 0, 0);
  // if today is clean, start counting from today; otherwise start from yesterday
  if (log[today] !== 'clean') cur.setDate(cur.getDate() - 1);
  while (true) {
    const iso = cur.getFullYear() + '-' +
      String(cur.getMonth()+1).padStart(2,'0') + '-' +
      String(cur.getDate()).padStart(2,'0');
    if (log[iso] === 'clean') { streak++; cur.setDate(cur.getDate() - 1); }
    else break;
  }
  return streak;
}

function logDietDay(ateFastFood) {
  const today = todayISO();
  const log   = getDietLog();

  if (log[today] === (ateFastFood ? 'broke' : 'clean')) {
    showToast('⚡', 'Already logged for today!');
    return;
  }

  log[today] = ateFastFood ? 'broke' : 'clean';
  saveDietLog(log);

  const streak = getDietStreak();
  const best   = getDietBest();
  if (streak > best) localStorage.setItem('diet_best_streak', String(streak));

  if (ateFastFood) {
    showToast('🍔', 'Fast food logged. Streak reset. Do better tomorrow!');
  } else {
    showToast('✅', 'Clean day! Streak: ' + streak + ' day' + (streak !== 1 ? 's' : '') + '! Keep going!');
  }

  renderFoodStreak();
}

function renderFoodStreak() {
  const streak    = getDietStreak();
  const best      = Math.max(streak, getDietBest());
  const today     = todayISO();
  const log       = getDietLog();
  const entry     = log[today];

  const numEl     = document.getElementById('hs-ff-streak-num');
  const bestEl    = document.getElementById('hs-ff-best');
  const badge     = document.getElementById('hs-ff-badge');
  const loggedEl  = document.getElementById('hs-ff-logged');
  const cleanBtn  = document.getElementById('hs-ff-btn-clean');
  const brokeBtn  = document.getElementById('hs-ff-btn-broke');
  if (!numEl) return;

  numEl.textContent  = streak;
  bestEl.textContent = 'Best streak: ' + best + ' day' + (best !== 1 ? 's' : '');

  if (badge) {
    badge.className = 'hs-ff-streak-badge';
    if (entry === 'broke')   badge.classList.add('broken');
    else if (streak >= 30)   badge.classList.add('elite');
    else if (streak >= 14)   badge.classList.add('great');
    else if (streak >= 7)    badge.classList.add('good');
  }

  if (entry) {
    loggedEl.textContent = entry === 'clean'
      ? '✅ Today logged as clean!' + (streak > 1 ? ' ' + streak + '-day streak! 🔥' : ' Keep it up!')
      : '🍔 Fast food today. Streak lost. Fresh start tomorrow.';
    loggedEl.className = 'hs-ff-logged ' + entry;
    if (cleanBtn) cleanBtn.disabled = entry === 'clean';
    if (brokeBtn) brokeBtn.disabled = entry === 'broke';
  } else {
    loggedEl.textContent = "Haven't logged today yet 👇";
    loggedEl.className   = 'hs-ff-logged';
    if (cleanBtn) cleanBtn.disabled = false;
    if (brokeBtn) brokeBtn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const hasName = !!ls('hunter_name');
  if (!hasName) {
    document.getElementById('hs-onboard').classList.remove('gone');
  } else {
    document.getElementById('hs-onboard').classList.add('gone');
    initApp();
  }
});
