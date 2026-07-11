import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  href?: string;
  target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
  rel?: AnchorHTMLAttributes<HTMLAnchorElement>["rel"];
}

const BASE =
  "inline-flex items-center justify-center gap-2 border border-black px-6 py-3 font-mono text-sm font-semibold uppercase tracking-widest transition-transform duration-150 ease-out shadow-brutal-sm hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutal active:translate-x-0 active:translate-y-0 active:shadow-none disabled:pointer-events-none disabled:opacity-30";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-black text-white",
  ghost: "bg-white text-black",
};

export function Button({
  variant = "primary",
  href,
  target,
  rel,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} target={target} rel={rel} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
