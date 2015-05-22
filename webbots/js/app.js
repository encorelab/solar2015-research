(function () {
  "use strict";

  var webbots = new this.Skeletor.App();
  var app = webbots;
  var Model = this.Skeletor.Model;


  webbots.init = function(className) {
    _.extend(this, Backbone.Events);

    var requiredConfig = {
      drowsy: {
        url: 'string',
        db: 'string'
      },
      wakeful: {
        url: 'string'
      },
      login_picker:'boolean',
      runs:'object'
    };

    // TODO: load this from config.json
    webbots.loadConfig('../config.json');
    webbots.verifyConfig(webbots.config, requiredConfig);

    // TODO: Pick run id
    var app = {};
    app.runId = className;
    // TODO: should ask at startup
    var DATABASE = webbots.config.drowsy.db+'-'+app.runId;


    // Adding BasicAuth to the XHR header in order to authenticate with drowsy database
    // this is not really big security but a start
    var basicAuthHash = btoa(webbots.config.drowsy.username + ':' + webbots.config.drowsy.password);
    Backbone.$.ajaxSetup({
      beforeSend: function(xhr) {
        return xhr.setRequestHeader('Authorization',
            // 'Basic ' + btoa(username + ':' + password));
            'Basic ' + basicAuthHash);
      }
    });

    Skeletor.Model.init(webbots.config.drowsy.url, DATABASE)
    .then(function () {
      return Skeletor.Model.wake(webbots.config.wakeful.url);
    }).done(function () {
      webbots.ready();
    });
  };

  webbots.ready = function() {
    // RUNSTATE
    // webbots.runState = Skeletor.getState('RUN');
    // if (!webbots.runState) {
    //   webbots.runState = Skeletor.setState('RUN', {
    //     phase: 'brainstorm'
    //   });
    // }
    // webbots.runState.wake(webbots.config.wakeful.url);

    // TAGS
    // Works without these. Why do we keep the instance around here in JS?
    // Most of the collections (runState is special) seem to sit in views
    // webbots.tags = Skeletor.Model.awake.tags;
    // webbots.tags.wake(webbots.config.wakeful.url);

    app.tiles = Skeletor.Model.awake.tiles;
    // app.tiles.wake(webbots.config.wakeful.url);

    app.grabbedPosterItems = new Skeletor.Model.GrabbedPosterItems();
    // webbots.grabbedPosterItems.wake(webbots.config.wakeful.url);

    // // WALL
    // webbots.wall = new webbots.View.Wall({
    //   el: '#wall'
    // });

    // webbots.wall.on('ready', function () {
    //   webbots.trigger('ready');
    // });

    // webbots.wall.ready();
    var connectTimer = setInterval(processingGrabbedPosterItems, 10000);

  };

  var processingGrabbedPosterItems = function () {
    app.grabbedPosterItems.fetch()
    .done(function () {
      var posterItemsToProcess = app.grabbedPosterItems.where({'processed_to_tile': false});

      console.log(posterItemsToProcess);

      posterItemsToProcess.forEach(function (grabbedPosterItem) {
        var tile = createTileFromGrabbedPosterItem (grabbedPosterItem);
        tile.save().done(function (t) {
          grabbedPosterItem.set('processed_to_tile', true);
          grabbedPosterItem.save().done(function () {
            console.log("Adding tile to tiles collecton");
            app.tiles.add(tile);
          });
        });
      });
    });
  };

  var createTileFromGrabbedPosterItem = function (grabbedPosterItem) {
    console.log("Creating tile ...");
    var tileObj = {};
    Object.keys(grabbedPosterItem.attributes).forEach(function (attrKey) {
      if (attrKey !== "_id") {
        tileObj[attrKey] = grabbedPosterItem.attributes[attrKey];
      }
    });
    // do some processing of grabbedPosterItem and translate to tile
    tileObj.grabbed_poster_item_id = grabbedPosterItem.id;
    // Take newly create tile object and turn it into a tile model
    var tileModel = new Skeletor.Model.Tile(tileObj);
    tileModel.wake(app.config.wakeful.url);
    tileModel.set('published', true);
    // return tile so it can be added to tile collection
    return tileModel;
  };


  this.Skeletor.Webbots = webbots;

}).call(this);
