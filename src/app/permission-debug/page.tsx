"use client";

import { Shell } from "@/components/shell";
import { PermissionMenuDebug } from "@/components/permission/PermissionMenuDebug";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export default function PermissionDebugPage() {
  // Diagnostic page — hidden in production.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <section className="page bg-[var(--color-background,#f3f4f6)]">
      <Shell>
        <div className="mb-6">
          <Link href="/vendor/dashboard">
            <Button variant="ghost" className="mb-4 pl-0">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <h1 className="text-2xl font-bold mb-4">Permission Debug Tool</h1>
          <p className="text-muted-foreground mb-6">
            This tool helps diagnose permission issues with menu items. It shows
            which menu items are visible based on your current permissions.
          </p>
        </div>

        <div className="grid gap-8">
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Menu Items with Permission Issues
            </h2>
            <PermissionMenuDebug />
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">
              All Menu Items (Including Working Ones)
            </h2>
            <PermissionMenuDebug showFull={true} />
          </div>
        </div>
      </Shell>
    </section>
  );
}
