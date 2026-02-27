export default function BranchingLogicEditor({ branching, onChange }: { branching?: any; onChange: (b: any) => void }) {
  // Placeholder for visual branching logic editor
  return (
    <div className="mt-2">
      <label className="block text-xs text-gray-500 mb-1">Branching Logic</label>
      <input
        className="border px-2 py-1 rounded w-full"
        value={branching?.condition || ''}
        onChange={e => onChange({ ...branching, condition: e.target.value })}
        placeholder="e.g., If answer is 'Yes', go to Question 3"
      />
    </div>
  );
}
