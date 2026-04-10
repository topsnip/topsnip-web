const CATEGORY_COLORS: Record<string, string> = {
  'Model Launch': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Tool Update': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Research': 'bg-green-500/20 text-green-300 border-green-500/30',
  'Policy': 'bg-red-500/20 text-red-300 border-red-500/30',
  'Tutorial': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Industry': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  'Opinion': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const DEFAULT_COLOR = 'bg-gray-500/20 text-gray-300 border-gray-500/30';

export function CategoryBadge({ category }: { category: string }) {
  const colorClass = CATEGORY_COLORS[category] || DEFAULT_COLOR;
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full border ${colorClass}`}>
      {category}
    </span>
  );
}
