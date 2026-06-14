// LocalLens — Next.js config for STATIC EXPORT to GitHub Pages.
//
// GitHub Pages only serves static files, so we use `output: 'export'` to emit
// fully static, crawlable HTML — ideal for the directory's SEO/AEO content
// pages. All dynamic/privileged logic (ETL, affiliate click-resolution,
// postbacks, candidate-build) runs in Supabase Edge Functions that the static
// site calls; nothing privileged ships to the browser.
//
// When deploying to https://<user>.github.io/<repo>, set NEXT_PUBLIC_BASE_PATH
// to "/<repo>" (the deploy workflow does this automatically). For a user/org
// page or a custom domain, leave it empty.

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: basePath || undefined,
  // Static export can't use the Next Image optimiser (no server); serve as-is.
  images: { unoptimized: true },
  // Pages-friendly: emit /path/index.html so routes work without a server.
  trailingSlash: true,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
