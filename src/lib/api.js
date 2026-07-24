import { useEffect, useState } from "react";

// All DB reads go through the Netlify Functions layer (/api/* → /.netlify/functions/*).
export async function api(path, params) {
  const qs = params && Object.keys(params).length ? "?" + new URLSearchParams(params) : "";
  const res = await fetch(`/api/${path}${qs}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

// Small data hook: returns { data, loading, error } and refetches when deps change.
export function useApi(path, params) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const key = JSON.stringify(params || {});
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path, params)
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState({ data: null, loading: false, error }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key]);
  return state;
}
