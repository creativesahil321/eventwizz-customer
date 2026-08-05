import ForgotPassword from "./_components/forgot-password";
import { H1, Paragraph } from "@/components/ui/typography";

export default function Page() {
  return (
    <div className="w-full flex items-center justify-center py-12 ">
      <div className="mx-auto w-full max-w-[420px] px-4 flex flex-col items-center">
        <div className="flex flex-col space-y-2 text-center mb-8 w-full">
          <H1 className="text-[var(--color-text)]">Forgot Password?</H1>
          <Paragraph className="text-[var(--color-text-dimmed)]">
            Enter your email and we&apos;ll send you a reset link
          </Paragraph>
        </div>
        <div className="w-full text-[var(--color-text)]">
          <div className="w-full">
            <ForgotPassword />
          </div>
        </div>
      </div>
    </div>
  );
}
