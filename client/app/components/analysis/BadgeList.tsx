interface BadgeListProps {
  items: string[];
  emptyMessage: string;
}

export default function BadgeList({ items, emptyMessage }: BadgeListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
