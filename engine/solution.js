/* MASTER WORD SEARCH SOLUTION ENGINE — STABLE BASELINE */

const { title, subtitle, gridRows, gridCols, seed, words: RAW_WORDS } = PUZZLE_CONFIG;

/* Header */
document.querySelector("header h1").textContent = title + " - Solution";
document.querySelector("header h2").textContent = subtitle;

/* Normalize words */
const GRID_ROWS = gridRows;
const GRID_COLS = gridCols;
const WORDS = (RAW_WORDS || []).map(w => (w || "").toString().toUpperCase());

/* ========= RNG ========= */
let _seed = seed || 195751;
function rand(){
  _seed = (_seed * 1103515245 + 12345) % 2147483648;
  return _seed / 2147483648;
}
function choice(arr){ return arr[Math.floor(rand()*arr.length)]; }

const DIRS=[
  {dr:1,dc:0},{dr:-1,dc:0},{dr:0,dc:1},{dr:0,dc:-1},
  {dr:1,dc:1},{dr:-1,dc:-1},{dr:-1,dc:1},{dr:1,dc:-1}
];

let grid = Array.from({length:GRID_ROWS},()=>Array(GRID_COLS).fill(""));

function inBounds(r,c){ return r>=0 && r<GRID_ROWS && c>=0 && c<GRID_COLS; }

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
      return true;
    }
  }
  return false;
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

/* Render */
const gridEl = document.getElementById("grid");
gridEl.style.gridTemplateColumns = `repeat(${GRID_COLS}, var(--cell))`;

let cellEls = [];

function renderGrid(){
  gridEl.innerHTML="";
  cellEls=[];
  for(let r=0;r<GRID_ROWS;r++){
    for(let c=0;c<GRID_COLS;c++){
      const d=document.createElement("div");
      d.className="cell";
      d.textContent=grid[r][c];
      d.dataset.r=r; d.dataset.c=c;
      gridEl.appendChild(d);
      cellEls.push(d);
    }
  }
}

/* Highlight */
function matchAt(word,r,c,dr,dc){
  for(let i=0;i<word.length;i++){
    const rr=r+dr*i, cc=c+dc*i;
    if(!inBounds(rr,cc)) return false;
    if(grid[rr][cc] !== word[i]) return false;
  }
  return true;
}

function highlightSolutions(){
  const found = new Set();
  WORDS.forEach(word=>{
    const rev = word.split("").reverse().join("");
    for(let r=0;r<GRID_ROWS;r++){
      for(let c=0;c<GRID_COLS;c++){
        DIRS.forEach(({dr,dc})=>{
          if(matchAt(word,r,c,dr,dc) || matchAt(rev,r,c,dr,dc)){
            for(let i=0;i<word.length;i++){
              found.add((r+dr*i)+","+(c+dc*i));
            }
          }
        });
      }
    }
  });
  cellEls.forEach(el=>{
    if(found.has(el.dataset.r+","+el.dataset.c)) el.classList.add("highlight");
  });
}

/* BOOT */
generatePuzzle();
renderGrid();
highlightSolutions();
