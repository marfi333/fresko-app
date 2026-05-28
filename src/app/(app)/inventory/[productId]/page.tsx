"use client";

import { use } from "react";
import Link from "next/link";
import { useProducts } from "@/hooks/use-products";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EntryList } from "./_components/entry-list";

interface ProductDetailPageProps {
  params: Promise<{ productId: string }>;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { productId } = use(params);
  const id = parseInt(productId, 10);
  const { data: products } = useProducts();
  const product = products?.find((p) => p.id === id);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={product?.name ?? "Loading..."}
        description={product ? `${product.unit} · ${product.id}` : undefined}
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/inventory">Back</Link>
          </Button>
        }
      />
      <EntryList productId={id} />
    </div>
  );
}
