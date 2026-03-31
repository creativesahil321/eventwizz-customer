# 🎉 EventWizz - System Architecture & Flow Diagrams

> **Visual Reference for Technical & Non-Technical Stakeholders**

---

## 1. High-Level System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                    EVENTWIZZ ECOSYSTEM                         │
└────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  ADMIN PORTAL   │  │  VENDOR PORTAL  │  │ CUSTOMER PORTAL │
│                 │  │                 │  │                 │
│ • Platform Mgmt │  │ • Event Mgmt    │  │ • Event Browse  │
│ • Vendor Mgmt   │  │ • Bookings      │  │ • Online Booking│
│ • Analytics     │  │ • Customers     │  │ • Payments      │
│ • Support       │  │ • Payments      │  │ • Menu Choices  │
│ • Settings      │  │ • Staff         │  │ • My Bookings   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                 ┌────────────▼────────────┐
                 │     SHARED SERVICES     │
                 ├─────────────────────────┤
                 │ • Authentication        │
                 │ • Payment Processing    │
                 │ • Email System          │
                 │ • File Storage          │
                 │ • Real-time Sync        │
                 │ • Analytics Engine      │
                 └─────────────────────────┘
```

---

## 2. Multi-Tenant Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│               EVENTWIZZ PLATFORM ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────────┘

Main Domain: eventwizz.com
│
├─── Admin Site (eventwizz.com/admin)
│    └─── Platform Administration Dashboard
│
├─── Vendor Subdomains
│    │
│    ├─── Vendor 1: stockbrook.eventwizz.com
│    │    ├─── Vendor Dashboard
│    │    ├─── Customer Site: /mohali
│    │    │    └─── Events, Booking, Checkout
│    │    └─── Customer Site: /chandigarh
│    │         └─── Events, Booking, Checkout
│    │
│    └─── Vendor 2: chaichuri.eventwizz.com
│         ├─── Vendor Dashboard
│         ├─── Customer Site: /mohali
│         └─── Customer Site: /panchkula
│
└─── Partner White-Label Deployments
     │
     ├─── newpartner.com (Independent Instance)
     │    ├─── Partner's Admin Dashboard
     │    ├─── Partner's Vendor Subdomains
     │    │    ├─── vendor1.newpartner.com
     │    │    └─── vendor2.newpartner.com
     │    └─── Customer Sites per Location
     │
     └─── whitebrand.com (Independent Instance)
          └─── Same structure as above
```

---

## 3. Complete User Flow

