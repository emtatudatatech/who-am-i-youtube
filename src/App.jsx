import { useState } from "react";
import { useTheme } from "./theme/useTheme.js";
import { useApi } from "./lib/api.js";
import { Icon, Loading } from "./components/primitives.jsx";
import { shortDate } from "./lib/format.js";
import OverviewView from "./views/OverviewView.jsx";
import ChannelsView from "./views/ChannelsView.jsx";
import CategoriesView from "./views/CategoriesView.jsx";
import PatternsView from "./views/PatternsView.jsx";
import WatchOfFameView from "./views/WatchOfFameView.jsx";
import SingSongView from "./views/SingSongView.jsx";
import WatchTrendView from "./views/WatchTrendView.jsx";

const TABS = [
  { id: "overview", label: "Overview", icon: "dashboard" },
  { id: "channels", label: "Channels", icon: "groups" },
  { id: "categories", label: "Categories", icon: "category" },
  { id: "patterns", label: "Patterns", icon: "schedule" },
  { id: "fame", label: "Watch of Fame", icon: "trophy" },
  { id: "singsong", label: "Sing Song", icon: "music_note" },
  { id: "trend", label: "Watch Trend", icon: "trending_up" },
];

const TAB_IDS = new Set(["overview", "channels", "categories", "patterns", "fame", "singsong", "trend"]);

export default function App() {
  const { theme, toggle } = useTheme();
  const [tab, setTabState] = useState(() => {
    const h = window.location.hash.replace("#", "");
    return TAB_IDS.has(h) ? h : "overview";
  });
  const setTab = (id) => {
    setTabState(id);
    window.location.hash = id;
  };
  const { data: stats, loading } = useApi("headline-stats");

  const view = { theme, stats };

  return (
    <div className="app">
      <header className="masthead">
        <div className="logo">
          <Icon name="play_arrow" style={{ fontSize: 30 }} />
        </div>
        <div>
          <h1>Who Am I? <span style={{ color: "var(--yt-red)" }}>| YouTube</span></h1>
          <div className="sub">A personal watch-history story, in East Africa Time</div>
        </div>
        <div className="spacer" />
        <button className="icon-btn" onClick={toggle} title="Toggle light / dark" aria-label="Toggle theme">
          <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} />
        </button>
      </header>

      <div className="ribbon glass">
        <span className="dot" />
        <span>Data covers</span>
        <b>{shortDate(stats?.minTime)}</b>
        <span>→</span>
        <b>{shortDate(stats?.maxTime)}</b>
        {stats && (
          <>
            <span style={{ marginLeft: "auto" }} />
            <b>{stats.videos.toLocaleString()}</b>
            <span>videos watched</span>
          </>
        )}
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} />
            {t.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <Loading label="Loading your YouTube story…" />
      ) : (
        <>
          {tab === "overview" && <OverviewView {...view} />}
          {tab === "channels" && <ChannelsView {...view} />}
          {tab === "categories" && <CategoriesView {...view} />}
          {tab === "patterns" && <PatternsView {...view} />}
          {tab === "fame" && <WatchOfFameView {...view} />}
          {tab === "singsong" && <SingSongView {...view} />}
          {tab === "trend" && <WatchTrendView {...view} />}
        </>
      )}

      <p className="footer-note">
        Built from a Google Takeout “My Activity” export, enriched via the YouTube Data API and stored on Neon Postgres.
        All time-of-day / day / month insights use East Africa Time (UTC+3). Every video/channel chart counts actual videos
        only — ads (Takeout’s <code>From Google Ads</code>), Shorts (<code>#shorts</code> tag) and community posts are tracked
        separately and never mixed in. “African creator” counts use the channel’s self-reported YouTube country.
      </p>
    </div>
  );
}
