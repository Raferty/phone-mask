# phone-mask

Vue component scaffold for a phone input with country-aware formatting.

The component stores a normalized international value in `v-model`, for example
`+79771234567`, while the visible input value is formatted as a phone mask.

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { PhoneMaskInput } from 'phone-mask';
import 'phone-mask/style.css';

const phone = ref('');
</script>

<template>
  <PhoneMaskInput v-model="phone" @change:country="console.log" />
</template>
```

## Default Formatting

By default the component follows `libphonenumber-js` international formatting.
No country has a built-in custom visual mask.

Examples:

```text
+79771234567  -> +7 977 123 45 67
+77501234567  -> +7 750 123 4567
+14155550123  -> +1 415 555 0123
+420601123456 -> +420 601 123 456
```

This means countries such as Russia, Kazakhstan, the USA, Canada, and Czechia are
formatted according to the library rules unless you explicitly override their
display mask.

## Custom Country Masks

Use the `countryMasks` prop when a specific country needs a custom display mask.
Keys are ISO 3166-1 alpha-2 country codes from `libphonenumber-js`. The `_`
character marks editable national-number digit slots. Digits in the country
calling code, such as `+7` or `+1`, are treated as fixed mask text.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { PhoneMaskInput, type PhoneMaskByCountry } from 'phone-mask';

const phone = ref('');

const countryMasks: PhoneMaskByCountry = {
  RU: '+7 (___) ___-__-__',
  KZ: '+7 (___) ___-__-__',
  US: '+1 (___) ___-____',
  CA: '+1 (___) ___-____',
};
</script>

<template>
  <PhoneMaskInput v-model="phone" :country-masks="countryMasks" />
</template>
```

With the custom masks above:

```text
+79771234567 -> +7 (977) 123-45-67
+77501234567 -> +7 (750) 123-45-67
+14155550123 -> +1 (415) 555-0123
```

Countries not listed in `countryMasks` continue to use strict
`libphonenumber-js` formatting.

## Country Detection

The component detects the country from the entered international digits.

For shared country calling codes, detection may stay unresolved until enough
digits are entered:

```text
+7    -> country: null, possibleCountries: RU, KZ
+7750 -> country: KZ
+7977 -> country: RU
```

The same idea applies to shared `+1` NANP countries. The component uses
`libphonenumber-js` to refine the country as the national part becomes
recognizable.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `modelValue` | `string` | `''` | Normalized phone value used by `v-model`. |
| `country` | `PhoneCountryCode \| null` | `null` | Country value used by `v-model:country`. |
| `defaultCountry` | `PhoneCountryCode \| null` | `null` | Initial country used when `modelValue` is empty. |
| `id` | `string` | `undefined` | Forwarded to the input. |
| `name` | `string` | `'phone'` | Forwarded to the input. |
| `disabled` | `boolean` | `false` | Disables the input. |
| `readonly` | `boolean` | `false` | Makes the input focusable/copyable but not editable. |
| `invalid` | `boolean` | `false` | Applies invalid visual/ARIA state. |
| `modelFormat` | `PhoneModelFormat` | `'e164'` | Controls the format emitted through `v-model`. |
| `placeholder` | `string` | `+_ (___) ___-__-__` | Placeholder shown before any digits are entered. |
| `countryMasks` | `PhoneMaskByCountry` | `{}` | Optional display mask overrides by country code. |
| `allowedCountries` | `PhoneAllowedCountries` | `[]` | Optional list of allowed ISO country codes. Empty means all countries are allowed. |
| `showCountryFlag` | `boolean` | `false` | Controls rendering of the country flag slot/default country flag. |
| `showCountrySelector` | `boolean` | `false` | Renders the built-in country selector before the input. |
| `flagUrlResolver` | `PhoneFlagUrlResolver` | `undefined` | Overrides the default flag URL for static flags and the country selector. |
| `countryNameLocale` | `string \| string[]` | `'en'` | Locale passed to `Intl.DisplayNames` for country names in the selector. |
| `countrySelectorLabel` | `string` | `'Country'` | Text shown in the selector button before a country is visible. |
| `countrySelectorAriaLabel` | `string` | `'Select country'` | Accessible label for the selector button. |
| `countrySearchPlaceholder` | `string` | `'Search country'` | Placeholder and accessible label for the selector search input. |
| `noCountriesText` | `string` | `'No countries'` | Empty-state text shown when the selector search has no results. |

## HTML Attributes

The component forwards most extra HTML attributes to the internal `<input>`.
`class` and `style` are applied to the root `.phone-mask-input` wrapper so CSS
variables and layout classes work as expected.

