import { type TournamentCategory } from "../../Utils/tournamentPlanner";
import {
  type ApiTournamentCategory,
  type CategoryScheduleItem,
  type StructureMode,
  type TeamDto,
  type TournamentFormat,
} from "./types";

export const STRUCTURE_OPTIONS: Array<{
  id: StructureMode;
  title: string;
  subtitle: string;
}> = [
  {
    id: "groups_knockout",
    title: "Group Phase + Knockout",
    subtitle: "Round-robin groups then finals",
  },
  {
    id: "knockout_only",
    title: "Knockout Only",
    subtitle: "Fast elimination format",
  },
  {
    id: "group_phase_only",
    title: "Group Phase Only",
    subtitle: "Standings-based competition",
  },
  {
    id: "swiss",
    title: "Swiss Rounds",
    subtitle: "Pair by score each round",
  },
];

export function inferDisciplineFromCategory(
  raw: ApiTournamentCategory,
): TournamentCategory["discipline"] {
  const name = String(raw.name ?? "").toLowerCase();
  const gender = String(raw.gender ?? "").toLowerCase();
  if (name.includes("team")) return "Teams";
  if (name.includes("mixed") || gender.includes("mixed"))
    return "Mixed Doubles";
  if (gender.includes("women") || gender.includes("female"))
    return "Doubles Female";
  if (gender.includes("men") || gender.includes("male")) return "Doubles Male";
  return "Singles";
}

export function inferFormatFromCategoryName(name?: string): TournamentFormat {
  const normalized = String(name ?? "").toLowerCase();
  if (normalized.includes("team")) return "Teams";
  if (normalized.includes("double") || normalized.includes("mixed"))
    return "Doubles";
  return "Singles";
}

export function groupLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function prettifyDisplayName(raw?: string): string {
  const source = String(raw ?? "").trim();
  if (!source) return "";
  if (/[a-z]/.test(source)) return source;

  return source
    .split(/([/\-\s]+)/)
    .map((part) => {
      if (!part || /^[\/\-\s]+$/.test(part)) return part;
      if (!/[A-Z]/.test(part)) return part;
      if (part.length <= 2) return part;
      return `${part[0]}${part.slice(1).toLowerCase()}`;
    })
    .join("");
}

export function getTeamDisplayName(team: TeamDto): string {
  const explicitName = String(team.name ?? "").trim();
  if (explicitName) return prettifyDisplayName(explicitName);
  const memberNames = (team.members ?? [])
    .map((member) => prettifyDisplayName(String(member.userFullName ?? "").trim()))
    .filter(Boolean);
  if (memberNames.length > 0) return memberNames.join(" / ");
  return `Team #${team.id}`;
}

export function entryLabelFromFormat(format?: TournamentFormat): string {
  if (format === "Singles") return "Player";
  if (format === "Doubles") return "Pair";
  return "Team";
}

export function extractLevelFromCategoryName(name?: string): string | null {
  const normalized = String(name ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("advanced")) return "Advanced";
  if (normalized.includes("intermediate")) return "Intermediate";
  if (normalized.includes("beginner")) return "Beginner";
  if (normalized.includes("open")) return "Open";
  return null;
}

export function stripLevelPrefixFromCategoryName(
  name: string,
  sectionLevel: string,
): string {
  const source = String(name ?? "").trim();
  if (!source) return "";

  const normalizedSection = String(sectionLevel).trim().toLowerCase();
  if (!normalizedSection || normalizedSection === "other") return source;

  const levelPattern =
    normalizedSection === "advanced"
      ? /\badvanced\b/gi
      : normalizedSection === "intermediate"
        ? /\bintermediate\b/gi
        : normalizedSection === "beginner"
          ? /\bbeginner\b/gi
          : normalizedSection === "open"
            ? /\bopen\b/gi
            : null;

  if (!levelPattern) return source;

  const withoutLevel = source
    .replace(levelPattern, "")
    .replace(/\s*[-–—:]\s*/g, " - ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*-\s*-\s*/g, " - ")
    .replace(/^\s*-\s*|\s*-\s*$/g, "")
    .trim();

  if (!withoutLevel) return source;

  const parts = withoutLevel
    .split(/\s*-\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" - ") : source;
}

export function parseTimeToMinutes(raw?: string): number | null {
  const value = String(raw ?? "").trim();
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59)
    return null;
  return hh * 60 + mm;
}

export function formatMinutesToTime(totalMinutes: number): string {
  const safe = Math.max(0, Math.min(24 * 60 - 1, Math.round(totalMinutes)));
  const hh = Math.floor(safe / 60);
  const mm = safe % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function normalizeRoundForApi(raw?: string): string {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return "GROUP";
  if (value.includes("quarter")) return "QUARTERFINAL";
  if (value.includes("semi")) return "SEMIFINAL";
  if (value === "final" || value.includes("final")) return "FINAL";
  const roundOfMatch = value.match(/round of\s*(\d+)/i);
  if (roundOfMatch?.[1]) return `ROUND_OF_${roundOfMatch[1]}`;
  return "GROUP";
}

export function toApiTime(raw?: string): string {
  const value = String(raw ?? "").trim();
  if (!value) return "00:00:00";
  return value.length === 5 ? `${value}:00` : value;
}

export function fromApiTime(raw?: string | null): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
}

export function normalizeMatchIdentity(
  item: Pick<CategoryScheduleItem, "groupId" | "round" | "homeTeamId" | "awayTeamId">,
): string | null {
  const home = Number(item.homeTeamId);
  const away = Number(item.awayTeamId);
  if (!Number.isFinite(home) || home <= 0 || !Number.isFinite(away) || away <= 0)
    return null;
  const [a, b] = [home, away].sort((x, y) => x - y);
  const group = Number(item.groupId);
  const groupToken = Number.isFinite(group) && group > 0 ? String(group) : "none";
  const round = String(item.round ?? "GROUP").trim().toUpperCase() || "GROUP";
  return `${groupToken}::${round}::${a}::${b}`;
}
