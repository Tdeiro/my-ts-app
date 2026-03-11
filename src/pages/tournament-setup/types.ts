import { type BuilderBracketMatch } from "../../Components/Shared/TournamentPhaseBuilder";

export type ApiEvent = {
  id: number | string;
  userId?: number | string;
  user_id?: number | string;
  name?: string;
  eventType?: string;
  sport?: string;
  format?: string;
  level?: string;
  locationName?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  registrationDeadline?: string;
  capacity?: number | string;
  subscriptionsCount?: number | string;
  capacityLeft?: number | string;
  categoriesCount?: number | string;
  categories?: ApiEventDetailsCategory[];
};

export type ApiTournamentCategory = {
  id: number | string;
  eventId?: number | string;
  name?: string;
  level?: string;
  minAge?: number | string | null;
  maxAge?: number | string | null;
  gender?: string;
  teamsLimitSize?: number | string | null;
  price?: number | string | null;
  specialPrice?: number | string | null;
  currency?: string | null;
  structure?: unknown;
};

export type ApiCategoryGroupTeamMember = {
  userId?: number | string;
  userFullName?: string;
  joinedAt?: string;
};

export type ApiCategoryGroupTeam = {
  id?: number | string;
  name?: string;
  autoNameFromMembers?: boolean;
  updatedAt?: string;
  updatedBy?: string;
  membersCount?: number | string;
  members?: ApiCategoryGroupTeamMember[];
};

export type ApiEventDetailsCategoryGroup = {
  id?: number | string;
  name?: string;
  teamsCount?: number | string;
  teams?: ApiCategoryGroupTeam[];
};

export type ApiEventDetailsCategory = ApiTournamentCategory & {
  groupsCount?: number | string;
  teamsCount?: number | string;
  groups?: ApiEventDetailsCategoryGroup[];
};

export type ApiEventDetailsResponse = {
  event?: ApiEvent | null;
};

export type TeamMemberDto = {
  userId: number;
  userFullName?: string;
  role?: string;
  joinedAt?: string;
};

export type TeamDto = {
  id: number;
  categoryId: number;
  name?: string;
  autoNameFromMembers?: boolean;
  createdAt?: string;
  members?: TeamMemberDto[];
};

export type ApiTournamentGroup = {
  id: number;
  categoryId: number;
  name: string;
  teamIds?: Array<number | string>;
  teams?: Array<{
    id?: number | string;
    name?: string;
    autoNameFromMembers?: boolean;
    members?: TeamMemberDto[];
  }>;
};

export type ApiEventSubscriptionCategory = {
  id?: number | string;
  suggestedPlayer?: string | null;
  note?: string | null;
};

export type ApiEventSubscription = {
  eventId?: number | string;
  userId?: number | string;
  userFullName?: string;
  userEmail?: string;
  status?: string;
  source?: string;
  categories?: ApiEventSubscriptionCategory[];
  joinedAt?: string;
};

export type ApiMatchDto = {
  id?: number | string;
  groupId?: number | string | null;
  round?: string | null;
  categoryId?: number | string | null;
  homeTeamId?: number | string | null;
  awayTeamId?: number | string | null;
  matchDate?: string | null;
  startTime?: string | null;
  venue?: string | null;
  status?: string | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
};

export type RegisteredPlayer = {
  id: string;
  name: string;
  email: string;
  preferredPartner: string | null;
  categoryIds: string[];
};

export type TeamEditorState = {
  name: string;
  memberUserIds: string[];
  autoNameFromMembers: boolean;
  editingTeamId: number | null;
};

export type StructureMode =
  | "groups_knockout"
  | "knockout_only"
  | "group_phase_only"
  | "swiss";

export type TournamentFormat = "Singles" | "Doubles" | "Teams";

export type SetupTab = "overview" | "categories" | "teams" | "groups" | "schedule";

export type CategoryScheduleItem = {
  id: string;
  matchLabel: string;
  startTime: string;
  endTime: string;
  venue: string;
  backendMatchId?: number;
  groupId?: number;
  round?: string;
  homeTeamId?: number;
  awayTeamId?: number;
  matchDate?: string;
  status?: string;
};

export type ScheduleDraftInput = {
  groupId: string;
  round: string;
  homeTeamId: string;
  awayTeamId: string;
  matchDate: string;
  startTime: string;
  venue: string;
  status: string;
};

export type CategorySetupConfig = {
  formats: TournamentFormat[];
  structureMode: StructureMode | "";
  groupCount?: number;
  teamsPerGroup?: number;
  qualifiedPerGroup?: number;
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  scheduleDate?: string;
  scheduleVenue?: string;
  scheduleBufferMinutes?: number;
  scheduleItems?: CategoryScheduleItem[];
  bracketMatches?: BuilderBracketMatch[];
};
