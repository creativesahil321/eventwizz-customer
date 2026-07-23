"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { StepElevenType } from "../../form-provider/schema";
import { cn } from "@/lib/utils";

interface KlarnaConfigProps {
  form: UseFormReturn<StepElevenType>;
  onVerify?: () => Promise<boolean>;
  className?: string;
}

export function KlarnaConfig({
  form,
  onVerify,
  className,
}: KlarnaConfigProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const result = onVerify ? await onVerify() : true;
      setIsVerified(result);
    } catch {
      setIsVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-pink-50 rounded-lg border border-pink-200">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-pink-100">
          <Shield className="w-5 h-5 text-pink-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-pink-900 text-base">
            Klarna Configuration
          </h3>
          <p className="text-sm text-pink-700">
            Buy Now, Pay Later payment option
          </p>
        </div>
      </div>

      {/* Security Warning */}
      <Alert className="border-pink-300 bg-pink-50/50">
        <AlertTriangle className="h-4 w-4 text-pink-600" />
        <AlertDescription className="text-pink-900 text-sm">
          <strong>Important Security Information:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
            <li>You need your own Klarna merchant account</li>
            <li>Credentials will be encrypted and stored securely</li>
            <li>Manual payouts and commission tracking required</li>
            <li>You are responsible for PCI compliance</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Help Link */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="w-4 h-4" />
        <span>Need help? </span>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-sm text-[var(--color-secondary,#009ead)] hover:underline"
        >
          Watch Setup Video
        </Button>
        <span>or</span>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-sm text-[var(--color-secondary,#009ead)] hover:underline"
        >
          Read Guide
        </Button>
      </div>

      {/* Environment Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Environment</Label>
        <RadioGroup
          value={
            form.watch("payment_providers.klarna_is_live") ? "live" : "test"
          }
          onValueChange={(value) =>
            form.setValue("payment_providers.klarna_is_live", value === "live")
          }
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="test"
              id="klarna-test"
              className="text-[var(--color-secondary,#009ead)] border-[var(--color-secondary,#009ead)]"
            />
            <Label
              htmlFor="klarna-test"
              className="text-sm font-normal cursor-pointer"
            >
              Test/Playground
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="live"
              id="klarna-live"
              className="text-[var(--color-secondary,#009ead)] border-[var(--color-secondary,#009ead)]"
            />
            <Label
              htmlFor="klarna-live"
              className="text-sm font-normal cursor-pointer"
            >
              Live/Production
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* API Username */}
        <div className="space-y-2">
          <Label htmlFor="klarna-api-username" className="text-sm font-medium">
            API Username <span className="text-red-500">*</span>
          </Label>
          <Input
            id="klarna-api-username"
            {...form.register("payment_providers.klarna_api_username")}
            placeholder="Enter your Klarna API username"
            className="h-12 bg-white/5 border-white/10"
          />
          {form.formState.errors.payment_providers?.klarna_api_username && (
            <p className="text-xs text-red-500">
              {
                form.formState.errors.payment_providers.klarna_api_username
                  .message
              }
            </p>
          )}
        </div>

        {/* API Password */}
        <div className="space-y-2">
          <Label htmlFor="klarna-api-password" className="text-sm font-medium">
            API Password <span className="text-red-500">*</span>
          </Label>
          <PasswordInput
            id="klarna-api-password"
            {...form.register("payment_providers.klarna_api_password")}
            placeholder="Enter your Klarna API password"
            ariaPasswordField="Klarna API password"
            className="h-12 bg-white/5 border-white/10 pr-12"
          />
          {form.formState.errors.payment_providers?.klarna_api_password && (
            <p className="text-xs text-red-500">
              {
                form.formState.errors.payment_providers.klarna_api_password
                  .message
              }
            </p>
          )}
        </div>

        {/* Merchant ID */}
        <div className="space-y-2">
          <Label htmlFor="klarna-merchant-id" className="text-sm font-medium">
            Merchant ID
            <span className="text-gray-500 font-normal ml-1">(Optional)</span>
          </Label>
          <Input
            id="klarna-merchant-id"
            {...form.register("payment_providers.klarna_merchant_id")}
            placeholder="Enter your Klarna merchant ID"
            className="h-12 bg-white/5 border-white/10"
          />
        </div>
      </div>

      {/* Verify Button */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleVerify}
          disabled={isVerifying || isVerified}
          className="h-10"
        >
          {isVerifying ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Verifying...
            </>
          ) : isVerified ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
              Verified
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              Verify Connection
            </>
          )}
        </Button>
        {isVerified && (
          <span className="text-sm text-green-600 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Klarna credentials validated successfully!
          </span>
        )}
      </div>
    </div>
  );
}
