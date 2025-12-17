/**
 * Theme Detection Utility
 * Detects themes from event data and returns appropriate animations
 */

export type ThemeType =
  | "christmas"
  | "spiderman"
  | "birthday"
  | "wedding"
  | "halloween"
  | "winter"
  | "summer"
  | "spring"
  | "autumn"
  | "ocean"
  | "galaxy"
  | "vintage"
  | "minimalist"
  | "luxury"
  | "sports"
  | "music"
  | "art"
  | "corporate"
  | "none";

export interface ThemeAnimation {
  decorations: string[];
  effects: string[];
  particles: string[];
  backgrounds: string[];
}

export const THEME_ANIMATIONS: Record<ThemeType, ThemeAnimation> = {
  christmas: {
    decorations: [
      "snowflakes",
      "santa-hat",
      "christmas-tree",
      "gift-box",
      "reindeer",
    ],
    effects: ["snow-fall", "twinkling-lights", "sparkles"],
    particles: ["snow", "stars", "gifts"],
    backgrounds: ["snowy-landscape", "christmas-lights"],
  },
  spiderman: {
    decorations: ["web-pattern", "spider-logo", "city-skyline", "web-swing"],
    effects: ["web-swing", "city-lights", "spider-sense"],
    particles: ["webs", "sparks", "city-dust"],
    backgrounds: ["city-skyline", "web-pattern"],
  },
  birthday: {
    decorations: ["balloons", "confetti", "party-hat", "cake", "gift"],
    effects: ["confetti-burst", "balloon-float", "sparkles"],
    particles: ["confetti", "balloons", "stars"],
    backgrounds: ["party-lights", "celebration"],
  },
  wedding: {
    decorations: ["hearts", "flowers", "rings", "dove", "champagne"],
    effects: ["floating-hearts", "petal-fall", "sparkles"],
    particles: ["hearts", "petals", "sparkles"],
    backgrounds: ["romantic-lights", "flower-pattern"],
  },
  halloween: {
    decorations: ["pumpkin", "ghost", "bat", "spider", "witch-hat"],
    effects: ["fog", "flickering-lights", "spooky-float"],
    particles: ["bats", "spiders", "ghost-mist"],
    backgrounds: ["haunted-house", "spooky-forest"],
  },
  winter: {
    decorations: ["snowflakes", "ice-crystals", "winter-tree", "snowman"],
    effects: ["snow-fall", "ice-shimmer", "cold-breeze"],
    particles: ["snow", "ice", "frost"],
    backgrounds: ["winter-landscape", "ice-pattern"],
  },
  summer: {
    decorations: ["sun", "palm-tree", "beach-ball", "waves", "sunset"],
    effects: ["wave-motion", "sun-shine", "beach-breeze"],
    particles: ["sand", "waves", "sun-rays"],
    backgrounds: ["beach-scene", "sunset-sky"],
  },
  spring: {
    decorations: ["flowers", "butterfly", "rainbow", "bird", "leaf"],
    effects: ["flower-bloom", "butterfly-flight", "gentle-rain"],
    particles: ["petals", "butterflies", "raindrops"],
    backgrounds: ["flower-field", "spring-garden"],
  },
  autumn: {
    decorations: ["falling-leaves", "pumpkin", "acorn", "tree", "harvest"],
    effects: ["leaf-fall", "autumn-breeze", "warm-glow"],
    particles: ["leaves", "acorns", "harvest-items"],
    backgrounds: ["autumn-forest", "harvest-scene"],
  },
  ocean: {
    decorations: ["wave", "fish", "coral", "shell", "anchor"],
    effects: ["wave-motion", "bubble-rise", "ocean-current"],
    particles: ["bubbles", "fish", "sea-foam"],
    backgrounds: ["ocean-depths", "coral-reef"],
  },
  galaxy: {
    decorations: ["star", "planet", "comet", "nebula", "spaceship"],
    effects: ["star-twinkle", "planet-rotation", "comet-trail"],
    particles: ["stars", "meteors", "cosmic-dust"],
    backgrounds: ["space-scene", "nebula-cloud"],
  },
  vintage: {
    decorations: ["old-camera", "vinyl-record", "typewriter", "vintage-car"],
    effects: ["film-grain", "vintage-filter", "retro-glow"],
    particles: ["dust", "film-strips", "vintage-elements"],
    backgrounds: ["vintage-pattern", "retro-scene"],
  },
  minimalist: {
    decorations: ["geometric-shapes", "clean-lines", "simple-dots"],
    effects: ["subtle-fade", "clean-transition", "minimal-motion"],
    particles: ["dots", "lines", "geometric-shapes"],
    backgrounds: ["clean-gradient", "minimal-pattern"],
  },
  luxury: {
    decorations: ["gold-accent", "diamond", "crown", "champagne", "luxury-car"],
    effects: ["gold-shimmer", "diamond-sparkle", "elegant-float"],
    particles: ["gold-dust", "diamonds", "luxury-elements"],
    backgrounds: ["luxury-pattern", "elegant-scene"],
  },
  sports: {
    decorations: ["trophy", "medal", "sports-ball", "stadium", "jersey"],
    effects: ["trophy-shine", "victory-sparkle", "stadium-lights"],
    particles: ["confetti", "trophy-particles", "victory-elements"],
    backgrounds: ["stadium-scene", "sports-pattern"],
  },
  music: {
    decorations: ["music-note", "guitar", "microphone", "headphones", "vinyl"],
    effects: ["sound-waves", "music-pulse", "rhythm-beat"],
    particles: ["music-notes", "sound-waves", "rhythm-elements"],
    backgrounds: ["concert-scene", "music-pattern"],
  },
  art: {
    decorations: ["paintbrush", "palette", "canvas", "sculpture", "gallery"],
    effects: ["paint-splash", "artistic-brush", "creative-flow"],
    particles: ["paint-drops", "artistic-elements", "creative-sparks"],
    backgrounds: ["art-studio", "gallery-scene"],
  },
  corporate: {
    decorations: [
      "briefcase",
      "chart",
      "building",
      "handshake",
      "presentation",
    ],
    effects: ["professional-glow", "business-pulse", "corporate-shine"],
    particles: ["charts", "business-elements", "professional-sparks"],
    backgrounds: ["office-scene", "corporate-pattern"],
  },
  none: {
    decorations: [],
    effects: [],
    particles: [],
    backgrounds: [],
  },
};

