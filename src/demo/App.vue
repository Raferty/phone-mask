<script setup lang="ts">
import { computed, ref } from 'vue';
import PhoneMaskInput from '../components/PhoneMaskInput.vue';
import {
  type PhoneCountryCode,
  type PhoneFlagUrlResolver,
  type PhoneModelFormat,
  type PhoneValidationMeta,
  detectCountryByPhoneDigits,
  normalizePhoneDigits,
} from '../lib/phoneMask';

type DemoExample = {
  label: string;
  value: string;
  note: string;
};

type DemoNavItem = {
  href: string;
  label: string;
};

const demoNavItems: DemoNavItem[] = [
  { href: '#basic', label: 'Basic input' },
  { href: '#flag', label: 'Country flag' },
  { href: '#selector', label: 'Country selector' },
  { href: '#custom-option', label: 'Custom option' },
  { href: '#country-model', label: 'Country model' },
  { href: '#validation', label: 'Validation' },
  { href: '#formats', label: 'Model formats' },
  { href: '#readonly', label: 'Readonly' },
  { href: '#allowed-countries', label: 'Allowed countries' },
  { href: '#problematic', label: 'Problematic masks' },
  { href: '#author', label: 'Author' },
];

const demoExamples: DemoExample[] = [
  {
    label: 'Kazakhstan',
    value: '+77501234567',
    note: 'Shares +7 with Russia',
  },
  {
    label: 'Russia',
    value: '+79771234567',
    note: 'Shares +7 with Kazakhstan',
  },
  {
    label: 'Antigua and Barbuda',
    value: '+12681234567',
    note: 'NANP country under +1',
  },
  {
    label: 'Czechia',
    value: '+420601123456',
    note: 'Calling code repeats as visible mask text',
  },
  {
    label: 'Mali',
    value: '+22323232323',
    note: 'Short national grouping',
  },
];

const phone = ref('');
const phoneWithFlag = ref('+420601123456');
const phoneWithCountrySelector = ref('');
const phoneWithCustomCountrySelector = ref('');
const phoneOnlySeven = ref('');
const phoneWithCountryModel = ref('');
const phoneWithValidation = ref('');
const phoneProblematic = ref('');
const phoneDigitsFormat = ref('');
const phoneNationalFormat = ref('');
const phoneReadonly = ref('+420601123456');
const selectedCountry = ref<PhoneCountryCode | null>('RU');
const selectorCountry = ref<PhoneCountryCode | null>('US');
const customSelectorCountry = ref<PhoneCountryCode | null>('FR');
const nationalFormatCountry = ref<PhoneCountryCode | null>('CZ');
const digitsFormat: PhoneModelFormat = 'digits';
const nationalFormat: PhoneModelFormat = 'national';
const demoFlagUrlResolver: PhoneFlagUrlResolver = (country) =>
  `https://flagcdn.com/${country.toLowerCase()}.svg`;
const validationTouched = ref(false);
const validationMeta = ref<PhoneValidationMeta | null>(null);
const countryMeta = computed(() => detectCountryByPhoneDigits(normalizePhoneDigits(phone.value)));
const countryWithFlagMeta = computed(() =>
  detectCountryByPhoneDigits(normalizePhoneDigits(phoneWithFlag.value)),
);
const countryOnlySevenMeta = computed(() =>
  detectCountryByPhoneDigits(normalizePhoneDigits(phoneOnlySeven.value)),
);
const countrySelectorMeta = computed(() =>
  detectCountryByPhoneDigits(normalizePhoneDigits(phoneWithCountrySelector.value)),
);
const countryProblematicMeta = computed(() =>
  detectCountryByPhoneDigits(normalizePhoneDigits(phoneProblematic.value)),
);
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryName = computed(() => {
  if (!countryMeta.value?.country) {
    return '';
  }

  return regionNames.of(countryMeta.value.country) ?? '';
});
const countryWithFlagName = computed(() => {
  if (!countryWithFlagMeta.value?.country) {
    return '';
  }

  return regionNames.of(countryWithFlagMeta.value.country) ?? '';
});
const countryOnlySevenName = computed(() => {
  if (!countryOnlySevenMeta.value?.country) {
    return '';
  }

  return regionNames.of(countryOnlySevenMeta.value.country) ?? '';
});
const countrySelectorName = computed(() => {
  if (!selectorCountry.value) {
    return '';
  }

  return regionNames.of(selectorCountry.value) ?? '';
});
const customCountrySelectorName = computed(() => {
  if (!customSelectorCountry.value) {
    return '';
  }

  return regionNames.of(customSelectorCountry.value) ?? '';
});
const countryProblematicName = computed(() => {
  if (!countryProblematicMeta.value?.country) {
    return '';
  }

  return regionNames.of(countryProblematicMeta.value.country) ?? '';
});
const selectedCountryName = computed(() => {
  if (!selectedCountry.value) {
    return '';
  }

  return regionNames.of(selectedCountry.value) ?? '';
});
const validationInvalid = computed(
  () => validationTouched.value && Boolean(phoneWithValidation.value) && !validationMeta.value?.isValid,
);

