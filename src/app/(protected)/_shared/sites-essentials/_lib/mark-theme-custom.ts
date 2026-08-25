import type { UseFormReturn } from "react-hook-form";
import type { SiteEssentialsFormValues } from "./schema";

type ThemeCustomForm = Pick<
  UseFormReturn<SiteEssentialsFormValues>,
  "getValues" | "setValue"
>;

/** Color/font edits are a custom theme — PATCH must send `theme_preset_id: null`. */
export function markSiteEssentialsThemeCustom(form: ThemeCustomForm): void {
  if (form.getValues("theme_preset_id") == null) return;
  form.setValue("theme_preset_id", null, { shouldDirty: true });
}

export function withThemeCustomChange<T>(
  form: ThemeCustomForm,
  onChange: (value: T) => void,
): (value: T) => void {
  return (value: T) => {
    markSiteEssentialsThemeCustom(form);
    onChange(value);
  };
}
