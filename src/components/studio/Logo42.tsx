import React from "react";

interface Logo42Props {
  className?: string;
  size?: number;
}

/**
 * Official 42 Network / 42 School geometric stencil SVG logo.
 */
export function Logo42({ className = "w-6 h-6", size = 24 }: Logo42Props) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={`fill-current ${className}`}
    >
      <title>42</title>
      <path d="M19.581 16.851H24v-4.439ZM24 3.574h-4.419v4.42l-4.419 4.418v4.44h4.419v-4.44L24 7.993Zm-4.419 0h-4.419v4.42zm-6.324 8.838H4.419l8.838-8.838H8.838L0 12.412v3.595h8.838v4.419h4.419z" />
    </svg>
  );
}
