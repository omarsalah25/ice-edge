(function ($) {
	/**
	*	lvalidate Plugin
	*	Applys to a <form> element.
	*	Takes all the required fields and validates them accordingly.
	*
	*	@todo Rules
	*
	*/

	$.fn.lvalidate = function (options) {
		/**
		*	Default settings
		*/
		var defaults =
		{
			"requiredClass": "required",
			"similarClass": "similar",
			"requiredGroupClass": "required-group",
			"regExpClass": "regexp",
			"onError": function (e, c) {

			},
			"onSuccess": function (e, c) {

			},
			"onFirstError": function (elem, code) {
			},
			"custom_validation": function (lvalidate) {
				return true;
			},
			"invalid": function (o) {

			}
		};

		if (typeof options == 'string' && $(this).data('lvalidate')) {
			var obj = $(this).data('lvalidate');
			switch (options) {
				case 'validate':
					obj.validate();
					return this;
					break;
				default:
					return this;
					break;
			}
		}
		/**
		*	Extended settings
		*/
		var settings = $.extend(defaults, options);

		$(this).each(function (i, e) {
			// We want the actual form to be in the settings as "obj"
			settings['obj'] = $(this);

			// We implement a new instance of the Locomotive_Validate Class
			var data = new Locomotive_Validate(settings);

			// We wanna have access to these datas later on.
			$(this).data('lvalidate', data);
		});

		/**
		*	On submit, we wanna prevent default (the actual submit.)
		*	Validation should occur there
		*/
		$(this).on('click', '[type=submit]', function (e) {
			e.preventDefault();
			var form = $(this).parents('form');
			var lvalidate = form.data('lvalidate');

			// We call the validation
			// All the handlers for success or error are within the "lvalidate" datas.
			lvalidate.validate();
		});
		return this;

	};

}(jQuery));

/***
*	Locomotive_Validate js Class
*	Validates the form with the parameters
*
*	@param {object} opts
*		{
*			obj : [Form element],
*			requiredClass : 'required',
*			requiredGroupClass : "required-group"
*			onError : function(e) {},
*			onSuccess: function(e) {}
*		}
*
*	@notes
*	There are some "error strings" that define the type of error (or success).
*		- ok (success)
*		- empty	(error / global)
*		- invalid_mail (error / email rule)
*		- invalid (error / global)
*		- unchecked (error / radio)
*		- unselected (error / select)
*
*	@precisions
*	For radio inputs, only ONE should have the "requiredClass".
*	You want only one errors for all the connected radios.
*
*	@author Stephen Bégay
*	@coauthor Benjamin Roch
*	@todo Customize callbacks and rules
*	@version 2013-08-15
*/


