/* Écran 4 — Succès post-génération (3 variations) */

const SNIPPETS = {
  claude: `{
  "mcpServers": {
    "shopify-admin": {
      "command": "node",
      "args": ["./shopify-admin-mcp/dist/index.js"],
      "env": {
        "SHOPIFY_API_KEY": "<ta clé>"
      }
    }
  }
}`,
  n8n: `# 1. déploie le dossier sur ton serveur
# 2. lance le worker
$ node shopify-admin-mcp/dist/http.js --port 7707

# 3. dans n8n, ajoute le node MCP
  url   →  http://serveur:7707
  token →  <copier depuis .env>
  tools →  23 (auto-découverts)`,
  airia: `import { McpClient } from "@airia/mcp";

const client = new McpClient({
  url: "https://mcp.tonsite.com",
  token: process.env.SLICE_MCP_TOKEN,
});

await client.tools.products.list({ limit: 20 });`,
};

// big sketchy checkmark
const WfCheck = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: "block" }}>
    <circle cx="32" cy="32" r="28" fill="none"
      stroke="var(--wf-ink)" strokeWidth="2"
      strokeDasharray="2 4" />
    <path d="M 20 33 L 28 41 L 46 22"
      fill="none" stroke="var(--wf-ink)" strokeWidth="3"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RecapStats = ({ row = false }) => (
  <div style={{
    display: "flex",
    flexDirection: row ? "row" : "column",
    gap: row ? 24 : 6,
  }}>
    {[
      ["nom", "shopify-admin-mcp"],
      ["endpoints", "23 / 47"],
      ["contexte", "−73%"],
      ["cible", "n8n · Airia"],
    ].map(([k, v], i) => (
      <div key={i} className="wf-col" style={{ gap: 2 }}>
        <span className="wf-caps">{k}</span>
        <span className="wf-mono" style={{
          fontSize: 12,
          color: k === "contexte" ? "var(--wf-success)" : "var(--wf-ink)",
        }}>{v}</span>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────
// V1 — Centered minimal
// ─────────────────────────────────────────────────────────────
const E4_V1 = () => (
  <div className="wf">
    <WfStamp label="v1 · centered" />
    <div className="wf-screen">
      <WfChrome crumb="slice / done" />
      <WfTopBar step={3} title="Terminé"
        right={<span className="wf-mute wf-mono" style={{ fontSize: 10 }}>3.2 s</span>} />

      <div style={{
        flex: 1, overflow: "auto",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "36px 32px 24px",
        gap: 22,
      }}>
        <WfCheck size={64} />

        <div className="wf-col" style={{ alignItems: "center", gap: 8, textAlign: "center" }}>
          <span className="wf-serif" style={{ fontSize: 38, lineHeight: 1 }}>
            Ton MCP est prêt.
          </span>
          <span className="wf-hand" style={{ fontSize: 14, maxWidth: 460 }}>
            On a packagé 23 endpoints dans un dossier propre. Tu télécharges, tu poses le .env, tu connectes.
          </span>
        </div>

        {/* recap badges */}
        <div className="wf-row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <span className="wf-chip wf-chip--on">shopify-admin-mcp</span>
          <span className="wf-chip">23 endpoints</span>
          <span className="wf-chip">−73% contexte</span>
          <span className="wf-chip">node 20+</span>
        </div>

        {/* primary CTA */}
        <div className="wf-row" style={{ gap: 8, marginTop: 4 }}>
          <span className="wf-btn wf-btn--primary wf-btn--lg" style={{ paddingLeft: 22, paddingRight: 22 }}>
            ↓ Télécharger le ZIP
          </span>
          <span className="wf-mute wf-mono" style={{ fontSize: 10, alignSelf: "center" }}>
            shopify-admin-mcp.zip · 84 ko
          </span>
        </div>

        {/* 3 steps */}
        <div className="wf-row" style={{ gap: 12, marginTop: 6, alignItems: "stretch" }}>
          {[
            ["1", "Télécharge le ZIP", "et décompresse"],
            ["2", "Configure .env", "ta clé API"],
            ["3", "Connecte l'agent", "snippet ↓"],
          ].map(([n, t, h]) => (
            <div key={n} className="wf-box" style={{ padding: 12, width: 168 }}>
              <span className="wf-serif" style={{ fontSize: 24 }}>{n}.</span>
              <div className="wf-mono" style={{ fontWeight: 600, fontSize: 12, marginTop: 2 }}>{t}</div>
              <div className="wf-hand" style={{ fontSize: 12 }}>{h}</div>
            </div>
          ))}
        </div>

        <div className="wf-row" style={{ gap: 18, marginTop: 4 }}>
          <span className="wf-btn wf-btn--ghost">↻ Revenir à la sélection</span>
          <span className="wf-btn wf-btn--ghost">＋ Générer un autre MCP</span>
        </div>
      </div>
    </div>

    <WfCallout x={606} y={132} text="checkmark sketchy" arrow="left" w={130} />
    <WfCallout x={28} y={356} text="3 étapes claires" arrow="right" w={130} />
  </div>
);

// ─────────────────────────────────────────────────────────────
// V2 — Two-column: left download + recap, right snippet tabs
// ─────────────────────────────────────────────────────────────
const E4_V2 = () => {
  const [tab, setTab] = React.useState("claude");
  return (
    <div className="wf">
      <WfStamp label="v2 · split + snippet" />
      <div className="wf-screen">
        <WfChrome crumb="slice / done" />
        <WfTopBar step={3} title="Terminé"
          right={<span className="wf-mute wf-mono" style={{ fontSize: 10 }}>généré en 3.2 s</span>} />

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* left */}
          <div style={{ flex: "0 0 340px", padding: "22px 22px", display: "flex", flexDirection: "column", gap: 16, borderRight: "1px solid var(--wf-line)" }}>
            <WfCheck size={40} />
            <div className="wf-col" style={{ gap: 6 }}>
              <span className="wf-caps">Étape 1 sur 3</span>
              <span className="wf-serif" style={{ fontSize: 26, lineHeight: 1 }}>
                Ton MCP est prêt.
              </span>
            </div>

            <div className="wf-box" style={{ padding: 14 }}>
              <div className="wf-row" style={{ marginBottom: 8 }}>
                <span className="wf-mono" style={{ fontWeight: 600 }}>shopify-admin-mcp.zip</span>
                <span style={{ flex: 1 }}></span>
                <span className="wf-mute" style={{ fontSize: 10 }}>84 ko</span>
              </div>
              <span className="wf-btn wf-btn--primary wf-btn--lg" style={{ width: "100%", justifyContent: "center" }}>
                ↓ Télécharger
              </span>
            </div>

            <RecapStats />

            <div className="wf-hr"></div>

            <div className="wf-col" style={{ gap: 4 }}>
              <span className="wf-caps">Et après ?</span>
              <div className="wf-hand" style={{ fontSize: 12 }}>1. décompresse</div>
              <div className="wf-hand" style={{ fontSize: 12 }}>2. édite <span className="wf-mono">.env</span> avec ta clé · <span className="wf-squiggle wf-mono" style={{ fontSize: 11 }}>voir doc</span></div>
              <div className="wf-hand" style={{ fontSize: 12 }}>3. colle le snippet ci-contre →</div>
            </div>

            <span style={{ flex: 1 }}></span>
            <div className="wf-row" style={{ gap: 8 }}>
              <span className="wf-btn wf-btn--ghost">↻ revenir</span>
              <span className="wf-btn wf-btn--ghost">＋ nouveau</span>
            </div>
          </div>

          {/* right: snippet */}
          <div style={{ flex: 1, padding: "22px 22px", display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
            <div className="wf-col" style={{ gap: 4 }}>
              <span className="wf-caps">Étape 3 — Connecte ton agent</span>
              <span className="wf-serif" style={{ fontSize: 19 }}>
                Copie le bon snippet pour ta cible.
              </span>
            </div>

            <div className="wf-tabs">
              {[
                ["claude", "Claude Desktop"],
                ["n8n", "n8n"],
                ["airia", "Airia"],
              ].map(([k, l]) => (
                <span key={k}
                  onClick={() => setTab(k)}
                  className={`wf-tab ${tab === k ? "wf-tab--on" : ""}`}>
                  {l}
                </span>
              ))}
            </div>

            <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
              <pre className="wf-code" style={{ margin: 0, height: "100%", overflow: "auto" }}>
                {SNIPPETS[tab]}
              </pre>
              <span className="wf-btn" style={{ position: "absolute", top: 8, right: 8 }}>
                [ copier ]
              </span>
            </div>

            <div className="wf-row" style={{ gap: 6 }}>
              <span className="wf-mute" style={{ fontSize: 10 }}>fichier à modifier :</span>
              <span className="wf-mono" style={{ fontSize: 11 }}>
                {tab === "claude" ? "~/Library/Application Support/Claude/claude_desktop_config.json"
                : tab === "n8n" ? "docker-compose.yml + .env"
                : "ton agent Airia"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <WfCallout x={336} y={108} text="le seul vrai bouton" arrow="left" w={130} />
      <WfCallout x={460} y={388} text="snippet par cible" arrow="up" w={130} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// V3 — Vertical stepper: dossier preview → snippet hero → footer
// ─────────────────────────────────────────────────────────────
const E4_V3 = () => (
  <div className="wf">
    <WfStamp label="v3 · stepper" />
    <div className="wf-screen">
      <WfChrome crumb="slice / done" />
      <WfTopBar step={3} title="Terminé" />

      <div style={{ flex: 1, overflow: "auto", padding: "20px 28px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* header row */}
        <div className="wf-row" style={{ gap: 14, alignItems: "flex-start" }}>
          <WfCheck size={42} />
          <div className="wf-col" style={{ gap: 4, flex: 1 }}>
            <span className="wf-serif" style={{ fontSize: 26, lineHeight: 1 }}>
              Ton MCP est prêt.
            </span>
            <span className="wf-hand" style={{ fontSize: 13 }}>
              <span className="wf-mono">shopify-admin-mcp</span> · 23 endpoints · <span style={{ color: "var(--wf-success)" }}>−73% contexte</span>
            </span>
          </div>
          <span className="wf-btn wf-btn--primary wf-btn--lg">↓ Télécharger le ZIP</span>
        </div>

        {/* stepper rows */}
        <div className="wf-col" style={{ gap: 0 }}>
          {/* step 1 */}
          <div className="wf-row" style={{ gap: 14, padding: "10px 0", borderTop: "1px solid var(--wf-line-soft)" }}>
            <span style={{
              width: 22, height: 22, borderRadius: 99, border: "1px solid var(--wf-ink)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontFamily: '"Fraunces", serif', fontStyle: "italic", fontSize: 14,
              flex: "0 0 22px",
            }}>1</span>
            <div className="wf-col" style={{ gap: 2, flex: 1 }}>
              <span className="wf-mono" style={{ fontWeight: 600 }}>Décompresse le dossier</span>
              <span className="wf-hand" style={{ fontSize: 12 }}>structure attendue :</span>
            </div>
            <div className="wf-code" style={{ width: 260, fontSize: 10, padding: "8px 10px" }}>
{`shopify-admin-mcp/
├─ dist/
├─ .env.example
├─ package.json
└─ README.md`}
            </div>
          </div>

          {/* step 2 */}
          <div className="wf-row" style={{ gap: 14, padding: "10px 0", borderTop: "1px solid var(--wf-line-soft)" }}>
            <span style={{
              width: 22, height: 22, borderRadius: 99, border: "1px solid var(--wf-ink)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontFamily: '"Fraunces", serif', fontStyle: "italic", fontSize: 14,
              flex: "0 0 22px",
            }}>2</span>
            <div className="wf-col" style={{ gap: 2, flex: 1 }}>
              <span className="wf-mono" style={{ fontWeight: 600 }}>Configure le .env</span>
              <span className="wf-hand" style={{ fontSize: 12 }}>
                copie <span className="wf-mono">.env.example</span> → <span className="wf-mono">.env</span> · <span className="wf-squiggle">voir la doc</span>
              </span>
            </div>
            <div className="wf-code" style={{ width: 260, fontSize: 10, padding: "8px 10px" }}>
{`SHOPIFY_API_KEY=…
SLICE_MCP_TOKEN=…  # auto-généré
PORT=7707`}
            </div>
          </div>

          {/* step 3 — main */}
          <div className="wf-row" style={{ gap: 14, padding: "12px 0 8px", borderTop: "1px solid var(--wf-line)" }}>
            <span style={{
              width: 22, height: 22, borderRadius: 99,
              background: "var(--wf-ink)", color: "var(--wf-bg)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontFamily: '"Fraunces", serif', fontStyle: "italic", fontSize: 14,
              flex: "0 0 22px",
            }}>3</span>
            <div className="wf-col" style={{ flex: 1, gap: 8 }}>
              <span className="wf-mono" style={{ fontWeight: 600 }}>Connecte l'agent</span>
              <div className="wf-tabs">
                {["Claude Desktop", "n8n", "Airia"].map((l, i) => (
                  <span key={l} className={`wf-tab ${i === 0 ? "wf-tab--on" : ""}`}>{l}</span>
                ))}
              </div>
              <div style={{ position: "relative" }}>
                <pre className="wf-code" style={{ margin: 0 }}>
                  {SNIPPETS.claude}
                </pre>
                <span className="wf-btn" style={{ position: "absolute", top: 8, right: 8 }}>[ copier ]</span>
              </div>
            </div>
          </div>
        </div>

        <div className="wf-row" style={{ marginTop: 4 }}>
          <span className="wf-btn wf-btn--ghost">↻ Revenir à la sélection</span>
          <span style={{ flex: 1 }}></span>
          <span className="wf-btn wf-btn--ghost">＋ Générer un autre MCP</span>
        </div>
      </div>
    </div>

    <WfCallout x={576} y={84} text="action principale en haut" arrow="left" w={150} />
    <WfCallout x={32} y={336} text="step 3 = focus visuel" arrow="right" w={130} />
  </div>
);

Object.assign(window, { E4_V1, E4_V2, E4_V3 });
