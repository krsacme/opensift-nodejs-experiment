//  OpenShift sample Node application
var express = require('express');
var fs      = require('fs');
var app     = express();
var eps     = require('ejs');

app.use(express.static('views'));

app.engine('html', require('ejs').renderFile);

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080;
var ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';
var mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL;
console.log('process.env.OPENSHIFT_MONGODB_DB_URL = ' + process.env.OPENSHIFT_MONGODB_DB_URL)
console.log('process.env.MONGO_URL = ' + process.env.MONGO_URL)
console.log('process.env.DATABASE_SERVICE_NAME = ' + process.env.DATABASE_SERVICE_NAME)
var mongoURLLabel = "";
if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase();
  var mongoHost = process.env[mongoServiceName + "_SERVICE_HOST"];
  var mongoPort = process.env[mongoServiceName + "_SERVICE_PORT"];
  var mongoUser = process.env.MONGODB_USER
  console.log('mongoHost = ' + mongoHost)
  console.log('mongoPort = ' + mongoPort)
  console.log('mongoUser = ' + mongoUser)
  console.log('pprocess.env.MONGODB_PASSWORD = ' + process.env.MONGODB_PASSWORD)
  console.log('mongoUser = ' + mongoUser)
  if (mongoHost && mongoPort && process.env.MONGODB_DATABASE) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (process.env.MONGODB_USER && process.env.MONGODB_PASSWORD) {
      mongoURL += process.env.MONGODB_USER + ':' + process.env.MONGODB_PASSWORD + '@';
    }
    // Provide UI label that excludes user id and pw

    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + process.env.MONGODB_DATABASE;
    mongoURL += mongoHost + ':' + mongoPort + '/' + process.env.MONGODB_DATABASE;
  }
}
var db = null;
var dbDetails = new Object();

var initDb = function(callback) {
  console.log('initDb: mongoURL = ' + mongoURL)
  if (mongoURL == null) return;

  var mongodb = require('mongodb');  
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log("Connected to MongoDB at: " + mongoURL);
  });
};

app.get('/', function (req, res) {
  console.log('index page request received')
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()}, function(err) {
      if (err) {
        console.log('error in insert - ' + err.message)
      }
    });
    console.log('index page request - Access count increased')
    col.count(function(err, count){
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    console.log('index page request - DB not intialized ')
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/index.htm', function (req, res) {
  console.log('index.htm page request received')
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()}, function(err) {
      if (err) {
        console.log('error in insert - ' + err.message)
      }
    });
    console.log('index.htm page request - Access count increased')
    col.count(function(err, count){
      res.send("index.html request received")
    });
  } else {
    console.log('index.htm page request - DB not intialized ')
    res.send("index.html request received")
  }
});


app.get('/pagecount', function (req, res) {
  console.log('pagecount request received')
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count +'}');
    });
  } else { 
    res.send('{ pageCount: -1 }');
  }
});

app.get('/page', function (req, res) {
  console.log('page request received')
  if (db) {
    db.collection('counts').find({}, function(err, cursor) {
      console.log('counts collection found')
      var cnt = 0;
      cursor.forEach(function(doc) {
        cnt = cnt + 1;
        console.log(doc)
      }, function(err) {
        console.log("counts collection length: " + cnt)
        res.send('{ pageCount: ' + cnt +'}');
      });
    })
  } else { 
    res.send('DB not intialized.');
  }
});


// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on ' + ip + ':' + port);
