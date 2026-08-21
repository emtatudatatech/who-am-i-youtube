import { Panel, Loading, Empty } from "../components/primitives.jsx";
import { useApi } from "../lib/api.js";
import { fmt, stripVerb, shortDate, flagEmoji } from "../lib/format.js";

// Years between two EAT wall-clock timestamps, for the "kept coming back for N
// years" line. Both are naive EAT, so plain date arithmetic is correct here.
function spanLabel(first, last) {
  if (!first || !last) return null;
  const days = (new Date(last) - new Date(first)) / 86400000;
  if (days < 1) return "same day";
  if (days < 60) return `${Math.round(days)} days`;
  const years = days / 365.25;
  if (years < 1) return `${Math.round(days / 30.44)} months`;
  return `${years.toFixed(years < 10 ? 1 : 0)} years`;
}

export default function NostalgiaView() {
  const { data, loading } = useApi("nostalgia");
  if (loading) return <Loading />;
  if (!data?.length) return <Empty />;

  const champion = data[0];

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Panel
        icon="replay"
        title="Nostalgia"
        note="The ten videos you came back to most — ranked by how many times you pressed play on the very same video."
      >
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Video</th>
                <th>Channel</th>
                <th>Country</th>
                <th style={{ textAlign: "right" }}>Times</th>
                <th>First watched</th>
                <th>Last watched</th>
              </tr>
            </thead>
            <tbody>
              {data.map((v, i) => (
                <tr key={v.videoId}>
                  <td className="rank">{i + 1}</td>
                  <td>
                    <div className="ch">
                      {v.videoThumbnailUrl && (
                        <img
                          className="thumb"
                          src={v.videoThumbnailUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                        />
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
                  <td>
                    <div className="ch">
                      {v.channelImageUrl && (
                        <img src={v.channelImageUrl} alt="" referrerPolicy="no-referrer" />
                      )}
                      <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{v.channelName}</span>
                    </div>
                  </td>
                  <td>
                    {v.channelCountry ? (
                      `${flagEmoji(v.channelCountry)} ${v.channelCountry}`
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td className="num">{fmt(v.count)}×</td>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                    {shortDate(v.firstWatched)}
                  </td>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                    {shortDate(v.lastWatched)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="panel-note" style={{ marginTop: 12, marginBottom: 0 }}>
          Your most-replayed video is{" "}
          <b style={{ color: "var(--text-primary)" }}>{stripVerb(champion.title)}</b> —{" "}
          <b style={{ color: "var(--text-primary)" }}>{fmt(champion.count)} plays</b>
          {spanLabel(champion.firstWatched, champion.lastWatched) && (
            <> spread over {spanLabel(champion.firstWatched, champion.lastWatched)}</>
          )}
          . Counts are repeat plays of the same video ID, so a re-watch you started
          and abandoned still counts as a play.
        </p>
      </Panel>
    </div>
  );
}
