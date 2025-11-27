/* MASTER WORD SEARCH ENGINE — MOBILE-STABLE VERSION */

const { title, subtitle, gridRows, gridCols, seed, words, storageKey } = PUZZLE_CONFIG;

/* Header */
document.querySelector("header h1").textContent = title;
document.querySelector("header h2").textContent = subtitle;

/* Prevent page scroll during drag */
document.body.addEventListener("touchmove", e => e.preventDefault(), { passive:false });

/* DOM refs */
const gridEl = document.getElementById("grid");
const toastEl = document.getElementById("toast");

/* Disable selection + callouts */
gridEl.style.userSelect = "none";
gridEl.style.webkitUserSelect = "none";
gridEl.style.webkitTouchCallout = "none";
gridEl.style.msUserSelect = "none";

/* RNG */
let _seed = seed;
function rand(){ _seed = (_seed * 1103515245 + 12345) % 2147483648; return _seed / 2147483648; }
function choice(arr){ return arr[Math.floor(rand()*arr.length)]; }

const DIRS=[
  {dr:1,dc:0},{dr:-1,dc:0},{dr:0,dc:1},{dr:0,dc:-1},
  {dr:1,dc:1},{dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1}
];

let grid = Array.from({length:gridRows},()=>Array(gridCols).fill(""));

function inBounds(r,c){ return r>=0 && r<gridRows && c>=0 && c<gridCols; }

function canPlace(word,r,c,dr,dc){
  for(let i=0;i<word.length;i++){
    const rr=r+dr*i, cc=c+dc*i;
    if(!inBounds(rr,cc)) return false;
    if(grid[rr][cc] && grid[rr][cc]!==word[i]) return false;
  }
  return true;
}

function placeWord(word){
  for(let t=0;t<2000;t++){
    const {dr,dc} = choice(DIRS);
    const minR = dr<0 ? word.length-1 : 0;
    const maxR = dr>0 ? gridRows-word.length : gridRows-1;
    const minC = dc<0 ? word.length-1 : 0;
    const maxC = dc>0 ? gridCols-word.length : gridCols-1;

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
  [...words].sort((a,b)=>b.length-a.length).forEach(w=>placeWord(w));
  const ABC="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for(let r=0;r<gridRows;r++){
    for(let c=0;c<gridCols;c++){
      if(!grid[r][c]){
        grid[r][c] = ABC[Math.floor(rand()*26)];
      }
    }
  }
}

/* Render */
gridEl.style.gridTemplateColumns = `repeat(${gridCols}, var(--cell))`;

let foundWords=new Set(), foundCells=new Set(), cellEls=[];

function renderGrid(){
  gridEl.innerHTML = "";
  cellEls=[];
  for(let r=0;r<gridRows;r++){
    for(let c=0;c<gridCols;c++){
      const d=document.createElement("div");
      d.className="cell";
      d.textContent=grid[r][c];
      d.dataset.r=r; d.dataset.c=c;
      gridEl.appendChild(d);
      cellEls.push(d);
    }
  }
}

function renderWordList(){
  const box=document.getElementById("wordList");
  box.innerHTML="";
  words.forEach(w=>{
    const d=document.createElement("div");
    d.className="word"+(foundWords.has(w)?" found":"");
    d.textContent=w;
    box.appendChild(d);
  });
}

function applyFound(){
  cellEls.forEach(el=>{
    el.classList.toggle("prefound", foundCells.has(el.dataset.r+","+el.dataset.c));
  });
}

/* Drag Selection */
let selecting=false, startCell=null, previewCells=[];

function cellFromPoint(x,y){
  const el=document.elementFromPoint(x,y);
  return el?.closest(".cell");
}

function clearPreview(){
  previewCells.forEach(el=>el?.classList.remove("preview"));
  previewCells=[];
}

function lineCells(r1,c1,r2,c2){
  const dr=Math.sign(r2-r1), dc=Math.sign(c2-c1);
  if(!((dr===0 && dc!==0)||(dc===0 && dr!==0)||(Math.abs(r2-r1)===Math.abs(c2-c1)))) return [];
  const out=[]; let r=r1,c=c1;
  out.push([r,c]);
  while(r!==r2||c!==c2){
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

function commitSelection(){
  const w = previewCells.map(el=>el?.textContent || "").join("");
  if(!w) return;
  const rev = w.split("").reverse().join("");
  const hit = words.find(x=>x===w || x===rev);
  if(!hit || foundWords.has(hit)) return;

  foundWords.add(hit);
  previewCells.forEach(el=>{
    if(el) foundCells.add(el.dataset.r + "," + el.dataset.c);
  });

  saveProgress();
  renderWordList();
  applyFound();
  showToast(`Found: ${hit}`);
}

/* Pointer Events */
gridEl.addEventListener("pointerdown", e=>{
  e.preventDefault();
  const cell = e.target.closest(".cell");
  if(!cell) return;
  selecting=true;
  startCell=cell;
  gridEl.setPointerCapture(e.pointerId);
  previewTo(cell);
});

gridEl.addEventListener("pointermove", e=>{
  if(!selecting) return;
  e.preventDefault();
  const cell = cellFromPoint(e.clientX, e.clientY);
  if(cell) previewTo(cell);
});

gridEl.addEventListener("pointerup", e=>{
  selecting=false;
  gridEl.releasePointerCapture(e.pointerId);
  commitSelection();
  clearPreview();
  startCell=null;
});

/* Save / Restore */
function saveProgress(){
  localStorage.setItem(storageKey, JSON.stringify({
    foundWords:[...foundWords],
    foundCells:[...foundCells]
  }));
}

function restoreProgress(){
  const raw = localStorage.getItem(storageKey);
  if(!raw) return;
  try{
    const d=JSON.parse(raw);
    (d.foundWords||[]).forEach(w=>foundWords.add(w));
    (d.foundCells||[]).forEach(k=>foundCells.add(k));
  }catch(e){}
}

/* Toast */
let toastTimer=null;
function showToast(msg){
  toastEl.textContent=msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toastEl.classList.remove("show"),1800);
}

/* Clear Button */
document.getElementById("clearBtn").addEventListener("click", ()=>{
  localStorage.removeItem(storageKey);
  location.href = location.href;
});

/* Scale Grid */
function scaleGrid(){
  const outer=document.querySelector(".gridOuter");
  const scale=document.querySelector(".gridScale");
  const gw=gridEl.getBoundingClientRect().width;
  const ow=outer.getBoundingClientRect().width;
  let s=ow/gw; if(s>1)s=1;
  scale.style.transform=`scale(${s})`;
}

/* Boot */
generatePuzzle();
renderGrid();
restoreProgress();
renderWordList();
applyFound();
setTimeout(scaleGrid,60);
window.addEventListener("resize", ()=>setTimeout(scaleGrid,50));
window.addEventListener("orientationchange", ()=>setTimeout(scaleGrid,70));
