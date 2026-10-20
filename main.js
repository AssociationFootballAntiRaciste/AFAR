/* =========================================================
   AFAR — Script principal
   Navigation mobile, accordéon FAQ, animations scroll,
   compteur observatoire, flux RSS Google Alerts.
   ========================================================= */

/* -----------------------------------------------------------
   CONFIGURATION
   ----------------------------------------------------------- */

/* MODE COMPTEUR
   - "auto" : le compteur est calculé à partir du flux RSS (recommandé)
   - "manuel" : le compteur affiche la valeur ci-dessous (forcer si besoin)
   - "off"   : affiche le placeholder "• • •" en attendant
*/
const AFAR_COMPTEUR_MODE = "auto";

/* Valeur manuelle utilisée uniquement si AFAR_COMPTEUR_MODE === "manuel" */
const AFAR_COMPTEUR_INCIDENTS = null;

/* Date de départ du compteur (au format ISO).
   Tout article publié AVANT cette date est ignoré. */
const AFAR_COMPTEUR_DEPUIS = "2026-01-01";

/* Veille médiatique.
   Les articles sont collectés toutes les 3 heures par GitHub (Actions > « Veille médiatique »)
   et enregistrés dans data/veille.json. Sources, recherches et mots-clés :
   data/veille-config.json (modifiable sur GitHub).
*/
const AFAR_VEILLE_URL = "data/veille.json";
const AFAR_RSS_FEEDS = {
  incidents: AFAR_VEILLE_URL + "#incidents",
  mentions:  AFAR_VEILLE_URL + "#mentions"
};

/* Mots-clés pour filtrer les incidents racistes UNIQUEMENT
   (le flux global capture aussi sexisme et discrimination, mais le compteur de la
   page d'accueil et de l'observatoire ne compte QUE les actes racistes).
   La vérification est faite dans le titre + le résumé. */
const AFAR_MOTS_RACISME = [
  "racis", "racial", "raciaux", "négrophob", "négritude",
  "cri de singe", "cris de singe", "banane", "bananes",
  "antiracis", "couleur de peau", "discrimination racial"
];

/* Proxy RSS → JSON (RSS2JSON — plan gratuit, 10 000 req/jour). */
const RSS2JSON_ENDPOINT = "https://api.rss2json.com/v1/api.json?rss_url=";

/* Clé API rss2json (optionnelle).
   Si vous avez créé un compte gratuit sur https://rss2json.com,
   collez votre clé ici pour des résultats plus stables (10 000 req/jour).
   Sans clé, on bascule automatiquement sur le proxy de secours. */
const RSS2JSON_KEY = "";

/* Proxies CORS de fallback — testés dans l'ordre, le premier qui répond gagne. */
const CORS_PROXIES = [
  "https://api.allorigins.win/raw?url=",
  "https://corsproxy.io/?",
  "https://api.codetabs.com/v1/proxy?quest="
];

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

/* Affiche une valeur (numérique) ou le placeholder. */
function afficherCompteur(valeur, noteText) {
  const nodes = document.querySelectorAll("[data-compteur]");
  const isPlaceholder = (valeur === null || valeur === undefined);
  nodes.forEach(node => {
    if (isPlaceholder) {
      node.textContent = "• • •";
      node.classList.add("is-placeholder");
    } else {
      node.textContent = new Intl.NumberFormat("fr-FR").format(valeur);
      node.classList.remove("is-placeholder");
    }
  });

  const notes = document.querySelectorAll("[data-compteur-note]");
  notes.forEach(n => {
    if (noteText) {
      n.textContent = noteText;
      n.style.display = "block";
    } else {
      n.style.display = "none";
    }
  });
}

/* Filtre : un article relève-t-il du racisme ? */
function estIncidentRaciste(item) {
  if (typeof item.raciste === "boolean") return item.raciste; // calculé par la veille
  const haystack = ((item.title || "") + " " + (item.description || "")).toLowerCase();
  return AFAR_MOTS_RACISME.some(kw => haystack.includes(kw.toLowerCase()));
}

/* Filtre : article publié depuis la date de départ ? */
function estApresDateDepart(item) {
  if (!item.pubDate) return false;
  const d = new Date(item.pubDate);
  if (isNaN(d)) return false;
  return d >= new Date(AFAR_COMPTEUR_DEPUIS);
}

/* Dédoublonnage approximatif par similarité de titre (Jaccard sur les mots significatifs).
   Deux articles dont les titres partagent ≥ 60 % de mots significatifs sont considérés
   comme couvrant le même incident. */
function motsSignificatifs(titre) {
  const stopWords = new Set([
    "le","la","les","un","une","des","du","de","d","l","et","ou","à","a","au","aux",
    "en","dans","par","pour","sur","sous","vers","avec","sans","ce","cet","cette",
    "ces","son","sa","ses","leur","leurs","mon","ma","mes","est","sont","être","été",
    "qui","que","quoi","dont","où","ne","pas","plus","si","mais","car","donc","or",
    "que","quel","quelle"
  ]);
  return new Set(
    (titre || "").toLowerCase()
      .replace(/[^\w\sàâäéèêëîïôöùûüÿç-]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w))
  );
}

function tauxSimilarite(t1, t2) {
  const s1 = motsSignificatifs(t1);
  const s2 = motsSignificatifs(t2);
  if (s1.size === 0 || s2.size === 0) return 0;
  let inter = 0;
  s1.forEach(w => { if (s2.has(w)) inter++; });
  const union = s1.size + s2.size - inter;
  return union === 0 ? 0 : inter / union;
}

