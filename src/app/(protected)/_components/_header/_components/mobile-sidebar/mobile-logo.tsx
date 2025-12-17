"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "next/image";

const MobileLogo: React.FC = memo(() => {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="/assets/images/logos/eventwizz-logo.png"
        alt="EventWizz"
        width={110}
        height={30}
        className="h-8 w-auto"
      />
    </Link>
  );
});

MobileLogo.displayName = "MobileLogo";
export default MobileLogo;
