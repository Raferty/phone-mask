import {
  AsYouType,
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
  parseIncompletePhoneNumber,
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/mobile/examples';

export const DEFAULT_PHONE_MASK = '+_ (___) ___-__-__';
export const MAX_E164_DIGITS = 15;

export type PhoneCountryMeta = {
  country: CountryCode | null;
  callingCode: string | null;
  isConfirmed: boolean;
  possibleCountries: CountryCode[];
};

export type PhoneValidationMeta = {
  isPossible: boolean;
  isValid: boolean;
  isComplete: boolean;
  country: CountryCode | null;
  callingCode: string | null;
};

export type PhoneCountryCode = CountryCode;
export type PhoneMaskByCountry = Partial<Record<CountryCode, string>>;
export type PhoneAllowedCountries = readonly CountryCode[];
export type PhoneModelFormat = 'e164' | 'digits' | 'international' | 'national';
export type PhoneFlagUrlResolver = (country: CountryCode) => string;

export type PhoneCountryOption = {
  country: CountryCode;
  callingCode: string;
};

type CountryCallingCodeEntry = {
  country: CountryCode;
  callingCode: string;
};

const preferredCountryByCallingCode: Record<string, CountryCode> = {
  1: 'US',
  7: 'RU',
  44: 'GB',
};

const countriesByCallingCode: CountryCallingCodeEntry[] = getCountries()
  .map((country) => ({
    country,
    callingCode: getCountryCallingCode(country),
  }))
  .sort((left, right) => {
    if (right.callingCode.length !== left.callingCode.length) {
      return right.callingCode.length - left.callingCode.length;
    }

    const preferredCountry = preferredCountryByCallingCode[left.callingCode];

    if (left.country === preferredCountry) {
      return -1;
    }

    if (right.country === preferredCountry) {
      return 1;
    }

    return left.country.localeCompare(right.country);
  });

function detectPreciseCountry(normalizedDigits: string): CountryCode | null {
  if (!normalizedDigits) {
    return null;
  }

  const formatter = new AsYouType();
  formatter.input(`+${normalizedDigits}`);

  return formatter.getCountry() ?? null;
}

function inferCountryFromPartialDigits(
  normalizedDigits: string,
  callingCode: string,
  possibleCountries: CountryCode[],
): CountryCode | null {
  const nationalDigits = normalizedDigits.slice(callingCode.length);

  if (nationalDigits.length < 3) {
    return null;
  }

  for (const country of possibleCountries) {
    const exampleLength = getExamplePhoneDigitsLength(country);

    if (!exampleLength || normalizedDigits.length >= exampleLength) {
      continue;
    }

    const paddedDigits = normalizedDigits.padEnd(exampleLength, '5');
    const inferredCountry = detectPreciseCountry(paddedDigits);

    if (inferredCountry && possibleCountries.includes(inferredCountry)) {
      return inferredCountry;
    }
  }

  return null;
}

export function normalizePhoneDigits(value = ''): string {
  return parseIncompletePhoneNumber(String(value)).replace(/\D/g, '');
}

export function parsePhoneModelValue(
  value = '',
  modelFormat: PhoneModelFormat = 'e164',
  country: CountryCode | null = null,
): string {
  const normalizedDigits = normalizePhoneDigits(value);

  if (!normalizedDigits) {
    return '';
  }

  if (modelFormat !== 'national' || !country) {
    return normalizedDigits;
  }

  const callingDigits = getCountryCallingDigits(country);

  if (normalizedDigits.startsWith(callingDigits)) {
    return normalizedDigits;
  }

  return `${callingDigits}${normalizedDigits}`;
}

function hasAllowedCountries(allowedCountries: PhoneAllowedCountries = []): boolean {
  return allowedCountries.length > 0;
}

function getAllowedPossibleCountries(
  countries: CountryCode[],
  allowedCountries: PhoneAllowedCountries = [],
): CountryCode[] {
  if (!hasAllowedCountries(allowedCountries)) {
    return countries;
  }

  return countries.filter((country) => allowedCountries.includes(country));
}

export function isCountryAllowed(
  country: CountryCode | null | undefined,
  allowedCountries: PhoneAllowedCountries = [],
): boolean {
  if (!country) {
    return false;
  }

  if (!hasAllowedCountries(allowedCountries)) {
    return true;
  }

  return allowedCountries.includes(country);
}

export function getCountryCallingDigits(country: CountryCode): string {
  return getCountryCallingCode(country);
}

export function getPhoneCountryOptions(
  allowedCountries: PhoneAllowedCountries = [],
): PhoneCountryOption[] {
  return getCountries()
    .filter((country) => isCountryAllowed(country, allowedCountries))
    .map((country) => ({
      country,
      callingCode: getCountryCallingCode(country),
    }))
    .sort((left, right) => {
      if (left.country === right.country) {
        return 0;
      }

      return left.country.localeCompare(right.country);
    });
}

export function isPhoneDigitsAllowed(
  digits = '',
  allowedCountries: PhoneAllowedCountries = [],
): boolean {
  if (!hasAllowedCountries(allowedCountries)) {
    return true;
  }

  const normalizedDigits = normalizePhoneDigits(digits);

  if (!normalizedDigits) {
    return true;
  }

  const phoneMeta = detectCountryByPhoneDigits(normalizedDigits);

  if (phoneMeta.country) {
    return allowedCountries.includes(phoneMeta.country);
  }

  return getAllowedPossibleCountries(phoneMeta.possibleCountries, allowedCountries).length > 0;
}

export function limitPhoneDigits(
  digits = '',
  allowedCountries: PhoneAllowedCountries = [],
): string {
  const normalizedDigits = normalizePhoneDigits(digits);
  const maxLength = getMaxPhoneDigits(normalizedDigits, allowedCountries);

  return normalizedDigits.slice(0, maxLength);
}

export function detectCountryByPhoneDigits(digits = ''): PhoneCountryMeta {
  const normalizedDigits = normalizePhoneDigits(digits);

  if (!normalizedDigits) {
    return {
      country: null,
      callingCode: null,
      isConfirmed: false,
      possibleCountries: [],
    };
  }

  const confirmedMatch = countriesByCallingCode.find(({ callingCode }) =>
    normalizedDigits.startsWith(callingCode),
  );

  if (confirmedMatch) {
    const possibleCountries = countriesByCallingCode
      .filter(({ callingCode }) => callingCode === confirmedMatch.callingCode)
      .map(({ country }) => country);
    const preciseCountry =
      detectPreciseCountry(normalizedDigits) ??
      inferCountryFromPartialDigits(
        normalizedDigits,
        confirmedMatch.callingCode,
        possibleCountries,
      );
    const country =
      preciseCountry && possibleCountries.includes(preciseCountry)
        ? preciseCountry
        : possibleCountries.length === 1
          ? possibleCountries[0]
          : null;

    return {
      ...confirmedMatch,
      country,
      isConfirmed: true,
      possibleCountries,
    };
  }

  const possibleCountries = countriesByCallingCode
    .filter(({ callingCode }) => callingCode.startsWith(normalizedDigits))
    .map(({ country }) => country);

  return {
    country: null,
    callingCode: null,
    isConfirmed: false,
    possibleCountries,
  };
}

export function formatPhoneDigits(digits = ''): string {
  const normalizedDigits = normalizePhoneDigits(digits);

  if (!normalizedDigits) {
    return '';
  }

  return new AsYouType().input(`+${normalizedDigits}`);
}

export function formatPhoneModelValue(
  digits = '',
  modelFormat: PhoneModelFormat = 'e164',
  country: CountryCode | null = null,
): string {
  const normalizedDigits = normalizePhoneDigits(digits);

  if (!normalizedDigits) {
    return '';
  }

  if (modelFormat === 'digits') {
    return normalizedDigits;
  }

  if (modelFormat === 'international') {
    return formatPhoneDigits(normalizedDigits);
  }

  if (modelFormat === 'national') {
    const phoneNumber = parsePhoneNumberFromString(`+${normalizedDigits}`);

    if (phoneNumber) {
      return phoneNumber.formatNational();
    }

    const callingDigits = country ? getCountryCallingDigits(country) : null;

    if (callingDigits && normalizedDigits.startsWith(callingDigits)) {
      return normalizedDigits.slice(callingDigits.length);
    }

    return normalizedDigits;
  }

  return `+${normalizedDigits}`;
}

export function formatPhoneDigitsWithMask(
  digits = '',
  countryMasks: PhoneMaskByCountry = {},
  allowedCountries: PhoneAllowedCountries = [],
): string {
  const normalizedDigits = limitPhoneDigits(digits, allowedCountries);

  if (!normalizedDigits) {
    return '';
  }

  const phoneMeta = detectCountryByPhoneDigits(normalizedDigits);

  if (!phoneMeta.isConfirmed) {
    return formatPhoneDigits(normalizedDigits);
  }

  const mask = getPhoneMaskPlaceholder(normalizedDigits, countryMasks);
  const nationalDigits =
    phoneMeta.callingCode ? normalizedDigits.slice(phoneMeta.callingCode.length) : normalizedDigits;
  let digitIndex = 0;

  return mask.replace(/_/g, (placeholder) => {
    const digit = nationalDigits[digitIndex];
    digitIndex += 1;

    return digit ?? placeholder;
  });
}

function getExamplePhoneDigitsLength(country: CountryCode): number | null {
  const exampleNumber = getExampleNumber(country, examples);

  if (!exampleNumber) {
    return null;
  }

  return `${exampleNumber.countryCallingCode}${exampleNumber.nationalNumber}`.length;
}

function createMaskFromExampleNumber(
  country: CountryCode | null,
  countryMasks: PhoneMaskByCountry = {},
): string {
  if (!country) {
    return DEFAULT_PHONE_MASK;
  }

  const knownMask = countryMasks[country];

  if (knownMask) {
    return knownMask;
  }

  const exampleNumber = getExampleNumber(country, examples);

  if (!exampleNumber) {
    return DEFAULT_PHONE_MASK;
  }

  const countryCallingCode = exampleNumber.countryCallingCode;
  const formattedExample = exampleNumber.formatInternational();
  const countryCodePrefix = `+${countryCallingCode}`;

  if (!formattedExample.startsWith(countryCodePrefix)) {
    return formattedExample.replace(/\d/g, '_');
  }

  return `${countryCodePrefix}${formattedExample
    .slice(countryCodePrefix.length)
    .replace(/\d/g, '_')}`;
}

export function getMaxPhoneDigits(
  digits = '',
  allowedCountries: PhoneAllowedCountries = [],
): number {
  const normalizedDigits = normalizePhoneDigits(digits);
  const phoneMeta = detectCountryByPhoneDigits(normalizedDigits);
  const possibleCountries = getAllowedPossibleCountries(
    phoneMeta.possibleCountries,
    allowedCountries,
  );

  if (phoneMeta.country) {
    return getExamplePhoneDigitsLength(phoneMeta.country) ?? MAX_E164_DIGITS;
  }

  if (!phoneMeta.isConfirmed || possibleCountries.length === 0) {
    return MAX_E164_DIGITS;
  }

  const possibleLengths = possibleCountries
    .map((country) => getExamplePhoneDigitsLength(country))
    .filter((length): length is number => length !== null);

  if (possibleLengths.length === 0) {
    return MAX_E164_DIGITS;
  }

  return Math.max(...possibleLengths);
}

export function getMaxFormattedPhoneLength(digits = ''): number {
  const maxDigits = getMaxPhoneDigits(digits);
  const baseDigits = normalizePhoneDigits(digits).slice(0, maxDigits);
  const paddedDigits = baseDigits.padEnd(maxDigits, '0');

  return formatPhoneDigits(paddedDigits).length;
}

export function getPhoneMaskPlaceholder(digits = '', countryMasks: PhoneMaskByCountry = {}): string {
  const normalizedDigits = normalizePhoneDigits(digits);

  if (!normalizedDigits) {
    return DEFAULT_PHONE_MASK;
  }

  const phoneMeta = detectCountryByPhoneDigits(normalizedDigits);
  const maskCountry =
    phoneMeta.country ?? (phoneMeta.isConfirmed ? phoneMeta.possibleCountries[0] : null) ?? null;

  return createMaskFromExampleNumber(maskCountry, countryMasks);
}

export function getPhoneValidationMeta(
  digits = '',
  allowedCountries: PhoneAllowedCountries = [],
): PhoneValidationMeta {
  const normalizedDigits = limitPhoneDigits(digits, allowedCountries);
  const phoneMeta = detectCountryByPhoneDigits(normalizedDigits);
  const phoneNumber = normalizedDigits
    ? parsePhoneNumberFromString(`+${normalizedDigits}`)
    : undefined;
  const maxDigits = getMaxPhoneDigits(normalizedDigits, allowedCountries);
  const isComplete = Boolean(normalizedDigits && normalizedDigits.length >= maxDigits);
  const isAllowed = isPhoneDigitsAllowed(normalizedDigits, allowedCountries);
  const isPossible = Boolean(isAllowed && phoneNumber?.isPossible());
  const isValid = Boolean(isAllowed && phoneNumber?.isValid());

  return {
    isPossible,
    isValid,
    isComplete,
    country: phoneMeta.country,
    callingCode: phoneMeta.callingCode,
  };
}
