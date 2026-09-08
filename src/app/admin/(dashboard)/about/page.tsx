import { getAboutForAdmin, updateAbout } from "@/features/about/actions";
import { getOrCreateKnowledgeDocument } from "@/features/knowledge/actions";
import { AboutForm } from "@/components/admin/about-form";
import { AiKnowledgeSection } from "@/components/admin/ai-knowledge-section";

export default async function AboutPage() {
  const about = await getAboutForAdmin();
  const knowledgeDocument = about
    ? await getOrCreateKnowledgeDocument("ABOUT", about.id)
    : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">About</h1>
      <AboutForm about={about} action={updateAbout} />
      {knowledgeDocument && (
        <AiKnowledgeSection
          document={knowledgeDocument}
          redirectPath="/admin/about"
        />
      )}
    </div>
  );
}
