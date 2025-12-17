import { OnboardingFormData } from "./schema";

export const defaultValues: OnboardingFormData = {
  activeStep: 1,
  last_completed_step: 1,
  stepOne: {
    step: 1,
    name: "",
    contact_number: "",
    email: "",
    address: "",
    domain: "",
    description: "",
    city: "",
  },
  stepTwo: {
    step: 2,
    logo: null,
    cover_image: null,
    banner_heading: "",
    banner_sub_heading: "",
    about_title: "",
    about_description: "",
    about_link_title: "",
  },
  stepThree: {
    step: 3,
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
    // gallery: [],
  },
  stepFour: {
    step: 4,
    event_id: 0,
    package_image: null,
    package_title: "",
    package_description: "",
    package_button_name: "",
    package_details: [
      {
        title: "",
      },
    ],
  },
  stepFive: {
    step: 5,
    event_id: 0,
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
            total_capacity: "",
            price: "",
          },
        ],
        tables: [],
      },
    ],
  },
  stepSix: {
    step: 6,
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
  },

  stepSeven: {
    step: 7,
    event_id: 0,
    drink_title: "",
    drink_description: "",
    packages: [
      {
        title: "",
        description: "",
        price: 0,
        available_quantity: 100,
      },
    ],
  },

  stepEight: {
    step: 8,
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
  stepNine: {
    step: 9,
    event_id: 0,
    faqs: [
      {
        question: "",
        answer: "",
      },
    ],
  },
  stepTen: {
    step: 10,
    event_id: 0,
    payment_gateways: {
      stripe: {
        status: undefined,
        account_id: "",
      },
      paypal: {
        status: undefined,
        account_id: "",
      },
      truelayer: {
        status: undefined,
        account_id: "",
        bank: {
          bank_name: undefined,
          account_masked: undefined,
        },
      },
      worldpay: {
        status: undefined,
        account_id: "",
      },
      klarna: {
        status: undefined,
        account_id: "",
      },
    },
    is_skipped: false,
  },
  stepEleven: {
    step: 11,
    event_id: 0,
    submit_type: "submit" as "duplicate" | "submit",
    address: "",
    city: "",
    reminder_email_before_days: 0,
    domain: "",
    confirm_domain: false,
  },
};
