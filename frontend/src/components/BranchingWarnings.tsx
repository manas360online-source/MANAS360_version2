import { useSessionBuilder } from '../store/useSessionBuilder';

export default function BranchingWarnings() {
  const { templateWarnings } = useSessionBuilder();
  if (!templateWarnings || templateWarnings.length === 0) return null;
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-300 p-3 rounded">
      <h4 className="text-sm font-semibold text-yellow-800">Branching Warnings</h4>
      <ul className="text-xs text-yellow-700 mt-2 list-disc pl-4">
        {templateWarnings.map((w: string, i: number) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
