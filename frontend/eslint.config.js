// ESLint flat config — frontend React+TS (paridad con perfumes-web:
// `npm run lint` en cada paquete).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: ['dist/', 'node_modules/'],
    }
);
