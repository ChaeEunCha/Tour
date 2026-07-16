import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
}

export function Input({
  label,
  helperText,
  error,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label htmlFor={inputId} className="text-[12.5px] font-semibold text-text">
        {label}
      </label>
      <input
        id={inputId}
        className={`font-sans text-[14.5px] px-3.5 py-2.5 rounded-lg border-[1.5px] bg-bg text-text outline-none focus:border-accent ${
          error ? "border-similar-fg" : "border-border"
        } ${className}`}
        {...props}
      />
      {(error || helperText) && (
        <span
          className={`text-[11.5px] ${error ? "text-similar-fg" : "text-text-muted"}`}
        >
          {error ?? helperText}
        </span>
      )}
    </div>
  );
}
