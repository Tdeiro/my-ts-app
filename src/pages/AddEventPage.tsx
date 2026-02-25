import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Chip,
  Paper,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useNavigate, useParams } from "react-router-dom";
import { getToken } from "../auth/tokens";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type TournamentForm = {
  name: string;
  sport: "" | "Tennis" | "Beach Tennis" | "Padel" | "Pickleball" | "Other";
  level: "" | "Beginner" | "Intermediate" | "Advanced" | "All levels";
  timezone: string;
  locationName: string;
  address: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  capacity: number;
  entryFee: number;
  currency: "" | "AUD" | "USD" | "EUR" | "BRL";
  description: string;
  isPublic: boolean;
  allowWaitlist: boolean;
  requireApproval: boolean;
  tournamentStage: "REGISTRATION";
};

type TournamentCategoryForm = {
  id: string;
  backendId?: number;
  name: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS";
  minAge: string;
  maxAge: string;
  gender: "Women" | "Men" | "Mixed" | "Open";
  expandToAllGenders: boolean;
  expandToMaleFemale: boolean;
  isKidsCategory: boolean;
};

const initialForm: TournamentForm = {
  name: "",
  sport: "",
  level: "",
  timezone: "",
  locationName: "",
  address: "",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  registrationDeadline: "",
  capacity: 0,
  entryFee: 0,
  currency: "",
  description: "",
  isPublic: true,
  allowWaitlist: false,
  requireApproval: false,
  tournamentStage: "REGISTRATION",
};

const SPORT_TO_API_VALUE: Record<TournamentForm["sport"], string> = {
  "": "OTHER",
  Tennis: "TENNIS",
  "Beach Tennis": "BEACH_TENNIS",
  Padel: "PADEL",
  Pickleball: "PICKLEBALL",
  Other: "OTHER",
};

function newCategory(): TournamentCategoryForm {
  return {
    id: crypto.randomUUID(),
    name: "",
    level: "INTERMEDIATE",
    minAge: "",
    maxAge: "",
    gender: "Open",
    expandToAllGenders: false,
    expandToMaleFemale: false,
    isKidsCategory: false,
  };
}

function formatAgeRange(category: TournamentCategoryForm): string {
  if (category.minAge && category.maxAge) return `${category.minAge}-${category.maxAge}`;
  if (category.minAge) return `${category.minAge}+`;
  if (category.maxAge) return `up to ${category.maxAge}`;
  return "All ages";
}

function formatTournamentLevelLabel(level?: string): string {
  const raw = String(level ?? "").trim();
  if (!raw) return "Open";
  const normalized = raw.toUpperCase().replaceAll("_", " ");
  if (normalized === "ALL LEVELS") return "Open";
  return raw
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCategoryLevelLabel(level: TournamentCategoryForm["level"]): string {
  const normalized = String(level).toUpperCase().replaceAll("_", " ");
  if (normalized === "ALL LEVELS") return "Open";
  return normalized
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getCategoryGenderSummary(category: TournamentCategoryForm): string {
  if (category.expandToAllGenders) return "Men/Women/Mixed";
  if (category.expandToMaleFemale) return "Men/Women";
  return category.gender;
}

function buildAutoCategoryName(category: TournamentCategoryForm): string {
  return formatCategoryLevelLabel(category.level);
}

function mapApiTournamentLevel(level?: string): TournamentForm["level"] {
  const normalized = String(level ?? "").toUpperCase().replaceAll("_", " ").trim();
  if (normalized === "BEGINNER") return "Beginner";
  if (normalized === "INTERMEDIATE") return "Intermediate";
  if (normalized === "ADVANCED") return "Advanced";
  return "All levels";
}

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function validateTournamentBasics(form: TournamentForm): string | null {
  const today = getTodayIsoDate();
  if (!form.name.trim()) return "Tournament name is required.";
  if (!form.sport) return "Sport is required.";
  if (!form.level) return "Level is required.";
  if (!form.timezone) return "Timezone is required.";
  if (!form.startDate) return "Start date is required.";
  if (form.startDate < today) return "Start date cannot be before today.";
  if (!form.endDate) return "End date is required.";
  if (form.endDate < form.startDate) return "End date must be on or after start date.";
  if (!form.startTime) return "Start time is required.";
  if (!form.endTime) return "End time is required.";
  if (form.startDate === form.endDate && form.endTime <= form.startTime) {
    return "End time must be after start time for the same day.";
  }
  return null;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body1" sx={{ fontWeight: 900, fontSize: "0.95rem", mb: 1 }}>
      {children}
    </Typography>
  );
}

function SoftCard({ children }: { children: React.ReactNode }) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: "none",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        overflow: "hidden",
      }}
    >
      {children}
    </Card>
  );
}

