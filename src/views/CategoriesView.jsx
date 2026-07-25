import { useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { Panel, Chips, Loading, Empty } from "../components/primitives.jsx";
import { ChartTooltip } from "../components/ChartTooltip.jsx";
import { useApi } from "../lib/api.js";
import { useChartColors, SERIES } from "../lib/chartTheme.js";
import { fmt } from "../lib/format.js";

function Drilldown({ category, categoryName, year }) {
  const params = { category };
  if (year) params.year = year;
  const { data, loading } = useApi("category-channels", params);
  if (loading) return <Loading />;
  if (!data?.length) return <Empty label="No channels" />;
  return (
    <div>
      <p className="panel-note" style={{ marginTop: 0 }}>
        Top channels in <b style={{ color: "var(--text-primary)" }}>{categoryName}</b>{year ? ` · ${year}` : " · all-time"}
      </p>
      <table className="tbl">
        <tbody>
          {data.map((c, i) => (
            <tr key={c.channel_id}>
              <td className="rank">{i + 1}</td>
              <td>
                <div className="ch">
                  <img src={c.channel_image_url} alt="" referrerPolicy="no-referrer" />
                  <span style={{ fontWeight: 600 }}>{c.channel_name}</span>
                </div>
              </td>
              <td className="num">{fmt(c.count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CategoriesView({ theme, stats }) {
  const colors = useChartColors(theme);
  const [year, setYear] = useState(null);
  const [selected, setSelected] = useState(null);
  const { data, loading } = useApi("top-categories", year ? { year } : {});

  const onBarClick = (d) => setSelected({ id: d.category_id, name: d.category_name });

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Panel icon="category" title="Top 5 categories" note="Click a bar to drill into its most-watched videos.">
        <Chips options={stats?.years || []} value={year} onChange={(y) => { setYear(y); setSelected(null); }} allLabel="All-time" />
        {loading ? <Loading /> : !data?.length ? <Empty /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} layout="vertical" margin={{ left: 30, right: 20 }}>
              <CartesianGrid stroke={colors.grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: colors.muted, fontSize: 11 }} tickLine={false} axisLine={{ stroke: colors.base }} />
              <YAxis type="category" dataKey="category_name" width={120} tick={{ fill: colors.text, fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "var(--gridline)", opacity: 0.4 }} content={<ChartTooltip valueFormatter={fmt} />} />
              <Bar dataKey="count" name="Videos" radius={[0, 6, 6, 0]} cursor="pointer" onClick={onBarClick}>
                {data.map((d, i) => (
                  <Cell key={i} fill={colors[SERIES[i % SERIES.length]]} opacity={selected && selected.id !== d.category_id ? 0.4 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {selected && (
        <Panel icon="playlist_play" title="Category drill-down" right={<a className="reset" onClick={() => setSelected(null)}>Close</a>}>
          <Drilldown category={selected.id} categoryName={selected.name} year={year} />
        </Panel>
      )}
    </div>
  );
}
