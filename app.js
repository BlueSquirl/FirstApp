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
};

const map = L.map("map", { scrollWheelZoom: true }).setView([39.5, -98.35], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);
const markersLayer = L.layerGroup().addTo(map);
const markersById = new Map();

function formatValue(value) {
  return currencyFormatter.format(value);
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

function createPopupContent(contract) {
  return `
    <div class="popup">
      <strong>${contract.title}</strong><br />
      ${contract.location}<br />
      <span>Value:</span> ${formatValue(contract.value)}<br />
      <span>Due:</span> ${formatDate(contract.dueDate)}<br />
      <span>Contact:</span> ${contract.contact}<br />
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
  if (activeCard) {
    activeCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function renderList(results) {
  elements.resultsList.innerHTML = "";
  results.forEach((contract) => {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.id = contract.id;
    card.innerHTML = `
      <div class="card-header">
        <h3>${contract.title}</h3>
        <span class="tag">${contract.source}</span>
      </div>
      <div class="card-details">
        <div><span>Agency:</span> ${contract.agency}</div>
        <div><span>Location:</span> ${contract.location}</div>
        <div><span>Value:</span> ${formatValue(contract.value)}</div>
        <div><span>Due:</span> ${formatDate(contract.dueDate)}</div>
      </div>
      <div class="card-actions">
        <div class="card-meta">${contract.category}</div>
        <button data-action="focus">View on map</button>
      </div>
    `;
    elements.resultsList.appendChild(card);
  });
}

function renderMarkers(results) {
  clearMarkers();
  results.forEach((contract) => {
    const marker = L.marker([contract.lat, contract.lng]).addTo(markersLayer);
    marker.bindPopup(createPopupContent(contract));
    marker.on("click", () => highlightCard(contract.id));
    markersById.set(contract.id, marker);
  });
}

function updateCounts(count) {
  elements.resultsCount.textContent = `${count} open`;
  elements.emptyState.classList.toggle("hidden", count > 0);
}

function render() {
  const filters = getFilters();
  const filtered = contractData.filter((contract) => matchesFilters(contract, filters));
  const results = sortResults(filtered, filters.sortBy);

  renderList(results);
  renderMarkers(results);
  updateCounts(results.length);
}

elements.resultsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='focus']");
  if (!button) {
    return;
  }

  const card = button.closest(".card");
  if (!card) {
    return;
  }

  const contractId = card.dataset.id;
  const marker = markersById.get(contractId);
  if (marker) {
    map.setView(marker.getLatLng(), 10, { animate: true });
    marker.openPopup();
    highlightCard(contractId);
  }
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

[
  elements.searchInput,
  elements.categorySelect,
  elements.minValue,
  elements.maxValue,
  elements.dueBy,
  elements.sortSelect,
  ...document.querySelectorAll('input[name="source"]'),
].forEach((input) => input.addEventListener("input", render));

render();
