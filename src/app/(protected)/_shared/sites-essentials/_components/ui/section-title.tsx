interface SectionTitleProps {
  title: string;
  description?: string;
}

export function SectionTitle({ title, description }: SectionTitleProps) {
  return (
    <div className="min-w-0 space-y-1">
      <h3 className="title-header text-base font-bold leading-6 sm:text-lg">
        {title}
      </h3>
      {description && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
