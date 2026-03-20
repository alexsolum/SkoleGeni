declare module "lodash.debounce" {
  export default function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait?: number
  ): T & {
    cancel(): void;
    flush(): ReturnType<T>;
  };
}
