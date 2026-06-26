/**
 * Theme Detection Utility
 * Detects event category themes and returns appropriate animation configurations.
 * Supports 22 event categories with unique visual effects per theme.
 */

export type ThemeType =
  | "christmas"
  | "new_year"
  | "halloween"
  | "valentines"
  | "easter"
  | "bottomless_brunch"
  | "lipstick_powder_paint"
  | "live_music"
  | "dj_club"
  | "comedy"
  | "drag_shows"
  | "themed_parties"
  | "food_drink"
  | "street_food"
  | "pride"
  | "afrobeats"
  | "day_raves"
  | "open_mic"
  | "networking"
  | "workshops"
  | "diwali"
  | "eid"
  | "none";

// ThemeAnimation interface removed — animation configs are now in ./theme-configs.ts

/** Display metadata for each theme — used in admin settings dropdown */
export interface ThemeOption {
  value: ThemeType;
  label: string;
  emoji: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Admin-facing theme options (dropdown / preview)
// ---------------------------------------------------------------------------

export const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "christmas",
    label: "Christmas Events",
    emoji: "🎄",
    description: "Snowfall, twinkling lights, Santa & gift decorations",
  },
  {
    value: "new_year",
    label: "New Year Parties",
    emoji: "🎆",
    description: "Fireworks, champagne bubbles, countdown sparkles",
  },
  {
    value: "halloween",
    label: "Halloween Events",
    emoji: "🎃",
    description: "Fog effects, spooky floats, flickering jack-o-lanterns",
  },
  {
    value: "valentines",
    label: "Valentine's Day Specials",
    emoji: "💕",
    description: "Floating hearts, rose petals, romantic sparkles",
  },
  {
    value: "easter",
    label: "Easter Events",
    emoji: "🐰",
    description: "Pastel confetti, spring flowers, egg decorations",
  },
  {
    value: "bottomless_brunch",
    label: "Bottomless Brunch",
    emoji: "🥂",
    description: "Champagne bubbles, brunch vibes, golden shimmer",
  },
  {
    value: "lipstick_powder_paint",
    label: "Lipstick Powder & Paint",
    emoji: "💄",
    description: "Glitter particles, glamour shimmer, sparkle dust",
  },
  {
    value: "live_music",
    label: "Live Music & Gigs",
    emoji: "🎸",
    description: "Sound wave pulses, floating music notes, stage lights",
  },
  {
    value: "dj_club",
    label: "DJ Nights & Club Events",
    emoji: "🎧",
    description: "Neon laser beams, beat pulses, strobe flashes",
  },
  {
    value: "comedy",
    label: "Comedy Shows",
    emoji: "😂",
    description: "Spotlight effects, theatre masks, star bursts",
  },
  {
    value: "drag_shows",
    label: "Drag Shows & Brunches",
    emoji: "👠",
    description: "Rainbow glitter, sparkle rain, glamour shimmer",
  },
  {
    value: "themed_parties",
    label: "Themed Parties",
    emoji: "🎭",
    description: "Confetti bursts, party streamers, celebration sparkles",
  },
  {
    value: "food_drink",
    label: "Food & Drink Festivals",
    emoji: "🍻",
    description: "Steam wisps, golden bubbles, festive confetti",
  },
  {
    value: "street_food",
    label: "Street Food Markets",
    emoji: "🌮",
    description: "Warm glow particles, market lights, steam effects",
  },
  {
    value: "pride",
    label: "Pride Events",
    emoji: "🏳️‍🌈",
    description: "Rainbow gradient particles, pride confetti, sparkle rain",
  },
  {
    value: "afrobeats",
    label: "Afrobeats / Bashment Nights",
    emoji: "🥁",
    description: "Fire energy particles, beat pulses, warm glow",
  },
  {
    value: "day_raves",
    label: "Day Raves / Outdoor Parties",
    emoji: "☀️",
    description: "Sun ray beams, energy particles, neon confetti",
  },
  {
    value: "open_mic",
    label: "Open Mic & Spoken Word",
    emoji: "🎤",
    description: "Spotlight glow, word particles, soft sparkles",
  },
  {
    value: "networking",
    label: "Networking & Business Events",
    emoji: "💼",
    description: "Professional glow, connection lines, subtle sparkles",
  },
  {
    value: "workshops",
    label: "Workshops & Masterclasses",
    emoji: "📚",
    description: "Light bulb glow, creative sparks, idea particles",
  },
  {
    value: "diwali",
    label: "Diwali",
    emoji: "🪔",
    description: "Diya flame flickers, firework bursts, rangoli sparkles",
  },
  {
    value: "eid",
    label: "Eid",
    emoji: "🌙",
    description: "Crescent moon glow, star twinkle, lantern shimmer",
  },
  {
    value: "none",
    label: "No Theme",
    emoji: "🚫",
    description: "No animations",
  },
];

