import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Typography,
  Chip,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { getToken } from "../auth/tokens";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const ENABLE_SPECIAL_PRICING_RULE_MOCK = true;

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
  tournamentStage: "DRAFT" | "REGISTRATION";
};

type TournamentCategoryForm = {
  id: string;
  backendId?: number;
  name: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS";
  format: "SINGLES" | "DOUBLES" | "MIXED";
  gender: "Women" | "Men";
  price: number;
};

type CategoryPricingRule = {
  enabled: boolean;
  specialPricePerCategory: number;
  currency: "" | "AUD" | "USD" | "EUR" | "BRL";
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
  tournamentStage: "DRAFT",
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
    format: "DOUBLES",
    gender: "Men",
    price: 0,
  };
}

function formatTournamentLevelLabel(level?: string): string {
  const raw = String(level ?? "").trim();
  if (!raw) return "Open";
  const normalized = raw.toUpperCase().replaceAll("_", " ");
  if (normalized === "ALL LEVELS") return "Open";
  return raw.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCategoryLevelLabel(
  level: TournamentCategoryForm["level"],
): string {
  const normalized = String(level).toUpperCase().replaceAll("_", " ");
  if (normalized === "ALL LEVELS") return "Open";
  return normalized.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCategoryFormatLabel(
  format: TournamentCategoryForm["format"],
): string {
  if (format === "SINGLES") return "Singles";
  if (format === "DOUBLES") return "Doubles";
  return "Mixed";
}

function inferFormatFromCategoryName(
  name: string,
): TournamentCategoryForm["format"] {
  const normalized = String(name ?? "").toLowerCase();
  if (normalized.includes("single")) return "SINGLES";
  if (normalized.includes("mixed")) return "MIXED";
  return "DOUBLES";
}

function teamsLimitSizeFromFormat(
  format: TournamentCategoryForm["format"],
): number {
  if (format === "SINGLES") return 1;
  return 2;
}

function buildAutoCategoryName(category: TournamentCategoryForm): string {
  return `${category.gender} - ${formatCategoryLevelLabel(category.level)} - ${formatCategoryFormatLabel(category.format)}`;
}

function mapApiTournamentLevel(level?: string): TournamentForm["level"] {
  const normalized = String(level ?? "")
    .toUpperCase()
    .replaceAll("_", " ")
    .trim();
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
  if (!form.timezone) return "Timezone is required.";
  if (!form.startDate) return "Start date is required.";
  if (form.startDate < today) return "Start date cannot be before today.";
  if (!form.endDate) return "End date is required.";
  if (form.endDate < form.startDate)
    return "End date must be on or after start date.";
  if (!form.startTime) return "Start time is required.";
  if (!form.endTime) return "End time is required.";
  if (form.startDate === form.endDate && form.endTime <= form.startTime) {
    return "End time must be after start time for the same day.";
  }
  return null;
}

const initialCategoryPricingRule: CategoryPricingRule = {
  enabled: false,
  specialPricePerCategory: 0,
  currency: "AUD",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="body1"
      sx={{ fontWeight: 900, fontSize: "0.95rem", mb: 1 }}
    >
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

export default function AddTournamentPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [form, setForm] = React.useState<TournamentForm>(initialForm);
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  const [savedCategories, setSavedCategories] = React.useState<
    TournamentCategoryForm[]
  >([]);
  const [draftCategory, setDraftCategory] =
    React.useState<TournamentCategoryForm>(newCategory());
  const [draftFormats, setDraftFormats] = React.useState<
    TournamentCategoryForm["format"][]
  >(["DOUBLES"]);
  const [draftGenders, setDraftGenders] = React.useState<
    TournamentCategoryForm["gender"][]
  >(["Men"]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);
  const [categoryPricingRule, setCategoryPricingRule] =
    React.useState<CategoryPricingRule>(initialCategoryPricingRule);
  const [editingCategoryId, setEditingCategoryId] = React.useState<
    string | null
  >(null);
  const [loadedCategoryIds, setLoadedCategoryIds] = React.useState<number[]>(
    [],
  );
  const [deletingCategoryIds, setDeletingCategoryIds] = React.useState<
    string[]
  >([]);

  const [saving, setSaving] = React.useState(false);
  const [createdTournamentId, setCreatedTournamentId] = React.useState<
    number | null
  >(null);
  const [inviteLink, setInviteLink] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const todayIsoDate = React.useMemo(() => getTodayIsoDate(), []);
  const basicsValidationError = React.useMemo(
    () => validateTournamentBasics(form),
    [form],
  );

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
            eventBody?.message?.[0] ||
              eventBody?.error ||
              "Failed to load tournament",
          );
        }
        if (!categoriesRes.ok) {
          throw new Error(
            categoriesBody?.message?.[0] ||
              categoriesBody?.error ||
              "Failed to load categories",
          );
        }
        const raw = Array.isArray(eventBody)
          ? eventBody
          : (eventBody?.data ?? []);
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
          currency: String(
            selected.currency ?? prev.currency,
          ) as TournamentForm["currency"],
          description: String(selected.description ?? ""),
          isPublic: Boolean(selected.isPublic ?? true),
          allowWaitlist: Boolean(selected.allowWaitlist ?? false),
          requireApproval: Boolean(selected.requireApproval ?? false),
          tournamentStage: String(
            selected.tournamentStage ?? prev.tournamentStage ?? "DRAFT",
          ).toUpperCase() as TournamentForm["tournamentStage"],
        }));
        setCategoryPricingRule((prev) => ({
          ...prev,
          currency: String(
            selected.currency ?? prev.currency,
          ) as CategoryPricingRule["currency"],
        }));
        setCreatedTournamentId(Number(id));
        const rawCategories = Array.isArray(categoriesBody)
          ? categoriesBody
          : (categoriesBody?.data ?? []);
        const mappedCategories: TournamentCategoryForm[] = rawCategories.map(
          (c: any) => ({
            id: crypto.randomUUID(),
            backendId: Number(c.id),
            name: String(c.name ?? ""),
            level: String(
              c.level ?? "INTERMEDIATE",
            ) as TournamentCategoryForm["level"],
            format:
              Number(c.teamsLimitSize) === 1
                ? "SINGLES"
                : inferFormatFromCategoryName(String(c.name ?? "")),
            gender: String(c.gender ?? "Men") === "Women" ? "Women" : "Men",
            price: Math.max(
              0,
              Number(c.price ?? c.entryFee ?? c.fee ?? 0) || 0,
            ),
          }),
        );
        setSavedCategories(mappedCategories);
        setLoadedCategoryIds(
          mappedCategories
            .map((c) => Number(c.backendId))
            .filter((v) => Number.isFinite(v) && v > 0),
        );
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load tournament",
        );
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

  const addCategory = () => {
    const cleanName = draftCategory.name.trim();
    setErrorMessage(null);
    const normalizedDraft = {
      ...draftCategory,
      price: Math.max(0, Number(draftCategory.price || 0)),
    };
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
      if (draftGenders.length === 0) {
        setErrorMessage("Select at least one gender.");
        return;
      }
      if (draftFormats.length === 0) {
        setErrorMessage("Select at least one format.");
        return;
      }
      const targetGenders = draftGenders;
      const targetFormats =
        draftFormats.length > 0 ? draftFormats : [normalizedDraft.format];
      const categoriesToAdd = targetGenders.flatMap((gender) =>
        targetFormats.map((format) => {
          const generatedName = cleanName
            ? targetFormats.length > 1 || targetGenders.length > 1
              ? `${cleanName} - ${gender} - ${formatCategoryLevelLabel(normalizedDraft.level)} - ${formatCategoryFormatLabel(format)}`
              : cleanName
            : buildAutoCategoryName({
                ...normalizedDraft,
                gender,
                format,
              });
          return {
            ...normalizedDraft,
            id: crypto.randomUUID(),
            gender,
            format,
            name: generatedName,
          };
        }),
      );
      setSavedCategories((prev) => [...prev, ...categoriesToAdd]);
      setStatusMessage(
        categoriesToAdd.length > 1
          ? `${categoriesToAdd.length} categories added to the list.`
          : "Category added to the list.",
      );
    }

    setDraftCategory(newCategory());
    setDraftFormats(["DOUBLES"]);
    setDraftGenders(["Men"]);
    setIsCategoryModalOpen(false);
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
      const res = await fetch(
        `${API_URL}/tournament-categories/${target.backendId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message?.[0] || body?.error || "Failed to delete category",
        );
      }

      removeLocal();
      setLoadedCategoryIds((prev) =>
        prev.filter((cid) => cid !== Number(target.backendId)),
      );
      setStatusMessage("Category deleted.");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to delete category",
      );
    } finally {
      setDeletingCategoryIds((prev) => prev.filter((value) => value !== id));
    }
  };

  const editCategory = (id: string) => {
    const selected = savedCategories.find((c) => c.id === id);
    if (!selected) return;
    setDraftCategory(selected);
    setDraftFormats([selected.format]);
    setDraftGenders([selected.gender]);
    setIsCategoryModalOpen(true);
    setEditingCategoryId(id);
    setStatusMessage("Editing category. Save to update.");
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setDraftCategory(newCategory());
    setDraftFormats(["DOUBLES"]);
    setDraftGenders(["Men"]);
    setIsCategoryModalOpen(false);
  };

  const signupCategories = React.useMemo(
    () =>
      savedCategories
        .map((category) => {
          const baseName = category.name.trim();
          if (!baseName) return null;
          return { ...category, name: baseName };
        })
        .filter((category): category is TournamentCategoryForm =>
          Boolean(category),
        ),
    [savedCategories],
  );

  const hasValidCategories = signupCategories.length > 0;
  const defaultCategoryFee = React.useMemo(() => {
    const first = signupCategories[0];
    if (!first) return 0;
    const value = Number(first.price ?? 0);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }, [signupCategories]);
  const defaultEventFormatLabel = React.useMemo(() => {
    const first = signupCategories[0];
    if (!first) return "Doubles";
    return formatCategoryFormatLabel(first.format);
  }, [signupCategories]);

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
        format: defaultEventFormatLabel,
        level: form.level || "All levels",
        timezone: form.timezone,
        locationName: form.locationName,
        address: form.address,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: `${form.startTime}:00`,
        endTime: `${form.endTime}:00`,
        registrationDeadline: form.registrationDeadline,
        capacity: form.capacity,
        entryFee: defaultCategoryFee,
        currency: categoryPricingRule.currency || "AUD",
        description: form.description,
        isPublic: form.isPublic,
        allowWaitlist: form.allowWaitlist,
        requireApproval: form.requireApproval,
        tournamentStage: form.tournamentStage || "DRAFT",
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
        throw new Error(
          data?.message || data?.error || "Failed to create event",
        );
      }

      const createdId = isEditMode
        ? Number(id)
        : Number(data?.id ?? data?.data?.id ?? 0);
      if (!Number.isFinite(createdId) || createdId <= 0) {
        throw new Error("Tournament created, but no valid id was returned.");
      }

      const expandedCategories: Array<{
        backendId?: number;
        name: string;
        level: TournamentCategoryForm["level"];
        format: TournamentCategoryForm["format"];
        gender: TournamentCategoryForm["gender"];
        price: number;
      }> = savedCategories.reduce((acc, source) => {
        const baseName = source.name.trim();
        if (!baseName) return acc;
        acc.push({
          backendId: source.backendId,
          name: baseName,
          level: source.level,
          format: source.format,
          gender: source.gender,
          price: Math.max(0, Number(source.price || 0)),
        });
        return acc;
      }, [] as Array<{
        backendId?: number;
        name: string;
        level: TournamentCategoryForm["level"];
        format: TournamentCategoryForm["format"];
        gender: TournamentCategoryForm["gender"];
        price: number;
      }>);

      if (isEditMode) {
        const usedBackendIds = new Set<number>();

        const updateOps = expandedCategories
          .filter((c) => Number.isFinite(Number(c.backendId)))
          .map(async (category) => {
            const backendId = Number(category.backendId);
            usedBackendIds.add(backendId);
            const resUpdate = await fetch(
              `${API_URL}/tournament-categories/${backendId}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  eventId: createdId,
                  name: category.name,
                  level: category.level,
                  minAge: null,
                  maxAge: null,
                  gender: category.gender,
                  teamsLimitSize: teamsLimitSizeFromFormat(category.format),
                  price: category.price,
                  currency: categoryPricingRule.currency || "AUD",
                }),
              },
            );
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
                minAge: null,
                maxAge: null,
                gender: category.gender,
                teamsLimitSize: teamsLimitSizeFromFormat(category.format),
                price: category.price,
                currency: categoryPricingRule.currency || "AUD",
              }),
            });
            const body = await resCreate.json().catch(() => null);
            return { ok: resCreate.ok, body };
          });

        const deleteOps = loadedCategoryIds
          .filter((existingId) => !usedBackendIds.has(existingId))
          .map(async (categoryId) => {
            const resDelete = await fetch(
              `${API_URL}/tournament-categories/${categoryId}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            return { ok: resDelete.ok, body: null };
          });

        const results = await Promise.all([
          ...updateOps,
          ...createOps,
          ...deleteOps,
        ]);
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
            minAge: null,
            maxAge: null,
            gender: c.gender,
            teamsLimitSize: teamsLimitSizeFromFormat(c.format),
            price: Math.max(0, Number(c.price || 0)),
            currency: categoryPricingRule.currency || "AUD",
          }))
          .filter((c) => c.name);

        if (categoriesToCreate.length > 0) {
          const results = await Promise.all(
            categoriesToCreate.map(async (category) => {
              const categoryRes = await fetch(
                `${API_URL}/tournament-categories`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify(category),
                },
              );
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
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to create event",
      );
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
  const categoryBaseTotal = signupCategories.reduce(
    (sum, item) => sum + Number(item.price || 0),
    0,
  );
  const feeText = `${categoryPricingRule.currency || "AUD"} ${categoryBaseTotal}`;
  const canUseNativeShare =
    typeof navigator !== "undefined" && "share" in navigator;

  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        minWidth: 0,
        bgcolor: "#F9FAFB",
        p: { xs: 2, md: 4 },
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 1200 }}>
        <Card
          sx={{
            mb: 4,
            borderRadius: 3,
            border: "1px solid #E5E7EB",
            boxShadow: "0 4px 6px -1px rgb(139 92 246 / 0.1)",
            overflow: "hidden",
            position: "relative",
            background: "#FFFFFF",
          }}
        >
          {/* Decorative gradient bar */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "6px",
              background:
                "linear-gradient(90deg, #8B5CF6 0%, #A855F7 50%, #EC4899 100%)",
            }}
          />

          <CardContent sx={{ p: { xs: 3, sm: 4 }, pt: { xs: 4, sm: 5 } }}>
            <Stack spacing={4}>
              {/* Alerts */}
              {errorMessage ? (
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: 2.5,
                    border: "1.5px solid #FEE2E2",
                    bgcolor: "#FEF2F2",
                  }}
                >
                  {errorMessage}
                </Alert>
              ) : null}
              {statusMessage ? (
                <Alert
                  severity="success"
                  sx={{
                    borderRadius: 2.5,
                    border: "1.5px solid #D1FAE5",
                    bgcolor: "#F0FDF4",
                  }}
                >
                  {statusMessage}
                </Alert>
              ) : null}

              {/* Header Section */}
              <Stack spacing={3}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={3}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                >
                  <Stack spacing={1}>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 800,
                        fontSize: { xs: "1.75rem", sm: "2.25rem" },
                        color: "#111827",
                        background:
                          "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {isEditMode ? "Edit Tournament" : "Add Tournament"}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ color: "#6B7280", fontSize: "1rem" }}
                    >
                      Step {step} of 3:{" "}
                      {step === 1
                        ? "Tournament details"
                        : step === 2
                          ? "Categories & Settings"
                          : "Final preview"}
                    </Typography>
                  </Stack>

                  <Stack
                    direction="row"
                    spacing={2}
                    justifyContent="flex-end"
                    flexWrap="wrap"
                  >
                    <Button
                      variant="outlined"
                      onClick={handleCancel}
                      sx={{
                        borderRadius: 2,
                        borderWidth: "1.5px",
                        borderColor: "#E5E7EB",
                        color: "#374151",
                        fontWeight: 600,
                        px: 3,
                        py: 1.25,
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

                    {step === 1 ? (
                      <Button
                        variant="contained"
                        onClick={handleStepOneNext}
                        sx={{
                          borderRadius: 2,
                          background:
                            "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                          fontWeight: 600,
                          px: 3,
                          py: 1.25,
                          textTransform: "none",
                          boxShadow: "0 4px 6px -1px rgb(139 92 246 / 0.3)",
                          "&:hover": {
                            background:
                              "linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)",
                            boxShadow: "0 6px 8px -1px rgb(139 92 246 / 0.4)",
                          },
                          "&:disabled": {
                            background: "#E5E7EB",
                            color: "#9CA3AF",
                          },
                        }}
                      >
                        Next: Categories
                      </Button>
                    ) : step === 2 ? (
                      <>
                        <Button
                          variant="outlined"
                          onClick={() => setStep(1)}
                          sx={{
                            borderRadius: 2,
                            borderWidth: "1.5px",
                            borderColor: "#E5E7EB",
                            color: "#374151",
                            fontWeight: 600,
                            px: 3,
                            py: 1.25,
                            textTransform: "none",
                            "&:hover": {
                              borderWidth: "1.5px",
                              borderColor: "#D1D5DB",
                              bgcolor: "#F9FAFB",
                            },
                          }}
                        >
                          Back
                        </Button>
                        <Button
                          variant="contained"
                          onClick={() => setStep(3)}
                          disabled={!hasValidCategories}
                          sx={{
                            borderRadius: 2,
                            background:
                              "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                            fontWeight: 600,
                            px: 3,
                            py: 1.25,
                            textTransform: "none",
                            boxShadow: "0 4px 6px -1px rgb(139 92 246 / 0.3)",
                            "&:hover": {
                              background:
                                "linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)",
                              boxShadow: "0 6px 8px -1px rgb(139 92 246 / 0.4)",
                            },
                            "&:disabled": {
                              background: "#E5E7EB",
                              color: "#9CA3AF",
                            },
                          }}
                        >
                          Preview
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outlined"
                          onClick={() => setStep(2)}
                          sx={{
                            borderRadius: 2,
                            borderWidth: "1.5px",
                            borderColor: "#E5E7EB",
                            color: "#374151",
                            fontWeight: 600,
                            px: 3,
                            py: 1.25,
                            textTransform: "none",
                            "&:hover": {
                              borderWidth: "1.5px",
                              borderColor: "#D1D5DB",
                              bgcolor: "#F9FAFB",
                            },
                          }}
                        >
                          Back
                        </Button>
                        {createdTournamentId ? (
                          <Button
                            variant="outlined"
                            onClick={() => navigate("/tournaments")}
                            sx={{
                              borderRadius: 2,
                              borderWidth: "1.5px",
                              borderColor: "#8B5CF6",
                              color: "#8B5CF6",
                              fontWeight: 600,
                              px: 3,
                              py: 1.25,
                              textTransform: "none",
                              "&:hover": {
                                borderWidth: "1.5px",
                                borderColor: "#7C3AED",
                                bgcolor: "#FAF5FF",
                              },
                            }}
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
                          sx={{
                            borderRadius: 2,
                            background:
                              "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                            fontWeight: 600,
                            px: 3,
                            py: 1.25,
                            textTransform: "none",
                            boxShadow: "0 4px 6px -1px rgb(139 92 246 / 0.3)",
                            "&:hover": {
                              background:
                                "linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)",
                              boxShadow: "0 6px 8px -1px rgb(139 92 246 / 0.4)",
                            },
                            "&:disabled": {
                              background: "#E5E7EB",
                              color: "#9CA3AF",
                            },
                          }}
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

                {/* Enhanced Progress Indicator */}
                <Box>
                  <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
                    {[
                      { num: 1, label: "Details" },
                      { num: 2, label: "Categories" },
                      { num: 3, label: "Preview" },
                    ].map((item) => (
                      <Stack
                        key={item.num}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ flex: 1 }}
                      >
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background:
                              step >= item.num
                                ? "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)"
                                : "#E5E7EB",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: step >= item.num ? "#FFFFFF" : "#9CA3AF",
                            fontWeight: 700,
                            fontSize: "0.8125rem",
                            transition: "all 0.3s ease",
                          }}
                        >
                          {item.num}
                        </Box>
                        <Typography
                          sx={{
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            color: step >= item.num ? "#8B5CF6" : "#9CA3AF",
                            display: { xs: "none", sm: "block" },
                          }}
                        >
                          {item.label}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>

                  <Stack direction="row" spacing={2}>
                    <Box
                      sx={{
                        flex: 1,
                        height: 8,
                        borderRadius: 999,
                        background:
                          step >= 1
                            ? "linear-gradient(90deg, #8B5CF6 0%, #A855F7 100%)"
                            : "#E5E7EB",
                        transition: "all 0.3s ease",
                      }}
                    />
                    <Box
                      sx={{
                        flex: 1,
                        height: 8,
                        borderRadius: 999,
                        background:
                          step >= 2
                            ? "linear-gradient(90deg, #A855F7 0%, #EC4899 100%)"
                            : "#E5E7EB",
                        transition: "all 0.3s ease",
                      }}
                    />
                    <Box
                      sx={{
                        flex: 1,
                        height: 8,
                        borderRadius: 999,
                        background:
                          step >= 3
                            ? "linear-gradient(90deg, #EC4899 0%, #F472B6 100%)"
                            : "#E5E7EB",
                        transition: "all 0.3s ease",
                      }}
                    />
                  </Stack>
                </Box>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {step === 1 ? (
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            alignItems="flex-start"
          >
            <Box sx={{ width: "100%", flex: 1 }}>
              <SoftCard>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                  <SectionTitle>Basics</SectionTitle>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={2}>
                    <TextField
                      label="Tournament Name"
                      value={form.name}
                      onChange={setField("name")}
                      fullWidth
                    />

                    <FormControl fullWidth>
                      <InputLabel>Sport</InputLabel>
                      <Select
                        label="Sport"
                        value={form.sport}
                        onChange={setField("sport")}
                      >
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
                      <InputLabel>Timezone</InputLabel>
                      <Select
                        label="Timezone"
                        value={form.timezone}
                        onChange={setField("timezone")}
                      >
                        <MenuItem value="">
                          <em>Select timezone</em>
                        </MenuItem>
                        <MenuItem value="Australia/Sydney">
                          Australia/Sydney
                        </MenuItem>
                        <MenuItem value="Australia/Melbourne">
                          Australia/Melbourne
                        </MenuItem>
                        <MenuItem value="Australia/Brisbane">
                          Australia/Brisbane
                        </MenuItem>
                        <MenuItem value="UTC">UTC</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>

                  <SectionTitle>Location</SectionTitle>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={2}>
                    <TextField
                      label="Venue / Club Name"
                      value={form.locationName}
                      onChange={setField("locationName")}
                      fullWidth
                    />
                    <TextField
                      label="Address"
                      value={form.address}
                      onChange={setField("address")}
                      fullWidth
                    />
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
                        error={
                          Boolean(form.startDate) &&
                          form.startDate < todayIsoDate
                        }
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
                        error={
                          Boolean(form.endDate) &&
                          Boolean(form.startDate) &&
                          form.endDate < form.startDate
                        }
                        helperText={
                          form.endDate &&
                          form.startDate &&
                          form.endDate < form.startDate
                            ? "End date must be on or after start date."
                            : " "
                        }
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField
                        label="Start Time"
                        type="time"
                        value={form.startTime}
                        onChange={setField("startTime")}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                      />
                      <TextField
                        label="End Time"
                        type="time"
                        value={form.endTime}
                        onChange={setField("endTime")}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                      />
                    </Stack>

                    <TextField
                      label="Registration Deadline"
                      type="date"
                      value={form.registrationDeadline}
                      onChange={setField("registrationDeadline")}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{
                        min: todayIsoDate,
                        max: form.startDate || undefined,
                      }}
                      fullWidth
                    />
                  </Stack>

                  <SectionTitle>Capacity</SectionTitle>
                  <Divider sx={{ mb: 2 }} />

                  <TextField
                    label="Capacity"
                    type="number"
                    value={form.capacity}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        capacity: Math.max(0, Number(e.target.value || 0)),
                      }))
                    }
                    fullWidth
                  />

                  <SectionTitle>Description</SectionTitle>
                  <Divider sx={{ mb: 2 }} />
                  <TextField
                    label="Details"
                    value={form.description}
                    onChange={setField("description")}
                    multiline
                    minRows={4}
                    fullWidth
                  />
                </CardContent>
              </SoftCard>
            </Box>

            <Stack
              spacing={2}
              sx={{ width: "100%", maxWidth: 360, flexShrink: 0 }}
            >
              <SoftCard>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                  <SectionTitle>Settings</SectionTitle>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={1}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.isPublic}
                          onChange={setSwitch("isPublic")}
                        />
                      }
                      label="Public tournament (visible to everyone)"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.allowWaitlist}
                          onChange={setSwitch("allowWaitlist")}
                        />
                      }
                      label="Allow waitlist when full"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.requireApproval}
                          onChange={setSwitch("requireApproval")}
                        />
                      }
                      label="Require approval to join"
                    />
                  </Stack>
                </CardContent>
              </SoftCard>
            </Stack>
          </Stack>
        ) : step === 2 ? (
          <Card
            sx={{
              borderRadius: 3,
              border: "1px solid #E5E7EB",
              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
            }}
          >
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Stack spacing={3}>
                <Box>
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 700,
                      fontSize: "1.5rem",
                      color: "#111827",
                      mb: 0.5,
                    }}
                  >
                    Categories
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "#6B7280", fontSize: "0.9375rem" }}
                  >
                    Add categories and pricing for each one. You can create as
                    many combinations as needed.
                  </Typography>
                </Box>

                {ENABLE_SPECIAL_PRICING_RULE_MOCK ? (
                  <Alert
                    severity="info"
                    sx={{
                      borderRadius: 2,
                      border: "1px solid #BFDBFE",
                      bgcolor: "#EFF6FF",
                    }}
                  >
                    Special pricing rule is currently UI-only (mocked). Category
                    base price is persisted per category.
                  </Alert>
                ) : null}

                <Card
                  sx={{
                    borderRadius: 2,
                    border: "1px solid #E9D5FF",
                    background:
                      "linear-gradient(135deg, #FAF5FF 0%, #FDF2F8 100%)",
                    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack spacing={0.5}>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: "1rem",
                          color: "#111827",
                        }}
                      >
                        {form.name || "Untitled Tournament"}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "#6B7280", fontSize: "0.875rem" }}
                      >
                        {form.sport} • {form.startDate || "TBD"}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>

                <Card
                  sx={{
                    borderRadius: 3,
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={3}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        justifyContent="space-between"
                      >
                        <Typography
                          variant="h2"
                          sx={{
                            fontWeight: 700,
                            fontSize: "1.5rem",
                            color: "#111827",
                          }}
                        >
                          Categories List
                        </Typography>
                        <Stack direction="row" spacing={1.5} useFlexGap>
                          <Chip
                            size="small"
                            label={`${savedCategories.length} categor${savedCategories.length === 1 ? "y" : "ies"}`}
                            sx={{
                              bgcolor: "#F9FAFB",
                              color: "#6B7280",
                              fontWeight: 600,
                              fontSize: "0.8125rem",
                              border: "1px solid #E5E7EB",
                            }}
                          />
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setDraftCategory(newCategory());
                              setDraftFormats(["DOUBLES"]);
                              setDraftGenders(["Men"]);
                              setEditingCategoryId(null);
                              setIsCategoryModalOpen(true);
                            }}
                            sx={{
                              borderRadius: 2,
                              borderColor: "#8B5CF6",
                              color: "#8B5CF6",
                              fontWeight: 600,
                              textTransform: "none",
                              "&:hover": { borderColor: "#7C3AED", bgcolor: "#FAF5FF" },
                            }}
                          >
                            Add Category
                          </Button>
                        </Stack>
                      </Stack>

                      <TableContainer
                        sx={{
                          border: "1px solid #E5E7EB",
                          borderRadius: 2,
                          backgroundColor: "#FFFFFF",
                        }}
                      >
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: "#F9FAFB" }}>
                              <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.875rem" }}>
                                Category
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.875rem" }}>
                                Gender
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.875rem" }}>
                                Level
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.875rem" }}>
                                Format
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700, color: "#374151", fontSize: "0.875rem" }}>
                                Price
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: "#374151", fontSize: "0.875rem" }}>
                                Actions
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {savedCategories.length > 0 ? (
                              savedCategories.map((category) => (
                                <TableRow key={category.id} hover sx={{ "&:hover": { bgcolor: "#F9FAFB" } }}>
                                  <TableCell sx={{ fontWeight: 600, color: "#111827" }}>
                                    {category.name.trim()}
                                  </TableCell>
                                  <TableCell sx={{ color: "#6B7280" }}>{category.gender}</TableCell>
                                  <TableCell sx={{ color: "#6B7280" }}>
                                    {formatCategoryLevelLabel(category.level)}
                                  </TableCell>
                                  <TableCell sx={{ color: "#6B7280" }}>
                                    {formatCategoryFormatLabel(category.format)}
                                  </TableCell>
                                  <TableCell sx={{ color: "#6B7280" }}>
                                    {categoryPricingRule.currency} {Number(category.price || 0)}
                                  </TableCell>
                                  <TableCell align="right">
                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                      <Button
                                        size="small"
                                        onClick={() => editCategory(category.id)}
                                        sx={{
                                          borderRadius: 1.5,
                                          color: "#8B5CF6",
                                          fontWeight: 600,
                                          textTransform: "none",
                                          px: 2,
                                          "&:hover": { bgcolor: "#F3E8FF" },
                                        }}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        size="small"
                                        onClick={() => void removeCategory(category.id)}
                                        disabled={deletingCategoryIds.includes(category.id)}
                                        sx={{
                                          borderRadius: 1.5,
                                          color: "#DC2626",
                                          fontWeight: 600,
                                          textTransform: "none",
                                          px: 2,
                                          "&:hover": { bgcolor: "#FEF2F2" },
                                          "&:disabled": { color: "#9CA3AF" },
                                        }}
                                      >
                                        {deletingCategoryIds.includes(category.id) ? "Deleting..." : "Remove"}
                                      </Button>
                                    </Stack>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={6} sx={{ textAlign: "center", py: 4 }}>
                                  <Stack spacing={1.5} alignItems="center">
                                    <Typography variant="body2" sx={{ color: "#6B7280", fontSize: "0.9375rem" }}>
                                      You currently don&apos;t have any category.
                                    </Typography>
                                    <Button
                                      variant="contained"
                                      onClick={() => {
                                        setDraftCategory(newCategory());
                                        setDraftFormats(["DOUBLES"]);
                                        setDraftGenders(["Men"]);
                                        setEditingCategoryId(null);
                                        setIsCategoryModalOpen(true);
                                      }}
                                      sx={{
                                        borderRadius: 2,
                                        background:
                                          "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
                                        fontWeight: 600,
                                        textTransform: "none",
                                      }}
                                    >
                                      Add Category
                                    </Button>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Stack>
                  </CardContent>
                </Card>

                <Card
                  sx={{
                    borderRadius: 3,
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Typography sx={{ fontWeight: 700, fontSize: "1.125rem", color: "#111827" }}>
                        Category Pricing Rules
                      </Typography>

                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <FormControl fullWidth>
                          <InputLabel>Currency</InputLabel>
                          <Select
                            label="Currency"
                            value={categoryPricingRule.currency}
                            onChange={(e) =>
                              setCategoryPricingRule((prev) => ({
                                ...prev,
                                currency: e.target.value as CategoryPricingRule["currency"],
                              }))
                            }
                          >
                            <MenuItem value="AUD">AUD</MenuItem>
                            <MenuItem value="USD">USD</MenuItem>
                            <MenuItem value="EUR">EUR</MenuItem>
                            <MenuItem value="BRL">BRL</MenuItem>
                          </Select>
                        </FormControl>
                        <FormControlLabel
                          sx={{ m: 0, px: 1 }}
                          control={
                            <Switch
                              checked={categoryPricingRule.enabled}
                              onChange={(_, checked) =>
                                setCategoryPricingRule((prev) => ({
                                  ...prev,
                                  enabled: checked,
                                }))
                              }
                            />
                          }
                          label="Special price for 2+ categories"
                        />
                      </Stack>

                      {categoryPricingRule.enabled ? (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                          <TextField
                            label="Applies when player registers at least"
                            value="2 categories"
                            InputProps={{ readOnly: true }}
                            fullWidth
                          />
                          <TextField
                            label="Price per category"
                            type="number"
                            value={categoryPricingRule.specialPricePerCategory}
                            onChange={(e) =>
                              setCategoryPricingRule((prev) => ({
                                ...prev,
                                specialPricePerCategory: Math.max(
                                  0,
                                  Number(e.target.value || 0),
                                ),
                              }))
                            }
                            fullWidth
                          />
                        </Stack>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>

              </Stack>
            </CardContent>
          </Card>
        ) : (
          <Card
            sx={{
              borderRadius: 3,
              border: "1px solid #E5E7EB",
              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
            }}
          >
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Stack spacing={4}>
                {/* Header */}
                <Box>
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      color: "#6A7282",
                      mb: 2,
                      textTransform: "uppercase",
                      letterSpacing: "0.2px",
                    }}
                  >
                    Tournament Preview
                  </Typography>

                  {/* Tournament Name */}
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 700,
                      fontSize: "2.25rem",
                      color: "#0A0A0A",
                      mb: 2,
                    }}
                  >
                    {form.name || "Untitled Tournament"}
                  </Typography>

                  {/* Chips Row */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      label={form.sport}
                      sx={{
                        bgcolor: "#F3E8FF",
                        color: "#8200DB",
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        border: "none",
                        height: 32,
                        borderRadius: "999px",
                        px: 0.5,
                      }}
                    />
                    <Chip
                      size="small"
                      label={formatTournamentLevelLabel(form.level)}
                      sx={{
                        bgcolor: "#F3F4F6",
                        color: "#364153",
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        border: "none",
                        height: 32,
                        borderRadius: "999px",
                        px: 0.5,
                      }}
                    />
                    <Chip
                      size="small"
                      label={form.tournamentStage}
                      sx={{
                        bgcolor: "#DCFCE7",
                        color: "#008236",
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        border: "none",
                        height: 32,
                        borderRadius: "999px",
                        px: 0.5,
                        textTransform: "uppercase",
                        letterSpacing: "0.2px",
                      }}
                    />
                    <Chip
                      size="small"
                      label={form.isPublic ? "Public" : "Private"}
                      sx={{
                        bgcolor: form.isPublic ? "#DBEAFE" : "#FEF2F2",
                        color: form.isPublic ? "#1447E6" : "#DC2626",
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        border: "none",
                        height: 32,
                        borderRadius: "999px",
                        px: 0.5,
                      }}
                    />
                  </Stack>
                </Box>

                {/* Location */}
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    pb: 2,
                    borderBottom: "1px solid #E5E7EB",
                  }}
                >
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      color: "#9810FA",
                      mt: 0.25,
                    }}
                  >
                    📍
                  </Box>
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 500,
                        fontSize: "1rem",
                        color: "#364153",
                        mb: 0.25,
                      }}
                    >
                      {form.locationName || "Venue not set"}
                    </Typography>
                    <Typography sx={{ fontSize: "0.875rem", color: "#6A7282" }}>
                      {form.address || "Address not set"}
                    </Typography>
                  </Box>
                </Stack>

                {/* Tournament Details Grid */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                    },
                    gap: 3,
                  }}
                >
                  {/* When */}
                  <Stack direction="row" spacing={1.5}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "10px",
                        bgcolor: "#F3E8FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Box sx={{ fontSize: "1.25rem" }}>🗓️</Box>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: "1.125rem",
                          color: "#101828",
                          mb: 0.5,
                        }}
                      >
                        When
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          color: "#364153",
                          wordBreak: "break-word",
                        }}
                      >
                        {whenText}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Registration */}
                  <Stack direction="row" spacing={1.5}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "10px",
                        bgcolor: "#F3E8FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Box sx={{ fontSize: "1.25rem" }}>⏰</Box>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: "1.125rem",
                          color: "#101828",
                          mb: 0.5,
                        }}
                      >
                        Registration
                      </Typography>
                      <Typography
                        sx={{ fontSize: "0.875rem", color: "#6A7282" }}
                      >
                        Deadline: {form.registrationDeadline || "—"}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Capacity */}
                  <Stack direction="row" spacing={1.5}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "10px",
                        bgcolor: "#F3E8FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Box sx={{ fontSize: "1.25rem" }}>👥</Box>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: "1.125rem",
                          color: "#101828",
                          mb: 0.5,
                        }}
                      >
                        Capacity
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          color: "#364153",
                          mb: 0.25,
                        }}
                      >
                        {form.capacity} players
                      </Typography>
                      <Typography
                        sx={{ fontSize: "0.875rem", color: "#6A7282" }}
                      >
                        Waitlist {form.allowWaitlist ? "enabled" : "disabled"}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Category Total */}
                  <Stack direction="row" spacing={1.5}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "10px",
                        bgcolor: "#F3E8FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Box sx={{ fontSize: "1.25rem" }}>💰</Box>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: "1.125rem",
                          color: "#101828",
                          mb: 0.5,
                        }}
                      >
                        Category Base Total
                      </Typography>
                      <Typography
                        sx={{ fontSize: "0.875rem", color: "#364153" }}
                      >
                        {feeText}
                      </Typography>
                      {categoryPricingRule.enabled ? (
                        <Typography
                          sx={{ fontSize: "0.8125rem", color: "#6A7282", mt: 0.25 }}
                        >
                          Special price per category (2+ categories):{" "}
                          {categoryPricingRule.currency}{" "}
                          {categoryPricingRule.specialPricePerCategory}
                        </Typography>
                      ) : null}
                    </Box>
                  </Stack>
                </Box>

                {/* Categories Section */}
                <Box>
                  <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "10px",
                        bgcolor: "#F3E8FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Box sx={{ fontSize: "1.25rem" }}>🏆</Box>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: "1.125rem",
                          color: "#101828",
                          mb: 0.5,
                        }}
                      >
                        Categories
                      </Typography>
                      <Typography
                        sx={{ fontSize: "0.875rem", color: "#364153" }}
                      >
                        {signupCategories.length} signup option
                        {signupCategories.length === 1 ? "" : "s"}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Category Cards Grid */}
                  {signupCategories.length > 0 && (
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, 1fr)",
                        },
                        gap: 2,
                      }}
                    >
                      {signupCategories.map((category, index) => {
                        const getGenderColor = (gender: string) => {
                          if (gender === "Men") {
                            return {
                              bg: "linear-gradient(169.355deg, #FAF5FF 0%, #F3E8FF 100%)",
                              border: "#E9D4FF",
                              textColor: "#59168B",
                              badgeBg: "#9810FA",
                              metaColor: "#8200DB",
                            };
                          } else if (gender === "Women") {
                            return {
                              bg: "linear-gradient(169.355deg, #FDF2F8 0%, #FCE7F3 100%)",
                              border: "#FCCEE8",
                              textColor: "#861043",
                              badgeBg: "#E60076",
                              metaColor: "#C6005C",
                            };
                          } else {
                            return {
                              bg: "linear-gradient(169.355deg, #EFF6FF 0%, #DBEAFE 100%)",
                              border: "#BEDBFF",
                              textColor: "#1C398E",
                              badgeBg: "#155DFC",
                              metaColor: "#1447E6",
                            };
                          }
                        };

                        const colors = getGenderColor(category.gender);

                        return (
                          <Box
                            key={index}
                            sx={{
                              p: 2,
                              borderRadius: "10px",
                              background: colors.bg,
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            <Stack spacing={1}>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                              >
                                <Typography
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: "0.875rem",
                                    color: colors.textColor,
                                  }}
                                >
                                  {category.name}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={category.gender}
                                  sx={{
                                    bgcolor: colors.badgeBg,
                                    color: "#FFFFFF",
                                    fontWeight: 400,
                                    fontSize: "0.75rem",
                                    height: 20,
                                    borderRadius: "999px",
                                    "& .MuiChip-label": {
                                      px: 1,
                                      py: 0.25,
                                    },
                                  }}
                                />
                              </Stack>
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  color: colors.metaColor,
                                }}
                              >
                                {formatCategoryLevelLabel(category.level)} •{" "}
                                {formatCategoryFormatLabel(category.format)} •{" "}
                                {categoryPricingRule.currency}{" "}
                                {Number(category.price || 0)}
                              </Typography>
                            </Stack>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>

                {/* Description */}
                {form.description && (
                  <Box
                    sx={{
                      pt: 3,
                      borderTop: "1px solid #E5E7EB",
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: "1.125rem",
                        color: "#101828",
                        mb: 1,
                      }}
                    >
                      Description
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        color: "#6A7282",
                        fontStyle: form.description ? "normal" : "italic",
                      }}
                    >
                      {form.description ||
                        "Add a short description for players…"}
                    </Typography>
                  </Box>
                )}

                {/* Invite Link Section */}
                <Box
                  sx={{
                    pt: 3,
                    borderTop: "1px solid #E5E7EB",
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "10px",
                        bgcolor: "#F3E8FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Box sx={{ fontSize: "1.25rem" }}>🔗</Box>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: "1.125rem",
                          color: "#101828",
                          mb: 0.5,
                        }}
                      >
                        Invite Link
                      </Typography>
                      <Typography
                        sx={{ fontSize: "0.875rem", color: "#6A7282" }}
                      >
                        {createdTournamentId
                          ? "Create the tournament first, then generate a shareable invite link."
                          : "Create the tournament first, then generate a shareable invite link."}
                      </Typography>
                    </Box>
                  </Stack>

                  <Button
                    variant="outlined"
                    onClick={handleGenerateInviteLink}
                    disabled={!createdTournamentId}
                    sx={{
                      borderRadius: "10px",
                      border: "1px solid #9810FA",
                      color: "#9810FA",
                      fontWeight: 500,
                      px: 3,
                      py: 1.25,
                      textTransform: "none",
                      mb: 2,
                      "&:hover": {
                        border: "1px solid #8200DB",
                        bgcolor: "#FAF5FF",
                      },
                      "&:disabled": {
                        border: "1px solid #D1D5DC",
                        color: "#9CA3AF",
                      },
                    }}
                  >
                    Generate Invite Link
                  </Button>

                  {inviteLink && (
                    <Stack spacing={2}>
                      <TextField
                        value={inviteLink}
                        size="small"
                        fullWidth
                        InputProps={{
                          readOnly: true,
                          sx: {
                            borderRadius: "10px",
                            bgcolor: "#F9FAFB",
                            fontFamily: "monospace",
                            fontSize: "0.875rem",
                          },
                        }}
                      />
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                      >
                        <Button
                          variant="contained"
                          onClick={handleCopyInviteLink}
                          sx={{
                            borderRadius: "10px",
                            background: "#9810FA",
                            fontWeight: 500,
                            px: 3,
                            py: 1.25,
                            textTransform: "none",
                            flex: 1,
                            "&:hover": {
                              background: "#8200DB",
                            },
                          }}
                        >
                          Copy Link
                        </Button>
                        {canUseNativeShare && (
                          <Button
                            variant="outlined"
                            onClick={handleShareInviteLink}
                            sx={{
                              borderRadius: "10px",
                              border: "1px solid #D1D5DC",
                              color: "#364153",
                              fontWeight: 500,
                              px: 3,
                              py: 1.25,
                              textTransform: "none",
                              flex: 1,
                              "&:hover": {
                                border: "1px solid #D1D5DC",
                                bgcolor: "#F9FAFB",
                              },
                            }}
                          >
                            Share
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        <Dialog
          open={isCategoryModalOpen}
          onClose={cancelEditCategory}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {editingCategoryId ? "Edit Category" : "New Category"}
          </DialogTitle>
          <DialogContent dividers>
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
                        level: e.target
                          .value as TournamentCategoryForm["level"],
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
                        gender: e.target
                          .value as TournamentCategoryForm["gender"],
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
                    {(["Men", "Women"] as const).map((gender) => (
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
                  <MenuItem value="MIXED">Mixed</MenuItem>
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
                    Formats
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    {(["SINGLES", "DOUBLES", "MIXED"] as const).map((format) => (
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
                    Choose one or more formats to create multiple categories at
                    once.
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
              onClick={cancelEditCategory}
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
              onClick={addCategory}
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
                      ? `${
                          draftFormats.length *
                          draftGenders.length
                        } Categories`
                      : "Category"
                  }`}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
