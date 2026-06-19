import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
const SearchButton = memo(() => {
  return (
    <div className="flex gap-3 items-center">
      <Button
        variant="ghost"
        className="flex items-center xl:text-sm text-lg text-default-800 dark:text-default-700 gap-3"
        aria-haspopup="dialog"
        aria-expanded="false"
      >
        <Search className="w-5 h-5" />
        <span className="xl:inline-block hidden">Search... </span>
      </Button>
    </div>
  );
});
SearchButton.displayName = "SearchButton";
export default SearchButton;