// ---------------------------------------------------------------------------
// Keyword detection rules — ORDER MATTERS.
// More-specific multi-word phrases are checked first so they aren't swallowed
// by a later, broader single-word rule.
// ---------------------------------------------------------------------------

const THEME_DETECTION_RULES: { theme: ThemeType; keywords: string[] }[] = [
  /* ── Highly specific multi-word names ─────────────────────────────── */
  {
    theme: "lipstick_powder_paint",
    keywords: [
      "lipstick powder",
      "lipstick powder & paint",
      "lipstick powder and paint",
      "lipstick-powder",
      "powder & paint",
      "powder and paint",
    ],
  },
  {
    theme: "bottomless_brunch",
    keywords: [
      "bottomless brunch",
      "bottomless-brunch",
      "bottomless prosecco",
      "bottomless mimosa",
      "bottomless cocktail",
      "boozy brunch",
      "brunch party",
    ],
  },
  {
    theme: "drag_shows",
    keywords: [
      "drag show",
      "drag brunch",
      "drag queen",
      "drag king",
      "drag night",
      "drag bingo",
      "drag-show",
      "drag-brunch",
      "rupaul",
    ],
  },
  {
    theme: "street_food",
    keywords: [
      "street food",
      "street-food",
      "food market",
      "food-market",
      "night market",
      "market stall",
      "food truck",
    ],
  },
  {
    theme: "open_mic",
    keywords: [
      "open mic",
      "open-mic",
      "spoken word",
      "spoken-word",
      "poetry night",
      "poetry slam",
      "mic night",
    ],
  },
  {
    theme: "day_raves",
    keywords: [
      "day rave",
      "day-rave",
      "outdoor party",
      "outdoor rave",
      "outdoor-party",
      "day party",
      "daylight rave",
      "garden party",
      "rooftop party",
      "pool party",
    ],
  },
  {
    theme: "afrobeats",
    keywords: [
      "afrobeats",
      "afro beats",
      "afro-beats",
      "bashment",
      "dancehall",
      "soca",
      "afro house",
      "afrohouse",
      "amapiano",
      "afro night",
    ],
  },

  /* ── Music / Entertainment (multi-word) ──────────────────────────── */
  {
    theme: "dj_club",
    keywords: [
      "dj night",
      "dj-night",
      "club night",
      "club event",
      "club-night",
      "nightclub",
      "house music",
      "techno night",
      "drum and bass",
      "dnb night",
      "rave night",
      "dance night",
      "edm night",
      "disco night",
    ],
  },
  {
    theme: "live_music",
    keywords: [
      "live music",
      "live-music",
      "live gig",
      "live band",
      "live performance",
      "concert",
      "gig night",
      "acoustic",
      "live session",
      "music gig",
      "gigs",
    ],
  },
  {
    theme: "food_drink",
    keywords: [
      "food festival",
      "food-festival",
      "drink festival",
      "beer festival",
      "wine tasting",
      "gin festival",
      "food & drink",
      "food and drink",
      "craft beer",
      "cocktail festival",
      "tasting event",
    ],
  },
  {
    theme: "networking",
    keywords: [
      "networking",
      "business event",
      "business networking",
      "professional event",
      "conference",
      "summit",
      "business meet",
      "industry event",
      "corporate event",
    ],
  },
  {
    theme: "workshops",
    keywords: [
      "workshop",
      "masterclass",
      "master class",
      "training session",
      "bootcamp",
      "seminar",
      "tutorial",
      "learning event",
      "skill share",
    ],
  },
  {
    theme: "themed_parties",
    keywords: [
      "themed party",
      "themed-party",
      "costume party",
      "fancy dress",
      "masquerade",
      "theme night",
      "retro party",
      "neon party",
      "glow party",
      "80s party",
      "90s party",
      "themed event",
    ],
  },
  {
    theme: "comedy",
    keywords: [
      "comedy show",
      "comedy night",
      "comedy club",
      "comedy-show",
      "stand up",
      "stand-up",
      "standup",
      "comedian",
      "comedy",
      "improv",
      "sketch show",
    ],
  },

  /* ── Seasonal / Holiday events ───────────────────────────────────── */
  {
    theme: "christmas",
    keywords: [
      "christmas",
      "xmas",
      "x-mas",
      "festive",
      "santa",
      "advent",
      "carol",
      "winter wonderland",
      "jingle",
      "noel",
      "yuletide",
    ],
  },
  {
    theme: "new_year",
    keywords: [
      "new year",
      "new-year",
      "nye",
      "new years eve",
      "new year's",
      "countdown",
      "hogmanay",
    ],
  },
  {
    theme: "halloween",
    keywords: [
      "halloween",
      "spooky",
      "haunted",
      "trick or treat",
      "fright night",
      "scary",
      "horror night",
      "zombie",
    ],
  },
  {
    theme: "valentines",
    keywords: [
      "valentine",
      "valentines",
      "valentine's",
      "galentine",
      "romantic night",
      "love night",
      "couples night",
    ],
  },
  {
    theme: "easter",
    keywords: [
      "easter",
      "egg hunt",
      "easter bunny",
      "spring celebration",
      "good friday",
      "easter brunch",
    ],
  },

  /* ── Cultural / Identity ─────────────────────────────────────────── */
  {
    theme: "pride",
    keywords: [
      "pride",
      "lgbtq",
      "lgbt",
      "queer",
      "pride month",
      "pride parade",
      "pride party",
    ],
  },
  {
    theme: "diwali",
    keywords: [
      "diwali",
      "deepavali",
      "deepawali",
      "festival of lights",
      "rangoli",
      "diya",
      "lakshmi puja",
    ],
  },
  {
    theme: "eid",
    keywords: [
      "eid",
      "eid mubarak",
      "eid al fitr",
      "eid al adha",
      "eid-ul-fitr",
      "eid-ul-adha",
      "ramadan",
      "iftar",
    ],
  },
];

