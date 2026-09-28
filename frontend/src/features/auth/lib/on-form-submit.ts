import type { SyntheticEvent } from "react";

export function onFormSubmit(submit: (formEl: HTMLFormElement) => Promise<void>) {
  return (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit(event.currentTarget);
  };
}

export type FormSubmitHandler = ReturnType<typeof onFormSubmit>;
