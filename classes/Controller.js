/**
 * Copyright (c) 2020 Kojin Nakana
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const ControllerMixin = require('./ControllerMixin');
const $ = ref => (typeof ref === 'function')? ref() : ref;

class Controller{
  #headerSent = false;
  #mixins = [];

  //list of behaviour added by mixin
  request = null;
  error = null;
  body = '';
  headers = {};
  cookies = [];
  status = 200;

  /**
   *
   * @param {Request} request
   */
  constructor(request){
    //private
    this.request = request;
  }

  /**
   *
   * @param {ControllerMixin} mixin
   */
  addMixin(mixin){
    this.#mixins.push(mixin);
    this.#merge(mixin.exports);
    return mixin.exports;
  }

  #mixinBranches = new Map();
  /**
   * merge exports method and properties after add mixin
   * @param {object} mixinExport
   */
  #merge(mixinExport){
    const exp = Object.assign({}, mixinExport);
    //check mixinExport keys exist
    Object.keys(exp).forEach(key => {
      if(this[key]){
        //key exists..
        //run once
        if(!this.#mixinBranches.get(key)){
          const branch = [this[key]];//copy old handler to branch
          this.#mixinBranches.set(key, branch);

          //handler proxy
          this[key] = ()=> {
            let result = null;
            //dereference all the branches
            branch.forEach(ref =>{
              const value = $(ref);
              if(value == null)return;
              if(result != null)throw new Error(`conflict mixin export value found: (${value}) , (${result})`);
              result = value;
            });

            return result;
          }
        }

        this.#mixinBranches.get(key).push(exp[key]);
        delete exp[key];
      }
    });

    Object.assign(this, exp);
    return mixinExport;
  }

  getAction() {
    return this.request.params?.action || 'index';
  }

  get headerSent(){
    return this.#headerSent;
  }

  async before(){}

  async after(){}

  /**
   * Loop the mixins and run the action
   * @param {string} fullActionName
   * @returns {Promise<void>}
   */
  async mixinsAction(fullActionName){
    for(let i = 0; i< this.#mixins.length; i++){
      await this.#mixins[i].execute(fullActionName);
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
          status  : this.status,
          body    : this.body,
          headers : this.headers,
          cookies : this.cookies,
        };
      }

      //stage 1 : before
      if(!this.#headerSent){
        for(let i = 0; i< this.#mixins.length; i++){
          if(this.#headerSent)break;
          await this.#mixins[i].before();
        }
      }
      if(!this.#headerSent) await this.before();

      //stage 2 : action
      if(!this.#headerSent){
        for(let i = 0; i< this.#mixins.length; i++){
          if(this.#headerSent)break;
          await this.#mixins[i].execute(action);
        }
      }

      if(!this.#headerSent)await this[action]();

      //stage 3 : after
      if(!this.#headerSent){
        for(let i = 0; i< this.#mixins.length; i++){
          if(this.#headerSent)break;
          await this.#mixins[i].after();
        }
      }

      if(!this.#headerSent)await this.after();

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
    this.error = err;
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
    this.#headerSent = true;
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