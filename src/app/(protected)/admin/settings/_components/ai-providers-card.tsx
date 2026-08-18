"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AI_PROVIDER_PRESETS,
  DEFAULT_PROVIDER_ID,
  getProviderPreset,
} from "@/lib/ai/providers";
import { useAdminAiProviders } from "@/services/admin/settings";
import { SettingsSectionCard } from "./settings-section-card";
import { AiProviderForm } from "./ai-provider-form";

export function AiProvidersCard() {
  const query = useAdminAiProviders();
  const data = query.data;
  const savedProviders = data?.providers ?? [];
  const activeProviderId = data?.active_provider_id ?? null;

  const options = useMemo(() => {
    const list = AI_PROVIDER_PRESETS.map((p) => ({
      id: p.id,
      label: p.label,
    }));
    const knownIds = new Set(list.map((o) => o.id));
    for (const saved of savedProviders) {
      if (!knownIds.has(saved.id)) {
        list.push({ id: saved.id, label: saved.label });
        knownIds.add(saved.id);
      }
    }
    return list;
  }, [savedProviders]);

  const [selectedId, setSelectedId] = useState<string>(() => {
    if (activeProviderId) return activeProviderId;
    if (savedProviders[0]) return savedProviders[0].id;
    return DEFAULT_PROVIDER_ID;
  });

  const isInitialLoading = query.isLoading && query.fetchStatus !== "idle";
  const saved = savedProviders.find((p) => p.id === selectedId);
  const preset = getProviderPreset(selectedId);
  const isActive = selectedId === activeProviderId;

  return (
    <SettingsSectionCard
      title="AI provider"
      description="The live provider powers chatbot, onboarding and autofill across the platform. Switch anytime — no rebuild."
    >
      {isInitialLoading ? (
        <div className="max-w-xl space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-9 w-24" />
        </div>
      ) : (
        <div className="max-w-xl space-y-5">
          {query.isError ? (
            <p
              className="rounded-md border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-900"
              role="status"
            >
              Saved AI settings could not be loaded yet. You can still fill this
              in; save will work once the API is available.
            </p>
          ) : null}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">Provider</Label>
              {isActive ? (
                <Badge variant="primary">Live</Badge>
              ) : saved?.is_configured ? (
                <Badge variant="outline">Saved</Badge>
              ) : (
                <Badge variant="outline">Not set up</Badge>
              )}
            </div>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                    {o.id === activeProviderId ? " · live" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AiProviderForm
            key={selectedId}
            preset={preset}
            saved={saved}
            isActiveProvider={isActive}
          />
        </div>
      )}
    </SettingsSectionCard>
  );
}
