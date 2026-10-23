export type BuyerIntent = "buyer_paid" | "inquiry_only";
export type SellerResponseValue = "available" | "unavailable" | "available_no_checkup";
export type CheckupStatus = "not_started" | "pending_checkup" | "completed";

export interface CheckupRequestRow {
  id: string;
  vehicle_link: string;
  vehicle_title: string | null;
  buyer_payment_intent: boolean;
  buyer_prepaid_consent: boolean;
  buyer_prepaid_consent_at: string | null;
  buyer_note: string | null;
  paid_by: "buyer" | "seller" | "none";
  seller_response: SellerResponseValue | null;
  checkup_status: CheckupStatus;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
}
