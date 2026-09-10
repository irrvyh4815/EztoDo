// Border-box textarea: scrollHeight includes padding but excludes borders.
export function resizeMeetingTextarea(element) {
  if (!element) return;
  const style = getComputedStyle(element);
  element.style.height = "auto";
  const border = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
  element.style.height = `${Math.max(parseFloat(style.minHeight) || 0, element.scrollHeight + border)}px`;
}
