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
import { StepSevenType } from "../../form-provider/schema";

export default function MenuItems({
  menuIndex,
  form,
}: {
  menuIndex: number;
  form: UseFormReturn<StepSevenType>;
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
      appendItem({ title: "", description: "" });
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
                <FormLabel>Item Title {itemIdx + 1}</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Chicken" {...field} />
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
                <FormLabel>Item Description</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Spicy, grilled" {...field} />
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
        onClick={() => appendItem({ title: "", description: "" })}
      >
        Add Menu Item
      </Button>
    </div>
  );
}
