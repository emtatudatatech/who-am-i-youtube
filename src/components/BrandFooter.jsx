// Inline SVG rather than the 🇰🇪 emoji: Windows has no colour glyph for regional
// indicator pairs and renders them as the bare letters "KE", which would break
// the branding on a large share of visitors. Bands follow the official 6:1:4:1:6
// ratio; the Maasai shield is simplified to read cleanly at ~20px.
function KenyaFlag({ height = 13 }) {
  return (
    <svg
      className="ke-flag"
      viewBox="0 0 24 16"
      height={height}
      width={(height * 24) / 16}
      role="img"
      aria-label="Flag of Kenya"
    >
      <defs>
        <clipPath id="keShieldClip">
          <ellipse cx="12" cy="8" rx="1.8" ry="4.3" />
        </clipPath>
      </defs>
      <rect width="24" height="16" fill="#ffffff" />
      <rect width="24" height="5.33" fill="#000000" />
      <rect y="6.22" width="24" height="3.56" fill="#be0027" />
      <rect y="10.67" width="24" height="5.33" fill="#006b3f" />
      {/* Crossed spears, behind the shield */}
      <g stroke="#ffffff" strokeWidth="0.85" strokeLinecap="round">
        <line x1="9.7" y1="1.8" x2="14.3" y2="14.2" />
        <line x1="14.3" y1="1.8" x2="9.7" y2="14.2" />
      </g>
      <ellipse cx="12" cy="8" rx="2.4" ry="5" fill="#ffffff" />
      <ellipse cx="12" cy="8" rx="1.8" ry="4.3" fill="#000000" />
      <rect x="9" y="5.7" width="6" height="4.6" fill="#be0027" clipPath="url(#keShieldClip)" />
      <rect x="11.6" y="3.6" width="0.8" height="8.8" fill="#ffffff" clipPath="url(#keShieldClip)" />
    </svg>
  );
}

export default function BrandFooter() {
  // Read at render time so the notice never goes stale on a long-lived deploy.
  const year = new Date().getFullYear();
  return (
    <footer className="brand">
      <div className="brand-copy">© {year} · ALL RIGHTS RESERVED</div>
      <div className="brand-made">
        <span>Designed in Kenya</span>
        <KenyaFlag />
        <span>by</span>
        <a
          className="brand-link"
          href="https://emtatudatatech.github.io/"
          target="_blank"
          rel="noopener noreferrer"
        >
          emtatudatatech
        </a>
      </div>
    </footer>
  );
}
