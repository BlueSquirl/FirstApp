const contractData = [
  {
    id: "c1",
    title: "I-75 Resurfacing and Bridge Repair",
    agency: "Ohio DOT District 8",
    source: "CivCast",
    category: "Transportation",
    location: "Cincinnati, OH",
    lat: 39.1031,
    lng: -84.512,
    value: 12400000,
    dueDate: "2026-03-15",
    postedDate: "2026-02-01",
    contact: "bid@dot.ohio.gov",
    url: "https://www.transportation.ohio.gov/",
  },
  {
    id: "c2",
    title: "Water Treatment Plant Upgrade - Phase 2",
    agency: "Des Moines Water Works",
    source: "Bonfire",
    category: "Water",
    location: "Des Moines, IA",
    lat: 41.5868,
    lng: -93.625,
    value: 8200000,
    dueDate: "2026-02-28",
    postedDate: "2026-01-25",
    contact: "procurement@dmww.com",
    url: "https://www.dmww.com/",
  },
  {
    id: "c3",
    title: "Municipal Stormwater Improvements Package B",
    agency: "City of Raleigh Engineering",
    source: "CivCast",
    category: "Municipal",
    location: "Raleigh, NC",
    lat: 35.7796,
    lng: -78.6382,
    value: 5100000,
    dueDate: "2026-03-08",
    postedDate: "2026-01-30",
    contact: "bids@raleighnc.gov",
    url: "https://raleighnc.gov/",
  },
  {
    id: "c4",
    title: "Airport Taxiway Rehabilitation",
    agency: "Boise Airport Authority",
    source: "SAM.gov",
    category: "Federal",
    location: "Boise, ID",
    lat: 43.615,
    lng: -116.2023,
    value: 3400000,
    dueDate: "2026-04-02",
    postedDate: "2026-02-02",
    contact: "contracting@flyboise.com",
    url: "https://sam.gov/",
  },
  {
    id: "c5",
    title: "Transit Center Electrical Modernization",
    agency: "Valley Metro",
    source: "Bonfire",
    category: "Energy",
    location: "Phoenix, AZ",
    lat: 33.4484,
    lng: -112.074,
    value: 2200000,
    dueDate: "2026-03-21",
    postedDate: "2026-02-01",
    contact: "bids@valleymetro.org",
    url: "https://www.valleymetro.org/",
  },
  {
    id: "c6",
    title: "County Bridge 142 Replacement",
    agency: "Larimer County",
    source: "CivCast",
    category: "Transportation",
    location: "Fort Collins, CO",
    lat: 40.5853,
    lng: -105.0844,
    value: 4800000,
    dueDate: "2026-03-12",
    postedDate: "2026-01-27",
    contact: "purchasing@larimer.org",
    url: "https://www.larimer.gov/",
  },
  {
    id: "c7",
    title: "Harbor Dredging and Dock Repair",
    agency: "Savannah Port Authority",
    source: "SAM.gov",
    category: "Federal",
    location: "Savannah, GA",
    lat: 32.0809,
    lng: -81.0912,
    value: 6500000,
    dueDate: "2026-04-10",
    postedDate: "2026-02-03",
    contact: "contracts@georgiaports.com",
    url: "https://sam.gov/",
  },
  {
    id: "c8",
    title: "School District HVAC Replacement",
    agency: "Newark Public Schools",
    source: "Bonfire",
    category: "Municipal",
    location: "Newark, NJ",
    lat: 40.7357,
    lng: -74.1724,
    value: 1600000,
    dueDate: "2026-03-05",
    postedDate: "2026-01-22",
    contact: "facilities@newark.k12.nj.us",
    url: "https://www.nps.k12.nj.us/",
  },
];

