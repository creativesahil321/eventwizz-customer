"use client";

import { useState } from "react";
import { Loader2, Palette } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
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
import { useToast } from "@/components/ui/use-toast";
import { useResetSiteEssentialsThemeMutation } from "../_lib/queries";
import {
  applySiteEssentialsDefaultTheme,
  SITE_ESSENTIALS_DEFAULT_PRESET_ID,
} from "../_lib/default-site-theme";
import { writeLastAppliedSiteThemePresetId } from "../_lib/site-theme-preset-local-cache";
import { toMutableSiteEssentialsFormValues } from "../_lib/to-mutable-form-values";
import type { SiteEssentialsFormValues } from "../_lib/schema";

type RestoreDefaultThemeControlProps = {
  form: UseFormReturn<SiteEssentialsFormValues>;
  presetCacheUserKey: string;
  readOnly?: boolean;
};

export function RestoreDefaultThemeControl({
  form,
  presetCacheUserKey,
  readOnly = false,
}: RestoreDefaultThemeControlProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    mutateAsync: resetThemeToDefault,
    isPending: isResetting,
  } = useResetSiteEssentialsThemeMutation();

  const handleConfirm = async () => {
    try {
      const updated = await resetThemeToDefault();
      form.reset(toMutableSiteEssentialsFormValues(updated), {
        keepErrors: false,
        keepDirty: false,
        keepIsSubmitted: false,
        keepTouched: false,
        keepIsValid: false,
        keepSubmitCount: false,
      });
      writeLastAppliedSiteThemePresetId(
        presetCacheUserKey,
        SITE_ESSENTIALS_DEFAULT_PRESET_ID,
      );
      setDialogOpen(false);
      toast({
        title: "Default theme restored",
        description:
          "Colors and fonts were reset to EventWizz defaults. Your logo, copy, and images are unchanged.",
      });
    } catch {
      applySiteEssentialsDefaultTheme(form.setValue, form.getValues);
      writeLastAppliedSiteThemePresetId(
        presetCacheUserKey,
        SITE_ESSENTIALS_DEFAULT_PRESET_ID,
      );
      setDialogOpen(false);
      toast({
        title: "Default theme applied locally",
        description:
          "The reset API is not available yet — changes are in the form only. Click Save after the backend ships POST …/reset-theme-default.",
      });
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Restore EventWizz default theme
          </p>
          <p className="text-xs text-muted-foreground">
            Resets colors, fonts, and heading style to the platform default.
            Logo, copy, images, and SEO stay unchanged.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          disabled={readOnly || isResetting}
          className="shrink-0 border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
        >
          {isResetting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Palette className="mr-2 h-4 w-4" />
          )}
          {isResetting ? "Restoring…" : "Restore default theme"}
        </Button>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore default theme?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  This will replace your current{" "}
                  <span className="font-medium text-foreground">
                    colors, fonts, and heading style
                  </span>{" "}
                  with the EventWizz default theme (Clean White).
                </p>
                <p>
                  Your logo, page copy, images, social links, and SEO settings
                  will{" "}
                  <span className="font-medium text-foreground">not</span> be
                  changed.
                </p>
                <p className="font-medium text-amber-700">
                  This saves immediately on the server. Your live site will use
                  the default theme after the reset completes.
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
