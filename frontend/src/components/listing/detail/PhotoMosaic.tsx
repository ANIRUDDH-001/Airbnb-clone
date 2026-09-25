"use client";

import clsx from "clsx";
import { Grip } from "lucide-react";
import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { sizedPhoto } from "@/lib/format";

/* eslint-disable @next/next/no-img-element -- remote photos are served as-is (next.config images.unoptimized) */

/** One large photo and four small ones (desktop), a single photo on phones; "Show all photos" opens the tour. */
export function PhotoMosaic({ photos, title }: { photos: string[]; title: string }) {
  const [open, setOpen] = useState(false);
  const [first, ...rest] = photos;
  const side = rest.slice(0, 4);

  return (
    <>
      <div className="relative -mx-6 md:mx-0">
        <div className={clsx("grid gap-2 overflow-hidden md:rounded-xl", side.length ? "md:grid-cols-4 md:grid-rows-2" : "")}>
          <button type="button" onClick={() => setOpen(true)}
                  className="group relative aspect-[4/3] md:col-span-2 md:row-span-2 md:aspect-auto md:h-[min(56vh,560px)]">
            <img src={sizedPhoto(first, 1200)} alt={title} fetchPriority="high"
                 className="size-full object-cover transition group-hover:brightness-90" />
          </button>
          {side.map((photo, i) => (
            <button key={`${i}-${photo}`} type="button" onClick={() => setOpen(true)} className="group relative hidden md:block">
              <img src={sizedPhoto(photo, 720)} alt={`${title}, photo ${i + 2}`}
                   className="absolute inset-0 size-full object-cover transition group-hover:brightness-90" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute bottom-6 right-6 flex items-center gap-2 rounded-lg border border-ink bg-white px-4 py-1.5 text-sm font-semibold shadow-sm hover:bg-soft"
        >
          <Grip className="size-4" /> Show all photos
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Photo tour" size="xl">
        <div className="grid gap-2 sm:grid-cols-2">
          {photos.map((photo, i) => (
            <img key={`${i}-${photo}`} src={sizedPhoto(photo, 1200)} alt={`${title}, photo ${i + 1}`} loading="lazy"
                 className={clsx("w-full rounded-lg object-cover", i % 3 === 0 ? "aspect-[3/2] sm:col-span-2" : "aspect-square")} />
          ))}
        </div>
      </Modal>
    </>
  );
}
