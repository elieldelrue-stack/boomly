"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * Comme useActionState, mais sans vider le formulaire après envoi :
 * en cas d'erreur, les champs saisis restent remplis.
 */
export function useFormAction<S extends object>(
  action: (prev: Awaited<S>, data: FormData) => Promise<S>,
  initial: Awaited<S>,
) {
  const [state, dispatch, pending] = useActionState<S, FormData>(action, initial);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Inclut le bouton cliqué (ex. « Valider » ou « Refuser »).
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(data));
  }
  return [state, onSubmit, pending] as const;
}
