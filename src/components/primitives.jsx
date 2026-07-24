// Small shared UI primitives (one concern each, colocated as they're tiny).

export function Icon({ name, style }) {
  return (
    <span className="material-symbols-rounded" style={style}>
      {name}
    </span>
  );
}

export function Panel({ icon, title, note, children, className = "", right }) {
  return (
    <section className={`glass panel ${className}`}>
      <div className="panel-head">
        {icon && <Icon name={icon} />}
        <h3>{title}</h3>
        <div style={{ flex: 1 }} />
        {right}
      </div>
      {note && <p className="panel-note">{note}</p>}
      {children}
    </section>
  );
}

export function StatCard({ icon, value, label, foot }) {
  return (
    <section className="glass panel stat">
      <Icon name={icon} />
      <div className="value">{value}</div>
      <div className="label">{label}</div>
      {foot && <div className="foot">{foot}</div>}
    </section>
  );
}

export function Loading({ label = "Loading…" }) {
  return <div className="loading">{label}</div>;
}

export function Empty({ label = "No data" }) {
  return <div className="empty">{label}</div>;
}

// A row of selectable chips (year selectors, etc.).
export function Chips({ options, value, onChange, allLabel }) {
  return (
    <div className="chips">
      {allLabel && (
        <button className={`chip ${value == null ? "active" : ""}`} onClick={() => onChange(null)}>
          {allLabel}
        </button>
      )}
      {options.map((o) => (
        <button
          key={o}
          className={`chip ${String(value) === String(o) ? "active" : ""}`}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
