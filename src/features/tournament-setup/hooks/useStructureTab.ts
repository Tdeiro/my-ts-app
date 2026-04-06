import * as React from "react";
import type { CategorySetupConfig, StructureMode } from "../types";
import { getToken } from "../../auth/services/tokens";
import {
  deleteCategoryStructure,
  saveCategoryStructure,
} from "../services/structureService";

type UseStructureTabArgs = {
  selectedCategoryId: string;
  selectedCategoryTeamsCount: number;
  initialConfig?: CategorySetupConfig;
  initialHasPersistedStructure: boolean;
  onStructureSaved: (config: CategorySetupConfig) => void;
  onPersistedChange: (value: boolean) => void;
};

type UpdateField = "groupCount" | "teamsPerGroup" | "qualifiedPerGroup";

const emptyConfig: CategorySetupConfig = {
  formats: [],
  structureMode: "",
  bracketMatches: [],
};

export function useStructureTab({
  selectedCategoryId,
  selectedCategoryTeamsCount,
  initialConfig,
  initialHasPersistedStructure,
  onStructureSaved,
  onPersistedChange,
}: UseStructureTabArgs) {
  const [config, setConfig] = React.useState<CategorySetupConfig>(
    initialConfig ?? emptyConfig,
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
    setConfig(initialConfig ?? emptyConfig);
    setHasPersistedStructure(initialHasPersistedStructure);
    setError(null);
  }, [initialConfig, initialConfigSignature, initialHasPersistedStructure]);

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
    (field: UpdateField, value: number) => {
      setError(null);
      setConfig((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [],
  );

  const selectStructureMode = React.useCallback((mode: StructureMode | "") => {
    setConfig((current) => ({
      ...current,
      structureMode: mode,
    }));
  }, []);

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
        await deleteCategoryStructure({
          token,
          categoryId: parsedCategoryId,
        });
        setHasPersistedStructure(false);
        onPersistedChange(false);
        onStructureSaved(config);
        return true;
      }

      await saveCategoryStructure({
        token,
        categoryId: parsedCategoryId,
        structureMode: config.structureMode,
        groupCount: Number(config.groupCount ?? 0),
        teamsPerGroup: Number(config.teamsPerGroup ?? 0),
        qualifiedPerGroup: Number(config.qualifiedPerGroup ?? 0),
        hasPersistedStructure,
      });

      setHasPersistedStructure(true);
      onPersistedChange(true);
      onStructureSaved(config);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save structure.");
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

  return {
    config,
    error,
    submitting,
    hasGroupStructureConfig,
    canSaveSelectedCategorySetup,
    selectedTargetTeamsForStructure,
    hasInsufficientCapacity,
    remainingCapacity,
    updateGroupStructureField,
    selectStructureMode,
    persistStructure,
  };
}
