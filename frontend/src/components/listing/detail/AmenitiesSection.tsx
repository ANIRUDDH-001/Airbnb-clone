"use client";

import { useState } from "react";

import { NamedIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import type { Amenity } from "@/lib/api/types";

const PREVIEW = 10;

export function AmenitiesSection({ amenities }: { amenities: Amenity[] }) {
  const [open, setOpen] = useState(false);
  const groups = [...new Set(amenities.map((a) => a.group_name))];

  return (
    <section className="border-b border-line py-12">
      <h2 className="mb-6 text-[22px] font-semibold">What this place offers</h2>
      <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {amenities.slice(0, PREVIEW).map((amenity) => (
          <li key={amenity.code} className="flex items-center gap-4">
            <NamedIcon name={amenity.icon} className="size-6" strokeWidth={1.5} />
            {amenity.name}
          </li>
        ))}
      </ul>
      {amenities.length > PREVIEW && (
        <button type="button" onClick={() => setOpen(true)}
                className="mt-8 rounded-lg border border-ink px-6 py-3 font-semibold hover:bg-soft">
          Show all {amenities.length} amenities
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="What this place offers" size="md">
        {groups.map((group) => (
          <div key={group} className="mb-8 last:mb-0">
            <h3 className="mb-2 text-lg font-semibold">{group}</h3>
            <ul className="divide-y divide-line">
              {amenities.filter((a) => a.group_name === group).map((amenity) => (
                <li key={amenity.code} className="flex items-center gap-4 py-5">
                  <NamedIcon name={amenity.icon} className="size-6" strokeWidth={1.5} />
                  {amenity.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Modal>
    </section>
  );
}
