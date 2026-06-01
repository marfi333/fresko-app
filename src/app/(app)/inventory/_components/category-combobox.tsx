"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { Category } from "@/db/schema/categories";
import { useCategories } from "@/hooks/use-categories";
import { mutateOrEnqueue } from "@/lib/offline/mutate-or-enqueue";
import type { MirrorRow } from "@/lib/offline/types";

type CategoryComboboxProps = {
  value?: number;
  onChange: (categoryId: number | undefined) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
};

export const CategoryCombobox = ({
  value,
  onChange,
  id,
  placeholder = "Search or add a category…",
  disabled,
}: CategoryComboboxProps) => {
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = value && categories ? categories.find((c) => c.id === value) : undefined;

  useEffect(() => {
    if (selected && search === "") setSearch(selected.name);
  }, [selected, search]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const trimmed = search.trim();
  const filtered = (categories ?? []).filter((c) =>
    c.name.toLowerCase().includes(trimmed.toLowerCase())
  );
  const exactMatch = (categories ?? []).find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  const showCreate = trimmed.length > 0 && !exactMatch && !creating;

  const handlePick = (category: Category) => {
    onChange(category.id);
    setSearch(category.name);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(undefined);
    setSearch("");
  };

  const handleCreate = async () => {
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const now = Date.now();
      const synthetic: Category = {
        id: -now,
        name: trimmed,
        householdId: "offline",
        createdAt: new Date(now),
        updatedAt: new Date(now),
      };

      const result = await mutateOrEnqueue<Category>({
        entity: "categories",
        op: "create",
        payload: { name: trimmed },
        mirrorRow: { ...synthetic, id: String(synthetic.id) } as unknown as MirrorRow,
        online: async () => {
          const res = await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: trimmed }),
          });
          if (!res.ok) {
            const body = (await res.json()) as { error?: string };
            throw new Error(body.error ?? "Failed to create category");
          }
          return res.json();
        },
      });

      const created = result.kind === "applied" ? result.value : synthetic;
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      onChange(created.id);
      setSearch(created.name);
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        placeholder={placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
          if (value !== undefined) onChange(undefined);
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled || creating}
        aria-label="Category"
        autoComplete="off"
      />
      {selected && search === selected.name && !open && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground hover:text-foreground"
          aria-label="Clear category"
          tabIndex={-1}
        >
          ×
        </button>
      )}
      {open && (
        <div
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
          role="listbox"
        >
          {filtered.map((category) => (
            <button
              key={category.id}
              type="button"
              role="option"
              aria-selected={category.id === value}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => handlePick(category)}
            >
              <span className="flex-1 text-left">{category.name}</span>
            </button>
          ))}
          {filtered.length === 0 && !showCreate && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No categories yet — type a name to create one.
            </p>
          )}
          {showCreate && (
            <button
              type="button"
              role="option"
              aria-selected={false}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm font-medium text-primary hover:bg-accent"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? "Creating…" : <>Create &ldquo;{trimmed}&rdquo;</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
