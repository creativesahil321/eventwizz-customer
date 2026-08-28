"use client";

import { motion } from "framer-motion";
import { getDateInfo } from "@/lib/utils";
import { DatesSectionType } from ".";
import { useCurrencySymbol } from "@/hooks/use-currency-format";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
import { cn } from "@/lib/utils";
import { DateCardPriceFooter } from "@/components/public/date-card-price-footer";

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
  const currencySymbol = useCurrencySymbol();
  const narrowPreview = usePreviewNarrowLayout();
  const dateInfo = getDateInfo(dateItem);
  const listPrice = Number.parseFloat(String(dateInfo.price));
  const soldOut = Boolean(dateItem.sold_out);
  const priceLabel = Number.isFinite(listPrice)
    ? `${currencySymbol}${dateInfo.price}`
    : "";
  const ariaLabel = soldOut
    ? `${dateInfo.day} ${dateInfo.date} ${dateInfo.month}, sold out`
    : `Book ${dateInfo.day} ${dateInfo.date} ${dateInfo.month}${
        priceLabel ? `, from ${priceLabel}` : ""
      }`;

  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      disabled={soldOut}
      className={cn(
        "cursor-pointer overflow-hidden rounded-2xl border border-[var(--color-primary)] bg-transparent text-center shadow-[0_0_15px_rgba(60,70,147,0.25)] transition-all duration-300 hover:border-[var(--color-primary)] hover:bg-gradient-to-b hover:from-[var(--color-primary)]/10 hover:to-transparent hover:shadow-[0_0_25px_rgba(60,70,147,0.5)] flex-shrink-0",
        soldOut && "cursor-not-allowed opacity-60 hover:shadow-[0_0_15px_rgba(60,70,147,0.25)]",
        narrowPreview
          ? "w-[85px]"
          : "w-[85px] sm:w-[100px] md:w-[120px]",
      )}
      key={`${isFirstRow ? "first" : "second"}-${index}`}
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.1, delay: index * 0.02 }}
      whileHover={soldOut ? undefined : {
        scale: 1.02,
        boxShadow: "0 0 25px rgba(60,70,147,0.5)",
        transition: { duration: 0.2 },
      }}
      whileTap={soldOut ? undefined : { scale: 0.98 }}
      onClick={() => {
        if (soldOut) return;
        onDateClick(dateItem);
      }}
    >
      <div className={narrowPreview ? "p-2" : "p-2 sm:p-3"}>
        <p
          className={
            narrowPreview
              ? "mb-0.5 text-xs"
              : "mb-0.5 text-xs sm:mb-1 sm:text-sm"
          }
        >
          {dateInfo.day}
        </p>
        <p
          className={
            narrowPreview
              ? "py-1 text-3xl font-bold"
              : "py-1 text-3xl font-bold sm:text-4xl md:text-5xl"
          }
        >
          {dateInfo.date}
        </p>
        <p className={narrowPreview ? "text-xs" : "text-xs sm:text-sm"}>
          {dateInfo.month}
        </p>
      </div>
      <div className="bg-gradient-to-b from-[var(--color-primary)] to-[#232a61] text-white">
        <DateCardPriceFooter
          currencySymbol={currencySymbol}
          listPrice={Number.isFinite(listPrice) ? listPrice : 0}
          offer={dateItem.offer}
          compact={narrowPreview}
        />
      </div>
    </motion.button>
  );
};
