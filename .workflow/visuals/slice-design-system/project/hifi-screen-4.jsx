/* SLICE hi-fi — Écran 4 : Succès (centered minimal) */

const HiFi4 = ({ config, pickedCount, economy, onRestart, onBackToSelect }) => {
  const [tab, setTab] = React.useState(config?.dest === "local" ? "claude" : "n8n");
  const [copied, setCopied] = React.useState(false);
  const mcpName = config?.name || "shopify-admin-mcp";

  const snippets = {
    claude: {
      file: "~/Library/Application Support/Claude/claude_desktop_config.json",
      code: highlightJson(`{
  "mcpServers": {
    "${mcpName.replace(/-mcp$/, "")}": {
      "command": "node",
      "args": ["${mcpName}/dist/index.js"],
      "env": {
        "SHOPIFY_API_KEY": "<ta clé>"
      }
    }
  }
}`),
    },
    n8n: {
      file: "docker-compose.yml · variable d'env",
      code: highlightShell(`# 1. déploie le dossier sur ton serveur
# 2. lance le worker HTTP
$ node ${mcpName}/dist/http.js --port 7707

# 3. dans n8n → node MCP
  url   →  http://serveur:7707
  token →  copier depuis .env
  tools →  ${pickedCount} (auto-découverts)`),
    },
    airia: {
      file: "agent Airia · code source",
      code: highlightJs(`import { McpClient } from "@airia/mcp";

const client = new McpClient({
  url: "https://mcp.tonsite.com",
  token: process.env.SLICE_MCP_TOKEN,
});

await client.tools.products.list({ limit: 20 });`),
    },
  };

  const handleCopy = () => {
    const raw = snippets[tab].code.replace(/<[^>]+>/g, "");
    navigator.clipboard?.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="scr scr-4 scroll" style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      padding: "44px 28px 36px",
    }}>
      {/* Sketchy animated check */}
      <CheckMark />

      {/* Hero copy */}
      <div className="col-v" style={{ alignItems: "center", gap: 10, marginTop: 22, marginBottom: 4, textAlign: "center", maxWidth: 620 }}>
        <span className="eyebrow" style={{ color: "var(--success)" }}>généré en 3.2 s</span>
        <h1 className="h1" style={{ fontSize: 52 }}>Ton MCP est <em>prêt</em>.</h1>
        <p className="soft" style={{ fontSize: 13.5, maxWidth: 480 }}>
          On a packagé {pickedCount} endpoints dans un dossier propre.
          Tu télécharges, tu poses le <span className="font-mono" style={{ color: "var(--ink)" }}>.env</span>, tu connectes ton agent.
        </p>
      </div>

      {/* Recap badges */}
      <div className="row-h" style={{ gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 18 }}>
        <span className="chip on" style={{ cursor: "default" }}>@{mcpName}</span>
        <span className="chip" style={{ cursor: "default" }}>{pickedCount} endpoints</span>
        <span className="chip" style={{ cursor: "default", color: "var(--success)" }}>−{economy}% contexte</span>
        <span className="chip" style={{ cursor: "default" }}>node 20+</span>
      </div>

      {/* Primary action */}
      <button className="btn btn--primary btn--lg"
        style={{ marginTop: 28, padding: "0 22px", height: 44, fontSize: 14, gap: 10 }}>
        <DownloadIcon />
        Télécharger le ZIP
        <span className="mute" style={{ color: "currentColor", opacity: 0.55, fontSize: 11.5 }}>· 84 ko</span>
      </button>

      {/* 3 steps */}
      <div style={{
        marginTop: 36,
        width: "100%", maxWidth: 880,
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14,
      }}>
        <StepCard n="1" title="Décompresse"
          sub={<><span className="font-mono" style={{ color: "var(--ink)" }}>{mcpName}.zip</span> → ton dossier</>}
        />
        <StepCard n="2" title="Configure le .env"
          sub={<><span>Renseigne ta clé API.</span> <a className="font-mono" style={{ color: "var(--ink)", textDecoration: "underline", textDecorationColor: "var(--line-strong)" }} href="#">voir la doc ↗</a></>}
        />
        <StepCard n="3" title="Connecte l'agent" highlight
          sub="Copie le snippet ci-dessous dans ta cible."
        />
      </div>

      {/* Snippet block */}
      <div className="card" style={{
        marginTop: 14,
        width: "100%", maxWidth: 880,
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
          <div className="tabs" style={{ borderBottom: "none", flex: 1 }}>
            {[
              ["claude", "Claude Desktop"],
              ["n8n",    "n8n"],
              ["airia",  "Airia"],
            ].map(([k, l]) => (
              <span key={k} onClick={() => setTab(k)}
                className={`tab ${tab === k ? "on" : ""}`}>{l}</span>
            ))}
          </div>
          <button className={`btn btn--sm ${copied ? "btn--primary" : ""}`}
            onClick={handleCopy}
            style={{ margin: "0 10px" }}>
            {copied ? "✓ copié" : "[ copier ]"}
          </button>
        </div>
        <div style={{ position: "relative" }}>
          <pre className="code" style={{ borderRadius: 0, border: "none", margin: 0, padding: "16px 18px 18px", background: "var(--bg-card-2)" }}
               dangerouslySetInnerHTML={{ __html: snippets[tab].code }} />
        </div>
        <div className="row-h" style={{ padding: "8px 14px", borderTop: "1px solid var(--line)", gap: 6, fontSize: 11 }}>
          <span className="mute">fichier ·</span>
          <span className="font-mono" style={{ color: "var(--ink-soft)" }}>{snippets[tab].file}</span>
        </div>
      </div>

      {/* Footer actions */}
      <div className="row-h" style={{ gap: 18, marginTop: 32 }}>
        <button className="btn btn--ghost" onClick={onBackToSelect}>↻ Revenir à la sélection</button>
        <span style={{ width: 1, height: 18, background: "var(--line)" }}></span>
        <button className="btn btn--ghost" onClick={onRestart}>＋ Générer un autre MCP</button>
      </div>
    </div>
  );
};

