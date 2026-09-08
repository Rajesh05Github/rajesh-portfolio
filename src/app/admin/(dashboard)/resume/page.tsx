import {
  listResumes,
  activateResume,
  deleteResume,
} from "@/features/resume/actions";
import { DeleteButton } from "@/components/admin/delete-button";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ResumePage() {
  const resumes = await listResumes();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Resume / CV</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload a PDF (max 10MB). The active resume is served at{" "}
          <code className="bg-surface rounded px-1.5 py-0.5">/api/resume</code>{" "}
          and linked from the Hero section&apos;s &ldquo;Download CV&rdquo;
          button.
        </p>
      </div>

      <form
        action="/api/admin/resume"
        method="post"
        encType="multipart/form-data"
        className="glass flex flex-wrap items-center gap-4 rounded-2xl p-6"
      >
        <input
          type="file"
          name="file"
          accept="application/pdf"
          required
          className="file:bg-primary file:text-primary-foreground text-sm file:mr-4 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-sm file:font-medium"
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-medium"
        >
          Upload
        </button>
      </form>

      <div className="glass overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-border border-b text-left">
            <tr>
              <th className="p-4">File</th>
              <th className="p-4">Size</th>
              <th className="p-4">Downloads</th>
              <th className="p-4">Uploaded</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {resumes.map((item) => (
              <tr
                key={item.id}
                className="border-border border-b last:border-0"
              >
                <td className="p-4 font-medium">{item.fileName}</td>
                <td className="text-muted-foreground p-4">
                  {formatBytes(item.fileSizeBytes)}
                </td>
                <td className="text-muted-foreground p-4">
                  {item.downloadCount}
                </td>
                <td className="text-muted-foreground p-4">
                  {item.uploadedAt.toLocaleDateString()}
                </td>
                <td className="p-4">
                  {item.isActive ? (
                    <span className="bg-primary/15 text-primary rounded-full px-3 py-1 text-xs font-medium">
                      Active
                    </span>
                  ) : (
                    <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-medium">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="space-x-4 p-4 text-right">
                  {!item.isActive && (
                    <form
                      action={activateResume.bind(null, item.id)}
                      className="inline"
                    >
                      <button
                        type="submit"
                        className="text-primary hover:underline"
                      >
                        Activate
                      </button>
                    </form>
                  )}
                  <DeleteButton action={deleteResume.bind(null, item.id)} />
                </td>
              </tr>
            ))}
            {resumes.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted-foreground p-6 text-center"
                >
                  No resumes uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
