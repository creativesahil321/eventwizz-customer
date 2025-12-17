import { memo, useCallback, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { userSchema, UserSchema } from "./schema";
import { updateProfile } from "./action";

// Field configurations
const personalFields = [
  { name: "firstName", label: "First Name", placeholder: "John" },
  { name: "lastName", label: "Last Name", placeholder: "Doe" },
  { name: "birthday", label: "Birthday", placeholder: "YYYY-MM-DD" },
] as const;

const contactFields = [
  {
    name: "email",
    label: "Email",
    placeholder: "john@example.com",
    type: "email",
  },
  { name: "phoneNumber", label: "Phone Number", placeholder: "+1234567890" },
] as const;

const addressFields = [
  { name: "country", label: "Country", placeholder: "USA" },
  { name: "city", label: "City", placeholder: "New York" },
  { name: "address", label: "Address", placeholder: "123 Main St" },
  { name: "zipcode", label: "Zipcode", placeholder: "10001" },
] as const;

// Memoized Input Field Component
const InputField = memo(
  ({
    name,
    label,
    placeholder,
    type = "text",
    control,
  }: {
    name: keyof UserSchema;
    label: string;
    placeholder: string;
    type?: string;
    control: any;
  }) => (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} placeholder={placeholder} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
);
InputField.displayName = "InputField";

// Memoized Field Group Component
const FieldGroup = memo(
  ({
    title,
    description,
    fields,
    control,
  }: {
    title: string;
    description: string;
    fields: readonly {
      name: keyof UserSchema;
      label: string;
      placeholder: string;
      type?: string;
    }[];
    control: any;
  }) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => (
          <InputField
            key={field.name}
            name={field.name}
            label={field.label}
            placeholder={field.placeholder}
            type={field.type}
            control={control}
          />
        ))}
      </CardContent>
    </Card>
  )
);
FieldGroup.displayName = "Field Wroup";

// Main Component
export default function GeneralSetting() {
  const [loading, setLoading] = useState(false);

  const form = useForm<UserSchema>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      country: "",
      city: "",
      address: "",
      email: "",
      phoneNumber: "",
      birthday: "",
      zipcode: "",
    },
    mode: "onChange",
  });

  const onSubmit: SubmitHandler<UserSchema> = useCallback(async (data) => {
    setLoading(true);
    try {
      const result = await updateProfile(data);
      if (result?.status) toast.success(result.message);
      else toast.error(result.message || "Something went wrong.");
    } catch {
      toast.error("Failed to update user.");
    } finally {
      setTimeout(() => setLoading(false), 1500);
    }
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FieldGroup
          title="Personal Information"
          description="Your personal details"
          fields={personalFields}
          control={form.control}
        />
        <FieldGroup
          title="Contact Information"
          description="How to reach you"
          fields={contactFields}
          control={form.control}
        />
        <FieldGroup
          title="Address Information"
          description="Your location details"
          fields={addressFields}
          control={form.control}
        />
        <div className="flex justify-end">
          <Button variant="event-primary" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
