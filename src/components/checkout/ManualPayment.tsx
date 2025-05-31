import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Mail } from 'lucide-react';
import { PaymentHandlerProps } from '@/app/checkout/types';

interface ManualPaymentProps extends PaymentHandlerProps {}

export const ManualPayment: React.FC<ManualPaymentProps> = ({
  plan,
  paymentType,
}) => {
  const handleManualPayment = () => {
    if (paymentType === 'subscription') {
      const message = `Hi, I'm interested in purchasing the ${plan?.name} plan for ${plan?.price}.`;
      const whatsappUrl = `https://wa.me/916033240396?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else if (paymentType === 'one-time') {
      const subject = `Purchase Inquiry: ${plan?.name} Plan`;
      const body = `Hi,\n\nI'm interested in purchasing the ${plan?.name} plan for ${plan?.oneTimePrice}.\n\nPlan Details:\n- Plan: ${plan?.name}\n- Price: ${plan?.oneTimePrice}\n- Features: ${plan?.features.join(', ')}\n\nPlease let me know how to proceed with the payment.\n\nBest regards,`;
      const mailtoUrl = `mailto:support@aolbeam.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={handleManualPayment}
        className="w-full transition-all duration-200 shadow-md hover:shadow-lg"
        size="lg"
      >
        {paymentType === 'subscription' ? (
          <>
            <MessageSquare className="mr-2 h-4 w-4" />
            Contact via WhatsApp
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Contact via Email
          </>
        )}
      </Button>
      
      <p className="text-sm text-center text-muted-foreground">
        {paymentType === 'subscription' 
          ? "You'll be connected with our support team on WhatsApp to complete your subscription payment."
          : "You'll be able to compose an email to our support team with your payment request."}
      </p>
    </div>
  );
};