```
                    ┌─────────────────┐
                    │   START HERE    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Choose User Type│
                    └────────┬────────┘
                             │
        ┏────────────────────┼────────────────────┓
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│     ADMIN     │    │    VENDOR     │    │   CUSTOMER    │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Login/Register│    │ Login/Register│    │ Browse Events │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Dashboard   │    │  11-Step      │    │ Event Details │
│               │    │  Onboarding   │    │               │
│ • Vendors     │    │               │    │ • Photos      │
│ • Revenue     │    │ 1. Business   │    │ • Dates       │
│ • Analytics   │    │ 2. Branding   │    │ • Pricing     │
│ • Support     │    │ 3. Event      │    │ • Tables      │
│ • Settings    │    │ 4. Gallery    │    │ • Tickets     │
└───────┬───────┘    │ 5. Dates      │    └───────┬───────┘
        │            │ 6. Tickets    │            │
        │            │ 7. Tables     │            ▼
        │            │ 8. Drinks     │    ┌───────────────┐
        │            │ 9. Menu       │    │ Select Items  │
        │            │ 10. Terms     │    │               │
        │            │ 11. Payments  │    │ • People Count│
        │            └───────┬───────┘    │ • Tables      │
        │                    │            │ • Tickets     │
        │                    ▼            │ • Drinks      │
        │            ┌───────────────┐    │ • Special Req │
        │            │   Dashboard   │    └───────┬───────┘
        │            │               │            │
        │            │ • Events      │            ▼
        │            │ • Bookings    │    ┌───────────────┐
        │            │ • Customers   │    │  Auto-Save    │
        │            │ • Payments    │    │  Shopping Cart│
        │            │ • Locations   │    │               │
        │            │ • Staff       │    │ ✅ Saved 2s ago│
        │            │ • Analytics   │    └───────┬───────┘
        │            └───────────────┘            │
        │                                         ▼
        │                                 ┌───────────────┐
        │                                 │   Checkout    │
        │                                 │               │
        │                                 │ • Validation  │
        │                                 │ • API Call    │
        │                                 │ • Get BookingID
        │                                 └───────┬───────┘
        │                                         │
        │                                         ▼
        │                                 ┌───────────────┐
        │                                 │Secure Payment │
        │                                 │     Page      │
        │                                 │               │
        │                                 │ • Stripe      │
        │                                 │ • PayPal      │
        │                                 │ • TrueLayer   │
        │                                 │ • WorldPay    │
        │                                 │ • Klarna      │
        │                                 └───────┬───────┘
        │                                         │
        │                                         ▼
        │                                 ┌───────────────┐
        │                                 │ Confirmation  │
        │                                 │               │
        │                                 │ ✅ Booked!    │
        │                                 │ 📧 Email Sent │
        │                                 └───────┬───────┘
        │                                         │
        └─────────────────────────────────────────┘
                                                  │
                                                  ▼
                                         ┌───────────────┐
                                         │  COMPLETE!    │
                                         └───────────────┘
```

---

## 4. Vendor Onboarding Flow (11 Steps)

```
START: Vendor Registers
         │
         ▼
┌────────────────────┐
│   STEP 1: BASICS   │
│                    │
│ • Business Name    │
│ • Contact Info     │
│ • Address          │
│ • Tax Details      │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  STEP 2: BRANDING  │
│                    │
│ • Logo Upload      │ ← Image Cropper (1:1)
│ • Cover Image      │ ← Image Cropper (16:9)
│ • About Section    │
│ • Button Text      │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   STEP 3: EVENT    │
│                    │
│ • Event Name       │
│ • Description      │
│ • Banner Image     │ ← Image Cropper (21:9)
│ • Event Video      │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  STEP 4: GALLERY   │
│                    │
│ • Package Image    │ ← Image Cropper (4:3)
│ • Gallery (×8)     │ ← Image Cropper (Free)
│ • Descriptions     │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   STEP 5: DATES    │
│                    │
│ • Available Dates  │
│ • Date Pricing     │
│ • Capacity         │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  STEP 6: TICKETS   │
│                    │
│ • Ticket Types     │
│ • Ticket Pricing   │
│ • Quantity Limits  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   STEP 7: TABLES   │
│                    │
│ • Table Types      │
│ • Capacity Range   │
│ • Price per Person │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  STEP 8: DRINKS    │
│                    │
│ • Drink Packages   │
│ • Package Pricing  │
│ • Descriptions     │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   STEP 9: MENU     │
│                    │
│ • Menu Items       │
│ • Categories       │
│ • Allergens        │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  STEP 10: TERMS    │
│                    │
│ • T&C              │
│ • FAQ              │
│ • Policies         │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ STEP 11: PAYMENTS  │
│                    │
│ • Connect Stripe   │
│ • Connect PayPal   │
│ • Connect TrueLayer│
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   ✅ COMPLETE!     │
│                    │
│ → Vendor Dashboard │
│ → Subdomain Active │
│ → Ready for Events │
└────────────────────┘
```

---

## 5. Customer Booking Flow

