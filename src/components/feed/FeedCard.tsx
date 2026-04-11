'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CategoryBadge } from '@/components/learn/CategoryBadge';

interface FeedCardProps {
  slug: string;
  headline: string;
  summary: string;
  keyFact: string | null;
  categoryTag: string;
  imageUrl: string | null;
  sourceCount: number;
  publishedAt: string;
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function FeedCard({
  slug, headline, summary, keyFact,
  categoryTag, imageUrl, sourceCount, publishedAt,
}: FeedCardProps) {
  const timeAgo = getTimeAgo(publishedAt);

  return (
    <Link href={`/learn/${slug}`} className="block flex-shrink-0 w-[85vw] max-w-[340px] snap-center">
      <article className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden hover:border-[#7C6AF7]/30 transition-all h-full flex flex-col">
        {/* Image — hero section */}
        <div className="relative aspect-[3/2] bg-[#0a0a0a]">
          {imageUrl ? (
            <Image src={imageUrl} alt={headline} fill className="object-cover" sizes="340px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#7C6AF7]/20 to-[#080808]">
              <div className="w-14 h-14 rounded-full bg-[#7C6AF7]/20 flex items-center justify-center">
                <span className="text-xl text-[#7C6AF7]">AI</span>
              </div>
            </div>
          )}
          {/* Category badge overlaid on image */}
          <div className="absolute top-3 left-3">
            <CategoryBadge category={categoryTag} />
          </div>
          {/* Time ago in corner */}
          <div className="absolute top-3 right-3">
            <span className="text-[10px] text-white/70 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {timeAgo}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1 gap-2.5">
          <h2 className="text-[15px] font-semibold text-[#F0F0F0] leading-snug line-clamp-2">
            {headline}
          </h2>

          <p className="text-[13px] text-[#999] leading-relaxed line-clamp-3 flex-1">
            {summary}
          </p>

          {keyFact && (
            <div className="bg-[#7C6AF7]/8 border border-[#7C6AF7]/15 rounded-lg px-2.5 py-1.5">
              <p className="text-[11px] text-[#7C6AF7] line-clamp-1">{keyFact}</p>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-[#555] pt-0.5">
            <span>{sourceCount} source{sourceCount !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>Tap to learn</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
