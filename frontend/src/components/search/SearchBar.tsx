"use client";

import clsx from "clsx";
import { format, parseISO } from "date-fns";
import { MapPin, Search, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { RangeCalendar } from "@/components/calendar/RangeCalendar";
import { todayIST } from "@/lib/dates";
import { formatRange, guestsLabel } from "@/lib/format";
import { guestCount, type SearchState } from "@/lib/search";

import { GuestSteppers } from "./GuestSteppers";
import { useDestinations, useSearchDraft } from "./useSearchDraft";

type Panel = "where" | "checkIn" | "checkOut" | "who" | null;

const shortDate = (value?: string) => (value ? format(parseISO(value), "d MMM") : null);
const whoLabel = (state: SearchState) => (guestCount(state) + state.infants ? guestsLabel(state) : null);

export function SearchBar({ variant }: { variant: "expanded" | "compact" | "mobile" }) {
  if (variant === "mobile") return <MobileSearch />;
  if (variant === "compact") return <CompactSearch />;
  return <ExpandedSearch />;
}

/* ------------------------------------------------------------------ expanded (home and search pages) */

function ExpandedSearch({ initialPanel = null, onDone }: { initialPanel?: Panel; onDone?: () => void }) {
  const { draft, update, submit } = useSearchDraft();
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const root = useRef<HTMLDivElement>(null);
  const whereInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialPanel === "where") whereInput.current?.focus();
  }, [initialPanel]);

  useEffect(() => {
    if (!panel) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setPanel(null);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setPanel(null);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [panel]);

  function go() {
    setPanel(null);
    submit();
    onDone?.();
  }

  const active = panel !== null;

  return (
    <div ref={root} className="relative w-[850px] max-w-full">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          go();
        }}
        className={clsx(
          "grid h-16 grid-cols-[1.4fr_1fr_1fr_1.3fr] items-center rounded-full border border-line shadow-search transition",
          active ? "bg-hover" : "bg-white",
        )}
      >
        <Segment active={panel === "where"} onActivate={() => { setPanel("where"); whereInput.current?.focus(); }}
                 clear={panel === "where" && draft.location ? () => update({ location: "" }) : undefined} first>
          <label className="block cursor-pointer">
            <span className="block text-xs font-semibold">Where</span>
            <input
              ref={whereInput}
              value={draft.location}
              onChange={(event) => update({ location: event.target.value })}
              onFocus={() => setPanel("where")}
              placeholder="Search destinations"
              className="w-full truncate bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </label>
        </Segment>

        <Segment active={panel === "checkIn"} onActivate={() => setPanel("checkIn")}
                 clear={panel === "checkIn" && draft.checkIn ? () => update({ checkIn: undefined, checkOut: undefined }) : undefined}>
          <SegmentText label="Check in" value={shortDate(draft.checkIn)} placeholder="Add dates" />
        </Segment>

        <Segment active={panel === "checkOut"} onActivate={() => setPanel(draft.checkIn ? "checkOut" : "checkIn")}
                 clear={panel === "checkOut" && draft.checkOut ? () => update({ checkOut: undefined }) : undefined}>
          <SegmentText label="Check out" value={shortDate(draft.checkOut)} placeholder="Add dates" />
        </Segment>

        <Segment active={panel === "who"} onActivate={() => setPanel("who")} last
                 clear={panel === "who" && whoLabel(draft) ? () => update({ adults: 0, children: 0, infants: 0 }) : undefined}>
          <div className="flex items-center gap-2">
            <SegmentText label="Who" value={whoLabel(draft)} placeholder="Add guests" />
            <button
              type="submit"
              onClick={(event) => event.stopPropagation()}
              className={clsx(
                "bg-brand-gradient flex h-12 shrink-0 items-center justify-center gap-2 rounded-full font-semibold text-white transition-all",
                active ? "px-4" : "w-12",
              )}
            >
              <Search className="size-4" strokeWidth={3} />
              {active && <span>Search</span>}
            </button>
          </div>
        </Segment>
      </form>

      {panel === "where" && (
        <PanelBox className="left-0 w-[425px] py-6">
          <DestinationPicker
            query={draft.location}
            onPick={(location) => {
              update({ location });
              setPanel("checkIn");
            }}
          />
        </PanelBox>
      )}
      {(panel === "checkIn" || panel === "checkOut") && (
        <PanelBox className="inset-x-0 px-10 py-8">
          <RangeCalendar
            checkIn={draft.checkIn}
            checkOut={draft.checkOut}
            today={todayIST()}
            onChange={(stay) => {
              update(stay);
              setPanel(stay.checkOut ? "who" : "checkOut");
            }}
          />
          <CalendarFooter state={draft} onClear={() => update({ checkIn: undefined, checkOut: undefined })} />
        </PanelBox>
      )}
      {panel === "who" && (
        <PanelBox className="right-0 w-[425px] px-8 py-6">
          <GuestSteppers value={draft} onChange={(guests) => update(guests)} />
        </PanelBox>
      )}
    </div>
  );
}

