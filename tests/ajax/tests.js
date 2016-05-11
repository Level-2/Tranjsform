function stripTabs(str) {
	return str.replace(/\t/g, '').replace(/\n/g, '');
}

QUnit.test("loading from files", function(assert) {
  	var template = new Tranjsform.Builder("template.xml", "template.tss");
	assert.equal(stripTabs(template.output({'user': 'tom'}).body), stripTabs('<ul><li>tom</li></ul>'));
});

QUnit.test("loading data from json file", function(assert) {
  	var template = new Tranjsform.Builder("template.xml", "template.tss");
	assert.equal(stripTabs(template.output("data.json").body), stripTabs('<ul><li>tom</li></ul>'));
});

// TODO: add a test involving TSS import directive.
