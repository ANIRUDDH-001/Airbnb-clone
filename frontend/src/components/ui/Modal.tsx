"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Accessible name when there's no visible title. */
  label?: string;
}

const WIDTHS = { sm: "sm:max-w-[400px]", md: "sm:max-w-[568px]", lg: "sm:max-w-[780px]", xl: "sm:max-w-[1032px]" };

/**
 * Airbnb-style modal on top of the native <dialog>: focus trapping, Esc to close and the backdrop come from the
 * browser. On phones it becomes a bottom sheet.
 */
export function Modal({ open, onClose, title, children, footer, size = "md", label }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={typeof title === "string" ? title : label}
      onCancel={(event) => {
        event.preventDefault(); // keep React state the source of truth
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose(); // click on the backdrop
      }}
      className={clsx(
        "m-0 mt-auto w-full max-w-none rounded-t-2xl bg-white p-0 text-ink shadow-float backdrop:bg-black/50",
        "sm:m-auto sm:rounded-2xl",
        "open:animate-[modal-in_200ms_ease-out]",
        WIDTHS[size],
      )}
    >
      {open && (
        <div className="flex max-h-[90dvh] flex-col">
          <header className="relative flex min-h-16 items-center justify-center border-b border-line px-14 py-4">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute left-4 grid size-8 place-items-center rounded-full hover:bg-soft"
            >
              <X className="size-4" strokeWidth={2.5} />
            </button>
            {title && <h2 className="text-base font-bold">{title}</h2>}
          </header>
          <div className="overflow-y-auto px-6 py-6">{children}</div>
          {footer && <footer className="border-t border-line px-6 py-4">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
