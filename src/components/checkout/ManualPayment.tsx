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
    if (paymentType === 'one-time') {
      const message = `Hi, I'm interested in purchasing the ${plan?.name} plan for ${plan?.baseNumericPrice}.`;
      const whatsappUrl = `https://wa.me/916033240396?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else if (paymentType === 'subscription') {
      const subject = `Purchase Inquiry: ${plan?.name} Plan`;
      const body = `Hi,\n\nI'm interested in purchasing the ${plan?.name} plan for ${plan?.baseNumericPrice}.\n\nPlan Details:\n- Plan: ${plan?.name}\n- Price: ${plan?.baseNumericPrice}\n- Features: ${plan?.features.join(', ')}\n\nPlease let me know how to proceed with the payment.\n\nBest regards,`;
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
        {paymentType === 'one-time' ? (
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
        {paymentType === 'one-time' 
          ? "If payment error persists, you can contact our support team on WhatsApp to complete your one-time purchase payment."
          : "If payment error persists, you can contact our support team on Email to complete your subscription purchase payment."}
      </p>
    </div>
  );
};
