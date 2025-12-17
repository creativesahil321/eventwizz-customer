# EventWizz Comprehensive Documentation

## Table of Contents

1. [System Architecture](#1-system-architecture)

   - [Overview](#11-overview)
   - [Technology Stack](#12-technology-stack)
   - [Component Structure](#13-component-structure)
   - [Data Flow](#14-data-flow)
   - [Server-Side vs. Client-Side Rendering](#15-server-side-vs-client-side-rendering)

2. [Authentication System](#2-authentication-system)

   - [Authentication Flow](#21-authentication-flow)
   - [NextAuth Integration](#22-nextauth-integration)
   - [Token Management](#23-token-management)
   - [Security Measures](#24-security-measures)
   - [Multi-Tenant Support](#25-multi-tenant-support)

3. [Permission System](#3-permission-system)

   - [Permission Model](#31-permission-model)
   - [Permission Storage](#32-permission-storage)
   - [Permission Guards](#33-permission-guards)
   - [Integration with Auth](#34-integration-with-auth)

4. [UI Permission Implementation](#4-ui-permission-implementation)

   - [Permission-Based Components](#41-permission-based-components)
   - [Permission Guards](#42-permission-guards)
   - [Error Handling](#43-error-handling)
   - [Best Practices](#44-best-practices)

5. [Menu System](#5-menu-system)

   - [Menu Structure](#51-menu-structure)
   - [Permission-Based Menus](#52-permission-based-menus)
   - [Dynamic Menu Generation](#53-dynamic-menu-generation)

6. [Staff Management](#6-staff-management)

   - [Staff Registration](#61-staff-registration)
   - [Staff Authentication](#62-staff-authentication)
   - [Role Assignment](#63-role-assignment)
   - [Permission Management](#64-permission-management)

7. [UI/UX Systems](#7-uiux-systems)

   - [Theme System](#71-theme-system)
   - [Loading System](#72-loading-system)
   - [Form & Button Standards](#73-form--button-standards)
   - [Onboarding Design](#74-onboarding-design)

8. [Technical Implementations](#8-technical-implementations)

   - [TanStack Integration](#81-tanstack-integration)
   - [Type System](#82-type-system)
   - [Middleware System](#83-middleware-system)
   - [Environment Variables](#84-environment-variables)
   - [Multi-Domain Environment](#85-multi-domain-environment)

9. [Troubleshooting & Debugging](#9-troubleshooting--debugging)

   - [Common Issues](#91-common-issues)
   - [Debug Tools](#92-debug-tools)
   - [Permission Debugging](#93-permission-debugging)

10. [Conclusion](#10-conclusion)

11. [Module Implementation Guide](#11-module-implementation-guide)
    - [Module Structure](#111-module-structure)
    - [File Organization](#112-file-organization)
    - [TanStack Query Integration](#113-tanstack-query-integration)
    - [Hooks Organization](#114-hooks-organization)
    - [Reusable Hooks](#115-reusable-hooks)
    - [Multi-Tenant Considerations](#116-multi-tenant-considerations)
    - [Implementation Checklist](#117-implementation-checklist)

## Assets Management

Static assets are stored in the `/public` directory following Next.js best practices:

- Images: `/public/images/`
- Fonts: `/public/fonts/`

### Image Import

Images from the public directory should be referenced using the absolute path from the public root:

```tsx
// In your components:
import Image from "next/image";

// Then in your JSX:
<Image src="/images/eventwizz-logo.png" alt="Logo" width={110} height={30} />;
```

The fonts are loaded via the `src/lib/fonts.ts` file using Next.js's `localFont` function.

---

## 1. System Architecture

### 1.1 Overview

EventWizz uses a modern, component-based architecture built on Next.js with a tailored approach to authentication, permissions, and multi-tenancy. The application supports different user types (admin, vendor, customer) and implements role-based access control. Additionally, the platform supports **white-label partner deployments** where partners can run their own branded version of the admin platform.

📦 Multi-Tenant EventWizz System
│
├── 🌐 Admin Site (e.g. xyz.com)
│ ├── Admin Dashboard
│ ├── Vendor Registration/Login
│ └── Vendor Onboarding → Generates Subdomain
│
├── 📦 Vendor Sites (Subdomains of Admin Site)
│ ├── stockbrook.xyz.com
│ │ ├── Vendor Dashboard
│ │ ├── Locations
│ │ │ ├── /mohali
│ │ │ └── /chandigarh
│ │ └── Customer-Facing Site (SEO-friendly per location)
│ │ ├── stockbrook.xyz.com/mohali
│ │ └── stockbrook.xyz.com/chandigarh
│ └── chaichuri.xyz.com
│ ├── Vendor Dashboard
│ ├── Locations
│ │ ├── /mohali
│ │ └── /panchkula
│ └── Customer-Facing Site
│ ├── chaichuri.xyz.com/mohali
│ └── chaichuri.xyz.com/panchkula
│
├── 🏷️ Partner Sites (Fully White-Labeled Admin Deployments)
│ ├── newpartner.com (Partner's White-Label Instance)
│ │ ├── Same Admin Dashboard (Custom Branding)
│ │ ├── Partner's Vendor Registration/Login
│ │ └── Partner's Vendor Onboarding → Generates Subdomains
│ │ └── Partner's Vendor Sites (Subdomains)
│ │ ├── freshbrew.newpartner.com
│ │ │ ├── Vendor Dashboard (Partner-Branded)
│ │ │ ├── Locations: /delhi, /gurgaon
│ │ │ └── Customer-Facing Site
│ │ └── bloomhall.newpartner.com
│ │ └── Same structure...
│ │
│ └── whitebrand.com (Another Partner Instance)
│ └── Independent ecosystem with custom branding
│
└── 🛡 Shared Services (used across all tenants)
├── Auth Service (NextAuth + Laravel API)
├── Location-aware Axios Interceptor
├── Zustand Store
├── Dynamic Theming & Branding
└── SEO-friendly Routing

- Server-side rendering where appropriate
- Client-side interactivity where needed
- Centralized state management with Zustand
- Type-safe API interactions with TypeScript

### 1.2 Technology Stack

**Frontend:**

- Next.js 15.x (App Router)
- React 19.x
- TypeScript
- Tailwind CSS
- Shadcn UI components

**State Management:**

- Zustand for global state
- React Query for server state
- Immer for immutable state updates

**Authentication:**

- NextAuth.js with custom credential provider
- JWT tokens with secure storage
- Custom permission system

**Styling:**

- Tailwind CSS with custom variables
- CSS-in-JS for complex components
- Dynamic theming support

### 1.3 Component Structure

The application follows a hierarchical component structure:

```
src/
├── app/                  # Next.js app router
│   ├── (auth)/           # Authentication routes
│   ├── (protected)/      # Protected dashboard routes
│   ├── (public)/         # Public-facing routes
│   └── (on-boarding)/    # Onboarding flows
├── components/           # Shared UI components
│   ├── ui/               # Base UI components
│   └── permission/       # Permission-based components
├── lib/                  # Utility functions
│   ├── auth/             # Authentication utilities
│   └── utils.ts          # General utilities
├── store/                # Zustand stores
│   ├── auth.store.ts     # Authentication state
│   └── permission.store.ts # Permission state
├── hooks/                # Custom React hooks
├── services/             # API service layer
└── types/                # TypeScript type definitions
```

### 1.4 Data Flow

1. **Authentication Flow**:

   - User credentials → NextAuth → JWT → Zustand store → Protected routes

2. **Permission Flow**:

   - API permissions → Permission store → UI components → Conditional rendering

3. **API Request Flow**:

   - Component → API service → Axios interceptors → Backend API → Component

4. **Error Handling Flow**:
   - API error → Error interceptor → Toast notification → UI feedback

### 1.5 Server-Side vs. Client-Side Rendering

EventWizz uses a hybrid rendering approach:

1. **Server-Side Rendering (SSR)**:

   - Used for initial page loads
   - SEO-critical pages
   - Data-heavy dashboards
   - Authentication pages

2. **Client-Side Rendering (CSR)**:

   - Used for highly interactive components
   - Real-time features
   - Complex forms
   - Private user experiences

3. **Static Site Generation (SSG)**:

   - Public marketing pages
   - Documentation
   - Error pages
   - Legal content

4. **Implementation Strategy**:

   ```tsx
   // Server Component Example
   export default async function EventsPage() {
     const events = await fetchEvents();

     return (
       <div>
         <h1>Events</h1>
         <ClientSideEventsTable initialData={events} />
       </div>
     );
   }

   // Client Component Example
   ("use client");

   export function ClientSideEventsTable({ initialData }) {
     const [events, setEvents] = useState(initialData);

     // Interactive features like sorting, filtering, etc.

     return <table>{/* Table rendering */}</table>;
   }
   ```

5. **Performance Considerations**:
   - Server components for data fetching
   - Client components for interactivity
   - Streaming responses for large datasets
   - Suspense boundaries for loading states
   - Incremental Static Regeneration for semi-dynamic content

---

## 2. Authentication System

### 2.1 Authentication Flow

The EventWizz authentication system follows these steps:

1. **Login Request**: User submits credentials through the login form
2. **API Validation**: Credentials are validated by the backend API
3. **Token Generation**: On success, the API returns a token and user data
4. **Local Storage**: Token and permissions are stored in Zustand (with localStorage persistence)
5. **Session Creation**: NextAuth session is created with the token
6. **Route Protection**: Protected routes check for valid session
7. **Token Refresh**: Automatic token refresh when approaching expiration

### 2.2 NextAuth Integration

EventWizz uses NextAuth.js with a custom credentials provider. Key customizations include:

```typescript
// Custom NextAuth configuration
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        token: { label: "Token", type: "text" },
        // Additional custom fields
      },
      async authorize(credentials) {
        // Custom authorization logic
        // Returns user data with token
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      // Custom JWT handling
    },
    session: async ({ session, token }) => {
      // Custom session handling
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
};
```

### 2.3 Token Management

Tokens are managed in multiple layers:

1. **Storage**:

   - JWT stored in secure HTTP-only cookie by NextAuth
   - Token copy in Zustand store (auth-storage) for API requests
   - Backup in sessionStorage for cross-tab synchronization

2. **Security Measures**:

   - Token expiration checking
   - Periodic validation
   - Secure storage with encryption
   - Auto logout on tampering detection

3. **API Integration**:
   - Axios interceptors automatically add token to requests
   - Token refresh logic for expired tokens
   - Error handling for unauthorized responses

### 2.4 Security Measures

1. **Prevention of Token Theft**:

   - HTTP-only cookies for session tokens
   - CSRF protection
   - Content Security Policy

2. **Protection Against Storage Manipulation**:

   - Multiple storage verification
   - Integrity checking
   - Secure logout on tampering

3. **Cross-Site Scripting Protection**:
   - React's built-in XSS protection
   - Content Security Policy
   - Input sanitization

### 2.5 Multi-Tenant Support

EventWizz supports multiple tenant types:

1. **Admin Portal**: Management dashboard for system administrators
2. **Vendor Portal**: For venues and service providers
3. **Customer Portal**: For event attendees and clients

Tenant detection uses:

- Domain-based identification
- Role-based access control
- Dynamic UI adaptation
- Tenant-specific settings

### 2.6 Partner White-Label Deployments

**Important**: Partner is **NOT a user role** - it's a **deployment model** for white-labeling.

#### What is a Partner Deployment?

A partner deployment is a **fully white-labeled instance** of the EventWizz admin platform running on a custom domain with:

- ✅ **Same Admin Functionality**: All admin features and capabilities
- ✅ **Custom Branding**: Partner's logo, colors, and theme
- ✅ **Independent Ecosystem**: Partners onboard their own vendors
- ✅ **Custom Domain**: Partner's own domain (e.g., `partner-brand.com`)
- ✅ **Isolated Database**: Separate vendor and customer data
- ✅ **Revenue Independence**: Partners manage their own commissions

#### How Partner White-Labeling Works

```
Main Platform (eventwizz.com)
├── Admin Dashboard
├── Vendors: vendor1, vendor2, vendor3
└── Customers

Partner Instance 1 (newpartner.com) - White Labeled
├── Admin Dashboard (Partner-Branded)
├── Vendors: partnerVendor1, partnerVendor2
└── Customers

Partner Instance 2 (whitebrand.com) - White Labeled
├── Admin Dashboard (Partner-Branded)
├── Vendors: whitelabelVendor1, whitelabelVendor2
└── Customers
```

#### Setting Up a Partner Deployment

**Step 1: Environment Configuration**

Only **4 environment variables** need to be changed:

```env
# Partner's custom domain
NEXT_PUBLIC_WHITE_LABEL_URL="partner-brand.com"

# Partner's API endpoint
NEXT_PUBLIC_API_URL="https://api.partner-brand.com/api/v1"

# Partner's app URL
NEXT_PUBLIC_APP_URL="https://partner-brand.com"

# Partner's WebSocket URL
NEXT_PUBLIC_SOCKET_URL="wss://api.partner-brand.com"
```

**Step 2: Backend Configuration**

The Laravel backend must be configured with partner-specific:
- Database connection (isolated data)
- Domain settings
- Commission structure
- Payment gateway credentials

**Step 3: Theme Customization**

Partners customize branding through **Site Essentials** (no code changes):
- Upload custom logo and favicon
- Set brand colors and typography
- Configure SEO metadata
- Add custom contact information
- Set social media links

**Step 4: Deploy**

```bash
# Build with partner environment
npm run build

# Deploy to partner's infrastructure
npm start
```

#### Key Benefits

1. **Zero Code Changes**: Same codebase for all deployments
2. **Perfect White-Labeling**: Complete brand customization
3. **Independent Operation**: Each partner manages their own ecosystem
4. **Scalable**: Deploy unlimited partner instances
5. **Maintainable**: Single codebase, easy updates

#### Technical Architecture

```typescript
// Domain detection determines website_role
const domain = window.location.hostname;

// "eventwizz.com" → website_role = "admin"
// "partner-brand.com" → website_role = "admin" (but with partner theme)
// "vendor.eventwizz.com" → website_role = "vendor"
// "vendor.partner-brand.com" → website_role = "vendor" (partner-branded)
```

The system uses the same admin role but applies different themes based on the domain's theme API response.

#### Partner vs Main Platform

| Feature | Main Platform | Partner Deployment |
|---------|--------------|-------------------|
| **Codebase** | Same | Same |
| **Role System** | Admin, Vendor, Customer | Admin, Vendor, Customer |
| **Branding** | EventWizz brand | Partner's brand |
| **Domain** | eventwizz.com | partner-brand.com |
| **Database** | Main DB | Partner DB |
| **Vendors** | Platform vendors | Partner's vendors |
| **Revenue** | Platform commissions | Partner commissions |

---

## 3. Permission System

### 3.1 Permission Model

EventWizz uses a granular permission model with:

1. **Permission Keys**: String identifiers for specific actions

   ```javascript
   // Examples of permission keys
   "read-event";
   "create-ticket";
   "delete-staff";
   "update-newsletter";
   ```

2. **Role-Based Grouping**: Permissions are grouped into roles

   ```javascript
   // Example role with permissions
   {
     id: 1,
     name: "Event Manager",
     permissions: ["read-event", "create-event", "edit-event"]
   }
   ```

3. **User Assignment**: Users are assigned roles or direct permissions

4. **Permission Checks**: UI and API actions check against user's permissions

### 3.2 Permission Storage

Permissions are stored in multiple locations for security and performance:

1. **Server Response**: Initial permissions come from login/registration API
2. **Zustand Store**: `usePermissionStore` with methods like:

   ```typescript
   // Permission store methods
   setPermissions(permissions: string[])
   hasPermission(permissionKey: string): boolean
   hasAnyPermission(permissionKeys: string[]): boolean
   hasAllPermissions(permissionKeys: string[]): boolean
   reset()
   ```

3. **LocalStorage**: Persistent storage via Zustand's persist middleware
4. **SessionStorage**: Backup storage for cross-tab consistency

### 3.3 Permission Guards

The system implements several types of permission guards:

1. **Component Guards**:

   ```jsx
   <PermissionGuard permissionKey="create-event">
     <Button>Create Event</Button>
   </PermissionGuard>
   ```

2. **Route Guards**:

   ```jsx
   <PermissionRoute permissionKey="manage-staff" fallbackPath="/dashboard">
     <StaffManagementPage />
   </PermissionRoute>
   ```

3. **Conditional Elements**:
   ```jsx
   <PermissionButton permissionKey="delete-user">Delete User</PermissionButton>
   ```

### 3.4 Integration with Auth

The permission system and authentication are tightly integrated:

1. **Login Process**:

   - Auth token stored in auth store
   - Permissions stored in permission store
   - Both synchronized with backend on login/logout

2. **Security Checks**:

   - Cross-verification between auth and permission stores
   - Automatic logout on permission/auth mismatch
   - Storage integrity validation

3. **Session Management**:
   - Permissions included in NextAuth session
   - Available server-side and client-side
   - Synchronized between tabs

---

## 4. UI Permission Implementation

### 4.1 Permission-Based Components

EventWizz includes several permission-aware components:

1. **PermissionButton**: Button that's either disabled or hidden based on permissions

   ```jsx
   <PermissionButton permissionKey="create-ticket" hideOnNoPermission={true}>
     Create Ticket
   </PermissionButton>
   ```

2. **PermissionGuard**: Conditional wrapper to show/hide content

   ```jsx
   <PermissionGuard
     permissionKey="read-staff"
     fallback={<AccessDeniedMessage />}
   >
     <StaffList />
   </PermissionGuard>
   ```

3. **PermissionRoute**: Higher-level guard for entire routes/pages
   ```jsx
   <PermissionRoute permissionKey="edit-event" fallbackPath="/unauthorized">
     <EditEventPage />
   </PermissionRoute>
   ```

### 4.2 Permission Guards

Permission guards can be implemented at different levels:

1. **Page Level**: Guard entire pages

   ```jsx
   // src/app/(protected)/vendor/staff-management/page.tsx
   export default function Page() {
     return (
       <PermissionRoute permissionKey="read-staff">
         <StaffManagementContent />
       </PermissionRoute>
     );
   }
   ```

2. **Component Level**: Guard UI elements

   ```jsx
   <PermissionGuard permissionKey="create-event">
     <Button>Create Event</Button>
   </PermissionGuard>
   ```

3. **Custom Hooks**: For programmatic permission checks

   ```jsx
   const canCreateEvent = usePermission("create-event");

   if (canCreateEvent) {
     // Perform action
   }
   ```

### 4.3 Error Handling

The permission system includes robust error handling:

1. **UI Fallbacks**: Graceful UI alternatives when permissions are missing

   ```jsx
   <PermissionGuard permissionKey="delete-staff" fallback={<ReadOnlyView />}>
     <DeleteButton />
   </PermissionGuard>
   ```

2. **API Error Handling**:

   - 403 responses trigger permission-specific errors
   - Custom error pages with helpful guidance
   - Automatic redirection to appropriate pages

3. **Global Error Handler**:
   - Centralized permission error handling
   - Consistent error UI
   - User guidance for missing permissions

### 4.4 Best Practices

When implementing permission-based UI:

1. **Prefer Hiding Over Disabling**: Hide UI elements completely for better security and UX

   ```jsx
   // Good: Elements completely hidden
   <PermissionGuard permissionKey="create-event">
     <Button>Create Event</Button>
   </PermissionGuard>

   // Avoid: Disabled buttons that show unavailable actions
   <Button disabled={!hasPermission("create-event")}>
     Create Event
   </Button>
   ```

2. **Early Permission Checking**: Check permissions early in the component tree

   ```jsx
   // Check at page level, not deep in component tree
   function EventPage() {
     return (
       <PermissionRoute permissionKey="read-event">
         <EventPageContent />
       </PermissionRoute>
     );
   }
   ```

3. **Provide Context**: Always explain why access is denied

   ```jsx
   <PermissionGuard
     permissionKey="manage-staff"
     fallback={
       <AccessDeniedMessage
         message="You need staff management permissions to view this page"
         contactInfo="Please contact your administrator"
       />
     }
   >
     <StaffManagement />
   </PermissionGuard>
   ```

4. **Avoid Hard-Coded Permissions**: Use constants for permission keys

   ```jsx
   // Good: Use constants
   import { PERMISSIONS } from "@/constants/permissions";

   <PermissionGuard permissionKey={PERMISSIONS.CREATE_EVENT}>
     <Button>Create</Button>
   </PermissionGuard>

   // Avoid: String literals
   <PermissionGuard permissionKey="create-event">
     <Button>Create</Button>
   </PermissionGuard>
   ```

---

## 5. Menu System

### 5.1 Menu Structure

The EventWizz menu system uses a structured configuration:

```typescript
// Menu structure
export const vendorMenus: MenuItemProps[] = [
  {
    title: "Dashboard",
    path: "/vendor/dashboard",
    icon: HomeIcon,
    permissionKey: "read-dashboard",
  },
  {
    title: "Events",
    path: "/vendor/events",
    icon: CalendarIcon,
    permissionKey: "read-event",
    submenu: [
      {
        title: "All Events",
        path: "/vendor/events",
        permissionKey: "read-event",
      },
      {
        title: "Create Event",
        path: "/vendor/events/create",
        permissionKey: "create-event",
      },
    ],
  },
  // Additional menu items...
];
```

### 5.2 Permission-Based Menus

Menus are filtered based on user permissions:

1. **Menu Filtering**:

   ```jsx
   // Filter menus based on permissions
   const filteredMenus = usePermissionFilteredMenus(menus);
   ```

2. **Visibility Rules**:

   - Menu items with permissionKey check against user permissions
   - Items without permissionKey are always visible
   - Submenus with all items hidden also hide parent item

3. **Dynamic Generation**:
   - Menus adapt to user's role and permissions
   - Hidden menu items don't create empty spaces
   - Parent items hide when all children are hidden

### 5.3 Dynamic Menu Generation

Menus are generated dynamically based on:

1. **User Role**: Different menu configurations per role

   ```jsx
   const menus = useMemo(() => {
     switch (userType) {
       case "admin":
         return adminMenus;
       case "vendor":
         return vendorMenus;
       case "customer":
         return customerMenus;
       default:
         return [];
     }
   }, [userType]);
   ```

2. **Permissions**: Filtered based on user permissions

   ```jsx
   const filteredMenus = usePermissionFilteredMenus(menus);
   ```

3. **Active State**: Marking current route as active
   ```jsx
   const isActive = useMemo(() => {
     return pathname.startsWith(item.path);
   }, [pathname, item.path]);
   ```

---

## 6. Staff Management

### 6.1 Staff Registration

Staff members can be added through the staff management interface:

1. **Creation Process**:

   - Admin/manager creates staff account
   - System generates temporary password
   - Email notification sent to staff member
   - First login requires password change

2. **Required Fields**:

   - First name, last name
   - Email (used as username)
   - Role assignment
   - Optional contact information

3. **Permission Assignment**:
   - Role-based permission assignment
   - Optional custom permission overrides
   - Granular control over staff access

### 6.2 Staff Authentication

Staff members authenticate through:

1. **Login Process**:

   - Email/password form
   - Token generation
   - Permission loading
   - Session establishment

2. **Security Measures**:

   - Password strength requirements
   - Account lockout after failed attempts
   - Password expiration policies
   - Activity logging

3. **Session Management**:
   - Auto-logout after inactivity
   - Single device login option
   - Session revocation capabilities

### 6.3 Role Assignment

Roles are managed through:

1. **Role Management**:

   - Create/edit/delete roles
   - Permission bundling
   - Role hierarchy

2. **Assignment Process**:

   - Assign roles during staff creation
   - Update roles for existing staff
   - Role inheritance options

3. **Default Roles**:
   - Administrator (full access)
   - Manager (operational access)
   - Staff (limited functional access)
   - Viewer (read-only access)

### 6.4 Permission Management

Staff permissions can be customized:

1. **Custom Permissions**:

   - Override role-based permissions
   - Add/remove specific permissions
   - Temporary permission grants

2. **Permission UI**:

   - Interactive permission editor
   - Grouping by functional area
   - Search and filter capabilities

3. **Audit Trail**:
   - Track permission changes
   - Record who made changes
   - Historical permission views

---

## 7. UI/UX Systems

### 7.1 Theme System

The EventWizz theme system provides dynamic styling capabilities across the application:

1. **Theme Architecture**:

   - CSS custom properties (variables) for color tokens
   - Theme configuration objects
   - Domain-based theme selection
   - User preference overrides

2. **Implementation**:

   ```tsx
   // Theme provider component
   function ThemeProvider({ children }: { children: React.ReactNode }) {
     const { theme } = useThemeStore();

     // Apply theme to document root
     useEffect(() => {
       if (theme) {
         Object.entries(theme.tokens).forEach(([key, value]) => {
           document.documentElement.style.setProperty(`--${key}`, value);
         });
       }
     }, [theme]);

     return <>{children}</>;
   }
   ```

3. **Dynamic Theme Loading**:

   - Domain detection at runtime
   - Theme API fetches configuration
   - Real-time theme switching
   - Theme persistence in localStorage

4. **Vendor Customization**:
   - Vendor-specific theme settings
   - Brand color overrides
   - Custom logo and assets
   - White-labeling capabilities

### 7.2 Loading System

EventWizz implements a comprehensive loading state system:

1. **Loading State Types**:

   - Initial page load
   - Component-level loading
   - API request loading
   - Form submission loading
   - Lazy-loaded content

2. **Implementation Patterns**:

   ```tsx
   // Global loading state
   function LoadingProvider({ children }: { children: React.ReactNode }) {
     const [isLoading, setIsLoading] = useState(false);

     // API loading interceptor
     useEffect(() => {
       const requestInterceptor = axios.interceptors.request.use((config) => {
         setIsLoading(true);
         return config;
       });

       const responseInterceptor = axios.interceptors.response.use(
         (response) => {
           setIsLoading(false);
           return response;
         },
         (error) => {
           setIsLoading(false);
           return Promise.reject(error);
         }
       );

       return () => {
         axios.interceptors.request.eject(requestInterceptor);
         axios.interceptors.response.eject(responseInterceptor);
       };
     }, []);

     return (
       <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
         {isLoading && <GlobalLoadingIndicator />}
         {children}
       </LoadingContext.Provider>
     );
   }
   ```

3. **Loading Indicators**:

   - Global spinner overlay
   - Button loading states
   - Skeleton loaders for content
   - Progress bars for file uploads
   - Optimistic UI updates

4. **Best Practices**:
   - Consistent loading UI across application
   - Appropriate loading indicators by context
   - Timeout handling for long operations
   - Loading state management with Suspense
   - Error states connected to loading states

### 7.3 Form & Button Standards

EventWizz implements standardized form and button components:

1. **Form Components**:

   - Consistent input styling
   - Validation integration with React Hook Form
   - Accessible form controls
   - Responsive form layouts
   - Form section components

2. **Button Hierarchy**:

   ```tsx
   // Button variants
   const buttonVariants = cva(
     "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
     {
       variants: {
         variant: {
           default: "bg-primary text-primary-foreground hover:bg-primary/90",
           "event-primary":
             "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]",
           "event-secondary":
             "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:bg-[var(--color-secondary-hover)]",
           "event-outline":
             "border border-[var(--color-primary)] bg-background text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)]",
           "event-ghost": "hover:bg-accent hover:text-accent-foreground",
           // Additional variants...
         },
         size: {
           default: "h-10 px-4 py-2",
           sm: "h-9 rounded-md px-3",
           lg: "h-11 rounded-md px-8",
           xl: "h-12 rounded-md px-8 text-base",
           icon: "h-10 w-10",
         },
       },
       defaultVariants: {
         variant: "default",
         size: "default",
       },
     }
   );
   ```

3. **Form Standards**:

   - Required field indicators
   - Consistent error messaging
   - Help text positioning
   - Label alignment rules
   - Form group spacing

4. **Accessibility Features**:
   - ARIA labels and roles
   - Keyboard navigation
   - Error announcements
   - Focus management
   - Color contrast compliance

### 7.4 Onboarding Design

The onboarding system guides new users through initial setup:

1. **Onboarding Flow Architecture**:

   - Step-based progression
   - Persistent state management
   - Completion tracking
   - Resumable sessions
   - Skip and bypass options

2. **Implementation**:

   ```tsx
   // Onboarding provider
   function OnboardingProvider({ children }: { children: React.ReactNode }) {
     const { user } = useAuthStore();
     const router = useRouter();

     useEffect(() => {
       if (user && !user.isOnboarded) {
         // Determine correct onboarding step
         const nextStep = user.on_boarding_step || 1;
         router.push(`/on-boarding/step-${nextStep}`);
       }
     }, [user, router]);

     return <>{children}</>;
   }
   ```

3. **Step Components**:

   - Progress indicators
   - Contextual help
   - Required vs. optional steps
   - Step validation
   - Navigation controls

4. **User Experience**:
   - Welcoming messaging
   - Clear instructions
   - Visual guidance
   - Celebration of completion
   - Follow-up resources

---

## 8. Technical Implementations

### 8.1 TanStack Integration

EventWizz leverages TanStack libraries for data management:

1. **TanStack Query (React Query)**:

   ```tsx
   // API hook example
   export function useEvents(params?: EventParams) {
     return useQuery({
       queryKey: ["events", params],
       queryFn: () => eventsService.getEvents(params),
       staleTime: 5 * 60 * 1000, // 5 minutes
       select: (data) => data.data, // Extract data from API response
     });
   }

   // Usage in component
   function EventsList() {
     const { data: events, isLoading, error } = useEvents({ limit: 10 });

     if (isLoading) return <EventsListSkeleton />;
     if (error) return <ErrorDisplay error={error} />;

     return <EventsTable events={events} />;
   }
   ```

2. **Query Invalidation**:

   - Strategic cache invalidation
   - Optimistic updates
   - Prefetching strategies
   - Background refetching
   - Dependent queries

3. **TanStack Table**:

   - Flexible table definitions
   - Sorting, filtering, pagination
   - Row selection
   - Column visibility
   - Virtualized rendering

4. **Performance Optimizations**:
   - Deduplication of requests
   - Query result memoization
   - Suspense integration
   - Error boundary connection
   - Custom query options

### 8.2 Type System

EventWizz implements a comprehensive TypeScript type system:

1. **Core Type Structure**:

   ```typescript
   // Entity types
   export interface User {
     id: number;
     uuid: string;
     email: string;
     first_name: string;
     last_name: string;
     full_name: string;
     avatar: string | null;
     role: UserRole;
     status: UserStatus;
     // Additional properties...
   }

   // Enum types
   export enum UserRole {
     Admin = "admin",
     Vendor = "vendor",
     Customer = "customer",
     Staff = "staff",
   }

   export enum UserStatus {
     Active = "active",
     Inactive = "inactive",
     Pending = "pending",
     Suspended = "suspended",
   }

   // API response types
   export interface ApiResponse<T> {
     status: boolean;
     message: string;
     data: T;
     errors: string[];
   }

   // Form types with Zod validation
   export const userFormSchema = z.object({
     first_name: z.string().min(2).max(50),
     last_name: z.string().min(2).max(50),
     email: z.string().email(),
     // Additional validations...
   });

   export type UserFormValues = z.infer<typeof userFormSchema>;
   ```

2. **Type Utilities**:

   - Utility type functions
   - Type guards for runtime checks
   - Generic API types
   - Conditional types
   - Type inference helpers

3. **API Type Integration**:

   - Request/response typing
   - Service layer type safety
   - Form validation integration
   - State management typing
   - API error typing

4. **Safety Patterns**:
   - Strict null checking
   - Exhaustive conditionals
   - Branded types for IDs
   - Discriminated unions
   - Readonly properties

### 8.3 Middleware System

EventWizz employs various middleware layers:

1. **Next.js Proxy** (formerly Middleware):

   ```typescript
   // proxy.ts (Next.js 16+)
   import { NextResponse } from "next/server";
   import type { NextRequest } from "next/server";

   export default async function proxy(request: NextRequest) {
     const { pathname } = request.nextUrl;

     // Domain-based middleware logic
     const hostname = request.headers.get("host");

     // Authentication check for protected routes
     if (pathname.startsWith("/vendor") || pathname.startsWith("/admin")) {
       const token = request.cookies.get("next-auth.session-token");

       if (!token) {
         const url = new URL("/auth/login", request.url);
         url.searchParams.set("callbackUrl", pathname);
         return NextResponse.redirect(url);
       }
     }

     // Tenant-specific redirects and processing
     if (hostname?.includes("admin.") && !pathname.startsWith("/admin")) {
       return NextResponse.redirect(new URL("/admin", request.url));
     }

     return NextResponse.next();
   }

   export const config = {
     matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
   };
   ```

2. **API Request Middleware**:

   - Authentication headers
   - Request logging
   - Rate limiting
   - CORS handling
   - Request validation

3. **Response Middleware**:

   - Error formatting
   - Response transformation
   - Caching headers
   - Analytics tracking
   - Performance monitoring

4. **Server Components**:
   - Data fetching patterns
   - SSR optimization
   - Edge function integration
   - Static generation
   - Incremental static regeneration

### 8.4 Environment Variables

EventWizz manages environment configuration securely:

1. **Environment Structure**:

   ```typescript
   // src/env.ts
   import { createEnv } from "@t3-oss/env-nextjs";
   import { z } from "zod";

   export const env = createEnv({
     server: {
       NODE_ENV: z.enum(["development", "production", "test"]),
       API_URL: z.string().url(),
       API_KEY: z.string().min(1),
       DATABASE_URL: z.string().url(),
       // Additional server environment variables
     },
     client: {
       NEXT_PUBLIC_APP_URL: z.string().url(),
       NEXT_PUBLIC_API_URL: z.string().url(),
       NEXT_PUBLIC_DEV_MODE: z.string().transform((val) => val === "true"),
       // Additional client environment variables
     },
     // Skip validation in production for better performance
     skipValidation: process.env.NODE_ENV === "production",
     // Make sure that NEXT_PUBLIC_ variables are exposed to the client
     experimental__runtimeEnv: {
       NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
       NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
       NEXT_PUBLIC_DEV_MODE: process.env.NEXT_PUBLIC_DEV_MODE,
     },
   });
   ```

2. **Environment Usage**:

   - Type-safe access
   - Validation at build time
   - Runtime environment detection
   - Environment-specific features
   - Secret management

3. **Deployment Configuration**:

   - Environment-specific builds
   - CI/CD integration
   - Secret rotation
   - Environment inheritance
   - Default fallbacks

4. **Development Tools**:
   - Local environment setup
   - Environment switching
   - Mock environments
   - Environment debugging
   - Environment documentation

### 8.5 Multi-Domain Environment

EventWizz supports multiple domains with tenant-specific configurations:

1. **Domain Detection**:

   ```typescript
   // src/lib/domain.ts
   export function getDomainType(
     hostname: string
   ): "admin" | "vendor" | "customer" {
     if (hostname.startsWith("admin.")) return "admin";
     if (hostname.startsWith("vendor.")) return "vendor";
     return "customer"; // Default domain type
   }

   // Usage in app
   export function DomainProvider({ children }: { children: React.ReactNode }) {
     const [domainType, setDomainType] = useState<DomainType>("customer");

     useEffect(() => {
       if (typeof window !== "undefined") {
         const type = getDomainType(window.location.hostname);
         setDomainType(type);

         // Store for API calls and other domain-aware features
         localStorage.setItem("domain_type", type);
       }
     }, []);

     return (
       <DomainContext.Provider value={{ domainType }}>
         {children}
       </DomainContext.Provider>
     );
   }
   ```

2. **Domain-Specific Routing**:

   - Route constraints by domain
   - Domain-based layouts
   - Authentication requirements
   - Feature availability
   - Error pages

3. **Multi-Tenant Data Isolation**:

   - Tenant-specific API endpoints
   - Data segregation
   - Cross-tenant references
   - Tenant identification in tokens
   - Parent-child tenant relationships

4. **White-Labeling System**:
   - Domain-specific branding
   - Theme customization
   - Content variations
   - Feature toggling
   - Custom domains for vendors

### 8.6 Domain System Architecture

The EventWizz platform operates on a multi-tenant architecture with distinct domains serving different purposes:

1. **Admin Portal** (any domain with website_role="admin"):

   - **Homepage Focus**: Vendor-focused to attract new vendors
   - **Primary Users**:
     - Vendors: Register, complete onboarding, manage offerings, create events
     - Admins: Manage the entire platform
   - **Key Features**: Vendor management, platform administration, event creation tools
   - **Access Control**: Separate dashboards based on user's activeRole

2. **Vendor Portal** (any domain with website_role="vendor"):

   - **Homepage Focus**: Customer-focused to attract event attendees
   - **Primary Users**:
     - Customers: Browse events, register accounts, book tickets
   - **Key Features**: Event discovery, booking system, vendor-specific branding
   - **Access Control**: Public access for browsing, authentication for bookings
   - **Note**: Vendors do not use this portal for management (they use the admin portal)

This architecture allows for:

- Clear separation between customer-facing experiences and management operations
- Vendor-specific branding on customer-facing sites
- Centralized management in the admin portal
- Specialized interfaces for different user types

Domain detection happens through two mechanisms:

- Subdomain detection (if using subdomain pattern)
- `website_role` from theme settings API

The root page (`src/app/(public)/page.tsx`) determines which homepage to render based on this domain detection, serving the appropriate content for either vendor-focused portals (admin) or customer-focused portals (vendor).

---

## 9. Troubleshooting & Debugging

### 9.1 Common Issues

1. **Authentication Problems**:

   - Session not persisting: Check localStorage/cookie integrity
   - Login succeeds but redirects to login again: Verify permission store synchronization
   - Token rejected by API: Check token expiration and validity

2. **Permission Issues**:

   - UI elements missing: Check permission keys match backend
   - Permission denied errors: Verify role assignment
   - Inconsistent permissions across tabs: Check sessionStorage backup

3. **State Management**:
   - Zustand store reset: Verify storage persistence
   - Permissions lost after navigation: Check hydration process
   - Auth/permission mismatch: Inspect synchronization

### 9.2 Debug Tools

EventWizz includes built-in debugging tools:

1. **Permission Debugger**:

   - Accessible at `/debug/permissions` (admin only)
   - Shows current user permissions
   - Tests permission checks
   - Simulates different permission sets

2. **Auth Debugger**:

   - Displays current auth state
   - Shows token information (without exposing token)
   - Session details and expiration

3. **Storage Inspector**:
   - Views localStorage/sessionStorage content
   - Validates storage integrity
   - Tests storage synchronization

### 9.3 Permission Debugging

For troubleshooting permission issues:

1. **Console Debugging**:

   ```javascript
   // Log current permissions
   console.log(usePermissionStore.getState().permissions);

   // Test permission check
   console.log(usePermissionStore.getState().hasPermission("create-event"));

   // Check permission storage
   console.log(localStorage.getItem("permission-storage"));
   console.log(sessionStorage.getItem("permissions-backup"));
   ```

2. **UI Debug Components**:

   ```jsx
   // Display current permissions (admin only)
   <PermissionDebug />

   // Test specific permission
   <PermissionGuard permissionKey="some-permission" debug>
     <Content />
   </PermissionGuard>
   ```

3. **Network Debugging**:
   - Check API responses for permission data
   - Verify token in request headers
   - Inspect 403 responses for specific error messages

---

## 10. Conclusion

The EventWizz system provides a comprehensive, secure, and flexible platform for event management with:

- Robust authentication system
- Granular permission controls
- Role-based access management
- Component-based architecture
- Modern React patterns
- Type safety with TypeScript
- Dynamic theming capabilities
- Multi-domain support
- Standardized UI components
- Powerful data management

By following the documentation in this guide, developers can effectively work with the system, extend its functionality, and troubleshoot issues when they arise.

For specific implementation details, refer to the codebase and inline documentation in the relevant files.

---

## 11. Module Implementation Guide

This section outlines the correct approach to implementing new modules in the EventWizz application, with a focus on proper architecture, TanStack Query integration, and multi-tenant considerations.

### 11.1 Module Structure

Each module should follow this general structure:

```
src/app/(protected)/_shared/{module-name}/
├── _components/         # UI Components
├── _lib/
│   ├── schema.ts        # Zod schemas and type definitions
│   ├── hooks.ts         # React hooks (using TanStack Query)
│   ├── queries.ts       # TanStack Query implementation
│   └── constants.ts     # Constants (if needed)
└── page.tsx             # Page component
```

For service implementations:

```
src/services/common/{module-name}/
├── {module-name}.service.ts  # Service implementation
├── type.ts                   # Type definitions (if needed)
└── constants.ts              # Constants (if needed)
```

### 11.2 File Organization

#### 1. `schema.ts`

This file should contain all Zod schemas and type definitions:

```typescript
import { z } from "zod";

// Define schemas
export const ModuleSchema = z.object({
  // Schema properties
});

// Define form validation schemas
export const ModuleFormSchema = z.object({
  // Form validation schema
});

// Define types
export type Module = z.infer<typeof ModuleSchema>;
export type ModuleFormValues = z.infer<typeof ModuleFormSchema>;
```

#### 2. `queries.ts`

This file should contain TanStack Query implementations:

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import moduleService from "@/services/common/module-name/module-name.service";
import { Module } from "@/services/common/module-name/type";
import { ModuleFormValues } from "./schema";

// Query keys
export const moduleKeys = {
  all: ["module-name"] as const,
  details: () => [...moduleKeys.all, "details"] as const,
  // Add more specific keys as needed
};

// Query hook
export const useModuleQuery = () => {
  return useQuery({
    queryKey: moduleKeys.details(),
    queryFn: () => moduleService.getModule(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Mutation hook
export const useModuleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ModuleFormValues) =>
      moduleService.updateModule(data as Module),
    onSuccess: (data) => {
      // Immediately update the cache
      queryClient.setQueryData(moduleKeys.details(), data);
    },
  });
};
```

#### 3. `hooks.ts`

This file should contain React hooks that use the queries:

```typescript
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useModuleQuery, useModuleMutation } from "./queries";
import { ModuleFormSchema, ModuleFormValues } from "./schema";

export const useModule = () => {
  const [error, setError] = useState<string | null>(null);

  // Use TanStack Query for data fetching
  const { data: module, isLoading: isQueryLoading, refetch } = useModuleQuery();

  // Use TanStack Mutation for updating
  const { mutate: updateModule, isPending: isMutationLoading } =
    useModuleMutation();

  // Loading state
  const isLoading = isQueryLoading || isMutationLoading;

  // Form setup
  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(ModuleFormSchema),
    defaultValues: {
      /* default values */
    },
    values: module as ModuleFormValues,
  });

  // Submit handler
  const onSubmit = async (values: ModuleFormValues): Promise<boolean> => {
    try {
      updateModule(values);
      return true;
    } catch (err) {
      setError("Failed to update");
      console.error("Error:", err);
      return false;
    }
  };

  return {
    module,
    isLoading,
    error,
    form,
    onSubmit,
    refetchModule: refetch,
  };
};
```

### 11.3 TanStack Query Integration

#### Key Guidelines:

1. **Use query keys consistently** - Create a structured object for query keys
2. **Set appropriate cache times**:
   - `staleTime`: How long the data is considered fresh (typically 5 minutes)
   - `gcTime`: How long to keep inactive data in cache (typically 10 minutes)
3. **Update cache on mutations** - Use `setQueryData` to immediately update the cache after mutations
4. **Avoid unnecessary refetches** - Only invalidate queries when absolutely necessary

#### Common Pitfalls to Avoid:

- **Direct API calls in components** - Use TanStack Query hooks instead
- **Missing cache updates after mutations** - Always update the cache
- **Overly aggressive cache invalidation** - Prefer direct cache updates when possible
- **Multiple hooks fetching the same data** - Centralize in a single query hook

### 11.4 Hooks Organization

EventWizz has two distinct locations for hooks, each with a specific purpose:

#### 1. Module-Specific Hooks (`src/app/(protected)/_shared/{module-name}/_lib/hooks.ts`)

- **Purpose**: Feature-specific functionality that is only used within that module
- **Scope**: Limited to the module's feature set
- **Example**: `useSiteEssentials()` in `sites-essentials/_lib/hooks.ts`
- **When to use**: Start here for all new hook development

#### 2. Global Application Hooks (`src/hooks/` directory)

- **Purpose**: Application-wide functionality used across multiple features
- **Scope**: Available throughout the entire application
- **Example**: `useAuth()`, `usePermission()`, etc.
- **When to use**: For truly cross-cutting concerns or shared functionality

#### Decision Criteria: Module-Specific vs. Global Hooks

Use this decision tree to determine where to place your hooks:

1. **Is the hook specific to one feature?**

   - Yes → Place in module-specific `hooks.ts`
   - No → Continue

2. **Is the hook needed across 2+ modules?**

   - Yes → Place in global hooks directory
   - No → Place in module-specific `hooks.ts`

3. **Does the hook provide cross-tenant functionality?**
   - Yes → Place in `/src/hooks/common/`
   - No → Place in `/src/hooks/` with appropriate naming

#### Hook Promotion Process

As your application evolves, you may need to promote a hook from module-specific to global:

1. Start by developing the hook in the module-specific location
2. When the hook proves valuable across modules, move it to `/src/hooks/common/`
3. Update imports in the original module to use the promoted hook
4. Document the hook's purpose and usage

### 11.5 Reusable Hooks

For truly common functionality, move hooks to a dedicated folder:

```
src/hooks/common/
├── useModule.ts
└── useAnotherModule.ts
```

These hooks should:

1. Import and re-export the query hooks
2. Add any additional application-wide functionality
3. Be documented for reuse across tenant types

### 11.6 Multi-Tenant Considerations

The application serves multiple tenant types (admin, vendor, customer). When implementing modules:

1. **Use clear naming** - Indicate if a module is tenant-specific or common
2. **Implement proper access controls** - Use permissions to restrict access
3. **Consider UI differences** - Different tenants may need different views
4. **Keep business logic consistent** - Core logic should be shared when possible

### 11.7 Implementation Checklist

Before implementing a new module:

- [ ] Define clear schema and types in `schema.ts`
- [ ] Implement service functions in appropriate service file
- [ ] Create TanStack Query hooks in `queries.ts`
- [ ] Build React hooks in `hooks.ts` that use the query hooks
- [ ] Ensure proper caching is implemented
- [ ] Test with multiple components to verify caching works
- [ ] Consider if hooks should be promoted to `/src/hooks/common/` based on the decision criteria

By following this guide, you'll create modules that are maintainable, performant, and properly integrated with the application's architecture.

---

_This documentation is maintained by the EventWizz development team and should be updated whenever significant changes are made to the system architecture, authentication flow, permission system, or module implementation patterns._

## Image References

When referencing images in the project, use the following pattern:

```jsx
// For images in public/assets/images directory
<Image
  src="/assets/images/logos/eventwizz-logo.png"
  alt="EventWizz"
  width={110}
  height={30}
/>
```

All images should be placed in the `public/assets/images` directory and referenced with an absolute path starting with `/assets/images/`.

**Important:** Do not use `@/public/images/...` or similar patterns as they will not work in production builds.
