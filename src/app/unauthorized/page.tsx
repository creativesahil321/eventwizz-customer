"use client";

import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

  const goBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-[var(--color-background,#f3f4f6)] flex items-center justify-center p-4">
      <Shell variant="centered" className="w-full max-w-md">
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-8 w-full">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <AlertTriangle className="h-8 w-8" />
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-4 text-center text-gray-900">
            Access Denied
          </h1>

          <p className="text-muted-foreground mb-6 text-center text-gray-900 font-medium">
            You don&apos;t have permission to access this page or resource. If
            you believe this is an error, please contact your administrator.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="event-outline"
              onClick={goBack}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>

            <Button
              variant="event-primary"
              onClick={() => router.push("/vendor/dashboard")}
              className="w-full sm:w-auto"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </Shell>
    </div>
  );
}
