/**
 * Copyright (c) 2020-2021 Kojin Nakana
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


class ControllerMixin {
  /**
   *
   * @param {Map} state
   */
  static init(state){}

  /**
   *
   * @param {Map} state
   */
  static async before(state){}

  /**
   * @param {String} fullActionName
   * @param {Map} state
   */
  static async execute(fullActionName, state){
    if(!this[fullActionName])return state;
    await this[fullActionName](state);
  }

  /**
   *
   * @param {Map} state
   */
  static async after(state){}

  /**
   * @param {Map} state
   */
  static async exit(state){}
}

Object.freeze(ControllerMixin.prototype);
module.exports = ControllerMixin;