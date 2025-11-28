/* WORD SEARCH ENGINE – STABLE VERSION BASED ON ORIGINAL INLINE SCRIPT */

const {
  title,
  subtitle,
  gridRows,
  gridCols,
  seed: INITIAL_SEED,
  words: RAW_WORDS,
  storageKey: LS_KEY
} = PUZZLE_CONFIG;

/* Set header text */
document.querySelector("header h1").textContent = title;
document.querySelector("header h2").textContent = subtitle;

/* ========= CONFIG ========= */
const GRID_ROWS = gridRows;
const GRID_COLS = gridCols;
const WORDS = (RAW_WORDS || []).map(w => (w || "").toString().toUpperCase());

/* ========= RNG ========= */
let seed = INITIAL_SEED || 195751;
function rand(){
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function choice(arr){ return arr[Math.floor(rand()*arr.length)]; }

const DIRS = [
  {dr:1,dc:0},{dr:-1,dc:0},{dr:0,dc:1},{dr:0,dc:-1},
  {dr:1,dc:1},{dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1}
];

let grid = Array.from({length:GRID_ROWS},()=>Array(GRID_COLS).fill(""));

function inBounds(r,c){ return r>=0 && r<GRID_ROWS && c>=0 && c<GRID_COLS; }

function canPlace(word,r,c,dr,dc){
  for(let i=0;i<word.length;i++){
    const rr = r+dr*i, cc = c+dc*i;
    if(!inBounds(rr,cc)) return false;
    const ch = grid[rr][cc];
    if(ch!=="" && ch!==word[i]) return false;
  }
  return true;
}

function placeWord(word){
  for(let t=0;t<2000;t++){
    const {dr,dc} = choice(DIRS);
    const minR = dr<0 ? word.length-1 : 0;
    const maxR = dr>0 ? GRID_ROWS-word.length : GRID_ROWS-1;
    const minC = dc<0 ? word.length-1 : 0;
    const maxC = dc>0 ? GRID_COLS-word.length : GRID_COLS-1;

    const r = Math.floor(rand()*(maxR-minR+1))+minR;
    const c = Math.floor(rand()*(maxC-minC+1))+minC;
    if(canPlace(word,r,c,dr,dc)){
      for(let i=0;i<word.length;i++){
        grid[r+dr*i][c+dc*i] = word[i];
      }
      return;
    }
  }
}

function generatePuzzle(){
  [...WORDS].sort((a,b)=>b.length-a.length).forEach(w=>placeWord(w));
  const ABC="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for(let r=0;r<GRID_ROWS;r++){
    for(let c=0;c<GRID_COLS;c++){
      if(grid[r][c]===""){
        grid[r][c] = ABC[Math.floor(rand()*26)];
      }
    }
  }
}

/* ========= FULL-FIT SCALING ========= */
function scaleGridToFit(){
  const outer = document.querySelector(".gridOuter");
  const scaler = document.querySelector(".gridScale");
  const gridEl = document.getElementById("grid");
  if(!outer || !scaler || !gridEl) return;

  const outerRect = outer.getBoundingClientRect();
  const gridRect  = gridEl.getBoundingClientRect();

  const outerWidth = outerRect.width || window.innerWidth || 320;
  const gridWidth  = gridRect.width || (GRID_COLS * 28);

  let scale = outerWidth / gridWidth;
  if(scale > 1) scale = 1;
  if(scale <= 0 || !isFinite(scale)) scale = 1;

  scaler.style.transform = `scale(${scale})`;
}

/* ========= RENDER ========= */
const gridEl = document.getElementById("grid");
gridEl.style.gridTemplateColumns = `repeat(${GRID_COLS}, var(--cell))`;

let cellEls = [];
let foundWords = new Set();
let foundCells = new Set();

function renderGrid(){
  gridEl.innerHTML = "";
  cellEls = [];
  for(let r=0;r<GRID_ROWS;r++){
    for(let c=0;c<GRID_COLS;c++){
      const div = document.createElement("div");
      div.className = "cell";
      div.textContent = grid[r][c];
      div.dataset.r = r;
      div.dataset.c = c;
      // reduce text selection / copy issues
      div.style.userSelect = "none";
      div.style.webkitUserSelect = "none";
      div.style.webkitTouchCallout = "none";
      gridEl.appendChild(div);
      cellEls.push(div);
    }
  }
}

function renderWordList(){
  const box = document.getElementById("wordList");
  if(!box) return;
  box.innerHTML = "";
  WORDS.forEach(w=>{
    const div = document.createElement("div");
    div.className = "word" + (foundWords.has(w) ? " found" : "");
    div.textContent = w;
    box.appendChild(div);
  });
}

function applyFound(){
  cellEls.forEach(el=>{
    const key = el.dataset.r + "," + el.dataset.c;
    el.classList.toggle("prefound", foundCells.has(key));
  });
}

/* ========= SELECTION & DRAG ========= */
let selecting=false;
let startCell=null;
let previewCells=[];

