import type { BlogPost } from "./types";

/**
 * Shared dummy blog posts for admin CRUD demo + public marketing news.
 * Replace with API when backend blog endpoints are ready.
 */
export const DUMMY_BLOG_POSTS: BlogPost[] = [
  {
    id: "1",
    title: "How to Plan a Perfect Corporate Christmas Party",
    slug: "how-to-plan-a-perfect-corporate-christmas-party",
    excerpt:
      "Planning a corporate Christmas party can be stressful — but with the right tools and checklist, it doesn't have to be.",
    content: `
      <h2>Start with a clear brief</h2>
      <p>Define your guest count, budget, and tone before you book anything. A shared checklist keeps catering, entertainment, and logistics aligned — so every supplier is working from the same plan.</p>
      <p>The best corporate parties feel effortless on the night because the decisions were locked in early. Treat planning as a short project with owners, deadlines, and a single source of truth.</p>
      <h3>Timeline essentials</h3>
      <ul>
        <li>Confirm venue 8–12 weeks out</li>
        <li>Lock catering and AV 4–6 weeks out</li>
        <li>Send final guest list 2 weeks before the event</li>
      </ul>
      <p>With EventWizz, ticketing and guest management live in one place so your team spends less time chasing RSVPs and more time polishing the guest experience.</p>
      <h2>Make the night feel special</h2>
      <p>Small details — welcome drinks, a clear seating plan, and a short programme — turn a standard party into something guests talk about the next day.</p>
      <p>Keep arrivals calm, brief your hosts, and make sure payment and dietary choices were handled online beforehand. When the admin is sorted, hospitality can take centre stage.</p>
    `.trim(),
    cover_image: "/assets/images/admin/news-christmas.jpg",
    status: "published",
    published_at: "2024-11-23",
    meta_title: "Plan a Perfect Corporate Christmas Party | EventWizz",
    meta_description:
      "A practical checklist for corporate Christmas parties — timeline, catering, guest management, and how venues keep the night running smoothly.",
    created_at: "2024-11-20T10:00:00.000Z",
    updated_at: "2024-11-23T09:00:00.000Z",
  },
  {
    id: "2",
    title: "Top Tips for Running Unforgettable Venue Events",
    slug: "top-tips-for-running-unforgettable-venue-events",
    excerpt:
      "From guest management to menu planning, discover how leading venues keep their guests coming back year after year.",
    content: `
      <h2>Guest experience comes first</h2>
      <p>Memorable venues treat every touchpoint — arrival, seating, service, and exit — as part of the show.</p>
      <h3>Operational wins</h3>
      <ol>
        <li>Standardise floor plans for your most popular layouts</li>
        <li>Offer add-ons that upsell without slowing service</li>
        <li>Review post-event feedback within 48 hours</li>
      </ol>
      <p>Automation frees your staff to focus on hospitality instead of spreadsheets.</p>
      <h2>Keep your team aligned</h2>
      <p>One shared dashboard for bookings, menus, and door lists means fewer surprises on the night and a smoother experience for guests.</p>
    `.trim(),
    cover_image: "/assets/images/admin/news-venue.jpg",
    status: "published",
    published_at: "2024-10-15",
    meta_title: "Unforgettable Venue Events: Top Tips | EventWizz",
    meta_description:
      "Guest management, menus, and operations tips that help venues deliver events guests remember — and book again.",
    created_at: "2024-10-10T11:00:00.000Z",
    updated_at: "2024-10-15T08:30:00.000Z",
  },
  {
    id: "3",
    title: "Why Automated Ticketing Transforms Event Revenue",
    slug: "why-automated-ticketing-transforms-event-revenue",
    excerpt:
      "Manual ticketing is costing venues time and money. See how automation changes the game for event profitability.",
    content: `
      <h2>The cost of manual sales</h2>
      <p>Phone bookings and spreadsheets create bottlenecks, errors, and lost upsell opportunities.</p>
      <p>Automated ticketing gives real-time inventory, dynamic pricing options, and cleaner reporting — so finance and ops stay aligned.</p>
      <h3>What to measure</h3>
      <ul>
        <li>Conversion rate from listing to checkout</li>
        <li>Average order value with add-ons</li>
        <li>No-show rate and door scan times</li>
      </ul>
      <h2>Scale without extra admin</h2>
      <p>When sales spike, automated confirmations and capacity limits protect your team from inbox chaos while still growing revenue.</p>
    `.trim(),
    cover_image: "/assets/images/admin/news-ticketing.jpg",
    status: "published",
    published_at: "2024-09-02",
    meta_title: "Automated Ticketing & Event Revenue | EventWizz",
    meta_description:
      "How automated ticketing improves conversion, average order value, and operational reporting for venue events.",
    created_at: "2024-08-28T14:00:00.000Z",
    updated_at: "2024-09-02T10:00:00.000Z",
  },
  {
    id: "4",
    title: "5 Marketing Moves That Fill More Seats",
    slug: "5-marketing-moves-that-fill-more-seats",
    excerpt:
      "A draft guide to email timing, social teasers, and early-bird offers that help venues sell out faster.",
    content: `
      <h2>Draft: marketing playbook</h2>
      <p>This article is still being refined. Cover early-bird windows, reminder sequences, and partner cross-promotions.</p>
    `.trim(),
    cover_image: "/assets/images/admin/news-venue.jpg",
    status: "draft",
    published_at: "2026-07-24",
    meta_title: "",
    meta_description: "",
    created_at: "2026-07-20T09:00:00.000Z",
    updated_at: "2026-07-22T16:00:00.000Z",
  },
];