```vue
<PhoneMaskInput
  v-model="phone"
  class="my-phone-input"
  aria-label="Phone"
  required
  aria-describedby="phone-error"
  data-testid="phone"
/>
```

In the example above:

- `class="my-phone-input"` is applied to the wrapper.
- `aria-label`, `required`, `aria-describedby`, and `data-testid` are applied to the input.

## Country Model

Use `defaultCountry` when the empty input should start from a specific country
calling code:

```vue
<PhoneMaskInput v-model="phone" default-country="RU" />
```

This starts the input from `+7`. If the country shares its calling code with
other countries, the explicit `defaultCountry` is still used as the selected
country until the typed digits prove another country.

Use `v-model:country` when the parent form needs to store or control the country
separately:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { PhoneMaskInput, type PhoneCountryCode } from 'phone-mask';

const phone = ref('');
const country = ref<PhoneCountryCode | null>('RU');
</script>

<template>
  <PhoneMaskInput v-model="phone" v-model:country="country" default-country="RU" />
</template>
```

When `country` changes externally and the current phone value does not belong to
that country, the component switches the input back to the selected country's
calling code. `allowedCountries` is respected: a `country` or `defaultCountry`
outside the allowed list is ignored.

## Country Selector

Set `showCountrySelector` when the user should be able to choose a country from
the component itself:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { PhoneMaskInput, type PhoneCountryCode } from 'phone-mask';

const phone = ref('');
const country = ref<PhoneCountryCode | null>('US');
</script>

<template>
  <PhoneMaskInput
    v-model="phone"
    v-model:country="country"
    default-country="US"
    show-country-selector
  />
</template>
```

The selector lists every `libphonenumber-js` country by default. If
`allowedCountries` is passed, the selector shows only those countries and input
is restricted to the same list:

```vue
<PhoneMaskInput
  v-model="phone"
  v-model:country="country"
  :allowed-countries="['RU', 'KZ']"
  show-country-selector
/>
```

Selecting a country changes the calling code and keeps the existing national
digits when they can be carried over. The input still formats strictly through
`libphonenumber-js` unless `countryMasks` contains an explicit visual override.

The built-in selector supports basic keyboard interaction:

- `ArrowDown` opens the selector from the country button and moves to the next
  country.
- `ArrowUp` moves to the previous country.
- `Home` and `End` jump to the first and last visible country.
- `Enter` selects the active country.
- `Escape` closes the selector.

Use `countryNameLocale` to localize the country names:

```vue
<PhoneMaskInput
  v-model="phone"
  show-country-selector
  country-name-locale="ru"
/>
```

For locale fallback chains, pass an array:

```vue
<PhoneMaskInput
  v-model="phone"
  show-country-selector
  :country-name-locale="['ru', 'en']"
/>
```

Selector UI text is controlled separately from country names:

```vue
<PhoneMaskInput
  v-model="phone"
  show-country-selector
  country-name-locale="ru"
  country-selector-label="Страна"
  country-selector-aria-label="Выбрать страну"
  country-search-placeholder="Поиск страны"
  no-countries-text="Страны не найдены"
  aria-label="Телефон"
/>
```

## Model Format

Use `modelFormat` to control the value emitted through `v-model`.

```ts
type PhoneModelFormat = 'e164' | 'digits' | 'international' | 'national';
```

Examples for `+420 601 123 456`:

```text
e164          -> +420601123456
digits        -> 420601123456
international -> +420 601 123 456
national      -> 601 123 456
```

```vue
<PhoneMaskInput v-model="phone" model-format="digits" />
```

`national` needs a country context. Pass `country`, `defaultCountry`, or use
`v-model:country`:

```vue
<PhoneMaskInput
  v-model="phone"
  v-model:country="country"
  model-format="national"
  default-country="CZ"
/>
```

Internally the component still works with normalized international digits.
`modelFormat` only changes how `modelValue` is parsed and emitted.

## Readonly

Use `readonly` when the user should be able to focus, select, and copy the phone
number without editing it:

```vue
<PhoneMaskInput v-model="phone" readonly />
```

Unlike `disabled`, readonly inputs remain focusable and are submitted with forms.

## Allowed Countries

Use `allowedCountries` to restrict input to specific countries. The component
blocks digit insertion and paste when the current digits can no longer resolve
to one of the allowed countries.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { PhoneMaskInput, type PhoneAllowedCountries } from 'phone-mask';

const phone = ref('');
const allowedCountries: PhoneAllowedCountries = ['RU', 'KZ'];
</script>

