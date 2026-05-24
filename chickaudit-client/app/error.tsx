"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. Please try again or return to the dashboard.
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => reset()}>
          Try again
        </Button>
        <Button type="button" onClick={() => (window.location.href = "/dashboard")}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
