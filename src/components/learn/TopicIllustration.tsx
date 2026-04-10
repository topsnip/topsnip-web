'use client';

import Image from 'next/image';
import { useState } from 'react';

interface Props {
  imageUrl: string | null;
  alt: string;
}

export function TopicIllustration({ imageUrl, alt }: Props) {
  const [error, setError] = useState(false);

  if (!imageUrl || error) {
    return (
      <div className="w-full aspect-[16/9] rounded-xl bg-gradient-to-br from-[#7C6AF7]/10 to-[#080808] flex items-center justify-center border border-white/5">
        <div className="text-center">
          <div className="text-4xl mb-2">🧠</div>
          <p className="text-xs text-[#666]">Visual pending</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-white/5">
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 800px"
        onError={() => setError(true)}
      />
    </div>
  );
}
