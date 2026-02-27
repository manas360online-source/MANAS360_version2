import { useSessionBuilder } from '../store/useSessionBuilder';
import BranchingWarnings from './BranchingWarnings';

export default function SessionHeader() {
  const { version, isDraft } = useSessionBuilder();
  return (
    <div className="flex items-center justify-between border-b pb-2 mb-4">
      <h1 className="text-2xl font-bold">Session Builder</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">Version: {version}</span>
        {isDraft && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Draft</span>}
      </div>
      <div className="w-full mt-3">
        <BranchingWarnings />
      </div>
    </div>
  );
}
