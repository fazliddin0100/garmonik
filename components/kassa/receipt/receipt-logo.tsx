import { CLINIC_LOGO_PATH, getClinicName } from "@/lib/kassa/receipt-branding";

export function ReceiptLogo({ className = "h-16" }: { className?: string }) {
  return (
    <div className="flex justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CLINIC_LOGO_PATH}
        alt={getClinicName()}
        className={`${className} w-auto max-w-[70%] object-contain`}
      />
    </div>
  );
}
