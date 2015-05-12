var mysql = require('mysql');
var qtransactions = require('../index');
var Q = require('q');
var debug = require('debug')('test');
var assert = require('assert');

var conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
});


var createDB = function(conn) {
    conn.query("create database if not exists test", []);
}

var changeDb = function(conn) {
    conn.changeUser({
        database: 'test'
    }, function(err) {
        debug(err);
    });
}

var createTable = function(conn) {

    conn.query([
        'CREATE TEMPORARY TABLE ?? (',
        '`id` int(11) unsigned NOT NULL AUTO_INCREMENT,',
        '`value` varchar(255),',
        'PRIMARY KEY (`id`)',
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8'
    ].join('\n'), ['test']);
}

var tearDown = function(conn) {
    conn.query("drop database test", [], function(err, result) {
        if (err) {
            debug('error dropping database test')
        } else {
            debug(result);
        }
    });
}


var promiseOne = function(conn) {
    return Q.promise(function(resolve, reject) {
        console.log('exec query1');
        conn.query('insert into test (value) values ("text")', [], function(err, result) {
            if (err) {
                debug(err);
                reject(err);
            } else {
                debug(result);
                resolve();
            }
        });
    });
}

var promiseTwo = function(conn) {
    return Q.promise(function(resolve, reject) {
        console.log('exec query2');
        conn.query('insert into test (value) values ("text2")', [], function(err, result) {
            if (err) {
                debug(err);
                reject(err);
            } else {
                debug('exec query2');
                debug(result);
                resolve();
            }
        });
    });
}

var promiseThreeFail = function(conn) {
    return Q.promise(function(resolve, reject) {
        conn.query('insert into test2 (value) values ("text2")', [], function(err, result) {
            if (err) {
                // debug(err);
                reject(err);
            } else {
                debug(result);
                resolve();
            }
        });
    });
}

var doSomethingAfterRollback = function() {
    debug('do something after rollback');
}

describe('transaction', function() {
    describe('commit', function() {
        it('should commit when all queries are good', function (done) {
            qtransactions.startTransaction(conn, function() { return [promiseOne(conn), promiseTwo(conn)]})
            .then(function(result) {
                debug('success');
                assert(true);
                done();
            }, function(err) {
                debug(err);
            });
        })

    });
    describe('rollback', function() {
        it('should rollback when one query fails', function (done) {
            qtransactions.startTransaction(conn, function() { return [promiseOne(conn), promiseThreeFail(conn)]})
            .then(function(result) {

            }).catch(function(err) {
                debug('error in one query', err.error);
                assert.equal('ER_NO_SUCH_TABLE', err.error.code);
                done();
            });
        })
    })
    describe('rollback manually', function() {
        it('should do nothing when transaction fails', function (done) {
            qtransactions.startTransaction(conn, function() { return [promiseOne(conn), promiseThreeFail(conn)]}, true)
            .then(function(result) {
            }).catch(function(err) {
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
    })
    before(function() {
        createDB(conn);
        changeDb(conn);
        createTable(conn);
    });
    after(function() {
        tearDown(conn);
        conn.end();
    });
});
