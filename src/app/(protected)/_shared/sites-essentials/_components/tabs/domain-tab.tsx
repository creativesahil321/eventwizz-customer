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
import {
  Clock,
  AlertTriangle,
  Upload,
  FileCheck,
  X,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { appConfig } from "@/config/app";

export function DomainTab() {
  const [businessNumber, setBusinessNumber] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [businessVerifying, setBusinessVerifying] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    const fileInput = document.getElementById(
      "business-document",
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleVerifyBusiness = () => {
    if (!businessNumber || !uploadedFile) {
      alert("Please provide both VAT number and business document");
      return;
    }

    setBusinessVerifying(true);
    setTimeout(() => {
      setBusinessVerifying(false);
      alert(
        "Business verification submitted successfully. We'll review your documents and update your status.",
      );
    }, 1500);
  };

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-md">Business Verification</CardTitle>
        <CardDescription>
          Verify your business to unlock all platform features
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
                  Your business must be verified to continue using{" "}
                  {appConfig.name}. Please provide the required information
                  below.
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
                VAT Number
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Enter your valid VAT registration number (e.g. GB or EU format)
              </p>
              <Input
                id="business-number"
                placeholder="e.g. GB123456789 or 22AABBCC1234K1Z2"
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                className="w-full"
              />
            </div>

            <Separator />

            <div>
              <Label
                htmlFor="business-document"
                className="text-base font-medium"
              >
                Business document
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Upload a scanned copy or clear photo of your VAT certificate or
                business registration document
              </p>

              {!uploadedFile ? (
                <div className="border-2 border-dashed rounded-md p-4 sm:p-6 w-full">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-center">
                      Drag and drop or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                      PDF, JPG or PNG (Max 5MB)
                    </p>
                    <Input
                      id="business-document"
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        document.getElementById("business-document")?.click()
                      }
                      className="mt-2 w-full sm:w-auto"
                    >
                      Select File
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border rounded-md p-4 flex items-center justify-between w-full">
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
                Additional information
              </h4>
              <div className="bg-muted p-4 rounded-md">
                <div className="flex flex-col sm:flex-row items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Why do we need this?</p>
                    <p className="text-muted-foreground mt-1">
                      We require business verification to ensure all vendors on
                      our platform are legitimate businesses. This helps us
                      maintain a trusted marketplace and comply with
                      regulations. The same VAT and document information is
                      visible to admin for venue management.
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                      <li>
                        Your information is securely stored and protected
                      </li>
                      <li>Verification typically takes 1-2 business days</li>
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
  );
}
