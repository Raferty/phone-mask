<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  type ComponentPublicInstance,
  ref,
  useAttrs,
  useId,
  watch,
} from 'vue';
import {
  DEFAULT_PHONE_MASK,
  type PhoneAllowedCountries,
  type PhoneCountryCode,
  type PhoneCountryMeta,
  type PhoneCountryOption,
  type PhoneFlagUrlResolver,
  type PhoneMaskByCountry,
  type PhoneModelFormat,
  type PhoneValidationMeta,
  detectCountryByPhoneDigits,
  formatPhoneDigitsWithMask,
  formatPhoneModelValue,
  getCountryCallingDigits,
  getPhoneCountryOptions,
  getPhoneMaskPlaceholder,
  getPhoneValidationMeta,
  isCountryAllowed,
  isPhoneDigitsAllowed,
  limitPhoneDigits,
  normalizePhoneDigits,
  parsePhoneModelValue,
} from '../lib/phoneMask';

defineOptions({
  inheritAttrs: false,
});

type PhoneMaskInputProps = {
  modelValue?: string;
  country?: PhoneCountryCode | null;
  defaultCountry?: PhoneCountryCode | null;
  id?: string;
  name?: string;
  disabled?: boolean;
  readonly?: boolean;
  invalid?: boolean;
  modelFormat?: PhoneModelFormat;
  placeholder?: string;
  countryMasks?: PhoneMaskByCountry;
  allowedCountries?: PhoneAllowedCountries;
  showCountryFlag?: boolean;
  showCountrySelector?: boolean;
  flagUrlResolver?: PhoneFlagUrlResolver;
  countryNameLocale?: string | string[];
  countrySelectorLabel?: string;
  countrySelectorAriaLabel?: string;
  countrySearchPlaceholder?: string;
  noCountriesText?: string;
};

type PhoneCountrySelectorOption = PhoneCountryOption & {
  name: string;
  flagUrl: string;
};

