/**
 * Contains methods for parsing sgf string
 * @module SGFParser
 */

// Matches sgf sequence, e.g.: "(;SZ[19];B[jj];W[kk])" => ["(", ";SZ[19]", ";B[jj]", ";W[kk]", ")"]
var reg_seq = /\(|\)|(;(\s*[A-Z]+(\s*((\[\])|(\[(.|\s)*?([^\\]\]))))+)*)/g;

// Matches sgf node, e.g.: ";AB[jj][kk]C[Hello]" => ["AB[jj][kk]", "C[Hello]"]
var reg_node = /[A-Z]+(\s*((\[\])|(\[(.|\s)*?([^\\]\]))))+/g;

// Matches sgf identificator, e.g.: "AB[jj][kk]" => "AB"
var reg_ident = /[A-Z]+/;

// Matches sgf property/-ies, e.g.: "AB[jj][kk]" => ["[jj]", "[kk]"]
var reg_props = /(\[\])|(\[(.|\s)*?([^\\]\]))/g;

// helper function for translating letters to numbers (a => 0, b => 1, ...)
var to_num = function(str, i) {
	return str.charCodeAt(i)-97;
}

var SGFParser = {
	/**
	 * Matches SGF node trees
	 */
	REG_TREES: /(;([A-Z]+((\[\])|(\[(.|\s)*?([^\\](\\\\)*\])))+)*)+/g,
	
	/**
	 * Matches first SGf node in sequence, e.g.: `"AB[jj][kk]C[Hello];W[ll]" => "AB[jj][kk]C[Hello]"`.
	 */
	REG_NODE: /([A-Z]+((\[\])|(\[(.|\s)*?([^\\](\\\\)*\])))+)*/,
	
	/**
	 * Matches proeprties in node, e.g.: `"AB[jj][kk]C[Cool!]" => ["AB[jj][kk]", "C[Cool!]"]`.
	 */
	REG_PROPS: /[A-Z]+((\[\])|(\[(.|\s)*?([^\\](\\\\)*\])))+/g,
	
	/**
	 * Matches SGF property identificator, e.g.: `"AB[jj][kk]" => "AB"`.
	 */
	REG_PROP_IDENT: /[A-Z]+/,
	
	/**
	 * Matches property values from SGF property. e.g.: `"AB[jj][kk]" => ["[jj]", "[kk]"]`. Usage:
	 * 
	 * ```
	 * string.match(SGFParser.REG_PROPS); // returns array with property values (characters [ and ] are not removed)
	 * ```
	 */
	REG_PROP_VALS: /(\[\])|(\[(.|\s)*?([^\\](\\\\)*\]))/g,
	
	/**
	 * Regexp used for escaping characters. Usage:
	 * 
	 * ```
	 * string.replace(SGFParser.REG_ESCAPE, "$2");
	 * ```
	 */
	REG_ESCAPE: /\\((.)|(\n))/g
	
	
	
	
}

/*========================BETTER PARSER=============================================================*/

var SGFSyntaxError = function() {
	// temp syntax error
}

/**
 * Class for parsing of sgf files. Can be used for parsing of SGF fragments as well.
 * 
 * @param {string} sgf to be parsed
 */
 
var SGFParser = function(sgf) {
	this.sgfString = sgf;
	this.position = 0;
}

// helpers
SGFParser.CODE_A = "A".charCodeAt(0);
SGFParser.CODE_Z = "Z".charCodeAt(0);

SGFParser.prototype = {
	constructor: SGFParser,
	
	/**
	 * Expects string containing value(-s) of SGF property and returns array of that values.
	 * Example: `'[jj][kk]' => ['jj', 'kk']`.
	 * 
	 * @param {string}   string - parsed SGF
 	 * @param {number}   start  - starting position
 	 * @returns {string[]} array of property values                       
 	 * @throws {SGFSyntaxError} When sgf string is invalid.
	 */
	 
	parsePropertyValues: function() {
		var char, value, values = [];
		
		for(;;) {
			// check the first character
			if(this.sgfString[this.position] != '[') {
				// if there is no value throw an error
				if(values.length == 0) throw new SGFSyntaxError();

				// otherwise return the result (without empty values)
				return values.filter(function(val) {
					return val != "";
				});
			}

			// reset the value and read the first character
			value = "";
			char = this.sgfString[++this.position];

			// then we read the value
			while(char != ']') {

				// char mustn't be undefined
				if(!char) throw new SGFSyntaxError();

				// if there is character '\' save next character
				else if(char == '\\') {
					char = this.sgfString[++this.position];

					// char have to exis of course
					if(!char) throw new SGFSyntaxError();
					
					// ignore new line
					else if(char != '\n') {
						value += char;
					}
				}
				
				// save the character 
				else {
					value += char;
				}
				
				// and move pointer
				char = this.sgfString[++this.position];
			}

			// save the value and move pointer
			values.push(value);
			this.position++;
		}
	},
	
	/**
	 * Reads the property identificator (One or more UC letters)
	 * 
	 * @returns {string} the identificator.
	 */
	parsePropertyIdent: function() {
		var ident = "", charCode = this.sgfString.charCodeAt(this.position);
		while(charCode >= SGFParser.CODE_A && charCode >= SGFParser.CODE_A) {
			ident += this.sgfString[this.position++];
			charCode = this.sgfString.charCodeAt(this.position);
		}
		return ident;
	},
	
	parseProperties: function() {
		var properties = {};
		while(ident = this.parsePropertyIdent()) {
			properties.ident = this.parsePropertyValues();
		}
		return properties;
	},
	
	parseNode: function() {
		var char, sequence;
		
		sequence = [];
		char = this.sgfString[this.position];
		
		// parse a node
		if(char == ";") {
			this.position++;
			sequence.push(this.parseProperties());
		}
		
		// parse a fork
		else if(char == "(") {
			this.position++;
			sequence.push(this.parseTree());
		}
	},
	
	parseSequence: function() {
	
	},
	
	/**
	 * Parses a SGF *GameTree*.
	 * 
	 * @throws {SGFSyntaxError} [[Description]]
	 * @returns {[[Type]]} [[Description]]
	 */
	parseGameTree: function() {
		// GameTree must start with `(`
		if(this.sgfString[this.position++] != '(') throw new SGFSyntaxError();
		
		// Parse sequence
		sequence = this.parseSequence();
		
		// And some GameTrees
		if(this.sgfString[this.position] == '(') sequence.push(this.parseGameTree());
		else if(this.sgfString[this.position] == ')') return sequence;
		else throw new SGFSyntaxError(); // game tree must end with `)`
	},
	
	/**
	 * Parses a SGF *Collection*.
	 */
	parseCollection: function() {
		var gameTrees = [];
		
		do {
			gameTrees.push(this.parseGameTree());
		} while(this.SGFProperties[this.position]);
		
		return gameTrees;
	}
}

module.exports = SGFParser;