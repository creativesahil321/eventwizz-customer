# 🏗️ EventWizz System Overview

## 🎯 **Complete System Architecture**

This document provides a comprehensive overview of the EventWizz system architecture, components, and integrations.

---

## 📋 **Table of Contents**

1. [System Architecture](#system-architecture)
2. [Core Components](#core-components)
3. [Technology Stack](#technology-stack)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [Performance Optimization](#performance-optimization)
7. [Deployment Architecture](#deployment-architecture)

---

## 🏗️ **System Architecture**

### **High-Level Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (Next.js)     │◄──►│   (Laravel)     │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • React UI      │    │ • API Layer     │    │ • Stripe        │
│ • State Mgmt    │    │ • Business Logic│    │ • PayPal        │
│ • Auth          │    │ • Database      │    │ • TrueLayer     │
│ • Payment UI    │    │ • OAuth         │    │ • Email Service │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Component Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    EventWizz Platform                       │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Public Site   │   Vendor Portal │   Customer Portal       │
│                 │                 │                         │
│ • Event Browse  │ • Event Mgmt    │ • Booking System        │
│ • Event Details │ • Payment Setup │ • Cart Management       │
│ • Registration  │ • Analytics     │ • Payment Processing    │
│ • OAuth Login   │ • OAuth Setup   │ • Order History         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

---

## 🔧 **Core Components**

### **1. Frontend (Next.js 15)**

#### **App Router Structure**

```
src/app/
├── (auth)/              # Authentication pages
├── (on-boarding)/       # Vendor onboarding flow
├── (protected)/         # Protected vendor pages
├── (public)/           # Public customer pages
├── api/                # API routes
└── layout.tsx          # Root layout
```

#### **Key Features**

- **App Router**: Next.js 15 with App Router
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations
- **React Query**: Server state management
- **Zustand**: Client state management

### **2. Backend (Laravel)**

#### **API Structure**

```
app/
├── Http/Controllers/
│   ├── Auth/           # Authentication
│   ├── Vendor/         # Vendor management
│   ├── Customer/       # Customer operations
│   └── Payment/        # Payment processing
├── Services/           # Business logic
├── Models/            # Database models
└── Middleware/        # Request processing
```

#### **Key Features**

- **RESTful APIs**: Clean API design
- **OAuth Integration**: Multiple providers
- **Payment Processing**: Stripe, PayPal, TrueLayer
- **Database**: MySQL with Eloquent ORM
- **Security**: CSRF, XSS, SQL injection protection

### **3. Database Schema**

#### **Core Tables**

```sql
-- Users and Authentication
users (id, email, name, account_type, created_at)
oauth_accounts (id, user_id, provider, provider_id, access_token)

-- Events and Bookings
events (id, vendor_id, title, description, dates, pricing)
bookings (id, customer_id, event_id, total, status, created_at)
booking_items (id, booking_id, type, item_id, quantity, price)

-- Payment Processing
payment_gateways (id, vendor_id, type, status, gateway_data)
payments (id, booking_id, gateway_id, amount, status, transaction_id)

-- Cart Management
cart_sessions (id, user_id, data, expires_at)
```

---

## 🛠️ **Technology Stack**

### **Frontend Technologies**

```typescript
// Core Framework
Next.js 15 (App Router)
React 18
TypeScript 5

// State Management
Zustand (Client state)
TanStack Query (Server state)

// UI & Styling
Tailwind CSS
Framer Motion
Lucide React (Icons)

// Forms & Validation
React Hook Form
Zod (Schema validation)

// Authentication
NextAuth.js
OAuth providers (Facebook, Google, etc.)

// Payment Integration
Stripe Elements
PayPal SDK
TrueLayer API
```

### **Backend Technologies**

```php
// Core Framework
Laravel 10
PHP 8.2

// Database
MySQL 8.0
Eloquent ORM

// Authentication
Laravel Sanctum
OAuth 2.0

// Payment Processing
Stripe PHP SDK
PayPal PHP SDK
TrueLayer PHP SDK

// API
RESTful APIs
JSON responses
```

### **Infrastructure**

```yaml
# Deployment
Vercel (Frontend)
Laravel Forge (Backend)
MySQL Database

# Monitoring
Sentry (Error tracking)
Vercel Analytics
Laravel Telescope

# Security
HTTPS/SSL
CSRF Protection
XSS Prevention
SQL Injection Protection
```

---

## 🔄 **Data Flow**

### **User Authentication Flow**

```
1. User clicks "Login with Facebook"
2. Redirect to Facebook OAuth
3. User authorizes application
4. Facebook redirects with code
5. Backend exchanges code for token
6. Backend creates/updates user
7. Frontend receives JWT token
8. User session established
```

### **Event Booking Flow**

```
1. Customer browses events
2. Selects event and dates
3. Adds items to cart (tables, tickets, drinks)
4. Auto-save triggers (2-second debounce)
5. Customer proceeds to checkout
6. Cart validation and transformation
7. Booking created in database
8. Redirect to secure payment page
9. Payment gateway selection
10. Payment processing
11. Booking confirmation
```

### **Vendor Onboarding Flow**

```
1. Vendor registers account
2. OAuth authentication
3. Multi-step onboarding process
4. Business information collection
5. Payment gateway setup
6. Event creation and management
7. Analytics and reporting
```

---

## 🔐 **Security Architecture**

### **Authentication & Authorization**

```typescript
// JWT Token Structure
interface JWTPayload {
  sub: string; // User ID
  email: string; // User email
  account_type: string; // 'vendor' | 'customer'
  iat: number; // Issued at
  exp: number; // Expires at
}

// Route Protection
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <LoginPage />;
  if (requiredRole && user.account_type !== requiredRole) {
    return <UnauthorizedPage />;
  }

  return children;
};
```

### **API Security**

```php
// Laravel API Security
class ApiController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->middleware('throttle:60,1'); // Rate limiting
    }

    public function index(Request $request)
    {
        // CSRF protection
        $request->validate([
            'data' => 'required|array',
        ]);

        // Authorization check
        $this->authorize('view', $resource);

        return response()->json($data);
    }
}
```

### **Payment Security**

```typescript
// Secure payment data handling
const processPayment = async (paymentData: PaymentData) => {
  // Client-side validation
  const validation = validatePaymentData(paymentData);
  if (!validation.isValid) {
    throw new Error("Invalid payment data");
  }

  // Secure API call
  const response = await fetch("/api/payments/process", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    throw new Error("Payment processing failed");
  }

  return response.json();
};
```

---

## ⚡ **Performance Optimization**

### **Frontend Optimization**

```typescript
// Code Splitting
const PaymentPage = lazy(() => import("./PaymentPage"));
const VendorDashboard = lazy(() => import("./VendorDashboard"));

// Image Optimization
import Image from "next/image";
<Image
  src="/event-image.jpg"
  alt="Event"
  width={800}
  height={600}
  priority
  placeholder="blur"
/>;

// Caching Strategy
const { data } = useQuery({
  queryKey: ["events", eventId],
  queryFn: () => fetchEvent(eventId),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

### **Backend Optimization**

```php
// Database Optimization
class EventController extends Controller
{
    public function index()
    {
        return Event::with(['vendor', 'bookings'])
            ->select(['id', 'title', 'description', 'vendor_id'])
            ->paginate(20);
    }

    // Caching
    public function show($id)
    {
        return Cache::remember("event.{$id}", 3600, function () use ($id) {
            return Event::with(['vendor', 'bookings'])->findOrFail($id);
        });
    }
}
```

### **API Optimization**

```typescript
// Request Debouncing
const debouncedSearch = useMemo(
  () =>
    debounce((query: string) => {
      searchEvents(query);
    }, 300),
  []
);

// Optimistic Updates
const updateCartMutation = useMutation({
  mutationFn: updateCartItem,
  onMutate: async (newItem) => {
    // Optimistically update UI
    queryClient.setQueryData(["cart"], (oldData) => ({
      ...oldData,
      items: [...oldData.items, newItem],
    }));
  },
});
```

---

## 🚀 **Deployment Architecture**

### **Frontend Deployment (Vercel)**

```yaml
# vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "env":
    {
      "NEXT_PUBLIC_API_URL": "@api-url",
      "NEXT_PUBLIC_STRIPE_KEY": "@stripe-key",
    },
}
```

### **Backend Deployment (Laravel Forge)**

```bash
# Deployment Script
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
```

### **Database Configuration**

```sql
-- MySQL Configuration
SET GLOBAL innodb_buffer_pool_size = 1G;
SET GLOBAL max_connections = 200;
SET GLOBAL query_cache_size = 64M;

-- Indexes for Performance
CREATE INDEX idx_events_vendor_id ON events(vendor_id);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_event_id ON bookings(event_id);
```

---

## 📊 **Monitoring & Analytics**

### **Error Tracking**

```typescript
// Sentry Integration
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Error Boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    Sentry.captureException(error, { extra: errorInfo });
  }
}
```

### **Performance Monitoring**

```typescript
// Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from "web-vitals";

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### **Analytics**

```typescript
// Vercel Analytics
import { Analytics } from "@vercel/analytics/react";

export default function App() {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

---

## 🎯 **Summary**

The EventWizz system provides:

1. **✅ Modern Architecture** - Next.js 15 + Laravel 10
2. **✅ Scalable Design** - Microservices-ready architecture
3. **✅ Security First** - OAuth, JWT, PCI compliance
4. **✅ Performance Optimized** - Caching, code splitting, CDN
5. **✅ Developer Experience** - TypeScript, hot reload, debugging
6. **✅ Production Ready** - Monitoring, error tracking, analytics

**Result**: A robust, scalable, and maintainable event management platform ready for production deployment! 🚀

---

## 🔄 **Maintenance**

### **Regular Updates**

- Monitor system performance
- Update dependencies
- Review security measures
- Optimize database queries

### **Scaling Considerations**

- Horizontal scaling with load balancers
- Database read replicas
- CDN for static assets
- Microservices architecture

**This system overview provides the foundation for all other documentation!** ✨
