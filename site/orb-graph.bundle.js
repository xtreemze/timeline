"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/.pnpm/leaflet@1.9.4/node_modules/leaflet/dist/leaflet-src.js
  var require_leaflet_src = __commonJS({
    "node_modules/.pnpm/leaflet@1.9.4/node_modules/leaflet/dist/leaflet-src.js"(exports, module) {
      (function(global, factory) {
        typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.leaflet = {}));
      })(exports, (function(exports2) {
        "use strict";
        var version = "1.9.4";
        function extend2(dest) {
          var i, j, len, src;
          for (j = 1, len = arguments.length; j < len; j++) {
            src = arguments[j];
            for (i in src) {
              dest[i] = src[i];
            }
          }
          return dest;
        }
        var create$2 = Object.create || /* @__PURE__ */ (function() {
          function F() {
          }
          return function(proto) {
            F.prototype = proto;
            return new F();
          };
        })();
        function bind(fn, obj) {
          var slice = Array.prototype.slice;
          if (fn.bind) {
            return fn.bind.apply(fn, slice.call(arguments, 1));
          }
          var args = slice.call(arguments, 2);
          return function() {
            return fn.apply(obj, args.length ? args.concat(slice.call(arguments)) : arguments);
          };
        }
        var lastId = 0;
        function stamp(obj) {
          if (!("_leaflet_id" in obj)) {
            obj["_leaflet_id"] = ++lastId;
          }
          return obj._leaflet_id;
        }
        function throttle2(fn, time, context) {
          var lock, args, wrapperFn, later;
          later = function() {
            lock = false;
            if (args) {
              wrapperFn.apply(context, args);
              args = false;
            }
          };
          wrapperFn = function() {
            if (lock) {
              args = arguments;
            } else {
              fn.apply(context, arguments);
              setTimeout(later, time);
              lock = true;
            }
          };
          return wrapperFn;
        }
        function wrapNum(x3, range, includeMax) {
          var max = range[1], min = range[0], d = max - min;
          return x3 === max && includeMax ? x3 : ((x3 - min) % d + d) % d + min;
        }
        function falseFn() {
          return false;
        }
        function formatNum(num, precision) {
          if (precision === false) {
            return num;
          }
          var pow = Math.pow(10, precision === void 0 ? 6 : precision);
          return Math.round(num * pow) / pow;
        }
        function trim(str) {
          return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, "");
        }
        function splitWords(str) {
          return trim(str).split(/\s+/);
        }
        function setOptions(obj, options) {
          if (!Object.prototype.hasOwnProperty.call(obj, "options")) {
            obj.options = obj.options ? create$2(obj.options) : {};
          }
          for (var i in options) {
            obj.options[i] = options[i];
          }
          return obj.options;
        }
        function getParamString(obj, existingUrl, uppercase) {
          var params = [];
          for (var i in obj) {
            params.push(encodeURIComponent(uppercase ? i.toUpperCase() : i) + "=" + encodeURIComponent(obj[i]));
          }
          return (!existingUrl || existingUrl.indexOf("?") === -1 ? "?" : "&") + params.join("&");
        }
        var templateRe = /\{ *([\w_ -]+) *\}/g;
        function template(str, data) {
          return str.replace(templateRe, function(str2, key) {
            var value = data[key];
            if (value === void 0) {
              throw new Error("No value provided for variable " + str2);
            } else if (typeof value === "function") {
              value = value(data);
            }
            return value;
          });
        }
        var isArray2 = Array.isArray || function(obj) {
          return Object.prototype.toString.call(obj) === "[object Array]";
        };
        function indexOf(array2, el) {
          for (var i = 0; i < array2.length; i++) {
            if (array2[i] === el) {
              return i;
            }
          }
          return -1;
        }
        var emptyImageUrl = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        function getPrefixed(name) {
          return window["webkit" + name] || window["moz" + name] || window["ms" + name];
        }
        var lastTime = 0;
        function timeoutDefer(fn) {
          var time = +/* @__PURE__ */ new Date(), timeToCall = Math.max(0, 16 - (time - lastTime));
          lastTime = time + timeToCall;
          return window.setTimeout(fn, timeToCall);
        }
        var requestFn = window.requestAnimationFrame || getPrefixed("RequestAnimationFrame") || timeoutDefer;
        var cancelFn = window.cancelAnimationFrame || getPrefixed("CancelAnimationFrame") || getPrefixed("CancelRequestAnimationFrame") || function(id2) {
          window.clearTimeout(id2);
        };
        function requestAnimFrame(fn, context, immediate) {
          if (immediate && requestFn === timeoutDefer) {
            fn.call(context);
          } else {
            return requestFn.call(window, bind(fn, context));
          }
        }
        function cancelAnimFrame(id2) {
          if (id2) {
            cancelFn.call(window, id2);
          }
        }
        var Util = {
          __proto__: null,
          extend: extend2,
          create: create$2,
          bind,
          get lastId() {
            return lastId;
          },
          stamp,
          throttle: throttle2,
          wrapNum,
          falseFn,
          formatNum,
          trim,
          splitWords,
          setOptions,
          getParamString,
          template,
          isArray: isArray2,
          indexOf,
          emptyImageUrl,
          requestFn,
          cancelFn,
          requestAnimFrame,
          cancelAnimFrame
        };
        function Class() {
        }
        Class.extend = function(props) {
          var NewClass = function() {
            setOptions(this);
            if (this.initialize) {
              this.initialize.apply(this, arguments);
            }
            this.callInitHooks();
          };
          var parentProto = NewClass.__super__ = this.prototype;
          var proto = create$2(parentProto);
          proto.constructor = NewClass;
          NewClass.prototype = proto;
          for (var i in this) {
            if (Object.prototype.hasOwnProperty.call(this, i) && i !== "prototype" && i !== "__super__") {
              NewClass[i] = this[i];
            }
          }
          if (props.statics) {
            extend2(NewClass, props.statics);
          }
          if (props.includes) {
            checkDeprecatedMixinEvents(props.includes);
            extend2.apply(null, [proto].concat(props.includes));
          }
          extend2(proto, props);
          delete proto.statics;
          delete proto.includes;
          if (proto.options) {
            proto.options = parentProto.options ? create$2(parentProto.options) : {};
            extend2(proto.options, props.options);
          }
          proto._initHooks = [];
          proto.callInitHooks = function() {
            if (this._initHooksCalled) {
              return;
            }
            if (parentProto.callInitHooks) {
              parentProto.callInitHooks.call(this);
            }
            this._initHooksCalled = true;
            for (var i2 = 0, len = proto._initHooks.length; i2 < len; i2++) {
              proto._initHooks[i2].call(this);
            }
          };
          return NewClass;
        };
        Class.include = function(props) {
          var parentOptions = this.prototype.options;
          extend2(this.prototype, props);
          if (props.options) {
            this.prototype.options = parentOptions;
            this.mergeOptions(props.options);
          }
          return this;
        };
        Class.mergeOptions = function(options) {
          extend2(this.prototype.options, options);
          return this;
        };
        Class.addInitHook = function(fn) {
          var args = Array.prototype.slice.call(arguments, 1);
          var init2 = typeof fn === "function" ? fn : function() {
            this[fn].apply(this, args);
          };
          this.prototype._initHooks = this.prototype._initHooks || [];
          this.prototype._initHooks.push(init2);
          return this;
        };
        function checkDeprecatedMixinEvents(includes) {
          if (typeof L === "undefined" || !L || !L.Mixin) {
            return;
          }
          includes = isArray2(includes) ? includes : [includes];
          for (var i = 0; i < includes.length; i++) {
            if (includes[i] === L.Mixin.Events) {
              console.warn("Deprecated include of L.Mixin.Events: this property will be removed in future releases, please inherit from L.Evented instead.", new Error().stack);
            }
          }
        }
        var Events = {
          /* @method on(type: String, fn: Function, context?: Object): this
           * Adds a listener function (`fn`) to a particular event type of the object. You can optionally specify the context of the listener (object the this keyword will point to). You can also pass several space-separated types (e.g. `'click dblclick'`).
           *
           * @alternative
           * @method on(eventMap: Object): this
           * Adds a set of type/listener pairs, e.g. `{click: onClick, mousemove: onMouseMove}`
           */
          on: function(types, fn, context) {
            if (typeof types === "object") {
              for (var type in types) {
                this._on(type, types[type], fn);
              }
            } else {
              types = splitWords(types);
              for (var i = 0, len = types.length; i < len; i++) {
                this._on(types[i], fn, context);
              }
            }
            return this;
          },
          /* @method off(type: String, fn?: Function, context?: Object): this
           * Removes a previously added listener function. If no function is specified, it will remove all the listeners of that particular event from the object. Note that if you passed a custom context to `on`, you must pass the same context to `off` in order to remove the listener.
           *
           * @alternative
           * @method off(eventMap: Object): this
           * Removes a set of type/listener pairs.
           *
           * @alternative
           * @method off: this
           * Removes all listeners to all events on the object. This includes implicitly attached events.
           */
          off: function(types, fn, context) {
            if (!arguments.length) {
              delete this._events;
            } else if (typeof types === "object") {
              for (var type in types) {
                this._off(type, types[type], fn);
              }
            } else {
              types = splitWords(types);
              var removeAll2 = arguments.length === 1;
              for (var i = 0, len = types.length; i < len; i++) {
                if (removeAll2) {
                  this._off(types[i]);
                } else {
                  this._off(types[i], fn, context);
                }
              }
            }
            return this;
          },
          // attach listener (without syntactic sugar now)
          _on: function(type, fn, context, _once) {
            if (typeof fn !== "function") {
              console.warn("wrong listener type: " + typeof fn);
              return;
            }
            if (this._listens(type, fn, context) !== false) {
              return;
            }
            if (context === this) {
              context = void 0;
            }
            var newListener = { fn, ctx: context };
            if (_once) {
              newListener.once = true;
            }
            this._events = this._events || {};
            this._events[type] = this._events[type] || [];
            this._events[type].push(newListener);
          },
          _off: function(type, fn, context) {
            var listeners, i, len;
            if (!this._events) {
              return;
            }
            listeners = this._events[type];
            if (!listeners) {
              return;
            }
            if (arguments.length === 1) {
              if (this._firingCount) {
                for (i = 0, len = listeners.length; i < len; i++) {
                  listeners[i].fn = falseFn;
                }
              }
              delete this._events[type];
              return;
            }
            if (typeof fn !== "function") {
              console.warn("wrong listener type: " + typeof fn);
              return;
            }
            var index3 = this._listens(type, fn, context);
            if (index3 !== false) {
              var listener = listeners[index3];
              if (this._firingCount) {
                listener.fn = falseFn;
                this._events[type] = listeners = listeners.slice();
              }
              listeners.splice(index3, 1);
            }
          },
          // @method fire(type: String, data?: Object, propagate?: Boolean): this
          // Fires an event of the specified type. You can optionally provide a data
          // object — the first argument of the listener function will contain its
          // properties. The event can optionally be propagated to event parents.
          fire: function(type, data, propagate) {
            if (!this.listens(type, propagate)) {
              return this;
            }
            var event = extend2({}, data, {
              type,
              target: this,
              sourceTarget: data && data.sourceTarget || this
            });
            if (this._events) {
              var listeners = this._events[type];
              if (listeners) {
                this._firingCount = this._firingCount + 1 || 1;
                for (var i = 0, len = listeners.length; i < len; i++) {
                  var l = listeners[i];
                  var fn = l.fn;
                  if (l.once) {
                    this.off(type, fn, l.ctx);
                  }
                  fn.call(l.ctx || this, event);
                }
                this._firingCount--;
              }
            }
            if (propagate) {
              this._propagateEvent(event);
            }
            return this;
          },
          // @method listens(type: String, propagate?: Boolean): Boolean
          // @method listens(type: String, fn: Function, context?: Object, propagate?: Boolean): Boolean
          // Returns `true` if a particular event type has any listeners attached to it.
          // The verification can optionally be propagated, it will return `true` if parents have the listener attached to it.
          listens: function(type, fn, context, propagate) {
            if (typeof type !== "string") {
              console.warn('"string" type argument expected');
            }
            var _fn = fn;
            if (typeof fn !== "function") {
              propagate = !!fn;
              _fn = void 0;
              context = void 0;
            }
            var listeners = this._events && this._events[type];
            if (listeners && listeners.length) {
              if (this._listens(type, _fn, context) !== false) {
                return true;
              }
            }
            if (propagate) {
              for (var id2 in this._eventParents) {
                if (this._eventParents[id2].listens(type, fn, context, propagate)) {
                  return true;
                }
              }
            }
            return false;
          },
          // returns the index (number) or false
          _listens: function(type, fn, context) {
            if (!this._events) {
              return false;
            }
            var listeners = this._events[type] || [];
            if (!fn) {
              return !!listeners.length;
            }
            if (context === this) {
              context = void 0;
            }
            for (var i = 0, len = listeners.length; i < len; i++) {
              if (listeners[i].fn === fn && listeners[i].ctx === context) {
                return i;
              }
            }
            return false;
          },
          // @method once(…): this
          // Behaves as [`on(…)`](#evented-on), except the listener will only get fired once and then removed.
          once: function(types, fn, context) {
            if (typeof types === "object") {
              for (var type in types) {
                this._on(type, types[type], fn, true);
              }
            } else {
              types = splitWords(types);
              for (var i = 0, len = types.length; i < len; i++) {
                this._on(types[i], fn, context, true);
              }
            }
            return this;
          },
          // @method addEventParent(obj: Evented): this
          // Adds an event parent - an `Evented` that will receive propagated events
          addEventParent: function(obj) {
            this._eventParents = this._eventParents || {};
            this._eventParents[stamp(obj)] = obj;
            return this;
          },
          // @method removeEventParent(obj: Evented): this
          // Removes an event parent, so it will stop receiving propagated events
          removeEventParent: function(obj) {
            if (this._eventParents) {
              delete this._eventParents[stamp(obj)];
            }
            return this;
          },
          _propagateEvent: function(e) {
            for (var id2 in this._eventParents) {
              this._eventParents[id2].fire(e.type, extend2({
                layer: e.target,
                propagatedFrom: e.target
              }, e), true);
            }
          }
        };
        Events.addEventListener = Events.on;
        Events.removeEventListener = Events.clearAllEventListeners = Events.off;
        Events.addOneTimeEventListener = Events.once;
        Events.fireEvent = Events.fire;
        Events.hasEventListeners = Events.listens;
        var Evented = Class.extend(Events);
        function Point(x3, y3, round) {
          this.x = round ? Math.round(x3) : x3;
          this.y = round ? Math.round(y3) : y3;
        }
        var trunc = Math.trunc || function(v) {
          return v > 0 ? Math.floor(v) : Math.ceil(v);
        };
        Point.prototype = {
          // @method clone(): Point
          // Returns a copy of the current point.
          clone: function() {
            return new Point(this.x, this.y);
          },
          // @method add(otherPoint: Point): Point
          // Returns the result of addition of the current and the given points.
          add: function(point) {
            return this.clone()._add(toPoint(point));
          },
          _add: function(point) {
            this.x += point.x;
            this.y += point.y;
            return this;
          },
          // @method subtract(otherPoint: Point): Point
          // Returns the result of subtraction of the given point from the current.
          subtract: function(point) {
            return this.clone()._subtract(toPoint(point));
          },
          _subtract: function(point) {
            this.x -= point.x;
            this.y -= point.y;
            return this;
          },
          // @method divideBy(num: Number): Point
          // Returns the result of division of the current point by the given number.
          divideBy: function(num) {
            return this.clone()._divideBy(num);
          },
          _divideBy: function(num) {
            this.x /= num;
            this.y /= num;
            return this;
          },
          // @method multiplyBy(num: Number): Point
          // Returns the result of multiplication of the current point by the given number.
          multiplyBy: function(num) {
            return this.clone()._multiplyBy(num);
          },
          _multiplyBy: function(num) {
            this.x *= num;
            this.y *= num;
            return this;
          },
          // @method scaleBy(scale: Point): Point
          // Multiply each coordinate of the current point by each coordinate of
          // `scale`. In linear algebra terms, multiply the point by the
          // [scaling matrix](https://en.wikipedia.org/wiki/Scaling_%28geometry%29#Matrix_representation)
          // defined by `scale`.
          scaleBy: function(point) {
            return new Point(this.x * point.x, this.y * point.y);
          },
          // @method unscaleBy(scale: Point): Point
          // Inverse of `scaleBy`. Divide each coordinate of the current point by
          // each coordinate of `scale`.
          unscaleBy: function(point) {
            return new Point(this.x / point.x, this.y / point.y);
          },
          // @method round(): Point
          // Returns a copy of the current point with rounded coordinates.
          round: function() {
            return this.clone()._round();
          },
          _round: function() {
            this.x = Math.round(this.x);
            this.y = Math.round(this.y);
            return this;
          },
          // @method floor(): Point
          // Returns a copy of the current point with floored coordinates (rounded down).
          floor: function() {
            return this.clone()._floor();
          },
          _floor: function() {
            this.x = Math.floor(this.x);
            this.y = Math.floor(this.y);
            return this;
          },
          // @method ceil(): Point
          // Returns a copy of the current point with ceiled coordinates (rounded up).
          ceil: function() {
            return this.clone()._ceil();
          },
          _ceil: function() {
            this.x = Math.ceil(this.x);
            this.y = Math.ceil(this.y);
            return this;
          },
          // @method trunc(): Point
          // Returns a copy of the current point with truncated coordinates (rounded towards zero).
          trunc: function() {
            return this.clone()._trunc();
          },
          _trunc: function() {
            this.x = trunc(this.x);
            this.y = trunc(this.y);
            return this;
          },
          // @method distanceTo(otherPoint: Point): Number
          // Returns the cartesian distance between the current and the given points.
          distanceTo: function(point) {
            point = toPoint(point);
            var x3 = point.x - this.x, y3 = point.y - this.y;
            return Math.sqrt(x3 * x3 + y3 * y3);
          },
          // @method equals(otherPoint: Point): Boolean
          // Returns `true` if the given point has the same coordinates.
          equals: function(point) {
            point = toPoint(point);
            return point.x === this.x && point.y === this.y;
          },
          // @method contains(otherPoint: Point): Boolean
          // Returns `true` if both coordinates of the given point are less than the corresponding current point coordinates (in absolute values).
          contains: function(point) {
            point = toPoint(point);
            return Math.abs(point.x) <= Math.abs(this.x) && Math.abs(point.y) <= Math.abs(this.y);
          },
          // @method toString(): String
          // Returns a string representation of the point for debugging purposes.
          toString: function() {
            return "Point(" + formatNum(this.x) + ", " + formatNum(this.y) + ")";
          }
        };
        function toPoint(x3, y3, round) {
          if (x3 instanceof Point) {
            return x3;
          }
          if (isArray2(x3)) {
            return new Point(x3[0], x3[1]);
          }
          if (x3 === void 0 || x3 === null) {
            return x3;
          }
          if (typeof x3 === "object" && "x" in x3 && "y" in x3) {
            return new Point(x3.x, x3.y);
          }
          return new Point(x3, y3, round);
        }
        function Bounds(a2, b) {
          if (!a2) {
            return;
          }
          var points = b ? [a2, b] : a2;
          for (var i = 0, len = points.length; i < len; i++) {
            this.extend(points[i]);
          }
        }
        Bounds.prototype = {
          // @method extend(point: Point): this
          // Extends the bounds to contain the given point.
          // @alternative
          // @method extend(otherBounds: Bounds): this
          // Extend the bounds to contain the given bounds
          extend: function(obj) {
            var min2, max2;
            if (!obj) {
              return this;
            }
            if (obj instanceof Point || typeof obj[0] === "number" || "x" in obj) {
              min2 = max2 = toPoint(obj);
            } else {
              obj = toBounds(obj);
              min2 = obj.min;
              max2 = obj.max;
              if (!min2 || !max2) {
                return this;
              }
            }
            if (!this.min && !this.max) {
              this.min = min2.clone();
              this.max = max2.clone();
            } else {
              this.min.x = Math.min(min2.x, this.min.x);
              this.max.x = Math.max(max2.x, this.max.x);
              this.min.y = Math.min(min2.y, this.min.y);
              this.max.y = Math.max(max2.y, this.max.y);
            }
            return this;
          },
          // @method getCenter(round?: Boolean): Point
          // Returns the center point of the bounds.
          getCenter: function(round) {
            return toPoint(
              (this.min.x + this.max.x) / 2,
              (this.min.y + this.max.y) / 2,
              round
            );
          },
          // @method getBottomLeft(): Point
          // Returns the bottom-left point of the bounds.
          getBottomLeft: function() {
            return toPoint(this.min.x, this.max.y);
          },
          // @method getTopRight(): Point
          // Returns the top-right point of the bounds.
          getTopRight: function() {
            return toPoint(this.max.x, this.min.y);
          },
          // @method getTopLeft(): Point
          // Returns the top-left point of the bounds (i.e. [`this.min`](#bounds-min)).
          getTopLeft: function() {
            return this.min;
          },
          // @method getBottomRight(): Point
          // Returns the bottom-right point of the bounds (i.e. [`this.max`](#bounds-max)).
          getBottomRight: function() {
            return this.max;
          },
          // @method getSize(): Point
          // Returns the size of the given bounds
          getSize: function() {
            return this.max.subtract(this.min);
          },
          // @method contains(otherBounds: Bounds): Boolean
          // Returns `true` if the rectangle contains the given one.
          // @alternative
          // @method contains(point: Point): Boolean
          // Returns `true` if the rectangle contains the given point.
          contains: function(obj) {
            var min, max;
            if (typeof obj[0] === "number" || obj instanceof Point) {
              obj = toPoint(obj);
            } else {
              obj = toBounds(obj);
            }
            if (obj instanceof Bounds) {
              min = obj.min;
              max = obj.max;
            } else {
              min = max = obj;
            }
            return min.x >= this.min.x && max.x <= this.max.x && min.y >= this.min.y && max.y <= this.max.y;
          },
          // @method intersects(otherBounds: Bounds): Boolean
          // Returns `true` if the rectangle intersects the given bounds. Two bounds
          // intersect if they have at least one point in common.
          intersects: function(bounds) {
            bounds = toBounds(bounds);
            var min = this.min, max = this.max, min2 = bounds.min, max2 = bounds.max, xIntersects = max2.x >= min.x && min2.x <= max.x, yIntersects = max2.y >= min.y && min2.y <= max.y;
            return xIntersects && yIntersects;
          },
          // @method overlaps(otherBounds: Bounds): Boolean
          // Returns `true` if the rectangle overlaps the given bounds. Two bounds
          // overlap if their intersection is an area.
          overlaps: function(bounds) {
            bounds = toBounds(bounds);
            var min = this.min, max = this.max, min2 = bounds.min, max2 = bounds.max, xOverlaps = max2.x > min.x && min2.x < max.x, yOverlaps = max2.y > min.y && min2.y < max.y;
            return xOverlaps && yOverlaps;
          },
          // @method isValid(): Boolean
          // Returns `true` if the bounds are properly initialized.
          isValid: function() {
            return !!(this.min && this.max);
          },
          // @method pad(bufferRatio: Number): Bounds
          // Returns bounds created by extending or retracting the current bounds by a given ratio in each direction.
          // For example, a ratio of 0.5 extends the bounds by 50% in each direction.
          // Negative values will retract the bounds.
          pad: function(bufferRatio) {
            var min = this.min, max = this.max, heightBuffer = Math.abs(min.x - max.x) * bufferRatio, widthBuffer = Math.abs(min.y - max.y) * bufferRatio;
            return toBounds(
              toPoint(min.x - heightBuffer, min.y - widthBuffer),
              toPoint(max.x + heightBuffer, max.y + widthBuffer)
            );
          },
          // @method equals(otherBounds: Bounds): Boolean
          // Returns `true` if the rectangle is equivalent to the given bounds.
          equals: function(bounds) {
            if (!bounds) {
              return false;
            }
            bounds = toBounds(bounds);
            return this.min.equals(bounds.getTopLeft()) && this.max.equals(bounds.getBottomRight());
          }
        };
        function toBounds(a2, b) {
          if (!a2 || a2 instanceof Bounds) {
            return a2;
          }
          return new Bounds(a2, b);
        }
        function LatLngBounds(corner1, corner2) {
          if (!corner1) {
            return;
          }
          var latlngs = corner2 ? [corner1, corner2] : corner1;
          for (var i = 0, len = latlngs.length; i < len; i++) {
            this.extend(latlngs[i]);
          }
        }
        LatLngBounds.prototype = {
          // @method extend(latlng: LatLng): this
          // Extend the bounds to contain the given point
          // @alternative
          // @method extend(otherBounds: LatLngBounds): this
          // Extend the bounds to contain the given bounds
          extend: function(obj) {
            var sw = this._southWest, ne = this._northEast, sw2, ne2;
            if (obj instanceof LatLng) {
              sw2 = obj;
              ne2 = obj;
            } else if (obj instanceof LatLngBounds) {
              sw2 = obj._southWest;
              ne2 = obj._northEast;
              if (!sw2 || !ne2) {
                return this;
              }
            } else {
              return obj ? this.extend(toLatLng(obj) || toLatLngBounds(obj)) : this;
            }
            if (!sw && !ne) {
              this._southWest = new LatLng(sw2.lat, sw2.lng);
              this._northEast = new LatLng(ne2.lat, ne2.lng);
            } else {
              sw.lat = Math.min(sw2.lat, sw.lat);
              sw.lng = Math.min(sw2.lng, sw.lng);
              ne.lat = Math.max(ne2.lat, ne.lat);
              ne.lng = Math.max(ne2.lng, ne.lng);
            }
            return this;
          },
          // @method pad(bufferRatio: Number): LatLngBounds
          // Returns bounds created by extending or retracting the current bounds by a given ratio in each direction.
          // For example, a ratio of 0.5 extends the bounds by 50% in each direction.
          // Negative values will retract the bounds.
          pad: function(bufferRatio) {
            var sw = this._southWest, ne = this._northEast, heightBuffer = Math.abs(sw.lat - ne.lat) * bufferRatio, widthBuffer = Math.abs(sw.lng - ne.lng) * bufferRatio;
            return new LatLngBounds(
              new LatLng(sw.lat - heightBuffer, sw.lng - widthBuffer),
              new LatLng(ne.lat + heightBuffer, ne.lng + widthBuffer)
            );
          },
          // @method getCenter(): LatLng
          // Returns the center point of the bounds.
          getCenter: function() {
            return new LatLng(
              (this._southWest.lat + this._northEast.lat) / 2,
              (this._southWest.lng + this._northEast.lng) / 2
            );
          },
          // @method getSouthWest(): LatLng
          // Returns the south-west point of the bounds.
          getSouthWest: function() {
            return this._southWest;
          },
          // @method getNorthEast(): LatLng
          // Returns the north-east point of the bounds.
          getNorthEast: function() {
            return this._northEast;
          },
          // @method getNorthWest(): LatLng
          // Returns the north-west point of the bounds.
          getNorthWest: function() {
            return new LatLng(this.getNorth(), this.getWest());
          },
          // @method getSouthEast(): LatLng
          // Returns the south-east point of the bounds.
          getSouthEast: function() {
            return new LatLng(this.getSouth(), this.getEast());
          },
          // @method getWest(): Number
          // Returns the west longitude of the bounds
          getWest: function() {
            return this._southWest.lng;
          },
          // @method getSouth(): Number
          // Returns the south latitude of the bounds
          getSouth: function() {
            return this._southWest.lat;
          },
          // @method getEast(): Number
          // Returns the east longitude of the bounds
          getEast: function() {
            return this._northEast.lng;
          },
          // @method getNorth(): Number
          // Returns the north latitude of the bounds
          getNorth: function() {
            return this._northEast.lat;
          },
          // @method contains(otherBounds: LatLngBounds): Boolean
          // Returns `true` if the rectangle contains the given one.
          // @alternative
          // @method contains (latlng: LatLng): Boolean
          // Returns `true` if the rectangle contains the given point.
          contains: function(obj) {
            if (typeof obj[0] === "number" || obj instanceof LatLng || "lat" in obj) {
              obj = toLatLng(obj);
            } else {
              obj = toLatLngBounds(obj);
            }
            var sw = this._southWest, ne = this._northEast, sw2, ne2;
            if (obj instanceof LatLngBounds) {
              sw2 = obj.getSouthWest();
              ne2 = obj.getNorthEast();
            } else {
              sw2 = ne2 = obj;
            }
            return sw2.lat >= sw.lat && ne2.lat <= ne.lat && sw2.lng >= sw.lng && ne2.lng <= ne.lng;
          },
          // @method intersects(otherBounds: LatLngBounds): Boolean
          // Returns `true` if the rectangle intersects the given bounds. Two bounds intersect if they have at least one point in common.
          intersects: function(bounds) {
            bounds = toLatLngBounds(bounds);
            var sw = this._southWest, ne = this._northEast, sw2 = bounds.getSouthWest(), ne2 = bounds.getNorthEast(), latIntersects = ne2.lat >= sw.lat && sw2.lat <= ne.lat, lngIntersects = ne2.lng >= sw.lng && sw2.lng <= ne.lng;
            return latIntersects && lngIntersects;
          },
          // @method overlaps(otherBounds: LatLngBounds): Boolean
          // Returns `true` if the rectangle overlaps the given bounds. Two bounds overlap if their intersection is an area.
          overlaps: function(bounds) {
            bounds = toLatLngBounds(bounds);
            var sw = this._southWest, ne = this._northEast, sw2 = bounds.getSouthWest(), ne2 = bounds.getNorthEast(), latOverlaps = ne2.lat > sw.lat && sw2.lat < ne.lat, lngOverlaps = ne2.lng > sw.lng && sw2.lng < ne.lng;
            return latOverlaps && lngOverlaps;
          },
          // @method toBBoxString(): String
          // Returns a string with bounding box coordinates in a 'southwest_lng,southwest_lat,northeast_lng,northeast_lat' format. Useful for sending requests to web services that return geo data.
          toBBoxString: function() {
            return [this.getWest(), this.getSouth(), this.getEast(), this.getNorth()].join(",");
          },
          // @method equals(otherBounds: LatLngBounds, maxMargin?: Number): Boolean
          // Returns `true` if the rectangle is equivalent (within a small margin of error) to the given bounds. The margin of error can be overridden by setting `maxMargin` to a small number.
          equals: function(bounds, maxMargin) {
            if (!bounds) {
              return false;
            }
            bounds = toLatLngBounds(bounds);
            return this._southWest.equals(bounds.getSouthWest(), maxMargin) && this._northEast.equals(bounds.getNorthEast(), maxMargin);
          },
          // @method isValid(): Boolean
          // Returns `true` if the bounds are properly initialized.
          isValid: function() {
            return !!(this._southWest && this._northEast);
          }
        };
        function toLatLngBounds(a2, b) {
          if (a2 instanceof LatLngBounds) {
            return a2;
          }
          return new LatLngBounds(a2, b);
        }
        function LatLng(lat, lng, alt) {
          if (isNaN(lat) || isNaN(lng)) {
            throw new Error("Invalid LatLng object: (" + lat + ", " + lng + ")");
          }
          this.lat = +lat;
          this.lng = +lng;
          if (alt !== void 0) {
            this.alt = +alt;
          }
        }
        LatLng.prototype = {
          // @method equals(otherLatLng: LatLng, maxMargin?: Number): Boolean
          // Returns `true` if the given `LatLng` point is at the same position (within a small margin of error). The margin of error can be overridden by setting `maxMargin` to a small number.
          equals: function(obj, maxMargin) {
            if (!obj) {
              return false;
            }
            obj = toLatLng(obj);
            var margin = Math.max(
              Math.abs(this.lat - obj.lat),
              Math.abs(this.lng - obj.lng)
            );
            return margin <= (maxMargin === void 0 ? 1e-9 : maxMargin);
          },
          // @method toString(): String
          // Returns a string representation of the point (for debugging purposes).
          toString: function(precision) {
            return "LatLng(" + formatNum(this.lat, precision) + ", " + formatNum(this.lng, precision) + ")";
          },
          // @method distanceTo(otherLatLng: LatLng): Number
          // Returns the distance (in meters) to the given `LatLng` calculated using the [Spherical Law of Cosines](https://en.wikipedia.org/wiki/Spherical_law_of_cosines).
          distanceTo: function(other) {
            return Earth.distance(this, toLatLng(other));
          },
          // @method wrap(): LatLng
          // Returns a new `LatLng` object with the longitude wrapped so it's always between -180 and +180 degrees.
          wrap: function() {
            return Earth.wrapLatLng(this);
          },
          // @method toBounds(sizeInMeters: Number): LatLngBounds
          // Returns a new `LatLngBounds` object in which each boundary is `sizeInMeters/2` meters apart from the `LatLng`.
          toBounds: function(sizeInMeters) {
            var latAccuracy = 180 * sizeInMeters / 40075017, lngAccuracy = latAccuracy / Math.cos(Math.PI / 180 * this.lat);
            return toLatLngBounds(
              [this.lat - latAccuracy, this.lng - lngAccuracy],
              [this.lat + latAccuracy, this.lng + lngAccuracy]
            );
          },
          clone: function() {
            return new LatLng(this.lat, this.lng, this.alt);
          }
        };
        function toLatLng(a2, b, c2) {
          if (a2 instanceof LatLng) {
            return a2;
          }
          if (isArray2(a2) && typeof a2[0] !== "object") {
            if (a2.length === 3) {
              return new LatLng(a2[0], a2[1], a2[2]);
            }
            if (a2.length === 2) {
              return new LatLng(a2[0], a2[1]);
            }
            return null;
          }
          if (a2 === void 0 || a2 === null) {
            return a2;
          }
          if (typeof a2 === "object" && "lat" in a2) {
            return new LatLng(a2.lat, "lng" in a2 ? a2.lng : a2.lon, a2.alt);
          }
          if (b === void 0) {
            return null;
          }
          return new LatLng(a2, b, c2);
        }
        var CRS = {
          // @method latLngToPoint(latlng: LatLng, zoom: Number): Point
          // Projects geographical coordinates into pixel coordinates for a given zoom.
          latLngToPoint: function(latlng, zoom2) {
            var projectedPoint = this.projection.project(latlng), scale2 = this.scale(zoom2);
            return this.transformation._transform(projectedPoint, scale2);
          },
          // @method pointToLatLng(point: Point, zoom: Number): LatLng
          // The inverse of `latLngToPoint`. Projects pixel coordinates on a given
          // zoom into geographical coordinates.
          pointToLatLng: function(point, zoom2) {
            var scale2 = this.scale(zoom2), untransformedPoint = this.transformation.untransform(point, scale2);
            return this.projection.unproject(untransformedPoint);
          },
          // @method project(latlng: LatLng): Point
          // Projects geographical coordinates into coordinates in units accepted for
          // this CRS (e.g. meters for EPSG:3857, for passing it to WMS services).
          project: function(latlng) {
            return this.projection.project(latlng);
          },
          // @method unproject(point: Point): LatLng
          // Given a projected coordinate returns the corresponding LatLng.
          // The inverse of `project`.
          unproject: function(point) {
            return this.projection.unproject(point);
          },
          // @method scale(zoom: Number): Number
          // Returns the scale used when transforming projected coordinates into
          // pixel coordinates for a particular zoom. For example, it returns
          // `256 * 2^zoom` for Mercator-based CRS.
          scale: function(zoom2) {
            return 256 * Math.pow(2, zoom2);
          },
          // @method zoom(scale: Number): Number
          // Inverse of `scale()`, returns the zoom level corresponding to a scale
          // factor of `scale`.
          zoom: function(scale2) {
            return Math.log(scale2 / 256) / Math.LN2;
          },
          // @method getProjectedBounds(zoom: Number): Bounds
          // Returns the projection's bounds scaled and transformed for the provided `zoom`.
          getProjectedBounds: function(zoom2) {
            if (this.infinite) {
              return null;
            }
            var b = this.projection.bounds, s = this.scale(zoom2), min = this.transformation.transform(b.min, s), max = this.transformation.transform(b.max, s);
            return new Bounds(min, max);
          },
          // @method distance(latlng1: LatLng, latlng2: LatLng): Number
          // Returns the distance between two geographical coordinates.
          // @property code: String
          // Standard code name of the CRS passed into WMS services (e.g. `'EPSG:3857'`)
          //
          // @property wrapLng: Number[]
          // An array of two numbers defining whether the longitude (horizontal) coordinate
          // axis wraps around a given range and how. Defaults to `[-180, 180]` in most
          // geographical CRSs. If `undefined`, the longitude axis does not wrap around.
          //
          // @property wrapLat: Number[]
          // Like `wrapLng`, but for the latitude (vertical) axis.
          // wrapLng: [min, max],
          // wrapLat: [min, max],
          // @property infinite: Boolean
          // If true, the coordinate space will be unbounded (infinite in both axes)
          infinite: false,
          // @method wrapLatLng(latlng: LatLng): LatLng
          // Returns a `LatLng` where lat and lng has been wrapped according to the
          // CRS's `wrapLat` and `wrapLng` properties, if they are outside the CRS's bounds.
          wrapLatLng: function(latlng) {
            var lng = this.wrapLng ? wrapNum(latlng.lng, this.wrapLng, true) : latlng.lng, lat = this.wrapLat ? wrapNum(latlng.lat, this.wrapLat, true) : latlng.lat, alt = latlng.alt;
            return new LatLng(lat, lng, alt);
          },
          // @method wrapLatLngBounds(bounds: LatLngBounds): LatLngBounds
          // Returns a `LatLngBounds` with the same size as the given one, ensuring
          // that its center is within the CRS's bounds.
          // Only accepts actual `L.LatLngBounds` instances, not arrays.
          wrapLatLngBounds: function(bounds) {
            var center = bounds.getCenter(), newCenter = this.wrapLatLng(center), latShift = center.lat - newCenter.lat, lngShift = center.lng - newCenter.lng;
            if (latShift === 0 && lngShift === 0) {
              return bounds;
            }
            var sw = bounds.getSouthWest(), ne = bounds.getNorthEast(), newSw = new LatLng(sw.lat - latShift, sw.lng - lngShift), newNe = new LatLng(ne.lat - latShift, ne.lng - lngShift);
            return new LatLngBounds(newSw, newNe);
          }
        };
        var Earth = extend2({}, CRS, {
          wrapLng: [-180, 180],
          // Mean Earth Radius, as recommended for use by
          // the International Union of Geodesy and Geophysics,
          // see https://rosettacode.org/wiki/Haversine_formula
          R: 6371e3,
          // distance between two geographical points using spherical law of cosines approximation
          distance: function(latlng1, latlng2) {
            var rad = Math.PI / 180, lat1 = latlng1.lat * rad, lat2 = latlng2.lat * rad, sinDLat = Math.sin((latlng2.lat - latlng1.lat) * rad / 2), sinDLon = Math.sin((latlng2.lng - latlng1.lng) * rad / 2), a2 = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon, c2 = 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
            return this.R * c2;
          }
        });
        var earthRadius = 6378137;
        var SphericalMercator = {
          R: earthRadius,
          MAX_LATITUDE: 85.0511287798,
          project: function(latlng) {
            var d = Math.PI / 180, max = this.MAX_LATITUDE, lat = Math.max(Math.min(max, latlng.lat), -max), sin = Math.sin(lat * d);
            return new Point(
              this.R * latlng.lng * d,
              this.R * Math.log((1 + sin) / (1 - sin)) / 2
            );
          },
          unproject: function(point) {
            var d = 180 / Math.PI;
            return new LatLng(
              (2 * Math.atan(Math.exp(point.y / this.R)) - Math.PI / 2) * d,
              point.x * d / this.R
            );
          },
          bounds: (function() {
            var d = earthRadius * Math.PI;
            return new Bounds([-d, -d], [d, d]);
          })()
        };
        function Transformation(a2, b, c2, d) {
          if (isArray2(a2)) {
            this._a = a2[0];
            this._b = a2[1];
            this._c = a2[2];
            this._d = a2[3];
            return;
          }
          this._a = a2;
          this._b = b;
          this._c = c2;
          this._d = d;
        }
        Transformation.prototype = {
          // @method transform(point: Point, scale?: Number): Point
          // Returns a transformed point, optionally multiplied by the given scale.
          // Only accepts actual `L.Point` instances, not arrays.
          transform: function(point, scale2) {
            return this._transform(point.clone(), scale2);
          },
          // destructive transform (faster)
          _transform: function(point, scale2) {
            scale2 = scale2 || 1;
            point.x = scale2 * (this._a * point.x + this._b);
            point.y = scale2 * (this._c * point.y + this._d);
            return point;
          },
          // @method untransform(point: Point, scale?: Number): Point
          // Returns the reverse transformation of the given point, optionally divided
          // by the given scale. Only accepts actual `L.Point` instances, not arrays.
          untransform: function(point, scale2) {
            scale2 = scale2 || 1;
            return new Point(
              (point.x / scale2 - this._b) / this._a,
              (point.y / scale2 - this._d) / this._c
            );
          }
        };
        function toTransformation(a2, b, c2, d) {
          return new Transformation(a2, b, c2, d);
        }
        var EPSG3857 = extend2({}, Earth, {
          code: "EPSG:3857",
          projection: SphericalMercator,
          transformation: (function() {
            var scale2 = 0.5 / (Math.PI * SphericalMercator.R);
            return toTransformation(scale2, 0.5, -scale2, 0.5);
          })()
        });
        var EPSG900913 = extend2({}, EPSG3857, {
          code: "EPSG:900913"
        });
        function svgCreate(name) {
          return document.createElementNS("http://www.w3.org/2000/svg", name);
        }
        function pointsToPath(rings, closed) {
          var str = "", i, j, len, len2, points, p;
          for (i = 0, len = rings.length; i < len; i++) {
            points = rings[i];
            for (j = 0, len2 = points.length; j < len2; j++) {
              p = points[j];
              str += (j ? "L" : "M") + p.x + " " + p.y;
            }
            str += closed ? Browser.svg ? "z" : "x" : "";
          }
          return str || "M0 0";
        }
        var style = document.documentElement.style;
        var ie = "ActiveXObject" in window;
        var ielt9 = ie && !document.addEventListener;
        var edge = "msLaunchUri" in navigator && !("documentMode" in document);
        var webkit = userAgentContains("webkit");
        var android = userAgentContains("android");
        var android23 = userAgentContains("android 2") || userAgentContains("android 3");
        var webkitVer = parseInt(/WebKit\/([0-9]+)|$/.exec(navigator.userAgent)[1], 10);
        var androidStock = android && userAgentContains("Google") && webkitVer < 537 && !("AudioNode" in window);
        var opera = !!window.opera;
        var chrome = !edge && userAgentContains("chrome");
        var gecko = userAgentContains("gecko") && !webkit && !opera && !ie;
        var safari = !chrome && userAgentContains("safari");
        var phantom = userAgentContains("phantom");
        var opera12 = "OTransition" in style;
        var win = navigator.platform.indexOf("Win") === 0;
        var ie3d = ie && "transition" in style;
        var webkit3d = "WebKitCSSMatrix" in window && "m11" in new window.WebKitCSSMatrix() && !android23;
        var gecko3d = "MozPerspective" in style;
        var any3d = !window.L_DISABLE_3D && (ie3d || webkit3d || gecko3d) && !opera12 && !phantom;
        var mobile = typeof orientation !== "undefined" || userAgentContains("mobile");
        var mobileWebkit = mobile && webkit;
        var mobileWebkit3d = mobile && webkit3d;
        var msPointer = !window.PointerEvent && window.MSPointerEvent;
        var pointer = !!(window.PointerEvent || msPointer);
        var touchNative = "ontouchstart" in window || !!window.TouchEvent;
        var touch = !window.L_NO_TOUCH && (touchNative || pointer);
        var mobileOpera = mobile && opera;
        var mobileGecko = mobile && gecko;
        var retina = (window.devicePixelRatio || window.screen.deviceXDPI / window.screen.logicalXDPI) > 1;
        var passiveEvents = (function() {
          var supportsPassiveOption = false;
          try {
            var opts = Object.defineProperty({}, "passive", {
              get: function() {
                supportsPassiveOption = true;
              }
            });
            window.addEventListener("testPassiveEventSupport", falseFn, opts);
            window.removeEventListener("testPassiveEventSupport", falseFn, opts);
          } catch (e) {
          }
          return supportsPassiveOption;
        })();
        var canvas$1 = (function() {
          return !!document.createElement("canvas").getContext;
        })();
        var svg$1 = !!(document.createElementNS && svgCreate("svg").createSVGRect);
        var inlineSvg = !!svg$1 && (function() {
          var div = document.createElement("div");
          div.innerHTML = "<svg/>";
          return (div.firstChild && div.firstChild.namespaceURI) === "http://www.w3.org/2000/svg";
        })();
        var vml = !svg$1 && (function() {
          try {
            var div = document.createElement("div");
            div.innerHTML = '<v:shape adj="1"/>';
            var shape = div.firstChild;
            shape.style.behavior = "url(#default#VML)";
            return shape && typeof shape.adj === "object";
          } catch (e) {
            return false;
          }
        })();
        var mac = navigator.platform.indexOf("Mac") === 0;
        var linux = navigator.platform.indexOf("Linux") === 0;
        function userAgentContains(str) {
          return navigator.userAgent.toLowerCase().indexOf(str) >= 0;
        }
        var Browser = {
          ie,
          ielt9,
          edge,
          webkit,
          android,
          android23,
          androidStock,
          opera,
          chrome,
          gecko,
          safari,
          phantom,
          opera12,
          win,
          ie3d,
          webkit3d,
          gecko3d,
          any3d,
          mobile,
          mobileWebkit,
          mobileWebkit3d,
          msPointer,
          pointer,
          touch,
          touchNative,
          mobileOpera,
          mobileGecko,
          retina,
          passiveEvents,
          canvas: canvas$1,
          svg: svg$1,
          vml,
          inlineSvg,
          mac,
          linux
        };
        var POINTER_DOWN = Browser.msPointer ? "MSPointerDown" : "pointerdown";
        var POINTER_MOVE = Browser.msPointer ? "MSPointerMove" : "pointermove";
        var POINTER_UP = Browser.msPointer ? "MSPointerUp" : "pointerup";
        var POINTER_CANCEL = Browser.msPointer ? "MSPointerCancel" : "pointercancel";
        var pEvent = {
          touchstart: POINTER_DOWN,
          touchmove: POINTER_MOVE,
          touchend: POINTER_UP,
          touchcancel: POINTER_CANCEL
        };
        var handle = {
          touchstart: _onPointerStart,
          touchmove: _handlePointer,
          touchend: _handlePointer,
          touchcancel: _handlePointer
        };
        var _pointers = {};
        var _pointerDocListener = false;
        function addPointerListener(obj, type, handler) {
          if (type === "touchstart") {
            _addPointerDocListener();
          }
          if (!handle[type]) {
            console.warn("wrong event specified:", type);
            return falseFn;
          }
          handler = handle[type].bind(this, handler);
          obj.addEventListener(pEvent[type], handler, false);
          return handler;
        }
        function removePointerListener(obj, type, handler) {
          if (!pEvent[type]) {
            console.warn("wrong event specified:", type);
            return;
          }
          obj.removeEventListener(pEvent[type], handler, false);
        }
        function _globalPointerDown(e) {
          _pointers[e.pointerId] = e;
        }
        function _globalPointerMove(e) {
          if (_pointers[e.pointerId]) {
            _pointers[e.pointerId] = e;
          }
        }
        function _globalPointerUp(e) {
          delete _pointers[e.pointerId];
        }
        function _addPointerDocListener() {
          if (!_pointerDocListener) {
            document.addEventListener(POINTER_DOWN, _globalPointerDown, true);
            document.addEventListener(POINTER_MOVE, _globalPointerMove, true);
            document.addEventListener(POINTER_UP, _globalPointerUp, true);
            document.addEventListener(POINTER_CANCEL, _globalPointerUp, true);
            _pointerDocListener = true;
          }
        }
        function _handlePointer(handler, e) {
          if (e.pointerType === (e.MSPOINTER_TYPE_MOUSE || "mouse")) {
            return;
          }
          e.touches = [];
          for (var i in _pointers) {
            e.touches.push(_pointers[i]);
          }
          e.changedTouches = [e];
          handler(e);
        }
        function _onPointerStart(handler, e) {
          if (e.MSPOINTER_TYPE_TOUCH && e.pointerType === e.MSPOINTER_TYPE_TOUCH) {
            preventDefault(e);
          }
          _handlePointer(handler, e);
        }
        function makeDblclick(event) {
          var newEvent = {}, prop, i;
          for (i in event) {
            prop = event[i];
            newEvent[i] = prop && prop.bind ? prop.bind(event) : prop;
          }
          event = newEvent;
          newEvent.type = "dblclick";
          newEvent.detail = 2;
          newEvent.isTrusted = false;
          newEvent._simulated = true;
          return newEvent;
        }
        var delay = 200;
        function addDoubleTapListener(obj, handler) {
          obj.addEventListener("dblclick", handler);
          var last = 0, detail;
          function simDblclick(e) {
            if (e.detail !== 1) {
              detail = e.detail;
              return;
            }
            if (e.pointerType === "mouse" || e.sourceCapabilities && !e.sourceCapabilities.firesTouchEvents) {
              return;
            }
            var path = getPropagationPath(e);
            if (path.some(function(el) {
              return el instanceof HTMLLabelElement && el.attributes.for;
            }) && !path.some(function(el) {
              return el instanceof HTMLInputElement || el instanceof HTMLSelectElement;
            })) {
              return;
            }
            var now2 = Date.now();
            if (now2 - last <= delay) {
              detail++;
              if (detail === 2) {
                handler(makeDblclick(e));
              }
            } else {
              detail = 1;
            }
            last = now2;
          }
          obj.addEventListener("click", simDblclick);
          return {
            dblclick: handler,
            simDblclick
          };
        }
        function removeDoubleTapListener(obj, handlers) {
          obj.removeEventListener("dblclick", handlers.dblclick);
          obj.removeEventListener("click", handlers.simDblclick);
        }
        var TRANSFORM = testProp(
          ["transform", "webkitTransform", "OTransform", "MozTransform", "msTransform"]
        );
        var TRANSITION = testProp(
          ["webkitTransition", "transition", "OTransition", "MozTransition", "msTransition"]
        );
        var TRANSITION_END = TRANSITION === "webkitTransition" || TRANSITION === "OTransition" ? TRANSITION + "End" : "transitionend";
        function get3(id2) {
          return typeof id2 === "string" ? document.getElementById(id2) : id2;
        }
        function getStyle(el, style2) {
          var value = el.style[style2] || el.currentStyle && el.currentStyle[style2];
          if ((!value || value === "auto") && document.defaultView) {
            var css = document.defaultView.getComputedStyle(el, null);
            value = css ? css[style2] : null;
          }
          return value === "auto" ? null : value;
        }
        function create$1(tagName, className, container) {
          var el = document.createElement(tagName);
          el.className = className || "";
          if (container) {
            container.appendChild(el);
          }
          return el;
        }
        function remove2(el) {
          var parent = el.parentNode;
          if (parent) {
            parent.removeChild(el);
          }
        }
        function empty2(el) {
          while (el.firstChild) {
            el.removeChild(el.firstChild);
          }
        }
        function toFront(el) {
          var parent = el.parentNode;
          if (parent && parent.lastChild !== el) {
            parent.appendChild(el);
          }
        }
        function toBack(el) {
          var parent = el.parentNode;
          if (parent && parent.firstChild !== el) {
            parent.insertBefore(el, parent.firstChild);
          }
        }
        function hasClass(el, name) {
          if (el.classList !== void 0) {
            return el.classList.contains(name);
          }
          var className = getClass(el);
          return className.length > 0 && new RegExp("(^|\\s)" + name + "(\\s|$)").test(className);
        }
        function addClass(el, name) {
          if (el.classList !== void 0) {
            var classes = splitWords(name);
            for (var i = 0, len = classes.length; i < len; i++) {
              el.classList.add(classes[i]);
            }
          } else if (!hasClass(el, name)) {
            var className = getClass(el);
            setClass(el, (className ? className + " " : "") + name);
          }
        }
        function removeClass(el, name) {
          if (el.classList !== void 0) {
            el.classList.remove(name);
          } else {
            setClass(el, trim((" " + getClass(el) + " ").replace(" " + name + " ", " ")));
          }
        }
        function setClass(el, name) {
          if (el.className.baseVal === void 0) {
            el.className = name;
          } else {
            el.className.baseVal = name;
          }
        }
        function getClass(el) {
          if (el.correspondingElement) {
            el = el.correspondingElement;
          }
          return el.className.baseVal === void 0 ? el.className : el.className.baseVal;
        }
        function setOpacity(el, value) {
          if ("opacity" in el.style) {
            el.style.opacity = value;
          } else if ("filter" in el.style) {
            _setOpacityIE(el, value);
          }
        }
        function _setOpacityIE(el, value) {
          var filter2 = false, filterName = "DXImageTransform.Microsoft.Alpha";
          try {
            filter2 = el.filters.item(filterName);
          } catch (e) {
            if (value === 1) {
              return;
            }
          }
          value = Math.round(value * 100);
          if (filter2) {
            filter2.Enabled = value !== 100;
            filter2.Opacity = value;
          } else {
            el.style.filter += " progid:" + filterName + "(opacity=" + value + ")";
          }
        }
        function testProp(props) {
          var style2 = document.documentElement.style;
          for (var i = 0; i < props.length; i++) {
            if (props[i] in style2) {
              return props[i];
            }
          }
          return false;
        }
        function setTransform(el, offset, scale2) {
          var pos = offset || new Point(0, 0);
          el.style[TRANSFORM] = (Browser.ie3d ? "translate(" + pos.x + "px," + pos.y + "px)" : "translate3d(" + pos.x + "px," + pos.y + "px,0)") + (scale2 ? " scale(" + scale2 + ")" : "");
        }
        function setPosition(el, point) {
          el._leaflet_pos = point;
          if (Browser.any3d) {
            setTransform(el, point);
          } else {
            el.style.left = point.x + "px";
            el.style.top = point.y + "px";
          }
        }
        function getPosition(el) {
          return el._leaflet_pos || new Point(0, 0);
        }
        var disableTextSelection;
        var enableTextSelection;
        var _userSelect;
        if ("onselectstart" in document) {
          disableTextSelection = function() {
            on(window, "selectstart", preventDefault);
          };
          enableTextSelection = function() {
            off(window, "selectstart", preventDefault);
          };
        } else {
          var userSelectProperty = testProp(
            ["userSelect", "WebkitUserSelect", "OUserSelect", "MozUserSelect", "msUserSelect"]
          );
          disableTextSelection = function() {
            if (userSelectProperty) {
              var style2 = document.documentElement.style;
              _userSelect = style2[userSelectProperty];
              style2[userSelectProperty] = "none";
            }
          };
          enableTextSelection = function() {
            if (userSelectProperty) {
              document.documentElement.style[userSelectProperty] = _userSelect;
              _userSelect = void 0;
            }
          };
        }
        function disableImageDrag() {
          on(window, "dragstart", preventDefault);
        }
        function enableImageDrag() {
          off(window, "dragstart", preventDefault);
        }
        var _outlineElement, _outlineStyle;
        function preventOutline(element) {
          while (element.tabIndex === -1) {
            element = element.parentNode;
          }
          if (!element.style) {
            return;
          }
          restoreOutline();
          _outlineElement = element;
          _outlineStyle = element.style.outlineStyle;
          element.style.outlineStyle = "none";
          on(window, "keydown", restoreOutline);
        }
        function restoreOutline() {
          if (!_outlineElement) {
            return;
          }
          _outlineElement.style.outlineStyle = _outlineStyle;
          _outlineElement = void 0;
          _outlineStyle = void 0;
          off(window, "keydown", restoreOutline);
        }
        function getSizedParentNode(element) {
          do {
            element = element.parentNode;
          } while ((!element.offsetWidth || !element.offsetHeight) && element !== document.body);
          return element;
        }
        function getScale(element) {
          var rect = element.getBoundingClientRect();
          return {
            x: rect.width / element.offsetWidth || 1,
            y: rect.height / element.offsetHeight || 1,
            boundingClientRect: rect
          };
        }
        var DomUtil = {
          __proto__: null,
          TRANSFORM,
          TRANSITION,
          TRANSITION_END,
          get: get3,
          getStyle,
          create: create$1,
          remove: remove2,
          empty: empty2,
          toFront,
          toBack,
          hasClass,
          addClass,
          removeClass,
          setClass,
          getClass,
          setOpacity,
          testProp,
          setTransform,
          setPosition,
          getPosition,
          get disableTextSelection() {
            return disableTextSelection;
          },
          get enableTextSelection() {
            return enableTextSelection;
          },
          disableImageDrag,
          enableImageDrag,
          preventOutline,
          restoreOutline,
          getSizedParentNode,
          getScale
        };
        function on(obj, types, fn, context) {
          if (types && typeof types === "object") {
            for (var type in types) {
              addOne(obj, type, types[type], fn);
            }
          } else {
            types = splitWords(types);
            for (var i = 0, len = types.length; i < len; i++) {
              addOne(obj, types[i], fn, context);
            }
          }
          return this;
        }
        var eventsKey = "_leaflet_events";
        function off(obj, types, fn, context) {
          if (arguments.length === 1) {
            batchRemove(obj);
            delete obj[eventsKey];
          } else if (types && typeof types === "object") {
            for (var type in types) {
              removeOne(obj, type, types[type], fn);
            }
          } else {
            types = splitWords(types);
            if (arguments.length === 2) {
              batchRemove(obj, function(type2) {
                return indexOf(types, type2) !== -1;
              });
            } else {
              for (var i = 0, len = types.length; i < len; i++) {
                removeOne(obj, types[i], fn, context);
              }
            }
          }
          return this;
        }
        function batchRemove(obj, filterFn) {
          for (var id2 in obj[eventsKey]) {
            var type = id2.split(/\d/)[0];
            if (!filterFn || filterFn(type)) {
              removeOne(obj, type, null, null, id2);
            }
          }
        }
        var mouseSubst = {
          mouseenter: "mouseover",
          mouseleave: "mouseout",
          wheel: !("onwheel" in window) && "mousewheel"
        };
        function addOne(obj, type, fn, context) {
          var id2 = type + stamp(fn) + (context ? "_" + stamp(context) : "");
          if (obj[eventsKey] && obj[eventsKey][id2]) {
            return this;
          }
          var handler = function(e) {
            return fn.call(context || obj, e || window.event);
          };
          var originalHandler = handler;
          if (!Browser.touchNative && Browser.pointer && type.indexOf("touch") === 0) {
            handler = addPointerListener(obj, type, handler);
          } else if (Browser.touch && type === "dblclick") {
            handler = addDoubleTapListener(obj, handler);
          } else if ("addEventListener" in obj) {
            if (type === "touchstart" || type === "touchmove" || type === "wheel" || type === "mousewheel") {
              obj.addEventListener(mouseSubst[type] || type, handler, Browser.passiveEvents ? { passive: false } : false);
            } else if (type === "mouseenter" || type === "mouseleave") {
              handler = function(e) {
                e = e || window.event;
                if (isExternalTarget(obj, e)) {
                  originalHandler(e);
                }
              };
              obj.addEventListener(mouseSubst[type], handler, false);
            } else {
              obj.addEventListener(type, originalHandler, false);
            }
          } else {
            obj.attachEvent("on" + type, handler);
          }
          obj[eventsKey] = obj[eventsKey] || {};
          obj[eventsKey][id2] = handler;
        }
        function removeOne(obj, type, fn, context, id2) {
          id2 = id2 || type + stamp(fn) + (context ? "_" + stamp(context) : "");
          var handler = obj[eventsKey] && obj[eventsKey][id2];
          if (!handler) {
            return this;
          }
          if (!Browser.touchNative && Browser.pointer && type.indexOf("touch") === 0) {
            removePointerListener(obj, type, handler);
          } else if (Browser.touch && type === "dblclick") {
            removeDoubleTapListener(obj, handler);
          } else if ("removeEventListener" in obj) {
            obj.removeEventListener(mouseSubst[type] || type, handler, false);
          } else {
            obj.detachEvent("on" + type, handler);
          }
          obj[eventsKey][id2] = null;
        }
        function stopPropagation(e) {
          if (e.stopPropagation) {
            e.stopPropagation();
          } else if (e.originalEvent) {
            e.originalEvent._stopped = true;
          } else {
            e.cancelBubble = true;
          }
          return this;
        }
        function disableScrollPropagation(el) {
          addOne(el, "wheel", stopPropagation);
          return this;
        }
        function disableClickPropagation(el) {
          on(el, "mousedown touchstart dblclick contextmenu", stopPropagation);
          el["_leaflet_disable_click"] = true;
          return this;
        }
        function preventDefault(e) {
          if (e.preventDefault) {
            e.preventDefault();
          } else {
            e.returnValue = false;
          }
          return this;
        }
        function stop(e) {
          preventDefault(e);
          stopPropagation(e);
          return this;
        }
        function getPropagationPath(ev) {
          if (ev.composedPath) {
            return ev.composedPath();
          }
          var path = [];
          var el = ev.target;
          while (el) {
            path.push(el);
            el = el.parentNode;
          }
          return path;
        }
        function getMousePosition(e, container) {
          if (!container) {
            return new Point(e.clientX, e.clientY);
          }
          var scale2 = getScale(container), offset = scale2.boundingClientRect;
          return new Point(
            // offset.left/top values are in page scale (like clientX/Y),
            // whereas clientLeft/Top (border width) values are the original values (before CSS scale applies).
            (e.clientX - offset.left) / scale2.x - container.clientLeft,
            (e.clientY - offset.top) / scale2.y - container.clientTop
          );
        }
        var wheelPxFactor = Browser.linux && Browser.chrome ? window.devicePixelRatio : Browser.mac ? window.devicePixelRatio * 3 : window.devicePixelRatio > 0 ? 2 * window.devicePixelRatio : 1;
        function getWheelDelta(e) {
          return Browser.edge ? e.wheelDeltaY / 2 : (
            // Don't trust window-geometry-based delta
            e.deltaY && e.deltaMode === 0 ? -e.deltaY / wheelPxFactor : (
              // Pixels
              e.deltaY && e.deltaMode === 1 ? -e.deltaY * 20 : (
                // Lines
                e.deltaY && e.deltaMode === 2 ? -e.deltaY * 60 : (
                  // Pages
                  e.deltaX || e.deltaZ ? 0 : (
                    // Skip horizontal/depth wheel events
                    e.wheelDelta ? (e.wheelDeltaY || e.wheelDelta) / 2 : (
                      // Legacy IE pixels
                      e.detail && Math.abs(e.detail) < 32765 ? -e.detail * 20 : (
                        // Legacy Moz lines
                        e.detail ? e.detail / -32765 * 60 : (
                          // Legacy Moz pages
                          0
                        )
                      )
                    )
                  )
                )
              )
            )
          );
        }
        function isExternalTarget(el, e) {
          var related = e.relatedTarget;
          if (!related) {
            return true;
          }
          try {
            while (related && related !== el) {
              related = related.parentNode;
            }
          } catch (err) {
            return false;
          }
          return related !== el;
        }
        var DomEvent = {
          __proto__: null,
          on,
          off,
          stopPropagation,
          disableScrollPropagation,
          disableClickPropagation,
          preventDefault,
          stop,
          getPropagationPath,
          getMousePosition,
          getWheelDelta,
          isExternalTarget,
          addListener: on,
          removeListener: off
        };
        var PosAnimation = Evented.extend({
          // @method run(el: HTMLElement, newPos: Point, duration?: Number, easeLinearity?: Number)
          // Run an animation of a given element to a new position, optionally setting
          // duration in seconds (`0.25` by default) and easing linearity factor (3rd
          // argument of the [cubic bezier curve](https://cubic-bezier.com/#0,0,.5,1),
          // `0.5` by default).
          run: function(el, newPos, duration, easeLinearity) {
            this.stop();
            this._el = el;
            this._inProgress = true;
            this._duration = duration || 0.25;
            this._easeOutPower = 1 / Math.max(easeLinearity || 0.5, 0.2);
            this._startPos = getPosition(el);
            this._offset = newPos.subtract(this._startPos);
            this._startTime = +/* @__PURE__ */ new Date();
            this.fire("start");
            this._animate();
          },
          // @method stop()
          // Stops the animation (if currently running).
          stop: function() {
            if (!this._inProgress) {
              return;
            }
            this._step(true);
            this._complete();
          },
          _animate: function() {
            this._animId = requestAnimFrame(this._animate, this);
            this._step();
          },
          _step: function(round) {
            var elapsed = +/* @__PURE__ */ new Date() - this._startTime, duration = this._duration * 1e3;
            if (elapsed < duration) {
              this._runFrame(this._easeOut(elapsed / duration), round);
            } else {
              this._runFrame(1);
              this._complete();
            }
          },
          _runFrame: function(progress, round) {
            var pos = this._startPos.add(this._offset.multiplyBy(progress));
            if (round) {
              pos._round();
            }
            setPosition(this._el, pos);
            this.fire("step");
          },
          _complete: function() {
            cancelAnimFrame(this._animId);
            this._inProgress = false;
            this.fire("end");
          },
          _easeOut: function(t) {
            return 1 - Math.pow(1 - t, this._easeOutPower);
          }
        });
        var Map2 = Evented.extend({
          options: {
            // @section Map State Options
            // @option crs: CRS = L.CRS.EPSG3857
            // The [Coordinate Reference System](#crs) to use. Don't change this if you're not
            // sure what it means.
            crs: EPSG3857,
            // @option center: LatLng = undefined
            // Initial geographic center of the map
            center: void 0,
            // @option zoom: Number = undefined
            // Initial map zoom level
            zoom: void 0,
            // @option minZoom: Number = *
            // Minimum zoom level of the map.
            // If not specified and at least one `GridLayer` or `TileLayer` is in the map,
            // the lowest of their `minZoom` options will be used instead.
            minZoom: void 0,
            // @option maxZoom: Number = *
            // Maximum zoom level of the map.
            // If not specified and at least one `GridLayer` or `TileLayer` is in the map,
            // the highest of their `maxZoom` options will be used instead.
            maxZoom: void 0,
            // @option layers: Layer[] = []
            // Array of layers that will be added to the map initially
            layers: [],
            // @option maxBounds: LatLngBounds = null
            // When this option is set, the map restricts the view to the given
            // geographical bounds, bouncing the user back if the user tries to pan
            // outside the view. To set the restriction dynamically, use
            // [`setMaxBounds`](#map-setmaxbounds) method.
            maxBounds: void 0,
            // @option renderer: Renderer = *
            // The default method for drawing vector layers on the map. `L.SVG`
            // or `L.Canvas` by default depending on browser support.
            renderer: void 0,
            // @section Animation Options
            // @option zoomAnimation: Boolean = true
            // Whether the map zoom animation is enabled. By default it's enabled
            // in all browsers that support CSS3 Transitions except Android.
            zoomAnimation: true,
            // @option zoomAnimationThreshold: Number = 4
            // Won't animate zoom if the zoom difference exceeds this value.
            zoomAnimationThreshold: 4,
            // @option fadeAnimation: Boolean = true
            // Whether the tile fade animation is enabled. By default it's enabled
            // in all browsers that support CSS3 Transitions except Android.
            fadeAnimation: true,
            // @option markerZoomAnimation: Boolean = true
            // Whether markers animate their zoom with the zoom animation, if disabled
            // they will disappear for the length of the animation. By default it's
            // enabled in all browsers that support CSS3 Transitions except Android.
            markerZoomAnimation: true,
            // @option transform3DLimit: Number = 2^23
            // Defines the maximum size of a CSS translation transform. The default
            // value should not be changed unless a web browser positions layers in
            // the wrong place after doing a large `panBy`.
            transform3DLimit: 8388608,
            // Precision limit of a 32-bit float
            // @section Interaction Options
            // @option zoomSnap: Number = 1
            // Forces the map's zoom level to always be a multiple of this, particularly
            // right after a [`fitBounds()`](#map-fitbounds) or a pinch-zoom.
            // By default, the zoom level snaps to the nearest integer; lower values
            // (e.g. `0.5` or `0.1`) allow for greater granularity. A value of `0`
            // means the zoom level will not be snapped after `fitBounds` or a pinch-zoom.
            zoomSnap: 1,
            // @option zoomDelta: Number = 1
            // Controls how much the map's zoom level will change after a
            // [`zoomIn()`](#map-zoomin), [`zoomOut()`](#map-zoomout), pressing `+`
            // or `-` on the keyboard, or using the [zoom controls](#control-zoom).
            // Values smaller than `1` (e.g. `0.5`) allow for greater granularity.
            zoomDelta: 1,
            // @option trackResize: Boolean = true
            // Whether the map automatically handles browser window resize to update itself.
            trackResize: true
          },
          initialize: function(id2, options) {
            options = setOptions(this, options);
            this._handlers = [];
            this._layers = {};
            this._zoomBoundLayers = {};
            this._sizeChanged = true;
            this._initContainer(id2);
            this._initLayout();
            this._onResize = bind(this._onResize, this);
            this._initEvents();
            if (options.maxBounds) {
              this.setMaxBounds(options.maxBounds);
            }
            if (options.zoom !== void 0) {
              this._zoom = this._limitZoom(options.zoom);
            }
            if (options.center && options.zoom !== void 0) {
              this.setView(toLatLng(options.center), options.zoom, { reset: true });
            }
            this.callInitHooks();
            this._zoomAnimated = TRANSITION && Browser.any3d && !Browser.mobileOpera && this.options.zoomAnimation;
            if (this._zoomAnimated) {
              this._createAnimProxy();
              on(this._proxy, TRANSITION_END, this._catchTransitionEnd, this);
            }
            this._addLayers(this.options.layers);
          },
          // @section Methods for modifying map state
          // @method setView(center: LatLng, zoom: Number, options?: Zoom/pan options): this
          // Sets the view of the map (geographical center and zoom) with the given
          // animation options.
          setView: function(center, zoom2, options) {
            zoom2 = zoom2 === void 0 ? this._zoom : this._limitZoom(zoom2);
            center = this._limitCenter(toLatLng(center), zoom2, this.options.maxBounds);
            options = options || {};
            this._stop();
            if (this._loaded && !options.reset && options !== true) {
              if (options.animate !== void 0) {
                options.zoom = extend2({ animate: options.animate }, options.zoom);
                options.pan = extend2({ animate: options.animate, duration: options.duration }, options.pan);
              }
              var moved = this._zoom !== zoom2 ? this._tryAnimatedZoom && this._tryAnimatedZoom(center, zoom2, options.zoom) : this._tryAnimatedPan(center, options.pan);
              if (moved) {
                clearTimeout(this._sizeTimer);
                return this;
              }
            }
            this._resetView(center, zoom2, options.pan && options.pan.noMoveStart);
            return this;
          },
          // @method setZoom(zoom: Number, options?: Zoom/pan options): this
          // Sets the zoom of the map.
          setZoom: function(zoom2, options) {
            if (!this._loaded) {
              this._zoom = zoom2;
              return this;
            }
            return this.setView(this.getCenter(), zoom2, { zoom: options });
          },
          // @method zoomIn(delta?: Number, options?: Zoom options): this
          // Increases the zoom of the map by `delta` ([`zoomDelta`](#map-zoomdelta) by default).
          zoomIn: function(delta, options) {
            delta = delta || (Browser.any3d ? this.options.zoomDelta : 1);
            return this.setZoom(this._zoom + delta, options);
          },
          // @method zoomOut(delta?: Number, options?: Zoom options): this
          // Decreases the zoom of the map by `delta` ([`zoomDelta`](#map-zoomdelta) by default).
          zoomOut: function(delta, options) {
            delta = delta || (Browser.any3d ? this.options.zoomDelta : 1);
            return this.setZoom(this._zoom - delta, options);
          },
          // @method setZoomAround(latlng: LatLng, zoom: Number, options: Zoom options): this
          // Zooms the map while keeping a specified geographical point on the map
          // stationary (e.g. used internally for scroll zoom and double-click zoom).
          // @alternative
          // @method setZoomAround(offset: Point, zoom: Number, options: Zoom options): this
          // Zooms the map while keeping a specified pixel on the map (relative to the top-left corner) stationary.
          setZoomAround: function(latlng, zoom2, options) {
            var scale2 = this.getZoomScale(zoom2), viewHalf = this.getSize().divideBy(2), containerPoint = latlng instanceof Point ? latlng : this.latLngToContainerPoint(latlng), centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale2), newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));
            return this.setView(newCenter, zoom2, { zoom: options });
          },
          _getBoundsCenterZoom: function(bounds, options) {
            options = options || {};
            bounds = bounds.getBounds ? bounds.getBounds() : toLatLngBounds(bounds);
            var paddingTL = toPoint(options.paddingTopLeft || options.padding || [0, 0]), paddingBR = toPoint(options.paddingBottomRight || options.padding || [0, 0]), zoom2 = this.getBoundsZoom(bounds, false, paddingTL.add(paddingBR));
            zoom2 = typeof options.maxZoom === "number" ? Math.min(options.maxZoom, zoom2) : zoom2;
            if (zoom2 === Infinity) {
              return {
                center: bounds.getCenter(),
                zoom: zoom2
              };
            }
            var paddingOffset = paddingBR.subtract(paddingTL).divideBy(2), swPoint = this.project(bounds.getSouthWest(), zoom2), nePoint = this.project(bounds.getNorthEast(), zoom2), center = this.unproject(swPoint.add(nePoint).divideBy(2).add(paddingOffset), zoom2);
            return {
              center,
              zoom: zoom2
            };
          },
          // @method fitBounds(bounds: LatLngBounds, options?: fitBounds options): this
          // Sets a map view that contains the given geographical bounds with the
          // maximum zoom level possible.
          fitBounds: function(bounds, options) {
            bounds = toLatLngBounds(bounds);
            if (!bounds.isValid()) {
              throw new Error("Bounds are not valid.");
            }
            var target = this._getBoundsCenterZoom(bounds, options);
            return this.setView(target.center, target.zoom, options);
          },
          // @method fitWorld(options?: fitBounds options): this
          // Sets a map view that mostly contains the whole world with the maximum
          // zoom level possible.
          fitWorld: function(options) {
            return this.fitBounds([[-90, -180], [90, 180]], options);
          },
          // @method panTo(latlng: LatLng, options?: Pan options): this
          // Pans the map to a given center.
          panTo: function(center, options) {
            return this.setView(center, this._zoom, { pan: options });
          },
          // @method panBy(offset: Point, options?: Pan options): this
          // Pans the map by a given number of pixels (animated).
          panBy: function(offset, options) {
            offset = toPoint(offset).round();
            options = options || {};
            if (!offset.x && !offset.y) {
              return this.fire("moveend");
            }
            if (options.animate !== true && !this.getSize().contains(offset)) {
              this._resetView(this.unproject(this.project(this.getCenter()).add(offset)), this.getZoom());
              return this;
            }
            if (!this._panAnim) {
              this._panAnim = new PosAnimation();
              this._panAnim.on({
                "step": this._onPanTransitionStep,
                "end": this._onPanTransitionEnd
              }, this);
            }
            if (!options.noMoveStart) {
              this.fire("movestart");
            }
            if (options.animate !== false) {
              addClass(this._mapPane, "leaflet-pan-anim");
              var newPos = this._getMapPanePos().subtract(offset).round();
              this._panAnim.run(this._mapPane, newPos, options.duration || 0.25, options.easeLinearity);
            } else {
              this._rawPanBy(offset);
              this.fire("move").fire("moveend");
            }
            return this;
          },
          // @method flyTo(latlng: LatLng, zoom?: Number, options?: Zoom/pan options): this
          // Sets the view of the map (geographical center and zoom) performing a smooth
          // pan-zoom animation.
          flyTo: function(targetCenter, targetZoom, options) {
            options = options || {};
            if (options.animate === false || !Browser.any3d) {
              return this.setView(targetCenter, targetZoom, options);
            }
            this._stop();
            var from = this.project(this.getCenter()), to = this.project(targetCenter), size = this.getSize(), startZoom = this._zoom;
            targetCenter = toLatLng(targetCenter);
            targetZoom = targetZoom === void 0 ? startZoom : targetZoom;
            var w0 = Math.max(size.x, size.y), w1 = w0 * this.getZoomScale(startZoom, targetZoom), u1 = to.distanceTo(from) || 1, rho = 1.42, rho2 = rho * rho;
            function r(i) {
              var s1 = i ? -1 : 1, s2 = i ? w1 : w0, t1 = w1 * w1 - w0 * w0 + s1 * rho2 * rho2 * u1 * u1, b1 = 2 * s2 * rho2 * u1, b = t1 / b1, sq = Math.sqrt(b * b + 1) - b;
              var log = sq < 1e-9 ? -18 : Math.log(sq);
              return log;
            }
            function sinh2(n) {
              return (Math.exp(n) - Math.exp(-n)) / 2;
            }
            function cosh2(n) {
              return (Math.exp(n) + Math.exp(-n)) / 2;
            }
            function tanh2(n) {
              return sinh2(n) / cosh2(n);
            }
            var r0 = r(0);
            function w(s) {
              return w0 * (cosh2(r0) / cosh2(r0 + rho * s));
            }
            function u(s) {
              return w0 * (cosh2(r0) * tanh2(r0 + rho * s) - sinh2(r0)) / rho2;
            }
            function easeOut(t) {
              return 1 - Math.pow(1 - t, 1.5);
            }
            var start2 = Date.now(), S = (r(1) - r0) / rho, duration = options.duration ? 1e3 * options.duration : 1e3 * S * 0.8;
            function frame2() {
              var t = (Date.now() - start2) / duration, s = easeOut(t) * S;
              if (t <= 1) {
                this._flyToFrame = requestAnimFrame(frame2, this);
                this._move(
                  this.unproject(from.add(to.subtract(from).multiplyBy(u(s) / u1)), startZoom),
                  this.getScaleZoom(w0 / w(s), startZoom),
                  { flyTo: true }
                );
              } else {
                this._move(targetCenter, targetZoom)._moveEnd(true);
              }
            }
            this._moveStart(true, options.noMoveStart);
            frame2.call(this);
            return this;
          },
          // @method flyToBounds(bounds: LatLngBounds, options?: fitBounds options): this
          // Sets the view of the map with a smooth animation like [`flyTo`](#map-flyto),
          // but takes a bounds parameter like [`fitBounds`](#map-fitbounds).
          flyToBounds: function(bounds, options) {
            var target = this._getBoundsCenterZoom(bounds, options);
            return this.flyTo(target.center, target.zoom, options);
          },
          // @method setMaxBounds(bounds: LatLngBounds): this
          // Restricts the map view to the given bounds (see the [maxBounds](#map-maxbounds) option).
          setMaxBounds: function(bounds) {
            bounds = toLatLngBounds(bounds);
            if (this.listens("moveend", this._panInsideMaxBounds)) {
              this.off("moveend", this._panInsideMaxBounds);
            }
            if (!bounds.isValid()) {
              this.options.maxBounds = null;
              return this;
            }
            this.options.maxBounds = bounds;
            if (this._loaded) {
              this._panInsideMaxBounds();
            }
            return this.on("moveend", this._panInsideMaxBounds);
          },
          // @method setMinZoom(zoom: Number): this
          // Sets the lower limit for the available zoom levels (see the [minZoom](#map-minzoom) option).
          setMinZoom: function(zoom2) {
            var oldZoom = this.options.minZoom;
            this.options.minZoom = zoom2;
            if (this._loaded && oldZoom !== zoom2) {
              this.fire("zoomlevelschange");
              if (this.getZoom() < this.options.minZoom) {
                return this.setZoom(zoom2);
              }
            }
            return this;
          },
          // @method setMaxZoom(zoom: Number): this
          // Sets the upper limit for the available zoom levels (see the [maxZoom](#map-maxzoom) option).
          setMaxZoom: function(zoom2) {
            var oldZoom = this.options.maxZoom;
            this.options.maxZoom = zoom2;
            if (this._loaded && oldZoom !== zoom2) {
              this.fire("zoomlevelschange");
              if (this.getZoom() > this.options.maxZoom) {
                return this.setZoom(zoom2);
              }
            }
            return this;
          },
          // @method panInsideBounds(bounds: LatLngBounds, options?: Pan options): this
          // Pans the map to the closest view that would lie inside the given bounds (if it's not already), controlling the animation using the options specific, if any.
          panInsideBounds: function(bounds, options) {
            this._enforcingBounds = true;
            var center = this.getCenter(), newCenter = this._limitCenter(center, this._zoom, toLatLngBounds(bounds));
            if (!center.equals(newCenter)) {
              this.panTo(newCenter, options);
            }
            this._enforcingBounds = false;
            return this;
          },
          // @method panInside(latlng: LatLng, options?: padding options): this
          // Pans the map the minimum amount to make the `latlng` visible. Use
          // padding options to fit the display to more restricted bounds.
          // If `latlng` is already within the (optionally padded) display bounds,
          // the map will not be panned.
          panInside: function(latlng, options) {
            options = options || {};
            var paddingTL = toPoint(options.paddingTopLeft || options.padding || [0, 0]), paddingBR = toPoint(options.paddingBottomRight || options.padding || [0, 0]), pixelCenter = this.project(this.getCenter()), pixelPoint = this.project(latlng), pixelBounds = this.getPixelBounds(), paddedBounds = toBounds([pixelBounds.min.add(paddingTL), pixelBounds.max.subtract(paddingBR)]), paddedSize = paddedBounds.getSize();
            if (!paddedBounds.contains(pixelPoint)) {
              this._enforcingBounds = true;
              var centerOffset = pixelPoint.subtract(paddedBounds.getCenter());
              var offset = paddedBounds.extend(pixelPoint).getSize().subtract(paddedSize);
              pixelCenter.x += centerOffset.x < 0 ? -offset.x : offset.x;
              pixelCenter.y += centerOffset.y < 0 ? -offset.y : offset.y;
              this.panTo(this.unproject(pixelCenter), options);
              this._enforcingBounds = false;
            }
            return this;
          },
          // @method invalidateSize(options: Zoom/pan options): this
          // Checks if the map container size changed and updates the map if so —
          // call it after you've changed the map size dynamically, also animating
          // pan by default. If `options.pan` is `false`, panning will not occur.
          // If `options.debounceMoveend` is `true`, it will delay `moveend` event so
          // that it doesn't happen often even if the method is called many
          // times in a row.
          // @alternative
          // @method invalidateSize(animate: Boolean): this
          // Checks if the map container size changed and updates the map if so —
          // call it after you've changed the map size dynamically, also animating
          // pan by default.
          invalidateSize: function(options) {
            if (!this._loaded) {
              return this;
            }
            options = extend2({
              animate: false,
              pan: true
            }, options === true ? { animate: true } : options);
            var oldSize = this.getSize();
            this._sizeChanged = true;
            this._lastCenter = null;
            var newSize = this.getSize(), oldCenter = oldSize.divideBy(2).round(), newCenter = newSize.divideBy(2).round(), offset = oldCenter.subtract(newCenter);
            if (!offset.x && !offset.y) {
              return this;
            }
            if (options.animate && options.pan) {
              this.panBy(offset);
            } else {
              if (options.pan) {
                this._rawPanBy(offset);
              }
              this.fire("move");
              if (options.debounceMoveend) {
                clearTimeout(this._sizeTimer);
                this._sizeTimer = setTimeout(bind(this.fire, this, "moveend"), 200);
              } else {
                this.fire("moveend");
              }
            }
            return this.fire("resize", {
              oldSize,
              newSize
            });
          },
          // @section Methods for modifying map state
          // @method stop(): this
          // Stops the currently running `panTo` or `flyTo` animation, if any.
          stop: function() {
            this.setZoom(this._limitZoom(this._zoom));
            if (!this.options.zoomSnap) {
              this.fire("viewreset");
            }
            return this._stop();
          },
          // @section Geolocation methods
          // @method locate(options?: Locate options): this
          // Tries to locate the user using the Geolocation API, firing a [`locationfound`](#map-locationfound)
          // event with location data on success or a [`locationerror`](#map-locationerror) event on failure,
          // and optionally sets the map view to the user's location with respect to
          // detection accuracy (or to the world view if geolocation failed).
          // Note that, if your page doesn't use HTTPS, this method will fail in
          // modern browsers ([Chrome 50 and newer](https://sites.google.com/a/chromium.org/dev/Home/chromium-security/deprecating-powerful-features-on-insecure-origins))
          // See `Locate options` for more details.
          locate: function(options) {
            options = this._locateOptions = extend2({
              timeout: 1e4,
              watch: false
              // setView: false
              // maxZoom: <Number>
              // maximumAge: 0
              // enableHighAccuracy: false
            }, options);
            if (!("geolocation" in navigator)) {
              this._handleGeolocationError({
                code: 0,
                message: "Geolocation not supported."
              });
              return this;
            }
            var onResponse = bind(this._handleGeolocationResponse, this), onError = bind(this._handleGeolocationError, this);
            if (options.watch) {
              this._locationWatchId = navigator.geolocation.watchPosition(onResponse, onError, options);
            } else {
              navigator.geolocation.getCurrentPosition(onResponse, onError, options);
            }
            return this;
          },
          // @method stopLocate(): this
          // Stops watching location previously initiated by `map.locate({watch: true})`
          // and aborts resetting the map view if map.locate was called with
          // `{setView: true}`.
          stopLocate: function() {
            if (navigator.geolocation && navigator.geolocation.clearWatch) {
              navigator.geolocation.clearWatch(this._locationWatchId);
            }
            if (this._locateOptions) {
              this._locateOptions.setView = false;
            }
            return this;
          },
          _handleGeolocationError: function(error) {
            if (!this._container._leaflet_id) {
              return;
            }
            var c2 = error.code, message = error.message || (c2 === 1 ? "permission denied" : c2 === 2 ? "position unavailable" : "timeout");
            if (this._locateOptions.setView && !this._loaded) {
              this.fitWorld();
            }
            this.fire("locationerror", {
              code: c2,
              message: "Geolocation error: " + message + "."
            });
          },
          _handleGeolocationResponse: function(pos) {
            if (!this._container._leaflet_id) {
              return;
            }
            var lat = pos.coords.latitude, lng = pos.coords.longitude, latlng = new LatLng(lat, lng), bounds = latlng.toBounds(pos.coords.accuracy * 2), options = this._locateOptions;
            if (options.setView) {
              var zoom2 = this.getBoundsZoom(bounds);
              this.setView(latlng, options.maxZoom ? Math.min(zoom2, options.maxZoom) : zoom2);
            }
            var data = {
              latlng,
              bounds,
              timestamp: pos.timestamp
            };
            for (var i in pos.coords) {
              if (typeof pos.coords[i] === "number") {
                data[i] = pos.coords[i];
              }
            }
            this.fire("locationfound", data);
          },
          // TODO Appropriate docs section?
          // @section Other Methods
          // @method addHandler(name: String, HandlerClass: Function): this
          // Adds a new `Handler` to the map, given its name and constructor function.
          addHandler: function(name, HandlerClass) {
            if (!HandlerClass) {
              return this;
            }
            var handler = this[name] = new HandlerClass(this);
            this._handlers.push(handler);
            if (this.options[name]) {
              handler.enable();
            }
            return this;
          },
          // @method remove(): this
          // Destroys the map and clears all related event listeners.
          remove: function() {
            this._initEvents(true);
            if (this.options.maxBounds) {
              this.off("moveend", this._panInsideMaxBounds);
            }
            if (this._containerId !== this._container._leaflet_id) {
              throw new Error("Map container is being reused by another instance");
            }
            try {
              delete this._container._leaflet_id;
              delete this._containerId;
            } catch (e) {
              this._container._leaflet_id = void 0;
              this._containerId = void 0;
            }
            if (this._locationWatchId !== void 0) {
              this.stopLocate();
            }
            this._stop();
            remove2(this._mapPane);
            if (this._clearControlPos) {
              this._clearControlPos();
            }
            if (this._resizeRequest) {
              cancelAnimFrame(this._resizeRequest);
              this._resizeRequest = null;
            }
            this._clearHandlers();
            if (this._loaded) {
              this.fire("unload");
            }
            var i;
            for (i in this._layers) {
              this._layers[i].remove();
            }
            for (i in this._panes) {
              remove2(this._panes[i]);
            }
            this._layers = [];
            this._panes = [];
            delete this._mapPane;
            delete this._renderer;
            return this;
          },
          // @section Other Methods
          // @method createPane(name: String, container?: HTMLElement): HTMLElement
          // Creates a new [map pane](#map-pane) with the given name if it doesn't exist already,
          // then returns it. The pane is created as a child of `container`, or
          // as a child of the main map pane if not set.
          createPane: function(name, container) {
            var className = "leaflet-pane" + (name ? " leaflet-" + name.replace("Pane", "") + "-pane" : ""), pane = create$1("div", className, container || this._mapPane);
            if (name) {
              this._panes[name] = pane;
            }
            return pane;
          },
          // @section Methods for Getting Map State
          // @method getCenter(): LatLng
          // Returns the geographical center of the map view
          getCenter: function() {
            this._checkIfLoaded();
            if (this._lastCenter && !this._moved()) {
              return this._lastCenter.clone();
            }
            return this.layerPointToLatLng(this._getCenterLayerPoint());
          },
          // @method getZoom(): Number
          // Returns the current zoom level of the map view
          getZoom: function() {
            return this._zoom;
          },
          // @method getBounds(): LatLngBounds
          // Returns the geographical bounds visible in the current map view
          getBounds: function() {
            var bounds = this.getPixelBounds(), sw = this.unproject(bounds.getBottomLeft()), ne = this.unproject(bounds.getTopRight());
            return new LatLngBounds(sw, ne);
          },
          // @method getMinZoom(): Number
          // Returns the minimum zoom level of the map (if set in the `minZoom` option of the map or of any layers), or `0` by default.
          getMinZoom: function() {
            return this.options.minZoom === void 0 ? this._layersMinZoom || 0 : this.options.minZoom;
          },
          // @method getMaxZoom(): Number
          // Returns the maximum zoom level of the map (if set in the `maxZoom` option of the map or of any layers).
          getMaxZoom: function() {
            return this.options.maxZoom === void 0 ? this._layersMaxZoom === void 0 ? Infinity : this._layersMaxZoom : this.options.maxZoom;
          },
          // @method getBoundsZoom(bounds: LatLngBounds, inside?: Boolean, padding?: Point): Number
          // Returns the maximum zoom level on which the given bounds fit to the map
          // view in its entirety. If `inside` (optional) is set to `true`, the method
          // instead returns the minimum zoom level on which the map view fits into
          // the given bounds in its entirety.
          getBoundsZoom: function(bounds, inside, padding) {
            bounds = toLatLngBounds(bounds);
            padding = toPoint(padding || [0, 0]);
            var zoom2 = this.getZoom() || 0, min = this.getMinZoom(), max = this.getMaxZoom(), nw = bounds.getNorthWest(), se = bounds.getSouthEast(), size = this.getSize().subtract(padding), boundsSize = toBounds(this.project(se, zoom2), this.project(nw, zoom2)).getSize(), snap = Browser.any3d ? this.options.zoomSnap : 1, scalex = size.x / boundsSize.x, scaley = size.y / boundsSize.y, scale2 = inside ? Math.max(scalex, scaley) : Math.min(scalex, scaley);
            zoom2 = this.getScaleZoom(scale2, zoom2);
            if (snap) {
              zoom2 = Math.round(zoom2 / (snap / 100)) * (snap / 100);
              zoom2 = inside ? Math.ceil(zoom2 / snap) * snap : Math.floor(zoom2 / snap) * snap;
            }
            return Math.max(min, Math.min(max, zoom2));
          },
          // @method getSize(): Point
          // Returns the current size of the map container (in pixels).
          getSize: function() {
            if (!this._size || this._sizeChanged) {
              this._size = new Point(
                this._container.clientWidth || 0,
                this._container.clientHeight || 0
              );
              this._sizeChanged = false;
            }
            return this._size.clone();
          },
          // @method getPixelBounds(): Bounds
          // Returns the bounds of the current map view in projected pixel
          // coordinates (sometimes useful in layer and overlay implementations).
          getPixelBounds: function(center, zoom2) {
            var topLeftPoint = this._getTopLeftPoint(center, zoom2);
            return new Bounds(topLeftPoint, topLeftPoint.add(this.getSize()));
          },
          // TODO: Check semantics - isn't the pixel origin the 0,0 coord relative to
          // the map pane? "left point of the map layer" can be confusing, specially
          // since there can be negative offsets.
          // @method getPixelOrigin(): Point
          // Returns the projected pixel coordinates of the top left point of
          // the map layer (useful in custom layer and overlay implementations).
          getPixelOrigin: function() {
            this._checkIfLoaded();
            return this._pixelOrigin;
          },
          // @method getPixelWorldBounds(zoom?: Number): Bounds
          // Returns the world's bounds in pixel coordinates for zoom level `zoom`.
          // If `zoom` is omitted, the map's current zoom level is used.
          getPixelWorldBounds: function(zoom2) {
            return this.options.crs.getProjectedBounds(zoom2 === void 0 ? this.getZoom() : zoom2);
          },
          // @section Other Methods
          // @method getPane(pane: String|HTMLElement): HTMLElement
          // Returns a [map pane](#map-pane), given its name or its HTML element (its identity).
          getPane: function(pane) {
            return typeof pane === "string" ? this._panes[pane] : pane;
          },
          // @method getPanes(): Object
          // Returns a plain object containing the names of all [panes](#map-pane) as keys and
          // the panes as values.
          getPanes: function() {
            return this._panes;
          },
          // @method getContainer: HTMLElement
          // Returns the HTML element that contains the map.
          getContainer: function() {
            return this._container;
          },
          // @section Conversion Methods
          // @method getZoomScale(toZoom: Number, fromZoom: Number): Number
          // Returns the scale factor to be applied to a map transition from zoom level
          // `fromZoom` to `toZoom`. Used internally to help with zoom animations.
          getZoomScale: function(toZoom, fromZoom) {
            var crs = this.options.crs;
            fromZoom = fromZoom === void 0 ? this._zoom : fromZoom;
            return crs.scale(toZoom) / crs.scale(fromZoom);
          },
          // @method getScaleZoom(scale: Number, fromZoom: Number): Number
          // Returns the zoom level that the map would end up at, if it is at `fromZoom`
          // level and everything is scaled by a factor of `scale`. Inverse of
          // [`getZoomScale`](#map-getZoomScale).
          getScaleZoom: function(scale2, fromZoom) {
            var crs = this.options.crs;
            fromZoom = fromZoom === void 0 ? this._zoom : fromZoom;
            var zoom2 = crs.zoom(scale2 * crs.scale(fromZoom));
            return isNaN(zoom2) ? Infinity : zoom2;
          },
          // @method project(latlng: LatLng, zoom: Number): Point
          // Projects a geographical coordinate `LatLng` according to the projection
          // of the map's CRS, then scales it according to `zoom` and the CRS's
          // `Transformation`. The result is pixel coordinate relative to
          // the CRS origin.
          project: function(latlng, zoom2) {
            zoom2 = zoom2 === void 0 ? this._zoom : zoom2;
            return this.options.crs.latLngToPoint(toLatLng(latlng), zoom2);
          },
          // @method unproject(point: Point, zoom: Number): LatLng
          // Inverse of [`project`](#map-project).
          unproject: function(point, zoom2) {
            zoom2 = zoom2 === void 0 ? this._zoom : zoom2;
            return this.options.crs.pointToLatLng(toPoint(point), zoom2);
          },
          // @method layerPointToLatLng(point: Point): LatLng
          // Given a pixel coordinate relative to the [origin pixel](#map-getpixelorigin),
          // returns the corresponding geographical coordinate (for the current zoom level).
          layerPointToLatLng: function(point) {
            var projectedPoint = toPoint(point).add(this.getPixelOrigin());
            return this.unproject(projectedPoint);
          },
          // @method latLngToLayerPoint(latlng: LatLng): Point
          // Given a geographical coordinate, returns the corresponding pixel coordinate
          // relative to the [origin pixel](#map-getpixelorigin).
          latLngToLayerPoint: function(latlng) {
            var projectedPoint = this.project(toLatLng(latlng))._round();
            return projectedPoint._subtract(this.getPixelOrigin());
          },
          // @method wrapLatLng(latlng: LatLng): LatLng
          // Returns a `LatLng` where `lat` and `lng` has been wrapped according to the
          // map's CRS's `wrapLat` and `wrapLng` properties, if they are outside the
          // CRS's bounds.
          // By default this means longitude is wrapped around the dateline so its
          // value is between -180 and +180 degrees.
          wrapLatLng: function(latlng) {
            return this.options.crs.wrapLatLng(toLatLng(latlng));
          },
          // @method wrapLatLngBounds(bounds: LatLngBounds): LatLngBounds
          // Returns a `LatLngBounds` with the same size as the given one, ensuring that
          // its center is within the CRS's bounds.
          // By default this means the center longitude is wrapped around the dateline so its
          // value is between -180 and +180 degrees, and the majority of the bounds
          // overlaps the CRS's bounds.
          wrapLatLngBounds: function(latlng) {
            return this.options.crs.wrapLatLngBounds(toLatLngBounds(latlng));
          },
          // @method distance(latlng1: LatLng, latlng2: LatLng): Number
          // Returns the distance between two geographical coordinates according to
          // the map's CRS. By default this measures distance in meters.
          distance: function(latlng1, latlng2) {
            return this.options.crs.distance(toLatLng(latlng1), toLatLng(latlng2));
          },
          // @method containerPointToLayerPoint(point: Point): Point
          // Given a pixel coordinate relative to the map container, returns the corresponding
          // pixel coordinate relative to the [origin pixel](#map-getpixelorigin).
          containerPointToLayerPoint: function(point) {
            return toPoint(point).subtract(this._getMapPanePos());
          },
          // @method layerPointToContainerPoint(point: Point): Point
          // Given a pixel coordinate relative to the [origin pixel](#map-getpixelorigin),
          // returns the corresponding pixel coordinate relative to the map container.
          layerPointToContainerPoint: function(point) {
            return toPoint(point).add(this._getMapPanePos());
          },
          // @method containerPointToLatLng(point: Point): LatLng
          // Given a pixel coordinate relative to the map container, returns
          // the corresponding geographical coordinate (for the current zoom level).
          containerPointToLatLng: function(point) {
            var layerPoint = this.containerPointToLayerPoint(toPoint(point));
            return this.layerPointToLatLng(layerPoint);
          },
          // @method latLngToContainerPoint(latlng: LatLng): Point
          // Given a geographical coordinate, returns the corresponding pixel coordinate
          // relative to the map container.
          latLngToContainerPoint: function(latlng) {
            return this.layerPointToContainerPoint(this.latLngToLayerPoint(toLatLng(latlng)));
          },
          // @method mouseEventToContainerPoint(ev: MouseEvent): Point
          // Given a MouseEvent object, returns the pixel coordinate relative to the
          // map container where the event took place.
          mouseEventToContainerPoint: function(e) {
            return getMousePosition(e, this._container);
          },
          // @method mouseEventToLayerPoint(ev: MouseEvent): Point
          // Given a MouseEvent object, returns the pixel coordinate relative to
          // the [origin pixel](#map-getpixelorigin) where the event took place.
          mouseEventToLayerPoint: function(e) {
            return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(e));
          },
          // @method mouseEventToLatLng(ev: MouseEvent): LatLng
          // Given a MouseEvent object, returns geographical coordinate where the
          // event took place.
          mouseEventToLatLng: function(e) {
            return this.layerPointToLatLng(this.mouseEventToLayerPoint(e));
          },
          // map initialization methods
          _initContainer: function(id2) {
            var container = this._container = get3(id2);
            if (!container) {
              throw new Error("Map container not found.");
            } else if (container._leaflet_id) {
              throw new Error("Map container is already initialized.");
            }
            on(container, "scroll", this._onScroll, this);
            this._containerId = stamp(container);
          },
          _initLayout: function() {
            var container = this._container;
            this._fadeAnimated = this.options.fadeAnimation && Browser.any3d;
            addClass(container, "leaflet-container" + (Browser.touch ? " leaflet-touch" : "") + (Browser.retina ? " leaflet-retina" : "") + (Browser.ielt9 ? " leaflet-oldie" : "") + (Browser.safari ? " leaflet-safari" : "") + (this._fadeAnimated ? " leaflet-fade-anim" : ""));
            var position = getStyle(container, "position");
            if (position !== "absolute" && position !== "relative" && position !== "fixed" && position !== "sticky") {
              container.style.position = "relative";
            }
            this._initPanes();
            if (this._initControlPos) {
              this._initControlPos();
            }
          },
          _initPanes: function() {
            var panes = this._panes = {};
            this._paneRenderers = {};
            this._mapPane = this.createPane("mapPane", this._container);
            setPosition(this._mapPane, new Point(0, 0));
            this.createPane("tilePane");
            this.createPane("overlayPane");
            this.createPane("shadowPane");
            this.createPane("markerPane");
            this.createPane("tooltipPane");
            this.createPane("popupPane");
            if (!this.options.markerZoomAnimation) {
              addClass(panes.markerPane, "leaflet-zoom-hide");
              addClass(panes.shadowPane, "leaflet-zoom-hide");
            }
          },
          // private methods that modify map state
          // @section Map state change events
          _resetView: function(center, zoom2, noMoveStart) {
            setPosition(this._mapPane, new Point(0, 0));
            var loading = !this._loaded;
            this._loaded = true;
            zoom2 = this._limitZoom(zoom2);
            this.fire("viewprereset");
            var zoomChanged = this._zoom !== zoom2;
            this._moveStart(zoomChanged, noMoveStart)._move(center, zoom2)._moveEnd(zoomChanged);
            this.fire("viewreset");
            if (loading) {
              this.fire("load");
            }
          },
          _moveStart: function(zoomChanged, noMoveStart) {
            if (zoomChanged) {
              this.fire("zoomstart");
            }
            if (!noMoveStart) {
              this.fire("movestart");
            }
            return this;
          },
          _move: function(center, zoom2, data, supressEvent) {
            if (zoom2 === void 0) {
              zoom2 = this._zoom;
            }
            var zoomChanged = this._zoom !== zoom2;
            this._zoom = zoom2;
            this._lastCenter = center;
            this._pixelOrigin = this._getNewPixelOrigin(center);
            if (!supressEvent) {
              if (zoomChanged || data && data.pinch) {
                this.fire("zoom", data);
              }
              this.fire("move", data);
            } else if (data && data.pinch) {
              this.fire("zoom", data);
            }
            return this;
          },
          _moveEnd: function(zoomChanged) {
            if (zoomChanged) {
              this.fire("zoomend");
            }
            return this.fire("moveend");
          },
          _stop: function() {
            cancelAnimFrame(this._flyToFrame);
            if (this._panAnim) {
              this._panAnim.stop();
            }
            return this;
          },
          _rawPanBy: function(offset) {
            setPosition(this._mapPane, this._getMapPanePos().subtract(offset));
          },
          _getZoomSpan: function() {
            return this.getMaxZoom() - this.getMinZoom();
          },
          _panInsideMaxBounds: function() {
            if (!this._enforcingBounds) {
              this.panInsideBounds(this.options.maxBounds);
            }
          },
          _checkIfLoaded: function() {
            if (!this._loaded) {
              throw new Error("Set map center and zoom first.");
            }
          },
          // DOM event handling
          // @section Interaction events
          _initEvents: function(remove3) {
            this._targets = {};
            this._targets[stamp(this._container)] = this;
            var onOff = remove3 ? off : on;
            onOff(this._container, "click dblclick mousedown mouseup mouseover mouseout mousemove contextmenu keypress keydown keyup", this._handleDOMEvent, this);
            if (this.options.trackResize) {
              onOff(window, "resize", this._onResize, this);
            }
            if (Browser.any3d && this.options.transform3DLimit) {
              (remove3 ? this.off : this.on).call(this, "moveend", this._onMoveEnd);
            }
          },
          _onResize: function() {
            cancelAnimFrame(this._resizeRequest);
            this._resizeRequest = requestAnimFrame(
              function() {
                this.invalidateSize({ debounceMoveend: true });
              },
              this
            );
          },
          _onScroll: function() {
            this._container.scrollTop = 0;
            this._container.scrollLeft = 0;
          },
          _onMoveEnd: function() {
            var pos = this._getMapPanePos();
            if (Math.max(Math.abs(pos.x), Math.abs(pos.y)) >= this.options.transform3DLimit) {
              this._resetView(this.getCenter(), this.getZoom());
            }
          },
          _findEventTargets: function(e, type) {
            var targets = [], target, isHover = type === "mouseout" || type === "mouseover", src = e.target || e.srcElement, dragging = false;
            while (src) {
              target = this._targets[stamp(src)];
              if (target && (type === "click" || type === "preclick") && this._draggableMoved(target)) {
                dragging = true;
                break;
              }
              if (target && target.listens(type, true)) {
                if (isHover && !isExternalTarget(src, e)) {
                  break;
                }
                targets.push(target);
                if (isHover) {
                  break;
                }
              }
              if (src === this._container) {
                break;
              }
              src = src.parentNode;
            }
            if (!targets.length && !dragging && !isHover && this.listens(type, true)) {
              targets = [this];
            }
            return targets;
          },
          _isClickDisabled: function(el) {
            while (el && el !== this._container) {
              if (el["_leaflet_disable_click"]) {
                return true;
              }
              el = el.parentNode;
            }
          },
          _handleDOMEvent: function(e) {
            var el = e.target || e.srcElement;
            if (!this._loaded || el["_leaflet_disable_events"] || e.type === "click" && this._isClickDisabled(el)) {
              return;
            }
            var type = e.type;
            if (type === "mousedown") {
              preventOutline(el);
            }
            this._fireDOMEvent(e, type);
          },
          _mouseEvents: ["click", "dblclick", "mouseover", "mouseout", "contextmenu"],
          _fireDOMEvent: function(e, type, canvasTargets) {
            if (e.type === "click") {
              var synth = extend2({}, e);
              synth.type = "preclick";
              this._fireDOMEvent(synth, synth.type, canvasTargets);
            }
            var targets = this._findEventTargets(e, type);
            if (canvasTargets) {
              var filtered = [];
              for (var i = 0; i < canvasTargets.length; i++) {
                if (canvasTargets[i].listens(type, true)) {
                  filtered.push(canvasTargets[i]);
                }
              }
              targets = filtered.concat(targets);
            }
            if (!targets.length) {
              return;
            }
            if (type === "contextmenu") {
              preventDefault(e);
            }
            var target = targets[0];
            var data = {
              originalEvent: e
            };
            if (e.type !== "keypress" && e.type !== "keydown" && e.type !== "keyup") {
              var isMarker = target.getLatLng && (!target._radius || target._radius <= 10);
              data.containerPoint = isMarker ? this.latLngToContainerPoint(target.getLatLng()) : this.mouseEventToContainerPoint(e);
              data.layerPoint = this.containerPointToLayerPoint(data.containerPoint);
              data.latlng = isMarker ? target.getLatLng() : this.layerPointToLatLng(data.layerPoint);
            }
            for (i = 0; i < targets.length; i++) {
              targets[i].fire(type, data, true);
              if (data.originalEvent._stopped || targets[i].options.bubblingMouseEvents === false && indexOf(this._mouseEvents, type) !== -1) {
                return;
              }
            }
          },
          _draggableMoved: function(obj) {
            obj = obj.dragging && obj.dragging.enabled() ? obj : this;
            return obj.dragging && obj.dragging.moved() || this.boxZoom && this.boxZoom.moved();
          },
          _clearHandlers: function() {
            for (var i = 0, len = this._handlers.length; i < len; i++) {
              this._handlers[i].disable();
            }
          },
          // @section Other Methods
          // @method whenReady(fn: Function, context?: Object): this
          // Runs the given function `fn` when the map gets initialized with
          // a view (center and zoom) and at least one layer, or immediately
          // if it's already initialized, optionally passing a function context.
          whenReady: function(callback, context) {
            if (this._loaded) {
              callback.call(context || this, { target: this });
            } else {
              this.on("load", callback, context);
            }
            return this;
          },
          // private methods for getting map state
          _getMapPanePos: function() {
            return getPosition(this._mapPane) || new Point(0, 0);
          },
          _moved: function() {
            var pos = this._getMapPanePos();
            return pos && !pos.equals([0, 0]);
          },
          _getTopLeftPoint: function(center, zoom2) {
            var pixelOrigin = center && zoom2 !== void 0 ? this._getNewPixelOrigin(center, zoom2) : this.getPixelOrigin();
            return pixelOrigin.subtract(this._getMapPanePos());
          },
          _getNewPixelOrigin: function(center, zoom2) {
            var viewHalf = this.getSize()._divideBy(2);
            return this.project(center, zoom2)._subtract(viewHalf)._add(this._getMapPanePos())._round();
          },
          _latLngToNewLayerPoint: function(latlng, zoom2, center) {
            var topLeft = this._getNewPixelOrigin(center, zoom2);
            return this.project(latlng, zoom2)._subtract(topLeft);
          },
          _latLngBoundsToNewLayerBounds: function(latLngBounds2, zoom2, center) {
            var topLeft = this._getNewPixelOrigin(center, zoom2);
            return toBounds([
              this.project(latLngBounds2.getSouthWest(), zoom2)._subtract(topLeft),
              this.project(latLngBounds2.getNorthWest(), zoom2)._subtract(topLeft),
              this.project(latLngBounds2.getSouthEast(), zoom2)._subtract(topLeft),
              this.project(latLngBounds2.getNorthEast(), zoom2)._subtract(topLeft)
            ]);
          },
          // layer point of the current center
          _getCenterLayerPoint: function() {
            return this.containerPointToLayerPoint(this.getSize()._divideBy(2));
          },
          // offset of the specified place to the current center in pixels
          _getCenterOffset: function(latlng) {
            return this.latLngToLayerPoint(latlng).subtract(this._getCenterLayerPoint());
          },
          // adjust center for view to get inside bounds
          _limitCenter: function(center, zoom2, bounds) {
            if (!bounds) {
              return center;
            }
            var centerPoint = this.project(center, zoom2), viewHalf = this.getSize().divideBy(2), viewBounds = new Bounds(centerPoint.subtract(viewHalf), centerPoint.add(viewHalf)), offset = this._getBoundsOffset(viewBounds, bounds, zoom2);
            if (Math.abs(offset.x) <= 1 && Math.abs(offset.y) <= 1) {
              return center;
            }
            return this.unproject(centerPoint.add(offset), zoom2);
          },
          // adjust offset for view to get inside bounds
          _limitOffset: function(offset, bounds) {
            if (!bounds) {
              return offset;
            }
            var viewBounds = this.getPixelBounds(), newBounds = new Bounds(viewBounds.min.add(offset), viewBounds.max.add(offset));
            return offset.add(this._getBoundsOffset(newBounds, bounds));
          },
          // returns offset needed for pxBounds to get inside maxBounds at a specified zoom
          _getBoundsOffset: function(pxBounds, maxBounds, zoom2) {
            var projectedMaxBounds = toBounds(
              this.project(maxBounds.getNorthEast(), zoom2),
              this.project(maxBounds.getSouthWest(), zoom2)
            ), minOffset = projectedMaxBounds.min.subtract(pxBounds.min), maxOffset = projectedMaxBounds.max.subtract(pxBounds.max), dx = this._rebound(minOffset.x, -maxOffset.x), dy = this._rebound(minOffset.y, -maxOffset.y);
            return new Point(dx, dy);
          },
          _rebound: function(left, right) {
            return left + right > 0 ? Math.round(left - right) / 2 : Math.max(0, Math.ceil(left)) - Math.max(0, Math.floor(right));
          },
          _limitZoom: function(zoom2) {
            var min = this.getMinZoom(), max = this.getMaxZoom(), snap = Browser.any3d ? this.options.zoomSnap : 1;
            if (snap) {
              zoom2 = Math.round(zoom2 / snap) * snap;
            }
            return Math.max(min, Math.min(max, zoom2));
          },
          _onPanTransitionStep: function() {
            this.fire("move");
          },
          _onPanTransitionEnd: function() {
            removeClass(this._mapPane, "leaflet-pan-anim");
            this.fire("moveend");
          },
          _tryAnimatedPan: function(center, options) {
            var offset = this._getCenterOffset(center)._trunc();
            if ((options && options.animate) !== true && !this.getSize().contains(offset)) {
              return false;
            }
            this.panBy(offset, options);
            return true;
          },
          _createAnimProxy: function() {
            var proxy = this._proxy = create$1("div", "leaflet-proxy leaflet-zoom-animated");
            this._panes.mapPane.appendChild(proxy);
            this.on("zoomanim", function(e) {
              var prop = TRANSFORM, transform2 = this._proxy.style[prop];
              setTransform(this._proxy, this.project(e.center, e.zoom), this.getZoomScale(e.zoom, 1));
              if (transform2 === this._proxy.style[prop] && this._animatingZoom) {
                this._onZoomTransitionEnd();
              }
            }, this);
            this.on("load moveend", this._animMoveEnd, this);
            this._on("unload", this._destroyAnimProxy, this);
          },
          _destroyAnimProxy: function() {
            remove2(this._proxy);
            this.off("load moveend", this._animMoveEnd, this);
            delete this._proxy;
          },
          _animMoveEnd: function() {
            var c2 = this.getCenter(), z = this.getZoom();
            setTransform(this._proxy, this.project(c2, z), this.getZoomScale(z, 1));
          },
          _catchTransitionEnd: function(e) {
            if (this._animatingZoom && e.propertyName.indexOf("transform") >= 0) {
              this._onZoomTransitionEnd();
            }
          },
          _nothingToAnimate: function() {
            return !this._container.getElementsByClassName("leaflet-zoom-animated").length;
          },
          _tryAnimatedZoom: function(center, zoom2, options) {
            if (this._animatingZoom) {
              return true;
            }
            options = options || {};
            if (!this._zoomAnimated || options.animate === false || this._nothingToAnimate() || Math.abs(zoom2 - this._zoom) > this.options.zoomAnimationThreshold) {
              return false;
            }
            var scale2 = this.getZoomScale(zoom2), offset = this._getCenterOffset(center)._divideBy(1 - 1 / scale2);
            if (options.animate !== true && !this.getSize().contains(offset)) {
              return false;
            }
            requestAnimFrame(function() {
              this._moveStart(true, options.noMoveStart || false)._animateZoom(center, zoom2, true);
            }, this);
            return true;
          },
          _animateZoom: function(center, zoom2, startAnim, noUpdate) {
            if (!this._mapPane) {
              return;
            }
            if (startAnim) {
              this._animatingZoom = true;
              this._animateToCenter = center;
              this._animateToZoom = zoom2;
              addClass(this._mapPane, "leaflet-zoom-anim");
            }
            this.fire("zoomanim", {
              center,
              zoom: zoom2,
              noUpdate
            });
            if (!this._tempFireZoomEvent) {
              this._tempFireZoomEvent = this._zoom !== this._animateToZoom;
            }
            this._move(this._animateToCenter, this._animateToZoom, void 0, true);
            setTimeout(bind(this._onZoomTransitionEnd, this), 250);
          },
          _onZoomTransitionEnd: function() {
            if (!this._animatingZoom) {
              return;
            }
            if (this._mapPane) {
              removeClass(this._mapPane, "leaflet-zoom-anim");
            }
            this._animatingZoom = false;
            this._move(this._animateToCenter, this._animateToZoom, void 0, true);
            if (this._tempFireZoomEvent) {
              this.fire("zoom");
            }
            delete this._tempFireZoomEvent;
            this.fire("move");
            this._moveEnd(true);
          }
        });
        function createMap(id2, options) {
          return new Map2(id2, options);
        }
        var Control = Class.extend({
          // @section
          // @aka Control Options
          options: {
            // @option position: String = 'topright'
            // The position of the control (one of the map corners). Possible values are `'topleft'`,
            // `'topright'`, `'bottomleft'` or `'bottomright'`
            position: "topright"
          },
          initialize: function(options) {
            setOptions(this, options);
          },
          /* @section
           * Classes extending L.Control will inherit the following methods:
           *
           * @method getPosition: string
           * Returns the position of the control.
           */
          getPosition: function() {
            return this.options.position;
          },
          // @method setPosition(position: string): this
          // Sets the position of the control.
          setPosition: function(position) {
            var map2 = this._map;
            if (map2) {
              map2.removeControl(this);
            }
            this.options.position = position;
            if (map2) {
              map2.addControl(this);
            }
            return this;
          },
          // @method getContainer: HTMLElement
          // Returns the HTMLElement that contains the control.
          getContainer: function() {
            return this._container;
          },
          // @method addTo(map: Map): this
          // Adds the control to the given map.
          addTo: function(map2) {
            this.remove();
            this._map = map2;
            var container = this._container = this.onAdd(map2), pos = this.getPosition(), corner = map2._controlCorners[pos];
            addClass(container, "leaflet-control");
            if (pos.indexOf("bottom") !== -1) {
              corner.insertBefore(container, corner.firstChild);
            } else {
              corner.appendChild(container);
            }
            this._map.on("unload", this.remove, this);
            return this;
          },
          // @method remove: this
          // Removes the control from the map it is currently active on.
          remove: function() {
            if (!this._map) {
              return this;
            }
            remove2(this._container);
            if (this.onRemove) {
              this.onRemove(this._map);
            }
            this._map.off("unload", this.remove, this);
            this._map = null;
            return this;
          },
          _refocusOnMap: function(e) {
            if (this._map && e && e.screenX > 0 && e.screenY > 0) {
              this._map.getContainer().focus();
            }
          }
        });
        var control = function(options) {
          return new Control(options);
        };
        Map2.include({
          // @method addControl(control: Control): this
          // Adds the given control to the map
          addControl: function(control2) {
            control2.addTo(this);
            return this;
          },
          // @method removeControl(control: Control): this
          // Removes the given control from the map
          removeControl: function(control2) {
            control2.remove();
            return this;
          },
          _initControlPos: function() {
            var corners = this._controlCorners = {}, l = "leaflet-", container = this._controlContainer = create$1("div", l + "control-container", this._container);
            function createCorner(vSide, hSide) {
              var className = l + vSide + " " + l + hSide;
              corners[vSide + hSide] = create$1("div", className, container);
            }
            createCorner("top", "left");
            createCorner("top", "right");
            createCorner("bottom", "left");
            createCorner("bottom", "right");
          },
          _clearControlPos: function() {
            for (var i in this._controlCorners) {
              remove2(this._controlCorners[i]);
            }
            remove2(this._controlContainer);
            delete this._controlCorners;
            delete this._controlContainer;
          }
        });
        var Layers = Control.extend({
          // @section
          // @aka Control.Layers options
          options: {
            // @option collapsed: Boolean = true
            // If `true`, the control will be collapsed into an icon and expanded on mouse hover, touch, or keyboard activation.
            collapsed: true,
            position: "topright",
            // @option autoZIndex: Boolean = true
            // If `true`, the control will assign zIndexes in increasing order to all of its layers so that the order is preserved when switching them on/off.
            autoZIndex: true,
            // @option hideSingleBase: Boolean = false
            // If `true`, the base layers in the control will be hidden when there is only one.
            hideSingleBase: false,
            // @option sortLayers: Boolean = false
            // Whether to sort the layers. When `false`, layers will keep the order
            // in which they were added to the control.
            sortLayers: false,
            // @option sortFunction: Function = *
            // A [compare function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)
            // that will be used for sorting the layers, when `sortLayers` is `true`.
            // The function receives both the `L.Layer` instances and their names, as in
            // `sortFunction(layerA, layerB, nameA, nameB)`.
            // By default, it sorts layers alphabetically by their name.
            sortFunction: function(layerA, layerB, nameA, nameB) {
              return nameA < nameB ? -1 : nameB < nameA ? 1 : 0;
            }
          },
          initialize: function(baseLayers, overlays, options) {
            setOptions(this, options);
            this._layerControlInputs = [];
            this._layers = [];
            this._lastZIndex = 0;
            this._handlingClick = false;
            this._preventClick = false;
            for (var i in baseLayers) {
              this._addLayer(baseLayers[i], i);
            }
            for (i in overlays) {
              this._addLayer(overlays[i], i, true);
            }
          },
          onAdd: function(map2) {
            this._initLayout();
            this._update();
            this._map = map2;
            map2.on("zoomend", this._checkDisabledLayers, this);
            for (var i = 0; i < this._layers.length; i++) {
              this._layers[i].layer.on("add remove", this._onLayerChange, this);
            }
            return this._container;
          },
          addTo: function(map2) {
            Control.prototype.addTo.call(this, map2);
            return this._expandIfNotCollapsed();
          },
          onRemove: function() {
            this._map.off("zoomend", this._checkDisabledLayers, this);
            for (var i = 0; i < this._layers.length; i++) {
              this._layers[i].layer.off("add remove", this._onLayerChange, this);
            }
          },
          // @method addBaseLayer(layer: Layer, name: String): this
          // Adds a base layer (radio button entry) with the given name to the control.
          addBaseLayer: function(layer, name) {
            this._addLayer(layer, name);
            return this._map ? this._update() : this;
          },
          // @method addOverlay(layer: Layer, name: String): this
          // Adds an overlay (checkbox entry) with the given name to the control.
          addOverlay: function(layer, name) {
            this._addLayer(layer, name, true);
            return this._map ? this._update() : this;
          },
          // @method removeLayer(layer: Layer): this
          // Remove the given layer from the control.
          removeLayer: function(layer) {
            layer.off("add remove", this._onLayerChange, this);
            var obj = this._getLayer(stamp(layer));
            if (obj) {
              this._layers.splice(this._layers.indexOf(obj), 1);
            }
            return this._map ? this._update() : this;
          },
          // @method expand(): this
          // Expand the control container if collapsed.
          expand: function() {
            addClass(this._container, "leaflet-control-layers-expanded");
            this._section.style.height = null;
            var acceptableHeight = this._map.getSize().y - (this._container.offsetTop + 50);
            if (acceptableHeight < this._section.clientHeight) {
              addClass(this._section, "leaflet-control-layers-scrollbar");
              this._section.style.height = acceptableHeight + "px";
            } else {
              removeClass(this._section, "leaflet-control-layers-scrollbar");
            }
            this._checkDisabledLayers();
            return this;
          },
          // @method collapse(): this
          // Collapse the control container if expanded.
          collapse: function() {
            removeClass(this._container, "leaflet-control-layers-expanded");
            return this;
          },
          _initLayout: function() {
            var className = "leaflet-control-layers", container = this._container = create$1("div", className), collapsed = this.options.collapsed;
            container.setAttribute("aria-haspopup", true);
            disableClickPropagation(container);
            disableScrollPropagation(container);
            var section = this._section = create$1("section", className + "-list");
            if (collapsed) {
              this._map.on("click", this.collapse, this);
              on(container, {
                mouseenter: this._expandSafely,
                mouseleave: this.collapse
              }, this);
            }
            var link = this._layersLink = create$1("a", className + "-toggle", container);
            link.href = "#";
            link.title = "Layers";
            link.setAttribute("role", "button");
            on(link, {
              keydown: function(e) {
                if (e.keyCode === 13) {
                  this._expandSafely();
                }
              },
              // Certain screen readers intercept the key event and instead send a click event
              click: function(e) {
                preventDefault(e);
                this._expandSafely();
              }
            }, this);
            if (!collapsed) {
              this.expand();
            }
            this._baseLayersList = create$1("div", className + "-base", section);
            this._separator = create$1("div", className + "-separator", section);
            this._overlaysList = create$1("div", className + "-overlays", section);
            container.appendChild(section);
          },
          _getLayer: function(id2) {
            for (var i = 0; i < this._layers.length; i++) {
              if (this._layers[i] && stamp(this._layers[i].layer) === id2) {
                return this._layers[i];
              }
            }
          },
          _addLayer: function(layer, name, overlay) {
            if (this._map) {
              layer.on("add remove", this._onLayerChange, this);
            }
            this._layers.push({
              layer,
              name,
              overlay
            });
            if (this.options.sortLayers) {
              this._layers.sort(bind(function(a2, b) {
                return this.options.sortFunction(a2.layer, b.layer, a2.name, b.name);
              }, this));
            }
            if (this.options.autoZIndex && layer.setZIndex) {
              this._lastZIndex++;
              layer.setZIndex(this._lastZIndex);
            }
            this._expandIfNotCollapsed();
          },
          _update: function() {
            if (!this._container) {
              return this;
            }
            empty2(this._baseLayersList);
            empty2(this._overlaysList);
            this._layerControlInputs = [];
            var baseLayersPresent, overlaysPresent, i, obj, baseLayersCount = 0;
            for (i = 0; i < this._layers.length; i++) {
              obj = this._layers[i];
              this._addItem(obj);
              overlaysPresent = overlaysPresent || obj.overlay;
              baseLayersPresent = baseLayersPresent || !obj.overlay;
              baseLayersCount += !obj.overlay ? 1 : 0;
            }
            if (this.options.hideSingleBase) {
              baseLayersPresent = baseLayersPresent && baseLayersCount > 1;
              this._baseLayersList.style.display = baseLayersPresent ? "" : "none";
            }
            this._separator.style.display = overlaysPresent && baseLayersPresent ? "" : "none";
            return this;
          },
          _onLayerChange: function(e) {
            if (!this._handlingClick) {
              this._update();
            }
            var obj = this._getLayer(stamp(e.target));
            var type = obj.overlay ? e.type === "add" ? "overlayadd" : "overlayremove" : e.type === "add" ? "baselayerchange" : null;
            if (type) {
              this._map.fire(type, obj);
            }
          },
          // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see https://stackoverflow.com/a/119079)
          _createRadioElement: function(name, checked) {
            var radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="' + name + '"' + (checked ? ' checked="checked"' : "") + "/>";
            var radioFragment = document.createElement("div");
            radioFragment.innerHTML = radioHtml;
            return radioFragment.firstChild;
          },
          _addItem: function(obj) {
            var label = document.createElement("label"), checked = this._map.hasLayer(obj.layer), input;
            if (obj.overlay) {
              input = document.createElement("input");
              input.type = "checkbox";
              input.className = "leaflet-control-layers-selector";
              input.defaultChecked = checked;
            } else {
              input = this._createRadioElement("leaflet-base-layers_" + stamp(this), checked);
            }
            this._layerControlInputs.push(input);
            input.layerId = stamp(obj.layer);
            on(input, "click", this._onInputClick, this);
            var name = document.createElement("span");
            name.innerHTML = " " + obj.name;
            var holder = document.createElement("span");
            label.appendChild(holder);
            holder.appendChild(input);
            holder.appendChild(name);
            var container = obj.overlay ? this._overlaysList : this._baseLayersList;
            container.appendChild(label);
            this._checkDisabledLayers();
            return label;
          },
          _onInputClick: function() {
            if (this._preventClick) {
              return;
            }
            var inputs = this._layerControlInputs, input, layer;
            var addedLayers = [], removedLayers = [];
            this._handlingClick = true;
            for (var i = inputs.length - 1; i >= 0; i--) {
              input = inputs[i];
              layer = this._getLayer(input.layerId).layer;
              if (input.checked) {
                addedLayers.push(layer);
              } else if (!input.checked) {
                removedLayers.push(layer);
              }
            }
            for (i = 0; i < removedLayers.length; i++) {
              if (this._map.hasLayer(removedLayers[i])) {
                this._map.removeLayer(removedLayers[i]);
              }
            }
            for (i = 0; i < addedLayers.length; i++) {
              if (!this._map.hasLayer(addedLayers[i])) {
                this._map.addLayer(addedLayers[i]);
              }
            }
            this._handlingClick = false;
            this._refocusOnMap();
          },
          _checkDisabledLayers: function() {
            var inputs = this._layerControlInputs, input, layer, zoom2 = this._map.getZoom();
            for (var i = inputs.length - 1; i >= 0; i--) {
              input = inputs[i];
              layer = this._getLayer(input.layerId).layer;
              input.disabled = layer.options.minZoom !== void 0 && zoom2 < layer.options.minZoom || layer.options.maxZoom !== void 0 && zoom2 > layer.options.maxZoom;
            }
          },
          _expandIfNotCollapsed: function() {
            if (this._map && !this.options.collapsed) {
              this.expand();
            }
            return this;
          },
          _expandSafely: function() {
            var section = this._section;
            this._preventClick = true;
            on(section, "click", preventDefault);
            this.expand();
            var that = this;
            setTimeout(function() {
              off(section, "click", preventDefault);
              that._preventClick = false;
            });
          }
        });
        var layers = function(baseLayers, overlays, options) {
          return new Layers(baseLayers, overlays, options);
        };
        var Zoom = Control.extend({
          // @section
          // @aka Control.Zoom options
          options: {
            position: "topleft",
            // @option zoomInText: String = '<span aria-hidden="true">+</span>'
            // The text set on the 'zoom in' button.
            zoomInText: '<span aria-hidden="true">+</span>',
            // @option zoomInTitle: String = 'Zoom in'
            // The title set on the 'zoom in' button.
            zoomInTitle: "Zoom in",
            // @option zoomOutText: String = '<span aria-hidden="true">&#x2212;</span>'
            // The text set on the 'zoom out' button.
            zoomOutText: '<span aria-hidden="true">&#x2212;</span>',
            // @option zoomOutTitle: String = 'Zoom out'
            // The title set on the 'zoom out' button.
            zoomOutTitle: "Zoom out"
          },
          onAdd: function(map2) {
            var zoomName = "leaflet-control-zoom", container = create$1("div", zoomName + " leaflet-bar"), options = this.options;
            this._zoomInButton = this._createButton(
              options.zoomInText,
              options.zoomInTitle,
              zoomName + "-in",
              container,
              this._zoomIn
            );
            this._zoomOutButton = this._createButton(
              options.zoomOutText,
              options.zoomOutTitle,
              zoomName + "-out",
              container,
              this._zoomOut
            );
            this._updateDisabled();
            map2.on("zoomend zoomlevelschange", this._updateDisabled, this);
            return container;
          },
          onRemove: function(map2) {
            map2.off("zoomend zoomlevelschange", this._updateDisabled, this);
          },
          disable: function() {
            this._disabled = true;
            this._updateDisabled();
            return this;
          },
          enable: function() {
            this._disabled = false;
            this._updateDisabled();
            return this;
          },
          _zoomIn: function(e) {
            if (!this._disabled && this._map._zoom < this._map.getMaxZoom()) {
              this._map.zoomIn(this._map.options.zoomDelta * (e.shiftKey ? 3 : 1));
            }
          },
          _zoomOut: function(e) {
            if (!this._disabled && this._map._zoom > this._map.getMinZoom()) {
              this._map.zoomOut(this._map.options.zoomDelta * (e.shiftKey ? 3 : 1));
            }
          },
          _createButton: function(html, title, className, container, fn) {
            var link = create$1("a", className, container);
            link.innerHTML = html;
            link.href = "#";
            link.title = title;
            link.setAttribute("role", "button");
            link.setAttribute("aria-label", title);
            disableClickPropagation(link);
            on(link, "click", stop);
            on(link, "click", fn, this);
            on(link, "click", this._refocusOnMap, this);
            return link;
          },
          _updateDisabled: function() {
            var map2 = this._map, className = "leaflet-disabled";
            removeClass(this._zoomInButton, className);
            removeClass(this._zoomOutButton, className);
            this._zoomInButton.setAttribute("aria-disabled", "false");
            this._zoomOutButton.setAttribute("aria-disabled", "false");
            if (this._disabled || map2._zoom === map2.getMinZoom()) {
              addClass(this._zoomOutButton, className);
              this._zoomOutButton.setAttribute("aria-disabled", "true");
            }
            if (this._disabled || map2._zoom === map2.getMaxZoom()) {
              addClass(this._zoomInButton, className);
              this._zoomInButton.setAttribute("aria-disabled", "true");
            }
          }
        });
        Map2.mergeOptions({
          zoomControl: true
        });
        Map2.addInitHook(function() {
          if (this.options.zoomControl) {
            this.zoomControl = new Zoom();
            this.addControl(this.zoomControl);
          }
        });
        var zoom = function(options) {
          return new Zoom(options);
        };
        var Scale = Control.extend({
          // @section
          // @aka Control.Scale options
          options: {
            position: "bottomleft",
            // @option maxWidth: Number = 100
            // Maximum width of the control in pixels. The width is set dynamically to show round values (e.g. 100, 200, 500).
            maxWidth: 100,
            // @option metric: Boolean = True
            // Whether to show the metric scale line (m/km).
            metric: true,
            // @option imperial: Boolean = True
            // Whether to show the imperial scale line (mi/ft).
            imperial: true
            // @option updateWhenIdle: Boolean = false
            // If `true`, the control is updated on [`moveend`](#map-moveend), otherwise it's always up-to-date (updated on [`move`](#map-move)).
          },
          onAdd: function(map2) {
            var className = "leaflet-control-scale", container = create$1("div", className), options = this.options;
            this._addScales(options, className + "-line", container);
            map2.on(options.updateWhenIdle ? "moveend" : "move", this._update, this);
            map2.whenReady(this._update, this);
            return container;
          },
          onRemove: function(map2) {
            map2.off(this.options.updateWhenIdle ? "moveend" : "move", this._update, this);
          },
          _addScales: function(options, className, container) {
            if (options.metric) {
              this._mScale = create$1("div", className, container);
            }
            if (options.imperial) {
              this._iScale = create$1("div", className, container);
            }
          },
          _update: function() {
            var map2 = this._map, y3 = map2.getSize().y / 2;
            var maxMeters = map2.distance(
              map2.containerPointToLatLng([0, y3]),
              map2.containerPointToLatLng([this.options.maxWidth, y3])
            );
            this._updateScales(maxMeters);
          },
          _updateScales: function(maxMeters) {
            if (this.options.metric && maxMeters) {
              this._updateMetric(maxMeters);
            }
            if (this.options.imperial && maxMeters) {
              this._updateImperial(maxMeters);
            }
          },
          _updateMetric: function(maxMeters) {
            var meters = this._getRoundNum(maxMeters), label = meters < 1e3 ? meters + " m" : meters / 1e3 + " km";
            this._updateScale(this._mScale, label, meters / maxMeters);
          },
          _updateImperial: function(maxMeters) {
            var maxFeet = maxMeters * 3.2808399, maxMiles, miles, feet;
            if (maxFeet > 5280) {
              maxMiles = maxFeet / 5280;
              miles = this._getRoundNum(maxMiles);
              this._updateScale(this._iScale, miles + " mi", miles / maxMiles);
            } else {
              feet = this._getRoundNum(maxFeet);
              this._updateScale(this._iScale, feet + " ft", feet / maxFeet);
            }
          },
          _updateScale: function(scale2, text, ratio) {
            scale2.style.width = Math.round(this.options.maxWidth * ratio) + "px";
            scale2.innerHTML = text;
          },
          _getRoundNum: function(num) {
            var pow10 = Math.pow(10, (Math.floor(num) + "").length - 1), d = num / pow10;
            d = d >= 10 ? 10 : d >= 5 ? 5 : d >= 3 ? 3 : d >= 2 ? 2 : 1;
            return pow10 * d;
          }
        });
        var scale = function(options) {
          return new Scale(options);
        };
        var ukrainianFlag = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" class="leaflet-attribution-flag"><path fill="#4C7BE1" d="M0 0h12v4H0z"/><path fill="#FFD500" d="M0 4h12v3H0z"/><path fill="#E0BC00" d="M0 7h12v1H0z"/></svg>';
        var Attribution = Control.extend({
          // @section
          // @aka Control.Attribution options
          options: {
            position: "bottomright",
            // @option prefix: String|false = 'Leaflet'
            // The HTML text shown before the attributions. Pass `false` to disable.
            prefix: '<a href="https://leafletjs.com" title="A JavaScript library for interactive maps">' + (Browser.inlineSvg ? ukrainianFlag + " " : "") + "Leaflet</a>"
          },
          initialize: function(options) {
            setOptions(this, options);
            this._attributions = {};
          },
          onAdd: function(map2) {
            map2.attributionControl = this;
            this._container = create$1("div", "leaflet-control-attribution");
            disableClickPropagation(this._container);
            for (var i in map2._layers) {
              if (map2._layers[i].getAttribution) {
                this.addAttribution(map2._layers[i].getAttribution());
              }
            }
            this._update();
            map2.on("layeradd", this._addAttribution, this);
            return this._container;
          },
          onRemove: function(map2) {
            map2.off("layeradd", this._addAttribution, this);
          },
          _addAttribution: function(ev) {
            if (ev.layer.getAttribution) {
              this.addAttribution(ev.layer.getAttribution());
              ev.layer.once("remove", function() {
                this.removeAttribution(ev.layer.getAttribution());
              }, this);
            }
          },
          // @method setPrefix(prefix: String|false): this
          // The HTML text shown before the attributions. Pass `false` to disable.
          setPrefix: function(prefix) {
            this.options.prefix = prefix;
            this._update();
            return this;
          },
          // @method addAttribution(text: String): this
          // Adds an attribution text (e.g. `'&copy; OpenStreetMap contributors'`).
          addAttribution: function(text) {
            if (!text) {
              return this;
            }
            if (!this._attributions[text]) {
              this._attributions[text] = 0;
            }
            this._attributions[text]++;
            this._update();
            return this;
          },
          // @method removeAttribution(text: String): this
          // Removes an attribution text.
          removeAttribution: function(text) {
            if (!text) {
              return this;
            }
            if (this._attributions[text]) {
              this._attributions[text]--;
              this._update();
            }
            return this;
          },
          _update: function() {
            if (!this._map) {
              return;
            }
            var attribs = [];
            for (var i in this._attributions) {
              if (this._attributions[i]) {
                attribs.push(i);
              }
            }
            var prefixAndAttribs = [];
            if (this.options.prefix) {
              prefixAndAttribs.push(this.options.prefix);
            }
            if (attribs.length) {
              prefixAndAttribs.push(attribs.join(", "));
            }
            this._container.innerHTML = prefixAndAttribs.join(' <span aria-hidden="true">|</span> ');
          }
        });
        Map2.mergeOptions({
          attributionControl: true
        });
        Map2.addInitHook(function() {
          if (this.options.attributionControl) {
            new Attribution().addTo(this);
          }
        });
        var attribution = function(options) {
          return new Attribution(options);
        };
        Control.Layers = Layers;
        Control.Zoom = Zoom;
        Control.Scale = Scale;
        Control.Attribution = Attribution;
        control.layers = layers;
        control.zoom = zoom;
        control.scale = scale;
        control.attribution = attribution;
        var Handler = Class.extend({
          initialize: function(map2) {
            this._map = map2;
          },
          // @method enable(): this
          // Enables the handler
          enable: function() {
            if (this._enabled) {
              return this;
            }
            this._enabled = true;
            this.addHooks();
            return this;
          },
          // @method disable(): this
          // Disables the handler
          disable: function() {
            if (!this._enabled) {
              return this;
            }
            this._enabled = false;
            this.removeHooks();
            return this;
          },
          // @method enabled(): Boolean
          // Returns `true` if the handler is enabled
          enabled: function() {
            return !!this._enabled;
          }
          // @section Extension methods
          // Classes inheriting from `Handler` must implement the two following methods:
          // @method addHooks()
          // Called when the handler is enabled, should add event hooks.
          // @method removeHooks()
          // Called when the handler is disabled, should remove the event hooks added previously.
        });
        Handler.addTo = function(map2, name) {
          map2.addHandler(name, this);
          return this;
        };
        var Mixin = { Events };
        var START = Browser.touch ? "touchstart mousedown" : "mousedown";
        var Draggable = Evented.extend({
          options: {
            // @section
            // @aka Draggable options
            // @option clickTolerance: Number = 3
            // The max number of pixels a user can shift the mouse pointer during a click
            // for it to be considered a valid click (as opposed to a mouse drag).
            clickTolerance: 3
          },
          // @constructor L.Draggable(el: HTMLElement, dragHandle?: HTMLElement, preventOutline?: Boolean, options?: Draggable options)
          // Creates a `Draggable` object for moving `el` when you start dragging the `dragHandle` element (equals `el` itself by default).
          initialize: function(element, dragStartTarget, preventOutline2, options) {
            setOptions(this, options);
            this._element = element;
            this._dragStartTarget = dragStartTarget || element;
            this._preventOutline = preventOutline2;
          },
          // @method enable()
          // Enables the dragging ability
          enable: function() {
            if (this._enabled) {
              return;
            }
            on(this._dragStartTarget, START, this._onDown, this);
            this._enabled = true;
          },
          // @method disable()
          // Disables the dragging ability
          disable: function() {
            if (!this._enabled) {
              return;
            }
            if (Draggable._dragging === this) {
              this.finishDrag(true);
            }
            off(this._dragStartTarget, START, this._onDown, this);
            this._enabled = false;
            this._moved = false;
          },
          _onDown: function(e) {
            if (!this._enabled) {
              return;
            }
            this._moved = false;
            if (hasClass(this._element, "leaflet-zoom-anim")) {
              return;
            }
            if (e.touches && e.touches.length !== 1) {
              if (Draggable._dragging === this) {
                this.finishDrag();
              }
              return;
            }
            if (Draggable._dragging || e.shiftKey || e.which !== 1 && e.button !== 1 && !e.touches) {
              return;
            }
            Draggable._dragging = this;
            if (this._preventOutline) {
              preventOutline(this._element);
            }
            disableImageDrag();
            disableTextSelection();
            if (this._moving) {
              return;
            }
            this.fire("down");
            var first = e.touches ? e.touches[0] : e, sizedParent = getSizedParentNode(this._element);
            this._startPoint = new Point(first.clientX, first.clientY);
            this._startPos = getPosition(this._element);
            this._parentScale = getScale(sizedParent);
            var mouseevent = e.type === "mousedown";
            on(document, mouseevent ? "mousemove" : "touchmove", this._onMove, this);
            on(document, mouseevent ? "mouseup" : "touchend touchcancel", this._onUp, this);
          },
          _onMove: function(e) {
            if (!this._enabled) {
              return;
            }
            if (e.touches && e.touches.length > 1) {
              this._moved = true;
              return;
            }
            var first = e.touches && e.touches.length === 1 ? e.touches[0] : e, offset = new Point(first.clientX, first.clientY)._subtract(this._startPoint);
            if (!offset.x && !offset.y) {
              return;
            }
            if (Math.abs(offset.x) + Math.abs(offset.y) < this.options.clickTolerance) {
              return;
            }
            offset.x /= this._parentScale.x;
            offset.y /= this._parentScale.y;
            preventDefault(e);
            if (!this._moved) {
              this.fire("dragstart");
              this._moved = true;
              addClass(document.body, "leaflet-dragging");
              this._lastTarget = e.target || e.srcElement;
              if (window.SVGElementInstance && this._lastTarget instanceof window.SVGElementInstance) {
                this._lastTarget = this._lastTarget.correspondingUseElement;
              }
              addClass(this._lastTarget, "leaflet-drag-target");
            }
            this._newPos = this._startPos.add(offset);
            this._moving = true;
            this._lastEvent = e;
            this._updatePosition();
          },
          _updatePosition: function() {
            var e = { originalEvent: this._lastEvent };
            this.fire("predrag", e);
            setPosition(this._element, this._newPos);
            this.fire("drag", e);
          },
          _onUp: function() {
            if (!this._enabled) {
              return;
            }
            this.finishDrag();
          },
          finishDrag: function(noInertia) {
            removeClass(document.body, "leaflet-dragging");
            if (this._lastTarget) {
              removeClass(this._lastTarget, "leaflet-drag-target");
              this._lastTarget = null;
            }
            off(document, "mousemove touchmove", this._onMove, this);
            off(document, "mouseup touchend touchcancel", this._onUp, this);
            enableImageDrag();
            enableTextSelection();
            var fireDragend = this._moved && this._moving;
            this._moving = false;
            Draggable._dragging = false;
            if (fireDragend) {
              this.fire("dragend", {
                noInertia,
                distance: this._newPos.distanceTo(this._startPos)
              });
            }
          }
        });
        function clipPolygon(points, bounds, round) {
          var clippedPoints, edges = [1, 4, 2, 8], i, j, k, a2, b, len, edge2, p;
          for (i = 0, len = points.length; i < len; i++) {
            points[i]._code = _getBitCode(points[i], bounds);
          }
          for (k = 0; k < 4; k++) {
            edge2 = edges[k];
            clippedPoints = [];
            for (i = 0, len = points.length, j = len - 1; i < len; j = i++) {
              a2 = points[i];
              b = points[j];
              if (!(a2._code & edge2)) {
                if (b._code & edge2) {
                  p = _getEdgeIntersection(b, a2, edge2, bounds, round);
                  p._code = _getBitCode(p, bounds);
                  clippedPoints.push(p);
                }
                clippedPoints.push(a2);
              } else if (!(b._code & edge2)) {
                p = _getEdgeIntersection(b, a2, edge2, bounds, round);
                p._code = _getBitCode(p, bounds);
                clippedPoints.push(p);
              }
            }
            points = clippedPoints;
          }
          return points;
        }
        function polygonCenter(latlngs, crs) {
          var i, j, p1, p2, f, area, x3, y3, center;
          if (!latlngs || latlngs.length === 0) {
            throw new Error("latlngs not passed");
          }
          if (!isFlat(latlngs)) {
            console.warn("latlngs are not flat! Only the first ring will be used");
            latlngs = latlngs[0];
          }
          var centroidLatLng = toLatLng([0, 0]);
          var bounds = toLatLngBounds(latlngs);
          var areaBounds = bounds.getNorthWest().distanceTo(bounds.getSouthWest()) * bounds.getNorthEast().distanceTo(bounds.getNorthWest());
          if (areaBounds < 1700) {
            centroidLatLng = centroid(latlngs);
          }
          var len = latlngs.length;
          var points = [];
          for (i = 0; i < len; i++) {
            var latlng = toLatLng(latlngs[i]);
            points.push(crs.project(toLatLng([latlng.lat - centroidLatLng.lat, latlng.lng - centroidLatLng.lng])));
          }
          area = x3 = y3 = 0;
          for (i = 0, j = len - 1; i < len; j = i++) {
            p1 = points[i];
            p2 = points[j];
            f = p1.y * p2.x - p2.y * p1.x;
            x3 += (p1.x + p2.x) * f;
            y3 += (p1.y + p2.y) * f;
            area += f * 3;
          }
          if (area === 0) {
            center = points[0];
          } else {
            center = [x3 / area, y3 / area];
          }
          var latlngCenter = crs.unproject(toPoint(center));
          return toLatLng([latlngCenter.lat + centroidLatLng.lat, latlngCenter.lng + centroidLatLng.lng]);
        }
        function centroid(coords) {
          var latSum = 0;
          var lngSum = 0;
          var len = 0;
          for (var i = 0; i < coords.length; i++) {
            var latlng = toLatLng(coords[i]);
            latSum += latlng.lat;
            lngSum += latlng.lng;
            len++;
          }
          return toLatLng([latSum / len, lngSum / len]);
        }
        var PolyUtil = {
          __proto__: null,
          clipPolygon,
          polygonCenter,
          centroid
        };
        function simplify(points, tolerance) {
          if (!tolerance || !points.length) {
            return points.slice();
          }
          var sqTolerance = tolerance * tolerance;
          points = _reducePoints(points, sqTolerance);
          points = _simplifyDP(points, sqTolerance);
          return points;
        }
        function pointToSegmentDistance(p, p1, p2) {
          return Math.sqrt(_sqClosestPointOnSegment(p, p1, p2, true));
        }
        function closestPointOnSegment(p, p1, p2) {
          return _sqClosestPointOnSegment(p, p1, p2);
        }
        function _simplifyDP(points, sqTolerance) {
          var len = points.length, ArrayConstructor = typeof Uint8Array !== "undefined" ? Uint8Array : Array, markers = new ArrayConstructor(len);
          markers[0] = markers[len - 1] = 1;
          _simplifyDPStep(points, markers, sqTolerance, 0, len - 1);
          var i, newPoints = [];
          for (i = 0; i < len; i++) {
            if (markers[i]) {
              newPoints.push(points[i]);
            }
          }
          return newPoints;
        }
        function _simplifyDPStep(points, markers, sqTolerance, first, last) {
          var maxSqDist = 0, index3, i, sqDist;
          for (i = first + 1; i <= last - 1; i++) {
            sqDist = _sqClosestPointOnSegment(points[i], points[first], points[last], true);
            if (sqDist > maxSqDist) {
              index3 = i;
              maxSqDist = sqDist;
            }
          }
          if (maxSqDist > sqTolerance) {
            markers[index3] = 1;
            _simplifyDPStep(points, markers, sqTolerance, first, index3);
            _simplifyDPStep(points, markers, sqTolerance, index3, last);
          }
        }
        function _reducePoints(points, sqTolerance) {
          var reducedPoints = [points[0]];
          for (var i = 1, prev = 0, len = points.length; i < len; i++) {
            if (_sqDist(points[i], points[prev]) > sqTolerance) {
              reducedPoints.push(points[i]);
              prev = i;
            }
          }
          if (prev < len - 1) {
            reducedPoints.push(points[len - 1]);
          }
          return reducedPoints;
        }
        var _lastCode;
        function clipSegment(a2, b, bounds, useLastCode, round) {
          var codeA = useLastCode ? _lastCode : _getBitCode(a2, bounds), codeB = _getBitCode(b, bounds), codeOut, p, newCode;
          _lastCode = codeB;
          while (true) {
            if (!(codeA | codeB)) {
              return [a2, b];
            }
            if (codeA & codeB) {
              return false;
            }
            codeOut = codeA || codeB;
            p = _getEdgeIntersection(a2, b, codeOut, bounds, round);
            newCode = _getBitCode(p, bounds);
            if (codeOut === codeA) {
              a2 = p;
              codeA = newCode;
            } else {
              b = p;
              codeB = newCode;
            }
          }
        }
        function _getEdgeIntersection(a2, b, code, bounds, round) {
          var dx = b.x - a2.x, dy = b.y - a2.y, min = bounds.min, max = bounds.max, x3, y3;
          if (code & 8) {
            x3 = a2.x + dx * (max.y - a2.y) / dy;
            y3 = max.y;
          } else if (code & 4) {
            x3 = a2.x + dx * (min.y - a2.y) / dy;
            y3 = min.y;
          } else if (code & 2) {
            x3 = max.x;
            y3 = a2.y + dy * (max.x - a2.x) / dx;
          } else if (code & 1) {
            x3 = min.x;
            y3 = a2.y + dy * (min.x - a2.x) / dx;
          }
          return new Point(x3, y3, round);
        }
        function _getBitCode(p, bounds) {
          var code = 0;
          if (p.x < bounds.min.x) {
            code |= 1;
          } else if (p.x > bounds.max.x) {
            code |= 2;
          }
          if (p.y < bounds.min.y) {
            code |= 4;
          } else if (p.y > bounds.max.y) {
            code |= 8;
          }
          return code;
        }
        function _sqDist(p1, p2) {
          var dx = p2.x - p1.x, dy = p2.y - p1.y;
          return dx * dx + dy * dy;
        }
        function _sqClosestPointOnSegment(p, p1, p2, sqDist) {
          var x3 = p1.x, y3 = p1.y, dx = p2.x - x3, dy = p2.y - y3, dot = dx * dx + dy * dy, t;
          if (dot > 0) {
            t = ((p.x - x3) * dx + (p.y - y3) * dy) / dot;
            if (t > 1) {
              x3 = p2.x;
              y3 = p2.y;
            } else if (t > 0) {
              x3 += dx * t;
              y3 += dy * t;
            }
          }
          dx = p.x - x3;
          dy = p.y - y3;
          return sqDist ? dx * dx + dy * dy : new Point(x3, y3);
        }
        function isFlat(latlngs) {
          return !isArray2(latlngs[0]) || typeof latlngs[0][0] !== "object" && typeof latlngs[0][0] !== "undefined";
        }
        function _flat(latlngs) {
          console.warn("Deprecated use of _flat, please use L.LineUtil.isFlat instead.");
          return isFlat(latlngs);
        }
        function polylineCenter(latlngs, crs) {
          var i, halfDist, segDist, dist, p1, p2, ratio, center;
          if (!latlngs || latlngs.length === 0) {
            throw new Error("latlngs not passed");
          }
          if (!isFlat(latlngs)) {
            console.warn("latlngs are not flat! Only the first ring will be used");
            latlngs = latlngs[0];
          }
          var centroidLatLng = toLatLng([0, 0]);
          var bounds = toLatLngBounds(latlngs);
          var areaBounds = bounds.getNorthWest().distanceTo(bounds.getSouthWest()) * bounds.getNorthEast().distanceTo(bounds.getNorthWest());
          if (areaBounds < 1700) {
            centroidLatLng = centroid(latlngs);
          }
          var len = latlngs.length;
          var points = [];
          for (i = 0; i < len; i++) {
            var latlng = toLatLng(latlngs[i]);
            points.push(crs.project(toLatLng([latlng.lat - centroidLatLng.lat, latlng.lng - centroidLatLng.lng])));
          }
          for (i = 0, halfDist = 0; i < len - 1; i++) {
            halfDist += points[i].distanceTo(points[i + 1]) / 2;
          }
          if (halfDist === 0) {
            center = points[0];
          } else {
            for (i = 0, dist = 0; i < len - 1; i++) {
              p1 = points[i];
              p2 = points[i + 1];
              segDist = p1.distanceTo(p2);
              dist += segDist;
              if (dist > halfDist) {
                ratio = (dist - halfDist) / segDist;
                center = [
                  p2.x - ratio * (p2.x - p1.x),
                  p2.y - ratio * (p2.y - p1.y)
                ];
                break;
              }
            }
          }
          var latlngCenter = crs.unproject(toPoint(center));
          return toLatLng([latlngCenter.lat + centroidLatLng.lat, latlngCenter.lng + centroidLatLng.lng]);
        }
        var LineUtil = {
          __proto__: null,
          simplify,
          pointToSegmentDistance,
          closestPointOnSegment,
          clipSegment,
          _getEdgeIntersection,
          _getBitCode,
          _sqClosestPointOnSegment,
          isFlat,
          _flat,
          polylineCenter
        };
        var LonLat = {
          project: function(latlng) {
            return new Point(latlng.lng, latlng.lat);
          },
          unproject: function(point) {
            return new LatLng(point.y, point.x);
          },
          bounds: new Bounds([-180, -90], [180, 90])
        };
        var Mercator = {
          R: 6378137,
          R_MINOR: 6356752314245179e-9,
          bounds: new Bounds([-2003750834279e-5, -1549657073972e-5], [2003750834279e-5, 1876465623138e-5]),
          project: function(latlng) {
            var d = Math.PI / 180, r = this.R, y3 = latlng.lat * d, tmp = this.R_MINOR / r, e = Math.sqrt(1 - tmp * tmp), con = e * Math.sin(y3);
            var ts = Math.tan(Math.PI / 4 - y3 / 2) / Math.pow((1 - con) / (1 + con), e / 2);
            y3 = -r * Math.log(Math.max(ts, 1e-10));
            return new Point(latlng.lng * d * r, y3);
          },
          unproject: function(point) {
            var d = 180 / Math.PI, r = this.R, tmp = this.R_MINOR / r, e = Math.sqrt(1 - tmp * tmp), ts = Math.exp(-point.y / r), phi = Math.PI / 2 - 2 * Math.atan(ts);
            for (var i = 0, dphi = 0.1, con; i < 15 && Math.abs(dphi) > 1e-7; i++) {
              con = e * Math.sin(phi);
              con = Math.pow((1 - con) / (1 + con), e / 2);
              dphi = Math.PI / 2 - 2 * Math.atan(ts * con) - phi;
              phi += dphi;
            }
            return new LatLng(phi * d, point.x * d / r);
          }
        };
        var index2 = {
          __proto__: null,
          LonLat,
          Mercator,
          SphericalMercator
        };
        var EPSG3395 = extend2({}, Earth, {
          code: "EPSG:3395",
          projection: Mercator,
          transformation: (function() {
            var scale2 = 0.5 / (Math.PI * Mercator.R);
            return toTransformation(scale2, 0.5, -scale2, 0.5);
          })()
        });
        var EPSG4326 = extend2({}, Earth, {
          code: "EPSG:4326",
          projection: LonLat,
          transformation: toTransformation(1 / 180, 1, -1 / 180, 0.5)
        });
        var Simple = extend2({}, CRS, {
          projection: LonLat,
          transformation: toTransformation(1, 0, -1, 0),
          scale: function(zoom2) {
            return Math.pow(2, zoom2);
          },
          zoom: function(scale2) {
            return Math.log(scale2) / Math.LN2;
          },
          distance: function(latlng1, latlng2) {
            var dx = latlng2.lng - latlng1.lng, dy = latlng2.lat - latlng1.lat;
            return Math.sqrt(dx * dx + dy * dy);
          },
          infinite: true
        });
        CRS.Earth = Earth;
        CRS.EPSG3395 = EPSG3395;
        CRS.EPSG3857 = EPSG3857;
        CRS.EPSG900913 = EPSG900913;
        CRS.EPSG4326 = EPSG4326;
        CRS.Simple = Simple;
        var Layer = Evented.extend({
          // Classes extending `L.Layer` will inherit the following options:
          options: {
            // @option pane: String = 'overlayPane'
            // By default the layer will be added to the map's [overlay pane](#map-overlaypane). Overriding this option will cause the layer to be placed on another pane by default.
            pane: "overlayPane",
            // @option attribution: String = null
            // String to be shown in the attribution control, e.g. "© OpenStreetMap contributors". It describes the layer data and is often a legal obligation towards copyright holders and tile providers.
            attribution: null,
            bubblingMouseEvents: true
          },
          /* @section
           * Classes extending `L.Layer` will inherit the following methods:
           *
           * @method addTo(map: Map|LayerGroup): this
           * Adds the layer to the given map or layer group.
           */
          addTo: function(map2) {
            map2.addLayer(this);
            return this;
          },
          // @method remove: this
          // Removes the layer from the map it is currently active on.
          remove: function() {
            return this.removeFrom(this._map || this._mapToAdd);
          },
          // @method removeFrom(map: Map): this
          // Removes the layer from the given map
          //
          // @alternative
          // @method removeFrom(group: LayerGroup): this
          // Removes the layer from the given `LayerGroup`
          removeFrom: function(obj) {
            if (obj) {
              obj.removeLayer(this);
            }
            return this;
          },
          // @method getPane(name? : String): HTMLElement
          // Returns the `HTMLElement` representing the named pane on the map. If `name` is omitted, returns the pane for this layer.
          getPane: function(name) {
            return this._map.getPane(name ? this.options[name] || name : this.options.pane);
          },
          addInteractiveTarget: function(targetEl) {
            this._map._targets[stamp(targetEl)] = this;
            return this;
          },
          removeInteractiveTarget: function(targetEl) {
            delete this._map._targets[stamp(targetEl)];
            return this;
          },
          // @method getAttribution: String
          // Used by the `attribution control`, returns the [attribution option](#gridlayer-attribution).
          getAttribution: function() {
            return this.options.attribution;
          },
          _layerAdd: function(e) {
            var map2 = e.target;
            if (!map2.hasLayer(this)) {
              return;
            }
            this._map = map2;
            this._zoomAnimated = map2._zoomAnimated;
            if (this.getEvents) {
              var events = this.getEvents();
              map2.on(events, this);
              this.once("remove", function() {
                map2.off(events, this);
              }, this);
            }
            this.onAdd(map2);
            this.fire("add");
            map2.fire("layeradd", { layer: this });
          }
        });
        Map2.include({
          // @method addLayer(layer: Layer): this
          // Adds the given layer to the map
          addLayer: function(layer) {
            if (!layer._layerAdd) {
              throw new Error("The provided object is not a Layer.");
            }
            var id2 = stamp(layer);
            if (this._layers[id2]) {
              return this;
            }
            this._layers[id2] = layer;
            layer._mapToAdd = this;
            if (layer.beforeAdd) {
              layer.beforeAdd(this);
            }
            this.whenReady(layer._layerAdd, layer);
            return this;
          },
          // @method removeLayer(layer: Layer): this
          // Removes the given layer from the map.
          removeLayer: function(layer) {
            var id2 = stamp(layer);
            if (!this._layers[id2]) {
              return this;
            }
            if (this._loaded) {
              layer.onRemove(this);
            }
            delete this._layers[id2];
            if (this._loaded) {
              this.fire("layerremove", { layer });
              layer.fire("remove");
            }
            layer._map = layer._mapToAdd = null;
            return this;
          },
          // @method hasLayer(layer: Layer): Boolean
          // Returns `true` if the given layer is currently added to the map
          hasLayer: function(layer) {
            return stamp(layer) in this._layers;
          },
          /* @method eachLayer(fn: Function, context?: Object): this
           * Iterates over the layers of the map, optionally specifying context of the iterator function.
           * ```
           * map.eachLayer(function(layer){
           *     layer.bindPopup('Hello');
           * });
           * ```
           */
          eachLayer: function(method, context) {
            for (var i in this._layers) {
              method.call(context, this._layers[i]);
            }
            return this;
          },
          _addLayers: function(layers2) {
            layers2 = layers2 ? isArray2(layers2) ? layers2 : [layers2] : [];
            for (var i = 0, len = layers2.length; i < len; i++) {
              this.addLayer(layers2[i]);
            }
          },
          _addZoomLimit: function(layer) {
            if (!isNaN(layer.options.maxZoom) || !isNaN(layer.options.minZoom)) {
              this._zoomBoundLayers[stamp(layer)] = layer;
              this._updateZoomLevels();
            }
          },
          _removeZoomLimit: function(layer) {
            var id2 = stamp(layer);
            if (this._zoomBoundLayers[id2]) {
              delete this._zoomBoundLayers[id2];
              this._updateZoomLevels();
            }
          },
          _updateZoomLevels: function() {
            var minZoom = Infinity, maxZoom = -Infinity, oldZoomSpan = this._getZoomSpan();
            for (var i in this._zoomBoundLayers) {
              var options = this._zoomBoundLayers[i].options;
              minZoom = options.minZoom === void 0 ? minZoom : Math.min(minZoom, options.minZoom);
              maxZoom = options.maxZoom === void 0 ? maxZoom : Math.max(maxZoom, options.maxZoom);
            }
            this._layersMaxZoom = maxZoom === -Infinity ? void 0 : maxZoom;
            this._layersMinZoom = minZoom === Infinity ? void 0 : minZoom;
            if (oldZoomSpan !== this._getZoomSpan()) {
              this.fire("zoomlevelschange");
            }
            if (this.options.maxZoom === void 0 && this._layersMaxZoom && this.getZoom() > this._layersMaxZoom) {
              this.setZoom(this._layersMaxZoom);
            }
            if (this.options.minZoom === void 0 && this._layersMinZoom && this.getZoom() < this._layersMinZoom) {
              this.setZoom(this._layersMinZoom);
            }
          }
        });
        var LayerGroup = Layer.extend({
          initialize: function(layers2, options) {
            setOptions(this, options);
            this._layers = {};
            var i, len;
            if (layers2) {
              for (i = 0, len = layers2.length; i < len; i++) {
                this.addLayer(layers2[i]);
              }
            }
          },
          // @method addLayer(layer: Layer): this
          // Adds the given layer to the group.
          addLayer: function(layer) {
            var id2 = this.getLayerId(layer);
            this._layers[id2] = layer;
            if (this._map) {
              this._map.addLayer(layer);
            }
            return this;
          },
          // @method removeLayer(layer: Layer): this
          // Removes the given layer from the group.
          // @alternative
          // @method removeLayer(id: Number): this
          // Removes the layer with the given internal ID from the group.
          removeLayer: function(layer) {
            var id2 = layer in this._layers ? layer : this.getLayerId(layer);
            if (this._map && this._layers[id2]) {
              this._map.removeLayer(this._layers[id2]);
            }
            delete this._layers[id2];
            return this;
          },
          // @method hasLayer(layer: Layer): Boolean
          // Returns `true` if the given layer is currently added to the group.
          // @alternative
          // @method hasLayer(id: Number): Boolean
          // Returns `true` if the given internal ID is currently added to the group.
          hasLayer: function(layer) {
            var layerId = typeof layer === "number" ? layer : this.getLayerId(layer);
            return layerId in this._layers;
          },
          // @method clearLayers(): this
          // Removes all the layers from the group.
          clearLayers: function() {
            return this.eachLayer(this.removeLayer, this);
          },
          // @method invoke(methodName: String, …): this
          // Calls `methodName` on every layer contained in this group, passing any
          // additional parameters. Has no effect if the layers contained do not
          // implement `methodName`.
          invoke: function(methodName) {
            var args = Array.prototype.slice.call(arguments, 1), i, layer;
            for (i in this._layers) {
              layer = this._layers[i];
              if (layer[methodName]) {
                layer[methodName].apply(layer, args);
              }
            }
            return this;
          },
          onAdd: function(map2) {
            this.eachLayer(map2.addLayer, map2);
          },
          onRemove: function(map2) {
            this.eachLayer(map2.removeLayer, map2);
          },
          // @method eachLayer(fn: Function, context?: Object): this
          // Iterates over the layers of the group, optionally specifying context of the iterator function.
          // ```js
          // group.eachLayer(function (layer) {
          // 	layer.bindPopup('Hello');
          // });
          // ```
          eachLayer: function(method, context) {
            for (var i in this._layers) {
              method.call(context, this._layers[i]);
            }
            return this;
          },
          // @method getLayer(id: Number): Layer
          // Returns the layer with the given internal ID.
          getLayer: function(id2) {
            return this._layers[id2];
          },
          // @method getLayers(): Layer[]
          // Returns an array of all the layers added to the group.
          getLayers: function() {
            var layers2 = [];
            this.eachLayer(layers2.push, layers2);
            return layers2;
          },
          // @method setZIndex(zIndex: Number): this
          // Calls `setZIndex` on every layer contained in this group, passing the z-index.
          setZIndex: function(zIndex) {
            return this.invoke("setZIndex", zIndex);
          },
          // @method getLayerId(layer: Layer): Number
          // Returns the internal ID for a layer
          getLayerId: function(layer) {
            return stamp(layer);
          }
        });
        var layerGroup = function(layers2, options) {
          return new LayerGroup(layers2, options);
        };
        var FeatureGroup = LayerGroup.extend({
          addLayer: function(layer) {
            if (this.hasLayer(layer)) {
              return this;
            }
            layer.addEventParent(this);
            LayerGroup.prototype.addLayer.call(this, layer);
            return this.fire("layeradd", { layer });
          },
          removeLayer: function(layer) {
            if (!this.hasLayer(layer)) {
              return this;
            }
            if (layer in this._layers) {
              layer = this._layers[layer];
            }
            layer.removeEventParent(this);
            LayerGroup.prototype.removeLayer.call(this, layer);
            return this.fire("layerremove", { layer });
          },
          // @method setStyle(style: Path options): this
          // Sets the given path options to each layer of the group that has a `setStyle` method.
          setStyle: function(style2) {
            return this.invoke("setStyle", style2);
          },
          // @method bringToFront(): this
          // Brings the layer group to the top of all other layers
          bringToFront: function() {
            return this.invoke("bringToFront");
          },
          // @method bringToBack(): this
          // Brings the layer group to the back of all other layers
          bringToBack: function() {
            return this.invoke("bringToBack");
          },
          // @method getBounds(): LatLngBounds
          // Returns the LatLngBounds of the Feature Group (created from bounds and coordinates of its children).
          getBounds: function() {
            var bounds = new LatLngBounds();
            for (var id2 in this._layers) {
              var layer = this._layers[id2];
              bounds.extend(layer.getBounds ? layer.getBounds() : layer.getLatLng());
            }
            return bounds;
          }
        });
        var featureGroup = function(layers2, options) {
          return new FeatureGroup(layers2, options);
        };
        var Icon = Class.extend({
          /* @section
           * @aka Icon options
           *
           * @option iconUrl: String = null
           * **(required)** The URL to the icon image (absolute or relative to your script path).
           *
           * @option iconRetinaUrl: String = null
           * The URL to a retina sized version of the icon image (absolute or relative to your
           * script path). Used for Retina screen devices.
           *
           * @option iconSize: Point = null
           * Size of the icon image in pixels.
           *
           * @option iconAnchor: Point = null
           * The coordinates of the "tip" of the icon (relative to its top left corner). The icon
           * will be aligned so that this point is at the marker's geographical location. Centered
           * by default if size is specified, also can be set in CSS with negative margins.
           *
           * @option popupAnchor: Point = [0, 0]
           * The coordinates of the point from which popups will "open", relative to the icon anchor.
           *
           * @option tooltipAnchor: Point = [0, 0]
           * The coordinates of the point from which tooltips will "open", relative to the icon anchor.
           *
           * @option shadowUrl: String = null
           * The URL to the icon shadow image. If not specified, no shadow image will be created.
           *
           * @option shadowRetinaUrl: String = null
           *
           * @option shadowSize: Point = null
           * Size of the shadow image in pixels.
           *
           * @option shadowAnchor: Point = null
           * The coordinates of the "tip" of the shadow (relative to its top left corner) (the same
           * as iconAnchor if not specified).
           *
           * @option className: String = ''
           * A custom class name to assign to both icon and shadow images. Empty by default.
           */
          options: {
            popupAnchor: [0, 0],
            tooltipAnchor: [0, 0],
            // @option crossOrigin: Boolean|String = false
            // Whether the crossOrigin attribute will be added to the tiles.
            // If a String is provided, all tiles will have their crossOrigin attribute set to the String provided. This is needed if you want to access tile pixel data.
            // Refer to [CORS Settings](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes) for valid String values.
            crossOrigin: false
          },
          initialize: function(options) {
            setOptions(this, options);
          },
          // @method createIcon(oldIcon?: HTMLElement): HTMLElement
          // Called internally when the icon has to be shown, returns a `<img>` HTML element
          // styled according to the options.
          createIcon: function(oldIcon) {
            return this._createIcon("icon", oldIcon);
          },
          // @method createShadow(oldIcon?: HTMLElement): HTMLElement
          // As `createIcon`, but for the shadow beneath it.
          createShadow: function(oldIcon) {
            return this._createIcon("shadow", oldIcon);
          },
          _createIcon: function(name, oldIcon) {
            var src = this._getIconUrl(name);
            if (!src) {
              if (name === "icon") {
                throw new Error("iconUrl not set in Icon options (see the docs).");
              }
              return null;
            }
            var img = this._createImg(src, oldIcon && oldIcon.tagName === "IMG" ? oldIcon : null);
            this._setIconStyles(img, name);
            if (this.options.crossOrigin || this.options.crossOrigin === "") {
              img.crossOrigin = this.options.crossOrigin === true ? "" : this.options.crossOrigin;
            }
            return img;
          },
          _setIconStyles: function(img, name) {
            var options = this.options;
            var sizeOption = options[name + "Size"];
            if (typeof sizeOption === "number") {
              sizeOption = [sizeOption, sizeOption];
            }
            var size = toPoint(sizeOption), anchor = toPoint(name === "shadow" && options.shadowAnchor || options.iconAnchor || size && size.divideBy(2, true));
            img.className = "leaflet-marker-" + name + " " + (options.className || "");
            if (anchor) {
              img.style.marginLeft = -anchor.x + "px";
              img.style.marginTop = -anchor.y + "px";
            }
            if (size) {
              img.style.width = size.x + "px";
              img.style.height = size.y + "px";
            }
          },
          _createImg: function(src, el) {
            el = el || document.createElement("img");
            el.src = src;
            return el;
          },
          _getIconUrl: function(name) {
            return Browser.retina && this.options[name + "RetinaUrl"] || this.options[name + "Url"];
          }
        });
        function icon(options) {
          return new Icon(options);
        }
        var IconDefault = Icon.extend({
          options: {
            iconUrl: "marker-icon.png",
            iconRetinaUrl: "marker-icon-2x.png",
            shadowUrl: "marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            tooltipAnchor: [16, -28],
            shadowSize: [41, 41]
          },
          _getIconUrl: function(name) {
            if (typeof IconDefault.imagePath !== "string") {
              IconDefault.imagePath = this._detectIconPath();
            }
            return (this.options.imagePath || IconDefault.imagePath) + Icon.prototype._getIconUrl.call(this, name);
          },
          _stripUrl: function(path) {
            var strip = function(str, re, idx) {
              var match = re.exec(str);
              return match && match[idx];
            };
            path = strip(path, /^url\((['"])?(.+)\1\)$/, 2);
            return path && strip(path, /^(.*)marker-icon\.png$/, 1);
          },
          _detectIconPath: function() {
            var el = create$1("div", "leaflet-default-icon-path", document.body);
            var path = getStyle(el, "background-image") || getStyle(el, "backgroundImage");
            document.body.removeChild(el);
            path = this._stripUrl(path);
            if (path) {
              return path;
            }
            var link = document.querySelector('link[href$="leaflet.css"]');
            if (!link) {
              return "";
            }
            return link.href.substring(0, link.href.length - "leaflet.css".length - 1);
          }
        });
        var MarkerDrag = Handler.extend({
          initialize: function(marker2) {
            this._marker = marker2;
          },
          addHooks: function() {
            var icon2 = this._marker._icon;
            if (!this._draggable) {
              this._draggable = new Draggable(icon2, icon2, true);
            }
            this._draggable.on({
              dragstart: this._onDragStart,
              predrag: this._onPreDrag,
              drag: this._onDrag,
              dragend: this._onDragEnd
            }, this).enable();
            addClass(icon2, "leaflet-marker-draggable");
          },
          removeHooks: function() {
            this._draggable.off({
              dragstart: this._onDragStart,
              predrag: this._onPreDrag,
              drag: this._onDrag,
              dragend: this._onDragEnd
            }, this).disable();
            if (this._marker._icon) {
              removeClass(this._marker._icon, "leaflet-marker-draggable");
            }
          },
          moved: function() {
            return this._draggable && this._draggable._moved;
          },
          _adjustPan: function(e) {
            var marker2 = this._marker, map2 = marker2._map, speed = this._marker.options.autoPanSpeed, padding = this._marker.options.autoPanPadding, iconPos = getPosition(marker2._icon), bounds = map2.getPixelBounds(), origin = map2.getPixelOrigin();
            var panBounds = toBounds(
              bounds.min._subtract(origin).add(padding),
              bounds.max._subtract(origin).subtract(padding)
            );
            if (!panBounds.contains(iconPos)) {
              var movement = toPoint(
                (Math.max(panBounds.max.x, iconPos.x) - panBounds.max.x) / (bounds.max.x - panBounds.max.x) - (Math.min(panBounds.min.x, iconPos.x) - panBounds.min.x) / (bounds.min.x - panBounds.min.x),
                (Math.max(panBounds.max.y, iconPos.y) - panBounds.max.y) / (bounds.max.y - panBounds.max.y) - (Math.min(panBounds.min.y, iconPos.y) - panBounds.min.y) / (bounds.min.y - panBounds.min.y)
              ).multiplyBy(speed);
              map2.panBy(movement, { animate: false });
              this._draggable._newPos._add(movement);
              this._draggable._startPos._add(movement);
              setPosition(marker2._icon, this._draggable._newPos);
              this._onDrag(e);
              this._panRequest = requestAnimFrame(this._adjustPan.bind(this, e));
            }
          },
          _onDragStart: function() {
            this._oldLatLng = this._marker.getLatLng();
            this._marker.closePopup && this._marker.closePopup();
            this._marker.fire("movestart").fire("dragstart");
          },
          _onPreDrag: function(e) {
            if (this._marker.options.autoPan) {
              cancelAnimFrame(this._panRequest);
              this._panRequest = requestAnimFrame(this._adjustPan.bind(this, e));
            }
          },
          _onDrag: function(e) {
            var marker2 = this._marker, shadow = marker2._shadow, iconPos = getPosition(marker2._icon), latlng = marker2._map.layerPointToLatLng(iconPos);
            if (shadow) {
              setPosition(shadow, iconPos);
            }
            marker2._latlng = latlng;
            e.latlng = latlng;
            e.oldLatLng = this._oldLatLng;
            marker2.fire("move", e).fire("drag", e);
          },
          _onDragEnd: function(e) {
            cancelAnimFrame(this._panRequest);
            delete this._oldLatLng;
            this._marker.fire("moveend").fire("dragend", e);
          }
        });
        var Marker = Layer.extend({
          // @section
          // @aka Marker options
          options: {
            // @option icon: Icon = *
            // Icon instance to use for rendering the marker.
            // See [Icon documentation](#L.Icon) for details on how to customize the marker icon.
            // If not specified, a common instance of `L.Icon.Default` is used.
            icon: new IconDefault(),
            // Option inherited from "Interactive layer" abstract class
            interactive: true,
            // @option keyboard: Boolean = true
            // Whether the marker can be tabbed to with a keyboard and clicked by pressing enter.
            keyboard: true,
            // @option title: String = ''
            // Text for the browser tooltip that appear on marker hover (no tooltip by default).
            // [Useful for accessibility](https://leafletjs.com/examples/accessibility/#markers-must-be-labelled).
            title: "",
            // @option alt: String = 'Marker'
            // Text for the `alt` attribute of the icon image.
            // [Useful for accessibility](https://leafletjs.com/examples/accessibility/#markers-must-be-labelled).
            alt: "Marker",
            // @option zIndexOffset: Number = 0
            // By default, marker images zIndex is set automatically based on its latitude. Use this option if you want to put the marker on top of all others (or below), specifying a high value like `1000` (or high negative value, respectively).
            zIndexOffset: 0,
            // @option opacity: Number = 1.0
            // The opacity of the marker.
            opacity: 1,
            // @option riseOnHover: Boolean = false
            // If `true`, the marker will get on top of others when you hover the mouse over it.
            riseOnHover: false,
            // @option riseOffset: Number = 250
            // The z-index offset used for the `riseOnHover` feature.
            riseOffset: 250,
            // @option pane: String = 'markerPane'
            // `Map pane` where the markers icon will be added.
            pane: "markerPane",
            // @option shadowPane: String = 'shadowPane'
            // `Map pane` where the markers shadow will be added.
            shadowPane: "shadowPane",
            // @option bubblingMouseEvents: Boolean = false
            // When `true`, a mouse event on this marker will trigger the same event on the map
            // (unless [`L.DomEvent.stopPropagation`](#domevent-stoppropagation) is used).
            bubblingMouseEvents: false,
            // @option autoPanOnFocus: Boolean = true
            // When `true`, the map will pan whenever the marker is focused (via
            // e.g. pressing `tab` on the keyboard) to ensure the marker is
            // visible within the map's bounds
            autoPanOnFocus: true,
            // @section Draggable marker options
            // @option draggable: Boolean = false
            // Whether the marker is draggable with mouse/touch or not.
            draggable: false,
            // @option autoPan: Boolean = false
            // Whether to pan the map when dragging this marker near its edge or not.
            autoPan: false,
            // @option autoPanPadding: Point = Point(50, 50)
            // Distance (in pixels to the left/right and to the top/bottom) of the
            // map edge to start panning the map.
            autoPanPadding: [50, 50],
            // @option autoPanSpeed: Number = 10
            // Number of pixels the map should pan by.
            autoPanSpeed: 10
          },
          /* @section
           *
           * In addition to [shared layer methods](#Layer) like `addTo()` and `remove()` and [popup methods](#Popup) like bindPopup() you can also use the following methods:
           */
          initialize: function(latlng, options) {
            setOptions(this, options);
            this._latlng = toLatLng(latlng);
          },
          onAdd: function(map2) {
            this._zoomAnimated = this._zoomAnimated && map2.options.markerZoomAnimation;
            if (this._zoomAnimated) {
              map2.on("zoomanim", this._animateZoom, this);
            }
            this._initIcon();
            this.update();
          },
          onRemove: function(map2) {
            if (this.dragging && this.dragging.enabled()) {
              this.options.draggable = true;
              this.dragging.removeHooks();
            }
            delete this.dragging;
            if (this._zoomAnimated) {
              map2.off("zoomanim", this._animateZoom, this);
            }
            this._removeIcon();
            this._removeShadow();
          },
          getEvents: function() {
            return {
              zoom: this.update,
              viewreset: this.update
            };
          },
          // @method getLatLng: LatLng
          // Returns the current geographical position of the marker.
          getLatLng: function() {
            return this._latlng;
          },
          // @method setLatLng(latlng: LatLng): this
          // Changes the marker position to the given point.
          setLatLng: function(latlng) {
            var oldLatLng = this._latlng;
            this._latlng = toLatLng(latlng);
            this.update();
            return this.fire("move", { oldLatLng, latlng: this._latlng });
          },
          // @method setZIndexOffset(offset: Number): this
          // Changes the [zIndex offset](#marker-zindexoffset) of the marker.
          setZIndexOffset: function(offset) {
            this.options.zIndexOffset = offset;
            return this.update();
          },
          // @method getIcon: Icon
          // Returns the current icon used by the marker
          getIcon: function() {
            return this.options.icon;
          },
          // @method setIcon(icon: Icon): this
          // Changes the marker icon.
          setIcon: function(icon2) {
            this.options.icon = icon2;
            if (this._map) {
              this._initIcon();
              this.update();
            }
            if (this._popup) {
              this.bindPopup(this._popup, this._popup.options);
            }
            return this;
          },
          getElement: function() {
            return this._icon;
          },
          update: function() {
            if (this._icon && this._map) {
              var pos = this._map.latLngToLayerPoint(this._latlng).round();
              this._setPos(pos);
            }
            return this;
          },
          _initIcon: function() {
            var options = this.options, classToAdd = "leaflet-zoom-" + (this._zoomAnimated ? "animated" : "hide");
            var icon2 = options.icon.createIcon(this._icon), addIcon = false;
            if (icon2 !== this._icon) {
              if (this._icon) {
                this._removeIcon();
              }
              addIcon = true;
              if (options.title) {
                icon2.title = options.title;
              }
              if (icon2.tagName === "IMG") {
                icon2.alt = options.alt || "";
              }
            }
            addClass(icon2, classToAdd);
            if (options.keyboard) {
              icon2.tabIndex = "0";
              icon2.setAttribute("role", "button");
            }
            this._icon = icon2;
            if (options.riseOnHover) {
              this.on({
                mouseover: this._bringToFront,
                mouseout: this._resetZIndex
              });
            }
            if (this.options.autoPanOnFocus) {
              on(icon2, "focus", this._panOnFocus, this);
            }
            var newShadow = options.icon.createShadow(this._shadow), addShadow = false;
            if (newShadow !== this._shadow) {
              this._removeShadow();
              addShadow = true;
            }
            if (newShadow) {
              addClass(newShadow, classToAdd);
              newShadow.alt = "";
            }
            this._shadow = newShadow;
            if (options.opacity < 1) {
              this._updateOpacity();
            }
            if (addIcon) {
              this.getPane().appendChild(this._icon);
            }
            this._initInteraction();
            if (newShadow && addShadow) {
              this.getPane(options.shadowPane).appendChild(this._shadow);
            }
          },
          _removeIcon: function() {
            if (this.options.riseOnHover) {
              this.off({
                mouseover: this._bringToFront,
                mouseout: this._resetZIndex
              });
            }
            if (this.options.autoPanOnFocus) {
              off(this._icon, "focus", this._panOnFocus, this);
            }
            remove2(this._icon);
            this.removeInteractiveTarget(this._icon);
            this._icon = null;
          },
          _removeShadow: function() {
            if (this._shadow) {
              remove2(this._shadow);
            }
            this._shadow = null;
          },
          _setPos: function(pos) {
            if (this._icon) {
              setPosition(this._icon, pos);
            }
            if (this._shadow) {
              setPosition(this._shadow, pos);
            }
            this._zIndex = pos.y + this.options.zIndexOffset;
            this._resetZIndex();
          },
          _updateZIndex: function(offset) {
            if (this._icon) {
              this._icon.style.zIndex = this._zIndex + offset;
            }
          },
          _animateZoom: function(opt) {
            var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center).round();
            this._setPos(pos);
          },
          _initInteraction: function() {
            if (!this.options.interactive) {
              return;
            }
            addClass(this._icon, "leaflet-interactive");
            this.addInteractiveTarget(this._icon);
            if (MarkerDrag) {
              var draggable = this.options.draggable;
              if (this.dragging) {
                draggable = this.dragging.enabled();
                this.dragging.disable();
              }
              this.dragging = new MarkerDrag(this);
              if (draggable) {
                this.dragging.enable();
              }
            }
          },
          // @method setOpacity(opacity: Number): this
          // Changes the opacity of the marker.
          setOpacity: function(opacity) {
            this.options.opacity = opacity;
            if (this._map) {
              this._updateOpacity();
            }
            return this;
          },
          _updateOpacity: function() {
            var opacity = this.options.opacity;
            if (this._icon) {
              setOpacity(this._icon, opacity);
            }
            if (this._shadow) {
              setOpacity(this._shadow, opacity);
            }
          },
          _bringToFront: function() {
            this._updateZIndex(this.options.riseOffset);
          },
          _resetZIndex: function() {
            this._updateZIndex(0);
          },
          _panOnFocus: function() {
            var map2 = this._map;
            if (!map2) {
              return;
            }
            var iconOpts = this.options.icon.options;
            var size = iconOpts.iconSize ? toPoint(iconOpts.iconSize) : toPoint(0, 0);
            var anchor = iconOpts.iconAnchor ? toPoint(iconOpts.iconAnchor) : toPoint(0, 0);
            map2.panInside(this._latlng, {
              paddingTopLeft: anchor,
              paddingBottomRight: size.subtract(anchor)
            });
          },
          _getPopupAnchor: function() {
            return this.options.icon.options.popupAnchor;
          },
          _getTooltipAnchor: function() {
            return this.options.icon.options.tooltipAnchor;
          }
        });
        function marker(latlng, options) {
          return new Marker(latlng, options);
        }
        var Path = Layer.extend({
          // @section
          // @aka Path options
          options: {
            // @option stroke: Boolean = true
            // Whether to draw stroke along the path. Set it to `false` to disable borders on polygons or circles.
            stroke: true,
            // @option color: String = '#3388ff'
            // Stroke color
            color: "#3388ff",
            // @option weight: Number = 3
            // Stroke width in pixels
            weight: 3,
            // @option opacity: Number = 1.0
            // Stroke opacity
            opacity: 1,
            // @option lineCap: String= 'round'
            // A string that defines [shape to be used at the end](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-linecap) of the stroke.
            lineCap: "round",
            // @option lineJoin: String = 'round'
            // A string that defines [shape to be used at the corners](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-linejoin) of the stroke.
            lineJoin: "round",
            // @option dashArray: String = null
            // A string that defines the stroke [dash pattern](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-dasharray). Doesn't work on `Canvas`-powered layers in [some old browsers](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/setLineDash#Browser_compatibility).
            dashArray: null,
            // @option dashOffset: String = null
            // A string that defines the [distance into the dash pattern to start the dash](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-dashoffset). Doesn't work on `Canvas`-powered layers in [some old browsers](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/setLineDash#Browser_compatibility).
            dashOffset: null,
            // @option fill: Boolean = depends
            // Whether to fill the path with color. Set it to `false` to disable filling on polygons or circles.
            fill: false,
            // @option fillColor: String = *
            // Fill color. Defaults to the value of the [`color`](#path-color) option
            fillColor: null,
            // @option fillOpacity: Number = 0.2
            // Fill opacity.
            fillOpacity: 0.2,
            // @option fillRule: String = 'evenodd'
            // A string that defines [how the inside of a shape](https://developer.mozilla.org/docs/Web/SVG/Attribute/fill-rule) is determined.
            fillRule: "evenodd",
            // className: '',
            // Option inherited from "Interactive layer" abstract class
            interactive: true,
            // @option bubblingMouseEvents: Boolean = true
            // When `true`, a mouse event on this path will trigger the same event on the map
            // (unless [`L.DomEvent.stopPropagation`](#domevent-stoppropagation) is used).
            bubblingMouseEvents: true
          },
          beforeAdd: function(map2) {
            this._renderer = map2.getRenderer(this);
          },
          onAdd: function() {
            this._renderer._initPath(this);
            this._reset();
            this._renderer._addPath(this);
          },
          onRemove: function() {
            this._renderer._removePath(this);
          },
          // @method redraw(): this
          // Redraws the layer. Sometimes useful after you changed the coordinates that the path uses.
          redraw: function() {
            if (this._map) {
              this._renderer._updatePath(this);
            }
            return this;
          },
          // @method setStyle(style: Path options): this
          // Changes the appearance of a Path based on the options in the `Path options` object.
          setStyle: function(style2) {
            setOptions(this, style2);
            if (this._renderer) {
              this._renderer._updateStyle(this);
              if (this.options.stroke && style2 && Object.prototype.hasOwnProperty.call(style2, "weight")) {
                this._updateBounds();
              }
            }
            return this;
          },
          // @method bringToFront(): this
          // Brings the layer to the top of all path layers.
          bringToFront: function() {
            if (this._renderer) {
              this._renderer._bringToFront(this);
            }
            return this;
          },
          // @method bringToBack(): this
          // Brings the layer to the bottom of all path layers.
          bringToBack: function() {
            if (this._renderer) {
              this._renderer._bringToBack(this);
            }
            return this;
          },
          getElement: function() {
            return this._path;
          },
          _reset: function() {
            this._project();
            this._update();
          },
          _clickTolerance: function() {
            return (this.options.stroke ? this.options.weight / 2 : 0) + (this._renderer.options.tolerance || 0);
          }
        });
        var CircleMarker = Path.extend({
          // @section
          // @aka CircleMarker options
          options: {
            fill: true,
            // @option radius: Number = 10
            // Radius of the circle marker, in pixels
            radius: 10
          },
          initialize: function(latlng, options) {
            setOptions(this, options);
            this._latlng = toLatLng(latlng);
            this._radius = this.options.radius;
          },
          // @method setLatLng(latLng: LatLng): this
          // Sets the position of a circle marker to a new location.
          setLatLng: function(latlng) {
            var oldLatLng = this._latlng;
            this._latlng = toLatLng(latlng);
            this.redraw();
            return this.fire("move", { oldLatLng, latlng: this._latlng });
          },
          // @method getLatLng(): LatLng
          // Returns the current geographical position of the circle marker
          getLatLng: function() {
            return this._latlng;
          },
          // @method setRadius(radius: Number): this
          // Sets the radius of a circle marker. Units are in pixels.
          setRadius: function(radius) {
            this.options.radius = this._radius = radius;
            return this.redraw();
          },
          // @method getRadius(): Number
          // Returns the current radius of the circle
          getRadius: function() {
            return this._radius;
          },
          setStyle: function(options) {
            var radius = options && options.radius || this._radius;
            Path.prototype.setStyle.call(this, options);
            this.setRadius(radius);
            return this;
          },
          _project: function() {
            this._point = this._map.latLngToLayerPoint(this._latlng);
            this._updateBounds();
          },
          _updateBounds: function() {
            var r = this._radius, r2 = this._radiusY || r, w = this._clickTolerance(), p = [r + w, r2 + w];
            this._pxBounds = new Bounds(this._point.subtract(p), this._point.add(p));
          },
          _update: function() {
            if (this._map) {
              this._updatePath();
            }
          },
          _updatePath: function() {
            this._renderer._updateCircle(this);
          },
          _empty: function() {
            return this._radius && !this._renderer._bounds.intersects(this._pxBounds);
          },
          // Needed by the `Canvas` renderer for interactivity
          _containsPoint: function(p) {
            return p.distanceTo(this._point) <= this._radius + this._clickTolerance();
          }
        });
        function circleMarker(latlng, options) {
          return new CircleMarker(latlng, options);
        }
        var Circle = CircleMarker.extend({
          initialize: function(latlng, options, legacyOptions) {
            if (typeof options === "number") {
              options = extend2({}, legacyOptions, { radius: options });
            }
            setOptions(this, options);
            this._latlng = toLatLng(latlng);
            if (isNaN(this.options.radius)) {
              throw new Error("Circle radius cannot be NaN");
            }
            this._mRadius = this.options.radius;
          },
          // @method setRadius(radius: Number): this
          // Sets the radius of a circle. Units are in meters.
          setRadius: function(radius) {
            this._mRadius = radius;
            return this.redraw();
          },
          // @method getRadius(): Number
          // Returns the current radius of a circle. Units are in meters.
          getRadius: function() {
            return this._mRadius;
          },
          // @method getBounds(): LatLngBounds
          // Returns the `LatLngBounds` of the path.
          getBounds: function() {
            var half = [this._radius, this._radiusY || this._radius];
            return new LatLngBounds(
              this._map.layerPointToLatLng(this._point.subtract(half)),
              this._map.layerPointToLatLng(this._point.add(half))
            );
          },
          setStyle: Path.prototype.setStyle,
          _project: function() {
            var lng = this._latlng.lng, lat = this._latlng.lat, map2 = this._map, crs = map2.options.crs;
            if (crs.distance === Earth.distance) {
              var d = Math.PI / 180, latR = this._mRadius / Earth.R / d, top = map2.project([lat + latR, lng]), bottom = map2.project([lat - latR, lng]), p = top.add(bottom).divideBy(2), lat2 = map2.unproject(p).lat, lngR = Math.acos((Math.cos(latR * d) - Math.sin(lat * d) * Math.sin(lat2 * d)) / (Math.cos(lat * d) * Math.cos(lat2 * d))) / d;
              if (isNaN(lngR) || lngR === 0) {
                lngR = latR / Math.cos(Math.PI / 180 * lat);
              }
              this._point = p.subtract(map2.getPixelOrigin());
              this._radius = isNaN(lngR) ? 0 : p.x - map2.project([lat2, lng - lngR]).x;
              this._radiusY = p.y - top.y;
            } else {
              var latlng2 = crs.unproject(crs.project(this._latlng).subtract([this._mRadius, 0]));
              this._point = map2.latLngToLayerPoint(this._latlng);
              this._radius = this._point.x - map2.latLngToLayerPoint(latlng2).x;
            }
            this._updateBounds();
          }
        });
        function circle(latlng, options, legacyOptions) {
          return new Circle(latlng, options, legacyOptions);
        }
        var Polyline = Path.extend({
          // @section
          // @aka Polyline options
          options: {
            // @option smoothFactor: Number = 1.0
            // How much to simplify the polyline on each zoom level. More means
            // better performance and smoother look, and less means more accurate representation.
            smoothFactor: 1,
            // @option noClip: Boolean = false
            // Disable polyline clipping.
            noClip: false
          },
          initialize: function(latlngs, options) {
            setOptions(this, options);
            this._setLatLngs(latlngs);
          },
          // @method getLatLngs(): LatLng[]
          // Returns an array of the points in the path, or nested arrays of points in case of multi-polyline.
          getLatLngs: function() {
            return this._latlngs;
          },
          // @method setLatLngs(latlngs: LatLng[]): this
          // Replaces all the points in the polyline with the given array of geographical points.
          setLatLngs: function(latlngs) {
            this._setLatLngs(latlngs);
            return this.redraw();
          },
          // @method isEmpty(): Boolean
          // Returns `true` if the Polyline has no LatLngs.
          isEmpty: function() {
            return !this._latlngs.length;
          },
          // @method closestLayerPoint(p: Point): Point
          // Returns the point closest to `p` on the Polyline.
          closestLayerPoint: function(p) {
            var minDistance = Infinity, minPoint = null, closest = _sqClosestPointOnSegment, p1, p2;
            for (var j = 0, jLen = this._parts.length; j < jLen; j++) {
              var points = this._parts[j];
              for (var i = 1, len = points.length; i < len; i++) {
                p1 = points[i - 1];
                p2 = points[i];
                var sqDist = closest(p, p1, p2, true);
                if (sqDist < minDistance) {
                  minDistance = sqDist;
                  minPoint = closest(p, p1, p2);
                }
              }
            }
            if (minPoint) {
              minPoint.distance = Math.sqrt(minDistance);
            }
            return minPoint;
          },
          // @method getCenter(): LatLng
          // Returns the center ([centroid](https://en.wikipedia.org/wiki/Centroid)) of the polyline.
          getCenter: function() {
            if (!this._map) {
              throw new Error("Must add layer to map before using getCenter()");
            }
            return polylineCenter(this._defaultShape(), this._map.options.crs);
          },
          // @method getBounds(): LatLngBounds
          // Returns the `LatLngBounds` of the path.
          getBounds: function() {
            return this._bounds;
          },
          // @method addLatLng(latlng: LatLng, latlngs?: LatLng[]): this
          // Adds a given point to the polyline. By default, adds to the first ring of
          // the polyline in case of a multi-polyline, but can be overridden by passing
          // a specific ring as a LatLng array (that you can earlier access with [`getLatLngs`](#polyline-getlatlngs)).
          addLatLng: function(latlng, latlngs) {
            latlngs = latlngs || this._defaultShape();
            latlng = toLatLng(latlng);
            latlngs.push(latlng);
            this._bounds.extend(latlng);
            return this.redraw();
          },
          _setLatLngs: function(latlngs) {
            this._bounds = new LatLngBounds();
            this._latlngs = this._convertLatLngs(latlngs);
          },
          _defaultShape: function() {
            return isFlat(this._latlngs) ? this._latlngs : this._latlngs[0];
          },
          // recursively convert latlngs input into actual LatLng instances; calculate bounds along the way
          _convertLatLngs: function(latlngs) {
            var result = [], flat = isFlat(latlngs);
            for (var i = 0, len = latlngs.length; i < len; i++) {
              if (flat) {
                result[i] = toLatLng(latlngs[i]);
                this._bounds.extend(result[i]);
              } else {
                result[i] = this._convertLatLngs(latlngs[i]);
              }
            }
            return result;
          },
          _project: function() {
            var pxBounds = new Bounds();
            this._rings = [];
            this._projectLatlngs(this._latlngs, this._rings, pxBounds);
            if (this._bounds.isValid() && pxBounds.isValid()) {
              this._rawPxBounds = pxBounds;
              this._updateBounds();
            }
          },
          _updateBounds: function() {
            var w = this._clickTolerance(), p = new Point(w, w);
            if (!this._rawPxBounds) {
              return;
            }
            this._pxBounds = new Bounds([
              this._rawPxBounds.min.subtract(p),
              this._rawPxBounds.max.add(p)
            ]);
          },
          // recursively turns latlngs into a set of rings with projected coordinates
          _projectLatlngs: function(latlngs, result, projectedBounds) {
            var flat = latlngs[0] instanceof LatLng, len = latlngs.length, i, ring;
            if (flat) {
              ring = [];
              for (i = 0; i < len; i++) {
                ring[i] = this._map.latLngToLayerPoint(latlngs[i]);
                projectedBounds.extend(ring[i]);
              }
              result.push(ring);
            } else {
              for (i = 0; i < len; i++) {
                this._projectLatlngs(latlngs[i], result, projectedBounds);
              }
            }
          },
          // clip polyline by renderer bounds so that we have less to render for performance
          _clipPoints: function() {
            var bounds = this._renderer._bounds;
            this._parts = [];
            if (!this._pxBounds || !this._pxBounds.intersects(bounds)) {
              return;
            }
            if (this.options.noClip) {
              this._parts = this._rings;
              return;
            }
            var parts = this._parts, i, j, k, len, len2, segment, points;
            for (i = 0, k = 0, len = this._rings.length; i < len; i++) {
              points = this._rings[i];
              for (j = 0, len2 = points.length; j < len2 - 1; j++) {
                segment = clipSegment(points[j], points[j + 1], bounds, j, true);
                if (!segment) {
                  continue;
                }
                parts[k] = parts[k] || [];
                parts[k].push(segment[0]);
                if (segment[1] !== points[j + 1] || j === len2 - 2) {
                  parts[k].push(segment[1]);
                  k++;
                }
              }
            }
          },
          // simplify each clipped part of the polyline for performance
          _simplifyPoints: function() {
            var parts = this._parts, tolerance = this.options.smoothFactor;
            for (var i = 0, len = parts.length; i < len; i++) {
              parts[i] = simplify(parts[i], tolerance);
            }
          },
          _update: function() {
            if (!this._map) {
              return;
            }
            this._clipPoints();
            this._simplifyPoints();
            this._updatePath();
          },
          _updatePath: function() {
            this._renderer._updatePoly(this);
          },
          // Needed by the `Canvas` renderer for interactivity
          _containsPoint: function(p, closed) {
            var i, j, k, len, len2, part, w = this._clickTolerance();
            if (!this._pxBounds || !this._pxBounds.contains(p)) {
              return false;
            }
            for (i = 0, len = this._parts.length; i < len; i++) {
              part = this._parts[i];
              for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
                if (!closed && j === 0) {
                  continue;
                }
                if (pointToSegmentDistance(p, part[k], part[j]) <= w) {
                  return true;
                }
              }
            }
            return false;
          }
        });
        function polyline(latlngs, options) {
          return new Polyline(latlngs, options);
        }
        Polyline._flat = _flat;
        var Polygon = Polyline.extend({
          options: {
            fill: true
          },
          isEmpty: function() {
            return !this._latlngs.length || !this._latlngs[0].length;
          },
          // @method getCenter(): LatLng
          // Returns the center ([centroid](http://en.wikipedia.org/wiki/Centroid)) of the Polygon.
          getCenter: function() {
            if (!this._map) {
              throw new Error("Must add layer to map before using getCenter()");
            }
            return polygonCenter(this._defaultShape(), this._map.options.crs);
          },
          _convertLatLngs: function(latlngs) {
            var result = Polyline.prototype._convertLatLngs.call(this, latlngs), len = result.length;
            if (len >= 2 && result[0] instanceof LatLng && result[0].equals(result[len - 1])) {
              result.pop();
            }
            return result;
          },
          _setLatLngs: function(latlngs) {
            Polyline.prototype._setLatLngs.call(this, latlngs);
            if (isFlat(this._latlngs)) {
              this._latlngs = [this._latlngs];
            }
          },
          _defaultShape: function() {
            return isFlat(this._latlngs[0]) ? this._latlngs[0] : this._latlngs[0][0];
          },
          _clipPoints: function() {
            var bounds = this._renderer._bounds, w = this.options.weight, p = new Point(w, w);
            bounds = new Bounds(bounds.min.subtract(p), bounds.max.add(p));
            this._parts = [];
            if (!this._pxBounds || !this._pxBounds.intersects(bounds)) {
              return;
            }
            if (this.options.noClip) {
              this._parts = this._rings;
              return;
            }
            for (var i = 0, len = this._rings.length, clipped; i < len; i++) {
              clipped = clipPolygon(this._rings[i], bounds, true);
              if (clipped.length) {
                this._parts.push(clipped);
              }
            }
          },
          _updatePath: function() {
            this._renderer._updatePoly(this, true);
          },
          // Needed by the `Canvas` renderer for interactivity
          _containsPoint: function(p) {
            var inside = false, part, p1, p2, i, j, k, len, len2;
            if (!this._pxBounds || !this._pxBounds.contains(p)) {
              return false;
            }
            for (i = 0, len = this._parts.length; i < len; i++) {
              part = this._parts[i];
              for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
                p1 = part[j];
                p2 = part[k];
                if (p1.y > p.y !== p2.y > p.y && p.x < (p2.x - p1.x) * (p.y - p1.y) / (p2.y - p1.y) + p1.x) {
                  inside = !inside;
                }
              }
            }
            return inside || Polyline.prototype._containsPoint.call(this, p, true);
          }
        });
        function polygon2(latlngs, options) {
          return new Polygon(latlngs, options);
        }
        var GeoJSON = FeatureGroup.extend({
          /* @section
           * @aka GeoJSON options
           *
           * @option pointToLayer: Function = *
           * A `Function` defining how GeoJSON points spawn Leaflet layers. It is internally
           * called when data is added, passing the GeoJSON point feature and its `LatLng`.
           * The default is to spawn a default `Marker`:
           * ```js
           * function(geoJsonPoint, latlng) {
           * 	return L.marker(latlng);
           * }
           * ```
           *
           * @option style: Function = *
           * A `Function` defining the `Path options` for styling GeoJSON lines and polygons,
           * called internally when data is added.
           * The default value is to not override any defaults:
           * ```js
           * function (geoJsonFeature) {
           * 	return {}
           * }
           * ```
           *
           * @option onEachFeature: Function = *
           * A `Function` that will be called once for each created `Feature`, after it has
           * been created and styled. Useful for attaching events and popups to features.
           * The default is to do nothing with the newly created layers:
           * ```js
           * function (feature, layer) {}
           * ```
           *
           * @option filter: Function = *
           * A `Function` that will be used to decide whether to include a feature or not.
           * The default is to include all features:
           * ```js
           * function (geoJsonFeature) {
           * 	return true;
           * }
           * ```
           * Note: dynamically changing the `filter` option will have effect only on newly
           * added data. It will _not_ re-evaluate already included features.
           *
           * @option coordsToLatLng: Function = *
           * A `Function` that will be used for converting GeoJSON coordinates to `LatLng`s.
           * The default is the `coordsToLatLng` static method.
           *
           * @option markersInheritOptions: Boolean = false
           * Whether default Markers for "Point" type Features inherit from group options.
           */
          initialize: function(geojson, options) {
            setOptions(this, options);
            this._layers = {};
            if (geojson) {
              this.addData(geojson);
            }
          },
          // @method addData( <GeoJSON> data ): this
          // Adds a GeoJSON object to the layer.
          addData: function(geojson) {
            var features = isArray2(geojson) ? geojson : geojson.features, i, len, feature;
            if (features) {
              for (i = 0, len = features.length; i < len; i++) {
                feature = features[i];
                if (feature.geometries || feature.geometry || feature.features || feature.coordinates) {
                  this.addData(feature);
                }
              }
              return this;
            }
            var options = this.options;
            if (options.filter && !options.filter(geojson)) {
              return this;
            }
            var layer = geometryToLayer(geojson, options);
            if (!layer) {
              return this;
            }
            layer.feature = asFeature(geojson);
            layer.defaultOptions = layer.options;
            this.resetStyle(layer);
            if (options.onEachFeature) {
              options.onEachFeature(geojson, layer);
            }
            return this.addLayer(layer);
          },
          // @method resetStyle( <Path> layer? ): this
          // Resets the given vector layer's style to the original GeoJSON style, useful for resetting style after hover events.
          // If `layer` is omitted, the style of all features in the current layer is reset.
          resetStyle: function(layer) {
            if (layer === void 0) {
              return this.eachLayer(this.resetStyle, this);
            }
            layer.options = extend2({}, layer.defaultOptions);
            this._setLayerStyle(layer, this.options.style);
            return this;
          },
          // @method setStyle( <Function> style ): this
          // Changes styles of GeoJSON vector layers with the given style function.
          setStyle: function(style2) {
            return this.eachLayer(function(layer) {
              this._setLayerStyle(layer, style2);
            }, this);
          },
          _setLayerStyle: function(layer, style2) {
            if (layer.setStyle) {
              if (typeof style2 === "function") {
                style2 = style2(layer.feature);
              }
              layer.setStyle(style2);
            }
          }
        });
        function geometryToLayer(geojson, options) {
          var geometry = geojson.type === "Feature" ? geojson.geometry : geojson, coords = geometry ? geometry.coordinates : null, layers2 = [], pointToLayer = options && options.pointToLayer, _coordsToLatLng = options && options.coordsToLatLng || coordsToLatLng, latlng, latlngs, i, len;
          if (!coords && !geometry) {
            return null;
          }
          switch (geometry.type) {
            case "Point":
              latlng = _coordsToLatLng(coords);
              return _pointToLayer(pointToLayer, geojson, latlng, options);
            case "MultiPoint":
              for (i = 0, len = coords.length; i < len; i++) {
                latlng = _coordsToLatLng(coords[i]);
                layers2.push(_pointToLayer(pointToLayer, geojson, latlng, options));
              }
              return new FeatureGroup(layers2);
            case "LineString":
            case "MultiLineString":
              latlngs = coordsToLatLngs(coords, geometry.type === "LineString" ? 0 : 1, _coordsToLatLng);
              return new Polyline(latlngs, options);
            case "Polygon":
            case "MultiPolygon":
              latlngs = coordsToLatLngs(coords, geometry.type === "Polygon" ? 1 : 2, _coordsToLatLng);
              return new Polygon(latlngs, options);
            case "GeometryCollection":
              for (i = 0, len = geometry.geometries.length; i < len; i++) {
                var geoLayer = geometryToLayer({
                  geometry: geometry.geometries[i],
                  type: "Feature",
                  properties: geojson.properties
                }, options);
                if (geoLayer) {
                  layers2.push(geoLayer);
                }
              }
              return new FeatureGroup(layers2);
            case "FeatureCollection":
              for (i = 0, len = geometry.features.length; i < len; i++) {
                var featureLayer = geometryToLayer(geometry.features[i], options);
                if (featureLayer) {
                  layers2.push(featureLayer);
                }
              }
              return new FeatureGroup(layers2);
            default:
              throw new Error("Invalid GeoJSON object.");
          }
        }
        function _pointToLayer(pointToLayerFn, geojson, latlng, options) {
          return pointToLayerFn ? pointToLayerFn(geojson, latlng) : new Marker(latlng, options && options.markersInheritOptions && options);
        }
        function coordsToLatLng(coords) {
          return new LatLng(coords[1], coords[0], coords[2]);
        }
        function coordsToLatLngs(coords, levelsDeep, _coordsToLatLng) {
          var latlngs = [];
          for (var i = 0, len = coords.length, latlng; i < len; i++) {
            latlng = levelsDeep ? coordsToLatLngs(coords[i], levelsDeep - 1, _coordsToLatLng) : (_coordsToLatLng || coordsToLatLng)(coords[i]);
            latlngs.push(latlng);
          }
          return latlngs;
        }
        function latLngToCoords(latlng, precision) {
          latlng = toLatLng(latlng);
          return latlng.alt !== void 0 ? [formatNum(latlng.lng, precision), formatNum(latlng.lat, precision), formatNum(latlng.alt, precision)] : [formatNum(latlng.lng, precision), formatNum(latlng.lat, precision)];
        }
        function latLngsToCoords(latlngs, levelsDeep, closed, precision) {
          var coords = [];
          for (var i = 0, len = latlngs.length; i < len; i++) {
            coords.push(levelsDeep ? latLngsToCoords(latlngs[i], isFlat(latlngs[i]) ? 0 : levelsDeep - 1, closed, precision) : latLngToCoords(latlngs[i], precision));
          }
          if (!levelsDeep && closed && coords.length > 0) {
            coords.push(coords[0].slice());
          }
          return coords;
        }
        function getFeature(layer, newGeometry) {
          return layer.feature ? extend2({}, layer.feature, { geometry: newGeometry }) : asFeature(newGeometry);
        }
        function asFeature(geojson) {
          if (geojson.type === "Feature" || geojson.type === "FeatureCollection") {
            return geojson;
          }
          return {
            type: "Feature",
            properties: {},
            geometry: geojson
          };
        }
        var PointToGeoJSON = {
          toGeoJSON: function(precision) {
            return getFeature(this, {
              type: "Point",
              coordinates: latLngToCoords(this.getLatLng(), precision)
            });
          }
        };
        Marker.include(PointToGeoJSON);
        Circle.include(PointToGeoJSON);
        CircleMarker.include(PointToGeoJSON);
        Polyline.include({
          toGeoJSON: function(precision) {
            var multi = !isFlat(this._latlngs);
            var coords = latLngsToCoords(this._latlngs, multi ? 1 : 0, false, precision);
            return getFeature(this, {
              type: (multi ? "Multi" : "") + "LineString",
              coordinates: coords
            });
          }
        });
        Polygon.include({
          toGeoJSON: function(precision) {
            var holes = !isFlat(this._latlngs), multi = holes && !isFlat(this._latlngs[0]);
            var coords = latLngsToCoords(this._latlngs, multi ? 2 : holes ? 1 : 0, true, precision);
            if (!holes) {
              coords = [coords];
            }
            return getFeature(this, {
              type: (multi ? "Multi" : "") + "Polygon",
              coordinates: coords
            });
          }
        });
        LayerGroup.include({
          toMultiPoint: function(precision) {
            var coords = [];
            this.eachLayer(function(layer) {
              coords.push(layer.toGeoJSON(precision).geometry.coordinates);
            });
            return getFeature(this, {
              type: "MultiPoint",
              coordinates: coords
            });
          },
          // @method toGeoJSON(precision?: Number|false): Object
          // Coordinates values are rounded with [`formatNum`](#util-formatnum) function with given `precision`.
          // Returns a [`GeoJSON`](https://en.wikipedia.org/wiki/GeoJSON) representation of the layer group (as a GeoJSON `FeatureCollection`, `GeometryCollection`, or `MultiPoint`).
          toGeoJSON: function(precision) {
            var type = this.feature && this.feature.geometry && this.feature.geometry.type;
            if (type === "MultiPoint") {
              return this.toMultiPoint(precision);
            }
            var isGeometryCollection = type === "GeometryCollection", jsons = [];
            this.eachLayer(function(layer) {
              if (layer.toGeoJSON) {
                var json = layer.toGeoJSON(precision);
                if (isGeometryCollection) {
                  jsons.push(json.geometry);
                } else {
                  var feature = asFeature(json);
                  if (feature.type === "FeatureCollection") {
                    jsons.push.apply(jsons, feature.features);
                  } else {
                    jsons.push(feature);
                  }
                }
              }
            });
            if (isGeometryCollection) {
              return getFeature(this, {
                geometries: jsons,
                type: "GeometryCollection"
              });
            }
            return {
              type: "FeatureCollection",
              features: jsons
            };
          }
        });
        function geoJSON(geojson, options) {
          return new GeoJSON(geojson, options);
        }
        var geoJson = geoJSON;
        var ImageOverlay = Layer.extend({
          // @section
          // @aka ImageOverlay options
          options: {
            // @option opacity: Number = 1.0
            // The opacity of the image overlay.
            opacity: 1,
            // @option alt: String = ''
            // Text for the `alt` attribute of the image (useful for accessibility).
            alt: "",
            // @option interactive: Boolean = false
            // If `true`, the image overlay will emit [mouse events](#interactive-layer) when clicked or hovered.
            interactive: false,
            // @option crossOrigin: Boolean|String = false
            // Whether the crossOrigin attribute will be added to the image.
            // If a String is provided, the image will have its crossOrigin attribute set to the String provided. This is needed if you want to access image pixel data.
            // Refer to [CORS Settings](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes) for valid String values.
            crossOrigin: false,
            // @option errorOverlayUrl: String = ''
            // URL to the overlay image to show in place of the overlay that failed to load.
            errorOverlayUrl: "",
            // @option zIndex: Number = 1
            // The explicit [zIndex](https://developer.mozilla.org/docs/Web/CSS/CSS_Positioning/Understanding_z_index) of the overlay layer.
            zIndex: 1,
            // @option className: String = ''
            // A custom class name to assign to the image. Empty by default.
            className: ""
          },
          initialize: function(url, bounds, options) {
            this._url = url;
            this._bounds = toLatLngBounds(bounds);
            setOptions(this, options);
          },
          onAdd: function() {
            if (!this._image) {
              this._initImage();
              if (this.options.opacity < 1) {
                this._updateOpacity();
              }
            }
            if (this.options.interactive) {
              addClass(this._image, "leaflet-interactive");
              this.addInteractiveTarget(this._image);
            }
            this.getPane().appendChild(this._image);
            this._reset();
          },
          onRemove: function() {
            remove2(this._image);
            if (this.options.interactive) {
              this.removeInteractiveTarget(this._image);
            }
          },
          // @method setOpacity(opacity: Number): this
          // Sets the opacity of the overlay.
          setOpacity: function(opacity) {
            this.options.opacity = opacity;
            if (this._image) {
              this._updateOpacity();
            }
            return this;
          },
          setStyle: function(styleOpts) {
            if (styleOpts.opacity) {
              this.setOpacity(styleOpts.opacity);
            }
            return this;
          },
          // @method bringToFront(): this
          // Brings the layer to the top of all overlays.
          bringToFront: function() {
            if (this._map) {
              toFront(this._image);
            }
            return this;
          },
          // @method bringToBack(): this
          // Brings the layer to the bottom of all overlays.
          bringToBack: function() {
            if (this._map) {
              toBack(this._image);
            }
            return this;
          },
          // @method setUrl(url: String): this
          // Changes the URL of the image.
          setUrl: function(url) {
            this._url = url;
            if (this._image) {
              this._image.src = url;
            }
            return this;
          },
          // @method setBounds(bounds: LatLngBounds): this
          // Update the bounds that this ImageOverlay covers
          setBounds: function(bounds) {
            this._bounds = toLatLngBounds(bounds);
            if (this._map) {
              this._reset();
            }
            return this;
          },
          getEvents: function() {
            var events = {
              zoom: this._reset,
              viewreset: this._reset
            };
            if (this._zoomAnimated) {
              events.zoomanim = this._animateZoom;
            }
            return events;
          },
          // @method setZIndex(value: Number): this
          // Changes the [zIndex](#imageoverlay-zindex) of the image overlay.
          setZIndex: function(value) {
            this.options.zIndex = value;
            this._updateZIndex();
            return this;
          },
          // @method getBounds(): LatLngBounds
          // Get the bounds that this ImageOverlay covers
          getBounds: function() {
            return this._bounds;
          },
          // @method getElement(): HTMLElement
          // Returns the instance of [`HTMLImageElement`](https://developer.mozilla.org/docs/Web/API/HTMLImageElement)
          // used by this overlay.
          getElement: function() {
            return this._image;
          },
          _initImage: function() {
            var wasElementSupplied = this._url.tagName === "IMG";
            var img = this._image = wasElementSupplied ? this._url : create$1("img");
            addClass(img, "leaflet-image-layer");
            if (this._zoomAnimated) {
              addClass(img, "leaflet-zoom-animated");
            }
            if (this.options.className) {
              addClass(img, this.options.className);
            }
            img.onselectstart = falseFn;
            img.onmousemove = falseFn;
            img.onload = bind(this.fire, this, "load");
            img.onerror = bind(this._overlayOnError, this, "error");
            if (this.options.crossOrigin || this.options.crossOrigin === "") {
              img.crossOrigin = this.options.crossOrigin === true ? "" : this.options.crossOrigin;
            }
            if (this.options.zIndex) {
              this._updateZIndex();
            }
            if (wasElementSupplied) {
              this._url = img.src;
              return;
            }
            img.src = this._url;
            img.alt = this.options.alt;
          },
          _animateZoom: function(e) {
            var scale2 = this._map.getZoomScale(e.zoom), offset = this._map._latLngBoundsToNewLayerBounds(this._bounds, e.zoom, e.center).min;
            setTransform(this._image, offset, scale2);
          },
          _reset: function() {
            var image = this._image, bounds = new Bounds(
              this._map.latLngToLayerPoint(this._bounds.getNorthWest()),
              this._map.latLngToLayerPoint(this._bounds.getSouthEast())
            ), size = bounds.getSize();
            setPosition(image, bounds.min);
            image.style.width = size.x + "px";
            image.style.height = size.y + "px";
          },
          _updateOpacity: function() {
            setOpacity(this._image, this.options.opacity);
          },
          _updateZIndex: function() {
            if (this._image && this.options.zIndex !== void 0 && this.options.zIndex !== null) {
              this._image.style.zIndex = this.options.zIndex;
            }
          },
          _overlayOnError: function() {
            this.fire("error");
            var errorUrl = this.options.errorOverlayUrl;
            if (errorUrl && this._url !== errorUrl) {
              this._url = errorUrl;
              this._image.src = errorUrl;
            }
          },
          // @method getCenter(): LatLng
          // Returns the center of the ImageOverlay.
          getCenter: function() {
            return this._bounds.getCenter();
          }
        });
        var imageOverlay = function(url, bounds, options) {
          return new ImageOverlay(url, bounds, options);
        };
        var VideoOverlay = ImageOverlay.extend({
          // @section
          // @aka VideoOverlay options
          options: {
            // @option autoplay: Boolean = true
            // Whether the video starts playing automatically when loaded.
            // On some browsers autoplay will only work with `muted: true`
            autoplay: true,
            // @option loop: Boolean = true
            // Whether the video will loop back to the beginning when played.
            loop: true,
            // @option keepAspectRatio: Boolean = true
            // Whether the video will save aspect ratio after the projection.
            // Relevant for supported browsers. See [browser compatibility](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit)
            keepAspectRatio: true,
            // @option muted: Boolean = false
            // Whether the video starts on mute when loaded.
            muted: false,
            // @option playsInline: Boolean = true
            // Mobile browsers will play the video right where it is instead of open it up in fullscreen mode.
            playsInline: true
          },
          _initImage: function() {
            var wasElementSupplied = this._url.tagName === "VIDEO";
            var vid = this._image = wasElementSupplied ? this._url : create$1("video");
            addClass(vid, "leaflet-image-layer");
            if (this._zoomAnimated) {
              addClass(vid, "leaflet-zoom-animated");
            }
            if (this.options.className) {
              addClass(vid, this.options.className);
            }
            vid.onselectstart = falseFn;
            vid.onmousemove = falseFn;
            vid.onloadeddata = bind(this.fire, this, "load");
            if (wasElementSupplied) {
              var sourceElements = vid.getElementsByTagName("source");
              var sources = [];
              for (var j = 0; j < sourceElements.length; j++) {
                sources.push(sourceElements[j].src);
              }
              this._url = sourceElements.length > 0 ? sources : [vid.src];
              return;
            }
            if (!isArray2(this._url)) {
              this._url = [this._url];
            }
            if (!this.options.keepAspectRatio && Object.prototype.hasOwnProperty.call(vid.style, "objectFit")) {
              vid.style["objectFit"] = "fill";
            }
            vid.autoplay = !!this.options.autoplay;
            vid.loop = !!this.options.loop;
            vid.muted = !!this.options.muted;
            vid.playsInline = !!this.options.playsInline;
            for (var i = 0; i < this._url.length; i++) {
              var source = create$1("source");
              source.src = this._url[i];
              vid.appendChild(source);
            }
          }
          // @method getElement(): HTMLVideoElement
          // Returns the instance of [`HTMLVideoElement`](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement)
          // used by this overlay.
        });
        function videoOverlay(video, bounds, options) {
          return new VideoOverlay(video, bounds, options);
        }
        var SVGOverlay = ImageOverlay.extend({
          _initImage: function() {
            var el = this._image = this._url;
            addClass(el, "leaflet-image-layer");
            if (this._zoomAnimated) {
              addClass(el, "leaflet-zoom-animated");
            }
            if (this.options.className) {
              addClass(el, this.options.className);
            }
            el.onselectstart = falseFn;
            el.onmousemove = falseFn;
          }
          // @method getElement(): SVGElement
          // Returns the instance of [`SVGElement`](https://developer.mozilla.org/docs/Web/API/SVGElement)
          // used by this overlay.
        });
        function svgOverlay(el, bounds, options) {
          return new SVGOverlay(el, bounds, options);
        }
        var DivOverlay = Layer.extend({
          // @section
          // @aka DivOverlay options
          options: {
            // @option interactive: Boolean = false
            // If true, the popup/tooltip will listen to the mouse events.
            interactive: false,
            // @option offset: Point = Point(0, 0)
            // The offset of the overlay position.
            offset: [0, 0],
            // @option className: String = ''
            // A custom CSS class name to assign to the overlay.
            className: "",
            // @option pane: String = undefined
            // `Map pane` where the overlay will be added.
            pane: void 0,
            // @option content: String|HTMLElement|Function = ''
            // Sets the HTML content of the overlay while initializing. If a function is passed the source layer will be
            // passed to the function. The function should return a `String` or `HTMLElement` to be used in the overlay.
            content: ""
          },
          initialize: function(options, source) {
            if (options && (options instanceof LatLng || isArray2(options))) {
              this._latlng = toLatLng(options);
              setOptions(this, source);
            } else {
              setOptions(this, options);
              this._source = source;
            }
            if (this.options.content) {
              this._content = this.options.content;
            }
          },
          // @method openOn(map: Map): this
          // Adds the overlay to the map.
          // Alternative to `map.openPopup(popup)`/`.openTooltip(tooltip)`.
          openOn: function(map2) {
            map2 = arguments.length ? map2 : this._source._map;
            if (!map2.hasLayer(this)) {
              map2.addLayer(this);
            }
            return this;
          },
          // @method close(): this
          // Closes the overlay.
          // Alternative to `map.closePopup(popup)`/`.closeTooltip(tooltip)`
          // and `layer.closePopup()`/`.closeTooltip()`.
          close: function() {
            if (this._map) {
              this._map.removeLayer(this);
            }
            return this;
          },
          // @method toggle(layer?: Layer): this
          // Opens or closes the overlay bound to layer depending on its current state.
          // Argument may be omitted only for overlay bound to layer.
          // Alternative to `layer.togglePopup()`/`.toggleTooltip()`.
          toggle: function(layer) {
            if (this._map) {
              this.close();
            } else {
              if (arguments.length) {
                this._source = layer;
              } else {
                layer = this._source;
              }
              this._prepareOpen();
              this.openOn(layer._map);
            }
            return this;
          },
          onAdd: function(map2) {
            this._zoomAnimated = map2._zoomAnimated;
            if (!this._container) {
              this._initLayout();
            }
            if (map2._fadeAnimated) {
              setOpacity(this._container, 0);
            }
            clearTimeout(this._removeTimeout);
            this.getPane().appendChild(this._container);
            this.update();
            if (map2._fadeAnimated) {
              setOpacity(this._container, 1);
            }
            this.bringToFront();
            if (this.options.interactive) {
              addClass(this._container, "leaflet-interactive");
              this.addInteractiveTarget(this._container);
            }
          },
          onRemove: function(map2) {
            if (map2._fadeAnimated) {
              setOpacity(this._container, 0);
              this._removeTimeout = setTimeout(bind(remove2, void 0, this._container), 200);
            } else {
              remove2(this._container);
            }
            if (this.options.interactive) {
              removeClass(this._container, "leaflet-interactive");
              this.removeInteractiveTarget(this._container);
            }
          },
          // @namespace DivOverlay
          // @method getLatLng: LatLng
          // Returns the geographical point of the overlay.
          getLatLng: function() {
            return this._latlng;
          },
          // @method setLatLng(latlng: LatLng): this
          // Sets the geographical point where the overlay will open.
          setLatLng: function(latlng) {
            this._latlng = toLatLng(latlng);
            if (this._map) {
              this._updatePosition();
              this._adjustPan();
            }
            return this;
          },
          // @method getContent: String|HTMLElement
          // Returns the content of the overlay.
          getContent: function() {
            return this._content;
          },
          // @method setContent(htmlContent: String|HTMLElement|Function): this
          // Sets the HTML content of the overlay. If a function is passed the source layer will be passed to the function.
          // The function should return a `String` or `HTMLElement` to be used in the overlay.
          setContent: function(content) {
            this._content = content;
            this.update();
            return this;
          },
          // @method getElement: String|HTMLElement
          // Returns the HTML container of the overlay.
          getElement: function() {
            return this._container;
          },
          // @method update: null
          // Updates the overlay content, layout and position. Useful for updating the overlay after something inside changed, e.g. image loaded.
          update: function() {
            if (!this._map) {
              return;
            }
            this._container.style.visibility = "hidden";
            this._updateContent();
            this._updateLayout();
            this._updatePosition();
            this._container.style.visibility = "";
            this._adjustPan();
          },
          getEvents: function() {
            var events = {
              zoom: this._updatePosition,
              viewreset: this._updatePosition
            };
            if (this._zoomAnimated) {
              events.zoomanim = this._animateZoom;
            }
            return events;
          },
          // @method isOpen: Boolean
          // Returns `true` when the overlay is visible on the map.
          isOpen: function() {
            return !!this._map && this._map.hasLayer(this);
          },
          // @method bringToFront: this
          // Brings this overlay in front of other overlays (in the same map pane).
          bringToFront: function() {
            if (this._map) {
              toFront(this._container);
            }
            return this;
          },
          // @method bringToBack: this
          // Brings this overlay to the back of other overlays (in the same map pane).
          bringToBack: function() {
            if (this._map) {
              toBack(this._container);
            }
            return this;
          },
          // prepare bound overlay to open: update latlng pos / content source (for FeatureGroup)
          _prepareOpen: function(latlng) {
            var source = this._source;
            if (!source._map) {
              return false;
            }
            if (source instanceof FeatureGroup) {
              source = null;
              var layers2 = this._source._layers;
              for (var id2 in layers2) {
                if (layers2[id2]._map) {
                  source = layers2[id2];
                  break;
                }
              }
              if (!source) {
                return false;
              }
              this._source = source;
            }
            if (!latlng) {
              if (source.getCenter) {
                latlng = source.getCenter();
              } else if (source.getLatLng) {
                latlng = source.getLatLng();
              } else if (source.getBounds) {
                latlng = source.getBounds().getCenter();
              } else {
                throw new Error("Unable to get source layer LatLng.");
              }
            }
            this.setLatLng(latlng);
            if (this._map) {
              this.update();
            }
            return true;
          },
          _updateContent: function() {
            if (!this._content) {
              return;
            }
            var node = this._contentNode;
            var content = typeof this._content === "function" ? this._content(this._source || this) : this._content;
            if (typeof content === "string") {
              node.innerHTML = content;
            } else {
              while (node.hasChildNodes()) {
                node.removeChild(node.firstChild);
              }
              node.appendChild(content);
            }
            this.fire("contentupdate");
          },
          _updatePosition: function() {
            if (!this._map) {
              return;
            }
            var pos = this._map.latLngToLayerPoint(this._latlng), offset = toPoint(this.options.offset), anchor = this._getAnchor();
            if (this._zoomAnimated) {
              setPosition(this._container, pos.add(anchor));
            } else {
              offset = offset.add(pos).add(anchor);
            }
            var bottom = this._containerBottom = -offset.y, left = this._containerLeft = -Math.round(this._containerWidth / 2) + offset.x;
            this._container.style.bottom = bottom + "px";
            this._container.style.left = left + "px";
          },
          _getAnchor: function() {
            return [0, 0];
          }
        });
        Map2.include({
          _initOverlay: function(OverlayClass, content, latlng, options) {
            var overlay = content;
            if (!(overlay instanceof OverlayClass)) {
              overlay = new OverlayClass(options).setContent(content);
            }
            if (latlng) {
              overlay.setLatLng(latlng);
            }
            return overlay;
          }
        });
        Layer.include({
          _initOverlay: function(OverlayClass, old, content, options) {
            var overlay = content;
            if (overlay instanceof OverlayClass) {
              setOptions(overlay, options);
              overlay._source = this;
            } else {
              overlay = old && !options ? old : new OverlayClass(options, this);
              overlay.setContent(content);
            }
            return overlay;
          }
        });
        var Popup = DivOverlay.extend({
          // @section
          // @aka Popup options
          options: {
            // @option pane: String = 'popupPane'
            // `Map pane` where the popup will be added.
            pane: "popupPane",
            // @option offset: Point = Point(0, 7)
            // The offset of the popup position.
            offset: [0, 7],
            // @option maxWidth: Number = 300
            // Max width of the popup, in pixels.
            maxWidth: 300,
            // @option minWidth: Number = 50
            // Min width of the popup, in pixels.
            minWidth: 50,
            // @option maxHeight: Number = null
            // If set, creates a scrollable container of the given height
            // inside a popup if its content exceeds it.
            // The scrollable container can be styled using the
            // `leaflet-popup-scrolled` CSS class selector.
            maxHeight: null,
            // @option autoPan: Boolean = true
            // Set it to `false` if you don't want the map to do panning animation
            // to fit the opened popup.
            autoPan: true,
            // @option autoPanPaddingTopLeft: Point = null
            // The margin between the popup and the top left corner of the map
            // view after autopanning was performed.
            autoPanPaddingTopLeft: null,
            // @option autoPanPaddingBottomRight: Point = null
            // The margin between the popup and the bottom right corner of the map
            // view after autopanning was performed.
            autoPanPaddingBottomRight: null,
            // @option autoPanPadding: Point = Point(5, 5)
            // Equivalent of setting both top left and bottom right autopan padding to the same value.
            autoPanPadding: [5, 5],
            // @option keepInView: Boolean = false
            // Set it to `true` if you want to prevent users from panning the popup
            // off of the screen while it is open.
            keepInView: false,
            // @option closeButton: Boolean = true
            // Controls the presence of a close button in the popup.
            closeButton: true,
            // @option autoClose: Boolean = true
            // Set it to `false` if you want to override the default behavior of
            // the popup closing when another popup is opened.
            autoClose: true,
            // @option closeOnEscapeKey: Boolean = true
            // Set it to `false` if you want to override the default behavior of
            // the ESC key for closing of the popup.
            closeOnEscapeKey: true,
            // @option closeOnClick: Boolean = *
            // Set it if you want to override the default behavior of the popup closing when user clicks
            // on the map. Defaults to the map's [`closePopupOnClick`](#map-closepopuponclick) option.
            // @option className: String = ''
            // A custom CSS class name to assign to the popup.
            className: ""
          },
          // @namespace Popup
          // @method openOn(map: Map): this
          // Alternative to `map.openPopup(popup)`.
          // Adds the popup to the map and closes the previous one.
          openOn: function(map2) {
            map2 = arguments.length ? map2 : this._source._map;
            if (!map2.hasLayer(this) && map2._popup && map2._popup.options.autoClose) {
              map2.removeLayer(map2._popup);
            }
            map2._popup = this;
            return DivOverlay.prototype.openOn.call(this, map2);
          },
          onAdd: function(map2) {
            DivOverlay.prototype.onAdd.call(this, map2);
            map2.fire("popupopen", { popup: this });
            if (this._source) {
              this._source.fire("popupopen", { popup: this }, true);
              if (!(this._source instanceof Path)) {
                this._source.on("preclick", stopPropagation);
              }
            }
          },
          onRemove: function(map2) {
            DivOverlay.prototype.onRemove.call(this, map2);
            map2.fire("popupclose", { popup: this });
            if (this._source) {
              this._source.fire("popupclose", { popup: this }, true);
              if (!(this._source instanceof Path)) {
                this._source.off("preclick", stopPropagation);
              }
            }
          },
          getEvents: function() {
            var events = DivOverlay.prototype.getEvents.call(this);
            if (this.options.closeOnClick !== void 0 ? this.options.closeOnClick : this._map.options.closePopupOnClick) {
              events.preclick = this.close;
            }
            if (this.options.keepInView) {
              events.moveend = this._adjustPan;
            }
            return events;
          },
          _initLayout: function() {
            var prefix = "leaflet-popup", container = this._container = create$1(
              "div",
              prefix + " " + (this.options.className || "") + " leaflet-zoom-animated"
            );
            var wrapper = this._wrapper = create$1("div", prefix + "-content-wrapper", container);
            this._contentNode = create$1("div", prefix + "-content", wrapper);
            disableClickPropagation(container);
            disableScrollPropagation(this._contentNode);
            on(container, "contextmenu", stopPropagation);
            this._tipContainer = create$1("div", prefix + "-tip-container", container);
            this._tip = create$1("div", prefix + "-tip", this._tipContainer);
            if (this.options.closeButton) {
              var closeButton = this._closeButton = create$1("a", prefix + "-close-button", container);
              closeButton.setAttribute("role", "button");
              closeButton.setAttribute("aria-label", "Close popup");
              closeButton.href = "#close";
              closeButton.innerHTML = '<span aria-hidden="true">&#215;</span>';
              on(closeButton, "click", function(ev) {
                preventDefault(ev);
                this.close();
              }, this);
            }
          },
          _updateLayout: function() {
            var container = this._contentNode, style2 = container.style;
            style2.width = "";
            style2.whiteSpace = "nowrap";
            var width = container.offsetWidth;
            width = Math.min(width, this.options.maxWidth);
            width = Math.max(width, this.options.minWidth);
            style2.width = width + 1 + "px";
            style2.whiteSpace = "";
            style2.height = "";
            var height = container.offsetHeight, maxHeight = this.options.maxHeight, scrolledClass = "leaflet-popup-scrolled";
            if (maxHeight && height > maxHeight) {
              style2.height = maxHeight + "px";
              addClass(container, scrolledClass);
            } else {
              removeClass(container, scrolledClass);
            }
            this._containerWidth = this._container.offsetWidth;
          },
          _animateZoom: function(e) {
            var pos = this._map._latLngToNewLayerPoint(this._latlng, e.zoom, e.center), anchor = this._getAnchor();
            setPosition(this._container, pos.add(anchor));
          },
          _adjustPan: function() {
            if (!this.options.autoPan) {
              return;
            }
            if (this._map._panAnim) {
              this._map._panAnim.stop();
            }
            if (this._autopanning) {
              this._autopanning = false;
              return;
            }
            var map2 = this._map, marginBottom = parseInt(getStyle(this._container, "marginBottom"), 10) || 0, containerHeight = this._container.offsetHeight + marginBottom, containerWidth = this._containerWidth, layerPos = new Point(this._containerLeft, -containerHeight - this._containerBottom);
            layerPos._add(getPosition(this._container));
            var containerPos = map2.layerPointToContainerPoint(layerPos), padding = toPoint(this.options.autoPanPadding), paddingTL = toPoint(this.options.autoPanPaddingTopLeft || padding), paddingBR = toPoint(this.options.autoPanPaddingBottomRight || padding), size = map2.getSize(), dx = 0, dy = 0;
            if (containerPos.x + containerWidth + paddingBR.x > size.x) {
              dx = containerPos.x + containerWidth - size.x + paddingBR.x;
            }
            if (containerPos.x - dx - paddingTL.x < 0) {
              dx = containerPos.x - paddingTL.x;
            }
            if (containerPos.y + containerHeight + paddingBR.y > size.y) {
              dy = containerPos.y + containerHeight - size.y + paddingBR.y;
            }
            if (containerPos.y - dy - paddingTL.y < 0) {
              dy = containerPos.y - paddingTL.y;
            }
            if (dx || dy) {
              if (this.options.keepInView) {
                this._autopanning = true;
              }
              map2.fire("autopanstart").panBy([dx, dy]);
            }
          },
          _getAnchor: function() {
            return toPoint(this._source && this._source._getPopupAnchor ? this._source._getPopupAnchor() : [0, 0]);
          }
        });
        var popup = function(options, source) {
          return new Popup(options, source);
        };
        Map2.mergeOptions({
          closePopupOnClick: true
        });
        Map2.include({
          // @method openPopup(popup: Popup): this
          // Opens the specified popup while closing the previously opened (to make sure only one is opened at one time for usability).
          // @alternative
          // @method openPopup(content: String|HTMLElement, latlng: LatLng, options?: Popup options): this
          // Creates a popup with the specified content and options and opens it in the given point on a map.
          openPopup: function(popup2, latlng, options) {
            this._initOverlay(Popup, popup2, latlng, options).openOn(this);
            return this;
          },
          // @method closePopup(popup?: Popup): this
          // Closes the popup previously opened with [openPopup](#map-openpopup) (or the given one).
          closePopup: function(popup2) {
            popup2 = arguments.length ? popup2 : this._popup;
            if (popup2) {
              popup2.close();
            }
            return this;
          }
        });
        Layer.include({
          // @method bindPopup(content: String|HTMLElement|Function|Popup, options?: Popup options): this
          // Binds a popup to the layer with the passed `content` and sets up the
          // necessary event listeners. If a `Function` is passed it will receive
          // the layer as the first argument and should return a `String` or `HTMLElement`.
          bindPopup: function(content, options) {
            this._popup = this._initOverlay(Popup, this._popup, content, options);
            if (!this._popupHandlersAdded) {
              this.on({
                click: this._openPopup,
                keypress: this._onKeyPress,
                remove: this.closePopup,
                move: this._movePopup
              });
              this._popupHandlersAdded = true;
            }
            return this;
          },
          // @method unbindPopup(): this
          // Removes the popup previously bound with `bindPopup`.
          unbindPopup: function() {
            if (this._popup) {
              this.off({
                click: this._openPopup,
                keypress: this._onKeyPress,
                remove: this.closePopup,
                move: this._movePopup
              });
              this._popupHandlersAdded = false;
              this._popup = null;
            }
            return this;
          },
          // @method openPopup(latlng?: LatLng): this
          // Opens the bound popup at the specified `latlng` or at the default popup anchor if no `latlng` is passed.
          openPopup: function(latlng) {
            if (this._popup) {
              if (!(this instanceof FeatureGroup)) {
                this._popup._source = this;
              }
              if (this._popup._prepareOpen(latlng || this._latlng)) {
                this._popup.openOn(this._map);
              }
            }
            return this;
          },
          // @method closePopup(): this
          // Closes the popup bound to this layer if it is open.
          closePopup: function() {
            if (this._popup) {
              this._popup.close();
            }
            return this;
          },
          // @method togglePopup(): this
          // Opens or closes the popup bound to this layer depending on its current state.
          togglePopup: function() {
            if (this._popup) {
              this._popup.toggle(this);
            }
            return this;
          },
          // @method isPopupOpen(): boolean
          // Returns `true` if the popup bound to this layer is currently open.
          isPopupOpen: function() {
            return this._popup ? this._popup.isOpen() : false;
          },
          // @method setPopupContent(content: String|HTMLElement|Popup): this
          // Sets the content of the popup bound to this layer.
          setPopupContent: function(content) {
            if (this._popup) {
              this._popup.setContent(content);
            }
            return this;
          },
          // @method getPopup(): Popup
          // Returns the popup bound to this layer.
          getPopup: function() {
            return this._popup;
          },
          _openPopup: function(e) {
            if (!this._popup || !this._map) {
              return;
            }
            stop(e);
            var target = e.layer || e.target;
            if (this._popup._source === target && !(target instanceof Path)) {
              if (this._map.hasLayer(this._popup)) {
                this.closePopup();
              } else {
                this.openPopup(e.latlng);
              }
              return;
            }
            this._popup._source = target;
            this.openPopup(e.latlng);
          },
          _movePopup: function(e) {
            this._popup.setLatLng(e.latlng);
          },
          _onKeyPress: function(e) {
            if (e.originalEvent.keyCode === 13) {
              this._openPopup(e);
            }
          }
        });
        var Tooltip = DivOverlay.extend({
          // @section
          // @aka Tooltip options
          options: {
            // @option pane: String = 'tooltipPane'
            // `Map pane` where the tooltip will be added.
            pane: "tooltipPane",
            // @option offset: Point = Point(0, 0)
            // Optional offset of the tooltip position.
            offset: [0, 0],
            // @option direction: String = 'auto'
            // Direction where to open the tooltip. Possible values are: `right`, `left`,
            // `top`, `bottom`, `center`, `auto`.
            // `auto` will dynamically switch between `right` and `left` according to the tooltip
            // position on the map.
            direction: "auto",
            // @option permanent: Boolean = false
            // Whether to open the tooltip permanently or only on mouseover.
            permanent: false,
            // @option sticky: Boolean = false
            // If true, the tooltip will follow the mouse instead of being fixed at the feature center.
            sticky: false,
            // @option opacity: Number = 0.9
            // Tooltip container opacity.
            opacity: 0.9
          },
          onAdd: function(map2) {
            DivOverlay.prototype.onAdd.call(this, map2);
            this.setOpacity(this.options.opacity);
            map2.fire("tooltipopen", { tooltip: this });
            if (this._source) {
              this.addEventParent(this._source);
              this._source.fire("tooltipopen", { tooltip: this }, true);
            }
          },
          onRemove: function(map2) {
            DivOverlay.prototype.onRemove.call(this, map2);
            map2.fire("tooltipclose", { tooltip: this });
            if (this._source) {
              this.removeEventParent(this._source);
              this._source.fire("tooltipclose", { tooltip: this }, true);
            }
          },
          getEvents: function() {
            var events = DivOverlay.prototype.getEvents.call(this);
            if (!this.options.permanent) {
              events.preclick = this.close;
            }
            return events;
          },
          _initLayout: function() {
            var prefix = "leaflet-tooltip", className = prefix + " " + (this.options.className || "") + " leaflet-zoom-" + (this._zoomAnimated ? "animated" : "hide");
            this._contentNode = this._container = create$1("div", className);
            this._container.setAttribute("role", "tooltip");
            this._container.setAttribute("id", "leaflet-tooltip-" + stamp(this));
          },
          _updateLayout: function() {
          },
          _adjustPan: function() {
          },
          _setPosition: function(pos) {
            var subX, subY, map2 = this._map, container = this._container, centerPoint = map2.latLngToContainerPoint(map2.getCenter()), tooltipPoint = map2.layerPointToContainerPoint(pos), direction = this.options.direction, tooltipWidth = container.offsetWidth, tooltipHeight = container.offsetHeight, offset = toPoint(this.options.offset), anchor = this._getAnchor();
            if (direction === "top") {
              subX = tooltipWidth / 2;
              subY = tooltipHeight;
            } else if (direction === "bottom") {
              subX = tooltipWidth / 2;
              subY = 0;
            } else if (direction === "center") {
              subX = tooltipWidth / 2;
              subY = tooltipHeight / 2;
            } else if (direction === "right") {
              subX = 0;
              subY = tooltipHeight / 2;
            } else if (direction === "left") {
              subX = tooltipWidth;
              subY = tooltipHeight / 2;
            } else if (tooltipPoint.x < centerPoint.x) {
              direction = "right";
              subX = 0;
              subY = tooltipHeight / 2;
            } else {
              direction = "left";
              subX = tooltipWidth + (offset.x + anchor.x) * 2;
              subY = tooltipHeight / 2;
            }
            pos = pos.subtract(toPoint(subX, subY, true)).add(offset).add(anchor);
            removeClass(container, "leaflet-tooltip-right");
            removeClass(container, "leaflet-tooltip-left");
            removeClass(container, "leaflet-tooltip-top");
            removeClass(container, "leaflet-tooltip-bottom");
            addClass(container, "leaflet-tooltip-" + direction);
            setPosition(container, pos);
          },
          _updatePosition: function() {
            var pos = this._map.latLngToLayerPoint(this._latlng);
            this._setPosition(pos);
          },
          setOpacity: function(opacity) {
            this.options.opacity = opacity;
            if (this._container) {
              setOpacity(this._container, opacity);
            }
          },
          _animateZoom: function(e) {
            var pos = this._map._latLngToNewLayerPoint(this._latlng, e.zoom, e.center);
            this._setPosition(pos);
          },
          _getAnchor: function() {
            return toPoint(this._source && this._source._getTooltipAnchor && !this.options.sticky ? this._source._getTooltipAnchor() : [0, 0]);
          }
        });
        var tooltip = function(options, source) {
          return new Tooltip(options, source);
        };
        Map2.include({
          // @method openTooltip(tooltip: Tooltip): this
          // Opens the specified tooltip.
          // @alternative
          // @method openTooltip(content: String|HTMLElement, latlng: LatLng, options?: Tooltip options): this
          // Creates a tooltip with the specified content and options and open it.
          openTooltip: function(tooltip2, latlng, options) {
            this._initOverlay(Tooltip, tooltip2, latlng, options).openOn(this);
            return this;
          },
          // @method closeTooltip(tooltip: Tooltip): this
          // Closes the tooltip given as parameter.
          closeTooltip: function(tooltip2) {
            tooltip2.close();
            return this;
          }
        });
        Layer.include({
          // @method bindTooltip(content: String|HTMLElement|Function|Tooltip, options?: Tooltip options): this
          // Binds a tooltip to the layer with the passed `content` and sets up the
          // necessary event listeners. If a `Function` is passed it will receive
          // the layer as the first argument and should return a `String` or `HTMLElement`.
          bindTooltip: function(content, options) {
            if (this._tooltip && this.isTooltipOpen()) {
              this.unbindTooltip();
            }
            this._tooltip = this._initOverlay(Tooltip, this._tooltip, content, options);
            this._initTooltipInteractions();
            if (this._tooltip.options.permanent && this._map && this._map.hasLayer(this)) {
              this.openTooltip();
            }
            return this;
          },
          // @method unbindTooltip(): this
          // Removes the tooltip previously bound with `bindTooltip`.
          unbindTooltip: function() {
            if (this._tooltip) {
              this._initTooltipInteractions(true);
              this.closeTooltip();
              this._tooltip = null;
            }
            return this;
          },
          _initTooltipInteractions: function(remove3) {
            if (!remove3 && this._tooltipHandlersAdded) {
              return;
            }
            var onOff = remove3 ? "off" : "on", events = {
              remove: this.closeTooltip,
              move: this._moveTooltip
            };
            if (!this._tooltip.options.permanent) {
              events.mouseover = this._openTooltip;
              events.mouseout = this.closeTooltip;
              events.click = this._openTooltip;
              if (this._map) {
                this._addFocusListeners();
              } else {
                events.add = this._addFocusListeners;
              }
            } else {
              events.add = this._openTooltip;
            }
            if (this._tooltip.options.sticky) {
              events.mousemove = this._moveTooltip;
            }
            this[onOff](events);
            this._tooltipHandlersAdded = !remove3;
          },
          // @method openTooltip(latlng?: LatLng): this
          // Opens the bound tooltip at the specified `latlng` or at the default tooltip anchor if no `latlng` is passed.
          openTooltip: function(latlng) {
            if (this._tooltip) {
              if (!(this instanceof FeatureGroup)) {
                this._tooltip._source = this;
              }
              if (this._tooltip._prepareOpen(latlng)) {
                this._tooltip.openOn(this._map);
                if (this.getElement) {
                  this._setAriaDescribedByOnLayer(this);
                } else if (this.eachLayer) {
                  this.eachLayer(this._setAriaDescribedByOnLayer, this);
                }
              }
            }
            return this;
          },
          // @method closeTooltip(): this
          // Closes the tooltip bound to this layer if it is open.
          closeTooltip: function() {
            if (this._tooltip) {
              return this._tooltip.close();
            }
          },
          // @method toggleTooltip(): this
          // Opens or closes the tooltip bound to this layer depending on its current state.
          toggleTooltip: function() {
            if (this._tooltip) {
              this._tooltip.toggle(this);
            }
            return this;
          },
          // @method isTooltipOpen(): boolean
          // Returns `true` if the tooltip bound to this layer is currently open.
          isTooltipOpen: function() {
            return this._tooltip.isOpen();
          },
          // @method setTooltipContent(content: String|HTMLElement|Tooltip): this
          // Sets the content of the tooltip bound to this layer.
          setTooltipContent: function(content) {
            if (this._tooltip) {
              this._tooltip.setContent(content);
            }
            return this;
          },
          // @method getTooltip(): Tooltip
          // Returns the tooltip bound to this layer.
          getTooltip: function() {
            return this._tooltip;
          },
          _addFocusListeners: function() {
            if (this.getElement) {
              this._addFocusListenersOnLayer(this);
            } else if (this.eachLayer) {
              this.eachLayer(this._addFocusListenersOnLayer, this);
            }
          },
          _addFocusListenersOnLayer: function(layer) {
            var el = typeof layer.getElement === "function" && layer.getElement();
            if (el) {
              on(el, "focus", function() {
                this._tooltip._source = layer;
                this.openTooltip();
              }, this);
              on(el, "blur", this.closeTooltip, this);
            }
          },
          _setAriaDescribedByOnLayer: function(layer) {
            var el = typeof layer.getElement === "function" && layer.getElement();
            if (el) {
              el.setAttribute("aria-describedby", this._tooltip._container.id);
            }
          },
          _openTooltip: function(e) {
            if (!this._tooltip || !this._map) {
              return;
            }
            if (this._map.dragging && this._map.dragging.moving() && !this._openOnceFlag) {
              this._openOnceFlag = true;
              var that = this;
              this._map.once("moveend", function() {
                that._openOnceFlag = false;
                that._openTooltip(e);
              });
              return;
            }
            this._tooltip._source = e.layer || e.target;
            this.openTooltip(this._tooltip.options.sticky ? e.latlng : void 0);
          },
          _moveTooltip: function(e) {
            var latlng = e.latlng, containerPoint, layerPoint;
            if (this._tooltip.options.sticky && e.originalEvent) {
              containerPoint = this._map.mouseEventToContainerPoint(e.originalEvent);
              layerPoint = this._map.containerPointToLayerPoint(containerPoint);
              latlng = this._map.layerPointToLatLng(layerPoint);
            }
            this._tooltip.setLatLng(latlng);
          }
        });
        var DivIcon = Icon.extend({
          options: {
            // @section
            // @aka DivIcon options
            iconSize: [12, 12],
            // also can be set through CSS
            // iconAnchor: (Point),
            // popupAnchor: (Point),
            // @option html: String|HTMLElement = ''
            // Custom HTML code to put inside the div element, empty by default. Alternatively,
            // an instance of `HTMLElement`.
            html: false,
            // @option bgPos: Point = [0, 0]
            // Optional relative position of the background, in pixels
            bgPos: null,
            className: "leaflet-div-icon"
          },
          createIcon: function(oldIcon) {
            var div = oldIcon && oldIcon.tagName === "DIV" ? oldIcon : document.createElement("div"), options = this.options;
            if (options.html instanceof Element) {
              empty2(div);
              div.appendChild(options.html);
            } else {
              div.innerHTML = options.html !== false ? options.html : "";
            }
            if (options.bgPos) {
              var bgPos = toPoint(options.bgPos);
              div.style.backgroundPosition = -bgPos.x + "px " + -bgPos.y + "px";
            }
            this._setIconStyles(div, "icon");
            return div;
          },
          createShadow: function() {
            return null;
          }
        });
        function divIcon(options) {
          return new DivIcon(options);
        }
        Icon.Default = IconDefault;
        var GridLayer = Layer.extend({
          // @section
          // @aka GridLayer options
          options: {
            // @option tileSize: Number|Point = 256
            // Width and height of tiles in the grid. Use a number if width and height are equal, or `L.point(width, height)` otherwise.
            tileSize: 256,
            // @option opacity: Number = 1.0
            // Opacity of the tiles. Can be used in the `createTile()` function.
            opacity: 1,
            // @option updateWhenIdle: Boolean = (depends)
            // Load new tiles only when panning ends.
            // `true` by default on mobile browsers, in order to avoid too many requests and keep smooth navigation.
            // `false` otherwise in order to display new tiles _during_ panning, since it is easy to pan outside the
            // [`keepBuffer`](#gridlayer-keepbuffer) option in desktop browsers.
            updateWhenIdle: Browser.mobile,
            // @option updateWhenZooming: Boolean = true
            // By default, a smooth zoom animation (during a [touch zoom](#map-touchzoom) or a [`flyTo()`](#map-flyto)) will update grid layers every integer zoom level. Setting this option to `false` will update the grid layer only when the smooth animation ends.
            updateWhenZooming: true,
            // @option updateInterval: Number = 200
            // Tiles will not update more than once every `updateInterval` milliseconds when panning.
            updateInterval: 200,
            // @option zIndex: Number = 1
            // The explicit zIndex of the tile layer.
            zIndex: 1,
            // @option bounds: LatLngBounds = undefined
            // If set, tiles will only be loaded inside the set `LatLngBounds`.
            bounds: null,
            // @option minZoom: Number = 0
            // The minimum zoom level down to which this layer will be displayed (inclusive).
            minZoom: 0,
            // @option maxZoom: Number = undefined
            // The maximum zoom level up to which this layer will be displayed (inclusive).
            maxZoom: void 0,
            // @option maxNativeZoom: Number = undefined
            // Maximum zoom number the tile source has available. If it is specified,
            // the tiles on all zoom levels higher than `maxNativeZoom` will be loaded
            // from `maxNativeZoom` level and auto-scaled.
            maxNativeZoom: void 0,
            // @option minNativeZoom: Number = undefined
            // Minimum zoom number the tile source has available. If it is specified,
            // the tiles on all zoom levels lower than `minNativeZoom` will be loaded
            // from `minNativeZoom` level and auto-scaled.
            minNativeZoom: void 0,
            // @option noWrap: Boolean = false
            // Whether the layer is wrapped around the antimeridian. If `true`, the
            // GridLayer will only be displayed once at low zoom levels. Has no
            // effect when the [map CRS](#map-crs) doesn't wrap around. Can be used
            // in combination with [`bounds`](#gridlayer-bounds) to prevent requesting
            // tiles outside the CRS limits.
            noWrap: false,
            // @option pane: String = 'tilePane'
            // `Map pane` where the grid layer will be added.
            pane: "tilePane",
            // @option className: String = ''
            // A custom class name to assign to the tile layer. Empty by default.
            className: "",
            // @option keepBuffer: Number = 2
            // When panning the map, keep this many rows and columns of tiles before unloading them.
            keepBuffer: 2
          },
          initialize: function(options) {
            setOptions(this, options);
          },
          onAdd: function() {
            this._initContainer();
            this._levels = {};
            this._tiles = {};
            this._resetView();
          },
          beforeAdd: function(map2) {
            map2._addZoomLimit(this);
          },
          onRemove: function(map2) {
            this._removeAllTiles();
            remove2(this._container);
            map2._removeZoomLimit(this);
            this._container = null;
            this._tileZoom = void 0;
          },
          // @method bringToFront: this
          // Brings the tile layer to the top of all tile layers.
          bringToFront: function() {
            if (this._map) {
              toFront(this._container);
              this._setAutoZIndex(Math.max);
            }
            return this;
          },
          // @method bringToBack: this
          // Brings the tile layer to the bottom of all tile layers.
          bringToBack: function() {
            if (this._map) {
              toBack(this._container);
              this._setAutoZIndex(Math.min);
            }
            return this;
          },
          // @method getContainer: HTMLElement
          // Returns the HTML element that contains the tiles for this layer.
          getContainer: function() {
            return this._container;
          },
          // @method setOpacity(opacity: Number): this
          // Changes the [opacity](#gridlayer-opacity) of the grid layer.
          setOpacity: function(opacity) {
            this.options.opacity = opacity;
            this._updateOpacity();
            return this;
          },
          // @method setZIndex(zIndex: Number): this
          // Changes the [zIndex](#gridlayer-zindex) of the grid layer.
          setZIndex: function(zIndex) {
            this.options.zIndex = zIndex;
            this._updateZIndex();
            return this;
          },
          // @method isLoading: Boolean
          // Returns `true` if any tile in the grid layer has not finished loading.
          isLoading: function() {
            return this._loading;
          },
          // @method redraw: this
          // Causes the layer to clear all the tiles and request them again.
          redraw: function() {
            if (this._map) {
              this._removeAllTiles();
              var tileZoom = this._clampZoom(this._map.getZoom());
              if (tileZoom !== this._tileZoom) {
                this._tileZoom = tileZoom;
                this._updateLevels();
              }
              this._update();
            }
            return this;
          },
          getEvents: function() {
            var events = {
              viewprereset: this._invalidateAll,
              viewreset: this._resetView,
              zoom: this._resetView,
              moveend: this._onMoveEnd
            };
            if (!this.options.updateWhenIdle) {
              if (!this._onMove) {
                this._onMove = throttle2(this._onMoveEnd, this.options.updateInterval, this);
              }
              events.move = this._onMove;
            }
            if (this._zoomAnimated) {
              events.zoomanim = this._animateZoom;
            }
            return events;
          },
          // @section Extension methods
          // Layers extending `GridLayer` shall reimplement the following method.
          // @method createTile(coords: Object, done?: Function): HTMLElement
          // Called only internally, must be overridden by classes extending `GridLayer`.
          // Returns the `HTMLElement` corresponding to the given `coords`. If the `done` callback
          // is specified, it must be called when the tile has finished loading and drawing.
          createTile: function() {
            return document.createElement("div");
          },
          // @section
          // @method getTileSize: Point
          // Normalizes the [tileSize option](#gridlayer-tilesize) into a point. Used by the `createTile()` method.
          getTileSize: function() {
            var s = this.options.tileSize;
            return s instanceof Point ? s : new Point(s, s);
          },
          _updateZIndex: function() {
            if (this._container && this.options.zIndex !== void 0 && this.options.zIndex !== null) {
              this._container.style.zIndex = this.options.zIndex;
            }
          },
          _setAutoZIndex: function(compare) {
            var layers2 = this.getPane().children, edgeZIndex = -compare(-Infinity, Infinity);
            for (var i = 0, len = layers2.length, zIndex; i < len; i++) {
              zIndex = layers2[i].style.zIndex;
              if (layers2[i] !== this._container && zIndex) {
                edgeZIndex = compare(edgeZIndex, +zIndex);
              }
            }
            if (isFinite(edgeZIndex)) {
              this.options.zIndex = edgeZIndex + compare(-1, 1);
              this._updateZIndex();
            }
          },
          _updateOpacity: function() {
            if (!this._map) {
              return;
            }
            if (Browser.ielt9) {
              return;
            }
            setOpacity(this._container, this.options.opacity);
            var now2 = +/* @__PURE__ */ new Date(), nextFrame = false, willPrune = false;
            for (var key in this._tiles) {
              var tile = this._tiles[key];
              if (!tile.current || !tile.loaded) {
                continue;
              }
              var fade = Math.min(1, (now2 - tile.loaded) / 200);
              setOpacity(tile.el, fade);
              if (fade < 1) {
                nextFrame = true;
              } else {
                if (tile.active) {
                  willPrune = true;
                } else {
                  this._onOpaqueTile(tile);
                }
                tile.active = true;
              }
            }
            if (willPrune && !this._noPrune) {
              this._pruneTiles();
            }
            if (nextFrame) {
              cancelAnimFrame(this._fadeFrame);
              this._fadeFrame = requestAnimFrame(this._updateOpacity, this);
            }
          },
          _onOpaqueTile: falseFn,
          _initContainer: function() {
            if (this._container) {
              return;
            }
            this._container = create$1("div", "leaflet-layer " + (this.options.className || ""));
            this._updateZIndex();
            if (this.options.opacity < 1) {
              this._updateOpacity();
            }
            this.getPane().appendChild(this._container);
          },
          _updateLevels: function() {
            var zoom2 = this._tileZoom, maxZoom = this.options.maxZoom;
            if (zoom2 === void 0) {
              return void 0;
            }
            for (var z in this._levels) {
              z = Number(z);
              if (this._levels[z].el.children.length || z === zoom2) {
                this._levels[z].el.style.zIndex = maxZoom - Math.abs(zoom2 - z);
                this._onUpdateLevel(z);
              } else {
                remove2(this._levels[z].el);
                this._removeTilesAtZoom(z);
                this._onRemoveLevel(z);
                delete this._levels[z];
              }
            }
            var level = this._levels[zoom2], map2 = this._map;
            if (!level) {
              level = this._levels[zoom2] = {};
              level.el = create$1("div", "leaflet-tile-container leaflet-zoom-animated", this._container);
              level.el.style.zIndex = maxZoom;
              level.origin = map2.project(map2.unproject(map2.getPixelOrigin()), zoom2).round();
              level.zoom = zoom2;
              this._setZoomTransform(level, map2.getCenter(), map2.getZoom());
              falseFn(level.el.offsetWidth);
              this._onCreateLevel(level);
            }
            this._level = level;
            return level;
          },
          _onUpdateLevel: falseFn,
          _onRemoveLevel: falseFn,
          _onCreateLevel: falseFn,
          _pruneTiles: function() {
            if (!this._map) {
              return;
            }
            var key, tile;
            var zoom2 = this._map.getZoom();
            if (zoom2 > this.options.maxZoom || zoom2 < this.options.minZoom) {
              this._removeAllTiles();
              return;
            }
            for (key in this._tiles) {
              tile = this._tiles[key];
              tile.retain = tile.current;
            }
            for (key in this._tiles) {
              tile = this._tiles[key];
              if (tile.current && !tile.active) {
                var coords = tile.coords;
                if (!this._retainParent(coords.x, coords.y, coords.z, coords.z - 5)) {
                  this._retainChildren(coords.x, coords.y, coords.z, coords.z + 2);
                }
              }
            }
            for (key in this._tiles) {
              if (!this._tiles[key].retain) {
                this._removeTile(key);
              }
            }
          },
          _removeTilesAtZoom: function(zoom2) {
            for (var key in this._tiles) {
              if (this._tiles[key].coords.z !== zoom2) {
                continue;
              }
              this._removeTile(key);
            }
          },
          _removeAllTiles: function() {
            for (var key in this._tiles) {
              this._removeTile(key);
            }
          },
          _invalidateAll: function() {
            for (var z in this._levels) {
              remove2(this._levels[z].el);
              this._onRemoveLevel(Number(z));
              delete this._levels[z];
            }
            this._removeAllTiles();
            this._tileZoom = void 0;
          },
          _retainParent: function(x3, y3, z, minZoom) {
            var x22 = Math.floor(x3 / 2), y22 = Math.floor(y3 / 2), z2 = z - 1, coords2 = new Point(+x22, +y22);
            coords2.z = +z2;
            var key = this._tileCoordsToKey(coords2), tile = this._tiles[key];
            if (tile && tile.active) {
              tile.retain = true;
              return true;
            } else if (tile && tile.loaded) {
              tile.retain = true;
            }
            if (z2 > minZoom) {
              return this._retainParent(x22, y22, z2, minZoom);
            }
            return false;
          },
          _retainChildren: function(x3, y3, z, maxZoom) {
            for (var i = 2 * x3; i < 2 * x3 + 2; i++) {
              for (var j = 2 * y3; j < 2 * y3 + 2; j++) {
                var coords = new Point(i, j);
                coords.z = z + 1;
                var key = this._tileCoordsToKey(coords), tile = this._tiles[key];
                if (tile && tile.active) {
                  tile.retain = true;
                  continue;
                } else if (tile && tile.loaded) {
                  tile.retain = true;
                }
                if (z + 1 < maxZoom) {
                  this._retainChildren(i, j, z + 1, maxZoom);
                }
              }
            }
          },
          _resetView: function(e) {
            var animating = e && (e.pinch || e.flyTo);
            this._setView(this._map.getCenter(), this._map.getZoom(), animating, animating);
          },
          _animateZoom: function(e) {
            this._setView(e.center, e.zoom, true, e.noUpdate);
          },
          _clampZoom: function(zoom2) {
            var options = this.options;
            if (void 0 !== options.minNativeZoom && zoom2 < options.minNativeZoom) {
              return options.minNativeZoom;
            }
            if (void 0 !== options.maxNativeZoom && options.maxNativeZoom < zoom2) {
              return options.maxNativeZoom;
            }
            return zoom2;
          },
          _setView: function(center, zoom2, noPrune, noUpdate) {
            var tileZoom = Math.round(zoom2);
            if (this.options.maxZoom !== void 0 && tileZoom > this.options.maxZoom || this.options.minZoom !== void 0 && tileZoom < this.options.minZoom) {
              tileZoom = void 0;
            } else {
              tileZoom = this._clampZoom(tileZoom);
            }
            var tileZoomChanged = this.options.updateWhenZooming && tileZoom !== this._tileZoom;
            if (!noUpdate || tileZoomChanged) {
              this._tileZoom = tileZoom;
              if (this._abortLoading) {
                this._abortLoading();
              }
              this._updateLevels();
              this._resetGrid();
              if (tileZoom !== void 0) {
                this._update(center);
              }
              if (!noPrune) {
                this._pruneTiles();
              }
              this._noPrune = !!noPrune;
            }
            this._setZoomTransforms(center, zoom2);
          },
          _setZoomTransforms: function(center, zoom2) {
            for (var i in this._levels) {
              this._setZoomTransform(this._levels[i], center, zoom2);
            }
          },
          _setZoomTransform: function(level, center, zoom2) {
            var scale2 = this._map.getZoomScale(zoom2, level.zoom), translate = level.origin.multiplyBy(scale2).subtract(this._map._getNewPixelOrigin(center, zoom2)).round();
            if (Browser.any3d) {
              setTransform(level.el, translate, scale2);
            } else {
              setPosition(level.el, translate);
            }
          },
          _resetGrid: function() {
            var map2 = this._map, crs = map2.options.crs, tileSize = this._tileSize = this.getTileSize(), tileZoom = this._tileZoom;
            var bounds = this._map.getPixelWorldBounds(this._tileZoom);
            if (bounds) {
              this._globalTileRange = this._pxBoundsToTileRange(bounds);
            }
            this._wrapX = crs.wrapLng && !this.options.noWrap && [
              Math.floor(map2.project([0, crs.wrapLng[0]], tileZoom).x / tileSize.x),
              Math.ceil(map2.project([0, crs.wrapLng[1]], tileZoom).x / tileSize.y)
            ];
            this._wrapY = crs.wrapLat && !this.options.noWrap && [
              Math.floor(map2.project([crs.wrapLat[0], 0], tileZoom).y / tileSize.x),
              Math.ceil(map2.project([crs.wrapLat[1], 0], tileZoom).y / tileSize.y)
            ];
          },
          _onMoveEnd: function() {
            if (!this._map || this._map._animatingZoom) {
              return;
            }
            this._update();
          },
          _getTiledPixelBounds: function(center) {
            var map2 = this._map, mapZoom = map2._animatingZoom ? Math.max(map2._animateToZoom, map2.getZoom()) : map2.getZoom(), scale2 = map2.getZoomScale(mapZoom, this._tileZoom), pixelCenter = map2.project(center, this._tileZoom).floor(), halfSize = map2.getSize().divideBy(scale2 * 2);
            return new Bounds(pixelCenter.subtract(halfSize), pixelCenter.add(halfSize));
          },
          // Private method to load tiles in the grid's active zoom level according to map bounds
          _update: function(center) {
            var map2 = this._map;
            if (!map2) {
              return;
            }
            var zoom2 = this._clampZoom(map2.getZoom());
            if (center === void 0) {
              center = map2.getCenter();
            }
            if (this._tileZoom === void 0) {
              return;
            }
            var pixelBounds = this._getTiledPixelBounds(center), tileRange = this._pxBoundsToTileRange(pixelBounds), tileCenter = tileRange.getCenter(), queue = [], margin = this.options.keepBuffer, noPruneRange = new Bounds(
              tileRange.getBottomLeft().subtract([margin, -margin]),
              tileRange.getTopRight().add([margin, -margin])
            );
            if (!(isFinite(tileRange.min.x) && isFinite(tileRange.min.y) && isFinite(tileRange.max.x) && isFinite(tileRange.max.y))) {
              throw new Error("Attempted to load an infinite number of tiles");
            }
            for (var key in this._tiles) {
              var c2 = this._tiles[key].coords;
              if (c2.z !== this._tileZoom || !noPruneRange.contains(new Point(c2.x, c2.y))) {
                this._tiles[key].current = false;
              }
            }
            if (Math.abs(zoom2 - this._tileZoom) > 1) {
              this._setView(center, zoom2);
              return;
            }
            for (var j = tileRange.min.y; j <= tileRange.max.y; j++) {
              for (var i = tileRange.min.x; i <= tileRange.max.x; i++) {
                var coords = new Point(i, j);
                coords.z = this._tileZoom;
                if (!this._isValidTile(coords)) {
                  continue;
                }
                var tile = this._tiles[this._tileCoordsToKey(coords)];
                if (tile) {
                  tile.current = true;
                } else {
                  queue.push(coords);
                }
              }
            }
            queue.sort(function(a2, b) {
              return a2.distanceTo(tileCenter) - b.distanceTo(tileCenter);
            });
            if (queue.length !== 0) {
              if (!this._loading) {
                this._loading = true;
                this.fire("loading");
              }
              var fragment = document.createDocumentFragment();
              for (i = 0; i < queue.length; i++) {
                this._addTile(queue[i], fragment);
              }
              this._level.el.appendChild(fragment);
            }
          },
          _isValidTile: function(coords) {
            var crs = this._map.options.crs;
            if (!crs.infinite) {
              var bounds = this._globalTileRange;
              if (!crs.wrapLng && (coords.x < bounds.min.x || coords.x > bounds.max.x) || !crs.wrapLat && (coords.y < bounds.min.y || coords.y > bounds.max.y)) {
                return false;
              }
            }
            if (!this.options.bounds) {
              return true;
            }
            var tileBounds = this._tileCoordsToBounds(coords);
            return toLatLngBounds(this.options.bounds).overlaps(tileBounds);
          },
          _keyToBounds: function(key) {
            return this._tileCoordsToBounds(this._keyToTileCoords(key));
          },
          _tileCoordsToNwSe: function(coords) {
            var map2 = this._map, tileSize = this.getTileSize(), nwPoint = coords.scaleBy(tileSize), sePoint = nwPoint.add(tileSize), nw = map2.unproject(nwPoint, coords.z), se = map2.unproject(sePoint, coords.z);
            return [nw, se];
          },
          // converts tile coordinates to its geographical bounds
          _tileCoordsToBounds: function(coords) {
            var bp = this._tileCoordsToNwSe(coords), bounds = new LatLngBounds(bp[0], bp[1]);
            if (!this.options.noWrap) {
              bounds = this._map.wrapLatLngBounds(bounds);
            }
            return bounds;
          },
          // converts tile coordinates to key for the tile cache
          _tileCoordsToKey: function(coords) {
            return coords.x + ":" + coords.y + ":" + coords.z;
          },
          // converts tile cache key to coordinates
          _keyToTileCoords: function(key) {
            var k = key.split(":"), coords = new Point(+k[0], +k[1]);
            coords.z = +k[2];
            return coords;
          },
          _removeTile: function(key) {
            var tile = this._tiles[key];
            if (!tile) {
              return;
            }
            remove2(tile.el);
            delete this._tiles[key];
            this.fire("tileunload", {
              tile: tile.el,
              coords: this._keyToTileCoords(key)
            });
          },
          _initTile: function(tile) {
            addClass(tile, "leaflet-tile");
            var tileSize = this.getTileSize();
            tile.style.width = tileSize.x + "px";
            tile.style.height = tileSize.y + "px";
            tile.onselectstart = falseFn;
            tile.onmousemove = falseFn;
            if (Browser.ielt9 && this.options.opacity < 1) {
              setOpacity(tile, this.options.opacity);
            }
          },
          _addTile: function(coords, container) {
            var tilePos = this._getTilePos(coords), key = this._tileCoordsToKey(coords);
            var tile = this.createTile(this._wrapCoords(coords), bind(this._tileReady, this, coords));
            this._initTile(tile);
            if (this.createTile.length < 2) {
              requestAnimFrame(bind(this._tileReady, this, coords, null, tile));
            }
            setPosition(tile, tilePos);
            this._tiles[key] = {
              el: tile,
              coords,
              current: true
            };
            container.appendChild(tile);
            this.fire("tileloadstart", {
              tile,
              coords
            });
          },
          _tileReady: function(coords, err, tile) {
            if (err) {
              this.fire("tileerror", {
                error: err,
                tile,
                coords
              });
            }
            var key = this._tileCoordsToKey(coords);
            tile = this._tiles[key];
            if (!tile) {
              return;
            }
            tile.loaded = +/* @__PURE__ */ new Date();
            if (this._map._fadeAnimated) {
              setOpacity(tile.el, 0);
              cancelAnimFrame(this._fadeFrame);
              this._fadeFrame = requestAnimFrame(this._updateOpacity, this);
            } else {
              tile.active = true;
              this._pruneTiles();
            }
            if (!err) {
              addClass(tile.el, "leaflet-tile-loaded");
              this.fire("tileload", {
                tile: tile.el,
                coords
              });
            }
            if (this._noTilesToLoad()) {
              this._loading = false;
              this.fire("load");
              if (Browser.ielt9 || !this._map._fadeAnimated) {
                requestAnimFrame(this._pruneTiles, this);
              } else {
                setTimeout(bind(this._pruneTiles, this), 250);
              }
            }
          },
          _getTilePos: function(coords) {
            return coords.scaleBy(this.getTileSize()).subtract(this._level.origin);
          },
          _wrapCoords: function(coords) {
            var newCoords = new Point(
              this._wrapX ? wrapNum(coords.x, this._wrapX) : coords.x,
              this._wrapY ? wrapNum(coords.y, this._wrapY) : coords.y
            );
            newCoords.z = coords.z;
            return newCoords;
          },
          _pxBoundsToTileRange: function(bounds) {
            var tileSize = this.getTileSize();
            return new Bounds(
              bounds.min.unscaleBy(tileSize).floor(),
              bounds.max.unscaleBy(tileSize).ceil().subtract([1, 1])
            );
          },
          _noTilesToLoad: function() {
            for (var key in this._tiles) {
              if (!this._tiles[key].loaded) {
                return false;
              }
            }
            return true;
          }
        });
        function gridLayer(options) {
          return new GridLayer(options);
        }
        var TileLayer2 = GridLayer.extend({
          // @section
          // @aka TileLayer options
          options: {
            // @option minZoom: Number = 0
            // The minimum zoom level down to which this layer will be displayed (inclusive).
            minZoom: 0,
            // @option maxZoom: Number = 18
            // The maximum zoom level up to which this layer will be displayed (inclusive).
            maxZoom: 18,
            // @option subdomains: String|String[] = 'abc'
            // Subdomains of the tile service. Can be passed in the form of one string (where each letter is a subdomain name) or an array of strings.
            subdomains: "abc",
            // @option errorTileUrl: String = ''
            // URL to the tile image to show in place of the tile that failed to load.
            errorTileUrl: "",
            // @option zoomOffset: Number = 0
            // The zoom number used in tile URLs will be offset with this value.
            zoomOffset: 0,
            // @option tms: Boolean = false
            // If `true`, inverses Y axis numbering for tiles (turn this on for [TMS](https://en.wikipedia.org/wiki/Tile_Map_Service) services).
            tms: false,
            // @option zoomReverse: Boolean = false
            // If set to true, the zoom number used in tile URLs will be reversed (`maxZoom - zoom` instead of `zoom`)
            zoomReverse: false,
            // @option detectRetina: Boolean = false
            // If `true` and user is on a retina display, it will request four tiles of half the specified size and a bigger zoom level in place of one to utilize the high resolution.
            detectRetina: false,
            // @option crossOrigin: Boolean|String = false
            // Whether the crossOrigin attribute will be added to the tiles.
            // If a String is provided, all tiles will have their crossOrigin attribute set to the String provided. This is needed if you want to access tile pixel data.
            // Refer to [CORS Settings](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes) for valid String values.
            crossOrigin: false,
            // @option referrerPolicy: Boolean|String = false
            // Whether the referrerPolicy attribute will be added to the tiles.
            // If a String is provided, all tiles will have their referrerPolicy attribute set to the String provided.
            // This may be needed if your map's rendering context has a strict default but your tile provider expects a valid referrer
            // (e.g. to validate an API token).
            // Refer to [HTMLImageElement.referrerPolicy](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/referrerPolicy) for valid String values.
            referrerPolicy: false
          },
          initialize: function(url, options) {
            this._url = url;
            options = setOptions(this, options);
            if (options.detectRetina && Browser.retina && options.maxZoom > 0) {
              options.tileSize = Math.floor(options.tileSize / 2);
              if (!options.zoomReverse) {
                options.zoomOffset++;
                options.maxZoom = Math.max(options.minZoom, options.maxZoom - 1);
              } else {
                options.zoomOffset--;
                options.minZoom = Math.min(options.maxZoom, options.minZoom + 1);
              }
              options.minZoom = Math.max(0, options.minZoom);
            } else if (!options.zoomReverse) {
              options.maxZoom = Math.max(options.minZoom, options.maxZoom);
            } else {
              options.minZoom = Math.min(options.maxZoom, options.minZoom);
            }
            if (typeof options.subdomains === "string") {
              options.subdomains = options.subdomains.split("");
            }
            this.on("tileunload", this._onTileRemove);
          },
          // @method setUrl(url: String, noRedraw?: Boolean): this
          // Updates the layer's URL template and redraws it (unless `noRedraw` is set to `true`).
          // If the URL does not change, the layer will not be redrawn unless
          // the noRedraw parameter is set to false.
          setUrl: function(url, noRedraw) {
            if (this._url === url && noRedraw === void 0) {
              noRedraw = true;
            }
            this._url = url;
            if (!noRedraw) {
              this.redraw();
            }
            return this;
          },
          // @method createTile(coords: Object, done?: Function): HTMLElement
          // Called only internally, overrides GridLayer's [`createTile()`](#gridlayer-createtile)
          // to return an `<img>` HTML element with the appropriate image URL given `coords`. The `done`
          // callback is called when the tile has been loaded.
          createTile: function(coords, done) {
            var tile = document.createElement("img");
            on(tile, "load", bind(this._tileOnLoad, this, done, tile));
            on(tile, "error", bind(this._tileOnError, this, done, tile));
            if (this.options.crossOrigin || this.options.crossOrigin === "") {
              tile.crossOrigin = this.options.crossOrigin === true ? "" : this.options.crossOrigin;
            }
            if (typeof this.options.referrerPolicy === "string") {
              tile.referrerPolicy = this.options.referrerPolicy;
            }
            tile.alt = "";
            tile.src = this.getTileUrl(coords);
            return tile;
          },
          // @section Extension methods
          // @uninheritable
          // Layers extending `TileLayer` might reimplement the following method.
          // @method getTileUrl(coords: Object): String
          // Called only internally, returns the URL for a tile given its coordinates.
          // Classes extending `TileLayer` can override this function to provide custom tile URL naming schemes.
          getTileUrl: function(coords) {
            var data = {
              r: Browser.retina ? "@2x" : "",
              s: this._getSubdomain(coords),
              x: coords.x,
              y: coords.y,
              z: this._getZoomForUrl()
            };
            if (this._map && !this._map.options.crs.infinite) {
              var invertedY = this._globalTileRange.max.y - coords.y;
              if (this.options.tms) {
                data["y"] = invertedY;
              }
              data["-y"] = invertedY;
            }
            return template(this._url, extend2(data, this.options));
          },
          _tileOnLoad: function(done, tile) {
            if (Browser.ielt9) {
              setTimeout(bind(done, this, null, tile), 0);
            } else {
              done(null, tile);
            }
          },
          _tileOnError: function(done, tile, e) {
            var errorUrl = this.options.errorTileUrl;
            if (errorUrl && tile.getAttribute("src") !== errorUrl) {
              tile.src = errorUrl;
            }
            done(e, tile);
          },
          _onTileRemove: function(e) {
            e.tile.onload = null;
          },
          _getZoomForUrl: function() {
            var zoom2 = this._tileZoom, maxZoom = this.options.maxZoom, zoomReverse = this.options.zoomReverse, zoomOffset = this.options.zoomOffset;
            if (zoomReverse) {
              zoom2 = maxZoom - zoom2;
            }
            return zoom2 + zoomOffset;
          },
          _getSubdomain: function(tilePoint) {
            var index3 = Math.abs(tilePoint.x + tilePoint.y) % this.options.subdomains.length;
            return this.options.subdomains[index3];
          },
          // stops loading all tiles in the background layer
          _abortLoading: function() {
            var i, tile;
            for (i in this._tiles) {
              if (this._tiles[i].coords.z !== this._tileZoom) {
                tile = this._tiles[i].el;
                tile.onload = falseFn;
                tile.onerror = falseFn;
                if (!tile.complete) {
                  tile.src = emptyImageUrl;
                  var coords = this._tiles[i].coords;
                  remove2(tile);
                  delete this._tiles[i];
                  this.fire("tileabort", {
                    tile,
                    coords
                  });
                }
              }
            }
          },
          _removeTile: function(key) {
            var tile = this._tiles[key];
            if (!tile) {
              return;
            }
            tile.el.setAttribute("src", emptyImageUrl);
            return GridLayer.prototype._removeTile.call(this, key);
          },
          _tileReady: function(coords, err, tile) {
            if (!this._map || tile && tile.getAttribute("src") === emptyImageUrl) {
              return;
            }
            return GridLayer.prototype._tileReady.call(this, coords, err, tile);
          }
        });
        function tileLayer(url, options) {
          return new TileLayer2(url, options);
        }
        var TileLayerWMS = TileLayer2.extend({
          // @section
          // @aka TileLayer.WMS options
          // If any custom options not documented here are used, they will be sent to the
          // WMS server as extra parameters in each request URL. This can be useful for
          // [non-standard vendor WMS parameters](https://docs.geoserver.org/stable/en/user/services/wms/vendor.html).
          defaultWmsParams: {
            service: "WMS",
            request: "GetMap",
            // @option layers: String = ''
            // **(required)** Comma-separated list of WMS layers to show.
            layers: "",
            // @option styles: String = ''
            // Comma-separated list of WMS styles.
            styles: "",
            // @option format: String = 'image/jpeg'
            // WMS image format (use `'image/png'` for layers with transparency).
            format: "image/jpeg",
            // @option transparent: Boolean = false
            // If `true`, the WMS service will return images with transparency.
            transparent: false,
            // @option version: String = '1.1.1'
            // Version of the WMS service to use
            version: "1.1.1"
          },
          options: {
            // @option crs: CRS = null
            // Coordinate Reference System to use for the WMS requests, defaults to
            // map CRS. Don't change this if you're not sure what it means.
            crs: null,
            // @option uppercase: Boolean = false
            // If `true`, WMS request parameter keys will be uppercase.
            uppercase: false
          },
          initialize: function(url, options) {
            this._url = url;
            var wmsParams = extend2({}, this.defaultWmsParams);
            for (var i in options) {
              if (!(i in this.options)) {
                wmsParams[i] = options[i];
              }
            }
            options = setOptions(this, options);
            var realRetina = options.detectRetina && Browser.retina ? 2 : 1;
            var tileSize = this.getTileSize();
            wmsParams.width = tileSize.x * realRetina;
            wmsParams.height = tileSize.y * realRetina;
            this.wmsParams = wmsParams;
          },
          onAdd: function(map2) {
            this._crs = this.options.crs || map2.options.crs;
            this._wmsVersion = parseFloat(this.wmsParams.version);
            var projectionKey = this._wmsVersion >= 1.3 ? "crs" : "srs";
            this.wmsParams[projectionKey] = this._crs.code;
            TileLayer2.prototype.onAdd.call(this, map2);
          },
          getTileUrl: function(coords) {
            var tileBounds = this._tileCoordsToNwSe(coords), crs = this._crs, bounds = toBounds(crs.project(tileBounds[0]), crs.project(tileBounds[1])), min = bounds.min, max = bounds.max, bbox = (this._wmsVersion >= 1.3 && this._crs === EPSG4326 ? [min.y, min.x, max.y, max.x] : [min.x, min.y, max.x, max.y]).join(","), url = TileLayer2.prototype.getTileUrl.call(this, coords);
            return url + getParamString(this.wmsParams, url, this.options.uppercase) + (this.options.uppercase ? "&BBOX=" : "&bbox=") + bbox;
          },
          // @method setParams(params: Object, noRedraw?: Boolean): this
          // Merges an object with the new parameters and re-requests tiles on the current screen (unless `noRedraw` was set to true).
          setParams: function(params, noRedraw) {
            extend2(this.wmsParams, params);
            if (!noRedraw) {
              this.redraw();
            }
            return this;
          }
        });
        function tileLayerWMS(url, options) {
          return new TileLayerWMS(url, options);
        }
        TileLayer2.WMS = TileLayerWMS;
        tileLayer.wms = tileLayerWMS;
        var Renderer = Layer.extend({
          // @section
          // @aka Renderer options
          options: {
            // @option padding: Number = 0.1
            // How much to extend the clip area around the map view (relative to its size)
            // e.g. 0.1 would be 10% of map view in each direction
            padding: 0.1
          },
          initialize: function(options) {
            setOptions(this, options);
            stamp(this);
            this._layers = this._layers || {};
          },
          onAdd: function() {
            if (!this._container) {
              this._initContainer();
              addClass(this._container, "leaflet-zoom-animated");
            }
            this.getPane().appendChild(this._container);
            this._update();
            this.on("update", this._updatePaths, this);
          },
          onRemove: function() {
            this.off("update", this._updatePaths, this);
            this._destroyContainer();
          },
          getEvents: function() {
            var events = {
              viewreset: this._reset,
              zoom: this._onZoom,
              moveend: this._update,
              zoomend: this._onZoomEnd
            };
            if (this._zoomAnimated) {
              events.zoomanim = this._onAnimZoom;
            }
            return events;
          },
          _onAnimZoom: function(ev) {
            this._updateTransform(ev.center, ev.zoom);
          },
          _onZoom: function() {
            this._updateTransform(this._map.getCenter(), this._map.getZoom());
          },
          _updateTransform: function(center, zoom2) {
            var scale2 = this._map.getZoomScale(zoom2, this._zoom), viewHalf = this._map.getSize().multiplyBy(0.5 + this.options.padding), currentCenterPoint = this._map.project(this._center, zoom2), topLeftOffset = viewHalf.multiplyBy(-scale2).add(currentCenterPoint).subtract(this._map._getNewPixelOrigin(center, zoom2));
            if (Browser.any3d) {
              setTransform(this._container, topLeftOffset, scale2);
            } else {
              setPosition(this._container, topLeftOffset);
            }
          },
          _reset: function() {
            this._update();
            this._updateTransform(this._center, this._zoom);
            for (var id2 in this._layers) {
              this._layers[id2]._reset();
            }
          },
          _onZoomEnd: function() {
            for (var id2 in this._layers) {
              this._layers[id2]._project();
            }
          },
          _updatePaths: function() {
            for (var id2 in this._layers) {
              this._layers[id2]._update();
            }
          },
          _update: function() {
            var p = this.options.padding, size = this._map.getSize(), min = this._map.containerPointToLayerPoint(size.multiplyBy(-p)).round();
            this._bounds = new Bounds(min, min.add(size.multiplyBy(1 + p * 2)).round());
            this._center = this._map.getCenter();
            this._zoom = this._map.getZoom();
          }
        });
        var Canvas = Renderer.extend({
          // @section
          // @aka Canvas options
          options: {
            // @option tolerance: Number = 0
            // How much to extend the click tolerance around a path/object on the map.
            tolerance: 0
          },
          getEvents: function() {
            var events = Renderer.prototype.getEvents.call(this);
            events.viewprereset = this._onViewPreReset;
            return events;
          },
          _onViewPreReset: function() {
            this._postponeUpdatePaths = true;
          },
          onAdd: function() {
            Renderer.prototype.onAdd.call(this);
            this._draw();
          },
          _initContainer: function() {
            var container = this._container = document.createElement("canvas");
            on(container, "mousemove", this._onMouseMove, this);
            on(container, "click dblclick mousedown mouseup contextmenu", this._onClick, this);
            on(container, "mouseout", this._handleMouseOut, this);
            container["_leaflet_disable_events"] = true;
            this._ctx = container.getContext("2d");
          },
          _destroyContainer: function() {
            cancelAnimFrame(this._redrawRequest);
            delete this._ctx;
            remove2(this._container);
            off(this._container);
            delete this._container;
          },
          _updatePaths: function() {
            if (this._postponeUpdatePaths) {
              return;
            }
            var layer;
            this._redrawBounds = null;
            for (var id2 in this._layers) {
              layer = this._layers[id2];
              layer._update();
            }
            this._redraw();
          },
          _update: function() {
            if (this._map._animatingZoom && this._bounds) {
              return;
            }
            Renderer.prototype._update.call(this);
            var b = this._bounds, container = this._container, size = b.getSize(), m2 = Browser.retina ? 2 : 1;
            setPosition(container, b.min);
            container.width = m2 * size.x;
            container.height = m2 * size.y;
            container.style.width = size.x + "px";
            container.style.height = size.y + "px";
            if (Browser.retina) {
              this._ctx.scale(2, 2);
            }
            this._ctx.translate(-b.min.x, -b.min.y);
            this.fire("update");
          },
          _reset: function() {
            Renderer.prototype._reset.call(this);
            if (this._postponeUpdatePaths) {
              this._postponeUpdatePaths = false;
              this._updatePaths();
            }
          },
          _initPath: function(layer) {
            this._updateDashArray(layer);
            this._layers[stamp(layer)] = layer;
            var order = layer._order = {
              layer,
              prev: this._drawLast,
              next: null
            };
            if (this._drawLast) {
              this._drawLast.next = order;
            }
            this._drawLast = order;
            this._drawFirst = this._drawFirst || this._drawLast;
          },
          _addPath: function(layer) {
            this._requestRedraw(layer);
          },
          _removePath: function(layer) {
            var order = layer._order;
            var next = order.next;
            var prev = order.prev;
            if (next) {
              next.prev = prev;
            } else {
              this._drawLast = prev;
            }
            if (prev) {
              prev.next = next;
            } else {
              this._drawFirst = next;
            }
            delete layer._order;
            delete this._layers[stamp(layer)];
            this._requestRedraw(layer);
          },
          _updatePath: function(layer) {
            this._extendRedrawBounds(layer);
            layer._project();
            layer._update();
            this._requestRedraw(layer);
          },
          _updateStyle: function(layer) {
            this._updateDashArray(layer);
            this._requestRedraw(layer);
          },
          _updateDashArray: function(layer) {
            if (typeof layer.options.dashArray === "string") {
              var parts = layer.options.dashArray.split(/[, ]+/), dashArray = [], dashValue, i;
              for (i = 0; i < parts.length; i++) {
                dashValue = Number(parts[i]);
                if (isNaN(dashValue)) {
                  return;
                }
                dashArray.push(dashValue);
              }
              layer.options._dashArray = dashArray;
            } else {
              layer.options._dashArray = layer.options.dashArray;
            }
          },
          _requestRedraw: function(layer) {
            if (!this._map) {
              return;
            }
            this._extendRedrawBounds(layer);
            this._redrawRequest = this._redrawRequest || requestAnimFrame(this._redraw, this);
          },
          _extendRedrawBounds: function(layer) {
            if (layer._pxBounds) {
              var padding = (layer.options.weight || 0) + 1;
              this._redrawBounds = this._redrawBounds || new Bounds();
              this._redrawBounds.extend(layer._pxBounds.min.subtract([padding, padding]));
              this._redrawBounds.extend(layer._pxBounds.max.add([padding, padding]));
            }
          },
          _redraw: function() {
            this._redrawRequest = null;
            if (this._redrawBounds) {
              this._redrawBounds.min._floor();
              this._redrawBounds.max._ceil();
            }
            this._clear();
            this._draw();
            this._redrawBounds = null;
          },
          _clear: function() {
            var bounds = this._redrawBounds;
            if (bounds) {
              var size = bounds.getSize();
              this._ctx.clearRect(bounds.min.x, bounds.min.y, size.x, size.y);
            } else {
              this._ctx.save();
              this._ctx.setTransform(1, 0, 0, 1, 0, 0);
              this._ctx.clearRect(0, 0, this._container.width, this._container.height);
              this._ctx.restore();
            }
          },
          _draw: function() {
            var layer, bounds = this._redrawBounds;
            this._ctx.save();
            if (bounds) {
              var size = bounds.getSize();
              this._ctx.beginPath();
              this._ctx.rect(bounds.min.x, bounds.min.y, size.x, size.y);
              this._ctx.clip();
            }
            this._drawing = true;
            for (var order = this._drawFirst; order; order = order.next) {
              layer = order.layer;
              if (!bounds || layer._pxBounds && layer._pxBounds.intersects(bounds)) {
                layer._updatePath();
              }
            }
            this._drawing = false;
            this._ctx.restore();
          },
          _updatePoly: function(layer, closed) {
            if (!this._drawing) {
              return;
            }
            var i, j, len2, p, parts = layer._parts, len = parts.length, ctx = this._ctx;
            if (!len) {
              return;
            }
            ctx.beginPath();
            for (i = 0; i < len; i++) {
              for (j = 0, len2 = parts[i].length; j < len2; j++) {
                p = parts[i][j];
                ctx[j ? "lineTo" : "moveTo"](p.x, p.y);
              }
              if (closed) {
                ctx.closePath();
              }
            }
            this._fillStroke(ctx, layer);
          },
          _updateCircle: function(layer) {
            if (!this._drawing || layer._empty()) {
              return;
            }
            var p = layer._point, ctx = this._ctx, r = Math.max(Math.round(layer._radius), 1), s = (Math.max(Math.round(layer._radiusY), 1) || r) / r;
            if (s !== 1) {
              ctx.save();
              ctx.scale(1, s);
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y / s, r, 0, Math.PI * 2, false);
            if (s !== 1) {
              ctx.restore();
            }
            this._fillStroke(ctx, layer);
          },
          _fillStroke: function(ctx, layer) {
            var options = layer.options;
            if (options.fill) {
              ctx.globalAlpha = options.fillOpacity;
              ctx.fillStyle = options.fillColor || options.color;
              ctx.fill(options.fillRule || "evenodd");
            }
            if (options.stroke && options.weight !== 0) {
              if (ctx.setLineDash) {
                ctx.setLineDash(layer.options && layer.options._dashArray || []);
              }
              ctx.globalAlpha = options.opacity;
              ctx.lineWidth = options.weight;
              ctx.strokeStyle = options.color;
              ctx.lineCap = options.lineCap;
              ctx.lineJoin = options.lineJoin;
              ctx.stroke();
            }
          },
          // Canvas obviously doesn't have mouse events for individual drawn objects,
          // so we emulate that by calculating what's under the mouse on mousemove/click manually
          _onClick: function(e) {
            var point = this._map.mouseEventToLayerPoint(e), layer, clickedLayer;
            for (var order = this._drawFirst; order; order = order.next) {
              layer = order.layer;
              if (layer.options.interactive && layer._containsPoint(point)) {
                if (!(e.type === "click" || e.type === "preclick") || !this._map._draggableMoved(layer)) {
                  clickedLayer = layer;
                }
              }
            }
            this._fireEvent(clickedLayer ? [clickedLayer] : false, e);
          },
          _onMouseMove: function(e) {
            if (!this._map || this._map.dragging.moving() || this._map._animatingZoom) {
              return;
            }
            var point = this._map.mouseEventToLayerPoint(e);
            this._handleMouseHover(e, point);
          },
          _handleMouseOut: function(e) {
            var layer = this._hoveredLayer;
            if (layer) {
              removeClass(this._container, "leaflet-interactive");
              this._fireEvent([layer], e, "mouseout");
              this._hoveredLayer = null;
              this._mouseHoverThrottled = false;
            }
          },
          _handleMouseHover: function(e, point) {
            if (this._mouseHoverThrottled) {
              return;
            }
            var layer, candidateHoveredLayer;
            for (var order = this._drawFirst; order; order = order.next) {
              layer = order.layer;
              if (layer.options.interactive && layer._containsPoint(point)) {
                candidateHoveredLayer = layer;
              }
            }
            if (candidateHoveredLayer !== this._hoveredLayer) {
              this._handleMouseOut(e);
              if (candidateHoveredLayer) {
                addClass(this._container, "leaflet-interactive");
                this._fireEvent([candidateHoveredLayer], e, "mouseover");
                this._hoveredLayer = candidateHoveredLayer;
              }
            }
            this._fireEvent(this._hoveredLayer ? [this._hoveredLayer] : false, e);
            this._mouseHoverThrottled = true;
            setTimeout(bind(function() {
              this._mouseHoverThrottled = false;
            }, this), 32);
          },
          _fireEvent: function(layers2, e, type) {
            this._map._fireDOMEvent(e, type || e.type, layers2);
          },
          _bringToFront: function(layer) {
            var order = layer._order;
            if (!order) {
              return;
            }
            var next = order.next;
            var prev = order.prev;
            if (next) {
              next.prev = prev;
            } else {
              return;
            }
            if (prev) {
              prev.next = next;
            } else if (next) {
              this._drawFirst = next;
            }
            order.prev = this._drawLast;
            this._drawLast.next = order;
            order.next = null;
            this._drawLast = order;
            this._requestRedraw(layer);
          },
          _bringToBack: function(layer) {
            var order = layer._order;
            if (!order) {
              return;
            }
            var next = order.next;
            var prev = order.prev;
            if (prev) {
              prev.next = next;
            } else {
              return;
            }
            if (next) {
              next.prev = prev;
            } else if (prev) {
              this._drawLast = prev;
            }
            order.prev = null;
            order.next = this._drawFirst;
            this._drawFirst.prev = order;
            this._drawFirst = order;
            this._requestRedraw(layer);
          }
        });
        function canvas(options) {
          return Browser.canvas ? new Canvas(options) : null;
        }
        var vmlCreate = (function() {
          try {
            document.namespaces.add("lvml", "urn:schemas-microsoft-com:vml");
            return function(name) {
              return document.createElement("<lvml:" + name + ' class="lvml">');
            };
          } catch (e) {
          }
          return function(name) {
            return document.createElement("<" + name + ' xmlns="urn:schemas-microsoft.com:vml" class="lvml">');
          };
        })();
        var vmlMixin = {
          _initContainer: function() {
            this._container = create$1("div", "leaflet-vml-container");
          },
          _update: function() {
            if (this._map._animatingZoom) {
              return;
            }
            Renderer.prototype._update.call(this);
            this.fire("update");
          },
          _initPath: function(layer) {
            var container = layer._container = vmlCreate("shape");
            addClass(container, "leaflet-vml-shape " + (this.options.className || ""));
            container.coordsize = "1 1";
            layer._path = vmlCreate("path");
            container.appendChild(layer._path);
            this._updateStyle(layer);
            this._layers[stamp(layer)] = layer;
          },
          _addPath: function(layer) {
            var container = layer._container;
            this._container.appendChild(container);
            if (layer.options.interactive) {
              layer.addInteractiveTarget(container);
            }
          },
          _removePath: function(layer) {
            var container = layer._container;
            remove2(container);
            layer.removeInteractiveTarget(container);
            delete this._layers[stamp(layer)];
          },
          _updateStyle: function(layer) {
            var stroke = layer._stroke, fill = layer._fill, options = layer.options, container = layer._container;
            container.stroked = !!options.stroke;
            container.filled = !!options.fill;
            if (options.stroke) {
              if (!stroke) {
                stroke = layer._stroke = vmlCreate("stroke");
              }
              container.appendChild(stroke);
              stroke.weight = options.weight + "px";
              stroke.color = options.color;
              stroke.opacity = options.opacity;
              if (options.dashArray) {
                stroke.dashStyle = isArray2(options.dashArray) ? options.dashArray.join(" ") : options.dashArray.replace(/( *, *)/g, " ");
              } else {
                stroke.dashStyle = "";
              }
              stroke.endcap = options.lineCap.replace("butt", "flat");
              stroke.joinstyle = options.lineJoin;
            } else if (stroke) {
              container.removeChild(stroke);
              layer._stroke = null;
            }
            if (options.fill) {
              if (!fill) {
                fill = layer._fill = vmlCreate("fill");
              }
              container.appendChild(fill);
              fill.color = options.fillColor || options.color;
              fill.opacity = options.fillOpacity;
            } else if (fill) {
              container.removeChild(fill);
              layer._fill = null;
            }
          },
          _updateCircle: function(layer) {
            var p = layer._point.round(), r = Math.round(layer._radius), r2 = Math.round(layer._radiusY || r);
            this._setPath(layer, layer._empty() ? "M0 0" : "AL " + p.x + "," + p.y + " " + r + "," + r2 + " 0," + 65535 * 360);
          },
          _setPath: function(layer, path) {
            layer._path.v = path;
          },
          _bringToFront: function(layer) {
            toFront(layer._container);
          },
          _bringToBack: function(layer) {
            toBack(layer._container);
          }
        };
        var create3 = Browser.vml ? vmlCreate : svgCreate;
        var SVG = Renderer.extend({
          _initContainer: function() {
            this._container = create3("svg");
            this._container.setAttribute("pointer-events", "none");
            this._rootGroup = create3("g");
            this._container.appendChild(this._rootGroup);
          },
          _destroyContainer: function() {
            remove2(this._container);
            off(this._container);
            delete this._container;
            delete this._rootGroup;
            delete this._svgSize;
          },
          _update: function() {
            if (this._map._animatingZoom && this._bounds) {
              return;
            }
            Renderer.prototype._update.call(this);
            var b = this._bounds, size = b.getSize(), container = this._container;
            if (!this._svgSize || !this._svgSize.equals(size)) {
              this._svgSize = size;
              container.setAttribute("width", size.x);
              container.setAttribute("height", size.y);
            }
            setPosition(container, b.min);
            container.setAttribute("viewBox", [b.min.x, b.min.y, size.x, size.y].join(" "));
            this.fire("update");
          },
          // methods below are called by vector layers implementations
          _initPath: function(layer) {
            var path = layer._path = create3("path");
            if (layer.options.className) {
              addClass(path, layer.options.className);
            }
            if (layer.options.interactive) {
              addClass(path, "leaflet-interactive");
            }
            this._updateStyle(layer);
            this._layers[stamp(layer)] = layer;
          },
          _addPath: function(layer) {
            if (!this._rootGroup) {
              this._initContainer();
            }
            this._rootGroup.appendChild(layer._path);
            layer.addInteractiveTarget(layer._path);
          },
          _removePath: function(layer) {
            remove2(layer._path);
            layer.removeInteractiveTarget(layer._path);
            delete this._layers[stamp(layer)];
          },
          _updatePath: function(layer) {
            layer._project();
            layer._update();
          },
          _updateStyle: function(layer) {
            var path = layer._path, options = layer.options;
            if (!path) {
              return;
            }
            if (options.stroke) {
              path.setAttribute("stroke", options.color);
              path.setAttribute("stroke-opacity", options.opacity);
              path.setAttribute("stroke-width", options.weight);
              path.setAttribute("stroke-linecap", options.lineCap);
              path.setAttribute("stroke-linejoin", options.lineJoin);
              if (options.dashArray) {
                path.setAttribute("stroke-dasharray", options.dashArray);
              } else {
                path.removeAttribute("stroke-dasharray");
              }
              if (options.dashOffset) {
                path.setAttribute("stroke-dashoffset", options.dashOffset);
              } else {
                path.removeAttribute("stroke-dashoffset");
              }
            } else {
              path.setAttribute("stroke", "none");
            }
            if (options.fill) {
              path.setAttribute("fill", options.fillColor || options.color);
              path.setAttribute("fill-opacity", options.fillOpacity);
              path.setAttribute("fill-rule", options.fillRule || "evenodd");
            } else {
              path.setAttribute("fill", "none");
            }
          },
          _updatePoly: function(layer, closed) {
            this._setPath(layer, pointsToPath(layer._parts, closed));
          },
          _updateCircle: function(layer) {
            var p = layer._point, r = Math.max(Math.round(layer._radius), 1), r2 = Math.max(Math.round(layer._radiusY), 1) || r, arc = "a" + r + "," + r2 + " 0 1,0 ";
            var d = layer._empty() ? "M0 0" : "M" + (p.x - r) + "," + p.y + arc + r * 2 + ",0 " + arc + -r * 2 + ",0 ";
            this._setPath(layer, d);
          },
          _setPath: function(layer, path) {
            layer._path.setAttribute("d", path);
          },
          // SVG does not have the concept of zIndex so we resort to changing the DOM order of elements
          _bringToFront: function(layer) {
            toFront(layer._path);
          },
          _bringToBack: function(layer) {
            toBack(layer._path);
          }
        });
        if (Browser.vml) {
          SVG.include(vmlMixin);
        }
        function svg(options) {
          return Browser.svg || Browser.vml ? new SVG(options) : null;
        }
        Map2.include({
          // @namespace Map; @method getRenderer(layer: Path): Renderer
          // Returns the instance of `Renderer` that should be used to render the given
          // `Path`. It will ensure that the `renderer` options of the map and paths
          // are respected, and that the renderers do exist on the map.
          getRenderer: function(layer) {
            var renderer = layer.options.renderer || this._getPaneRenderer(layer.options.pane) || this.options.renderer || this._renderer;
            if (!renderer) {
              renderer = this._renderer = this._createRenderer();
            }
            if (!this.hasLayer(renderer)) {
              this.addLayer(renderer);
            }
            return renderer;
          },
          _getPaneRenderer: function(name) {
            if (name === "overlayPane" || name === void 0) {
              return false;
            }
            var renderer = this._paneRenderers[name];
            if (renderer === void 0) {
              renderer = this._createRenderer({ pane: name });
              this._paneRenderers[name] = renderer;
            }
            return renderer;
          },
          _createRenderer: function(options) {
            return this.options.preferCanvas && canvas(options) || svg(options);
          }
        });
        var Rectangle = Polygon.extend({
          initialize: function(latLngBounds2, options) {
            Polygon.prototype.initialize.call(this, this._boundsToLatLngs(latLngBounds2), options);
          },
          // @method setBounds(latLngBounds: LatLngBounds): this
          // Redraws the rectangle with the passed bounds.
          setBounds: function(latLngBounds2) {
            return this.setLatLngs(this._boundsToLatLngs(latLngBounds2));
          },
          _boundsToLatLngs: function(latLngBounds2) {
            latLngBounds2 = toLatLngBounds(latLngBounds2);
            return [
              latLngBounds2.getSouthWest(),
              latLngBounds2.getNorthWest(),
              latLngBounds2.getNorthEast(),
              latLngBounds2.getSouthEast()
            ];
          }
        });
        function rectangle(latLngBounds2, options) {
          return new Rectangle(latLngBounds2, options);
        }
        SVG.create = create3;
        SVG.pointsToPath = pointsToPath;
        GeoJSON.geometryToLayer = geometryToLayer;
        GeoJSON.coordsToLatLng = coordsToLatLng;
        GeoJSON.coordsToLatLngs = coordsToLatLngs;
        GeoJSON.latLngToCoords = latLngToCoords;
        GeoJSON.latLngsToCoords = latLngsToCoords;
        GeoJSON.getFeature = getFeature;
        GeoJSON.asFeature = asFeature;
        Map2.mergeOptions({
          // @option boxZoom: Boolean = true
          // Whether the map can be zoomed to a rectangular area specified by
          // dragging the mouse while pressing the shift key.
          boxZoom: true
        });
        var BoxZoom = Handler.extend({
          initialize: function(map2) {
            this._map = map2;
            this._container = map2._container;
            this._pane = map2._panes.overlayPane;
            this._resetStateTimeout = 0;
            map2.on("unload", this._destroy, this);
          },
          addHooks: function() {
            on(this._container, "mousedown", this._onMouseDown, this);
          },
          removeHooks: function() {
            off(this._container, "mousedown", this._onMouseDown, this);
          },
          moved: function() {
            return this._moved;
          },
          _destroy: function() {
            remove2(this._pane);
            delete this._pane;
          },
          _resetState: function() {
            this._resetStateTimeout = 0;
            this._moved = false;
          },
          _clearDeferredResetState: function() {
            if (this._resetStateTimeout !== 0) {
              clearTimeout(this._resetStateTimeout);
              this._resetStateTimeout = 0;
            }
          },
          _onMouseDown: function(e) {
            if (!e.shiftKey || e.which !== 1 && e.button !== 1) {
              return false;
            }
            this._clearDeferredResetState();
            this._resetState();
            disableTextSelection();
            disableImageDrag();
            this._startPoint = this._map.mouseEventToContainerPoint(e);
            on(document, {
              contextmenu: stop,
              mousemove: this._onMouseMove,
              mouseup: this._onMouseUp,
              keydown: this._onKeyDown
            }, this);
          },
          _onMouseMove: function(e) {
            if (!this._moved) {
              this._moved = true;
              this._box = create$1("div", "leaflet-zoom-box", this._container);
              addClass(this._container, "leaflet-crosshair");
              this._map.fire("boxzoomstart");
            }
            this._point = this._map.mouseEventToContainerPoint(e);
            var bounds = new Bounds(this._point, this._startPoint), size = bounds.getSize();
            setPosition(this._box, bounds.min);
            this._box.style.width = size.x + "px";
            this._box.style.height = size.y + "px";
          },
          _finish: function() {
            if (this._moved) {
              remove2(this._box);
              removeClass(this._container, "leaflet-crosshair");
            }
            enableTextSelection();
            enableImageDrag();
            off(document, {
              contextmenu: stop,
              mousemove: this._onMouseMove,
              mouseup: this._onMouseUp,
              keydown: this._onKeyDown
            }, this);
          },
          _onMouseUp: function(e) {
            if (e.which !== 1 && e.button !== 1) {
              return;
            }
            this._finish();
            if (!this._moved) {
              return;
            }
            this._clearDeferredResetState();
            this._resetStateTimeout = setTimeout(bind(this._resetState, this), 0);
            var bounds = new LatLngBounds(
              this._map.containerPointToLatLng(this._startPoint),
              this._map.containerPointToLatLng(this._point)
            );
            this._map.fitBounds(bounds).fire("boxzoomend", { boxZoomBounds: bounds });
          },
          _onKeyDown: function(e) {
            if (e.keyCode === 27) {
              this._finish();
              this._clearDeferredResetState();
              this._resetState();
            }
          }
        });
        Map2.addInitHook("addHandler", "boxZoom", BoxZoom);
        Map2.mergeOptions({
          // @option doubleClickZoom: Boolean|String = true
          // Whether the map can be zoomed in by double clicking on it and
          // zoomed out by double clicking while holding shift. If passed
          // `'center'`, double-click zoom will zoom to the center of the
          //  view regardless of where the mouse was.
          doubleClickZoom: true
        });
        var DoubleClickZoom = Handler.extend({
          addHooks: function() {
            this._map.on("dblclick", this._onDoubleClick, this);
          },
          removeHooks: function() {
            this._map.off("dblclick", this._onDoubleClick, this);
          },
          _onDoubleClick: function(e) {
            var map2 = this._map, oldZoom = map2.getZoom(), delta = map2.options.zoomDelta, zoom2 = e.originalEvent.shiftKey ? oldZoom - delta : oldZoom + delta;
            if (map2.options.doubleClickZoom === "center") {
              map2.setZoom(zoom2);
            } else {
              map2.setZoomAround(e.containerPoint, zoom2);
            }
          }
        });
        Map2.addInitHook("addHandler", "doubleClickZoom", DoubleClickZoom);
        Map2.mergeOptions({
          // @option dragging: Boolean = true
          // Whether the map is draggable with mouse/touch or not.
          dragging: true,
          // @section Panning Inertia Options
          // @option inertia: Boolean = *
          // If enabled, panning of the map will have an inertia effect where
          // the map builds momentum while dragging and continues moving in
          // the same direction for some time. Feels especially nice on touch
          // devices. Enabled by default.
          inertia: true,
          // @option inertiaDeceleration: Number = 3000
          // The rate with which the inertial movement slows down, in pixels/second².
          inertiaDeceleration: 3400,
          // px/s^2
          // @option inertiaMaxSpeed: Number = Infinity
          // Max speed of the inertial movement, in pixels/second.
          inertiaMaxSpeed: Infinity,
          // px/s
          // @option easeLinearity: Number = 0.2
          easeLinearity: 0.2,
          // TODO refactor, move to CRS
          // @option worldCopyJump: Boolean = false
          // With this option enabled, the map tracks when you pan to another "copy"
          // of the world and seamlessly jumps to the original one so that all overlays
          // like markers and vector layers are still visible.
          worldCopyJump: false,
          // @option maxBoundsViscosity: Number = 0.0
          // If `maxBounds` is set, this option will control how solid the bounds
          // are when dragging the map around. The default value of `0.0` allows the
          // user to drag outside the bounds at normal speed, higher values will
          // slow down map dragging outside bounds, and `1.0` makes the bounds fully
          // solid, preventing the user from dragging outside the bounds.
          maxBoundsViscosity: 0
        });
        var Drag = Handler.extend({
          addHooks: function() {
            if (!this._draggable) {
              var map2 = this._map;
              this._draggable = new Draggable(map2._mapPane, map2._container);
              this._draggable.on({
                dragstart: this._onDragStart,
                drag: this._onDrag,
                dragend: this._onDragEnd
              }, this);
              this._draggable.on("predrag", this._onPreDragLimit, this);
              if (map2.options.worldCopyJump) {
                this._draggable.on("predrag", this._onPreDragWrap, this);
                map2.on("zoomend", this._onZoomEnd, this);
                map2.whenReady(this._onZoomEnd, this);
              }
            }
            addClass(this._map._container, "leaflet-grab leaflet-touch-drag");
            this._draggable.enable();
            this._positions = [];
            this._times = [];
          },
          removeHooks: function() {
            removeClass(this._map._container, "leaflet-grab");
            removeClass(this._map._container, "leaflet-touch-drag");
            this._draggable.disable();
          },
          moved: function() {
            return this._draggable && this._draggable._moved;
          },
          moving: function() {
            return this._draggable && this._draggable._moving;
          },
          _onDragStart: function() {
            var map2 = this._map;
            map2._stop();
            if (this._map.options.maxBounds && this._map.options.maxBoundsViscosity) {
              var bounds = toLatLngBounds(this._map.options.maxBounds);
              this._offsetLimit = toBounds(
                this._map.latLngToContainerPoint(bounds.getNorthWest()).multiplyBy(-1),
                this._map.latLngToContainerPoint(bounds.getSouthEast()).multiplyBy(-1).add(this._map.getSize())
              );
              this._viscosity = Math.min(1, Math.max(0, this._map.options.maxBoundsViscosity));
            } else {
              this._offsetLimit = null;
            }
            map2.fire("movestart").fire("dragstart");
            if (map2.options.inertia) {
              this._positions = [];
              this._times = [];
            }
          },
          _onDrag: function(e) {
            if (this._map.options.inertia) {
              var time = this._lastTime = +/* @__PURE__ */ new Date(), pos = this._lastPos = this._draggable._absPos || this._draggable._newPos;
              this._positions.push(pos);
              this._times.push(time);
              this._prunePositions(time);
            }
            this._map.fire("move", e).fire("drag", e);
          },
          _prunePositions: function(time) {
            while (this._positions.length > 1 && time - this._times[0] > 50) {
              this._positions.shift();
              this._times.shift();
            }
          },
          _onZoomEnd: function() {
            var pxCenter = this._map.getSize().divideBy(2), pxWorldCenter = this._map.latLngToLayerPoint([0, 0]);
            this._initialWorldOffset = pxWorldCenter.subtract(pxCenter).x;
            this._worldWidth = this._map.getPixelWorldBounds().getSize().x;
          },
          _viscousLimit: function(value, threshold) {
            return value - (value - threshold) * this._viscosity;
          },
          _onPreDragLimit: function() {
            if (!this._viscosity || !this._offsetLimit) {
              return;
            }
            var offset = this._draggable._newPos.subtract(this._draggable._startPos);
            var limit = this._offsetLimit;
            if (offset.x < limit.min.x) {
              offset.x = this._viscousLimit(offset.x, limit.min.x);
            }
            if (offset.y < limit.min.y) {
              offset.y = this._viscousLimit(offset.y, limit.min.y);
            }
            if (offset.x > limit.max.x) {
              offset.x = this._viscousLimit(offset.x, limit.max.x);
            }
            if (offset.y > limit.max.y) {
              offset.y = this._viscousLimit(offset.y, limit.max.y);
            }
            this._draggable._newPos = this._draggable._startPos.add(offset);
          },
          _onPreDragWrap: function() {
            var worldWidth = this._worldWidth, halfWidth = Math.round(worldWidth / 2), dx = this._initialWorldOffset, x3 = this._draggable._newPos.x, newX1 = (x3 - halfWidth + dx) % worldWidth + halfWidth - dx, newX2 = (x3 + halfWidth + dx) % worldWidth - halfWidth - dx, newX = Math.abs(newX1 + dx) < Math.abs(newX2 + dx) ? newX1 : newX2;
            this._draggable._absPos = this._draggable._newPos.clone();
            this._draggable._newPos.x = newX;
          },
          _onDragEnd: function(e) {
            var map2 = this._map, options = map2.options, noInertia = !options.inertia || e.noInertia || this._times.length < 2;
            map2.fire("dragend", e);
            if (noInertia) {
              map2.fire("moveend");
            } else {
              this._prunePositions(+/* @__PURE__ */ new Date());
              var direction = this._lastPos.subtract(this._positions[0]), duration = (this._lastTime - this._times[0]) / 1e3, ease = options.easeLinearity, speedVector = direction.multiplyBy(ease / duration), speed = speedVector.distanceTo([0, 0]), limitedSpeed = Math.min(options.inertiaMaxSpeed, speed), limitedSpeedVector = speedVector.multiplyBy(limitedSpeed / speed), decelerationDuration = limitedSpeed / (options.inertiaDeceleration * ease), offset = limitedSpeedVector.multiplyBy(-decelerationDuration / 2).round();
              if (!offset.x && !offset.y) {
                map2.fire("moveend");
              } else {
                offset = map2._limitOffset(offset, map2.options.maxBounds);
                requestAnimFrame(function() {
                  map2.panBy(offset, {
                    duration: decelerationDuration,
                    easeLinearity: ease,
                    noMoveStart: true,
                    animate: true
                  });
                });
              }
            }
          }
        });
        Map2.addInitHook("addHandler", "dragging", Drag);
        Map2.mergeOptions({
          // @option keyboard: Boolean = true
          // Makes the map focusable and allows users to navigate the map with keyboard
          // arrows and `+`/`-` keys.
          keyboard: true,
          // @option keyboardPanDelta: Number = 80
          // Amount of pixels to pan when pressing an arrow key.
          keyboardPanDelta: 80
        });
        var Keyboard = Handler.extend({
          keyCodes: {
            left: [37],
            right: [39],
            down: [40],
            up: [38],
            zoomIn: [187, 107, 61, 171],
            zoomOut: [189, 109, 54, 173]
          },
          initialize: function(map2) {
            this._map = map2;
            this._setPanDelta(map2.options.keyboardPanDelta);
            this._setZoomDelta(map2.options.zoomDelta);
          },
          addHooks: function() {
            var container = this._map._container;
            if (container.tabIndex <= 0) {
              container.tabIndex = "0";
            }
            on(container, {
              focus: this._onFocus,
              blur: this._onBlur,
              mousedown: this._onMouseDown
            }, this);
            this._map.on({
              focus: this._addHooks,
              blur: this._removeHooks
            }, this);
          },
          removeHooks: function() {
            this._removeHooks();
            off(this._map._container, {
              focus: this._onFocus,
              blur: this._onBlur,
              mousedown: this._onMouseDown
            }, this);
            this._map.off({
              focus: this._addHooks,
              blur: this._removeHooks
            }, this);
          },
          _onMouseDown: function() {
            if (this._focused) {
              return;
            }
            var body = document.body, docEl = document.documentElement, top = body.scrollTop || docEl.scrollTop, left = body.scrollLeft || docEl.scrollLeft;
            this._map._container.focus();
            window.scrollTo(left, top);
          },
          _onFocus: function() {
            this._focused = true;
            this._map.fire("focus");
          },
          _onBlur: function() {
            this._focused = false;
            this._map.fire("blur");
          },
          _setPanDelta: function(panDelta) {
            var keys = this._panKeys = {}, codes = this.keyCodes, i, len;
            for (i = 0, len = codes.left.length; i < len; i++) {
              keys[codes.left[i]] = [-1 * panDelta, 0];
            }
            for (i = 0, len = codes.right.length; i < len; i++) {
              keys[codes.right[i]] = [panDelta, 0];
            }
            for (i = 0, len = codes.down.length; i < len; i++) {
              keys[codes.down[i]] = [0, panDelta];
            }
            for (i = 0, len = codes.up.length; i < len; i++) {
              keys[codes.up[i]] = [0, -1 * panDelta];
            }
          },
          _setZoomDelta: function(zoomDelta) {
            var keys = this._zoomKeys = {}, codes = this.keyCodes, i, len;
            for (i = 0, len = codes.zoomIn.length; i < len; i++) {
              keys[codes.zoomIn[i]] = zoomDelta;
            }
            for (i = 0, len = codes.zoomOut.length; i < len; i++) {
              keys[codes.zoomOut[i]] = -zoomDelta;
            }
          },
          _addHooks: function() {
            on(document, "keydown", this._onKeyDown, this);
          },
          _removeHooks: function() {
            off(document, "keydown", this._onKeyDown, this);
          },
          _onKeyDown: function(e) {
            if (e.altKey || e.ctrlKey || e.metaKey) {
              return;
            }
            var key = e.keyCode, map2 = this._map, offset;
            if (key in this._panKeys) {
              if (!map2._panAnim || !map2._panAnim._inProgress) {
                offset = this._panKeys[key];
                if (e.shiftKey) {
                  offset = toPoint(offset).multiplyBy(3);
                }
                if (map2.options.maxBounds) {
                  offset = map2._limitOffset(toPoint(offset), map2.options.maxBounds);
                }
                if (map2.options.worldCopyJump) {
                  var newLatLng = map2.wrapLatLng(map2.unproject(map2.project(map2.getCenter()).add(offset)));
                  map2.panTo(newLatLng);
                } else {
                  map2.panBy(offset);
                }
              }
            } else if (key in this._zoomKeys) {
              map2.setZoom(map2.getZoom() + (e.shiftKey ? 3 : 1) * this._zoomKeys[key]);
            } else if (key === 27 && map2._popup && map2._popup.options.closeOnEscapeKey) {
              map2.closePopup();
            } else {
              return;
            }
            stop(e);
          }
        });
        Map2.addInitHook("addHandler", "keyboard", Keyboard);
        Map2.mergeOptions({
          // @section Mouse wheel options
          // @option scrollWheelZoom: Boolean|String = true
          // Whether the map can be zoomed by using the mouse wheel. If passed `'center'`,
          // it will zoom to the center of the view regardless of where the mouse was.
          scrollWheelZoom: true,
          // @option wheelDebounceTime: Number = 40
          // Limits the rate at which a wheel can fire (in milliseconds). By default
          // user can't zoom via wheel more often than once per 40 ms.
          wheelDebounceTime: 40,
          // @option wheelPxPerZoomLevel: Number = 60
          // How many scroll pixels (as reported by [L.DomEvent.getWheelDelta](#domevent-getwheeldelta))
          // mean a change of one full zoom level. Smaller values will make wheel-zooming
          // faster (and vice versa).
          wheelPxPerZoomLevel: 60
        });
        var ScrollWheelZoom = Handler.extend({
          addHooks: function() {
            on(this._map._container, "wheel", this._onWheelScroll, this);
            this._delta = 0;
          },
          removeHooks: function() {
            off(this._map._container, "wheel", this._onWheelScroll, this);
          },
          _onWheelScroll: function(e) {
            var delta = getWheelDelta(e);
            var debounce = this._map.options.wheelDebounceTime;
            this._delta += delta;
            this._lastMousePos = this._map.mouseEventToContainerPoint(e);
            if (!this._startTime) {
              this._startTime = +/* @__PURE__ */ new Date();
            }
            var left = Math.max(debounce - (+/* @__PURE__ */ new Date() - this._startTime), 0);
            clearTimeout(this._timer);
            this._timer = setTimeout(bind(this._performZoom, this), left);
            stop(e);
          },
          _performZoom: function() {
            var map2 = this._map, zoom2 = map2.getZoom(), snap = this._map.options.zoomSnap || 0;
            map2._stop();
            var d2 = this._delta / (this._map.options.wheelPxPerZoomLevel * 4), d3 = 4 * Math.log(2 / (1 + Math.exp(-Math.abs(d2)))) / Math.LN2, d4 = snap ? Math.ceil(d3 / snap) * snap : d3, delta = map2._limitZoom(zoom2 + (this._delta > 0 ? d4 : -d4)) - zoom2;
            this._delta = 0;
            this._startTime = null;
            if (!delta) {
              return;
            }
            if (map2.options.scrollWheelZoom === "center") {
              map2.setZoom(zoom2 + delta);
            } else {
              map2.setZoomAround(this._lastMousePos, zoom2 + delta);
            }
          }
        });
        Map2.addInitHook("addHandler", "scrollWheelZoom", ScrollWheelZoom);
        var tapHoldDelay = 600;
        Map2.mergeOptions({
          // @section Touch interaction options
          // @option tapHold: Boolean
          // Enables simulation of `contextmenu` event, default is `true` for mobile Safari.
          tapHold: Browser.touchNative && Browser.safari && Browser.mobile,
          // @option tapTolerance: Number = 15
          // The max number of pixels a user can shift his finger during touch
          // for it to be considered a valid tap.
          tapTolerance: 15
        });
        var TapHold = Handler.extend({
          addHooks: function() {
            on(this._map._container, "touchstart", this._onDown, this);
          },
          removeHooks: function() {
            off(this._map._container, "touchstart", this._onDown, this);
          },
          _onDown: function(e) {
            clearTimeout(this._holdTimeout);
            if (e.touches.length !== 1) {
              return;
            }
            var first = e.touches[0];
            this._startPos = this._newPos = new Point(first.clientX, first.clientY);
            this._holdTimeout = setTimeout(bind(function() {
              this._cancel();
              if (!this._isTapValid()) {
                return;
              }
              on(document, "touchend", preventDefault);
              on(document, "touchend touchcancel", this._cancelClickPrevent);
              this._simulateEvent("contextmenu", first);
            }, this), tapHoldDelay);
            on(document, "touchend touchcancel contextmenu", this._cancel, this);
            on(document, "touchmove", this._onMove, this);
          },
          _cancelClickPrevent: function cancelClickPrevent() {
            off(document, "touchend", preventDefault);
            off(document, "touchend touchcancel", cancelClickPrevent);
          },
          _cancel: function() {
            clearTimeout(this._holdTimeout);
            off(document, "touchend touchcancel contextmenu", this._cancel, this);
            off(document, "touchmove", this._onMove, this);
          },
          _onMove: function(e) {
            var first = e.touches[0];
            this._newPos = new Point(first.clientX, first.clientY);
          },
          _isTapValid: function() {
            return this._newPos.distanceTo(this._startPos) <= this._map.options.tapTolerance;
          },
          _simulateEvent: function(type, e) {
            var simulatedEvent = new MouseEvent(type, {
              bubbles: true,
              cancelable: true,
              view: window,
              // detail: 1,
              screenX: e.screenX,
              screenY: e.screenY,
              clientX: e.clientX,
              clientY: e.clientY
              // button: 2,
              // buttons: 2
            });
            simulatedEvent._simulated = true;
            e.target.dispatchEvent(simulatedEvent);
          }
        });
        Map2.addInitHook("addHandler", "tapHold", TapHold);
        Map2.mergeOptions({
          // @section Touch interaction options
          // @option touchZoom: Boolean|String = *
          // Whether the map can be zoomed by touch-dragging with two fingers. If
          // passed `'center'`, it will zoom to the center of the view regardless of
          // where the touch events (fingers) were. Enabled for touch-capable web
          // browsers.
          touchZoom: Browser.touch,
          // @option bounceAtZoomLimits: Boolean = true
          // Set it to false if you don't want the map to zoom beyond min/max zoom
          // and then bounce back when pinch-zooming.
          bounceAtZoomLimits: true
        });
        var TouchZoom = Handler.extend({
          addHooks: function() {
            addClass(this._map._container, "leaflet-touch-zoom");
            on(this._map._container, "touchstart", this._onTouchStart, this);
          },
          removeHooks: function() {
            removeClass(this._map._container, "leaflet-touch-zoom");
            off(this._map._container, "touchstart", this._onTouchStart, this);
          },
          _onTouchStart: function(e) {
            var map2 = this._map;
            if (!e.touches || e.touches.length !== 2 || map2._animatingZoom || this._zooming) {
              return;
            }
            var p1 = map2.mouseEventToContainerPoint(e.touches[0]), p2 = map2.mouseEventToContainerPoint(e.touches[1]);
            this._centerPoint = map2.getSize()._divideBy(2);
            this._startLatLng = map2.containerPointToLatLng(this._centerPoint);
            if (map2.options.touchZoom !== "center") {
              this._pinchStartLatLng = map2.containerPointToLatLng(p1.add(p2)._divideBy(2));
            }
            this._startDist = p1.distanceTo(p2);
            this._startZoom = map2.getZoom();
            this._moved = false;
            this._zooming = true;
            map2._stop();
            on(document, "touchmove", this._onTouchMove, this);
            on(document, "touchend touchcancel", this._onTouchEnd, this);
            preventDefault(e);
          },
          _onTouchMove: function(e) {
            if (!e.touches || e.touches.length !== 2 || !this._zooming) {
              return;
            }
            var map2 = this._map, p1 = map2.mouseEventToContainerPoint(e.touches[0]), p2 = map2.mouseEventToContainerPoint(e.touches[1]), scale2 = p1.distanceTo(p2) / this._startDist;
            this._zoom = map2.getScaleZoom(scale2, this._startZoom);
            if (!map2.options.bounceAtZoomLimits && (this._zoom < map2.getMinZoom() && scale2 < 1 || this._zoom > map2.getMaxZoom() && scale2 > 1)) {
              this._zoom = map2._limitZoom(this._zoom);
            }
            if (map2.options.touchZoom === "center") {
              this._center = this._startLatLng;
              if (scale2 === 1) {
                return;
              }
            } else {
              var delta = p1._add(p2)._divideBy(2)._subtract(this._centerPoint);
              if (scale2 === 1 && delta.x === 0 && delta.y === 0) {
                return;
              }
              this._center = map2.unproject(map2.project(this._pinchStartLatLng, this._zoom).subtract(delta), this._zoom);
            }
            if (!this._moved) {
              map2._moveStart(true, false);
              this._moved = true;
            }
            cancelAnimFrame(this._animRequest);
            var moveFn = bind(map2._move, map2, this._center, this._zoom, { pinch: true, round: false }, void 0);
            this._animRequest = requestAnimFrame(moveFn, this, true);
            preventDefault(e);
          },
          _onTouchEnd: function() {
            if (!this._moved || !this._zooming) {
              this._zooming = false;
              return;
            }
            this._zooming = false;
            cancelAnimFrame(this._animRequest);
            off(document, "touchmove", this._onTouchMove, this);
            off(document, "touchend touchcancel", this._onTouchEnd, this);
            if (this._map.options.zoomAnimation) {
              this._map._animateZoom(this._center, this._map._limitZoom(this._zoom), true, this._map.options.zoomSnap);
            } else {
              this._map._resetView(this._center, this._map._limitZoom(this._zoom));
            }
          }
        });
        Map2.addInitHook("addHandler", "touchZoom", TouchZoom);
        Map2.BoxZoom = BoxZoom;
        Map2.DoubleClickZoom = DoubleClickZoom;
        Map2.Drag = Drag;
        Map2.Keyboard = Keyboard;
        Map2.ScrollWheelZoom = ScrollWheelZoom;
        Map2.TapHold = TapHold;
        Map2.TouchZoom = TouchZoom;
        exports2.Bounds = Bounds;
        exports2.Browser = Browser;
        exports2.CRS = CRS;
        exports2.Canvas = Canvas;
        exports2.Circle = Circle;
        exports2.CircleMarker = CircleMarker;
        exports2.Class = Class;
        exports2.Control = Control;
        exports2.DivIcon = DivIcon;
        exports2.DivOverlay = DivOverlay;
        exports2.DomEvent = DomEvent;
        exports2.DomUtil = DomUtil;
        exports2.Draggable = Draggable;
        exports2.Evented = Evented;
        exports2.FeatureGroup = FeatureGroup;
        exports2.GeoJSON = GeoJSON;
        exports2.GridLayer = GridLayer;
        exports2.Handler = Handler;
        exports2.Icon = Icon;
        exports2.ImageOverlay = ImageOverlay;
        exports2.LatLng = LatLng;
        exports2.LatLngBounds = LatLngBounds;
        exports2.Layer = Layer;
        exports2.LayerGroup = LayerGroup;
        exports2.LineUtil = LineUtil;
        exports2.Map = Map2;
        exports2.Marker = Marker;
        exports2.Mixin = Mixin;
        exports2.Path = Path;
        exports2.Point = Point;
        exports2.PolyUtil = PolyUtil;
        exports2.Polygon = Polygon;
        exports2.Polyline = Polyline;
        exports2.Popup = Popup;
        exports2.PosAnimation = PosAnimation;
        exports2.Projection = index2;
        exports2.Rectangle = Rectangle;
        exports2.Renderer = Renderer;
        exports2.SVG = SVG;
        exports2.SVGOverlay = SVGOverlay;
        exports2.TileLayer = TileLayer2;
        exports2.Tooltip = Tooltip;
        exports2.Transformation = Transformation;
        exports2.Util = Util;
        exports2.VideoOverlay = VideoOverlay;
        exports2.bind = bind;
        exports2.bounds = toBounds;
        exports2.canvas = canvas;
        exports2.circle = circle;
        exports2.circleMarker = circleMarker;
        exports2.control = control;
        exports2.divIcon = divIcon;
        exports2.extend = extend2;
        exports2.featureGroup = featureGroup;
        exports2.geoJSON = geoJSON;
        exports2.geoJson = geoJson;
        exports2.gridLayer = gridLayer;
        exports2.icon = icon;
        exports2.imageOverlay = imageOverlay;
        exports2.latLng = toLatLng;
        exports2.latLngBounds = toLatLngBounds;
        exports2.layerGroup = layerGroup;
        exports2.map = createMap;
        exports2.marker = marker;
        exports2.point = toPoint;
        exports2.polygon = polygon2;
        exports2.polyline = polyline;
        exports2.popup = popup;
        exports2.rectangle = rectangle;
        exports2.setOptions = setOptions;
        exports2.stamp = stamp;
        exports2.svg = svg;
        exports2.svgOverlay = svgOverlay;
        exports2.tileLayer = tileLayer;
        exports2.tooltip = tooltip;
        exports2.transformation = toTransformation;
        exports2.version = version;
        exports2.videoOverlay = videoOverlay;
        var oldL = window.L;
        exports2.noConflict = function() {
          window.L = oldL;
          return this;
        };
        window.L = exports2;
      }));
    }
  });

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/utils/emitter.utils.js
  var Emitter = class {
    constructor() {
      this._listeners = /* @__PURE__ */ new Map();
    }
    /**
     * Adds a one-time listener function for the event named eventName. The next time eventName is
     * triggered, this listener is removed and then invoked.
     *
     * @see {@link https://nodejs.org/api/events.html#emitteronceeventname-listener}
     * @param {IEventKey} eventName Event name
     * @param {IEventReceiver} func Event function
     * @return {IEmitter} Reference to the EventEmitter, so that calls can be chained
     */
    once(eventName, func) {
      const newListener = {
        callable: func,
        isOnce: true
      };
      const listeners = this._listeners.get(eventName);
      if (listeners) {
        listeners.push(newListener);
      } else {
        this._listeners.set(eventName, [newListener]);
      }
      return this;
    }
    /**
     * Adds the listener function to the end of the listeners array for the event named eventName.
     * No checks are made to see if the listener has already been added. Multiple calls passing
     * the same combination of eventName and listener will result in the listener being added,
     * and called, multiple times.
     *
     * @see {@link https://nodejs.org/api/events.html#emitteroneventname-listener}
     * @param {IEventKey} eventName Event name
     * @param {IEventReceiver} func Event function
     * @return {IEmitter} Reference to the EventEmitter, so that calls can be chained
     */
    on(eventName, func) {
      const newListener = {
        callable: func
      };
      const listeners = this._listeners.get(eventName);
      if (listeners) {
        listeners.push(newListener);
      } else {
        this._listeners.set(eventName, [newListener]);
      }
      return this;
    }
    /**
     * Removes the specified listener from the listener array for the event named eventName.
     *
     * @see {@link https://nodejs.org/api/events.html#emitterremovelistenereventname-listener}
     * @param {IEventKey} eventName Event name
     * @param {IEventReceiver} func Event function
     * @return {IEmitter} Reference to the EventEmitter, so that calls can be chained
     */
    off(eventName, func) {
      const listeners = this._listeners.get(eventName);
      if (listeners) {
        const filteredListeners = listeners.filter((listener) => listener.callable !== func);
        this._listeners.set(eventName, filteredListeners);
      }
      return this;
    }
    /**
     * Synchronously calls each of the listeners registered for the event named eventName,
     * in the order they were registered, passing the supplied arguments to each.
     * Returns true if the event had listeners, false otherwise.
     *
     * @param {IEventKey} eventName Event name
     * @param {any} params Event parameters
     *
     * @return {boolean} True if the event had listeners, false otherwise
     */
    emit(eventName, params) {
      const listeners = this._listeners.get(eventName);
      if (!listeners || listeners.length === 0) {
        return false;
      }
      let hasOnceListener = false;
      for (let i = 0; i < listeners.length; i++) {
        if (listeners[i].isOnce) {
          hasOnceListener = true;
        }
        listeners[i].callable(params);
      }
      if (hasOnceListener) {
        const filteredListeners = listeners.filter((listener) => !listener.isOnce);
        this._listeners.set(eventName, filteredListeners);
      }
      return true;
    }
    /**
     * Returns an array listing the events for which the emitter has registered listeners.
     *
     * @see {@link https://nodejs.org/api/events.html#emittereventnames}
     * @return {IEventKey[]} Event names with registered listeners
     */
    eventNames() {
      return [...this._listeners.keys()];
    }
    /**
     * Returns the number of listeners listening to the event named eventName.
     *
     * @see {@link https://nodejs.org/api/events.html#emitterlistenercounteventname}
     * @param {IEventKey} eventName Event name
     * @return {number} Number of listeners listening to the event name
     */
    listenerCount(eventName) {
      const listeners = this._listeners.get(eventName);
      return listeners ? listeners.length : 0;
    }
    /**
     * Returns a copy of the array of listeners for the event named eventName.
     *
     * @see {@link https://nodejs.org/api/events.html#emitterlistenerseventname}
     * @param {IEventKey} eventName Event name
     * @return {IEventReceiver[]} Array of listeners for the event name
     */
    listeners(eventName) {
      const listeners = this._listeners.get(eventName);
      if (!listeners) {
        return [];
      }
      return listeners.map((listener) => listener.callable);
    }
    /**
     * Alias for emitter.on(eventName, listener).
     *
     * @see {@link https://nodejs.org/api/events.html#emitteraddlistenereventname-listener}
     * @param {IEventKey} eventName Event name
     * @param {IEventReceiver} func Event function
     * @return {IEmitter} Reference to the EventEmitter, so that calls can be chained
     */
    addListener(eventName, func) {
      return this.on(eventName, func);
    }
    /**
     * Alias for emitter.off(eventName, listener).
     *
     * @see {@link https://nodejs.org/api/events.html#emitterremovelistenereventname-listener}
     * @param {IEventKey} eventName Event name
     * @param {IEventReceiver} func Event function
     * @return {IEmitter} Reference to the EventEmitter, so that calls can be chained
     */
    removeListener(eventName, func) {
      return this.off(eventName, func);
    }
    /**
     * Removes all listeners, or those of the specified eventName.
     *
     * @see {@link https://nodejs.org/api/events.html#emitterremovealllistenerseventname}
     * @param {IEventKey} eventName Event name
     * @return {IEmitter} Reference to the EventEmitter, so that calls can be chained
     */
    removeAllListeners(eventName) {
      if (eventName) {
        this._listeners.delete(eventName);
      } else {
        this._listeners.clear();
      }
      return this;
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/events.js
  var OrbEventType;
  (function(OrbEventType2) {
    OrbEventType2["RENDER_START"] = "render-start";
    OrbEventType2["RENDER_END"] = "render-end";
    OrbEventType2["SIMULATION_START"] = "simulation-start";
    OrbEventType2["SIMULATION_STEP"] = "simulation-step";
    OrbEventType2["SIMULATION_END"] = "simulation-end";
    OrbEventType2["NODE_CLICK"] = "node-click";
    OrbEventType2["NODE_HOVER"] = "node-hover";
    OrbEventType2["EDGE_CLICK"] = "edge-click";
    OrbEventType2["EDGE_HOVER"] = "edge-hover";
    OrbEventType2["MOUSE_CLICK"] = "mouse-click";
    OrbEventType2["MOUSE_MOVE"] = "mouse-move";
    OrbEventType2["TRANSFORM"] = "transform";
    OrbEventType2["NODE_DRAG_START"] = "node-drag-start";
    OrbEventType2["NODE_DRAG"] = "node-drag";
    OrbEventType2["NODE_DRAG_END"] = "node-drag-end";
    OrbEventType2["BACKGROUND_DRAG_START"] = "background-drag-start";
    OrbEventType2["BACKGROUND_DRAG"] = "background-drag";
    OrbEventType2["BACKGROUND_DRAG_END"] = "background-drag-end";
    OrbEventType2["NODE_RIGHT_CLICK"] = "node-right-click";
    OrbEventType2["EDGE_RIGHT_CLICK"] = "edge-right-click";
    OrbEventType2["MOUSE_RIGHT_CLICK"] = "mouse-right-click";
    OrbEventType2["NODE_DOUBLE_CLICK"] = "node-double-click";
    OrbEventType2["EDGE_DOUBLE_CLICK"] = "edge-double-click";
    OrbEventType2["MOUSE_DOUBLE_CLICK"] = "mouse-double-click";
  })(OrbEventType || (OrbEventType = {}));
  var OrbEmitter = class extends Emitter {
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/exceptions.js
  var OrbError = class extends Error {
    constructor(message) {
      super(message);
      this.message = message;
      Object.setPrototypeOf(this, new.target.prototype);
      this.name = this.constructor.name;
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/models/state.js
  var GraphObjectState = {
    NONE: 0,
    SELECTED: 1,
    HOVERED: 2
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/common/color.js
  var IS_VALID_HEX = /^#[a-fA-F0-9]{6}$/;
  var DEFAULT_HEX = "#000000";
  var Color = class _Color {
    constructor(hex2) {
      this.hex = IS_VALID_HEX.test(hex2 !== null && hex2 !== void 0 ? hex2 : "") ? hex2 : DEFAULT_HEX;
      this.rgb = hexToRgb(hex2);
    }
    /**
     * Returns HEX representation of the color.
     *
     * @return {string} HEX color code (#XXXXXX)
     */
    toString() {
      return this.hex;
    }
    /**
     * Returns darker color by the input factor. Default factor
     * is 0.3. Factor should be between 0 (same color) and 1 (black color).
     *
     * @param {number} factor Factor for the darker color
     * @return {Color} Darker color
     */
    getDarkerColor(factor = 0.3) {
      return _Color.getColorFromRGB({
        r: this.rgb.r - factor * this.rgb.r,
        g: this.rgb.g - factor * this.rgb.g,
        b: this.rgb.b - factor * this.rgb.b
      });
    }
    /**
     * Returns lighter color by the input factor. Default factor
     * is 0.3. Factor should be between 0 (same color) and 1 (white color).
     *
     * @param {number} factor Factor for the lighter color
     * @return {Color} Lighter color
     */
    getLighterColor(factor = 0.3) {
      return _Color.getColorFromRGB({
        r: this.rgb.r + factor * (255 - this.rgb.r),
        g: this.rgb.g + factor * (255 - this.rgb.g),
        b: this.rgb.b + factor * (255 - this.rgb.b)
      });
    }
    /**
     * Returns a new color by mixing the input color with self.
     *
     * @param {Color} color Color to mix with
     * @return {Color} Mixed color
     */
    getMixedColor(color2) {
      return _Color.getColorFromRGB({
        r: (this.rgb.r + color2.rgb.r) / 2,
        g: (this.rgb.g + color2.rgb.g) / 2,
        b: (this.rgb.b + color2.rgb.b) / 2
      });
    }
    /**
     * Checks if it is an equal color.
     *
     * @param {Color} color Another color
     * @return {boolean} True if equal colors, otherwise false
     */
    isEqual(color2) {
      return this.rgb.r === color2.rgb.r && this.rgb.g === color2.rgb.g && this.rgb.b === color2.rgb.b;
    }
    /**
     * Returns a color from RGB values.
     *
     * @param {IColorRGB} rgb RGB values
     * @return {Color} Color
     */
    static getColorFromRGB(rgb2) {
      const r = Math.round(Math.max(Math.min(rgb2.r, 255), 0));
      const g = Math.round(Math.max(Math.min(rgb2.g, 255), 0));
      const b = Math.round(Math.max(Math.min(rgb2.b, 255), 0));
      return new _Color(rgbToHex({ r, g, b }));
    }
    /**
     * Returns a random color.
     *
     * @return {Color} Random color
     */
    static getRandomColor() {
      return _Color.getColorFromRGB({
        r: Math.round(255 * Math.random()),
        g: Math.round(255 * Math.random()),
        b: Math.round(255 * Math.random())
      });
    }
  };
  var hexToRgb = (hex2) => {
    return {
      r: parseInt(hex2.substring(1, 3), 16),
      g: parseInt(hex2.substring(3, 5), 16),
      b: parseInt(hex2.substring(5, 7), 16)
    };
  };
  var rgbToHex = (rgb2) => {
    return "#" + ((1 << 24) + (rgb2.r << 16) + (rgb2.g << 8) + rgb2.b).toString(16).slice(1);
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/common/distance.js
  var getDistanceToLine = (startLinePoint, endLinePoint, point) => {
    const dx = endLinePoint.x - startLinePoint.x;
    const dy = endLinePoint.y - startLinePoint.y;
    let lineSegment = ((point.x - startLinePoint.x) * dx + (point.y - startLinePoint.y) * dy) / (dx * dx + dy * dy);
    if (lineSegment > 1) {
      lineSegment = 1;
    }
    if (lineSegment < 0) {
      lineSegment = 0;
    }
    const newLinePointX = startLinePoint.x + lineSegment * dx;
    const newLinePointY = startLinePoint.y + lineSegment * dy;
    const pdx = newLinePointX - point.x;
    const pdy = newLinePointY - point.y;
    return Math.sqrt(pdx * pdx + pdy * pdy);
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/common/position.js
  var isEqualPosition = (position1, position2) => {
    return !!position1 && !!position2 && position1.x === position2.x && position1.y === position2.y;
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/common/rectangle.js
  var isPointInRectangle = (rectangle, point) => {
    const endX = rectangle.x + rectangle.width;
    const endY = rectangle.y + rectangle.height;
    return point.x >= rectangle.x && point.x <= endX && point.y >= rectangle.y && point.y <= endY;
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/services/images.js
  var ImageHandler = class _ImageHandler {
    constructor() {
      this._imageByUrl = {};
    }
    static getInstance() {
      if (!_ImageHandler._instance) {
        _ImageHandler._instance = new _ImageHandler();
      }
      return _ImageHandler._instance;
    }
    getImage(url) {
      return this._imageByUrl[url];
    }
    loadImage(url, callback) {
      const existingImage = this.getImage(url);
      if (existingImage) {
        return existingImage;
      }
      const image = new Image();
      this._imageByUrl[url] = image;
      image.onload = () => {
        fixImageSize(image);
        callback === null || callback === void 0 ? void 0 : callback();
      };
      image.onerror = () => {
        callback === null || callback === void 0 ? void 0 : callback(new Error(`Image ${url} failed to load.`));
      };
      image.src = url;
      return image;
    }
    loadImages(urls, callback) {
      const images = [];
      const pendingImageUrls = new Set(urls);
      const onImageLoaded = (url) => {
        pendingImageUrls.delete(url);
        if (pendingImageUrls.size === 0) {
          callback === null || callback === void 0 ? void 0 : callback();
        }
      };
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const existingImage = this._imageByUrl[url];
        if (existingImage) {
          pendingImageUrls.delete(url);
          images.push(existingImage);
          continue;
        }
        const image = new Image();
        this._imageByUrl[url] = image;
        image.onload = () => {
          fixImageSize(image);
          onImageLoaded(url);
        };
        image.onerror = () => {
          onImageLoaded(url);
        };
        image.src = url;
        images.push(image);
      }
      return images;
    }
  };
  var fixImageSize = (image) => {
    if (!image || image.width !== 0) {
      return image;
    }
    document.body.appendChild(image);
    image.width = image.offsetWidth;
    image.height = image.offsetHeight;
    document.body.removeChild(image);
    return image;
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/utils/observer.utils.js
  var Subject = class {
    constructor() {
      this.listeners = [];
    }
    addListener(observer) {
      this.listeners.push(observer);
    }
    getListeners() {
      return [...this.listeners];
    }
    removeListener(observer) {
      const index2 = this.listeners.indexOf(observer);
      if (index2 !== -1) {
        this.listeners.splice(index2, 1);
      }
    }
    notifyListeners(data) {
      for (let i = 0; i < this.listeners.length; i++) {
        this.listeners[i](data);
      }
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/utils/type.utils.js
  var isNumber = (value) => {
    return typeof value === "number";
  };
  var isBoolean = (value) => {
    return typeof value === "boolean";
  };
  var isDate = (value) => {
    return value instanceof Date;
  };
  var isArray = (value) => {
    return Array.isArray(value);
  };
  var isPlainObject = (value) => {
    return value !== null && typeof value === "object" && value.constructor.name === "Object";
  };
  var isFunction = (value) => {
    return typeof value === "function";
  };
  var isArrayOfNumbers = (value) => {
    if (!isArray(value)) {
      return false;
    }
    return value.every((element) => isNumber(element));
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/utils/object.utils.js
  var copyObject = (obj) => {
    if (isDate(obj)) {
      return copyDate(obj);
    }
    if (isArray(obj)) {
      return copyArray(obj);
    }
    if (isPlainObject(obj)) {
      return copyPlainObject(obj);
    }
    return obj;
  };
  var isObjectEqual = (obj1, obj2) => {
    const isDate1 = isDate(obj1);
    const isDate2 = isDate(obj2);
    if (isDate1 && !isDate2 || !isDate1 && isDate2) {
      return false;
    }
    if (isDate1 && isDate2) {
      return obj1.getTime() === obj2.getTime();
    }
    const isArray1 = isArray(obj1);
    const isArray2 = isArray(obj2);
    if (isArray1 && !isArray2 || !isArray1 && isArray2) {
      return false;
    }
    if (isArray1 && isArray2) {
      if (obj1.length !== obj2.length) {
        return false;
      }
      return obj1.every((value, index2) => {
        return isObjectEqual(value, obj2[index2]);
      });
    }
    const isObject1 = isPlainObject(obj1);
    const isObject2 = isPlainObject(obj2);
    if (isObject1 && !isObject2 || !isObject1 && isObject2) {
      return false;
    }
    if (isObject1 && isObject2) {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);
      if (!isObjectEqual(keys1, keys2)) {
        return false;
      }
      return keys1.every((key) => {
        return isObjectEqual(obj1[key], obj2[key]);
      });
    }
    return obj1 === obj2;
  };
  var copyDate = (date) => {
    return new Date(date);
  };
  var copyArray = (array2) => {
    return array2.map((value) => copyObject(value));
  };
  var copyPlainObject = (obj) => {
    const newObject = {};
    Object.keys(obj).forEach((key) => {
      newObject[key] = copyObject(obj[key]);
    });
    return newObject;
  };
  var patchProperties = (target, source) => {
    const keys = Object.keys(source);
    for (let i = 0; i < keys.length; i++) {
      target[keys[i]] = source[keys[i]];
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/models/node.js
  var NodeShapeType;
  (function(NodeShapeType2) {
    NodeShapeType2["CIRCLE"] = "circle";
    NodeShapeType2["DOT"] = "dot";
    NodeShapeType2["SQUARE"] = "square";
    NodeShapeType2["DIAMOND"] = "diamond";
    NodeShapeType2["TRIANGLE"] = "triangle";
    NodeShapeType2["TRIANGLE_DOWN"] = "triangleDown";
    NodeShapeType2["STAR"] = "star";
    NodeShapeType2["HEXAGON"] = "hexagon";
  })(NodeShapeType || (NodeShapeType = {}));
  var NodeFactory = class {
    static create(data, settings) {
      return new Node(data, settings);
    }
  };
  var isNode = (obj) => {
    return obj instanceof Node;
  };
  var Node = class extends Subject {
    constructor(data, settings) {
      super();
      this._style = {};
      this._state = GraphObjectState.NONE;
      this._inEdgesById = {};
      this._outEdgesById = {};
      this.id = data.data.id;
      this._data = data.data;
      this._position = { id: this.id };
      this._onLoadedImage = settings === null || settings === void 0 ? void 0 : settings.onLoadedImage;
      this._onStateChange = settings === null || settings === void 0 ? void 0 : settings.onStateChange;
      if (settings && settings.listeners) {
        this.listeners = settings.listeners;
      }
    }
    getId() {
      return this.id;
    }
    getData() {
      return this._data;
    }
    getPosition() {
      return this._position;
    }
    getStyle() {
      return this._style;
    }
    getState() {
      return this._state;
    }
    clearPosition() {
      this._position.x = void 0;
      this._position.y = void 0;
      this.notifyListeners();
    }
    getCenter() {
      if (this._position.x === void 0 || this._position.y === void 0) {
        return { x: 0, y: 0 };
      }
      return { x: this._position.x, y: this._position.y };
    }
    getRadius() {
      var _a;
      return (_a = this._style.size) !== null && _a !== void 0 ? _a : 0;
    }
    getBorderedRadius() {
      return this.getRadius() + this.getBorderWidth() / 2;
    }
    getBoundingBox() {
      const center = this.getCenter();
      const radius = this.getBorderedRadius();
      return {
        x: center.x - radius,
        y: center.y - radius,
        width: radius * 2,
        height: radius * 2
      };
    }
    getInEdges() {
      return Object.values(this._inEdgesById);
    }
    getOutEdges() {
      return Object.values(this._outEdgesById);
    }
    getEdges() {
      const edgeById = {};
      const outEdges = this.getOutEdges();
      for (let i = 0; i < outEdges.length; i++) {
        const outEdge = outEdges[i];
        edgeById[outEdge.getId()] = outEdge;
      }
      const inEdges = this.getInEdges();
      for (let i = 0; i < inEdges.length; i++) {
        const inEdge = inEdges[i];
        edgeById[inEdge.getId()] = inEdge;
      }
      return Object.values(edgeById);
    }
    getAdjacentNodes() {
      const adjacentNodeById = {};
      const outEdges = this.getOutEdges();
      for (let i = 0; i < outEdges.length; i++) {
        const adjacentNode = outEdges[i].endNode;
        if (adjacentNode) {
          adjacentNodeById[adjacentNode.getId()] = adjacentNode;
        }
      }
      const inEdges = this.getInEdges();
      for (let i = 0; i < inEdges.length; i++) {
        const adjacentNode = inEdges[i].startNode;
        if (adjacentNode) {
          adjacentNodeById[adjacentNode.getId()] = adjacentNode;
        }
      }
      return Object.values(adjacentNodeById);
    }
    hasStyle() {
      return this._style && Object.keys(this._style).length > 0;
    }
    addEdge(edge) {
      if (edge.start === this.id) {
        this._outEdgesById[edge.getId()] = edge;
      }
      if (edge.end === this.id) {
        this._inEdgesById[edge.getId()] = edge;
      }
    }
    removeEdge(edge) {
      delete this._outEdgesById[edge.getId()];
      delete this._inEdgesById[edge.getId()];
    }
    isSelected() {
      return this._state === GraphObjectState.SELECTED;
    }
    isHovered() {
      return this._state === GraphObjectState.HOVERED;
    }
    clearState() {
      this.setState(GraphObjectState.NONE, { isNotifySkipped: true });
    }
    getDistanceToBorder() {
      return this.getBorderedRadius();
    }
    includesPoint(point) {
      const isInBoundingBox = this._isPointInBoundingBox(point);
      if (!isInBoundingBox) {
        return false;
      }
      if (this._style.shape === NodeShapeType.SQUARE) {
        return isInBoundingBox;
      }
      const center = this.getCenter();
      const borderedRadius = this.getBorderedRadius();
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      return Math.sqrt(dx * dx + dy * dy) <= borderedRadius;
    }
    hasShadow() {
      var _a, _b, _c;
      return ((_a = this._style.shadowSize) !== null && _a !== void 0 ? _a : 0) > 0 || ((_b = this._style.shadowOffsetX) !== null && _b !== void 0 ? _b : 0) > 0 || ((_c = this._style.shadowOffsetY) !== null && _c !== void 0 ? _c : 0) > 0;
    }
    hasBorder() {
      var _a, _b;
      const hasBorderWidth = ((_a = this._style.borderWidth) !== null && _a !== void 0 ? _a : 0) > 0;
      const hasBorderWidthSelected = ((_b = this._style.borderWidthSelected) !== null && _b !== void 0 ? _b : 0) > 0;
      return hasBorderWidth || this.isSelected() && hasBorderWidthSelected;
    }
    getLabel() {
      return this._style.label;
    }
    getColor() {
      let color2 = void 0;
      if (this._style.color) {
        color2 = this._style.color;
      }
      if (this.isHovered() && this._style.colorHover) {
        color2 = this._style.colorHover;
      }
      if (this.isSelected() && this._style.colorSelected) {
        color2 = this._style.colorSelected;
      }
      return color2;
    }
    getBorderWidth() {
      let borderWidth = 0;
      if (this._style.borderWidth && this._style.borderWidth > 0) {
        borderWidth = this._style.borderWidth;
      }
      if (this.isSelected() && this._style.borderWidthSelected && this._style.borderWidthSelected > 0) {
        borderWidth = this._style.borderWidthSelected;
      }
      return borderWidth;
    }
    getBorderColor() {
      if (!this.hasBorder()) {
        return void 0;
      }
      let borderColor = void 0;
      if (this._style.borderColor) {
        borderColor = this._style.borderColor;
      }
      if (this.isHovered() && this._style.borderColorHover) {
        borderColor = this._style.borderColorHover;
      }
      if (this.isSelected() && this._style.borderColorSelected) {
        borderColor = this._style.borderColorSelected.toString();
      }
      return borderColor;
    }
    getBackgroundImage() {
      var _a;
      if (((_a = this._style.size) !== null && _a !== void 0 ? _a : 0) <= 0) {
        return;
      }
      let imageUrl;
      if (this._style.imageUrl) {
        imageUrl = this._style.imageUrl;
      }
      if (this.isSelected() && this._style.imageUrlSelected) {
        imageUrl = this._style.imageUrlSelected;
      }
      if (!imageUrl) {
        return;
      }
      const image = ImageHandler.getInstance().getImage(imageUrl);
      if (image) {
        return image;
      }
      return ImageHandler.getInstance().loadImage(imageUrl, (error) => {
        var _a2;
        if (!error) {
          (_a2 = this._onLoadedImage) === null || _a2 === void 0 ? void 0 : _a2.call(this);
        }
      });
    }
    setData(arg) {
      if (isFunction(arg)) {
        this._data = arg(this);
      } else {
        this._data = arg;
      }
      this.notifyListeners();
    }
    patchData(arg) {
      let data;
      if (isFunction(arg)) {
        data = arg(this);
      } else {
        data = arg;
      }
      patchProperties(this._data, data);
      this.notifyListeners();
    }
    setPosition(arg, options) {
      let position;
      if (isFunction(arg)) {
        position = arg(this);
      } else {
        position = arg;
      }
      if ("x" in position && "y" in position) {
        this._position.x = position.x;
        this._position.y = position.y;
        if ("id" in position) {
          this._position.id = position.id;
        }
      }
      if (!(options === null || options === void 0 ? void 0 : options.isNotifySkipped)) {
        this.notifyListeners(Object.assign({ id: this.id }, position));
      }
    }
    setStyle(arg, options) {
      if (isFunction(arg)) {
        this._style = arg(this);
      } else {
        this._style = arg;
      }
      if (!(options === null || options === void 0 ? void 0 : options.isNotifySkipped)) {
        this.notifyListeners();
      }
    }
    patchStyle(arg, options) {
      let style;
      if (isFunction(arg)) {
        style = arg(this);
      } else {
        style = arg;
      }
      patchProperties(this._style, style);
      if (!(options === null || options === void 0 ? void 0 : options.isNotifySkipped)) {
        this.notifyListeners();
      }
    }
    setState(arg, options) {
      var _a;
      const previousState = this._state;
      let result;
      if (isFunction(arg)) {
        result = arg(this);
      } else {
        result = arg;
      }
      if (isNumber(result)) {
        this._state = result;
      } else if (isPlainObject(result)) {
        const options2 = result.options;
        this._state = this._handleState(result.state, options2);
        if (options2) {
          this.notifyListeners({
            id: this.id,
            type: "node",
            options: options2
          });
          return;
        }
      }
      if (!(options === null || options === void 0 ? void 0 : options.isNotifySkipped)) {
        this.notifyListeners();
      } else if (this._state !== previousState) {
        (_a = this._onStateChange) === null || _a === void 0 ? void 0 : _a.call(this);
      }
    }
    _isPointInBoundingBox(point) {
      return isPointInRectangle(this.getBoundingBox(), point);
    }
    _handleState(state, options) {
      if ((options === null || options === void 0 ? void 0 : options.isToggle) && this._state === state) {
        return GraphObjectState.NONE;
      } else {
        return state;
      }
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/models/edge.js
  var CURVED_CONTROL_POINT_OFFSET_MIN_SIZE = 4;
  var CURVED_CONTROL_POINT_OFFSET_MULTIPLIER = 4;
  var DEFAULT_DASHED_LINE_PATTERN = [5, 5];
  var DEFAULT_DOTTED_LINE_PATTERN = [1, 1];
  var EdgeLineStyleType;
  (function(EdgeLineStyleType2) {
    EdgeLineStyleType2["SOLID"] = "solid";
    EdgeLineStyleType2["DASHED"] = "dashed";
    EdgeLineStyleType2["DOTTED"] = "dotted";
    EdgeLineStyleType2["CUSTOM"] = "custom";
  })(EdgeLineStyleType || (EdgeLineStyleType = {}));
  var EdgeType;
  (function(EdgeType2) {
    EdgeType2["STRAIGHT"] = "straight";
    EdgeType2["LOOPBACK"] = "loopback";
    EdgeType2["CURVED"] = "curved";
  })(EdgeType || (EdgeType = {}));
  var EdgeFactory = class _EdgeFactory {
    static create(data, settings) {
      const type = getEdgeType(data);
      switch (type) {
        case EdgeType.STRAIGHT:
          return new EdgeStraight(data, settings);
        case EdgeType.LOOPBACK:
          return new EdgeLoopback(data, settings);
        case EdgeType.CURVED:
          return new EdgeCurved(data, settings);
        default:
          return new EdgeStraight(data, settings);
      }
    }
    static copy(edge, data) {
      const newEdge = _EdgeFactory.create({
        data: edge.getData(),
        offset: (data === null || data === void 0 ? void 0 : data.offset) !== void 0 ? data.offset : edge.offset,
        startNode: edge.startNode,
        endNode: edge.endNode
      }, { listeners: [], onStateChange: edge.getOnStateChange() });
      newEdge.setState(edge.getState());
      newEdge.setStyle(edge.getStyle());
      const listeners = edge.getListeners();
      for (let i = 0; i < listeners.length; i++) {
        newEdge.addListener(listeners[i]);
      }
      return newEdge;
    }
  };
  var isEdge = (obj) => {
    return obj instanceof EdgeStraight || obj instanceof EdgeCurved || obj instanceof EdgeLoopback;
  };
  var Edge = class extends Subject {
    constructor(data, settings) {
      var _a;
      super();
      this._style = {};
      this._state = GraphObjectState.NONE;
      this._type = EdgeType.STRAIGHT;
      this.id = data.data.id;
      this._data = data.data;
      this.offset = (_a = data.offset) !== null && _a !== void 0 ? _a : 0;
      this.startNode = data.startNode;
      this.endNode = data.endNode;
      this._type = getEdgeType(data);
      this._position = { id: this.id, source: this.startNode.getId(), target: this.endNode.getId() };
      this.startNode.addEdge(this);
      this.endNode.addEdge(this);
      this._onStateChange = settings === null || settings === void 0 ? void 0 : settings.onStateChange;
      if (settings && settings.listeners) {
        this.listeners = settings.listeners;
      }
    }
    getId() {
      return this.id;
    }
    getData() {
      return this._data;
    }
    getPosition() {
      return this._position;
    }
    getStyle() {
      return this._style;
    }
    getState() {
      return this._state;
    }
    getOnStateChange() {
      return this._onStateChange;
    }
    get type() {
      return this._type;
    }
    get start() {
      return this._data.start;
    }
    get end() {
      return this._data.end;
    }
    hasStyle() {
      return this._style && Object.keys(this._style).length > 0;
    }
    isSelected() {
      return this._state === GraphObjectState.SELECTED;
    }
    isHovered() {
      return this._state === GraphObjectState.HOVERED;
    }
    clearState() {
      var _a;
      if (this._state !== GraphObjectState.NONE) {
        this._state = GraphObjectState.NONE;
        (_a = this._onStateChange) === null || _a === void 0 ? void 0 : _a.call(this);
      }
    }
    isLoopback() {
      return this._type === EdgeType.LOOPBACK;
    }
    isStraight() {
      return this._type === EdgeType.STRAIGHT;
    }
    isCurved() {
      return this._type === EdgeType.CURVED;
    }
    getCenter() {
      var _a, _b;
      const startPoint = (_a = this.startNode) === null || _a === void 0 ? void 0 : _a.getCenter();
      const endPoint = (_b = this.endNode) === null || _b === void 0 ? void 0 : _b.getCenter();
      if (!startPoint || !endPoint) {
        return { x: 0, y: 0 };
      }
      return {
        x: (startPoint.x + endPoint.x) / 2,
        y: (startPoint.y + endPoint.y) / 2
      };
    }
    getDistance(point) {
      const startPoint = this.startNode.getCenter();
      const endPoint = this.endNode.getCenter();
      if (!startPoint || !endPoint) {
        return 0;
      }
      return getDistanceToLine(startPoint, endPoint, point);
    }
    getLabel() {
      return this._style.label;
    }
    hasShadow() {
      var _a, _b, _c;
      return ((_a = this._style.shadowSize) !== null && _a !== void 0 ? _a : 0) > 0 || ((_b = this._style.shadowOffsetX) !== null && _b !== void 0 ? _b : 0) > 0 || ((_c = this._style.shadowOffsetY) !== null && _c !== void 0 ? _c : 0) > 0;
    }
    getWidth() {
      let width = 0;
      if (this._style.width !== void 0) {
        width = this._style.width;
      }
      if (this.isHovered() && this._style.widthHover !== void 0) {
        width = this._style.widthHover;
      }
      if (this.isSelected() && this._style.widthSelected !== void 0) {
        width = this._style.widthSelected;
      }
      return width;
    }
    getColor() {
      let color2 = void 0;
      if (this._style.color) {
        color2 = this._style.color;
      }
      if (this.isHovered() && this._style.colorHover) {
        color2 = this._style.colorHover;
      }
      if (this.isSelected() && this._style.colorSelected) {
        color2 = this._style.colorSelected;
      }
      return color2;
    }
    getLineDashPattern() {
      const lineStyle = this._style.lineStyle;
      if (lineStyle === void 0 || lineStyle.type === EdgeLineStyleType.SOLID) {
        return null;
      }
      switch (lineStyle.type) {
        case EdgeLineStyleType.DASHED:
          return DEFAULT_DASHED_LINE_PATTERN;
        case EdgeLineStyleType.DOTTED:
          return DEFAULT_DOTTED_LINE_PATTERN;
        case EdgeLineStyleType.CUSTOM:
          return isArrayOfNumbers(lineStyle.pattern) ? lineStyle.pattern : null;
        default:
          return null;
      }
    }
    setData(arg) {
      if (isFunction(arg)) {
        this._data = arg(this);
      } else {
        this._data = arg;
      }
      this.notifyListeners();
    }
    patchData(arg) {
      let data;
      if (isFunction(arg)) {
        data = arg(this);
      } else {
        data = arg;
      }
      patchProperties(this._data, data);
      this.notifyListeners();
    }
    setStyle(arg, options) {
      if (isFunction(arg)) {
        this._style = arg(this);
      } else {
        this._style = arg;
      }
      if (!(options === null || options === void 0 ? void 0 : options.isNotifySkipped)) {
        this.notifyListeners();
      }
    }
    patchStyle(arg, options) {
      let style;
      if (isFunction(arg)) {
        style = arg(this);
      } else {
        style = arg;
      }
      patchProperties(this._style, style);
      if (!(options === null || options === void 0 ? void 0 : options.isNotifySkipped)) {
        this.notifyListeners();
      }
    }
    setState(arg, options) {
      var _a;
      const previousState = this._state;
      let result;
      if (isFunction(arg)) {
        result = arg(this);
      } else {
        result = arg;
      }
      if (isNumber(result)) {
        this._state = result;
      } else if (isPlainObject(result)) {
        const options2 = result.options;
        this._state = this._handleState(result.state, options2);
        if (options2) {
          this.notifyListeners({
            id: this.id,
            type: "edge",
            options: options2
          });
          return;
        }
      }
      if (!(options === null || options === void 0 ? void 0 : options.isNotifySkipped)) {
        this.notifyListeners();
      } else if (this._state !== previousState) {
        (_a = this._onStateChange) === null || _a === void 0 ? void 0 : _a.call(this);
      }
    }
    _handleState(state, options) {
      if ((options === null || options === void 0 ? void 0 : options.isToggle) && this._state === state) {
        return GraphObjectState.NONE;
      } else {
        return state;
      }
    }
  };
  var getEdgeType = (data) => {
    var _a;
    if (data.startNode.getId() === data.endNode.getId()) {
      return EdgeType.LOOPBACK;
    }
    return ((_a = data.offset) !== null && _a !== void 0 ? _a : 0) === 0 ? EdgeType.STRAIGHT : EdgeType.CURVED;
  };
  var EdgeStraight = class extends Edge {
    getCenter() {
      var _a, _b;
      const startPoint = (_a = this.startNode) === null || _a === void 0 ? void 0 : _a.getCenter();
      const endPoint = (_b = this.endNode) === null || _b === void 0 ? void 0 : _b.getCenter();
      if (!startPoint || !endPoint) {
        return { x: 0, y: 0 };
      }
      return {
        x: (startPoint.x + endPoint.x) / 2,
        y: (startPoint.y + endPoint.y) / 2
      };
    }
    getDistance(point) {
      var _a, _b;
      const startPoint = (_a = this.startNode) === null || _a === void 0 ? void 0 : _a.getCenter();
      const endPoint = (_b = this.endNode) === null || _b === void 0 ? void 0 : _b.getCenter();
      if (!startPoint || !endPoint) {
        return 0;
      }
      return getDistanceToLine(startPoint, endPoint, point);
    }
  };
  var EdgeCurved = class extends Edge {
    getCenter() {
      return this.getCurvedControlPoint(CURVED_CONTROL_POINT_OFFSET_MULTIPLIER / 2);
    }
    /**
     * @see {@link https://github.com/visjs/vis-network/blob/master/lib/network/modules/components/edges/util/bezier-edge-base.ts}
     *
     * @param {IPosition} point Point
     * @return {number} Distance to the point
     */
    getDistance(point) {
      var _a, _b;
      const sourcePoint = (_a = this.startNode) === null || _a === void 0 ? void 0 : _a.getCenter();
      const targetPoint = (_b = this.endNode) === null || _b === void 0 ? void 0 : _b.getCenter();
      if (!sourcePoint || !targetPoint) {
        return 0;
      }
      const controlPoint = this.getCurvedControlPoint();
      let minDistance = 1e9;
      let distance;
      let i;
      let t;
      let x3;
      let y3;
      let lastX = sourcePoint.x;
      let lastY = sourcePoint.y;
      for (i = 1; i < 10; i++) {
        t = 0.1 * i;
        x3 = Math.pow(1 - t, 2) * sourcePoint.x + 2 * t * (1 - t) * controlPoint.x + Math.pow(t, 2) * targetPoint.x;
        y3 = Math.pow(1 - t, 2) * sourcePoint.y + 2 * t * (1 - t) * controlPoint.y + Math.pow(t, 2) * targetPoint.y;
        if (i > 0) {
          distance = getDistanceToLine({ x: lastX, y: lastY }, { x: x3, y: y3 }, point);
          minDistance = distance < minDistance ? distance : minDistance;
        }
        lastX = x3;
        lastY = y3;
      }
      return minDistance;
    }
    getCurvedControlPoint(offsetMultiplier = CURVED_CONTROL_POINT_OFFSET_MULTIPLIER) {
      var _a;
      if (!this.startNode || !this.endNode) {
        return { x: 0, y: 0 };
      }
      const sourcePoint = this.startNode.getCenter();
      const targetPoint = this.endNode.getCenter();
      const sourceSize = this.startNode.getRadius();
      const targetSize = this.endNode.getRadius();
      const middleX = (sourcePoint.x + targetPoint.x) / 2;
      const middleY = (sourcePoint.y + targetPoint.y) / 2;
      const dx = targetPoint.x - sourcePoint.x;
      const dy = targetPoint.y - sourcePoint.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const offsetSize = Math.max(sourceSize, targetSize, CURVED_CONTROL_POINT_OFFSET_MIN_SIZE);
      const offset = ((_a = this.offset) !== null && _a !== void 0 ? _a : 1) * offsetSize * offsetMultiplier;
      return {
        x: middleX + offset * (dy / length),
        y: middleY - offset * (dx / length)
      };
    }
  };
  var EdgeLoopback = class extends Edge {
    getCenter() {
      var _a;
      const offset = Math.abs((_a = this.offset) !== null && _a !== void 0 ? _a : 1);
      const circle = this.getCircularData();
      return {
        x: circle.x + circle.radius,
        y: circle.y - offset * 5
      };
    }
    getDistance(point) {
      const circle = this.getCircularData();
      const dx = circle.x - point.x;
      const dy = circle.y - point.y;
      return Math.abs(Math.sqrt(dx * dx + dy * dy) - circle.radius);
    }
    getCircularData() {
      var _a;
      if (!this.startNode) {
        return { x: 0, y: 0, radius: 0 };
      }
      const nodeCenter = this.startNode.getCenter();
      const nodeRadius = this.startNode.getBorderedRadius();
      const offset = Math.abs((_a = this.offset) !== null && _a !== void 0 ? _a : 1);
      const radius = nodeRadius * 1.5 * offset;
      const nodeSize = nodeRadius;
      const x3 = nodeCenter.x + radius;
      const y3 = nodeCenter.y - nodeSize * 0.5;
      return { x: x3, y: y3, radius };
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/models/style.js
  var LABEL_PROPERTY_NAMES = ["label", "name"];
  var DEFAULT_NODE_STYLE = {
    size: 5,
    color: new Color("#1d87c9")
  };
  var DEFAULT_EDGE_STYLE = {
    color: new Color("#ababab"),
    width: 0.3
  };
  var getDefaultGraphStyle = () => {
    return {
      getNodeStyle(node) {
        return Object.assign(Object.assign({}, DEFAULT_NODE_STYLE), { label: getPredefinedLabel(node) });
      },
      getEdgeStyle(edge) {
        return Object.assign(Object.assign({}, DEFAULT_EDGE_STYLE), { label: getPredefinedLabel(edge) });
      }
    };
  };
  var getPredefinedLabel = (obj) => {
    const objData = obj.getData();
    for (let i = 0; i < LABEL_PROPERTY_NAMES.length; i++) {
      const value = objData[LABEL_PROPERTY_NAMES[i]];
      if (value !== void 0 && value !== null) {
        return `${value}`;
      }
    }
  };

  // node_modules/.pnpm/d3-dispatch@3.0.1/node_modules/d3-dispatch/src/dispatch.js
  var noop = { value: () => {
  } };
  function dispatch() {
    for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
      if (!(t = arguments[i] + "") || t in _ || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
      _[t] = [];
    }
    return new Dispatch(_);
  }
  function Dispatch(_) {
    this._ = _;
  }
  function parseTypenames(typenames, types) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
      return { type: t, name };
    });
  }
  Dispatch.prototype = dispatch.prototype = {
    constructor: Dispatch,
    on: function(typename, callback) {
      var _ = this._, T = parseTypenames(typename + "", _), t, i = -1, n = T.length;
      if (arguments.length < 2) {
        while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
        return;
      }
      if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
      while (++i < n) {
        if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
        else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
      }
      return this;
    },
    copy: function() {
      var copy = {}, _ = this._;
      for (var t in _) copy[t] = _[t].slice();
      return new Dispatch(copy);
    },
    call: function(type, that) {
      if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    },
    apply: function(type, that, args) {
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    }
  };
  function get(type, name) {
    for (var i = 0, n = type.length, c2; i < n; ++i) {
      if ((c2 = type[i]).name === name) {
        return c2.value;
      }
    }
  }
  function set(type, name, callback) {
    for (var i = 0, n = type.length; i < n; ++i) {
      if (type[i].name === name) {
        type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
        break;
      }
    }
    if (callback != null) type.push({ name, value: callback });
    return type;
  }
  var dispatch_default = dispatch;

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/namespaces.js
  var xhtml = "http://www.w3.org/1999/xhtml";
  var namespaces_default = {
    svg: "http://www.w3.org/2000/svg",
    xhtml,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/namespace.js
  function namespace_default(name) {
    var prefix = name += "", i = prefix.indexOf(":");
    if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
    return namespaces_default.hasOwnProperty(prefix) ? { space: namespaces_default[prefix], local: name } : name;
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/creator.js
  function creatorInherit(name) {
    return function() {
      var document2 = this.ownerDocument, uri = this.namespaceURI;
      return uri === xhtml && document2.documentElement.namespaceURI === xhtml ? document2.createElement(name) : document2.createElementNS(uri, name);
    };
  }
  function creatorFixed(fullname) {
    return function() {
      return this.ownerDocument.createElementNS(fullname.space, fullname.local);
    };
  }
  function creator_default(name) {
    var fullname = namespace_default(name);
    return (fullname.local ? creatorFixed : creatorInherit)(fullname);
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selector.js
  function none() {
  }
  function selector_default(selector) {
    return selector == null ? none : function() {
      return this.querySelector(selector);
    };
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/select.js
  function select_default(select) {
    if (typeof select !== "function") select = selector_default(select);
    for (var groups = this._groups, m2 = groups.length, subgroups = new Array(m2), j = 0; j < m2; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
        }
      }
    }
    return new Selection(subgroups, this._parents);
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/array.js
  function array(x3) {
    return x3 == null ? [] : Array.isArray(x3) ? x3 : Array.from(x3);
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selectorAll.js
  function empty() {
    return [];
  }
  function selectorAll_default(selector) {
    return selector == null ? empty : function() {
      return this.querySelectorAll(selector);
    };
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/selectAll.js
  function arrayAll(select) {
    return function() {
      return array(select.apply(this, arguments));
    };
  }
  function selectAll_default(select) {
    if (typeof select === "function") select = arrayAll(select);
    else select = selectorAll_default(select);
    for (var groups = this._groups, m2 = groups.length, subgroups = [], parents = [], j = 0; j < m2; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          subgroups.push(select.call(node, node.__data__, i, group));
          parents.push(node);
        }
      }
    }
    return new Selection(subgroups, parents);
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/matcher.js
  function matcher_default(selector) {
    return function() {
      return this.matches(selector);
    };
  }
  function childMatcher(selector) {
    return function(node) {
      return node.matches(selector);
    };
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/selectChild.js
  var find = Array.prototype.find;
  function childFind(match) {
    return function() {
      return find.call(this.children, match);
    };
  }
  function childFirst() {
    return this.firstElementChild;
  }
  function selectChild_default(match) {
    return this.select(match == null ? childFirst : childFind(typeof match === "function" ? match : childMatcher(match)));
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/selectChildren.js
  var filter = Array.prototype.filter;
  function children() {
    return Array.from(this.children);
  }
  function childrenFilter(match) {
    return function() {
      return filter.call(this.children, match);
    };
  }
  function selectChildren_default(match) {
    return this.selectAll(match == null ? children : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/filter.js
  function filter_default(match) {
    if (typeof match !== "function") match = matcher_default(match);
    for (var groups = this._groups, m2 = groups.length, subgroups = new Array(m2), j = 0; j < m2; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }
    return new Selection(subgroups, this._parents);
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/sparse.js
  function sparse_default(update) {
    return new Array(update.length);
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/enter.js
  function enter_default() {
    return new Selection(this._enter || this._groups.map(sparse_default), this._parents);
  }
  function EnterNode(parent, datum2) {
    this.ownerDocument = parent.ownerDocument;
    this.namespaceURI = parent.namespaceURI;
    this._next = null;
    this._parent = parent;
    this.__data__ = datum2;
  }
  EnterNode.prototype = {
    constructor: EnterNode,
    appendChild: function(child) {
      return this._parent.insertBefore(child, this._next);
    },
    insertBefore: function(child, next) {
      return this._parent.insertBefore(child, next);
    },
    querySelector: function(selector) {
      return this._parent.querySelector(selector);
    },
    querySelectorAll: function(selector) {
      return this._parent.querySelectorAll(selector);
    }
  };

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/constant.js
  function constant_default(x3) {
    return function() {
      return x3;
    };
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/data.js
  function bindIndex(parent, group, enter, update, exit, data) {
    var i = 0, node, groupLength = group.length, dataLength = data.length;
    for (; i < dataLength; ++i) {
      if (node = group[i]) {
        node.__data__ = data[i];
        update[i] = node;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }
    for (; i < groupLength; ++i) {
      if (node = group[i]) {
        exit[i] = node;
      }
    }
  }
  function bindKey(parent, group, enter, update, exit, data, key) {
    var i, node, nodeByKeyValue = /* @__PURE__ */ new Map(), groupLength = group.length, dataLength = data.length, keyValues = new Array(groupLength), keyValue;
    for (i = 0; i < groupLength; ++i) {
      if (node = group[i]) {
        keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
        if (nodeByKeyValue.has(keyValue)) {
          exit[i] = node;
        } else {
          nodeByKeyValue.set(keyValue, node);
        }
      }
    }
    for (i = 0; i < dataLength; ++i) {
      keyValue = key.call(parent, data[i], i, data) + "";
      if (node = nodeByKeyValue.get(keyValue)) {
        update[i] = node;
        node.__data__ = data[i];
        nodeByKeyValue.delete(keyValue);
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }
    for (i = 0; i < groupLength; ++i) {
      if ((node = group[i]) && nodeByKeyValue.get(keyValues[i]) === node) {
        exit[i] = node;
      }
    }
  }
  function datum(node) {
    return node.__data__;
  }
  function data_default(value, key) {
    if (!arguments.length) return Array.from(this, datum);
    var bind = key ? bindKey : bindIndex, parents = this._parents, groups = this._groups;
    if (typeof value !== "function") value = constant_default(value);
    for (var m2 = groups.length, update = new Array(m2), enter = new Array(m2), exit = new Array(m2), j = 0; j < m2; ++j) {
      var parent = parents[j], group = groups[j], groupLength = group.length, data = arraylike(value.call(parent, parent && parent.__data__, j, parents)), dataLength = data.length, enterGroup = enter[j] = new Array(dataLength), updateGroup = update[j] = new Array(dataLength), exitGroup = exit[j] = new Array(groupLength);
      bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);
      for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
        if (previous = enterGroup[i0]) {
          if (i0 >= i1) i1 = i0 + 1;
          while (!(next = updateGroup[i1]) && ++i1 < dataLength) ;
          previous._next = next || null;
        }
      }
    }
    update = new Selection(update, parents);
    update._enter = enter;
    update._exit = exit;
    return update;
  }
  function arraylike(data) {
    return typeof data === "object" && "length" in data ? data : Array.from(data);
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/exit.js
  function exit_default() {
    return new Selection(this._exit || this._groups.map(sparse_default), this._parents);
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/join.js
  function join_default(onenter, onupdate, onexit) {
    var enter = this.enter(), update = this, exit = this.exit();
    if (typeof onenter === "function") {
      enter = onenter(enter);
      if (enter) enter = enter.selection();
    } else {
      enter = enter.append(onenter + "");
    }
    if (onupdate != null) {
      update = onupdate(update);
      if (update) update = update.selection();
    }
    if (onexit == null) exit.remove();
    else onexit(exit);
    return enter && update ? enter.merge(update).order() : update;
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/merge.js
  function merge_default(context) {
    var selection2 = context.selection ? context.selection() : context;
    for (var groups0 = this._groups, groups1 = selection2._groups, m0 = groups0.length, m1 = groups1.length, m2 = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m2; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }
    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }
    return new Selection(merges, this._parents);
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/order.js
  function order_default() {
    for (var groups = this._groups, j = -1, m2 = groups.length; ++j < m2; ) {
      for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0; ) {
        if (node = group[i]) {
          if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }
    return this;
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/sort.js
  function sort_default(compare) {
    if (!compare) compare = ascending;
    function compareNode(a2, b) {
      return a2 && b ? compare(a2.__data__, b.__data__) : !a2 - !b;
    }
    for (var groups = this._groups, m2 = groups.length, sortgroups = new Array(m2), j = 0; j < m2; ++j) {
      for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          sortgroup[i] = node;
        }
      }
      sortgroup.sort(compareNode);
    }
    return new Selection(sortgroups, this._parents).order();
  }
  function ascending(a2, b) {
    return a2 < b ? -1 : a2 > b ? 1 : a2 >= b ? 0 : NaN;
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/call.js
  function call_default() {
    var callback = arguments[0];
    arguments[0] = this;
    callback.apply(null, arguments);
    return this;
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/nodes.js
  function nodes_default() {
    return Array.from(this);
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/node.js
  function node_default() {
    for (var groups = this._groups, j = 0, m2 = groups.length; j < m2; ++j) {
      for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
        var node = group[i];
        if (node) return node;
      }
    }
    return null;
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/size.js
  function size_default() {
    let size = 0;
    for (const node of this) ++size;
    return size;
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/empty.js
  function empty_default() {
    return !this.node();
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/each.js
  function each_default(callback) {
    for (var groups = this._groups, j = 0, m2 = groups.length; j < m2; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) callback.call(node, node.__data__, i, group);
      }
    }
    return this;
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/attr.js
  function attrRemove(name) {
    return function() {
      this.removeAttribute(name);
    };
  }
  function attrRemoveNS(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }
  function attrConstant(name, value) {
    return function() {
      this.setAttribute(name, value);
    };
  }
  function attrConstantNS(fullname, value) {
    return function() {
      this.setAttributeNS(fullname.space, fullname.local, value);
    };
  }
  function attrFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttribute(name);
      else this.setAttribute(name, v);
    };
  }
  function attrFunctionNS(fullname, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
      else this.setAttributeNS(fullname.space, fullname.local, v);
    };
  }
  function attr_default(name, value) {
    var fullname = namespace_default(name);
    if (arguments.length < 2) {
      var node = this.node();
      return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
    }
    return this.each((value == null ? fullname.local ? attrRemoveNS : attrRemove : typeof value === "function" ? fullname.local ? attrFunctionNS : attrFunction : fullname.local ? attrConstantNS : attrConstant)(fullname, value));
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/window.js
  function window_default(node) {
    return node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView;
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/style.js
  function styleRemove(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }
  function styleConstant(name, value, priority) {
    return function() {
      this.style.setProperty(name, value, priority);
    };
  }
  function styleFunction(name, value, priority) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.style.removeProperty(name);
      else this.style.setProperty(name, v, priority);
    };
  }
  function style_default(name, value, priority) {
    return arguments.length > 1 ? this.each((value == null ? styleRemove : typeof value === "function" ? styleFunction : styleConstant)(name, value, priority == null ? "" : priority)) : styleValue(this.node(), name);
  }
  function styleValue(node, name) {
    return node.style.getPropertyValue(name) || window_default(node).getComputedStyle(node, null).getPropertyValue(name);
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/property.js
  function propertyRemove(name) {
    return function() {
      delete this[name];
    };
  }
  function propertyConstant(name, value) {
    return function() {
      this[name] = value;
    };
  }
  function propertyFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) delete this[name];
      else this[name] = v;
    };
  }
  function property_default(name, value) {
    return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name, value)) : this.node()[name];
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/classed.js
  function classArray(string) {
    return string.trim().split(/^|\s+/);
  }
  function classList(node) {
    return node.classList || new ClassList(node);
  }
  function ClassList(node) {
    this._node = node;
    this._names = classArray(node.getAttribute("class") || "");
  }
  ClassList.prototype = {
    add: function(name) {
      var i = this._names.indexOf(name);
      if (i < 0) {
        this._names.push(name);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    remove: function(name) {
      var i = this._names.indexOf(name);
      if (i >= 0) {
        this._names.splice(i, 1);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    contains: function(name) {
      return this._names.indexOf(name) >= 0;
    }
  };
  function classedAdd(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.add(names[i]);
  }
  function classedRemove(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.remove(names[i]);
  }
  function classedTrue(names) {
    return function() {
      classedAdd(this, names);
    };
  }
  function classedFalse(names) {
    return function() {
      classedRemove(this, names);
    };
  }
  function classedFunction(names, value) {
    return function() {
      (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
    };
  }
  function classed_default(name, value) {
    var names = classArray(name + "");
    if (arguments.length < 2) {
      var list = classList(this.node()), i = -1, n = names.length;
      while (++i < n) if (!list.contains(names[i])) return false;
      return true;
    }
    return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names, value));
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/text.js
  function textRemove() {
    this.textContent = "";
  }
  function textConstant(value) {
    return function() {
      this.textContent = value;
    };
  }
  function textFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    };
  }
  function text_default(value) {
    return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction : textConstant)(value)) : this.node().textContent;
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/html.js
  function htmlRemove() {
    this.innerHTML = "";
  }
  function htmlConstant(value) {
    return function() {
      this.innerHTML = value;
    };
  }
  function htmlFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    };
  }
  function html_default(value) {
    return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/raise.js
  function raise() {
    if (this.nextSibling) this.parentNode.appendChild(this);
  }
  function raise_default() {
    return this.each(raise);
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/lower.js
  function lower() {
    if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }
  function lower_default() {
    return this.each(lower);
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/append.js
  function append_default(name) {
    var create3 = typeof name === "function" ? name : creator_default(name);
    return this.select(function() {
      return this.appendChild(create3.apply(this, arguments));
    });
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/insert.js
  function constantNull() {
    return null;
  }
  function insert_default(name, before) {
    var create3 = typeof name === "function" ? name : creator_default(name), select = before == null ? constantNull : typeof before === "function" ? before : selector_default(before);
    return this.select(function() {
      return this.insertBefore(create3.apply(this, arguments), select.apply(this, arguments) || null);
    });
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/remove.js
  function remove() {
    var parent = this.parentNode;
    if (parent) parent.removeChild(this);
  }
  function remove_default() {
    return this.each(remove);
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/clone.js
  function selection_cloneShallow() {
    var clone = this.cloneNode(false), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }
  function selection_cloneDeep() {
    var clone = this.cloneNode(true), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }
  function clone_default(deep) {
    return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/datum.js
  function datum_default(value) {
    return arguments.length ? this.property("__data__", value) : this.node().__data__;
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/on.js
  function contextListener(listener) {
    return function(event) {
      listener.call(this, event, this.__data__);
    };
  }
  function parseTypenames2(typenames) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      return { type: t, name };
    });
  }
  function onRemove(typename) {
    return function() {
      var on = this.__on;
      if (!on) return;
      for (var j = 0, i = -1, m2 = on.length, o; j < m2; ++j) {
        if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.options);
        } else {
          on[++i] = o;
        }
      }
      if (++i) on.length = i;
      else delete this.__on;
    };
  }
  function onAdd(typename, value, options) {
    return function() {
      var on = this.__on, o, listener = contextListener(value);
      if (on) for (var j = 0, m2 = on.length; j < m2; ++j) {
        if ((o = on[j]).type === typename.type && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.options);
          this.addEventListener(o.type, o.listener = listener, o.options = options);
          o.value = value;
          return;
        }
      }
      this.addEventListener(typename.type, listener, options);
      o = { type: typename.type, name: typename.name, value, listener, options };
      if (!on) this.__on = [o];
      else on.push(o);
    };
  }
  function on_default(typename, value, options) {
    var typenames = parseTypenames2(typename + ""), i, n = typenames.length, t;
    if (arguments.length < 2) {
      var on = this.node().__on;
      if (on) for (var j = 0, m2 = on.length, o; j < m2; ++j) {
        for (i = 0, o = on[j]; i < n; ++i) {
          if ((t = typenames[i]).type === o.type && t.name === o.name) {
            return o.value;
          }
        }
      }
      return;
    }
    on = value ? onAdd : onRemove;
    for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
    return this;
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/dispatch.js
  function dispatchEvent(node, type, params) {
    var window2 = window_default(node), event = window2.CustomEvent;
    if (typeof event === "function") {
      event = new event(type, params);
    } else {
      event = window2.document.createEvent("Event");
      if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
      else event.initEvent(type, false, false);
    }
    node.dispatchEvent(event);
  }
  function dispatchConstant(type, params) {
    return function() {
      return dispatchEvent(this, type, params);
    };
  }
  function dispatchFunction(type, params) {
    return function() {
      return dispatchEvent(this, type, params.apply(this, arguments));
    };
  }
  function dispatch_default2(type, params) {
    return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type, params));
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/iterator.js
  function* iterator_default() {
    for (var groups = this._groups, j = 0, m2 = groups.length; j < m2; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) yield node;
      }
    }
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/index.js
  var root = [null];
  function Selection(groups, parents) {
    this._groups = groups;
    this._parents = parents;
  }
  function selection() {
    return new Selection([[document.documentElement]], root);
  }
  function selection_selection() {
    return this;
  }
  Selection.prototype = selection.prototype = {
    constructor: Selection,
    select: select_default,
    selectAll: selectAll_default,
    selectChild: selectChild_default,
    selectChildren: selectChildren_default,
    filter: filter_default,
    data: data_default,
    enter: enter_default,
    exit: exit_default,
    join: join_default,
    merge: merge_default,
    selection: selection_selection,
    order: order_default,
    sort: sort_default,
    call: call_default,
    nodes: nodes_default,
    node: node_default,
    size: size_default,
    empty: empty_default,
    each: each_default,
    attr: attr_default,
    style: style_default,
    property: property_default,
    classed: classed_default,
    text: text_default,
    html: html_default,
    raise: raise_default,
    lower: lower_default,
    append: append_default,
    insert: insert_default,
    remove: remove_default,
    clone: clone_default,
    datum: datum_default,
    on: on_default,
    dispatch: dispatch_default2,
    [Symbol.iterator]: iterator_default
  };
  var selection_default = selection;

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/select.js
  function select_default2(selector) {
    return typeof selector === "string" ? new Selection([[document.querySelector(selector)]], [document.documentElement]) : new Selection([[selector]], root);
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/sourceEvent.js
  function sourceEvent_default(event) {
    let sourceEvent;
    while (sourceEvent = event.sourceEvent) event = sourceEvent;
    return event;
  }

  // node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/pointer.js
  function pointer_default(event, node) {
    event = sourceEvent_default(event);
    if (node === void 0) node = event.currentTarget;
    if (node) {
      var svg = node.ownerSVGElement || node;
      if (svg.createSVGPoint) {
        var point = svg.createSVGPoint();
        point.x = event.clientX, point.y = event.clientY;
        point = point.matrixTransform(node.getScreenCTM().inverse());
        return [point.x, point.y];
      }
      if (node.getBoundingClientRect) {
        var rect = node.getBoundingClientRect();
        return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
      }
    }
    return [event.pageX, event.pageY];
  }

  // node_modules/.pnpm/d3-drag@3.0.0/node_modules/d3-drag/src/noevent.js
  var nonpassive = { passive: false };
  var nonpassivecapture = { capture: true, passive: false };
  function nopropagation(event) {
    event.stopImmediatePropagation();
  }
  function noevent_default(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  // node_modules/.pnpm/d3-drag@3.0.0/node_modules/d3-drag/src/nodrag.js
  function nodrag_default(view) {
    var root2 = view.document.documentElement, selection2 = select_default2(view).on("dragstart.drag", noevent_default, nonpassivecapture);
    if ("onselectstart" in root2) {
      selection2.on("selectstart.drag", noevent_default, nonpassivecapture);
    } else {
      root2.__noselect = root2.style.MozUserSelect;
      root2.style.MozUserSelect = "none";
    }
  }
  function yesdrag(view, noclick) {
    var root2 = view.document.documentElement, selection2 = select_default2(view).on("dragstart.drag", null);
    if (noclick) {
      selection2.on("click.drag", noevent_default, nonpassivecapture);
      setTimeout(function() {
        selection2.on("click.drag", null);
      }, 0);
    }
    if ("onselectstart" in root2) {
      selection2.on("selectstart.drag", null);
    } else {
      root2.style.MozUserSelect = root2.__noselect;
      delete root2.__noselect;
    }
  }

  // node_modules/.pnpm/d3-drag@3.0.0/node_modules/d3-drag/src/constant.js
  var constant_default2 = (x3) => () => x3;

  // node_modules/.pnpm/d3-drag@3.0.0/node_modules/d3-drag/src/event.js
  function DragEvent(type, {
    sourceEvent,
    subject,
    target,
    identifier,
    active,
    x: x3,
    y: y3,
    dx,
    dy,
    dispatch: dispatch2
  }) {
    Object.defineProperties(this, {
      type: { value: type, enumerable: true, configurable: true },
      sourceEvent: { value: sourceEvent, enumerable: true, configurable: true },
      subject: { value: subject, enumerable: true, configurable: true },
      target: { value: target, enumerable: true, configurable: true },
      identifier: { value: identifier, enumerable: true, configurable: true },
      active: { value: active, enumerable: true, configurable: true },
      x: { value: x3, enumerable: true, configurable: true },
      y: { value: y3, enumerable: true, configurable: true },
      dx: { value: dx, enumerable: true, configurable: true },
      dy: { value: dy, enumerable: true, configurable: true },
      _: { value: dispatch2 }
    });
  }
  DragEvent.prototype.on = function() {
    var value = this._.on.apply(this._, arguments);
    return value === this._ ? this : value;
  };

  // node_modules/.pnpm/d3-drag@3.0.0/node_modules/d3-drag/src/drag.js
  function defaultFilter(event) {
    return !event.ctrlKey && !event.button;
  }
  function defaultContainer() {
    return this.parentNode;
  }
  function defaultSubject(event, d) {
    return d == null ? { x: event.x, y: event.y } : d;
  }
  function defaultTouchable() {
    return navigator.maxTouchPoints || "ontouchstart" in this;
  }
  function drag_default() {
    var filter2 = defaultFilter, container = defaultContainer, subject = defaultSubject, touchable = defaultTouchable, gestures = {}, listeners = dispatch_default("start", "drag", "end"), active = 0, mousedownx, mousedowny, mousemoving, touchending, clickDistance2 = 0;
    function drag(selection2) {
      selection2.on("mousedown.drag", mousedowned).filter(touchable).on("touchstart.drag", touchstarted).on("touchmove.drag", touchmoved, nonpassive).on("touchend.drag touchcancel.drag", touchended).style("touch-action", "none").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
    }
    function mousedowned(event, d) {
      if (touchending || !filter2.call(this, event, d)) return;
      var gesture = beforestart(this, container.call(this, event, d), event, d, "mouse");
      if (!gesture) return;
      select_default2(event.view).on("mousemove.drag", mousemoved, nonpassivecapture).on("mouseup.drag", mouseupped, nonpassivecapture);
      nodrag_default(event.view);
      nopropagation(event);
      mousemoving = false;
      mousedownx = event.clientX;
      mousedowny = event.clientY;
      gesture("start", event);
    }
    function mousemoved(event) {
      noevent_default(event);
      if (!mousemoving) {
        var dx = event.clientX - mousedownx, dy = event.clientY - mousedowny;
        mousemoving = dx * dx + dy * dy > clickDistance2;
      }
      gestures.mouse("drag", event);
    }
    function mouseupped(event) {
      select_default2(event.view).on("mousemove.drag mouseup.drag", null);
      yesdrag(event.view, mousemoving);
      noevent_default(event);
      gestures.mouse("end", event);
    }
    function touchstarted(event, d) {
      if (!filter2.call(this, event, d)) return;
      var touches = event.changedTouches, c2 = container.call(this, event, d), n = touches.length, i, gesture;
      for (i = 0; i < n; ++i) {
        if (gesture = beforestart(this, c2, event, d, touches[i].identifier, touches[i])) {
          nopropagation(event);
          gesture("start", event, touches[i]);
        }
      }
    }
    function touchmoved(event) {
      var touches = event.changedTouches, n = touches.length, i, gesture;
      for (i = 0; i < n; ++i) {
        if (gesture = gestures[touches[i].identifier]) {
          noevent_default(event);
          gesture("drag", event, touches[i]);
        }
      }
    }
    function touchended(event) {
      var touches = event.changedTouches, n = touches.length, i, gesture;
      if (touchending) clearTimeout(touchending);
      touchending = setTimeout(function() {
        touchending = null;
      }, 500);
      for (i = 0; i < n; ++i) {
        if (gesture = gestures[touches[i].identifier]) {
          nopropagation(event);
          gesture("end", event, touches[i]);
        }
      }
    }
    function beforestart(that, container2, event, d, identifier, touch) {
      var dispatch2 = listeners.copy(), p = pointer_default(touch || event, container2), dx, dy, s;
      if ((s = subject.call(that, new DragEvent("beforestart", {
        sourceEvent: event,
        target: drag,
        identifier,
        active,
        x: p[0],
        y: p[1],
        dx: 0,
        dy: 0,
        dispatch: dispatch2
      }), d)) == null) return;
      dx = s.x - p[0] || 0;
      dy = s.y - p[1] || 0;
      return function gesture(type, event2, touch2) {
        var p0 = p, n;
        switch (type) {
          case "start":
            gestures[identifier] = gesture, n = active++;
            break;
          case "end":
            delete gestures[identifier], --active;
          // falls through
          case "drag":
            p = pointer_default(touch2 || event2, container2), n = active;
            break;
        }
        dispatch2.call(
          type,
          that,
          new DragEvent(type, {
            sourceEvent: event2,
            subject: s,
            target: drag,
            identifier,
            active: n,
            x: p[0] + dx,
            y: p[1] + dy,
            dx: p[0] - p0[0],
            dy: p[1] - p0[1],
            dispatch: dispatch2
          }),
          d
        );
      };
    }
    drag.filter = function(_) {
      return arguments.length ? (filter2 = typeof _ === "function" ? _ : constant_default2(!!_), drag) : filter2;
    };
    drag.container = function(_) {
      return arguments.length ? (container = typeof _ === "function" ? _ : constant_default2(_), drag) : container;
    };
    drag.subject = function(_) {
      return arguments.length ? (subject = typeof _ === "function" ? _ : constant_default2(_), drag) : subject;
    };
    drag.touchable = function(_) {
      return arguments.length ? (touchable = typeof _ === "function" ? _ : constant_default2(!!_), drag) : touchable;
    };
    drag.on = function() {
      var value = listeners.on.apply(listeners, arguments);
      return value === listeners ? drag : value;
    };
    drag.clickDistance = function(_) {
      return arguments.length ? (clickDistance2 = (_ = +_) * _, drag) : Math.sqrt(clickDistance2);
    };
    return drag;
  }

  // node_modules/.pnpm/d3-ease@3.0.1/node_modules/d3-ease/src/linear.js
  var linear = (t) => +t;

  // node_modules/.pnpm/d3-ease@3.0.1/node_modules/d3-ease/src/cubic.js
  function cubicInOut(t) {
    return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
  }

  // node_modules/.pnpm/d3-color@3.1.0/node_modules/d3-color/src/define.js
  function define_default(constructor, factory, prototype) {
    constructor.prototype = factory.prototype = prototype;
    prototype.constructor = constructor;
  }
  function extend(parent, definition) {
    var prototype = Object.create(parent.prototype);
    for (var key in definition) prototype[key] = definition[key];
    return prototype;
  }

  // node_modules/.pnpm/d3-color@3.1.0/node_modules/d3-color/src/color.js
  function Color2() {
  }
  var darker = 0.7;
  var brighter = 1 / darker;
  var reI = "\\s*([+-]?\\d+)\\s*";
  var reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*";
  var reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*";
  var reHex = /^#([0-9a-f]{3,8})$/;
  var reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`);
  var reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`);
  var reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`);
  var reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`);
  var reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`);
  var reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);
  var named = {
    aliceblue: 15792383,
    antiquewhite: 16444375,
    aqua: 65535,
    aquamarine: 8388564,
    azure: 15794175,
    beige: 16119260,
    bisque: 16770244,
    black: 0,
    blanchedalmond: 16772045,
    blue: 255,
    blueviolet: 9055202,
    brown: 10824234,
    burlywood: 14596231,
    cadetblue: 6266528,
    chartreuse: 8388352,
    chocolate: 13789470,
    coral: 16744272,
    cornflowerblue: 6591981,
    cornsilk: 16775388,
    crimson: 14423100,
    cyan: 65535,
    darkblue: 139,
    darkcyan: 35723,
    darkgoldenrod: 12092939,
    darkgray: 11119017,
    darkgreen: 25600,
    darkgrey: 11119017,
    darkkhaki: 12433259,
    darkmagenta: 9109643,
    darkolivegreen: 5597999,
    darkorange: 16747520,
    darkorchid: 10040012,
    darkred: 9109504,
    darksalmon: 15308410,
    darkseagreen: 9419919,
    darkslateblue: 4734347,
    darkslategray: 3100495,
    darkslategrey: 3100495,
    darkturquoise: 52945,
    darkviolet: 9699539,
    deeppink: 16716947,
    deepskyblue: 49151,
    dimgray: 6908265,
    dimgrey: 6908265,
    dodgerblue: 2003199,
    firebrick: 11674146,
    floralwhite: 16775920,
    forestgreen: 2263842,
    fuchsia: 16711935,
    gainsboro: 14474460,
    ghostwhite: 16316671,
    gold: 16766720,
    goldenrod: 14329120,
    gray: 8421504,
    green: 32768,
    greenyellow: 11403055,
    grey: 8421504,
    honeydew: 15794160,
    hotpink: 16738740,
    indianred: 13458524,
    indigo: 4915330,
    ivory: 16777200,
    khaki: 15787660,
    lavender: 15132410,
    lavenderblush: 16773365,
    lawngreen: 8190976,
    lemonchiffon: 16775885,
    lightblue: 11393254,
    lightcoral: 15761536,
    lightcyan: 14745599,
    lightgoldenrodyellow: 16448210,
    lightgray: 13882323,
    lightgreen: 9498256,
    lightgrey: 13882323,
    lightpink: 16758465,
    lightsalmon: 16752762,
    lightseagreen: 2142890,
    lightskyblue: 8900346,
    lightslategray: 7833753,
    lightslategrey: 7833753,
    lightsteelblue: 11584734,
    lightyellow: 16777184,
    lime: 65280,
    limegreen: 3329330,
    linen: 16445670,
    magenta: 16711935,
    maroon: 8388608,
    mediumaquamarine: 6737322,
    mediumblue: 205,
    mediumorchid: 12211667,
    mediumpurple: 9662683,
    mediumseagreen: 3978097,
    mediumslateblue: 8087790,
    mediumspringgreen: 64154,
    mediumturquoise: 4772300,
    mediumvioletred: 13047173,
    midnightblue: 1644912,
    mintcream: 16121850,
    mistyrose: 16770273,
    moccasin: 16770229,
    navajowhite: 16768685,
    navy: 128,
    oldlace: 16643558,
    olive: 8421376,
    olivedrab: 7048739,
    orange: 16753920,
    orangered: 16729344,
    orchid: 14315734,
    palegoldenrod: 15657130,
    palegreen: 10025880,
    paleturquoise: 11529966,
    palevioletred: 14381203,
    papayawhip: 16773077,
    peachpuff: 16767673,
    peru: 13468991,
    pink: 16761035,
    plum: 14524637,
    powderblue: 11591910,
    purple: 8388736,
    rebeccapurple: 6697881,
    red: 16711680,
    rosybrown: 12357519,
    royalblue: 4286945,
    saddlebrown: 9127187,
    salmon: 16416882,
    sandybrown: 16032864,
    seagreen: 3050327,
    seashell: 16774638,
    sienna: 10506797,
    silver: 12632256,
    skyblue: 8900331,
    slateblue: 6970061,
    slategray: 7372944,
    slategrey: 7372944,
    snow: 16775930,
    springgreen: 65407,
    steelblue: 4620980,
    tan: 13808780,
    teal: 32896,
    thistle: 14204888,
    tomato: 16737095,
    turquoise: 4251856,
    violet: 15631086,
    wheat: 16113331,
    white: 16777215,
    whitesmoke: 16119285,
    yellow: 16776960,
    yellowgreen: 10145074
  };
  define_default(Color2, color, {
    copy(channels) {
      return Object.assign(new this.constructor(), this, channels);
    },
    displayable() {
      return this.rgb().displayable();
    },
    hex: color_formatHex,
    // Deprecated! Use color.formatHex.
    formatHex: color_formatHex,
    formatHex8: color_formatHex8,
    formatHsl: color_formatHsl,
    formatRgb: color_formatRgb,
    toString: color_formatRgb
  });
  function color_formatHex() {
    return this.rgb().formatHex();
  }
  function color_formatHex8() {
    return this.rgb().formatHex8();
  }
  function color_formatHsl() {
    return hslConvert(this).formatHsl();
  }
  function color_formatRgb() {
    return this.rgb().formatRgb();
  }
  function color(format) {
    var m2, l;
    format = (format + "").trim().toLowerCase();
    return (m2 = reHex.exec(format)) ? (l = m2[1].length, m2 = parseInt(m2[1], 16), l === 6 ? rgbn(m2) : l === 3 ? new Rgb(m2 >> 8 & 15 | m2 >> 4 & 240, m2 >> 4 & 15 | m2 & 240, (m2 & 15) << 4 | m2 & 15, 1) : l === 8 ? rgba(m2 >> 24 & 255, m2 >> 16 & 255, m2 >> 8 & 255, (m2 & 255) / 255) : l === 4 ? rgba(m2 >> 12 & 15 | m2 >> 8 & 240, m2 >> 8 & 15 | m2 >> 4 & 240, m2 >> 4 & 15 | m2 & 240, ((m2 & 15) << 4 | m2 & 15) / 255) : null) : (m2 = reRgbInteger.exec(format)) ? new Rgb(m2[1], m2[2], m2[3], 1) : (m2 = reRgbPercent.exec(format)) ? new Rgb(m2[1] * 255 / 100, m2[2] * 255 / 100, m2[3] * 255 / 100, 1) : (m2 = reRgbaInteger.exec(format)) ? rgba(m2[1], m2[2], m2[3], m2[4]) : (m2 = reRgbaPercent.exec(format)) ? rgba(m2[1] * 255 / 100, m2[2] * 255 / 100, m2[3] * 255 / 100, m2[4]) : (m2 = reHslPercent.exec(format)) ? hsla(m2[1], m2[2] / 100, m2[3] / 100, 1) : (m2 = reHslaPercent.exec(format)) ? hsla(m2[1], m2[2] / 100, m2[3] / 100, m2[4]) : named.hasOwnProperty(format) ? rgbn(named[format]) : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
  }
  function rgbn(n) {
    return new Rgb(n >> 16 & 255, n >> 8 & 255, n & 255, 1);
  }
  function rgba(r, g, b, a2) {
    if (a2 <= 0) r = g = b = NaN;
    return new Rgb(r, g, b, a2);
  }
  function rgbConvert(o) {
    if (!(o instanceof Color2)) o = color(o);
    if (!o) return new Rgb();
    o = o.rgb();
    return new Rgb(o.r, o.g, o.b, o.opacity);
  }
  function rgb(r, g, b, opacity) {
    return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
  }
  function Rgb(r, g, b, opacity) {
    this.r = +r;
    this.g = +g;
    this.b = +b;
    this.opacity = +opacity;
  }
  define_default(Rgb, rgb, extend(Color2, {
    brighter(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    darker(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    rgb() {
      return this;
    },
    clamp() {
      return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
    },
    displayable() {
      return -0.5 <= this.r && this.r < 255.5 && (-0.5 <= this.g && this.g < 255.5) && (-0.5 <= this.b && this.b < 255.5) && (0 <= this.opacity && this.opacity <= 1);
    },
    hex: rgb_formatHex,
    // Deprecated! Use color.formatHex.
    formatHex: rgb_formatHex,
    formatHex8: rgb_formatHex8,
    formatRgb: rgb_formatRgb,
    toString: rgb_formatRgb
  }));
  function rgb_formatHex() {
    return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
  }
  function rgb_formatHex8() {
    return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
  }
  function rgb_formatRgb() {
    const a2 = clampa(this.opacity);
    return `${a2 === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a2 === 1 ? ")" : `, ${a2})`}`;
  }
  function clampa(opacity) {
    return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
  }
  function clampi(value) {
    return Math.max(0, Math.min(255, Math.round(value) || 0));
  }
  function hex(value) {
    value = clampi(value);
    return (value < 16 ? "0" : "") + value.toString(16);
  }
  function hsla(h, s, l, a2) {
    if (a2 <= 0) h = s = l = NaN;
    else if (l <= 0 || l >= 1) h = s = NaN;
    else if (s <= 0) h = NaN;
    return new Hsl(h, s, l, a2);
  }
  function hslConvert(o) {
    if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
    if (!(o instanceof Color2)) o = color(o);
    if (!o) return new Hsl();
    if (o instanceof Hsl) return o;
    o = o.rgb();
    var r = o.r / 255, g = o.g / 255, b = o.b / 255, min = Math.min(r, g, b), max = Math.max(r, g, b), h = NaN, s = max - min, l = (max + min) / 2;
    if (s) {
      if (r === max) h = (g - b) / s + (g < b) * 6;
      else if (g === max) h = (b - r) / s + 2;
      else h = (r - g) / s + 4;
      s /= l < 0.5 ? max + min : 2 - max - min;
      h *= 60;
    } else {
      s = l > 0 && l < 1 ? 0 : h;
    }
    return new Hsl(h, s, l, o.opacity);
  }
  function hsl(h, s, l, opacity) {
    return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
  }
  function Hsl(h, s, l, opacity) {
    this.h = +h;
    this.s = +s;
    this.l = +l;
    this.opacity = +opacity;
  }
  define_default(Hsl, hsl, extend(Color2, {
    brighter(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    darker(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    rgb() {
      var h = this.h % 360 + (this.h < 0) * 360, s = isNaN(h) || isNaN(this.s) ? 0 : this.s, l = this.l, m2 = l + (l < 0.5 ? l : 1 - l) * s, m1 = 2 * l - m2;
      return new Rgb(
        hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
        hsl2rgb(h, m1, m2),
        hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
        this.opacity
      );
    },
    clamp() {
      return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
    },
    displayable() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && (0 <= this.l && this.l <= 1) && (0 <= this.opacity && this.opacity <= 1);
    },
    formatHsl() {
      const a2 = clampa(this.opacity);
      return `${a2 === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a2 === 1 ? ")" : `, ${a2})`}`;
    }
  }));
  function clamph(value) {
    value = (value || 0) % 360;
    return value < 0 ? value + 360 : value;
  }
  function clampt(value) {
    return Math.max(0, Math.min(1, value || 0));
  }
  function hsl2rgb(h, m1, m2) {
    return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
  }

  // node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/basis.js
  function basis(t1, v0, v1, v2, v3) {
    var t2 = t1 * t1, t3 = t2 * t1;
    return ((1 - 3 * t1 + 3 * t2 - t3) * v0 + (4 - 6 * t2 + 3 * t3) * v1 + (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2 + t3 * v3) / 6;
  }
  function basis_default(values) {
    var n = values.length - 1;
    return function(t) {
      var i = t <= 0 ? t = 0 : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n), v1 = values[i], v2 = values[i + 1], v0 = i > 0 ? values[i - 1] : 2 * v1 - v2, v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
      return basis((t - i / n) * n, v0, v1, v2, v3);
    };
  }

  // node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/basisClosed.js
  function basisClosed_default(values) {
    var n = values.length;
    return function(t) {
      var i = Math.floor(((t %= 1) < 0 ? ++t : t) * n), v0 = values[(i + n - 1) % n], v1 = values[i % n], v2 = values[(i + 1) % n], v3 = values[(i + 2) % n];
      return basis((t - i / n) * n, v0, v1, v2, v3);
    };
  }

  // node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/constant.js
  var constant_default3 = (x3) => () => x3;

  // node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/color.js
  function linear2(a2, d) {
    return function(t) {
      return a2 + t * d;
    };
  }
  function exponential(a2, b, y3) {
    return a2 = Math.pow(a2, y3), b = Math.pow(b, y3) - a2, y3 = 1 / y3, function(t) {
      return Math.pow(a2 + t * b, y3);
    };
  }
  function gamma(y3) {
    return (y3 = +y3) === 1 ? nogamma : function(a2, b) {
      return b - a2 ? exponential(a2, b, y3) : constant_default3(isNaN(a2) ? b : a2);
    };
  }
  function nogamma(a2, b) {
    var d = b - a2;
    return d ? linear2(a2, d) : constant_default3(isNaN(a2) ? b : a2);
  }

  // node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/rgb.js
  var rgb_default = (function rgbGamma(y3) {
    var color2 = gamma(y3);
    function rgb2(start2, end) {
      var r = color2((start2 = rgb(start2)).r, (end = rgb(end)).r), g = color2(start2.g, end.g), b = color2(start2.b, end.b), opacity = nogamma(start2.opacity, end.opacity);
      return function(t) {
        start2.r = r(t);
        start2.g = g(t);
        start2.b = b(t);
        start2.opacity = opacity(t);
        return start2 + "";
      };
    }
    rgb2.gamma = rgbGamma;
    return rgb2;
  })(1);
  function rgbSpline(spline) {
    return function(colors) {
      var n = colors.length, r = new Array(n), g = new Array(n), b = new Array(n), i, color2;
      for (i = 0; i < n; ++i) {
        color2 = rgb(colors[i]);
        r[i] = color2.r || 0;
        g[i] = color2.g || 0;
        b[i] = color2.b || 0;
      }
      r = spline(r);
      g = spline(g);
      b = spline(b);
      color2.opacity = 1;
      return function(t) {
        color2.r = r(t);
        color2.g = g(t);
        color2.b = b(t);
        return color2 + "";
      };
    };
  }
  var rgbBasis = rgbSpline(basis_default);
  var rgbBasisClosed = rgbSpline(basisClosed_default);

  // node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/number.js
  function number_default(a2, b) {
    return a2 = +a2, b = +b, function(t) {
      return a2 * (1 - t) + b * t;
    };
  }

  // node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/string.js
  var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
  var reB = new RegExp(reA.source, "g");
  function zero(b) {
    return function() {
      return b;
    };
  }
  function one(b) {
    return function(t) {
      return b(t) + "";
    };
  }
  function string_default(a2, b) {
    var bi = reA.lastIndex = reB.lastIndex = 0, am, bm, bs, i = -1, s = [], q = [];
    a2 = a2 + "", b = b + "";
    while ((am = reA.exec(a2)) && (bm = reB.exec(b))) {
      if ((bs = bm.index) > bi) {
        bs = b.slice(bi, bs);
        if (s[i]) s[i] += bs;
        else s[++i] = bs;
      }
      if ((am = am[0]) === (bm = bm[0])) {
        if (s[i]) s[i] += bm;
        else s[++i] = bm;
      } else {
        s[++i] = null;
        q.push({ i, x: number_default(am, bm) });
      }
      bi = reB.lastIndex;
    }
    if (bi < b.length) {
      bs = b.slice(bi);
      if (s[i]) s[i] += bs;
      else s[++i] = bs;
    }
    return s.length < 2 ? q[0] ? one(q[0].x) : zero(b) : (b = q.length, function(t) {
      for (var i2 = 0, o; i2 < b; ++i2) s[(o = q[i2]).i] = o.x(t);
      return s.join("");
    });
  }

  // node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/transform/decompose.js
  var degrees = 180 / Math.PI;
  var identity = {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    scaleX: 1,
    scaleY: 1
  };
  function decompose_default(a2, b, c2, d, e, f) {
    var scaleX, scaleY, skewX;
    if (scaleX = Math.sqrt(a2 * a2 + b * b)) a2 /= scaleX, b /= scaleX;
    if (skewX = a2 * c2 + b * d) c2 -= a2 * skewX, d -= b * skewX;
    if (scaleY = Math.sqrt(c2 * c2 + d * d)) c2 /= scaleY, d /= scaleY, skewX /= scaleY;
    if (a2 * d < b * c2) a2 = -a2, b = -b, skewX = -skewX, scaleX = -scaleX;
    return {
      translateX: e,
      translateY: f,
      rotate: Math.atan2(b, a2) * degrees,
      skewX: Math.atan(skewX) * degrees,
      scaleX,
      scaleY
    };
  }

  // node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/transform/parse.js
  var svgNode;
  function parseCss(value) {
    const m2 = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
    return m2.isIdentity ? identity : decompose_default(m2.a, m2.b, m2.c, m2.d, m2.e, m2.f);
  }
  function parseSvg(value) {
    if (value == null) return identity;
    if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svgNode.setAttribute("transform", value);
    if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
    value = value.matrix;
    return decompose_default(value.a, value.b, value.c, value.d, value.e, value.f);
  }

  // node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/transform/index.js
  function interpolateTransform(parse, pxComma, pxParen, degParen) {
    function pop(s) {
      return s.length ? s.pop() + " " : "";
    }
    function translate(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push("translate(", null, pxComma, null, pxParen);
        q.push({ i: i - 4, x: number_default(xa, xb) }, { i: i - 2, x: number_default(ya, yb) });
      } else if (xb || yb) {
        s.push("translate(" + xb + pxComma + yb + pxParen);
      }
    }
    function rotate(a2, b, s, q) {
      if (a2 !== b) {
        if (a2 - b > 180) b += 360;
        else if (b - a2 > 180) a2 += 360;
        q.push({ i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: number_default(a2, b) });
      } else if (b) {
        s.push(pop(s) + "rotate(" + b + degParen);
      }
    }
    function skewX(a2, b, s, q) {
      if (a2 !== b) {
        q.push({ i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: number_default(a2, b) });
      } else if (b) {
        s.push(pop(s) + "skewX(" + b + degParen);
      }
    }
    function scale(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push(pop(s) + "scale(", null, ",", null, ")");
        q.push({ i: i - 4, x: number_default(xa, xb) }, { i: i - 2, x: number_default(ya, yb) });
      } else if (xb !== 1 || yb !== 1) {
        s.push(pop(s) + "scale(" + xb + "," + yb + ")");
      }
    }
    return function(a2, b) {
      var s = [], q = [];
      a2 = parse(a2), b = parse(b);
      translate(a2.translateX, a2.translateY, b.translateX, b.translateY, s, q);
      rotate(a2.rotate, b.rotate, s, q);
      skewX(a2.skewX, b.skewX, s, q);
      scale(a2.scaleX, a2.scaleY, b.scaleX, b.scaleY, s, q);
      a2 = b = null;
      return function(t) {
        var i = -1, n = q.length, o;
        while (++i < n) s[(o = q[i]).i] = o.x(t);
        return s.join("");
      };
    };
  }
  var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
  var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

  // node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/zoom.js
  var epsilon2 = 1e-12;
  function cosh(x3) {
    return ((x3 = Math.exp(x3)) + 1 / x3) / 2;
  }
  function sinh(x3) {
    return ((x3 = Math.exp(x3)) - 1 / x3) / 2;
  }
  function tanh(x3) {
    return ((x3 = Math.exp(2 * x3)) - 1) / (x3 + 1);
  }
  var zoom_default = (function zoomRho(rho, rho2, rho4) {
    function zoom(p0, p1) {
      var ux0 = p0[0], uy0 = p0[1], w0 = p0[2], ux1 = p1[0], uy1 = p1[1], w1 = p1[2], dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy, i, S;
      if (d2 < epsilon2) {
        S = Math.log(w1 / w0) / rho;
        i = function(t) {
          return [
            ux0 + t * dx,
            uy0 + t * dy,
            w0 * Math.exp(rho * t * S)
          ];
        };
      } else {
        var d1 = Math.sqrt(d2), b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1), b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1), r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
        S = (r1 - r0) / rho;
        i = function(t) {
          var s = t * S, coshr0 = cosh(r0), u = w0 / (rho2 * d1) * (coshr0 * tanh(rho * s + r0) - sinh(r0));
          return [
            ux0 + u * dx,
            uy0 + u * dy,
            w0 * coshr0 / cosh(rho * s + r0)
          ];
        };
      }
      i.duration = S * 1e3 * rho / Math.SQRT2;
      return i;
    }
    zoom.rho = function(_) {
      var _1 = Math.max(1e-3, +_), _2 = _1 * _1, _4 = _2 * _2;
      return zoomRho(_1, _2, _4);
    };
    return zoom;
  })(Math.SQRT2, 2, 4);

  // node_modules/.pnpm/d3-timer@3.0.1/node_modules/d3-timer/src/timer.js
  var frame = 0;
  var timeout = 0;
  var interval = 0;
  var pokeDelay = 1e3;
  var taskHead;
  var taskTail;
  var clockLast = 0;
  var clockNow = 0;
  var clockSkew = 0;
  var clock = typeof performance === "object" && performance.now ? performance : Date;
  var setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) {
    setTimeout(f, 17);
  };
  function now() {
    return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
  }
  function clearNow() {
    clockNow = 0;
  }
  function Timer() {
    this._call = this._time = this._next = null;
  }
  Timer.prototype = timer.prototype = {
    constructor: Timer,
    restart: function(callback, delay, time) {
      if (typeof callback !== "function") throw new TypeError("callback is not a function");
      time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
      if (!this._next && taskTail !== this) {
        if (taskTail) taskTail._next = this;
        else taskHead = this;
        taskTail = this;
      }
      this._call = callback;
      this._time = time;
      sleep();
    },
    stop: function() {
      if (this._call) {
        this._call = null;
        this._time = Infinity;
        sleep();
      }
    }
  };
  function timer(callback, delay, time) {
    var t = new Timer();
    t.restart(callback, delay, time);
    return t;
  }
  function timerFlush() {
    now();
    ++frame;
    var t = taskHead, e;
    while (t) {
      if ((e = clockNow - t._time) >= 0) t._call.call(void 0, e);
      t = t._next;
    }
    --frame;
  }
  function wake() {
    clockNow = (clockLast = clock.now()) + clockSkew;
    frame = timeout = 0;
    try {
      timerFlush();
    } finally {
      frame = 0;
      nap();
      clockNow = 0;
    }
  }
  function poke() {
    var now2 = clock.now(), delay = now2 - clockLast;
    if (delay > pokeDelay) clockSkew -= delay, clockLast = now2;
  }
  function nap() {
    var t0, t1 = taskHead, t2, time = Infinity;
    while (t1) {
      if (t1._call) {
        if (time > t1._time) time = t1._time;
        t0 = t1, t1 = t1._next;
      } else {
        t2 = t1._next, t1._next = null;
        t1 = t0 ? t0._next = t2 : taskHead = t2;
      }
    }
    taskTail = t0;
    sleep(time);
  }
  function sleep(time) {
    if (frame) return;
    if (timeout) timeout = clearTimeout(timeout);
    var delay = time - clockNow;
    if (delay > 24) {
      if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
      if (interval) interval = clearInterval(interval);
    } else {
      if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
      frame = 1, setFrame(wake);
    }
  }

  // node_modules/.pnpm/d3-timer@3.0.1/node_modules/d3-timer/src/timeout.js
  function timeout_default(callback, delay, time) {
    var t = new Timer();
    delay = delay == null ? 0 : +delay;
    t.restart((elapsed) => {
      t.stop();
      callback(elapsed + delay);
    }, delay, time);
    return t;
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/schedule.js
  var emptyOn = dispatch_default("start", "end", "cancel", "interrupt");
  var emptyTween = [];
  var CREATED = 0;
  var SCHEDULED = 1;
  var STARTING = 2;
  var STARTED = 3;
  var RUNNING = 4;
  var ENDING = 5;
  var ENDED = 6;
  function schedule_default(node, name, id2, index2, group, timing) {
    var schedules = node.__transition;
    if (!schedules) node.__transition = {};
    else if (id2 in schedules) return;
    create(node, id2, {
      name,
      index: index2,
      // For context during callback.
      group,
      // For context during callback.
      on: emptyOn,
      tween: emptyTween,
      time: timing.time,
      delay: timing.delay,
      duration: timing.duration,
      ease: timing.ease,
      timer: null,
      state: CREATED
    });
  }
  function init(node, id2) {
    var schedule = get2(node, id2);
    if (schedule.state > CREATED) throw new Error("too late; already scheduled");
    return schedule;
  }
  function set2(node, id2) {
    var schedule = get2(node, id2);
    if (schedule.state > STARTED) throw new Error("too late; already running");
    return schedule;
  }
  function get2(node, id2) {
    var schedule = node.__transition;
    if (!schedule || !(schedule = schedule[id2])) throw new Error("transition not found");
    return schedule;
  }
  function create(node, id2, self2) {
    var schedules = node.__transition, tween;
    schedules[id2] = self2;
    self2.timer = timer(schedule, 0, self2.time);
    function schedule(elapsed) {
      self2.state = SCHEDULED;
      self2.timer.restart(start2, self2.delay, self2.time);
      if (self2.delay <= elapsed) start2(elapsed - self2.delay);
    }
    function start2(elapsed) {
      var i, j, n, o;
      if (self2.state !== SCHEDULED) return stop();
      for (i in schedules) {
        o = schedules[i];
        if (o.name !== self2.name) continue;
        if (o.state === STARTED) return timeout_default(start2);
        if (o.state === RUNNING) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("interrupt", node, node.__data__, o.index, o.group);
          delete schedules[i];
        } else if (+i < id2) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("cancel", node, node.__data__, o.index, o.group);
          delete schedules[i];
        }
      }
      timeout_default(function() {
        if (self2.state === STARTED) {
          self2.state = RUNNING;
          self2.timer.restart(tick, self2.delay, self2.time);
          tick(elapsed);
        }
      });
      self2.state = STARTING;
      self2.on.call("start", node, node.__data__, self2.index, self2.group);
      if (self2.state !== STARTING) return;
      self2.state = STARTED;
      tween = new Array(n = self2.tween.length);
      for (i = 0, j = -1; i < n; ++i) {
        if (o = self2.tween[i].value.call(node, node.__data__, self2.index, self2.group)) {
          tween[++j] = o;
        }
      }
      tween.length = j + 1;
    }
    function tick(elapsed) {
      var t = elapsed < self2.duration ? self2.ease.call(null, elapsed / self2.duration) : (self2.timer.restart(stop), self2.state = ENDING, 1), i = -1, n = tween.length;
      while (++i < n) {
        tween[i].call(node, t);
      }
      if (self2.state === ENDING) {
        self2.on.call("end", node, node.__data__, self2.index, self2.group);
        stop();
      }
    }
    function stop() {
      self2.state = ENDED;
      self2.timer.stop();
      delete schedules[id2];
      for (var i in schedules) return;
      delete node.__transition;
    }
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/interrupt.js
  function interrupt_default(node, name) {
    var schedules = node.__transition, schedule, active, empty2 = true, i;
    if (!schedules) return;
    name = name == null ? null : name + "";
    for (i in schedules) {
      if ((schedule = schedules[i]).name !== name) {
        empty2 = false;
        continue;
      }
      active = schedule.state > STARTING && schedule.state < ENDING;
      schedule.state = ENDED;
      schedule.timer.stop();
      schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
      delete schedules[i];
    }
    if (empty2) delete node.__transition;
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/selection/interrupt.js
  function interrupt_default2(name) {
    return this.each(function() {
      interrupt_default(this, name);
    });
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/tween.js
  function tweenRemove(id2, name) {
    var tween0, tween1;
    return function() {
      var schedule = set2(this, id2), tween = schedule.tween;
      if (tween !== tween0) {
        tween1 = tween0 = tween;
        for (var i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name) {
            tween1 = tween1.slice();
            tween1.splice(i, 1);
            break;
          }
        }
      }
      schedule.tween = tween1;
    };
  }
  function tweenFunction(id2, name, value) {
    var tween0, tween1;
    if (typeof value !== "function") throw new Error();
    return function() {
      var schedule = set2(this, id2), tween = schedule.tween;
      if (tween !== tween0) {
        tween1 = (tween0 = tween).slice();
        for (var t = { name, value }, i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name) {
            tween1[i] = t;
            break;
          }
        }
        if (i === n) tween1.push(t);
      }
      schedule.tween = tween1;
    };
  }
  function tween_default(name, value) {
    var id2 = this._id;
    name += "";
    if (arguments.length < 2) {
      var tween = get2(this.node(), id2).tween;
      for (var i = 0, n = tween.length, t; i < n; ++i) {
        if ((t = tween[i]).name === name) {
          return t.value;
        }
      }
      return null;
    }
    return this.each((value == null ? tweenRemove : tweenFunction)(id2, name, value));
  }
  function tweenValue(transition2, name, value) {
    var id2 = transition2._id;
    transition2.each(function() {
      var schedule = set2(this, id2);
      (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
    });
    return function(node) {
      return get2(node, id2).value[name];
    };
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/interpolate.js
  function interpolate_default(a2, b) {
    var c2;
    return (typeof b === "number" ? number_default : b instanceof color ? rgb_default : (c2 = color(b)) ? (b = c2, rgb_default) : string_default)(a2, b);
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/attr.js
  function attrRemove2(name) {
    return function() {
      this.removeAttribute(name);
    };
  }
  function attrRemoveNS2(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }
  function attrConstant2(name, interpolate, value1) {
    var string00, string1 = value1 + "", interpolate0;
    return function() {
      var string0 = this.getAttribute(name);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
    };
  }
  function attrConstantNS2(fullname, interpolate, value1) {
    var string00, string1 = value1 + "", interpolate0;
    return function() {
      var string0 = this.getAttributeNS(fullname.space, fullname.local);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
    };
  }
  function attrFunction2(name, interpolate, value) {
    var string00, string10, interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null) return void this.removeAttribute(name);
      string0 = this.getAttribute(name);
      string1 = value1 + "";
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }
  function attrFunctionNS2(fullname, interpolate, value) {
    var string00, string10, interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
      string0 = this.getAttributeNS(fullname.space, fullname.local);
      string1 = value1 + "";
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }
  function attr_default2(name, value) {
    var fullname = namespace_default(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate_default;
    return this.attrTween(name, typeof value === "function" ? (fullname.local ? attrFunctionNS2 : attrFunction2)(fullname, i, tweenValue(this, "attr." + name, value)) : value == null ? (fullname.local ? attrRemoveNS2 : attrRemove2)(fullname) : (fullname.local ? attrConstantNS2 : attrConstant2)(fullname, i, value));
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/attrTween.js
  function attrInterpolate(name, i) {
    return function(t) {
      this.setAttribute(name, i.call(this, t));
    };
  }
  function attrInterpolateNS(fullname, i) {
    return function(t) {
      this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
    };
  }
  function attrTweenNS(fullname, value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
      return t0;
    }
    tween._value = value;
    return tween;
  }
  function attrTween(name, value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
      return t0;
    }
    tween._value = value;
    return tween;
  }
  function attrTween_default(name, value) {
    var key = "attr." + name;
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error();
    var fullname = namespace_default(name);
    return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/delay.js
  function delayFunction(id2, value) {
    return function() {
      init(this, id2).delay = +value.apply(this, arguments);
    };
  }
  function delayConstant(id2, value) {
    return value = +value, function() {
      init(this, id2).delay = value;
    };
  }
  function delay_default(value) {
    var id2 = this._id;
    return arguments.length ? this.each((typeof value === "function" ? delayFunction : delayConstant)(id2, value)) : get2(this.node(), id2).delay;
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/duration.js
  function durationFunction(id2, value) {
    return function() {
      set2(this, id2).duration = +value.apply(this, arguments);
    };
  }
  function durationConstant(id2, value) {
    return value = +value, function() {
      set2(this, id2).duration = value;
    };
  }
  function duration_default(value) {
    var id2 = this._id;
    return arguments.length ? this.each((typeof value === "function" ? durationFunction : durationConstant)(id2, value)) : get2(this.node(), id2).duration;
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/ease.js
  function easeConstant(id2, value) {
    if (typeof value !== "function") throw new Error();
    return function() {
      set2(this, id2).ease = value;
    };
  }
  function ease_default(value) {
    var id2 = this._id;
    return arguments.length ? this.each(easeConstant(id2, value)) : get2(this.node(), id2).ease;
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/easeVarying.js
  function easeVarying(id2, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (typeof v !== "function") throw new Error();
      set2(this, id2).ease = v;
    };
  }
  function easeVarying_default(value) {
    if (typeof value !== "function") throw new Error();
    return this.each(easeVarying(this._id, value));
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/filter.js
  function filter_default2(match) {
    if (typeof match !== "function") match = matcher_default(match);
    for (var groups = this._groups, m2 = groups.length, subgroups = new Array(m2), j = 0; j < m2; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }
    return new Transition(subgroups, this._parents, this._name, this._id);
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/merge.js
  function merge_default2(transition2) {
    if (transition2._id !== this._id) throw new Error();
    for (var groups0 = this._groups, groups1 = transition2._groups, m0 = groups0.length, m1 = groups1.length, m2 = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m2; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }
    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }
    return new Transition(merges, this._parents, this._name, this._id);
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/on.js
  function start(name) {
    return (name + "").trim().split(/^|\s+/).every(function(t) {
      var i = t.indexOf(".");
      if (i >= 0) t = t.slice(0, i);
      return !t || t === "start";
    });
  }
  function onFunction(id2, name, listener) {
    var on0, on1, sit = start(name) ? init : set2;
    return function() {
      var schedule = sit(this, id2), on = schedule.on;
      if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);
      schedule.on = on1;
    };
  }
  function on_default2(name, listener) {
    var id2 = this._id;
    return arguments.length < 2 ? get2(this.node(), id2).on.on(name) : this.each(onFunction(id2, name, listener));
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/remove.js
  function removeFunction(id2) {
    return function() {
      var parent = this.parentNode;
      for (var i in this.__transition) if (+i !== id2) return;
      if (parent) parent.removeChild(this);
    };
  }
  function remove_default2() {
    return this.on("end.remove", removeFunction(this._id));
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/select.js
  function select_default3(select) {
    var name = this._name, id2 = this._id;
    if (typeof select !== "function") select = selector_default(select);
    for (var groups = this._groups, m2 = groups.length, subgroups = new Array(m2), j = 0; j < m2; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
          schedule_default(subgroup[i], name, id2, i, subgroup, get2(node, id2));
        }
      }
    }
    return new Transition(subgroups, this._parents, name, id2);
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/selectAll.js
  function selectAll_default2(select) {
    var name = this._name, id2 = this._id;
    if (typeof select !== "function") select = selectorAll_default(select);
    for (var groups = this._groups, m2 = groups.length, subgroups = [], parents = [], j = 0; j < m2; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          for (var children2 = select.call(node, node.__data__, i, group), child, inherit2 = get2(node, id2), k = 0, l = children2.length; k < l; ++k) {
            if (child = children2[k]) {
              schedule_default(child, name, id2, k, children2, inherit2);
            }
          }
          subgroups.push(children2);
          parents.push(node);
        }
      }
    }
    return new Transition(subgroups, parents, name, id2);
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/selection.js
  var Selection2 = selection_default.prototype.constructor;
  function selection_default2() {
    return new Selection2(this._groups, this._parents);
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/style.js
  function styleNull(name, interpolate) {
    var string00, string10, interpolate0;
    return function() {
      var string0 = styleValue(this, name), string1 = (this.style.removeProperty(name), styleValue(this, name));
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : interpolate0 = interpolate(string00 = string0, string10 = string1);
    };
  }
  function styleRemove2(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }
  function styleConstant2(name, interpolate, value1) {
    var string00, string1 = value1 + "", interpolate0;
    return function() {
      var string0 = styleValue(this, name);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
    };
  }
  function styleFunction2(name, interpolate, value) {
    var string00, string10, interpolate0;
    return function() {
      var string0 = styleValue(this, name), value1 = value(this), string1 = value1 + "";
      if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }
  function styleMaybeRemove(id2, name) {
    var on0, on1, listener0, key = "style." + name, event = "end." + key, remove2;
    return function() {
      var schedule = set2(this, id2), on = schedule.on, listener = schedule.value[key] == null ? remove2 || (remove2 = styleRemove2(name)) : void 0;
      if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);
      schedule.on = on1;
    };
  }
  function style_default2(name, value, priority) {
    var i = (name += "") === "transform" ? interpolateTransformCss : interpolate_default;
    return value == null ? this.styleTween(name, styleNull(name, i)).on("end.style." + name, styleRemove2(name)) : typeof value === "function" ? this.styleTween(name, styleFunction2(name, i, tweenValue(this, "style." + name, value))).each(styleMaybeRemove(this._id, name)) : this.styleTween(name, styleConstant2(name, i, value), priority).on("end.style." + name, null);
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/styleTween.js
  function styleInterpolate(name, i, priority) {
    return function(t) {
      this.style.setProperty(name, i.call(this, t), priority);
    };
  }
  function styleTween(name, value, priority) {
    var t, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
      return t;
    }
    tween._value = value;
    return tween;
  }
  function styleTween_default(name, value, priority) {
    var key = "style." + (name += "");
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error();
    return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/text.js
  function textConstant2(value) {
    return function() {
      this.textContent = value;
    };
  }
  function textFunction2(value) {
    return function() {
      var value1 = value(this);
      this.textContent = value1 == null ? "" : value1;
    };
  }
  function text_default2(value) {
    return this.tween("text", typeof value === "function" ? textFunction2(tweenValue(this, "text", value)) : textConstant2(value == null ? "" : value + ""));
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/textTween.js
  function textInterpolate(i) {
    return function(t) {
      this.textContent = i.call(this, t);
    };
  }
  function textTween(value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
      return t0;
    }
    tween._value = value;
    return tween;
  }
  function textTween_default(value) {
    var key = "text";
    if (arguments.length < 1) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error();
    return this.tween(key, textTween(value));
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/transition.js
  function transition_default() {
    var name = this._name, id0 = this._id, id1 = newId();
    for (var groups = this._groups, m2 = groups.length, j = 0; j < m2; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          var inherit2 = get2(node, id0);
          schedule_default(node, name, id1, i, group, {
            time: inherit2.time + inherit2.delay + inherit2.duration,
            delay: 0,
            duration: inherit2.duration,
            ease: inherit2.ease
          });
        }
      }
    }
    return new Transition(groups, this._parents, name, id1);
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/end.js
  function end_default() {
    var on0, on1, that = this, id2 = that._id, size = that.size();
    return new Promise(function(resolve, reject) {
      var cancel = { value: reject }, end = { value: function() {
        if (--size === 0) resolve();
      } };
      that.each(function() {
        var schedule = set2(this, id2), on = schedule.on;
        if (on !== on0) {
          on1 = (on0 = on).copy();
          on1._.cancel.push(cancel);
          on1._.interrupt.push(cancel);
          on1._.end.push(end);
        }
        schedule.on = on1;
      });
      if (size === 0) resolve();
    });
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/index.js
  var id = 0;
  function Transition(groups, parents, name, id2) {
    this._groups = groups;
    this._parents = parents;
    this._name = name;
    this._id = id2;
  }
  function transition(name) {
    return selection_default().transition(name);
  }
  function newId() {
    return ++id;
  }
  var selection_prototype = selection_default.prototype;
  Transition.prototype = transition.prototype = {
    constructor: Transition,
    select: select_default3,
    selectAll: selectAll_default2,
    selectChild: selection_prototype.selectChild,
    selectChildren: selection_prototype.selectChildren,
    filter: filter_default2,
    merge: merge_default2,
    selection: selection_default2,
    transition: transition_default,
    call: selection_prototype.call,
    nodes: selection_prototype.nodes,
    node: selection_prototype.node,
    size: selection_prototype.size,
    empty: selection_prototype.empty,
    each: selection_prototype.each,
    on: on_default2,
    attr: attr_default2,
    attrTween: attrTween_default,
    style: style_default2,
    styleTween: styleTween_default,
    text: text_default2,
    textTween: textTween_default,
    remove: remove_default2,
    tween: tween_default,
    delay: delay_default,
    duration: duration_default,
    ease: ease_default,
    easeVarying: easeVarying_default,
    end: end_default,
    [Symbol.iterator]: selection_prototype[Symbol.iterator]
  };

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/selection/transition.js
  var defaultTiming = {
    time: null,
    // Set on use.
    delay: 0,
    duration: 250,
    ease: cubicInOut
  };
  function inherit(node, id2) {
    var timing;
    while (!(timing = node.__transition) || !(timing = timing[id2])) {
      if (!(node = node.parentNode)) {
        throw new Error(`transition ${id2} not found`);
      }
    }
    return timing;
  }
  function transition_default2(name) {
    var id2, timing;
    if (name instanceof Transition) {
      id2 = name._id, name = name._name;
    } else {
      id2 = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
    }
    for (var groups = this._groups, m2 = groups.length, j = 0; j < m2; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          schedule_default(node, name, id2, i, group, timing || inherit(node, id2));
        }
      }
    }
    return new Transition(groups, this._parents, name, id2);
  }

  // node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/selection/index.js
  selection_default.prototype.interrupt = interrupt_default2;
  selection_default.prototype.transition = transition_default2;

  // node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/constant.js
  var constant_default4 = (x3) => () => x3;

  // node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/event.js
  function ZoomEvent(type, {
    sourceEvent,
    target,
    transform: transform2,
    dispatch: dispatch2
  }) {
    Object.defineProperties(this, {
      type: { value: type, enumerable: true, configurable: true },
      sourceEvent: { value: sourceEvent, enumerable: true, configurable: true },
      target: { value: target, enumerable: true, configurable: true },
      transform: { value: transform2, enumerable: true, configurable: true },
      _: { value: dispatch2 }
    });
  }

  // node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/transform.js
  function Transform(k, x3, y3) {
    this.k = k;
    this.x = x3;
    this.y = y3;
  }
  Transform.prototype = {
    constructor: Transform,
    scale: function(k) {
      return k === 1 ? this : new Transform(this.k * k, this.x, this.y);
    },
    translate: function(x3, y3) {
      return x3 === 0 & y3 === 0 ? this : new Transform(this.k, this.x + this.k * x3, this.y + this.k * y3);
    },
    apply: function(point) {
      return [point[0] * this.k + this.x, point[1] * this.k + this.y];
    },
    applyX: function(x3) {
      return x3 * this.k + this.x;
    },
    applyY: function(y3) {
      return y3 * this.k + this.y;
    },
    invert: function(location) {
      return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
    },
    invertX: function(x3) {
      return (x3 - this.x) / this.k;
    },
    invertY: function(y3) {
      return (y3 - this.y) / this.k;
    },
    rescaleX: function(x3) {
      return x3.copy().domain(x3.range().map(this.invertX, this).map(x3.invert, x3));
    },
    rescaleY: function(y3) {
      return y3.copy().domain(y3.range().map(this.invertY, this).map(y3.invert, y3));
    },
    toString: function() {
      return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
    }
  };
  var identity2 = new Transform(1, 0, 0);
  transform.prototype = Transform.prototype;
  function transform(node) {
    while (!node.__zoom) if (!(node = node.parentNode)) return identity2;
    return node.__zoom;
  }

  // node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/noevent.js
  function nopropagation2(event) {
    event.stopImmediatePropagation();
  }
  function noevent_default2(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  // node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/zoom.js
  function defaultFilter2(event) {
    return (!event.ctrlKey || event.type === "wheel") && !event.button;
  }
  function defaultExtent() {
    var e = this;
    if (e instanceof SVGElement) {
      e = e.ownerSVGElement || e;
      if (e.hasAttribute("viewBox")) {
        e = e.viewBox.baseVal;
        return [[e.x, e.y], [e.x + e.width, e.y + e.height]];
      }
      return [[0, 0], [e.width.baseVal.value, e.height.baseVal.value]];
    }
    return [[0, 0], [e.clientWidth, e.clientHeight]];
  }
  function defaultTransform() {
    return this.__zoom || identity2;
  }
  function defaultWheelDelta(event) {
    return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 2e-3) * (event.ctrlKey ? 10 : 1);
  }
  function defaultTouchable2() {
    return navigator.maxTouchPoints || "ontouchstart" in this;
  }
  function defaultConstrain(transform2, extent, translateExtent) {
    var dx0 = transform2.invertX(extent[0][0]) - translateExtent[0][0], dx1 = transform2.invertX(extent[1][0]) - translateExtent[1][0], dy0 = transform2.invertY(extent[0][1]) - translateExtent[0][1], dy1 = transform2.invertY(extent[1][1]) - translateExtent[1][1];
    return transform2.translate(
      dx1 > dx0 ? (dx0 + dx1) / 2 : Math.min(0, dx0) || Math.max(0, dx1),
      dy1 > dy0 ? (dy0 + dy1) / 2 : Math.min(0, dy0) || Math.max(0, dy1)
    );
  }
  function zoom_default2() {
    var filter2 = defaultFilter2, extent = defaultExtent, constrain = defaultConstrain, wheelDelta = defaultWheelDelta, touchable = defaultTouchable2, scaleExtent = [0, Infinity], translateExtent = [[-Infinity, -Infinity], [Infinity, Infinity]], duration = 250, interpolate = zoom_default, listeners = dispatch_default("start", "zoom", "end"), touchstarting, touchfirst, touchending, touchDelay = 500, wheelDelay = 150, clickDistance2 = 0, tapDistance = 10;
    function zoom(selection2) {
      selection2.property("__zoom", defaultTransform).on("wheel.zoom", wheeled, { passive: false }).on("mousedown.zoom", mousedowned).on("dblclick.zoom", dblclicked).filter(touchable).on("touchstart.zoom", touchstarted).on("touchmove.zoom", touchmoved).on("touchend.zoom touchcancel.zoom", touchended).style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
    }
    zoom.transform = function(collection, transform2, point, event) {
      var selection2 = collection.selection ? collection.selection() : collection;
      selection2.property("__zoom", defaultTransform);
      if (collection !== selection2) {
        schedule(collection, transform2, point, event);
      } else {
        selection2.interrupt().each(function() {
          gesture(this, arguments).event(event).start().zoom(null, typeof transform2 === "function" ? transform2.apply(this, arguments) : transform2).end();
        });
      }
    };
    zoom.scaleBy = function(selection2, k, p, event) {
      zoom.scaleTo(selection2, function() {
        var k0 = this.__zoom.k, k1 = typeof k === "function" ? k.apply(this, arguments) : k;
        return k0 * k1;
      }, p, event);
    };
    zoom.scaleTo = function(selection2, k, p, event) {
      zoom.transform(selection2, function() {
        var e = extent.apply(this, arguments), t0 = this.__zoom, p0 = p == null ? centroid(e) : typeof p === "function" ? p.apply(this, arguments) : p, p1 = t0.invert(p0), k1 = typeof k === "function" ? k.apply(this, arguments) : k;
        return constrain(translate(scale(t0, k1), p0, p1), e, translateExtent);
      }, p, event);
    };
    zoom.translateBy = function(selection2, x3, y3, event) {
      zoom.transform(selection2, function() {
        return constrain(this.__zoom.translate(
          typeof x3 === "function" ? x3.apply(this, arguments) : x3,
          typeof y3 === "function" ? y3.apply(this, arguments) : y3
        ), extent.apply(this, arguments), translateExtent);
      }, null, event);
    };
    zoom.translateTo = function(selection2, x3, y3, p, event) {
      zoom.transform(selection2, function() {
        var e = extent.apply(this, arguments), t = this.__zoom, p0 = p == null ? centroid(e) : typeof p === "function" ? p.apply(this, arguments) : p;
        return constrain(identity2.translate(p0[0], p0[1]).scale(t.k).translate(
          typeof x3 === "function" ? -x3.apply(this, arguments) : -x3,
          typeof y3 === "function" ? -y3.apply(this, arguments) : -y3
        ), e, translateExtent);
      }, p, event);
    };
    function scale(transform2, k) {
      k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], k));
      return k === transform2.k ? transform2 : new Transform(k, transform2.x, transform2.y);
    }
    function translate(transform2, p0, p1) {
      var x3 = p0[0] - p1[0] * transform2.k, y3 = p0[1] - p1[1] * transform2.k;
      return x3 === transform2.x && y3 === transform2.y ? transform2 : new Transform(transform2.k, x3, y3);
    }
    function centroid(extent2) {
      return [(+extent2[0][0] + +extent2[1][0]) / 2, (+extent2[0][1] + +extent2[1][1]) / 2];
    }
    function schedule(transition2, transform2, point, event) {
      transition2.on("start.zoom", function() {
        gesture(this, arguments).event(event).start();
      }).on("interrupt.zoom end.zoom", function() {
        gesture(this, arguments).event(event).end();
      }).tween("zoom", function() {
        var that = this, args = arguments, g = gesture(that, args).event(event), e = extent.apply(that, args), p = point == null ? centroid(e) : typeof point === "function" ? point.apply(that, args) : point, w = Math.max(e[1][0] - e[0][0], e[1][1] - e[0][1]), a2 = that.__zoom, b = typeof transform2 === "function" ? transform2.apply(that, args) : transform2, i = interpolate(a2.invert(p).concat(w / a2.k), b.invert(p).concat(w / b.k));
        return function(t) {
          if (t === 1) t = b;
          else {
            var l = i(t), k = w / l[2];
            t = new Transform(k, p[0] - l[0] * k, p[1] - l[1] * k);
          }
          g.zoom(null, t);
        };
      });
    }
    function gesture(that, args, clean) {
      return !clean && that.__zooming || new Gesture(that, args);
    }
    function Gesture(that, args) {
      this.that = that;
      this.args = args;
      this.active = 0;
      this.sourceEvent = null;
      this.extent = extent.apply(that, args);
      this.taps = 0;
    }
    Gesture.prototype = {
      event: function(event) {
        if (event) this.sourceEvent = event;
        return this;
      },
      start: function() {
        if (++this.active === 1) {
          this.that.__zooming = this;
          this.emit("start");
        }
        return this;
      },
      zoom: function(key, transform2) {
        if (this.mouse && key !== "mouse") this.mouse[1] = transform2.invert(this.mouse[0]);
        if (this.touch0 && key !== "touch") this.touch0[1] = transform2.invert(this.touch0[0]);
        if (this.touch1 && key !== "touch") this.touch1[1] = transform2.invert(this.touch1[0]);
        this.that.__zoom = transform2;
        this.emit("zoom");
        return this;
      },
      end: function() {
        if (--this.active === 0) {
          delete this.that.__zooming;
          this.emit("end");
        }
        return this;
      },
      emit: function(type) {
        var d = select_default2(this.that).datum();
        listeners.call(
          type,
          this.that,
          new ZoomEvent(type, {
            sourceEvent: this.sourceEvent,
            target: zoom,
            type,
            transform: this.that.__zoom,
            dispatch: listeners
          }),
          d
        );
      }
    };
    function wheeled(event, ...args) {
      if (!filter2.apply(this, arguments)) return;
      var g = gesture(this, args).event(event), t = this.__zoom, k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], t.k * Math.pow(2, wheelDelta.apply(this, arguments)))), p = pointer_default(event);
      if (g.wheel) {
        if (g.mouse[0][0] !== p[0] || g.mouse[0][1] !== p[1]) {
          g.mouse[1] = t.invert(g.mouse[0] = p);
        }
        clearTimeout(g.wheel);
      } else if (t.k === k) return;
      else {
        g.mouse = [p, t.invert(p)];
        interrupt_default(this);
        g.start();
      }
      noevent_default2(event);
      g.wheel = setTimeout(wheelidled, wheelDelay);
      g.zoom("mouse", constrain(translate(scale(t, k), g.mouse[0], g.mouse[1]), g.extent, translateExtent));
      function wheelidled() {
        g.wheel = null;
        g.end();
      }
    }
    function mousedowned(event, ...args) {
      if (touchending || !filter2.apply(this, arguments)) return;
      var currentTarget = event.currentTarget, g = gesture(this, args, true).event(event), v = select_default2(event.view).on("mousemove.zoom", mousemoved, true).on("mouseup.zoom", mouseupped, true), p = pointer_default(event, currentTarget), x0 = event.clientX, y0 = event.clientY;
      nodrag_default(event.view);
      nopropagation2(event);
      g.mouse = [p, this.__zoom.invert(p)];
      interrupt_default(this);
      g.start();
      function mousemoved(event2) {
        noevent_default2(event2);
        if (!g.moved) {
          var dx = event2.clientX - x0, dy = event2.clientY - y0;
          g.moved = dx * dx + dy * dy > clickDistance2;
        }
        g.event(event2).zoom("mouse", constrain(translate(g.that.__zoom, g.mouse[0] = pointer_default(event2, currentTarget), g.mouse[1]), g.extent, translateExtent));
      }
      function mouseupped(event2) {
        v.on("mousemove.zoom mouseup.zoom", null);
        yesdrag(event2.view, g.moved);
        noevent_default2(event2);
        g.event(event2).end();
      }
    }
    function dblclicked(event, ...args) {
      if (!filter2.apply(this, arguments)) return;
      var t0 = this.__zoom, p0 = pointer_default(event.changedTouches ? event.changedTouches[0] : event, this), p1 = t0.invert(p0), k1 = t0.k * (event.shiftKey ? 0.5 : 2), t1 = constrain(translate(scale(t0, k1), p0, p1), extent.apply(this, args), translateExtent);
      noevent_default2(event);
      if (duration > 0) select_default2(this).transition().duration(duration).call(schedule, t1, p0, event);
      else select_default2(this).call(zoom.transform, t1, p0, event);
    }
    function touchstarted(event, ...args) {
      if (!filter2.apply(this, arguments)) return;
      var touches = event.touches, n = touches.length, g = gesture(this, args, event.changedTouches.length === n).event(event), started, i, t, p;
      nopropagation2(event);
      for (i = 0; i < n; ++i) {
        t = touches[i], p = pointer_default(t, this);
        p = [p, this.__zoom.invert(p), t.identifier];
        if (!g.touch0) g.touch0 = p, started = true, g.taps = 1 + !!touchstarting;
        else if (!g.touch1 && g.touch0[2] !== p[2]) g.touch1 = p, g.taps = 0;
      }
      if (touchstarting) touchstarting = clearTimeout(touchstarting);
      if (started) {
        if (g.taps < 2) touchfirst = p[0], touchstarting = setTimeout(function() {
          touchstarting = null;
        }, touchDelay);
        interrupt_default(this);
        g.start();
      }
    }
    function touchmoved(event, ...args) {
      if (!this.__zooming) return;
      var g = gesture(this, args).event(event), touches = event.changedTouches, n = touches.length, i, t, p, l;
      noevent_default2(event);
      for (i = 0; i < n; ++i) {
        t = touches[i], p = pointer_default(t, this);
        if (g.touch0 && g.touch0[2] === t.identifier) g.touch0[0] = p;
        else if (g.touch1 && g.touch1[2] === t.identifier) g.touch1[0] = p;
      }
      t = g.that.__zoom;
      if (g.touch1) {
        var p0 = g.touch0[0], l0 = g.touch0[1], p1 = g.touch1[0], l1 = g.touch1[1], dp = (dp = p1[0] - p0[0]) * dp + (dp = p1[1] - p0[1]) * dp, dl = (dl = l1[0] - l0[0]) * dl + (dl = l1[1] - l0[1]) * dl;
        t = scale(t, Math.sqrt(dp / dl));
        p = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
        l = [(l0[0] + l1[0]) / 2, (l0[1] + l1[1]) / 2];
      } else if (g.touch0) p = g.touch0[0], l = g.touch0[1];
      else return;
      g.zoom("touch", constrain(translate(t, p, l), g.extent, translateExtent));
    }
    function touchended(event, ...args) {
      if (!this.__zooming) return;
      var g = gesture(this, args).event(event), touches = event.changedTouches, n = touches.length, i, t;
      nopropagation2(event);
      if (touchending) clearTimeout(touchending);
      touchending = setTimeout(function() {
        touchending = null;
      }, touchDelay);
      for (i = 0; i < n; ++i) {
        t = touches[i];
        if (g.touch0 && g.touch0[2] === t.identifier) delete g.touch0;
        else if (g.touch1 && g.touch1[2] === t.identifier) delete g.touch1;
      }
      if (g.touch1 && !g.touch0) g.touch0 = g.touch1, delete g.touch1;
      if (g.touch0) g.touch0[1] = this.__zoom.invert(g.touch0[0]);
      else {
        g.end();
        if (g.taps === 2) {
          t = pointer_default(t, this);
          if (Math.hypot(touchfirst[0] - t[0], touchfirst[1] - t[1]) < tapDistance) {
            var p = select_default2(this).on("dblclick.zoom");
            if (p) p.apply(this, arguments);
          }
        }
      }
    }
    zoom.wheelDelta = function(_) {
      return arguments.length ? (wheelDelta = typeof _ === "function" ? _ : constant_default4(+_), zoom) : wheelDelta;
    };
    zoom.filter = function(_) {
      return arguments.length ? (filter2 = typeof _ === "function" ? _ : constant_default4(!!_), zoom) : filter2;
    };
    zoom.touchable = function(_) {
      return arguments.length ? (touchable = typeof _ === "function" ? _ : constant_default4(!!_), zoom) : touchable;
    };
    zoom.extent = function(_) {
      return arguments.length ? (extent = typeof _ === "function" ? _ : constant_default4([[+_[0][0], +_[0][1]], [+_[1][0], +_[1][1]]]), zoom) : extent;
    };
    zoom.scaleExtent = function(_) {
      return arguments.length ? (scaleExtent[0] = +_[0], scaleExtent[1] = +_[1], zoom) : [scaleExtent[0], scaleExtent[1]];
    };
    zoom.translateExtent = function(_) {
      return arguments.length ? (translateExtent[0][0] = +_[0][0], translateExtent[1][0] = +_[1][0], translateExtent[0][1] = +_[0][1], translateExtent[1][1] = +_[1][1], zoom) : [[translateExtent[0][0], translateExtent[0][1]], [translateExtent[1][0], translateExtent[1][1]]];
    };
    zoom.constrain = function(_) {
      return arguments.length ? (constrain = _, zoom) : constrain;
    };
    zoom.duration = function(_) {
      return arguments.length ? (duration = +_, zoom) : duration;
    };
    zoom.interpolate = function(_) {
      return arguments.length ? (interpolate = _, zoom) : interpolate;
    };
    zoom.on = function() {
      var value = listeners.on.apply(listeners, arguments);
      return value === listeners ? zoom : value;
    };
    zoom.clickDistance = function(_) {
      return arguments.length ? (clickDistance2 = (_ = +_) * _, zoom) : Math.sqrt(clickDistance2);
    };
    zoom.tapDistance = function(_) {
      return arguments.length ? (tapDistance = +_, zoom) : tapDistance;
    };
    return zoom;
  }

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/shared.js
  var SimulatorEventType;
  (function(SimulatorEventType2) {
    SimulatorEventType2["SIMULATION_START"] = "simulation-start";
    SimulatorEventType2["SIMULATION_STEP"] = "simulation-step";
    SimulatorEventType2["SIMULATION_PROGRESS"] = "simulation-progress";
    SimulatorEventType2["SIMULATION_END"] = "simulation-end";
    SimulatorEventType2["NODE_DRAG"] = "node-drag";
    SimulatorEventType2["NODE_DRAG_END"] = "node-drag-end";
    SimulatorEventType2["SETTINGS_UPDATE"] = "settings-update";
  })(SimulatorEventType || (SimulatorEventType = {}));
  function relaySimulatorEvents(source, target, onRunningChange) {
    source.on(SimulatorEventType.SIMULATION_START, () => {
      target.emit(SimulatorEventType.SIMULATION_START, void 0);
      onRunningChange(true);
    });
    source.on(SimulatorEventType.SIMULATION_PROGRESS, (data) => {
      target.emit(SimulatorEventType.SIMULATION_PROGRESS, data);
    });
    source.on(SimulatorEventType.SIMULATION_END, (data) => {
      target.emit(SimulatorEventType.SIMULATION_END, data);
      onRunningChange(false);
    });
    source.on(SimulatorEventType.SIMULATION_STEP, (data) => {
      target.emit(SimulatorEventType.SIMULATION_STEP, data);
    });
    source.on(SimulatorEventType.NODE_DRAG, (data) => {
      target.emit(SimulatorEventType.NODE_DRAG, data);
    });
    source.on(SimulatorEventType.SETTINGS_UPDATE, (data) => {
      target.emit(SimulatorEventType.SETTINGS_UPDATE, data);
    });
  }

  // node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/center.js
  function center_default(x3, y3) {
    var nodes, strength = 1;
    if (x3 == null) x3 = 0;
    if (y3 == null) y3 = 0;
    function force() {
      var i, n = nodes.length, node, sx = 0, sy = 0;
      for (i = 0; i < n; ++i) {
        node = nodes[i], sx += node.x, sy += node.y;
      }
      for (sx = (sx / n - x3) * strength, sy = (sy / n - y3) * strength, i = 0; i < n; ++i) {
        node = nodes[i], node.x -= sx, node.y -= sy;
      }
    }
    force.initialize = function(_) {
      nodes = _;
    };
    force.x = function(_) {
      return arguments.length ? (x3 = +_, force) : x3;
    };
    force.y = function(_) {
      return arguments.length ? (y3 = +_, force) : y3;
    };
    force.strength = function(_) {
      return arguments.length ? (strength = +_, force) : strength;
    };
    return force;
  }

  // node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/add.js
  function add_default(d) {
    const x3 = +this._x.call(null, d), y3 = +this._y.call(null, d);
    return add(this.cover(x3, y3), x3, y3, d);
  }
  function add(tree, x3, y3, d) {
    if (isNaN(x3) || isNaN(y3)) return tree;
    var parent, node = tree._root, leaf = { data: d }, x0 = tree._x0, y0 = tree._y0, x1 = tree._x1, y1 = tree._y1, xm, ym, xp, yp, right, bottom, i, j;
    if (!node) return tree._root = leaf, tree;
    while (node.length) {
      if (right = x3 >= (xm = (x0 + x1) / 2)) x0 = xm;
      else x1 = xm;
      if (bottom = y3 >= (ym = (y0 + y1) / 2)) y0 = ym;
      else y1 = ym;
      if (parent = node, !(node = node[i = bottom << 1 | right])) return parent[i] = leaf, tree;
    }
    xp = +tree._x.call(null, node.data);
    yp = +tree._y.call(null, node.data);
    if (x3 === xp && y3 === yp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;
    do {
      parent = parent ? parent[i] = new Array(4) : tree._root = new Array(4);
      if (right = x3 >= (xm = (x0 + x1) / 2)) x0 = xm;
      else x1 = xm;
      if (bottom = y3 >= (ym = (y0 + y1) / 2)) y0 = ym;
      else y1 = ym;
    } while ((i = bottom << 1 | right) === (j = (yp >= ym) << 1 | xp >= xm));
    return parent[j] = node, parent[i] = leaf, tree;
  }
  function addAll(data) {
    var d, i, n = data.length, x3, y3, xz = new Array(n), yz = new Array(n), x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (i = 0; i < n; ++i) {
      if (isNaN(x3 = +this._x.call(null, d = data[i])) || isNaN(y3 = +this._y.call(null, d))) continue;
      xz[i] = x3;
      yz[i] = y3;
      if (x3 < x0) x0 = x3;
      if (x3 > x1) x1 = x3;
      if (y3 < y0) y0 = y3;
      if (y3 > y1) y1 = y3;
    }
    if (x0 > x1 || y0 > y1) return this;
    this.cover(x0, y0).cover(x1, y1);
    for (i = 0; i < n; ++i) {
      add(this, xz[i], yz[i], data[i]);
    }
    return this;
  }

  // node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/cover.js
  function cover_default(x3, y3) {
    if (isNaN(x3 = +x3) || isNaN(y3 = +y3)) return this;
    var x0 = this._x0, y0 = this._y0, x1 = this._x1, y1 = this._y1;
    if (isNaN(x0)) {
      x1 = (x0 = Math.floor(x3)) + 1;
      y1 = (y0 = Math.floor(y3)) + 1;
    } else {
      var z = x1 - x0 || 1, node = this._root, parent, i;
      while (x0 > x3 || x3 >= x1 || y0 > y3 || y3 >= y1) {
        i = (y3 < y0) << 1 | x3 < x0;
        parent = new Array(4), parent[i] = node, node = parent, z *= 2;
        switch (i) {
          case 0:
            x1 = x0 + z, y1 = y0 + z;
            break;
          case 1:
            x0 = x1 - z, y1 = y0 + z;
            break;
          case 2:
            x1 = x0 + z, y0 = y1 - z;
            break;
          case 3:
            x0 = x1 - z, y0 = y1 - z;
            break;
        }
      }
      if (this._root && this._root.length) this._root = node;
    }
    this._x0 = x0;
    this._y0 = y0;
    this._x1 = x1;
    this._y1 = y1;
    return this;
  }

  // node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/data.js
  function data_default2() {
    var data = [];
    this.visit(function(node) {
      if (!node.length) do
        data.push(node.data);
      while (node = node.next);
    });
    return data;
  }

  // node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/extent.js
  function extent_default(_) {
    return arguments.length ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1]) : isNaN(this._x0) ? void 0 : [[this._x0, this._y0], [this._x1, this._y1]];
  }

  // node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/quad.js
  function quad_default(node, x0, y0, x1, y1) {
    this.node = node;
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
  }

  // node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/find.js
  function find_default(x3, y3, radius) {
    var data, x0 = this._x0, y0 = this._y0, x1, y1, x22, y22, x32 = this._x1, y32 = this._y1, quads = [], node = this._root, q, i;
    if (node) quads.push(new quad_default(node, x0, y0, x32, y32));
    if (radius == null) radius = Infinity;
    else {
      x0 = x3 - radius, y0 = y3 - radius;
      x32 = x3 + radius, y32 = y3 + radius;
      radius *= radius;
    }
    while (q = quads.pop()) {
      if (!(node = q.node) || (x1 = q.x0) > x32 || (y1 = q.y0) > y32 || (x22 = q.x1) < x0 || (y22 = q.y1) < y0) continue;
      if (node.length) {
        var xm = (x1 + x22) / 2, ym = (y1 + y22) / 2;
        quads.push(
          new quad_default(node[3], xm, ym, x22, y22),
          new quad_default(node[2], x1, ym, xm, y22),
          new quad_default(node[1], xm, y1, x22, ym),
          new quad_default(node[0], x1, y1, xm, ym)
        );
        if (i = (y3 >= ym) << 1 | x3 >= xm) {
          q = quads[quads.length - 1];
          quads[quads.length - 1] = quads[quads.length - 1 - i];
          quads[quads.length - 1 - i] = q;
        }
      } else {
        var dx = x3 - +this._x.call(null, node.data), dy = y3 - +this._y.call(null, node.data), d2 = dx * dx + dy * dy;
        if (d2 < radius) {
          var d = Math.sqrt(radius = d2);
          x0 = x3 - d, y0 = y3 - d;
          x32 = x3 + d, y32 = y3 + d;
          data = node.data;
        }
      }
    }
    return data;
  }

  // node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/remove.js
  function remove_default3(d) {
    if (isNaN(x3 = +this._x.call(null, d)) || isNaN(y3 = +this._y.call(null, d))) return this;
    var parent, node = this._root, retainer, previous, next, x0 = this._x0, y0 = this._y0, x1 = this._x1, y1 = this._y1, x3, y3, xm, ym, right, bottom, i, j;
    if (!node) return this;
    if (node.length) while (true) {
      if (right = x3 >= (xm = (x0 + x1) / 2)) x0 = xm;
      else x1 = xm;
      if (bottom = y3 >= (ym = (y0 + y1) / 2)) y0 = ym;
      else y1 = ym;
      if (!(parent = node, node = node[i = bottom << 1 | right])) return this;
      if (!node.length) break;
      if (parent[i + 1 & 3] || parent[i + 2 & 3] || parent[i + 3 & 3]) retainer = parent, j = i;
    }
    while (node.data !== d) if (!(previous = node, node = node.next)) return this;
    if (next = node.next) delete node.next;
    if (previous) return next ? previous.next = next : delete previous.next, this;
    if (!parent) return this._root = next, this;
    next ? parent[i] = next : delete parent[i];
    if ((node = parent[0] || parent[1] || parent[2] || parent[3]) && node === (parent[3] || parent[2] || parent[1] || parent[0]) && !node.length) {
      if (retainer) retainer[j] = node;
      else this._root = node;
    }
    return this;
  }
  function removeAll(data) {
    for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
    return this;
  }

  // node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/root.js
  function root_default() {
    return this._root;
  }

  // node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/size.js
  function size_default2() {
    var size = 0;
    this.visit(function(node) {
      if (!node.length) do
        ++size;
      while (node = node.next);
    });
    return size;
  }

  // node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/visit.js
  function visit_default(callback) {
    var quads = [], q, node = this._root, child, x0, y0, x1, y1;
    if (node) quads.push(new quad_default(node, this._x0, this._y0, this._x1, this._y1));
    while (q = quads.pop()) {
      if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1) && node.length) {
        var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
        if (child = node[3]) quads.push(new quad_default(child, xm, ym, x1, y1));
        if (child = node[2]) quads.push(new quad_default(child, x0, ym, xm, y1));
        if (child = node[1]) quads.push(new quad_default(child, xm, y0, x1, ym));
        if (child = node[0]) quads.push(new quad_default(child, x0, y0, xm, ym));
      }
    }
    return this;
  }

  // node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/visitAfter.js
  function visitAfter_default(callback) {
    var quads = [], next = [], q;
    if (this._root) quads.push(new quad_default(this._root, this._x0, this._y0, this._x1, this._y1));
    while (q = quads.pop()) {
      var node = q.node;
      if (node.length) {
        var child, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
        if (child = node[0]) quads.push(new quad_default(child, x0, y0, xm, ym));
        if (child = node[1]) quads.push(new quad_default(child, xm, y0, x1, ym));
        if (child = node[2]) quads.push(new quad_default(child, x0, ym, xm, y1));
        if (child = node[3]) quads.push(new quad_default(child, xm, ym, x1, y1));
      }
      next.push(q);
    }
    while (q = next.pop()) {
      callback(q.node, q.x0, q.y0, q.x1, q.y1);
    }
    return this;
  }

  // node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/x.js
  function defaultX(d) {
    return d[0];
  }
  function x_default(_) {
    return arguments.length ? (this._x = _, this) : this._x;
  }

  // node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/y.js
  function defaultY(d) {
    return d[1];
  }
  function y_default(_) {
    return arguments.length ? (this._y = _, this) : this._y;
  }

  // node_modules/.pnpm/d3-quadtree@3.0.1/node_modules/d3-quadtree/src/quadtree.js
  function quadtree(nodes, x3, y3) {
    var tree = new Quadtree(x3 == null ? defaultX : x3, y3 == null ? defaultY : y3, NaN, NaN, NaN, NaN);
    return nodes == null ? tree : tree.addAll(nodes);
  }
  function Quadtree(x3, y3, x0, y0, x1, y1) {
    this._x = x3;
    this._y = y3;
    this._x0 = x0;
    this._y0 = y0;
    this._x1 = x1;
    this._y1 = y1;
    this._root = void 0;
  }
  function leaf_copy(leaf) {
    var copy = { data: leaf.data }, next = copy;
    while (leaf = leaf.next) next = next.next = { data: leaf.data };
    return copy;
  }
  var treeProto = quadtree.prototype = Quadtree.prototype;
  treeProto.copy = function() {
    var copy = new Quadtree(this._x, this._y, this._x0, this._y0, this._x1, this._y1), node = this._root, nodes, child;
    if (!node) return copy;
    if (!node.length) return copy._root = leaf_copy(node), copy;
    nodes = [{ source: node, target: copy._root = new Array(4) }];
    while (node = nodes.pop()) {
      for (var i = 0; i < 4; ++i) {
        if (child = node.source[i]) {
          if (child.length) nodes.push({ source: child, target: node.target[i] = new Array(4) });
          else node.target[i] = leaf_copy(child);
        }
      }
    }
    return copy;
  };
  treeProto.add = add_default;
  treeProto.addAll = addAll;
  treeProto.cover = cover_default;
  treeProto.data = data_default2;
  treeProto.extent = extent_default;
  treeProto.find = find_default;
  treeProto.remove = remove_default3;
  treeProto.removeAll = removeAll;
  treeProto.root = root_default;
  treeProto.size = size_default2;
  treeProto.visit = visit_default;
  treeProto.visitAfter = visitAfter_default;
  treeProto.x = x_default;
  treeProto.y = y_default;

  // node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/constant.js
  function constant_default5(x3) {
    return function() {
      return x3;
    };
  }

  // node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/jiggle.js
  function jiggle_default(random) {
    return (random() - 0.5) * 1e-6;
  }

  // node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/collide.js
  function x(d) {
    return d.x + d.vx;
  }
  function y(d) {
    return d.y + d.vy;
  }
  function collide_default(radius) {
    var nodes, radii, random, strength = 1, iterations = 1;
    if (typeof radius !== "function") radius = constant_default5(radius == null ? 1 : +radius);
    function force() {
      var i, n = nodes.length, tree, node, xi, yi, ri, ri2;
      for (var k = 0; k < iterations; ++k) {
        tree = quadtree(nodes, x, y).visitAfter(prepare);
        for (i = 0; i < n; ++i) {
          node = nodes[i];
          ri = radii[node.index], ri2 = ri * ri;
          xi = node.x + node.vx;
          yi = node.y + node.vy;
          tree.visit(apply);
        }
      }
      function apply(quad, x0, y0, x1, y1) {
        var data = quad.data, rj = quad.r, r = ri + rj;
        if (data) {
          if (data.index > node.index) {
            var x3 = xi - data.x - data.vx, y3 = yi - data.y - data.vy, l = x3 * x3 + y3 * y3;
            if (l < r * r) {
              if (x3 === 0) x3 = jiggle_default(random), l += x3 * x3;
              if (y3 === 0) y3 = jiggle_default(random), l += y3 * y3;
              l = (r - (l = Math.sqrt(l))) / l * strength;
              node.vx += (x3 *= l) * (r = (rj *= rj) / (ri2 + rj));
              node.vy += (y3 *= l) * r;
              data.vx -= x3 * (r = 1 - r);
              data.vy -= y3 * r;
            }
          }
          return;
        }
        return x0 > xi + r || x1 < xi - r || y0 > yi + r || y1 < yi - r;
      }
    }
    function prepare(quad) {
      if (quad.data) return quad.r = radii[quad.data.index];
      for (var i = quad.r = 0; i < 4; ++i) {
        if (quad[i] && quad[i].r > quad.r) {
          quad.r = quad[i].r;
        }
      }
    }
    function initialize() {
      if (!nodes) return;
      var i, n = nodes.length, node;
      radii = new Array(n);
      for (i = 0; i < n; ++i) node = nodes[i], radii[node.index] = +radius(node, i, nodes);
    }
    force.initialize = function(_nodes, _random) {
      nodes = _nodes;
      random = _random;
      initialize();
    };
    force.iterations = function(_) {
      return arguments.length ? (iterations = +_, force) : iterations;
    };
    force.strength = function(_) {
      return arguments.length ? (strength = +_, force) : strength;
    };
    force.radius = function(_) {
      return arguments.length ? (radius = typeof _ === "function" ? _ : constant_default5(+_), initialize(), force) : radius;
    };
    return force;
  }

  // node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/link.js
  function index(d) {
    return d.index;
  }
  function find2(nodeById, nodeId2) {
    var node = nodeById.get(nodeId2);
    if (!node) throw new Error("node not found: " + nodeId2);
    return node;
  }
  function link_default(links) {
    var id2 = index, strength = defaultStrength, strengths, distance = constant_default5(30), distances, nodes, count, bias, random, iterations = 1;
    if (links == null) links = [];
    function defaultStrength(link) {
      return 1 / Math.min(count[link.source.index], count[link.target.index]);
    }
    function force(alpha) {
      for (var k = 0, n = links.length; k < iterations; ++k) {
        for (var i = 0, link, source, target, x3, y3, l, b; i < n; ++i) {
          link = links[i], source = link.source, target = link.target;
          x3 = target.x + target.vx - source.x - source.vx || jiggle_default(random);
          y3 = target.y + target.vy - source.y - source.vy || jiggle_default(random);
          l = Math.sqrt(x3 * x3 + y3 * y3);
          l = (l - distances[i]) / l * alpha * strengths[i];
          x3 *= l, y3 *= l;
          target.vx -= x3 * (b = bias[i]);
          target.vy -= y3 * b;
          source.vx += x3 * (b = 1 - b);
          source.vy += y3 * b;
        }
      }
    }
    function initialize() {
      if (!nodes) return;
      var i, n = nodes.length, m2 = links.length, nodeById = new Map(nodes.map((d, i2) => [id2(d, i2, nodes), d])), link;
      for (i = 0, count = new Array(n); i < m2; ++i) {
        link = links[i], link.index = i;
        if (typeof link.source !== "object") link.source = find2(nodeById, link.source);
        if (typeof link.target !== "object") link.target = find2(nodeById, link.target);
        count[link.source.index] = (count[link.source.index] || 0) + 1;
        count[link.target.index] = (count[link.target.index] || 0) + 1;
      }
      for (i = 0, bias = new Array(m2); i < m2; ++i) {
        link = links[i], bias[i] = count[link.source.index] / (count[link.source.index] + count[link.target.index]);
      }
      strengths = new Array(m2), initializeStrength();
      distances = new Array(m2), initializeDistance();
    }
    function initializeStrength() {
      if (!nodes) return;
      for (var i = 0, n = links.length; i < n; ++i) {
        strengths[i] = +strength(links[i], i, links);
      }
    }
    function initializeDistance() {
      if (!nodes) return;
      for (var i = 0, n = links.length; i < n; ++i) {
        distances[i] = +distance(links[i], i, links);
      }
    }
    force.initialize = function(_nodes, _random) {
      nodes = _nodes;
      random = _random;
      initialize();
    };
    force.links = function(_) {
      return arguments.length ? (links = _, initialize(), force) : links;
    };
    force.id = function(_) {
      return arguments.length ? (id2 = _, force) : id2;
    };
    force.iterations = function(_) {
      return arguments.length ? (iterations = +_, force) : iterations;
    };
    force.strength = function(_) {
      return arguments.length ? (strength = typeof _ === "function" ? _ : constant_default5(+_), initializeStrength(), force) : strength;
    };
    force.distance = function(_) {
      return arguments.length ? (distance = typeof _ === "function" ? _ : constant_default5(+_), initializeDistance(), force) : distance;
    };
    return force;
  }

  // node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/lcg.js
  var a = 1664525;
  var c = 1013904223;
  var m = 4294967296;
  function lcg_default() {
    let s = 1;
    return () => (s = (a * s + c) % m) / m;
  }

  // node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/simulation.js
  function x2(d) {
    return d.x;
  }
  function y2(d) {
    return d.y;
  }
  var initialRadius = 10;
  var initialAngle = Math.PI * (3 - Math.sqrt(5));
  function simulation_default(nodes) {
    var simulation, alpha = 1, alphaMin = 1e-3, alphaDecay = 1 - Math.pow(alphaMin, 1 / 300), alphaTarget = 0, velocityDecay = 0.6, forces = /* @__PURE__ */ new Map(), stepper = timer(step), event = dispatch_default("tick", "end"), random = lcg_default();
    if (nodes == null) nodes = [];
    function step() {
      tick();
      event.call("tick", simulation);
      if (alpha < alphaMin) {
        stepper.stop();
        event.call("end", simulation);
      }
    }
    function tick(iterations) {
      var i, n = nodes.length, node;
      if (iterations === void 0) iterations = 1;
      for (var k = 0; k < iterations; ++k) {
        alpha += (alphaTarget - alpha) * alphaDecay;
        forces.forEach(function(force) {
          force(alpha);
        });
        for (i = 0; i < n; ++i) {
          node = nodes[i];
          if (node.fx == null) node.x += node.vx *= velocityDecay;
          else node.x = node.fx, node.vx = 0;
          if (node.fy == null) node.y += node.vy *= velocityDecay;
          else node.y = node.fy, node.vy = 0;
        }
      }
      return simulation;
    }
    function initializeNodes() {
      for (var i = 0, n = nodes.length, node; i < n; ++i) {
        node = nodes[i], node.index = i;
        if (node.fx != null) node.x = node.fx;
        if (node.fy != null) node.y = node.fy;
        if (isNaN(node.x) || isNaN(node.y)) {
          var radius = initialRadius * Math.sqrt(0.5 + i), angle = i * initialAngle;
          node.x = radius * Math.cos(angle);
          node.y = radius * Math.sin(angle);
        }
        if (isNaN(node.vx) || isNaN(node.vy)) {
          node.vx = node.vy = 0;
        }
      }
    }
    function initializeForce(force) {
      if (force.initialize) force.initialize(nodes, random);
      return force;
    }
    initializeNodes();
    return simulation = {
      tick,
      restart: function() {
        return stepper.restart(step), simulation;
      },
      stop: function() {
        return stepper.stop(), simulation;
      },
      nodes: function(_) {
        return arguments.length ? (nodes = _, initializeNodes(), forces.forEach(initializeForce), simulation) : nodes;
      },
      alpha: function(_) {
        return arguments.length ? (alpha = +_, simulation) : alpha;
      },
      alphaMin: function(_) {
        return arguments.length ? (alphaMin = +_, simulation) : alphaMin;
      },
      alphaDecay: function(_) {
        return arguments.length ? (alphaDecay = +_, simulation) : +alphaDecay;
      },
      alphaTarget: function(_) {
        return arguments.length ? (alphaTarget = +_, simulation) : alphaTarget;
      },
      velocityDecay: function(_) {
        return arguments.length ? (velocityDecay = 1 - _, simulation) : 1 - velocityDecay;
      },
      randomSource: function(_) {
        return arguments.length ? (random = _, forces.forEach(initializeForce), simulation) : random;
      },
      force: function(name, _) {
        return arguments.length > 1 ? (_ == null ? forces.delete(name) : forces.set(name, initializeForce(_)), simulation) : forces.get(name);
      },
      find: function(x3, y3, radius) {
        var i = 0, n = nodes.length, dx, dy, d2, node, closest;
        if (radius == null) radius = Infinity;
        else radius *= radius;
        for (i = 0; i < n; ++i) {
          node = nodes[i];
          dx = x3 - node.x;
          dy = y3 - node.y;
          d2 = dx * dx + dy * dy;
          if (d2 < radius) closest = node, radius = d2;
        }
        return closest;
      },
      on: function(name, _) {
        return arguments.length > 1 ? (event.on(name, _), simulation) : event.on(name);
      }
    };
  }

  // node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/manyBody.js
  function manyBody_default() {
    var nodes, node, random, alpha, strength = constant_default5(-30), strengths, distanceMin2 = 1, distanceMax2 = Infinity, theta2 = 0.81;
    function force(_) {
      var i, n = nodes.length, tree = quadtree(nodes, x2, y2).visitAfter(accumulate);
      for (alpha = _, i = 0; i < n; ++i) node = nodes[i], tree.visit(apply);
    }
    function initialize() {
      if (!nodes) return;
      var i, n = nodes.length, node2;
      strengths = new Array(n);
      for (i = 0; i < n; ++i) node2 = nodes[i], strengths[node2.index] = +strength(node2, i, nodes);
    }
    function accumulate(quad) {
      var strength2 = 0, q, c2, weight = 0, x3, y3, i;
      if (quad.length) {
        for (x3 = y3 = i = 0; i < 4; ++i) {
          if ((q = quad[i]) && (c2 = Math.abs(q.value))) {
            strength2 += q.value, weight += c2, x3 += c2 * q.x, y3 += c2 * q.y;
          }
        }
        quad.x = x3 / weight;
        quad.y = y3 / weight;
      } else {
        q = quad;
        q.x = q.data.x;
        q.y = q.data.y;
        do
          strength2 += strengths[q.data.index];
        while (q = q.next);
      }
      quad.value = strength2;
    }
    function apply(quad, x1, _, x22) {
      if (!quad.value) return true;
      var x3 = quad.x - node.x, y3 = quad.y - node.y, w = x22 - x1, l = x3 * x3 + y3 * y3;
      if (w * w / theta2 < l) {
        if (l < distanceMax2) {
          if (x3 === 0) x3 = jiggle_default(random), l += x3 * x3;
          if (y3 === 0) y3 = jiggle_default(random), l += y3 * y3;
          if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
          node.vx += x3 * quad.value * alpha / l;
          node.vy += y3 * quad.value * alpha / l;
        }
        return true;
      } else if (quad.length || l >= distanceMax2) return;
      if (quad.data !== node || quad.next) {
        if (x3 === 0) x3 = jiggle_default(random), l += x3 * x3;
        if (y3 === 0) y3 = jiggle_default(random), l += y3 * y3;
        if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
      }
      do
        if (quad.data !== node) {
          w = strengths[quad.data.index] * alpha / l;
          node.vx += x3 * w;
          node.vy += y3 * w;
        }
      while (quad = quad.next);
    }
    force.initialize = function(_nodes, _random) {
      nodes = _nodes;
      random = _random;
      initialize();
    };
    force.strength = function(_) {
      return arguments.length ? (strength = typeof _ === "function" ? _ : constant_default5(+_), initialize(), force) : strength;
    };
    force.distanceMin = function(_) {
      return arguments.length ? (distanceMin2 = _ * _, force) : Math.sqrt(distanceMin2);
    };
    force.distanceMax = function(_) {
      return arguments.length ? (distanceMax2 = _ * _, force) : Math.sqrt(distanceMax2);
    };
    force.theta = function(_) {
      return arguments.length ? (theta2 = _ * _, force) : Math.sqrt(theta2);
    };
    return force;
  }

  // node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/x.js
  function x_default2(x3) {
    var strength = constant_default5(0.1), nodes, strengths, xz;
    if (typeof x3 !== "function") x3 = constant_default5(x3 == null ? 0 : +x3);
    function force(alpha) {
      for (var i = 0, n = nodes.length, node; i < n; ++i) {
        node = nodes[i], node.vx += (xz[i] - node.x) * strengths[i] * alpha;
      }
    }
    function initialize() {
      if (!nodes) return;
      var i, n = nodes.length;
      strengths = new Array(n);
      xz = new Array(n);
      for (i = 0; i < n; ++i) {
        strengths[i] = isNaN(xz[i] = +x3(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
      }
    }
    force.initialize = function(_) {
      nodes = _;
      initialize();
    };
    force.strength = function(_) {
      return arguments.length ? (strength = typeof _ === "function" ? _ : constant_default5(+_), initialize(), force) : strength;
    };
    force.x = function(_) {
      return arguments.length ? (x3 = typeof _ === "function" ? _ : constant_default5(+_), initialize(), force) : x3;
    };
    return force;
  }

  // node_modules/.pnpm/d3-force@3.0.0/node_modules/d3-force/src/y.js
  function y_default2(y3) {
    var strength = constant_default5(0.1), nodes, strengths, yz;
    if (typeof y3 !== "function") y3 = constant_default5(y3 == null ? 0 : +y3);
    function force(alpha) {
      for (var i = 0, n = nodes.length, node; i < n; ++i) {
        node = nodes[i], node.vy += (yz[i] - node.y) * strengths[i] * alpha;
      }
    }
    function initialize() {
      if (!nodes) return;
      var i, n = nodes.length;
      strengths = new Array(n);
      yz = new Array(n);
      for (i = 0; i < n; ++i) {
        strengths[i] = isNaN(yz[i] = +y3(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
      }
    }
    force.initialize = function(_) {
      nodes = _;
      initialize();
    };
    force.strength = function(_) {
      return arguments.length ? (strength = typeof _ === "function" ? _ : constant_default5(+_), initialize(), force) : strength;
    };
    force.y = function(_) {
      return arguments.length ? (y3 = typeof _ === "function" ? _ : constant_default5(+_), initialize(), force) : y3;
    };
    return force;
  }

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/engine/shared.js
  var DEFAULT_CIRCULAR_LAYOUT_OPTIONS = {
    radius: 100,
    centerX: 0,
    centerY: 0
  };
  var MANY_BODY_MAX_DISTANCE_TO_LINK_DISTANCE_RATIO = 100;
  var DEFAULT_LINK_DISTANCE = 50;
  var getManyBodyMaxDistance = (linkDistance) => {
    const distance = linkDistance > 0 ? linkDistance : 1;
    return distance * MANY_BODY_MAX_DISTANCE_TO_LINK_DISTANCE_RATIO;
  };
  var DEFAULT_FORCE_LAYOUT_OPTIONS = {
    useGPU: false,
    isSimulatingOnDataUpdate: true,
    isSimulatingOnSettingsUpdate: true,
    isSimulatingOnUnstick: true,
    isPhysicsEnabled: false,
    alpha: {
      alpha: 1,
      alphaMin: 0.05,
      // default alphaMin is 0.001, which results in 285 ticks to converge. Using 0.05 converges to similar stable results in 106 ticks
      alphaDecay: 0.028,
      alphaTarget: 0
    },
    centering: {
      x: 0,
      y: 0,
      strength: 1
    },
    collision: {
      radius: 15,
      strength: 1,
      iterations: 1
    },
    links: {
      distance: DEFAULT_LINK_DISTANCE,
      strength: 1,
      iterations: 1
    },
    manyBody: {
      strength: -100,
      theta: 0.9,
      distanceMin: 1,
      distanceMax: getManyBodyMaxDistance(DEFAULT_LINK_DISTANCE)
    },
    positioning: {
      forceX: {
        x: 0,
        strength: 0.1
      },
      forceY: {
        y: 0,
        strength: 0.1
      }
    },
    anchorX: "center",
    anchorY: "center"
  };
  var DEFAULT_GRID_LAYOUT_OPTIONS = {
    rowGap: 50,
    colGap: 50
  };
  var DEFAULT_HIERARCHICAL_LAYOUT_OPTIONS = {
    nodeGap: 50,
    levelGap: 50,
    treeGap: 100,
    orientation: "vertical",
    reversed: false
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/engine/engines/base-layout-engine.js
  var BaseLayoutEngine = class extends Emitter {
    constructor() {
      super(...arguments);
      this._nodes = [];
      this._edges = [];
      this._nodeIndexByNodeId = {};
      this._cancelSimulation = false;
      this._schedulerPort = null;
    }
    terminate() {
      var _a;
      this._cancelSimulation = true;
      (_a = this._schedulerPort) === null || _a === void 0 ? void 0 : _a.close();
      this._schedulerPort = null;
      this.removeAllListeners();
    }
    // use MessageChannel for microtask-like scheduling that avoids setTimeout's ~4ms minimum delay
    _scheduleNext(callback) {
      if (typeof MessageChannel !== "undefined") {
        const channel = new MessageChannel();
        this._schedulerPort = channel.port2;
        channel.port1.onmessage = () => {
          this._schedulerPort = null;
          callback();
        };
        channel.port2.postMessage(null);
      } else {
        setTimeout(callback, 0);
      }
    }
    _rebuildNodeIndex() {
      this._nodeIndexByNodeId = {};
      for (let i = 0; i < this._nodes.length; i++) {
        this._nodeIndexByNodeId[this._nodes[i].id] = i;
      }
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/engine/engines/dynamic/force-layout-engine.js
  var MAX_SIMULATION_STEPS = 500;
  var CHUNK_SIZE = 100;
  function forceEdgeMidpointRepulsion(strength, distanceMax, getEdges) {
    let nodes = [];
    const distanceMax2 = distanceMax * distanceMax;
    function force(alpha) {
      var _a, _b, _c, _d, _e, _f;
      const edges = getEdges();
      for (let e = 0; e < edges.length; e++) {
        const src = edges[e].source;
        const tgt = edges[e].target;
        if (!src || !tgt) {
          continue;
        }
        const mx = (((_a = src.x) !== null && _a !== void 0 ? _a : 0) + ((_b = tgt.x) !== null && _b !== void 0 ? _b : 0)) * 0.5;
        const my = (((_c = src.y) !== null && _c !== void 0 ? _c : 0) + ((_d = tgt.y) !== null && _d !== void 0 ? _d : 0)) * 0.5;
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const dx = ((_e = node.x) !== null && _e !== void 0 ? _e : 0) - mx;
          const dy = ((_f = node.y) !== null && _f !== void 0 ? _f : 0) - my;
          let distSq = dx * dx + dy * dy;
          if (distSq === 0 || distSq >= distanceMax2) {
            continue;
          }
          if (distSq < 1) {
            distSq = 1;
          }
          const f = -strength * alpha / distSq;
          node.vx += dx * f;
          node.vy += dy * f;
        }
      }
    }
    force.initialize = (initNodes) => {
      nodes = initNodes;
    };
    return force;
  }
  var ForceLayoutEngine = class extends BaseLayoutEngine {
    constructor(options) {
      super();
      this._isDragging = false;
      this._isStabilizing = false;
      this.type = "force";
      this._settings = Object.assign(Object.assign({}, DEFAULT_FORCE_LAYOUT_OPTIONS), options);
      this.clearData();
    }
    setSettings(settings) {
      const forceSettings = settings;
      if (!this._initialSettings) {
        this._initialSettings = Object.assign(copyObject(DEFAULT_FORCE_LAYOUT_OPTIONS), forceSettings);
      }
      const previousSettings = copyObject(this._settings);
      Object.assign(this._settings, forceSettings);
      if (isObjectEqual(this._settings, previousSettings)) {
        return;
      }
      this._applySettingsToSimulation(forceSettings);
      this.emit(SimulatorEventType.SETTINGS_UPDATE, {
        settings: { type: "force", options: this._settings }
      });
      const hasPhysicsBeenDisabled = previousSettings.isPhysicsEnabled && !forceSettings.isPhysicsEnabled;
      if (hasPhysicsBeenDisabled) {
        this._simulation.stop();
      } else if (this._settings.isSimulatingOnSettingsUpdate && this._nodes.length > 0) {
        this.activateSimulation();
      }
    }
    setupData(data) {
      this.clearData();
      this._initializeNewData(data);
      if (this._settings.isSimulatingOnDataUpdate) {
        this._updateSimulationData();
        this._runSimulation();
      }
    }
    mergeData(data) {
      this._initializeNewData(data);
      if (!this._settings.isPhysicsEnabled) {
        this._pinNodes();
      }
      if (this._settings.isSimulatingOnDataUpdate) {
        this._updateSimulationData();
        this.activateSimulation();
      }
    }
    updateData(data) {
      const newNodeIds = new Set(data.nodes.map((node) => node.id));
      const oldNodes = this._nodes.filter((node) => newNodeIds.has(node.id));
      const newNodes = data.nodes.filter((node) => this._nodeIndexByNodeId[node.id] === void 0);
      this._nodes = [...oldNodes, ...newNodes];
      this._rebuildNodeIndex();
      this._edges = data.edges;
      if (this._settings.isSimulatingOnSettingsUpdate) {
        this._updateSimulationData();
        this.activateSimulation();
      }
    }
    deleteData(data) {
      if (data.nodeIds) {
        const nodeIds = new Set(data.nodeIds);
        this._nodes = this._nodes.filter((node) => !nodeIds.has(node.id));
      }
      if (data.edgeIds) {
        const edgeIds = new Set(data.edgeIds);
        this._edges = this._edges.filter((edge) => !edgeIds.has(edge.id));
      }
      this._rebuildNodeIndex();
      if (this._settings.isSimulatingOnDataUpdate) {
        this._updateSimulationData();
        this.activateSimulation();
      }
    }
    patchData(data) {
      if (data.nodes) {
        const nodeIds = {};
        for (let i = 0; i < this._nodes.length; i++) {
          nodeIds[this._nodes[i].id] = i;
        }
        for (let i = 0; i < data.nodes.length; i += 1) {
          const nodeId2 = data.nodes[i].id;
          if (nodeId2 in nodeIds) {
            const index2 = nodeIds[nodeId2];
            this._nodeIndexByNodeId[nodeId2] = index2;
            this._nodes[index2] = data.nodes[i];
          } else {
            this._nodes.push(data.nodes[i]);
          }
        }
      }
      if (data.edges) {
        const edgeIds = {};
        for (let i = 0; i < this._edges.length; i++) {
          edgeIds[this._edges[i].id] = i;
        }
        for (let i = 0; i < data.edges.length; i++) {
          const edgeId = data.edges[i].id;
          if (edgeId in edgeIds) {
            this._edges[edgeIds[edgeId]] = data.edges[i];
          } else {
            this._edges.push(data.edges[i]);
          }
        }
      }
    }
    clearData() {
      this._nodes = [];
      this._edges = [];
      this._rebuildNodeIndex();
      this._resetSimulation();
    }
    activateSimulation() {
      if (this._settings.isPhysicsEnabled) {
        this._unpinNodes();
      } else {
        this._pinNodes();
      }
      this._simulation.alpha(this._settings.alpha.alpha).alphaTarget(this._settings.alpha.alphaTarget).restart();
    }
    stopSimulation() {
      this._simulation.stop();
    }
    startDragNode() {
      this._isDragging = true;
      if (!this._isStabilizing && this._settings.isPhysicsEnabled) {
        this.activateSimulation();
      }
    }
    dragNode(nodeId2, position) {
      const node = this._nodes[this._nodeIndexByNodeId[nodeId2]];
      if (!node) {
        return;
      }
      if (!this._isDragging) {
        this.startDragNode();
      }
      node.fx = position.x;
      node.fy = position.y;
      if (!this._settings.isPhysicsEnabled) {
        node.x = position.x;
        node.y = position.y;
      }
      this.emit(SimulatorEventType.NODE_DRAG, { nodes: this._nodes, edges: this._edges });
    }
    endDragNode(nodeId2) {
      this._isDragging = false;
      if (this._settings.isPhysicsEnabled) {
        this._simulation.alphaTarget(0);
      }
      const node = this._nodes[this._nodeIndexByNodeId[nodeId2]];
      if (node && this._settings.isPhysicsEnabled) {
        this._unpinNode(node);
      }
    }
    fixNodes(nodes) {
      if (!nodes) {
        nodes = this._nodes;
      }
      for (let i = 0; i < nodes.length; i++) {
        this._stickNode(nodes[i]);
      }
    }
    releaseNodes(nodes) {
      if (!nodes) {
        nodes = this._nodes;
      }
      for (let i = 0; i < nodes.length; i++) {
        this._unstickNode(nodes[i]);
      }
      if (this._settings.isSimulatingOnUnstick && this._nodes.length > 0) {
        this.activateSimulation();
      }
    }
    terminate() {
      var _a;
      super.terminate();
      (_a = this._simulation) === null || _a === void 0 ? void 0 : _a.stop();
    }
    // TODO(Alex): Listeners memory leak (D3 force research)
    _resetSimulation() {
      if (this._simulation) {
        this._simulation.stop();
        this._simulation.on("tick", null).on("end", null);
      }
      this._linkForce = link_default(this._edges).id((node) => node.id);
      this._simulation = simulation_default(this._nodes).force("link", this._linkForce).stop();
      this._applySettingsToSimulation(this._settings);
      this._simulation.on("tick", () => {
        this.emit(SimulatorEventType.SIMULATION_STEP, { nodes: this._nodes, edges: this._edges });
      });
      this._simulation.on("end", () => {
        this._isDragging = false;
        this._isStabilizing = false;
        this.emit(SimulatorEventType.SIMULATION_END, { nodes: this._nodes, edges: this._edges });
        if (!this._settings.isPhysicsEnabled) {
          this._pinNodes();
        }
      });
    }
    _runSimulation(options) {
      if (this._isStabilizing || this._cancelSimulation) {
        return;
      }
      if (this._settings.isPhysicsEnabled || (options === null || options === void 0 ? void 0 : options.isUpdatingSettings)) {
        this._unpinNodes();
      }
      this.emit(SimulatorEventType.SIMULATION_START, void 0);
      this._isStabilizing = true;
      this._simulation.alpha(this._settings.alpha.alpha).alphaTarget(this._settings.alpha.alphaTarget).stop();
      const totalSimulationSteps = Math.min(MAX_SIMULATION_STEPS, Math.ceil(Math.log(this._settings.alpha.alphaMin) / Math.log(1 - this._settings.alpha.alphaDecay)));
      let lastProgress = -1;
      let step = 0;
      const runChunk = () => {
        if (this._cancelSimulation) {
          this._isStabilizing = false;
          this._cancelSimulation = false;
          return;
        }
        const end = Math.min(step + CHUNK_SIZE, totalSimulationSteps);
        for (; step < end; step++) {
          this._simulation.tick();
          const currentProgress = Math.round(step * 100 / totalSimulationSteps);
          if (currentProgress > lastProgress) {
            lastProgress = currentProgress;
            this.emit(SimulatorEventType.SIMULATION_PROGRESS, {
              nodes: this._nodes,
              edges: this._edges,
              progress: currentProgress / 100
            });
          }
        }
        if (step < totalSimulationSteps && !this._cancelSimulation) {
          this._scheduleNext(runChunk);
        } else {
          if (!this._settings.isPhysicsEnabled) {
            this._pinNodes();
          }
          this._isStabilizing = false;
          this._cancelSimulation = false;
          this.emit(SimulatorEventType.SIMULATION_END, { nodes: this._nodes, edges: this._edges });
        }
      };
      runChunk();
    }
    _updateSimulationData() {
      this._simulation.nodes(this._nodes);
      this._linkForce.links(this._edges);
    }
    _initializeNewData(data) {
      if (data.nodes) {
        for (let i = 0; i < data.nodes.length; i += 1) {
          const nodeId2 = data.nodes[i].id;
          if (this._nodeIndexByNodeId[nodeId2] !== void 0) {
            this._nodeIndexByNodeId[nodeId2] = i;
          } else {
            this._nodes.push(data.nodes[i]);
          }
        }
      } else {
        this._nodes = [];
      }
      if (data.edges) {
        const edgeIds = {};
        for (let i = 0; i < this._edges.length; i++) {
          edgeIds[this._edges[i].id] = i;
        }
        for (let i = 0; i < data.edges.length; i++) {
          const edgeId = data.edges[i].id;
          if (edgeId in edgeIds) {
            this._edges[edgeIds[edgeId]] = data.edges[i];
          } else {
            this._edges.push(data.edges[i]);
          }
        }
      } else {
        this._edges = [];
      }
      this._rebuildNodeIndex();
    }
    _pinNodes(nodes) {
      if (!nodes) {
        nodes = this._nodes;
      }
      for (let i = 0; i < nodes.length; i++) {
        this._pinNode(this._nodes[i]);
      }
    }
    _unpinNodes(nodes) {
      if (!nodes) {
        nodes = this._nodes;
      }
      for (let i = 0; i < nodes.length; i++) {
        this._unpinNode(this._nodes[i]);
      }
    }
    _pinNode(node) {
      if (node.sx === null || node.sx === void 0) {
        node.fx = node.x;
      }
      if (node.sy === null || node.sy === void 0) {
        node.fy = node.y;
      }
    }
    _unpinNode(node) {
      if (node.sx === null || node.sx === void 0) {
        node.fx = null;
      }
      if (node.sy === null || node.sy === void 0) {
        node.fy = null;
      }
    }
    _stickNode(node) {
      node.sx = node.x;
      node.fx = node.x;
      node.sy = node.y;
      node.fy = node.y;
    }
    _unstickNode(node) {
      node.sx = null;
      node.sy = null;
      if (this._settings.isPhysicsEnabled) {
        node.fx = null;
        node.fy = null;
      }
    }
    _applySettingsToSimulation(settings) {
      var _a, _b, _c, _d;
      if (settings.alpha) {
        this._simulation.alpha(settings.alpha.alpha).alphaMin(settings.alpha.alphaMin).alphaDecay(settings.alpha.alphaDecay).alphaTarget(settings.alpha.alphaTarget);
      }
      if (settings.links) {
        this._linkForce.distance(settings.links.distance).iterations(settings.links.iterations);
      }
      if (settings.collision) {
        const collision = collide_default().radius(settings.collision.radius).strength(settings.collision.strength).iterations(settings.collision.iterations);
        this._simulation.force("collide", collision);
      }
      if (settings.collision === null) {
        this._simulation.force("collide", null);
      }
      if (settings.manyBody) {
        const manyBody = manyBody_default().strength(settings.manyBody.strength).theta(settings.manyBody.theta).distanceMin(settings.manyBody.distanceMin).distanceMax(settings.manyBody.distanceMax);
        this._simulation.force("charge", manyBody);
        if (settings.manyBody.edgeMidpointRepulsion) {
          this._simulation.force("edgeMidpointRepulsion", forceEdgeMidpointRepulsion(settings.manyBody.strength, settings.manyBody.distanceMax, () => this._edges));
        } else {
          this._simulation.force("edgeMidpointRepulsion", null);
        }
      }
      if (settings.manyBody === null) {
        this._simulation.force("charge", null);
        this._simulation.force("edgeMidpointRepulsion", null);
      }
      if ((_a = settings.positioning) === null || _a === void 0 ? void 0 : _a.forceX) {
        const positioningForceX = x_default2(settings.positioning.forceX.x).strength(settings.positioning.forceX.strength);
        this._simulation.force("x", positioningForceX);
      }
      if (((_b = settings.positioning) === null || _b === void 0 ? void 0 : _b.forceX) === null) {
        this._simulation.force("x", null);
      }
      if ((_c = settings.positioning) === null || _c === void 0 ? void 0 : _c.forceY) {
        const positioningForceY = y_default2(settings.positioning.forceY.y).strength(settings.positioning.forceY.strength);
        this._simulation.force("y", positioningForceY);
      }
      if (((_d = settings.positioning) === null || _d === void 0 ? void 0 : _d.forceY) === null) {
        this._simulation.force("y", null);
      }
      if (settings.centering) {
        const centering = center_default(settings.centering.x, settings.centering.y).strength(settings.centering.strength);
        this._simulation.force("center", centering);
      }
      if (settings.centering === null) {
        this._simulation.force("center", null);
      }
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/utils/shaders.utils.js
  var ShaderType;
  (function(ShaderType2) {
    ShaderType2["VERTEX"] = "vertex";
    ShaderType2["FRAGMENT"] = "fragment";
  })(ShaderType || (ShaderType = {}));
  var compileShader = (gl, source, type) => {
    const shader = gl.createShader(type === ShaderType.VERTEX ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    if (!shader) {
      throw new OrbError("Failed to create shader.");
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new OrbError(`Failed to compile shader: ${info}`);
    }
    return shader;
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/engine/shaders/force/force.vert.js
  var force_vert_default = `#version 300 es

in vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/engine/shaders/force/force.frag.js
  var force_frag_default = `#version 300 es

precision highp float;

uniform sampler2D uState;
uniform sampler2D uFixed;
uniform sampler2D uTreeData;
uniform sampler2D uTreeChildren;
uniform sampler2D uTreeGeometry;
uniform sampler2D uAdjOffsets;
uniform sampler2D uAdjEdges;

uniform int uNodeCount;
uniform int uTexWidth;
uniform float uAlpha;
uniform float uDamping;

uniform float uManyBodyStrength;
uniform float uTheta2;
uniform float uDistanceMin2;
uniform float uDistanceMax2;
uniform int uTreeNodeCount;
uniform int uTreeTexWidth;

uniform int uAdjOffsetsTexWidth;
uniform int uAdjEdgesTexWidth;

uniform vec2 uCenter;
uniform float uCenterStrength;

uniform float uCollisionRadius;
uniform float uCollisionStrength;

uniform float uForceXTarget;
uniform float uForceXStrength;
uniform float uForceYTarget;
uniform float uForceYStrength;

uniform float uHasManyBody;
uniform float uHasLinks;
uniform float uHasCentering;
uniform float uHasCollision;
uniform float uHasPositioning;

out vec4 fragColor;

ivec2 texCoord(int idx, int tw) {
  return ivec2(idx % tw, idx / tw);
}

void main() {
  ivec2 fc = ivec2(gl_FragCoord.xy);
  int nodeId = fc.y * uTexWidth + fc.x;

  if (nodeId >= uNodeCount) {
    fragColor = vec4(0.0);
    return;
  }

  vec4 fixedData = texelFetch(uFixed, fc, 0);
  if (fixedData.x > 0.5) {
    fragColor = vec4(fixedData.yz, 0.0, 0.0);
    return;
  }

  vec4 state = texelFetch(uState, fc, 0);
  vec2 pos = state.xy;
  vec2 vel = state.zw;

  if (uHasManyBody > 0.5 && uTreeNodeCount > 0) {
    int stack[128];
    int top = 0;
    stack[top++] = 0;

    while (top > 0) {
      int idx = stack[--top];
      vec4 data = texelFetch(uTreeData, texCoord(idx, uTreeTexWidth), 0);
      float w = data.w;

      if (w < -0.5) {
        int bodyIdx = int(-w - 0.5);
        if (bodyIdx != nodeId) {
          vec2 delta = data.xy - pos;
          float distSq = dot(delta, delta);

          if (distSq < 1e-8) {
            delta = vec2(float(nodeId) * 1e-4 - float(bodyIdx) * 1e-4 + 1e-4, 1e-4);
            distSq = dot(delta, delta);
          }

          if (distSq < uDistanceMax2) {
            float l = distSq;
            if (l < uDistanceMin2) l = sqrt(uDistanceMin2 * l);
            vel += delta * (data.z * uAlpha / max(l, 1e-6));
          }
        }
      } else {
        vec2 delta = data.xy - pos;
        float distSq = dot(delta, delta);

        if (distSq > 0.0 && w * w / distSq < uTheta2) {
          if (distSq < uDistanceMax2) {
            float l = distSq;
            if (l < uDistanceMin2) l = sqrt(uDistanceMin2 * l);
            vel += delta * (data.z * uAlpha / max(l, 1e-6));
          }
        } else {
          vec4 ch = texelFetch(uTreeChildren, texCoord(idx, uTreeTexWidth), 0);
          if (ch.w >= 0.0 && top < 64) stack[top++] = int(ch.w + 0.5);
          if (ch.z >= 0.0 && top < 64) stack[top++] = int(ch.z + 0.5);
          if (ch.y >= 0.0 && top < 64) stack[top++] = int(ch.y + 0.5);
          if (ch.x >= 0.0 && top < 64) stack[top++] = int(ch.x + 0.5);
        }
      }
    }
  }

  if (uHasCollision > 0.5 && uCollisionRadius > 0.0 && uTreeNodeCount > 0) {
    float collisionDiam = uCollisionRadius * 2.0;
    vec2 predictedPos = state.xy + state.zw;
    int stack[64];
    int top = 0;
    stack[top++] = 0;

    while (top > 0) {
      int idx = stack[--top];
      vec4 data = texelFetch(uTreeData, texCoord(idx, uTreeTexWidth), 0);
      float w = data.w;

      if (w < -0.5) {
        int bodyIdx = int(-w - 0.5);
        if (bodyIdx != nodeId && bodyIdx < uNodeCount) {
          vec2 delta = data.xy - predictedPos;
          float dist = length(delta);

          if (dist < collisionDiam && dist > 0.0) {
            float push = (collisionDiam - dist) * uCollisionStrength;
            vel -= (delta / dist) * push * 0.5;
          }
        }
      } else {
        vec4 geo = texelFetch(uTreeGeometry, texCoord(idx, uTreeTexWidth), 0);
        float cellSize = geo.z;
        vec2 nearest = clamp(predictedPos, geo.xy, geo.xy + cellSize);
        float distToCell = length(nearest - predictedPos);

        if (distToCell < collisionDiam) {
          vec4 ch = texelFetch(uTreeChildren, texCoord(idx, uTreeTexWidth), 0);
          if (ch.w >= 0.0 && top < 64) stack[top++] = int(ch.w + 0.5);
          if (ch.z >= 0.0 && top < 64) stack[top++] = int(ch.z + 0.5);
          if (ch.y >= 0.0 && top < 64) stack[top++] = int(ch.y + 0.5);
          if (ch.x >= 0.0 && top < 64) stack[top++] = int(ch.x + 0.5);
        }
      }
    }
  }

  if (uHasLinks > 0.5) {
    vec4 offData = texelFetch(uAdjOffsets, texCoord(nodeId, uAdjOffsetsTexWidth), 0);
    int start = int(offData.x + 0.5);
    int count = int(offData.y + 0.5);

    for (int e = 0; e < count; e++) {
      vec4 edgeData = texelFetch(uAdjEdges, texCoord(start + e, uAdjEdgesTexWidth), 0);
      int targetId = int(edgeData.x + 0.5);
      float restDist = edgeData.y;
      float strength = edgeData.z;
      float dirBias = edgeData.w;

      vec4 targetState = texelFetch(uState, texCoord(targetId, uTexWidth), 0);
      vec2 delta = (targetState.xy + targetState.zw) - (state.xy + state.zw);
      float d = length(delta);

      if (d < 1e-6) {
        delta = vec2(1e-3, 1e-3);
        d = length(delta);
      }

      float scale = (d - restDist) / d * uAlpha * strength;
      vel += delta * scale * dirBias;
    }
  }

  if (uHasCentering > 0.5) {
    vel += (uCenter - pos) * uCenterStrength * uAlpha;
  }

  if (uHasPositioning > 0.5) {
    vel.x += (uForceXTarget - pos.x) * uForceXStrength * uAlpha;
    vel.y += (uForceYTarget - pos.y) * uForceYStrength * uAlpha;
  }

  vel *= uDamping;
  pos += vel;

  fragColor = vec4(pos, vel);
}
`;

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/engine/utils/quadtree-builder.js
  function buildQuadTree(positions, strength) {
    var _a, _b;
    const N = positions.length;
    if (N === 0) {
      return {
        treeData: new Float32Array(0),
        treeChildren: new Float32Array(0),
        treeGeometry: new Float32Array(0),
        nodeCount: 0,
        texWidth: 1
      };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < N; i++) {
      const x3 = positions[i].x;
      const y3 = positions[i].y;
      if (x3 < minX) {
        minX = x3;
      }
      if (y3 < minY) {
        minY = y3;
      }
      if (x3 > maxX) {
        maxX = x3;
      }
      if (y3 > maxY) {
        maxY = y3;
      }
    }
    let size = Math.max(maxX - minX, maxY - minY);
    if (size < 1e-6) {
      size = 1;
    }
    size *= 1.01;
    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;
    const halfSize = size * 0.5;
    const rootX0 = cx - halfSize;
    const rootY0 = cy - halfSize;
    const nodes = [];
    function allocNode(sz) {
      const idx = nodes.length;
      nodes.push({
        cx: 0,
        cy: 0,
        charge: 0,
        size: sz,
        bodyIndex: -1,
        children: [null, null, null, null]
      });
      return idx;
    }
    const rootIdx = allocNode(size);
    const nodeX0 = [rootX0];
    const nodeY0 = [rootY0];
    function getQuadrant(px, py, x0, y0, sz) {
      const midX = x0 + sz * 0.5;
      const midY = y0 + sz * 0.5;
      const right = px >= midX ? 1 : 0;
      const bottom = py >= midY ? 1 : 0;
      return bottom * 2 + right;
    }
    function childBounds(q, x0, y0, sz) {
      const half = sz * 0.5;
      const cx0 = q & 1 ? x0 + half : x0;
      const cy0 = q & 2 ? y0 + half : y0;
      return { cx0, cy0, csz: half };
    }
    function insertBody(bodyIdx, bx, by) {
      let nodeIdx = rootIdx;
      let x0 = rootX0;
      let y0 = rootY0;
      let sz = size;
      for (let depth = 0; depth < 50; depth++) {
        const node = nodes[nodeIdx];
        if (node.bodyIndex === -1 && node.children[0] === null && node.children[1] === null && node.children[2] === null && node.children[3] === null) {
          node.bodyIndex = bodyIdx;
          node.cx = bx;
          node.cy = by;
          node.charge = strength;
          return;
        }
        if (node.bodyIndex >= 0) {
          const existingBody = node.bodyIndex;
          const ex = node.cx;
          const ey = node.cy;
          node.bodyIndex = -1;
          const eq = getQuadrant(ex, ey, x0, y0, sz);
          const { cx0: ecx0, cy0: ecy0, csz: ecsz } = childBounds(eq, x0, y0, sz);
          const childIdx = allocNode(ecsz);
          nodeX0[childIdx] = ecx0;
          nodeY0[childIdx] = ecy0;
          node.children[eq] = childIdx;
          nodes[childIdx].bodyIndex = existingBody;
          nodes[childIdx].cx = ex;
          nodes[childIdx].cy = ey;
          nodes[childIdx].charge = strength;
        }
        const q = getQuadrant(bx, by, x0, y0, sz);
        if (node.children[q] === null) {
          const { cx0: cx02, cy0: cy02, csz: csz2 } = childBounds(q, x0, y0, sz);
          const childIdx = allocNode(csz2);
          nodeX0[childIdx] = cx02;
          nodeY0[childIdx] = cy02;
          node.children[q] = childIdx;
          nodes[childIdx].bodyIndex = bodyIdx;
          nodes[childIdx].cx = bx;
          nodes[childIdx].cy = by;
          nodes[childIdx].charge = strength;
          return;
        }
        const { cx0, cy0, csz } = childBounds(q, x0, y0, sz);
        nodeIdx = node.children[q];
        x0 = cx0;
        y0 = cy0;
        sz = csz;
      }
    }
    for (let i = 0; i < N; i++) {
      insertBody(i, positions[i].x, positions[i].y);
    }
    function computeAggregates(idx) {
      const node = nodes[idx];
      if (node.bodyIndex >= 0) {
        return;
      }
      let totalCharge = 0;
      let wcx = 0;
      let wcy = 0;
      let totalWeight = 0;
      for (let q = 0; q < 4; q++) {
        const childIdx = node.children[q];
        if (childIdx === null) {
          continue;
        }
        computeAggregates(childIdx);
        const child = nodes[childIdx];
        const w = Math.abs(child.charge);
        totalCharge += child.charge;
        wcx += child.cx * w;
        wcy += child.cy * w;
        totalWeight += w;
      }
      if (totalWeight > 0) {
        node.cx = wcx / totalWeight;
        node.cy = wcy / totalWeight;
      }
      node.charge = totalCharge;
    }
    computeAggregates(rootIdx);
    const treeNodeCount = nodes.length;
    const texWidth = Math.ceil(Math.sqrt(treeNodeCount));
    const texSize = texWidth * texWidth;
    const treeData = new Float32Array(texSize * 4);
    const treeChildren = new Float32Array(texSize * 4);
    const treeGeometry = new Float32Array(texSize * 4);
    for (let i = 0; i < treeNodeCount; i++) {
      const node = nodes[i];
      const off = i * 4;
      treeData[off] = node.cx;
      treeData[off + 1] = node.cy;
      treeData[off + 2] = node.charge;
      if (node.bodyIndex >= 0) {
        treeData[off + 3] = -(node.bodyIndex + 1);
      } else {
        treeData[off + 3] = node.size;
      }
      treeChildren[off] = node.children[0] !== null ? node.children[0] : -1;
      treeChildren[off + 1] = node.children[1] !== null ? node.children[1] : -1;
      treeChildren[off + 2] = node.children[2] !== null ? node.children[2] : -1;
      treeChildren[off + 3] = node.children[3] !== null ? node.children[3] : -1;
      treeGeometry[off] = (_a = nodeX0[i]) !== null && _a !== void 0 ? _a : 0;
      treeGeometry[off + 1] = (_b = nodeY0[i]) !== null && _b !== void 0 ? _b : 0;
      treeGeometry[off + 2] = node.size;
      treeGeometry[off + 3] = 0;
    }
    for (let i = treeNodeCount; i < texSize; i++) {
      const off = i * 4;
      treeData[off + 3] = 0;
      treeChildren[off] = -1;
      treeChildren[off + 1] = -1;
      treeChildren[off + 2] = -1;
      treeChildren[off + 3] = -1;
      treeGeometry[off] = 0;
      treeGeometry[off + 1] = 0;
      treeGeometry[off + 2] = 0;
      treeGeometry[off + 3] = 0;
    }
    return { treeData, treeChildren, treeGeometry, nodeCount: treeNodeCount, texWidth };
  }

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/engine/utils/adjacency-builder.js
  function buildAdjacency(nodes, edges, linkDistance, linkStrength) {
    const N = nodes.length;
    const nodeIndexById = {};
    for (let i = 0; i < N; i++) {
      nodeIndexById[nodes[i].id] = i;
    }
    const degree = new Uint32Array(N);
    const resolvedEdges = [];
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      const srcId = typeof edge.source === "object" ? edge.source.id : edge.source;
      const tgtId = typeof edge.target === "object" ? edge.target.id : edge.target;
      const srcIdx = nodeIndexById[srcId];
      const tgtIdx = nodeIndexById[tgtId];
      if (srcIdx === void 0 || tgtIdx === void 0) {
        continue;
      }
      resolvedEdges.push({ srcIdx, tgtIdx });
      degree[srcIdx]++;
      degree[tgtIdx]++;
    }
    const totalDirectedEdges = resolvedEdges.length * 2;
    const adjCounts = new Uint32Array(N);
    const adjStarts = new Uint32Array(N);
    const tempCounts = new Uint32Array(N);
    for (const { srcIdx, tgtIdx } of resolvedEdges) {
      tempCounts[srcIdx]++;
      tempCounts[tgtIdx]++;
    }
    let offset = 0;
    for (let i = 0; i < N; i++) {
      adjStarts[i] = offset;
      adjCounts[i] = tempCounts[i];
      offset += tempCounts[i];
    }
    const edgesData = new Float32Array(totalDirectedEdges * 4);
    const writePos = new Uint32Array(N);
    for (let i = 0; i < N; i++) {
      writePos[i] = adjStarts[i];
    }
    for (const { srcIdx, tgtIdx } of resolvedEdges) {
      const bias = degree[srcIdx] / (degree[srcIdx] + degree[tgtIdx]);
      const str = linkStrength !== void 0 ? linkStrength : 1 / Math.min(degree[srcIdx], degree[tgtIdx]);
      {
        const off = writePos[srcIdx] * 4;
        edgesData[off] = tgtIdx;
        edgesData[off + 1] = linkDistance;
        edgesData[off + 2] = str;
        edgesData[off + 3] = 1 - bias;
        writePos[srcIdx]++;
      }
      {
        const off = writePos[tgtIdx] * 4;
        edgesData[off] = srcIdx;
        edgesData[off + 1] = linkDistance;
        edgesData[off + 2] = str;
        edgesData[off + 3] = bias;
        writePos[tgtIdx]++;
      }
    }
    const offsetsTexWidth = Math.max(1, Math.ceil(Math.sqrt(N)));
    const offsetsTexSize = offsetsTexWidth * offsetsTexWidth;
    const offsetsData = new Float32Array(offsetsTexSize * 4);
    for (let i = 0; i < N; i++) {
      offsetsData[i * 4] = adjStarts[i];
      offsetsData[i * 4 + 1] = adjCounts[i];
    }
    const edgesTexWidth = Math.max(1, Math.ceil(Math.sqrt(totalDirectedEdges)));
    const edgesTexSize = edgesTexWidth * edgesTexWidth;
    const paddedEdges = new Float32Array(edgesTexSize * 4);
    paddedEdges.set(edgesData);
    return {
      offsets: offsetsData,
      edges: paddedEdges,
      offsetsTexWidth,
      edgesTexWidth
    };
  }

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/engine/engines/dynamic/gpu-force-layout-engine.js
  var MAX_SIMULATION_STEPS2 = 500;
  var CHUNK_SIZE2 = 1;
  var GPUForceLayoutEngine = class extends BaseLayoutEngine {
    constructor(options) {
      super();
      this._isStabilizing = false;
      this._isDragging = false;
      this._dragLoopRunning = false;
      this._pendingRestart = false;
      this._simulationGeneration = 0;
      this._currentAlpha = 0;
      this._currentStep = 0;
      this._totalSteps = 0;
      this._dragAlpha = 0;
      this._dragNeedsReheat = false;
      this._dirtyNodes = /* @__PURE__ */ new Set();
      this._forceProgram = null;
      this._quadBuffer = null;
      this._quadVAO = null;
      this._stateTexA = null;
      this._stateTexB = null;
      this._fixedTex = null;
      this._fboA = null;
      this._fboB = null;
      this._texWidth = 0;
      this._treeDataTexture = null;
      this._treeChildrenTexture = null;
      this._treeGeometryTexture = null;
      this._adjOffsetsTexture = null;
      this._adjEdgesTexture = null;
      this._cachedAdjacency = null;
      this._treeTexWidth = 1;
      this._treeNodeCount = 0;
      this._pingPong = true;
      this._uniforms = {};
      this.type = "force";
      this._settings = Object.assign(Object.assign({}, DEFAULT_FORCE_LAYOUT_OPTIONS), options);
      const gl = document.createElement("canvas").getContext("webgl2");
      if (!gl) {
        throw new OrbError("Failed to create WebGL2 context for GPU force layout engine.");
      }
      this._gl = gl;
      this._initGPU();
      this.clearData();
    }
    setSettings(settings) {
      const forceSettings = settings;
      if (!this._initialSettings) {
        this._initialSettings = Object.assign(copyObject(DEFAULT_FORCE_LAYOUT_OPTIONS), forceSettings);
      }
      const previousSettings = copyObject(this._settings);
      Object.assign(this._settings, forceSettings);
      if (isObjectEqual(this._settings, previousSettings)) {
        return;
      }
      this.emit(SimulatorEventType.SETTINGS_UPDATE, {
        settings: { type: "force", options: this._settings }
      });
      const hasPhysicsBeenDisabled = previousSettings.isPhysicsEnabled && !forceSettings.isPhysicsEnabled;
      if (hasPhysicsBeenDisabled) {
        this.stopSimulation();
      } else if (this._settings.isSimulatingOnSettingsUpdate && this._nodes.length > 0) {
        this.activateSimulation();
      }
    }
    setupData(data) {
      this.clearData();
      this._initializeNewData(data);
      if (this._settings.isSimulatingOnDataUpdate) {
        this._runSimulation();
      }
    }
    mergeData(data) {
      this._initializeNewData(data);
      if (!this._settings.isPhysicsEnabled) {
        this._pinNodes();
      }
      if (this._settings.isSimulatingOnDataUpdate) {
        this.activateSimulation();
      }
    }
    updateData(data) {
      const newNodeIds = new Set(data.nodes.map((node) => node.id));
      const oldNodes = this._nodes.filter((node) => newNodeIds.has(node.id));
      const newNodes = data.nodes.filter((node) => this._nodeIndexByNodeId[node.id] === void 0);
      this._nodes = [...oldNodes, ...newNodes];
      this._rebuildNodeIndex();
      this._edges = data.edges;
      this._cachedAdjacency = null;
      if (this._settings.isSimulatingOnSettingsUpdate) {
        this.activateSimulation();
      }
    }
    deleteData(data) {
      if (data.nodeIds) {
        const nodeIds = new Set(data.nodeIds);
        this._nodes = this._nodes.filter((node) => !nodeIds.has(node.id));
      }
      if (data.edgeIds) {
        const edgeIds = new Set(data.edgeIds);
        this._edges = this._edges.filter((edge) => !edgeIds.has(edge.id));
      }
      this._rebuildNodeIndex();
      this._cachedAdjacency = null;
      if (this._settings.isSimulatingOnDataUpdate) {
        this.activateSimulation();
      }
    }
    patchData(data) {
      if (data.nodes) {
        const nodeIds = {};
        for (let i = 0; i < this._nodes.length; i++) {
          nodeIds[this._nodes[i].id] = i;
        }
        for (let i = 0; i < data.nodes.length; i += 1) {
          const nodeId2 = data.nodes[i].id;
          if (nodeId2 in nodeIds) {
            const index2 = nodeIds[nodeId2];
            this._nodeIndexByNodeId[nodeId2] = index2;
            this._nodes[index2] = data.nodes[i];
          } else {
            this._nodes.push(data.nodes[i]);
          }
        }
      }
      if (data.edges) {
        const edgeIds = {};
        for (let i = 0; i < this._edges.length; i++) {
          edgeIds[this._edges[i].id] = i;
        }
        for (let i = 0; i < data.edges.length; i++) {
          const edgeId = data.edges[i].id;
          if (edgeId in edgeIds) {
            this._edges[edgeIds[edgeId]] = data.edges[i];
          } else {
            this._edges.push(data.edges[i]);
          }
        }
      }
    }
    clearData() {
      this._nodes = [];
      this._edges = [];
      this._rebuildNodeIndex();
      this._cachedAdjacency = null;
    }
    activateSimulation() {
      if (this._settings.isPhysicsEnabled) {
        this._unpinNodes();
      } else {
        this._pinNodes();
      }
      if (this._isStabilizing) {
        this._pendingRestart = true;
        return;
      }
      this._ensurePositions();
      this._uploadDataToGPU();
      if (!this._cachedAdjacency) {
        this._buildAndUploadAdjacency();
      }
      this._startSimulationLoop();
    }
    stopSimulation() {
      if (this._isStabilizing) {
        this._cancelSimulation = true;
      }
    }
    startDragNode() {
      this._isDragging = true;
      if (this._isStabilizing) {
        this._cancelSimulation = true;
      }
      if (this._settings.isPhysicsEnabled) {
        this._startDragLoop();
      }
    }
    dragNode(nodeId2, position) {
      const nodeIndex = this._nodeIndexByNodeId[nodeId2];
      const node = this._nodes[nodeIndex];
      if (!node) {
        return;
      }
      if (!this._isDragging) {
        this.startDragNode();
      }
      node.fx = position.x;
      node.fy = position.y;
      if (!this._settings.isPhysicsEnabled) {
        node.x = position.x;
        node.y = position.y;
      }
      this._dirtyNodes.add(nodeIndex);
      this._dragNeedsReheat = true;
      this.emit(SimulatorEventType.NODE_DRAG, { nodes: this._nodes, edges: this._edges });
    }
    endDragNode(nodeId2) {
      this._isDragging = false;
      const node = this._nodes[this._nodeIndexByNodeId[nodeId2]];
      if (node && this._settings.isPhysicsEnabled) {
        this._unpinNode(node);
        const nodeIndex = this._nodeIndexByNodeId[nodeId2];
        this._dirtyNodes.add(nodeIndex);
      }
    }
    fixNodes(nodes) {
      if (!nodes) {
        nodes = this._nodes;
      }
      for (let i = 0; i < nodes.length; i++) {
        this._stickNode(nodes[i]);
      }
    }
    releaseNodes(nodes) {
      if (!nodes) {
        nodes = this._nodes;
      }
      for (let i = 0; i < nodes.length; i++) {
        this._unstickNode(nodes[i]);
      }
      if (this._settings.isSimulatingOnUnstick && this._nodes.length > 0) {
        this.activateSimulation();
      }
    }
    terminate() {
      var _a;
      super.terminate();
      const gl = this._gl;
      if (!gl) {
        return;
      }
      gl.deleteBuffer(this._quadBuffer);
      gl.deleteVertexArray(this._quadVAO);
      gl.deleteProgram(this._forceProgram);
      gl.deleteTexture(this._stateTexA);
      gl.deleteTexture(this._stateTexB);
      gl.deleteTexture(this._fixedTex);
      gl.deleteTexture(this._treeDataTexture);
      gl.deleteTexture(this._treeChildrenTexture);
      gl.deleteTexture(this._treeGeometryTexture);
      gl.deleteTexture(this._adjOffsetsTexture);
      gl.deleteTexture(this._adjEdgesTexture);
      gl.deleteFramebuffer(this._fboA);
      gl.deleteFramebuffer(this._fboB);
      (_a = gl.getExtension("WEBGL_lose_context")) === null || _a === void 0 ? void 0 : _a.loseContext();
    }
    reheat() {
      const alphaSettings = this._settings.alpha;
      this._currentAlpha = alphaSettings.alpha;
      this._totalSteps = Math.min(MAX_SIMULATION_STEPS2, Math.ceil(Math.log(alphaSettings.alphaMin) / Math.log(1 - alphaSettings.alphaDecay)));
      this._currentStep = 0;
      if (this._isStabilizing) {
        return;
      }
      this._ensurePositions();
      this._uploadDataToGPU();
      if (!this._cachedAdjacency) {
        this._buildAndUploadAdjacency();
      }
      this._startSimulationLoop();
    }
    _runSimulation() {
      if (this._isStabilizing || this._cancelSimulation) {
        return;
      }
      this._ensurePositions();
      this._uploadDataToGPU();
      this._buildAndUploadAdjacency();
      this._startSimulationLoop();
    }
    _startDragLoop() {
      if (this._dragLoopRunning) {
        return;
      }
      this._dragLoopRunning = true;
      const alphaDecay = this._settings.alpha.alphaDecay;
      const alphaMin = this._settings.alpha.alphaMin;
      this._dragAlpha = 0.3;
      this._dragNeedsReheat = false;
      const tick = () => {
        if (!this._isDragging) {
          this._dragLoopRunning = false;
          return;
        }
        if (this._dragNeedsReheat) {
          this._dragAlpha = 0.3;
          this._dragNeedsReheat = false;
        }
        this._dragAlpha += (0 - this._dragAlpha) * alphaDecay;
        if (this._dragAlpha < alphaMin) {
          requestAnimationFrame(tick);
          return;
        }
        this._readbackFromGPU();
        this._flushDirtyNodes();
        this._buildAndUploadQuadTree();
        this._simulateGPUStep(this._dragAlpha);
        this._readbackFromGPU();
        this._applyCentering();
        this.emit(SimulatorEventType.NODE_DRAG, { nodes: this._nodes, edges: this._edges });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    _startSimulationLoop() {
      if (this._isStabilizing || this._cancelSimulation) {
        return;
      }
      this.emit(SimulatorEventType.SIMULATION_START, void 0);
      this._isStabilizing = true;
      this._pendingRestart = false;
      const generation = ++this._simulationGeneration;
      const alphaSettings = this._settings.alpha;
      const alphaMin = alphaSettings.alphaMin;
      const alphaDecay = alphaSettings.alphaDecay;
      this._currentAlpha = alphaSettings.alpha;
      this._totalSteps = Math.min(MAX_SIMULATION_STEPS2, Math.ceil(Math.log(alphaMin) / Math.log(1 - alphaDecay)));
      this._currentStep = 0;
      let lastProgress = -1;
      const runChunk = () => {
        if (generation !== this._simulationGeneration) {
          return;
        }
        if (this._cancelSimulation) {
          this._isStabilizing = false;
          this._cancelSimulation = false;
          this.emit(SimulatorEventType.SIMULATION_END, { nodes: this._nodes, edges: this._edges });
          return;
        }
        this._readbackFromGPU();
        if (this._pendingRestart) {
          this._isStabilizing = false;
          this._pendingRestart = false;
          this._ensurePositions();
          this._uploadDataToGPU();
          if (!this._cachedAdjacency) {
            this._buildAndUploadAdjacency();
          }
          this._startSimulationLoop();
          return;
        }
        this._flushDirtyNodes();
        this._buildAndUploadQuadTree();
        const end = Math.min(this._currentStep + CHUNK_SIZE2, this._totalSteps);
        for (; this._currentStep < end; this._currentStep++) {
          this._currentAlpha += (alphaSettings.alphaTarget - this._currentAlpha) * alphaDecay;
          if (this._currentAlpha < alphaMin || this._cancelSimulation) {
            this._currentStep = this._totalSteps;
            break;
          }
          this._simulateGPUStep(this._currentAlpha);
        }
        this._readbackFromGPU();
        this._applyCentering();
        const currentProgress = Math.round(this._currentStep * 100 / this._totalSteps);
        if (currentProgress > lastProgress) {
          lastProgress = currentProgress;
          this.emit(SimulatorEventType.SIMULATION_PROGRESS, {
            nodes: this._nodes,
            edges: this._edges,
            progress: currentProgress / 100
          });
        }
        if (this._currentStep < this._totalSteps && !this._cancelSimulation) {
          this._scheduleNext(runChunk);
        } else {
          if (!this._settings.isPhysicsEnabled) {
            this._pinNodes();
          }
          this._isStabilizing = false;
          this._cancelSimulation = false;
          this.emit(SimulatorEventType.SIMULATION_END, { nodes: this._nodes, edges: this._edges });
        }
      };
      this._scheduleNext(runChunk);
    }
    _ensurePositions() {
      var _a, _b;
      const linkDist = (_b = (_a = this._settings.links) === null || _a === void 0 ? void 0 : _a.distance) !== null && _b !== void 0 ? _b : 50;
      const spread = linkDist * Math.sqrt(this._nodes.length);
      for (const node of this._nodes) {
        if (node.x === void 0 || node.x === null) {
          node.x = (Math.random() - 0.5) * spread;
        }
        if (node.y === void 0 || node.y === null) {
          node.y = (Math.random() - 0.5) * spread;
        }
      }
    }
    _applyCentering() {
      var _a, _b, _c, _d;
      const c2 = this._settings.centering;
      if (!c2) {
        return;
      }
      const N = this._nodes.length;
      if (N === 0) {
        return;
      }
      let sx = 0;
      let sy = 0;
      for (let i = 0; i < N; i++) {
        sx += (_a = this._nodes[i].x) !== null && _a !== void 0 ? _a : 0;
        sy += (_b = this._nodes[i].y) !== null && _b !== void 0 ? _b : 0;
      }
      const dx = (sx / N - c2.x) * c2.strength;
      const dy = (sy / N - c2.y) * c2.strength;
      if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
        return;
      }
      for (let i = 0; i < N; i++) {
        const node = this._nodes[i];
        if (node.fx !== null && node.fx !== void 0) {
          continue;
        }
        node.x = ((_c = node.x) !== null && _c !== void 0 ? _c : 0) - dx;
        node.y = ((_d = node.y) !== null && _d !== void 0 ? _d : 0) - dy;
      }
      this._syncStateToGPU();
    }
    _syncStateToGPU() {
      var _a, _b, _c, _d;
      const N = this._nodes.length;
      if (N === 0) {
        return;
      }
      const texSize = this._texWidth * this._texWidth;
      const stateData = new Float32Array(texSize * 4);
      for (let i = 0; i < N; i++) {
        const node = this._nodes[i];
        const off = i * 4;
        stateData[off] = (_a = node.x) !== null && _a !== void 0 ? _a : 0;
        stateData[off + 1] = (_b = node.y) !== null && _b !== void 0 ? _b : 0;
        stateData[off + 2] = (_c = node.vx) !== null && _c !== void 0 ? _c : 0;
        stateData[off + 3] = (_d = node.vy) !== null && _d !== void 0 ? _d : 0;
      }
      this._uploadTexture(this._stateTexA, stateData, this._texWidth);
      this._uploadTexture(this._stateTexB, stateData, this._texWidth);
      this._pingPong = true;
    }
    _flushDirtyNodes() {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      if (this._dirtyNodes.size === 0) {
        return;
      }
      const gl = this._gl;
      for (const nodeIndex of this._dirtyNodes) {
        const node = this._nodes[nodeIndex];
        if (!node) {
          continue;
        }
        const col = nodeIndex % this._texWidth;
        const row = Math.floor(nodeIndex / this._texWidth);
        const statePixel = new Float32Array([(_a = node.x) !== null && _a !== void 0 ? _a : 0, (_b = node.y) !== null && _b !== void 0 ? _b : 0, (_c = node.vx) !== null && _c !== void 0 ? _c : 0, (_d = node.vy) !== null && _d !== void 0 ? _d : 0]);
        gl.bindTexture(gl.TEXTURE_2D, this._stateTexA);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, col, row, 1, 1, gl.RGBA, gl.FLOAT, statePixel);
        gl.bindTexture(gl.TEXTURE_2D, this._stateTexB);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, col, row, 1, 1, gl.RGBA, gl.FLOAT, statePixel);
        const fixedPixel = new Float32Array([
          node.fx !== null && node.fx !== void 0 ? 1 : 0,
          (_f = (_e = node.fx) !== null && _e !== void 0 ? _e : node.x) !== null && _f !== void 0 ? _f : 0,
          (_h = (_g = node.fy) !== null && _g !== void 0 ? _g : node.y) !== null && _h !== void 0 ? _h : 0,
          0
        ]);
        gl.bindTexture(gl.TEXTURE_2D, this._fixedTex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, col, row, 1, 1, gl.RGBA, gl.FLOAT, fixedPixel);
      }
      this._dirtyNodes.clear();
    }
    _buildAndUploadQuadTree() {
      var _a, _b, _c;
      const N = this._nodes.length;
      if (N === 0) {
        return;
      }
      const strength = (_b = (_a = this._settings.manyBody) === null || _a === void 0 ? void 0 : _a.strength) !== null && _b !== void 0 ? _b : -100;
      let positions = this._nodes;
      if ((_c = this._settings.manyBody) === null || _c === void 0 ? void 0 : _c.edgeMidpointRepulsion) {
        const edgeMidpoints = this._getEdgeMidpoints();
        if (edgeMidpoints.length > 0) {
          positions = positions.concat(edgeMidpoints);
        }
      }
      const tree = buildQuadTree(positions, strength);
      this._uploadTexture(this._treeDataTexture, tree.treeData, tree.texWidth);
      this._uploadTexture(this._treeChildrenTexture, tree.treeChildren, tree.texWidth);
      this._uploadTexture(this._treeGeometryTexture, tree.treeGeometry, tree.texWidth);
      this._treeTexWidth = tree.texWidth;
      this._treeNodeCount = tree.nodeCount;
    }
    _getEdgeMidpoints() {
      var _a, _b, _c, _d;
      const midpoints = [];
      for (let i = 0; i < this._edges.length; i++) {
        const edge = this._edges[i];
        const srcId = typeof edge.source === "object" ? edge.source.id : edge.source;
        const tgtId = typeof edge.target === "object" ? edge.target.id : edge.target;
        const srcIdx = this._nodeIndexByNodeId[srcId];
        const tgtIdx = this._nodeIndexByNodeId[tgtId];
        if (srcIdx === void 0 || tgtIdx === void 0) {
          continue;
        }
        const src = this._nodes[srcIdx];
        const tgt = this._nodes[tgtIdx];
        midpoints.push({
          x: (((_a = src.x) !== null && _a !== void 0 ? _a : 0) + ((_b = tgt.x) !== null && _b !== void 0 ? _b : 0)) * 0.5,
          y: (((_c = src.y) !== null && _c !== void 0 ? _c : 0) + ((_d = tgt.y) !== null && _d !== void 0 ? _d : 0)) * 0.5
        });
      }
      return midpoints;
    }
    _buildAndUploadAdjacency() {
      var _a, _b;
      const N = this._nodes.length;
      if (N === 0) {
        return;
      }
      const linkDist = (_b = (_a = this._settings.links) === null || _a === void 0 ? void 0 : _a.distance) !== null && _b !== void 0 ? _b : 50;
      const adj = buildAdjacency(this._nodes, this._edges, linkDist, void 0);
      this._cachedAdjacency = adj;
      this._uploadTexture(this._adjOffsetsTexture, adj.offsets, adj.offsetsTexWidth);
      this._uploadTexture(this._adjEdgesTexture, adj.edges, adj.edgesTexWidth);
    }
    _pinNodes(nodes) {
      if (!nodes) {
        nodes = this._nodes;
      }
      for (let i = 0; i < nodes.length; i++) {
        this._pinNode(this._nodes[i]);
      }
    }
    _unpinNodes(nodes) {
      if (!nodes) {
        nodes = this._nodes;
      }
      for (let i = 0; i < nodes.length; i++) {
        this._unpinNode(this._nodes[i]);
      }
    }
    _pinNode(node) {
      if (node.sx === null || node.sx === void 0) {
        node.fx = node.x;
      }
      if (node.sy === null || node.sy === void 0) {
        node.fy = node.y;
      }
    }
    _unpinNode(node) {
      if (node.sx === null || node.sx === void 0) {
        node.fx = null;
      }
      if (node.sy === null || node.sy === void 0) {
        node.fy = null;
      }
    }
    _stickNode(node) {
      node.sx = node.x;
      node.fx = node.x;
      node.sy = node.y;
      node.fy = node.y;
    }
    _unstickNode(node) {
      node.sx = null;
      node.sy = null;
      if (this._settings.isPhysicsEnabled) {
        node.fx = null;
        node.fy = null;
      }
    }
    _initializeNewData(data) {
      if (data.nodes) {
        for (let i = 0; i < data.nodes.length; i += 1) {
          const nodeId2 = data.nodes[i].id;
          if (this._nodeIndexByNodeId[nodeId2] !== void 0) {
            this._nodeIndexByNodeId[nodeId2] = i;
          } else {
            this._nodes.push(data.nodes[i]);
          }
        }
      } else {
        this._nodes = [];
      }
      if (data.edges) {
        const edgeIds = {};
        for (let i = 0; i < this._edges.length; i++) {
          edgeIds[this._edges[i].id] = i;
        }
        for (let i = 0; i < data.edges.length; i++) {
          const edgeId = data.edges[i].id;
          if (edgeId in edgeIds) {
            this._edges[edgeIds[edgeId]] = data.edges[i];
          } else {
            this._edges.push(data.edges[i]);
          }
        }
      } else {
        this._edges = [];
      }
      this._rebuildNodeIndex();
      this._cachedAdjacency = null;
    }
    _initGPU() {
      const gl = this._gl;
      gl.getExtension("EXT_color_buffer_float");
      const vs = compileShader(gl, force_vert_default, ShaderType.VERTEX);
      const fs = compileShader(gl, force_frag_default, ShaderType.FRAGMENT);
      const program = gl.createProgram();
      if (!program) {
        throw new OrbError("Failed to create program.");
      }
      this._forceProgram = program;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        throw new OrbError(`Failed to link force program: ${info}`);
      }
      this._cacheUniformLocations(program);
      this._quadBuffer = gl.createBuffer();
      const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
      gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
      this._quadVAO = gl.createVertexArray();
      gl.bindVertexArray(this._quadVAO);
      const posLoc = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      this._stateTexA = gl.createTexture();
      this._stateTexB = gl.createTexture();
      this._fixedTex = gl.createTexture();
      this._treeDataTexture = gl.createTexture();
      this._treeChildrenTexture = gl.createTexture();
      this._treeGeometryTexture = gl.createTexture();
      this._adjOffsetsTexture = gl.createTexture();
      this._adjEdgesTexture = gl.createTexture();
      this._fboA = gl.createFramebuffer();
      this._fboB = gl.createFramebuffer();
    }
    _cacheUniformLocations(program) {
      const gl = this._gl;
      const names = [
        "uState",
        "uFixed",
        "uTreeData",
        "uTreeChildren",
        "uTreeGeometry",
        "uAdjOffsets",
        "uAdjEdges",
        "uNodeCount",
        "uTexWidth",
        "uAlpha",
        "uDamping",
        "uManyBodyStrength",
        "uTheta2",
        "uDistanceMin2",
        "uDistanceMax2",
        "uTreeNodeCount",
        "uTreeTexWidth",
        "uAdjOffsetsTexWidth",
        "uAdjEdgesTexWidth",
        "uCenter",
        "uCenterStrength",
        "uCollisionRadius",
        "uCollisionStrength",
        "uForceXTarget",
        "uForceXStrength",
        "uForceYTarget",
        "uForceYStrength",
        "uHasManyBody",
        "uHasLinks",
        "uHasCentering",
        "uHasCollision",
        "uHasPositioning"
      ];
      for (const name of names) {
        this._uniforms[name] = gl.getUniformLocation(program, name);
      }
    }
    _uploadDataToGPU() {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      const gl = this._gl;
      const N = this._nodes.length;
      this._texWidth = Math.max(1, Math.ceil(Math.sqrt(N)));
      const texSize = this._texWidth * this._texWidth;
      const stateData = new Float32Array(texSize * 4);
      const fixedData = new Float32Array(texSize * 4);
      for (let i = 0; i < N; i++) {
        const node = this._nodes[i];
        const off = i * 4;
        stateData[off] = (_a = node.x) !== null && _a !== void 0 ? _a : 0;
        stateData[off + 1] = (_b = node.y) !== null && _b !== void 0 ? _b : 0;
        stateData[off + 2] = (_c = node.vx) !== null && _c !== void 0 ? _c : 0;
        stateData[off + 3] = (_d = node.vy) !== null && _d !== void 0 ? _d : 0;
        fixedData[off] = node.fx !== null && node.fx !== void 0 ? 1 : 0;
        fixedData[off + 1] = (_f = (_e = node.fx) !== null && _e !== void 0 ? _e : node.x) !== null && _f !== void 0 ? _f : 0;
        fixedData[off + 2] = (_h = (_g = node.fy) !== null && _g !== void 0 ? _g : node.y) !== null && _h !== void 0 ? _h : 0;
        fixedData[off + 3] = 0;
      }
      this._uploadTexture(this._stateTexA, stateData, this._texWidth);
      this._uploadTexture(this._stateTexB, stateData, this._texWidth);
      this._uploadTexture(this._fixedTex, fixedData, this._texWidth);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._fboA);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._stateTexA, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._fboB);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._stateTexB, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this._pingPong = true;
    }
    _uploadTexture(texture, data, texWidth) {
      const gl = this._gl;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texWidth, texWidth, 0, gl.RGBA, gl.FLOAT, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    _simulateGPUStep(alpha) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
      const gl = this._gl;
      const program = this._forceProgram;
      if (!program) {
        throw new OrbError("Force program not initialized.");
      }
      const N = this._nodes.length;
      if (N === 0) {
        return;
      }
      gl.useProgram(program);
      const u = this._uniforms;
      gl.uniform1i(u["uNodeCount"], N);
      gl.uniform1i(u["uTexWidth"], this._texWidth);
      gl.uniform1f(u["uAlpha"], alpha);
      gl.uniform1f(u["uDamping"], 0.6);
      const hasManyBody = this._settings.manyBody !== null && this._settings.manyBody !== void 0;
      gl.uniform1f(u["uHasManyBody"], hasManyBody ? 1 : 0);
      if (hasManyBody) {
        const mb = this._settings.manyBody;
        gl.uniform1f(u["uManyBodyStrength"], mb.strength);
        const theta = mb.theta;
        gl.uniform1f(u["uTheta2"], theta * theta);
        gl.uniform1f(u["uDistanceMin2"], mb.distanceMin * mb.distanceMin);
        const dMax = mb.distanceMax > 0 ? mb.distanceMax : getManyBodyMaxDistance((_b = (_a = this._settings.links) === null || _a === void 0 ? void 0 : _a.distance) !== null && _b !== void 0 ? _b : 50);
        gl.uniform1f(u["uDistanceMax2"], dMax * dMax);
        gl.uniform1i(u["uTreeNodeCount"], this._treeNodeCount);
        gl.uniform1i(u["uTreeTexWidth"], this._treeTexWidth);
      }
      const hasLinks = this._cachedAdjacency !== null && this._edges.length > 0;
      gl.uniform1f(u["uHasLinks"], hasLinks ? 1 : 0);
      if (hasLinks) {
        gl.uniform1i(u["uAdjOffsetsTexWidth"], this._cachedAdjacency.offsetsTexWidth);
        gl.uniform1i(u["uAdjEdgesTexWidth"], this._cachedAdjacency.edgesTexWidth);
      }
      gl.uniform1f(u["uHasCentering"], 0);
      const hasCollision = this._settings.collision !== null && this._settings.collision !== void 0;
      gl.uniform1f(u["uHasCollision"], hasCollision ? 1 : 0);
      if (hasCollision) {
        gl.uniform1f(u["uCollisionRadius"], this._settings.collision.radius);
        gl.uniform1f(u["uCollisionStrength"], this._settings.collision.strength);
      }
      const hasPositioning = this._settings.positioning !== null && this._settings.positioning !== void 0;
      gl.uniform1f(u["uHasPositioning"], hasPositioning ? 1 : 0);
      if (hasPositioning) {
        const pos = this._settings.positioning;
        gl.uniform1f(u["uForceXTarget"], (_d = (_c = pos.forceX) === null || _c === void 0 ? void 0 : _c.x) !== null && _d !== void 0 ? _d : 0);
        gl.uniform1f(u["uForceXStrength"], (_f = (_e = pos.forceX) === null || _e === void 0 ? void 0 : _e.strength) !== null && _f !== void 0 ? _f : 0);
        gl.uniform1f(u["uForceYTarget"], (_h = (_g = pos.forceY) === null || _g === void 0 ? void 0 : _g.y) !== null && _h !== void 0 ? _h : 0);
        gl.uniform1f(u["uForceYStrength"], (_k = (_j = pos.forceY) === null || _j === void 0 ? void 0 : _j.strength) !== null && _k !== void 0 ? _k : 0);
      }
      const readStateTex = this._pingPong ? this._stateTexA : this._stateTexB;
      const writeFBO = this._pingPong ? this._fboB : this._fboA;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readStateTex);
      gl.uniform1i(u["uState"], 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this._fixedTex);
      gl.uniform1i(u["uFixed"], 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this._treeDataTexture);
      gl.uniform1i(u["uTreeData"], 2);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this._treeChildrenTexture);
      gl.uniform1i(u["uTreeChildren"], 3);
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, this._adjOffsetsTexture);
      gl.uniform1i(u["uAdjOffsets"], 4);
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, this._adjEdgesTexture);
      gl.uniform1i(u["uAdjEdges"], 5);
      gl.activeTexture(gl.TEXTURE6);
      gl.bindTexture(gl.TEXTURE_2D, this._treeGeometryTexture);
      gl.uniform1i(u["uTreeGeometry"], 6);
      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFBO);
      gl.viewport(0, 0, this._texWidth, this._texWidth);
      gl.bindVertexArray(this._quadVAO);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindVertexArray(null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this._pingPong = !this._pingPong;
    }
    _readbackFromGPU() {
      const gl = this._gl;
      const N = this._nodes.length;
      if (N === 0) {
        return;
      }
      const readFBO = this._pingPong ? this._fboA : this._fboB;
      const texSize = this._texWidth * this._texWidth;
      const data = new Float32Array(texSize * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, readFBO);
      gl.readPixels(0, 0, this._texWidth, this._texWidth, gl.RGBA, gl.FLOAT, data);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      for (let i = 0; i < N; i++) {
        const node = this._nodes[i];
        const off = i * 4;
        node.x = data[off];
        node.y = data[off + 1];
        node.vx = data[off + 2];
        node.vy = data[off + 3];
      }
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/engine/engines/static/static-layout-engine.js
  var CHUNK_SIZE3 = 5e3;
  var StaticLayoutEngine = class extends BaseLayoutEngine {
    constructor() {
      super(...arguments);
      this._isCalculating = false;
      this._pendingRecalculation = false;
    }
    setupData(data) {
      this._nodes = [...data.nodes];
      this._edges = [...data.edges];
      this._rebuildNodeIndex();
      this._calculateAndEmit();
    }
    mergeData(data) {
      if (data.nodes) {
        for (let i = 0; i < data.nodes.length; i++) {
          const existingIndex = this._nodeIndexByNodeId[data.nodes[i].id];
          if (existingIndex !== void 0) {
            this._nodes[existingIndex] = data.nodes[i];
          } else {
            this._nodes.push(data.nodes[i]);
          }
        }
      }
      if (data.edges) {
        const edgeIds = {};
        for (let i = 0; i < this._edges.length; i++) {
          edgeIds[this._edges[i].id] = i;
        }
        for (let i = 0; i < data.edges.length; i++) {
          const edgeId = data.edges[i].id;
          if (edgeId in edgeIds) {
            this._edges[edgeIds[edgeId]] = data.edges[i];
          } else {
            this._edges.push(data.edges[i]);
          }
        }
      }
      this._rebuildNodeIndex();
      this._calculateAndEmit();
    }
    updateData(data) {
      const newNodeIds = new Set(data.nodes.map((node) => node.id));
      const oldNodes = this._nodes.filter((node) => newNodeIds.has(node.id));
      const newNodes = data.nodes.filter((node) => this._nodeIndexByNodeId[node.id] === void 0);
      this._nodes = [...oldNodes, ...newNodes];
      this._edges = data.edges;
      this._rebuildNodeIndex();
      this._calculateAndEmit();
    }
    deleteData(data) {
      if (data.nodeIds) {
        const nodeIds = new Set(data.nodeIds);
        this._nodes = this._nodes.filter((node) => !nodeIds.has(node.id));
      }
      if (data.edgeIds) {
        const edgeIds = new Set(data.edgeIds);
        this._edges = this._edges.filter((edge) => !edgeIds.has(edge.id));
      }
      this._rebuildNodeIndex();
      this._calculateAndEmit();
    }
    patchData(data) {
      if (data.nodes) {
        for (let i = 0; i < data.nodes.length; i++) {
          const id2 = data.nodes[i].id;
          const index2 = this._nodeIndexByNodeId[id2];
          if (index2 !== void 0) {
            this._nodes[index2] = data.nodes[i];
          } else {
            this._nodes.push(data.nodes[i]);
            this._nodeIndexByNodeId[id2] = this._nodes.length - 1;
          }
        }
      }
      if (data.edges) {
        const edgeIds = {};
        for (let i = 0; i < this._edges.length; i++) {
          edgeIds[this._edges[i].id] = i;
        }
        for (let i = 0; i < data.edges.length; i++) {
          const edgeId = data.edges[i].id;
          if (edgeId in edgeIds) {
            this._edges[edgeIds[edgeId]] = data.edges[i];
          } else {
            this._edges.push(data.edges[i]);
          }
        }
      }
    }
    clearData() {
      this._nodes = [];
      this._edges = [];
      this._nodeIndexByNodeId = {};
    }
    activateSimulation() {
    }
    stopSimulation() {
    }
    startDragNode() {
    }
    dragNode(nodeId2, position) {
      const index2 = this._nodeIndexByNodeId[nodeId2];
      if (index2 !== void 0) {
        const node = this._nodes[index2];
        node.x = position.x;
        node.y = position.y;
        node.fx = position.x;
        node.fy = position.y;
        this.emit(SimulatorEventType.NODE_DRAG, { nodes: this._nodes, edges: this._edges });
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    endDragNode(_nodeId) {
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fixNodes(_nodes) {
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    releaseNodes(_nodes) {
    }
    setSettings(settings) {
      const previous = copyObject(this._config);
      Object.assign(this._config, settings);
      if (!isObjectEqual(this._config, previous) && this._nodes.length > 0) {
        this._calculateAndEmit();
      }
    }
    terminate() {
      this._pendingRecalculation = false;
      super.terminate();
    }
    _calculateAndEmit() {
      if (this._nodes.length === 0 || this._cancelSimulation) {
        return;
      }
      if (this._isCalculating) {
        this._pendingRecalculation = true;
        return;
      }
      this._isCalculating = true;
      this.emit(SimulatorEventType.SIMULATION_START, void 0);
      this.calculatePositions(this._nodes, this._edges, (progress) => {
        this.emit(SimulatorEventType.SIMULATION_PROGRESS, {
          nodes: this._nodes,
          edges: this._edges,
          progress
        });
      }, () => this._cancelSimulation, () => {
        this._isCalculating = false;
        if (!this._cancelSimulation) {
          this.emit(SimulatorEventType.SIMULATION_END, { nodes: this._nodes, edges: this._edges });
        }
        this._cancelSimulation = false;
        if (this._pendingRecalculation) {
          this._pendingRecalculation = false;
          this._calculateAndEmit();
        }
      });
    }
    _emitProgress(index2, total, lastProgress, onProgress) {
      const currentProgress = Math.round(index2 * 100 / total);
      if (currentProgress > lastProgress) {
        onProgress(currentProgress / 100);
        return currentProgress;
      }
      return lastProgress;
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/engine/engines/static/circular-layout-engine.js
  var CircularLayoutEngine = class extends StaticLayoutEngine {
    constructor(options) {
      super();
      this.type = "circular";
      this._config = Object.assign(Object.assign({}, DEFAULT_CIRCULAR_LAYOUT_OPTIONS), options);
    }
    calculatePositions(nodes, _edges, onProgress, isCancelled, onComplete) {
      const angleStep = 2 * Math.PI / nodes.length;
      let lastProgress = -1;
      let step = 0;
      const runChunk = () => {
        if (isCancelled()) {
          onComplete();
          return;
        }
        const end = Math.min(step + CHUNK_SIZE3, nodes.length);
        for (; step < end; step++) {
          nodes[step].x = this._config.centerX + this._config.radius * Math.cos(angleStep * step);
          nodes[step].y = this._config.centerY + this._config.radius * Math.sin(angleStep * step);
        }
        if (step < nodes.length && !this._cancelSimulation) {
          lastProgress = this._emitProgress(step + 1, nodes.length, lastProgress, onProgress);
          this._scheduleNext(runChunk);
        } else {
          onComplete();
        }
      };
      runChunk();
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/engine/engines/static/grid-layout-engine.js
  var GridLayoutEngine = class extends StaticLayoutEngine {
    constructor(options) {
      super();
      this.type = "grid";
      this._config = Object.assign(Object.assign({}, DEFAULT_GRID_LAYOUT_OPTIONS), options);
    }
    calculatePositions(nodes, _edges, onProgress, isCancelled, onComplete) {
      const rows = Math.ceil(Math.sqrt(nodes.length));
      const cols = Math.ceil(nodes.length / rows);
      let lastProgress = -1;
      let step = 0;
      const runChunk = () => {
        if (isCancelled()) {
          onComplete();
          return;
        }
        const end = Math.min(step + CHUNK_SIZE3, nodes.length);
        for (; step < end; step++) {
          const row = Math.floor(step / cols);
          const col = step % cols;
          nodes[step].x = col * this._config.colGap;
          nodes[step].y = row * this._config.rowGap;
        }
        if (step < nodes.length && !this._cancelSimulation) {
          console.log(step);
          lastProgress = this._emitProgress(step + 1, nodes.length, lastProgress, onProgress);
          this._scheduleNext(runChunk);
        } else {
          onComplete();
        }
      };
      runChunk();
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/engine/engines/static/hierarchical-layout-engine.js
  var HierarchicalLayoutEngine = class extends StaticLayoutEngine {
    constructor(options) {
      super();
      this.type = "hierarchical";
      this._config = Object.assign(Object.assign({}, DEFAULT_HIERARCHICAL_LAYOUT_OPTIONS), options);
    }
    calculatePositions(nodes, edges, onProgress, isCancelled, onComplete) {
      const { adjacency, inDegree } = this._buildAdjacency(nodes, edges);
      const components = this._getConnectedComponents(nodes, adjacency);
      let maxX = 0;
      let maxHeight = 0;
      let counter = 0;
      let lastProgress = -1;
      let componentIndex = 0;
      const processComponent = () => {
        if (isCancelled() || componentIndex >= components.length) {
          if (!isCancelled() && this._config.reversed) {
            this._applyReversal(nodes, maxX, maxHeight);
          }
          onComplete();
          return;
        }
        const levels = this._assignLevels(components[componentIndex], adjacency, inDegree);
        const maxLevelSize = Math.max(...Array.from(levels.values()).map((level) => level.length));
        if (levels.size * this._config.levelGap > maxHeight) {
          maxHeight = levels.size * this._config.levelGap;
        }
        let offsetX = componentIndex === 0 ? 0 : this._config.treeGap + maxX;
        if (componentIndex > 0) {
          offsetX += (maxLevelSize - 1) * this._config.nodeGap / 2;
        }
        for (let j = 0; j < levels.size; j++) {
          const y3 = j * this._config.levelGap;
          const level = levels.get(j);
          if (!level) {
            continue;
          }
          const width = level.length * this._config.nodeGap;
          for (let k = 0; k < level.length; k++) {
            const nodeId2 = level[k];
            const nodeIndex = this._nodeIndexByNodeId[nodeId2];
            const x3 = width / 2 - k * this._config.nodeGap + offsetX;
            if (x3 > maxX) {
              maxX = x3;
            }
            if (nodeIndex !== void 0) {
              nodes[nodeIndex].x = this._config.orientation === "horizontal" ? y3 : x3;
              nodes[nodeIndex].y = this._config.orientation === "horizontal" ? x3 : y3;
            }
            counter++;
          }
        }
        componentIndex++;
        if (componentIndex < components.length && !this._cancelSimulation) {
          lastProgress = this._emitProgress(counter, nodes.length, lastProgress, onProgress);
          this._scheduleNext(processComponent);
        } else {
          if (!isCancelled() && this._config.reversed) {
            this._applyReversal(nodes, maxX, maxHeight);
          }
          onComplete();
        }
      };
      processComponent();
    }
    _applyReversal(nodes, maxX, maxHeight) {
      var _a, _b;
      for (let i = 0; i < nodes.length; i++) {
        if (this._config.orientation === "horizontal" && nodes[i].x !== void 0) {
          nodes[i].x = maxX - ((_a = nodes[i].x) !== null && _a !== void 0 ? _a : 0);
        }
        if (this._config.orientation === "vertical" && nodes[i].y !== void 0) {
          nodes[i].y = maxHeight - ((_b = nodes[i].y) !== null && _b !== void 0 ? _b : 0);
        }
      }
    }
    _buildAdjacency(_nodes, edges) {
      var _a, _b, _c;
      const adjacency = /* @__PURE__ */ new Map();
      const inDegree = /* @__PURE__ */ new Map();
      for (let i = 0; i < edges.length; i++) {
        const sourceId = this._getEdgeEndpointId(edges[i].source);
        const targetId = this._getEdgeEndpointId(edges[i].target);
        if (sourceId === targetId) {
          continue;
        }
        if (!adjacency.has(sourceId)) {
          adjacency.set(sourceId, []);
        }
        if (!adjacency.has(targetId)) {
          adjacency.set(targetId, []);
        }
        (_a = adjacency.get(sourceId)) === null || _a === void 0 ? void 0 : _a.push(targetId);
        (_b = adjacency.get(targetId)) === null || _b === void 0 ? void 0 : _b.push(sourceId);
        inDegree.set(targetId, ((_c = inDegree.get(targetId)) !== null && _c !== void 0 ? _c : 0) + 1);
      }
      return { adjacency, inDegree };
    }
    _getConnectedComponents(nodes, adjacency) {
      var _a;
      const visited = /* @__PURE__ */ new Set();
      const components = [];
      for (let i = 0; i < nodes.length; i++) {
        const nodeId2 = nodes[i].id;
        if (visited.has(nodeId2)) {
          continue;
        }
        const component = [];
        const queue = [nodeId2];
        visited.add(nodeId2);
        while (queue.length > 0) {
          const current = queue.pop();
          if (current === void 0) {
            continue;
          }
          component.push(current);
          const neighbors = (_a = adjacency.get(current)) !== null && _a !== void 0 ? _a : [];
          for (let j = 0; j < neighbors.length; j++) {
            if (!visited.has(neighbors[j])) {
              visited.add(neighbors[j]);
              queue.push(neighbors[j]);
            }
          }
        }
        components.push(component);
      }
      return components;
    }
    _assignLevels(componentNodeIds, adjacency, inDegree) {
      var _a, _b;
      const levels = /* @__PURE__ */ new Map();
      const visited = /* @__PURE__ */ new Set();
      let root2 = componentNodeIds.find((id2) => {
        var _a2;
        return ((_a2 = inDegree.get(id2)) !== null && _a2 !== void 0 ? _a2 : 0) === 0;
      });
      if (root2 === void 0) {
        root2 = componentNodeIds.reduce((minId, id2) => {
          var _a2, _b2;
          return ((_a2 = inDegree.get(id2)) !== null && _a2 !== void 0 ? _a2 : 0) < ((_b2 = inDegree.get(minId)) !== null && _b2 !== void 0 ? _b2 : 0) ? id2 : minId;
        });
      }
      const queue = [[root2, 0]];
      for (const [nodeId2, level] of queue) {
        if (visited.has(nodeId2)) {
          continue;
        }
        visited.add(nodeId2);
        if (levels.has(level)) {
          (_a = levels.get(level)) === null || _a === void 0 ? void 0 : _a.push(nodeId2);
        } else {
          levels.set(level, [nodeId2]);
        }
        const neighbors = (_b = adjacency.get(nodeId2)) !== null && _b !== void 0 ? _b : [];
        for (let i = 0; i < neighbors.length; i++) {
          queue.push([neighbors[i], level + 1]);
        }
      }
      return levels;
    }
    _getEdgeEndpointId(endpoint) {
      if (typeof endpoint === "object") {
        return endpoint.id;
      }
      return endpoint;
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/engine/factory.js
  var LayoutEngineFactory = class {
    static create(settings) {
      switch (settings === null || settings === void 0 ? void 0 : settings.type) {
        case "circular":
          return new CircularLayoutEngine(settings.options);
        case "grid":
          return new GridLayoutEngine(settings.options);
        case "hierarchical":
          return new HierarchicalLayoutEngine(settings.options);
        case "force":
        default: {
          const forceOptions = settings === null || settings === void 0 ? void 0 : settings.options;
          if (forceOptions === null || forceOptions === void 0 ? void 0 : forceOptions.useGPU) {
            try {
              return new GPUForceLayoutEngine(forceOptions);
            } catch (_a) {
              console.warn("WebGL2 unavailable, falling back to CPU force layout engine.");
              return new ForceLayoutEngine(forceOptions);
            }
          }
          return new ForceLayoutEngine(forceOptions);
        }
      }
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/types/main-thread-simulator.js
  var MainThreadSimulator = class extends Emitter {
    constructor(settings) {
      super();
      this._isSimulationRunning = false;
      this._engine = LayoutEngineFactory.create(settings);
      this._wireEngineEvents();
    }
    setupData(data) {
      this._engine.setupData(data);
    }
    mergeData(data) {
      this._engine.mergeData(data);
    }
    updateData(data) {
      this._engine.updateData(data);
    }
    deleteData(data) {
      this._engine.deleteData(data);
    }
    patchData(data) {
      this._engine.patchData(data);
    }
    clearData() {
      this._engine.clearData();
    }
    activateSimulation() {
      this._engine.activateSimulation();
    }
    stopSimulation() {
      this._engine.stopSimulation();
    }
    startDragNode() {
      this._engine.startDragNode();
    }
    dragNode(nodeId2, position) {
      this._engine.dragNode(nodeId2, position);
    }
    endDragNode(nodeId2) {
      this._engine.endDragNode(nodeId2);
    }
    fixNodes(nodes) {
      this._engine.fixNodes(nodes);
    }
    releaseNodes(nodes) {
      this._engine.releaseNodes(nodes);
    }
    setSettings(settings) {
      if (settings.type === this._engine.type && settings.options) {
        this._engine.setSettings(settings.options);
        return;
      }
      this._engine.removeAllListeners();
      this._engine.terminate();
      this._engine = LayoutEngineFactory.create(settings);
      this._wireEngineEvents();
    }
    isSimulationRunning() {
      return this._isSimulationRunning;
    }
    terminate() {
      this._engine.removeAllListeners();
      this._engine.terminate();
      this.removeAllListeners();
    }
    _wireEngineEvents() {
      relaySimulatorEvents(this._engine, this, (isRunning) => {
        this._isSimulationRunning = isRunning;
      });
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/types/web-worker-simulator/message/worker-input.js
  var WorkerInputType;
  (function(WorkerInputType2) {
    WorkerInputType2["SetupData"] = "Set Data";
    WorkerInputType2["MergeData"] = "Add Data";
    WorkerInputType2["UpdateData"] = "Update Data";
    WorkerInputType2["DeleteData"] = "Delete Data";
    WorkerInputType2["PatchData"] = "Patch Data";
    WorkerInputType2["ClearData"] = "Clear Data";
    WorkerInputType2["ActivateSimulation"] = "Activate Simulation";
    WorkerInputType2["UpdateSimulation"] = "Update Simulation";
    WorkerInputType2["StopSimulation"] = "Stop Simulation";
    WorkerInputType2["StartDragNode"] = "Start Drag Node";
    WorkerInputType2["DragNode"] = "Drag Node";
    WorkerInputType2["EndDragNode"] = "End Drag Node";
    WorkerInputType2["FixNodes"] = "Fix Nodes";
    WorkerInputType2["ReleaseNodes"] = "Release Nodes";
    WorkerInputType2["SetSettings"] = "Set Settings";
  })(WorkerInputType || (WorkerInputType = {}));

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/types/web-worker-simulator/message/worker-output.js
  var WorkerOutputType;
  (function(WorkerOutputType2) {
    WorkerOutputType2["READY"] = "ready";
    WorkerOutputType2["SIMULATION_START"] = "simulation-start";
    WorkerOutputType2["SIMULATION_STEP"] = "simulation-step";
    WorkerOutputType2["SIMULATION_PROGRESS"] = "simulation-progress";
    WorkerOutputType2["SIMULATION_END"] = "simulation-end";
    WorkerOutputType2["SIMULATION_TICK"] = "simulation-tick";
    WorkerOutputType2["NODE_DRAG"] = "node-drag";
    WorkerOutputType2["NODE_DRAG_END"] = "node-drag-end";
    WorkerOutputType2["SETTINGS_UPDATE"] = "settings-update";
  })(WorkerOutputType || (WorkerOutputType = {}));

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/types/web-worker-simulator/message/input-dispatch.js
  function dispatchLayoutInput(target, message) {
    switch (message.type) {
      case WorkerInputType.SetupData:
        target.setupData(message.data);
        break;
      case WorkerInputType.MergeData:
        target.mergeData(message.data);
        break;
      case WorkerInputType.UpdateData:
        target.updateData(message.data);
        break;
      case WorkerInputType.DeleteData:
        target.deleteData(message.data);
        break;
      case WorkerInputType.PatchData:
        target.patchData(message.data);
        break;
      case WorkerInputType.ClearData:
        target.clearData();
        break;
      case WorkerInputType.ActivateSimulation:
        target.activateSimulation();
        break;
      case WorkerInputType.StopSimulation:
        target.stopSimulation();
        break;
      case WorkerInputType.StartDragNode:
        target.startDragNode();
        break;
      case WorkerInputType.DragNode:
        target.dragNode(message.data.id, { x: message.data.x, y: message.data.y });
        break;
      case WorkerInputType.EndDragNode:
        target.endDragNode(message.data.id);
        break;
      case WorkerInputType.FixNodes:
        target.fixNodes(message.data.nodes);
        break;
      case WorkerInputType.ReleaseNodes:
        target.releaseNodes(message.data.nodes);
        break;
      default:
        break;
    }
  }

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/types/web-worker-simulator/simulator.worker.inline.js
  var simulator_worker_inline_default = '"use strict";(()=>{function Ee(n,r){var e,t=1;n==null&&(n=0),r==null&&(r=0);function i(){var o,s=e.length,a,u=0,l=0;for(o=0;o<s;++o)a=e[o],u+=a.x,l+=a.y;for(u=(u/s-n)*t,l=(l/s-r)*t,o=0;o<s;++o)a=e[o],a.x-=u,a.y-=l}return i.initialize=function(o){e=o},i.x=function(o){return arguments.length?(n=+o,i):n},i.y=function(o){return arguments.length?(r=+o,i):r},i.strength=function(o){return arguments.length?(t=+o,i):t},i}function We(n){let r=+this._x.call(null,n),e=+this._y.call(null,n);return Ce(this.cover(r,e),r,e,n)}function Ce(n,r,e,t){if(isNaN(r)||isNaN(e))return n;var i,o=n._root,s={data:t},a=n._x0,u=n._y0,l=n._x1,c=n._y1,_,m,d,g,f,h,p,y;if(!o)return n._root=s,n;for(;o.length;)if((f=r>=(_=(a+l)/2))?a=_:l=_,(h=e>=(m=(u+c)/2))?u=m:c=m,i=o,!(o=o[p=h<<1|f]))return i[p]=s,n;if(d=+n._x.call(null,o.data),g=+n._y.call(null,o.data),r===d&&e===g)return s.next=o,i?i[p]=s:n._root=s,n;do i=i?i[p]=new Array(4):n._root=new Array(4),(f=r>=(_=(a+l)/2))?a=_:l=_,(h=e>=(m=(u+c)/2))?u=m:c=m;while((p=h<<1|f)===(y=(g>=m)<<1|d>=_));return i[y]=o,i[p]=s,n}function Be(n){var r,e,t=n.length,i,o,s=new Array(t),a=new Array(t),u=1/0,l=1/0,c=-1/0,_=-1/0;for(e=0;e<t;++e)isNaN(i=+this._x.call(null,r=n[e]))||isNaN(o=+this._y.call(null,r))||(s[e]=i,a[e]=o,i<u&&(u=i),i>c&&(c=i),o<l&&(l=o),o>_&&(_=o));if(u>c||l>_)return this;for(this.cover(u,l).cover(c,_),e=0;e<t;++e)Ce(this,s[e],a[e],n[e]);return this}function Ke(n,r){if(isNaN(n=+n)||isNaN(r=+r))return this;var e=this._x0,t=this._y0,i=this._x1,o=this._y1;if(isNaN(e))i=(e=Math.floor(n))+1,o=(t=Math.floor(r))+1;else{for(var s=i-e||1,a=this._root,u,l;e>n||n>=i||t>r||r>=o;)switch(l=(r<t)<<1|n<e,u=new Array(4),u[l]=a,a=u,s*=2,l){case 0:i=e+s,o=t+s;break;case 1:e=i-s,o=t+s;break;case 2:i=e+s,t=o-s;break;case 3:e=i-s,t=o-s;break}this._root&&this._root.length&&(this._root=a)}return this._x0=e,this._y0=t,this._x1=i,this._y1=o,this}function ze(){var n=[];return this.visit(function(r){if(!r.length)do n.push(r.data);while(r=r.next)}),n}function je(n){return arguments.length?this.cover(+n[0][0],+n[0][1]).cover(+n[1][0],+n[1][1]):isNaN(this._x0)?void 0:[[this._x0,this._y0],[this._x1,this._y1]]}function R(n,r,e,t,i){this.node=n,this.x0=r,this.y0=e,this.x1=t,this.y1=i}function Xe(n,r,e){var t,i=this._x0,o=this._y0,s,a,u,l,c=this._x1,_=this._y1,m=[],d=this._root,g,f;for(d&&m.push(new R(d,i,o,c,_)),e==null?e=1/0:(i=n-e,o=r-e,c=n+e,_=r+e,e*=e);g=m.pop();)if(!(!(d=g.node)||(s=g.x0)>c||(a=g.y0)>_||(u=g.x1)<i||(l=g.y1)<o))if(d.length){var h=(s+u)/2,p=(a+l)/2;m.push(new R(d[3],h,p,u,l),new R(d[2],s,p,h,l),new R(d[1],h,a,u,p),new R(d[0],s,a,h,p)),(f=(r>=p)<<1|n>=h)&&(g=m[m.length-1],m[m.length-1]=m[m.length-1-f],m[m.length-1-f]=g)}else{var y=n-+this._x.call(null,d.data),T=r-+this._y.call(null,d.data),x=y*y+T*T;if(x<e){var I=Math.sqrt(e=x);i=n-I,o=r-I,c=n+I,_=r+I,t=d.data}}return t}function Ye(n){if(isNaN(c=+this._x.call(null,n))||isNaN(_=+this._y.call(null,n)))return this;var r,e=this._root,t,i,o,s=this._x0,a=this._y0,u=this._x1,l=this._y1,c,_,m,d,g,f,h,p;if(!e)return this;if(e.length)for(;;){if((g=c>=(m=(s+u)/2))?s=m:u=m,(f=_>=(d=(a+l)/2))?a=d:l=d,r=e,!(e=e[h=f<<1|g]))return this;if(!e.length)break;(r[h+1&3]||r[h+2&3]||r[h+3&3])&&(t=r,p=h)}for(;e.data!==n;)if(i=e,!(e=e.next))return this;return(o=e.next)&&delete e.next,i?(o?i.next=o:delete i.next,this):r?(o?r[h]=o:delete r[h],(e=r[0]||r[1]||r[2]||r[3])&&e===(r[3]||r[2]||r[1]||r[0])&&!e.length&&(t?t[p]=e:this._root=e),this):(this._root=o,this)}function He(n){for(var r=0,e=n.length;r<e;++r)this.remove(n[r]);return this}function qe(){return this._root}function Ve(){var n=0;return this.visit(function(r){if(!r.length)do++n;while(r=r.next)}),n}function Qe(n){var r=[],e,t=this._root,i,o,s,a,u;for(t&&r.push(new R(t,this._x0,this._y0,this._x1,this._y1));e=r.pop();)if(!n(t=e.node,o=e.x0,s=e.y0,a=e.x1,u=e.y1)&&t.length){var l=(o+a)/2,c=(s+u)/2;(i=t[3])&&r.push(new R(i,l,c,a,u)),(i=t[2])&&r.push(new R(i,o,c,l,u)),(i=t[1])&&r.push(new R(i,l,s,a,c)),(i=t[0])&&r.push(new R(i,o,s,l,c))}return this}function Ze(n){var r=[],e=[],t;for(this._root&&r.push(new R(this._root,this._x0,this._y0,this._x1,this._y1));t=r.pop();){var i=t.node;if(i.length){var o,s=t.x0,a=t.y0,u=t.x1,l=t.y1,c=(s+u)/2,_=(a+l)/2;(o=i[0])&&r.push(new R(o,s,a,c,_)),(o=i[1])&&r.push(new R(o,c,a,u,_)),(o=i[2])&&r.push(new R(o,s,_,c,l)),(o=i[3])&&r.push(new R(o,c,_,u,l))}e.push(t)}for(;t=e.pop();)n(t.node,t.x0,t.y0,t.x1,t.y1);return this}function $e(n){return n[0]}function Je(n){return arguments.length?(this._x=n,this):this._x}function et(n){return n[1]}function tt(n){return arguments.length?(this._y=n,this):this._y}function Q(n,r,e){var t=new Ne(r??$e,e??et,NaN,NaN,NaN,NaN);return n==null?t:t.addAll(n)}function Ne(n,r,e,t,i,o){this._x=n,this._y=r,this._x0=e,this._y0=t,this._x1=i,this._y1=o,this._root=void 0}function it(n){for(var r={data:n.data},e=r;n=n.next;)e=e.next={data:n.data};return r}var F=Q.prototype=Ne.prototype;F.copy=function(){var n=new Ne(this._x,this._y,this._x0,this._y0,this._x1,this._y1),r=this._root,e,t;if(!r)return n;if(!r.length)return n._root=it(r),n;for(e=[{source:r,target:n._root=new Array(4)}];r=e.pop();)for(var i=0;i<4;++i)(t=r.source[i])&&(t.length?e.push({source:t,target:r.target[i]=new Array(4)}):r.target[i]=it(t));return n};F.add=We;F.addAll=Be;F.cover=Ke;F.data=ze;F.extent=je;F.find=Xe;F.remove=Ye;F.removeAll=He;F.root=qe;F.size=Ve;F.visit=Qe;F.visitAfter=Ze;F.x=Je;F.y=tt;function O(n){return function(){return n}}function k(n){return(n()-.5)*1e-6}function Pt(n){return n.x+n.vx}function Lt(n){return n.y+n.vy}function be(n){var r,e,t,i=1,o=1;typeof n!="function"&&(n=O(n==null?1:+n));function s(){for(var l,c=r.length,_,m,d,g,f,h,p=0;p<o;++p)for(_=Q(r,Pt,Lt).visitAfter(a),l=0;l<c;++l)m=r[l],f=e[m.index],h=f*f,d=m.x+m.vx,g=m.y+m.vy,_.visit(y);function y(T,x,I,E,P){var D=T.data,N=T.r,b=f+N;if(D){if(D.index>m.index){var M=d-D.x-D.vx,v=g-D.y-D.vy,S=M*M+v*v;S<b*b&&(M===0&&(M=k(t),S+=M*M),v===0&&(v=k(t),S+=v*v),S=(b-(S=Math.sqrt(S)))/S*i,m.vx+=(M*=S)*(b=(N*=N)/(h+N)),m.vy+=(v*=S)*b,D.vx-=M*(b=1-b),D.vy-=v*b)}return}return x>d+b||E<d-b||I>g+b||P<g-b}}function a(l){if(l.data)return l.r=e[l.data.index];for(var c=l.r=0;c<4;++c)l[c]&&l[c].r>l.r&&(l.r=l[c].r)}function u(){if(r){var l,c=r.length,_;for(e=new Array(c),l=0;l<c;++l)_=r[l],e[_.index]=+n(_,l,r)}}return s.initialize=function(l,c){r=l,t=c,u()},s.iterations=function(l){return arguments.length?(o=+l,s):o},s.strength=function(l){return arguments.length?(i=+l,s):i},s.radius=function(l){return arguments.length?(n=typeof l=="function"?l:O(+l),u(),s):n},s}function Ot(n){return n.index}function nt(n,r){var e=n.get(r);if(!e)throw new Error("node not found: "+r);return e}function De(n){var r=Ot,e=_,t,i=O(30),o,s,a,u,l,c=1;n==null&&(n=[]);function _(h){return 1/Math.min(a[h.source.index],a[h.target.index])}function m(h){for(var p=0,y=n.length;p<c;++p)for(var T=0,x,I,E,P,D,N,b;T<y;++T)x=n[T],I=x.source,E=x.target,P=E.x+E.vx-I.x-I.vx||k(l),D=E.y+E.vy-I.y-I.vy||k(l),N=Math.sqrt(P*P+D*D),N=(N-o[T])/N*h*t[T],P*=N,D*=N,E.vx-=P*(b=u[T]),E.vy-=D*b,I.vx+=P*(b=1-b),I.vy+=D*b}function d(){if(s){var h,p=s.length,y=n.length,T=new Map(s.map((I,E)=>[r(I,E,s),I])),x;for(h=0,a=new Array(p);h<y;++h)x=n[h],x.index=h,typeof x.source!="object"&&(x.source=nt(T,x.source)),typeof x.target!="object"&&(x.target=nt(T,x.target)),a[x.source.index]=(a[x.source.index]||0)+1,a[x.target.index]=(a[x.target.index]||0)+1;for(h=0,u=new Array(y);h<y;++h)x=n[h],u[h]=a[x.source.index]/(a[x.source.index]+a[x.target.index]);t=new Array(y),g(),o=new Array(y),f()}}function g(){if(s)for(var h=0,p=n.length;h<p;++h)t[h]=+e(n[h],h,n)}function f(){if(s)for(var h=0,p=n.length;h<p;++h)o[h]=+i(n[h],h,n)}return m.initialize=function(h,p){s=h,l=p,d()},m.links=function(h){return arguments.length?(n=h,d(),m):n},m.id=function(h){return arguments.length?(r=h,m):r},m.iterations=function(h){return arguments.length?(c=+h,m):c},m.strength=function(h){return arguments.length?(e=typeof h=="function"?h:O(+h),g(),m):e},m.distance=function(h){return arguments.length?(i=typeof h=="function"?h:O(+h),f(),m):i},m}var Mt={value:()=>{}};function rt(){for(var n=0,r=arguments.length,e={},t;n<r;++n){if(!(t=arguments[n]+"")||t in e||/[\\s.]/.test(t))throw new Error("illegal type: "+t);e[t]=[]}return new le(e)}function le(n){this._=n}function Rt(n,r){return n.trim().split(/^|\\s+/).map(function(e){var t="",i=e.indexOf(".");if(i>=0&&(t=e.slice(i+1),e=e.slice(0,i)),e&&!r.hasOwnProperty(e))throw new Error("unknown type: "+e);return{type:e,name:t}})}le.prototype=rt.prototype={constructor:le,on:function(n,r){var e=this._,t=Rt(n+"",e),i,o=-1,s=t.length;if(arguments.length<2){for(;++o<s;)if((i=(n=t[o]).type)&&(i=wt(e[i],n.name)))return i;return}if(r!=null&&typeof r!="function")throw new Error("invalid callback: "+r);for(;++o<s;)if(i=(n=t[o]).type)e[i]=ot(e[i],n.name,r);else if(r==null)for(i in e)e[i]=ot(e[i],n.name,null);return this},copy:function(){var n={},r=this._;for(var e in r)n[e]=r[e].slice();return new le(n)},call:function(n,r){if((i=arguments.length-2)>0)for(var e=new Array(i),t=0,i,o;t<i;++t)e[t]=arguments[t+2];if(!this._.hasOwnProperty(n))throw new Error("unknown type: "+n);for(o=this._[n],t=0,i=o.length;t<i;++t)o[t].value.apply(r,e)},apply:function(n,r,e){if(!this._.hasOwnProperty(n))throw new Error("unknown type: "+n);for(var t=this._[n],i=0,o=t.length;i<o;++i)t[i].value.apply(r,e)}};function wt(n,r){for(var e=0,t=n.length,i;e<t;++e)if((i=n[e]).name===r)return i.value}function ot(n,r,e){for(var t=0,i=n.length;t<i;++t)if(n[t].name===r){n[t]=Mt,n=n.slice(0,t).concat(n.slice(t+1));break}return e!=null&&n.push({name:r,value:e}),n}var Ae=rt;var J=0,ie=0,te=0,at=1e3,ue,ne,de=0,Z=0,ce=0,oe=typeof performance=="object"&&performance.now?performance:Date,lt=typeof window=="object"&&window.requestAnimationFrame?window.requestAnimationFrame.bind(window):function(n){setTimeout(n,17)};function Oe(){return Z||(lt(Ut),Z=oe.now()+ce)}function Ut(){Z=0}function Pe(){this._call=this._time=this._next=null}Pe.prototype=he.prototype={constructor:Pe,restart:function(n,r,e){if(typeof n!="function")throw new TypeError("callback is not a function");e=(e==null?Oe():+e)+(r==null?0:+r),!this._next&&ne!==this&&(ne?ne._next=this:ue=this,ne=this),this._call=n,this._time=e,Le()},stop:function(){this._call&&(this._call=null,this._time=1/0,Le())}};function he(n,r,e){var t=new Pe;return t.restart(n,r,e),t}function ut(){Oe(),++J;for(var n=ue,r;n;)(r=Z-n._time)>=0&&n._call.call(void 0,r),n=n._next;--J}function st(){Z=(de=oe.now())+ce,J=ie=0;try{ut()}finally{J=0,Gt(),Z=0}}function Ft(){var n=oe.now(),r=n-de;r>at&&(ce-=r,de=n)}function Gt(){for(var n,r=ue,e,t=1/0;r;)r._call?(t>r._time&&(t=r._time),n=r,r=r._next):(e=r._next,r._next=null,r=n?n._next=e:ue=e);ne=n,Le(t)}function Le(n){if(!J){ie&&(ie=clearTimeout(ie));var r=n-Z;r>24?(n<1/0&&(ie=setTimeout(st,n-oe.now()-ce)),te&&(te=clearInterval(te))):(te||(de=oe.now(),te=setInterval(Ft,at)),J=1,lt(st))}}function dt(){let n=1;return()=>(n=(1664525*n+1013904223)%4294967296)/4294967296}function ct(n){return n.x}function ht(n){return n.y}var kt=10,Wt=Math.PI*(3-Math.sqrt(5));function Me(n){var r,e=1,t=.001,i=1-Math.pow(t,1/300),o=0,s=.6,a=new Map,u=he(_),l=Ae("tick","end"),c=dt();n==null&&(n=[]);function _(){m(),l.call("tick",r),e<t&&(u.stop(),l.call("end",r))}function m(f){var h,p=n.length,y;f===void 0&&(f=1);for(var T=0;T<f;++T)for(e+=(o-e)*i,a.forEach(function(x){x(e)}),h=0;h<p;++h)y=n[h],y.fx==null?y.x+=y.vx*=s:(y.x=y.fx,y.vx=0),y.fy==null?y.y+=y.vy*=s:(y.y=y.fy,y.vy=0);return r}function d(){for(var f=0,h=n.length,p;f<h;++f){if(p=n[f],p.index=f,p.fx!=null&&(p.x=p.fx),p.fy!=null&&(p.y=p.fy),isNaN(p.x)||isNaN(p.y)){var y=kt*Math.sqrt(.5+f),T=f*Wt;p.x=y*Math.cos(T),p.y=y*Math.sin(T)}(isNaN(p.vx)||isNaN(p.vy))&&(p.vx=p.vy=0)}}function g(f){return f.initialize&&f.initialize(n,c),f}return d(),r={tick:m,restart:function(){return u.restart(_),r},stop:function(){return u.stop(),r},nodes:function(f){return arguments.length?(n=f,d(),a.forEach(g),r):n},alpha:function(f){return arguments.length?(e=+f,r):e},alphaMin:function(f){return arguments.length?(t=+f,r):t},alphaDecay:function(f){return arguments.length?(i=+f,r):+i},alphaTarget:function(f){return arguments.length?(o=+f,r):o},velocityDecay:function(f){return arguments.length?(s=1-f,r):1-s},randomSource:function(f){return arguments.length?(c=f,a.forEach(g),r):c},force:function(f,h){return arguments.length>1?(h==null?a.delete(f):a.set(f,g(h)),r):a.get(f)},find:function(f,h,p){var y=0,T=n.length,x,I,E,P,D;for(p==null?p=1/0:p*=p,y=0;y<T;++y)P=n[y],x=f-P.x,I=h-P.y,E=x*x+I*I,E<p&&(D=P,p=E);return D},on:function(f,h){return arguments.length>1?(l.on(f,h),r):l.on(f)}}}function Re(){var n,r,e,t,i=O(-30),o,s=1,a=1/0,u=.81;function l(d){var g,f=n.length,h=Q(n,ct,ht).visitAfter(_);for(t=d,g=0;g<f;++g)r=n[g],h.visit(m)}function c(){if(n){var d,g=n.length,f;for(o=new Array(g),d=0;d<g;++d)f=n[d],o[f.index]=+i(f,d,n)}}function _(d){var g=0,f,h,p=0,y,T,x;if(d.length){for(y=T=x=0;x<4;++x)(f=d[x])&&(h=Math.abs(f.value))&&(g+=f.value,p+=h,y+=h*f.x,T+=h*f.y);d.x=y/p,d.y=T/p}else{f=d,f.x=f.data.x,f.y=f.data.y;do g+=o[f.data.index];while(f=f.next)}d.value=g}function m(d,g,f,h){if(!d.value)return!0;var p=d.x-r.x,y=d.y-r.y,T=h-g,x=p*p+y*y;if(T*T/u<x)return x<a&&(p===0&&(p=k(e),x+=p*p),y===0&&(y=k(e),x+=y*y),x<s&&(x=Math.sqrt(s*x)),r.vx+=p*d.value*t/x,r.vy+=y*d.value*t/x),!0;if(d.length||x>=a)return;(d.data!==r||d.next)&&(p===0&&(p=k(e),x+=p*p),y===0&&(y=k(e),x+=y*y),x<s&&(x=Math.sqrt(s*x)));do d.data!==r&&(T=o[d.data.index]*t/x,r.vx+=p*T,r.vy+=y*T);while(d=d.next)}return l.initialize=function(d,g){n=d,e=g,c()},l.strength=function(d){return arguments.length?(i=typeof d=="function"?d:O(+d),c(),l):i},l.distanceMin=function(d){return arguments.length?(s=d*d,l):Math.sqrt(s)},l.distanceMax=function(d){return arguments.length?(a=d*d,l):Math.sqrt(a)},l.theta=function(d){return arguments.length?(u=d*d,l):Math.sqrt(u)},l}function we(n){var r=O(.1),e,t,i;typeof n!="function"&&(n=O(n==null?0:+n));function o(a){for(var u=0,l=e.length,c;u<l;++u)c=e[u],c.vx+=(i[u]-c.x)*t[u]*a}function s(){if(e){var a,u=e.length;for(t=new Array(u),i=new Array(u),a=0;a<u;++a)t[a]=isNaN(i[a]=+n(e[a],a,e))?0:+r(e[a],a,e)}}return o.initialize=function(a){e=a,s()},o.strength=function(a){return arguments.length?(r=typeof a=="function"?a:O(+a),s(),o):r},o.x=function(a){return arguments.length?(n=typeof a=="function"?a:O(+a),s(),o):n},o}function Ue(n){var r=O(.1),e,t,i;typeof n!="function"&&(n=O(n==null?0:+n));function o(a){for(var u=0,l=e.length,c;u<l;++u)c=e[u],c.vy+=(i[u]-c.y)*t[u]*a}function s(){if(e){var a,u=e.length;for(t=new Array(u),i=new Array(u),a=0;a<u;++a)t[a]=isNaN(i[a]=+n(e[a],a,e))?0:+r(e[a],a,e)}}return o.initialize=function(a){e=a,s()},o.strength=function(a){return arguments.length?(r=typeof a=="function"?a:O(+a),s(),o):r},o.y=function(a){return arguments.length?(n=typeof a=="function"?a:O(+a),s(),o):n},o}var fe=n=>n instanceof Date,pe=n=>Array.isArray(n),me=n=>n!==null&&typeof n=="object"&&n.constructor.name==="Object";var C=n=>fe(n)?Ct(n):pe(n)?Bt(n):me(n)?Kt(n):n,j=(n,r)=>{let e=fe(n),t=fe(r);if(e&&!t||!e&&t)return!1;if(e&&t)return n.getTime()===r.getTime();let i=pe(n),o=pe(r);if(i&&!o||!i&&o)return!1;if(i&&o)return n.length!==r.length?!1:n.every((u,l)=>j(u,r[l]));let s=me(n),a=me(r);if(s&&!a||!s&&a)return!1;if(s&&a){let u=Object.keys(n),l=Object.keys(r);return j(u,l)?u.every(c=>j(n[c],r[c])):!1}return n===r},Ct=n=>new Date(n),Bt=n=>n.map(r=>C(r)),Kt=n=>{let r={};return Object.keys(n).forEach(e=>{r[e]=C(n[e])}),r};var pt={radius:100,centerX:0,centerY:0},zt=100,ft=50,Fe=n=>(n>0?n:1)*zt,ee={useGPU:!1,isSimulatingOnDataUpdate:!0,isSimulatingOnSettingsUpdate:!0,isSimulatingOnUnstick:!0,isPhysicsEnabled:!1,alpha:{alpha:1,alphaMin:.05,alphaDecay:.028,alphaTarget:0},centering:{x:0,y:0,strength:1},collision:{radius:15,strength:1,iterations:1},links:{distance:ft,strength:1,iterations:1},manyBody:{strength:-100,theta:.9,distanceMin:1,distanceMax:Fe(ft)},positioning:{forceX:{x:0,strength:.1},forceY:{y:0,strength:.1}},anchorX:"center",anchorY:"center"},mt={rowGap:50,colGap:50},gt={nodeGap:50,levelGap:50,treeGap:100,orientation:"vertical",reversed:!1};var ge=class{constructor(){this._listeners=new Map}once(r,e){let t={callable:e,isOnce:!0},i=this._listeners.get(r);return i?i.push(t):this._listeners.set(r,[t]),this}on(r,e){let t={callable:e},i=this._listeners.get(r);return i?i.push(t):this._listeners.set(r,[t]),this}off(r,e){let t=this._listeners.get(r);if(t){let i=t.filter(o=>o.callable!==e);this._listeners.set(r,i)}return this}emit(r,e){let t=this._listeners.get(r);if(!t||t.length===0)return!1;let i=!1;for(let o=0;o<t.length;o++)t[o].isOnce&&(i=!0),t[o].callable(e);if(i){let o=t.filter(s=>!s.isOnce);this._listeners.set(r,o)}return!0}eventNames(){return[...this._listeners.keys()]}listenerCount(r){let e=this._listeners.get(r);return e?e.length:0}listeners(r){let e=this._listeners.get(r);return e?e.map(t=>t.callable):[]}addListener(r,e){return this.on(r,e)}removeListener(r,e){return this.off(r,e)}removeAllListeners(r){return r?this._listeners.delete(r):this._listeners.clear(),this}};var Y=class extends ge{constructor(){super(...arguments);this._nodes=[];this._edges=[];this._nodeIndexByNodeId={};this._cancelSimulation=!1;this._schedulerPort=null}terminate(){this._cancelSimulation=!0,this._schedulerPort?.close(),this._schedulerPort=null,this.removeAllListeners()}_scheduleNext(e){if(typeof MessageChannel<"u"){let t=new MessageChannel;this._schedulerPort=t.port2,t.port1.onmessage=()=>{this._schedulerPort=null,e()},t.port2.postMessage(null)}else setTimeout(e,0)}_rebuildNodeIndex(){this._nodeIndexByNodeId={};for(let e=0;e<this._nodes.length;e++)this._nodeIndexByNodeId[this._nodes[e].id]=e}};var jt=500,Xt=100;function Yt(n,r,e){let t=[],i=r*r;function o(s){let a=e();for(let u=0;u<a.length;u++){let l=a[u].source,c=a[u].target;if(!l||!c)continue;let _=((l.x??0)+(c.x??0))*.5,m=((l.y??0)+(c.y??0))*.5;for(let d=0;d<t.length;d++){let g=t[d],f=(g.x??0)-_,h=(g.y??0)-m,p=f*f+h*h;if(p===0||p>=i)continue;p<1&&(p=1);let y=-n*s/p;g.vx+=f*y,g.vy+=h*y}}}return o.initialize=s=>{t=s},o}var re=class extends Y{constructor(e){super();this._isDragging=!1;this._isStabilizing=!1;this.type="force";this._settings={...ee,...e},this.clearData()}setSettings(e){let t=e;this._initialSettings||(this._initialSettings=Object.assign(C(ee),t));let i=C(this._settings);if(Object.assign(this._settings,t),j(this._settings,i))return;this._applySettingsToSimulation(t),this.emit("settings-update",{settings:{type:"force",options:this._settings}}),i.isPhysicsEnabled&&!t.isPhysicsEnabled?this._simulation.stop():this._settings.isSimulatingOnSettingsUpdate&&this._nodes.length>0&&this.activateSimulation()}setupData(e){this.clearData(),this._initializeNewData(e),this._settings.isSimulatingOnDataUpdate&&(this._updateSimulationData(),this._runSimulation())}mergeData(e){this._initializeNewData(e),this._settings.isPhysicsEnabled||this._pinNodes(),this._settings.isSimulatingOnDataUpdate&&(this._updateSimulationData(),this.activateSimulation())}updateData(e){let t=new Set(e.nodes.map(s=>s.id)),i=this._nodes.filter(s=>t.has(s.id)),o=e.nodes.filter(s=>this._nodeIndexByNodeId[s.id]===void 0);this._nodes=[...i,...o],this._rebuildNodeIndex(),this._edges=e.edges,this._settings.isSimulatingOnSettingsUpdate&&(this._updateSimulationData(),this.activateSimulation())}deleteData(e){if(e.nodeIds){let t=new Set(e.nodeIds);this._nodes=this._nodes.filter(i=>!t.has(i.id))}if(e.edgeIds){let t=new Set(e.edgeIds);this._edges=this._edges.filter(i=>!t.has(i.id))}this._rebuildNodeIndex(),this._settings.isSimulatingOnDataUpdate&&(this._updateSimulationData(),this.activateSimulation())}patchData(e){if(e.nodes){let t={};for(let i=0;i<this._nodes.length;i++)t[this._nodes[i].id]=i;for(let i=0;i<e.nodes.length;i+=1){let o=e.nodes[i].id;if(o in t){let s=t[o];this._nodeIndexByNodeId[o]=s,this._nodes[s]=e.nodes[i]}else this._nodes.push(e.nodes[i])}}if(e.edges){let t={};for(let i=0;i<this._edges.length;i++)t[this._edges[i].id]=i;for(let i=0;i<e.edges.length;i++){let o=e.edges[i].id;o in t?this._edges[t[o]]=e.edges[i]:this._edges.push(e.edges[i])}}}clearData(){this._nodes=[],this._edges=[],this._rebuildNodeIndex(),this._resetSimulation()}activateSimulation(){this._settings.isPhysicsEnabled?this._unpinNodes():this._pinNodes(),this._simulation.alpha(this._settings.alpha.alpha).alphaTarget(this._settings.alpha.alphaTarget).restart()}stopSimulation(){this._simulation.stop()}startDragNode(){this._isDragging=!0,!this._isStabilizing&&this._settings.isPhysicsEnabled&&this.activateSimulation()}dragNode(e,t){let i=this._nodes[this._nodeIndexByNodeId[e]];i&&(this._isDragging||this.startDragNode(),i.fx=t.x,i.fy=t.y,this._settings.isPhysicsEnabled||(i.x=t.x,i.y=t.y),this.emit("node-drag",{nodes:this._nodes,edges:this._edges}))}endDragNode(e){this._isDragging=!1,this._settings.isPhysicsEnabled&&this._simulation.alphaTarget(0);let t=this._nodes[this._nodeIndexByNodeId[e]];t&&this._settings.isPhysicsEnabled&&this._unpinNode(t)}fixNodes(e){e||(e=this._nodes);for(let t=0;t<e.length;t++)this._stickNode(e[t])}releaseNodes(e){e||(e=this._nodes);for(let t=0;t<e.length;t++)this._unstickNode(e[t]);this._settings.isSimulatingOnUnstick&&this._nodes.length>0&&this.activateSimulation()}terminate(){super.terminate(),this._simulation?.stop()}_resetSimulation(){this._simulation&&(this._simulation.stop(),this._simulation.on("tick",null).on("end",null)),this._linkForce=De(this._edges).id(e=>e.id),this._simulation=Me(this._nodes).force("link",this._linkForce).stop(),this._applySettingsToSimulation(this._settings),this._simulation.on("tick",()=>{this.emit("simulation-step",{nodes:this._nodes,edges:this._edges})}),this._simulation.on("end",()=>{this._isDragging=!1,this._isStabilizing=!1,this.emit("simulation-end",{nodes:this._nodes,edges:this._edges}),this._settings.isPhysicsEnabled||this._pinNodes()})}_runSimulation(e){if(this._isStabilizing||this._cancelSimulation)return;(this._settings.isPhysicsEnabled||e?.isUpdatingSettings)&&this._unpinNodes(),this.emit("simulation-start",void 0),this._isStabilizing=!0,this._simulation.alpha(this._settings.alpha.alpha).alphaTarget(this._settings.alpha.alphaTarget).stop();let t=Math.min(jt,Math.ceil(Math.log(this._settings.alpha.alphaMin)/Math.log(1-this._settings.alpha.alphaDecay))),i=-1,o=0,s=()=>{if(this._cancelSimulation){this._isStabilizing=!1,this._cancelSimulation=!1;return}let a=Math.min(o+Xt,t);for(;o<a;o++){this._simulation.tick();let u=Math.round(o*100/t);u>i&&(i=u,this.emit("simulation-progress",{nodes:this._nodes,edges:this._edges,progress:u/100}))}o<t&&!this._cancelSimulation?this._scheduleNext(s):(this._settings.isPhysicsEnabled||this._pinNodes(),this._isStabilizing=!1,this._cancelSimulation=!1,this.emit("simulation-end",{nodes:this._nodes,edges:this._edges}))};s()}_updateSimulationData(){this._simulation.nodes(this._nodes),this._linkForce.links(this._edges)}_initializeNewData(e){if(e.nodes)for(let t=0;t<e.nodes.length;t+=1){let i=e.nodes[t].id;this._nodeIndexByNodeId[i]!==void 0?this._nodeIndexByNodeId[i]=t:this._nodes.push(e.nodes[t])}else this._nodes=[];if(e.edges){let t={};for(let i=0;i<this._edges.length;i++)t[this._edges[i].id]=i;for(let i=0;i<e.edges.length;i++){let o=e.edges[i].id;o in t?this._edges[t[o]]=e.edges[i]:this._edges.push(e.edges[i])}}else this._edges=[];this._rebuildNodeIndex()}_pinNodes(e){e||(e=this._nodes);for(let t=0;t<e.length;t++)this._pinNode(this._nodes[t])}_unpinNodes(e){e||(e=this._nodes);for(let t=0;t<e.length;t++)this._unpinNode(this._nodes[t])}_pinNode(e){(e.sx===null||e.sx===void 0)&&(e.fx=e.x),(e.sy===null||e.sy===void 0)&&(e.fy=e.y)}_unpinNode(e){(e.sx===null||e.sx===void 0)&&(e.fx=null),(e.sy===null||e.sy===void 0)&&(e.fy=null)}_stickNode(e){e.sx=e.x,e.fx=e.x,e.sy=e.y,e.fy=e.y}_unstickNode(e){e.sx=null,e.sy=null,this._settings.isPhysicsEnabled&&(e.fx=null,e.fy=null)}_applySettingsToSimulation(e){if(e.alpha&&this._simulation.alpha(e.alpha.alpha).alphaMin(e.alpha.alphaMin).alphaDecay(e.alpha.alphaDecay).alphaTarget(e.alpha.alphaTarget),e.links&&this._linkForce.distance(e.links.distance).iterations(e.links.iterations),e.collision){let t=be().radius(e.collision.radius).strength(e.collision.strength).iterations(e.collision.iterations);this._simulation.force("collide",t)}if(e.collision===null&&this._simulation.force("collide",null),e.manyBody){let t=Re().strength(e.manyBody.strength).theta(e.manyBody.theta).distanceMin(e.manyBody.distanceMin).distanceMax(e.manyBody.distanceMax);this._simulation.force("charge",t),e.manyBody.edgeMidpointRepulsion?this._simulation.force("edgeMidpointRepulsion",Yt(e.manyBody.strength,e.manyBody.distanceMax,()=>this._edges)):this._simulation.force("edgeMidpointRepulsion",null)}if(e.manyBody===null&&(this._simulation.force("charge",null),this._simulation.force("edgeMidpointRepulsion",null)),e.positioning?.forceX){let t=we(e.positioning.forceX.x).strength(e.positioning.forceX.strength);this._simulation.force("x",t)}if(e.positioning?.forceX===null&&this._simulation.force("x",null),e.positioning?.forceY){let t=Ue(e.positioning.forceY.y).strength(e.positioning.forceY.strength);this._simulation.force("y",t)}if(e.positioning?.forceY===null&&this._simulation.force("y",null),e.centering){let t=Ee(e.centering.x,e.centering.y).strength(e.centering.strength);this._simulation.force("center",t)}e.centering===null&&this._simulation.force("center",null)}};var B=class extends Error{constructor(r){super(r),this.message=r,Object.setPrototypeOf(this,new.target.prototype),this.name=this.constructor.name}};var ke=(n,r,e)=>{let t=n.createShader(e==="vertex"?n.VERTEX_SHADER:n.FRAGMENT_SHADER);if(!t)throw new B("Failed to create shader.");if(n.shaderSource(t,r),n.compileShader(t),!n.getShaderParameter(t,n.COMPILE_STATUS)){let i=n.getShaderInfoLog(t);throw n.deleteShader(t),new B(`Failed to compile shader: ${i}`)}return t};var _t=`#version 300 es\n\nin vec2 aPosition;\n\nvoid main() {\n  gl_Position = vec4(aPosition, 0.0, 1.0);\n}\n`;var yt=`#version 300 es\n\nprecision highp float;\n\nuniform sampler2D uState;\nuniform sampler2D uFixed;\nuniform sampler2D uTreeData;\nuniform sampler2D uTreeChildren;\nuniform sampler2D uTreeGeometry;\nuniform sampler2D uAdjOffsets;\nuniform sampler2D uAdjEdges;\n\nuniform int uNodeCount;\nuniform int uTexWidth;\nuniform float uAlpha;\nuniform float uDamping;\n\nuniform float uManyBodyStrength;\nuniform float uTheta2;\nuniform float uDistanceMin2;\nuniform float uDistanceMax2;\nuniform int uTreeNodeCount;\nuniform int uTreeTexWidth;\n\nuniform int uAdjOffsetsTexWidth;\nuniform int uAdjEdgesTexWidth;\n\nuniform vec2 uCenter;\nuniform float uCenterStrength;\n\nuniform float uCollisionRadius;\nuniform float uCollisionStrength;\n\nuniform float uForceXTarget;\nuniform float uForceXStrength;\nuniform float uForceYTarget;\nuniform float uForceYStrength;\n\nuniform float uHasManyBody;\nuniform float uHasLinks;\nuniform float uHasCentering;\nuniform float uHasCollision;\nuniform float uHasPositioning;\n\nout vec4 fragColor;\n\nivec2 texCoord(int idx, int tw) {\n  return ivec2(idx % tw, idx / tw);\n}\n\nvoid main() {\n  ivec2 fc = ivec2(gl_FragCoord.xy);\n  int nodeId = fc.y * uTexWidth + fc.x;\n\n  if (nodeId >= uNodeCount) {\n    fragColor = vec4(0.0);\n    return;\n  }\n\n  vec4 fixedData = texelFetch(uFixed, fc, 0);\n  if (fixedData.x > 0.5) {\n    fragColor = vec4(fixedData.yz, 0.0, 0.0);\n    return;\n  }\n\n  vec4 state = texelFetch(uState, fc, 0);\n  vec2 pos = state.xy;\n  vec2 vel = state.zw;\n\n  if (uHasManyBody > 0.5 && uTreeNodeCount > 0) {\n    int stack[128];\n    int top = 0;\n    stack[top++] = 0;\n\n    while (top > 0) {\n      int idx = stack[--top];\n      vec4 data = texelFetch(uTreeData, texCoord(idx, uTreeTexWidth), 0);\n      float w = data.w;\n\n      if (w < -0.5) {\n        int bodyIdx = int(-w - 0.5);\n        if (bodyIdx != nodeId) {\n          vec2 delta = data.xy - pos;\n          float distSq = dot(delta, delta);\n\n          if (distSq < 1e-8) {\n            delta = vec2(float(nodeId) * 1e-4 - float(bodyIdx) * 1e-4 + 1e-4, 1e-4);\n            distSq = dot(delta, delta);\n          }\n\n          if (distSq < uDistanceMax2) {\n            float l = distSq;\n            if (l < uDistanceMin2) l = sqrt(uDistanceMin2 * l);\n            vel += delta * (data.z * uAlpha / max(l, 1e-6));\n          }\n        }\n      } else {\n        vec2 delta = data.xy - pos;\n        float distSq = dot(delta, delta);\n\n        if (distSq > 0.0 && w * w / distSq < uTheta2) {\n          if (distSq < uDistanceMax2) {\n            float l = distSq;\n            if (l < uDistanceMin2) l = sqrt(uDistanceMin2 * l);\n            vel += delta * (data.z * uAlpha / max(l, 1e-6));\n          }\n        } else {\n          vec4 ch = texelFetch(uTreeChildren, texCoord(idx, uTreeTexWidth), 0);\n          if (ch.w >= 0.0 && top < 64) stack[top++] = int(ch.w + 0.5);\n          if (ch.z >= 0.0 && top < 64) stack[top++] = int(ch.z + 0.5);\n          if (ch.y >= 0.0 && top < 64) stack[top++] = int(ch.y + 0.5);\n          if (ch.x >= 0.0 && top < 64) stack[top++] = int(ch.x + 0.5);\n        }\n      }\n    }\n  }\n\n  if (uHasCollision > 0.5 && uCollisionRadius > 0.0 && uTreeNodeCount > 0) {\n    float collisionDiam = uCollisionRadius * 2.0;\n    vec2 predictedPos = state.xy + state.zw;\n    int stack[64];\n    int top = 0;\n    stack[top++] = 0;\n\n    while (top > 0) {\n      int idx = stack[--top];\n      vec4 data = texelFetch(uTreeData, texCoord(idx, uTreeTexWidth), 0);\n      float w = data.w;\n\n      if (w < -0.5) {\n        int bodyIdx = int(-w - 0.5);\n        if (bodyIdx != nodeId && bodyIdx < uNodeCount) {\n          vec2 delta = data.xy - predictedPos;\n          float dist = length(delta);\n\n          if (dist < collisionDiam && dist > 0.0) {\n            float push = (collisionDiam - dist) * uCollisionStrength;\n            vel -= (delta / dist) * push * 0.5;\n          }\n        }\n      } else {\n        vec4 geo = texelFetch(uTreeGeometry, texCoord(idx, uTreeTexWidth), 0);\n        float cellSize = geo.z;\n        vec2 nearest = clamp(predictedPos, geo.xy, geo.xy + cellSize);\n        float distToCell = length(nearest - predictedPos);\n\n        if (distToCell < collisionDiam) {\n          vec4 ch = texelFetch(uTreeChildren, texCoord(idx, uTreeTexWidth), 0);\n          if (ch.w >= 0.0 && top < 64) stack[top++] = int(ch.w + 0.5);\n          if (ch.z >= 0.0 && top < 64) stack[top++] = int(ch.z + 0.5);\n          if (ch.y >= 0.0 && top < 64) stack[top++] = int(ch.y + 0.5);\n          if (ch.x >= 0.0 && top < 64) stack[top++] = int(ch.x + 0.5);\n        }\n      }\n    }\n  }\n\n  if (uHasLinks > 0.5) {\n    vec4 offData = texelFetch(uAdjOffsets, texCoord(nodeId, uAdjOffsetsTexWidth), 0);\n    int start = int(offData.x + 0.5);\n    int count = int(offData.y + 0.5);\n\n    for (int e = 0; e < count; e++) {\n      vec4 edgeData = texelFetch(uAdjEdges, texCoord(start + e, uAdjEdgesTexWidth), 0);\n      int targetId = int(edgeData.x + 0.5);\n      float restDist = edgeData.y;\n      float strength = edgeData.z;\n      float dirBias = edgeData.w;\n\n      vec4 targetState = texelFetch(uState, texCoord(targetId, uTexWidth), 0);\n      vec2 delta = (targetState.xy + targetState.zw) - (state.xy + state.zw);\n      float d = length(delta);\n\n      if (d < 1e-6) {\n        delta = vec2(1e-3, 1e-3);\n        d = length(delta);\n      }\n\n      float scale = (d - restDist) / d * uAlpha * strength;\n      vel += delta * scale * dirBias;\n    }\n  }\n\n  if (uHasCentering > 0.5) {\n    vel += (uCenter - pos) * uCenterStrength * uAlpha;\n  }\n\n  if (uHasPositioning > 0.5) {\n    vel.x += (uForceXTarget - pos.x) * uForceXStrength * uAlpha;\n    vel.y += (uForceYTarget - pos.y) * uForceYStrength * uAlpha;\n  }\n\n  vel *= uDamping;\n  pos += vel;\n\n  fragColor = vec4(pos, vel);\n}\n`;function It(n,r){let e=n.length;if(e===0)return{treeData:new Float32Array(0),treeChildren:new Float32Array(0),treeGeometry:new Float32Array(0),nodeCount:0,texWidth:1};let t=1/0,i=1/0,o=-1/0,s=-1/0;for(let v=0;v<e;v++){let S=n[v].x,A=n[v].y;S<t&&(t=S),A<i&&(i=A),S>o&&(o=S),A>s&&(s=A)}let a=Math.max(o-t,s-i);a<1e-6&&(a=1),a*=1.01;let u=(t+o)*.5,l=(i+s)*.5,c=a*.5,_=u-c,m=l-c,d=[];function g(v){let S=d.length;return d.push({cx:0,cy:0,charge:0,size:v,bodyIndex:-1,children:[null,null,null,null]}),S}let f=g(a),h=[_],p=[m];function y(v,S,A,K,w){let U=A+w*.5,G=K+w*.5,X=v>=U?1:0;return(S>=G?1:0)*2+X}function T(v,S,A,K){let w=K*.5,U=v&1?S+w:S,G=v&2?A+w:A;return{cx0:U,cy0:G,csz:w}}function x(v,S,A){let K=f,w=_,U=m,G=a;for(let X=0;X<50;X++){let L=d[K];if(L.bodyIndex===-1&&L.children[0]===null&&L.children[1]===null&&L.children[2]===null&&L.children[3]===null){L.bodyIndex=v,L.cx=S,L.cy=A,L.charge=r;return}if(L.bodyIndex>=0){let ve=L.bodyIndex,se=L.cx,ae=L.cy;L.bodyIndex=-1;let W=y(se,ae,w,U,G),{cx0:bt,cy0:Dt,csz:At}=T(W,w,U,G),V=g(At);h[V]=bt,p[V]=Dt,L.children[W]=V,d[V].bodyIndex=ve,d[V].cx=se,d[V].cy=ae,d[V].charge=r}let z=y(S,A,w,U,G);if(L.children[z]===null){let{cx0:ve,cy0:se,csz:ae}=T(z,w,U,G),W=g(ae);h[W]=ve,p[W]=se,L.children[z]=W,d[W].bodyIndex=v,d[W].cx=S,d[W].cy=A,d[W].charge=r;return}let{cx0:vt,cy0:Et,csz:Nt}=T(z,w,U,G);K=L.children[z],w=vt,U=Et,G=Nt}}for(let v=0;v<e;v++)x(v,n[v].x,n[v].y);function I(v){let S=d[v];if(S.bodyIndex>=0)return;let A=0,K=0,w=0,U=0;for(let G=0;G<4;G++){let X=S.children[G];if(X===null)continue;I(X);let L=d[X],z=Math.abs(L.charge);A+=L.charge,K+=L.cx*z,w+=L.cy*z,U+=z}U>0&&(S.cx=K/U,S.cy=w/U),S.charge=A}I(f);let E=d.length,P=Math.ceil(Math.sqrt(E)),D=P*P,N=new Float32Array(D*4),b=new Float32Array(D*4),M=new Float32Array(D*4);for(let v=0;v<E;v++){let S=d[v],A=v*4;N[A]=S.cx,N[A+1]=S.cy,N[A+2]=S.charge,S.bodyIndex>=0?N[A+3]=-(S.bodyIndex+1):N[A+3]=S.size,b[A]=S.children[0]!==null?S.children[0]:-1,b[A+1]=S.children[1]!==null?S.children[1]:-1,b[A+2]=S.children[2]!==null?S.children[2]:-1,b[A+3]=S.children[3]!==null?S.children[3]:-1,M[A]=h[v]??0,M[A+1]=p[v]??0,M[A+2]=S.size,M[A+3]=0}for(let v=E;v<D;v++){let S=v*4;N[S+3]=0,b[S]=-1,b[S+1]=-1,b[S+2]=-1,b[S+3]=-1,M[S]=0,M[S+1]=0,M[S+2]=0,M[S+3]=0}return{treeData:N,treeChildren:b,treeGeometry:M,nodeCount:E,texWidth:P}}function xt(n,r,e,t){let i=n.length,o={};for(let I=0;I<i;I++)o[n[I].id]=I;let s=new Uint32Array(i),a=[];for(let I=0;I<r.length;I++){let E=r[I],P=typeof E.source=="object"?E.source.id:E.source,D=typeof E.target=="object"?E.target.id:E.target,N=o[P],b=o[D];N===void 0||b===void 0||(a.push({srcIdx:N,tgtIdx:b}),s[N]++,s[b]++)}let u=a.length*2,l=new Uint32Array(i),c=new Uint32Array(i),_=new Uint32Array(i);for(let{srcIdx:I,tgtIdx:E}of a)_[I]++,_[E]++;let m=0;for(let I=0;I<i;I++)c[I]=m,l[I]=_[I],m+=_[I];let d=new Float32Array(u*4),g=new Uint32Array(i);for(let I=0;I<i;I++)g[I]=c[I];for(let{srcIdx:I,tgtIdx:E}of a){let P=s[I]/(s[I]+s[E]),D=t!==void 0?t:1/Math.min(s[I],s[E]);{let N=g[I]*4;d[N]=E,d[N+1]=e,d[N+2]=D,d[N+3]=1-P,g[I]++}{let N=g[E]*4;d[N]=I,d[N+1]=e,d[N+2]=D,d[N+3]=P,g[E]++}}let f=Math.max(1,Math.ceil(Math.sqrt(i))),h=f*f,p=new Float32Array(h*4);for(let I=0;I<i;I++)p[I*4]=c[I],p[I*4+1]=l[I];let y=Math.max(1,Math.ceil(Math.sqrt(u))),T=y*y,x=new Float32Array(T*4);return x.set(d),{offsets:p,edges:x,offsetsTexWidth:f,edgesTexWidth:y}}var St=500,Ht=1,_e=class extends Y{constructor(e){super();this._isStabilizing=!1;this._isDragging=!1;this._dragLoopRunning=!1;this._pendingRestart=!1;this._simulationGeneration=0;this._currentAlpha=0;this._currentStep=0;this._totalSteps=0;this._dragAlpha=0;this._dragNeedsReheat=!1;this._dirtyNodes=new Set;this._forceProgram=null;this._quadBuffer=null;this._quadVAO=null;this._stateTexA=null;this._stateTexB=null;this._fixedTex=null;this._fboA=null;this._fboB=null;this._texWidth=0;this._treeDataTexture=null;this._treeChildrenTexture=null;this._treeGeometryTexture=null;this._adjOffsetsTexture=null;this._adjEdgesTexture=null;this._cachedAdjacency=null;this._treeTexWidth=1;this._treeNodeCount=0;this._pingPong=!0;this._uniforms={};this.type="force";this._settings={...ee,...e};let t=document.createElement("canvas").getContext("webgl2");if(!t)throw new B("Failed to create WebGL2 context for GPU force layout engine.");this._gl=t,this._initGPU(),this.clearData()}setSettings(e){let t=e;this._initialSettings||(this._initialSettings=Object.assign(C(ee),t));let i=C(this._settings);if(Object.assign(this._settings,t),j(this._settings,i))return;this.emit("settings-update",{settings:{type:"force",options:this._settings}}),i.isPhysicsEnabled&&!t.isPhysicsEnabled?this.stopSimulation():this._settings.isSimulatingOnSettingsUpdate&&this._nodes.length>0&&this.activateSimulation()}setupData(e){this.clearData(),this._initializeNewData(e),this._settings.isSimulatingOnDataUpdate&&this._runSimulation()}mergeData(e){this._initializeNewData(e),this._settings.isPhysicsEnabled||this._pinNodes(),this._settings.isSimulatingOnDataUpdate&&this.activateSimulation()}updateData(e){let t=new Set(e.nodes.map(s=>s.id)),i=this._nodes.filter(s=>t.has(s.id)),o=e.nodes.filter(s=>this._nodeIndexByNodeId[s.id]===void 0);this._nodes=[...i,...o],this._rebuildNodeIndex(),this._edges=e.edges,this._cachedAdjacency=null,this._settings.isSimulatingOnSettingsUpdate&&this.activateSimulation()}deleteData(e){if(e.nodeIds){let t=new Set(e.nodeIds);this._nodes=this._nodes.filter(i=>!t.has(i.id))}if(e.edgeIds){let t=new Set(e.edgeIds);this._edges=this._edges.filter(i=>!t.has(i.id))}this._rebuildNodeIndex(),this._cachedAdjacency=null,this._settings.isSimulatingOnDataUpdate&&this.activateSimulation()}patchData(e){if(e.nodes){let t={};for(let i=0;i<this._nodes.length;i++)t[this._nodes[i].id]=i;for(let i=0;i<e.nodes.length;i+=1){let o=e.nodes[i].id;if(o in t){let s=t[o];this._nodeIndexByNodeId[o]=s,this._nodes[s]=e.nodes[i]}else this._nodes.push(e.nodes[i])}}if(e.edges){let t={};for(let i=0;i<this._edges.length;i++)t[this._edges[i].id]=i;for(let i=0;i<e.edges.length;i++){let o=e.edges[i].id;o in t?this._edges[t[o]]=e.edges[i]:this._edges.push(e.edges[i])}}}clearData(){this._nodes=[],this._edges=[],this._rebuildNodeIndex(),this._cachedAdjacency=null}activateSimulation(){if(this._settings.isPhysicsEnabled?this._unpinNodes():this._pinNodes(),this._isStabilizing){this._pendingRestart=!0;return}this._ensurePositions(),this._uploadDataToGPU(),this._cachedAdjacency||this._buildAndUploadAdjacency(),this._startSimulationLoop()}stopSimulation(){this._isStabilizing&&(this._cancelSimulation=!0)}startDragNode(){this._isDragging=!0,this._isStabilizing&&(this._cancelSimulation=!0),this._settings.isPhysicsEnabled&&this._startDragLoop()}dragNode(e,t){let i=this._nodeIndexByNodeId[e],o=this._nodes[i];o&&(this._isDragging||this.startDragNode(),o.fx=t.x,o.fy=t.y,this._settings.isPhysicsEnabled||(o.x=t.x,o.y=t.y),this._dirtyNodes.add(i),this._dragNeedsReheat=!0,this.emit("node-drag",{nodes:this._nodes,edges:this._edges}))}endDragNode(e){this._isDragging=!1;let t=this._nodes[this._nodeIndexByNodeId[e]];if(t&&this._settings.isPhysicsEnabled){this._unpinNode(t);let i=this._nodeIndexByNodeId[e];this._dirtyNodes.add(i)}}fixNodes(e){e||(e=this._nodes);for(let t=0;t<e.length;t++)this._stickNode(e[t])}releaseNodes(e){e||(e=this._nodes);for(let t=0;t<e.length;t++)this._unstickNode(e[t]);this._settings.isSimulatingOnUnstick&&this._nodes.length>0&&this.activateSimulation()}terminate(){super.terminate();let e=this._gl;e&&(e.deleteBuffer(this._quadBuffer),e.deleteVertexArray(this._quadVAO),e.deleteProgram(this._forceProgram),e.deleteTexture(this._stateTexA),e.deleteTexture(this._stateTexB),e.deleteTexture(this._fixedTex),e.deleteTexture(this._treeDataTexture),e.deleteTexture(this._treeChildrenTexture),e.deleteTexture(this._treeGeometryTexture),e.deleteTexture(this._adjOffsetsTexture),e.deleteTexture(this._adjEdgesTexture),e.deleteFramebuffer(this._fboA),e.deleteFramebuffer(this._fboB),e.getExtension("WEBGL_lose_context")?.loseContext())}reheat(){let e=this._settings.alpha;this._currentAlpha=e.alpha,this._totalSteps=Math.min(St,Math.ceil(Math.log(e.alphaMin)/Math.log(1-e.alphaDecay))),this._currentStep=0,!this._isStabilizing&&(this._ensurePositions(),this._uploadDataToGPU(),this._cachedAdjacency||this._buildAndUploadAdjacency(),this._startSimulationLoop())}_runSimulation(){this._isStabilizing||this._cancelSimulation||(this._ensurePositions(),this._uploadDataToGPU(),this._buildAndUploadAdjacency(),this._startSimulationLoop())}_startDragLoop(){if(this._dragLoopRunning)return;this._dragLoopRunning=!0;let e=this._settings.alpha.alphaDecay,t=this._settings.alpha.alphaMin;this._dragAlpha=.3,this._dragNeedsReheat=!1;let i=()=>{if(!this._isDragging){this._dragLoopRunning=!1;return}if(this._dragNeedsReheat&&(this._dragAlpha=.3,this._dragNeedsReheat=!1),this._dragAlpha+=(0-this._dragAlpha)*e,this._dragAlpha<t){requestAnimationFrame(i);return}this._readbackFromGPU(),this._flushDirtyNodes(),this._buildAndUploadQuadTree(),this._simulateGPUStep(this._dragAlpha),this._readbackFromGPU(),this._applyCentering(),this.emit("node-drag",{nodes:this._nodes,edges:this._edges}),requestAnimationFrame(i)};requestAnimationFrame(i)}_startSimulationLoop(){if(this._isStabilizing||this._cancelSimulation)return;this.emit("simulation-start",void 0),this._isStabilizing=!0,this._pendingRestart=!1;let e=++this._simulationGeneration,t=this._settings.alpha,i=t.alphaMin,o=t.alphaDecay;this._currentAlpha=t.alpha,this._totalSteps=Math.min(St,Math.ceil(Math.log(i)/Math.log(1-o))),this._currentStep=0;let s=-1,a=()=>{if(e!==this._simulationGeneration)return;if(this._cancelSimulation){this._isStabilizing=!1,this._cancelSimulation=!1,this.emit("simulation-end",{nodes:this._nodes,edges:this._edges});return}if(this._readbackFromGPU(),this._pendingRestart){this._isStabilizing=!1,this._pendingRestart=!1,this._ensurePositions(),this._uploadDataToGPU(),this._cachedAdjacency||this._buildAndUploadAdjacency(),this._startSimulationLoop();return}this._flushDirtyNodes(),this._buildAndUploadQuadTree();let u=Math.min(this._currentStep+Ht,this._totalSteps);for(;this._currentStep<u;this._currentStep++){if(this._currentAlpha+=(t.alphaTarget-this._currentAlpha)*o,this._currentAlpha<i||this._cancelSimulation){this._currentStep=this._totalSteps;break}this._simulateGPUStep(this._currentAlpha)}this._readbackFromGPU(),this._applyCentering();let l=Math.round(this._currentStep*100/this._totalSteps);l>s&&(s=l,this.emit("simulation-progress",{nodes:this._nodes,edges:this._edges,progress:l/100})),this._currentStep<this._totalSteps&&!this._cancelSimulation?this._scheduleNext(a):(this._settings.isPhysicsEnabled||this._pinNodes(),this._isStabilizing=!1,this._cancelSimulation=!1,this.emit("simulation-end",{nodes:this._nodes,edges:this._edges}))};this._scheduleNext(a)}_ensurePositions(){let t=(this._settings.links?.distance??50)*Math.sqrt(this._nodes.length);for(let i of this._nodes)(i.x===void 0||i.x===null)&&(i.x=(Math.random()-.5)*t),(i.y===void 0||i.y===null)&&(i.y=(Math.random()-.5)*t)}_applyCentering(){let e=this._settings.centering;if(!e)return;let t=this._nodes.length;if(t===0)return;let i=0,o=0;for(let u=0;u<t;u++)i+=this._nodes[u].x??0,o+=this._nodes[u].y??0;let s=(i/t-e.x)*e.strength,a=(o/t-e.y)*e.strength;if(!(Math.abs(s)<1e-6&&Math.abs(a)<1e-6)){for(let u=0;u<t;u++){let l=this._nodes[u];l.fx!==null&&l.fx!==void 0||(l.x=(l.x??0)-s,l.y=(l.y??0)-a)}this._syncStateToGPU()}}_syncStateToGPU(){let e=this._nodes.length;if(e===0)return;let t=this._texWidth*this._texWidth,i=new Float32Array(t*4);for(let o=0;o<e;o++){let s=this._nodes[o],a=o*4;i[a]=s.x??0,i[a+1]=s.y??0,i[a+2]=s.vx??0,i[a+3]=s.vy??0}this._uploadTexture(this._stateTexA,i,this._texWidth),this._uploadTexture(this._stateTexB,i,this._texWidth),this._pingPong=!0}_flushDirtyNodes(){if(this._dirtyNodes.size===0)return;let e=this._gl;for(let t of this._dirtyNodes){let i=this._nodes[t];if(!i)continue;let o=t%this._texWidth,s=Math.floor(t/this._texWidth),a=new Float32Array([i.x??0,i.y??0,i.vx??0,i.vy??0]);e.bindTexture(e.TEXTURE_2D,this._stateTexA),e.texSubImage2D(e.TEXTURE_2D,0,o,s,1,1,e.RGBA,e.FLOAT,a),e.bindTexture(e.TEXTURE_2D,this._stateTexB),e.texSubImage2D(e.TEXTURE_2D,0,o,s,1,1,e.RGBA,e.FLOAT,a);let u=new Float32Array([i.fx!==null&&i.fx!==void 0?1:0,i.fx??i.x??0,i.fy??i.y??0,0]);e.bindTexture(e.TEXTURE_2D,this._fixedTex),e.texSubImage2D(e.TEXTURE_2D,0,o,s,1,1,e.RGBA,e.FLOAT,u)}this._dirtyNodes.clear()}_buildAndUploadQuadTree(){if(this._nodes.length===0)return;let t=this._settings.manyBody?.strength??-100,i=this._nodes;if(this._settings.manyBody?.edgeMidpointRepulsion){let s=this._getEdgeMidpoints();s.length>0&&(i=i.concat(s))}let o=It(i,t);this._uploadTexture(this._treeDataTexture,o.treeData,o.texWidth),this._uploadTexture(this._treeChildrenTexture,o.treeChildren,o.texWidth),this._uploadTexture(this._treeGeometryTexture,o.treeGeometry,o.texWidth),this._treeTexWidth=o.texWidth,this._treeNodeCount=o.nodeCount}_getEdgeMidpoints(){let e=[];for(let t=0;t<this._edges.length;t++){let i=this._edges[t],o=typeof i.source=="object"?i.source.id:i.source,s=typeof i.target=="object"?i.target.id:i.target,a=this._nodeIndexByNodeId[o],u=this._nodeIndexByNodeId[s];if(a===void 0||u===void 0)continue;let l=this._nodes[a],c=this._nodes[u];e.push({x:((l.x??0)+(c.x??0))*.5,y:((l.y??0)+(c.y??0))*.5})}return e}_buildAndUploadAdjacency(){if(this._nodes.length===0)return;let t=this._settings.links?.distance??50,i=xt(this._nodes,this._edges,t,void 0);this._cachedAdjacency=i,this._uploadTexture(this._adjOffsetsTexture,i.offsets,i.offsetsTexWidth),this._uploadTexture(this._adjEdgesTexture,i.edges,i.edgesTexWidth)}_pinNodes(e){e||(e=this._nodes);for(let t=0;t<e.length;t++)this._pinNode(this._nodes[t])}_unpinNodes(e){e||(e=this._nodes);for(let t=0;t<e.length;t++)this._unpinNode(this._nodes[t])}_pinNode(e){(e.sx===null||e.sx===void 0)&&(e.fx=e.x),(e.sy===null||e.sy===void 0)&&(e.fy=e.y)}_unpinNode(e){(e.sx===null||e.sx===void 0)&&(e.fx=null),(e.sy===null||e.sy===void 0)&&(e.fy=null)}_stickNode(e){e.sx=e.x,e.fx=e.x,e.sy=e.y,e.fy=e.y}_unstickNode(e){e.sx=null,e.sy=null,this._settings.isPhysicsEnabled&&(e.fx=null,e.fy=null)}_initializeNewData(e){if(e.nodes)for(let t=0;t<e.nodes.length;t+=1){let i=e.nodes[t].id;this._nodeIndexByNodeId[i]!==void 0?this._nodeIndexByNodeId[i]=t:this._nodes.push(e.nodes[t])}else this._nodes=[];if(e.edges){let t={};for(let i=0;i<this._edges.length;i++)t[this._edges[i].id]=i;for(let i=0;i<e.edges.length;i++){let o=e.edges[i].id;o in t?this._edges[t[o]]=e.edges[i]:this._edges.push(e.edges[i])}}else this._edges=[];this._rebuildNodeIndex(),this._cachedAdjacency=null}_initGPU(){let e=this._gl;e.getExtension("EXT_color_buffer_float");let t=ke(e,_t,"vertex"),i=ke(e,yt,"fragment"),o=e.createProgram();if(!o)throw new B("Failed to create program.");if(this._forceProgram=o,e.attachShader(o,t),e.attachShader(o,i),e.linkProgram(o),!e.getProgramParameter(o,e.LINK_STATUS)){let u=e.getProgramInfoLog(o);throw new B(`Failed to link force program: ${u}`)}this._cacheUniformLocations(o),this._quadBuffer=e.createBuffer();let s=new Float32Array([-1,-1,1,-1,-1,1,1,1]);e.bindBuffer(e.ARRAY_BUFFER,this._quadBuffer),e.bufferData(e.ARRAY_BUFFER,s,e.STATIC_DRAW),this._quadVAO=e.createVertexArray(),e.bindVertexArray(this._quadVAO);let a=e.getAttribLocation(o,"aPosition");e.enableVertexAttribArray(a),e.vertexAttribPointer(a,2,e.FLOAT,!1,0,0),e.bindVertexArray(null),this._stateTexA=e.createTexture(),this._stateTexB=e.createTexture(),this._fixedTex=e.createTexture(),this._treeDataTexture=e.createTexture(),this._treeChildrenTexture=e.createTexture(),this._treeGeometryTexture=e.createTexture(),this._adjOffsetsTexture=e.createTexture(),this._adjEdgesTexture=e.createTexture(),this._fboA=e.createFramebuffer(),this._fboB=e.createFramebuffer()}_cacheUniformLocations(e){let t=this._gl,i=["uState","uFixed","uTreeData","uTreeChildren","uTreeGeometry","uAdjOffsets","uAdjEdges","uNodeCount","uTexWidth","uAlpha","uDamping","uManyBodyStrength","uTheta2","uDistanceMin2","uDistanceMax2","uTreeNodeCount","uTreeTexWidth","uAdjOffsetsTexWidth","uAdjEdgesTexWidth","uCenter","uCenterStrength","uCollisionRadius","uCollisionStrength","uForceXTarget","uForceXStrength","uForceYTarget","uForceYStrength","uHasManyBody","uHasLinks","uHasCentering","uHasCollision","uHasPositioning"];for(let o of i)this._uniforms[o]=t.getUniformLocation(e,o)}_uploadDataToGPU(){let e=this._gl,t=this._nodes.length;this._texWidth=Math.max(1,Math.ceil(Math.sqrt(t)));let i=this._texWidth*this._texWidth,o=new Float32Array(i*4),s=new Float32Array(i*4);for(let a=0;a<t;a++){let u=this._nodes[a],l=a*4;o[l]=u.x??0,o[l+1]=u.y??0,o[l+2]=u.vx??0,o[l+3]=u.vy??0,s[l]=u.fx!==null&&u.fx!==void 0?1:0,s[l+1]=u.fx??u.x??0,s[l+2]=u.fy??u.y??0,s[l+3]=0}this._uploadTexture(this._stateTexA,o,this._texWidth),this._uploadTexture(this._stateTexB,o,this._texWidth),this._uploadTexture(this._fixedTex,s,this._texWidth),e.bindFramebuffer(e.FRAMEBUFFER,this._fboA),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this._stateTexA,0),e.bindFramebuffer(e.FRAMEBUFFER,this._fboB),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this._stateTexB,0),e.bindFramebuffer(e.FRAMEBUFFER,null),this._pingPong=!0}_uploadTexture(e,t,i){let o=this._gl;o.bindTexture(o.TEXTURE_2D,e),o.texImage2D(o.TEXTURE_2D,0,o.RGBA32F,i,i,0,o.RGBA,o.FLOAT,t),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MIN_FILTER,o.NEAREST),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MAG_FILTER,o.NEAREST),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_S,o.CLAMP_TO_EDGE),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_T,o.CLAMP_TO_EDGE)}_simulateGPUStep(e){let t=this._gl,i=this._forceProgram;if(!i)throw new B("Force program not initialized.");let o=this._nodes.length;if(o===0)return;t.useProgram(i);let s=this._uniforms;t.uniform1i(s.uNodeCount,o),t.uniform1i(s.uTexWidth,this._texWidth),t.uniform1f(s.uAlpha,e),t.uniform1f(s.uDamping,.6);let a=this._settings.manyBody!==null&&this._settings.manyBody!==void 0;if(t.uniform1f(s.uHasManyBody,a?1:0),a){let d=this._settings.manyBody;t.uniform1f(s.uManyBodyStrength,d.strength);let g=d.theta;t.uniform1f(s.uTheta2,g*g),t.uniform1f(s.uDistanceMin2,d.distanceMin*d.distanceMin);let f=d.distanceMax>0?d.distanceMax:Fe(this._settings.links?.distance??50);t.uniform1f(s.uDistanceMax2,f*f),t.uniform1i(s.uTreeNodeCount,this._treeNodeCount),t.uniform1i(s.uTreeTexWidth,this._treeTexWidth)}let u=this._cachedAdjacency!==null&&this._edges.length>0;t.uniform1f(s.uHasLinks,u?1:0),u&&(t.uniform1i(s.uAdjOffsetsTexWidth,this._cachedAdjacency.offsetsTexWidth),t.uniform1i(s.uAdjEdgesTexWidth,this._cachedAdjacency.edgesTexWidth)),t.uniform1f(s.uHasCentering,0);let l=this._settings.collision!==null&&this._settings.collision!==void 0;t.uniform1f(s.uHasCollision,l?1:0),l&&(t.uniform1f(s.uCollisionRadius,this._settings.collision.radius),t.uniform1f(s.uCollisionStrength,this._settings.collision.strength));let c=this._settings.positioning!==null&&this._settings.positioning!==void 0;if(t.uniform1f(s.uHasPositioning,c?1:0),c){let d=this._settings.positioning;t.uniform1f(s.uForceXTarget,d.forceX?.x??0),t.uniform1f(s.uForceXStrength,d.forceX?.strength??0),t.uniform1f(s.uForceYTarget,d.forceY?.y??0),t.uniform1f(s.uForceYStrength,d.forceY?.strength??0)}let _=this._pingPong?this._stateTexA:this._stateTexB,m=this._pingPong?this._fboB:this._fboA;t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,_),t.uniform1i(s.uState,0),t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,this._fixedTex),t.uniform1i(s.uFixed,1),t.activeTexture(t.TEXTURE2),t.bindTexture(t.TEXTURE_2D,this._treeDataTexture),t.uniform1i(s.uTreeData,2),t.activeTexture(t.TEXTURE3),t.bindTexture(t.TEXTURE_2D,this._treeChildrenTexture),t.uniform1i(s.uTreeChildren,3),t.activeTexture(t.TEXTURE4),t.bindTexture(t.TEXTURE_2D,this._adjOffsetsTexture),t.uniform1i(s.uAdjOffsets,4),t.activeTexture(t.TEXTURE5),t.bindTexture(t.TEXTURE_2D,this._adjEdgesTexture),t.uniform1i(s.uAdjEdges,5),t.activeTexture(t.TEXTURE6),t.bindTexture(t.TEXTURE_2D,this._treeGeometryTexture),t.uniform1i(s.uTreeGeometry,6),t.bindFramebuffer(t.FRAMEBUFFER,m),t.viewport(0,0,this._texWidth,this._texWidth),t.bindVertexArray(this._quadVAO),t.drawArrays(t.TRIANGLE_STRIP,0,4),t.bindVertexArray(null),t.bindFramebuffer(t.FRAMEBUFFER,null),this._pingPong=!this._pingPong}_readbackFromGPU(){let e=this._gl,t=this._nodes.length;if(t===0)return;let i=this._pingPong?this._fboA:this._fboB,o=this._texWidth*this._texWidth,s=new Float32Array(o*4);e.bindFramebuffer(e.FRAMEBUFFER,i),e.readPixels(0,0,this._texWidth,this._texWidth,e.RGBA,e.FLOAT,s),e.bindFramebuffer(e.FRAMEBUFFER,null);for(let a=0;a<t;a++){let u=this._nodes[a],l=a*4;u.x=s[l],u.y=s[l+1],u.vx=s[l+2],u.vy=s[l+3]}}};var ye=5e3,H=class extends Y{constructor(){super(...arguments);this._isCalculating=!1;this._pendingRecalculation=!1}setupData(e){this._nodes=[...e.nodes],this._edges=[...e.edges],this._rebuildNodeIndex(),this._calculateAndEmit()}mergeData(e){if(e.nodes)for(let t=0;t<e.nodes.length;t++){let i=this._nodeIndexByNodeId[e.nodes[t].id];i!==void 0?this._nodes[i]=e.nodes[t]:this._nodes.push(e.nodes[t])}if(e.edges){let t={};for(let i=0;i<this._edges.length;i++)t[this._edges[i].id]=i;for(let i=0;i<e.edges.length;i++){let o=e.edges[i].id;o in t?this._edges[t[o]]=e.edges[i]:this._edges.push(e.edges[i])}}this._rebuildNodeIndex(),this._calculateAndEmit()}updateData(e){let t=new Set(e.nodes.map(s=>s.id)),i=this._nodes.filter(s=>t.has(s.id)),o=e.nodes.filter(s=>this._nodeIndexByNodeId[s.id]===void 0);this._nodes=[...i,...o],this._edges=e.edges,this._rebuildNodeIndex(),this._calculateAndEmit()}deleteData(e){if(e.nodeIds){let t=new Set(e.nodeIds);this._nodes=this._nodes.filter(i=>!t.has(i.id))}if(e.edgeIds){let t=new Set(e.edgeIds);this._edges=this._edges.filter(i=>!t.has(i.id))}this._rebuildNodeIndex(),this._calculateAndEmit()}patchData(e){if(e.nodes)for(let t=0;t<e.nodes.length;t++){let i=e.nodes[t].id,o=this._nodeIndexByNodeId[i];o!==void 0?this._nodes[o]=e.nodes[t]:(this._nodes.push(e.nodes[t]),this._nodeIndexByNodeId[i]=this._nodes.length-1)}if(e.edges){let t={};for(let i=0;i<this._edges.length;i++)t[this._edges[i].id]=i;for(let i=0;i<e.edges.length;i++){let o=e.edges[i].id;o in t?this._edges[t[o]]=e.edges[i]:this._edges.push(e.edges[i])}}}clearData(){this._nodes=[],this._edges=[],this._nodeIndexByNodeId={}}activateSimulation(){}stopSimulation(){}startDragNode(){}dragNode(e,t){let i=this._nodeIndexByNodeId[e];if(i!==void 0){let o=this._nodes[i];o.x=t.x,o.y=t.y,o.fx=t.x,o.fy=t.y,this.emit("node-drag",{nodes:this._nodes,edges:this._edges})}}endDragNode(e){}fixNodes(e){}releaseNodes(e){}setSettings(e){let t=C(this._config);Object.assign(this._config,e),!j(this._config,t)&&this._nodes.length>0&&this._calculateAndEmit()}terminate(){this._pendingRecalculation=!1,super.terminate()}_calculateAndEmit(){if(!(this._nodes.length===0||this._cancelSimulation)){if(this._isCalculating){this._pendingRecalculation=!0;return}this._isCalculating=!0,this.emit("simulation-start",void 0),this.calculatePositions(this._nodes,this._edges,e=>{this.emit("simulation-progress",{nodes:this._nodes,edges:this._edges,progress:e})},()=>this._cancelSimulation,()=>{this._isCalculating=!1,this._cancelSimulation||this.emit("simulation-end",{nodes:this._nodes,edges:this._edges}),this._cancelSimulation=!1,this._pendingRecalculation&&(this._pendingRecalculation=!1,this._calculateAndEmit())})}}_emitProgress(e,t,i,o){let s=Math.round(e*100/t);return s>i?(o(s/100),s):i}};var Ie=class extends H{constructor(e){super();this.type="circular";this._config={...pt,...e}}calculatePositions(e,t,i,o,s){let a=2*Math.PI/e.length,u=-1,l=0,c=()=>{if(o()){s();return}let _=Math.min(l+ye,e.length);for(;l<_;l++)e[l].x=this._config.centerX+this._config.radius*Math.cos(a*l),e[l].y=this._config.centerY+this._config.radius*Math.sin(a*l);l<e.length&&!this._cancelSimulation?(u=this._emitProgress(l+1,e.length,u,i),this._scheduleNext(c)):s()};c()}};var xe=class extends H{constructor(e){super();this.type="grid";this._config={...mt,...e}}calculatePositions(e,t,i,o,s){let a=Math.ceil(Math.sqrt(e.length)),u=Math.ceil(e.length/a),l=-1,c=0,_=()=>{if(o()){s();return}let m=Math.min(c+ye,e.length);for(;c<m;c++){let d=Math.floor(c/u),g=c%u;e[c].x=g*this._config.colGap,e[c].y=d*this._config.rowGap}c<e.length&&!this._cancelSimulation?(console.log(c),l=this._emitProgress(c+1,e.length,l,i),this._scheduleNext(_)):s()};_()}};var Se=class extends H{constructor(e){super();this.type="hierarchical";this._config={...gt,...e}}calculatePositions(e,t,i,o,s){let{adjacency:a,inDegree:u}=this._buildAdjacency(e,t),l=this._getConnectedComponents(e,a),c=0,_=0,m=0,d=-1,g=0,f=()=>{if(o()||g>=l.length){!o()&&this._config.reversed&&this._applyReversal(e,c,_),s();return}let h=this._assignLevels(l[g],a,u),p=Math.max(...Array.from(h.values()).map(T=>T.length));h.size*this._config.levelGap>_&&(_=h.size*this._config.levelGap);let y=g===0?0:this._config.treeGap+c;g>0&&(y+=(p-1)*this._config.nodeGap/2);for(let T=0;T<h.size;T++){let x=T*this._config.levelGap,I=h.get(T);if(!I)continue;let E=I.length*this._config.nodeGap;for(let P=0;P<I.length;P++){let D=I[P],N=this._nodeIndexByNodeId[D],b=E/2-P*this._config.nodeGap+y;b>c&&(c=b),N!==void 0&&(e[N].x=this._config.orientation==="horizontal"?x:b,e[N].y=this._config.orientation==="horizontal"?b:x),m++}}g++,g<l.length&&!this._cancelSimulation?(d=this._emitProgress(m,e.length,d,i),this._scheduleNext(f)):(!o()&&this._config.reversed&&this._applyReversal(e,c,_),s())};f()}_applyReversal(e,t,i){for(let o=0;o<e.length;o++)this._config.orientation==="horizontal"&&e[o].x!==void 0&&(e[o].x=t-(e[o].x??0)),this._config.orientation==="vertical"&&e[o].y!==void 0&&(e[o].y=i-(e[o].y??0))}_buildAdjacency(e,t){let i=new Map,o=new Map;for(let s=0;s<t.length;s++){let a=this._getEdgeEndpointId(t[s].source),u=this._getEdgeEndpointId(t[s].target);a!==u&&(i.has(a)||i.set(a,[]),i.has(u)||i.set(u,[]),i.get(a)?.push(u),i.get(u)?.push(a),o.set(u,(o.get(u)??0)+1))}return{adjacency:i,inDegree:o}}_getConnectedComponents(e,t){let i=new Set,o=[];for(let s=0;s<e.length;s++){let a=e[s].id;if(i.has(a))continue;let u=[],l=[a];for(i.add(a);l.length>0;){let c=l.pop();if(c===void 0)continue;u.push(c);let _=t.get(c)??[];for(let m=0;m<_.length;m++)i.has(_[m])||(i.add(_[m]),l.push(_[m]))}o.push(u)}return o}_assignLevels(e,t,i){let o=new Map,s=new Set,a=e.find(l=>(i.get(l)??0)===0);a===void 0&&(a=e.reduce((l,c)=>(i.get(c)??0)<(i.get(l)??0)?c:l));let u=[[a,0]];for(let[l,c]of u){if(s.has(l))continue;s.add(l),o.has(c)?o.get(c)?.push(l):o.set(c,[l]);let _=t.get(l)??[];for(let m=0;m<_.length;m++)u.push([_[m],c+1])}return o}_getEdgeEndpointId(e){return typeof e=="object"?e.id:e}};var Te=class{static create(r){switch(r?.type){case"circular":return new Ie(r.options);case"grid":return new xe(r.options);case"hierarchical":return new Se(r.options);default:{let e=r?.options;if(e?.useGPU)try{return new _e(e)}catch{return console.warn("WebGL2 unavailable, falling back to CPU force layout engine."),new re(e)}return new re(e)}}}};function Tt(n,r){switch(r.type){case"Set Data":n.setupData(r.data);break;case"Add Data":n.mergeData(r.data);break;case"Update Data":n.updateData(r.data);break;case"Delete Data":n.deleteData(r.data);break;case"Patch Data":n.patchData(r.data);break;case"Clear Data":n.clearData();break;case"Activate Simulation":n.activateSimulation();break;case"Stop Simulation":n.stopSimulation();break;case"Start Drag Node":n.startDragNode();break;case"Drag Node":n.dragNode(r.data.id,{x:r.data.x,y:r.data.y});break;case"End Drag Node":n.endDragNode(r.data.id);break;case"Fix Nodes":n.fixNodes(r.data.nodes);break;case"Release Nodes":n.releaseNodes(r.data.nodes);break;default:break}}var q=null,$=n=>postMessage(n);function Vt(n){n.on("simulation-start",()=>$({type:"simulation-start"})),n.on("simulation-progress",r=>$({type:"simulation-progress",data:r})),n.on("simulation-end",r=>$({type:"simulation-end",data:r})),n.on("simulation-step",r=>$({type:"simulation-step",data:r})),n.on("node-drag",r=>$({type:"node-drag",data:r})),n.on("settings-update",r=>$({type:"settings-update",data:r}))}$({type:"ready"});addEventListener("message",({data:n})=>{if(n.type==="Set Settings"){let r=n.data;if(r.type===q?.type&&r.options){q?.setSettings(r.options);return}q?.removeAllListeners(),q?.terminate(),q=Te.create(r),Vt(q);return}q&&Tt(q,n)});})();\n';

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/types/web-worker-simulator/web-worker-simulator.js
  var WORKER_READY_TIMEOUT_MS = 3e3;
  var WebWorkerSimulator = class extends Emitter {
    constructor(settings) {
      super();
      this._isSimulationRunning = false;
      this._fallback = null;
      this._ready = false;
      this._pending = [];
      this._hasWarned = false;
      this._handleWorkerMessage = ({ data }) => {
        switch (data.type) {
          case WorkerOutputType.READY: {
            this._markReady();
            break;
          }
          case WorkerOutputType.SIMULATION_START: {
            this.emit(SimulatorEventType.SIMULATION_START, void 0);
            this._isSimulationRunning = true;
            break;
          }
          case WorkerOutputType.SIMULATION_PROGRESS: {
            this.emit(SimulatorEventType.SIMULATION_PROGRESS, data.data);
            break;
          }
          case WorkerOutputType.SIMULATION_END: {
            this.emit(SimulatorEventType.SIMULATION_END, data.data);
            this._isSimulationRunning = false;
            break;
          }
          case WorkerOutputType.SIMULATION_STEP: {
            this.emit(SimulatorEventType.SIMULATION_STEP, data.data);
            break;
          }
          case WorkerOutputType.NODE_DRAG: {
            this.emit(SimulatorEventType.NODE_DRAG, data.data);
            break;
          }
          case WorkerOutputType.NODE_DRAG_END: {
            this.emit(SimulatorEventType.NODE_DRAG_END, data.data);
            break;
          }
          case WorkerOutputType.SETTINGS_UPDATE: {
            this.emit(SimulatorEventType.SETTINGS_UPDATE, data.data);
            break;
          }
        }
      };
      this._settings = settings;
      let worker;
      try {
        this._blobUrl = URL.createObjectURL(new Blob([simulator_worker_inline_default], { type: "text/javascript" }));
        worker = new Worker(this._blobUrl);
      } catch (error) {
        this._activateFallback(error);
        return;
      }
      this._worker = worker;
      worker.onerror = (event) => {
        if (this._ready) {
          this._warnWorkerError(event);
          return;
        }
        this._activateFallback(event);
      };
      worker.onmessage = this._handleWorkerMessage;
      this._readyTimer = setTimeout(() => {
        if (!this._ready && !this._fallback) {
          this._activateFallback(new Error("Web Worker readiness handshake timed out."));
        }
      }, WORKER_READY_TIMEOUT_MS);
      this.emitToWorker({ type: WorkerInputType.SetSettings, data: settings });
    }
    /**
     * Creates a new graph with the specified data. Any existing data gets discarded.
     * This action creates a new simulation object but keeps the existing simulation settings.
     *
     * @param {ISimulationGraph} data New graph (nodes and edges).
     */
    setupData(data) {
      this.emitToWorker({ type: WorkerInputType.SetupData, data });
    }
    /**
     * Inserts or updates data to an existing graph. (Also known as upsert)
     *
     * @param {ISimulationGraph} data Added graph data (nodes and edges).
     */
    mergeData(data) {
      this.emitToWorker({ type: WorkerInputType.MergeData, data });
    }
    updateData(data) {
      this.emitToWorker({ type: WorkerInputType.UpdateData, data });
    }
    deleteData(data) {
      this.emitToWorker({ type: WorkerInputType.DeleteData, data });
    }
    patchData(data) {
      this.emitToWorker({ type: WorkerInputType.PatchData, data });
    }
    clearData() {
      this.emitToWorker({ type: WorkerInputType.ClearData });
    }
    activateSimulation() {
      this.emitToWorker({ type: WorkerInputType.ActivateSimulation });
    }
    stopSimulation() {
      this.emitToWorker({ type: WorkerInputType.StopSimulation });
    }
    updateSimulation(nodes, edges) {
      this.emitToWorker({ type: WorkerInputType.UpdateSimulation, data: { nodes, edges } });
    }
    startDragNode() {
      this.emitToWorker({ type: WorkerInputType.StartDragNode });
    }
    dragNode(nodeId2, position) {
      this.emitToWorker({ type: WorkerInputType.DragNode, data: Object.assign({ id: nodeId2 }, position) });
    }
    endDragNode(nodeId2) {
      this.emitToWorker({ type: WorkerInputType.EndDragNode, data: { id: nodeId2 } });
    }
    fixNodes(nodes) {
      this.emitToWorker({ type: WorkerInputType.FixNodes, data: { nodes } });
    }
    releaseNodes(nodes) {
      this.emitToWorker({ type: WorkerInputType.ReleaseNodes, data: { nodes } });
    }
    setSettings(settings) {
      this.emitToWorker({
        type: WorkerInputType.SetSettings,
        data: settings
      });
    }
    isSimulationRunning() {
      return this._fallback ? this._fallback.isSimulationRunning() : this._isSimulationRunning;
    }
    terminate() {
      var _a;
      if (this._readyTimer !== void 0) {
        clearTimeout(this._readyTimer);
        this._readyTimer = void 0;
      }
      this._revokeBlobUrl();
      if (this._worker) {
        this._worker.onmessage = null;
        this._worker.onerror = null;
        this._worker.terminate();
        this._worker = void 0;
      }
      (_a = this._fallback) === null || _a === void 0 ? void 0 : _a.terminate();
      this.removeAllListeners();
    }
    emitToWorker(message) {
      var _a;
      if (this._fallback) {
        this._applyToFallback(this._fallback, message);
        return;
      }
      if (!this._ready) {
        this._pending.push(message);
      }
      (_a = this._worker) === null || _a === void 0 ? void 0 : _a.postMessage(message);
    }
    _markReady() {
      if (this._ready) {
        return;
      }
      this._ready = true;
      this._pending = [];
      if (this._readyTimer !== void 0) {
        clearTimeout(this._readyTimer);
        this._readyTimer = void 0;
      }
      this._revokeBlobUrl();
    }
    _activateFallback(reason) {
      if (this._fallback) {
        return;
      }
      this._warnFallback(reason);
      if (this._readyTimer !== void 0) {
        clearTimeout(this._readyTimer);
        this._readyTimer = void 0;
      }
      if (this._worker) {
        this._worker.onmessage = null;
        this._worker.onerror = null;
        try {
          this._worker.terminate();
        } catch (_a) {
        }
        this._worker = void 0;
      }
      this._revokeBlobUrl();
      const fallback = new MainThreadSimulator(this._settings);
      this._wireFallbackEvents(fallback);
      this._fallback = fallback;
      const pending = this._pending;
      this._pending = [];
      for (const message of pending) {
        this._applyToFallback(fallback, message);
      }
    }
    _wireFallbackEvents(fallback) {
      relaySimulatorEvents(fallback, this, (isRunning) => {
        this._isSimulationRunning = isRunning;
      });
    }
    _applyToFallback(fallback, message) {
      if (message.type === WorkerInputType.SetSettings) {
        fallback.setSettings(message.data);
        return;
      }
      dispatchLayoutInput(fallback, message);
    }
    _revokeBlobUrl() {
      if (this._blobUrl) {
        URL.revokeObjectURL(this._blobUrl);
        this._blobUrl = void 0;
      }
    }
    _warnWorkerError(reason) {
      if (this._hasWarned) {
        return;
      }
      this._hasWarned = true;
      console.warn("Orb: the layout Web Worker errored after it had started. The current layout is kept and no further updates will be simulated; reload the graph to recover.", reason);
    }
    _warnFallback(reason) {
      if (this._hasWarned) {
        return;
      }
      this._hasWarned = true;
      console.warn("Orb: the layout Web Worker could not start; falling back to the main-thread simulator. Layout is still correct but runs on the main thread. Under a strict Content Security Policy, allow blob workers (e.g. `worker-src blob:` or `child-src blob:`) to re-enable off-main-thread layout.", reason);
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/simulator/factory.js
  var SimulatorFactory = class {
    static getSimulator(settings) {
      const layoutSettings = Object.assign({ type: "force" }, settings);
      const forceOptions = layoutSettings.options;
      if (layoutSettings.type === "force" && (forceOptions === null || forceOptions === void 0 ? void 0 : forceOptions.useGPU)) {
        return new MainThreadSimulator(layoutSettings);
      }
      try {
        if (typeof Worker !== "undefined") {
          return new WebWorkerSimulator(layoutSettings);
        }
        throw new Error("WebWorkers are unavailable in your environment.");
      } catch (err) {
        console.error("Could not create simulator in a WebWorker context. All calculations will be done in the main thread.", err);
        return new MainThreadSimulator(layoutSettings);
      }
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/models/topology.js
  var getEdgeOffsets = (edges) => {
    var _a;
    const edgeOffsets = new Array(edges.length);
    const edgeOffsetsByUniqueKey = getEdgeOffsetsByUniqueKey(edges);
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      let offset = 0;
      const uniqueKey = getUniqueEdgeKey(edge);
      const edgeOffsetsByKey = edgeOffsetsByUniqueKey[uniqueKey];
      if (edgeOffsetsByKey && edgeOffsetsByKey.length) {
        offset = (_a = edgeOffsetsByKey.shift()) !== null && _a !== void 0 ? _a : 0;
        const isEdgeReverseDirection = edge.end < edge.start;
        if (isEdgeReverseDirection) {
          offset = -1 * offset;
        }
      }
      edgeOffsets[i] = offset;
    }
    return edgeOffsets;
  };
  var getUniqueEdgeKey = (edge) => {
    const sid = edge.start;
    const tid = edge.end;
    return sid < tid ? `${sid}-${tid}` : `${tid}-${sid}`;
  };
  var getEdgeOffsetsByUniqueKey = (edges) => {
    var _a;
    const edgeCountByUniqueKey = {};
    const loopbackUniqueKeys = /* @__PURE__ */ new Set();
    for (let i = 0; i < edges.length; i++) {
      const uniqueKey = getUniqueEdgeKey(edges[i]);
      if (edges[i].start === edges[i].end) {
        loopbackUniqueKeys.add(uniqueKey);
      }
      edgeCountByUniqueKey[uniqueKey] = ((_a = edgeCountByUniqueKey[uniqueKey]) !== null && _a !== void 0 ? _a : 0) + 1;
    }
    const edgeOffsetsByUniqueKey = {};
    const uniqueKeys = Object.keys(edgeCountByUniqueKey);
    for (let i = 0; i < uniqueKeys.length; i++) {
      const uniqueKey = uniqueKeys[i];
      const edgeCount = edgeCountByUniqueKey[uniqueKey];
      if (loopbackUniqueKeys.has(uniqueKey)) {
        edgeOffsetsByUniqueKey[uniqueKey] = Array.from({ length: edgeCount }, (_, i2) => i2 + 1);
        continue;
      }
      if (edgeCount <= 1) {
        continue;
      }
      const edgeOffsets = [];
      if (edgeCount % 2 !== 0) {
        edgeOffsets.push(0);
      }
      for (let i2 = 2; i2 <= edgeCount; i2 += 2) {
        edgeOffsets.push(i2 / 2);
        edgeOffsets.push(i2 / 2 * -1);
      }
      edgeOffsetsByUniqueKey[uniqueKey] = edgeOffsets;
    }
    return edgeOffsetsByUniqueKey;
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/utils/entity.utils.js
  var EntityState = class {
    constructor(definition) {
      this.ids = [];
      this.entityById = /* @__PURE__ */ new Map();
      this.getId = definition.getId;
      this.sortBy = definition.sortBy;
    }
    getOne(id2) {
      return this.entityById.get(id2);
    }
    getMany(ids, options) {
      const entities = [];
      for (let i = 0; i < ids.length; i++) {
        const entity = this.getOne(ids[i]);
        if (entity === void 0) {
          continue;
        }
        if ((options === null || options === void 0 ? void 0 : options.filterBy) && !options.filterBy(entity)) {
          continue;
        }
        entities.push(entity);
      }
      if (this.sortBy) {
        entities.sort(this.sortBy);
      }
      return entities;
    }
    getAll(options) {
      const entities = [];
      for (let i = 0; i < this.ids.length; i++) {
        const entity = this.getOne(this.ids[i]);
        if (entity === void 0) {
          continue;
        }
        if ((options === null || options === void 0 ? void 0 : options.filterBy) && !options.filterBy(entity)) {
          continue;
        }
        entities.push(entity);
      }
      return entities;
    }
    setOne(entity) {
      const id2 = this.getId(entity);
      const isNewEntity = !this.entityById.has(id2);
      this.entityById.set(id2, entity);
      if (isNewEntity) {
        this.ids.push(id2);
        this.sort();
      }
    }
    setMany(entities) {
      if (this.sortBy) {
        entities.sort(this.sortBy);
      }
      const newIds = [];
      for (let i = 0; i < entities.length; i++) {
        const entityId = this.getId(entities[i]);
        if (!this.entityById.has(entityId)) {
          newIds.push(entityId);
        }
        this.entityById.set(entityId, entities[i]);
      }
      this.ids = this.ids.concat(newIds);
      this.sort();
    }
    removeMany(ids) {
      const uniqueRemovedIds = new Set(ids);
      const newIds = [];
      for (let i = 0; i < this.ids.length; i++) {
        if (!uniqueRemovedIds.has(this.ids[i])) {
          newIds.push(this.ids[i]);
        }
      }
      this.ids = newIds;
      for (let i = 0; i < ids.length; i++) {
        this.entityById.delete(ids[i]);
      }
    }
    removeAll() {
      this.ids = [];
      this.entityById.clear();
    }
    sort() {
      if (!this.sortBy) {
        return;
      }
      this.ids.sort((id1, id2) => {
        if (!this.sortBy) {
          return 0;
        }
        const entity1 = this.getOne(id1);
        const entity2 = this.getOne(id2);
        if (entity1 === void 0 || entity2 === void 0) {
          return 0;
        }
        return this.sortBy(entity1, entity2);
      });
    }
    get size() {
      return this.entityById.size;
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/utils/array.utils.js
  var dedupArrays = (...arrays) => {
    const combinedArray = arrays.reduce((acc, curr) => acc.concat(curr), []);
    return Array.from(new Set(combinedArray));
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/models/graph.js
  var Graph = class extends Subject {
    constructor(data, settings) {
      var _a, _b;
      super();
      this._nodes = new EntityState({
        getId: (node) => node.getId(),
        sortBy: (node1, node2) => {
          var _a2, _b2;
          return ((_a2 = node1.getStyle().zIndex) !== null && _a2 !== void 0 ? _a2 : 0) - ((_b2 = node2.getStyle().zIndex) !== null && _b2 !== void 0 ? _b2 : 0);
        }
      });
      this._edges = new EntityState({
        getId: (edge) => edge.getId(),
        sortBy: (edge1, edge2) => {
          var _a2, _b2;
          return ((_a2 = edge1.getStyle().zIndex) !== null && _a2 !== void 0 ? _a2 : 0) - ((_b2 = edge2.getStyle().zIndex) !== null && _b2 !== void 0 ? _b2 : 0);
        }
      });
      this._styleVersion = 0;
      this._bumpStyleVersion = () => {
        this._styleVersion++;
      };
      this._update = (data2) => {
        if (data2 && "type" in data2 && "options" in data2 && "isSingle" in data2.options) {
          if (data2.type === "node" && data2.options.isSingle) {
            const nodes2 = this._nodes.getAll();
            for (let i = 0; i < nodes2.length; i++) {
              if (nodes2[i].id !== data2.id) {
                nodes2[i].clearState();
              }
            }
          }
          if (data2.type === "edge" && data2.options.isSingle) {
            const edges2 = this._edges.getAll();
            for (let i = 0; i < edges2.length; i++) {
              if (edges2[i].id !== data2.id) {
                edges2[i].clearState();
              }
            }
          }
        }
        this.notifyListeners(data2);
      };
      this._settings = settings || {};
      const nodes = (_a = data === null || data === void 0 ? void 0 : data.nodes) !== null && _a !== void 0 ? _a : [];
      const edges = (_b = data === null || data === void 0 ? void 0 : data.edges) !== null && _b !== void 0 ? _b : [];
      if (settings && settings.listeners) {
        this.listeners = settings.listeners;
      }
      this.notifyListeners = this.notifyListeners.bind(this);
      this.setup({ nodes, edges });
    }
    setSettings(settings) {
      patchProperties(this._settings, settings);
      this.notifyListeners();
    }
    /**
     * Returns a list of nodes.
     *
     * @param {INodeFilter} filterBy Filter function for nodes
     * @return {INode[]} List of nodes
     */
    getNodes(filterBy) {
      return this._nodes.getAll({ filterBy });
    }
    /**
     * Returns a list of edges.
     *
     * @param {IEdgeFilter} filterBy Filter function for edges
     * @return {IEdge[]} List of edges
     */
    getEdges(filterBy) {
      return this._edges.getAll({ filterBy });
    }
    /**
     * Returns the total node count.
     *
     * @return {number} Total node count
     */
    getNodeCount() {
      return this._nodes.size;
    }
    /**
     * Returns the total edge count.
     *
     * @return {number} Total edge count
     */
    getEdgeCount() {
      return this._edges.size;
    }
    /**
     * Returns node by node id.
     *
     * @param {any} id Node id
     * @return {Node | undefined} Node or undefined
     */
    getNodeById(id2) {
      return this._nodes.getOne(id2);
    }
    /**
     * Returns edge by edge id.
     *
     * @param {any} id Edge id
     * @return {IEdge | undefined} Edge or undefined
     */
    getEdgeById(id2) {
      return this._edges.getOne(id2);
    }
    /**
     * Returns a list of selected nodes.
     *
     * @return {INode[]} List of selected nodes
     */
    getSelectedNodes() {
      return this.getNodes((node) => node.isSelected());
    }
    /**
     * Returns a list of selected edges.
     *
     * @return {IEdge[]} List of selected edges
     */
    getSelectedEdges() {
      return this.getEdges((edge) => edge.isSelected());
    }
    /**
     * Returns a list of hovered nodes.
     *
     * @return {INode[]} List of hovered nodes
     */
    getHoveredNodes() {
      return this.getNodes((node) => node.isHovered());
    }
    /**
     * Returns a list of hovered edges.
     *
     * @return {IEdge[]} List of hovered edges
     */
    getHoveredEdges() {
      return this.getEdges((edge) => edge.isHovered());
    }
    /**
     * Returns a list of current node positions (x, y).
     *
     * @param {INodeFilter} filterBy Filter function for nodes
     * @return {INodePosition[]} List of node positions
     */
    getNodePositions(filterBy) {
      const nodes = this.getNodes(filterBy);
      const positions = new Array(nodes.length);
      for (let i = 0; i < nodes.length; i++) {
        positions[i] = nodes[i].getPosition();
      }
      return positions;
    }
    /**
     * Sets new node positions (x, y).
     *
     * @param {INodePosition} positions Node positions
     */
    setNodePositions(positions) {
      for (let i = 0; i < positions.length; i++) {
        const node = this._nodes.getOne(positions[i].id);
        if (node) {
          node.setPosition(positions[i], { isNotifySkipped: true });
        }
      }
    }
    /**
     * Returns a list of current edge positions. Edge positions do not have
     * (x, y) but a link to the source and target node ids.
     *
     * @param {IEdgeFilter} filterBy Filter function for edges
     * @return {IEdgePosition[]} List of edge positions
     */
    getEdgePositions(filterBy) {
      const edges = this.getEdges(filterBy);
      const positions = new Array(edges.length);
      for (let i = 0; i < edges.length; i++) {
        positions[i] = edges[i].getPosition();
      }
      return positions;
    }
    /**
     * Sets default style to new nodes and edges. The applied style will be used
     * for all future nodes and edges added with `.merge` function.
     *
     * @param {IGraphStyle} style Style definition
     */
    setDefaultStyle(style) {
      this._defaultStyle = style;
      this._applyStyle();
    }
    setup(data) {
      var _a, _b, _c, _d;
      this._nodes.removeAll();
      this._edges.removeAll();
      const nodes = (_a = data === null || data === void 0 ? void 0 : data.nodes) !== null && _a !== void 0 ? _a : [];
      const edges = (_b = data === null || data === void 0 ? void 0 : data.edges) !== null && _b !== void 0 ? _b : [];
      this._insertNodes(nodes);
      this._insertEdges(edges);
      this._applyEdgeOffsets();
      this._applyStyle();
      (_d = (_c = this._settings) === null || _c === void 0 ? void 0 : _c.onSetupData) === null || _d === void 0 ? void 0 : _d.call(_c, data);
    }
    clearPositions() {
      const nodes = this.getNodes();
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].clearPosition();
      }
    }
    merge(data) {
      var _a, _b, _c, _d;
      const nodes = (_a = data.nodes) !== null && _a !== void 0 ? _a : [];
      const edges = (_b = data.edges) !== null && _b !== void 0 ? _b : [];
      this._upsertNodes(nodes);
      this._upsertEdges(edges);
      this._applyEdgeOffsets();
      this._applyStyle();
      (_d = (_c = this._settings) === null || _c === void 0 ? void 0 : _c.onMergeData) === null || _d === void 0 ? void 0 : _d.call(_c, data);
    }
    remove(data) {
      var _a, _b;
      const nodeIds = (_a = data.nodeIds) !== null && _a !== void 0 ? _a : [];
      const edgeIds = (_b = data.edgeIds) !== null && _b !== void 0 ? _b : [];
      const removedNodesData = this._removeNodes(nodeIds);
      const removedEdgesData = this._removeEdges(edgeIds);
      this._applyEdgeOffsets();
      this._applyStyle();
      if (this._settings && this._settings.onRemoveData) {
        const removedData = {
          nodeIds: dedupArrays(removedNodesData.nodeIds, removedEdgesData.nodeIds),
          edgeIds: dedupArrays(removedNodesData.edgeIds, removedEdgesData.edgeIds)
        };
        this._settings.onRemoveData(removedData);
      }
    }
    removeAll() {
      const nodeIds = this._nodes.getAll().map((node) => node.id);
      const edgeIds = this._edges.getAll().map((edge) => edge.id);
      this.remove({ nodeIds, edgeIds });
    }
    removeAllEdges() {
      const edgeIds = this._edges.getAll().map((edge) => edge.id);
      this.remove({ edgeIds });
    }
    removeAllNodes() {
      this.removeAll();
    }
    isEqual(graph) {
      if (this.getNodeCount() !== graph.getNodeCount()) {
        return false;
      }
      if (this.getEdgeCount() !== graph.getEdgeCount()) {
        return false;
      }
      const nodes = this.getNodes();
      for (let i = 0; i < nodes.length; i++) {
        if (!graph.getNodeById(nodes[i].getId())) {
          return false;
        }
      }
      const edges = this.getEdges();
      for (let i = 0; i < edges.length; i++) {
        if (!graph.getEdgeById(edges[i].getId())) {
          return false;
        }
      }
      return true;
    }
    getBoundingBox() {
      const nodes = this.getNodes();
      const minPoint = { x: 0, y: 0 };
      const maxPoint = { x: 0, y: 0 };
      for (let i = 0; i < nodes.length; i++) {
        const { x: x3, y: y3 } = nodes[i].getCenter();
        if (x3 === void 0 || y3 === void 0) {
          continue;
        }
        const size = nodes[i].getBorderedRadius();
        if (i === 0) {
          minPoint.x = x3 - size;
          maxPoint.x = x3 + size;
          minPoint.y = y3 - size;
          maxPoint.y = y3 + size;
          continue;
        }
        if (x3 + size > maxPoint.x) {
          maxPoint.x = x3 + size;
        }
        if (x3 - size < minPoint.x) {
          minPoint.x = x3 - size;
        }
        if (y3 + size > maxPoint.y) {
          maxPoint.y = y3 + size;
        }
        if (y3 - size < minPoint.y) {
          minPoint.y = y3 - size;
        }
      }
      return {
        x: minPoint.x,
        y: minPoint.y,
        width: Math.abs(maxPoint.x - minPoint.x),
        height: Math.abs(maxPoint.y - minPoint.y)
      };
    }
    getNearestNode(point) {
      const nodes = this.getNodes();
      for (let i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].includesPoint(point)) {
          return nodes[i];
        }
      }
    }
    getNearestEdge(point, minDistance = 3) {
      let nearestEdge;
      let nearestDistance = minDistance;
      const edges = this.getEdges();
      for (let i = 0; i < edges.length; i++) {
        const distance = edges[i].getDistance(point);
        if (distance <= nearestDistance) {
          nearestDistance = distance;
          nearestEdge = edges[i];
        }
      }
      return nearestEdge;
    }
    getNodesInArea(area) {
      const boundingBox = area.getBoundingBox();
      return this.getNodes((node) => {
        const position = node.getPosition();
        if (position.x === void 0 || position.y === void 0) {
          return false;
        }
        const center = { x: position.x, y: position.y };
        return isPointInRectangle(boundingBox, center) && area.contains(center);
      });
    }
    getStyleVersion() {
      return this._styleVersion;
    }
    _insertNodes(nodes) {
      const newNodes = new Array(nodes.length);
      for (let i = 0; i < nodes.length; i++) {
        newNodes[i] = NodeFactory.create({ data: nodes[i] }, {
          onLoadedImage: () => {
            var _a, _b;
            return (_b = (_a = this._settings) === null || _a === void 0 ? void 0 : _a.onLoadedImages) === null || _b === void 0 ? void 0 : _b.call(_a);
          },
          listeners: [this._update],
          onStateChange: this._bumpStyleVersion
        });
      }
      this._nodes.setMany(newNodes);
    }
    _insertEdges(edges) {
      const newEdges = [];
      for (let i = 0; i < edges.length; i++) {
        const startNode = this.getNodeById(edges[i].start);
        const endNode = this.getNodeById(edges[i].end);
        if (startNode && endNode) {
          newEdges.push(EdgeFactory.create({
            data: edges[i],
            startNode,
            endNode
          }, {
            listeners: [this._update],
            onStateChange: this._bumpStyleVersion
          }));
        }
      }
      this._edges.setMany(newEdges);
    }
    _upsertNodes(nodes) {
      const newNodes = [];
      for (let i = 0; i < nodes.length; i++) {
        const existingNode = this.getNodeById(nodes[i].id);
        if (existingNode) {
          existingNode.setData(nodes[i]);
          existingNode.setPosition(nodes[i], { isNotifySkipped: true });
          continue;
        }
        newNodes.push(NodeFactory.create({ data: nodes[i] }, {
          onLoadedImage: () => {
            var _a, _b;
            return (_b = (_a = this._settings) === null || _a === void 0 ? void 0 : _a.onLoadedImages) === null || _b === void 0 ? void 0 : _b.call(_a);
          },
          listeners: [this._update],
          onStateChange: this._bumpStyleVersion
        }));
      }
      this._nodes.setMany(newNodes);
    }
    _upsertEdges(edges) {
      const newEdges = [];
      const removedEdgeIds = [];
      for (let i = 0; i < edges.length; i++) {
        const newEdgeData = edges[i];
        const existingEdge = this.getEdgeById(newEdgeData.id);
        if (!existingEdge) {
          const startNode2 = this.getNodeById(newEdgeData.start);
          const endNode2 = this.getNodeById(newEdgeData.end);
          if (startNode2 && endNode2) {
            const edge2 = EdgeFactory.create({
              data: newEdgeData,
              startNode: startNode2,
              endNode: endNode2
            }, {
              listeners: [this._update],
              onStateChange: this._bumpStyleVersion
            });
            newEdges.push(edge2);
          }
          continue;
        }
        if (existingEdge.start === newEdgeData.start && existingEdge.end === newEdgeData.end) {
          existingEdge.setData(newEdgeData);
          continue;
        }
        existingEdge.startNode.removeEdge(existingEdge);
        existingEdge.endNode.removeEdge(existingEdge);
        const startNode = this.getNodeById(newEdgeData.start);
        const endNode = this.getNodeById(newEdgeData.end);
        if (!startNode || !endNode) {
          removedEdgeIds.push(existingEdge.getId());
          continue;
        }
        const edge = EdgeFactory.create({
          data: newEdgeData,
          offset: existingEdge.offset,
          startNode,
          endNode
        }, {
          listeners: [this._update],
          onStateChange: this._bumpStyleVersion
        });
        edge.setState(existingEdge.getState(), { isNotifySkipped: true });
        edge.setStyle(existingEdge.getStyle(), { isNotifySkipped: true });
        newEdges.push(edge);
      }
      this._edges.setMany(newEdges);
      this._edges.removeMany(removedEdgeIds);
    }
    _removeNodes(nodeIds) {
      const removedNodeIds = [];
      const removedEdgeIds = [];
      for (let i = 0; i < nodeIds.length; i++) {
        const node = this.getNodeById(nodeIds[i]);
        if (!node) {
          continue;
        }
        const edges = node.getEdges();
        for (let i2 = 0; i2 < edges.length; i2++) {
          const edge = edges[i2];
          edge.startNode.removeEdge(edge);
          edge.endNode.removeEdge(edge);
          removedEdgeIds.push(edge.getId());
        }
        removedNodeIds.push(node.getId());
      }
      this._nodes.removeMany(removedNodeIds);
      this._edges.removeMany(removedEdgeIds);
      return { nodeIds: removedNodeIds, edgeIds: removedEdgeIds };
    }
    _removeEdges(edgeIds) {
      const removedEdgeIds = [];
      for (let i = 0; i < edgeIds.length; i++) {
        const edge = this.getEdgeById(edgeIds[i]);
        if (!edge) {
          continue;
        }
        edge.startNode.removeEdge(edge);
        edge.endNode.removeEdge(edge);
        removedEdgeIds.push(edge.getId());
      }
      this._edges.removeMany(removedEdgeIds);
      return { nodeIds: [], edgeIds: removedEdgeIds };
    }
    _applyEdgeOffsets() {
      const graphEdges = this.getEdges();
      const edgeOffsets = getEdgeOffsets(graphEdges);
      const updatedEdges = new Array(edgeOffsets.length);
      for (let i = 0; i < edgeOffsets.length; i++) {
        const edge = graphEdges[i];
        const edgeOffset = edgeOffsets[i];
        updatedEdges[i] = EdgeFactory.copy(edge, { offset: edgeOffset });
      }
      this._edges.setMany(updatedEdges);
    }
    _applyStyle() {
      var _a, _b;
      const styleImageUrls = /* @__PURE__ */ new Set();
      if ((_a = this._defaultStyle) === null || _a === void 0 ? void 0 : _a.getNodeStyle) {
        const newNodes = this.getNodes();
        for (let i = 0; i < newNodes.length; i++) {
          if (newNodes[i].hasStyle()) {
            continue;
          }
          const style = this._defaultStyle.getNodeStyle(newNodes[i]);
          if (style) {
            newNodes[i].setStyle(style, { isNotifySkipped: true });
            if (style.imageUrl) {
              styleImageUrls.add(style.imageUrl);
            }
            if (style.imageUrlSelected) {
              styleImageUrls.add(style.imageUrlSelected);
            }
          }
        }
      }
      if ((_b = this._defaultStyle) === null || _b === void 0 ? void 0 : _b.getEdgeStyle) {
        const newEdges = this.getEdges();
        for (let i = 0; i < newEdges.length; i++) {
          if (newEdges[i].hasStyle()) {
            continue;
          }
          const style = this._defaultStyle.getEdgeStyle(newEdges[i]);
          if (style) {
            newEdges[i].setStyle(style, { isNotifySkipped: true });
          }
        }
      }
      if (styleImageUrls.size) {
        ImageHandler.getInstance().loadImages(Array.from(styleImageUrls), () => {
          var _a2, _b2;
          (_b2 = (_a2 = this._settings) === null || _a2 === void 0 ? void 0 : _a2.onLoadedImages) === null || _b2 === void 0 ? void 0 : _b2.call(_a2);
        });
      }
      this._nodes.sort();
      this._edges.sort();
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/utils/graph.utils.js
  var selectNode = (node, options) => {
    var _a;
    if ((_a = options === null || options === void 0 ? void 0 : options.cascade) !== null && _a !== void 0 ? _a : true) {
      setNodeState(node, GraphObjectState.SELECTED, { isStateOverride: true });
    } else {
      node.setState(GraphObjectState.SELECTED, { isNotifySkipped: true });
    }
  };
  var selectEdge = (edge, options) => {
    var _a;
    if ((_a = options === null || options === void 0 ? void 0 : options.cascade) !== null && _a !== void 0 ? _a : true) {
      setEdgeState(edge, GraphObjectState.SELECTED, { isStateOverride: true });
    } else {
      edge.setState(GraphObjectState.SELECTED, { isNotifySkipped: true });
    }
  };
  var unselectNode = (node, options) => {
    var _a;
    if ((_a = options === null || options === void 0 ? void 0 : options.cascade) !== null && _a !== void 0 ? _a : true) {
      setNodeState(node, GraphObjectState.NONE, { isStateOverride: true });
    } else {
      node.clearState();
    }
  };
  var unselectEdge = (edge, options) => {
    var _a;
    if ((_a = options === null || options === void 0 ? void 0 : options.cascade) !== null && _a !== void 0 ? _a : true) {
      setEdgeState(edge, GraphObjectState.NONE, { isStateOverride: true });
    } else {
      edge.clearState();
    }
  };
  var selectOnlyNode = (graph, node, options) => {
    unselectAll(graph);
    selectNode(node, options);
  };
  var selectNodes = (nodes, options) => {
    let changedCount = 0;
    for (let i = 0; i < nodes.length; i++) {
      const previousState = nodes[i].getState();
      selectNode(nodes[i], options);
      if (nodes[i].getState() !== previousState) {
        changedCount += 1;
      }
    }
    return { changedCount };
  };
  var unselectNodes = (nodes, options) => {
    let changedCount = 0;
    for (let i = 0; i < nodes.length; i++) {
      const previousState = nodes[i].getState();
      unselectNode(nodes[i], options);
      if (nodes[i].getState() !== previousState) {
        changedCount += 1;
      }
    }
    return { changedCount };
  };
  var selectEdges = (edges, options) => {
    let changedCount = 0;
    for (let i = 0; i < edges.length; i++) {
      const previousState = edges[i].getState();
      selectEdge(edges[i], options);
      if (edges[i].getState() !== previousState) {
        changedCount += 1;
      }
    }
    return { changedCount };
  };
  var unselectEdges = (edges, options) => {
    let changedCount = 0;
    for (let i = 0; i < edges.length; i++) {
      const previousState = edges[i].getState();
      unselectEdge(edges[i], options);
      if (edges[i].getState() !== previousState) {
        changedCount += 1;
      }
    }
    return { changedCount };
  };
  var selectOnlyEdge = (graph, edge, options) => {
    unselectAll(graph);
    selectEdge(edge, options);
  };
  var toggleNodeSelection = (node) => {
    if (node.isSelected()) {
      unselectNode(node, { cascade: false });
    } else {
      selectNode(node, { cascade: false });
    }
  };
  var toggleEdgeSelection = (edge) => {
    if (edge.isSelected()) {
      unselectEdge(edge, { cascade: false });
    } else {
      selectEdge(edge, { cascade: false });
    }
  };
  var unselectAll = (graph) => {
    const selectedNodes = graph.getNodes((node) => node.isSelected());
    for (let i = 0; i < selectedNodes.length; i++) {
      selectedNodes[i].clearState();
    }
    const selectedEdges = graph.getEdges((edge) => edge.isSelected());
    for (let i = 0; i < selectedEdges.length; i++) {
      selectedEdges[i].clearState();
    }
    return { changedCount: selectedNodes.length + selectedEdges.length };
  };
  var hoverNode = (node) => {
    setNodeState(node, GraphObjectState.HOVERED);
  };
  var hoverOnlyNode = (graph, node) => {
    unhoverAll(graph);
    hoverNode(node);
  };
  var hoverEdge = (edge) => {
    setEdgeState(edge, GraphObjectState.HOVERED);
  };
  var unhoverAll = (graph) => {
    const hoveredNodes = graph.getNodes((node) => node.isHovered());
    for (let i = 0; i < hoveredNodes.length; i++) {
      hoveredNodes[i].clearState();
    }
    const hoveredEdges = graph.getEdges((edge) => edge.isHovered());
    for (let i = 0; i < hoveredEdges.length; i++) {
      hoveredEdges[i].clearState();
    }
    return { changedCount: hoveredNodes.length + hoveredEdges.length };
  };
  var setNodeState = (node, state, options) => {
    if (isStateChangeable(node, options)) {
      node.setState(state, { isNotifySkipped: true });
    }
    node.getInEdges().forEach((edge) => {
      if (edge && isStateChangeable(edge, options)) {
        edge.setState(state, { isNotifySkipped: true });
      }
      if (edge.startNode && isStateChangeable(edge.startNode, options)) {
        edge.startNode.setState(state, { isNotifySkipped: true });
      }
    });
    node.getOutEdges().forEach((edge) => {
      if (edge && isStateChangeable(edge, options)) {
        edge.setState(state, { isNotifySkipped: true });
      }
      if (edge.endNode && isStateChangeable(edge.endNode, options)) {
        edge.endNode.setState(state, { isNotifySkipped: true });
      }
    });
  };
  var setEdgeState = (edge, state, options) => {
    if (isStateChangeable(edge, options)) {
      edge.setState(state, { isNotifySkipped: true });
    }
    if (edge.startNode && isStateChangeable(edge.startNode, options)) {
      edge.startNode.setState(state, { isNotifySkipped: true });
    }
    if (edge.endNode && isStateChangeable(edge.endNode, options)) {
      edge.endNode.setState(state, { isNotifySkipped: true });
    }
  };
  var isStateChangeable = (graphObject, options) => {
    const isOverride = options === null || options === void 0 ? void 0 : options.isStateOverride;
    return isOverride || !isOverride && !graphObject.getState();
  };
  var getLayoutAnchors = (layout) => {
    var _a, _b, _c, _d, _e, _f;
    if (layout.type === "hierarchical") {
      const opts = layout.options;
      return {
        anchorX: (_a = opts.anchorX) !== null && _a !== void 0 ? _a : opts.orientation === "horizontal" ? opts.reversed ? "end" : "start" : "center",
        anchorY: (_b = opts.anchorY) !== null && _b !== void 0 ? _b : opts.orientation === "vertical" ? opts.reversed ? "end" : "start" : "center"
      };
    }
    return {
      anchorX: (_d = (_c = layout.options) === null || _c === void 0 ? void 0 : _c.anchorX) !== null && _d !== void 0 ? _d : "center",
      anchorY: (_f = (_e = layout.options) === null || _e === void 0 ? void 0 : _e.anchorY) !== null && _f !== void 0 ? _f : "center"
    };
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/models/strategy.js
  var DefaultEventStrategy = class {
    constructor(settings) {
      this.isSelectEnabled = settings.isDefaultSelectEnabled;
      this.isHoverEnabled = settings.isDefaultHoverEnabled;
      this.isMultiSelectEnabled = settings.isDefaultMultiSelectEnabled;
      this.isSelectCascadeEnabled = settings.isDefaultSelectCascadeEnabled;
    }
    onMouseClick(graph, point, options) {
      var _a;
      const isAppend = this.isMultiSelectEnabled && ((_a = options === null || options === void 0 ? void 0 : options.isAppend) !== null && _a !== void 0 ? _a : false);
      const node = graph.getNearestNode(point);
      if (node) {
        if (this.isSelectEnabled) {
          if (isAppend) {
            toggleNodeSelection(node);
          } else {
            selectOnlyNode(graph, node, { cascade: this.isSelectCascadeEnabled });
          }
        }
        return {
          isStateChanged: true,
          changedSubject: node
        };
      }
      const edge = graph.getNearestEdge(point);
      if (edge) {
        if (this.isSelectEnabled) {
          if (isAppend) {
            toggleEdgeSelection(edge);
          } else {
            selectOnlyEdge(graph, edge, { cascade: this.isSelectCascadeEnabled });
          }
        }
        return {
          isStateChanged: true,
          changedSubject: edge
        };
      }
      if (!this.isSelectEnabled || isAppend) {
        return { isStateChanged: false };
      }
      const { changedCount } = unselectAll(graph);
      return {
        isStateChanged: changedCount > 0
      };
    }
    onMouseMove(graph, point) {
      const node = graph.getNearestNode(point);
      if (node && (!this.isSelectEnabled || this.isSelectEnabled && !node.isSelected())) {
        if (node === this._lastHoveredNode) {
          return {
            changedSubject: node,
            isStateChanged: false
          };
        }
        if (this.isHoverEnabled) {
          hoverOnlyNode(graph, node);
        }
        this._lastHoveredNode = node;
        return {
          isStateChanged: true,
          changedSubject: node
        };
      }
      this._lastHoveredNode = void 0;
      if (!node && this.isHoverEnabled) {
        const { changedCount } = unhoverAll(graph);
        return {
          isStateChanged: changedCount > 0
        };
      }
      return { isStateChanged: false };
    }
    onMouseRightClick(graph, point) {
      const node = graph.getNearestNode(point);
      if (node) {
        if (this.isSelectEnabled) {
          selectOnlyNode(graph, node, { cascade: this.isSelectCascadeEnabled });
        }
        return {
          isStateChanged: true,
          changedSubject: node
        };
      }
      const edge = graph.getNearestEdge(point);
      if (edge) {
        if (this.isSelectEnabled) {
          selectOnlyEdge(graph, edge, { cascade: this.isSelectCascadeEnabled });
        }
        return {
          isStateChanged: true,
          changedSubject: edge
        };
      }
      if (!this.isSelectEnabled) {
        return { isStateChanged: false };
      }
      const { changedCount } = unselectAll(graph);
      return {
        isStateChanged: changedCount > 0
      };
    }
    onMouseDoubleClick(graph, point) {
      const node = graph.getNearestNode(point);
      if (node) {
        if (this.isSelectEnabled) {
          selectOnlyNode(graph, node, { cascade: this.isSelectCascadeEnabled });
        }
        return {
          isStateChanged: true,
          changedSubject: node
        };
      }
      const edge = graph.getNearestEdge(point);
      if (edge) {
        if (this.isSelectEnabled) {
          selectOnlyEdge(graph, edge, { cascade: this.isSelectCascadeEnabled });
        }
        return {
          isStateChanged: true,
          changedSubject: edge
        };
      }
      if (!this.isSelectEnabled) {
        return { isStateChanged: false };
      }
      const { changedCount } = unselectAll(graph);
      return {
        isStateChanged: changedCount > 0
      };
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/shared.js
  var RendererType;
  (function(RendererType2) {
    RendererType2["CANVAS"] = "canvas";
    RendererType2["WEBGL"] = "webgl";
  })(RendererType || (RendererType = {}));
  var RenderEventType;
  (function(RenderEventType2) {
    RenderEventType2["RESIZE"] = "resize";
    RenderEventType2["RENDER_START"] = "render-start";
    RenderEventType2["RENDER_END"] = "render-end";
  })(RenderEventType || (RenderEventType = {}));
  var DEFAULT_RENDERER_SETTINGS = {
    devicePixelRatio: null,
    fps: 60,
    minZoom: 0.25,
    maxZoom: 8,
    fitZoomMargin: 0.2,
    labelsIsEnabled: true,
    labelsOnEventIsEnabled: true,
    shadowIsEnabled: true,
    shadowOnEventIsEnabled: true,
    contextAlphaOnEvent: 0.3,
    contextAlphaOnEventIsEnabled: true,
    backgroundColor: null,
    areCollapsedContainerDimensionsAllowed: false
  };
  var DEFAULT_RENDERER_WIDTH = 640;
  var DEFAULT_RENDERER_HEIGHT = 480;

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/canvas/label.js
  var DEFAULT_FONT_FAMILY = "Roboto, sans-serif";
  var DEFAULT_FONT_SIZE = 4;
  var DEFAULT_FONT_COLOR = "#000000";
  var FONT_BACKGROUND_MARGIN = 0.12;
  var FONT_LINE_SPACING = 1.2;
  var LabelTextBaseline;
  (function(LabelTextBaseline2) {
    LabelTextBaseline2["TOP"] = "top";
    LabelTextBaseline2["MIDDLE"] = "middle";
  })(LabelTextBaseline || (LabelTextBaseline = {}));
  var Label = class {
    constructor(text, data) {
      var _a, _b;
      this.textLines = [];
      this.fontSize = DEFAULT_FONT_SIZE;
      this.fontFamily = getFontFamily(DEFAULT_FONT_SIZE, DEFAULT_FONT_FAMILY);
      this.text = `${text === void 0 ? "" : text}`;
      this.textLines = splitTextLines(this.text);
      this.position = data.position;
      this.properties = data.properties;
      this.textBaseline = data.textBaseline;
      if (this.properties.fontSize !== void 0 || this.properties.fontFamily) {
        this.fontSize = Math.max((_a = this.properties.fontSize) !== null && _a !== void 0 ? _a : 0, 0);
        this.fontFamily = getFontFamily(this.fontSize, (_b = this.properties.fontFamily) !== null && _b !== void 0 ? _b : DEFAULT_FONT_FAMILY);
      }
      this._fixPosition();
    }
    _fixPosition() {
      if (this.textBaseline === LabelTextBaseline.MIDDLE && this.textLines.length) {
        const halfLineSpacingCount = Math.floor(this.textLines.length / 2);
        const halfLineCount = (this.textLines.length - 1) / 2;
        this.position.y -= halfLineCount * this.fontSize - halfLineSpacingCount * (FONT_LINE_SPACING - 1);
      }
    }
  };
  var drawLabel = (context, label) => {
    const isDrawable = label.textLines.length > 0 && label.fontSize > 0;
    if (!isDrawable || !label.position) {
      return;
    }
    drawTextBackground(context, label);
    drawText(context, label);
  };
  var drawTextBackground = (context, label) => {
    if (!label.properties.fontBackgroundColor || !label.position) {
      return;
    }
    context.fillStyle = label.properties.fontBackgroundColor.toString();
    const margin = label.fontSize * FONT_BACKGROUND_MARGIN;
    const height = label.fontSize + 2 * margin;
    const lineHeight = label.fontSize * FONT_LINE_SPACING;
    const baselineHeight = label.textBaseline === LabelTextBaseline.MIDDLE ? label.fontSize / 2 : 0;
    for (let i = 0; i < label.textLines.length; i++) {
      const line = label.textLines[i];
      const width = context.measureText(line).width + 2 * margin;
      context.fillRect(label.position.x - width / 2, label.position.y - baselineHeight - margin + i * lineHeight, width, height);
    }
  };
  var drawText = (context, label) => {
    var _a;
    if (!label.position) {
      return;
    }
    context.fillStyle = ((_a = label.properties.fontColor) !== null && _a !== void 0 ? _a : DEFAULT_FONT_COLOR).toString();
    context.font = label.fontFamily;
    context.textBaseline = label.textBaseline;
    context.textAlign = "center";
    const lineHeight = label.fontSize * FONT_LINE_SPACING;
    for (let i = 0; i < label.textLines.length; i++) {
      const line = label.textLines[i];
      context.fillText(line, label.position.x, label.position.y + i * lineHeight);
    }
  };
  var getFontFamily = (fontSize, fontFamily) => {
    return `${fontSize}px ${fontFamily}`;
  };
  var splitTextLines = (text) => {
    const lines = text.split("\n");
    const trimmedLines = [];
    for (let i = 0; i < lines.length; i++) {
      const trimLine = lines[i].trim();
      trimmedLines.push(trimLine);
    }
    return trimmedLines;
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/canvas/edge/types/edge-curved.js
  var drawCurvedLine = (context, edge) => {
    const sourcePoint = edge.startNode.getCenter();
    const targetPoint = edge.endNode.getCenter();
    if (!sourcePoint || !targetPoint) {
      return;
    }
    const controlPoint = edge.getCurvedControlPoint();
    context.beginPath();
    context.moveTo(sourcePoint.x, sourcePoint.y);
    context.quadraticCurveTo(controlPoint.x, controlPoint.y, targetPoint.x, targetPoint.y);
    const lineDashPattern = edge.getLineDashPattern();
    context.setLineDash(lineDashPattern !== null && lineDashPattern !== void 0 ? lineDashPattern : []);
    context.stroke();
  };
  var getCurvedArrowShape = (edge) => {
    var _a, _b;
    const scaleFactor = (_a = edge.getStyle().arrowSize) !== null && _a !== void 0 ? _a : 1;
    const lineWidth = (_b = edge.getWidth()) !== null && _b !== void 0 ? _b : 1;
    const guideOffset = -0.1;
    const target = edge.endNode;
    const controlPoint = edge.getCurvedControlPoint();
    const arrowPoint = findBorderPoint(edge, target);
    const guidePos = getPointBezier(edge, Math.max(0, Math.min(1, arrowPoint.t + guideOffset)), controlPoint);
    const angle = Math.atan2(arrowPoint.y - guidePos.y, arrowPoint.x - guidePos.x);
    const length = 1.5 * scaleFactor + 3 * lineWidth;
    const xi = arrowPoint.x - length * 0.9 * Math.cos(angle);
    const yi = arrowPoint.y - length * 0.9 * Math.sin(angle);
    const arrowCore = { x: xi, y: yi };
    return { point: arrowPoint, core: arrowCore, angle, length };
  };
  var getPointBezier = (edge, percentage, viaNode) => {
    const sourcePoint = edge.startNode.getCenter();
    const targetPoint = edge.endNode.getCenter();
    if (!sourcePoint || !targetPoint) {
      return { x: 0, y: 0 };
    }
    const t = percentage;
    const x3 = Math.pow(1 - t, 2) * sourcePoint.x + 2 * t * (1 - t) * viaNode.x + Math.pow(t, 2) * targetPoint.x;
    const y3 = Math.pow(1 - t, 2) * sourcePoint.y + 2 * t * (1 - t) * viaNode.y + Math.pow(t, 2) * targetPoint.y;
    return { x: x3, y: y3 };
  };
  var findBorderPoint = (edge, nearNode) => {
    const maxIterations = 10;
    let iteration = 0;
    let low = 0;
    let high = 1;
    let pos = { x: 0, y: 0, t: 0 };
    let distanceToBorder;
    let distanceToPoint;
    let difference;
    const threshold = 0.2;
    const viaNode = edge.getCurvedControlPoint();
    let node = edge.endNode;
    let from = false;
    if (nearNode.getId() === edge.startNode.getId()) {
      node = edge.startNode;
      from = true;
    }
    const nodePoints = node.getCenter();
    let middle;
    while (low <= high && iteration < maxIterations) {
      middle = (low + high) * 0.5;
      pos = Object.assign(Object.assign({}, getPointBezier(edge, middle, viaNode)), { t: 0 });
      distanceToBorder = node.getDistanceToBorder();
      distanceToPoint = Math.sqrt(Math.pow(pos.x - nodePoints.x, 2) + Math.pow(pos.y - nodePoints.y, 2));
      difference = distanceToBorder - distanceToPoint;
      if (Math.abs(difference) < threshold) {
        break;
      }
      if (difference < 0) {
        if (from === false) {
          low = middle;
        } else {
          high = middle;
        }
      } else {
        if (from === false) {
          high = middle;
        } else {
          low = middle;
        }
      }
      iteration++;
    }
    pos.t = middle !== null && middle !== void 0 ? middle : 0;
    return pos;
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/canvas/edge/types/edge-loopback.js
  var drawLoopbackLine = (context, edge) => {
    const { x: x3, y: y3, radius } = edge.getCircularData();
    context.beginPath();
    context.arc(x3, y3, radius, 0, 2 * Math.PI, false);
    context.closePath();
    const lineDashPattern = edge.getLineDashPattern();
    context.setLineDash(lineDashPattern !== null && lineDashPattern !== void 0 ? lineDashPattern : []);
    context.stroke();
  };
  var getLoopbackArrowShape = (edge) => {
    var _a, _b;
    const scaleFactor = (_a = edge.getStyle().arrowSize) !== null && _a !== void 0 ? _a : 1;
    const lineWidth = (_b = edge.getWidth()) !== null && _b !== void 0 ? _b : 1;
    const source = edge.startNode;
    const arrowPoint = findBorderPoint2(edge, source);
    const angle = arrowPoint.t * -2 * Math.PI + 0.45 * Math.PI;
    const length = 1.5 * scaleFactor + 3 * lineWidth;
    const xi = arrowPoint.x - length * 0.9 * Math.cos(angle);
    const yi = arrowPoint.y - length * 0.9 * Math.sin(angle);
    const arrowCore = { x: xi, y: yi };
    return { point: arrowPoint, core: arrowCore, angle, length };
  };
  var pointOnCircle = (circle, percentage) => {
    const angle = percentage * 2 * Math.PI;
    return {
      x: circle.x + circle.radius * Math.cos(angle),
      y: circle.y - circle.radius * Math.sin(angle)
    };
  };
  var findBorderPoint2 = (edge, nearNode) => {
    const circle = edge.getCircularData();
    const options = { low: 0.6, high: 1, direction: 1 };
    let low = options.low;
    let high = options.high;
    const direction = options.direction;
    const maxIterations = 10;
    let iteration = 0;
    let pos = { x: 0, y: 0, t: 0 };
    let distanceToBorder;
    let distanceToPoint;
    let difference;
    const threshold = 0.05;
    let middle = (low + high) * 0.5;
    const nearNodePoint = nearNode.getCenter();
    while (low <= high && iteration < maxIterations) {
      middle = (low + high) * 0.5;
      pos = Object.assign(Object.assign({}, pointOnCircle(circle, middle)), { t: 0 });
      distanceToBorder = nearNode.getDistanceToBorder();
      distanceToPoint = Math.sqrt(Math.pow(pos.x - nearNodePoint.x, 2) + Math.pow(pos.y - nearNodePoint.y, 2));
      difference = distanceToBorder - distanceToPoint;
      if (Math.abs(difference) < threshold) {
        break;
      }
      if (difference > 0) {
        if (direction > 0) {
          low = middle;
        } else {
          high = middle;
        }
      } else {
        if (direction > 0) {
          high = middle;
        } else {
          low = middle;
        }
      }
      iteration++;
    }
    pos.t = middle !== null && middle !== void 0 ? middle : 0;
    return pos;
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/canvas/edge/types/edge-straight.js
  var drawStraightLine = (context, edge) => {
    const sourcePoint = edge.startNode.getCenter();
    const targetPoint = edge.endNode.getCenter();
    if (!sourcePoint || !targetPoint) {
      return;
    }
    context.beginPath();
    context.moveTo(sourcePoint.x, sourcePoint.y);
    context.lineTo(targetPoint.x, targetPoint.y);
    const lineDashPattern = edge.getLineDashPattern();
    context.setLineDash(lineDashPattern !== null && lineDashPattern !== void 0 ? lineDashPattern : []);
    context.stroke();
  };
  var getStraightArrowShape = (edge) => {
    var _a, _b;
    const scaleFactor = (_a = edge.getStyle().arrowSize) !== null && _a !== void 0 ? _a : 1;
    const lineWidth = (_b = edge.getWidth()) !== null && _b !== void 0 ? _b : 1;
    const sourcePoint = edge.startNode.getCenter();
    const targetPoint = edge.endNode.getCenter();
    const angle = Math.atan2(targetPoint.y - sourcePoint.y, targetPoint.x - sourcePoint.x);
    const arrowPoint = findBorderPoint3(edge, edge.endNode);
    const length = 1.5 * scaleFactor + 3 * lineWidth;
    const xi = arrowPoint.x - length * 0.9 * Math.cos(angle);
    const yi = arrowPoint.y - length * 0.9 * Math.sin(angle);
    const arrowCore = { x: xi, y: yi };
    return { point: arrowPoint, core: arrowCore, angle, length };
  };
  var findBorderPoint3 = (edge, nearNode) => {
    let endNode = edge.endNode;
    let startNode = edge.startNode;
    if (nearNode.getId() === edge.startNode.getId()) {
      endNode = edge.startNode;
      startNode = edge.endNode;
    }
    const endNodePoints = endNode.getCenter();
    const startNodePoints = startNode.getCenter();
    const dx = endNodePoints.x - startNodePoints.x;
    const dy = endNodePoints.y - startNodePoints.y;
    const edgeSegmentLength = Math.sqrt(dx * dx + dy * dy);
    const toBorderDist = nearNode.getDistanceToBorder();
    const toBorderPoint = (edgeSegmentLength - toBorderDist) / edgeSegmentLength;
    return {
      x: (1 - toBorderPoint) * startNodePoints.x + toBorderPoint * endNodePoints.x,
      y: (1 - toBorderPoint) * startNodePoints.y + toBorderPoint * endNodePoints.y,
      t: 0
    };
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/canvas/edge/base.js
  var DEFAULT_IS_SHADOW_DRAW_ENABLED = true;
  var DEFAULT_IS_LABEL_DRAW_ENABLED = true;
  var drawEdge = (context, edge, options) => {
    var _a, _b;
    if (!edge.getWidth()) {
      return;
    }
    const isShadowEnabled = (_a = options === null || options === void 0 ? void 0 : options.isShadowEnabled) !== null && _a !== void 0 ? _a : DEFAULT_IS_SHADOW_DRAW_ENABLED;
    const isLabelEnabled = (_b = options === null || options === void 0 ? void 0 : options.isLabelEnabled) !== null && _b !== void 0 ? _b : DEFAULT_IS_LABEL_DRAW_ENABLED;
    const hasShadow = edge.hasShadow();
    setupCanvas(context, edge);
    if (isShadowEnabled && hasShadow) {
      setupShadow(context, edge);
    }
    drawArrow(context, edge);
    drawLine(context, edge);
    if (isShadowEnabled && hasShadow) {
      clearShadow(context, edge);
    }
    if (isLabelEnabled) {
      drawEdgeLabel(context, edge);
    }
  };
  var drawEdgeLabel = (context, edge) => {
    const edgeLabel = edge.getLabel();
    if (!edgeLabel) {
      return;
    }
    const edgeStyle = edge.getStyle();
    const label = new Label(edgeLabel, {
      position: edge.getCenter(),
      textBaseline: LabelTextBaseline.MIDDLE,
      properties: {
        fontBackgroundColor: edgeStyle.fontBackgroundColor,
        fontColor: edgeStyle.fontColor,
        fontFamily: edgeStyle.fontFamily,
        fontSize: edgeStyle.fontSize
      }
    });
    drawLabel(context, label);
  };
  var drawLine = (context, edge) => {
    if (edge instanceof EdgeStraight) {
      return drawStraightLine(context, edge);
    }
    if (edge instanceof EdgeCurved) {
      return drawCurvedLine(context, edge);
    }
    if (edge instanceof EdgeLoopback) {
      return drawLoopbackLine(context, edge);
    }
    throw new Error("Failed to draw unsupported edge type");
  };
  var drawArrow = (context, edge) => {
    if (edge.getStyle().arrowSize === 0) {
      return;
    }
    const arrowShape = getArrowShape(edge);
    const keyPoints = [
      { x: 0, y: 0 },
      { x: -1, y: 0.4 },
      // { x: -0.9, y: 0 },
      { x: -1, y: -0.4 }
    ];
    const points = transformArrowPoints(keyPoints, arrowShape);
    context.beginPath();
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      if (i === 0) {
        context.moveTo(point.x, point.y);
        continue;
      }
      context.lineTo(point.x, point.y);
    }
    context.closePath();
    context.fill();
  };
  var getArrowShape = (edge) => {
    if (edge instanceof EdgeStraight) {
      return getStraightArrowShape(edge);
    }
    if (edge instanceof EdgeCurved) {
      return getCurvedArrowShape(edge);
    }
    if (edge instanceof EdgeLoopback) {
      return getLoopbackArrowShape(edge);
    }
    throw new Error("Failed to draw unsupported edge type");
  };
  var setupCanvas = (context, edge) => {
    const width = edge.getWidth();
    if (width > 0) {
      context.lineWidth = width;
    }
    const color2 = edge.getColor();
    if (color2) {
      context.strokeStyle = color2.toString();
      context.fillStyle = color2.toString();
    }
  };
  var setupShadow = (context, edge) => {
    const edgeStyle = edge.getStyle();
    if (edgeStyle.shadowColor) {
      context.shadowColor = edgeStyle.shadowColor.toString();
    }
    if (edgeStyle.shadowSize) {
      context.shadowBlur = edgeStyle.shadowSize;
    }
    if (edgeStyle.shadowOffsetX) {
      context.shadowOffsetX = edgeStyle.shadowOffsetX;
    }
    if (edgeStyle.shadowOffsetY) {
      context.shadowOffsetY = edgeStyle.shadowOffsetY;
    }
  };
  var clearShadow = (context, edge) => {
    const edgeStyle = edge.getStyle();
    if (edgeStyle.shadowColor) {
      context.shadowColor = "rgba(0,0,0,0)";
    }
    if (edgeStyle.shadowSize) {
      context.shadowBlur = 0;
    }
    if (edgeStyle.shadowOffsetX) {
      context.shadowOffsetX = 0;
    }
    if (edgeStyle.shadowOffsetY) {
      context.shadowOffsetY = 0;
    }
  };
  var transformArrowPoints = (points, arrow) => {
    const x3 = arrow.point.x;
    const y3 = arrow.point.y;
    const angle = arrow.angle;
    const length = arrow.length;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const xt = p.x * Math.cos(angle) - p.y * Math.sin(angle);
      const yt = p.x * Math.sin(angle) + p.y * Math.cos(angle);
      p.x = x3 + length * xt;
      p.y = y3 + length * yt;
    }
    return points;
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/canvas/shapes.js
  var drawCircle = (context, x3, y3, r) => {
    context.beginPath();
    context.arc(x3, y3, r, 0, 2 * Math.PI, false);
    context.closePath();
  };
  var drawSquare = (context, x3, y3, r) => {
    context.beginPath();
    context.rect(x3 - r, y3 - r, r * 2, r * 2);
    context.closePath();
  };
  var drawTriangleUp = (context, x3, y3, r) => {
    context.beginPath();
    r *= 1.15;
    y3 += 0.275 * r;
    const diameter = r * 2;
    const innerRadius = Math.sqrt(3) * diameter / 6;
    const height = Math.sqrt(diameter * diameter - r * r);
    context.moveTo(x3, y3 - (height - innerRadius));
    context.lineTo(x3 + r, y3 + innerRadius);
    context.lineTo(x3 - r, y3 + innerRadius);
    context.lineTo(x3, y3 - (height - innerRadius));
    context.closePath();
  };
  var drawTriangleDown = (context, x3, y3, r) => {
    context.beginPath();
    r *= 1.15;
    y3 -= 0.275 * r;
    const diameter = r * 2;
    const innerRadius = Math.sqrt(3) * diameter / 6;
    const height = Math.sqrt(diameter * diameter - r * r);
    context.moveTo(x3, y3 + (height - innerRadius));
    context.lineTo(x3 + r, y3 - innerRadius);
    context.lineTo(x3 - r, y3 - innerRadius);
    context.lineTo(x3, y3 + (height - innerRadius));
    context.closePath();
  };
  var drawStar = (context, x3, y3, r) => {
    context.beginPath();
    r *= 0.82;
    y3 += 0.1 * r;
    for (let n = 0; n < 10; n++) {
      const radius = r * (n % 2 === 0 ? 1.3 : 0.5);
      const newx = x3 + radius * Math.sin(n * 2 * Math.PI / 10);
      const newy = y3 - radius * Math.cos(n * 2 * Math.PI / 10);
      context.lineTo(newx, newy);
    }
    context.closePath();
  };
  var drawDiamond = (context, x3, y3, r) => {
    context.beginPath();
    context.lineTo(x3, y3 + r);
    context.lineTo(x3 + r, y3);
    context.lineTo(x3, y3 - r);
    context.lineTo(x3 - r, y3);
    context.closePath();
  };
  var drawHexagon = (context, x3, y3, r) => {
    drawNgon(context, x3, y3, r, 6);
  };
  var drawNgon = (context, x3, y3, r, sides) => {
    context.beginPath();
    context.moveTo(x3 + r, y3);
    const arcSide = Math.PI * 2 / sides;
    for (let i = 1; i < sides; i++) {
      context.lineTo(x3 + r * Math.cos(arcSide * i), y3 + r * Math.sin(arcSide * i));
    }
    context.closePath();
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/canvas/node.js
  var DEFAULT_LABEL_DISTANCE_SIZE_FROM_NODE = 0.2;
  var DEFAULT_IS_SHADOW_DRAW_ENABLED2 = true;
  var DEFAULT_IS_LABEL_DRAW_ENABLED2 = true;
  var drawNode = (context, node, options) => {
    var _a, _b;
    const isShadowEnabled = (_a = options === null || options === void 0 ? void 0 : options.isShadowEnabled) !== null && _a !== void 0 ? _a : DEFAULT_IS_SHADOW_DRAW_ENABLED2;
    const isLabelEnabled = (_b = options === null || options === void 0 ? void 0 : options.isLabelEnabled) !== null && _b !== void 0 ? _b : DEFAULT_IS_LABEL_DRAW_ENABLED2;
    const hasShadow = node.hasShadow();
    setupCanvas2(context, node);
    if (isShadowEnabled && hasShadow) {
      setupShadow2(context, node);
    }
    drawShape(context, node);
    context.fill();
    const image = node.getBackgroundImage();
    if (image) {
      drawImage(context, node, image);
    }
    if (isShadowEnabled && hasShadow) {
      clearShadow2(context, node);
    }
    if (node.hasBorder()) {
      context.stroke();
    }
    if (isLabelEnabled) {
      drawNodeLabel(context, node);
    }
  };
  var drawShape = (context, node) => {
    const center = node.getCenter();
    const radius = node.getRadius();
    switch (node.getStyle().shape) {
      case NodeShapeType.SQUARE: {
        drawSquare(context, center.x, center.y, radius);
        break;
      }
      case NodeShapeType.DIAMOND: {
        drawDiamond(context, center.x, center.y, radius);
        break;
      }
      case NodeShapeType.TRIANGLE: {
        drawTriangleUp(context, center.x, center.y, radius);
        break;
      }
      case NodeShapeType.TRIANGLE_DOWN: {
        drawTriangleDown(context, center.x, center.y, radius);
        break;
      }
      case NodeShapeType.STAR: {
        drawStar(context, center.x, center.y, radius);
        break;
      }
      case NodeShapeType.HEXAGON: {
        drawHexagon(context, center.x, center.y, radius);
        break;
      }
      default: {
        drawCircle(context, center.x, center.y, radius);
        break;
      }
    }
  };
  var drawNodeLabel = (context, node) => {
    const nodeLabel = node.getLabel();
    if (!nodeLabel) {
      return;
    }
    const center = node.getCenter();
    const distance = node.getBorderedRadius() * (1 + DEFAULT_LABEL_DISTANCE_SIZE_FROM_NODE);
    const nodeStyle = node.getStyle();
    const label = new Label(nodeLabel, {
      position: { x: center.x, y: center.y + distance },
      textBaseline: LabelTextBaseline.TOP,
      properties: {
        fontBackgroundColor: nodeStyle.fontBackgroundColor,
        fontColor: nodeStyle.fontColor,
        fontFamily: nodeStyle.fontFamily,
        fontSize: nodeStyle.fontSize
      }
    });
    drawLabel(context, label);
  };
  var drawImage = (context, node, image) => {
    if (!image.width || !image.height) {
      return;
    }
    const center = node.getCenter();
    const radius = node.getRadius();
    const scale = Math.max(radius * 2 / image.width, radius * 2 / image.height);
    const height = image.height * scale;
    const width = image.width * scale;
    context.save();
    context.clip();
    context.drawImage(image, center.x - width / 2, center.y - height / 2, width, height);
    context.restore();
  };
  var setupCanvas2 = (context, node) => {
    const hasBorder = node.hasBorder();
    if (hasBorder) {
      context.lineWidth = node.getBorderWidth();
      const borderColor = node.getBorderColor();
      if (borderColor) {
        context.strokeStyle = borderColor.toString();
      }
    }
    const color2 = node.getColor();
    if (color2) {
      context.fillStyle = color2.toString();
    }
  };
  var setupShadow2 = (context, node) => {
    const nodeStyle = node.getStyle();
    if (nodeStyle.shadowColor) {
      context.shadowColor = nodeStyle.shadowColor.toString();
    }
    if (nodeStyle.shadowSize) {
      context.shadowBlur = nodeStyle.shadowSize;
    }
    if (nodeStyle.shadowOffsetX) {
      context.shadowOffsetX = nodeStyle.shadowOffsetX;
    }
    if (nodeStyle.shadowOffsetY) {
      context.shadowOffsetY = nodeStyle.shadowOffsetY;
    }
  };
  var clearShadow2 = (context, node) => {
    const nodeStyle = node.getStyle();
    if (nodeStyle.shadowColor) {
      context.shadowColor = "rgba(0,0,0,0)";
    }
    if (nodeStyle.shadowSize) {
      context.shadowBlur = 0;
    }
    if (nodeStyle.shadowOffsetX) {
      context.shadowOffsetX = 0;
    }
    if (nodeStyle.shadowOffsetY) {
      context.shadowOffsetY = 0;
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/utils/function.utils.js
  var throttle = (fn, waitMs = 300) => {
    let lastTime = 0;
    let timer2 = null;
    return function() {
      const args = arguments;
      const now2 = Date.now();
      const remaining = waitMs - (now2 - lastTime);
      if (remaining <= 0) {
        if (timer2) {
          clearTimeout(timer2);
          timer2 = null;
        }
        lastTime = now2;
        fn(...args);
      } else if (!timer2) {
        timer2 = setTimeout(() => {
          lastTime = Date.now();
          timer2 = null;
          fn(...args);
        }, remaining);
      }
    };
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/utils/math.utils.js
  var getThrottleMsFromFPS = (fps) => {
    const validFps = Math.max(fps, 1);
    return Math.round(1e3 / validFps);
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/utils/html.utils.js
  var setupContainer = (container, areCollapsedDimensionsAllowed = false) => {
    container.style.position = "relative";
    const style = getComputedStyle(container);
    if (!style.display) {
      container.style.display = "block";
      console.warn("[Orb] Graph container doesn't have defined 'display' property. Setting 'display' to 'block'...");
    }
    if (!areCollapsedDimensionsAllowed && isCollapsedDimension(style.width)) {
      container.style.width = "100%";
      if (isCollapsedDimension(getComputedStyle(container).width)) {
        container.style.width = "400px";
        console.warn("[Orb] The graph container element and its parent don't have defined width properties.", "If you are using percentage values,", "please make sure that the parent element of the graph container has a defined position and width.", "Setting the width of the graph container to an arbitrary value of '400px'...");
      } else {
        console.warn("[Orb] The graph container element doesn't have defined width. Setting width to 100%...");
      }
    }
    if (!areCollapsedDimensionsAllowed && isCollapsedDimension(style.height)) {
      container.style.height = "100%";
      if (isCollapsedDimension(getComputedStyle(container).height)) {
        container.style.height = "400px";
        console.warn("[Orb] The graph container element and its parent don't have defined height properties.", "If you are using percentage values,", "please make sure that the parent element of the graph container has a defined position and height.", "Setting the height of the graph container to an arbitrary value of '400px'...");
      } else {
        console.warn("[Orb] Graph container doesn't have defined height. Setting height to 100%...");
      }
    }
  };
  var collapsedDimensionRegex = /^\s*0+\s*(?:px|rem|em|vh|vw)?\s*$/i;
  var isCollapsedDimension = (dimension) => {
    if (dimension === null || dimension === void 0 || dimension === "") {
      return true;
    }
    return collapsedDimensionRegex.test(dimension);
  };
  var appendCanvas = (container) => {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    container.appendChild(canvas);
    return canvas;
  };
  var observeDevicePixelRatioChanges = (callback) => {
    let currentDpr = window.devicePixelRatio;
    let unsubscribe = () => {
      return;
    };
    const listenForDPRChanges = () => {
      unsubscribe();
      const media = matchMedia(`(resolution: ${currentDpr}dppx)`);
      media.addEventListener("change", listenForDPRChanges);
      unsubscribe = () => media.removeEventListener("change", listenForDPRChanges);
      if (window.devicePixelRatio !== currentDpr) {
        currentDpr = window.devicePixelRatio;
        callback(currentDpr);
      }
    };
    listenForDPRChanges();
    return () => unsubscribe();
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/canvas/canvas-renderer.js
  var DEBUG = false;
  var DEBUG_RED = "#FF5733";
  var DEBUG_GREEN = "#3CFF33";
  var DEBUG_BLUE = "#3383FF";
  var DEBUG_PINK = "#F333FF";
  var CanvasRenderer = class extends Emitter {
    constructor(container, settings) {
      super();
      this._isOriginCentered = false;
      this._isInitiallyRendered = false;
      setupContainer(container, settings === null || settings === void 0 ? void 0 : settings.areCollapsedContainerDimensionsAllowed);
      this._container = container;
      this._canvas = appendCanvas(container);
      const context = this._canvas.getContext("2d");
      if (!context) {
        throw new OrbError("Failed to create Canvas context.");
      }
      this._context = context;
      this._width = DEFAULT_RENDERER_WIDTH;
      this._height = DEFAULT_RENDERER_HEIGHT;
      this.transform = identity2;
      this._settings = Object.assign(Object.assign({}, DEFAULT_RENDERER_SETTINGS), settings);
      this._resizeObs = new ResizeObserver(() => this._resize());
      this._resizeObs.observe(this._container);
      this._resize();
      if (!isNumber(settings === null || settings === void 0 ? void 0 : settings.devicePixelRatio)) {
        this._dprObserveUnsubscribe = observeDevicePixelRatioChanges(() => this._resize());
      }
      this._throttleRender = throttle((graph) => {
        this._render(graph);
      }, getThrottleMsFromFPS(this._settings.fps));
    }
    get width() {
      return this._width;
    }
    get height() {
      return this._height;
    }
    get container() {
      return this._container;
    }
    get canvas() {
      return this._canvas;
    }
    get isInitiallyRendered() {
      return this._isInitiallyRendered;
    }
    getSettings() {
      return copyObject(this._settings);
    }
    setSettings(settings) {
      var _a;
      const isFpsChanged = settings.fps && settings.fps !== this._settings.fps;
      const previousDprValue = this._settings.devicePixelRatio;
      const newDprValue = settings.devicePixelRatio;
      this._settings = Object.assign(Object.assign({}, this._settings), settings);
      if (isFpsChanged) {
        this._throttleRender = throttle((graph) => {
          this._render(graph);
        }, getThrottleMsFromFPS(this._settings.fps));
      }
      if (!isNumber(previousDprValue) && isNumber(newDprValue)) {
        (_a = this._dprObserveUnsubscribe) === null || _a === void 0 ? void 0 : _a.call(this);
        this._resize();
      }
      if (isNumber(previousDprValue) && newDprValue === null) {
        this._dprObserveUnsubscribe = observeDevicePixelRatioChanges(() => this._resize());
      }
    }
    render(graph) {
      this._throttleRender(graph);
    }
    _render(graph) {
      this.emit(RenderEventType.RENDER_START, void 0);
      const renderStartedAt = Date.now();
      this._context.clearRect(0, 0, this._width, this._height);
      if (this._settings.backgroundColor) {
        this._context.fillStyle = this._settings.backgroundColor.toString();
        this._context.fillRect(0, 0, this._width, this._height);
      }
      this._context.save();
      if (DEBUG) {
        this._context.lineWidth = 3;
        this._context.fillStyle = DEBUG_RED;
        this._context.fillRect(0, 0, this._width, this._height);
      }
      this._context.translate(this.transform.x, this.transform.y);
      if (DEBUG) {
        this._context.fillStyle = DEBUG_BLUE;
        this._context.fillRect(0, 0, this._width, this._height);
      }
      this._context.scale(this.transform.k, this.transform.k);
      if (DEBUG) {
        this._context.fillStyle = DEBUG_GREEN;
        this._context.fillRect(0, 0, this._width, this._height);
      }
      if (this._isOriginCentered) {
        this._context.translate(this._width / 2, this._height / 2);
      }
      if (DEBUG) {
        this._context.fillStyle = DEBUG_PINK;
        this._context.fillRect(0, 0, this._width, this._height);
      }
      this.drawObjects(graph.getEdges());
      this.drawObjects(graph.getNodes());
      this._context.restore();
      this.emit(RenderEventType.RENDER_END, { durationMs: Date.now() - renderStartedAt });
      this._isInitiallyRendered = true;
    }
    drawObjects(objects) {
      if (objects.length === 0) {
        return;
      }
      const selectedObjects = [];
      const hoveredObjects = [];
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        if (obj.isSelected()) {
          selectedObjects.push(obj);
        }
        if (obj.isHovered()) {
          hoveredObjects.push(obj);
        }
      }
      const hasStateChangedShapes = selectedObjects.length || hoveredObjects.length;
      if (this._settings.contextAlphaOnEventIsEnabled && hasStateChangedShapes) {
        this._context.globalAlpha = this._settings.contextAlphaOnEvent;
      }
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        if (!obj.isSelected() && !obj.isHovered()) {
          this.drawObject(obj, {
            isLabelEnabled: this._settings.labelsIsEnabled,
            isShadowEnabled: this._settings.shadowIsEnabled
          });
        }
      }
      if (this._settings.contextAlphaOnEventIsEnabled && hasStateChangedShapes) {
        this._context.globalAlpha = 1;
      }
      for (let i = 0; i < selectedObjects.length; i++) {
        this.drawObject(selectedObjects[i], {
          isLabelEnabled: this._settings.labelsOnEventIsEnabled,
          isShadowEnabled: this._settings.shadowOnEventIsEnabled
        });
      }
      for (let i = 0; i < hoveredObjects.length; i++) {
        this.drawObject(hoveredObjects[i], {
          isLabelEnabled: this._settings.labelsOnEventIsEnabled,
          isShadowEnabled: this._settings.shadowOnEventIsEnabled
        });
      }
    }
    _resize() {
      const dpr = this._settings.devicePixelRatio || window.devicePixelRatio || 1;
      const containerSize = this._container.getBoundingClientRect();
      this._canvas.style.width = `${containerSize.width}px`;
      this._canvas.style.height = `${containerSize.height}px`;
      this._canvas.width = containerSize.width * dpr;
      this._canvas.height = containerSize.height * dpr;
      this._context.scale(dpr, dpr);
      this._width = containerSize.width;
      this._height = containerSize.height;
      this.emit(RenderEventType.RESIZE, void 0);
    }
    drawObject(obj, options) {
      if (isNode(obj)) {
        drawNode(this._context, obj, options);
      } else {
        drawEdge(this._context, obj, options);
      }
    }
    reset() {
      this.transform = identity2;
      this._context.clearRect(0, 0, this._width, this._height);
      this._context.save();
    }
    getFitZoomTransform(graph, options) {
      const graphView = graph.getBoundingBox();
      const graphMiddleX = (options === null || options === void 0 ? void 0 : options.anchorX) === "center" ? graphView.x + graphView.width / 2 : (options === null || options === void 0 ? void 0 : options.anchorX) === "end" ? graphView.x + graphView.width : 0;
      const graphMiddleY = (options === null || options === void 0 ? void 0 : options.anchorY) === "center" ? graphView.y + graphView.height / 2 : (options === null || options === void 0 ? void 0 : options.anchorY) === "end" ? graphView.y + graphView.height : 0;
      const simulationView = this.getSimulationViewRectangle();
      const heightScale = simulationView.height / (graphView.height * (1 + this._settings.fitZoomMargin));
      const widthScale = simulationView.width / (graphView.width * (1 + this._settings.fitZoomMargin));
      const scale = Math.min(heightScale, widthScale);
      const previousZoom = this.transform.k;
      const newZoom = Math.max(Math.min(scale * previousZoom, this._settings.maxZoom), this._settings.minZoom);
      const newX = simulationView.width / 2 * previousZoom * (1 - newZoom) - graphMiddleX * newZoom;
      const newY = simulationView.height / 2 * previousZoom * (1 - newZoom) - graphMiddleY * newZoom;
      return identity2.translate(newX, newY).scale(newZoom);
    }
    getSimulationPosition(canvasPoint) {
      const [x3, y3] = this.transform.invert([canvasPoint.x, canvasPoint.y]);
      return {
        x: x3 - this._width / 2,
        y: y3 - this._height / 2
      };
    }
    getCanvasPosition(simulationPoint) {
      const [x3, y3] = this.transform.apply([simulationPoint.x + this._width / 2, simulationPoint.y + this._height / 2]);
      return { x: x3, y: y3 };
    }
    /**
     * Returns the visible rectangle view in the simulation coordinates.
     *
     * @return {IRectangle} Visible view in the simulation coordinates
     */
    getSimulationViewRectangle() {
      const topLeftPosition = this.getSimulationPosition({ x: 0, y: 0 });
      const bottomRightPosition = this.getSimulationPosition({ x: this._width, y: this._height });
      return {
        x: topLeftPosition.x,
        y: topLeftPosition.y,
        width: bottomRightPosition.x - topLeftPosition.x,
        height: bottomRightPosition.y - topLeftPosition.y
      };
    }
    translateOriginToCenter() {
      this._isOriginCentered = true;
    }
    destroy() {
      var _a;
      this._resizeObs.unobserve(this._container);
      (_a = this._dprObserveUnsubscribe) === null || _a === void 0 ? void 0 : _a.call(this);
      this.removeAllListeners();
      this._canvas.remove();
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/utils/program.utils.js
  var createProgram = (gl, vertexSource, fragmentSource) => {
    const vertexShader = compileShader(gl, vertexSource, ShaderType.VERTEX);
    const fragmentShader = compileShader(gl, fragmentSource, ShaderType.FRAGMENT);
    const program = gl.createProgram();
    if (!program) {
      throw new OrbError("Failed to create GL program.");
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new OrbError(`Failed to link GL program: ${info}`);
    }
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return program;
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/webgl/shaders/node/node.vert.js
  var node_vert_default = `#version 300 es

precision highp float;

in vec2 aQuadPosition;

in vec2 aCenter;
in float aRadius;
in vec4 aColor;
in vec4 aBorderColor;
in float aBorderWidth;
in vec4 aShadowColor;
in float aShadowSize;
in float aShadowOffsetX;
in float aShadowOffsetY;
in float aShapeType;
in vec2 aImageUV0;
in vec2 aImageUV1;
in float aImageAspect;

uniform vec2 uResolution;
uniform vec2 uTranslation;
uniform float uScale;
uniform vec2 uOriginOffset;

out vec2 vUV;
out vec4 vColor;
out vec4 vBorderColor;
out float vBorderThreshold;
out vec4 vShadowColor;
out float vNodeRadius;
out vec2 vShadowOffset;
out float vShadowBlur;
flat out int vShapeType;
out vec2 vImageUV0;
out vec2 vImageUV1;
out float vImageAspect;

void main() {
  vShapeType = int(aShapeType + 0.5);
  vColor = aColor;
  vBorderColor = aBorderColor;
  vShadowColor = aShadowColor;
  vImageUV0 = aImageUV0;
  vImageUV1 = aImageUV1;
  vImageAspect = aImageAspect;

  float totalRadius = aRadius + aShadowSize + abs(aShadowOffsetX) + abs(aShadowOffsetY);

  vUV = aQuadPosition;
  vNodeRadius = aRadius / totalRadius;

  vBorderThreshold = vNodeRadius * (1.0 - aBorderWidth / aRadius);

  vShadowOffset = vec2(aShadowOffsetX, aShadowOffsetY) / totalRadius;

  vShadowBlur = aShadowSize / totalRadius;

  vec2 worldPos = aCenter + aQuadPosition * totalRadius;
  vec2 screenPos = (worldPos + uOriginOffset) * uScale + uTranslation;

  vec2 clip = (screenPos / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/webgl/shaders/node/node.frag.js
  var node_frag_default = `#version 300 es

precision highp float;

in vec2 vUV;
in vec4 vColor;
in vec4 vBorderColor;
in float vBorderThreshold;
in vec4 vShadowColor;
in float vNodeRadius;
in vec2 vShadowOffset;
in float vShadowBlur;
flat in int vShapeType;
in vec2 vImageUV0;
in vec2 vImageUV1;
in float vImageAspect;

uniform sampler2D uImageAtlas;

out vec4 fragColor;

const int SHAPE_CIRCLE = 0;
const int SHAPE_DOT = 1;
const int SHAPE_SQUARE = 2;
const int SHAPE_DIAMOND = 3;
const int SHAPE_TRIANGLE = 4;
const int SHAPE_TRIANGLE_DOWN = 5;
const int SHAPE_STAR = 6;
const int SHAPE_HEXAGON = 7;

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float sdSquare(vec2 p, float r) {
  vec2 d = abs(p) - vec2(r);
  return max(d.x, d.y);
}

float sdDiamond(vec2 p, float r) {
  return (abs(p.x) + abs(p.y)) - r;
}

float sdTriangleDown(vec2 p, float r) {
  float sr = r * 1.15;
  vec2 q = vec2(p.x, p.y - 0.275 * sr);

  float k = sqrt(3.0);
  q.x = abs(q.x) - sr;
  q.y = q.y + sr / k;
  if (q.x + k * q.y > 0.0) {
    q = vec2(q.x - k * q.y, -k * q.x - q.y) / 2.0;
  }
  q.x -= clamp(q.x, -2.0 * sr, 0.0);
  return -length(q) * sign(q.y);
}

float sdTriangleUp(vec2 p, float r) {
  return sdTriangleDown(vec2(p.x, -p.y), r);
}

float sdStar(vec2 p, float r) {
  float sr = r * 0.82;
  vec2 q = vec2(p.x, p.y - 0.1 * sr);

  float outerR = sr * 1.3;
  float innerR = sr * 0.5;

  float angle = atan(q.x, -q.y);
  float sector = 6.2831853 / 5.0;
  float a = mod(angle + sector * 0.5, sector) - sector * 0.5;

  float cosA = cos(a);
  float sinA = abs(sin(a));

  float halfSector = sector * 0.5;
  vec2 outerPt = vec2(outerR, 0.0);
  vec2 innerPt = vec2(innerR * cos(halfSector), innerR * sin(halfSector));

  vec2 sp = vec2(cosA, sinA) * length(q);

  vec2 edge = innerPt - outerPt;
  vec2 toP = sp - outerPt;
  float t = clamp(dot(toP, edge) / dot(edge, edge), 0.0, 1.0);
  float dist = length(toP - edge * t);

  float cross2d = edge.x * toP.y - edge.y * toP.x;
  return cross2d > 0.0 ? -dist : dist;
}

float sdHexagon(vec2 p, float r) {
  vec2 q = abs(p);
  float k = sqrt(3.0);
  float d = max(q.x, (q.x * 0.5 + q.y * (k * 0.5)));
  return d - r;
}

float shapeSDF(vec2 p, float r, int shapeType) {
  if (shapeType == SHAPE_SQUARE) return sdSquare(p, r);
  if (shapeType == SHAPE_DIAMOND) return sdDiamond(p, r);
  if (shapeType == SHAPE_TRIANGLE) return sdTriangleUp(p, r);
  if (shapeType == SHAPE_TRIANGLE_DOWN) return sdTriangleDown(p, r);
  if (shapeType == SHAPE_STAR) return sdStar(p, r);
  if (shapeType == SHAPE_HEXAGON) return sdHexagon(p, r);

  return sdCircle(p, r);
}

void main() {
  // Body SDF - always needed.
  float dist = shapeSDF(vUV, vNodeRadius, vShapeType);

  float aa = 0.02 * vNodeRadius;
  float nodeAlpha = 1.0 - smoothstep(-aa, 0.0, dist);

  // Shadow SDF - skip entirely when no shadow. Avoids a second full shapeSDF() call
  // (which is a cascade of ifs) and the exp() per fragment.
  float shadowAlpha = 0.0;
  if (vShadowBlur > 0.0) {
    float shadowDist = shapeSDF(vUV - vShadowOffset, vNodeRadius, vShapeType);
    float t = max(shadowDist, 0.0) / vShadowBlur;
    shadowAlpha = exp(-t * t * 1.5) * 0.5 * vShadowColor.a;
  }

  vec4 fillColor = vColor;
  if (vImageAspect > 0.0 && dist < 0.0) {
    vec2 uv01 = (vUV / vNodeRadius) * 0.5 + 0.5;
    if (vImageAspect > 1.0) {
      uv01.x = (uv01.x - 0.5) / vImageAspect + 0.5;
    } else {
      uv01.y = (uv01.y - 0.5) * vImageAspect + 0.5;
    }
    if (uv01.x >= 0.0 && uv01.x <= 1.0 && uv01.y >= 0.0 && uv01.y <= 1.0) {
      vec2 atlasUV = mix(vImageUV0, vImageUV1, uv01);
      vec4 imgTexel = texture(uImageAtlas, atlasUV);
      fillColor = mix(fillColor, vec4(imgTexel.rgb, 1.0), imgTexel.a);
    }
  }

  vec4 nodeColor;
  if (vBorderThreshold < vNodeRadius) {
    float borderDist = shapeSDF(vUV, vBorderThreshold, vShapeType);
    float borderMix = smoothstep(-aa, aa, borderDist);
    nodeColor = mix(fillColor, vBorderColor, borderMix);
  } else {
    nodeColor = fillColor;
  }
  nodeColor.a *= nodeAlpha;

  float finalAlpha = nodeColor.a + shadowAlpha * (1.0 - nodeColor.a);

  if (finalAlpha < 0.001) {
    discard;
  }

  if (shadowAlpha > 0.0) {
    vec3 finalRGB = (nodeColor.rgb * nodeColor.a + vShadowColor.rgb * shadowAlpha * (1.0 - nodeColor.a)) / finalAlpha;
    fragColor = vec4(finalRGB, finalAlpha);
  } else {
    fragColor = nodeColor;
  }
}
`;

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/webgl/shaders/edge/edge.vert.js
  var edge_vert_default = `#version 300 es

precision highp float;

in vec2 aQuadPosition;

in vec2 aStart;
in vec2 aEnd;
in vec2 aControl;
in float aWidth;
in float aEdgeType;
in float aLoopbackRadius;
in float aArrowSize;
in vec2 aArrowTip;
in vec2 aArrowDir;
in vec4 aColor;
in vec4 aShadowColor;
in float aShadowSize;
in float aShadowOffsetX;
in float aShadowOffsetY;

uniform vec2 uResolution;
uniform vec2 uTranslation;
uniform float uScale;
uniform vec2 uOriginOffset;

out vec2 vWorldPos;
out vec2 vStart;
out vec2 vEnd;
out vec2 vControl;
out float vHalfWidth;
out float vWidthFade;
out float vHalfWidthPx;
out float vPerpPx;
out float vLoopbackRadius;
out float vArrowSize;
out vec2 vArrowTip;
out vec2 vArrowDir;
out vec4 vColor;
out vec4 vShadowColor;
out float vShadowSize;
out vec2 vShadowOffset;
flat out int vEdgeType;

void main() {
  vEdgeType = int(aEdgeType + 0.5);
  vStart = aStart;
  vEnd = aEnd;
  vControl = aControl;
  float effectiveWidth = max(aWidth, 1.0 / uScale);
  vHalfWidth = effectiveWidth * 0.5;
  vWidthFade = clamp(aWidth * uScale, 0.0, 1.0);
  vHalfWidthPx = vHalfWidth * uScale;
  vPerpPx = 0.0;
  vLoopbackRadius = aLoopbackRadius;
  vArrowSize = aArrowSize;
  vArrowTip = aArrowTip;
  vArrowDir = aArrowDir;
  vColor = aColor;
  vShadowColor = aShadowColor;
  vShadowSize = aShadowSize;
  vShadowOffset = vec2(aShadowOffsetX, aShadowOffsetY);

  float pad = vHalfWidth + aShadowSize + abs(aShadowOffsetX) + abs(aShadowOffsetY);

  vec2 worldPos;

  if (vEdgeType == 0) {
    vec2 dir = aEnd - aStart;
    float len = length(dir);
    vec2 unitDir = dir / max(len, 0.0001);
    vec2 perp = vec2(-unitDir.y, unitDir.x);
    float totalHalf = pad + aArrowSize;
    vec2 midpoint = (aStart + aEnd) * 0.5;
    worldPos = midpoint
      + unitDir * (len * 0.5 + totalHalf) * aQuadPosition.x
      + perp * totalHalf * aQuadPosition.y;
    vPerpPx = totalHalf * aQuadPosition.y * uScale;
  } else if (vEdgeType == 1) {
    float margin = pad + aArrowSize;
    vec2 bboxMin = min(min(aStart, aEnd), aControl) - margin;
    vec2 bboxMax = max(max(aStart, aEnd), aControl) + margin;
    vec2 center = (bboxMin + bboxMax) * 0.5;
    vec2 halfSize = (bboxMax - bboxMin) * 0.5;
    worldPos = center + aQuadPosition * halfSize;
  } else {
    float margin = pad + aArrowSize;
    vec2 ctr = aControl;
    float r = aLoopbackRadius;
    vec2 bboxMin = min(ctr - (r + margin), aStart - margin);
    vec2 bboxMax = max(ctr + (r + margin), aStart + margin);
    vec2 center = (bboxMin + bboxMax) * 0.5;
    vec2 halfSize = (bboxMax - bboxMin) * 0.5;
    worldPos = center + aQuadPosition * halfSize;
  }

  vWorldPos = worldPos;
  vec2 screenPos = (worldPos + uOriginOffset) * uScale + uTranslation;
  vec2 clip = (screenPos / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/webgl/shaders/edge/edge.frag.js
  var edge_frag_default = `#version 300 es

precision highp float;

in vec2 vWorldPos;
in vec2 vStart;
in vec2 vEnd;
in vec2 vControl;
in float vHalfWidth;
in float vWidthFade;
in float vHalfWidthPx;
in float vPerpPx;
in float vLoopbackRadius;
in float vArrowSize;
in vec2 vArrowTip;
in vec2 vArrowDir;
in vec4 vColor;
in vec4 vShadowColor;
in float vShadowSize;
in vec2 vShadowOffset;
flat in int vEdgeType;

uniform bool uSimpleMode;

out vec4 fragColor;

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C) {
  vec2 a = B - A;
  vec2 b = A - 2.0 * B + C;
  vec2 c = a * 2.0;
  vec2 d = A - pos;

  float kk = 1.0 / max(dot(b, b), 0.0001);
  float kx = kk * dot(a, b);
  float ky = kk * (2.0 * dot(a, a) + dot(d, b)) / 3.0;
  float kz = kk * dot(d, a);

  float p = ky - kx * kx;
  float q = kx * (2.0 * kx * kx - 3.0 * ky) + kz;
  float p3 = p * p * p;
  float q2 = q * q;
  float h = q2 + 4.0 * p3;

  float res;
  if (h >= 0.0) {
    h = sqrt(h);
    vec2 x = (vec2(h, -h) - q) / 2.0;
    vec2 uv = sign(x) * pow(abs(x), vec2(1.0 / 3.0));
    float t = clamp(uv.x + uv.y - kx, 0.0, 1.0);
    vec2 qo = d + (c + b * t) * t;
    res = dot(qo, qo);
  } else {
    float z = sqrt(-p);
    float v = acos(q / (p * z * 2.0)) / 3.0;
    float m = cos(v);
    float n = sin(v) * 1.732050808;
    vec3 t = clamp(vec3(m + m, -n - m, n - m) * z - kx, 0.0, 1.0);
    vec2 qx = d + (c + b * t.x) * t.x;
    float dx = dot(qx, qx);
    vec2 qy = d + (c + b * t.y) * t.y;
    float dy = dot(qy, qy);
    res = min(dx, dy);
  }

  return sqrt(res);
}

float sdArrow(vec2 p, vec2 tip, vec2 dir, float size) {
  if (size <= 0.0) return 1e6;

  vec2 perp = vec2(-dir.y, dir.x);
  vec2 rel = p - tip;
  float along = dot(rel, -dir);
  float across = dot(rel, perp);

  if (along < 0.0) return length(rel);
  if (along > size) {
    float hw = size * 0.4;
    float closest = clamp(across, -hw, hw);
    vec2 pt = tip - dir * size + perp * closest;
    return length(p - pt);
  }

  float halfW = (along / size) * size * 0.4;
  float d = abs(across) - halfW;
  return d;
}

void main() {
  if (uSimpleMode && vEdgeType == 0) {
    float cover = clamp(vHalfWidthPx - abs(vPerpPx) + 0.5, 0.0, 1.0);
    float a = cover * vWidthFade;
    if (a < 0.001) discard;
    fragColor = vec4(vColor.rgb, vColor.a * a);
    return;
  }

  float dist;
  if (vEdgeType == 0) {
    dist = sdSegment(vWorldPos, vStart, vEnd);
  } else if (vEdgeType == 1) {
    dist = sdBezier(vWorldPos, vStart, vControl, vEnd);
  } else {
    dist = abs(length(vWorldPos - vControl) - vLoopbackRadius);
  }

  float edgeSdf = dist - vHalfWidth;
  float combinedSdf = edgeSdf;

  if (vArrowSize > 0.0) {
    float arrowDist = sdArrow(vWorldPos, vArrowTip, vArrowDir, vArrowSize);
    combinedSdf = min(edgeSdf, arrowDist);
  }

  float shadowAlpha = 0.0;
  if (vShadowSize > 0.0) {
    vec2 shadowPos = vWorldPos - vShadowOffset;
    float shadowDist;
    if (vEdgeType == 0) {
      shadowDist = sdSegment(shadowPos, vStart, vEnd);
    } else if (vEdgeType == 1) {
      shadowDist = sdBezier(shadowPos, vStart, vControl, vEnd);
    } else {
      shadowDist = abs(length(shadowPos - vControl) - vLoopbackRadius);
    }
    float shadowArrowDist = vArrowSize > 0.0
      ? sdArrow(shadowPos, vArrowTip, vArrowDir, vArrowSize)
      : 1.0e6;
    float shadowCombined = min(shadowDist - vHalfWidth, shadowArrowDist);
    float t = max(shadowCombined, 0.0) / vShadowSize;
    shadowAlpha = exp(-t * t * 1.5) * 0.5 * vShadowColor.a;
  }

  float aa = fwidth(combinedSdf);
  float edgeAlpha = (1.0 - smoothstep(-aa, aa, combinedSdf)) * vWidthFade;
  vec4 edgeColor = vColor;
  edgeColor.a *= edgeAlpha;

  float finalAlpha = edgeColor.a + shadowAlpha * (1.0 - edgeColor.a);

  if (finalAlpha < 0.001) discard;

  if (shadowAlpha > 0.0) {
    vec3 finalRGB = (edgeColor.rgb * edgeColor.a + vShadowColor.rgb * shadowAlpha * (1.0 - edgeColor.a)) / finalAlpha;
    fragColor = vec4(finalRGB, finalAlpha);
  } else {
    fragColor = edgeColor;
  }
}
`;

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/webgl/shaders/label/label.vert.js
  var label_vert_default = `#version 300 es

in vec2 aQuadPosition;

in vec2 aLabelCenter;
in vec2 aLabelSize;
in vec2 aLabelUV0;
in vec2 aLabelUV1;

uniform vec2 uResolution;
uniform vec2 uTranslation;
uniform float uScale;
uniform vec2 uOriginOffset;

out vec2 vAtlasUV;

void main() {
  vec2 worldPos = aLabelCenter + aQuadPosition * aLabelSize;
  vec2 screenPos = (worldPos + uOriginOffset) * uScale + uTranslation;
  vec2 clip = (screenPos / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);

  vec2 uv01 = aQuadPosition * 0.5 + 0.5;
  vAtlasUV = mix(aLabelUV0, aLabelUV1, uv01);
}
`;

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/webgl/shaders/label/label.frag.js
  var label_frag_default = `#version 300 es

precision highp float;

uniform sampler2D uAtlas;

in vec2 vAtlasUV;

out vec4 fragColor;

void main() {
  vec4 texel = texture(uAtlas, vAtlasUV);
  if (texel.a < 0.01) discard;
  fragColor = texel;
}
`;

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/webgl/utils/label-cache.js
  var ATLAS_WIDTH = 2048;
  var ATLAS_HEIGHT = 2048;
  var RASTER_FONT_PX = 48;
  var FONT_LINE_SPACING2 = 1.2;
  var FONT_BACKGROUND_MARGIN2 = 0.12;
  var PADDING = 2;
  var LabelCache = class {
    constructor(gl) {
      this._texture = null;
      this._cache = /* @__PURE__ */ new Map();
      this._shelves = [];
      this._isDirty = false;
      this._isTextureAllocated = false;
      this._gl = gl;
      this._canvas = document.createElement("canvas");
      this._canvas.width = ATLAS_WIDTH;
      this._canvas.height = ATLAS_HEIGHT;
      this._ctx = this._canvas.getContext("2d", { willReadFrequently: false });
      this._texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this._texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    getOrCreate(text, fontSize, fontFamily, fontColor, bgColor) {
      const key = `${text}|${fontSize}|${fontFamily}|${fontColor}|${bgColor !== null && bgColor !== void 0 ? bgColor : ""}`;
      const cached = this._cache.get(key);
      if (cached) {
        return cached;
      }
      const lines = text.split("\n").map((l) => l.trim());
      if (lines.length === 0 || lines.length === 1 && lines[0] === "") {
        return null;
      }
      const ctx = this._ctx;
      const fontStr = `${RASTER_FONT_PX}px ${fontFamily}`;
      ctx.font = fontStr;
      let maxLineWidth = 0;
      for (let i = 0; i < lines.length; i++) {
        const w = ctx.measureText(lines[i]).width;
        if (w > maxLineWidth) {
          maxLineWidth = w;
        }
      }
      const margin = RASTER_FONT_PX * FONT_BACKGROUND_MARGIN2;
      const lineHeight = RASTER_FONT_PX * FONT_LINE_SPACING2;
      const textBlockHeight = RASTER_FONT_PX + (lines.length - 1) * lineHeight;
      const pxWidth = Math.ceil(maxLineWidth + margin * 2) + PADDING * 2;
      const pxHeight = Math.ceil(textBlockHeight + margin * 2) + PADDING * 2;
      const slot = this._allocate(pxWidth, pxHeight);
      if (!slot) {
        return null;
      }
      const ox = slot.x + PADDING;
      const oy = slot.y + PADDING;
      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(ox, oy, pxWidth - PADDING * 2, pxHeight - PADDING * 2);
      }
      ctx.font = fontStr;
      ctx.fillStyle = fontColor;
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      const centerX = ox + (pxWidth - PADDING * 2) / 2;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], centerX, oy + margin + i * lineHeight);
      }
      const entry = {
        u0: slot.x / ATLAS_WIDTH,
        v0: slot.y / ATLAS_HEIGHT,
        u1: (slot.x + pxWidth) / ATLAS_WIDTH,
        v1: (slot.y + pxHeight) / ATLAS_HEIGHT,
        pxWidth,
        pxHeight
      };
      this._cache.set(key, entry);
      this._isDirty = true;
      return entry;
    }
    bind(unit) {
      const gl = this._gl;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, this._texture);
    }
    uploadIfDirty() {
      if (!this._isDirty) {
        return;
      }
      const gl = this._gl;
      gl.bindTexture(gl.TEXTURE_2D, this._texture);
      if (!this._isTextureAllocated) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ATLAS_WIDTH, ATLAS_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        this._isTextureAllocated = true;
      }
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this._canvas);
      gl.bindTexture(gl.TEXTURE_2D, null);
      this._isDirty = false;
    }
    clear() {
      this._cache.clear();
      this._shelves = [];
      this._isDirty = false;
      this._ctx.clearRect(0, 0, ATLAS_WIDTH, ATLAS_HEIGHT);
    }
    get rasterFontPx() {
      return RASTER_FONT_PX;
    }
    _allocate(w, h) {
      for (let i = 0; i < this._shelves.length; i++) {
        const shelf = this._shelves[i];
        if (shelf.x + w <= ATLAS_WIDTH && h <= shelf.height) {
          const pos = { x: shelf.x, y: shelf.y };
          shelf.x += w;
          return pos;
        }
      }
      const shelfY = this._shelves.length === 0 ? 0 : this._shelves[this._shelves.length - 1].y + this._shelves[this._shelves.length - 1].height;
      if (shelfY + h > ATLAS_HEIGHT) {
        return null;
      }
      const newShelf = { y: shelfY, height: h, x: w };
      this._shelves.push(newShelf);
      return { x: 0, y: shelfY };
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/webgl/utils/image-atlas.js
  var ATLAS_WIDTH2 = 2048;
  var ATLAS_HEIGHT2 = 2048;
  var MAX_CELL_SIZE = 128;
  var PADDING2 = 2;
  var ImageAtlas = class {
    constructor(gl) {
      this._texture = null;
      this._cache = /* @__PURE__ */ new Map();
      this._pending = /* @__PURE__ */ new Map();
      this._shelves = [];
      this._isDirty = false;
      this._isTextureAllocated = false;
      this._gl = gl;
      this._canvas = document.createElement("canvas");
      this._canvas.width = ATLAS_WIDTH2;
      this._canvas.height = ATLAS_HEIGHT2;
      this._ctx = this._canvas.getContext("2d", { willReadFrequently: false });
      this._texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this._texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    getOrCreate(url) {
      const cached = this._cache.get(url);
      if (cached) {
        return cached;
      }
      const pending = this._pending.get(url);
      if (pending) {
        if (!pending.loaded) {
          return null;
        }
        return this._packImage(url, pending.image);
      }
      const image = new Image();
      image.crossOrigin = "anonymous";
      const record = { image, loaded: false };
      this._pending.set(url, record);
      image.onload = () => {
        record.loaded = true;
      };
      image.onerror = () => {
        this._pending.delete(url);
      };
      image.src = url;
      return null;
    }
    bind(unit) {
      const gl = this._gl;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, this._texture);
    }
    uploadIfDirty() {
      if (!this._isDirty) {
        return;
      }
      const gl = this._gl;
      gl.bindTexture(gl.TEXTURE_2D, this._texture);
      if (!this._isTextureAllocated) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ATLAS_WIDTH2, ATLAS_HEIGHT2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        this._isTextureAllocated = true;
      }
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this._canvas);
      gl.bindTexture(gl.TEXTURE_2D, null);
      this._isDirty = false;
    }
    clear() {
      this._cache.clear();
      this._pending.clear();
      this._shelves = [];
      this._isDirty = false;
      this._ctx.clearRect(0, 0, ATLAS_WIDTH2, ATLAS_HEIGHT2);
    }
    _packImage(url, image) {
      if (!image.naturalWidth || !image.naturalHeight) {
        return null;
      }
      const aspect = image.naturalWidth / image.naturalHeight;
      let drawW;
      let drawH;
      if (image.naturalWidth >= image.naturalHeight) {
        drawW = Math.min(image.naturalWidth, MAX_CELL_SIZE);
        drawH = Math.round(drawW / aspect);
      } else {
        drawH = Math.min(image.naturalHeight, MAX_CELL_SIZE);
        drawW = Math.round(drawH * aspect);
      }
      const cellW = drawW + PADDING2 * 2;
      const cellH = drawH + PADDING2 * 2;
      const slot = this._allocate(cellW, cellH);
      if (!slot) {
        return null;
      }
      this._ctx.drawImage(image, slot.x + PADDING2, slot.y + PADDING2, drawW, drawH);
      const entry = {
        u0: (slot.x + PADDING2) / ATLAS_WIDTH2,
        v0: (slot.y + PADDING2) / ATLAS_HEIGHT2,
        u1: (slot.x + PADDING2 + drawW) / ATLAS_WIDTH2,
        v1: (slot.y + PADDING2 + drawH) / ATLAS_HEIGHT2,
        aspect
      };
      this._cache.set(url, entry);
      this._pending.delete(url);
      this._isDirty = true;
      return entry;
    }
    _allocate(w, h) {
      for (let i = 0; i < this._shelves.length; i++) {
        const shelf = this._shelves[i];
        if (shelf.x + w <= ATLAS_WIDTH2 && h <= shelf.height) {
          const pos = { x: shelf.x, y: shelf.y };
          shelf.x += w;
          return pos;
        }
      }
      const shelfY = this._shelves.length === 0 ? 0 : this._shelves[this._shelves.length - 1].y + this._shelves[this._shelves.length - 1].height;
      if (shelfY + h > ATLAS_HEIGHT2) {
        return null;
      }
      const newShelf = { y: shelfY, height: h, x: w };
      this._shelves.push(newShelf);
      return { x: 0, y: shelfY };
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/webgl/webgl-renderer.js
  var EDGE_TYPE_STRAIGHT = 0;
  var EDGE_TYPE_CURVED = 1;
  var EDGE_TYPE_LOOPBACK = 2;
  var TRANSPARENT_RGBA = [0, 0, 0, 0];
  var EDGE_DEFAULT_RGBA = [0.6, 0.6, 0.6, 1];
  var NODE_DEFAULT_RGBA = [1, 0, 0, 1];
  var SHAPE_TYPE_MAP = {
    [NodeShapeType.CIRCLE]: 0,
    [NodeShapeType.DOT]: 1,
    [NodeShapeType.SQUARE]: 2,
    [NodeShapeType.DIAMOND]: 3,
    [NodeShapeType.TRIANGLE]: 4,
    [NodeShapeType.TRIANGLE_DOWN]: 5,
    [NodeShapeType.STAR]: 6,
    [NodeShapeType.HEXAGON]: 7
  };
  var DEFAULT_FONT_SIZE2 = 4;
  var DEFAULT_FONT_FAMILY2 = "Roboto, sans-serif";
  var DEFAULT_FONT_COLOR2 = "#000000";
  var LABEL_LOD_MIN_SCREEN_PX = 6;
  var IMAGE_LOD_MIN_SCREEN_PX = 4;
  var EDGE_SIMPLE_LOD_ZOOM = 0.2;
  var LABEL_DISTANCE_FROM_NODE = 0.2;
  var FLOATS_PER_LABEL = 8;
  var WebGLRenderer = class extends Emitter {
    constructor(container, settings) {
      super();
      this._isOriginCentered = false;
      this._isInitiallyRendered = false;
      this._nodeProgram = null;
      this._edgeProgram = null;
      this._labelProgram = null;
      this._nodeVao = null;
      this._edgeVao = null;
      this._labelVao = null;
      this._nodeInstanceBuffer = null;
      this._edgeInstanceBuffer = null;
      this._labelInstanceBuffer = null;
      this._labelCache = null;
      this._imageAtlas = null;
      this._isColorCacheDirty = true;
      this._nodeColorCache = /* @__PURE__ */ new Map();
      this._nodeBorderColorCache = /* @__PURE__ */ new Map();
      this._nodeShadowColorCache = /* @__PURE__ */ new Map();
      this._edgeColorCache = /* @__PURE__ */ new Map();
      this._edgeShadowColorCache = /* @__PURE__ */ new Map();
      this._lastNodeCount = 0;
      this._lastEdgeCount = 0;
      this._edgeInstanceData = null;
      this._nodeInstanceData = null;
      this._buffersAreCurrent = false;
      this._bufferCacheStats = { hits: 0, misses: 0 };
      this._timerExt = null;
      this._timerEdgeQueries = [];
      this._timerNodeQueries = [];
      this._timerQueryIdx = 0;
      this._lastEdgeGpuMs = null;
      this._lastNodeGpuMs = null;
      this._lastStyleVersion = -1;
      setupContainer(container, settings === null || settings === void 0 ? void 0 : settings.areCollapsedContainerDimensionsAllowed);
      this._container = container;
      this._canvas = appendCanvas(container);
      const gl = this._canvas.getContext("webgl2", { antialias: true });
      if (!gl) {
        throw new OrbError("Failed to create WebGL context.");
      }
      this._gl = gl;
      this._width = DEFAULT_RENDERER_WIDTH;
      this._height = DEFAULT_RENDERER_HEIGHT;
      this.transform = identity2;
      this._settings = Object.assign(Object.assign({}, DEFAULT_RENDERER_SETTINGS), settings);
      if (typeof (settings === null || settings === void 0 ? void 0 : settings.devicePixelRatio) !== "number") {
        this._dprObserveUnsubscribe = observeDevicePixelRatioChanges(() => {
          if (this._isInitiallyRendered) {
            this.emit(RenderEventType.RESIZE, void 0);
          }
        });
      }
      this._initShaders();
      this._initNodeBuffers();
      this._initEdgeBuffers();
      this._initLabelBuffers();
      this._labelCache = new LabelCache(this._gl);
      this._imageAtlas = new ImageAtlas(this._gl);
      this._timerExt = gl.getExtension("EXT_disjoint_timer_query_webgl2");
      if (this._timerExt) {
        for (let i = 0; i < 4; i++) {
          const eq = gl.createQuery();
          const nq = gl.createQuery();
          if (eq) {
            this._timerEdgeQueries.push(eq);
          }
          if (nq) {
            this._timerNodeQueries.push(nq);
          }
        }
      }
    }
    _pollTimerQuery(query) {
      if (!this._timerExt) {
        return null;
      }
      const gl = this._gl;
      const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
      if (!available) {
        return null;
      }
      if (gl.getParameter(this._timerExt.GPU_DISJOINT_EXT)) {
        return null;
      }
      const ns = gl.getQueryParameter(query, gl.QUERY_RESULT);
      return ns / 1e6;
    }
    getGpuTimeStats() {
      return {
        edgeMs: this._lastEdgeGpuMs,
        nodeMs: this._lastNodeGpuMs,
        supported: this._timerExt !== null
      };
    }
    _initShaders() {
      this._nodeProgram = createProgram(this._gl, node_vert_default, node_frag_default);
      this._edgeProgram = createProgram(this._gl, edge_vert_default, edge_frag_default);
      this._labelProgram = createProgram(this._gl, label_vert_default, label_frag_default);
    }
    _initNodeBuffers() {
      if (!this._nodeProgram) {
        throw new OrbError("Node program not initialized.");
      }
      const gl = this._gl;
      this._nodeVao = gl.createVertexArray();
      gl.bindVertexArray(this._nodeVao);
      const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
      const quadBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
      const posLoc = gl.getAttribLocation(this._nodeProgram, "aQuadPosition");
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      this._nodeInstanceBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this._nodeInstanceBuffer);
      const INSTANCE_STRIDE = 25 * Float32Array.BYTES_PER_ELEMENT;
      const attr = (name, size, offset) => {
        const loc = gl.getAttribLocation(this._nodeProgram, name);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, INSTANCE_STRIDE, offset * 4);
        gl.vertexAttribDivisor(loc, 1);
      };
      attr("aCenter", 2, 0);
      attr("aRadius", 1, 2);
      attr("aColor", 4, 3);
      attr("aBorderColor", 4, 7);
      attr("aBorderWidth", 1, 11);
      attr("aShadowColor", 4, 12);
      attr("aShadowSize", 1, 16);
      attr("aShadowOffsetX", 1, 17);
      attr("aShadowOffsetY", 1, 18);
      attr("aShapeType", 1, 19);
      attr("aImageUV0", 2, 20);
      attr("aImageUV1", 2, 22);
      attr("aImageAspect", 1, 24);
      gl.bindVertexArray(null);
    }
    _initEdgeBuffers() {
      if (!this._edgeProgram) {
        throw new OrbError("Edge program not initialized.");
      }
      const gl = this._gl;
      this._edgeVao = gl.createVertexArray();
      gl.bindVertexArray(this._edgeVao);
      const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
      const quadBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
      const posLoc = gl.getAttribLocation(this._edgeProgram, "aQuadPosition");
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      this._edgeInstanceBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this._edgeInstanceBuffer);
      const STRIDE = 25 * 4;
      const attr = (name, size, offset) => {
        const loc = gl.getAttribLocation(this._edgeProgram, name);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE, offset * 4);
        gl.vertexAttribDivisor(loc, 1);
      };
      attr("aStart", 2, 0);
      attr("aEnd", 2, 2);
      attr("aControl", 2, 4);
      attr("aWidth", 1, 6);
      attr("aEdgeType", 1, 7);
      attr("aLoopbackRadius", 1, 8);
      attr("aArrowSize", 1, 9);
      attr("aArrowTip", 2, 10);
      attr("aArrowDir", 2, 12);
      attr("aColor", 4, 14);
      attr("aShadowColor", 4, 18);
      attr("aShadowSize", 1, 22);
      attr("aShadowOffsetX", 1, 23);
      attr("aShadowOffsetY", 1, 24);
      gl.bindVertexArray(null);
    }
    _initLabelBuffers() {
      if (!this._labelProgram) {
        throw new OrbError("Label program not initialized.");
      }
      const gl = this._gl;
      this._labelVao = gl.createVertexArray();
      gl.bindVertexArray(this._labelVao);
      const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
      const quadBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
      const posLoc = gl.getAttribLocation(this._labelProgram, "aQuadPosition");
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      this._labelInstanceBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this._labelInstanceBuffer);
      const STRIDE = FLOATS_PER_LABEL * 4;
      const attr = (name, size, offset) => {
        const loc = gl.getAttribLocation(this._labelProgram, name);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE, offset * 4);
        gl.vertexAttribDivisor(loc, 1);
      };
      attr("aLabelCenter", 2, 0);
      attr("aLabelSize", 2, 2);
      attr("aLabelUV0", 2, 4);
      attr("aLabelUV1", 2, 6);
      gl.bindVertexArray(null);
    }
    _resolveColor(raw) {
      if (!raw) {
        return [1, 0, 0, 1];
      }
      if (raw instanceof Color) {
        return [raw.rgb.r / 255, raw.rgb.g / 255, raw.rgb.b / 255, 1];
      }
      const rgbaMatch = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/);
      if (rgbaMatch) {
        return [
          parseInt(rgbaMatch[1]) / 255,
          parseInt(rgbaMatch[2]) / 255,
          parseInt(rgbaMatch[3]) / 255,
          rgbaMatch[4] !== void 0 ? parseFloat(rgbaMatch[4]) : 1
        ];
      }
      const c2 = new Color(raw);
      return [c2.rgb.r / 255, c2.rgb.g / 255, c2.rgb.b / 255, 1];
    }
    _buildNodeColorCache(nodes) {
      this._nodeColorCache.clear();
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        this._nodeColorCache.set(node.id, this._resolveColor(node.getColor()));
      }
    }
    _buildNodeBorderColorCache(nodes) {
      this._nodeBorderColorCache.clear();
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        this._nodeBorderColorCache.set(node.id, this._resolveColor(node.getBorderColor()));
      }
    }
    _buildNodeShadowColorCache(nodes) {
      this._nodeShadowColorCache.clear();
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const raw = node.getStyle().shadowColor;
        this._nodeShadowColorCache.set(node.id, raw ? this._resolveColor(raw) : [0, 0, 0, 0]);
      }
    }
    _buildEdgeColorCache(edges) {
      this._edgeColorCache.clear();
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        this._edgeColorCache.set(edge.id, this._resolveColor(edge.getColor()));
      }
    }
    _buildEdgeShadowColorCache(edges) {
      this._edgeShadowColorCache.clear();
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const raw = edge.getStyle().shadowColor;
        this._edgeShadowColorCache.set(edge.id, raw ? this._resolveColor(raw) : [0, 0, 0, 0]);
      }
    }
    get width() {
      return this._width;
    }
    get height() {
      return this._height;
    }
    get container() {
      return this._container;
    }
    get canvas() {
      return this._canvas;
    }
    get isInitiallyRendered() {
      return this._isInitiallyRendered;
    }
    invalidateBuffers() {
      this._buffersAreCurrent = false;
    }
    invalidateStyles() {
      this._buffersAreCurrent = false;
      this._isColorCacheDirty = true;
    }
    getRenderCacheStats() {
      return Object.assign({}, this._bufferCacheStats);
    }
    getSettings() {
      return copyObject(this._settings);
    }
    setSettings(settings) {
      this._settings = Object.assign(Object.assign({}, this._settings), settings);
    }
    render(graph) {
      var _a, _b, _c, _d, _e;
      if (!this._nodeProgram || !this._edgeProgram || !this._labelProgram) {
        throw new OrbError("Shader programs not initialized.");
      }
      this.emit(RenderEventType.RENDER_START, void 0);
      const renderStartedAt = performance.now();
      const styleVersion = graph.getStyleVersion();
      if (styleVersion !== this._lastStyleVersion) {
        this.invalidateStyles();
        this._lastStyleVersion = styleVersion;
      }
      const gl = this._gl;
      const rect = this._container.getBoundingClientRect();
      const dpr = this._settings.devicePixelRatio || window.devicePixelRatio || 1;
      const deviceWidth = Math.max(1, Math.round(rect.width * dpr));
      const deviceHeight = Math.max(1, Math.round(rect.height * dpr));
      if (this._canvas.width !== deviceWidth || this._canvas.height !== deviceHeight) {
        this._canvas.width = deviceWidth;
        this._canvas.height = deviceHeight;
        this._canvas.style.width = `${rect.width}px`;
        this._canvas.style.height = `${rect.height}px`;
      }
      this._width = rect.width;
      this._height = rect.height;
      gl.viewport(0, 0, this._canvas.width, this._canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const edges = graph.getEdges();
      const FLOATS_PER_EDGE = 25;
      const edgeBufferLen = edges.length * FLOATS_PER_EDGE;
      const edgeBufferSizeChanged = this._edgeInstanceData === null || this._edgeInstanceData.length !== edgeBufferLen;
      if (edgeBufferSizeChanged) {
        this._edgeInstanceData = new Float32Array(edgeBufferLen);
      }
      const edgeData = this._edgeInstanceData;
      const canSkipRebuild = this._buffersAreCurrent && !edgeBufferSizeChanged;
      if (canSkipRebuild) {
        this._bufferCacheStats.hits++;
      } else {
        this._bufferCacheStats.misses++;
      }
      const contextAlpha = this._settings.contextAlphaOnEventIsEnabled ? this._settings.contextAlphaOnEvent : 1;
      const isDimmingActive = !canSkipRebuild && contextAlpha < 1;
      const hasStateChangedNodes = isDimmingActive && graph.getNodes().some((node) => node.isSelected() || node.isHovered());
      const hasStateChangedEdges = isDimmingActive && graph.getEdges().some((edge) => edge.isSelected() || edge.isHovered());
      let nodeCxCache = null;
      let nodeCyCache = null;
      let nodeBorderCache = null;
      let nodeIdToIndex = null;
      if (!canSkipRebuild) {
        const allNodes = graph.getNodes();
        nodeCxCache = new Float64Array(allNodes.length);
        nodeCyCache = new Float64Array(allNodes.length);
        nodeBorderCache = new Float64Array(allNodes.length);
        nodeIdToIndex = /* @__PURE__ */ new Map();
        for (let i = 0; i < allNodes.length; i++) {
          const n = allNodes[i];
          const c2 = n.getCenter();
          nodeCxCache[i] = c2.x;
          nodeCyCache[i] = c2.y;
          nodeBorderCache[i] = n.getDistanceToBorder();
          nodeIdToIndex.set(n.id, i);
        }
      }
      if (!canSkipRebuild && (edges.length !== this._lastEdgeCount || this._isColorCacheDirty)) {
        this._buildEdgeColorCache(edges);
        this._buildEdgeShadowColorCache(edges);
        this._isColorCacheDirty = false;
        this._lastEdgeCount = edges.length;
      }
      if (!canSkipRebuild) {
        for (let i = 0; i < edges.length; i++) {
          const edge = edges[i];
          const startIdx = nodeIdToIndex.get(edge.startNode.id);
          const endIdx = nodeIdToIndex.get(edge.endNode.id);
          let startX;
          let startY;
          let endX;
          let endY;
          let endBorderDist;
          let startBorderDist;
          if (startIdx !== void 0) {
            startX = nodeCxCache[startIdx];
            startY = nodeCyCache[startIdx];
            startBorderDist = nodeBorderCache[startIdx];
          } else {
            const c2 = edge.startNode.getCenter();
            startX = c2.x;
            startY = c2.y;
            startBorderDist = edge.startNode.getDistanceToBorder();
          }
          if (endIdx !== void 0) {
            endX = nodeCxCache[endIdx];
            endY = nodeCyCache[endIdx];
            endBorderDist = nodeBorderCache[endIdx];
          } else {
            const c2 = edge.endNode.getCenter();
            endX = c2.x;
            endY = c2.y;
            endBorderDist = edge.endNode.getDistanceToBorder();
          }
          const edgeStyle = edge.getStyle();
          const shadowSize = edgeStyle.shadowSize || 0;
          const shadowOffsetX = edgeStyle.shadowOffsetX || 0;
          const shadowOffsetY = edgeStyle.shadowOffsetY || 0;
          const shadowColor = this._edgeShadowColorCache.get(edge.id) || TRANSPARENT_RGBA;
          const off = i * FLOATS_PER_EDGE;
          const width = edge.getWidth();
          const rgba2 = edge.isHovered() || edge.isSelected() ? this._resolveColor(edge.getColor()) : this._edgeColorCache.get(edge.id) || EDGE_DEFAULT_RGBA;
          const dim = hasStateChangedEdges && !(edge.isHovered() || edge.isSelected()) ? contextAlpha : 1;
          let edgeType = EDGE_TYPE_STRAIGHT;
          let controlX = 0;
          let controlY = 0;
          let loopbackRadius = 0;
          let arrowSize = 0;
          let arrowTipX = 0;
          let arrowTipY = 0;
          let arrowDirX = 0;
          let arrowDirY = 0;
          if (edge.isCurved()) {
            edgeType = EDGE_TYPE_CURVED;
            const cp = edge.getCurvedControlPoint();
            controlX = cp.x;
            controlY = cp.y;
          } else if (edge.isLoopback()) {
            edgeType = EDGE_TYPE_LOOPBACK;
            const circle = edge.getCircularData();
            controlX = circle.x;
            controlY = circle.y;
            loopbackRadius = circle.radius;
          }
          const scaleFactor = (_a = edgeStyle.arrowSize) !== null && _a !== void 0 ? _a : 1;
          if (scaleFactor > 0) {
            const lineWidth = width || 1;
            arrowSize = 1.5 * scaleFactor + 3 * lineWidth;
            if (edgeType === EDGE_TYPE_STRAIGHT) {
              const dx = endX - startX;
              const dy = endY - startY;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len > 0) {
                arrowDirX = dx / len;
                arrowDirY = dy / len;
                arrowTipX = endX - arrowDirX * endBorderDist;
                arrowTipY = endY - arrowDirY * endBorderDist;
              }
            } else if (edgeType === EDGE_TYPE_CURVED) {
              let bestT = 1;
              let low = 0.5;
              let high = 1;
              for (let iter = 0; iter < 8; iter++) {
                const mid = (low + high) * 0.5;
                const mt2 = 1 - mid;
                const px = mt2 * mt2 * startX + 2 * mid * mt2 * controlX + mid * mid * endX;
                const py = mt2 * mt2 * startY + 2 * mid * mt2 * controlY + mid * mid * endY;
                const d = Math.sqrt(Math.pow(px - endX, 2) + Math.pow(py - endY, 2));
                if (Math.abs(d - endBorderDist) < 0.1) {
                  bestT = mid;
                  break;
                }
                if (d > endBorderDist) {
                  low = mid;
                } else {
                  high = mid;
                }
                bestT = mid;
              }
              const mt = 1 - bestT;
              arrowTipX = mt * mt * startX + 2 * bestT * mt * controlX + bestT * bestT * endX;
              arrowTipY = mt * mt * startY + 2 * bestT * mt * controlY + bestT * bestT * endY;
              const tx = 2 * mt * (controlX - startX) + 2 * bestT * (endX - controlX);
              const ty = 2 * mt * (controlY - startY) + 2 * bestT * (endY - controlY);
              const tLen = Math.sqrt(tx * tx + ty * ty);
              if (tLen > 0) {
                arrowDirX = tx / tLen;
                arrowDirY = ty / tLen;
              }
            } else {
              let bestT = 0.8;
              let low = 0.6;
              let high = 1;
              for (let iter = 0; iter < 8; iter++) {
                const mid = (low + high) * 0.5;
                const angle2 = mid * 2 * Math.PI;
                const px = controlX + loopbackRadius * Math.cos(angle2);
                const py = controlY - loopbackRadius * Math.sin(angle2);
                const d = Math.sqrt(Math.pow(px - startX, 2) + Math.pow(py - startY, 2));
                if (Math.abs(d - startBorderDist) < 0.1) {
                  bestT = mid;
                  break;
                }
                if (d > startBorderDist) {
                  high = mid;
                } else {
                  low = mid;
                }
                bestT = mid;
              }
              const angle = bestT * 2 * Math.PI;
              arrowTipX = controlX + loopbackRadius * Math.cos(angle);
              arrowTipY = controlY - loopbackRadius * Math.sin(angle);
              const arrowAngle = bestT * -2 * Math.PI + 0.45 * Math.PI;
              arrowDirX = Math.cos(arrowAngle);
              arrowDirY = Math.sin(arrowAngle);
            }
          }
          edgeData[off] = startX;
          edgeData[off + 1] = startY;
          edgeData[off + 2] = endX;
          edgeData[off + 3] = endY;
          edgeData[off + 4] = controlX;
          edgeData[off + 5] = controlY;
          edgeData[off + 6] = width;
          edgeData[off + 7] = edgeType;
          edgeData[off + 8] = loopbackRadius;
          edgeData[off + 9] = arrowSize;
          edgeData[off + 10] = arrowTipX;
          edgeData[off + 11] = arrowTipY;
          edgeData[off + 12] = arrowDirX;
          edgeData[off + 13] = arrowDirY;
          edgeData[off + 14] = rgba2[0];
          edgeData[off + 15] = rgba2[1];
          edgeData[off + 16] = rgba2[2];
          edgeData[off + 17] = rgba2[3] * dim;
          edgeData[off + 18] = shadowColor[0];
          edgeData[off + 19] = shadowColor[1];
          edgeData[off + 20] = shadowColor[2];
          edgeData[off + 21] = shadowColor[3] * dim;
          edgeData[off + 22] = shadowSize;
          edgeData[off + 23] = shadowOffsetX;
          edgeData[off + 24] = shadowOffsetY;
        }
      }
      gl.useProgram(this._edgeProgram);
      this._setViewUniforms(this._edgeProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, this._edgeInstanceBuffer);
      if (!canSkipRebuild) {
        gl.bufferData(gl.ARRAY_BUFFER, edgeData.byteLength, gl.STREAM_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, edgeData);
      }
      const isSimpleEdgeMode = this.transform.k <= EDGE_SIMPLE_LOD_ZOOM;
      const uSimpleModeLoc = gl.getUniformLocation(this._edgeProgram, "uSimpleMode");
      gl.uniform1i(uSimpleModeLoc, isSimpleEdgeMode ? 1 : 0);
      gl.bindVertexArray(this._edgeVao);
      if (this._timerExt && this._timerEdgeQueries.length > 0) {
        const slot = this._timerEdgeQueries[this._timerQueryIdx];
        const ms = this._pollTimerQuery(slot);
        if (ms !== null) {
          this._lastEdgeGpuMs = ms;
        }
        gl.beginQuery(this._timerExt.TIME_ELAPSED_EXT, slot);
      }
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, edges.length);
      if (this._timerExt && this._timerEdgeQueries.length > 0) {
        gl.endQuery(this._timerExt.TIME_ELAPSED_EXT);
      }
      gl.bindVertexArray(null);
      if (isSimpleEdgeMode) {
        gl.enable(gl.BLEND);
      }
      gl.useProgram(this._nodeProgram);
      this._setViewUniforms(this._nodeProgram);
      if (this._imageAtlas) {
        this._imageAtlas.uploadIfDirty();
        this._imageAtlas.bind(0);
        gl.uniform1i(gl.getUniformLocation(this._nodeProgram, "uImageAtlas"), 0);
      }
      const nodes = graph.getNodes();
      const zoom = this.transform.k;
      const FLOATS_PER_NODE = 25;
      const nodeBufferLen = nodes.length * FLOATS_PER_NODE;
      const nodeBufferSizeChanged = this._nodeInstanceData === null || this._nodeInstanceData.length !== nodeBufferLen;
      if (nodeBufferSizeChanged) {
        this._nodeInstanceData = new Float32Array(nodeBufferLen);
      }
      const instanceData = this._nodeInstanceData;
      const canSkipNodeRebuild = canSkipRebuild && !nodeBufferSizeChanged;
      if (!canSkipNodeRebuild && (nodes.length !== this._lastNodeCount || this._isColorCacheDirty)) {
        this._buildNodeColorCache(nodes);
        this._buildNodeBorderColorCache(nodes);
        this._buildNodeShadowColorCache(nodes);
        this._isColorCacheDirty = false;
        this._lastNodeCount = nodes.length;
      }
      if (!canSkipNodeRebuild) {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const center = node.getCenter();
          const radius = node.getRadius();
          const nodeStyle = node.getStyle();
          const shadowSize = nodeStyle.shadowSize || 0;
          const shadowOffsetX = nodeStyle.shadowOffsetX || 0;
          const shadowOffsetY = nodeStyle.shadowOffsetY || 0;
          const shadowColor = this._nodeShadowColorCache.get(node.id) || TRANSPARENT_RGBA;
          const off = i * FLOATS_PER_NODE;
          let rgba2;
          let borderColor;
          let borderWidth;
          if (node.isHovered() || node.isSelected()) {
            rgba2 = this._resolveColor(node.getColor());
            borderColor = this._resolveColor(node.getBorderColor());
            borderWidth = node.getBorderWidth();
          } else {
            rgba2 = this._nodeColorCache.get(node.id) || NODE_DEFAULT_RGBA;
            borderColor = this._nodeBorderColorCache.get(node.id) || TRANSPARENT_RGBA;
            borderWidth = node.getBorderWidth();
          }
          const dim = hasStateChangedNodes && !(node.isHovered() || node.isSelected()) ? contextAlpha : 1;
          instanceData[off] = center.x;
          instanceData[off + 1] = center.y;
          instanceData[off + 2] = radius;
          instanceData[off + 3] = rgba2[0];
          instanceData[off + 4] = rgba2[1];
          instanceData[off + 5] = rgba2[2];
          instanceData[off + 6] = rgba2[3] * dim;
          instanceData[off + 7] = borderColor[0];
          instanceData[off + 8] = borderColor[1];
          instanceData[off + 9] = borderColor[2];
          instanceData[off + 10] = borderColor[3] * dim;
          instanceData[off + 11] = borderWidth;
          instanceData[off + 12] = shadowColor[0];
          instanceData[off + 13] = shadowColor[1];
          instanceData[off + 14] = shadowColor[2];
          instanceData[off + 15] = shadowColor[3] * dim;
          instanceData[off + 16] = shadowSize;
          instanceData[off + 17] = shadowOffsetX;
          instanceData[off + 18] = shadowOffsetY;
          instanceData[off + 19] = (_c = SHAPE_TYPE_MAP[(_b = nodeStyle.shape) !== null && _b !== void 0 ? _b : NodeShapeType.CIRCLE]) !== null && _c !== void 0 ? _c : 0;
          let imgU0 = 0;
          let imgV0 = 0;
          let imgU1 = 0;
          let imgV1 = 0;
          let imgAspect = 0;
          if (radius * zoom >= IMAGE_LOD_MIN_SCREEN_PX) {
            const imageUrl = node.isSelected() ? nodeStyle.imageUrlSelected || nodeStyle.imageUrl : nodeStyle.imageUrl;
            if (imageUrl && this._imageAtlas) {
              const entry = this._imageAtlas.getOrCreate(imageUrl);
              if (entry) {
                imgU0 = entry.u0;
                imgV0 = entry.v0;
                imgU1 = entry.u1;
                imgV1 = entry.v1;
                imgAspect = entry.aspect;
              }
            }
          }
          instanceData[off + 20] = imgU0;
          instanceData[off + 21] = imgV0;
          instanceData[off + 22] = imgU1;
          instanceData[off + 23] = imgV1;
          instanceData[off + 24] = imgAspect;
        }
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this._nodeInstanceBuffer);
      if (!canSkipNodeRebuild) {
        gl.bufferData(gl.ARRAY_BUFFER, instanceData.byteLength, gl.STREAM_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, instanceData);
      }
      this._buffersAreCurrent = true;
      gl.bindVertexArray(this._nodeVao);
      if (this._timerExt && this._timerNodeQueries.length > 0) {
        const slot = this._timerNodeQueries[this._timerQueryIdx];
        const ms = this._pollTimerQuery(slot);
        if (ms !== null) {
          this._lastNodeGpuMs = ms;
        }
        gl.beginQuery(this._timerExt.TIME_ELAPSED_EXT, slot);
      }
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nodes.length);
      if (this._timerExt && this._timerNodeQueries.length > 0) {
        gl.endQuery(this._timerExt.TIME_ELAPSED_EXT);
        this._timerQueryIdx = (this._timerQueryIdx + 1) % this._timerNodeQueries.length;
      }
      gl.bindVertexArray(null);
      if (this._labelProgram && this._labelCache && this._settings.labelsIsEnabled) {
        const labelCache = this._labelCache;
        const rasterPx = labelCache.rasterFontPx;
        let labelCount = 0;
        const maxLabels = nodes.length + edges.length;
        const labelData = new Float32Array(maxLabels * FLOATS_PER_LABEL);
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const text = node.getLabel();
          if (!text) {
            continue;
          }
          const style = node.getStyle();
          const fontSize = style.fontSize || DEFAULT_FONT_SIZE2;
          if (fontSize * zoom < LABEL_LOD_MIN_SCREEN_PX) {
            continue;
          }
          const fontFamily = style.fontFamily || DEFAULT_FONT_FAMILY2;
          const fontColor = ((_d = style.fontColor) !== null && _d !== void 0 ? _d : DEFAULT_FONT_COLOR2).toString();
          const bgColor = style.fontBackgroundColor ? style.fontBackgroundColor.toString() : null;
          const entry = labelCache.getOrCreate(text, fontSize, fontFamily, fontColor, bgColor);
          if (!entry) {
            continue;
          }
          const center = node.getCenter();
          const borderedRadius = node.getBorderedRadius();
          const worldW = entry.pxWidth / rasterPx * fontSize;
          const worldH = entry.pxHeight / rasterPx * fontSize;
          const off = labelCount * FLOATS_PER_LABEL;
          labelData[off] = center.x;
          labelData[off + 1] = center.y + borderedRadius * (1 + LABEL_DISTANCE_FROM_NODE) + worldH / 2;
          labelData[off + 2] = worldW / 2;
          labelData[off + 3] = worldH / 2;
          labelData[off + 4] = entry.u0;
          labelData[off + 5] = entry.v0;
          labelData[off + 6] = entry.u1;
          labelData[off + 7] = entry.v1;
          labelCount++;
        }
        for (let i = 0; i < edges.length; i++) {
          const edge = edges[i];
          const text = edge.getLabel();
          if (!text) {
            continue;
          }
          const style = edge.getStyle();
          const fontSize = style.fontSize || DEFAULT_FONT_SIZE2;
          if (fontSize * zoom < LABEL_LOD_MIN_SCREEN_PX) {
            continue;
          }
          const fontFamily = style.fontFamily || DEFAULT_FONT_FAMILY2;
          const fontColor = ((_e = style.fontColor) !== null && _e !== void 0 ? _e : DEFAULT_FONT_COLOR2).toString();
          const bgColor = style.fontBackgroundColor ? style.fontBackgroundColor.toString() : null;
          const entry = labelCache.getOrCreate(text, fontSize, fontFamily, fontColor, bgColor);
          if (!entry) {
            continue;
          }
          const edgeCenter = edge.getCenter();
          const worldW = entry.pxWidth / rasterPx * fontSize;
          const worldH = entry.pxHeight / rasterPx * fontSize;
          const off = labelCount * FLOATS_PER_LABEL;
          labelData[off] = edgeCenter.x;
          labelData[off + 1] = edgeCenter.y;
          labelData[off + 2] = worldW / 2;
          labelData[off + 3] = worldH / 2;
          labelData[off + 4] = entry.u0;
          labelData[off + 5] = entry.v0;
          labelData[off + 6] = entry.u1;
          labelData[off + 7] = entry.v1;
          labelCount++;
        }
        if (labelCount > 0) {
          labelCache.uploadIfDirty();
          gl.useProgram(this._labelProgram);
          this._setViewUniforms(this._labelProgram);
          labelCache.bind(0);
          gl.uniform1i(gl.getUniformLocation(this._labelProgram, "uAtlas"), 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, this._labelInstanceBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, labelData.subarray(0, labelCount * FLOATS_PER_LABEL), gl.DYNAMIC_DRAW);
          gl.bindVertexArray(this._labelVao);
          gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, labelCount);
          gl.bindVertexArray(null);
        }
      }
      this._isInitiallyRendered = true;
      this.emit(RenderEventType.RENDER_END, { durationMs: performance.now() - renderStartedAt });
    }
    reset() {
      this.transform = identity2;
      const gl = this._gl;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    getFitZoomTransform(graph) {
      const graphView = graph.getBoundingBox();
      const graphMiddleX = graphView.x + graphView.width / 2;
      const graphMiddleY = graphView.y + graphView.height / 2;
      const simulationView = this.getSimulationViewRectangle();
      const heightScale = simulationView.height / (graphView.height * (1 + this._settings.fitZoomMargin));
      const widthScale = simulationView.width / (graphView.width * (1 + this._settings.fitZoomMargin));
      const scale = Math.min(heightScale, widthScale);
      const previousZoom = this.transform.k;
      const newZoom = Math.max(Math.min(scale * previousZoom, this._settings.maxZoom), this._settings.minZoom);
      const newX = simulationView.width / 2 * previousZoom * (1 - newZoom) - graphMiddleX * newZoom;
      const newY = simulationView.height / 2 * previousZoom * (1 - newZoom) - graphMiddleY * newZoom;
      return identity2.translate(newX, newY).scale(newZoom);
    }
    getSimulationPosition(canvasPoint) {
      const [x3, y3] = this.transform.invert([canvasPoint.x, canvasPoint.y]);
      return {
        x: x3 - this._width / 2,
        y: y3 - this._height / 2
      };
    }
    getCanvasPosition(simulationPoint) {
      const [x3, y3] = this.transform.apply([simulationPoint.x + this._width / 2, simulationPoint.y + this._height / 2]);
      return { x: x3, y: y3 };
    }
    getSimulationViewRectangle() {
      const topLeftPosition = this.getSimulationPosition({ x: 0, y: 0 });
      const bottomRightPosition = this.getSimulationPosition({ x: this._width, y: this._height });
      return {
        x: topLeftPosition.x,
        y: topLeftPosition.y,
        width: bottomRightPosition.x - topLeftPosition.x,
        height: bottomRightPosition.y - topLeftPosition.y
      };
    }
    translateOriginToCenter() {
      this._isOriginCentered = true;
    }
    destroy() {
      var _a, _b;
      (_a = this._dprObserveUnsubscribe) === null || _a === void 0 ? void 0 : _a.call(this);
      this.removeAllListeners();
      (_b = this._gl.getExtension("WEBGL_lose_context")) === null || _b === void 0 ? void 0 : _b.loseContext();
      this._canvas.remove();
    }
    _setViewUniforms(program) {
      const gl = this._gl;
      const originX = this._isOriginCentered ? this._width / 2 : 0;
      const originY = this._isOriginCentered ? this._height / 2 : 0;
      gl.uniform2f(gl.getUniformLocation(program, "uResolution"), this._width, this._height);
      gl.uniform2f(gl.getUniformLocation(program, "uTranslation"), this.transform.x, this.transform.y);
      gl.uniform1f(gl.getUniformLocation(program, "uScale"), this.transform.k);
      gl.uniform2f(gl.getUniformLocation(program, "uOriginOffset"), originX, originY);
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/factory.js
  var RendererFactory = class {
    static getRenderer(container, type = RendererType.CANVAS, settings) {
      if (type === RendererType.WEBGL) {
        return new WebGLRenderer(container, settings);
      }
      return new CanvasRenderer(container, settings);
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/svg/utils.js
  var formatNumber = (value) => {
    if (!isFinite(value)) {
      return "0";
    }
    return `${Math.round(value * 1e3) / 1e3}`;
  };
  var escapeXML = (value) => {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  };
  var svgElement = (tag, attributes, children2) => {
    const serializedAttributes = Object.keys(attributes).filter((key) => {
      const value = attributes[key];
      return value !== void 0 && value !== null && value !== "";
    }).map((key) => {
      const value = attributes[key];
      const serializedValue = typeof value === "number" ? formatNumber(value) : escapeXML(String(value));
      return `${key}="${serializedValue}"`;
    }).join(" ");
    const openTag = serializedAttributes ? `${tag} ${serializedAttributes}` : tag;
    if (children2 === void 0) {
      return `<${openTag}/>`;
    }
    return `<${openTag}>${children2}</${tag}>`;
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/svg/shapes.js
  var toPointsAttribute = (points) => {
    return points.map((point) => `${formatNumber(point.x)},${formatNumber(point.y)}`).join(" ");
  };
  var polygon = (points) => {
    return { tag: "polygon", attributes: { points: toPointsAttribute(points) } };
  };
  var shapeToSVGShape = (shape, x3, y3, r) => {
    switch (shape) {
      case NodeShapeType.SQUARE:
        return { tag: "rect", attributes: { x: x3 - r, y: y3 - r, width: r * 2, height: r * 2 } };
      case NodeShapeType.DIAMOND:
        return polygon([
          { x: x3, y: y3 + r },
          { x: x3 + r, y: y3 },
          { x: x3, y: y3 - r },
          { x: x3 - r, y: y3 }
        ]);
      case NodeShapeType.TRIANGLE:
        return polygon(triangleUpPoints(x3, y3, r));
      case NodeShapeType.TRIANGLE_DOWN:
        return polygon(triangleDownPoints(x3, y3, r));
      case NodeShapeType.STAR:
        return polygon(starPoints(x3, y3, r));
      case NodeShapeType.HEXAGON:
        return polygon(ngonPoints(x3, y3, r, 6));
      default:
        return { tag: "circle", attributes: { cx: x3, cy: y3, r } };
    }
  };
  var triangleUpPoints = (x3, y3, r) => {
    r *= 1.15;
    y3 += 0.275 * r;
    const diameter = r * 2;
    const innerRadius = Math.sqrt(3) * diameter / 6;
    const height = Math.sqrt(diameter * diameter - r * r);
    return [
      { x: x3, y: y3 - (height - innerRadius) },
      { x: x3 + r, y: y3 + innerRadius },
      { x: x3 - r, y: y3 + innerRadius }
    ];
  };
  var triangleDownPoints = (x3, y3, r) => {
    r *= 1.15;
    y3 -= 0.275 * r;
    const diameter = r * 2;
    const innerRadius = Math.sqrt(3) * diameter / 6;
    const height = Math.sqrt(diameter * diameter - r * r);
    return [
      { x: x3, y: y3 + (height - innerRadius) },
      { x: x3 + r, y: y3 - innerRadius },
      { x: x3 - r, y: y3 - innerRadius }
    ];
  };
  var starPoints = (x3, y3, r) => {
    r *= 0.82;
    y3 += 0.1 * r;
    const points = [];
    for (let n = 0; n < 10; n++) {
      const radius = r * (n % 2 === 0 ? 1.3 : 0.5);
      points.push({
        x: x3 + radius * Math.sin(n * 2 * Math.PI / 10),
        y: y3 - radius * Math.cos(n * 2 * Math.PI / 10)
      });
    }
    return points;
  };
  var ngonPoints = (x3, y3, r, sides) => {
    const points = [];
    const arcSide = Math.PI * 2 / sides;
    for (let i = 0; i < sides; i++) {
      points.push({ x: x3 + r * Math.cos(arcSide * i), y: y3 + r * Math.sin(arcSide * i) });
    }
    return points;
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/svg/label.js
  var DEFAULT_FONT_FAMILY3 = "Roboto, sans-serif";
  var DEFAULT_FONT_COLOR3 = "#000000";
  var FONT_LINE_SPACING3 = 1.2;
  var FONT_BACKGROUND_MARGIN3 = 0.12;
  var AVERAGE_GLYPH_WIDTH_RATIO = 0.6;
  var labelToSVG = (text, data) => {
    var _a, _b;
    if (text === void 0 || text === null || `${text}` === "") {
      return "";
    }
    const label = new Label(text, {
      position: data.position,
      textBaseline: data.textBaseline,
      properties: data.properties
    });
    if (!label.textLines.length || label.fontSize <= 0) {
      return "";
    }
    const fontFamily = (_a = data.properties.fontFamily) !== null && _a !== void 0 ? _a : DEFAULT_FONT_FAMILY3;
    const fontColor = ((_b = data.properties.fontColor) !== null && _b !== void 0 ? _b : DEFAULT_FONT_COLOR3).toString();
    const lineHeight = label.fontSize * FONT_LINE_SPACING3;
    const dominantBaseline = data.textBaseline === LabelTextBaseline.MIDDLE ? "middle" : "text-before-edge";
    const background = labelBackgroundToSVG(label, lineHeight);
    const tspans = label.textLines.map((line, i) => svgElement("tspan", { x: label.position.x, dy: i === 0 ? 0 : lineHeight }, escapeXML(line))).join("");
    const textElement = svgElement("text", {
      x: label.position.x,
      y: label.position.y,
      "font-size": label.fontSize,
      "font-family": fontFamily,
      fill: fontColor,
      "text-anchor": "middle",
      "dominant-baseline": dominantBaseline
    }, tspans);
    return `${background}${textElement}`;
  };
  var labelBackgroundToSVG = (label, lineHeight) => {
    const backgroundColor = label.properties.fontBackgroundColor;
    if (!backgroundColor) {
      return "";
    }
    const margin = label.fontSize * FONT_BACKGROUND_MARGIN3;
    const height = label.fontSize + 2 * margin;
    const baselineHeight = label.textBaseline === LabelTextBaseline.MIDDLE ? label.fontSize / 2 : 0;
    const color2 = backgroundColor.toString();
    return label.textLines.map((line, i) => {
      const width = line.length * label.fontSize * AVERAGE_GLYPH_WIDTH_RATIO + 2 * margin;
      return svgElement("rect", {
        x: label.position.x - width / 2,
        y: label.position.y - baselineHeight - margin + i * lineHeight,
        width,
        height,
        fill: color2
      });
    }).join("");
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/svg/image.js
  var nodeImageToSVG = (node, defs, shape) => {
    const image = node.getBackgroundImage();
    if (!image || !image.width || !image.height) {
      return "";
    }
    const href = resolveImageHref(node, image);
    if (!href) {
      return "";
    }
    const center = node.getCenter();
    const radius = node.getRadius();
    const clipGeometry = Object.keys(shape.attributes).map((key) => `${key}=${shape.attributes[key]}`).join(",");
    const clipId = defs.add(`clip:${shape.tag}:${clipGeometry}`, (id2) => svgElement("clipPath", { id: id2 }, svgElement(shape.tag, shape.attributes)));
    return svgElement("image", {
      href,
      "xlink:href": href,
      x: center.x - radius,
      y: center.y - radius,
      width: radius * 2,
      height: radius * 2,
      preserveAspectRatio: "xMidYMid slice",
      "clip-path": `url(#${clipId})`
    });
  };
  var resolveImageHref = (node, image) => {
    var _a, _b;
    const dataUrl = imageToDataURL(image);
    if (dataUrl) {
      return dataUrl;
    }
    const style = node.getStyle();
    if (node.isSelected() && style.imageUrlSelected) {
      return style.imageUrlSelected;
    }
    return (_b = (_a = style.imageUrl) !== null && _a !== void 0 ? _a : image.src) !== null && _b !== void 0 ? _b : void 0;
  };
  var imageToDataURL = (image) => {
    if (typeof document === "undefined") {
      return void 0;
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext("2d");
      if (!context) {
        return void 0;
      }
      context.drawImage(image, 0, 0);
      return canvas.toDataURL();
    } catch (_a) {
      return void 0;
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/svg/shadow.js
  var SHADOW_STD_DEVIATION_RATIO = 0.5;
  var toShadow = (style) => {
    var _a, _b, _c;
    if (!style.shadowColor) {
      return null;
    }
    return {
      color: style.shadowColor,
      size: (_a = style.shadowSize) !== null && _a !== void 0 ? _a : 0,
      offsetX: (_b = style.shadowOffsetX) !== null && _b !== void 0 ? _b : 0,
      offsetY: (_c = style.shadowOffsetY) !== null && _c !== void 0 ? _c : 0
    };
  };
  var shadowFilterId = (defs, shadow) => {
    const { color: color2, opacity } = parseColorAlpha(shadow.color.toString());
    const stdDeviation = Math.max(shadow.size * SHADOW_STD_DEVIATION_RATIO, 0);
    const signature = `shadow:${color2}:${opacity}:${stdDeviation}:${shadow.offsetX}:${shadow.offsetY}`;
    return defs.add(signature, (id2) => buildShadowFilter(id2, color2, opacity, stdDeviation, shadow.offsetX, shadow.offsetY, defs.filterRegion));
  };
  var buildShadowFilter = (id2, color2, opacity, stdDeviation, offsetX, offsetY, region) => {
    const regionAttributes = region ? `filterUnits="userSpaceOnUse" x="${formatNumber(region.x)}" y="${formatNumber(region.y)}" width="${formatNumber(region.width)}" height="${formatNumber(region.height)}"` : 'filterUnits="objectBoundingBox" x="-50%" y="-50%" width="200%" height="200%"';
    return `<filter id="${escapeXML(id2)}" ${regionAttributes}><feGaussianBlur in="SourceAlpha" stdDeviation="${formatNumber(stdDeviation)}"/><feOffset dx="${formatNumber(offsetX)}" dy="${formatNumber(offsetY)}" result="offsetBlur"/><feFlood flood-color="${escapeXML(color2)}" flood-opacity="${formatNumber(opacity)}"/><feComposite in2="offsetBlur" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  };
  var parseColorAlpha = (color2) => {
    const rgba2 = color2.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
    if (rgba2) {
      return { color: `rgb(${rgba2[1]}, ${rgba2[2]}, ${rgba2[3]})`, opacity: clamp01(Number(rgba2[4])) };
    }
    const hex8 = color2.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (hex8) {
      return { color: `#${hex8[1]}${hex8[2]}${hex8[3]}`, opacity: parseInt(hex8[4], 16) / 255 };
    }
    const hex4 = color2.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])$/i);
    if (hex4) {
      return { color: `#${hex4[1]}${hex4[2]}${hex4[3]}`, opacity: parseInt(hex4[4], 16) / 15 };
    }
    return { color: color2, opacity: 1 };
  };
  var clamp01 = (value) => {
    if (!isFinite(value)) {
      return 1;
    }
    return Math.min(Math.max(value, 0), 1);
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/svg/node.js
  var DEFAULT_LABEL_DISTANCE_SIZE_FROM_NODE2 = 0.2;
  var DEFAULT_NODE_COLOR = "#000000";
  var DEFAULT_BORDER_COLOR = "#000000";
  var nodeToSVG = (node, defs, options) => {
    var _a, _b, _c, _d, _e, _f;
    const isLabelEnabled = (_a = options === null || options === void 0 ? void 0 : options.isLabelEnabled) !== null && _a !== void 0 ? _a : true;
    const isShadowEnabled = (_b = options === null || options === void 0 ? void 0 : options.isShadowEnabled) !== null && _b !== void 0 ? _b : true;
    const isImageEnabled = (_c = options === null || options === void 0 ? void 0 : options.isImageEnabled) !== null && _c !== void 0 ? _c : true;
    const center = node.getCenter();
    const radius = node.getRadius();
    if (radius <= 0) {
      return "";
    }
    const shape = shapeToSVGShape(node.getStyle().shape, center.x, center.y, radius);
    const color2 = ((_d = node.getColor()) !== null && _d !== void 0 ? _d : DEFAULT_NODE_COLOR).toString();
    const hasBorder = node.hasBorder();
    const borderAttributes = {};
    if (hasBorder) {
      borderAttributes.stroke = (_f = (_e = node.getBorderColor()) === null || _e === void 0 ? void 0 : _e.toString()) !== null && _f !== void 0 ? _f : DEFAULT_BORDER_COLOR;
      borderAttributes["stroke-width"] = node.getBorderWidth();
    }
    const image = isImageEnabled ? nodeImageToSVG(node, defs, shape) : "";
    const shadow = isShadowEnabled && node.hasShadow() ? toShadow(node.getStyle()) : null;
    let content;
    if (!image && !shadow) {
      content = svgElement(shape.tag, Object.assign(Object.assign(Object.assign({}, shape.attributes), { fill: color2 }), borderAttributes));
    } else {
      const fill = svgElement(shape.tag, Object.assign(Object.assign({}, shape.attributes), { fill: color2 }));
      let shadowed = `${fill}${image}`;
      if (shadow) {
        shadowed = svgElement("g", { filter: `url(#${shadowFilterId(defs, shadow)})` }, shadowed);
      }
      const border = hasBorder ? svgElement(shape.tag, Object.assign(Object.assign(Object.assign({}, shape.attributes), { fill: "none" }), borderAttributes)) : "";
      content = `${shadowed}${border}`;
    }
    const label = isLabelEnabled ? nodeLabelToSVG(node) : "";
    return svgElement("g", {}, `${content}${label}`);
  };
  var nodeLabelToSVG = (node) => {
    const nodeLabel = node.getLabel();
    if (!nodeLabel) {
      return "";
    }
    const center = node.getCenter();
    const distance = node.getBorderedRadius() * (1 + DEFAULT_LABEL_DISTANCE_SIZE_FROM_NODE2);
    const nodeStyle = node.getStyle();
    return labelToSVG(nodeLabel, {
      position: { x: center.x, y: center.y + distance },
      textBaseline: LabelTextBaseline.TOP,
      properties: {
        fontBackgroundColor: nodeStyle.fontBackgroundColor,
        fontColor: nodeStyle.fontColor,
        fontFamily: nodeStyle.fontFamily,
        fontSize: nodeStyle.fontSize
      }
    });
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/svg/edge.js
  var DEFAULT_EDGE_COLOR = "#000000";
  var ARROW_KEY_POINTS = [
    { x: 0, y: 0 },
    { x: -1, y: 0.4 },
    { x: -1, y: -0.4 }
  ];
  var edgeToSVG = (edge, defs, options) => {
    var _a, _b, _c;
    const width = edge.getWidth();
    if (!width) {
      return "";
    }
    const isLabelEnabled = (_a = options === null || options === void 0 ? void 0 : options.isLabelEnabled) !== null && _a !== void 0 ? _a : true;
    const isShadowEnabled = (_b = options === null || options === void 0 ? void 0 : options.isShadowEnabled) !== null && _b !== void 0 ? _b : true;
    const color2 = ((_c = edge.getColor()) !== null && _c !== void 0 ? _c : DEFAULT_EDGE_COLOR).toString();
    const arrow = edgeArrowToSVG(edge, color2);
    const line = edgeLineToSVG(edge, width, color2);
    const shadow = isShadowEnabled && edge.hasShadow() ? toShadow(edge.getStyle()) : null;
    let content = `${arrow}${line}`;
    if (shadow) {
      content = svgElement("g", { filter: `url(#${shadowFilterId(defs, shadow)})` }, content);
    }
    const label = isLabelEnabled ? edgeLabelToSVG(edge) : "";
    return svgElement("g", {}, `${content}${label}`);
  };
  var edgeLineToSVG = (edge, width, color2) => {
    const dashPattern = edge.getLineDashPattern();
    const strokeAttributes = {
      stroke: color2,
      "stroke-width": width,
      fill: "none",
      "stroke-dasharray": dashPattern ? dashPattern.join(" ") : void 0
    };
    if (edge instanceof EdgeStraight) {
      const source = edge.startNode.getCenter();
      const target = edge.endNode.getCenter();
      const d = `M ${formatNumber(source.x)} ${formatNumber(source.y)} L ${formatNumber(target.x)} ${formatNumber(target.y)}`;
      return svgElement("path", Object.assign({ d }, strokeAttributes));
    }
    if (edge instanceof EdgeCurved) {
      const source = edge.startNode.getCenter();
      const target = edge.endNode.getCenter();
      const control = edge.getCurvedControlPoint();
      const d = `M ${formatNumber(source.x)} ${formatNumber(source.y)} Q ${formatNumber(control.x)} ${formatNumber(control.y)} ${formatNumber(target.x)} ${formatNumber(target.y)}`;
      return svgElement("path", Object.assign({ d }, strokeAttributes));
    }
    if (edge instanceof EdgeLoopback) {
      const { x: x3, y: y3, radius } = edge.getCircularData();
      return svgElement("circle", Object.assign({ cx: x3, cy: y3, r: radius }, strokeAttributes));
    }
    return "";
  };
  var edgeArrowToSVG = (edge, color2) => {
    if (edge.getStyle().arrowSize === 0) {
      return "";
    }
    const arrowShape = getArrowShape2(edge);
    if (!arrowShape) {
      return "";
    }
    const points = transformArrowPoints2(ARROW_KEY_POINTS, arrowShape);
    const pointsAttribute = points.map((point) => `${formatNumber(point.x)},${formatNumber(point.y)}`).join(" ");
    return svgElement("polygon", { points: pointsAttribute, fill: color2 });
  };
  var getArrowShape2 = (edge) => {
    if (edge instanceof EdgeStraight) {
      return getStraightArrowShape(edge);
    }
    if (edge instanceof EdgeCurved) {
      return getCurvedArrowShape(edge);
    }
    if (edge instanceof EdgeLoopback) {
      return getLoopbackArrowShape(edge);
    }
    return null;
  };
  var transformArrowPoints2 = (points, arrow) => {
    return points.map((point) => {
      const xt = point.x * Math.cos(arrow.angle) - point.y * Math.sin(arrow.angle);
      const yt = point.x * Math.sin(arrow.angle) + point.y * Math.cos(arrow.angle);
      return {
        x: arrow.point.x + arrow.length * xt,
        y: arrow.point.y + arrow.length * yt
      };
    });
  };
  var edgeLabelToSVG = (edge) => {
    const edgeLabel = edge.getLabel();
    if (!edgeLabel) {
      return "";
    }
    const edgeStyle = edge.getStyle();
    return labelToSVG(edgeLabel, {
      position: edge.getCenter(),
      textBaseline: LabelTextBaseline.MIDDLE,
      properties: {
        fontBackgroundColor: edgeStyle.fontBackgroundColor,
        fontColor: edgeStyle.fontColor,
        fontFamily: edgeStyle.fontFamily,
        fontSize: edgeStyle.fontSize
      }
    });
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/svg/defs.js
  var SVGDefs = class {
    constructor(filterRegion) {
      this.filterRegion = filterRegion;
      this._idBySignature = /* @__PURE__ */ new Map();
      this._entries = [];
      this._counter = 0;
    }
    add(signature, build) {
      const existing = this._idBySignature.get(signature);
      if (existing !== void 0) {
        return existing;
      }
      const id2 = `orb-def-${this._counter}`;
      this._counter += 1;
      this._idBySignature.set(signature, id2);
      this._entries.push(build(id2));
      return id2;
    }
    toSVG() {
      if (!this._entries.length) {
        return "";
      }
      return `<defs>${this._entries.join("")}</defs>`;
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/renderer/svg/index.js
  var DEFAULT_PADDING = 20;
  var DEFAULT_FONT_SIZE3 = 4;
  var LABEL_DISTANCE_RATIO = 0.2;
  var FONT_LINE_SPACING4 = 1.2;
  var FONT_BACKGROUND_MARGIN4 = 0.12;
  var AVERAGE_GLYPH_WIDTH_RATIO2 = 0.6;
  var graphToSVG = (graph, options = {}) => {
    var _a, _b, _c, _d;
    const padding = (_a = options.padding) !== null && _a !== void 0 ? _a : DEFAULT_PADDING;
    const isLabelEnabled = (_b = options.isLabelEnabled) !== null && _b !== void 0 ? _b : true;
    const isShadowEnabled = (_c = options.isShadowEnabled) !== null && _c !== void 0 ? _c : true;
    const isImageEnabled = (_d = options.isImageEnabled) !== null && _d !== void 0 ? _d : true;
    const nodes = graph.getNodes();
    const edges = graph.getEdges();
    const content = computeContentBounds(nodes, edges, isLabelEnabled, isShadowEnabled);
    const minX = content.x - padding;
    const minY = content.y - padding;
    const width = Math.max(content.width + padding * 2, 1);
    const height = Math.max(content.height + padding * 2, 1);
    const region = { x: minX, y: minY, width, height };
    const defs = new SVGDefs(region);
    const body = [];
    if (options.backgroundColor) {
      body.push(svgElement("rect", { x: minX, y: minY, width, height, fill: options.backgroundColor.toString() }));
    }
    for (let i = 0; i < edges.length; i++) {
      body.push(edgeToSVG(edges[i], defs, { isLabelEnabled, isShadowEnabled }));
    }
    for (let i = 0; i < nodes.length; i++) {
      body.push(nodeToSVG(nodes[i], defs, { isLabelEnabled, isShadowEnabled, isImageEnabled }));
    }
    const viewBox = `${formatNumber(minX)} ${formatNumber(minY)} ${formatNumber(width)} ${formatNumber(height)}`;
    return svgElement("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      "xmlns:xlink": "http://www.w3.org/1999/xlink",
      viewBox,
      width,
      height
    }, `${defs.toSVG()}${body.join("")}`);
  };
  var computeContentBounds = (nodes, edges, isLabelEnabled, isShadowEnabled) => {
    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (let i = 0; i < nodes.length; i++) {
      includeNode(bounds, nodes[i], isLabelEnabled, isShadowEnabled);
    }
    for (let i = 0; i < edges.length; i++) {
      includeEdge(bounds, edges[i], isLabelEnabled, isShadowEnabled);
    }
    if (!isFinite(bounds.minX)) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    return { x: bounds.minX, y: bounds.minY, width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
  };
  var includePoint = (bounds, x3, y3) => {
    if (x3 < bounds.minX) {
      bounds.minX = x3;
    }
    if (y3 < bounds.minY) {
      bounds.minY = y3;
    }
    if (x3 > bounds.maxX) {
      bounds.maxX = x3;
    }
    if (y3 > bounds.maxY) {
      bounds.maxY = y3;
    }
  };
  var includeBox = (bounds, cx, cy, halfWidth, halfHeight) => {
    includePoint(bounds, cx - halfWidth, cy - halfHeight);
    includePoint(bounds, cx + halfWidth, cy + halfHeight);
  };
  var includeNode = (bounds, node, isLabelEnabled, isShadowEnabled) => {
    var _a;
    if (node.getRadius() <= 0) {
      return;
    }
    const center = node.getCenter();
    const radius = node.getBorderedRadius();
    const pad = isShadowEnabled ? shadowReach(node.hasShadow(), node.getStyle()) : 0;
    includeBox(bounds, center.x, center.y, radius + pad, radius + pad);
    if (isLabelEnabled && node.getLabel()) {
      const style = node.getStyle();
      const top = center.y + node.getBorderedRadius() * (1 + LABEL_DISTANCE_RATIO);
      includeLabelBox(bounds, node.getLabel(), center.x, top, (_a = style.fontSize) !== null && _a !== void 0 ? _a : DEFAULT_FONT_SIZE3, false);
    }
  };
  var includeEdge = (bounds, edge, isLabelEnabled, isShadowEnabled) => {
    var _a;
    if (!edge.getWidth()) {
      return;
    }
    const style = edge.getStyle();
    const pad = isShadowEnabled ? shadowReach(edge.hasShadow(), style) : 0;
    if (edge instanceof EdgeLoopback) {
      const circle = edge.getCircularData();
      includeBox(bounds, circle.x, circle.y, circle.radius + pad, circle.radius + pad);
    } else if (edge instanceof EdgeCurved) {
      const control = edge.getCurvedControlPoint();
      includeBox(bounds, control.x, control.y, pad, pad);
    }
    if (isLabelEnabled && edge.getLabel()) {
      const center = edge.getCenter();
      includeLabelBox(bounds, edge.getLabel(), center.x, center.y, (_a = style.fontSize) !== null && _a !== void 0 ? _a : DEFAULT_FONT_SIZE3, true);
    }
  };
  var includeLabelBox = (bounds, text, cx, y3, fontSize, isCentered) => {
    if (fontSize <= 0) {
      return;
    }
    const lines = `${text}`.split("\n");
    const maxLength = lines.reduce((max, line) => Math.max(max, line.trim().length), 0);
    const margin = fontSize * FONT_BACKGROUND_MARGIN4;
    const width = maxLength * fontSize * AVERAGE_GLYPH_WIDTH_RATIO2 + 2 * margin;
    const height = lines.length * fontSize * FONT_LINE_SPACING4 + 2 * margin;
    const top = isCentered ? y3 - height / 2 : y3;
    includePoint(bounds, cx - width / 2, top);
    includePoint(bounds, cx + width / 2, top + height);
  };
  var shadowReach = (hasShadow, style) => {
    var _a, _b, _c;
    if (!hasShadow || !style.shadowColor) {
      return 0;
    }
    return ((_a = style.shadowSize) !== null && _a !== void 0 ? _a : 0) + Math.max(Math.abs((_b = style.shadowOffsetX) !== null && _b !== void 0 ? _b : 0), Math.abs((_c = style.shadowOffsetY) !== null && _c !== void 0 ? _c : 0));
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/models/interaction.js
  var GraphInteraction = class {
    constructor(graph) {
      this._graph = graph;
    }
    selectNodeById(id2, options) {
      const node = this._graph.getNodeById(id2);
      if (!node) {
        return false;
      }
      selectNode(node, options);
      return true;
    }
    // Defaults to non-cascading (unlike selectNodeById): only the listed nodes change state.
    selectNodesByIds(ids, options) {
      const nodes = [];
      for (let i = 0; i < ids.length; i++) {
        const node = this._graph.getNodeById(ids[i]);
        if (node) {
          nodes.push(node);
        }
      }
      const { changedCount } = selectNodes(nodes, Object.assign({ cascade: false }, options));
      return changedCount;
    }
    selectEdgeById(id2, options) {
      const edge = this._graph.getEdgeById(id2);
      if (!edge) {
        return false;
      }
      selectEdge(edge, options);
      return true;
    }
    // Defaults to non-cascading (unlike selectEdgeById): only the listed edges change state.
    selectEdgesByIds(ids, options) {
      const edges = [];
      for (let i = 0; i < ids.length; i++) {
        const edge = this._graph.getEdgeById(ids[i]);
        if (edge) {
          edges.push(edge);
        }
      }
      const { changedCount } = selectEdges(edges, Object.assign({ cascade: false }, options));
      return changedCount;
    }
    unselectNodeById(id2, options) {
      const node = this._graph.getNodeById(id2);
      if (!node) {
        return false;
      }
      unselectNode(node, options);
      return true;
    }
    unselectNodesByIds(ids, options) {
      const nodes = [];
      for (let i = 0; i < ids.length; i++) {
        const node = this._graph.getNodeById(ids[i]);
        if (node) {
          nodes.push(node);
        }
      }
      const { changedCount } = unselectNodes(nodes, Object.assign({ cascade: false }, options));
      return changedCount;
    }
    unselectEdgeById(id2, options) {
      const edge = this._graph.getEdgeById(id2);
      if (!edge) {
        return false;
      }
      unselectEdge(edge, options);
      return true;
    }
    unselectEdgesByIds(ids, options) {
      const edges = [];
      for (let i = 0; i < ids.length; i++) {
        const edge = this._graph.getEdgeById(ids[i]);
        if (edge) {
          edges.push(edge);
        }
      }
      const { changedCount } = unselectEdges(edges, Object.assign({ cascade: false }, options));
      return changedCount;
    }
    unselectAll() {
      const { changedCount } = unselectAll(this._graph);
      return changedCount;
    }
    hoverNodeById(id2) {
      const node = this._graph.getNodeById(id2);
      if (!node) {
        return false;
      }
      hoverNode(node);
      return true;
    }
    hoverEdgeById(id2) {
      const edge = this._graph.getEdgeById(id2);
      if (!edge) {
        return false;
      }
      hoverEdge(edge);
      return true;
    }
    unhoverAll() {
      const { changedCount } = unhoverAll(this._graph);
      return changedCount;
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/views/background-drag.js
  var BACKGROUND_DRAG_SUBJECT = { isBackgroundDrag: true };
  var isBackgroundDragSubject = (subject) => !!subject && subject.isBackgroundDrag === true;

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/views/orb-view.js
  var OrbView = class _OrbView {
    constructor(container, settings) {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      this._simulatorUsesGPU = false;
      this._simulationStartedAt = Date.now();
      this._assignPositions = (nodes) => {
        if (this._settings.getPosition) {
          for (let i = 0; i < nodes.length; i++) {
            const position = this._settings.getPosition(nodes[i]);
            if (position) {
              nodes[i].setPosition(Object.assign({ id: nodes[i].getId() }, position), { isNotifySkipped: true });
            }
          }
        }
      };
      this._zoomFilter = (event) => {
        if (event.button) {
          return false;
        }
        if (event.ctrlKey && event.type !== "wheel") {
          return false;
        }
        if (event.type === "wheel") {
          return true;
        }
        return !this._isBackgroundDragModifierActive(event);
      };
      this._dragFilter = (event) => {
        if (event.button) {
          return false;
        }
        if (this._isBackgroundDragModifierActive(event)) {
          return true;
        }
        return !event.ctrlKey;
      };
      this.dragSubject = (event) => {
        var _a2;
        const mousePoint = this.getCanvasMousePosition(event.sourceEvent);
        const simulationPoint = (_a2 = this._renderer) === null || _a2 === void 0 ? void 0 : _a2.getSimulationPosition(mousePoint);
        const node = this._graph.getNearestNode(simulationPoint);
        if (node) {
          return node;
        }
        if (this._isBackgroundDragModifierActive(event.sourceEvent)) {
          return BACKGROUND_DRAG_SUBJECT;
        }
        return void 0;
      };
      this.dragStarted = (event) => {
        if (isBackgroundDragSubject(event.subject)) {
          this._emitBackgroundDrag(OrbEventType.BACKGROUND_DRAG_START, event.sourceEvent);
          return;
        }
        if (!this._settings.interaction.isDragEnabled) {
          return;
        }
        const mousePoint = this.getCanvasMousePosition(event.sourceEvent);
        const simulationPoint = this._renderer.getSimulationPosition(mousePoint);
        this._events.emit(OrbEventType.NODE_DRAG_START, {
          node: event.subject,
          event: event.sourceEvent,
          localPoint: simulationPoint,
          globalPoint: mousePoint
        });
        this._dragStartPosition = mousePoint;
      };
      this.dragged = (event) => {
        if (isBackgroundDragSubject(event.subject)) {
          this._emitBackgroundDrag(OrbEventType.BACKGROUND_DRAG, event.sourceEvent);
          return;
        }
        if (!this._settings.interaction.isDragEnabled) {
          return;
        }
        const mousePoint = this.getCanvasMousePosition(event.sourceEvent);
        const simulationPoint = this._renderer.getSimulationPosition(mousePoint);
        if (!isEqualPosition(this._dragStartPosition, mousePoint)) {
          this._dragStartPosition = void 0;
        }
        this._simulator.dragNode(event.subject.getId(), simulationPoint);
        this._events.emit(OrbEventType.NODE_DRAG, {
          node: event.subject,
          event: event.sourceEvent,
          localPoint: simulationPoint,
          globalPoint: mousePoint
        });
      };
      this.dragEnded = (event) => {
        if (isBackgroundDragSubject(event.subject)) {
          this._emitBackgroundDrag(OrbEventType.BACKGROUND_DRAG_END, event.sourceEvent);
          return;
        }
        if (!this._settings.interaction.isDragEnabled) {
          return;
        }
        const mousePoint = this.getCanvasMousePosition(event.sourceEvent);
        const simulationPoint = this._renderer.getSimulationPosition(mousePoint);
        if (!isEqualPosition(this._dragStartPosition, mousePoint)) {
          this._simulator.endDragNode(event.subject.getId());
        }
        this._events.emit(OrbEventType.NODE_DRAG_END, {
          node: event.subject,
          event: event.sourceEvent,
          localPoint: simulationPoint,
          globalPoint: mousePoint
        });
      };
      this.zoomed = (event) => {
        if (!this._settings.interaction.isZoomEnabled) {
          return;
        }
        this._renderer.transform = event.transform;
        setTimeout(() => {
          this.render();
          this._events.emit(OrbEventType.TRANSFORM, { transform: event.transform });
        }, 1);
      };
      this.mouseMoved = (event) => {
        const mousePoint = this.getCanvasMousePosition(event);
        const simulationPoint = this._renderer.getSimulationPosition(mousePoint);
        const response = this._strategy.onMouseMove(this._graph, simulationPoint);
        const subject = response.changedSubject;
        if (subject && response.isStateChanged) {
          if (isNode(subject)) {
            this._events.emit(OrbEventType.NODE_HOVER, {
              node: subject,
              event,
              localPoint: simulationPoint,
              globalPoint: mousePoint
            });
          }
          if (isEdge(subject)) {
            this._events.emit(OrbEventType.EDGE_HOVER, {
              edge: subject,
              event,
              localPoint: simulationPoint,
              globalPoint: mousePoint
            });
          }
        }
        this._events.emit(OrbEventType.MOUSE_MOVE, {
          subject,
          event,
          localPoint: simulationPoint,
          globalPoint: mousePoint
        });
        if (response.isStateChanged) {
          this._invalidateStyles();
          this.render();
        }
      };
      this.mouseClicked = (event) => {
        const mousePoint = this.getCanvasMousePosition(event);
        const simulationPoint = this._renderer.getSimulationPosition(mousePoint);
        const response = this._strategy.onMouseClick(this._graph, simulationPoint, {
          isAppend: event.shiftKey
        });
        const subject = response.changedSubject;
        if (subject) {
          if (isNode(subject)) {
            this._events.emit(OrbEventType.NODE_CLICK, {
              node: subject,
              event,
              localPoint: simulationPoint,
              globalPoint: mousePoint
            });
          }
          if (isEdge(subject)) {
            this._events.emit(OrbEventType.EDGE_CLICK, {
              edge: subject,
              event,
              localPoint: simulationPoint,
              globalPoint: mousePoint
            });
          }
        }
        this._events.emit(OrbEventType.MOUSE_CLICK, {
          subject,
          event,
          localPoint: simulationPoint,
          globalPoint: mousePoint
        });
        if (response.isStateChanged || response.changedSubject) {
          this._invalidateStyles();
          this.render();
        }
      };
      this.mouseRightClicked = (event) => {
        const mousePoint = this.getCanvasMousePosition(event);
        const simulationPoint = this._renderer.getSimulationPosition(mousePoint);
        const response = this._strategy.onMouseRightClick(this._graph, simulationPoint);
        const subject = response.changedSubject;
        if (subject) {
          if (isNode(subject)) {
            this._events.emit(OrbEventType.NODE_RIGHT_CLICK, {
              node: subject,
              event,
              localPoint: simulationPoint,
              globalPoint: mousePoint
            });
          }
          if (isEdge(subject)) {
            this._events.emit(OrbEventType.EDGE_RIGHT_CLICK, {
              edge: subject,
              event,
              localPoint: simulationPoint,
              globalPoint: mousePoint
            });
          }
        }
        this._events.emit(OrbEventType.MOUSE_RIGHT_CLICK, {
          subject,
          event,
          localPoint: simulationPoint,
          globalPoint: mousePoint
        });
        if (response.isStateChanged || response.changedSubject) {
          this._invalidateStyles();
          this.render();
        }
      };
      this.mouseDoubleClicked = (event) => {
        const mousePoint = this.getCanvasMousePosition(event);
        const simulationPoint = this._renderer.getSimulationPosition(mousePoint);
        const response = this._strategy.onMouseDoubleClick(this._graph, simulationPoint);
        const subject = response.changedSubject;
        if (subject) {
          if (isNode(subject)) {
            this._events.emit(OrbEventType.NODE_DOUBLE_CLICK, {
              node: subject,
              event,
              localPoint: simulationPoint,
              globalPoint: mousePoint
            });
          }
          if (isEdge(subject)) {
            this._events.emit(OrbEventType.EDGE_DOUBLE_CLICK, {
              edge: subject,
              event,
              localPoint: simulationPoint,
              globalPoint: mousePoint
            });
          }
        }
        this._events.emit(OrbEventType.MOUSE_DOUBLE_CLICK, {
          subject,
          event,
          localPoint: simulationPoint,
          globalPoint: mousePoint
        });
        if (response.isStateChanged || response.changedSubject) {
          this._invalidateStyles();
          this.render();
        }
      };
      this.zoomIn = (onRendered) => {
        select_default2(this._renderer.canvas).transition().duration(this._settings.zoomFitTransitionMs).ease(linear).call(this._d3Zoom.scaleBy, 1.2).on("end", () => this.render(onRendered));
      };
      this.zoomOut = (onRendered) => {
        select_default2(this._renderer.canvas).transition().duration(this._settings.zoomFitTransitionMs).ease(linear).call(this._d3Zoom.scaleBy, 0.8).on("end", () => this.render(onRendered));
      };
      this._invalidateStyles = () => {
        var _a2, _b2;
        (_b2 = (_a2 = this._renderer).invalidateStyles) === null || _b2 === void 0 ? void 0 : _b2.call(_a2);
      };
      this._update = (data) => {
        if (data && "x" in data && "y" in data && "id" in data) {
          this._simulator.patchData({
            nodes: [
              {
                x: data.x,
                y: data.y,
                sx: data.x,
                sy: data.y,
                fx: data.x,
                fy: data.y,
                id: data.id
              }
            ],
            edges: []
          });
        }
        this._invalidateStyles();
        this.render();
      };
      this._initializeSimulationEvents = () => {
        this._simulator.on(SimulatorEventType.SIMULATION_START, () => {
          this._simulationStartedAt = Date.now();
          this._events.emit(OrbEventType.SIMULATION_START, void 0);
        });
        const invalidate = () => {
          var _a2, _b2;
          return (_b2 = (_a2 = this._renderer).invalidateBuffers) === null || _b2 === void 0 ? void 0 : _b2.call(_a2);
        };
        this._simulator.on(SimulatorEventType.SIMULATION_PROGRESS, (data) => {
          this._graph.setNodePositions(data.nodes);
          invalidate();
          this._events.emit(OrbEventType.SIMULATION_STEP, { progress: data.progress });
          this.render();
        });
        this._simulator.on(SimulatorEventType.SIMULATION_END, (data) => {
          this._graph.setNodePositions(data.nodes);
          invalidate();
          this.render();
          this._events.emit(OrbEventType.SIMULATION_END, { durationMs: Date.now() - this._simulationStartedAt });
        });
        this._simulator.on(SimulatorEventType.SIMULATION_STEP, (data) => {
          this._graph.setNodePositions(data.nodes);
          invalidate();
          this.render();
        });
        this._simulator.on(SimulatorEventType.NODE_DRAG, (data) => {
          this._graph.setNodePositions(data.nodes);
          invalidate();
          this.render();
        });
        this._simulator.on(SimulatorEventType.SETTINGS_UPDATE, (data) => {
          var _a2;
          this._settings.layout.options = (_a2 = data.settings) === null || _a2 === void 0 ? void 0 : _a2.options;
        });
      };
      this._container = container;
      this._settings = Object.assign(Object.assign({ getPosition: settings === null || settings === void 0 ? void 0 : settings.getPosition, zoomFitTransitionMs: 200, isOutOfBoundsDragEnabled: false, areCoordinatesRounded: true }, settings), { layout: Object.assign({ type: "force" }, (_a = settings === null || settings === void 0 ? void 0 : settings.layout) !== null && _a !== void 0 ? _a : DEFAULT_FORCE_LAYOUT_OPTIONS), render: Object.assign({}, settings === null || settings === void 0 ? void 0 : settings.render), strategy: Object.assign({ isDefaultHoverEnabled: true, isDefaultSelectEnabled: true, isDefaultMultiSelectEnabled: false, isDefaultSelectCascadeEnabled: true }, settings === null || settings === void 0 ? void 0 : settings.strategy), interaction: Object.assign(Object.assign({ isDragEnabled: true, isZoomEnabled: true }, settings === null || settings === void 0 ? void 0 : settings.interaction), { backgroundDrag: Object.assign({ isEnabled: false, modifier: "shift" }, (_b = settings === null || settings === void 0 ? void 0 : settings.interaction) === null || _b === void 0 ? void 0 : _b.backgroundDrag) }) });
      this._graph = new Graph(void 0, {
        onLoadedImages: () => {
          if (this._renderer.isInitiallyRendered) {
            this.render();
          }
        },
        listeners: [this._update]
      });
      this._graph.setDefaultStyle(getDefaultGraphStyle());
      this._events = new OrbEmitter();
      this._interaction = new GraphInteraction(this._graph);
      this._strategy = new DefaultEventStrategy({
        isDefaultSelectEnabled: (_c = this._settings.strategy.isDefaultSelectEnabled) !== null && _c !== void 0 ? _c : false,
        isDefaultHoverEnabled: (_d = this._settings.strategy.isDefaultHoverEnabled) !== null && _d !== void 0 ? _d : false,
        isDefaultMultiSelectEnabled: (_e = this._settings.strategy.isDefaultMultiSelectEnabled) !== null && _e !== void 0 ? _e : true,
        isDefaultSelectCascadeEnabled: (_f = this._settings.strategy.isDefaultSelectCascadeEnabled) !== null && _f !== void 0 ? _f : true
      });
      this._rendererType = (_h = (_g = settings === null || settings === void 0 ? void 0 : settings.render) === null || _g === void 0 ? void 0 : _g.type) !== null && _h !== void 0 ? _h : RendererType.CANVAS;
      this._initRenderer(this._rendererType);
      this._simulator = SimulatorFactory.getSimulator(this._settings.layout);
      this._simulatorUsesGPU = _OrbView._needsGPU(this._settings.layout);
      this._initializeSimulationEvents();
      this._graph.setSettings({
        onSetupData: () => {
          this._assignPositions(this._graph.getNodes());
          const nodePositions = this._graph.getNodePositions();
          const edgePositions = this._graph.getEdgePositions();
          this._simulator.setupData({ nodes: nodePositions, edges: edgePositions });
        },
        onMergeData: (data) => {
          var _a2, _b2;
          const nodeIds = new Set((_a2 = data.nodes) === null || _a2 === void 0 ? void 0 : _a2.map((node) => node.id));
          const nodeFilter = (node) => nodeIds.has(node.getId());
          const edgeIds = new Set((_b2 = data.edges) === null || _b2 === void 0 ? void 0 : _b2.map((edge) => edge.id));
          const edgeFilter = (edge) => edgeIds.has(edge.getId());
          this._assignPositions(this._graph.getNodes(nodeFilter));
          const nodePositions = this._graph.getNodePositions(nodeFilter);
          const edgePositions = this._graph.getEdgePositions(edgeFilter);
          this._simulator.mergeData({ nodes: nodePositions, edges: edgePositions });
        },
        onRemoveData: (data) => {
          this._simulator.deleteData(data);
        }
      });
    }
    // Creates the renderer of the given type and wires up everything that is coupled to it:
    // render event forwarding, origin centering, the d3 zoom behaviour (scale extent), and the
    // drag/zoom/mouse handlers bound to its canvas. Called once from the constructor and again
    // by setRenderer() when the renderer type changes at runtime.
    _initRenderer(type) {
      try {
        this._renderer = RendererFactory.getRenderer(this._container, type, this._settings.render);
      } catch (error) {
        this._container.textContent = error.message;
        throw error;
      }
      this._renderer.on(RenderEventType.RENDER_START, () => {
        this._events.emit(OrbEventType.RENDER_START, void 0);
      });
      this._renderer.on(RenderEventType.RENDER_END, (data) => {
        this._events.emit(OrbEventType.RENDER_END, data);
      });
      this._renderer.on(RenderEventType.RESIZE, () => {
        if (this._renderer.isInitiallyRendered) {
          this._renderer.render(this._graph);
        }
      });
      this._renderer.translateOriginToCenter();
      this._settings.render = this._renderer.getSettings();
      this._d3Zoom = zoom_default2().scaleExtent([this._renderer.getSettings().minZoom, this._renderer.getSettings().maxZoom]).filter(this._zoomFilter).on("zoom", this.zoomed);
      select_default2(this._renderer.canvas).call(drag_default().filter(this._dragFilter).container(this._renderer.canvas).subject(this.dragSubject).on("start", this.dragStarted).on("drag", this.dragged).on("end", this.dragEnded)).call(this._d3Zoom).on("click", this.mouseClicked).on("mousemove", this.mouseMoved).on("contextmenu", this.mouseRightClicked).on("dblclick.zoom", this.mouseDoubleClicked);
    }
    setRenderer(type) {
      if (type === this._rendererType) {
        return;
      }
      const previousTransform = this._renderer.transform;
      this._renderer.destroy();
      this._initRenderer(type);
      this._rendererType = type;
      this._renderer.transform = previousTransform;
      select_default2(this._renderer.canvas).property("__zoom", previousTransform);
      this.render();
    }
    get data() {
      return this._graph;
    }
    get events() {
      return this._events;
    }
    get interaction() {
      return this._interaction;
    }
    get canvas() {
      return this._renderer.canvas;
    }
    getSimulationPosition(canvasPoint) {
      return this._renderer.getSimulationPosition(canvasPoint);
    }
    getCanvasPosition(simulationPoint) {
      return this._renderer.getCanvasPosition(simulationPoint);
    }
    getSimulationViewRectangle() {
      return this._renderer.getSimulationViewRectangle();
    }
    getSettings() {
      return copyObject(this._settings);
    }
    setSettings(settings) {
      if (settings.getPosition) {
        this._settings.getPosition = settings.getPosition;
      }
      if (settings.render) {
        if (settings.render.type && settings.render.type !== this._rendererType) {
          this.setRenderer(settings.render.type);
        }
        this._renderer.setSettings(settings.render);
        this._settings.render = this._renderer.getSettings();
      }
      if (settings.layout) {
        const shouldRecenter = this._settings.layout.type !== settings.layout.type;
        this._settings.layout = Object.assign(Object.assign({}, this._settings.layout), settings.layout);
        const needsGPU = _OrbView._needsGPU(this._settings.layout);
        if (needsGPU !== this._simulatorUsesGPU) {
          this._simulator.terminate();
          this._simulator = SimulatorFactory.getSimulator(this._settings.layout);
          this._simulatorUsesGPU = needsGPU;
          this._initializeSimulationEvents();
        } else {
          this._simulator.setSettings(this._settings.layout);
        }
        const nodePositions = this._graph.getNodePositions();
        const edgePositions = this._graph.getEdgePositions();
        if (shouldRecenter) {
          for (let i = 0; i < nodePositions.length; i++) {
            delete nodePositions[i].x;
            delete nodePositions[i].y;
          }
        }
        this._simulator.releaseNodes();
        if (shouldRecenter) {
          this._simulator.once(SimulatorEventType.SIMULATION_END, () => {
            this.recenter();
          });
        }
        this._simulator.setupData({ nodes: nodePositions, edges: edgePositions });
      }
      if (settings.strategy) {
        if (isBoolean(settings.strategy.isDefaultHoverEnabled)) {
          this._settings.strategy.isDefaultHoverEnabled = settings.strategy.isDefaultHoverEnabled;
          this._strategy.isHoverEnabled = this._settings.strategy.isDefaultHoverEnabled;
        }
        if (isBoolean(settings.strategy.isDefaultSelectEnabled)) {
          this._settings.strategy.isDefaultSelectEnabled = settings.strategy.isDefaultSelectEnabled;
          this._strategy.isSelectEnabled = this._settings.strategy.isDefaultSelectEnabled;
        }
        if (isBoolean(settings.strategy.isDefaultMultiSelectEnabled)) {
          this._settings.strategy.isDefaultMultiSelectEnabled = settings.strategy.isDefaultMultiSelectEnabled;
          this._strategy.isMultiSelectEnabled = this._settings.strategy.isDefaultMultiSelectEnabled;
        }
        if (isBoolean(settings.strategy.isDefaultSelectCascadeEnabled)) {
          this._settings.strategy.isDefaultSelectCascadeEnabled = settings.strategy.isDefaultSelectCascadeEnabled;
          this._strategy.isSelectCascadeEnabled = this._settings.strategy.isDefaultSelectCascadeEnabled;
        }
      }
      if (settings.interaction) {
        if (isBoolean(settings.interaction.isDragEnabled)) {
          this._settings.interaction.isDragEnabled = settings.interaction.isDragEnabled;
        }
        if (isBoolean(settings.interaction.isZoomEnabled)) {
          this._settings.interaction.isZoomEnabled = settings.interaction.isZoomEnabled;
        }
        if (settings.interaction.backgroundDrag) {
          this._settings.interaction.backgroundDrag = Object.assign(Object.assign({}, this._settings.interaction.backgroundDrag), settings.interaction.backgroundDrag);
        }
      }
    }
    static _needsGPU(layout) {
      var _a;
      return layout.type === "force" && !!((_a = layout.options) === null || _a === void 0 ? void 0 : _a.useGPU);
    }
    render(onRendered) {
      if (onRendered) {
        if (this._simulator.isSimulationRunning()) {
          this._simulator.once(SimulatorEventType.SIMULATION_END, () => {
            this._renderer.once(RenderEventType.RENDER_END, () => onRendered());
          });
        } else {
          this._renderer.once(RenderEventType.RENDER_END, () => onRendered());
        }
      }
      this._renderer.render(this._graph);
    }
    recenter(optionsOrCallback, onRendered) {
      if (typeof optionsOrCallback === "function") {
        onRendered = optionsOrCallback;
        optionsOrCallback = void 0;
      }
      const layoutAnchors = getLayoutAnchors(this._settings.layout);
      const recenterOptions = Object.assign(Object.assign({}, layoutAnchors), optionsOrCallback);
      const fitZoomTransform = this._renderer.getFitZoomTransform(this._graph, recenterOptions);
      select_default2(this._renderer.canvas).transition().duration(this._settings.zoomFitTransitionMs).ease(linear).call(this._d3Zoom.transform, fitZoomTransform).on("end", () => this.render(onRendered));
    }
    getSVG(options) {
      return graphToSVG(this._graph, Object.assign({ backgroundColor: this._settings.render.backgroundColor }, options));
    }
    destroy() {
      this._renderer.destroy();
      this._simulator.terminate();
    }
    _isBackgroundDragModifierActive(event) {
      var _a;
      const backgroundDrag = this._settings.interaction.backgroundDrag;
      if (!(backgroundDrag === null || backgroundDrag === void 0 ? void 0 : backgroundDrag.isEnabled)) {
        return false;
      }
      switch ((_a = backgroundDrag.modifier) !== null && _a !== void 0 ? _a : "shift") {
        case "shift":
          return event.shiftKey;
        case "ctrl":
          return event.ctrlKey;
        case "alt":
          return event.altKey;
        case "meta":
          return event.metaKey;
        case null:
          return true;
        default:
          return false;
      }
    }
    _emitBackgroundDrag(type, sourceEvent) {
      const globalPoint = this.getCanvasMousePosition(sourceEvent);
      const localPoint = this._renderer.getSimulationPosition(globalPoint);
      this._events.emit(type, { event: sourceEvent, localPoint, globalPoint });
    }
    getCanvasMousePosition(event) {
      var _a, _b, _c, _d;
      const rect = this._renderer.canvas.getBoundingClientRect();
      let x3 = (_b = (_a = event.clientX) !== null && _a !== void 0 ? _a : event.pageX) !== null && _b !== void 0 ? _b : event.x;
      let y3 = (_d = (_c = event.clientY) !== null && _c !== void 0 ? _c : event.pageY) !== null && _d !== void 0 ? _d : event.y;
      x3 = x3 - rect.left;
      y3 = y3 - rect.top;
      if (this._settings.areCoordinatesRounded) {
        x3 = Math.floor(x3);
        y3 = Math.floor(y3);
      }
      if (!this._settings.isOutOfBoundsDragEnabled) {
        x3 = Math.max(0, Math.min(this._renderer.width, x3));
        y3 = Math.max(0, Math.min(this._renderer.height, y3));
      }
      return { x: x3, y: y3 };
    }
    // TODO: Do we keep these
    fixNodes() {
      this._simulator.fixNodes();
    }
    // TODO: Do we keep these
    releaseNodes() {
      this._simulator.releaseNodes();
    }
  };

  // node_modules/.pnpm/@memgraph+orb@1.1.0/node_modules/@memgraph/orb/dist/views/orb-map-view.js
  var L2 = __toESM(require_leaflet_src());

  // src/graph-component-packing.js
  function nodeId(value) {
    if (value && typeof value === "object") return String(value.id ?? "");
    return value === null || value === void 0 ? "" : String(value);
  }
  function edgeEndpoints(edge) {
    const start2 = nodeId(edge?.start ?? edge?.source ?? edge?.subjectId);
    const end = nodeId(edge?.end ?? edge?.target ?? edge?.objectId);
    return [start2, end];
  }
  function connectedGraphComponents(nodes = [], edges = []) {
    const ids = [...new Set((Array.isArray(nodes) ? nodes : []).map(nodeId).filter(Boolean))].sort((a2, b) => a2.localeCompare(b));
    const adjacency = new Map(ids.map((id2) => [id2, /* @__PURE__ */ new Set()]));
    for (const edge of Array.isArray(edges) ? edges : []) {
      const [start2, end] = edgeEndpoints(edge);
      if (!start2 || !end || start2 === end) continue;
      if (!adjacency.has(start2) || !adjacency.has(end)) continue;
      adjacency.get(start2).add(end);
      adjacency.get(end).add(start2);
    }
    const visited = /* @__PURE__ */ new Set();
    const components = [];
    for (const id2 of ids) {
      if (visited.has(id2)) continue;
      const stack = [id2];
      const component = [];
      visited.add(id2);
      while (stack.length) {
        const current = stack.pop();
        component.push(current);
        const neighbors = [...adjacency.get(current)].sort((a2, b) => b.localeCompare(a2));
        for (const neighbor of neighbors) {
          if (visited.has(neighbor)) continue;
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
      component.sort((a2, b) => a2.localeCompare(b));
      components.push(component);
    }
    return components.sort((a2, b) => (a2[0] || "").localeCompare(b[0] || ""));
  }
  function graphComponentTopologySignature(nodes = [], edges = []) {
    const ids = [...new Set((Array.isArray(nodes) ? nodes : []).map(nodeId).filter(Boolean))].sort((a2, b) => a2.localeCompare(b));
    const allowed = new Set(ids);
    const links = /* @__PURE__ */ new Set();
    for (const edge of Array.isArray(edges) ? edges : []) {
      let [start2, end] = edgeEndpoints(edge);
      if (!start2 || !end || start2 === end || !allowed.has(start2) || !allowed.has(end)) continue;
      if (start2.localeCompare(end) > 0) [start2, end] = [end, start2];
      links.add(`${start2}${end}`);
    }
    return `${ids.join("\0")}||${[...links].sort((a2, b) => a2.localeCompare(b)).join("\0")}`;
  }
  function normalizedRect(rect, index2) {
    const minX = Number(rect?.minX);
    const maxX = Number(rect?.maxX);
    const minY = Number(rect?.minY);
    const maxY = Number(rect?.maxY);
    if (![minX, maxX, minY, maxY].every(Number.isFinite)) return null;
    const left = Math.min(minX, maxX);
    const right = Math.max(minX, maxX);
    const top = Math.min(minY, maxY);
    const bottom = Math.max(minY, maxY);
    return {
      ...rect,
      key: String(rect?.key ?? index2),
      minX: left,
      maxX: right,
      minY: top,
      maxY: bottom,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
      centerX: (left + right) / 2,
      centerY: (top + bottom) / 2
    };
  }
  function layoutForColumns(rects, columns, gap) {
    const rows = Math.ceil(rects.length / columns);
    const columnWidths = Array(columns).fill(0);
    const rowHeights = Array(rows).fill(0);
    rects.forEach((rect, index2) => {
      const column = index2 % columns;
      const row = Math.floor(index2 / columns);
      columnWidths[column] = Math.max(columnWidths[column], rect.width);
      rowHeights[row] = Math.max(rowHeights[row], rect.height);
    });
    const width = columnWidths.reduce((sum, value) => sum + value, 0) + Math.max(0, columns - 1) * gap;
    const height = rowHeights.reduce((sum, value) => sum + value, 0) + Math.max(0, rows - 1) * gap;
    return { columns, rows, columnWidths, rowHeights, width, height };
  }
  function packComponentRects(rectangles = [], options = {}) {
    const gap = Math.max(0, Number(options.gap) || 0);
    const aspectRatio = Math.max(0.2, Math.min(5, Number(options.aspectRatio) || 1));
    const rects = (Array.isArray(rectangles) ? rectangles : []).map(normalizedRect).filter(Boolean).sort((a2, b) => a2.key.localeCompare(b.key));
    if (!rects.length) {
      return { columns: 0, rows: 0, width: 0, height: 0, placements: [] };
    }
    let best = null;
    for (let columns = 1; columns <= rects.length; columns += 1) {
      const candidate = layoutForColumns(rects, columns, gap);
      const layoutAspect = Math.max(1e-4, candidate.width / Math.max(1, candidate.height));
      const shapePenalty = Math.abs(Math.log(layoutAspect / aspectRatio));
      const area = candidate.width * candidate.height;
      const score = shapePenalty + area * 1e-9;
      if (!best || score < best.score - 1e-9 || Math.abs(score - best.score) <= 1e-9 && columns < best.columns) {
        best = { ...candidate, score };
      }
    }
    const columnCenters = [];
    let x3 = -best.width / 2;
    for (const width of best.columnWidths) {
      columnCenters.push(x3 + width / 2);
      x3 += width + gap;
    }
    const rowCenters = [];
    let y3 = -best.height / 2;
    for (const height of best.rowHeights) {
      rowCenters.push(y3 + height / 2);
      y3 += height + gap;
    }
    const placements = rects.map((rect, index2) => {
      const column = index2 % best.columns;
      const row = Math.floor(index2 / best.columns);
      const targetX = columnCenters[column];
      const targetY = rowCenters[row];
      return {
        key: rect.key,
        dx: targetX - rect.centerX,
        dy: targetY - rect.centerY,
        targetX,
        targetY
      };
    });
    return {
      columns: best.columns,
      rows: best.rows,
      width: best.width,
      height: best.height,
      placements
    };
  }

  // src/orb-graph-entry.js
  var LARGE_GRAPH_NODE_THRESHOLD = 1200;
  var GPU_LAYOUT_NODE_THRESHOLD = 3e3;
  var TOUCH_NODE_HOLD_MS = 420;
  var TOUCH_NODE_MOVE_TOLERANCE_PX = 12;
  var TOUCH_NODE_TARGET_DIAMETER_PX = 44;
  var TOUCH_EDGE_TARGET_RADIUS_PX = 22;
  var TOUCH_DOUBLE_TAP_MS = 320;
  var TOUCH_DOUBLE_TAP_DISTANCE_PX = 28;
  var GRAPH_DOUBLE_TAP_WHEEL_DELTA_PX = -500;
  var GRAPH_MIN_ZOOM = 2e-3;
  var GRAPH_MAX_ZOOM = 4;
  var GRAPH_KEYBOARD_PAN_PX = 72;
  var INTERACTION_SETTLE_MS = 2400;
  var DRAG_ALPHA_TARGET = 0.12;
  var RELEASE_ALPHA_TARGET = 0.065;
  var TOPOLOGY_ALPHA_TARGET = 0.085;
  var TOPOLOGY_EDGE_RELEASE_MS = 280;
  var TOPOLOGY_SETTLE_MS = 820;
  var TOPOLOGY_ENTRY_OFFSET = 36;
  var COMPONENT_PACKING_GAP = 112;
  var motion = globalThis.TimelineMotion;
  function resolvedColor(container, name, fallback) {
    const value = getComputedStyle(container).getPropertyValue(name).trim();
    if (!value) return fallback;
    if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return value;
    return fallback;
  }
  function supportsWebGL2() {
    try {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2"));
    } catch {
      return false;
    }
  }
  var ICON_PATHS = Object.freeze({
    event: ["M6 4h12v16H6z", "M8 2v4", "M16 2v4", "M6 8h12", "M9 12h2", "M13 12h2", "M9 16h2"],
    story: ["M4 18V6", "M4 7h7l2 2h7v8h-7l-2-2H4"],
    person: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"],
    place: ["M12 22s7-6.1 7-13a7 7 0 1 0-14 0c0 6.9 7 13 7 13z", "M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
    evidence: ["M5 3h10l4 4v14H5z", "M15 3v5h5", "M8 13h8", "M8 17h6"],
    organization: ["M4 21h16", "M6 21V8l6-5 6 5v13", "M9 11h1", "M14 11h1", "M9 15h1", "M14 15h1"],
    device: ["M5 4h14v12H5z", "M9 20h6", "M12 16v4"],
    account: ["M4 7h16v12H4z", "M4 10h16", "M8 15h4"],
    relation: ["M7 7h10", "M7 17h10", "M7 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0z", "M21 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"]
  });
  var iconCache = /* @__PURE__ */ new Map();
  function semanticType(data) {
    const type = String(data?.properties?.timelineType || "entity").toLowerCase();
    if (type === "chronology-item") return "event";
    if (type === "story") return "story";
    if (type.includes("person") || type.includes("group")) return "person";
    if (type.includes("place") || type.includes("location")) return "place";
    if (type.includes("evidence") || type.includes("document") || type.includes("record")) return "evidence";
    if (type.includes("organization") || type.includes("company") || type.includes("agency")) return "organization";
    if (type.includes("device") || type.includes("software")) return "device";
    if (type.includes("account")) return "account";
    return "relation";
  }
  function semanticIconUrl(type) {
    if (iconCache.has(type)) return iconCache.get(type);
    const paths = ICON_PATHS[type] || ICON_PATHS.relation;
    const pathMarkup = paths.map((d) => `<path d="${d}"/>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${pathMarkup}</svg>`;
    const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    iconCache.set(type, url);
    return url;
  }
  function nodeShape(type) {
    if (type === "event") return NodeShapeType.DIAMOND;
    if (type === "story") return NodeShapeType.HEXAGON;
    if (type === "organization") return NodeShapeType.SQUARE;
    if (type === "evidence") return NodeShapeType.DIAMOND;
    if (type === "device" || type === "account") return NodeShapeType.HEXAGON;
    return NodeShapeType.CIRCLE;
  }
  function create2(container, handlers = {}) {
    if (!(container instanceof HTMLElement)) throw new TypeError("Orb graph container is required.");
    const palette = {
      ink: resolvedColor(container, "--ink", "#181716"),
      muted: resolvedColor(container, "--muted", "#79736b"),
      paper: resolvedColor(container, "--paper", "#f8f6f2"),
      focus: resolvedColor(container, "--focus", "#315fbd"),
      story: resolvedColor(container, "--story", "#7256b5")
    };
    let currentMode = "worker-cpu";
    let lastSizeClass = "";
    let firstRender = true;
    let touchHold = null;
    let touchTap = null;
    let lastTouchTap = null;
    let touchReleaseFallback = 0;
    let touchDragBlockedUntilRelease = false;
    let suppressGraphClickUntil = 0;
    let selectedGraphObject = null;
    let cameraGesture = null;
    let cameraInertiaAnimationFrame = 0;
    let userOwnsCamera = false;
    let pendingAutoFit = false;
    let lastPackedTopologySignature = "";
    let interactionSettleTimer = 0;
    let forceNodeCount = 0;
    let hasGraphData = false;
    const topologyTimers = /* @__PURE__ */ new Set();
    const activeTouchPointers = /* @__PURE__ */ new Set();
    const orb = new OrbView(container, {
      render: {
        type: "canvas",
        backgroundColor: null,
        fitZoomMargin: 0.14,
        minZoom: GRAPH_MIN_ZOOM,
        maxZoom: GRAPH_MAX_ZOOM,
        labelsIsEnabled: true,
        labelsOnEventIsEnabled: true,
        shadowIsEnabled: false,
        contextAlphaOnEvent: 0.18,
        contextAlphaOnEventIsEnabled: true
      },
      layout: {
        type: "force",
        options: {
          links: { distance: 132, strength: 0.82, iterations: 2 },
          manyBody: { strength: -310, theta: 0.86, distanceMin: 20, distanceMax: 2400 },
          collision: { radius: 34, strength: 1, iterations: 3 },
          alpha: { alpha: 1, alphaMin: 0.012, alphaDecay: 0.021, alphaTarget: 0 },
          isSimulatingOnDataUpdate: true,
          isSimulatingOnSettingsUpdate: true,
          isSimulatingOnUnstick: true,
          isPhysicsEnabled: true,
          centering: { x: 0, y: 0, strength: 0.06 },
          positioning: {
            forceX: { x: 0, strength: 0.035 },
            forceY: { y: 0, strength: 0.035 }
          },
          useGPU: false
        }
      },
      interaction: {
        isDragEnabled: true,
        isZoomEnabled: true
      },
      zoomFitTransitionMs: 240
    });
    const ORB_TOUCH_DRAG_EVENT_TYPES = /* @__PURE__ */ new Set([
      "touchstart",
      "touchmove",
      "touchend",
      "touchcancel"
    ]);
    const ORB_NATIVE_CAMERA_DRAG_EVENT_TYPES = /* @__PURE__ */ new Set(["mousedown"]);
    function removeOrbTouchDragListeners() {
      const canvas = orb.canvas;
      const listeners = Array.isArray(canvas?.__on) ? canvas.__on : null;
      if (!canvas || !listeners?.length) return;
      const retained = [];
      for (const listener of listeners) {
        const isTouchDragListener = listener?.name === "drag" && ORB_TOUCH_DRAG_EVENT_TYPES.has(listener.type);
        if (!isTouchDragListener) {
          retained.push(listener);
          continue;
        }
        canvas.removeEventListener(listener.type, listener.listener, listener.options);
      }
      if (retained.length) canvas.__on = retained;
      else delete canvas.__on;
    }
    removeOrbTouchDragListeners();
    function removeOrbNativeCameraDragListeners() {
      const canvas = orb.canvas;
      const listeners = Array.isArray(canvas?.__on) ? canvas.__on : null;
      if (!canvas || !listeners?.length) return;
      const retained = [];
      for (const listener of listeners) {
        const isNativeCameraDrag = listener?.name === "zoom" && ORB_NATIVE_CAMERA_DRAG_EVENT_TYPES.has(listener.type);
        if (!isNativeCameraDrag) {
          retained.push(listener);
          continue;
        }
        canvas.removeEventListener(listener.type, listener.listener, listener.options);
      }
      if (retained.length) canvas.__on = retained;
      else delete canvas.__on;
    }
    removeOrbNativeCameraDragListeners();
    function forceAlphaProfile(nodeCount = forceNodeCount, alphaTarget = 0) {
      const dense = nodeCount >= 1e3;
      return {
        alpha: 1,
        alphaMin: dense ? 0.018 : 0.012,
        alphaDecay: dense ? 0.024 : 0.021,
        alphaTarget
      };
    }
    function forceLayoutOptions(nodeCount = forceNodeCount, alphaTarget = 0) {
      const dense = nodeCount >= 1e3;
      const useGPU = currentMode === "gpu-main-force";
      return {
        links: { distance: dense ? 128 : 168, strength: 0.78, iterations: 3 },
        manyBody: {
          strength: dense ? -300 : -460,
          theta: 0.84,
          distanceMin: 24,
          distanceMax: dense ? 1800 : 3200
        },
        collision: {
          radius: dense ? 30 : 42,
          strength: 1,
          iterations: 4
        },
        alpha: forceAlphaProfile(nodeCount, alphaTarget),
        isSimulatingOnDataUpdate: true,
        isSimulatingOnSettingsUpdate: true,
        isSimulatingOnUnstick: true,
        isPhysicsEnabled: true,
        centering: { x: 0, y: 0, strength: dense ? 0.02 : 0.035 },
        positioning: {
          forceX: { x: 0, strength: dense ? 0.012 : 0.02 },
          forceY: { y: 0, strength: dense ? 0.012 : 0.02 }
        },
        useGPU
      };
    }
    function forceSimulator() {
      const simulator = orb?._simulator;
      if (simulator && typeof simulator.setSettings === "function" && typeof simulator.activateSimulation === "function") {
        return simulator;
      }
      return null;
    }
    function touchDragSimulator() {
      const simulator = forceSimulator();
      if (simulator && typeof simulator.startDragNode === "function" && typeof simulator.dragNode === "function" && typeof simulator.endDragNode === "function") {
        return simulator;
      }
      return null;
    }
    function applyInteractionForce(alphaTarget) {
      const layout = {
        type: "force",
        options: forceLayoutOptions(forceNodeCount, alphaTarget)
      };
      const simulator = forceSimulator();
      if (simulator) {
        simulator.setSettings(layout);
        simulator.activateSimulation();
        return;
      }
      orb.setSettings({ layout });
    }
    function clearInteractionSettleTimer() {
      if (!interactionSettleTimer) return;
      globalThis.clearTimeout(interactionSettleTimer);
      interactionSettleTimer = 0;
    }
    function setInteractionHeat(alphaTarget) {
      clearInteractionSettleTimer();
      applyInteractionForce(alphaTarget);
    }
    function keepForceActiveAfterInteraction() {
      setInteractionHeat(RELEASE_ALPHA_TARGET);
      interactionSettleTimer = globalThis.setTimeout(() => {
        interactionSettleTimer = 0;
        applyInteractionForce(0);
      }, INTERACTION_SETTLE_MS);
    }
    function isTouchInput(event) {
      if (!event) return false;
      if (event.pointerType === "touch") return true;
      if (String(event.type || "").startsWith("touch")) return true;
      return Boolean(event.touches || event.changedTouches);
    }
    function eventClientPoint(event) {
      const source = event?.touches?.[0] || event?.changedTouches?.[0] || event;
      const x3 = Number(source?.clientX);
      const y3 = Number(source?.clientY);
      return Number.isFinite(x3) && Number.isFinite(y3) ? { x: x3, y: y3 } : null;
    }
    function setDragEnabled(enabled) {
      orb.setSettings({ interaction: { isDragEnabled: enabled } });
    }
    function clampCameraTransform(transform2) {
      if (!transform2 || typeof transform2.scale !== "function" || !Number.isFinite(transform2.k) || transform2.k <= 0) {
        return null;
      }
      const boundedScale = Math.min(GRAPH_MAX_ZOOM, Math.max(GRAPH_MIN_ZOOM, transform2.k));
      if (Math.abs(boundedScale - transform2.k) < 1e-9) return transform2;
      return transform2.scale(boundedScale / transform2.k);
    }
    function syncCameraZoomState() {
      const canvas = orb.canvas;
      const renderer = orb?._renderer;
      const transform2 = clampCameraTransform(renderer?.transform);
      if (!canvas || !transform2) {
        if (canvas && renderer?.transform && (!Number.isFinite(renderer.transform.k) || renderer.transform.k <= 0)) {
          orb.recenter();
        }
        return;
      }
      canvas.__zoom = transform2;
      if (renderer && renderer.transform !== transform2) renderer.transform = transform2;
    }
    function setZoomEnabled(enabled) {
      syncCameraZoomState();
      orb.setSettings({ interaction: { isZoomEnabled: enabled } });
    }
    function cancelCameraInertia() {
      if (cameraInertiaAnimationFrame) cancelAnimationFrame(cameraInertiaAnimationFrame);
      cameraInertiaAnimationFrame = 0;
    }
    function markCameraOwnedByUser() {
      userOwnsCamera = true;
      pendingAutoFit = false;
    }
    function releaseCameraToAutoFit() {
      userOwnsCamera = false;
      pendingAutoFit = false;
    }
    function requestAutoFit() {
      if (!userOwnsCamera) pendingAutoFit = true;
    }
    function applyPendingAutoFit() {
      if (userOwnsCamera || !pendingAutoFit) return false;
      pendingAutoFit = false;
      orb.recenter();
      return true;
    }
    function applyCameraPan(deltaX, deltaY) {
      const canvas = orb.canvas;
      const transform2 = clampCameraTransform(canvas?.__zoom || orb?._renderer?.transform);
      if (!canvas || !transform2 || typeof transform2.translate !== "function") return false;
      markCameraOwnedByUser();
      const next = transform2.translate(deltaX / transform2.k, deltaY / transform2.k);
      canvas.__zoom = next;
      if (orb._renderer) orb._renderer.transform = next;
      orb.render();
      return true;
    }
    function startCameraInertia(velocity) {
      if (!velocity || prefersReducedMotion() || !motion?.decayVelocity || velocity.magnitude < (motion.STOP_VELOCITY_PX_PER_MS || 0.012)) {
        return;
      }
      cancelCameraInertia();
      let velocityX = velocity.x;
      let velocityY = velocity.y;
      let lastFrame = 0;
      const step = (now2) => {
        cameraInertiaAnimationFrame = 0;
        const magnitude = Math.hypot(velocityX, velocityY);
        if (magnitude < (motion.STOP_VELOCITY_PX_PER_MS || 0.012)) return;
        const elapsed = lastFrame ? Math.min(48, Math.max(1, now2 - lastFrame)) : 16;
        lastFrame = now2;
        velocityX = motion.decayVelocity(velocityX, elapsed);
        velocityY = motion.decayVelocity(velocityY, elapsed);
        if (!applyCameraPan(velocityX * elapsed, velocityY * elapsed)) return;
        if (Math.hypot(velocityX, velocityY) >= (motion.STOP_VELOCITY_PX_PER_MS || 0.012)) {
          cameraInertiaAnimationFrame = requestAnimationFrame(step);
        }
      };
      cameraInertiaAnimationFrame = requestAnimationFrame(step);
    }
    function beginCameraGesture(event, target) {
      cancelCameraInertia();
      const transform2 = orb.canvas?.__zoom || orb?._renderer?.transform;
      if (event.button !== 0 || target?.object || !transform2 || typeof transform2.translate !== "function" || !motion?.appendPointerVectorSamples || !motion?.estimatePointerVectorVelocity || !motion?.responseForElapsed) {
        cameraGesture = null;
        return;
      }
      const startClientPoint = eventClientPoint(event);
      if (!startClientPoint) {
        cameraGesture = null;
        return;
      }
      cameraGesture = {
        pointerId: event.pointerId,
        startClientPoint,
        startTransform: transform2,
        weightedTransform: transform2,
        lastTime: Number(event.timeStamp) || performance.now(),
        samples: [],
        moved: false
      };
      motion.appendPointerVectorSamples(cameraGesture.samples, event);
      try {
        container.setPointerCapture?.(event.pointerId);
      } catch {
      }
    }
    function updateCameraGesture(event) {
      if (!cameraGesture || cameraGesture.pointerId !== event.pointerId) return false;
      const gesture = cameraGesture;
      motion.appendPointerVectorSamples(gesture.samples, event);
      const origin = gesture.startClientPoint;
      if (!origin) return false;
      const deltaX = event.clientX - origin.x;
      const deltaY = event.clientY - origin.y;
      if (Math.hypot(deltaX, deltaY) > TOUCH_NODE_MOVE_TOLERANCE_PX) {
        gesture.moved = true;
      }
      const target = gesture.startTransform.translate(
        deltaX / gesture.startTransform.k,
        deltaY / gesture.startTransform.k
      );
      const now2 = Number(event.timeStamp) || performance.now();
      const response = motion.responseForElapsed(now2 - gesture.lastTime);
      gesture.lastTime = now2;
      const current = gesture.weightedTransform;
      const next = current.translate(
        (target.x - current.x) * response / current.k,
        (target.y - current.y) * response / current.k
      );
      gesture.weightedTransform = next;
      if (orb.canvas) orb.canvas.__zoom = next;
      if (orb._renderer) orb._renderer.transform = next;
      orb.render();
      return true;
    }
    function finishCameraGesture(event) {
      if (!cameraGesture || cameraGesture.pointerId !== event.pointerId) return;
      const gesture = cameraGesture;
      cameraGesture = null;
      releaseTouchPointerCapture(event.pointerId);
      if (event.type === "pointercancel" || !gesture.moved) return;
      markCameraOwnedByUser();
      motion.appendPointerVectorSamples(gesture.samples, event);
      const velocity = motion.estimatePointerVectorVelocity(gesture.samples);
      suppressGraphClickUntil = performance.now() + 300;
      void motion.pulseHaptic?.("release");
      requestAnimationFrame(() => startCameraInertia(velocity));
    }
    function zoomGraphAtClientPoint(point) {
      if (!point || !orb.canvas) return;
      const event = new WheelEvent("wheel", {
        clientX: point.x,
        clientY: point.y,
        deltaY: GRAPH_DOUBLE_TAP_WHEEL_DELTA_PX,
        deltaMode: 0,
        bubbles: true,
        cancelable: true
      });
      orb.canvas.dispatchEvent(event);
    }
    function registerTouchTap(event, tap) {
      if (!tap || tap.cancelled) return false;
      const now2 = performance.now();
      const point = eventClientPoint(event);
      const previous = lastTouchTap;
      touchTap = null;
      if (!point) return false;
      if (previous && now2 - previous.time <= TOUCH_DOUBLE_TAP_MS && Math.hypot(point.x - previous.x, point.y - previous.y) <= TOUCH_DOUBLE_TAP_DISTANCE_PX) {
        lastTouchTap = null;
        suppressGraphClickUntil = now2 + 450;
        zoomGraphAtClientPoint(point);
        return true;
      }
      lastTouchTap = { time: now2, x: point.x, y: point.y };
      return false;
    }
    function selectGraphObject(object) {
      if (selectedGraphObject && selectedGraphObject !== object && selectedGraphObject.getState?.() === GraphObjectState.SELECTED) {
        selectedGraphObject.setState(GraphObjectState.NONE, { isNotifySkipped: true });
      }
      selectedGraphObject = object || null;
      if (selectedGraphObject) {
        selectedGraphObject.setState(GraphObjectState.SELECTED, { isNotifySkipped: true });
      }
      orb.render();
    }
    function clearTouchReleaseFallback() {
      if (!touchReleaseFallback) return;
      globalThis.clearTimeout(touchReleaseFallback);
      touchReleaseFallback = 0;
    }
    function clearTouchHoldTimer() {
      if (!touchHold?.timer) return;
      globalThis.clearTimeout(touchHold.timer);
      touchHold.timer = 0;
    }
    function clearTouchHoldVisual() {
      container.style.removeProperty("--graph-touch-hold-x");
      container.style.removeProperty("--graph-touch-hold-y");
    }
    function releaseTouchPointerCapture(pointerId) {
      if (!Number.isFinite(pointerId)) return;
      try {
        if (container.hasPointerCapture?.(pointerId)) container.releasePointerCapture(pointerId);
      } catch {
      }
    }
    function finishActiveTouchNodeDrag({ settle = true } = {}) {
      if (!touchHold?.activated) return false;
      const node = touchHold.node;
      const pointerId = touchHold.pointerId;
      const simulator = touchDragSimulator();
      if (simulator && node) simulator.endDragNode(node.getId());
      touchHold.activated = false;
      releaseTouchPointerCapture(pointerId);
      if (settle) keepForceActiveAfterInteraction();
      return true;
    }
    function finishTouchGesture() {
      clearTouchReleaseFallback();
      clearTouchHoldTimer();
      if (touchHold?.activated) finishActiveTouchNodeDrag({ settle: false });
      touchHold = null;
      touchDragBlockedUntilRelease = false;
      delete container.dataset.touchDrag;
      clearTouchHoldVisual();
      setDragEnabled(true);
      setZoomEnabled(true);
    }
    function cancelPendingTouchHold() {
      if (!touchHold || touchHold.activated) return;
      markCameraOwnedByUser();
      clearTouchHoldTimer();
      touchHold = null;
      touchDragBlockedUntilRelease = true;
      container.dataset.touchDrag = "cancelled";
      clearTouchHoldVisual();
      setDragEnabled(false);
      setZoomEnabled(true);
    }
    function touchGeometry(event) {
      const point = eventClientPoint(event);
      if (!point || !orb.canvas) return null;
      const rect = orb.canvas.getBoundingClientRect();
      const globalPoint = {
        x: Math.max(0, Math.min(rect.width, point.x - rect.left)),
        y: Math.max(0, Math.min(rect.height, point.y - rect.top))
      };
      const localPoint = orb.getSimulationPosition(globalPoint);
      return { event, globalPoint, localPoint };
    }
    function simulationRadiusForPixels(globalPoint, radiusPx) {
      if (!orb.canvas || !globalPoint) return 0;
      const rect = orb.canvas.getBoundingClientRect();
      const direction = globalPoint.x + radiusPx <= rect.width ? 1 : -1;
      const offsetPoint = {
        x: Math.max(0, Math.min(rect.width, globalPoint.x + radiusPx * direction)),
        y: globalPoint.y
      };
      const localStart = orb.getSimulationPosition(globalPoint);
      const localEnd = orb.getSimulationPosition(offsetPoint);
      return Math.hypot(localEnd.x - localStart.x, localEnd.y - localStart.y);
    }
    function expandedTouchNode(localPoint, globalPoint) {
      const exact = orb.data.getNearestNode(localPoint);
      if (exact) return exact;
      const minimumRadius = simulationRadiusForPixels(
        globalPoint,
        TOUCH_NODE_TARGET_DIAMETER_PX / 2
      );
      let best = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      const nodes = orb.data.getNodes();
      for (let index2 = nodes.length - 1; index2 >= 0; index2 -= 1) {
        const node = nodes[index2];
        const center = node.getCenter?.();
        if (!center || !Number.isFinite(center.x) || !Number.isFinite(center.y)) continue;
        const distance = Math.hypot(localPoint.x - center.x, localPoint.y - center.y);
        const hitRadius = Math.max(Number(node.getBorderedRadius?.()) || 0, minimumRadius);
        if (distance <= hitRadius && distance < bestDistance) {
          best = node;
          bestDistance = distance;
        }
      }
      return best;
    }
    function touchTargetPayload(event) {
      const geometry = touchGeometry(event);
      if (!geometry) return null;
      const node = expandedTouchNode(geometry.localPoint, geometry.globalPoint);
      if (node) return { ...geometry, kind: "node", object: node };
      const edgeTolerance = simulationRadiusForPixels(
        geometry.globalPoint,
        TOUCH_EDGE_TARGET_RADIUS_PX
      );
      const edge = orb.data.getNearestEdge(geometry.localPoint, edgeTolerance);
      return edge ? { ...geometry, kind: "edge", object: edge } : { ...geometry, kind: null, object: null };
    }
    function touchNodePayload(event) {
      const payload = touchTargetPayload(event);
      return payload?.kind === "node" ? { node: payload.object, event, globalPoint: payload.globalPoint, localPoint: payload.localPoint } : null;
    }
    function beginTouchHold({ node, event, globalPoint, localPoint }) {
      clearTouchReleaseFallback();
      clearTouchHoldTimer();
      setDragEnabled(false);
      setZoomEnabled(false);
      touchDragBlockedUntilRelease = true;
      if (activeTouchPointers.size > 1) {
        touchHold = null;
        container.dataset.touchDrag = "cancelled";
        return;
      }
      touchHold = {
        node,
        pointerId: event.pointerId,
        startClientPoint: eventClientPoint(event),
        startGlobalPoint: globalPoint,
        startLocalPoint: localPoint,
        activated: false,
        timer: 0
      };
      container.style.setProperty("--graph-touch-hold-x", globalPoint.x + "px");
      container.style.setProperty("--graph-touch-hold-y", globalPoint.y + "px");
      container.dataset.touchDrag = "holding";
      touchHold.timer = globalThis.setTimeout(() => {
        if (!touchHold || touchHold.node !== node || activeTouchPointers.size > 1) return;
        touchHold.activated = true;
        touchTap = null;
        lastTouchTap = null;
        touchDragBlockedUntilRelease = false;
        container.dataset.touchDrag = "active";
        setDragEnabled(false);
        setZoomEnabled(false);
        cancelCameraInertia();
        cameraGesture = null;
        const simulator = touchDragSimulator();
        setInteractionHeat(DRAG_ALPHA_TARGET);
        simulator?.startDragNode();
        try {
          container.setPointerCapture?.(touchHold.pointerId);
        } catch {
        }
        selectGraphObject(node);
        handlers.onNodeLongPress?.(node.getData());
        try {
          globalThis.navigator?.vibrate?.(12);
        } catch {
        }
      }, TOUCH_NODE_HOLD_MS);
    }
    function onPointerDown(event) {
      if (event.button !== 0) return;
      const target = touchTargetPayload(event);
      if (event.pointerType !== "touch") {
        if (target?.kind === "node") {
          cancelCameraInertia();
          cameraGesture = null;
          setInteractionHeat(DRAG_ALPHA_TARGET);
        } else {
          beginCameraGesture(event, target);
        }
        return;
      }
      activeTouchPointers.add(event.pointerId);
      if (activeTouchPointers.size > 1) {
        if (cameraGesture?.pointerId !== null && cameraGesture?.pointerId !== void 0) releaseTouchPointerCapture(cameraGesture.pointerId);
        cameraGesture = null;
        cancelCameraInertia();
        if (touchHold?.activated) {
          touchTap = null;
          lastTouchTap = null;
          setDragEnabled(false);
          setZoomEnabled(false);
          return;
        }
        markCameraOwnedByUser();
      } else {
        beginCameraGesture(event, target);
      }
      touchTap = {
        pointerId: event.pointerId,
        startClientPoint: eventClientPoint(event),
        target,
        cancelled: false
      };
      if (activeTouchPointers.size > 1) {
        touchTap = null;
        lastTouchTap = null;
        if (touchHold && !touchHold.activated) cancelPendingTouchHold();
        touchDragBlockedUntilRelease = true;
        setDragEnabled(false);
        setZoomEnabled(true);
        return;
      }
      const payload = target?.kind === "node" ? { node: target.object, event, globalPoint: target.globalPoint, localPoint: target.localPoint } : null;
      if (payload) beginTouchHold(payload);
    }
    function onPointerMove(event) {
      updateCameraGesture(event);
      if (event.pointerType !== "touch") return;
      if (touchTap?.pointerId === event.pointerId && !touchTap.cancelled) {
        const origin2 = touchTap.startClientPoint;
        if (origin2) {
          const distance2 = Math.hypot(event.clientX - origin2.x, event.clientY - origin2.y);
          if (distance2 > TOUCH_NODE_MOVE_TOLERANCE_PX) {
            touchTap.cancelled = true;
            lastTouchTap = null;
          }
        }
      }
      if (!touchHold) return;
      if (touchHold.activated) {
        if (touchHold.pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        const geometry = touchGeometry(event);
        const simulator = touchDragSimulator();
        if (geometry && simulator) {
          simulator.dragNode(touchHold.node.getId(), geometry.localPoint);
          clearInteractionSettleTimer();
        }
        return;
      }
      const origin = touchHold.startClientPoint;
      if (!origin) return;
      const distance = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
      if (distance > TOUCH_NODE_MOVE_TOLERANCE_PX) {
        cancelPendingTouchHold();
        beginCameraGesture(event, null);
      }
    }
    function scheduleTouchReleaseFallback() {
      clearTouchReleaseFallback();
      touchReleaseFallback = globalThis.setTimeout(() => {
        if (touchHold?.activated || touchDragBlockedUntilRelease) finishTouchGesture();
      }, 48);
    }
    function onPointerUp(event) {
      finishCameraGesture(event);
      if (event.pointerType !== "touch") return;
      const tap = touchTap?.pointerId === event.pointerId ? touchTap : null;
      const ownsActiveNodeDrag = Boolean(
        touchHold?.activated && touchHold.pointerId === event.pointerId
      );
      activeTouchPointers.delete(event.pointerId);
      if (ownsActiveNodeDrag) {
        touchTap = null;
        lastTouchTap = null;
        finishActiveTouchNodeDrag();
        finishTouchGesture();
        if (activeTouchPointers.size) {
          setDragEnabled(false);
          setZoomEnabled(false);
          touchDragBlockedUntilRelease = true;
        }
        return;
      }
      if (activeTouchPointers.size) {
        touchTap = null;
        return;
      }
      if (touchHold?.activated) {
        touchTap = null;
        lastTouchTap = null;
        finishActiveTouchNodeDrag();
        finishTouchGesture();
        return;
      }
      finishTouchGesture();
      if (event.type === "pointercancel") {
        touchTap = null;
        lastTouchTap = null;
        return;
      }
      if (tap && !tap.cancelled) {
        const didDoubleTap = registerTouchTap(event, tap);
        if (!didDoubleTap && tap.target?.object) {
          suppressGraphClickUntil = performance.now() + 300;
          selectGraphObject(tap.target.object);
          if (tap.target.kind === "node") handlers.onNodeClick?.(tap.target.object.getData());
          if (tap.target.kind === "edge") handlers.onEdgeClick?.(tap.target.object.getData());
        }
      } else {
        touchTap = null;
      }
    }
    function onTouchMoveCapture(event) {
      const nodeDragOwnsGesture = Boolean(touchHold?.activated);
      const weightedCameraOwnsGesture = Boolean(
        cameraGesture && activeTouchPointers.size === 1
      );
      if (!nodeDragOwnsGesture && !weightedCameraOwnsGesture) return;
      event.preventDefault();
      event.stopPropagation();
    }
    function onTouchEnd(event) {
      if (event.touches?.length) return;
      activeTouchPointers.clear();
      cameraGesture = null;
      if (touchHold?.activated) {
        finishActiveTouchNodeDrag();
        finishTouchGesture();
        return;
      }
      finishTouchGesture();
    }
    function abortTouchInteraction() {
      cancelCameraInertia();
      cameraGesture = null;
      touchTap = null;
      lastTouchTap = null;
      activeTouchPointers.clear();
      if (touchHold?.activated) finishActiveTouchNodeDrag();
      finishTouchGesture();
    }
    const onWindowBlur = () => abortTouchInteraction();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") abortTouchInteraction();
    };
    const onClickCapture = (event) => {
      if (performance.now() >= suppressGraphClickUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const onWheelCapture = () => {
      markCameraOwnedByUser();
      cancelCameraInertia();
    };
    const onGraphKeyDown = (event) => {
      if (event.target !== container || event.altKey || event.ctrlKey || event.metaKey) return;
      let handled = true;
      cancelCameraInertia();
      switch (event.key) {
        case "ArrowLeft":
          applyCameraPan(GRAPH_KEYBOARD_PAN_PX, 0);
          break;
        case "ArrowRight":
          applyCameraPan(-GRAPH_KEYBOARD_PAN_PX, 0);
          break;
        case "ArrowUp":
          applyCameraPan(0, GRAPH_KEYBOARD_PAN_PX);
          break;
        case "ArrowDown":
          applyCameraPan(0, -GRAPH_KEYBOARD_PAN_PX);
          break;
        case "+":
        case "=":
          markCameraOwnedByUser();
          orb.zoomIn();
          break;
        case "-":
        case "_":
          markCameraOwnedByUser();
          orb.zoomOut();
          break;
        case "Home":
        case "0":
          releaseCameraToAutoFit();
          orb.recenter();
          break;
        default:
          handled = false;
      }
      if (handled) event.preventDefault();
    };
    const onLostPointerCapture = (event) => {
      if (!touchHold?.activated || touchHold.pointerId !== event.pointerId) return;
      finishActiveTouchNodeDrag();
      finishTouchGesture();
    };
    container.addEventListener("click", onClickCapture, { capture: true });
    container.addEventListener("wheel", onWheelCapture, { capture: true, passive: true });
    container.addEventListener("keydown", onGraphKeyDown);
    container.addEventListener("pointerdown", onPointerDown, { capture: true });
    container.addEventListener("pointermove", onPointerMove, { capture: true });
    container.addEventListener("pointerup", onPointerUp, { capture: true });
    container.addEventListener("pointercancel", onPointerUp, { capture: true });
    container.addEventListener("lostpointercapture", onLostPointerCapture, { capture: true });
    container.addEventListener("touchmove", onTouchMoveCapture, { capture: true, passive: false });
    container.addEventListener("touchend", onTouchEnd);
    container.addEventListener("touchcancel", onTouchEnd);
    globalThis.addEventListener?.("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    function nodeStyle(data) {
      const type = semanticType(data);
      const transition2 = data?.__timelineTransition || "active";
      const exiting = transition2 === "exiting";
      const entering = transition2 === "entering";
      const baseColor = type === "event" ? palette.focus : type === "story" ? palette.story : type === "evidence" ? "#8a4f2b" : type === "place" ? "#3e6d5b" : type === "person" ? "#4b5f86" : type === "organization" ? "#6b526f" : palette.ink;
      const color2 = exiting ? palette.muted : baseColor;
      const size = type === "event" ? 12 : type === "story" ? 13 : 10;
      return {
        size: exiting ? Math.max(6, size * 0.72) : entering ? size * 0.88 : size,
        mass: type === "event" ? 2.6 : type === "story" ? 2.2 : 1.35,
        shape: nodeShape(type),
        imageUrl: semanticIconUrl(type),
        imageUrlSelected: semanticIconUrl(type),
        color: color2,
        colorHover: palette.focus,
        colorSelected: palette.focus,
        borderColor: palette.paper,
        borderColorHover: palette.paper,
        borderColorSelected: palette.paper,
        borderWidth: exiting ? 1 : 2,
        borderWidthSelected: 4,
        label: data?.label || String(data?.id || ""),
        fontSize: exiting ? 10 : 12,
        fontColor: exiting ? palette.muted : palette.ink,
        fontBackgroundColor: palette.paper,
        zIndex: type === "event" ? 4 : type === "story" ? 3 : 2
      };
    }
    function edgeSemantic(data) {
      const label = String(data?.label || "").toLowerCase();
      if (/call|message|email|contact|communicat/.test(label)) return { glyph: "\u260E", color: "#496f8c" };
      if (/transfer|own|pay|send|receive|deliver/.test(label)) return { glyph: "\u21E2", color: "#8a5b2d" };
      if (/authoriz|approv|decid|permit/.test(label)) return { glyph: "\u2713", color: palette.story };
      if (/investigat|review|audit|inspect|verify/.test(label)) return { glyph: "\u2315", color: "#596b86" };
      if (/occur|locat|visit|travel|arriv/.test(label)) return { glyph: "\u2316", color: "#3e6d5b" };
      if (/interview|witness|particip|meet|corroborat/.test(label)) return { glyph: "\u2194", color: "#6b526f" };
      return { glyph: "\u2192", color: palette.focus };
    }
    function edgeStyle(data) {
      const state = data?.temporalState || "timeless";
      const transition2 = data?.__timelineTransition || "active";
      const releasing = transition2 === "releasing";
      const entering = transition2 === "entering";
      const inactive = state === "inactive";
      const changed = state === "changed";
      const timeless = state === "timeless";
      const semantic = edgeSemantic(data);
      const color2 = releasing ? palette.muted : inactive || timeless ? palette.muted : changed ? palette.story : semantic.color;
      return {
        color: color2,
        colorHover: palette.focus,
        colorSelected: palette.focus,
        width: releasing ? 0.42 : entering ? 1.45 : inactive ? 0.35 : timeless ? 0.6 : changed ? 1.5 : 0.9,
        widthHover: 1.8,
        widthSelected: 2.2,
        arrowSize: releasing ? 0.65 : entering ? 1.45 : inactive ? 0.8 : 1.25,
        label: inactive ? "" : `${semantic.glyph} ${data?.label || ""}`.trim(),
        fontSize: 11,
        fontColor: color2,
        fontBackgroundColor: palette.paper,
        lineStyle: releasing || inactive ? { type: EdgeLineStyleType.DASHED } : { type: EdgeLineStyleType.SOLID }
      };
    }
    orb.data.setDefaultStyle({
      getNodeStyle(node) {
        return nodeStyle(node.getData());
      },
      getEdgeStyle(edge) {
        return edgeStyle(edge.getData());
      }
    });
    const onNodeClick = ({ node }) => {
      selectGraphObject(node);
      handlers.onNodeClick?.(node.getData());
    };
    const onEdgeClick = ({ edge }) => {
      selectGraphObject(edge);
      handlers.onEdgeClick?.(edge.getData());
    };
    const onNodeDragStart = () => {
      clearInteractionSettleTimer();
      forceSimulator()?.activateSimulation();
    };
    const onNodeDrag = () => {
      clearInteractionSettleTimer();
    };
    const onNodeDragEnd = (payload) => {
      keepForceActiveAfterInteraction();
      if (isTouchInput(payload.event) && touchHold?.activated) finishTouchGesture();
    };
    const onSimulationStart = () => handlers.onSimulationState?.({ running: true, mode: currentMode });
    const onSimulationEnd = ({ durationMs }) => {
      handlers.onSimulationState?.({ running: false, mode: currentMode, durationMs });
      if (firstRender) {
        firstRender = false;
        requestAutoFit();
      }
      if (packDisconnectedComponents()) requestAutoFit();
      applyPendingAutoFit();
    };
    orb.events.on(OrbEventType.NODE_CLICK, onNodeClick);
    orb.events.on(OrbEventType.EDGE_CLICK, onEdgeClick);
    orb.events.on(OrbEventType.NODE_DRAG_START, onNodeDragStart);
    orb.events.on(OrbEventType.NODE_DRAG, onNodeDrag);
    orb.events.on(OrbEventType.NODE_DRAG_END, onNodeDragEnd);
    orb.events.on(OrbEventType.SIMULATION_START, onSimulationStart);
    orb.events.on(OrbEventType.SIMULATION_END, onSimulationEnd);
    function setPerformanceMode(nodeCount) {
      forceNodeCount = nodeCount;
      const wantsWebGL = nodeCount >= LARGE_GRAPH_NODE_THRESHOLD && supportsWebGL2();
      const wantsGPU = nodeCount >= GPU_LAYOUT_NODE_THRESHOLD && wantsWebGL;
      const sizeClass = `${wantsWebGL ? "webgl" : "canvas"}:${wantsGPU ? "gpu" : "worker"}:${nodeCount >= 400 ? "dense" : "normal"}`;
      if (sizeClass === lastSizeClass) return;
      lastSizeClass = sizeClass;
      currentMode = wantsGPU ? "gpu-main-force" : "worker-cpu";
      orb.setRenderer(wantsWebGL ? "webgl" : "canvas");
      removeOrbTouchDragListeners();
      removeOrbNativeCameraDragListeners();
      orb.setSettings({
        render: {
          labelsIsEnabled: nodeCount < 1800,
          labelsOnEventIsEnabled: true,
          shadowIsEnabled: false,
          minZoom: nodeCount >= 3e3 ? 5e-4 : 2e-3
        },
        layout: {
          type: "force",
          options: {
            ...forceLayoutOptions(nodeCount, 0),
            useGPU: wantsGPU
          }
        }
      });
    }
    function clearTopologyTimers() {
      for (const timer2 of topologyTimers) globalThis.clearTimeout(timer2);
      topologyTimers.clear();
    }
    function scheduleTopologyStep(callback, delay) {
      const timer2 = globalThis.setTimeout(() => {
        topologyTimers.delete(timer2);
        callback();
      }, delay);
      topologyTimers.add(timer2);
    }
    function prefersReducedMotion() {
      return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    }
    function transitionRecord(record, state) {
      return { ...record, __timelineTransition: state };
    }
    function currentNodeRecords() {
      return orb.data.getNodes().map((node) => node.getData());
    }
    function currentEdgeRecords() {
      return orb.data.getEdges().map((edge) => edge.getData());
    }
    function packDisconnectedComponents() {
      const nodeRecords = currentNodeRecords();
      const edgeRecords = currentEdgeRecords();
      const signature = graphComponentTopologySignature(nodeRecords, edgeRecords);
      if (signature === lastPackedTopologySignature) return false;
      lastPackedTopologySignature = signature;
      const components = connectedGraphComponents(nodeRecords, edgeRecords);
      if (components.length <= 1) return false;
      const nodeObjects = new Map(
        orb.data.getNodes().map((node) => [String(node.getData()?.id ?? ""), node]).filter(([id2]) => id2)
      );
      const componentRects = [];
      for (const component of components) {
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        for (const id2 of component) {
          const node = nodeObjects.get(String(id2));
          const position = node?.getPosition?.() || node?.getCenter?.();
          if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) continue;
          const radius = Math.max(18, Number(node?.getBorderedRadius?.()) || 0);
          minX = Math.min(minX, position.x - radius);
          maxX = Math.max(maxX, position.x + radius);
          minY = Math.min(minY, position.y - radius);
          maxY = Math.max(maxY, position.y + radius);
        }
        if (![minX, maxX, minY, maxY].every(Number.isFinite)) continue;
        componentRects.push({
          key: component[0],
          nodeIds: component,
          minX,
          maxX,
          minY,
          maxY
        });
      }
      if (componentRects.length <= 1) return false;
      const width = Math.max(1, Number(container.clientWidth) || 1);
      const height = Math.max(1, Number(container.clientHeight) || 1);
      const aspectRatio = Math.max(0.35, Math.min(3, width / height));
      const plan = packComponentRects(componentRects, {
        aspectRatio,
        gap: COMPONENT_PACKING_GAP
      });
      const offsets = new Map(plan.placements.map((placement) => [placement.key, placement]));
      let moved = false;
      for (const component of componentRects) {
        const offset = offsets.get(component.key);
        if (!offset || (!Number.isFinite(offset.dx) || !Number.isFinite(offset.dy))) continue;
        if (Math.abs(offset.dx) < 1 && Math.abs(offset.dy) < 1) continue;
        for (const id2 of component.nodeIds) {
          const node = nodeObjects.get(String(id2));
          const position = node?.getPosition?.() || node?.getCenter?.();
          if (!node || !position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) continue;
          node.setPosition({
            x: position.x + offset.dx,
            y: position.y + offset.dy
          });
        }
        moved = true;
      }
      if (moved) orb.render();
      return moved;
    }
    function markNodeTransition(id2, state) {
      const node = orb.data.getNodeById(id2);
      if (!node) return;
      const next = transitionRecord(node.getData(), state);
      node.setData(next, { isNotifySkipped: true });
      node.setStyle(nodeStyle(next), { isNotifySkipped: true });
    }
    function markEdgeTransition(id2, state) {
      const edge = orb.data.getEdgeById(id2);
      if (!edge) return;
      const next = transitionRecord(edge.getData(), state);
      edge.setData(next, { isNotifySkipped: true });
      edge.setStyle(edgeStyle(next), { isNotifySkipped: true });
    }
    function deterministicAngle(id2) {
      const text = String(id2);
      let hash = 0;
      for (let index2 = 0; index2 < text.length; index2 += 1) {
        hash = (hash << 5) - hash + text.charCodeAt(index2) | 0;
      }
      return Math.abs(hash) % 360 * Math.PI / 180;
    }
    function positionIncomingNodes(incomingNodes, desiredEdges) {
      const incomingIds = new Set(incomingNodes.map((node) => String(node.id)));
      for (const record of incomingNodes) {
        const node = orb.data.getNodeById(record.id);
        if (!node) continue;
        const adjacent = desiredEdges.filter((edge) => String(edge.start) === String(record.id) || String(edge.end) === String(record.id)).map((edge) => String(edge.start) === String(record.id) ? edge.end : edge.start);
        const anchorId = adjacent.find((id2) => !incomingIds.has(String(id2))) ?? adjacent[0];
        if (anchorId === null || anchorId === void 0) continue;
        const anchor = orb.data.getNodeById(anchorId);
        const position = anchor?.getPosition?.();
        if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) continue;
        const angle = deterministicAngle(record.id);
        node.setPosition({
          x: position.x + Math.cos(angle) * TOPOLOGY_ENTRY_OFFSET,
          y: position.y + Math.sin(angle) * TOPOLOGY_ENTRY_OFFSET
        });
      }
    }
    function finalizeTopology(data) {
      const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
      const edges = Array.isArray(data?.edges) ? data.edges : [];
      const desiredNodeIds = new Set(nodes.map((node) => String(node.id)));
      const desiredEdgeIds = new Set(edges.map((edge) => String(edge.id)));
      const removeEdgeIds = currentEdgeRecords().filter((edge) => !desiredEdgeIds.has(String(edge.id))).map((edge) => edge.id);
      const removeNodeIds = currentNodeRecords().filter((node) => !desiredNodeIds.has(String(node.id))).map((node) => node.id);
      if (removeEdgeIds.length || removeNodeIds.length) {
        orb.data.remove({ edgeIds: removeEdgeIds, nodeIds: removeNodeIds });
      }
      orb.data.merge({
        nodes: nodes.map((node) => transitionRecord(node, "active")),
        edges: edges.map((edge) => transitionRecord(edge, "active"))
      });
      setPerformanceMode(nodes.length);
      orb.render();
    }
    function setData(data) {
      clearTopologyTimers();
      cancelCameraInertia();
      cameraGesture = null;
      finishTouchGesture();
      releaseCameraToAutoFit();
      lastPackedTopologySignature = "";
      selectedGraphObject = null;
      const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
      const edges = Array.isArray(data?.edges) ? data.edges : [];
      setPerformanceMode(nodes.length);
      firstRender = true;
      orb.data.setup({
        nodes: nodes.map((node) => transitionRecord(node, "active")),
        edges: edges.map((edge) => transitionRecord(edge, "active"))
      });
      hasGraphData = true;
      orb.render();
      handlers.onSimulationState?.({ running: true, mode: currentMode });
    }
    function transitionData(data) {
      if (!hasGraphData) {
        setData(data);
        return;
      }
      clearTopologyTimers();
      const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
      const edges = Array.isArray(data?.edges) ? data.edges : [];
      const currentNodes = currentNodeRecords();
      const currentEdges = currentEdgeRecords();
      const currentNodeIds = new Set(currentNodes.map((node) => String(node.id)));
      const currentEdgeById = new Map(currentEdges.map((edge) => [String(edge.id), edge]));
      const desiredNodeIds = new Set(nodes.map((node) => String(node.id)));
      const desiredEdgeIds = new Set(edges.map((edge) => String(edge.id)));
      const outgoingNodes = currentNodes.filter((node) => !desiredNodeIds.has(String(node.id)));
      const outgoingEdges = currentEdges.filter((edge) => !desiredEdgeIds.has(String(edge.id)));
      const incomingNodes = nodes.filter((node) => !currentNodeIds.has(String(node.id)));
      const rewiredEdges = edges.filter((edge) => {
        const current = currentEdgeById.get(String(edge.id));
        return current && (String(current.start) !== String(edge.start) || String(current.end) !== String(edge.end));
      });
      const rewiredIds = new Set(rewiredEdges.map((edge) => String(edge.id)));
      const enteringEdges = edges.filter((edge) => !currentEdgeById.has(String(edge.id)));
      const stableEdges = edges.filter((edge) => currentEdgeById.has(String(edge.id)) && !rewiredIds.has(String(edge.id)));
      const topologyChanged = Boolean(
        outgoingNodes.length || outgoingEdges.length || incomingNodes.length || enteringEdges.length || rewiredEdges.length
      );
      if (topologyChanged) requestAutoFit();
      if (prefersReducedMotion()) {
        const breakIds = [
          ...outgoingEdges.map((edge) => edge.id),
          ...rewiredEdges.map((edge) => currentEdgeById.get(String(edge.id))?.id)
        ].filter((id2) => id2 !== null && id2 !== void 0);
        if (breakIds.length || outgoingNodes.length) {
          orb.data.remove({ edgeIds: [...new Set(breakIds)], nodeIds: outgoingNodes.map((node) => node.id) });
        }
        orb.data.merge({
          nodes: nodes.map((node) => transitionRecord(node, "active")),
          edges: edges.map((edge) => transitionRecord(edge, "active"))
        });
        setPerformanceMode(nodes.length);
        orb.render();
        applyInteractionForce(0);
        return;
      }
      setPerformanceMode(Math.max(currentNodes.length, nodes.length));
      orb.data.merge({
        nodes: nodes.map((node) => transitionRecord(node, currentNodeIds.has(String(node.id)) ? "active" : "entering"))
      });
      positionIncomingNodes(incomingNodes, edges);
      orb.data.merge({
        edges: [
          ...stableEdges.map((edge) => transitionRecord(edge, "active")),
          ...enteringEdges.map((edge) => transitionRecord(edge, "entering"))
        ]
      });
      for (const node of outgoingNodes) markNodeTransition(node.id, "exiting");
      for (const edge of outgoingEdges) markEdgeTransition(edge.id, "releasing");
      for (const edge of rewiredEdges) markEdgeTransition(currentEdgeById.get(String(edge.id))?.id, "releasing");
      orb.render();
      setInteractionHeat(TOPOLOGY_ALPHA_TARGET);
      scheduleTopologyStep(() => {
        const breakIds = [
          ...outgoingEdges.map((edge) => edge.id),
          ...rewiredEdges.map((edge) => currentEdgeById.get(String(edge.id))?.id)
        ].filter((id2) => id2 !== null && id2 !== void 0);
        if (breakIds.length) orb.data.remove({ edgeIds: [...new Set(breakIds)] });
        if (rewiredEdges.length) {
          orb.data.merge({
            edges: rewiredEdges.map((edge) => transitionRecord(edge, "entering"))
          });
        }
        orb.render();
        setInteractionHeat(TOPOLOGY_ALPHA_TARGET);
      }, TOPOLOGY_EDGE_RELEASE_MS);
      scheduleTopologyStep(() => {
        if (outgoingNodes.length) {
          orb.data.remove({ nodeIds: outgoingNodes.map((node) => node.id) });
        }
        finalizeTopology(data);
        keepForceActiveAfterInteraction();
      }, TOPOLOGY_SETTLE_MS);
    }
    function updateTemporalEdges(edges) {
      for (const next of Array.isArray(edges) ? edges : []) {
        const edge = orb.data.getEdgeById(next.id);
        if (!edge) continue;
        edge.setData(next, { isNotifySkipped: true });
        edge.setStyle(edgeStyle(next), { isNotifySkipped: true });
      }
      orb.render();
    }
    return Object.freeze({
      setData,
      transitionData,
      updateTemporalEdges,
      select(kind, id2) {
        const object = kind === "edge" ? orb.data.getEdgeById(id2) : orb.data.getNodeById(id2);
        if (!object) return false;
        selectGraphObject(object);
        return true;
      },
      recenter() {
        cancelCameraInertia();
        cameraGesture = null;
        releaseCameraToAutoFit();
        orb.recenter();
      },
      refreshLayout() {
        if (!hasGraphData) return;
        orb.render(() => {
          if (!userOwnsCamera) orb.recenter();
        });
      },
      zoomIn() {
        cancelCameraInertia();
        markCameraOwnedByUser();
        orb.zoomIn();
      },
      zoomOut() {
        cancelCameraInertia();
        markCameraOwnedByUser();
        orb.zoomOut();
      },
      getMode() {
        return currentMode;
      },
      destroy() {
        cancelCameraInertia();
        cameraGesture = null;
        finishTouchGesture();
        clearInteractionSettleTimer();
        clearTopologyTimers();
        container.removeEventListener("click", onClickCapture, true);
        container.removeEventListener("wheel", onWheelCapture, true);
        container.removeEventListener("keydown", onGraphKeyDown);
        container.removeEventListener("pointerdown", onPointerDown, true);
        container.removeEventListener("pointermove", onPointerMove, true);
        container.removeEventListener("pointerup", onPointerUp, true);
        container.removeEventListener("pointercancel", onPointerUp, true);
        container.removeEventListener("lostpointercapture", onLostPointerCapture, true);
        container.removeEventListener("touchmove", onTouchMoveCapture, true);
        container.removeEventListener("touchend", onTouchEnd);
        container.removeEventListener("touchcancel", onTouchEnd);
        globalThis.removeEventListener?.("blur", onWindowBlur);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        orb.events.off(OrbEventType.NODE_CLICK, onNodeClick);
        orb.events.off(OrbEventType.EDGE_CLICK, onEdgeClick);
        orb.events.off(OrbEventType.NODE_DRAG_START, onNodeDragStart);
        orb.events.off(OrbEventType.NODE_DRAG, onNodeDrag);
        orb.events.off(OrbEventType.NODE_DRAG_END, onNodeDragEnd);
        orb.events.off(OrbEventType.SIMULATION_START, onSimulationStart);
        orb.events.off(OrbEventType.SIMULATION_END, onSimulationEnd);
        orb.destroy();
      }
    });
  }
  globalThis.TimelineOrbGraph = Object.freeze({
    create: create2,
    version: "1.0.2"
  });
})();
/*! Bundled license information:

leaflet/dist/leaflet-src.js:
  (* @preserve
   * Leaflet 1.9.4, a JS library for interactive maps. https://leafletjs.com
   * (c) 2010-2023 Vladimir Agafonkin, (c) 2010-2011 CloudMade
   *)
*/
