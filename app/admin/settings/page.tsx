import { SettingsEditor } from "@/app/admin/settings/SettingsEditor";

export default function AdminSettingsPage() {
  return (
    <section className="container-page py-10">
      <p className="eyebrow">Contact settings</p>
      <h1 className="mt-3 font-serif text-4xl text-ink">Contact & Social Links</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Add WhatsApp numbers without spaces or plus signs. Social links can be
        full URLs.
      </p>
      <div className="mt-8">
        <SettingsEditor />
      </div>
    </section>
  );
}
