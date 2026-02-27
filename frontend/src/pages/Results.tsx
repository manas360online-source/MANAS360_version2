import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ResultsPageProps {
  data: {
    symptoms: string[];
    impact: string;
    selfHarm: string;
  } | null;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ data }) => {
  const navigate = useNavigate();
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button onClick={() => window.location.href = '/'} className="text-blue-500 underline">Return Home</button>
      </div>
    );
  }

  const symptomCount = data.symptoms.length;
  let severity = "Mild";
  let emoji = "😊";
  let color = "text-emerald-600";
  let message = "You're showing some mild indicators.";

  if (symptomCount >= 3 && symptomCount < 6) {
    severity = "Moderate";
    emoji = "😟";
    color = "text-orange-500";
    message = "You seem to be carrying a heavy emotional load.";
  } else if (symptomCount >= 6) {
    severity = "Significant";
    emoji = "😞";
    color = "text-red-500";
    message = "Your symptoms suggest you might be facing significant challenges.";
  }

  const primaryCondition = data.symptoms.some(s => s.includes("worry") || s.includes("Racing")) 
    ? "Anxiety" 
    : "Depression";

  return (
    <div className="min-h-screen bg-[#FDFCF8] py-12 px-6 animate-fade-in flex flex-col items-center">
       
       <div className="w-full max-w-3xl mb-12 flex justify-between items-center">
       <div className="font-serif text-[1.4rem] font-medium text-[#000000] tracking-[0.1em] uppercase cursor-pointer" onClick={() => navigate('/')}>
          MANAS<span className="font-semibold text-[#0A4E89]">360</span>
        </div>
        <div className="text-sm font-bold text-[#0A4E89] uppercase tracking-widest bg-[#E0F2FE] px-4 py-1 rounded-full">
          Results
        </div>
      </div>

      <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 p-8 md:p-12 text-center">
        
        <div className="text-[5rem] mb-4 animate-float">{emoji}</div>
        
        <h1 className="font-serif text-[2.5rem] text-[#000000] mb-2">
          {severity} emotional distress
        </h1>
        
        <p className={`text-lg font-medium mb-8 ${color}`}>
          {message}
        </p>

        <div className="bg-slate-50 rounded-3xl p-8 text-left mb-12">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Summary Analysis</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-500 mb-1">Likely Primary Concern</p>
              <p className="text-xl font-serif text-[#000000] font-medium">{primaryCondition} Indicators</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Impact on Daily Life</p>
              <p className="text-xl font-serif text-[#000000] font-medium">{data.impact}</p>
            </div>
            <div className="col-span-1 md:col-span-2">
              <p className="text-sm text-slate-500 mb-2">Key Symptoms Reported</p>
              <div className="flex flex-wrap gap-2">
                {data.symptoms.slice(0, 3).map(s => (
                  <span key={s} className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-sm text-slate-600">
                    {s}
                  </span>
                ))}
                {data.symptoms.length > 3 && (
                  <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-sm text-slate-400">
                    +{data.symptoms.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <button className="
              group flex-1 py-4 px-5
              bg-white border border-[#1FA2DE] text-[#1FA2DE]
              rounded-full font-sans font-bold text-[1rem] md:text-lg
              transition-all duration-300 ease-out
              hover:bg-[#1FA2DE] hover:text-white hover:shadow-[0_10px_25px_-5px_rgba(31,162,222,0.4)]
              active:scale-[0.98]
              flex items-center justify-center gap-2
            ">
              <span>🔵</span> Consult Doctor
            </button>
            
            <button className="
              group flex-1 py-4 px-5
              bg-white border border-[#1FA2DE] text-[#1FA2DE]
              rounded-full font-sans font-bold text-[1rem] md:text-lg
              transition-all duration-300 ease-out
              hover:bg-[#1FA2DE] hover:text-white hover:shadow-[0_10px_25px_-5px_rgba(31,162,222,0.4)]
              active:scale-[0.98]
              flex items-center justify-center gap-2
            ">
              <span>🩺</span> Full Health Assessment
            </button>
          </div>
          
          <button 
            onClick={() => navigate('/home')} 
            className="
              w-full py-5
              bg-white border border-slate-200 text-[#333333]
              rounded-full font-sans font-medium text-lg
              transition-all duration-300
              hover:bg-blue-50 hover:border-blue-200 hover:text-[#0A3A78]
              active:scale-[0.99]
            "
          >
            Skip for now & Return Home
          </button>
        </div>

      </div>

    </div>
  );
};
