import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  collapsed: boolean;
}

const Logo: React.FC<LogoProps> = ({ collapsed }) => (
  <nav
    className={cn(`w-full py-4`, {
      "flex justify-between pl-4": !collapsed,
      "flex justify-center": collapsed,
    })}
  >
    <span className="transition-all duration-300 ease-linear">
      <Link href="/">
        {collapsed ? (
          <Image
            className="h-8 w-auto"
            src="/assets/images/logos/eventwizz-mini-logo.png"
            alt="EventWizz"
            width={32}
            height={32}
            priority
          />
        ) : (
          <Image
            className="h-8 w-auto"
            src="/assets/images/logos/eventwizz-logo.png"
            alt="EventWizz"
            width={110}
            height={30}
            priority
          />
        )}
      </Link>
      <span className="sr-only text-sm font-semibold">EventWizz</span>
    </span>
  </nav>
);

export default Logo;
