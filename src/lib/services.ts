import { site } from "./site";

export type SinedexterStats = { films: number; series: number; episodes: number };

export async function getSinedexterStats(): Promise<SinedexterStats> {
  try {
    const res = await fetch(site.services.sinedexter.stats, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error("stats " + res.status);
    const d = (await res.json()) as Partial<SinedexterStats>;
    return { films: d.films ?? 0, series: d.series ?? 0, episodes: d.episodes ?? 0 };
  } catch {
    return { films: 0, series: 0, episodes: 0 };
  }
}

export type PulseTrack = {
  name: string;
  artist: string;
  album?: string | null;
  art?: string | null;
  link?: string | null;
  progressMs?: number | null;
  durationMs?: number | null;
};

export type PulseStatus = {
  ok: boolean;
  playing: boolean;
  cachedTrack?: boolean;
  playedAt?: string | null;
  track: PulseTrack | null;
};

let pulseCache: { at: number; data: PulseStatus } | null = null;

type RawPulse = {
  track?: {
    playing?: boolean;
    cached?: boolean;
    name?: string;
    artist?: string;
    album?: string | null;
    art?: string | null;
    link?: string | null;
    progressMs?: number | null;
    durationMs?: number | null;
    playedAt?: string | null;
  } | null;
};

export async function getPulseStatus(): Promise<PulseStatus> {
  if (pulseCache && Date.now() - pulseCache.at < 4000) return pulseCache.data;
  try {
    const res = await fetch(site.services.pulse.status, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error("pulse " + res.status);
    const raw = (await res.json()) as RawPulse;
    const t = raw.track;
    const data: PulseStatus = {
      ok: true,
      playing: t?.playing ?? false,
      cachedTrack: t?.cached ?? false,
      playedAt: t?.playedAt ?? null,
      track: t
        ? {
            name: t.name ?? "",
            artist: t.artist ?? "",
            album: t.album ?? "",
            art: t.art ?? null,
            link: t.link ?? null,
            progressMs: t.progressMs ?? null,
            durationMs: t.durationMs ?? null,
          }
        : null,
    };
    pulseCache = { at: Date.now(), data };
    return data;
  } catch {
    return pulseCache?.data ?? { ok: false, playing: false, track: null };
  }
}

export function formatDuration(ms: number | null | undefined): string {
  if (!ms) return "0:00";
  const s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
