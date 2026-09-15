// ESLint flat config — server en JS (CommonJS), sin TS.
// Mantiene el backend simple: node index.js directo.
const js = require('@eslint/js');

module.exports = [
    js.configs.recommended,
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
        },
    },
    {
        ignores: ['node_modules/', 'dist/'],
    },
];
