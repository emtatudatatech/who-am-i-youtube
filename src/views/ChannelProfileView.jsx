import { useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from "recharts";
import { Panel, StatCard, Loading, Empty, Icon } from "../components/primitives.jsx";
import { ChartTooltip } from "../components/ChartTooltip.jsx";
import { useApi } from "../lib/api.js";
import { useChartColors, xAxisProps, yAxisProps, SERIES } from "../lib/chartTheme.js";
import { fmt, shortDate, flagEmoji, humanDuration, hourLabel, stripVerb } from "../lib/format.js";

// Wait for typing to settle before querying — the picker searches server-side
// across ~14K channels, so one request per keystroke would be wasteful.
function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// The slicer: type to search every channel, click to switch the whole tab.
function ChannelPicker({ current, onSelect }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const debounced = useDebounced(q);
  const { data, loading } = useApi("channel-search", { q: debounced, limit: 30 });

  // Click anywhere outside to dismiss the dropdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (c) => {
    onSelect(c);
    setOpen(false);
    setQ("");
  };

  return (
    <div className="picker" ref={boxRef}>
      <div className="picker-field" onClick={() => setOpen(true)}>
        <Icon name="search" style={{ fontSize: 20, color: "var(--text-muted)" }} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder={current ? `${current.channelName} — search for another channel…` : "Search your channels…"}
          aria-label="Search channels"
        />
        <Icon name={open ? "expand_less" : "expand_more"} style={{ fontSize: 20, color: "var(--text-muted)" }} />
      </div>

      {open && (
        <div className="glass picker-menu">
          {!debounced && <div className="picker-hint">Your most-watched channels</div>}
          {loading && <div className="loading" style={{ padding: 14 }}>Searching…</div>}
          {!loading && !data?.length && <div className="empty" style={{ padding: 14 }}>No channel matches “{debounced}”.</div>}
          {!loading &&
            data?.map((c) => (
              <button
                key={c.channelId}
                className={`picker-option ${current?.channelId === c.channelId ? "active" : ""}`}
                onClick={() => pick(c)}
              >
                <img src={c.channelImageUrl} alt="" referrerPolicy="no-referrer" />
                <span className="nm">{c.channelName}</span>
                {c.channelCountry && <span className="ct">{flagEmoji(c.channelCountry)}</span>}
                <span className="cnt">{fmt(c.count)}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default function ChannelProfileView({ theme }) {
  const colors = useChartColors(theme);
  const [selected, setSelected] = useState(null);

  // Seed with the #1 channel so the tab is never empty on arrival.
  const { data: top, loading: seeding } = useApi("channel-search", { limit: 1 });
  const active = selected || top?.[0] || null;

  const { data: p, loading } = useApi(
    "channel-profile",
    active ? { channel: active.channelId } : {}
  );

  const monthly = p?.monthly || [];
  const yearsSpan =
    p?.firstWatched && p?.lastWatched
      ? Math.max(1, Math.round((new Date(p.lastWatched) - new Date(p.firstWatched)) / 31557600000))
      : null;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Panel
        icon="person_search"
        title="Superfan"
        note="Pick any channel you've ever watched and see the whole story of your time with it."
      >
        <ChannelPicker current={active} onSelect={setSelected} />
      </Panel>

      {seeding || loading ? (
        <Loading label="Loading channel profile…" />
      ) : !p ? (
        <Empty label="No watch data for that channel." />
      ) : (
        <>
          <Panel className="profile-hero">
            <div className="profile-id">
              {p.channelImageUrl && <img src={p.channelImageUrl} alt="" referrerPolicy="no-referrer" />}
              <div>
                <h2>{p.channelName}</h2>
                <div className="profile-meta">
                  {p.channelCountry && (
                    <span className="pill">{flagEmoji(p.channelCountry)} {p.channelCountry}</span>
                  )}
                  {p.rank && (
                    <span className="pill">
                      #{fmt(p.rank)} of {fmt(p.totalChannels)} channels
                    </span>
                  )}
                  <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                    {shortDate(p.firstWatched)} → {shortDate(p.lastWatched)}
                    {yearsSpan ? ` · ${yearsSpan} ${yearsSpan === 1 ? "year" : "years"}` : ""}
                  </span>
                </div>
              </div>
            </div>
          </Panel>

          <div className="grid cols-4">
            <StatCard icon="play_circle" value={fmt(p.videos)} label="Videos watched" foot={`${fmt(p.uniqueVideos)} unique`} />
            <StatCard icon="event_available" value={fmt(p.activeDays)} label="Days watched on" />
            <StatCard
              icon="timer"
              value={humanDuration(p.avgSeconds)}
              label="Average video length"
              foot={p.totalSeconds ? `${humanDuration(p.totalSeconds)} total` : undefined}
            />
            <StatCard
              icon="replay"
              value={p.uniqueVideos ? `${(p.videos / p.uniqueVideos).toFixed(2)}×` : "—"}
              label="Plays per video"
              foot="1.00× means you never replayed"
            />
          </div>

          {/* start-aligned: a channel with one category shouldn't stretch its
              panel to match the taller repeats table beside it. */}
          <div className="grid cols-2" style={{ alignItems: "start" }}>
            <Panel icon="trending_up" title="Watch trend" note="Videos watched from this channel, by month.">
              {monthly.length < 2 ? (
                <Empty label="Not enough months to plot a trend." />
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={monthly} margin={{ left: 0, right: 8, top: 6 }}>
                    <defs>
                      <linearGradient id="chFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.red} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={colors.red} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="period" {...xAxisProps(colors)} />
                    <YAxis {...yAxisProps(colors)} />
                    <Tooltip content={<ChartTooltip valueFormatter={fmt} />} />
                    <Area type="monotone" dataKey="count" name="Videos" stroke={colors.red} strokeWidth={2} fill="url(#chFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel icon="schedule" title="When you watch it" note="Videos by hour of day, East Africa Time.">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={p.hourly} margin={{ left: 0, right: 8, top: 6 }}>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="bucket" {...xAxisProps(colors, { tickFormatter: hourLabel })} />
                  <YAxis {...yAxisProps(colors)} />
                  <Tooltip
                    cursor={{ fill: "var(--gridline)", opacity: 0.4 }}
                    content={<ChartTooltip valueFormatter={fmt} labelFormatter={hourLabel} />}
                  />
                  <Bar dataKey="count" name="Videos" fill={colors.s1} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          {/* start-aligned: a channel with one category shouldn't stretch its
              panel to match the taller repeats table beside it. */}
          <div className="grid cols-2" style={{ alignItems: "start" }}>
            <Panel icon="category" title="What they make" note="This channel's videos by category.">
              {!p.categories?.length ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(150, p.categories.length * 38)}>
                  <BarChart data={p.categories} layout="vertical" margin={{ left: 0, right: 16, top: 4 }}>
                    <CartesianGrid stroke={colors.grid} horizontal={false} />
                    <XAxis type="number" {...xAxisProps(colors)} />
                    <YAxis
                      type="category" dataKey="category_name" width={110}
                      tickMargin={4} tickLine={false} axisLine={false}
                      tick={{ fill: colors.text, fontSize: 12 }}
                    />
                    <Tooltip cursor={{ fill: "var(--gridline)", opacity: 0.4 }} content={<ChartTooltip valueFormatter={fmt} />} />
                    <Bar dataKey="count" name="Videos" radius={[0, 6, 6, 0]}>
                      {p.categories.map((_, i) => (
                        <Cell key={i} fill={colors[SERIES[i % SERIES.length]]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel icon="replay" title="Your repeats" note="This channel's videos you played most.">
              {!p.topVideos?.length ? (
                <Empty />
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="tbl">
                    <tbody>
                      {p.topVideos.map((v, i) => (
                        <tr key={v.videoId}>
                          <td className="rank">{i + 1}</td>
                          <td>
                            <div className="ch">
                              {v.videoThumbnailUrl && (
                                <img className="thumb" src={v.videoThumbnailUrl} alt="" referrerPolicy="no-referrer" />
                              )}
                              <a
                                className="video-title"
                                href={v.titleUrl}
                                target="_blank"
                                rel="noreferrer"
                                title={stripVerb(v.title)}
                              >
                                {stripVerb(v.title)}
                              </a>
                            </div>
                          </td>
                          <td className="num">{fmt(v.count)}×</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