var Locomotive_Validate = function (opts) {

	/**
	*	{jQuery Object} Form this.obj
	*	Contains the form
	*/
	if (opts) {
		this.obj = opts.obj;
		this.settings = opts;
	}

	// Will contain invalid inputs.
	this.invalidInputs = Array();

	this.validate = function (opts) {
		if (!opts) {

		}
		// Fits the old API
		this.form = this.obj;

		// Required fields comes from the requiredClass setting
		var required_fields = this.form.find('.' + this.settings.requiredClass);
		var similar_fields = this.form.find('.' + this.settings.similarClass);
		var required_group_fields = this.form.find('.' + this.settings.requiredGroupClass);
		var regex_fields = this.form.find('.' + this.settings.regExpClass);

		this.form.find('.error').removeClass('error');
		// Scoping
		var that = this;

		// Error var
		var no_error = true;

		var first_input = true;
		// Looping the inputs.

		required_fields.each(function (i, e) {
			var tmp = that.validate_input($(this));
			no_error = no_error && !tmp;

			if (!no_error && first_input) {
				first_input = false;
				that.settings.onFirstError($(this), "First Error");
			}
		});

		similar_fields.each(function (i, e) {
			var tmp = that.validate_input($(this), 'similar');
			no_error = no_error && !tmp;

			if (!no_error && first_input) {
				first_input = false;
				that.settings.onFirstError($(this), "First Error");
			}
		});

		var group_fields_success;
		required_group_fields.each(function (i, e) {
			var _this = $(this);
			var datas = _this.data();
			var tmp = that.validate_input($(this), 'required-group', datas);
			no_error = no_error && !tmp;
			if (!no_error && first_input) {
				first_input = false;
				that.settings.onFirstError($(this), "First Error");
			}
		});

		regex_fields.each(function (i, e) {
			// var tmp = that.validate_input($(this));
			var _this = $(this);
			var datas = _this.data();
			var tmp = that.validate_input($(this), 'regex', datas);
			no_error = no_error && !tmp;
			if (!no_error && first_input) {
				first_input = false;
				that.settings.onFirstError($(this), "First Error");
			}
		});

		if (typeof this.settings.custom_validation == 'function') {
			var tmp = this.settings.custom_validation(this);
			// @todo CHANGE LOGIC
			// In this one we need a "TRUE" response instead of FALSE
			no_error = no_error && tmp;
			if (!no_error && first_input) {
				first_input = false;
				that.settings.onFirstError(false, "Custom Error");
			}
		}


		// If there's an error, heres the callback
		// @todo create an Error object.
		if (!no_error) {
			this.settings.invalid(this.obj);
		} else {
			this.settings.valid(this.obj);
		}
	};

	this.validate_input = function (input, rule, options) {
		if (!rule) {
			rule = "required";
		};
		var $this = input;
		// Scoping
		var that = this;
		var datas = $this.data();

		if (typeof datas.regexp != 'undefined') {
			rule = "regexp";
		}

		if (rule == "regexp") {
			if (!this.matchRegExp($this, datas)) {
				return that.error($this, 'regex_err');
			}
			return that.success($this, 'ok');
		}

		if (rule == "required") {
			// Tagname, type and other necessary stuff
			var tagName = $this.prop("tagName");
			var type = $this.attr('type');
			var name = $this.attr('name');



			//are we talking about inputs because it might be a select
			if (tagName == "INPUT") {
				//is it a text input?
				if (type == 'text' || type == 'password' || type == 'phone' || type == 'tel') {
					if (this.isEmpty($this)) {
						return that.error($this, 'empty');
					}
					return that.success($this, 'ok');
				}
				//is it a radio input?
				if (type == 'radio') {
					// Gets similar radio button (same name)
					// @todo we wanna interact with ALL radios or one at a time?
					var $allradios = this.obj.find('input[name=' + name + ']');
					if (this.isRadioEmpty($allradios)) {
						return that.error($allradios, 'empty');
					}
					return that.success($allradios, 'ok');
				}
				//is it a radio input?
				if (type == 'checkbox') {
					if (!this.isChecked($this)) {
						return that.error($this, 'empty');
					}
					return that.success($this, 'ok');
				}

				//validating emails
				if (type == 'email') {
					if (!this.isValidEmail($this)) {
						return that.error($this, 'invalid_mail');
					}
					return that.success($this, 'ok');
				}
			}

			//validating textarea
			if (tagName == "TEXTAREA") {
				if (this.isEmpty($this)) {
					return that.error($this, 'empty');
				}
				return that.success($this, 'ok');
			}

			//are we talking about selects because it might be an input
			if (tagName == "SELECT") {
				//the first option of the list should not have a value...
				if (this.isSelectEmpty($this)) {
					return that.error($this, 'unselected');
				}
				return that.success($this, 'ok');
			}
		}

		if (rule == "similar") {
			if ($this.attr("data-related")) {
				var related = $this.attr("data-related");
				var related_inputs = this.form.find("[name=" + related + "]");
				if (this.isDifferent([$this, related_inputs])) {
					return that.error(related_inputs, 'similar', $this);
				}
				return that.success(related_inputs, 'Similar');
			};
			return that.success($this, "no-related-elements");
		};

		if (rule == "required-group" && options) {
			var isMultiple = false;
			var fields;
			if (options.required.indexOf('[]') > 0) {
				isMultiple = true;
				fields = options.required.substr(0, options.required.indexOf('[]'));
			} else {
				fields = options.required.replace(' ', '').split(',');
			}

			var atLeastOne = false;
			var fields_array = Array();

			var elems = isMultiple ? that.form.find('[name^=' + fields + ']') : '';

			if (elems.length) {

				elems.each(function (i, e) {
					var el = $(this);
					if (el.length) {
						fields_array.push(el);
					}
					// stop the loop if you got what you need.
					if (!atLeastOne) {
						if (el.length && !atLeastOne) {
							var tmp = !that.isEmptySmart(el);
							atLeastOne = !!tmp;
						}
					}
				});

			} else {

				for (var i = 0; i < fields.length; i++) {
					var el = that.form.find('[name=' + fields[i] + ']');
					if (el.length) {
						fields_array.push(el);
					}
					// stop the loop if you got what you need.
					if (atLeastOne) {
						continue;
					}
					if (el.length && !atLeastOne) {
						var tmp = !that.isEmptySmart(el);
						atLeastOne = !!tmp;
					}
				}

			}

			if (!atLeastOne) {
				// return error on THIS being the container DIV with the DATAS
				//  rule required_group
				// Concerned fields.
				return that.error($this, 'required_group', fields_array);
			}
			return that.success($this, 'required_group', fields_array);

		}
	}

	this.error = function (elem, code, related_elems) {
		// Error callback
		this.settings.onError(elem, code, related_elems);
		return true;
	};

	this.success = function (elem, code, related_elems) {
		// Success callback
		this.settings.onSuccess(elem, code, related_elems);
		return false;
	};

	this.listeners = function () {
		// We might wanna add custom listeners like "focus, blur, click, etc"
	}


	/**
	*	Behaviors
	*	These will help validate.
	*	Note that you can you these as STATIC function like this:
	*
	*	new Locomotive_Validate().isEmpty($('input'))
	*
	*	All the following functions apply to only one element.
	*	In any other case, you should use the jQuery instanciation
	*
	*/
	this.isEmptySmart = function (elem) {
		var $this = elem;
		var that = this;

		var tagName = $this.prop("tagName");
		var type = $this.attr('type');
		var name = $this.attr('name');

		if (tagName == "INPUT") {
			if (type == 'text' || type == 'password') {
				return this.isEmpty($this)
			}

			if (type == 'radio') {
				var $allradios = this.obj.find('input[name=' + name + ']');
				return this.isRadioEmpty($allradios);
			}

			if (type == 'checkbox') {
				return !this.isChecked($this);
			}

			//validating emails
			if (type == 'email') {
				return !this.isValidEmail($this);
			}
		}

		//validating textarea
		if (tagName == "TEXTAREA") {
			return this.isEmpty($this);
		}
		if (tagName == "SELECT") {
			return this.isSelectEmpty($this);
		}
	}

	// Check if val == '';
	this.isEmpty = function (elem) {
		return (elem.val() == '' || !elem.val() || elem.val() == '-1');
	}

	// Email validation
	this.isValidEmail = function (elem) {
		//regex for validating email
		//accepts + in gmail
		var pattern = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i;
		return (pattern.test(elem.val()));
	}

	// Check if all options are ''
	this.isSelectEmpty = function (elem) {
		return (this.isEmpty(elem.find("option:selected")));
	}

	this.isChecked = function (elem) {
		return elem.is(':checked');
	}
	// Check if all radio buttons are unselected
	this.isRadioEmpty = function (elem) {

		var radioError = true;

		elem.each(function () {

			var $this = $(this);
			if ($(this).is(":checked")) {
				radioError = false;
			}

		});

		return radioError;
	}

	/**
	*	Check regEx rules
	*/
	this.matchRegExp = function (elem, data) {
		var datas = data;
		var testedValue = this.get_value(elem);
		var modifiers = 'gi';
		if (typeof datas['modifiers'] != 'undefined') {
			modifiers = datas['modifiers'];
		}
		var regex = new RegExp(data.regexp, modifiers);

		return regex.test(testedValue);
	}


	/** Can only be an array
	* @param [array] aElem
	* @return {boolean} [true if all the object are the same]
	*/
	this.isDifferent = function (aElem) {
		var sameError = false;
		var sameValueFound = "";
		var that = this;

		for (var i = 0; i < aElem.length; i++) {
			// aElem.each(function(i,e){
			if (i == 0) {
				sameValueFound = that.get_value(aElem[i]);
				// sameValueFound = that.get_value($(this));
				// return true;
				continue;
			}
			if (sameValueFound != that.get_value(aElem[i])) {
				// if (sameValueFound != that.get_value($(this))) {
				sameError = true;
			};

		}
		// });

		return sameError;
	}

	/**
	*
	*/
	this.get_value = function (elem) {
		var $this = elem;
		var tagName = $this.prop("tagName");
		var type = $this.attr('type');
		var name = $this.attr('name');


		//are we talking about inputs because it might be a select
		if (tagName == "INPUT") {
			//is it a text input?
			if (type == 'text' || type == 'email' || type == 'password' || type == 'tel') {
				return $this.val();
			}
			if (type == 'checkbox') {
				return $this.is(':checked') ? $this.val() : '';
			}
			//is it a radio input?
			if (type == 'radio') {
				var $allradios = this.obj.find('input[name=' + name + ']');

				$allradios.each(function (i, e) {
					if ($(this).is(":checked")) {
						return $this.val();
					};
				});
				return "";
			}

		}
		//validating textarea
		if (tagName == "TEXTAREA") {
			return $this.val();
		}
		//are we talking about selects because it might be an input
		if (tagName == "SELECT") {
			return $this.find("option:selected").val();
		}

	}
};
// Generated by CoffeeScript 1.6.2
/*!
jQuery Waypoints - v2.0.5
Copyright (c) 2011-2014 Caleb Troughton
Licensed under the MIT license.
https://github.com/imakewebthings/jquery-waypoints/blob/master/licenses.txt
*/
(function () { var t = [].indexOf || function (t) { for (var e = 0, n = this.length; e < n; e++) { if (e in this && this[e] === t) return e } return -1 }, e = [].slice; (function (t, e) { if (typeof define === "function" && define.amd) { return define("waypoints", ["jquery"], function (n) { return e(n, t) }) } else { return e(t.jQuery, t) } })(window, function (n, r) { var i, o, l, s, f, u, c, a, h, d, p, y, v, w, g, m; i = n(r); a = t.call(r, "ontouchstart") >= 0; s = { horizontal: {}, vertical: {} }; f = 1; c = {}; u = "waypoints-context-id"; p = "resize.waypoints"; y = "scroll.waypoints"; v = 1; w = "waypoints-waypoint-ids"; g = "waypoint"; m = "waypoints"; o = function () { function t(t) { var e = this; this.$element = t; this.element = t[0]; this.didResize = false; this.didScroll = false; this.id = "context" + f++; this.oldScroll = { x: t.scrollLeft(), y: t.scrollTop() }; this.waypoints = { horizontal: {}, vertical: {} }; this.element[u] = this.id; c[this.id] = this; t.bind(y, function () { var t; if (!(e.didScroll || a)) { e.didScroll = true; t = function () { e.doScroll(); return e.didScroll = false }; return r.setTimeout(t, n[m].settings.scrollThrottle) } }); t.bind(p, function () { var t; if (!e.didResize) { e.didResize = true; t = function () { n[m]("refresh"); return e.didResize = false }; return r.setTimeout(t, n[m].settings.resizeThrottle) } }) } t.prototype.doScroll = function () { var t, e = this; t = { horizontal: { newScroll: this.$element.scrollLeft(), oldScroll: this.oldScroll.x, forward: "right", backward: "left" }, vertical: { newScroll: this.$element.scrollTop(), oldScroll: this.oldScroll.y, forward: "down", backward: "up" } }; if (a && (!t.vertical.oldScroll || !t.vertical.newScroll)) { n[m]("refresh") } n.each(t, function (t, r) { var i, o, l; l = []; o = r.newScroll > r.oldScroll; i = o ? r.forward : r.backward; n.each(e.waypoints[t], function (t, e) { var n, i; if (r.oldScroll < (n = e.offset) && n <= r.newScroll) { return l.push(e) } else if (r.newScroll < (i = e.offset) && i <= r.oldScroll) { return l.push(e) } }); l.sort(function (t, e) { return t.offset - e.offset }); if (!o) { l.reverse() } return n.each(l, function (t, e) { if (e.options.continuous || t === l.length - 1) { return e.trigger([i]) } }) }); return this.oldScroll = { x: t.horizontal.newScroll, y: t.vertical.newScroll } }; t.prototype.refresh = function () { var t, e, r, i = this; r = n.isWindow(this.element); e = this.$element.offset(); this.doScroll(); t = { horizontal: { contextOffset: r ? 0 : e.left, contextScroll: r ? 0 : this.oldScroll.x, contextDimension: this.$element.width(), oldScroll: this.oldScroll.x, forward: "right", backward: "left", offsetProp: "left" }, vertical: { contextOffset: r ? 0 : e.top, contextScroll: r ? 0 : this.oldScroll.y, contextDimension: r ? n[m]("viewportHeight") : this.$element.height(), oldScroll: this.oldScroll.y, forward: "down", backward: "up", offsetProp: "top" } }; return n.each(t, function (t, e) { return n.each(i.waypoints[t], function (t, r) { var i, o, l, s, f; i = r.options.offset; l = r.offset; o = n.isWindow(r.element) ? 0 : r.$element.offset()[e.offsetProp]; if (n.isFunction(i)) { i = i.apply(r.element) } else if (typeof i === "string") { i = parseFloat(i); if (r.options.offset.indexOf("%") > -1) { i = Math.ceil(e.contextDimension * i / 100) } } r.offset = o - e.contextOffset + e.contextScroll - i; if (r.options.onlyOnScroll && l != null || !r.enabled) { return } if (l !== null && l < (s = e.oldScroll) && s <= r.offset) { return r.trigger([e.backward]) } else if (l !== null && l > (f = e.oldScroll) && f >= r.offset) { return r.trigger([e.forward]) } else if (l === null && e.oldScroll >= r.offset) { return r.trigger([e.forward]) } }) }) }; t.prototype.checkEmpty = function () { if (n.isEmptyObject(this.waypoints.horizontal) && n.isEmptyObject(this.waypoints.vertical)) { this.$element.unbind([p, y].join(" ")); return delete c[this.id] } }; return t }(); l = function () { function t(t, e, r) { var i, o; if (r.offset === "bottom-in-view") { r.offset = function () { var t; t = n[m]("viewportHeight"); if (!n.isWindow(e.element)) { t = e.$element.height() } return t - n(this).outerHeight() } } this.$element = t; this.element = t[0]; this.axis = r.horizontal ? "horizontal" : "vertical"; this.callback = r.handler; this.context = e; this.enabled = r.enabled; this.id = "waypoints" + v++; this.offset = null; this.options = r; e.waypoints[this.axis][this.id] = this; s[this.axis][this.id] = this; i = (o = this.element[w]) != null ? o : []; i.push(this.id); this.element[w] = i } t.prototype.trigger = function (t) { if (!this.enabled) { return } if (this.callback != null) { this.callback.apply(this.element, t) } if (this.options.triggerOnce) { return this.destroy() } }; t.prototype.disable = function () { return this.enabled = false }; t.prototype.enable = function () { this.context.refresh(); return this.enabled = true }; t.prototype.destroy = function () { delete s[this.axis][this.id]; delete this.context.waypoints[this.axis][this.id]; return this.context.checkEmpty() }; t.getWaypointsByElement = function (t) { var e, r; r = t[w]; if (!r) { return [] } e = n.extend({}, s.horizontal, s.vertical); return n.map(r, function (t) { return e[t] }) }; return t }(); d = { init: function (t, e) { var r; e = n.extend({}, n.fn[g].defaults, e); if ((r = e.handler) == null) { e.handler = t } this.each(function () { var t, r, i, s; t = n(this); i = (s = e.context) != null ? s : n.fn[g].defaults.context; if (!n.isWindow(i)) { i = t.closest(i) } i = n(i); r = c[i[0][u]]; if (!r) { r = new o(i) } return new l(t, r, e) }); n[m]("refresh"); return this }, disable: function () { return d._invoke.call(this, "disable") }, enable: function () { return d._invoke.call(this, "enable") }, destroy: function () { return d._invoke.call(this, "destroy") }, prev: function (t, e) { return d._traverse.call(this, t, e, function (t, e, n) { if (e > 0) { return t.push(n[e - 1]) } }) }, next: function (t, e) { return d._traverse.call(this, t, e, function (t, e, n) { if (e < n.length - 1) { return t.push(n[e + 1]) } }) }, _traverse: function (t, e, i) { var o, l; if (t == null) { t = "vertical" } if (e == null) { e = r } l = h.aggregate(e); o = []; this.each(function () { var e; e = n.inArray(this, l[t]); return i(o, e, l[t]) }); return this.pushStack(o) }, _invoke: function (t) { this.each(function () { var e; e = l.getWaypointsByElement(this); return n.each(e, function (e, n) { n[t](); return true }) }); return this } }; n.fn[g] = function () { var t, r; r = arguments[0], t = 2 <= arguments.length ? e.call(arguments, 1) : []; if (d[r]) { return d[r].apply(this, t) } else if (n.isFunction(r)) { return d.init.apply(this, arguments) } else if (n.isPlainObject(r)) { return d.init.apply(this, [null, r]) } else if (!r) { return n.error("jQuery Waypoints needs a callback function or handler option.") } else { return n.error("The " + r + " method does not exist in jQuery Waypoints.") } }; n.fn[g].defaults = { context: r, continuous: true, enabled: true, horizontal: false, offset: 0, triggerOnce: false }; h = { refresh: function () { return n.each(c, function (t, e) { return e.refresh() }) }, viewportHeight: function () { var t; return (t = r.innerHeight) != null ? t : i.height() }, aggregate: function (t) { var e, r, i; e = s; if (t) { e = (i = c[n(t)[0][u]]) != null ? i.waypoints : void 0 } if (!e) { return [] } r = { horizontal: [], vertical: [] }; n.each(r, function (t, i) { n.each(e[t], function (t, e) { return i.push(e) }); i.sort(function (t, e) { return t.offset - e.offset }); r[t] = n.map(i, function (t) { return t.element }); return r[t] = n.unique(r[t]) }); return r }, above: function (t) { if (t == null) { t = r } return h._filter(t, "vertical", function (t, e) { return e.offset <= t.oldScroll.y }) }, below: function (t) { if (t == null) { t = r } return h._filter(t, "vertical", function (t, e) { return e.offset > t.oldScroll.y }) }, left: function (t) { if (t == null) { t = r } return h._filter(t, "horizontal", function (t, e) { return e.offset <= t.oldScroll.x }) }, right: function (t) { if (t == null) { t = r } return h._filter(t, "horizontal", function (t, e) { return e.offset > t.oldScroll.x }) }, enable: function () { return h._invoke("enable") }, disable: function () { return h._invoke("disable") }, destroy: function () { return h._invoke("destroy") }, extendFn: function (t, e) { return d[t] = e }, _invoke: function (t) { var e; e = n.extend({}, s.vertical, s.horizontal); return n.each(e, function (e, n) { n[t](); return true }) }, _filter: function (t, e, r) { var i, o; i = c[n(t)[0][u]]; if (!i) { return [] } o = []; n.each(i.waypoints[e], function (t, e) { if (r(i, e)) { return o.push(e) } }); o.sort(function (t, e) { return t.offset - e.offset }); return n.map(o, function (t) { return t.element }) } }; n[m] = function () { var t, n; n = arguments[0], t = 2 <= arguments.length ? e.call(arguments, 1) : []; if (h[n]) { return h[n].apply(null, t) } else { return h.aggregate.call(null, n) } }; n[m].settings = { resizeThrottle: 100, scrollThrottle: 30 }; return i.on("load.waypoints", function () { return n[m]("refresh") }) }) }).call(this);
// function parallax(parallaxArray) {
// 	var $window = $(window);

