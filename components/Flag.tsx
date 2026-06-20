/* eslint-disable @next/next/no-img-element */

/**
 * Renders a country flag from flagcdn.com using a 2-letter ISO code.
 * Falls back to a neutral chip when no code is available.
 */
export function Flag({
  code,
  name,
  size = 20,
}: {
  code: string | null | undefined;
  name?: string | null;
  size?: number;
}) {
  const w = size;
  const h = Math.round(size * 0.75);
  if (!code) {
    return (
      <span
        className="inline-block rounded-[3px] bg-surface-2 border border-border"
        style={{ width: w, height: h }}
        aria-label={name ?? "unknown"}
      />
    );
  }
  const c = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/w40/${c}.png`}
      srcSet={`https://flagcdn.com/w80/${c}.png 2x`}
      width={w}
      height={h}
      alt={name ?? code}
      title={name ?? code}
      className="rounded-[3px] object-cover border border-border/60 shrink-0"
      style={{ width: w, height: h }}
      loading="lazy"
    />
  );
}
