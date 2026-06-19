"use client";
import { NotificationProvider } from "../notification-provider";

export default function LayoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <NotificationProvider>{children}</NotificationProvider>
    </div>
  );
}
