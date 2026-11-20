import { useState } from 'react';
import { Wheat } from 'lucide-react';

interface EditorialImageProps {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

export function EditorialImage({ src, alt, className = '', priority = false }: EditorialImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#E9E3D8] text-[#81796D] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Wheat className="w-7 h-7 stroke-[1.25] text-[#8A6548] mb-2" />
        <span className="font-serif text-sm italic text-[#69462D] max-w-[18rem]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
