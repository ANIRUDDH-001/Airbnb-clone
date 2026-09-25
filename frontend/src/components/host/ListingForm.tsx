"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api/client";
import type { Amenity, Category, Destination, ListingDetail } from "@/lib/api/types";
import { cardHeading, formatINR, plural, sizedPhoto } from "@/lib/format";
import {
  errorsFromServer, type FieldErrors, type ListingDraft, type Step, STEP_FIELDS, stepErrors, STEPS, toListingWrite, validate,
} from "@/lib/listing-form";

import {
  AmenitiesSection, BasicsSection, DetailsSection, LocationSection, PhotosSection, PriceSection, type SectionProps, TypeSection,
} from "./ListingFormSections";

interface ListingFormProps {
  mode: "create" | "edit";
  listingId?: number;
  initial: ListingDraft;
  amenities: Amenity[];
  categories: Category[];
  destinations: Destination[];
}

const TITLES: Record<Step, { title: string; subtitle: string }> = {
  type: { title: "Tell us about your place", subtitle: "Pick the kind of property and what guests will have." },
  location: { title: "Where's your place located?", subtitle: "Your address is only shared with guests after they book." },
  basics: { title: "Share some basics about your place", subtitle: "You'll add more details later." },
  amenities: { title: "Tell guests what your place has to offer", subtitle: "You can add more amenities after you publish." },
  photos: { title: "Add some photos of your place", subtitle: "You'll need at least one photo to get started." },
  details: { title: "Now, give your place a title and description", subtitle: "Short titles work best. Have fun with it." },
  price: { title: "Now, set your price", subtitle: "You can change it anytime." },
  review: { title: "Review your listing", subtitle: "Here's what guests will see. Make sure everything looks good." },
};

/**
 * One form, two layouts: a step-by-step wizard for a new listing (like the live site's "Airbnb your home"),
 * and every section stacked on one page for editing.
 */
export function ListingForm({ mode, listingId, initial, amenities, categories, destinations }: ListingFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const update: SectionProps["update"] = (patch) => {
    setDraft((current) => ({ ...current, ...(typeof patch === "function" ? patch(current) : patch) }));
  };

  function renderSection(step: Step) {
    const props = { draft, update, errors };
    switch (step) {
      case "type": return <TypeSection {...props} />;
      case "location": return <LocationSection {...props} destinations={destinations} />;
      case "basics": return <BasicsSection {...props} />;
      case "amenities": return <AmenitiesSection {...props} amenities={amenities} />;
      case "photos": return <PhotosSection {...props} />;
      case "details": return <DetailsSection {...props} categories={categories} />;
      case "price": return <PriceSection {...props} />;
      case "review": return <ReviewPanel draft={draft} />;
    }
  }

  async function save() {
    const all = validate(draft);
    if (Object.keys(all).length) {
      setErrors(all);
      if (mode === "create") setStepIndex(STEPS.findIndex((step) => STEP_FIELDS[step].some((field) => all[field])));
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSaving(true);
    try {
      const body = toListingWrite(draft);
      const saved = mode === "create"
        ? await api.post<ListingDetail>("/host/listings", body)
        : await api.put<ListingDetail>(`/host/listings/${listingId}`, body);
      toast.success(mode === "create" ? "Your listing is live" : "Changes saved");
      router.push(mode === "create" ? `/rooms/${saved.id}` : "/hosting/listings");
      router.refresh(); // header "Switch to hosting" and the listings page
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const fromServer = errorsFromServer(error.details);
        if (error.code === "unknown_amenity") fromServer.amenity_codes = error.message;
        if (error.code === "unknown_category") fromServer.category_slugs = error.message;
        setErrors(fromServer);
      }
      toast.error(error instanceof ApiError ? error.message : "Couldn't save the listing. Please try again.");
      setSaving(false);
    }
  }

  if (mode === "edit") {
    return (
      <div className="pb-28">
        {STEPS.filter((step) => step !== "review").map((step) => (
          <section key={step} className="border-b border-line py-10 first:pt-0">
            <h2 className="text-[22px] font-semibold">{TITLES[step].title}</h2>
            <p className="mb-6 text-muted">{TITLES[step].subtitle}</p>
            {renderSection(step)}
          </section>
        ))}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white">
          <div className="mx-auto flex max-w-[760px] items-center justify-between px-6 py-4">
            <button type="button" onClick={() => router.push("/hosting/listings")} className="font-semibold underline">Cancel</button>
            <button type="button" onClick={save} disabled={saving}
                    className="rounded-lg bg-ink px-6 py-3 font-semibold text-white hover:bg-black disabled:opacity-50">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const step = STEPS[stepIndex];
  const last = stepIndex === STEPS.length - 1;

  function next() {
    const found = stepErrors(step, draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    setStepIndex((index) => index + 1);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="pb-28">
      <p className="text-sm font-semibold text-muted">Step {stepIndex + 1} of {STEPS.length}</p>
      <h1 className="mt-1 text-[32px] font-semibold leading-9">{TITLES[step].title}</h1>
      <p className="mb-8 mt-2 text-muted">{TITLES[step].subtitle}</p>
      {renderSection(step)}

      <div className="fixed inset-x-0 bottom-0 z-40 bg-white">
        <div className="h-1.5 bg-hover">
          <div className="h-full bg-ink transition-all" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
        </div>
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-6 py-4">
          <button type="button" disabled={stepIndex === 0} onClick={() => { setErrors({}); setStepIndex((i) => i - 1); }}
                  className="font-semibold underline disabled:opacity-0">
            Back
          </button>
          <button type="button" onClick={last ? save : next} disabled={saving}
                  className={last ? "bg-brand-gradient rounded-lg px-8 py-3 font-semibold text-white disabled:opacity-50"
                    : "rounded-lg bg-ink px-8 py-3 font-semibold text-white hover:bg-black"}>
            {last ? (saving ? "Publishing…" : "Publish listing") : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewPanel({ draft }: { draft: ListingDraft }) {
  return (
    <div className="grid gap-8 sm:grid-cols-[320px_1fr]">
      <div className="rounded-2xl p-4 shadow-float">
        {draft.photo_urls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element -- host-supplied URL, served as-is
          <img src={sizedPhoto(draft.photo_urls[0], 720)} alt="" className="aspect-square w-full rounded-xl object-cover" />
        ) : (
          <div className="aspect-square rounded-xl bg-soft" />
        )}
        <p className="mt-3 font-semibold">{draft.title || "Untitled listing"}</p>
        <p className="text-sm text-muted">{draft.city ? cardHeading(draft.property_type, draft.room_type, draft.city) : "No location yet"}</p>
        <p className="mt-1"><span className="font-semibold">{formatINR(draft.nightly_price)}</span> night</p>
      </div>
      <dl className="space-y-4 text-sm">
        <Fact label="Location" value={[draft.address, draft.city, draft.state, draft.country].filter(Boolean).join(", ")} />
        <Fact label="Space" value={[plural(draft.max_guests, "guest"), plural(draft.bedrooms, "bedroom"), plural(draft.beds, "bed"), plural(draft.bathrooms, "bathroom")].join(" · ")} />
        <Fact label="Amenities" value={plural(draft.amenity_codes.length, "amenity", "amenities")} />
        <Fact label="Photos" value={plural(draft.photo_urls.length, "photo")} />
        <Fact label="Cleaning fee" value={formatINR(draft.cleaning_fee)} />
        <p className="pt-2 text-muted">Your listing goes live in search as soon as you publish.</p>
      </dl>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold">{label}</dt>
      <dd className="text-muted">{value}</dd>
    </div>
  );
}
