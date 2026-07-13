# Components and state — GenOVA's actual conventions

Based on patterns observed in `frontend/src/app/layout/components/navbar.component.ts`,
`frontend/src/core/auth/auth.service.ts`, `frontend/src/app/app.config.ts`.

## Components

- **Standalone** always — never `NgModule`.
- Explicit `changeDetection: ChangeDetectionStrategy.OnPush` on every component.
- **Zoneless** — the project uses `provideZonelessChangeDetection()` in
  `app.config.ts`; don't assume zone.js is running, don't rely on implicit
  change detection outside signals/events.
- `imports: [...]` inline in the decorator; external `templateUrl` (not inline
  except trivial components).
- Selector with prefix **`gn-`** (`gn-navbar`, `gn-checkbox`, etc.) — consistent
  with the rest of the app.
- DI via **`inject()`**, never constructor DI for dependencies
  (`private router = inject(Router)`, not `constructor(private router: Router)`).
  The constructor is reserved for explicit side-effect logic when needed.
- View queries with `viewChild()` (signal query), not the `@ViewChild` decorator.
- External DOM events via `@HostListener` where appropriate (e.g. click-outside).

## State

- **Signals** for all local state: `signal()`, `computed()` for derived values.
- State exposed to outside consumers via `.asReadonly()` — never expose the
  raw `WritableSignal` outside the service/component that owns it.
- **Server state** (data coming from the API) via **TanStack Query**
  (`@tanstack/angular-query-experimental`, configured in `app.config.ts` with
  `staleTime: 30s`, `retry: 1`) — don't reinvent manual caching for this.
  Full patterns: [tanstack-query.md](tanstack-query.md).
- Services: `@Injectable({ providedIn: 'root' })`, expose read-only signals
  + methods that mutate the internal signal. Dedupe in-flight promises where
  applicable (pattern seen in `auth.service.ts`).

## HTTP

- A single entry point: `core/lib/http.ts` (`apiFetch`), which already handles
  `credentials: 'include'` for the JWT's httpOnly cookies.
  Details: [http-and-cookies.md](http-and-cookies.md).
- Angular's `provideHttpClient()` is only used for point integrations (e.g.
  Sentry) — the app's normal API flow does **not** go through `HttpClient`, it
  goes through `apiFetch`.

## What NOT to do

- Don't use React-style hooks (they don't exist in Angular, but don't mentally
  replicate the pattern either — use signals/computed/effect).
- Don't use classic `@ViewChild`/`@Input`/`@Output` decorators in new code —
  use the signal variants (`viewChild`, `input`, `output`) unless the file
  already uses the classic pattern consistently.
- Don't put fetch logic inside a component — always in a `service`.
