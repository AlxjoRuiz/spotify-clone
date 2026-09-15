// ESLint flat config único en raíz (estilo perfumes-web: eslint.config.mjs).
// index.js (backend CommonJS) con reglas JS; scripts/**/*.ts(x) con tipos.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                console: 'readonly',
                process: 'readonly',
                __dirname: 'readonly',
                module: 'readonly',
                require: 'readonly',
                URLSearchParams: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            // El backend es CommonJS a propósito (restricción del proyecto)
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    {
        ignores: ['dist/', 'node_modules/'],
    }
);
