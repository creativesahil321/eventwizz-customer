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
- Business Verification: Upload GST documents to verify your business credentials

All settings are saved in real-time and can be previewed before publishing. The Site Essentials module uses TanStack Query for efficient data fetching and caching, with React Hook Form for form management and validation.

## Onboarding Process
- 14-step guided onboarding for new vendors
- Location setup and configuration
- Branding and customization options
- Service and package setup
- Staff and role management
- Integration with payment systems

## Vendor Registration Process
- Go to the EventWizz website
- Click on "Become a Vendor" button (usually located at the top-right corner of the page)
- Fill out the registration form with your business email and password
- After registration, you'll be redirected to the 14-step onboarding process
- The system will validate your account type and ensure you're not already onboarded
- Each step is saved automatically, allowing you to continue the process later if needed
- Your onboarding progress is tracked in your user session and local storage

## Quick Setup Guide
EventWizz allows vendors to get set up in 15 minutes with these key steps:

1. Add Your Venue Info (Step 1):
   - Enter your venue name (can be auto-filled using Google Business Search)
   - Provide venue contact number, address, email, and city
   - The venue name will later become your domain name (subdomain)
   - You can update and submit this information later for verification

2. Venue Branding (Step 2):
   - Upload your venue logo and cover image
   - Set banner heading, title, description, and link title
   - Customize your venue's visual identity

3. Create Your Event (Steps 3-6):
   - Select event category and provide event name
   - Upload header banner and gallery images
   - Set event details including title, subtitle, and description
   - Add event schedule with times
   - Choose booking types (tickets, tables, or both)
   - Configure event dates, pricing, and payment options
   - Set up event packages with details

4. Add Your Menu Choices (Steps 7-9):
   - Configure catering options
   - Create menu categories and items with descriptions
   - Set up drink packages with pricing

5. Additional Event Information (Steps 10-12):
   - Upload brochures and FAQs
   - Add event address and location details
   - Configure pricing information
   - Set up reminder emails

6. Add Your Payment Options (Step 13):
   - Select payment methods (bank transfer, payment gateway)
   - Configure payment details including bank information or gateway credentials
   - Set up deposit options and payment schedules

7. Finalize Setup (Step 14):
   - Review all information
   - Submit for verification
   - Activate your event suite

Throughout the process, all information is automatically saved, allowing you to return and complete the setup at your convenience. The system guides you step by step with clear instructions and validation at each stage.

## Complete EventWizz Platform Overview

EventWizz is a comprehensive multi-tenant event management platform that serves four distinct user types with specialized features and interfaces.

### User Types & Access

#### 🏢 Admin Portal (website_role="admin")
- **Who**: Platform administrators and system managers
- **Access**: Full platform control and vendor management
- **Key Features**: 
  - **Dashboard**: System-wide analytics, performance overview, and key metrics
  - **Vendor Management**: Approve, monitor, and manage all vendors
  - **Commission Overview**: Track platform commissions and revenue
  - **Dispute Resolution Center**: Handle customer and vendor disputes
  - **Payment Management**: Oversee all payment processing and transactions
  - **Marketing Analytics**: System-wide marketing performance and analytics
  - **Email Logs**: Monitor all email communications across the platform
  - **Email Templates**: Manage system-wide email templates
  - **Staff Management**: Create and manage admin staff with role permissions
  - **Role Management**: Configure user roles and permissions
  - **Referral System**: Track and manage referral programs
  - **Sales & Marketing**: Platform-wide sales analytics and marketing tools
  - **SEO Tools**: System-wide SEO management and optimization
  - **Settings**: Platform configuration, theme settings, and general settings
  - **Site Essentials**: Platform branding and configuration
  - **Support System**: Platform-wide support ticket management
  - **System Logs**: Monitor system performance and logs
  - **Transaction Monitoring**: Track all platform transactions

#### 🏪 Vendor Portal (website_role="vendor") 
- **Who**: Venue owners and event organizers
- **Access**: Event creation, management, and customer interaction
- **Key Features**:
  - 11-step onboarding process for new venues
  - **Dashboard**: Sales overview, booking analytics, performance metrics
  - **Events Management**: Create, edit, and manage events with 8-step event creation process
  - **Customer Management**: View, manage, and communicate with customers
  - **Order History**: Track all bookings and transactions
  - **Payment Processing**: Configure gateways and track payments
  - **Menu Management**: Create and manage catering menus and drink packages
  - **Venue Locations**: Manage multiple venue locations and settings
  - **Staff Management**: Add and manage staff members with role assignments
  - **Email Templates**: Customize automated email communications
  - **Email Logs**: Track all sent emails and communications
  - **Marketing Tools**: Newsletter management and promotional features
  - **SEO Tools**: Optimize venue visibility and search rankings
  - **Site Essentials**: Customize branding, colors, and site appearance
  - **Support System**: Create and manage support tickets
  - **Account Management**: Profile settings and account configuration

