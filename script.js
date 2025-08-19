// ================== Difficulty + Streak upgrade ==================

const DIFFS = {
  easy:   { label: "Easy",   targetW: [0.12, 0.16], speed: [0.60, 0.90], buyIn: 25,  bonus: 1.00 },
  medium: { label: "Medium", targetW: [0.08, 0.12], speed: [0.80, 1.20], buyIn: 35,  bonus: 1.25 },
  hard:   { label: "Hard",   targetW: [0.05, 0.08], speed: [1.00, 1.50], buyIn: 50,  bonus: 1.50 },
};

// Streak multiplier table: 1, 1.5, 2, 3 (cap at 3x)
function streakMultiplier(streak) {
  if (streak <= 1) return 1;
  if (streak === 2) return 1.5;
  if (streak === 3) return 2;
  return 3; // 4 or more
}

const $ = (id)=>document.getElementById(id);
const fmt = (d)=>new Date(d).toLocaleTimeString();
const esc = (s)=> (s||"").replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
// ===== SUPABASE PERSISTENCE =====
const SUPABASE_URL = "https://cvczekrygfyahqnosivo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Y3pla3J5Z2Z5YWhxbm9zaXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjQ5ODAsImV4cCI6MjA3MTE0MDk4MH0.263c9ncmGjFXltImaW5TZWnkBRpjPenMLVtKI1lHZoQ";   // replace with real anon key
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function saveScore(name, score, difficulty) {
  try {
    const { error } = await sb.from("scores").insert({ name, score, difficulty });
    if (error) throw error;
    await renderBoard();
  } catch (e) {
    console.error("saveScore error", e);
  }
}

async function renderBoard() {
  try {
    const { data, error } = await sb
      .from("scores")
      .select("name, score, created_at, difficulty")
      .order("score", { ascending: true })
      .limit(50);
    if (error) throw error;
    $("board").innerHTML =
      (data || [])
        .map(r =>
          `<tr><td>${esc(r.name)}</td><td>${r.score}</td><td>${fmt(r.created_at)}</td></tr>`
        )
        .join("") || `<tr><td colspan="3"><em>No scores yet</em></td></tr>`;
  } catch (e) {
    console.error("renderBoard error", e);
  }
}

// ------- Economy (local-only, practice) -------
let TOKENS = Number(localStorage.getItem("TOKENS") || 1500);
let currentPot = Number(localStorage.getItem("POT") || 250);
let joined = false;
let streak = Number(localStorage.getItem("STREAK") || 0);
let chosenDiffKey = (localStorage.getItem("DIFF") || "medium");

function updateUI(){
  $("status").textContent = `Tokens: ${TOKENS}`;
  $("pot").textContent    = `Pot: ${currentPot} Tokens`;
  $("streakPill").textContent = `Streak: ${streak}`;
  // Sync difficulty selector + join button label
  $("difficulty").value = chosenDiffKey;
  const buyIn = DIFFS[chosenDiffKey].buyIn;
  $("join").textContent = `Join Round (${buyIn} Tokens)`;
}
function saveEconomy(){
  localStorage.setItem("TOKENS", TOKENS);
  localStorage.setItem("POT", currentPot);
  localStorage.setItem("STREAK", streak);
  localStorage.setItem("DIFF", chosenDiffKey);
}

// ------- Difficulty selector -------
$("difficulty").addEventListener("change", () => {
  chosenDiffKey = $("difficulty").value;
  const buyIn = DIFFS[chosenDiffKey].buyIn;
  $("join").textContent = `Join Round (${buyIn} Tokens)`;
  saveEconomy();
});

// ------- Join logic (uses chosen difficulty buy-in) -------
$("join").onclick = () => {
  const name = $("name").value.trim();
  if (!name) { $("status").textContent = "Enter a name first"; return; }
  if (joined) { $("status").textContent = "Already joined this round"; return; }

  const buyIn = DIFFS[chosenDiffKey].buyIn;
  if (TOKENS < buyIn) { $("status").textContent = "Not enough tokens"; return; }

  TOKENS -= buyIn;
  currentPot += buyIn;
  joined = true;
  $("start").disabled = false;
  saveEconomy(); updateUI();
  $("status").textContent = `Joined (${DIFFS[chosenDiffKey].label})! Tokens left: ${TOKENS}`;
};

// ------- The Skill Crash game -------
const canvas = $("game"), ctx = canvas.getContext("2d");
let playing=false, raf=0, startedAt=0;
let target = { x:.55, w:.10 };  // relative center & width
let bar = { speed:.9 };         // cycles/sec

function randRange([a,b]){ return a + Math.random()*(b-a); }

