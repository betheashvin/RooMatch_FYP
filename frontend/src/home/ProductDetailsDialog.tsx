import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/authState";
import { readStudioDraft } from "../editor/studioDraft";
import type { Product } from "../types/api";
import { CatalogImage } from "./CatalogImage";

type DetailIconName =
  | "dimensions"
  | "color"
  | "style"
  | "attribute"
  | "seller"
  | "contact"
  | "link";

function humanize(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function externalUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function ProductDetailsDialog({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pointerOnBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current!;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();

    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, []);

  const details: { label: string; value: ReactNode; icon: DetailIconName }[] = [
    {
      label: "Dimensions (W × D × H)",
      value: `${product.width_cm} × ${product.depth_cm} × ${product.height_cm} cm`,
      icon: "dimensions",
    },
  ];

  if (product.color?.trim()) {
    details.push({
      label: "Color",
      value: humanize(product.color),
      icon: "color",
    });
  }
  if (product.style_tags.length) {
    details.push({
      label: "Style",
      value: product.style_tags.map(humanize).join(", "),
      icon: "style",
    });
  }
  for (const [key, value] of Object.entries(product.attributes ?? {})) {
    if (value.trim())
      details.push({ label: humanize(key), value, icon: "attribute" });
  }
  details.push({ label: "Seller", value: product.seller.name, icon: "seller" });

  const location = Object.values(product.seller.seller_location ?? {})
    .filter(
      (value): value is string => typeof value === "string" && !!value.trim(),
    )
    .join(", ");
  if (location)
    details.push({ label: "Location", value: location, icon: "seller" });

  const phone = product.seller.contact_phone?.trim();
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    const callable =
      /^\+?[\d\s().-]+$/.test(phone) &&
      digits.length >= 7 &&
      digits.length <= 15;
    details.push({
      label: "Contact",
      value: callable ? (
        <a
          className="underline underline-offset-4"
          href={`tel:${phone.replace(/[^\d+]/g, "")}`}
        >
          {phone}
        </a>
      ) : (
        phone
      ),
      icon: "contact",
    });
  }
  const email = product.seller.contact_email?.trim();
  if (email) {
    details.push({
      label: "Email",
      value: (
        <a className="underline underline-offset-4" href={`mailto:${email}`}>
          {email}
        </a>
      ),
      icon: "contact",
    });
  }
  const website = externalUrl(product.seller.website_url);
  const listing = externalUrl(product.listing_url);
  if (website) {
    details.push({
      label: "Website",
      value: (
        <a
          className="underline underline-offset-4"
          href={website}
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit seller website ↗
        </a>
      ),
      icon: "link",
    });
  }
  if (listing) {
    details.push({
      label: "Listing",
      value: (
        <a
          className="underline underline-offset-4"
          href={listing}
          target="_blank"
          rel="noopener noreferrer"
        >
          View seller listing ↗
        </a>
      ),
      icon: "link",
    });
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        pointerOnBackdrop.current =
          event.target === event.currentTarget &&
          (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pointerOnBackdrop.current)
          onClose();
      }}
      className="fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-4xl overflow-y-auto overscroll-contain rounded-2xl border border-[#e4d6c4] bg-[#f8f3e9] p-5 text-[#263b30] shadow-2xl backdrop:bg-[#18291f]/60 sm:p-8"
    >
      <button
        type="button"
        aria-label="Close product details"
        onClick={onClose}
        className="absolute right-3 top-3 z-10 flex size-9 cursor-pointer items-center justify-center rounded-full bg-[#f8f3e9]/90 text-[#263b30] hover:bg-[#e9ddcc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#294536]"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-8">
        <figure className="min-w-0">
          <div className="flex aspect-[10/11] items-center justify-center overflow-hidden rounded-xl bg-[#eee4d6]">
            <CatalogImage
              product={product}
              loading="eager"
              className="h-full w-full object-contain p-5"
            />
          </div>
        </figure>

        <div className="min-w-0 md:pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8b5e3c]">
            {humanize(product.category)}
          </p>
          <h2
            id={titleId}
            className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
          >
            {product.name}
          </h2>
          <p className="mt-3 font-serif text-2xl font-medium text-[#8b5e3c]">
            Rs {product.price_pkr.toLocaleString("en-PK")}
          </p>
          {product.description?.trim() && (
            <p className="mt-4 whitespace-pre-line font-serif text-base leading-relaxed text-[#766b5d]">
              {product.description}
            </p>
          )}

          <dl className="mt-5 space-y-4 border-y border-[#ded4c5] py-5 text-sm">
            {details.map((detail, index) => (
              <div
                key={`${detail.label}-${index}`}
                className="flex items-start gap-3"
              >
                <DetailIcon name={detail.icon} />
                <div className="min-w-0 flex-1 break-words leading-relaxed">
                  <dt className="inline text-[#766b5d]">{detail.label}: </dt>
                  <dd className="inline font-medium text-[#334839]">
                    {detail.value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </dialog>
  );
}

function DetailIcon({ name }: { name: DetailIconName }) {
  const paths: Record<DetailIconName, ReactNode> = {
    dimensions: (
      <>
        <rect x="3" y="7" width="18" height="10" rx="2" />
        <path d="M7 7v4m4-4v6m4-6v4m4-4v6" />
      </>
    ),
    color: (
      <>
        <path d="M12 3C8 8 5 11 5 15a7 7 0 0 0 14 0c0-4-3-7-7-12Z" />
        <path d="M9 15a3 3 0 0 0 3 3" />
      </>
    ),
    style: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15 9-2 4-4 2 2-4 4-2ZM12 3v2m0 14v2M3 12h2m14 0h2" />
      </>
    ),
    attribute: (
      <>
        <path d="m3 12 9-9h6l3 3v6l-9 9L3 12Z" />
        <circle cx="16" cy="8" r="1" />
      </>
    ),
    seller: (
      <>
        <path d="M3 10 5 4h14l2 6M4 10v10h16V10M8 20v-7h5v7" />
        <path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      </>
    ),
    contact: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 6 9 7 9-7" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2" />
      </>
    ),
  };
  return (
    <svg
      className="mt-1 size-5 shrink-0 text-[#294536]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