const allSources = ["CivCast", "Bonfire", "SAM.gov"];
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const elements = {
  searchInput: document.getElementById("searchInput"),
  categorySelect: document.getElementById("categorySelect"),
  minValue: document.getElementById("minValue"),
  maxValue: document.getElementById("maxValue"),
  dueBy: document.getElementById("dueBy"),
  sortSelect: document.getElementById("sortSelect"),
  resetFilters: document.getElementById("resetFilters"),
  resultsList: document.getElementById("resultsList"),
  resultsCount: document.getElementById("resultsCount"),
  emptyState: document.getElementById("emptyState"),
  filtersToggle: document.getElementById("filtersToggle"),
  resultsToggle: document.getElementById("resultsToggle"),
  filtersPanel: document.getElementById("filtersPanel"),
  resultsPanel: document.getElementById("resultsPanel"),
  favoritesPanel: document.getElementById("favoritesPanel"),
  settingsPanel: document.getElementById("settingsPanel"),
  favoritesList: document.getElementById("favoritesList"),
  favoritesCount: document.getElementById("favoritesCount"),
  favoritesEmpty: document.getElementById("favoritesEmpty"),
  favoritesLocked: document.getElementById("favoritesLocked"),
  favoritesUpgradeBtn: document.getElementById("favoritesUpgradeBtn"),
  favoritesBadge: document.getElementById("favoritesBadge"),
  showPricesToggle: document.getElementById("showPricesToggle"),
  autoOpenResultsToggle: document.getElementById("autoOpenResultsToggle"),
  mapTab: document.querySelector('.tab-button[data-tab="map"]'),
  favoritesTab: document.querySelector('.tab-button[data-tab="favorites"]'),
  settingsTab: document.querySelector('.tab-button[data-tab="settings"]'),
  mapControls: document.querySelector(".map-controls"),
  mapPane: document.querySelector(".map-pane"),
};

const map = L.map("map", { scrollWheelZoom: true }).setView([39.5, -98.35], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);
const markersLayer = L.layerGroup().addTo(map);
const markersById = new Map();
let activePanel = null;
let favoriteIds = new Set();
let lockedJobIds = new Set();

function updatePanels() {
  const isFiltersOpen = activePanel === "filters";
  const isResultsOpen = activePanel === "results";
  const isFavoritesOpen = activePanel === "favorites";
  const isSettingsOpen = activePanel === "settings";
  const activeTab =
    activePanel === "favorites"
      ? "favorites"
      : activePanel === "settings"
        ? "settings"
        : "map";

  elements.filtersPanel.classList.toggle("is-open", isFiltersOpen);
  elements.resultsPanel.classList.toggle("is-open", isResultsOpen);
  elements.favoritesPanel.classList.toggle("is-open", isFavoritesOpen);
  elements.settingsPanel.classList.toggle("is-open", isSettingsOpen);
  elements.filtersToggle.classList.toggle("active", isFiltersOpen);
  elements.resultsToggle.classList.toggle("active", isResultsOpen);
  elements.filtersPanel.setAttribute("aria-hidden", String(!isFiltersOpen));
  elements.resultsPanel.setAttribute("aria-hidden", String(!isResultsOpen));
  elements.favoritesPanel.setAttribute("aria-hidden", String(!isFavoritesOpen));
  elements.settingsPanel.setAttribute("aria-hidden", String(!isSettingsOpen));
  elements.mapControls.classList.toggle("hidden", activeTab !== "map");
  elements.mapTab.classList.toggle("active", activeTab === "map");
  elements.favoritesTab.classList.toggle("active", activeTab === "favorites");
  elements.settingsTab.classList.toggle("active", activeTab === "settings");
}

function togglePanel(panel) {
  activePanel = activePanel === panel ? null : panel;
  updatePanels();
}

function formatValue(value) {
  return currencyFormatter.format(value);
}

