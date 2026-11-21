export const mossWorkflow = Object.freeze({
  id: "2123674082813239297",
  promptNode: "88",
  ratioNode: "97",
  outputNode: "65",
  model: "MOSS Image"
});

export const mossAspects = Object.freeze([
  "1:1", "2:3", "3:2", "3:4", "4:3", "5:7",
  "9:16", "16:9", "21:9", "1:2", "2:1"
]);

export function mossAspect(value) {
  return mossAspects.includes(value) ? value : "9:16";
}

export function mossUpscaledResult(results) {
  const matches = Array.isArray(results)
    ? results.filter(item => String(item?.nodeId) === mossWorkflow.outputNode && typeof item?.url === "string" && item.url)
    : [];
  if (matches.length !== 1) throw new Error("MOSS 工作流未返回唯一的放大图片（节点 #65）");
  return matches[0];
}
