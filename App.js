// App.js

import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, getFirestore as db, collection, query, onSnapshot, addDoc, setDoc, deleteDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';

import CellCountCalculator from './CellCountCalculator';
import EnzymeMixtureCalculator from './EnzymeMixtureCalculator';
import PastResearchView from './PastResearchView';
import ReagentCalculator from './ReagentCalculator';
import SummaryPopup from './SummaryPopup';

const App = () => {
  const [currentView, setCurrentView] = useState('cellCount');
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const auth = getAuth(app);
    setDb(firestore);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        await signInAnonymously(auth);
        setUserId(auth.currentUser.uid);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <div className="w-full max-w-2xl flex flex-col items-center">
        <div className="w-full max-w-2xl bg-white p-4 rounded-xl shadow-lg flex justify-center space-x-4 mb-4 mt-16">
          <button
            onClick={() => setCurrentView('cellCount')}
            className={`px-6 py-2 rounded-lg transition duration-300 shadow-md
              ${currentView === 'cellCount' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`
            }
          >
            세포 수 계산기
          </button>
          <button
            onClick={() => setCurrentView('enzymeMixture')}
            className={`px-6 py-2 rounded-lg transition duration-300 shadow-md
              ${currentView === 'enzymeMixture' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`
            }
          >
            Mixture 계산기
          </button>
          <button
            onClick={() => setCurrentView('reagentCalculator')}
            className={`px-6 py-2 rounded-lg transition duration-300 shadow-md
              ${currentView === 'reagentCalculator' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`
            }
          >
            시약 계산기
          </button>
          <button
            onClick={() => setCurrentView('pastResearch')}
            className={`px-6 py-2 rounded-lg transition duration-300 shadow-md
              ${currentView === 'pastResearch' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`
            }
          >
            지난 연구
          </button>
        </div>
        <div className="w-full max-w-2xl">
          {isAuthReady && (
            <div className="bg-white p-8 rounded-xl shadow-lg">
              {currentView === 'cellCount' && <CellCountCalculator db={db} userId={userId} />}
              {currentView === 'enzymeMixture' && <EnzymeMixtureCalculator db={db} userId={userId} />}
              {currentView === 'reagentCalculator' && <ReagentCalculator db={db} userId={userId} />}
              {currentView === 'pastResearch' && <PastResearchView db={db} userId={userId} />}
            </div>
          )}
        </div>
      </div>
      {isAuthReady && <SummaryPopup db={db} userId={userId} />}
    </div>
  );
};

export default App;