<template>
  <PhoneMaskInput v-model="phone" :allowed-countries="allowedCountries" />
</template>
```

For example, `['RU', 'KZ']` effectively restricts the input to `+7` numbers:

```text
7    -> allowed
77   -> allowed, can resolve to KZ
79   -> allowed, can resolve to RU
4    -> blocked
1201 -> blocked
```

The restriction works with shared calling codes too. While the exact country is
not known, input is allowed only if at least one possible country is in
`allowedCountries`.

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `update:modelValue` | `string` | Emits the normalized value, for example `+420601123456`. |
| `update:country` | `PhoneCountryCode \| null` | Emits the country value for `v-model:country`. |
| `change:country` | `PhoneCountryMeta` | Emits country metadata after input changes. |
| `change:validation` | `PhoneValidationMeta` | Emits phone validation metadata after input changes. |

`PhoneCountryMeta`:

```ts
type PhoneCountryMeta = {
  country: CountryCode | null;
  callingCode: string | null;
  isConfirmed: boolean;
  possibleCountries: CountryCode[];
};
```

`PhoneValidationMeta`:

```ts
type PhoneValidationMeta = {
  isPossible: boolean;
  isValid: boolean;
  isComplete: boolean;
  country: CountryCode | null;
  callingCode: string | null;
};
```

## Validation

The component can calculate validation metadata and emit it through
`change:validation`. It does not decide when an error should be shown. Use the
external `invalid` prop for visual and ARIA state.

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { PhoneMaskInput, type PhoneValidationMeta } from 'phone-mask';

const phone = ref('');
const touched = ref(false);
const validation = ref<PhoneValidationMeta | null>(null);

const phoneInvalid = computed(
  () => touched.value && Boolean(phone.value) && !validation.value?.isValid,
);
</script>

<template>
  <PhoneMaskInput
    v-model="phone"
    :invalid="phoneInvalid"
    @blur="touched = true"
    @change:validation="validation = $event"
  />
</template>
```

`invalid` adds `.phone-mask-input--invalid` to the wrapper and
`aria-invalid="true"` to the input. `isPossible` and `isValid` come from
`libphonenumber-js`; `isComplete` means the number reached the detected
country's expected example length.

## Slots

### `countryFlag`

When `showCountryFlag` is `true`, the component renders a country flag area
before the input. By default it shows the detected country's SVG flag. The
default flag URL is based on the ISO country code:

```text
https://flagcdn.com/{country}.svg
```

Use `flagUrlResolver` to change where flag images come from:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { PhoneMaskInput, type PhoneFlagUrlResolver } from 'phone-mask';

const phone = ref('');
const flagUrlResolver: PhoneFlagUrlResolver = (country) =>
  `/assets/flags/${country.toLowerCase()}.svg`;
</script>

<template>
  <PhoneMaskInput
    v-model="phone"
    show-country-flag
    :flag-url-resolver="flagUrlResolver"
  />
</template>
```

`flagUrlResolver` is also used by `showCountrySelector`, so both static flag
mode and the built-in selector can share the same asset pipeline.

If a flag URL fails to load, the component shows a small country-code fallback
instead of the browser's broken image icon.

If the country is not detected yet, the flag area is not rendered. The flag is
disabled by default. Set `showCountryFlag` to `true` to enable it:

```vue
<PhoneMaskInput v-model="phone" show-country-flag />
```

Override the `countryFlag` slot when you need custom flag rendering or a country
button:

```vue
<PhoneMaskInput v-model="phone" show-country-flag>
  <template #countryFlag="{ country, countryMeta }">
    <button type="button" class="country-button">
      {{ country ?? 'Select' }}
    </button>
  </template>
</PhoneMaskInput>
```

When `showCountrySelector` is enabled, the component renders its built-in
selector instead of the `countryFlag` slot.

Slot props:

| Prop | Type | Description |
| --- | --- | --- |
| `country` | `CountryCode \| null` | Detected ISO country code. |
| `countryMeta` | `PhoneCountryMeta` | Full country detection metadata. |

### `countryOption`

When `showCountrySelector` is `true`, override the `countryOption` slot to
customize each row in the dropdown:

```vue
<PhoneMaskInput v-model="phone" show-country-selector>
  <template #countryOption="{ option, active, selected }">
    <span>{{ option.country }}</span>
    <span>
      {{ option.name }}
      <small v-if="active">active</small>
      <small v-else-if="selected">selected</small>
    </span>
    <span>+{{ option.callingCode }}</span>
  </template>
