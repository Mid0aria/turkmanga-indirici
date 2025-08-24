const colors = require("ansi-colors");

module.exports = {
    log: (message) => console.log(message),
    info: (message) => console.log(colors.cyan(message)),
    success: (message) => console.log(colors.green.bold(message)),
    warn: (message) => console.log(colors.yellow("⚠️  " + message)),
    error: (message) => console.log(colors.red.bold("❌ " + message)),
    header: (message) =>
        console.log(colors.bold.magenta(`\n--- ${message} ---\n`)),
};
