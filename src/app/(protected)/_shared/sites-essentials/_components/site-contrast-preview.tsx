"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { SiteEssentialsFormValues } from "../_lib/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, XCircle, Eye } from "lucide-react";
import {
  contrastBand,
  contrastRatio,
  extractHexStops,
  getAnchorColor,
  minContrastOnBackground,
  pickReadableForeground,
  relativeLuminance,
  type ContrastBand,
} from "@/lib/color-contrast";

type FixKey =
  | "textSurface"
  | "textBackground"
  | "header"
  | "footer"
  | "primary"
  | "secondary"
  | "textDimmedSurface";

function avgBackgroundLuminance(background: string): number {
  const stops = extractHexStops(background);
  if (stops.length === 0) {
    return relativeLuminance(getAnchorColor(background));
  }
  return (
    stops.reduce((sum, stop) => sum + relativeLuminance(stop), 0) / stops.length
  );
}

/** Plain-language fix line for failed or borderline checks. */
function getFixSuggestion(
  band: ContrastBand,
  fixKey: FixKey,
  foreground: string,
  background: string,
): string | null {
  if (band === "pass") return null;

  const prefix = band === "fail" ? "Fix" : "Tip";
  const isGradient =
    background.includes("linear-gradient") || background.includes("gradient");

  if (fixKey === "textBackground" && isGradient) {
    return `${prefix}: Gradients can look fine in one area and weak in another. Soften the Background gradient, or adjust Text so it stays clear on every part of the page.`;
  }

  if (fixKey === "header") {
    return `${prefix}: Menu text is chosen automatically. Change Header until the bar feels crisp—often a slightly darker or lighter Header fixes it.`;
  }

  if (fixKey === "footer") {
    return `${prefix}: Footer text is chosen automatically. Adjust Footer for clearer separation—try a step darker or lighter (about 10–20% in the picker).`;
  }

  if (fixKey === "primary") {
    return `${prefix}: Button label color is automatic. Nudge Primary so the label pops—more saturated or further from the label tone usually helps.`;
  }

  if (fixKey === "secondary") {
    return `${prefix}: Same for Secondary—small moves (about 10–20%) toward stronger contrast with the label usually fix this.`;
  }

  const fgL = relativeLuminance(getAnchorColor(foreground));
  const bgL = avgBackgroundLuminance(background);
  const fgIsDarker = fgL < bgL;

  const labels: Record<FixKey, { fg: string; bg: string }> = {
    textSurface: { fg: "Text", bg: "Surface" },
    textBackground: { fg: "Text", bg: "Background" },
    header: { fg: "menu text", bg: "Header" },
    footer: { fg: "footer text", bg: "Footer" },
    primary: { fg: "label", bg: "Primary" },
    secondary: { fg: "label", bg: "Secondary" },
    textDimmedSurface: { fg: "Text dimmed", bg: "Surface" },
  };

  const { fg, bg } = labels[fixKey];

  if (fgIsDarker) {
    return `${prefix}: ${fg} and ${bg} are too close in brightness. Darken ${fg} a little or lighten ${bg} (small steps, about 10–20% in the picker).`;
  }
  return `${prefix}: ${fg} and ${bg} are too close in brightness. Lighten ${fg} a little or darken ${bg} (small steps, about 10–20% in the picker).`;
}

function ensureColor(color: string | undefined): string {
  return color?.trim() || "#FFFFFF";
}

function MiniReadabilityPreview({
  background,
  foreground,
}: {
  background: string;
  foreground: string;
}) {
  const isGradient =
    background.includes("linear-gradient") || background.includes("gradient");
  return (
    <div
      className="flex h-11 w-20 shrink-0 items-center justify-center rounded-md border border-slate-200 text-sm font-semibold shadow-inner"
      style={
        isGradient
          ? { background, color: foreground }
          : { backgroundColor: background, color: foreground }
      }
      aria-hidden
    >
      Aa
    </div>
  );
}

