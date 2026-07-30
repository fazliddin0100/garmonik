export const KASSA_PAYMENT_COMPLETED = "kassa:payment-completed";

export function notifyPaymentCompleted() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(KASSA_PAYMENT_COMPLETED));
  }
}
