"use client";

import { LongTextInput } from "@/components/ui/long-text-input";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm, useFieldArray, Resolver, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  eventsService,
  type StepSixSavePayload,
} from "@/services/vendor/events/events.service";
import {
  capEventRoomList,
  normalizeVendorStepTwoRooms,
} from "@/lib/event-form-limits";
import {
  cloneVendorStepSixRoomDrinks,
  emptyVendorDrinkPackage,
  findStepSixDrinksForRoom,
  isVendorRoomDrinksStepComplete,
  normalizeDrinksOptionFlag,
  normalizeVendorStepSixRooms,
  resolveDrinksOptionFlag,
  roomEntryToStepSixFields,
  stepSixFieldsToRoomEntry,
  syncStepSixRoomsFromStepTwo,
} from "@/app/(protected)/vendor/events/_lib/vendor-step-six-rooms";
import {
  isVendorEventStructureLocked,
  vendorEventStructureLockMessage,
} from "@/app/(protected)/vendor/events/_lib/vendor-event-lifecycle";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { StepSixType, stepSixSchema } from "../schema";
import { useEventFormContext } from "../../events-form-provider";
import { toast } from "sonner";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { X, PlusCircle } from "lucide-react";
import { useCurrencySymbol } from "@/hooks/use-currency-format";
import {
  DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS,
  DRINK_SECTION_DESCRIPTION_MAX_CHARS,
  DRINK_SECTION_TITLE_MAX_CHARS,
  RICH_DESCRIPTION_MAX_CHARS,
  clampDrinkPackagePrice,
  clampDrinkPackageQuantity,
  DRINK_PACKAGE_PRICE_MAX,
  DRINK_PACKAGE_QTY_MAX,
} from "@/lib/event-form-limits";

