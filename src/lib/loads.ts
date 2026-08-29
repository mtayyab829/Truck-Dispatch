export type LoadStatus =
  | "CREATED"
  | "ASSIGNED"
  | "AT_PICKUP"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "AT_DELIVERY"
  | "DELIVERED"
  | "POD_RECEIVED"
  | "PAYMENT_FOLLOW_UP"
  | "PAYMENT_COMPLETED"
  | "CANCELLED";

export type Load = {
  id: string;
  loadNumber: string;
  source: string | null;
  pickupCity: string;
  pickupState: string | null;
  pickupDateTime: string | null;
  deliveryCity: string;
  deliveryState: string | null;
  deliveryDateTime: string | null;
  equipment: string | null;
  commodity: string | null;
  weight: number | null;
  miles: number | null;
  rate: number;
  commissionType: "PERCENTAGE" | "FIXED";
  commissionValue: number;
  commissionAmount: number;
  commissionSettled: boolean;
  rateSettled?: boolean;
  commissionEarned?: boolean;
  loadStatus: LoadStatus;
  notes: string | null;
  driver?: { id: string; name: string } | null;
  truck?: { id: string; unitNumber: string; plate?: string | null } | null;
};

export function calcCommission(
  rate: number,
  type: "PERCENTAGE" | "FIXED",
  value: number
): number {
  if (!Number.isFinite(rate) || !Number.isFinite(value)) return 0;
  if (type === "FIXED") return Math.round(value * 100) / 100;
  return Math.round(((rate * value) / 100) * 100) / 100;
}

export function money(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(n);
}

const STATUS_LABELS: Record<string, string> = {
  CREATED: "Created",
  ASSIGNED: "Assigned",
  AT_PICKUP: "At pickup",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  AT_DELIVERY: "At delivery",
  DELIVERED: "Delivered",
  POD_RECEIVED: "POD received",
  PAYMENT_FOLLOW_UP: "Payment follow-up",
  PAYMENT_COMPLETED: "Payment completed",
  CANCELLED: "Cancelled",
};

export function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s.replace(/_/g, " ");
}

export const STATUS_FLOW: LoadStatus[] = [
  "CREATED",
  "ASSIGNED",
  "AT_PICKUP",
  "PICKED_UP",
  "IN_TRANSIT",
  "AT_DELIVERY",
  "DELIVERED",
  "POD_RECEIVED",
  "PAYMENT_COMPLETED",
];

export type PaymentStatusTone =
  | "paid"
  | "due"
  | "upcoming"
  | "pending"
  | "cancelled";

export type PaymentStatus = {
  label: string;
  tone: PaymentStatusTone;
};

const FREIGHT_DUE_STATUSES = new Set<LoadStatus>([
  "POD_RECEIVED",
  "PAYMENT_FOLLOW_UP",
]);

/** Freight (broker/customer) payment status for a load */
export function freightPaymentStatus(
  load: Pick<Load, "loadStatus" | "rateSettled">
): PaymentStatus {
  if (load.loadStatus === "CANCELLED") {
    return { label: "Cancelled", tone: "cancelled" };
  }
  if (load.rateSettled || load.loadStatus === "PAYMENT_COMPLETED") {
    return { label: "Paid", tone: "paid" };
  }
  if (FREIGHT_DUE_STATUSES.has(load.loadStatus)) {
    return { label: "In progress", tone: "due" };
  }
  return { label: "Upcoming", tone: "upcoming" };
}

/** Commission payment status for a load */
export function commissionPaymentStatus(
  load: Pick<Load, "loadStatus" | "commissionSettled" | "commissionEarned">
): PaymentStatus {
  if (load.loadStatus === "CANCELLED") {
    return { label: "Cancelled", tone: "cancelled" };
  }
  if (load.commissionSettled) {
    return { label: "Paid", tone: "paid" };
  }
  if (load.commissionEarned) {
    return { label: "Due", tone: "due" };
  }
  return { label: "Upcoming", tone: "upcoming" };
}

/** Detail view with received/outstanding amounts */
export function freightPaymentStatusDetailed(input: {
  loadStatus: LoadStatus;
  settled: boolean;
  outstanding: number;
  received: number;
}): PaymentStatus {
  if (input.loadStatus === "CANCELLED") {
    return { label: "Cancelled", tone: "cancelled" };
  }
  if (input.settled || input.outstanding <= 0.001) {
    return { label: "Paid", tone: "paid" };
  }
  if (input.received > 0.001) {
    return { label: "In progress", tone: "due" };
  }
  if (FREIGHT_DUE_STATUSES.has(input.loadStatus)) {
    return { label: "Due", tone: "due" };
  }
  return { label: "Upcoming", tone: "upcoming" };
}

export function commissionPaymentStatusDetailed(input: {
  loadStatus: LoadStatus;
  settled: boolean;
  outstanding: number;
  earned: boolean;
  received: number;
}): PaymentStatus {
  if (input.loadStatus === "CANCELLED") {
    return { label: "Cancelled", tone: "cancelled" };
  }
  if (input.settled || input.outstanding <= 0.001) {
    return { label: "Paid", tone: "paid" };
  }
  if (!input.earned) {
    return { label: "Upcoming", tone: "upcoming" };
  }
  if (input.received > 0.001) {
    return { label: "In progress", tone: "due" };
  }
  return { label: "Due", tone: "due" };
}

/** Loads with freight or commission not fully settled (excludes cancelled) */
export function loadHasOpenPayments(
  load: Pick<
    Load,
    "loadStatus" | "rateSettled" | "commissionSettled"
  >
): boolean {
  if (load.loadStatus === "CANCELLED") return false;
  return !load.rateSettled || !load.commissionSettled;
}

