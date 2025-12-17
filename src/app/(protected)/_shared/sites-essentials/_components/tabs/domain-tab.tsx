"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Globe,
  Clock,
  AlertTriangle,
  InfoIcon,
  Upload,
  FileCheck,
  X,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { appConfig } from "@/config/app";
import { env } from "@/env";

export function DomainTab() {
  const [isEditing, setIsEditing] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [businessNumber, setBusinessNumber] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [businessVerifying, setBusinessVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<"domain" | "business">("domain");

  // Mock data - replace with actual data from your backend
  const initialDomain = `yourbusiness.${env.NEXT_PUBLIC_WHITE_LABEL_URL}`; // This would be the venue name from onboarding
  const domainData = {
    domain: initialDomain,
    canEdit: true, // This would be determined by checking if domain was already edited
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Mock: created 24 hours ago
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // Mock: expires in 48 hours (72h total)
    status: "pending_verification", // pending_verification, verified, or expired
    isDefault: true,
    businessVerified: false, // Track if business is verified
  };

  // Calculate time remaining (in hours)
  const hoursRemaining = Math.max(
    0,
    Math.floor((domainData.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60))
  );

  // Calculate progress percentage (hours passed out of 72)
  const hoursPassed = 72 - hoursRemaining;
  const progressPercentage = (hoursPassed / 72) * 100;

  const handleEdit = () => {
    setIsEditing(true);
    setCustomDomain(domainData.domain.split(".")[0]); // Pre-fill with current domain name
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setCustomDomain("");
  };

  const handleSaveDomain = () => {
    setVerifying(true);
    // Simulate API call to update domain
    setTimeout(() => {
      setVerifying(false);
      setIsEditing(false);
      // In a real implementation, you would update the domain in your backend
      alert("Domain updated successfully and sent for verification.");
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    // Reset file input by recreating it
    const fileInput = document.getElementById(
      "gst-document"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleVerifyBusiness = () => {
    if (!businessNumber || !uploadedFile) {
      alert("Please provide both GST number and document");
      return;
    }

    setBusinessVerifying(true);
    // Simulate verification process
    setTimeout(() => {
      setBusinessVerifying(false);
      // In a real implementation, you would update the business verification status in your backend
      alert(
        "Business verification submitted successfully. We'll review your documents and update your status."
      );
    }, 1500);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as "domain" | "business");
  };

  return (
    <div className="space-y-6 w-full max-w-full px-2 sm:px-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Domain Settings</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Your domain was automatically created during onboarding based on your
          venue name.
        </p>

        {/* Time remaining alert */}
        {domainData.canEdit && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
              <div className="flex-1">
                <AlertTitle className="text-yellow-800">
                  Domain Verification Required
                </AlertTitle>
                <AlertDescription className="text-yellow-700">
                  You have{" "}
                  <span className="font-bold">{hoursRemaining} hours</span>{" "}
                  remaining to verify or update your domain. After this period,
                  your account access will be restricted until domain
                  verification is complete.
                </AlertDescription>
              </div>
            </div>
            <div className="mt-2">
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between text-xs mt-1">
                <span>Created</span>
                <span>{hoursRemaining} hours remaining</span>
              </div>
            </div>
          </Alert>
        )}

        {!domainData.canEdit && (
          <Alert className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <InfoIcon className="h-4 w-4 shrink-0" />
              <div className="flex-1">
                <AlertTitle>Domain Already Updated</AlertTitle>
                <AlertDescription>
                  You have already updated your domain name. If you need to make
                  changes, please contact support.
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}
      </div>

      <div className="flex w-full mb-4">
        <button
          onClick={() => handleTabChange("domain")}
          className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 text-center font-medium text-sm sm:text-base ${
            activeTab === "domain"
              ? "bg-red-600 text-white rounded-l-md"
              : "bg-gray-100 text-gray-700 rounded-l-md"
          }`}
        >
          Domain Settings
        </button>
        <button
          onClick={() => handleTabChange("business")}
          className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 text-center font-medium text-sm sm:text-base ${
            activeTab === "business"
              ? "bg-red-600 text-white rounded-r-md"
              : "bg-gray-100 text-gray-700 rounded-r-md"
          }`}
        >
          Business Verification
        </button>
      </div>

      {activeTab === "domain" && (
        /* Domain Management Section */
        <Card className="w-full overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-md">Your Domain</CardTitle>
            <CardDescription>
              This is your {appConfig.name} domain that visitors will use to
              access your site
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {!isEditing ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 p-3 sm:p-4 bg-muted rounded-md">
                  <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-base sm:text-lg break-all">
                    {domainData.domain}
                  </span>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="ml-auto">
                          {domainData.status === "pending_verification" && (
                            <Badge
                              variant="outline"
                              className="bg-yellow-100 text-yellow-800 whitespace-nowrap"
                            >
                              <Clock className="h-3 w-3 mr-1" /> Pending
                              Verification
                            </Badge>
                          )}
                          {domainData.status === "verified" && (
                            <Badge
                              variant="outline"
                              className="bg-green-100 text-green-800 whitespace-nowrap"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" /> Verified
                            </Badge>
                          )}
                          {domainData.status === "expired" && (
                            <Badge
                              variant="outline"
                              className="bg-red-100 text-red-800 whitespace-nowrap"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />{" "}
                              Verification Expired
                            </Badge>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {domainData.status === "pending_verification"
                          ? "Your domain is pending verification"
                          : domainData.status === "verified"
                          ? "Your domain is verified and active"
                          : "Your domain verification period has expired"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {domainData.canEdit && (
                  <div className="flex justify-end">
                    <Button
                      variant="event-outline"
                      onClick={handleEdit}
                      className="w-full sm:w-auto"
                    >
                      Update Domain
                    </Button>
                  </div>
                )}

                {/* Domain Information */}
                <div className="text-sm space-y-2 pt-2 border-t">
                  <div className="flex flex-wrap justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{domainData.createdAt.toLocaleDateString()}</span>
                  </div>
                  {domainData.canEdit && (
                    <div className="flex flex-wrap justify-between">
                      <span className="text-muted-foreground">
                        Edit expires:
                      </span>
                      <span>
                        {domainData.expiresAt.toLocaleDateString()} (
                        {hoursRemaining} hours)
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="capitalize">
                      {domainData.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between">
                    <span className="text-muted-foreground">
                      Business Verification:
                    </span>
                    <span
                      className={
                        domainData.businessVerified
                          ? "text-green-600"
                          : "text-yellow-600"
                      }
                    >
                      {domainData.businessVerified ? "Verified" : "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="domain-name">Update domain name</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    You can only update your domain name once. Choose carefully
                    as this cannot be changed later.
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center mt-2">
                    <Input
                      id="domain-name"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="rounded-r-none sm:flex-1"
                      placeholder="yourbusiness"
                    />
                    <div className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-muted-foreground text-center">
                      .{env.NEXT_PUBLIC_WHITE_LABEL_URL}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Only lowercase letters, numbers, and hyphens are allowed. No
                    spaces.
                  </p>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="event-outline"
                    onClick={handleSaveDomain}
                    disabled={
                      !customDomain ||
                      customDomain === domainData.domain.split(".")[0] ||
                      verifying
                    }
                    className="flex-1 sm:flex-none"
                  >
                    {verifying ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save & Verify"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>

          {/* Verification Details - Show when domain is pending verification */}
          {domainData.status === "pending_verification" && (
            <CardFooter className="border-t flex-col items-start p-4 sm:p-6 pt-4 sm:pt-6">
              <h4 className="font-medium mb-2">Verification Process</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Your domain is currently being verified. This process typically
                takes 24-48 hours. You will receive an email once verification
                is complete.
              </p>

              <Alert>
                <AlertTitle className="flex items-center">
                  <InfoIcon className="h-4 w-4 mr-2 shrink-0" /> Important
                  Information
                </AlertTitle>
                <AlertDescription className="text-sm mt-2">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      You can only edit your domain name once within 72 hours of
                      account creation
                    </li>
                    <li>After 72 hours, your domain name will be locked</li>
                    <li>
                      If you don&apos;t verify your domain within 72 hours, your
                      account access may be restricted
                    </li>
                    <li>For any issues, please contact our support team</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardFooter>
          )}
        </Card>
      )}

      {activeTab === "business" && (
        /* Business Verification Section */
        <Card className="w-full overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-md">Business Verification</CardTitle>
            <CardDescription>
              Verify your business to activate your domain and unlock all
              features
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="space-y-6">
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <div className="flex-1">
                    <AlertTitle className="text-red-800">
                      Verification Required
                    </AlertTitle>
                    <AlertDescription className="text-red-700">
                      Your business must be verified to activate your domain and
                      continue using {appConfig.name}. Please provide the
                      required information below.
                    </AlertDescription>
                  </div>
                </div>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="business-number"
                    className="text-base font-medium"
                  >
                    GST Number
                  </Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Enter your valid GST identification number
                  </p>
                  <Input
                    id="business-number"
                    placeholder="e.g. 29ABCDE1234F1Z5"
                    value={businessNumber}
                    onChange={(e) => setBusinessNumber(e.target.value)}
                    className="w-full sm:max-w-md"
                  />
                </div>

                <Separator />

                <div>
                  <Label
                    htmlFor="gst-document"
                    className="text-base font-medium"
                  >
                    GST Certificate
                  </Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload a scanned copy or clear photo of your GST certificate
                  </p>

                  {!uploadedFile ? (
                    <div className="border-2 border-dashed rounded-md p-4 sm:p-6 w-full sm:max-w-md">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm font-medium text-center">
                          Drag and drop or click to upload
                        </p>
                        <p className="text-xs text-muted-foreground text-center">
                          PDF, JPG or PNG (Max 5MB)
                        </p>
                        <Input
                          id="gst-document"
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                        />
                        <Button
                          variant="outline"
                          onClick={() =>
                            document.getElementById("gst-document")?.click()
                          }
                          className="mt-2 w-full sm:w-auto"
                        >
                          Select File
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-md p-4 flex items-center justify-between w-full sm:max-w-md">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileCheck className="h-5 w-5 text-green-600 shrink-0" />
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium truncate">
                            {uploadedFile.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="text-base font-medium mb-2">
                    Additional Information
                  </h4>
                  <div className="bg-muted p-4 rounded-md">
                    <div className="flex flex-col sm:flex-row items-start gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium">Why do we need this?</p>
                        <p className="text-muted-foreground mt-1">
                          We require business verification to ensure all vendors
                          on our platform are legitimate businesses. This helps
                          us maintain a trusted marketplace and comply with
                          regulations.
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                          <li>
                            Your information is securely stored and protected
                          </li>
                          <li>
                            Verification typically takes 1-2 business days
                          </li>
                          <li>
                            You can continue setting up your account during
                            verification
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t p-4 sm:p-6 pt-4 sm:pt-6">
            <Button
              variant="event-outline"
              onClick={handleVerifyBusiness}
              disabled={!businessNumber || !uploadedFile || businessVerifying}
              className="w-full sm:w-auto"
            >
              {businessVerifying ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit for Verification"
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
