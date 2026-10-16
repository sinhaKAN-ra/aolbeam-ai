import { ArrowUpRight, Building2, Mail, MessageSquare } from "lucide-react";
import Link from "next/link";
export const metadata = {
  title: "Let’s talk | Aolbeam",
  description:
    "Get help, share feedback, or talk about bringing Aolbeam to your institution.",
};
export default function ContactPage() {
  return (
    <div>
      <header className="mb-10 border-b pb-10">
        <p className="eyebrow mb-5">A conversation starts here</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">
          We’re all ears<span className="text-primary">.</span>
        </h1>
        <p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground">
          A question, a fresh idea, or something that could work better? We’d
          like to hear it.
        </p>
      </header>
      <div className="grid gap-5 sm:grid-cols-2">
        {[
          {
            icon: MessageSquare,
            title: "Help & feedback",
            text: "Stuck on something? Found a rough edge? Tell us what happened and we’ll take a look.",
            subject: "Aolbeam support",
          },
          {
            icon: Building2,
            title: "Institutes & educators",
            text: "Interested in using Aolbeam with your students? Let’s talk about what you have in mind.",
            subject: "Institute enquiry",
          },
        ].map((item) => (
          <a
            key={item.title}
            href={`mailto:aolbeam@outlook.com?subject=${encodeURIComponent(item.subject)}`}
            className="group rounded-2xl border bg-card p-7 transition-all hover:-translate-y-0.5 hover:border-primary/40"
          >
            <div className="mb-6 flex justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <h2 className="text-xl font-semibold">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {item.text}
            </p>
            <span className="mt-6 inline-block text-xs font-medium text-primary">
              aolbeam@outlook.com
            </span>
          </a>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-dashed p-6">
        <h2 className="text-sm font-semibold">A few details go a long way.</h2>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          For a technical issue, include the page you were on, what you
          expected, and what happened. Please leave out passwords and payment
          details.
        </p>
      </div>
      <Link
        href="/"
        className="mt-10 inline-block text-xs font-medium text-primary hover:underline"
      >
        ← Back to your workspace
      </Link>
    </div>
  );
}
