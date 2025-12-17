"use client";

import { useForm } from "react-hook-form";
import { formSchema, FormSchema } from "../_lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";

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
import { SquarePen } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { subscribe } from "../_lib/actions";

export default function NewsletterForm() {
  const [loading, setLoading] = useState<boolean>(false);
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      sub_title: "",
      email: "",
      sendEmailToAll: false,
    },
  });

  const onSubmit = async (data: FormSchema) => {
    setLoading(true);
    try {
      await subscribe(data);
      form.reset();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full min-w-0 bg-background dark:border p-6 rounded-md relative text-black">
      <header className="w-full mb-6 min-w-0">
        <h2 className="text-2xl mb-0 title-header font-bold">Newsletter</h2>
      </header>
      <main className="w-full min-w-0 relative">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 md:space-y-0 md:space-x-4 flex flex-col md:flex-row md:items-center min-w-0"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center space-x-2">
                    <span>Title</span>
                    <SquarePen className="stroke-ev" size={14} />
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="w-full min-w-0"
                      placeholder="Enter title"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sub_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center space-x-2">
                    <span>Sub Title</span>
                    <SquarePen className="stroke-ev" size={14} />
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="w-full min-w-0"
                      placeholder="Enter subtitle"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center space-x-2">
                    <span>Email</span>
                    <SquarePen className="stroke-ev" size={14} />
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      className="w-full min-w-0"
                      placeholder="Enter email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sendEmailToAll"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Send Email To All?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) =>
                        field.onChange(value === "true")
                      }
                      defaultValue={field.value ? "true" : "false"}
                      className="flex space-x-4 min-w-0"
                    >
                      <FormItem className="flex items-center space-x-0">
                        <FormControl>
                          <RadioGroupItem value="true" />
                        </FormControl>
                        <FormLabel className="font-normal">Yes</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-0">
                        <FormControl>
                          <RadioGroupItem value="false" />
                        </FormControl>
                        <FormLabel className="font-normal">No</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button variant="event-primary" type="submit" disabled={loading} className="w-full md:w-auto shrink-0">
              <span className="w-24 inline-block text-center">
                {loading ? "Saving..." : "Save"}
              </span>
            </Button>
          </form>
        </Form>
      </main>
    </section>
  );
}
