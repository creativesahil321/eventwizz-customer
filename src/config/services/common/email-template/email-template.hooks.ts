import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emailTemplateService } from "./email-template.service";
import { EmailTemplateUpdateRequest } from "./type";

// Query key factory for email templates
export const emailTemplateKeys = {
  all: ["email-templates"] as const,
  lists: (role: "admin" | "vendor") =>
    [...emailTemplateKeys.all, role, "list"] as const,
  detail: (role: "admin" | "vendor", id: number | string) =>
    [...emailTemplateKeys.all, role, "detail", id.toString()] as const,
};

/**
 * Hook to fetch email templates for a specific role
 */
export const useEmailTemplates = (role: "admin" | "vendor") => {
  return useQuery({
    queryKey: emailTemplateKeys.lists(role),
    queryFn: () => emailTemplateService.getTemplates(role),
  });
};

/**
 * Hook to fetch a specific email template by ID
 */
export const useEmailTemplate = (
  id: number | string,
  role: "admin" | "vendor"
) => {
  return useQuery({
    queryKey: emailTemplateKeys.detail(role, id),
    queryFn: () => emailTemplateService.getTemplateById(id, role),
    enabled: !!id, // Only run if ID is provided
  });
};

/**
 * Hook to update an existing email template
 */
export const useUpdateEmailTemplate = (role: "admin" | "vendor") => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      template,
    }: {
      id: number | string;
      template: EmailTemplateUpdateRequest;
    }) => emailTemplateService.updateTemplate(id, template, role),
    onSuccess: (updatedTemplate, { id }) => {
      // Update both the list and the detail queries
      queryClient.invalidateQueries({
        queryKey: emailTemplateKeys.lists(role),
      });

      queryClient.invalidateQueries({
        queryKey: emailTemplateKeys.detail(role, id),
      });
    },
  });
};
