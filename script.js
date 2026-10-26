const $ = (id) => document.getElementById(id);
let running = false;
let startedAt = 0;
let elapsedBeforeStart = 0;
let finishAt = 0;
let ticker = null;

function log(message) {
  const row = document.createElement("div");
  row.className = "log";
  const time = document.createElement("time");
  time.textContent = new Date().toLocaleTimeString();
  const text = document.createElement("span");
  text.textContent = message;
  row.append(time, text);
  $("logs").prepend(row);
}

function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === id));
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.page === id));
}
document.querySelectorAll("[data-page]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.go)));

$("toggleToken").addEventListener("click", () => {
  const field = $("apiToken");
  const show = field.type === "password";
  field.type = show ? "text" : "password";
  $("toggleToken").textContent = show ? "Hide" : "Show";
});

$("settingsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const mins = Number($("duration").value);
  if (!Number.isInteger(mins) || mins < 1 || mins > 1440) {
    $("settingsMessage").textContent = "Time must be between 1 and 1440 minutes.";
    return;
  }
  $("displayName").textContent = [$("firstName").value.trim(), $("lastName").value.trim()].filter(Boolean).join(" ") || "Not set";
  $("displayDuration").textContent = `${mins} min`;
  $("settingsMessage").textContent = "Settings updated for this session.";
  log("Settings updated.");
});

$("importFile").addEventListener("change", async () => {
  const file = $("importFile").files[0];
  if (!file) return;
  $("fileInfo").textContent = `${file.name} · ${Math.ceil(file.size / 1024)} KB`;
  if (file.size > 5 * 1024 * 1024) {
    $("fileInfo").textContent = "File exceeds 5 MB. Choose a smaller file.";
    $("importFile").value = "";
    return;
  }
  const form = new FormData();
  form.append("file", file);
  try {
    const response = await fetch("/api/import", { method: "POST", body: form });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Upload failed");
    log(`Import received: ${result.fileName}. ${result.message}`);
    $("fileInfo").textContent = `${result.fileName} — received for demo; file discarded by server.`;
  } catch (err) {
    log(`Import error: ${err.message}`);
    $("fileInfo").textContent = "Could not upload. Make sure the local server is running.";
  }
});

$("validateToken").addEventListener("click", async () => {
  const token = $("apiToken").value.trim();
  if (!token) {
    $("settingsMessage").textContent = "Paste your authorized Facebook token first.";
    return;
  }
  $("settingsMessage").textContent = "Checking token with Facebook…";
  $("apiStatus").textContent = "Checking…";
  try {
    const response = await fetch("/api/facebook/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Token validation failed");
    $("apiStatus").textContent = "Validated";
    $("settingsMessage").textContent = `Token valid for ${result.account.name} (ID ${result.account.id}).`;
    log(`Facebook token validated for ${result.account.name}. No Facebook action performed.`);
  } catch (err) {
    $("apiStatus").textContent = "Not validated";
    $("settingsMessage").textContent = err.message;
    log(`Token validation failed: ${err.message}`);
  } finally {
    // Do not persist the token in local storage or cookies.
  }
});

function formatTime(total) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}

function updateTimer() {
  if (!running) return;
  const elapsed = elapsedBeforeStart + Math.floor((Date.now() - startedAt) / 1000);
  $("runtime").textContent = formatTime(elapsed);
  if (Date.now() >= finishAt) stopDemo("Time limit reached.");
}

$("startButton").addEventListener("click", () => {
  if (running) return log("Demo timer is already running.");
  const mins = Number($("duration").value);
  if (!Number.isInteger(mins) || mins < 1 || mins > 1440) {
    alert("Set a time between 1 and 1440 minutes on Settings.");
    return;
  }
  running = true;
  startedAt = Date.now();
  finishAt = Date.now() + Math.max(0, mins * 60 - elapsedBeforeStart) * 1000;
  $("runStatus").textContent = "RUNNING · DEMO TIMER";
  $("statusDot").classList.add("running");
  log("Demo timer started. No Facebook actions will run.");
  ticker = setInterval(updateTimer, 1000);
  updateTimer();
});

function stopDemo(reason = "Stopped by user.") {
  if (running) elapsedBeforeStart += Math.floor((Date.now() - startedAt) / 1000);
  running = false;
  if (ticker) clearInterval(ticker);
  ticker = null;
  $("runStatus").textContent = "STOPPED";
  $("statusDot").classList.remove("running");
  log(`Demo timer stopped. ${reason}`);
}
$("stopButton").addEventListener("click", () => stopDemo());

$("clearLogs").addEventListener("click", () => {
  $("logs").replaceChildren();
  log("Logs cleared.");
});

async function checkServer() {
  try {
    const response = await fetch("/api/status");
    const data = await response.json();
    $("serverStatus").textContent = data.ok ? "Server online · Demo mode" : "Server issue";
    log("Dashboard initialized. Server connection confirmed.");
  } catch {
    $("serverStatus").textContent = "Server offline";
    log("Server not reachable. Start it with npm start.");
  }
}
checkServer();
