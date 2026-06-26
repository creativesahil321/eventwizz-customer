import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { H2, Label } from "@/components/ui/typography";
import { ChevronRight } from "lucide-react";

export default function ForgotPasswordForm({
  title = "Please enter your new password below to reset your account password.",
  buttonText = "Submit",
  fields = [
    {
      name: "email",
      type: "email",
      label: "Email",
      placeholder: "abc@gmail.com",
    },
    { name: "password", type: "password", label: "Password", placeholder: "" },
    {
      name: "confirm_password",
      type: "password",
      label: "Confirm Password",
      placeholder: "",
    },
  ],
}) {
  return (
    <section className="w-full">
      <div className="w-full mx-auto">
        <H2 className="mb-6">{title}</H2>
        <div className="w-full my-5 mx-auto">
          <form>
            {fields.map((field) => (
              <div
                key={field.name}
                className="flex flex-col justify-start space-y-2 mb-2"
              >
                <Label className="text-left">{field.label}</Label>
                <Input
                  type={field.type}
                  placeholder={field.placeholder}
                  name={field.name}
                  id={field.name}
                  className="border border-gray-400 rounded-sm"
                />
              </div>
            ))}
            <div className="flex flex-col justify-start space-y-2 mb-2 mt-8">
              <Button
                variant="event-primary"
                size="xl"
                className="w-auto md:w-80 mx-auto"
              >
                {buttonText} <ChevronRight size={12} />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