function statusCopy(band: ReturnType<typeof contrastBand>): {
  label: string;
  Icon: typeof CheckCircle2;
  className: string;
} {
  if (band === "pass") {
    return {
      label: "Pass",
      Icon: CheckCircle2,
      className: "text-emerald-700",
    };
  }
  if (band === "large-only") {
    return {
      label: "Borderline",
      Icon: AlertTriangle,
      className: "text-amber-700",
    };
  }
  return {
    label: "Fail",
    Icon: XCircle,
    className: "text-red-700",
  };
}

function ReadabilityRow({
  title,
  hint,
  foreground,
  background,
  ratio,
  fixLine,
}: {
  title: string;
  hint: string;
  foreground: string;
  background: string;
  ratio: number;
  fixLine: string | null;
}) {
  const band = contrastBand(ratio);
  const { label, Icon, className } = statusCopy(band);
  const rounded = Math.round(ratio * 100) / 100;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 gap-3">
        <MiniReadabilityPreview background={background} foreground={foreground} />
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{hint}</p>
          {fixLine && (
            <p
              className={`mt-1.5 text-xs leading-snug ${
                band === "fail"
                  ? "text-red-800"
                  : band === "large-only"
                    ? "text-amber-900"
                    : "text-slate-600"
              }`}
            >
              {fixLine}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 sm:pl-2">
        <span className={`flex items-center gap-1.5 text-sm font-semibold ${className}`}>
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          {label}
        </span>
        <span className="text-[11px] text-slate-400" title="Technical contrast score">
          Score {rounded}:1
        </span>
      </div>
    </div>
  );
}

interface SiteContrastPreviewProps {
  compact?: boolean;
}

export function SiteContrastPreview({ compact = false }: SiteContrastPreviewProps) {
  const form = useFormContext<SiteEssentialsFormValues>();
  const text = useWatch({ control: form.control, name: "colors.text" });
  const textDimmed = useWatch({ control: form.control, name: "colors.textDimmed" });
  const surface = useWatch({ control: form.control, name: "colors.surface" });
  const background = useWatch({
    control: form.control,
    name: "colors.background",
  });
  const header = useWatch({ control: form.control, name: "colors.header" });
  const footer = useWatch({ control: form.control, name: "colors.footer" });
  const primary = useWatch({ control: form.control, name: "colors.primary" });
  const secondary = useWatch({ control: form.control, name: "colors.secondary" });

  const t = ensureColor(text);
  const td = ensureColor(textDimmed);
  const s = ensureColor(surface);
  const bg = ensureColor(background);
  const h = ensureColor(header);
  const f = ensureColor(footer);
  const p = ensureColor(primary);
  const sec = ensureColor(secondary);

  const onHeader = pickReadableForeground(h);
  const onFooter = pickReadableForeground(f);
  const onPrimary = pickReadableForeground(p);
  const onSecondary = pickReadableForeground(sec);

  const checks: {
    title: string;
    hint: string;
    foreground: string;
    background: string;
    ratio: number;
    fixKey: FixKey;
  }[] = [
    {
      title: "Writing on cards & panels",
      hint: "Main text on card blocks.",
      foreground: t,
      background: s,
      ratio: contrastRatio(t, s),
      fixKey: "textSurface",
    },
    {
      title: "Writing on page background",
      hint: "Main text on full page background (includes gradients).",
      foreground: t,
      background: bg,
      ratio: minContrastOnBackground(t, bg),
      fixKey: "textBackground",
    },
    {
      title: "Top menu bar text",
      hint: "Auto-picked header text color vs header.",
      foreground: onHeader,
      background: h,
      ratio: minContrastOnBackground(onHeader, h),
      fixKey: "header",
    },
    {
      title: "Footer text",
      hint: "Auto-picked footer text color vs footer.",
      foreground: onFooter,
      background: f,
      ratio: minContrastOnBackground(onFooter, f),
      fixKey: "footer",
    },
    {
      title: "Primary button",
      hint: "Button label color vs primary button color.",
      foreground: onPrimary,
      background: p,
      ratio: contrastRatio(onPrimary, p),
      fixKey: "primary",
    },
    {
      title: "Secondary button",
      hint: "Button label color vs secondary button color.",
      foreground: onSecondary,
      background: sec,
      ratio: contrastRatio(onSecondary, sec),
      fixKey: "secondary",
    },
    {
      title: "Small helper text",
      hint: "Dimmed text on cards (often hardest to read).",
      foreground: td,
      background: s,
      ratio: contrastRatio(td, s),
      fixKey: "textDimmedSurface",
    },
  ];

  const bands = checks.map((check) => contrastBand(check.ratio));
  const anyFail = bands.some((b) => b === "fail");
  const anyWarn = bands.some((b) => b === "large-only");
  const allPass = bands.every((b) => b === "pass");

  const failedChecks = checks
    .map((check) => ({
      ...check,
      band: contrastBand(check.ratio),
    }))
    .filter((check) => check.band !== "pass");

  if (compact) {
    return (
      <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">
            Readability check
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`rounded-md px-2 py-1 font-medium ${
                allPass
                  ? "bg-emerald-100 text-emerald-800"
                  : anyFail
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-800"
              }`}
            >
              {allPass ? "All pass" : anyFail ? "Needs fixes" : "Borderline"}
            </span>
            <span className="text-slate-500">
              {checks.length - failedChecks.length}/{checks.length} pass
            </span>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {checks.map((check) => {
            const band = contrastBand(check.ratio);
            return (
              <div
                key={check.title}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs"
              >
                <span className="truncate pr-2 text-slate-700">{check.title}</span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 font-medium ${
                    band === "pass"
                      ? "bg-emerald-100 text-emerald-800"
                      : band === "large-only"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {band === "pass" ? "Pass" : band === "large-only" ? "Tip" : "Fix"}
                </span>
              </div>
            );
          })}
        </div>

        {failedChecks.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {failedChecks.slice(0, 3).map((check) => (
              <p key={check.title} className="text-xs text-slate-700">
                <span className="font-medium">{check.title}:</span>{" "}
                {getFixSuggestion(
                  check.band,
                  check.fixKey,
                  check.foreground,
                  check.background,
                )}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="border-2 border-slate-200 shadow-md ring-1 ring-slate-100">
      <CardHeader className="border-b bg-gradient-to-br from-slate-50 to-white pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <Eye className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
                Readability confidence check
              </CardTitle>
              <CardDescription className="mt-1 text-base text-slate-600">
                This now checks key real UI areas: cards, page background, header,
                footer, buttons, and dimmed small text. We avoid saying all good
                unless every check passes.
              </CardDescription>
            </div>
          </div>
        </div>

        {allPass && (
          <div className="mt-4 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              <span className="font-semibold">All checks passed.</span> This is a
              strong signal your chosen colors are readable in important areas.
            </p>
          </div>
        )}
        {!allPass && anyFail && (
          <div className="mt-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              <span className="font-semibold">
                Some checks failed.
              </span>{" "}
              At least one area can be hard to read. Adjust colors before saving to
              avoid poor vendor experience.
            </p>
          </div>
        )}
        {!allPass && !anyFail && anyWarn && (
          <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              <span className="font-semibold">Partially passed.</span> Some areas
              are borderline, especially for smaller text. Consider stronger
              contrast before saving.
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        {checks.map((check) => {
          const band = contrastBand(check.ratio);
          const fixLine =
            band === "pass"
              ? null
              : getFixSuggestion(
                  band,
                  check.fixKey,
                  check.foreground,
                  check.background,
                );
          return (
            <ReadabilityRow
              key={check.title}
              title={check.title}
              hint={check.hint}
              foreground={check.foreground}
              background={check.background}
              ratio={check.ratio}
              fixLine={fixLine}
            />
          );
        })}
        <p className="text-center text-[11px] text-slate-400">
          Score is technical contrast ratio. Target 4.5+ for normal text; 3.0-4.49
          is borderline and can still feel weak.
        </p>
      </CardContent>
    </Card>
  );
}
