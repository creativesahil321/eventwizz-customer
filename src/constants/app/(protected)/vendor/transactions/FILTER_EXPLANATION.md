# How the Transaction History Filters Work

## 🔍 Current Implementation: **CLIENT-SIDE FILTERING**

### Flow Diagram:

```
┌─────────────────────────────────────────────────────────────┐
│  User Types in Filter (page.tsx)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ useState("") → setGlobalFilterValue("SB123")         │  │
│  │ useState("all") → setStatusFilter("paid")            │  │
│  │ useState("") → setBookingDate("2025-10-12")         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  searchParams Object Built (page.tsx)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ {                                                    │  │
│  │   search: "SB123",                                   │  │
│  │   status: "paid",                                    │  │
│  │   from: "2025-10-12",                                 │  │
│  │   page: "1",                                         │  │
│  │   per_page: "30"                                     │  │
│  │ }                                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Passed to TransactionsDataTable Component                  │
│  <TransactionsDataTable search={searchParams} />            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  useEffect Watches search prop (transactions-data-table.tsx)│
│  ┌──────────────────────────────────────────────────────┐  │
│  │ useEffect(() => {                                     │  │
│  │   loadTransactions(); // Runs when search changes    │  │
│  │ }, [search]);                                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  fetchTransactions() Called (queries.ts)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Gets ALL mockTransactions array (8 items)         │  │
│  │ 2. Filters array in JavaScript:                      │  │
│  │    - Search: booking_number.includes("SB123")       │  │
│  │    - Status: status === "paid"                       │  │
│  │    - Date: booking_date >= "2025-10-12"            │  │
│  │ 3. Returns filtered array (maybe 2-3 items)        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Table Updates with Filtered Results                        │
│  (All happens in browser, no server request)               │
└─────────────────────────────────────────────────────────────┘
```

### Key Points:

1. **All filtering happens in the browser** (client-side)
2. **No API calls** - just filtering a JavaScript array
3. **Instant updates** - no network delay
4. **All data loaded upfront** - the full mockTransactions array is always in memory

### Code Flow:

```typescript
// 1. User changes filter
<Input onChange={(e) => setGlobalFilterValue(e.target.value)} />

// 2. searchParams object updates automatically
const searchParams = {
  search: globalFilterValue,  // Updates when state changes
  status: statusFilter,
  from: bookingDate,
};

// 3. Passed to child component
<TransactionsDataTable search={searchParams} />

// 4. useEffect triggers when search changes
useEffect(() => {
  fetchTransactions(search);  // Filters mock data
}, [search]);

// 5. Filtering happens in queries.ts
export async function fetchTransactions(params) {
  let filteredData = [...mockTransactions];  // Start with ALL data
  
  // Filter in JavaScript
  if (params.search) {
    filteredData = filteredData.filter(t => 
      t.booking_number.includes(params.search)
    );
  }
  
  return { data: filteredData };
}
```

---

## 🚀 Server-Side Filtering (For Production)

### How it would work with a real API:

```
┌─────────────────────────────────────────────────────────────┐
│  User Changes Filter                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Updates URL: /transactions?search=SB123&status=paid │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Next.js Server Component Reads URL Params                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ export default async function Page({ searchParams }) {│  │
│  │   const data = await fetchTransactions(searchParams); │  │
│  │   return <Table data={data} />;                       │  │
│  │ }                                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  API Call to Laravel Backend                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ GET /api/vendor/transactions?                        │  │
│  │   search=SB123&status=paid&from=2025-10-12          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Laravel Filters in Database                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Transaction::where('booking_number', 'like', '%SB123%')│  │
│  │   ->where('status', 'paid')                           │  │
│  │   ->where('booking_date', '>=', '2025-10-12')        │  │
│  │   ->paginate(30);                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Only Filtered Results Returned (2-3 items, not all 1000+)  │
│  Sent back to Next.js → Rendered to user                   │
└─────────────────────────────────────────────────────────────┘
```

### Benefits of Server-Side:

✅ **Efficient** - Only fetches what you need  
✅ **Scalable** - Works with millions of records  
✅ **Fast queries** - Database indexes speed up filtering  
✅ **Less data transfer** - Only sends filtered results  
✅ **SEO friendly** - URL params are shareable/bookmarkable  

### Current Client-Side Benefits:

✅ **Instant** - No network delay  
✅ **Works offline** - All data in memory  
✅ **Simple** - No API setup needed  
✅ **Good for small datasets** - Perfect for mock data  

---

## 📊 Comparison

| Feature | Client-Side (Current) | Server-Side (Production) |
|---------|----------------------|-------------------------|
| **Where filtering happens** | Browser (JavaScript) | Database (SQL) |
| **Data loaded** | All at once | Only filtered results |
| **Network requests** | None (after initial load) | One per filter change |
| **Speed** | Instant (for small data) | Fast (with DB indexes) |
| **Scalability** | Limited (~1000 records) | Unlimited |
| **URL shareable** | ❌ No | ✅ Yes |
| **SEO friendly** | ❌ No | ✅ Yes |
| **Best for** | Mock data, prototypes | Production apps |

---

## 🔄 Converting to Server-Side (When Ready)

### Step 1: Update page.tsx to use URL params

```typescript
// Change from client component to server component
// Remove "use client"

import { searchParamsCache } from "./_lib/validations";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = searchParamsCache.parse(await searchParams);
  
  // Fetch on server
  const { data } = await fetchTransactions(parsed);
  
  return <TransactionsDataTable initialData={data} />;
}
```

### Step 2: Update queries.ts to call real API

```typescript
export async function fetchTransactions(params) {
  const response = await axios.get('/api/vendor/transactions', {
    params: {
      search: params.search,
      status: params.status,
      from: params.from,
      to: params.to,
      page: params.page,
      per_page: params.per_page,
    }
  });
  
  return response.data; // { data: [...], total: 100 }
}
```

### Step 3: Use URL state management

```typescript
// In page.tsx (client component)
import { useQueryStates } from 'nuqs';

export default function TransactionsPage() {
  const [filters, setFilters] = useQueryStates({
    search: parseAsString.withDefault(''),
    status: parseAsString.withDefault('all'),
    from: parseAsString.withDefault(''),
  });
  
  // Filters automatically sync with URL
  // Server component can read them
}
```

---

## 🎯 Summary

**Current Setup: CLIENT-SIDE**
- ✅ Perfect for development/mock data
- ✅ All filtering in browser
- ✅ No API needed
- ❌ Limited to small datasets

**Production Setup: SERVER-SIDE**
- ✅ Efficient database queries
- ✅ Scalable to millions of records
- ✅ URL shareable/bookmarkable
- ✅ Better SEO

The current implementation is **client-side** and works great for development. When you're ready to connect to your Laravel API, you can easily convert it to **server-side filtering** for better performance and scalability! 🚀

