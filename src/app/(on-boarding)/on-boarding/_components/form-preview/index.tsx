"use client";
import React, { useEffect, useState, lazy, Suspense, useRef } from "react";
import { useFormContext } from "../form-provider";
import { OnboardingFormData } from "../form-provider/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { PreviewProvider } from "@/contexts/preview-context";
import CommonHeader from "@/components/shared/common-header";

// Lazy load components - only import what's actually used
const BrochureSection = lazy(() => import("./_components/brochure-section"));
const DrinkSection = lazy(() => import("./_components/drink-section"));
const FaqSection = lazy(() => import("./_components/faq-section"));
const FooterSection = lazy(() => import("./_components/footer"));
const AboutEventSec = lazy(() => import("./_components/About-event-sec"));
const EventHeroSec = lazy(() => import("./_components/Event-hero-sec"));
const MenuSection = lazy(() => import("./_components/menu-section"));
const Timeline = lazy(() => import("./_components/Time-line"));
const PackageSection = lazy(() => import("./_components/package-sec"));
const DatesSection = lazy(() => import("./_components/Dates-section"));
const HomepageHeroSec = lazy(() => import("./_components/Homepage-hero-sec"));
const AboutHeroSection = lazy(() => import("./_components/About-hero-sec"));
const EventGallery = lazy(() => import("./_components/Event-gallery"));

// Component loaders
const BannerLoader = () => <Skeleton className="w-full h-64 rounded-lg" />;
const SectionLoader = () => (
  <div className="space-y-4 my-8">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-2/3" />
  </div>
);

