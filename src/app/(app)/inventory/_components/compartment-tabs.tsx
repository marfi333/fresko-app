"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COMPARTMENTS = [
  { value: "all", label: "All" },
  { value: "pantry", label: "Pantry" },
  { value: "fridge", label: "Fridge" },
  { value: "freezer", label: "Freezer" },
] as const;

export type Compartment = "all" | "pantry" | "fridge" | "freezer";

type CompartmentTabsProps = {
  value: Compartment;
  onChange: (value: Compartment) => void;
};

export const CompartmentTabs = ({ value, onChange }: CompartmentTabsProps) => {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as Compartment)} className="px-6">
      <TabsList className="w-full">
        {COMPARTMENTS.map((c) => (
          <TabsTrigger key={c.value} value={c.value} className="flex-1">
            {c.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
