/**
 * Customer Support Tickets module
 */

export {
  customerSupportService,
  mapInboxDateToApiTime,
  buildCreateTicketFormData,
  buildStoreMessageFormData,
  CATEGORY_TO_API,
} from "./support.service";
export {
  mapCustomerSupportTicketToConversation,
  mapTicketDetailToConversation,
  flattenCustomerSupportMessages,
  mapRecentTicketToConversation,
  mapCategoryLabel,
  formatAttachmentSize,
  getCustomerMessagesPayload,
} from "./mappers";
export {
  customerSupportKeys,
  useCustomerSupportTickets,
  useCustomerSupportTicketMessages,
  useCustomerSupportTicketMessagesInfinite,
  useCreateCustomerSupportTicket,
  useStoreCustomerSupportMessage,
  useMarkCustomerSupportMessagesRead,
  CUSTOMER_SUPPORT_LIST_POLL_MS,
  CUSTOMER_SUPPORT_THREAD_POLL_MS,
} from "./query";
export type {
  CustomerSupportTicket,
  CustomerSupportTicketsParams,
  CustomerSupportTicketsResponse,
  CustomerSupportTicketStatus,
  CustomerSupportTicketPriority,
  CustomerSupportCategoryFilter,
  CustomerSupportSort,
  CustomerSupportTimeFilter,
  CustomerSupportQuickFilter,
  CreateCustomerSupportTicketPayload,
  CreateCustomerSupportTicketResponse,
  CustomerSupportMessagesParams,
  CustomerSupportMessagesResponse,
  CustomerSupportMessageGroup,
  CustomerSupportMessageItem,
  CustomerSupportTicketDetail,
  CustomerSupportTicketCustomer,
  CustomerSupportRecentTicket,
  StoreCustomerSupportMessagePayload,
  StoreCustomerSupportMessageResponse,
  MarkCustomerSupportMessagesReadData,
  MarkCustomerSupportMessagesReadResponse,
} from "./type";