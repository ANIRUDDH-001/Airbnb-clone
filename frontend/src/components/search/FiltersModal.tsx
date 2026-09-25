"use client";

import clsx from "clsx";
import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { NamedIcon } from "@/components/ui/icons";
import { api, ApiError } from "@/lib/api/client";
import type { Amenity, ListingCard, Page, PropertyType, RoomType } from "@/lib/api/types";
import { PROPERTY_LABELS } from "@/lib/format";
import { apiQuery, EMPTY_FILTERS, type Filters, type SearchState } from "@/lib/search";

interface FiltersModalProps {
  open: boolean;
  onClose: () => void;
  search: SearchState;
  amenities: Amenity[];
  onApply: (filters: Filters) => void;
}

const PLACE_TYPES: { value: RoomType | undefined; label: string }[] = [
  { value: undefined, label: "Any type" },
  { value: "private_room", label: "Room" },
  { value: "entire_home", label: "Entire home" },
];

const AMENITY_GROUP_ORDER = ["Essentials", "Features", "Location", "Safety"];

export function FiltersModal({ open, onClose, search, amenities, onApply }: FiltersModalProps) {
  const [draft, setDraft] = useState<Filters>(search.filters);
  const [count, setCount] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // Each time the modal opens, start from the filters currently applied.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(search.filters);
  }

  // Live "Show N places" count for the draft, debounced.
  useEffect(() => {
    if (!open) return;
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const page = await api.get<Page<ListingCard>>("/listings", apiQuery({ ...search, filters: draft, page: 1 }, 1));
        if (live) {
          setCount(page.total);
          setProblem(null);
        }
      } catch (error) {
        if (live) {
          setCount(null);
          setProblem(error instanceof ApiError ? error.message : "Couldn't count places");
        }
      }
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [open, draft, search]);

  const patch = (change: Partial<Filters>) => setDraft((current) => ({ ...current, ...change }));
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  // Functional updates, so quick successive clicks never work from a stale draft.
  const toggleAmenity = (code: string) => setDraft((current) => ({ ...current, amenities: toggle(current.amenities, code) }));
  const toggleType = (type: PropertyType) => setDraft((current) => ({ ...current, propertyTypes: toggle(current.propertyTypes, type) }));

  const groups = AMENITY_GROUP_ORDER.map((group) => ({
    group,
    items: amenities.filter((amenity) => amenity.group_name === group),
  })).filter((g) => g.items.length);
  const visibleGroups = showAllAmenities ? groups : groups.slice(0, 1);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filters"
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setDraft(EMPTY_FILTERS)} className="rounded-lg px-2 py-2 font-semibold underline hover:bg-soft">
            Clear all
          </button>
          <button
            type="button"
            disabled={Boolean(problem)}
            onClick={() => onApply(draft)}
            className="h-12 min-w-40 rounded-lg bg-ink px-6 font-semibold text-white transition hover:bg-black disabled:opacity-40"
          >
            {count === null ? "Show places" : count === 0 ? "No exact matches" : `Show ${count} ${count === 1 ? "place" : "places"}`}
          </button>
        </div>
      }
    >
      <Section title="Type of place">
        <div className="grid grid-cols-3 rounded-2xl border border-line p-1">
          {PLACE_TYPES.map(({ value, label }) => (
            <button
              key={label}
              type="button"
              aria-pressed={draft.roomType === value}
              onClick={() => patch({ roomType: value })}
              className={clsx(
                "h-12 rounded-xl text-sm font-semibold transition",
                draft.roomType === value ? "border-2 border-ink bg-soft" : "hover:bg-soft",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Price range" subtitle="Nightly prices before fees and taxes">
        <div className="flex items-center gap-4">
          <PriceInput label="Minimum" value={draft.minPrice} onChange={(minPrice) => patch({ minPrice })} />
          <span className="h-px w-4 bg-muted" />
          <PriceInput label="Maximum" value={draft.maxPrice} onChange={(maxPrice) => patch({ maxPrice })} />
        </div>
        {problem && <p role="alert" className="mt-3 text-sm text-brand-dark">{problem}</p>}
      </Section>

      <Section title="Rooms and beds">
        <CountRow label="Bedrooms" value={draft.minBedrooms} onChange={(minBedrooms) => patch({ minBedrooms })} />
        <CountRow label="Beds" value={draft.minBeds} onChange={(minBeds) => patch({ minBeds })} />
        <CountRow label="Bathrooms" value={draft.minBathrooms} onChange={(minBathrooms) => patch({ minBathrooms })} />
      </Section>

      <Section title="Amenities">
        {visibleGroups.map(({ group, items }) => (
          <div key={group} className="mb-5 last:mb-0">
            {showAllAmenities && <h4 className="mb-3 font-semibold">{group}</h4>}
            <div className="flex flex-wrap gap-3">
              {items.map((amenity) => {
                const on = draft.amenities.includes(amenity.code);
                return (
                  <button
                    key={amenity.code}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleAmenity(amenity.code)}
                    className={clsx(
                      "flex h-12 items-center gap-2 rounded-full border px-4 text-sm transition",
                      on ? "border-2 border-ink bg-soft" : "border-line hover:border-ink",
                    )}
                  >
                    <NamedIcon name={amenity.icon} className="size-5" strokeWidth={1.6} />
                    {amenity.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setShowAllAmenities((v) => !v)} className="mt-4 font-semibold underline">
          {showAllAmenities ? "Show less" : "Show more"}
        </button>
      </Section>

      <Section title="Property type" last>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(PROPERTY_LABELS) as PropertyType[]).map((type) => {
            const on = draft.propertyTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                aria-pressed={on}
                onClick={() => toggleType(type)}
                className={clsx(
                  "h-14 rounded-xl border px-4 text-left text-sm font-semibold transition",
                  on ? "border-2 border-ink bg-soft" : "border-line hover:border-ink",
                )}
              >
                {PROPERTY_LABELS[type]}
              </button>
            );
          })}
        </div>
      </Section>
    </Modal>
  );
}

function Section({ title, subtitle, last, children }: { title: string; subtitle?: string; last?: boolean; children: React.ReactNode }) {
  return (
    <section className={clsx("py-8 first:pt-0", !last && "border-b border-line", last && "pb-0")}>
      <h3 className="text-[22px] font-semibold">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function PriceInput({ label, value, onChange }: { label: string; value?: number; onChange: (value?: number) => void }) {
  return (
    <label className="flex-1 rounded-full border border-[#b0b0b0] px-5 py-2 focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
      <span className="block text-xs text-muted">{label}</span>
      <span className="flex items-center gap-1">
        ₹
        <input
          inputMode="numeric"
          value={value ?? ""}
          placeholder={label === "Minimum" ? "0" : "Any"}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "");
            onChange(digits ? Number(digits) : undefined);
          }}
          className="w-full bg-transparent outline-none"
        />
      </span>
    </label>
  );
}

function CountRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span>{label}</span>
      <div className="flex items-center gap-4">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value === 0} onClick={() => onChange(value - 1)}
                className="grid size-8 place-items-center rounded-full border border-[#b0b0b0] text-muted hover:border-ink disabled:cursor-not-allowed disabled:border-[#ebebeb] disabled:text-[#ebebeb]">
          <Minus className="size-3.5" strokeWidth={2.5} />
        </button>
        <span className="w-10 text-center">{value === 0 ? "Any" : `${value}+`}</span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= 8} onClick={() => onChange(value + 1)}
                className="grid size-8 place-items-center rounded-full border border-[#b0b0b0] text-muted hover:border-ink disabled:cursor-not-allowed disabled:border-[#ebebeb] disabled:text-[#ebebeb]">
          <Plus className="size-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