// 	var iOS = (navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false);

// 	if ($window.width() > 768 && iOS == false) {
// 		var parallaxItems = parallaxArray;

// 		var scrolling = false;

// 		var windowHeight = $window.height();

// 		window.requestAnimFrame = (function () {
// 			return window.requestAnimationFrame ||
// 				window.webkitRequestAnimationFrame ||
// 				window.mozRequestAnimationFrame ||
// 				window.oRequestAnimationFrame ||
// 				window.msRequestAnimationFrame ||
// 				function (callback) {
// 					window.setTimeout(callback, 1000 / 60);
// 				};
// 		})();

// 		//
// 		// Called when a scroll is detected
// 		//
// 		function onScroll() {
// 			scrolling = true;
// 		}

// 		//
// 		// A performant way to shift our image up or down
// 		//
// 		function animateItem() {
// 			// adjust the image's position when scrolling
// 			if (scrolling) {
// 				for (var i = 0; i < parallaxItems.length; i++) {
// 					var item = parallaxItems[i];
// 					var itemOffset = item.offset;
// 					var itemHeight = item.height;

// 					var windowTop = $window.scrollTop();
// 					var windowBot = windowTop + windowHeight;

// 					if (item.fold) {
// 						var scrolled = windowTop;
// 					} else {
// 						var scrolled = windowBot - itemOffset;
// 					}

