/* SLICE hi-fi — Écran 1 : Upload (Pure minimal)
   States: default, over, uploading, error, parsed (auto-advance)
*/

const HiFi1 = ({ onParsed, onReset }) => {
  const [state, setState] = React.useState("default"); // default | over | uploading | error
  const [progress, setProgress] = React.useState(0);
  const [fileName, setFileName] = React.useState("");
  const fileRef = React.useRef(null);

  // Fake parse — runs progress 0 → 100 then calls onParsed.
  const startUpload = React.useCallback((name) => {
    setFileName(name);
    setState("uploading");
    setProgress(8);
    const ticks = [
      [220, 28], [460, 52], [820, 74], [1140, 92], [1480, 100],
    ];
    ticks.forEach(([ms, p]) => setTimeout(() => setProgress(p), ms));
    setTimeout(() => { onParsed && onParsed(); }, 1700);
  }, [onParsed]);

  const pickFile = () => fileRef.current && fileRef.current.click();

  const handleFiles = (files) => {
    if (!files || !files.length) return;
    const f = files[0];
    const ok = /\.(ya?ml|json)$/i.test(f.name);
    if (!ok) {
      setFileName(f.name);
      setState("error");
      return;
    }
    startUpload(f.name);
  };

  const dropProps = {
    onDragOver: (e) => { e.preventDefault(); setState((s) => s === "uploading" ? s : "over"); },
    onDragLeave: () => setState((s) => s === "over" ? "default" : s),
    onDrop: (e) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    onClick: () => state === "uploading" ? null : pickFile(),
  };

  return (
    <div className="scr scr-1" style={{
      flex: 1,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px",
      position: "relative",
    }}>
      <input ref={fileRef} type="file" accept=".json,.yaml,.yml,application/json,text/yaml"
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)} />

      {/* Headline cluster */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 14, marginBottom: 36, maxWidth: 720, textAlign: "center",
      }}>
        <span className="eyebrow">curated MCP servers for AI agents</span>
        <h1 className="h1" style={{ maxWidth: 560, fontSize: 56 }}>
          Donne-moi ta spec.<br/>
          Je te rends un <em style={{ fontStyle: "italic" }}>MCP propre</em>.
        </h1>
        <p className="soft" style={{
          maxWidth: 520, fontSize: 13.5, marginTop: 4,
        }}>
          Sélectionne uniquement les endpoints dont ton agent a besoin.
          On livre un dossier prêt à brancher en moins de 5 min.
        </p>
      </div>

      {/* Dropzone — single primary action */}
      <div style={{ width: "100%", maxWidth: 560 }}>
        <div
          className={`dropzone ${state === "over" ? "is-over" : ""} ${state === "error" ? "is-error" : ""}`}
          {...dropProps}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pickFile()}
          aria-label="Déposer un fichier OpenAPI"
        >
          {state === "uploading" ? (
            <>
              <UploadSpinner />
              <div className="col-v" style={{ alignItems: "center", gap: 8, width: "100%", maxWidth: 360 }}>
                <div className="row-h" style={{ gap: 8 }}>
                  <span className="font-mono" style={{ fontSize: 13, color: "var(--ink)" }}>{fileName}</span>
                  <span className="mute" style={{ fontSize: 12 }}>· lecture</span>
                </div>
                <div className="progress" style={{ width: "100%" }}>
                  <i style={{ width: `${progress}%` }}></i>
                </div>
                <span className="mute" style={{ fontSize: 11 }}>
                  {progress < 40 ? "déballage…" :
                   progress < 80 ? "47 endpoints détectés" :
                   progress < 100 ? "finalisation…" : "ouverture de l'étape 2"}
                </span>
              </div>
            </>
          ) : state === "error" ? (
            <>
              <ErrorMark />
              <div className="col-v" style={{ alignItems: "center", gap: 8, textAlign: "center" }}>
                <span className="h3" style={{ color: "var(--ink)" }}>Hmm. Ce fichier ne ressemble pas à une spec OpenAPI.</span>
                <span className="soft" style={{ fontSize: 12.5, maxWidth: 380 }}>
                  On attend du <span className="font-mono" style={{ color: "var(--ink)" }}>.json</span> ou <span className="font-mono" style={{ color: "var(--ink)" }}>.yaml</span> avec un champ <span className="font-mono" style={{ color: "var(--ink)" }}>openapi</span> ou <span className="font-mono" style={{ color: "var(--ink)" }}>swagger</span> en racine.
                </span>
                <div className="row-h" style={{ gap: 8, marginTop: 6 }}>
                  <button className="btn btn--sm" onClick={(e) => { e.stopPropagation(); setState("default"); pickFile(); }}>↻ réessayer</button>
                  <button className="btn btn--ghost btn--sm" onClick={(e) => { e.stopPropagation(); startUpload("petstore.yaml"); }}>charger un exemple →</button>
                </div>
              </div>
            </>
          ) : (
            <>
              <UploadIcon active={state === "over"} />
              <div className="col-v" style={{ alignItems: "center", gap: 6 }}>
                <span className="h3" style={{ color: "var(--ink)" }}>
                  {state === "over" ? "Lâche pour démarrer." : "Glisse ta spec ici."}
                </span>
                <span className="soft" style={{ fontSize: 12.5 }}>
                  Fichier OpenAPI <span className="font-mono" style={{ color: "var(--ink)" }}>.json</span> ou <span className="font-mono" style={{ color: "var(--ink)" }}>.yaml</span> · 10 Mo max
                </span>
              </div>
              {state !== "over" && (
                <div className="row-h" style={{ gap: 10, marginTop: 4 }}>
                  <button className="btn" onClick={(e) => { e.stopPropagation(); pickFile(); }}>
                    Choisir un fichier…
                  </button>
                  <span className="hint">
                    <span className="kbd">⌘</span><span className="kbd">V</span> coller une URL
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* tertiary helpers under the dropzone */}
        {(state === "default" || state === "over") && (
          <div className="row-h" style={{
            justifyContent: "center", gap: 18, marginTop: 18,
            fontSize: 11.5, color: "var(--ink-mute)",
          }}>
            <span>↗ Petstore exemple</span>
            <span className="faint">·</span>
            <span>aucune donnée n'est conservée côté serveur</span>
          </div>
        )}
      </div>

      {/* corner stamp */}
      <span className="corner-stamp">round 02 · hi-fi</span>
    </div>
  );
};

// — icons —

const UploadIcon = ({ active }) => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none"
    style={{ color: active ? "var(--ink)" : "var(--ink-soft)" }}>
    <rect x="8" y="6" width="32" height="36" rx="3"
      stroke="currentColor" strokeWidth="1.4" />
    <path d="M 14 16 L 26 16 M 14 22 L 34 22 M 14 28 L 30 28 M 14 34 L 22 34"
      stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    <circle cx="36" cy="36" r="9" fill="var(--bg-card)" stroke="currentColor" strokeWidth="1.4" />
    <path d="M 36 32 L 36 40 M 32.5 35.5 L 36 32 L 39.5 35.5"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UploadSpinner = () => (
  <svg width="44" height="44" viewBox="0 0 44 44">
    <circle cx="22" cy="22" r="17" fill="none" stroke="var(--line-soft)" strokeWidth="2" />
    <path d="M 22 5 A 17 17 0 0 1 39 22" fill="none"
      stroke="var(--ink)" strokeWidth="2" strokeLinecap="round">
      <animateTransform attributeName="transform" type="rotate"
        from="0 22 22" to="360 22 22" dur="1.05s" repeatCount="indefinite" />
    </path>
  </svg>
);

const ErrorMark = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" style={{ color: "var(--error)" }}>
    <circle cx="22" cy="22" r="17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" />
    <path d="M 16 16 L 28 28 M 28 16 L 16 28"
      fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

Object.assign(window, { HiFi1 });
