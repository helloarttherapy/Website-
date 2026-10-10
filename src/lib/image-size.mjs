import sharp from 'sharp';
import path from 'node:path';

const dimensions = new Map();
export async function imageSize(src) {
  if (!src?.startsWith('/images/')) return {};
  if (!dimensions.has(src)) {
    dimensions.set(src, sharp(path.join(process.cwd(), 'public', src)).metadata().then(({ width, height }) => ({ width, height })));
  }
  return dimensions.get(src);
}
