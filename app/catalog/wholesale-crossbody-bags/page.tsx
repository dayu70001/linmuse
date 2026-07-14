import { CatalogCollectionPage, createCatalogCollectionMetadata, type CollectionPageParam } from "@/components/seo/CatalogCollectionPage";
import { getCatalogCollection } from "@/lib/catalogCollections";

const config = getCatalogCollection("wholesale-crossbody-bags");
export async function generateMetadata({ searchParams }: { searchParams?: Promise<{ page?: CollectionPageParam }> }) {
  return createCatalogCollectionMetadata(config, (await searchParams)?.page);
}

export default async function Page({ searchParams }: { searchParams?: Promise<{ page?: CollectionPageParam }> }) {
  return <CatalogCollectionPage config={config} page={(await searchParams)?.page} />;
}
