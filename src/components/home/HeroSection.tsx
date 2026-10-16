"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  MessageSquare,
  Route,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const HeroSection = ({
  scrollToProblemGenerator,
}: {
  scrollToProblemGenerator: () => void;
}) => {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0];
  return (
    <section className="page-shell pb-3 lg:pb-4" id="home">
      <div className="mb-7 flex items-center justify-between">
        <p className="eyebrow">A fresh page. A little progress.</p>
        <span className="hidden text-xs text-muted-foreground sm:block">
          Your personal learning workspace
        </span>
      </div>
      <div className="relative grid overflow-hidden rounded-[28px] border border-primary/10 bg-primary/[0.055] md:grid-cols-[1.15fr_1fr]">
        <div className="relative z-10 px-7 py-10 sm:p-10 lg:p-12">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/70 px-3 py-1.5 text-[11px] font-medium text-primary">
            <Sparkles className="h-3 w-3" /> A little curiosity goes a long way
          </div>
          <h1 className="max-w-lg text-4xl font-semibold leading-[1.13] tracking-[-0.055em] sm:text-5xl lg:text-[54px]">
            {firstName ? (
              `Your next chapter, ${firstName}.`
            ) : (
              <>
                Big ambitions.
                <br />
                Small, steady steps.
              </>
            )}
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground sm:text-[15px]">
            Understand the tricky bits. Practice until it clicks. Build a path
            that takes you from “where do I start?” to “I’ve got this.”
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" onClick={scrollToProblemGenerator}>
              Let’s practice <ArrowRight />
            </Button>
            <Button variant="outline" size="lg" asChild className="bg-card/60">
              <Link href="/learning-paths">Build my learning path</Link>
            </Button>
          </div>
          <p className="mt-5 text-[11px] text-muted-foreground">
            At your pace. Around your goals.
          </p>
        </div>
        <div
          className="relative hidden min-h-[360px] items-center justify-center overflow-hidden md:flex"
          aria-hidden="true"
        >
          <div className="absolute h-80 w-80 rounded-full border border-primary/10" />
          <div className="absolute h-60 w-60 rounded-full border border-primary/10" />
          <div className="absolute h-40 w-40 rounded-full bg-primary/[0.04]" />
          <div className="relative w-[275px] rounded-2xl border border-border/60 bg-card p-5 shadow-[0_20px_60px_-25px_hsl(var(--primary)/.25)] motion-safe:animate-[drift_8s_ease-in-out_infinite]">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                One step at a time
              </span>
              <Route className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Your next breakthrough</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              A path made just for you
            </p>
            <div className="my-5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/3 rounded-full bg-primary" />
            </div>
            {[
              "Understand the foundations",
              "Put ideas into practice",
              "Make the knowledge yours",
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-3 py-3">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] ${index === 0 ? "bg-primary text-primary-foreground" : "border bg-background text-muted-foreground"}`}
                >
                  {index === 0 ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    `0${index + 1}`
                  )}
                </span>
                <span
                  className={`text-xs ${index === 2 ? "text-muted-foreground" : "font-medium"}`}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
          <div className="absolute bottom-10 right-6 flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-xs shadow-sm lg:right-10">
            <span className="h-2 w-2 rounded-full bg-primary" /> A clearer way
            forward <Sparkles className="h-3 w-3 text-primary" />
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          {
            title: "Talk it through",
            detail: "Your patient, always-ready AI tutor.",
            icon: MessageSquare,
            href: "/chat/new",
            tint: "bg-primary/10 text-primary",
          },
          {
            title: "Make it click",
            detail: "Questions that meet you at your level.",
            icon: BookOpen,
            href: "#generate",
            tint: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
          },
          {
            title: "Find your direction",
            detail: "A clear route from goal to understanding.",
            icon: Route,
            href: "/learning-paths",
            tint: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
          },
        ].map((item, i) => (
          <Link
            key={item.title}
            href={item.href}
            onClick={
              item.href === "#generate"
                ? (event) => {
                    event.preventDefault();
                    scrollToProblemGenerator();
                  }
                : undefined
            }
            className={`animate-rise stagger-${i + 1} group flex items-center gap-4 rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.tint}`}
            >
              <item.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">{item.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.detail}
              </p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </section>
  );
};
