import { Card, CardContent, Typography } from "@mui/material";
import styles from "./StructureTab.module.css";
import type { StructureMode } from "../../types";

type StructureOption = {
  id: StructureMode | "";
  title: string;
  subtitle: string;
};

type StructureOptionsGridProps = {
  options: StructureOption[];
  selectedId: StructureMode | "";
  onSelect: (value: StructureMode | "") => void;
};

export function StructureOptionsGrid({
  options,
  selectedId,
  onSelect,
}: StructureOptionsGridProps) {
  return (
    <div className={styles.optionsGrid}>
      {options.map((option) => {
        const isSelected = selectedId === option.id;
        return (
          <Card
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={`${styles.optionCard} ${
              isSelected ? styles.optionCardSelected : ""
            }`}
          >
            <CardContent className={styles.optionContent}>
              <Typography className={styles.subsectionTitle}>
                {option.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {option.subtitle}
              </Typography>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
