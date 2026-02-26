import { MenuItemProps } from "./types";
import { createAdminUrl } from "./utils";

// Admin Menus
export const adminMenus: MenuItemProps[] = [
  {
    id: 1,
    title: "Dashboard",
    icon: "layoutDashboard", // <LayoutDashboard /> from lucide-react
    href: createAdminUrl("/admin/dashboard"),
    url: createAdminUrl("/admin/dashboard"),
    type: "item",
    permissions: "read-dashboard",
    menu: [],
  },

  {
    id: 2,
    title: "All Vendors",
    icon: "users", // <Users /> from lucide-react
    href: createAdminUrl("/admin/vendors"),
    url: createAdminUrl("/admin/vendors"),
    type: "item",
    permissions: "read-vendor",
    menu: [
      {
        id: 3,
        title: "Active Vendors ",
        icon: "activeCustomers",
        href: createAdminUrl("/admin/vendors?status=active"),
        url: createAdminUrl("/admin/vendors?status=active"),
        type: "title",
        permissions: "read-vendor",
        menu: [],
      },
      {
        id: 4,
        title: "Disable Vendors",
        icon: "disableCustomers",
        href: createAdminUrl("/admin/vendors?status=disable"),
        url: createAdminUrl("/admin/vendors?status=disable"),
        type: "title",
        permissions: "read-vendor",
        menu: [],
      },
      {
        id: 5,
        title: "Send Email to All",
        icon: "sendEmailToAll",
        href: createAdminUrl("/admin/send-email-to-all"),
        url: createAdminUrl("/admin/send-email-to-all"),
        type: "title",
        permissions: "read-vendor",
        menu: [],
      },
    ],
  },

  {
    id: 6,
    title: "Transaction History",
    icon: "history", // <History />
    href: createAdminUrl("/admin/transactions"),
    url: createAdminUrl("/admin/transactions"),
    type: "item",
    permissions: "read-transaction",
    menu: [],
  },
  {
    id: 7,
    title: "Payments",
    icon: "creditCard", // <CreditCard />
    href: createAdminUrl("/admin/payments"),
    url: createAdminUrl("/admin/payments"),
    type: "item",
    permissions: "read-payment",
    menu: [],
  },
  {
    id: 8,
    title: "Notifications",
    icon: "bell", // <Bell />
    href: createAdminUrl("/admin/notifications"),
    url: createAdminUrl("/admin/notifications"),
    type: "item",
    permissions: "read-notification",
    menu: [],
  },
  {
    id: 9,
    title: "Commission Overview",
    icon: "barChart", // <BarChart />
    href: createAdminUrl("/admin/commission-overview"),
    url: createAdminUrl("/admin/commission-overview"),
    type: "item",
    permissions: "read-commission",
    menu: [],
  },
  {
    id: 10,
    title: "Manage Roles",
    icon: "userCheck", // <UserCheck />
    href: createAdminUrl("/admin/manage-roles"),
    url: createAdminUrl("/admin/manage-roles"),
    type: "item",
    permissions: "read-role-permission",
    menu: [],
  },
  {
    id: 11,
    title: "Staff Management",
    icon: "userCheck", // <UserCheck />
    href: createAdminUrl("/admin/staff-management"),
    url: createAdminUrl("/admin/staff-management"),
    type: "item",
    permissions: "read-staff",
    menu: [],
  },
  {
    id: 12,
    title: "Email Template",
    icon: "mail", // <Mail />
    href: createAdminUrl("/admin/email-templates"),
    url: createAdminUrl("/admin/email-templates"),
    type: "item",
    permissions: "read-email-template",
    menu: [],
  },
  {
    id: 13,
    title: "Site Essentials",
    icon: "settings", // <Settings />
    href: createAdminUrl("/admin/sites-essentials"),
    url: createAdminUrl("/admin/sites-essentials"),
    type: "item",
    permissions: "read-site-essential",
    menu: [],
  },
  {
    id: 14,
    title: "Marketing Analytics",
    icon: "trendingUp", // <TrendingUp />
    href: createAdminUrl("/admin/marketing-analytics"),
    url: createAdminUrl("/admin/marketing-analytics"),
    type: "item",
    permissions: "read-marketing",
    menu: [],
  },
  {
    id: 15,
    title: "System Logs",
    icon: "fileText", // <FileText />
    href: createAdminUrl("/admin/system-logs"),
    url: createAdminUrl("/admin/system-logs"),
    type: "item",
    permissions: "read-system-logs",
    menu: [],
  },
  {
    id: 16,
    title: "Support",
    icon: "headphones", // <Headphones />
    href: createAdminUrl("/admin/support"),
    url: createAdminUrl("/admin/support"),
    type: "item",
    permissions: "read-ticket",
    menu: [],
  },
  {
    id: 17,
    title: "Referrals",
    icon: "share", // <Share2 />
    href: createAdminUrl("/admin/referrals"),
    url: createAdminUrl("/admin/referrals"),
    type: "item",
    permissions: "read-referral",
    menu: [],
  },
  {
    id: 18,
    title: "Sales & Marketing",
    icon: "handPlatter", // <HandPlatter />
    href: createAdminUrl("/admin/sales-marketing"),
    url: createAdminUrl("/admin/sales-marketing"),
    type: "item",
    permissions: "read-marketing",
    menu: [],
  },
  {
    id: 19,
    title: "Seo Tools",
    icon: "rocket", // <Rocket />
    href: createAdminUrl("/admin/seo-tools"),
    url: createAdminUrl("/admin/seo-tools"),
    type: "item",
    permissions: "read-seo-tool",
    menu: [],
  },
  {
    id: 20,
    title: "Dispute Resolution Centre",
    icon: "alertTriangle", // <AlertTriangle />
    href: createAdminUrl("/admin/dispute-resolution-centre"),
    url: createAdminUrl("/admin/dispute-resolution-centre"),
    type: "item",
    permissions: "read-dispute",
    menu: [],
  },
];