const props = withDefaults(defineProps<PhoneMaskInputProps>(), {
  modelValue: '',
  country: null,
  defaultCountry: null,
  id: undefined,
  name: 'phone',
  disabled: false,
  readonly: false,
  invalid: false,
  modelFormat: 'e164',
  placeholder: DEFAULT_PHONE_MASK,
  countryMasks: () => ({}),
  allowedCountries: () => [],
  showCountryFlag: false,
  showCountrySelector: false,
  flagUrlResolver: undefined,
  countryNameLocale: 'en',
  countrySelectorLabel: 'Country',
  countrySelectorAriaLabel: 'Select country',
  countrySearchPlaceholder: 'Search country',
  noCountriesText: 'No countries',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:country': [country: PhoneCountryCode | null];
  'change:country': [meta: PhoneCountryMeta];
  'change:validation': [meta: PhoneValidationMeta];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}>();

defineSlots<{
  countryFlag?: (props: {
    country: PhoneCountryCode | null;
    countryMeta: PhoneCountryMeta;
  }) => unknown;
  countryOption?: (props: {
    option: PhoneCountrySelectorOption;
    active: boolean;
    selected: boolean;
  }) => unknown;
}>();

const attrs = useAttrs();
const componentId = useId();
const countrySelectorListId = `${componentId}-country-selector-list`;
const rootAttrs = computed(() => ({
  class: attrs.class,
  style: attrs.style,
}));
const inputAttrs = computed(() => {
  const { class: _class, style: _style, ...restAttrs } = attrs;

  return restAttrs;
});

function getInitialCountry(): PhoneCountryCode | null {
  const country = props.country ?? props.defaultCountry;

  if (!isCountryAllowed(country, props.allowedCountries)) {
    return null;
  }

  return country;
}

function getInitialDigits(): string {
  const modelDigits = parsePhoneModelValue(
    props.modelValue,
    props.modelFormat,
    getInitialCountry(),
  );

  if (modelDigits) {
    return modelDigits;
  }

  const initialCountry = getInitialCountry();

  return initialCountry ? getCountryCallingDigits(initialCountry) : '';
}

const isFocused = ref(false);
const countrySelectorRef = ref<HTMLElement | null>(null);
const countrySelectorSearchRef = ref<HTMLInputElement | null>(null);
const countrySelectorOptionRefs = ref<HTMLElement[]>([]);
const isCountrySelectorOpen = ref(false);
const countrySearch = ref('');
const activeCountryOptionIndex = ref(0);
const brokenFlagCountries = ref(new Set<PhoneCountryCode>());
const localDigits = ref(getInitialDigits());
const digits = computed(() => localDigits.value);
const selectedCountry = computed(() => getInitialCountry());
const selectedCallingDigits = computed(() => {
  if (!selectedCountry.value) {
    return '';
  }

  return getCountryCallingDigits(selectedCountry.value);
});

function getRegionNameFormatter(): Intl.DisplayNames | null {
  if (typeof Intl === 'undefined' || typeof Intl.DisplayNames === 'undefined') {
    return null;
  }

  return new Intl.DisplayNames(props.countryNameLocale, { type: 'region' });
}

function getCountryMetaForDigits(nextDigits: string): PhoneCountryMeta {
  const detectedCountryMeta = detectCountryByPhoneDigits(nextDigits);
  const country = selectedCountry.value;

  if (
    country &&
    !detectedCountryMeta.country &&
    nextDigits.startsWith(getCountryCallingDigits(country))
  ) {
    return {
      ...detectedCountryMeta,
      country,
      callingCode: detectedCountryMeta.callingCode ?? getCountryCallingDigits(country),
      possibleCountries: detectedCountryMeta.possibleCountries.includes(country)
        ? detectedCountryMeta.possibleCountries
        : [country, ...detectedCountryMeta.possibleCountries],
    };
  }

  return detectedCountryMeta;
}

const regionNames = computed(() => getRegionNameFormatter());
const countryMeta = computed(() => getCountryMetaForDigits(digits.value));
const visibleCountry = computed(() => countryMeta.value.country ?? selectedCountry.value);
const countryFlagUrl = computed(() => {
  if (!visibleCountry.value) {
    return '';
  }

  return getCountryFlagUrl(visibleCountry.value);
});
const countryOptions = computed<PhoneCountrySelectorOption[]>(() =>
  getPhoneCountryOptions(props.allowedCountries).map((option) => ({
    ...option,
    name: getCountryName(option.country),
    flagUrl: getCountryFlagUrl(option.country),
  })),
);
const filteredCountryOptions = computed(() => {
  const search = countrySearch.value.trim().toLowerCase();

  if (!search) {
    return countryOptions.value;
  }

  const searchDigits = search.replace(/^\+/, '');

  return countryOptions.value.filter((option) => {
    const country = option.country.toLowerCase();
    const name = option.name.toLowerCase();

    return (
      country.includes(search) ||
      name.includes(search) ||
      option.callingCode.startsWith(searchDigits)
    );
  });
});
const activeCountryOption = computed(
  () => filteredCountryOptions.value[activeCountryOptionIndex.value] ?? null,
);
const activeCountryOptionId = computed(() => {
  if (!activeCountryOption.value) {
    return undefined;
  }

  return getCountryOptionId(activeCountryOption.value.country);
});
const formattedValue = computed(() =>
  formatPhoneDigitsWithMask(digits.value, props.countryMasks, props.allowedCountries),
);
const maskPlaceholder = computed(() => {
  if (!digits.value) {
    return props.placeholder;
  }

  return getPhoneMaskPlaceholder(digits.value, props.countryMasks);
});

function getCountryName(country: PhoneCountryCode): string {
  return regionNames.value?.of(country) ?? country;
}

function getCountryOptionId(country: PhoneCountryCode): string {
  return `${componentId}-country-option-${country}`;
}

function resetCountryOptionRefs(): void {
  countrySelectorOptionRefs.value = [];
}

function setCountryOptionRef(
  element: Element | ComponentPublicInstance | null,
  index: number,
): void {
  if (typeof HTMLElement !== 'undefined' && element instanceof HTMLElement) {
    countrySelectorOptionRefs.value[index] = element;
  }
}

function scrollActiveCountryOptionIntoView(): void {
  const activeOptionElement = countrySelectorOptionRefs.value[activeCountryOptionIndex.value];

  activeOptionElement?.scrollIntoView?.({ block: 'nearest' });
}

function getCountryFlagUrl(country: PhoneCountryCode): string {
  if (brokenFlagCountries.value.has(country)) {
    return '';
  }

  try {
    return props.flagUrlResolver?.(country) ?? `https://flagcdn.com/${country.toLowerCase()}.svg`;
  } catch {
    return `https://flagcdn.com/${country.toLowerCase()}.svg`;
  }
}

function handleFlagError(country: PhoneCountryCode): void {
  brokenFlagCountries.value = new Set([...brokenFlagCountries.value, country]);
}

watch(
  () => [props.modelValue, props.modelFormat, props.country, props.defaultCountry] as const,
  ([modelValue]) => {
    const nextDigits =
      parsePhoneModelValue(modelValue, props.modelFormat, getInitialCountry()) ||
      getInitialDigits();

    if (nextDigits !== localDigits.value) {
      localDigits.value = nextDigits;
    }
  },
);

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', handleDocumentPointerDown);
  }

  if (!props.modelValue && localDigits.value) {
    const nextCountryMeta = countryMeta.value;
    const nextValue = formatPhoneModelValue(
      localDigits.value,
      props.modelFormat,
      nextCountryMeta.country ?? selectedCountry.value,
    );

    emit('update:modelValue', nextValue);
    emit('update:country', nextCountryMeta.country);
    emit('change:country', nextCountryMeta);
    emit('change:validation', getPhoneValidationMeta(localDigits.value, props.allowedCountries));
  }
});

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', handleDocumentPointerDown);
  }
});

