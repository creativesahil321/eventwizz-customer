"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Mock categories for search results
const searchCategories = [
  { id: "all", label: "All" },
  { id: "events", label: "Events" },
  { id: "customers", label: "Customers" },
  { id: "payments", label: "Payments" },
];

// Mock search results for demo
const mockResults = [
  {
    id: 1,
    title: "Summer Festival",
    category: "events",
    description: "Annual summer festival event",
  },
  {
    id: 2,
    title: "Corporate Retreat",
    category: "events",
    description: "Team building event package",
  },
  {
    id: 3,
    title: "John Doe",
    category: "customers",
    description: "Premium customer account",
  },
  {
    id: 4,
    title: "Sarah Smith",
    category: "customers",
    description: "Customer since 2022",
  },
  {
    id: 5,
    title: "Invoice #1234",
    category: "payments",
    description: "Payment received on May 1, 2023",
  },
];

const UniversalSearch = () => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [results, setResults] = useState<typeof mockResults>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Filter results based on query and active category
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const filtered = mockResults.filter((item) => {
      const matchesQuery =
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase());
      const matchesCategory =
        activeCategory === "all" || item.category === activeCategory;
      return matchesQuery && matchesCategory;
    });

    setResults(filtered);
  }, [query, activeCategory]);

  // Auto-focus input when dialog opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Open dialog when user focuses on the input
  const handleInputFocus = () => {
    setIsOpen(true);
  };

  // Close dialog and clear search
  const handleClose = () => {
    setIsOpen(false);
    // Don't reset query immediately for better UX
    setTimeout(() => {
      setQuery("");
    }, 300);
  };

  return (
    <>
      {/* Simple search input that opens the dialog */}
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="search"
          placeholder="Search..."
          className="pl-8 pr-2 sm:pr-4 bg-gray-50 border-gray-200 h-9 rounded-full text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
        />
      </div>

      {/* Search dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0 max-w-[95vw] overflow-hidden [&>button]:hidden">
          <DialogHeader className="px-2 sm:px-4 py-2 border-b">
            <DialogTitle className="sr-only">Search</DialogTitle>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-black" />
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Search for anything..."
                className="flex-1 px-2 py-1 text-base sm:text-lg bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-black"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && handleClose()}
              />
              <Button
                variant="event-ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Categories */}
          <div className="border-b">
            <div className="flex overflow-x-auto px-2 sm:px-4 py-2 gap-1">
              {searchCategories.map((category) => (
                <Button
                  key={category.id}
                  variant={
                    activeCategory === category.id ? "event-primary" : "ghost"
                  }
                  size="sm"
                  className={cn(
                    "px-2 sm:px-3 whitespace-nowrap text-black",
                    activeCategory === category.id &&
                      "bg-[var(--color-primary)] text-white"
                  )}
                  onClick={() => setActiveCategory(category.id)}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Results area */}
          <div className="py-2 px-1 overflow-y-auto max-h-[400px]">
            {query.trim() === "" ? (
              <div className="text-center py-8 text-muted-foreground">
                Start typing to search...
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No results found for &quot;{query}&quot;
              </div>
            ) : (
              <div className="divide-y">
                {results.map((result) => (
                  <button
                    key={result.id}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex flex-col"
                    onClick={() => {
                      router.push(
                        `/search?q=${encodeURIComponent(query)}&type=${
                          result.category
                        }&id=${result.id}`
                      );
                      handleClose();
                    }}
                  >
                    <div className="font-medium">{result.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.description}
                    </div>
                    <div className="text-xs text-primary mt-1">
                      {
                        searchCategories.find((c) => c.id === result.category)
                          ?.label
                      }
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer with keyboard shortcuts */}
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <div>
                Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">↑</kbd>{" "}
                <kbd className="px-1 py-0.5 bg-gray-100 rounded">↓</kbd> to
                navigate
              </div>
              <div>
                Press{" "}
                <kbd className="px-1 py-0.5 bg-gray-100 rounded">Enter</kbd> to
                select •{" "}
                <kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> to
                close
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UniversalSearch;
