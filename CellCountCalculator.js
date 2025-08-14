// CellCountCalculator.js

import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, setDoc, deleteDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import Modal from './Modal';
import MemoModal from './MemoModal';

const CellCountCalculator = ({ db, userId }) => {
  const [calculationMethod, setCalculationMethod] = useState('hemocytometer');
  const [hemocytometerPresets, setHemocytometerPresets] = useState([]);
  const [autoCounterPresets, setAutoCounterPresets] = useState([]);
  const [typeHistory, setTypeHistory] = useState([]);

  const [presetName, setPresetName] = useState('');
  const [cellName, setCellName] = useState('');
  const [type, setType] = useState('');
  const [countedCells, setCountedCells] = useState('');
  const [squares, setSquares] = useState('');
  const [dilutionFactor, setDilutionFactor] = useState('');
  const [totalVolume, setTotalVolume] = useState('');
  const [targetCells, setTargetCells] = useState('');
  const [targetExponent, setTargetExponent] = useState(6);
  const [autoCountValue, setAutoCountValue] = useState('');
  const [autoCountExponent, setAutoCountExponent] = useState(6);
  const [viability, setViability] = useState('');
  const [memo, setMemo] = useState('');

  const [result, setResult] = useState(null);
  const [modalMessage, setModalMessage] = useState(null);

  useEffect(() => {
    if (db && userId) {
      const hemocytometerPresetsRef = collection(db, `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/hemocytometerPresets`);
      const unsubscribeHemo = onSnapshot(hemocytometerPresetsRef, (snapshot) => {
        const presetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setHemocytometerPresets(presetsData);
      });
      const autoCounterPresetsRef = collection(db, `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/autoCounterPresets`);
      const unsubscribeAuto = onSnapshot(autoCounterPresetsRef, (snapshot) => {
        const presetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAutoCounterPresets(presetsData);
      });

      return () => {
        unsubscribeHemo();
        unsubscribeAuto();
      };
    }
  }, [db, userId]);

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('typeHistory')) || [];
    setTypeHistory(savedHistory);
  }, []);

  const updateTypeHistory = (newType) => {
    if (newType) {
      const newHistory = [newType, ...typeHistory.filter(t => t !== newType)];
      if (newHistory.length > 10) newHistory.pop();
      setTypeHistory(newHistory);
      localStorage.setItem('typeHistory', JSON.stringify(newHistory));
    }
  };

  const selectPreset = (preset) => {
    setPresetName(preset.presetName || '');
    setCellName(preset.cellName || '');
    setDilutionFactor(preset.dilutionFactor || '');
    setTotalVolume(preset.totalVolume || '');
    setTargetCells(preset.targetCells || '');
    setTargetExponent(preset.targetExponent || 6);
    setCalculationMethod(preset.calculationMethod);
    setMemo('');
    
    setType('');
    setCountedCells('');
    setSquares('');
    setAutoCountValue('');
    setViability('');
    setAutoCountExponent(preset.autoCountExponent || 6);
    
    setResult(null);
  };

  const deletePreset = async (presetToDelete) => {
    if (!db || !userId) {
      setModalMessage('로그인 상태를 확인해주세요.');
      return;
    }
    try {
      const collectionName = presetToDelete.calculationMethod === 'hemocytometer' ? 'hemocytometerPresets' : 'autoCounterPresets';
      await deleteDoc(doc(db, `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/${collectionName}`, presetToDelete.id));
      setModalMessage(`프리셋 "${presetToDelete.presetName}"이 삭제되었습니다.`);
    } catch (e) {
      setModalMessage('프리셋 삭제에 실패했습니다: ' + e.message);
    }
  };

  const addPreset = async () => {
    if (!db || !userId) {
      setModalMessage('로그인 상태를 확인해주세요.');
      return;
    }

    if (!presetName || !cellName) {
      setModalMessage('프리셋 이름과 세포 이름은 필수 입력값입니다.');
      return;
    }
    
    const numericFields = {
      totalVolume: totalVolume,
      targetCells: targetCells,
      targetExponent: targetExponent,
    };
    if (calculationMethod === 'hemocytometer') {
      numericFields.dilutionFactor = dilutionFactor;
    }
    
    for (const [key, value] of Object.entries(numericFields)) {
      if (value !== '' && isNaN(parseFloat(value))) {
        setModalMessage(`'${key}' 필드에 올바른 숫자를 입력해주세요.`);
        return;
      }
    }

    const newPreset = {
      presetName: presetName,
      cellName: cellName,
      type: type || '',
      calculationMethod: calculationMethod,
      totalVolume: parseFloat(totalVolume) || 0,
      targetCells: parseFloat(targetCells) || 0,
      targetExponent: parseFloat(targetExponent) || 6,
    };

    if (calculationMethod === 'hemocytometer') {
      newPreset.dilutionFactor = parseFloat(dilutionFactor) || 0;
    } else if (calculationMethod === 'autoCounter') {
      newPreset.totalVolume = parseFloat(totalVolume) || 0;
    }

    const presetId = `${presetName}-${calculationMethod}`;
    const collectionName = calculationMethod === 'hemocytometer' ? 'hemocytometerPresets' : 'autoCounterPresets';

    try {
      await setDoc(doc(db, `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/${collectionName}`, presetId), newPreset);
      setModalMessage(`프리셋 "${presetName}"이 저장되었습니다.`);
      updateTypeHistory(type);
    } catch (e) {
      setModalMessage('프리셋 저장에 실패했습니다: ' + e.message);
    }
  };

  const saveLog = async (logData) => {
    if (!db || !userId) {
      setModalMessage('로그인 상태를 확인해주세요.');
      return false;
    }
    
    try {
      await addDoc(collection(db, `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/dailyLogs`), logData);
      updateTypeHistory(type);
      return true;
    } catch (e) {
      setModalMessage('기록 저장에 실패했습니다: ' + e.message);
      return false;
    }
  };

  const calculate = async () => {
    let cellsPerMl = 0;
    let totalVol = parseFloat(totalVolume);
    const totalTargetCells = parseFloat(targetCells) * Math.pow(10, targetExponent);
    let logData = { presetName: presetName, cellName: cellName, type: type, totalVolume: totalVol, timestamp: serverTimestamp(), memo };
    let requiredVolume = null;
    let calculatedViability = null;
    let dilution = parseFloat(dilutionFactor);

    if (calculationMethod === 'hemocytometer') {
      const counted = parseFloat(countedCells);
      const numSquares = parseFloat(squares);

      if (
        isNaN(counted) || counted <= 0 ||
        isNaN(numSquares) || numSquares <= 0 ||
        isNaN(dilution) || dilution <= 0 ||
        isNaN(totalVol) || totalVol <= 0
      ) {
        setResult('모든 필수 입력값은 0보다 큰 숫자여야 합니다.');
        return;
      }
      cellsPerMl = (counted / numSquares) * dilution * 1e4;
      
      logData = {
        ...logData,
        countedCells: counted,
        squares: numSquares,
        dilutionFactor: dilution,
        method: 'Hemocytometer',
        cellsPerMl: cellsPerMl,
      };

    } else if (calculationMethod === 'autoCounter') {
      const autoCount = parseFloat(autoCountValue);
      const autoExponent = parseFloat(autoCountExponent);
      const viabilityValue = parseFloat(viability);
      
      if (isNaN(autoCount) || autoCount <= 0) {
        setResult('세포 농도 값 (예: 2.4)을 0보다 큰 숫자로 입력해주세요.');
        return;
      }
      if (isNaN(viabilityValue) || viabilityValue < 0) {
        setResult('Viability 값 (%)을 0 이상의 숫자로 입력해주세요.');
        return;
      }
      if (isNaN(totalVol) || totalVol <= 0) {
        setResult('총 부피 (mL)를 0보다 큰 숫자로 입력해주세요.');
        return;
      }

      cellsPerMl = autoCount * Math.pow(10, autoExponent);
      calculatedViability = viabilityValue;
      
      logData = {
        ...logData,
        autoCountValue: autoCount,
        autoCountExponent: autoExponent,
        viability: viabilityValue,
        totalVolume: totalVol,
        method: 'Automated Cell Counter',
        cellsPerMl: cellsPerMl,
      };
    }
    
    const totalCells = cellsPerMl * totalVol;
    if (!isNaN(totalTargetCells) && totalCells > 0) {
      requiredVolume = totalTargetCells / cellsPerMl;
      if (requiredVolume > totalVol) {
        setResult('목표 총 세포 수가 현재 총 세포 수보다 많아 필요한 부피가 총 부피를 초과합니다.');
        return;
      }
      requiredVolume *= 1000;
    }
    
    setResult({ cellsPerMl, totalCells, requiredVolume, totalTargetCells, targetExponent });
    logData = {
      ...logData,
      cellsPerMl: cellsPerMl,
      totalCells: totalCells,
      requiredVolume: requiredVolume,
      targetCells: targetCells,
      targetExponent: targetExponent,
      viability: calculatedViability
    };

    const saved = await saveLog(logData);
    if (saved) {
      setModalMessage('계산 결과가 성공적으로 기록되었습니다!');
    }
  };

  const formatScientificNotation = (num) => {
    if (isNaN(num)) return '-';
    const [coefficient, exponent] = num.toExponential(2).split('e+');
    return `${coefficient} x 10<sup>${exponent}</sup>`;
  };

  const PresetButtons = ({ presets, onSelect, onDelete }) => (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => (
        <div key={preset.id} className="relative">
          <button
            onClick={() => onSelect(preset)}
            className="px-4 py-2 pr-8 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-300"
          >
            {preset.presetName}
          </button>
          <button
            onClick={() => onDelete(preset)}
            className="absolute top-0 right-0 h-full w-8 bg-red-500 text-white rounded-r-lg flex items-center justify-center text-xs"
          >
            X
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {modalMessage && <Modal message={modalMessage} onClose={() => setModalMessage(null)} />}
      <h2 className="text-2xl font-semibold text-center mb-4">세포 수 계산기</h2>
      <div className="flex justify-center space-x-4 mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            name="calculationMethod"
            value="hemocytometer"
            checked={calculationMethod === 'hemocytometer'}
            onChange={(e) => {
              setCalculationMethod(e.target.value);
              setResult(null);
            }}
            className="form-radio text-blue-600"
          />
          <span>Hemocytometer</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            name="calculationMethod"
            value="autoCounter"
            checked={calculationMethod === 'autoCounter'}
            onChange={(e) => {
              setCalculationMethod(e.target.value);
              setResult(null);
            }}
            className="form-radio text-blue-600"
          />
          <span className="cursor-pointer font-bold text-blue-600">Automated Cell Counter</span>
        </label>
      </div>
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">프리셋 선택</h3>
        {calculationMethod === 'hemocytometer' ? (
          <PresetButtons
            presets={hemocytometerPresets}
            onSelect={selectPreset}
            onDelete={deletePreset}
          />
        ) : (
          <PresetButtons
            presets={autoCounterPresets}
            onSelect={selectPreset}
            onDelete={deletePreset}
          />
        )}
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-gray-700">프리셋 이름</label>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={calculationMethod === 'hemocytometer' ? "293T-Hemo" : "293T-Auto"}
          />
        </div>
        <div className="flex gap-2">
          <div className="w-1/2">
            <label className="block text-gray-700">세포 이름</label>
            <input
              type="text"
              value={cellName}
              onChange={(e) => setCellName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={calculationMethod === 'hemocytometer' ? "293T" : "293T"}
            />
          </div>
          <div className="w-1/2">
            <label className="block text-gray-700">종류 <span className="text-gray-500">(선택 사항)</span></label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              list="type-history"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={calculationMethod === 'hemocytometer' ? "GFP" : "GFP"}
            />
            <datalist id="type-history">
              {typeHistory.map((historyItem, index) => (
                <option key={index} value={historyItem} />
              ))}
            </datalist>
          </div>
        </div>

        {calculationMethod === 'hemocytometer' && (
          <>
            <div>
              <label className="block text-gray-700">계수된 세포 수 (총 개)</label>
              <input
                type="number"
                value={countedCells}
                onChange={(e) => setCountedCells(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="235"
              />
            </div>
            <div className="flex gap-2">
              <div className="w-1/2">
                <label className="block text-gray-700">세포를 센 칸 수</label>
                <input
                  type="number"
                  value={squares}
                  onChange={(e) => setSquares(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="4"
                />
              </div>
              <div className="w-1/2">
                <label className="block text-gray-700">희석 배율</label>
                <input
                  type="number"
                  value={dilutionFactor}
                  onChange={(e) => setDilutionFactor(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="20"
                />
              </div>
            </div>
          </>
        )}
        
        {calculationMethod === 'autoCounter' && (
          <>
            <div>
              <label className="block text-gray-700">세포 농도 (예: 2.4)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={autoCountValue}
                  onChange={(e) => setAutoCountValue(e.target.value)}
                  className="w-2/3 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5.05"
                />
                <select
                  value={autoCountExponent}
                  onChange={(e) => setAutoCountExponent(e.target.value)}
                  className="w-1/3 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="4">x 10⁴</option>
                  <option value="5">x 10⁵</option>
                  <option value="6">x 10⁶</option>
                  <option value="7">x 10⁷</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-gray-700">Viability (%)</label>
              <input
                type="number"
                value={viability}
                onChange={(e) => setViability(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="84"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-gray-700">총 부피 (mL)</label>
          <input
            type="number"
            value={totalVolume}
            onChange={(e) => setTotalVolume(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={calculationMethod === 'hemocytometer' ? "1" : "1"}
          />
        </div>
        <div>
          <label className="block text-gray-700">목표 세포 수 (cells) <span className="text-gray-500">(선택 사항)</span></label>
          <div className="flex gap-2">
            <input
              type="number"
              value={targetCells}
              onChange={(e) => setTargetCells(e.target.value)}
              className="w-2/3 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1"
            />
            <select
              value={targetExponent}
              onChange={(e) => setTargetExponent(e.target.value)}
              className="w-1/3 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="4">x 10⁴</option>
              <option value="5">x 10⁵</option>
              <option value="6">x 10⁶</option>
              <option value="7">x 10⁷</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-gray-700">메모 <span className="text-gray-500">(선택 사항)</span></label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="2"
            placeholder={calculationMethod === 'hemocytometer' ? "Prepare to transduction" : "Subculture"}
          ></textarea>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={calculate}
          className="w-full p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-300 shadow-md flex-grow"
        >
          계산
        </button>
        <button
          onClick={addPreset}
          className="w-full p-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition duration-300 shadow-md flex-grow"
        >
          현재 값 프리셋으로 저장
        </button>
      </div>

      {result && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg shadow-inner">
          {typeof result === 'string' ? (
            <p className="text-red-500 text-center">{result}</p>
          ) : (
            <div className="space-y-2">
              <p className="font-medium text-gray-800">
                총 세포 수: <span className="font-bold text-indigo-700" dangerouslySetInnerHTML={{ __html: formatScientificNotation(result.totalCells) }} /> cells
              </p>
              {result.totalTargetCells && (
                <p className="font-medium text-gray-800">
                  목표 세포 수: <span className="font-bold text-indigo-700" dangerouslySetInnerHTML={{ __html: formatScientificNotation(result.totalTargetCells) }} /> cells
                </p>
              )}
              {result.requiredVolume && (
                <p className="font-medium text-gray-800">
                  필요한 부피: <span className="font-bold text-indigo-700">{result.requiredVolume?.toFixed(2) || '-'} μL</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CellCountCalculator;