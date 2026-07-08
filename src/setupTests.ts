import '@testing-library/jest-dom';

/*
 * React Flow measures the DOM with APIs jsdom does not implement. Provide the
 * minimal shims it needs so the canvas can mount in tests.
 */

class ResizeObserverStub {
  observe(): void {
    /* jsdom stub: nothing to observe */
  }
  unobserve(): void {
    /* jsdom stub */
  }
  disconnect(): void {
    /* jsdom stub */
  }
}

class DOMMatrixReadOnlyStub {
  m22 = 1;
}

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverStub;
}

if (!('DOMMatrixReadOnly' in globalThis)) {
  (globalThis as { DOMMatrixReadOnly?: unknown }).DOMMatrixReadOnly = DOMMatrixReadOnlyStub;
}
