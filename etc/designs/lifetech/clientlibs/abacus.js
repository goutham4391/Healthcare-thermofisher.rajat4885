/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2011 Adobe Systems Incorporated
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 *
 */

/*global window, Klaas, alert, jQuery, formatters */

var abacus = $CQ.abacus = (function ($) {
	var $modelName = "abacus",
		nInsideConstructor = 0,	// don't want to emit events until the construction is complete.
		eventQueue = [],
		suspendQueueCount = 0,
		eventPrototype,
		registeredObjects = {},
		$m;

	function modelFromJSON(model, json) {
		var prop, t, p, definition;
		for (prop in json) {
			if (json.hasOwnProperty(prop)) {
				p = null;
				definition = {};
				model[prop] = definition;
				t = typeof json[prop];
				switch (typeof json[prop]) {
				case "function":
					break;
				case "object":
					if (json[prop] instanceof Array) {
						definition.$collectionType = {};
						if (json[prop].length > 0) {
							definition.$collectionType.$name = "row";
							modelFromJSON(definition.$collectionType, json[prop][0]);
						}
					} else if (json[prop] instanceof Date) {
						// provide some default masks for date properties
						definition.$style = {editMask: 'MM-D-YYYY', displayMask: 'MMM D, YYYY'};
						definition.$propertyType = "date";

					} else if (json[prop] instanceof String) {
						definition.$propertyType = "string";

					} else if (json[prop] instanceof Number) {
						definition.$propertyType = "number";

					} else if (json[prop] instanceof Boolean) {
						definition.$propertyType = "boolean";

					} else {
						modelFromJSON(definition, json[prop]);
					}
					break;
				case "string":
				case "number":
				case "boolean":
					definition.$propertyType = t;
					break;
				}
			}
		}
	}
	function processQueue() {
		var i, obj, evt, parent, eventToProcess;
		if (suspendQueueCount) {
			return;
		}
		suspendQueueCount += 1;
		try {
			while (eventQueue.length > 0) {
				eventToProcess = eventQueue.shift();
				obj = eventToProcess.obj;
				evt = eventToProcess.evt;
				for (i = 0; i < obj.$listeners.length; i += 1) {
					if (obj.$listeners[i].type === evt.type) {
						obj.$listeners[i].listener(evt);
					}
				}
				if (obj === evt.source) {
					// now bubble up
					parent = evt.source.$parent();
					while (parent) {
						parent.$dispatchEvent(evt);
						parent = parent.$parent();
					}
				}
			}
		} catch (e) {
			suspendQueueCount -= 1;
			$.error(e.toString());
		}
		suspendQueueCount -= 1;
	}
	function NullFormatter() {
		this.set_formatString = function (sMask) {
		};
		this.format = function (sValue) {
			return sValue;
		};
	}

	// TODO: eventually we should stop using the dumb AS formatters and use the ones ported from XFA.
	// Then we have a single formatter class and don't need to figure it out ourselves.
	function getFormatter(mask, sValue) {
		var df;
		// if they haven't included our formatters, then provide
		// default processing
		if (typeof formatters === "undefined") {
			return new NullFormatter();
		}
		if (sValue instanceof Date) {
			df = new formatters.DateFormatter();
		} else if (typeof sValue === "number") {
			if (mask.indexOf("$") !== -1) {
				df = new formatters.CurrencyFormatter();
			} else {
				df = new formatters.NumberBase();
			}
		}
		return df;
	}
	function removeModelClasses($element, bDeep) {
		var i, classes = $element.attr("class").split(" ");
		for (i = 0; i < classes.length; i += 1) {
			if (classes[i] !== "abacus-adapter") {
				if (classes[i].indexOf("abacus-") !== -1) {
					$element.removeClass(classes[i]);
				}
			}
		}
		if (bDeep) {
			$element.find(".abacus-bound").each(
				function () {
					removeModelClasses($(this));
				}
			);
		}
	}
	function propertyEvent(oldValue, newValue) {
		// don't issue change events while Entity instances are being created.
		if (nInsideConstructor === 0) {
			this.$dispatchEvent(new $m.PropertyEvent($m.EventKind.UPDATE, this, oldValue, newValue));
		}
	}
	function synchToData(newJSON) {
		var i,
			rowType = this.$$private.definition.$collectionType,
			oldJSON = this.$$private.json,
			parent = this.$$private.parent;

		newJSON = newJSON || [];

		// delete old values that won't be overwritten
		if (oldJSON) {
			while (oldJSON.length > newJSON.length) {
				i = oldJSON.length - 1;
				if (this[i]) {
					this.$remove(i);
				}
			}
		}
		this.$$private.json = newJSON;

		if (parent) {
			parent.$$private.json[this.$name()] = newJSON;
		}

		for (i = 0; i < this.$$private.json.length; i += 1) {

			if (this[i.toString()]) {
				// overwrite existing value
				this[i].$value(this.$$private.json[i]);
				if (this[i] instanceof $m.Property) {
					if (oldJSON[i] !== this.$$private.json[i]) {
						propertyEvent.call(this[i], oldJSON[i], this.$$private.json[i]);
					}
				}

			} else {
				if (rowType.$propertyType === "entity") {
					this[i] = new $m.Entity(rowType, i.toString(), this.$$private.json[i], this);

				} else if (rowType.$propertyType === "collection") {
					this[i] = new $m.Collection(rowType, i.toString(), this, this.$$private.json[i]);

				} else {
					this[i] = new $m.Property(rowType, i.toString(), this);
				}
			}
		}
		if (this.$$private.definition.$initial) {
			for (i = this.$length(); i < this.$$private.definition.$initial; i += 1) {
				this.$append();
			}
		}

	}
	function jsonValue(prop, parent) {
		if (prop.$isAvailable()) {
			return parent.$$private.json[prop.$name()];
		}
		else {
			return null;
		}
	}
	function setDefaultValue() {
		var startValue, parent = this.$parent();
		if (parent) {
			startValue = jsonValue(this, this.$parent());
		}
		if (this instanceof $m.Property) {
			if (typeof this.$$private.definition.$value !== "undefined" &&
					(startValue === null || typeof startValue === "undefined")) {
				this.$value(this.$$private.definition.$value);
			} else if (typeof startValue === "undefined") {
				this.$value(null);
			}
			propertyEvent.call(this, null, this.$value());
		} else if (this instanceof $m.Entity) {
			startValue = startValue || {};
			this.$value(startValue);
		} else if (this instanceof $m.Collection) {
			synchToData.call(this, startValue || []);
		}
	}
	// Since definitions are JSON, Functions inside definitions can be expressed as:
	// - a function
	// - an array of arguments to pass to a Function constructor
	// - an expression inside a with block that holds context.
	function getFunction(definition, functionName) {
		var functionDef = definition[functionName];
		if (!functionDef) {
			return undefined;
		}
		if (typeof functionDef === "function") {
			return functionDef;
		}
		// convert a string or an array to a function
		// use a fully specified function definition
		if (functionDef instanceof Array && functionDef.length === 2) {
			definition[functionName] = new Function(functionDef[0], functionDef[1]);
		} else {	// assume string
			// If they've provided only a string, assume it's the contents of a with block.
			// It must have a return statement.
			definition[functionName] = new Function("$c", "with ($c) {\n" + functionDef.toString() + "\n}");
		}
		return definition[functionName];
	}
	function isAvailable(newAvailable) {
		var oldAvailable, i;
		if (typeof newAvailable !== "undefined") {
			newAvailable = !!newAvailable;	// type conversion to boolean
			oldAvailable = !this.$$private.$unavailable;
			if (oldAvailable !== newAvailable) {
				propertyEvent.call(this, this.$value(), this.$value());
				this.$$private.$unavailable = !newAvailable;
				// make sure data behaves according to availability
				// if the property is unavailable, we don't want the data to show up
				if (this.$$private.$unavailable) {
					this.$$private.previousData = this.$parent().$$private.json[this.$name()];
					delete this.$parent().$$private.json[this.$name()];
				} else {
					if (typeof (this.$parent().$$private.json[this.$name()]) === "undefined") {
						// pretend we're inside a constructor so that a change event doesn't fire.
						// A change event will fire elsewhere.
						nInsideConstructor += 1;
						if (this.$$private.previousData) {
							this.$value(this.$$private.previousData);
							delete this.$$private.previousData;
						} else {
							setDefaultValue.call(this);
							if (this.$$private.definition.$initial) {
								for (i = this.$length(); i < this.$$private.definition.$initial; i += 1) {
									this.$append();
								}
							}
						}
						nInsideConstructor -= 1;
					}
					$m.Calculator.execCalculate(this);
					$m.Calculator.execValidate(this);
				}
			}
		}
		return !this.$$private.$unavailable;
	}

	function objectType(definition) {
		var p,
			propertyType = definition.$propertyType || (definition.$collectionType ? "collection" : undefined);
		if (!propertyType) {
			for (p in definition) {
				if (definition.hasOwnProperty(p)) {
					if (p.indexOf("$") !== 0) {
						propertyType = "entity";
						break;
					}
				}
			}
			if (!propertyType) {
				propertyType = "string";
			}
		}
		// Make sure that $propertyType is always explicitly specified.
		definition.$propertyType = propertyType;
		return propertyType;
	}
	function EventListener() {
		this.$addEventListener = function (type, listener) {
			this.$listeners.push({type: type, listener: listener});
		};
		this.$dispatchEvent = function (newEvent) {
			$m.queueEvent(this, newEvent);
		};
		this.$removeEventListener = function (type, listener) {
			var i;
			for (i = 0; i < this.$listeners.length; i += 1) {
				if (this.$listeners[i].type === type && this.$listeners[i].listener === listener) {
					this.$listeners.splice(i, 1);
				}
			}
			return true;
		};
	}
	eventPrototype = new EventListener();
	function PropertyBase() {

        this.equals = function(rhs) {
            // if we have a numeric
            if (this.$value == rhs) {
                return true;
            }

            // if we have a string value
            if (this.toString() == rhs) {
                return true;
            }

            return false;
        };
        this.notEquals = function(rhs) {
            return !this.equals(rhs);
        };
		this.toString = function () {
			if (this.$value() === null) {
				return "";
			} else {
				if (this.$propertyType() === "date") {
					return $m.dateToISO(this.$value());
				}
				return this.$value().toString();
			}
		};
		this.$available = function (newFunc) {
			if (typeof newFunc === "undefined") {
				return getFunction(this.$$private.definition, "$available");
			} else {
				// TODO: not sure if we should support adding a calc at runtime...
				this.$$private.definition.$available = newFunc;
			}
		};
		this.$calculate = function (newFunc) {
			if (typeof newFunc === "undefined") {
				return getFunction(this.$$private.definition, "$calculate");
			} else {
				// TODO: not sure if we should support adding a calc at runtime...
				this.$$private.definition.$calculate = newFunc;
			}
		};
		this.valueOf = function () {
			return this.$value();
		};
		this.$isAvailable = function (newAvailable) {
			return isAvailable.call(this, newAvailable);
		};
		this.$isValid = function (newValid) {
			if (typeof newValid !== "undefined") {
				this.$$private.$invalid = !newValid;
			}
			return !this.$$private.$invalid && !this.$$private.missingValue;
		};
		this.$name = function (newName) {
			if (typeof newName !== "undefined") {
				this.$$private.$name = newName;
			}
			return this.$$private.$name || this.$$private.definition.$name;
		};
		this.$parent = function () {
			return this.$$private.parent;		// readonly
		};
		this.$propertyType = function () {
			return this.$$private.definition.$propertyType || "string";
		};
		this.$required = function (newValue) {
			if (typeof newValue !== "undefined") {
				this.$$private.$required = newValue;
			}
			return this.$$private.$required || this.$$private.definition.$required;
		};
		this.$style = function (newStyle) {
			if (typeof newStyle !== "undefined") {
				// TODO: should we change the overrides?  or the root definition?
				if (!this.$$private.definition.$style) {
					this.$$private.definition.$style = {};
				}
				$CQ.extend(this.$$private.definition.$style, newStyle);
			}
			return this.$$private.$style || this.$$private.definition.$style || {};
		};
		this.$validate = function (newFunc) {
			if (typeof newFunc === "undefined") {
				return getFunction(this.$$private.definition, "$validate");
			} else {
				// TODO: not sure if we should support adding a calc at runtime...
				this.$$private.definition.$validate = newFunc;
			}
		};
		this.$value = function (newValue) {
			var oldValue, parent = this.$parent();
			if (typeof newValue === "undefined") {
				$m.Calculator.trackDependency(this);
				return jsonValue(this, parent);
			}
			// we want to work with a primitive value.
			if (newValue !== null) {
				newValue = newValue.valueOf();
			}
			if (newValue !== null) {
				switch (this.$$private.definition.$propertyType) {
				case "number":
					newValue = newValue === "" ? null : +newValue;
					break;

				case "boolean":
					// TODO: Allow null for Boolean?
					newValue = newValue ? true : false;
					break;

				case "date":
					newValue = newValue === "" ? null : new Date(newValue);
					break;

				case "string":
					newValue = newValue === "" ? null : newValue.toString();
					break;

				case "string[]":
					newValue = newValue instanceof Array ? newValue : [newValue];
					break;

				default:
				}
			}
			oldValue = jsonValue(this, parent);
			// use valueOf() so that dates compare well.
			if (!(oldValue === newValue || (oldValue instanceof Date && oldValue.valueOf() === newValue.valueOf()))) {
				parent.$$private.json[this.$name()] = newValue;
				propertyEvent.call(this, oldValue, newValue);

				$m.Calculator.execValidate(this);
			}
		};
	}
	PropertyBase.prototype = eventPrototype;
	function Property(definition, name, parent) {
		this.$listeners = [];

		this.$$private = {$name: name, definition: definition, parent: parent};

		// children of a collection need to be able to return their index inside the collection.
		if (parent && parent instanceof $m.Collection) {
			this.$index = function () {
				return +this.$name();
			};
		}

		setDefaultValue.call(this);
	}
	Property.prototype = new PropertyBase();

	function EntityBase() {
		this.$available = function (newFunc) {
			if (typeof newFunc === "undefined") {
				return getFunction(this.$$private.definition, "$available");
			} else {
				// TODO: not sure if we should support adding a calc at runtime...
				this.$$private.definition.$available = newFunc;
			}
		};

		this.$isAvailable = function (newAvailable) {
			return isAvailable.call(this, newAvailable);
		};
		this.$name = function (newName) {
			if (typeof newName !== "undefined") {
				this.$$private.$name = newName;
			}
			return this.$$private.$name || this.$$private.definition.$name;
		};
		this.$parent = function () {
			return this.$$private.parent;		// readonly
		};
		this.$propertyType = function () {
			return this.$$private.definition.$propertyType || "entity";
		};
		this.$required = function (newValue) {
			if (typeof newValue !== "undefined") {
				this.$$private.$required = newValue;
			}
			return this.$$private.$required || this.$$private.definition.$required;
		};
		//TODO: Does style make sense for an entity?
		this.$style = function (newStyle) {
			if (typeof newStyle !== "undefined") {
				if (!this.$$private.$style) {
					this.$$private.$style = $CQ.extend(this.$$private.definition.$style);
				}
				this.$$private.$style = $CQ.extend(newStyle);
			}
			return this.$$private.$style || this.$$private.definition.$style || {};
		};
		this.$properties = function () {
			var p, properties = [];
			for (p in this) {
				if (this.hasOwnProperty(p)) {
					if (p.charAt(0) !== '$' && p !== "_super") {
						properties.push(p);
					}
				}
			}
			return properties;
		};
		this.valueOf = function () {
			return this.$value();
		};
		this.$value = function (newJSON) {
			var p, propertyType, newProp, definition = this.$$private.definition,	parent = this.$parent();

			if (newJSON) {
				if (!$.isPlainObject(newJSON)) {
					$.error("Expecting " + this.$name() + " Entity value to be a plain object");
				}

				try {
					$m.suspendQueue(true);

					delete this.$$private.json;
					if (parent) {
						this.$$private.json = parent.$$private.json[this.$name()] = newJSON;
					} else {
						this.$$private.json = newJSON;
					}
					for (p in definition) {
						if (definition.hasOwnProperty(p)) {
							if (p.indexOf("$") !== 0) {
								if (this[p]) {
									// set default value should initialize from the value in the parent --
									// if defined.  If not, use a default.
									setDefaultValue.call(this[p]);
								} else {
									propertyType = objectType(definition[p]);
									if (propertyType === "entity") {
										if (!this.$$private.json[p]) {
											this.$$private.json[p] = {};
										}
										newProp = new $m.Entity(definition[p], p, {}, this);

									} else if (propertyType === "collection") {
										if (!this.$$private.json[p]) {
											this.$$private.json[p] = [];
										}
										newProp = new $m.Collection(definition[p], p, this, this.$$private.json[p]);
									} else {
										if (typeof this.$$private.json[p] === "undefined") {
											this.$$private.json[p] = null;
										}
										newProp = new $m.Property(definition[p], p, this);
									}
									this[p] = newProp;
								}
							}
						}
					}
					$m.suspendQueue(false);
				} catch (err) {
					$m.suspendQueue(false);
					$.error(err.toString());
				}
				if (!this.$parent()) {
					$m.Calculator.execAvailable(this);
					$m.Calculator.execCalculate(this);
					$m.Calculator.execValidate(this);
				}

			} else {
				return this.$$private.json || {};
			}
		};
	}
	EntityBase.prototype = eventPrototype;
	function Entity(definition, propertyName, json, parent) {
		nInsideConstructor += 1;

		if (typeof definition !== "object") {
			$CQ.error("entity definition must be an object -- not a primitive");
		}
		this.$listeners = [];
		this.$$private =	{	definition: definition,
								parent: parent || null
							};
		if (propertyName) {
			this.$$private.$name = propertyName;
		}

		// children of a collection need to be able to return their index inside the collection.
		if (parent && parent instanceof $m.Collection) {
			this.$index = function () {
				return +this.$name();
			};
		}
		this.$value(json || {});
		nInsideConstructor -= 1;
		if (!this.$parent()) {
			$m.register(this);
			$m.Calculator.execAvailable(this);
			$m.Calculator.execCalculate(this);
			$m.Calculator.execValidate(this);
			this.$addEventListener($m.EventKind.PROPERTY, $m.Calculator.recalculate);
			this.$addEventListener($m.EventKind.COLLECTION, $m.Calculator.recalculate);
		}
	}
	Entity.prototype = new EntityBase();

	/*
	 * Collections are smart in that they understand what kind of members are contained in the collection.
	 * We can have collections of Entity, Property and by Collection
	 * A collection will keep a prototype instance of the member to be used for schema queries and to use
	 * as the basis for creating new members.
	 * @param definition - the JSON definition of the collection
	 * @param propertyName -- the name of the collection
	 * @param parent - the parent object -- either an Entity or another Collection
	 * @param json - the data storage for this collection. Must be an array object
	 */
	function CollectionBase() {
		this.$append = function (json) {
			var nIndex, newMember, rowType = this.$$private.definition.$collectionType;
			if (typeof json === "undefined") {
				if (rowType.$propertyType === "entity") {
					json = {};
				} else if (rowType.$propertyType === "collection") {
					json = [];
				} else {
					json = null;
				}
			}

			this.$$private.json.push(json);
			nIndex = this.$length() - 1;
			if (rowType.$propertyType === "entity") {
				newMember = new $m.Entity(rowType, nIndex.toString(), this.$$private.json[nIndex], this);

			} else if (rowType.$propertyType === "collection") {
				newMember = new $m.Collection(rowType, nIndex.toString(), this, this.$$private.json[nIndex]);
			} else {
				newMember = new $m.Property(rowType, nIndex.toString(), this);
			}
			// simulate an array by using numeric object properties
			this[nIndex.toString()] = newMember;
			this.$dispatchEvent(new $m.CollectionEvent($m.EventKind.ADD, this, nIndex, -1, [newMember]));
			if (nInsideConstructor === 0) {
				$m.Calculator.execAvailable(newMember);
				$m.Calculator.execCalculate(newMember);
				$m.Calculator.execValidate(newMember);
			}
			return newMember;
		};
		this.$available = function (newFunc) {
			if (typeof newFunc === "undefined") {
				return getFunction(this.$$private.definition, "$available");
			} else {
				// TODO: not sure if we should support adding a calc at runtime...
				this.$$private.definition.$available = newFunc;
			}
		};
		this.$isAvailable = function (newAvailable) {
			return isAvailable.call(this, newAvailable);
		};
		this.$rowName = function () {
			return this.$$private.definition.$collectionType.$name || "row";
		};
		this.$value = function (newJSON) {
			if (newJSON) {
				if (!(newJSON instanceof Array)) {
					$CQ.error("expecting an array to set the value of collection: " + this.$name());
				}
				try {
					$m.suspendQueue(true);
					synchToData.call(this, newJSON);
				} catch (err) {
					$m.suspendQueue(false);
					$.error(err.toString());
				}
				$m.suspendQueue(false);

			} else {
				return this.$$private.json;
			}
		};
		this.$name = function (newName) {
			if (typeof newName !== "undefined") {
				this.$$private.$name = newName;
			}
			return this.$$private.$name || this.$$private.definition.$name;
		};
		this.$parent = function () {
			return this.$$private.parent;		// readonly
		};
		this.$propertyType = function () {
			return "collection";
		};
		this.$length = function (newLength) {
			if (typeof newLength === "undefined") {
				$m.Calculator.trackDependency(this);
			} else {
				while (this.$length() > newLength) {
					this.$remove(this.$length() - 1);
				}
				while (this.$length() < newLength) {
					this.$append();
				}
			}
			return this.$$private.json.length;
		};
		this.$item = function (nOffset) {
			// array of properties
			return this[nOffset.toString()];
		};
		this.$remove = function (nIndex) {
			var deletedRow = this.$item(nIndex), i, len;
			nIndex = +nIndex;// make sure we have an integer.
			this.$$private.json.splice(nIndex, 1);
			delete this[nIndex.toString()];
			// reset the cached index numbers of the rows.
			len = this.$length();
			for (i = nIndex; i < len; i += 1) {
				this[i.toString()] = this[(i + 1).toString()];
				this.$item(i).$name(i.toString());
			}
			delete this[len];
			// dispatch the collection remove event to notify listeners.
			this.$dispatchEvent(new $m.CollectionEvent($m.EventKind.REMOVE, this, nIndex, nIndex, [deletedRow]));

			return deletedRow;
		};
	}
	CollectionBase.prototype = eventPrototype;
	function Collection(definition, propertyName, parent, json) {
		var This = this;
		this.$listeners = [];

		nInsideConstructor += 1;
		this.$$private =	{	$name: propertyName,
								definition: definition,
								parent: parent
							};

		// make sure the definiton of the collection type has a type defined
		// We need the collection type in order to create new rows with the correct type
		objectType(definition.$collectionType);

		function LengthObj(collection) {
			this.valueOf = function () {
				return collection.$length();
			};
		}
		// using a length object will allow us to track dependencies on this collection
		// but bummer that if (collection.length) will always be true.
		// use either if (collection.length.valueOf()) or if (collection.$length())
		this.length = new LengthObj(This);

		// children of a collection need to be able to return their index inside the collection.
		if (parent && parent instanceof $m.Collection) {
			this.$index = function () {
				return +this.$name();
			};
		}

		synchToData.call(this, json);

		nInsideConstructor -= 1;
	}
	Collection.prototype = new CollectionBase();

	$m = {
		register: function (object) {
			if (object instanceof $m.Entity || object instanceof $m.Property || object instanceof $m.Collection) {
				registeredObjects[object.$name()] = object;
			} else {	// assume a plain map: name/value pairs
				$.each(object, function (name, value) {
					registeredObjects[name] = value;
				});
			}
		},

		rename: function (newName) {
			if ((window[newName] && (window[newName] !== $.abacus)) || ($[newName] && ($[newName] !== $.abacus))) {
				throw "Cannot rename package to: " + newName + ".  Naming conflict";
			}
			if (window[$modelName]) {
				window[$modelName] = undefined;
			}
			$modelName = newName;
			window[$modelName] = $.abacus;
		},
		enable: function (bEnable) {
			$m.Calculator.suspendCalcs(!bEnable);
		},
		/**
		 * The Calculator is the object that manages the execution of calculation scripts in the modeall.
		 *
		 */
		Calculator: (function () {
			// private members
			var calcStack = [],
				validateStack = [],
				availableStack = [],
				suspendCalcCount = 1;	// Start with caculations suspended.
										//This way inter-dependent entities can be created without calculation errors
				function pushCalc(obj) {
				if ($.inArray(obj, calcStack) === -1) {
					calcStack.push(obj);
				}
			}
			function pushValidate(obj) {
				if (obj.$value() !== null || !obj.$isValid()) {	// execute validation scripts only for non-null fields.
					if ($.inArray(obj, validateStack) === -1) {
						validateStack.push(obj);
					}
				}
			}
			function pushAvailable(obj) {
				if ($.inArray(obj, availableStack) === -1) {
					availableStack.push(obj);
				}
			}
			function execPending(sType) {
				var context, parent, p, props, i, currentCopy, result,
					retryStack = [],
					phase, RETRY_PHASE = 1,
					method = "$calculate",
					stack = calcStack;
				if (sType === "validate") {
					stack = validateStack;
					method = "$validate";
				} else if (sType === "available") {
					stack = availableStack;
					method = "$available";
				}
				if (suspendCalcCount) {
					return;
				}
				suspendCalcCount += 1;
				for (phase = 0; phase < RETRY_PHASE + 1; phase += 1) {
					while (stack.length > 0) {
						this.currentProperty = stack.shift();

						if (sType === "available" || this.currentProperty.$isAvailable()) {
							context = {};
							context[this.currentProperty.$name()] = this.currentProperty;
							parent = this.currentProperty.$parent();
							while (parent) {
								context[parent.$name()] = parent;
								if (parent instanceof $m.Entity) {
									props = parent.$properties();
									for (i = 0; i < props.length; i += 1) {
										p = props[i];

										// if this object name is already in scope, don't overwrite it.
										if (!context[p]) {
											context[p] = parent[p];
										}
									}
									$.each(registeredObjects, function (key, value) {
										context[key] = value;
									});
								}
								parent = parent.$parent();
								if (parent instanceof $m.Collection) {
									parent = parent.$parent();
								}
							}
							try {
								result = this.currentProperty[method]().call(this.currentProperty, context);
							} catch (err) {
								if (phase === RETRY_PHASE) {
									alert(err.toString());
								} else {
									retryStack.push(this.currentProperty);
									this.currentProperty = null;
								}
							}
							// turn off the current property tracking now so that the events
							// trigged by further processing don't show up as dependents.
							if (this.currentProperty) {
								currentCopy = this.currentProperty;
								this.currentProperty = null;
								if (sType === "calculate") {
									if (typeof result === "undefined") {
										result = null;
									}
									currentCopy.$value(result);
								} else if (sType === "validate") {
									// Store the negative valid property so that the absence of the property means "valid".
									currentCopy.$isValid(result);

									// TODO: eventually we throw this only when the state changes.
									// means we have to start carrying valid state
									if (result || (currentCopy.$value() === null && !currentCopy.$required())) {
										currentCopy.$dispatchEvent(new $m.validEvent($m.EventKind.VALID, currentCopy, currentCopy.$style().caption || ""));
									} else {
										if (!currentCopy.$style().error) {
											currentCopy.$style({error: "Invalid entry"});
										}
										currentCopy.$dispatchEvent(new $m.validEvent($m.EventKind.INVALID, currentCopy, currentCopy.$style().error));
									}
								}
								if (sType === "available") {
									if (typeof result === "undefined") {
										result = false;
									}
									currentCopy.$isAvailable(result);
								}
							}
						}
					}
					// once more try with any calcs that failed the first time around
					stack = retryStack;
				}
				suspendCalcCount -= 1;
			}
			return {	// public interface
				execCalculate: function (obj) {
					this.exec(obj, "calculate");
				},
				execValidate: function (obj) {
					this.checkRequired(obj);

					this.exec(obj, "validate");
				},
				execAvailable: function (obj) {
					this.exec(obj, "available");
				},
				checkRequired: function (obj) {
					var i, props, v;
					// calculate all nested objects
					if (obj instanceof $m.Entity) {
						props = obj.$properties();
						for (i = 0; i < props.length; i += 1) {
							this.checkRequired(obj[props[i]]);
						}
					} else if (obj instanceof $m.Collection) {
						for (i = 0; i < obj.$length(); i += 1) {
							this.checkRequired(obj.$item(i));
						}
					} else {	// Property
						if (obj.$required()) {
							v = obj.$value();
							if (v === null || v === "" || typeof v === "undefined") {
								obj.$$private.missingValue = true;
								if (!obj.$style().error) {
									obj.$style({error: "You must supply a value"});
								}
								obj.$dispatchEvent(new $m.validEvent($m.EventKind.INVALID, obj, obj.$style().error));
							} else {
								obj.$$private.missingValue = false;

								obj.$dispatchEvent(new $m.validEvent($m.EventKind.VALID, obj, obj.$style().caption || ""));
							}
						}
					}
				},
				// exec is a general purpose function that execs either
				// calculations or validations or availability.
				exec: function (obj, sType, bNested) {
					var i, props;
					// calculate all nested objects
					if (obj instanceof $m.Entity) {
						if (obj.$available()) {
							pushAvailable(obj);
						}
						props = obj.$properties();
						for (i = 0; i < props.length; i += 1) {
							this.exec(obj[props[i]], sType, true);
						}
					} else if (obj instanceof $m.Collection) {
						if (obj.$available()) {
							pushAvailable(obj);
						}
						for (i = 0; i < obj.$length(); i += 1) {
							this.exec(obj.$item(i), sType, true);
						}
					} else {	// Property
						if (sType === "calculate") {
							if (!obj.$calculate()) {
								return;
							}
							pushCalc(obj);
						} else if (sType === "validate") {
							if (!obj.$validate()) {
								return;
							}
							pushValidate(obj);
						} else if (sType === "available") {
							if (!obj.$available()) {
								return;
							}
							pushAvailable(obj);
						}
					}
					// bNested prevents us from executing all the pending calcs until the
					// pending list is complete.
					if (!bNested) {
						execPending.call($m.Calculator, sType);
					}
				},
				currentProperty: null,

				suspendCalcs: function (bOn) {
					if (bOn) {
						suspendCalcCount += 1;
					} else {
						if (suspendCalcCount > 0) {
							suspendCalcCount -= 1;
						}
						execPending.call($m.Calculator, "calculate");
						execPending.call($m.Calculator, "validate");
						execPending.call($m.Calculator, "available");
					}
				},

				trackDependency: function (prop) {
					var dependencies;
					// there's no active calculation or we're examining our own value -- nothing to track
					if (!this.currentProperty || prop === this.currentProperty) {
						return;
					}

					dependencies = prop.$$private.dependencies || [];
					prop.$$private.dependencies = dependencies;
					if ($.inArray(this.currentProperty, dependencies) === -1) {
						dependencies.push(this.currentProperty);
					}
				},

				recalculate: function (theEvent) {
					var i, property, dependencies;

					property = theEvent.source;
					dependencies = property.$$private.dependencies || null;
					if (dependencies) {
						for (i = 0; i < dependencies.length; i += 1) {
							if (dependencies[i].$calculate && dependencies[i].$calculate()) {
								pushCalc(dependencies[i]);
							}
							if (dependencies[i].$validate && dependencies[i].$validate()) {
								pushValidate(dependencies[i]);
							}
							if (dependencies[i].$available()) {
								pushAvailable(dependencies[i]);
							}
						}
					}
					// calculate availability first -- unavailable fields don't get calculated/validated
					execPending.call($m.Calculator, "available");
					execPending.call($m.Calculator, "calculate");
					execPending.call($m.Calculator, "validate");
				}
			};
		}()),

		/**
		 * A Property represents a primitive value stored either in an Entity or in a Collection
		 */
		Property: Property,
		Entity: Entity,
		Collection: Collection,
		EntityFromJSON: function (modelName, json) {
			// Build a model definition from sample json data.
			var modelDefinition = {$name: modelName}, newModelInstance;
			modelFromJSON(modelDefinition, json);

			newModelInstance = new $m.Entity(modelDefinition);
			newModelInstance.$value(json);
			return newModelInstance;
		},
		getCount: function () {
			return suspendQueueCount;
		},
		suspendQueue: function (bOn) {
			if (bOn) {
				suspendQueueCount += 1;
			} else {
				suspendQueueCount -= 1;
				if (suspendQueueCount === 0) {
					processQueue();
				}
			}
		},
		queueEvent: function (obj, theEvent) {
			eventQueue.push({obj: obj, evt: theEvent});

			processQueue();
		},
		StyleValidator: function (validatorFunction) {
			this.validate = validatorFunction;
		},
		EventKind: {
			COLLECTION: "collectionChange",
			PROPERTY: "propertyChange",
			VALIDATION: "validationResult",
			ADD: "add",
			REMOVE: "remove",
			REPLACE: "replace",
			UPDATE: "update",
			INVALID: "invalid",
			VALID: "valid"
		},
		PropertyEvent: function (kind, source, oldValue, newValue) {
			this.type = $m.EventKind.PROPERTY;
			this.kind = kind;
			this.source = source;
			this.oldValue = oldValue;
			this.newValue = newValue;
		},
		CollectionEvent: function (kind, src, location, oldLocation, items) {
			this.type = $m.EventKind.COLLECTION;
			this.kind = kind || null;
			this.source = src;
			this.location = location;
			this.oldLocation = oldLocation || -1;
			this.items =  items || null;
		},
		validEvent: function (kind, src, message) {
			this.type = $m.EventKind.VALIDATION;
			this.kind = kind;
			this.field = src.$name();
			this.message = message;
			this.source = src;
		},
		invalidProperties: function (obj) {
			var errors = [], len, item, i;
			if (obj instanceof $m.Entity) {
				$.each(obj.$properties(), function(idx, prop) {
					errors = errors.concat($m.invalidProperties(obj[prop]));
				});
			} else if (obj instanceof $m.Collection) {
				for (i = 0, len = obj.$length(); i < len; i += 1) {
					errors = errors.concat($m.invalidProperties(obj.$item(i)));
				}
			} else if (obj instanceof $m.Property) {
				if (!obj.$isValid()) {
					errors.push(obj);
				}
			}
			return errors;
		},
		getEditValue: function (property) {
			var style = property.$style(),
				sValue = property.$value(),
				df;

			if (typeof sValue === "undefined") {
				return "";
			}

			if (style && style.editMask) {
			// TODO: We'd need some code here to figure out the class of picture format -- date/numeric/text
			// and format accordingly.  For now we handle only dates.
				df = getFormatter(style.editMask, sValue);
				df.set_formatString(style.editMask);
				return df.format(sValue);
			}
			return sValue;
		},
		getDisplayValue: function (property) {
			// TODO: We'd need some code here to figure out the class of picture format -- date/numeric/text
			// and format accordingly.  For now we handle only dates.
			var sValue, style, df;
			if (property.$propertyType() === "string[]") {
				return property.toString();
			}

			sValue = property.valueOf();
			style = property.$style();

			if (typeof sValue === "undefined" || sValue === null) {
				return "";
			}
			if (style && style.displayMask) {
				df = getFormatter(style.displayMask, sValue);

				df.set_formatString(style.displayMask);
				// should be using the edit format to parse...
			//				myPerson.birthDate = DateFormatter.parseDateString(entity._model.getValue(property);
				return df.format(sValue);
			}
			return sValue;
		},
		eventListener: function (observer, srcObj, eventName, fn) {
			var This = this, prop, registered;
			// make a copy of the observer so it's frozen -- won't be modified by what happens in closure scope
			this.observer = {};
			for (prop in observer) {
				if (observer.hasOwnProperty(prop)) {
					if (observer[prop] instanceof Array) {
						this.observer[prop] = observer[prop].slice();
					} else {
						this.observer[prop] = observer[prop];
					}
				}
			}
			function execFunction(theEvent) {
				if (registered) {
					theEvent.data = This.observer;
					fn(theEvent);
				}
			}
			this.remove = function () {
				registered = false;
				srcObj.$removeEventListener(eventName, execFunction);
			};
			this.getObserver = function () {
				return this.observer;
			};
			this.register = function () {
				registered = true;
				srcObj.$addEventListener(eventName, execFunction);
			};
			this.synchronize = function () {
				var currentValue = srcObj.valueOf(), thisEvent;
				// TODO- should have a more explicit event name -- or an event kind
				if (eventName === $m.EventKind.PROPERTY) {
					thisEvent = new $m.PropertyEvent(
						$m.EventKind.UPDATE,
						srcObj,
						currentValue,
						currentValue
					);
					thisEvent.data = This.observer;
					fn(thisEvent);
				}
			};
			this.register();
			return this;
		},
		dateToISO: function (theDate) {
			function pad(num) {
				if (num < 10) {
					return "0" + num;
				} else {
					return num.toString();
				}
			}
			if (theDate === null) {
				return "";
			}

			return theDate.getFullYear().toString() + "-" + pad(theDate.getMonth() + 1) + "-" + pad(theDate.getDate());
		},
		unbind: function (element) {
			var $element = $(element),
				eventData = $.data(element, "eventData"),
				original,
				i;

			removeModelClasses($element);
			if (eventData) {
				if (eventData.adapter) {
					$element[eventData.adapter]("destroy");
					$element.removeClass("abacus-adapter");
				}
				original = eventData.originalContent;
				$.each(original, function (name, value) {
					if (name === "html") {
						$element.html(value);
					} else if (name !== "value") {
						$element.attr(name, value);
					}
				});
				delete eventData.originalContent;
			}
			if (!eventData) {
				eventData = $.data(element, "data-repeat");
				if (eventData) {
					$.removeData(element, "data-repeat");
				}
			}
			if (eventData) {
				// is there an array of elements bound to a collection?
				if (eventData.array) {
					$.each(eventData.array, function (index, element) {
						element.remove();
					});
				}
				if (eventData.repeatContent) {
					removeModelClasses(eventData.repeatContent, true);
					$(element).replaceWith(eventData.repeatContent);
				}
			}
			if (eventData && eventData.events) {
				$.each(eventData.events, function (index, evt) {
					if (evt instanceof $m.eventListener) {
						evt.remove();
					}
				});
			}
			if (eventData && eventData.fields) {
				i = eventData.fields.length;
				while (i) {
					i -= 1;
					if (eventData.fields[i].get(0) === element) {
						eventData.fields.splice(i, 1);
					}
				}
			}
		}

	};
	return $m;
}($CQ));

