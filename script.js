// === Supabase Setup ===
const SUPABASE_URL = "https://dlfnirdwipgaqqgxlscn.supabase.co";
const SUPABASE_KEY = "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Y3pla3J5Z2Z5YWhxbm9zaXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjQ5ODAsImV4cCI6MjA3MTE0MDk4MH0.263c9ncmGjFXltImaW5TZWnkBRpjPenMLVtKI1lHZoQ";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// === Save Score ===
async function saveScore(name, score, difficulty) {
  const { error } = await supabase.from("scores").insert([
    { name, score, difficulty }
  ]);
  if (error) console.error("Error saving score:", error);
  else console.log("Score saved!");
  await renderBoard(); // refresh leaderboard after saving
}

// === Render Leaderboard ===
async function renderBoard() {
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .order("score", { ascending: true })
    .limit(50);

  if (error) {
    console.error("Error fetching scores:", error);
    return;
  }

  const rows = (data || [])
    .map(r => 
      `<tr><td>${esc(r.name)}</td><td>${r.score}</td><td>${fmt(r.created_at)}</td></tr>`
    )
    .join("");

  $("board").innerHTML =
    rows || `<tr><td colspan="3"><em>No scores yet — be the first!</em></td></tr>`;
}

// === Game Logic (part of your existing code) ===
$("click").onclick = async () => {
  const name = $("name").value.trim() || "anon";
  const msFromCenter = ...; // your timing calculation here
  const chosenDiffKey = ...; // difficulty variable

  await saveScore(name, msFromCenter, chosenDiffKey);
};

// === Init ===
updateUI();
renderBoard();
$("status").textContent = `Tokens: ${TOKENS} · Choose difficulty → Join to play`;
