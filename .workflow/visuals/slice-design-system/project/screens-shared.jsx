/* Shared bits: window chrome, the corner stamp, scribble callouts, header bar.
   Used by all three screen files. Globals on window. */

const WfChrome = ({ crumb = "slice / new", actions }) => (
  <div className="wf-chrome">
    <span className="dot"></span>
    <span className="dot"></span>
    <span className="dot"></span>
    <span className="crumb" style={{ marginLeft: 6 }}>{crumb}</span>
    <span style={{ flex: 1 }}></span>
    {actions ?? <span className="wf-mute">⌘K</span>}
  </div>
);

const WfStamp = ({ label }) => <div className="wf-stamp">{label}</div>;

// A "scribbled" margin callout — short text + a thin arrow pointing inward.
const WfCallout = ({ x, y, text, arrow = "right", w = 110 }) => {
  const arrows = {
    right: <path d="M 4 12 C 30 12, 50 2, 80 12 M 80 12 L 72 8 M 80 12 L 72 16" />,
    left:  <path d="M 96 12 C 70 12, 50 2, 20 12 M 20 12 L 28 8 M 20 12 L 28 16" />,
    down:  <path d="M 14 4 C 16 18, 8 30, 24 44 M 24 44 L 18 40 M 24 44 L 28 38" />,
    up:    <path d="M 24 44 C 22 30, 30 18, 14 4 M 14 4 L 12 12 M 14 4 L 20 8" />,
  };
  return (
    <div className="wf-callout" style={{ left: x, top: y, width: w }}>
      <div style={{ marginBottom: 2 }}>{text}</div>
      <svg width={w} height={24} viewBox={`0 0 ${w} 24`} style={{ display: "block" }}>
        {arrows[arrow]}
      </svg>
    </div>
  );
};

// Slice wordmark — heavy sans-serif compressed (placeholder for Geist).
const WfMark = ({ size = 16 }) => (
  <span style={{
    fontFamily: '"JetBrains Mono", monospace',
    fontWeight: 600,
    letterSpacing: "0.18em",
    fontSize: size,
    color: "var(--wf-ink)",
  }}>SLICE</span>
);

// A row in the top app bar (always the same across screens).
const WfTopBar = ({ step, title, right }) => (
  <div style={{
    height: 44,
    display: "flex", alignItems: "center",
    padding: "0 16px",
    gap: 14,
    borderBottom: "1px solid var(--wf-line)",
    background: "var(--wf-bg)",
  }}>
    <WfMark size={13} />
    <span className="wf-mute" style={{ fontSize: 10 }}>/</span>
    <span className="wf-caps">{title}</span>
    <span style={{ flex: 1 }}></span>
    {/* tiny stepper */}
    <div className="wf-row" style={{ gap: 4 }}>
      {[1, 2, 3].map((n) => (
        <span key={n} style={{
          width: 16, height: 16,
          borderRadius: 99,
          border: "1px solid var(--wf-line)",
          background: n === step ? "var(--wf-ink)" : "transparent",
          color: n === step ? "var(--wf-bg)" : "var(--wf-ink-mute)",
          fontSize: 9, fontWeight: 600,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>{n}</span>
      ))}
    </div>
    {right ?? null}
  </div>
);

Object.assign(window, { WfChrome, WfStamp, WfCallout, WfMark, WfTopBar });
