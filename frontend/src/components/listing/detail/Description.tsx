"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { Modal } from "@/components/ui/Modal";

/** The first paragraph with "Show more", which opens the full text (paragraphs and headings) in a modal. */
export function Description({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const paragraphs = text.split(/\n{2,}/);

  return (
    <section className="border-b border-line py-8">
      <p className="line-clamp-6 whitespace-pre-line leading-6">{paragraphs[0]}</p>
      {paragraphs.length > 1 || text.length > 400 ? (
        <button type="button" onClick={() => setOpen(true)}
                className="mt-4 flex items-center gap-1 rounded-lg bg-soft px-4 py-2.5 font-semibold hover:bg-hover">
          Show more <ChevronRight className="size-4" />
        </button>
      ) : null}

      <Modal open={open} onClose={() => setOpen(false)} title="About this space" size="lg">
        <div className="space-y-6 leading-6">
          {paragraphs.map((paragraph, i) => {
            const [first, ...lines] = paragraph.split("\n");
            // Blocks like "The space\nYou'll have…" render with a heading, as on the live site.
            return lines.length && first.length < 40 ? (
              <div key={i}>
                <h3 className="mb-2 text-lg font-semibold">{first}</h3>
                <p className="whitespace-pre-line">{lines.join("\n")}</p>
              </div>
            ) : (
              <p key={i} className="whitespace-pre-line">{paragraph}</p>
            );
          })}
        </div>
      </Modal>
    </section>
  );
}
