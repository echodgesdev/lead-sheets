const SHOW_MS = 4000;
let current = null;

export function toast(text, action) {
  current?.();
  const node = document.createElement('div');
  node.className = 'toast';
  node.setAttribute('role', 'status');
  node.append(text);
  const timer = setTimeout(dismiss, SHOW_MS);

  function dismiss() {
    clearTimeout(timer);
    node.remove();
    if (current === dismiss) current = null;
  }

  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'toast-action';
    b.textContent = action.label;
    b.addEventListener('click', () => {
      dismiss();
      action.run();
    });
    node.append(b);
  }

  document.body.append(node);
  current = dismiss;
  return dismiss;
}
