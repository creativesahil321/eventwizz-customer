"use client";

import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteEssentialsFormValues } from "../_lib/schema";
import { ImportWebsiteModal } from "./import-website-modal";

interface PreviewImportWebsiteControlProps {
  /** Current live preview values (store-driven) to import on top of. */
  values: SiteEssentialsFormValues;
  /**
   * Push the full post-apply snapshot into the preview page so headings,
   * images, colours and fonts update in the live canvas immediately.
   */
  onValuesChange: (next: SiteEssentialsFormValues) => void;
  /** City/name of the location currently selected in the preview bar. */
  locationLabel?: string | null;
  disabled?: boolean;
}

/**
 * Bridges the react-hook-form–based {@link ImportWebsiteModal} into the
 * store-driven `/preview/site` theme customizer.
 *
 * The preview page has no `FormProvider`, so we spin up a lightweight local
 * form seeded from the live preview values, let the modal apply into it, then
 * push `form.getValues()` back through `onValuesChange` once Apply succeeds.
 * That single snapshot keeps File media + text fields intact for both live
 * rendering and Approve & save.
 */
export function PreviewImportWebsiteControl({
  values,
  onValuesChange,
  locationLabel,
  disabled,
}: PreviewImportWebsiteControlProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<SiteEssentialsFormValues>({ defaultValues: values });

  // Re-seed from the latest preview values each time the modal opens so the
  // import composes on top of any colours/fonts already tried in this session.
  useEffect(() => {
    if (open) {
      form.reset(values);
    }
    // Intentionally keyed on `open` only — re-seeding on every `values` change
    // would fight the modal's own edits while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full border-slate-300 !bg-white !font-medium !text-slate-900 shadow-sm hover:!bg-slate-100 hover:!text-slate-900"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Globe className="mr-2 h-4 w-4 shrink-0" />
        Import from website
      </Button>
      <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
        {locationLabel?.trim()
          ? `Applies to ${locationLabel.trim()} — content, images, colours & fonts show in this preview straight away.`
          : "Apply content, images, colours & fonts — they appear in this preview straight away."}
      </p>
      <FormProvider {...form}>
        <ImportWebsiteModal
          open={open}
          onOpenChange={setOpen}
          onApplied={onValuesChange}
          locationLabel={locationLabel}
        />
      </FormProvider>
    </>
  );
}
