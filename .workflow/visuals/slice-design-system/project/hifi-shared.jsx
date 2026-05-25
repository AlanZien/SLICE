/* SLICE hi-fi — shared shell + dataset.
   Exposes Topbar / Wordmark / Stepper / Method / icons / fake-OpenAPI data.
*/

// ────────────────────────────────────────────────────────────
// FAKE DATA — pretends to be a parsed Shopify Admin OpenAPI spec
// ────────────────────────────────────────────────────────────
const SLICE_DATA = {
  apiName: "Shopify Admin API",
  apiVersion: "v2024-01",
  baseUrl: "https://shop.myshopify.com/admin/api",
  authType: "key",        // none | key | bearer
  authHeader: "X-Shopify-Access-Token",
  totalTokensFull: 18400,
  groups: [
    { tag: "Products", endpoints: [
      { id: "p1", m: "GET",    path: "/products",                  label: "Lister les produits",         desc: "Récupère la liste paginée des produits du catalogue.",      params: ["limit", "fields", "since_id", "vendor"], tokens: 580 },
      { id: "p2", m: "GET",    path: "/products/{id}",              label: "Détails d'un produit",         desc: "Détails complets d'un produit par ID.",                    params: ["id", "fields"], tokens: 410 },
      { id: "p3", m: "GET",    path: "/products/{id}/variants",     label: "Variantes d'un produit",       desc: "Récupère les variantes (taille, couleur…) d'un produit.",  params: ["id", "limit", "fields"], tokens: 312 },
      { id: "p4", m: "GET",    path: "/products/count",             label: "Compter les produits",         desc: "Nombre total de produits selon les filtres.",              params: ["vendor"], tokens: 140 },
      { id: "p5", m: "POST",   path: "/products",                   label: "Créer un produit",             desc: "Crée un nouveau produit dans le catalogue.",               params: ["title", "vendor", "product_type", "tags"], tokens: 720 },
      { id: "p6", m: "PUT",    path: "/products/{id}",              label: "Modifier un produit",          desc: "Met à jour les informations d'un produit existant.",       params: ["id", "title", "vendor", "tags"], tokens: 540 },
      { id: "p7", m: "PUT",    path: "/products/{id}/tags",         label: "Modifier les tags",            desc: "Met à jour uniquement les tags d'un produit.",             params: ["id", "tags"], tokens: 220 },
      { id: "p8", m: "DELETE", path: "/products/{id}",              label: "Supprimer un produit",         desc: "Supprime définitivement un produit.",                      params: ["id"], tokens: 110 },
    ]},
    { tag: "Orders", endpoints: [
      { id: "o1", m: "GET",  path: "/orders",                     label: "Lister les commandes",         desc: "Liste paginée des commandes.",                              params: ["status", "limit", "since_id"], tokens: 620 },
      { id: "o2", m: "GET",  path: "/orders/{id}",                label: "Détails d'une commande",        desc: "Détails complets d'une commande.",                          params: ["id"], tokens: 480 },
      { id: "o3", m: "GET",  path: "/orders/{id}/transactions",   label: "Transactions d'une commande",  desc: "Liste les paiements rattachés à une commande.",             params: ["id"], tokens: 360 },
      { id: "o4", m: "POST", path: "/orders",                     label: "Créer une commande",           desc: "Crée une commande manuelle (draft).",                       params: ["line_items", "customer"], tokens: 740 },
      { id: "o5", m: "PUT",  path: "/orders/{id}/status",         label: "Modifier le statut",           desc: "Marque comme expédiée, annulée, etc.",                      params: ["id", "status"], tokens: 240 },
      { id: "o6", m: "POST", path: "/orders/{id}/refund",         label: "Rembourser une commande",      desc: "Émet un remboursement (total ou partiel).",                 params: ["id", "amount", "reason"], tokens: 380 },
    ]},
    { tag: "Customers", endpoints: [
      { id: "c1", m: "GET",    path: "/customers",                label: "Lister les clients",           desc: "Liste paginée des clients.",                                 params: ["limit"], tokens: 460 },
      { id: "c2", m: "GET",    path: "/customers/{id}",           label: "Détails d'un client",          desc: "Profil complet d'un client.",                                params: ["id"], tokens: 340 },
      { id: "c3", m: "GET",    path: "/customers/search",         label: "Rechercher un client",         desc: "Recherche par email, nom, téléphone.",                       params: ["query"], tokens: 220 },
      { id: "c4", m: "POST",   path: "/customers",                label: "Créer un client",              desc: "Crée un nouveau client.",                                    params: ["email", "first_name", "last_name"], tokens: 420 },
      { id: "c5", m: "DELETE", path: "/customers/{id}",           label: "Supprimer un client",          desc: "Anonymise et supprime un client.",                           params: ["id"], tokens: 110 },
    ]},
    { tag: "Inventory", endpoints: [
      { id: "i1", m: "GET",  path: "/inventory_levels",           label: "Lister les niveaux de stock",  desc: "Stock par variante × emplacement.",                          params: ["location_ids"], tokens: 380 },
      { id: "i2", m: "GET",  path: "/inventory_items/{id}",       label: "Détails d'un article de stock", desc: "Métadonnées d'un article de stock.",                        params: ["id"], tokens: 240 },
      { id: "i3", m: "POST", path: "/inventory_levels/adjust",    label: "Ajuster un stock",             desc: "Modifie le niveau de stock d'un emplacement.",               params: ["item_id", "delta"], tokens: 280 },
      { id: "i4", m: "POST", path: "/inventory_levels/set",       label: "Définir un stock",             desc: "Définit la valeur exacte d'un stock.",                       params: ["item_id", "value"], tokens: 260 },
      { id: "i5", m: "POST", path: "/inventory_levels/connect",   label: "Rattacher un emplacement",     desc: "Rattache un article à un emplacement.",                      params: ["item_id", "location_id"], tokens: 220 },
      { id: "i6", m: "GET",  path: "/locations",                  label: "Lister les emplacements",      desc: "Emplacements physiques du marchand.",                        params: [], tokens: 180 },
      { id: "i7", m: "GET",  path: "/locations/{id}",             label: "Détails d'un emplacement",      desc: "Adresse et statut d'un emplacement.",                       params: ["id"], tokens: 160 },
    ]},
    { tag: "Discounts", endpoints: [
      { id: "d1", m: "GET",    path: "/price_rules",              label: "Lister les codes promo",       desc: "Règles de prix configurées.",                                params: ["limit"], tokens: 320 },
      { id: "d2", m: "POST",   path: "/price_rules",              label: "Créer un code promo",          desc: "Nouvelle règle de prix.",                                    params: ["title", "value_type", "value"], tokens: 460 },
      { id: "d3", m: "PUT",    path: "/price_rules/{id}",         label: "Modifier un code promo",       desc: "Met à jour une règle de prix.",                              params: ["id", "value"], tokens: 320 },
      { id: "d4", m: "DELETE", path: "/price_rules/{id}",         label: "Supprimer un code promo",      desc: "Supprime une règle de prix.",                                params: ["id"], tokens: 110 },
    ]},
    { tag: "Webhooks", endpoints: [
      { id: "w1", m: "GET",    path: "/webhooks",                 label: "Lister les webhooks",          desc: "Webhooks enregistrés.",                                      params: [], tokens: 240 },
      { id: "w2", m: "POST",   path: "/webhooks",                 label: "Créer un webhook",             desc: "Souscrit à un événement.",                                   params: ["topic", "address"], tokens: 320 },
      { id: "w3", m: "DELETE", path: "/webhooks/{id}",            label: "Supprimer un webhook",         desc: "Désinscrit un webhook.",                                     params: ["id"], tokens: 110 },
      { id: "w4", m: "GET",    path: "/webhooks/count",           label: "Compter les webhooks",         desc: "Nombre total de webhooks.",                                  params: [], tokens: 90 },
      { id: "w5", m: "PUT",    path: "/webhooks/{id}",            label: "Modifier un webhook",          desc: "Modifie l'URL ou le topic d'un webhook.",                    params: ["id", "address"], tokens: 280 },
    ]},
  ],
};

