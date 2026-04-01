/**
 * Date Card Component
 * Individual date card for event booking
 */

"use client";

import { motion } from "framer-motion";
import { getDateInfo } from "@/lib/utils";
import { DatesSectionType } from ".";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

interface DateCardProps {
  dateItem: DatesSectionType[0];
  index: number;
  onDateClick: (dateItem: DatesSectionType[0]) => void;
  isFirstRow?: boolean;
}

export const DateCard = ({
  dateItem,
  index,
  onDateClick,
  isFirstRow = false,
}: DateCardProps) => {
  const { formatCompact: formatMoneyCompact } = useCurrencyFormat();
  const dateInfo = getDateInfo(dateItem);

  return (
    <motion.div
      className="cursor-pointer border border-[var(--color-primary)] rounded-sm overflow-hidden text-center w-[85px] sm:w-[100px] md:w-[120px] flex-shrink-0 shadow-[0_0_15px_rgba(60,70,147,0.25)] bg-transparent transition-all duration-300 hover:shadow-[0_0_25px_rgba(60,70,147,0.5)] hover:border-[var(--color-primary)] hover:bg-gradient-to-b hover:from-[var(--color-primary)]/10 hover:to-transparent"
      key={`${isFirstRow ? "first" : "second"}-${index}`}
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.1, delay: index * 0.02 }}
      whileHover={{
        scale: 1.02,
        boxShadow: "0 0 25px rgba(60,70,147,0.5)",
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onDateClick(dateItem)}
    >
      <div className="p-2 sm:p-3">
        <p className="text-xs sm:text-sm mb-0.5 sm:mb-1">{dateInfo.day}</p>
        <p className="text-3xl sm:text-4xl md:text-5xl font-bold py-1">
          {dateInfo.date}
        </p>
        <p className="text-xs sm:text-sm">{dateInfo.month}</p>
      </div>
      <div className="bg-gradient-to-b from-[var(--color-primary)] to-[#232a61] text-white text-xl sm:text-2xl tracking-wider py-1 sm:py-1.5">
        {formatMoneyCompact(Number.parseFloat(String(dateInfo.price)))}
      </div>
    </motion.div>
  );
};