watch(
  () => props.country,
  (country) => {
    if (!isCountryAllowed(country, props.allowedCountries)) {
      return;
    }

    const currentMeta = detectCountryByPhoneDigits(localDigits.value);

    if (currentMeta.country === country) {
      return;
    }

    localDigits.value = country ? getCountryCallingDigits(country) : '';
  },
);

watch(filteredCountryOptions, () => {
  resetCountryOptionRefs();
  activeCountryOptionIndex.value = 0;
});

function getDigitCountBeforePosition(value: string, position: number): number {
  return normalizePhoneDigits(value.slice(0, position)).length;
}

function getProtectedDigitCount(): number {
  if (!selectedCallingDigits.value || !digits.value.startsWith(selectedCallingDigits.value)) {
    return 0;
  }

  return selectedCallingDigits.value.length;
}

function getCaretPositionAfterDigitCount(value: string, digitCount: number): number {
  if (digitCount <= 0) {
    return 0;
  }

  let visibleDigits = 0;

  for (let index = 0; index < value.length; index += 1) {
    if (/\d/.test(value[index])) {
      visibleDigits += 1;
    }

    if (visibleDigits >= digitCount) {
      return index + 1;
    }
  }

  return value.length;
}

function emitPhoneChange(nextDigits: string): string {
  const limitedDigits = limitPhoneDigits(nextDigits, props.allowedCountries);
  const nextCountryMeta = getCountryMetaForDigits(limitedDigits);
  const nextValue = formatPhoneModelValue(
    limitedDigits,
    props.modelFormat,
    nextCountryMeta.country ?? selectedCountry.value,
  );
  const nextValidationMeta = getPhoneValidationMeta(limitedDigits, props.allowedCountries);
  const nextFormattedValue = formatPhoneDigitsWithMask(
    limitedDigits,
    props.countryMasks,
    props.allowedCountries,
  );

  localDigits.value = limitedDigits;
  emit('update:modelValue', nextValue);
  emit('update:country', nextCountryMeta.country);
  emit('change:country', nextCountryMeta);
  emit('change:validation', nextValidationMeta);

  return nextFormattedValue;
}

function getNationalDigitsForCountryChange(nextCountry: PhoneCountryCode): string {
  const currentDigits = digits.value;
  const currentMeta = getCountryMetaForDigits(currentDigits);

  if (currentMeta.callingCode && currentDigits.startsWith(currentMeta.callingCode)) {
    return currentDigits.slice(currentMeta.callingCode.length);
  }

  if (selectedCallingDigits.value && currentDigits.startsWith(selectedCallingDigits.value)) {
    return currentDigits.slice(selectedCallingDigits.value.length);
  }

  const nextCallingDigits = getCountryCallingDigits(nextCountry);

  if (currentDigits.startsWith(nextCallingDigits)) {
    return currentDigits.slice(nextCallingDigits.length);
  }

  return '';
}

function closeCountrySelector(): void {
  isCountrySelectorOpen.value = false;
  countrySearch.value = '';
  activeCountryOptionIndex.value = 0;
}

