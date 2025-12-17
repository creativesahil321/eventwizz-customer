import { z } from "zod";
import colors from "tailwindcss/colors";

export type FontName =
  | "Inter"
  | "Roboto"
  | "Nunito"
  | "Lato"
  | "Montserrat"
  | "Poppins"
  | "Open Sans"
  | "Oswald"
  | "Raleway"
  | "Merriweather"
  | "Ubuntu"
  | "Noto Sans"
  | "Cabin"
  | "PT Sans";

const colorValues = [
  colors.red[500],
  colors.orange[500],
  colors.amber[500],
  colors.yellow[500],
  colors.lime[500],
  colors.green[500],
  colors.emerald[500],
  colors.teal[500],
  colors.cyan[500],
  colors.sky[500],
  colors.blue[500],
  colors.indigo[500],
  colors.violet[500],
  colors.purple[500],
  colors.fuchsia[500],
  colors.pink[500],
  colors.rose[500],
  colors.slate[500],
  colors.gray[500],
  colors.zinc[500],
  colors.neutral[500],
  colors.stone[500],
] as const;

export const themeSettingsSchema = z.object({
  radius: z.enum(["0.25rem", "0.5rem", "0.75rem", "1rem"]).default("0.5rem"),
  fontFamily: z
    .enum([
      "Inter",
      "Roboto",
      "Nunito",
      "Lato",
      "Montserrat",
      "Poppins",
      "Open Sans",
      "Oswald",
      "Raleway",
      "Merriweather",
      "Ubuntu",
      "Noto Sans",
      "Cabin",
      "PT Sans",
    ])
    .default("Inter"),
  fontSize: z.string().default("1rem"),
  primary: z.enum(colorValues).default(colors.blue[500]),
  secondary: z.enum(colorValues).default(colors.gray[500]),
  backgroundColor: z.enum(colorValues).default(colors.slate[500]),
});
