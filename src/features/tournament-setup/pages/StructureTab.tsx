import * as React from "react";
import { Card, CardContent, Divider, Typography } from "@mui/material";
import type { CategorySetupConfig, StructureMode } from "../types";
import { useStructureTab } from "../hooks/useStructureTab";
import { CategoryHeaderCard } from "../components/structure/CategoryHeaderCard";
import { InstructionsCard } from "../components/structure/InstructionsCard";
import { TeamsCapacityCard } from "../components/structure/TeamsCapacityCard";
import { StructureErrorAlert } from "../components/structure/StructureErrorAlert";
import { StructureOptionsGrid } from "../components/structure/StructureOptionsGrid";
import { GroupPhaseInputs } from "../components/structure/GroupPhaseInputs";
import { StructureActions } from "../components/structure/StructureActions";
import styles from "../components/structure/StructureTab.module.css";

type StructureOption = {
  id: StructureMode | "";
  title: string;
  subtitle: string;
};

export type StructureTabProps = {
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
  const {
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
  } = useStructureTab({
    selectedCategoryId,
    selectedCategoryTeamsCount,
    initialConfig,
    initialHasPersistedStructure,
    onStructureSaved,
    onPersistedChange,
  });

  const handleNext = React.useCallback(async () => {
    const saved = await persistStructure();
    if (!saved) return;
    onNextToGroups();
  }, [onNextToGroups, persistStructure]);

  return (
    <Card>
      <CardContent className={styles.cardContent} sx={{ p: 3 }}>
        <CategoryHeaderCard
          level={selectedCategoryLevel}
          displayName={selectedCategoryDisplayName}
        />

        <InstructionsCard />

        <TeamsCapacityCard
          teamsCount={selectedCategoryTeamsCount}
          selectedTargetTeamsForStructure={selectedTargetTeamsForStructure}
          groupCount={config.groupCount}
          teamsPerGroup={config.teamsPerGroup}
        />

        <StructureErrorAlert message={error} />

        {hasInsufficientCapacity ? (
          // Temporarily disabled: capacity warning validation UI.
          // <Alert severity="warning" className={styles.errorAlert}>
          //   Total capacity is too small for the number of teams in this category. Increase groups or teams per group before continuing.
          // </Alert>
          null
        ) : null}

        <Typography variant="body1" className={styles.sectionTitle}>
          Structure
        </Typography>
        <Divider className={styles.divider} />
        <Typography variant="body2" color="text.secondary" className={styles.sectionSubtitle}>
          Configure structure for the selected category.
        </Typography>

        <Typography variant="body2" className={styles.subsectionTitle}>
          Structure
        </Typography>
        <StructureOptionsGrid
          options={structureOptions}
          selectedId={config.structureMode}
          onSelect={selectStructureMode}
        />

        {config.structureMode === "groups_knockout" ? (
          <>
            <Divider className={styles.dividerSpaced} />
            <GroupPhaseInputs
              groupCount={config.groupCount}
              teamsPerGroup={config.teamsPerGroup}
              qualifiedPerGroup={config.qualifiedPerGroup}
              selectedTargetTeamsForStructure={selectedTargetTeamsForStructure}
              selectedCategoryTeamsCount={selectedCategoryTeamsCount}
              hasInsufficientCapacity={hasInsufficientCapacity}
              remainingCapacity={remainingCapacity}
              onFieldChange={updateGroupStructureField}
            />
          </>
        ) : null}

        <StructureActions
          onBack={onBackToTeams}
          onNext={handleNext}
          submitting={submitting}
          disabled={
            submitting ||
            !canSaveSelectedCategorySetup ||
            (config.structureMode === "groups_knockout" && !hasGroupStructureConfig)
          }
        />
      </CardContent>
    </Card>
  );
}
