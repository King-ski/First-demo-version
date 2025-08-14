// MemoModal.js

import React, { useState } from 'react';

const MemoModal = ({ log, onClose, onSave }) => {
  const [memo, setMemo] = useState(log.memo || '');

  const handleSave = () => {
    onSave(log.id, memo);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
        <h3 className="text-xl font-bold mb-4">메모 추가 / 수정</h3>
        <p className="text-sm text-gray-500 mb-2">기록: {log.cellName} {log.type && `- ${log.type}`}</p>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          rows="4"
          placeholder="여기에 메모를 입력하세요..."
        ></textarea>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemoModal;