import {
  createCheckoutSession,
  getStripePayments,
} from '@stripe/firestore-stripe-payments'
import { getFunctions, httpsCallable } from '@firebase/functions'

import { getApp } from "@firebase/app";
import { getApps, initializeApp } from '@firebase/app';
import { firebaseConfig } from '@/firebase';


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// console.log(app);
const payments = getStripePayments(app, {
  productsCollection: "products",
  customersCollection: "customers",
});

// console.log('Payments:', payments);



const loadCheckout = async (priceId: string) => {

  console.log("OIA O payments", payments);
  await createCheckoutSession(payments, {
    price: priceId,
    success_url: window.location.origin,
    cancel_url: window.location.origin,
  })
    .then((snapshot) => window.location.assign(snapshot.url))
    .catch((error) => console.log(error.message))
}

const goToBillingPortal = async () => {
  const instance = getFunctions(app, 'us-central1')
  const functionRef = httpsCallable(
    instance,
    'ext-firestore-stripe-payments-createPortalLink'
  )

  await functionRef({
    returnUrl: `${window.location.origin}/account`,
  })
    .then(({ data }: any) => window.location.assign(data.url))
    .catch((error) => console.log(error.message))
}

export { loadCheckout, goToBillingPortal }
export default payments