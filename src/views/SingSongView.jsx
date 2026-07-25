import { useState, Fragment } from "react";
import { ResponsiveContainer, LineChart, Line, Tooltip, YAxis } from "recharts";
import { Panel, Loading, Empty, Icon } from "../components/primitives.jsx";
import { ChartTooltip } from "../components/ChartTooltip.jsx";
import { useApi } from "../lib/api.js";
import { useChartColors } from "../lib/chartTheme.js";
import { fmt, stripVerb, flagEmoji } from "../lib/format.js";

function Sparkline({ series, color }) {
  if (!series?.length) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  return (
    <ResponsiveContainer width={140} height={38}>
      <LineChart data={series} margin={{ top: 4, bottom: 4, left: 2, right: 2 }}>
        <YAxis hide domain={[0, "dataMax"]} />
        <Tooltip content={<ChartTooltip valueFormatter={fmt} />} />
        <Line type="monotone" dataKey="count" name="Plays" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// A channel's top 5 music videos by plays (shown when its row is expanded).
function MusicVideos({ channel }) {
  const { data, loading } = useApi("music-videos", { channel });
  if (loading) return <div className="loading" style={{ padding: 12 }}>Loading videos…</div>;
  if (!data?.length) return <Empty label="No music videos" />;
  return (
    <table className="tbl" style={{ margin: "2px 0" }}>
      <tbody>
        {data.map((v, i) => (
          <tr key={i}>
            <td className="rank">{i + 1}</td>
            <td>
              <div className="ch">
                {v.video_thumbnail_url && (
                  <img src={v.video_thumbnail_url} alt="" style={{ width: 54, height: 30, borderRadius: 6, objectFit: "cover" }} referrerPolicy="no-referrer" />
                )}
                <a href={v.title_url} target="_blank" rel="noreferrer" style={{ color: "var(--text-primary)", textDecoration: "none", fontWeight: 600 }}>
                  {stripVerb(v.title)}
                </a>
              </div>
            </td>
            <td className="num">{fmt(v.count)}×</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function SingSongView({ theme }) {
  const colors = useChartColors(theme);
  const { data, loading } = useApi("music-channels");
  const [open, setOpen] = useState(null);
  if (loading) return <Loading />;
  if (!data?.length) return <Empty />;
  return (
    <Panel
      icon="music_note"
      title="Sing Song"
      note="Your top 10 all-time Music channels. Click a row to reveal its 5 most-played music videos."
    >
      <div style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th><th>Channel</th><th>Country</th><th style={{ textAlign: "right" }}>Videos</th><th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c, i) => {
              const expanded = open === c.channelId;
              return (
                <Fragment key={c.channelId}>
                  <tr onClick={() => setOpen(expanded ? null : c.channelId)} style={{ cursor: "pointer" }}>
                    <td className="rank">{i + 1}</td>
                    <td>
                      <div className="ch">
                        <Icon name={expanded ? "expand_more" : "chevron_right"} style={{ color: "var(--text-muted)", fontSize: 20 }} />
                        <img src={c.channelImageUrl} alt="" referrerPolicy="no-referrer" />
                        <span style={{ fontWeight: 600 }}>{c.channelName}</span>
                      </div>
                    </td>
                    <td>{c.channelCountry ? `${flagEmoji(c.channelCountry)} ${c.channelCountry}` : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                    <td className="num">{fmt(c.count)}</td>
                    <td><Sparkline series={c.sparkline} color={colors.red} /></td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={5} style={{ padding: "4px 10px 12px 34px", background: "color-mix(in srgb, var(--yt-red) 5%, transparent)" }}>
                        <div className="panel-note" style={{ margin: "6px 0" }}>
                          Top played music videos from <b style={{ color: "var(--text-primary)" }}>{c.channelName}</b>
                        </div>
                        <MusicVideos channel={c.channelId} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
