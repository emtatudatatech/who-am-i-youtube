import { ResponsiveContainer, LineChart, Line, Tooltip, YAxis } from "recharts";
import { Panel, Loading, Empty } from "../components/primitives.jsx";
import { ChartTooltip } from "../components/ChartTooltip.jsx";
import { useApi } from "../lib/api.js";
import { useChartColors } from "../lib/chartTheme.js";
import { fmt } from "../lib/format.js";

function Sparkline({ series, color }) {
  if (!series?.length) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  return (
    <ResponsiveContainer width={140} height={38}>
      <LineChart data={series} margin={{ top: 4, bottom: 4, left: 2, right: 2 }}>
        <YAxis hide domain={[0, "dataMax"]} />
        <Tooltip content={<ChartTooltip valueFormatter={fmt} />} />
        <Line type="monotone" dataKey="count" name="Videos" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function WatchOfFameView({ theme }) {
  const colors = useChartColors(theme);
  const { data, loading } = useApi("watch-of-fame");
  if (loading) return <Loading />;
  if (!data?.length) return <Empty />;
  return (
    <Panel icon="trophy" title="Watch of Fame" note="Your top 10 all-time channels, with each channel's monthly watch trend.">
      <div style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th><th>Channel</th><th>Primary category</th><th style={{ textAlign: "right" }}>Videos</th><th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c, i) => (
              <tr key={c.channelId}>
                <td className="rank">{i + 1}</td>
                <td>
                  <div className="ch">
                    <img src={c.channelImageUrl} alt="" referrerPolicy="no-referrer" />
                    <span style={{ fontWeight: 600 }}>{c.channelName}</span>
                  </div>
                </td>
                <td><span className="pill">{c.primaryCategory}</span></td>
                <td className="num">{fmt(c.count)}</td>
                <td><Sparkline series={c.sparkline} color={colors.red} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
