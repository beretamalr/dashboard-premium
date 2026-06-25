// 1. Primero importamos las funciones necesarias desde las librerías
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 2. Definimos las credenciales reales de tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyA6JZqTv-GEVym3LxWA9lWBo7qygWlKOAs",
  authDomain: "nexus-premium-dashboard.firebaseapp.com",
  projectId: "nexus-premium-dashboard",
  storageBucket: "nexus-premium-dashboard.firebasestorage.app",
  messagingSenderId: "938152750173",
  appId: "1:938152750173:web:1e2f51ae691002334ef1b4"
};

// 3. Inicializamos la aplicación de Firebase (SÓLO UNA VEZ)
const app = initializeApp(firebaseConfig);

// 4. Exportamos las herramientas para usarlas en el Login y los componentes
export const auth = getAuth(app);
export const db = getFirestore(app);