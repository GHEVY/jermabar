// ── State ──────────────────────────────────────────────────────────────────────
let bestPct = -1;
let history = [];
let hintCooldown = false;

// ── DOM References ─────────────────────────────────────────────────────────────
const wordInput   = document.getElementById('word-input');
const curInd      = document.getElementById('cur-indicator');
const bestInd     = document.getElementById('best-indicator');
const curVal      = document.getElementById('cur-val');
const bestVal     = document.getElementById('best-val');
const resultCard  = document.getElementById('result-card');
const resultWord  = document.getElementById('result-word');
const resultScore = document.getElementById('result-score');
const historyList = document.getElementById('history-list');
const emptyState  = document.getElementById('empty-state');
const clearBtn    = document.getElementById('clear-btn');
const hintBtn     = document.getElementById('hint-btn');
const hintPopup   = document.getElementById('hint-popup');
const hintText    = document.getElementById('hint-text');
const hintClose   = document.getElementById('hint-close');
const apiStatus   = document.getElementById('api-status');

// ── Color Helpers ──────────────────────────────────────────────────────────────
function lerpColor(a, b, t) {
  return `rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`;
}

function getColor(pct) {
  if (pct <= 50) return lerpColor([0,229,255], [123,97,255], pct / 50);
  return lerpColor([123,97,255], [255,61,0], (pct - 50) / 50);
}

// ── Scale / Indicators ────────────────────────────────────────────────────────
function clampedLeft(pct) {
  return Math.min(Math.max(pct, 0), 100) + '%';
}

function updateScale(pct) {
  const color = getColor(pct);
  curInd.classList.add('visible');
  curInd.style.left = clampedLeft(pct);
  curVal.textContent = pct.toFixed(1) + '%';
  curVal.style.color = color;
  curVal.style.filter = `drop-shadow(0 0 8px ${color})`;

  if (pct > bestPct) {
    bestPct = pct;
    setTimeout(() => {
      bestInd.classList.add('visible');
      bestInd.style.left = clampedLeft(bestPct);
      bestVal.textContent = bestPct.toFixed(1) + '%';
    }, 60);
  }
}

// ── Result Card ───────────────────────────────────────────────────────────────
function updateResultCard(word, pct, source) {
  const color = getColor(pct);
  resultCard.classList.add('visible');
  resultCard.style.borderColor = color + '44';
  resultCard.style.boxShadow = `0 20px 60px rgba(0,0,0,0.4), 0 0 40px ${color}18, inset 0 1px 0 rgba(255,255,255,0.06)`;
  resultWord.textContent = word;
  resultScore.textContent = pct.toFixed(1) + '%';
  resultScore.style.color = color;
  resultScore.style.textShadow = `0 0 20px ${color}`;

  const badge = document.getElementById('result-source');
  if (badge) {
    badge.textContent = source === 'api' ? '🌐 API' : source === 'db' ? '📖 DB' : '🎲 Պատahakan';
    badge.style.color = source === 'random' ? 'var(--muted)' : '#7B61FF';
  }
  resultCard.style.animation = 'none';
  void resultCard.offsetWidth;
  resultCard.style.animation = '';
}

// ── History Rendering ─────────────────────────────────────────────────────────
function renderHistory() {
  historyList.innerHTML = '';
  const sorted = [...history].sort((a, b) => b.pct - a.pct);

  if (sorted.length === 0) {
    historyList.appendChild(emptyState);
    return;
  }

  sorted.forEach((item, idx) => {
    const color = getColor(item.pct);
    const el = document.createElement('div');
    el.className = 'history-item';
    el.style.animationDelay = (idx * 0.04) + 's';
    if (item.pct > 90) {
      el.style.borderColor = 'rgba(255,61,0,0.3)';
      el.style.boxShadow = '0 0 20px rgba(255,61,0,0.08)';
    }
    el.innerHTML = `
      <div class="history-rank">${idx + 1}</div>
      <div class="history-color-dot" style="background:${color};box-shadow:0 0 8px ${color}"></div>
      <div class="history-word">${item.word}</div>
      <div class="history-mini-bar">
        <div class="history-mini-bar-fill" style="width:${item.pct}%;background:${color}"></div>
      </div>
      <div class="history-score" style="color:${color};text-shadow:0 0 10px ${color}88">${item.pct.toFixed(1)}%</div>
    `;
    historyList.appendChild(el);
  });
}

