(function() {
"use strict";

window.Tranjsform = function() {};

Tranjsform.Builder = function(template, tss, data) {

	this.template = new Tranjsform.Template('<template>' + template + '</template>');
	this.tss = new Tranjsform.Sheet(tss);
	this.data = new Tranjsform.DataFunction(data);
	this.registeredProperties = [];

	this.output = function(string) {
		var rules = this.tss.parse();

		for (var i = 0; i < rules.length; i++) {
			var pseudoMatcher = new Tranjsform.PseudoMatcher(rules[i].pseudo, this.data);
			var hook = new Tranjsform.Hook(rules[i].rules, pseudoMatcher, this.data);

			for (var name in this.registeredProperties) {
				hook.registerProperty(name, this.registeredProperties[name]);				
			}

			this.template.addHook(rules[i].query, hook);
		}

		return this.template.output();
	};

	this.registerProperty = function(name, closure) {
		this.registeredProperties[name] = closure;
	};

	var basicProperties = new Tranjsform.BasicProperties(this.data);
	//some way to do this without the closures? .bind? .call?
	this.registerProperty('content', function(value, element, rule) { return basicProperties.content(value, element, rule); });
	this.registerProperty('repeat', function(value, element, rule) { return basicProperties.repeat(value, element, rule); });
	this.registerProperty('display', function(value, element, rule) { return basicProperties.display(value, element, rule); });
};

Tranjsform.Template = function(xml) {
	this.hooks = [];

	var parser = new DOMParser();
	this.document = parser.parseFromString(xml, "text/xml");

	this.addHook = function(xpath, hook) {
		this.hooks.push({'xpath': xpath, 'hook': hook});
	};

	this.processHook = function(query, hook) {
		var xpath = this.selectXPath(query, this.document);

		var el;
		var elements = [];

		while (el = xpath.next()) elements.push(el);

		for (var i = 0; i < elements.length; i++) hook.run(elements[i]);
	};

	this.output = function() {
		for (var i = 0; i < this.hooks.length; i++) this.processHook(this.hooks[i].xpath, this.hooks[i].hook);
		return this.document.documentElement.innerHTML;
	};

	//http://www.ahristov.com/tutorial/javascript-tips/Browser%2Bindependant%2BXPath%2Bevaluation.html
	this.selectXPath = function(expr, node) {
	  if (document.evaluate) {
	    return {
	      list : node.evaluate(expr,node,null,XPathResult.ANY_TYPE,null),
	      next : function() { 
	        return this.list.iterateNext()
	      }
	    }
	  } else {
	    return {
	      list: node.selectNodes(expr),
	      i : 0,
	      next: function() {
	        if (this.i > this.list.length)
	          return null;
	        return this.list[this.i++];
	      }
	    }
	  }

	};
};

Tranjsform.Sheet = function(tss) {
	this.tss = tss;

	this.parse = function() {
		var tss = this.tss;
		var rules = [];
		var pos = 0;
		var next = 0;

		while ((next = tss.indexOf('{', pos)) > -1) {
			var rule = [];
			var selector = tss.substring(pos, next).trim();
			var x = new Tranjsform.CssToXpath(selector);

			rule.query = x.getXpath();
			rule.pseudo = x.getPseudo();

			pos = tss.indexOf('}', next)+1;
			rule.rules = this.getRules(tss.substring(next+1, pos-1).trim());

			rules.push(rule);
		}
		return rules;
	};


	this.getRules = function(str) {
		var rules = str.split(';');
		var ret = [];

		for (var i = 0; i < rules.length; i++) {

			if (rules[i].trim() == '') continue;
			//!!
			var parts = rules[i].split(':', 2)

			ret[parts[0].trim()] = parts[1];
		}

		return ret;
	};
};


Tranjsform.CssToXpath = function(css) {

	this.css = css.replace(' >', '>').replace('> ', '>').trim();

	this.specialChars = [' ', '.', '>', '~', '#', ':', '[', ']'];

	this.translators = {
		' ': function(string) { 	return '//' + string;	},
		'': function(string) { return '/' + string;	},
		'>': function(string) { return '/' + string; },
		'#':  function(string) { return '[@id=\'' + string + '\']'; },
		'.': function(string) { return '[contains(concat(\' \', normalize-space(@class), \' \'), \' ' + string + ' \')]'; }, 
		'[': function(string) { return '[@' + string + ']';	},
		']': function() {	return ''; }
	};


	this.createSelector = function() {
		var selector = {
			type: '',
			string: ''
		};

		return selector;
	};

	//split the css into individual functions
	this.split = function(css) {
		var selectors = [];
		var selector = this.createSelector();
		selectors.push(selector);

		for (var i = 0; i < css.length; i++) {
			var chr = css.charAt(i);
			if (this.specialChars.indexOf(chr) > -1)  {
				selector = this.createSelector();
				selector.type = chr;
				selectors.push(selector);
			}
			else selector.string += chr;
		}

		return selectors;
	};

	this.getXpath = function() {
		var css = this.css.split(':')[0];
		var selectors = this.split(css);
		var xpath = '/';

		for (var i = 0; i < selectors.length; i++) {
			if (this.translators[selectors[i].type]) {
				xpath += this.translators[selectors[i].type](selectors[i].string);
			}
		}

		return xpath.replace('/[', '/*[');
	};

	this.getPseudo = function() {
		var parts = this.css.split(':');
		parts.shift();
		return parts;
	};

};


Tranjsform.Hook = function(rules, pseudoMatcher, dataFunction) {
	this.rules = rules;
	this.pseudoMatcher = pseudoMatcher;
	this.dataFunction = dataFunction;
	this.properties = [];

	this.run = function(element) {
		if (!this.pseudoMatcher.matches(element)) return;

		for (var name in this.rules) {
			var result = this.callProperty(name, element, this.parseValue(this.rules[name].trim(), element));
			if (result === false) return;
		}
	};

	this.callProperty = function(name, element, value) {
		if (this.properties[name]) {
			return this.properties[name](value, element, this);
		}
	};

	this.registerProperty = function(name, closure) {
		this.properties[name] = closure;
	};


	this.parseValue = function(func, element) {
		var result = [];
		var chr = func.charAt(0);

		if (chr == '\'' || chr == '"') {
			var finalPos = this.findMatchingPos(func, chr);
			result.push(this.extractQuotedString(chr, func));
		}
		else {
			var fn = this.parseFunction(func);
			var finalPos = fn['endPoint'];

			if (this.dataFunction[fn['name']]) {
				var data = this.dataFunction[fn['name']](fn['params'], element);

				if (typeof data === 'string') result.push(data);
				else result = result.concat(data);
			}
			else result.push(func.trim());
		}


		var remaining = func.substring(finalPos+1).trim();
		return this.parseNextValue(remaining, result, element);
	};

	this.parseNextValue = function(remaining, result, element) {		
		if (remaining.length > 0 && remaining.charAt(0) == ',') {
			var next = this.parseValue(remaining.substring(1).trim(), element);
			result = result.concat(next);
		}
		return result;
	};

	this.findMatchingPos = function(str, chr, start, escape) {
		if (!start) start = 0;
		var pos = start + 1;
		var i = 0;
		while (true) {
			var end = str.indexOf(chr, pos+1);
			if (str.charAt(end-1) === escape) pos = end+1;
			else return end;
		}
	};

	this.extractQuotedString = function(marker, str) {
		var finalPos = this.findMatchingPos(str, marker, 0, '\\');
		var string = str.substring(1, finalPos);

		return string.replace('\\' + marker, marker);
	};

	this.parseFunction = function(func) {
		var open = func.indexOf('(');
		var close = func.indexOf(')', open);

		var name = func.substring(0, open);

		var params = func.substring(open+1, close);

		return {'name': name, 'params': params, 'endPoint': close};
	};
};

Tranjsform.BasicProperties = function(data) {
	this.data = data;

	this.content = function(value, element, rule) {
		var attr
		if (attr = rule.pseudoMatcher.attr()) element.setAttribute(attr, value);
		else if (rule.pseudoMatcher.pseudo.indexOf('before') > -1) element.firstChild.nodeValue = value.join('') + element.firstChild.nodeValue;
		else if (rule.pseudoMatcher.pseudo.indexOf('after') > - 1) element.firstChild.nodeValue += value.join('');
		else element.firstChild.nodeValue = value.join('');
	};

	this.repeat = function(value, element, rule) {
		for (var i = 0; i < value.length; i++) {
			var clone = element.cloneNode(true);

			this.data.bind(clone, value[i]);

			element.parentNode.insertBefore(clone, element);

			//clone the rules array
			var newRules = {};
			for (var name in rule.rules) newRules[name] = rule.rules[name];
			//Don't run repeat on the clones element or it will loop forever
			delete newRules['repeat'];

			var hook = new Tranjsform.Hook(newRules, rule.pseudoMatcher, this.data);
			for (var name in rule.properties) hook.registerProperty(name, rule.properties[name]);

			hook.run(clone);
		}

		//Remove the original element so only the ones that have been looped over will show
		element.parentNode.removeChild(element);

		//don't run other hooks for this node
		return false;
	};

	this.display = function(value, element, rule) {
		if (value[0].toLowerCase() == 'none') element.parentNode.removeChild(element);
	};
};



Tranjsform.DataFunction = function(data) {
	this._data = data;

	this.bind  = function(element, value) {
		element.__tssData = value;
	};

	this.iteration = function(val, element) {
		var data = this.getData(element);
		return this.traverse(val, data);
	};

	this.getData = function(element) {
		while (element) {
			if (element.__tssData) return element.__tssData;
			element = element.parentNode;
		}
		return this._data;
	};

	this.data = function(val, element) {
		var data = this.getData(element);
		return this.traverse(val, data);
	};

	this.traverse = function(name, data) {
		var parts = name.split('.');
		var obj = data;

		for (var i = 0; i < parts.length; i++) {
			if (parts[i] == '') continue;
			obj = obj[parts[i]];
		}		

		return obj;
	};

	this.attr = function(val, element) {
		return element.getAttribute(val.trim());
	};
};


Tranjsform.PseudoMatcher = function(pseudo, dataFunction) {
	this.pseudo  = pseudo;
	this.dataFunction = dataFunction;

	this.matches = function(element) {
		var matches = true;

		for (var i = 0; i < this.pseudo.length; i++) {
			matches = matches && this.attribute(this.pseudo[i], element) && this.nth(this.pseudo[i], element);
		}

		return matches;
	};

	this.attribute = function(pseudo, element) {
		var pos = pseudo.indexOf('[');
		if (pos == -1) return true;

		var end = pseudo.indexOf(']', pos);
		var name = pseudo.substring(0, pos);
		var parts = pseudo.substring(pos+1, end).split('=');

		var value = parts[1];

		if (value.charAt(0) == '"') value = value.slice(1);
		if (value.charAt(value.length-1) == '"') value = value.substring(0, value.length -1);

		var lookupValue = this.dataFunction[name](parts[0], element);

		return !(lookupValue != value);
	};

	this.nth = function(pseudo, element) {
		if (pseudo.indexOf('nth-child') == 0) {
			var criteria = this.getBetween(pseudo, '(', ')');
			//Which child index is the current element?
			var num = Array.prototype.indexOf.call(element.parentNode.children, element)+1;


			if (this[criteria]) return this[criteria](num);
			else return num == criteria;

		}

		return true;
	};

	this.odd = function(num) {
		return num % 2 == 1;
	};

	this.even = function(num) {
		return num % 2 == 0;
	};

	this.getBetween = function(string, start, end) {
		var open = string.indexOf(start);
		if (open == -1) return false;

		var close = string.indexOf(end, open);
		return string.substring(open+1, close);
	};

	this.attr = function() {
		for (var i = 0; i < this.pseudo. length; i++ ) {
			if (this.pseudo[i].indexOf('attr') === 0) {
				return this.getBetween(this.pseudo[i], '(', ')').trim();
			}
		}

		return false;
	};
};
}());