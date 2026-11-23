export const wenwuId = '2124680836212682754';
export const wenwuAspects = Object.freeze({
  '1:1': '1:1 (Square)', '2:3': '2:3 (Portrait Photo)', '3:2': '3:2 (Photo)',
  '3:4': '3:4 (Portrait Standard)', '4:3': '4:3 (Standard)',
  '9:16': '9:16 (Portrait Widescreen)', '16:9': '16:9 (Widescreen)', '21:9': '21:9 (Ultrawide)'
});
export const wenwuDefaults = Object.freeze({ videoAspect: '16:9', videoMegapixels: 1.5, videoMultiple: 32, videoSeconds: 12 });
export const isWenwu = node => node?.videoMode === 'wenwu';
export const validMegapixels = n => Number.isFinite(n) && n >= 0.1 && n <= 16;
export const validMultiple = n => Number.isInteger(n) && n >= 8 && n <= 128 && n % 4 === 0;

// Match Python round() at exact half steps, as used by ResolutionSelector.
function roundEven(n) {
  const lower = Math.floor(n);
  return n - lower === 0.5 ? lower + lower % 2 : Math.round(n);
}
export function wenwuDimensions({ videoAspect, videoMegapixels, videoMultiple }) {
  const [w, h] = videoAspect.split(':').map(Number);
  const scale = Math.sqrt(videoMegapixels * 1024 ** 2 / (w * h));
  return { width: roundEven(w * scale / videoMultiple) * videoMultiple, height: roundEven(h * scale / videoMultiple) * videoMultiple };
}
