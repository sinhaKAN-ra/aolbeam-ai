
// src/components/Footer.tsx
"use client"; // Make it a client component to fetch user session

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Brain, FileText, ShieldCheck, DollarSign, Mail, Rss, Briefcase, Instagram, Linkedin as LinkedinIcon, InfoIcon as AboutIcon } from 'lucide-react';

// SVG Icon for Discord
const DiscordIconFooter = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className={className} viewBox="0 0 16 16">
  <title>Discord</title>
  <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
</svg>

);

// SVG Icon for Telegram
const TelegramIconFooter = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className={className}>
    <title>Telegram</title>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.032.192.032.283.001.085-.006.169-.021.25a1.003 1.003 0 0 1-.193.404l-2.109 7.721c-.193.707-.465.938-.779.951-.371.015-.613-.14-.86-.301-.282-.182-1.079-.69-1.461-.961-.575-.405-1.001-.612-1.001-.926.002-.237.309-.515.919-1.104.002-.002.004-.003.005-.005L15.9 9.765c.1-.09.2-.18.2-.27s-.102-.16-.2-.16c-.09 0-.17.05-.24.12l-4.011 3.697-1.04 3.246c-.125.38-.28.72-.49.96-.21.24-.49.41-.83.41-.48 0-.93-.24-1.12-.68-.2-.44-.4-.88-.6-1.32-.18-.41-.36-.82-.54-1.23l-.02-.04c-.03-.09-.06-.18-.09-.27a.53.53 0 0 1-.03-.28.5.5 0 0 1 .09-.28l.01-.01 7.84-5.002c.02-.01.04-.02.06-.03z"/>
  </svg>
);

// SVG Icon for X (Twitter)
const XIcon = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className={className}>
    <title>X</title>
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
  </svg>
);

const ADMIN_EMAIL = "sinhakaran01235@gmail.com"; // Reverted Admin Email

export default function Footer() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    // Initial check
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase]);

  return (
    <footer className="mt-auto py-8 border-t bg-card/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-4 flex justify-center items-center gap-2">
          <Brain className="h-7 w-7 text-primary" />
          <p className="text-xl font-semibold text-primary">AOLBEAM</p>
        </div>
        <p className="text-sm text-muted-foreground mb-4 max-w-xl mx-auto">
          Access of Learning: Beam into the world of knowledge. Your AI partner for acing competitive exams.
        </p>
        <div className="flex justify-center gap-4 sm:gap-6 mb-6 text-sm flex-wrap">
          <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <AboutIcon size={16} /> About Us
          </Link>
          <Link href="/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <FileText size={16} /> Terms
          </Link>
          <Link href="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <ShieldCheck size={16} /> Privacy
          </Link>
          <Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <DollarSign size={16} /> Pricing
          </Link>
          <Link href="/contact-us" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <Mail size={16} /> Contact
          </Link>
          <Link href="/blog" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <Rss size={16} /> Blog
          </Link>
          {currentUser && currentUser.email === ADMIN_EMAIL && (
            <Link href="/admin/blog" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <Briefcase size={16} /> Admin
            </Link>
          )}
        </div>
        <div className="flex justify-center gap-x-6 gap-y-2 mt-6 mb-4 flex-wrap">
          <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="Discord" className="text-muted-foreground hover:text-primary transition-colors">
            <DiscordIconFooter className="h-6 w-6" />
          </Link>
          <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="text-muted-foreground hover:text-primary transition-colors">
            <TelegramIconFooter className="h-6 w-6" />
          </Link>
          <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors">
            <Instagram className="h-6 w-6" />
          </Link>
          <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="text-muted-foreground hover:text-primary transition-colors">
            <XIcon className="h-6 w-6" />
          </Link>
          <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary transition-colors">
            <LinkedinIcon className="h-6 w-6" />
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} AOLBEAM. All rights reserved. Powered by GenAI.
        </p>
      </div>
    </footer>
  );
}
