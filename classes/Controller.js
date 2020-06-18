/**
 * Copyright (c) 2020 Colin Leung (Komino)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

class Controller{
  /**
   *
   * @param {Request} request
   */
  constructor(request){
    this.mixins = [];
    this.mixin = new Map();//list of behaviour added by mixin

    this.headerSent = false;
    this.request = request;

    this.body = '';
    this.headers = {};
    this.cookies = [];// []{name, value, options}
    this.status = 200;
  }

  /**
   *
   * @param {ControllerMixin} mixin
   * @returns {ControllerMixin}
   */
  addMixin(mixin){
    this.mixins.push(mixin);
    return mixin;
  }

  getAction() {
    if(!this.request.params)return 'index';
    return this.request.params.action || 'index';
  }

  async before(){
    for(let i = 0; i < this.mixins.length; i++){
      await this.mixins[i].before();
    }
  }

  async after(){
    for(let i = 0; i < this.mixins.length; i++){
      await this.mixins[i].after();
    }
  }

  /**
   * Loop the mixins and run the action
   * @param {string} fullActionName
   * @returns {Promise<void>}
   */
  async mixinsAction(fullActionName){
    for(let i = 0; i < this.mixins.length; i++){
      await this.mixins[i].execute(fullActionName);
    }
  }

  /**
   *
   * @param {string | null} actionName
   * @returns {ControllerMixin}
   */
  async execute(actionName = null){
    try{
      //guard check function action_* exist
      const action = 'action_' + (actionName || this.getAction());

      if(this[action] === undefined){
        this.notFound(`${ this.constructor.name }::${action} not found`);
        return {
          status: this.status,
          body: this.body,
          headers : this.headers,
          cookies : this.cookies,
        };
      }

      if(!this.headerSent){
        await this.before();
      }

      if(!this.headerSent){
        await this.mixinsAction(action);
      }
      if(!this.headerSent)await this[action]();
      if(!this.headerSent)await this.after();

    }catch(err){
      this.serverError(err);
    }

    return {
      status: this.status,
      body: this.body,
      headers : this.headers,
      cookies : this.cookies,
    }
  }

  /**
   *
   * @param {Error} err
   */
  serverError(err){
    this.body = `<pre>500 / ${ err.message }\n\n ${ err.stack }</pre>`;
    this.exit(500);
  }

  /**
   *
   * @param {string} msg
   */
  notFound(msg= ''){
    this.body = `404 / ${ msg }`;
    this.exit(404);
  }

  /**
   *
   * @param {string} location
   */
  redirect(location){
    this.headers.location = location;
    this.exit(302);
  }

  /**
   *
   * @param {Number} code
   */
  exit(code){
    this.headerSent = true;
    this.status = code;
  }

  /**
   *
   * @param {string} msg
   */
  forbidden(msg= ''){
    this.body = `403 / ${ msg }`;
    this.exit(403);
  }

  async action_index(){
  }
}

Object.freeze(Controller.prototype);
module.exports = Controller;