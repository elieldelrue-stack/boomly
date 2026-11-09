"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { deleteAccountAction } from "@/lib/actions/account";
import { useFormAction } from "@/components/ui/useFormAction";
import { Alert, Button, Field, Input } from "@/components/ui/form";
import type { FormState } from "@/lib/types";

export function DeleteAccount() {
  const t = useTranslations("Account");
  const te = useTranslations("Errors");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [state, submit, pending] = useFormAction<FormState>(deleteAccountAction, {});

  if (!open)
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)} className="text-red-700">
        {t("deleteOpen")}
      </Button>
    );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <Alert>{t("deleteWarning")}</Alert>
      {state.error && <Alert>{te(state.error)}</Alert>}
      <Field label={t("deleteConfirmLabel")} htmlFor="confirm" error={state.fieldErrors?.confirm && te(state.fieldErrors.confirm)}>
        <Input id="confirm" name="confirm" autoComplete="off" autoCapitalize="characters" placeholder={t("deleteWord")} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "…" : t("deleteConfirm")}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
