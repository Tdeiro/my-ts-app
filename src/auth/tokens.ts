const TOKEN_KEY = "pp_token";
const PLAN_OVERRIDE_KEY = "pp_plan_override";

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(PLAN_OVERRIDE_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PLAN_OVERRIDE_KEY);
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

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const normalized = String(value).trim().toLowerCase();
  return normalized || null;
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

  const rolesArray = Array.isArray(payload.roles)
    ? payload.roles.map((role) => String(role).trim().toLowerCase())
    : [];
  const roleFromArray = rolesArray.includes("player")
    ? "player"
    : rolesArray.includes("participant")
      ? "participant"
      : rolesArray[0];
  const rawRole = payload.role ?? payload.roleName ?? roleFromArray ?? null;
  return normalizeText(rawRole);
}

export function getLoggedInPlan(): string | null {
  const planOverride = normalizeText(localStorage.getItem(PLAN_OVERRIDE_KEY));
  if (planOverride) return planOverride;

  const token = getToken();
  if (!token) return null;

  const payload = parseJwtPayload(token);
  if (!payload) return null;

  return normalizeText(payload.plan ?? payload.subscriptionPlan ?? null);
}

export function setLoggedInPlanOverride(plan: string | null) {
  const normalized = normalizeText(plan);
  if (!normalized) {
    localStorage.removeItem(PLAN_OVERRIDE_KEY);
    return;
  }
  localStorage.setItem(PLAN_OVERRIDE_KEY, normalized);
}

export function isPlayerRole(role: string | null): boolean {
  return role === "player";
}

export function isParticipantRole(role: string | null): boolean {
  return role === "participant" || isPlayerRole(role);
}

export function hasCreatorAccess(role: string | null): boolean {
  const normalizedRole = normalizeText(role);
  if (
    normalizedRole &&
    ["coach", "school", "organization", "club", "admin"].includes(
      normalizedRole,
    )
  ) {
    return true;
  }

  const normalizedPlan = getLoggedInPlan();
  return normalizedPlan === "pro";
}
