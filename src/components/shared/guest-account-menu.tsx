"use client";

import Link from "next/link";
import { LogIn, UserCircle, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type GuestAccountMenuProps = {
  triggerClassName?: string;
  labelClassName?: string;
  contentClassName?: string;
  itemClassName?: string;
  iconClassName?: string;
  disabled?: boolean;
};

/**
 * One Account control for guests — Log in / Register live in the menu so the
 * public header does not show two auth pills.
 */
export function GuestAccountMenu({
  triggerClassName,
  labelClassName,
  contentClassName,
  itemClassName,
  iconClassName,
  disabled = false,
}: GuestAccountMenuProps) {
  if (disabled) {
    return (
      <div
        className={triggerClassName}
        aria-label="Account"
        aria-hidden
      >
        <UserCircle size={16} className="shrink-0" />
        <span className={labelClassName}>Account</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={triggerClassName}
          aria-label="Account menu"
          aria-haspopup="menu"
        >
          <UserCircle size={16} className="shrink-0" />
          <span className={labelClassName}>Account</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={contentClassName}
      >
        <DropdownMenuItem asChild className={itemClassName}>
          <Link
            href="/auth/login"
            className="flex cursor-pointer items-center gap-2.5"
          >
            <LogIn className={cn("h-4 w-4 shrink-0", iconClassName)} />
            Log in
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={itemClassName}>
          <Link
            href="/auth/register"
            className="flex cursor-pointer items-center gap-2.5"
          >
            <UserPlus className={cn("h-4 w-4 shrink-0", iconClassName)} />
            Register
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
