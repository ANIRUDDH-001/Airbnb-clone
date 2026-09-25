"use client";

import clsx from "clsx";
import {
  ArrowDown, ArrowUp, BedDouble, Building, Castle, House, Hotel, ImagePlus, MapPin, Minus, Plus, Ship, TentTree,
  Tractor, Trash2, Trees, Warehouse,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { NamedIcon } from "@/components/ui/icons";
import type { Amenity, Category, Destination, PropertyType, RoomType } from "@/lib/api/types";
import { DEMO_PHOTOS } from "@/lib/demo-photos";
import { formatINR, PROPERTY_LABELS, sizedPhoto } from "@/lib/format";
import { applyDestination, type FieldErrors, LIMITS, type ListingDraft } from "@/lib/listing-form";

export interface SectionProps {
  draft: ListingDraft;
  update: (patch: Partial<ListingDraft> | ((draft: ListingDraft) => Partial<ListingDraft>)) => void;
  errors: FieldErrors;
}

const PROPERTY_ICONS: Record<PropertyType, typeof House> = {
  house: House, flat: Building, guest_house: BedDouble, hotel: Hotel, villa: Castle, cabin: TentTree,
  cottage: Trees, tiny_home: Warehouse, farm_stay: Tractor, houseboat: Ship,
};

const ROOM_CHOICES: { value: RoomType; title: string; text: string }[] = [
  { value: "entire_home", title: "An entire place", text: "Guests have the whole place to themselves." },
  { value: "private_room", title: "A room", text: "Guests have their own room in a home, plus access to shared spaces." },
  { value: "shared_room", title: "A shared room", text: "Guests sleep in a room or common area that may be shared." },
];

export function FieldError({ message }: { message?: string }) {
  return message ? <p role="alert" className="mt-2 text-sm text-[#c13515]">{message}</p> : null;
}

/* ---------------------------------------------------------------- type */

export function TypeSection({ draft, update }: SectionProps) {
  return (
    <div className="space-y-10">
      <div>
        <h3 className="mb-4 font-semibold">Which of these best describes your place?</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(Object.keys(PROPERTY_LABELS) as PropertyType[]).map((type) => {
            const Icon = PROPERTY_ICONS[type];
            const on = draft.property_type === type;
            return (
              <button key={type} type="button" aria-pressed={on} onClick={() => update({ property_type: type })}
                      className={clsx("flex flex-col gap-3 rounded-xl border p-4 text-left transition",
                        on ? "border-2 border-ink bg-soft" : "border-line hover:border-ink")}>
                <Icon className="size-8" strokeWidth={1.4} />
                <span className="font-semibold">{PROPERTY_LABELS[type]}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="mb-4 font-semibold">What type of place will guests have?</h3>
        <div className="space-y-3">
          {ROOM_CHOICES.map(({ value, title, text }) => {
            const on = draft.room_type === value;
            return (
              <button key={value} type="button" aria-pressed={on} onClick={() => update({ room_type: value })}
                      className={clsx("block w-full rounded-xl border p-5 text-left transition",
                        on ? "border-2 border-ink bg-soft" : "border-line hover:border-ink")}>
                <span className="block text-lg font-semibold">{title}</span>
                <span className="text-sm text-muted">{text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- location */

export function LocationSection({ draft, update, errors, destinations }: SectionProps & { destinations: Destination[] }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-1 font-semibold">Start from a destination</h3>
        <p className="mb-4 text-sm text-muted">Fills in the city, state, country and map pin. You can adjust them below.</p>
        <div className="flex flex-wrap gap-2">
          {destinations.map((d) => (
            <button key={d.name} type="button" onClick={() => update((current) => applyDestination(current, d))}
                    aria-pressed={draft.city === d.name}
                    className={clsx("flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition",
                      draft.city === d.name ? "border-ink bg-soft font-semibold" : "border-line hover:border-ink")}>
              <MapPin className="size-3.5" /> {d.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Street address" value={draft.address} onChange={(address) => update({ address })} error={errors.address} className="sm:col-span-2" />
        <TextInput label="City / area" value={draft.city} onChange={(city) => update({ city })} error={errors.city} />
        <TextInput label="State (optional)" value={draft.state} onChange={(state) => update({ state })} error={errors.state} />
        <TextInput label="Country" value={draft.country} onChange={(country) => update({ country })} error={errors.country} />
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="Latitude" value={draft.latitude} step="any" onChange={(latitude) => update({ latitude })} />
          <NumberInput label="Longitude" value={draft.longitude} step="any" onChange={(longitude) => update({ longitude })} />
        </div>
      </div>
      <FieldError message={errors.latitude} />
    </div>
  );
}

/* ---------------------------------------------------------------- basics */

export function BasicsSection({ draft, update, errors }: SectionProps) {
  const rows: { key: "max_guests" | "bedrooms" | "beds" | "bathrooms"; label: string }[] = [
    { key: "max_guests", label: "Guests" },
    { key: "bedrooms", label: "Bedrooms" },
    { key: "beds", label: "Beds" },
    { key: "bathrooms", label: "Bathrooms" },
  ];
  return (
    <div className="divide-y divide-line">
      {rows.map(({ key, label }) => {
        const [min, max] = LIMITS[key];
        return (
          <div key={key} className="py-5">
            <div className="flex items-center justify-between">
              <span className="text-lg">{label}</span>
              <div className="flex items-center gap-4">
                <RoundButton label={`Fewer ${label.toLowerCase()}`} disabled={draft[key] <= min} onClick={() => update({ [key]: draft[key] - 1 })}>
                  <Minus className="size-3.5" strokeWidth={2.5} />
                </RoundButton>
                <span className="w-6 text-center tabular-nums">{draft[key]}</span>
                <RoundButton label={`More ${label.toLowerCase()}`} disabled={draft[key] >= max} onClick={() => update({ [key]: draft[key] + 1 })}>
                  <Plus className="size-3.5" strokeWidth={2.5} />
                </RoundButton>
              </div>
            </div>
            <FieldError message={errors[key]} />
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- amenities */

export function AmenitiesSection({ draft, update, errors, amenities }: SectionProps & { amenities: Amenity[] }) {
  const groups = [...new Set(amenities.map((a) => a.group_name))];
  const toggle = (code: string) =>
    update((current) => ({
      amenity_codes: current.amenity_codes.includes(code)
        ? current.amenity_codes.filter((c) => c !== code)
        : [...current.amenity_codes, code],
    }));
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group}>
          <h3 className="mb-3 font-semibold">{group}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {amenities.filter((a) => a.group_name === group).map((amenity) => {
              const on = draft.amenity_codes.includes(amenity.code);
              return (
                <button key={amenity.code} type="button" aria-pressed={on} onClick={() => toggle(amenity.code)}
                        className={clsx("flex flex-col gap-2 rounded-xl border p-4 text-left text-sm font-semibold transition",
                          on ? "border-2 border-ink bg-soft" : "border-line hover:border-ink")}>
                  <NamedIcon name={amenity.icon} className="size-7" strokeWidth={1.4} />
                  {amenity.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <FieldError message={errors.amenity_codes} />
    </div>
  );
}

/* ---------------------------------------------------------------- photos */

export function PhotosSection({ draft, update, errors }: SectionProps) {
  const [url, setUrl] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const photos = draft.photo_urls;

  function add() {
    const value = url.trim();
    if (!/^https?:\/\/\S+$/.test(value)) return setInputError("Paste a web address that starts with https://");
    if (photos.includes(value)) return setInputError("That photo is already added");
    if (photos.length >= LIMITS.photos[1]) return setInputError(`You can add up to ${LIMITS.photos[1]} photos`);
    update((current) => ({ photo_urls: [...current.photo_urls, value] }));
    setUrl("");
    setInputError(null);
  }

  function move(index: number, delta: -1 | 1) {
    update((current) => {
      const next = [...current.photo_urls];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return { photo_urls: next };
    });
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Photo uploads aren&apos;t part of this demo: paste image links instead. The first photo is the cover.
      </p>
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Photo URL</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            placeholder="https://images.unsplash.com/photo-…"
            className="h-12 w-full rounded-lg border border-[#b0b0b0] px-4 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
          />
        </label>
        <button type="button" onClick={add} className="rounded-lg bg-ink px-5 font-semibold text-white">Add</button>
      </div>
      <FieldError message={inputError ?? undefined} />
      {!photos.length && (
        <button type="button" onClick={() => update({ photo_urls: DEMO_PHOTOS })}
                className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-ink px-4 py-3 text-sm font-semibold hover:bg-soft">
          <ImagePlus className="size-4" /> Add demo photos
        </button>
      )}

      {photos.length > 0 && (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={`${index}-${photo}`} className={clsx("relative overflow-hidden rounded-xl border border-line", index === 0 && "col-span-2 sm:col-span-3")}>
              {/* eslint-disable-next-line @next/next/no-img-element -- host-supplied URLs, served as-is */}
              <img src={sizedPhoto(photo, index === 0 ? 1200 : 480)} alt={`Photo ${index + 1}`}
                   className={clsx("w-full object-cover", index === 0 ? "aspect-[3/2]" : "aspect-square")} />
              {index === 0 && <span className="absolute left-3 top-3 rounded-md bg-white px-2 py-1 text-xs font-semibold shadow">Cover photo</span>}
              <div className="absolute right-2 top-2 flex gap-1">
                <IconButton label="Move earlier" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="size-3.5" /></IconButton>
                <IconButton label="Move later" disabled={index === photos.length - 1} onClick={() => move(index, 1)}><ArrowDown className="size-3.5" /></IconButton>
                <IconButton label="Remove photo" onClick={() => update((current) => ({ photo_urls: current.photo_urls.filter((_, i) => i !== index) }))}>
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <FieldError message={errors.photo_urls} />
    </div>
  );
}

/* ---------------------------------------------------------------- details */

export function DetailsSection({ draft, update, errors, categories }: SectionProps & { categories: Category[] }) {
  const toggle = (slug: string) =>
    update((current) => ({
      category_slugs: current.category_slugs.includes(slug)
        ? current.category_slugs.filter((s) => s !== slug)
        : [...current.category_slugs, slug].slice(0, 10),
    }));
  return (
    <div className="space-y-8">
      <div>
        <TextInput label="Title" value={draft.title} onChange={(title) => update({ title })} error={errors.title} maxLength={LIMITS.title[1]} />
        <p className="mt-1 text-right text-xs text-muted">{draft.title.length}/{LIMITS.title[1]}</p>
      </div>
      <div>
        <label className="block rounded-lg border border-[#b0b0b0] px-4 py-3 focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
          <span className="block text-xs text-muted">Description</span>
          <textarea value={draft.description} rows={7} maxLength={LIMITS.description[1]}
                    onChange={(event) => update({ description: event.target.value })}
                    placeholder="What makes your place special? Describe the space, what guests can use, and the neighbourhood."
                    className="mt-1 w-full resize-y bg-transparent outline-none" />
        </label>
        <div className="flex justify-between">
          <FieldError message={errors.description} />
          <p className="ml-auto mt-1 text-xs text-muted">{draft.description.length}/{LIMITS.description[1]}</p>
        </div>
      </div>
      <div>
        <h3 className="mb-1 font-semibold">Categories</h3>
        <p className="mb-3 text-sm text-muted">Where your place appears in the category bar on the home page.</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const on = draft.category_slugs.includes(category.slug);
            return (
              <button key={category.slug} type="button" aria-pressed={on} onClick={() => toggle(category.slug)}
                      className={clsx("flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                        on ? "border-ink bg-soft font-semibold" : "border-line hover:border-ink")}>
                <NamedIcon name={category.icon} className="size-4" /> {category.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- price */

export function PriceSection({ draft, update, errors }: SectionProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <label className="inline-flex items-baseline text-[64px] font-extrabold leading-none">
          <span>₹</span>
          <span className="sr-only">Nightly price</span>
          <input
            inputMode="numeric"
            value={draft.nightly_price || ""}
            onChange={(event) => update({ nightly_price: Number(event.target.value.replace(/\D/g, "")) || 0 })}
            className="w-[5.5ch] bg-transparent text-center outline-none"
          />
        </label>
        <p className="text-muted">per night</p>
        <FieldError message={errors.nightly_price} />
      </div>
      <div className="mx-auto max-w-sm">
        <label className="block rounded-lg border border-[#b0b0b0] px-4 py-3 focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
          <span className="block text-xs text-muted">Cleaning fee (once per stay)</span>
          <span className="flex items-center gap-1">
            ₹
            <input inputMode="numeric" value={draft.cleaning_fee}
                   onChange={(event) => update({ cleaning_fee: Number(event.target.value.replace(/\D/g, "")) || 0 })}
                   className="w-full bg-transparent outline-none" />
          </span>
        </label>
        <FieldError message={errors.cleaning_fee} />
        <p className="mt-4 text-sm text-muted">
          Guests also pay a service fee and taxes, added at checkout. A 3-night stay starts from{" "}
          {formatINR(draft.nightly_price * 3 + draft.cleaning_fee)} before those.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- inputs */

export function TextInput({ label, value, onChange, error, className, maxLength }: {
  label: string; value: string; onChange: (value: string) => void; error?: string; className?: string; maxLength?: number;
}) {
  return (
    <div className={className}>
      <label className={clsx("block rounded-lg border px-4 py-2.5 focus-within:ring-1",
        error ? "border-[#c13515] focus-within:ring-[#c13515]" : "border-[#b0b0b0] focus-within:border-ink focus-within:ring-ink")}>
        <span className="block text-xs text-muted">{label}</span>
        <input value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)}
               aria-invalid={Boolean(error)} className="w-full bg-transparent outline-none" />
      </label>
      <FieldError message={error} />
    </div>
  );
}

function NumberInput({ label, value, onChange, step }: { label: string; value: number | null; onChange: (value: number | null) => void; step?: string }) {
  return (
    <label className="block rounded-lg border border-[#b0b0b0] px-4 py-2.5 focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
      <span className="block text-xs text-muted">{label}</span>
      <input type="number" step={step} value={value ?? ""}
             onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
             className="w-full bg-transparent outline-none" />
    </label>
  );
}

function RoundButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick}
            className="grid size-8 place-items-center rounded-full border border-[#b0b0b0] text-muted hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:border-[#ebebeb] disabled:text-[#ebebeb]">
      {children}
    </button>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick}
            className="grid size-7 place-items-center rounded-full bg-white/95 shadow hover:bg-white disabled:opacity-30">
      {children}
    </button>
  );
}