function openCountrySelector(): void {
  if (props.disabled || props.readonly) {
    return;
  }

  isCountrySelectorOpen.value = true;
  activeCountryOptionIndex.value = Math.max(
    filteredCountryOptions.value.findIndex((option) => option.country === visibleCountry.value),
    0,
  );

  void nextTick(() => {
    countrySelectorSearchRef.value?.focus();
    scrollActiveCountryOptionIntoView();
  });
}

function toggleCountrySelector(): void {
  if (props.disabled || props.readonly) {
    return;
  }

  if (isCountrySelectorOpen.value) {
    closeCountrySelector();
    return;
  }

  openCountrySelector();
}

function selectCountry(country: PhoneCountryCode): void {
  if (props.disabled || props.readonly || !isCountryAllowed(country, props.allowedCountries)) {
    return;
  }

  const nextDigits = `${getCountryCallingDigits(country)}${getNationalDigitsForCountryChange(
    country,
  )}`;

  closeCountrySelector();
  emit('update:country', country);

  void nextTick(() => {
    emitPhoneChange(nextDigits);
  });
}

function moveActiveCountryOption(step: number): void {
  if (!filteredCountryOptions.value.length) {
    activeCountryOptionIndex.value = 0;
    return;
  }

  activeCountryOptionIndex.value =
    (activeCountryOptionIndex.value + step + filteredCountryOptions.value.length) %
    filteredCountryOptions.value.length;

  void nextTick(scrollActiveCountryOptionIntoView);
}

function handleCountrySelectorKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeCountrySelector();
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();

    if (!isCountrySelectorOpen.value) {
      openCountrySelector();
      return;
    }

    moveActiveCountryOption(1);
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    moveActiveCountryOption(-1);
    return;
  }

  if (event.key === 'Home') {
    event.preventDefault();
    activeCountryOptionIndex.value = 0;
    void nextTick(scrollActiveCountryOptionIntoView);
    return;
  }

  if (event.key === 'End') {
    event.preventDefault();
    activeCountryOptionIndex.value = Math.max(filteredCountryOptions.value.length - 1, 0);
    void nextTick(scrollActiveCountryOptionIntoView);
    return;
  }

  if (event.key === 'Enter' && isCountrySelectorOpen.value && activeCountryOption.value) {
    event.preventDefault();
    selectCountry(activeCountryOption.value.country);
  }
}

function handleDocumentPointerDown(event: PointerEvent): void {
  if (!isCountrySelectorOpen.value) {
    return;
  }

  const target = event.target;

  if (
    typeof Node !== 'undefined' &&
    target instanceof Node &&
    countrySelectorRef.value?.contains(target)
  ) {
    return;
  }

  closeCountrySelector();
}

function updateInputValue(
  input: HTMLInputElement,
  nextDigits: string,
  nextDigitCaret: number,
): void {
  const nextFormattedValue = emitPhoneChange(nextDigits);
  const nextCaretPosition = getCaretPositionAfterDigitCount(nextFormattedValue, nextDigitCaret);

  input.value = nextFormattedValue;

  void nextTick(() => {
    input.setSelectionRange(nextCaretPosition, nextCaretPosition);
  });
}

function handleInsertInput(event: InputEvent): void {
  if (props.readonly) {
    event.preventDefault();
    return;
  }

  const input = event.target as HTMLInputElement;
  const insertedDigits = normalizePhoneDigits(event.data ?? '');

  if (!insertedDigits) {
    event.preventDefault();
    return;
  }

  event.preventDefault();

  const selectionStart = input.selectionStart ?? input.value.length;
  const selectionEnd = input.selectionEnd ?? selectionStart;
  const currentDigits = digits.value;
  const protectedDigitCount = getProtectedDigitCount();
  const digitStart = Math.max(
    getDigitCountBeforePosition(input.value, selectionStart),
    protectedDigitCount,
  );
  const digitEnd = Math.max(
    getDigitCountBeforePosition(input.value, selectionEnd),
    protectedDigitCount,
  );
  const nextDigits = `${currentDigits.slice(0, digitStart)}${insertedDigits}${currentDigits.slice(
    digitEnd,
  )}`;

  if (!isPhoneDigitsAllowed(nextDigits, props.allowedCountries)) {
    return;
  }

  updateInputValue(input, nextDigits, digitStart + insertedDigits.length);
}

