







Tranjsform.Formatter = function() {};

Tranjsform.Formatter.Number = function(locale) {
	this.locale = locale;

	this.decimal = function(num, decimals) {
		var parts = num.toString().split(".");

		if (!parts[1]) parts[1] = '0';

		parts[1] = parts[1].substr(0, decimals);

		while (parts[1].length < decimals) parts[1] = parts[1] + '0';

    	return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, this.locale['thousands_separator']) + (decimals != 0 ? this.locale['decimal_separator'] + parts[1] : "");
	};

	this.currency = function(num) {
		var num = this.decimal(num, this.locale['currency_decimals']);

		if (this.locale['currency_position'] === 'before') return this.locale['currency'] + num;
		else return num + this.locale['currency'];
	};
};


Tranjsform.Formatter.StringFormatter = function() {
	this.uppercase = function(val) {
		return val.toString().toUpperCase();
	};

	this.lowercase = function(val) {
		return val.toString().toLowerCase();
	};

	this.titleCase = function(val) {
		return val.toLowerCase().split(' ').map(function(i){return i[0].toUpperCase() + i.substring(1)}).join(' ');
	};

	this.html = function(val) {
		var parser = new DOMParser();
        var doc = parser.parseFromString(sText, "text/html");
        return doc.documentElement;
	};
};

Tranjsform.Formatter.Date = function(locale) {
	this.locale = locale;

	this.timeZones = {
		'Europe/London': {
			'offset': 0,
			'is_dst': function(date) {
				var dstStart = new Date(date.getFullYear(), 3, 31, 1, 0, 0);
				while (dstStart.getDay() != 0) dstStart.setTime(dstStart.getTime() - (60 * 60 * 24 * 1000));
				var dstEnd = new Date(date.getFullYear(), 10, 31, 1, 0, 0);
				while (dstEnd.getDay() != 0) dstEnd.setTime(dstEnd.getTime() - (60 * 60 * 24 * 1000));

				return date.getTime() > dstStart.getTime() && date.getTime() < dstEnd.getTime();

			}
		}
	};

	this.formats = {
		'd': function(date) {
			var d = date.getDate();
			return d < 10 ? '0' + d : d;
		},
		'D': function(date) {
			var text = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
			return text[date.getDay()];
		},
		'j': function(date) {
			return date.getDate();
		},
		'l': function(date) {
			var text = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
			return text[date.getDay()];
		},
		'N': function(date) {
			return date.getDay() == 0 ? 7 : date.getDay();
		},
		'S': function(date) {
			var suffixes = {1: 'st', 2: 'nd', 3: 'rd'};
			var d = date.getDate().toString();
			if (d > 10 && d < 15) return 'th';
			var num = d[d.length-1];
			return suffixes[num] ? suffixes[num] : 'th'; 
		},
		'w': function(date) {
			return date.getDay();
		},
		'z': function(date) {
			var start = new Date(dte.getFullYear(), 0, 0);
			var diff = date.getTime() - start.getTime();
			var oneDay = 1000 * 60 * 60 * 24;
			return Math.floor(diff / oneDay);
		},
		'F': function(date) {
			var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
			return months[date.getMonth()];
		},
		'm': function(date) {
			var m = date.getMonth()+1;
			return m < 10 ? '0' + m : m;
		},
		'M': function(date) {
			var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
			return months[date.getMonth()];
		},
		'n': function(date) {
			return date.getMonth()+1;
		},
		't': function(date) {
			return new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
		},
		'L': function(date) {
			return date.getFullYear() % 4 === 0 ? 1 : 0;
		},
		'o': function(date) {
			return date.getFullYear();
		},
		'Y': function(date) {
			return date.getFullYear();
		},
		'y': function(date) {
			return date.getYear();
		},
		'a': function(date) {
			return date.getHours() < 12 ? 'am' : 'pm';
		},
		'A': function(date) {
			return date.getHours() < 12 ? 'AM' : 'PM';
		},
		'g': function(date) {
			return date.getHours() > 12 ? date.getHours()-12 : date.getHours();
		},
		'G': function(date) {
			return date.getHours();
		},
		'h': function(date) {
			var h = date.getHours() > 12 ? date.getHours()-12 : date.getHours();
			return h < 10 ? '0' + h : h;
		},
		'H': function(date) {
			return date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
		}

	};

	this.format = function(date, format) {
		var str = '';
		for (var i = 0; i < format.length; i++) {
			if (format[i] == '\\') {
				i++
				str += format[i];
				continue;
			}
			else {
				if (this.formats[format[i]]) str += this.formats[format[i]](date);
				else str += format[i];
			}
		}
		return str;
	};


	this.getDate = function(val) {
		if (val instanceof Date) return val;		
		else {
			var dateTime = val.split(' ');
			if (dateTime[0].indexOf('-') === 4) {
				var parts = dateTime[0].split('-');
				if (dateTime[1]) {
					var time = dateTime[1].split(':');
					return new Date(parts[0], parts[1], parts[2], time[0], time[1]);
				}
				else return  new Date(parts[0], parts[1], parts[2]);				
			}
		}
	};

	this.date = function(val, format) {
		format = format ? format : this.locale['date_format'];
		return this.format(this.getDate(val), format);
	};

	this.time = function(val, format) {
		format = format ? format : this.locale['time_format'];
		return this.format(this.getDate(val), format);
	};

	this.relative = function(val) {
		var now = new Date();
		var date = this.getDate(val);
		var diff = now.getTime() - date.getTime();

		var diffDays = diff / (1000 * 60 * 60 * 24);

		if (Math,abs(diffDays) > 0) return this.dayOffset(Math.ceil(diffDays));
		else return this.timeOffset(diff);
	};

	this.timeOffset = function(diff) {
		var strings = this.locale['offset_strings'];

		var str = diff > 0 ? strings['past'] : strings['future'];

		var parts = {'seconds': 1000, 'minutes': 1000 * 60, 'hours': 1000 * 60 * 60};

		for (var p in parts) {
			if (Math.abs(diff) > parts[p]) {
				return str.replace('%d', Math.abs(diff)).replace('%s', this.getPlural(strings, Math.ceil(diff/parts[p]), p));
			}
		}
	};

	this.getPlural = function(strings, num, iterval) {
		if (interval != '') return num == 1 ? strings[interval + '_singular'] : strings[interval + '_plural'];
		else return '';
	};


	this.dayOffset = function(diffDays) {
		var strings = this.locale['offset_strings'];

		var ranges = this.getRanges();
		for (var i = 0; i < ranges.length; i++) {
			var lower = ranges[i][0];
			var upper = ranges[i][1];
			var str = ranges[i][2];
			var divisor = ranges[i][3];
			var plural = ranges[i][4];

			if (diffDays >= lower && diffDays <= upper) {
				var num = Math.abs(Math.round(diffDays / divisor));
				return str.replace('%d', num).replace('%s', this.getPlural(strings, num, plural));
			}
		}
	};

} 

