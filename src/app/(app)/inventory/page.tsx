"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { CompartmentTabs, type Compartment } from "./_components/compartment-tabs";
import { InventoryList } from "./_components/inventory-list";

export default function InventoryPage() {
  const [compartment, setCompartment] = useState<Compartment>("all");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Inventory" description="Your household food stock" />
      <CompartmentTabs value={compartment} onChange={setCompartment} />
      <InventoryList compartment={compartment} />
    </div>
  );
}
