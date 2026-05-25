/* Écran 2 — Sélection des endpoints (3 variations) */

// Sample data lifted from a fake "Shopify Admin API" OpenAPI spec.
const E2_GROUPS = [
  {
    tag: "Products", picked: 5, total: 8, open: true,
    rows: [
      { m: "GET",    label: "Lister les produits",       on: true,  path: "/products" },
      { m: "GET",    label: "Détails d'un produit",       on: true,  path: "/products/{id}" },
      { m: "POST",   label: "Créer un produit",          on: false, path: "/products" },
      { m: "PUT",    label: "Modifier un produit",       on: true,  path: "/products/{id}" },
      { m: "DELETE", label: "Supprimer un produit",      on: false, path: "/products/{id}" },
    ],
  },
  {
    tag: "Orders", picked: 4, total: 6, open: true,
    rows: [
      { m: "GET",  label: "Lister les commandes",        on: true,  path: "/orders" },
      { m: "GET",  label: "Détails d'une commande",       on: true,  path: "/orders/{id}" },
      { m: "POST", label: "Créer une commande",          on: false, path: "/orders" },
      { m: "PUT",  label: "Modifier le statut",          on: true,  path: "/orders/{id}/status" },
    ],
  },
  { tag: "Customers",  picked: 3, total: 5, open: false },
  { tag: "Inventory",  picked: 0, total: 7, open: false },
  { tag: "Discounts",  picked: 0, total: 4, open: false },
];

const E2_TOTAL_PICKED = 23;
const E2_TOTAL_ALL = 47;
const E2_CTX = 73; // % economy

const Method = ({ m }) => (
  <span className={`wf-method wf-method--${m.toLowerCase()}`}>{m}</span>
);

