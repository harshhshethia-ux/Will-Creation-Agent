import React, { useState } from 'react';
import { Lock, KeyRound, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { verifyAdminPin, ADMIN_MASTER_PIN } from '../services/verificationService';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPin(pin)) {
      onSuccess();
      onClose();
    } else {
      setError('Incorrect administrator PIN code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-700" />
            <h3 className="font-serif font-bold text-stone-900 text-base">
              Administrator Master Access
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          Enter the Master Admin PIN to unlock unlimited trials and test bypass controls for this browser.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Master Admin PIN
            </label>
            <input
              type="password"
              autoFocus
              maxLength={6}
              placeholder="Enter PIN (Default: 8492)"
              value={pin}
              onChange={e => {
                setPin(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2.5 text-center text-lg tracking-widest font-mono border border-stone-300 rounded-lg focus:border-stone-900 focus:outline-hidden"
            />
            {error && (
              <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-medium text-stone-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-stone-900 text-amber-100 hover:bg-stone-800 rounded-lg text-xs font-semibold"
            >
              Unlock Demo Mode
            </button>
          </div>
        </form>

        <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-400 text-center">
          Default Master PIN: <span className="font-mono font-bold text-stone-600">8492</span>
        </div>
      </div>
    </div>
  );
};