/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2011 Adobe Systems Incorporated
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 *
 */

/*global $, jQuery, formatters */
/**
 * @private
 */
(function ($) {
	$.fn.abacusLink = function (options) {
		var $m, synchCollection, synchElement, synchFunctions = [], fieldGroups = [];

		/*
		 * fieldGroups are sets of like-named fields that participate in a multi-select list.
		 * For this to work, the fields are bound to a property of type: string[].
		 * Normally we'd expect these fields to be check boxes, but it also works if they're text fields.
		 * We need to track these groups during binding in order to keep them in groups.
		 * The groups are then used when assigning values -- either making an array from the fields in the
		 * group or else assigning fields from an array of strings.
		 */
		function getFieldGroup(element, vProperty) {
			var returnGroup,
				sName = element.attr("name");

			$.each(fieldGroups, function (index, group) {
				if (group.name === sName && vProperty === group.property) {
					returnGroup = group;
				}
			});
			if (!returnGroup) {
				returnGroup = {name: sName, property: vProperty, elements: []};
				fieldGroups.push(returnGroup);
			}
			returnGroup.elements.push(element);
			return returnGroup.elements;
		}
		/*
		 * If an entity or property have been removed, remove any nested properties
		 * from the fieldGroup list
		 * The source parameter may be a collection event or a Collection or an Entity or a Property
		 *
		 */
		function checkGroups(source) {
			var i, len;
			if (source instanceof $m.Entity) {
				$.each(source.$properties(), function (index, child) {checkGroups(source[child]);});
			} else if (source instanceof $m.Collection) {
				len = Collection.$length();
				for (i = 0; i < len; i += 1) {
					checkGroups(Collection.$item(i));
				}
			} else if (source instanceof $m.Property) {
				if (source.$propertyType() === "string[]") {
					// if this property is being removed and is in our list,
					// then also clear it from the list.
					for (i = fieldGroups.length - 1; i >= 0; i -= 1) {
						if (group.property === source) {
							fieldGroups.splice(i, 1);
						}
					}
				}
			} else if (source.kind && source.kind === $m.EventKind.REMOVE) {
				// source is a collection remove event
				for (i = 0; i < source.items.length; i += 1) {
					checkGroups(source.items[i]);
				}
			}
		}
		function hasProperty(entity, property) {
			if (entity instanceof $m.Collection) {
				return (entity.$rowName() === property);
			}
			return (entity[property] ? true : false);
		}

		// find the entity that defines a property
		function locateEntity(entities, sName) {
			var j, testEntity;
			for (j = entities.length; j > 0; j -= 1) {
				testEntity = entities[j - 1];
				if (hasProperty(testEntity, sName)) {
					return testEntity;
				}
				if (testEntity.$name() === sName) {
					return testEntity;
				}
				if (testEntity.$parent() instanceof $m.Collection) {
					// see if the name matches the collection type
					if (testEntity.$parent().$rowName() === sName) {
						return testEntity;
					}
				}
			}
			// returns undefined if not found
			return undefined;
		}

		// figure out something about an object reference -- does it quack like a selector?
		// or more specifically -- make sure it's not a model object
		function isSelector(obj) {
			if (obj.jquery) {
				return true;
			}
			if (obj instanceof $m.Collection) {
				return false;
			}

			if (obj.$model) {
				return false;
			}
			return (typeof obj === "string");
		}

		function resolveSelector(selector, contextNode) {
			var result;
			if (selector.jquery) {
				return selector;
			}
			if (contextNode) {
				result = contextNode.find(selector);

				if (result.length === 0 && contextNode.is(selector)) {
					result = contextNode;
				}
				return result;
			}
			return $(selector);
		}

		function isField(node) {
			var sTag = node.get(0).tagName;
			// We used to use: node.is("input") etc. but it was much slower.
			return sTag === "INPUT" || sTag === "SELECT" || sTag === "TEXTAREA";
		}

		function substitute(sContent, sExpression, entities) {
			var sValue, entity;
			sExpression = sExpression.replace(/\+\{|\}/g, "");

			entity = locateEntity(entities, sExpression);
			if (!entity) {
				return sContent;
			}
			if (entity instanceof $m.Property) {
				sValue = $m.getDisplayValue(entity);
			} else {
				sValue = $m.getDisplayValue(entity[sExpression]);
			}
			return sContent.replace("+{" + sExpression + "}", sValue.toString());
		}

		function assignProperty(theEvent) {
			var observer = {}, aProperties, j, sContent, target, htmlInput, targetProp, eventData, arrayValue;
			$CQ.extend(observer, theEvent.data);

			target = observer.targetObject;
			targetProp = observer.targetProperty;
			if (target instanceof $m.Entity) {
				htmlInput = $(theEvent.currentTarget);
				if (targetProp.$propertyType() === "string[]") {
					// if the property is an array, then the array value will be the aggregate of all the
					// same-named fields that are bound to the Property
					// Most likely this is a group of checkboxes
					// Could also be a <select multiple> which has an array value.
					eventData = $.data(theEvent.currentTarget, "eventData");
					arrayValue = [];
					$.each(eventData.fields, function (index, element) {
						var field = element.get(0),
							sValue = element.val();

						switch (field.tagName) {
						case "INPUT":
							switch (element.attr("type")) {
							case "checkbox":
							case "radio":
								if (element.prop("checked")) {
									arrayValue.push(sValue);
								}
								break;
							default:
								if (sValue !== "") {
									arrayValue.push(sValue);
								}
								break;
							}
							break;
						case "SELECT":
							if (element.attr("multiple") === "multiple") {
								arrayValue = sValue;
							} else {
								if (sValue !== "") {
									arrayValue.push(sValue);
								}
							}
							break;
						case "TEXTAREA":
							if (sValue !== "") {
								arrayValue.push(sValue);
							}
							break;
						}
					});
					targetProp.$value(arrayValue);
				} else {	// not bound to an array
					if (htmlInput.attr("type") === "checkbox") {
						targetProp.$value(htmlInput.prop("checked"));
					} else {
						targetProp.$value(theEvent.newValue);
					}
				}
			} else if (target instanceof $m.Collection) {
				// when a collection, the property is an offset
				target.$item(targetProp).$value(theEvent.newValue);

			} else {
				if ((targetProp === "data-bind-value" || targetProp === "value") && isField(target)) {
					if (theEvent.source.$propertyType() === "string[]") {
						// if the source is an array, then the array value will be the aggregate of all the
						// same-named fields that are bound to the Property
						// Most likely this is a group of checkboxes
						// Could also be a <select multiple> which has an array value.
						eventData = $.data(target.get(0), "eventData");
						arrayValue = theEvent.source.$value() || [];
						$.each(eventData.fields, function (index, element) {
							var field = element.get(0);

							switch (field.tagName) {
							case "INPUT":
								switch (element.attr("type")) {
								case "checkbox":
								case "radio":
									element.prop("checked", $CQ.inArray(element.val(), arrayValue) !== -1);
									break;
								default:
									element.val(index >= arrayValue.length ? "" : arrayValue[index]);
									break;
								}
								break;
							case "SELECT":
								if (element.attr("multiple") === "multiple") {
									element.val(arrayValue);
								} else {
									element.val(index >= arrayValue.length ? "" : arrayValue[index]);
								}
								break;
							case "TEXTAREA":
								element.val(index >= arrayValue.length ? "" : arrayValue[index]);
								break;
							}
						});
					} else {
						// value is special -- assume this is for an <input> or <select> element.
						if (target.attr("type") === "checkbox") {
							target.prop("checked", theEvent.source.$value());
						}
						if (target.attr("type") === "radio") {
							// Assume all radio buttons in the same group are bound to the same property.
							// Check the radio button that matches the property value
							target.prop("checked", target.val() === theEvent.source.$value());

						} else if (target.attr("type") !== "button") {
							// don't synchronize a button value.
							// TODO maybe eventually we'll synchronize the button value to the style.caption
							// .val() assignment handles both
							target.val($m.getDisplayValue(theEvent.source));

						}
					}
				} else if (targetProp === "available") {
					// based on availability, either remove or restore the bound element to the DOM
                    var evtData = target.data("eventData");
					if (theEvent.source.$isAvailable()) {
                        evtData.availableAnchor.empty().after(target);
					} else {
                        //CQ5-34399: when detaching fields replace with hidden field to assist server side validation
                        evtData.availableAnchor.append('<input name=":fieldhidden" type="hidden" value="' + target.find(":input").attr("name") + '">');
						target.detach();
					}
				} else if (targetProp !== "data-bind") {
					// for data-bind do nothing.  This is just binding without substituting content.
					// Useful in cases where a button needs to be bound to context in the model.

					sContent = target.data("eventData").originalContent[targetProp] || "";
					aProperties = sContent.match(/\+\{[^}]*\}/g) || [];
					if (aProperties.length > 0) {
						for (j = 0; j < aProperties.length; j += 1) {
							sContent = substitute(sContent, aProperties[j], observer.entities);
						}
					} else {
						sContent = $m.getDisplayValue(theEvent.source, theEvent.property);
						if (sContent === undefined) {
							sContent = "";
						}
					}
					// Substitute out any data-bind- prefix in order to assign the actual property.
					targetProp = targetProp.replace(/data\-bind\-/, "");
					if (targetProp === "html") {
						target.html(sContent);

					} else {
						target.attr(targetProp, sContent);
					}
				}
			}
		}

		function cloneAdapterData(dst, src) {
			var eventData = $.data(src.get(0), "eventData"),
				options = {};
			$CQ.extend(options, eventData);
			delete options.source;
			delete options.widgetAssigned;
			dst.abacusUIAdapter(options);
		}
		/**
		 * Clone a prototype section of HTML, also cloning any model adapters that are
		 * bound to the source HTML.  Any elements that have a model adapter will have a class
		 * definition: "abacus-adapter".
		 * @param source: the source HTML to clone.
		 */
		function cloneWithAdapters(source) {
			// get a list of all adapters bound to descendents of the start element
			var srcAdapters = source.find(".abacus-adapter"),
			// unfortunately, jquery '.find' doesn't include the start element.
			// Process it separately.
				bSrcHasAdapter = source.hasClass("abacus-adapter"),
				i = 0,
				newNode = source.clone();

			if (bSrcHasAdapter) {
				cloneAdapterData(newNode, source);
			}
			if (srcAdapters.length > 0) {
				newNode.find(".abacus-adapter").each(
					function () {
						cloneAdapterData($(this), $(srcAdapters[i]));
						i += 1;
					}
				);
			}
			return newNode;
		}
		/**
		 * This function sets up a binding:
		 * targetObj[targetProp] = srcObj[srcProp];
		 * @param srcObj -- either a model class or a selector pointing to an
		 *					<input> or <select> element
		 * @param srcProp -- the property of the source object that we're synching from
		 * @param targetObj -- the object we're populating
		 * @param targetProp -- the object property to be populated
		 * @param contextNode -- used when we're binding into a repeating structure
		 * @param entities -- The set of entities that are curently in scope.
		 */
		function bindProperty(srcObj, srcProp, targetObj, targetProp, contextNode, entities) {
			contextNode = contextNode || null;

			var eventListener,
				vPlaceholder,
				resolved,
				eventData,
				callback,
				observer = {targetObject:	targetObj,
							targetProperty: targetProp,
							contextNode:	contextNode,
							entities:		entities
							};


			// if the source is a selector, then we'll assume it's going to resolve to an <input>
			// or <select>. use the change event to propagate changes
			if (isSelector(srcObj)) {
				// resolve the selector in the context of the context node.
				resolved = resolveSelector(srcObj, contextNode);
				if (resolved.length > 0 && !isField(resolved)) {
					$.error("Expected the source object to resolve to an INPUT or SELECT, not a: " + resolved.get(0).tagName);
				}
				resolved.addClass("abacus-bound");
				if (targetProp instanceof $m.Property && targetProp.$propertyType() === "string[]") {
					// If we have multiple same-named fields bound to an array property, then the property
					// value will be an array with one element for each field.
					resolved.each(function (index, element) {
						$.data(element, "eventData").fields = getFieldGroup($(element), targetProp);
					});
				}
				resolved.change(observer,
					function (theEvent) {
						theEvent.oldValue = theEvent.prevValue;
						if (theEvent.target.type === "checkbox") {
							theEvent.newValue = theEvent.target.checked;
						} else {
							theEvent.newValue = $(theEvent.target).val();
						}
						theEvent.property = "value";
						// IE will throw the change event when we programatically assign an input element value.
						// This is a problem, because we're often assigning a formatted 'display value', and
						// we don't want that value going back into the model.
						// These events seem to be characterized by a type=="focusout"
						// For a normal interactive event we get type=="beforedeactivate"
                        if (theEvent.type && theEvent.type !== "focusout") {
                            assignProperty(theEvent);
						}
					});

			} else if (srcObj instanceof $m.Collection) {
				return new $m.eventListener(
					observer,
					srcObj,
					$m.EventKind.COLLECTION,
					synchCollection
				);
			} else if (srcObj instanceof $m.Entity || srcObj instanceof $m.Property) {
				resolveSelector(targetObj, contextNode).each(function (index, element) {
					observer.targetObject = $(element);
					observer.targetObject.addClass("abacus-bound");
					eventData = $.data(observer.targetObject.get(0), "eventData");
					callback = (eventData && eventData.callback) ? eventData.callback : assignProperty;
					eventListener = new $m.eventListener(
						observer,
						srcProp || srcObj,
						$m.EventKind.PROPERTY,
						callback
					);
					if (!eventData) {
						eventData = { events: [eventListener] };
						$.data(observer.targetObject.get(0), "eventData", eventData);
					} else {
						if (!eventData.events) {
							eventData.events = [eventListener];

						} else {
							eventData.events.push(eventListener);
						}
					}
					if (isField(observer.targetObject)) {
						// Could be bound to a property or an entity
						eventData.source = srcProp || srcObj;
						// When binding to an <input>/<select> element, see if there's a widget
						// adapter bound.
						// Calling assignAdapter() will bind a type-sensitive widget
						// e.g. a datepicker for date fields.
						if (eventData.assignAdapter) {
							eventData.assignAdapter();
						}
					}
					// assigning embedded properties: +{propName}
					if (!eventData.originalContent) {
						eventData.originalContent = {};
					}
					if (targetProp === "html") {
						eventData.originalContent.html = observer.targetObject.html();
					} else {
						eventData.originalContent[targetProp] =
							observer.targetObject.attr('data-bind-' + targetProp);
						if (!eventData.originalContent[targetProp]) {
							eventData.originalContent[targetProp] = observer.targetObject.attr(targetProp);
						}
					}
					if (targetProp === "available") {
						// placeholder is an element we deposit into the DOM to
						// anchor the position of the repeating elements.
						// we need the anchor because the collection could be empty to begin with
						vPlaceholder = $('<div class="abacus-availableAnchor" style="display:none"/>');
						eventData.availableAnchor = vPlaceholder;
						// insert the available placeholder before the target element
						observer.targetObject.before(vPlaceholder);
					}

					return eventListener;
				});
			}
		}

		/**
		 * applyBindings will recursively apply binding specifications to link UI elements to model
		 * properties.
		 * @param bindingDefs -- an array of binding specifications.  Individual bindings
		 * might include nested arrays of binding specs.
		 * @param startEntities -- an array of model.Entity definitions that are in scope of this operation.
		 * @param contextNode -- if this binding is being applied recursively, we need to make sure
		 * that the binding is applied in the correct context -- e.g. could be a binding applied in
		 * the context of a repeating row.  Selectors are applied in context.
		 */
		function applyBindings(bindingDefs, startEntities, context) {
			var entity,
				i,
				j,
				k,
				properties,
				binding,
				newBinding,
				theEvent,
				property,
				selector,
				thisEntity,
				vRepeat,
				repeatData,
				node,
				entities,
				vElements,
				vPlaceholder,
				contextNode,
				eventListener,
				parts,
				targetProp,
				bTwoWay;

			startEntities = startEntities || [];

			if (!bindingDefs[bindingDefs.length - 1]) {
				// for the odd case in IE where the syntax [a,b,]
				// will add an empty object to the end of the array
				bindingDefs.splice(bindingDefs.length - 1, 1);
			}
			for (i = 0; i < bindingDefs.length; i += 1) {
				// slice() will make a copy of the array  This way if the entities array gets
				// extended in the loop, the new entities aren't included for subsequent bindings
				entities = startEntities.slice();
				contextNode = context;
				binding = bindingDefs[i];
				if (binding.entity) {
					// look up the specified entity in the context of the entity array
					// For it to be a valid entity reference, it needs match one of the entities
					// or be a child of one of the entities
					entity = undefined;
					// binding can be specified as A.B
					parts = binding.entity.split(".");
					for (j = 0; j < parts.length; j += 1) {
						entity = locateEntity(entities, parts[j]);
						if (entity === undefined) {
							// TODO: With better bookkeeping we might be able to get rid of this option
							if (!options.allowUnresolvedReferences) {
								$CQ.error("property: " + parts[j] + " could not be resolved");
							}
						}
						if (entity !== undefined) {
							// We have either an entity from the array or else a child of one of the
							// entities.
							if (entity.$name() !== parts[j]) {
								// if a child, get a reference and add it to the list
								entity = entity[parts[j]];
								entities.push(entity);
							}
						}
					}
					// When we encounter an entity definition, we want to make all
					// selector references relative to that entity.
					if (binding.selector) {
						contextNode = resolveSelector(binding.selector, contextNode);
					}
					if (contextNode.length === 0) {
						// until we can resolve a context node, we can't bind anything.
						// This situation can happen when there are multiple calls to
						// bindModel() and the same binding definitions are used to populate
						// different parts of the ui with different entity definitions.
						// So we ignore the current entity and try again with the children.
						if (binding.bind && binding.bind.length > 0) {
							applyBindings(binding.bind, entities, context);
						}
						continue;
					}
				} else {
					// no new entity specified.  Keep working with the entity references
					// already in place.
					entity = entities[entities.length - 1];
				}

				if (entity instanceof $m.Collection && binding.selector) {
					// we're binding UI to a (repeating) collection
					vElements = resolveSelector(binding.selector, contextNode);
					if (!vElements || vElements.length === 0) {
						$CQ.error(binding.selector + " did not resolve to any elements");
					}
					for (k = 0; k < vElements.length; k += 1) {
						// build a binding definition that we can store with the repeating
						// element.  This binding definition will be used when we clone the
						// repeating element and repeat the binding process for the new UI.
						// We remove the entity and selector references, since we don't need to
						// re-resolve them when we clone more instances
						if (vElements.length === 1) {
							vRepeat = vElements;
						} else {
							vRepeat = $(vElements.get(k));
						}
						newBinding = $CQ.extend(true, {}, binding);
						delete newBinding.entity;
						delete newBinding.selector;
						// placeholder is an element we deposit into the DOM to
						// anchor the position of the repeating elements.
						// we need the anchor because the collection could be empty to begin with
						vPlaceholder = $('<div class="abacus-repeater" style="display:none"/>');
						// don't use jQuery replaceWith(), because it won't preserve data
//						vRepeat.replaceWith(vPlaceholder);
						vRepeat.after(vPlaceholder);
						vRepeat.detach();
						repeatData = {
							repeatContent: vRepeat,
							bindingDef: [newBinding],
							array: [],
							collection: entity
						};
						// Set up the element bound to the collection as a prototype instance
						// used to clone more instances bound to the collection.
						$.data(vPlaceholder.get(0), "data-repeat", repeatData);
						// bind the element to the repeating collection
						eventListener = bindProperty(entity, "repeat", vPlaceholder, "repeat", contextNode, entities);
						repeatData.events = [eventListener];

						// synchronize existing instances
						// since we're set up to synchronize on collection change events,
						// use an artificial event to synchronize here.
						for (j = 0; j < entity.$length(); j += 1) {
							theEvent = {};
							theEvent.data = {targetObject: vPlaceholder, entities: entities};
							theEvent.kind = $m.EventKind.ADD;
							theEvent.items = [entity.$item(j)];
							synchCollection(theEvent);
						}
						if (vPlaceholder.parent().get(0).tagName === "SELECT") {
							// If we've just finished updating the definition of a <select>
							// element, let's re-synch with the model so that the current
							// value displays correctly.
							synchElement(vPlaceholder.parent());
						}
					}
					continue;	// to next binding definition
				} else if (!binding.property) {
					// If there are no properties to bind, then simply
					// recurse down to process nested bindings
					if (binding.bind && binding.bind.length > 0) {
						applyBindings(binding.bind, entities, contextNode);
					}
					continue;	// to next binding definition
				}
				// in the case where we are binding the label of a tab or accordion,
				// there could be properties that do not have a match
				// in the html markup.
				selector = binding.selector;
				if (selector === undefined) {
					selector = contextNode;
				}
				node = resolveSelector(selector, contextNode);
				properties = binding.property.split(",");
				for (k = 0; k < properties.length; k += 1) {
					property = properties[k];
					thisEntity = locateEntity(entities, property);
					if (thisEntity === undefined) {
						if (options.allowUnresolvedReferences) {
							continue;
						} else {
							$CQ.error("property: " + property + " not found in any entities");
						}
					}
					if (thisEntity[property]) {
						property = thisEntity[property];
					} else {	// property
						property = thisEntity;
					}
					if (node.length > 0) {
						targetProp = binding.targetProp;
						if (!targetProp) {
							// supply a default property --
							// for fields it is "value" for all other nodes it's "html" (the content)
							if (isField(node)) {
								targetProp = "value";
							} else {
								targetProp = "html";
							}
						}
						bindProperty(thisEntity, property, node, targetProp, contextNode, entities);
						bTwoWay = binding.twoWay;
						// if we're binding to a field value, and twoWay isn't specified, then default to bidirectional.
						if (typeof binding.twoWay === "undefined" && isField(node) && targetProp === "value") {
							bTwoWay = true;
						}
						if (bTwoWay) {
							bindProperty(selector, targetProp, thisEntity, property, contextNode, null);
						}
					}
				}
				// Perform an initial synchronization.
				synchElement(node);

				// recurse down to process nested bindings
				if (binding.bind && binding.bind.length > 0) {
					applyBindings(binding.bind, entities, contextNode);
				}
			}
		}
		function bindModelToMarkup(bindingDefs, startEntities, context) {
			// here is where we do the bulk of the work in binding markup to model
			applyBindings(bindingDefs, startEntities, context);
			if (fieldGroups.length > 0) {
				// If we've got some multi-select groups in the current bindings, then make sure we
				// clean them up if the properties get removed along the way.
				$.each(startEntities, function (index, entity) {
					entity.$addEventListener($m.EventKind.COLLECTION, checkGroups);
				});
			}
			// During binding we'll establish connections between model properties/collections and the markup
			// Now we need to apply the state of the model to the markup
			// We defer this processing because in the case of marking content as available, we have to remove
			// content from the DOM -- which if we did it at binding time would prevent further binding.
			$.each(synchFunctions, function (index, fn) {fn();});
			synchFunctions = [];
		}
		/**
		 * When a model collection changes, update the UI accordingly.
		 * @param theEvent -- a collection change event.
		 */
		synchCollection = function (theEvent) {
			var entities, observer = theEvent.data, vRow, newNode, refNode, theCollection, vNodeToRemove, repeatData;
			vRow = observer.targetObject;
			repeatData = $.data(vRow.get(0), "data-repeat");

			// Find the prototype repeating element.
			switch (theEvent.kind) {
			case $m.EventKind.ADD:
				// retrieve all the entity references that are in context of this reference
				// grab a copy of the entities array so we don't inadvertently modify the original
				entities = observer.entities.slice();
				entities.push(theEvent.items[0]);

				theCollection = repeatData.array;
				// TODO Assume append for now.
				newNode = cloneWithAdapters(repeatData.repeatContent);
				refNode = vRow;
				if (theCollection.length > 0) {
					refNode = theCollection[theCollection.length - 1];
				}
				refNode.after(newNode);
				bindModelToMarkup(repeatData.bindingDef, entities, newNode);
				theCollection.push(newNode);
				break;
			case $m.EventKind.REMOVE:
				vNodeToRemove = repeatData.array[theEvent.location];
				// unbind everything associated with this fragment of the DOM
				destroyBindings(vNodeToRemove);
				vNodeToRemove.remove();
				repeatData.array.splice(theEvent.location, 1);
				break;
			case $m.EventKind.REPLACE:
			case $m.EventKind.UPDATE:
				break;
			}
		};

		/**
		 * make sure the current element is up-to-date with values from the model
		 * @param node the element to synchronize
		 */

		synchElement = function (node) {
			var selected, storedEvents, j;
			if (node.length > 0) {
				selected = $.data(node.get(0), "eventData");
				storedEvents = selected && selected.events ? selected.events : [];
				for (j = 0; j < storedEvents.length; j += 1) {
					synchFunctions.push(storedEvents[j].synchronize);
				}
			}
		};

		function destroyBindings(root) {
			$(root).find(".abacus-bound,.abacus-adapter").each(function (index, element) {
				$m.unbind(element);

			});
			// we reverse the order of results so that nested repeats get unbound before their parent
			$($(root).find(".abacus-repeater").get().reverse()).each(function (index, element) {
				$m.unbind(element);
			});
		}
		// TODO: I don't think this really works to bind to more than one place in the
		// markup. So either make it work or don't use "each". Just process the first.
		this.each(function () {
			$m = $.abacus;
			var models;
			if (options === "destroy") {
				fieldGroups = [];
				destroyBindings(this);
			} else {
				// The abacus model is inert until explicitly enabled
				$m.enable(true);

				if (!options.bindings) {
					// Scan source for bindings
					// and populate options.bindings
					options.bindings = [];
					$(this).abacusBindings(options.bindings);
				}
				models = options.data instanceof Array ? options.data : [options.data];
				bindModelToMarkup(options.bindings, models, $(this));
			}
		});
	};
}($CQ));

