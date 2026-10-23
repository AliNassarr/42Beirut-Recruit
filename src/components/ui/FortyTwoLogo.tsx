import React from "react";
import { PrintCVLogo } from "./PrintCVLogo";

export { PrintCVLogo };

// Compliance alias: renders PrintCVLogo instead of legacy polygon
export function FortyTwoLogo(props: { className?: string }) {
  return <PrintCVLogo {...props} />;
}
