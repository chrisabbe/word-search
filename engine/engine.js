/* WORD SEARCH ENGINE — TAP + DRAG — NO TRANSFORMS (MOBILE SAFE) */

/* ========= AUTO LS KEY ========= */
function determineWSKey() {
  const p = (location.pathname || "").toLowerCase();
  const d = p.match(/day\d{3}/);
  if (d) return "ws_" + d[0];
  const t = p.match(/trial-day\d{2}/);
  if (t) return "ws_" + t[0].replace("-", "_");
  return "ws_default";
}
const LS_KEY = determineWSKey();

/* ========= CONFIG ========= */
const { title, subtitle, gridRows, gridCols, seed: INITIAL_SEED, words: WORDS } = PUZZLE_CONFIG;

/* ========= HEADER ========= */
document.querySelector("header h1").textContent = title;
document.querySelector("header h2").textContent = subtitle;

/* ========= RNG ========= */
let seed = INITIAL_SEED;
function rand(){ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; }
function choice(a){ return a[Math.floor(rand()*a.length)]; }

const DIRS = [
  {dr:1,dc:0},{dr:-1,dc:0},{dr:0,dc:1},{dr:0,dc:-1},
  {dr:1,dc:1},{dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1}
];

let grid = Array.from({length:gridRows},()=>Array(gridCols).fill(""));

function inBounds(r,c){ return r>=0&&r<gridRows&&c>=0&&c<gridCols; }

/* ========= GENERATE ========= */
function canPlace(w,r,c,dr,dc){
  for(let i=0;i<w.length;i++){
    const rr=r+dr*i,cc=c+dc*i;
    if(!inBounds(rr,cc)|| (grid[rr][cc] && grid[rr][cc]!==w[i])) return false;
  }
  return true;
}

function placeWord(w){
  for(let i=0;i<2000;i++){
    const {dr,dc}=choice(DIRS);
    const r=Math.floor(rand()*gridRows);
    const c=Math.floor(rand()*gridCols);
    if(canPlace(w,r,c,dr,dc)){
      for(let j=0;j<w.length;j++) grid[r+dr*j][c+dc*j]=w[j];
      return;
    }
  }
}

function generatePuzzle(){
  [...WORDS].map(w=>w.toUpperCase()).sort((a,b)=>b.length-a.length).forEach(placeWord);
  const A="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for(let r=0;r<gridRows;r++) for(let c=0;c<gridCols;c++)
    if(!grid[r][c]) grid[r][c]=A[Math.floor(rand()*26)];
}

/* ========= RENDER ========= */
const gridEl=document.getElementById("grid");
gridEl.style.gridTemplateColumns=`repeat(${gridCols}, var(--cell))`;
gridEl.style.touchAction="pan-y manipulation";

let cellEls=[], foundWords=new Set(), foundCells=new Set();

function renderGrid(){
  gridEl.innerHTML="";
  cellEls=[];
  for(let r=0;r<gridRows;r++) for(let c=0;c<gridCols;c++){
    const d=document.createElement("div");
    d.className="cell";
    d.textContent=grid[r][c];
    d.dataset.r=r; d.dataset.c=c;
    gridEl.appendChild(d); cellEls.push(d);
  }
}

function renderWordList(){
  const box=document.getElementById("wordList");
  box.innerHTML="";
  WORDS.forEach(w=>{
    const d=document.createElement("div");
    d.className="word"+(foundWords.has(w.toUpperCase())?" found":"");
    d.textContent=w.toUpperCase();
    box.appendChild(d);
  });
}

function applyFound(){
  cellEls.forEach(el=>{
    el.classList.toggle("prefound",foundCells.has(el.dataset.r+","+el.dataset.c));
  });
}

/* ========= SELECTION ========= */
let startCell=null, previewCells=[], tapStart=null;

function clearPreview(){ previewCells.forEach(e=>e.classList.remove("preview")); previewCells=[]; }

function lineCells(r1,c1,r2,c2){
  const dr=Math.sign(r2-r1),dc=Math.sign(c2-c1);
  if(!(dr===0||dc===0||Math.abs(r2-r1)===Math.abs(c2-c1))) return [];
  const out=[]; let r=r1,c=c1;
  out.push([r,c]);
  while(r!==r2||c!==c2){ r+=dr;c+=dc; if(!inBounds(r,c)) return []; out.push([r,c]); }
  return out;
}

function previewTo(cell){
  clearPreview(); if(!startCell||!cell) return;
  lineCells(+startCell.dataset.r,+startCell.dataset.c,+cell.dataset.r,+cell.dataset.c)
    .forEach(([r,c])=>{
      const el=gridEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
      if(el&&!el.classList.contains("prefound")){ el.classList.add("preview"); previewCells.push(el); }
    });
}

function commit(){
  const w=previewCells.map(e=>e.textContent).join("");
  const hit=WORDS.map(x=>x.toUpperCase()).find(x=>x===w||x===w.split("").reverse().join(""));
  if(!hit||foundWords.has(hit)) return;
  foundWords.add(hit);
  previewCells.forEach(e=>foundCells.add(e.dataset.r+","+e.dataset.c));
  renderWordList(); applyFound(); save(); showToast(`Found: ${hit}`);
}

/* TAP */
gridEl.addEventListener("click",e=>{
  const c=e.target.closest(".cell"); if(!c) return;
  if(!tapStart){ tapStart=c; startCell=c; previewTo(c); }
  else{ startCell=tapStart; previewTo(c); commit(); clearPreview(); tapStart=null; startCell=null; }
});

/* DRAG */
gridEl.addEventListener("pointerdown",e=>{
  const c=e.target.closest(".cell"); if(!c) return;
  startCell=c; previewTo(c); gridEl.style.touchAction="none";
});
gridEl.addEventListener("pointermove",e=>{
  const c=document.elementFromPoint(e.clientX,e.clientY)?.closest(".cell");
  if(c) previewTo(c);
});
gridEl.addEventListener("pointerup",()=>{
  commit(); clearPreview(); startCell=null; gridEl.style.touchAction="pan-y manipulation";
});

/* ========= SAVE ========= */
function save(){ localStorage.setItem(LS_KEY,JSON.stringify({foundWords:[...foundWords],foundCells:[...foundCells]})); }
function restore(){
  const r=localStorage.getItem(LS_KEY); if(!r) return;
  try{ const d=JSON.parse(r); d.foundWords?.forEach(w=>foundWords.add(w)); d.foundCells?.forEach(c=>foundCells.add(c)); }catch{}
}

/* ========= TOAST ========= */
let toastTimer;
function showToast(m){
  const t=document.getElementById("toast");
  t.textContent=m; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove("show"),1800);
}

/* ========= CLEAR ========= */
document.getElementById("clearBtn").onclick=()=>{ localStorage.removeItem(LS_KEY); location.reload(); };

/* ========= BOOT ========= */
generatePuzzle();
renderGrid();
restore();
renderWordList();
applyFound();
