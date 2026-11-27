import {useEffect, useState} from 'react';
import {Image} from '@shopify/hydrogen';
import type {CatalogImage} from '~/lib/jeweliette-catalog';
import type {Product3dModel} from '~/lib/model3d';
import {useTranslation} from '~/lib/i18n';
import {Product3dViewer} from '~/components/product/Product3dViewer';

type Props = {
  images: CatalogImage[];
  variantImage?: CatalogImage | null;
  title: string;
  model?: Product3dModel | null;
};

type Active = '3d' | number;

export function ProductGallery({images, variantImage, title, model}: Props) {
  const t = useTranslation();
  const [manual, setManual] = useState<Active | null>(null);
  const [modelFailed, setModelFailed] = useState(false);

  const usableModel = model && !modelFailed ? model : null;

  const variantIndex = variantImage?.id
    ? images.findIndex((image) => image.id === variantImage.id)
    : -1;

  useEffect(() => setManual(null), [variantImage?.id]);

  const active: Active =
    manual === '3d' && !usableModel
      ? Math.max(variantIndex, 0)
      : (manual ?? Math.max(variantIndex, 0));

  const showStrip = usableModel ? images.length >= 1 : images.length > 1;

  if (!usableModel && !images.length) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-secondary text-sm text-primary">
        {t('product.noImage')}
      </div>
    );
  }

  const current =
    typeof active === 'number' ? (images[active] ?? images[0]) : null;

  return (
    <div
      className={`grid gap-3 ${
        showStrip ? 'md:grid-cols-[72px_minmax(0,1fr)]' : 'grid-cols-1'
      }`}
    >
      {showStrip ? (
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
                  index === active
                    ? 'ring-1 ring-ink'
                    : 'opacity-70 hover:opacity-100'
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
          {usableModel ? (
            <li className="shrink-0">
              <button
                type="button"
                onClick={() => setManual('3d')}
                aria-label={t('product.show3d')}
                aria-current={active === '3d'}
                className={`flex h-[72px] w-[58px] items-center justify-center bg-secondary text-[11px] uppercase tracking-widest ring-offset-2 md:h-[88px] md:w-[72px] ${
                  active === '3d'
                    ? 'ring-1 ring-ink'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                {t('product.3d')}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="order-1 min-w-0 aspect-[4/5] overflow-hidden bg-secondary md:order-2">
        {usableModel && active === '3d' ? (
          <Product3dViewer
            model={usableModel}
            title={title}
            onError={() => setModelFailed(true)}
          />
        ) : current ? (
          <Image
            key={current.url}
            data={current}
            alt={current.altText || title}
            loading="eager"
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
    </div>
  );
}
