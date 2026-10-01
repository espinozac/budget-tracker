import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import type {
  CategorySuggestSource,
  Transaction,
  TransactionInput,
} from "@budget/shared";
import { ApiError, suggestCategory } from "../api";
import { todayLocal } from "../lib/format";
import {
  mapServerFieldErrors,
  parseTransactionInput,
  type FieldErrors,
  type FormValues,
} from "../lib/validation";

const CATEGORY_PRESETS = [
  "Food",
  "Salary",
  "Transport",
  "Rent",
  "Utilities",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Other",
] as const;

type TransactionFormProps = {
  categories: string[];
  /** When set, the form edits this row and saves with PUT. */
  editing: Transaction | null;
  /** Focus description on mount (after Edit or Add opens the form). */
  focusOnMount?: boolean;
  onSubmit: (input: TransactionInput) => Promise<void>;
  /** Dismiss add or edit and return focus to the Add button. */
  onCancel: () => void;
  isSubmitting: boolean;
  /** Announce async suggestion results in the page live region. */
  onAnnounce?: (message: string) => void;
};

function emptyForm(): FormValues {
  return {
    date: todayLocal(),
    description: "",
    amount: "",
    type: "expense",
    category: "",
  };
}

function valuesFromTransaction(tx: Transaction): FormValues {
  return {
    date: tx.date,
    description: tx.description,
    amount: String(tx.amount),
    type: tx.type,
    category: tx.category,
  };
}

function suggestionLabel(source: CategorySuggestSource): string | null {
  if (source === "history") {
    return "Suggested from your history";
  }
  if (source === "ai") {
    return "Suggested by AI";
  }
  return null;
}

/** Controlled add/edit form. Category tracks whether the user has typed in it.
 * Remount via key={editing?.id ?? "new"} so initial state comes from props.
 */
