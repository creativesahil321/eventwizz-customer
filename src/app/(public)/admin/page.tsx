import { Metadata } from "next";
import AdminHomeContent from "./_components/admin-home-content";

export const metadata: Metadata = {
  title: "Event Management Software for Venues",
  description:
    "Event management and booking platform for UK venues. Create branded event sites, sell tickets and tables, collect menu choices — ready in 15 minutes. Built for Christmas, New Year & seasonal events.",
  keywords: [
    "event management software",
    "event management for venues",
    "UK event booking",
    "event ticketing for venues",
    "Christmas event tickets",
    "New Year event booking",
    "venue event website",
    "event booking platform",
  ],
};

export default function AdminSiteHomePage() {
  return <AdminHomeContent />;
}
