import type {
  CategoryPricingRule,
  TournamentCategoryForm,
  TournamentForm,
} from "../types/addEventTypes";

export const initialForm: TournamentForm = {
  name: "",
  sport: "",
  level: "",
  timezone: "",
  locationName: "",
  address: "",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  registrationDeadline: "",
  capacity: 0,
  entryFee: 0,
  currency: "",
  description: "",
  isPublic: true,
  allowWaitlist: false,
  requireApproval: false,
  tournamentStage: "DRAFT",
};

export const initialCategoryPricingRule: CategoryPricingRule = {
  enabled: false,
  specialPricePerCategory: 0,
  currency: "AUD",
};

export const SPORT_TO_API_VALUE: Record<TournamentForm["sport"], string> = {
  "": "OTHER",
  Tennis: "TENNIS",
  "Beach Tennis": "BEACH_TENNIS",
  Padel: "PADEL",
  Pickleball: "PICKLEBALL",
  Other: "OTHER",
};

export function newCategory(): TournamentCategoryForm {
  return {
    id: crypto.randomUUID(),
    name: "",
    level: "INTERMEDIATE",
    format: "DOUBLES",
    gender: "Men",
    price: 0,
  };
}

export function formatTournamentLevelLabel(level?: string): string {
  const raw = String(level ?? "").trim();
  if (!raw) return "Open";
  const normalized = raw.toUpperCase().replaceAll("_", " ");
  if (normalized === "ALL LEVELS") return "Open";
  return raw.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCategoryLevelLabel(level: TournamentCategoryForm["level"]): string {
  const normalized = String(level).toUpperCase().replaceAll("_", " ");
  if (normalized === "ALL LEVELS") return "Open";
  return normalized.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCategoryFormatLabel(format: TournamentCategoryForm["format"]): string {
  if (format === "SINGLES") return "Singles";
  if (format === "DOUBLES") return "Doubles";
  return "Mixed";
}

export function inferFormatFromCategoryName(name: string): TournamentCategoryForm["format"] {
  const normalized = String(name ?? "").toLowerCase();
  if (normalized.includes("single")) return "SINGLES";
  if (normalized.includes("mixed")) return "MIXED";
  return "DOUBLES";
}

export function teamsLimitSizeFromFormat(format: TournamentCategoryForm["format"]): number {
  if (format === "SINGLES") return 1;
  return 2;
}

export function resolveCategorySpecialPrice(
  basePrice: number,
  pricingRule: CategoryPricingRule,
): number {
  if (pricingRule.enabled) {
    return Math.max(0, Number(pricingRule.specialPricePerCategory || 0));
  }
  return Math.max(0, Number(basePrice || 0));
}

export function buildAutoCategoryName(category: TournamentCategoryForm): string {
  return `${category.gender} - ${formatCategoryLevelLabel(category.level)} - ${formatCategoryFormatLabel(category.format)}`;
}

export function mapApiTournamentLevel(level?: string): TournamentForm["level"] {
  const normalized = String(level ?? "")
    .toUpperCase()
    .replaceAll("_", " ")
    .trim();
  if (normalized === "BEGINNER") return "Beginner";
  if (normalized === "INTERMEDIATE") return "Intermediate";
  if (normalized === "ADVANCED") return "Advanced";
  return "All levels";
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function validateTournamentBasics(form: TournamentForm): string | null {
  const today = getTodayIsoDate();
  if (!form.name.trim()) return "Tournament name is required.";
  if (!form.sport) return "Sport is required.";
  if (!form.timezone) return "Timezone is required.";
  if (!form.startDate) return "Start date is required.";
  if (form.startDate < today) return "Start date cannot be before today.";
  if (!form.endDate) return "End date is required.";
  if (form.endDate < form.startDate) return "End date must be on or after start date.";
  return null;
}