function handleDeleteInput(event: InputEvent): void {
  if (props.readonly) {
    event.preventDefault();
    return;
  }

  const input = event.target as HTMLInputElement;
  const selectionStart = input.selectionStart ?? input.value.length;
  const selectionEnd = input.selectionEnd ?? selectionStart;
  const currentDigits = digits.value;
  const protectedDigitCount = getProtectedDigitCount();
  const digitStart = getDigitCountBeforePosition(input.value, selectionStart);
  const digitEnd = getDigitCountBeforePosition(input.value, selectionEnd);
  const isBackward = event.inputType === 'deleteContentBackward';

  let removeFrom = digitStart;
  let removeTo = digitEnd;

  if (digitStart === digitEnd) {
    removeFrom = isBackward ? digitStart - 1 : digitStart;
    removeTo = isBackward ? digitStart : digitStart + 1;
  }

  if (removeFrom < protectedDigitCount) {
    event.preventDefault();
    return;
  }

  if (removeFrom < 0 || removeFrom >= currentDigits.length) {
    return;
  }

  event.preventDefault();

  const nextDigits = `${currentDigits.slice(0, removeFrom)}${currentDigits.slice(removeTo)}`;
  updateInputValue(input, nextDigits, removeFrom);
}

function handleBeforeInput(event: InputEvent): void {
  if (event.inputType === 'deleteContentBackward' || event.inputType === 'deleteContentForward') {
    handleDeleteInput(event);
    return;
  }

  if (event.inputType.startsWith('insert')) {
    handleInsertInput(event);
  }
}

function handleInput(event: Event): void {
  if (props.readonly) {
    return;
  }

  const input = event.target as HTMLInputElement;
  const nextFormattedValue = emitPhoneChange(digits.value);

  if (input.value !== nextFormattedValue) {
    input.value = nextFormattedValue;
  }
}

function handlePaste(event: ClipboardEvent): void {
  if (props.readonly) {
    event.preventDefault();
    return;
  }

  const input = event.target as HTMLInputElement;
  const pastedDigits = normalizePhoneDigits(event.clipboardData?.getData('text') ?? '');

  if (!pastedDigits) {
    event.preventDefault();
    return;
  }

  event.preventDefault();

  const selectionStart = input.selectionStart ?? input.value.length;
  const selectionEnd = input.selectionEnd ?? selectionStart;
  const protectedDigitCount = getProtectedDigitCount();
  const digitStart = Math.max(
    getDigitCountBeforePosition(input.value, selectionStart),
    protectedDigitCount,
  );
  const digitEnd = Math.max(
    getDigitCountBeforePosition(input.value, selectionEnd),
    protectedDigitCount,
  );
  const nextDigits = `${digits.value.slice(0, digitStart)}${pastedDigits}${digits.value.slice(
    digitEnd,
  )}`;

  if (!isPhoneDigitsAllowed(nextDigits, props.allowedCountries)) {
    return;
  }

  updateInputValue(input, nextDigits, digitStart + pastedDigits.length);
}

function handleFocus(event: FocusEvent): void {
  isFocused.value = true;
  emit('focus', event);
}

function handleBlur(event: FocusEvent): void {
  isFocused.value = false;
  emit('blur', event);
}
</script>

