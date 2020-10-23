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

  //properties
  allowUnknownAction = false;
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
   * merge exports to this controller (append method and properties after add mixin)
   * @param {object} mixinExport
   */
  #merge(mixinExport){
    //make a copy of mixin exports
    const exp = Object.assign({}, mixinExport);

    //check mixinExport keys exist,
    //if exists, branch it
    Object.keys(exp).forEach(key => {
      /** if key exist, create a branch
      //eg: mixinORMRead and mixinHandle both export instance
      //mixinORMRead.action_read
      //mixinHandle.action_read_by_handle
      //controller.action_read_by_handle instance will return () => [()=>undefined, ()=>object]
      //create a function to find first non-null object
      **/
      if(this[key]){
        //key exists..

        //for first time duplicated key found,
        if(!this.#mixinBranches.get(key)){
          const branch = [this[key]];//copy old handler to branch
          this.#mixinBranches.set(key, branch);

          //handler proxy
          this[key] = (all = false) => {
            //branch example , [null, object1, null, object2]
            //return all, [object1, object2]
            if(all)return branch.filter(el => ($(el) != null));

            //by cascade rule, return object2
            for (let i = (branch.length-1); i>=0 ; i--) {
              const value = $(branch[i]);
              if(value === null || value === undefined)continue;

              return value;
            }
          }
        }

        this.#mixinBranches.get(key).push(exp[key]);
        //remove
        delete exp[key];
      }
    });

    //assign to this controller
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
    this.body = `<pre>500 / ${ err.message }</pre>`;
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
    for(let i = 0; i< this.#mixins.length; i++){
      await this.#mixins[i].exit(code);
    }
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