// — components —

const StepCard = ({ n, title, sub, highlight }) => (
  <div className="card" style={{
    padding: 16,
    display: "flex", flexDirection: "column", gap: 6,
    borderColor: highlight ? "var(--line-strong)" : "var(--line)",
    background: highlight ? "var(--bg-card-2)" : "var(--bg-card)",
  }}>
    <span className="font-serif" style={{ fontSize: 32, color: "var(--ink)", lineHeight: 1 }}>{n}.</span>
    <span className="font-mono" style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>{title}</span>
    <span className="soft" style={{ fontSize: 11.5 }}>{sub}</span>
  </div>
);

const CheckMark = () => (
  <svg width="76" height="76" viewBox="0 0 76 76" style={{ color: "var(--success)" }}>
    <circle cx="38" cy="38" r="32" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 5" opacity="0.55" />
    <circle cx="38" cy="38" r="22" fill="none"
      stroke="currentColor" strokeWidth="1.8" />
    <path d="M 27 39 L 35 47 L 50 30"
      fill="none" stroke="currentColor" strokeWidth="3"
      strokeLinecap="round" strokeLinejoin="round"
      className="check-anim" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M 8 2.5 L 8 11 M 4.5 7.5 L 8 11 L 11.5 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M 3 13 L 13 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

// — micro-tokeniser for the code blocks (HTML-injected via dangerouslySetInnerHTML) —
function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
function highlightJson(src) {
  const esc = escapeHtml(src);
  return esc
    .replace(/(&quot;[^&]*?&quot;)(\s*:)/g, '<span class="tok-key">$1</span>$2')
    .replace(/:\s*(&quot;[^&]*?&quot;)/g, ': <span class="tok-str">$1</span>')
    .replace(/(\/\/[^\n]*)/g, '<span class="tok-com">$1</span>');
}
function highlightShell(src) {
  const esc = escapeHtml(src);
  return esc
    .replace(/(^|\n)(#[^\n]*)/g, '$1<span class="tok-com">$2</span>')
    .replace(/(\$\s)/g, '<span class="tok-meta">$1</span>');
}
function highlightJs(src) {
  const esc = escapeHtml(src);
  return esc
    .replace(/\b(import|from|const|await|new)\b/g, '<span class="tok-meta">$1</span>')
    .replace(/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g, '<span class="tok-str">$1</span>')
    .replace(/(\/\/[^\n]*)/g, '<span class="tok-com">$1</span>');
}

Object.assign(window, { HiFi4 });
