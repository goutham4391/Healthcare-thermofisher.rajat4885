// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.io/#x15.4.4.18

if (!Array.prototype['forEach']) {

	Array.prototype.forEach = function(callback, thisArg) {
  
	  if (this == null) { throw new TypeError('Array.prototype.forEach called on null or undefined'); }
  
	  var T, k;
	  // 1. Let O be the result of calling toObject() passing the
	  // |this| value as the argument.
	  var O = Object(this);
  
	  // 2. Let lenValue be the result of calling the Get() internal
	  // method of O with the argument "length".
	  // 3. Let len be toUint32(lenValue).
	  var len = O.length >>> 0;
  
	  // 4. If isCallable(callback) is false, throw a TypeError exception. 
	  // See: http://es5.github.com/#x9.11
	  if (typeof callback !== "function") { throw new TypeError(callback + ' is not a function'); }
  
	  // 5. If thisArg was supplied, let T be thisArg; else let
	  // T be undefined.
	  if (arguments.length > 1) { T = thisArg; }
  
	  // 6. Let k be 0
	  k = 0;
  
	  // 7. Repeat, while k < len
	  while (k < len) {
  
		var kValue;
  
		// a. Let Pk be ToString(k).
		//    This is implicit for LHS operands of the in operator
		// b. Let kPresent be the result of calling the HasProperty
		//    internal method of O with argument Pk.
		//    This step can be combined with c
		// c. If kPresent is true, then
		if (k in O) {
  
		  // i. Let kValue be the result of calling the Get internal
		  // method of O with argument Pk.
		  kValue = O[k];
  
		  // ii. Call the Call internal method of callback with T as
		  // the this value and argument list containing kValue, k, and O.
		  callback.call(T, kValue, k, O);
		}
		// d. Increase k by 1.
		k++;
	  }
	  // 8. return undefined
	};
  }
/*
 * classList.js: Cross-browser full element.classList implementation.
 * 1.1.20170427
 *
 * By Eli Grey, http://eligrey.com
 * License: Dedicated to the public domain.
 *   See https://github.com/eligrey/classList.js/blob/master/LICENSE.md
 */

/*global self, document, DOMException */

/*! @source http://purl.eligrey.com/github/classList.js/blob/master/classList.js */

if ("document" in self) {

	// Full polyfill for browsers with no classList support
	// Including IE < Edge missing SVGElement.classList
	if (!("classList" in document.createElement("_"))
		|| document.createElementNS && !("classList" in document.createElementNS("http://www.w3.org/2000/svg", "g"))) {

		(function (view) {

			"use strict";

			if (!('Element' in view)) return;

			var
				classListProp = "classList"
				, protoProp = "prototype"
				, elemCtrProto = view.Element[protoProp]
				, objCtr = Object
				, strTrim = String[protoProp].trim || function () {
					return this.replace(/^\s+|\s+$/g, "");
				}
				, arrIndexOf = Array[protoProp].indexOf || function (item) {
					var
						i = 0
						, len = this.length
						;
					for (; i < len; i++) {
						if (i in this && this[i] === item) {
							return i;
						}
					}
					return -1;
				}
				// Vendors: please allow content code to instantiate DOMExceptions
				, DOMEx = function (type, message) {
					this.name = type;
					this.code = DOMException[type];
					this.message = message;
				}
				, checkTokenAndGetIndex = function (classList, token) {
					if (token === "") {
						throw new DOMEx(
							"SYNTAX_ERR"
							, "An invalid or illegal string was specified"
						);
					}
					if (/\s/.test(token)) {
						throw new DOMEx(
							"INVALID_CHARACTER_ERR"
							, "String contains an invalid character"
						);
					}
					return arrIndexOf.call(classList, token);
				}
				, ClassList = function (elem) {
					var
						trimmedClasses = strTrim.call(elem.getAttribute("class") || "")
						, classes = trimmedClasses ? trimmedClasses.split(/\s+/) : []
						, i = 0
						, len = classes.length
						;
					for (; i < len; i++) {
						this.push(classes[i]);
					}
					this._updateClassName = function () {
						elem.setAttribute("class", this.toString());
					};
				}
				, classListProto = ClassList[protoProp] = []
				, classListGetter = function () {
					return new ClassList(this);
				}
				;
			// Most DOMException implementations don't allow calling DOMException's toString()
			// on non-DOMExceptions. Error's toString() is sufficient here.
			DOMEx[protoProp] = Error[protoProp];
			classListProto.item = function (i) {
				return this[i] || null;
			};
			classListProto.contains = function (token) {
				token += "";
				return checkTokenAndGetIndex(this, token) !== -1;
			};
			classListProto.add = function () {
				var
					tokens = arguments
					, i = 0
					, l = tokens.length
					, token
					, updated = false
					;
				do {
					token = tokens[i] + "";
					if (checkTokenAndGetIndex(this, token) === -1) {
						this.push(token);
						updated = true;
					}
				}
				while (++i < l);

				if (updated) {
					this._updateClassName();
				}
			};
			classListProto.remove = function () {
				var
					tokens = arguments
					, i = 0
					, l = tokens.length
					, token
					, updated = false
					, index
					;
				do {
					token = tokens[i] + "";
					index = checkTokenAndGetIndex(this, token);
					while (index !== -1) {
						this.splice(index, 1);
						updated = true;
						index = checkTokenAndGetIndex(this, token);
					}
				}
				while (++i < l);

				if (updated) {
					this._updateClassName();
				}
			};
			classListProto.toggle = function (token, force) {
				token += "";

				var
					result = this.contains(token)
					, method = result ?
						force !== true && "remove"
						:
						force !== false && "add"
					;

				if (method) {
					this[method](token);
				}

				if (force === true || force === false) {
					return force;
				} else {
					return !result;
				}
			};
			classListProto.toString = function () {
				return this.join(" ");
			};

			if (objCtr.defineProperty) {
				var classListPropDesc = {
					get: classListGetter
					, enumerable: true
					, configurable: true
				};
				try {
					objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
				} catch (ex) { // IE 8 doesn't support enumerable:true
					// adding undefined to fight this issue https://github.com/eligrey/classList.js/issues/36
					// modernie IE8-MSW7 machine has IE8 8.0.6001.18702 and is affected
					if (ex.number === undefined || ex.number === -0x7FF5EC54) {
						classListPropDesc.enumerable = false;
						objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
					}
				}
			} else if (objCtr[protoProp].__defineGetter__) {
				elemCtrProto.__defineGetter__(classListProp, classListGetter);
			}

		}(self));

	}

	// There is full or partial native classList support, so just check if we need
	// to normalize the add/remove and toggle APIs.

	(function () {
		"use strict";

		var testElement = document.createElement("_");

		testElement.classList.add("c1", "c2");

		// Polyfill for IE 10/11 and Firefox <26, where classList.add and
		// classList.remove exist but support only one argument at a time.
		if (!testElement.classList.contains("c2")) {
			var createMethod = function (method) {
				var original = DOMTokenList.prototype[method];

				DOMTokenList.prototype[method] = function (token) {
					var i, len = arguments.length;

					for (i = 0; i < len; i++) {
						token = arguments[i];
						original.call(this, token);
					}
				};
			};
			createMethod('add');
			createMethod('remove');
		}

		testElement.classList.toggle("c3", false);

		// Polyfill for IE 10 and Firefox <24, where classList.toggle does not
		// support the second argument.
		if (testElement.classList.contains("c3")) {
			var _toggle = DOMTokenList.prototype.toggle;

			DOMTokenList.prototype.toggle = function (token, force) {
				if (1 in arguments && !this.contains(token) === !force) {
					return force;
				} else {
					return _toggle.call(this, token);
				}
			};

		}

		testElement = null;
	}());

}

