import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function PageLoader({ className, ...props }: PageLoaderProps) {
  return (
    <div className={cn("flex items-center justify-center", className)} {...props}>
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}
