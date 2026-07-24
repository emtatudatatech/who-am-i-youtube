import { useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { Panel, Chips, Loading, Empty } from "../components/primitives.jsx";
import { useApi } from "../lib/api.js";
import { useChartColors } from "../lib/chartTheme.js";
import { fmt, fmt1, compact, humanDuration, MONTHS } from "../lib/format.js";

// Tooltip that surfaces the top channel (name + logo) for the hovered month.
function PeriodTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="glass" style={{ padding: "9px 12px", fontSize: "0.8rem", borderRadius: 10, maxWidth: 220 }}>
      <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{p.period}</div>
      <div style={{ color: "var(--text-secondary)" }}><b style={{ color: "var(--text-primary)" }}>{fmt(p.count)}</b> videos</div>
      {p.topChannel && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          {p.topChannelImage && <img src={p.topChannelImage} alt="" width={26} height={26} style={{ borderRadius: "50%" }} referrerPolicy="no-referrer" />}
          <div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Top channel</div>
            <div style={{ fontWeight: 600 }}>{p.topChannel}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function WatchTrendTab({ colors }) {
  const { data, loading } = useApi("watch-trend-tab");
  if (loading) return <Loading />;
  if (!data?.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ left: -16, right: 8, top: 6 }}>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis dataKey="period" tick={{ fill: colors.muted, fontSize: 10 }} minTickGap={36} tickLine={false} axisLine={{ stroke: colors.base }} />
        <YAxis tick={{ fill: colors.muted, fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
        <Tooltip cursor={{ fill: "var(--gridline)", opacity: 0.4 }} content={<PeriodTooltip />} />
        <Bar dataKey="count" name="Videos" fill={colors.red} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function AvgWatchTime({ colors, years }) {
  const [year, setYear] = useState(null);
  const { data, loading } = useApi("avg-watch-time", year ? { year } : {});
  if (loading) return <Loading />;
  if (!data) return <Empty />;
  const coverage = (data.withDuration / data.totalWatched) * 100;
  const chartData = data.periods.map((p) => ({
    label: year ? MONTHS[p.period - 1] : String(p.period),
    hours: p.totalSeconds / 3600,
    avgMin: p.avgSeconds / 60,
    ...p,
  }));
  return (
    <>
      <Chips options={years || []} value={year} onChange={setYear} allLabel="By year" />
      <p className="panel-note" style={{ marginTop: 0 }}>
        Real durations from the YouTube API, available for {coverage.toFixed(0)}% of watched videos.
        {year ? ` Months of ${year}.` : " Totals per year."}
      </p>
      {!chartData.length ? <Empty /> : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ left: -12, right: 8, top: 6 }}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: colors.muted, fontSize: 11 }} interval={0} tickLine={false} axisLine={{ stroke: colors.base }} />
            <YAxis tickFormatter={compact} tick={{ fill: colors.muted, fontSize: 11 }} tickLine={false} axisLine={false} width={44}
              label={{ value: "hours", angle: -90, position: "insideLeft", fill: colors.muted, fontSize: 11 }} />
            <Tooltip cursor={{ fill: "var(--gridline)", opacity: 0.4 }} content={<DurationTooltip />} />
            <Bar dataKey="hours" name="Watch time" fill={colors.s3} radius={[4, 4, 0, 0]}>
              {chartData.map((d, i) => <Cell key={i} fill={colors.s3} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </>
  );
}

function DurationTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="glass" style={{ padding: "8px 11px", fontSize: "0.78rem", borderRadius: 10 }}>
      <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{p.label}</div>
      <div style={{ color: "var(--text-secondary)" }}>Total <b style={{ color: "var(--text-primary)" }}>{humanDuration(p.totalSeconds)}</b></div>
      <div style={{ color: "var(--text-secondary)" }}>Avg <b style={{ color: "var(--text-primary)" }}>{fmt1(p.avgMin)} min</b> / video</div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{fmt(p.videos)} videos with duration</div>
    </div>
  );
}

export default function WatchTrendView({ theme, stats }) {
  const colors = useChartColors(theme);
  return (
    <div className="grid" style={{ gap: 16 }}>
      <Panel icon="insights" title="Watch trend by month" note="Videos watched each month (EAT). Hover any bar to see that month's top channel.">
        <WatchTrendTab colors={colors} />
      </Panel>
      <Panel icon="timer" title="Average watch time" note="Computed from real per-video durations added via the YouTube Data API.">
        <AvgWatchTime colors={colors} years={stats?.years} />
      </Panel>
    </div>
  );
}