// 					if (windowBot > itemOffset && windowTop < itemHeight) {
// 						if (scrolled < 0) {
// 							scrolled = 0;
// 						}

// 						var parallaxItem = document.querySelector(item.item);
// 						var yPosition = -1 * scrolled / item.speed;
// 						prefix(parallaxItem.style, "Transform", "translate3d(0px" + ", " + -yPosition + "px" + ", 0)");
// 					};

// 				};

// 				scrolling = false;
// 			}

// 			requestAnimFrame(animateItem);
// 		}

// 		function setup() {
// 			window.addEventListener("scroll", onScroll, false);

// 			for (var i = 0; i < parallaxItems.length; i++) {
// 				var item = parallaxItems[i];
// 				var itemContainer = $(item.container);
// 				var itemOffset = itemContainer.offset().top;
// 				var itemHeight = itemContainer.outerHeight() + itemOffset;

// 				if (itemOffset == 0) {
// 					var itemFold = true;
// 				} else {
// 					var itemFold = false;
// 				}

// 				item.offset = itemOffset;
// 				item.height = itemHeight;
// 				item.fold = itemFold;
// 			};

// 			animateItem();
// 		}
// 		setup();

// 		//
// 		// Cross-browser way to get the current scroll position
// 		//
// 		function getScrollPosition() {
// 			if (document.documentElement.scrollTop == 0) {
// 				return document.body.scrollTop;
// 			} else {
// 				return document.documentElement.scrollTop;
// 			}
// 		}

