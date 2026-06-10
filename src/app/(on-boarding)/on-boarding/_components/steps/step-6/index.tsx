"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CardContent, CardHeader, OnboardingCard } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormContext } from "../../form-provider";
import { stepSixSchema, StepSixType } from "../../form-provider/schema";
import { X, PlusCircle } from "lucide-react";
import {
  OnboardingTitle,
  OnboardingFieldGroupTitle,
} from "@/components/ui/typography";
import { toast } from "sonner";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { useSession } from "next-auth/react";
import { MultiSpaceHeader } from "../../rooms/multi-space-header";
import { useRoomScopeSync } from "../../rooms/use-room-scope-sync";
import {
  isRoomSectionComplete,
  canShowApplyToAllButton,
  useRoomManager,
} from "../../rooms/use-room-manager";
import { isOnboardingCateringRoomReady } from "../../../_lib/onboarding-catering-ready";
import { focusNextIncompleteOnboardingRoom } from "../../../_lib/onboarding-multi-room-progress";
import { useFieldFocusHandler } from "../../form-preview/field-focus-handler";
import { useEventId } from "../../../_lib/hooks/useEventId";
import { WholeStepGuidedShell } from "../../whole-step-guided-shell";
import { guidedInsetSectionSurfaceClass } from "../../guided-section-surface";
import { guidedOnboardingSkipButtonClass } from "../../guided-sticky-approval-bar";
import { GuidedWholeStepBottomActions } from "../../guided-section-chips";
import MenuCategoryDropdown from "./menu-category-dropdown";
import {
  eventKeys,
  useEventMenuCategories,
  type NormalizedMenuCategoryResponse,
} from "@/services/vendor/events/query";
import { useQueryClient } from "@tanstack/react-query";
import { EventMenuCategory } from "@/services/vendor/events/type";
import {
  createDefaultMenuItemRow,
  menuItemTitleLabel,
  menuItemTitlePlaceholder,
  RICH_DESCRIPTION_MAX_CHARS,
} from "@/lib/event-form-limits";

// Define a type for the menu structure based on the schema
type MenuType = {
  name: string;
  items: { title: string; description: string }[];
};

// Empty initial menus - moved outside component to prevent recreation on each render
const emptyMenus: MenuType[] = [];

const normalizeCateringOption = (value: unknown): 0 | 1 => {
  if (value === 1 || value === "1" || value === true) return 1;
  return 0;
};

/** Menu categories are event-level — dedupe by id so the dropdown never lists duplicates. */
function dedupeMenuCategoriesById(
  categories: EventMenuCategory[],
): EventMenuCategory[] {
  const byId = new Map<number, EventMenuCategory>();
  for (const cat of categories) {
    const id = Number(cat.id);
    if (!Number.isFinite(id)) continue;
    if (!byId.has(id)) byId.set(id, cat);
  }
  return Array.from(byId.values());
}

