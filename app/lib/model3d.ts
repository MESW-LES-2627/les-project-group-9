export type Model3dMediaNode = {
  __typename?: string | null;
  id?: string | null;
  alt?: string | null;
  sources?: Array<{
    url: string;
    mimeType?: string | null;
    format?: string | null;
  }> | null;
  previewImage?: {url: string; altText?: string | null} | null;
};

export type Product3dModel = {
  url: string;
  altText: string;
  previewImageUrl: string | null;
};

const GLB_MIME_TYPE = 'model/gltf-binary';

export function pick3dModel(media: Model3dMediaNode[]): Product3dModel | null {
  for (const node of media) {
    if (node.__typename !== 'Model3d') continue;

    const sources = node.sources ?? [];
    const glb =
      sources.find((source) => source.mimeType === GLB_MIME_TYPE) ??
      sources.find((source) => source.format === 'glb') ??
      sources.find((source) => Boolean(source.url));

    if (!glb?.url) continue;

    return {
      url: glb.url,
      altText: node.alt ?? node.previewImage?.altText ?? '',
      previewImageUrl: node.previewImage?.url ?? null,
    };
  }

  return null;
}
