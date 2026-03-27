import { Button } from "@/components/ui/button";
import { ChevronDown, Image as LucidImage } from "lucide-react";

interface HomepageHeroSecProps {
  coverImage?: {
    preview?: string;
    path?: string;
  } | null;
  heading?: string;
  sub_heading?: string;
  contact_number?: string;
  logo?: File | string | null;
}
export default function HomepageHeroSec({
  coverImage,
  heading,
  sub_heading,
}: HomepageHeroSecProps) {
  let image = "";
  if (typeof coverImage === "string") {
    image = coverImage;
  } else if (coverImage instanceof File) {
    image = URL.createObjectURL(coverImage);
  } else if (coverImage?.preview || coverImage?.path) {
    image = coverImage.preview || coverImage.path || "";
  }

  const bgImage = image ? `url(${image})` : `url(${image})`;
  return (
    <section
      className="bg-[#F3F4F6] text-black relative w-full aspect-[16/9] mx-auto bg-cover bg-center bg-no-repeat"
      id="fall-back"
      style={{
        backgroundImage: bgImage,
      }}
    >
      <div className="flex flex-col justify-center items-center h-full space-y-2 pt-20">
        <h1 className="text-2xl">
          {heading ? heading : "Landing Page Banner Heading"}
        </h1>
        <h2 className="text-lg text-foreground">
          {sub_heading ? sub_heading : "Landing Page Banner Sub-Heading"}
        </h2>
        {!image && <LucidImage size={52} />}
      </div>
    </section>
  );
}
