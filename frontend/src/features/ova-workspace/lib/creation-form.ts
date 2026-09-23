// La primera línea es el tema sin etiqueta: el backend titula el OVA con el
// inicio del prompt. El nivel lo pone el selector de «Nivel educativo».
export const EXAMPLE_PROMPT =
  'Aprendizaje supervisado y no supervisado en machine learning.\nObjetivos: distinguir ambos paradigmas, describir algoritmos representativos (regresión lineal, árboles, k-means) y plantear un caso de aplicación con datos tabulares.';

export const MIN_PROMPT_LENGTH = 10;

export function canCreate(prompt: string, phases: number, busy: boolean): boolean {
  return prompt.trim().length >= MIN_PROMPT_LENGTH && phases >= 2 && !busy;
}
