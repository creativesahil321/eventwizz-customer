"use client";

import type { ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import { SiteEssentialsFormValues } from "../../_lib/schema";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { useSiteEssentialsUpdateGate } from "../../_lib/site-essentials-update-context";
import { SectionTitle } from "../ui/section-title";

type InfoPageFieldName = keyof Pick<
  SiteEssentialsFormValues,
  | "terms_and_conditions"
  | "privacy_policy"
  | "refund_policy"
  | "cookie_policy"
  | "vendor_terms"
  | "about_page_content"
  | "how_it_works_page_content"
  | "contact_page_content"
>;

type InfoPageFieldConfig = {
  name: InfoPageFieldName;
  label: string;
  placeholder: string;
  maxLength: number;
  maxWords: number;
  description?: string;
  contentType: "policy" | "contact" | "about";
};

const VENDOR_POLICY_FIELDS: InfoPageFieldConfig[] = [
  {
    name: "terms_and_conditions",
    label: "Terms & Conditions",
    placeholder: "Write your terms and conditions…",
    maxLength: 20000,
    maxWords: 3000,
    contentType: "policy",
  },
  {
    name: "privacy_policy",
    label: "Privacy",
    placeholder: "Write your privacy policy…",
    maxLength: 20000,
    maxWords: 3000,
    contentType: "policy",
  },
  {
    name: "refund_policy",
    label: "Refund",
    placeholder: "Write your refund policy…",
    maxLength: 20000,
    maxWords: 3000,
    contentType: "policy",
  },
];

const ADMIN_TERMS_PRIVACY_FIELDS: InfoPageFieldConfig[] = [
  {
    name: "privacy_policy",
    label: "Privacy",
    placeholder: "Write your privacy policy…",
    maxLength: 20000,
    maxWords: 3000,
    contentType: "policy",
  },
  {
    name: "terms_and_conditions",
    label: "Terms & Conditions",
    placeholder: "Write your terms and conditions…",
    maxLength: 20000,
    maxWords: 3000,
    contentType: "policy",
  },
  {
    name: "cookie_policy",
    label: "Cookie Policy",
    placeholder: "Write your cookie policy…",
    maxLength: 20000,
    maxWords: 3000,
    contentType: "policy",
  },
  {
    name: "refund_policy",
    label: "Refund",
    placeholder: "Write your refund policy…",
    maxLength: 20000,
    maxWords: 3000,
    contentType: "policy",
  },
  {
    name: "vendor_terms",
    label: "Vendor Terms",
    placeholder: "Write your vendor terms…",
    maxLength: 20000,
    maxWords: 3000,
    contentType: "policy",
  },
];

const ADMIN_PAGE_FIELDS: InfoPageFieldConfig[] = [
  {
    name: "about_page_content",
    label: "About Us",
    placeholder: "Write your About Us page content…",
    maxLength: 20000,
    maxWords: 3000,
    description: "Public page at /about",
    contentType: "about",
  },
  {
    name: "how_it_works_page_content",
    label: "How It Works",
    placeholder: "Write your How It Works page content…",
    maxLength: 20000,
    maxWords: 3000,
    description: "Public page at /how-it-works",
    contentType: "about",
  },
  {
    name: "contact_page_content",
    label: "Contact Us",
    placeholder: "Write a short welcome message for visitors…",
    maxLength: 3000,
    maxWords: 300,
    description:
      "Opening text on your Contact page. Phone, email, and address are taken from your site contact details.",
    contentType: "contact",
  },
];

const VENDOR_CONTACT_FIELD: InfoPageFieldConfig = {
  name: "contact_page_content",
  label: "Contact Us",
  placeholder: "Write a short welcome message for visitors…",
  maxLength: 3000,
  maxWords: 300,
  description:
    "Opening text on your Contact page. Phone, email, and address are taken from your site contact details.",
  contentType: "contact",
};

function InfoPageEditor({
  field,
  venueName,
  readOnly,
}: {
  field: InfoPageFieldConfig;
  venueName: string;
  readOnly: boolean;
}) {
  const form = useFormContext<SiteEssentialsFormValues>();

  return (
    <FormField
      control={form.control}
      name={field.name}
      render={({ field: formField }) => (
        <FormItem className="space-y-2">
          <FormLabel className="text-sm font-semibold">{field.label}</FormLabel>
          {field.description ? (
            <FormDescription className="text-xs">{field.description}</FormDescription>
          ) : null}
          <FormControl>
            <TiptapEditor
              value={formField.value || ""}
              onChange={formField.onChange}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              maxWords={field.maxWords}
              className="min-h-[160px]"
              readOnly={readOnly}
              aiContext={
                field.contentType === "policy"
                  ? {
                      title: venueName,
                      contentType: "policy",
                      policySection: field.label,
                    }
                  : field.contentType === "contact"
                    ? {
                        title: venueName,
                        contentType: "contact",
                      }
                    : {
                        title: field.label,
                        description: `${field.label} page for ${venueName}`,
                        contentType: "about",
                      }
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function InfoPageSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6 rounded-xl border border-border bg-card/40 p-5 md:p-6">
      <SectionTitle title={title} description={description} />
      <div className="space-y-8">{children}</div>
    </section>
  );
}

export function InfoPagesTab() {
  const { readOnly } = useSiteEssentialsUpdateGate();
  const form = useFormContext<SiteEssentialsFormValues>();
  const venueName = form.watch("name")?.trim() || "Our venue";
  const isAdmin = form.watch("website_role") === "admin";

  return (
    <div className="space-y-8">
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {isAdmin ? (
          <>
            Edit your public marketing pages and legal content.{" "}
            <span className="font-medium text-foreground">About Us</span>,{" "}
            <span className="font-medium text-foreground">How It Works</span>, and{" "}
            <span className="font-medium text-foreground">Contact Us</span> are
            separate pages. All policy sections below appear together on your{" "}
            <span className="font-medium text-foreground">Terms &amp; Privacy</span>{" "}
            page (footer link).
          </>
        ) : (
          <>
            Edit your public{" "}
            <span className="font-medium text-foreground">Policies</span> and{" "}
            <span className="font-medium text-foreground">Contact Us</span>{" "}
            pages (footer: Terms &amp; Privacy, Contact Us). Policy sections are
            grouped on one page. Leave a field empty to use default placeholder
            text.
          </>
        )}
      </p>

      {isAdmin ? (
        <>
          {ADMIN_PAGE_FIELDS.map((field) => (
            <InfoPageSection
              key={field.name}
              title={field.label}
              description={field.description}
            >
              <InfoPageEditor
                field={field}
                venueName={venueName}
                readOnly={readOnly}
              />
            </InfoPageSection>
          ))}

          <InfoPageSection
            title="Terms & Privacy"
            description="These sections appear on your combined /policies page (footer: Terms & Privacy)."
          >
            {ADMIN_TERMS_PRIVACY_FIELDS.map((field) => (
              <InfoPageEditor
                key={field.name}
                field={field}
                venueName={venueName}
                readOnly={readOnly}
              />
            ))}
          </InfoPageSection>
        </>
      ) : (
        <>
          <InfoPageSection
            title="Policies"
            description="Terms & Conditions, Privacy, and Refund appear together on your /policies page (footer: Terms & Privacy)."
          >
            {VENDOR_POLICY_FIELDS.map((field) => (
              <InfoPageEditor
                key={field.name}
                field={field}
                venueName={venueName}
                readOnly={readOnly}
              />
            ))}
          </InfoPageSection>

          <InfoPageSection
            title="Contact Us"
            description="Opening content for your /contact page (footer: Contact Us)."
          >
            <InfoPageEditor
              field={VENDOR_CONTACT_FIELD}
              venueName={venueName}
              readOnly={readOnly}
            />
          </InfoPageSection>
        </>
      )}
    </div>
  );
}
