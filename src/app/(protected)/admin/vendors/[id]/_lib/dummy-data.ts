import type { VenueDetail } from "./types";

/**
 * Dummy venue detail with multiple locations.
 * First location in the array is the default/assigned location.
 */
export function getVenueDetailDummy(id: string): VenueDetail | null {
  const numId = Number(id);
  if (Number.isNaN(numId) || numId < 1) return null;

  return {
    id: numId,
    vendorId: numId,
    venueId: "VEN12345",
    name: "One Great George Street",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=200&h=200&fit=crop",
    status: "active",
    subdomain: "royalpalace.eventwizz.com",
    locations: [
      {
        id: 1,
        name: "Main Building – Great George St",
        address: "1 Great George St, London SW1P 3AA",
        city: "London",
        postcode: "SW1P 3AA",
        country: "United Kingdom",
        financialSummary: {
          totalEvents: 56,
          totalCustomers: 350,
          commissionEarned: 125000,
          pendingCommission: 125000,
          liveEvents: 12,
          totalRevenue: 1250000,
          payoutReleased: 1125000,
        },
      },
      {
        id: 2,
        name: "Westminster Hall",
        address: "Westminster Hall, Parliament Sq, London SW1A 0AA",
        city: "London",
        postcode: "SW1A 0AA",
        country: "United Kingdom",
        financialSummary: {
          totalEvents: 28,
          totalCustomers: 180,
          commissionEarned: 65000,
          pendingCommission: 42000,
          liveEvents: 5,
          totalRevenue: 580000,
          payoutReleased: 515000,
        },
      },
      {
        id: 3,
        name: "Riverside Pavilion",
        address: "2 Thames Walk, London SE1 2EE",
        city: "London",
        postcode: "SE1 2EE",
        country: "United Kingdom",
        financialSummary: {
          totalEvents: 18,
          totalCustomers: 150,
          commissionEarned: 325000,
          pendingCommission: 325000,
          liveEvents: 4,
          totalRevenue: 1250000,
          payoutReleased: 1125000,
        },
      },
    ],
    contact: {
      name: "Johan doe",
      email: "Johan.doe@example.com",
      phone: "+91 9876543210",
      registeredAddress: "1 Great George St, London SW1P 3AA, United Kingdom",
    },
    businessDocuments: {
      vatNumber: "22AABBCC1234K1Z2",
      kycStatus: "verified",
      documentUrl: "#",
      documentLabel: "document.pdf",
    },
    recentEvents: [
      { title: "Wedding Reception", date: "03 Apr 2024" },
      { title: "Corporate Gala", date: "20 Mar 2024" },
      { title: "Birthday Party", date: "12 Mar 2024" },
    ],
    adminNotes: ["High Value Client", "Special Commission Rate: 8%"],
    financialSummary: {
      totalEvents: 56,
      totalCustomers: 350,
      commissionEarned: 125000,
      pendingCommission: 125000,
      liveEvents: 12,
      totalRevenue: 1250000,
      payoutReleased: 1125000,
    },
    lastLogin: "10 Apr 2024, 12:45 PM",
  };
}
