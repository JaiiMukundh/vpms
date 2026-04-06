"use client";

export default function FormField({
  field,
  value,
  error,
  options = [],
  onChange,
  placeholder,
}) {
  const baseClass =
    "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10";

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{field.label}</span>
      {field.type === "textarea" ? (
        <textarea
          name={field.name}
          value={value}
          onChange={onChange}
          placeholder={placeholder || field.label}
          rows={4}
          className={baseClass}
        />
      ) : field.type === "select" ? (
        <select name={field.name} value={value} onChange={onChange} className={baseClass}>
          <option value="">{`Select ${field.label}`}</option>
          {options.map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={field.name}
          type={field.type}
          value={value}
          onChange={onChange}
          placeholder={placeholder || field.label}
          step={field.step}
          min={field.min}
          className={baseClass}
        />
      )}
      {error ? <p className="mt-2 text-xs font-medium text-rose-600">{error}</p> : null}
    </label>
  );
}

