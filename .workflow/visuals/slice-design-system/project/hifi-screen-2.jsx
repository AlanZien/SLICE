/* SLICE hi-fi — Écran 2 : Sélection des endpoints (Raycast split) */

const HiFi2 = ({ onContinue, onBack }) => {
  const [picked, setPicked] = React.useState(() => new Set(window.SLICE_DEFAULT_PICKED));
  const [activeTag, setActiveTag] = React.useState("Products");
  const [query, setQuery] = React.useState("");
  const [focusId, setFocusId] = React.useState("p3");
  const [filter, setFilter] = React.useState("all"); // all | read | write
  const [editingUrl, setEditingUrl] = React.useState(false);

  const summary = window.summarize(picked);
  const groups = window.SLICE_DATA.groups;

  const toggle = (id) => {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const tagCounts = React.useMemo(() => {
    const m = {};
    let totalPicked = 0, totalAll = 0;
    for (const g of groups) {
      let p = 0;
      for (const ep of g.endpoints) {
        totalAll++;
        if (picked.has(ep.id)) { p++; totalPicked++; }
      }
      m[g.tag] = { picked: p, total: g.endpoints.length };
    }
    m.__all = { picked: totalPicked, total: totalAll };
    return m;
  }, [picked]);

  const currentGroup = groups.find((g) => g.tag === activeTag) || groups[0];
  const READ = new Set(["GET"]);
  const filteredRows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return currentGroup.endpoints.filter((ep) => {
      if (filter === "read"  && !READ.has(ep.m)) return false;
      if (filter === "write" &&  READ.has(ep.m)) return false;
      if (!q) return true;
      return ep.path.toLowerCase().includes(q)
          || ep.label.toLowerCase().includes(q)
          || ep.m.toLowerCase().includes(q);
    });
  }, [currentGroup, query, filter]);

  const focusEp = React.useMemo(() => {
    for (const g of groups) for (const ep of g.endpoints) if (ep.id === focusId) return ep;
    return groups[0].endpoints[0];
  }, [focusId]);

  // bulk actions
  const bulkPick = (predicate) => {
    setPicked((prev) => {
      const next = new Set(prev);
      for (const g of groups) for (const ep of g.endpoints) {
        if (predicate(ep)) next.add(ep.id); else next.delete(ep.id);
      }
      return next;
    });
  };

  return (
    <div className="scr scr-2" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* API banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "14px 22px", borderBottom: "1px solid var(--line)",
        background: "var(--bg)",
      }}>
        <div className="col-v" style={{ gap: 4 }}>
          <div className="row-h" style={{ gap: 10 }}>
            <span className="h3" style={{ fontSize: 22, color: "var(--ink)" }}>{window.SLICE_DATA.apiName}</span>
            <span className="chip" style={{ cursor: "default" }}>{window.SLICE_DATA.apiVersion}</span>
          </div>
          {editingUrl ? (
            <div className="input" style={{ height: 26, padding: "0 8px", width: 460 }}>
              <span className="leading">↳</span>
              <input autoFocus defaultValue={window.SLICE_DATA.baseUrl}
                onBlur={() => setEditingUrl(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingUrl(false)}
                style={{ fontSize: 12 }} />
            </div>
          ) : (
            <div className="row-h" style={{ gap: 6, fontSize: 11.5, color: "var(--ink-soft)" }}>
              <span className="font-mono">{window.SLICE_DATA.baseUrl}</span>
              <button className="btn--ghost btn btn--sm" style={{ height: 20, padding: "0 6px", fontSize: 10 }}
                onClick={() => setEditingUrl(true)}>✎ modifier</button>
            </div>
          )}
        </div>
        <span className="grow"></span>
        <div className="row-h" style={{ gap: 8 }}>
          <span className="chip" style={{ cursor: "default" }}>47 endpoints détectés</span>
          <span className="chip" style={{ cursor: "default" }}>auth · clé API</span>
        </div>
      </div>

      {/* Body: 3-pane split */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

        {/* LEFT RAIL — tags + summary */}
        <aside style={{
          width: 200,
          borderRight: "1px solid var(--line)",
          background: "var(--bg-soft)",
          display: "flex", flexDirection: "column",
          minHeight: 0,
        }}>
          <div className="eyebrow" style={{ padding: "12px 14px 6px" }}>tags</div>
          <div className="scroll" style={{ flex: 1, padding: "0 6px 8px" }}>
            <RailItem
              name="Tous"
              picked={tagCounts.__all.picked} total={tagCounts.__all.total}
              active={false}
              onClick={() => setActiveTag(groups[0].tag)} />
            <div className="divider" style={{ margin: "6px 8px" }}></div>
            {groups.map((g) => (
              <RailItem key={g.tag} name={g.tag}
                picked={tagCounts[g.tag].picked} total={tagCounts[g.tag].total}
                active={activeTag === g.tag}
                onClick={() => setActiveTag(g.tag)} />
            ))}
          </div>

          {/* summary footer */}
          <div style={{
            borderTop: "1px solid var(--line)",
            padding: "14px 14px 16px",
            background: "var(--bg)",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div className="eyebrow">contexte économisé</div>
            <div className="row-h" style={{ alignItems: "baseline", gap: 6 }}>
              <span className="bignum" style={{ fontSize: 56 }}>−{summary.economy}</span>
              <span className="font-serif" style={{ fontSize: 22, color: "var(--ink-mute)" }}>%</span>
            </div>
            <div className="progress">
              <i style={{ width: `${summary.economy}%`, background: "var(--accent)" }}></i>
            </div>
            <div className="row-h" style={{ justifyContent: "space-between", fontSize: 11 }}>
              <span className="mute">sélectionnés</span>
              <span className="font-mono"><span style={{ color: "var(--ink)" }}>{summary.count}</span><span className="mute"> / {summary.total}</span></span>
            </div>
            <div className="row-h" style={{ justifyContent: "space-between", fontSize: 11 }}>
              <span className="mute">tokens</span>
              <span className="font-mono">{summary.sliceTokens.toLocaleString("fr-FR")} <span className="faint">/ {summary.fullTokens.toLocaleString("fr-FR")}</span></span>
            </div>
          </div>
        </aside>

        {/* MIDDLE — endpoint list */}
        <section style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* action bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 16px",
            borderBottom: "1px solid var(--line)",
            background: "var(--bg)",
          }}>
            <div className="input" style={{ flex: 1, maxWidth: 360 }}>
              <span className="leading">⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="filtrer dans Products…" />
              {query && <button className="btn--ghost btn btn--sm" style={{ padding: "0 6px" }}
                onClick={() => setQuery("")}>✕</button>}
            </div>
            <div className="row-h" style={{ gap: 4 }}>
              {[["all","Tous"],["read","Lecture"],["write","Écriture"]].map(([k, l]) => (
                <span key={k} className={`chip ${filter === k ? "on" : ""}`}
                  onClick={() => setFilter(k)}>{l}</span>
              ))}
            </div>
            <span className="grow"></span>
            <button className="btn btn--sm btn--ghost"
              onClick={() => bulkPick((ep) => READ.has(ep.m))}>↓ lectures</button>
            <button className="btn btn--sm btn--ghost"
              onClick={() => bulkPick((ep) => !READ.has(ep.m))}>↑ écritures</button>
            <button className="btn btn--sm btn--ghost"
              onClick={() => bulkPick(() => false)}>∅ tout</button>
          </div>

          {/* list */}
          <div className="scroll" style={{ flex: 1, padding: "6px 0" }}>
            {filteredRows.length === 0 ? (
              <EmptyHint q={query} />
            ) : filteredRows.map((ep) => (
              <div key={ep.id}
                className={`row ${focusId === ep.id ? "is-active" : ""}`}
                onClick={() => setFocusId(ep.id)}>
                <span className={`check ${picked.has(ep.id) ? "on" : ""}`}
                  onClick={(e) => { e.stopPropagation(); toggle(ep.id); }}></span>
                <Method m={ep.m} />
                <span className="font-mono" style={{
                  fontSize: 11.5, color: "var(--ink-soft)",
                  width: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  flex: "0 0 220px",
                }}>{ep.path}</span>
                <span style={{
                  flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  fontSize: 13, color: "var(--ink)",
                }}>{ep.label}</span>
                <span className="mute" style={{ fontSize: 10.5, fontFamily: '"JetBrains Mono", monospace', minWidth: 70, textAlign: "right" }}>
                  ~{ep.tokens} tk
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT — preview */}
        <aside style={{
          width: 290,
          borderLeft: "1px solid var(--line)",
          background: "var(--bg-soft)",
          padding: "18px 18px",
          display: "flex", flexDirection: "column", gap: 12,
          minHeight: 0,
          overflow: "auto",
        }}>
          <div className="eyebrow">aperçu</div>
          <div className="row-h" style={{ gap: 8 }}>
            <Method m={focusEp.m} />
            <span className="font-mono" style={{ fontSize: 11.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis" }}>{focusEp.path}</span>
          </div>
          <span className="h3" style={{ fontSize: 17 }}>{focusEp.label}</span>
          <span className="soft" style={{ fontSize: 12.5 }}>{focusEp.desc}</span>

          <div className="divider"></div>

          <div className="col-v" style={{ gap: 6 }}>
            <span className="eyebrow">paramètres</span>
            {focusEp.params.length === 0 ? (
              <span className="mute" style={{ fontSize: 12 }}>aucun</span>
            ) : focusEp.params.map((p) => (
              <div key={p} className="row-h" style={{ justifyContent: "space-between", fontSize: 11.5 }}>
                <span className="font-mono">{p}</span>
                <span className="mute">{p === "id" ? "string · requis" : "optionnel"}</span>
              </div>
            ))}
          </div>

          <div className="divider"></div>

          <div className="col-v" style={{ gap: 6 }}>
            <span className="eyebrow">coût contexte</span>
            <span className="font-mono" style={{ fontSize: 18, color: "var(--ink)" }}>
              ~ {focusEp.tokens} tokens
            </span>
            <div className="progress"><i style={{ width: `${Math.min(100, focusEp.tokens / 8)}%` }}></i></div>
          </div>

          <span className="grow"></span>
          <button className={`btn btn--sm ${picked.has(focusEp.id) ? "" : "btn--primary"}`}
            onClick={() => toggle(focusEp.id)}>
            {picked.has(focusEp.id) ? "✓ inclus dans le MCP" : "+ ajouter au MCP"}
          </button>
        </aside>
      </div>

      {/* Sticky footer */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 22px",
        borderTop: "1px solid var(--line)",
        background: "var(--bg)",
      }}>
        <button className="btn btn--ghost" onClick={onBack}>← Précédent</button>
        <span className="grow"></span>
        <span className="mute" style={{ fontSize: 12 }}>
          <span className="font-mono" style={{ color: "var(--ink)" }}>{summary.count}</span> endpoints ·
          <span className="font-mono" style={{ color: summary.economy >= 50 ? "var(--success)" : "var(--warn)" }}> −{summary.economy}%</span> contexte
        </span>
        <button className="btn btn--primary btn--lg" onClick={onContinue}
          disabled={summary.count === 0}
          style={{ opacity: summary.count === 0 ? 0.5 : 1, cursor: summary.count === 0 ? "not-allowed" : "pointer" }}>
          Continuer
          <span className="kbd-inline">↵</span>
        </button>
      </div>
    </div>
  );
};

const RailItem = ({ name, picked, total, active, onClick }) => (
  <div onClick={onClick}
    role="button"
    style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "5px 10px",
      borderRadius: 5,
      cursor: "pointer",
      color: active ? "var(--ink)" : "var(--ink-soft)",
      background: active ? "var(--bg-card-2)" : "transparent",
      fontSize: 12.5,
      letterSpacing: 0.01,
    }}>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {active && <span style={{ width: 4, height: 4, borderRadius: 99, background: "var(--ink)" }}></span>}
      {name}
    </span>
    <span className="mute" style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11 }}>
      {picked > 0 && <span style={{ color: picked === total ? "var(--success)" : "var(--ink-soft)" }}>{picked}</span>}
      {picked > 0 && <span className="faint">/</span>}
      {total}
    </span>
  </div>
);

const EmptyHint = ({ q }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 8, padding: "60px 24px", textAlign: "center", color: "var(--ink-mute)",
  }}>
    <span className="h3">Rien de tel ici.</span>
    <span className="soft" style={{ fontSize: 12.5 }}>
      Aucun endpoint ne correspond à <span className="font-mono" style={{ color: "var(--ink)" }}>"{q}"</span> dans ce tag.
    </span>
  </div>
);

Object.assign(window, { HiFi2 });
