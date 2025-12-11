/* ============================================================
   HYBRID WORD SEARCH ENGINE
   Supports:
   - Existing puzzles using PUZZLE_CONFIG
   - New puzzles using LOCKED_TEMPLATE
   - Auto LS_KEY detection for each puzzle folder
   ============================================================ */

/* ========= AUTO-DETECT UNIQUE LS KEY ========= */
function determineLSKey() {
  const path = window.location.pathname.toLowerCase();

  // Paid puzzles: /puzzles/day001/
  const dayMatch = path.match(/day\d{3}/);
  if (dayMatch) return "ws_" + dayMatch[0];

  // Trial puzzles: /trial/trial-day01/
  const trialMatch = path.match(/trial-day\d{2}/);
  if (trialMatch) return "ws_" + trialMatch[0].replace("-", "_");

  // Fallback
  return "ws_default";
}

const LS_KEY = determineLSKey();
const CLEAR_COOKIE = LS_KEY + "_clear";

/* ========= GET PUZZLE CONFIG (OLD + NEW SUPPORT) ========= */
function getConfig() {
  if (window.PUZZLE_CONFIG) return window.PUZZLE_CONFIG;

  console.error("PUZZLE_CONFIG missing — cannot load puzzle.");
  return null;
}

const CONFIG = getConfig();
if (!CONFIG) throw new Error("Puzzle cannot load (missing PUZZLE_CONFIG)");

const GRID_ROWS = CONFIG.gridRows;
const GRID_COLS = CONFIG.gridCols;
const WORDS = CONFIG.words.map(w => w.toUpperCase());
let seed = CONFIG.seed;

/* ========= RNG ========= */
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function choice(arr) { return arr[Math.floor(rand() * arr.length)]; }

const DIRS = [
  { dr: 1, dc: 0 }, { dr: -1, dc: 0 },
  { dr: 0, dc: 1 }, { dr: 0, dc: -1 },
  { dr: 1, dc: 1 }, { dr: -1, dc: -1 },
  { dr: -1, dc: 1 }, { dr: 1, dc: -1 }
];

let grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(""));

function inBounds(r, c) {
  return r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS;
}

function canPlace(word, r, c, dr, dc) {
  for (let i = 0; i < word.length; i++) {
    const rr = r + dr * i, cc = c + dc * i;
    if (!inBounds(rr, cc)) return false;
    const ch = grid[rr][cc];
    if (ch !== "" && ch !== word[i]) return false;
  }
  return true;
}

function placeWord(word) {
  for (let t = 0; t < 2000; t++) {
    const { dr, dc } = choice(DIRS);

    const minR = dr < 0 ? word.length - 1 : 0;
    const maxR = dr > 0 ? GRID_ROWS - word.length : GRID_ROWS - 1;
    const minC = dc < 0 ? word.length - 1 : 0;
    const maxC = dc > 0 ? GRID_COLS - word.length : GRID_COLS - 1;

    const r = Math.floor(rand() * (maxR - minR + 1)) + minR;
    const c = Math.floor(rand() * (maxC - minC + 1)) + minC;

    if (canPlace(word, r, c, dr, dc)) {
      for (let i = 0; i < word.length; i++) {
        grid[r + dr * i][c + dc * i] = word[i];
      }
      return;
    }
  }
}

/* ========= GENERATE PUZZLE ========= */
function generatePuzzle() {
  [...WORDS].sort((a, b) => b.length - a.length).forEach(w => placeWord(w));

  const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = ABC[Math.floor(rand() * 26)];
      }
    }
  }
}

/* ========= DOM ELEMENTS ========= */
const gridEl = document.getElementById("grid");
const wordListEl = document.getElementById("wordList");
const toastEl = document.getElementById("toast");

if (!gridEl) console.error("Missing #grid");
if (!wordListEl) console.error("Missing #wordList");

/* ========= RENDER GRID ========= */
let cellEls = [];
let foundWords = new Set();
let foundCells = new Set();

function renderGrid() {
  gridEl.innerHTML = "";
  gridEl.style.gridTemplateColumns = `repeat(${GRID_COLS}, var(--cell))`;
  cellEls = [];

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const div = document.createElement("div");
      div.className = "cell";
      div.textContent = grid[r][c];
      div.dataset.r = r;
      div.dataset.c = c;
      gridEl.appendChild(div);
      cellEls.push(div);
    }
  }
}

