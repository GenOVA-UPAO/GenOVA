// La primera línea es el tema sin etiqueta: el backend titula el OVA con el
// inicio del prompt. El nivel lo pone el selector de «Nivel educativo».
export const EXAMPLE_PROMPT =
  'Gestión del almacenamiento en Oracle: tablespaces y datafiles.\nObjetivos: distinguir la estructura lógica (tablespace, segmento, extent, bloque) de la física (datafiles), crear un tablespace y asignarlo a un usuario, y consultar su ocupación en DBA_DATA_FILES y DBA_SEGMENTS.';

export const MIN_PROMPT_LENGTH = 10;

export function canCreate(prompt: string, phases: number, busy: boolean): boolean {
  return prompt.trim().length >= MIN_PROMPT_LENGTH && phases >= 2 && !busy;
}
