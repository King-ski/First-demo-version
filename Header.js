// Header.js

import React from 'react';

const Header = ({ onCalculatorSelect }) => (
  <div className="bg-white p-4 rounded-xl shadow-lg w-full max-w-2xl mb-6">
    <h1 className="text-3xl font-bold text-center text-gray-800 mb-4">실험 계산기</h1>
    <p className="text-center text-gray-600 mb-4">
      자주 사용하는 실험 계산을 쉽게 할 수 있도록 도와주는 앱입니다. 아래 버튼을 눌러 원하는 계산기를 선택하세요.
    </p>
    <div className="flex justify-center space-x-4">
      <button
        onClick={() => onCalculatorSelect('cellCount')}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300 shadow-md"
      >
        세포 수 계산기
      </button>
      <button
        onClick={() => onCalculatorSelect('enzymeMixture')}
        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300 shadow-md"
      >
        Mixture 계산기
      </button>
    </div>
  </div>
);

export default Header;