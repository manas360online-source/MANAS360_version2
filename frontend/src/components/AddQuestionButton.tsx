export default function AddQuestionButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
      onClick={onClick}
    >
      + Add Question
    </button>
  );
}
