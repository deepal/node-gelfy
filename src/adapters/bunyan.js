export default class BunyanAdapter {
    constructor(gelfStream) {
        this.stream = gelfStream;
        this.gelfClient = this.stream.client;
    }

    /**
     * Map bunyan log level to GELF log level
     * @param {number} bunyanLevel
     * @returns {number}
     */
    mapGelfLevel(bunyanLevel) {
        const gelfLevel = this.gelfClient.config.levels;

        switch (bunyanLevel) {
            case 10: return gelfLevel.debug;
            case 20: return gelfLevel.debug;
            case 30: return gelfLevel.info;
            case 40: return gelfLevel.warning;
            case 50: return gelfLevel.error;
            case 60: return gelfLevel.emergency;
            default: return gelfLevel.warning;
        }
    }

    createTransformer() {
        return (log) => {
            const ignoreFields = ['msg', 'hostname', 'level', 'v'];
            const gelfMsg = {
                time: +new Date(log.time) / 1000,
                short_message: log.msg,
                facility: log.name,
                host: log.hostname,
                bunyan_level: log.level,
                level: this.mapGelfLevel(log.level)
            };

            if (log.err && log.err.stack) {
                const errFile = log.err.stack.match(/\n\s+at .+ \(([^:]+):([0-9]+)/);
                if (errFile) {
                    if (errFile[1]) gelfMsg.file = errFile[1]; // eslint-disable-line prefer-destructuring
                    if (errFile[2]) gelfMsg.line = errFile[2]; // eslint-disable-line prefer-destructuring
                }
            }

            // TODO: Improve this using `reduce`
            for (const key in log) { // eslint-disable-line no-restricted-syntax
                if (Object.hasOwnProperty.call(log, key)) {
                    if (ignoreFields.indexOf(key) < 0 && !Object.hasOwnProperty.call(gelfMsg, key)) {
                        gelfMsg[key] = log[key];
                    }
                }
            }

            return gelfMsg;
        };
    }
}
