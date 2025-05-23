
// src/components/Footer.tsx
"use client"; // Make it a client component to fetch user session

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Brain, FileText, ShieldCheck, DollarSign, Mail, Rss, Briefcase, BookOpen, Award, BriefcaseBusiness, GraduationCap, Scaling } from 'lucide-react';
import { Info as AboutIcon } from 'lucide-react';


const ADMIN_EMAIL = "sinhakaran01235@gmail.com"; 

interface ExamLink {
  name: string;
  href: string;
  icon?: React.ElementType;
}

const examLinks: ExamLink[] = [
  { name: 'JEE (Main & Advanced)', href: 'https://jeemain.nta.nic.in/', icon: GraduationCap },
  { name: 'NEET', href: 'https://neet.nta.nic.in/', icon: Award },
  { name: 'UPSC Civil Services', href: 'https://upsc.gov.in/', icon: BriefcaseBusiness },
  { name: 'CAT', href: 'https://iimcat.ac.in/', icon: Scaling },
  { name: 'GATE', href: 'https://gate.iitk.ac.in/', icon: BookOpen },
];


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
        <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
          Access of Learning: Beam into the world of knowledge. Your AI partner for acing competitive exams.
        </p>
        
        {/* Informational Links */}
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

        {/* Exam Links Section */}
        <div className="mb-6">
          <h3 className="text-md font-semibold text-foreground mb-3">Popular Exam Resources</h3>
          <div className="flex justify-center gap-x-6 gap-y-3 flex-wrap text-sm">
            {examLinks.map((exam) => (
              <Link
                key={exam.name}
                href={exam.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                {exam.icon && <exam.icon size={16} className="opacity-80" />}
                {exam.name}
              </Link>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} AOLBEAM. All rights reserved. Powered by GenAI.
        </p>
      </div>
    </footer>
  );
}
