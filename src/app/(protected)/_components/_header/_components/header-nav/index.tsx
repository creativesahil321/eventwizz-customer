import React, { memo, useMemo } from "react";
import { env } from "@/env";
import ThemeToggle from "../theme-toggle";
import CreateEventButton from "../create-event-button";
import UserDropdown from "../user-dropdown";
interface HeaderNavProps {
  locales?: string;
}
const HeaderNav: React.FC<HeaderNavProps> = memo(() => {
  const createEventLink = useMemo(
    () => `${env.NEXT_PUBLIC_APP_URL}/admin/events/create`,
    []
  );
  return (
    <>
      <ThemeToggle />
      <CreateEventButton link={createEventLink} />
      <section className="cursor-pointer flex items-center gap-3">
        <UserDropdown />
      </section>
    </>
  );
});

HeaderNav.displayName = "HeaderNav";
export default HeaderNav;
