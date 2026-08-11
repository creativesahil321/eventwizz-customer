export const API_ENDPOINTS = {
  // Common Endpoints
  COMMON: {
    GET_COUNTRIES: "/auth/countries",
    GET_STATES_BY_ISO: "/auth/states-by-country-iso",
    PROFILE: {
      GET: "/profile",
      UPDATE: "/profile/update",
      UPDATE_PASSWORD: "/profile/update/password",
    },
    THEME: {
      SETTINGS: "/theme/settings",
    },
    CONTACT_STORE: "/contact/store",
    PERMISSIONS: {
      GET: "/auth/user/permissions",
    },
    LOCATION: {
      GET_EVENTS_AND_LOCATION_DATA: "/domain/{domain}/locations/{slug}",
      GET_EVENT_BY_SLUG: "/domain/{domain}/events/{slug}",
    },
    PUBLIC_SEARCH: {
      SEARCH: "/domain/{domain}/search",
      AVAILABILITY: "/domain/{domain}/availability",
      LOCATION_SEARCH: "/domain/{domain}/locations/{location_slug}/search",
    },
  },
  // Auth Endpoints
  AUTH: {
    REGISTER: "/auth/register",
    CREATE_ACCOUNT: "/auth/register/create-an-account",
    LOGIN: "/auth/login",
    SOCIAL_AUTH: "/social-auth/login/callback", // Single endpoint for OAuth login/register
    RESET_PASSWORD: "/auth/reset-password",
    FORGET_PASSWORD: "/auth/forgot-password",
    SEND_OTP: "/auth/register/send-otp-via-mail",
    VERIFY_OTP: "/auth/register/verify-otp",
    RESEND_OTP: "/auth/register/resend-otp",
    RESEND: "/email/verify/resend/",
  },

  // Vendor Endpoints
  VENDOR: {
    DASHBOARD: {
      STATISTICS: "/vendor/dashboard",
    },
    SUPPORT_TICKETS: {
      DASHBOARD: "/vendor/support-tickets/dashboard",
      LIST: "/vendor/support-tickets",
      STORE: "/vendor/support-tickets/store",
      MESSAGES: "/vendor/support-tickets/{ticketKey}/messages",
      MARK_MESSAGES_READ:
        "/vendor/support-tickets/{ticketKey}/messages/read",
      PIN: "/vendor/support-tickets/pin/{ticketKey}",
      ESCALATE: "/vendor/support-tickets/escalate/{ticketKey}",
      CLOSE: "/vendor/support-tickets/close/{ticketKey}",
      ASSIGN: "/vendor/support-tickets/assign/{ticketKey}",
      STORE_MESSAGE:
        "/vendor/support-tickets/{ticketKey}/messages/store",
    },
    ROOMS: "/vendor/rooms",
    ROOMS_STORE: "/vendor/rooms/store",
    ROOM_BY_ID: "/vendor/rooms/{room_id}",
    ONBOARDING: {
      STEPS: "/vendor/onboarding/store",
      CHECK_BRAND_NAME: "/vendor/onboarding/check-brand-name",
      GET_ALL_STEPS: "/vendor/onboarding/steps/{location_id}/{is_rooms}",
      PAYMENT_GATEWAYS: "/vendor/onboarding/payment-gateway-connect",
      PAYMENT_RETURN: "/vendor/onboarding/return",
      // Multi-room ("event spaces") endpoints. Same vendor onboarding surface, room-scoped.
      ROOMS: "/vendor/onboarding/rooms",
      ROOM_BY_ID: "/vendor/onboarding/rooms/{room_id}",
      ROOMS_TOGGLE: "/vendor/onboarding/rooms/multi-space",
      ROOM_STEP_STORE: "/vendor/onboarding/rooms/{room_id}/store",
    },
    PAYMENT_GATEWAYS: {
      GET_ALL: "/vendor/payment-gateway",
      ENABLE_DISABLE_PAYMENT_GATEWAY: "/vendor/payment-gateway/{id}/is-enabled",
      DISCONNECT: "/vendor/payment-gateway/disconnect",
      DELETE_PAYMENT_GATEWAY: "/vendor/payment-gateway/{id}",
      RETURN_URL: "/vendor/payment-gateway/return/{gateway}?account={account_id}",
    },
    GOCARDLESS: {
      CONNECT: "/vendor/gocardless/connect",
      ALLOW_AUTO_DEBIT: "/vendor/gocardless/allow-auto-debit",
    },
    EVENT: {
      GET_EVENTS: "/vendor/events",
      GET_EVENT: "/vendor/events/show/{eventId}/{is_rooms}",
      CREATE_EVENT: "/vendor/events/store",
      UPDATE_EVENT: "/vendor/events/update/{eventId}",
      DELETE_EVENT: "/vendor/events/delete/{eventId}",
      GET_CATEGORIES: "/vendor/event-categories",
      CREATE_CATEGORY: "/vendor/event-categories/store",
      GET_MENU_CATEGORIES: "/vendor/event-menus",
      CREATE_MENU_CATEGORY: "/vendor/event-menus/store",
      BULK_UPDATE_STATUS: "/vendor/events/bulk-update-status",
      BULK_DELETE: "/vendor/events/bulk-delete",
      GET_EVENT_OVERVIEW:
        "/vendor/events/{eventId}/overview?date_status={date_status}&date_filter={date_filter}",
      CHECK_EVENT_NAME: "/vendor/events/check-name",
    },
    TABLE_ASSIGNMENTS: {
      LIST: "/vendor/table-assignments",
      EXPORT: "/vendor/table-assignments/export",
      CONFIRM_BOOKING_DATE:
        "/vendor/table-assignments/booking-dates/{bookingDateId}/confirm",
      SEATING_PLAN_IMAGE:
        "/vendor/table-assignments/booking-dates/{bookingDateId}/seating-plan-image",
      DELETE_FINAL_ASSIGNMENT:
        "/vendor/table-assignments/booking-dates/{bookingDateId}/final-assignments",
    },

    EMAIL_TEMPLATES: {
      GET_ALL: "/vendor/email-templates",
      UPDATE: "/vendor/email-templates/{id}",
    },
    ROLES: {
      GET_ALL: "/vendor/roles",
      GET_UPDATE_ROLE_BY_ID: "/vendor/roles/find/{id}",
      UPDATE_ROLE: "/vendor/roles/update/{id}?_method=patch",
      ADD_NEW_ROLE: "/vendor/roles/store",
      GET_PERMISSIONS: "/vendor/permissions",
      DELETE_ROLE: "/vendor/roles/delete/{id}?_method=delete",
    },
    STAFF_MANAGEMENT: {
      GET_ALL_STAFF: "/vendor/staffs",
      GET_UPDATE_STAFF_BY_ID: "/vendor/staffs/find/{id}",
      UPDATE_STAFF: "/vendor/staffs/update/{id}?_method=patch",
      ADD_NEW_STAFF: "/vendor/staffs/store",
      DELETE_STAFF: "/vendor/staffs/delete/{id}?_method=delete",
      UPDATE_STAFF_STATUS: "/vendor/staffs/status/{id}/{slug}?_method=patch",
    },
    NEWSLETTER: {
      GET_ALL: "/vendor/newsletters",
      SHOW: "/vendor/newsletters/show/{id}",
      CREATE: "/vendor/newsletters/store",
      UPDATE: "/vendor/newsletters/update/{id}",
      DELETE: "/vendor/newsletters/delete/{id}",
      UNSUBSCRIBE: "/vendor/newsletters/unsubscribe/{email}",
    },
    DISCOUNTS: {
      GET_ALL: "/vendor/discounts",
      GET_BY_ID: "/vendor/discounts/{id}",
      /** Current header location: events → dates → rooms */
      EVENTS_WITH_DATES: "/vendor/discounts/events-with-dates",
      CREATE: "/vendor/discounts/store",
      UPDATE: "/vendor/discounts/update/{id}",
      UPDATE_STATUS: "/vendor/discounts/{id}/status",
      DELETE: "/vendor/discounts/delete/{id}",
    },
    SITES_ESSENTIALS: {
      GET: "/vendor/site-essentials",
      UPDATE: "/vendor/site-essentials/update",
      RESET_THEME_DEFAULT: "/vendor/site-essentials/reset-theme-default",
    },
    /** Public per-page CMS content for the vendor tenant site (SSR/SEO). */
    INFO_PAGES: "/vendor/info-pages",
    LOCATION: {
      SWITCH_LOCATION: "/vendor/locations/switch",
      GET_ALL: "/vendor/locations",
      GET_BY_ID: "/vendor/locations/{id}",
      CREATE: "/vendor/locations",
      UPDATE: "/vendor/locations/{id}",
      DELETE: "/vendor/locations/{id}",
      TOGGLE_LOCATION_STATUS: "/vendor/locations/toggle-status",
    },
    NOTIFICATIONS: {
      ALL: "/vendor/notifications",
      MARK_AS_READ_ALL: "/vendor/notifications/mark-as-read-all",
      MARK_AS_UNREAD: "/vendor/notifications/mark-as-unread/{id}",
      MARK_AS_READ: "/vendor/notifications/mark-as-read/{id}",
    },

    MENU_CHOICES: {
      GET_ALL: "/vendor/bookings/customer-menu-choices",
      ADD_MENU: "/vendor/bookings/menu-items/{id}/{date}/{table_id}",
      SAVE_MENU_CHOICES: "/vendor/bookings/menu-items/store",
      EXPORT_SINGLE_MENU_CHOICES_CSV:
        "/vendor/bookings/customer-menu-choices/{id}/export",
      EXPORT_BY_DATE: "/vendor/bookings/customer-menu-choices/export",
    },
    CUSTOMERS: {
      GET_ALL: "/vendor/customers",
      GET_BY_ID: "/vendor/customers/{id}",
      CREATE: "/vendor/customers/store",
      UPDATE: "/vendor/customers/update/{id}",
      DELETE: "/vendor/customers/delete/{id}",
      RESTORE: "/vendor/customers/restore/{id}",
      PERMANENT_DELETE: "/vendor/customers/permanent-delete/{id}",
      SEND_MAIL: "/vendor/customers/send-mail-to-customer",
      SEND_BULK_MAIL: "/vendor/customers/send-mail-to-all-customers",
      EXPORT_CSV: "/vendor/customers/export-csv",
      MULTIPLE_ACTIONS: {
        BULK_ACTIVATE: "/vendor/customers/bulk-activate",
        BULK_DEACTIVATE: "/vendor/customers/bulk-deactivate",
        BULK_DELETE: "/vendor/customers/bulk-delete",
        BULK_RESTORE: "/vendor/customers/bulk-restore",
      }
    },
    BOOKING_HISTORY: {
      GET_ALL: "/vendor/bookings",
      GET_BY_ID: "/vendor/bookings/show/{id}",
      CREATE: "/vendor/bookings/store",
      UPDATE: "/vendor/bookings/update/{id}",
      UPDATE_STATUS: "/vendor/bookings/update-status",
      DELETE: "/vendor/bookings/delete/{id}",
      ADD_ONS: {
        GET_ALL: "/vendor/bookings/add-ons/{id}/{date}",
        SAVE: "/vendor/bookings/add-ons/store",
        DELETE_ADD_ONS:
          "/vendor/bookings/delete-add-ons/{id}/{date}/{keyword}/{type}", // TABLES case = keyword will be tables size and type will be tables , DRINKS case = keyword will be id and type will be drinks , TICKETS case = keyword will be id and type will be tickets
      },
      MENU_CHOICES: {
        GET_ALL: "/vendor/bookings/menu-items/{id}",
        ADD_MENU: "/vendor/bookings/menu-items/{id}/{table_id}",
        SAVE_MENU_CHOICES: "/vendor/bookings/menu-items/store",
        EXPORT_MENU_CHOICES:
          "/vendor/bookings/exports/menu-choices/{id}/{date}",
      },
      RESCHEDULE_BOOKING: {
        GET_DATA: "/vendor/bookings/reschedule/{booking_id}/{date_id}",
        WITH_DATE:
          "/vendor/bookings/reschedule/{booking_id}/{date_id}/{new_date_id}",
        SAVE: "/vendor/bookings/reschedule/store",
      },

      NOTES: {
        CREATE: "/vendor/bookings/show/{id}/comments",
      },
      MULTIPLE_ACTIONS: {
        BULK_EMAIL_SEND: "/vendor/bookings/bulk-email",
        BULK_EXPORT: "/vendor/bookings/bulk-export",
        BULK_DELETE: "/vendor/bookings/bulk-delete",
      }
    },
    EMAIL_LOGS: {
      GET_ALL: "vendor/email-logs",
      DELETE: "/vendor/email-logs/delete/{id}",
      RESEND: "/vendor/email-logs/resend",
      BULK_DELETE: "/vendor/email-logs/bulk-delete",
    },
    TRANSACTIONS: {
      GET_ALL: "/vendor/transactions",
      GET_SINGLE_RECEIPT: "/vendor/transactions/{id}/receipt",
      EXPORT_ALL_RECEIPTS_CSV: "/vendor/transactions/export",
    },
  },

  // Customer EndpointsD
  CUSTOMER: {
    DASHBOARD: {
      STATISTICS: "/customer/dashboard",
      NEARBY_EVENTS: "/customer/events/nearby",
    },
    BOOKINGS: {
      BOOKINGS: "/customer/bookings",
      BOOKING_DETAILS: "/customer/bookings/show/{id}",
      ADD_ONS_DETAILS: "/customer/bookings/add-ons/{id}/{room_id}/{date}",
      /** Flat events (no room system) — same shape as vendor add-ons GET. */
      ADD_ONS_DETAILS_FLAT: "/customer/bookings/add-ons/{id}/{date}",
      RESCHEDULE_BOOKING:
        "/customer/bookings/reschedule/{booking_id}/{date_id}",
      RESCHEDULE_BOOKING_WITH_DATE:
        "/customer/bookings/reschedule/{booking_id}/{date_id}/{new_date_id}",
      SAVE_RESCHEDULE_BOOKING: "/customer/bookings/reschedule/store",
      SAVE_ADDONS: "/customer/bookings/add-ons/store",
      DELETE_ADD_ONS:
        "/customer/bookings/delete-add-ons/{id}/{date}/{keyword}/{type}", // TABLES case = keyword will be tables size and type will be tables , DRINKS case = keyword will be id and type will be drinks , TICKETS case = keyword will be id and type will be tickets
      BOOKING_PAYMENT: "/customer/bookings/pay",
      BOOKING_INVOICE: "/customer/bookings/invoice/{id}",
    },
    PAYMENT: {
      STRIPE_SUCCESS: "/customer/payment/stripe/success",
    },
    MENU_CHOICES: {
      ADD_MENU: "/customer/bookings/menu-items/{id}/{date}/{table_id}",
      /** Multi-room events — room_id scopes menu items to the correct room/date. */
      ADD_MENU_ROOM:
        "/customer/bookings/menu-items/{id}/{room_id}/{date}/{table_id}",
      SAVE_MENU_CHOICES: "/customer/bookings/menu-items/store",
    },

    NOTIFICATIONS: {
      ALL: "/customer/notifications",
      MARK_AS_READ_ALL: "/customer/notifications/mark-as-read-all",
      MARK_AS_UNREAD: "/customer/notifications/mark-as-unread/{id}",
      MARK_AS_READ: "/customer/notifications/mark-as-read/{id}",
    },

    BOOK_EVENT: {
      STORE_CART_DATA: "/customer/event/store", // This is for to store the cart data and event booking data in database
      GET_CART_DATA: "/customer/event", // This is for to get the cart data from database and show in the cart page
      DELETE_ALL_CART_DATA: "/customer/event/delete",
      DELETE_CART_DATA: "/customer/event/delete/{date}", // Non-room events: delete one date from cart
      DELETE_CART_DATA_ROOM:
        "/customer/event/delete/{room_id}/{date}", // Room events: delete one date for a specific room
      CHECKOUT: "/customer/event/checkout", // Create booking + payment credentials
      CHECKOUT_RESUME: "/customer/event/checkout/resume", // Resume unpaid booking; optional payment_gateway to switch
      CHECKOUT_BOOKING: "/customer/event/checkout/{bookingId}",
    },

    TRANSACTIONS: {
      GET_ALL:
        "/customer/transactions?page={page}&per_page={per_page}&search={search}&status={status}&payment_date={payment_date}&method={method}",
    },

    SUPPORT_TICKETS: {
      LIST: "/customer/support-tickets",
      STORE: "/customer/support-tickets/store",
      LOCATIONS: "/customer/support-tickets/locations",
      MESSAGES: "/customer/support-tickets/{ticketKey}/messages",
      STORE_MESSAGE: "/customer/support-tickets/{ticketKey}/messages/store",
      MARK_MESSAGES_READ:
        "/customer/support-tickets/{ticketKey}/messages/read",
    },
  },
  // Admin Endpoints
  ADMIN: {
    DASHBOARD: {
      PAGINATE: "",
      STATISTICS: "/admin/dashboard",
    },
    SITES_ESSENTIALS: {
      GET: "/admin/site-essentials",
      UPDATE: "/admin/site-essentials/update",
      RESET_THEME_DEFAULT: "/admin/site-essentials/reset-theme-default",
    },
    /** Public per-page CMS content for the main admin marketing site (SSR/SEO). */
    INFO_PAGES: "/admin/info-pages",
    /** Default platform commission; per-venue overrides live on venue detail (PUT /admin/venues/{id}). */
    PAYMENT_SETTINGS: {
      GET_COMMISSION: "/admin/payment-settings/commission",
      UPDATE_COMMISSION: "/admin/payment-settings/commission",
    },
    VENUES: {
      ALL: "/admin/venues?status={status}&search={search}",
      GET_BY_ID: "/admin/venues/{id}",
      CREATE: "/admin/venues/store",
      UPDATE: "/admin/venues/{id}",
      /** Per-venue Stripe Connect fee override (PUT body: venue_commission_mode, venue_commission_value). */
      VENUE_COMMISSION: "/admin/venues/{id}/venue-commission",
      DELETE: "/admin/venues/delete/{id}",
      RESTORE: "/admin/venues/restore/{id}",
      PERMANENT_DELETE: "/admin/venues/permanent-delete/{id}",
      APPROVE_DOMAIN: "/admin/venues/{id}/domain/approve",
      DISAPPROVE_DOMAIN: "/admin/venues/{id}/domain/disapprove",
      COMMENTS: "/admin/venues/{id}/comments",
      COMMENT: "/admin/venues/{id}/comments/{commentId}",
      RESET_PASSWORD: "/admin/venues/{id}/reset-password",
      FORCE_LOGOUT: "/admin/venues/{id}/force-logout",
    },
    EVENTS: {
      SHOW: "/admin/events/{eventId}",
      APPROVE_DATE_CANCELLATION:
        "/admin/events/{eventId}/dates/{dateId}/approve-cancellation",
    },
    IMPERSONATION: {
      START: "/admin/impersonate/vendor",
      EXIT: "/admin/impersonate/exit",
    },
    USER: {
      ALL: "/admin/users/all",
      ACTIVE: "/admin/users/active",
      DISABLED: "/admin/users/disabled",
      NOTIFICATION: "/admin/users/notification",
    },
    SUPPORT_TICKETS: {
      DASHBOARD: "/admin/support-tickets/dashboard",
      LIST: "/admin/support-tickets",
      MESSAGES: "/admin/support-tickets/{ticketKey}/messages",
      MARK_MESSAGES_READ:
        "/admin/support-tickets/{ticketKey}/messages/read",
      PIN: "/admin/support-tickets/pin/{ticketKey}",
      ASSIGN: "/admin/support-tickets/assign/{ticketKey}",
      CLOSE: "/admin/support-tickets/close/{ticketKey}",
      STORE_MESSAGE:
        "/admin/support-tickets/{ticketKey}/messages/store",
      PAGINATE: "/admin/tickets/paginate",
      STATISTICS: "/admin/tickets/statics",
      ALL: "/admin/tickets/paginate",
      CREATE: "/admin/tickets/create",
      UPDATE_STATUS: "/admin/tickets/status",
      ASSIGN_TO: "/admin/tickets/assign_to/{key}",

      TICKET: "/admin/tickets/show/{key}",
      TICKET_MESSAGES: "/admin/tickets/{key}/messages",
      TICKET_ADD_MESSAGES: "/admin/tickets/{key}/messages/store",
      TICKET_ADD_ATTACHMENT: "/admin/tickets/{key}/messages/attachment",
      TICKET_UPDATE_STATUS: "/admin/tickets/status/{key}",
    },
    KYC: {
      KYC_MANAGEMENT: "/admin/kyc-management",
      PENDING: "/admin/kyc/pending",
      REJECTED: "/admin/kyc/rejected",
      FORM: "/admin/kyc/form",
      ALL: "/admin/kyc",
      PAGINATE: "/admin/kyc",
      STATISTICS: "/admin/kyc/statics",
      CHANGE_STATUS: "/admin/kyc/change-status/",
      DETAILS: "/admin/kyc/kyc-detail/",
      DOWNLOAD: "/admin/kyc/kyc-download/",
      DRAFT: "/admin/kyc/change-status",
    },
    TRADES_HISTORY: {
      PAGINATE: "/admin/trading-pnl",
      UPLOAD_CSV: "/admin/trading-pnl/upload-csv",
      UPDATE: "/admin/trading-pnl/update", //{id}
      DELETE: "/admin/trading-pnl/delete",
    },
    HISTORY_CALENDAR: {
      GET_ALL: "/admin/transaction-history-calendars",
    },
    INTERNAL_TRANSFER: {
      PAGINATE: "/admin/transactions/internal-transfer-requests",
      PENDING: "/admin/transactions/internal-transfer-requests/pending",
      APPROVE: "/admin/transactions/internal-transfer-requests/approve",
      RECALL: "/admin/transactions/internal-transfer-requests/recall",
      REJECT: "/admin/transactions/internal-transfer-requests/reject",
      STATISTICS: "/admin/transactions/internal-transfer-requests/statistics",
    },
    TRANSACTIONS: {
      ALL: "/admin/transactions",
      INTERNAL_TRANSFER: "/admin/transactions/internal-transfer-requests",
      INTERNAL_TRANSFER_MANAGEMENT: "/admin/internal-transfer",

      HISTORY: "/admin/transactions",
      STATISTICS: "/admin/transaction-history/static",
      EXPORT: "/admin/transactions/export",

      RECEIPT: "/admin/transactions/{payment_id}/receipt",
      EXPORT_TRANSACTIONS: "/admin/transactions/export",
    },
    DEPOSITS: {
      AUTO_METHOD: {
        ADD: "/admin/deposit/methods/store",
        LIST: "/admin/deposit/methods",
        UPDATE: "/admin/deposit/methods/update/",
        DELETE: "/admin/deposit/methods/delete/",
      },
      METHOD: {
        AUTO: "",
        MANUAL: "",
      },
      MANUAL: {
        PENDING: "/admin/deposit/manual/pending",
        HISTORY: "/admin/deposit/history",
      },
      HISTORY: {
        PAGINATE: "/admin/deposit/history",
      },
      ALL_HISTORY: {
        PAGINATE: "/admin/deposit/all-history",
      },
      MANUAL_DEPOSIT_HISTORY: {
        PAGINATE: "/admin/deposit/manual-deposit-history",
      },
    },
    WITHDRAW: {
      UPDATE_REQUEST: "/admin/withdraws/approve-or-decline-request",
      HISTORY: "/admin/withdraws/history",
      AUTO_METHOD: {
        LIST: "/admin/withdraws/methods",
        ADD: "/admin/withdraws/methods/store",
        UPDATE: "/admin/withdraws/methods/update/",
        DELETE: "/admin/withdraws/methods/delete/",
      },
      SCHEDULE: {
        LIST: "/admin/withdraws/schedule/days-list",
        ADD: "/admin/withdraw/schedule/store",
        UPDATE: "/admin/withdraws/schedule/day/update-status",
        DELETE: "/admin/withdraw/schedule/delete/",
      },
      PENDING: "/admin/withdraw/pending",
      ALL_HISTORY: {
        PAGINATE: "/admin/withdraws/all-history",
      },
    },
    MANUAL_PROFIT_HISTORY: {
      PAGINATE: "/admin/trading-pnl",
    },
    WALLETS: {
      ALL: "/admin/wallets",
      PAGINATE: "/admin/wallets",
      LIST: "/admin/wallets/get-all-wallets-with-balance",
      LIST_WALLET: "/admin/wallets/get-total-active-trading-wallet-balance",

      ADDRESSES: "/admin/withdraws/client-withdraw-wallet-addresses-overview",
      VERIFY: "/admin/withdraws/verify-requested-wallet-address",
    },
    COMMISSION: {
      LIST: "/admin/commission",
      HISTORY: "admin/manual-commission-history",
    },
    COMMISSIONS: {
      LIST: "/admin/commissions",
      EXPORT: "/admin/commissions/export",
    },
    SYSTEM_LOGS: {
      LIST: "/admin/systemlogs",
    },
    PROFILE: {
      GET: "/admin/profile",
      UPDATE_AVATAR: "/admin/profile/update/avatar",
      UPDATE: "/admin/profile/update",
      DELETE_AVATAR: "/admin/profile/avatar/delete",
    },
    HISTORY: {
      LIST: "/admin/history/list",
    },
    REFERRAL: {
      LEVEL: {
        INDEX: "/admin/referral/level",
      },
      INDEX: "/admin/referral",
    },
    RANKING: {
      PAGINATE: "/admin/user-rankings/list",
      ADD: "/admin/user-rankings/store",
      DELETE: "/admin/user-rankings/delete",
      SHOW: "/admin/user-rankings/find",
      UPDATE: "/admin/user-rankings/update",
    },
    CLIENTS_MANAGEMENT: {
      PAGINATE: "/admin/clients/list",
      LIST: "/admin/clients/all",
      ADD: "/admin/clients/store",
      DELETE: "/admin/clients/delete",
      SHOW: "/admin/clients/find",
      UPDATE: "/admin/clients/update",
    },
    FAQ: {
      PAGINATE: "/admin/faqs",
      ADD: "/admin/faqs/store",
      DELETE: "/admin/faqs/delete",
      SHOW: "/admin/faqs/find",
      UPDATE: "/admin/faqs/update",
    },
    SUBSCRIBERS: {
      ALL: "/admin/subscribers",
      SUBSCRIBER: "/subscriber",
      SEND: "/admin/subscribers/send-mail-to-all",
    },
    SCREEN_MESSAGE: {
      PAGINATE: "/admin/screen-message",
      ADD: "/admin/screen-message/store",
      DELETE: "/admin/screen-message/delete",
      SHOW: "/admin/screen-message/find",
      UPDATE: "/admin/screen-message/update",
    },
    MANAGE_REFERRALS: {
      PAGINATE: "/admin/bounty-levels/list",
      STORE: "/admin/bounty-levels/store",

      ADD: "/admin/bounty-levels/store",
      UPDATE: "/admin/bounty-levels/update/",
      DELETE: "/admin/bounty-levels/delete",
      SHOW: "/admin/bounty-levels/find/",
    },
    PROFIT_DISTRIBUTION_HISTORY: {
      PAGINATE: "/admin/profit-distribution-history",
      STATISTICS: "/admin/profit-distribution-history/static",
    },
    COMMISSION_DISTRIBUTION_HISTORY: {
      PAGINATE: "/admin/commission-history",
      STATISTICS: "/admin/commission-history/static",
    },
    REFERRALS: {
      PAGINATE: "/admin/referrals",
      ADD: "/admin/referrals/store",
      UPDATE: "/admin/referrals/update/",
      DELETE: "/admin/referrals/delete",
      PERMISSIONS: "/admin/referrals/permissions",
      SHOW: "/admin/referrals/find/",
    },
    PERMISSIONS: {
      PAGINATE: "/admin/permissions",
      CAN: "/auth/user/can",
      USER_PERMISSIONS: "/auth/user/permissions",
    },
    STAFF: {
      PAGINATE: "/admin/staffs",
      ADD: "/admin/staffs/store",
      UPDATE: "/admin/staffs/update",
      DELETE: "/admin/staffs/delete",
      SHOW: "/admin/staffs/find/",
    },
    EMAIL_TEMPLATES: {
      GET_ALL: "/admin/email-templates",
      GET_BY_ID: "/admin/email-templates/{id}",
      CREATE: "/admin/email-templates",
      UPDATE: "/admin/email-templates/{id}",
      DELETE: "/admin/email-templates/{id}",
      SEND: "/admin/email-templates/{id}/send",
    },
    SETTINGS: {
      ALL: "/admin/settings",
      UPDATE: "/admin/settings/update",
      UPDATE_LOGO: "/admin/settings/upload-files",
      UPDATE_FAVICON: "/admin/settings/upload-files",
      NIDHI_WALLET: "/admin/wallets/get-all-wallets-with-balance",
      ADD_BALANCE_TO_NIDHI_WALLET: "/admin/wallets/add-balance-to-nidhi-wallet",
    },
    PROFIT_WALLET: {
      ALL: "/admin/profit-transfer/schedule-task/list",
      STORE: "/admin/profit-transfer/schedule-task",
      RECALL: "/admin/profit-transfer/recall-task/",
      MANUAL_PROFIT_HISTORY: {
        PAGINATE: "/admin/manual-profit-history",
      },
    },
    NOTIFICATIONS: {
      ALL: "/admin/notifications/paginate",
      MARK_AS_READ: "/admin/notifications/mark-as-read/{id}",
      MARK_AS_UNREAD: "/admin/notifications/mark-as-unread/{id}",
      MARK_AS_READ_ALL: "/admin/notifications/mark-as-read-all",
      MARK_ALL_AS_READ: "/admin/notifications/mark-as-read-all",
    },
    LANGUAGES: {
      ALL: "/admin/languages",
      ADD: "/admin/languages/store",
      UPDATE: "/admin/languages/update/",
      DELETE: "/admin/languages/delete/{id}",
    },
    ROLES: {
      GET_ALL: "/admin/roles",
      GET_UPDATE_ROLE_BY_ID: "/admin/roles/find/{id}",
      UPDATE_ROLE: "/admin/roles/update/{id}?_method=patch",
      ADD_NEW_ROLE: "/admin/roles/store",
      GET_PERMISSIONS: "/admin/permissions",
      DELETE_ROLE: "/admin/roles/delete/{id}?_method=delete",
    },
    STAFF_MANAGEMENT: {
      GET_ALL_STAFF: "/admin/staffs",
      GET_UPDATE_STAFF_BY_ID: "/admin/staffs/find/{id}",
      UPDATE_STAFF: "/admin/staffs/update/{id}?_method=patch",
      ADD_NEW_STAFF: "/admin/staffs/store",
      DELETE_STAFF: "/admin/staffs/delete/{id}?_method=delete",
      UPDATE_STAFF_STATUS: "/admin/staffs/status/{id}/{slug}?_method=patch",
    },
  },

  // Public Endpoints
  PUBLIC: {
    FAQS: "",
    SUBSCRIBE: "/subscribe",
  },
};
