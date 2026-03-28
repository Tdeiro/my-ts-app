const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type TournamentListApiResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

export async function fetchTournamentEvents(token: string): Promise<TournamentListApiResult> {
  const res = await fetch(`${API_URL}/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}