// 		// Prefix
// 		function prefix(obj, prop, value) {
// 			var prefs = ['webkit', 'Moz', 'o', 'ms'];
// 			for (var pref in prefs) {
// 				obj[prefs[pref] + prop] = value;
// 			}
// 		}


// 	}
// };

$(document).ready(function () {
	// Common validation settings for both the contat form and the newsletter form
	$(".contact-form, .newsletter-form").lvalidate({
		onError: function (elem, code) {
			elem.parents(".contact-form__labelwrap").addClass('contact-form--error');
		},
		onSuccess: function (elem, code) {
			elem.parents(".contact-form__labelwrap").removeClass('contact-form--error');
		},
		valid: function (form) {
			// All ok? Then submit the form!
			// Or send by ajax, whatever
			form.submit();
		}
	});

	// @todo Document me
	$(".overlay__x, .overlay .button").on('click', function (event) {
		event.preventDefault();
		/* Act on the event */
		$(".overlay").removeClass('overlay--open');

	});
});
$(document).ready(function () {

	//script from css tricks
	//http://css-tricks.com/snippets/jquery/smooth-scrolling/

	//not working with dynamic .height() <_<
	var offset = 180;
	if ($(window).width() < 1299) {
		offset = 170;
	}

	if ($(window).width() < 979) {
		offset = 159;
	}

	if ($(window).width() < 700) {
		offset = 120;
	}



	$('a[href*=#]:not([href=#])').on('click', function (event) {
		/*
			if($(this).hasClass('nav-submenu__link')) {
			  $(".site-wrap, .nav, html").removeClass('menu--opened');
		
			  offset+=100;
			}
		*/

		var target = $(this.hash);
		target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
		if (target.length) {
			$('html,body').animate({
				scrollTop: target.offset().top - offset
			}, 1000);
			return false;
		}

	});
});
$('.jumbotron').waypoint(function (direction) {

	if (direction == "down") {
		$(".header").addClass('header--filled');


		if ($("ul").hasClass('nav-fit')) {
			$(".submenu").addClass('submenu--fixed');
		};
	}
	else {
		$(".header").removeClass('header--filled');

		if ($("ul").hasClass('nav-fit')) {
			$(".submenu").removeClass('submenu--fixed');
		};

	}

}, {
	offset: function () {
		//le 100 est pour qu<en plus de height il active un peu plus tôt
		return -$(this).height() + $(".header").height() + 95;
	}
});





