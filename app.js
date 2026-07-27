const DATA_URL = "data/customers.json?ts=" + Date.now();
const STATUS_COLORS = {
  ATTIVO: "green",
  INATTIVO: "red",
  "STAND BY": "orange"
};

const els = {
  total: document.getElementById("totalCustomers"),
  active: document.getElementById("activeCustomers"),
  inactive: document.getElementById("inactiveCustomers"),
  standby: document.getElementById("standbyCustomers"),
  geo: document.getElementById("geoCustomers"),
  visible: document.getElementById("visibleCustomers"),
  search: document.getElementById("searchInput"),
  status: document.getElementById("statusFilter"),
  province: document.getElementById("provinceFilter"),
  city: document.getElementById("cityFilter"),
  reset: document.getElementById("resetFilters"),
  fitAll: document.getElementById("fitAllButton"),
  lastUpdated: document.getElementById("lastUpdated"),
  pill: document.getElementById("statusPill")
};

const map = L.map("map", { zoomControl: true, preferCanvas: true }).setView([42.5, 12.5], 6);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap"
}).addTo(map);

const clusterGroup = L.markerClusterGroup({
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  zoomToBoundsOnClick: true,
  maxClusterRadius: 42,
  disableClusteringAtZoom: 15
});
map.addLayer(clusterGroup);

let customers = [];
let filteredCustomers = [];
let markers = [];
let fitBoundsTimer = null;

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (m) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[m]));

function getField(row, keys, fallback = "") {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return fallback;
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getStatus(row) {
  return getField(row, ["status", "Status"], "ATTIVO").toUpperCase();
}

function getName(row) {
  return getField(row, ["Nome Locale", "nome_locale", "name", "Nome Cliente"], "Locale");
}

function getAddress(row) {
  return getField(row, ["VIA", "indirizzo", "Indirizzo cliente", "Address"], "");
}

function getCity(row) {
  return getField(row, ["col_9", "Comune", "city", "comune"], "");
}

function getProvince(row) {
  return getField(row, ["PROVINCIA", "Province", "province", "provincia"], "");
}

function getRegion(row) {
  return getField(row, ["REGIONE", "region", "Regione"], "");
}

function getPiva(row) {
  return getField(row, ["P.IVA", "piva", "vat", "partita_iva"], "");
}

function getSeats(row) {
  return getField(row, ["N° Sedi", "n_sedi", "sedi"], "1");
}

function buildSearchHaystack(row) {
  return [
    getName(row),
    getField(row, ["Nome Cliente", "nome_cliente"]),
    getField(row, ["Ragione sociale", "ragione_sociale"]),
    getAddress(row),
    getCity(row),
    getProvince(row),
    getRegion(row),
    getPiva(row)
  ].join(" ").toLowerCase();
}

function markerIcon(status) {
  const color = STATUS_COLORS[status] || "green";
  return L.divIcon({
    className: "pin-wrap",
    html: `<div class="pin ${color}"></div>`,
    iconSize: [22, 28],
    iconAnchor: [11, 27],
    popupAnchor: [0, -26]
  });
}

function googleMapsUrl(row) {
  const query = [getName(row), getAddress(row), getCity(row), getProvince(row)].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    els.pill.textContent = "Indirizzo copiato negli appunti";
    setTimeout(() => {
      els.pill.textContent = `${filteredCustomers.length} clienti visualizzati`;
    }, 1800);
  } catch {
    alert("Copia non disponibile in questo browser.");
  }
}

function popupHtml(row) {
  const status = getStatus(row);
  const name = getName(row);
  const address = getAddress(row);
  const city = getCity(row);
  const province = getProvince(row);
  const piva = getPiva(row);
  const seats = getSeats(row);
  const ragione = getField(row, ["Ragione sociale", "ragione_sociale"], "");
  const cliente = getField(row, ["Nome Cliente", "nome_cliente"], "");
  const region = getRegion(row);
  const fullAddress = [address, [city, province].filter(Boolean).join(" (").replace(/\($/, "")].filter(Boolean).join("<br>");
  const badgeColor = STATUS_COLORS[status] || "green";
  const badgeLabel = status || "ATTIVO";

  return `
    <div>
      <div class="popup-title">🍅 ${esc(name)}</div>
      ${address ? `<div class="popup-address">📍 ${esc(address)}</div>` : ""}
      <div class="popup-address">${esc(city)}${province ? ` (${esc(province)})` : ""}${region ? ` · ${esc(region)}` : ""}</div>
      <div class="popup-grid">
        ${cliente ? `<div class="popup-row"><span>Cliente</span><span>${esc(cliente)}</span></div>` : ""}
        ${ragione ? `<div class="popup-row"><span>Ragione sociale</span><span>${esc(ragione)}</span></div>` : ""}
        ${piva ? `<div class="popup-row"><span>P.IVA</span><span>${esc(piva)}</span></div>` : ""}
        <div class="popup-row"><span>Sedi</span><span>${esc(seats)}</span></div>
      </div>
      <div class="popup-badge" style="background:${badgeColor === 'green' ? 'rgba(22,163,74,.12)' : badgeColor === 'red' ? 'rgba(220,38,38,.12)' : 'rgba(249,115,22,.14)'}; color:${badgeColor === 'green' ? '#166534' : badgeColor === 'red' ? '#991b1b' : '#9a3412'};">
        ● ${esc(badgeLabel)}
      </div>
      <div class="popup-actions">
        <a class="primary" target="_blank" rel="noopener noreferrer" href="${googleMapsUrl(row)}">Apri su Google Maps</a>
        <button class="secondary" type="button" data-copy-address="${esc([address, city, province].filter(Boolean).join(', '))}">Copia indirizzo</button>
      </div>
    </div>
  `;
}

function bindPopupActions(popupNode) {
  popupNode.querySelectorAll("[data-copy-address]").forEach((btn) => {
    btn.addEventListener("click", () => copyText(btn.getAttribute("data-copy-address") || ""));
  });
}

function updateFiltersOptions(rows) {
  const statuses = [...new Set(rows.map(getStatus))].filter(Boolean).sort();
  const provinces = [...new Set(rows.map(getProvince))].filter(Boolean).sort();
  const cities = [...new Set(rows.map(getCity))].filter(Boolean).sort();

  const keepFirst = (select, values) => {
    const first = select.querySelector("option[value='']");
    select.innerHTML = "";
    if (first) select.append(first);
    values.forEach((v) => select.append(new Option(v, v)));
  };

  keepFirst(els.status, statuses);
  keepFirst(els.province, provinces);
  keepFirst(els.city, cities);
}

function applyFilters() {
  const q = normalizeText(els.search.value);
  const status = els.status.value;
  const province = els.province.value;
  const city = els.city.value;

  filteredCustomers = customers.filter((row) => {
    if (status && getStatus(row) !== status) return false;
    if (province && getProvince(row) !== province) return false;
    if (city && getCity(row) !== city) return false;
    if (q && !normalizeText(buildSearchHaystack(row)).includes(q)) return false;
    return Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lng));
  });

  renderMap();
}