/**
 * Detects theme from event data
 */
export function detectTheme(eventData: {
  event_name?: string;
  event_banner_heading?: string;
  event_banner_sub_heading?: string;
  about_event_description?: string;
  detected_theme?: string;
}): ThemeType {
  // If theme is already detected and stored, use it
  if (eventData.detected_theme) {
    return eventData.detected_theme as ThemeType;
  }

  // Combine all text fields for theme detection
  const textToAnalyze = [
    eventData.event_name,
    eventData.event_banner_heading,
    eventData.event_banner_sub_heading,
    eventData.about_event_description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Theme detection logic
  if (
    textToAnalyze.includes("christmas") ||
    textToAnalyze.includes("holiday") ||
    textToAnalyze.includes("xmas")
  ) {
    return "christmas";
  }
  if (
    textToAnalyze.includes("spiderman") ||
    textToAnalyze.includes("spider-man") ||
    textToAnalyze.includes("spider man")
  ) {
    return "spiderman";
  }
  if (
    textToAnalyze.includes("birthday") ||
    textToAnalyze.includes("party") ||
    textToAnalyze.includes("celebration")
  ) {
    return "birthday";
  }
  if (
    textToAnalyze.includes("wedding") ||
    textToAnalyze.includes("bridal") ||
    textToAnalyze.includes("marriage")
  ) {
    return "wedding";
  }
  if (
    textToAnalyze.includes("halloween") ||
    textToAnalyze.includes("spooky") ||
    textToAnalyze.includes("haunted")
  ) {
    return "halloween";
  }
  if (
    textToAnalyze.includes("winter") ||
    textToAnalyze.includes("snow") ||
    textToAnalyze.includes("cold")
  ) {
    return "winter";
  }
  if (
    textToAnalyze.includes("summer") ||
    textToAnalyze.includes("beach") ||
    textToAnalyze.includes("sunny")
  ) {
    return "summer";
  }
  if (
    textToAnalyze.includes("spring") ||
    textToAnalyze.includes("bloom") ||
    textToAnalyze.includes("fresh")
  ) {
    return "spring";
  }
  if (
    textToAnalyze.includes("autumn") ||
    textToAnalyze.includes("fall") ||
    textToAnalyze.includes("harvest")
  ) {
    return "autumn";
  }
  if (
    textToAnalyze.includes("ocean") ||
    textToAnalyze.includes("sea") ||
    textToAnalyze.includes("underwater")
  ) {
    return "ocean";
  }
  if (
    textToAnalyze.includes("galaxy") ||
    textToAnalyze.includes("space") ||
    textToAnalyze.includes("cosmic")
  ) {
    return "galaxy";
  }
  if (
    textToAnalyze.includes("vintage") ||
    textToAnalyze.includes("retro") ||
    textToAnalyze.includes("classic")
  ) {
    return "vintage";
  }
  if (
    textToAnalyze.includes("minimalist") ||
    textToAnalyze.includes("minimal") ||
    textToAnalyze.includes("clean")
  ) {
    return "minimalist";
  }
  if (
    textToAnalyze.includes("luxury") ||
    textToAnalyze.includes("premium") ||
    textToAnalyze.includes("elegant")
  ) {
    return "luxury";
  }
  if (
    textToAnalyze.includes("sports") ||
    textToAnalyze.includes("athletic") ||
    textToAnalyze.includes("game")
  ) {
    return "sports";
  }
  if (
    textToAnalyze.includes("music") ||
    textToAnalyze.includes("concert") ||
    textToAnalyze.includes("band")
  ) {
    return "music";
  }
  if (
    textToAnalyze.includes("art") ||
    textToAnalyze.includes("creative") ||
    textToAnalyze.includes("gallery")
  ) {
    return "art";
  }
  if (
    textToAnalyze.includes("corporate") ||
    textToAnalyze.includes("business") ||
    textToAnalyze.includes("professional")
  ) {
    return "corporate";
  }

  return "none";
}

/**
 * Gets theme animations for a detected theme
 */
export function getThemeAnimations(theme: ThemeType): ThemeAnimation {
  return THEME_ANIMATIONS[theme] || THEME_ANIMATIONS.none;
}
