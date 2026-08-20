import { useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { Panel, Chips, Loading, Empty } from "../components/primitives.jsx";
import { ChartTooltip } from "../components/ChartTooltip.jsx";
import { useApi } from "../lib/api.js";
import { useChartColors, useIsNarrow, xAxisProps, SERIES } from "../lib/chartTheme.js";
import { fmt, compact } from "../lib/format.js";

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
  const narrow = useIsNarrow();
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
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4 }}>
              <CartesianGrid stroke={colors.grid} horizontal={false} />
              <XAxis type="number" {...xAxisProps(colors, { tickFormatter: compact })} />
              {/* The name gutter is capped on phones so the bars keep most of the
                  width; Recharts wraps a long name onto a second line by itself. */}
              <YAxis
                type="category" dataKey="category_name"
                width={narrow ? 96 : 130}
                tickMargin={4} tickLine={false} axisLine={false}
                tick={{ fill: colors.text, fontSize: narrow ? 11 : 12 }}
              />
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
