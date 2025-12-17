import { Suspense } from "react";
import DashboardEvents from "./_components/dashboard-events";
import DashboardRecentBookings from "./_components/dashboard-recent-bookings";
import { PageLoader } from "@/components/ui/page-loader";

export default async function CustomerDashboardPage() {
  // In a real implementation, this would fetch customer-specific data
  // const customerData = await fetchCustomerDashboardData();

  // Mock data for events
  const eventsData = [
    {
      id: "1",
      title: "Summer Music Festival",
      date: "2023-07-15",
      time: "14:00 - 22:00",
      location: "Riverside Park",
      ticketType: "VIP Pass",
    },
    {
      id: "2",
      title: "Food & Wine Expo",
      date: "2023-07-22",
      time: "12:00 - 18:00",
      location: "Convention Center",
      ticketType: "General Admission",
    },
    {
      id: "3",
      title: "Tech Conference 2023",
      date: "2023-08-05",
      time: "09:00 - 17:00",
      location: "Innovation Hub",
      ticketType: "Full Access",
    },
  ];

  // Mock data for recent bookings
  const recentBookingsData = [
    {
      id: 1,
      booking_number: "BK-2024-001",
      event_name: "Summer Music Festival",
      status: "Confirmed",
      payment_status: "Paid",
      total: "£450.00",
      created_date: new Date(
        Date.now() - 2 * 24 * 60 * 60 * 1000
      ).toISOString(), // 2 days ago
    },
    {
      id: 2,
      booking_number: "BK-2024-002",
      event_name: "Food & Wine Expo",
      status: "Pending",
      payment_status: "Partial",
      total: "£280.00",
      created_date: new Date(
        Date.now() - 5 * 24 * 60 * 60 * 1000
      ).toISOString(), // 5 days ago
    },
    {
      id: 3,
      booking_number: "BK-2024-003",
      event_name: "Tech Conference 2023",
      status: "Confirmed",
      payment_status: "Paid",
      total: "£320.00",
      created_date: new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString(), // 7 days ago
    },
  ];

  return (
    <Suspense fallback={<PageLoader />}>
      <section className="w-full relative flex flex-col space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header Card */}
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6">
          <div className="flex justify-between items-start sm:items-center flex-wrap gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl title-header font-bold text-black">
                Customer Dashboard
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">
                Welcome back! Manage your events and bookings.
              </p>
            </div>
          </div>
        </div>

        {/* Upcoming Events Section */}
        <section className="w-full relative">
          <DashboardEvents title="My Upcoming Events" events={eventsData} />
        </section>

        {/* Recent Bookings Section */}
        <section className="w-full relative">
          <DashboardRecentBookings bookings={recentBookingsData} />
        </section>
      </section>
    </Suspense>
  );
}
