import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TypographyProps {
  children: ReactNode;
  className?: string;
}

export function H1({ children, className }: TypographyProps) {
  return (
    <h1 className={cn("font-heading text-3xl font-bold text-black", className)}>
      {children}
    </h1>
  );
}

export function H2({ children, className }: TypographyProps) {
  return (
    <h2 className={cn("font-heading text-2xl font-bold text-black", className)}>
      {children}
    </h2>
  );
}

export function H3({ children, className }: TypographyProps) {
  return (
    <h3
      className={cn(
        "font-heading text-xl font-bold text-[var(--color-text,#2D2D2D)]",
        className
      )}
    >
      {children}
    </h3>
  );
}

export function H4({ children, className }: TypographyProps) {
  return (
    <h4
      className={cn(
        "font-heading text-lg font-bold text-[var(--color-text,#2D2D2D)]",
        className
      )}
    >
      {children}
    </h4>
  );
}

export function OnboardingTitle({ children, className }: TypographyProps) {
  return (
    <h1
      className={cn(
        "font-Tiempos text-center text-3xl tracking-tight bg-clip-text text-transparent",
        className
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)`,
      }}
    >
      {children}
    </h1>
  );
}

export function OnboardingSectionTitle({
  children,
  className,
}: TypographyProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-1 h-6 rounded-full"
        style={{
          background: `linear-gradient(to bottom, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))`,
        }}
      />
      <h3 className={cn("text-xl font-medium text-slate-100", className)}>
        {children}
      </h3>
    </div>
  );
}

export function Paragraph({ children, className }: TypographyProps) {
  return (
    <p className={cn("font-body text-base text-black", className)}>
      {children}
    </p>
  );
}

export function MutedText({ children, className }: TypographyProps) {
  return (
    <p className={cn("font-body text-sm text-black", className)}>{children}</p>
  );
}

export function Label({ children, className }: TypographyProps) {
  return (
    <span className={cn("font-body text-sm font-medium text-black", className)}>
      {children}
    </span>
  );
}

export function RadioButtonLabel({ children, className }: TypographyProps) {
  return (
    <span className={cn("font-body text-base font-medium", className)}>
      {children}
    </span>
  );
}

export function Small({ children, className }: TypographyProps) {
  return (
    <span
      className={cn(
        "font-body text-xs text-[var(--color-text-dimmed,rgba(0,0,0,0.5))]",
        className
      )}
    >
      {children}
    </span>
  );
}

export function CheckboxLabel({ children, className }: TypographyProps) {
  return (
    <span className={cn("font-body text-sm font-medium", className)}>
      {children}
    </span>
  );
}
