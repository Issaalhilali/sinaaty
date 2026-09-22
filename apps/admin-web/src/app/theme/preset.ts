import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** PrimeNG بهوية صناعية: أخضر الختم هو اللون الأول، والزوايا زوايا البطاقة. الرموز من docs/design/sinaaty-ui-v2.html. */
export const SinaatyPreset = definePreset(Aura, {
  primitive: { borderRadius: { none: '0', xs: '6px', sm: '8px', md: '12px', lg: '16px', xl: '20px' } },
  semantic: {
    primary: { 50: '#EAF4F0', 100: '#DCEFE6', 200: '#B9DFCF', 300: '#8CCBB2', 400: '#3FBF95', 500: '#0E6B54', 600: '#0C5C48', 700: '#0A4F3E', 800: '#083A2E', 900: '#062C23', 950: '#041D17' },
    colorScheme: {
      light: {
        primary: { color: '{primary.500}', contrastColor: '#ffffff', hoverColor: '{primary.600}', activeColor: '{primary.700}' },
        surface: { 0: '#ffffff', 50: '#F7F9F7', 100: '#F1F4F2', 200: '#E1E7E3', 300: '#C9D4CE', 400: '#9EAAA4', 500: '#6B7A74', 600: '#3B4A45', 700: '#2B3733', 800: '#1B2521', 900: '#0F1C18', 950: '#0A1310' },
        formField: { borderColor: '#E1E7E3', focusBorderColor: '{primary.500}', hoverBorderColor: '#C9D4CE' },
      },
    },
  },
});
