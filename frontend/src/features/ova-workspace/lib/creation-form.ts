export const EXAMPLE_PROMPT = 'Tema: Aprendizaje supervisado y no supervisado en machine learning.\nObjetivos: Distinguir ambos paradigmas, describir algoritmos representativos (regresión lineal, árboles, k-means) y plantear un caso de aplicación con datos tabulares.\nNivel educativo: Universitario (pregrado en Ingeniería / Ciencia de Datos).';

export function canCreate(prompt: string, phases: number, busy: boolean): boolean {
  return prompt.trim().length >= 10 && phases >= 2 && !busy;
}
