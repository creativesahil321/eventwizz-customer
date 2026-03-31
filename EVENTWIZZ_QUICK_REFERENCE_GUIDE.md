# 🎉 EventWizz - Quick Reference Guide

> **One-Page Overview for Managers & Product Sellers**

---

## What Is EventWizz?

**EventWizz** is a complete event management platform that connects venues/event organizers with customers through a secure, white-label capable system.

---

## The Three Portals

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      │
│  │   ADMIN     │      │   VENDOR    │      │  CUSTOMER   │      │
│  │             │      │             │      │             │      │
│  │ Manages     │      │ Creates     │      │ Books       │      │
│  │ Platform    │      │ Events      │      │ Events      │      │
│  └─────────────┘      └─────────────┘      └─────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features at a Glance

### For Admin

✅ Vendor management  
✅ Platform analytics  
✅ Commission tracking  
✅ Support system  
✅ Global settings

### For Vendors

✅ Event creation  
✅ Booking management  
✅ Payment collection  
✅ Customer database  
✅ Multi-location support  
✅ Staff management  
✅ Email automation

### For Customers

✅ Event discovery  
✅ Online booking  
✅ Secure payments  
✅ Menu preferences  
✅ Booking management  
✅ Transaction history

---

## Smart Features That Set Us Apart

### 🧠 AI-Powered Table Recommendations

**Problem**: Customers don't know which tables to book  
**Solution**: System analyzes group size and suggests optimal table configurations

### 💾 Auto-Save Cart (2-second sync)

**Problem**: Customers lose booking data  
**Solution**: Automatic synchronization across devices

### 🖼️ Professional Image Management

**Problem**: Large image files causing errors  
**Solution**: Automatic compression (70-90% reduction) + professional cropping

### 📊 Real-Time Analytics

**Problem**: Vendors need insights  
**Solution**: Live dashboard with revenue, bookings, and customer trends

### 📧 Automated Communications

**Problem**: Manual email management  
**Solution**: Automated confirmations, reminders, and follow-ups

---

## Payment Gateways Supported

| Gateway       | Type          | Fees       | Processing Time |
| ------------- | ------------- | ---------- | --------------- |
| **Stripe**    | Cards         | 2.9% + 30¢ | Instant         |
| **PayPal**    | PayPal        | 2.9% + 30¢ | Instant         |
| **TrueLayer** | Bank Transfer | No fees    | 1-2 days        |
| **WorldPay**  | Cards         | 2.5% + 25¢ | Instant         |
| **Klarna**    | BNPL          | No fees    | Split payments  |

---

## Multi-Tenant Architecture

```
Main Platform (eventwizz.com)
│
├── Vendor 1: Stockbrook
│   ├── stockbrook.eventwizz.com
│   ├── Location: Mohali → stockbrook.eventwizz.com/mohali
│   └── Location: Chandigarh → stockbrook.eventwizz.com/chandigarh
│
├── Vendor 2: ChaiChuri
│   ├── chaichuri.eventwizz.com
│   ├── Location: Mohali → chaichuri.eventwizz.com/mohali
│   └── Location: Panchkula → chaichuri.eventwizz.com/panchkula
│
└── Partner White-Label: NewPartner.com
    ├── Fully branded as NewPartner
    ├── Independent vendor ecosystem
    └── Separate database & revenue
```

---

## White-Label Deployment

### What Is It?

A **complete, branded instance** of EventWizz running independently with:

- Partner's logo, colors, and theme
- Partner's domain (e.g., partner-brand.com)
- Partner's vendors and customers
- Isolated database
- Independent revenue

### Setup Process

1. **Configuration**: 4 environment variables
2. **Branding**: Upload logo, set colors (via UI)
3. **Deploy**: Build and launch
4. **Launch**: Go live in 2-4 weeks

### Partner Benefits

✅ Own branded platform  
✅ Recurring revenue model  
✅ No development costs  
✅ Automatic updates  
✅ Technical support included

---

## Technology Stack

### Frontend

- **Next.js 15** - Modern React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Beautiful styling
- **React 19** - Latest React features

### Backend

- **Laravel 10** - PHP framework
- **MySQL 8** - Database
- **Redis** - Caching
- **WebSocket** - Real-time updates

### Infrastructure

- **Vercel** - Frontend hosting
- **Laravel Forge** - Backend hosting
- **CDN** - Fast global delivery
- **Sentry** - Error monitoring

---

## Security Features

✅ **PCI DSS Compliant** - Secure payment handling  
✅ **GDPR Ready** - Data privacy compliance  
✅ **SSL/HTTPS** - Encrypted connections  
✅ **OAuth 2.0** - Secure social logins  
✅ **JWT Tokens** - Secure sessions  
✅ **Role-Based Access** - Granular permissions  
✅ **Automated Backups** - Daily data protection  
✅ **Fraud Detection** - Payment security

---

## Deployment Options

### 1. SaaS Model

**Best for**: Venues wanting quick setup

**Pricing** (Example):

- Monthly: £99-£299
- Commission: 5-10%
- Setup: Free

**Timeline**: Same day

---

### 2. White-Label Partnership

**Best for**: Agencies, event companies

**Pricing** (Example):

- Setup: £5K-£10K
- Monthly: £500-£2K
- Commission: 70/30 split

**Timeline**: 2-4 weeks

---

### 3. Enterprise

**Best for**: Large organizations

**Pricing**: Custom quote

**Timeline**: 2-6 months

---

## Business Benefits

### Revenue Impact

