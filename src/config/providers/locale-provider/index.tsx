// import { getMessages } from "next-intl/server";
import ClientLocaleProvider from "./locale-provider";

export default async function LocaleProvider({
  children,
  messages,
}: {
  children: React.ReactNode;
  messages?: Record<string, string>;  
}) {
  return (
    <ClientLocaleProvider messages={messages ?? {}}>{children}</ClientLocaleProvider>
  );
}