```
Customer lands on event page
         │
         ▼
┌────────────────────┐
│   Browse Events    │
│                    │
│ • Filter by Date   │
│ • Filter by Type   │
│ • Search Events    │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Select Event Date │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Enter People Count│
│                    │
│  [+ -] 12 people   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────────────────┐
│ AI Table Recommendations       │
│                                │
│ ✅ PERFECT FIT                 │
│ 2× Standard Tables (6-8 pax)  │
│ £100/person | 4 empty seats    │
│ [Select]                       │
│                                │
│ ✅ GOOD OPTION                 │
│ 1× Large Table (10-15 pax)    │
│ £120/person | 3 empty seats    │
│ [Select]                       │
└─────────┬──────────────────────┘
          │
          ▼
┌────────────────────┐
│  Guest Allocation  │
│                    │
│ Table 1: [ 6 ] pax │
│ Table 2: [ 6 ] pax │
│                    │
│ Total: 12 guests   │
│                    │
│ [Auto-Arrange]     │
│ [Confirm]          │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Add Tickets       │
│  (Optional)        │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Add Drink Package │
│  (Optional)        │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Special Requests  │
│  (Optional)        │
└─────────┬──────────┘
          │
          ▼
┌────────────────────────┐
│  Shopping Cart         │
│                        │
│ Date: June 15, 2025    │
│ ├─ 2× Tables: £1,200  │
│ ├─ 5× Tickets: £250   │
│ └─ 1× Drinks: £150    │
│                        │
│ Total: £1,600          │
│                        │
│ ⏱ Auto-saving in 2s...│
└─────────┬──────────────┘
          │
          ▼
┌────────────────────┐
│   Login/Register   │
│                    │
│ • Email/Password   │
│ • Google OAuth     │
│ • Facebook OAuth   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   Checkout         │
│                    │
│ ✅ Validation      │
│ → Create Booking   │
│ → Get Booking ID   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────────────┐
│  Secure Payment Page       │
│                            │
│  Booking: #12345           │
│  Total: £1,600             │
│                            │
│  Select Payment Method:    │
│  ○ Stripe                  │
│  ○ PayPal                  │
│  ○ TrueLayer               │
│  ○ WorldPay                │
│  ○ Klarna                  │
│                            │
│  [Pay Now]                 │
└─────────┬──────────────────┘
          │
          ▼
┌────────────────────┐
│  Payment Processing│
│                    │
│ 🔄 Secure...       │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   Confirmation     │
│                    │
│ ✅ Booking Confirmed!
│                    │
│ Booking #12345     │
│ Event: June 15     │
│ Total: £1,600      │
│                    │
│ 📧 Email Sent      │
│                    │
│ [View Booking]     │
│ [Submit Menu]      │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   My Bookings      │
│                    │
│ • View Details     │
│ • Add-ons          │
│ • Menu Choices     │
│ • Download Invoice │
└────────────────────┘
```

---

## 6. Payment Processing Flow

```
                    Booking Created
                          │
                          ▼
                 ┌────────────────┐
                 │  Booking #123  │
                 │                │
                 │ Status: Pending│
                 │ Total: £400    │
                 └────────┬───────┘
                          │
                          ▼
                 ┌────────────────┐
                 │ Redirect to    │
                 │ Payment Page   │
                 │                │
                 │ URL:           │
                 │ /payment?      │
                 │ booking_id=123 │
                 └────────┬───────┘
                          │
                          ▼
        ┌─────────────────────────────────┐
        │  Fetch Secure Checkout Data     │
        │                                 │
        │  API: GET /checkout/123         │
        │                                 │
        │  Response:                      │
        │  • total: £400                  │
        │  • gateways: [stripe, paypal]   │
        └─────────┬───────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  Display Gateways   │
        │                     │
        │  ○ Stripe           │
        │  ○ PayPal           │
        │  ○ TrueLayer        │
        └─────────┬───────────┘
                  │
     Customer Selects Gateway
                  │
        ┏─────────┴─────────┓
        │                   │
        ▼                   ▼
┌───────────┐      ┌────────────┐
│  Stripe   │      │  PayPal    │      etc...
└─────┬─────┘      └──────┬─────┘
      │                   │
      ▼                   ▼
┌───────────┐      ┌────────────┐
│ Process   │      │ Process    │
│ Payment   │      │ Payment    │
└─────┬─────┘      └──────┬─────┘
      │                   │
      └─────────┬─────────┘
                │
                ▼
        ┌───────────────┐
        │   Webhook     │
        │  Notification │
        │               │
        │ Payment Status│
        │    ✅ Success │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Update Booking│
        │               │
        │ Status:       │
        │ → Confirmed   │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Send Emails   │
        │               │
        │ To Customer:  │
        │ • Confirmation│
        │ • Receipt     │
        │               │
        │ To Vendor:    │
        │ • New Booking │
        │ • Payment Rcvd│
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │  ✅ COMPLETE  │
        │               │
        │ Booking Active│
        │ Payment Rcvd  │
        │ Emails Sent   │
        └───────────────┘
```

