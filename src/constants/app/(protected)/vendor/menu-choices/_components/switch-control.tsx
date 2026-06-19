import { Switch } from "@/components/ui/switch";

export default function SwitchControl({
  checked,
  handleToggle,
}: {
  checked: boolean;
  handleToggle: (checked: boolean) => void;
}) {
  return (
    <section className="w-full relative">
      <Switch checked={checked} onCheckedChange={handleToggle} />
    </section>
  );
}
