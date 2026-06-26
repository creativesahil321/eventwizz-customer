import { League_Spartan } from "next/font/google";

const leagueSpartan = League_Spartan({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const THEME = "event-wizz";
const RADIUS = 0.5;

export default async function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <body
      data-theme={THEME}
      className={`${leagueSpartan.className} antialiased not-first-of-type:overflow-x-hidden bg-background`}
      style={
        {
          "--radius": `${RADIUS}rem`,
        } as React.CSSProperties
      }
    >
      {children}
    </body>
  );
}
