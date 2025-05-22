
// src/app/contact-us/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Building, Share2, Instagram, Twitter, Linkedin } from 'lucide-react';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Contact Us - AOLBEAM',
  description: 'Get in touch with the AOLBEAM team and connect with us on social media.',
};

// SVG Icon for Discord
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className={className}>
    <title>Discord</title>
    <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.865-.608 1.249a18.04 18.04 0 00-7.443 0 11.5 11.5 0 00-.608-1.25.074.074 0 00-.079-.037A19.718 19.718 0 003.683 4.37a.074.074 0 00-.035.076c.003.134.036.29.076.411.403 1.192.758 2.274 1.049 3.265a15.016 15.016 0 00-2.06 2.127.074.074 0 00.007.099c.16.217.341.41.524.578a.07.07 0 00.081.021c3.487-1.507 6.235-1.744 8.441-1.744s4.955.236 8.442 1.744a.07.07 0 00.081-.021c.183-.168.364-.361.523-.578a.074.074 0 00.007-.1 15.03 15.03 0 00-2.06-2.127c.29-.99.645-2.073 1.049-3.265.04-.121.072-.277.076-.411a.074.074 0 00-.035-.076zM8.02 12.32c-.737 0-1.338-.634-1.338-1.414s.601-1.414 1.338-1.414c.737 0 1.336.634 1.336 1.414.001.78-.599 1.414-1.336 1.414zm7.975 0c-.737 0-1.338-.634-1.338-1.414s.601-1.414 1.338-1.414c.737 0 1.338.634 1.338 1.414s-.601 1.414-1.338 1.414z"/>
  </svg>
);

// SVG Icon for Telegram
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className={className}>
    <title>Telegram</title>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.032.192.032.283.001.085-.006.169-.021.25a1.003 1.003 0 0 1-.193.404l-2.109 7.721c-.193.707-.465.938-.779.951-.371.015-.613-.14-.86-.301-.282-.182-1.079-.69-1.461-.961-.575-.405-1.001-.612-1.001-.926.002-.237.309-.515.919-1.104.002-.002.004-.003.005-.005L15.9 9.765c.1-.09.2-.18.2-.27s-.102-.16-.2-.16c-.09 0-.17.05-.24.12l-4.011 3.697-1.04 3.246c-.125.38-.28.72-.49.96-.21.24-.49.41-.83.41-.48 0-.93-.24-1.12-.68-.2-.44-.4-.88-.6-1.32-.18-.41-.36-.82-.54-1.23l-.02-.04c-.03-.09-.06-.18-.09-.27a.53.53 0 0 1-.03-.28.5.5 0 0 1 .09-.28l.01-.01 7.84-5.002c.02-.01.04-.02.06-.03z"/>
  </svg>
);

// SVG Icon for X (Twitter) - Note: This is the new X logo
const XIcon = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className={className}>
    <title>X</title>
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
  </svg>
);

const CONTACT_EMAIL = "aolbeam@outlook.com";
const INSTITUTE_EMAIL = "aolbeam@outlook.com"; // Consolidated for now, or keep institutes@aolbeam.com if preferred

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header is now global */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-center flex-grow">
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold">Contact Us</CardTitle>
            <CardDescription>We'd love to hear from you!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <Mail className="mr-2 h-5 w-5 text-primary" /> General Inquiries & Support
              </h3>
              <p className="text-muted-foreground">
                For any questions, support requests, or feedback, please email us at:
              </p>
              <Button variant="link" asChild className="px-0 text-lg">
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </Button>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <Building className="mr-2 h-5 w-5 text-primary" /> Institute & Bulk Enquiries
              </h3>
              <p className="text-muted-foreground">
                If you are an educational institution interested in custom test series or bulk packages, please reach out to our dedicated team:
              </p>
              <Button variant="link" asChild className="px-0 text-lg">
                <a href={`mailto:${INSTITUTE_EMAIL}?subject=Institute Inquiry`}>{INSTITUTE_EMAIL}</a>
              </Button>
               <p className="text-sm text-muted-foreground mt-2">
                (This is the same contact method provided in the paywall for institute inquiries.)
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <Share2 className="mr-2 h-5 w-5 text-primary" /> Connect With Us
              </h3>
              <div className="space-y-3">
                {[
                  { name: 'Discord', href: '#', Icon: DiscordIcon },
                  { name: 'Telegram', href: '#', Icon: TelegramIcon },
                  { name: 'Instagram', href: '#', Icon: Instagram },
                  { name: 'X (Twitter)', href: '#', Icon: XIcon },
                  { name: 'LinkedIn', href: '#', Icon: Linkedin },
                ].map(({ name, href, Icon }) => (
                  <div key={name} className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    <Link href={href} target="_blank" rel="noopener noreferrer" className="group text-muted-foreground hover:text-primary transition-colors font-medium">
                      {name}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
       <Footer />
    </div>
  );
}
