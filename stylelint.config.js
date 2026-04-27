export default {
  extends: ['stylelint-config-standard', 'stylelint-config-standard-vue'],
  ignoreFiles: [
    'dist/**',
    'dist-pages/**',
    'node_modules/**',
    'playwright-report/**',
    'test-results/**',
    'coverage/**',
  ],
  rules: {
    'color-hex-length': 'long',
    'media-feature-range-notation': 'prefix',
    'selector-class-pattern': null,
  },
};