const AccordionRow = ({ g }) => (
  <div className="wf-box wf-box--soft" style={{ marginBottom: 6 }}>
    <div className="wf-acc">
      <span className="chev">{g.open ? "▾" : "▸"}</span>
      <span className="wf-mono" style={{ fontWeight: 500 }}>{g.tag}</span>
      <span className="wf-mute" style={{ fontSize: 10 }}>
        {g.picked}/{g.total} sélectionnés
      </span>
      <span style={{ flex: 1 }}></span>
      <span className="wf-chip">tag</span>
    </div>
    {g.open && g.rows && g.rows.map((r, i) => (
      <div key={i} className="wf-endpoint">
        <span className={`wf-check ${r.on ? "wf-check--on" : ""}`}></span>
        <Method m={r.m} />
        <span style={{ minWidth: 0, flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          {r.label}
        </span>
        <span className="wf-mute wf-mono" style={{ fontSize: 10, opacity: 0.7 }}>
          {r.path}
        </span>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────
// V1 — Classic: accordion list + sticky right sidebar with ring
// ─────────────────────────────────────────────────────────────
const E2_V1 = () => (
  <div className="wf">
    <WfStamp label="v1 · classic" />
    <div className="wf-screen">
      <WfChrome crumb="slice / select endpoints" />
      <WfTopBar step={2} title="Sélection · Étape 2 sur 3" />

      {/* API banner */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--wf-line-soft)" }}>
        <div className="wf-col" style={{ gap: 2 }}>
          <div className="wf-row" style={{ gap: 6 }}>
            <span className="wf-serif" style={{ fontSize: 18 }}>Shopify Admin API</span>
            <span className="wf-badge">v2024-01</span>
            <span className="wf-mute" style={{ fontSize: 10 }}>✎ éditable</span>
          </div>
          <div className="wf-mute wf-mono" style={{ fontSize: 10 }}>
            https://shop.myshopify.com/admin/api ↵
          </div>
        </div>
        <span style={{ flex: 1 }}></span>
        <span className="wf-badge">47 endpoints détectés</span>
      </div>

      {/* Body: list + sidebar */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* main list */}
        <div style={{ flex: 1, padding: "10px 14px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* action bar */}
          <div className="wf-row" style={{ gap: 6 }}>
            <div className="wf-input" style={{ flex: 1, gap: 6 }}>
              <span className="wf-mute">⌕</span>
              <span>filtrer&hellip;</span>
              <span style={{ flex: 1 }}></span>
              <span className="wf-kbd">⌘</span>
              <span className="wf-kbd">K</span>
            </div>
            <span className="wf-btn wf-btn--ghost">↓ lectures</span>
            <span className="wf-btn wf-btn--ghost">↑ écritures</span>
            <span className="wf-btn wf-btn--ghost">∅ tout</span>
          </div>

          <div style={{ overflow: "auto", flex: 1 }}>
            {E2_GROUPS.map((g) => <AccordionRow key={g.tag} g={g} />)}
          </div>
        </div>

        {/* sidebar */}
        <div style={{
          width: 220,
          borderLeft: "1px solid var(--wf-line)",
          padding: "16px 14px",
          display: "flex", flexDirection: "column", gap: 12,
          background: "var(--wf-bg-soft)",
        }}>
          <div className="wf-caps">Récap</div>
          <div className="wf-col" style={{ gap: 6 }}>
            <div className="wf-row" style={{ justifyContent: "space-between" }}>
              <span className="wf-mute">Sélectionnés</span>
              <span className="wf-mono" style={{ fontWeight: 600 }}>{E2_TOTAL_PICKED}<span className="wf-mute"> / {E2_TOTAL_ALL}</span></span>
            </div>
            <div className="wf-row" style={{ justifyContent: "space-between" }}>
              <span className="wf-mute">Lecture / écriture</span>
              <span className="wf-mono">14 / 9</span>
            </div>
          </div>
          <div className="wf-hr"></div>

          {/* radial counter */}
          <div className="wf-col" style={{ alignItems: "center", gap: 8 }}>
            <div className="wf-ring" style={{ "--p": E2_CTX }}>
              <div className="wf-col" style={{ alignItems: "center", gap: 0 }}>
                <span className="wf-serif" style={{ fontSize: 26 }}>−{E2_CTX}%</span>
                <span className="wf-caps">contexte</span>
              </div>
            </div>
            <span className="wf-hand" style={{ fontSize: 13, textAlign: "center" }}>
              vs. la spec complète
            </span>
          </div>

          <span style={{ flex: 1 }}></span>
          <div className="wf-btn wf-btn--primary wf-btn--lg" style={{ width: "100%", justifyContent: "center" }}>
            Continuer →
          </div>
          <span className="wf-mute" style={{ fontSize: 10, textAlign: "center" }}>
            <span className="wf-kbd">↵</span> pour valider
          </span>
        </div>
      </div>
    </div>

    <WfCallout x={478} y={186} text="checkbox + libellé humain" arrow="left" w={130} />
    <WfCallout x={612} y={386} text="ring = vibe pi.dev" arrow="left" w={120} />
  </div>
);

// ─────────────────────────────────────────────────────────────
// V2 — Comparative bar: big visual diff at top, single column list
// ─────────────────────────────────────────────────────────────
const E2_V2 = () => (
  <div className="wf">
    <WfStamp label="v2 · diff bar" />
    <div className="wf-screen">
      <WfChrome crumb="slice / select endpoints" />
      <WfTopBar step={2} title="Sélection · Étape 2 sur 3" />

      {/* HERO: comparative bars */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--wf-line)" }}>
        <div className="wf-row" style={{ alignItems: "flex-start", gap: 32 }}>
          {/* left: title block */}
          <div className="wf-col" style={{ gap: 6, flex: "0 0 220px" }}>
            <span className="wf-caps">Shopify Admin API · v2024-01</span>
            <span className="wf-serif" style={{ fontSize: 30, lineHeight: 1 }}>
              Tu en gardes <br/>
              <span style={{ textDecoration: "underline", textDecorationStyle: "wavy", textDecorationColor: "var(--wf-ink-mute)" }}>{E2_TOTAL_PICKED}</span> sur {E2_TOTAL_ALL}.
            </span>
            <span className="wf-hand" style={{ fontSize: 13 }}>
              SLICE garde uniquement ceux<br/>
              que tu coches.
            </span>
          </div>

          {/* right: stacked bars */}
          <div className="wf-col" style={{ gap: 10, flex: 1 }}>
            <div className="wf-col" style={{ gap: 4 }}>
              <div className="wf-row" style={{ justifyContent: "space-between" }}>
                <span className="wf-caps">Spec OpenAPI complète</span>
                <span className="wf-mono wf-mute" style={{ fontSize: 10 }}>~ 18 400 tokens</span>
              </div>
              <div style={{ height: 22, background: "var(--wf-hatch)", borderRadius: 3, position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, display: "flex" }}>
                  {[18, 22, 14, 12, 16, 18].map((w, i) => (
                    <div key={i} style={{ flex: w, borderRight: "1px solid var(--wf-bg)" }}></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="wf-col" style={{ gap: 4 }}>
              <div className="wf-row" style={{ justifyContent: "space-between" }}>
                <span className="wf-caps">Ton MCP SLICE</span>
                <span className="wf-mono wf-mute" style={{ fontSize: 10 }}>~ 4 970 tokens</span>
              </div>
              <div style={{ height: 22, background: "var(--wf-line-soft)", borderRadius: 3, position: "relative" }}>
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: `${100 - E2_CTX}%`,
                  background: "var(--wf-accent)",
                  borderRadius: 3,
                  display: "flex", alignItems: "center", paddingLeft: 8,
                  color: "var(--wf-accent-ink)",
                  fontFamily: "JetBrains Mono", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
                }}>−{E2_CTX}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* action bar */}
      <div className="wf-row" style={{ padding: "10px 20px", gap: 8, borderBottom: "1px solid var(--wf-line-soft)" }}>
        <div className="wf-input" style={{ flex: 1, gap: 6 }}>
          <span className="wf-mute">⌕</span>
          <span>filtrer par nom, méthode, tag&hellip;</span>
        </div>
        <span className="wf-chip wf-chip--on">tous</span>
        <span className="wf-chip">lecture</span>
        <span className="wf-chip">écriture</span>
        <span className="wf-btn wf-btn--ghost">∅ tout décocher</span>
        <span className="wf-btn wf-btn--primary">Continuer →</span>
      </div>

      {/* list */}
      <div style={{ flex: 1, padding: "10px 20px", overflow: "auto" }}>
        {E2_GROUPS.map((g) => <AccordionRow key={g.tag} g={g} />)}
      </div>
    </div>

    <WfCallout x={300} y={88} text="LE compteur en hero" arrow="down" w={140} />
    <WfCallout x={42} y={420} text="bulk actions = chips" arrow="up" w={130} />
  </div>
);

// ─────────────────────────────────────────────────────────────
// V3 — Raycast split: narrow tag rail · dense mono list · right preview
// ─────────────────────────────────────────────────────────────
const E2_V3 = () => (
  <div className="wf">
    <WfStamp label="v3 · split" />
    <div className="wf-screen">
      <WfChrome crumb="slice / select endpoints" />
      <WfTopBar step={2} title="Sélection · Étape 2 sur 3"
        right={<>
          <span className="wf-mono wf-mute" style={{ fontSize: 10, marginRight: 8 }}>shopify-admin · v2024-01</span>
          <span className="wf-btn wf-btn--primary">Continuer ↵</span>
        </>}
      />

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* left rail */}
        <div style={{ width: 150, borderRight: "1px solid var(--wf-line)", padding: "10px 6px", background: "var(--wf-bg-soft)" }}>
          <div className="wf-caps" style={{ padding: "4px 8px" }}>Tags</div>
          {[
            ["Tous", 47, false],
            ["Products", 8, true],
            ["Orders", 6, false],
            ["Customers", 5, false],
            ["Inventory", 7, false],
            ["Discounts", 4, false],
            ["Webhooks", 9, false],
            ["Storefront", 8, false],
          ].map(([n, c, on]) => (
            <div key={n} style={{
              padding: "5px 8px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              borderRadius: 3,
              background: on ? "var(--wf-line-soft)" : "transparent",
              color: on ? "var(--wf-ink)" : "var(--wf-ink-soft)",
              fontSize: 11,
            }}>
              <span>{n}</span>
              <span className="wf-mute wf-mono" style={{ fontSize: 9 }}>{c}</span>
            </div>
          ))}
          <div className="wf-hr" style={{ margin: "8px 0" }}></div>
          <div className="wf-col" style={{ gap: 4, padding: "0 4px" }}>
            <span className="wf-caps">Récap</span>
            <span className="wf-mono" style={{ fontSize: 22, fontWeight: 600 }}>
              {E2_TOTAL_PICKED}<span className="wf-mute" style={{ fontSize: 11 }}>/{E2_TOTAL_ALL}</span>
            </span>
            <span className="wf-mono" style={{ fontSize: 11, color: "var(--wf-accent)" }}>−{E2_CTX}% contexte</span>
          </div>
        </div>

        {/* center dense list */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div className="wf-row" style={{ padding: "8px 12px", borderBottom: "1px solid var(--wf-line)", gap: 8 }}>
            <span className="wf-mute">⌕</span>
            <span className="wf-mono wf-mute" style={{ flex: 1, fontSize: 11 }}>products</span>
            <span className="wf-kbd">⌘</span><span className="wf-kbd">A</span>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
            {[
              { m: "GET", on: true, path: "/products", desc: "Lister les produits" },
              { m: "GET", on: true, path: "/products/{id}", desc: "Détails d'un produit" },
              { m: "GET", on: false, path: "/products/count", desc: "Compter les produits" },
              { m: "POST", on: false, path: "/products", desc: "Créer un produit" },
              { m: "PUT", on: true, path: "/products/{id}", desc: "Modifier un produit" },
              { m: "PUT", on: false, path: "/products/{id}/tags", desc: "Modifier les tags" },
              { m: "DELETE", on: false, path: "/products/{id}", desc: "Supprimer un produit" },
              { m: "GET", on: true, path: "/products/{id}/variants", desc: "Variantes d'un produit", active: true },
            ].map((r, i) => (
              <div key={i} style={{
                padding: "5px 12px",
                display: "flex", alignItems: "center", gap: 10,
                background: r.active ? "var(--wf-line-soft)" : "transparent",
                borderLeft: r.active ? "2px solid var(--wf-ink)" : "2px solid transparent",
                fontSize: 11,
              }}>
                <span className={`wf-check ${r.on ? "wf-check--on" : ""}`}></span>
                <Method m={r.m} />
                <span className="wf-mono wf-mute" style={{ width: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.path}</span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* right preview */}
        <div style={{ width: 232, borderLeft: "1px solid var(--wf-line)", padding: "12px 12px", background: "var(--wf-bg-soft)", display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="wf-caps">Aperçu</span>
          <div className="wf-row" style={{ gap: 6 }}>
            <Method m="GET" />
            <span className="wf-mono" style={{ fontSize: 11 }}>/products/{`{id}`}/variants</span>
          </div>
          <div className="wf-hand" style={{ fontSize: 13 }}>
            Récupère les variantes (taille, couleur…) d'un produit.
          </div>
          <div className="wf-hr"></div>
          <div className="wf-col" style={{ gap: 4 }}>
            <span className="wf-caps">Paramètres</span>
            <div className="wf-row" style={{ justifyContent: "space-between", fontSize: 10 }}>
              <span className="wf-mono">id</span><span className="wf-mute">string · requis</span>
            </div>
            <div className="wf-row" style={{ justifyContent: "space-between", fontSize: 10 }}>
              <span className="wf-mono">limit</span><span className="wf-mute">int · 50</span>
            </div>
            <div className="wf-row" style={{ justifyContent: "space-between", fontSize: 10 }}>
              <span className="wf-mono">fields</span><span className="wf-mute">string</span>
            </div>
          </div>
          <div className="wf-hr"></div>
          <div className="wf-col" style={{ gap: 4 }}>
            <span className="wf-caps">Coût contexte</span>
            <span className="wf-mono" style={{ fontSize: 16, fontWeight: 600 }}>~ 312 tokens</span>
            <div className="wf-bar wf-bar--xs" style={{ width: "55%" }}></div>
          </div>
        </div>
      </div>
    </div>

    <WfCallout x={580} y={208} text="ligne sélectionnée → preview live" arrow="right" w={170} />
  </div>
);

Object.assign(window, { E2_V1, E2_V2, E2_V3 });
