"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  CUSTOM_PROVIDER_ID,
  type AiProviderPreset,
} from "@/lib/ai/providers";
import {
  useActivateAiProvider,
  useAdminAiModels,
  useUpsertAiProvider,
  type AdminAiProvider,
} from "@/services/admin/settings";
import { usePastedKeyModels } from "./use-pasted-key-models";

type ModelRow = { id: string; label: string; enabled: boolean };

interface AiProviderFormProps {
  preset?: AiProviderPreset;
  saved?: AdminAiProvider;
  isActiveProvider: boolean;
}

function isValidBaseUrl(raw: string): boolean {
  const value = raw.trim();
  if (value === "") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function modelLabel(preset: AiProviderPreset | undefined, id: string): string {
  return preset?.suggestedModels.find((m) => m.id === id)?.label ?? id;
}

export function AiProviderForm({
  preset,
  saved,
  isActiveProvider,
}: AiProviderFormProps) {
  const upsert = useUpsertAiProvider();
  const activate = useActivateAiProvider();

  const providerId = saved?.id ?? preset?.id ?? "";
  const isCustom = providerId === CUSTOM_PROVIDER_ID;
  const providerType =
    saved?.provider_type ?? preset?.providerType ?? "openai_compatible";
  const isConfigured = saved?.is_configured === true;

  const [label, setLabel] = useState(saved?.label ?? preset?.label ?? "");
  const [baseUrl, setBaseUrl] = useState(
    saved?.base_url ?? preset?.baseUrl ?? "",
  );
  const [apiKey, setApiKey] = useState("");
  const [isActive, setIsActive] = useState(
    isActiveProvider || (!saved && Boolean(preset)),
  );
  const [showAdvanced, setShowAdvanced] = useState(isCustom);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [newModel, setNewModel] = useState("");

  const initialRows = useMemo<ModelRow[]>(() => {
    const rows: ModelRow[] = [];
    const seen = new Set<string>();
    for (const id of saved?.models ?? []) {
      if (seen.has(id)) continue;
      rows.push({ id, label: modelLabel(preset, id), enabled: true });
      seen.add(id);
    }
    return rows;
  }, [saved, preset]);

  const [rows, setRows] = useState<ModelRow[]>(initialRows);
  const enabledModels = rows.filter((r) => r.enabled).map((r) => r.id);

  const [defaultModel, setDefaultModel] = useState(
    saved?.default_model ?? saved?.models?.[0] ?? "",
  );

  const pastedModels = usePastedKeyModels({
    providerType,
    baseUrl,
    apiKey,
  });
  const storedModels = useAdminAiModels(
    providerId,
    isConfigured && apiKey.trim().length < 16,
  );
  const liveModels = pastedModels.models ?? storedModels.data ?? null;
  const liveLoading = pastedModels.isLoading || storedModels.isFetching;
  const liveSource = pastedModels.models
    ? "provider"
    : storedModels.data
      ? "saved"
      : null;

  useEffect(() => {
    if (!liveModels?.length) return;
    setRows(
      liveModels.map((m) => ({
        id: m.id,
        label: m.label,
        enabled: true,
      })),
    );
    setDefaultModel((current) =>
      liveModels.some((m) => m.id === current)
        ? current
        : (liveModels[0]?.id ?? ""),
    );
  }, [liveModels]);

  const touch = () => {
    upsert.reset();
    setAttemptedSave(false);
  };

  const toggleModel = (id: string) => {
    setRows((prev) => {
      const next = prev.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r,
      );
      const stillOn = next.filter((r) => r.enabled).map((r) => r.id);
      if (!stillOn.includes(defaultModel)) {
        setDefaultModel(stillOn[0] ?? "");
      }
      return next;
    });
    touch();
  };

  const addModel = () => {
    const id = newModel.trim();
    if (id === "") return;
    setRows((prev) =>
      prev.some((r) => r.id === id)
        ? prev.map((r) => (r.id === id ? { ...r, enabled: true } : r))
        : [...prev, { id, label: id, enabled: true }],
    );
    if (enabledModels.length === 0) setDefaultModel(id);
    setNewModel("");
    touch();
  };

  const removeModel = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (defaultModel === id) {
        setDefaultModel(next.find((r) => r.enabled)?.id ?? "");
      }
      return next;
    });
    touch();
  };

  const validation = (() => {
    if (label.trim() === "") return "Give this provider a name.";
    if (!isValidBaseUrl(baseUrl)) return "Enter a valid API URL.";
    if (enabledModels.length === 0) return "Choose at least one model.";
    if (!isConfigured && apiKey.trim() === "") {
      return "Paste an API key to save this provider.";
    }
    return null;
  })();

  const mutationMessage =
    upsert.isError && upsert.error instanceof Error
      ? upsert.error.message
      : null;
  const errorMessage = attemptedSave
    ? (validation ?? mutationMessage)
    : mutationMessage;

  const handleSave = () => {
    setAttemptedSave(true);
    if (validation) return;
    const resolvedDefault =
      defaultModel && enabledModels.includes(defaultModel)
        ? defaultModel
        : enabledModels[0];
    upsert.mutate(
      {
        id: providerId,
        label: label.trim(),
        provider_type: providerType,
        base_url: baseUrl.trim(),
        api_key: apiKey.trim() || undefined,
        models: enabledModels,
        default_model: resolvedDefault,
        is_active: isActive,
      },
      { onSuccess: () => setApiKey("") },
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="ai-provider-key" className="text-sm font-medium">
            API key
          </Label>
          {preset?.consoleUrl ? (
            <a
              href={preset.consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline"
            >
              Get a key <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
        <PasswordInput
          id="ai-provider-key"
          name="ai_provider_key"
          autoComplete="new-password"
          spellCheck={false}
          ariaPasswordField="API key"
          placeholder={
            isConfigured ? "Paste a new key to replace it" : "Paste API key"
          }
          className="h-10 font-mono text-sm"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            touch();
          }}
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {isConfigured
            ? `A key is already saved${saved?.masked_key ? ` (${saved.masked_key})` : ""}. Leave blank to keep it.`
            : preset?.keyPrefixHint
              ? `Usually ${preset.keyPrefixHint}. Stored securely — never shown again.`
              : "Stored securely on the server — never shown again."}
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Default model</Label>
          {liveLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        <Select
          value={defaultModel || undefined}
          onValueChange={(v) => {
            setDefaultModel(v);
            setRows((prev) =>
              prev.map((r) => (r.id === v ? { ...r, enabled: true } : r)),
            );
            touch();
          }}
          disabled={liveLoading || enabledModels.length === 0}
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue
              placeholder={
                liveLoading
                  ? "Loading latest models…"
                  : apiKey.trim().length < 16 && !isConfigured
                    ? "Paste an API key to load models"
                    : "Select a model"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {rows.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p
          className={cn(
            "text-xs leading-relaxed",
            pastedModels.error
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {pastedModels.error
            ? pastedModels.error
            : liveLoading
              ? "Fetching the latest models from this provider…"
              : liveSource
                ? `${rows.length} models loaded from the provider.`
                : "Paste a valid API key — the dropdown will fill with that provider’s current models."}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
        <div className="min-w-0">
          <Label
            htmlFor="ai-provider-active"
            className="text-sm font-medium text-foreground"
          >
            Use as the live AI
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Chatbot, onboarding and autofill will use this provider.
          </p>
        </div>
        <Switch
          id="ai-provider-active"
          checked={isActive}
          onCheckedChange={(v) => {
            setIsActive(v);
            touch();
          }}
        />
      </div>

      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md py-1 text-left text-sm font-medium text-slate-600 hover:text-foreground"
          >
            Advanced
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                showAdvanced && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ai-provider-label" className="text-xs font-medium">
                Display name
              </Label>
              <Input
                id="ai-provider-label"
                className="h-9"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  touch();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="ai-provider-base-url"
                className="text-xs font-medium"
              >
                Base URL
              </Label>
              <Input
                id="ai-provider-base-url"
                className="h-9 font-mono text-xs"
                placeholder="https://api.provider.com/v1"
                value={baseUrl}
                readOnly={!isCustom && Boolean(preset?.baseUrl)}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  touch();
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Fallback models</Label>
            <p className="text-xs text-muted-foreground">
              Turn extra models on so the platform can retry if the default is
              busy.
            </p>
            <div className="overflow-hidden rounded-md border border-slate-200">
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2",
                    index > 0 && "border-t border-slate-100",
                    row.enabled ? "bg-white" : "bg-slate-50/80",
                  )}
                >
                  <Switch
                    checked={row.enabled}
                    onCheckedChange={() => toggleModel(row.id)}
                    aria-label={`Enable ${row.label}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{row.label}</p>
                    {row.label !== row.id ? (
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {row.id}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeModel(row.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label={`Remove ${row.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {rows.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-muted-foreground">
                  No models yet. Add one below.
                </p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Input
                className="h-9 font-mono text-xs"
                placeholder="Add model id"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addModel();
                  }
                }}
              />
              <Button
                type="button"
                variant="event-outline"
                size="sm"
                className="h-9 shrink-0"
                onClick={addModel}
                disabled={newModel.trim() === ""}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {errorMessage ? (
        <p
          className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <Button
          type="button"
          variant="event-primary"
          size="sm"
          className="h-9 min-w-[7rem]"
          disabled={upsert.isPending}
          onClick={handleSave}
        >
          {upsert.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving
            </>
          ) : (
            "Save"
          )}
        </Button>
        {saved && !isActiveProvider ? (
          <Button
            type="button"
            variant="event-outline"
            size="sm"
            className="h-9"
            disabled={activate.isPending || !isConfigured}
            onClick={() => activate.mutate(providerId)}
          >
            {activate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Switching
              </>
            ) : (
              "Make live"
            )}
          </Button>
        ) : null}
        {isActiveProvider ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" /> Live
          </span>
        ) : null}
      </div>
    </div>
  );
}