<template>
  <div
    class="phone-mask-input"
    :class="[
      rootAttrs.class,
      {
        'phone-mask-input--focused': isFocused,
        'phone-mask-input--disabled': disabled,
        'phone-mask-input--readonly': readonly,
        'phone-mask-input--invalid': invalid,
      },
    ]"
    :style="rootAttrs.style"
  >
    <div
      v-if="showCountrySelector"
      ref="countrySelectorRef"
      class="phone-mask-input__country-selector"
    >
      <button
        class="phone-mask-input__country-selector-button"
        type="button"
        :disabled="disabled || readonly"
        aria-haspopup="listbox"
        :aria-label="countrySelectorAriaLabel"
        :aria-expanded="isCountrySelectorOpen"
        :aria-controls="countrySelectorListId"
        @click="toggleCountrySelector"
        @keydown="handleCountrySelectorKeydown"
      >
        <img
          v-if="countryFlagUrl"
          class="phone-mask-input__flag"
          :src="countryFlagUrl"
          :alt="`${visibleCountry} flag`"
          @error="visibleCountry && handleFlagError(visibleCountry)"
        />
        <span v-else-if="visibleCountry" class="phone-mask-input__flag-fallback">
          {{ visibleCountry }}
        </span>
        <span class="phone-mask-input__country-selector-code">
          {{ visibleCountry || countrySelectorLabel }}
        </span>
      </button>

      <div v-if="isCountrySelectorOpen" class="phone-mask-input__country-selector-menu">
        <input
          ref="countrySelectorSearchRef"
          v-model="countrySearch"
          class="phone-mask-input__country-selector-search"
          type="search"
          :placeholder="countrySearchPlaceholder"
          role="combobox"
          :aria-label="countrySearchPlaceholder"
          aria-autocomplete="list"
          :aria-expanded="isCountrySelectorOpen"
          :aria-controls="countrySelectorListId"
          :aria-activedescendant="activeCountryOptionId"
          @keydown="handleCountrySelectorKeydown"
        />

        <div
          :id="countrySelectorListId"
          class="phone-mask-input__country-selector-list"
          role="listbox"
        >
          <button
            v-for="(option, index) in filteredCountryOptions"
            :key="option.country"
            :id="getCountryOptionId(option.country)"
            :ref="(element) => setCountryOptionRef(element, index)"
            class="phone-mask-input__country-selector-option"
            :class="{
              'phone-mask-input__country-selector-option--active':
                index === activeCountryOptionIndex,
            }"
            type="button"
            role="option"
            :aria-selected="option.country === visibleCountry"
            @click="selectCountry(option.country)"
            @mouseenter="activeCountryOptionIndex = index"
          >
            <slot
              name="countryOption"
              :option="option"
              :active="index === activeCountryOptionIndex"
              :selected="option.country === visibleCountry"
            >
              <img
                v-if="option.flagUrl"
                class="phone-mask-input__flag"
                :src="option.flagUrl"
                :alt="`${option.country} flag`"
                @error="handleFlagError(option.country)"
              />
              <span v-else class="phone-mask-input__flag-fallback">
                {{ option.country }}
              </span>
              <span class="phone-mask-input__country-selector-name">{{ option.name }}</span>
              <span class="phone-mask-input__country-selector-dial">+{{ option.callingCode }}</span>
            </slot>
          </button>

          <div
            v-if="filteredCountryOptions.length === 0"
            class="phone-mask-input__country-selector-empty"
          >
            {{ noCountriesText }}
          </div>
        </div>
      </div>
    </div>

    <div
      v-else-if="showCountryFlag && ($slots.countryFlag || visibleCountry)"
      class="phone-mask-input__country-flag"
    >
      <slot name="countryFlag" :country="visibleCountry" :country-meta="countryMeta">
        <img
          v-if="countryFlagUrl"
          class="phone-mask-input__flag"
          :src="countryFlagUrl"
          :alt="`${visibleCountry} flag`"
          @error="visibleCountry && handleFlagError(visibleCountry)"
        />
        <span v-else-if="visibleCountry" class="phone-mask-input__flag-fallback">
          {{ visibleCountry }}
        </span>
      </slot>
    </div>

    <input
      v-bind="inputAttrs"
      :id="id"
      class="phone-mask-input__control"
      type="tel"
      inputmode="tel"
      autocomplete="tel"
      :name="name"
      :value="formattedValue"
      :placeholder="maskPlaceholder"
      :disabled="disabled"
      :readonly="readonly"
      :aria-invalid="invalid || undefined"
      :aria-label="inputAttrs['aria-label'] ? undefined : name"
      :data-country="countryMeta.country || undefined"
      @beforeinput="handleBeforeInput"
      @blur="handleBlur"
      @focus="handleFocus"
      @input="handleInput"
      @paste="handlePaste"
    />
  </div>
</template>

