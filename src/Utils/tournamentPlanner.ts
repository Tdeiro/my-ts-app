export type TournamentDiscipline =
  | "Singles"
  | "Doubles Male"
  | "Doubles Female"
  | "Mixed Doubles"
  | "Teams";

export type TournamentCategory = {
  id: string;
  name: string;
  discipline: TournamentDiscipline;
  groups: number;
};

export type TournamentSetupDraft = {
  formats: string[];
  structureMode: string;
  categories: TournamentCategory[];
  categoryConfigs?: Record<
    string,
    {
      formats: string[];
      structureMode: string;
      groupCount?: number;
      teamsPerGroup?: number;
      qualifiedPerGroup?: number;
      bracketMatches?: Array<{
        id: string;
        round: string;
        home: string;
        away: string;
      }>;
    }
  >;
};

export type GroupBucket = {
  id: string;
  name: string;
  participants: string[];
};

export type TournamentGroupsDraft = Record<string, GroupBucket[]>;
export type MatchStage = "group" | "knockout" | "swiss";
export type MatchStatus = "pending" | "final";

export type MatchFixture = {
  id: string;
  stage: MatchStage;
  groupId?: string;
  round?: number;
  home: string;
  away: string;
  scheduledAt: string;
  scoreHome: string;
  scoreAway: string;
  status: MatchStatus;
};

export type TournamentMatchesDraft = Record<string, MatchFixture[]>;

function setupKey(tournamentId: string) {
  return `tournament_setup_${tournamentId}`;
}

function groupsKey(tournamentId: string) {
  return `tournament_groups_${tournamentId}`;
}

function matchesKey(tournamentId: string) {
  return `tournament_matches_${tournamentId}`;
}

export function loadTournamentSetup(tournamentId: string): TournamentSetupDraft | null {
  try {
    const raw = localStorage.getItem(setupKey(tournamentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.categories)) return null;
    return parsed as TournamentSetupDraft;
  } catch {
    return null;
  }
}

export function saveTournamentSetup(
  tournamentId: string,
  draft: TournamentSetupDraft,
) {
  localStorage.setItem(setupKey(tournamentId), JSON.stringify(draft));
}

export function loadTournamentGroups(
  tournamentId: string,
): TournamentGroupsDraft {
  try {
    const raw = localStorage.getItem(groupsKey(tournamentId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveTournamentGroups(
  tournamentId: string,
  groups: TournamentGroupsDraft,
) {
  localStorage.setItem(groupsKey(tournamentId), JSON.stringify(groups));
}

export function loadTournamentMatches(
  tournamentId: string,
): TournamentMatchesDraft {
  try {
    const raw = localStorage.getItem(matchesKey(tournamentId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveTournamentMatches(
  tournamentId: string,
  matches: TournamentMatchesDraft,
) {
  localStorage.setItem(matchesKey(tournamentId), JSON.stringify(matches));
}

export function buildDefaultGroups(groupCount: number): GroupBucket[] {
  const size = Math.max(1, Math.min(16, groupCount));
  return Array.from({ length: size }, (_, idx) => ({
    id: `g${idx + 1}`,
    name: `Group ${String.fromCharCode(65 + idx)}`,
    participants: [],
  }));
}
