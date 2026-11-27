import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

// Shared validation; the API always repeats it. Free-form notes are never published.
export function buyerName(value: unknown): string {
  if (typeof value !== "string") throw new Error("Enter your name.");
  const name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!/^[\p{L}\p{M}][\p{L}\p{M} '\u2019-]{0,59}$/u.test(name) ||
      /(?:whats?app|wa\s*me|https?|www|dot\s*com|(?:zero|one|two|three|four|five|six|seven|eight|nine)(?:[ -]+(?:zero|one|two|three|four|five|six|seven|eight|nine)){2})/i.test(name)) {
    throw new Error("Use your name only, without a phone number, contact link or message.");
  }
  return name;
}
const VIEWING_MESSAGES = [
  "Hi, I’m interested in viewing this vehicle. Is it still available, and when could I come to see it? Please reply through my request page.",
  "Hello, I’d like to arrange a viewing if the vehicle is still available. What time would suit you? Please reply through my request page.",
  "Hi there, could I come and see the vehicle if it’s still for sale? Let me know what day works for you using my request page.",
];

export function buyerMessage(seed?: string): string {
  if (!seed) return VIEWING_MESSAGES[0];
  const index = [...seed].reduce((sum, character) => sum + character.codePointAt(0)!, 0) % VIEWING_MESSAGES.length;
  return VIEWING_MESSAGES[index];
}
export function privatePhone(country: unknown, value: unknown) {
  if (typeof country !== "string" || !getCountries().includes(country as CountryCode) ||
      typeof value !== "string" || !/^[+\d\s().-]{5,30}$/.test(value)) {
    throw new Error("Choose a country and enter a valid WhatsApp number.");
  }
  const phone = parsePhoneNumberFromString(value, country as CountryCode);
  if (!phone?.isValid() || phone.ext || phone.countryCallingCode !== getCountryCallingCode(country as CountryCode)) {
    throw new Error("Enter a valid WhatsApp number for the selected country.");
  }
  return { full: phone.number, masked: `+${phone.countryCallingCode} ${phone.nationalNumber.slice(0, 3)} ••• ••••` };
}
export function redactContact(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.normalize("NFKC").replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, "")
    .replace(/(?:https?:\/\/|www\.)\S+|(?:wa\s*\.\s*me|(?:api\.|web\.)?whatsapp\s*\.\s*com)\S*|(?:tel|whatsapp):\S*/gi, "[contact hidden]")
    .replace(/\+?\p{N}(?:[\s()./\-]*\p{N}){6,}/gu, "[contact hidden]").slice(0, 500);
}
