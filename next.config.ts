import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The Genius Mining module is a workspace package published as TypeScript
  // source, so Next has to compile it rather than expect prebuilt JavaScript.
  transpilePackages: ['@hiddengeniuslabs/genius-mining'],

  // `next build` and `next dev` both write here, and a build run while the dev
  // server is up overwrites the chunks it is serving: the browser then fails to
  // load them and nothing on the page hydrates, which looks like broken buttons
  // rather than a broken build. `npm run build:check` sets this to build against
  // a scratch directory instead. Vercel gets the default.
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // Dev only. Next refuses to serve `/_next/*` to an origin it does not
  // recognize, and the refusal is quiet in the browser: the client chunks never
  // arrive, nothing hydrates, and every button silently does nothing while the
  // server-rendered page looks perfectly fine. Loopback by IP and the container
  // address are both routinely used to reach a dev server, so name them.
  allowedDevOrigins: ['127.0.0.1', 'localhost', '172.30.0.2'],
};

export default nextConfig;
