// Must be imported before anything that loads NativeWind.
// NativeWind's css-interop touches React Native's deprecated `ImageBackground`
// at load time, which logs a warning we cannot fix in app code.
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('ImageBackground is deprecated')) {
    return;
  }
  originalWarn(...args);
};
