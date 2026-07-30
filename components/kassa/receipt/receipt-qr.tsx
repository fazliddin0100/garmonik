"use client";

import { useEffect, useState } from "react";
import { createBrandedQrDataUrl } from "@/lib/kassa/receipt-qr";

export function ReceiptQrCode({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    createBrandedQrDataUrl(value, { label }).then((src) => {
      if (active) setImageSrc(src);
    });
    return () => {
      active = false;
    };
  }, [value, label]);

  if (!imageSrc) {
    return <div className="mx-auto h-56 w-56 animate-pulse rounded-md border bg-slate-100" />;
  }

  return (
    <div className="flex justify-center pt-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={`QR kod ${label}`}
        className="h-auto w-[56mm] max-w-full object-contain"
      />
    </div>
  );
}
