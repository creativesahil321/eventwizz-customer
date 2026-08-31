import type {
  AIEventGeneratedContent,
} from "@/app/api/ai/generate-event/route";

export type EventImportSectionId =
  | "stepTwo"
  | "stepThree"
  | "stepFour"
  | "stepFive"
  | "stepSix"
  | "stepSeven";

export interface EventImportRequestBody {
  url: string;
  rewrite?: boolean;
}

export interface EventImportAssets {
  banner?: string;
  bannerVideo?: string;
  package?: string;
  schedulerBackground?: string;
  menuBackground?: string;
  gallery: string[];
}

export interface EventImportRoomCandidate {
  name: string;
  description?: string;
}

export interface EventImportResult {
  sourceUrl: string;
  content: AIEventGeneratedContent;
  eventTypeSuggestion: string;
  assets: EventImportAssets;
  roomCandidates: EventImportRoomCandidate[];
  missingSections: EventImportSectionId[];
  warnings: string[];
  rewritten: boolean;
}

export interface EventImportErrorBody {
  error: string;
  code?:
    | "invalid_url"
    | "fetch_failed"
    | "blocked"
    | "no_content"
    | "timeout"
    | "server_error";
  hint?: string;
}
