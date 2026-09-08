import { createEducation } from "@/features/education/actions";
import { EducationForm } from "@/components/admin/education-form";

export default function NewEducationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New education entry</h1>
      <EducationForm action={createEducation} />
    </div>
  );
}
