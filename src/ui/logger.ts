import colors from "ansi-colors";

export interface LogItem {
    type: "log" | "info" | "success" | "warn" | "error" | "header";
    message: string;
    timestamp: Date;
}

type LogListener = (item: LogItem) => void;

const listeners = new Set<LogListener>();
const logHistory: LogItem[] = [];

export const subscribe = (listener: LogListener) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const getHistory = (): LogItem[] => {
    return [...logHistory];
};

export const clearHistory = (): void => {
    logHistory.length = 0;
};

const broadcast = (
    type: LogItem["type"],
    message: string,
    colorMessage: string,
    isError = false,
) => {
    const item: LogItem = {
        type,
        message,
        timestamp: new Date(),
    };

    logHistory.push(item);
    if (logHistory.length > 100) {
        logHistory.shift();
    }

    if (listeners.size > 0) {
        listeners.forEach((listener) => listener(item));
    } else {
        if (isError) {
            process.stderr.write(colorMessage + "\n");
        } else {
            process.stdout.write(colorMessage + "\n");
        }
    }
};

export const log = (message: string): void => {
    broadcast("log", message, message);
};

export const info = (message: string): void => {
    broadcast("info", message, colors.cyan(message));
};

export const success = (message: string): void => {
    broadcast("success", message, colors.green.bold(message));
};

export const warn = (message: string): void => {
    broadcast("warn", message, colors.yellow("⚠️ " + message));
};

export const error = (message: string): void => {
    broadcast("error", message, colors.red.bold("❌ " + message), true);
};

export const header = (message: string): void => {
    broadcast("header", message, colors.bold.magenta(`\n--- ${message} ---\n`));
};

export default {
    subscribe,
    getHistory,
    clearHistory,
    log,
    info,
    success,
    warn,
    error,
    header,
};
