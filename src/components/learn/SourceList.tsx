import { ExternalLink } from 'lucide-react';

interface Source {
  title: string;
  url: string;
  platform: string;
}

export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <ul className="space-y-2">
      {sources.map((source, i) => (
        <li key={i}>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#A0A0A0] hover:text-[#7C6AF7] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{source.title}</span>
            <span className="text-xs text-[#444]">({source.platform})</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
