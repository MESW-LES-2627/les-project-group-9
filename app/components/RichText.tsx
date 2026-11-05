type Props = {
  html: string;
};

export function RichText({html}: Props) {
  return (
    <div
      className="
        break-words text-base leading-8 text-primary
        [&_p]:my-5
        [&_h1]:mb-5 [&_h1]:mt-10 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:text-ink
        [&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-ink
        [&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-ink
        [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6
        [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6
        [&_li]:my-2
        [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4
        [&_strong]:font-semibold [&_strong]:text-ink
        [&_blockquote]:my-6 [&_blockquote]:bg-secondary/30 [&_blockquote]:p-6
        [&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full
        [&_table]:my-6 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto
        [&_td]:border [&_td]:border-line [&_td]:p-3
        [&_th]:border [&_th]:border-line [&_th]:p-3 [&_th]:text-left
      "
      dangerouslySetInnerHTML={{__html: html}}
    />
  );
}