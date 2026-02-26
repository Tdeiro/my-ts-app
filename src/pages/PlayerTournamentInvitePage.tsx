import * as React from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

type EventSubscriptionDto = {
  eventId: number;
  userId: number;
  userFullName: string;
  userEmail: string;
  role: string;
  status: string;
  source: string;
  joinedAt: string;
};

type InvitedTournamentCategoryDto = {
  id: number;
  name: string;
  level?: string;
  minAge?: number;
  maxAge?: number;
  gender?: string;
  price?: number | string;
  selected?: boolean;
};

type InvitedTournamentInfoDto = {
  eventId: number;
  name: string;
  timezone?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  registrationDeadline?: string;
  entryFee?: number | string;
  currency?: string;
  tournamentStage?: string;
  categories: InvitedTournamentCategoryDto[];
};

type SubscriptionCategorySelectionDto = {
  eventId: number;
  userId: number;
  currency?: string;
  entryFee?: number | string;
  selectedCount: number;
  totalAmount?: number | string;
  selectedCategories: InvitedTournamentCategoryDto[];
};

type SelectedCategoryDto = {
  id: number;
  name?: string;
  partnerName?: string | null;
  partnerUserId?: number | null;
  partnerNote?: string | null;
  teamFormat?: string | null;
  isDoubles?: boolean | null;
};

type SelectedCategoriesResponse = {
  selectedCategories?: SelectedCategoryDto[];
};

type PartnerPref = {
  partnerName: string;
  partnerUserId: number | null;
  partnerNote: string;
  teamFormat: string;
  isDoubles: boolean;
};

function parseInviteTournamentId(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function getErrorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string[]; error?: string } } })
      ?.response?.data?.message?.[0] ||
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
    fallback
  );
}

function formatAgeRange(category: InvitedTournamentCategoryDto): string {
  if (
    typeof category.minAge === "number" &&
    typeof category.maxAge === "number"
  ) {
    return `${category.minAge}-${category.maxAge}`;
  }
  if (typeof category.minAge === "number") {
    return `${category.minAge}+`;
  }
  if (typeof category.maxAge === "number") {
    return `Up to ${category.maxAge}`;
  }
  return "All ages";
}

function formatMoney(value: number | string | undefined, currency: string | undefined): string {
  const amount = Number(value ?? 0);
  const cleanCurrency = (currency || "AUD").toUpperCase();
  if (!Number.isFinite(amount)) return `0 ${cleanCurrency}`;
  return `${amount} ${cleanCurrency}`;
}

type CategoryTileProps = {
  category: InvitedTournamentCategoryDto;
  selected: boolean;
  currency?: string;
  onToggle: (id: number) => void;
};

function CategoryTile({ category, selected, currency, onToggle }: CategoryTileProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected ? "rgba(139,92,246,0.08)" : "background.paper",
        boxShadow: selected ? "0 8px 24px rgba(139,92,246,0.18)" : "none",
        transition: "all 160ms ease",
        position: "relative",
        "&:hover": {
          boxShadow: "0 6px 18px rgba(15,23,42,0.10)",
          borderColor: selected ? "primary.main" : "rgba(139,92,246,0.35)",
        },
      }}
    >
      <CardActionArea onClick={() => onToggle(category.id)} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 2 }}>
          {selected ? (
            <CheckCircleRoundedIcon
              sx={{
                position: "absolute",
                top: 10,
                right: 10,
                color: "primary.main",
                fontSize: 22,
              }}
            />
          ) : null}
          <Stack spacing={1}>
            <Typography sx={{ fontWeight: 800 }}>{category.name || "Category"}</Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip size="small" label={category.level || "Open"} />
              <Chip size="small" variant="outlined" label={formatAgeRange(category)} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Fee: {formatMoney(category.price, currency)}
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

type SelectedCategoryRowProps = {
  category: InvitedTournamentCategoryDto;
  currency?: string;
  pref: PartnerPref;
  expanded: boolean;
  partnerOptions: string[];
  onToggleExpand: () => void;
  onPartnerNameChange: (value: string) => void;
  onPartnerNoteChange: (value: string) => void;
};

