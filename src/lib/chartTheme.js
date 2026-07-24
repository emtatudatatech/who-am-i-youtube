import { useEffect, useState } from "react";

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
