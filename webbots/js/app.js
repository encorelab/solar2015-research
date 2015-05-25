/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:true */
/*global  Backbone, Skeletor, _, jQuery, Rollcall */
(function () {
  "use strict";

  var webbots = new this.Skeletor.App();
  var app = webbots;
  var Model = this.Skeletor.Model;
  var botRunning = false;
  var connectTimer = null;


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

    webbots.registerClickListeners();

    Skeletor.Model.init(webbots.config.drowsy.url, DATABASE)
    .then(function () {
      return Skeletor.Model.wake(webbots.config.wakeful.url);
    }).done(function () {
      webbots.ready();
    });
  };

  webbots.ready = function() {
    app.tiles = Skeletor.Model.awake.tiles;

    app.grabbedPosterItems = new Skeletor.Model.GrabbedPosterItems();

    // enable on/off button
    jQuery('#run-switch').removeAttr('disabled');
  };

  webbots.registerClickListeners = function () {
    jQuery('#run-switch').click(function (ev) {
      if (botRunning) {
        botRunning = false;
        // bot is running and we need to switch if off
        clearInterval(connectTimer);
        jQuery('#run-switch').html('Turn on');
      } else {
        botRunning = true;
        // bot is NOT running and we need to switch if on
        connectTimer = setInterval(processingGrabbedPosterItems, 5000);
        jQuery('#run-switch').html('Turn off');
      }
    });
  };

  var processingGrabbedPosterItems = function () {
    if (botRunning) {
      app.grabbedPosterItems.fetch()
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
    } else {
      console.warn('Bot set to not run but we somehow still forgot to cancel the interval. Should not happen');
    }
  };

  var createTileFromGrabbedPosterItem = function (grabbedPosterItem) {
    // sort the collection by username
    // var projects = Skeletor.Model.awake.projects.where({"associated_users":{"$in":[grabbedPosterItem.get('grabbing_user_name')]}});
    var projects = Skeletor.Model.awake.projects.filter(function(p){return _.contains(p.get('associated_users'), grabbedPosterItem.get('grabbing_user_name') );});
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
    tileObj.title = "From poster";
    if (grabbedPosterItem.get('type') === "media") {
      tileObj.url = jQuery.url(grabbedPosterItem.get('content')).attr('file');
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
    tileModel.wake(app.config.wakeful.url);
    tileModel.set('published', true);
    // return tile so it can be added to tile collection
    return tileModel;
  };


  this.Skeletor.Webbots = webbots;

}).call(this);
