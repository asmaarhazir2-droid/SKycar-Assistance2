# Firebase setup (Sky Car Assistance)

## 1) Activer Firestore
- Ouvre Firebase Console
- Projet: `sky1-e027e`
- Build > Firestore Database > Create database
- Choisis une région

## 2) Coller les règles
Dans Firestore > Rules, colle le contenu de `firestore.rules` puis Publish.

## 3) Activer Firebase Authentication (obligatoire)
- Firebase Console > Build > Authentication > Get started
- Onglet Sign-in method
- Active **Anonymous**
- Save

## 4) Vérifier la config Web
Le fichier `firebase-config.js` contient déjà la configuration de ton projet.

## 5) Test multi-appareils
1. Ouvre `index.html` sur Téléphone A, crée un compte.
2. Ouvre `index.html` sur Téléphone B (ou PC), connecte-toi avec le même compte.
3. Les données (comptes + missions/assignations) doivent être récupérées automatiquement.

## Sécurité appliquée
- Les règles Firestore sont maintenant limitées aux utilisateurs authentifiés.
- L'application se connecte automatiquement via Firebase Anonymous Auth.
