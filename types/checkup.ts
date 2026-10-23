export type AccessRole = "buyer" | "seller";
export type SellerResponseValue = "available" | "unavailable" | "available_no_checkup";
export type CheckupStatus = "not_started" | "pending_checkup" | "completed";

export interface CheckupRequestRow {
  id: string;
  vehicle_link: string;
  vehicle_title: string | null;
  buyer_payment_intent: boolean;
  buyer_note: string | null;
  paid_by: "buyer" | "seller" | "none";
  seller_response: SellerResponseValue | null;
  checkup_status: CheckupStatus;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckupView {
  id: string;
  role: AccessRole;
  vehicle: { link: string; title: string | null; price: string | null; summary: string | null; images: string[] };
  buyerWillingToPay: boolean;
  message: string;
  contact: { masked: string | null; full?: string; whatsappUrl?: string };
  paymentStatus: "unpaid" | "paid";
  paidBy: AccessRole | "none";
  checkupStatus: CheckupStatus;
  sellerResponse: SellerResponseValue | null;
}
