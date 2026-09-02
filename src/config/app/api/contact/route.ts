import { NextResponse } from "next/server";
import { env } from "@/env";
import { adminContactFormSchema } from "@/lib/admin-contact-form";
import { API_ENDPOINTS } from "@/services/core/endpoints";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = adminContactFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please check the form and try again.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const subjectLabel =
      {
        general: "General Enquiry",
        technical: "Technical Support",
        onboarding: "Onboarding Assistance",
        partnership: "Partnership Opportunity",
      }[parsed.data.subject] ?? parsed.data.subject;

    const response = await fetch(
      `${env.NEXT_PUBLIC_API_URL}${API_ENDPOINTS.COMMON.CONTACT_STORE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: parsed.data.name,
          business_name: parsed.data.businessName || null,
          email: parsed.data.email,
          subject: subjectLabel,
          subject_key: parsed.data.subject,
          message: parsed.data.message,
          source: "admin_contact_page",
        }),
      },
    );

    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      status?: boolean;
    } | null;

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            payload?.message ||
            "We could not send your message right now. Please email info@eventwizz.co.uk instead.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: payload?.message || "Message sent successfully.",
    });
  } catch (error) {
    console.error("Contact form submission failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          "We could not send your message right now. Please email info@eventwizz.co.uk instead.",
      },
      { status: 500 },
    );
  }
}
