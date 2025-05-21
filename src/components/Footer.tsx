
// src/components/Footer.tsx
import Link from 'next/link';
import { Brain, FileText, ShieldCheck, DollarSign, Mail, Rss, Briefcase, Instagram, Linkedin as LinkedinIcon } from 'lucide-react';

// SVG Icon for Discord
const DiscordIconFooter = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className={className}>
    <title>Discord</title>
    <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.865-.608 1.249a18.04 18.04 0 00-7.443 0 11.5 11.5 0 00-.608-1.25.074.074 0 00-.079-.037A19.718 19.718 0 003.683 4.37a.074.074 0 00-.035.076c.003.134.036.29.076.411.403 1.192.758 2.274 1.049 3.265a15.016 15.016 0 00-2.06 2.127.074.074 0 00.007.099c.16.217.341.41.524.578a.07.07 0 00.081.021c3.487-1.507 6.235-1.744 8.441-1.744s4.955.236 8.442 1.744a.07.07 0 00.081-.021c.183-.168.364-.361.523-.578a.074.074 0 00.007-.1 15.03 15.03 0 00-2.06-2.127c.29-.99.645-2.073 1.049-3.265.04-.121.072-.277.076-.411a.074.074 0 00-.035-.076zM8.02 12.32c-.737 0-1.338-.634-1.338-1.414s.601-1.414 1.338-1.414c.737 0 1.336.634 1.336 1.414.001.78-.599 1.414-1.336 1.414zm7.975 0c-.737 0-1.338-.634-1.338-1.414s.601-1.414 1.338-1.414c.737 0 1.338.634 1.338 1.414s-.601 1.414-1.338 1.414z"/>
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


export default function Footer() {
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
          <Link href="/admin/blog" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <Briefcase size={16} /> Admin
          </Link>
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
