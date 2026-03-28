import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type {
  CategoryPricingRule,
  TournamentCategoryForm,
} from "../../types/addEventTypes";
import {
  formatCategoryFormatLabel,
} from "../../utils/addEventHelpers";

export type CategoryModalProps = {
  open: boolean;
  onClose: () => void;
  editingCategoryId: string | null;
  draftCategory: TournamentCategoryForm;
  setDraftCategory: React.Dispatch<React.SetStateAction<TournamentCategoryForm>>;
  draftGenders: TournamentCategoryForm["gender"][];
  setDraftGenders: React.Dispatch<React.SetStateAction<TournamentCategoryForm["gender"][]>>;
  draftFormats: TournamentCategoryForm["format"][];
  setDraftFormats: React.Dispatch<React.SetStateAction<TournamentCategoryForm["format"][]>>;
  categoryPricingRule: CategoryPricingRule;
  errorMessage?: string | null;
  statusMessage?: string | null;
  onCancel: () => void;
  onSave: () => void;
};

export default function CategoryModal({
  open,
  onClose,
  editingCategoryId,
  draftCategory,
  setDraftCategory,
  draftGenders,
  setDraftGenders,
  draftFormats,
  setDraftFormats,
  categoryPricingRule,
  errorMessage,
  statusMessage,
  onCancel,
  onSave,
}: CategoryModalProps) {
  // Modal used by Step 2 to create or edit a category draft.
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {editingCategoryId ? "Edit Category" : "New Category"}
      </DialogTitle>
      <DialogContent dividers>
        {errorMessage ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        ) : null}
        {statusMessage ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {statusMessage}
          </Alert>
        ) : null}
        <Stack spacing={3} sx={{ pt: 1 }}>
          <TextField
            label="Category Name (optional)"
            value={draftCategory.name}
            onChange={(e) =>
              setDraftCategory((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            placeholder="Auto-generated if left empty"
            fullWidth
          />

          {editingCategoryId ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                label="Level"
                value={draftCategory.level}
                onChange={(e) =>
                  setDraftCategory((prev) => ({
                    ...prev,
                    level: e.target.value as TournamentCategoryForm["level"],
                  }))
                }
                fullWidth
              >
                <MenuItem value="BEGINNER">Beginner</MenuItem>
                <MenuItem value="INTERMEDIATE">Intermediate</MenuItem>
                <MenuItem value="ADVANCED">Advanced</MenuItem>
                <MenuItem value="ALL_LEVELS">Open</MenuItem>
              </TextField>
              <TextField
                select
                label="Gender"
                value={draftCategory.gender}
                onChange={(e) =>
                  setDraftCategory((prev) => ({
                    ...prev,
                    gender: e.target.value as TournamentCategoryForm["gender"],
                  }))
                }
                fullWidth
              >
                <MenuItem value="Men">Men</MenuItem>
                <MenuItem value="Women">Women</MenuItem>
              </TextField>
            </Stack>
          ) : (
            <TextField
              select
              label="Level"
              value={draftCategory.level}
              onChange={(e) =>
                setDraftCategory((prev) => ({
                  ...prev,
                  level: e.target.value as TournamentCategoryForm["level"],
                }))
              }
              fullWidth
            >
              <MenuItem value="BEGINNER">Beginner</MenuItem>
              <MenuItem value="INTERMEDIATE">Intermediate</MenuItem>
              <MenuItem value="ADVANCED">Advanced</MenuItem>
              <MenuItem value="ALL_LEVELS">Open</MenuItem>
            </TextField>
          )}

          {!editingCategoryId ? (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#F9FAFB",
                border: "1px solid #E5E7EB",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#374151",
                  mb: 1,
                }}
              >
                Genders
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                {(["Men", "Women", "Mixed"] as const).map((gender) => (
                  <FormControlLabel
                    key={gender}
                    sx={{ m: 0 }}
                    control={
                      <Checkbox
                        checked={draftGenders.includes(gender)}
                        onChange={(_, checked) => {
                          setDraftGenders((prev) => {
                            if (checked) {
                              return prev.includes(gender)
                                ? prev
                                : [...prev, gender];
                            }
                            return prev.filter((item) => item !== gender);
                          });
                        }}
                      />
                    }
                    label={gender}
                  />
                ))}
              </Stack>
              <Typography sx={{ mt: 1, fontSize: "0.75rem", color: "#6B7280" }}>
                Choose one or more genders to create all combinations in one
                go.
              </Typography>
            </Box>
          ) : null}

          {editingCategoryId ? (
            <TextField
              select
              label="Format"
              value={draftCategory.format}
              onChange={(e) =>
                setDraftCategory((prev) => ({
                  ...prev,
                  format: e.target.value as TournamentCategoryForm["format"],
                }))
              }
              fullWidth
            >
              <MenuItem value="SINGLES">Singles</MenuItem>
              <MenuItem value="DOUBLES">Doubles</MenuItem>
              {/* <MenuItem value="MIXED">Mixed</MenuItem> */}
            </TextField>
          ) : (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#F9FAFB",
                border: "1px solid #E5E7EB",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#374151",
                  mb: 1,
                }}
              >
                Formats (Optional)
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                {(["SINGLES", "DOUBLES"] as const).map((format) => (
                  <FormControlLabel
                    key={format}
                    sx={{ m: 0 }}
                    control={
                      <Checkbox
                        checked={draftFormats.includes(format)}
                        onChange={(_, checked) => {
                          setDraftFormats((prev) => {
                            if (checked) {
                              return prev.includes(format)
                                ? prev
                                : [...prev, format];
                            }
                            return prev.filter((item) => item !== format);
                          });
                        }}
                      />
                    }
                    label={formatCategoryFormatLabel(format)}
                  />
                ))}
              </Stack>
              <Typography sx={{ mt: 1, fontSize: "0.75rem", color: "#6B7280" }}>
                Choose formats to create multiple categories at once. If none
                are selected, the tournament format will be used.
              </Typography>
            </Box>
          )}

          <TextField
            label={`Category Price (${categoryPricingRule.currency || "AUD"})`}
            type="number"
            value={draftCategory.price}
            onChange={(e) =>
              setDraftCategory((prev) => ({
                ...prev,
                price: Math.max(0, Number(e.target.value || 0)),
              }))
            }
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          sx={{
            borderRadius: 2,
            borderWidth: "1.5px",
            borderColor: "#E5E7EB",
            color: "#374151",
            fontWeight: 600,
            textTransform: "none",
            "&:hover": {
              borderWidth: "1.5px",
              borderColor: "#D1D5DB",
              bgcolor: "#F9FAFB",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          sx={{
            borderRadius: 2,
            background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
            fontWeight: 600,
            textTransform: "none",
          }}
        >
          {editingCategoryId
            ? "Save Category"
            : `Add ${
                draftFormats.length * draftGenders.length > 1
                  ? `${draftFormats.length * draftGenders.length} Categories`
                  : "Category"
              }`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
