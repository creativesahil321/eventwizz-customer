# 🎯 Dual Project Setup - Customer Site on Separate Vercel Project

## 💡 The Solution

Instead of fighting with subdomains or backend validation, create a **separate Vercel project** for the customer site!

### Architecture:
- **Project 1:** `eventwizz.vercel.app` → Vendor/Admin dashboards
- **Project 2:** `eventwizz-customer.vercel.app` (or similar) → Customer-facing site

## ✅ Benefits

1. ✅ **No Backend Changes** - Backend validation stays as-is
2. ✅ **Clean Separation** - Vendor and Customer sites are independent
3. ✅ **Easy Demo** - Show two URLs to investors
4. ✅ **No Subdomain Complexity** - Each project has its own domain
5. ✅ **Independent Deployments** - Deploy customer site without affecting vendor site
6. ✅ **Better for Production** - Can scale each separately

## 🚀 Setup Steps

### Step 1: Create Customer Project Copy

**Option A: Fork/Clone Repository**
```bash
# Clone your current project
git clone <your-repo-url> eventwizz-customer
cd eventwizz-customer

# Create a new branch for customer site
git checkout -b customer-site
```

**Option B: Duplicate Project Folder**
- Copy your entire project folder
- Rename it to `eventwizz-customer` or similar

### Step 2: Configure Customer Project

**Update Environment Variables for Customer Project:**

Create `.env.production` in customer project:
```env
# Customer Site Configuration
NEXT_PUBLIC_API_URL="https://eventwizz-admin.socreativesupport.com/api/v1"
NEXT_PUBLIC_APP_URL=https://eventwizz-customer.vercel.app
NEXT_PUBLIC_WHITE_LABEL_URL=eventwizz-customer.vercel.app

# Disable subdomain routing (customer site is standalone)
NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING=false

# Auth Configuration
NEXTAUTH_URL=https://eventwizz-customer.vercel.app
NEXTAUTH_SECRET=<same-secret-as-main-project>

# Other configs (same as main project)
NEXT_PUBLIC_SOCKET_URL="wss://eventwizz-admin.socreativesupport.com"
# ... rest of your env vars
```

### Step 3: Modify Customer Project Code

**Update `src/middleware.ts` for Customer Site:**

The customer project should:
- Only show customer-facing routes
- Redirect vendor/admin routes to main domain
- Allow location pages
- Handle customer authentication

**Create `src/middleware-customer.ts` (or modify existing):**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { env } from "@/env";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // Allow public routes
  if (
    pathname === "/" ||
    pathname.match(/^\/[^\/]+\/?$/) || // Location pages
    pathname.match(/^\/[^\/]+\/events\/[^\/]+\/?$/) || // Event pages
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Redirect vendor/admin routes to main domain
  if (pathname.startsWith("/vendor") || pathname.startsWith("/admin")) {
    const mainDomain = "eventwizz.vercel.app";
    return NextResponse.redirect(
      new URL(`https://${mainDomain}${pathname}`, req.url)
    );
  }

  // Protect customer routes
  if (pathname.startsWith("/customer")) {
    const token = await getToken({
      req,
      secret: env.NEXTAUTH_SECRET,
    });

    if (!token || token.account_type !== "customer") {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets).*)"],
};
```

### Step 4: Deploy to New Vercel Project

1. **Create New Vercel Project:**
   - Go to Vercel Dashboard
   - Click "Add New Project"
   - Import your customer project repository/folder
   - Name it: `eventwizz-customer` or `eventwizz-customer-site`

2. **Set Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Add all environment variables (same as main project)
   - **Important:** Update `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` to customer domain

3. **Deploy:**
   - Vercel will auto-deploy
   - You'll get a new domain like: `eventwizz-customer-xyz.vercel.app`
   - Or you can use a custom domain if you have one

### Step 5: Configure Domain (Optional)

**If you want a cleaner domain:**
- In Vercel project settings → Domains
- Add a custom domain: `customer.eventwizz.com` (if you have it)
- Or use the auto-generated Vercel domain

## 🎬 Demo Flow for Investors

### Show Two Separate Projects:

1. **Vendor/Admin Site:**
   - URL: `https://eventwizz.vercel.app`
   - Show: Vendor dashboard, admin features
   - Explain: "This is where vendors manage their events"

