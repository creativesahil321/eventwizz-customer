import * as z from "zod";

//#===step-1===#
export const stepOneSchema = z.object({
  step: z.literal(1),
  name: z
    .string()
    .min(1, "Please select a venue from Google Places suggestions"),
  contact_number: z
    .string()
    .min(1, "Contact number is required")
    .max(20, "Contact number must not exceed 20 characters")
    .regex(
      /^[\d\s\-+()]+$/,
      "Contact number can only contain numbers and phone formatting characters"
    ),
  email: z.string().email("Invalid email").min(1, "Email is required"),
  address: z.string().min(1, "Address is required"),
  domain: z.string().optional(),
  description: z.string().optional(),
  city: z.string().min(1, "City is required"),
});
export type StepOneType = z.infer<typeof stepOneSchema>;

//#===step-2===#
export const stepTwoSchema = z.object({
  step: z.literal(2),
  logo: z.any().optional(),
  cover_image: z.any().optional(),
  banner_heading: z
    .string()
    .min(1, "Banner heading is required")
    .max(50, "Banner heading must not exceed 50 characters"),
  banner_sub_heading: z
    .string()
    .min(1, "Sub heading is required")
    .max(80, "Sub heading must not exceed 80 characters"),
  about_title: z
    .string()
    .min(1, "Title is required")
    .max(40, "Title must not exceed 40 characters"),
  about_description: z.string().min(1, "Description is required"),
  about_link_title: z
    .string()
    .min(1, "Button text is required")
    .max(18, "Button text must not exceed 18 characters"),
});
export type StepTwoType = z.infer<typeof stepTwoSchema>;

//#===step-3===#

// Validation functions for event scheduler
// Removed future time validation - only keeping sequence validation
const validateTimeSequence: (
  schedules: Array<{ title: string; time: string }>
) => boolean = (schedules) => {
  if (schedules.length <= 1) return true;

  const validSchedules = schedules.filter(
    (schedule) => schedule.time && schedule.title
  );
  if (validSchedules.length <= 1) return true;

  for (let i = 0; i < validSchedules.length - 1; i++) {
    const currentTime = validSchedules[i].time;
    const nextTime = validSchedules[i + 1].time;

    if (!currentTime || !nextTime) continue;

    const [currentHours, currentMinutes] = currentTime.split(":").map(Number);
    const [nextHours, nextMinutes] = nextTime.split(":").map(Number);

    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    const nextTotalMinutes = nextHours * 60 + nextMinutes;

    if (nextTotalMinutes <= currentTotalMinutes) {
      return false;
    }
  }

  return true;
};

export const stepThreeSchema = z.object({
  step: z.literal(3),
  vendor_location_id: z.number().optional(),
  event_category_id: z.number().min(1, "Event Category is required"),
  event_name: z
    .string()
    .min(1, "Event name is required")
    .max(40, "Event name must not exceed 40 characters"),
  remove_event_banner_image: z.boolean().optional(),
  remove_event_banner_video: z.boolean().optional(),
  event_banner_video: z.any().optional(),
  event_banner_image: z.any().optional(),
  event_banner_heading: z
    .string()
    .min(1, "Banner heading is required")
    .max(50, "Banner heading must not exceed 50 characters"),
  event_banner_sub_heading: z
    .string()
    .min(1, "Banner sub heading is required")
    .max(80, "Banner sub heading must not exceed 80 characters"),
  about_event_heading: z
    .string()
    .min(1, "About event heading is required")
    .max(50, "About event heading must not exceed 50 characters"),
  about_event_sub_heading: z
    .string()
    .min(1, "About event sub heading is required")
    .max(80, "About event sub heading must not exceed 80 characters"),
  about_event_description: z
    .string()
    .min(1, "About event description is required"),
  event_schedular_title: z
    .string()
    .min(1, "Event schedular title is required")
    .max(40, "Event schedular title must not exceed 40 characters"),
  event_schedular: z
    .array(
      z.object({
        title: z
          .string()
          .min(1, "Title is required")
          .max(40, "Schedule title must not exceed 40 characters"),
        time: z
          .string()
          .min(1, "Time is required")
          .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:mm format"),
      })
    )
    .min(1, "At least one schedule is required")
    .refine(validateTimeSequence, "Times must be in ascending order"),
});
export type StepThreeType = z.infer<typeof stepThreeSchema>;

