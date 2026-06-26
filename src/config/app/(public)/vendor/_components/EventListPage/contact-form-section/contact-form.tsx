import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const contactFormData = {
  heading: "Need Help?",
  subhead: "Booking and Event Assistance",
  formFields: [
    { type: "text", placeholder: "Name", name: "name" },
    { type: "email", placeholder: "Email", name: "email" },
    { type: "tel", placeholder: "Phone", name: "phone" },
  ],
};
export default function ContactForm() {
  return (
    <>
      <div className="w-full text-center">
        <h5 className="text-background text-xl">{contactFormData.subhead}</h5>
        <h2 className="text-4xl font-bold text-background py-5">
          {contactFormData.heading}
        </h2>

        <form className="w-7/12 mx-auto">
          {contactFormData.formFields.map((data, index) => (
            <div className="flex flex-col mb-3" key={index}>
              <Input
                type={data.type}
                placeholder={data.placeholder}
                name={data.name}
                className="placeholder:text-background h-11 rounded-full bg-[#2c3248] border-none text-background"
              />
            </div>
          ))}
          <div className="flex flex-col mb-3">
            <Textarea
              className="border-none placeholder:text-background text-background"
              placeholder="Type your message..."
            ></Textarea>
          </div>
          <div className="flex mb-3 justify-end">
            <Button className="px-8 bg-background text-foreground hover:text-background">
              Send
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
