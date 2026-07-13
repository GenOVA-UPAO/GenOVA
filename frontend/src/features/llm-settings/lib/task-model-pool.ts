/** Pool = enabled catalog ∩ apt for task (multimodal may appear in several). */
export function modelsForTask<T extends { aptitudes?: string[]; category?: string }>(
  models: T[],
  task: string,
): T[] {
  return models.filter((m) => {
    const apt = m.aptitudes;
    if (Array.isArray(apt) && apt.length > 0) return apt.includes(task);
    // Fallback: category match when aptitudes absent (older catalog rows).
    return (m.category || "") === task;
  });
}
