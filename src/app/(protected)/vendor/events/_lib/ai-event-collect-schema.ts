import { z } from "zod";
import { AI_EVENT_MAX_ROOMS, AI_EVENT_MIN_ROOMS } from "./ai-event-vendor-intent";

export const aiEventCollectInfoSchema = z
  .object({
    eventName: z
      .string()
      .min(2, "Event name must be at least 2 characters")
      .max(40, "Event name must be 40 characters or fewer"),
    eventType: z.string().min(1, "Please select an event type"),
    eventCategoryId: z.string().min(1, "Please select a category"),
    venueAddress: z
      .string()
      .trim()
      .min(
        5,
        "Enter the full address or location where this event takes place",
      ),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    eventDescription: z
      .string()
      .max(2000, "Description must be 2000 characters or fewer")
      .optional(),
    guestCount: z.string().optional(),
    priceRange: z.string().optional(),
    hasRoomSystem: z.enum(["yes", "no"]),
    /** `select` when vendor already has venue rooms — pick from catalog (+ create 3rd if under cap). */
    roomInputMode: z.enum(["select", "edit"]).optional(),
    selectedRoomIds: z.array(z.number()).optional(),
    rooms: z.array(
      z.object({
        id: z.number().optional(),
        name: z.string().trim().max(40, "Room name max 40 characters"),
      }),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.hasRoomSystem !== "yes") return;

    if (data.roomInputMode === "select") {
      const count = data.selectedRoomIds?.length ?? 0;
      if (count < AI_EVENT_MIN_ROOMS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Select at least ${AI_EVENT_MIN_ROOMS} rooms for this event`,
          path: ["selectedRoomIds"],
        });
      }
      if (count > AI_EVENT_MAX_ROOMS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `You can select a maximum of ${AI_EVENT_MAX_ROOMS} rooms`,
          path: ["selectedRoomIds"],
        });
      }
      return;
    }

    const count = data.rooms.length;
    if (count < AI_EVENT_MIN_ROOMS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least 2 rooms are required",
        path: ["rooms"],
      });
    }
    if (count > AI_EVENT_MAX_ROOMS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "You can add a maximum of 3 rooms",
        path: ["rooms"],
      });
    }
    data.rooms.forEach((room, index) => {
      if (!room.name.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Room name is required",
          path: ["rooms", index, "name"],
        });
      }
    });
  });

export type AiEventCollectInfoForm = z.infer<typeof aiEventCollectInfoSchema>;
