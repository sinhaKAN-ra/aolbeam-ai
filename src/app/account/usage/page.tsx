"use client";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionStatus } from "@/components/usage/SubscriptionStatus";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function UsagePage() {
  const { user, isLoading } = useAuth();
  if (isLoading)
    return (
      <div className="page-shell">
        <Loader2
          aria-label="Loading usage"
          className="h-5 w-5 animate-spin text-primary"
        />
      </div>
    );
  return (
    <div className="page-shell mx-auto max-w-5xl">
      <Link
        href="/profile"
        className="mb-7 flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-3 w-3" />
        Your account
      </Link>
      <header className="mb-8">
        <p className="eyebrow mb-3">Room to keep learning</p>
        <h1 className="section-title">Your study allowance.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          See how much room you have to learn and practice today.
        </p>
      </header>
      {user ? (
        <SubscriptionStatus detailedView />
      ) : (
        <div className="rounded-2xl border bg-card p-8">
          <p className="mb-5 text-sm text-muted-foreground">
            Sign in to see your account’s usage.
          </p>
          <Button asChild>
            <Link href="/login?redirect=/account/usage">Sign in</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
