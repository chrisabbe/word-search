/* MASTER WORD SEARCH SOLUTION ENGINE – FIT-TO-WIDTH VERSION */

const { title, subtitle, gridRows, gridCols, seed, words: RAW_WORDS } = PUZZLE_CONFIG;

/* Header */
document.querySelector("header h1").textContent = title + " - Solution";
document.querySelector("header h2").textContent = subtitle;

/* Normalize words to UPPERCASE like the puzzle engine */
const GRID_ROWS = gridRows;
const GRID_COLS = gridCols;
const WORDS = (RAW_WORDS || []).map(w => (w || "").toString().toUpperCase());

/* ========= RNG (must match puzzle page exactly) ========= */
let _seed = seed || 195751;
function rand(){
  _seed = (_seed * 1103515245 + 12345) % 2147483648;
  return _seed / 2147483648;
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
    const rr=r+dr*i, cc=c+dc*i;
    if(!inBounds(rr,cc)) return false;
    const ch=grid[rr][cc];
    if(ch!=="" && ch!==word[i]) return false;
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

/* ========= RENDER GRID ========= */
const gridEl = document.getElementById("grid");
gridEl.style.gridTemplateColumns = `repeat(${GRID_COLS}, var(--cell))`;
let cellEls = [];

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
      gridEl.appendChild(div);
      cellEls.push(div);
    }
  }
}

/* ========= FIND & HIGHLIGHT ALL WORDS ========= */
function matchWordAt(word,r,c,dr,dc){
  for(let i=0;i<word.length;i++){
    const rr=r+dr*i, cc=c+dc*i;
    if(!inBounds(rr,cc)) return false;
    if(grid[rr][cc] !== word[i]) return false;
  }
  return true;
}

function highlightSolutions(){
  const positions = new Set(); // "r,c" keys to highlight

  WORDS.forEach(word=>{
    const target = word;
    const rev = word.split("").reverse().join("");

    for(let r=0;r<GRID_ROWS;r++){
      for(let c=0;c<GRID_COLS;c++){
        for(const {dr,dc} of DIRS){
          // forward
          if(matchWordAt(target,r,c,dr,dc)){
            for(let i=0;i<target.length;i++){
              const rr=r+dr*i, cc=c+dc*i;
              positions.add(rr+","+cc);
            }
          }
          // reverse
          if(matchWordAt(rev,r,c,dr,dc)){
            for(let i=0;i<rev.length;i++){
              const rr=r+dr*i, cc=c+dc*i;
              positions.add(rr+","+cc);
            }
          }
        }
      }
    }
  });

  // Apply highlight class to all matching cells
  cellEls.forEach(el=>{
    const key = el.dataset.r + "," + el.dataset.c;
    if(positions.has(key)){
      el.classList.add("highlight");
    }
  });
}

/* ========= SCALE TO FIT (with small safety margin) ========= */
function scaleGridToFit(){
  const outer = document.querySelector(".gridOuter");
  const scaler = document.querySelector(".gridScale");
  if(!outer || !scaler) return;

  const outerRect = outer.getBoundingClientRect();
  const gridRect  = gridEl.getBoundingClientRect();

  // Give a few pixels of margin so we never overflow horizontally
  const outerWidth = (outerRect.width || window.innerWidth || 320) - 8; // 8px margin
  const gridWidth  = gridRect.width || (GRID_COLS * 28);

  let scale = outerWidth / gridWidth;

  if(scale > 1) scale = 1;               // never enlarge
  if(scale <= 0 || !isFinite(scale)) scale = 1;

  scaler.style.transform = `scale(${scale})`;
}

/* ========= BOOT ========= */
generatePuzzle();
renderGrid();
highlightSolutions();

function scheduleScale(){
  setTimeout(scaleGridToFit, 50);
  setTimeout(scaleGridToFit, 150);
}
scheduleScale();

window.addEventListener("resize", ()=>scheduleScale());
window.addEventListener("orientationchange", ()=>scheduleScale());
