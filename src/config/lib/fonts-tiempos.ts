import localFont from "next/font/local";

/** Tiempos Headline — onboarding + global error only (kept separate from app Inter to avoid huge shared chunks). */
export const tiemposHeadline = localFont({
  variable: "--font-tiempos-headline",
  src: [
    {
      path: "../../public/fonts/TiemposHeadline-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/TiemposHeadline-LightItalic.otf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../../public/fonts/TiemposHeadline-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/TiemposHeadline-RegularItalic.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/TiemposHeadline-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/TiemposHeadline-MediumItalic.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../public/fonts/TiemposHeadline-Semibold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/TiemposHeadline-SemiboldItalic.otf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../../public/fonts/TiemposHeadline-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/TiemposHeadline-BoldItalic.otf",
      weight: "700",
      style: "italic",
    },
    {
      path: "../../public/fonts/TiemposHeadline-Black.otf",
      weight: "900",
      style: "normal",
    },
    {
      path: "../../public/fonts/TiemposHeadline-BlackItalic.otf",
      weight: "900",
      style: "italic",
    },
  ],
  display: "swap",
});