---

## 7. Real-Time Auto-Save Cart System

```
Customer modifies cart
         │
         ▼
┌────────────────────┐
│  Zustand Store     │
│                    │
│ • Update state     │
│ • Set hasChanges   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Debounce Timer    │
│                    │
│ Wait 2 seconds...  │
│                    │
│ ⏱ Saving in 2s... │
│ ⏱ Saving in 1s... │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   API Call         │
│                    │
│ POST /cart/save    │
│                    │
│ Payload:           │
│ {                  │
│   date: "2025...", │
│   tables: [...],   │
│   tickets: [...]   │
│ }                  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Backend Saves     │
│                    │
│ • Validate data    │
│ • Save to DB       │
│ • Return success   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Update UI         │
│                    │
│ ✅ Saved!          │
│                    │
│ • Clear hasChanges │
│ • Show toast       │
└─────────┬──────────┘
          │
          ▼
┌─────────────────────────┐
│  WebSocket Broadcast    │
│  (Optional)             │
│                         │
│ Notify other devices:   │
│ "Cart updated on        │
│  device A"              │
│                         │
│ Device B receives:      │
│ • Refresh cart          │
│ • Show notification     │
└─────────────────────────┘
```

---

## 8. Permission System Architecture

```
                    User Login
                        │
                        ▼
             ┌──────────────────┐
             │  Authentication  │
             │                  │
             │ • Verify user    │
             │ • Load roles     │
             │ • Fetch perms    │
             └────────┬─────────┘
                      │
                      ▼
             ┌──────────────────┐
             │ Permission Store │
             │  (Zustand)       │
             │                  │
             │ Permissions:     │
             │ [                │
             │   "read-event",  │
             │   "create-event",│
             │   "manage-staff" │
             │ ]                │
             └────────┬─────────┘
                      │
        ┏─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌──────────────┐           ┌──────────────┐
│  UI Level    │           │  API Level   │
└──────┬───────┘           └──────┬───────┘
       │                          │
       ▼                          ▼
┌──────────────┐           ┌──────────────┐
│ Hide/Show    │           │ Validate     │
│ Components   │           │ Requests     │
│              │           │              │
│ if (hasPerm) │           │ if (!hasPerm)│
│   show()     │           │   deny()     │
│ else         │           │ else         │
│   hide()     │           │   allow()    │
└──────────────┘           └──────────────┘
```

---

## 9. White-Label Deployment Architecture

