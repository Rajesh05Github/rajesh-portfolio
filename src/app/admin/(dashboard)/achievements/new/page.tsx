import { createAchievement } from "@/features/achievement/actions";
import { AchievementForm } from "@/components/admin/achievement-form";

export default function NewAchievementPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New achievement</h1>
      <AchievementForm action={createAchievement} />
    </div>
  );
}
