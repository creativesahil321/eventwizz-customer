import {
  Facebook,
  Instagram,
  LucideImage,
  MapPin,
  Phone,
  Send,
  Twitter,
  Linkedin,
  Youtube,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useOnboarding } from "@/hooks/use-onboarding";

// Social media icon mapping
const socialIcons = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
};

export default function FooterSection({
  logo,
  details,
  socialLinks,
}: {
  logo: string | File | null;
  details: {
    contact_number: string;
    email: string;
    address: string;
  };
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
}) {
  const { textColorClass } = useOnboarding();
  const contact_info = [
    {
      icon: <Phone size={16} />,
      label: "Phone Number",
      text: details?.contact_number,
      type: "link",
      src: `tel:${details?.contact_number}`,
    },
    {
      icon: <MapPin size={16} />,
      label: "Get Directions",
      text: details?.address,
      type: "text",
    },
    {
      icon: <Send size={16} />,
      label: "Email Address",
      text: details?.email,
      type: "link",
      src: `mailto:${details?.email}`,
    },
  ];

  const logoSrc =
    typeof logo === "string"
      ? logo
      : logo && "preview" in logo
      ? logo.preview
      : null;

  // Generate social links from the provided data
  const social_links = Object.entries(socialLinks || {})
    .filter(([, url]) => url && url.trim() !== "")
    .map(([platform, url]) => {
      const IconComponent = socialIcons[platform as keyof typeof socialIcons];
      return {
        icon: IconComponent ? <IconComponent /> : null,
        src: url,
        platform,
      };
    })
    .filter((link) => link.icon); // Only include links with valid icons

  // Fallback to default social links if none provided
  const displaySocialLinks =
    social_links.length > 0
      ? social_links
      : [
          { icon: <Facebook />, src: "/#", platform: "facebook" },
          { icon: <Twitter />, src: "/#", platform: "twitter" },
          { icon: <Instagram />, src: "/#", platform: "instagram" },
        ];

  return (
    <>
      <section className={`w-full ${textColorClass}`}>
        <div className="container mx-auto px-5 py-5">
          <div
            className="w-full border-b py-5"
            style={{ borderColor: "var(--color-text-dimmed)" }}
          >
            <div className="flex flex-row gap-2 justify-center items-center">
              {logo ? (
                <Image
                  src={logoSrc as string}
                  alt={logo as string}
                  className="h-12 w-auto"
                  width={100}
                  height={50}
                />
              ) : (
                <div className="flex flex-row gap-2 items-center">
                  {" "}
                  Logo <LucideImage size={48} />
                </div>
              )}
            </div>
            <div className="flex flex-row justify-center pt-5 gap-3">
              {displaySocialLinks.map((social, index) => (
                <Link key={index} href={social.src}>
                  {social.icon}
                </Link>
              ))}
            </div>
          </div>
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 py-5">
            {contact_info.map((info, index) => (
              <div
                className="w-full flex flex-row justify-start sm:justify-center gap-3"
                key={index}
              >
                <div className="mt-1 flex-shrink-0">{info.icon}</div>
                <div className="flex-1">
                  <h6 className="font-bold">{info.label}</h6>
                  {info.type === "link" ? (
                    <Link href={info.src || ""} className="break-all">
                      {info.text}
                    </Link>
                  ) : (
                    <p className="break-all">{info.text}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
