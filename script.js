// ---- Simple mock economy (local only for MVP) ----
let TOKENS = Number(localStorage.getItem("TOKENS") || 1000);
let joined = false;
let currentPot = 250;
const BUY_IN = 25;

const $ = (id)=>document.getElementById(id);
const fmt = (d)=>new Date(d).toLocaleTimeString();

function updatePot() { $("pot").textContent = `Pot: ${currentPot} Tokens`; }
function setStatus(txt) { $("status").textContent = txt; }

$("join").onclick = ()=>{
  const name = $("name").value.trim();
  if (!name) { setStatus("Enter a name first"); return; }
  if (joined) { setStatus("Already joined this round"); return; }
  if (TOKENS < BUY_IN) { setStatus("Not enough tokens"); return; }
  TOKENS -= BUY_IN;
  localStorage.setItem("TOKENS", TOKENS);
  joined = true;
  currentPot += BUY_IN;
  updatePot();
  setStatus(`Joined! Tokens left: ${TOKENS}`);
  $("start").disabled = false;
};

// ---- Skill Crash game (pure timing) ----
const canvas = $("game");
const ctx = canvas.getContext("2d");

let t = 0, raf = null, playing = false;
let target = { x: 0.55, w: 0.10 }; // relative position & width
let bar = { speed: 0.85 }; // cycles / sec, will vary
let startedAt = 0;

function draw() {
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  // timeline rail
  ctx.fillStyle = "#223";
  ctx.fillRect(40, H/2-12, W-80, 24);

  // moving bar
  const elapsed = (performance.now() - startedAt)/1000;
  const phase = elapsed * bar.speed; // cycles per sec
  const x = 40 + (( (phase % 1) ) * (W-80));
  ctx.fillStyle = "#6cf";
  ctx.fillRect(x-3, H/2-18, 6, 36);

  // target window
  const tx = 40 + target.x*(W-80);
  const tw = target.w*(W-80);
  ctx.strokeStyle = "#9cff8a";
  ctx.lineWidth = 3;
  ctx.strokeRect(tx - tw/2, H/2-22, tw, 44);

  raf = requestAnimationFrame(draw);
}

function resetRound() {
  // Generate a fresh target & speed each round (deterministic seed optional later)
  target.x = 0.25 + Math.random()*0.5;     // keep away from edges
  target.w = 0.08 + Math.random()*0.06;    // 8–14% of rail
  bar.speed = 0.70 + Math.random()*0.60;   // 0.7–1.3 cycles/sec
  $("result").textContent = "";
  $("click").disabled = false;
}

$("start").onclick = ()=>{
  if (!joined) { setStatus("Join the round first"); return; }
  if (playing) return;
  resetRound();
  playing = true;
  startedAt = performance.now();
  cancelAnimationFrame(raf);
  draw();
  setStatus("Round live: press Click inside target!");
};

$("click").onclick = ()=>{
  if (!playing) return;
  $("click").disabled = true;
  playing = false;
  cancelAnimationFrame(raf);

  const W = canvas.width;
  const elapsed = (performance.now() - startedAt)/1000;
  const phase = (elapsed * bar.speed) % 1;
  const railX = 40 + phase*(W-80);

  // compute distance from center of target in pixels
  const tx = 40 + target.x*(W-80);
  const tw = target.w*(W-80);
  const center = tx;
  const distPx = Math.abs(railX - center);
  const inside = distPx <= tw/2;

  // Convert pixel distance to "ms from center" feel
  const msFromCenter = Math.round(distPx * (1000 / (W-80)) * 100); // scaled for nice numbers

  if (inside) {
    // winner: add pot to player & reset pot
    const name = $("name").value.trim().slice(0,18) || "anon";
    saveLocalScore(name, msFromCenter);
    TOKENS += currentPot;
    localStorage.setItem("TOKENS", TOKENS);
    $("result").innerHTML = `🎉 <span class="ok">HIT!</span> ${name} wins ${currentPot} Tokens · accuracy: ${msFromCenter} ms`;
    currentPot = 250;
    updatePot();
    setStatus(`Tokens: ${TOKENS}`);
    joined = false; // require re-join for next round
    $("start").disabled = true;
  } else {
    $("result").innerHTML = `❌ <span class="bad">Missed</span> · off by ~${msFromCenter} ms. Try again next round!`;
  }
};

// ---- Local leaderboard (use Supabase later) ----
function saveLocalScore(name, score){
  const row = { name, score, at: Date.now() };
  const data = JSON.parse(localStorage.getItem("LEADER")||"[]");
  data.push(row);
  data.sort((a,b)=>a.score-b.score); // lower is better
  localStorage.setItem("LEADER", JSON.stringify(data.slice(0,50)));
  renderBoard();
}

function renderBoard(){
  const data = JSON.parse(localStorage.getItem("LEADER")||"[]");
  $("board").innerHTML = data.map(r=>(
    `<tr><td>${escapeHtml(r.name)}</td><td>${r.score}</td><td>${fmt(r.at)}</td></tr>`
  )).join("");
}
function escapeHtml(s){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

updatePot();
renderBoard();
setStatus(`Tokens: ${TOKENS} · Join a round to play`);
