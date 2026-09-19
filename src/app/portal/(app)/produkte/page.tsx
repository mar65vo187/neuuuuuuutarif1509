import { redirect } from "next/navigation";
import { ProductHubDashboard } from "@/components/portal/ProductHubDashboard";
import { getCurrentUser } from "@/lib/auth";
import { getProductHubData } from "@/lib/product-hub";

export const dynamic = "force-dynamic";
export const metadata = { title: "Produkte & Partner", robots: { index: false, follow: false } };

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fprodukte");

  const data = await getProductHubData(user);
  return <div className="space-y-6">
    <header>
      <p className="eyebrow text-electric-deep">Vertriebswissen</p>
      <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Produkte, Partner & Vermarktung</h1>
      <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-steel">
        Zentrale Übersicht für Produktwissen, Abschlusswege, Partnerkontakte, Vertriebsfreigaben, Provisionen und interne Änderungen.
      </p>
    </header>
    <ProductHubDashboard data={{
      ...data,
      products: data.products.map((product) => ({
        ...product,
        updatedAt: product.updatedAt?.toISOString() ?? null,
      })),
      providers: data.providers.map((provider) => ({
        ...provider,
        updatedAt: provider.updatedAt?.toISOString() ?? null,
      })),
      updates: data.updates.map((update) => ({
        ...update,
        createdAt: update.createdAt.toISOString(),
        readAt: update.readAt?.toISOString() ?? null,
      })),
      ownerData: data.ownerData ? {
        ...data.ownerData,
        commissionLists: data.ownerData.commissionLists.map((list) => ({
          ...list,
          validFrom: list.validFrom?.toISOString() ?? null,
          validTo: list.validTo?.toISOString() ?? null,
          createdAt: list.createdAt.toISOString(),
        })),
      } : null,
    }} isAdmin={user.role === "admin"} />
  </div>;
}
