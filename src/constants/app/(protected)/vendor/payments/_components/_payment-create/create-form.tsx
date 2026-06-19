"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentSchema, PaymentType } from "./schema";
import { useState } from "react";
import { toast } from "sonner";
import { createPayment } from "./action";
import { CreditCard } from "lucide-react";

const paymentStatusOptions = [
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" },
  { label: "Cancelled", value: "cancelled" },
];

type CreatePaymentFormProps = {
  onSubmitHandler: (data: PaymentType) => void;
};

export function CreatePaymentForm({ onSubmitHandler }: CreatePaymentFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<PaymentType>({
    resolver: zodResolver(PaymentSchema),
    defaultValues: {
      event_name: "",
      menu_name: "",
      category: "",
      event_type: "",

      status: undefined as unknown as PaymentType["status"],
    },
  });

  const onSubmit = async (data: PaymentType) => {
    setLoading(true);
    try {
      const result = await createPayment(data);
      if (result?.status) {
        toast.success(result.message);
      } else {
        toast.error(result.message || "Something went wrong.");
      }
    } catch {
      toast.error("Failed to update payment.");
    } finally {
      setTimeout(() => {
        setLoading(false);
        if (typeof onSubmitHandler === "function") {
          onSubmitHandler(data);
        }
      }, 1500);
    }
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
        <FormField
          control={form.control}
          name="event_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground opacity-70">
                Event Name
              </FormLabel>
              <FormControl>
                <Input placeholder="Enter event name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Menu Name */}
        <FormField
          control={form.control}
          name="menu_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground opacity-70">
                Menu Name
              </FormLabel>
              <FormControl>
                <Input placeholder="Enter menu name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground opacity-70">
                Category
              </FormLabel>
              <FormControl>
                <Input placeholder="Enter category" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Event Type (Optional) */}
        <FormField
          control={form.control}
          name="event_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground opacity-70">
                Event Type
              </FormLabel>
              <FormControl>
                <Input placeholder="Enter event type (optional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status Dropdown */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground opacity-70">
                Status
              </FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue
                      placeholder={field.value ? undefined : "Choose Status"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <section
          className={`w-full flex items-center justify-end ${
            loading ? "cursor-not-allowed" : ""
          }`}
        >
          <Button
            type="submit"
            variant="event-primary"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <CreditCard size={18} />
            {loading ? "Creating Payment..." : "Create Payment"}
          </Button>
        </section>
      </form>
    </Form>
  );
}
