import { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-[#fff9f6] hover:bg-primary-hover",
  secondary:
    "bg-transparent text-accent border-[1.5px] border-accent hover:bg-accent-soft",
};

export function Button({
  variant = "primary",
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold transition-colors ${
        disabled
          ? "bg-border text-[#a99c90] cursor-not-allowed"
          : variantClasses[variant]
      } ${className}`}
      {...props}
    />
  );
}
