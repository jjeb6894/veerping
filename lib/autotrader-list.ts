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

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index++; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') {
      if (field.length) throw new Error("Malformed CSV: quote inside an unquoted field.");
      quoted = true;
    } else if (character === ",") {
      row.push(field); field = "";
    } else if (character === "\n" || character === "\r") {
      row.push(field); field = "";
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      if (character === "\r" && text[index + 1] === "\n") index++;
    } else field += character;
  }
  if (quoted) throw new Error("Malformed CSV: unclosed quoted field.");
  row.push(field);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

export function parseAutoTraderCsv(text: string): { urls: string[]; duplicates: number; unsupported: number } {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  const header = rows.shift()?.map(value => value.trim().toLowerCase());
  const urlIndex = header?.indexOf("url") ?? -1;
  if (urlIndex < 0) throw new Error('CSV must contain a "url" column.');

  const urls: string[] = [];
  let duplicates = 0;
  let unsupported = 0;
  const seen = new Set<string>();
  for (const row of rows) {
    const value = row[urlIndex]?.trim();
    if (!value) continue;
    if (!isUkAutotraderVehicleLink(value)) { unsupported++; continue; }
    if (seen.has(value)) { duplicates++; continue; }
    seen.add(value);
    urls.push(value);
  }
  return { urls, duplicates, unsupported };
}
