"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  eventsService,
  type StepFourSavePayload,
} from "@/services/vendor/events/events.service";
import {
  capEventRoomList,
  normalizeVendorStepTwoRooms,
} from "@/lib/event-form-limits";
import {
  cloneVendorStepFourRoomMenu,
  findStepFourMenuForRoom,
  isVendorRoomMenuStepComplete,
  normalizeCateringOptionFlag,
  normalizeVendorStepFourRooms,
  resolveCateringOptionFlag,
  roomEntryToStepFourFields,
  stepFourFieldsToRoomEntry,
  syncStepFourRoomsFromStepTwo,
} from "@/app/(protected)/vendor/events/_lib/vendor-step-four-rooms";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { StepFourType, stepFourSchema } from "../schema";
import { useEventFormContext } from "../../events-form-provider";
import { toast } from "sonner";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { X, PlusCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  eventKeys,
  useEventMenuCategories,
  type NormalizedMenuCategoryResponse,
} from "@/services/vendor/events/query";
import { EventMenuCategory } from "@/services/vendor/events/type";
import { useQueryClient } from "@tanstack/react-query";
import { dedupeMenuCategoriesById } from "@/lib/event-menu-categories";
import MenuCategoryDropdown from "@/app/(on-boarding)/on-boarding/_components/steps/step-6/menu-category-dropdown";
import { FileUploader } from "@/components/ui/file-uploader";
import { addCacheBusting } from "@/lib/image-utils";
import {
  createDefaultMenuItemRow,
  menuItemTitleLabel,
  menuItemTitlePlaceholder,
  RICH_DESCRIPTION_MAX_CHARS,
} from "@/lib/event-form-limits";

const MENU_TITLE_MAX = 40;
const MENU_DESCRIPTION_MAX = RICH_DESCRIPTION_MAX_CHARS;
const MENU_ITEM_TITLE_MAX = 40;

