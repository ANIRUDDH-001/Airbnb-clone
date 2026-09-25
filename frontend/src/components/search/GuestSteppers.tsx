"use client";

import clsx from "clsx";
import { Minus, Plus } from "lucide-react";

import type { Guests } from "@/lib/api/types";
import { MAX_GUESTS, MAX_INFANTS } from "@/lib/search";

interface GuestSteppersProps {
  value: Guests;
  onChange: (guests: Guests) => void;
  /** Listing capacity (adults + children). Infants never count, as on the live site. */
  maxGuests?: number;
  /** A booking needs at least one adult; a search can start from zero. */
  minAdults?: 0 | 1;
}

const ROWS = [
  { key: "adults", label: "Adults", hint: "Ages 13 or above" },
  { key: "children", label: "Children", hint: "Ages 2–12" },
  { key: "infants", label: "Infants", hint: "Under 2" },
] as const;

export function GuestSteppers({ value, onChange, maxGuests = MAX_GUESTS, minAdults = 0 }: GuestSteppersProps) {
  const guests = value.adults + value.children;

  function change(key: keyof Guests, delta: 1 | -1) {
    const next = { ...value, [key]: value[key] + delta };
    // Adding a child or infant implies an adult, as on the live site.
    if (delta > 0 && key !== "adults" && next.adults === 0) next.adults = 1;
    onChange(next);
  }

  function canIncrease(key: keyof Guests) {
    if (key === "infants") return value.infants < MAX_INFANTS;
    return guests < maxGuests && !(key === "children" && value.adults === 0 && guests + 1 >= maxGuests);
  }

  function canDecrease(key: keyof Guests) {
    if (key !== "adults") return value[key] > 0;
    // Keep an adult while children or infants are listed.
    return value.adults > Math.max(minAdults, value.children || value.infants ? 1 : 0);
  }

  return (
    <div className="divide-y divide-line">
      {ROWS.map(({ key, label, hint }) => (
        <div key={key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
          <div>
            <p className="font-semibold">{label}</p>
            <p className="text-sm text-muted">{hint}</p>
          </div>
          <div className="flex items-center gap-4">
            <StepButton label={`Decrease ${label.toLowerCase()}`} disabled={!canDecrease(key)} onClick={() => change(key, -1)}>
              <Minus className="size-3.5" strokeWidth={2.5} />
            </StepButton>
            <span className="w-4 text-center tabular-nums" aria-live="polite">{value[key]}</span>
            <StepButton label={`Increase ${label.toLowerCase()}`} disabled={!canIncrease(key)} onClick={() => change(key, 1)}>
              <Plus className="size-3.5" strokeWidth={2.5} />
            </StepButton>
          </div>
        </div>
      ))}
      {maxGuests < MAX_GUESTS && (
        <p className="pt-4 text-xs text-muted">
          This place has a maximum of {maxGuests} guests, not including infants.
        </p>
      )}
    </div>
  );
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "grid size-8 place-items-center rounded-full border transition",
        disabled ? "cursor-not-allowed border-[#ebebeb] text-[#ebebeb]" : "border-[#b0b0b0] text-muted hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
