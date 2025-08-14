// ReagentCalculator.js

import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, setDoc, deleteDoc, serverTimestamp, doc } from 'firebase/firestore';
import Modal from './Modal';

const ReagentCalculator = ({ db, userId }) => {
  const [reagentName, setReagentName] = useState('');
  const [molecularWeight, setMolecularWeight] = useState('');
  const [volume, setVolume] = useState('');
  const [molarity, setMolarity] = useState('');
  const [result, setResult] = useState(null);
  const [modalMessage, setModalMessage] = useState(null);
  const [reagentLogs, setReagentLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('calculator');

  const saveReagentLog = async (logData) => {
    if (!db || !userId) {
      setModalMessage('로그인 상태를 확인해주세요.');
      return false;
    }

    try {
      await addDoc(collection(db, `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/reagentLogs`), logData);
      return true;
    } catch (e) {
      setModalMessage('기록 저장에 실패했습니다: ' + e.message);
      return false;
    }
  };
  
  useEffect(() => {
    if (db && userId) {
      const logsCollectionRef = collection(db, `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/reagentLogs`);
      const unsubscribe = onSnapshot(logsCollectionRef, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setReagentLogs(logs);
      });
      return () => unsubscribe();
    }
  }, [db, userId]);

  const calculate = async () => {
    const mw = parseFloat(molecularWeight);
    const v = parseFloat(volume);
    const m = parseFloat(molarity);
    
    if (isNaN(mw) || isNaN(v) || isNaN(m)) {
      setModalMessage('분자량, 부피, 몰수 모두 숫자로 입력해야 합니다.');
      return;
    }
    if (mw <= 0 || v <= 0 || m <= 0) {
      setModalMessage('분자량, 부피, 몰수 모두 0보다 큰 숫자로 입력해야 합니다.');
      return;
    }
    
    const calculatedMass = m * mw * (v / 1000);
    
    setResult({ type: '질량', value: calculatedMass, unit: 'g' });
    
    const logData = {
      reagentName: reagentName || 'Unknown Reagent',
      method: 'Reagent',
      timestamp: serverTimestamp(),
      molecularWeight: mw,
      volume: v,
      molarity: m,
      mass: calculatedMass,
    };

    const saved = await saveReagentLog(logData);
    if (saved) {
      setModalMessage('계산 결과가 성공적으로 기록되었습니다!');
    }
  };

  const formatResult = (value, unit) => {
    if (isNaN(value)) return '-';
    return `${value?.toFixed(4)} ${unit}`;
  };

  return (
    <div className="space-y-6">
      {modalMessage && <Modal message={modalMessage} onClose={() => setModalMessage(null)} />}
      <h2 className="text-2xl font-semibold text-center mb-4">시약 계산기</h2>
      
      <div className="flex justify-center space-x-4 mb-4">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`px-6 py-2 rounded-lg transition duration-300 shadow-md
            ${activeTab === 'calculator' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`
          }
        >
          계산기
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-2 rounded-lg transition duration-300 shadow-md
            ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`
          }
        >
          지난 시약 계산
        </button>
      </div>
      
      {activeTab === 'calculator' ? (
        <>
          <div className="space-y-3">
            <div>
              <label className="block text-gray-700">시약 이름</label>
              <input
                type="text"
                value={reagentName}
                onChange={(e) => setReagentName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Tris-HCl"
              />
            </div>
            <div>
              <label className="block text-gray-700">분자량 (g/mol)</label>
              <input
                type="number"
                value={molecularWeight}
                onChange={(e) => setMolecularWeight(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="121.14"
              />
            </div>
            <div>
              <label className="block text-gray-700">부피 (mL)</label>
              <input
                type="number"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1000"
              />
            </div>
            <div>
              <label className="block text-gray-700">몰수 (M)</label>
              <input
                type="number"
                value={molarity}
                onChange={(e) => setMolarity(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1"
              />
            </div>
          </div>
          <button
            onClick={calculate}
            className="w-full p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-300 shadow-md flex-grow"
          >
            계산
          </button>
          {result && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg shadow-inner">
              <p className="font-bold text-gray-800">
                {result.type}: <span className="text-indigo-700">{formatResult(result.value, result.unit)}</span>
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {reagentLogs.length === 0 ? (
            <p className="text-center text-gray-500 italic mt-8">기록된 시약 계산 내역이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {reagentLogs.map((log) => (
                <li key={log.id} className="bg-gray-100 p-3 rounded-lg shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">{log.timestamp.toLocaleString('ko-KR')}</p>
                  <p className="font-semibold text-gray-800 mb-1 text-sm">{log.reagentName}</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                    <p>분자량: <span className="font-medium">{log.molecularWeight?.toFixed(4)} g/mol</span></p>
                    <p>부피: <span className="font-medium">{log.volume?.toFixed(4)} mL</span></p>
                    <p>몰수: <span className="font-medium">{log.molarity?.toFixed(4)} M</span></p>
                    <p>질량: <span className="font-medium">{log.mass?.toFixed(4)} g</span></p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ReagentCalculator;