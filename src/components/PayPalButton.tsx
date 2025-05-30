'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import type { ConvertedPlan } from '@/app/checkout/page';

interface PayPalButtonProps {
  plan: ConvertedPlan;
  paymentType: 'subscription' | 'one-time';
  onSuccess?: (data: Record<string, unknown>) => void;
  onError?: (error: Error) => void;
}

export function PayPalButton({ plan, paymentType, onSuccess, onError }: PayPalButtonProps) {
  const [{ isPending }] = usePayPalScriptReducer();
  const router = useRouter();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Loading PayPal...</span>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {paymentError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {paymentError}
        </div>
      )}
      <PayPalButtons
        style={{
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'paypal'
        }}
        createOrder={async (data, actions) => {
          try {
            // Extract numeric value from price string (handles both $ and ₹ formats)
            const priceString = plan.price.replace(/[^0-9.]/g, '');
            const inrAmount = parseFloat(priceString);
            
            if (isNaN(inrAmount)) {
              throw new Error('Invalid price format');
            }
            
            // Convert to USD for PayPal (assuming the price is in INR)
            const usdAmount = inrAmount / 80; // Replace with actual conversion rate
            
            return actions.order.create({
              intent: 'CAPTURE',
              purchase_units: [{
                amount: {
                  value: usdAmount.toFixed(2),
                  currency_code: 'USD',
                },
                description: plan.name,
              }],
            });
          } catch (error) {
            console.error('Error creating PayPal order:', error);
            setPaymentError('Failed to create payment. Please try again.');
            throw error;
          }
        }}
        onApprove={async (data, actions) => {
          try {
            if (!actions.order) {
              throw new Error('Order actions not available');
            }
            
            setIsProcessing(true);
            setPaymentError(null);
            
            // Capture the order
            const order = await actions.order?.capture();
            
            if (!order) {
              throw new Error('No order data received');
            }
            
            // Extract required data from PayPal response
            const orderId = order.id;
            const payer = order.payer;
            const purchaseUnit = order.purchase_units?.[0];
            
            // Store payment info in payment_orders table
            const paymentInfo = {
              orderId: orderId,
              paymentMethod: 'paypal',
              status: 'COMPLETED',
              timestamp: new Date().toISOString(),
              amount: parseFloat(purchaseUnit?.amount?.value || '0'),
              currency: purchaseUnit?.amount?.currency_code || 'USD',
              metadata: {
                payerEmail: payer?.email_address,
                payerName: payer?.name ? `${payer.name.given_name} ${payer.name.surname}` : '',
                description: purchaseUnit?.description || ''
              }
            };
            
            const existingPayments = JSON.parse(localStorage.getItem('payments') || '[]');
            existingPayments.push(paymentInfo);
            localStorage.setItem('payments', JSON.stringify(existingPayments));
            
            // Call the success callback if provided
            if (onSuccess) {
              onSuccess(data);
            }
            
            // Redirect to success page with all necessary parameters
            router.push(`/payment/success?token=${orderId}&payment_status=SUCCESS&payment_method=paypal&plan_id=${plan.id}&amount=${purchaseUnit?.amount?.value || '0'}&currency=${purchaseUnit?.amount?.currency_code || 'USD'}&payment_type=subscription`);
          } catch (error) {
            console.error('Payment error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Payment processing failed. Please try again.';
            setPaymentError(errorMessage);
            return Promise.reject(errorMessage);
          } finally {
            setIsProcessing(false);
          }
        }}
        onError={(err: Record<string, unknown>) => {
          console.error('PayPal error:', err);
          const errorMessage = typeof err?.message === 'string' 
            ? err.message 
            : 'An error occurred with PayPal. Please try another payment method.';
          setPaymentError(errorMessage);
          if (onError) {
            onError(new Error(errorMessage));
          }
        }}
      />
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-3" />
              <span className="text-lg font-medium">Processing your payment...</span>
            </div>
            <p className="mt-2 text-sm text-gray-600 text-center">
              Please wait while we process your payment. Do not close this window.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
