import { routing, type Locale } from "@/i18n/routing";

/** Langue envoyée par un formulaire, ramenée à une valeur autorisée. */
export function safeLocale(value: FormDataEntryValue | null): Locale {
  return routing.locales.includes(value as Locale) ? (value as Locale) : routing.defaultLocale;
}
