type CommerceDetails = {
  planId: string;
  planName: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly';
  analyticsConsent: boolean;
};

type PaymentDetails = CommerceDetails & { paymentMethod: string };
type PurchaseDetails = PaymentDetails & { orderId: string };

function item(details: CommerceDetails) {
  return {
    item_id: details.planId,
    item_name: details.planName,
    item_category: 'Subscription',
    item_variant: details.billingPeriod,
    price: details.price,
    quantity: 1,
  };
}

function track(eventName: string, parameters: Record<string, unknown>, analyticsConsent: boolean) {
  if (!analyticsConsent) return;
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    void NativeGoogleAnalytics.logEvent({ name: eventName, parameters })
      .catch(error => console.warn(`Unable to log Firebase Analytics event ${eventName}`, error));
    return;
  }
  const debugMode = import.meta.env.DEV || import.meta.env.VITE_GOOGLE_ANALYTICS_DEBUG_MODE === 'true';
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push(['event', eventName, {
    ...parameters,
    ...(debugMode ? { debug_mode: true } : {}),
  }]);
}

export function trackGoogleAddToCart(details: CommerceDetails) {
  track('add_to_cart', {
    currency: 'PKR',
    value: details.price,
    items: [item(details)],
  }, details.analyticsConsent);
}

export function trackGoogleBeginCheckout(details: CommerceDetails) {
  track('begin_checkout', {
    currency: 'PKR',
    value: details.price,
    items: [item(details)],
  }, details.analyticsConsent);
}

export function trackGoogleAddPaymentInfo(details: PaymentDetails) {
  track('add_payment_info', {
    currency: 'PKR',
    value: details.price,
    payment_type: details.paymentMethod,
    items: [item(details)],
  }, details.analyticsConsent);
}

export function trackGooglePurchase(details: PurchaseDetails) {
  if (!details.analyticsConsent || !details.orderId) return;
  const dedupeKey = `ga_purchase_${details.orderId}`;
  if (sessionStorage.getItem(dedupeKey)) return;

  track('purchase', {
    transaction_id: details.orderId,
    currency: 'PKR',
    value: details.price,
    payment_type: details.paymentMethod,
    items: [item(details)],
  }, true);
  sessionStorage.setItem(dedupeKey, '1');
}
import { Capacitor, registerPlugin } from '@capacitor/core';

const NativeGoogleAnalytics = registerPlugin<{
  logEvent(options: { name: string; parameters: Record<string, unknown> }): Promise<void>;
}>('GoogleAnalytics');
