"use client";

import { useState, useEffect } from "react";
import { Navigation2 } from "lucide-react";
import { addCacheBusting } from "@/lib/image-utils";

type MenuItem = {
  title: string;
  description?: string;
};

type MenuCategory = {
  name: string;
  items: MenuItem[];
};

type MenuSectionProps = {
  menu_title: string;
  menu_description: string;
  menus: MenuCategory[];
  catering_option: number;
  menu_background_image?: string | null;
};

export default function MenuSection({
  menu_title,
  menu_description,
  menus,
  catering_option,
  menu_background_image,
}: MenuSectionProps) {
  const [menuBgImageFailed, setMenuBgImageFailed] = useState(false);

  useEffect(() => {
    setMenuBgImageFailed(false);
  }, [menu_background_image]);

  if (catering_option === 0) return null;

  const safeMenus = Array.isArray(menus) ? menus : [];

  const filteredMenus = safeMenus
    .map((menu) => ({
      ...menu,
      items: (menu.items ?? []).filter(
        (item) => item.title.trim() !== "" || item.description?.trim() !== "",
      ),
    }))
    .filter((menu) => menu.name.trim() !== "" && menu.items.length > 0)
    .slice(0, 4);

  const getGridCols = () => {
    switch (filteredMenus.length) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-1 sm:grid-cols-2";
      case 3:
        return "grid-cols-1 sm:grid-cols-3";
      case 4:
      default:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
    }
  };

  return (
    <section className="relative w-full bg-[color:var(--color-background)] px-4 py-16">
      {/* Background — decorative; empty alt + onError so broken URLs never show alt text */}
      <div className="absolute inset-0 z-0">
        {!menuBgImageFailed ? (
          <img
            src={addCacheBusting(
              menu_background_image || "/assets/images/events/menus.webp",
            )}
            alt=""
            aria-hidden
            onError={() => setMenuBgImageFailed(true)}
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        ) : null}
        {/* Dark overlay */}
        <div className="absolute inset-0 " />
        {/* Optional texture overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      {/* Foreground: use body text tokens — secondary-foreground is only for text ON secondary fills */}
      <div className="relative z-10 max-w-7xl mx-auto text-[var(--color-text)]">
        <div className="w-full text-center mb-8">
          <h2 className="text-2xl font-black tracking-tight md:text-3xl max-w-7xl mx-auto">
            {menu_title || "Heading e.g. Menu"}
          </h2>
          <p
            className="max-w-2xl mx-auto break-words whitespace-normal overflow-hidden text-[var(--color-text-dimmed)]"
            style={{
              wordBreak: "break-word",
              overflowWrap: "break-word",
              hyphens: "auto",
            }}
          >
            {menu_description || "E.g. Small Descriptions"}
          </p>
        </div>

        <div
          className={`grid ${getGridCols()} gap-5 ${
            filteredMenus.length === 1 ? "justify-items-center" : ""
          }`}
        >
          {filteredMenus.length > 0 &&
            filteredMenus.map((menu, index) => (
              <div
                className={`w-full overflow-hidden ${
                  filteredMenus.length === 1 ? "max-w-2xl" : ""
                }`}
                key={index}
              >
                <h3
                  className={`text-2xl font-bold py-5 break-words overflow-hidden ${
                    filteredMenus.length === 1 ? "text-center" : "pl-6"
                  }`}
                  style={{
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {menu.name}
                </h3>

                {(menu.items ?? []).map((item, idx) => (
                  <div className="w-full mb-4 overflow-hidden px-2" key={idx}>
                    <h4 className="text-base sm:text-lg font-bold flex items-start break-words overflow-hidden">
                      <Navigation2
                        className="rotate-90 mr-1 sm:mr-2 text-[var(--color-primary)] flex-shrink-0 mt-1"
                        size={14}
                      />
                      <span
                        className="break-words overflow-hidden flex-1"
                        style={{
                          wordBreak: "break-word",
                          overflowWrap: "break-word",
                          hyphens: "auto",
                        }}
                      >
                        {item.title}
                      </span>
                    </h4>
                    <div
                      className="w-full overflow-hidden whitespace-normal break-words pl-4 text-sm text-[var(--color-text-dimmed)] sm:pl-6 sm:text-base"
                      style={{
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        hyphens: "auto",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: item.description || "",
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}
