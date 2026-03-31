# Impersonation System — Backend Implementation Guide

## Overview

This document defines the backend requirements for the admin-to-vendor impersonation system. The frontend implementation is complete and expects these exact API contracts.

**Scope:** Single-level impersonation only. Admin → Vendor. No nested impersonation. No cross-domain redirects.

---

## API Endpoints

### 1. Start Impersonation

```
POST /api/admin/impersonate/vendor
```

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
X-Domain: <current_domain>
```

**Request Body:**
```json
{
  "vendor_id": 72
}
```

**Validations (in order):**
1. Authenticated user must have `account_type = "admin"`
2. Admin must have permission: `impersonate-vendor` (or equivalent, e.g. `admin.impersonate.vendor`)
3. `vendor_id` must exist and belong to the same tenant
4. Admin must NOT already be in an active impersonation session (prevent nesting)

**Success Response (200):**
```json
{
  "status": true,
  "message": "Impersonation started successfully.",
  "data": {
    "token": "<impersonation_jwt_token>",
    "user": {
      "uuid": "vendor-uuid-here",
      "email": "vendor@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "avatar": "https://example.com/avatar.jpg",
      "status": "active"
    },
    "account_type": "vendor",
    "active_role": "vendor",
    "isOnboarded": true,
    "on_boarding_step": 5,
    "vendor_location_id": 14,
    "permissions": ["vendor.dashboard", "vendor.events.manage", "..."],
    "has_payment_provider": true,
    "vendor_id": 72,
    "vendor_name": "Efes Premium"
  },
  "errors": []
}
```

**Error Response (403):**
```json
{
  "status": false,
  "message": "You do not have permission to impersonate vendors.",
  "errors": ["Insufficient permissions"]
}
```

---

## Where the impersonation permission comes from

The frontend shows the **"Login as Vendor"** button only when the admin has the permission `impersonate-vendor`. The backend must both **enforce** this permission on `POST /admin/impersonate/vendor` and **expose** it (in the login/permissions response) so the frontend can hide the button for admins who don’t have it.

### 1. Backend: enforce the permission

In your impersonation controller (or middleware), check that the authenticated admin has the permission before creating an impersonation token, e.g.:

- Laravel: `$admin->hasPermission('impersonate-vendor')` or your role/permission package’s equivalent. (This project uses kebab-case permission keys, e.g. `impersonate-vendor`.)
- The exact permission **string** must match what you return in the user’s permissions (see below). The frontend constant `IMPERSONATE_VENDOR_PERMISSION` in `manage-venue-details.tsx` is set to `impersonate-vendor` to match the backend.

### 2. Backend: include the permission in the admin’s permissions

The frontend gets the current user’s permissions from your API and stores them in the permission store. That list is used to decide whether to show "Login as Vendor".

- **Login response:** When an admin logs in, the `permissions` array in the login payload must include `impersonate-vendor` for admins who are allowed to impersonate (e.g. super admin or a role that has this permission).
- **Permissions endpoint:** If you use a separate endpoint (e.g. `GET /auth/user/permissions`) to load permissions after login, that response must also include `impersonate-vendor` for allowed admins.

So: **define** the permission in your roles/permissions system, **assign** it to the appropriate admin role(s), and **return** it in both (a) the login response and (b) the permissions endpoint response when the user is an admin with that permission. Then the frontend will show the button only to those admins, and the backend will reject anyone else with 403.

### 3. Frontend: how it’s used

- Permissions are loaded from the API (login and/or `GET /auth/user/permissions`) and stored in the permission store.
- `ManageVenueDetails` uses `usePermission('impersonate-vendor')` and only renders the "Login as Vendor" button when that permission is present.
- If your backend uses a different permission key, change the constant `IMPERSONATE_VENDOR_PERMISSION` in `src/app/(protected)/admin/vendors/[id]/_components/manage-venue-details.tsx` to match.

---

### 2. Exit Impersonation

```
POST /api/admin/impersonate/exit
```

**Headers:**
```
Authorization: Bearer <impersonation_token>
Content-Type: application/json
```

**Request Body:** Empty `{}`

**Validations:**
1. Token must be a valid impersonation token (check `is_impersonation` claim)
2. Log the exit event

**Success Response (200):**
```json
{
  "status": true,
  "message": "Impersonation session ended.",
  "data": null,
  "errors": []
}
```

---

## Impersonation Token Design

The impersonation token is a standard JWT with additional claims to distinguish it from regular tokens.

### Required JWT Claims

```json
{
  "sub": "<vendor_user_id>",
  "email": "vendor@example.com",
  "account_type": "vendor",
  "active_role": "vendor",
  "is_impersonation": true,
  "impersonator_id": "<admin_user_id>",
  "impersonator_account_type": "admin",
  "vendor_id": 72,
  "vendor_location_id": 14,
  "iat": 1710000000,
  "exp": 1710003600
}
```

### Token Rules

| Property | Value | Rationale |
|----------|-------|-----------|
| Expiry | **1 hour** | Short-lived to limit exposure. Frontend auto-restores admin on 401. |
| Scope | Full vendor permissions | Admin sees exactly what the vendor sees. |
| `is_impersonation` | `true` | Backend can identify impersonation requests for audit logging. |
| `impersonator_id` | Admin's user ID | Links actions back to the admin for accountability. |

---

## Database Schema

### `impersonation_logs` Table

```sql
CREATE TABLE impersonation_logs (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id        BIGINT UNSIGNED NOT NULL,
    vendor_id       BIGINT UNSIGNED NOT NULL,
    started_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at        TIMESTAMP NULL,
    ip_address      VARCHAR(45) NOT NULL,
    user_agent      VARCHAR(500) NULL,
    status          ENUM('active', 'ended', 'expired') DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_admin_id (admin_id),
    INDEX idx_vendor_id (vendor_id),
    INDEX idx_status (status),
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Laravel Migration

```php
Schema::create('impersonation_logs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
    $table->foreignId('vendor_id')->constrained('users')->cascadeOnDelete();
    $table->timestamp('started_at')->useCurrent();
    $table->timestamp('ended_at')->nullable();
    $table->string('ip_address', 45);
    $table->string('user_agent', 500)->nullable();
    $table->enum('status', ['active', 'ended', 'expired'])->default('active');
    $table->timestamps();

    $table->index('admin_id');
    $table->index('vendor_id');
    $table->index('status');
});
```

---

## Laravel Implementation

### Controller

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ImpersonationLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Tymon\JWTAuth\Facades\JWTAuth;

class ImpersonationController extends Controller
{
    /**
     * Start impersonating a vendor.
     */
    public function start(Request $request)
    {
        $request->validate([
            'vendor_id' => 'required|integer|exists:users,id',
        ]);

        $admin = Auth::user();

        // 1. Verify admin role
        if ($admin->account_type !== 'admin') {
            return response()->json([
                'status' => false,
                'message' => 'Only admin users can impersonate vendors.',
                'errors' => ['Unauthorized role'],
            ], 403);
        }

        // 2. Check permission
        if (!$admin->hasPermission('impersonate-vendor')) {
            return response()->json([
                'status' => false,
                'message' => 'You do not have permission to impersonate vendors.',
                'errors' => ['Insufficient permissions'],
            ], 403);
        }

        // 3. Check for active impersonation (prevent nesting)
        $activeSession = ImpersonationLog::where('admin_id', $admin->id)
            ->where('status', 'active')
            ->first();

        if ($activeSession) {
            return response()->json([
                'status' => false,
                'message' => 'You already have an active impersonation session. Exit it first.',
                'errors' => ['Active session exists'],
            ], 409);
        }

        // 4. Load vendor
        $vendor = User::where('id', $request->vendor_id)
            ->where('account_type', 'vendor')
            ->firstOrFail();

        // 5. Generate impersonation token with custom claims
        $customClaims = [
            'is_impersonation' => true,
            'impersonator_id' => $admin->id,
            'impersonator_account_type' => 'admin',
            'account_type' => 'vendor',
            'active_role' => 'vendor',
        ];

        $token = JWTAuth::customClaims($customClaims)
            ->fromUser($vendor);

        // 6. Log the impersonation event
        ImpersonationLog::create([
            'admin_id' => $admin->id,
            'vendor_id' => $vendor->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'status' => 'active',
        ]);

        // 7. Build vendor session data (same shape as login response)
        $vendorData = $this->buildVendorSessionData($vendor, $token);

        return response()->json([
            'status' => true,
            'message' => 'Impersonation started successfully.',
            'data' => $vendorData,
            'errors' => [],
        ]);
    }

    /**
     * Exit impersonation session.
     */
    public function exit(Request $request)
    {
        $token = JWTAuth::parseToken();
        $claims = $token->getPayload();

        // Verify this is an impersonation token
        if (!$claims->get('is_impersonation')) {
            return response()->json([
                'status' => false,
                'message' => 'No active impersonation session.',
                'errors' => ['Not an impersonation token'],
            ], 400);
        }

        $adminId = $claims->get('impersonator_id');

        // Update the impersonation log
        ImpersonationLog::where('admin_id', $adminId)
            ->where('status', 'active')
            ->update([
                'status' => 'ended',
                'ended_at' => now(),
            ]);

        // Invalidate the impersonation token
        JWTAuth::invalidate();

        return response()->json([
            'status' => true,
            'message' => 'Impersonation session ended.',
            'data' => null,
            'errors' => [],
        ]);
    }

    /**
     * Build vendor session data matching the login response shape.
     */
    private function buildVendorSessionData(User $vendor, string $token): array
    {
        $venue = $vendor->venue; // Assuming vendor hasOne venue
        $defaultLocation = $vendor->venueLocations()->where('is_default', true)->first()
            ?? $vendor->venueLocations()->first();

        return [
            'token' => $token,
            'user' => [
                'uuid' => $vendor->uuid,
                'email' => $vendor->email,
                'first_name' => $vendor->first_name,
                'last_name' => $vendor->last_name,
                'avatar' => $vendor->avatar,
                'status' => $vendor->status,
            ],
            'account_type' => 'vendor',
            'active_role' => 'vendor',
            'isOnboarded' => (bool) $vendor->is_onboarded,
            'on_boarding_step' => $vendor->on_boarding_step,
            'vendor_location_id' => $defaultLocation?->id,
            'permissions' => $vendor->getAllPermissions()->pluck('name')->toArray(),
            'has_payment_provider' => (bool) $vendor->has_payment_provider,
            'vendor_id' => $vendor->id,
            'vendor_name' => $venue?->venue_name ?? $vendor->first_name . ' ' . $vendor->last_name,
        ];
    }
}
```

### Routes

```php
// routes/api.php
Route::middleware(['auth:api', 'role:admin'])->prefix('admin')->group(function () {
    Route::post('/impersonate/vendor', [ImpersonationController::class, 'start']);
    Route::post('/impersonate/exit', [ImpersonationController::class, 'exit']);
});
```

### Middleware for Audit Logging (Optional)

To automatically log all actions during impersonation:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;

class ImpersonationAuditMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        try {
            $payload = JWTAuth::parseToken()->getPayload();

            if ($payload->get('is_impersonation')) {
                // Attach impersonation context to the request
                $request->merge([
                    '_impersonator_id' => $payload->get('impersonator_id'),
                    '_is_impersonation' => true,
                ]);

                // Log to activity_log or audit table
                activity()
                    ->causedBy($payload->get('impersonator_id'))
                    ->withProperties([
                        'impersonated_user_id' => auth()->id(),
                        'action' => $request->method() . ' ' . $request->path(),
                        'ip_address' => $request->ip(),
                    ])
                    ->log('impersonation_action');
            }
        } catch (\Exception $e) {
            // Token parsing failed — not an impersonation request
        }

        return $next($request);
    }
}
```

---

## Security Checklist

| # | Requirement | Implementation |
|---|------------|----------------|
| 1 | Only admin can impersonate | Check `account_type === 'admin'` + permission |
| 2 | No nested impersonation | Check `impersonation_logs` for active session |
| 3 | Short-lived token | 1-hour JWT expiry (frontend auto-restores admin on 401) |
| 4 | Audit trail | `impersonation_logs` table + optional middleware |
| 5 | Token distinguishable | `is_impersonation` claim in JWT |
| 6 | Exit invalidates token | `JWTAuth::invalidate()` on exit |
| 7 | Frontend header | `X-Impersonating: true` sent on every request |
| 8 | Session-scoped | Frontend uses sessionStorage (tab close = auto-exit) |

---

## Frontend ↔ Backend Contract Summary

### Request Headers (sent by frontend during impersonation)

```
Authorization: Bearer <impersonation_token>
X-Domain: <current_domain>
X-Venue-Location-Id: <vendor_location_id>
X-Impersonating: true
```

### Frontend Storage Layout

| Storage | Key | Content | Cleared |
|---------|-----|---------|---------|
| sessionStorage | `impersonation-session` | Admin backup + vendor info (~1.5KB) | Tab close or exit |
| localStorage | `auth-storage` | Swapped to vendor data during impersonation | On exit (restored to admin) |
| localStorage | `permission-storage` | Swapped to vendor permissions | On exit (restored to admin) |
| Cookie | `next-auth.session-token` | Vendor JWT during impersonation | On exit (restored to admin) |

### What the Frontend Does NOT Store

- No vendor password (admin doesn't need it)
- No duplicate admin data in localStorage (only in sessionStorage)
- No large data blobs (permissions are string arrays, ~500 bytes)

---

## Cron Job: Expire Stale Sessions

Run every 15 minutes to clean up abandoned impersonation sessions:

```php
// app/Console/Commands/ExpireImpersonationSessions.php

$expiredCount = ImpersonationLog::where('status', 'active')
    ->where('started_at', '<', now()->subHours(2))
    ->update([
        'status' => 'expired',
        'ended_at' => now(),
    ]);
```

---

## Testing Checklist

- [ ] Admin can start impersonation → receives vendor token
- [ ] Non-admin user gets 403
- [ ] Admin without permission gets 403
- [ ] Nested impersonation is blocked (409)
- [ ] Impersonation token has `is_impersonation` claim
- [ ] Exit invalidates token and logs end time
- [ ] All vendor endpoints work with impersonation token
- [ ] `X-Impersonating` header is present in requests
- [ ] Stale sessions are expired by cron job
