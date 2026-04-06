import { Alert } from "@mui/material";
import styles from "./StructureTab.module.css";

type StructureErrorAlertProps = {
  message: string | null;
};

export function StructureErrorAlert({ message }: StructureErrorAlertProps) {
  if (!message) return null;
  return (
    <Alert severity="error" className={styles.errorAlert}>
      {message}
    </Alert>
  );
}
