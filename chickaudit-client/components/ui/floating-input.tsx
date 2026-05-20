import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

export interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, value, placeholder, ...props }, ref) => {
    const hasValue = value !== undefined && value !== null && value !== "";

    return (
      <div className={cn("floating-label-group w-full", hasValue && "has-value")}>
        <Input
          className={cn("h-12 pt-4 pb-1 px-3 text-base placeholder:opacity-0 focus:placeholder:opacity-100 transition-opacity", className)}
          value={value}
          ref={ref}
          placeholder={placeholder || label}
          {...props}
        />
        <label className="floating-label">{label}</label>
      </div>
    );
  }
);
FloatingInput.displayName = "FloatingInput";

export { FloatingInput };
