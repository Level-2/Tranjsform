function stripTabs(str) {
	return str.replace(/\t/g, '').replace(/\n/g, '');
}

QUnit.test( "content simple", function( assert ) {
  var template = '<ul><li>TEST1</li></ul>';
  var css = 'ul li {content: data(user);}';
  var data = {'user': 'tom'};
		
  var template = new Tranjsform.Builder(template, css, data);

  assert.equal(template.output(), '<ul><li>tom</li></ul>');
});



QUnit.test( "content object", function( assert ) {
	var template = '<ul><li>TEST1</li></ul>';
	var css = 'ul li {content: data(user.name);}';
	var data = {'user': {'name': 'tom'}};

	template = new Tranjsform.Builder(template, css, data);
		
	assert.equal('<ul><li>tom</li></ul>', template.output()); 
});


QUnit.test( "repeat basic", function( assert ) {
	var template = '<ul><li>TEST1</li></ul>';
	var css = 'ul li {repeat: data(list); content: iteration()}';
	var data = {'list': ['One', 'Two', 'Three'] };

	template = new Tranjsform.Builder(template, css, data);
		
	assert.equal('<ul><li>One</li><li>Two</li><li>Three</li></ul>', template.output()); 
});

QUnit.test( "repeat object", function( assert ) {
	var template = '<ul><li>TEST1</li></ul>';
	var css = 'ul li {repeat: data(list); content: iteration(id)}';
	

	var data = {};
	data.list = [];
	data.list.push({'id': 'One'});
	data.list.push({'id': 'Two'});
	data.list.push({'id': 'Three'});

	template = new Tranjsform.Builder(template, css, data);
		
	assert.equal('<ul><li>One</li><li>Two</li><li>Three</li></ul>', template.output()); 
});


QUnit.test( "repeat object child node", function( assert ) {
	var template = '<ul><li><span>TEST1</span></li></ul>';
	var css = 'ul li {repeat: data(list);}';
	css += 'ul li span {content: iteration(id)}';
	
	var data = {};
	data.list = [];
	data.list.push({'id': 'One'});
	data.list.push({'id': 'Two'});
	data.list.push({'id': 'Three'});

	template = new Tranjsform.Builder(template, css, data);
		
	assert.equal(stripTabs('<ul>' +
					'<li>' +
					'	<span>One</span>' +
					'</li>' +
					'<li>' +
					'	<span>Two</span>' +
					'</li>'+
					'<li>' +
					'	<span>Three</span>' +
					'</li>' +
					'</ul>'), stripTabs(template.output())); 

});


QUnit.test( "repeat object child nodes", function( assert ) {
	var template = '<ul><li><h2>header</h2><span>TEST1</span></li></ul>';
	var css = 'ul li {repeat: data(list);}';
	css += 'ul li h2 {content: iteration(id)}';
	css += 'ul li span {content: iteration(name)}';
	
	var data = {};
	data.list = [];
	data.list.push({'name': 'One', 'id': 1});
	data.list.push({'name': 'Two', 'id': 2});
	data.list.push({'name': 'Three', 'id': 3});

	template = new Tranjsform.Builder(template, css, data);
		
	assert.equal(stripTabs('<ul>' +
			'<li>' +
			'	<h2>1</h2>' +
			'	<span>One</span>' +
			'</li><li>' +
			'	<h2>2</h2>' +
			'	<span>Two</span>' +
			'</li><li>' +
			'	<h2>3</h2>' +
			'	<span>Three</span>' +
			'</li>' +
		'</ul>'), stripTabs(template.output())); 
});

QUnit.test( "quoted content", function( assert ) {
	var template = '<h1>Heading</h1>';
	var tss = 'h1 {content: "TEST";}';

	template = new Tranjsform.Builder(template, tss);

	assert.equal('<h1>TEST</h1>', template.output());

});

QUnit.test( "quoted content with escape", function( assert ) {
	var template = '<h1>Heading</h1>';
	var tss = 'h1 {content: "TEST\\"TEST";}';

	template = new Tranjsform.Builder(template, tss);

	assert.equal('<h1>TEST"TEST</h1>', template.output());
});

QUnit.test( "multiple content values", function( assert ) {
	var template = '<h1>Heading</h1>';
	var tss = 'h1 {content: "A", "B"}';

	template = new Tranjsform.Builder(template, tss);

	assert.equal('<h1>AB</h1>', template.output());
});


