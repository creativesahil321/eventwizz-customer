"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
  OnboardingSectionTitle,
} from "@/components/ui/typography";
import { toast } from "sonner";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { useSession } from "next-auth/react";
import { useFieldFocusHandler } from "../../form-preview/field-focus-handler";
import { useEventId } from "../../../_lib/hooks/useEventId";
import MenuCategoryDropdown from "./menu-category-dropdown";
import { useEventMenuCategories } from "@/services/vendor/events/query";
import { EventMenuCategory } from "@/services/vendor/events/type";
import { TiptapEditor } from "@/components/ui/tiptap-editor";

// Define a type for the menu structure based on the schema
type MenuType = {
  name: string;
  items: { title: string; description: string }[];
};

// Empty initial menus - moved outside component to prevent recreation on each render
const emptyMenus: MenuType[] = [];

export default function StepSix() {
  const { form: globalForm, save, setActiveStep } = useFormContext();
  const { handleFieldFocus, clearActiveField } = useFieldFocusHandler();
  const { update: updateSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [showMenuSection, setShowMenuSection] = useState(false);
  const [localMenuCategories, setLocalMenuCategories] = useState<
    EventMenuCategory[]
  >([]);

  // Fetch menu categories from API
  const { data: menuCategoriesResponse, isLoading: isMenuCategoriesLoading } =
    useEventMenuCategories();

  // Extract menu categories from response
  const eventMenuCategories = useMemo(
    () => menuCategoriesResponse?.data || [],
    [menuCategoriesResponse]
  );

  // Update local state when API data changes
  useEffect(() => {
    if (eventMenuCategories.length > 0) {
      setLocalMenuCategories(eventMenuCategories);
    }
  }, [eventMenuCategories]);

  const initialEventId = useEventId(globalForm, "stepSix");

  // Get the existing menus from stepSeven if available
  const filteredMenus = useMemo(() => {
    // First check if we already have menus in global form
    const existingMenus = globalForm.getValues("stepSix.menus") || [];

    // Only use existing menus if they exist
    return existingMenus.length > 0
      ? existingMenus
          .map((menu) => ({
            ...menu,
            items: menu.items.filter(
              (item) =>
                item.title.trim() !== "" || item.description?.trim() !== ""
            ),
          }))
          .filter((menu) => menu.name.trim() !== "" && menu.items.length > 0)
      : [];
  }, [globalForm]);

  // Get the initial menu category ID from global form
  const initialMenuCategoryId = useMemo(() => {
    const savedId = globalForm.getValues("stepSix.event_menu_category_id");
    return savedId && !isNaN(Number(savedId)) ? Number(savedId) : undefined;
  }, [globalForm]);

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

  // Set showMenuSection based on catering_option value
  const cateringOption = form.watch("catering_option");
  useEffect(() => {
    setShowMenuSection(cateringOption === 1);

    // If catering option is "No" (0), clear the menu category field
    if (cateringOption === 0) {
      form.setValue("event_menu_category_id", undefined);
      globalForm.setValue("stepSix.event_menu_category_id", undefined);
      // Clear any validation errors for menu-related fields
      form.clearErrors([
        "event_menu_category_id",
        "menu_title",
        "menu_description",
        "menus",
      ]);
    }
  }, [cateringOption, form, globalForm]);

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
    // Remove from local form
    removeMenuField(menuIndex);

    // Update global form
    const currentMenus = form.getValues("menus");
    const updatedMenus = currentMenus?.filter((_, idx) => idx !== menuIndex);
    globalForm.setValue("stepSix.menus", updatedMenus || []);
  };

  const appendItem = (menuIndex: number) => {
    const currentItems = form.getValues(`menus.${menuIndex}.items`) || [];
    
    // Check if we've reached the maximum limit of 10 items per category
    if (currentItems.length >= 10) {
      toast.error("Maximum of 10 items allowed per category");
      return;
    }
    
    const newItems = [...currentItems, { title: "", description: "" }];

    form.setValue(`menus.${menuIndex}.items`, newItems);

    // Update global form immediately
    const currentMenus = form.getValues("menus");
    if (currentMenus && currentMenus.length > menuIndex) {
      const updatedMenus = [...currentMenus];
      updatedMenus[menuIndex].items = newItems;
      globalForm.setValue("stepSix.menus", updatedMenus);
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
        globalForm.setValue("stepSix.menus", updatedMenus);
      }

      form.trigger(`menus.${menuIndex}.items`);
    } else {
      removeMenu(menuIndex);
    }
  };

  // Function to create a new menu entry
  const createMenuEntry = (categoryName: string) => {
    // Check if we've reached the maximum limit of 4 menu categories
    if (menuFields.length >= 4) {
      toast.error("Maximum of 4 menu categories allowed");
      return null;
    }

    // Create a new menu entry for this category
    const newMenu = {
      name: categoryName,
      items: [{ title: "", description: "" }],
    };

    // Add to local form
    appendMenu(newMenu);

    // Update global form
    const currentMenus = form.getValues("menus") || [];
    globalForm.setValue("stepSix.menus", [...currentMenus, newMenu]);
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
        (cat) => cat.id === Number(categoryId)
      );

      if (selectedCategory) {
        const existingMenuIndex = menuFields.findIndex(
          (field) => field.name === selectedCategory.name
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
    // If we have the new category details, add it to local state immediately
    if (newCategory) {
      setLocalMenuCategories((prev) => [...prev, newCategory]);

      // Auto-select the new category
      form.setValue("event_menu_category_id", newCategory.id);
      globalForm.setValue("stepSix.event_menu_category_id", newCategory.id);

      // Create a menu entry for this category
      const existingMenuIndex = menuFields.findIndex(
        (field) => field.name === newCategory.name
      );

      if (existingMenuIndex === -1) {
        createMenuEntry(newCategory.name);
      }
    }

    // Note: We don't need to refetch since we already updated local state
    // The API interceptor will handle success toasts automatically
  };

  const onSubmit = async (data: StepSixType) => {
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
            data.catering_option !== 1
        );

        if (otherErrorFields.length > 0) {
          errorMessages.push(
            `Please correct the highlighted fields: ${otherErrorFields.join(
              ", "
            )}`
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

      // Save to global form
      await save();

      // Store step 6 data with API
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
            }
          : {
              step: 6 as const,
              event_id: data.event_id,
              catering_option: data.catering_option,
            };

      const step6Response = await onboardingService.storeStepSixData(payload);

      if (!step6Response || !step6Response.status) {
        throw new Error("Failed to save catering options");
      }

      clearActiveField();

      // INSTANT TRANSITION: Set active step FIRST for smooth UX
      setActiveStep(7);

      // Then handle async operations in background
      updateSession({ on_boarding_step: 7 }).catch((error) => {
        console.error("Background save error:", error);
      });
    } catch (error) {
      console.error("Error during form submission:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start w-full min-h-screen bg-transparent">
      <div className="w-full max-w-4xl mx-auto relative">
        <OnboardingCard className="w-full mx-auto shadow-sm mb-16">
          <CardHeader className="pb-2 pt-4">
            <OnboardingTitle>
              Now Tell Us About Your Menu Options
            </OnboardingTitle>
          </CardHeader>

          <CardContent className="px-6 py-2 pb-8">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <input type="hidden" {...form.register("step")} />
                <input
                  type="hidden"
                  {...form.register("event_id", {
                    setValueAs: (value) => Number(value),
                  })}
                />

                <section className="w-full mb-4">
                  <FormField
                    control={form.control}
                    name="catering_option"
                    render={({ field }) => (
                      <FormItem>
                        <OnboardingSectionTitle className="text-xl font-medium">
                          Are there food choices we need to add?
                        </OnboardingSectionTitle>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => {
                              const numValue = Number(value);
                              field.onChange(numValue);
                              globalForm.setValue(
                                "stepSix.catering_option",
                                numValue
                              );
                              setShowMenuSection(numValue === 1);
                            }}
                            defaultValue={String(field.value)}
                            className="flex mt-4 space-x-6"
                            onFocus={() => handleFieldFocus("catering_option")}
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
                  <div className="border-t border-gray-200 my-6 pt-6">
                    <OnboardingSectionTitle className="text-xl font-medium mb-4">
                      Menu Details
                    </OnboardingSectionTitle>

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
                                className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                                maxLength={maxLength}
                                onChange={(e) => {
                                  field.onChange(e);
                                  globalForm.setValue(
                                    "stepSix.menu_title",
                                    e.target.value
                                  );
                                }}
                                onFocus={() => handleFieldFocus("menu_title")}
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
                                className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                                maxLength={maxLength}
                                onChange={(e) => {
                                  field.onChange(e);
                                  globalForm.setValue(
                                    "stepSix.menu_description",
                                    e.target.value
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
                                globalForm.setValue(
                                  "stepSix.event_menu_category_id",
                                  Number(value)
                                );

                                // Add the selected category to the menu items if it doesn't exist
                                const selectedCategory =
                                  localMenuCategories.find(
                                    (cat) => cat.id === Number(value)
                                  );

                                if (selectedCategory) {
                                  const existingMenuIndex =
                                    menuFields.findIndex(
                                      (field) =>
                                        field.name === selectedCategory.name
                                    );

                                  if (existingMenuIndex === -1) {
                                    createMenuEntry(selectedCategory.name);
                                  }
                                }
                              }}
                              isLoading={isMenuCategoriesLoading}
                              initialValue={initialMenuCategoryId}
                              onCategoryCreated={handleMenuCategoryCreated}
                              disabled={menuFields.length >= 4}
                              eventId={getCurrentEventId()}
                            />
                          </FormControl>
                        )}
                      />
                      {form.formState.errors.event_menu_category_id && (
                        <FormMessage>
                          {form.formState.errors.event_menu_category_id.message}
                        </FormMessage>
                      )}
                      {menuFields.length >= 4 && (
                        <p className="text-amber-600 text-sm mt-2">
                          Maximum limit of 4 menu categories reached.
                        </p>
                      )}
                    </FormItem>

                    {menuFields.length === 0 && form.formState.errors.menus && (
                      <FormMessage className="mt-2">
                        {form.formState.errors.menus.message}
                      </FormMessage>
                    )}

                    {menuFields.length > 0 && (
                      <div className="space-y-6 mt-4">
                        {menuFields.map((menu, menuIndex) => (
                          <div
                            key={menu.id}
                            className="space-y-4 border border-[#E5E7EB] p-4 rounded-md bg-white"
                          >
                            <div className="flex justify-between items-center">
                              <h3 className="text-md font-semibold text-[#2D2D2D]">
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
                                                Item Title
                                              </FormLabel>
                                              <FormControl>
                                                <Input
                                                  {...field}
                                                  placeholder="e.g., Chicken Curry"
                                                  className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                                                  maxLength={maxLength}
                                                  onChange={(e) => {
                                                    field.onChange(e);
                                                    // Update global form immediately
                                                    const currentMenus =
                                                      form.getValues("menus");
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
                                                      ].items[itemIndex].title =
                                                        e.target.value;
                                                      globalForm.setValue(
                                                        "stepSix.menus",
                                                        updatedMenus
                                                      );
                                                    }
                                                  }}
                                                  onFocus={() =>
                                                    handleFieldFocus(
                                                      `menus.${menuIndex}.items.${itemIndex}.title`
                                                    )
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
                                                  {currentLength}/{maxLength}{" "}
                                                  characters
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
                                              itemIndex
                                            )
                                          }
                                          className="h-8 w-8 p-0 rounded-full border-red-400 text-red-500"
                                          disabled={
                                            form.watch(
                                              `menus.${menuIndex}.items`
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
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-sm font-medium">
                                            Description
                                          </FormLabel>
                                          <FormControl>
                                            <TiptapEditor
                                              value={field.value || ""}
                                              onChange={(value) => {
                                                field.onChange(value);
                                                // Update global form immediately
                                                const currentMenus =
                                                  form.getValues("menus");
                                                if (
                                                  currentMenus &&
                                                  currentMenus.length >
                                                    menuIndex
                                                ) {
                                                  const updatedMenus = [
                                                    ...currentMenus,
                                                  ];
                                                  updatedMenus[menuIndex].items[
                                                    itemIndex
                                                  ].description = value;
                                                  globalForm.setValue(
                                                    "stepSix.menus",
                                                    updatedMenus
                                                  );
                                                }
                                              }}
                                              placeholder="e.g., Spicy chicken with basmati rice"
                                              className="min-h-[80px] w-full overflow-hidden max-w-[200px]"
                                              maxLength={160}
                                              wrapText={true}
                                              showAIButton={false}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
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

                <div className="flex items-center justify-center gap-4 pt-4 mt-6">
                  <Button
                    variant="event-primary"
                    type="submit"
                    className="rounded-full px-8 py-2"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save & Next"}
                  </Button>
                  <Button
                    variant="event-secondary"
                    type="button"
                    onClick={() => setActiveStep(7)}
                    className="rounded-full px-8 py-2"
                  >
                    Skip
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </OnboardingCard>
      </div>
    </div>
  );
}
