const mysql = require('mysql');
const { getConfig, isConfiguredString } = require('./config');

let pool = null;
let disabledWarned = false;

function getPool() {
    if (pool) return pool;

    const mysqlConfig = getConfig().mysqlConfig || {};
    const enabled = mysqlConfig.enabled === true;
    const hasRequiredConfig = ['host', 'user', 'database'].every((key) => isConfiguredString(mysqlConfig[key]));

    if (!enabled || !hasRequiredConfig) {
        if (!disabledWarned) {
            console.warn('[MYSQL] Punishment history database disabled. Set mysqlConfig.enabled=true and fill mysqlConfig to enable it.');
            disabledWarned = true;
        }
        return null;
    }

    pool = mysql.createPool({
        connectionLimit: Number(mysqlConfig.connectionLimit) || 10,
        host: mysqlConfig.host,
        user: mysqlConfig.user,
        password: mysqlConfig.password || '',
        database: mysqlConfig.database,
        insecureAuth: mysqlConfig.insecureAuth !== false,
    });

    return pool;
}

module.exports = {
    query(sql, args) {
        const activePool = getPool();
        if (!activePool) return Promise.resolve([]);

        return new Promise((resolve, reject) => {
            activePool.getConnection((err, connection) => {
                if (err) {
                    return reject(err);
                }
                connection.query(sql, args, (err, rows) => {
                    connection.release();
                    if (err) {
                        return reject(err);
                    }
                    resolve(rows);
                });
            });
        });
    },
};
