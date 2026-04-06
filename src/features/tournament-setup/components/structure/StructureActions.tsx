import { Button, Stack } from "@mui/material";
import styles from "./StructureTab.module.css";

type StructureActionsProps = {
  onBack: () => void;
  onNext: () => void;
  disabled: boolean;
  submitting: boolean;
};

export function StructureActions({
  onBack,
  onNext,
  disabled,
  submitting,
}: StructureActionsProps) {
  return (
    <Stack
      className={styles.actions}
      direction={{ xs: "column", sm: "row" }}
      spacing={1.25}
      justifyContent="space-between"
      sx={{ mt: 2 }}
    >
      <Button
        variant="outlined"
        onClick={onBack}
        className={styles.backButton}
      >
        Back: Teams
      </Button>
      <Button
        variant="contained"
        onClick={onNext}
        disabled={disabled}
        className={styles.nextButton}
      >
        {submitting ? "Saving..." : "Next: Groups & Brackets"}
      </Button>
    </Stack>
  );
}