var offset = 190;
if ($(window).width() < 1299) {
	offset = 170;
}

if ($(window).width() < 979) {
	offset = 159;
}

if ($(window).width() < 700) {
	offset = 120;
}

var sections = $(".section");
var navigation_links = $(".nav-fit__item");

//init waypoint
sections.waypoint({
	offset: 240,
	handler: function (direction) {

		//a chaque fois que ca passe un section, cette section devient le active_section
		var active_section = $(this);
		var active_section_id = active_section.attr("id");
		var active_link = $('.nav-fit__item[href="#' + active_section_id + '"]');

		navigation_links.removeClass("nav-fit__item--active");

		active_link.addClass("nav-fit__item--active");

		if (direction == "up") {

			var previous = active_section.waypoint('prev');
			var id = previous.attr("id");

			var active_link = $('.nav-fit__item[href="#' + id + '"]');


			navigation_links.removeClass("nav-fit__item--active");
			active_link.addClass("nav-fit__item--active");

		}
	}

});


(function ($, sr) {

	// debouncing function from John Hann
	// http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
	var debounce = function (func, threshold, execAsap) {
		var timeout;

		return function debounced() {
			var obj = this, args = arguments;
			function delayed() {
				if (!execAsap)
					func.apply(obj, args);
				timeout = null;
			};

			if (timeout)
				clearTimeout(timeout);
			else if (execAsap)
				func.apply(obj, args);

			timeout = setTimeout(delayed, threshold || 100);
		};
	}
	// smartresize
	jQuery.fn[sr] = function (fn) { return fn ? this.bind('resize', debounce(fn)) : this.trigger(sr); };

})(jQuery, 'smartresize');


