"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventsService } from "@/services/vendor/events/events.service";
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
import { useEventMenuCategories } from "@/services/vendor/events/query";
import { EventMenuCategory } from "@/services/vendor/events/type";
import MenuCategoryDropdown from "@/app/(on-boarding)/on-boarding/_components/steps/step-6/menu-category-dropdown";
import { FileUploader } from "@/components/ui/file-uploader";
import { addCacheBusting } from "@/lib/image-utils";
import { RICH_DESCRIPTION_MAX_CHARS } from "@/lib/event-form-limits";

const MENU_TITLE_MAX = 40;
const MENU_DESCRIPTION_MAX = RICH_DESCRIPTION_MAX_CHARS;
const MENU_ITEM_TITLE_MAX = 40;

export default function CateringTab() {
  const [isLoading, setIsLoading] = useState(false);
  const { form: globalForm, save, readOnly } = useEventFormContext();
  const [menuBackgroundImage, setMenuBackgroundImage] = useState<File[] | null>(
    null
  );

  // Get event_id from global form
  const getEventId = (): number => {
    const stepOne = globalForm.getValues().stepOne;
    return typeof stepOne === "object" && "event_id" in stepOne
      ? Number(stepOne.event_id)
      : 0;
  };

  // Initialize form with combined step data
  const stepFourDefaults = globalForm.getValues().stepFour;
  const eventId = getEventId();

  // Setup form with the new schema structure
  const form = useForm<StepFourType>({
    resolver: zodResolver(stepFourSchema),
    defaultValues: {
      step: 4,
      event_id: eventId,
      catering_option: stepFourDefaults?.catering_option || 0,
      menu_title: stepFourDefaults?.menu_title || "",
      menu_description: stepFourDefaults?.menu_description || "",
      event_menu_category_id: stepFourDefaults?.event_menu_category_id || 0,
      menus: stepFourDefaults?.menus || [],
      menu_background_image: stepFourDefaults?.menu_background_image || null,
    } as StepFourType,
    mode: "onChange",
  });

  // Update form when eventId changes
  useEffect(() => {
    form.setValue("event_id", eventId);
  }, [eventId, form]);

  const { control, watch, setValue } = form;
  const [showMenuSection, setShowMenuSection] = useState(false);
  const [localMenuCategories, setLocalMenuCategories] = useState<
    EventMenuCategory[]
  >([]);

  // Fetch menu categories from API
  const {
    data: menuCategoriesResponse,
    isLoading: isMenuCategoriesLoading,
    refetch: refetchMenuCategories,
  } = useEventMenuCategories();

  // Extract menu categories from response
  const eventMenuCategories = useMemo(
    () => menuCategoriesResponse?.data || [],
    [menuCategoriesResponse?.data]
  );

  // Update local state when API data changes
  useEffect(() => {
    if (eventMenuCategories.length > 0) {
      setLocalMenuCategories(eventMenuCategories);
    }
  }, [eventMenuCategories]);

  // Set showMenuSection based on catering_option value
  const cateringOption = watch("catering_option");
  useEffect(() => {
    setShowMenuSection(cateringOption === 1);
  }, [cateringOption]);

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
        rawMenuDesc.slice(0, MENU_DESCRIPTION_MAX)
      );
    }
    const menus = form.getValues("menus");
    if (!menus?.length) return;
    const next = menus.map((m) => ({
      ...m,
      items: m.items.map((it) => ({
        ...it,
        title: (it.title || "").slice(0, MENU_ITEM_TITLE_MAX),
        description: (it.description || "").slice(0, MENU_DESCRIPTION_MAX),
      })),
    }));
    const changed = menus.some((m, mi) =>
      m.items.some(
        (it, ii) =>
          it.title !== next[mi].items[ii].title ||
          it.description !== next[mi].items[ii].description
      )
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
    [removeMenuField]
  );

  const appendItem = useCallback(
    (menuIndex: number) => {
      const currentItems = watch(`menus.${menuIndex}.items`) || [];

      // Check if we've reached the maximum limit of 10 items per category
      if (currentItems.length >= 10) {
        toast.error("Maximum of 10 items allowed per category");
        return;
      }

      const newItems = [...currentItems, { title: "", description: "" }];

      setValue(`menus.${menuIndex}.items`, newItems);
    },
    [watch, setValue]
  );

  const handleRemoveItem = useCallback(
    (menuIndex: number, itemIndex: number) => {
      const currentItems = watch(`menus.${menuIndex}.items`);
      if (currentItems && currentItems.length > 1) {
        const newItems = currentItems.filter(
          (_: unknown, index: number) => index !== itemIndex
        );
        setValue(`menus.${menuIndex}.items`, newItems);
      } else {
        removeMenu(menuIndex);
      }
    },
    [watch, setValue, removeMenu]
  );

  // Function to create a new menu entry
  const createMenuEntry = useCallback(
    (categoryName: string) => {
      // Check if we've reached the maximum limit of 4 menu categories
      if (menuFields.length >= 4) {
        return null;
      }

      // Create a new menu entry for this category
      const newMenu = {
        name: categoryName,
        items: [{ title: "", description: "" }],
      };

      // Add to local form
      appendMenu(newMenu);
      return newMenu;
    },
    [menuFields.length, appendMenu]
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
        (cat) => cat.id === Number(categoryId)
      );

      if (selectedCategory) {
        const existingMenuIndex = menuFields.findIndex((field, index) => {
          const menuName = watch(`menus.${index}.name`);
          return menuName === selectedCategory.name;
        });

        if (existingMenuIndex === -1) {
          createMenuEntry(selectedCategory.name);
        }
      }
    }
  }, [
    form,
    localMenuCategories,
    menuFields,
    showMenuSection,
    createMenuEntry,
    watch,
  ]);

  // Function to handle refreshing menu categories after creating a new one
  const handleMenuCategoryCreated = useCallback(
    (newCategory?: { id: number; name: string }) => {
      // If we have the new category details, add it to local state immediately
      if (newCategory) {
        setLocalMenuCategories((prev) => [...prev, newCategory]);

        // Auto-select the new category
        setValue("event_menu_category_id", newCategory.id);

        // Create a menu entry for this category
        const existingMenuIndex = menuFields.findIndex((field, index) => {
          const menuName = watch(`menus.${index}.name`);
          return menuName === newCategory.name;
        });

        if (existingMenuIndex === -1) {
          createMenuEntry(newCategory.name);
        }
      }

      // Also refresh from API to ensure we have latest data
      refetchMenuCategories().then(() => {
        console.log("Categories refreshed from API:", eventMenuCategories);
      });
    },
    [
      refetchMenuCategories,
      setValue,
      menuFields,
      watch,
      createMenuEntry,
      eventMenuCategories,
    ]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: StepFourType) => {
      setIsLoading(true);

      try {
        // Manually re-trigger validation on all fields to force error display
        const isValid = await form.trigger();

        // If form is not valid, only highlight fields - no toast
        if (!isValid) {
          // Get all validation errors
          const errors = form.formState.errors;
          const errorFields = Object.keys(errors);

          // Find the first error field and scroll to it
          if (errorFields.length > 0) {
            // Try to find and focus the field with an error
            const errorElement = document.querySelector(
              `[name="${errorFields[0]}"]`
            );
            if (errorElement) {
              (errorElement as HTMLElement).focus();
              errorElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          }

          setIsLoading(false);
          return;
        }

        // Update global form with all fields
        const formData = {
          ...globalForm.getValues().stepFour,
          ...data,
          event_menu_category_id: data.event_menu_category_id || 0,
        };
        globalForm.setValue("stepFour", formData as StepFourType);

        // Call the API directly using eventsService
        const response = await eventsService.storeStepFourData(data);

        if (response && response.status) {
          // Success message is handled by axios interceptor
          // Move to the next step
          await save();
        } else {
          const errorMessage =
            response?.message ||
            "Failed to save catering details. Please try again.";
          toast.error("Error saving catering details", {
            description: errorMessage,
          });
        }
      } catch (error) {
        console.error("Error saving catering details:", error);
        toast.error("Failed to save catering details");
      } finally {
        setIsLoading(false);
      }
    },
    [form, globalForm, save]
  );

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          {/* Menu Options Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold title-header">Menu Options</h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Configure food choices and menu details for your event
            </p>

            <FormField
              control={control}
              name="catering_option"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    Are there food choices we need to add?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        const numValue = Number(value);
                        field.onChange(numValue);
                        setShowMenuSection(numValue === 1);
                        if (numValue === 0) {
                          setValue("menus", []);
                          globalForm.setValue("stepFour.menus", []);
                        }
                      }}
                      defaultValue={String(field.value)}
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
                              placeholder="e.g., The Menus"
                              className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                              maxLength={MENU_TITLE_MAX}
                              value={v}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value.slice(0, MENU_TITLE_MAX)
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
                              placeholder="e.g., Select The Menus"
                              className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                              maxLength={MENU_DESCRIPTION_MAX}
                              value={v}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value.slice(0, MENU_DESCRIPTION_MAX)
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
                              (cat) => cat.id === Number(value)
                            );

                            if (selectedCategory) {
                              const existingMenuIndex = menuFields.findIndex(
                                (field, index) => {
                                  const menuName = watch(`menus.${index}.name`);
                                  return menuName === selectedCategory.name;
                                }
                              );

                              if (existingMenuIndex === -1) {
                                createMenuEntry(selectedCategory.name);
                              }
                            }
                          }}
                          isLoading={isMenuCategoriesLoading}
                          initialValue={field.value}
                          onCategoryCreated={handleMenuCategoryCreated}
                          disabled={menuFields.length >= 4}
                          eventId={eventId}
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
                                          Item Title
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            placeholder="e.g., Chicken Curry"
                                            className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                                            maxLength={MENU_ITEM_TITLE_MAX}
                                            value={v}
                                            onChange={(e) =>
                                              field.onChange(
                                                e.target.value.slice(
                                                  0,
                                                  MENU_ITEM_TITLE_MAX
                                                )
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
                                            placeholder="e.g., Spicy, with rice"
                                            className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                                            maxLength={MENU_DESCRIPTION_MAX}
                                            value={v}
                                            onChange={(e) =>
                                              field.onChange(
                                                e.target.value.slice(
                                                  0,
                                                  MENU_DESCRIPTION_MAX
                                                )
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
                            )
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
                            Add Menu Item
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
                      Menu Background Image
                    </FormLabel>
                    <FormControl>
                      {typeof field.value === "string" && field.value ? (
                        <div className="relative w-full">
                          <img
                            src={addCacheBusting(field.value)}
                            alt="Menu Background"
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
                                null
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
                                files[0]
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
                              null
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
          <div className="flex justify-end gap-4 pt-4">
            <Button type="submit" disabled={isLoading || readOnly} variant="event-primary">
              {readOnly ? "View only" : isLoading ? "Saving..." : "Save & Next"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