function dedoublonnerIncidents(items) {
  const result = [];
  for (const item of items) {
    const isDuplicate = result.some(kept => tauxSimilarite(item.title, kept.title) >= 0.6);
    if (!isDuplicate) result.push(item);
  }
  return result;
}

/* Compteur — orchestration complète */
async function initCompteur() {
  const nodes = document.querySelectorAll("[data-compteur]");
  if (nodes.length === 0) return;

  // Mode off
  if (AFAR_COMPTEUR_MODE === "off") {
    afficherCompteur(null, "Compteur en cours d'initialisation.");
    return;
  }

  // Mode manuel
  if (AFAR_COMPTEUR_MODE === "manuel") {
    afficherCompteur(AFAR_COMPTEUR_INCIDENTS, null);
    return;
  }

  // Mode auto — pas de flux configuré : placeholder
  if (!AFAR_RSS_FEEDS.incidents) {
    afficherCompteur(null, "Compteur en cours d'initialisation.");
    return;
  }

  // Affiche un état intermédiaire pendant le chargement
  afficherCompteur(null, "Calcul en cours…");

  try {
    const items = await fetchFeed(AFAR_RSS_FEEDS.incidents);
    const filtres = items
      .filter(estApresDateDepart)
      .filter(estIncidentRaciste);
    const uniques = dedoublonnerIncidents(filtres);
    const total = uniques.length;
    const dateDepart = new Date(AFAR_COMPTEUR_DEPUIS).toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", year: "numeric"
    });
    afficherCompteur(total, `Estimation issue de la veille médiatique automatisée depuis le ${dateDepart}. Mise à jour en continu.`);
  } catch (err) {
    afficherCompteur(null, "Compteur indisponible — veille en cours d'actualisation.");
  }
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

/* Parsing d'un flux Atom/RSS au format XML brut (DOMParser natif).
   Compatible avec les flux Google Alerts (Atom) et la plupart des flux RSS 2.0. */
function parseFeedXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  // Erreur de parsing ?
  if (doc.querySelector("parsererror")) return [];

  // Format Atom (Google Alerts) — utilise <entry>
  let entries = Array.from(doc.querySelectorAll("entry"));
  if (entries.length > 0) {
    return entries.map(entry => {
      const titleEl = entry.querySelector("title");
      const linkEl = entry.querySelector("link[href]");
      const contentEl = entry.querySelector("content") || entry.querySelector("summary");
      const pubEl = entry.querySelector("published") || entry.querySelector("updated");
      const link = linkEl ? linkEl.getAttribute("href") : "#";
      // Google Alerts encapsule l'URL réelle dans un paramètre "url=" du redirect
      let realLink = link;
      try {
        const u = new URL(link);
        const innerUrl = u.searchParams.get("url");
        if (innerUrl) realLink = innerUrl;
      } catch (e) { /* ignore */ }
      return {
        title: titleEl ? stripHtml(titleEl.textContent) : "Sans titre",
        link: realLink,
        description: contentEl ? stripHtml(contentEl.textContent).slice(0, 200) : "",
        pubDate: pubEl ? pubEl.textContent : null,
        source: extractSource(realLink)
      };
    });
  }

  // Format RSS 2.0 — utilise <item>
  entries = Array.from(doc.querySelectorAll("item"));
  return entries.map(item => {
    const get = (sel) => {
      const el = item.querySelector(sel);
      return el ? el.textContent : "";
    };
    return {
      title: stripHtml(get("title")) || "Sans titre",
      link: get("link") || "#",
      description: stripHtml(get("description")).slice(0, 200),
      pubDate: get("pubDate"),
      source: extractSource(get("link"))
    };
  });
}

/* Récupérer et parser un flux — stratégie multi-fallback. */
/* Lecture de la veille collectée par GitHub (même site : pas de proxy). */
let veillePromise = null;
async function chargerVeille() {
  if (!veillePromise) {
    const v = Math.floor(Date.now() / 600000); // contourne le cache toutes les 10 min
    veillePromise = fetch(AFAR_VEILLE_URL + "?v=" + v).then(r => {
      if (!r.ok) throw new Error("veille indisponible");
      return r.json();
    });
  }
  return veillePromise;
}

async function fetchFeed(rssUrl) {
  if (!rssUrl) return [];
  if (rssUrl.startsWith(AFAR_VEILLE_URL + "#")) {
    const data = await chargerVeille();
    return (data[rssUrl.split("#")[1]] || []).map(it => ({ ...it, description: it.description || "" }));
  }
  const cacheKey = "afar_feed_" + rssUrl;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // Stratégie 1 : rss2json (avec clé API si disponible)
  if (RSS2JSON_KEY) {
    try {
      const url = RSS2JSON_ENDPOINT + encodeURIComponent(rssUrl) + "&api_key=" + encodeURIComponent(RSS2JSON_KEY);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "ok" && Array.isArray(data.items)) {
          const items = data.items.map(it => ({
            title: it.title || "Sans titre",
            link: it.link || "#",
            description: stripHtml(it.description || "").slice(0, 200),
            pubDate: it.pubDate,
            source: extractSource(it.link || "")
          }));
          cacheSet(cacheKey, items);
          return items;
        }
      }
    } catch (e) { /* on tente le fallback */ }
  }

  // Stratégie 2 : proxies CORS — on essaye chaque proxy dans l'ordre
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy + encodeURIComponent(rssUrl), {
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseFeedXml(xml);
      if (items.length === 0) continue;
      cacheSet(cacheKey, items);
      return items;
    } catch (e) {
      // proxy suivant
    }
  }

  throw new Error("Aucun proxy n'a pu récupérer le flux");
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