export default function DrinksTab() {
  const currencySymbol = useCurrencySymbol();
  const [isLoading, setIsLoading] = useState(false);
  const {
    form: globalForm,
    advanceStep,
    markEventFormSaved,
    setActiveField,
    readOnly,
  } = useEventFormContext();

  // Get event_id from global form
  const getEventId = (): number => {
    const stepOne = globalForm.getValues().stepOne;
    return typeof stepOne === "object" && "event_id" in stepOne
      ? Number(stepOne.event_id)
      : 0;
  };

  const isRoomsEnabled = globalForm.watch("stepTwo.is_rooms") === 1;
  const lockStructure = isVendorEventStructureLocked({
    is_live: globalForm.watch("is_live"),
    has_bookings: globalForm.watch("has_bookings"),
  });
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
  const previousRoomIndexRef = useRef<number | null>(null);
  const lastHydratedRoomIndexRef = useRef<number | null>(null);

  const resolveInitialDrinkFields = () => {
    const defaults = globalForm.getValues().stepSix;
    if (isRoomsEnabled && Number(stepTwoRooms[resolvedRoomIndex]?.room_id) > 0) {
      const syncedRooms = syncStepSixRoomsFromStepTwo(
        stepTwoRooms,
        normalizeVendorStepSixRooms(defaults?.rooms),
      );
      const incoming = findStepSixDrinksForRoom(
        syncedRooms,
        Number(stepTwoRooms[resolvedRoomIndex]?.room_id),
      );
      return {
        ...roomEntryToStepSixFields(incoming),
        rooms: syncedRooms,
      };
    }
    return {
      drinks_option: resolveDrinksOptionFlag({
        drinks_option: defaults?.drinks_option,
        drink_title: defaults?.drink_title,
        drink_description: defaults?.drink_description,
        packages: defaults?.packages,
      }),
      drink_title: defaults?.drink_title || "",
      drink_description: defaults?.drink_description || "",
      packages: defaults?.packages || [],
    };
  };

  const initialDrinks = resolveInitialDrinkFields();

  const form = useForm<StepSixType>({
    resolver: zodResolver(stepSixSchema) as Resolver<StepSixType>,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      step: 6,
      event_id: getEventId() || 0,
      is_rooms: isRoomsEnabled ? 1 : 0,
      rooms: "rooms" in initialDrinks ? initialDrinks.rooms : undefined,
      drinks_option: initialDrinks.drinks_option ?? 0,
      drink_title: initialDrinks.drink_title || "",
      drink_description: initialDrinks.drink_description || "",
      packages: (initialDrinks.packages || []).map((pkg) => ({
        ...pkg,
        available_quantity:
          typeof pkg.available_quantity === "number"
            ? pkg.available_quantity
            : 100,
      })),
    },
  });

  const { control, getValues, reset, setValue, watch } = form;

  // Setup field array for packages
  const {
    fields: packageFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "packages",
  });

  // Handle field focus for tracking active field
  const handleFieldFocus = useCallback(
    (fieldName: string) => {
      setActiveField?.(fieldName);
    },
    [setActiveField],
  );

  const persistActiveRoomDrinksToGlobal = useCallback(
    (roomIndex: number, data: StepSixType) => {
      if (!isRoomsEnabled || stepTwoRooms.length === 0) return;
      const existing = syncStepSixRoomsFromStepTwo(
        stepTwoRooms,
        normalizeVendorStepSixRooms(globalForm.getValues().stepSix?.rooms),
      );
      const roomId = Number(stepTwoRooms[roomIndex]?.room_id);
      if (!roomId) return;
      const snapshot = stepSixFieldsToRoomEntry(roomId, data);
      const nextRooms = existing.map((entry) =>
        entry.room_id === roomId ? snapshot : entry,
      );
      globalForm.setValue("stepSix.rooms", nextRooms as StepSixType["rooms"], {
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
      persistActiveRoomDrinksToGlobal(prevIndex, getValues());
    }

    const shouldHydrate =
      lastHydratedRoomIndexRef.current === null ||
      lastHydratedRoomIndexRef.current !== resolvedRoomIndex;

    if (shouldHydrate) {
      const syncedRooms = syncStepSixRoomsFromStepTwo(
        stepTwoRooms,
        normalizeVendorStepSixRooms(globalForm.getValues().stepSix?.rooms),
      );
      const incoming = findStepSixDrinksForRoom(
        syncedRooms,
        Number(stepTwoRooms[resolvedRoomIndex]?.room_id),
      );
      const fields = roomEntryToStepSixFields(incoming);
      reset({
        ...getValues(),
        is_rooms: 1,
        ...fields,
        rooms: syncedRooms as StepSixType["rooms"],
      });
      lastHydratedRoomIndexRef.current = resolvedRoomIndex;
    }

    previousRoomIndexRef.current = resolvedRoomIndex;
  }, [
    getValues,
    globalForm,
    isRoomsEnabled,
    persistActiveRoomDrinksToGlobal,
    reset,
    resolvedRoomIndex,
    stepTwoRooms,
  ]);

  const watchedDrinksOption = useWatch({
    control: form.control,
    name: "drinks_option",
  });
  const watchedDrinkTitle = useWatch({
    control: form.control,
    name: "drink_title",
  });
  const watchedDrinkDescription = useWatch({
    control: form.control,
    name: "drink_description",
  });
  const watchedDrinkPackages = useWatch({
    control: form.control,
    name: "packages",
  });

  const canApplyToAllRooms = useMemo(() => {
    if (!isRoomsEnabled || stepTwoRooms.length < 2) return false;
    return isVendorRoomDrinksStepComplete({
      drinks_option: normalizeDrinksOptionFlag(watchedDrinksOption),
      drink_title: watchedDrinkTitle,
      drink_description: watchedDrinkDescription,
      packages: watchedDrinkPackages,
    });
  }, [
    isRoomsEnabled,
    stepTwoRooms.length,
    watchedDrinksOption,
    watchedDrinkTitle,
    watchedDrinkDescription,
    watchedDrinkPackages,
  ]);

  const drinksOption = watch("drinks_option");
  const showDrinksSection = normalizeDrinksOptionFlag(drinksOption) === 1;

  useEffect(() => {
    const resolved = resolveDrinksOptionFlag({
      drinks_option: getValues("drinks_option"),
      drink_title: getValues("drink_title"),
      drink_description: getValues("drink_description"),
      packages: getValues("packages"),
    });
    if (getValues("drinks_option") !== resolved) {
      setValue("drinks_option", resolved, {
        shouldValidate: false,
        shouldDirty: false,
      });
    }
  }, [getValues, setValue, resolvedRoomIndex]);

  // Sync local form with global form (flat mode only)
  useEffect(() => {
    if (isRoomsEnabled) return;
    const subscription = form.watch((value) => {
      if (value) {
        globalForm.setValue("stepSix", value as StepSixType, {
          shouldDirty: true,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [form, globalForm, isRoomsEnabled]);

  const handleSubmit = useCallback(
    async (data: StepSixType, options?: { applyToAllRooms?: boolean }) => {
      const applyToAllRooms = options?.applyToAllRooms === true;
      setIsLoading(true);

      try {
        const isValid = await form.trigger();

        if (!isValid) {
          const errors = form.formState.errors;
          const errorFields = Object.keys(errors);

          if (errorFields.length > 0) {
            setActiveField(errorFields[0]);
            const errorElement = document.querySelector(
              `[name="${errorFields[0]}"]`,
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

        const roomsEnabled = globalForm.getValues().stepTwo?.is_rooms === 1;
        const stepTwoRoomsForSave = capEventRoomList(
          normalizeVendorStepTwoRooms(globalForm.getValues().stepTwo?.rooms),
        );

        let cleanedData: StepSixSavePayload;
        let mergedRoomsGlobal = syncStepSixRoomsFromStepTwo(
          stepTwoRoomsForSave,
          normalizeVendorStepSixRooms(globalForm.getValues().stepSix?.rooms),
        );

        if (roomsEnabled && stepTwoRoomsForSave.length > 0) {
          persistActiveRoomDrinksToGlobal(resolvedRoomIndex, data);
          const activeSnapshot = stepSixFieldsToRoomEntry(
            Number(stepTwoRoomsForSave[resolvedRoomIndex]?.room_id),
            data,
          );
          const drinksClone = cloneVendorStepSixRoomDrinks(activeSnapshot);

          mergedRoomsGlobal = syncStepSixRoomsFromStepTwo(
            stepTwoRoomsForSave,
            normalizeVendorStepSixRooms(globalForm.getValues().stepSix?.rooms),
          ).map((entry, roomIndex) =>
            applyToAllRooms || roomIndex === resolvedRoomIndex
              ? { ...entry, ...drinksClone, room_id: entry.room_id }
              : entry,
          );

          const activeRoomIdForSave = Number(
            stepTwoRoomsForSave[resolvedRoomIndex]?.room_id,
          );
          const roomsForApi = applyToAllRooms
            ? mergedRoomsGlobal
            : mergedRoomsGlobal.filter(
                (entry) => entry.room_id === activeRoomIdForSave,
              );

          cleanedData = {
            step: 6,
            event_id: data.event_id,
            drinks_option: data.drinks_option,
            is_rooms: 1,
            rooms: roomsForApi,
            drink_title: data.drink_title,
            drink_description: data.drink_description,
            packages: data.packages,
          };
        } else {
          const { rooms: _rooms, is_rooms: _isRooms, ...flatData } = data;
          cleanedData = {
            ...flatData,
            is_rooms: 0,
          };
        }

        globalForm.setValue("stepSix", {
          ...globalForm.getValues().stepSix,
          ...cleanedData,
          ...(cleanedData.is_rooms === 1
            ? {
                rooms: mergedRoomsGlobal as StepSixType["rooms"],
                ...roomEntryToStepSixFields(
                  findStepSixDrinksForRoom(
                    mergedRoomsGlobal,
                    Number(stepTwoRoomsForSave[resolvedRoomIndex]?.room_id),
                  ),
                ),
              }
            : {}),
        } as StepSixType);

        const response = await eventsService.storeStepSixData(cleanedData);

        if (response && response.status) {
          if (
            roomsEnabled &&
            stepTwoRoomsForSave.length > 0 &&
            !applyToAllRooms
          ) {
            const nextIncompleteIndex = stepTwoRoomsForSave.findIndex(
              (room, index) =>
                index !== resolvedRoomIndex &&
                !isVendorRoomDrinksStepComplete(
                  findStepSixDrinksForRoom(
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
              markEventFormSaved(6);
              return;
            }
          }

          await advanceStep(6, response);
        } else {
          console.error("Error saving drink details:", response);
        }
      } catch (error) {
        console.error("Error saving drink details:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      form,
      globalForm,
      advanceStep,
      markEventFormSaved,
      persistActiveRoomDrinksToGlobal,
      resolvedRoomIndex,
      setActiveField,
    ],
  );

  const attemptSubmit = useCallback(
    (applyToAllRooms: boolean) => {
      void form.handleSubmit((data) =>
        handleSubmit(data, { applyToAllRooms }),
      )();
    },
    [form, handleSubmit],
  );

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            attemptSubmit(false);
          }}
          className="space-y-8"
          noValidate
        >
          <div className="space-y-4">
            <h2 className="text-xl font-bold title-header">Drinks & extras</h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Optional add-ons for this event. Choose No to skip this step.
            </p>

            <FormField
              control={control}
              name="drinks_option"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    Do you want to add drinks & extras for this event?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        if (readOnly || lockStructure) return;
                        const numValue = Number(value);
                        field.onChange(numValue);
                        if (numValue === 0) {
                          setValue("packages", []);
                          globalForm.setValue("stepSix.packages", []);
                          form.clearErrors([
                            "drink_title",
                            "drink_description",
                            "packages",
                          ]);
                        } else if (
                          (getValues("packages") ?? []).length === 0
                        ) {
                          setValue("packages", [emptyVendorDrinkPackage()]);
                        }
                      }}
                      value={String(normalizeDrinksOptionFlag(field.value))}
                      className="flex mt-4 space-x-6"
                      disabled={readOnly || lockStructure}
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            value="1"
                            disabled={readOnly || lockStructure}
                            className="text-[#009ead] h-5 w-5 data-[state=checked]:bg-[var(--color-background,#009ead)] data-[state=checked]:border-[var(--color-background,#009ead)]"
                          />
                        </FormControl>
                        <Label className="text-lg font-medium">Yes</Label>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            value="0"
                            disabled={readOnly || lockStructure}
                            className="text-[#009ead] h-5 w-5 data-[state=checked]:bg-[var(--color-background,#009ead)] data-[state=checked]:border-[var(--color-background,#009ead)]"
                          />
                        </FormControl>
                        <Label className="text-lg font-medium">No</Label>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                  {lockStructure ? (
                    <p className="text-xs text-muted-foreground">
                      {vendorEventStructureLockMessage("drinks")}
                    </p>
                  ) : null}
                </FormItem>
              )}
            />
          </div>

          {showDrinksSection && (
            <>
          {/* Package Options Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold title-header">
                Package Options
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={control}
                name="drink_title"
                render={({ field }) => {
                  const currentLength = field.value?.length || 0;
                  const maxLength = DRINK_SECTION_TITLE_MAX_CHARS;
                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Title <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. VIP Packages, Premium Access, etc."
                          className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                          maxLength={maxLength}
                          onFocus={() => handleFieldFocus("drink_title")}
                        />
                      </FormControl>
                      <div className="text-xs text-gray-500 mt-1">
                        <span
                          className={
                            currentLength > maxLength ? "text-red-500" : ""
                          }
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
                control={control}
                name="drink_description"
                render={({ field }) => {
                  const currentLength = field.value?.length || 0;
                  const maxLength = DRINK_SECTION_DESCRIPTION_MAX_CHARS;
                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Description <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <LongTextInput
                          {...field}
                          placeholder="e.g. Please note: Special terms and conditions apply..."
                          className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                          maxLength={maxLength}
                          onFocus={() => handleFieldFocus("drink_description")}
                        />
                      </FormControl>
                      <div className="text-xs text-gray-500 mt-1">
                        <span
                          className={
                            currentLength > maxLength ? "text-red-500" : ""
                          }
                        >
                          {currentLength}/{maxLength} characters
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </div>

          {/* Package Deals Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold title-header">
                Package Deals
              </h3>
              {packageFields.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    append({
                      title: "",
                      description: "",
                      price: 0,
                      available_quantity: 100,
                    })
                  }
                  className="flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add another package
                </Button>
              )}
            </div>

            <div className="space-y-6">
              {packageFields.map((field, index) => (
                <div
                  key={field.id}
                  className="space-y-4 border border-[#E5E7EB] p-6 rounded-md bg-white"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Package {index + 1}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (packageFields.length <= 1) {
                          toast.error("At least one package is required");
                          return;
                        }
                        remove(index);
                      }}
                      disabled={packageFields.length <= 1}
                      className="h-8 w-8 p-0 rounded-full border-red-400 text-red-500"
                    >
                      <X size={16} />
                    </Button>
                  </div>

                  <FormField
                    control={control}
                    name={`packages.${index}.title`}
                    render={({ field }) => {
                      const currentLength = field.value?.length || 0;
                      const maxLength = DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS;
                      return (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Package Heading
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g. Premium Package A"
                              className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                              maxLength={maxLength}
                              onFocus={() =>
                                handleFieldFocus(`packages.${index}.title`)
                              }
                            />
                          </FormControl>
                          <div className="text-xs text-gray-500 mt-1">
                            <span
                              className={
                                currentLength > maxLength ? "text-red-500" : ""
                              }
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
                    control={control}
                    name={`packages.${index}.description`}
                    render={({ field }) => {
                      const currentLength = field.value?.length || 0;
                      const maxLength = RICH_DESCRIPTION_MAX_CHARS;
                      return (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Package Description
                          </FormLabel>
                          <FormControl>
                            <LongTextInput
                              {...field}
                              placeholder="e.g. Includes premium access and special amenities…"
                              className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                              maxLength={maxLength}
                            />
                          </FormControl>
                          <div className="text-xs text-gray-500 mt-1">
                            <span
                              className={
                                currentLength > maxLength ? "text-red-500" : ""
                              }
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
                    control={control}
                    name={`packages.${index}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Package price <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                            placeholder={`${currencySymbol}0.00`}
                            value={field.value === 0 ? "" : (field.value ?? "")}
                            onFocus={() =>
                              handleFieldFocus(`packages.${index}.price`)
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || value === null) {
                                field.onChange("");
                                return;
                              }
                              const numValue = Number.parseFloat(value);
                              if (!Number.isFinite(numValue)) return;
                              field.onChange(clampDrinkPackagePrice(numValue));
                            }}
                            max={DRINK_PACKAGE_PRICE_MAX}
                            onBlur={() => {
                              // Keep empty string on blur - validation will catch it
                              field.onBlur();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name={`packages.${index}.available_quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Available quantity{" "}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                            placeholder="e.g. 100"
                            min="1"
                            max={DRINK_PACKAGE_QTY_MAX}
                            onFocus={() =>
                              handleFieldFocus(
                                `packages.${index}.available_quantity`,
                              )
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "") {
                                field.onChange("" as unknown as number);
                                return;
                              }
                              const n = Number(v);
                              if (!Number.isFinite(n)) return;
                              field.onChange(clampDrinkPackageQuantity(n));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
            {canApplyToAllRooms && (
              <Button
                type="button"
                variant="outline"
                disabled={isLoading || readOnly}
                className="w-full sm:w-auto"
                onClick={() => attemptSubmit(true)}
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
                isRoomsEnabled ? () => attemptSubmit(false) : undefined
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
