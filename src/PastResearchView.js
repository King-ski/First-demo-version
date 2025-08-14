// PastResearchView.js

import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import Modal from './Modal';
import MemoModal from './Memo.js';

const PastResearchView = ({ db, userId }) => {
  const [dailyLogs, setDailyLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [logsForSelectedDate, setLogsForSelectedDate] = useState([]);
  const [editingLog, setEditingLog] = useState(null);
  const [modalMessage, setModalMessage] = useState(null);

  useEffect(() => {
    if (db && userId) {
      const logsCollectionRef = collection(db, `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/dailyLogs`);
      const unsubscribe = onSnapshot(logsCollectionRef, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        })).filter(log => log.method !== 'Reagent');
        setDailyLogs(logs);
      });
      return () => unsubscribe();
    }
  }, [db, userId]);

  useEffect(() => {
    if (dailyLogs.length > 0 && selectedDate) {
      const getLocalISODate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const selectedDateString = getLocalISODate(selectedDate);
      const logs = dailyLogs.filter(log => {
        const logDateString = getLocalISODate(log.timestamp);
        return logDateString === selectedDateString;
      }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setLogsForSelectedDate(logs);
    } else {
      setLogsForSelectedDate([]);
    }
  }, [selectedDate, dailyLogs]);

  const getDatesWithLogs = () => {
    const getLocalISODate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    return Array.from(new Set(dailyLogs.map(log => getLocalISODate(log.timestamp))));
  };

  const hasLogOnDate = (date) => {
    const datesWithLogs = getDatesWithLogs();
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return datesWithLogs.includes(dateString);
  };
  
  const saveMemo = async (logId, memo) => {
    if (!db && !userId) {
      setModalMessage('로그인 상태를 확인해주세요.');
      return;
    }
    try {
      const logRef = doc(db, `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/dailyLogs`, logId);
      await updateDoc(logRef, { memo });
      setModalMessage('메모가 성공적으로 저장되었습니다!');
    } catch (e) {
      setModalMessage('메모 저장에 실패했습니다: ' + e.message);
    }
  };

  const formatScientificNotation = (num) => {
    if (isNaN(num)) return '-';
    const [coefficient, exponent] = num.toExponential(2).split('e+');
    return `${coefficient} x 10<sup>${exponent}</sup>`;
  };

  const renderCalendar = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const calendarDays = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="p-2 text-center text-gray-400"></div>);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const hasLogs = hasLogOnDate(date);

      calendarDays.push(
        <button
          key={i}
          onClick={() => setSelectedDate(date)}
          className={`p-2 rounded-full text-center hover:bg-gray-200 transition relative
            ${isToday ? 'bg-indigo-200 text-indigo-800 font-bold' : ''}
            ${isSelected ? 'bg-indigo-600 text-white font-bold' : ''}
          `}
        >
          {i}
          {hasLogs && !isSelected && (
            <span className="absolute bottom-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          )}
        </button>
      );
    }

    return calendarDays;
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-2xl mx-auto">
      {modalMessage && <Modal message={modalMessage} onClose={() => setModalMessage(null)} />}
      {editingLog && <MemoModal log={editingLog} onClose={() => setEditingLog(null)} onSave={saveMemo} />}

      <h2 className="text-2xl font-bold text-center mb-6">지난 연구 기록</h2>
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}>&lt;</button>
        <h3 className="text-xl font-semibold">
          {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
        </h3>
        <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}>&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-4 text-sm font-medium text-gray-500">
        <div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>
      </div>
      <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
      
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">
          {selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 기록
        </h3>
        {logsForSelectedDate.length === 0 ? (
          <p className="text-center text-gray-500 italic mt-8">오늘의 기록이 없습니다.</p>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {logsForSelectedDate.map((log) => (
              <li key={log.id} 
                  className="bg-gray-100 p-3 rounded-lg shadow-sm cursor-pointer hover:bg-gray-200 transition"
                  onClick={() => setEditingLog(log)}
              >
                <p className="text-xs text-gray-500 mb-1">{log.timestamp.toLocaleString('ko-KR')}</p>
                <p className="font-semibold text-gray-800 mb-1 text-sm">
                  {log.method === 'Reagent' ? log.reagentName : `${log.cellName} ${log.type && `- ${log.type}`}`}
                </p>
                {log.method === 'Hemocytometer' && (
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                    <p>계수된 세포 수: <span className="font-medium">{log.countedCells} 개</span></p>
                    <p>센 칸 수: <span className="font-medium">{log.squares} 칸</span></p>
                    <p>희석 배율: <span className="font-medium">{log.dilutionFactor} 배</span></p>
                    <p>총 세포 수: <span className="font-medium" dangerouslySetInnerHTML={{ __html: formatScientificNotation(log.totalCells) }} /> cells</p>
                    <p>목표 세포 수: <span className="font-medium" dangerouslySetInnerHTML={{ __html: formatScientificNotation(parseFloat(log.targetCells) * Math.pow(10, log.targetExponent)) }} /> cells</p>
                    <p>필요한 부피: <span className="font-medium text-indigo-700">{log.requiredVolume?.toFixed(2) || '-'} μL</span></p>
                    <p>총 부피: <span className="font-medium">{log.totalVolume} mL</span></p>
                  </div>
                )}
                {log.method === 'Automated Cell Counter' && (
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                    <p>세포 농도: <span className="font-medium" dangerouslySetInnerHTML={{ __html: formatScientificNotation(log.cellsPerMl) }} /> cells/mL</p>
                    <p>총 세포 수: <span className="font-medium" dangerouslySetInnerHTML={{ __html: formatScientificNotation(log.totalCells) }} /> cells</p>
                    <p>Viability: <span className="font-medium">{log.viability} %</span></p>
                    <p>총 부피: <span className="font-medium">{log.totalVolume} mL</span></p>
                    <p>목표 세포 수: <span className="font-medium" dangerouslySetInnerHTML={{ __html: formatScientificNotation(parseFloat(log.targetCells) * Math.pow(10, log.targetExponent)) }} /> cells</p>
                    <p>필요한 부피: <span className="font-medium text-indigo-700">{log.requiredVolume?.toFixed(2) || '-'} μL</span></p>
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
                <div className="mt-2 pt-2 border-t border-gray-200">
                  {log.memo && <p className="text-sm italic text-gray-500 mt-2">메모: {log.memo}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PastResearchView;