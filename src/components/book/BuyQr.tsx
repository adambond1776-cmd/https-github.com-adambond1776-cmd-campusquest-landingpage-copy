import QRCode from 'qrcode';

/**
 * A scannable code for the book, rendered as inline SVG on the server.
 *
 * Generated from the configured URL rather than shipped as a picture, so it
 * cannot drift out of date and there is no way for a stale image to point
 * somewhere nobody intended. Inline means no client JavaScript and no extra
 * request.
 *
 * The reason a website has a QR code at all: a student reading this on a laptop
 * buys on their phone, and the same component prints onto advisor handouts and
 * classroom material where a URL is useless.
 */
export default async function BuyQr({
  url,
  size = 132,
  className,
}: {
  url: string;
  size?: number;
  className?: string;
}) {
  const svg = await QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    // High correction so it still scans off a screen at an angle, or from paper
    // that has been folded into somebody's pocket.
    errorCorrectionLevel: 'H',
    color: { dark: '#0b1020', light: '#ffffff' },
  });

  return (
    <div
      className={`overflow-hidden rounded-lg bg-white p-2 ${className ?? ''}`}
      style={{ width: size, height: size }}
      // Generated from a URL we control, on the server, by a library that emits
      // only SVG shapes.
      dangerouslySetInnerHTML={{ __html: svg.replace('<svg', '<svg width="100%" height="100%"') }}
    />
  );
}
