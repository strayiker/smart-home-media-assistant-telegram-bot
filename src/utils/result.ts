// Lightweight Result implementation to avoid external dependency.
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type ResultT<T, E = unknown> = Ok<T> | Err<E>;

export const ok = <T>(value: T): ResultT<T, never> => ({ ok: true, value });
export const err = <E>(error: E): ResultT<never, E> => ({ ok: false, error });

export function isOk<T, E>(r: ResultT<T, E>): r is Ok<T> {
  return r.ok === true;
}

export function isErr<T, E>(r: ResultT<T, E>): r is Err<E> {
  return r.ok === false;
}

export async function fromAsync<T>(fn: () => Promise<T>): Promise<ResultT<T, unknown>> {
  try {
    const res = await fn();
    return ok(res);
  } catch (e) {
    return err(e as unknown);
  }
}

// Helper for tests to mimic neverthrow unsafe unwrap
export function unsafeUnwrap<T>(r: ResultT<T, unknown>): T {
  if (isOk(r)) return r.value;
  throw r.error;
}

