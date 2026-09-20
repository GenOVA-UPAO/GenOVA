import type { SyntheticEvent } from "react";

export function onFormSubmit(submit: () => Promise<void>) {
  return (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };
}

export type FormSubmitHandler = ReturnType<typeof onFormSubmit>;
