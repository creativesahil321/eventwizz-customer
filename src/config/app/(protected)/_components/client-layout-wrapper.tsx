"use client";

import React from "react";
import { LocationInitializer } from "../_components/location-initializer";
import { LocationInitializerProvider } from "@/providers/location-initializer-provider";
import { LocationGuard } from "@/providers/location-guard";
import { ImpersonationBanner } from "@/components/impersonation/ImpersonationBanner";
import { GlobalProfileBootstrap } from "./global-profile-bootstrap";

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
}

export default function ClientLayoutWrapper({
  children,
}: ClientLayoutWrapperProps) {
  return (
    <LocationInitializerProvider>
      <LocationInitializer />
      <GlobalProfileBootstrap />
      <ImpersonationBanner />
      <LocationGuard>{children}</LocationGuard>
    </LocationInitializerProvider>
  );
}
