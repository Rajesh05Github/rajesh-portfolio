import { createSkill } from "@/features/skill/actions";
import { SkillForm } from "@/components/admin/skill-form";

export default function NewSkillPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New skill</h1>
      <SkillForm action={createSkill} />
    </div>
  );
}