if (!Element.prototype.matches) {
	Element.prototype.matches =
	  Element.prototype.msMatchesSelector || 
	  Element.prototype.webkitMatchesSelector;
  }
  
  if (!Element.prototype.closest) {
	Element.prototype.closest = function(s) {
	  var el = this;
  
	  do {
		if (Element.prototype.matches.call(el, s)) return el;
		el = el.parentElement || el.parentNode;
	  } while (el !== null && el.nodeType === 1);
	  return null;
	};
  }
// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
// always polyfilling if Element.prototype.attachEvent exists because the one in shared static does not work for IE8 (global/global/global.js/src/global.polyfills.js)
(function() {
	if (Element.prototype.attachEvent) {
	  Event.prototype.preventDefault=function() {
		this.returnValue=false;
	  };
	}
	
	if (Element.prototype.attachEvent) {
	  Event.prototype.stopPropagation=function() {
		this.cancelBubble=true;
	  };
	}

	if (Element.prototype.attachEvent) {
	  var eventListeners=[];
  
	  var addEventListener=function(type,listener /*, useCapture (will be ignored) */) {
		var self=this;
		var wrapper=function(e) {
		  e.target=e.srcElement;
		  e.currentTarget=self;
		  if (typeof listener.handleEvent != 'undefined') {
			listener.handleEvent(e);
		  } else {
			listener.call(self,e);
		  }
		};
		if (type=="DOMContentLoaded") {
		  var wrapper2=function(e) {
			if (document.readyState=="complete") {
			  wrapper(e);
			}
		  };
		  document.attachEvent("onreadystatechange",wrapper2);
		  eventListeners.push({object:this,type:type,listener:listener,wrapper:wrapper2});
  
		  if (document.readyState=="complete") {
			var e=new Event();
			e.srcElement=window;
			wrapper2(e);
		  }
		} else {
		  this.attachEvent("on"+type,wrapper);
		  eventListeners.push({object:this,type:type,listener:listener,wrapper:wrapper});
		}
	  };
	  var removeEventListener=function(type,listener /*, useCapture (will be ignored) */) {
		var counter=0;
		while (counter<eventListeners.length) {
		  var eventListener=eventListeners[counter];
		  if (eventListener.object==this && eventListener.type==type && eventListener.listener==listener) {
			if (type=="DOMContentLoaded") {
			  this.detachEvent("onreadystatechange",eventListener.wrapper);
			} else {
			  this.detachEvent("on"+type,eventListener.wrapper);
			}
			eventListeners.splice(counter, 1);
			break;
		  }
		  ++counter;
		}
	  };
	  Element.prototype.addEventListener=addEventListener;
	  Element.prototype.removeEventListener=removeEventListener;
	  if (HTMLDocument) {
		HTMLDocument.prototype.addEventListener=addEventListener;
		HTMLDocument.prototype.removeEventListener=removeEventListener;
	  }
	  if (Window) {
		Window.prototype.addEventListener=addEventListener;
		Window.prototype.removeEventListener=removeEventListener;
	  }
	}
  })();
if (!window.location.origin) {
	window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
}

if (window.NodeList && !NodeList.prototype.forEach) {
	NodeList.prototype.forEach = Array.prototype.forEach;
}

if (window.StaticNodeList && !StaticNodeList.prototype.forEach) {
	StaticNodeList.prototype.forEach = Array.prototype.forEach;
}
