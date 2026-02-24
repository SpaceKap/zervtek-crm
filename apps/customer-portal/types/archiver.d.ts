declare module "archiver" {
  function archiver(format: string, options?: { zlib?: { level?: number } }): import("stream").Writable & {
    append(buffer: Buffer, options: { name: string }): void;
    finalize(): void;
    abort(): void;
    on(event: "data", listener: (chunk: Buffer) => void): unknown;
    on(event: "end", listener: () => void): unknown;
    on(event: "error", listener: (err: Error) => void): unknown;
  };
  export = archiver;
}
