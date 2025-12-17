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
import { passwordSchema, PasswordSchema } from "./schema";

// Field configurations
const passwordFields = [
  {
    name: "currentPassword",
    label: "Current Password",
    placeholder: "Current Password",
  },
  { name: "newPassword", label: "New Password", placeholder: "New Password" },
  {
    name: "confirmPassword",
    label: "Confirm Password",
    placeholder: "Confirm Password",
  },
] as const;

// Memoized Input Field Component
const InputField = memo(
  ({
    name,
    label,
    placeholder,
    control,
  }: {
    name: keyof PasswordSchema;
    label: string;
    placeholder: string;
    control: any;
  }) => (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type="password" placeholder={placeholder} {...field} />
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
      name: keyof PasswordSchema;
      label: string;
      placeholder: string;
    }[];
    control: any;
  }) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4">
        {fields.map((field) => (
          <InputField
            key={field.name}
            name={field.name}
            label={field.label}
            placeholder={field.placeholder}
            control={control}
          />
        ))}
      </CardContent>
    </Card>
  )
);
FieldGroup.displayName = "FieldGroup";

// Main Component
export default function PasswordSetting() {
  const [loading, setLoading] = useState(false);

  const form = useForm<PasswordSchema>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const onSubmit: SubmitHandler<PasswordSchema> = useCallback(async (data) => {
    setLoading(true);
    try {
      // await updatePassword(data); // Uncomment and implement your API call here
      toast.success("Password updated successfully.");
    } catch {
      toast.error("Failed to update password.");
    } finally {
      setTimeout(() => setLoading(false), 1500);
    }
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FieldGroup
          title="Password Settings"
          description="Change your password here"
          fields={passwordFields}
          control={form.control}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Password"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
