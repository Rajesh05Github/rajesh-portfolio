import { createExperience } from "@/features/experience/actions";
import { ExperienceForm } from "@/components/admin/experience-form";

export default function NewExperiencePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New experience entry</h1>
      <ExperienceForm action={createExperience} />
    </div>
  );
}
