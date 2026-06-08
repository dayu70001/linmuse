import type { Metadata } from "next";
import { Camera, PackageCheck, Video } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { getHomepageSettings } from "@/lib/homepageSettings";
import { buildCanonical, SITE_NAME } from "@/lib/seo";
import Link from "next/link";
import { ShippingProofFeedbackGallery } from "./FeedbackGallery";

const title = "Shipping Proof | LM Dkbrand";
const description =
  "View LM Dkbrand shipping proof, packing updates and delivery preparation records for retail and wholesale orders.";
const canonical = buildCanonical("/shipping-proof");

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical,
  },
  openGraph: {
    title,
    description,
    url: canonical,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function ShippingProofPage() {
  const settings = await getHomepageSettings();
  const img = settings.images;

  const proofSections = [
    {
      title: "Packing Photos",
      icon: Camera,
      src: img["shipping_proof_img_01"] || "/images/mock/shipping-proof-001.jpg",
      alt: "Packing and shipping proof",
      text: "Selected packing and preparation records from our order process.",
    },
    {
      title: "Shipping Updates",
      icon: Video,
      src: img["shipping_proof_img_02"] || "/images/mock/shipping-proof-002.jpg",
      alt: "Packing and shipping update",
      text: "Dispatch and shipment updates for buyer review.",
    },
    {
      title: "Warehouse Updates",
      icon: PackageCheck,
      src: img["shipping_proof_img_03"] || "/images/mock/factory-production-003.jpg",
      alt: "Factory preparation update",
      text: "Daily preparation, checking, and dispatch updates from our sourcing process.",
    },
  ];

  const defaultFeedbackImages = [
    { src: img["shipping_proof_img_04"] || "/images/mock/factory-production-001.jpg", alt: "Customer feedback 1" },
    { src: img["shipping_proof_img_05"] || "/images/mock/factory-production-002.jpg", alt: "Customer feedback 2" },
    { src: img["shipping_proof_img_06"] || "/images/mock/shipping-proof-003.jpg",     alt: "Customer feedback 3" },
    { src: img["shipping_proof_img_07"] || "/images/mock/hero-apparel-1.jpg",          alt: "Customer feedback 4" },
    { src: img["shipping_proof_img_08"] || "/images/mock/hero-shoes-1.jpg",            alt: "Customer feedback 5" },
    { src: img["shipping_proof_img_09"] || "/images/mock/product-watches-001.jpg",     alt: "Customer feedback 6" },
  ];
  const customFeedbackImages = settings.shippingProofFeedbackGallery
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order)
    .map((item) => ({ src: item.url, alt: item.label }));
  const feedbackImages = [...defaultFeedbackImages, ...customFeedbackImages];

  return (
    <main className="bg-white">
      <section className="py-8 sm:py-10 lg:py-12">
        <div className="container-page">
          <SectionHeading
            eyebrow="Trust proof"
            title="Order & Shipping Proof"
            text="Packing, dispatch, warehouse, and buyer feedback updates help customers review the order process before purchasing."
          />
          <p className="mx-auto mt-4 max-w-2xl rounded bg-paper px-4 py-3 text-center text-sm font-semibold text-muted">
            Customer names, phone numbers, addresses, payment details, and tracking numbers are hidden for privacy.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {proofSections.map((section) => {
              const Icon = section.icon;
              return (
                <article className="card overflow-hidden bg-paper" key={section.title}>
                  <img
                    src={section.src}
                    alt={section.alt}
                    className="aspect-[4/3] w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="p-4">
                    <Icon className="text-gold" size={24} />
                    <h2 className="mt-3 font-serif text-xl text-ink sm:text-2xl">{section.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted">{section.text}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-paper py-8 sm:py-10 lg:py-12">
        <div className="container-page">
          <SectionHeading
            eyebrow="Buyer feedback"
            title="Customer Feedback Gallery"
            text="Real buyer feedback is displayed with private information hidden."
          />
          <p className="mx-auto mt-4 max-w-2xl rounded bg-white px-4 py-3 text-center text-sm font-semibold text-muted">
            Customer names, phone numbers, addresses, payment details, and tracking numbers are hidden for privacy.
          </p>
          <ShippingProofFeedbackGallery images={feedbackImages} />
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="container-page text-center">
          <h2 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">
            Review more products
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted">
            Browse the catalog and save the product IDs or screenshots you want to ask about.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="btn-primary w-full sm:w-auto" href="/catalog">
              Shop Catalog
            </Link>
            <Link className="btn-secondary w-full sm:w-auto" href="/new-arrivals">
              View New Arrivals
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