2. **Customer Site:**
   - URL: `https://eventwizz-customer.vercel.app` (or your custom domain)
   - Show: Customer homepage, location pages, event browsing
   - Explain: "This is the customer-facing site where people browse and book events"

### Demo Script:

```
"EventWizz is a multi-tenant platform with two main interfaces:

1. Vendor Portal (eventwizz.vercel.app):
   - Vendors create and manage events
   - Admin dashboard for platform management
   - Analytics and reporting

2. Customer Site (eventwizz-customer.vercel.app):
   - Public-facing event discovery
   - Location-based event browsing
   - Customer account management
   - Ticket booking and checkout

Both sites connect to the same backend API but serve different user types.
This architecture allows us to:
- Scale each site independently
- Customize UX for each user type
- Maintain clean separation of concerns
- Deploy updates independently"
```

## 📁 Project Structure

```
eventwizz-v2/                    # Main project (Vendor/Admin)
├── src/
├── .env
└── ... (vendor/admin code)

eventwizz-customer/              # Customer project (separate)
├── src/
│   ├── middleware.ts           # Customer-specific middleware
│   └── ... (customer-facing code)
├── .env                        # Customer-specific env vars
└── ... (same codebase, different config)
```

## ⚙️ Configuration Differences

### Main Project (`eventwizz.vercel.app`):
```env
NEXT_PUBLIC_APP_URL=https://eventwizz.vercel.app
NEXT_PUBLIC_WHITE_LABEL_URL=eventwizz.vercel.app
NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING=false
```

### Customer Project (`eventwizz-customer.vercel.app`):
```env
NEXT_PUBLIC_APP_URL=https://eventwizz-customer.vercel.app
NEXT_PUBLIC_WHITE_LABEL_URL=eventwizz-customer.vercel.app
NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING=false
```

## 🔄 Keeping Projects in Sync

**Option 1: Shared Codebase (Recommended)**
- Keep both projects in same repository
- Use different branches or folders
- Share common code, different configs

**Option 2: Separate Repositories**
- Customer project is a fork of main project
- Sync important updates manually
- More independent but requires more maintenance

## 🎯 Quick Start Checklist

- [ ] Create copy of project for customer site
- [ ] Update environment variables for customer domain
- [ ] Modify middleware for customer-only routes
- [ ] Create new Vercel project
- [ ] Deploy customer project
- [ ] Test customer site on new domain
- [ ] Test location pages work
- [ ] Test customer login works
- [ ] Prepare demo script with both URLs

## ✅ Advantages of This Approach

1. **No Backend Changes** ✅
   - Backend validation stays as-is
   - Each project sends its own domain
   - Backend can identify tenant from domain

2. **Clean Architecture** ✅
   - Vendor site = One project
   - Customer site = Separate project
   - Clear separation of concerns

3. **Easy Demo** ✅
   - Two clear URLs to show
   - Both work independently
   - Professional presentation

4. **Production Ready** ✅
   - Can scale each independently
   - Different CDN configurations
   - Independent deployments

5. **Future Flexibility** ✅
   - Can add more projects (e.g., admin portal)
   - Each can have custom domain
   - Easy to maintain

## 🚀 Next Steps

1. **Now:** Create customer project copy
2. **Deploy:** Set up new Vercel project
3. **Test:** Verify both sites work
4. **Demo:** Show both URLs to investors
5. **Production:** Get custom domains for both

---

**This is a smart solution! It's clean, professional, and works immediately!** 🎉

