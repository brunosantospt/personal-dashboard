const $ = (id) => document.getElementById(id);

// --- Relógio + data (client-side, cada segundo) ---
function tickClock() {
  const now = new Date();
  $("clock").textContent = now.toLocaleTimeString("pt-PT", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const d = now.toLocaleDateString("pt-PT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  $("date").textContent = d.charAt(0).toUpperCase() + d.slice(1);
}
setInterval(tickClock, 1000);
tickClock();

// --- Meteo: código WMO -> emoji + texto ---
function weatherInfo(code) {
  const map = {
    0: ["☀️", "Céu limpo"], 1: ["🌤️", "Pouco nublado"], 2: ["⛅", "Parcialmente nublado"],
    3: ["☁️", "Nublado"], 45: ["🌫️", "Nevoeiro"], 48: ["🌫️", "Nevoeiro"],
    51: ["🌦️", "Chuvisco"], 53: ["🌦️", "Chuvisco"], 55: ["🌦️", "Chuvisco"],
    61: ["🌧️", "Chuva fraca"], 63: ["🌧️", "Chuva"], 65: ["🌧️", "Chuva forte"],
    71: ["🌨️", "Neve"], 73: ["🌨️", "Neve"], 75: ["🌨️", "Neve forte"],
    80: ["🌦️", "Aguaceiros"], 81: ["🌦️", "Aguaceiros"], 82: ["🌦️", "Aguaceiros fortes"],
    95: ["⛈️", "Trovoada"], 96: ["⛈️", "Trovoada"], 99: ["⛈️", "Trovoada"],
  };
  return map[code] || ["🌡️", "—"];
}

function fmtWhen(iso) {
  if (!iso) return "";
  if (iso.length === 10) {
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-PT", {
      weekday: "short", day: "numeric", month: "short",
    });
  }
  const d = new Date(iso);
  return d.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" }) +
    " · " + d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// --- Render ---
function renderWeather(w) {
  if (!w) { $("weather").innerHTML = '<span class="muted">indisponível</span>'; return; }
  const [icon, label] = weatherInfo(w.weather_code);
  $("weather").innerHTML = `
    <div class="temp">${Math.round(w.temperature)}°</div>
    <div class="wx">
      <div class="wx-icon">${icon}</div>
      <div>${label}</div>
      <div class="muted">vento ${Math.round(w.wind_speed)} km/h</div>
    </div>`;
}

// --- Cores por conta Google (pessoal / trabalho) ---
const PALETTE = ["#5eead4", "#f0883e", "#a78bfa", "#f87171"];
let accountColors = {};
let accountLabels = {};

function computeAccountColors(data) {
  const accts = new Set();
  accountLabels = {};
  const collect = (item) => {
    if (!item.account) return;
    accts.add(item.account);
    if (item.label) accountLabels[item.account] = item.label;
  };
  (data.calendar || []).forEach(collect);
  (data.tasks || []).forEach(collect);
  accountColors = {};
  [...accts].sort().forEach((a, i) => { accountColors[a] = PALETTE[i % PALETTE.length]; });
}

const colorFor = (account) => accountColors[account] || "var(--accent)";

// Tag colorida (Work / Pessoal) com a cor da conta.
function tagHtml(item) {
  if (!item.label) return "";
  return `<span class="tag" style="color:${colorFor(item.account)}">${escapeHtml(item.label)}</span>`;
}

function renderCalendar(events) {
  const el = $("calendar");
  if (!events || !events.length) { el.innerHTML = '<li class="muted">Sem eventos</li>'; return; }
  el.innerHTML = events.map((e) => `
    <li><span class="dot" style="background:${colorFor(e.account)}"></span><div>
      <div class="li-title">${escapeHtml(e.summary || "(sem título)")} ${tagHtml(e)}</div>
      <div class="muted">${fmtWhen(e.start)}</div>
    </div></li>`).join("");
}

// --- Tarefas: card que vira 180° entre as duas contas (Work / Pessoal) ---
function taskItemHtml(t) {
  return `<li><span class="check" style="border-color:${colorFor(t.account)}"></span><div>
    <div class="li-title">${escapeHtml(t.title || "")}</div>
    ${t.due ? `<div class="muted">${fmtWhen(t.due)}</div>` : ""}
  </div></li>`;
}

function renderTaskList(el, items) {
  el.innerHTML = items.length ? items.map(taskItemHtml).join("") : '<li class="muted">Sem tarefas</li>';
}

function setFaceLabel(el, account) {
  el.textContent = accountLabels[account] || (account ? account.split("@")[0] : "");
  el.style.color = colorFor(account);
}

function setFlipHeight() {
  const inner = $("tasks-inner");
  inner.style.height = "auto";  // deixa colapsar para medir o conteúdo real
  inner.style.height = Math.max($("tasks-front").scrollHeight, $("tasks-back").scrollHeight) + "px";
}

function renderTasks(tasks) {
  tasks = tasks || [];
  const accts = Object.keys(accountColors).sort();
  const flip = $("tasks-flip");
  if (accts.length === 2) {  // duas contas -> flip entre elas
    flip.dataset.mode = "flip";
    renderTaskList($("front-list"), tasks.filter((t) => t.account === accts[0]));
    setFaceLabel($("front-label"), accts[0]);
    renderTaskList($("back-list"), tasks.filter((t) => t.account === accts[1]));
    setFaceLabel($("back-label"), accts[1]);
  } else {  // 1 conta (ou nenhuma/+ de 2) -> sem flip, mostra tudo
    flip.dataset.mode = "single";
    flip.classList.remove("flipped");
    renderTaskList($("front-list"), tasks);
    setFaceLabel($("front-label"), accts[0] || "");
  }
  setFlipHeight();
}

document.querySelectorAll(".flip-btn").forEach((btn) =>
  btn.addEventListener("click", () => $("tasks-flip").classList.toggle("flipped"))
);
window.addEventListener("resize", setFlipHeight);

// --- Spotify (com avanço client-side da barra entre polls) ---
let spotify = null;
let spotifyAt = 0;

function setSpotify(s) {
  const player = $("player");
  if (!s || !s.name) { player.hidden = true; spotify = null; return; }
  spotify = s;
  spotifyAt = Date.now();
  player.hidden = false;
  $("cover").src = s.image || "";
  $("track-title").textContent = s.name;
  $("track-artist").textContent = s.artists || "";
  $("btn-playpause").textContent = s.is_playing ? "⏸" : "▶";
  updateProgress();
}

// --- Controlos de playback ---
async function control(action) {
  try {
    const r = await fetch(`/api/spotify/${action}`, { method: "POST" });
    if (!r.ok) {
      const err = $("btn-playpause");
      err.classList.add("flash-err");
      setTimeout(() => err.classList.remove("flash-err"), 1200);
      const body = await r.json().catch(() => ({}));
      console.warn("controlo Spotify falhou:", body.detail || r.status);
      return;
    }
    // Otimista: o estado real chega no próximo refresh. Pequeno atraso ajuda a API.
    setTimeout(refresh, 400);
  } catch (e) {
    console.error("controlo falhou", e);
  }
}

$("btn-prev").addEventListener("click", () => control("previous"));
$("btn-next").addEventListener("click", () => control("next"));
$("btn-playpause").addEventListener("click", () =>
  control(spotify && spotify.is_playing ? "pause" : "play")
);

function updateProgress() {
  if (!spotify || !spotify.duration_ms) return;
  let p = spotify.progress_ms || 0;
  if (spotify.is_playing) p += Date.now() - spotifyAt;
  $("progress-bar").style.width = Math.min(100, (p / spotify.duration_ms) * 100) + "%";
}
setInterval(updateProgress, 1000);

// --- Carousel de fotos (pasta local) ---
let photos = [];
let photoIdx = 0;
let activeLayer = "a";

async function loadPhotoList() {
  try {
    photos = (await (await fetch("/api/photos")).json()).photos || [];
  } catch { photos = []; }
  const card = $("photos-card");
  if (!photos.length) { card.hidden = true; return; }
  if (card.hidden) {  // primeira foto a aparecer
    card.hidden = false;
    photoIdx = 0;
    activeLayer = "a";
    const a = $("carousel-a");
    a.src = photos[0];
    a.classList.add("active");
  }
}

function nextPhoto() {
  if (photos.length < 2) return;
  photoIdx = (photoIdx + 1) % photos.length;
  const cur = $(`carousel-${activeLayer}`);
  const nxt = $(`carousel-${activeLayer === "a" ? "b" : "a"}`);
  nxt.src = photos[photoIdx];
  nxt.classList.add("active");
  cur.classList.remove("active");
  activeLayer = activeLayer === "a" ? "b" : "a";
}

loadPhotoList();
setInterval(nextPhoto, 8000);
setInterval(loadPhotoList, 5 * 60 * 1000);  // apanha fotos novas na pasta

// --- Loop de dados ---
async function refresh() {
  try {
    const data = await (await fetch("/api/dashboard")).json();
    computeAccountColors(data);
    renderWeather(data.weather);
    renderCalendar(data.calendar);
    renderTasks(data.tasks);
    setSpotify(data.spotify);
  } catch (e) {
    // Mantém o último valor conhecido em caso de falha de rede.
    console.error("refresh falhou", e);
  }
}
refresh();
setInterval(refresh, 5000);
