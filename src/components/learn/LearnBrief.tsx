import { CategoryBadge } from './CategoryBadge';
import { TopicIllustration } from './TopicIllustration';
import { VideoRecommendation } from './VideoRecommendation';
import { SourceList } from './SourceList';

interface LearnBriefData {
  what_it_is: string;
  why_it_matters: string;
  key_details: string[];
  [key: string]: unknown;
}

interface YouTubeRec {
  video_id: string;
  title: string;
  channel_name: string;
  duration: string;
  reason: string;
}

interface Source {
  title: string;
  url: string;
  platform: string;
}

interface Props {
  title: string;
  categoryTag: string;
  publishedAt: string;
  imageUrl: string | null;
  brief: LearnBriefData;
  youtubeRecs: YouTubeRec[];
  sources: Source[];
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function LearnBrief({
  title, categoryTag, publishedAt, imageUrl,
  brief, youtubeRecs, sources,
}: Props) {
  const timeAgo = getTimeAgo(publishedAt);

  return (
    <article className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <CategoryBadge category={categoryTag} />
          <span className="text-xs text-[#666]">{timeAgo}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#F0F0F0] leading-tight">
          {title}
        </h1>
      </header>

      <TopicIllustration imageUrl={imageUrl} alt={title} />

      <section>
        <h2 className="text-sm font-semibold text-[#7C6AF7] uppercase tracking-wider mb-2">What it is</h2>
        <p className="text-[#D0D0D0] leading-relaxed">{brief.what_it_is}</p>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-[#7C6AF7] uppercase tracking-wider mb-2">Why it matters</h2>
        <p className="text-[#D0D0D0] leading-relaxed">{brief.why_it_matters}</p>
      </section>

      {brief.key_details?.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[#7C6AF7] uppercase tracking-wider mb-2">Key details</h2>
          <ul className="space-y-2">
            {brief.key_details.map((detail, i) => (
              <li key={i} className="flex gap-2 text-[#D0D0D0]">
                <span className="text-[#7C6AF7] mt-0.5">•</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {youtubeRecs.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[#7C6AF7] uppercase tracking-wider mb-3">Worth watching</h2>
          <div className="space-y-3">
            {youtubeRecs.map((rec) => (
              <VideoRecommendation
                key={rec.video_id}
                videoId={rec.video_id}
                title={rec.title}
                channelName={rec.channel_name}
                duration={rec.duration}
                reason={rec.reason}
              />
            ))}
          </div>
          <p className="text-[10px] text-[#444] mt-2">
            Video data provided by YouTube. Videos link to youtube.com.
          </p>
        </section>
      )}

      <section className="border-t border-white/5 pt-6">
        <h2 className="text-sm font-semibold text-[#7C6AF7] uppercase tracking-wider mb-3">Sources</h2>
        <SourceList sources={sources} />
      </section>
    </article>
  );
}