QUnit.test( "match class and tag", function( assert ) {
	var template = '<h1>Test 1</h1><h1 class="test">Heading</h1><h1>Test 2</h1>';
	var tss = 'h1.test {content: "REPLACED"}';

	template = new Tranjsform.Builder(template, tss);

	assert.equal('<h1>Test 1</h1><h1 class="test">REPLACED</h1><h1>Test 2</h1>', template.output());
});

QUnit.test( "match class child", function( assert ) {
	var template = '<div><span class="foo">test</span><span class="bar">test</span></div>';

	var tss = 'div .foo {content: "REPLACED"}';

	template = new Tranjsform.Builder(template, tss);

	assert.equal('<div><span class="foo">REPLACED</span><span class="bar">test</span></div>', template.output());
});



QUnit.test( "child node matcher", function( assert ) {
	var template = '<div><span class="foo">test</span><span class="bar">test</span></div>';

	var tss = 'div > .foo {content: "REPLACED"}';

	template = new Tranjsform.Builder(template, tss);

	assert.equal('<div><span class="foo">REPLACED</span><span class="bar">test</span></div>', template.output());
});



QUnit.test( "attribute selector", function( assert ) {

	var template = '<div>' +
			'<textarea name="foo">foo</textarea>' +
			'<textarea>bar</textarea>' +
		'</div>';

	var tss = '[name="foo"] {content: "REPLACED";}';

	template = new Tranjsform.Builder(template, tss);

	assert.equal(stripTabs('<div>' +
			'<textarea name="foo">REPLACED</textarea>' +
			'<textarea>bar</textarea>' +
		'</div>'), stripTabs(template.output()));
});


//check that it's not due to the order of the HTML
QUnit.test( "attribute selector (b)", function( assert ) {
		var template = '<div>' +
			'<textarea>bar</textarea>' +
			'<textarea name="foo">foo</textarea>' +
		'</div>';

	var tss = '[name="foo"] {content: "REPLACED";}';

	template = new Tranjsform.Builder(template, tss);

	assert.equal(stripTabs('<div>' +
			'<textarea>bar</textarea>' +
			'<textarea name="foo">REPLACED</textarea>' +
		'</div>'), stripTabs(template.output()));

});

//And that it can be combined with element names
QUnit.test( "attribute selector (c)", function( assert ) {
		var template = '<div>' +
			'<a name="foo">a link</a>' +
			'<textarea name="foo">foo</textarea>' +
		'</div>';

	var tss = 'textarea[name="foo"] {content: "REPLACED";}';

	template = new Tranjsform.Builder(template, tss);

	assert.equal(stripTabs('<div>' +
			'<a name="foo">a link</a>' +
			'<textarea name="foo">REPLACED</textarea>' +
		'</div>'), stripTabs(template.output()));

});

QUnit.test( "dispay none", function( assert ) {
		var template = '<div>' +
			'<a name="foo">a link</a>' +
			'<textarea name="foo">foo</textarea>' +
		'</div>';

	var tss = 'textarea[name="foo"] {display: none;}';

	template = new Tranjsform.Builder(template, tss);

	assert.equal(stripTabs('<div>' +
			'<a name="foo">a link</a>' +
		'</div>'), stripTabs(template.output()));

});

QUnit.test( ":before", function( assert ) {
	var template = '<div>Test</div>';

	var tss = 'div:before {content: "BEFORE";}';

	template = new Tranjsform.Builder(template, tss);

	assert.equal('<div>BEFORETest</div>', template.output());
});

QUnit.test( ":after", function( assert ) {
	var template = '<div>Test</div>';

	var tss = 'div:after {content: "AFTER";}';

	template = new Tranjsform.Builder(template, tss);

	assert.equal('<div>TestAFTER</div>', template.output());
});


