import Image, { type StaticImageData } from "next/image";

type FigureProps = {
  /** Static import from the module folder, e.g. import x from "./img/x.svg". */
  src: StaticImageData;
  alt: string;
  /** The sentence under every diagram saying what it shows (required). */
  caption: string;
};

export function Figure({ src, alt, caption }: FigureProps) {
  return (
    <figure className="not-prose my-8">
      <div className="overflow-hidden rounded-lg border bg-card p-3">
        <Image
          src={src}
          alt={alt}
          // SVG diagrams are served as is; there is nothing to optimize.
          unoptimized
          className="mx-auto h-auto w-full max-w-3xl"
        />
      </div>
      <figcaption className="mt-2 text-center text-sm text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}
