"use client";

import { useContext } from "react";
import { motion } from "framer-motion";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { SiteHeading } from "@/components/public/site-heading";
// Default fallback media
// const FALLBACK_VIDEO_URL =
//   "https://www.bestpartiesever.com/wp-content/uploads/2025/03/Website-video-combined-edit-online-video-cutter.com-1.mp4";
// const FALLBACK_VIDEO_URL =
//   "https://www.lovebrunch.co.uk/cdn/shop/videos/c/vp/5db45c2d897b410e96fcb1d4b4956c46/5db45c2d897b410e96fcb1d4b4956c46.HD-720p-4.5Mbps-43850554.mp4?v=0";
const DEFAULT_IMAGE_URL = "https://tinyurl.com/bdycmxcv";
 const FALLBACK_VIDEO_URL =
   "https://videos.pexels.com/video-files/9228852/9228852-uhd_2560_1440_24fps.mp4";
// const FALLBACK_VIDEO_URL =
//   "https://assets.mixkit.co/videos/48504/48504-720.mp4";
// const FALLBACK_VIDEO_URL = "https://assets.mixkit.co/videos/339/339-720.mp4";
// const FALLBACK_VIDEO_URL =
//   "https://assets.mixkit.co/videos/40627/40627-720.mp4";
// const FALLBACK_VIDEO_URL =
//   "https://static.vecteezy.com/system/resources/previews/028/545/493/mp4/people-on-dance-floor-in-the-club-aerial-view-free-video.mp4";
// const DEFAULT_IMAGE_URL = "https://tinyurl.com/bdycmxcv";

interface HeroBannerProps {
  locationName?: string;
  coverImage?: string | null;
  coverVideo?: string | null;
  bannerHeading?: string | null;
  bannerSubHeading?: string | null;
}

export default function HeroBanner({
  locationName,
  coverImage,
  coverVideo,
  bannerHeading: propBannerHeading,
  bannerSubHeading: propBannerSubHeading,
}: HeroBannerProps) {
  const { theme } = useContext(ServerContext) || { theme: null };
  const vendorTheme = theme as ThemeSchema | null;

  // Get banner content from theme or use defaults - with API data taking priority
  const bannerHeading =
    propBannerHeading ||
    vendorTheme?.banner_heading ||
    (locationName
      ? `Find Something Great To Do in ${locationName}`
      : "Find Something Great To Do");

  const bannerSubheading =
    propBannerSubHeading ||
    vendorTheme?.banner_sub_heading ||
    "Discover amazing events that match your interests";

  const bannerAccentHint =
    typeof vendorTheme?.banner_heading_accent === "string" &&
    vendorTheme.banner_heading_accent.trim().length > 0
      ? vendorTheme.banner_heading_accent.trim()
      : null;

  // Media sources with priority: API cover_video > API cover_image > theme video > theme image > fallback video
  const apiVideoUrl = coverVideo || null;
  const apiImageUrl = coverImage || null;
  const themeVideoUrl = vendorTheme?.cover_video || null;
  const themeImageUrl = vendorTheme?.cover_image || null;

  // Priority order: API video > API image > theme video > theme image > fallback video
  const finalVideoUrl = apiVideoUrl || themeVideoUrl || FALLBACK_VIDEO_URL;
  const finalImageUrl = apiImageUrl || themeImageUrl || DEFAULT_IMAGE_URL;
  // Use video if API video exists, theme video exists, or no custom content at all
  const useVideo =
    !!apiVideoUrl ||
    !!themeVideoUrl ||
    (!apiVideoUrl && !apiImageUrl && !themeVideoUrl && !themeImageUrl);

  return (
    <section
      className="w-full h-screen mx-auto relative flex items-center justify-center"
      style={{ minHeight: "500px" }}
    >
      {/* Video background if video URL exists and should be used */}
      {useVideo && (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={finalImageUrl || undefined}
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={finalVideoUrl || undefined} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="absolute inset-0 bg-black/50"></div>
        </div>
      )}

      {/* Image background if no video */}
      {!useVideo && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.4)), url(${finalImageUrl})`,
          }}
        />
      )}

      <div className="relative z-10 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <SiteHeading
            level={1}
            title={bannerHeading}
            accentHint={bannerAccentHint}
            variant="onDark"
            className="mb-6 font-bold !text-4xl md:!text-5xl lg:!text-6xl"
          />

          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            {bannerSubheading}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
