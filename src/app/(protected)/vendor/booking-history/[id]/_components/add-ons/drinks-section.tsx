"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Wine } from "lucide-react";
import { QuantityControls } from "./quantity-controls";
import { DrinkItem } from "./types";

interface DrinksSectionProps {
  drinks: DrinkItem[];
  onQuantityChange: (drinkId: number, delta: number) => void;
  onRemove: (drinkId: number) => void;
}

export function DrinksSection({
  drinks,
  onQuantityChange,
  onRemove,
}: DrinksSectionProps) {
  const totalDrinks = drinks.reduce((sum, drink) => sum + drink.quantity, 0);

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="drinks" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3 flex-1">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: "var(--color-primary-light, #f0f0f0)" }}
            >
              <Wine
                className="h-5 w-5"
                style={{ color: "var(--color-primary)" }}
              />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold">Drinks</h3>
              <p className="text-sm text-muted-foreground">
                Beverage packages for your event
              </p>
            </div>
            {totalDrinks > 0 && (
              <div
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: "var(--color-primary-light, #f0f0f0)",
                  color: "var(--color-primary)",
                }}
              >
                {totalDrinks} selected
              </div>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 pt-4">
            {drinks.map((drink) => (
              <div
                key={drink.id}
                className="border rounded-lg hover:bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {drink.title}
                    </h4>
                    {drink.description && (
                      <p className="text-sm text-gray-600 mb-1">
                        {drink.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      £{drink.price.toFixed(2)} per item
                    </p>
                  </div>
                  <QuantityControls
                    quantity={drink.quantity}
                    maxQuantity={drink.maxQuantity}
                    onIncrease={() => onQuantityChange(drink.id, 1)}
                    onDecrease={() => onQuantityChange(drink.id, -1)}
                    onRemove={() => onRemove(drink.id)}
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
