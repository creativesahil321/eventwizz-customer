import { EventSchemaType } from "./schema";

export const initialData: EventSchemaType = {
  currentStep: 1,
  stepOne: {
    step: 1,
    vendor_location_id: 0,
    event_category_id: 0,
    event_name: "",
    event_banner_image: undefined as unknown as File,
    event_banner_video: undefined as unknown as File,
    event_banner_heading: "",
    event_banner_sub_heading: "",
    about_event_heading: "",
    about_event_sub_heading: "",
    about_event_description: "",
    event_schedular_title: "",
    event_schedular: [
      {
        title: "",
        time: "",
      },
    ],
    event_schedular_background_image: undefined as unknown as File,
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
    package_button_name: "",
    package_button_link: "",
    package_details: [
      {
        title: "",
      },
    ],
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
            title: "",
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
    faq_pdf: null,
    event_address: "",
    price_start_from: "",
    price_start_from_button_text: "",
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
    drink_title: "",
    drink_description: "",
    packages: [
      {
        title: "",
        description: "",
        price: 0,
        available_quantity: 0,
      },
    ],
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
    is_duplicate: false,
  },
};
