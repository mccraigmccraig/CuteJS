/**
 * Cute JS - asynchronous algorithms simplified
 *
 * Copyright 2011, Daniel Kwiecinski
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 */

window.cute = window.cute || {};

(function (window, jQuery) {

  /**
   * Mutual exclusion for JavaScript
   *
   * The fact that most JavaScript runtime environments are single threaded do not guarantee thread safety.
   * In fact one can view a JavaScript execution model as a single CPU with a non pre-emption scheduler.
   * (e.g once task is scheduled OS waits for it completion in order to dispatch another one).
   * When these tasks involve asynchronous calls (as it is often the case in RIA using ajax) waiting for completion callback,
   * single activity is no longer equivalent to cascade of function calls and is subject for race condition.
   * cute.Mutex is the response for such situation and its simple implementation can be viewd as single item Lamport's bakery algorithm
   * where execution order of waiting 'threads' (activities) is not guaranteed.
   */
  function Mutex() {
    this.lock = 0;
  }

  Mutex.prototype.sync = function(originalFunction, resultCallback, exceptionCallback) {
    var synced_fun = Mutex.prototype.sync_with_callbacks.call(this, originalFunction);
    return function() {
      var args = Array.prototype.slice.call(arguments);
      synced_fun.apply(this, [resultCallback, exceptionCallback].concat(args));
    }
  };

  Mutex.prototype.sync_with_callback = function(originalFunction) {
    var synced_fun = Mutex.prototype.sync_with_callbacks.call(this, originalFunction);
    return function() {
      var resultCallback = arguments[0];
      var args = Array.prototype.slice.call(arguments, 1);
      synced_fun.apply(this, [resultCallback, undefined].concat(args));
    }
  };

  Mutex.prototype.sync_with_callbacks = function(originalFunction) {
    var isFunction = function(obj) {
      return !!obj && !!obj.call && !!obj.apply;
    };
    var mutex = this;
    return function() {
      //store original context and arguments of method call
      var callee = this;
      var resultCallback = arguments[0];
      var exceptionCallback = arguments[1];
      var args = Array.prototype.slice.call(arguments, 2);
      //timestamp of function call
      (function attempt() {
        var lock = mutex.lock++;
        if (lock != 0) {
          setTimeout(attempt, 1); // retry in 10 ms
        } else {
          // >>>>>>>>>>>>>>>>>> critical section
          //
          // call originalFunction in original context with original arguments
          try {
            var result = originalFunction.apply(callee, args);
            if (isFunction(resultCallback)) {
              resultCallback.call(callee, result);
            }
          } finally {
            mutex.lock = 0;
          }
          //
          // <<<<<<<<<<<<<<<<<< critical section

        }
      })(); // declare+call
    };
  };

  window.cute.Mutex = Mutex;


  /**
   * Agent - generic reference type.
   * Agent is a reference to underlying state which can be mutated in asynchronous thread-safe way
   * (all mutation defined as functions operating on state are serialized using mutex)
   * @param init  - initial state
   * @param config - agent configuration map
   * config.error_mode - if set as 'continue' in case of an exception in mutation function the agent will be marked as failed
   *  and all the subsequent mutation calls will proceed as normal. In other case, all subsequent
   *  mutation calls will thrown exception. The agent's failed state can be reset by 'restart_agent' method.
   * config.error_handler - a callback which will be called in case of asynchronous mutation exceptions
   */
  function Agent(init, config) {
    this.config = config || {error_mode: 'continue', error_handler: function() {
    }};
    this.state = init;
    this.mutex = new Mutex();
    this.last_failure = undefined;
    var agent = this;

    var success = function(result) {
      agent.state = result;
    };

    var error = function(exception) {
      agent.last_failure = exception;
      if (agent.config.error_handler) {
        agent.config.error_handler.call(agent, exception);
      }
    };

    /**
     * Submits asynchronous mutation call to the agent.
     * @param fun - submitted function receiving as a parameter current state.
     * If the return value is not undefined then that value is set as a new agent's state.
     */
    this.send = function(fun) {
      var exec = agent.mutex.sync_with_callbacks(
              function(state) { // we wrap original function so in case the original don't return value we reuse the state.
                var new_state = fun.call(this, state);
                return (new_state === undefined) ? state : new_state;
              }
              );
      if (agent.last_failure && agent.config.error_mode != 'continue') {
        throw 'Agent is failed, needs restart';
      } else {
        exec(success, error, agent.state);
      }
    };

    /**
     * Returns current agent's state.
     */
    this.get_state = function() {
      return agent.state;
    };

    /**
     * Returns last exception occurred in mutation function or undefined if no such exception was thrown
     * or the agent has been restarted.
     */
    this.get_error = function() {
      return agent.last_failure;
    };

    /**
     * Restarts agent so it is no longer marked as failed
     * @param state - if state is provided it will be used as agent's new state. Works as unconditional state set.
     */
    this.restart_agent = function(state) {
      agent.mutex.sync_with_callbacks(function() {
        agent.state = state;
        agent.last_failure = undefined;
      });
    }
  }

  window.cute.Agent = Agent;

  /**
   *  Agent for Serial behaviour
   */
  function SerialAgent(name, is_first, accumulator, complete_callback, error_handler) {
    this.agent = new Agent({name: name, prev_complete: is_first, prev_value: accumulator, complete_callback: complete_callback}, {error_mode: 'continue', error_handler: error_handler});
  }

  SerialAgent.prototype.set_next = function(agent) {
    this.agent.send(function(state) {
      state.next_agent = agent;
      if (state.prev_complete && state.action_complete) {
        state.value = state.complete_callback.call(this, state.action_result, state.prev_value);
        state.next_agent.prev_complete(state.value, state.prev_value);
      }
    });
  };

  SerialAgent.prototype.prev_complete = function(prev_value) {
    this.agent.send(function(state) {
      state.prev_complete = true;
      state.prev_value = prev_value;
      if (state.action_complete) {
        state.value = state.complete_callback.call(this, state.action_result, state.prev_value);
        if (state.next_agent) {
          state.next_agent.prev_complete(state.value, state.prev_value);
        }
      }
    });
  };

  SerialAgent.prototype.action_complete = function(action_result) {
    this.agent.send(function(state) {
      state.action_complete = true;
      state.action_result = action_result;
      if (state.prev_complete) {
        state.value = state.complete_callback.call(this, state.action_result, state.prev_value);
        if (state.next_agent) {
          state.next_agent.prev_complete(state.value, state.prev_value);
        }
      }
    });
  };


  /**
   * Serial is a behaviour which allows to define dependency chain of asynchronous function calls.
   * Results of asynchronous calls are provided as arguments to their callbacks, which in turn, pass the result to the next asynchronous call in chain.
   */
  function Serial(accumulator, error_handler) {

    /**
     * Allow instantiation without new keyword
     */
    if (!(this instanceof Serial)) {
      return new Serial(accumulator);
    }

    this.current_agent = undefined;
    this.accumulator = accumulator;
    this.error_handler = error_handler || function() {
    };
  }

  Serial.prototype = {

    /**
     * Executes asynchronous action, which is a function called with a callback as an argument
     * @param action - asynchronous function in chain
     * @param complete_callback - a callback which will be called when the action returns. This function does not block the next in chain action,
     * which is called immediately after the previous action completes.
     * @param agent_name - the name of the underlying agent.
     * returns reference to the behaviour itself, allowng for chained syntax.
     */
    exec: function (action, complete_callback, agent_name) {
      var agent;
      complete_callback = complete_callback || function(data, _previous) {
        return data
      };
      if (!this.current_agent) {
        agent = new SerialAgent(agent_name, true, this.accumulator, complete_callback, this.error_handler);  // is first agent in the chain
      } else {
        agent = new SerialAgent(agent_name, false, this.accumulator, complete_callback, this.error_handler); // is NOT first agent in the chain
      }

      if (this.current_agent) {
        this.current_agent.set_next(agent);
      }
      this.current_agent = agent;

      var on_action_complete = function(result) {
        agent.action_complete(result);
      };

      action(on_action_complete);

      return this;
    },

    /**
     * Terminating callback
     * @param final_callback
     */
    end: function(final_callback) {
      var complete_callback = function(result, previous_result) {
        final_callback(previous_result);
      };
      this.exec(function(callback) {
        callback(undefined)
      }, complete_callback);
    },



    /**
     * Ajax specific execution of Serial behaviour. Can be chained with exec
     * @param ajax_settings - settings for asynchronous ajax call
     * @param complete_callback -  @see complete_callback parameter in Serial.exec method
     * @param agent_name - the name of the underlying agent.
     */
    ajax: ajax

  };

  window.cute.Serial = Serial;

  //====================================================================================================================

  /**
   *  Agent for Tense behaviour
   */
  function TenseAgent(error_handler) {
    this.agent = new Agent({}, {error_mode: 'continue', error_handler: error_handler});
  }


  TenseAgent.prototype.action = function(action, complete_callback) {
    var agent = this.agent;
    var self = this;
    agent.send(function(state) {
      if (state.waiting_action) {
        // cancel waiting action
        state.waiting_callback(undefined, 'interrupted');
        state.waiting_callback = undefined;
        state.waiting_action = undefined;
      }
      if (state.is_processing) {
        // if some action is in progress put this action onto the queue
        state.waiting_callback = complete_callback;
        state.waiting_action = action;
      } else {
        // start processing this action
        state.is_processing = true;
        action(function(result) {
          self.action_complete(result, complete_callback);
        })
      }
    });
  };

  TenseAgent.prototype.action_complete = function(result, complete_callback) {
    var agent = this.agent;
    var self = this;
    agent.send(function(state) {
      try {
        complete_callback(result, 'completed');
      } finally {
        state.is_processing = false;
        if (state.waiting_action) {
          // move waiting action from queue to processing
          state.is_processing = true;
          var waiting_callback = state.waiting_callback;
          state.waiting_action(function(result) {
            self.action_complete(result, waiting_callback);
          });
          state.waiting_callback = undefined;
          state.waiting_action = undefined;
        }
      }
    });
  };

  /**
   * Tense is a behaviour which allows to define concurrent asynchronous actions where the last scheduled action pre-empt waiting queue,
   * so there is at most one action waiting for the resource and the most recent one cancels previous one.
   * When the currently executing action finishes, the waiting starts immediately afterwards and new action can wait for its turn.
   */
  function Tense() {

    /**
     * Allow instantiation without new keyword
     */
    if (!(this instanceof Tense)) {
      return new Tense();
    }
    this.agent = new TenseAgent(this.error_handler);

  }


  Tense.prototype = {
    error_handler: function(exception) {
    },
    exec: function(action, complete_callback) {
      this.agent.action(action, complete_callback);
      return this;
    },
    ajax: ajax
  };

  window.cute.Tense = Tense;

  //--------------------------------------------------------------------------------------------------------------------

  //====================================================================================================================

  /**
   *  Agent for Lax behaviour
   */
  function LaxAgent(error_handler) {
    this.agent = new Agent({}, {error_mode: 'continue', error_handler: error_handler});
  }

  // Collection Functions borrowed from http://documentcloud.github.com/underscore/
  // --------------------

  /**
   * Is a given value a number?
   */
  function isNumber(obj) {
    return !!(obj === 0 || (obj && obj.toExponential && obj.toFixed));
  }

  /**
   * The cornerstone, an `each` implementation, aka `forEach`.
   * Handles objects implementing `forEach`, arrays, and raw objects.
   * Delegates to **ECMAScript 5**'s native `forEach` if available.
   */
  var each = function(obj, iterator, context) {
    var value;
    if (obj == null) return;
    if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
      obj.forEach(iterator, context);
    } else if (_.isNumber(obj.length)) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === {}) return;
      }
    } else {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === {}) return;
        }
      }
    }
  };

  /**
   * Higher order map function
   * Return the results of applying the iterator to each element.
   * Delegates to **ECMAScript 5**'s native `map` if available.
   * @param obj
   * @param iterator
   * @param context
   */
  function map(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (Array.prototype.map && obj.map === Array.prototype.map) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  }

  //~ Collection Functions

  LaxAgent.prototype.action = function(action, callbacks) {
    var agent = this.agent;
    var self = this;
    agent.send(function(state) {
      var activity = state.activity;
      if (activity) {
        // previous activity was being created
        activity.interrupted = true;
      }
      var new_activity = {};
      new_activity.callbacks = map(callbacks, function(c) {
        return function() {
          if (new_activity.interrupted) {
            //do nothing
          } else {
            c.apply(undefined, arguments);
          }
        }
      });
      state.activity = new_activity;
      action.apply(undefined, new_activity.callbacks);
    });
  };

  /**
   * Lax is a behaviour which allows to define concurrent asynchronous actions where the last scheduled action invalidates the one currently being executed,,
   * (ˆ la interrupting) by marking its callback function as interrupted so the completion of the current action is ignored. The freshly submitted action becomes
   * the current one and it is executed immediately. This behaviour is very useful for high responsive UI which should reflect the most recent user query.
   * So, for example, UI represent remote resource nad user is frequently querying it with different parameters (by fast button pressing) all but last queries will be
   * canceled.
   */
  function Lax() {
    /**
     * Allow instantiation without new keyword
     */
    if (!(this instanceof Lax)) {
      return new Lax();
    }
    this.agent = new LaxAgent(this.error_handler);
  }


  Lax.prototype = {
    error_handler: function(exception) {
    },
    exec: function() {
      var action = arguments[0];
      var callbacks = Array.prototype.slice.call(arguments, 1, arguments.length);
      this.agent.action(action, callbacks);
      return this;
    },
    ajax: ajax
  };

  window.cute.Lax = Lax;

  //--------------------------------------------------------------------------------------------------------------------

  //====================================================================================================================

  /**
   *  Agent for Eager behaviour
   */
  function EagerAgent(error_handler) {
    this.agent = new Agent({futures: [], completed_count: 0}, {error_mode: 'continue', error_handler: error_handler});
  }


  EagerAgent.prototype.action = function(action) {
    var self = this;
    this.agent.send(function(state) {
      if (state.final_callback) {
        throw "Eager behaviour is terminated. No more scheduling of asynchronous actions is allowed."
      } else {
        var future = {action: action, complete: false};
        state.futures.push(future);
        action(function(result) {
          self.action_complete(result, future);
        })
      }
    });
  };

  EagerAgent.prototype.action_complete = function(result, future) {
    this.agent.send(function(state) {
      future.result = result;
      state.completed_count = state.completed_count + 1;
      if (state.final_callback && state.completed_count == state.futures.length) {
        state.final_callback.apply(undefined, map(state.futures, function(future) {
          return future.result
        }));
      }
    });
  };

  EagerAgent.prototype.register_callbacks = function(final_callback) {
    this.agent.send(function(state) {
      state.final_callback = final_callback;
      if (state.completed_count == state.futures.length) {
        state.final_callback.apply(undefined, state.results);
      }
    });
  };


  /**
   * Eager is a behaviour which allows to define concurrent asynchronous actions whose results are collected and provided in single final callback.
   * The asynchronous actions are executed in parallel and do not depend on each other. Eager is useful for example when we need to do single UI update
   * which depends on several resources each accessed via separate ajax call.
   */
  function Eager() {

    /**
     * Allow instantiation without new keyword
     */
    if (!(this instanceof Eager)) {
      return new Eager();
    }
    this.agent = new EagerAgent(this.error_handler);

  }


  Eager.prototype = {
    error_handler: function(exception) {
    },
    exec: function(action) {
      this.agent.action(action);
      return this;
    },

    ajax: ajax,
    /**
     * Terminating callback
     * @param final_callback
     */
    end: function(final_callback) {
      this.agent.register_callbacks(final_callback);
    }
  };

  window.cute.Eager = Eager;

  //--------------------------------------------------------------------------------------------------------------------


  /**
   * Add sexy convenience methods
   */
  function addDataTypeMethod(clazz, dataType) {
    clazz.prototype[dataType] = function (ajax_settings, complete_callback) {

      if (typeof ajax_settings === 'string') {
        ajax_settings = {
          url:     ajax_settings
        };
      }

      ajax_settings.dataType = dataType;

      return this.ajax(ajax_settings, complete_callback, dataType);
    };
  }

  var dataTypes = ['html', 'json', 'jsonp', 'script', 'text', 'xml'];
  var i, n;
  for (i = 0,n = dataTypes.length; i < n; ++i) {
    addDataTypeMethod(Serial, dataTypes[i]);
    addDataTypeMethod(Tense, dataTypes[i]);
    addDataTypeMethod(Eager, dataTypes[i]);
    addDataTypeMethod(Lax, dataTypes[i]);
  }


  /**
   * Add sexier static methods
   */
  function addStaticMethod(clazz, method) {
    clazz[method] = function () {
      return clazz.prototype[method].apply(new clazz(), arguments);
    };
  }

  for (i in Serial.prototype) {
    addStaticMethod(Serial, i);
  }

  for (i in Tense.prototype) {
    addStaticMethod(Tense, i);
  }

  function ajax(ajax_settings, complete_callback, agent_name) {
      agent_name = agent_name || "AJAX Agent";
      var orig_complete = ajax_settings.complete;
      var orig_success = ajax_settings.success;
      var orig_error = ajax_settings.error;
      //
      var proxy_callback = function(result, on_action_complete) {
        if (result.type == 'success') {
          on_action_complete(result.data);
          if (orig_success) orig_success.call(result.xhr, result.data, result.xhr);
        } else if (result.type == 'error') {
          on_action_complete({error: true, xhr: result.xhr, errorThrown: result.errorThrown, textStatus: result.textStatus});
          if (orig_error) orig_error.call(result.xhr, result.xhr, result.textStatus, result.errorThrown);
        } else if (result.type == 'complete') {
          if (orig_complete) orig_complete.call(result.xhr, result.xhr, result.textStatus);
        }
      };

      //
      var complete = function(on_action_complete) {
        return function(xhr, textStatus) {
          proxy_callback({type: 'complete', xhr: xhr, textStatus: textStatus}, on_action_complete);
        }
      };
      var success = function(on_action_complete) {
        return function(data, xhr) {
          proxy_callback({type: 'success', data: data, xhr: xhr, textStatus: 'success'}, on_action_complete);
        }
      };
      var error = function(on_action_complete) {
        return function(xhr, textStatus, errorThrown) {
          proxy_callback({type: 'error', xhr: xhr, textStatus: textStatus, errorThrown: errorThrown}, on_action_complete);
        }
      };

      //
      var ajax_action = function(on_action_complete) {
        jQuery.ajax(jQuery.extend({}, ajax_settings, {success: success(on_action_complete), error: error(on_action_complete), complete: complete(on_action_complete)}));
      };
      this.exec(ajax_action, complete_callback, agent_name + ajax_settings.url);

      return this;
    }

})(this, this.jQuery);
