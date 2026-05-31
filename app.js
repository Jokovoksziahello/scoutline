const STORAGE_KEY = "scoutline-state-v2";
const APP_PASSWORD = "foci2026";
const ONLINE_MODE = location.protocol !== "file:";
const SHARED_KEYS = ["players", "reviews", "comments", "opinions"];
const SYNC_INTERVAL_MS = 3000;

const defaultState = {
  currentUser: "",
  currentRole: "",
  darkMode: false,
  players: [],
  reviews: [],
  comments: [],
  opinions: [],
  favorites: [],
};

let state = loadState();
let pendingPhoto = "";
let pendingEditPhoto = "";
let selectedProfileId = "";
let lastSharedSnapshot = "";
let isSyncing = false;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const authScreen = $("#authScreen");
const setupScreen = $("#setupScreen");
const appScreen = $("#appScreen");
const bottomNav = $("#bottomNav");

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const loaded = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(defaultState));
  const normalized = { ...defaultState, ...loaded };
  normalized.players = (normalized.players || []).filter((player) => player.owner);
  const playerIds = new Set(normalized.players.map((player) => player.id));
  normalized.reviews = (normalized.reviews || []).filter((review) => playerIds.has(review.playerId));
  normalized.comments = normalized.comments || [];
  normalized.opinions = (normalized.opinions || []).filter((opinion) => playerIds.has(opinion.playerId));
  normalized.favorites = (normalized.favorites || []).filter((id) => playerIds.has(id));
  if (normalized.currentUser && !normalized.currentRole) {
    normalized.currentRole = normalized.players.some((player) => player.owner === normalized.currentUser) ? "player" : "scout";
  }
  return normalized;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  saveSharedState();
}

function saveLocalOnly() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sharedPayload() {
  return SHARED_KEYS.reduce((payload, key) => {
    payload[key] = state[key] || [];
    return payload;
  }, {});
}

async function loadSharedState() {
  if (!ONLINE_MODE || isSyncing) return;
  isSyncing = true;

  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) return;
    const shared = await response.json();
    const nextSnapshot = JSON.stringify(sharedPayloadFrom(shared));
    if (nextSnapshot === lastSharedSnapshot) return;

    SHARED_KEYS.forEach((key) => {
      state[key] = shared[key] || [];
    });
    lastSharedSnapshot = nextSnapshot;
    saveLocalOnly();
    if (state.currentUser) {
      renderAll();
    }
  } catch (error) {
    console.warn("Online adatok betöltése nem sikerült.", error);
  } finally {
    isSyncing = false;
  }
}

async function saveSharedState() {
  if (!ONLINE_MODE) return;
  const snapshot = JSON.stringify(sharedPayload());

  try {
    await fetch("/api/state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-password": APP_PASSWORD,
      },
      body: snapshot,
    });
    lastSharedSnapshot = snapshot;
  } catch (error) {
    console.warn("Online mentés nem sikerült.", error);
  }
}

function sharedPayloadFrom(source) {
  return SHARED_KEYS.reduce((payload, key) => {
    payload[key] = source[key] || [];
    return payload;
  }, {});
}

function getMyPlayer() {
  return state.players.find((player) => player.owner === state.currentUser);
}

function averageFor(playerId) {
  const reviews = state.reviews.filter((review) => review.playerId === playerId);
  if (!reviews.length) return 0;
  return reviews.reduce((sum, review) => sum + Number(review.score), 0) / reviews.length;
}

function votesFor(playerId) {
  return state.reviews.filter((review) => review.playerId === playerId).length;
}

function showScreen() {
  document.body.classList.toggle("dark", state.darkMode);
  $("#themeToggle").textContent = state.darkMode ? "Világos" : "Sötét";

  if (!state.currentUser) {
    authScreen.classList.remove("hidden");
    setupScreen.classList.add("hidden");
    appScreen.classList.add("hidden");
    bottomNav.classList.add("hidden");
    return;
  }

  if (state.currentRole === "player" && !getMyPlayer()) {
    authScreen.classList.add("hidden");
    setupScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
    bottomNav.classList.add("hidden");
    return;
  }

  authScreen.classList.add("hidden");
  setupScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
  bottomNav.classList.remove("hidden");
  $("#welcomeName").textContent = `Szia, ${state.currentUser}`;
  const isPlayer = state.currentRole === "player";
  $$(".player-only").forEach((item) => item.classList.toggle("hidden", !isPlayer));
  $("#scoutHomePanel").classList.toggle("hidden", isPlayer);
  renderAll();
}

