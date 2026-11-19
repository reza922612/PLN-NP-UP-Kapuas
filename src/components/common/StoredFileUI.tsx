import React, { useEffect, useState } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { isStoredFileUrl, resolveStoredFile } from '../../lib/fileStorage';

interface StoredImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallback?: React.ReactNode;
}

export const StoredImage: React.FC<StoredImageProps> = ({
  src,
  alt = '',
  fallback = null,
  className,
  ...rest
}) => {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() =>
    src && !isStoredFileUrl(src) ? src : null
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);

    if (!src) {
      setResolvedSrc(null);
      return;
    }

    if (!isStoredFileUrl(src)) {
      setResolvedSrc(src);
      return;
    }

    setResolvedSrc(null);
    resolveStoredFile(src)
      .then((res) => {
        if (active) setResolvedSrc(res.blobUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [src]);

  if (!src || failed) {
    return <>{fallback}</>;
  }

  if (!resolvedSrc) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100/80 dark:bg-slate-800/80 animate-pulse">
        <Loader2 size={14} className="animate-spin text-[#0072BC] dark:text-[#72C8F1]" />
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
};

interface StoredFileLinkProps {
  url: string;
  fileName?: string;
  className?: string;
  title?: string;
  children?: React.ReactNode;
}

export const StoredFileLink: React.FC<StoredFileLinkProps> = ({
  url,
  fileName,
  className,
  title,
  children,
}) => {
  const [loading, setLoading] = useState(false);

  if (!isStoredFileUrl(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={className}
        title={title}
      >
        {children}
      </a>
    );
  }

  const handleOpenStored = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const resolved = await resolveStoredFile(url);
      const anchor = document.createElement('a');
      anchor.href = resolved.blobUrl;
      const isInlineViewable =
        resolved.mimeType.startsWith('image/') || resolved.mimeType === 'application/pdf';
      if (isInlineViewable) {
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
      } else {
        anchor.download = fileName || resolved.fileName || 'dokumen';
      }
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (err) {
      console.error('Failed to open stored file:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleOpenStored}
      disabled={loading}
      className={className}
      title={title}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : children || <FileText size={14} />}
    </button>
  );
};

export const useResolvedFileUrl = (url?: string | null): string => {
  const [resolved, setResolved] = useState<string>(() =>
    url && !isStoredFileUrl(url) ? url : ''
  );

  useEffect(() => {
    let active = true;
    if (!url) {
      setResolved('');
      return;
    }
    if (!isStoredFileUrl(url)) {
      setResolved(url);
      return;
    }
    setResolved('');
    resolveStoredFile(url)
      .then((res) => {
        if (active) setResolved(res.blobUrl);
      })
      .catch(() => {
        if (active) setResolved('');
      });
    return () => {
      active = false;
    };
  }, [url]);

  return resolved;
};

export const StoredFileFrame: React.FC<{ url: string; title: string; className?: string }> = ({
  url,
  title,
  className = 'w-full h-[70vh] rounded-lg border border-slate-200 dark:border-slate-800 bg-white',
}) => {
  const resolved = useResolvedFileUrl(url);

  if (!resolved) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-xs font-bold text-slate-400">
        <Loader2 size={24} className="animate-spin text-[#0072BC] dark:text-[#72C8F1]" />
        <span>Memuat pratinjau dokumen...</span>
      </div>
    );
  }

  return <iframe src={resolved} title={title} className={className} />;
};

