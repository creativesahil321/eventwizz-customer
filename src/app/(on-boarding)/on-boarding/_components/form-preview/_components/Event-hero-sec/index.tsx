import { Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";

type ImageType =
  | string
  | File
  | { preview?: string; path?: string }
  | undefined;

interface EventHeroSec {
  image?: ImageType | null;
  heading?: string;
  banner_sub_heading?: string;
  video?: string | File | null;
  contact_number?: string;
  logo?: File | string | null;
}

export default function EventHeroSec({
  image,
  heading,
  banner_sub_heading,
  video,
}: EventHeroSec) {
  // State for client-side URL handling
  const [bgImage, setBgImage] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Process image and video on client-side only
  useEffect(() => {
    setIsLoading(true);
    let imageObjectUrl: string | null = null;
    let videoObjectUrl: string | null = null;

    // Process image - clear if not provided
    if (typeof image === "string" && image) {
      setBgImage(image);
    } else if (image instanceof File) {
      imageObjectUrl = URL.createObjectURL(image);
      setBgImage(imageObjectUrl);
    } else if (
      image &&
      typeof image === "object" &&
      "preview" in image &&
      (image.preview || image.path)
    ) {
      setBgImage(image.preview || image.path || "");
    } else {
      // Clear image if undefined/null
      setBgImage("");
    }

    // Process video - clear if not provided
    if (typeof video === "string" && video) {
      setVideoUrl(video);
    } else if (video instanceof File) {
      videoObjectUrl = URL.createObjectURL(video);
      setVideoUrl(videoObjectUrl);
    } else {
      // Clear video if undefined/null
      setVideoUrl("");
    }

    setIsLoading(false);

    // Clean up object URLs when component unmounts or dependencies change
    return () => {
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl);
      }
      if (videoObjectUrl) {
        URL.revokeObjectURL(videoObjectUrl);
      }
    };
  }, [image, video]);

  const hasMedia = Boolean(bgImage || videoUrl);

  return (
    <section
      className="relative w-full h-screen mx-auto overflow-hidden bg-[#F3F4F6]"
      style={{ minHeight: "500px" }}
    >
      {/* Preload image with Next.js Image for better loading performance */}
      {bgImage && !videoUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.4)), url(${bgImage})`,
          }}
        />
      )}

      {/* Video with poster image for better loading experience */}
      {videoUrl && (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={bgImage || undefined}
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="absolute inset-0 bg-black/50"></div>
        </div>
      )}

      {/* Loading state - show skeleton */}
      {isLoading && !hasMedia && (
        <div className="absolute inset-0 animate-pulse bg-gray-200 z-0"></div>
      )}

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 flex items-center justify-center h-full">
        <div className="text-center">
          <h1
            className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-6 break-words max-w-full ${
              hasMedia ? "text-white" : "text-foreground"
            }`}
          >
            {heading || "Event Banner Heading"}
          </h1>
          <h2
            className={`text-lg ${
              hasMedia ? "text-white/90" : "text-foreground"
            }`}
          >
            {banner_sub_heading || "Event Banner Sub-Heading"}
          </h2>

          {!hasMedia && (
            <>
              <ImageIcon size={40} className="text-gray-400 mt-4" />
              <h2 className="text-lg text-foreground mt-2">Cover Image</h2>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
