/* MASTER WORD SEARCH SOLUTION ENGINE */
const { title, subtitle, gridRows, gridCols, seed, words } = PUZZLE_CONFIG;

/* Header */
document.querySelector("header h1").textContent = title + " - Solution";
document.querySelector("header h2").textContent = subtitle;

/* RNG */
let _seed = seed;
function rand(){
  _seed = (_seed * 1103515245 + 12345) % 2147483648;
  return _seed / 2147483648;
}
function choice(arr){ return arr[Math.floor(rand()*arr.length)]; }

/* Directions */
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
      for(let i=0;i<word.length;i++)
        grid[r+dr*i][c+dc*i] = word[i];
      return;
    }
  }
}

function generatePuzzle(){
  [...words].sort((a,b)=>b.length-a.length).forEach(w=>placeWord(w));
  const ABC="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for(let r=0;r<gridRows;r++){
    for(let c=0;c<gridCols;c++){
      if(!grid[r][c])
        grid[r][c] = ABC[Math.floor(rand()*26)];
    }
  }
}

/* Render */
const gridEl = document.getElementById("grid");
gridEl.style.gridTemplateColumns = `repeat(${gridCols}, var(--cell))`;

let cells = [];

function renderGrid(){
  gridEl.innerHTML = "";
  cells = [];
  for(let r=0;r<gridRows;r++){
    for(let c=0;c<gridCols;c++){
      const div = document.createElement("div");
      div.className = "cell";
      div.textContent = grid[r][c];
      div.dataset.r = r;
      div.dataset.c = c;
      gridEl.appendChild(div);
      cells.push(div);
    }
  }
}

/* Highlight solutions */
function matchAt(word,r,c,dr,dc){
  for(let i=0;i<word.length;i++){
    const rr=r+dr*i, cc=c+dc*i;
    if(!inBounds(rr,cc)) return false;
    if(grid[rr][cc] !== word[i]) return false;
  }
  return true;
}

function highlight(){
  const found = new Set();

  words.forEach(word=>{
    const rev = word.split("").reverse().join("");
    for(let r=0;r<gridRows;r++){
      for(let c=0;c<gridCols;c++){
        DIRS.forEach(({dr,dc})=>{
          if(matchAt(word,r,c,dr,dc) || matchAt(rev,r,c,dr,dc)){
            for(let i=0;i<word.length;i++){
              const rr=r+dr*i, cc=c+dc*i;
              found.add(rr+","+cc);
            }
          }
        });
      }
    }
  });

  cells.forEach(el=>{
    if(found.has(el.dataset.r+","+el.dataset.c))
      el.classList.add("highlight");
  });
}

/* Scale to fit */
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
highlight();
setTimeout(scaleGrid,50);
window.onresize=()=>setTimeout(scaleGrid,50);
