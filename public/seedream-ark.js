// Shared image contract; ordinary Ark and Agent Plan keep separate models and credentials.
export const arkProtocol = 'seedream-ark-auto-v1';
export const arkBaseUrl = 'https://ark.cn-beijing.volces.com/api/v3';
export const arkModels = Object.freeze([
  { id: 'doubao-seedream-5-0-flash-260915', label: 'Seedream 5.0 Flash' },
  { id: 'doubao-seedream-5-0-pro-260628', label: 'Seedream 5.0 Pro' }
]);
export const arkPlanProtocol = 'seedream-ark-plan-v1';
export const arkPlanBaseUrl = 'https://ark.cn-beijing.volces.com/api/plan/v3';
export const arkPlanModels = Object.freeze([
  { id: 'doubao-seedream-5.0-flash', label: 'Seedream 5.0 Flash' },
  { id: 'doubao-seedream-5-0-pro', label: 'Seedream 5.0 Pro' }
]);
export function isArkProvider(provider) { return provider === 'ark' || provider === 'ark-plan'; }
export function arkModelsForProvider(provider) { return provider === 'ark-plan' ? arkPlanModels : arkModels; }
export const arkSizes = Object.freeze({ '1:1': '2048x2048', '3:4': '1536x2048', '4:3': '2048x1536', '16:9': '2848x1600', '9:16': '1600x2848' });
export function buildArkPayload(body) {
  if (body.provider !== undefined && !isArkProvider(body.provider)) throw new Error('火山引擎服务提供商无效');
  if (!arkModelsForProvider(body.provider).some(item => item.id === body.model)) throw new Error('请选择与火山引擎渠道匹配的 Seedream 模型');
  if (body.layer_decomposition || body.arkOperation === 'layers') throw new Error('画布未启用图层拆分，请刷新后重新提交');
  if (body.references !== undefined && !Array.isArray(body.references)) throw new Error('参考图列表格式无效');
  const references = Array.isArray(body.references) ? body.references : [];
  if (references.length > 10) throw new Error('火山引擎 Seedream 最多支持 10 张参考图');
  if (body.n !== undefined && Number(body.n) !== 1) throw new Error('官方 Seedream 每次运行生成 1 张图片');
  for (const image of references) {
    if (typeof image !== 'string' || !new RegExp('^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$').test(image)) throw new Error('参考图必须是 PNG、JPG 或 WebP 图片');
    if (image.slice(image.indexOf(',') + 1).length * 3 / 4 > 30 * 1024 * 1024) throw new Error('单张参考图不能超过 30 MB');
  }
  const prompt = String(body.prompt || '').trim();
  if (!prompt) throw new Error('请连接有内容的提示词');
  return { model: body.model, prompt, size: arkSizes[body.aspect] || arkSizes['3:4'], output_format: 'png', response_format: 'url', stream: false, watermark: false, ...(references.length ? { image: references.length === 1 ? references[0] : references } : {}) };
}
