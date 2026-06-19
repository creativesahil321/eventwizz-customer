export interface SummaryResponse {
  summary: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface GenerateSummaryOptions {
  title: string;
  currentDescription?: string;
  ctaText?: string;
  ctaUrl?: string;
  style?: "professional" | "casual" | "formal";
  tone?: "business" | "friendly" | "technical";
  eventType?: string;
  targetAudience?: string;
  duration?: string;
}
