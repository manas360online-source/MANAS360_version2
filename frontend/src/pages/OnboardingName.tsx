import React, { useState } from 'react';

interface OnboardingNameProps {
  onNext: (data: { firstName: string; lastName: string; pronouns: string }) => void;
}

export const OnboardingName: React.FC<OnboardingNameProps> = ({ onNext }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pronouns, setPronouns] = useState('');

  return (
    <div className="responsive-page flex items-center justify-center bg-gradient-to-b from-[#E9F5FF] to-white animate-fade-in">
      
      <div className="responsive-container w-full max-w-md">
        <h1 className="font-serif text-[2.5rem] font-bold text-[#0A3A78] text-center mb-4">
          Let's Start with You
        </h1>
        <p className="text-center text-[#2E3A48] mb-10 text-lg">
          Please share your name with us.
        </p>

        <div className="bg-white rounded-[32px] p-6 sm:p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-[#E0F2FE]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-500 mb-2 ml-1">First name</label>
              <input 
                type="text" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Mah"
                className="w-full px-5 py-4 bg-[#F0F9FF] border border-[#A8C8FF] rounded-2xl text-lg text-[#0A3A78] focus:outline-none focus:ring-2 focus:ring-[#1E59FF] transition-all placeholder:text-[#0A3A78]/30"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-500 mb-2 ml-1">Last name</label>
              <input 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Pa"
                className="w-full px-5 py-4 bg-[#F0F9FF] border border-[#A8C8FF] rounded-2xl text-lg text-[#0A3A78] focus:outline-none focus:ring-2 focus:ring-[#1E59FF] transition-all placeholder:text-[#0A3A78]/30"
              />
            </div>
          </div>

          <div className="mb-10">
            <label className="block text-sm font-medium text-slate-500 mb-2 ml-1">Pronouns (optional)</label>
            <input 
              type="text" 
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder="She/her"
              className="w-full px-5 py-4 bg-[#F0F9FF] border border-[#A8C8FF] rounded-2xl text-lg text-[#0A3A78] focus:outline-none focus:ring-2 focus:ring-[#1E59FF] transition-all placeholder:text-[#0A3A78]/30"
            />
          </div>

          <button 
            onClick={() => {
              if (firstName && lastName) onNext({ firstName, lastName, pronouns });
            }}
            disabled={!firstName || !lastName}
            className={`
              responsive-action-btn w-full rounded-full text-lg font-bold text-white transition-all
              ${(firstName && lastName) 
                ? 'bg-gradient-to-r from-[#1E59FF] to-[#004BCE] hover:shadow-xl hover:-translate-y-1' 
                : 'bg-slate-300 cursor-not-allowed'}
            `}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
