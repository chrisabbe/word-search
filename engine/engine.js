/* WORD SEARCH ENGINE — STABLE BASELINE WITH TAP + DRAG SUPPORT (FIXED MOBILE SCALING) */

/* ========= AUTO-DETECT LS_KEY PER PUZZLE ========= */
function determineWSKey() {
  const path = (window.location.pathname || "").toLowerCase();

  const dayMatch = path.match(/day\d{3}/);
  if (dayMatch) return "ws_" + dayMatch[0];

  const trialMatch = path.match(/trial-day\d{2}/);
  if (trialMatch) return "ws_" + trialMatch[0].replace("-", "_");

  return "ws_default";
}
const LS_KEY = determineWSKey();

/* ========= IMPORT CONFIG ========= */
const {
  title,
  subtitle,
  gridRows,
  gridCols,
  seed: INITIAL_SEED,
  words: WORDS
} = PUZZLE_CONFIG;

/* ========= HEADER ========= */
document.querySelector("header h1").textContent = title;
document.querySelector("header h2").textContent = subtitle;

/* ========= RNG ========= */
let seed = INITIAL_SEED;
function rand(){
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function choice(arr){ return arr[Math.floor(rand()*arr.length)]; }

const DIRS = [
  {dr:1,dc:0},{dr:-1,dc:0},{dr:0,dc:1},{dr:0,dc:-1},
  {dr:1,dc:1},{dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1}
];

let grid = Array.from({length:gridRows},()=>Array(gridCols).fill(""));

function inBounds(r,c){ return r>=0 && r<gridRows && c>=0 && c<gridCols; }

/* ========= PUZZLE GENERATION ========= */
function canPlace(word,r,c,dr,dc){
  for(let i=0;i<word.length;i++){
    const rr=r+dr*i, cc=c+dc*i;
    if(!inBounds(rr,cc)) return false;
    if(grid[rr][cc]!=="" && grid[rr][cc]!==word[i]) return false;
  }
  return true;
}

function placeWord(word){
  for(let t=0;t<2000;t++){
    const {dr,dc}=choice(DIRS);
    const minR = dr<0 ? word.length-1 : 0;
    const maxR = dr>0 ? gridRows-word.length : gridRows-1;
    const minC = dc<0 ? word.length-1 : 0;
    const maxC = dc>0 ? gridCols-word.length : gridCols-1;

    const r=Math.floor(rand()*(maxR-minR+1))+minR;
    const c=Math.floor(rand()*(maxC-minC+1))+minC;

    if(canPlace(word,r,c,dr,dc)){
      for(let i=0;i<word.length;i++){
        grid[r+dr*i][c+dc*i]=word[i];
      }
      return;
    }
  }
}

function generatePuzzle(){
  [...WORDS].map(w=>w.toUpperCase())
    .sort((a,b)=>b.length-a.length)
    .forEach(placeWord);

  const ABC="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for(let r=0;r<gridRows;r++){
    for(let c=0;c<gridCols;c++){
      if(grid[r][c]===""){
        grid[r][c]=ABC[Math.floor(rand()*26)];
      }
    }
  }
}

/* ========= RENDER ========= */
const gridEl=document.getElementById("grid");
gridEl.style.gridTemplateColumns=`repeat(${gridCols}, var(--cell))`;

let cellEls=[];
let foundWords=new Set();
let foundCells=new Set();

function renderGrid(){
  gridEl.innerHTML="";
  cellEls=[];
  for(let r=0;r<gridRows;r++){
    for(let c=0;c<gridCols;c++){
      const d=document.createElement("div");
      d.className="cell";
      d.textContent=grid[r][c];
      d.dataset.r=r;
      d.dataset.c=c;
      gridEl.appendChild(d);
      cellEls.push(d);
    }
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
    const k=el.dataset.r+","+el.dataset.c;
    el.classList.toggle("prefound",foundCells.has(k));
  });
}

/* ========= SELECTION LOGIC ========= */
let selecting=false;
let startCell=null;
let previewCells=[];

/* TAP MODE SUPPORT */
let tapStartCell=null;

