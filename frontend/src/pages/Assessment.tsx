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
    <div className="responsive-page bg-wellness-bg animate-fadeIn">
      <div className="responsive-container section-stack py-8 sm:py-12">
      {/* Header */}
      <div className="w-full max-w-screen-lg mx-auto flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div className="font-serif text-2xl font-normal text-wellness-text tracking-wide cursor-pointer hover:opacity-80 transition-smooth" onClick={() => navigate('/')}>
          MANAS<span className="font-semibold text-calm-sage">360</span>
        </div>
        <div className="text-sm font-medium text-wellness-text bg-calm-sage/15 px-5 py-2 rounded-full">
          Assessment
        </div>
      </div>

      <div className="w-full max-w-screen-md mx-auto section-stack gap-12 sm:gap-16 lg:gap-20">
        
        {/* Question 1 */}
        <section>
          <h2 className="font-serif text-2xl sm:text-3xl text-wellness-text mb-8 leading-tight font-light">
            In the past 2 weeks, which of these have you experienced?
            <span className="block text-sm font-sans text-wellness-muted font-normal mt-3 tracking-wide">Select all that apply</span>
          </h2>
          <div className="flex flex-wrap gap-3">
            {symptomsOptions.map((option) => {
              const isSelected = symptoms.includes(option);
              return (
                <button
                  key={option}
                  onClick={() => toggleSymptom(option)}
                  className={`
                    px-6 py-3.5 rounded-full text-base font-medium transition-smooth border-2
                    ${isSelected 
                      ? 'bg-calm-sage text-white border-calm-sage shadow-soft-md transform scale-[1.02]' 
                      : 'bg-white text-wellness-text border-calm-sage/20 hover:border-calm-sage/40 hover:bg-calm-sage/5'
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
          <h2 className="font-serif text-2xl sm:text-3xl text-wellness-text mb-8 leading-tight font-light">
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
                    flex-1 min-w-[120px] px-5 py-3.5 rounded-full text-base font-medium transition-smooth border-2 text-center whitespace-nowrap
                    ${isSelected 
                      ? 'bg-gentle-blue text-white border-gentle-blue shadow-soft-md' 
                      : 'bg-white text-wellness-text border-gentle-blue/20 hover:border-gentle-blue/40 hover:bg-gentle-blue/5'
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
          <h2 className="font-serif text-2xl sm:text-3xl text-wellness-text mb-8 leading-tight font-light">
            Have you thought about hurting yourself?
          </h2>
          <div className="flex flex-col gap-3 max-w-md w-full">
            {selfHarmOptions.map((option) => {
              const isSelected = selfHarm === option;
              return (
                <button
                  key={option}
                  onClick={() => setSelfHarm(option)}
                  className={`
                    w-full px-7 py-4 rounded-2xl text-base font-medium transition-smooth border-2 text-left flex justify-between items-center
                    ${isSelected 
                      ? 'bg-soft-lavender text-white border-soft-lavender shadow-soft-md' 
                      : 'bg-white text-wellness-text border-soft-lavender/20 hover:border-soft-lavender/40 hover:bg-soft-lavender/5'
                    }
                  `}
                >
                  {option}
                  {isSelected && <span className="text-xl">✓</span>}
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
              responsive-action-btn w-full rounded-full text-lg font-semibold tracking-wide transition-smooth shadow-soft-md
              ${(!selfHarm || !impact)
                ? 'bg-wellness-surface text-wellness-muted cursor-not-allowed'
                : 'bg-gradient-calm text-white hover:shadow-soft-lg hover:-translate-y-1'
              }
            `}
          >
            Submit • Analyze My Results
          </button>
        </div>

      </div>
      </div>
    </div>
  );
};