// NOTE: Animation configurations have been moved to ./theme-configs.ts
// The THEME_ANIMATIONS record and ThemeAnimation interface are no longer needed here.

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/** Fields used for keyword + admin theme detection (public API + previews). */
export type ThemeDetectionInput = {
  event_name?: string;
  event_banner_heading?: string;
  event_banner_sub_heading?: string;
  about_event_description?: string;
  detected_theme?: string;
  slug?: string;
};

/**
 * Detects theme from event data by analysing text content against keyword
 * patterns.  Priority: Admin override → Keyword match → "none".
 */
export function detectTheme(
  eventData: ThemeDetectionInput | null | undefined,
): ThemeType {
  if (eventData == null) {
    return "none";
  }

  // 1. Admin override — highest priority
  if (eventData.detected_theme && eventData.detected_theme !== "none") {
    const validThemes = THEME_OPTIONS.map((o) => o.value);
    if (validThemes.includes(eventData.detected_theme as ThemeType)) {
      return eventData.detected_theme as ThemeType;
    }
  }

  // 2. Combine all text fields for analysis (including slug)
  const textToAnalyze = [
    eventData.event_name,
    eventData.event_banner_heading,
    eventData.event_banner_sub_heading,
    eventData.about_event_description,
    // Normalise slug: replace hyphens / underscores / ampersands with spaces
    eventData.slug?.replace(/[-_&]+/g, " "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .trim();

  if (!textToAnalyze) return "none";

  // 3. Walk detection rules in priority order
  for (const rule of THEME_DETECTION_RULES) {
    for (const keyword of rule.keywords) {
      if (textToAnalyze.includes(keyword.toLowerCase())) {
        return rule.theme;
      }
    }
  }

  return "none";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// getThemeAnimations removed — use THEME_CONFIGS from ./theme-configs.ts instead

/**
 * Gets the display option for a theme (label, emoji, description).
 */
export function getThemeOption(theme: ThemeType): ThemeOption | undefined {
  return THEME_OPTIONS.find((opt) => opt.value === theme);
}

/**
 * Debug utility: logs detection analysis for troubleshooting.
 */
export function debugThemeDetection(eventData: ThemeDetectionInput) {
  const textToAnalyze = [
    eventData.event_name,
    eventData.event_banner_heading,
    eventData.event_banner_sub_heading,
    eventData.about_event_description,
    eventData.slug?.replace(/[-_&]+/g, " "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const detected = detectTheme(eventData);
  const option = getThemeOption(detected);

  console.group("🎨 Theme Detection Debug");
  console.log("Event data:", eventData);
  console.log("Text analysed:", textToAnalyze);
  console.log("Detected theme:", detected);
  console.log("Theme label:", option?.label || "None");
  console.log("Theme emoji:", option?.emoji || "🚫");
  console.groupEnd();

  return { detected, textToAnalyze, option };
}
