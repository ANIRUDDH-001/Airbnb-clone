"use client";

import { useRouter } from "next/navigation";

import type { Category } from "@/lib/api/types";

import { CategoryBar } from "./CategoryBar";

export function HomeCategoryBar({ categories, active }: { categories: Category[]; active: string | null }) {
  const router = useRouter();
  return (
    <CategoryBar
      categories={categories}
      active={active}
      onOpenFilters={() => router.push(`/s/anywhere/homes?${active ? `category=${active}&` : ""}filters=open`)}
    />
  );
}
