const state = {
  sports: [],
  selectedSport: null,
  tournaments: [],
  matches: [],
  loading: false,
  requestId: 0,
};
const elements = {
  tabs: document.querySelector("#sport-tabs"),
  dashboard: document.querySelector("#dashboard"),
  date: document.querySelector("#match-date"),
  search: document.querySelector("#search-input"),
  refresh: document.querySelector("#refresh-button"),
  message: document.querySelector("#global-message"),
  connection: document.querySelector("#connection-label"),
  updated: document.querySelector("#last-updated"),
};
const today = () => new Date().toISOString().slice(0, 10);
const prettyName = (slug) => String(slug || "Sport").replace(/-/g, " ");
const safeArray = (value) => (Array.isArray(value) ? value : []);
const text = (value, fallback = "Details unavailable") =>
  value === null || value === undefined || value === ""
    ? fallback
    : String(value);
function showMessage(message = "") {
  elements.message.textContent = message;
  elements.message.hidden = !message;
}
async function requestJson(url, signal) {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }
  if (!response.ok)
    throw new Error(
      payload.details ||
        payload.error ||
        `Request failed (${response.status}).`,
    );
  return payload;
}
function renderTabs() {
  elements.tabs.replaceChildren(
    ...state.sports.map((sport) => {
      const button = document.createElement("button");
      button.className = "sport-tab";
      button.type = "button";
      button.role = "tab";
      button.ariaSelected = sport.slug === state.selectedSport?.slug;
      button.textContent = prettyName(sport.slug);
      button.addEventListener("click", () => selectSport(sport));
      return button;
    }),
  );
}
function emptyState(message) {
  const node = document.createElement("div");
  node.className = "empty-state";
  node.textContent = message;
  return node;
}
function escapeHtml(value) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ],
  );
}
function renderDashboard() {
  const query = elements.search.value.trim().toLowerCase();
  const tournaments =
    state.selectedSport?.slug === "cricket"
      ? state.tournaments.filter((item) =>
          JSON.stringify(item).toLowerCase().includes(query),
        )
      : state.tournaments;
  const name = prettyName(state.selectedSport?.slug);
  const tournamentCards = tournaments.map((item, index) => {
    const card = document.createElement("article");
    card.className = "tournament-card";
    card.innerHTML = `<div><h3>${escapeHtml(text(item.name, text(item.title, "Unnamed tournament")))}</h3><p>${escapeHtml(text(item.category || item.startDate || item.endDate, "Tournament details unavailable"))}</p></div><span class="tournament-index">${String(index + 1).padStart(2, "0")}</span>`;
    return card;
  });
  const matchCards = state.matches.map((match) => {
    const card = document.createElement("article");
    card.className = "match-card";
    const start = match.startTime ? new Date(match.startTime) : null;
    const time =
      start && !Number.isNaN(start.valueOf())
        ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "TBD";
    card.innerHTML = `<time class="match-time">${time}</time><div class="match-teams"><strong>${escapeHtml(text(match.competitor1 || match.player1, "Participant 1 TBD"))}</strong><span>vs ${escapeHtml(text(match.competitor2 || match.player2, "Participant 2 TBD"))}</span></div>`;
    return card;
  });
  const dashboard = document.createElement("div");
  dashboard.className = "dashboard-grid";
  dashboard.innerHTML = `<section><div class="section-heading"><h2>${escapeHtml(name)} tournaments</h2><span>${tournaments.length} found</span></div><div class="tournament-list"></div></section><section class="matches"><div class="section-heading"><h2>Upcoming matches</h2><span>${state.selectedSport?.hasMatches ? state.matches.length + " scheduled" : "Not available"}</span></div><div class="match-list"></div></section>`;
  dashboard
    .querySelector(".tournament-list")
    .replaceChildren(
      ...(tournamentCards.length
        ? tournamentCards
        : [
            emptyState(
              query
                ? "No tournaments match your search."
                : "No tournaments were returned for this date.",
            ),
          ]),
    );
  dashboard
    .querySelector(".match-list")
    .replaceChildren(
      ...(state.selectedSport?.hasMatches
        ? matchCards.length
          ? matchCards
          : [emptyState("No upcoming matches were returned.")]
        : [emptyState("This sport provides tournament data only.")]),
    );
  elements.dashboard.replaceChildren(dashboard);
}
async function loadSport() {
  if (!state.selectedSport) return;
  state.loading = true;
  elements.refresh.disabled = true;
  showMessage("");
  elements.dashboard.innerHTML =
    '<div class="loading-state"><span class="spinner"></span><span>Loading live data...</span></div>';
  const requestId = ++state.requestId;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const slug = encodeURIComponent(state.selectedSport.slug);
    const date = encodeURIComponent(elements.date.value || today());
    const [tournamentData, matchData] = await Promise.all([
      requestJson(`/api/${slug}/tournaments`, controller.signal),
      state.selectedSport.hasMatches
        ? requestJson(
            `/api/${slug}/upcoming-matches?date=${date}`,
            controller.signal,
          )
        : Promise.resolve({ matches: [] }),
    ]);
    if (requestId !== state.requestId) return;
    state.tournaments = safeArray(tournamentData.tournaments).filter(
      (item) => item && typeof item === "object",
    );
    state.matches = safeArray(matchData.matches).filter(
      (item) => item && typeof item === "object",
    );
    renderDashboard();
    elements.connection.textContent = "Live connection";
    elements.updated.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch (error) {
    if (requestId !== state.requestId) return;
    state.tournaments = [];
    state.matches = [];
    elements.dashboard.replaceChildren(
      emptyState(
        error.name === "AbortError"
          ? "The request took too long. Try refreshing."
          : "Unable to load this sport.",
      ),
    );
    showMessage(error.message);
    elements.connection.textContent = "Connection issue";
  } finally {
    clearTimeout(timeout);
    state.loading = false;
    elements.refresh.disabled = false;
  }
}
async function selectSport(sport) {
  state.selectedSport = sport;
  renderTabs();
  await loadSport();
}
async function initialise() {
  elements.date.value = today();
  try {
    const data = await requestJson("/api/sports");
    state.sports = safeArray(data.sports).filter(
      (sport) => sport && sport.slug,
    );
    if (!state.sports.length)
      throw new Error("No sports are configured on the server.");
    state.selectedSport = state.sports[0];
    renderTabs();
    await loadSport();
  } catch (error) {
    elements.connection.textContent = "Offline";
    showMessage(error.message);
    elements.dashboard.replaceChildren(
      emptyState("The sports catalog could not be loaded."),
    );
  }
}
elements.date.addEventListener("change", loadSport);
elements.search.addEventListener("input", renderDashboard);
elements.refresh.addEventListener("click", loadSport);
initialise();
