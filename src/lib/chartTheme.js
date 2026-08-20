import { useEffect, useState } from "react";
import { compact } from "./format.js";

const VARS = {
  text: "--text-secondary",
  muted: "--text-muted",
  grid: "--gridline",
  base: "--baseline",
  surface: "--surface-1",
  red: "--yt-red",
  s1: "--series-1",
  s2: "--series-2",
  s3: "--series-3",
  s4: "--series-4",
  s5: "--series-5",
  s6: "--series-6",
  s7: "--series-7",
  s8: "--series-8",
  seq100: "--seq-100",
  seq250: "--seq-250",
  seq400: "--seq-400",
  seq550: "--seq-550",
  seq700: "--seq-700",
};

// Resolve CSS custom properties to concrete hex so Recharts SVG attributes work,
// re-resolving whenever the theme flips.
export function useChartColors(themeKey) {
  const read = () => {
    const cs = getComputedStyle(document.documentElement);
    const out = {};
    for (const [k, v] of Object.entries(VARS)) out[k] = cs.getPropertyValue(v).trim();
    return out;
  };
  const [colors, setColors] = useState(read);
  useEffect(() => setColors(read()), [themeKey]);
  return colors;
}

export const SERIES = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];

// Phone-sized panels: used only where thinning alone can't save the layout
// (category names on a horizontal axis, four-digit years on 13 bars).
export function useIsNarrow(query = "(max-width: 560px)") {
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setNarrow(e.matches);
    setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return narrow;
}

/* ---- Axis defaults -------------------------------------------------------
   Every cartesian chart spreads these so axes behave identically everywhere.

   The crowding fix is `interval: "equidistantPreserveStart"`: Recharts measures
   each label as it will actually render (tickFormatter applied, at the tick's
   real font size) and keeps the largest evenly spaced subset that clears
   `minTickGap`. Labels thin themselves out as the panel narrows, so a phone
   never overprints them — unlike a hard-coded `interval={0}` / `{2}`, which is
   only ever right at one width. */
export function xAxisProps(colors, { fontSize = 11, tickFormatter } = {}) {
  return {
    interval: "equidistantPreserveStart",
    // Clear space between label edges, not between ticks — 6px reads as air at
    // these font sizes while still keeping every label that genuinely fits.
    minTickGap: 6,
    tickMargin: 6,
    tickLine: false,
    axisLine: { stroke: colors.base },
    tick: { fill: colors.muted, fontSize },
    tickFormatter,
  };
}

// Numeric value axis. `compact` ("12k") keeps the left gutter narrow enough that
// charts no longer need a negative left margin — which used to clip the labels.
export function yAxisProps(colors, { fontSize = 11, width = 40 } = {}) {
  return {
    tickFormatter: compact,
    tickMargin: 4,
    tickLine: false,
    axisLine: false,
    width,
    tick: { fill: colors.muted, fontSize },
  };
}
