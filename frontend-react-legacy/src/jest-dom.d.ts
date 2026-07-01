// Trae las matchers de jest-dom (toBeInTheDocument, etc.) al sistema de tipos
// de Vitest. El import en runtime vive en `vitest.setup.js`, pero `tsc` no
// type-chequea archivos `.js` (checkJs:false), así que la augmentación de tipos
// se referencia aquí para que `expect(...).toBeInTheDocument()` tipe en los tests.
import '@testing-library/jest-dom/vitest'
