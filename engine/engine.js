/* WORD SEARCH ENGINE – FINAL MOBILE VERSION */

const { title, subtitle, gridRows, gridCols, seed: INITIAL_SEED, words: RAW_WORDS, storageKey: LS_KEY } = PUZZLE_CONFIG;

/* Header */
document.querySelector("header h1").textContent = title;
document.querySelector("header h2").textContent = subtitle;

/* CONFIG */
const GRID_ROWS = gridRows;
const GRID_COLS = gridCols;
const WORDS = (RAW_WORDS || []).map(w => w.toUpperCase());

/* DOM */
const gridEl = document.getElementById("grid");
const toastEl = document.getElementById("toast");
const clearBtn = document.getElementById("clearBtn");

/* LOCK TEXT SELECTION */
gridEl.style.userSelect = "none";
gridEl.style.webkitUserSelect = "none";
gridEl.style.webkitTouchCallout = "none";

/* RNG */
let seed = INITIAL_SEED;
function rand(){ seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
function choice(a){ return a[Math.floor(rand()*a.length)]; }

const DIRS=[
  {dr:1,dc:0},{dr:-1,dc:0},{dr:0,dc:1},{dr:0,dc:-1},
  {dr:1,dc:1},{dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1}
];

let grid = Array.from({length:GRID_ROWS},()=>Array(GRID_COLS).fill(""));

function inBounds(r,c){ return r>=0 && r<GRID_ROWS && c>=0 && c<GRID_COLS; }

/* GENERATION */
function canPlace(word,r,c,dr,dc){
  for(let i=0;i<word.length;i++){
    const rr=r+dr*i, cc=c+dc*i;
    if(!inBounds(rr,cc) || (grid[rr][cc] && grid[rr][cc]!==word[i])) return false;
  }
  return true;
}
function placeWord(word){
  for(let t=0;t<2000;t++){
    const {dr,dc} = choice(DIRS);
    const r=Math.floor(rand()*GRID_ROWS), c=Math.floor(rand()*GRID_COLS);
    if(canPlace(word,r,c,dr,dc)){
      for(let i=0;i<word.length;i++) grid[r+dr*i][c+dc*i]=word[i];
      return true;
    }
  }
}
function generatePuzzle(){
  [...WORDS].sort((a,b)=>b.length-a.length).forEach(w=>placeWord(w));
  const ABC="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for(let r=0;r<GRID_ROWS;r++)for(let c=0;c<GRID_COLS;c++)
    grid[r][c] = grid[r][c] || ABC[Math.floor(rand()*26)];
}

/* RENDER */
gridEl.style.gridTemplateColumns = `repeat(${GRID_COLS}, var(--cell))`;

let cellEls = [];
let foundWords = new Set(), foundCells = new Set();

function renderGrid(){
  gridEl.innerHTML=""; cellEls=[];
  for(let r=0;r<GRID_ROWS;r++)for(let c=0;c<GRID_COLS;c++){
    const d=document.createElement("div");
    d.className="cell"; d.textContent=grid[r][c];
    d.dataset.r=r; d.dataset.c=c;
    d.style.userSelect="none"; d.style.webkitUserSelect="none";
    gridEl.appendChild(d); cellEls.push(d);
  }
}

function renderWordList(){
  const box=document.getElementById("wordList");
  box.innerHTML="";
  WORDS.forEach(w=>{
    const d=document.createElement("div");
    d.className="word"+(foundWords.has(w)?" found":"");
    d.textContent=w;
    box.appendChild(d);
  });
}

function applyFound(){
  cellEls.forEach(el=>{
    el.classList.toggle("prefound",foundCells.has(el.dataset.r+","+el.dataset.c));
  });
}

/* SELECTION */
let selecting=false,startCell=null,previewCells=[];

function cellFromPoint(x,y){
  return document.elementFromPoint(x,y)?.closest(".cell");
}

function clearPreview(){
  previewCells.forEach(el=>el?.classList.remove("preview"));
  previewCells=[];
}

function lineCells(r1,c1,r2,c2){
  const dr=Math.sign(r2-r1), dc=Math.sign(c2-c1);
  if(!((dr===0&&dc!==0)||(dc===0&&dr!==0)||(Math.abs(r2-r1)===Math.abs(c2-c1)))) return [];
  const out=[]; let r=r1,c=c1;
  out.push([r,c]);
  while(r!==r2||c!==c2){
    r+=dr;c+=dc;
    if(!inBounds(r,c)) return [];
    out.push([r,c]);
  }
  return out;
}

function previewTo(cell){
  clearPreview();
  if(!startCell||!cell) return;
  const a=+startCell.dataset.r,b=+startCell.dataset.c;
  const c=+cell.dataset.r,d=+cell.dataset.c;
  lineCells(a,b,c,d).forEach(([r,c])=>{
    const el=gridEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if(el&&!el.classList.contains("prefound")) el.classList.add("preview");
    previewCells.push(el);
  });
}

function commitSelection(){
  const word=previewCells.map(el=>el?.textContent||"").join("");
  if(!word) return;
  const rev=[...word].reverse().join("");
  const hit=WORDS.find(w=>w===word||w===rev);
  if(!hit||foundWords.has(hit)) return;
  foundWords.add(hit);
  previewCells.forEach(el=>foundCells.add(el.dataset.r+","+el.dataset.c));
  renderWordList(); applyFound(); saveProgress(); toast(`Found: ${hit}`);
}

/* EVENTS */
gridEl.addEventListener("pointerdown",e=>{
  const cell=e.target.closest(".cell"); if(!cell) return;
  selecting=true; startCell=cell; previewTo(cell);
});
gridEl.addEventListener("pointermove",e=>{
  if(!selecting) return;
  const cell=cellFromPoint(e.clientX,e.clientY);
  if(cell) previewTo(cell);
});
gridEl.addEventListener("pointerup",()=>{ selecting=false; commitSelection(); clearPreview(); startCell=null; });

gridEl.ontouchstart = e=>{
  e.preventDefault();
  const t=e.touches[0]; const cell=cellFromPoint(t.clientX,t.clientY);
  if(!cell) return; selecting=true; startCell=cell; previewTo(cell);
};
gridEl.ontouchmove = e=>{
  e.preventDefault();
  if(!selecting) return;
  const t=e.touches[0]; const cell=cellFromPoint(t.clientX,t.clientY);
  if(cell) previewTo(cell);
};
gridEl.ontouchend = ()=>{ if(!selecting) return; selecting=false; commitSelection(); clearPreview(); startCell=null; };

/* STORAGE */
function saveProgress(){
  localStorage.setItem(LS_KEY,JSON.stringify({words:[...foundWords],cells:[...foundCells]}));
}
function restoreProgress(){
  const raw=localStorage.getItem(LS_KEY);
  if(!raw) return;
  const d=JSON.parse(raw);
  (d.words||[]).forEach(w=>foundWords.add(w));
  (d.cells||[]).forEach(c=>foundCells.add(c));
}

/* TOAST */
let tmr;
function toast(msg){
  toastEl.textContent=msg;
  toastEl.classList.add("show");
  clearTimeout(tmr);
  tmr=setTimeout(()=>toastEl.classList.remove("show"),1600);
}

/* CLEAR BUTTON — FIXED */
clearBtn.onclick = e=>{
  e.preventDefault();
  e.stopPropagation();
  localStorage.removeItem(LS_KEY);
  foundWords.clear(); foundCells.clear();
  grid = Array.from({length:GRID_ROWS},()=>Array(GRID_COLS).fill(""));
  seed = INITIAL_SEED;
  generatePuzzle();
  renderGrid();
  renderWordList();
  applyFound();
  scheduleScale();
};

/* SCALING */
function scaleGridToFit(){
  const outer=document.querySelector(".gridOuter");
  const scale=document.querySelector(".gridScale");
  const gw=gridEl.getBoundingClientRect().width;
  const ow=outer.getBoundingClientRect().width;
  let s = ow / gw;

  // make grid easier in portrait by scaling UP
  if(window.innerHeight > window.innerWidth) s *= 1.1;

  if(s>1.3) s=1.3;
  if(s<0.6) s=0.6;

  scale.style.transform = `scale(${s})`;
}

/* FORCE RESIZE FIX */
function scheduleScale(){
  setTimeout(scaleGridToFit,50);
  setTimeout(scaleGridToFit,150);
  setTimeout(scaleGridToFit,300);
}
window.addEventListener("resize",scheduleScale);
window.addEventListener("orientationchange",scheduleScale);

/* BOOT */
generatePuzzle();
renderGrid();
restoreProgress();
renderWordList();
applyFound();
scheduleScale();
