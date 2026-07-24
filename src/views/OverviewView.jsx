import { useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import { Panel, StatCard, Loading, Empty } from "../components/primitives.jsx";
import { ChartTooltip } from "../components/ChartTooltip.jsx";
import { useApi } from "../lib/api.js";
import { useChartColors } from "../lib/chartTheme.js";
import { fmt, fmt1 } from "../lib/format.js";

function ChannelRibbon() {
  const { data } = useApi("watch-of-fame");
  if (!data) return null;
  const loop = [...data, ...data]; // duplicate for a seamless marquee
  return (
    <div className="logo-ribbon">
      <div className="logo-track">
        {loop.map((c, i) => (
          <div className="logo-chip" key={i}>
            <img src={c.channelImageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
            <div>
              <div className="nm">{c.channelName}</div>
              <div className="ct">{fmt(c.count)} videos</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentMix({ colors }) {
  const { data, loading } = useApi("content-mix");
  if (loading) return <Loading />;
  if (!data) return <Empty />;
  const parts = [
    { name: "Videos", value: data.videos, fill: colors.s1 },
    { name: "Shorts", value: data.shorts, fill: colors.red },
    { name: "Ads", value: data.ads, fill: colors.s4 },
    { name: "Posts", value: data.posts, fill: colors.s3 },
  ];
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <ResponsiveContainer width="48%" height={200}>
        <PieChart>
          <Pie data={parts} dataKey="value" innerRadius={52} outerRadius={82} paddingAngle={2} stroke="var(--surface-1)" strokeWidth={2}>
            {parts.map((p, i) => <Cell key={i} fill={p.fill} />)}
          </Pie>
          <Tooltip content={<ChartTooltip valueFormatter={fmt} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="legend" style={{ flexDirection: "column", gap: 8 }}>
        {parts.map((p) => (
          <div key={p.name}>
            <i style={{ background: p.fill }} /><b>{fmt(p.value)}</b> {p.name} ({((p.value / total) * 100).toFixed(1)}%)
          </div>
        ))}
      </div>
    </div>
  );
}

function African() {
  const { data, loading } = useApi("african-creators");
  if (loading) return <Loading />;
  if (!data) return <Empty />;
  const pctOfKnown = (data.african / data.withCountry) * 100;
  const nullPct = (data.nullCountry / data.totalWatched) * 100;
  return (
    <div>
      <div className="stat" style={{ padding: 0 }}>
        <div className="value">{fmt(data.african)}</div>
        <div className="label">videos from African-country channels</div>
      </div>
      <p className="panel-note" style={{ marginTop: 10 }}>
        {pctOfKnown.toFixed(1)}% of the {fmt(data.withCountry)} watched videos whose channel reports a country.
        {" "}{nullPct.toFixed(0)}% of watched videos have no channel country and are excluded.
      </p>
      <div className="legend">
        {data.topCountries.slice(0, 6).map((c) => (
          <span key={c.channel_country}><b>{c.channel_country}</b> {fmt(c.count)}</span>
        ))}
      </div>
    </div>
  );
}

function TrendArea({ colors }) {
  const [range, setRange] = useState({ from: "", to: "" });
  const params = {};
  if (range.from) params.from = range.from;
  if (range.to) params.to = range.to;
  const { data, loading } = useApi("watch-trend", params);
  return (
    <>
      <div className="chips" style={{ alignItems: "center", gap: 10 }}>
        <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
          From <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        </label>
        <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
          To <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        </label>
        {(range.from || range.to) && <a className="reset" onClick={() => setRange({ from: "", to: "" })}>Reset</a>}
      </div>
      {loading ? <Loading /> : !data?.length ? <Empty /> : (
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={data} margin={{ left: -18, right: 8, top: 6 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.red} stopOpacity={0.5} />
                <stop offset="100%" stopColor={colors.red} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis dataKey="period" tick={{ fill: colors.muted, fontSize: 11 }} minTickGap={40} tickLine={false} axisLine={{ stroke: colors.base }} />
            <YAxis tick={{ fill: colors.muted, fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
            <Tooltip content={<ChartTooltip valueFormatter={fmt} />} />
            <Area type="monotone" dataKey="count" name="Videos" stroke={colors.red} strokeWidth={2} fill="url(#trendFill)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </>
  );
}

export default function OverviewView({ theme, stats }) {
  const colors = useChartColors(theme);
  if (!stats) return <Loading />;
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid cols-4">
        <StatCard icon="play_circle" value={fmt(stats.videos)} label="Videos watched" foot="Actual videos — excludes ads & Shorts" />
        <StatCard icon="groups" value={fmt(stats.uniqueChannels)} label="Unique channels" />
        <StatCard icon="calendar_today" value={fmt1(stats.avgPerDay)} label="Avg videos / active day" />
        <StatCard icon="search" value={fmt(stats.searches)} label="Searches made" />
      </div>

      <Panel icon="stream" title="Channels on rotation" note="Your most-watched channels, all-time — hover to pause.">
        <ChannelRibbon />
      </Panel>

      <div className="grid cols-2">
        <Panel icon="donut_large" title="Content mix" note="Actual videos vs. Shorts, ads (Takeout's “From Google Ads”) and community posts. Ads & posts are kept out of every other chart.">
          <ContentMix colors={colors} />
        </Panel>
        <Panel icon="public" title="African creators" note="Based on the channel's self-reported YouTube country.">
          <African />
        </Panel>
      </div>

      <Panel icon="show_chart" title="Watching trend" note="Videos watched per month (EAT). Use the date pickers to slice a range.">
        <TrendArea colors={colors} />
      </Panel>
    </div>
  );
}