function formatShortValue(value) {
  if (value >= 1_000_000_000) {
    const compact = value / 1_000_000_000;
    const digits = compact >= 100 ? 0 : 1;
    return `$${compact.toFixed(digits)}B`;
  }
  if (value >= 1_000_000) {
    const compact = value / 1_000_000;
    const digits = compact >= 100 ? 0 : 1;
    return `$${compact.toFixed(digits)}M`;
  }
  if (value >= 1_000) {
    const compact = value / 1_000;
    const digits = compact >= 100 ? 0 : 1;
    return `$${compact.toFixed(digits)}K`;
  }
  return `$${value.toLocaleString("en-US")}`;
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function favoriteButtonHTML(isFavorite, label = "Add to favorites") {
  return `
    <button
      class="favorite-btn icon-only ${isFavorite ? "active" : ""}"
      data-action="favorite"
      type="button"
      aria-pressed="${isFavorite}"
      aria-label="${label}"
      title="${label}"
    >
      <svg class="star-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12 3.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.48L12 18.98l-5.8 3.4 1.11-6.48-4.7-4.58 6.49-.94L12 3.5z"
        />
      </svg>
    </button>
  `;
}

function favoriteIndicatorHTML(isFavorite) {
  if (!isFavorite) {
    return "";
  }
  return `
    <span class="price-star" aria-label="Favorited" title="Favorited">
      <svg class="star-icon filled" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12 3.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.48L12 18.98l-5.8 3.4 1.11-6.48-4.7-4.58 6.49-.94L12 3.5z"
        />
      </svg>
    </span>
  `;
}

function truncateTitle(title, maxLength = 30) {
  if (!title || title.length <= maxLength) {
    return title;
  }
  return `${title.slice(0, Math.max(0, maxLength - 3))}...`;
}

function getCurrentUserId() {
  const user = Auth.getCurrentUser();
  return user ? user.userId : null;
}

function refreshFavoriteIds() {
  const userId = getCurrentUserId();
  favoriteIds = new Set(Favorites.getFavorites(userId));
}

function isJobLocked(index, isPremium) {
  return !isPremium && index >= 3;
}

function updateFavoritesBadge() {
  const userId = getCurrentUserId();
  const count = userId ? Favorites.getFavorites(userId).length : 0;
  elements.favoritesBadge.textContent = count;
  elements.favoritesBadge.classList.remove("hidden");
}

function getFilters() {
  const selectedSources = Array.from(
    document.querySelectorAll('input[name="source"]:checked')
  ).map((input) => input.value);
  const sources = selectedSources.length ? selectedSources : allSources;
  const minValue = Number(elements.minValue.value);
  const maxValue = Number(elements.maxValue.value);
  const dueByValue = elements.dueBy.value;

  return {
    search: elements.searchInput.value.trim().toLowerCase(),
    sources,
    category: elements.categorySelect.value,
    minValue: Number.isFinite(minValue) && minValue > 0 ? minValue : 0,
    maxValue: Number.isFinite(maxValue) && maxValue > 0 ? maxValue : Infinity,
    dueBy: dueByValue ? new Date(dueByValue) : null,
    sortBy: elements.sortSelect.value,
  };
}

function matchesFilters(contract, filters) {
  if (!filters.sources.includes(contract.source)) {
    return false;
  }

  if (filters.category !== "all" && contract.category !== filters.category) {
    return false;
  }

  if (contract.value < filters.minValue || contract.value > filters.maxValue) {
    return false;
  }

  if (filters.dueBy) {
    const contractDue = new Date(contract.dueDate);
    if (contractDue > filters.dueBy) {
      return false;
    }
  }

  if (filters.search) {
    const haystack = `${contract.title} ${contract.agency} ${contract.location}`.toLowerCase();
    if (!haystack.includes(filters.search)) {
      return false;
    }
  }

  return true;
}

function toggleFavorite(contractId) {
  if (!Auth.requirePremium()) {
    return;
  }
  const userId = getCurrentUserId();
  if (!userId) {
    return;
  }
  Favorites.toggleFavorite(userId, contractId);
  refreshFavoriteIds();
}

function renderFavorites() {
  const isPremium = Auth.isUserSubscribed();
  const userId = getCurrentUserId();
  const favoriteIdsForUser = isPremium && userId ? Favorites.getFavorites(userId) : [];
  const favorites = contractData.filter((contract) =>
    favoriteIdsForUser.includes(contract.id)
  );

  elements.favoritesList.innerHTML = "";
  elements.favoritesLocked.classList.toggle("hidden", isPremium);
  elements.favoritesUpgradeBtn.classList.toggle("hidden", isPremium);
  elements.favoritesCount.textContent = isPremium ? `${favorites.length} saved` : "Premium";

  if (!isPremium) {
    elements.favoritesEmpty.classList.add("hidden");
    return;
  }

  favorites.forEach((contract) => {
    const isFavorite = favoriteIdsForUser.includes(contract.id);
    const truncatedTitle = truncateTitle(contract.title);
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.id = contract.id;
    card.innerHTML = `
      <div class="card-header">
        <div class="card-title-row">
          ${favoriteButtonHTML(true, "Remove from favorites")}
          <h3 title="${contract.title}">${truncatedTitle}</h3>
        </div>
        <span class="tag">${contract.source}</span>
      </div>
      <div class="card-details">
        <div><span>Agency:</span> ${contract.agency}</div>
        <div><span>Location:</span> ${contract.location}</div>
        <div><span>Value:</span> ${formatValue(contract.value)}${favoriteIndicatorHTML(isFavorite)}</div>
      </div>
      <div class="card-actions">
        <div class="card-meta">${contract.category}</div>
      </div>
    `;
    elements.favoritesList.appendChild(card);
  });

  elements.favoritesEmpty.classList.toggle("hidden", favorites.length > 0);
}

function sortResults(results, sortBy) {
  const sorted = [...results];
  switch (sortBy) {
    case "value_asc":
      sorted.sort((a, b) => a.value - b.value);
      break;
    case "due_soon":
      sorted.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      break;
    case "posted_recent":
      sorted.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
      break;
    case "value_desc":
    default:
      sorted.sort((a, b) => b.value - a.value);
      break;
  }
  return sorted;
}

function clearMarkers() {
  markersLayer.clearLayers();
  markersById.clear();
}

function createPriceIcon(value) {
  return L.divIcon({
    className: "price-pin",
    html: `<span class="pin-label">${formatShortValue(value)}</span>`,
    iconSize: [80, 36],
    iconAnchor: [40, 36],
    popupAnchor: [0, -30],
  });
}

function createPopupContent(contract, isLocked) {
  const contactLine = isLocked
    ? "<span>Contact:</span> 🔒 Premium only<br />"
    : `<span>Contact:</span> ${contract.contact}<br />`;
  return `
    <div class="popup">
      <strong>${contract.title}</strong><br />
      ${contract.location}<br />
      <span>Value:</span> ${formatValue(contract.value)}<br />
      <span>Due:</span> ${formatDate(contract.dueDate)}<br />
      ${contactLine}
      <a href="${contract.url}" target="_blank" rel="noopener noreferrer">View source</a>
    </div>
  `;
}

function highlightCard(contractId) {
  const cards = elements.resultsList.querySelectorAll(".card");
  cards.forEach((card) => {
    card.classList.toggle("active", card.dataset.id === contractId);
  });
  const activeCard = elements.resultsList.querySelector(`[data-id="${contractId}"]`);
  if (activeCard && elements.resultsPanel.classList.contains("is-open")) {
    activeCard.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }
}

function renderList(results) {
  elements.resultsList.innerHTML = "";
  const isPremium = Auth.isUserSubscribed();
  results.forEach((contract, index) => {
    const isFavorite = favoriteIds.has(contract.id);
    const locked = isJobLocked(index, isPremium);
    const favoriteLabel = isFavorite ? "Remove from favorites" : "Add to favorites";
    const truncatedTitle = truncateTitle(contract.title);
    const card = document.createElement("article");
    card.className = locked ? "card locked" : "card";
    card.dataset.id = contract.id;
    const detailsMarkup = locked
      ? `
        <div class="card-details locked-content" aria-hidden="true">
          <div><span>Agency:</span> [BLURRED]</div>
          <div><span>Location:</span> [BLURRED]</div>
          <div><span>Value:</span> [BLURRED]</div>
          <div><span>Due:</span> [BLURRED]</div>
        </div>
      `
      : `
        <div class="card-details">
          <div><span>Agency:</span> ${contract.agency}</div>
          <div><span>Location:</span> ${contract.location}</div>
          <div><span>Value:</span> ${formatValue(contract.value)}${favoriteIndicatorHTML(isFavorite)}</div>
          <div><span>Due:</span> ${formatDate(contract.dueDate)}</div>
        </div>
      `;
    const actionsMarkup = `
        <div class="card-actions ${locked ? "locked-content" : ""}" aria-hidden="${
      locked ? "true" : "false"
    }">
          <div class="card-meta">${contract.category}</div>
        </div>
      `;
    card.innerHTML = `
      <div class="card-header">
        <div class="card-title-row">
          ${favoriteButtonHTML(isFavorite, favoriteLabel)}
          <h3 title="${contract.title}">${truncatedTitle}</h3>
        </div>
        <span class="tag">${contract.source}</span>
      </div>
      ${detailsMarkup}
      ${actionsMarkup}
      ${
        locked
          ? `
        <div class="lock-overlay">
          <div>🔒 Unlock with Premium - $20/month</div>
          <button class="upgrade-cta" data-action="upgrade" type="button">Upgrade Now</button>
        </div>
      `
          : ""
      }
    `;
    elements.resultsList.appendChild(card);
  });
}

function renderMarkers(results) {
  clearMarkers();
  results.forEach((contract) => {
    const marker = L.marker([contract.lat, contract.lng], {
      icon: createPriceIcon(contract.value),
    }).addTo(markersLayer);
    marker.bindPopup(createPopupContent(contract, lockedJobIds.has(contract.id)));
    marker.on("click", () => highlightCard(contract.id));
    markersById.set(contract.id, marker);
  });
}

function focusOnContract(contractId) {
  const marker = markersById.get(contractId);
  if (marker) {
    map.setView(marker.getLatLng(), 10, { animate: true });
    marker.openPopup();
    highlightCard(contractId);
  }
}

function applyAutoOpenResults() {
  if (!elements.autoOpenResultsToggle.checked) {
    return;
  }
  if (activePanel === null) {
    activePanel = "results";
    updatePanels();
  }
}

function updateCounts(count) {
  elements.resultsCount.textContent = `${count} open`;
  elements.emptyState.classList.toggle("hidden", count > 0);
}

function render() {
  refreshFavoriteIds();
  const filters = getFilters();
  const filtered = contractData.filter((contract) => matchesFilters(contract, filters));
  const results = sortResults(filtered, filters.sortBy);
  const isPremium = Auth.isUserSubscribed();
  lockedJobIds = isPremium ? new Set() : new Set(results.slice(3).map((item) => item.id));

  renderList(results);
  renderMarkers(results);
  updateCounts(results.length);
  renderFavorites();
  updateFavoritesBadge();
  applyAutoOpenResults();
}

elements.resultsList.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (!card) {
    return;
  }
  if (card.classList.contains("locked")) {
    Auth.requirePremium();
    return;
  }

  const contractId = card.dataset.id;
  const button = event.target.closest("[data-action]");
  if (button && button.dataset.action === "favorite") {
    toggleFavorite(contractId);
    return;
  }
  focusOnContract(contractId);
});

