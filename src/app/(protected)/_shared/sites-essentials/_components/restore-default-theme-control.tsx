"use client";

import { useState } from "react";
import { Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  useResetSiteEssentialsThemeMutation,
  useThemePresetsCatalogQuery,
} from "../_lib/queries";
import {
  mergeSiteEssentialsDefaultTheme,
  resolveCatalogDefaultPresetId,
} from "../_lib/default-site-theme";
import { writeLastAppliedSiteThemePresetId } from "../_lib/site-theme-preset-local-cache";
import { toMutableSiteEssentialsFormValues } from "../_lib/to-mutable-form-values";
import type { SiteEssentialsFormValues } from "../_lib/schema";

type RestoreDefaultThemeControlProps = {
  /** Stable per-account key for the "last applied preset" highlight. */
  presetCacheUserKey: string;
  readOnly?: boolean;
  /** Current site values (preview store / form snapshot). */
  getValues: () => SiteEssentialsFormValues;
  /** Apply restored values into the host (preview store or form). */
  onApplied: (next: SiteEssentialsFormValues) => void;
};

export function RestoreDefaultThemeControl({
  presetCacheUserKey,
  readOnly = false,
  getValues,
  onApplied,
}: RestoreDefaultThemeControlProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: themeCatalog } = useThemePresetsCatalogQuery();
  const {
    mutateAsync: resetThemeToDefault,
    isPending: isResetting,
  } = useResetSiteEssentialsThemeMutation();

  const handleConfirm = async () => {
    const catalogDefaultId = resolveCatalogDefaultPresetId(themeCatalog);
    try {
      const updated = await resetThemeToDefault();
      onApplied(toMutableSiteEssentialsFormValues(updated));
      writeLastAppliedSiteThemePresetId(
        presetCacheUserKey,
        updated.theme_preset_id ?? catalogDefaultId,
      );
      setDialogOpen(false);
      toast.success("Default theme restored", {
        description: "Colors and fonts were reset to EventWizz defaults. Your logo, copy, and images are unchanged.",
      });
    } catch {
      onApplied(mergeSiteEssentialsDefaultTheme(getValues(), themeCatalog));
      writeLastAppliedSiteThemePresetId(presetCacheUserKey, catalogDefaultId);
      setDialogOpen(false);
      toast("Default theme applied locally", {
        description: "The reset API is not available yet — changes are in the preview only. Save from this page after the backend ships POST …/reset-theme-default.",
      });
    }
  };

  return (
    <>
      {/* Compact sidebar footer — one button + one-line hint (no tall dashed card). */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          disabled={readOnly || isResetting}
          className="w-full border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
        >
          {isResetting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Palette className="mr-2 h-4 w-4" />
          )}
          {isResetting ? "Restoring…" : "Restore default theme"}
        </Button>
        <p className="text-[10px] leading-snug text-slate-500">
          Resets colors & fonts only — logo, copy, and images stay unchanged.
        </p>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="z-[220] text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore default theme?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  This will replace your current{" "}
                  <span className="font-medium text-foreground">
                    colors, fonts, and heading style
                  </span>{" "}
                  with the EventWizz default theme (Gallery Neutral).
                </p>
                <p>
                  Your logo, page copy, images, social links, and SEO settings
                  will{" "}
                  <span className="font-medium text-foreground">not</span> be
                  changed.
                </p>
                <p className="font-medium text-amber-700">
                  This saves immediately on the server when the reset API is
                  available. Otherwise it updates this preview until you Save.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-3 sm:space-x-0">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirm()}
              disabled={isResetting}
              className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
            >
              {isResetting ? "Restoring…" : "Yes, restore default theme"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
