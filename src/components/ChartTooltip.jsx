// Shared Recharts tooltip: glassy card, text in ink tokens (never series color).
export function ChartTooltip({ active, payload, label, unit = "", labelFormatter, valueFormatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className="glass"
      style={{ padding: "8px 11px", fontSize: "0.78rem", borderRadius: 10 }}
    >
      <div style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: 4 }}>
        {labelFormatter ? labelFormatter(label) : label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: "var(--text-secondary)", display: "flex", gap: 8, alignItems: "center" }}>
          <i
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: p.color || p.fill,
              display: "inline-block",
            }}
          />
          <span>{p.name}</span>
          <b style={{ marginLeft: "auto", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
            {valueFormatter ? valueFormatter(p.value) : p.value}
            {unit}
          </b>
        </div>
      ))}
    </div>
  );
}
