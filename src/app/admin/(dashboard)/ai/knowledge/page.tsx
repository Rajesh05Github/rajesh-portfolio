import Link from "next/link";
import {
  listAllKnowledgeDocuments,
  reindexKnowledgeDocument,
} from "@/features/knowledge/actions";

const EDIT_PATHS: Partial<Record<string, (id: string) => string>> = {
  ABOUT: () => "/admin/about",
  EXPERIENCE: (id) => `/admin/experience/${id}/edit`,
  EDUCATION: (id) => `/admin/education/${id}/edit`,
  SKILL: (id) => `/admin/skills/${id}/edit`,
  PROJECT: (id) => `/admin/projects/${id}/edit`,
  CERTIFICATION: (id) => `/admin/certifications/${id}/edit`,
  ACHIEVEMENT: (id) => `/admin/achievements/${id}/edit`,
};

const INDEX_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  INDEXING: "bg-primary/15 text-primary",
  INDEXED: "bg-primary/15 text-primary",
  FAILED: "bg-red-500/10 text-red-400",
};

export default async function KnowledgeDashboardPage() {
  const documents = await listAllKnowledgeDocuments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Knowledge</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every entity below has its own knowledge configuration on its edit
          page. A background worker (
          <code className="bg-surface rounded px-1.5 py-0.5">
            npm run worker:dev
          </code>
          ) picks up re-index jobs automatically whenever content or its AI
          Knowledge config changes — the &ldquo;Re-index&rdquo; button here is
          only for forcing a manual refresh.
        </p>
      </div>

      <div className="glass w-full max-w-full overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="text-muted-foreground border-border border-b text-left">
            <tr>
              <th className="p-4">Source</th>
              <th className="p-4">Entity</th>
              <th className="p-4">In RAG</th>
              <th className="p-4">Visibility</th>
              <th className="p-4">Priority</th>
              <th className="p-4">Index status</th>
              <th className="p-4">Chunks</th>
              <th className="p-4">Last indexed</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const editPath = doc.sourceEntityId
                ? EDIT_PATHS[doc.sourceType]?.(doc.sourceEntityId)
                : undefined;
              return (
                <tr
                  key={doc.id}
                  className="border-border border-b last:border-0"
                >
                  <td className="p-4 font-medium">{doc.sourceType}</td>
                  <td className="text-muted-foreground p-4">
                    {doc.entityLabel}
                  </td>
                  <td className="p-4">{doc.includeInRag ? "Yes" : "No"}</td>
                  <td className="p-4">{doc.visibility}</td>
                  <td className="text-muted-foreground p-4">{doc.priority}</td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${INDEX_STATUS_STYLES[doc.indexStatus]}`}
                      title={doc.indexError ?? undefined}
                    >
                      {doc.indexStatus}
                    </span>
                  </td>
                  <td className="text-muted-foreground p-4">
                    {doc.chunkCount}
                  </td>
                  <td className="text-muted-foreground p-4">
                    {doc.lastIndexedAt
                      ? doc.lastIndexedAt.toLocaleString()
                      : "—"}
                  </td>
                  <td className="space-x-4 p-4 text-right">
                    <form
                      action={reindexKnowledgeDocument.bind(null, doc.id)}
                      className="inline"
                    >
                      <button
                        type="submit"
                        className="text-primary hover:underline"
                      >
                        Re-index
                      </button>
                    </form>
                    {editPath && (
                      <Link
                        href={editPath}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Configure
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
            {documents.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="text-muted-foreground p-6 text-center"
                >
                  No knowledge documents yet — open any Experience/Project/etc.
                  edit page to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
