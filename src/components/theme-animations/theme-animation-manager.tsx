"use client";

import React from "react";
import { detectTheme } from "./theme-detector";
import { EventDetail } from "@/services/common/events/type";

// Import theme-specific animations
import {
  SnowfallAnimation,
  TwinklingLights,
  SantaClausAnimation,
  ChristmasDecorations,
} from "./christmas-animations";

import {
  WebSwingAnimation,
  SpiderSenseEffect,
  CityLightsEffect,
  SpiderManDecorations,
} from "./spiderman-animations";

interface ThemeAnimationManagerProps {
  eventData: EventDetail;
  enabled?: boolean;
  intensity?: "low" | "medium" | "high";
}

export function ThemeAnimationManager({
  eventData,
  enabled = true,
  intensity = "medium",
}: ThemeAnimationManagerProps) {
  // Detect theme from event data
  const detectedTheme = detectTheme(eventData);

  // Don't render if animations are disabled or no theme detected
  if (!enabled || detectedTheme === "none") {
    return null;
  }

  // Render theme-specific animations
  const renderThemeAnimations = () => {
    switch (detectedTheme) {
      case "christmas":
        return (
          <>
            <SnowfallAnimation enabled={true} intensity={intensity} />
            <TwinklingLights enabled={true} />
            <SantaClausAnimation enabled={true} />
            <ChristmasDecorations enabled={true} />
          </>
        );

      case "spiderman":
        return (
          <>
            <WebSwingAnimation enabled={true} intensity={intensity} />
            <SpiderSenseEffect enabled={true} />
            <CityLightsEffect enabled={true} />
            <SpiderManDecorations enabled={true} />
          </>
        );

      case "birthday":
        return (
          <>
            <ConfettiAnimation enabled={true} />
            <BalloonFloat enabled={true} />
            <BirthdayDecorations enabled={true} />
          </>
        );

      case "wedding":
        return (
          <>
            <FloatingHearts enabled={true} />
            <PetalFall enabled={true} />
            <WeddingDecorations enabled={true} />
          </>
        );

      case "halloween":
        return (
          <>
            <FogEffect enabled={true} />
            <SpookyFloat enabled={true} />
            <HalloweenDecorations enabled={true} />
          </>
        );

      case "winter":
        return (
          <>
            <SnowfallAnimation enabled={true} intensity={intensity} />
            <IceShimmer enabled={true} />
            <WinterDecorations enabled={true} />
          </>
        );

      case "summer":
        return (
          <>
            <WaveMotion enabled={true} />
            <SunShine enabled={true} />
            <SummerDecorations enabled={true} />
          </>
        );

      case "spring":
        return (
          <>
            <FlowerBloom enabled={true} />
            <ButterflyFlight enabled={true} />
            <SpringDecorations enabled={true} />
          </>
        );

      case "autumn":
        return (
          <>
            <LeafFall enabled={true} />
            <AutumnBreeze enabled={true} />
            <AutumnDecorations enabled={true} />
          </>
        );

      case "ocean":
        return (
          <>
            <WaveMotion enabled={true} />
            <BubbleRise enabled={true} />
            <OceanDecorations enabled={true} />
          </>
        );

      case "galaxy":
        return (
          <>
            <StarTwinkle enabled={true} />
            <PlanetRotation enabled={true} />
            <GalaxyDecorations enabled={true} />
          </>
        );

      case "vintage":
        return (
          <>
            <FilmGrain enabled={true} />
            <VintageFilter enabled={true} />
            <VintageDecorations enabled={true} />
          </>
        );

      case "minimalist":
        return (
          <>
            <SubtleFade enabled={true} />
            <CleanTransition enabled={true} />
            <MinimalistDecorations enabled={true} />
          </>
        );

      case "luxury":
        return (
          <>
            <GoldShimmer enabled={true} />
            <DiamondSparkle enabled={true} />
            <LuxuryDecorations enabled={true} />
          </>
        );

      case "sports":
        return (
          <>
            <TrophyShine enabled={true} />
            <VictorySparkle enabled={true} />
            <SportsDecorations enabled={true} />
          </>
        );

      case "music":
        return (
          <>
            <SoundWaves enabled={true} />
            <MusicPulse enabled={true} />
            <MusicDecorations enabled={true} />
          </>
        );

      case "art":
        return (
          <>
            <PaintSplash enabled={true} />
            <ArtisticBrush enabled={true} />
            <ArtDecorations enabled={true} />
          </>
        );

      case "corporate":
        return (
          <>
            <ProfessionalGlow enabled={true} />
            <BusinessPulse enabled={true} />
            <CorporateDecorations enabled={true} />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="theme-animations-container">{renderThemeAnimations()}</div>
  );
}

// Placeholder components for other themes (to be implemented)
const ConfettiAnimation = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🎉</div> : null;
const BalloonFloat = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🎈</div> : null;
const BirthdayDecorations = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🎂</div> : null;
const FloatingHearts = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>💖</div> : null;
const PetalFall = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🌸</div> : null;
const WeddingDecorations = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>💒</div> : null;
const FogEffect = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🌫️</div> : null;
const SpookyFloat = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>👻</div> : null;
const HalloweenDecorations = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🎃</div> : null;
const IceShimmer = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>❄️</div> : null;
const WinterDecorations = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>⛄</div> : null;
const WaveMotion = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🌊</div> : null;
const SunShine = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>☀️</div> : null;
const SummerDecorations = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🏖️</div> : null;
const FlowerBloom = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🌺</div> : null;
const ButterflyFlight = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🦋</div> : null;
const SpringDecorations = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🌷</div> : null;
const LeafFall = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🍂</div> : null;
const AutumnBreeze = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🍁</div> : null;
const AutumnDecorations = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🎃</div> : null;
const BubbleRise = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🫧</div> : null;
const OceanDecorations = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🐠</div> : null;
const StarTwinkle = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>⭐</div> : null;
const PlanetRotation = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🪐</div> : null;
const GalaxyDecorations = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🌌</div> : null;
const FilmGrain = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🎬</div> : null;
const VintageFilter = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>📷</div> : null;
const VintageDecorations = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>📻</div> : null;
const SubtleFade = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>⚪</div> : null;
const CleanTransition = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>⚫</div> : null;
const MinimalistDecorations = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🔲</div> : null;
const GoldShimmer = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>✨</div> : null;
const DiamondSparkle = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>💎</div> : null;
const LuxuryDecorations = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>👑</div> : null;
const TrophyShine = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🏆</div> : null;
const VictorySparkle = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🎖️</div> : null;
const SportsDecorations = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>⚽</div> : null;
const SoundWaves = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🎵</div> : null;
const MusicPulse = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🎶</div> : null;
const MusicDecorations = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🎸</div> : null;
const PaintSplash = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🎨</div> : null;
const ArtisticBrush = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🖌️</div> : null;
const ArtDecorations = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🖼️</div> : null;
const ProfessionalGlow = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>💼</div> : null;
const BusinessPulse = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>📊</div> : null;
const CorporateDecorations = ({ enabled }: { enabled: boolean }) =>
  enabled ? <div>🏢</div> : null;