export function TransactionForm({
  categories,
  editing,
  focusOnMount = false,
  onSubmit,
  onCancel,
  isSubmitting,
  onAnnounce,
}: TransactionFormProps) {
  const formId = useId();
  const descriptionRef = useRef<HTMLInputElement>(null);
  const categoryTouchedRef = useRef(editing !== null);
  const categoryValueRef = useRef(
    editing !== null ? editing.category : "",
  );
  const descriptionValueRef = useRef(
    editing !== null ? editing.description : "",
  );
  const [values, setValues] = useState<FormValues>(() =>
    editing !== null ? valuesFromTransaction(editing) : emptyForm(),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [suggestionSource, setSuggestionSource] =
    useState<CategorySuggestSource | null>(null);

  const isEditing = editing !== null;

  const suggestMutation = useMutation({
    mutationFn: suggestCategory,
    onSuccess: (result, variables) => {
      if (result.source === "none") {
        return;
      }
      // Ignore stale replies after the description changed or the form reset.
      if (
        variables.description.trim().toLowerCase() !==
        descriptionValueRef.current.trim().toLowerCase()
      ) {
        return;
      }
      if (
        categoryTouchedRef.current ||
        categoryValueRef.current.trim() !== ""
      ) {
        return;
      }
      const suggested = result.category;
      categoryValueRef.current = suggested;
      setValues((prev) => ({ ...prev, category: suggested }));
      setSuggestionSource(result.source);
      const label = suggestionLabel(result.source);
      if (label !== null) {
        onAnnounce?.(`${label}: ${suggested}`);
      }
    },
  });

  useEffect(() => {
    if (focusOnMount) {
      descriptionRef.current?.focus();
    }
  }, [focusOnMount]);

  const datalistOptions = [
    ...new Set([...CATEGORY_PRESETS, ...categories]),
  ].sort((a, b) => a.localeCompare(b));

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (prev[key] === undefined) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleDescriptionBlur() {
    if (categoryTouchedRef.current || categoryValueRef.current.trim() !== "") {
      return;
    }
    const description = values.description.trim();
    if (description === "") {
      return;
    }
    suggestMutation.mutate({
      description: values.description,
      type: values.type,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = parseTransactionInput(values);
    if (!parsed.ok) {
      setFieldErrors(parsed.fieldErrors);
      return;
    }

    try {
      await onSubmit(parsed.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(mapServerFieldErrors(err.fieldErrors));
        setFormError(err.message);
        return;
      }
      setFormError(
        err instanceof Error ? err.message : "Could not save transaction",
      );
    }
  }

  function errorId(field: keyof FormValues): string {
    return `${formId}-${field}-error`;
  }

  function fieldInvalid(field: keyof FormValues): boolean {
    return (fieldErrors[field]?.length ?? 0) > 0;
  }

  const suggestionHint = suggestionSource
    ? suggestionLabel(suggestionSource)
    : null;
  const categoryDescribedBy = [
    fieldInvalid("category") ? errorId("category") : null,
    suggestionHint !== null ? `${formId}-category-suggestion` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      aria-labelledby={`${formId}-heading`}
      className="rounded-lg border border-slate-200 bg-white"
    >
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <h2
          id={`${formId}-heading`}
          className="text-lg font-bold text-slate-900"
        >
          {isEditing ? "Edit transaction" : "Add transaction"}
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 px-5 py-5 sm:px-6"
        noValidate
      >
        {formError !== null ? (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {formError}
          </p>
        ) : null}

        <div>
          <label
            htmlFor={`${formId}-description`}
            className="block text-sm font-bold text-slate-800"
          >
            Description
          </label>
          <input
            ref={descriptionRef}
            id={`${formId}-description`}
            name="description"
            type="text"
            autoComplete="off"
            value={values.description}
            onChange={(e) => {
              descriptionValueRef.current = e.target.value;
              setField("description", e.target.value);
            }}
            onBlur={handleDescriptionBlur}
            aria-invalid={fieldInvalid("description")}
            aria-describedby={
              fieldInvalid("description")
                ? errorId("description")
                : undefined
            }
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus-visible:border-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800"
          />
          {fieldInvalid("description") ? (
            <p
              id={errorId("description")}
              className="mt-1 text-sm text-red-700"
            >
              {fieldErrors.description?.[0]}
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${formId}-amount`}
              className="block text-sm font-bold text-slate-800"
            >
              Amount
            </label>
            <input
              id={`${formId}-amount`}
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={values.amount}
              onChange={(e) => setField("amount", e.target.value)}
              aria-invalid={fieldInvalid("amount")}
              aria-describedby={
                fieldInvalid("amount") ? errorId("amount") : undefined
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus-visible:border-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800"
            />
            {fieldInvalid("amount") ? (
              <p id={errorId("amount")} className="mt-1 text-sm text-red-700">
                {fieldErrors.amount?.[0]}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor={`${formId}-date`}
              className="block text-sm font-bold text-slate-800"
            >
              Date
            </label>
            <input
              id={`${formId}-date`}
              name="date"
              type="date"
              value={values.date}
              onChange={(e) => setField("date", e.target.value)}
              aria-invalid={fieldInvalid("date")}
              aria-describedby={
                fieldInvalid("date") ? errorId("date") : undefined
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus-visible:border-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800"
            />
            {fieldInvalid("date") ? (
              <p id={errorId("date")} className="mt-1 text-sm text-red-700">
                {fieldErrors.date?.[0]}
              </p>
            ) : null}
          </div>
        </div>

        <fieldset
          aria-describedby={
            fieldInvalid("type") ? errorId("type") : undefined
          }
        >
          <legend className="text-sm font-bold text-slate-800">Type</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-800">
              <input
                type="radio"
                name={`${formId}-type`}
                value="expense"
                checked={values.type === "expense"}
                onChange={() => setField("type", "expense")}
                aria-invalid={fieldInvalid("type")}
                className="size-4 accent-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800"
              />
              Expense
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-800">
              <input
                type="radio"
                name={`${formId}-type`}
                value="income"
                checked={values.type === "income"}
                onChange={() => setField("type", "income")}
                aria-invalid={fieldInvalid("type")}
                className="size-4 accent-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800"
              />
              Income
            </label>
          </div>
          {fieldInvalid("type") ? (
            <p id={errorId("type")} className="mt-1 text-sm text-red-700">
              {fieldErrors.type?.[0]}
            </p>
          ) : null}
        </fieldset>

        <div>
          <label
            htmlFor={`${formId}-category`}
            className="block text-sm font-bold text-slate-800"
          >
            Category
          </label>
          <input
            id={`${formId}-category`}
            name="category"
            type="text"
            list={`${formId}-category-list`}
            autoComplete="off"
            value={values.category}
            onChange={(e) => {
              categoryTouchedRef.current = true;
              categoryValueRef.current = e.target.value;
              setSuggestionSource(null);
              setField("category", e.target.value);
            }}
            aria-invalid={fieldInvalid("category")}
            aria-describedby={
              categoryDescribedBy !== "" ? categoryDescribedBy : undefined
            }
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus-visible:border-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800"
          />
          <datalist id={`${formId}-category-list`}>
            {datalistOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          {suggestionHint !== null ? (
            <p
              id={`${formId}-category-suggestion`}
              className="mt-1 text-sm text-slate-600"
            >
              {suggestionHint}
            </p>
          ) : null}
          {fieldInvalid("category") ? (
            <p id={errorId("category")} className="mt-1 text-sm text-red-700">
              {fieldErrors.category?.[0]}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          >
            {isSubmitting
              ? "Saving…"
              : isEditing
                ? "Save changes"
                : "Add transaction"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-navy-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
