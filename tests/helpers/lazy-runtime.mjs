// Resolve a lazy import to the same mocked component identity used by eager mounts.
// The actual Next chunk loading and browser requests are checked in rendered QA.
export function lazyRuntime(modules) {
  return { __esModule: true, default: loader => {
    const specifier = String(loader).match(/require\(["']([^"']+)["']\)/)?.[1];
    return modules[specifier]?.default ?? `lazy:${specifier ?? 'component'}`;
  } };
}
