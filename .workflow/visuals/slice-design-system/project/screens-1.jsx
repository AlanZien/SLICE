/* Écran 1 — Landing / Upload
   3 layouts + 1 states sheet (default/hover/uploading/error)
*/

// ──────────────────────────────────────────────────────────────
// Building blocks
// ──────────────────────────────────────────────────────────────
const E1Wordmark = ({ size = 16 }) => (
  <span style={{
    fontFamily: '"JetBrains Mono", monospace',
    fontWeight: 600,
    letterSpacing: "0.18em",
    fontSize: size,
    color: "var(--wf-ink)",
  }}>SLICE</span>
);

const E1Tagline = ({ size = 14, hand = false }) => hand ? (
  <span className="wf-hand" style={{ fontSize: size }}>
    Curated MCP servers for AI agents.
  </span>
) : (
  <span className="wf-serif" style={{ fontSize: size }}>
    Curated MCP servers for AI agents.
  </span>
);

const E1Footer = () => (
  <div className="wf-row" style={{
    padding: "10px 20px",
    borderTop: "1px solid var(--wf-line-soft)",
    fontSize: 10,
    color: "var(--wf-ink-mute)",
    letterSpacing: "0.06em",
  }}>
    <span className="wf-mono">made by · @clem</span>
    <span style={{ flex: 1 }}></span>
    <span className="wf-mono" style={{ marginRight: 14 }}>open source ↗</span>
    <span className="wf-mono" style={{ marginRight: 14 }}>docs ↗</span>
    <span className="wf-mono">v0.3.1</span>
  </div>
);

