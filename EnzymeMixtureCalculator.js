// EnzymeMixtureCalculator.js

import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, setDoc, deleteDoc, serverTimestamp, doc } from 'firebase/firestore';
import Modal from './Modal';

const EnzymeMixtureCalculator = ({ db, userId }) => {
  const [mixtureName, setMixtureName] = useState('');
  const [ingredients, setIngredients] = useState([
    { id: 1, name: 'DNA/RNA', composition: '2', unit: 'μg', stock: '500' },
    { id: 2, name: 'Buffer', composition: '1', unit: 'X', stock: '10' },
    { id: 3, name: 'Enzyme', composition: '0.5', unit: 'μL', stock: '' },
  ]);
  const [totalVolume, setTotalVolume] = useState('100');
  const [xMixture, setXMixture] = useState('1');
  const [modalMessage, setModalMessage] = useState(null);
  const [mixturePresets, setMixturePresets] = useState([]);

  useEffect(() => {
    if (db && userId) {
      const presetsCollectionRef = collection(db, `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/mixturePresets`);
      const unsubscribe = onSnapshot(presetsCollectionRef, (snapshot) => {
        const presetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMixturePresets(presetsData);
      });
      return () => unsubscribe();
    }
  }, [db, userId]);

  const formatVolume = (volume) => {
    return !isNaN(volume) ? parseFloat(volume).toFixed(2) : '-';
  };
  
  const calculateBaseVolume = (ing) => {
    const totalVol = parseFloat(totalVolume) || 0;
    if (!ing) return 0;
    if (ing.name.toLowerCase().includes('dna') || ing.name.toLowerCase().includes('rna')) {
        const dnaAmountInNg = parseFloat(ing.composition) * 1000;
        const dnaConc = parseFloat(ing.stock);
        return (!isNaN(dnaAmountInNg) && !isNaN(dnaConc) && dnaConc !== 0) ? (dnaAmountInNg / dnaConc) : 0;
    } else if (ing.name.toLowerCase().includes('buffer')) {
      const xValue = parseFloat(ing.composition);
      return (!isNaN(xValue) && xValue !== 0 && !isNaN(totalVol)) ? (totalVol / xValue) : 0;
    } else {
      return parseFloat(ing.composition) || 0;
    }
  };

  const calculateDwVolume = () => {
    const totalVol = parseFloat(totalVolume) || 0;
    const sumOfVolumes = ingredients
      .reduce((acc, ing) => {
        let volume = calculateBaseVolume(ing);
        return acc + (isNaN(volume) ? 0 : volume);
      }, 0);
    return Math.max(0, totalVol - sumOfVolumes);
  };
  
  const handleXMixtureChange = (e) => {
    setXMixture(e.target.value);
  };
  
  const handleIngredientChange = (id, field, value) => {
    setIngredients(prev =>
      prev.map(ing => (ing.id === id ? { ...ing, [field]: value } : ing))
    );
  };

  const addIngredient = () => {
    setIngredients(prev => {
        const newIng = { id: Date.now(), name: 'New Ingredient', composition: '', unit: 'μL', stock: '' };
        return [...prev, newIng];
    });
  };

  const handleSaveClick = async () => {
    if (!db || !userId) {
      setModalMessage('로그인 상태를 확인해주세요.');
      return;
    }

    if (!mixtureName || isNaN(parseFloat(xMixture)) || parseFloat(xMixture) <= 0) {
      setModalMessage('Mixture 종류와 X Mixture 값을 올바르게 입력해주세요.');
      return;
    }
    
    const finalIngredients = ingredients.map(ing => ({
        ...ing,
        baseVolume: calculateBaseVolume(ing),
        finalVolume: calculateBaseVolume(ing) * parseFloat(xMixture),
    }));
    finalIngredients.push({
      id: Date.now(),
      name: 'D.W',
      composition: 'Up to',
      baseVolume: calculateDwVolume(),
      finalVolume: calculateDwVolume() * parseFloat(xMixture),
    });

    try {
      const logData = {
        mixtureName,
        ingredients: finalIngredients,
        totalVolume: parseFloat(totalVolume),
        xMixture: parseFloat(xMixture),
        timestamp: serverTimestamp(),
      };
      const presetId = `${mixtureName}-${Date.now()}`;
      await setDoc(doc(db, `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/mixturePresets`, presetId), logData);
      setMixtureName('');
      setIngredients([
        { id: 1, name: 'DNA/RNA', composition: '2', unit: 'μg', stock: '500' },
        { id: 2, name: 'Buffer', composition: '1', unit: 'X', stock: '10' },
        { id: 3, name: 'Enzyme', composition: '0.5', unit: 'μL', stock: '' },
      ]);
      setTotalVolume('100');
      setXMixture('1');
      setModalMessage(`프리셋 "${mixtureName}"이 성공적으로 저장되었습니다!`);
    } catch (e) {
      setModalMessage('기록 저장에 실패했습니다: ' + e.message);
    }
  };

  const deletePreset = async (presetToDelete) => {
    if (!db || !userId) {
      setModalMessage('로그인 상태를 확인해주세요.');
      return;
    }
    try {
      await deleteDoc(doc(db, `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/mixturePresets`, presetToDelete.id));
      setMixtureName('');
      setIngredients([
        { id: 1, name: 'DNA/RNA', composition: '2', unit: 'μg', stock: '500' },
        { id: 2, name: 'Buffer', composition: '1', unit: 'X', stock: '10' },
        { id: 3, name: 'Enzyme', composition: '0.5', unit: 'μL', stock: '' },
      ]);
      setTotalVolume('100');
      setXMixture('1');
      setModalMessage(`프리셋 "${presetToDelete.mixtureName}"이 삭제되었습니다.`);
    } catch (e) {
      setModalMessage('프리셋 삭제에 실패했습니다: ' + e.message);
    }
  };

  const loadPreset = (preset) => {
    setMixtureName(preset.mixtureName);
    setTotalVolume(preset.totalVolume.toString());
    setXMixture(preset.xMixture.toString());
    const loadedIngredients = preset.ingredients.filter(ing => ing.name !== 'D.W');
    setIngredients(loadedIngredients);
    setModalMessage(`프리셋 "${preset.mixtureName}"이 불러와졌습니다.`);
  };
  
  const calculatedTotalVolume = parseFloat(totalVolume) || 0;
  const calculatedXMixture = parseFloat(xMixture) || 0;

  return (
    <div className="space-y-4">
      {modalMessage && <Modal message={modalMessage} onClose={() => setModalMessage(null)} />}
      <h2 className="text-2xl font-semibold text-center mb-4">Mixture 계산기</h2>
      <div className="flex gap-2 items-center mb-4">
        <label className="block text-gray-700">Mixture 종류:</label>
        <input
          type="text"
          value={mixtureName}
          onChange={(e) => setMixtureName(e.target.value)}
          className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Ex: T4 Ligation"
        />
      </div>
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">프리셋 선택</h3>
        <div className="flex flex-wrap gap-2">
          {mixturePresets.map((preset) => (
            <div key={preset.id} className="relative">
              <button
                onClick={() => loadPreset(preset)}
                className="px-4 py-2 pr-8 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-300"
              >
                {preset.mixtureName}
              </button>
              <button
                onClick={() => deletePreset(preset)}
                className="absolute top-0 right-0 h-full w-8 bg-red-500 text-white rounded-r-lg flex items-center justify-center text-xs"
              >
                X
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow-md">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">재료</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">조성</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">용량 (μL)</th>
              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <input type="number" value={xMixture} onChange={handleXMixtureChange} className="w-16 bg-white border rounded p-1 text-sm text-center" />
                x Mixture
              </th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map(ing => {
              const baseVolume = calculateBaseVolume(ing);
              const finalVolume = baseVolume * calculatedXMixture;

              return (
                <tr key={ing.id} className="border-b border-gray-200">
                  <td className="p-3 text-sm text-gray-800">
                    <input type="text" value={ing.name} onChange={(e) => handleIngredientChange(ing.id, 'name', e.target.value)} className="w-24 bg-white border rounded p-1 text-sm text-center" />
                  </td>
                  <td className="p-3 text-sm text-gray-800">
                    {ing.name.toLowerCase().includes('dna') || ing.name.toLowerCase().includes('rna') ? (
                      <>
                        <input type="number" value={ing.stock} onChange={(e) => handleIngredientChange(ing.id, 'stock', e.target.value)} className="w-20 bg-white border rounded p-1 text-sm text-center" /> ng/μL
                        <br/>
                        <input type="number" value={ing.composition} onChange={(e) => handleIngredientChange(ing.id, 'composition', e.target.value)} className="w-20 bg-white border rounded p-1 text-sm text-center" /> μg
                      </>
                    ) : ing.name.toLowerCase().includes('buffer') ? (
                      <>
                        <select value={ing.composition} onChange={(e) => handleIngredientChange(ing.id, 'composition', e.target.value)} className="w-20 bg-white border rounded p-1 text-sm text-center">
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                          <option value="6">6</option>
                          <option value="7">7</option>
                          <option value="8">8</option>
                          <option value="9">9</option>
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="100">100</option>
                        </select> X
                      </>
                    ) : (
                      <input type="number" value={ing.composition} onChange={(e) => handleIngredientChange(ing.id, 'composition', e.target.value)} className="w-20 bg-white border rounded p-1 text-sm text-center" />
                    )}
                  </td>
                  <td className="p-3 text-sm text-gray-800">
                    <span className="w-20 bg-gray-200 border rounded p-1 text-sm text-center block">{formatVolume(baseVolume)}</span>
                  </td>
                  <td className="p-3 text-sm text-gray-800">
                    {formatVolume(finalVolume)} μL
                  </td>
                </tr>
              );
            })}
            <tr className="border-b border-gray-200">
              <td className="p-3 text-sm text-gray-800">D.W</td>
              <td className="p-3 text-sm text-gray-800">Up to</td>
              <td className="p-3 text-sm text-gray-800">
                <span className="w-20 bg-gray-200 border rounded p-1 text-sm text-center block">{formatVolume(calculateDwVolume())}</span>
              </td>
              <td className="p-3 text-sm text-gray-800">{formatVolume(calculateDwVolume() * calculatedXMixture)} μL</td>
            </tr>
            <tr className="bg-gray-100">
              <td className="p-3 font-bold text-sm text-gray-800">Total volume</td>
              <td className="p-3 font-bold text-sm text-gray-800">
                <input type="number" value={totalVolume} onChange={(e) => setTotalVolume(e.target.value)} className="w-20 bg-white border rounded p-1 text-sm text-center" /> μL
              </td>
              <td className="p-3 font-bold text-sm text-gray-800"></td>
              <td className="p-3 font-bold text-sm text-gray-800">
                <input type="number" value={calculatedTotalVolume * calculatedXMixture} readOnly className="w-20 bg-gray-200 border rounded p-1 text-sm text-center" /> μL
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-between">
        <button
          onClick={addIngredient}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition duration-300 shadow-md"
        >
          + 재료 추가
        </button>
        <button
          onClick={handleSaveClick}
          className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition duration-300 shadow-md"
        >
          저장
        </button>
      </div>
    </div>
  );
};

export default EnzymeMixtureCalculator;