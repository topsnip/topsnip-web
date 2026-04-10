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
    <Link href={`/learn/${slug}`} className="block">
      <article className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden hover:border-[#7C6AF7]/30 transition-colors">
        <div className="relative aspect-[16/9] bg-[#0a0a0a]">
          {imageUrl ? (
            <Image src={imageUrl} alt={headline} fill className="object-cover" sizes="(max-width: 768px) 100vw, 600px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#7C6AF7]/10 to-[#080808]">
              <div className="w-16 h-16 rounded-full bg-[#7C6AF7]/10 flex items-center justify-center">
                <span className="text-2xl text-[#7C6AF7]">AI</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-5 space-y-3">
          <CategoryBadge category={categoryTag} />
          <h2 className="text-lg font-semibold text-[#F0F0F0] leading-tight">{headline}</h2>
          <p className="text-sm text-[#A0A0A0] leading-relaxed">{summary}</p>
          {keyFact && (
            <div className="bg-[#7C6AF7]/10 border border-[#7C6AF7]/20 rounded-lg px-3 py-2">
              <p className="text-xs font-medium text-[#7C6AF7]">KEY FACT</p>
              <p className="text-sm text-[#F0F0F0]">{keyFact}</p>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-[#666] pt-1">
            <span>{sourceCount} source{sourceCount !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{timeAgo}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
