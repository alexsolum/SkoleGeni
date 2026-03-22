import { forwardRef } from "react";
import clsx from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", ...props },
  ref
) {
  const base =
    "h-11 px-4 rounded-[4px] border transition-colors flex items-center justify-center font-heading font-bold text-sm";
  const styles =
    variant === "primary"
      ? "bg-primary text-surface border-primary hover:bg-[#0b1224]"
      : "bg-surface text-primary border-muted hover:bg-[#f1f5f9]";

  return <button ref={ref} className={clsx(base, styles, className)} {...props} />;
});

