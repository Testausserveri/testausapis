/* eslint-disable no-console */
// Color palette, stolen from Stackoverflow (credit to Bud Damyanov)
const colors = {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Dim: "\x1b[2m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m",
    Black: "\x1b[30m",
    Red: "\x1b[31m",
    Green: "\x1b[32m",
    Yellow: "\x1b[33m",
    Blue: "\x1b[34m",
    Magenta: "\x1b[35m",
    Cyan: "\x1b[36m",
    White: "\x1b[37m"
}

// Implement colors for these console functions
global.consoleConfig = {
    error: {
        color: "Red",
        prefix: "[ ERROR ]"
    },
    log: {
        color: "Cyan",
        prefix: "[ INFO ]"
    },
    warn: {
        color: "Yellow",
        prefix: "[ WARN ]"
    },
    debug: {
        color: "Magenta",
        prefix: "[ DEBUG ]"
    }
}

// eslint-disable-next-line no-restricted-syntax, guard-for-in
for (const func in global.consoleConfig) {
    const real = console[func]
    console[func] = async (...args) => { // A proxy
        real(`${colors.Reset}[ ${new Date().toTimeString().split(" ")[0]} ]${colors[global.consoleConfig[func].color] ?? ""}`, global.consoleConfig[func].prefix ?? "", ...args, colors.Reset)
    }
}
