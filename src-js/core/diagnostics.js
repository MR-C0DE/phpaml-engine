export const withSource = (error, source, trace) => {
  if (!(error instanceof Error)) error = new Error(String(error));
  error.phpMessage ??= error.message;
  if (trace) error.phpTrace ??= trace.map((frame) => ({...frame}));
  if (!error.code) error.code = error instanceof TypeError ? 'PHP_TYPE_ERROR' : error instanceof RangeError ? 'PHP_RANGE_ERROR' : 'PHP_RUNTIME_ERROR';
  if (source && !error.source) {
    error.source = source;
    error.message += ` [PHP ${source.file}:${source.line}]`;
  }
  return error;
};

export const warn = (context, message, code = 'PHP_WARNING') => {
  const warning = {code, message, source: context?.source || null};
  if (context?.reportWarning) context.reportWarning(warning);
  else console.warn(message);
};

export const localName = (id) => {
  if (!/^v(?:[0-9a-f]{2})+$/.test(id)) return id;
  return '$' + new TextDecoder().decode(Uint8Array.from(id.slice(1).match(/../g), (byte) => parseInt(byte, 16)));
};
