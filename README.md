# Tranjsform

## A Javascript implementation of [Transphpform](https://github.com/Level-2/Transphporm)

This allows you to use the same transformation stylesheets and templates both serverside and client side.


[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/TomBZombie/CDS?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)`


Tranjsform is fresh look at templating in Javascript. Let's face it, Templating in Javascirpt sucks. Building DOM Elements in javascript is tedious whichever library you use and it's far better to use simple flat HTML.

Why does this suck? It mixes the logic with the template. Any time the template system has the responsibility of containing the markup and inserting the data there is a poor separation of concerns and the code gets messy.

Template systems like this still mix logic and markup, the one thing they're trying to avoid.

This is equivalent to `<h1 style="font-weight:bold">Title</h1>`, it mixes two very different concerns. 

## Tranjsform is different

### Project Goals

1. To completely separate the markup from the processing logic (No if statements or loops in the template!)
2. To follow CSS concepts and grammar as closely as possible. This makes it incredibly easy to learn for anyone who already understands CSS.
3. To be a lightweight library (Currently it's less than 500 lines and a total cyclomatic complexity (a count of if statements, functions and loops) of less than 100 for the entire project)


With Tranjsform, the designer just supplies some raw XML that contains some dummy data. (Designers much prefer lorem ipsum to seeing `{{description}}` in their designs!)

```html
<ul>
	<li>User name</li>
</ul>

```

It's pure HTML without any processing instructions. Tranjsform then takes the XML and renders it with some data.

But where are the processing instructions? Tranjsform follows CSS's lead and all this processing logic is stored externally in "Transformation Style Sheets", a completely separate file that contains entirely reusable processing instructions.


At it's most basic, Tranjsform works by supplying a stylesheet and XML as strings.

The stylesheet can supply content to a targetted element. For example, this stylesheet:


```html

h1 {content: "My Title";}

```

Will set the content of any `H1` Tag to "My Title". Given the following code:


```javascript

var xml = '<h1>Original Title</h1>';

var tss ='h1 {content: "Replaced Title"; }';

var template = new Tranjsform.Builder(xml, tss);

console.log(template.output());

```

The output will be:


```hmtl
<h1>Replaced Title</h1>
```


### Data

It's not usually possible to specify the content in a static file like a stylesheet. The `tss` format also allows referencing external data. This data is supplied using the template builder and can be referened in the stylesheet using the `data()` function. This can be though of like the `url()` function in CSS, in that it references an external resource.

```javascript

var xml = '<h1>Original Title</h1>';

var data ='My Title!'

var tss ='h1 {content: data(); }';


var template = new Tranjsform.Builder(xml, tss, data);

console.log(template.output());

```

Output:


```html
<h1>My Title!</h1>
```

Most of the time, you will need to work with much more complex data structures. Tranjsform allows for reading data from within data structures using the inbuilt data function:


```javascript
var data = {};

data.title = 'My Title!';
data.description = 'Description of the page...';


var xml = `
	<h1>Example Title</h1>
	<p>Example Description</p>
	`;

var tss =`
	h1 {content: data(title);}
	p {content: data(description);}
`;

var template = new Tranjsform.Builder(xml, tss, data);

console.log(template.output());


```

Which will output:


```html

<h1>My Title!</h1>
<p>Description of the page....</p>

```

### Content

The content property can take multiple values, either a function call such as `data` or a quoted string as each value and will concatenate any supplied values:

```javascript
var xml = '<h1>Original Title</h1>';

var data ='My Title!'

var tss ='h1 {content: "Title: ", data(); }';


var template = new Tranjsform.Builder(xml, tss, data);

console.log(template.output());

```

Output:


```html
<h1>Title: My Title!</h1>
```

### Loops

Going back to the user list example, consider the following data structure:

```javascript
var users = [];

var user = {};
user.name = 'Tom';
user.email = 'tom@example.org';

users.push(user);


user = {};
user.name = 'Scott';
user.email = 'scott@example.org';

users.push(user);

```

Using Tranjsform, the user list can be generated like this:


```javascript

var xml = `<ul>
	<li>Name</li>	
</ul>`;


var tss =`
	ul li {repeat: data(users); content: iteration(name);}
`;

var data = { users};


var template = new Tranjsform.Builder(xml, tss, data);

console.log(template.output());

```


`repeat` tells Tranjsform to repeat the selected element for each of the supplied array. 

`data(users)` reads `data.users` as supplied in Javascript.

`iteration(name)` points at the value for the current iteration and reads the `name` property. This code outputs:


```html
<ul>
	<li>Tom</li>	
	<li>Scott</li>	
</ul>
```


Similarly, `iteration` can read specific values and be used in nested nodes:

```javascript
var xml = `<ul>
	<li>
		<h3>Name</h3>
		<span>email</span>
	</li>	
</ul>`;


var tss =`
	ul li {repeat: data(users);}
	ul li h3 {content: iteration(name);}
	ul li span {content: iteration(email);}
`;

var data = {users};


var template = new Tranjsform.Builder(xml, tss, data);

