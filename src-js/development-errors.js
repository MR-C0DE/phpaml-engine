let installed = false;
let reporting = false;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
})[character]);

const normalizeError = (reason) => reason instanceof Error
  ? reason
  : new Error(typeof reason === 'string' ? reason : JSON.stringify(reason));

export const showDevelopmentError = (reason, context = 'AML Engine') => {
  if (!document.querySelector('meta[name="aml-debug"][content="true"]')) return;
  const error = normalizeError(reason);
  const previous = document.getElementById('aml-development-error-overlay');
  previous?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'aml-development-error-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <style>
      #aml-development-error-overlay{position:fixed;z-index:2147483647;inset:0;display:grid;place-items:center;padding:24px;background:rgba(9,9,11,.88);color:#18181b;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #aml-development-error-overlay *{box-sizing:border-box}
      #aml-development-error-overlay .aml-error-panel{width:min(960px,100%);max-height:calc(100vh - 48px);overflow:auto;background:#fff;border:1px solid #e4e4e7;border-radius:5px;box-shadow:0 30px 90px rgba(0,0,0,.4)}
      #aml-development-error-overlay .aml-error-bar{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #e4e4e7;background:#fafafa}
      #aml-development-error-overlay .aml-error-badge{padding:3px 8px;border-radius:4px;color:#fff;background:#dc2626;font:700 12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
      #aml-development-error-overlay .aml-error-content{padding:24px}
      #aml-development-error-overlay h1{margin:8px 0 24px;font-size:clamp(24px,4vw,38px);line-height:1.15;letter-spacing:-.03em}
      #aml-development-error-overlay p{margin:0;color:#71717a;font:600 13px ui-monospace,SFMono-Regular,Menlo,monospace}
      #aml-development-error-overlay pre{margin:0;padding:16px;overflow:auto;border:1px solid #27272a;border-radius:5px;color:#f4f4f5;background:#18181b;font:13px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap}
      #aml-development-error-overlay .aml-error-actions{display:flex;gap:10px;margin-top:18px}
      #aml-development-error-overlay button{padding:9px 14px;border:1px solid #d4d4d8;border-radius:4px;background:#fff;color:#18181b;font:600 14px system-ui;cursor:pointer}
      #aml-development-error-overlay button:first-child{color:#fff;background:#18181b;border-color:#18181b}
      @media(max-width:640px){#aml-development-error-overlay{padding:0;place-items:stretch}#aml-development-error-overlay .aml-error-panel{max-height:100vh;border:0;border-radius:0}}
    </style>
    <section class="aml-error-panel" aria-labelledby="aml-client-error-title">
      <header class="aml-error-bar"><span class="aml-error-badge">CLIENT</span><strong>PHPAML development error</strong></header>
      <div class="aml-error-content">
        <p>${escapeHtml(context)} · ${escapeHtml(error.name || 'Error')}</p>
        <h1 id="aml-client-error-title">${escapeHtml(error.message || 'Unknown browser error.')}</h1>
        <pre>${escapeHtml(error.stack || error.message)}</pre>
        <div class="aml-error-actions"><button type="button" data-aml-error-reload>Reload page</button><button type="button" data-aml-error-close>Close overlay</button></div>
      </div>
    </section>`;
  document.body.append(overlay);
  overlay.querySelector('[data-aml-error-reload]').addEventListener('click', () => location.reload());
  overlay.querySelector('[data-aml-error-close]').addEventListener('click', () => overlay.remove());
};

export const installDevelopmentErrorOverlay = () => {
  if (installed || !document.querySelector('meta[name="aml-debug"][content="true"]')) return;
  installed = true;
  window.addEventListener('error', (event) => showDevelopmentError(event.error || event.message, 'Browser'));
  window.addEventListener('unhandledrejection', (event) => showDevelopmentError(event.reason, 'Unhandled promise'));
  const originalError = console.error.bind(console);
  console.error = (...values) => {
    originalError(...values);
    if (reporting) return;
    const error = values.find((value) => value instanceof Error);
    if (!error) return;
    reporting = true;
    try { showDevelopmentError(error, 'AML Engine'); }
    finally { reporting = false; }
  };
};