export default function CateringTab() {
  const [isLoading, setIsLoading] = useState(false);
  const { form: globalForm, advanceStep, readOnly } = useEventFormContext();
  const [menuBackgroundImage, setMenuBackgroundImage] = useState<File[] | null>(
    null,
  );
  const previousRoomIndexRef = useRef<number | null>(null);
  const lastHydratedRoomIndexRef = useRef<number | null>(null);

  const getEventId = (): number => {
    const stepOne = globalForm.getValues().stepOne;
    return typeof stepOne === "object" && "event_id" in stepOne
      ? Number(stepOne.event_id)
      : 0;
  };

  const isRoomsEnabled = globalForm.watch("stepTwo.is_rooms") === 1;
  const activeRoomIndex = globalForm.watch("stepTwo.active_room_index") ?? 0;
  const stepTwoRooms = capEventRoomList(
    normalizeVendorStepTwoRooms(globalForm.getValues().stepTwo?.rooms),
  );
  const resolvedRoomIndex =
    stepTwoRooms.length > 0
      ? Math.min(
          Math.max(activeRoomIndex, 0),
          Math.max(stepTwoRooms.length - 1, 0),
        )
      : 0;
  const activeRoomId = Number(stepTwoRooms[resolvedRoomIndex]?.room_id) || 0;
  const activeRoomIdForCategories = useMemo(() => {
    if (!isRoomsEnabled) return undefined;
    const id = Number(stepTwoRooms[resolvedRoomIndex]?.room_id);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  }, [isRoomsEnabled, stepTwoRooms, resolvedRoomIndex]);

  const queryClient = useQueryClient();

  const resolveInitialMenuFields = () => {
    const stepFourDefaults = globalForm.getValues().stepFour;
    if (isRoomsEnabled && activeRoomId > 0) {
      const syncedRooms = syncStepFourRoomsFromStepTwo(
        stepTwoRooms,
        normalizeVendorStepFourRooms(stepFourDefaults?.rooms),
      );
      return roomEntryToStepFourFields(
        findStepFourMenuForRoom(syncedRooms, activeRoomId),
      );
    }
    return {
      catering_option: resolveCateringOptionFlag({
        catering_option: stepFourDefaults?.catering_option,
        menu_title: stepFourDefaults?.menu_title,
        menu_description: stepFourDefaults?.menu_description,
        menus: stepFourDefaults?.menus,
        event_menu_category_id: stepFourDefaults?.event_menu_category_id,
      }),
      menu_title: stepFourDefaults?.menu_title || "",
      menu_description: stepFourDefaults?.menu_description || "",
      event_menu_category_id: stepFourDefaults?.event_menu_category_id || 0,
      menus: stepFourDefaults?.menus || [],
      menu_background_image: stepFourDefaults?.menu_background_image || null,
    };
  };

  const initialMenu = resolveInitialMenuFields();
  const stepFourDefaults = globalForm.getValues().stepFour;
  const eventId = getEventId();

  const form = useForm<StepFourType>({
    resolver: zodResolver(stepFourSchema),
    defaultValues: {
      step: 4,
      event_id: eventId,
      is_rooms: isRoomsEnabled ? 1 : 0,
      ...initialMenu,
      rooms: syncStepFourRoomsFromStepTwo(
        stepTwoRooms,
        normalizeVendorStepFourRooms(stepFourDefaults?.rooms),
      ),
    } as StepFourType,
    mode: "onChange",
  });

  // Update form when eventId changes
  useEffect(() => {
    form.setValue("event_id", eventId);
  }, [eventId, form]);

  const { control, watch, setValue, getValues, reset, trigger } = form;

  const persistActiveRoomMenuToGlobal = useCallback(
    (roomIndex: number, data: StepFourType) => {
      if (!isRoomsEnabled || stepTwoRooms.length === 0) return;
      const existing = syncStepFourRoomsFromStepTwo(
        stepTwoRooms,
        normalizeVendorStepFourRooms(globalForm.getValues().stepFour?.rooms),
      );
      const roomId = Number(stepTwoRooms[roomIndex]?.room_id);
      if (!roomId) return;
      const snapshot = stepFourFieldsToRoomEntry(roomId, data);
      const nextRooms = existing.map((entry) =>
        entry.room_id === roomId ? snapshot : entry,
      );
      globalForm.setValue("stepFour.rooms", nextRooms, {
        shouldDirty: true,
        shouldValidate: false,
      });
    },
    [globalForm, isRoomsEnabled, stepTwoRooms],
  );

  useEffect(() => {
    if (!isRoomsEnabled || stepTwoRooms.length === 0) {
      previousRoomIndexRef.current = null;
      lastHydratedRoomIndexRef.current = null;
      return;
    }

    const prevIndex = previousRoomIndexRef.current;
    if (
      prevIndex !== null &&
      prevIndex >= 0 &&
      prevIndex < stepTwoRooms.length &&
      prevIndex !== resolvedRoomIndex
    ) {
      persistActiveRoomMenuToGlobal(prevIndex, getValues());
    }

    const shouldHydrate =
      lastHydratedRoomIndexRef.current === null ||
      lastHydratedRoomIndexRef.current !== resolvedRoomIndex;

    if (shouldHydrate) {
      const syncedRooms = syncStepFourRoomsFromStepTwo(
        stepTwoRooms,
        normalizeVendorStepFourRooms(globalForm.getValues().stepFour?.rooms),
      );
      const incoming = findStepFourMenuForRoom(
        syncedRooms,
        Number(stepTwoRooms[resolvedRoomIndex]?.room_id),
      );
      const fields = roomEntryToStepFourFields(incoming);
      const bg =
        fields.menu_background_image instanceof File
          ? [fields.menu_background_image]
          : null;
      setMenuBackgroundImage(bg);
      reset({
        ...getValues(),
        is_rooms: 1,
        ...fields,
        rooms: syncedRooms,
      });
      lastHydratedRoomIndexRef.current = resolvedRoomIndex;
    }

    previousRoomIndexRef.current = resolvedRoomIndex;
  }, [
    getValues,
    globalForm,
    isRoomsEnabled,
    persistActiveRoomMenuToGlobal,
    reset,
    resolvedRoomIndex,
    stepTwoRooms,
  ]);

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
    if (!isRoomsEnabled || stepTwoRooms.length < 2) return false;

    return isVendorRoomMenuStepComplete({
      room_id: activeRoomId,
      catering_option: normalizeCateringOptionFlag(watchedCateringOption),
      menu_title: watchedMenuTitle,
      menu_description: watchedMenuDescription,
      event_menu_category_id: watchedMenuCategoryId,
      menus: watchedMenus,
    });
  }, [
    isRoomsEnabled,
    stepTwoRooms.length,
    activeRoomId,
    watchedCateringOption,
    watchedMenuTitle,
    watchedMenuDescription,
    watchedMenuCategoryId,
    watchedMenus,
  ]);
  const [localMenuCategories, setLocalMenuCategories] = useState<
    EventMenuCategory[]
  >([]);

  // Fetch menu categories from API
  const { data: menuCategoriesResponse, isLoading: isMenuCategoriesLoading } =
    useEventMenuCategories({
      eventId,
      roomId: activeRoomIdForCategories,
    });

  const eventMenuCategories = useMemo(
    () => menuCategoriesResponse?.data || [],
    [menuCategoriesResponse],
  );

  useEffect(() => {
    if (eventMenuCategories.length > 0) {
      setLocalMenuCategories(dedupeMenuCategoriesById(eventMenuCategories));
      return;
    }
    if (isRoomsEnabled) {
      setLocalMenuCategories([]);
    }
  }, [eventMenuCategories, isRoomsEnabled, activeRoomIdForCategories]);

  // Keep menu details visibility in sync with catering_option (room switches, API hydrate).
  const cateringOption = watch("catering_option");
  const showMenuSection = normalizeCateringOptionFlag(cateringOption) === 1;

  // Coerce API booleans/strings ("true", true) → 0|1 so radios and visibility stay aligned.
  useEffect(() => {
    const resolved = resolveCateringOptionFlag({
      catering_option: getValues("catering_option"),
      menu_title: getValues("menu_title"),
      menu_description: getValues("menu_description"),
      menus: getValues("menus"),
      event_menu_category_id: getValues("event_menu_category_id"),
    });
    if (getValues("catering_option") !== resolved) {
      setValue("catering_option", resolved, { shouldValidate: false });
    }
  }, [eventId, getValues, setValue, resolvedRoomIndex]);

  // Clamp menu copy loaded from API (controlled inputs can show values longer than maxLength until edited).
  useEffect(() => {
    const rawTitle = form.getValues("menu_title") || "";
    if (rawTitle.length > MENU_TITLE_MAX) {
      form.setValue("menu_title", rawTitle.slice(0, MENU_TITLE_MAX));
    }
    const rawMenuDesc = form.getValues("menu_description") || "";
    if (rawMenuDesc.length > MENU_DESCRIPTION_MAX) {
      form.setValue(
        "menu_description",
        rawMenuDesc.slice(0, MENU_DESCRIPTION_MAX),
      );
    }
    const menus = form.getValues("menus");
    if (!menus?.length) return;
    const next = menus.map((m) => ({
      ...m,
      items: (m.items ?? []).map((it) => ({
        ...it,
        title: (it.title || "").slice(0, MENU_ITEM_TITLE_MAX),
        description: (it.description || "").slice(0, MENU_DESCRIPTION_MAX),
      })),
    }));
    const changed = menus.some((m, mi) =>
      (m.items ?? []).some(
        (it, ii) =>
          it.title !== next[mi].items[ii].title ||
          it.description !== next[mi].items[ii].description,
      ),
    );
    if (changed) {
      form.setValue("menus", next);
    }
  }, [eventId, form]);

  // Setup field array for menus
  const {
    fields: menuFields,
    append: appendMenu,
    remove: removeMenuField,
  } = useFieldArray({
    control,
    name: "menus",
  });

  // Custom function to remove menu and update global state
  const removeMenu = useCallback(
    (menuIndex: number) => {
      // Remove from local form
      removeMenuField(menuIndex);
    },
    [removeMenuField],
  );

  const appendItem = useCallback(
    (menuIndex: number) => {
      const currentItems = watch(`menus.${menuIndex}.items`) || [];

      // Check if we've reached the maximum limit of 10 items per category
      if (currentItems.length >= 10) {
        toast.error("You can add a maximum of 10 items per category");
        return;
      }

      const newItems = [
        ...currentItems,
        createDefaultMenuItemRow(currentItems.length),
      ];

      setValue(`menus.${menuIndex}.items`, newItems);
    },
    [watch, setValue],
  );

  const handleRemoveItem = useCallback(
    (menuIndex: number, itemIndex: number) => {
      const currentItems = watch(`menus.${menuIndex}.items`);
      if (currentItems && currentItems.length > 1) {
        const newItems = currentItems.filter(
          (_: unknown, index: number) => index !== itemIndex,
        );
        setValue(`menus.${menuIndex}.items`, newItems);
      } else {
        removeMenu(menuIndex);
      }
    },
    [watch, setValue, removeMenu],
  );

  // Function to create a new menu entry
  const createMenuEntry = useCallback(
    (categoryName: string) => {
      const normalizedCategoryName = categoryName.trim().toLowerCase();
      const currentMenus = getValues("menus") || [];
      const alreadyExists = currentMenus.some(
        (menu) =>
          String(menu?.name ?? "")
            .trim()
            .toLowerCase() === normalizedCategoryName,
      );
      if (alreadyExists) {
        return null;
      }

      if (currentMenus.length >= 4) {
        toast.error("You can add a maximum of 4 menu categories");
        return null;
      }

      const newMenu = {
        name: categoryName,
        items: [createDefaultMenuItemRow(0)],
      };

      appendMenu(newMenu);
      return newMenu;
    },
    [appendMenu, getValues],
  );

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
        const existingMenuIndex = (getValues("menus") || []).findIndex(
          (menu) =>
            String(menu?.name ?? "")
              .trim()
              .toLowerCase() === selectedCategory.name.trim().toLowerCase(),
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
    getValues,
  ]);

  const handleMenuCategoryCreated = useCallback(
    (newCategory?: { id: number; name: string }) => {
      if (!newCategory) return;

      const category: EventMenuCategory = {
        id: newCategory.id,
        name: newCategory.name,
      };

      queryClient.setQueryData<NormalizedMenuCategoryResponse>(
        eventKeys.menuCategories(eventId, activeRoomIdForCategories),
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

      setValue("event_menu_category_id", newCategory.id);

      const existingMenuIndex = (getValues("menus") || []).findIndex(
        (menu) =>
          String(menu?.name ?? "")
            .trim()
            .toLowerCase() === newCategory.name.trim().toLowerCase(),
      );

      if (existingMenuIndex === -1) {
        createMenuEntry(newCategory.name);
      }
    },
    [
      activeRoomIdForCategories,
      createMenuEntry,
      eventId,
      getValues,
      queryClient,
      setValue,
    ],
  );

  const focusFirstMenuValidationError = useCallback(() => {
    const errors = form.formState.errors;
    const messages: string[] = [];
    const walk = (node: unknown, prefix: string) => {
      if (!node || typeof node !== "object") return;
      const err = node as { message?: string; [key: string]: unknown };
      if (typeof err.message === "string" && err.message.trim()) {
        messages.push(err.message);
      }
      for (const [key, value] of Object.entries(err)) {
        if (key === "message" || key === "type" || key === "ref") continue;
        walk(value, prefix ? `${prefix}.${key}` : key);
      }
    };
    walk(errors, "");
    if (messages.length > 0) {
      toast.error(messages.slice(0, 3).join("; "));
    } else {
      toast.error("Please complete all required menu fields for this room.");
    }

    const firstKey = Object.keys(errors)[0];
    if (firstKey) {
      const errorElement = document.querySelector(`[name="${firstKey}"]`);
      if (errorElement) {
        (errorElement as HTMLElement).focus();
        errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [form.formState.errors]);

  const handleSubmit = useCallback(
    async (data: StepFourType, options?: { applyToAllRooms?: boolean }) => {
      const applyToAllRooms = options?.applyToAllRooms === true;
      setIsLoading(true);

      try {
        const roomsEnabled = globalForm.getValues().stepTwo?.is_rooms === 1;
        const stepTwoRoomsForSave = capEventRoomList(
          normalizeVendorStepTwoRooms(globalForm.getValues().stepTwo?.rooms),
        );

        let cleanedData: StepFourSavePayload;
        let mergedRoomsGlobal = syncStepFourRoomsFromStepTwo(
          stepTwoRoomsForSave,
          normalizeVendorStepFourRooms(globalForm.getValues().stepFour?.rooms),
        );

        if (roomsEnabled && stepTwoRoomsForSave.length > 0) {
          persistActiveRoomMenuToGlobal(resolvedRoomIndex, data);
          const activeSnapshot = stepFourFieldsToRoomEntry(
            Number(stepTwoRoomsForSave[resolvedRoomIndex]?.room_id),
            data,
          );
          const menuClone = cloneVendorStepFourRoomMenu(activeSnapshot);

          mergedRoomsGlobal = syncStepFourRoomsFromStepTwo(
            stepTwoRoomsForSave,
            normalizeVendorStepFourRooms(
              globalForm.getValues().stepFour?.rooms,
            ),
          ).map((entry, roomIndex) =>
            applyToAllRooms || roomIndex === resolvedRoomIndex
              ? { ...entry, ...menuClone, room_id: entry.room_id }
              : entry,
          );

          cleanedData = applyToAllRooms
            ? {
                step: 4,
                event_id: data.event_id,
                is_rooms: 1,
                rooms: mergedRoomsGlobal,
                ...roomEntryToStepFourFields(activeSnapshot),
              }
            : {
                step: 4,
                event_id: data.event_id,
                is_rooms: 1,
                room_id: activeSnapshot.room_id,
                ...roomEntryToStepFourFields(activeSnapshot),
              };
        } else {
          const { rooms: _rooms, ...flatMenu } = data;
          cleanedData = {
            ...flatMenu,
            is_rooms: 0,
            event_menu_category_id: data.event_menu_category_id || 0,
          };
        }

        globalForm.setValue("stepFour", {
          ...globalForm.getValues().stepFour,
          ...cleanedData,
          ...(cleanedData.is_rooms === 1
            ? {
                rooms: mergedRoomsGlobal,
                ...roomEntryToStepFourFields(
                  findStepFourMenuForRoom(
                    mergedRoomsGlobal,
                    Number(stepTwoRoomsForSave[resolvedRoomIndex]?.room_id),
                  ),
                ),
              }
            : {}),
        } as StepFourType);

        const response = await eventsService.storeStepFourData(cleanedData);

        if (response && response.status) {
          if (
            roomsEnabled &&
            stepTwoRoomsForSave.length > 0 &&
            !applyToAllRooms
          ) {
            const nextIncompleteIndex = stepTwoRoomsForSave.findIndex(
              (room, index) =>
                index !== resolvedRoomIndex &&
                !isVendorRoomMenuStepComplete(
                  findStepFourMenuForRoom(
                    mergedRoomsGlobal,
                    Number(room.room_id),
                  ),
                ),
            );
            if (nextIncompleteIndex !== -1) {
              globalForm.setValue(
                "stepTwo.active_room_index",
                nextIncompleteIndex,
                { shouldDirty: false, shouldTouch: false },
              );
              return;
            }
          }

          await advanceStep(4);
        }
      } catch (error) {
        console.error("Error saving catering details:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [globalForm, persistActiveRoomMenuToGlobal, resolvedRoomIndex, advanceStep],
  );

  const attemptSubmit = useCallback(
    async (applyToAllRooms: boolean) => {
      const isValid = await form.trigger();
      if (!isValid) {
        focusFirstMenuValidationError();
        return;
      }
      await handleSubmit(getValues(), { applyToAllRooms });
    },
    [focusFirstMenuValidationError, form, getValues, handleSubmit],
  );

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void attemptSubmit(false);
          }}
          className="space-y-8"
          noValidate
        >
          {/* Menu Options Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold title-header">Menu Options</h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Set food choices and menu details for your event
            </p>

            <FormField
              control={control}
              name="catering_option"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    Do you need to add food choices for this event?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        const numValue = Number(value);
                        field.onChange(numValue);
                        if (numValue === 0) {
                          setValue("menus", []);
                          globalForm.setValue("stepFour.menus", []);
                        }
                      }}
                      value={String(
                        normalizeCateringOptionFlag(field.value),
                      )}
                      className="flex mt-4 space-x-6"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            value="1"
                            className="text-[#009ead] h-5 w-5 data-[state=checked]:bg-[var(--color-background,#009ead)] data-[state=checked]:border-[var(--color-background,#009ead)]"
                          />
                        </FormControl>
                        <Label className="text-lg font-medium">Yes</Label>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            value="0"
                            className="text-[#009ead] h-5 w-5 data-[state=checked]:bg-[var(--color-background,#009ead)] data-[state=checked]:border-[var(--color-background,#009ead)]"
                          />
                        </FormControl>
                        <Label className="text-lg font-medium">No</Label>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {showMenuSection && (
            <>
              <div className="border-t border-gray-200 my-6 pt-6">
                <div className="flex items-center gap-3 title-header">
                  <h2 className="text-xl font-bold">Menu Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <FormField
                    control={control}
                    name="menu_title"
                    render={({ field }) => {
                      const v = field.value || "";
                      return (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Menu Title <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g. Our menus"
                              className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                              maxLength={MENU_TITLE_MAX}
                              value={v}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value.slice(0, MENU_TITLE_MAX),
                                )
                              }
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            {v.length}/{MENU_TITLE_MAX} characters
                          </p>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={control}
                    name="menu_description"
                    render={({ field }) => {
                      const v = field.value || "";
                      return (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Menu Description{" "}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g. Choose your menu"
                              className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                              maxLength={MENU_DESCRIPTION_MAX}
                              value={v}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value.slice(0, MENU_DESCRIPTION_MAX),
                                )
                              }
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            {v.length}/{MENU_DESCRIPTION_MAX} characters
                          </p>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                {/* Menu Category field */}
                <FormItem className="mt-4">
                  <FormLabel className="text-base font-medium">
                    Menu Category
                  </FormLabel>
                  <Controller
                    control={control}
                    name="event_menu_category_id"
                    render={({ field }) => (
                      <FormControl>
                        <MenuCategoryDropdown
                          categories={localMenuCategories}
                          onSelect={(value) => {
                            field.onChange(Number(value));

                            // Add the selected category to the menu items if it doesn't exist
                            const selectedCategory = localMenuCategories.find(
                              (cat) => cat.id === Number(value),
                            );

                            if (selectedCategory) {
                              const existingMenuIndex = (
                                getValues("menus") || []
                              ).findIndex(
                                (menu) =>
                                  String(menu?.name ?? "")
                                    .trim()
                                    .toLowerCase() ===
                                  selectedCategory.name.trim().toLowerCase(),
                              );

                              if (existingMenuIndex === -1) {
                                createMenuEntry(selectedCategory.name);
                              }
                            }
                          }}
                          isLoading={isMenuCategoriesLoading}
                          initialValue={
                            typeof field.value === "number"
                              ? field.value
                              : undefined
                          }
                          onCategoryCreated={handleMenuCategoryCreated}
                          disabled={menuFields.length >= 4}
                          eventId={eventId}
                          roomId={activeRoomIdForCategories}
                        />
                      </FormControl>
                    )}
                  />
                  {menuFields.length >= 4 && (
                    <p className="text-amber-600 text-sm mt-2">
                      Maximum limit of 4 menu categories reached.
                    </p>
                  )}
                </FormItem>

                {menuFields.length > 0 && (
                  <div className="space-y-6 mt-4">
                    {menuFields.map((menu, menuIndex) => (
                      <div
                        key={menu.id}
                        className="space-y-4 border border-[#E5E7EB] p-4 rounded-md bg-white"
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="text-md font-semibold text-[#2D2D2D]">
                            {watch(`menus.${menuIndex}.name`)}
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
                          {watch(`menus.${menuIndex}.items`)?.map(
                            (item: unknown, itemIndex: number) => (
                              <div
                                key={itemIndex}
                                className="grid grid-cols-1 gap-4 p-4 border border-gray-200 rounded-lg"
                              >
                                <div className="flex justify-end">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleRemoveItem(menuIndex, itemIndex)
                                    }
                                    className="h-8 w-8 p-0 rounded-full border-red-400 text-red-500"
                                    disabled={
                                      watch(`menus.${menuIndex}.items`)
                                        ?.length === 1
                                    }
                                  >
                                    <X size={16} />
                                  </Button>
                                </div>
                                <FormField
                                  control={control}
                                  name={`menus.${menuIndex}.items.${itemIndex}.title`}
                                  render={({ field }) => {
                                    const v = field.value || "";
                                    return (
                                      <FormItem>
                                        <FormLabel className="text-sm font-medium">
                                          {menuItemTitleLabel(itemIndex)}
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            placeholder={menuItemTitlePlaceholder(
                                              itemIndex,
                                            )}
                                            className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                                            maxLength={MENU_ITEM_TITLE_MAX}
                                            value={v}
                                            onChange={(e) =>
                                              field.onChange(
                                                e.target.value.slice(
                                                  0,
                                                  MENU_ITEM_TITLE_MAX,
                                                ),
                                              )
                                            }
                                          />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {v.length}/{MENU_ITEM_TITLE_MAX}{" "}
                                          characters
                                        </p>
                                        <FormMessage />
                                      </FormItem>
                                    );
                                  }}
                                />
                                <FormField
                                  control={control}
                                  name={`menus.${menuIndex}.items.${itemIndex}.description`}
                                  render={({ field }) => {
                                    const v = field.value || "";
                                    return (
                                      <FormItem>
                                        <FormLabel className="text-sm font-medium">
                                          Description
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            placeholder="e.g. Spicy, served with rice"
                                            className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                                            maxLength={MENU_DESCRIPTION_MAX}
                                            value={v}
                                            onChange={(e) =>
                                              field.onChange(
                                                e.target.value.slice(
                                                  0,
                                                  MENU_DESCRIPTION_MAX,
                                                ),
                                              )
                                            }
                                          />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {v.length}/{MENU_DESCRIPTION_MAX}{" "}
                                          characters
                                        </p>
                                        <FormMessage />
                                      </FormItem>
                                    );
                                  }}
                                />
                              </div>
                            ),
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => appendItem(menuIndex)}
                            disabled={
                              (watch(`menus.${menuIndex}.items`)?.length ||
                                0) >= 10
                            }
                            className="flex items-center gap-2"
                          >
                            <PlusCircle className="h-4 w-4" />
                            Add menu item
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          {showMenuSection && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="menu_background_image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">
                      Menu background image
                    </FormLabel>
                    <FormControl>
                      {typeof field.value === "string" && field.value ? (
                        <div className="relative w-full">
                          <img
                            src={addCacheBusting(field.value)}
                            alt="Menu background"
                            className="max-h-60 object-contain mx-auto mb-2 w-full"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              field.onChange(null); // instead of undefined
                              setMenuBackgroundImage(null);
                              globalForm.setValue(
                                "stepFour.menu_background_image",
                                null,
                              );
                            }}
                            className="mt-2"
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <FileUploader
                          value={menuBackgroundImage || []}
                          onValueChange={(files) => {
                            if (files.length > 0) {
                              setMenuBackgroundImage(files);
                              field.onChange(files[0]);
                              globalForm.setValue(
                                "stepFour.menu_background_image",
                                files[0],
                              );
                            }
                          }}
                          maxFileCount={1}
                          maxSize={2 * 1024 * 1024} // 2MB
                          onRemove={() => {
                            field.onChange(null);
                            setMenuBackgroundImage(null);
                            globalForm.setValue(
                              "stepFour.menu_background_image",
                              null,
                            );
                          }}
                          accept={{
                            "image/png": [".png"],
                            "image/jpeg": [".jpg", ".jpeg"],
                            "image/webp": [".webp"],
                          }}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
            {canApplyToAllRooms && (
              <Button
                type="button"
                variant="outline"
                disabled={isLoading || readOnly}
                className="w-full sm:w-auto"
                onClick={() => void attemptSubmit(true)}
              >
                {isLoading ? "Saving..." : "Apply to all rooms"}
              </Button>
            )}
            <Button
              type={isRoomsEnabled ? "button" : "submit"}
              disabled={isLoading || readOnly}
              variant="event-primary"
              className="w-full sm:w-auto"
              onClick={
                isRoomsEnabled ? () => void attemptSubmit(false) : undefined
              }
            >
              {readOnly
                ? "View only"
                : isLoading
                  ? "Saving..."
                  : isRoomsEnabled
                    ? "Apply to this room only"
                    : "Save & Next"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
