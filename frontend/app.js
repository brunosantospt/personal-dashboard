const $ = (id) => document.getElementById(id);

// --- Manter o ecrã sempre ligado (kiosk) ---
let wakeLock = null;
async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
  } catch (e) {
    console.warn("wakeLock indisponível:", e.message);
  }
}
requestWakeLock();
// re-adquire quando a página volta a ficar visível (o lock liberta-se ao minimizar)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") requestWakeLock();
});

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
    <span class="wx-icon">${icon}</span>
    <div class="wx">
      <div>${label}</div>
      <div class="muted">vento ${Math.round(w.wind_speed)} km/h</div>
    </div>`;
}

// --- Cores por conta Google (pessoal / trabalho) ---
const PALETTE = ["#5eead4", "#f0883e", "#a78bfa", "#f87171"];
let accountColors = {};
let accountLabels = {};
let accountIds = [];  // contas Google ligadas (autoritativo), ordenadas

function computeAccountColors(data) {
  accountLabels = {};
  let ids;
  if (Array.isArray(data.accounts) && data.accounts.length) {
    // lista autoritativa do backend (contas ligadas, tenham itens ou não)
    data.accounts.forEach((a) => { if (a.label) accountLabels[a.account] = a.label; });
    ids = data.accounts.map((a) => a.account);
  } else {
    // fallback: deriva dos itens
    const set = new Set();
    (data.calendar || []).forEach((e) => e.account && set.add(e.account));
    (data.tasks || []).forEach((t) => {
      if (t.account) { set.add(t.account); if (t.label) accountLabels[t.account] = t.label; }
    });
    ids = [...set];
  }
  accountIds = ids.slice().sort();
  accountColors = {};
  accountIds.forEach((a, i) => { accountColors[a] = PALETTE[i % PALETTE.length]; });
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
// O backend devolve pendentes em cima e concluídas (até N horas) riscadas no fim.
function taskItemHtml(t) {
  const done = !!t.done;
  const color = colorFor(t.account);
  return `<li class="${done ? "completing" : ""}">
    <span class="check ${done ? "done" : ""}" role="button" tabindex="0"
      data-id="${escapeHtml(t.id || "")}" data-account="${escapeHtml(t.account || "")}"
      style="border-color:${color}${done ? `;background:${color}` : ""}"></span>
    <div>
      <div class="li-title"${done ? ' style="text-decoration:line-through"' : ""}>${escapeHtml(t.title || "")}</div>
      ${t.due ? `<div class="muted">${fmtWhen(t.due)}</div>` : ""}
    </div></li>`;
}

async function toggleTask(check) {
  const id = check.dataset.id;
  if (!id) return;
  const makeDone = !check.classList.contains("done");  // alterna conforme o estado
  // feedback imediato
  check.classList.toggle("done", makeDone);
  check.style.background = makeDone ? check.style.borderColor : "";
  const li = check.closest("li");
  li?.classList.toggle("completing", makeDone);
  const title = li?.querySelector(".li-title");
  if (title) title.style.textDecoration = makeDone ? "line-through" : "";
  try {
    const r = await fetch("/api/tasks/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account: check.dataset.account, id, done: makeDone }),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.status);
  } catch (e) {
    console.warn("não foi possível atualizar a tarefa:", e.message);
  } finally {
    setTimeout(refresh, 400);  // sincroniza com a verdade do servidor (sucesso ou falha)
  }
}

// delegação nos <ul> (sobrevive aos re-renders)
["front-list", "back-list"].forEach((id) => {
  $(id).addEventListener("click", (e) => {
    const check = e.target.closest(".check");
    if (check) toggleTask(check);
  });
});

function renderTaskList(el, items) {
  el.innerHTML = items.length ? items.map(taskItemHtml).join("") : '<li class="muted">Sem tarefas</li>';
}

function setFaceLabel(el, account) {
  el.textContent = accountLabels[account] || (account ? account.split("@")[0] : "");
  el.style.color = colorFor(account);
}

function renderTasks(tasks) {
  tasks = tasks || [];
  const accts = accountIds;
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
}

document.querySelectorAll(".flip-btn").forEach((btn) =>
  btn.addEventListener("click", () => $("tasks-flip").classList.toggle("flipped"))
);

// --- Spotify (com avanço client-side da barra entre polls) ---
let spotify = null;
let spotifyAt = 0;
let spotifyEnabled = true;

function setSpotify(s) {
  const player = $("player");
  if (!spotifyEnabled || !s || !s.name) { player.hidden = true; spotify = null; return; }
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

function setSlide(layer, url) {
  $(`slide-${layer}`).style.backgroundImage = `url("${url}")`;
}

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
    setSlide("a", photos[0]);
    $("slide-a").classList.add("active");
  }
}

function nextPhoto() {
  if (photos.length < 2) return;
  photoIdx = (photoIdx + 1) % photos.length;
  const next = activeLayer === "a" ? "b" : "a";
  setSlide(next, photos[photoIdx]);
  $(`slide-${next}`).classList.add("active");
  $(`slide-${activeLayer}`).classList.remove("active");
  activeLayer = next;
}

let photoTimer = null;
let photoIntervalMs = 8000;
function schedulePhotos() {
  if (photoTimer) clearInterval(photoTimer);
  photoTimer = setInterval(nextPhoto, photoIntervalMs);
}

loadPhotoList();
schedulePhotos();
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

// --- Config do servidor (definida no Admin Panel) ---
const GRID_GAP = 8;
let gridRows = 12;

// Altura da grelha calculada EXPLICITAMENTE (do topo da grelha até ao fundo do
// ecrã, menos o player) e linhas em px — não depende de flex/1fr/dvh, que
// colapsam no browser do tablet. Recalcula sempre que algo muda de tamanho.
function relayoutRows() {
  const grid = document.querySelector(".grid");
  const dash = document.querySelector(".dashboard");
  const player = document.querySelector(".player");
  if (!grid || !dash) return;
  const cs = getComputedStyle(dash);
  const padBottom = parseFloat(cs.paddingBottom) || 0;
  const flexGap = parseFloat(cs.rowGap) || 0;
  const dashBottom = dash.getBoundingClientRect().bottom;
  const gridTop = grid.getBoundingClientRect().top;
  const playerSpace = player && !player.hidden ? player.getBoundingClientRect().height + flexGap : 0;
  const avail = Math.max(40, dashBottom - padBottom - gridTop - playerSpace);
  grid.style.height = `${avail}px`;
  const rowPx = Math.max(8, (avail - (gridRows - 1) * GRID_GAP) / gridRows);
  grid.style.gridTemplateRows = `repeat(${gridRows}, ${rowPx}px)`;
}
// Observar o VIEWPORT (não a grelha, cuja altura fixo eu): a barra do browser do
// tablet a esconder-se muda o viewport -> recalcular para a foto voltar a preencher.
if (window.ResizeObserver) {
  new ResizeObserver(relayoutRows).observe(document.querySelector(".dashboard"));
}
window.addEventListener("resize", relayoutRows);
window.addEventListener("orientationchange", relayoutRows);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", relayoutRows);
  window.visualViewport.addEventListener("scroll", relayoutRows);
}

function applyConfig(cfg) {
  const root = document.documentElement;
  const a = cfg.appearance || {};
  root.dataset.theme = a.theme || "dark";
  root.style.setProperty("--accent", a.accent || "#5eead4");
  root.style.fontSize = `${(a.font_scale || 1) * 100}%`;

  const layout = cfg.layout || {};
  const grid = document.querySelector(".grid");
  const cols = layout.cols || 12;
  gridRows = layout.rows || 12;
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gap = `${GRID_GAP}px`;
  relayoutRows();  // define as linhas em px medidos
  Object.entries(layout.items || {}).forEach(([name, p]) => {
    const el = grid.querySelector(`[data-widget="${name}"]`);
    if (el) {
      el.style.gridColumn = `${p.x + 1} / span ${p.w}`;
      el.style.gridRow = `${p.y + 1} / span ${p.h}`;
    }
  });

  const widgets = cfg.widgets || {};
  Object.entries(widgets).forEach(([name, w]) => {
    const el = document.querySelector(`[data-widget="${name}"]`);
    if (el) el.dataset.disabled = w.enabled ? "" : "1";
  });

  spotifyEnabled = widgets.spotify ? widgets.spotify.enabled : true;
  if (!spotifyEnabled) $("player").hidden = true;

  const interval = (widgets.photos?.interval_seconds || 8) * 1000;
  if (interval !== photoIntervalMs) {
    photoIntervalMs = interval;
    schedulePhotos();
  }
}

async function loadConfig() {
  try {
    applyConfig(await (await fetch("/api/config")).json());
  } catch (e) {
    console.error("config falhou", e);
  }
}
loadConfig();
setInterval(loadConfig, 20000);  // aplica mudanças do admin em ~20s
[400, 1200, 2500].forEach((t) => setTimeout(relayoutRows, t));  // apanha o settle do viewport no tablet

// modo debug: abrir o dashboard com ?debug mostra os números reais do ecrã
if (location.search.includes("debug")) {
  const dbg = $("dbg");
  dbg.hidden = false;
  setInterval(() => {
    const g = document.querySelector(".grid");
    const p = document.querySelector(".photos-card");
    const r = (el) => el ? Math.round(el.getBoundingClientRect().height) : "?";
    dbg.textContent =
      `vp ${innerWidth}x${innerHeight}\n` +
      `grid h=${r(g)} top=${Math.round(g.getBoundingClientRect().top)}\n` +
      `photos h=${r(p)} bottom=${Math.round(p.getBoundingClientRect().bottom)}\n` +
      `rows ${gridRows}`;
  }, 500);
}

// --- Smart Home (dummy — controlos fictícios por agora) ---
const shLights = [
  { name: "Sala", on: true },
  { name: "Cozinha", on: false },
  { name: "Quarto", on: false },
  { name: "Escritório", on: true },
];
const shBlinds = [
  { name: "Sala", value: 80 },
  { name: "Quarto", value: 30 },
];
const shClimate = [{ name: "Ar condicionado", on: false }];

const SH_ICON = {
  bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .9 1.7l.1.5h5.2l.1-.5c.1-.7.4-1.3.9-1.7A6 6 0 0 0 12 3z"/></svg>',
  blind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 9h16M4 13h16M4 17h16"/></svg>',
  ac: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4.5 7l15 10M19.5 7l-15 10"/></svg>',
};

function renderSmartHome() {
  $("sh-lights").innerHTML = shLights.map((l, i) => `
    <button class="sh-tile light ${l.on ? "on" : ""}" data-type="light" data-i="${i}">
      <span class="sh-ico">${SH_ICON.bulb}</span>
      <span class="nm">${l.name}</span>
      <span class="st">${l.on ? "Ligada" : "Desligada"}</span>
    </button>`).join("");
  $("sh-climate").innerHTML = shClimate.map((c, i) => `
    <button class="sh-tile ac ${c.on ? "on" : ""}" data-type="climate" data-i="${i}">
      <span class="sh-ico">${SH_ICON.ac}</span>
      <span class="nm">${c.name}</span>
      <span class="st">${c.on ? "Ligado" : "Desligado"}</span>
    </button>`).join("");
  $("sh-blinds").innerHTML = shBlinds.map((b, i) => `
    <div class="sh-tile blind">
      <span class="sh-ico">${SH_ICON.blind}</span>
      <span class="nm">${b.name}</span>
      <span class="st"><b id="blind-val-${i}">${b.value}</b>% aberto</span>
      <input type="range" class="sh-slider" min="0" max="100" value="${b.value}" data-i="${i}">
    </div>`).join("");
}

$("smarthome-card").addEventListener("click", () => {
  renderSmartHome();
  $("sh-modal").hidden = false;
});
$("sh-close").addEventListener("click", () => { $("sh-modal").hidden = true; });
$("sh-modal").addEventListener("click", (e) => {
  if (e.target.id === "sh-modal") { $("sh-modal").hidden = true; return; }  // clicar fora fecha
  const tile = e.target.closest(".sh-tile[data-type]");
  if (!tile) return;
  const i = +tile.dataset.i;
  const isLight = tile.dataset.type === "light";
  const item = (isLight ? shLights : shClimate)[i];
  item.on = !item.on;
  tile.classList.toggle("on", item.on);
  tile.querySelector(".st").textContent = item.on
    ? (isLight ? "Ligada" : "Ligado")
    : (isLight ? "Desligada" : "Desligado");
});
$("sh-modal").addEventListener("input", (e) => {
  if (!e.target.classList.contains("sh-slider")) return;
  const i = +e.target.dataset.i;
  shBlinds[i].value = +e.target.value;
  $(`blind-val-${i}`).textContent = e.target.value;
});
