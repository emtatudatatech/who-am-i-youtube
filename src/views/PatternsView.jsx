import { Fragment } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { Panel, Loading, Empty } from "../components/primitives.jsx";
import { ChartTooltip } from "../components/ChartTooltip.jsx";
import { useApi } from "../lib/api.js";
import { useChartColors } from "../lib/chartTheme.js";
import { fmt, compact, MONTHS, DOW, hourLabel } from "../lib/format.js";

function MiniBars({ data, xKey, xFmt, colors, color, interval = 0 }) {
  if (!data?.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: -14, right: 6, top: 4 }}>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={xFmt} tick={{ fill: colors.muted, fontSize: 10 }} interval={interval} tickLine={false} axisLine={{ stroke: colors.base }} />
        <YAxis tickFormatter={compact} tick={{ fill: colors.muted, fontSize: 10 }} tickLine={false} axisLine={false} width={38} />
        <Tooltip cursor={{ fill: "var(--gridline)", opacity: 0.4 }} content={<ChartTooltip valueFormatter={fmt} labelFormatter={xFmt} />} />
        <Bar dataKey="count" name="Videos" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Sequential-blue heatmap: year (rows) × hour (cols). Shows how the daily rhythm shifted.
function Heatmap({ hourByYear, colors }) {
  if (!hourByYear?.length) return <Empty />;
  const years = [...new Set(hourByYear.map((d) => d.year))].sort();
  const grid = {};
  let max = 1;
  for (const d of hourByYear) {
    (grid[d.year] ||= {})[d.bucket] = d.count;
    if (d.count > max) max = d.count;
  }
  const ramp = [colors.seq100, colors.seq250, colors.seq400, colors.seq550, colors.seq700];
  const colorFor = (v) => {
    if (!v) return "var(--gridline)";
    const idx = Math.min(ramp.length - 1, Math.floor((v / max) * ramp.length));
    return ramp[idx];
  };
  return (
    <div style={{ overflowX: "auto" }}>
      <div className="heat" style={{ gridTemplateColumns: `44px repeat(24, 1fr)`, minWidth: 620 }}>
        <div />
        {Array.from({ length: 24 }, (_, h) => (
          <div className="heat-axis" key={h}>{h % 3 === 0 ? hourLabel(h) : ""}</div>
        ))}
        {years.map((y) => (
          <Fragment key={y}>
            <div className="heat-axis" style={{ textAlign: "right", paddingRight: 6, alignSelf: "center" }}>{y}</div>
            {Array.from({ length: 24 }, (_, h) => {
              const v = grid[y]?.[h] || 0;
              return <div key={`${y}-${h}`} className="heat-cell" title={`${y} · ${hourLabel(h)}: ${v}`} style={{ background: colorFor(v) }} />;
            })}
          </Fragment>
        ))}
      </div>
      <div className="legend" style={{ marginTop: 10 }}>
        <span>Fewer</span>
        {ramp.map((c, i) => <i key={i} style={{ background: c }} />)}
        <span>More</span>
      </div>
    </div>
  );
}

export default function PatternsView({ theme }) {
  const colors = useChartColors(theme);
  const { data, loading } = useApi("time-patterns");
  if (loading) return <Loading />;
  if (!data) return <Empty />;
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid cols-3">
        <Panel icon="light_mode" title="By time of day"><MiniBars data={data.hour} xKey="bucket" xFmt={hourLabel} colors={colors} color={colors.red} interval={2} /></Panel>
        <Panel icon="event" title="By day of week"><MiniBars data={data.dow} xKey="bucket" xFmt={(d) => DOW[d]} colors={colors} color={colors.s1} /></Panel>
        <Panel icon="calendar_month" title="By month"><MiniBars data={data.month} xKey="bucket" xFmt={(m) => MONTHS[m - 1]} colors={colors} color={colors.s3} /></Panel>
      </div>
      <Panel icon="grid_on" title="How the rhythm shifted" note="Videos watched by hour of day (columns) across the years (rows), in East Africa Time.">
        <Heatmap hourByYear={data.hourByYear} colors={colors} />
      </Panel>
    </div>
  );
}
