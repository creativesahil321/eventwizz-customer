import { memo, useCallback } from "react";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentSettingsSchema, paymentSettingsSchema } from "./schema";

// Provider configurations with default values
const providerConfigs = [
  { provider: "stripe" as const, label: "Stripe" },
  { provider: "worldpay" as const, label: "Worldpay" },
  { provider: "paypal" as const, label: "Paypal" },
  { provider: "custom" as const, label: "Custom" },
];

// Memoized Input Field Component
const InputField = memo(
  ({
    name,
    label,
    placeholder,
    control,
  }: {
    name: string;
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
            <Input placeholder={placeholder} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
);
InputField.displayName = "InputField";

// Memoized Provider Config Tab Content
const ProviderConfigTabContent = memo(
  ({
    provider,
    index,
    control,
  }: {
    provider: PaymentProviderSchema["provider"];
    index: number;
    control: any;
  }) => (
    <TabsContent value={provider}>
      <Card>
        <CardHeader>
          <CardTitle>
            {providerConfigs.find((opt) => opt.provider === provider)?.label}{" "}
            Configuration
          </CardTitle>
          <CardDescription>
            Update your {provider} settings here
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {provider === "stripe" && (
            <>
              <InputField
                name={`providers.${index}.apiKey`}
                label="API Key"
                placeholder="Enter Stripe API Key"
                control={control}
              />
              <InputField
                name={`providers.${index}.publishableKey`}
                label="Publishable Key"
                placeholder="Enter Stripe Publishable Key"
                control={control}
              />
            </>
          )}
          {provider === "worldpay" && (
            <>
              <InputField
                name={`providers.${index}.clientKey`}
                label="Client Key"
                placeholder="Enter Worldpay Client Key"
                control={control}
              />
              <InputField
                name={`providers.${index}.serviceKey`}
                label="Service Key"
                placeholder="Enter Worldpay Service Key"
                control={control}
              />
            </>
          )}
          {provider === "paypal" && (
            <>
              <InputField
                name={`providers.${index}.clientId`}
                label="Client ID"
                placeholder="Enter Paypal Client ID"
                control={control}
              />
              <InputField
                name={`providers.${index}.secret`}
                label="Secret"
                placeholder="Enter Paypal Secret"
                control={control}
              />
            </>
          )}
          {provider === "custom" && (
            <InputField
              name={`providers.${index}.config`}
              label="Custom Config (JSON)"
              placeholder='{"key": "value"}'
              control={control}
            />
          )}
        </CardContent>
      </Card>
    </TabsContent>
  )
);
ProviderConfigTabContent.displayName = "ProviderConfigTabContent";

// Main Component
export default function PaymentSettings() {
  const form = useForm<PaymentSettingsSchema>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
      providers: [
        { provider: "stripe", apiKey: "", publishableKey: "" },
        { provider: "worldpay", clientKey: "", serviceKey: "" },
        { provider: "paypal", clientId: "", secret: "" },
        { provider: "custom", config: {} },
      ],
    },
    mode: "onChange",
  });

  const onSubmit: SubmitHandler<PaymentSettingsSchema> = useCallback((data) => {
    console.log(data);
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="stripe" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {providerConfigs.map((config) => (
              <TabsTrigger key={config.provider} value={config.provider}>
                {config.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {providerConfigs.map((config, index) => (
            <ProviderConfigTabContent
              key={config.provider}
              provider={config.provider}
              index={index}
              control={form.control}
            />
          ))}
        </Tabs>
        <div className="flex justify-end">
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Form>
  );
}
