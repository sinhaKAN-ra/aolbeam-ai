
// src/app/privacy-policy/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
// Footer is now global

export const metadata: Metadata = {
  title: 'Privacy Policy - AOLBEAM',
  description: 'Privacy Policy for AOLBEAM.',
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <div className="py-8">
        <div className="bg-card p-6 sm:p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-6 text-center">Privacy Policy</h2>
          
          <p className="mb-4 text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose dark:prose-invert max-w-none">
            <p><strong>This is a placeholder Privacy Policy. You should replace this content with your own comprehensive policy before going live.</strong></p>
            
            <h3 className="mt-6">1. Introduction</h3>
            <p>Welcome to AOLBEAM ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.</p>

            <h3 className="mt-6">2. Information We Collect</h3>
            <p>We may collect information that you provide directly to us, such as when you create an account, subscribe to our services, or communicate with us. This may include:</p>
            <ul>
              <li>Personal identification information (Name, email address, etc. - if you implement user accounts)</li>
              <li>Usage data (e.g., topics searched, problems attempted - currently tracked in localStorage)</li>
            </ul>

            <h3 className="mt-6">3. How We Use Your Information</h3>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, operate, and maintain our services</li>
              <li>Improve, personalize, and expand our services</li>
              <li>Understand and analyze how you use our services</li>
              <li>Develop new products, services, features, and functionality</li>
              <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the application, and for marketing and promotional purposes (with your consent)</li>
              <li>Process your transactions (if applicable)</li>
              <li>Find and prevent fraud</li>
            </ul>

            <h3 className="mt-6">4. Sharing Your Information</h3>
            <p>We do not sell your personal information. We may share information with third-party vendors and service providers that perform services for us or on our behalf, and require access to such information to do that work (e.g., payment processors, AI service providers like Google for Genkit).</p>
            
            <h3 className="mt-6">5. Data Storage and Security</h3>
            <p>We use reasonable measures to help protect your information from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction. Currently, some data like interaction history and count are stored in your browser's local storage.</p>

            <h3 className="mt-6">6. Your Data Protection Rights</h3>
            <p>Depending on your location, you may have certain rights regarding your personal data, such as the right to access, correct, delete, or restrict its use.</p>

            <h3 className="mt-6">7. Changes to This Privacy Policy</h3>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>

            <h3 className="mt-6">8. Contact Us</h3>
            <p>If you have any questions about this Privacy Policy, please <Link href="/contact-us" className="text-primary hover:underline">contact us</Link>.</p>
          </div>
        </div>
      </div>
    </>
  );
}
