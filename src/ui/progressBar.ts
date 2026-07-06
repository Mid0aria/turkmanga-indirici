import colors from "ansi-colors";
import cliProgress from "cli-progress";

export const multibar = new cliProgress.MultiBar(
    {
        clearOnComplete: false,
        hideCursor: true,
        stopOnComplete: true,
        format: `${colors.cyan("{bar}")} | {filename} | ${colors.yellow(
            "{value}",
        )}/${colors.green("{total}")} | ${colors.blue("{status}")}`,
    },
    cliProgress.Presets.shades_grey,
);

export const createBar = (total: number, initialPayload: Record<string, unknown> = {}) => {
    return multibar.create(total, 0, initialPayload);
};

export default {
    multibar,
    createBar,
};
