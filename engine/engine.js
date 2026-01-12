/* WORD SEARCH ENGINE — RESPONSIVE GRID (SEEDED + FIXED HIGHLIGHTING) */

/* ========= LS_KEY ========= */
function determineWSKey(){
  const path = location.pathname.toLowerCase();
  const d = path.match(/day\d{3}/);
  if (d) return "ws_" + d[0];
  const t = path.match(/trial-day\d{2}/);
  if (t) return "ws_" + t[0].replace("-", "_");
  return "ws_default";
}
const LS_KEY = determineWSKey();

/* ========= CONFIG ========= */
const {
  title,
  subtitle,
  gridRows,
  gridCols,
  seed: INITIAL_SEED,
  words: WORDS
} = window.PUZZLE_CONFIG || {};

const headerTitleEl = document.querySelector("header h1");
if (headerTitleEl && title) headerTitleEl.textContent = title;

const headerSubEl = document.querySelector("header h2");
if (headerSubEl && subtitle) headerSubEl.textContent = subtitle;

/* ========= RNG ========= */
let seed = Number.isFinite(INITIAL_SEED) ? INITIAL_SEED : 123456;
function rand(){
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function choice(a){ return a[Math.floor(rand()*a.length)]; }

const DIRS = [
  {dr:1,dc:0},{dr:-1,dc:0},{dr:0,dc:1},{dr:0,dc:-1},
  {dr:1,dc:1},{dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1}
];

const WORDS_UP = (WORDS || []).map(w => String(w).toUpperCase());
let grid = Array.from({length:gridRows || 0}, () => Array(gridCols || 0).fill(""));

function inBounds(r,c){ return r>=0 && r<gridRows && c>=0 && c<gridCols; }

function canPlace(w,r,c,dr,dc){
  for(let i=0;i<w.length;i++){
    const rr = r + dr*i, cc = c + dc*i;
    if(!inBounds(rr,cc)) return false;
    if(grid[rr][cc] && grid[rr][cc] !== w[i]) return false;
  }
  return true;
}

function placeWord(w){
  for(let t=0;t<2000;t++){
    const {dr,dc} = choice(DIRS);
    const r = Math.floor(rand()*gridRows);
    const c = Math.floor(rand()*gridCols);
    if(canPlace(w,r,c,dr,dc)){
      for(let i=0;i<w.length;i++) grid[r+dr*i][c+dc*i] = w[i];
      return;
    }
  }
}

function generatePuzzle(){
  [...WORDS_UP]
    .sort((a,b)=>b.length-a.length)
    .forEach(placeWord);

  // ✅ IMPORTANT: use SEEDED rand(), not Math.random()
  const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for(let r=0;r<gridRows;r++){
    for(let c=0;c<gridCols;c++){
      if(!grid[r][c]){
        grid[r][c] = ABC[Math.floor(rand()*26)];
      }
    }
  }
}

/* ========= RENDER ========= */
const gridEl = document.getElementById("grid");
if (gridEl){
  gridEl.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
}

let cellEls = [],
    foundWords = new Set(),
    foundCells = new Set();

function renderGrid(){
  if (!gridEl) return;

  gridEl.innerHTML = "";
  cellEls = [];

  for(let r=0; r<gridRows; r++){
    for(let c=0; c<gridCols; c++){
      const d = document.createElement("div");
      d.className = "cell";
      d.dataset.r = r;
      d.dataset.c = c;

      const letter = grid[r][c];
      d.dataset.letter = letter;   // ✅ ONLY source of letter (prevents double letters)

      gridEl.appendChild(d);
      cellEls.push(d);
    }
  }
}

function renderWordList(){
  const box = document.getElementById("wordList");
  if(!box) return;
  box.innerHTML = "";
  WORDS_UP.forEach(w=>{
    const d = document.createElement("div");
    d.className = "word" + (foundWords.has(w) ? " found" : "");
    d.textContent = w;
    box.appendChild(d);
  });
}

function applyFound(){
  cellEls.forEach(el=>{
    el.classList.toggle(
      "prefound",
      foundCells.has(el.dataset.r + "," + el.dataset.c)
    );
  });
}

/* ========= SELECTION ========= */
let startCell = null,
    previewCells = [],
    selecting = false,
    tapStart = null;

function clearPreview(){
  previewCells.forEach(el=>el.classList.remove("preview"));
  previewCells = [];
}

function lineCells(r1,c1,r2,c2){
  const dr = Math.sign(r2-r1), dc = Math.sign(c2-c1);
  const straight = (dr===0 && dc!==0) || (dc===0 && dr!==0);
  const diag = Math.abs(r2-r1) === Math.abs(c2-c1);
  if(!(straight || diag)) return [];
  const out = [[r1,c1]];
  while(r1!==r2 || c1!==c2){
    r1 += dr; c1 += dc;
    if(!inBounds(r1,c1)) return [];
    out.push([r1,c1]);
  }
  return out;
}

function previewTo(cell){
  clearPreview();
  if(!startCell || !cell) return;

  const r1 = +startCell.dataset.r, c1 = +startCell.dataset.c;
  const r2 = +cell.dataset.r,      c2 = +cell.dataset.c;

  lineCells(r1,c1,r2,c2).forEach(([r,c])=>{
    const el = gridEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if(el && !el.classList.contains("prefound")){
      el.classList.add("preview");
      previewCells.push(el);
    }
  });
}

function commit(){
  // ✅ FIX: letters are in dataset.letter (NOT textContent)
  const w = previewCells.map(e => e.dataset.letter || "").join("");
  if(!w) return;

  const rev = w.split("").reverse().join("");
  const hit = WORDS_UP.find(x => x === w || x === rev);
  if(!hit || foundWords.has(hit)) return;

  foundWords.add(hit);
  previewCells.forEach(e=>foundCells.add(e.dataset.r+","+e.dataset.c));

  renderWordList();
  applyFound();
  save();
  showToast(`Found: ${hit}`);
}

/* Tap */
if (gridEl){
  gridEl.addEventListener("click", e=>{
    const cell = e.target.closest(".cell");
    if(!cell) return;

    if(!tapStart){
      tapStart = cell;
      startCell = cell;
      previewTo(cell);
    } else {
      startCell = tapStart;
      previewTo(cell);
      commit();
      clearPreview();
      tapStart = null;
      startCell = null;
    }
  });

  /* Drag */
  gridEl.addEventListener("pointerdown", e=>{
    const cell = e.target.closest(".cell");
    if(!cell) return;
    selecting = true;
    startCell = cell;
    previewTo(cell);
  });

  gridEl.addEventListener("pointermove", e=>{
    if(!selecting) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest(".cell");
    if(el) previewTo(el);
  });

  gridEl.addEventListener("pointerup", ()=>{
    if(!selecting) return;
    selecting = false;
    commit();
    clearPreview();
    startCell = null;
  });
}

/* ========= SAVE ========= */
function save(){
  try{
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({foundWords:[...foundWords], foundCells:[...foundCells]})
    );
  }catch(e){}
}
function restore(){
  const raw = localStorage.getItem(LS_KEY);
  if(!raw) return;
  try{
    const d = JSON.parse(raw);
    (d.foundWords || []).forEach(w=>foundWords.add(w));
    (d.foundCells || []).forEach(c=>foundCells.add(c));
  }catch(e){}
}

/* ========= TOAST ========= */
let timer = null;
function showToast(m){
  const t = document.getElementById("toast");
  if(!t) return;
  t.textContent = m;
  t.classList.add("show");
  clearTimeout(timer);
  timer = setTimeout(()=>t.classList.remove("show"),1800);
}

/* ========= CLEAR ========= */
const clearBtn = document.getElementById("clearBtn");
if (clearBtn){
  clearBtn.onclick = ()=>{
    // ✅ Clear progress WITHOUT regenerating the grid
    localStorage.removeItem(LS_KEY);

    foundWords = new Set();
    foundCells = new Set();
    tapStart = null;
    startCell = null;
    selecting = false;
    clearPreview();

    renderWordList();
    applyFound();
  };
}

/* ========= BOOT ========= */
generatePuzzle();
renderGrid();
restore();
renderWordList();
applyFound();
