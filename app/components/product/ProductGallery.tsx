import {useEffect, useState} from 'react';
import {Image} from '@shopify/hydrogen';
import type {CatalogImage} from '~/lib/jeweliette-catalog';
import {useTranslation} from '~/lib/i18n';

type Props = {
  images: CatalogImage[];
  variantImage?: CatalogImage | null;
  title: string;
};

export function ProductGallery({images, variantImage, title}: Props) {
  const t = useTranslation();
  const [manual, setManual] = useState<number | null>(null);

  const variantIndex = variantImage?.id
    ? images.findIndex((image) => image.id === variantImage.id)
    : -1;

  useEffect(() => setManual(null), [variantImage?.id]);

  if (!images.length) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-secondary text-sm text-primary">
        {t('product.noImage')}
      </div>
    );
  }

  const active = manual ?? (variantIndex >= 0 ? variantIndex : 0);
  const current = images[active] ?? images[0];

  return (
    <div
      className={`grid gap-3 ${
        images.length > 1
          ? 'md:grid-cols-[72px_minmax(0,1fr)]'
          : 'grid-cols-1'
      }`}
    >
      {images.length > 1 ? (
        <ul className="order-2 flex gap-2 overflow-x-auto md:order-1 md:flex-col md:overflow-visible">
          {images.map((image, index) => (
            <li key={image.id ?? image.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setManual(index)}
                aria-label={t('product.showImage', {
                  index: index + 1,
                  total: images.length,
                })}
                aria-current={index === active}
                className={`block h-[72px] w-[58px] overflow-hidden bg-secondary ring-offset-2 md:h-[88px] md:w-[72px] ${
                  index === active ? 'ring-1 ring-ink' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Image
                  data={image}
                  alt=""
                  width={144}
                  sizes="72px"
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="order-1 min-w-0 aspect-[4/5] overflow-hidden bg-secondary md:order-2">
        <Image
          key={current.url}
          data={current}
          alt={current.altText || title}
          loading="eager"
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}