import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';

export default tseslint.config(
  { ignores: ['dist'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  unicorn.configs.recommended,

  {
    linterOptions: {
      noInlineConfig: true,
    },

    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