</PhoneMaskInput>
```

Slot props:

| Prop | Type | Description |
| --- | --- | --- |
| `option.country` | `CountryCode` | ISO country code. |
| `option.name` | `string` | Localized country name. |
| `option.callingCode` | `string` | Country calling code without `+`. |
| `option.flagUrl` | `string` | Resolved flag URL, or an empty string after a load error. |
| `active` | `boolean` | Whether the row is the current keyboard active option. |
| `selected` | `boolean` | Whether the row matches the currently visible country. |

## Input Behavior

- Letters and unsupported symbols are ignored.
- Paste input is normalized to digits.
- The stored value is limited by the detected country's example number length,
  falling back to the E.164 maximum of 15 digits.
- `Backspace` and `Delete` remove real digits even when the cursor is next to
  mask characters such as spaces, parentheses, dashes, or `_`.
- `readonly` prevents editing while still allowing focus, selection, and copy.
- While the country calling code is incomplete, the component does not force a
  country mask. For example `+42` stays `+42` instead of becoming `+420 ___ ___ ___`.

## SSR And Nuxt

The component is SSR-safe and can be imported in Nuxt pages/components without a
client-only wrapper:

```vue
<script setup lang="ts">
import { PhoneMaskInput } from 'phone-mask';

const phone = ref('');
</script>

<template>
  <PhoneMaskInput v-model="phone" show-country-selector />
</template>
```

Browser APIs are used only after mount. The component guards document listeners,
click-outside checks, and country-name formatting fallbacks so server rendering
does not require `window`, `document`, or `Node`.

Keep `flagUrlResolver` SSR-safe when possible: prefer returning a plain URL from
the country code. If a resolver throws during SSR or on the client, the component
falls back to the default `flagcdn.com` URL.

This repository also includes a Nuxt consumer smoke test:

```bash
npm run consumer:smoke:nuxt
```

The smoke test builds the library, creates a temporary Nuxt app, installs the
local package through `file:`, imports `PhoneMaskInput` and `phone-mask/style.css`,
builds Nuxt, starts the SSR server, and checks that the rendered HTML contains
the component markup.

## Styling

The component can be styled from the outside with CSS variables:

```css
.my-phone-input {
  --phone-mask-input-border-color: #94a3b8;
  --phone-mask-input-focus-border-color: #16a34a;
  --phone-mask-input-focus-box-shadow: 0 0 0 3px rgb(22 163 74 / 16%);
  --phone-mask-input-border-radius: 8px;
  --phone-mask-input-padding: 12px 14px;
  --phone-mask-input-color: #111827;
  --phone-mask-input-placeholder-color: #9ca3af;
}
```

```vue
<PhoneMaskInput v-model="phone" class="my-phone-input" />
```

Available variables:

| Variable | Default |
| --- | --- |
| `--phone-mask-input-gap` | `6px` |
| `--phone-mask-input-width` | `100%` |
| `--phone-mask-input-border-width` | `1px` |
| `--phone-mask-input-border-color` | `#cbd5e1` |
| `--phone-mask-input-border-radius` | `4px` |
| `--phone-mask-input-padding` | `8px 12px` |
| `--phone-mask-input-background` | `#ffffff` |
| `--phone-mask-input-focus-border-color` | `#2563eb` |
| `--phone-mask-input-focus-box-shadow` | `0 0 0 3px rgb(37 99 235 / 16%)` |
| `--phone-mask-input-disabled-background` | `#f8fafc` |
| `--phone-mask-input-disabled-color` | `#64748b` |
| `--phone-mask-input-readonly-background` | `#f8fafc` |
| `--phone-mask-input-readonly-color` | `#64748b` |
| `--phone-mask-input-readonly-cursor` | `default` |
| `--phone-mask-input-invalid-border-color` | `#dc2626` |
| `--phone-mask-input-invalid-box-shadow` | `none` |
| `--phone-mask-input-invalid-focus-border-color` | `#dc2626` |
| `--phone-mask-input-invalid-focus-box-shadow` | `0 0 0 3px rgb(220 38 38 / 16%)` |
| `--phone-mask-input-color` | `#0f172a` |
| `--phone-mask-input-font` | `inherit` |
| `--phone-mask-input-font-size` | `inherit` |
| `--phone-mask-input-font-weight` | `inherit` |
| `--phone-mask-input-line-height` | `1.4` |
| `--phone-mask-input-letter-spacing` | `inherit` |
| `--phone-mask-input-caret-color` | `currentColor` |
| `--phone-mask-input-placeholder-color` | `#94a3b8` |
| `--phone-mask-input-placeholder-opacity` | `1` |
| `--phone-mask-input-outline` | `none` |
| `--phone-mask-input-transition-duration` | `120ms` |
| `--phone-mask-input-transition-easing` | `ease` |
| `--phone-mask-input-country-flag-min-width` | `0` |
| `--phone-mask-input-country-flag-color` | `currentColor` |
| `--phone-mask-input-flag-width` | `24px` |
| `--phone-mask-input-flag-height` | `18px` |
| `--phone-mask-input-flag-border-radius` | `2px` |
| `--phone-mask-input-flag-box-shadow` | `0 0 0 1px rgb(15 23 42 / 10%)` |
| `--phone-mask-input-flag-fallback-color` | `#475569` |
| `--phone-mask-input-flag-fallback-font-size` | `10px` |
| `--phone-mask-input-flag-fallback-font-weight` | `600` |
| `--phone-mask-input-flag-fallback-background` | `#f1f5f9` |
| `--phone-mask-input-country-selector-button-gap` | `6px` |
| `--phone-mask-input-country-selector-button-padding` | `2px 4px` |
| `--phone-mask-input-country-selector-button-color` | `inherit` |
| `--phone-mask-input-country-selector-button-background` | `transparent` |
| `--phone-mask-input-country-selector-code-font-size` | `0.875em` |
| `--phone-mask-input-country-selector-menu-width` | `280px` |
| `--phone-mask-input-country-selector-menu-max-width` | `min(80vw, 320px)` |
| `--phone-mask-input-country-selector-menu-border-color` | `#cbd5e1` |
| `--phone-mask-input-country-selector-menu-border-radius` | `6px` |
| `--phone-mask-input-country-selector-menu-background` | `#ffffff` |
| `--phone-mask-input-country-selector-menu-box-shadow` | `0 16px 32px rgb(15 23 42 / 14%)` |
| `--phone-mask-input-country-selector-menu-z-index` | `20` |
| `--phone-mask-input-country-selector-search-border-color` | `#cbd5e1` |
| `--phone-mask-input-country-selector-search-border-radius` | `4px` |
| `--phone-mask-input-country-selector-search-padding` | `8px 10px` |
| `--phone-mask-input-country-selector-list-max-height` | `240px` |
| `--phone-mask-input-country-selector-option-grid-template-columns` | `auto minmax(0, 1fr) auto` |
| `--phone-mask-input-country-selector-option-align-items` | `center` |
| `--phone-mask-input-country-selector-option-min-height` | `40px` |
| `--phone-mask-input-country-selector-option-gap` | `8px` |
| `--phone-mask-input-country-selector-option-border-radius` | `4px` |
| `--phone-mask-input-country-selector-option-padding` | `8px` |
| `--phone-mask-input-country-selector-option-hover-background` | `#eff6ff` |
| `--phone-mask-input-country-selector-muted-color` | `#64748b` |

