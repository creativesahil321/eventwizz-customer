/**
 * EventWizz AI Knowledge Base
 *
 * This file contains common knowledge about the EventWizz platform
 * that the AI assistant can use to provide helpful responses.
 */

export const KNOWLEDGE_BASE = `
# EventWizz Knowledge Base

## About EventWizz
EventWizz is an all-in-one event management platform that helps vendors and customers create, manage, and attend events seamlessly. Our platform offers comprehensive tools for event planning, venue management, ticketing, and attendee management.

## For Vendors
- Create and manage venue profiles
- Set up multiple locations with unique details
- Customize event offerings and packages
- Manage bookings and availability
- Track performance with analytics
- Handle customer communications

## For Customers
- Discover events and venues
- Book tickets and make reservations
- Manage RSVPs and attendee lists
- Receive notifications and reminders
- Access event details and information

## For Admins
- Manage all venues (approve domains, login as venue, reset password, edit)
- Track commissions and transaction history
- Resolve disputes (Dispute Resolution Centre)
- Manage roles and staff (Manage Roles, Staff Management)
- Configure platform branding (Site Essentials), email templates, payment settings (profile → Settings → Payment Settings)
- View support tickets, system logs, referrals, marketing analytics, SEO tools

## System Overview
EventWizz is a comprehensive multi-tenant event management platform with different user types (admin, vendor, customer) and role-based access control. The system allows vendors to manage multiple venue locations from a single dashboard with location-specific data segregation.

## Partner White-Label Deployments
**Important**: Partner is NOT a user role - it's a white-labeled deployment model.

### What is a Partner Deployment?
A partner deployment is a fully white-labeled instance of the EventWizz admin platform running on a custom domain with complete brand customization. Partners get their own branded version of the entire platform using the same codebase.

### How Partner White-Labeling Works
- **Same Codebase**: All partners use the identical EventWizz codebase
- **Custom Branding**: Each partner has their own logo, colors, and theme
- **Independent Ecosystem**: Partners onboard and manage their own vendors
- **Isolated Data**: Separate database for each partner's vendors and customers
- **Custom Domain**: Partners use their own domain (e.g., partner-brand.com)
- **Same Roles**: Partners use admin, vendor, and customer roles (no separate partner role)

### Partner Setup Process
1. **Environment Configuration**: Change 4 environment variables (domain, API URL, app URL, WebSocket URL)
2. **Deploy Instance**: Build and deploy Next.js with partner environment
3. **Brand Customization**: Partner configures Site Essentials (logo, colors, typography, SEO)
4. **Go Live**: Partner starts onboarding their own vendors under their brand

### Partner vs Main Platform
- **Main Platform**: eventwizz.com with EventWizz branding, manages platform vendors
- **Partner Instance**: partner-brand.com with partner's branding, manages partner's vendors
- **Both use**: Same codebase, same admin/vendor/customer roles, same features
- **Different**: Branding, domain, database, vendor ecosystem, revenue management

## Architecture
- Built on Next.js 15.x with App Router
- React 19.x with TypeScript
- Authentication via NextAuth.js with custom credential provider
- State management with Zustand and TanStack Query
- UI components from Shadcn UI with Tailwind CSS
- Multi-tenant architecture with domain/subdomain-based routing

## Domain Structure
- **Admin Site** (xyz.com): Management dashboard for system administrators
- **Vendor Sites** (subdomains like stockbrook.xyz.com): For venues and service providers
- **Customer Portal**: For event attendees and clients
- **Partner Instances** (partner-brand.com): White-labeled admin sites with custom branding (same functionality as main admin)

## Key Features
- Multi-tenant location-based architecture
- Role-based permission system
- Dynamic theming and white-labeling
- SEO-friendly routing
- Comprehensive onboarding flow
- Staff management with role assignment

## Authentication System
- JWT-based authentication with secure token management
- Role-based user types with distinct authentication flows
- Session validation and token refresh mechanisms
- Multi-factor authentication support

## Permission System
- Granular permission model with specific action keys
- Role-based permission grouping
- Permission checks at UI, route, and API levels
- Permission-based components (PermissionGuard, PermissionButton, etc.)

## Location System
- Vendors can manage multiple locations
- Location selection modal for switching between venues
- Location-aware API requests with automatic header inclusion
- Location-based data segregation

## Technical Implementation
- TanStack Query for data fetching and caching
- Zustand for global state management
- TypeScript for type safety
- Middleware for route protection and domain handling
- Environment variables for configuration

## Module Implementation
Modules follow a structured approach:
- Feature-specific components in _components/
- Schema and type definitions in _lib/schema.ts
- TanStack Query hooks in _lib/queries.ts
- React hooks in _lib/hooks.ts
- Service implementations in services/common/{module-name}/

## Common Issues
- TypeScript errors related to SearchParams, Date constructors, and API response types
- React Hook Form type compatibility issues
- Property name standardization (userType → account_type, userRole → active_role)

## SEO Implementation
- Dynamic metadata generation based on tenant type
- Structured data with JSON-LD for events and organizations
- Sitemap generation and robots.txt configuration
- Canonical URL implementation

## Security Measures
- JWT verification with secure server-side secrets
- Permission storage validation and session integrity checks
- Anti-tampering measures for client-side storage
- Secure logout process and token invalidation

## Development Guidelines
- Follow module implementation guide for new features
- Use proper naming conventions (account_type, active_role, website_role)
- Implement proper TypeScript types for API responses
- Leverage TanStack Query for data fetching and caching

## Event Management Features
- Create and manage various event types
- Set up ticketing and registration
- Manage guest lists and RSVPs
- Send invitations and reminders
- Track attendance and engagement
- Generate reports and analytics

## Venue Management
- Create detailed venue profiles
- Manage multiple locations
- Set availability and booking rules
- Upload photos and virtual tours
- Manage amenities and services
- Handle reviews and ratings

## Site Essentials
Site Essentials is a comprehensive configuration module that allows vendors and partners to customize their EventWizz website. The module is divided into several key sections:

### Branding
- Site Name: Set the name of your website that appears in headers and footers
- Copyright Text: Customize the copyright text that appears in the footer
- Logo: Upload your business logo (PNG or JPG, max 2MB, recommended 240×60px)
- Favicon: Upload a favicon for browser tabs (PNG, recommended 32×32px)
- Landing Page Content: Configure heading, subheading, and banner image/video for your homepage
- About Section: Set title, description, and call-to-action for the about section

### Colors
- Primary Colors: Set primary, secondary, and accent colors for your site
- Layout Colors: Customize header and footer colors
- Background: Choose solid colors or gradients for your site background
- Status Colors: Configure success, warning, error, and info notification colors
- Text Colors: Set main text and dimmed text colors
- Social Login Colors: Customize appearance of Google and Microsoft login buttons

### Typography
- Font Family: Select different fonts for headings and body text
- Choose from popular web fonts like Inter, Roboto, Nunito, Lato, Montserrat, etc.

### Contact Information
- Email: Set primary and alternative contact emails
- Phone: Configure primary and alternative phone numbers
- Address: Add your physical address for visitors to find you

### Social Links
- Connect your business social media profiles
- Support for Facebook, Twitter, Instagram, LinkedIn, and YouTube
- URLs are validated to ensure they're properly formatted

### SEO Settings
- SEO Title: Customize the title that appears in search engine results (browser tabs)
- Meta Description: Add a brief description of your site (150-160 characters recommended)
- Meta Keywords: Set comma-separated keywords related to your business and events

### Domain Settings
- Domain Management: Your domain is automatically created during onboarding based on venue name
- Domain Verification: Complete verification within 72 hours to maintain full account access
- Custom Domain: Option to update your subdomain name during the verification period
- Business Verification: Upload VAT number and business document to verify your business credentials

All settings are saved in real-time and can be previewed before publishing. The Site Essentials module uses TanStack Query for efficient data fetching and caching, with React Hook Form for form management and validation.

## Vendor Onboarding (Fresh Vendor — How We Help)

When a new vendor registers, they go through a **11-step onboarding** to create their first event and go live. The AI assistant should help them understand each step, where they are, and what comes next.

### How many steps? What are they?
**Total: 11 steps.** Step names as shown in the stepper:

1. **Venue** — Venue name, contact number, email, address, city, description. This becomes the basis for your subdomain.
2. **Site** — Landing page: logo, cover image, banner heading/subheading, about title/description. This is your **site homepage** (venue page).
3. **Event** — Event name, banner image, event heading/subheading, about event, **event schedule** (times and titles). This is your **event page** content.
4. **Package** — Packages section: title, description, button text, package details (bullet points), **gallery images** (at least 4 recommended).
5. **Dates** — **Date system**: Add one or more event dates. Per date you choose **booking type**: Tickets only, Tables only, or Both. For each date you set:
   - **Tickets**: ticket types with title, description, capacity, price.
   - **Tables**: table types with min/max persons, price, number of tables.
   - **Deposit system** (for tables/both): payment type (Full or Deposit), deposit type (amount or percentage), deposit value, deposit due date. Customers can pay deposit now and the rest later.
6. **Catering** — **Menu (optional)**. If your venue has no catering, you can remove this section. Otherwise: menu title, description, menu categories and items.
7. **Other Packages** — **Drinks (optional)**. If no drink packages, you can remove this section. Otherwise: drinks title, description, drink packages with title, price, quantity.
8. **Brochure info** — **Event location/address** (event address field), brochure PDFs, event flyer/FAQ PDFs, **price start from**, button text, downloads. This is where **event location** and **brochure** are set.
9. **FAQs** — Frequently asked questions and answers for the event.
10. **Payment** — **Payment gateways**: Connect **Stripe** (Stripe Connect), **PayPal**, **TrueLayer** (Pay by Bank), **WorldPay**, or **Klarna**. You need at least one connected to accept payments. No coding required; connect via the buttons and complete the provider’s flow.
11. **Publish** — **Domain**: Your venue gets a **subdomain** (e.g. yourvenue.eventwizz.com). Step 11 handles domain suggestion/selection, reminder email settings, and **Apply & Create My Site**. After publishing, onboarding is complete and you are redirected to the **vendor dashboard**.

### AI onboarding vs manual
- Vendors can choose **AI-assisted** or **manual** onboarding at the start.
- **AI flow**: They enter venue name, type, and a short description (and can use **voice** to describe requirements). AI generates content for steps 2–9 (site, event, packages, dates/tickets/tables, menu, drinks, brochure/location, FAQs). They **review and edit** the generated content, then click **Apply & Create My Site**. The system saves steps 1–9 and takes them to **Step 10 (Payment)**. They then complete **Step 10 (Stripe/PayPal/etc.)** and **Step 11 (Domain & Publish)** themselves.
- **Manual flow**: They fill each step (1–11) themselves. Progress is saved automatically; they can leave and come back.
- After they finish (AI or manual), they **cannot** return to the mode-selection page to regenerate; they continue from the dashboard.

### Key terms for fresh vendors
- **Site page / venue page**: The **landing page** (Step 2) — logo, cover, banner, about. Your venue’s homepage.
- **Event page**: The **event** content (Step 3) — event name, banner, schedule, plus later steps (packages, dates, menu, drinks, location, FAQs).
- **Event location**: Set in **Step 8 (Brochure info)** — event address and map.
- **Brochure**: Step 8 — brochure PDF, event flyer PDF, FAQ PDF, and any extra downloads.
- **Deposit system**: Step 5, per date — for tables (or “both”), you can enable deposit: type (amount/percentage), value, and due date. Customers pay deposit at checkout and the rest by the due date.
- **Stripe / payment**: Step 10 — connect your **Stripe account** (and/or PayPal, TrueLayer, etc.) to receive payments.
- **Domain**: Step 11 — your **subdomain** is created at publish; you choose/confirm it in Step 11 before applying.

## Vendor Registration Process
- Go to the EventWizz website and click "Become a Vendor" (e.g. top-right).
- Register with business email and password.
- You are taken to onboarding: either **AI-assisted** or **manual** (11 steps).
- Each step is saved automatically; you can continue later. Progress is tracked in your session.
- After completing Step 11 (Publish), you are redirected to the **vendor dashboard** and your site is live.

## Vendor Welcome & Select Location

After login (or after completing onboarding), vendors are sent to **Welcome — Select Location** (/welcome/select-location). This page is the entry point before the dashboard.

- **Purpose**: The vendor must **pick which venue** to manage. Vendors can have multiple venues (locations) on one account.
- **Left panel**: Welcome message (“Welcome back, [Name]!”), badge “Venue Management”, short copy “Pick a venue below and jump straight into your dashboard.” Shows how many venues are on the account and which one is currently selected.
- **Main area — “Your Venues”**: List of all venues (name, address, slug e.g. # bristol). One venue is marked **Default** and can show “Selected”. Vendor **taps a venue** to select it, then clicks **“Continue to Dashboard →”** to go to the vendor dashboard for that venue.
- **Add Location**: “+ Add Location” button allows adding a new venue/location to the account.
- **After selection**: Clicking “Continue to Dashboard” switches the active location and redirects to **/vendor/dashboard**. All dashboard pages (Events, Bookings, etc.) are then scoped to the selected venue. The **location selector** in the header (e.g. “Bristol”) can be used later to switch venue without going back to the welcome page.

If the vendor has no location or needs to choose one, they will be redirected to /welcome/select-location. Do not tell them to go to “dashboard” without selecting a location first.

## Vendor Dashboard — All Pages & Menus

After selecting a venue on the Welcome page, the vendor sees the **vendor dashboard** with a **sidebar** and **header**. Every feature below is a menu item or linked from the header. Do not invent pages or menu names; use these exactly.

### Sidebar menu (order and routes)

1. **Dashboard** (/vendor/dashboard) — Main overview: Total Events, Active Event, Past Event, Draft Event; toggle **Bookings** vs **Commissions**; date range filter; metrics (Total Bookings, Total Payment, Partial Payment, Received Payment); **Recent Bookings** table (Transaction ID, Customer, Event, Total, Balance Due, Status, Actions). “Current location: [Venue]” is shown.

2. **Events** (/vendor/events) — List of all events (tabs/filters: All, Active, Draft, etc.). **Create Event** is in the **header** (blue button), not only here. From the list you can select events and perform bulk actions (e.g. set to draft/active). Clicking an event opens event details/overview and the multi-step event form (event name, packages, dates/tickets/tables, menu, drinks, brochure, FAQs, publish).

3. **Customers** (/vendor/customers) — Data table of customers (e.g. who booked). Search, filters, bulk actions (activate, deactivate, delete, restore). View and manage customer records.

4. **Bookings** (/vendor/booking-history) — **Booking history** (not “Orders”): all customer bookings with search, status filter, date range. View transaction ID, customer, event, total, balance due, status, and actions. From a booking you can view details, adjust booking, reschedule, handle add-ons (tables, drinks), view menu choices, etc.

5. **Email Templates** (/vendor/email-templates) — Manage automated email templates used for notifications and communications.

6. **Menu Choice** (/vendor/menu-choices) — **Customer menu choices**: view and manage **per-booking** menu selections (e.g. which dishes customers chose for a booking). Filter by event and date. Export menu choices. This is different from “catering menu setup” (that is in the event form or Site Essentials context); Menu Choice here is the list of customer-submitted choices per booking.

7. **Transactions** (/vendor/transactions) — View **transaction/payment records**: list of payments received, with export/receipt options. Use this to see what money came in, not to connect Stripe/PayPal.

8. **Sites Essentials** (/vendor/sites-essentials) — **Site branding and configuration** for the **current location**. Tabs: **Branding** (site name, logo, favicon, copyright, landing banner image/video, about section), **Colors** (primary, secondary, layout, background, status colors), **Typography** (heading and body fonts), **Social Media** (Facebook, Twitter, Instagram, LinkedIn, YouTube), **SEO** (meta title, description, keywords). Optional: gallery title and other location-specific settings. Saves per location. This does **not** include domain or business verification — those are under Domain Settings.

9. **Event Locations** (/vendor/venue-locations) — **Manage venues/locations** on the account. List of all locations (name, address, slug). Add new location (“+ Add Location”), edit, delete. Each location has its own subdomain, events, and Site Essentials. This is the same “locations” list you see on the Welcome page; managing them here lets you add/edit/delete.

10. **Marketing** (/vendor/marketing) — Marketing tools and campaigns for the venue.

11. **Newsletter** (/vendor/newsletter) — Newsletter management: build and send newsletters to customers/subscribers.

12. **Email Logs** (/vendor/email-logs) — **Log of sent emails**: view, search, resend, reply to automated and manual emails sent from the platform.

13. **System Logs** (/vendor/system-logs) — System/audit logs for the venue (troubleshooting and activity).

14. **Manage Roles** (/vendor/manage-roles) — Define and manage **roles and permissions** (what each role can do). Create/edit roles and assign permission keys.

15. **Staff Management** (/vendor/staff-management) — **Add and manage staff** members: invite staff, assign roles, edit, deactivate. Staff can then log in and access the dashboard according to their role.

16. **Seo Tools** (/vendor/seo-tools) — SEO optimization tools for the venue’s public site (search visibility).

17. **Notifications** (/vendor/notifications) — In-app notification settings and history.

18. **Support** (/vendor/support) — **Support tickets**: create and view support tickets, track responses. Use this to get help from the platform.

19. **Dispute Resolution** (/vendor/dispute-resolution) — View and handle **disputes** (e.g. between vendor and customer). Platform may use this for dispute resolution flows.

20. **Payment Settings** (/vendor/payment-settings) — **Connect payment providers**: Stripe Connect, PayPal, TrueLayer (Pay by Bank), WorldPay, Klarna. Connect or disconnect gateways; manage how you receive payments. This is **not** the same as Transactions (which only shows payment history).

### Header (top bar)

- **Search** — Global search.
- **Referral URL** — Vendor’s referral link; copy to share. Shown for vendors (and admins).
- **Location selector** — Dropdown showing current venue (e.g. “Bristol”). Switch venue here without going back to Welcome.
- **Help** — Help link/icon.
- **Notifications** — Bell icon for notifications.
- **Create Event** — Blue button; goes to create-new-event flow (same as creating from Events).
- **User profile dropdown** — Name, avatar. Menu items:
  - **Settings** submenu:
    - **Domain Settings** — Opens /vendor/domain-settings (see below). Not in the sidebar.
    - **Payment Settings** — Same as sidebar “Payment Settings” (/vendor/payment-settings).
  - **Log Out**.

### Domain Settings (user menu → Settings → Domain Settings)

- **Route**: /vendor/domain-settings (not under Sites Essentials; access from **profile dropdown → Settings → Domain Settings**).
- **Purpose**: Manage **subdomain** and **business verification** so the venue can stay fully active.
- **Tabs**: (1) **Domain Settings** (2) **Business Verification**.
- **Domain tab**: Shows **Your Domain** (e.g. yourbusiness.eventwizz.vercel.app), status (e.g. Pending Verification). **Update Domain** to change the subdomain name. **Important**: There is a **72-hour window** after creation to verify or update the domain; a countdown and warning (“Domain Verification Required — X hours remaining”) are shown. After that, account access can be restricted until verification is complete. Details shown: Created date, Edit expires (72h countdown), Status, Business Verification status.
- **Business Verification tab**: Upload **VAT number** and **business document** to verify the business. Required to unlock all platform features and complete verification.

Do not tell vendors that Domain Settings is under Site Essentials; it is under the **user profile → Settings → Domain Settings**. Do not say they have unlimited time to verify; they have **72 hours** to verify or update the domain before restrictions may apply.

## Admin Dashboard — All Pages & Menus

After login as **admin**, the user lands on the **Admin Dashboard**. There is **no welcome or select-location step** for admins; they go straight to the dashboard. The **sidebar** lists the following (use these exact names when directing admins; do not use technical paths or URLs in replies to them):

1. **Dashboard** — Main overview: summary cards (e.g. Total Customers, Active Customers, Disabled Customers, Support Tickets), customer overview, performance overview, sales history, venues commission, new customers. Platform-wide metrics.

2. **All Venues** — List of all vendor venues. Search, filter by status, pagination. Click a venue to open **venue detail**: view and manage venue info, **domain approval** (e.g. accept/reject domain), **login as venue** (impersonate vendor for support), **reset password** for the venue, **force logout**, **comments**, edit venue. Venue detail is the main place to approve or manage a single venue.

3. **Transaction History** — Platform-wide **transaction history**: view all transactions across venues, filter, search. For oversight of payments and refunds.

4. **Notifications** — Admin **notifications**: view and manage in-app notifications for the platform.

5. **Commission Overview** — **Commission** tracking: view platform commissions and revenue from venues. Charts and summary data.

6. **Manage Roles** — Define and manage **roles and permissions** for admin users. Create or edit roles and assign permission keys (what each role can do).

7. **Staff Management** — **Admin staff**: add staff members, assign roles, edit or deactivate. Staff can log in and use the admin panel according to their role.

8. **Email Template** — **Email templates** used by the platform (e.g. automated emails). Edit and manage system-wide templates.

9. **Site Essentials** — **Platform branding and configuration**: logo, colors, typography, contact info, social links, SEO for the main platform site (not per-venue; that is the vendor’s Site Essentials).

10. **Marketing Analytics** — **Marketing analytics** across the platform: performance, campaigns, metrics.

11. **System Logs** — **System and audit logs** for the platform. For troubleshooting and monitoring.

12. **Support** — **Support tickets**: view and manage tickets raised by vendors or customers. Reply, close, assign.

13. **Referrals** — **Referral program**: track and manage referrals (e.g. referral links, rewards).

14. **Sales & Marketing** — **Sales and marketing** tools and data: sales analytics, marketing campaigns.

15. **Seo Tools** — **SEO tools** for the platform: manage meta titles, descriptions, and search visibility.

16. **Dispute Resolution Centre** — **Disputes** between customers and vendors. View and resolve disputes in one place.

**Not in the sidebar:** **Payment Settings** — Under the **profile (name/avatar at top)** → **Settings** → **Payment Settings**. Used to configure platform-level payment or gateway settings. Do not tell admins to look for Payment Settings in the sidebar; it is under their profile menu.

**Summary for the AI:** Admins have no welcome/location step. Sidebar: Dashboard, All Venues, Transaction History, Notifications, Commission Overview, Manage Roles, Staff Management, Email Template, Site Essentials, Marketing Analytics, System Logs, Support, Referrals, Sales & Marketing, Seo Tools, Dispute Resolution Centre. Payment Settings is under profile → Settings. To manage a single venue: **All Venues** → click the venue → venue detail (domain approval, login as venue, reset password, edit, etc.). When answering admins, use only these menu and page names; do not use URLs or technical paths.

## Customer Flow (How Customers Book & Use the Platform)

Customers are **event attendees** who discover events on **vendor subdomains** (e.g. bristol.eventwizz.com), add items to the cart, and checkout. They do **not** have a “welcome / select location” step; they have a single account and see all their bookings across any venue.

### 1. Discovery & booking (public — no login required to browse)

- **Vendor site home**: On a vendor subdomain, the home page shows “Find Events Near You” and a **location grid or map** (if the venue has multiple locations). Customer can select a location (e.g. Bristol) to see events for that location.
- **Location events page**: URL pattern like /[locationSlug] (e.g. /bristol) shows **events for that location**. Customer browses events.
- **Event detail**: URL pattern /[locationSlug]/events/[eventSlug]. Customer sees event info, **dates**, and **packages** (tables, tickets, drink packages) and pricing. To start a booking they **choose a date** from the event’s date list; that adds the date to the cart and takes them to **Checkout**. Ticket/table/drink selection happens on the checkout page (see “How customers select tickets and tables” below). Cart syncs for logged-in customers.
- **Checkout**: **/vendor/checkout** (on the same vendor subdomain). Checkout **requires the user to be logged in as a customer**. If not logged in, they are redirected to **login** with a return URL back to checkout. If logged in as vendor/admin, they are redirected (only customers can checkout). On checkout they **select ticket and table packages (and drinks) per date**, complete **guest allocation** for tables if needed, then choose **payment method** (full or deposit for tables) and pay. After payment, success page and booking in the customer dashboard.

### How customers select tickets and tables (and drink packages)

The **ticket and table system** works in two steps: (1) pick a date on the event page, (2) on **Checkout** choose which ticket types, table types, and drink packages to add for each date.

**Step 1 — Choose a date (event page)**  
On the event detail page the customer sees a **list of event dates** (each may show day, date, and “from” price). When they **click a date** (or the button that adds that date), the system adds that **date to the cart** and redirects to **Checkout** (/vendor/checkout). They must be **logged in as a customer** to add a date; if not, they are sent to login then back to checkout. They can add **more than one date** for the same event (multi-date booking) by returning to the event and selecting another date.

**Step 2 — Select ticket / table / drink packages (checkout page)**  
On **Checkout**, the cart is shown **per date**. For each date the customer sees:

- **Tickets**: If the event offers tickets for that date, they see **ticket types** (e.g. General Admission, VIP) with name, price, and capacity. They choose **quantity** for each ticket type. No guest allocation for tickets.
- **Tables**: If the event offers tables for that date, they see **table types** (e.g. Table for 4, Table for 6) with min/max persons and price. They choose **which table type(s)** and **how many** of each. The system may show **table recommendations** (e.g. by guest count). If they select **multiple tables**, they must complete **guest allocation**: distribute their total guest count across the tables (e.g. 10 guests across 2 tables of 4 and 1 table of 2). Guest allocation can be required before the cart is valid. For tables they can often choose **full payment** or **deposit** (venue setting) at checkout.
- **Drinks**: If the event has drink packages, they see **drink package types** (name, price) and choose **quantity** for each.

So: **ticket packages** = select ticket type(s) and quantity per type. **Table packages** = select table type(s) and quantity, then **allocate guests** across tables if more than one table. **Drink packages** = select package type(s) and quantity. All of this is done **on the checkout page** per date. The cart can have multiple dates; each date has its own tickets, tables, and drinks. When valid (e.g. guest allocation complete), they proceed to **payment** (full or deposit for tables).

### 2. Registration & login

- **Register**: **/auth/register** then **/auth/register/customer** (or the path shown for customer sign-up). Flow can include email verification (OTP), then **create password**. After that, customer can log in.
- **Login**: **/auth/login**. After successful login as **customer**, redirect is to **/customer/dashboard** (not a welcome/location page).
- **From checkout**: If customer clicks checkout while not logged in, they are sent to login with a return URL (callbackUrl) back to checkout so they can complete the booking after signing in.

### 3. Customer dashboard — all pages and menus

After login, customers land on **Customer Dashboard** (/customer/dashboard). The **sidebar** has these items (use these exact names and routes):

1. **Dashboard** (/customer/dashboard) — Main landing after login. Sections: **My Upcoming Events** (events they have bookings for), **Nearby Events** (suggested events), **Recent Bookings** (latest bookings with link to “View All Bookings” and to each booking detail). No “select location” step; one dashboard for the customer.

2. **Profile** (/customer/profile) — Update **name** (first/last), **phone**, **avatar** (profile picture), and **password** (current password, new password, confirm). Save separately for profile vs password.

3. **Bookings** (/customer/bookings) — **My Bookings** list. **Filters**: status (All, Pending, Confirmed, Cancelled, Partial Payment), **search**, **pagination**. Each booking shows event name, status, payment status, total, booking ref, etc. Actions: **View Details** → opens booking detail page; **Menu Choices** (if applicable) → opens menu choices for that booking.

4. **Notifications** (/customer/notifications) — List of **in-app notifications**. Filter, paginate, **mark as read / unread**, **mark all as read**. Open a notification to view details.

5. **Transactions** (/customer/transactions) — **Payment history**: list of transactions (payments made). Filter by status, date, method; view transaction details. Use this to see “what I paid” and receipts, not to make a new payment (new payments are done at checkout).

**No sidebar item**: **Support** is commented out in the customer menu (not currently in the sidebar). Do not tell customers to go to “Support” in the sidebar unless it is re-enabled.

### 4. Booking detail: pay balance, reschedule, and add-ons

- **Booking detail** — **/customer/bookings/[id]** (replace [id] with the booking ID). This is the **same booking** they see in **Bookings** (/customer/bookings). From here they can **pay balance**, **reschedule** a date, and **add add-ons**. **Tabs**: **Booking Info** (summary, dates, payment status, download invoice, pay outstanding balance), **Add-ons** (add more tables/tickets/drinks for a date, reschedule a date, view or remove existing add-ons). **Menu choices** link goes to /customer/menu-choices/[bookingId] when the booking has catering.

**If payment failed at checkout**  
If the customer’s **payment failed** at checkout (e.g. card declined, session expired), the **booking is still created** and appears in their **dashboard** under **Bookings** with a status like Pending or Partial Payment. They open **the same booking** (View Details → /customer/bookings/[id]), and on the booking detail page they can **pay the balance** (outstanding amount). So: payment failed at checkout → go to **Bookings** in the dashboard → open that booking → **pay from the booking detail page**.

**Pay balance**  
On the booking detail page, the **outstanding balance** (or “Balance due”) is shown. The customer can **pay** it from there (same payment options as at checkout). Use this for: failed checkout payment, deposit balance due, or add-ons they just added.

**Reschedule**  
From the **booking detail** page, the customer can **reschedule** one or more dates (e.g. “Reschedule” for a date, often from the Add-ons tab or per-date actions). They choose a **new date** from the available event dates and confirm. **Important**: Rescheduling a date may **remove add-ons** for that date (e.g. extra tables, tickets, drinks added for that date); the system may show a warning before confirming. After reschedule they may need to **pay** if there is a fee or balance. Tell customers: go to **Bookings** → open the booking → use **Reschedule** for the date you want to change; check the warning about add-ons.

**Add add-ons**  
From the **booking detail** page, **Add-ons** tab: the customer can **add more** tables, tickets, or drinks to an **existing** booking for a given date. They select the date, then add extra tables/tickets/drinks (same types as at checkout). They may need to **pay** for the new add-ons (balance updates). They can also **view or remove** existing add-ons here. So: **Bookings** → open booking → **Add-ons** tab → choose date → add tables/tickets/drinks → pay if required.

- **Menu choices** — **/customer/menu-choices/[bookingId]**. For bookings that include **catering** (tables with menu), the customer selects **menu items per date and per table** (e.g. starter, main, dessert). **Date switcher** and **table switcher**; **Save** to submit. Vendor sees these under **Vendor → Menu Choice**.

### 5. Summary for the AI

- **Where do customers book?** On **vendor subdomains** (e.g. venue.eventwizz.com): browse events → event detail → add to cart → **Checkout** (/vendor/checkout). Must be **logged in as customer** to checkout.
- **Where do customers go after login?** **/customer/dashboard** (Dashboard, then Bookings, Profile, Notifications, Transactions as needed).
- **How do they see their bookings?** **Bookings** (/customer/bookings). View details: **/customer/bookings/[id]**.
- **How do they add menu choices (e.g. dish selection)?** **Menu Choices** for that booking: from Bookings list click “Menu Choices” for the booking, or open **/customer/menu-choices/[bookingId]**.
- **How do they pay balance or update profile?** Pay balance from **booking detail** (/customer/bookings/[id]). Update name/phone/avatar/password in **Profile** (/customer/profile).
- **Payment failed at checkout?** The same booking appears in **Bookings**; open it and **pay the balance** on the booking detail page. No need to book again.
- **Reschedule:** From **booking detail** → Reschedule for a date → choose new date → confirm (warning: add-ons for that date may be removed).
- **Add add-ons:** From **booking detail** → **Add-ons** tab → choose date → add tables/tickets/drinks → pay if required.
- **Transactions** = history of payments made. **Notifications** = in-app notifications (read/unread).

## Complete EventWizz Platform Overview

EventWizz is a comprehensive multi-tenant event management platform that serves four distinct user types with specialized features and interfaces.

### User Types & Access

#### 🏢 Admin Portal (website_role="admin")
- **Who**: Platform administrators and system managers
- **Access**: After login, admins go straight to the **Admin Dashboard** (no welcome or select-location step). Full platform control and vendor management.
- **Key Features** (see “Admin Dashboard — All Pages & Menus” for full detail): **Dashboard** (overview, metrics, sales, venues commission), **All Venues** (list of venues; click one for venue detail: domain approval, login as venue, reset password, edit, comments), **Transaction History**, **Notifications**, **Commission Overview**, **Manage Roles**, **Staff Management**, **Email Template**, **Site Essentials** (platform branding), **Marketing Analytics**, **System Logs**, **Support** (tickets), **Referrals**, **Sales & Marketing**, **Seo Tools**, **Dispute Resolution Centre**. **Payment Settings** is under **profile (top right)** → **Settings** → **Payment Settings**, not in the sidebar.

#### 🏪 Vendor Portal (website_role="vendor") 
- **Who**: Venue owners and event organizers
- **Access**: After login, vendors go to **Welcome — Select Location** (/welcome/select-location) to choose which venue to manage, then **Continue to Dashboard** to reach the vendor dashboard. All features are scoped to the selected location.
- **Key Features** (see “Vendor Dashboard — All Pages & Menus” for full detail):
  - **11-step onboarding** for new vendors (Venue → Site → Event → Package → Dates → Catering → Other Packages → Brochure info → FAQs → Payment → Publish). See "Vendor Onboarding (Fresh Vendor)" section.
  - **Dashboard** (/vendor/dashboard): Summary (Total/Active/Past/Draft events), Bookings vs Commissions toggle, recent bookings table.
  - **Events** (/vendor/events): Event list and **Create Event** (header button); multi-step event form.
  - **Customers** (/vendor/customers), **Bookings** (/vendor/booking-history), **Email Templates** (/vendor/email-templates), **Menu Choice** (/vendor/menu-choices — customer menu choices per booking), **Transactions** (/vendor/transactions — payment history), **Sites Essentials** (/vendor/sites-essentials — branding, colors, typography, SEO), **Event Locations** (/vendor/venue-locations — add/edit venues), **Marketing**, **Newsletter**, **Email Logs**, **System Logs**, **Manage Roles**, **Staff Management**, **Seo Tools**, **Notifications**, **Support**, **Dispute Resolution**, **Payment Settings** (/vendor/payment-settings — connect Stripe/PayPal etc.).
  - **Domain Settings**: Under **profile dropdown → Settings → Domain Settings** (/vendor/domain-settings), not in sidebar. Manages subdomain and 72-hour verification window; Business Verification tab for VAT and documents.

#### 👥 Customer Portal (website_role="customer")
- **Who**: Event attendees and booking customers
- **Access**: After login, customers go to **/customer/dashboard** (no welcome/location step). They book on **vendor subdomains** (e.g. venue.eventwizz.com): browse events → event detail → add to cart → **Checkout** (/vendor/checkout); checkout requires customer login.
- **Key Features** (see “Customer Flow & Customer Dashboard” for full detail):
  - **Dashboard** (/customer/dashboard): My Upcoming Events, Nearby Events, Recent Bookings (link to Bookings and to booking detail).
  - **Profile** (/customer/profile): Update name, phone, avatar, password.
  - **Bookings** (/customer/bookings): My Bookings list with status filter (All, Pending, Confirmed, Cancelled, Partial Payment), search, pagination; View Details → /customer/bookings/[id]; Menu Choices → /customer/menu-choices/[bookingId].
  - **Booking detail** (/customer/bookings/[id]): Same booking as in list. **Pay balance** (including after failed checkout), **Reschedule** a date (new date; add-ons for that date may be removed), **Add-ons** tab (add more tables/tickets/drinks per date, view/remove existing), download invoice, link to menu choices.
  - **Menu choices** (/customer/menu-choices/[bookingId]): Select dishes per date and per table for that booking; save choices.
  - **Notifications** (/customer/notifications): In-app notifications; mark read/unread.
  - **Transactions** (/customer/transactions): Payment history and transaction details.
  - **Public (no login)**: Browse events on vendor subdomain, event detail, add to cart; **login required at checkout**.


### Checkout & Booking System

The EventWizz checkout system is a sophisticated event booking platform that handles complex scenarios including multi-date event bookings, table reservations with guest allocation, ticket and drink package sales, flexible payment options, real-time cart management, and guest allocation optimization.

#### Key Checkout Features
- Smart Table Recommendations: AI-powered table suggestions based on guest count
- Guest Allocation System: Interactive guest distribution across tables
- Partial Payment Support: Deposit payments for tables only
- Real-time Validation: Multi-layer validation system
- Responsive UI: Professional checkout experience
- State Persistence: Cart data persists across sessions

#### Booking Flow
1. **Event Discovery**: Customers browse events on vendor websites
2. **Event Selection**: Choose event, date, and package options
3. **Cart Management**: Add tables, tickets, drinks to cart
4. **Guest Allocation**: Distribute guests across selected tables
5. **Payment Processing**: Choose payment method and complete booking

#### Table System
The system uses an intelligent algorithm to suggest optimal table configurations:
- **Perfect Fit**: Guest count exactly matches table capacity
- **Good Fit**: Slight overcapacity with minimal waste
- **Multiple Tables**: Requires multiple tables for large groups
- **Oversized**: Table larger than needed (lowest priority)

#### Payment Options
**Full Payment**: Pay everything today for all items (tables, tickets, drinks)
**Deposit Payment**: Pay deposit today, rest later (tables only)

### Payment Gateway Integration

EventWizz supports multiple payment providers with a hybrid approach:

#### Marketplace-Ready Providers (Recommended)
- **Stripe Connect**: Full marketplace support with automatic commission splitting
- **PayPal Commerce Platform**: Full marketplace support with automatic commission splitting

#### Traditional Gateway Providers
- **WorldPay**: Manual API key configuration
- **Klarna**: Manual API key configuration

### Authentication & Security

#### OAuth Integration
- **Google OAuth**: Seamless login with Google accounts
- **Facebook OAuth**: Social login with Facebook accounts
- **Multi-tenant Support**: Different login flows for different user types

#### Security Features
- JWT-based authentication with secure token management
- Role-based permission system with granular access control
- SSL encryption for all payment processing
- Secure session management with automatic token refresh

### Theme & Animation System

#### Automatic Theme Detection
The system automatically detects event themes and displays corresponding animations:
- **18+ Supported Themes**: Christmas, Spider-Man, Birthday, Wedding, Halloween, etc.
- **Performance Optimized**: Canvas-based animations with 60fps smooth rendering
- **Admin Controls**: Full control over theme selection and animation intensity

### Multi-Tenant Architecture

#### Domain Structure
- **Admin Sites**: Platform management interfaces
- **Vendor Sites**: Customer-facing event booking sites (subdomains)
- **Partner Sites**: White-labeled partner management interfaces
- **Customer Sites**: Public event discovery and booking

#### White-Labeling Support
- **Custom Branding**: Venues can customize colors, logos, and themes
- **Domain Management**: Automatic subdomain creation during onboarding
- **SEO Optimization**: Each venue gets optimized search engine visibility

### Onboarding Process (Summary)

The full **11-step vendor onboarding** is described in the "Vendor Onboarding (Fresh Vendor)" section above. In short: (1) Venue info (2) Site/landing page (3) Event details and schedule (4) Packages and gallery (5) Dates with tickets/tables and per-date deposit options (6) Catering menu, optional (7) Drink packages, optional (8) Brochure info, event location/address, PDFs (9) FAQs (10) Payment — connect Stripe, PayPal, TrueLayer, WorldPay, or Klarna (11) Publish — domain/subdomain, then Apply & Create My Site. After Step 11, the vendor is redirected to the vendor dashboard and the site is live. Vendors can use **AI-assisted** onboarding (AI generates steps 2–9; they review and apply, then do payment and publish) or **manual** (fill all 11 steps themselves).

### Event Creation Process

#### 8-Step Event Creation (Post-Onboarding)
1. **Event Name**: Set event title, description, and basic information
2. **Package Setup**: Configure event packages and pricing
3. **Dates & Tickets**: Set event dates, table types, and ticket options
4. **Menu Configuration**: Set up catering menus and food options
5. **Drink Packages**: Configure beverage packages and pricing
6. **Brochure Information**: Add event details, PDFs, and additional info
7. **FAQs**: Add frequently asked questions
8. **Publish**: Review and publish the event

### Public Customer Features

#### Event Discovery & Booking
- **Event Browsing**: Browse events on vendor-specific subdomains
- **Event Details**: View comprehensive event information, packages, and pricing
- **Date Selection**: Choose from available event dates
- **Package Selection**: Select tables, tickets, and drink packages
- **Guest Allocation**: Interactive tool to distribute guests across tables
- **Cart Management**: Real-time cart with persistent state
- **Checkout Process**: Secure payment processing with multiple gateways
- **Booking Confirmation**: Receive booking confirmations and details

#### Advanced Booking Features
- **Multi-Date Booking**: Book multiple dates for the same event
- **Table Recommendations**: AI-powered table suggestions based on guest count
- **Payment Options**: Full payment or deposit payment for tables
- **Guest Management**: Drag-and-drop guest allocation across tables
- **Real-time Validation**: Live validation of booking requirements
- **Session Persistence**: Cart data persists across browser sessions

### Common User Questions & Solutions

#### For Customers (Booking & Checkout)
- **"How do I book an event?"** - Go to the venue’s website (vendor subdomain, e.g. bristol.eventwizz.com), browse events or pick a location, open an event, select date and packages (tables/tickets/drinks), add to cart, then go to **Checkout** (/vendor/checkout). You must be **logged in as a customer** to checkout; if not, you’ll be redirected to login and then back to checkout.
- **"How do I book a table?"** - On the **event page**, click a **date** to add it to the cart (you’ll go to Checkout). On **Checkout**, for that date you’ll see **table types** (e.g. Table for 4, Table for 6). Choose which table type(s) and how many. If you pick **multiple tables**, use **guest allocation** to distribute your guests across the tables. Then choose **full** or **deposit** payment and complete checkout.
- **"How do I select ticket or table packages?"** - **Ticket and table selection happens on the Checkout page**, not on the event page. On the event page you only **choose a date** (click the date); that takes you to Checkout. On Checkout you’ll see, for each date: **ticket types** (choose quantity per type), **table types** (choose type(s) and quantity, then allocate guests if you have multiple tables), and **drink packages** (choose quantity). Fill those in per date, then pay.
- **"Can I pay a deposit?"** - Yes. For **table** bookings, the venue can offer deposit payment: you pay the deposit at checkout and the rest by the due date. The option appears at checkout when the venue has enabled it for that date.
- **"Where is my cart?"** - Cart is on the **vendor site**; from the event page you add items, then go to **Checkout** (/vendor/checkout). For logged-in customers, the cart is saved and can persist across devices.
- **"Do I need to create an account?"** - You can browse events without an account. To **complete a booking** you must **log in as a customer** (or register at /auth/register then /auth/register/customer). At checkout, if you’re not logged in, you’ll be sent to login and then back to checkout.

#### For Customers (Dashboard — After Login)
- **"Where do I go after login?"** - You are taken to **Customer Dashboard** (/customer/dashboard). There is no “select location” step; you see **My Upcoming Events**, **Nearby Events**, and **Recent Bookings**.
- **"Where are my bookings?"** - **Bookings** (/customer/bookings). You can filter by status (All, Pending, Confirmed, Cancelled, Partial Payment) and search. Click a booking to view details or open **Menu Choices** for that booking.
- **"How do I view one booking?"** - In **Bookings**, click **View Details** on the booking, or go to **/customer/bookings/[booking-id]**.
- **"How do I add menu choices (dishes) for my booking?"** - From **Bookings**, click **Menu Choices** for that booking, or go to **/customer/menu-choices/[bookingId]**. Select dishes per date and per table, then save.
- **"How do I pay my balance?"** - Go to **Bookings** → open the booking (**View Details**) → **/customer/bookings/[id]**. On the booking detail page you’ll see the outstanding balance and can **pay** it there (same payment options as checkout). You can also **reschedule** or **add add-ons** from that page.
- **"Payment failed at checkout — how do I pay?"** - The **same booking** will appear in your **Bookings** list in the dashboard (e.g. Pending or Partial Payment). Open that booking (**View Details**), then on the **booking detail** page (**/customer/bookings/[id]**) you can **pay the balance** (outstanding amount). You don’t have to book again; just pay on the existing booking.
- **"How do I reschedule my booking?"** - Go to **Bookings** → open the booking (**View Details**) → booking detail page. Use **Reschedule** for the date you want to change (often in the **Add-ons** tab or next to that date). Pick a **new date** from the available event dates and confirm. **Note**: Rescheduling a date may remove add-ons for that date (e.g. extra tables/drinks); the page will warn you before you confirm.
- **"How do I add add-ons (extra tables, tickets, drinks) to my booking?"** - Go to **Bookings** → open the booking (**View Details**) → **Add-ons** tab. Choose the **date**, then add more **tables**, **tickets**, or **drinks** (same types as at booking). You may need to **pay** for the new add-ons. You can also view or remove existing add-ons there.
- **"Where do I update my name or password?"** - **Profile** (/customer/profile). You can update first name, last name, phone, avatar, and password (current password required for password change).
- **"Where do I see my payment history?"** - **Transactions** (/customer/transactions). This shows payments you’ve made and transaction details; it is not for making new payments (new payments are at checkout or on the booking detail page).
- **"Where are my notifications?"** - **Notifications** (/customer/notifications). You can mark items read/unread and view details.
- **"Is my payment secure?"** - Yes. Payments are processed via secure gateways (e.g. Stripe, PayPal). Do not share your password or payment details with anyone; the platform never asks for your full card number in chat.

#### For Vendors (Fresh / Onboarding)
- **"How many steps is onboarding?"** - 11 steps: Venue, Site, Event, Package, Dates, Catering, Other Packages, Brochure info, FAQs, Payment, Publish
- **"What is step 1?"** - Venue: name, contact, address, city, description. This feeds your subdomain
- **"What is step 2?"** - Site: landing page — logo, cover image, banner heading, about section
- **"What is step 5?"** - Dates: add event dates; per date set tickets and/or tables, and for tables you can set deposit (type, value, due date)
- **"Where do I set event location/address?"** - Step 8 (Brochure info) — event address field and brochure PDFs
- **"Where do I add brochure / PDFs?"** - Step 8 (Brochure info)
- **"Is menu required?"** - No. Step 6 (Catering) is optional; you can remove it if you have no catering
- **"Is drinks section required?"** - No. Step 7 (Other Packages) is optional; you can remove it if you have no drink packages
- **"How do I connect Stripe?"** - Step 10 (Payment): use the Stripe Connect button and complete the Stripe flow
- **"When do I get my domain?"** - Step 11 (Publish): you choose/confirm your subdomain, then click Apply & Create My Site; after that you are redirected to the dashboard

#### For Vendors (Welcome & Location)
- **"Where do I go after login?"** - You go to Welcome — Select Location (/welcome/select-location). Pick a venue and click “Continue to Dashboard” to open the dashboard for that venue.
- **"How do I switch to another venue?"** - Use the location dropdown in the top header (e.g. “Bristol”), or go back to /welcome/select-location and select a different venue then Continue to Dashboard.
- **"How do I add another venue?"** - On the Welcome page click “+ Add Location”, or in the dashboard go to **Event Locations** (/vendor/venue-locations) and add a new location.

#### For Vendors (Dashboard — After Onboarding)
- **"How do I create more events?"** - Click the blue **Create Event** button in the top header, or go to **Events** (/vendor/events) and create from there. Both use the same multi-step event form.
- **"Where do I see my bookings?"** - **Bookings** (/vendor/booking-history). Not “Order History” — the menu says Bookings.
- **"How do I customize my site (logo, colors)?"** - **Sites Essentials** (/vendor/sites-essentials). Tabs: Branding, Colors, Typography, Social Media, SEO.
- **"Where do I connect Stripe or PayPal?"** - **Payment Settings** (/vendor/payment-settings), or from profile dropdown → Settings → Payment Settings. Not “Transactions”; Transactions is for viewing payment history.
- **"Where do I see payments I received?"** - **Transactions** (/vendor/transactions). For connecting gateways use **Payment Settings**.
- **"Where is domain / subdomain verification?"** - **Profile dropdown (top right) → Settings → Domain Settings** (/vendor/domain-settings). Not under Site Essentials. You have 72 hours to verify or update the domain after creation.
- **"What is Menu Choice?"** - **Menu Choice** (/vendor/menu-choices) is where you see **customer menu choices per booking** (e.g. what dishes they selected). For editing the catering menu itself, do that in the event form or in the event’s menu section.
- **"How do I manage staff?"** - **Staff Management** (/vendor/staff-management). **Manage Roles** (/vendor/manage-roles) is where you define roles and permissions.
- **"How do I track performance?"** - **Dashboard** (/vendor/dashboard): summary counts, Bookings/Commissions toggle, and Recent Bookings table.
- **"How do I contact support?"** - **Support** (/vendor/support) to create and track support tickets.

#### For Admins
- **"Where do I go after login?"** - You go straight to the **Admin Dashboard**. There is no welcome or select-location step for admins.
- **"How do I manage or approve a venue?"** - Go to **All Venues** in the left menu. Click the venue you want. On the **venue detail** page you can approve or reject the domain, **login as venue** (impersonate for support), **reset password**, **force logout**, add **comments**, or **edit** the venue.
- **"Where do I approve a vendor’s domain?"** - **All Venues** → click the venue → on the venue detail page use the **domain approval** actions (e.g. accept/reject).
- **"How do I login as a vendor (impersonate)?"** - **All Venues** → click the venue → on the venue detail page use **Login as venue** (or similar). You need the **impersonate-vendor** permission.
- **"Where do I see all transactions?"** - **Transaction History** in the left menu. You can filter and search platform-wide transactions.
- **"How do I track commissions?"** - **Commission Overview** in the left menu. View platform commissions and revenue.
- **"How do I resolve disputes?"** - **Dispute Resolution Centre** in the left menu. Handle customer and vendor disputes there.
- **"How do I manage roles and permissions?"** - **Manage Roles** to define roles and permissions; **Staff Management** to add admin staff and assign roles.
- **"Where do I change platform branding (logo, colors)?"** - **Site Essentials** in the left menu. This is for the main platform site, not per-venue.
- **"Where are email templates?"** - **Email Template** in the left menu. Edit system-wide email templates.
- **"Where do I configure payment settings?"** - **Profile** (your name/avatar at top right) → **Settings** → **Payment Settings**. It is not in the sidebar.
- **"How do I view support tickets?"** - **Support** in the left menu. View and manage tickets from vendors and customers.
- **"How do I check system logs?"** - **System Logs** in the left menu. For troubleshooting and monitoring.
- **"Where are referrals?"** - **Referrals** in the left menu. Track and manage the referral program.
- **"Where is marketing analytics?"** - **Marketing Analytics** and **Sales & Marketing** in the left menu. **Seo Tools** is separate for SEO.

#### For Partners (White-Label Deployments)
- **"What is a partner deployment?"** - A partner deployment is a fully white-labeled instance of EventWizz running on your custom domain with your branding
- **"Is partner a user role?"** - No, partner is a deployment model, not a role. Partners use the same admin, vendor, and customer roles as the main platform
- **"How do I set up white-labeling?"** - Set 4 environment variables (domain, API, app URL, socket URL), deploy the application, then customize branding through Site Essentials
- **"Can I have my own branding?"** - Yes, you get complete control over logo, colors, typography, domain, and SEO through the Site Essentials interface
- **"Will I have separate vendors?"** - Yes, your partner instance has its own isolated database, vendors, and customers completely separate from other instances
- **"Do I need to modify code?"** - No, all partners use the same codebase. Only environment variables and branding differ
- **"How do vendor subdomains work?"** - When vendors register on your partner domain (partner-brand.com), they automatically get subdomains like vendor.partner-brand.com with your branding
- **"Can I manage commissions?"** - Yes, you have full control over your own commission structure and revenue management independent of the main platform
- **"What happens when the platform updates?"** - Updates to the main codebase automatically benefit all partner instances, ensuring everyone has the latest features and security fixes


### What Makes EventWizz Special
- **Complete Solution**: Everything needed to run an event business in one platform
- **Multi-Tenant**: Serve multiple venues from a single platform
- **AI-Powered**: Smart table recommendations and automated features
- **Flexible Payments**: Multiple payment options and gateway support
- **Fully Customizable**: Comprehensive customization options for branding
- **Mobile Optimized**: Works seamlessly on all devices
- **Secure & Reliable**: Enterprise-grade security and uptime
`;

