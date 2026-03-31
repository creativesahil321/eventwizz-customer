// components/ui/
import React from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { icons } from "lucide-react";

interface IconDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const popularIcons = [
  "MapPin",
  "Calendar",
  "PoundSterling",
  "ArrowBigDownDash",
  "Image",
  "Tag",
];

export function IconDropdown({
  value,
  onChange,
  placeholder = "Select an icon",
}: IconDropdownProps) {
  const IconComponent = value && icons[value as keyof typeof icons];

  return (
    <div className="flex items-center relative gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full h-12 justify-between">
            <div className="flex items-center gap-2">
              {IconComponent && <IconComponent size={16} />}
              <span>{value || placeholder}</span>
            </div>
            <ChevronDown size={16} />
          </Button>
        </DropdownMenuTrigger>
        {/* <DropdownMenuContent className="w-full" align="start"> */}
        <DropdownMenuContent
          className="w-[var(--radix-dropdown-menu-trigger-width)]"
          align="start"
          sideOffset={4}
        >
          {popularIcons.map((iconName) => {
            const Icon = icons[iconName as keyof typeof icons];
            return (
              <DropdownMenuItem
                className="w-full"
                key={iconName}
                onClick={() => onChange(iconName)}
              >
                <Icon size={16} className="mr-2" />
                {iconName}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
