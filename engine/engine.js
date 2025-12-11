/* ============================================================
   WORD SEARCH ENGINE — Auto-LS-Key Version
   Works for:
   /puzzles/day001/
   /puzzles/day002/
   /trial/trial-day01/
   /trial/trial-day02/
   ============================================================ */

/* ========= AUTO-DETECT UNIQUE LS KEY ========= */
function determineLSKey() {
  const path = window.location.pathname.toLowerCase();

  // Paid puzzle: /puzzles/day001/
  const dayMatch = path.match(/day\d{3}/);
  if (dayMatch) {
    return "ws_" + dayMatch[0]; // e.g., ws_day001
  }

  // Trial puzzle: /trial/trial-day01/
  const trialMatch = path.match(/trial-day\d{2}/);
  if (trialMatch) {
    return "ws_" + trialMatch[0].replace("-", "_"); // e.g., ws_trial_day01
  }

  // Fallback (should never hit)
  return "ws_default_fallback";
}

const LS_KEY = determineLSKey();
const CLEAR_COOKIE = LS_KEY + "_clear";

/* ========= GRID + WORD LIST CONFIG ========= */
/* These must be injected by each puzzle's index.html */
if (typeof GRID_ROWS === "undefined") console.error("GRID_ROWS missing");
if (typeof GRID_COLS === "undefined") console.error("GRID_COLS missing");
if (typeof WORDS === "undefined") console.error("WORDS missing");

/* ========= RNG ========= */
let seed = typeof SEED !== "undefined" ? SEED : 123456;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function choice(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

const DIRS = [
  { dr: 1, dc: 0 }, { dr: -1, dc: 0 }, { dr: 0, dc: 1 }, { dr: 0, dc: -1 },
  { dr: 1, dc: 1 }, { dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }
];

let grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(""));

function inBounds(r, c) {
  return r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS;
}

function canPlace(word, r, c, dr, dc) {
  for (let i = 0; i < word.length; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
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
      return true;
    }
  }
  console.warn("Could not place word:", word);
  return false;
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

/* ========= RENDER ========= */
const gridEl = document.getElementById("grid");
gridEl.style.gridTemplateColumns = `repeat(${GRID_COLS}, var(--cell))`;

let cellEls = [];
let foundWords = new Set();
let foundCells = new Set();

function renderGrid() {
  gridEl.innerHTML = "";
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
  const box = document.getElementById("wordList");
  box.innerHTML = "";

  WORDS.forEach(w => {
    const div = document.createElement("div");
    div.className = "word" + (foundWords.has(w) ? " found" : "");
    div.textContent = w;
    box.appendChild(div);
  });
}

function applyFound() {
  cellEls.forEach(el => {
    const key = el.dataset.r + "," + el.dataset.c;
    el.classList.toggle("prefound", foundCells.has(key));
  });
}

/* ========= DRAG SELECTION ========= */
let selecting = false;
let startCell = null;
let previewCells = [];

gridEl.addEventListener("pointerdown", e => {
  const cell = e.target.closest(".cell");
  if (!cell) return;
  selecting = true;
  startCell = cell;
  previewTo(cell);
});

gridEl.addEventListener("pointermove", e => {
  if (!selecting) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const cell = el ? el.closest(".cell") : null;
  if (cell) previewTo(cell);
});

gridEl.addEventListener("pointerup", () => {
  if (!selecting) return;
  selecting = false;
  commitSelection();
  clearPreview();
  startCell = null;
});

/* ========= PREVIEW + WORD MATCH ========= */
function clearPreview() {
  previewCells.forEach(el => el && el.classList.remove("preview"));
  previewCells = [];
}

function lineCells(r1, c1, r2, c2) {
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);

  if (!((dr === 0 && dc !== 0) ||
        (dc === 0 && dr !== 0) ||
        (Math.abs(r2 - r1) === Math.abs(c2 - c1)))) return [];

  const out = [];
  let r = r1, c = c1;
  out.push([r, c]);

  while (r !== r2 || c !== c2) {
    r += dr;
    c += dc;
    if (!inBounds(r, c)) return [];
    out.push([r, c]);
  }
  return out;
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
  applyFound();
  saveProgress();
}

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

/* ========= SCALE GRID ========= */
function scaleGridToFit() {
  const outer = document.querySelector(".gridOuter");
  const scaler = document.querySelector(".gridScale");
  const rectOuter = outer.getBoundingClientRect();

  const gridWidth = GRID_COLS * 28 + (GRID_COLS - 1) * 2;
  const scale = Math.min(1, rectOuter.width / gridWidth);

  scaler.style.transform = `scale(${scale})`;
}

window.addEventListener("resize", () => setTimeout(scaleGridToFit, 80));
window.addEventListener("orientationchange", () => setTimeout(scaleGridToFit, 120));

/* ========= BOOT ========= */
generatePuzzle();
renderGrid();
restoreProgress();
renderWordList();
applyFound();

setTimeout(scaleGridToFit, 60);
