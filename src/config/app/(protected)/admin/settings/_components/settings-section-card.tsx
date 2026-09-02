import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SettingsSectionCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function SettingsSectionCard({
  title,
  description,
  children,
}: SettingsSectionCardProps) {
  return (
    <Card className="gap-0 overflow-hidden border-[var(--color-border)] bg-white py-0 shadow-sm">
      <CardHeader className="space-y-0 border-b border-slate-100 px-4 pb-4 pt-5 sm:px-6">
        <CardTitle className="title-header text-base font-semibold text-foreground">
          {title}
        </CardTitle>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-6 pt-5 sm:px-6">{children}</CardContent>
    </Card>
  );
}
