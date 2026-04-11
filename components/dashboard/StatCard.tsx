interface StatCardProps {
  label: string;
  count: number;
  color: 'gray' | 'blue' | 'green' | 'purple' | 'teal';
  isActive: boolean;
  onClick: () => void;
}

const colorStyles: Record<string, { bg: string; text: string; border: string }> = {
  gray: {
    bg: 'bg-gray-50',
    text: 'text-gray-900',
    border: 'border-gray-200',
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  teal: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
  },
};

export function StatCard({ label, count, color, isActive, onClick }: StatCardProps) {
  const styles = colorStyles[color];

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center p-4 rounded-lg border transition-all
        ${styles.bg} ${styles.border}
        hover:shadow-md cursor-pointer
        ${isActive ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
      `}
    >
      <span className={`text-3xl font-bold ${styles.text}`}>{count}</span>
      <span className="text-sm text-gray-600 mt-1">{label}</span>
    </button>
  );
}
