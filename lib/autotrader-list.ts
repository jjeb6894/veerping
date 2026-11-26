export function isUkAutotraderVehicleLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      ["autotrader.co.uk", "www.autotrader.co.uk"].includes(url.hostname.toLowerCase()) &&
      /(?:\/car-details\/|\/details\/)/.test(url.pathname);
  } catch { return false; }
}

export function parseUkAutotraderList(text: string): string[] {
  return [...new Set(text.split(/[\s,]+/).map(value => value.trim()).filter(Boolean))]
    .filter(isUkAutotraderVehicleLink);
}