function setExample(value: string): void {
  phoneProblematic.value = value;
}
</script>

<template>
  <main class="demo-shell">
    <aside class="demo-nav" aria-label="Demo navigation">
      <a
        v-for="item in demoNavItems"
        :key="item.href"
        class="demo-nav__link"
        :href="item.href"
      >
        {{ item.label }}
      </a>
    </aside>

    <section class="demo-panel">
      <section id="basic" class="demo-basic" aria-label="Basic phone input">
        <h1>Phone mask</h1>

        <label class="demo-field">
          <span>Phone</span>
          <PhoneMaskInput v-model="phone" />
        </label>

        <dl class="demo-meta">
          <div>
            <dt>Value</dt>
            <dd>{{ phone || '-' }}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>{{ countryMeta?.country || '-' }}</dd>
          </div>
          <div>
            <dt>Country name</dt>
            <dd>{{ countryName || '-' }}</dd>
          </div>
          <div>
            <dt>Calling code</dt>
            <dd>{{ countryMeta?.callingCode || '-' }}</dd>
          </div>
        </dl>
      </section>

      <section id="flag" class="demo-flag-example" aria-label="Country flag example">
        <h2>With country flag</h2>

        <label class="demo-field">
          <span>Phone</span>
          <PhoneMaskInput
            v-model="phoneWithFlag"
            show-country-flag
            :flag-url-resolver="demoFlagUrlResolver"
          />
        </label>

        <dl class="demo-meta">
          <div>
            <dt>Value</dt>
            <dd>{{ phoneWithFlag || '-' }}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>{{ countryWithFlagMeta?.country || '-' }}</dd>
          </div>
          <div>
            <dt>Country name</dt>
            <dd>{{ countryWithFlagName || '-' }}</dd>
          </div>
        </dl>
      </section>

      <section
        id="selector"
        class="demo-country-selector-example"
        aria-label="Country selector example"
      >
        <h2>Country selector</h2>

        <label class="demo-field">
          <span>Phone</span>
          <PhoneMaskInput
            v-model="phoneWithCountrySelector"
            v-model:country="selectorCountry"
            default-country="US"
            show-country-selector
            :flag-url-resolver="demoFlagUrlResolver"
            aria-label="Phone"
          />
        </label>

        <dl class="demo-meta">
          <div>
            <dt>Value</dt>
            <dd>{{ phoneWithCountrySelector || '-' }}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>{{ selectorCountry || '-' }}</dd>
          </div>
          <div>
            <dt>Country name</dt>
            <dd>{{ countrySelectorName || '-' }}</dd>
          </div>
          <div>
            <dt>Calling code</dt>
            <dd>{{ countrySelectorMeta?.callingCode || '-' }}</dd>
          </div>
        </dl>
      </section>

      <section
        id="custom-option"
        class="demo-country-selector-example"
        aria-label="Custom country option example"
      >
        <h2>Custom country option</h2>

        <label class="demo-field">
          <span>Phone</span>
          <PhoneMaskInput
            v-model="phoneWithCustomCountrySelector"
            v-model:country="customSelectorCountry"
            default-country="FR"
            show-country-selector
            aria-label="Phone"
          >
            <template #countryOption="{ option }">
              <span class="demo-country-option-code">{{ option.country }}</span>
              <span class="demo-country-option-name">{{ option.name }}</span>
              <span class="demo-country-option-dial">+{{ option.callingCode }}</span>
            </template>
          </PhoneMaskInput>
        </label>

        <dl class="demo-meta">
          <div>
            <dt>Value</dt>
            <dd>{{ phoneWithCustomCountrySelector || '-' }}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>{{ customSelectorCountry || '-' }}</dd>
          </div>
          <div>
            <dt>Country name</dt>
            <dd>{{ customCountrySelectorName || '-' }}</dd>
          </div>
        </dl>
      </section>

      <section
        id="country-model"
        class="demo-country-model-example"
        aria-label="Country model example"
      >
        <h2>Default country and country model</h2>

        <label class="demo-field">
          <span>Phone</span>
          <PhoneMaskInput
            v-model="phoneWithCountryModel"
            v-model:country="selectedCountry"
            default-country="RU"
            show-country-flag
          />
        </label>

        <dl class="demo-meta">
          <div>
            <dt>Value</dt>
            <dd>{{ phoneWithCountryModel || '-' }}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>{{ selectedCountry || '-' }}</dd>
          </div>
          <div>
            <dt>Country name</dt>
            <dd>{{ selectedCountryName || '-' }}</dd>
          </div>
        </dl>
      </section>

      <section id="validation" class="demo-validation-example" aria-label="Validation example">
        <h2>Validation</h2>

        <label class="demo-field">
          <span>Phone</span>
          <PhoneMaskInput
            v-model="phoneWithValidation"
            :invalid="validationInvalid"
            @blur="validationTouched = true"
            @change:validation="validationMeta = $event"
          />
        </label>

        <dl class="demo-meta">
          <div>
            <dt>Value</dt>
            <dd>{{ phoneWithValidation || '-' }}</dd>
          </div>
          <div>
            <dt>Possible</dt>
            <dd>{{ validationMeta?.isPossible ?? '-' }}</dd>
          </div>
          <div>
            <dt>Valid</dt>
            <dd>{{ validationMeta?.isValid ?? '-' }}</dd>
          </div>
          <div>
            <dt>Complete</dt>
            <dd>{{ validationMeta?.isComplete ?? '-' }}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>{{ validationMeta?.country || '-' }}</dd>
          </div>
        </dl>
      </section>

      <section id="formats" class="demo-format-example" aria-label="Model format example">
        <h2>Model formats</h2>

        <label class="demo-field">
          <span>Digits model</span>
          <PhoneMaskInput v-model="phoneDigitsFormat" :model-format="digitsFormat" />
        </label>

        <dl class="demo-meta">
          <div>
            <dt>Value</dt>
            <dd>{{ phoneDigitsFormat || '-' }}</dd>
          </div>
        </dl>

        <label class="demo-field">
          <span>National model</span>
          <PhoneMaskInput
            v-model="phoneNationalFormat"
            v-model:country="nationalFormatCountry"
            :model-format="nationalFormat"
            default-country="CZ"
          />
        </label>

        <dl class="demo-meta">
          <div>
            <dt>Value</dt>
            <dd>{{ phoneNationalFormat || '-' }}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>{{ nationalFormatCountry || '-' }}</dd>
          </div>
        </dl>
      </section>

      <section id="readonly" class="demo-readonly-example" aria-label="Readonly example">
        <h2>Readonly</h2>

        <label class="demo-field">
          <span>Phone</span>
          <PhoneMaskInput v-model="phoneReadonly" readonly />
        </label>

        <dl class="demo-meta">
          <div>
            <dt>Value</dt>
            <dd>{{ phoneReadonly || '-' }}</dd>
          </div>
        </dl>
      </section>

      <section
        id="allowed-countries"
        class="demo-restricted-example"
        aria-label="Allowed countries example"
      >
        <h2>Only +7 countries</h2>

        <label class="demo-field">
          <span>Phone</span>
          <PhoneMaskInput v-model="phoneOnlySeven" :allowed-countries="['RU', 'KZ']" />
        </label>

        <dl class="demo-meta">
          <div>
            <dt>Value</dt>
            <dd>{{ phoneOnlySeven || '-' }}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>{{ countryOnlySevenMeta?.country || '-' }}</dd>
          </div>
          <div>
            <dt>Country name</dt>
            <dd>{{ countryOnlySevenName || '-' }}</dd>
          </div>
          <div>
            <dt>Calling code</dt>
            <dd>{{ countryOnlySevenMeta?.callingCode || '-' }}</dd>
          </div>
        </dl>
      </section>

      <section id="problematic" class="demo-examples" aria-label="Problematic masks">
        <h2>Problematic examples</h2>

        <label class="demo-field">
          <span>Phone</span>
          <PhoneMaskInput v-model="phoneProblematic" />
        </label>

        <dl class="demo-meta">
          <div>
            <dt>Value</dt>
            <dd>{{ phoneProblematic || '-' }}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>{{ countryProblematicMeta?.country || '-' }}</dd>
          </div>
          <div>
            <dt>Country name</dt>
            <dd>{{ countryProblematicName || '-' }}</dd>
          </div>
          <div>
            <dt>Calling code</dt>
            <dd>{{ countryProblematicMeta?.callingCode || '-' }}</dd>
          </div>
        </dl>

        <div class="demo-example-list">
          <button
            v-for="example in demoExamples"
            :key="example.value"
            class="demo-example"
            type="button"
            @click="setExample(example.value)"
          >
            <span>{{ example.label }}</span>
            <strong>{{ example.value }}</strong>
            <small>{{ example.note }}</small>
          </button>
        </div>
      </section>

      <section id="author" class="demo-author" aria-label="Author">
        <h2>Author</h2>

        <dl class="demo-meta">
          <div>
            <dt>Telegram</dt>
            <dd>
              <a href="https://t.me/Raferty" target="_blank" rel="noreferrer">
                @Raferty
              </a>
            </dd>
          </div>
        </dl>
      </section>
    </section>
  </main>
</template>

<style scoped>
.demo-field {
  display: grid;
  gap: 6px;
}

.demo-field span {
  color: #334155;
  font-size: 14px;
  line-height: 1.3;
}
</style>
