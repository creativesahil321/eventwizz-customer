import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  href: string;
  label: string;
  className?: string;
}

export function BackButton({ href, label, className = "" }: BackButtonProps) {
  return (
    <div className="mb-2">
      <Link href={href}>
        <Button
          variant="ghost"
          className={`pl-0 text-[var(--color-primary)] ${className}`}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </Link>
    </div>
  );
}
