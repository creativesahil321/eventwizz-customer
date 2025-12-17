import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building } from "lucide-react";

export default function CreateEventButton({ link }: { link: string }) {
  return (
    <Button asChild>
      <Link href={link || "/events/create"}>
        <span>
          <Building size={16} />
        </span>
        <span>Create Event</span>
      </Link>
    </Button>
  );
}