function Segment({ active, onActivate, clear, first, last, children }: {
  active: boolean; onActivate: () => void; clear?: () => void; first?: boolean; last?: boolean; children: ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={-1}
      onClick={onActivate}
      className={clsx(
        "relative flex h-full cursor-pointer items-center rounded-full py-2 transition",
        first ? "pl-8 pr-4" : last ? "pl-6 pr-2" : "px-6",
        active ? "bg-white shadow-card" : "hover:bg-hover",
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {clear && (
        <button
          type="button"
          aria-label="Clear"
          onClick={(event) => {
            event.stopPropagation();
            clear();
          }}
          className={clsx("grid size-6 shrink-0 place-items-center rounded-full bg-hover hover:bg-line", last ? "mr-2" : "")}
        >
          <X className="size-3" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}

function SegmentText({ label, value, placeholder }: { label: string; value: string | null; placeholder: string }) {
  return (
    <button type="button" className="block min-w-0 flex-1 text-left">
      <span className="block text-xs font-semibold">{label}</span>
      <span className={clsx("block truncate text-sm", value ? "font-semibold text-ink" : "text-muted")}>{value ?? placeholder}</span>
    </button>
  );
}

function PanelBox({ className, children }: { className: string; children: ReactNode }) {
  return <div className={clsx("absolute top-full z-50 mt-3 rounded-[32px] bg-white shadow-float", className)}>{children}</div>;
}

function CalendarFooter({ state, onClear }: { state: SearchState; onClear: () => void }) {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
      <span className="text-muted">
        {state.checkIn && state.checkOut ? formatRange(state.checkIn, state.checkOut) : state.checkIn ? "Select your check-out date" : "Select your check-in date"}
      </span>
      <button type="button" onClick={onClear} className="font-semibold underline disabled:opacity-30" disabled={!state.checkIn}>
        Clear dates
      </button>
    </div>
  );
}

function DestinationPicker({ query, onPick }: { query: string; onPick: (location: string) => void }) {
  const destinations = useDestinations();
  const term = query.trim().toLowerCase();
  const matches = term
    ? destinations.filter((d) => `${d.name} ${d.state} ${d.country}`.toLowerCase().includes(term))
    : destinations;

  return (
    <div>
      <p className="px-8 pb-2 text-xs font-semibold">{term ? "Destinations" : "Suggested destinations"}</p>
      <ul className="max-h-[380px] overflow-y-auto">
        {matches.map((d) => (
          <li key={d.name}>
            <button
              type="button"
              onClick={() => onPick(d.name)}
              className="flex w-full items-center gap-4 px-8 py-2.5 text-left hover:bg-soft"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-soft">
                <MapPin className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate">{d.name}, {d.state}</span>
                <span className="block truncate text-sm text-muted">{d.blurb}</span>
              </span>
            </button>
          </li>
        ))}
        {term && !matches.length && (
          <li className="px-8 py-3 text-sm text-muted">No suggestions. Press Search to look for “{query.trim()}”.</li>
        )}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ compact (detail and other pages) */

function CompactSearch() {
  const { current } = useSearchDraft();
  const [open, setOpen] = useState<Panel>(null);
  const dates = current.checkIn && current.checkOut ? formatRange(current.checkIn, current.checkOut) : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="flex h-12 items-center rounded-full border border-line pl-2 pr-2 text-sm shadow-search transition hover:shadow-card">
        <button type="button" onClick={() => setOpen("where")} className="truncate px-4 font-semibold">
          {current.location || "Anywhere"}
        </button>
        <span className="h-6 w-px bg-line" />
        <button type="button" onClick={() => setOpen("checkIn")} className="truncate px-4 font-semibold">
          {dates ?? "Any week"}
        </button>
        <span className="h-6 w-px bg-line" />
        <button type="button" onClick={() => setOpen("who")} className={clsx("truncate pl-4 pr-2", whoLabel(current) ? "font-semibold" : "text-muted")}>
          {whoLabel(current) ?? "Add guests"}
        </button>
        <button type="button" onClick={() => setOpen("where")} aria-label="Search"
                className="grid size-8 place-items-center rounded-full bg-brand text-white">
          <Search className="size-3.5" strokeWidth={3} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/25" onClick={() => setOpen(null)} />
          <div className="relative flex justify-center border-b border-line bg-white px-6 pb-6 pt-6">
            <ExpandedSearch initialPanel={open} onDone={() => setOpen(null)} />
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ mobile (full-screen sheet) */

function MobileSearch() {
  const { draft, current, update, reset, submit } = useSearchDraft();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"where" | "when" | "who">("where");
  const dates = current.checkIn && current.checkOut ? formatRange(current.checkIn, current.checkOut) : "Any week";

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function close() {
    reset();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setStep("where"); setOpen(true); }}
        className="flex h-14 w-full items-center gap-3 rounded-full border border-line px-5 text-left shadow-search"
      >
        <Search className="size-5 shrink-0" strokeWidth={2.5} />
        {current.location || current.checkIn || whoLabel(current) ? (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{current.location || "Anywhere"}</span>
            <span className="block truncate text-xs text-muted">{dates} · {whoLabel(current) ?? "Add guests"}</span>
          </span>
        ) : (
          <span className="text-sm font-semibold">Start your search</span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-modal aria-label="Search" className="fixed inset-0 z-50 flex flex-col bg-soft">
          <div className="flex items-center px-6 pt-4">
            <button type="button" onClick={close} aria-label="Close search"
                    className="grid size-9 place-items-center rounded-full border border-line bg-white">
              <X className="size-4" strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
            <MobileCard title="Where?" summary={draft.location || "I'm flexible"} open={step === "where"} onOpen={() => setStep("where")}>
              <label className="flex h-14 items-center gap-3 rounded-xl border border-[#b0b0b0] px-4">
                <Search className="size-4 shrink-0" strokeWidth={2.5} />
                <input
                  value={draft.location}
                  onChange={(event) => update({ location: event.target.value })}
                  placeholder="Search destinations"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
              <div className="-mx-8 mt-2">
                <DestinationPicker query={draft.location} onPick={(location) => { update({ location }); setStep("when"); }} />
              </div>
            </MobileCard>

            <MobileCard
              title="When?"
              summary={draft.checkIn && draft.checkOut ? formatRange(draft.checkIn, draft.checkOut) : "Add dates"}
              open={step === "when"}
              onOpen={() => setStep("when")}
            >
              <RangeCalendar
                months={1}
                checkIn={draft.checkIn}
                checkOut={draft.checkOut}
                today={todayIST()}
                onChange={(stay) => {
                  update(stay);
                  if (stay.checkOut) setStep("who");
                }}
              />
            </MobileCard>

            <MobileCard title="Who?" summary={whoLabel(draft) ?? "Add guests"} open={step === "who"} onOpen={() => setStep("who")}>
              <GuestSteppers value={draft} onChange={(guests) => update(guests)} />
            </MobileCard>
          </div>

          <div className="flex items-center justify-between border-t border-line bg-white px-6 py-4">
            <button type="button" className="font-semibold underline"
                    onClick={() => update({ location: "", checkIn: undefined, checkOut: undefined, adults: 0, children: 0, infants: 0 })}>
              Clear all
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); submit(); }}
              className="bg-brand-gradient flex h-12 items-center gap-2 rounded-lg px-6 font-semibold text-white"
            >
              <Search className="size-4" strokeWidth={3} /> Search
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function MobileCard({ title, summary, open, onOpen, children }: {
  title: string; summary: string; open: boolean; onOpen: () => void; children: ReactNode;
}) {
  if (!open) {
    return (
      <button type="button" onClick={onOpen}
              className="flex w-full items-center justify-between rounded-2xl bg-white px-6 py-5 text-sm shadow-sm">
        <span className="text-muted">{title.replace("?", "")}</span>
        <span className="font-semibold">{summary}</span>
      </button>
    );
  }
  return (
    <section className="rounded-3xl bg-white px-6 py-6 shadow-card">
      <h2 className="mb-4 text-[22px] font-bold">{title}</h2>
      {children}
    </section>
  );
}
