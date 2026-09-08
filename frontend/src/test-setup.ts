/**
 * Setup global para las unitarias (Vitest + jsdom).
 *
 * Bajo Node 25 + jsdom 28 + el builder `@angular/build:unit-test`, el
 * `localStorage` que llega al test es un objeto plano sin métodos
 * (`clear`/`getItem`/`setItem`…) o una instancia de `Storage` cuyo backend
 * (`--localstorage-file`) no está configurado y lanza al usarse. Eso rompe
 * cualquier servicio que persista preferencias (ThemeService,
 * CrearOvaTourService, etc.).
 *
 * Aquí instalamos una implementación en memoria conforme a la Web Storage API,
 * con los métodos en `Storage.prototype`, de modo que:
 *
 *  - el código de producción funciona igual que en el navegador, y
 *  - los specs que hacen `vi.spyOn(Storage.prototype, "getItem")` siguen
 *    interceptando las llamadas reales de `localStorage`.
 */

class MemoryStorage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function define(target: object, name: string, value: unknown): void {
  Object.defineProperty(target, name, { value, configurable: true, writable: true });
}

// `Storage` global unificado: su prototype es el que espían los specs.
define(globalThis, "Storage", MemoryStorage);
if (typeof window !== "undefined" && window !== (globalThis as unknown)) {
  define(window, "Storage", MemoryStorage);
}

for (const name of ["localStorage", "sessionStorage"] as const) {
  const instance = new MemoryStorage();
  define(globalThis, name, instance);
  if (typeof window !== "undefined" && window !== (globalThis as unknown)) {
    define(window, name, instance);
  }
}
