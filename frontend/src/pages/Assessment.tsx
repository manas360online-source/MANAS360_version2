import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AssessmentProps {
  onSubmit: (data: any, isCritical: boolean) => void;
}

export const Assessment: React.FC<AssessmentProps> = ({ onSubmit }) => {
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [impact, setImpact] = useState<string>('');
  const [selfHarm, setSelfHarm] = useState<string>('');

  const toggleSymptom = (option: string) => {
    if (symptoms.includes(option)) {
      setSymptoms(symptoms.filter((s) => s !== option));
    } else {
      setSymptoms([...symptoms, option]);
    }
  };

  const handleFinish = () => {
    if (!selfHarm || !impact) {
      alert("Please answer all required questions.");
      return;
    }

    const isCritical = selfHarm === "Yes, and I have a plan";
    
    onSubmit({
      symptoms,
      impact,
      selfHarm
    }, isCritical);
    
    if (isCritical) {
      navigate('/crisis');
    } else {
      navigate('/results');
    }
  };

  const symptomsOptions = [
    "Feeling down, sad, or hopeless",
    "Little interest in things you enjoy",
    "Constant worry or nervousness",
    "Racing thoughts or can't focus",
    "Nightmares or disturbing memories",
    "Avoiding people or situations",
    "Sudden mood swings (high to low)",
    "Intrusive thoughts you can't control",
    "Hearing/seeing things others don't",
    "Trouble sleeping or sleeping too much",
    "Can't sit still or restless energy",
    "Forget things or lose track easily"
  ];

  const impactOptions = [
    "Not at all",
    "A little",
    "Moderately",
    "Severely",
    "Extremely"
  ];

  const selfHarmOptions = [
    "No",
    "Sometimes, but no plan",
    "Yes, and I have a plan"
  ];

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex flex-col items-center py-12 px-6 animate-fade-in">
      {/* Header */}
      <div className="w-full max-w-3xl mb-12 flex justify-between items-center">
        <div className="font-serif text-[1.4rem] font-medium text-[#000000] tracking-[0.1em] uppercase cursor-pointer" onClick={() => navigate('/')}>
          MANAS<span className="font-semibold text-[#0A4E89]">360</span>
        </div>
        <div className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest bg-[#F1F4F6] px-4 py-1 rounded-full">
          Assessment
        </div>
      </div>

      <div className="w-full max-w-2xl space-y-16">
        
        {/* Question 1 */}
        <section>
          <h2 className="font-serif text-[1.8rem] text-[#000000] mb-6 leading-tight">
            In the past 2 weeks, which of these have you experienced?
            <span className="block text-sm font-sans text-[#475569] font-normal mt-2 tracking-wide uppercase">Select all that apply</span>
          </h2>
          <div className="flex flex-wrap gap-3">
            {symptomsOptions.map((option) => {
              const isSelected = symptoms.includes(option);
              return (
                <button
                  key={option}
                  onClick={() => toggleSymptom(option)}
                  className={`
                    px-6 py-3 rounded-full text-[1rem] font-medium transition-all duration-200 border
                    ${isSelected 
                      ? 'bg-[#1FA2DE] text-white border-transparent shadow-md transform scale-105' 
                      : 'bg-[#F1F4F6] text-[#1A1A1A] border-[#D5D9DD] hover:bg-slate-100'
                    }
                  `}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </section>

        {/* Question 2 */}
        <section>
          <h2 className="font-serif text-[1.8rem] text-[#000000] mb-6 leading-tight">
            How much do these affect your daily life?
          </h2>
          <div className="flex flex-wrap gap-3">
            {impactOptions.map((option) => {
              const isSelected = impact === option;
              return (
                <button
                  key={option}
                  onClick={() => setImpact(option)}
                  className={`
                    flex-1 min-w-[120px] px-4 py-3 rounded-full text-[1rem] font-medium transition-all duration-200 border text-center whitespace-nowrap
                    ${isSelected 
                      ? 'bg-[#1FA2DE] text-white border-transparent shadow-md' 
                      : 'bg-[#F1F4F6] text-[#1A1A1A] border-[#D5D9DD] hover:bg-slate-100'
                    }
                  `}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </section>

        {/* Question 3 */}
        <section>
          <h2 className="font-serif text-[1.8rem] text-[#000000] mb-6 leading-tight">
            Have you thought about hurting yourself?
          </h2>
          <div className="flex flex-col gap-3 max-w-md">
            {selfHarmOptions.map((option) => {
              const isSelected = selfHarm === option;
              return (
                <button
                  key={option}
                  onClick={() => setSelfHarm(option)}
                  className={`
                    w-full px-6 py-4 rounded-full text-[1.1rem] font-medium transition-all duration-200 border text-left flex justify-between items-center
                    ${isSelected 
                      ? 'bg-[#1FA2DE] text-white border-transparent shadow-md' 
                      : 'bg-[#F1F4F6] text-[#1A1A1A] border-[#D5D9DD] hover:bg-slate-100'
                    }
                  `}
                >
                  {option}
                  {isSelected && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Submit */}
        <div className="pt-8 pb-20">
          <button
            onClick={handleFinish}
            disabled={!selfHarm || !impact}
            className={`
              w-full py-5 rounded-full text-[1.2rem] font-bold tracking-widest uppercase transition-all duration-300 shadow-lg
              ${(!selfHarm || !impact)
                ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                : 'bg-[#0A3157] text-white hover:bg-[#124A85] hover:shadow-xl hover:-translate-y-1'
              }
            `}
          >
            Submit • Analyze My Results
          </button>
        </div>

      </div>
    </div>
  );
};
