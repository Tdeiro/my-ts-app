export type ApiEvent = {
  id: number;
  createdBy?: number | string;
  name: string;
  eventType: string;
  sport?: string;
  format?: string;
  level?: string;
  locationName?: string;
  startDate: string;
  registrationDeadline?: string;
  capacity?: number | string;
  subscriptionsCount?: number | string;
  capacityLeft?: number | string;
  status?: string;
  entryFee?: number | string;
  currency?: string;
  isPublic?: boolean;
  tournamentStage?: string;
  categoriesCount?: number | string;
  groupsCount?: number | string;
  teamsCount?: number | string;
  membersCount?: number | string;
};

export type Tournament = {
  id: string;
  ownerId: number | null;
  name: string;
  sport: string;
  format: string;
  level: string;
  locationName: string;
  startDate: string;
  capacity: number;
  subscriptionsCount: number;
  capacityLeft: number;
  entryFee: number;
  currency: string;
  status: "Open";
  isPublic: boolean;
  apiStatus?: string;
  registrationDeadline: string;
  tournamentStage: string;
};

export type TournamentDisplayMeta = {
  timeLabel: string;
  organizer: string;
  totalSpots: number;
  spotsLeft: number;
  registrationDeadline: string;
};
