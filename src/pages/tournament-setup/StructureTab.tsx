import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { getToken } from "../../auth/tokens";
import type { CategorySetupConfig, StructureMode } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type ApiStructureType =
  | "GROUP_PHASE_KO"
  | "KNOCKOUT_ONLY"
  | "GROUP_PHASE_ONLY"
  | "SWISS";

function toApiStructureType(mode: StructureMode): ApiStructureType {
  if (mode === "groups_knockout") return "GROUP_PHASE_KO";
  if (mode === "knockout_only") return "KNOCKOUT_ONLY";
  if (mode === "group_phase_only") return "GROUP_PHASE_ONLY";
  return "SWISS";
}

type StructureOption = {
  id: StructureMode | "";
  title: string;
  subtitle: string;
};

type StructureTabProps = {
  selectedCategoryId: string;
  selectedCategoryLevel: string;
  selectedCategoryDisplayName: string;
  selectedCategoryTeamsCount: number;
  initialConfig?: CategorySetupConfig;
  initialHasPersistedStructure: boolean;
  structureOptions: StructureOption[];
  onStructureSaved: (config: CategorySetupConfig) => void;
  onPersistedChange: (value: boolean) => void;
  onBackToTeams: () => void;
  onNextToGroups: () => void;
};

export function StructureTab({
  selectedCategoryId,
  selectedCategoryLevel,
  selectedCategoryDisplayName,
  selectedCategoryTeamsCount,
  initialConfig,
  initialHasPersistedStructure,
  structureOptions,
  onStructureSaved,
  onPersistedChange,
  onBackToTeams,
  onNextToGroups,
}: StructureTabProps) {
  const [config, setConfig] = React.useState<CategorySetupConfig>(
    initialConfig ?? {
      formats: [],
      structureMode: "",
      bracketMatches: [],
    },
  );
  const [hasPersistedStructure, setHasPersistedStructure] = React.useState(
    initialHasPersistedStructure,
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const initialConfigSignature = React.useMemo(
    () =>
      JSON.stringify({
        selectedCategoryId,
        initialHasPersistedStructure,
        structureMode: initialConfig?.structureMode ?? "",
        groupCount: initialConfig?.groupCount ?? "",
        teamsPerGroup: initialConfig?.teamsPerGroup ?? "",
        qualifiedPerGroup: initialConfig?.qualifiedPerGroup ?? "",
      }),
    [initialConfig, initialHasPersistedStructure, selectedCategoryId],
  );
  const lastAppliedSignatureRef = React.useRef<string>(initialConfigSignature);

  React.useEffect(() => {
    if (lastAppliedSignatureRef.current === initialConfigSignature) return;
    lastAppliedSignatureRef.current = initialConfigSignature;
    setConfig(
      initialConfig ?? {
        formats: [],
        structureMode: "",
        bracketMatches: [],
      },
    );
    setHasPersistedStructure(initialHasPersistedStructure);
    setError(null);
  }, [initialConfig, initialConfigSignature, initialHasPersistedStructure, selectedCategoryId]);

  const hasGroupStructureConfig = React.useMemo(() => {
    if (config.structureMode !== "groups_knockout") return false;
    const groupCount = Number(config.groupCount ?? 0);
    const teamsPerGroup = Number(config.teamsPerGroup ?? 0);
    const qualifiedPerGroup = Number(config.qualifiedPerGroup ?? 0);
    return (
      groupCount > 0 &&
      teamsPerGroup >= 2 &&
      qualifiedPerGroup > 0 &&
      qualifiedPerGroup <= teamsPerGroup
    );
  }, [config]);

  const canSaveSelectedCategorySetup = React.useMemo(() => {
    if (!config.structureMode) return false;
    if (config.structureMode !== "groups_knockout") return true;
    return hasGroupStructureConfig;
  }, [config.structureMode, hasGroupStructureConfig]);

  const selectedTargetTeamsForStructure =
    config.structureMode === "groups_knockout"
      ? Math.max(
          0,
          Number(config.groupCount ?? 0) * Number(config.teamsPerGroup ?? 0),
        )
      : 0;
  const hasInsufficientCapacity =
    config.structureMode === "groups_knockout" &&
    selectedTargetTeamsForStructure > 0 &&
    selectedCategoryTeamsCount > selectedTargetTeamsForStructure;
  const remainingCapacity =
    config.structureMode === "groups_knockout"
      ? selectedTargetTeamsForStructure - selectedCategoryTeamsCount
      : 0;

  const updateGroupStructureField = React.useCallback(
    (field: "groupCount" | "teamsPerGroup" | "qualifiedPerGroup", value: number) => {
      setError(null);
      setConfig((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [],
  );

  const persistStructure = React.useCallback(async (): Promise<boolean> => {
    const token = getToken();
    const parsedCategoryId = Number(selectedCategoryId);
    if (!token) {
      setError("You are not logged in.");
      return false;
    }
    if (!Number.isFinite(parsedCategoryId) || parsedCategoryId <= 0) {
      setError("Invalid category id for structure.");
      return false;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (!config.structureMode) {
        if (!hasPersistedStructure) {
          onStructureSaved(config);
          return true;
        }
        const deleteRes = await fetch(
          `${API_URL}/tournament-category-structures/${encodeURIComponent(parsedCategoryId)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const deleteBody = await deleteRes.json().catch(() => null);
        if (!deleteRes.ok) {
          throw new Error(
            deleteBody?.message?.[0] ||
              deleteBody?.error ||
              "Failed to delete structure.",
          );
        }
        setHasPersistedStructure(false);
        onPersistedChange(false);
        onStructureSaved(config);
        return true;
      }

      const payload = {
        categoryId: parsedCategoryId,
        structureType: toApiStructureType(config.structureMode),
        numberOfGroups: Math.max(0, Number(config.groupCount ?? 0)),
        teamsPerGroup: Math.max(0, Number(config.teamsPerGroup ?? 0)),
        qualifiedPerGroup: Math.max(0, Number(config.qualifiedPerGroup ?? 0)),
      };

      const endpoint = hasPersistedStructure
        ? `${API_URL}/tournament-category-structures/${encodeURIComponent(parsedCategoryId)}`
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
          body?.message?.[0] ||
            body?.error ||
            "Failed to save structure.",
        );
      }
      setHasPersistedStructure(true);
      onPersistedChange(true);
      onStructureSaved(config);
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save structure.",
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [
    config,
    hasPersistedStructure,
    onPersistedChange,
    onStructureSaved,
    selectedCategoryId,
  ]);

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ mb: 2.5 }}>
          <Typography
            sx={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "#6A7282",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              mb: 1,
            }}
          >
            {selectedCategoryLevel}
          </Typography>
          <Box
            sx={{
              p: 1.5,
              borderRadius: "14px",
              border: "1.5px solid #8B5CF6",
              bgcolor: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "10px",
                bgcolor: "#FFEDD4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <EmojiEventsRoundedIcon sx={{ fontSize: 24, color: "#F54900" }} />
            </Box>
            <Typography
              sx={{
                fontSize: "1.6rem",
                fontWeight: 700,
                color: "#101828",
                lineHeight: 1.2,
              }}
            >
              {selectedCategoryDisplayName}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: "10px",
            bgcolor: "#F9FAFB",
            border: "1px solid #E5E7EB",
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              color: "#101828",
              fontSize: "0.95rem",
              mb: 0.5,
            }}
          >
            Instructions
          </Typography>
          <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
            1. Confirm teams for this category.
          </Typography>
          <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
            2. Pick the structure and set group inputs if needed.
          </Typography>
          <Typography sx={{ color: "#4A5565", fontSize: "0.85rem" }}>
            3. Continue to Groups & Brackets.
          </Typography>
        </Box>

        <Box
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: "10px",
            bgcolor: "#F9FAFB",
            border: "1px solid #E5E7EB",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
          <Typography sx={{ fontWeight: 700, color: "#101828", fontSize: "0.9rem" }}>
            Teams available for this category
          </Typography>
            <Chip
              size="small"
              label={`${selectedCategoryTeamsCount} team${selectedCategoryTeamsCount === 1 ? "" : "s"}`}
              sx={{ fontWeight: 700 }}
            />
          </Stack>
          {selectedTargetTeamsForStructure > 0 ? (
            <Typography sx={{ color: "#4A5565", fontSize: "0.8125rem", mt: 0.75 }}>
              Current structure needs about {selectedTargetTeamsForStructure} teams
              ({config.groupCount ?? 0} groups x {config.teamsPerGroup ?? 0} teams/group).
            </Typography>
          ) : null}
        </Box>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {hasInsufficientCapacity ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Total capacity is too small for the number of teams in this category. Increase groups or teams per group before continuing.
          </Alert>
        ) : null}

        <Typography variant="body1" sx={{ fontWeight: 900, mb: 1 }}>
          Structure
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Configure structure for the selected category.
        </Typography>

        <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
          Structure
        </Typography>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.25}
          useFlexGap
          flexWrap="wrap"
        >
          {structureOptions.map((opt) => {
            const isSelected = config.structureMode === opt.id;
            return (
              <Card
                key={opt.id}
                onClick={() =>
                  setConfig((current) => ({
                    ...current,
                    structureMode: opt.id,
                  }))
                }
                sx={{
                  cursor: "pointer",
                  width: { xs: "100%", md: "calc(50% - 5px)" },
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: isSelected
                    ? "rgba(139,92,246,0.45)"
                    : "rgba(15,23,42,0.10)",
                  bgcolor: isSelected
                    ? "rgba(139,92,246,0.08)"
                    : "background.paper",
                }}
              >
                <CardContent sx={{ p: 1.5 }}>
                  <Typography sx={{ fontWeight: 800 }}>{opt.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {opt.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Stack>

        {config.structureMode === "groups_knockout" ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
              Group Phase Inputs
            </Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
              <TextField
                label="Number of groups"
                type="number"
                value={config.groupCount ?? ""}
                onChange={(e) =>
                  updateGroupStructureField(
                    "groupCount",
                    Math.max(1, Number(e.target.value || 0)),
                  )
                }
                fullWidth
              />
              <TextField
                label="Teams per group (min 2)"
                type="number"
                value={config.teamsPerGroup ?? ""}
                onChange={(e) =>
                  updateGroupStructureField(
                    "teamsPerGroup",
                    Math.max(2, Number(e.target.value || 0)),
                  )
                }
                fullWidth
              />
              <TextField
                label="Qualified per group"
                type="number"
                value={config.qualifiedPerGroup ?? ""}
                onChange={(e) =>
                  updateGroupStructureField(
                    "qualifiedPerGroup",
                    Math.max(1, Number(e.target.value || 0)),
                  )
                }
                fullWidth
              />
            </Stack>
            <Typography
              variant="caption"
              sx={{
                mt: 1,
                display: "block",
                color: hasInsufficientCapacity ? "#B42318" : "#475467",
                fontWeight: hasInsufficientCapacity ? 700 : 500,
              }}
            >
              Capacity: {selectedTargetTeamsForStructure} team slots for {selectedCategoryTeamsCount} registered teams.
              {hasInsufficientCapacity
                ? ` Add ${Math.abs(remainingCapacity)} more slot${Math.abs(remainingCapacity) === 1 ? "" : "s"} to continue.`
                : remainingCapacity > 0
                  ? ` ${remainingCapacity} slot${remainingCapacity === 1 ? "" : "s"} remaining.`
                  : " Capacity is exactly full."}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Groups and bracket will be prepared in the Groups & Brackets tab.
            </Typography>
          </>
        ) : null}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          justifyContent="space-between"
          sx={{ mt: 2 }}
        >
          <Button variant="outlined" onClick={onBackToTeams} sx={{ borderRadius: 999 }}>
            Back: Teams
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              const saved = await persistStructure();
              if (!saved) return;
              onNextToGroups();
            }}
            disabled={
              submitting ||
              !canSaveSelectedCategorySetup ||
              (config.structureMode === "groups_knockout" &&
                (!hasGroupStructureConfig || hasInsufficientCapacity))
            }
            sx={{ borderRadius: 999 }}
          >
            {submitting ? "Saving..." : "Next: Groups & Brackets"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
