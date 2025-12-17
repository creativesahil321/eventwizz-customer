import { FormType } from "./schema";
import { updateEmailTemplateById } from "../../_lib/actions";

export const updateEmailTemplate = async (data: FormType, id: number) => {
  try {
    const result = await updateEmailTemplateById(id, data);
    return {
      status: result.status,
      message: result.message || "Template updated successfully",
    };
  } catch (error) {
    console.error("Failed to update email template:", error);
    return {
      status: false,
      message: "Failed to update template. Please try again.",
    };
  }
};