function renderAll() {
  renderFeatured();
  renderNextMatchForm();
  renderScoutInfoForm();
  renderSearchResults();
  renderRanking();
  renderFavorites();
  renderMatch();
  renderEditForm();
  renderOwnOpinions();
  renderProfileDetail();
}

function renderFeatured() {
  const player = getMyPlayer();
  if (!player) return;

  const stats = player.stats;
  $("#featuredPlayer").innerHTML = `
    <img class="player-photo" src="${player.photo}" alt="${player.name}">
    <div>
      <p class="eyebrow">${player.team} • ${player.position}</p>
      <h2>${player.name}</h2>
      <p class="muted">${player.age} éves játékos</p>
      <span class="rating-badge">★ ${averageFor(player.id).toFixed(1)} • ${votesFor(player.id)} szavazat</span>
      ${injurySummary(player)}
      ${player.nextMatch ? `<p class="muted">Következő meccs: ${player.nextMatch.date} ${player.nextMatch.time}, ${player.nextMatch.opponent}</p>` : ""}
      ${player.scoutInfo ? `<p class="muted">${player.scoutInfo}</p>` : ""}
    </div>
  `;
  $("#quickStats").innerHTML = [
    ["Meccsek", stats.matches],
    ["Gólok", stats.goals],
    ["Gólpasszok", stats.assists],
    ["Sárga", stats.yellowCards],
    ["Piros", stats.redCards],
    ["Öngólok", stats.ownGoals],
  ].map(([label, value]) => `<div class="stat-tile"><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function reviewTemplate(review) {
  const player = state.players.find((item) => item.id === review.playerId);
  const isTop = Number(review.score) >= 9;
  return `
    <article class="review ${isTop ? "top" : ""}">
      <div class="review-head">
        <strong>${player ? player.name : "Játékos"}</strong>
        <span class="review-score">${review.score}/10</span>
      </div>
      <p class="muted">${review.reason}</p>
      ${isTop ? '<p class="eyebrow">Kiemelt értékelés</p>' : ""}
    </article>
  `;
}

function renderNextMatchForm() {
  const player = getMyPlayer();
  if (!player) return;

  const nextMatch = player.nextMatch || {};
  $("#nextMatchDate").value = nextMatch.date || "";
  $("#nextMatchTime").value = nextMatch.time || "";
  $("#nextMatchOpponent").value = nextMatch.opponent || "";
  $("#nextMatchLocation").value = nextMatch.location || "";
}

function injurySummary(player) {
  if (!player.injury || player.injury.status !== "yes") return "";
  const details = [
    player.injury.type,
    player.injury.since ? `${player.injury.since} óta` : "",
    player.injury.returnDate ? `várható felépülés: ${player.injury.returnDate}` : "",
  ].filter(Boolean).join(" • ");
  return `<p class="muted">Sérült: ${details || "igen"}</p>`;
}

function renderScoutInfoForm() {
  const player = getMyPlayer();
  if (!player) return;
  $("#scoutInfoText").value = player.scoutInfo || "";
}

function renderSearchResults() {
  const name = $("#searchName").value.trim().toLowerCase();
  const team = $("#searchTeam").value.trim().toLowerCase();
  const position = $("#searchPosition").value;
  const age = $("#searchAge").value;
  const results = state.players.filter((player) => {
    return (!name || player.name.toLowerCase().includes(name))
      && (!team || player.team.toLowerCase().includes(team))
      && (!position || player.position === position)
      && (!age || String(player.age) === age);
  });
  $("#playerResults").innerHTML = results.map(playerCard).join("") || emptyText("Nincs találat.");
}

function renderRanking() {
  const ranked = [...state.players].sort((a, b) => averageFor(b.id) - averageFor(a.id));
  $("#rankingList").innerHTML = ranked.map((player, index) => playerCard(player, index + 1)).join("") || emptyText("Még nincs ranglista, mert nincs létrehozott játékos.");
}

function renderFavorites() {
  const favorites = state.players.filter((player) => state.favorites.includes(player.id));
  $("#favoritesList").innerHTML = favorites.map(playerCard).join("") || emptyText("Még nincs kedvenc játékos.");
}

function playerCard(player, rank = "") {
  const favorite = state.favorites.includes(player.id);
  return `
    <article class="player-card" data-open-profile="${player.id}">
      <div class="player-main">
        <img src="${player.photo}" alt="${player.name}">
        <div>
          <p class="eyebrow">${rank ? `${rank}. hely • ` : ""}${player.position}</p>
          <h3>${player.name}</h3>
          <p class="muted">${player.team}, ${player.age} éves • ★ ${averageFor(player.id).toFixed(1)}</p>
        </div>
      </div>
      <button class="favorite-button" data-favorite="${player.id}" type="button">${favorite ? "★" : "☆"}</button>
    </article>
  `;
}

function renderProfileDetail() {
  const player = state.players.find((item) => item.id === selectedProfileId);
  if (!player || !$("#profileDetailHero")) {
    $("#profileDetailHero").innerHTML = "";
    $("#profileDetailStats").innerHTML = "";
    $("#profileNextMatch").innerHTML = "";
    $("#profileScoutInfo").innerHTML = "";
    $("#profileOpinionList").innerHTML = emptyText("Válassz ki egy játékost a profil megnyitásához.");
    $("#profileOpinionCount").textContent = "";
    return;
  }

  $("#profileDetailHero").innerHTML = `
    <img class="player-photo" src="${player.photo}" alt="${player.name}">
    <div>
      <p class="eyebrow">${player.team} • ${player.position}</p>
      <h2>${player.name}</h2>
      <p class="muted">${player.age} éves játékos</p>
      <span class="rating-badge">★ ${averageFor(player.id).toFixed(1)} • ${votesFor(player.id)} szavazat</span>
      ${injurySummary(player)}
      ${player.scoutInfo ? `<p class="muted">${player.scoutInfo}</p>` : ""}
    </div>
  `;

  $("#profileDetailStats").innerHTML = [
    ["Meccsek", player.stats.matches],
    ["Gólok", player.stats.goals],
    ["Gólpasszok", player.stats.assists],
    ["Sárga", player.stats.yellowCards],
    ["Piros", player.stats.redCards],
    ["Öngólok", player.stats.ownGoals],
  ].map(([label, value]) => `<div class="stat-tile"><strong>${value}</strong><span>${label}</span></div>`).join("");

  $("#profileNextMatch").innerHTML = player.nextMatch ? `
      <div class="panel">
        <p class="eyebrow">Következő meccs</p>
        <h3>${player.nextMatch.opponent}</h3>
        <p class="muted">${player.nextMatch.date} • ${player.nextMatch.time} • ${player.nextMatch.location}</p>
      </div>
    ` : "";

  $("#profileScoutInfo").innerHTML = player.scoutInfo ? `
      <div class="panel">
        <p class="eyebrow">Játékosmegfigyelőknek</p>
        <h3>Információk a játékosról</h3>
        <p class="muted">${player.scoutInfo}</p>
      </div>
    ` : "";

  const opinions = state.opinions.filter((opinion) => opinion.playerId === player.id).reverse();
  $("#profileOpinionForm").dataset.playerId = player.id;
  $("#profileOpinionCount").textContent = `${opinions.length} vélemény`;
  $("#profileOpinionList").innerHTML = opinions.map((opinion) => `
    <article class="review">
      <div class="review-head">
        <strong>${opinion.user}</strong>
        <span class="review-score">${opinion.score || "-"}/10</span>
      </div>
      <p class="muted">${opinion.text}</p>
    </article>
  `).join("") || emptyText("Még nincs vélemény erről a játékosról.");
}

function renderOwnOpinions() {
  const player = getMyPlayer();
  if (!player) return;

  const opinions = state.opinions.filter((opinion) => opinion.playerId === player.id).reverse();
  const panel = $("#ownOpinionsPanel");

  if (!opinions.length) {
    panel.classList.add("hidden");
    $("#ownOpinionList").innerHTML = "";
    $("#ownOpinionCount").textContent = "";
    return;
  }

  panel.classList.remove("hidden");
  $("#ownOpinionCount").textContent = `${opinions.length} vélemény`;
  $("#ownOpinionList").innerHTML = opinions.map((opinion) => `
    <article class="review">
      <div class="review-head">
        <strong>${opinion.user}</strong>
        <span class="review-score">${opinion.score || "-"}/10</span>
      </div>
      <p class="muted">${opinion.text}</p>
    </article>
  `).join("");
}

function renderMatch() {
  const player = getMyPlayer();
  if (!player) return;

  const matchId = `match-${player.id}-latest`;
  const reviews = state.reviews.filter((review) => review.matchId === matchId);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.score), 0) / reviews.length : 0;
  const alreadyRated = state.reviews.some((review) => review.matchId === matchId && review.user === state.currentUser);

  $("#matchTitle").textContent = `${player.name} • legutóbbi meccs`;
  $("#matchAverage").textContent = reviews.length ? `★ ${average.toFixed(1)}` : "Nincs értékelés";
  $("#allVotes").textContent = `${reviews.length} szavazat`;
  $("#matchReviews").innerHTML = reviews.map(reviewTemplate).join("") || emptyText("Erre a meccsre még nincs értékelés.");
  renderComments(matchId);
  $("#ratingForm").dataset.matchId = matchId;
  $("#ratingForm").dataset.playerId = player.id;
  $("#commentForm").dataset.matchId = matchId;
  $("#ratingForm").querySelector("button").disabled = alreadyRated;
  $("#ratingNote").textContent = alreadyRated
    ? "Ezt a meccset már értékelted."
    : "Egy felhasználó csak egyszer értékelhet egy meccset.";
}

function renderComments(matchId) {
  const comments = (state.comments || []).filter((comment) => comment.matchId === matchId).reverse();
  $("#commentCount").textContent = `${comments.length} komment`;
  $("#commentList").innerHTML = comments.map((comment) => `
    <article class="review">
      <div class="review-head">
        <strong>${comment.user}</strong>
      </div>
      <p class="muted">${comment.text}</p>
    </article>
  `).join("") || emptyText("Még nincs komment ehhez a meccshez.");
}

function renderEditForm() {
  const player = getMyPlayer();
  if (!player) return;

  $("#editPlayerName").value = player.name;
  $("#editPlayerAge").value = player.age;
  $("#editPlayerTeam").value = player.team;
  $("#editPlayerPosition").value = player.position;
  $("#editInjuryStatus").value = player.injury?.status || "no";
  $("#editInjuryType").value = player.injury?.type || "";
  $("#editInjurySince").value = player.injury?.since || "";
  $("#editInjuryReturn").value = player.injury?.returnDate || "";
  $("#editMatches").value = player.stats.matches;
  $("#editGoals").value = player.stats.goals;
  $("#editAssists").value = player.stats.assists;
  $("#editYellowCards").value = player.stats.yellowCards;
  $("#editRedCards").value = player.stats.redCards;
  $("#editOwnGoals").value = player.stats.ownGoals;
  $("#editPhotoPreview").innerHTML = `<img src="${pendingEditPhoto || player.photo}" alt="${player.name} fotója">`;
}

function emptyText(text) {
  return `<p class="muted">${text}</p>`;
}

function hasBadWord(text) {
  const blockedWords = [
    "bazdmeg",
    "baszdmeg",
    "geci",
    "kurva",
    "picsa",
    "fasz",
    "szar",
  ];
  const normalized = text.toLowerCase();
  return blockedWords.some((word) => normalized.includes(word));
}

$("#playerPhoto").addEventListener("change", (event) => {
  const file = event.target.files[0];
  pendingPhoto = "";

  if (!file) {
    $("#photoPreview").innerHTML = "<span>Nincs kiválasztott kép</span>";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    pendingPhoto = reader.result;
    $("#photoPreview").innerHTML = `<img src="${pendingPhoto}" alt="Feltöltött játékosfotó előnézete">`;
  });
  reader.readAsDataURL(file);
});

$("#editPlayerPhoto").addEventListener("change", (event) => {
  const file = event.target.files[0];
  pendingEditPhoto = "";

  if (!file) {
    renderEditForm();
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    pendingEditPhoto = reader.result;
    $("#editPhotoPreview").innerHTML = `<img src="${pendingEditPhoto}" alt="Új játékosfotó előnézete">`;
  });
  reader.readAsDataURL(file);
});

$("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if ($("#loginPassword").value !== APP_PASSWORD) {
    $("#authNote").textContent = "Hibás jelszó.";
    return;
  }

  state.currentUser = $("#loginName").value.trim();
  state.currentRole = $("#loginRole").value;
  saveState();
  showScreen();
});

$("#playerForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!event.currentTarget.checkValidity()) return;
  if (!pendingPhoto) {
    $("#formNote").textContent = "A profil közzétételéhez játékosfotót is fel kell tölteni.";
    return;
  }

  const player = {
    id: `p-${Date.now()}`,
    owner: state.currentUser,
    name: $("#playerName").value.trim(),
    age: Number($("#playerAge").value),
    team: $("#playerTeam").value.trim(),
    position: $("#playerPosition").value,
    photo: pendingPhoto,
    scoutInfo: "",
    injury: {
      status: $("#injuryStatus").value,
      type: $("#injuryType").value.trim(),
      since: $("#injurySince").value.trim(),
      returnDate: $("#injuryReturn").value.trim(),
    },
    stats: {
      matches: Number($("#matches").value),
      goals: Number($("#goals").value),
      assists: Number($("#assists").value),
      yellowCards: Number($("#yellowCards").value),
      redCards: Number($("#redCards").value),
      ownGoals: Number($("#ownGoals").value),
    },
  };

  state.players.push(player);
  pendingPhoto = "";
  saveState();
  showScreen();
});

$("#editPlayerForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!event.currentTarget.checkValidity()) return;

  const player = getMyPlayer();
  if (!player) return;

  player.name = $("#editPlayerName").value.trim();
  player.age = Number($("#editPlayerAge").value);
  player.team = $("#editPlayerTeam").value.trim();
  player.position = $("#editPlayerPosition").value;
  player.photo = pendingEditPhoto || player.photo;
  player.injury = {
    status: $("#editInjuryStatus").value,
    type: $("#editInjuryType").value.trim(),
    since: $("#editInjurySince").value.trim(),
    returnDate: $("#editInjuryReturn").value.trim(),
  };
  player.stats = {
    matches: Number($("#editMatches").value),
    goals: Number($("#editGoals").value),
    assists: Number($("#editAssists").value),
    yellowCards: Number($("#editYellowCards").value),
    redCards: Number($("#editRedCards").value),
    ownGoals: Number($("#editOwnGoals").value),
  };

  pendingEditPhoto = "";
  $("#editPlayerPhoto").value = "";
  $("#editFormNote").textContent = "Mentve.";
  saveState();
  renderAll();
});

$("#nextMatchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!event.currentTarget.checkValidity()) return;

  const player = getMyPlayer();
  if (!player) return;

  player.nextMatch = {
    date: $("#nextMatchDate").value,
    time: $("#nextMatchTime").value,
    opponent: $("#nextMatchOpponent").value.trim(),
    location: $("#nextMatchLocation").value.trim(),
  };

  $("#nextMatchNote").textContent = "Következő meccs mentve.";
  saveState();
  renderAll();
});

$("#scoutInfoForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const player = getMyPlayer();
  const text = $("#scoutInfoText").value.trim();
  if (!player || !text) return;

  if (hasBadWord(text)) {
    $("#scoutInfoNote").textContent = "Ezt nem lehet menteni, mert csúnya szót tartalmaz.";
    return;
  }

  player.scoutInfo = text;
  $("#scoutInfoNote").textContent = "Információk mentve.";
  saveState();
  renderAll();
});

$("#deleteProfileButton").addEventListener("click", () => {
  const player = getMyPlayer();
  if (!player) return;
  const confirmed = confirm("Biztosan törlöd a profilodat? Ez az értékeléseket és kommenteket is eltávolítja.");
  if (!confirmed) return;

  const matchId = `match-${player.id}-latest`;
  state.players = state.players.filter((item) => item.id !== player.id);
  state.reviews = state.reviews.filter((review) => review.playerId !== player.id);
  state.comments = state.comments.filter((comment) => comment.matchId !== matchId);
  state.opinions = state.opinions.filter((opinion) => opinion.playerId !== player.id);
  state.favorites = state.favorites.filter((id) => id !== player.id);
  state.currentUser = "";
  pendingPhoto = "";
  pendingEditPhoto = "";
  saveState();
  showScreen();
});

$("#ratingScore").addEventListener("input", (event) => {
  $("#scoreValue").textContent = event.target.value;
});

$("#profileOpinionScore").addEventListener("input", (event) => {
  $("#profileOpinionScoreValue").textContent = event.target.value;
});

$("#ratingForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const matchId = form.dataset.matchId;
  const playerId = form.dataset.playerId;
  const alreadyRated = state.reviews.some((review) => review.matchId === matchId && review.user === state.currentUser);
  const reason = $("#ratingReason").value.trim();

  if (alreadyRated || !reason || hasBadWord(reason)) return;

  state.reviews.push({
    id: `r-${Date.now()}`,
    matchId,
    playerId,
    user: state.currentUser,
    score: Number($("#ratingScore").value),
    reason,
  });
  $("#ratingReason").value = "";
  saveState();
  renderAll();
});

$("#commentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = $("#commentText").value.trim();
  if (!text || hasBadWord(text)) return;

  state.comments.push({
    id: `c-${Date.now()}`,
    matchId: event.currentTarget.dataset.matchId,
    user: state.currentUser,
    text,
  });
  $("#commentText").value = "";
  saveState();
  renderAll();
});

$("#profileOpinionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const playerId = event.currentTarget.dataset.playerId;
  const text = $("#profileOpinionText").value.trim();
  if (!playerId || !text || hasBadWord(text)) return;

  state.opinions.push({
    id: `o-${Date.now()}`,
    playerId,
    user: state.currentUser,
    score: Number($("#profileOpinionScore").value),
    text,
  });
  $("#profileOpinionText").value = "";
  $("#profileOpinionScore").value = 8;
  $("#profileOpinionScoreValue").textContent = "8";
  saveState();
  renderAll();
});

$("#themeToggle").addEventListener("click", () => {
  state.darkMode = !state.darkMode;
  saveState();
  showScreen();
});

$("#logoutButton").addEventListener("click", logout);
$("#logoutFromSetup").addEventListener("click", logout);

function logout() {
  state.currentUser = "";
  state.currentRole = "";
  saveState();
  showScreen();
}

function openView(viewName) {
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.target === viewName));
  $$(".view").forEach((view) => view.classList.toggle("active", view.dataset.view === viewName));
  renderAll();
}

bottomNav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-target]");
  if (!button) return;
  openView(button.dataset.target);
});

appScreen.addEventListener("click", (event) => {
  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) {
    const playerId = favoriteButton.dataset.favorite;
    state.favorites = state.favorites.includes(playerId)
      ? state.favorites.filter((id) => id !== playerId)
      : [...state.favorites, playerId];
    saveState();
    renderAll();
    return;
  }

  const profileCard = event.target.closest("[data-open-profile]");
  if (!profileCard) return;
  selectedProfileId = profileCard.dataset.openProfile;
  openView("profile");
});

$("#backToSearchButton").addEventListener("click", () => {
  openView("search");
});

["#searchName", "#searchTeam", "#searchPosition", "#searchAge"].forEach((selector) => {
  $(selector).addEventListener("input", renderSearchResults);
});

showScreen();
loadSharedState();
if (ONLINE_MODE) {
  setInterval(loadSharedState, SYNC_INTERVAL_MS);
}
