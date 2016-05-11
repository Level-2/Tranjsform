(function() {
"use strict";

window.Tranjsform = function() {};


Tranjsform.Builder = function(template, tss, data) {

	this.template = template;
	this.tss = tss;
	this.cache = new Tranjsform.Cache;
	this.registeredProperties = [];
	this.formatters = [];
	this.locale = null;
	this.baseDir = '';
	this.time = null;

	this.setTime = function(time) {
		this.time = time;
	};

	this.output = function(data, document) {
		var locale = this.getLocale();
		var data = new Tranjsform.DataFunction(data, locale, this.baseDir);
		var headers = [];

		this.registerBasicProperties(data, locale, headers);

		var cachedOutput = this.loadTemplate();

		var template = new Tranjsform.Template(this.isValidDoc(cachedOutput.body) ? cachedOutput.body : '<template>' + cachedOutput.body + '</template>');

		var rules = this.getRules(template);
		for (var i = 0; i < rules.length; i++) {
			if (rules[i].shouldRun(this.time)) this.executeTssRule(rules[i], template, data);
		}

		var result = {'body': template.output(document), 'headers': cachedOutput.headers.concat(headers)};
		this.cache.write(this.template, result);

		result.body = this.doPostProcessing(template).output(document);
		return result;
	};

	this.registerBasicProperties = function(data, locale, headers) {
		var formatter = new Tranjsform.Hook.Formatter();
		formatter.register(new Tranjsform.Formatter.Number(locale));
		formatter.register(new Tranjsform.Formatter.Date(locale));
		formatter.register(new Tranjsform.Formatter.StringFormatter());

		for (var i in this.formatters) formatter.register(this.formatters[i]);

		this.registerProperty('content', new Tranjsform.Property.Content(data, headers, formatter));
		this.registerProperty('repeat', new Tranjsform.Property.Repeat(data));
		this.registerProperty('display', new Tranjsform.Property.Display());
		this.registerProperty('bind', new Tranjsform.Property.Bind(data));
	};


	this.doPostProcessing = function(template) {
		template.addHook('//*[@transphporm]', new Tranjsform.Hook.PostProcess());
		return template;
	};

	this.executeTssRule = function(rule, template, data) {
		rule.touch();
		var hook = new Tranjsform.Hook(rule.properties, new Tranjsform.PseudoMatcher(rule.pseudo, data), data);
		for (var name in this.registeredProperties) hook.registerProperty(name, this.registeredProperties[name]);
		template.addHook(rule.query, hook);
	};

	this.loadTemplate = function() {
		if (typeof this.template  == 'string' && this.template.trim().charAt(0) !== '<') {
			var xml = this.cache.load(this.template, new Date().getTime());
			return xml ? xml : {'body': this.fileGetContents(this.template), 'headers': []};
		}
		return {'body': this.template, 'headers': []};
	};


	this.getRules = function(template) {
		if (this.tss.trim().substr(this.tss.length-4).toLowerCase() == '.tss') {
			this.baseDir = this.tss.match(/.*\//);

			var key = this.tss + template.getPrefix() + this.baseDir;

			var rules = this.cache.load(key, new Date().getTime());

			if (!rules) return this.cache.write(key, new Tranjsform.Sheet(this.fileGetContents(this.tss), this.baseDir, template.getPrefix()).parse());

		}
		else return new Tranjsform.Sheet(this.tss, this.baseDir, template.getPrefix()).parse();
	};

	this.fileGetContents = function (url, timeout) {
		if (timeout == null) timeout = new Date().getTime() + (10 * 1000);

		var xhttp = new XMLHttpRequest();
		var loaded = false;
		var response = '';

		xhttp.onreadystatechange = function() {
			if (xhttp.readyState == 4 && xhttp.status == 200) {
				loaded = true;
				response = xhttp.responseText;
			}
		};
		xhttp.open('GET', url, true);
		xhttp.send();

		while (!loaded && new Date().getTime() < timeout) {}

		return response;
	};

	this.setCache = function(cache) {
		this.cache = new Tranjsform.Cache(cache);
	};

	this.getLocale = function() {
		if (typeof this.locale === 'string') return Tranjsform.Locale[this.locale];
		else if (this.locale === null) return Tranjsform.Locale['enGB'];
		else return this.locale
	};
	
	this.registerProperty = function(name, closure) {
		this.registeredProperties[name] = closure;
	};

	this.registerFormatter = function(formatter) {
		this.formatters.push(formatter);
	};

	this.isValidDoc = function(xml) {
		return typeof xml == 'object' || (xml.indexOf('<!') === 0 || xml.indexOf('<?') === 0);
	};
};

Tranjsform.Locale = function() {};





Tranjsform.Cache = function(obj) {
	if (!obj) this.obj = {};
	else this.obj = obj;


	this.write = function(key, content) {
		this.obj[key] = {'content': content, 'timestamp': new Date().getTime()};
		return content;
	};

	this.load = function(key, modified) {
		if (this.obj[key] && this.obj[key].timestamp >= modified) {
			return this.cache[key].content;
		}
		else return false;
	};
};


Tranjsform.Template = function(xml) {
	this.hooks = [];
	var parser = new DOMParser();
	this.prefix = null;

	if (typeof xml == 'string') this.document = parser.parseFromString(xml, "text/xml");
	else this.document = xml;
	
	//console.log(this.document.documentElement.innerHTML);
	if (this.document.documentElement.namespaceURI !== null) {
		this.prefix = this.document.documentElement.namespaceURI;
	}

	this.addHook = function(xpath, hook) {
		this.hooks.push({'xpath': xpath, 'hook': hook});
	};

	this.getPrefix = function() {
		return this.prefix;
	}

	this.processHooks = function() {
		for (var h in this.hooks) {
			var query = this.hooks[h]['xpath'];
			var hook = this.hooks[h]['hook'];
			var xpath = Tranjsform.Shim.selectXPath(query, this.document);
			var el;
			var elements = [];

			//Cache the matched elements because running the hook may alter the document
			while (el = xpath.next()) elements.push(el);

			for (var i = 0; i < elements.length; i++) {
				hook.run(elements[i]);
			}
		}

		this.hooks = [];		
	};

	this.output = function(document) {
		this.processHooks();

		if (document) return this.document;
		
		if (this.document.documentElement.tagName.toLowerCase() == 'template') return Tranjsform.Shim.innerHTML(this.document.documentElement);
		else return Tranjsform.Shim.outerHTML(this.document.documentElement);
	};
};

Tranjsform.Sheet = function(tss, baseDir, prefix) {
	this.tss = tss;
	this.baseDir = baseDir;
	this.prefix = prefix;

	this.parse = function(pos, rules) {
		if (!pos) pos = 0;
		if (!rules) rules = [];
		var next = 0;
		while ((next = this.tss.indexOf('{', pos)) > -1) {
			var processing = null;
			if (processing = this.processingInstructions(this.tss, pos, next)) {
				pos = processing['endPos']+1;
				for (var item in processing[rules]) {
					rules[item] = processing[rules][item];
  				}
  
			}
			
			var selector = tss.substring(pos, next).trim();
			var rule = this.CssToRule(selector, rules.length);
			pos = tss.indexOf('}', next)+1;

			rule.properties = this.getProperties(tss.substring(next+1, pos-1).trim());

			rules.push(rule);
		}
		return rules;
	};

	this.CssToRule = function(selector, index) {
		var xPath = new Tranjsform.CssToXpath(selector, this.prefix);
		var rule = new Tranjsform.Rule(xPath.getXpath(), xPath.getPseudo(), xPath.getDepth(), index++);
		return rule;
	};

	this.processingInstructions = function(tss, pos, next) {
		var rules = [];
		var atPos = -1;
		while ((atPos = tss.indexOf('@', 'pos')) !== -1) {
			if (atPos <= next) {
				var spacePos = this.tss.indexOf(' ', atPos);
				var funcName = this.tss.substring(atPos+1, spacePos-atPos-1);
				pos = this.tss.indexOf(';', spacePos);
				var args = this.tss.substring(spacePos+1, pos-spacePos-1);
				
				var result = this[funcName](args);
				for (var i in result) {
					rules[i] = result[i];
				}
			}
			else break;
		}
	};

	this.import = function(args) {;
		var builder = new Tranjsform.Builder;
		var sheet = new Sheet(builder.fileGetContents(this.baseDir . args.replace(new RegExp('^[\'"\s]+.*[\'"\s]+$'))), this.baseDir);
		return sheet.parse();
	};

	this.getProperties = function(str) {
		var stringExtractor = new Tranjsform.StringExtractor(str);

		var rules = str.split(';');
		var ret = [];

		for (var i = 0; i < rules.length; i++) {

			if (rules[i].trim() == '') continue;
			
			var parts = rules[i].split(':', 2)

			parts[1] = stringExtractor.rebuild(parts[1]);
			ret[parts[0].trim()] = parts[1] ? parts[1].trim() : '';
		}

		return ret;
	};
};

Tranjsform.Rule = function(query, pseudo, depth, index, properties) {
	this.query = query;
	this.pseudo = pseudo;
	this.depth = depth;
	this.index = index;
	this.properties = properties ? properties : [];
	this.lastRun = 0;

	this.S = 1000;
	this.M = 60;
	this.H = this.M * 60;
	this.D = this.H * 24;

	this.touch = function() {
		this.lastRun = new Date().getTime();
	};

	this.shouldRun = function(time) {
		if (this.properties['update-frequency'] && this.lastRun !== 0) {
			frequency = this.properties['update-frequency'];
			var stat = {'always': true, 'never': false};
			if (stat[frequency]) return stat[frequency];
			else return this.timeFrequency(frequency, time);
		}
		return true;
	};

	this.timeFrequency = function(frequency, time) {
		if (!time) time = new Date().getTime();

		var num = parseInt(frequency);
		var unit = frequency.replace(num.toString(), '').toUpperCase();

		var offset = num * this[unit];

		if (time > this.lastRun + offset) return true;
		else return false;
	};
};

Tranjsform.CssToXpath = function(css) {
	this.depth = 0;
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

		this.depth = selectors.length;

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

	this.getDepth = function() {
		return this.depth;
	};
};


Tranjsform.Hook = function(rules, pseudoMatcher, dataFunction, callback) {
	this.rules = rules;
	this.pseudoMatcher = pseudoMatcher;
	this.dataFunction = dataFunction;
	this.properties = [];
	this.callback = callback;

	this.run = function(element) {
		if (!this.pseudoMatcher.matches(element)) return;
		for (var name in this.rules) {
			var result = this.callProperty(name, element, this.parseValue(this.rules[name].trim(), element));
			if (result === false) break;
		}
	};

	this.callProperty = function(name, element, value) {
		if (this.properties[name]) {
			return this.properties[name].run(value, element, this);
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
				this.dataName = fn['params'];
				var self = this;
				var data = this.dataFunction[fn['name']](fn['params'], element, function() {
					self.run(element);
				});

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


Tranjsform.Hook.PostProcess = function() {
	this.run = function(element) {
		var transform = element.getAttribute('transphporm');

		if (transform == 'remove') element.parentNode.removeChild(element);
		else element.removeAttribute('transphporm');
	};
};


Tranjsform.Hook.Formatter = function() {
	this.formatters = [];

	this.register = function(formatter) {
		this.formatters.push(formatter);
	};

	this.format = function(value, rules) {
		if (!rules.format) return value;

		var format = new Tranjsform.StringExtractor(rules.format);
		var options = format.getString().split(' ');
		var functionName = options.shift();
		//CHECK
		for (var i = 0; i < options.length; i++) options[i] = format.rebuild(options[i]).replace(new RegExp('^[\'"]+.*[\'"]+$'));

		return this.processFormat(options, functionName, value);
	};

	this.processFormat = function(format, functionName, value) {
		for (var i in value) {
			for (var j in this.formatters) {
				if (this.formatters[j][functionName]) {
					if (format.length > 0) {
						var originalValue = value[i];
						value[i] = "";
						for (var k in format) {
							if (value[i] != "") { value[i] += " "; }
							value[i] += this.formatters[j][functionName](originalValue, format[k]);
						}
					} else {
						value[i] = this.formatters[j][functionName](value[i]);
					}
				}
			}
		}

		return value;
	};


};


Tranjsform.StringExtractor = function(str) {

	this.extractStrings = function(str) {
		var pos = 0;
		var num = 0;
		var strings = [];

		while ((pos = str.indexOf('"', pos+1)) !== -1) {
			var end = str.indexOf('"', pos+1);
			while (str.charAt[end-1] == '\\') end = str.indexOf('"', end+1);

			strings['$+STR' + ++num] = str.substring(pos, end-pos+1);
			str = str.replace(strings['$+STR' + num], '$+STR' + num);
		}

		return [str, strings];
	};

	this.rebuild = function(str) {
		for (var key in this.stringTable) {
			str = str.replace(key, this.stringTable[key]);
		}
		return str;
	};

	this.getString = function() {
		return this.str;
	}

	var parts = this.extractStrings(str);
	this.str = parts[0];
	this.stringTable = parts[1];

};

Tranjsform.Property = function() {};


Tranjsform.Property.Content = function(data, headers, formatter) {
	this.data = data;
	this.headers = headers;
	this.formatter = formatter;

	this.run = function(value, element, rule) {
		value = this.formatter.format(value, rule.rules);
		if (!this.processPseudo(value, element, rule)) {
			this.removeAllChildren(element);

			if (this.getContentMode(rule.rules) === 'replace') this.replaceContent(element, value);
			else this.appendContent(element, value);
		}
	};

	this.getContentMode = function(rules) {
		return rules['content-mode'] ? rules['content-mode'] : 'append';
	};

	this.processPseudo = function(value, element, rule) {
		return this.pseudoAttr(value, element, rule) || this.pseudoHeader(value, element, rule) || this.pseudoBefore(value, element, rule) || this.pseudoAfter(value, element, rule);
	};

	this.pseudoAttr = function(value, element, rule) {
		var attr = '';
		if (attr = rule.pseudoMatcher.attr()) {
			element.setAttribute(attr, value.join(''));
			return true;
		}
	};

	this.pseudoHeader = function(value, element, rule) {
		var header = '';
		if (header = rule.pseudoMatcher.header(element)) {
			this.headers.push([header, value.join('')]);
			return true;
		}
	};


	this.pseudoBefore = function(value, element, rule) {
		if (rule.pseudoMatcher.pseudo.indexOf('before') != -1) {
			element.firstChild.nodeValue = value.join('') + element.firstChild.nodeValue;
			return true;
		}
	};

	this.pseudoAfter = function(value, element, rule) {
		if (rule.pseudoMatcher.pseudo.indexOf('after') != -1) {
			element.firstChild.nodeValue += value.join('');
			return true;
		}
	};

	this.appendToIfNode = function(element, content) {
		if (content[0] && content[0].nodeType > 0) {
			for (var i = 0; i < content.length; i++) {
				var node = element.ownerDocument.importNode(content[i], true);
				element.appendChild(node);
			}
			return true;
		}
		return false;
	};

	this.replaceContent = function(element, content) {
		if (!this.appendToIfNode(element.parentNode, content)) {
			element.parentNode.appendChild(element.ownerDocument.createElement('span', content.join('')));
		}
		element.setAttribute('transphporm', 'remove');
	};

	this.appendContent = function(element, content) {
		if (!this.appendToIfNode(element, content)) {
			element.appendChild(element.ownerDocument.createTextNode(content.join('')));
		}
	};

	this.removeAllChildren = function(element) {
		while (element.hasChildNodes()) element.removeChild(element.firstChild);
	}



	this.display = function(value, element, rule) {
		if (value[0].toLowerCase() == 'none') element.parentNode.removeChild(element);
	};
};


Tranjsform.Property.Repeat = function(data) {
	this.data = data;

	this.run = function(value, element, rule) {
		for (var i = 0; i < value.length; i++) {
			var clone = element.cloneNode(true);

			this.data.bind(clone, value[i], 'iteration');

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
};


Tranjsform.Property.Display = function() {
	this.run = function(value, element, rule) {
		if (value[0].toLowerCase() === 'none') element.setAttribute('transphporm', 'remove');
		else element.setAttribute('transphporm', 'show');
	};
};

Tranjsform.Property.Bind = function() {

};

Tranjsform.DataFunction = function(data, locale, baseDir) {
	this._data = data;
	this.locale = locale;
	this.baseDir = baseDir;
	this.callbacks = {};
	this.properties = {};

	this.bind  = function(element, data, type) {
		if (!type) type = 'data';
		if (data[0] && data.length === 1 && typeof data[0] === 'object')  data = data[0];

		if (!element.__tssData) element.__tssData = {};
		element.__tssData[type] = data;
	};

	this.iteration = function(val, element) {
		var data = this.getData(element, 'iteration');
		return this.traverse(val, data);
	};

	this.getData = function(element, type) {
		while (element) {
			if (element.__tssData && element.__tssData[type]) return element.__tssData[type];
			element = element.parentNode;
		}
		return this._data;
	};

	this.data = function(val, element, callback) {
		this.observe(this._data, val, callback);
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

	this.observe = function(object, prop, callback) {

		if (!this.callbacks[prop]) this.callbacks[prop] = [];
		this.callbacks[prop] = callback;

		this.properties[prop] = object[prop];

		var self = this;
		if ((!Object.seal || !Object.isSealed(object))
		&& (!Object.freeze || !Object.isFrozen(object))) {
			Object.defineProperty(object, prop, {
				get: function() { 
					return self.properties[prop];
				},
				set: function f(value) { 
					self.properties[prop] = value;
					for (var c in self.callbacks) self.callbacks[c]();
				}
			});
		}
	}
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
			var num = Array.prototype.indexOf.call(Tranjsform.Shim.children(element.parentNode), element)+1;


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


	this.header = function(element) {
		if (this.matches(element)) {
			for (var i in this.pseudo) {
				if (pseudo[i].indexOf('header') === 0) return this.getBetween(pseudo[i], '[', ']');
			}
		}
	};

};


Tranjsform.Shim = function() {};

// Internet Explorer 11 doesn't put innerHTML or outerHTML on non-HTML tags created by DOMParser with mime "text/xml".
Tranjsform.Shim.outerHTML = function(node) {
	if (node.outerHTML) {
		return node.outerHTML;
	} else {
		var tempHolder = window.document.createElement("div");
		tempHolder.appendChild(tempHolder.ownerDocument.importNode(node, true));
		return tempHolder.innerHTML.trim();
	}
};
Tranjsform.Shim.innerHTML = function(node) {
	if (node.innerHTML) {
		return node.innerHTML;
	} else {
		return Tranjsform.Shim.outerHTML(node)
			.replace(new RegExp("</"+node.tagName+">$", "i"), "")
			.replace(new RegExp("^<"+node.tagName+"[^>]*>", "i"), "")
			.trim();
	}
};

// In Internet Explorer 11, parentNode.children is undefined in some cases that come up for this library's usage.
Tranjsform.Shim.children = function(node) {
	if (node.children) {
		return node.children;
	} else {
		var childNodes = node.childNodes;
		for (var i = 0; i < childNodes.length;) {
			if (!(childNodes[i] instanceof Element)) {
				Array.prototype.splice.call(childNodes, i, 1);
			} else {
				i++;
			}
		}
		return childNodes;
	}
};

//http://www.ahristov.com/tutorial/javascript-tips/Browser%2Bindependant%2BXPath%2Bevaluation.html
Tranjsform.Shim.selectXPath = function(expr, node) {
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

}());