export default function StepSix() {
  const {
    form: globalForm,
    save,
    setActiveStep,
    persistedProgressHydrated,
  } = useFormContext();

  const stepSixPersistedApprovedSingle = useWatch({
    control: globalForm.control,
    name: "stepSix.isApproved",
  });
  // Multi-room hookup. Keeps `stepSix` in sync with the active room's `catering` slot and
  // dispatches save to the room-scoped endpoint when applicable.
  const roomScope = useRoomScopeSync("catering");
  const { rooms, currentRoomIndex, currentRoom, setCurrentRoomIndex } =
    useRoomManager();
  const previousRoomIndexRef = useRef(currentRoomIndex);
  const isRoomSwitchHydratingRef = useRef(false);
  const stepSixPersistedApproved = roomScope.isMultiRoom
    ? roomScope.persistedApproved
    : stepSixPersistedApprovedSingle === true;
  const { handleFieldFocus, clearActiveField } = useFieldFocusHandler();
  const { update: updateSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [localMenuCategories, setLocalMenuCategories] = useState<
    EventMenuCategory[]
  >([]);
  const queryClient = useQueryClient();

  const activeRoomId = useMemo(() => {
    if (!roomScope.isMultiRoom) return undefined;
    const id = Number(rooms[currentRoomIndex]?.id);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  }, [roomScope.isMultiRoom, rooms, currentRoomIndex]);

  const eventId = useEventId(globalForm, "stepSix");

  // Fetch menu categories from API (scoped by room when multi-room is on)
  const { data: menuCategoriesResponse, isLoading: isMenuCategoriesLoading } =
    useEventMenuCategories({
      eventId,
      roomId: activeRoomId,
      enabled: eventId > 0,
    });

  // Extract menu categories from response
  const eventMenuCategories = useMemo(
    () => menuCategoriesResponse?.data || [],
    [menuCategoriesResponse],
  );

  // Update local state when API data changes (per-room list when multi-room is on)
  useEffect(() => {
    if (eventMenuCategories.length > 0) {
      setLocalMenuCategories(dedupeMenuCategoriesById(eventMenuCategories));
      return;
    }
    if (roomScope.isMultiRoom) {
      setLocalMenuCategories([]);
    }
  }, [eventMenuCategories, roomScope.isMultiRoom, activeRoomId]);

  const initialEventId = useEventId(globalForm, "stepSix");
  const activeScopedCatering = roomScope.isMultiRoom
    ? rooms[currentRoomIndex]?.catering
    : globalForm.getValues("stepSix");

  // Resolve menus from the currently active scope only (single-room or active room).
  const filteredMenus = useMemo(() => {
    const existingMenus = roomScope.isMultiRoom
      ? Array.isArray(activeScopedCatering?.menus)
        ? activeScopedCatering.menus
        : []
      : globalForm.getValues("stepSix.menus") || [];

    // Only use existing menus if they exist
    return existingMenus.length > 0
      ? existingMenus
          .map((menu) => ({
            ...menu,
            items: menu.items.filter(
              (item: { title?: string; description?: string }) =>
                String(item.title || "").trim() !== "" ||
                String(item.description || "").trim() !== "",
            ),
          }))
          .filter((menu) => menu.name.trim() !== "" && menu.items.length > 0)
      : [];
  }, [activeScopedCatering?.menus, globalForm, roomScope.isMultiRoom]);

  const form = useForm<StepSixType>({
    resolver: zodResolver(stepSixSchema),
    defaultValues: {
      step: 6,
      event_id: initialEventId,
      catering_option: globalForm.getValues("stepSix.catering_option") ?? 0,
      menu_title: globalForm.getValues("stepSix.menu_title"),
      menu_description: globalForm.getValues("stepSix.menu_description"),
      event_menu_category_id: (() => {
        const savedId = globalForm.getValues("stepSix.event_menu_category_id");
        return savedId && !isNaN(Number(savedId)) ? Number(savedId) : undefined;
      })(),
      menus: filteredMenus.length > 0 ? filteredMenus : emptyMenus,
    },
    mode: "onChange",
  });

  const watchedCateringOption = useWatch({
    control: form.control,
    name: "catering_option",
  });
  const watchedMenuTitle = useWatch({
    control: form.control,
    name: "menu_title",
  });
  const watchedMenuDescription = useWatch({
    control: form.control,
    name: "menu_description",
  });
  const watchedMenuCategoryId = useWatch({
    control: form.control,
    name: "event_menu_category_id",
  });
  const watchedMenus = useWatch({
    control: form.control,
    name: "menus",
  });

  const canApplyToAllRooms = useMemo(() => {
    if (!roomScope.isMultiRoom || rooms.length < 2) return false;
    return isOnboardingCateringRoomReady({
      catering_option: normalizeCateringOption(watchedCateringOption),
      menu_title: watchedMenuTitle,
      menu_description: watchedMenuDescription,
      event_menu_category_id: watchedMenuCategoryId,
      menus: watchedMenus,
    });
  }, [
    roomScope.isMultiRoom,
    rooms.length,
    watchedCateringOption,
    watchedMenuTitle,
    watchedMenuDescription,
    watchedMenuCategoryId,
    watchedMenus,
  ]);

  const currentEventId = useEventId(globalForm, "stepSix");

  // Get current event_id from form (most up-to-date) or globalForm or session
  const getCurrentEventId = useCallback((): number => {
    const formEventId = form.getValues("event_id");
    if (formEventId && formEventId > 0) {
      return Number(formEventId);
    }
    return currentEventId;
  }, [form, currentEventId]);

  // Update event_id when it changes
  useEffect(() => {
    if (currentEventId > 0) {
      form.setValue("event_id", currentEventId);
    }
  }, [currentEventId, form]);

  // Build a stable key that changes only when the room's catering data actually differs.
  // This avoids object-reference issues with `activeScopedCatering` as a useEffect dependency.
  const scopedCateringKey = useMemo(() => {
    const scoped = activeScopedCatering ?? {};
    return JSON.stringify({
      co: scoped.catering_option,
      mt: scoped.menu_title,
      md: scoped.menu_description,
    });
  }, [activeScopedCatering]);

  // Persist outgoing room draft before switching tabs, then rehydrate the incoming room.
  // Runs on `currentRoomIndex` change so it always fires on tab switch — no object-ref issues.
  useEffect(() => {
    if (!roomScope.isMultiRoom) {
      previousRoomIndexRef.current = currentRoomIndex;
      return;
    }

    isRoomSwitchHydratingRef.current = true;

    // 1. Save the outgoing room's room-specific fields.
    const previousRoomIndex = previousRoomIndexRef.current;
    if (
      previousRoomIndex !== currentRoomIndex &&
      previousRoomIndex >= 0 &&
      previousRoomIndex < rooms.length
    ) {
      const outgoing = form.getValues();
      const existingCatering = rooms[previousRoomIndex]?.catering ?? {};
      globalForm.setValue(
        `multiSpace.rooms.${previousRoomIndex}.catering`,
        {
          ...existingCatering,
          catering_option: normalizeCateringOption(outgoing.catering_option),
          menu_title: outgoing.menu_title ?? "",
          menu_description: outgoing.menu_description ?? "",
          menus: (outgoing.menus as MenuType[]) ?? [],
          event_menu_category_id:
            typeof outgoing.event_menu_category_id === "number"
              ? outgoing.event_menu_category_id
              : undefined,
        },
        { shouldValidate: false, shouldDirty: true },
      );
    }
    previousRoomIndexRef.current = currentRoomIndex;

    // 2. Force-reset local form with the incoming room's own catering data.
    const scoped = rooms[currentRoomIndex]?.catering ?? {};
    form.reset({
      step: 6,
      event_id: currentEventId,
      catering_option: normalizeCateringOption(scoped.catering_option),
      menu_title: scoped.menu_title ?? "",
      menu_description: scoped.menu_description ?? "",
      event_menu_category_id:
        typeof scoped.event_menu_category_id === "number"
          ? scoped.event_menu_category_id
          : undefined,
      menus:
        Array.isArray(scoped.menus) && scoped.menus.length > 0
          ? (scoped.menus as MenuType[])
          : emptyMenus,
    });

    isRoomSwitchHydratingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoomIndex, roomScope.isMultiRoom, scopedCateringKey]);

  const setScopedCateringField = useCallback(
    (field: keyof StepSixType | "menus", value: unknown) => {
      if (roomScope.isMultiRoom) {
        globalForm.setValue(
          `multiSpace.rooms.${currentRoomIndex}.catering.${field}` as never,
          value as never,
        );
      }
      globalForm.setValue(`stepSix.${field}` as never, value as never);
    },
    [
      globalForm,
      roomScope.isMultiRoom,
      currentRoomIndex,
    ],
  );

  const clearCateringMenuDetails = useCallback(() => {
    form.setValue("menu_title", "", { shouldValidate: false });
    form.setValue("menu_description", "", { shouldValidate: false });
    form.setValue("menus", [], { shouldValidate: false });
    form.setValue("event_menu_category_id", undefined, {
      shouldValidate: false,
    });
    setScopedCateringField("menu_title", "");
    setScopedCateringField("menu_description", "");
    setScopedCateringField("menus", []);
    setScopedCateringField("event_menu_category_id", undefined);
    form.clearErrors([
      "event_menu_category_id",
      "menu_title",
      "menu_description",
      "menus",
    ]);
  }, [form, setScopedCateringField]);

  // Set showMenuSection based on catering_option value
  const cateringOption = form.watch("catering_option");
  const showMenuSection = cateringOption === 1;

  // Setup field array for menus
  const {
    fields: menuFields,
    append: appendMenu,
    remove: removeMenuField,
  } = useFieldArray({
    control: form.control,
    name: "menus",
  });

  // Custom function to remove menu and update global state
  const removeMenu = (menuIndex: number) => {
    const menusBeforeRemove = form.getValues("menus") || [];
    const removedMenu = menusBeforeRemove[menuIndex];

    // RHF field-array remove already drops the index — do NOT filter again by
    // menuIndex on the post-remove array (that wrongly deletes the new index 0).
    removeMenuField(menuIndex);

    const updatedMenus = form.getValues("menus") || [];
    setScopedCateringField("menus", updatedMenus);

    // If the deleted block matched the dropdown selection, clear it so the
    // auto-create effect does not immediately recreate the same category.
    if (removedMenu) {
      const selectedCategoryId = form.getValues("event_menu_category_id");
      const selectedCategory = localMenuCategories.find(
        (cat) => Number(cat.id) === Number(selectedCategoryId),
      );
      if (
        selectedCategory &&
        String(selectedCategory.name).trim().toLowerCase() ===
          String(removedMenu.name ?? "")
            .trim()
            .toLowerCase()
      ) {
        form.setValue("event_menu_category_id", undefined, {
          shouldValidate: false,
        });
        setScopedCateringField("event_menu_category_id", undefined);
      }
    }
  };

  const appendItem = (menuIndex: number) => {
    const currentItems = form.getValues(`menus.${menuIndex}.items`) || [];

    // Check if we've reached the maximum limit of 10 items per category
    if (currentItems.length >= 10) {
      toast.error("Maximum of 10 items allowed per category");
      return;
    }

    const newItems = [
      ...currentItems,
      createDefaultMenuItemRow(currentItems.length),
    ];

    form.setValue(`menus.${menuIndex}.items`, newItems);

    // Update global form immediately
    const currentMenus = form.getValues("menus");
    if (currentMenus && currentMenus.length > menuIndex) {
      const updatedMenus = [...currentMenus];
      updatedMenus[menuIndex].items = newItems;
      setScopedCateringField("menus", updatedMenus);
    }

    form.trigger(`menus.${menuIndex}.items`); // Trigger validation to force re-render
  };

  const handleRemoveItem = (menuIndex: number, itemIndex: number) => {
    const currentItems = form.getValues(`menus.${menuIndex}.items`);
    if (currentItems && currentItems.length > 1) {
      const newItems = currentItems.filter((_, index) => index !== itemIndex);

      // Update local form state
      form.setValue(`menus.${menuIndex}.items`, newItems);

      // Update global form state
      const currentMenus = form.getValues("menus");
      if (currentMenus && currentMenus.length > menuIndex) {
        const updatedMenus = [...currentMenus];
        updatedMenus[menuIndex].items = newItems;
        setScopedCateringField("menus", updatedMenus);
      }

      form.trigger(`menus.${menuIndex}.items`);
    } else {
      removeMenu(menuIndex);
    }
  };

  // Function to create a new menu entry
  const createMenuEntry = (categoryName: string) => {
    const normalizedCategoryName = categoryName.trim().toLowerCase();
    const currentMenus = form.getValues("menus") || [];
    const alreadyExists = currentMenus.some(
      (menu) =>
        String(menu?.name ?? "")
          .trim()
          .toLowerCase() === normalizedCategoryName,
    );
    if (alreadyExists) {
      return null;
    }

    // Check if we've reached the maximum limit of 4 menu categories
    if (currentMenus.length >= 4) {
      toast.error("Maximum of 4 menu categories allowed");
      return null;
    }

    // Create a new menu entry for this category
    const newMenu = {
      name: categoryName,
      items: [createDefaultMenuItemRow(0)],
    };

    // Add to local form
    appendMenu(newMenu);

    // Update global form
    setScopedCateringField("menus", [...currentMenus, newMenu]);
    return newMenu;
  };

  // Auto-create menu entry when category is already selected on load
  useEffect(() => {
    const categoryId = form.getValues("event_menu_category_id");
    const hasMenus = menuFields.length > 0;

    // Only create menu entry if:
    // 1. Category is selected
    // 2. Menu categories are loaded
    // 3. No menu entries exist yet
    // 4. Menu section is visible
    if (
      categoryId &&
      localMenuCategories.length > 0 &&
      !hasMenus &&
      showMenuSection
    ) {
      const selectedCategory = localMenuCategories.find(
        (cat) => cat.id === Number(categoryId),
      );

      if (selectedCategory) {
        const existingMenuIndex = menuFields.findIndex(
          (field) => field.name === selectedCategory.name,
        );

        if (existingMenuIndex === -1) {
          createMenuEntry(selectedCategory.name);
        }
      }
    }
  }, [
    form,
    localMenuCategories,
    menuFields.length,
    showMenuSection,
    createMenuEntry,
  ]);

  // Function to handle refreshing menu categories after creating a new one
  const handleMenuCategoryCreated = (newCategory?: {
    id: number;
    name: string;
  }) => {
    if (!newCategory) return;

    const category: EventMenuCategory = {
      id: newCategory.id,
      name: newCategory.name,
    };

    // Keep TanStack Query cache in sync for this room (fixes stale list after tab switch)
    queryClient.setQueryData<NormalizedMenuCategoryResponse>(
      eventKeys.menuCategories(eventId, activeRoomId),
      (previous) => {
        const existing = previous?.data ?? [];
        if (existing.some((cat) => Number(cat.id) === Number(category.id))) {
          return (
            previous ?? {
              status: true,
              message: "Success",
              data: existing,
              errors: [],
            }
          );
        }
        return {
          status: true,
          message: "Success",
          data: [...existing, category],
          errors: [],
        };
      },
    );

    setLocalMenuCategories((prev) => {
      if (prev.some((cat) => Number(cat.id) === Number(category.id))) {
        return prev;
      }
      return [...prev, category];
    });

    form.setValue("event_menu_category_id", newCategory.id);
    setScopedCateringField("event_menu_category_id", newCategory.id);

    const existingMenuIndex = (form.getValues("menus") || []).findIndex(
      (menu) =>
        String(menu?.name ?? "")
          .trim()
          .toLowerCase() === newCategory.name.trim().toLowerCase(),
    );

    if (existingMenuIndex === -1) {
      createMenuEntry(newCategory.name);
    }
  };

  const onSubmit = async (data: StepSixType, applyToAllRooms = false) => {
    setLoading(true);
    try {
      // Validate the form
      const isValid = await form.trigger();
      if (!isValid) {
        const errors = form.formState.errors;

        // Collect all error messages into a single array
        const errorMessages: string[] = [];

        // Collect validation errors for menus when catering option is Yes
        if (data.catering_option === 1) {
          if (errors.menu_title) {
            errorMessages.push(errors.menu_title.message as string);
          }
          if (errors.menu_description) {
            errorMessages.push(errors.menu_description.message as string);
          }
          if (errors.menus) {
            errorMessages.push(errors.menus.message as string);
          }
        }

        // Collect other field errors
        const otherErrorFields = Object.keys(errors).filter(
          (key) =>
            !["menu_title", "menu_description", "menus"].includes(key) ||
            data.catering_option !== 1,
        );

        if (otherErrorFields.length > 0) {
          errorMessages.push(
            `Please correct the highlighted fields: ${otherErrorFields.join(
              ", ",
            )}`,
          );
        }

        // Show single consolidated error message
        if (errorMessages.length > 0) {
          toast.error(errorMessages.join("; "));
        }

        setLoading(false);
        return;
      }

      // Update global form with step 6 data
      const baseFormData = {
        step: 6 as const,
        event_id: data.event_id,
        catering_option: data.catering_option,
      };

      // Only include menu data if catering option is Yes (1)
      if (data.catering_option === 1) {
        globalForm.setValue("stepSix", {
          ...baseFormData,
          menu_title: data.menu_title,
          menu_description: data.menu_description,
          event_menu_category_id: data.event_menu_category_id,
          menus: data.menus || [],
        });
      } else {
        // If No, only include the basic fields (no menu category)
        globalForm.setValue("stepSix", baseFormData);
      }

      // Store step 6 data with API (do not await save() here — same pattern as steps 4 & 7)
      // Only send menu-related fields if catering option is Yes
      const payload =
        data.catering_option === 1
          ? {
              step: 6 as const,
              event_id: data.event_id,
              catering_option: data.catering_option,
              menu_title: data.menu_title,
              menu_description: data.menu_description,
              menus: data.menus || [],
              event_menu_category_id: data.event_menu_category_id,
              isApproved: true as const,
            }
          : {
              step: 6 as const,
              event_id: data.event_id,
              catering_option: data.catering_option,
              isApproved: true as const,
            };

      const succeeded = await roomScope.saveSection({
        stepData: payload as StepSixType,
        applyToAllRooms,
        singleRoomSave: async () => {
          const step6Response =
            await onboardingService.storeStepSixData(payload);
          if (!step6Response || !step6Response.status) {
            return false;
          }
          globalForm.setValue("stepSix", {
            ...globalForm.getValues("stepSix"),
            isApproved: true,
          });
          return true;
        },
      });

      if (!succeeded) return;

      if (roomScope.isMultiRoom && !applyToAllRooms) {
        const updatedRooms = (globalForm.getValues("multiSpace")?.rooms ??
          []) as typeof rooms;
        if (
          focusNextIncompleteOnboardingRoom(
            updatedRooms,
            "catering",
            currentRoomIndex,
            setCurrentRoomIndex,
          )
        ) {
          return;
        }
      }

      clearActiveField();
      setActiveStep(7);

      Promise.all([save(), updateSession({ on_boarding_step: 7 })]).catch(
        (error) => {
          console.error("Background save error:", error);
        },
      );
    } catch (error) {
      console.error("Error during form submission:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start w-full min-h-screen bg-transparent">
      <div className="w-full min-w-0 max-w-none mx-auto relative">
        <OnboardingCard className="w-full mx-auto shadow-sm mb-16">
          <CardHeader className="pb-2 pt-4">
            <OnboardingTitle>
              Now Tell Us About Your Menu Options
            </OnboardingTitle>
          </CardHeader>

          <CardContent className="px-6 py-2 pb-8">
            {/* Per-room tab bar shown only when multi-space mode is enabled. */}
            <MultiSpaceHeader section="catering" />

            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                <input type="hidden" {...form.register("step")} />
                <input
                  type="hidden"
                  {...form.register("event_id", {
                    setValueAs: (value) => Number(value),
                  })}
                />

                <WholeStepGuidedShell
                  form={form}
                  sectionId="step-six-catering"
                  chipLabel="Catering & menu"
                  chipDescription="Food choices and optional menu content."
                  persistenceHydrated={persistedProgressHydrated}
                  persistedStepApproved={stepSixPersistedApproved}
                  renderFooter={({ guided }) => (
                    <GuidedWholeStepBottomActions
                      guided={guided}
                      loading={loading}
                      alwaysShowReadyLabel={roomScope.isMultiRoom}
                      labelWhenReady={
                        roomScope.isMultiRoom
                          ? "Apply to this room only"
                          : "Save & continue"
                      }
                      onContinue={() =>
                        void form.handleSubmit((data) => onSubmit(data, false))()
                      }
                      extraActions={
                        canShowApplyToAllButton(rooms, canApplyToAllRooms) ? (
                          <Button
                            variant="event-outline"
                            type="button"
                            onClick={() =>
                              void form.handleSubmit((data) =>
                                onSubmit(data, true),
                              )()
                            }
                            className={guidedOnboardingSkipButtonClass}
                          >
                            Apply to all rooms
                          </Button>
                        ) : !roomScope.isMultiRoom ? (
                          <Button
                            variant="event-outline"
                            type="button"
                            onClick={() => setActiveStep(7)}
                            className={guidedOnboardingSkipButtonClass}
                          >
                            Skip
                          </Button>
                        ) : null
                      }
                    />
                  )}
                >
                  {() => (
                    <>
                      <section
                        className={guidedInsetSectionSurfaceClass(
                          "w-full mb-4",
                        )}
                      >
                        <FormField
                          control={form.control}
                          name="catering_option"
                          render={({ field }) => (
                            <FormItem>
                              <OnboardingFieldGroupTitle>
                                Are there food choices we need to add?
                              </OnboardingFieldGroupTitle>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={(value) => {
                                    const numValue = Number(value);
                                    field.onChange(numValue);
                                    setScopedCateringField(
                                      "catering_option",
                                      numValue,
                                    );
                                    // Only clear menu payload when the user explicitly chooses "No".
                                    // Never auto-clear during hydration or room tab switches.
                                    if (numValue === 0) {
                                      clearCateringMenuDetails();
                                    }
                                  }}
                                  value={String(field.value ?? 0)}
                                  className="flex mt-4 space-x-6"
                                  onFocus={() =>
                                    handleFieldFocus("catering_option")
                                  }
                                >
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem
                                        value="1"
                                        className="text-[#009ead] h-5 w-5 data-[state=checked]:bg-[var(--color-secondary,#009ead)] data-[state=checked]:border-[var(--color-secondary,#009ead)]"
                                        onFocus={() =>
                                          handleFieldFocus("catering_option")
                                        }
                                      />
                                    </FormControl>
                                    <FormLabel className="text-lg font-medium">
                                      Yes
                                    </FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem
                                        value="0"
                                        className="text-[#009ead] h-5 w-5 data-[state=checked]:bg-[var(--color-secondary,#009ead)] data-[state=checked]:border-[var(--color-secondary,#009ead)]"
                                        onFocus={() =>
                                          handleFieldFocus("catering_option")
                                        }
                                      />
                                    </FormControl>
                                    <FormLabel className="text-lg font-medium">
                                      No
                                    </FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </section>

                      {showMenuSection && (
                        <div className="my-6 border-t border-white/10 pt-6">
                          <OnboardingFieldGroupTitle className="mb-4">
                            Menu Details
                          </OnboardingFieldGroupTitle>

                          <FormField
                            control={form.control}
                            name="menu_title"
                            render={({ field }) => {
                              const maxLength = 40;
                              const currentLength = field.value?.length || 0;
                              return (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">
                                    Menu Title
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="e.g., The Menus"
                                      className="h-10 bg-white/5 border-white/10"
                                      maxLength={maxLength}
                                      onChange={(e) => {
                                        const next = e.target.value.slice(
                                          0,
                                          maxLength,
                                        );
                                        field.onChange(next);
                                        setScopedCateringField(
                                          "menu_title",
                                          next,
                                        );
                                      }}
                                      onFocus={() =>
                                        handleFieldFocus("menu_title")
                                      }
                                    />
                                  </FormControl>
                                  <div className="flex justify-end mt-1">
                                    <span
                                      className={`text-xs ${
                                        currentLength > maxLength
                                          ? "text-destructive"
                                          : ""
                                      }`}
                                    >
                                      {currentLength}/{maxLength} characters
                                    </span>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />

                          <FormField
                            control={form.control}
                            name="menu_description"
                            render={({ field }) => {
                              const maxLength = 160;
                              const currentLength = field.value?.length || 0;
                              return (
                                <FormItem className="mt-4">
                                  <FormLabel className="text-base font-medium">
                                    Menu Description
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="e.g., Select The Menus"
                                      className="h-10 bg-white/5 border-white/10"
                                      maxLength={maxLength}
                                      onChange={(e) => {
                                        const next = e.target.value.slice(
                                          0,
                                          maxLength,
                                        );
                                        field.onChange(next);
                                        setScopedCateringField(
                                          "menu_description",
                                          next,
                                        );
                                      }}
                                      onFocus={() =>
                                        handleFieldFocus("menu_description")
                                      }
                                    />
                                  </FormControl>
                                  <div className="flex justify-end mt-1">
                                    <span
                                      className={`text-xs ${
                                        currentLength > maxLength
                                          ? "text-destructive"
                                          : ""
                                      }`}
                                    >
                                      {currentLength}/{maxLength} characters
                                    </span>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />

                          {/* Menu Category field */}
                          <FormItem className="mt-4">
                            <FormLabel className="text-base font-medium">
                              Menu Category
                            </FormLabel>
                            <Controller
                              control={form.control}
                              name="event_menu_category_id"
                              render={({ field }) => (
                                <FormControl>
                                  <MenuCategoryDropdown
                                    categories={localMenuCategories}
                                    onSelect={(value) => {
                                      field.onChange(Number(value));
                                      setScopedCateringField(
                                        "event_menu_category_id",
                                        Number(value),
                                      );

                                      // Add the selected category to the menu items if it doesn't exist
                                      const selectedCategory =
                                        localMenuCategories.find(
                                          (cat) => cat.id === Number(value),
                                        );

                                      if (selectedCategory) {
                                        const existingMenuIndex = (
                                          form.getValues("menus") || []
                                        ).findIndex(
                                          (menu) =>
                                            String(menu?.name ?? "")
                                              .trim()
                                              .toLowerCase() ===
                                            selectedCategory.name
                                              .trim()
                                              .toLowerCase(),
                                        );

                                        if (existingMenuIndex === -1) {
                                          createMenuEntry(
                                            selectedCategory.name,
                                          );
                                        }
                                      }
                                    }}
                                    isLoading={isMenuCategoriesLoading}
                                    initialValue={
                                      typeof field.value === "number"
                                        ? field.value
                                        : undefined
                                    }
                                    onCategoryCreated={
                                      handleMenuCategoryCreated
                                    }
                                    disabled={menuFields.length >= 4}
                                    eventId={getCurrentEventId()}
                                    roomId={activeRoomId}
                                  />
                                </FormControl>
                              )}
                            />
                            {form.formState.errors.event_menu_category_id && (
                              <FormMessage>
                                {
                                  form.formState.errors.event_menu_category_id
                                    .message
                                }
                              </FormMessage>
                            )}
                            {menuFields.length >= 4 && (
                              <p className="text-amber-600 text-sm mt-2">
                                Maximum limit of 4 menu categories reached.
                              </p>
                            )}
                          </FormItem>

                          {menuFields.length === 0 &&
                            form.formState.errors.menus && (
                              <FormMessage className="mt-2">
                                {form.formState.errors.menus.message}
                              </FormMessage>
                            )}

                          {menuFields.length > 0 && (
                            <div className="space-y-6 mt-4">
                              {menuFields.map((menu, menuIndex) => (
                                <div
                                  key={menu.id}
                                  className="space-y-4 rounded-lg border border-white/10 bg-white/[0.03] p-4"
                                >
                                  <div className="flex justify-between items-center">
                                    <h3 className="text-md font-semibold text-slate-100">
                                      {menu.name}
                                    </h3>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeMenu(menuIndex)}
                                      className="h-8 w-8 p-0 rounded-full"
                                    >
                                      <X size={16} />
                                    </Button>
                                  </div>

                                  <div className="space-y-4">
                                    {form
                                      .watch(`menus.${menuIndex}.items`)
                                      ?.map((item, itemIndex) => (
                                        <div
                                          key={itemIndex}
                                          className="flex flex-col gap-4"
                                        >
                                          <div className="flex gap-4 items-start">
                                            <FormField
                                              control={form.control}
                                              name={`menus.${menuIndex}.items.${itemIndex}.title`}
                                              render={({ field }) => {
                                                const maxLength = 40;
                                                const currentLength =
                                                  field.value?.length || 0;
                                                return (
                                                  <FormItem className="flex-1">
                                                    <FormLabel className="text-sm font-medium">
                                                      {menuItemTitleLabel(
                                                        itemIndex,
                                                      )}
                                                    </FormLabel>
                                                    <FormControl>
                                                      <Input
                                                        {...field}
                                                        placeholder={menuItemTitlePlaceholder(
                                                          itemIndex,
                                                        )}
                                                        className="h-10 bg-white/5 border-white/10"
                                                        maxLength={maxLength}
                                                        onChange={(e) => {
                                                          const next =
                                                            e.target.value.slice(
                                                              0,
                                                              maxLength,
                                                            );
                                                          field.onChange(next);
                                                          const currentMenus =
                                                            form.getValues(
                                                              "menus",
                                                            );
                                                          if (
                                                            currentMenus &&
                                                            currentMenus.length >
                                                              menuIndex
                                                          ) {
                                                            const updatedMenus =
                                                              [...currentMenus];
                                                            updatedMenus[
                                                              menuIndex
                                                            ].items[
                                                              itemIndex
                                                            ].title = next;
                                                            setScopedCateringField(
                                                              "menus",
                                                              updatedMenus,
                                                            );
                                                          }
                                                        }}
                                                        onFocus={() =>
                                                          handleFieldFocus(
                                                            `menus.${menuIndex}.items.${itemIndex}.title`,
                                                          )
                                                        }
                                                      />
                                                    </FormControl>
                                                    <div className="flex justify-end mt-1">
                                                      <span
                                                        className={`text-xs ${
                                                          currentLength >
                                                          maxLength
                                                            ? "text-destructive"
                                                            : ""
                                                        }`}
                                                      >
                                                        {currentLength}/
                                                        {maxLength} characters
                                                      </span>
                                                    </div>
                                                    <FormMessage />
                                                  </FormItem>
                                                );
                                              }}
                                            />
                                            <div className="pt-6">
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                  handleRemoveItem(
                                                    menuIndex,
                                                    itemIndex,
                                                  )
                                                }
                                                className="h-8 w-8 p-0 rounded-full border-red-400 text-red-500"
                                                disabled={
                                                  form.watch(
                                                    `menus.${menuIndex}.items`,
                                                  )?.length === 1
                                                }
                                              >
                                                <X size={16} />
                                              </Button>
                                            </div>
                                          </div>
                                          <FormField
                                            control={form.control}
                                            name={`menus.${menuIndex}.items.${itemIndex}.description`}
                                            render={({ field }) => {
                                              const v = field.value || "";
                                              const maxLen =
                                                RICH_DESCRIPTION_MAX_CHARS;
                                              const len = v.length;
                                              return (
                                                <FormItem>
                                                  <FormLabel className="text-sm font-medium">
                                                    Description
                                                  </FormLabel>
                                                  <FormControl>
                                                    <Input
                                                      {...field}
                                                      placeholder="e.g., Spicy chicken with basmati rice"
                                                      className="h-10 bg-white/5 border-white/10"
                                                      maxLength={maxLen}
                                                      value={v}
                                                      onChange={(e) => {
                                                        const next =
                                                          e.target.value.slice(
                                                            0,
                                                            maxLen,
                                                          );
                                                        field.onChange(next);
                                                        const currentMenus =
                                                          form.getValues(
                                                            "menus",
                                                          );
                                                        if (
                                                          currentMenus &&
                                                          currentMenus.length >
                                                            menuIndex
                                                        ) {
                                                          const updatedMenus = [
                                                            ...currentMenus,
                                                          ];
                                                          updatedMenus[
                                                            menuIndex
                                                          ].items[
                                                            itemIndex
                                                          ].description = next;
                                                          setScopedCateringField(
                                                            "menus",
                                                            updatedMenus,
                                                          );
                                                        }
                                                      }}
                                                    />
                                                  </FormControl>
                                                  <div className="flex justify-end mt-1">
                                                    <span className="text-xs text-muted-foreground">
                                                      {len}/{maxLen} characters
                                                    </span>
                                                  </div>
                                                  <FormMessage />
                                                </FormItem>
                                              );
                                            }}
                                          />
                                        </div>
                                      ))}
                                    <Button
                                      type="button"
                                      variant="event-outline"
                                      onClick={() => appendItem(menuIndex)}
                                      disabled={
                                        (form.watch(`menus.${menuIndex}.items`)
                                          ?.length || 0) >= 10
                                      }
                                      className="text-white"
                                    >
                                      <PlusCircle className="h-4 w-4 mr-2" />
                                      Add Menu Item
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </WholeStepGuidedShell>
              </form>
            </Form>
          </CardContent>
        </OnboardingCard>
      </div>
    </div>
  );
}