## Demo

```bash
npm run dev
```

Then open the URL printed by Vite, usually `http://localhost:5173/`.

## GitHub Pages

The demo can be deployed to GitHub Pages:

```bash
npm run build:pages
```

This builds the demo site into `dist-pages` with the `/phone-mask/` base path.

GitHub Actions deploys Pages automatically on pushes to `main`. In the GitHub
repository settings, set **Pages** source to **GitHub Actions**.

The published demo URL is:

```text
https://raferty.github.io/phone-mask/
```

If the repository name changes, update `base` in `vite.pages.config.ts` or set
`GITHUB_PAGES_BASE` in the workflow.

## Tests

```bash
npm run lint
```

Runs ESLint for Vue/TypeScript files and Stylelint for CSS and Vue SFC styles.

```bash
npm test
```

Runs TypeScript/Vue type checking and component tests.

```bash
npm run test:e2e
```

Runs the Playwright demo smoke test. It starts the Vite demo, types real phone
numbers, checks selector alignment, selects a localized country, and verifies
that deleting `+420 601 123 456` does not create phantom digits.

## Release Check

```bash
npm run release:check
```

Runs linting, the production build, type/component tests, Playwright demo smoke,
Nuxt consumer smoke against a packed tarball, and `npm run pack:dry-run`.

`prepack` also runs the production build automatically before manual `npm pack`.
`pack:dry-run` uses `--ignore-scripts` because `release:check` already builds
before checking the package contents.

## GitHub Release

GitHub Actions runs `npm run release:check` on pull requests and pushes to
`main`.

To create a GitHub Release, push a semver tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The release workflow runs the full release check, creates a package tarball, and
attaches the `.tgz` file to the GitHub Release.
