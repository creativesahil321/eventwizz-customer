"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { supportTicketSchema, SupportTicketFormValues } from "./schema";
import { useState } from "react";
import { toast } from "sonner";
import { InputTags } from "@/components/ui/input-tags";
const users = [
  { id: "1", name: "John Doe" },
  { id: "2", name: "Jane Smith" },
];
export function CreateSupportTicketForm({
  onSubmitHandler,
}: {
  onSubmitHandler: (data: SupportTicketFormValues) => void;
}) {
  const [loading, setLoading] = useState(false);
  const form = useForm<SupportTicketFormValues>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      requester: "",
      agent: "",
      tags: [],
      type: undefined,
      priority: "low",
      message: "",
    },
  });

  const onSubmit = async (data: SupportTicketFormValues) => {
    console.log(data, "data");

    setLoading(true);
    try {
      toast.success("Ticket created successfully!");
      onSubmitHandler(data);
    } catch {
      toast.error("Failed to create ticket.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
        <section className="flex gap-3">
          <FormField
            control={form.control}
            name="requester"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Requester</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger
                      className="w-full h-12"
                      style={{ height: "3.2rem" }}
                    >
                      <SelectValue placeholder="Select Requester" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="agent"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Agent</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger
                      className="w-full h-12"
                      style={{ height: "3.2rem" }}
                    >
                      <SelectValue placeholder="Select Agent" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section className="flex gap-3">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger
                      className="w-full h-12"
                      style={{ height: "3.2rem" }}
                    >
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="question">Question</SelectItem>
                    <SelectItem value="incident">Incident</SelectItem>
                    <SelectItem value="problem">Problem</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Priority</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger
                      className="w-full h-12"
                      style={{ height: "3.2rem" }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>
        <section className="flex gap-3">
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Your Message</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe your issue..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section className="flex gap-3">
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Tags (comma separated)</FormLabel>
                <FormControl>
                  <InputTags
                    value={field.value || []}
                    onChange={(newTags: string[]) => field.onChange(newTags)}
                    placeholder="Enter values, comma separated..."
                    className="max-w-[500px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>
        <section className="w-full flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Create Ticket"}
          </Button>
        </section>
      </form>
    </Form>
  );
}
