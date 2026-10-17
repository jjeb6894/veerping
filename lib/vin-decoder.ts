export interface VinDecode {
  status: "decoded" | "invalid" | "unavailable";
  make?: string;
  model?: string;
  year?: string;
}

/** Decode a VIN using the public US NHTSA database. This does not check ownership or history. */
export async function decodeVin(vin: string): Promise<VinDecode> {
  const value = vin.trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(value)) return { status: "invalid" };
  try {
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${value}?format=json`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { status: "unavailable" };
    const payload = await response.json() as { Results?: Array<Record<string, unknown>> };
    const data = payload.Results?.[0];
    const field = (key: string): string | undefined => {
      const text = data?.[key];
      return typeof text === "string" && text.trim() ? text.trim().slice(0, 100) : undefined;
    };
    const make = field("Make"), model = field("Model"), year = field("ModelYear");
    if (!make && !model && !year) return { status: "unavailable" };
    return { status: "decoded", make, model, year };
  } catch {
    return { status: "unavailable" };
  }
}
