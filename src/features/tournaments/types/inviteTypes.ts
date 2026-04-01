export type EventDetailsCategoryDto = {
  id: number | string;
  name?: string;
  level?: string;
  minAge?: number | null;
  maxAge?: number | null;
  gender?: string;
  price?: number | string;
};

export type EventDetailsDto = {
  id: number | string;
  createdBy?: number | string;
  name?: string;
  eventType?: string;
  sport?: string;
  level?: string;
  timezone?: string;
  locationName?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  registrationDeadline?: string;
  entryFee?: number | string;
  currency?: string;
  tournamentStage?: string;
  categories?: EventDetailsCategoryDto[];
};

export type DashboardEventDto = {
  id?: number | string;
  status?: string;
  subscriptionStatus?: string;
  eventType?: string;
};

export type DashboardApiResp = {
  events?:
    | Array<
        | DashboardEventDto
        | {
            event?: DashboardEventDto | null;
          }
      >
    | null;
};

export type UserScopedEventDto = {
  id?: number | string;
  eventType?: string;
};

export type SubscribeMePayload = {
  eventId: number;
  categories: Array<{
    id: number;
    suggestedPlayer?: string;
    note?: string;
  }>;
};

export type Category = {
  id: string;
  name: string;
  level: string;
  gender: "Men" | "Women" | "Mixed";
  format: "Singles" | "Doubles" | "Mixed";
  tabLabel: string;
  optionLabel: string;
  selectionLabel: string;
  minAge: string;
  maxAge: string;
  fee: number;
};

export type SelectedCategory = Category & {
  partnerName: string;
  partnerNote: string;
};

export type InviteUiModel = {
  eventId: number;
  name: string;
  timezone: string;
  location: string;
  address: string;
  dateLabel: string;
  dateMeta: string;
  timeLabel: string;
  timeMeta: string;
  feeLabel: string;
  feeMeta: string;
  deadlineLabel: string;
  deadlineMeta: string;
  stage: string;
  currency: string;
};
