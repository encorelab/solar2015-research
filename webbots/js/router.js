/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:true */
/*global  Backbone, Skeletor, _, jQuery, Rollcall */

(function () {
  "use strict";

  this.Skeletor = this.Skeletor || {};
  this.Skeletor.Webbots = this.Skeletor.Webbots || {};
  var Webbots = this.Skeletor.Webbots;

  Webbots.Router = new (Backbone.Router.extend({
    routes: {
      '' : 'index',
      'ben': 'initClassBen',
      'michael': 'initClassMichael',
      'test': 'initClassTest'
    },
    initialize: function() {

    },
    index: function() {
      console.log("routing on");
      jQuery('.control').hide();
      jQuery('.orientation').show();
    },
    initClassBen: function () {
      Skeletor.Webbots.init('ben');
      jQuery('.orientation').hide();
      jQuery('.control').show();
    },
    initClassMichael: function () {
      Skeletor.Webbots.init('michael');
      jQuery('.orientation').hide();
      jQuery('.control').show();
    },
    initClassTest: function () {
      Skeletor.Webbots.init('test');
      jQuery('.orientation').hide();
      jQuery('.control').show();
    },
    start: function() {
      // to allow single page app with various routes
      Backbone.history.start();
      // Skeletor.Webbots.init();
    }
  }))();

  this.Skeletor.Webbots = Webbots;
  return this.Skeletor.Webbots;

}).call(this);