"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Users,
  CheckCircle2,
  Clock,
  Edit,
  UtensilsCrossed,
  Copy,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AttendeeMenuSelection } from "../_lib/types";
import { MenuCategory } from "@/services/customer/bookings/type";

/**
 * Get menu item name by ID from menu categories
 * @param itemId - The menu item ID (as string or number)
 * @param menuItems - Array of menu categories
 * @returns The menu item name or the ID if not found
 */
const getMenuItemName = (
  itemId: string | number | undefined,
  menuItems: MenuCategory[]
): string => {
  if (!itemId) return "Not selected";

  const id = typeof itemId === "string" ? Number.parseInt(itemId, 10) : itemId;
  if (Number.isNaN(id)) return String(itemId);

  // Search through all categories and items
  for (const category of menuItems) {
    const item = category.items.find((i) => i.id === id);
    if (item) {
      return item.name;
    }
  }

  // Fallback: return the ID if not found
  return String(itemId);
};

/**
 * Get menu item name from menuSelections by category title
 * @param categoryTitle - The category title (e.g., "Starters", "Main Course")
 * @param menuSelections - The menu selections object
 * @param menuItems - Array of menu categories
 * @returns The menu item name or "Not selected"
 */

interface AttendeeListProps {
  readonly attendees: AttendeeMenuSelection[];
  readonly totalGuests: number;
  readonly menuItems?: MenuCategory[];
  readonly onEditAttendee: (id: string) => void;
  readonly onDuplicateAttendee: (id: string) => void;
  readonly duplicatingId?: string | null;
}

