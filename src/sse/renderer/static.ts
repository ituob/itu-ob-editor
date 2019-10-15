import path from 'path';
import * as url from 'url';

declare const __static: string;

const isDevelopment = process.env.NODE_ENV !== 'production';

export function getStatic(val: string) {
  if (isDevelopment) {
    return url.resolve(window.location.origin, val);
  }
  return path.resolve(__static, val);
}