function SelectedCategoryRow({
  category,
  currency,
  pref,
  expanded,
  partnerOptions,
  onToggleExpand,
  onPartnerNameChange,
  onPartnerNoteChange,
}: SelectedCategoryRowProps) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2.5 }}>
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Stack spacing={0.5}>
            <Typography sx={{ fontWeight: 700 }}>
              {category.name || "Category"} · {category.gender || "Open"}
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              label={`Fee ${formatMoney(category.price, currency)}`}
              sx={{ width: "fit-content" }}
            />
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Partner preference (optional)
            </Typography>
            <IconButton
              size="small"
              onClick={onToggleExpand}
              sx={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 160ms ease",
              }}
            >
              <ExpandMoreRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        <Collapse in={expanded}>
          <Stack spacing={1} sx={{ mt: 1.25 }}>
            <Autocomplete
              freeSolo
              options={partnerOptions}
              value={pref.partnerName}
              onInputChange={(_, value) => onPartnerNameChange(value)}
              renderInput={(params) => (
                <TextField {...params} size="small" label="Partner name" />
              )}
            />
            <TextField
              size="small"
              label="Partner note (optional)"
              value={pref.partnerNote}
              onChange={(e) => onPartnerNoteChange(e.target.value)}
              fullWidth
            />
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  ); 
}

type InvitationHeroProps = {
  tournamentInfo: InvitedTournamentInfoDto;
  playerName?: string | null;
};

function TicketCard({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      sx={(theme) => ({
        position: "relative",
        overflow: "visible",
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: 2,
        bgcolor: "background.paper",
        "&::before": {
          content: '""',
          position: "absolute",
          width: 18,
          height: 18,
          borderRadius: "50%",
          left: -9,
          top: "50%",
          transform: "translateY(-50%)",
          bgcolor: "background.default",
          boxShadow: `inset -1px 0 0 ${theme.palette.divider}`,
        },
        "&::after": {
          content: '""',
          position: "absolute",
          width: 18,
          height: 18,
          borderRadius: "50%",
          right: -9,
          top: "50%",
          transform: "translateY(-50%)",
          bgcolor: "background.default",
          boxShadow: `inset 1px 0 0 ${theme.palette.divider}`,
        },
      })}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          borderRadius: 2.5,
          background:
            "linear-gradient(110deg, rgba(15,23,42,0.02) 0%, rgba(139,92,246,0.07) 40%, rgba(255,255,255,0.92) 100%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 12,
          border: "1px solid",
          borderColor: "rgba(139,92,246,0.35)",
          borderRadius: 2,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <Box sx={{ position: "relative", zIndex: 2 }}>{children}</Box>
    </Paper>
  );
}

function InvitationHero({ tournamentInfo, playerName }: InvitationHeroProps) {
  return (
    <TicketCard>
      <Box
        sx={{
          maxWidth: 1200,
          mx: "auto",
          px: { xs: 3, md: 4.5 },
          py: { xs: 3.25, md: 4.25 },
          display: "grid",
          alignItems: "start",
          gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
          gap: 2.5,
        }}
      >
        <Stack spacing={1.5}>
          <Typography
            variant="overline"
            sx={{ letterSpacing: 1.2, color: "text.secondary" }}
          >
            You&apos;re invited{playerName ? `, ${playerName}` : ""}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, color: "text.primary" }}>
            {tournamentInfo.name}
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            Compete. Connect. Challenge yourself.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
            <Chip
              icon={<LocationOnOutlinedIcon />}
              label={tournamentInfo.timezone || "Location TBD"}
              variant="outlined"
              size="small"
            />
            <Chip
              icon={<CalendarMonthOutlinedIcon />}
              label={`${tournamentInfo.startDate || "-"}${
                tournamentInfo.endDate ? ` to ${tournamentInfo.endDate}` : ""
              }`}
              variant="outlined"
              size="small"
            />
            <Chip
              icon={<AccessTimeOutlinedIcon />}
              label={`${tournamentInfo.startTime || "-"}${
                tournamentInfo.endTime ? ` - ${tournamentInfo.endTime}` : ""
              }`}
              variant="outlined"
              size="small"
            />
            <Chip
              icon={<AttachMoneyOutlinedIcon />}
              label={`Fee ${formatMoney(tournamentInfo.entryFee, tournamentInfo.currency)} / category`}
              variant="outlined"
              size="small"
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Registration deadline: {tournamentInfo.registrationDeadline || "-"}
          </Typography>
        </Stack>
        <Box
          sx={{
            display: "flex",
            justifyContent: { xs: "flex-start", md: "flex-end" },
            alignSelf: "flex-start",
            pt: { xs: 0, md: 0.25 },
          }}
        >
          <Chip
            label={tournamentInfo.tournamentStage || "Registration"}
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,0.78)",
              color: "primary.dark",
              fontWeight: 700,
            }}
          />
        </Box>
      </Box>
    </TicketCard>
  );
}

