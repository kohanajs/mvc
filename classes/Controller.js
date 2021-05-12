/**
 * Copyright (c) 2020-2021 Kojin Nakana
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

class Controller{
  /**
   *
   * @type {ControllerMixin[]}
   */
  static mixins = [];
  /**
   * Use Mixin to extend controller
   * @param {ControllerMixin[]} mixins
   * @param {Controller} Base
   */
  static mixin(mixins, Base= Controller){
    const C = class extends Base {};
    C.mix(mixins);
    return C;
  }

  static mix(mixins){
    this.mixins = this.mixins.concat(mixins);
  }

  #headerSent = false;
  suppressActionNotFound = false;

  //properties
  request = null;
  error = null;
  body = '';
  headers = {};
  /**
   *
   * @type {{name: String, value: String, options: {secure:Boolean, maxAge:Number}}[]} cookies
   */
  cookies = [];
  status = 200;
  state = new Map();

  /**
   *
   * @param {Request} request
   */
  constructor(request){
    this.request = request;
    this.language = request?.params?.language;
    this.clientIP = (!this.request?.headers) ? '0.0.0.0' :  (this.request.headers['cf-connecting-ip'] || this.request.headers['x-real-ip'] || this.request.headers['x-forwarded-for'] || this.request.headers['remote_addr'] || this.request.ip);
    this.state.set('client', this);

    this.constructor.mixins.forEach(mixin => mixin.init(this.state));
  }

  get(prop){
    return this.state.get(prop);
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
      if(this[action] === undefined) await this.#handleActionNotFound(action);

      //stage 0 : setup
      if(!this.#headerSent) await this.mixinsSetup();

      //stage 1 : before
      if(!this.#headerSent) await this.mixinsBefore();
      if(!this.#headerSent) await this.before();

      //stage 2 : action
      if(!this.#headerSent) await this.mixinsAction(action);
      if(!this.#headerSent) await this[action]();

      //stage 3 : after
      if(!this.#headerSent) await this.mixinsAfter();
      if(!this.#headerSent) await this.after();

    }catch(err){
      await this.serverError(err);
    }

    return {
      status: this.status,
      body: this.body,
      headers : this.headers,
      cookies : this.cookies,
    }
  }

  getAction() {
    return this.request.params?.action || 'index';
  }

  async #handleActionNotFound(action){
    if( this.suppressActionNotFound ){
      this[action] = async ()=>{};
      return;
    }

    await this.notFound(`${ this.constructor.name }::${action} not found`);
  }

  /**
   * @async
   * @callback MixinCallback
   * @param {ControllerMixin} mixin
   */
  /**
   *
   * @param {MixinCallback} lambda
   * @returns {Promise<void>}
   */
  async loopMixins(lambda){
    const mixins = this.constructor.mixins;
    for(let i = 0; i< mixins.length; i++){
      if(this.#headerSent)break;
      await lambda(mixins[i]);
    }
  }

  async mixinsSetup(){
    await this.loopMixins(async mixin => mixin.setup(this.state));
  }

  async mixinsBefore(){
    await this.loopMixins(async mixin => mixin.before(this.state));
  }

  async before(){}

  async mixinsAction(fullActionName){
    await this.loopMixins(async mixin => mixin.execute(fullActionName, this.state))
  }

  async action_index(){} //default action index

  async mixinsAfter(){
    await this.loopMixins(async mixin => mixin.after(this.state));
  }

  async after(){}

  /**
   *
   * @param {string} msg
   */
  async notFound(msg= ''){
    this.body = `404 / ${ msg }`;
    await this.exit(404);
  }

  /**
   *
   * @param {Error} err
   */
  async serverError(err){
    if(!this.body) this.body = err.message;
    this.error = err;
    await this.exit(500);
  }

  /**
   *
   * @param {string} location
   */
  async redirect(location){
    this.headers.location = location;
    await this.exit(302);
  }

  /**
   *
   * @param {string} msg
   */
  async forbidden(msg= ''){
    this.body = `403 / ${ msg }`;
    await this.exit(403);
  }

  /**
   *
   * @param {Number} code
   */
  async exit(code){
    this.#headerSent = true;
    this.status = code;
    await this.mixinsExit();
  }

  async mixinsExit(){
    await this.loopMixins(async mixin => mixin.exit(this.state));
  }
}

Object.freeze(Controller.prototype);
module.exports = Controller;