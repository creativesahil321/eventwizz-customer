import type { Metadata } from "next";

/** Transactional / internal pages: keep them out of search results. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NoIndexLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