// usage:
$(window).smartresize(function () {
	if ($(window).width() > 700) {
		$(".site-wrap, .nav, html").removeClass('menu--opened');

		//remove nasty bug in chrome
		$(".nav-list").css('min-width', '434px');
	}
});





$(".submenu__title").on('click', function (event) {
	event.preventDefault();
	/* Act on the event */

	$(".submenu").toggleClass('submenu--open');
});


$(".nav-list__more").on('click', function (event) {
	event.preventDefault();

	/* Act on the event */
	$('.nav-list__item').removeClass('nav-list__item--opened');

	$(this).parents('.nav-list__item').addClass('nav-list__item--opened');


});

$(".nav-list__item--opened .nav-list__more").on('click', function (event) {
	event.preventDefault();
	/* Act on the event */
	$(this).parents('.nav-list__item').removeClass('nav-list__item--opened');

});

$(".nav-icon").on('click', function (event) {
	event.preventDefault();
	/* Act on the event */
	window.scrollTo(0, 0);
	$(".site-wrap, .nav, html").toggleClass('menu--opened');
});

$(".nav-fit__item").on('click', function (event) {
	event.preventDefault();
	/* Act on the event */

	$(".submenu").removeClass('submenu--open');
});


$(window).scroll(function () {
	var $this = $(this);
	var distance_scroll = $this.scrollTop();

	if (distance_scroll === 0) {
		$(".header").removeClass('header--filled');
	}

	else {
		$(".header").addClass('header--filled');
	}
});
if (!Modernizr.svg) {
	$('img[data-svg]').each(function (index, element) {

		var $this = $(this);
		var data_svg = $(this).attr('data-svg');

		$this.attr("src", $(this).attr("src").replace('.svg', '.' + data_svg));
	});
}


