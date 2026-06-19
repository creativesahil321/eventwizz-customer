"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      richColors
      style={
        {
          "--normal-bg": "var(--color-surface, white)",
          "--normal-border": "var(--border, #e2e8f0)",
          "--normal-text": "var(--color-text, black)",
          "--success-bg": "var(--color-success, #4caf50)",
          "--success-border": "var(--color-success, #4caf50)",
          "--success-text": "white",
          "--error-bg": "var(--color-error, #f44336)",
          "--error-border": "var(--color-error, #f44336)",
          "--error-text": "white",
          "--warning-bg": "var(--color-warning, #ff9800)",
          "--warning-border": "var(--color-warning, #ff9800)",
          "--warning-text": "white",
          "--info-bg": "var(--color-info, #2196f3)",
          "--info-border": "var(--color-info, #2196f3)",
          "--info-text": "white",
          "--radius": "var(--radius, 0.5rem)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
