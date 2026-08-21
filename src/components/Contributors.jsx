import { useEffect, useState } from "react";
import { Icon } from "./primitives.jsx";
import { shortDate } from "../lib/format.js";

// A crown rather than a Material Symbol: the ligature set has no reliable
// "crown" glyph, and an inline path is what lets it spin on its own axis.
function Crown({ size = 22 }) {
  return (
    <svg className="crown-svg" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.6 7.4 7 10.6l4.2-6.2a1 1 0 0 1 1.6 0L17 10.6l4.4-3.2a.8.8 0 0 1 1.25.86L20.2 17.4a1 1 0 0 1-.97.75H4.77a1 1 0 0 1-.97-.75L1.35 8.26A.8.8 0 0 1 2.6 7.4Z"
        fill="currentColor"
      />
      <rect x="4.6" y="19.4" width="14.8" height="2.2" rx="1.1" fill="currentColor" opacity="0.75" />
    </svg>
  );
}

// The list lives in public/contributors.json so adding a name is a data edit,
// not a code change. Fetched once, on first open of the panel.
function useContributors(enabled) {
  const [state, setState] = useState({ data: null, loading: false, error: null });
  useEffect(() => {
    if (!enabled || state.data || state.loading) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fetch("/contributors.json")
      .then((r) => {
        if (!r.ok) throw new Error(`contributors.json → ${r.status}`);
        return r.json();
      })
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState({ data: null, loading: false, error }));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return state;
}

function ThanksPanel({ onClose }) {
  const { data, loading, error } = useContributors(true);

  // Esc closes, and the page behind must not scroll while the panel is open.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const people = data?.contributors || [];
  const credits = people.reduce((n, p) => n + (p.contributions?.length || 0), 0);

  return (
    <div className="thanks-backdrop" onClick={onClose} role="presentation">
      <div
        className="glass thanks-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="thanks-title"
      >
        <div className="thanks-head">
          <span className="thanks-crown"><Crown size={26} /></span>
          <div>
            <h2 id="thanks-title">Wall of Thanks</h2>
            <p>
              This dashboard keeps getting better because people keep telling us what
              it's missing. Everyone below asked for something — and it shipped.
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        {loading && <div className="loading">Loading the roll of honour…</div>}
        {error && <div className="empty">Couldn't load the contributor list.</div>}

        {!loading && !error && (
          <>
            {people.length === 0 ? (
              <div className="empty">
                No names yet — be the first. Send an idea and you'll land here.
              </div>
            ) : (
              <ul className="thanks-list">
                {people.map((p) => (
                  <li key={p.name}>
                    <div className="thanks-person">
                      <span className="thanks-avatar">{(p.name || "?").slice(0, 1).toUpperCase()}</span>
                      <div>
                        <div className="thanks-name">{p.name}</div>
                        {p.note && <div className="thanks-note">{p.note}</div>}
                      </div>
                    </div>
                    <div className="thanks-items">
                      {(p.contributions || []).map((c, i) => (
                        <div className="thanks-item" key={i}>
                          <div className="thanks-item-head">
                            <span className="pill">{c.title}</span>
                            {c.shipped && <span className="thanks-date">shipped {shortDate(c.shipped)}</span>}
                          </div>
                          {c.detail && <p>{c.detail}</p>}
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="thanks-foot">
              {credits > 0 && (
                <>
                  <b>{credits}</b> {credits === 1 ? "idea" : "ideas"} from{" "}
                  <b>{people.length}</b> {people.length === 1 ? "person" : "people"} — and counting.{" "}
                </>
              )}
              Got one? Say so. Good feedback ends up here.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function Contributors() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="crown-fab"
        onClick={() => setOpen(true)}
        title="Wall of Thanks"
        aria-label="Open the Wall of Thanks"
      >
        <Crown />
      </button>
      {open && <ThanksPanel onClose={() => setOpen(false)} />}
    </>
  );
}