export default function PlayerTournamentInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const inviteTournamentId = parseInviteTournamentId(
    searchParams.get("inviteTournamentId")
  );
  const isReadOnlyView = searchParams.get("mode") === "view";

  const [loadingInitial, setLoadingInitial] = React.useState(false);
  const [loadingSave, setLoadingSave] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [subscription, setSubscription] =
    React.useState<EventSubscriptionDto | null>(null);
  const [tournamentInfo, setTournamentInfo] =
    React.useState<InvitedTournamentInfoDto | null>(null);
  const [fallbackCategories, setFallbackCategories] = React.useState<InvitedTournamentCategoryDto[]>([]);

  const [activeGenderTab, setActiveGenderTab] = React.useState<string>("Men");
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<number[]>([]);
  const [partnerPrefs, setPartnerPrefs] = React.useState<Record<string, PartnerPref>>({});
  const [expandedPartnerRows, setExpandedPartnerRows] = React.useState<Record<string, boolean>>({});

  const allCategories =
    tournamentInfo?.categories && tournamentInfo.categories.length > 0
      ? tournamentInfo.categories
      : fallbackCategories;

  const availableGenders = React.useMemo(() => {
    const set = new Set<string>();
    allCategories.forEach((category) => set.add((category.gender || "Open").trim() || "Open"));

    const preferredOrder = ["Men", "Women", "Mixed", "Open"];
    const listed = Array.from(set);
    listed.sort((a, b) => {
      const ai = preferredOrder.findIndex((item) => item.toLowerCase() === a.toLowerCase());
      const bi = preferredOrder.findIndex((item) => item.toLowerCase() === b.toLowerCase());
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return listed;
  }, [allCategories]);

  React.useEffect(() => {
    if (availableGenders.length === 0) return;
    const exists = availableGenders.some((g) => g.toLowerCase() === activeGenderTab.toLowerCase());
    if (!exists) setActiveGenderTab(availableGenders[0]);
  }, [availableGenders, activeGenderTab]);

  const visibleCategories = React.useMemo(() => {
    if (!activeGenderTab) return allCategories;
    return allCategories.filter(
      (category) => ((category.gender || "Open").trim() || "Open").toLowerCase() === activeGenderTab.toLowerCase(),
    );
  }, [allCategories, activeGenderTab]);

  const selectedCategories = React.useMemo(() => {
    const selected = new Set(selectedCategoryIds);
    return allCategories.filter((category) => selected.has(category.id));
  }, [allCategories, selectedCategoryIds]);

  const partnerOptions = React.useMemo(() => {
    const names = Object.values(partnerPrefs)
      .map((pref) => pref.partnerName.trim())
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [partnerPrefs]);

  const liveTotalAmount = React.useMemo(() => {
    const feePerCategory = Number(tournamentInfo?.entryFee ?? 0);
    if (!Number.isFinite(feePerCategory)) return 0;
    return feePerCategory * selectedCategoryIds.length;
  }, [tournamentInfo?.entryFee, selectedCategoryIds.length]);

  const mergePartnerPrefFromApi = React.useCallback((category: SelectedCategoryDto) => {
    const key = String(category.id);
    setPartnerPrefs((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {
          partnerName: "",
          partnerUserId: null,
          partnerNote: "",
          teamFormat: "DOUBLES",
          isDoubles: true,
        }),
        partnerName: category.partnerName ?? prev[key]?.partnerName ?? "",
        partnerUserId: category.partnerUserId ?? prev[key]?.partnerUserId ?? null,
        partnerNote: category.partnerNote ?? prev[key]?.partnerNote ?? "",
        teamFormat: category.teamFormat ?? prev[key]?.teamFormat ?? "DOUBLES",
        isDoubles: category.isDoubles ?? prev[key]?.isDoubles ?? true,
      },
    }));
  }, []);

  const loadInviteData = React.useCallback(
    async (eventId: number) => {
      setLoadingInitial(true);
      setError(null);

      try {
        const subscriptionRes = await api.post<EventSubscriptionDto>(
          `/events/${eventId}/subscriptions/me`
        );
        setSubscription(subscriptionRes.data);

        const infoRes = await api.get<InvitedTournamentInfoDto>(
          `/events/${eventId}`
        );
        setTournamentInfo(infoRes.data);

        const selectedFromInfo = (infoRes.data.categories ?? [])
          .filter((category) => category.selected)
          .map((category) => category.id);

        try {
          const selectionRes = await api.get<InvitedTournamentCategoryDto[]>(
            "/tournament-categories",
            { params: { eventId } },
          );
          const categories = Array.isArray(selectionRes.data) ? selectionRes.data : [];
          setFallbackCategories(categories);
          const selected = categories.filter((category) => category.selected);
          if (selected.length > 0) {
            setSelectedCategoryIds(selected.map((category) => category.id));
          } else {
            setSelectedCategoryIds(selectedFromInfo);
          }
        } catch {
          setSelectedCategoryIds(selectedFromInfo);
        }
      } catch (err: unknown) {
        setError(
          getErrorMessage(err, "Could not load invite information for this tournament."),
        );
      } finally {
        setLoadingInitial(false);
      }
    },
    [mergePartnerPrefFromApi],
  );

  React.useEffect(() => {
    if (!inviteTournamentId) return;
    void loadInviteData(inviteTournamentId);
  }, [inviteTournamentId, loadInviteData]);

  const toggleCategory = (categoryId: number) => {
    const key = String(categoryId);
    const currentlySelected = selectedCategoryIds.includes(categoryId);

    setSelectedCategoryIds((prev) => {
      if (currentlySelected) return prev.filter((id) => id !== categoryId);
      return [...prev, categoryId];
    });

    if (currentlySelected) {
      setPartnerPrefs((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setExpandedPartnerRows((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    setPartnerPrefs((prev) => ({
      ...prev,
      [key]:
        prev[key] ?? {
          partnerName: "",
          partnerUserId: null,
          partnerNote: "",
          teamFormat: "DOUBLES",
          isDoubles: true,
        },
    }));
    setExpandedPartnerRows((prev) => ({ ...prev, [key]: true }));
  };

  const setPartnerField = (categoryId: number, field: keyof PartnerPref, value: string) => {
    const key = String(categoryId);
    setPartnerPrefs((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {
          partnerName: "",
          partnerUserId: null,
          partnerNote: "",
          teamFormat: "DOUBLES",
          isDoubles: true,
        }),
        [field]: value,
      },
    }));
  };

  const toggleExpandedRow = (categoryId: number) => {
    const key = String(categoryId);
    setExpandedPartnerRows((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirmRegistration = async () => {
    if (!inviteTournamentId) return;
    if (selectedCategoryIds.length === 0) {
      setError("Select at least one category.");
      return;
    }

    setLoadingSave(true);
    setError(null);
    setSuccess(null);

    try {
      const saveCategoriesRes = await api.put<SubscriptionCategorySelectionDto>(
        `/events/${inviteTournamentId}/subscriptions/me/categories`,
        { categoryIds: selectedCategoryIds },
      );
      setSelectedCategoryIds((saveCategoriesRes.data.selectedCategories ?? []).map((c) => c.id));

      const partnerPayloads = selectedCategoryIds
        .map((categoryId) => ({ categoryId, pref: partnerPrefs[String(categoryId)] }))
        .filter((entry) => {
          const pref = entry.pref;
          if (!pref) return false;
          return Boolean(pref.partnerName.trim() || pref.partnerNote.trim());
        });

      if (partnerPayloads.length > 0) {
        await Promise.all(
          partnerPayloads.map((entry) =>
            api.put(
              `/events/${inviteTournamentId}/subscriptions/me/categories/${entry.categoryId}/partner-preference`,
              {
                partnerName: entry.pref.partnerName.trim() || null,
                partnerUserId: entry.pref.partnerUserId,
                partnerNote: entry.pref.partnerNote.trim() || null,
                teamFormat: entry.pref.teamFormat || "DOUBLES",
                isDoubles: entry.pref.isDoubles,
              },
            ),
          ),
        );
      }

      setSuccess("Registration confirmed.");

      const infoRes = await api.get<InvitedTournamentInfoDto>(
        `/events/${inviteTournamentId}/subscriptions/me/tournament-info`,
      );
      setTournamentInfo(infoRes.data);

      navigate("/tournaments/payment", {
        state: {
          eventId: inviteTournamentId,
          tournamentName: infoRes.data.name || "Tournament",
          currency: infoRes.data.currency || "AUD",
          totalAmount: liveTotalAmount,
          selectedCategoryNames: selectedCategories.map((category) => category.name || "Category"),
        },
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not confirm registration."));
    } finally {
      setLoadingSave(false);
    }
  };

  if (!inviteTournamentId) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Invalid invite link. Missing or invalid <code>inviteTournamentId</code>.
        </Alert>
        <Button variant="contained" onClick={() => navigate("/dashboard")}>
          Go to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        bgcolor: "rgba(139,92,246,0.04)",
        py: { xs: 2, md: 3 },
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            Tournament Invite
          </Typography>

          {loadingInitial ? (
            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">
                  Loading invite details...
                </Typography>
              </Stack>
            </Paper>
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}

          {tournamentInfo ? (
            <>
              <InvitationHero
                tournamentInfo={tournamentInfo}
                playerName={subscription?.userFullName}
              />

              <Card sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Stack spacing={2}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Choose Categories
                    </Typography>
                    <Tabs
                      value={activeGenderTab}
                      onChange={(_, value) => setActiveGenderTab(value)}
                      variant="scrollable"
                      allowScrollButtonsMobile
                    >
                      {availableGenders.map((gender) => (
                        <Tab key={gender} label={gender} value={gender} />
                      ))}
                    </Tabs>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, minmax(0, 1fr))",
                          md: "repeat(3, minmax(0, 1fr))",
                        },
                        gap: 1.5,
                      }}
                    >
                      {visibleCategories.map((category) => (
                        <Box key={category.id}>
                          <CategoryTile
                            category={category}
                            selected={selectedCategoryIds.includes(category.id)}
                            currency={tournamentInfo.currency}
                            onToggle={isReadOnlyView ? () => {} : toggleCategory}
                          />
                        </Box>
                      ))}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {selectedCategories.length > 0 ? (
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Selected categories
                        </Typography>
                        <Chip size="small" color="primary" label={`${selectedCategories.length} selected`} />
                      </Stack>

                      {!isReadOnlyView ? (
                        <Box
                          sx={{
                            px: 1.25,
                            py: 1,
                            borderRadius: 2,
                            bgcolor: "rgba(139,92,246,0.10)",
                            border: "1px solid rgba(139,92,246,0.20)",
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Partner name is optional. If you do not have a partner yet, your coach can
                            decide later or you can update it later.
                          </Typography>
                        </Box>
                      ) : null}

                      <Stack spacing={1.2}>
                        {selectedCategories.map((category) => {
                          const key = String(category.id);
                          const pref =
                            partnerPrefs[key] ?? {
                              partnerName: "",
                              partnerUserId: null,
                              partnerNote: "",
                              teamFormat: "DOUBLES",
                              isDoubles: true,
                            };
                          if (isReadOnlyView) {
                            return (
                              <Card key={`selected-${category.id}`} variant="outlined" sx={{ borderRadius: 2.5 }}>
                                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                                  <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                                    {category.name || "Category"} · {category.gender || "Open"}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Partner name: {pref.partnerName.trim() || "Not provided"}
                                  </Typography>
                                  {pref.partnerNote.trim() ? (
                                    <Typography variant="body2" color="text.secondary">
                                      Note: {pref.partnerNote}
                                    </Typography>
                                  ) : null}
                                </CardContent>
                              </Card>
                            );
                          }
                          return (
                            <SelectedCategoryRow
                              key={`selected-${category.id}`}
                              category={category}
                              currency={tournamentInfo.currency}
                              pref={pref}
                              expanded={Boolean(expandedPartnerRows[key])}
                              partnerOptions={partnerOptions}
                              onToggleExpand={() => toggleExpandedRow(category.id)}
                              onPartnerNameChange={(value) =>
                                setPartnerField(category.id, "partnerName", value)
                              }
                              onPartnerNoteChange={(value) =>
                                setPartnerField(category.id, "partnerNote", value)
                              }
                            />
                          );
                        })}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ) : null}

              {!isReadOnlyView ? (
                <Paper
                  elevation={6}
                  sx={{
                    position: "sticky",
                    bottom: 10,
                    borderRadius: 3,
                    px: { xs: 1.25, sm: 2 },
                    py: 1.25,
                    border: "1px solid rgba(139,92,246,0.20)",
                    zIndex: 5,
                  }}
                >
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.5}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", md: "center" }}
                  >
                    <Stack direction="row" spacing={1.2} alignItems="center">
                      <Chip
                        color="primary"
                        label={`${selectedCategoryIds.length} categor${
                          selectedCategoryIds.length === 1 ? "y" : "ies"
                        } selected`}
                      />
                      <Typography sx={{ fontWeight: 700 }}>
                        Total: {formatMoney(liveTotalAmount, tournamentInfo.currency)}
                      </Typography>
                    </Stack>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                      <Button variant="text" onClick={() => navigate("/dashboard")}>
                        Back
                      </Button>
                      <Button
                        variant="contained"
                        disabled={loadingSave || selectedCategoryIds.length === 0}
                        onClick={handleConfirmRegistration}
                      >
                        {loadingSave ? "Confirming..." : "Confirm Registration"}
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ) : (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                  <Button variant="outlined" onClick={() => navigate("/dashboard")}>
                    Back to Dashboard
                  </Button>
                </Stack>
              )}
            </>
          ) : null}

          {subscription ? (
            <Typography variant="caption" color="text.secondary">
              Registration status: {subscription.status || "UNKNOWN"}
            </Typography>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
