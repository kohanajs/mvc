/**
 * Copyright (c) 2020 Colin Leung (Komino)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

class View{
  static factory(file, data){
    return new View(file, data);
  }

  static setGlobal(key, value){
    View.globalData[key] = value;
  }

  constructor(file, data, lookupDir){
    this.file = file;
    this.data = data;
    this.lookupDir = lookupDir;
  }

  async render(){
    return JSON.stringify(this.collectProps());
  }

  //use data object (faster) or direct assign variable to view instances (slower)
  collectProps(){
    if(this.data)return Object.assign({}, View.globalData, this.data);

    const props = {};
    Object.keys(this).forEach(x => {
      props[x] = this[x];
    });

    return Object.assign({}, View.globalData, props);
  }

  static clearCache(){
    View.caches = {};
  }
}
View.defaultViewClass = View;

View.clearCache();
View.globalData = {};

Object.freeze(View.prototype);
module.exports = View;