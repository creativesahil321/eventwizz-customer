/**
 * Date Card Row Component
 * Row of date cards for event booking
 */

import { DateCard } from "./DateCard";
import { DatesSectionType } from ".";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
import { cn } from "@/lib/utils";

interface DateCardRowProps {
  dates: DatesSectionType;
  startIndex: number;
  itemsPerRow: number;
  onDateClick: (dateItem: DatesSectionType[0]) => void;
  isFirstRow?: boolean;
}

export const DateCardRow = ({
  dates,
  startIndex,
  itemsPerRow,
  onDateClick,
  isFirstRow = false,
}: DateCardRowProps) => {
  const narrowPreview = usePreviewNarrowLayout();
  const rowDates = dates.slice(startIndex, startIndex + itemsPerRow);
  const rowJustifyClass =
    rowDates.length < itemsPerRow
      ? "justify-center"
      : cn("justify-start", !narrowPreview && "sm:justify-center");

  return (
    <div
      className={cn(
        "flex flex-nowrap items-center gap-3",
        !narrowPreview && "sm:gap-5",
        rowJustifyClass,
      )}
    >
      {rowDates.map((dateItem, i) => {
        const index = startIndex + i;
        if (index >= dates.length) return null;

        return (
          <DateCard
            key={`${isFirstRow ? "first" : "second"}-${index}`}
            dateItem={dateItem}
            index={index}
            onDateClick={onDateClick}
            isFirstRow={isFirstRow}
          />
        );
      })}
    </div>
  );
};
