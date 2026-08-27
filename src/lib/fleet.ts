export type Driver = {
  id: string;
  accountId: string;
  assignedUserId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  cdlNumber: string | null;
  licenseExpiry: string | null;
  insuranceExpiry: string | null;
  ownerCompany: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  currentTruck?: Truck | null;
};

export type Truck = {
  id: string;
  accountId: string;
  assignedUserId: string | null;
  unitNumber: string;
  plate: string | null;
  vin: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  type: string | null;
  owner: string | null;
  insuranceExpiry: string | null;
  inspectionExpiry: string | null;
  status: "ACTIVE" | "INACTIVE" | "IN_REPAIR";
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  currentDriver?: Driver | null;
};

export type Assignment = {
  id: string;
  accountId: string;
  driverId: string;
  truckId: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  truck?: Truck | null;
  driver?: Driver | null;
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function expiryStatus(
  iso: string | null | undefined,
  warnDays = 30
): "ok" | "soon" | "expired" | "none" {
  if (!iso) return "none";
  const d = new Date(iso);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "expired";
  if (diff <= warnDays) return "soon";
  return "ok";
}
