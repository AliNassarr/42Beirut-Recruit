import React from "react";

export function FortyTwoLogo({ className = "w-8 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 550 400"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="42 Logo"
    >
      {/* Digit 4 */}
      <polygon points="200,0 300,0 100,200 300,200 300,400 200,400 200,300 0,300 0,200" />
      {/* Digit 2 - Top Left Triangle */}
      <polygon points="350,0 450,0 350,100" />
      {/* Digit 2 - Main Z Stencil Body */}
      <polygon points="450,0 550,0 550,100 450,200 450,300 350,300 350,200 450,100" />
      {/* Digit 2 - Bottom Right Triangle */}
      <polygon points="550,200 550,300 450,300" />
    </svg>
  );
}
