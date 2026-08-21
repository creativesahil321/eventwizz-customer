export interface EventData {
  slug: string;
  name: string;
  date: string;
  location: string;
  image: string;
  ticketType: string;
  quantity: number;
  price: number;
  total: number;
}

export interface CheckoutPageProps {
  searchParams: Promise<{
    eventSlug?: string;
    eventDate?: string;
    ticketType?: string;
    quantity?: string;
  }>;
}

export interface User {
  account_type: string;
  active_role: string;
  token: string;
}

export interface CheckoutFormProps {
  eventData: EventData;
}

export interface OrderSummaryProps {
  eventData?: EventData;
}

export interface CheckoutHeaderProps {
  settings?: {
    logo?: string;
    name?: string;
    colors?: {
      header?: string;
      footer?: string;
      primary?: string;
      text?: string;
    };
  };
}
