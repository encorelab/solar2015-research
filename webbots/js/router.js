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
    },
    initClassBen: function () {
      Skeletor.Webbots.init('ben');
    },
    initClassMichael: function () {
      Skeletor.Webbots.init('michael');
    },
    initClassTest: function () {
      Skeletor.Webbots.init('test');
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