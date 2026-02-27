import { useEffect, useMemo } from 'react';
import { Question, ResponseRecord } from '../types/question';

type Props = {
  question: Question;
  value: any;
  onChange: (value: any) => void;
  onValidate?: (result: ResponseRecord) => void;
};

function validate(question: Question, value: any) {
  const errors: string[] = [];
  if (question.required) {
    const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty) errors.push('This question is required');
  }
  if (question.validation) {
    const v = question.validation;
    if (v.pattern && typeof value === 'string') {
      try {
        const re = new RegExp(v.pattern);
        if (!re.test(value)) errors.push('Invalid format');
      } catch (e) {
        // invalid regex - ignore validation
      }
    }
    if (typeof value === 'number') {
      if (v.min !== undefined && value < v.min) errors.push(`Minimum is ${v.min}`);
      if (v.max !== undefined && value > v.max) errors.push(`Maximum is ${v.max}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export default function QuestionRenderer({ question, value, onChange, onValidate }: Props) {
  useEffect(() => {
    const result = validate(question, value);
    onValidate && onValidate({ value, ...result });
  }, [question, value]);

  const options = useMemo(() => question.options || [], [question.options]);

  switch (question.type) {
    case 'text':
      return (
        <input
          className="border rounded px-2 py-1 w-full"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          aria-label={question.text}
        />
      );
    case 'multiple-choice':
      return (
        <div className="flex flex-col gap-2">
          {options.map(opt => (
            <label key={opt.id} className="inline-flex items-center gap-2">
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      );
    case 'scale':
      // scale 1-5 by default, allow override in metadata
      const min = question.metadata?.min ?? 1;
      const max = question.metadata?.max ?? 5;
      return (
        <select
          className="border rounded px-2 py-1"
          value={value ?? ''}
          onChange={e => onChange(Number(e.target.value))}
        >
          <option value="">Select</option>
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      );
    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <label className="switch">
            <input
              type="checkbox"
              checked={!!value}
              onChange={e => onChange(e.target.checked)}
            />
            <span className="ml-2">{value ? 'Yes' : 'No'}</span>
          </label>
        </div>
      );
    case 'date':
      return (
        <input
          type="date"
          className="border rounded px-2 py-1"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      );
    default:
      return <div>Unsupported question type</div>;
  }
}
