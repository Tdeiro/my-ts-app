export type RunTournamentUiState = {
  finalizedByCategory: Record<string, boolean>;
  qualifiedByCategory: Record<string, number[]>;
  knockoutByesByCategory: Record<
    string,
    Array<{
      sourceRound: string;
      advancesToRound: string;
      teamIds: number[];
      seededTeamIds: Array<{ seed: number; teamId: number }>;
    }>
  >;
};

export type ApiEvent = {
  id: number | string;
  userId?: number | string;
  user_id?: number | string;
  name?: string;
  eventType?: string;
  locationName?: string;
  startDate?: string;
};

export type ApiTournamentCategory = {
  id: number | string;
  name?: string;
};

export type TeamMemberDto = {
  userId: number;
  userFullName?: string;
};

export type TeamDto = {
  id: number;
  categoryId: number;
  name?: string;
  autoNameFromMembers?: boolean;
  members?: TeamMemberDto[];
};

export type ApiTournamentGroup = {
  id?: number | string;
  name?: string;
  teamIds?: Array<number | string>;
  teams?: Array<{ id?: number | string }>;
};

export type ApiMatchDto = {
  id?: number | string;
  matchId?: number | string;
  groupId?: number | string;
  group_id?: number | string;
  group?: {
    id?: number | string;
    name?: string;
  };
  round?: string;
  stage?: string;
  categoryId?: number | string;
  category?: {
    id?: number | string;
    name?: string;
  };
  homeTeamId?: number | string;
  home_team_id?: number | string;
  homeTeam?: {
    id?: number | string;
    name?: string;
  };
  awayTeamId?: number | string;
  away_team_id?: number | string;
  awayTeam?: {
    id?: number | string;
    name?: string;
  };
  matchDate?: string;
  match_date?: string;
  startTime?: string;
  start_time?: string;
  venue?: string;
  court?: string;
  field?: string;
  status?: string;
  matchStatus?: string;
  result?: {
    matchId?: number | string;
    homeScore?: number | string;
    awayScore?: number | string;
    winnerTeamId?: number | string;
    completedAt?: string;
    phases?: Array<{
      phaseId?: number | string;
      phaseType?: string;
      phaseNumber?: number | string;
      scores?: Array<{
        phaseId?: number | string;
        teamId?: number | string;
        score?: number | string;
      }>;
    }>;
    tiebreakRequired?: boolean;
    tiebreak?: {
      scores?: Array<{
        matchId?: number | string;
        teamId?: number | string;
        points?: number | string;
      }>;
    };
  };
};

export type ApiMatchPhaseDto = {
  id?: number | string;
  matchId?: number | string;
  phaseType?: string;
  phaseNumber?: number | string;
};

export type ApiMatchPhaseScoreDto = {
  phaseId?: number | string;
  teamId?: number | string;
  score?: number | string;
};

export type ApiMatchTiebreakDto = {
  matchId?: number | string;
  teamId?: number | string;
  points?: number | string;
};

export type ApiGroupStandingDto = {
  groupId?: number | string;
  teamId?: number | string;
  played?: number | string;
  wins?: number | string;
  draws?: number | string;
  losses?: number | string;
  goalsFor?: number | string;
  goalsAgainst?: number | string;
  setsWon?: number | string;
  setsLost?: number | string;
  gamesWon?: number | string;
  gamesLost?: number | string;
  points?: number | string;
};

export type ApiKnockoutRoundCreateResponse = {
  categoryId?: number | string;
  round?: string;
  qualifiedTeams?: number | string;
  bracketSize?: number | string;
  byes?: number | string;
  autoAdvancedTeams?: Array<{
    seed?: number | string;
    advancesToRound?: string;
    team?: {
      id?: number | string;
      name?: string;
    };
  }>;
  createdMatches?: ApiMatchDto[];
};

export type GroupDto = {
  id: string;
  name: string;
  participants: string[];
};

export type RunMatch = {
  id: string;
  backendMatchId?: number;
  categoryId: string;
  groupId?: number;
  groupName?: string;
  round: string;
  homeTeamId: number;
  homeTeamName?: string;
  awayTeamId: number;
  awayTeamName?: string;
  matchDate: string;
  startTime: string;
  venue: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
  winnerTeamId?: number;
  completedAt?: string;
  resultExists?: boolean;
  phases: Array<{
    phaseId?: number;
    phaseType: string;
    phaseNumber: number;
    homeScore?: number;
    awayScore?: number;
  }>;
  tiebreakRequired: boolean;
  tiebreakScore?: {
    home?: number;
    away?: number;
  };
};

export type StandingsRow = {
  teamId: number;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
};

export type MatchPhaseDraft = {
  phaseId?: number;
  phaseType: string;
  phaseNumber: number;
  home: string;
  away: string;
};

export type MatchTiebreakDraft = {
  home: string;
  away: string;
};

export type KnockoutScheduleDraft = {
  matchDate: string;
  startTime: string;
  venue: string;
  bufferMinutes: string;
};

export type KnockoutByeSummary = {
  sourceRound: string;
  advancesToRound: string;
  teamIds: number[];
  seededTeamIds: Array<{ seed: number; teamId: number }>;
};

export type OperationsTab = "matches" | "standings" | "knockout";
