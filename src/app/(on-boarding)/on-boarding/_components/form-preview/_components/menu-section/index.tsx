"use client";

import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { addCacheBusting } from "@/lib/image-utils";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
import { SiteHeading } from "@/components/public/site-heading";
import { cn } from "@/lib/utils";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";

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
  headingEmphasis?: HeadingEmphasis | string | null;
};

/**
 * Responsive category grid (live + every preview surface):
 * 1 → centered single column
 * 2 → 1 col phone / 2 equal cols tablet+
 * 3 → 1 col until large desktop / 3 equal cols
 * 4 → 1 col phone / 2x2 tablet / 4 cols wide desktop
 *
 * Preview max-container utilities keep framed Mobile/Tablet from inheriting
 * wide-editor md/lg breakpoints.
 */
function menuGridClass(
  count: number,
  narrowPreview: boolean,
): string {
  if (narrowPreview || count <= 1) return "grid-cols-1";

  switch (count) {
    case 2:
      return cn(
        "grid-cols-1 md:grid-cols-2",
        "@max-md/preview:!grid-cols-1",
      );
    case 3:
      return cn(
        "grid-cols-1 lg:grid-cols-3",
        "@max-5xl/preview:!grid-cols-1",
      );
    case 4:
    default:
      return cn(
        "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
        "@max-md/preview:!grid-cols-1",
        "@max-xl/preview:md:!grid-cols-2",
      );
  }
}

function menuGridShellClass(count: number): string {
  switch (count) {
    case 1:
      return "mx-auto w-full max-w-xl";
    case 2:
      // Tighter shell so two columns don’t float with a huge centre gap
      return "mx-auto w-full max-w-4xl";
    case 3:
      return "mx-auto w-full max-w-6xl";
    case 4:
    default:
      return "mx-auto w-full max-w-7xl";
  }
}

export default function MenuSection({
  menu_title,
  menu_description,
  menus,
  catering_option,
  menu_background_image,
  headingEmphasis,
}: MenuSectionProps) {
  const [menuBgImageFailed, setMenuBgImageFailed] = useState(false);
  const narrowPreview = usePreviewNarrowLayout();

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

  const count = filteredMenus.length;
  const isSingleMenu = count === 1;

  return (
    <section className="relative w-full overflow-hidden bg-[color:var(--color-background)] px-4 py-16">
      <div className="absolute inset-0 z-0">
        {menu_background_image && !menuBgImageFailed ? (
          <img
            src={addCacheBusting(menu_background_image)}
            alt=""
            aria-hidden
            onError={() => setMenuBgImageFailed(true)}
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        ) : null}
        {menu_background_image && !menuBgImageFailed ? (
          <div className="absolute inset-0 bg-[color:color-mix(in_srgb,var(--color-background)_55%,transparent)]" />
        ) : null}
      </div>

      <div className="relative z-10 mx-auto max-w-7xl text-[var(--color-text)]">
        <div className="mb-10 w-full space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            Menu
          </p>
          <SiteHeading
            level={2}
            title={menu_title?.trim() || "Menu"}
            emphasis={headingEmphasis}
            variant="onSurface"
            align="center"
            className="!text-3xl !font-black tracking-tight md:!text-4xl"
          />
          <p
            className="mx-auto max-w-2xl overflow-hidden whitespace-normal break-words text-sm text-[var(--color-text-dimmed)] sm:text-base"
            style={{
              wordBreak: "break-word",
              overflowWrap: "break-word",
              hyphens: "auto",
            }}
          >
            {menu_description || "E.g. Small Descriptions"}
          </p>
        </div>

        {count > 0 ? (
          <div className={menuGridShellClass(count)}>
            <div
              className={cn(
                "grid items-start gap-8 md:gap-8 lg:gap-10",
                menuGridClass(count, narrowPreview),
              )}
            >
              {filteredMenus.map((menu, index) => (
                <div
                  className={cn(
                    "min-w-0 overflow-hidden",
                    isSingleMenu
                      ? "mx-auto w-full justify-self-center"
                      : "w-full",
                  )}
                  key={index}
                >
                  <h3
                    className={cn(
                      "break-words overflow-hidden border-b border-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)] pb-3 pt-1 text-lg font-semibold tracking-tight sm:text-xl",
                      isSingleMenu ? "px-2 text-center" : "pl-1 text-left",
                    )}
                    style={{
                      fontFamily: "var(--font-heading)",
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                  >
                    {menu.name}
                  </h3>

                  <ul className="mt-4 space-y-4">
                    {(menu.items ?? []).map((item, idx) => (
                      <li
                        className={cn(
                          "w-full px-1",
                          isSingleMenu && "mx-auto max-w-md",
                        )}
                        key={idx}
                      >
                        <h4
                          className={cn(
                            "flex items-start gap-2 text-base font-semibold sm:text-lg",
                            isSingleMenu
                              ? "justify-center text-center"
                              : "text-left",
                          )}
                        >
                          <ChevronRight
                            aria-hidden
                            className="mt-1 h-4 w-4 shrink-0 text-[color:var(--color-primary)]"
                            strokeWidth={2.75}
                          />
                          <span
                            className={cn(
                              "min-w-0 break-words",
                              isSingleMenu ? "flex-none" : "flex-1",
                            )}
                            style={{
                              wordBreak: "break-word",
                              overflowWrap: "break-word",
                              hyphens: "auto",
                            }}
                          >
                            {item.title}
                          </span>
                        </h4>
                        {item.description?.trim() ? (
                          <div
                            className={cn(
                              "mt-0.5 w-full whitespace-normal break-words text-sm leading-relaxed text-[var(--color-text-dimmed)] sm:text-[0.95rem]",
                              isSingleMenu
                                ? "pl-0 text-center"
                                : "pl-6 text-left sm:pl-7",
                            )}
                            style={{
                              wordBreak: "break-word",
                              overflowWrap: "break-word",
                              hyphens: "auto",
                            }}
                            dangerouslySetInnerHTML={{
                              __html: item.description,
                            }}
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
