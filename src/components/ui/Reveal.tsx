import { createElement, type CSSProperties, type ReactNode } from "react";

type RevealTag = "div" | "section" | "li" | "span" | "p" | "h1" | "h2" | "h3";

type RevealStyle = CSSProperties & {
  "--reveal-delay"?: string;
};

export const fadeUp = "fade-up";
export const fade = "fade";

export function Reveal({
  children,
  className = "",
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: RevealTag;
  once?: boolean;
  amount?: number;
  variants?: unknown;
}) {
  const style: RevealStyle = delay ? { "--reveal-delay": `${delay}s` } : {};
  return createElement(as, { className: `reveal-css ${className}`, style }, children);
}

export function Stagger({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  amount?: number;
}) {
  return <div className={`stagger-css ${className}`}>{children}</div>;
}

export function Item({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`reveal-item-css ${className}`}>{children}</div>;
}