elements.favoritesList.addEventListener("click", (event) => {
  if (!Auth.requirePremium()) {
    return;
  }

  const card = event.target.closest(".card");
  if (!card) {
    return;
  }

  const contractId = card.dataset.id;
  const button = event.target.closest("[data-action]");
  if (button && button.dataset.action === "favorite") {
    toggleFavorite(contractId);
    return;
  }
  focusOnContract(contractId);
});

elements.resetFilters.addEventListener("click", () => {
  elements.searchInput.value = "";
  elements.categorySelect.value = "all";
  elements.minValue.value = "";
  elements.maxValue.value = "";
  elements.dueBy.value = "";
  elements.sortSelect.value = "value_desc";
  document.querySelectorAll('input[name="source"]').forEach((input) => {
    input.checked = true;
  });
  render();
});

elements.filtersToggle.addEventListener("click", () => togglePanel("filters"));
elements.resultsToggle.addEventListener("click", () => togglePanel("results"));
elements.mapTab.addEventListener("click", () => {
  activePanel = null;
  updatePanels();
});
elements.favoritesTab.addEventListener("click", () => togglePanel("favorites"));
elements.settingsTab.addEventListener("click", () => togglePanel("settings"));
elements.showPricesToggle.addEventListener("change", () => {
  document.body.classList.toggle("hide-pin-labels", !elements.showPricesToggle.checked);
});
elements.autoOpenResultsToggle.addEventListener("change", () => {
  if (elements.autoOpenResultsToggle.checked && activePanel === null) {
    activePanel = "results";
    updatePanels();
  }
});

elements.favoritesUpgradeBtn.addEventListener("click", () => Auth.openUpgradeModal());
Auth.onAuthChange(() => {
  render();
});
Favorites.onChange(() => {
  render();
});

[
  elements.searchInput,
  elements.categorySelect,
  elements.minValue,
  elements.maxValue,
  elements.dueBy,
  elements.sortSelect,
  ...document.querySelectorAll('input[name="source"]'),
].forEach((input) => input.addEventListener("input", render));

document.body.classList.toggle("hide-pin-labels", !elements.showPricesToggle.checked);
Auth.initAuth();
updatePanels();
render();
