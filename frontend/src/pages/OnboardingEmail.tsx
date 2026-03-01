import React, { useState } from 'react';

interface OnboardingEmailProps {
  userName: string;
}

export const OnboardingEmail: React.FC<OnboardingEmailProps> = ({ userName }) => {
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="responsive-page flex items-center justify-center bg-gradient-to-b from-[#E9F5FF] to-white animate-fade-in">
      
      <div className="responsive-container w-full max-w-md">
        <h1 className="font-serif text-[2.5rem] font-bold text-[#0A3A78] text-center mb-4">
          Nice to meet you, {userName || 'friend'}.
        </h1>
        <p className="text-center text-[#2E3A48] mb-10 text-lg">
          Where should we send your personalized plan?
        </p>

        <div className="bg-white rounded-[32px] p-6 sm:p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-[#E0F2FE]">
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-500 mb-2 ml-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-5 py-4 bg-[#F0F9FF] border border-[#A8C8FF] rounded-2xl text-lg text-[#0A3A78] focus:outline-none focus:ring-2 focus:ring-[#1E59FF] transition-all placeholder:text-[#0A3A78]/30"
            />
          </div>

          <div className="flex items-start gap-3 mb-10">
             <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-6 h-6 border-2 border-[#A8C8FF] rounded-md appearance-none checked:bg-[#1E59FF] checked:border-[#1E59FF] transition-all cursor-pointer"
                />
                {agreed && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-sm pointer-events-none">✓</span>
                )}
             </div>
             <p className="text-sm text-slate-500 leading-tight pt-1">
               I agree to the <a href="#" className="text-[#1E59FF] font-bold">Terms of Service</a> and <a href="#" className="text-[#1E59FF] font-bold">Privacy Policy</a>.
             </p>
          </div>

          <button 
            onClick={() => alert("Welcome to Manas360! This is the end of the demo flow.")}
            disabled={!email || !agreed}
            className={`
              responsive-action-btn w-full rounded-full text-lg font-bold text-white transition-all
              ${(email && agreed) 
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
