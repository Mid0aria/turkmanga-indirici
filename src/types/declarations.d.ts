declare module "fs-extra";
declare module "node-file-dialog";

declare module "archiver" {
    interface Archiver {
        pipe(writeStream: unknown): unknown;
        directory(dirPath: string, destPath: string | boolean): void;
        finalize(): Promise<void>;
        on<T extends (...args: never[]) => void>(event: string, callback: T): void;
    }
    function archiver(format: string, options?: unknown): Archiver;
    export default archiver;
}

declare module "cli-progress" {
    export interface SingleBar {
        update(value: number, payload?: Record<string, unknown>): void;
    }
    export class MultiBar {
        constructor(options: unknown, preset: unknown);
        create(total: number, startValue: number, payload?: Record<string, unknown>): SingleBar;
        stop(): void;
    }
    export const Presets: {
        shades_grey: unknown;
    };
}

declare module "puppeteer-real-browser" {
    export interface ConnectOptions {
        headless?: boolean;
        args?: string[];
        executablePath?: string;
    }
    export interface PuppeteerTarget {
        type(): string;
        page(): Promise<PuppeteerPage | null>;
    }
    export interface PuppeteerBrowser {
        version(): Promise<string>;
        newPage(): Promise<PuppeteerPage>;
        close(): Promise<void>;
        on<T extends (...args: never[]) => void>(event: string, callback: T): void;
    }
    export interface PuppeteerPage {
        evaluate<T extends (...args: never[]) => unknown>(
            fn: T,
            ...args: unknown[]
        ): Promise<unknown>;
        evaluateOnNewDocument<T extends (...args: never[]) => unknown>(fn: T): Promise<void>;
        goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<void>;
        cookies(...urls: string[]): Promise<unknown[]>;
        close(): Promise<void>;
        title(): Promise<string>;
        url(): string;
        mainFrame(): unknown;
        on<T extends (...args: never[]) => void>(event: string, callback: T): void;
    }
    export function connect(
        options: ConnectOptions,
    ): Promise<{ browser: PuppeteerBrowser; page: PuppeteerPage }>;
}
