/*jshint node: true, strict: false, devel: true, debug: true, undef:true, loopfunc:true */

var argv = require('optimist')
  .usage('Usage:\n\t$0 database')
  .demand(1)
  .argv;

var DATABASE = argv._[0];

var jQuery = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
Backbone.$ = jQuery;
var btoa = require('btoa');
var mqtt = require('mqtt');

// var mongo = require('mongodb');

var Drowsy = require('backbone.drowsy.encorelab').Drowsy;
var Wakeful = require('backbone.drowsy.encorelab/wakeful').Wakeful;

var fs = require('fs');
var config = JSON.parse(fs.readFileSync('../config.json'));

console.log("config.json loaded: ", config);

// Adding BasicAuth to the XHR header in order to authenticate with drowsy database
// this is not really big security but a start
var basicAuthHash = btoa(config.drowsy.username + ':' + config.drowsy.password);
Backbone.$.ajaxSetup({
  beforeSend: function(xhr) {
    return xhr.setRequestHeader('Authorization',
        // 'Basic ' + btoa(username + ':' + password));
        'Basic ' + basicAuthHash);
  }
});

var Skeletor = {};
Skeletor.Model = require('../shared/js/model.js').Skeletor.Model;


// danger! monkeypatch!
String.prototype.toCamelCase = function(){
  return this.replace(/([\-_][a-z]|^[a-z])/g, function($1){return $1.toUpperCase().replace(/[\-_]/,'');});
};

/*******************************/

// changes to these collections will be logged
var COLLECTIONS = [
  'grabbed_poster_items'
];

var LOG_TO_COLLECTION = 'events';

// var mongoClient = new mongo.Db(DATABASE, new mongo.Server('localhost', 27017, {}), {w:0});
// var log;
// // TODO: wait for open
// // TOOD: deal with possible error
// // TODO: maybe just switch to mongojs or some other mongo abstraction lib?
// mongoClient.open(function (err) {
//   mongoClient.collection(LOG_TO_COLLECTION, function (err, collection) {
//     log = collection;
//     console.log("Logging to collection '"+LOG_TO_COLLECTION+"'...");
//   });
// });

var staticData = {};
var monitoredColls = {};

// loadStaticData();
setupModel();

console.log("Agent is agenting!");


function setupModel() {
  console.log("Starting to initialize model ...");
  Skeletor.Model.init(config.drowsy.url, DATABASE).done(function () {
    var grabbedPosterItems = new Skeletor.Model.GrabbedPosterItems();
    grabbedPosterItems.wake(config.wakeful.url);

    grabbedPosterItems.on('change', function (doc) {
      // var changed = doc.changedAttributes();
      // changed._id = doc.attributes._id; // need this or Drowsy.Document.parse will crap out
      // logEntry('change', doc, changed);
    });

    grabbedPosterItems.on('add', function (doc) {
      // logEntry('add', doc, doc.toJSON());
    });

    console.log("Model initialized!");

    var client  = mqtt.connect(config.mqtt.url);

    client.on('connect', function () {
      // client.subscribe('IAMPOSTEROUT');
      client.publish('IAMPOSTEROUT', 'Hello mqtt');
      // subscribe to a topic
      client.subscribe('IAMPOSTEROUT', function() {
        // when a message arrives, do something with it
        client.on('message', function (topic, message, packet) {
          console.log("Received '" + message + "' on '" + topic + "'");
          var messageObj = JSON.parse(message);
          var gpi = new Skeletor.Model.GrabbedPosterItem(messageObj);
          gpi.save();
        });
      });
    });

    // client.on('message', function (topic, message) {
    //   // message is Buffer
    //   console.log(message.toString());
    //   client.end();
    // });

  });
}