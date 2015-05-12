Q = require('q');
debug = require('debug')('transaction:transaction');

module.exports = {
    /**
     *
     * @param conn the MySQL connection
     * @param promises an array of query in promises
     * @param onRollback callback after rollback
     * @param manuallyRollback disable the automatic rollback
     * @returns {*|promise}
     */

    startTransaction: function (conn, promises, manuallyRollback) {
        var deferred = Q.defer();
        conn.beginTransaction(function (err) {
            debug('transaction opened');
            if (err) {
                debug(err);
                deferred.reject(err);
            } else {
                Q.all(promises())
                    .done(function (results) {
                        debug('transaction done');
                        conn.commit(function (err) {
                            if (err) {
                                debug(err);
                                deferred.reject({rollback: null, error: error});
                            } else {
                                deferred.resolve(results); //return results - an array of results from promises in the order of that array
                            }
                        })
                    }, function (error) {
                        debug('transaction rollback', err);
                        if (manuallyRollback === 'undefined' || manuallyRollback == false) {
                            conn.rollback(function (err) {
                                deferred.reject({rollback: true, error: err});
                            });
                            deferred.reject({rollback: true, error: error});
                        }
                        deferred.reject({rollback: false, error: error});
                    });
            }
        });
        return deferred.promise;
    }
};
