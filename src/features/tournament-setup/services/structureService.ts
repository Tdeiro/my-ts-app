import type { StructureMode } from "../types";

type ApiStructureType =
  | "GROUP_PHASE_KO"
  | "KNOCKOUT_ONLY"
  | "GROUP_PHASE_ONLY"
  | "SWISS";

type SaveStructureArgs = {
  token: string;
  categoryId: number;
  structureMode: StructureMode;
  groupCount: number;
  teamsPerGroup: number;
  qualifiedPerGroup: number;
  hasPersistedStructure: boolean;
};

type DeleteStructureArgs = {
  token: string;
  categoryId: number;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function toApiStructureType(mode: StructureMode): ApiStructureType {
  if (mode === "groups_knockout") return "GROUP_PHASE_KO";
  if (mode === "knockout_only") return "KNOCKOUT_ONLY";
  if (mode === "group_phase_only") return "GROUP_PHASE_ONLY";
  return "SWISS";
}

export async function saveCategoryStructure({
  token,
  categoryId,
  structureMode,
  groupCount,
  teamsPerGroup,
  qualifiedPerGroup,
  hasPersistedStructure,
}: SaveStructureArgs): Promise<void> {
  const payload = {
    categoryId,
    structureType: toApiStructureType(structureMode),
    numberOfGroups: Math.max(0, groupCount),
    teamsPerGroup: Math.max(0, teamsPerGroup),
    qualifiedPerGroup: Math.max(0, qualifiedPerGroup),
  };

  const endpoint = hasPersistedStructure
    ? `${API_URL}/tournament-category-structures/${encodeURIComponent(categoryId)}`
    : `${API_URL}/tournament-category-structures`;
  const method = hasPersistedStructure ? "PUT" : "POST";

  const res = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      body?.message?.[0] || body?.error || "Failed to save structure.",
    );
  }
}

export async function deleteCategoryStructure({
  token,
  categoryId,
}: DeleteStructureArgs): Promise<void> {
  const res = await fetch(
    `${API_URL}/tournament-category-structures/${encodeURIComponent(categoryId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      body?.message?.[0] || body?.error || "Failed to delete structure.",
    );
  }
}
