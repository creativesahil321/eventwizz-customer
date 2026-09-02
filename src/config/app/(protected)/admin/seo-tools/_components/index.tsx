import { ProtectedPageHeader } from "@/app/(protected)/_components/page-header-card";

export default function SeoTools() {
  return (
    <ProtectedPageHeader
      className="mb-4 min-w-0"
      title="SEO Checker - Optimize & Analyze Your Website"
      description="Analyze and optimize your website's SEO performance with our powerful SEO Checker. Get insights, recommendations, and improve search rankings effortlessly."
    />
  );
}
