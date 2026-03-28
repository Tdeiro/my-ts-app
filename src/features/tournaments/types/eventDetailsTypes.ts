export type EventCategoryDto = {
  id: number | string;
  name?: string;
  level?: string;
  gender?: string;
  price?: number | string;
};

export type EventDetailsDto = {
  id: number | string;
  name?: string;
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
  status?: string;
  categories?: EventCategoryDto[];
};
