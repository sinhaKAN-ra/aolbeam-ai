// src/app/contact-us/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Mail, Building } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us - AOLBEAM',
  description: 'Get in touch with the AOLBEAM team.',
};

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-4 bg-card/50 border-b mb-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary">AOLBEAM</h1>
           <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Link>
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-center">
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
                <a href="mailto:support@aolbeam.com">support@aolbeam.com</a>
              </Button>
            </div>
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <Building className="mr-2 h-5 w-5 text-primary" /> Institute & Bulk Enquiries
              </h3>
              <p className="text-muted-foreground">
                If you are an educational institution interested in custom test series or bulk packages, please reach out to our dedicated team:
              </p>
              <Button variant="link" asChild className="px-0 text-lg">
                <a href="mailto:institutes@aolbeam.com?subject=Institute Inquiry">institutes@aolbeam.com</a>
              </Button>
               <p className="text-sm text-muted-foreground mt-2">
                (This is the same contact method provided in the paywall for institute inquiries.)
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
       <footer className="mt-12 py-8 border-t bg-card/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} AOLBEAM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
