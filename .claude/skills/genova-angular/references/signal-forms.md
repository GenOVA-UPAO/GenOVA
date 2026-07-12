# Signal Forms in GenOVA

GenOVA uses **Signal Forms** (`@angular/forms/signals`, Angular 21+) as the only
form mechanism in new code — not classic Reactive Forms
(`FormGroup`/`FormControl`), not Template-driven forms.

For the full Angular API and details, see skill `angular-developer` →
`references/signal-forms.md` (if present in that skill) or `https://angular.dev`.
This reference covers the **concrete GenOVA pattern**.

## Real pattern (example: `frontend/src/features/auth/pages/login-page.ts`)

```ts
import { email, form, FormField, required, submit } from '@angular/forms/signals';

// model as a plain signal
protected readonly model = signal({ email: '', password: '' });

// form schema with validators
protected readonly loginForm = form(this.model, (p) => {
  required(p.email);
  email(p.email);
  required(p.password);
});
```

In the template:

```html
<input [formField]="loginForm.email" />
```

## Known gotchas (from a prior audit, memory `genova-angular-audit-fixes`)

- `[formField]` expects the **schema field** (`loginForm.email`), not the
  model signal directly (`model().email`) — confusing these is the most common error.
- `maxlength` and other native HTML attributes don't replace schema
  validation — if the field needs a length limit, declare it as a form
  validator too, not just as an HTML attribute.
- The timing of `input.required()` (required signal inputs) can clash with
  form initialization if the form is built before the required input is
  available — build the form at a point where required inputs are already
  resolved (or use `computed`/`effect` as appropriate).

## When it doesn't apply

Very simple single-field forms with no validation (e.g. a search box) can
keep using `signal()` + direct binding without going through Signal Forms — don't
force the full mechanism when it adds no value. When in doubt, if the form has
validation or ≥2 related fields, use Signal Forms.
