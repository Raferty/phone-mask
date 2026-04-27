export { default as PhoneMaskInput } from './components/PhoneMaskInput.vue';
export {
  DEFAULT_PHONE_MASK,
  detectCountryByPhoneDigits,
  formatPhoneDigits,
  formatPhoneDigitsWithMask,
  formatPhoneModelValue,
  getCountryCallingDigits,
  getMaxFormattedPhoneLength,
  getMaxPhoneDigits,
  getPhoneCountryOptions,
  getPhoneMaskPlaceholder,
  getPhoneValidationMeta,
  isCountryAllowed,
  isPhoneDigitsAllowed,
  limitPhoneDigits,
  normalizePhoneDigits,
  parsePhoneModelValue,
} from './lib/phoneMask';
export type {
  PhoneAllowedCountries,
  PhoneCountryCode,
  PhoneCountryMeta,
  PhoneCountryOption,
  PhoneFlagUrlResolver,
  PhoneMaskByCountry,
  PhoneModelFormat,
  PhoneValidationMeta,
} from './lib/phoneMask';
