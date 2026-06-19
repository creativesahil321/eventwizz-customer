import { getKindStyles, type LineItemKind } from "./item-kinds";

interface KindIconChipProps {
  kind: LineItemKind;
  size?: "md" | "sm";
}

/** Lovable squircle icon chip — utensils, ticket, sparkles, wine */
export function KindIconChip({ kind, size = "md" }: KindIconChipProps) {
  const kindStyles = getKindStyles(kind);
  const Icon = kindStyles.icon;
  const compact = size === "sm";

  return (
    <div className={compact ? kindStyles.chipSmClassName : kindStyles.chipClassName}>
      <Icon
        className={compact ? kindStyles.iconSmClassName : kindStyles.iconClassName}
        strokeWidth={kindStyles.iconStrokeWidth}
      />
    </div>
  );
}
