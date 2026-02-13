import * as React from "react";
import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";

type AccountType = "participant" | "coach" | "organization";

export default function AccountTypeSelector() {
  const [accountType, setAccountType] =
    React.useState<AccountType>("participant");
  const [orgName, setOrgName] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  const showOrgName = accountType === "organization";
  const orgNameError = showOrgName && touched && orgName.trim().length === 0;

  return (
    <Box>
      <FormControl required>
        <FormLabel id="account-type-label">I’m signing up as</FormLabel>

        <RadioGroup
          row
          aria-labelledby="account-type-label"
          name="account-type"
          value={accountType}
          onChange={(e) => {
            const next = e.target.value as AccountType;
            setAccountType(next);

            // reset org name if they switch away
            if (next !== "organization") {
              setOrgName("");
              setTouched(false);
            }
          }}
        >
          <FormControlLabel
            value="participant"
            control={<Radio />}
            label="Player / Participant"
          />
          <FormControlLabel value="coach" control={<Radio />} label="Coach" />
          <FormControlLabel
            value="organization"
            control={<Radio />}
            label="School / Club"
          />
        </RadioGroup>
      </FormControl>

      {/* Conditional field */}
      {showOrgName ? (
        <Box sx={{ mt: 2 }}>
          <TextField
            label="School / Club name"
            placeholder="e.g. Manly Beach Tennis School"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            onBlur={() => setTouched(true)}
            required
            fullWidth
            error={orgNameError}
            helperText={orgNameError ? "School / Club name is required." : " "}
          />
        </Box>
      ) : null}
    </Box>
  );
}
