import { z } from "zod";

export const stripeSchema = z.object({
  provider: z.literal("stripe"),
  apiKey: z.string().min(1, "API Key is required"),
  publishableKey: z.string().min(1, "Publishable Key is required"),
});

export const worldpaySchema = z.object({
  provider: z.literal("worldpay"),
  clientKey: z.string().min(1, "Client Key is required"),
  serviceKey: z.string().min(1, "Service Key is required"),
});

export const paypalSchema = z.object({
  provider: z.literal("paypal"),
  clientId: z.string().min(1, "Client ID is required"),
  secret: z.string().min(1, "Secret is required"),
});

export const customProviderSchema = z.object({
  provider: z.literal("custom"),
  config: z
    .record(z.string())
    .refine((data) => Object.keys(data).length >= 1, {
      message: "Config must have at least one key-value pair",
    }),
});

export const paymentProviderSchema = z.discriminatedUnion("provider", [
  stripeSchema,
  worldpaySchema,
  paypalSchema,
  customProviderSchema,
]);

export const paymentSettingsSchema = z.object({
  providers: z
    .array(paymentProviderSchema)
    .min(1, "At least one provider is required"),
});

export type PaymentSettingsSchema = z.infer<typeof paymentSettingsSchema>;
export type PaymentProviderSchema = z.infer<typeof paymentProviderSchema>;
