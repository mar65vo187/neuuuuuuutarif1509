import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "light" | "whatsapp" | "dark";
type Size = "sm" | "md" | "lg";

const base =
  "group/btn relative inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-[transform,background,color,box-shadow,border-color] duration-200 ease-premium select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985]";

const variants: Record<Variant, string> = {
  primary:
    "bg-electric text-white shadow-[0_10px_30px_-10px_rgba(79,141,255,0.8)] hover:-translate-y-0.5 hover:bg-electric-deep hover:shadow-[0_14px_40px_-10px_rgba(79,141,255,0.9)]",
  secondary:
    "border border-white/15 bg-white/5 text-white backdrop-blur hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10",
  ghost: "text-white/80 hover:bg-white/8 hover:text-white",
  light: "bg-white text-ink shadow-[0_10px_30px_-12px_rgba(6,11,22,0.4)] hover:-translate-y-0.5 hover:bg-paper",
  dark: "bg-ink text-white shadow-[0_10px_30px_-12px_rgba(6,11,22,0.5)] hover:-translate-y-0.5 hover:bg-ink-800",
  whatsapp:
    "bg-[#25D366] text-ink-900 shadow-[0_10px_30px_-12px_rgba(37,211,102,0.7)] hover:-translate-y-0.5 hover:bg-[#1fc15b]",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-[13.5px]",
  md: "h-12 px-6 text-[15px]",
  lg: "h-14 px-8 text-[16px]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  magnetic?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
};

type LinkProps = CommonProps & {
  href: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
};

type NativeButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    href?: undefined;
  };

export function Button(props: LinkProps | NativeButtonProps) {
  const {
    variant = "primary",
    size = "md",
    className = "",
    children,
    icon,
    iconRight,
  } = props;

  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  const inner = (
    <>
      {icon && <span className="shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]">{icon}</span>}
      <span>{children}</span>
      {iconRight && (
        <span className="shrink-0 transition-transform duration-200 ease-premium group-hover/btn:translate-x-0.5 [&>svg]:h-[18px] [&>svg]:w-[18px]">
          {iconRight}
        </span>
      )}
    </>
  );

  if ("href" in props && props.href) {
    const { href, target, rel, onClick } = props;
    const external = href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:");
    if (external) {
      return (
        <a
          href={href}
          target={target}
          rel={rel ?? (target === "_blank" ? "noopener noreferrer" : undefined)}
          className={cls}
          onClick={onClick}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link
        href={href}
        target={target}
        rel={rel ?? (target === "_blank" ? "noopener noreferrer" : undefined)}
        className={cls}
        onClick={onClick}
      >
        {inner}
      </Link>
    );
  }

  const {
    href: _href,
    variant: _variant,
    size: _size,
    className: _className,
    magnetic: _magnetic,
    icon: _icon,
    iconRight: _iconRight,
    ...buttonProps
  } = props as NativeButtonProps;
  void _href; void _variant; void _size; void _className; void _magnetic; void _icon; void _iconRight;

  return (
    <button className={cls} {...buttonProps}>
      {inner}
    </button>
  );
}
