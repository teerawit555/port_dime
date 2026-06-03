import { clsx } from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline";
}

export default function Badge({
  children,
  className,
  variant = "default",
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-md text-[11px] font-medium border",
        variant === "outline" && "bg-transparent",
        className
      )}
    >
      {children}
    </span>
  );
}
