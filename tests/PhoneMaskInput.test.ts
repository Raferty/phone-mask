import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import PhoneMaskInput from '../src/components/PhoneMaskInput.vue';

function getInput(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('input[type="tel"]');
}

async function insertText(input: ReturnType<typeof getInput>, text: string): Promise<void> {
  const element = input.element as HTMLInputElement;

  for (const character of text) {
    const position = element.selectionStart ?? element.value.length;

    element.setSelectionRange(position, position);
    element.dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: character,
        inputType: 'insertText',
      }),
    );

    await nextTick();
  }
}

async function pasteText(input: ReturnType<typeof getInput>, text: string): Promise<void> {
  const clipboardData = {
    getData: () => text,
  } as DataTransfer;
  const event = new Event('paste', {
    bubbles: true,
    cancelable: true,
  });

  Object.defineProperty(event, 'clipboardData', {
    value: clipboardData,
  });

  input.element.dispatchEvent(event);
  await nextTick();
}

async function pressBackspace(input: ReturnType<typeof getInput>): Promise<void> {
  input.element.dispatchEvent(
    new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'deleteContentBackward',
    }),
  );

  await nextTick();
}

function lastModelValue(wrapper: ReturnType<typeof mount>): string {
  const events = wrapper.emitted('update:modelValue');
  const lastEvent = events?.at(-1);

  return String(lastEvent?.[0] ?? '');
}

describe('PhoneMaskInput', () => {
  it('formats Czech input and backspaces through mask characters without phantom digits', async () => {
    const wrapper = mount(PhoneMaskInput);
    const input = getInput(wrapper);

    await insertText(input, '420601123456');

    expect(input.element.value).toBe('+420 601 123 456');
    expect(lastModelValue(wrapper)).toBe('+420601123456');

    for (let index = 0; index < 7; index += 1) {
      await pressBackspace(input);
    }

    expect(lastModelValue(wrapper)).toBe('+42060');
    expect(input.element.value).toBe('+420 60_ ___ ___');
  });

  it('ignores letters and unsupported symbols', async () => {
    const wrapper = mount(PhoneMaskInput);
    const input = getInput(wrapper);

    await insertText(input, '223abc2323ыы!!');

    expect(lastModelValue(wrapper)).toBe('+2232323');
    expect(input.element.value).toContain('+223');
    expect(input.element.value).not.toContain('abc');
    expect(input.element.value).not.toContain('ы');
  });

  it('keeps emitted model and visible value in sync after country length limit', async () => {
    const wrapper = mount(PhoneMaskInput);
    const input = getInput(wrapper);

    await insertText(input, '212312321312232');

    expect(lastModelValue(wrapper)).toBe('+212312321312');
    expect(input.element.value).toBe('+212 3 12 32 13 12');
  });

  it('blocks input outside allowed countries', async () => {
    const wrapper = mount(PhoneMaskInput, {
      props: {
        allowedCountries: ['RU', 'KZ'],
      },
    });
    const input = getInput(wrapper);

    await insertText(input, '4');

    expect(input.element.value).toBe('');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();

    await insertText(input, '77501234567');

    expect(lastModelValue(wrapper)).toBe('+77501234567');
    expect(wrapper.emitted('update:country')?.at(-1)?.[0]).toBe('KZ');
  });

  it('uses defaultCountry and prevents inserting before its calling code', async () => {
    const wrapper = mount(PhoneMaskInput, {
      props: {
        defaultCountry: 'RU',
      },
    });
    const input = getInput(wrapper);

    expect(input.element.value).toBe('+7 ___ ___ __ __');

    input.element.setSelectionRange(1, 1);
    await insertText(input, '4');

    expect(lastModelValue(wrapper)).toBe('+74');
    expect(input.element.value).toBe('+7 4__ ___ __ __');
  });

  it('selects a country from the built-in selector', async () => {
    const wrapper = mount(PhoneMaskInput, {
      props: {
        showCountrySelector: true,
        defaultCountry: 'US',
        allowedCountries: ['US', 'CZ'],
      },
    });

    await wrapper.get('.phone-mask-input__country-selector-button').trigger('click');
    await wrapper.get('.phone-mask-input__country-selector-search').setValue('Czech');
    await wrapper.get('.phone-mask-input__country-selector-option').trigger('click');

    expect(lastModelValue(wrapper)).toBe('+420');
    expect(wrapper.emitted('update:country')?.at(-1)?.[0]).toBe('CZ');
    expect(getInput(wrapper).element.value).toBe('+420 ___ ___ ___');
  });

  it('renders localized selector text props', async () => {
    const wrapper = mount(PhoneMaskInput, {
      props: {
        showCountrySelector: true,
        countrySelectorLabel: 'Страна',
        countrySelectorAriaLabel: 'Выбрать страну',
        countrySearchPlaceholder: 'Поиск страны',
        noCountriesText: 'Страны не найдены',
      },
    });

    expect(wrapper.get('.phone-mask-input__country-selector-button').text()).toBe('Страна');
    expect(wrapper.get('.phone-mask-input__country-selector-button').attributes('aria-label')).toBe(
      'Выбрать страну',
    );

    await wrapper.get('.phone-mask-input__country-selector-button').trigger('click');
    await wrapper.get('.phone-mask-input__country-selector-search').setValue('zzzzzzzz');

    expect(
      wrapper.get('.phone-mask-input__country-selector-search').attributes('placeholder'),
    ).toBe('Поиск страны');
    expect(wrapper.get('.phone-mask-input__country-selector-empty').text()).toBe(
      'Страны не найдены',
    );
  });

  it('does not edit readonly input', async () => {
    const wrapper = mount(PhoneMaskInput, {
      props: {
        modelValue: '+420601123456',
        readonly: true,
      },
    });
    const input = getInput(wrapper);

    await insertText(input, '7');
    await pasteText(input, '123');
    await pressBackspace(input);

    expect(input.element.value).toBe('+420 601 123 456');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('works with parent v-model and model format changes', async () => {
    const Consumer = defineComponent({
      components: { PhoneMaskInput },
      setup() {
        const phone = ref('');

        return { phone };
      },
      template: '<PhoneMaskInput v-model="phone" model-format="digits" />',
    });
    const wrapper = mount(Consumer);
    const input = getInput(wrapper);

    await insertText(input, '420601123456');

    expect(wrapper.vm.phone).toBe('420601123456');
    expect(input.element.value).toBe('+420 601 123 456');
  });
});