function renderMap() {
  clusterGroup.clearLayers();
  markers = [];

  filteredCustomers.forEach((row) => {
    const lat = Number(row.lat);
    const lng = Number(row.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const marker = L.marker([lat, lng], {
      icon: markerIcon(getStatus(row)),
      title: getName(row)
    });

    const popup = marker.bindPopup(popupHtml(row), { maxWidth: 340, closeButton: true });
    popup.on("popupopen", (e) => {
      const node = e.popup.getElement();
      if (node) bindPopupActions(node);
    });

    markers.push(marker);
    clusterGroup.addLayer(marker);
  });

  els.visible.textContent = String(filteredCustomers.length);

  clearTimeout(fitBoundsTimer);
  fitBoundsTimer = setTimeout(() => {
    if (filteredCustomers.length === 1) {
      map.setView([Number(filteredCustomers[0].lat), Number(filteredCustomers[0].lng)], 15);
    }
  }, 50);
}

function fitAll() {
  const valid = customers.filter((r) => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng)));
  if (!valid.length) return;

  const bounds = L.latLngBounds(valid.map((r) => [Number(r.lat), Number(r.lng)]));
  map.fitBounds(bounds.pad(0.12));
}

function syncStats(rows = customers, visibleRows = filteredCustomers) {
  els.total.textContent = String(rows.length);
  els.active.textContent = String(rows.filter((r) => getStatus(r) === "ATTIVO").length);
  els.inactive.textContent = String(rows.filter((r) => getStatus(r) === "INATTIVO").length);
  els.standby.textContent = String(rows.filter((r) => getStatus(r) === "STAND BY").length);
  els.geo.textContent = String(rows.filter((r) => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng))).length);
  els.visible.textContent = String(visibleRows.length);
}

async function loadData() {
  els.statusPill.textContent = "Caricamento database…";
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  customers = Array.isArray(data) ? data : [];
  filteredCustomers = [...customers];
  updateFiltersOptions(customers);
  syncStats(customers, filteredCustomers);
  renderMap();
  fitAll();

  const now = new Date();
  els.lastUpdated.textContent = `Aggiornato ${now.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })} · ${now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
  els.pill.textContent = `${filteredCustomers.length} clienti visualizzati`;
}

function wireUI() {
  const debouncedApply = (() => {
    let timer;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        applyFilters();
        syncStats(customers, filteredCustomers);
        els.pill.textContent = `${filteredCustomers.length} clienti visualizzati`;
      }, 120);
    };
  })();

  els.search.addEventListener("input", debouncedApply);
  els.status.addEventListener("change", () => { applyFilters(); syncStats(customers, filteredCustomers); });
  els.province.addEventListener("change", () => { applyFilters(); syncStats(customers, filteredCustomers); });
  els.city.addEventListener("change", () => { applyFilters(); syncStats(customers, filteredCustomers); });
  els.reset.addEventListener("click", () => {
    els.search.value = "";
    els.status.value = "";
    els.province.value = "";
    els.city.value = "";
    filteredCustomers = [...customers];
    syncStats(customers, filteredCustomers);
    renderMap();
    fitAll();
    els.pill.textContent = `${filteredCustomers.length} clienti visualizzati`;
  });
  els.fitAll.addEventListener("click", fitAll);
}

wireUI();
loadData().catch((err) => {
  console.error(err);
  els.statusPill.textContent = "Errore caricamento";
  els.lastUpdated.textContent = "Impossibile caricare customers.json";
});
