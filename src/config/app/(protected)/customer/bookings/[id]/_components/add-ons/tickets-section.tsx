"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Ticket } from "lucide-react";
import { QuantityControls } from "./quantity-controls";
import { TicketItem } from "./types";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

interface TicketsSectionProps {
  tickets: TicketItem[];
  onQuantityChange: (ticketId: number, delta: number) => void;
  onRemove: (ticketId: number) => void;
}

export function TicketsSection({
  tickets,
  onQuantityChange,
  onRemove,
}: TicketsSectionProps) {
  const { format: formatMoney } = useCurrencyFormat();
  const totalTickets = tickets.reduce(
    (sum, ticket) => sum + ticket.quantity,
    0
  );

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="tickets" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3 flex-1">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: "var(--color-primary-light, #f0f0f0)" }}
            >
              <Ticket
                className="h-5 w-5"
                style={{ color: "var(--color-primary)" }}
              />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold">Additional Tickets</h3>
              <p className="text-sm text-muted-foreground">
                Add extra tickets to your booking
              </p>
            </div>
            {totalTickets > 0 && (
              <div
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: "var(--color-primary-light, #f0f0f0)",
                  color: "var(--color-primary)",
                }}
              >
                {totalTickets} selected
              </div>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 pt-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="border rounded-lg hover:bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {ticket.title}
                    </h4>
                    {ticket.description && (
                      <p className="text-sm text-gray-600 mb-1">
                        {ticket.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {formatMoney(ticket.price)} per ticket
                    </p>
                  </div>
                  <QuantityControls
                    quantity={ticket.quantity}
                    maxQuantity={ticket.maxQuantity}
                    onIncrease={() => onQuantityChange(ticket.id, 1)}
                    onDecrease={() => onQuantityChange(ticket.id, -1)}
                    onRemove={() => onRemove(ticket.id)}
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
