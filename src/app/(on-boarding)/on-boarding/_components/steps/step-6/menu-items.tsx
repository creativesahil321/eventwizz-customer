import { LongTextInput } from "@/components/ui/long-text-input";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useEffect } from "react";
import { Controller, useFieldArray, UseFormReturn } from "react-hook-form";
import { StepSixType } from "../../form-provider/schema";
import {
  createDefaultMenuItemRow,
  menuItemTitleLabel,
  menuItemTitlePlaceholder,
} from "@/lib/event-form-limits";

export default function MenuItems({
  menuIndex,
  form,
}: {
  menuIndex: number;
  form: UseFormReturn<StepSixType>;
}) {
  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control: form.control,
    name: `menus.${menuIndex}.items`,
  });

  useEffect(() => {
    if (itemFields.length === 0) {
      appendItem(createDefaultMenuItemRow(0));
    }
  }, [itemFields, appendItem]);

  return (
    <div className="space-y-4">
      {itemFields.map((itemField, itemIdx) => (
        <div key={itemField.id} className="flex gap-4 items-center">
          <Controller
            control={form.control}
            name={`menus.${menuIndex}.items.${itemIdx}.title`}
            defaultValue={itemField.title || ""}
            render={({ field, fieldState: { error } }) => (
              <FormItem className="w-full">
                <FormLabel>{menuItemTitleLabel(itemIdx)}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={menuItemTitlePlaceholder(itemIdx)}
                    {...field}
                  />
                </FormControl>
                {error && <FormMessage>{error.message}</FormMessage>}
              </FormItem>
            )}
          />
          <Controller
            control={form.control}
            name={`menus.${menuIndex}.items.${itemIdx}.description`}
            defaultValue={itemField.description || ""}
            render={({ field, fieldState: { error } }) => (
              <FormItem className="w-full">
                <FormLabel>Item description</FormLabel>
                <FormControl>
                  <LongTextInput placeholder="e.g. Spicy, grilled" {...field} />
                </FormControl>
                {error && <FormMessage>{error.message}</FormMessage>}
              </FormItem>
            )}
          />
          {itemFields.length > 1 && (
            <>
              <FormItem className="w-fit">
                <FormLabel>&nbsp;</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  className="border-red-500 cursor-pointer text-red-500"
                  onClick={() => removeItem(itemIdx)}
                >
                  <X size={16} />
                </Button>
              </FormItem>
            </>
          )}
        </div>
      ))}
      <Button
        type="button"
        onClick={() =>
          appendItem(createDefaultMenuItemRow(itemFields.length))
        }
      >
        Add Menu Item
      </Button>
    </div>
  );
}
