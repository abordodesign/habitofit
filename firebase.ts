// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from 'firebase/app'

import { collection, getDocs, where, getFirestore,deleteDoc, doc, getDoc, setDoc, query } from 'firebase/firestore'

import { getAuth } from 'firebase/auth'
import { getStripePayments } from '@stripe/firestore-stripe-payments';


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const missingFirebase = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key)

if (missingFirebase.length) {
  throw new Error(`Missing Firebase env vars: ${missingFirebase.join(', ')}`)
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore();
const auth = getAuth();



export async function getProductsDB() {
  const prodCollection = collection(db, 'products');
  const prodSnap = await getDocs(prodCollection);
  const prodList = [];

  for (const doc of prodSnap.docs) {
    const productData = doc.data();

    // Adicione o campo "id" ao objeto de dados do produto
    productData.id = doc.id;

    // Para acessar a coleção "prices" dentro de cada produto
    const pricesCollection = collection(doc.ref, 'prices'); // 'prices' é o nome da coleção de preços dentro de cada produto
    const pricesQuery = query(pricesCollection);

    const pricesSnap = await getDocs(pricesQuery);
    const pricesList = pricesSnap.docs.map(priceDoc => {
      // Adicione a ID do preço ao objeto de dados do preço
      const priceData = priceDoc.data();
      priceData.id = priceDoc.id;
      return priceData;
    });

    // Adicione os dados de preços (incluindo as IDs) ao objeto de dados do produto
    productData.prices = pricesList;

    prodList.push(productData);
  }

  return prodList;
}

export async function checkSubscriptionStatus() {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.error('Usuário não autenticado');
    return null; // Retorna null se o usuário não estiver autenticado
  }

  const uid = currentUser.uid;
  console.log(uid);
  const subscriptionsCollection = collection(db, 'customers', uid, 'subscriptions');
  console.log(query(subscriptionsCollection))
  const q = query(subscriptionsCollection);

  try {
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Se houver documentos na subcoleção subscriptions
      const subscriptionDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      const subscriptionId = subscriptionDoc.id; 
      console.log(subscriptionDoc.data());
      if(subscriptionDoc.data().status === "active"){
        return subscriptionId;
      }else {
        console.log("Assinatura Inativa");
        return null;
      }

      
    } else {
      console.log('Nenhum documento de assinatura encontrado para o usuário.');
      return null; // Retorna null se não houver documentos na subcoleção subscriptions
    }
  } catch (error) {
    console.error('Erro ao buscar o subscriptionId:', error);
    return null; // Retorna null em caso de erro
  }
}

export async function loadInfo(priceId: string) {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    // Verifique se o usuário está autenticado
    console.error('Usuário não autenticado.');
    return;
  }

  const customerId = currentUser.uid;
  const customersCollection = collection(db, 'customers');
  const userDoc = doc(customersCollection, customerId);

  // Verifique se o documento do usuário existe
  const userDocSnap = await getDoc(userDoc);

  if (!userDocSnap.exists()) {
    console.error('Documento do usuário não encontrado.');
    return;
  }

  // Agora você pode criar a sessão de checkout
  const checkoutSessionsCollection = collection(userDoc, 'checkout_sessions');

  try {
    // Crie a sessão de checkout
    const newCheckoutSession = {
      mode: 'payment',
      price: priceId, // Substitua pelo ID do preço correto do Stripe
      success_url: window.location.origin,
      cancel_url: window.location.origin,
    };

    // Crie um novo documento com um ID exclusivo para a sessão de checkout
    const newCheckoutDoc = doc(checkoutSessionsCollection); // Não especificamos um ID aqui

    // Defina os dados da sessão de checkout no documento recém-criado
    await setDoc(newCheckoutDoc, newCheckoutSession);

    // A sessão de checkout foi criada com sucesso
    console.log('Sessão de checkout criada com sucesso:', newCheckoutDoc.id);

    // Agora você pode redirecionar o usuário para o Stripe Checkout
    const checkoutURL = `https://checkout.stripe.com/pay/${newCheckoutDoc.id}?key=${process.env.NEXT_PUBLIC_STRIPE_KEY}`;
    window.location.assign(checkoutURL);

  } catch (error) {
    console.error('Erro ao criar a sessão de checkout:', error);
    // Lide com o erro conforme necessário
  }
}