function pillChipSx(kind: "primary" | "muted" | "orange" = "muted") {
  if (kind === "primary") {
    return {
      borderRadius: 999,
      borderColor: "rgba(139,92,246,0.22)",
      bgcolor: "rgba(139,92,246,0.06)",
      color: "primary.main",
      fontWeight: 650,
    };
  }
  if (kind === "orange") {
    return {
      borderRadius: 999,
      borderColor: "rgba(255,107,92,0.35)",
      bgcolor: "rgba(255,107,92,0.06)",
      color: "rgba(255,107,92,0.95)",
      fontWeight: 650,
    };
  }
  return {
    borderRadius: 999,
    borderColor: "rgba(15,23,42,0.12)",
    bgcolor: "rgba(15,23,42,0.03)",
    color: "text.secondary",
    fontWeight: 650,
  };
}

export default function AddTournamentPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [form, setForm] = React.useState<TournamentForm>(initialForm);
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  const [savedCategories, setSavedCategories] = React.useState<TournamentCategoryForm[]>([]);
  const [draftCategory, setDraftCategory] = React.useState<TournamentCategoryForm>(newCategory());
  const [editingCategoryId, setEditingCategoryId] = React.useState<string | null>(null);
  const [loadedCategoryIds, setLoadedCategoryIds] = React.useState<number[]>([]);
  const [deletingCategoryIds, setDeletingCategoryIds] = React.useState<string[]>([]);

  const [saving, setSaving] = React.useState(false);
  const [createdTournamentId, setCreatedTournamentId] = React.useState<number | null>(null);
  const [inviteLink, setInviteLink] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const todayIsoDate = React.useMemo(() => getTodayIsoDate(), []);
  const basicsValidationError = React.useMemo(() => validateTournamentBasics(form), [form]);

  React.useEffect(() => {
    if (!isEditMode || !id) return;

    let cancelled = false;
    const run = async () => {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const [eventRes, categoriesRes] = await Promise.all([
          fetch(`${API_URL}/events`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/tournament-categories?eventId=${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const eventBody = await eventRes.json().catch(() => null);
        const categoriesBody = await categoriesRes.json().catch(() => null);
        if (!eventRes.ok) {
          throw new Error(
            eventBody?.message?.[0] || eventBody?.error || "Failed to load tournament",
          );
        }
        if (!categoriesRes.ok) {
          throw new Error(
            categoriesBody?.message?.[0] ||
              categoriesBody?.error ||
              "Failed to load categories",
          );
        }
        const raw = Array.isArray(eventBody) ? eventBody : (eventBody?.data ?? []);
        const selected = raw.find((e: any) => String(e.id) === String(id));
        if (!selected) throw new Error("Tournament not found");

        const sportRaw = String(selected.sport ?? "OTHER").toUpperCase();
        const sport =
          sportRaw === "TENNIS"
            ? "Tennis"
            : sportRaw === "BEACH_TENNIS"
              ? "Beach Tennis"
              : sportRaw === "PADEL"
                ? "Padel"
                : sportRaw === "PICKLEBALL"
                  ? "Pickleball"
                  : "Other";

        if (cancelled) return;
        setForm((prev) => ({
          ...prev,
          name: String(selected.name ?? ""),
          sport,
          level: mapApiTournamentLevel(selected.level),
          timezone: String(selected.timezone ?? prev.timezone),
          locationName: String(selected.locationName ?? ""),
          address: String(selected.address ?? ""),
          startDate: String(selected.startDate ?? ""),
          endDate: String(selected.endDate ?? ""),
          startTime: String(selected.startTime ?? "").slice(0, 5),
          endTime: String(selected.endTime ?? "").slice(0, 5),
          registrationDeadline: String(selected.registrationDeadline ?? ""),
          capacity: Math.max(0, Number(selected.capacity ?? 0) || 0),
          entryFee: Math.max(0, Number(selected.entryFee ?? 0) || 0),
          currency: String(selected.currency ?? prev.currency) as TournamentForm["currency"],
          description: String(selected.description ?? ""),
          isPublic: Boolean(selected.isPublic ?? true),
          allowWaitlist: Boolean(selected.allowWaitlist ?? false),
          requireApproval: Boolean(selected.requireApproval ?? false),
          tournamentStage: "REGISTRATION",
        }));
        setCreatedTournamentId(Number(id));
        const rawCategories = Array.isArray(categoriesBody)
          ? categoriesBody
          : (categoriesBody?.data ?? []);
        const mappedCategories: TournamentCategoryForm[] = rawCategories.map((c: any) => ({
          id: crypto.randomUUID(),
          backendId: Number(c.id),
          name: String(c.name ?? ""),
          level: String(c.level ?? "INTERMEDIATE") as TournamentCategoryForm["level"],
          minAge: c.minAge == null ? "" : String(c.minAge),
          maxAge: c.maxAge == null ? "" : String(c.maxAge),
          gender: String(c.gender ?? "Open") as TournamentCategoryForm["gender"],
          expandToAllGenders: false,
          expandToMaleFemale: false,
          isKidsCategory: false,
        }));
        setSavedCategories(mappedCategories);
        setLoadedCategoryIds(
          mappedCategories
            .map((c) => Number(c.backendId))
            .filter((v) => Number.isFinite(v) && v > 0),
        );
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : "Failed to load tournament");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [id, isEditMode, navigate]);

  const setField =
    <K extends keyof TournamentForm>(key: K) =>
    (
      e:
        | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | { target: { value: unknown } },
    ) => {
      setForm((prev) => ({
        ...prev,
        [key]: (e.target.value as TournamentForm[K]) ?? prev[key],
      }));
    };

  const setSwitch =
    (key: keyof TournamentForm) =>
    (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      setForm((prev) => ({ ...prev, [key]: checked as unknown }));
    };

  const handleCancel = () => navigate(-1);
  const handleStepOneNext = () => {
    setStatusMessage(null);
    const validationError = validateTournamentBasics(form);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  const toggleGenderVariants = () => {
    setDraftCategory((prev) => ({
      ...prev,
      expandToAllGenders: !prev.expandToAllGenders,
      expandToMaleFemale: prev.expandToAllGenders ? prev.expandToMaleFemale : false,
    }));
  };

  const toggleMaleFemaleVariants = () => {
    setDraftCategory((prev) => ({
      ...prev,
      expandToMaleFemale: !prev.expandToMaleFemale,
      expandToAllGenders: prev.expandToMaleFemale ? prev.expandToAllGenders : false,
    }));
  };

  const toggleKidsCategory = () => {
    setDraftCategory((prev) => ({
      ...prev,
      isKidsCategory: !prev.isKidsCategory,
      maxAge: prev.isKidsCategory ? "" : "12",
    }));
  };

  const addCategory = () => {
    const cleanName = draftCategory.name.trim();
    setErrorMessage(null);
    const normalizedDraft = draftCategory.isKidsCategory
      ? { ...draftCategory, maxAge: draftCategory.maxAge || "12" }
      : draftCategory;
    const finalName = cleanName || buildAutoCategoryName(normalizedDraft);

    if (editingCategoryId) {
      setSavedCategories((prev) =>
        prev.map((item) =>
          item.id === editingCategoryId
            ? { ...normalizedDraft, id: editingCategoryId, name: finalName }
            : item,
        ),
      );
      setStatusMessage("Category updated.");
    } else {
      setSavedCategories((prev) => [
        ...prev,
        {
          ...normalizedDraft,
          id: crypto.randomUUID(),
          name: finalName,
        },
      ]);
      setStatusMessage("Category added to the list.");
    }

    setDraftCategory(newCategory());
    setEditingCategoryId(null);
  };

  const removeCategory = async (id: string) => {
    const target = savedCategories.find((c) => c.id === id);
    if (!target) return;

    const removeLocal = () => {
      setSavedCategories((prev) => prev.filter((c) => c.id !== id));
      if (editingCategoryId === id) {
        setEditingCategoryId(null);
        setDraftCategory(newCategory());
      }
    };

    if (!isEditMode || !target.backendId) {
      removeLocal();
      return;
    }

    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    setDeletingCategoryIds((prev) => [...prev, id]);
    try {
      const res = await fetch(`${API_URL}/tournament-categories/${target.backendId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message?.[0] || body?.error || "Failed to delete category");
      }

      removeLocal();
      setLoadedCategoryIds((prev) => prev.filter((cid) => cid !== Number(target.backendId)));
      setStatusMessage("Category deleted.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeletingCategoryIds((prev) => prev.filter((value) => value !== id));
    }
  };

  const editCategory = (id: string) => {
    const selected = savedCategories.find((c) => c.id === id);
    if (!selected) return;
    setDraftCategory(selected);
    setEditingCategoryId(id);
    setStatusMessage("Editing category. Save to update.");
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setDraftCategory(newCategory());
  };

  const signupCategories = React.useMemo(
    () =>
      savedCategories.flatMap((category) => {
        const baseName = category.name.trim();
        if (!baseName) return [];
        if (!category.expandToAllGenders && !category.expandToMaleFemale) {
          return [{ ...category, name: baseName }];
        }
        const targetGenders: Array<TournamentCategoryForm["gender"]> = category.expandToAllGenders
          ? ["Men", "Women", "Mixed"]
          : ["Men", "Women"];
        return targetGenders.map((gender) => ({
          ...category,
          name: `${baseName} - ${gender}`,
          gender,
        }));
      }),
    [savedCategories],
  );

  const hasValidCategories = signupCategories.length > 0;

  const handleSubmit = async () => {
    const token = getToken();
    setErrorMessage(null);
    setStatusMessage(null);

    const validationError = validateTournamentBasics(form);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (!token) {
      navigate("/login");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        eventType: "TOURNAMENT",
        sport: SPORT_TO_API_VALUE[form.sport],
        level: form.level || undefined,
        timezone: form.timezone,
        locationName: form.locationName,
        address: form.address,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: `${form.startTime}:00`,
        endTime: `${form.endTime}:00`,
        registrationDeadline: form.registrationDeadline,
        capacity: form.capacity,
        entryFee: form.entryFee,
        currency: form.currency || undefined,
        description: form.description,
        isPublic: form.isPublic,
        allowWaitlist: form.allowWaitlist,
        requireApproval: form.requireApproval,
        tournamentStage: form.tournamentStage,
      };

      const res = await fetch(
        isEditMode && id ? `${API_URL}/events/${id}` : `${API_URL}/events`,
        {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        },
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 401) {
          navigate("/login");
          return;
        }
        throw new Error(data?.message || data?.error || "Failed to create event");
      }

      const createdId = isEditMode
        ? Number(id)
        : Number(data?.id ?? data?.data?.id ?? 0);
      if (!Number.isFinite(createdId) || createdId <= 0) {
        throw new Error("Tournament created, but no valid id was returned.");
      }

      const expandedCategories = savedCategories
        .flatMap((source) => {
          const baseName = source.name.trim();
          if (!baseName) return [];

          if (!source.expandToAllGenders && !source.expandToMaleFemale) {
            return [
              {
                backendId: source.backendId,
                name: baseName,
                level: source.level,
                minAge: source.minAge ? Number(source.minAge) : undefined,
                maxAge: source.maxAge ? Number(source.maxAge) : undefined,
                gender: source.gender,
              },
            ];
          }

          const genders: Array<TournamentCategoryForm["gender"]> = source.expandToAllGenders
            ? ["Men", "Women", "Mixed"]
            : ["Men", "Women"];
          return genders.map((gender, index) => ({
            backendId: index === 0 ? source.backendId : undefined,
            name: `${baseName} - ${gender}`,
            level: source.level,
            minAge: source.minAge ? Number(source.minAge) : undefined,
            maxAge: source.maxAge ? Number(source.maxAge) : undefined,
            gender,
          }));
        })
        .filter((c) => c.name);

      if (isEditMode) {
        const usedBackendIds = new Set<number>();

        const updateOps = expandedCategories
          .filter((c) => Number.isFinite(Number(c.backendId)))
          .map(async (category) => {
            const backendId = Number(category.backendId);
            usedBackendIds.add(backendId);
            const resUpdate = await fetch(`${API_URL}/tournament-categories/${backendId}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                eventId: createdId,
                name: category.name,
                level: category.level,
                minAge: category.minAge,
                maxAge: category.maxAge,
                gender: category.gender,
              }),
            });
            const body = await resUpdate.json().catch(() => null);
            return { ok: resUpdate.ok, body };
          });

        const createOps = expandedCategories
          .filter((c) => !c.backendId)
          .map(async (category) => {
            const resCreate = await fetch(`${API_URL}/tournament-categories`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                eventId: createdId,
                name: category.name,
                level: category.level,
                minAge: category.minAge,
                maxAge: category.maxAge,
                gender: category.gender,
              }),
            });
            const body = await resCreate.json().catch(() => null);
            return { ok: resCreate.ok, body };
          });

        const deleteOps = loadedCategoryIds
          .filter((existingId) => !usedBackendIds.has(existingId))
          .map(async (categoryId) => {
            const resDelete = await fetch(`${API_URL}/tournament-categories/${categoryId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            return { ok: resDelete.ok, body: null };
          });

        const results = await Promise.all([...updateOps, ...createOps, ...deleteOps]);
        const failed = results.filter((r) => !r.ok);
        if (failed.length > 0) {
          const firstError =
            failed[0].body?.message?.[0] ||
            failed[0].body?.error ||
            "Failed to sync tournament categories";
          throw new Error(firstError);
        }
      } else {
        const categoriesToCreate = signupCategories
          .map((c) => ({
          eventId: createdId,
          name: c.name,
          level: c.level,
          minAge: c.minAge ? Number(c.minAge) : undefined,
          maxAge: c.maxAge ? Number(c.maxAge) : undefined,
          gender: c.gender,
          }))
          .filter((c) => c.name);

        if (categoriesToCreate.length > 0) {
          const results = await Promise.all(
            categoriesToCreate.map(async (category) => {
              const categoryRes = await fetch(`${API_URL}/tournament-categories`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(category),
              });
              const categoryBody = await categoryRes.json().catch(() => null);
              return { ok: categoryRes.ok, body: categoryBody };
            }),
          );

          const failed = results.filter((r) => !r.ok);
          if (failed.length > 0) {
            const firstError =
              failed[0].body?.message?.[0] ||
              failed[0].body?.error ||
              "Some categories could not be created";
            throw new Error(
              `Tournament created, but ${failed.length} categor${
                failed.length > 1 ? "ies" : "y"
              } failed: ${firstError}`,
            );
          }
        }
      }

      setCreatedTournamentId(createdId);
      setInviteLink("");
      setStatusMessage(
        isEditMode
          ? "Tournament updated successfully."
          : "Tournament created. You can now generate an invite link.",
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInviteLink = () => {
    if (!createdTournamentId) return;
    const link = `${window.location.origin}/signup?inviteTournamentId=${createdTournamentId}`;
    setInviteLink(link);
    setStatusMessage("Invite link generated.");
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setStatusMessage("Invite link copied to clipboard.");
    } catch {
      setErrorMessage("Could not copy invite link. Please copy it manually.");
    }
  };

  const handleShareInviteLink = async () => {
    if (!inviteLink || !("share" in navigator)) return;
    try {
      await navigator.share({
        title: form.name || "Tournament Invite",
        text: `You are invited to join ${form.name || "our tournament"}.`,
        url: inviteLink,
      });
    } catch {
      // ignore cancelled share
    }
  };

  const whenText = `${form.startDate || "—"} → ${form.endDate || "—"} • ${
    form.startTime || "—"
  }–${form.endTime || "—"}`;
  const feeText = `${Number(form.entryFee || 0)} ${form.currency}`;
  const canUseNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        minWidth: 0,
        bgcolor: "background.default",
        p: { xs: 2, md: 3 },
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 1100 }}>
        <Paper
          sx={{
            mb: 2,
            p: { xs: 2, sm: 2.5 },
            borderRadius: 2,
            background:
              "linear-gradient(180deg, rgba(139,92,246,0.10) 0%, rgba(255,255,255,0) 70%)",
          }}
        >
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

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h2" sx={{ mb: 0.5, fontWeight: 900 }}>
                {isEditMode ? "Edit Tournament" : "Add Tournament"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Step {step} of 3: {step === 1 ? "Tournament details" : step === 2 ? "Categories & Settings" : "Final preview"}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.25} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={handleCancel}
                sx={{
                  borderRadius: 999,
                  borderColor: "rgba(139,92,246,0.25)",
                  color: "primary.main",
                }}
              >
                Cancel
              </Button>

              {step === 1 ? (
                <Button
                  variant="contained"
                  onClick={handleStepOneNext}
                  disabled={Boolean(basicsValidationError)}
                  sx={{ borderRadius: 999 }}
                >
                  Next: Categories
                </Button>
              ) : step === 2 ? (
                <>
                  <Button variant="outlined" onClick={() => setStep(1)} sx={{ borderRadius: 999 }}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setStep(3)}
                    disabled={!hasValidCategories}
                    sx={{ borderRadius: 999 }}
                  >
                    Preview
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outlined" onClick={() => setStep(2)} sx={{ borderRadius: 999 }}>
                    Back
                  </Button>
                  {createdTournamentId ? (
                    <Button
                      variant="outlined"
                      onClick={() => navigate("/tournaments")}
                      sx={{ borderRadius: 999 }}
                    >
                      Back to Tournaments
                    </Button>
                  ) : null}
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={
                      saving ||
                      Boolean(basicsValidationError) ||
                      !hasValidCategories ||
                      (createdTournamentId !== null && !isEditMode)
                    }
                    sx={{ borderRadius: 999 }}
                  >
                    {saving
                      ? "Saving…"
                      : isEditMode
                        ? "Save Changes"
                        : createdTournamentId
                          ? "Tournament Created"
                          : "Create Tournament"}
                  </Button>
                </>
              )}
            </Stack>
          </Stack>
        </Paper>

        {step === 1 ? (
          <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="flex-start">
            <Box sx={{ width: "100%", flex: 1 }}>
              <SoftCard>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                  <SectionTitle>Basics</SectionTitle>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={2}>
                    <TextField label="Tournament Name" value={form.name} onChange={setField("name")} fullWidth />

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <FormControl fullWidth>
                        <InputLabel>Sport</InputLabel>
                        <Select label="Sport" value={form.sport} onChange={setField("sport")}>
                          <MenuItem value="">
                            <em>Select sport</em>
                          </MenuItem>
                          <MenuItem value="Tennis">Tennis</MenuItem>
                          <MenuItem value="Beach Tennis">Beach Tennis</MenuItem>
                          <MenuItem value="Padel">Padel</MenuItem>
                          <MenuItem value="Pickleball">Pickleball</MenuItem>
                          <MenuItem value="Other">Other</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth>
                        <InputLabel>Level</InputLabel>
                        <Select label="Level" value={form.level} onChange={setField("level")}>
                          <MenuItem value="">
                            <em>Select level</em>
                          </MenuItem>
                          <MenuItem value="Beginner">Beginner</MenuItem>
                          <MenuItem value="Intermediate">Intermediate</MenuItem>
                          <MenuItem value="Advanced">Advanced</MenuItem>
                          <MenuItem value="All levels">All levels</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>

                    <FormControl fullWidth>
                      <InputLabel>Timezone</InputLabel>
                      <Select label="Timezone" value={form.timezone} onChange={setField("timezone")}>
                        <MenuItem value="">
                          <em>Select timezone</em>
                        </MenuItem>
                        <MenuItem value="Australia/Sydney">Australia/Sydney</MenuItem>
                        <MenuItem value="Australia/Melbourne">Australia/Melbourne</MenuItem>
                        <MenuItem value="Australia/Brisbane">Australia/Brisbane</MenuItem>
                        <MenuItem value="UTC">UTC</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>

                  <SectionTitle>Location</SectionTitle>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={2}>
                    <TextField label="Venue / Club Name" value={form.locationName} onChange={setField("locationName")} fullWidth />
                    <TextField label="Address" value={form.address} onChange={setField("address")} fullWidth />
                  </Stack>

                  <SectionTitle>Date & Time</SectionTitle>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={2}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField
                        label="Start Date"
                        type="date"
                        value={form.startDate}
                        onChange={setField("startDate")}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: todayIsoDate }}
                        error={Boolean(form.startDate) && form.startDate < todayIsoDate}
                        helperText={
                          form.startDate && form.startDate < todayIsoDate
                            ? "Start date cannot be before today."
                            : " "
                        }
                        fullWidth
                      />
                      <TextField
                        label="End Date"
                        type="date"
                        value={form.endDate}
                        onChange={setField("endDate")}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: form.startDate || todayIsoDate }}
                        error={Boolean(form.endDate) && Boolean(form.startDate) && form.endDate < form.startDate}
                        helperText={
                          form.endDate && form.startDate && form.endDate < form.startDate
                            ? "End date must be on or after start date."
                            : " "
                        }
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField label="Start Time" type="time" value={form.startTime} onChange={setField("startTime")} InputLabelProps={{ shrink: true }} fullWidth />
                      <TextField label="End Time" type="time" value={form.endTime} onChange={setField("endTime")} InputLabelProps={{ shrink: true }} fullWidth />
                    </Stack>

                    <TextField
                      label="Registration Deadline"
                      type="date"
                      value={form.registrationDeadline}
                      onChange={setField("registrationDeadline")}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: todayIsoDate, max: form.startDate || undefined }}
                      fullWidth
                    />
                  </Stack>

                  <SectionTitle>Capacity & Fees</SectionTitle>
                  <Divider sx={{ mb: 2 }} />

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Capacity"
                      type="number"
                      value={form.capacity}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, capacity: Math.max(0, Number(e.target.value || 0)) }))
                      }
                      fullWidth
                    />
                    <TextField
                      label="Entry Fee"
                      type="number"
                      value={form.entryFee}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, entryFee: Math.max(0, Number(e.target.value || 0)) }))
                      }
                      fullWidth
                    />
                    <FormControl fullWidth>
                      <InputLabel>Currency</InputLabel>
                      <Select label="Currency" value={form.currency} onChange={setField("currency")}>
                        <MenuItem value="">
                          <em>Select currency</em>
                        </MenuItem>
                        <MenuItem value="AUD">AUD</MenuItem>
                        <MenuItem value="USD">USD</MenuItem>
                        <MenuItem value="EUR">EUR</MenuItem>
                        <MenuItem value="BRL">BRL</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>

                  <SectionTitle>Description</SectionTitle>
                  <Divider sx={{ mb: 2 }} />
                  <TextField label="Details" value={form.description} onChange={setField("description")} multiline minRows={4} fullWidth />
                </CardContent>
              </SoftCard>
            </Box>

            <Stack spacing={2} sx={{ width: "100%", maxWidth: 360, flexShrink: 0 }}>
              <SoftCard>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                  <SectionTitle>Settings</SectionTitle>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={1}>
                    <FormControlLabel
                      control={<Switch checked={form.isPublic} onChange={setSwitch("isPublic")} />}
                      label="Public tournament (visible to everyone)"
                    />
                    <FormControlLabel
                      control={
                        <Switch checked={form.allowWaitlist} onChange={setSwitch("allowWaitlist")} />
                      }
                      label="Allow waitlist when full"
                    />
                    <FormControlLabel
                      control={
                        <Switch checked={form.requireApproval} onChange={setSwitch("requireApproval")} />
                      }
                      label="Require approval to join"
                    />
                  </Stack>
                </CardContent>
              </SoftCard>
            </Stack>
          </Stack>
        ) : step === 2 ? (
          <SoftCard>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <SectionTitle>Categories</SectionTitle>
              <Divider sx={{ mb: 2 }} />
              <Alert severity="info" sx={{ mb: 2 }}>
                Configure one category at a time, add it to the list, then go to Preview.
              </Alert>

              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid rgba(15,23,42,0.10)",
                  background: "rgba(15,23,42,0.03)",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {form.name || "Untitled Tournament"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {form.sport} • {formatTournamentLevelLabel(form.level)} • {form.startDate || "TBD"}
                </Typography>
              </Box>

              <Stack spacing={1.5}>
                <Card sx={{ borderRadius: 2, border: "1px solid rgba(15,23,42,0.10)", boxShadow: "none" }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Stack spacing={1.25}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography sx={{ fontWeight: 800 }}>New Category</Typography>
                        {draftCategory.name.trim() ? (
                          <Chip size="small" label={`${formatCategoryLevelLabel(draftCategory.level)} • ${draftCategory.gender} • ${formatAgeRange(draftCategory)}`} variant="outlined" sx={pillChipSx("muted")} />
                        ) : null}
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          label="Category Name (optional)"
                          value={draftCategory.name}
                          onChange={(e) => setDraftCategory((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. U12, Open, Pro Women"
                          fullWidth
                        />
                        <Tooltip
                          title="Optional: if empty, name is auto-generated from level + gender."
                          arrow
                        >
                          <InfoOutlinedIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                        </Tooltip>
                      </Stack>

                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
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
                          disabled={draftCategory.expandToAllGenders || draftCategory.expandToMaleFemale}
                        >
                          <MenuItem value="Open">Open</MenuItem>
                          <MenuItem value="Women">Women</MenuItem>
                          <MenuItem value="Men">Men</MenuItem>
                          <MenuItem value="Mixed">Mixed</MenuItem>
                        </TextField>
                      </Stack>

                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                        <TextField
                          label="Min Age"
                          type="number"
                          value={draftCategory.minAge}
                          onChange={(e) => setDraftCategory((prev) => ({ ...prev, minAge: e.target.value }))}
                          fullWidth
                        />
                        <TextField
                          label="Max Age"
                          type="number"
                          value={draftCategory.maxAge}
                          onChange={(e) => setDraftCategory((prev) => ({ ...prev, maxAge: e.target.value }))}
                          fullWidth
                        />
                      </Stack>

                      <Stack direction="row" alignItems="center" spacing={1} sx={{ alignSelf: "flex-start" }}>
                        <Switch checked={draftCategory.expandToAllGenders} onChange={toggleGenderVariants} />
                        <Typography variant="body2">Enable M/F/Mix variants for this category</Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ alignSelf: "flex-start" }}>
                        <Switch checked={draftCategory.expandToMaleFemale} onChange={toggleMaleFemaleVariants} />
                        <Typography variant="body2">Enable M/F variants only</Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ alignSelf: "flex-start" }}>
                        <Switch checked={draftCategory.isKidsCategory} onChange={toggleKidsCategory} />
                        <Typography variant="body2">Kids category (auto-sets max age to 12 when empty)</Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="flex-end">
                        {editingCategoryId ? (
                          <Button variant="text" onClick={cancelEditCategory} sx={{ mr: 1 }}>
                            Cancel Edit
                          </Button>
                        ) : null}
                        <Button variant="outlined" onClick={addCategory} sx={{ borderRadius: 999 }}>
                          {editingCategoryId ? "Save Category" : "Add Category"}
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: "1px solid rgba(15,23,42,0.10)",
                    background: "rgba(15,23,42,0.02)",
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ sm: "center" }}
                    justifyContent="space-between"
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 900 }}>
                      Categories List
                    </Typography>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      <Chip
                        size="small"
                        label={`${savedCategories.length} categor${savedCategories.length === 1 ? "y" : "ies"}`}
                        variant="outlined"
                        sx={pillChipSx("muted")}
                      />
                      <Chip
                        size="small"
                        label={`${signupCategories.length} signup option${signupCategories.length === 1 ? "" : "s"}`}
                        variant="outlined"
                        sx={pillChipSx("primary")}
                      />
                    </Stack>
                  </Stack>

                  <TableContainer
                    sx={{
                      border: "1px solid rgba(15,23,42,0.10)",
                      borderRadius: 2,
                      backgroundColor: "background.paper",
                    }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Level</TableCell>
                          <TableCell>Ages</TableCell>
                          <TableCell>Signup Mode</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {savedCategories.length > 0 ? (
                          savedCategories.map((category) => (
                            <TableRow key={category.id} hover>
                              <TableCell sx={{ fontWeight: 700 }}>{category.name.trim()}</TableCell>
                              <TableCell>{formatCategoryLevelLabel(category.level)}</TableCell>
                              <TableCell>{formatAgeRange(category)}</TableCell>
                              <TableCell>{getCategoryGenderSummary(category).replaceAll("/", " / ")}</TableCell>
                              <TableCell align="right">
                                <Button size="small" onClick={() => editCategory(category.id)} sx={{ mr: 1 }}>
                                  Edit
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  disabled={deletingCategoryIds.includes(category.id)}
                                  onClick={() => void removeCategory(category.id)}
                                >
                                  {deletingCategoryIds.includes(category.id) ? "Deleting..." : "Remove"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5}>
                              <Typography variant="body2" color="text.secondary">
                                Add categories and they will appear here.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

              </Stack>
            </CardContent>
          </SoftCard>
        ) : (
          <SoftCard>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <SectionTitle>Tournament Preview</SectionTitle>
              <Divider sx={{ mb: 2 }} />

              <Typography variant="h3" sx={{ mb: 1, fontWeight: 900 }}>
                {form.name || "Untitled Tournament"}
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" rowGap={1}>
                <Chip size="small" label={form.sport} variant="outlined" sx={pillChipSx("primary")} />
                <Chip size="small" label={formatTournamentLevelLabel(form.level)} variant="outlined" sx={pillChipSx("muted")} />
                <Chip size="small" label={form.tournamentStage} variant="outlined" sx={pillChipSx("muted")} />
                <Chip
                  size="small"
                  label={form.isPublic ? "Public" : "Private"}
                  variant="outlined"
                  sx={form.isPublic ? pillChipSx("primary") : pillChipSx("orange")}
                />
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {form.locationName || "Venue not set"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {form.address || "Address not set"}
              </Typography>

              <Divider sx={{ mb: 2 }} />

              <Stack spacing={1.25}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    When
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {whenText}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    Registration
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Deadline: {form.registrationDeadline || "—"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    Capacity
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {form.capacity} players • Waitlist {form.allowWaitlist ? "enabled" : "disabled"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    Entry Fee
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feeText}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    Categories
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {signupCategories.length} signup option{signupCategories.length === 1 ? "" : "s"}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary">
                {form.description || "Add a short description for players…"}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <SectionTitle>Invite Link</SectionTitle>
              <Stack spacing={1}>
                <Button
                  variant="outlined"
                  onClick={handleGenerateInviteLink}
                  disabled={!createdTournamentId}
                  sx={{ borderRadius: 999, width: { xs: "100%", sm: "fit-content" } }}
                >
                  Generate Invite Link
                </Button>

                {inviteLink ? (
                  <>
                    <TextField value={inviteLink} size="small" fullWidth />
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <Button variant="contained" onClick={handleCopyInviteLink} sx={{ borderRadius: 999 }}>
                        Copy Link
                      </Button>
                      {canUseNativeShare ? (
                        <Button variant="outlined" onClick={handleShareInviteLink} sx={{ borderRadius: 999 }}>
                          Share
                        </Button>
                      ) : null}
                    </Stack>
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Create the tournament first, then generate a shareable invite link.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </SoftCard>
        )}
      </Box>
    </Box>
  );
}
