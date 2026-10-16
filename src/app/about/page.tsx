import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  Terminal,
  Database,
  MessageSquare,
  Route,
} from "lucide-react";
import { Button } from "@/components/ui/button";
export const metadata = {
  title: "A little clarity, a lot of possibility | Aolbeam",
  alternates: { canonical: "/about" },
  description:
    "Learn about Aolbeam AI: practice questions, tutor explanations and personal learning paths across maths, science, languages, humanities, business and coding.",
};
export default function AboutPage() {
  return (
    <div>
      <header className="mb-12 border-b pb-10">
        <p className="eyebrow mb-5">The idea behind Aolbeam</p>
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
          Learning should feel like
          <br />
          <span className="text-primary">a way forward.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground">
          Sometimes all it takes is a clearer explanation, the right question,
          or knowing what to do next. That’s what we’re here for.
        </p>
      </header>
      <section className="mb-12 grid gap-7 sm:grid-cols-[160px_1fr]">
        <h2 className="text-sm font-semibold">Why we started</h2>
        <div className="space-y-5 text-sm leading-7 text-muted-foreground">
          <p>
            Working hard doesn’t always mean knowing where to focus. Students
            can understand a concept in class and still feel stuck when an
            unfamiliar problem appears in an exam.
          </p>
          <p>
            Aolbeam helps connect understanding with application. Ask your AI
            tutor to explain a difficult idea, practice a problem at your level,
            and build a learning path that gives your study time some direction.
            Explore maths, science, languages, humanities, business and coding in
            our <Link href="/practice" className="text-primary underline">guide to practice across subjects</Link>.
          </p>
        </div>
      </section>
      <section className="mb-12 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: MessageSquare,
            title: "Understand it",
            text: "A patient tutor that makes room for your follow-up questions.",
          },
          {
            icon: BookOpen,
            title: "Put it to work",
            text: "Practice questions and feedback that help you see what to improve.",
          },
          {
            icon: Route,
            title: "Keep moving",
            text: "A personal course with clear modules and progress you can return to.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border bg-card p-6">
            <item.icon className="mb-5 h-5 w-5 text-primary" />
            <h2 className="mb-3 text-base font-semibold">{item.title}</h2>
            <p className="text-xs leading-6 text-muted-foreground">
              {item.text}
            </p>
          </div>
        ))}
      </section>
      <section aria-labelledby="explore-projects" className="mb-12 space-y-5">
        <div>
          <p className="eyebrow mb-3">More from Aolbeam</p>
          <h2 id="explore-projects" className="text-2xl font-semibold">Explore our other projects</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Tools for curious builders, from asking better questions to understanding database queries.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { name: "Ask", href: "https://ask.aolbeam.com", domain: "ask.aolbeam.com", icon: Terminal, description: "Ask questions, inspect code and search the web from your terminal with a lightweight Python CLI." },
            { name: "Anumana", href: "https://anumana.aolbeam.com", domain: "anumana.aolbeam.com", icon: Database, description: "Understand database query plans and estimated costs before running queries, with an MCP server for AI tools." },
          ].map(project => (
            <a key={project.name} href={project.href} target="_blank" rel="noopener noreferrer"
              className="group rounded-2xl border bg-card p-6 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <div className="mb-5 flex items-center justify-between">
                <project.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold group-hover:text-primary">{project.name}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{project.description}</p>
              <p className="mt-5 text-xs font-medium text-primary">{project.domain} <span className="sr-only">(opens in a new tab)</span></p>
            </a>
          ))}
        </div>
      </section>
      <section className="flex flex-wrap items-center gap-5 rounded-2xl border bg-primary/[0.04] p-7">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
          KS
        </span>
        <div className="flex-1">
          <p className="eyebrow mb-1">Built by</p>
          <h2 className="text-lg font-semibold">Karan Sinha</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Founder & full stack developer
          </p>
        </div>
        <a
          href="https://www.linkedin.com/in/sinhakan-ra/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-primary hover:underline"
        >
          Connect on LinkedIn ↗
        </a>
      </section>
      <div className="mt-12 flex flex-wrap items-center justify-between gap-5">
        <h2 className="text-xl font-semibold">One small step starts a lot.</h2>
        <Button asChild>
          <Link href="/">
            Find your starting point
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