export default function AttendeeList({
  attendees,
  totalGuests,
  menuItems = [],
  onEditAttendee,
  onDuplicateAttendee,
  duplicatingId = null,
}: Readonly<AttendeeListProps>) {
  const completedCount = attendees.filter(
    (a) => a.status === "completed"
  ).length;
  // Cap attendee count at totalGuests for display (prevent showing 21/20)
  const displayAttendeeCount = Math.min(attendees.length, totalGuests);
  // Prevent negative pending count - cap at 0
  const pendingCount = Math.max(0, totalGuests - completedCount);
  const isTableFull = attendees.length >= totalGuests;

  return (
    <Card className="h-full min-h-0 shadow-lg border-2 flex flex-col overflow-hidden">
      <CardHeader
        className="rounded-t-lg border-b-2 flex-shrink-0 py-4"
        style={{
          backgroundColor: "var(--color-primary)",
          color: "var(--color-primary-foreground)",
        }}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-lg">
              <Users className="h-5 w-5" />
            </div>
            <span>
              Attendees ({displayAttendeeCount}/{totalGuests})
              {isTableFull && (
                <span className="ml-2 text-xs font-normal underline">
                  (Table is full)
                </span>
              )}
            </span>
          </CardTitle>
        </div>

        {/* Progress Stats */}
        <div className="flex gap-3 mt-3 text-sm">
          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-md">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">{completedCount} Completed</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-md">
            <Clock className="h-4 w-4" />
            <span className="font-medium">{pendingCount} Pending</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
        <ScrollArea className="flex-1 min-h-0 h-full">
          <div className="p-3">
            {attendees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div
                  className="p-4 rounded-full mb-4"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                  }}
                >
                  <UtensilsCrossed
                    className="h-10 w-10"
                    style={{ color: "var(--color-primary)" }}
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No menu selections yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Start by filling out the form on the left to add menu
                  selections for your attendees.
                </p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full space-y-2">
                {attendees.map((attendee, index) => (
                  <AccordionItem
                    key={attendee.id}
                    value={attendee.id}
                    className={cn(
                      "border rounded-lg overflow-hidden transition-all border-b",
                      attendee.status === "completed"
                        ? "bg-green-50/50 border-green-200"
                        : "bg-amber-50/50 border-amber-200"
                    )}
                  >
                    <AccordionTrigger className="px-3 py-2.5 hover:no-underline">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{
                            backgroundColor: "var(--color-primary)",
                          }}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-foreground truncate">
                            {attendee.title} {attendee.fullName}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              variant={
                                attendee.status === "completed"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-[10px] h-4 px-1.5 text-white"
                            >
                              {attendee.status === "completed" ? (
                                <>
                                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                  Completed
                                </>
                              ) : (
                                <>
                                  <Clock className="h-2.5 w-2.5 mr-0.5" />
                                  Pending
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-3 pb-3 pt-0">
                      <div className="space-y-2.5 mt-2">
                        {/* Action Buttons - Moved outside trigger to avoid nested buttons */}
                        <div className="flex items-center justify-end gap-1 pb-2 border-b">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (
                                duplicatingId !== attendee.id &&
                                !isTableFull
                              ) {
                                onDuplicateAttendee(attendee.id);
                              }
                            }}
                            disabled={
                              duplicatingId === attendee.id ||
                              duplicatingId !== null ||
                              isTableFull
                            }
                            className="h-8 px-2 gap-1.5 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              isTableFull
                                ? `Table is full (${totalGuests}/${totalGuests})`
                                : duplicatingId === attendee.id
                                ? "Duplicating..."
                                : "Duplicate this attendee"
                            }
                            type="button"
                          >
                            {duplicatingId === attendee.id ? (
                              <Loader2 className="h-3.5 w-3.5 text-green-600 animate-spin" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-green-600" />
                            )}
                            <span className="text-xs">
                              {duplicatingId === attendee.id
                                ? "Duplicating..."
                                : "Duplicate"}
                            </span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEditAttendee(attendee.id)}
                            className="h-8 px-2 gap-1.5 hover:bg-blue-100"
                            title="Edit this attendee"
                            type="button"
                          >
                            <Edit className="h-3.5 w-3.5 text-blue-600" />
                            <span className="text-xs">Edit</span>
                          </Button>
                        </div>
                        {/* Menu Selections - Use menuSelections if available, fallback to legacy fields */}
                        <div className="space-y-1.5">
                          {menuItems.map((category, index) => {
                            // Get item ID from menuSelections (preferred) or legacy fields
                            const itemId =
                              attendee.menuSelections?.[category.title] ||
                              (index === 0
                                ? attendee.starter
                                : index === 1
                                ? attendee.mainCourse
                                : index === 2
                                ? attendee.dessert
                                : index === 3
                                ? attendee.sides
                                : undefined);

                            const itemName = getMenuItemName(itemId, menuItems);

                            // Skip if no item selected and it's an optional category (after first 3)
                            if (!itemId && index >= 3) return null;

                            return (
                              <div
                                key={category.title}
                                className="bg-white rounded p-2 border"
                              >
                                <p className="text-[10px] font-semibold text-muted-foreground mb-0.5 uppercase tracking-wide">
                                  {category.title}
                                </p>
                                <p className="text-xs font-medium text-foreground">
                                  {itemName}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Allergens & Dietary Requirements */}
                        {(attendee.allergens &&
                          attendee.allergens.length > 0) ||
                        (attendee.dietaryRequirements &&
                          attendee.dietaryRequirements.length > 0) ||
                        attendee.additionalNotes ? (
                          <div className="space-y-1.5 p-2 bg-white rounded border">
                            {attendee.allergens &&
                              attendee.allergens.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                                    Allergens
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {attendee.allergens.map((allergen) => (
                                      <Badge
                                        key={allergen}
                                        variant="destructive"
                                        className="text-[10px] py-0 h-4 px-1.5"
                                      >
                                        {allergen}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {attendee.dietaryRequirements &&
                              attendee.dietaryRequirements.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                                    Dietary Requirements
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {attendee.dietaryRequirements.map(
                                      (diet) => (
                                        <Badge
                                          key={diet}
                                          variant="secondary"
                                          className="text-[10px] py-0 h-4 px-1.5"
                                        >
                                          {diet}
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                            {attendee.additionalNotes && (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground mb-0.5 uppercase tracking-wide">
                                  Additional Notes
                                </p>
                                <p className="text-xs text-foreground leading-tight">
                                  {attendee.additionalNotes}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            {/* Pending Slots */}
            {pendingCount > 0 && attendees.length > 0 && (
              <div className="space-y-2 mt-2">
                {Array.from({ length: pendingCount }).map((_, index) => (
                  <Card
                    key={`pending-${index}`}
                    className="border border-dashed border-gray-300 bg-gray-50/50"
                  >
                    <CardContent className="p-2.5 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full border border-dashed border-gray-400 flex items-center justify-center text-xs font-bold text-gray-400">
                        {completedCount + index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-medium">
                          Attendee {completedCount + index + 1}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Awaiting menu selection
                        </p>
                      </div>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
