"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { CompartmentTabs, type Compartment } from "./_components/compartment-tabs";
import { CategoryFilter } from "./_components/category-filter";
import { InventoryList } from "./_components/inventory-list";
import { QuickAddFab } from "./_components/quick-add-fab";

export default function InventoryPage() {
  const [compartment, setCompartment] = useState<Compartment>("all");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Inventory" description="Your household food stock" />
      <CompartmentTabs value={compartment} onChange={setCompartment} />
      <CategoryFilter value={categoryId} onChange={setCategoryId} />
      <InventoryList compartment={compartment} categoryId={categoryId} />
      <QuickAddFab />
    </div>
  );
}
