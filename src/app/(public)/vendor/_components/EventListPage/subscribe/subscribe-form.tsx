import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SubscribeForm() {
  const formFields = [
    { type: "text", placeholder: "Your Name", name: "name" },
    { type: "email", placeholder: "Email Address", name: "email" },
    { type: "tel", placeholder: "Mobile Number", name: "number" },
  ];
  return (
    <>
      <form>
        <div className="flex flex-row gap-5 my-10">
          {formFields.map((field, index) => (
            <Input
              key={index}
              type={field.type}
              placeholder={field.placeholder}
              name={field.name}
              className="bg-background rounded-none"
            />
          ))}
        </div>
        <div className="flex justify-center">
          <Button variant="event-primary" className="h-11 px-10">
            Sign Up
          </Button>
        </div>
      </form>
    </>
  );
}
