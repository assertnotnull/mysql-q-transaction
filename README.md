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
    [myQuery(connection), secondOne(connection)], //required
    manuallyRollbackFlag //optional - disable automaticRollback
);
```

```startTransaction``` is also a promise so you can do something after it.

```js
transaction.startTransaction(
    connection, // the current connection
    [myQuery(connection), secondOne(connection)], //required
    manuallyRollbackFlag //optional - disable automaticRollback
).then(function() {
    ...
});
```


## How to test
Since it's a simple tool for transactions it requires an installed MySQL for tests.