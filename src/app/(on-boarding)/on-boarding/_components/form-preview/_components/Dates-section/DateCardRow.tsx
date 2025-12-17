/**
 * Date Card Row Component
 * Row of date cards for event booking
 */

import { DateCard } from "./DateCard";
import { DatesSectionType } from ".";

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
  const rowDates = dates.slice(startIndex, startIndex + itemsPerRow);

  return (
    <div className="flex justify-start sm:justify-center items-center gap-3 sm:gap-5 overflow-x-auto sm:overflow-hidden pb-2 mb-4 sm:mb-5">
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