// ── Particles ─────────────────────────────────────────────────────────────────
function spawnParticles(pct) {
  if (pct < 85) return;
  const layer = document.getElementById('particles');
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.4;
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size  = 4 + Math.random() * 6;
    const angle = Math.random() * Math.PI * 2;
    const dist  = 60 + Math.random() * 120;
    const color = getColor(pct);
    p.style.cssText = `left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;
      background:${color};box-shadow:0 0 6px ${color};
      --dx:${(Math.cos(angle)*dist).toFixed(1)}px;
      --dy:${(Math.sin(angle)*dist).toFixed(1)}px;
      animation-duration:${(0.6+Math.random()*0.6).toFixed(2)}s;`;
    layer.appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }
}

// ── API Status Badge ──────────────────────────────────────────────────────────
function updateApiStatusBadge() {
  if (!apiStatus) return;
  if (isRemoteActive()) {
    apiStatus.textContent = '🌐 API mitsvac';
    apiStatus.className = 'api-badge connected';
  } else {
    apiStatus.textContent = '📂 Teghakan fayl';
    apiStatus.className = 'api-badge local';
  }
}

// ── Hint System ───────────────────────────────────────────────────────────────
// Tier messages shown based on the hint word's score range
const HINT_TIERS = [
  {
    min: 80,
    prefix: '🔥 Շատ տաք բառ',
    suffix: 'Փորձեք նմանութամբ։'
  },
  {
    min: 50,
    prefix: '☀️ Ջերմ բառ',
    suffix: 'Կաpkveq նման բաer։'
  },
  {
    min: 25,
    prefix: '🌤 Չezarmik',
    suffix: 'Ավelи serm mтacek'
  },
  {
    min: 0,
    prefix: '❄️ Sar bарр',
    suffix: 'Tipеl уshavorin։'
  }
];

function getTier(score) {
  return HINT_TIERS.find(t => score >= t.min) || HINT_TIERS[HINT_TIERS.length - 1];
}

function showHint() {
  if (hintCooldown) return;

  const db = getWordDb();
  const entries = Object.entries(db);

  if (entries.length === 0) {
    hintText.textContent = 'Բazan depem berrнvac che...';
    openHintPopup();
    return;
  }

  // Prefer hot words (score >= 50) not yet tried by the user
  const tried = new Set(history.map(h => h.word));
  let pool = entries.filter(([w, v]) => v >= 50 && !tried.has(w));
  if (pool.length === 0) pool = entries.filter(([w]) => !tried.has(w));
  if (pool.length === 0) pool = entries;

  const [word, score] = pool[Math.floor(Math.random() * pool.length)];
  const tier = getTier(score);
  const color = getColor(score);

  hintText.innerHTML =
    `<span style="color:var(--muted);font-size:0.8rem;letter-spacing:1px">${tier.prefix}</span><br>` +
    `<strong style="font-size:1.25rem;letter-spacing:2px;color:${color}">${word}</strong>` +
    `<span style="color:var(--muted);font-size:0.85rem;margin-left:8px">${score.toFixed(1)}%</span>`;

  openHintPopup();

  // 3s cooldown to prevent spam
  hintCooldown = true;
  hintBtn.style.opacity = '0.45';
  hintBtn.style.pointerEvents = 'none';
  setTimeout(() => {
    hintCooldown = false;
    hintBtn.style.opacity = '1';
    hintBtn.style.pointerEvents = 'auto';
  }, 3000);
}

function openHintPopup() {
  hintPopup.classList.add('visible');
}

function closeHintPopup() {
  hintPopup.classList.remove('visible');
}

// ── Main Process ──────────────────────────────────────────────────────────────
async function processWord(rawWord) {
  const word = rawWord.trim().toLowerCase();
  if (!word) return;

  wordInput.disabled = true;
  closeHintPopup();

  const { score: pct, source } = await getScore(word);

  const existingIdx = history.findIndex(h => h.word === word);
  if (existingIdx !== -1) {
    history[existingIdx].pct = pct;
  } else {
    history.push({ word, pct });
  }

  updateScale(pct);
  updateResultCard(word, pct, source);
  spawnParticles(pct);
  renderHistory();

  wordInput.disabled = false;
  wordInput.focus();
}

function clearHistory() {
  history = [];
  bestPct = -1;
  curInd.classList.remove('visible');
  bestInd.classList.remove('visible');
  resultCard.classList.remove('visible');
  closeHintPopup();
  renderHistory();
}

// ── Event Listeners ───────────────────────────────────────────────────────────
wordInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const val = wordInput.value.trim();
    wordInput.value = '';
    await processWord(val);
  }
});

clearBtn.addEventListener('click', clearHistory);
hintBtn.addEventListener('click', showHint);
hintClose.addEventListener('click', closeHintPopup);

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
  await loadWords();
  updateApiStatusBadge();
  renderHistory();
  wordInput.focus();
});
