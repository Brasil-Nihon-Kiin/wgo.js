/**
 * Class for syntax errors in SGF string.
 * @extends Error
 */
export class SGFSyntaxError {
	constructor(message, parser) {
		var tempError = Error.apply(this);
		tempError.name = this.name = 'SGFSyntaxError';
		this.message = message || 'There was an unspecified syntax error in the SGF';
		
		if(parser) {
			this.message += " on line "+parser.lineNo+", char "+parser.charNo+":\n";
			this.message += "\t"+parser.sgfString.split("\n")[parser.lineNo-1]+"\n";
			this.message += "\t"+Array(parser.charNo+1).join(" ")+"^";
		}
		
		this.stack = tempError.stack;
	}
}

// a small ES5 hack because currently in ES6 you can't extend Errors
SGFSyntaxError.prototype = Object.create(Error.prototype);
SGFSyntaxError.prototype.constructor = SGFSyntaxError;

export default SGFSyntaxError;