$('.slider').each(function () {
	var $this = $(this);
	var $group = $this.find('.slide_group');
	var $slides = $this.find('.slide');
	var bulletArray = [];
	var currentIndex = 0;
	var timeout;

	function move(newIndex) {
		var animateLeft, slideLeft;

		advance();

		if ($group.is(':animated') || currentIndex === newIndex) {
			return;
		}

		bulletArray[currentIndex].removeClass('active');
		bulletArray[newIndex].addClass('active');

		if (newIndex > currentIndex) {
			slideLeft = '100%';
			animateLeft = '-100%';
		} else {
			slideLeft = '-100%';
			animateLeft = '100%';
		}

		$slides.eq(newIndex).css({
			display: 'block',
			left: slideLeft
		});
		$group.animate({
			left: animateLeft
		}, function () {
			$slides.eq(currentIndex).css({
				display: 'none'
			});
			$slides.eq(newIndex).css({
				left: 0
			});
			$group.css({
				left: 0
			});
			currentIndex = newIndex;
		});
	}

	function advance() {
		clearTimeout(timeout);
		timeout = setTimeout(function () {
			if (currentIndex < ($slides.length - 1)) {
				move(currentIndex + 1);
			} else {
				move(0);
			}
		}, 4000);
	}

	$('.next_btn').on('click', function () {
		if (currentIndex < ($slides.length - 1)) {
			move(currentIndex + 1);
		} else {
			move(0);
		}
	});

	$('.previous_btn').on('click', function () {
		if (currentIndex !== 0) {
			move(currentIndex - 1);
		} else {
			move(3);
		}
	});

	$.each($slides, function (index) {
		var $button = $('<a class="slide_btn">&bull;</a>');

		if (index === currentIndex) {
			$button.addClass('active');
		}
		$button.on('click', function () {
			move(index);
		}).appendTo('.slide_buttons');
		bulletArray.push($button);
	});

	advance();
});

$('.responsive').slick({
	infinite: true,
	autoplay: true,
	loop: true,
	speed: 600,
	slidesToShow: 3,
	slidesToScroll: 1,
	prevArrow: true,
	nextArrow: true,
	responsive: [
		{
			breakpoint: 1024,
			settings: {
				slidesToShow: 2,
				slidesToScroll: 2,
				infinite: true,
			}
		},
		{
			breakpoint: 600,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1
			}
		},
		{
			breakpoint: 480,
			settings: {
				slidesToShow: 1,
				slidesToScroll: 1
			}
		}
		// You can unslick at a given breakpoint now by adding:
		// settings: "unslick"
		// instead of a settings object
	]
});