// Dropzone with state-dependent presentation.
const Dropzone = ({ state = "default", small = false }) => {
  const padding = small ? 22 : 36;
  const isHover     = state === "hover";
  const isUploading = state === "uploading";
  const isError     = state === "error";

  return (
    <div className="wf-drop" style={{
      padding,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: small ? 10 : 16,
      borderColor: isHover ? "var(--wf-ink)"
                : isError ? "var(--wf-error)"
                : "var(--wf-line-strong)",
      borderWidth: isHover ? 2 : 1.5,
      background: isHover ? "var(--wf-line-soft)" : "transparent",
      position: "relative",
      minHeight: small ? 140 : 200,
    }}>
      {/* state-dependent icon */}
      {isUploading ? (
        <svg width={small ? 32 : 44} height={small ? 32 : 44} viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" fill="none"
                  stroke="var(--wf-line-soft)" strokeWidth="2" />
          <path d="M 22 4 A 18 18 0 0 1 40 22"
                fill="none" stroke="var(--wf-ink)" strokeWidth="2"
                strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate"
              from="0 22 22" to="360 22 22" dur="1.2s" repeatCount="indefinite" />
          </path>
        </svg>
      ) : isError ? (
        <svg width={small ? 32 : 44} height={small ? 32 : 44} viewBox="0 0 44 44" style={{ color: "var(--wf-error)" }}>
          <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 3" />
          <path d="M 16 16 L 28 28 M 28 16 L 16 28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width={small ? 36 : 48} height={small ? 30 : 40} viewBox="0 0 48 40" style={{
          color: isHover ? "var(--wf-ink)" : "var(--wf-ink-soft)",
        }}>
          {/* sketchy folded sheet of paper */}
          <path d="M 8 4 L 30 4 L 40 14 L 40 36 L 8 36 Z"
                fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinejoin="round" />
          <path d="M 30 4 L 30 14 L 40 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          {/* down arrow */}
          <path d="M 24 16 L 24 28 M 18 23 L 24 29 L 30 23"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}

      {/* state copy */}
      {isUploading ? (
        <>
          <span className="wf-mono" style={{ fontSize: 13 }}>
            Lecture de <span style={{ color: "var(--wf-ink)" }}>shopify-admin.yaml</span>…
          </span>
          <div style={{ width: "70%", height: 5, background: "var(--wf-line-soft)", borderRadius: 99, overflow: "hidden", maxWidth: 320 }}>
            <div style={{ width: "62%", height: "100%", background: "var(--wf-ink)" }}></div>
          </div>
          <span className="wf-mute wf-mono" style={{ fontSize: 10 }}>
            47 endpoints détectés · presque fini
          </span>
        </>
      ) : isError ? (
        <>
          <span className="wf-mono" style={{ fontSize: 13, color: "var(--wf-error)" }}>
            Hmm. Ce fichier ne ressemble pas à une spec OpenAPI.
          </span>
          <span className="wf-mute wf-mono" style={{ fontSize: 11, textAlign: "center", maxWidth: 360 }}>
            On attend du JSON ou du YAML avec un champ <span className="wf-mono" style={{ color: "var(--wf-ink-soft)" }}>openapi</span> ou <span className="wf-mono" style={{ color: "var(--wf-ink-soft)" }}>swagger</span> en racine.
          </span>
          <div className="wf-row" style={{ gap: 8 }}>
            <span className="wf-btn">↻ réessayer</span>
            <span className="wf-btn wf-btn--ghost">voir un exemple</span>
          </div>
        </>
      ) : (
        <>
          <span className={small ? "wf-serif" : "wf-serif"} style={{ fontSize: small ? 16 : 22 }}>
            {isHover ? "Lâche pour démarrer." : "Glisse ta spec ici."}
          </span>
          <span className="wf-hand" style={{ fontSize: small ? 12 : 14, textAlign: "center" }}>
            Fichier OpenAPI <span className="wf-mono">.json</span> ou <span className="wf-mono">.yaml</span> · 10 Mo max
          </span>
          {!isHover && (
            <span className="wf-row" style={{ gap: 10 }}>
              <span className="wf-btn">{small ? "Choisir un fichier" : "Choisir un fichier…"}</span>
              <span className="wf-mute" style={{ fontSize: 10 }}>ou colle une URL</span>
            </span>
          )}
        </>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
// V1 — Pure minimal: just wordmark + tagline + dropzone, centered
// ──────────────────────────────────────────────────────────────
const E1_V1 = () => (
  <div className="wf">
    <WfStamp label="v1 · pure minimal" />
    <div className="wf-screen">
      <WfChrome crumb="slice / new" actions={<span className="wf-mute wf-mono" style={{ fontSize: 10 }}>github ↗ · docs</span>} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px", gap: 28 }}>
        <div className="wf-col" style={{ alignItems: "center", gap: 10 }}>
          <E1Wordmark size={26} />
          <span className="wf-serif" style={{ fontSize: 32, textAlign: "center", lineHeight: 1.1 }}>
            Curated MCP servers <br/>for AI agents.
          </span>
          <span className="wf-hand" style={{ fontSize: 14, color: "var(--wf-ink-mute)" }}>
            une spec OpenAPI · les endpoints utiles · un MCP propre.
          </span>
        </div>

        <div style={{ width: "100%", maxWidth: 560 }}>
          <Dropzone state="default" />
        </div>

        <div className="wf-row" style={{ gap: 18 }}>
          <span className="wf-mute" style={{ fontSize: 11 }}>
            <span className="wf-kbd">⌘</span> <span className="wf-kbd">V</span> pour coller une URL
          </span>
          <span className="wf-mute" style={{ fontSize: 11 }}>
            ↗ exemple: petstore.swagger.io
          </span>
        </div>
      </div>

      <E1Footer />
    </div>

    <WfCallout x={36} y={210} text="wordmark + tagline · rien d'autre" arrow="right" w={170} />
    <WfCallout x={622} y={398} text="dropzone = action principale" arrow="left" w={150} />
  </div>
);

// ──────────────────────────────────────────────────────────────
// V2 — Split editorial: large tagline left · dropzone right
// ──────────────────────────────────────────────────────────────
const E1_V2 = () => (
  <div className="wf">
    <WfStamp label="v2 · split editorial" />
    <div className="wf-screen">
      {/* top nav */}
      <div style={{ height: 44, display: "flex", alignItems: "center", padding: "0 22px", borderBottom: "1px solid var(--wf-line-soft)" }}>
        <E1Wordmark size={13} />
        <span style={{ flex: 1 }}></span>
        <div className="wf-row" style={{ gap: 14, fontSize: 11, color: "var(--wf-ink-soft)" }}>
          <span className="wf-mono">docs</span>
          <span className="wf-mono">github ↗</span>
          <span className="wf-mono wf-mute">v0.3</span>
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, minHeight: 0 }}>
        {/* left: editorial */}
        <div style={{ padding: "44px 32px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, borderRight: "1px solid var(--wf-line-soft)" }}>
          <span className="wf-caps">une web app, trois étapes</span>
          <span className="wf-serif" style={{ fontSize: 44, lineHeight: 1.05 }}>
            Curated MCP <br/>
            servers for <br/>
            <span style={{ textDecoration: "underline", textDecorationStyle: "wavy", textDecorationColor: "var(--wf-ink-mute)" }}>AI agents</span>.
          </span>
          <span className="wf-hand" style={{ fontSize: 14, maxWidth: 320 }}>
            Tu uploades une spec OpenAPI. Tu coches les endpoints utiles. SLICE te livre un MCP propre, en 5 min.
          </span>
          <div className="wf-row" style={{ gap: 8, marginTop: 4 }}>
            <span className="wf-chip">−60 à −80% de contexte</span>
            <span className="wf-chip">node + http</span>
          </div>
        </div>

        {/* right: dropzone */}
        <div style={{ padding: "32px 28px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
          <Dropzone state="default" />
          <div className="wf-hr"></div>
          <div className="wf-col" style={{ gap: 6 }}>
            <span className="wf-caps">ou colle une URL de spec</span>
            <div className="wf-input" style={{ gap: 6 }}>
              <span className="wf-mute wf-mono">https://</span>
              <span className="wf-mute" style={{ flex: 1 }}>api.stripe.com/openapi.yaml</span>
              <span className="wf-btn wf-btn--primary" style={{ height: 22, fontSize: 10 }}>↵ go</span>
            </div>
          </div>
        </div>
      </div>

      <E1Footer />
    </div>

    <WfCallout x={300} y={108} text="serif italic = âme du brand" arrow="down" w={150} />
    <WfCallout x={620} y={386} text="URL = path alternatif" arrow="left" w={140} />
  </div>
);

// ──────────────────────────────────────────────────────────────
// V3 — Dropzone hero + sample specs row + tagline above
// ──────────────────────────────────────────────────────────────
const E1_V3 = () => (
  <div className="wf">
    <WfStamp label="v3 · dropzone hero" />
    <div className="wf-screen">
      <WfChrome crumb="slice / new" />
      <div style={{ height: 36, display: "flex", alignItems: "center", padding: "0 22px", borderBottom: "1px solid var(--wf-line-soft)" }}>
        <E1Wordmark size={13} />
        <span style={{ flex: 1 }}></span>
        <span className="wf-mute wf-mono" style={{ fontSize: 10 }}>0 spec uploadée jusqu'ici</span>
      </div>

      <div style={{ flex: 1, padding: "30px 36px 20px", display: "flex", flexDirection: "column", gap: 22 }}>
        {/* tiny tagline strip */}
        <div className="wf-row" style={{ alignItems: "baseline", gap: 14 }}>
          <span className="wf-serif" style={{ fontSize: 28, lineHeight: 1 }}>
            Donne-moi ta spec.
          </span>
          <span className="wf-hand" style={{ fontSize: 14 }}>
            Je te rends un MCP allégé pour ton agent.
          </span>
        </div>

        {/* big dropzone */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <Dropzone state="default" />
        </div>

        {/* sample / tail row */}
        <div className="wf-col" style={{ gap: 8 }}>
          <span className="wf-caps">ou démarre avec un exemple</span>
          <div className="wf-row" style={{ gap: 8, flexWrap: "wrap" }}>
            {[
              ["Stripe", "324 endpoints"],
              ["Shopify Admin", "47 endpoints"],
              ["GitHub", "892 endpoints"],
              ["PetStore", "20 endpoints"],
              ["Notion", "31 endpoints"],
            ].map(([n, c]) => (
              <div key={n} className="wf-box wf-box--soft" style={{ padding: "6px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                <span className="wf-mono" style={{ fontWeight: 500, fontSize: 11 }}>{n}</span>
                <span className="wf-mute wf-mono" style={{ fontSize: 10 }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <E1Footer />
    </div>

    <WfCallout x={42} y={416} text="exemples = preuve sociale" arrow="down" w={150} />
  </div>
);

// ──────────────────────────────────────────────────────────────
// V4 — States sheet: default / hover / uploading / error (2×2)
// ──────────────────────────────────────────────────────────────
const E1_STATES = () => {
  const Tile = ({ label, hint, state }) => (
    <div className="wf-box" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8, background: "var(--wf-bg)" }}>
      <div className="wf-row" style={{ alignItems: "baseline" }}>
        <span className="wf-caps">{label}</span>
        <span style={{ flex: 1 }}></span>
        <span className="wf-mute wf-mono" style={{ fontSize: 9 }}>{hint}</span>
      </div>
      <Dropzone state={state} small />
    </div>
  );

  return (
    <div className="wf">
      <WfStamp label="× états" />
      <div className="wf-screen">
        <WfChrome crumb="slice / states · dropzone" />
        <div style={{ padding: "18px 20px 10px", display: "flex", flexDirection: "column", gap: 4, borderBottom: "1px solid var(--wf-line-soft)" }}>
          <span className="wf-serif" style={{ fontSize: 20 }}>Les 4 états de la dropzone.</span>
          <span className="wf-hand" style={{ fontSize: 13 }}>
            même composant, même footprint — la copie et l'icône changent.
          </span>
        </div>

        <div style={{ flex: 1, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 14, overflow: "hidden" }}>
          <Tile label="Default" hint="au repos" state="default" />
          <Tile label="Hover · drag-over" hint="fichier au-dessus" state="hover" />
          <Tile label="Uploading" hint="lecture + parsing" state="uploading" />
          <Tile label="Error" hint="fichier non valide" state="error" />
        </div>
      </div>

      <WfCallout x={420} y={140} text="bordure pleine + fond léger" arrow="left" w={150} />
      <WfCallout x={36} y={460} text="erreur explicite, pas une alerte rouge" arrow="right" w={170} />
    </div>
  );
};

Object.assign(window, { E1_V1, E1_V2, E1_V3, E1_STATES });
