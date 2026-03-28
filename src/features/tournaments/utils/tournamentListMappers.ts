import type { ApiEvent, Tournament } from "../types/tournamentListTypes";
import { formatTournamentLevelLabel } from "./tournamentListFormatters";

export function mapApiEvent(e: ApiEvent): Tournament {
  const ownerRaw = e.createdBy;
  const ownerId = ownerRaw == null ? null : Number(ownerRaw);
  const capacity = Number(e.capacity ?? 0);
  const subscriptionsCount = Number(e.subscriptionsCount ?? 0);
  const capacityLeftRaw = Number(e.capacityLeft);
  const safeCapacity = Number.isFinite(capacity) ? Math.max(0, capacity) : 0;
  const safeSubscriptions = Number.isFinite(subscriptionsCount)
    ? Math.max(0, subscriptionsCount)
    : 0;
  const safeCapacityLeft = Number.isFinite(capacityLeftRaw)
    ? Math.max(0, capacityLeftRaw)
    : Math.max(0, safeCapacity - safeSubscriptions);
  return {
    id: String(e.id),
    ownerId: Number.isFinite(ownerId) ? ownerId : null,
    name: e.name ?? "Untitled",
    sport: e.sport ?? "Other",
    format: e.format ?? "-",
    level: formatTournamentLevelLabel(e.level ?? "All levels"),
    locationName: e.locationName ?? "-",
    startDate: e.startDate,
    capacity: safeCapacity,
    subscriptionsCount: safeSubscriptions,
    capacityLeft: safeCapacityLeft,
    entryFee:
      typeof e.entryFee === "string" ? Number(e.entryFee) : (e.entryFee ?? 0),
    currency: (e.currency ?? "AUD").toUpperCase(),
    status: "Open",
    isPublic: e.isPublic ?? true,
    apiStatus: String(e.status ?? "").toUpperCase(),
    registrationDeadline: e.registrationDeadline ?? e.startDate,
    tournamentStage: String(e.tournamentStage ?? "REGISTRATION").toUpperCase(),
  };
}
