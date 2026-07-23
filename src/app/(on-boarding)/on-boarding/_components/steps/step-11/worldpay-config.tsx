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

interface WorldPayConfigProps {
  form: UseFormReturn<StepElevenType>;
  onVerify?: () => Promise<boolean>;
  className?: string;
}

export function WorldPayConfig({
  form,
  onVerify,
  className,
}: WorldPayConfigProps) {
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
      <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100">
          <Shield className="w-5 h-5 text-orange-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-orange-900 text-base">
            WorldPay Configuration
          </h3>
          <p className="text-sm text-orange-700">
            Advanced setup for existing WorldPay merchants
          </p>
        </div>
      </div>

      {/* Security Warning */}
      <Alert className="border-orange-300 bg-orange-50/50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-900 text-sm">
          <strong>Important Security Information:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
            <li>You need your own WorldPay merchant account</li>
            <li>API keys will be encrypted and stored securely</li>
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
            form.watch("payment_providers.worldpay_is_live") ? "live" : "test"
          }
          onValueChange={(value) =>
            form.setValue(
              "payment_providers.worldpay_is_live",
              value === "live",
            )
          }
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="test"
              id="worldpay-test"
              className="text-[var(--color-secondary,#009ead)] border-[var(--color-secondary,#009ead)]"
            />
            <Label
              htmlFor="worldpay-test"
              className="text-sm font-normal cursor-pointer"
            >
              Test/Sandbox
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value="live"
              id="worldpay-live"
              className="text-[var(--color-secondary,#009ead)] border-[var(--color-secondary,#009ead)]"
            />
            <Label
              htmlFor="worldpay-live"
              className="text-sm font-normal cursor-pointer"
            >
              Live/Production
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Client Key */}
        <div className="space-y-2">
          <Label htmlFor="worldpay-client-key" className="text-sm font-medium">
            Client Key <span className="text-red-500">*</span>
          </Label>
          <Input
            id="worldpay-client-key"
            {...form.register("payment_providers.worldpay_client_key")}
            placeholder="Enter your WorldPay client key"
            className="h-12 bg-white/5 border-white/10"
          />
          {form.formState.errors.payment_providers?.worldpay_client_key && (
            <p className="text-xs text-red-500">
              {
                form.formState.errors.payment_providers.worldpay_client_key
                  .message
              }
            </p>
          )}
        </div>

        {/* Service Key */}
        <div className="space-y-2">
          <Label htmlFor="worldpay-service-key" className="text-sm font-medium">
            Service Key <span className="text-red-500">*</span>
          </Label>
          <PasswordInput
            id="worldpay-service-key"
            {...form.register("payment_providers.worldpay_service_key")}
            placeholder="Enter your WorldPay service key"
            ariaPasswordField="WorldPay service key"
            className="h-12 bg-white/5 border-white/10 pr-12"
          />
          {form.formState.errors.payment_providers?.worldpay_service_key && (
            <p className="text-xs text-red-500">
              {
                form.formState.errors.payment_providers.worldpay_service_key
                  .message
              }
            </p>
          )}
        </div>

        {/* Merchant Code */}
        <div className="space-y-2">
          <Label
            htmlFor="worldpay-merchant-code"
            className="text-sm font-medium"
          >
            Merchant Code
            <span className="text-gray-500 font-normal ml-1">(Optional)</span>
          </Label>
          <Input
            id="worldpay-merchant-code"
            {...form.register("payment_providers.worldpay_merchant_code")}
            placeholder="Enter your WorldPay merchant code"
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
            WorldPay credentials validated successfully!
          </span>
        )}
      </div>
    </div>
  );
}
