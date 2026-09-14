import { EventSchemaType } from "./schema";
import { MENU_CHOICES_REMINDER_DEFAULT_DAYS } from "@/app/(protected)/vendor/events/_lib/menu-choices-reminder-days";

export const initialData: EventSchemaType = {
  currentStep: 1,
  is_live: false,
  has_bookings: false,
  stepOne: {
    step: 1,
    vendor_location_id: 0,
    event_category_id: 0,
    event_name: "",
    event_banner_image: undefined as unknown as File,
    event_banner_video: undefined as unknown as File,
    about_event_image: undefined as unknown as File,
    event_banner_heading: "",
    event_banner_sub_heading: "",
    about_event_heading: "",
    about_event_sub_heading: "",
    about_event_description: "",
    event_address: "",
    latitude: undefined,
    longitude: undefined,
    location: {
      title: "LOCATION",
      description: "",
      icon: "MapPin",
    },
  },

  stepTwo: {
    step: 2,
    event_id: 0,
    is_rooms: 0,
    active_room_index: 0,
    rooms: [],
    package_image: null,
    package_title: "",
    package_description: "",
    package_details: [{ title: "Package 1" }],
    event_schedular_title: "",
    event_schedule_subtitle: "",
    event_schedular: [
      {
        title: "",
        time: "",
      },
    ],
    event_schedular_background_image: undefined as unknown as File,
  },

  stepThree: {
    step: 3,
    event_id: 0,
    vendor_location_id: undefined,
    dates: [
      {
        event_date: "",
        booking_type: "tickets",
        total_ticket_types: 1,
        total_table_types: 0,
        tickets: [
          {
            title: "",
            description: "",
            total_capacity: 0,
            price: 0,
          },
        ],
        tables: [],
      },
    ],
  },

  stepFour: {
    step: 4,
    event_id: 0,
    catering_option: 0,
    event_menu_category_id: 0,
    menu_title: "",
    menu_description: "",
    menus: [
      {
        name: "",
        items: [
          {
            title: "Item title 1",
            description: "",
          },
        ],
      },
    ],
    menu_background_image: null,
  },

  stepFive: {
    step: 5,
    event_id: 0,
    brochure_pdf: null,
    brochure_pdf_2: null,
    event_address: "",
    location: {
      title: "",
      description: "",
      icon: "",
    },
    downloads: [],
    more_info: [],
  },

  stepSix: {
    step: 6,
    event_id: 0,
    drinks_option: 0,
    drink_title: "",
    drink_description: "",
    packages: [],
  },
  stepSeven: {
    step: 7,
    event_id: 0,
    faqs: [
      {
        question: "",
        answer: "",
      },
    ],
  },

  stepEight: {
    step: 8,
    event_id: 0,
    submit_type: "draft" as "draft" | "active",
    address: "",
    city: "",
    reminder_email_before_days: 0,
    reminder_menu_choices_before_days: MENU_CHOICES_REMINDER_DEFAULT_DAYS,
    is_duplicate: false,
    duplicate_target_type: "existing" as "existing" | "new",
    vendor_location_id: undefined,
  },
};
