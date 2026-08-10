import { Separator } from "@/components/ui/separator";
import { SectionTitle } from "./section-title";

/**
 * White, bordered box that wraps one editor section (title + separator + fields).
 * Shared by the admin marketing-home editor and the vendor Site Essentials home
 * editor so both read as clean, distinct blocks.
 */
export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-4 rounded-lg border-2 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:space-y-5 sm:p-6">
      <SectionTitle title={title} description={description} />
      <Separator className="my-1" />
      {children}
    </div>
  );
}
