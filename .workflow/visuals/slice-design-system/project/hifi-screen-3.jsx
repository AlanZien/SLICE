/* SLICE hi-fi — Écran 3 : Configuration (Split + live preview) */

const HiFi3 = ({ onBack, onGenerate, pickedCount, economy }) => {
  const [name, setName] = React.useState("shopify-admin-mcp");
  const [baseUrl, setBaseUrl] = React.useState(window.SLICE_DATA.baseUrl);
  const [auth, setAuth] = React.useState("key");           // none | key | bearer
  const [dest, setDest] = React.useState("remote");        // local | remote | both
  const [advanced, setAdvanced] = React.useState(false);
  const [opts, setOpts] = React.useState({
    httpToken: true,
    detailedParams: true,
    retries: false,
  });
  const [generating, setGenerating] = React.useState(false);

  const destMeta = {
    local:  { label: "Sur mon ordi",            apps: ["Claude Desktop", "Cursor", "Windsurf"], spec: "stdio" },
    remote: { label: "Sur un serveur en ligne", apps: ["n8n", "Airia", "Zapier"],               spec: "http" },
    both:   { label: "Les deux",                apps: ["local + distant"],                       spec: "stdio + http" },
  };

  const fire = () => {
    setGenerating(true);
    setTimeout(() => onGenerate({ name, baseUrl, auth, dest, opts }), 1700);
  };

  return (
    <div className="scr scr-3" style={{ flex: 1, display: "flex", minHeight: 0 }}>

      {/* LEFT — form */}
      <section className="scroll" style={{
        flex: 1,
        padding: "26px 32px 100px",
        display: "flex", flexDirection: "column", gap: 26,
        minWidth: 0,
      }}>
        {/* Heading */}
        <div className="col-v" style={{ gap: 8, maxWidth: 560 }}>
          <span className="eyebrow">étape 3 sur 3 · configuration</span>
          <h2 className="h2" style={{ fontSize: 32 }}>
            Donne-lui un nom et dis-nous où il vivra.
          </h2>
          <p className="soft" style={{ fontSize: 13.5, marginTop: 2 }}>
            Tout est pré-rempli depuis la spec. Vérifie, ajuste si besoin, puis génère.
          </p>
        </div>

        {/* Identity */}
        <div className="col-v" style={{ gap: 14, maxWidth: 560 }}>
          <Field label="Nom du serveur MCP"
            hint="auto-détecté depuis le titre de la spec"
            value={name} onChange={setName} mono prefix="@" />
          <Field label="URL de base de l'API"
            value={baseUrl} onChange={setBaseUrl} mono />

          {/* Auth */}
          <div className="col-v" style={{ gap: 8 }}>
            <label className="eyebrow">Authentification amont</label>
            <div className="row-h" style={{ gap: 6, flexWrap: "wrap" }}>
              <AuthOption k="none"   value={auth} onChange={setAuth} title="Aucune"      hint="API publique" />
              <AuthOption k="key"    value={auth} onChange={setAuth} title="Clé API"     hint={`header · ${window.SLICE_DATA.authHeader}`} detected />
              <AuthOption k="bearer" value={auth} onChange={setAuth} title="Bearer token" hint="Authorization: Bearer …" />
            </div>
          </div>
        </div>

        {/* THE big question */}
        <div className="col-v" style={{ gap: 12 }}>
          <span className="eyebrow">la seule vraie question</span>
          <h3 className="h2" style={{ fontSize: 26 }}>
            Où ton agent va l'utiliser ?
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <DestCard id="local"  on={dest === "local"}  onPick={() => setDest("local")}
              title="Sur mon ordi"
              blurb="L'agent lit ton MCP en local."
              apps={destMeta.local.apps} spec={destMeta.local.spec}
              icon={IconLocal} />
            <DestCard id="remote" on={dest === "remote"} onPick={() => setDest("remote")}
              title="Sur un serveur en ligne"
              blurb="Le MCP est exposé en HTTP, accessible depuis n'importe quel agent cloud."
              apps={destMeta.remote.apps} spec={destMeta.remote.spec}
              icon={IconCloud} />
            <DestCard id="both"   on={dest === "both"}   onPick={() => setDest("both")}
              title="Les deux"
              blurb="On génère les deux modes côte à côte."
              apps={destMeta.both.apps} spec={destMeta.both.spec}
              icon={IconBoth} />
          </div>
        </div>

        {/* Advanced */}
        <div className="card" style={{ padding: 0, overflow: "hidden", maxWidth: 720 }}>
          <button onClick={() => setAdvanced(!advanced)}
            style={{
              all: "unset", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px",
              width: "100%",
              borderBottom: advanced ? "1px solid var(--line)" : "none",
            }}>
            <span style={{ transform: advanced ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 160ms ease", color: "var(--ink-mute)" }}>▸</span>
            <span className="font-mono" style={{ fontSize: 12.5, color: "var(--ink)" }}>⚙ Options avancées</span>
            <span className="mute" style={{ fontSize: 11 }}>· token HTTP, descriptions détaillées, retries</span>
            <span className="grow"></span>
            {!advanced && <span className="chip" style={{ pointerEvents: "none" }}>3 options</span>}
          </button>
          {advanced && (
            <div className="col-v" style={{ padding: "12px 14px 14px", gap: 4 }}>
              <ToggleRow on={opts.httpToken} onToggle={() => setOpts({ ...opts, httpToken: !opts.httpToken })}
                title="Token de sécurité HTTP"
                hint="auto-généré · injecté dans le .env" />
              <ToggleRow on={opts.detailedParams} onToggle={() => setOpts({ ...opts, detailedParams: !opts.detailedParams })}
                title="Descriptions détaillées des paramètres"
                hint="meilleur pour les agents, +12% de contexte" />
              <ToggleRow on={opts.retries} onToggle={() => setOpts({ ...opts, retries: !opts.retries })}
                title="Retries automatiques sur 5xx"
                hint="3 tentatives, backoff exponentiel" />
            </div>
          )}
        </div>
      </section>

      {/* RIGHT — preview */}
      <aside style={{
        width: 380,
        borderLeft: "1px solid var(--line)",
        background: "var(--bg-soft)",
        display: "flex", flexDirection: "column",
        minHeight: 0,
      }}>
        <div className="scroll" style={{ flex: 1, padding: "26px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="row-h">
            <span className="eyebrow">aperçu live</span>
            <span className="grow"></span>
            <span className="hint pulse"><span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--success)", display: "inline-block" }}></span> sync</span>
          </div>

          {/* MCP package card */}
          <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="row-h" style={{ gap: 8 }}>
              <span className="font-mono" style={{ color: "var(--ink-mute)", fontSize: 12 }}>@</span>
              <span className="h3" style={{ fontSize: 18 }}>{name || "untitled-mcp"}</span>
              <span className="grow"></span>
              <span className="chip" style={{ cursor: "default" }}>v0.1.0</span>
            </div>
            <div className="row-h" style={{ gap: 10, flexWrap: "wrap" }}>
              <span className="chip" style={{ cursor: "default" }}>{pickedCount} endpoints</span>
              <span className="chip" style={{ cursor: "default", color: "var(--success)" }}>−{economy}% contexte</span>
              <span className="chip" style={{ cursor: "default" }}>{destMeta[dest].spec}</span>
              <span className="chip" style={{ cursor: "default" }}>
                {auth === "none" ? "no auth" : auth === "key" ? "api key" : "bearer"}
              </span>
            </div>
            <div className="divider"></div>
            <div className="col-v" style={{ gap: 5 }}>
              {[
                ["tools.products.list",         "GET"],
                ["tools.products.get",          "GET"],
                ["tools.products.variants_get", "GET"],
                ["tools.orders.list",           "GET"],
                ["tools.orders.status_set",     "PUT"],
                ["tools.customers.search",      "GET"],
              ].map(([k, m]) => (
                <div key={k} className="row-h" style={{ justifyContent: "space-between", fontSize: 11.5 }}>
                  <span className="font-mono soft">{k}</span>
                  <Method m={m} />
                </div>
              ))}
              <span className="mute" style={{ fontSize: 11, marginTop: 2 }}>
                + {Math.max(0, pickedCount - 6)} autres…
              </span>
            </div>
          </div>

          {/* Structure preview */}
          <div className="col-v" style={{ gap: 8 }}>
            <span className="eyebrow">contenu du ZIP</span>
            <pre className="code" style={{ fontSize: 11.5, padding: "12px 14px" }}>
{`${name}/
├─ dist/
│  ├─ index.js          ${dest === "local" || dest === "both" ? "✓" : "—"}  stdio
│  └─ http.js           ${dest === "remote" || dest === "both" ? "✓" : "—"}  http
├─ .env.example
├─ package.json
└─ README.md`}
            </pre>
          </div>

          {/* what happens next */}
          <div className="col-v" style={{ gap: 6 }}>
            <span className="eyebrow">après génération</span>
            <ol className="col-v" style={{ gap: 4, padding: 0, margin: 0, listStyle: "none", color: "var(--ink-soft)", fontSize: 12 }}>
              <li><span className="font-serif" style={{ fontSize: 14, color: "var(--ink)", marginRight: 6 }}>1.</span> Tu télécharges le ZIP.</li>
              <li><span className="font-serif" style={{ fontSize: 14, color: "var(--ink)", marginRight: 6 }}>2.</span> Tu configures le <span className="font-mono" style={{ color: "var(--ink)" }}>.env</span>.</li>
              <li><span className="font-serif" style={{ fontSize: 14, color: "var(--ink)", marginRight: 6 }}>3.</span> Tu colles le snippet dans ton agent.</li>
            </ol>
          </div>
        </div>

        {/* Generate */}
        <div style={{
          padding: "14px 22px",
          borderTop: "1px solid var(--line)",
          background: "var(--bg)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <button className="btn btn--ghost" onClick={onBack}>← Sélection</button>
          <span className="grow"></span>
          <button className="btn btn--primary btn--lg" onClick={fire} disabled={generating}
            style={{ opacity: generating ? 0.7 : 1 }}>
            {generating ? (
              <>
                <span className="dot-pulse">·</span> Génération…
              </>
            ) : (
              <>Générer mon MCP →</>
            )}
          </button>
        </div>
      </aside>
    </div>
  );
};

// — sub components —

const Field = ({ label, hint, value, onChange, mono, prefix }) => (
  <div className="col-v" style={{ gap: 6 }}>
    <label className="eyebrow">{label}</label>
    <div className="input">
      {prefix && <span className="leading font-mono">{prefix}</span>}
      <input value={value} onChange={(e) => onChange(e.target.value)}
        style={{ fontFamily: mono ? '"JetBrains Mono", monospace' : "inherit" }} />
      <span className="mute" style={{ fontSize: 11 }}>✎</span>
    </div>
    {hint && <span className="mute" style={{ fontSize: 11 }}>{hint}</span>}
  </div>
);

const AuthOption = ({ k, value, onChange, title, hint, detected }) => {
  const on = value === k;
  return (
    <div onClick={() => onChange(k)}
      style={{
        flex: "1 1 160px", minWidth: 160,
        padding: "10px 12px",
        border: `1px solid ${on ? "var(--ink)" : "var(--line)"}`,
        background: on ? "var(--bg-card-2)" : "var(--bg-soft)",
        borderRadius: 6,
        cursor: "pointer",
        display: "flex", flexDirection: "column", gap: 4,
        transition: "border-color 120ms ease, background 120ms ease",
        position: "relative",
      }}>
      <div className="row-h" style={{ gap: 8 }}>
        <span className={`radio ${on ? "on" : ""}`}></span>
        <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{title}</span>
        {detected && <span className="chip" style={{ marginLeft: "auto", cursor: "default", fontSize: 9.5, padding: "1px 7px", color: "var(--success)" }}>auto</span>}
      </div>
      <span className="mute" style={{ fontSize: 11 }}>{hint}</span>
    </div>
  );
};

const DestCard = ({ on, onPick, title, blurb, apps, spec, icon: Icon }) => (
  <div onClick={onPick}
    style={{
      position: "relative",
      padding: 14,
      border: `1px solid ${on ? "var(--ink)" : "var(--line)"}`,
      background: on ? "var(--bg-card-2)" : "var(--bg-card)",
      borderRadius: 8,
      cursor: "pointer",
      display: "flex", flexDirection: "column", gap: 10,
      transition: "border-color 120ms ease, background 120ms ease, transform 80ms ease",
      boxShadow: on ? "var(--shadow-focus)" : "var(--shadow-card)",
    }}>
    <div className="row-h">
      <Icon active={on} />
      <span className="grow"></span>
      <span className={`radio ${on ? "on" : ""}`}></span>
    </div>
    <div className="col-v" style={{ gap: 4 }}>
      <span className="h3" style={{ fontSize: 16 }}>{title}</span>
      <span className="soft" style={{ fontSize: 11.5, lineHeight: 1.4 }}>{blurb}</span>
    </div>
    <div className="row-h" style={{ gap: 4, flexWrap: "wrap" }}>
      {apps.map((a) => <span key={a} className="chip" style={{ cursor: "default", fontSize: 10 }}>{a}</span>)}
    </div>
    <span className="font-mono mute" style={{ position: "absolute", right: 12, bottom: 10, fontSize: 9.5, letterSpacing: "0.08em" }}>{spec}</span>
  </div>
);

const ToggleRow = ({ on, onToggle, title, hint }) => (
  <div className="row-h" style={{ padding: "8px 0", gap: 10 }}>
    <button onClick={onToggle}
      style={{
        all: "unset", cursor: "pointer",
        width: 30, height: 18,
        background: on ? "var(--ink)" : "var(--bg-elev)",
        border: `1px solid ${on ? "var(--ink)" : "var(--line-strong)"}`,
        borderRadius: 99,
        position: "relative",
        transition: "background 140ms ease, border-color 140ms ease",
        flex: "0 0 30px",
      }}>
      <span style={{
        position: "absolute", top: 2, left: on ? 14 : 2,
        width: 12, height: 12, borderRadius: 99,
        background: on ? "var(--bg)" : "var(--ink-soft)",
        transition: "left 140ms ease",
      }}></span>
    </button>
    <div className="col-v" style={{ flex: 1 }}>
      <span style={{ fontSize: 13, color: "var(--ink)" }}>{title}</span>
      <span className="mute" style={{ fontSize: 11 }}>{hint}</span>
    </div>
  </div>
);

// destination icons
const IconLocal = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: active ? "var(--ink)" : "var(--ink-soft)" }}>
    <rect x="2.5" y="3.5" width="15" height="11" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M 7 14.5 L 7 16.5 L 13 16.5 L 13 14.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M 5 17 L 15 17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
const IconCloud = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: active ? "var(--ink)" : "var(--ink-soft)" }}>
    <path d="M 5.5 14 Q 2 14 2 11 Q 2 8 5 8 Q 5 4.5 9 4.5 Q 13 4.5 13.5 8 Q 17.5 8 17.5 11 Q 17.5 14 14 14 Z"
      stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);
const IconBoth = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: active ? "var(--ink)" : "var(--ink-soft)" }}>
    <rect x="2" y="4" width="9" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <path d="M 9 16 Q 7 16 7 14 Q 7 12 9 12 Q 9 9.5 12 9.5 Q 15 9.5 15.5 12 Q 18 12 18 14 Q 18 16 16 16 Z"
      stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

Object.assign(window, { HiFi3 });
