const UPCOMING_SUBSCRIBED_EVENTS_KEY = "upcoming.subscribedEventIds";

export function readSubscribedEventIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(UPCOMING_SUBSCRIBED_EVENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
        .map((item) => String(item)),
    );
  } catch {
    return new Set();
  }
}
