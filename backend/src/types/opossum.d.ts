declare module 'opossum' {
  interface Options {
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
  }
  class CircuitBreaker<T extends unknown[], R> {
    constructor(action: (...args: T) => Promise<R>, options?: Options);
    fire(...args: T): Promise<R>;
    fallback(fn: (...args: T) => R): void;
  }
  export default CircuitBreaker;
}
