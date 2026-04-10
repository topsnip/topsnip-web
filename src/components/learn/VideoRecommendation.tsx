import Image from 'next/image';

interface VideoRecProps {
  videoId: string;
  title: string;
  channelName: string;
  duration: string;
  reason: string;
}

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const h = match[1] ? `${match[1]}:` : '';
  const m = (match[2] || '0').padStart(h ? 2 : 1, '0');
  const s = (match[3] || '0').padStart(2, '0');
  return `${h}${m}:${s}`;
}

export function VideoRecommendation({ videoId, title, channelName, duration, reason }: VideoRecProps) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-xl bg-[#111] border border-white/5 hover:border-[#7C6AF7]/30 transition-colors"
    >
      <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-[#0a0a0a]">
        <Image
          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
          alt={title}
          fill
          className="object-cover"
          sizes="128px"
        />
        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
          {formatDuration(duration)}
        </span>
      </div>
      <div className="flex flex-col justify-center min-w-0">
        <p className="text-sm font-medium text-[#F0F0F0] line-clamp-2">{title}</p>
        <p className="text-xs text-[#666] mt-0.5">{channelName}</p>
        <p className="text-xs text-[#7C6AF7] mt-1 line-clamp-1">{reason}</p>
      </div>
    </a>
  );
}
