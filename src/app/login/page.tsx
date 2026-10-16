"use client";
import { useAppRouter } from "@/hooks/useAppRouter";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Check,
  GraduationCap,
  Loader2,
  Route,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

function LoginContent() {
  const params = useSearchParams();
  const router = useAppRouter();
  const { user, isLoading, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requested = params?.get("redirect") || params?.get("redirectTo") || "/";
  const redirect =
    requested.startsWith("/") &&
    !requested.startsWith("//") &&
    !requested.startsWith("/login")
      ? requested
      : "/";
  useEffect(() => {
    if (!isLoading && user) router.replace(redirect);
  }, [isLoading, user, router, redirect]);
  const signIn = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not sign in. Please try again.",
      );
      setBusy(false);
    }
  };
  return (
    <div className="page-shell flex min-h-[calc(100dvh-10rem)] items-center justify-center">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[28px] border bg-card md:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden border-r bg-primary/[0.06] p-10 md:flex">
          <div>
            <span className="brand-mark mb-8">
              <GraduationCap />
            </span>
            <p className="eyebrow mb-4">Good to have you here</p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">
              A space to grow
              <br />
              into your goals.
            </h1>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              Bring your questions, your ambitions, and your “I don’t get it
              yet.” We’ll take it from there.
            </p>
          </div>
          <div className="mt-10 space-y-4">
            {[
              "Your own patient AI tutor",
              "A learning path made for you",
              "Progress that picks up where you left off",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3 text-xs">
                <Check className="h-4 w-4 text-primary" />
                {text}
              </div>
            ))}
          </div>
          <span className="absolute -bottom-10 -right-10 h-44 w-44 rounded-full border border-primary/10" />
        </div>
        <div className="flex flex-col justify-center p-7 sm:p-10">
          <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <h2 className="text-2xl font-semibold">
            Your next chapter starts here.
          </h2>
          <p className="mb-8 mt-3 text-sm leading-6 text-muted-foreground">
            Sign in to save your learning, track your progress, and keep moving
            forward.
          </p>
          <Button
            onClick={signIn}
            disabled={busy || isLoading || !!user}
            className="h-12 w-full"
            variant="outline"
          >
            {busy || isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M44 24.5c0-1.4-.1-2.7-.4-4H24v7.6h11.2a9.6 9.6 0 01-4.1 6.3v5.2h6.7C41.7 36 44 30.8 44 24.5z"
                />
                <path
                  fill="#34A853"
                  d="M24 45c5.6 0 10.3-1.9 13.8-5.1l-6.7-5.2C29.2 36 26.8 36.8 24 36.8c-5.4 0-10-3.7-11.6-8.7H5.5v5.4A20.8 20.8 0 0024 45z"
                />
                <path
                  fill="#FBBC05"
                  d="M12.4 28.1a12.5 12.5 0 010-8.2v-5.4H5.5a21 21 0 000 19z"
                />
                <path
                  fill="#EA4335"
                  d="M24 11.2c3 0 5.7 1 7.8 3l5.9-5.9A20 20 0 0024 3 20.8 20.8 0 005.5 14.5l6.9 5.4c1.6-5 6.2-8.7 11.6-8.7z"
                />
              </svg>
            )}
            {busy ? "Opening Google…" : "Continue with Google"}
          </Button>
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
          <p className="mt-6 text-center text-[11px] leading-6 text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link
              className="underline underline-offset-2"
              href="/terms-of-service"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              className="underline underline-offset-2"
              href="/privacy-policy"
            >
              Privacy Policy
            </Link>
            .
          </p>
          <Link
            href="/"
            className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary"
          >
            Explore the practice studio
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