//#===step-4===#
export const stepFourSchema = z
  .object({
    step: z.literal(4),
    event_id: z.number().min(1, "Event ID is required"),
    package_image: z
      .union([z.instanceof(File), z.string().url(), z.null()])
      .nullable()
      .optional(),
    package_title: z
      .string()
      .min(1, "Event main heading is required")
      .max(40, "Event main heading must not exceed 40 characters"),
    package_description: z
      .string()
      .min(1, "Event sub-heading is required")
      .max(160, "Event sub-heading must not exceed 160 characters"),
    package_button_name: z
      .string()
      .min(1, "Button name is required")
      .max(18, "Button name must not exceed 18 characters"),
    package_details: z
      .array(
        z.object({
          title: z
            .string()
            .min(1, "Title is required")
            .max(40, "Package detail title must not exceed 40 characters"),
        })
      )
      .min(1, "At least one package detail is required"),
    gallery: z
      .array(
        z.union([
          z.instanceof(File),
          z.object({
            id: z.number(),
            url: z.string().url(),
          }),
        ])
      )
      .optional(),
  })
  .refine(
    (data) => {
      // Check if package_image exists (either as File or URL string)
      const hasImage =
        data.package_image &&
        (data.package_image instanceof File ||
          (typeof data.package_image === "string" &&
            data.package_image.length > 0));
      return hasImage;
    },
    {
      message: "Package image is required",
      path: ["package_image"],
    }
  );
export type StepFourType = z.infer<typeof stepFourSchema>;

//#===step-5===#

// Create a validation function for reuse across schemas
const validateDepositDueDate = (data: unknown) => {
  const { booking_type, payment_type, deposit_due_date, is_deposit_enabled } =
    data as {
      booking_type: string;
      payment_type: string;
      deposit_due_date: string | undefined;
      is_deposit_enabled?: boolean;
    };
  // Only validate payment fields for tables/both booking types
  if (booking_type === "tickets") {
    return true;
  }

  if (is_deposit_enabled === false) {
    return true;
  }

  // If payment type is deposit, require deposit_due_date
  if (payment_type === "deposit") {
    return deposit_due_date && deposit_due_date.trim() !== "";
  }

  return true;
};

const depositDueDateMessage = {
  message: "Deposit due date is required when deposit payment is selected",
  path: ["deposit_due_date"],
};

// Base schema for date - add booking_type to the base schema
const normalizeBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(trimmed)) return true;
    if (["false", "0", "no", "off", ""].includes(trimmed)) return false;
  }
  return undefined;
};

const normalizeDepositType = (value: unknown) => {
  if (typeof value !== "string") return undefined;

  const lower = value.toLowerCase();
  if (lower === "amount" || lower === "percentage") {
    return lower;
  }

  return "amount";
};

const baseDateSchema = z.object({
  event_date: z.string().min(1, "Date is required"),
  booking_type: z.enum(["tickets", "tables", "both"]),
  payment_type: z.enum(["deposit", "full"]).optional(),
  is_deposit_enabled: z.preprocess(normalizeBoolean, z.boolean().optional()),
  deposit_type: z.preprocess(
    normalizeDepositType,
    z.enum(["amount", "percentage"]).optional()
  ),
  deposit_value: z
    .union([z.string(), z.number()])
    .refine((val) => {
      if (val === "" || val === null || val === undefined) return true;
      const num = typeof val === "string" ? parseFloat(val) : val;
      return !isNaN(num) && num >= 0;
    }, "Deposit value must be 0 or greater")
    .optional(),
  deposit_due_date: z.string().optional(),
});

