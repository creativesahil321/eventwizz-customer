"use client";

import type { RefObject } from "react";
import CommonHeader from "@/components/shared/common-header";
import type { HeaderDownloadLink } from "@/lib/event-header-downloads";
import { PreviewRoomFloatingSelector } from "../rooms/preview-room-floating-selector";

type OnboardingPreviewHeaderProps = {
  scrollContainerRef: RefObject<HTMLElement | null>;
  contact_number?: string;
  logo?: string | File | null;
  headerDownloads?: HeaderDownloadLink[];
  showRoomSelector?: boolean;
  roomSelectorVisible?: boolean;
  onRoomChange?: (index: number) => void;
  roomSelectorStickyTop?: string;
};

/**
 * Shared preview chrome: live-matching overlay header + optional multi-room pill bar.
 * Keeps scrollContainerRef wiring in one place (DRY for step 2 + event steps).
 */
export function OnboardingPreviewHeader({
  scrollContainerRef,
  contact_number,
  logo,
  headerDownloads,
  showRoomSelector = false,
  roomSelectorVisible = false,
  onRoomChange,
  roomSelectorStickyTop,
}: OnboardingPreviewHeaderProps) {
  return (
    <>
      <CommonHeader
        contact_number={contact_number}
        logo={logo}
        variant="preview"
        previewBackButtonOffset={false}
        scrollContainerRef={scrollContainerRef}
        headerDownloads={headerDownloads}
        overlayHero
      />
      {showRoomSelector ? (
        <PreviewRoomFloatingSelector
          visible={roomSelectorVisible}
          onRoomChange={onRoomChange}
          stickyTop={roomSelectorStickyTop}
        />
      ) : null}
    </>
  );
}
