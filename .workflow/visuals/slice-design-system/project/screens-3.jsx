/* Écran 3 — Configuration finale (3 variations) */

const DEST_CARDS = [
  {
    id: "local", title: "Sur mon ordi",
    apps: ["Claude Desktop", "Cursor", "Windsurf"],
    spec: "stdio",
    icon: "▢",
    blurb: "L'agent tourne sur ta machine et lit ton MCP en local.",
  },
  {
    id: "remote", title: "Sur un serveur en ligne",
    apps: ["n8n", "Airia", "Zapier"],
    spec: "http",
    icon: "◯",
    blurb: "Le MCP est exposé en HTTP, accessible depuis n'importe quel agent cloud.",
  },
  {
    id: "both", title: "Les deux",
    apps: ["Local + distant"],
    spec: "stdio + http",
    icon: "◐",
    blurb: "On génère les deux modes côte à côte. Plus de souplesse.",
  },
];

const DestCard = ({ d, on, big = false }) => (
  <div className={`wf-box ${on ? "" : "wf-box--soft"}`} style={{
    padding: big ? 16 : 12,
    flex: 1,
    minWidth: 0,
    position: "relative",
    borderColor: on ? "var(--wf-line-strong)" : "var(--wf-line)",
    boxShadow: on ? "0 0 0 1px var(--wf-ink) inset" : "none",
    cursor: "pointer",
  }}>
    <div className="wf-row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
      <span className="wf-serif" style={{ fontSize: big ? 22 : 17 }}>{d.icon}</span>
      <span className={`wf-radio ${on ? "wf-radio--on" : ""}`}></span>
    </div>
    <div className="wf-mono" style={{ fontWeight: 600, fontSize: big ? 14 : 12, marginBottom: 4 }}>
      {d.title}
    </div>
    <div className="wf-hand" style={{ fontSize: big ? 14 : 12, marginBottom: 10, lineHeight: 1.3 }}>
      {d.blurb}
    </div>
    <div className="wf-row" style={{ flexWrap: "wrap", gap: 4 }}>
      {d.apps.map((a) => <span key={a} className="wf-chip">{a}</span>)}
    </div>
    <div className="wf-mono wf-mute" style={{
      position: "absolute", bottom: 8, right: 10,
      fontSize: 9, letterSpacing: "0.06em",
    }}>{d.spec}</div>
  </div>
);

const FormField = ({ label, value, hint, mono = true }) => (
  <div className="wf-col" style={{ gap: 4 }}>
    <span className="wf-caps">{label}</span>
    <div className="wf-input">
      <span className={mono ? "wf-mono" : ""} style={{ color: "var(--wf-ink)" }}>{value}</span>
      <span style={{ flex: 1 }}></span>
      <span className="wf-mute" style={{ fontSize: 10 }}>✎</span>
    </div>
    {hint && <span className="wf-mute" style={{ fontSize: 10 }}>{hint}</span>}
  </div>
);