```
┌──────────────────────────────────────────────────────────┐
│              SAME CODEBASE (Single Repository)           │
└──────────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Main Platform  │  │   Partner 1     │  │   Partner 2     │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│                 │  │                 │  │                 │
│ Domain:         │  │ Domain:         │  │ Domain:         │
│ eventwizz.com   │  │ newpartner.com  │  │ whitebrand.com  │
│                 │  │                 │  │                 │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│                 │  │                 │  │                 │
│ Theme:          │  │ Theme:          │  │ Theme:          │
│ EventWizz       │  │ NewPartner      │  │ WhiteBrand      │
│ • Logo          │  │ • Logo          │  │ • Logo          │
│ • Colors        │  │ • Colors        │  │ • Colors        │
│ • Typography    │  │ • Typography    │  │ • Typography    │
│                 │  │                 │  │                 │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│                 │  │                 │  │                 │
│ Database:       │  │ Database:       │  │ Database:       │
│ Main DB         │  │ Partner1 DB     │  │ Partner2 DB     │
│                 │  │                 │  │                 │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│                 │  │                 │  │                 │
│ Vendors:        │  │ Vendors:        │  │ Vendors:        │
│ A, B, C, D...   │  │ X, Y, Z...      │  │ P, Q, R...      │
│                 │  │                 │  │                 │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│                 │  │                 │  │                 │
│ Revenue:        │  │ Revenue:        │  │ Revenue:        │
│ Platform owns   │  │ Partner owns    │  │ Partner owns    │
│                 │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘

                  ↓  Updates Apply to All  ↓

┌──────────────────────────────────────────────────────────┐
│           ONE CODE UPDATE = ALL PLATFORMS UPDATED        │
└──────────────────────────────────────────────────────────┘
```

---

## 10. Technology Stack Layers

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Next.js  │  │ React 19 │  │TypeScript│               │
│  │   15     │  │          │  │          │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                         │
│  State Management: Zustand + TanStack Query             │
│  UI: Tailwind CSS + Shadcn UI                           │
│  Forms: React Hook Form + Zod                           │
│  Animations: Framer Motion                              │
│                                                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ HTTPS/REST API
                   │
┌──────────────────▼──────────────────────────────────────┐
│                    API LAYER                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │   Axios     │  │Interceptors │  │ Validation  │      │
│  │  Client     │  │   Auth      │  │  Errors     │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
│                                                         │
│  Features:                                              │
│  • Automatic authentication                             │
│  • Request/Response transformation                      │
│  • Error handling                                       │
│  • Request retries                                      │
│                                                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ REST API Calls
                   │
┌──────────────────▼──────────────────────────────────────┐
│                  BACKEND LAYER                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Laravel  │  │  PHP 8.2 │  │  Sanctum │               │
│  │    10    │  │          │  │   Auth   │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                         │
│  Business Logic:                                        │
│  • Controllers                                          │
│  • Services                                             │
│  • Models (Eloquent ORM)                                │
│  • Middleware                                           │
│  • Jobs & Queues                                        │
│                                                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ Database Queries
                   │
┌──────────────────▼──────────────────────────────────────┐
│                  DATA LAYER                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  MySQL   │  │  Redis   │  │  S3/CDN  │               │
│  │   8.0    │  │  Cache   │  │  Storage │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                         │
│  Data:                                                  │
│  • User accounts                                        │
│  • Events & bookings                                    │
│  • Payments & transactions                              │
│  • Images & files                                       │
│                                                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ External APIs
                   │
┌──────────────────▼──────────────────────────────────────┐
│               EXTERNAL SERVICES                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐  ┌──────────────────┐              │
│  │  Payment        │  │  OAuth Providers │              │
│  │  Gateways       │  │  • Google        │              │
│  │  • Stripe       │  │  • Facebook      │              │
│  │  • PayPal       │  └──────────────────┘              │
│  │  • TrueLayer    │                                    │
│  │  • WorldPay     │  ┌──────────────────┐              │
│  │  • Klarna       │  │  Other Services  │              │
│  └─────────────────┘  │  • Google Maps   │              │
│                       │  • Email (SMTP)  │              │
│                       │  • WebSocket     │              │
│                       │  • GROQ AI       │              │
│                       └──────────────────┘              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 11. Data Flow: Customer Books Event