function renderWordList() {
  wordListEl.innerHTML = "";
  WORDS.forEach(word => {
    const item = document.createElement("div");
    item.className = "word" + (foundWords.has(word) ? " found" : "");
    item.textContent = word;
    wordListEl.appendChild(item);
  });
}

function applyFoundCells() {
  cellEls.forEach(el => {
    const key = el.dataset.r + "," + el.dataset.c;
    el.classList.toggle("prefound", foundCells.has(key));
  });
}

/* ========= DRAG SELECTION ========= */
let selecting = false;
let startCell = null;
let previewCells = [];

function cellFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  return el ? el.closest(".cell") : null;
}

function clearPreview() {
  previewCells.forEach(el => el && el.classList.remove("preview"));
  previewCells = [];
}

function lineCells(r1, c1, r2, c2) {
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);

  if (!(
    (dr === 0 && dc !== 0) ||
    (dc === 0 && dr !== 0) ||
    (Math.abs(r2 - r1) === Math.abs(c2 - c1))
  )) return [];

  const path = [];
  let r = r1, c = c1;
  path.push([r, c]);

  while (r !== r2 || c !== c2) {
    r += dr;
    c += dc;
    if (!inBounds(r, c)) return [];
    path.push([r, c]);
  }

  return path;
}

function previewTo(cell) {
  clearPreview();
  if (!startCell || !cell) return;

  const r1 = +startCell.dataset.r;
  const c1 = +startCell.dataset.c;
  const r2 = +cell.dataset.r;
  const c2 = +cell.dataset.c;

  const coords = lineCells(r1, c1, r2, c2);

  coords.forEach(([r, c]) => {
    const el = gridEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if (el && !el.classList.contains("prefound")) {
      el.classList.add("preview");
    }
    previewCells.push(el);
  });
}

function previewWord() {
  return previewCells.map(el => el?.textContent || "").join("");
}

function commitSelection() {
  const w = previewWord();
  const rev = w.split("").reverse().join("");

  const hit = WORDS.find(x => x === w || x === rev);
  if (!hit || foundWords.has(hit)) return;

  foundWords.add(hit);

  previewCells.forEach(el => {
    if (!el) return;
    foundCells.add(el.dataset.r + "," + el.dataset.c);
  });

  renderWordList();
  applyFoundCells();
  saveProgress();
}

/* Pointer + Touch */
gridEl.addEventListener("pointerdown", e => {
  const cell = e.target.closest(".cell");
  if (!cell) return;
  selecting = true;
  startCell = cell;
  previewTo(cell);
});
gridEl.addEventListener("pointermove", e => {
  if (!selecting) return;
  const cell = cellFromPoint(e.clientX, e.clientY);
  if (cell) previewTo(cell);
});
gridEl.addEventListener("pointerup", () => {
  if (!selecting) return;
  selecting = false;
  commitSelection();
  clearPreview();
  startCell = null;
});

/* ========= SAVE / RESTORE ========= */
function saveProgress() {
  const data = {
    foundWords: [...foundWords],
    foundCells: [...foundCells]
  };
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function restoreProgress() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;

  try {
    const d = JSON.parse(raw);
    (d.foundWords || []).forEach(w => foundWords.add(w));
    (d.foundCells || []).forEach(k => foundCells.add(k));
  } catch (e) {}
}

/* ========= TOAST ========= */
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 1500);
}

/* ========= CLEAR BUTTON ========= */
const clearBtn = document.getElementById("clearBtn");
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    localStorage.removeItem(LS_KEY);
    foundWords = new Set();
    foundCells = new Set();
    renderWordList();
    applyFoundCells();
    showToast("Cleared");
  });
}

/* ========= SCALE GRID ========= */
function scaleGridToFit() {
  const outer = document.querySelector(".gridOuter");
  const scaler = document.querySelector(".gridScale");
  if (!outer || !scaler) return;

  const outerWidth = outer.getBoundingClientRect().width;
  const gridWidth = GRID_COLS * 28 + (GRID_COLS - 1) * 2;

  const scale = Math.min(1, outerWidth / gridWidth);
  scaler.style.transform = `scale(${scale})`;
}

window.addEventListener("resize", () => setTimeout(scaleGridToFit, 80));
window.addEventListener("orientationchange", () => setTimeout(scaleGridToFit, 150));

/* ========= BOOT ========= */
generatePuzzle();
renderGrid();
restoreProgress();
renderWordList();
applyFoundCells();

setTimeout(scaleGridToFit, 60);
