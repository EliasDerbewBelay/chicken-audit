import React, { ReactNode } from "react";

interface PageHeaderProps {
  title: string;          // translated
  subtitle?: string;      // e.g. the date, or month total
  action?: ReactNode;     // e.g. an "Export" button — owner only
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <>
      {/* Mobile dark header band breakout */}
      <div className="md:hidden bg-sidebar-bg -mx-4 px-4 py-5 mb-5 flex items-center justify-between shadow-md">
        <div className="min-w-0">
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-sidebar-fg/70 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0 ml-3">{action}</div>}
      </div>

      {/* Desktop horizontal layout */}
      <div className="hidden md:flex items-center justify-between pb-5 border-b border-border mb-6">
        <div className="min-w-0">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0 ml-4">{action}</div>}
      </div>
    </>
  );
}
