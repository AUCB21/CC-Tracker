export type LabelTag = "span" | "h2" | "h3" | "label";

/** Eyebrow-style label recipe (uppercase, tracked-out, muted) used for form
 *  field labels and small section headings. `as` picks the element so it can
 *  double as a real <label htmlFor> or a heading. */
export function Label({
  children,
  as = "span",
  className = "",
  htmlFor,
  ...rest
}: {
  children: React.ReactNode;
  as?: LabelTag;
  className?: string;
  htmlFor?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "className">) {
  const Tag = as as React.ElementType;
  return (
    <Tag
      htmlFor={as === "label" ? htmlFor : undefined}
      className={`text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const FIELD_CLASS =
  "w-full rounded-md border border-line bg-panel2 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none disabled:opacity-60";

/** Matches the modal input recipe duplicated across task-edit-modal,
 *  rename-entity-button and delete-confirm-modal. */
export function Input({
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${FIELD_CLASS} ${className}`} {...rest} />;
}

export function Textarea({
  className = "",
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${FIELD_CLASS} ${className}`} {...rest} />;
}
