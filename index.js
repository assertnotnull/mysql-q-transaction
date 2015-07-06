Q = require('q');
debug = require('debug')('transaction:transaction');

module.exports = {
    /**
     *
     * @param conn the MySQL connection
     * @param promises an array of query in promises
     * @param manuallyCommit disable the automatic commit
     * @param manuallyRollback disable the automatic rollback
     * @returns {*|promise}
     */

    startTransaction: function (conn, promises, manuallyCommit, manuallyRollback) {
        var deferred = Q.defer();
        conn.beginTransaction(function (err) {
            debug('transaction opened');
            if (err) {
                debug(err);
                deferred.reject(err);
            } else {
                Q.all(promises())
                    .then(function (results) {
                        debug('query execution good');
                        if (manuallyCommit === true) {
                            debug('manually commit');
                            deferred.resolve(results);
                        } else {
                            debug('automatic commit');
                            Q.resolve().then(function () {
                                debug('auto commit');
                                debug('SQL:', conn.commit(function (error) {
                                    if (error)
                                        return error;
                                    else
                                        deferred.resolve(results);
                                }).sql);
                            });
                        }
                    }, function (error) {
                        debug('transaction rollback', err);
                        if (manuallyRollback === true) {
                            deferred.reject({rollback: false, error: error});
                        } else {
                            debug('automatic rollback success');
                            conn.rollback(function (err) {
                                deferred.reject({rollback: true, error: err});
                            });
                            deferred.reject({rollback: true, error: error});
                        }
                    })
                    .done();
            }
        });
        return deferred.promise;
    }
};