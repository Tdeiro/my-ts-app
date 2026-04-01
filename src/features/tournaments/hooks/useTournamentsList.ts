import * as React from "react";
import { getToken } from "../../auth/services/tokens";
import type { ApiEvent, Tournament } from "../types/tournamentListTypes";
import { mapApiEvent } from "../utils/tournamentListMappers";
import { fetchTournamentEvents } from "../services/tournamentsListApi";

export type UseTournamentsListArgs = {
  currentUserId: number | null;
};

export type UseTournamentsListResult = {
  items: Tournament[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useTournamentsList({ currentUserId }: UseTournamentsListArgs): UseTournamentsListResult {
  const [items, setItems] = React.useState<Tournament[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadEvents = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = getToken();
    if (!token) {
      setError("You are not logged in.");
      setLoading(false);
      return;
    }
    if (currentUserId === null) {
      setError("Invalid session. Please sign in again.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetchTournamentEvents(token);
      if (!res.ok) {
        const data = res.body as any;
        setError(
          data?.message?.[0] ||
            data?.error ||
            `Failed to load events (${res.status})`,
        );
        setItems([]);
        return;
      }

      const data = res.body as unknown;
      const raw: ApiEvent[] = Array.isArray(data) ? data : ((data as any)?.data ?? []);
      const mapped = raw
        .filter((e) => e.eventType?.toUpperCase() === "TOURNAMENT")
        .filter((e) => {
          const status = String(e.status ?? "").toUpperCase();
          const stage = String(e.tournamentStage ?? "").toUpperCase();
          return (
            !status ||
            ["OPEN", "ACTIVE", "ONGOING", "REGISTRATION"].includes(status) ||
            ["REGISTRATION", "ACTIVE", "ONGOING"].includes(stage)
          );
        })
        .map(mapApiEvent)
        .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

      setItems(mapped);
    } catch {
      setError("Network error loading tournaments.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  React.useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  return { items, loading, error, reload: loadEvents };
}
