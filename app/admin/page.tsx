import Link from "next/link";

const cards = [
  ["Edit Homepage", "/admin/images"],
  ["Edit Category Images", "/admin/images"],
  ["Edit New Arrival Images", "/admin/images"],
  ["Edit Factory Images", "/admin/images"],
  ["Edit Shipping Proof Images", "/admin/images"],
  ["Edit Contact Settings", "/admin/settings"],
  ["Review Imported Products", "/admin/products"],
];

export default function AdminDashboardPage() {
  return (
    <section className="container-page py-10">
      <p className="eyebrow">Dashboard</p>
      <h1 className="mt-3 font-serif text-4xl text-ink">Choose what to edit</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, href]) => (
          <Link className="card p-6 transition hover:border-gold" href={href} key={label}>
            <h2 className="font-serif text-2xl text-ink">{label}</h2>
            <p className="mt-3 text-sm text-muted">Open editor</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
