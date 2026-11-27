import {useEffect, useRef, useState, type CSSProperties} from 'react';
import type {Product3dModel} from '~/lib/model3d';

type Props = {
  model: Product3dModel;
  title: string;
  /**
   * Notified when the viewer script or the model itself fails to load, so the gallery can fall back to the images.
   */
  onError?: () => void;
};

const ModelViewer = 'model-viewer' as unknown as React.FC<{
  alt?: string;
  'camera-controls'?: string;
  'camera-orbit'?: string;
  'max-camera-orbit'?: string;
  poster?: string;
  src?: string;
  style?: CSSProperties;
}>;

let viewerLoaded = false;

async function loadModelViewer(): Promise<void> {
  if (!viewerLoaded) {
    await import('@google/model-viewer');
    viewerLoaded = true;
  }
}

export function Product3dViewer({model, title, onError}: Props) {
  const [scriptReady, setScriptReady] = useState(viewerLoaded);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load the viewer lazily
  useEffect(() => {
    if (viewerLoaded) return;
    let cancelled = false;
    loadModelViewer()
      .then(() => {
        if (!cancelled) setScriptReady(true);
      })
      .catch(() => onError?.());
    return () => {
      cancelled = true;
    };
  }, [onError]);

  useEffect(() => {
    const viewer = containerRef.current?.querySelector('model-viewer');
    if (!viewer || !scriptReady) return;
    const handleError = () => onError?.();
    viewer.addEventListener('error', handleError);
    return () => viewer.removeEventListener('error', handleError);
  }, [scriptReady, onError]);

  const altText = model.altText || title;

  if (!scriptReady) {
    // The poster keeps the media area filled while the viewer chunk loads.
    return model.previewImageUrl ? (
      <img
        src={model.previewImageUrl}
        alt={altText}
        className="h-full w-full object-cover"
      />
    ) : null;
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <ModelViewer
        src={model.url}
        poster={model.previewImageUrl ?? undefined}
        camera-controls=""
        camera-orbit="0deg 75deg 141%"
        max-camera-orbit="auto auto 300%"
        alt={altText}
        style={{width: '100%', height: '100%', display: 'block'}}
      />
    </div>
  );
}
