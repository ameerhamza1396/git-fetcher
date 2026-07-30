import { Capacitor, registerPlugin } from '@capacitor/core';

const MetaAppEvents = registerPlugin<{
  logEvent(options: {
    name: string;
    valueToSum?: number;
    parameters?: Record<string, string | number | boolean>;
  }): Promise<void>;
}>('MetaAppEvents');

type EventParameters = Record<string, string | number | boolean>;

async function logMetaEvent({
  name,
  valueToSum,
  parameters,
  marketingConsent,
}: {
  name: string;
  valueToSum?: number;
  parameters?: EventParameters;
  marketingConsent: boolean;
}) {
  if (!marketingConsent || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

  try {
    await MetaAppEvents.logEvent({ name, valueToSum, parameters });
  } catch (error) {
    console.warn(`Unable to log Meta event ${name}`, error);
  }
}

type CommerceDetails = {
  planId: string;
  planName: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly';
  marketingConsent: boolean;
};

const commerceParameters = (details: CommerceDetails): EventParameters => ({
  fb_content_id: details.planId,
  fb_content_type: 'product',
  fb_currency: 'PKR',
  plan_name: details.planName,
  billing_period: details.billingPeriod,
});

export async function trackMetaAddToCart({
  planId,
  planName,
  price,
  billingPeriod,
  marketingConsent,
}: CommerceDetails) {
  await logMetaEvent({
    name: 'fb_mobile_add_to_cart',
    valueToSum: price,
    parameters: commerceParameters({ planId, planName, price, billingPeriod, marketingConsent }),
    marketingConsent,
  });
}

export async function trackMetaInitiatedCheckout(details: CommerceDetails) {
  await logMetaEvent({
    name: 'fb_mobile_initiated_checkout',
    valueToSum: details.price,
    parameters: { ...commerceParameters(details), fb_num_items: 1 },
    marketingConsent: details.marketingConsent,
  });
}

export async function trackMetaAddPaymentInfo(details: CommerceDetails & { paymentMethod: string }) {
  await logMetaEvent({
    name: 'fb_mobile_add_payment_info',
    valueToSum: details.price,
    parameters: { ...commerceParameters(details), payment_method: details.paymentMethod },
    marketingConsent: details.marketingConsent,
  });
}

export async function trackMetaPurchase(details: CommerceDetails & { orderId: string; paymentMethod: string }) {
  if (!details.marketingConsent || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
  const dedupeKey = `meta_purchase_${details.orderId}`;
  if (!details.orderId || sessionStorage.getItem(dedupeKey)) return;

  await logMetaEvent({
    name: 'fb_mobile_purchase',
    valueToSum: details.price,
    parameters: {
      ...commerceParameters(details),
      order_id: details.orderId,
      payment_method: details.paymentMethod,
      fb_num_items: 1,
    },
    marketingConsent: details.marketingConsent,
  });
  sessionStorage.setItem(dedupeKey, '1');
}
