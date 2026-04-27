/* =========================================================
   AFAR — Script principal
   Navigation mobile, accordéon FAQ, animations scroll,
   compteur observatoire, flux RSS Google Alerts.
   ========================================================= */

/* -----------------------------------------------------------
   CONFIGURATION — à mettre à jour par l'AFAR
   ----------------------------------------------------------- */

/* Compteur d'incidents racistes recensés depuis le 1er janvier 2026.
   Mettre à jour manuellement la valeur ci-dessous. */
const AFAR_COMPTEUR_INCIDENTS = null; // null = affiche le placeholder "—"

/* Flux RSS Google Alerts — à renseigner par l'AFAR après création des alertes.
   Les URLs ci-dessous sont des exemples. Remplacer par les URLs réelles. */
const AFAR_RSS_FEEDS = {
  incidents: "", // ex. "https://www.google.fr/alerts/feeds/.../..."
  mentions:  ""  // ex. "https://www.google.fr/alerts/feeds/.../..."
};

/* Proxy RSS → JSON (RSS2JSON — plan gratuit). */
const RSS2JSON_ENDPOINT = "https://api.rss2json.com/v1/api.json?rss_url=";

/* Cache client (TTL 30 min). */
const RSS_CACHE_TTL = 30 * 60 * 1000;

/* -----------------------------------------------------------
   1. Navigation mobile (hamburger)
   ----------------------------------------------------------- */
function initNavMobile() {
  const burger = document.querySelector(".burger");
  const nav = document.querySelector(".main-nav");
  if (!burger || !nav) return;

  burger.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    burger.classList.toggle("is-open", isOpen);
    burger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  // Fermer la nav quand on clique sur un lien
  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    });
  });
}

/* -----------------------------------------------------------
   2. Accordéon FAQ
   ----------------------------------------------------------- */
function initFaq() {
  const items = document.querySelectorAll(".faq-item");
  items.forEach(item => {
    const btn = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");
    if (!btn || !answer) return;

    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", () => {
      const isOpen = item.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      answer.style.maxHeight = isOpen ? answer.scrollHeight + "px" : "0";
    });
  });
}

/* -----------------------------------------------------------
   3. Fade-in au scroll (IntersectionObserver)
   ----------------------------------------------------------- */
function initFadeIn() {
  const nodes = document.querySelectorAll(".fade-in");
  if (!("IntersectionObserver" in window) || nodes.length === 0) {
    nodes.forEach(n => n.classList.add("is-visible"));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });
  nodes.forEach(n => obs.observe(n));
}

/* -----------------------------------------------------------
   4. Compteur incidents observatoire
   ----------------------------------------------------------- */
function initCompteur() {
  const nodes = document.querySelectorAll("[data-compteur]");
  const isPlaceholder = (AFAR_COMPTEUR_INCIDENTS === null || AFAR_COMPTEUR_INCIDENTS === undefined);
  nodes.forEach(node => {
    if (isPlaceholder) {
      node.textContent = "• • •";
      node.classList.add("is-placeholder");
    } else {
      node.textContent = new Intl.NumberFormat("fr-FR").format(AFAR_COMPTEUR_INCIDENTS);
      node.classList.remove("is-placeholder");
    }
  });

  // Note explicative pour le placeholder
  const notes = document.querySelectorAll("[data-compteur-note]");
  notes.forEach(n => {
    if (isPlaceholder) {
      n.textContent = "Compteur en cours d'initialisation.";
      n.style.display = "block";
    } else {
      n.style.display = "none";
    }
  });
}

/* -----------------------------------------------------------
   5. Flux RSS Google Alerts
   ----------------------------------------------------------- */

/* Cache via sessionStorage */
function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.timestamp > RSS_CACHE_TTL) return null;
    return data.items;
  } catch { return null; }
}
function cacheSet(key, items) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), items }));
  } catch {}
}

/* Récupérer et parser un flux */
async function fetchFeed(rssUrl) {
  if (!rssUrl) return [];
  const cacheKey = "afar_feed_" + rssUrl;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const res = await fetch(RSS2JSON_ENDPOINT + encodeURIComponent(rssUrl));
  if (!res.ok) throw new Error("Erreur réseau");
  const data = await res.json();
  if (data.status !== "ok") throw new Error("Flux invalide");

  const items = (data.items || []).map(it => ({
    title: it.title || "Sans titre",
    link: it.link || "#",
    description: stripHtml(it.description || "").slice(0, 180),
    pubDate: it.pubDate,
    source: extractSource(it.link || "")
  }));
  cacheSet(cacheKey, items);
  return items;
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
}
function extractSource(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch { return ""; }
}
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function renderCard(item) {
  return `
    <article class="card">
      <time datetime="${item.pubDate || ""}">${formatDate(item.pubDate)}</time>
      <h3><a href="${item.link}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a></h3>
      ${item.source ? `<p class="source">${escapeHtml(item.source)}</p>` : ""}
      <p class="extrait">${escapeHtml(item.description)}${item.description.length >= 180 ? "…" : ""}</p>
      <a class="lire-suite" href="${item.link}" target="_blank" rel="noopener">Lire l'article →</a>
    </article>
  `;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function renderFeedInto(containerId, feedUrl, limit) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!feedUrl) {
    container.innerHTML = `<div class="feed-state">Les actualités seront bientôt disponibles.</div>`;
    return;
  }

  container.innerHTML = `<div class="feed-state">Chargement des actualités…</div>`;
  try {
    const items = await fetchFeed(feedUrl);
    if (!items.length) {
      container.innerHTML = `<div class="feed-state">Les actualités seront bientôt disponibles.</div>`;
      return;
    }
    const sorted = items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    const sliced = limit ? sorted.slice(0, limit) : sorted;
    container.innerHTML = sliced.map(renderCard).join("");
  } catch (err) {
    container.innerHTML = `<div class="feed-state">Les actualités seront bientôt disponibles.</div>`;
  }
}

/* Page d'accueil : 3 articles récents (tous flux confondus) */
async function initHomeFeed() {
  const container = document.getElementById("home-feed");
  if (!container) return;

  const feeds = [AFAR_RSS_FEEDS.incidents, AFAR_RSS_FEEDS.mentions].filter(Boolean);
  if (!feeds.length) {
    container.innerHTML = `<div class="feed-state">Les actualités seront bientôt disponibles.</div>`;
    return;
  }

  container.innerHTML = `<div class="feed-state">Chargement des actualités…</div>`;
  try {
    const all = (await Promise.all(feeds.map(fetchFeed))).flat();
    // Dédoublonnage par URL
    const seen = new Set();
    const unique = all.filter(it => !seen.has(it.link) && seen.add(it.link));
    const sorted = unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 3);
    if (!sorted.length) {
      container.innerHTML = `<div class="feed-state">Les actualités seront bientôt disponibles.</div>`;
      return;
    }
    container.innerHTML = sorted.map(renderCard).join("");
  } catch {
    container.innerHTML = `<div class="feed-state">Les actualités seront bientôt disponibles.</div>`;
  }
}

/* Page actualités : deux flux séparés */
function initActualitesFeeds() {
  if (document.getElementById("feed-incidents")) {
    renderFeedInto("feed-incidents", AFAR_RSS_FEEDS.incidents, 12);
  }
  if (document.getElementById("feed-mentions")) {
    renderFeedInto("feed-mentions", AFAR_RSS_FEEDS.mentions, 12);
  }
}

/* -----------------------------------------------------------
   INIT
   ----------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initNavMobile();
  initFaq();
  initFadeIn();
  initCompteur();
  initHomeFeed();
  initActualitesFeeds();
});
