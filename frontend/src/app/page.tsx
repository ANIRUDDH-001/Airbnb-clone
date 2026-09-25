import { serverGet } from "@/lib/api/server";
import type { Category } from "@/lib/api/types";

// Temporary F3 page: proves server-side fetching through BACKEND_URL. Replaced by the home grid in F4.
export default async function HomePage() {
  const categories = await serverGet<Category[]>("/categories");
  return (
    <div className="mx-auto max-w-[1880px] px-6 py-8 lg:px-10 xl:px-20">
      <p className="text-muted">{categories.length} categories loaded from the API.</p>
    </div>
  );
}
