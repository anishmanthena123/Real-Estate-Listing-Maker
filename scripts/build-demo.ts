import { build } from 'esbuild';
import { mkdir, cp, writeFile, rm, readdir, chmod } from 'node:fs/promises';
async function main() {
  const out = 'dist-demo';
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await build({
    entryPoints: ['src/demo/main.tsx'],
    bundle: true,
    minify: true,
    sourcemap: false,
    target: ['es2022'],
    platform: 'browser',
    format: 'esm',
    outfile: `${out}/app.js`,
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    metafile: true,
  }).then(async (result) => {
    const inputs = Object.keys(result.metafile!.inputs);
    if (
      inputs.some((path) =>
        /src\/server\/(?:auth|db|env|service|storage|lookup)|src\/server\/ai\/provider/.test(
          path,
        ),
      )
    )
      throw new Error(
        'Static demo must not bundle server credentials or providers.',
      );
  });
  await cp('src/demo/index.html', `${out}/index.html`);
  await cp('src/demo/assets', `${out}/assets`, { recursive: true });
  await writeFile(`${out}/.nojekyll`, '');
  async function publicPermissions(dir: string) {
    await chmod(dir, 0o755);
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await publicPermissions(path);
      else await chmod(path, 0o644);
    }
  }
  await publicPermissions(out);
  console.log(
    'Built self-contained portfolio demo in dist-demo. No API or database required.',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
