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
var app = {};

var jQuery = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
Backbone.$ = jQuery;
var btoa = require('btoa');
var url = require('url');
var path = require('path');
// var mqtt = require('mqtt');

// var mongo = require('mongodb');

var Drowsy = require('backbone.drowsy.encorelab').Drowsy;
var Wakeful = require('backbone.drowsy.encorelab/wakeful').Wakeful;
console.log (Wakeful);

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

var DATABASE = config.drowsy.db+'-'+runId;

// danger! monkeypatch!
String.prototype.toCamelCase = function(){
  return this.replace(/([\-_][a-z]|^[a-z])/g, function($1){return $1.toUpperCase().replace(/[\-_]/,'');});
};

/*******************************/
// setup the model and process data
console.log("Agent is agenting!");
initAgent();

function initAgent () {
  console.log("Starting to initialize model with server <"+config.drowsy.url+"> and database <"+DATABASE+">");

  Skeletor.Model.init(config.drowsy.url, DATABASE)
  .then(function () {
    console.log("Inited and now wake ..");
    // Skeletor.Model.wake(config.wakeful.url);
  }).done(function () {
    console.log("Model initialized and awake!");
    ready();
  });
}


function ready() {
  console.log("Entered ready()");
  // console.log(Skeletor.Model);
  // app.tiles = Skeletor.Model.awake.tiles;
  // app.tiles.wake(webbots.config.wakeful.url);
  app.tiles = new Skeletor.Model.Tiles();
  app.tiles.wake(config.wakeful.url);

  app.projects = new Skeletor.Model.Projects();

  app.grabbedPosterItems = new Skeletor.Model.GrabbedPosterItems();

  var connectTimer = setInterval(processingGrabbedPosterItems, 10000);
}

function processingGrabbedPosterItems () {
  app.grabbedPosterItems.fetch()
  .done(function () {
    app.projects.fetch()
    .done(function () {
      var posterItemsToProcess = app.grabbedPosterItems.where({'processed_to_tile': false});

      console.log(posterItemsToProcess);

      posterItemsToProcess.forEach(function (grabbedPosterItem) {
        var tile = createTileFromGrabbedPosterItem (grabbedPosterItem);
        tile.save().done(function () {
          grabbedPosterItem.set('processed_to_tile', true);
          grabbedPosterItem.set('tile_id', tile.id);
          grabbedPosterItem.save().done(function () {
            console.log("Adding tile to tiles collecton");
            app.tiles.add(tile);
          });
        });
      });
    });
  });
}

function createTileFromGrabbedPosterItem (grabbedPosterItem) {
  // sort the collection by username
  // var projects = Skeletor.Model.awake.projects.where({"associated_users":{"$in":[grabbedPosterItem.get('grabbing_user_name')]}});
  var projects = app.projects.filter(function(p){return _.contains(p.get('associated_users'), grabbedPosterItem.get('grabbing_user_name') );});
  projects.comparator = function(model) {
    return model.get('created_at');
  };
  var latestProject = _.last(projects.sort());

  if (typeof latestProject === 'undefined' || latestProject === null) {
    throw "User <"+grabbedPosterItem.get('grabbing_user_name')+"> seems to have no current project";
  }

  console.log("Creating tile ...");
  var tileObj = {};
  tileObj.project_id = latestProject.id;
  tileObj.author = grabbedPosterItem.get('grabbing_user_name');
  tileObj.type = grabbedPosterItem.get('type');
  tileObj.title = "This is grabbed from poster: "+grabbedPosterItem.get('poster_from_title');
  if (grabbedPosterItem.get('type') === "media") {
    // tileObj.url = jQuery.url(grabbedPosterItem.get('content')).attr('file');
    // var urlObj = url.parse(grabbedPosterItem.get('content'));
    var parsed = url.parse(grabbedPosterItem.get('content'));
    tileObj.url = path.basename(parsed.pathname);
    console.log('tile path name: ' +tileObj.url +grabbedPosterItem.get('content'));
  } else {
    tileObj.body = grabbedPosterItem.get('content');
  }
  tileObj.cited_from_user_uuid = grabbedPosterItem.get('user_from_uuid');
  tileObj.cited_from_poster_uuid = grabbedPosterItem.get('poster_from_uuid');
  tileObj.cited_from_poster_item_uuid = grabbedPosterItem.get('grabbed_poster_item_uuid');
  tileObj.from_proposal = false;

  // tileObj.project_id = "Not forgotten, but magic needs to be implemented";

  // do some processing of grabbedPosterItem and translate to tile
  tileObj.grabbed_poster_item_id = grabbedPosterItem.id;
  // Take newly create tile object and turn it into a tile model
  var tileModel = new Skeletor.Model.Tile(tileObj);
  tileModel.wake(config.wakeful.url);
  tileModel.set('published', true);
  // return tile so it can be added to tile collection
  console.log('kkkkkkkkkkkkkkkkk');
  console.log(tileModel);
  return tileModel;
}