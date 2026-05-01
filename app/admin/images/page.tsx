import { ImageEditor } from "@/app/admin/images/ImageEditor";

export default function AdminImagesPage() {
  return (
    <section className="container-page py-10">
      <p className="eyebrow">Visual editor</p>
      <h1 className="mt-3 font-serif text-4xl text-ink">Website Images</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Click Replace Image, choose a file from your computer, then click Save.
        The public website will keep using local fallback images until a saved
        Supabase image exists.
      </p>
      <div className="mt-8">
        <ImageEditor />
      </div>
    </section>
  );
}