// pre-pick the "useful for a customer-support agent" subset (~23 endpoints).
const SLICE_DEFAULT_PICKED = new Set([
  "p1","p2","p3","p6",
  "o1","o2","o3","o5","o6",
  "c1","c2","c3","c4",
  "i1","i2","i6","i7",
  "d1","d3",
  "w1","w2","w3","w5",
]);

// ────────────────────────────────────────────────────────────
// Type-only wordmark — Geist 700, tight
// ────────────────────────────────────────────────────────────
const Wordmark = ({ size = 17 }) => (
  <span className="wordmark" style={{ fontSize: size }}>SLICE</span>
);

// ────────────────────────────────────────────────────────────
// Stepper pill — sits in the top bar
// ────────────────────────────────────────────────────────────
const STEPS = [
  { k: 1, name: "Upload" },
  { k: 2, name: "Sélection" },
  { k: 3, name: "Configuration" },
  { k: 4, name: "Terminé" },
];

const Stepper = ({ current }) => (
  <div className="stepper" role="navigation" aria-label="Étapes">
    {STEPS.map((s, i) => (
      <React.Fragment key={s.k}>
        {i > 0 && <span className="step-dot"></span>}
        <span className={`step ${s.k === current ? "now" : s.k < current ? "done" : ""}`}>
          {s.k < current ? "✓" : s.k}
        </span>
        {s.k === current && <span className="step-name">{s.name}</span>}
      </React.Fragment>
    ))}
  </div>
);