- 📈 **24/7 Booking**: +40% more bookings
- 💰 **Multiple Payments**: +25% conversions
- 🎯 **Table Optimization**: +15% capacity utilization
- 🔄 **Reduced No-Shows**: -30% with reminders
- ⚡ **Faster Checkout**: 80% faster booking process

### Operational Efficiency

- ⏰ **Time Saved**: 80% reduction in manual work
- 📧 **Automated Emails**: 100% automation
- 🗄️ **Centralized Data**: Single source of truth
- 👥 **Multi-Location**: Manage from one dashboard
- 📊 **Real-Time Insights**: Instant analytics

### Customer Experience

- 📱 **Mobile-Friendly**: Optimized for all devices
- ⚡ **Instant Booking**: No delays
- 🔒 **Secure Payments**: Multiple options
- ✉️ **Auto-Confirmations**: Immediate receipts
- 🎛️ **Self-Service**: Menu choices, bookings

---

## Success Metrics

### Platform Performance

- **Uptime**: 99.9%
- **Response Time**: <200ms
- **Page Load**: <2 seconds
- **Error Rate**: <0.1%

### Business Metrics

- **Booking Completion**: 75%+
- **Cart Abandonment**: <25%
- **Customer Return**: 40%+
- **Transaction Success**: 98%+

---

## Competitive Advantages

### vs Traditional Systems

✅ Multi-tenant built-in  
✅ White-label complete  
✅ Modern tech stack  
✅ AI-powered features  
✅ Real-time updates  
✅ Mobile-first design

### vs Custom Development

✅ **Time**: Days vs 6-12 months  
✅ **Cost**: £5K-£10K vs £50K-£200K  
✅ **Risk**: Low vs High  
✅ **Support**: Included vs Need to build  
✅ **Updates**: Automatic vs Additional cost

---

## Real-World Use Case

### Example: Restaurant "Stockbrook"

**Before EventWizz**:

- Manual phone/email bookings
- Paper records
- Cash/card only
- No online presence
- High no-show rate

**After EventWizz**:

- 24/7 online bookings
- Digital records
- 5 payment options
- Professional website
- 30% fewer no-shows

**Results**:

- 📈 +45% bookings
- 💰 +35% revenue
- ⏰ -80% admin time
- ⭐ 4.8/5 customer rating

---

## Getting Started

### For Vendors

1. Visit eventwizz.com
2. Register as vendor
3. Complete onboarding (11 steps)
4. Connect payment gateway
5. Publish first event

**Time to First Event**: Same day

---

### For Partners

1. Discovery call
2. See platform demo
3. Sign partnership
4. Setup & branding
5. Launch

**Time to Launch**: 2-4 weeks

---

## Support Levels

| Level          | Response Time | Channels                | Price    |
| -------------- | ------------- | ----------------------- | -------- |
| **Basic**      | 24-48 hours   | Email                   | Included |
| **Priority**   | 4-12 hours    | Email, Phone, Chat      | £299/mo  |
| **Enterprise** | 1-4 hours     | All + Dedicated Manager | Custom   |

---

## Roadmap Highlights

### 2025 Q1-Q2

- 📱 Native mobile apps
- 🤖 AI chatbot support
- 🎯 Advanced analytics
- 🎁 Loyalty programs

### 2025 Q3-Q4

- 🌍 Multi-currency
- 🗣️ Multi-language
- 🔗 API marketplace
- 🏪 White-label marketplace

---

## Key Contacts

### Sales

📧 sales@eventwizz.com  
📞 +44 (0) XXX XXXX XXXX

### Support

📧 support@eventwizz.com  
🌐 support.eventwizz.com

### Partnerships

📧 partners@eventwizz.com  
📞 +44 (0) XXX XXXX XXXX

---

## FAQs

**Q: How long to set up?**  
A: Same day for vendors, 2-4 weeks for partners

**Q: Is my data secure?**  
A: Yes, PCI DSS compliant, daily backups, encrypted

**Q: Can I customize the branding?**  
A: Yes, complete white-labeling available

**Q: What's the uptime guarantee?**  
A: 99.9% uptime with SLA for enterprise

**Q: Do you provide training?**  
A: Yes, includes video tutorials and live sessions

**Q: Can I integrate with my existing systems?**  
A: Yes, REST API available for custom integrations

**Q: What payment gateways are supported?**  
A: Stripe, PayPal, TrueLayer, WorldPay, Klarna

**Q: Is there a mobile app?**  
A: Web-based platform (mobile-friendly), native apps coming Q1 2025

---

## Quick Stats

📊 **10,000+** Concurrent users supported  
💳 **98%+** Transaction success rate  
🌐 **99.9%** Platform uptime  
⚡ **<200ms** Average API response  
📱 **100%** Mobile responsive  
🔒 **0** Security breaches  
🌍 **5** Payment gateways integrated  
🚀 **Same day** Vendor onboarding

---

## One-Sentence Summary

**EventWizz** is a complete, white-label capable event management platform that enables venues and event organizers to manage bookings, payments, and customer relationships through a modern, secure, and scalable system - deployable in days, not months.

---

## Call to Action

### Ready to Transform Your Event Business?

🎯 **Book a Demo**: See the platform in action  
💼 **Partnership Inquiry**: Explore white-label opportunities  
📊 **Free Trial**: Test drive for 14 days  
📞 **Consultation**: Speak with our team

**Visit**: www.eventwizz.com  
**Email**: info@eventwizz.com  
**Phone**: +44 (0) XXX XXXX XXXX

---

_EventWizz - Making Event Management Effortless_  
_© 2024 EventWizz. All rights reserved._
