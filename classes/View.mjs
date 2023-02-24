/**
 * Copyright (c) 2020 Kojin Nakana
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

class View {
  static DefaultViewClass = View;

  static caches = {}

  static factory(file, data = {}) {
    return new this.DefaultViewClass(file, data);
  }

  constructor(file, data) {
    this.file = file;
    this.data = data;
  }

  async render() {
    return JSON.stringify(this.data);
  }

  static clearCache() {
    this.caches = {};
  }
}

Object.freeze(View.prototype);
export default View;