// Modified ticket date schema - now conditionally applies based on booking_type value
const dateSchema = baseDateSchema
  .extend({
    tickets: z
      .array(
        z.object({
          title: z
            .string()
            .min(1, "Title is required")
            .max(25, "Ticket title must not exceed 25 characters"),
          description: z
            .string()
            .min(1, "Description is required")
            .max(160, "Ticket description must not exceed 160 characters"),
          total_capacity: z.union([z.string(), z.number()]).refine((val) => {
            const num = typeof val === "string" ? parseInt(val, 10) : val;
            return !isNaN(num) && num >= 1 && num <= 100000;
          }, "Total capacity must be between 1 and 100,000"),
          price: z.union([z.string(), z.number()]).refine((val) => {
            const num = typeof val === "string" ? parseInt(val, 10) : val;
            return !isNaN(num) && num >= 1 && num <= 9999;
          }, "Price must be between 1 and 9,999 (4 digits max)"),
        })
      )
      .optional(),
    total_ticket_types: z.number().optional(),
    tables: z
      .array(
        z.object({
          min_persons: z.union([z.string(), z.number()]).refine((val) => {
            const num = typeof val === "string" ? parseInt(val, 10) : val;
            return !isNaN(num) && num >= 1;
          }, "Minimum persons must be at least 1"),
          max_persons: z.union([z.string(), z.number()]).refine((val) => {
            const num = typeof val === "string" ? parseInt(val, 10) : val;
            return !isNaN(num) && num >= 1;
          }, "Maximum persons must be at least 1"),
          price: z.union([z.string(), z.number()]).refine((val) => {
            const num = typeof val === "string" ? parseInt(val, 10) : val;
            return !isNaN(num) && num >= 0 && num <= 9999;
          }, "Price must be between 0 and 9,999 (4 digits max)"),
          total_tables: z.union([z.string(), z.number()]).refine((val) => {
            const num = typeof val === "string" ? parseInt(val, 10) : val;
            return !isNaN(num) && num >= 1 && num <= 5000;
          }, "Total tables must be between 1 and 5,000"),
        })
      )
      .optional(),
    total_table_types: z.number().optional(),
  })
  .refine(validateDepositDueDate, depositDueDateMessage)
  .superRefine((data, ctx) => {
    if (!["tables", "both"].includes(data.booking_type)) {
      return;
    }

    if (data.is_deposit_enabled === false) {
      return;
    }

    if (data.payment_type !== "deposit") {
      return;
    }

    if (!data.deposit_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deposit type is required when deposit payment is selected",
        path: ["deposit_type"],
      });
    }

    const rawValue = data.deposit_value;
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deposit value is required when deposit payment is selected",
        path: ["deposit_value"],
      });
      return;
    }

    // Convert to integer (no decimals allowed)
    const value =
      typeof rawValue === "string"
        ? parseInt(rawValue, 10)
        : Math.floor(Number(rawValue));

    if (Number.isNaN(value) || value === undefined || value <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deposit value must be greater than 0",
        path: ["deposit_value"],
      });
      return;
    }

    if (data.deposit_type === "percentage") {
      if (value < 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Deposit percentage must be at least 20%",
          path: ["deposit_value"],
        });
      } else if (value > 80) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Deposit percentage cannot exceed 80%",
          path: ["deposit_value"],
        });
      }
    }

    // For Fixed Amount: deposit must be between 20% and 80% of the lowest table price
    // Round to integers for validation and error messages
    if (
      data.deposit_type === "amount" &&
      data.tables &&
      data.tables.length > 0
    ) {
      const lowestTablePrice = Math.min(
        ...data.tables.map((table) => {
          const price =
            typeof table.price === "string"
              ? parseInt(table.price, 10)
              : Math.floor(Number(table.price));
          return isNaN(price) ? Infinity : price;
        })
      );

      if (lowestTablePrice !== Infinity) {
        // Round to integers for validation
        const minAllowed = Math.ceil((lowestTablePrice * 20) / 100);
        const maxAllowed = Math.floor((lowestTablePrice * 80) / 100);

        if (value < minAllowed || value > maxAllowed) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Deposit amount must be between 20% (${minAllowed}) and 80% (${maxAllowed}) of the lowest table price (${lowestTablePrice})`,
            path: ["deposit_value"],
          });
        }
      }
    }

    // Validate that deposit due date is before event date
    // Only validate if payment type is deposit or deposit is enabled
    if (
      data.payment_type === "deposit" &&
      data.is_deposit_enabled &&
      data.deposit_due_date &&
      data.event_date
    ) {
      const depositDate = new Date(data.deposit_due_date);
      const eventDate = new Date(data.event_date);

      // Reset time to compare only dates
      depositDate.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);

      if (depositDate >= eventDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Deposit due date must be before the event date",
          path: ["deposit_due_date"],
        });
      }
    }
  })
  .refine(
    (data) => {
      // Require payment_type for tables/both booking types
      if (data.booking_type === "tables" || data.booking_type === "both") {
        return (
          data.payment_type &&
          (data.payment_type === "full" || data.payment_type === "deposit")
        );
      }
      return true;
    },
    {
      message: "Payment type is required for table bookings",
      path: ["payment_type"],
    }
  )
  .refine(
    (data) => {
      if (data.booking_type === "tickets" || data.booking_type === "both") {
        return Array.isArray(data.tickets) && data.tickets.length > 0;
      }
      return true;
    },
    {
      message:
        "At least one ticket is required when ticket booking is selected",
      path: ["tickets"],
    }
  )
  .refine(
    (data) => {
      if (data.booking_type === "tables" || data.booking_type === "both") {
        return Array.isArray(data.tables) && data.tables.length > 0;
      }
      return true;
    },
    {
      message: "At least one table is required when table booking is selected",
      path: ["tables"],
    }
  );

// Updated stepFiveSchema - simpler now with per-date booking_type
export const stepFiveSchema = z.object({
  step: z.literal(5),
  event_id: z.number().min(1, "Event ID is required"),
  dates: z.array(dateSchema).min(1, "At least one date is required"),
});

export type StepFiveType = z.infer<typeof stepFiveSchema>;

// Updated helper function to include booking_type in the date structure
export const getDefaultDate = (
  bookingType: "tickets" | "tables" | "both" = "tickets"
): StepFiveType["dates"][number] => {
  const baseDate = {
    event_date: "",
    booking_type: bookingType,
  };

  switch (bookingType) {
    case "tickets":
      return {
        ...baseDate,
        total_ticket_types: 1,
        tickets: [
          { title: "", description: "", total_capacity: "", price: "" },
        ],
        total_table_types: 0,
        tables: [],
      };
    case "tables":
      return {
        ...baseDate,
        payment_type: "full" as const,
        is_deposit_enabled: true,
        deposit_type: "amount" as const,
        deposit_value: "",
        deposit_due_date: "",
        total_table_types: 1,
        tables: [
          { min_persons: "", max_persons: "", price: "", total_tables: "" },
        ],
        total_ticket_types: 0,
        tickets: [],
      };
    case "both":
      return {
        ...baseDate,
        payment_type: "full" as const,
        is_deposit_enabled: true,
        deposit_type: "amount" as const,
        deposit_value: "",
        deposit_due_date: "",
        total_table_types: 1,
        tables: [
          { min_persons: "", max_persons: "", price: "", total_tables: "" },
        ],
        total_ticket_types: 1,
        tickets: [
          { title: "", description: "", total_capacity: "", price: "" },
        ],
      };
  }
};

//#===step-6===#
export const stepSixSchema = z
  .object({
    step: z.literal(6),
    event_id: z.number().min(1, "Event ID is required"),
    catering_option: z.number().min(0).max(1),
    menu_title: z
      .string()
      .max(40, "Menu title must not exceed 40 characters")
      .optional(),
    menu_description: z
      .string()
      .max(160, "Menu description must not exceed 160 characters")
      .optional(),
    event_menu_category_id: z.number().optional(),
    menus: z
      .array(
        z.object({
          name: z
            .string()
            .min(1, "Category name is required")
            .max(40, "Category name must not exceed 40 characters"),
          items: z
            .array(
              z.object({
                title: z
                  .string()
                  .min(1, "Title is required")
                  .max(40, "Item title must not exceed 40 characters"),
                description: z
                  .string()
                  .min(1, "Description is required")
                  .refine(
                    (val) => {
                      // Strip HTML tags to get plain text length (same as package_description)
                      const plainText = val.replace(/<[^>]*>/g, "").trim();
                      return plainText.length <= 160;
                    },
                    {
                      message: "Description must not exceed 160 characters",
                    }
                  ),
              })
            )
            .min(1, "At least one item is required")
            .max(10, "Maximum of 10 items allowed per category"),
        })
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    // If catering_option is 1 (Yes), validate menu fields
    if (data.catering_option === 1) {
      if (!data.menu_title || data.menu_title.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Menu title is required when catering option is Yes",
          path: ["menu_title"],
        });
      }

      if (!data.menu_description || data.menu_description.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Menu description is required when catering option is Yes",
          path: ["menu_description"],
        });
      }

      if (!data.event_menu_category_id || data.event_menu_category_id < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Menu category is required when catering option is Yes",
          path: ["event_menu_category_id"],
        });
      }

      if (!data.menus || data.menus.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one menu is required when catering option is Yes",
          path: ["menus"],
        });
      }
    }
  });
export type StepSixType = z.infer<typeof stepSixSchema>;

export const StepSixSchema = stepSixSchema;

//#===step-7===#
export const stepSevenSchema = z.object({
  step: z.literal(7),
  event_id: z.number(),
  drink_title: z
    .string()
    .min(1, "The drink title field is required")
    .max(40, "Drink title must not exceed 40 characters"),
  drink_description: z
    .string()
    .min(1, "The drink description field is required")
    .max(160, "Drink description must not exceed 160 characters"),
  packages: z
    .array(
      z.object({
        id: z.number().optional(), // Optional for backward compatibility (required when from API)
        title: z
          .string()
          .min(1, "Package title is required")
          .max(25, "Package title must not exceed 25 characters"),
        description: z
          .string()
          .min(1, "Package description is required")
          .refine(
            (val) => {
              // Strip HTML tags to get plain text length
              const plainText = val.replace(/<[^>]*>/g, "").trim();
              return plainText.length <= 160;
            },
            {
              message: "Package description must not exceed 160 characters",
            }
          ),
        price: z.union([z.number(), z.string()]).refine(
          (val) => {
            // Check if value is empty, null, or undefined
            if (val === "" || val === null || val === undefined) {
              return false;
            }
            const num = typeof val === "string" ? Number.parseFloat(val) : val;
            return !Number.isNaN(num) && num > 0 && num <= 999999;
          },
          {
            message:
              "Package price is required and must be between 1 and 999999",
          }
        ),
        available_quantity: z.preprocess(
          (val) => {
            // Convert undefined, null, NaN, or empty string to undefined
            if (
              val === undefined ||
              val === null ||
              val === "" ||
              (typeof val === "number" && Number.isNaN(val))
            ) {
              return undefined;
            }
            // Convert string to number
            if (typeof val === "string") {
              const num = Number.parseFloat(val);
              return Number.isNaN(num) ? undefined : num;
            }
            return val;
          },
          z.union([z.number(), z.undefined()]).superRefine((val, ctx) => {
            if (val === undefined || val === null) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Available quantity is required",
              });
              return;
            }
            const num =
              typeof val === "number" ? val : Number.parseFloat(String(val));
            if (Number.isNaN(num)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Available quantity must be a number",
              });
              return;
            }
            if (num < 1) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Available quantity must be at least 1",
              });
              return;
            }
            if (num > 500) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Available quantity cannot exceed 500",
              });
            }
          })
        ) as z.ZodType<number, z.ZodTypeDef, unknown>,
      })
    )
    .min(1, "At least one package is required"),
});

export type StepSevenType = z.infer<typeof stepSevenSchema>;

//#===step-8===#

export const stepEightSchema = z
  .object({
    step: z.number(),
    event_id: z.number(),
    remove_brochure_pdf: z.boolean().optional(),
    remove_brochure_pdf_2: z.boolean().optional(),
    remove_faq_pdf: z.boolean().optional(),
    brochure_pdf: z
      .union([z.instanceof(File), z.string().url(), z.null()])
      .optional(),
    brochure_pdf_2: z
      .union([z.instanceof(File), z.string().url(), z.null()])
      .optional(),
    faq_pdf: z
      .union([z.instanceof(File), z.string().url(), z.null()])
      .optional(),
    event_address: z.string().min(1, "Event address is required"),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    price_start_from: z
      .string()
      .min(1, "Starting price is required")
      .refine(
        (val) => {
          const num = Number(val);
          return !Number.isNaN(num) && num >= 0 && num <= 999999;
        },
        { message: "Price must be between 0 and 999999" }
      ),
    price_start_from_button_text: z
      .string()
      .max(18, "Button text must not exceed 18 characters")
      .optional()
      .default("Book Now"),
    location: z.object({
      title: z
        .string()
        .max(40, "Location title must not exceed 40 characters")
        .optional(),
      description: z
        .string()
        .max(160, "Location description must not exceed 160 characters")
        .optional(),
      icon: z.string().optional(),
    }),
    price: z
      .object({
        title: z
          .string()
          .max(40, "Price title must not exceed 40 characters")
          .optional(),
        description: z
          .string()
          .max(160, "Price description must not exceed 160 characters")
          .optional(),
        link: z.string().optional(),
        icon: z.string().optional(),
        price_title: z
          .string()
          .max(40, "Price title must not exceed 40 characters")
          .optional(),
      })
      .optional(),
    downloads: z
      .array(
        z.object({
          id: z.number().optional(),
          title: z
            .string()
            .max(40, "Download title must not exceed 40 characters")
            .optional(),
          pdf: z.instanceof(File).nullable().optional(),
          download_link: z.array(z.string()).optional(),
        })
      )
      .optional(),
    more_info: z
      .array(
        z.object({
          id: z.number().optional(),
          title: z
            .string()
            .max(40, "More info title must not exceed 40 characters")
            .optional(),
          description: z
            .string()
            .max(160, "More info description must not exceed 160 characters")
            .optional(),
          button_text: z
            .string()
            .max(18, "Button text must not exceed 18 characters")
            .optional(),
          button_link: z.string().optional(),
        })
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Main brochure PDF is required
    if (!data.brochure_pdf && !data.remove_brochure_pdf) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Event Brochure PDF is required",
        path: ["brochure_pdf"],
      });
    }
  });
export type StepEightType = z.infer<typeof stepEightSchema>;

//#===step-9===#
export const stepNineSchema = z.object({
  step: z.number(),
  event_id: z.number(),
  faqs: z.array(
    z.object({
      id: z.number().optional(),
      question: z
        .string()
        .min(1, "Question is required")
        .max(160, "Question must not exceed 160 characters"),
      answer: z
        .string()
        .min(1, "Answer is required")
        .max(500, "Answer must not exceed 500 characters"),
    })
  ),
  deleted_faq_ids: z.array(z.number()).optional(),
});
export type StepNineType = z.infer<typeof stepNineSchema>;

//#===step-10===#
// Payment gateway schema (backend structure)
const paymentGatewaySchema = z.object({
  status: z
    .enum(["pending", "active", "under_review", "restricted"])
    .optional(),
  account_id: z.string().optional(),
  bank: z
    .object({
      bank_name: z.string().optional(),
      account_masked: z.string().optional(),
    })
    .optional(),
});

const paymentGatewaysSchema = z.object({
  stripe: paymentGatewaySchema.optional(),
  paypal: paymentGatewaySchema.optional(),
  truelayer: paymentGatewaySchema.optional(),
  worldpay: paymentGatewaySchema.optional(),
  klarna: paymentGatewaySchema.optional(),
});

export const stepTenSchema = z
  .object({
    step: z.literal(10),
    event_id: z.number(),
    payment_gateways: paymentGatewaysSchema.optional(),
    is_skipped: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    // Validate that at least one payment gateway is connected if not skipped
    if (!data.is_skipped) {
      const hasAnyGateway =
        data.payment_gateways?.stripe?.status ||
        data.payment_gateways?.paypal?.status ||
        data.payment_gateways?.truelayer?.status ||
        data.payment_gateways?.worldpay?.status ||
        data.payment_gateways?.klarna?.status;

      if (!hasAnyGateway) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Please connect at least one payment gateway or skip this step",
          path: ["payment_gateways"],
        });
      }
    }
  });

export type StepTenType = z.infer<typeof stepTenSchema>;

//#===step-11===#
export const stepElevenSchema = z
  .object({
    step: z.literal(11),
    event_id: z.number(),
    reminder_email_before_days: z.number().optional(),
    submit_type: z.enum(["duplicate", "submit"]),
    city: z.string().optional(),
    address: z.string().optional(),
    contact_number: z.string().optional(),
    domain: z.string().min(1, "Please select a domain for your website"),
    confirm_domain: z.boolean().refine((val) => val === true, {
      message: "Please confirm your domain selection to continue",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.submit_type === "duplicate") {
      if (!data.city || data.city.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "City is required when duplicating an event",
          path: ["city"],
        });
      }

      if (!data.address || data.address.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Address is required when duplicating an event",
          path: ["address"],
        });
      }

      if (!data.contact_number || data.contact_number.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Contact number is required when duplicating an event",
          path: ["contact_number"],
        });
      } else {
        // Validate that contact number contains only valid phone characters
        const phoneRegex = /^[0-9+\-() ]+$/;
        if (!phoneRegex.test(data.contact_number)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Contact number can only contain numbers and phone formatting characters (+, -, spaces, parentheses)",
            path: ["contact_number"],
          });
        }
      }
    }
  });

export type StepElevenType = z.infer<typeof stepElevenSchema>;

// //#===Preview Type===#
// export const OnBoardingPreviewSchema = z;

// export type OnBoardingPreviewType = z.infer<typeof OnBoardingPreviewSchema>;

//#===on-boarding-schema===#
export const onboardingSchema = z.object({
  activeStep: z.number().min(1).max(11),
  last_completed_step: z.number().min(1).max(11),
  stepOne: stepOneSchema,
  stepTwo: stepTwoSchema,
  stepThree: stepThreeSchema,
  stepFour: stepFourSchema,
  stepFive: stepFiveSchema,
  stepSix: stepSixSchema,
  stepSeven: stepSevenSchema,
  stepEight: stepEightSchema,
  stepNine: stepNineSchema,
  stepTen: stepTenSchema,
  stepEleven: stepElevenSchema,
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