<style scoped>
.phone-mask-input {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--phone-mask-input-gap, 8px);
  width: var(--phone-mask-input-width, 100%);
  box-sizing: border-box;
  border: var(--phone-mask-input-border-width, 1px) solid
    var(--phone-mask-input-border-color, #cbd5e1);
  border-radius: var(--phone-mask-input-border-radius, 4px);
  padding: var(--phone-mask-input-padding, 8px 12px);
  background: var(--phone-mask-input-background, #ffffff);
  transition:
    border-color var(--phone-mask-input-transition-duration, 120ms)
      var(--phone-mask-input-transition-easing, ease),
    box-shadow var(--phone-mask-input-transition-duration, 120ms)
      var(--phone-mask-input-transition-easing, ease),
    background-color var(--phone-mask-input-transition-duration, 120ms)
      var(--phone-mask-input-transition-easing, ease);
}

.phone-mask-input--focused {
  border-color: var(--phone-mask-input-focus-border-color, #2563eb);
  box-shadow: var(--phone-mask-input-focus-box-shadow, 0 0 0 3px rgb(37 99 235 / 16%));
}

.phone-mask-input--disabled {
  background: var(--phone-mask-input-disabled-background, #f8fafc);
  cursor: not-allowed;
}

.phone-mask-input--readonly {
  background: var(--phone-mask-input-readonly-background, #f8fafc);
}

.phone-mask-input--invalid {
  border-color: var(--phone-mask-input-invalid-border-color, #dc2626);
  box-shadow: var(--phone-mask-input-invalid-box-shadow, none);
}

.phone-mask-input--invalid.phone-mask-input--focused {
  border-color: var(--phone-mask-input-invalid-focus-border-color, #dc2626);
  box-shadow: var(--phone-mask-input-invalid-focus-box-shadow, 0 0 0 3px rgb(220 38 38 / 16%));
}

.phone-mask-input__country-flag {
  display: inline-grid;
  align-items: center;
  justify-content: center;
  min-width: var(--phone-mask-input-country-flag-min-width, 0);
  color: var(--phone-mask-input-country-flag-color, currentColor);
  line-height: 1;
}

.phone-mask-input__flag {
  display: block;
  width: var(--phone-mask-input-flag-width, 24px);
  height: var(--phone-mask-input-flag-height, 18px);
  border-radius: var(--phone-mask-input-flag-border-radius, 2px);
  box-shadow: var(--phone-mask-input-flag-box-shadow, 0 0 0 1px rgb(15 23 42 / 10%));
  object-fit: cover;
}

.phone-mask-input__flag-fallback {
  display: inline-grid;
  place-items: center;
  width: var(--phone-mask-input-flag-width, 24px);
  height: var(--phone-mask-input-flag-height, 18px);
  box-sizing: border-box;
  border-radius: var(--phone-mask-input-flag-border-radius, 2px);
  color: var(--phone-mask-input-flag-fallback-color, #475569);
  font-size: var(--phone-mask-input-flag-fallback-font-size, 10px);
  font-weight: var(--phone-mask-input-flag-fallback-font-weight, 600);
  line-height: 1;
  background: var(--phone-mask-input-flag-fallback-background, #f1f5f9);
  box-shadow: var(--phone-mask-input-flag-box-shadow, 0 0 0 1px rgb(15 23 42 / 10%));
}

.phone-mask-input__country-selector {
  position: static;
}

.phone-mask-input__country-selector-button {
  display: inline-flex;
  align-items: center;
  gap: var(--phone-mask-input-country-selector-button-gap, 6px);
  min-width: var(--phone-mask-input-country-selector-button-min-width, 0);
  box-sizing: border-box;
  border: var(--phone-mask-input-country-selector-button-border-width, 0) solid
    var(--phone-mask-input-country-selector-button-border-color, transparent);
  border-radius: var(--phone-mask-input-country-selector-button-border-radius, 4px);
  padding: var(--phone-mask-input-country-selector-button-padding, 2px 4px);
  color: var(--phone-mask-input-country-selector-button-color, inherit);
  font: var(--phone-mask-input-country-selector-button-font, inherit);
  line-height: var(--phone-mask-input-country-selector-button-line-height, 1.2);
  background: var(--phone-mask-input-country-selector-button-background, transparent);
  cursor: pointer;
}

.phone-mask-input__country-selector-button:disabled {
  color: var(--phone-mask-input-disabled-color, #64748b);
  cursor: not-allowed;
}

.phone-mask-input__country-selector-code {
  color: var(--phone-mask-input-country-selector-code-color, currentColor);
  font-size: var(--phone-mask-input-country-selector-code-font-size, 0.875em);
  white-space: nowrap;
}

.phone-mask-input__country-selector-menu {
  position: absolute;
  top: calc(100% + var(--phone-mask-input-country-selector-menu-offset, 8px));
  left: 0;
  z-index: var(--phone-mask-input-country-selector-menu-z-index, 20);
  display: grid;
  gap: var(--phone-mask-input-country-selector-menu-gap, 8px);
  width: var(--phone-mask-input-country-selector-menu-width, 280px);
  max-width: var(--phone-mask-input-country-selector-menu-max-width, min(80vw, 320px));
  box-sizing: border-box;
  border: var(--phone-mask-input-country-selector-menu-border-width, 1px) solid
    var(--phone-mask-input-country-selector-menu-border-color, #cbd5e1);
  border-radius: var(--phone-mask-input-country-selector-menu-border-radius, 6px);
  padding: var(--phone-mask-input-country-selector-menu-padding, 8px);
  background: var(--phone-mask-input-country-selector-menu-background, #ffffff);
  box-shadow: var(
    --phone-mask-input-country-selector-menu-box-shadow,
    0 16px 32px rgb(15 23 42 / 14%)
  );
}

.phone-mask-input__country-selector-search {
  width: 100%;
  box-sizing: border-box;
  border: var(--phone-mask-input-country-selector-search-border-width, 1px) solid
    var(--phone-mask-input-country-selector-search-border-color, #cbd5e1);
  border-radius: var(--phone-mask-input-country-selector-search-border-radius, 4px);
  padding: var(--phone-mask-input-country-selector-search-padding, 8px 10px);
  color: var(--phone-mask-input-country-selector-search-color, #0f172a);
  font: var(--phone-mask-input-country-selector-search-font, inherit);
  background: var(--phone-mask-input-country-selector-search-background, #ffffff);
}

.phone-mask-input__country-selector-search:focus {
  border-color: var(--phone-mask-input-focus-border-color, #2563eb);
  outline: var(--phone-mask-input-outline, none);
}

.phone-mask-input__country-selector-list {
  display: grid;
  gap: var(--phone-mask-input-country-selector-list-gap, 2px);
  max-height: var(--phone-mask-input-country-selector-list-max-height, 240px);
  overflow: auto;
}

.phone-mask-input__country-selector-option {
  display: grid;
  grid-template-columns: var(
    --phone-mask-input-country-selector-option-grid-template-columns,
    auto minmax(0, 1fr) auto
  );
  align-items: var(--phone-mask-input-country-selector-option-align-items, center);
  gap: var(--phone-mask-input-country-selector-option-gap, 8px);
  width: 100%;
  min-height: var(--phone-mask-input-country-selector-option-min-height, 40px);
  box-sizing: border-box;
  border: 0;
  border-radius: var(--phone-mask-input-country-selector-option-border-radius, 4px);
  padding: var(--phone-mask-input-country-selector-option-padding, 8px);
  color: var(--phone-mask-input-country-selector-option-color, #0f172a);
  font: var(--phone-mask-input-country-selector-option-font, inherit);
  text-align: left;
  background: var(--phone-mask-input-country-selector-option-background, transparent);
  cursor: pointer;
}

.phone-mask-input__country-selector-option:hover,
.phone-mask-input__country-selector-option--active,
.phone-mask-input__country-selector-option[aria-selected='true'] {
  background: var(--phone-mask-input-country-selector-option-hover-background, #eff6ff);
}

.phone-mask-input__country-selector-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.phone-mask-input__country-selector-dial,
.phone-mask-input__country-selector-empty {
  color: var(--phone-mask-input-country-selector-muted-color, #64748b);
}

.phone-mask-input__country-selector-empty {
  padding: var(--phone-mask-input-country-selector-empty-padding, 8px);
}

.phone-mask-input__control {
  width: var(--phone-mask-input-control-width, 100%);
  box-sizing: border-box;
  border: 0;
  padding: 0;
  color: var(--phone-mask-input-color, #0f172a);
  font: var(--phone-mask-input-font, inherit);
  font-size: var(--phone-mask-input-font-size, inherit);
  font-weight: var(--phone-mask-input-font-weight, inherit);
  line-height: var(--phone-mask-input-line-height, 1.4);
  background: transparent;
  caret-color: var(--phone-mask-input-caret-color, currentColor);
  letter-spacing: var(--phone-mask-input-letter-spacing, inherit);
}

.phone-mask-input__control::placeholder {
  color: var(--phone-mask-input-placeholder-color, #94a3b8);
  opacity: var(--phone-mask-input-placeholder-opacity, 1);
}

.phone-mask-input__control:focus {
  outline: var(--phone-mask-input-outline, none);
}

.phone-mask-input__control:disabled {
  color: var(--phone-mask-input-disabled-color, #64748b);
  cursor: not-allowed;
}

.phone-mask-input__control:read-only:not(:disabled) {
  color: var(--phone-mask-input-readonly-color, #64748b);
  cursor: var(--phone-mask-input-readonly-cursor, default);
}
</style>
