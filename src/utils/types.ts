type CamelToKebab<S> = S extends `${infer T}${infer U}`
  ? T extends Uncapitalize<T>
    ? U extends Uncapitalize<U>
      ? `${Uncapitalize<T>}${CamelToKebab<U>}`
      : `${Uncapitalize<T>}-${CamelToKebab<U>}`
    : `${Uncapitalize<T>}${CamelToKebab<U>}`
  : '';

export type CamelKeysToKebab<T, F extends keyof T> = {
  [P in keyof T as P extends F ? CamelToKebab<P> : P]: T[P];
};
