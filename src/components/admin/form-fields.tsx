// Plain Server Components — admin CRUD forms submit via Server Actions
// (native <form action={...}>), so no client-side state is needed just to
// render an input. Keeps every entity's admin form free of boilerplate
// useState wiring.
const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary";

type FieldProps = {
  name: string;
  label: string;
  required?: boolean;
};

export function TextField({
  name,
  label,
  defaultValue,
  type = "text",
  required,
  placeholder,
}: FieldProps & {
  defaultValue?: string | number;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className={INPUT_CLASS}
      />
    </div>
  );
}

export function TextAreaField({
  name,
  label,
  defaultValue,
  required,
  rows = 4,
}: FieldProps & { defaultValue?: string; rows?: number }) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        rows={rows}
        className={`${INPUT_CLASS} resize-none`}
      />
    </div>
  );
}

export function SelectField({
  name,
  label,
  defaultValue,
  options,
  required,
}: FieldProps & {
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className={INPUT_CLASS}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CheckboxField({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label
      htmlFor={name}
      className="flex items-center gap-2 text-sm font-medium"
    >
      <input
        id={name}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="border-border bg-surface h-4 w-4 rounded accent-[var(--color-primary)]"
      />
      {label}
    </label>
  );
}
