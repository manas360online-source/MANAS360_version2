export default function QuestionTypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      className="border px-2 py-1 rounded"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="text">Text</option>
      <option value="multiple-choice">Multiple Choice</option>
      <option value="scale">Scale (1-5)</option>
      {/* Add more types as needed */}
    </select>
  );
}
