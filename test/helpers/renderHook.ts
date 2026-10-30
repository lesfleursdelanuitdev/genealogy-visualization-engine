/**
 * Minimal hook harness on react-dom (no testing-library). Use from files that start with
 * `// @vitest-environment jsdom`.
 */
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

declare global {
  // React reads this to know it runs under act().
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export interface RenderedHook<P, R> {
  /** Latest value the hook returned. */
  readonly current: R;
  rerender(props: P): Promise<void>;
  unmount(): Promise<void>;
  container: HTMLElement;
}

/**
 * Render `hook(props)` inside a component. `wrap` can turn the hook result into extra
 * elements (e.g. an <svg> that the hook's ref points at).
 */
export async function renderHook<P, R>(
  hook: (props: P) => R,
  initialProps: P,
  wrap?: (result: R, props: P) => ReactNode
): Promise<RenderedHook<P, R>> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const box: { current: R | undefined } = { current: undefined };

  function Harness({ props }: { props: P }): ReactNode {
    const result = hook(props);
    box.current = result;
    return wrap ? wrap(result, props) : null;
  }

  await act(async () => {
    root.render(createElement(Harness, { props: initialProps }));
  });

  return {
    get current(): R {
      return box.current as R;
    },
    async rerender(props: P) {
      await act(async () => {
        root.render(createElement(Harness, { props }));
      });
    },
    async unmount() {
      await act(async () => root.unmount());
      container.remove();
    },
    container,
  };
}

/** Let pending promises, a 0 ms timer and an animation frame run, inside act(). */
export async function settle(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

export interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