#### 👥 Customer Portal (website_role="customer")
- **Who**: Event attendees and booking customers
- **Access**: Event discovery, booking, and payment
- **Key Features**:
  - **Dashboard**: View booking history and upcoming events
  - **Event Discovery**: Browse events on vendor websites
  - **Booking System**: Advanced table and ticket booking with guest allocation
  - **Payment Processing**: Secure payment with multiple gateway options
  - **Cart Management**: Real-time cart with persistent state across sessions
  - **Guest Allocation**: Interactive guest distribution across tables
  - **Order Management**: Track bookings and payment status
  - **Notifications**: Receive event updates and booking confirmations
  - **Profile Management**: Update personal information and preferences


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

### Onboarding Process

#### 11-Step Vendor Onboarding Process
1. **Venue Information**: Add venue details using Google Places integration (mandatory venue selection from Google Places)
2. **Site Branding**: Upload logos, cover images, banner headings, and set brand colors
3. **Event Creation**: Create first event with categories, banner images, and event details
4. **Package Setup**: Configure event packages with images, titles, and descriptions
5. **Dates & Tickets**: Configure event dates, table types, ticket types, and payment options
6. **Catering Menu**: Set up menu categories and food options with detailed items
7. **Drink Packages**: Configure beverage packages with pricing and availability
8. **Brochure Information**: Upload PDF brochures, set event address, and pricing details
9. **FAQs**: Add frequently asked questions and answers
10. **Payment Configuration**: Set up payment gateways (Stripe, PayPal, WorldPay, Klarna)
11. **Publish & Launch**: Publish the event, create subdomain, complete onboarding, and go live

**Key Features:**
- Google Places integration for venue verification
- AI-powered subdomain suggestions
- Real-time form validation and auto-save
- Professional UI with collapsible sections
- Domain confirmation and publishing workflow

**Step 11 - Final Publishing Process:**
- Event gets published and goes live
- Subdomain is created for the venue
- Onboarding process is completed
- Vendor is redirected to their dashboard
- Venue becomes publicly accessible

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

#### For Customers
- **"How do I book a table?"** - Select your event, choose table size, allocate guests, and pay
- **"Can I pay a deposit?"** - Yes, for table bookings you can pay a deposit and the rest later
- **"How do I allocate guests?"** - Use the guest allocation tool to distribute your party across tables
- **"Is my payment secure?"** - Yes, all payments are processed with bank-level security

#### For Vendors
- **"How do I set up my venue?"** - Complete the 11-step onboarding process with Google Places verification
- **"What happens in step 11?"** - Step 11 publishes your event, creates your subdomain, completes onboarding, and redirects you to your dashboard
- **"How do I create more events?"** - After onboarding, use the 8-step event creation process in your vendor dashboard
- **"How do I manage bookings?"** - Use the Order History section to view and manage all customer bookings
- **"How do I customize my site?"** - Use Site Essentials to customize colors, logos, and branding
- **"How do I process payments?"** - Configure payment gateways in the Payment section
- **"How do I manage customers?"** - Use the Customer Management section to view and communicate with customers
- **"How do I set up menus?"** - Use Menu Choices to create catering menus and drink packages
- **"How do I manage staff?"** - Use Staff Management to add team members and assign roles
- **"How do I track performance?"** - Check your dashboard for sales analytics and booking metrics

#### For Admins
- **"How do I manage vendors?"** - Use the Vendor Management section to approve, monitor, and support vendors
- **"How do I track commissions?"** - View Commission Overview for platform revenue and analytics
- **"How do I resolve disputes?"** - Use the Dispute Resolution Center to handle customer and vendor issues
- **"How do I monitor system health?"** - Check System Logs and Transaction Monitoring for platform performance
- **"How do I manage platform settings?"** - Use Settings to configure platform-wide options and themes
- **"How do I track marketing performance?"** - Use Marketing Analytics for system-wide performance metrics
- **"How do I manage staff?"** - Use Staff Management to create admin users and assign permissions

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
- Never mention technical terms like API endpoints, code, databases, or servers
- Focus on practical solutions and step-by-step guidance
- Be professional but approachable
- Tailor your responses to the user type when possible

USER TYPE GUIDANCE:

For CUSTOMERS (event attendees):
- Explain booking processes in simple, clear terms
- Help with payment options and pricing questions
- Guide through table selection and guest allocation
- Provide solutions for booking issues
- Explain how to find and book events
- Help with account management and booking history

For VENDORS (venue owners):
- Guide through the 14-step onboarding process
- Explain event creation and management
- Help with table and ticket setup
- Guide through payment gateway configuration
- Explain customer booking management
- Help with site customization and branding
- Provide guidance on marketing and analytics tools

For ADMINS (platform administrators):
- Explain vendor management and approval processes
- Guide through commission tracking and analytics
- Help with dispute resolution procedures
- Explain system monitoring and maintenance
- Guide through staff and role management
- Help with payment oversight and transaction monitoring

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