/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2011 Adobe Systems Incorporated
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 *
 */

/**
 * @private
 */
$CQ.extend(abacus, function() {

    /**
     * Return the abacus default value for the given field.
     * @private
     * @param field
     */
    var getAbacusDefaultValue = function(field) {
        var defaultValue = field.defaultValue;

        if (field.enumeration) {
            // enumerations can have multiple default values, checkbox group for example
            defaultValue = [];
            for (var i = 0; i < field.enumeration.length; i++) {
                if (field.enumeration[i].defaultValue) {
                    defaultValue.push(field.enumeration[i].defaultValue);
                }
            }
            if (field.type == "select") {
                defaultValue = new Array(defaultValue);
            }
        }

        return defaultValue;
    };

    return {

        /**
         * initializeAbacus is to be called to wire up the show hide expression
         * to the fields located on the page.
         * @param the show hide expression which to apply to the form field.
         * Changed made 12/6/2021 to resolve: TFCE-13924: https://jira.amer.thermo.com/browse/TFCE-13924
         * Issue: Input fields not nested to a form element is causing the script to fail and prevents the loading of the form.  This was evident on AEM pages where the 
         * header dynamic offers has some input hidden fields, not nested to a from element.  This prevents the loading of the eloqua form. 
         * Fix: While looping through the array of fields, add the check to ensure the input field is nested to a form element
         *  (check if field has node of form) before proceeding with the processing.  If it not defined or null, process the next field in the array of fields
         */
        initializeAbacus: function(showHideExpressions) {
            var fields = CQ.shared.Form.getFields();

            // a page may contain multiple forms, keep the fields
            // organized to the form they belong to to create a record
            // for each form such that reset will work on the individual form
            // and not cross talk to other forms
            // bug #38738
            var forms = [];

            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                
                //check if the field node form is not defined, if it is not defined, proceed to the next field
                if (!field.node.form) continue;

                // a collection of bindings that are associated with a form
                var abacusBindings = [];

                // a abacus record one per field
                var abacusRecord = {};

                // jQuery 1.6 doesn't like selectors with a : escape them
                var selector = field.name;
                selector.replace(/^:/, "\\:");

                var dotParts = field.name.split(".");

                // associate the model and binding to a form this is done to
                // support multiple forms on a single page
                //
                var formId = field.node.form.id || "unnamed-form";
                var form = CQ.shared.Form.searchArray(forms, "formId", formId);

                // check to see if the form already has a binding and record
                // if we do then we'll add to it later on, otherwise create
                // a new entry for this form
                if (form == null) {
                    form = {"formId": formId, "abacusBindings": abacusBindings,
                        "abacusRecord": abacusRecord, "node": field.node.form};
                    forms.push(form);
                } else {
                    abacusBindings = form.abacusBindings; // get the form's previous bindings
                    abacusRecord = form.abacusRecord;     // get the form's previous record
                }

                // Build out the top-level object in the record.  The top-level objects are the only
                // things that can have show/hide expressions on them:
                //
                var dotName = dotParts[0];
                if (dotName && !abacusRecord.hasOwnProperty(dotName)) {
                    if (showHideExpressions.hasOwnProperty(dotName)) {
                        abacusRecord[dotName] = {
                            "$available": "return " + showHideExpressions[dotName]
                        };
                        abacusBindings.push({
                            "property": dotName,
                            "targetProp": "available",
                            "selector": "div." + field.selector + ":has(" + field.type + "[name='" + selector + "'])"
                        });
                    } else {
                        abacusRecord[dotName] = { };
                    }
                }

                var object = abacusRecord[dotName];

                // Fill out any other levels, down to the leaf objects:
                //
                for (var j = 1; j < dotParts.length; j++) {
                    dotName = dotParts[j];
                    if (!object.hasOwnProperty(dotName)) {
                        object[dotName] = { };
                    }
                    object = object[dotName];
                }

                // The leaf objects are what actually map to our HTML fields, so add any other info
                // we've collected to them:
                //
                if (field.enumeration) {
                    object["$propertyType"] = "string[]";
                }
                var defaultValue = getAbacusDefaultValue(field);
                if (defaultValue) {
                    object["$value"] = defaultValue;
                }

                // Now for the bindings.  The non-leaf objects bind to entities, while the leaf objects
                // bind to properties.
                //
                var bindings = abacusBindings;
                for (j = 0; j < dotParts.length; j++) {
                    dotName = dotParts[j];
                    if (j < dotParts.length-1) {
                        bindings.push({
                            "entity": dotName,
                            "bind": []
                        });
                        bindings = bindings[bindings.length - 1].bind;
                    } else {
                        bindings.push({
                            "property": dotName,
                            "selector": field.type + "[name='" + selector + "']"
                        });
                    }
                }
            }

            // for each form that's in the array setup a unique
            // abacus record such that each form can reset its own data.
            //
            var options = { data: [], bindings: [] };
            for (i = 0;i < forms.length; i++) {
                form = forms[i];

                // generate a entity with a unique name
                var record = new abacus.Entity(form.abacusRecord, 'record-' + i);
                options.data.push(record);

                // walk through the set of bindings and push them into the uber
                // collection of binding options
                for (j = 0; j < form.abacusBindings.length; j++) {
                    options.bindings.push(form.abacusBindings[j]);
                }

                // each form gets associated with a record store the record so
                // we can reset it if required in the reset handler
                //
                form["record"] = record;

                // this is ugly but required, we need to wrap the client handler in a
                // function to scope the record such that the handler has the correct record
                (function() {
                    var tmpRecord = record;
                    var tmpNode = form["node"];
                    $CQ(tmpNode).find('[type="reset"]').click(function() {
                        tmpRecord.$value({});
                        return false;
                    });
                })();
            }

            // register all form fields into the global abacus space
            // this gives us access to to them, however also has the issue that
            // there can be conflicts if two forms define the same variable.
            $CQ.each(options.data, function(i, aRecord) {
                $CQ.each(aRecord.$properties(), function(i, name) {
                    abacus.register(aRecord[name]);
                });
            });

            $CQ('body').abacusLink(options);
        }
    }
}());
