// Christmas Party II — configuration Firebase (espace membre + Secret Santa)
// Ces clés sont publiques par conception (ce sont des identifiants client,
// pas des secrets) — la vraie sécurité est assurée par les règles Firestore.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyC8WnOFqY08DOCL4GUP12-IUZmrpj4qHuE",
  authDomain: "christmas-party-ii.firebaseapp.com",
  projectId: "christmas-party-ii",
  storageBucket: "christmas-party-ii.firebasestorage.app",
  messagingSenderId: "101923828232",
  appId: "1:101923828232:web:74bb54ad5847a6bec1d7bd",
  measurementId: "G-BNPR4MM3WR"
};

// Les deux adresses admin (Kisha & Max) — doivent correspondre EXACTEMENT
// à celles codées dans firestore.rules.
window.ADMIN_EMAILS = ['josepha.tsm@outlook.be', 'youtamaxime@gmail.com'];