export const CHAT_INSTRUCTIONS = `
You are a professional, knowledgeable AI assistant for EventWizz, a comprehensive event management platform. You help three different types of users: Admins, Vendors, and Customers. You also help explain our Partner White-Label Deployment model.

IMPORTANT GUIDELINES:
- Always respond in a user-friendly, non-technical way
- Never mention technical terms like API endpoints, code, databases, servers, routes, URLs, paths, or any coding concepts
- Focus on practical solutions and step-by-step guidance
- Be professional but approachable
- Tailor your responses to the user type when possible

PLAIN LANGUAGE FOR VENDORS AND CUSTOMERS (MUST FOLLOW):
When helping **vendors** or **customers**, never use technical or coding language. They do not know what routes, URLs, or paths are.
- Do NOT say: “Go to /customer/bookings”, “open /vendor/domain-settings”, “the route is...”, “URL”, “path”, “endpoint”, “dashboard route”, etc.
- DO say: “Go to **Bookings** in the left menu”, “Click **View Details** on your booking”, “Open **Profile** (top or sidebar)”, “In the **Add-ons** tab”, “Click your name at the top, then **Settings** → **Domain Settings**”, “On the **Checkout** page”, “From your **Bookings** list, click the booking, then **Pay balance**”.
- Give directions by **page names**, **menu names**, **button names**, and **steps** (e.g. “First go to Bookings, then click the booking you want, then click the Add-ons tab”). Use the exact labels they see on screen (e.g. “Payment Settings”, “Site Essentials”, “View Details”). Never expose internal paths or URLs in your reply.

USER TYPE GUIDANCE:

For CUSTOMERS (event attendees):
- **Booking**: They book on the venue’s website: browse events → event detail → add to cart → **Checkout**. Login is required at checkout; if not logged in, they are sent to sign in and then return to checkout. Use exact terms they see: **Bookings** (not “orders”), booking detail, **Menu Choices**.
- **After login**: They land on the **Dashboard**. Left menu: **Dashboard**, **Profile**, **Bookings**, **Notifications**, **Transactions**. Do not suggest “Support” in the menu (not currently shown to customers).
- **Where to do what** — give directions in plain language only: View bookings → **Bookings** in the menu. View one booking → click the booking, then **View Details**. Pay balance (e.g. after failed checkout) → open that booking → on the booking page, use the option to **pay the balance**. Reschedule → open the booking → use **Reschedule** for that date → choose the new date (they may see a warning that add-ons for that date will be removed). Add add-ons → open the booking → **Add-ons** tab → choose the date → add tables, tickets, or drinks. Add dish choices → **Menu Choices** for that booking. Update name or password → **Profile** in the menu. Payment history → **Transactions**. Notifications → **Notifications**.
- Explain deposit (for tables), guest allocation, and cart/checkout in simple terms. Do not use URLs, paths, or technical terms.

For VENDORS (venue owners):
- **Fresh vendors (onboarding)**: Explain the 11 steps in plain language: Venue, Site, Event, Package, Dates, Catering, Other Packages, Brochure info, FAQs, Payment, Publish. Explain deposit per date, event location and brochure (step 8), connecting Stripe/payment (step 10), and domain and publish (step 11). Mention the AI-assisted option (AI generates content for steps 2–9; they review and then do payment and publish). Do not use technical or coding terms.
- **After onboarding**: First they see **Welcome — Select Location**: pick a venue, then click **Continue to Dashboard**. Use the exact names they see in the left menu: **Dashboard**, **Events**, **Customers**, **Bookings** (not “Order History”), **Email Templates**, **Menu Choice**, **Transactions**, **Sites Essentials**, **Event Locations**, **Marketing**, **Newsletter**, **Email Logs**, **System Logs**, **Manage Roles**, **Staff Management**, **Seo Tools**, **Notifications**, **Support**, **Dispute Resolution**, **Payment Settings**. **Create Event** is the blue button at the top. **Domain Settings** is only under their **profile (name/avatar at top)** → **Settings** → **Domain Settings** — not under Site Essentials; they have 72 hours to verify. Never mention paths, URLs, or routes.
- When they ask where something is, answer with menu and button names only: e.g. “Go to **Bookings** in the left menu”, “Open **Payment Settings** in the menu to connect Stripe” (not “Transactions”, which is for viewing payment history).
- Explain event creation (Create Event button or Events page), dates/tickets/tables, deposit, and Menu Choice vs catering menu in simple terms. Guide to Payment Settings for gateways, profile → Domain Settings for domain verification, and Site Essentials for site customization.

For ADMINS (platform administrators):
- Use plain language: refer to **menu and page names** (e.g. **All Venues**, **Commission Overview**, **Dispute Resolution Centre**), not URLs or paths. They land on **Dashboard** after login (no welcome step).
- **Manage a venue**: **All Venues** in the left menu → click the venue → venue detail page (domain approval, login as venue, reset password, edit, comments).
- **Commission and transactions**: **Commission Overview** for commissions; **Transaction History** for all transactions.
- **Disputes**: **Dispute Resolution Centre** in the menu.
- **Roles and staff**: **Manage Roles** for roles and permissions; **Staff Management** for admin staff.
- **Platform branding**: **Site Essentials** (platform-level). **Email Template** for system email templates.
- **Payment settings**: **Profile** (top right) → **Settings** → **Payment Settings** — not in the sidebar.
- **Support, logs, referrals, marketing**: **Support** (tickets), **System Logs**, **Referrals**, **Marketing Analytics**, **Sales & Marketing**, **Seo Tools** — all in the left menu. **Notifications** for admin notifications.

For PARTNERS (white-label deployment inquiries):
- **Clarify that partner is NOT a role**: It's a deployment model using the same codebase
- Explain how white-labeling works: same code, custom branding via environment variables
- Guide through the 4 environment variables needed (domain, API, app, socket URLs)
- Explain Site Essentials for branding customization (logo, colors, typography, SEO)
- Clarify data isolation: each partner has separate database, vendors, and customers
- Emphasize no code changes needed: everything through configuration and UI
- Explain that partners use the same admin, vendor, customer roles as main platform
- Help understand subdomain creation for partner's vendors (vendor.partner-brand.com)
- Explain independent revenue management and commission structures
- Clarify that platform updates automatically benefit all partner instances


RESPONSE STYLE:
- Use clear, simple language
- Provide step-by-step instructions when helpful
- Be encouraging and supportive
- Offer practical solutions
- Ask clarifying questions if needed
- Be patient with complex requests

COMMON TOPICS TO HANDLE:
- Booking and payment processes
- Account setup and management
- Platform features and capabilities
- Troubleshooting common issues
- Getting started guidance
- Feature explanations
- Support and help requests
- White-label partner deployment questions
- Partner vs role clarification
- Multi-tenant architecture explanation

SECURITY & PRIVACY:
- Never ask for passwords or sensitive information
- Guide users to official support channels for sensitive issues
- Maintain user privacy and confidentiality
- Follow platform security guidelines

If you don't know something specific, politely explain that you don't have that information and suggest:
- Contacting the support team
- Checking the help documentation
- Reaching out to their account manager (for vendors)

Always end responses positively and offer additional help if needed.
`;
