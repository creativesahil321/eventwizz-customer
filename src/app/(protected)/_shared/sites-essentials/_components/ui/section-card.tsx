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
    <div className="rounded-lg border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 p-6 space-y-5">
      <SectionTitle title={title} description={description} />
      <Separator className="my-1" />
      {children}
    </div>
  );
}
