import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy | AolBeam AI',
  description: 'Learn about our refund and cancellation policy for AolBeam AI subscriptions.',
};

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/pricing">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pricing
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight mb-4">Refund & Cancellation Policy</h1>
          <p className="text-muted-foreground">Last updated: May 25, 2025</p>
        </div>

        <div className="prose dark:prose-invert max-w-none">
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Refund Policy</h2>
              <div className="space-y-4">
                <p>
                  At AolBeam AI, we strive to provide the best service possible. However, we maintain a no-refund policy for all subscription payments. 
                  All sales are final and no refunds will be issued for any reason, including but not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Change of mind</li>
                  <li>Unused subscription time</li>
                  <li>Partial month usage</li>
                  <li>Account termination</li>
                </ul>
                <p>
                  We encourage you to try our free resources and carefully consider your purchase before subscribing to any paid plan.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Cancellation Policy</h2>
              <div className="space-y-4">
                <p>
                  You may cancel your subscription at any time through your account settings. Your subscription will remain active until the end of the current billing period.
                </p>
                <p>
                  To cancel your subscription:
                </p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Log in to your AolBeam AI account</li>
                  <li>Navigate to Account Settings</li>
                  <li>Click on 'Subscription'</li>
                  <li>Select 'Cancel Subscription'</li>
                </ol>
                <p>
                  Please note that we do not provide refunds for any remaining time on your subscription after cancellation.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Payment Issues</h2>
              <div className="space-y-4">
                <p>
                  If you experience any issues with payment processing or have questions about our refund and cancellation policy, please contact our support team at:
                </p>
                <p className="font-medium">
                  Email: <a href="mailto:aolbeam@outlook.com" className="text-primary hover:underline">aolbeam@outlook.com</a>
                </p>
                <p>
                  We typically respond to all inquiries within 24-48 hours.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Policy Changes</h2>
              <p>
                We reserve the right to modify this refund and cancellation policy at any time. Any changes will be effective immediately upon posting on this page.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
