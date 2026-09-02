import ResetPasswordForm from "./_component/reset-form";
import { H1, Paragraph } from "@/components/ui/typography";

export default function Page() {
  return (
    <div className="w-full flex items-center justify-center py-12">
      <div className="mx-auto w-full max-w-[420px] px-4 flex flex-col items-center">
        <div className="flex flex-col space-y-2 text-center mb-8 w-full">
          <H1 className="text-[var(--color-text)]">Reset Your Password</H1>
          <Paragraph className="text-[var(--color-text-dimmed)]">
            Create a new secure password
          </Paragraph>
        </div>
        <div className="w-full">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
