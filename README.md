# MySQL Q promises

Wraps transactional queries in Q promises

## Install
```npm install mysql-q-transaction```

## How to use
```js
var transaction = require('mysql-q-transaction');
var connection = mysql.createConnection();

var myQuery = function(connection) {
    return Q.promise(function(resolve, reject) {
        connection.query(someQuery, [], function(err, result) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

var secondOne = function(connection) {
    return Q.promise(function(resolve, reject) {
        connection.query(someQuery, [], function(err, result) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}


transaction.startTransaction(
    connection, // the current connection
    function() { return [myQuery(connection), secondOne(connection)] }, //required callback
    manuallyCommit, //manage the commit manually
    manuallyRollbackFlag //optional - disable automaticRollback
);
```

```startTransaction``` is also a promise so you can do something after it.

```js
transaction.startTransaction(
    connection, // the current connection
    function() { return [myQuery(connection), secondOne(connection)] }, //required callback
    manuallyRollbackFlag //optional - disable automaticRollback
).then(function() {
    ...
});
```


Example:
```js
database.openTransaction = function (promisedQueries, isManualCommit) {
    return database.getConnection() //gets the connection from the pool
        .then(function () {
            return transaction.startTransaction(database.connection, promisedQueries, isManualCommit)
        });
};

database.openTransaction(function () {
                return [myQuery, myOtherQuery]
            }, true)
            .then(function () {
                return callExternalAPI(someParam);
            })
            .then(function success() {
                return Q.promise(function (resolve, reject) {
                    database.connection.commit(function (err) {
                        if (err) {
                            reject(err);
                        }
                        resolve();
                    });
                }).then(function () {
                    console.log('done');
                });
            }, function externalApiFail() {
                return Q.promise(function (resolve, reject) {
                    database.connection.rollback(function (err, result) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                }
            })
            .fin(database.releaseConnection);
```

## How to test
Since it's a simple tool for transactions it requires an installed MySQL for tests.
