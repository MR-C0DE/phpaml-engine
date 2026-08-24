const CSRF_SELECTOR = 'meta[name="csrf-token"],meta[name="aml-csrf-token"]';

export const csrfToken = (documentRoot = document) => documentRoot
  .querySelector(CSRF_SELECTOR)
  ?.getAttribute('content') || '';

export const refreshCsrfToken = (response, documentRoot = document) => {
  const renewed = response.headers.get('X-CSRF-Token');
  if (!renewed) return;
  documentRoot.querySelector(CSRF_SELECTOR)?.setAttribute('content', renewed);
};

export const prepareApiRequest = (url, action, data, signal, token = '', engine = 'api') => {
  const options = {
    method: action.method,
    credentials: 'same-origin',
    signal,
    headers: {'Accept': 'application/json', 'X-AML-Engine': engine},
  };
  if (action.method === 'GET') {
    Object.entries(data).forEach(([key, value]) => url.searchParams.set(key, String(value ?? '')));
  } else {
    options.headers['Content-Type'] = 'application/json';
    if (token) options.headers['X-CSRF-Token'] = token;
    options.body = JSON.stringify(data);
  }
  return options;
};