function cellFromPoint(x,y){
  const el = document.elementFromPoint(x,y);
  if(!el) return null;
  return el.closest(".cell");
}

function clearPreview(){
  previewCells.forEach(el=>el && el.classList.remove("preview"));
  previewCells=[];
}

function lineCells(r1,c1,r2,c2){
  const dr=Math.sign(r2-r1), dc=Math.sign(c2-c1);
  if(!((dr===0 && dc!==0)||(dc===0 && dr!==0)||(Math.abs(r2-r1)===Math.abs(c2-c1)))) return [];
  const out=[];
  let r=r1, c=c1;
  out.push([r,c]);
  while(r!==r2 || c!==c2){
    r+=dr; c+=dc;
    if(!inBounds(r,c)) return [];
    out.push([r,c]);
  }
  return out;
}

function previewTo(cell){
  clearPreview();
  if(!startCell || !cell) return;
  const r1=+startCell.dataset.r, c1=+startCell.dataset.c;
  const r2=+cell.dataset.r, c2=+cell.dataset.c;
  const coords=lineCells(r1,c1,r2,c2);
  coords.forEach(([r,c])=>{
    const el=gridEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if(el && !el.classList.contains("prefound")){
      el.classList.add("preview");
    }
    previewCells.push(el);
  });
}

function previewWord(){
  return previewCells.map(el=>el?.textContent || "").join("");
}

function commitSelection(){
  const w = previewWord();
  if(!w) return;
  const rev = w.split("").reverse().join("");
  const hit = WORDS.find(x=>x===w || x===rev);
  if(!hit || foundWords.has(hit)) return;

  foundWords.add(hit);
  previewCells.forEach(el=>{
    if(!el) return;
    foundCells.add(el.dataset.r + "," + el.dataset.c);
  });

  renderWordList();
  applyFound();
  saveProgress();
  showToast(`Found: ${hit}`);
}

/* Pointer events */
gridEl.addEventListener("pointerdown", e=>{
  const cell = e.target.closest(".cell");
  if(!cell) return;
  selecting = true;
  startCell = cell;
  previewTo(cell);
});

gridEl.addEventListener("pointermove", e=>{
  if(!selecting) return;
  const cell = cellFromPoint(e.clientX, e.clientY);
  if(cell) previewTo(cell);
});

gridEl.addEventListener("pointerup", ()=>{
  if(!selecting) return;
  selecting = false;
  commitSelection();
  clearPreview();
  startCell = null;
});

/* Touch fallback */
gridEl.addEventListener("touchstart", e=>{
  e.preventDefault();
  const t=e.touches[0];
  const cell=cellFromPoint(t.clientX,t.clientY);
  if(!cell) return;
  selecting=true;
  startCell=cell;
  previewTo(cell);
},{passive:false});

gridEl.addEventListener("touchmove", e=>{
  e.preventDefault();
  if(!selecting) return;
  const t=e.touches[0];
  const cell=cellFromPoint(t.clientX,t.clientY);
  if(cell) previewTo(cell);
},{passive:false});

gridEl.addEventListener("touchend", e=>{
  e.preventDefault();
  if(!selecting) return;
  selecting=false;
  commitSelection();
  clearPreview();
  startCell=null;
},{passive:false});

/* ========= SAVE / RESTORE ========= */
function saveProgress(){
  if(!LS_KEY) return;
  const data = {
    foundWords:[...foundWords],
    foundCells:[...foundCells]
  };
  try{
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }catch(e){}
}

function restoreProgress(){
  if(!LS_KEY) return;
  const raw = localStorage.getItem(LS_KEY);
  if(!raw) return;
  try{
    const d=JSON.parse(raw);
    (d.foundWords||[]).forEach(w=>foundWords.add(w));
    (d.foundCells||[]).forEach(k=>foundCells.add(k));
  }catch(e){}
}

/* ========= TOAST ========= */
let toastTimer=null;
function showToast(msg){
  const t=document.getElementById("toast");
  if(!t) return;
  t.textContent=msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove("show"),1800);
}

/* ========= CLEAR BUTTON ========= */
const clearBtn = document.getElementById("clearBtn");
if(clearBtn){
  clearBtn.addEventListener("click", ()=>{
    if(LS_KEY) localStorage.removeItem(LS_KEY);
    foundWords.clear();
    foundCells.clear();
    grid = Array.from({length:GRID_ROWS},()=>Array(GRID_COLS).fill(""));
    seed = INITIAL_SEED || 195751;
    generatePuzzle();
    renderGrid();
    renderWordList();
    applyFound();
    setTimeout(scaleGridToFit, 50);
  });
}

/* ========= BOOT ========= */
generatePuzzle();
renderGrid();
restoreProgress();
renderWordList();
applyFound();

function scheduleScale(){
  setTimeout(scaleGridToFit, 50);
}
scheduleScale();

window.addEventListener("resize", ()=>scheduleScale());
window.addEventListener("orientationchange", ()=>scheduleScale());
