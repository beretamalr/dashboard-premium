import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Validar credenciales con Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);

      // 2. Buscar a qué empresa pertenece el usuario
      const q = query(collection(db, "usuarios"), where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        
        // 3. Guardar la "llave" de la empresa y el rol
        localStorage.setItem("empresaId", userData.empresaId);
        localStorage.setItem("rol", userData.rol);
        
        // 4. Redirigir al Dashboard
        navigate('/dashboard');
      } else {
        setError('Tu usuario no está registrado en ninguna empresa.');
        auth.signOut();
      }
    } catch (err) {
      console.error(err);
      setError('Correo o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-800">
        <h2 className="text-3xl font-bold text-white text-center mb-6">Nexus Panel</h2>
        
        {error && <p className="bg-rose-500/20 text-rose-400 p-3 rounded mb-4 text-sm">{error}</p>}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white focus:border-indigo-500 outline-none"
              required 
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white focus:border-indigo-500 outline-none"
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded transition-colors mt-4 disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}