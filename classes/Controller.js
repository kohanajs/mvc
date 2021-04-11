/**
 * Copyright (c) 2020-2021 Kojin Nakana
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const ControllerMixin = require('./ControllerMixin');

class Controller{
  /**
   *
   * @type {Map}
   */
  mixins = new Map();

  #headerSent = false;

  //properties
  allowUnknownAction = false;
  request = null;
  error = null;
  body = '';
  /**
   *
   * @type {Object}
   */
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
    this.clientIP = (!this.request?.headers) ? '0.0.0.0' :  (this.request.headers['cf-connecting-ip'] || this.request.headers['x-real-ip'] || this.request.headers['x-forwarded-for'] || this.request.headers['remote_addr'] || this.request.ip);
    this.state.set('client', this);
  }

  static mix(ins, mixins){
    ins.mixins.set(this, mixins);
    mixins.forEach(mx =>{
      mx.init(ins.state);
    });
  }

  get(prop){
    return this.state.get(prop);
  }

  getAction() {
    return this.request.params?.action || 'index';
  }

  async before(){}

  async after(){}

  /**
   * Loop the mixins and run the action
   * @param {string} fullActionName
   * @returns {Promise<void>}
   */
  async mixinsAction(fullActionName){
    const mxs = [...this.mixins.values()].flat()
    for(let i = 0; i< mxs.length; i++){
      if(this.#headerSent)break;
      await mxs[i].execute(fullActionName, this.state);
    }
  }

  async mixinsBefore(){

    const mxs = [...this.mixins.values()].flat()
    for(let i = 0; i< mxs.length; i++){
      if(this.#headerSent)break;
      await mxs[i].before(this.state);
    }
  }

  async mixinsAfter(){
    const mxs = [...this.mixins.values()].flat()
    for(let i = 0; i< mxs.length; i++){
      if(this.#headerSent)break;
      await mxs[i].after(this.state);
    }
  }

  async mixinsExit(){
    const mxs = [...this.mixins.values()].flat()
    for(let i = 0; i< mxs.length; i++){
      await mxs[i].exit(this.state);
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

      if(this.allowUnknownAction && this[action] === undefined){
        this[action] = async ()=>{};
      }

      if(this[action] === undefined){
        await this.notFound(`${ this.constructor.name }::${action} not found`);
        return {
          status  : this.status,
          body    : this.body,
          headers : this.headers,
          cookies : this.cookies,
        };
      }

      //stage 1 : before
      if(!this.#headerSent){
        await this.mixinsBefore();
      }
      if(!this.#headerSent) await this.before();

      //stage 2 : action
      if(!this.#headerSent){
        await this.mixinsAction(action);
      }

      if(!this.#headerSent)await this[action]();

      //stage 3 : after
      if(!this.#headerSent){
        await this.mixinsAfter();
      }

      if(!this.#headerSent)await this.after();

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
   * @param {string} msg
   */
  async notFound(msg= ''){
    this.body = `404 / ${ msg }`;
    await this.exit(404);
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
   * @param {Number} code
   */
  async exit(code){
    this.#headerSent = true;
    this.status = code;
    await this.mixinsExit();
  }

  /**
   *
   * @param {string} msg
   */
  async forbidden(msg= ''){
    this.body = `403 / ${ msg }`;
    await this.exit(403);
  }

  async action_index(){
  }
}

Object.freeze(Controller.prototype);
module.exports = Controller;