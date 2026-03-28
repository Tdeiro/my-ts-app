import type { Tournament, TournamentDisplayMeta } from "../types/tournamentListTypes";

export function formatTournamentLevelLabel(level?: string): string {
  const raw = String(level ?? "").trim();
  if (!raw) return "Open";
  const normalized = raw.toUpperCase().replaceAll("_", " ");
  if (normalized === "ALL LEVELS") return "Open";
  return raw
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function deriveDisplayMeta(item: Tournament): TournamentDisplayMeta {
  const totalSpots = Math.max(0, Number(item.capacity) || 0);
  const spotsLeft = Math.max(
    0,
    Number.isFinite(Number(item.capacityLeft))
      ? Number(item.capacityLeft)
      : totalSpots - Math.max(0, Number(item.subscriptionsCount) || 0),
  );
  return {
    timeLabel: "-",
    organizer: "-",
    totalSpots,
    spotsLeft,
    registrationDeadline: formatDate(item.registrationDeadline),
  };
}
