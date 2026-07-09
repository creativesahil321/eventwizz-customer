"use client";

import { usePathname } from "next/navigation";
import Header from "./_header";
import CustomerHeader from "./_header/customer-header";
import { MenuItemProps } from "@/config/menus/types";

interface ConditionalHeaderProps {
  menus?: MenuItemProps[];
}

export default function ConditionalHeader({ menus }: ConditionalHeaderProps) {
  const pathname = usePathname();

  if (pathname.startsWith("/customer")) {
    return <CustomerHeader menus={menus} />;
  }

  return <Header menus={menus} />;
}
