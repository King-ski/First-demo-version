// SummaryPopup.js

import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc } from 'firebase/firestore';

const SummaryPopup = ({ db, userId }) => {
  const [logs, setLogs] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const formatVolume = (volume) => {
    return !isNaN(volume) ? parseFloat(volume).toFixed(2) : '-';
  };
  
  const formatScientificNotation = (num) => {
    if (isNaN(num)) return '-';
    const [coefficient, exponent] = num.toExponential(2).split('e+');
    return `${coefficient} x 10<sup>${exponent}</sup>`;
  };

  useEffect(() => {
    if (db && userId) {
      const logsCollectionRef = collection(db, `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/dailyLogs`);
      const unsubscribe = onSnapshot(logsCollectionRef, (snapshot) => {
        const today = new Date();
        const getLocalISODate = (date) => `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const todayString = getLocalISODate(today);
        
        const todayLogs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        })).filter(log => {
          const logDateString = getLocalISODate(log.timestamp);
          return logDateString === todayString && log.method !== 'Reagent';
        }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        setLogs(todayLogs);
      });

      return () => unsubscribe();
    }
  }, [db, userId]);

  return (
    <>
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40">
        <div onClick={() => setIsOpen(true)} className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg cursor-pointer transition-all duration-300 ease-in-out font-bold">
          <h4 className="font-bold text-white">SUMMARY</h4>
        </div>
      </div>
      {isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-lg mx-4" style={{maxHeight: '75vh'}}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">오늘의 SUMMARY</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
            </div>
            {logs.length === 0 ? (
              <p className="text-center text-gray-500 italic mt-8">오늘의 기록이 없습니다.</p>
            ) : (
              <div className="overflow-y-auto pr-2" style={{maxHeight: 'calc(75vh - 80px)'}}>
                <ul className="space-y-2">
                  {logs.map((log) => (
                    <li key={log.id} 
                        className="bg-gray-100 p-3 rounded-lg shadow-sm cursor-pointer hover:bg-gray-200 transition"
                    >
                      <p className="text-xs text-gray-500 mb-1">{log.timestamp.toLocaleString('ko-KR')}</p>
                      <p className="font-semibold text-gray-800 mb-1 text-sm">
                        {log.cellName} {log.type && `- ${log.type}`}{' '}
                        {log.totalCells && (
                            <span className="ml-2 font-normal" dangerouslySetInnerHTML={{ __html: `(총 세포 수: ${formatScientificNotation(log.totalCells)} cells)` }} />
                        )}
                        {log.viability && (
                            <span className="ml-2 font-normal"> ({log.viability}%)</span>
                        )}
                      </p>
                      {log.method === 'Hemocytometer' && (
                        <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                          <p>계수된 세포 수: <span className="font-medium">{log.countedCells} 개</span></p>
                          <p>센 칸 수: <span className="font-medium">{log.squares} 칸</span></p>
                          <p>희석 배율: <span className="font-medium">{log.dilutionFactor} 배</span></p>
                          <p>총 부피: <span className="font-medium">{log.totalVolume} mL</span></p>
                          {log.targetCells && (
                            <p>목표 세포 수: <span className="font-medium" dangerouslySetInnerHTML={{ __html: formatScientificNotation(parseFloat(log.targetCells) * Math.pow(10, log.targetExponent)) }} /> cells</p>
                          )}
                          {log.requiredVolume && (
                            <p>필요한 부피: <span className="font-bold text-indigo-700">{log.requiredVolume?.toFixed(2) || '-'} μL</span></p>
                          )}
                        </div>
                      )}
                      {log.method === 'Automated Cell Counter' && (
                        <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                          <p>총 부피: <span className="font-medium">{log.totalVolume} mL</span></p>
                          {log.targetCells && (
                            <p>목표 세포 수: <span className="font-medium" dangerouslySetInnerHTML={{ __html: formatScientificNotation(parseFloat(log.targetCells) * Math.pow(10, log.targetExponent)) }} /> cells</p>
                          )}
                          {log.requiredVolume && (
                            <p>필요한 부피: <span className="font-bold text-indigo-700">{log.requiredVolume?.toFixed(2) || '-'} μL</span></p>
                          )}
                        </div>
                      )}
                      {log.method === 'Reagent' && (
                        <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                          <p>분자량: <span className="font-medium">{log.molecularWeight?.toFixed(4)} g/mol</span></p>
                          <p>부피: <span className="font-medium">{log.volume?.toFixed(4)} mL</span></p>
                          <p>몰수: <span className="font-medium">{log.molarity?.toFixed(4)} M</span></p>
                          <p>질량: <span className="font-medium">{log.mass?.toFixed(4)} g</span></p>
                        </div>
                      )}
                      {log.memo && <p className="text-sm italic text-gray-500 mt-2">메모: {log.memo}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SummaryPopup;