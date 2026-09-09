"use client";

import { CalendarDays, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatBookingSummaryCard } from "@/lib/chat-booking-choices";

const KIND_LABEL: Record<ChatBookingSummaryCard["items"][number]["kind"], string> = {
  table: "Tables",
  ticket: "Tickets",
  drink: "Drinks",
};

type SummarySection = {
  key: string;
  heading?: string;
  kind: ChatBookingSummaryCard["items"][number]["kind"];
  items: ChatBookingSummaryCard["items"];
};

function sectionItems(summary: ChatBookingSummaryCard): SummarySection[] {
  const multiSlot = summary.slots.length > 1;
  const sections: SummarySection[] = [];
  for (const item of summary.items) {
    const last = sections[sections.length - 1];
    const same =
      last &&
      last.kind === item.kind &&
      (!multiSlot || last.heading === item.slotHeading);
    if (same) {
      last.items.push(item);
      continue;
    }
    sections.push({
      key: `${item.slotHeading}-${item.kind}-${sections.length}`,
      heading: multiSlot ? item.slotHeading : undefined,
      kind: item.kind,
      items: [item],
    });
  }
  return sections;
}

function renderInlinePrompt(prompt: string) {
  const parts = prompt.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={index} className="font-semibold text-slate-950">
          {bold[1]}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function ChatBookingSummaryCardView({
  summary,
}: {
  summary: ChatBookingSummaryCard;
}) {
  const sections = sectionItems(summary);
  const showTotal = Boolean(summary.total && summary.total !== summary.subtotal);

  return (
    <div className="overflow-hidden text-slate-900">
      <div className="border-b border-slate-200/80 bg-slate-50/90 px-3.5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Booking summary
        </p>
        {summary.greeting ? (
          <p className="mt-1 text-xs leading-snug text-slate-600">
            {summary.greeting}
          </p>
        ) : null}
        <p className="mt-1 text-[15px] font-semibold leading-snug text-slate-950">
          {summary.eventTitle}
        </p>
        {summary.venue ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>{summary.venue}</span>
          </p>
        ) : null}
      </div>

      {summary.slots.map((slot) => (
        <div
          key={slot.heading}
          className="flex items-start gap-2 border-b border-slate-100 px-3.5 py-2.5"
        >
          <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-snug text-slate-900">
              {slot.heading}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {[slot.guests, slot.seating].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      ))}

      <div className="divide-y divide-slate-100">
        {sections.map((section) => (
          <div key={section.key} className="px-3.5 py-2.5">
            {section.heading ? (
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {section.heading}
              </p>
            ) : null}
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {KIND_LABEL[section.kind]}
            </p>
            <ul className="space-y-2">
              {section.items.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-snug text-slate-900">
                      {item.qty} × {item.name}
                    </p>
                    {item.unitPrice || item.meta ? (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {[item.meta, item.unitPrice].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  {item.amount ? (
                    <p className="shrink-0 text-xs font-semibold tabular-nums text-slate-950">
                      {item.amount}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {summary.couponNote ? (
        <p className="border-t border-slate-100 px-3.5 py-2 text-[11px] leading-snug text-slate-600">
          {summary.couponNote}
        </p>
      ) : null}

      <div className="border-t border-slate-200 bg-slate-50/90 px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-500">
            {showTotal ? "Subtotal" : "Total"}
          </span>
          <span
            className={cn(
              "text-xs tabular-nums",
              showTotal
                ? "font-medium text-slate-600"
                : "text-sm font-semibold text-slate-950",
            )}
          >
            {summary.subtotal || "—"}
          </span>
        </div>
        {summary.discount ? (
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-500">Discount</span>
            <span className="text-xs font-medium tabular-nums text-emerald-700">
              −{summary.discount}
            </span>
          </div>
        ) : null}
        {showTotal ? (
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-700">Total</span>
            <span className="text-sm font-semibold tabular-nums text-slate-950">
              {summary.total}
            </span>
          </div>
        ) : null}
      </div>

      {summary.prompt ? (
        <p className="border-t border-slate-100 px-3.5 py-2.5 text-sm leading-relaxed text-slate-800">
          {renderInlinePrompt(summary.prompt)}
        </p>
      ) : null}
    </div>
  );
}
