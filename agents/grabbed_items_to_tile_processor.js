/*jshint node: true, strict: false, devel: true, debug: true, undef:true, loopfunc:true */

/*
 ***********  WARNING *************
 * Works only on node <0.12
 * see https://github.com/ranm8/requestify/issues/25
 *
 * nvm (think rvm for node.js) will save your life
 * https://github.com/creationix/nvm
 ***********  WARNING *************
 */

var argv = require('optimist')
  .usage('Usage:\n\t$0 run identification')
  .demand(1)
  .argv;

var runId = argv._[0];
var DATABASE = 'solar2015-'+runId;

var jQuery = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
Backbone.$ = jQuery;
var btoa = require('btoa');
// var mqtt = require('mqtt');

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
// setup the model and process data
setupModel();

console.log("Agent is agenting!");


function setupModel() {
  console.log("Starting to initialize model with server <"+config.drowsy.url+"> and database <"+DATABASE+">");
  Skeletor.Model.init(config.drowsy.url, DATABASE).done(function () {
    console.log("Model initialized!");
    // create collection of grabbed poster item models
    var grabbedPosterItems = new Skeletor.Model.GrabbedPosterItems();
    // and make it wakeful
    grabbedPosterItems.wake(config.wakeful.url);
    // create collection of grabbed poster item models
    var tiles = new Skeletor.Model.Tiles();
    // and make it wakeful
    // tiles.wake(config.wakeful.url);
    grabbedPosterItems.fetch().done(function () {
      grabbedPosterItems.on('change', function (doc) {
        // var changed = doc.changedAttributes();
        // changed._id = doc.attributes._id; // need this or Drowsy.Document.parse will crap out
        // logEntry('change', doc, changed);
        console.log('changed: ');
        console.log(doc);
      });

      grabbedPosterItems.on('add', function (doc) {
        // logEntry('add', doc, doc.toJSON());
        console.log('added: ');
        console.log(doc);

        var tile = createTileFromGrabbedPosterItem (doc);
        tile.save().done(function (t) {
          doc.set('processed_to_tile', true);
          doc.save().done(function () {
            console.log("Adding tile to tiles collecton");
            tiles.add(tile);
          });
        });
      });

      console.log("going over poster items to be processed");

      // At startup go over all grabbed_poster_items and process the once with processed_to_tile = false
      var posterItemsToProcess = grabbedPosterItems.where({'processed_to_tile': false});
      console.log(posterItemsToProcess);
      posterItemsToProcess.forEach(function (doc) {
        var tile = createTileFromGrabbedPosterItem (doc);
        tile.save().done(function (t) {
          doc.set('processed_to_tile', true);
          doc.save().done(function () {
            console.log("Adding tile to tiles collecton");
            tiles.add(tile);
          });
        });
      });
    });



  });
}

function createTileFromGrabbedPosterItem (grabbedPosterItem) {
  console.log("Creating tile ...");
  // do some processing of grabbedPosterItem and translate to tile
  var tileObj = {"data":"ignore me this is a test", "grabbed_poster_item_id": grabbedPosterItem.id};
  // Take newly create tile object and turn it into a tile model
  var model = new Skeletor.Model.Tile(tileObj);
  console.log(model);
  // return tile so it can be added to tile collection
  return model;
}