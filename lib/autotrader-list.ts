export function isUkAutotraderVehicleLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      ["autotrader.co.uk", "www.autotrader.co.uk"].includes(url.hostname.toLowerCase()) &&
      /(?:\/car-details\/|\/details\/)/.test(url.pathname);
  } catch { return false; }
}

export function isUkAutotraderAssetUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const allowedHost = host === "autotrader.co.uk" || host.endsWith(".autotrader.co.uk") ||
      host === "atcdn.co.uk" || host.endsWith(".atcdn.co.uk");
    return url.protocol === "https:" && !url.username && !url.password && !url.port && allowedHost;
  } catch { return false; }
}

export function parseUkAutotraderList(text: string): string[] {
  return [...new Set(text.split(/[\s,]+/).map(value => value.trim()).filter(Boolean))]
    .filter(isUkAutotraderVehicleLink);
}