console.log(template.output());

```

Which will output:


```html
<ul>
	<li>
		<h3>Tom</h3>
		<span>tom@example.org</span>
	</li>
	<li>
		<h3>Scott</h3>
		<span>scott@example.org</span>
	</li>
</ul>

```


# Hiding Blocks

Lifted straight from css grammar, Tranjsform supports `display: none` which will actually remove the element from the document entirely:

```javascript

var xml = `<ul>
	<li>
		<h3>Name</h3>
		<span>email</span>
	</li>	
</ul>`;


var tss =`
	ul li {repeat: data(users);}
	ul li h3 {content: iteration(name);}
	ul li span {display: none}
`;

var data = {users};


var template = new Tranjsform.Builder(xml, tss, data);

console.log(template.output());


```

Output:


```html

<ul>
	<li>
		<h3>Tom</h3>
	</li>
	<li>
		<h3>Scott</h3>
	</li>
</ul>

```

N.b. this is very useful with the iteration value pseudo element

# CSS Selectors

Tranjsform supports the following CSS selectors:

### `.classname`

```javascript

var xml = `
	<main>
		<p>Paragraph one</p>
		<p class="middle">Paragraph two</p>
		<p>Paragraph 3</p>
	</main>
`;

var tss =`
.middle {content: "Middle paragraph"; }
`;

var template = new Tranjsform.Builder(xml, tss);

console.log(template.output());

```

Output:

```html
	<main>
		<p>Paragraph one</p>
		<p class="middle">Middle Paragraph</p>
		<p>Paragraph 3</p>
	</main>
```



### `tagname.classname`


```javascript

var xml = `
	<main>
		<p>Paragraph one</p>
		<p class="middle">Paragraph two</p>
		<p>Paragraph 3</p>
		<a class="middle">A link</a>
	</main>
`;

var tss =`
p.middle {content: "Middle paragraph"; }
`;

var template = new Tranjsform.Builder(xml, tss);

console.log(template.output());

```

Output:


```html
	<main>
		<p>Paragraph one</p>
		<p class="middle">Middle Paragraph</p>
		<p>Paragraph 3</p>
		<a class="middle">A link</a>
	</main>
```



### Direct decedent `foo > bar`



```javascript

var xml = `
	<ul>
		<li>One</li>
		<li>Two
			<span>Test</span>
		</li>
		<li>Three
			<div>
				<span>Test 2 </span>
			</div>
		</li>
	</ul>

`;

var tss =`
li > span {content: "REPLACED";}
`;

var template = new Tranjsform.Builder(xml, tss);

console.log(template.output());

```

Output:

```html
	<ul>
		<li>One</li>
		<li>Two
			<span>REPLACED</span>
		</li>
		<li>Three
			<div>
				<span>Test 2 </span>
			</div>
		</li>
	</ul>
```


### ID selector `#name`

```javascript

var xml = `
	<main>
		<p>Paragraph one</p>
		<p id="middle">Paragraph two</p>
		<p>Paragraph 3</p>
	</main>
`;

var tss =`
#middle {content: "Middle paragraph"; }
`;

var template = new Tranjsform.Builder(xml, tss);

console.log(template.output());

```

Output:

```html
	<main>
		<p>Paragraph one</p>
		<p id="middle">Middle Paragraph</p>
		<p>Paragraph 3</p>
	</main>
```

### Attribute selector

Like CSS, you can select elements that have a specific attribute:


```javascript

var xml = `
	<textarea name="One">
	</textarea>

	<textarea name="Two">

	</textarea>

	<textarea>

	</textarea>
`;

var tss =`
textarea[name="Two"] {content: "TEST"; }
`;

var template = new Tranjsform.Builder(xml, tss);

console.log(template.output());

```

Output:

```html
	<textarea name="One">
	</textarea>

	<textarea name="Two">
	TEST
	</textarea>

	<textarea>

	</textarea>

```

Or, any element that has a specific attribute:

```javascript

var xml = `
	<textarea name="One">
	</textarea>

	<textarea name="Two">

	</textarea>

	<textarea>

	</textarea>
`;

var tss =`
textarea[name] {content: "TEST"; }
`;

var template = new Tranjsform.Builder(xml, tss);

console.log(template.output());

```

Output:

```html
	<textarea name="One">
	TEST
	</textarea>

	<textarea name="Two">
	TEST
	</textarea>

	<textarea>

	</textarea>
```



### Combining selectors

Like CSS, all the selectors can be combined into a more complex expression:


```css
table tr.list td[colspan="2"] {}
```

Will match any td with a colspan of 2 that is in a tr with a class `list` and inside a `table` element


## Unsupported selectors

Currently the CSS selectors `~` and `+` are not supported.


# Pseudo Elements

Tranjsform also supports several pseudo elements.

`:before` and `:after`  which allows appending/prepending content to what is already there rather than overwriting it:

### Before

```javascript


var xml = `
	<h1>Example Title</h1>
	`;

var tss =`
	h1:before {content: "BEFORE ";}