// ────────────────────────────────────────────────────────────
// Topbar (always present)
// ────────────────────────────────────────────────────────────
const Topbar = ({ current, onReset, right }) => (
  <div className="topbar">
    <Wordmark />
    <span className="breadcrumb">
      <span className="sep">/</span>
      {current === 1 ? "new" :
       current === 2 ? `${SLICE_DATA.apiName.toLowerCase().replace(/\s+/g, "-")}` :
       current === 3 ? "configure" :
       current === 4 ? "done" : ""}
    </span>
    <Stepper current={current} />
    <div className="actions">
      {right}
      <span className="hint">
        <span className="kbd">⌘</span><span className="kbd">K</span>
      </span>
      <a className="btn btn--ghost btn--sm" href="#" onClick={(e) => { e.preventDefault(); onReset && onReset(); }}>
        ↻ Recommencer
      </a>
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────
// Method badge
// ────────────────────────────────────────────────────────────
const Method = ({ m }) => (
  <span className={`method method--${m.toLowerCase()}`}>{m}</span>
);

// ────────────────────────────────────────────────────────────
// Utility — count selection & token economy
// ────────────────────────────────────────────────────────────
function summarize(picked) {
  let count = 0, tokens = 0, total = 0;
  for (const g of SLICE_DATA.groups) {
    for (const ep of g.endpoints) {
      total++;
      if (picked.has(ep.id)) { count++; tokens += ep.tokens; }
    }
  }
  // overhead per endpoint (description, schema, etc.) — fake but plausible.
  const sliceTokens = tokens + count * 40;
  const fullTokens = SLICE_DATA.totalTokensFull;
  const ratio = fullTokens > 0 ? sliceTokens / fullTokens : 0;
  const economy = Math.max(0, Math.round((1 - ratio) * 100));
  return { count, total, sliceTokens, fullTokens, economy };
}

Object.assign(window, {
  SLICE_DATA, SLICE_DEFAULT_PICKED,
  Wordmark, Topbar, Stepper, Method, summarize,
});
