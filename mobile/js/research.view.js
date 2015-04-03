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
      })
      view.model.set('associated_users',partners);
      view.model.save();

      // move to the next screen
      jQuery('#new-project-student-picker').addClass('hidden');
      jQuery('#new-project-theme-picker').removeClass('hidden');
    },

    addThemeToProject: function(ev) {
      var view = this;

      view.model.set('theme',jQuery(ev.target).val());
      view.model.save();

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
          var button = jQuery('<button class="btn project-partner-button">');
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
        console.warn('Users collection is empty! Check database: '+DATABASE);
      }

      // ADD THE THEMES AKA TAGS
      jQuery('.project-theme-holder').html('');
      if (Skeletor.Model.awake.tags.length > 0) {
        Skeletor.Model.awake.tags.each(function(tag) {
          var button = jQuery('<button class="btn project-theme-button">');
          button.val(tag.get('name'));
          button.text(tag.get('name'));
          jQuery('.project-theme-holder').append(button);
        });
      } else {
        console.warn('Tags collection is empty! Check database: '+DATABASE);
      }
    }

  });


  /**
    ProposalView
  **/
  app.View.ProposalView = Backbone.View.extend({

    initialize: function () {
      var view = this;
      console.log('Initializing ProposalView...', view.el);

      view.collection.on('sync', view.onModelSaved, view);
    },

    events: {
      'click #publish-proposal-btn' : 'publishProposal',
      'keyup :input'                : 'checkForAutoSave'
    },

    publishProposal: function() {
      var view = this;
      var name = jQuery('#proposal-screen [name=name]').val();

      if (name.length > 0) {
        app.clearAutoSaveTimer();
        view.model.set('name',name);
        var proposal = view.model.get('proposal');
        proposal.research_question = jQuery('#proposal-screen [name=research_question]').val();
        proposal.need_to_knows = jQuery('#proposal-screen [name=need_to_knows]').val();
        proposal.published = true;
        view.model.set('proposal',proposal);
        view.model.save();
        jQuery().toastmessage('showSuccessToast', "Your proposal has been published. You can come back and edit any time...");
      } else {
        jQuery().toastmessage('showErrorToast', "Please enter a title!");
      }
    },

    onModelSaved: function(model, response, options) {
      model.set('modified_at', new Date());
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
      app.autoSave(view.model, field, input, false, jQuery(ev.target).data("nested"));

      // setting up a timer so that if we stop typing we save stuff after 5 seconds
      app.autoSaveTimer = setTimeout(function(){
        app.autoSave(view.model, field, input, true, jQuery(ev.target).data("nested"));
      }, 5000);
    },

    render: function () {
      var view = this;
      console.log("Rendering ProposalView...");

      jQuery('#proposal-screen [name=name]').text(view.model.get('name'));
      jQuery('#proposal-screen [name=research_question]').text(view.model.get('proposal').research_question);
      jQuery('#proposal-screen [name=need_to_knows]').text(view.model.get('proposal').need_to_knows);
    }

  });


  /**
    WriteView
  **/
  app.View.WriteView = Backbone.View.extend({
    initialize: function() {
      var view = this;
      console.log('Initializing WriteView...', view.el);

      // check if we need to resume any brainstorm note
      var brainstormToResume = view.collection.findWhere({author: app.username, published: false});
      if (brainstormToResume) {
        view.setupResumedBrainstorm(brainstormToResume);
      }
    },

    events: {
      'click #nav-read-btn'               : 'switchToReadView',
      'click #cancel-brainstorm-btn'      : 'cancelBrainstorm',
      'click #publish-brainstorm-btn'     : 'publishBrainstorm',
      'click #brainstorm-title-input'     : 'checkToAddNewBrainstorm',
      'click #brainstorm-body-input'      : 'checkToAddNewBrainstorm',
      'click #lightbulb-icon'             : 'showSentenceStarters',
      'click .sentence-starter'           : 'appendSentenceStarter',
      'keyup :input'                      : 'checkForAutoSave'
    },

    setupResumedBrainstorm: function(brainstorm) {
      var view = this;

      view.model = brainstorm;
      view.model.wake(app.config.wakeful.url);
      jQuery('#brainstorm-title-input').val(brainstorm.get('title'));
      jQuery('#brainstorm-body-input').val(brainstorm.get('body'));
    },

    showSentenceStarters: function() {
      var view = this;

      // setting up to add sentence starter content to a brainstorm, so need to make sure we have a model to add it to
      if (!view.model) {
        view.checkToAddNewBrainstorm();
      }
      jQuery('#sentence-starter-modal').modal({keyboard: true, backdrop: true});
    },

    appendSentenceStarter: function(ev) {
      // add the sentence starter text to the current body (note that this won't start the autoSave trigger)
      var bodyText = jQuery('#brainstorm-body-input').val();
      bodyText += jQuery(ev.target).text();
      jQuery('#brainstorm-body-input').val(bodyText);

      jQuery('#sentence-starter-modal').modal('hide');
    },

    // does it make more sense to put this in the initialize? (and then also in the publish and cancel?)
    checkToAddNewBrainstorm: function() {
      var view = this;

      // if there is no model yet
      if (!view.model) {
        // create a brainstorm object
        view.model = new Model.Brainstorm();
        view.model.set('author',app.username);
        view.model.set('published',false);
        view.model.wake(app.config.wakeful.url);
        view.model.save();
        view.collection.add(view.model);
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
    cancelBrainstorm: function() {
      var view = this;

      // if there is a brainstorm
      if (view.model) {
        // confirm delete
        if (confirm("Are you sure you want to delete this brainstorm?")) {
          app.clearAutoSaveTimer();
          view.model.destroy();
          // and we need to set it to null to 'remove' it from the local collection
          view.model = null;
          jQuery('.input-field').val('');
        }
      }
    },

    publishBrainstorm: function() {
      var view = this;
      var title = jQuery('#brainstorm-title-input').val();
      var body = app.turnUrlsToLinks(jQuery('#brainstorm-body-input').val());

      if (title.length > 0 && body.length > 0) {
        app.clearAutoSaveTimer();
        view.model.set('title',title);
        view.model.set('body',body);
        view.model.set('published', true);
        view.model.set('modified_at', new Date());
        view.model.save();
        jQuery().toastmessage('showSuccessToast', "Published to brainstorm wall");

        view.model = null;
        jQuery('.input-field').val('');
      } else {
        jQuery().toastmessage('showErrorToast', "You need to complete both fields to submit your brainstorm...");
      }
    },

    switchToReadView: function() {
      app.hideAllContainers();
      jQuery('#read-screen').removeClass('hidden');
    },

    render: function () {
      console.log("Rendering WriteView...");
    }
  });


  /**
    ReadView
  **/
  app.View.ReadView = Backbone.View.extend({
    template: "#tile-template",

    initialize: function () {
      var view = this;
      console.log('Initializing ReadView...', view.el);

      // we don't need this, since there's no editing of content in this version
      view.collection.on('change', function(n) {
        view.render();
      });

      view.collection.on('add', function(n) {
        view.render();
      });

      view.render();

      return view;
    },

    events: {
      'click #nav-write-btn'         : 'switchToWriteView',
      'click .tile-container'        : 'showTileDetails'
    },

    switchToWriteView: function() {
      app.hideAllContainers();
      jQuery('#write-screen').removeClass('hidden');
    },

    // TODO: create more views, definitely one for the tiles
    showTileDetails: function(ev) {
      // retrieve the brainstorm with the id in data-id
      var brainstorm = app.readView.collection.get(jQuery(ev.target).data('id'));
      jQuery('#tile-details .tile-title').text(brainstorm.get('title'));
      jQuery('#tile-details .tile-body').text(brainstorm.get('body'));
      jQuery('#tile-details .tile-author').text("- " + brainstorm.get('author'));


      jQuery('#tile-details').modal({keyboard: true, backdrop: true});
    },

    populateList: function(brainstorms, listId) {
      var view = this;

      // we have two lists now, so decide which one we're dealing with here
      var list = jQuery('#'+listId);

      _.each(brainstorms, function(brainstorm){
        var listItemTemplate = _.template(jQuery(view.template).text());
        var listItem = listItemTemplate({ 'id': brainstorm.get('_id'), 'title': brainstorm.get('title'), 'body': brainstorm.get('body'), 'author': '- '+brainstorm.get('author') });

        var existingNote = list.find("[data-id='" + brainstorm.get('_id') + "']");
        if (existingNote.length === 0) {
          list.prepend(listItem);
        } else {
          existingNote.replaceWith(listItem);
        }
      });
    },

    render: function () {
      var view = this;
      console.log("Rendering ReadView...");

      // sort newest to oldest
      view.collection.comparator = function(model) {
        return model.get('created_at');
      };

      // add the brainstorms to the list under the following ordered conditions:
      // - my brainstorms, by date (since we're using prepend)
      // - everyone else's brainstorms, by date (since we're using prepend)
      var myPublishedBrainstorms = view.collection.sort().where({published: true, author: app.username});
      view.populateList(myPublishedBrainstorms, "my-tiles-list");

      var othersPublishedBrainstorms = view.collection.sort().filter(function(b) { return (b.get('published') === true && b.get('author') !== app.username); });
      view.populateList(othersPublishedBrainstorms, "others-tiles-list");
    }

  });


  /**
    ReviewOverviewView
  **/
  app.View.ReviewOverviewView = Backbone.View.extend({

    initialize: function () {
      var view = this;
      console.log('Initializing ReviewOverviewView...', view.el);

      // NOTE/QUESTION: this section basically won't be awake/live updated?
      view.collection.on('change', function(n) {
        view.render();
      });

      view.collection.on('add', function(n) {
        view.render();
      });

      return view;
    },

    events: {
      //'click #nav-write-btn'         : 'switchToWriteView',
    },

    render: function () {
      var view = this;
      console.log("Rendering ReviewOverviewView...");

      var list = jQuery('#review-overview-projects-container');

      // sort by theme
      view.collection.comparator = function(model) {
        return model.get('theme');
      };

      // projects with proposals that are published and that is not this group's project name
      var projectsWithPublishedProposals = view.collection.sort().filter(function(proj) { return (proj.get('proposal').published === true && proj.get('name') !== view.model.get('name')); });

      _.each(projectsWithPublishedProposals, function(proj){
        var listItem = jQuery("<button class='btn' data-id='" + proj.get('_id') + "'>" + proj.get('theme') + " - " + proj.get('name') + "</button>" );

        //list.prepend(listItem);
        var existingProj = list.find("[data-id='" + proj.get('_id') + "']");
        if (existingProj.length === 0) {
          list.prepend(listItem);
        } else {
          existingProj.replaceWith(listItem);
        }
      });
    }

  });

/* START HERE
 NOT WORKING:
- you can log in to any project (doesn't check by name?)
- live updates of new projects added. Maybe cause proposal set to published doesn't trigger things?

*/

  this.Skeletor = Skeletor;
}).call(this);




