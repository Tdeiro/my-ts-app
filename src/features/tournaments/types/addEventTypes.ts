export type TournamentForm = {
  name: string;
  sport: "" | "Tennis" | "Beach Tennis" | "Padel" | "Pickleball" | "Other";
  level: "" | "Beginner" | "Intermediate" | "Advanced" | "All levels";
  timezone: string;
  locationName: string;
  address: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  capacity: number;
  entryFee: number;
  currency: "" | "AUD" | "USD" | "EUR" | "BRL";
  description: string;
  isPublic: boolean;
  allowWaitlist: boolean;
  requireApproval: boolean;
  tournamentStage: "DRAFT" | "REGISTRATION";
};

export type TournamentCategoryForm = {
  id: string;
  backendId?: number;
  name: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS";
  format: "SINGLES" | "DOUBLES";
  gender: "Women" | "Men" | "Mixed";
  price: number;
  specialPrice?: number | null;
};

export type CategoryPricingRule = {
  enabled: boolean;
  specialPricePerCategory: number;
  currency: "" | "AUD" | "USD" | "EUR" | "BRL";
};