function resetRound(){
  // pick params based on difficulty
  const d = DIFFS[chosenDiffKey];
  target.x = 0.22 + Math.random()*0.56;     // keep away from edges
  target.w = randRange(d.targetW);
  bar.speed = randRange(d.speed);

  $("result").textContent = "";
  $("click").disabled = false;
}

function draw(){
  const W=canvas.width, H=canvas.height;
  ctx.clearRect(0,0,W,H);

  // rail
  ctx.fillStyle="#2a2f49";
  ctx.fillRect(40, H/2-12, W-80, 24);

  // target window
  const tx = 40 + target.x*(W-80);
  const tw = target.w*(W-80);
  ctx.strokeStyle="#8dffcf"; ctx.lineWidth=3;
  ctx.strokeRect(tx - tw/2, H/2-22, tw, 44);

  // moving bar
  const elapsed = (performance.now()-startedAt)/1000;
  const phase = elapsed*bar.speed; // cycles
  const x = 40 + ((phase%1)*(W-80));
  ctx.fillStyle="#7bc4ff";
  ctx.fillRect(x-3, H/2-18, 6, 36);

  raf = requestAnimationFrame(draw);
}

$("start").onclick = ()=>{
  if (!joined) { $("status").textContent = "Join the round first"; return; }
  if (playing) return;
  resetRound();
  playing = true; startedAt = performance.now();
  cancelAnimationFrame(raf); draw();
  $("status").textContent = `Round live (${DIFFS[chosenDiffKey].label}): click inside the target!`;
};

$("click").onclick = ()=>{
  if (!playing) return;
  $("click").disabled = true;
  playing=false; cancelAnimationFrame(raf);

  const W = canvas.width;
  const elapsed = (performance.now()-startedAt)/1000;
  const phase = (elapsed*bar.speed)%1;
  const railX = 40 + phase*(W-80);

  const tx = 40 + target.x*(W-80);
  const tw = target.w*(W-80);
  const center = tx;
  const distPx = Math.abs(railX - center);
  const inside = distPx <= tw/2;

  // Convert pixel distance to a "ms from center" feel
  const msFromCenter = Math.round(distPx * (1000/(W-80)) * 100);

  if (inside) {
    // WIN: update streak, award pot + bonus (based on difficulty & streak)
    streak += 1;
    const sMult = streakMultiplier(streak);     // 1, 1.5, 2, 3
    const diffBonus = DIFFS[chosenDiffKey].bonus;

    // Streak bonus is extra tokens on top of the pot (doesn't reduce the pot).
    // Formula: buyIn * (sMult - 1) * diffBonus * 2  (tweakable)
    const buyIn = DIFFS[chosenDiffKey].buyIn;
    const streakBonus = Math.round(buyIn * (sMult - 1) * diffBonus * 2);

    const name = ($("name").value.trim() || "anon").slice(0,18);

    addScore(name, msFromCenter); // keep local leaderboard
    const won = currentPot + streakBonus;

    TOKENS += won;                // pot + bonus
    currentPot = 250;             // reset pot for next round
    joined = false;               // must re-join
    $("start").disabled = true;

    saveEconomy(); updateUI();

    $("result").innerHTML =
      `🎉 <span class="ok">HIT!</span> ${esc(name)} wins <b>${won}</b> Tokens `
      + `(Pot + <span title="streak x difficulty">Bonus ${streakBonus}</span>) · `
      + `accuracy: ${msFromCenter} ms · streak x${sMult}`;
  } else {
    // MISS: streak resets
    streak = 0;
    saveEconomy(); updateUI();
    $("result").innerHTML = `❌ <span class="bad">Missed</span> · off by ~${msFromCenter} ms. Streak reset.`;
  }
};

// ------- Local leaderboard -------
function addScore(name,score){
  const data = JSON.parse(localStorage.getItem("LEADER")||"[]");
  data.push({name,score,at:Date.now()});
  data.sort((a,b)=>a.score-b.score); // lower is better
  localStorage.setItem("LEADER", JSON.stringify(data.slice(0,50)));
  renderBoard();
}
function renderBoard(){
  const rows = JSON.parse(localStorage.getItem("LEADER")||"[]")
    .map(r=>`<tr><td>${esc(r.name)}</td><td>${r.score}</td><td>${fmt(r.at)}</td></tr>`)
    .join("");
  $("board").innerHTML = rows || `<tr><td colspan="3"><em>No scores yet — be the first!</em></td></tr>`;
}

// Init
updateUI();
renderBoard();
$("status").textContent = `Tokens: ${TOKENS} · Choose difficulty → Join to play`;
