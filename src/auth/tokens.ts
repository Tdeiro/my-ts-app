const TOKEN_KEY = "pp_token";

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function getLoggedInUserId(): number | null {
  const token = getToken();
  if (!token) return null;

  const payload = parseJwtPayload(token);
  if (!payload) return null;

  const rawId = payload.id ?? payload.userId ?? payload.sub;
  const id = Number(rawId);
  return Number.isFinite(id) ? id : null;
}

export function getLoggedInRole(): string | null {
  const token = getToken();
  if (!token) return null;

  const payload = parseJwtPayload(token);
  if (!payload) return null;

  const rawRole =
    payload.role ??
    payload.roleName ??
    (Array.isArray(payload.roles) ? payload.roles[0] : null);
  if (rawRole == null) return null;
  return String(rawRole).trim().toLowerCase();
}

export function isPlayerRole(role: string | null): boolean {
  return role === "player";
}

export function isParticipantRole(role: string | null): boolean {
  return role === "participant" || isPlayerRole(role);
}

export function hasCreatorAccess(role: string | null): boolean {
  if (!role) return false;
  return ["coach", "school", "organization", "club", "admin"].includes(role);
}
