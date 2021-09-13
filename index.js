const Model = require('./classes/Model');
const View = require('./classes/View');
const Controller = require('./classes/Controller');
const ControllerMixin = require('./classes/ControllerMixin');

/**
 *
 * @type {{Model: Model, ControllerMixin: ControllerMixin, Controller: Controller, View: View}}
 */
module.exports = {
  Model,
  View,
  Controller,
  ControllerMixin,
};
