/* MASTER WORD SEARCH ENGINE */
const { title, subtitle, gridRows, gridCols, seed, words, storageKey } = PUZZLE_CONFIG;

document.querySelector("header h1").textContent = title;
document.querySelector("header h2").textContent = subtitle;

let _seed = seed;
function rand(){ _seed = (_seed * 1103515245 + 12345) % 2147483648; return _seed / 2147483648; }
function choice(arr){ return arr[Math.floor(rand()*arr.length)]; }

const DIRS=[{dr:1,dc:0},{dr:-1,dc:0},{dr:0,dc:1},{dr:0,dc:-1},{dr:1,dc:1},{dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1}];
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
    const {dr,dc}=choice(DIRS);
    const minR=dr<0?word.length-1:0, maxR=dr>0?gridRows-word.length:gridRows-1;
    const minC=dc<0?word.length-1:0, maxC=dc>0?gridCols-word.length:gridCols-1;
    const r=Math.floor(rand()*(maxR-minR+1))+minR;
    const c=Math.floor(rand()*(maxC-minC+1))+minC;
    if(canPlace(word,r,c,dr,dc)){
      for(let i=0;i<word.length;i++) grid[r+dr*i][c+dc*i]=word[i];
      return;
    }
  }
}
function generatePuzzle(){
  [...words].sort((a,b)=>b.length-a.length).forEach(w=>placeWord(w));
  const ABC="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for(let r=0;r<gridRows;r++)for(let c=0;c<gridCols;c++)
    if(!grid[r][c]) grid[r][c]=ABC[Math.floor(rand()*26)];
}

const gridEl=document.getElementById("grid");
gridEl.style.gridTemplateColumns=`repeat(${gridCols}, var(--cell))`;

let foundWords=new Set(), foundCells=new Set(), cellEls=[];
function renderGrid(){
  gridEl.innerHTML=""; cellEls=[];
  for(let r=0;r<gridRows;r++)for(let c=0;c<gridCols;c++){
    const d=document.createElement("div");
    d.className="cell"; d.textContent=grid[r][c]; d.dataset.r=r; d.dataset.c=c;
    gridEl.appendChild(d); cellEls.push(d);
  }
}
function renderWordList(){
  const box=document.getElementById("wordList"); box.innerHTML="";
  words.forEach(w=>{
    const d=document.createElement("div");
    d.className="word"+(foundWords.has(w)?" found":"");
    d.textContent=w; box.appendChild(d);
  });
}
function applyFound(){
  cellEls.forEach(el=>el.classList.toggle("prefound",foundCells.has(el.dataset.r+","+el.dataset.c)));
}

let selecting=false,startCell=null,previewCells=[];
function cellFromPoint(x,y){ return document.elementFromPoint(x,y)?.closest(".cell"); }
function clearPreview(){ previewCells.forEach(el=>el?.classList.remove("preview")); previewCells=[]; }
function lineCells(r1,c1,r2,c2){
  const dr=Math.sign(r2-r1), dc=Math.sign(c2-c1);
  if(!((dr===0 && dc!==0)||(dc===0 && dr!==0)||(Math.abs(r2-r1)===Math.abs(c2-c1)))) return [];
  const out=[]; let r=r1,c=c1; out.push([r,c]);
  while(r!==r2||c!==c2){ r+=dr; c+=dc; if(!inBounds(r,c)) return []; out.push([r,c]); }
  return out;
}
function previewTo(cell){
  clearPreview(); if(!startCell) return;
  const r1=+startCell.dataset.r,c1=+startCell.dataset.c;
  const r2=+cell.dataset.r,c2=+cell.dataset.c;
  lineCells(r1,c1,r2,c2).forEach(([r,c])=>{
    const el=gridEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if(el&&!el.classList.contains("prefound")) el.classList.add("preview");
    previewCells.push(el);
  });
}
function commitSelection(){
  const w=previewCells.map(el=>el?.textContent||"").join("");
  const rev=[...w].reverse().join("");
  const hit=words.find(x=>x===w||x===rev);
  if(!hit||foundWords.has(hit)) return;
  foundWords.add(hit);
  previewCells.forEach(el=>foundCells.add(el.dataset.r+","+el.dataset.c));
  saveProgress(); renderWordList(); applyFound(); toast(`Found: ${hit}`);
}

gridEl.onpointerdown=e=>{ const c=e.target.closest(".cell"); if(!c) return; selecting=true; startCell=c; previewTo(c); };
gridEl.onpointermove=e=>{ if(!selecting) return; const c=cellFromPoint(e.clientX,e.clientY); if(c) previewTo(c); };
gridEl.onpointerup=()=>{ selecting=false; commitSelection(); clearPreview(); startCell=null; };

function saveProgress(){ localStorage.setItem(storageKey,JSON.stringify({words:[...foundWords],cells:[...foundCells]})); }
function restoreProgress(){
  const d=JSON.parse(localStorage.getItem(storageKey)||"{}");
  (d.words||[]).forEach(w=>foundWords.add(w)); (d.cells||[]).forEach(c=>foundCells.add(c));
}
const toastEl=document.getElementById("toast");
function toast(msg){ toastEl.textContent=msg; toastEl.classList.add("show"); setTimeout(()=>toastEl.classList.remove("show"),1800); }

function scaleGrid(){
  const outer=document.querySelector(".gridOuter"),
        scale=document.querySelector(".gridScale");
  const gw=gridEl.getBoundingClientRect().width, ow=outer.getBoundingClientRect().width;
  let s=ow/gw; if(s>1) s=1; scale.style.transform=`scale(${s})`;
}

document.getElementById("clearBtn").onclick=()=>{ localStorage.removeItem(storageKey); location.reload(); };

generatePuzzle(); renderGrid(); restoreProgress(); renderWordList(); applyFound();
setTimeout(scaleGrid,50); window.onresize=()=>setTimeout(scaleGrid,50);