```
                        START
                          │
                          ▼
            ┌─────────────────────────┐
            │  Customer Browser       │
            │  (React Component)      │
            └──────────┬──────────────┘
                       │
                       │ 1. Customer adds items
                       │
                       ▼
            ┌─────────────────────────┐
            │  Zustand Store          │
            │  (Client State)         │
            │                         │
            │  cartData = {           │
            │    date: "2025-06-15",  │
            │    tables: [...],       │
            │    tickets: [...]       │
            │  }                      │
            └──────────┬──────────────┘
                       │
                       │ 2. Auto-save trigger (2s)
                       │
                       ▼
            ┌─────────────────────────┐
            │  Axios API Client       │
            │                         │
            │  POST /cart/save        │
            │  Headers: {             │
            │    Authorization: JWT   │
            │  }                      │
            └──────────┬──────────────┘
                       │
                       │ 3. HTTP Request
                       │
                       ▼
            ┌─────────────────────────┐
            │  Laravel Middleware     │
            │                         │
            │  • Verify JWT           │
            │  • Load user            │
            │  • Rate limiting        │
            └──────────┬──────────────┘
                       │
                       │ 4. Authorized
                       │
                       ▼
            ┌─────────────────────────┐
            │  Laravel Controller     │
            │                         │
            │  • Validate request     │
            │  • Call service         │
            └──────────┬──────────────┘
                       │
                       │ 5. Process request
                       │
                       ▼
            ┌─────────────────────────┐
            │  CartService            │
            │                         │
            │  • Transform data       │
            │  • Save to database     │
            └──────────┬──────────────┘
                       │
                       │ 6. Database query
                       │
                       ▼
            ┌─────────────────────────┐
            │  MySQL Database         │
            │                         │
            │  INSERT/UPDATE cart     │
            │  WHERE user_id = ?      │
            └──────────┬──────────────┘
                       │
                       │ 7. Success response
                       │
                       ▼
            ┌─────────────────────────┐
            │  JSON Response          │
            │                         │
            │  {                      │
            │    status: true,        │
            │    message: "Saved",    │
            │    data: {...}          │
            │  }                      │
            └──────────┬──────────────┘
                       │
                       │ 8. Response received
                       │
                       ▼
            ┌─────────────────────────┐
            │  Axios Interceptor      │
            │                         │
            │  • Parse response       │
            │  • Handle errors        │
            │  • Transform data       │
            └──────────┬──────────────┘
                       │
                       │ 9. Update UI
                       │
                       ▼
            ┌─────────────────────────┐
            │  React Component        │
            │                         │
            │  • Show success toast   │
            │  • Update hasChanges    │
            │  • Refresh UI           │
            └──────────┬──────────────┘
                       │
                       │ 10. WebSocket broadcast
                       │     (Optional)
                       ▼
            ┌─────────────────────────┐
            │  Other Devices          │
            │                         │
            │  • Receive notification │
            │  • Sync cart data       │
            │  • Update UI            │
            └─────────────────────────┘
                       │
                       ▼
                      END
```

---

## 12. Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  SECURITY LAYERS                        │
└─────────────────────────────────────────────────────────┘

LAYER 1: Network Security
├─ HTTPS/SSL (TLS 1.3)
├─ CDN Protection (DDoS)
├─ Firewall Rules
└─ Rate Limiting

        ↓

LAYER 2: Application Security
├─ CSRF Protection
├─ XSS Prevention
├─ SQL Injection Prevention
├─ Content Security Policy
└─ Input Validation

        ↓

LAYER 3: Authentication
├─ JWT Tokens (HTTP-only cookies)
├─ OAuth 2.0 (Google, Facebook)
├─ Bcrypt Password Hashing
├─ Session Management
└─ Multi-Factor Auth (planned)

        ↓

LAYER 4: Authorization
├─ Role-Based Access Control
├─ Permission System
├─ API-Level Checks
├─ UI-Level Guards
└─ Resource Ownership Validation

        ↓