QUnit.test( "iteration pseudo", function( assert ) {
	var data = {};
	data.list = [];
	data.list.push({'name': 'One', 'id': 1});
	data.list.push({'name': 'Two', 'id': 2});
	data.list.push({'name': 'Three', 'id': 3});


	var template = '<ul>' +
					'<li>' +
					'	<h2>header</h2>' +
					'	<span>TEST1</span>' +
					'</li>' +
				'</ul>';


	var tss = 'ul li {repeat: data(list);}' +
		'ul li h2 {content: iteration(id)}' +
		'ul li span {content: iteration(name); }' +
		'ul li span:iteration[id="2"] {display: none;}';


	template = new Tranjsform.Builder(template, tss, data);

	assert.equal(stripTabs('<ul>' +
			'<li>' +
			'	<h2>1</h2>' +
			'	<span>One</span>' +
			'</li><li>' +
			'		<h2>2</h2>' +
			'</li><li>' +
			'	<h2>3</h2>' +
			'	<span>Three</span>' +
			'</li>' +
		'</ul>'), stripTabs(template.output()));

});




QUnit.test( "multi pseudo", function( assert ) {
	var data = {};
	data.list = [];
	data.list.push({'name': 'One', 'id': 1});
	data.list.push({'name': 'Two', 'id': 2});
	data.list.push({'name': 'Three', 'id': 3});


	var template = '<ul>' +
					'<li>' +
					'	<h2>header</h2>' +
					'	<span>TEST1</span>' +
					'</li>' +
				'</ul>';


	var tss = 'ul li {repeat: data(list);}' +
		'ul li h2 {content: iteration(id)}' +
		'ul li span {content: iteration(name); }' +
		'ul li span:iteration[id="2"]:before {content: "BEFORE"}';


	template = new Tranjsform.Builder(template, tss, data);

	assert.equal(stripTabs('<ul>' +
			'<li>' +
			'	<h2>1</h2>' +
			'	<span>One</span>' +
			'</li><li>' +
			'		<h2>2</h2>' +
			'		<span>BEFORETwo</span>' +
			'</li><li>' +
			'	<h2>3</h2>' +
			'	<span>Three</span>' +
			'</li>' +
		'</ul>'), stripTabs(template.output()));

});


QUnit.test( ":nth-child", function( assert ) {

	var template = '<ul>' +
				'<li>One</li>' +
				'<li>Two</li>' +
				'<li>Three</li>' +
				'<li>Four</li>' +
			'</ul>';

	var tss =  'ul li:nth-child(2) {content: "REPLACED"}';

	template = new Tranjsform.Builder(template, tss);

	assert.equal(stripTabs('<ul>' +
				'<li>One</li>' +
				'<li>REPLACED</li>' +
				'<li>Three</li>' +
				'<li>Four</li>' +
			'</ul>'), stripTabs(template.output()));

});


QUnit.test( ":nth-child(odd)", function( assert ) {

	var template = '<ul>' +
				'<li>One</li>' +
				'<li>Two</li>' +
				'<li>Three</li>' +
				'<li>Four</li>' +
			'</ul>';

	var tss =  'ul li:nth-child(odd) {content: "REPLACED"}';

	template = new Tranjsform.Builder(template, tss);

	assert.equal(stripTabs('<ul>' +
				'<li>REPLACED</li>' +
				'<li>Two</li>' +
				'<li>REPLACED</li>' +
				'<li>Four</li>' +
			'</ul>'), stripTabs(template.output()));

});


QUnit.test( ":nth-child(even)", function( assert ) {

	var template = '<ul>' +
				'<li>One</li>' +
				'<li>Two</li>' +
				'<li>Three</li>' +
				'<li>Four</li>' +
			'</ul>';

	var tss =  'ul li:nth-child(even) {content: "REPLACED"}';

	template = new Tranjsform.Builder(template, tss);

	assert.equal(stripTabs('<ul>' +
				'<li>One</li>' +
				'<li>REPLACED</li>' +
				'<li>Three</li>' +
				'<li>REPLACED</li>' +
			'</ul>'), stripTabs(template.output()));

});


QUnit.test( "read attribute", function( assert ) {

	var template = '<div class="fromattribute">Test</div>';

	var tss = 'div {content: attr(class); }';

	template = new Tranjsform.Builder(template, tss);

	assert.equal('<div class="fromattribute">fromattribute</div>', template.output());

});

QUnit.test( "write attribute", function( assert ) {

	var template = '<div>Test</div>';

	var tss = 'div:attr(class) {content: "classname"; }';

	template = new Tranjsform.Builder(template, tss);

	assert.equal('<div class="classname">Test</div>', template.output());

});