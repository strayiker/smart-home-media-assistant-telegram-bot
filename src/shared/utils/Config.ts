export interface ConfigGetOptions<
  T,
  Required extends boolean,
  Parse extends boolean,
> {
  default?: T;
  required?: Required;
  parse?: Parse;
}

export type ConfigGetResult<
  T,
  Required extends boolean,
  Parse extends boolean,
  Default extends T = T,
  P = Parse extends true ? T : string,
  R = Required extends true
    ? NonNullable<P>
    : Default extends NonNullable<Default>
      ? NonNullable<P> | Default
      : P | undefined,
> = R;

export interface Config {
  get<T, Required extends boolean = false, Parse extends boolean = false>(
    name: string,
    options?: ConfigGetOptions<T, Required, Parse>,
  ): ConfigGetResult<T, Required, Parse>;
}
