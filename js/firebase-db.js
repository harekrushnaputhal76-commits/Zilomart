// ============================================================================
// ZILOMARKET STEP 3: FIREBASE FIRESTORE CLOUD SYNC ENGINE
// ============================================================================

// Live Firebase Cloud Sync enabled with project zilomarket-f41e2
export const ENABLE_FIREBASE_CLOUD = true;

export const firebaseConfig = {
  apiKey: "AIzaSyDkAgJRv5IMMUsq5nVB5WlSwaVCIaaRdx4",
  authDomain: "zilomarket-f41e2.firebaseapp.com",
  projectId: "zilomarket-f41e2",
  storageBucket: "zilomarket-f41e2.firebasestorage.app",
  messagingSenderId: "281460185981",
  appId: "1:281460185981:web:96888a2202824dc2054a14",
  measurementId: "G-NQJSDWMZSB"
};

let db = null;
let firestoreFns = null;

export async function initCloudDB() {
  if (!ENABLE_FIREBASE_CLOUD) return false;
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    const { getFirestore, collection, getDocs, setDoc, doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    firestoreFns = { collection, getDocs, setDoc, doc, deleteDoc };
    console.log("✔ ZiloMarket Connected to Firebase Firestore");
    return true;
  } catch (err) {
    console.warn("Using LocalStorage fallback (Firebase initialization failed or offline):", err);
    return false;
  }
}

export async function syncShopsFromCloud(fallbackShops) {
  if (!ENABLE_FIREBASE_CLOUD || !db) return fallbackShops;
  try {
    const snap = await firestoreFns.getDocs(firestoreFns.collection(db, "shops"));
    if (snap.empty) {
      // Seed initial shops to Firestore on first run
      for (const shop of fallbackShops) {
        await firestoreFns.setDoc(firestoreFns.doc(db, "shops", shop.id), shop);
      }
      return fallbackShops;
    }
    const cloudShops = [];
    snap.forEach(d => cloudShops.push(d.data()));
    localStorage.setItem("zilo_shops_v2", JSON.stringify(cloudShops));
    return cloudShops;
  } catch (e) {
    console.error("Cloud fetch error:", e);
    return fallbackShops;
  }
}

export async function saveShopToCloud(shopObj) {
  if (!ENABLE_FIREBASE_CLOUD || !db) return;
  try {
    await firestoreFns.setDoc(firestoreFns.doc(db, "shops", shopObj.id), shopObj);
  } catch (e) {
    console.error("Cloud save error:", e);
  }
}

export async function deleteShopFromCloud(shopId) {
  if (!ENABLE_FIREBASE_CLOUD || !db) return;
  try {
    await firestoreFns.deleteDoc(firestoreFns.doc(db, "shops", shopId));
  } catch (e) {
    console.error("Cloud delete error:", e);
  }
}