// Only load components needed for the current step
export default function FormPreview() {
  const { form, activeStep, activeField } = useFormContext();

  const [formState, setFormState] = useState<OnboardingFormData>(
    form.getValues()
  );

  // Build downloads array for preview
  const buildDownloadsArray = (): Array<{
    title: string;
    download_link: string[];
  }> => {
    const downloads: Array<{
      title: string;
      download_link: string[];
    }> = [];

    // Add downloads from the downloads array (main source)
    if (formState.stepEight?.downloads?.length) {
      downloads.push(
        ...formState.stepEight.downloads.map(
          (download: {
            title?: string;
            pdf?: File | null;
            download_link?: string[];
          }) => ({
            title: download.title || "Download",
            download_link: [
              download.pdf instanceof File
                ? URL.createObjectURL(download.pdf)
                : download.download_link?.[0] || "#",
            ],
          })
        )
      );
    }

    // Add individual PDF fields as fallback (for backward compatibility)
    const individualPdfs: Array<{
      field: File | string | null | undefined;
      title: string;
    }> = [
      {
        field: formState.stepEight?.brochure_pdf,
        title: "Event Details",
      },
      {
        field: formState.stepEight?.brochure_pdf_2,
        title: "Event Flyer",
      },
      {
        field: formState.stepEight?.faq_pdf,
        title: "FAQ Details",
      },
    ];

    individualPdfs.forEach(({ field, title }) => {
      if (field && !downloads.some((d) => d.title === title)) {
        downloads.push({
          title,
          download_link: [
            typeof field === "string" ? field : URL.createObjectURL(field),
          ],
        });
      }
    });

    return downloads;
  };

  const downloadsArray = buildDownloadsArray();

  // Create refs for scrollable sections
  const headerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const packageRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const eventHeroRef = useRef<HTMLDivElement>(null);
  const aboutEventRef = useRef<HTMLDivElement>(null);
  const datesRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const drinkRef = useRef<HTMLDivElement>(null);
  const moreInfoRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  // Force re-render when form data changes
  useEffect(() => {
    const subscription = form.watch((value) => {
      setFormState(value as OnboardingFormData);
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Effect to scroll to the section being edited based on active field
  useEffect(() => {
    if (!activeField || !previewContainerRef.current) return;

    const scrollToElement = (ref: React.RefObject<HTMLDivElement | null>) => {
      if (ref?.current && previewContainerRef?.current) {
        previewContainerRef.current.scrollTo({
          top: ref.current.offsetTop - 20,
          behavior: "smooth",
        });
      }
    };

    // Map active fields to their respective sections based on step number
    switch (activeStep) {
      case 1: // Contact information
        scrollToElement(headerRef); // Most likely just header info
        break;

      case 2: // Site creation
        if (activeField.includes("logo")) {
          scrollToElement(headerRef);
        } else if (
          activeField.includes("cover_image") ||
          activeField.includes("banner_heading") ||
          activeField.includes("sub_heading")
        ) {
          scrollToElement(heroRef);
        } else if (
          activeField.includes("title") ||
          activeField.includes("description") ||
          activeField.includes("link_title")
        ) {
          scrollToElement(aboutRef);
        }
        break;

      case 3: // Event details/category
        if (
          activeField.includes("header_banner") ||
          activeField.includes("banner_heading") ||
          activeField.includes("banner_sub_heading")
        ) {
          scrollToElement(eventHeroRef);
        } else if (
          activeField.includes("about_event_") ||
          activeField.includes("event_category")
        ) {
          scrollToElement(aboutEventRef);
        } else if (activeField.includes("event_schedular")) {
          scrollToElement(timelineRef);
        }
        break;

      case 4: // Package details
        if (activeField.includes("gallery")) {
          scrollToElement(galleryRef);
        } else if (
          activeField.includes("package_image") ||
          activeField.includes("package_title") ||
          activeField.includes("package_description") ||
          activeField.includes("package_button_name") ||
          activeField.includes("package_details")
        ) {
          scrollToElement(packageRef);
        }
        break;

      case 5: // Event dates
        if (activeField.includes("dates")) {
          scrollToElement(datesRef);
        }
        break;

      case 6: // Catering options
        if (
          activeField.includes("catering") ||
          activeField.includes("title") ||
          activeField.includes("description") ||
          activeField.includes("menus")
        ) {
          scrollToElement(menuRef);
        }
        break;

      case 7: // Drinks
        if (
          activeField.includes("drink_") ||
          activeField.includes("packages")
        ) {
          scrollToElement(drinkRef);
        }
        break;

      case 8: // More Info
        if (
          activeField.includes("brochure_pdf") ||
          activeField.includes("faq_pdf") ||
          activeField.includes("event_address") ||
          activeField.includes("price_start_from") ||
          activeField.includes("price_start_from_button_text") ||
          activeField.includes("location") ||
          activeField.includes("downloads") ||
          activeField.includes("more_info")
        ) {
          scrollToElement(moreInfoRef);
        }
        break;

      case 9: // FAQs
        if (
          activeField.includes("question") ||
          activeField.includes("answer")
        ) {
          scrollToElement(faqRef);
        }
        break;

      default:
        // For other steps, no specific scrolling behavior
        break;
    }
  }, [activeStep, activeField]);

  // Render only site preview components for step 2
  const renderStepTwoPreview = () => {
    return (
      <>
        {/* Site Header */}
        <CommonHeader
          contact_number={formState.stepOne?.contact_number || ""}
          logo={formState.stepTwo?.logo || null}
          variant="onboarding"
          hasBackgroundImage={Boolean(formState.stepTwo?.cover_image)}
        />

        <div
          ref={heroRef}
          className={`transition-all duration-300 ${
            activeField &&
            (activeField.includes("cover_image") ||
              activeField.includes("banner_heading") ||
              activeField.includes("banner_sub_heading"))
              ? "ring-2 ring-primary ring-opacity-50"
              : ""
          }`}
        >
          <Suspense fallback={<BannerLoader />}>
            <HomepageHeroSec
              coverImage={formState.stepTwo?.cover_image || null}
              heading={formState.stepTwo?.banner_heading || ""}
              sub_heading={formState.stepTwo?.banner_sub_heading || ""}
              contact_number={formState.stepOne?.contact_number || ""}
              logo={formState.stepTwo?.logo || null}
            />
          </Suspense>
        </div>

        <div
          ref={aboutRef}
          className={`transition-all duration-300 ${
            activeField &&
            (activeField.includes("about_title") ||
              activeField.includes("about_description") ||
              activeField.includes("about_link_title"))
              ? "ring-2 ring-primary ring-opacity-50"
              : ""
          }`}
        >
          <Suspense fallback={<SectionLoader />}>
            <AboutHeroSection
              title={formState.stepTwo?.about_title || ""}
              description={formState.stepTwo?.about_description || ""}
              link_title={formState.stepTwo?.about_link_title || ""}
            />
          </Suspense>
        </div>
      </>
    );
  };

  // Function to get highlight class for a section based on current step and active field
  const getHighlightClass = (step: number, fieldPattern: string) => {
    return activeStep === step &&
      activeField &&
      activeField.includes(fieldPattern)
      ? "ring-2 ring-primary ring-opacity-50 scroll-mt-20"
      : "";
  };

  // Always render the full site preview for other steps
  const renderFullSitePreview = () => {
    return (
      <>
        {/* Site Header */}
        <CommonHeader
          contact_number={formState.stepOne?.contact_number || ""}
          logo={formState.stepTwo?.logo || null}
          variant="onboarding"
          hasBackgroundImage={Boolean(formState.stepThree?.event_banner_image)}
        />

        {/* Event Hero with Floating Header */}
        <div
          ref={eventHeroRef}
          className={`transition-all duration-300 ${getHighlightClass(
            3,
            "banner"
          )}`}
        >
          <Suspense fallback={<BannerLoader />}>
            <EventHeroSec
              heading={formState.stepThree?.event_banner_heading || ""}
              image={formState.stepThree?.event_banner_image || null}
              video={formState.stepThree?.event_banner_video || null}
              banner_sub_heading={
                formState.stepThree?.event_banner_sub_heading || ""
              }
              contact_number={formState.stepOne?.contact_number || ""}
              logo={formState.stepTwo?.logo || null}
            />
          </Suspense>
        </div>

        {/* About Event */}
        <div
          ref={aboutEventRef}
          className={`transition-all duration-300 ${getHighlightClass(
            3,
            "about_event"
          )}`}
        >
          <Suspense fallback={<SectionLoader />}>
            <AboutEventSec
              about_event_sub_heading={
                formState.stepThree?.about_event_sub_heading || ""
              }
              about_event_heading={
                formState.stepThree?.about_event_heading || ""
              }
              about_event_description={
                formState.stepThree?.about_event_description || ""
              }
            />
          </Suspense>
        </div>

        {/* Event Schedular */}
        <div
          ref={timelineRef}
          className={`transition-all duration-300 ${getHighlightClass(
            3,
            "event_schedular"
          )}`}
        >
          <Suspense fallback={<SectionLoader />}>
            <Timeline
              eventSchedularTitle={
                formState.stepThree?.event_schedular_title || ""
              }
              eventSchedular={formState.stepThree?.event_schedular || []}
            />
          </Suspense>
        </div>

        {/* Package */}
        <div
          ref={packageRef}
          className={`transition-all duration-300 ${getHighlightClass(
            4,
            "package"
          )}`}
        >
          <Suspense fallback={<SectionLoader />}>
            <PackageSection
              heading={formState.stepFour?.package_title || ""}
              image={
                typeof formState.stepFour?.package_image === "string"
                  ? {
                      path: formState.stepFour.package_image,
                      relativePath: formState.stepFour.package_image,
                      preview: formState.stepFour.package_image,
                    }
                  : formState.stepFour?.package_image || null
              }
              subHeading={formState.stepFour?.package_description || ""}
              packageDetails={
                formState?.stepFour?.package_details?.map((detail) => ({
                  title: detail.title || "",
                  description: detail.title || "", // Use title as description since it's not in the schema
                })) || []
              }
              buttonLink={formState.stepFour?.package_button_name ? "#" : ""}
              buttonName={formState.stepFour?.package_button_name || ""}
            />
          </Suspense>
        </div>

        {/* Event Dates */}
        <div
          ref={datesRef}
          className={`transition-all duration-300 ${getHighlightClass(
            5,
            "dates"
          )}`}
        >
          <Suspense fallback={<SectionLoader />}>
            <DatesSection
              dates={
                formState.stepFive?.dates?.map((date) => ({
                  event_date: date.event_date,
                  price: 65, // Simple fixed price for preview
                })) || []
              }
            />
          </Suspense>
        </div>

        {/* Event Gallery */}
        <div
          ref={galleryRef}
          className={`transition-all duration-300 ${getHighlightClass(
            4,
            "gallery"
          )}`}
        >
          <Suspense fallback={<SectionLoader />}>
            <EventGallery
              gallery={
                formState.stepFour?.gallery &&
                formState.stepFour.gallery.length > 0
                  ? formState.stepFour.gallery.map((image) => {
                      if (image instanceof File) {
                        return {
                          path: image.name,
                          relativePath: image.name,
                          preview: URL.createObjectURL(image),
                        };
                      }
                      // Handle backend gallery items with {id, url} format
                      if (
                        typeof image === "object" &&
                        image !== null &&
                        "url" in image
                      ) {
                        const galleryItem = image as {
                          id: number;
                          url: string;
                        };
                        return {
                          path: galleryItem.url,
                          relativePath: galleryItem.url,
                          preview: galleryItem.url,
                        };
                      }
                      return image;
                    })
                  : Array(8).fill({
                      path: "/assets/images/gallery-image.png",
                      relativePath: "/assets/images/gallery-image.png",
                      preview: "/assets/images/gallery-image.png",
                    })
              }
            />
          </Suspense>
        </div>

        {/* Catering Options */}
        <div
          ref={menuRef}
          className={`transition-all duration-300 ${getHighlightClass(6, "")}`}
        >
          <Suspense fallback={<SectionLoader />}>
            <MenuSection
              menu_title={formState.stepSix?.menu_title || ""}
              menu_description={formState.stepSix?.menu_description || ""}
              catering_option={formState.stepSix?.catering_option ?? 0}
              menus={formState.stepSix?.menus || []}
            />
          </Suspense>
        </div>

        {/* Drinks */}
        <div
          ref={drinkRef}
          className={`transition-all duration-300 ${getHighlightClass(
            7,
            "drink"
          )}`}
        >
          <Suspense fallback={<SectionLoader />}>
            <DrinkSection
              title={formState.stepSeven?.drink_title || ""}
              description={formState.stepSeven?.drink_description || ""}
              packages={
                formState.stepSeven?.packages.map((pkg) => ({
                  title: pkg.title,
                  description: pkg.description,
                  price: Number(pkg.price),
                })) || []
              }
            />
          </Suspense>
        </div>

        {/*more_info and faqs */}
        <div
          ref={moreInfoRef}
          className={`transition-all duration-300 ${getHighlightClass(
            8,
            "more_info"
          )}`}
        >
          <BrochureSection
            location={{
              title: formState.stepEight?.location?.title || "",
              description: formState.stepEight?.location?.description || "",
              icon: formState.stepEight?.location?.icon || "",
              latitude: formState.stepEight?.latitude,
              longitude: formState.stepEight?.longitude,
            }}
            downloads={downloadsArray}
            price={{
              title: formState.stepEight?.price?.title || "",
              description: formState.stepEight?.price?.description || "",
              link: formState.stepEight?.price?.link || "",
              icon: formState.stepEight?.price?.icon || "",
              price_title: formState.stepEight?.price?.price_title || "",
            }}
          />
        </div>

        {/* faqs */}
        <div
          ref={faqRef}
          className={`transition-all duration-300 ${getHighlightClass(
            9,
            "faqs"
          )}`}
        >
          <Suspense fallback={<SectionLoader />}>
            <FaqSection faqs={formState.stepNine?.faqs || []} />
          </Suspense>
        </div>

        {/* Footer */}
        <Suspense fallback={<SectionLoader />}>
          <FooterSection
            logo={formState.stepTwo?.logo || null}
            details={formState.stepOne || {}}
          />
        </Suspense>
      </>
    );
  };

  return (
    <PreviewProvider isPreviewMode={true}>
      <section className="bg-background w-full h-full overflow-hidden flex flex-col">
        <div
          ref={previewContainerRef}
          className="max-w-full h-[calc(100vh-120px)] overflow-y-auto overflow-x-hidden scroll-smooth flex-1"
        >
          <div className="w-full max-w-full scale-100 origin-top overflow-x-hidden">
            {activeStep === 2
              ? renderStepTwoPreview()
              : renderFullSitePreview()}
          </div>
        </div>
      </section>
    </PreviewProvider>
  );
}