`;

var template = new Tranjsform.Builder(xml, tss);

console.log(template.output());

```

Output:


```html
<h1>BEFORE Example Title</h1>

```

### After


```javascript


var xml = `
	<h1>Example Title</h1>
	`;

var tss =`
	h1:after {content: " AFTER";}
`;

var template = new Tranjsform.Builder(xml, tss);

console.log(template.output());

```

Output:


```html
<h1>Example Title AFTER</h1>

```




## :nth-child();

Straight from CSS, Tranjsform also supports `nth-child(NUM)`. As well as `nth-child(odd)` and `nth-child(even)`


```javascript
var xml = `
		<ul>
			<li>One</li>
			<li>Two</li>
			<li>Three</li>
			<li>Four</li>
		</ul>
`;

var tss ='ul li:nth-child(2) {content: "REPLACED"}';

var template = new Tranjsform.Builder(xml, tss);

console.log(template.output());
```

Output: 


```html
		<ul>
			<li>One</li>
			<li>REPLACED</li>
			<li>Three</li>
			<li>Four</li>
		</ul>

```


### Even


```javascript
var xml = `
		<ul>
			<li>One</li>
			<li>Two</li>
			<li>Three</li>
			<li>Four</li>
		</ul>
`;

var tss ='ul li:nth-child(even) {content: "REPLACED"}';

var template = new Tranjsform.Builder(xml, tss);

console.log(template.output());
```

Output: 


```html
		<ul>
			<li>One</li>
			<li>REPLACED</li>
			<li>Three</li>
			<li>REPLACED</li>
		</ul>

```


### Odd

```javascript
var xml = `
		<ul>
			<li>One</li>
			<li>Two</li>
			<li>Three</li>
			<li>Four</li>
		</ul>
`;

var tss ='ul li:nth-child(even) {content: "REPLACED"}';

var template = new Tranjsform.Builder(xml, tss);

console.log(template.output());
```

Output: 


```html
		<ul>
			<li>REPLACED</li>
			<li>Two</li>
			<li>REPLACED</li>
			<li>Four</li>
		</ul>

```


## Iteration values

Tranjsform can also inspect the iterated data for an element. This is particularly useful when you want to hide a specific block based on the content of an iterated value:


The format is:

```css
element:iteration[name=value] {}
```

Which will select any element who's iteration content's `name` attribute is equal to `value`

The following code will hide any user whose type is 'Admin'.

```javascript
var users = [];

var user = {};
user.name = 'Tom';
user.email = 'tom@example.org';
user.type = 'Admin';
users.push(user);


user = {};
user.name = 'Scott';
user.email = 'scott@example.org';
user.type = 'Standard';
users.push(user);

user = {};
user.name = 'Jo';
user.email = 'jo@example.org';
user.type = 'Standard';
users.push(user);



var xml = `
<ul>
	<li>
		<h3>Name</h3>
		<span>email</span>
	</li>	
</ul>`;


var tss =`
	ul li {repeat: data(users);}
	ul li:iteration[type='Admin'] {display: none;}
	ul li h3 {content: iteration(name);}
	ul li span {content: iteration(email);}
`;

var data = {users};


var template = new Tranjsform.Builder(xml, tss, data);

console.log(template.output());


```

Output:


```html
<ul>
	<li>
		<h3>Scott</h3>
		<span>scott@example.org</span>
	</li>	
	<li>
		<h3>Jo</h3>
		<span>jo@example.org</span>
	</li>	
</ul>
```


## Writing to Attributes

Unlike CSS, Tranjsform selectors allow direct selection of individual attributes to set their value. This is done using the pseudo element `:attr(name)` which selects the attribute on the matched elements.

```css
element:attr(id)
```

Will select the element's ID attribute.

Working example:


```javascript
var users = [];

var user = {};
user.name = 'Tom';
user.email = 'tom@example.org';
users.push(user);


user = {};
user.name = 'Scott';
user.email = 'scott@example.org';
users.push(user);



var xml = `
<ul>
	<li>
		<h3>Name</h3>
		<a href="mailto:email">email</span>
	</li>	
</ul>`;


var tss =`
	ul li {repeat: data(users);}
	ul li a {content: iteration(email);}
	ul li a:attr(href) {content: "mailto:", iteration(email);}
`;

var data = {users};


var template = new Tranjsform.Builder(xml, tss, data);

console.log(template.output());


```

Notice this uses multiple values for the `content` property to concatenate the full URL with mailto

Output:


```html
<ul>
	<li>
		<h3>Tom</h3>
		<a href="Tom@example.org">Tom@example.org</span>
	</li>
	<li>
		<h3>Scott</h3>
		<a href="scott@example.org">scott@example.org</span>
	</li>	
</ul>
```




## Reading from attributes

It's also possible to read from attributes using `attr(name)` inside the content property.


```javascript
var xml = `
<h1 class="foo">bar</h1>
`;

var tss ='h1 {content: attr(class);}';

var template = new Tranjsform.Builder(xml, tss);

console.log(template.output());
```

Output:


```html
<h1 class="foo">foo</h1>

```
