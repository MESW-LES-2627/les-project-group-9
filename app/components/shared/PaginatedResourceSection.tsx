import * as React from 'react';
import {Pagination} from '@shopify/hydrogen';
import {useTranslation} from '~/lib/i18n';

/**
 * <PaginatedResourceSection> encapsulates the previous and next pagination behaviors throughout your application.
 */
export function PaginatedResourceSection<NodesType>({
  connection,
  children,
  ariaLabel,
  resourcesClassName,
}: {
  connection: React.ComponentProps<typeof Pagination<NodesType>>['connection'];
  children: React.FunctionComponent<{node: NodesType; index: number}>;
  ariaLabel?: string;
  resourcesClassName?: string;
}) {
  const t = useTranslation();
  return (
    <Pagination connection={connection}>
      {({nodes, isLoading, PreviousLink, NextLink}) => {
        const resourcesMarkup = nodes.map((node, index) =>
          children({node, index}),
        );

        return (
          <div>
            <PreviousLink className="my-8 inline-flex min-h-11 items-center justify-center border border-primary px-6 text-xs uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-white">
              {isLoading ? (
                t('common.loading')
              ) : (
                <span>
                  <span aria-hidden="true">↑</span> {t('common.loadPrevious')}
                </span>
              )}
            </PreviousLink>
            {resourcesClassName ? (
              <div
                aria-label={ariaLabel}
                className={resourcesClassName}
                role={ariaLabel ? 'region' : undefined}
              >
                {resourcesMarkup}
              </div>
            ) : (
              resourcesMarkup
            )}
            <NextLink className="my-8 inline-flex min-h-11 items-center justify-center border border-primary px-6 text-xs uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-white">
              {isLoading ? (
                t('common.loading')
              ) : (
                <span>
                  {t('common.loadMore')} <span aria-hidden="true">↓</span>
                </span>
              )}
            </NextLink>
          </div>
        );
      }}
    </Pagination>
  );
}
