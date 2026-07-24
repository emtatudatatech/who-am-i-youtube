import { useState, useEffect, useRef } from "react";
import { Panel, Chips, Loading, Empty, Icon } from "../components/primitives.jsx";
import { useApi } from "../lib/api.js";
import { fmt } from "../lib/format.js";

function BarRace() {
  const { data, loading } = useApi("bar-chart-race");
  const frames = data?.frames || [];
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef(null);

  useEffect(() => {
    if (!playing || !frames.length) return;
    timer.current = setInterval(() => {
      setI((prev) => {
        if (prev >= frames.length - 1) return prev; // hold on last frame
        return prev + 1;
      });
    }, 1400);
    return () => clearInterval(timer.current);
  }, [playing, frames.length]);

  useEffect(() => {
    if (frames.length && i >= frames.length - 1) setPlaying(false);
  }, [i, frames.length]);

  if (loading) return <Loading />;
  if (!frames.length) return <Empty />;

  const frame = frames[Math.min(i, frames.length - 1)];
  const max = Math.max(...frame.bars.map((b) => b.value), 1);

  const restart = () => { setI(0); setPlaying(true); };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <button className="icon-btn" onClick={() => (i >= frames.length - 1 ? restart() : setPlaying((p) => !p))}>
          <Icon name={i >= frames.length - 1 ? "replay" : playing ? "pause" : "play_arrow"} />
        </button>
        <input
          type="range" min={0} max={frames.length - 1} value={i}
          onChange={(e) => { setPlaying(false); setI(Number(e.target.value)); }}
          style={{ flex: 1, accentColor: "var(--yt-red)" }}
        />
        <div className="race-year" style={{ fontSize: "1.8rem", minWidth: 84 }}>{frame.year}</div>
      </div>
      <div>
        {frame.bars.map((b) => (
          <div className="race-row" key={b.channelId}>
            <div className="race-label">
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{b.channelName}</span>
              {b.channelImageUrl && <img src={b.channelImageUrl} alt="" referrerPolicy="no-referrer" />}
            </div>
            <div className="race-bar-wrap">
              <div className="race-bar" style={{ width: `${(b.value / max) * 100}%` }}>
                <span>{fmt(b.value)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopChannelsByYear({ years }) {
  const [year, setYear] = useState(years?.[years.length - 1] ?? null);
  const { data, loading } = useApi("top-channels", year ? { year } : {});
  const max = Math.max(...(data?.map((d) => d.count) || [1]), 1);
  return (
    <>
      <Chips options={years || []} value={year} onChange={setYear} allLabel="All-time" />
      {loading ? <Loading /> : !data?.length ? <Empty /> : (
        <div>
          {data.map((c, idx) => (
            <div key={c.channel_id} className="race-row" style={{ gridTemplateColumns: "44px 150px 1fr" }}>
              <img src={c.channel_image_url} alt="" width={34} height={34} style={{ borderRadius: "50%" }} referrerPolicy="no-referrer" />
              <div className="race-label" style={{ justifyContent: "flex-start" }}>{c.channel_name}</div>
              <div className="race-bar-wrap">
                <div className="race-bar" style={{ width: `${(c.count / max) * 100}%`, background: "var(--series-1)" }}>
                  <span>{fmt(c.count)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function ChannelsView({ stats }) {
  return (
    <div className="grid" style={{ gap: 16 }}>
      <Panel icon="emoji_events" title="The channel race" note="Cumulative videos watched per channel over the years — press play.">
        <BarRace />
      </Panel>
      <Panel icon="leaderboard" title="Top 5 channels" note="Most-watched channels for a given year.">
        <TopChannelsByYear years={stats?.years} />
      </Panel>
    </div>
  );
}