function clearPreview(){
  previewCells.forEach(el=>el && el.classList.remove("preview"));
  previewCells=[];
}

function lineCells(r1,c1,r2,c2){
  const dr=Math.sign(r2-r1), dc=Math.sign(c2-c1);
  if(!((dr===0&&dc!==0)||(dc===0&&dr!==0)||(Math.abs(r2-r1)===Math.abs(c2-c1)))) return [];
  const out=[];
  let r=r1,c=c1;
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
  const r1=+startCell.dataset.r,c1=+startCell.dataset.c;
  const r2=+cell.dataset.r,c2=+cell.dataset.c;
  lineCells(r1,c1,r2,c2).forEach(([r,c])=>{
    const el=gridEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if(el&&!el.classList.contains("prefound")){
      el.classList.add("preview");
      previewCells.push(el);
    }
  });
}

function previewWord(){
  return previewCells.map(el=>el?.textContent||"").join("");
}

function commitSelection(){
  const w=previewWord();
  if(!w) return;
  const rev=w.split("").reverse().join("");
  const hit=WORDS.map(x=>x.toUpperCase()).find(x=>x===w||x===rev);
  if(!hit||foundWords.has(hit)) return;

  foundWords.add(hit);
  previewCells.forEach(el=>{
    foundCells.add(el.dataset.r+","+el.dataset.c);
  });

  renderWordList();
  applyFound();
  saveProgress();
  showToast(`Found: ${hit}`);
}

/* TAP */
gridEl.addEventListener("click",e=>{
  const cell=e.target.closest(".cell");
  if(!cell) return;

  if(!tapStartCell){
    tapStartCell=cell;
    startCell=cell;
    previewTo(cell);
  } else {
    startCell=tapStartCell;
    previewTo(cell);
    commitSelection();
    clearPreview();
    tapStartCell=null;
    startCell=null;
  }
});

/* DRAG */
gridEl.addEventListener("pointerdown",e=>{
  const cell=e.target.closest(".cell");
  if(!cell) return;
  selecting=true;
  startCell=cell;
  previewTo(cell);
});
gridEl.addEventListener("pointermove",e=>{
  if(!selecting) return;
  const el=document.elementFromPoint(e.clientX,e.clientY)?.closest(".cell");
  if(el) previewTo(el);
});
gridEl.addEventListener("pointerup",()=>{
  if(!selecting) return;
  selecting=false;
  commitSelection();
  clearPreview();
  startCell=null;
});

/* ========= SAVE / RESTORE ========= */
function saveProgress(){
  localStorage.setItem(LS_KEY,JSON.stringify({
    foundWords:[...foundWords],
    foundCells:[...foundCells]
  }));
}
function restoreProgress(){
  const raw=localStorage.getItem(LS_KEY);
  if(!raw) return;
  try{
    const d=JSON.parse(raw);
    (d.foundWords||[]).forEach(w=>foundWords.add(w));
    (d.foundCells||[]).forEach(c=>foundCells.add(c));
  }catch(e){}
}

/* ========= TOAST ========= */
let toastTimer=null;
function showToast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove("show"),1800);
}

/* ========= CLEAR ========= */
document.getElementById("clearBtn").onclick=()=>{
  localStorage.removeItem(LS_KEY);
  location.reload();
};

/* ========= RESPONSIVE CELL SCALING (FIX) ========= */
function resizeCellsToFit(){
  const outer=document.querySelector(".gridOuter");
  if(!outer) return;

  const maxWidth=outer.clientWidth||window.innerWidth||320;
  const gap=2; // must match CSS
  const padding=4;

  const size=Math.floor(
    (maxWidth-(gridCols-1)*gap-padding)/gridCols
  );

  const finalSize=Math.max(18,Math.min(size,34));
  document.documentElement.style.setProperty("--cell",finalSize+"px");
}

/* ========= BOOT ========= */
generatePuzzle();
renderGrid();
restoreProgress();
renderWordList();
applyFound();

resizeCellsToFit();
window.addEventListener("resize",resizeCellsToFit);
window.addEventListener("orientationchange",resizeCellsToFit);
