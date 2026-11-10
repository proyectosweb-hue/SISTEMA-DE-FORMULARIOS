import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-500 disabled:hover:bg-brand-600",
  secondary:
    "border-[1.5px] border-brand-600 bg-white text-brand-600 hover:bg-brand-50 disabled:hover:bg-white",
  ghost: "text-brand-600 hover:bg-brand-100",
};

/** Clases de un botón; sirve también para estilizar enlaces (`<Link className={buttonClasses()}>`). */
export function buttonClasses(variant: Variant = "primary", className = "") {
  return `${BASE} ${VARIANTS[variant]} ${className}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
