# TanStack Query (Angular) — GenOVA conventions

**Language:** English (skill reference). Sources: TanStack Query v5 Angular docs
(`injectQuery` / `injectMutation` / `provideTanStackQuery`) + GenOVA
`app.config.ts` / feature stores.

Package: `@tanstack/angular-query-experimental` (Angular adapter; APIs are stable
enough for GenOVA production use).

## Why GenOVA uses it

**Server state** (API lists, detail payloads, catalogs) belongs in TanStack Query —
not ad-hoc `signal()` caches, not manual `Map` memoization, not reinvented
`BehaviorSubject` stores for GET data.

Local UI state (modals open, selected tab, draft form model) stays in `signal()`.

## App wiring

Configured in `frontend/src/app/app.config.ts`:

```ts
provideTanStackQuery(
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // GenOVA default
        retry: 1,
      },
    },
  }),
)
```

- Zoneless-friendly: query results are signals (`query.data()`, `query.status()`).
- In unit tests: provide a fresh `QueryClient` with `retry: false`, call
  `queryClient.clear()` in `afterEach` (TanStack testing guide). Do **not**
  enable Devtools in TestBed (slows tests).

## Canonical patterns

### injectQuery (reactive keys)

```ts
filter = signal('')

ovasQuery = injectQuery(() => ({
  queryKey: ['ovas', this.filter()],
  queryFn: () => this.ovaService.list(this.filter()),
  enabled: true, // or !!this.filter() when the key must be non-empty
}))
```

- `injectQuery(() => ({...}))` — factory so Angular re-tracks signals inside.
- Put **every** input that changes the response into `queryKey`.
- Prefer GenOVA `apiFetch` inside services called from `queryFn`, not raw
  `HttpClient` (see [http-and-cookies.md](http-and-cookies.md)).

### injectMutation + invalidate

```ts
queryClient = inject(QueryClient)

saveMutation = injectMutation(() => ({
  mutationFn: (body: Draft) => this.svc.save(body),
  onSuccess: () => {
    this.queryClient.invalidateQueries({ queryKey: ['ovas'] })
  },
}))
```

After writes: invalidate the affected keys; don't manually patch caches unless
there is a measured UX need (optimistic update) and a test.

### Pagination / placeholder

When paging lists, TanStack recommends `placeholderData: keepPreviousData` (or
the current v5 equivalent) so the UI does not flash empty while the next page
loads. Prefetch the next page in an `effect()` when `hasMore` is true.

## GenOVA rules

| Do | Don't |
|---|---|
| `injectQuery` / `injectMutation` in components or feature services | `HttpClient.get` + local `signal` cache for server lists |
| Stable, hierarchical `queryKey` arrays | String-only keys without params |
| Invalidate on mutation success | Forget invalidation → stale UI |
| Read `query.data()` / `isPending()` / `isError()` in templates | Assume zone.js will refresh the view |
| Keep `staleTime` intentional (default 30s) | `staleTime: 0` everywhere "just in case" |

## Testing checklist

1. `provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false }}}))`
2. `afterEach(() => queryClient.clear())`
3. Prefer Testing Library + fake `queryFn` / mocked feature service

## Related

- Local UI signals: [components-and-state.md](components-and-state.md)
- Forms (client model, not server cache): [signal-forms.md](signal-forms.md)
- HTTP entrypoint: [http-and-cookies.md](http-and-cookies.md)
