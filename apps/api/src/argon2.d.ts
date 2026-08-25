declare module 'argon2' {
  export const argon2id: number;
  export function hash(value: string, options?: { type?: number }): Promise<string>;
  export function verify(hash: string, value: string): Promise<boolean>;
}