// ─────────────────────────────────────────────────────────────
// V1 — Vertical compact form
// ─────────────────────────────────────────────────────────────
const E3_V1 = () => (
  <div className="wf">
    <WfStamp label="v1 · vertical" />
    <div className="wf-screen">
      <WfChrome crumb="slice / configure" />
      <WfTopBar step={3} title="Configuration · Étape 3 sur 3" />

      <div style={{ flex: 1, overflow: "auto", padding: "20px 28px 16px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="wf-col" style={{ gap: 4, maxWidth: 540 }}>
          <span className="wf-caps">Dernière ligne droite</span>
          <span className="wf-serif" style={{ fontSize: 28 }}>
            Donne-lui un nom et dis-nous où il vivra.
          </span>
        </div>

        {/* compact form */}
        <div className="wf-col" style={{ gap: 14, maxWidth: 540 }}>
          <FormField label="Nom du MCP"
            value="shopify-admin-mcp"
            hint="auto-détecté depuis le titre de la spec" />
          <FormField label="URL de base"
            value="https://shop.myshopify.com/admin/api"
            hint="modifie si ton serveur est dans un autre env." />
          <div className="wf-col" style={{ gap: 6 }}>
            <span className="wf-caps">Authentification amont</span>
            <div className="wf-row" style={{ gap: 18 }}>
              <span className="wf-row" style={{ gap: 6 }}>
                <span className="wf-radio"></span>
                <span>Aucune</span>
              </span>
              <span className="wf-row" style={{ gap: 6 }}>
                <span className="wf-radio wf-radio--on"></span>
                <span>Clé API</span>
              </span>
              <span className="wf-row" style={{ gap: 6 }}>
                <span className="wf-radio"></span>
                <span>Bearer token</span>
              </span>
              <span className="wf-hand" style={{ fontSize: 12 }}>← détecté dans le header</span>
            </div>
          </div>
        </div>

        {/* the big question */}
        <div className="wf-col" style={{ gap: 8 }}>
          <span className="wf-caps">Une seule question importante</span>
          <span className="wf-serif" style={{ fontSize: 22 }}>
            Où ton agent va l'utiliser ?
          </span>
          <div className="wf-row" style={{ gap: 10, marginTop: 4 }}>
            <DestCard d={DEST_CARDS[0]} on={true} />
            <DestCard d={DEST_CARDS[1]} on={false} />
            <DestCard d={DEST_CARDS[2]} on={false} />
          </div>
        </div>

        {/* advanced */}
        <div className="wf-row" style={{ gap: 6, color: "var(--wf-ink-soft)" }}>
          <span>▸</span>
          <span className="wf-mono" style={{ fontSize: 11 }}>⚙ Options avancées</span>
          <span className="wf-mute" style={{ fontSize: 10 }}>· token HTTP, descriptions de params, retries</span>
        </div>
      </div>

      {/* sticky footer */}
      <div className="wf-row" style={{
        padding: "10px 28px",
        borderTop: "1px solid var(--wf-line)",
        background: "var(--wf-bg-soft)",
        gap: 12,
      }}>
        <span className="wf-mute" style={{ fontSize: 11 }}>↻ Précédent</span>
        <span style={{ flex: 1 }}></span>
        <span className="wf-mute wf-mono" style={{ fontSize: 10 }}>
          23 endpoints · clé API · local
        </span>
        <span className="wf-btn wf-btn--primary wf-btn--lg">
          Générer mon MCP →
        </span>
      </div>
    </div>

    <WfCallout x={448} y={252} text="auto-détecté = pré-rempli" arrow="left" w={160} />
    <WfCallout x={36} y={400} text="LA question mise en avant" arrow="right" w={140} />
  </div>
);

// ─────────────────────────────────────────────────────────────
// V2 — Two-column: form left, live preview card right
// ─────────────────────────────────────────────────────────────
const E3_V2 = () => (
  <div className="wf">
    <WfStamp label="v2 · split + preview" />
    <div className="wf-screen">
      <WfChrome crumb="slice / configure" />
      <WfTopBar step={3} title="Configuration · Étape 3 sur 3" />

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* form column */}
        <div style={{ flex: 1, padding: "18px 24px", overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <FormField label="Nom du MCP" value="shopify-admin-mcp"
            hint="auto-détecté depuis la spec" />
          <FormField label="URL de base" value="https://shop.myshopify.com/admin/api" />
          <div className="wf-col" style={{ gap: 6 }}>
            <span className="wf-caps">Authentification amont</span>
            <div className="wf-row" style={{ gap: 8 }}>
              {["Aucune", "Clé API", "Bearer"].map((a, i) => (
                <span key={a} className={`wf-chip ${i === 1 ? "wf-chip--on" : ""}`}>{a}</span>
              ))}
            </div>
          </div>

          <div className="wf-col" style={{ gap: 8 }}>
            <span className="wf-serif" style={{ fontSize: 19 }}>
              Où ton agent va l'utiliser ?
            </span>
            <div className="wf-col" style={{ gap: 6 }}>
              {DEST_CARDS.map((d, i) => (
                <div key={d.id} className="wf-box" style={{
                  padding: "10px 12px",
                  display: "flex", alignItems: "center", gap: 10,
                  borderColor: i === 1 ? "var(--wf-line-strong)" : "var(--wf-line)",
                  boxShadow: i === 1 ? "0 0 0 1px var(--wf-ink) inset" : "none",
                  background: i === 1 ? "var(--wf-bg-card)" : "var(--wf-bg-soft)",
                }}>
                  <span className={`wf-radio ${i === 1 ? "wf-radio--on" : ""}`}></span>
                  <div className="wf-col" style={{ gap: 2, flex: 1 }}>
                    <span className="wf-mono" style={{ fontWeight: 600 }}>{d.title}</span>
                    <span className="wf-mute" style={{ fontSize: 10 }}>{d.apps.join(" · ")}</span>
                  </div>
                  <span className="wf-mono wf-mute" style={{ fontSize: 10 }}>{d.spec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* advanced disclosed */}
          <div className="wf-box wf-box--dashed" style={{ padding: "10px 12px" }}>
            <div className="wf-row" style={{ marginBottom: 8 }}>
              <span>▾</span>
              <span className="wf-mono" style={{ fontSize: 11, fontWeight: 600 }}>⚙ Options avancées</span>
            </div>
            <div className="wf-col" style={{ gap: 8 }}>
              <div className="wf-row" style={{ justifyContent: "space-between" }}>
                <span className="wf-soft" style={{ fontSize: 11 }}>Token de sécurité HTTP</span>
                <span className="wf-mono wf-mute" style={{ fontSize: 10 }}>généré · tap to copy</span>
              </div>
              <div className="wf-row" style={{ justifyContent: "space-between" }}>
                <span className="wf-soft" style={{ fontSize: 11 }}>Descriptions détaillées des params</span>
                <span className="wf-mono">[ on ]</span>
              </div>
              <div className="wf-row" style={{ justifyContent: "space-between" }}>
                <span className="wf-soft" style={{ fontSize: 11 }}>Retries sur 5xx</span>
                <span className="wf-mono">[ off ]</span>
              </div>
            </div>
          </div>
        </div>

        {/* live preview */}
        <div style={{
          width: 340,
          borderLeft: "1px solid var(--wf-line)",
          background: "var(--wf-bg-soft)",
          padding: "18px 18px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <span className="wf-caps">Aperçu live</span>
          <div className="wf-box" style={{ padding: 14 }}>
            <div className="wf-row" style={{ gap: 6, marginBottom: 6 }}>
              <span className="wf-serif" style={{ fontSize: 18 }}>shopify-admin-mcp</span>
              <span className="wf-badge">v0.1.0</span>
            </div>
            <div className="wf-hand" style={{ fontSize: 12, marginBottom: 12 }}>
              23 endpoints · clé API · stdio
            </div>
            <div className="wf-col" style={{ gap: 4, fontSize: 11 }}>
              <div className="wf-row" style={{ justifyContent: "space-between" }}>
                <span className="wf-mute">tools.products.list</span>
                <Method m="GET" />
              </div>
              <div className="wf-row" style={{ justifyContent: "space-between" }}>
                <span className="wf-mute">tools.products.get</span>
                <Method m="GET" />
              </div>
              <div className="wf-row" style={{ justifyContent: "space-between" }}>
                <span className="wf-mute">tools.orders.list</span>
                <Method m="GET" />
              </div>
              <div className="wf-row" style={{ justifyContent: "space-between" }}>
                <span className="wf-mute">tools.orders.status_set</span>
                <Method m="PUT" />
              </div>
              <span className="wf-mute" style={{ fontSize: 10, marginTop: 4 }}>+19 autres…</span>
            </div>
          </div>

          <div className="wf-col" style={{ gap: 6 }}>
            <span className="wf-caps">Récap</span>
            <div className="wf-row" style={{ justifyContent: "space-between" }}><span className="wf-soft">Endpoints</span><span className="wf-mono">23/47</span></div>
            <div className="wf-row" style={{ justifyContent: "space-between" }}><span className="wf-soft">Contexte</span><span className="wf-mono" style={{ color: "var(--wf-success)" }}>−73%</span></div>
            <div className="wf-row" style={{ justifyContent: "space-between" }}><span className="wf-soft">Auth</span><span className="wf-mono">API key</span></div>
            <div className="wf-row" style={{ justifyContent: "space-between" }}><span className="wf-soft">Cible</span><span className="wf-mono">n8n · Airia</span></div>
          </div>

          <span style={{ flex: 1 }}></span>
          <div className="wf-btn wf-btn--primary wf-btn--lg" style={{ justifyContent: "center" }}>
            Générer mon MCP →
          </div>
          <span className="wf-mute" style={{ fontSize: 10, textAlign: "center" }}>
            génération · ~3 s
          </span>
        </div>
      </div>
    </div>

    <WfCallout x={602} y={114} text="MCP en temps réel" arrow="left" w={130} />
  </div>
);

// ─────────────────────────────────────────────────────────────
// V3 — Focus first: huge destination cards, other fields disclosed below
// ─────────────────────────────────────────────────────────────
const E3_V3 = () => (
  <div className="wf">
    <WfStamp label="v3 · focus first" />
    <div className="wf-screen">
      <WfChrome crumb="slice / configure" />
      <WfTopBar step={3} title="Configuration · Étape 3 sur 3" />

      <div style={{ flex: 1, overflow: "auto", padding: "26px 32px 16px" }}>
        <div className="wf-col" style={{ gap: 6, marginBottom: 22, maxWidth: 600 }}>
          <span className="wf-caps">La seule vraie question</span>
          <span className="wf-serif" style={{ fontSize: 40, lineHeight: 1.05 }}>
            Où ton agent <br />va l'utiliser ?
          </span>
          <span className="wf-hand" style={{ fontSize: 14 }}>
            Le reste est déjà pré-rempli. On a juste besoin de ça pour packager les bons fichiers.
          </span>
        </div>

        {/* huge cards */}
        <div className="wf-row" style={{ gap: 14, alignItems: "stretch", marginBottom: 22 }}>
          <DestCard d={DEST_CARDS[0]} on={false} big />
          <DestCard d={DEST_CARDS[1]} on={true} big />
          <DestCard d={DEST_CARDS[2]} on={false} big />
        </div>

        {/* compact disclosed details */}
        <div className="wf-box" style={{ padding: "14px 18px", marginBottom: 14 }}>
          <div className="wf-row" style={{ marginBottom: 10 }}>
            <span>▾</span>
            <span className="wf-mono" style={{ fontWeight: 600, fontSize: 12 }}>Détails (auto-détectés, modifiables)</span>
            <span className="wf-dots"></span>
            <span className="wf-mute" style={{ fontSize: 10 }}>tout est correct ?</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="wf-col" style={{ gap: 3 }}>
              <span className="wf-caps">Nom</span>
              <span className="wf-mono">shopify-admin-mcp</span>
            </div>
            <div className="wf-col" style={{ gap: 3 }}>
              <span className="wf-caps">URL de base</span>
              <span className="wf-mono" style={{ fontSize: 11 }}>https://shop.myshopify.com/admin/api</span>
            </div>
            <div className="wf-col" style={{ gap: 3 }}>
              <span className="wf-caps">Authentification</span>
              <span className="wf-mono">Clé API · X-Shopify-Access-Token</span>
            </div>
            <div className="wf-col" style={{ gap: 3 }}>
              <span className="wf-caps">Endpoints</span>
              <span className="wf-mono">23 sélectionnés · −73% contexte</span>
            </div>
          </div>
        </div>

        <div className="wf-row" style={{ gap: 6, color: "var(--wf-ink-soft)" }}>
          <span>▸</span>
          <span className="wf-mono" style={{ fontSize: 11 }}>⚙ Options avancées (3)</span>
        </div>
      </div>

      <div className="wf-row" style={{
        padding: "12px 32px",
        borderTop: "1px solid var(--wf-line)",
        background: "var(--wf-bg-soft)",
      }}>
        <span style={{ flex: 1 }}></span>
        <span className="wf-btn wf-btn--primary wf-btn--lg">
          Générer mon MCP →
        </span>
      </div>
    </div>

    <WfCallout x={28} y={108} text="hero = 1 question" arrow="right" w={130} />
    <WfCallout x={612} y={400} text="détails repliables" arrow="left" w={130} />
  </div>
);

Object.assign(window, { E3_V1, E3_V2, E3_V3 });