export async function getProductsAndCustomers() {
  const prodCollection = collection(db, 'products');
  const customersCollection = collection(db, 'customers');

  const prodSnap = await getDocs(prodCollection);
  const customersSnap = await getDocs(customersCollection);

  const prodList = [];

  for (const prodDoc of prodSnap.docs) {
    const productData = prodDoc.data();
    productData.id = prodDoc.id;

    // Para acessar a coleção "prices" dentro de cada produto
    const pricesCollection = collection(prodDoc.ref, 'prices');
    const pricesQuery = query(pricesCollection);

    const pricesSnap = await getDocs(pricesQuery);
    const pricesList = pricesSnap.docs.map(priceDoc => priceDoc.data());

    // Adicione os dados de preços ao objeto de dados do produto
    productData.prices = pricesList;

    prodList.push(productData);
  }

  const customersList = customersSnap.docs.map(doc => {
    const customerData = doc.data();
    customerData.id = doc.id;
    return customerData;
  });

  return {
    productsCollection: prodList,
    customersCollection: customersList,
  };
}
 
export default app
export { auth, db }

export async function buscarMediaRating(itemId: string, tipo: "serie" | "episodio") {
  const q = query(collection(db, "ratings"), where("itemId", "==", itemId), where("tipo", "==", tipo));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return 0;

  const total = snapshot.docs.reduce((sum, doc) => sum + doc.data().nota, 0);
  return total / snapshot.docs.length;
}

export async function salvarRating(userId: string, itemId: string, tipo: "serie" | "episodio", nota: number) {
  try {
    const ratingRef = doc(db, "ratings", `${userId}_${tipo}_${itemId}`);
    await setDoc(ratingRef, { userId, itemId, tipo, nota });
    console.log("Rating salvo com sucesso!");
  } catch (error) {
    console.error("Erro ao salvar rating:", error);
  }
}

export async function buscarNotaDoUsuario(userId: string, itemId: string, tipo: "serie" | "episodio") {
  try {
    const ratingRef = doc(db, "ratings", `${userId}_${tipo}_${itemId}`);
    const docSnap = await getDoc(ratingRef);
    if (docSnap.exists()) {
      return docSnap.data().nota;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar nota do usuário:", error);
    return null;
  }
}

export async function adicionarFavorito(
  userId: string,
  serie: { id: string; nome?: string; descricao?: string; imagem?: string | null; rating?: number }
) {
  const docRef = doc(db, 'favoritos', `${userId}_${serie.id}`)
  await setDoc(docRef, {
    userId,
    serieId: serie.id,
    nome: serie.nome ?? null,
    descricao: serie.descricao ?? null,
    imagem: serie.imagem ?? null,
    rating: serie.rating ?? null,
  })
}

export async function removerFavorito(userId: string, serieId: string) {
  const docRef = doc(db, 'favoritos', `${userId}_${serieId}`)
  await deleteDoc(docRef)
}

export async function verificarFavorito(userId: string, serieId: string) {
  const docRef = doc(db, 'favoritos', `${userId}_${serieId}`)
  const docSnap = await getDoc(docRef)
  return docSnap.exists()
}

export async function buscarSeriesFavoritas(userId: string): Promise<string[]> {
  try {
    const q = query(collection(db, "favoritos"), where("userId", "==", userId))
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => doc.data().serieId)
  } catch (error) {
    console.error("Erro ao buscar favoritos:", error)
    return [] 
  }
}

export async function buscarFavoritosDetalhados(userId: string) {
  try {
    const q = query(collection(db, "favoritos"), where("userId", "==", userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => doc.data())
  } catch (error) {
    console.error("Erro ao buscar favoritos detalhados:", error)
    return []
  }
}