LAYER 5: Data Security
├─ Encrypted Sensitive Data
├─ PCI DSS Compliance
├─ GDPR Compliance
├─ Data Anonymization
└─ Secure Key Management

        ↓

LAYER 6: Payment Security
├─ No Card Data Stored
├─ Payment Gateway Tokens
├─ 3D Secure Support
├─ Fraud Detection
└─ Secure Webhooks

        ↓

LAYER 7: Monitoring
├─ Security Logs
├─ Error Tracking (Sentry)
├─ Audit Trails
├─ Intrusion Detection
└─ Compliance Reporting

        ↓

LAYER 8: Backup & Recovery
├─ Daily Automated Backups
├─ Point-in-Time Recovery
├─ Off-Site Storage
├─ Disaster Recovery Plan
└─ Backup Testing
```

---

## 13. Scalability Architecture

```
┌─────────────────────────────────────────────────────────┐
│              CURRENT CAPACITY                           │
│                                                         │
│  • 10,000+ concurrent users                             │
│  • 100+ transactions per second                         │
│  • Millions of database records                         │
│  • 500K+ API calls per day                              │
│  • 99.9% uptime                                         │
└─────────────────────────────────────────────────────────┘

                      ↓  Scaling Strategy  ↓

┌─────────────────────────────────────────────────────────┐
│              HORIZONTAL SCALING                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Frontend (Vercel)                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│  │ Server1 │  │ Server2 │  │ Server3 │  ...             │
│  └─────────┘  └─────────┘  └─────────┘                  │
│                                                         │
│  Backend (Laravel)                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│  │ Server1 │  │ Server2 │  │ Server3 │  ...             │
│  └─────────┘  └─────────┘  └─────────┘                  │
│                                                         │
│  Database (MySQL)                                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│  │ Master  │  │ Read1   │  │ Read2   │  ...             │
│  └─────────┘  └─────────┘  └─────────┘                  │
│                                                         │
└─────────────────────────────────────────────────────────┘

                      ↓  Caching Strategy  ↓

┌─────────────────────────────────────────────────────────┐
│              CACHING LAYERS                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Level 1: Browser Cache                                 │
│  • Static assets (24 hours)                             │
│  • API responses (configurable)                         │
│                                                         │
│  Level 2: CDN Cache (Vercel Edge)                       │
│  • Images, CSS, JS (30 days)                            │
│  • API responses (short TTL)                            │
│                                                         │
│  Level 3: Application Cache (Redis)                     │
│  • Session data (15 minutes)                            │
│  • Query results (configurable)                         │
│  • Frequently accessed data                             │
│                                                         │
│  Level 4: Database Query Cache                          │
│  • MySQL query cache                                    │
│  • Prepared statement cache                             │
│                                                         │
└─────────────────────────────────────────────────────────┘

                      ↓  Load Balancing  ↓

┌─────────────────────────────────────────────────────────┐
│              TRAFFIC DISTRIBUTION                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│           User Requests                                 │
│                 │                                       │
│                 ▼                                       │
│         ┌───────────────┐                               │
│         │ Load Balancer │                               │
│         │(Smart Routing)│                               │
│         └───────┬───────┘                               │
│                 │                                       │
│      ┌──────────┼──────────┐                            │
│      │          │          │                            │
│      ▼          ▼          ▼                            │
│  ┌──────┐  ┌──────┐  ┌──────┐                           │
│  │Server│  │Server│  │Server│                           │
│  │  1   │  │  2   │  │  3   │                           │
│  └──────┘  └──────┘  └──────┘                           │
│                                                         │
│  Routing Strategy:                                      │
│  • Round-robin                                          │
│  • Least connections                                    │
│  • Geolocation                                          │
│  • Health check failover                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

**END OF DIAGRAMS**

---

_EventWizz - Visual System Architecture_  
_© 2024 EventWizz. All rights reserved._
