// ============================================================================
// ZILOMARKET PRODUCTION FIREBASE FIRESTORE & AUTH ENGINE
// ============================================================================

export const firebaseConfig = {
  apiKey: "AIzaSyDkAgJRv5IMMUsq5nVB5WlSwaVCIaaRdx4",
  authDomain: "zilomarket-f41e2.firebaseapp.com",
  projectId: "zilomarket-f41e2",
  storageBucket: "zilomarket-f41e2.firebasestorage.app",
  messagingSenderId: "281460185981",
  appId: "1:281460185981:web:96888a2202824dc2054a14",
  measurementId: "G-NQJSDWMZSB"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// 1. Real Firebase Signup + Role Profile + Optional Shop Creation
export async function registerUserWithRole(email, password, role, shopDetails = null) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  await setDoc(doc(db, "users", uid), {
    uid,
    email,
    role,
    createdAt: serverTimestamp()
  });

  if (role === "business" && shopDetails) {
    const shopId = "shop_" + uid.slice(0, 8) + "_" + Date.now();
    await setDoc(doc(db, "shops", shopId), {
      id: shopId,
      ownerUid: uid,
      ownerEmail: email,
      name: shopDetails.name,
      category: shopDetails.category,
      distance: Number(shopDetails.distance || 1.0),
      featuredItem: shopDetails.featuredItem,
      startingPrice: Number(shopDetails.startingPrice || 0),
      unit: shopDetails.unit || "direct rate",
      location: shopDetails.location,
      phone: shopDetails.phone || "919800000000",
      verified: false, // Team/Admin verifies real shops
      createdAt: serverTimestamp(),
      products: [
        {
          id: "prod_" + Date.now(),
          name: shopDetails.featuredItem,
          price: Number(shopDetails.startingPrice || 0),
          mrp: Number(shopDetails.mrp || shopDetails.startingPrice || 0),
          unit: shopDetails.unit || "standard pack",
          moq: shopDetails.moq || "1 unit"
        }
      ]
    });
  }

  return { uid, email, role };
}

// 2. Real Firebase Sign-In + Fetch User Role from Firestore
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const userSnap = await getDoc(doc(db, "users", cred.user.uid));
  const userData = userSnap.exists() ? userSnap.data() : { role: "user" };
  return {
    uid: cred.user.uid,
    email: cred.user.email,
    role: userData.role || "user"
  };
}

// 3. Real Session Listener
export function watchUserSession(callback) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }
    try {
      const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
      const role = userSnap.exists() ? userSnap.data().role : "user";
      callback({ uid: firebaseUser.uid, email: firebaseUser.email, role });
    } catch (e) {
      console.warn("Could not load user role profile from Firestore:", e);
      callback({ uid: firebaseUser.uid, email: firebaseUser.email, role: "user" });
    }
  });
}

// 4. Sign Out
export async function logoutUser() {
  await signOut(auth);
}

// 5. Fetch All Real Shops from Firestore
export async function fetchLiveShops() {
  try {
    const snap = await getDocs(collection(db, "shops"));
    const shops = [];
    snap.forEach((d) => shops.push(d.data()));
    return shops;
  } catch (err) {
    console.error("Error fetching live shops from Firestore:", err);
    return [];
  }
}

// 6. Add Real Product to Vendor's Firestore Shop Document
export async function addProductToShop(shopId, newProd, currentStartingPrice) {
  const shopRef = doc(db, "shops", shopId);
  const updates = {
    products: arrayUnion(newProd)
  };
  if (Number(newProd.price) < Number(currentStartingPrice || Infinity)) {
    updates.startingPrice = Number(newProd.price);
    updates.featuredItem = newProd.name;
  }
  await updateDoc(shopRef, updates);
}

// 7. Admin/Team Verify or Remove Shop in Firestore
export async function updateShopVerification(shopId, verifiedState) {
  await updateDoc(doc(db, "shops", shopId), { verified: verifiedState });
}

export async function removeShopFromDB(shopId) {
  await deleteDoc(doc(db, "shops", shopId));
}
