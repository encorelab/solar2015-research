/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:false */
/*global Backbone, _, jQuery, Sail, google */

(function() {
  "use strict";
  var Skeletor = this.Skeletor || {};
  this.Skeletor.Mobile = this.Skeletor.Mobile || {};
  var app = this.Skeletor.Mobile;
  var Model = this.Skeletor.Model;
  Skeletor.Model = Model;
  app.View = {};


  /**
    NewProjectView
  **/
  app.View.NewProjectView = Backbone.View.extend({

    initialize: function () {
      var view = this;
      console.log('Initializing NewProjectView...', view.el);
    },

    events: {
      'click #submit-partners-btn' : 'addPartnersToProject',
      'click .project-theme-button': 'addThemeToProject'
    },

    addPartnersToProject: function() {
      var view = this;

      // put all selecteds into the project
      var partners = [];
      _.each(jQuery('.selected'), function(b) {
        partners.push(jQuery(b).val());
      });
      app.project.set('associated_users',partners);
      app.project.save();

      // move to the next screen
      jQuery('#new-project-student-picker').addClass('hidden');
      jQuery('#new-project-theme-picker').removeClass('hidden');
    },

    addThemeToProject: function(ev) {
      var view = this;

      app.project.set('theme',jQuery(ev.target).val());
      app.project.save();

      jQuery().toastmessage('showSuccessToast', "You have created a new project!");

      // complete the newProject section and move to proposal section
      jQuery('#new-project-theme-picker').addClass('hidden');
      jQuery('#proposal-screen').removeClass('hidden');
      jQuery('#proposal-nav-btn').addClass('active');
    },

    render: function () {
      var view = this;
      console.log("Rendering NewProjectView...");

      // ADD THE USERS
      jQuery('.project-partner-holder').html('');
      if (app.users.length > 0) {
        // sort the collection by username
        app.users.comparator = function(model) {
          return model.get('display_name');
        };
        app.users.sort();

        app.users.each(function(user) {
          var button = jQuery('<button class="btn project-partner-button btn-default btn-base">');
          button.val(user.get('username'));
          button.text(user.get('display_name'));
          jQuery('.project-partner-holder').append(button);

          // add the logged in user to the project
          if (user.get('username') === app.username) {
            button.addClass('selected');
            button.addClass('disabled');
          }
        });

        //register click listeners
        jQuery('.project-partner-button').click(function() {
          jQuery(this).toggleClass('selected');
        });
      } else {
        console.warn('Users collection is empty!');
      }

      // ADD THE THEMES AKA TAGS
      jQuery('.project-theme-holder').html('');
      if (Skeletor.Model.awake.tags.length > 0) {
        Skeletor.Model.awake.tags.each(function(tag) {
          var button = jQuery('<button class="btn project-theme-button btn-default btn-base">');
          button.val(tag.get('name'));
          button.text(tag.get('name'));
          jQuery('.project-theme-holder').append(button);
        });
      } else {
        console.warn('Tags collection is empty!');
      }
    }

  });


  /**
    ProposalsView
  **/
  app.View.ProposalsView = Backbone.View.extend({

    initialize: function () {
      var view = this;
      console.log('Initializing ProposalsView...', view.el);

      view.collection.on('change', function(n) {
        if (n.id === app.project.id) {
          view.render();
        }
      });
    },

    events: {
      'click #publish-proposal-btn' : 'publishProposal',
      'click .nav-splash-btn'       : 'switchToSplashView',
      'keyup :input'                : 'checkForAutoSave'
    },

    switchToSplashView: function() {
      app.resetToSplashScreen();
    },

    publishProposal: function() {
      var view = this;
      var name = jQuery('#proposal-screen [name=name]').val();

      if (name.length > 0) {
        var researchQuestionVal = jQuery('#proposal-screen [name=research_question]').val();
        var needToKnowsVal = jQuery('#proposal-screen [name=need_to_knows]').val();

        app.clearAutoSaveTimer();
        app.project.set('name',name);
        var proposal = app.project.get('proposal');
        proposal.research_question = researchQuestionVal;
        proposal.need_to_knows = needToKnowsVal;
        proposal.published = true;
        app.project.set('proposal',proposal);
        app.project.save();

        // show who is 'logged in' as the group, since that's our 'user' in this case
        app.groupname = name;
        jQuery('.username-display a').text(app.groupname);

        // delete all previous proposal tiles for this project
        Skeletor.Model.awake.tiles.where({ 'project_id': app.project.id, 'from_proposal': true }).forEach(function(tile) {
          tile.destroy();
        });

        // create the new proposal tiles
        view.createProposalTile("Foundational knowledge", needToKnowsVal);
        view.createProposalTile("Research question(s)", researchQuestionVal);

        jQuery().toastmessage('showSuccessToast', "Your proposal has been published. You can come back and edit any time...");

        app.resetToSplashScreen();
      } else {
        jQuery().toastmessage('showErrorToast', "Please enter a title!");
      }
    },

    createProposalTile: function(titleText, bodyText) {
      var view = this;

      var m = new Model.Tile();
      m.set('project_id', app.project.id);
      m.set('author', app.username);
      m.set('type', "text");
      m.set('title', titleText);
      m.set('body', bodyText);
      m.set('favourite', true);
      m.set('from_proposal', true);
      m.set('published', true);
      m.wake(app.config.wakeful.url);
      m.save();
      Skeletor.Model.awake.tiles.add(m);
    },

    // this version of autosave works with nested content. The nested structure must be spelled out *in the html*
    // eg <textarea data-nested="proposal" name="research_question" placeholder="1."></textarea>
    checkForAutoSave: function(ev) {
      var view = this,
          field = ev.target.name,
          input = ev.target.value;
      // clear timer on keyup so that a save doesn't happen while typing
      app.clearAutoSaveTimer();

      // save after 10 keystrokes
      app.autoSave(app.project, field, input, false, jQuery(ev.target).data("nested"));

      // setting up a timer so that if we stop typing we save stuff after 5 seconds
      app.autoSaveTimer = setTimeout(function(){
        app.autoSave(app.project, field, input, true, jQuery(ev.target).data("nested"));
      }, 5000);
    },

    render: function () {
      var view = this;
      console.log("Rendering ProposalsView...");

      jQuery('#proposal-screen [name=name]').text(app.project.get('name'));
      jQuery('#proposal-screen [name=research_question]').text(app.project.get('proposal').research_question);
      jQuery('#proposal-screen [name=need_to_knows]').text(app.project.get('proposal').need_to_knows);

      // they can't be allowed to change the name of their project once they've first created it, since it's now the unique identifier (le sigh)
      if (app.project && app.project.get('proposal').published === true) {
        jQuery('#proposal-screen [name=name]').addClass('disabled');
      } else {
        jQuery('#proposal-screen [name=name]').removeClass('disabled');
      }
    }

  });


  /**
    ProjectReadView
  **/
  app.View.ProjectReadView = Backbone.View.extend({
    textTemplate: "#text-tile-template",
    photoTemplate: "#photo-tile-template",
    videoTemplate: "#video-tile-template",

    initialize: function () {
      var view = this;
      console.log('Initializing ProjectReadView...', view.el);

      // trying this out for now, could be render overload... but allows us to do modified_at for sorting. NOTE: very experimental!! TESTME!  If this is too much rendering on the fly, then we will want to revert back to view.render for change and add
      // these binds should only fire when the collection changes are for your project
      view.collection.on('change', function(n) {
        // If the change fires while project not chosen yet we get an error
        if (app.project && n.get('project_id') === app.project.id && n.get('published') === true) {
          //view.render();
          view.fullRerender();
        }
      });

      view.collection.on('add', function(n) {
        // If the add fires while project not chosen yet we get an error
        if (app.project && n.get('project_id') === app.project.id) {
          //view.render();
          view.fullRerender();
        }
      });

      // removed cause this doesn't do anything given this structure :(
      // view.collection.on('destroy', function(n) {
      //   if (app.project && n.get('project_id') === app.project.id) {
      //     view.fullRerender();
      //   }
      // });

      return view;
    },

    events: {
      'click #nav-write-btn'         : 'newOrResumeOrEditTextTile',
      'click #nav-media-btn'         : 'newOrResumeOrEditMediaTile',
      'click #nav-poster-btn'        : 'switchToPosterView',
      'click .text-tile-container'   : 'newOrResumeOrEditTextTile',
      'click .photo-tile-container'  : 'newOrResumeOrEditMediaTile',
      'click .video-tile-container'  : 'newOrResumeOrEditMediaTile',
    },

    newOrResumeOrEditTextTile: function(ev) {
      var view = this;
      var m;

      // check if we need to resume
      // BIG NB! We use author here! This is the only place where we care about app.username in addition to app.project (we want you only to be able to resume your own notes)
      var tileToResume = view.collection.findWhere({project_id: app.project.id, author: app.username, type: "text", published: false});

      // if the clicked element has a data-id (ie is a tile)
      if (jQuery(ev.target).data('id')) {
        // EDIT TILE
        console.log("Editing...");
        m = view.collection.get(jQuery(ev.target).data('id'));
      } else if (tileToResume) {
        // RESUME TILE
        console.log("Resuming...");
        m = tileToResume;
      } else {
        // NEW TILE
        console.log("Starting a new text tile...");
        m = new Model.Tile();
        m.set('project_id', app.project.id);
        m.set('author', app.username);
        m.set('type', "text");
        m.set('from_proposal', false);
        m.wake(app.config.wakeful.url);
        m.save();
        view.collection.add(m);
      }

      app.projectWriteView.model = m;
      app.projectWriteView.model.wake(app.config.wakeful.url);

      app.hideAllContainers();
      jQuery('#project-write-screen').removeClass('hidden');
      app.projectWriteView.render();
    },

    newOrResumeOrEditMediaTile: function(ev) {
      var view = this;
      var m;

      // check if we need to resume
      // BIG NB! We use author here! This is the only place where we care about app.username in addition to app.project (we want you only to be able to resume your own notes)
      var tileToResume = view.collection.findWhere({project_id: app.project.id, author: app.username, type: "media", published: false});

      // if the clicked element has a data-id (ie is a tile)
      if (jQuery(ev.target).data('id')) {
        // EDIT TILE
        console.log('Editing...');
        m = view.collection.get(jQuery(ev.target).data('id'));
      } else if (tileToResume) {
        // RESUME TILE
        console.log('Resuming...');
        m = tileToResume;
      } else {
        // NEW TILE
        console.log('Starting a new media tile...');
        m = new Model.Tile();
        m.set('project_id',app.project.id);
        m.set('author', app.username);
        m.set('type', "media");
        m.set('from_proposal', false);
        m.wake(app.config.wakeful.url);
        m.save();
        view.collection.add(m);
     }

      app.projectMediaView.model = m;
      app.projectMediaView.model.wake(app.config.wakeful.url);

      app.hideAllContainers();
      jQuery('#project-media-screen').removeClass('hidden');
      app.projectMediaView.render();
    },

    switchToPosterView: function() {
      jQuery().toastmessage('showErrorToast', "It is not time for this yet, kids");
      //app.hideAllContainers();
      //jQuery('#project-write-screen').removeClass('hidden');
    },

    render: function() {
      var view = this;
      console.log("Rendering ProjectReadView...");

      // sort newest to oldest (prepend!)
      view.collection.comparator = function(model) {
        return model.get('created_at');
      };

      var myPublishedTiles = view.collection.sort().where({published: true, project_id: app.project.id});
      var list = jQuery('#tiles-list');

      _.each(myPublishedTiles, function(tile){
        var starStatus = null,
            listItemTemplate = null,
            listItem = null;

        if (tile.get('favourite') === true) {
          starStatus = "fa-star";
        } else {
          starStatus = "fa-star-o";
        }

        if (tile.get('type') === "text") {
          listItemTemplate = _.template(jQuery(view.textTemplate).text());
          listItem = listItemTemplate({ 'id': tile.get('_id'), 'title': tile.get('title'), 'body': tile.get('body'), 'star': starStatus });
        } else if (tile.get('type') === "media" && app.photoOrVideo(tile.get('url')) === "photo") {
          listItemTemplate = _.template(jQuery(view.photoTemplate).text());
          listItem = listItemTemplate({ 'id': tile.get('_id'), 'url': app.config.pikachu.url + tile.get('url'), 'star': starStatus });
        } else if (tile.get('type') === "media" && app.photoOrVideo(tile.get('url')) === "video") {
          listItemTemplate = _.template(jQuery(view.videoTemplate).text());
          listItem = listItemTemplate({ 'id': tile.get('_id'), 'url': app.config.pikachu.url + tile.get('url'), 'star': starStatus });
        } else {
          console.error("Unknown tile type!");
        }

        var existingNote = list.find("[data-id='" + tile.get('_id') + "']");
        if (existingNote.length === 0) {
          list.prepend(listItem);
        } else {
          existingNote.replaceWith(listItem);
        }
      });
    },

    // testing out a way to deal with destroy events (since render wouldn't normally clear out the list and start from scratch, with good reason). This seems to be working.
    //TODO: recombine this and use a flag to set up the full rerender, or something else...
    fullRerender: function() {
      var view = this;
      console.log("Doing a full rerender for ProjectReadView...");

      // sort newest to oldest (prepend!)
      view.collection.comparator = function(model) {
        return model.get('modified_at');
      };

      var myPublishedTiles = view.collection.sort().where({published: true, project_id: app.project.id});
      var list = jQuery('#tiles-list');
      list.html("");

      _.each(myPublishedTiles, function(tile) {
        var starStatus = null,
            listItemTemplate = null,
            listItem = null;

        if (tile.get('favourite') === true) {
          starStatus = "fa-star";
        } else {
          starStatus = "fa-star-o";
        }

        // if (tile.get('type') === "text") {
        //   listItemTemplate = _.template(jQuery(view.textTemplate).text());
        //   listItem = listItemTemplate({ 'id': tile.get('_id'), 'title': tile.get('title'), 'body': tile.get('body'), 'star': starStatus });
        // } else if (tile.get('type') === "media" && app.photoOrVideo(tile.get('url')) === "photo") {
        //   listItemTemplate = _.template(jQuery(view.photoTemplate).text());
        //   listItem = listItemTemplate({ 'id': tile.get('_id'), 'url': app.config.pikachu.url + tile.get('url'), 'star': starStatus });
        // } else if (tile.get('type') === "media" && app.photoOrVideo(tile.get('url')) === "video") {
        //   listItemTemplate = _.template(jQuery(view.videoTemplate).text());
        //   listItem = listItemTemplate({ 'id': tile.get('_id'), 'url': app.config.pikachu.url + tile.get('url'), 'star': starStatus });
        // } else {
        //   console.error("Unknown tile type!");
        // }
        if (tile.get('type') === "text") {
          listItemTemplate = _.template(jQuery(view.textTemplate).text());
          listItem = listItemTemplate({ 'id': tile.get('_id'), 'title': tile.get('title'), 'body': tile.get('body'), 'star': starStatus });
        } else if (tile.get('type') === "media" && app.photoOrVideo(tile.get('url')) === "photo") {
          listItemTemplate = _.template(jQuery(view.photoTemplate).text());
          listItem = listItemTemplate({ 'id': tile.get('_id'), 'star': starStatus });
        } else if (tile.get('type') === "media" && app.photoOrVideo(tile.get('url')) === "video") {
          listItemTemplate = _.template(jQuery(view.videoTemplate).text());
          listItem = listItemTemplate({ 'id': tile.get('_id'), 'star': starStatus });
        } else {
          console.error("Unknown tile type!");
        }

        list.prepend(listItem);
      });
    }

  });


  /**
    ProjectWriteView
  **/
  app.View.ProjectWriteView = Backbone.View.extend({
    initialize: function() {
      var view = this;
      console.log('Initializing ProjectWriteView...', view.el);

      //view.collection.on('sync', view.onModelSaved, view);
    },

    events: {
      'click .nav-read-btn'               : 'switchToReadView',
      // 'click .cancel-tile-btn'            : 'cancelTile',
      'click .publish-tile-btn'           : 'publishTile',
      'click #lightbulb-icon'             : 'showSentenceStarters',
      'click .favourite-icon'             : 'toggleFavouriteStatus',
      'click .sentence-starter'           : 'appendSentenceStarter',
      'keyup :input'                      : 'checkForAutoSave'
    },

    showSentenceStarters: function() {
      jQuery('#sentence-starter-modal').modal({keyboard: true, backdrop: true});
    },

    appendSentenceStarter: function(ev) {
      // add the sentence starter text to the current body (note that this won't start the autoSave trigger)
      var bodyText = jQuery('#tile-body-input').val();
      bodyText += jQuery(ev.target).text();
      jQuery('#tile-body-input').val(bodyText);

      jQuery('#sentence-starter-modal').modal('hide');
    },

    toggleFavouriteStatus: function(ev) {
      var view = this;

      jQuery('#project-write-screen .favourite-icon').addClass('hidden');

      if (jQuery(ev.target).hasClass('favourite-icon-unselected')) {
        jQuery('#project-write-screen .favourite-icon-selected').removeClass('hidden');
        view.model.set('favourite',true);
        view.model.save();
      } else {
        jQuery('#project-write-screen .favourite-icon-unselected').removeClass('hidden');
        view.model.set('favourite',false);
        view.model.save();
      }
    },

    checkForAutoSave: function(ev) {
      var view = this,
          field = ev.target.name,
          input = ev.target.value;
      // clear timer on keyup so that a save doesn't happen while typing
      app.clearAutoSaveTimer();

      // save after 10 keystrokes
      app.autoSave(view.model, field, input, false);

      // setting up a timer so that if we stop typing we save stuff after 5 seconds
      app.autoSaveTimer = setTimeout(function(){
        app.autoSave(view.model, field, input, true);
      }, 5000);
    },

    // destroy a model, if there's something to destroy
    // cancelTile: function() {
    //   var view = this;

    //   // if there is a tile
    //   if (view.model) {
    //     // confirm delete
    //     if (confirm("Are you sure you want to delete this tile?")) {
    //       app.clearAutoSaveTimer();
    //       view.model.destroy();
    //       // and we need to set it to null to 'remove' it from the local collection
    //       view.model = null;
    //       jQuery('.input-field').val('');
    //       view.switchToReadView();
    //     }
    //   }
    // },

    publishTile: function() {
      var view = this;
      var title = jQuery('#tile-title-input').val();
      var body = jQuery('#tile-body-input').val();

      if (title.length > 0 && body.length > 0) {
        app.clearAutoSaveTimer();
        view.model.set('title',title);
        view.model.set('body',body);
        view.model.set('published', true);
        view.model.set('modified_at', new Date());
        view.model.save();
        jQuery().toastmessage('showSuccessToast', "Published to the tile wall!");

        view.model = null;
        jQuery('.input-field').val('');
        view.switchToReadView();
      } else {
        jQuery().toastmessage('showErrorToast', "You need to complete both fields to submit your tile...");
      }
    },

    switchToReadView: function() {
      app.hideAllContainers();
      jQuery('#project-read-screen').removeClass('hidden');
    },

    // onModelSaved: function(model, response, options) {
    //   model.set('modified_at', new Date());
    // },

    render: function () {
      var view = this;
      console.log("Rendering ProjectWriteView...");

      jQuery('.favourite-icon').addClass('hidden');
      if (view.model.get('favourite') === true) {
        jQuery('.favourite-icon-selected').removeClass('hidden');
      } else {
        jQuery('.favourite-icon-unselected').removeClass('hidden');
      }

      jQuery('#tile-title-input').val(view.model.get('title'));
      jQuery('#tile-body-input').val(view.model.get('body'));
    }
  });


  /**
    ProjectMediaView
  **/
  app.View.ProjectMediaView = Backbone.View.extend({
    initialize: function() {
      var view = this;
      console.log('Initializing ProjectMediaView...', view.el);
    },

    events: {
      'click .nav-read-btn'               : 'switchToReadView',
      // 'click .cancel-tile-btn'            : 'cancelTile',
      'click .publish-tile-btn'           : 'publishTile',
      'click .favourite-icon'             : 'toggleFavouriteStatus',
      'click .originator-btn'             : 'toggleOriginator',
      'change #photo-file'                : 'uploadPhoto'
      // 'click #play-video-btn'             : 'playVideo',
      // 'click #photo-file'                 : 'playVideo',
      // 'click #project-media-screen video' : 'playVideo'
    },

    // playVideo: function() {

    // },

    toggleFavouriteStatus: function(ev) {
      var view = this;

      jQuery('#project-media-screen .favourite-icon').addClass('hidden');

      if (jQuery(ev.target).hasClass('favourite-icon-unselected')) {
        jQuery('#project-media-screen .favourite-icon-selected').removeClass('hidden');
        view.model.set('favourite',true);
        view.model.save();
      } else {
        jQuery('#project-media-screen .favourite-icon-unselected').removeClass('hidden');
        view.model.set('favourite',false);
        view.model.save();
      }
    },

    toggleOriginator: function(ev) {
      var view = this;

      jQuery('.originator-btn').removeClass('disabled');
      jQuery('.originator-btn').removeClass('selected');
      jQuery(ev.target).addClass('disabled');
      jQuery(ev.target).addClass('selected');

      view.model.set('originator',jQuery(ev.target).data('originator'));
      view.model.save();
    },

    // another nother attempt at this - now trigger on change so that the user only has to ever do one thing (remove enable upload)
    uploadPhoto: function() {
      var view = this;

      var file = jQuery('#photo-file')[0].files.item(0);
      var formData = new FormData();
      formData.append('file', file);

      jQuery('#photo-upload-spinner').removeClass('hidden');
      jQuery('.camera-icon-label').addClass('invisible');

      jQuery.ajax({
        url: app.config.pikachu.url,
        type: 'POST',
        success: success,
        error: failure,
        data: formData,
        cache: false,
        contentType: false,
        processData: false
      });

      function failure(err) {
        jQuery('#photo-upload-spinner').addClass('hidden');
        jQuery('.camera-icon-label').removeClass('invisible');
        jQuery().toastmessage('showErrorToast', "Photo could not be uploaded. Please try again");
      }

      function success(data, status, xhr) {
        jQuery('#photo-upload-spinner').addClass('hidden');
        jQuery('.camera-icon-label').removeClass('invisible');
        console.log("UPLOAD SUCCEEDED!");
        console.log(xhr.getAllResponseHeaders());
        // add it to the model
        view.model.set('url',data.url);
        view.model.save();
        view.render();
      }
    },

    // cancelTile: function() {
    //   var view = this;

    //   // if there is a tile
    //   if (view.model) {
    //     // confirm delete
    //     if (confirm("Are you sure you want to delete this tile?")) {
    //       app.clearAutoSaveTimer();
    //       view.model.destroy();
    //       // and we need to set it to null to 'remove' it from the local collection
    //       view.model = null;
    //       jQuery('.input-field').val('');
    //       // clears the value of the photo input. Adapted from http://stackoverflow.com/questions/1043957/clearing-input-type-file-using-jquery
    //       jQuery('#photo-file').replaceWith(jQuery('#photo-file').clone());
    //       view.switchToReadView();
    //     }
    //   }
    // },

    publishTile: function() {
      var view = this;

      if (view.model.get('url') && view.model.get('originator')) {
        view.model.set('published', true);
        view.model.set('modified_at', new Date());
        view.model.save();
        jQuery().toastmessage('showSuccessToast', "Published to the tile wall!");

        view.model = null;
        jQuery('.input-field').val('');
        // clears the value of the photo input. Adapted from http://stackoverflow.com/questions/1043957/clearing-input-type-file-using-jquery
        jQuery('#photo-file').replaceWith(jQuery('#photo-file').clone());
        view.switchToReadView();
      } else {
        jQuery().toastmessage('showErrorToast', "Please add a picture or video and confirm whether this is your own drawing, model, or other form of representation...");
      }
    },

    switchToReadView: function() {
      app.hideAllContainers();
      jQuery('#project-read-screen').removeClass('hidden');
    },

    render: function() {
      var view = this;
      console.log("Rendering ProjectMediaView...");

      // favourite button (the star)
      jQuery('.favourite-icon').addClass('hidden');
      if (view.model.get('favourite') === true) {
        jQuery('.favourite-icon-selected').removeClass('hidden');
      } else {
        jQuery('.favourite-icon-unselected').removeClass('hidden');
      }

      // originator buttons
      // doing it this way since I don't want to deal with radio buttons
      jQuery('.originator-btn').removeClass('disabled');
      jQuery('.originator-btn').removeClass('selected');
      if (view.model.get('originator') === "self") {
        jQuery('#self-originator-btn').addClass('disabled');
        jQuery('#self-originator-btn').addClass('selected');
      } else if (view.model.get('originator') === "other") {
        jQuery('#others-originator-btn').addClass('disabled');
        jQuery('#others-originator-btn').addClass('selected');
      }

      // photo
      if (view.model.get('url') && app.photoOrVideo(view.model.get('url')) === "photo") {
        jQuery('.camera-icon').replaceWith(jQuery('<img src="' + app.config.pikachu.url + view.model.get('url') + '" class="camera-icon img-responsive" />'));
      } else if (view.model.get('url') && app.photoOrVideo(view.model.get('url')) === "video") {
        jQuery('.camera-icon').replaceWith(jQuery('<video src="' + app.config.pikachu.url + view.model.get('url') + '" class="camera-icon img-responsive" controls />'));
      } else {
        jQuery('.camera-icon').replaceWith(jQuery('<img src="img/camera_icon.png" class="camera-icon img-responsive" alt="camera icon" />'));
      }
    }
  });


  /**
    ReviewView
    This is one part of ReviewsView which shows many parts
  **/
  app.View.ReviewView = Backbone.View.extend({
    template: _.template("<button class='project-to-review-btn btn' data-id='<%= _id %>'><%= theme %> - <%= name %></button>"),

    events: {
      'click .project-to-review-btn' : 'switchToProjectDetailsView',
    },

    render: function() {
      var view = this;
      // remove all classes from root element
      view.$el.removeClass();

      // hiding unpublished proposals
      if (view.model.get('proposal').published === false) {
        view.$el.addClass('hidden');
      }

      // here we decide on where to show the review
      if (view.model.get('proposal').review_published === true) { // Is review published
        view.$el.addClass('box4');
      } else if (view.model.get('proposal').review_published === false && !view.model.get('proposal').write_lock) { // unpublished and without write lock --> up for grabs!
        view.$el.addClass('box2');
      } else if (view.model.get('proposal').review_published === false && view.model.get('proposal').write_lock === app.project.get('name')) { // unpublished and with write lock from our project
        view.$el.addClass('box1');
      } else if (view.model.get('proposal').review_published === false && view.model.get('proposal').write_lock && view.model.get('proposal').write_lock !== app.project.get('name')) { // unpublished and with write lock from other projects
        view.$el.addClass('box3');
      } else {
        view.$el.addClass('fail');
      }

      view.$el.html(this.template(view.model.toJSON()));
      return this;
    },

    initialize: function () {
      var view = this;
      //console.log('Initializing ReviewView...', view.el);

      view.model.on('change', view.render, view);

      return view;
    },

    switchToProjectDetailsView: function(ev) {
      var view = this;
      // would it be better to instantiate a new model/view here each time?
      // app.reviewDetailsView.model = Skeletor.Model.awake.projects.get(jQuery(ev.target).data("id"));
      app.reviewDetailsView.model = view.model;
      jQuery('#review-overview-screen').addClass('hidden');
      jQuery('#review-details-screen').removeClass('hidden');
      app.reviewDetailsView.render();
    }
  });

  /**
    ReviewsView
  **/
  app.View.ReviewsView = Backbone.View.extend({
    template: _.template('<h2 class="box1">Reviews locked by our project team but not finished</h2><h2 class="box2">Select a proposal to review</h2><h2 class="box3">Reviews locked by other project teams but not finished</h2><h2 class="box4">Completed reviews</h2>'),

    initialize: function() {
      var view = this;
      // console.log('Initializing ReviewsView...', view.el);

      // TODO: This has to be here since elements that are unpublished are not show but add fires on creation. So we have to catch the change :(
      view.collection.on('change', function(n) {
        view.render();
      });

      view.collection.on('add', function(n) {
        // view.addOne(n);
        view.render();
      });

      return view;
    },

    events: {
      'click .project-to-review-btn' : 'switchToProjectDetailsView',
    },


    addOne: function(proj) {
      var view = this;
      // wake up the project model
      proj.wake(app.config.wakeful.url);
      var reviewItemView = new app.View.ReviewView({model: proj});
      var listToAddTo = view.$el.find('.inner-wrapper');
      listToAddTo.append(reviewItemView.render().el);
    },

    render: function () {
      var view = this;
      console.log("Rendering ReviewsView...");

      // clear the area
      view.$el.find('.inner-wrapper').html('');

      // add the headers
      var headers = view.template();
      view.$el.find('.inner-wrapper').append(headers);

      // sort by theme
      view.collection.comparator = function(model) {
        return model.get('theme');
      };

      var publishedProjectProposals = view.collection.sort().filter(function(proj) {
        return (app.project && proj.get('name') !== app.project.get('name') && proj.get('proposal').published === true && proj.get('theme'));
      });

      publishedProjectProposals.forEach(function(proposal) {
        view.addOne(proposal);
      });
    }

  });


  /**
    ReviewDetailsView
  **/
  app.View.ReviewDetailsView = Backbone.View.extend({
    template: '',
    // template: '#review-details-template',

    initialize: function () {
      var view = this;
      console.log('Initializing ReviewDetailsView...', view.el);

      view.template = _.template(jQuery('#review-details-template').text());

      return view;
    },

    events: {
      'click #return-to-overview-btn' : 'switchToProjectOverviewView',
      'click #publish-review-btn'     : 'publishReview',
      'click #cancel-review-btn'      : 'cancelReview',
      'keyup :input'                  : 'startModifying'
    },

    publishReview: function() {
      var view = this;

      var reviewResearchQuestion = jQuery('#review-details-screen [name=review_research_question]').val();
      var reviewNeedToKnows = jQuery('#review-details-screen [name=review_need_to_knows]').val();

      if (reviewResearchQuestion.length > 0 && reviewNeedToKnows.length > 0) {
        app.clearAutoSaveTimer();
        var proposal = view.model.get('proposal');
        proposal.review_research_question = jQuery('#review-details-screen [name=review_research_question]').val();
        proposal.review_need_to_knows = jQuery('#review-details-screen [name=review_need_to_knows]').val();
        proposal.reviewer = app.groupname;
        proposal.review_published = true;
        view.model.set('proposal',proposal);
        // view.switchToProjectOverviewView();
        view.model.save();
        jQuery().toastmessage('showSuccessToast', "Your review has been sent!");
        view.switchToProjectOverviewView();
      } else {
        jQuery().toastmessage('showErrorToast', "Please complete your review before submitting...");
      }
    },

    cancelReview: function() {
      var view = this;

      if (confirm("Are you sure you want to delete this review?")) {
        app.clearAutoSaveTimer();
        var proposal = view.model.get('proposal');
        proposal.review_research_question = "";
        proposal.review_need_to_knows = "";
        // Also remove the lock
        delete proposal.write_lock;
        view.model.set('proposal',proposal);
        view.model.save();
        jQuery('.input-field').val('');
        view.switchToProjectOverviewView();
      }
    },

    switchToProjectOverviewView: function(ev) {
      var view = this;
      // view.model = null;
      jQuery('#review-details-screen').addClass('hidden');
      jQuery('#review-overview-screen').removeClass('hidden');
      app.reviewsView.render(); // I hate this but somehow all other clients rerender but not ourselves
    },

    startModifying: function(ev) {
      var view = this;

      // set a write lock on the model
      var proposal = view.model.get('proposal');
      proposal.write_lock = app.project.get('name');
      view.model.save();

      view.checkForAutoSave(ev);
    },

    checkForAutoSave: function(ev) {
      var view = this,
          field = ev.target.name,
          input = ev.target.value;
      // clear timer on keyup so that a save doesn't happen while typing
      app.clearAutoSaveTimer();

      // save after 10 keystrokes
      app.autoSave(view.model, field, input, false, jQuery(ev.target).data("nested"));

      // setting up a timer so that if we stop typing we save stuff after 5 seconds
      app.autoSaveTimer = setTimeout(function(){
        app.autoSave(view.model, field, input, true, jQuery(ev.target).data("nested"));
      }, 5000);
    },

    render: function () {
      var view = this;
      console.log("Rendering ReviewDetailsView...");
      // clearing the root element of the view
      view.$el.html("");
      // create json object from model
      var modJson = view.model.toJSON();
      var pWriteLock = view.model.get('proposal').write_lock;
      // if the proposal has a write lock
      if (typeof pWriteLock === 'undefined' || pWriteLock === null || pWriteLock === app.project.get('name')) {
        modJson.write_lock = false;
      } else {
        modJson.write_lock = true;
      }
      // create everything by rendering a template
      view.$el.html(view.template(modJson));
      return view;
    }

  });

  this.Skeletor = Skeletor;
}).call(this);
