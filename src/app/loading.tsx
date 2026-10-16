import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingPage() {
  return (
    <div
      className="page-shell space-y-7"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Getting your workspace ready…
      </div>
      <Skeleton className="h-9 w-3/5 max-w-sm" />
      <Skeleton className="h-4 w-4/5 max-w-lg" />
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  );
}
