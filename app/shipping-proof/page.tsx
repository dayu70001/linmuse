import { Camera, PackageCheck, Video } from "lucide-react";
import { FeedbackGallery } from "@/components/FeedbackGallery";
import { SectionHeading } from "@/components/SectionHeading";
import { getImage, getSiteImages } from "@/lib/siteData";

const proofSections = [
  {
    title: "Packing Photos",
    imageKey: "shipping_01",
    icon: Camera,
    image: "/images/mock/shipping-proof-001.jpg",
    alt: "Packing and shipping proof",
    text: "Selected packing and preparation records from our order process.",
  },
  {
    title: "Shipping Updates",
    imageKey: "shipping_02",
    icon: Video,
    image: "/images/mock/shipping-proof-002.jpg",
    alt: "Packing and shipping update",
    text: "Dispatch and shipment updates for buyer review.",
  },
  {
    title: "Warehouse Updates",
    imageKey: "shipping_04",
    icon: PackageCheck,
    image: "/images/mock/factory-production-003.jpg",
    alt: "Factory preparation update",
    text: "Daily preparation, checking, and dispatch updates from our sourcing process.",
  },
];

const customerFeedbackKeys = [
  "customer_feedback_01",
  "customer_feedback_02",
  "customer_feedback_03",
  "customer_feedback_04",
  "customer_feedback_05",
  "customer_feedback_06",
] as const;

export default async function ShippingProofPage() {
  const siteImages = await getSiteImages();
  const feedbackImages = customerFeedbackKeys.map((key) => {
    const image = getImage(siteImages, key);
    return {
      src: image.url,
      alt: image.alt,
    };
  });

  return (
    <main className="bg-white">
      <section className="section-pad">
        <div className="container-page">
          <SectionHeading
            eyebrow="Trust proof"
            title="Order & Shipping Proof"
            text="Packing, dispatch, and warehouse updates help buyers review the order process."
          />
          <p className="mx-auto mt-5 max-w-2xl rounded bg-paper px-4 py-3 text-center text-sm font-semibold text-muted">
            Customer names, phone numbers, addresses, payment details, and tracking numbers are hidden for privacy.
          </p>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {proofSections.map((section) => {
              const Icon = section.icon;
              return (
              <article className="card overflow-hidden bg-paper" key={section.title}>
                <img
                  src={getImage(siteImages, section.imageKey).url || section.image}
                  alt={getImage(siteImages, section.imageKey).alt || section.alt}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="p-5 sm:p-7">
                  <Icon className="text-gold" size={30} />
                  <h2 className="mt-5 font-serif text-2xl text-ink sm:text-3xl">{section.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted">{section.text}</p>
                </div>
              </article>
            );
            })}
          </div>
        </div>
      </section>

      <section className="section-pad bg-paper">
        <div className="container-page">
          <SectionHeading
            eyebrow="Buyer feedback"
            title="Customer Feedback Gallery"
            text="Real buyer feedback is displayed with private information hidden."
          />
          <p className="mt-4 max-w-2xl rounded bg-white px-4 py-3 text-sm font-semibold text-muted">
            Customer names, phone numbers, addresses, payment details, and tracking numbers are hidden for privacy.
          </p>
          <FeedbackGallery images={feedbackImages} />
        </div>
      </section>
    </main>
  );
}
