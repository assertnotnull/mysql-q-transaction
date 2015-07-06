var mysql = require('mysql');
var qtransactions = require('../index');
var Q = require('q');
var debug = require('debug')('test');
var assert = require('assert');

var conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root'
});


var createDB = function (conn) {
    conn.query("create database if not exists test", []);
};

var changeDb = function (conn) {
    conn.changeUser({
        database: 'test'
    }, function (err) {
        debug(err);
    });
};

var createTable = function (conn) {
    conn.query([
        'CREATE TEMPORARY TABLE ?? (',
        '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
        '`value` varchar(255),',
        'PRIMARY KEY (`id`)',
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
    ].join('\n'), ['test']);
};

var truncate = function (conn) {
    conn.query('truncate table test');
};

var tearDown = function (conn) {
    conn.query("drop database test", [], function (err, result) {
        if (err) {
            debug('error dropping database test')
        } else {
            debug(result);
        }
    });
};


var promiseOne = function (conn) {
    return Q.promise(function (resolve, reject) {
        debug('exec query1');
        conn.query('insert into test (value) values ("text")', [], function (err, result) {
            if (err) {
                debug(err);
                reject(err);
            } else {
                debug(result);
                resolve(result);
            }
        });
    });
};

var promiseTwo = function (conn) {
    return Q.promise(function (resolve, reject) {
        debug('exec query2');
        conn.query('insert into test (value) values ("text2")', [], function (err, result) {
            if (err) {
                debug(err);
                reject(err);
            } else {
                debug(result);
                resolve(result);
            }
        });
    });
};

var promiseThreeFail = function (conn) {
    return Q.promise(function (resolve, reject) {
        conn.query('insert into test2 (value) values ("text2")', function (err, result) {
            if (err) {
                reject(err);
            }
            debug(result);
            resolve();
        });
    });
};

var getData = function (conn) {
    return Q.promise(function (resolve, reject) {
        conn.query('select * from test', function (err, rows) {
            if (err) {
                reject(err);
            }
            debug(rows);
            resolve(rows);
        });
    });
};

var commit = function (conn) {
    return Q.promise(function (resolve, reject) {
        conn.commit(function (err) {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
};

var rollback = function (conn) {
    return Q.promise(function (resolve, reject) {
        conn.rollback(function (err) {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
};

describe('transaction', function () {
    describe('commit on success', function () {
        it('should commit when all queries are good', function (done) {
            qtransactions.startTransaction(conn, function () {
                return [promiseOne(conn), promiseTwo(conn)]
            })
                .then(function (results) {
                    assert.equal(results[0].insertId, 1);
                    assert.equal(results[1].insertId, 2);
                    done();
                }, function (error) {
                    done(error.error);
                })
        })
    });

    describe('manually commit on success', function () {
        it('have 2 inserted rows after manually commit', function (done) {
            qtransactions.startTransaction(conn, function () {
                return [promiseOne(conn), promiseTwo(conn)]
            }, true)
                .then(function (results) {
                    assert.equal(results[0].insertId, 1);
                    assert.equal(results[1].insertId, 2);
                })
                .then(function () {
                    return commit(conn);
                })
                .then(function () {
                    return getData(conn);
                })
                .then(function (rows) {
                    assert.equal(rows.length, 2);
                })
                .then(done, done);
        });

        it('have 2 inserted rows after manually commit and rollback is called', function (done) {
            qtransactions.startTransaction(conn, function () {
                return [promiseOne(conn), promiseTwo(conn)]
            }, true)
                .then(function (results) {
                    assert.equal(results[0].insertId, 1);
                    assert.equal(results[1].insertId, 2);
                })
                .then(function () {
                    return commit(conn);
                })
                .then(function () {
                    return rollback(conn);
                })
                .then(function () {
                    return getData(conn);
                })
                .then(function (rows) {
                    assert.equal(rows.length, 2);
                })
                .then(done, done);
        })
    });

    describe('rollback on fail', function () {
        it('should rollback when one query fails', function (done) {
            qtransactions.startTransaction(conn, function () {
                    return [promiseOne(conn), promiseThreeFail(conn)]
                })
                .catch(function (err) {
                    debug('error in one query', err.error);
                    assert.equal('ER_NO_SUCH_TABLE', err.error.code);
                    done();
                });
        })
    });

    describe('rollback manually', function () {
        it('should have rollback false when transaction fails', function (done) {
            qtransactions.startTransaction(conn, function () {
                    return [promiseOne(conn), promiseThreeFail(conn)]
                }, false, true)
                .catch(function (err) {
                    debug('error in one query', err.error);
                    assert.equal(false, err.rollback);
                    assert.equal('ER_NO_SUCH_TABLE', err.error.code);
                    var output = conn.rollback(function (err) {
                        debug('error in rollback');
                    });
                    assert.equal('ROLLBACK', output.sql);
                    done();
                });
        })
    });

    before(function () {
        createDB(conn);
        changeDb(conn);
        createTable(conn);
    });

    after(function () {
        tearDown(conn);
        conn.end();
    });

    afterEach(function () {
        truncate(conn);
    })
});

