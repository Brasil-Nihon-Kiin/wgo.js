(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.WGo = {}));
}(this, function (exports) { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    /**
     * Class for syntax errors in SGF string.
     * @ extends Error
     */
    var SGFSyntaxError = /** @class */ (function (_super) {
        __extends(SGFSyntaxError, _super);
        function SGFSyntaxError(message, parser) {
            var _newTarget = this.constructor;
            var _this = _super.call(this, message) || this;
            _this.__proto__ = _newTarget.prototype;
            // var tempError = Error.apply(this);
            _this.name = _this.name = 'SGFSyntaxError';
            _this.message = message || 'There was an unspecified syntax error in the SGF';
            if (parser) {
                _this.message += " on line " + parser.lineNo + ", char " + parser.charNo + ":\n";
                _this.message += "\t" + parser.sgfString.split('\n')[parser.lineNo - 1] + "\n";
                _this.message += "\t" + Array(parser.charNo + 1).join(' ') + "^";
            }
            return _this;
        }
        return SGFSyntaxError;
    }(Error));
    //# sourceMappingURL=SGFSyntaxError.js.map

    /**
     * Contains methods for parsing sgf string.
     * @module SGFParser
     */
    var CODE_A = 'A'.charCodeAt(0);
    var CODE_Z = 'Z'.charCodeAt(0);
    var CODE_WHITE_CHAR = ' '.charCodeAt(0);
    function isCharUCLetter(char) {
        if (!char) {
            return false;
        }
        var charCode = char.charCodeAt(0);
        return charCode >= CODE_A && charCode <= CODE_Z;
    }
    /**
     * Class for parsing of sgf files. Can be used for parsing of SGF fragments as well.
     */
    var SGFParser = /** @class */ (function () {
        /**
         * Creates new instance of SGF parser with SGF loaded ready to be parsed.
         * @param sgf string to parse.
         */
        function SGFParser(sgf) {
            /** Current character position */
            this.position = 0;
            /** Current line number */
            this.lineNo = 1;
            /** Current char number (on the line) */
            this.charNo = 0;
            this.sgfString = sgf;
        }
        /**
         * Returns current significant character (ignoring whitespace characters).
         * If there is end of string, return undefined.
         */
        SGFParser.prototype.currentChar = function () {
            while (this.sgfString.charCodeAt(this.position) <= CODE_WHITE_CHAR) {
                // While the character is a whitespace, increase position pointer and line and column numbers.
                this.nextChar();
            }
            return this.sgfString[this.position];
        };
        /**
         * Move pointer to next character and return it (including whitespace).
         */
        SGFParser.prototype.nextChar = function () {
            if (this.sgfString[this.position] === '\n') {
                this.charNo = 0;
                this.lineNo++;
            }
            else {
                this.charNo++;
            }
            this.position++;
            return this.sgfString[this.position];
        };
        /**
         * Reads current significant character and if it isn't equal with the argument, throws an error.
         * Then move pointer to next character.
         */
        SGFParser.prototype.processChar = function (char) {
            if (this.currentChar() !== char) {
                throw new SGFSyntaxError("Unexpected character " + this.currentChar() + ". Character " + char + " was expected.", this);
            }
            return this.nextChar();
        };
        /**
         * Parse SGF property value - `"[" CValueType "]"`.
         * @param optional
         */
        SGFParser.prototype.parsePropertyValue = function (optional) {
            if (optional && this.currentChar() !== '[') {
                return;
            }
            var value = '';
            // process "[" and read first char
            var char = this.processChar('[');
            while (char !== ']') {
                if (!char) {
                    // char mustn't be undefined
                    throw new SGFSyntaxError('End of SGF inside of property', this);
                }
                else if (char === '\\') {
                    // if there is character '\' save next character
                    char = this.nextChar();
                    if (!char) {
                        // char have to exist of course
                        throw new SGFSyntaxError('End of SGF inside of property', this);
                    }
                    else if (char === '\n') {
                        // ignore new line, otherwise save
                        continue;
                    }
                }
                // save the character
                value += char;
                // and move to next one
                char = this.nextChar();
            }
            this.processChar(']');
            return value;
        };
        /**
         * Reads the property identifiers (One or more UC letters) - `UcLetter { UcLetter }`.
         */
        SGFParser.prototype.parsePropertyIdent = function () {
            var ident = '';
            // Read current significant character
            var char = this.currentChar();
            if (!isCharUCLetter(char)) {
                throw new SGFSyntaxError('Property identifier must consists from upper case letters.', this);
            }
            ident += char;
            while (char = this.nextChar()) {
                if (!isCharUCLetter(char)) {
                    break;
                }
                ident += char;
            }
            return ident;
        };
        /**
         * Parses sequence of property values - `PropValue { PropValue }`.
         */
        SGFParser.prototype.parsePropertyValues = function () {
            var values = [];
            var value = this.parsePropertyValue();
            if (value) {
                values.push(value);
            }
            while (value = this.parsePropertyValue(true)) {
                values.push(value);
            }
            return values;
        };
        /**
         * Parses a SGF property - `PropIdent PropValue { PropValue }`.
         */
        SGFParser.prototype.parseProperty = function () {
            if (!isCharUCLetter(this.currentChar())) {
                return;
            }
            return [this.parsePropertyIdent(), this.parsePropertyValues()];
        };
        /**
         * Parses a SGF node - `";" { Property }`.
         */
        SGFParser.prototype.parseNode = function () {
            this.processChar(';');
            var properties = {};
            var property;
            while (property = this.parseProperty()) {
                properties[property[0]] = property[1];
            }
            return properties;
        };
        /**
         * Parses a SGF Sequence - `Node { Node }`.
         */
        SGFParser.prototype.parseSequence = function () {
            var sequence = [];
            sequence.push(this.parseNode());
            while (this.currentChar() === ';') {
                sequence.push(this.parseNode());
            }
            return sequence;
        };
        /**
         * Parses a SGF *GameTree* - `"(" Sequence { GameTree } ")"`.
         */
        SGFParser.prototype.parseGameTree = function () {
            this.processChar('(');
            var sequence = this.parseSequence();
            var children = [];
            if (this.currentChar() === '(') {
                children = this.parseCollection();
            }
            this.processChar(')');
            return { sequence: sequence, children: children };
        };
        /**
         * Parses a SGF *Collection* - `Collection = GameTree { GameTree }`. This is the main method for parsing SGF file.
         */
        SGFParser.prototype.parseCollection = function () {
            var gameTrees = [];
            gameTrees.push(this.parseGameTree());
            while (this.currentChar() === '(') {
                gameTrees.push(this.parseGameTree());
            }
            return gameTrees;
        };
        return SGFParser;
    }());
    //# sourceMappingURL=SGFParser.js.map

    //# sourceMappingURL=index.js.map

    var BoardObject = /** @class */ (function () {
        function BoardObject(type) {
            this.zIndex = 0;
            this.type = type;
        }
        return BoardObject;
    }());
    //# sourceMappingURL=BoardObject.js.map

    var FieldObject = /** @class */ (function (_super) {
        __extends(FieldObject, _super);
        function FieldObject(type) {
            var _this = _super.call(this, type) || this;
            _this.x = 0;
            _this.y = 0;
            _this.scaleX = 1;
            _this.scaleY = 1;
            _this.rotate = 0;
            _this.opacity = 1;
            return _this;
        }
        FieldObject.prototype.setPosition = function (x, y) {
            this.x = x;
            this.y = y;
        };
        FieldObject.prototype.setScale = function (factor) {
            this.scaleX = factor;
            this.scaleY = factor;
        };
        FieldObject.prototype.setOpacity = function (value) {
            this.opacity = value;
        };
        return FieldObject;
    }(BoardObject));
    //# sourceMappingURL=FieldObject.js.map

    /**
     * Enumeration representing stone color, can be used for representing board position.
     */
    (function (Color) {
        Color[Color["BLACK"] = 1] = "BLACK";
        Color[Color["B"] = 1] = "B";
        Color[Color["WHITE"] = -1] = "WHITE";
        Color[Color["W"] = -1] = "W";
        Color[Color["EMPTY"] = 0] = "EMPTY";
        Color[Color["E"] = 0] = "E";
    })(exports.Color || (exports.Color = {}));
    //# sourceMappingURL=types.js.map

    /**
     * Board markup object is special type of object, which can have 3 variations - for empty field
     * and for black and white stone.
     */
    var BoardMarkupObject = /** @class */ (function (_super) {
        __extends(BoardMarkupObject, _super);
        function BoardMarkupObject(type, variation) {
            if (variation === void 0) { variation = exports.Color.E; }
            var _this = _super.call(this, type) || this;
            _this.variation = variation;
            return _this;
        }
        return BoardMarkupObject;
    }(FieldObject));
    //# sourceMappingURL=BoardMarkupObject.js.map

    var BoardLabelObject = /** @class */ (function (_super) {
        __extends(BoardLabelObject, _super);
        function BoardLabelObject(text, variation) {
            var _this = _super.call(this, 'LB', variation) || this;
            _this.text = text;
            return _this;
        }
        return BoardLabelObject;
    }(BoardMarkupObject));
    //# sourceMappingURL=BoardLabelObject.js.map

    /**
     * Board markup object is special type of object, which can have 3 variations - for empty field
     * and for black and white stone.
     */
    var BoardLineObject = /** @class */ (function (_super) {
        __extends(BoardLineObject, _super);
        function BoardLineObject(type, start, end) {
            var _this = _super.call(this, type) || this;
            _this.start = start;
            _this.end = end;
            return _this;
        }
        return BoardLineObject;
    }(BoardObject));
    //# sourceMappingURL=BoardLineObject.js.map

    /**
     * Simple base class for event handling. It tries to follow Node.js EventEmitter class API,
     * but contains only basic methods.
     */
    var EventEmitter = /** @class */ (function () {
        function EventEmitter() {
            // tslint:disable-next-line:variable-name
            this._events = {};
        }
        EventEmitter.prototype.on = function (evName, callback) {
            this._events[evName] = this._events[evName] || [];
            this._events[evName].push(callback);
        };
        EventEmitter.prototype.off = function (evName, callback) {
            if (this._events[evName]) {
                if (callback == null) {
                    this._events[evName] = [];
                }
                this._events[evName] = this._events[evName].filter(function (fn) { return fn !== callback; });
            }
        };
        EventEmitter.prototype.emit = function (evName) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            if (this._events[evName]) {
                this._events[evName].forEach(function (fn) { return fn.apply(void 0, args); });
            }
        };
        return EventEmitter;
    }());
    //# sourceMappingURL=EventEmitter.js.map

    /**
     * Helper function for merging default config with provided config.
     *
     * @param defaults
     * @param config
     */
    function makeConfig(defaults, config) {
        var mergedConfig = {};
        var defaultKeys = Object.keys(defaults);
        defaultKeys.forEach(function (key) {
            var val = config[key];
            var defVal = defaults[key];
            if (val != null && val.constructor === Object && !Array.isArray(val) && defVal != null) {
                mergedConfig[key] = makeConfig(defVal, val);
            }
            else if (val !== undefined) {
                mergedConfig[key] = val;
            }
            else {
                mergedConfig[key] = defVal;
            }
        });
        Object.keys(config).forEach(function (key) {
            if (defaultKeys.indexOf(key) === -1) {
                mergedConfig[key] = config[key];
            }
        });
        return mergedConfig;
    }
    //# sourceMappingURL=makeConfig.js.map

    var defaultBoardBaseTheme = {
        // basic
        stoneSize: 0.47,
        marginSize: 0.25,
        font: 'calibri',
        backgroundColor: '#CEB053',
        backgroundImage: '',
        // markup
        markupBlackColor: 'rgba(255,255,255,0.9)',
        markupWhiteColor: 'rgba(0,0,0,0.7)',
        markupNoneColor: 'rgba(0,0,0,0.7)',
        markupLineWidth: 0.05,
        // shadows
        shadowColor: 'rgba(62,32,32,0.5)',
        shadowTransparentColor: 'rgba(62,32,32,0)',
        shadowBlur: 0.25,
        shadowOffsetX: 0.07,
        shadowOffsetY: 0.13,
        // grid
        grid: {
            linesWidth: 0.03,
            linesColor: '#654525',
            starColor: '#531',
            starSize: 0.07,
        },
        // coordinates
        coordinates: {
            color: '#531',
            bold: false,
        },
    };
    var defaultBoardBaseConfig = {
        size: 19,
        width: 0,
        height: 0,
        starPoints: {
            5: [{ x: 2, y: 2 }],
            7: [{ x: 3, y: 3 }],
            8: [{ x: 2, y: 2 }, { x: 5, y: 2 }, { x: 2, y: 5 }, { x: 5, y: 5 }],
            9: [{ x: 2, y: 2 }, { x: 6, y: 2 }, { x: 4, y: 4 }, { x: 2, y: 6 }, { x: 6, y: 6 }],
            10: [{ x: 2, y: 2 }, { x: 7, y: 2 }, { x: 2, y: 7 }, { x: 7, y: 7 }],
            11: [{ x: 2, y: 2 }, { x: 8, y: 2 }, { x: 5, y: 5 }, { x: 2, y: 8 }, { x: 8, y: 8 }],
            12: [{ x: 3, y: 3 }, { x: 8, y: 3 }, { x: 3, y: 8 }, { x: 8, y: 8 }],
            13: [{ x: 3, y: 3 }, { x: 9, y: 3 }, { x: 6, y: 6 }, { x: 3, y: 9 }, { x: 9, y: 9 }],
            14: [{ x: 3, y: 3 }, { x: 10, y: 3 }, { x: 3, y: 10 }, { x: 10, y: 10 }],
            15: [{ x: 3, y: 3 }, { x: 11, y: 3 }, { x: 7, y: 7 }, { x: 3, y: 11 }, { x: 11, y: 11 }],
            16: [{ x: 3, y: 3 }, { x: 12, y: 3 }, { x: 3, y: 12 }, { x: 12, y: 12 }],
            17: [{ x: 3, y: 3 }, { x: 8, y: 3 }, { x: 13, y: 3 }, { x: 3, y: 8 }, { x: 8, y: 8 },
                { x: 13, y: 8 }, { x: 3, y: 13 }, { x: 8, y: 13 }, { x: 13, y: 13 }],
            18: [{ x: 3, y: 3 }, { x: 14, y: 3 }, { x: 3, y: 14 }, { x: 14, y: 14 }],
            19: [{ x: 3, y: 3 }, { x: 9, y: 3 }, { x: 15, y: 3 }, { x: 3, y: 9 }, { x: 9, y: 9 },
                { x: 15, y: 9 }, { x: 3, y: 15 }, { x: 9, y: 15 }, { x: 15, y: 15 }],
            20: [{ x: 3, y: 3 }, { x: 16, y: 3 }, { x: 3, y: 16 }, { x: 16, y: 16 }],
            21: [{ x: 3, y: 3 }, { x: 10, y: 3 }, { x: 17, y: 3 }, { x: 3, y: 10 }, { x: 10, y: 10 },
                { x: 17, y: 10 }, { x: 3, y: 17 }, { x: 10, y: 17 }, { x: 17, y: 17 }],
        },
        viewport: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        },
        coordinates: false,
        coordinateLabelsX: 'ABCDEFGHJKLMNOPQRSTUVWXYZ',
        coordinateLabelsY: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
        theme: defaultBoardBaseTheme,
    };
    //# sourceMappingURL=defaultConfig.js.map

    // tslint:disable-next-line:max-line-length
    var BoardBase = /** @class */ (function (_super) {
        __extends(BoardBase, _super);
        function BoardBase(element, config) {
            if (config === void 0) { config = {}; }
            var _this = _super.call(this) || this;
            _this.objects = [];
            // merge user config with default
            _this.element = element;
            _this.config = makeConfig(defaultBoardBaseConfig, config);
            return _this;
        }
        /**
         * Updates dimensions and redraws everything
         */
        BoardBase.prototype.resize = function () {
            // subclass may do resize things here
        };
        /**
         * Redraw everything.
         */
        BoardBase.prototype.redraw = function () {
            // subclass should implement this
        };
        /**
         * Add board object. Main function for adding graphics on the board.
         *
         * @param boardObject
         */
        BoardBase.prototype.addObject = function (boardObject) {
            // handling multiple objects
            if (Array.isArray(boardObject)) {
                for (var i = 0; i < boardObject.length; i++) {
                    this.addObject(boardObject[i]);
                }
                return;
            }
            if (this.objects.indexOf(boardObject) === -1) {
                this.objects.push(boardObject);
            }
        };
        /**
         * Shortcut method to add object and set its position.
         */
        BoardBase.prototype.addObjectAt = function (x, y, boardObject) {
            boardObject.setPosition(x, y);
            this.addObject(boardObject);
        };
        /**
         * Remove board object. Main function for removing graphics on the board.
         *
         * @param boardObject
         */
        BoardBase.prototype.removeObject = function (boardObject) {
            // handling multiple objects
            if (Array.isArray(boardObject)) {
                for (var i = 0; i < boardObject.length; i++) {
                    this.removeObject(boardObject[i]);
                }
                return;
            }
            var objectPos = this.objects.indexOf(boardObject);
            if (objectPos === -1) {
                // object isn't on the board, ignore it
                return;
            }
            this.objects.splice(objectPos, 1);
        };
        BoardBase.prototype.removeObjectsAt = function (x, y) {
            var _this = this;
            this.objects.forEach(function (obj) {
                if (obj instanceof FieldObject && obj.x === x && obj.y === y) {
                    _this.removeObject(obj);
                }
            });
        };
        BoardBase.prototype.removeAllObjects = function () {
            this.objects = [];
        };
        BoardBase.prototype.hasObject = function (boardObject) {
            return this.objects.indexOf(boardObject) >= 0;
        };
        /**
         * Sets width of the board, height will be automatically computed. Then everything will be redrawn.
         *
         * @param width
         */
        BoardBase.prototype.setWidth = function (width) {
            this.config.width = width;
            this.config.height = 0;
            this.resize();
        };
        /**
         * Sets height of the board, width will be automatically computed. Then everything will be redrawn.
         *
         * @param height
         */
        BoardBase.prototype.setHeight = function (height) {
            this.config.width = 0;
            this.config.height = height;
            this.resize();
        };
        /**
         * Sets exact dimensions of the board. Then everything will be redrawn.
         *
         * @param width
         * @param height
         */
        BoardBase.prototype.setDimensions = function (width, height) {
            this.config.width = width;
            this.config.height = height;
            this.resize();
        };
        /**
           * Get currently visible section of the board
           */
        BoardBase.prototype.getViewport = function () {
            return this.config.viewport;
        };
        /**
           * Set section of the board to be displayed
           */
        BoardBase.prototype.setViewport = function (viewport) {
            this.config.viewport = viewport;
        };
        BoardBase.prototype.getSize = function () {
            return this.config.size;
        };
        BoardBase.prototype.setSize = function (size) {
            if (size === void 0) { size = 19; }
            this.config.size = size;
        };
        BoardBase.prototype.getCoordinates = function () {
            return this.config.coordinates;
        };
        BoardBase.prototype.setCoordinates = function (coordinates) {
            this.config.coordinates = coordinates;
        };
        return BoardBase;
    }(EventEmitter));
    //# sourceMappingURL=BoardBase.js.map

    //# sourceMappingURL=index.js.map

    /**
     * @class
     * Implements one layer of the HTML5 canvas
     */
    var CanvasLayer = /** @class */ (function () {
        function CanvasLayer(board) {
            this.board = board;
            this.init();
        }
        CanvasLayer.prototype.init = function () {
            this.element = document.createElement('canvas');
            this.element.style.position = 'absolute';
            // this.element.style.zIndex = weight.toString(10);
            this.element.style.width = '100%';
            this.element.style.height = '100%';
            this.context = this.element.getContext('2d');
            this.context.scale(this.board.pixelRatio, this.board.pixelRatio);
            this.context.save();
            this.board.boardElement.appendChild(this.element);
        };
        CanvasLayer.prototype.resize = function (width, height) {
            var linesShift = this.board.config.theme.linesShift;
            this.element.width = width;
            this.element.height = height;
            this.context.transform(1, 0, 0, 1, linesShift, linesShift);
        };
        CanvasLayer.prototype.draw = function (drawFunction, boardObject) {
            var _this = this;
            try {
                // create a "sandbox" for drawing function
                this.context.save();
                if (boardObject instanceof FieldObject) {
                    var leftOffset = this.board.getX(boardObject.x);
                    var topOffset = this.board.getY(boardObject.y);
                    var fieldSize = this.board.fieldSize;
                    this.context.transform(fieldSize * boardObject.scaleX, 0, 0, fieldSize * boardObject.scaleY, leftOffset, topOffset);
                    this.context.rotate(boardObject.rotate);
                    this.context.globalAlpha = boardObject.opacity;
                }
                else {
                    var leftOffset = this.board.getX(0);
                    var topOffset = this.board.getY(0);
                    var fieldSize = this.board.fieldSize;
                    this.context.transform(fieldSize, 0, 0, fieldSize, leftOffset, topOffset);
                }
                var res = drawFunction(this.context, this.board.config, boardObject);
                // restore context
                this.context.restore();
                if (res && res.then) {
                    res.then(function () {
                        _this.board.redraw();
                    });
                }
            }
            catch (err) {
                // If the board is too small some canvas painting function can throw an exception, but we don't
                // want to break our app
                // tslint:disable-next-line:no-console
                console.error("Object couldn't be rendered. Error: " + err.message, boardObject);
            }
        };
        CanvasLayer.prototype.clear = function () {
            this.context.clearRect(0, 0, this.element.width, this.element.height);
        };
        return CanvasLayer;
    }());
    //# sourceMappingURL=CanvasLayer.js.map

    /**
     * @class
     * @extends WGo.CanvasBoard.CanvasLayer
     * Layer for shadows. It is slightly translated.
     */
    var ShadowLayer = /** @class */ (function (_super) {
        __extends(ShadowLayer, _super);
        function ShadowLayer() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ShadowLayer.prototype.resize = function (width, height) {
            _super.prototype.resize.call(this, width, height);
            this.context.transform(1, 0, 0, 1, this.board.config.theme.shadowOffsetX * this.board.fieldSize, this.board.config.theme.shadowOffsetY * this.board.fieldSize);
        };
        return ShadowLayer;
    }(CanvasLayer));
    //# sourceMappingURL=ShadowLayer.js.map

    var GridLayer = /** @class */ (function (_super) {
        __extends(GridLayer, _super);
        function GridLayer() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        GridLayer.prototype.init = function () {
            _super.prototype.init.call(this);
            this.drawGrid();
        };
        GridLayer.prototype.clear = function () {
            _super.prototype.clear.call(this);
            this.drawGrid();
        };
        GridLayer.prototype.drawGrid = function () {
            // draw grid
            var tmp;
            var params = this.board.config.theme.grid;
            this.context.beginPath();
            this.context.lineWidth = params.linesWidth * this.board.fieldSize;
            this.context.strokeStyle = params.linesColor;
            var tx = Math.round(this.board.getX(0));
            var ty = Math.round(this.board.getY(0));
            var bw = Math.round((this.board.config.size - 1) * this.board.fieldSize);
            var bh = Math.round((this.board.config.size - 1) * this.board.fieldSize);
            this.context.strokeRect(tx, ty, bw, bh);
            for (var i = 1; i < this.board.config.size - 1; i++) {
                tmp = Math.round(this.board.getX(i));
                this.context.moveTo(tmp, ty);
                this.context.lineTo(tmp, ty + bh);
                tmp = Math.round(this.board.getY(i));
                this.context.moveTo(tx, tmp);
                this.context.lineTo(tx + bw, tmp);
            }
            this.context.stroke();
            // draw stars
            this.context.fillStyle = params.starColor;
            if (this.board.config.starPoints[this.board.config.size]) {
                for (var key in this.board.config.starPoints[this.board.config.size]) {
                    this.context.beginPath();
                    this.context.arc(this.board.getX(this.board.config.starPoints[this.board.config.size][key].x), this.board.getY(this.board.config.starPoints[this.board.config.size][key].y), params.starSize * this.board.fieldSize, 0, 2 * Math.PI, true);
                    this.context.fill();
                }
            }
            if (this.board.config.coordinates) {
                this.drawCoordinates();
            }
        };
        GridLayer.prototype.drawCoordinates = function () {
            var t;
            var params = this.board.config.theme.coordinates;
            this.context.fillStyle = params.color;
            this.context.textBaseline = 'middle';
            this.context.textAlign = 'center';
            // tslint:disable-next-line:max-line-length
            this.context.font = "" + (params.bold ? 'bold ' : '') + this.board.fieldSize / 2 + "px " + (this.board.config.theme.font || '');
            var xRight = this.board.getX(-0.75);
            var xLeft = this.board.getX(this.board.config.size - 0.25);
            var yTop = this.board.getY(-0.75);
            var yBottom = this.board.getY(this.board.config.size - 0.25);
            var coordinatesX = this.board.config.coordinateLabelsX;
            var coordinatesY = this.board.config.coordinateLabelsY;
            for (var i = 0; i < this.board.config.size; i++) {
                t = this.board.getY(i);
                this.context.fillText(coordinatesX[i], xRight, t);
                this.context.fillText(coordinatesX[i], xLeft, t);
                t = this.board.getX(i);
                this.context.fillText(coordinatesY[i], t, yTop);
                this.context.fillText(coordinatesY[i], t, yBottom);
            }
            this.context.fillStyle = 'black';
        };
        return GridLayer;
    }(CanvasLayer));
    //# sourceMappingURL=GridLayer.js.map

    var DrawHandler = /** @class */ (function () {
        function DrawHandler(params) {
            if (params === void 0) { params = {}; }
            this.params = params;
        }
        return DrawHandler;
    }());
    //# sourceMappingURL=DrawHandler.js.map

    /**
     * Provides shadow for the stone.
     */
    var Stone = /** @class */ (function (_super) {
        __extends(Stone, _super);
        function Stone() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Stone.prototype.shadow = function (canvasCtx, boardConfig) {
            var stoneRadius = boardConfig.theme.stoneSize;
            var blur = boardConfig.theme.shadowBlur;
            var startRadius = Math.max(stoneRadius - stoneRadius * blur, 0.00001);
            var stopRadius = stoneRadius + (1 / 7 * stoneRadius) * blur;
            var gradient = canvasCtx.createRadialGradient(0, 0, startRadius, 0, 0, stopRadius);
            gradient.addColorStop(0, boardConfig.theme.shadowColor);
            gradient.addColorStop(1, boardConfig.theme.shadowTransparentColor);
            canvasCtx.beginPath();
            canvasCtx.fillStyle = gradient;
            canvasCtx.arc(0, 0, stopRadius, 0, 2 * Math.PI, true);
            canvasCtx.fill();
        };
        return Stone;
    }(DrawHandler));
    //# sourceMappingURL=Stone.js.map

    var ShellStoneBlack = /** @class */ (function (_super) {
        __extends(ShellStoneBlack, _super);
        function ShellStoneBlack() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ShellStoneBlack.prototype.stone = function (canvasCtx, boardConfig) {
            var stoneRadius = boardConfig.theme.stoneSize;
            canvasCtx.beginPath();
            canvasCtx.fillStyle = '#000';
            canvasCtx.arc(0, 0, stoneRadius, 0, 2 * Math.PI, true);
            canvasCtx.fill();
            var radGrad = canvasCtx.createRadialGradient(0.4 * stoneRadius, 0.4 * stoneRadius, 0, 0.5 * stoneRadius, 0.5 * stoneRadius, stoneRadius);
            radGrad.addColorStop(0, 'rgba(32,32,32,1)');
            radGrad.addColorStop(1, 'rgba(0,0,0,0)');
            canvasCtx.beginPath();
            canvasCtx.fillStyle = radGrad;
            canvasCtx.arc(0, 0, stoneRadius, 0, 2 * Math.PI, true);
            canvasCtx.fill();
            radGrad = canvasCtx.createRadialGradient(-0.4 * stoneRadius, -0.4 * stoneRadius, 0.05 * stoneRadius, -0.5 * stoneRadius, -0.5 * stoneRadius, 1.5 * stoneRadius);
            radGrad.addColorStop(0, 'rgba(64,64,64,1)');
            radGrad.addColorStop(1, 'rgba(0,0,0,0)');
            canvasCtx.beginPath();
            canvasCtx.fillStyle = radGrad;
            canvasCtx.arc(0, 0, stoneRadius, 0, 2 * Math.PI, true);
            canvasCtx.fill();
        };
        return ShellStoneBlack;
    }(Stone));
    //# sourceMappingURL=ShellStoneBlack.js.map

    // shell stone helping functions
    var shellSeed = Math.ceil(Math.random() * 9999999);
    var ShellStoneWhite = /** @class */ (function (_super) {
        __extends(ShellStoneWhite, _super);
        function ShellStoneWhite() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ShellStoneWhite.prototype.stone = function (canvasCtx, boardConfig, boardObject) {
            var stoneRadius = boardConfig.theme.stoneSize;
            canvasCtx.beginPath();
            canvasCtx.fillStyle = '#aaa';
            canvasCtx.arc(0, 0, stoneRadius, 0, 2 * Math.PI, true);
            canvasCtx.fill();
            // do shell magic here
            var type = shellSeed % (3 + boardObject.x * boardConfig.size + boardObject.y) % 3;
            var z = boardConfig.size * boardConfig.size + boardObject.x * boardConfig.size + boardObject.y;
            var angle = (2 / z) * (shellSeed % z);
            if (type === 0) {
                this.drawShell({
                    ctx: canvasCtx,
                    x: 0,
                    y: 0,
                    radius: stoneRadius,
                    angle: angle,
                    lines: [0.10, 0.12, 0.11, 0.10, 0.09, 0.09, 0.09, 0.09],
                    factor: 0.25,
                    thickness: 1.75,
                });
            }
            else if (type === 1) {
                this.drawShell({
                    ctx: canvasCtx,
                    x: 0,
                    y: 0,
                    radius: stoneRadius,
                    angle: angle,
                    lines: [0.10, 0.09, 0.08, 0.07, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06],
                    factor: 0.2,
                    thickness: 1.5,
                });
            }
            else {
                this.drawShell({
                    ctx: canvasCtx,
                    x: 0,
                    y: 0,
                    radius: stoneRadius,
                    angle: angle,
                    lines: [0.12, 0.14, 0.13, 0.12, 0.12, 0.12],
                    factor: 0.3,
                    thickness: 2,
                });
            }
            var radGrad = canvasCtx.createRadialGradient(-2 * stoneRadius / 5, -2 * stoneRadius / 5, stoneRadius / 3, -stoneRadius / 5, -stoneRadius / 5, 5 * stoneRadius / 5);
            radGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
            radGrad.addColorStop(1, 'rgba(255,255,255,0)');
            // add radial gradient //
            canvasCtx.beginPath();
            canvasCtx.fillStyle = radGrad;
            canvasCtx.arc(0, 0, stoneRadius, 0, 2 * Math.PI, true);
            canvasCtx.fill();
        };
        ShellStoneWhite.prototype.drawShell = function (arg) {
            var fromAngle = arg.angle;
            var toAngle = arg.angle;
            for (var i = 0; i < arg.lines.length; i++) {
                fromAngle += arg.lines[i];
                toAngle -= arg.lines[i];
                this.drawShellLine(arg.ctx, arg.x, arg.y, arg.radius, fromAngle, toAngle, arg.factor, arg.thickness);
            }
        };
        ShellStoneWhite.prototype.drawShellLine = function (ctx, x, y, r, startAngle, endAngle, factor, thickness) {
            ctx.strokeStyle = 'rgba(64,64,64,0.2)';
            ctx.lineWidth = (r / 30) * thickness;
            ctx.beginPath();
            var radius = r * 0.9;
            var x1 = x + radius * Math.cos(startAngle * Math.PI);
            var y1 = y + radius * Math.sin(startAngle * Math.PI);
            var x2 = x + radius * Math.cos(endAngle * Math.PI);
            var y2 = y + radius * Math.sin(endAngle * Math.PI);
            var m;
            var angle;
            var diffX;
            var diffY;
            if (x2 > x1) {
                m = (y2 - y1) / (x2 - x1);
                angle = Math.atan(m);
            }
            else if (x2 === x1) {
                angle = Math.PI / 2;
            }
            else {
                m = (y2 - y1) / (x2 - x1);
                angle = Math.atan(m) - Math.PI;
            }
            var c = factor * radius;
            diffX = Math.sin(angle) * c;
            diffY = Math.cos(angle) * c;
            var bx1 = x1 + diffX;
            var by1 = y1 - diffY;
            var bx2 = x2 + diffX;
            var by2 = y2 - diffY;
            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(bx1, by1, bx2, by2, x2, y2);
            ctx.stroke();
        };
        return ShellStoneWhite;
    }(Stone));
    //# sourceMappingURL=ShellStoneWhite.js.map

    var GlassStoneBlack = /** @class */ (function (_super) {
        __extends(GlassStoneBlack, _super);
        function GlassStoneBlack() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        GlassStoneBlack.prototype.stone = function (canvasCtx, boardConfig) {
            var stoneRadius = boardConfig.theme.stoneSize;
            var radGrad = canvasCtx.createRadialGradient(-2 * stoneRadius / 5, -2 * stoneRadius / 5, 1, -stoneRadius / 5, -stoneRadius / 5, 4 * stoneRadius / 5);
            radGrad.addColorStop(0, '#666');
            radGrad.addColorStop(1, '#000');
            canvasCtx.beginPath();
            canvasCtx.fillStyle = radGrad;
            canvasCtx.arc(0, 0, stoneRadius, 0, 2 * Math.PI, true);
            canvasCtx.fill();
        };
        return GlassStoneBlack;
    }(Stone));
    //# sourceMappingURL=GlassStoneBlack.js.map

    var GlassStoneWhite = /** @class */ (function (_super) {
        __extends(GlassStoneWhite, _super);
        function GlassStoneWhite() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        GlassStoneWhite.prototype.stone = function (canvasCtx, boardConfig) {
            var stoneRadius = boardConfig.theme.stoneSize;
            var radGrad = canvasCtx.createRadialGradient(-2 * stoneRadius / 5, -2 * stoneRadius / 5, stoneRadius / 3, -stoneRadius / 5, -stoneRadius / 5, 5 * stoneRadius / 5);
            radGrad.addColorStop(0, '#fff');
            radGrad.addColorStop(1, '#aaa');
            canvasCtx.beginPath();
            canvasCtx.fillStyle = radGrad;
            canvasCtx.arc(0, 0, stoneRadius, 0, 2 * Math.PI, true);
            canvasCtx.fill();
        };
        return GlassStoneWhite;
    }(Stone));
    //# sourceMappingURL=GlassStoneWhite.js.map

    var PaintedStoneBlack = /** @class */ (function (_super) {
        __extends(PaintedStoneBlack, _super);
        function PaintedStoneBlack() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        PaintedStoneBlack.prototype.stone = function (canvasCtx, boardConfig) {
            var stoneRadius = boardConfig.theme.stoneSize;
            var radGrad = canvasCtx.createRadialGradient(-2 * stoneRadius / 5, -2 * stoneRadius / 5, 1 * stoneRadius / 5, -stoneRadius / 5, -stoneRadius / 5, 4 * stoneRadius / 5);
            radGrad.addColorStop(0, '#111');
            radGrad.addColorStop(1, '#000');
            canvasCtx.beginPath();
            canvasCtx.fillStyle = radGrad;
            canvasCtx.arc(0, 0, stoneRadius, 0, 2 * Math.PI, true);
            canvasCtx.fill();
            canvasCtx.beginPath();
            canvasCtx.lineWidth = stoneRadius / 6;
            canvasCtx.strokeStyle = '#ccc';
            canvasCtx.arc(-stoneRadius / 8, -stoneRadius / 8, stoneRadius / 2, Math.PI, 1.5 * Math.PI);
            canvasCtx.stroke();
        };
        return PaintedStoneBlack;
    }(Stone));
    //# sourceMappingURL=PaintedStoneBlack.js.map

    var PaintedStoneWhite = /** @class */ (function (_super) {
        __extends(PaintedStoneWhite, _super);
        function PaintedStoneWhite() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        PaintedStoneWhite.prototype.stone = function (canvasCtx, boardConfig) {
            var stoneRadius = boardConfig.theme.stoneSize;
            var radGrad = canvasCtx.createRadialGradient(-2 * stoneRadius / 5, -2 * stoneRadius / 5, 2 * stoneRadius / 5, -stoneRadius / 5, -stoneRadius / 5, 4 * stoneRadius / 5);
            radGrad.addColorStop(0, '#fff');
            radGrad.addColorStop(1, '#ddd');
            canvasCtx.beginPath();
            canvasCtx.fillStyle = radGrad;
            canvasCtx.arc(0, 0, stoneRadius, 0, 2 * Math.PI, true);
            canvasCtx.fill();
            canvasCtx.beginPath();
            canvasCtx.lineWidth = stoneRadius / 6;
            canvasCtx.strokeStyle = '#999';
            canvasCtx.arc(stoneRadius / 8, stoneRadius / 8, stoneRadius / 2, 0, Math.PI / 2, false);
            canvasCtx.stroke();
        };
        return PaintedStoneWhite;
    }(Stone));
    //# sourceMappingURL=PaintedStoneWhite.js.map

    var SimpleStone = /** @class */ (function (_super) {
        __extends(SimpleStone, _super);
        function SimpleStone(color) {
            return _super.call(this, { color: color }) || this;
        }
        SimpleStone.prototype.stone = function (canvasCtx, boardConfig) {
            var stoneSize = boardConfig.theme.stoneSize;
            var lw = boardConfig.theme.markupLineWidth;
            canvasCtx.fillStyle = this.params.color;
            canvasCtx.beginPath();
            canvasCtx.arc(0, 0, stoneSize - lw / 2, 0, 2 * Math.PI, true);
            canvasCtx.fill();
            canvasCtx.lineWidth = lw;
            canvasCtx.strokeStyle = 'black';
            canvasCtx.stroke();
        };
        return SimpleStone;
    }(DrawHandler));
    //# sourceMappingURL=SimpleStone.js.map

    // Check if image has been loaded properly
    // see https://stereochro.me/ideas/detecting-broken-images-js
    /*function isOkay(img: any) {
      if (typeof img === 'string') { return false; }
      if (!img.complete) { return false; }
      if (typeof img.naturalWidth !== 'undefined' && img.naturalWidth === 0) {
        return false;
      }
      return true;
    }*/
    var RealisticStone = /** @class */ (function (_super) {
        __extends(RealisticStone, _super);
        function RealisticStone(paths, fallback) {
            var _this = _super.call(this) || this;
            _this.fallback = fallback;
            _this.randSeed = Math.ceil(Math.random() * 9999999);
            _this.images = {};
            _this.paths = paths;
            return _this;
        }
        RealisticStone.prototype.loadImage = function (path) {
            return new Promise(function (resolve, reject) {
                var image = new Image();
                image.onload = function () {
                    resolve(image);
                };
                image.onerror = function () {
                    reject();
                };
                image.src = path;
            });
        };
        RealisticStone.prototype.stone = function (canvasCtx, boardConfig, boardObject) {
            var _this = this;
            var count = this.paths.length;
            if (count) {
                var stoneRadius = boardConfig.theme.stoneSize;
                var idx = this.randSeed % (count + boardObject.x * boardConfig.size + boardObject.y) % count;
                if (this.images[this.paths[idx]]) {
                    canvasCtx.drawImage(this.images[this.paths[idx]], -stoneRadius, -stoneRadius, 2 * stoneRadius, 2 * stoneRadius);
                }
                else {
                    this.fallback.stone(canvasCtx, boardConfig, boardObject);
                    var path_1 = this.paths[idx];
                    return this.loadImage(path_1).then(function (image) {
                        _this.images[path_1] = image;
                    }).catch(function () {
                        _this.paths = _this.paths.filter(function (p) { return p !== path_1; });
                    });
                }
            }
            else {
                this.fallback.stone(canvasCtx, boardConfig, boardObject);
            }
        };
        return RealisticStone;
    }(Stone));
    //# sourceMappingURL=RealisticStone.js.map

    var MarkupDrawHandler = /** @class */ (function (_super) {
        __extends(MarkupDrawHandler, _super);
        function MarkupDrawHandler() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        MarkupDrawHandler.prototype.grid = function (canvasCtx, boardConfig, boardObject) {
            if (boardObject.variation === exports.Color.E) {
                canvasCtx.clearRect(-boardConfig.theme.stoneSize, -boardConfig.theme.stoneSize, boardConfig.theme.stoneSize * 2, boardConfig.theme.stoneSize * 2);
            }
        };
        MarkupDrawHandler.prototype.getColor = function (boardConfig, boardObject) {
            if (this.params.color) {
                return this.params.color;
            }
            if (boardObject.variation === exports.Color.B) {
                return boardConfig.theme.markupBlackColor;
            }
            if (boardObject.variation === exports.Color.W) {
                return boardConfig.theme.markupWhiteColor;
            }
            return boardConfig.theme.markupNoneColor;
        };
        return MarkupDrawHandler;
    }(DrawHandler));
    //# sourceMappingURL=MarkupDrawHandler.js.map

    var ShapeMarkup = /** @class */ (function (_super) {
        __extends(ShapeMarkup, _super);
        function ShapeMarkup() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ShapeMarkup.prototype.stone = function (canvasCtx, boardConfig, boardObject) {
            canvasCtx.strokeStyle = this.getColor(boardConfig, boardObject);
            canvasCtx.lineWidth = this.params.lineWidth || boardConfig.theme.markupLineWidth;
            canvasCtx.shadowBlur = 10;
            canvasCtx.shadowColor = canvasCtx.strokeStyle;
            canvasCtx.beginPath();
            this.drawShape(canvasCtx);
            canvasCtx.stroke();
            if (this.params.fillColor) {
                canvasCtx.fillStyle = this.params.fillColor;
                canvasCtx.fill();
            }
        };
        return ShapeMarkup;
    }(MarkupDrawHandler));
    //# sourceMappingURL=ShapeMarkup.js.map

    var Circle = /** @class */ (function (_super) {
        __extends(Circle, _super);
        function Circle() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Circle.prototype.drawShape = function (canvasCtx) {
            canvasCtx.arc(0, 0, 0.25, 0, 2 * Math.PI, true);
        };
        return Circle;
    }(ShapeMarkup));
    //# sourceMappingURL=Circle.js.map

    var Square = /** @class */ (function (_super) {
        __extends(Square, _super);
        function Square() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Square.prototype.drawShape = function (canvasCtx) {
            canvasCtx.rect(-0.25, -0.25, 0.5, 0.5);
        };
        return Square;
    }(ShapeMarkup));
    //# sourceMappingURL=Square.js.map

    var Triangle = /** @class */ (function (_super) {
        __extends(Triangle, _super);
        function Triangle() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Triangle.prototype.drawShape = function (canvasCtx) {
            canvasCtx.moveTo(0, -0.25);
            canvasCtx.lineTo(-0.25, 0.166666);
            canvasCtx.lineTo(0.25, 0.166666);
            canvasCtx.closePath();
        };
        return Triangle;
    }(ShapeMarkup));
    //# sourceMappingURL=Triangle.js.map

    var Label = /** @class */ (function (_super) {
        __extends(Label, _super);
        function Label() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Label.prototype.stone = function (canvasCtx, boardConfig, boardObject) {
            var font = this.params.font || boardConfig.theme.font || '';
            canvasCtx.fillStyle = this.getColor(boardConfig, boardObject);
            canvasCtx.shadowBlur = 10;
            canvasCtx.shadowColor = canvasCtx.fillStyle;
            var fontSize = 0.5;
            if (boardObject.text.length === 1) {
                fontSize = 0.75;
            }
            else if (boardObject.text.length === 2) {
                fontSize = 0.6;
            }
            canvasCtx.beginPath();
            canvasCtx.textBaseline = 'middle';
            canvasCtx.textAlign = 'center';
            canvasCtx.font = fontSize + "px " + font;
            canvasCtx.fillText(boardObject.text, 0, 0.02 + (fontSize - 0.5) * 0.08, 1);
        };
        return Label;
    }(MarkupDrawHandler));
    //# sourceMappingURL=Label.js.map

    /**
     * TODO: rename this
     */
    var Dot = /** @class */ (function (_super) {
        __extends(Dot, _super);
        function Dot() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Dot.prototype.stone = function (canvasCtx) {
            canvasCtx.fillStyle = this.params.color;
            canvasCtx.shadowBlur = 10;
            canvasCtx.shadowColor = canvasCtx.fillStyle;
            canvasCtx.beginPath();
            canvasCtx.arc(0, 0, 0.15, 0, 2 * Math.PI, true);
            canvasCtx.fill();
        };
        return Dot;
    }(DrawHandler));
    //# sourceMappingURL=Dot.js.map

    var XMark = /** @class */ (function (_super) {
        __extends(XMark, _super);
        function XMark() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        XMark.prototype.drawShape = function (canvasCtx) {
            canvasCtx.moveTo(-0.20, -0.20);
            canvasCtx.lineTo(0.20, 0.20);
            canvasCtx.moveTo(0.20, -0.20);
            canvasCtx.lineTo(-0.20, 0.20);
        };
        return XMark;
    }(ShapeMarkup));
    //# sourceMappingURL=XMark.js.map

    var Line = /** @class */ (function (_super) {
        __extends(Line, _super);
        function Line() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Line.prototype.stone = function (canvasCtx, boardConfig, boardObject) {
            canvasCtx.strokeStyle = this.params.color ? this.params.color : boardConfig.theme.markupNoneColor;
            canvasCtx.lineWidth = this.params.lineWidth || boardConfig.theme.markupLineWidth;
            canvasCtx.shadowBlur = 10;
            canvasCtx.shadowColor = canvasCtx.strokeStyle;
            canvasCtx.beginPath();
            canvasCtx.moveTo(boardObject.start.x, boardObject.start.y);
            canvasCtx.lineTo(boardObject.end.x, boardObject.end.y);
            canvasCtx.stroke();
        };
        return Line;
    }(DrawHandler));
    //# sourceMappingURL=Line.js.map

    var Arrow = /** @class */ (function (_super) {
        __extends(Arrow, _super);
        function Arrow() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Arrow.prototype.stone = function (canvasCtx, boardConfig, boardObject) {
            canvasCtx.strokeStyle = this.params.color ? this.params.color : boardConfig.theme.markupNoneColor;
            canvasCtx.fillStyle = canvasCtx.strokeStyle;
            canvasCtx.lineWidth = this.params.lineWidth || boardConfig.theme.markupLineWidth;
            canvasCtx.shadowBlur = 10;
            canvasCtx.shadowColor = canvasCtx.strokeStyle;
            var x1 = boardObject.start.x;
            var y1 = boardObject.start.y;
            var x2 = boardObject.end.x;
            var y2 = boardObject.end.y;
            // length of the main line
            var length = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
            // line parametric functions
            var getLineX = function (t) { return x1 + t * (x2 - x1); };
            var getLineY = function (t) { return y1 + t * (y2 - y1); };
            // triangle base line position on the main line
            var triangleLen = 1 / length / 2.5;
            var tx = getLineX(1 - triangleLen);
            var ty = getLineY(1 - triangleLen);
            // triangle base line parametric functions
            var getBaseLineX = function (t) { return tx + t * (y2 - y1); };
            var getBaseLineY = function (t) { return ty + t * (x1 - x2); };
            // initial circle length
            var circleLen = 0.1;
            // draw initial circle
            canvasCtx.beginPath();
            canvasCtx.arc(x1, y1, circleLen, 0, 2 * Math.PI, true);
            canvasCtx.fill();
            // draw line
            canvasCtx.beginPath();
            canvasCtx.moveTo(getLineX(1 / length * circleLen), getLineY(1 / length * circleLen));
            canvasCtx.lineTo(tx, ty);
            canvasCtx.stroke();
            // draw triangle at the end to make arrow
            canvasCtx.beginPath();
            canvasCtx.moveTo(getBaseLineX(-triangleLen / 1.75), getBaseLineY(-triangleLen / 1.75));
            canvasCtx.lineTo(getBaseLineX(triangleLen / 1.75), getBaseLineY(triangleLen / 1.75));
            canvasCtx.lineTo(x2, y2);
            canvasCtx.closePath();
            canvasCtx.fill();
        };
        return Arrow;
    }(DrawHandler));
    //# sourceMappingURL=Arrow.js.map

    var Dim = /** @class */ (function (_super) {
        __extends(Dim, _super);
        function Dim() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Dim.prototype.stone = function (canvasCtx) {
            canvasCtx.fillStyle = this.params.color;
            canvasCtx.fillRect(-0.5, -0.5, 1, 1);
        };
        return Dim;
    }(DrawHandler));
    //# sourceMappingURL=Dim.js.map

    //# sourceMappingURL=index.js.map

    var index = /*#__PURE__*/Object.freeze({
        DrawHandler: DrawHandler,
        ShellStoneBlack: ShellStoneBlack,
        ShellStoneWhite: ShellStoneWhite,
        GlassStoneBlack: GlassStoneBlack,
        GlassStoneWhite: GlassStoneWhite,
        PaintedStoneBlack: PaintedStoneBlack,
        PaintedStoneWhite: PaintedStoneWhite,
        SimpleStone: SimpleStone,
        RealisticStone: RealisticStone,
        Circle: Circle,
        Square: Square,
        Triangle: Triangle,
        Label: Label,
        Dot: Dot,
        XMark: XMark,
        Line: Line,
        Arrow: Arrow,
        Stone: Stone,
        MarkupDrawHandler: MarkupDrawHandler,
        ShapeMarkup: ShapeMarkup,
        Dim: Dim
    });

    var baseTheme = __assign({}, defaultBoardBaseTheme, { snapToGrid: false, linesShift: -0.5, drawHandlers: {
            B: new SimpleStone('#222'),
            W: new SimpleStone('#eee'),
            CR: new Circle(),
            SQ: new Square(),
            LB: new Label(),
            TR: new Triangle(),
            MA: new XMark({ lineWidth: 0.075 }),
            SL: new Dot({ color: 'rgba(32, 32, 192, 0.75)' }),
            LN: new Line(),
            AR: new Arrow(),
            DD: new Dim({ color: 'rgba(0, 0, 0, 0.5)' }),
        } });
    //# sourceMappingURL=baseTheme.js.map

    var realisticTheme = __assign({}, baseTheme, { font: 'calibri', backgroundImage: 'images/wood1.jpg', stoneSize: 0.48, drawHandlers: __assign({}, baseTheme.drawHandlers, { B: new RealisticStone([
                'images/stones/black00_128.png',
                'images/stones/black01_128.png',
                'images/stones/black02_128.png',
                'images/stones/black03_128.png',
            ], new GlassStoneBlack()), W: new RealisticStone([
                'images/stones/white00_128.png',
                'images/stones/white01_128.png',
                'images/stones/white02_128.png',
                'images/stones/white03_128.png',
                'images/stones/white04_128.png',
                'images/stones/white05_128.png',
                'images/stones/white06_128.png',
                'images/stones/white07_128.png',
                'images/stones/white08_128.png',
                'images/stones/white09_128.png',
                'images/stones/white10_128.png',
            ], new GlassStoneWhite()) }) });
    //# sourceMappingURL=realisticTheme.js.map

    var modernTheme = __assign({}, baseTheme, { font: 'calibri', backgroundImage: '', drawHandlers: __assign({}, baseTheme.drawHandlers, { B: new ShellStoneBlack(), W: new ShellStoneWhite() }) });
    //# sourceMappingURL=modernTheme.js.map

    // add here all themes, which should be publicly exposed
    //# sourceMappingURL=index.js.map

    var index$1 = /*#__PURE__*/Object.freeze({
        baseTheme: baseTheme,
        realisticTheme: realisticTheme,
        modernTheme: modernTheme
    });

    /**
     * Contains implementation of go board.
     * @module CanvasBoard
     */
    var canvasBoardDefaultConfig = __assign({}, defaultBoardBaseConfig, { theme: baseTheme });
    var zIndexSorter = function (obj1, obj2) { return obj1.zIndex - obj2.zIndex; };
    var CanvasBoard = /** @class */ (function (_super) {
        __extends(CanvasBoard, _super);
        /**
           * CanvasBoard class constructor - it creates a canvas board.
           */
        function CanvasBoard(elem, config) {
            if (config === void 0) { config = {}; }
            var _this = _super.call(this, elem, makeConfig(canvasBoardDefaultConfig, config)) || this;
            _this.objects = [];
            // init board HTML
            _this.wrapperElement = document.createElement('div');
            _this.wrapperElement.className = 'wgo-board';
            _this.wrapperElement.style.position = 'relative';
            _this.element.appendChild(_this.wrapperElement);
            _this.boardElement = document.createElement('div');
            _this.boardElement.style.position = 'absolute';
            _this.boardElement.style.left = '0';
            _this.boardElement.style.top = '0';
            _this.boardElement.style.right = '0';
            _this.boardElement.style.bottom = '0';
            _this.boardElement.style.margin = 'auto';
            _this.wrapperElement.appendChild(_this.boardElement);
            _this.layers = {
                grid: new GridLayer(_this),
                shadow: new ShadowLayer(_this),
                stone: new CanvasLayer(_this),
            };
            // set the pixel ratio for HDPI (e.g. Retina) screens
            _this.pixelRatio = window.devicePixelRatio || 1;
            _this.resize();
            return _this;
        }
        /**
         * Updates dimensions and redraws everything
         */
        CanvasBoard.prototype.resize = function () {
            var _this = this;
            var marginSize = this.config.theme.marginSize;
            var countX = this.config.size - this.config.viewport.left - this.config.viewport.right;
            var countY = this.config.size - this.config.viewport.top - this.config.viewport.bottom;
            var topOffset = marginSize + (this.config.coordinates && !this.config.viewport.top ? 0.5 : 0);
            var rightOffset = marginSize + (this.config.coordinates && !this.config.viewport.right ? 0.5 : 0);
            var bottomOffset = marginSize + (this.config.coordinates && !this.config.viewport.bottom ? 0.5 : 0);
            var leftOffset = marginSize + (this.config.coordinates && !this.config.viewport.left ? 0.5 : 0);
            if (this.config.width && this.config.height) {
                // exact dimensions
                this.width = this.config.width * this.pixelRatio;
                this.height = this.config.height * this.pixelRatio;
                this.fieldSize = Math.min(this.width / (countX + leftOffset + rightOffset), this.height / (countY + topOffset + bottomOffset));
                if (this.resizeCallback) {
                    window.removeEventListener('resize', this.resizeCallback);
                }
            }
            else if (this.config.width) {
                this.width = this.config.width * this.pixelRatio;
                this.fieldSize = this.width / (countX + leftOffset + rightOffset);
                this.height = this.fieldSize * (countY + topOffset + bottomOffset);
                if (this.resizeCallback) {
                    window.removeEventListener('resize', this.resizeCallback);
                }
            }
            else if (this.config.height) {
                this.height = this.config.height * this.pixelRatio;
                this.fieldSize = this.height / (countY + topOffset + bottomOffset);
                this.width = this.fieldSize * (countX + leftOffset + rightOffset);
                if (this.resizeCallback) {
                    window.removeEventListener('resize', this.resizeCallback);
                }
            }
            else {
                this.wrapperElement.style.width = 'auto';
                this.width = this.wrapperElement.offsetWidth * this.pixelRatio;
                this.fieldSize = this.width / (countX + leftOffset + rightOffset);
                this.height = this.fieldSize * (countY + topOffset + bottomOffset);
                if (!this.resizeCallback) {
                    this.resizeCallback = function () {
                        _this.resize();
                    };
                    window.addEventListener('resize', this.resizeCallback);
                }
            }
            if (this.config.theme.snapToGrid) {
                this.fieldSize = Math.floor(this.fieldSize);
            }
            this.leftOffset = this.fieldSize * (leftOffset + 0.5 - this.config.viewport.left);
            this.topOffset = this.fieldSize * (topOffset + 0.5 - this.config.viewport.top);
            this.wrapperElement.style.width = (this.width / this.pixelRatio) + "px";
            this.wrapperElement.style.height = (this.height / this.pixelRatio) + "px";
            var boardWidth = (countX + leftOffset + rightOffset) * this.fieldSize;
            var boardHeight = (countY + topOffset + bottomOffset) * this.fieldSize;
            this.boardElement.style.width = (boardWidth / this.pixelRatio) + "px";
            this.boardElement.style.height = (boardHeight / this.pixelRatio) + "px";
            Object.keys(this.layers).forEach(function (layer) {
                _this.layers[layer].resize(boardWidth, boardHeight);
            });
            this.redraw();
        };
        /**
           * Get absolute X coordinate
           *
           * @param {number} x relative coordinate
           */
        CanvasBoard.prototype.getX = function (x) {
            return this.leftOffset + x * this.fieldSize;
        };
        /**
           * Get absolute Y coordinate
           *
           * @param {number} y relative coordinate
           */
        CanvasBoard.prototype.getY = function (y) {
            return this.topOffset + y * this.fieldSize;
        };
        /**
         * Redraw everything.
         */
        CanvasBoard.prototype.redraw = function () {
            var _this = this;
            if (!this.redrawScheduled) {
                this.redrawScheduled = true;
                window.requestAnimationFrame(function () {
                    _this.redrawScheduled = false;
                    // set correct background
                    _this.boardElement.style.backgroundColor = _this.config.theme.backgroundColor;
                    if (_this.config.theme.backgroundImage) {
                        _this.boardElement.style.backgroundImage = "url(\"" + _this.config.theme.backgroundImage + "\")";
                    }
                    // sort objects by zIndex
                    _this.objects.sort(zIndexSorter);
                    // redraw all layers
                    Object.keys(_this.layers).forEach(function (layer) {
                        _this.layers[layer].clear();
                        _this.objects.forEach(function (object) {
                            var handler = typeof object.type === 'string' ? _this.config.theme.drawHandlers[object.type] : object.type;
                            if (handler[layer]) {
                                _this.layers[layer].draw(handler[layer].bind(handler), object);
                            }
                        });
                    });
                });
            }
        };
        CanvasBoard.prototype.addObject = function (boardObject) {
            if (!Array.isArray(boardObject)) {
                if (typeof boardObject.type === 'string') {
                    if (!this.config.theme.drawHandlers[boardObject.type]) {
                        // tslint:disable-next-line:max-line-length
                        throw new TypeError("Board object type \"" + boardObject.type + "\" doesn't exist in `config.theme.drawHandlers`.");
                    }
                }
                else {
                    if (boardObject.type == null || !(boardObject.type instanceof DrawHandler)) {
                        throw new TypeError('Invalid board object type.');
                    }
                }
            }
            _super.prototype.addObject.call(this, boardObject);
            this.redraw();
        };
        CanvasBoard.prototype.removeObject = function (boardObject) {
            _super.prototype.removeObject.call(this, boardObject);
            this.redraw();
        };
        CanvasBoard.prototype.removeAllObjects = function () {
            _super.prototype.removeAllObjects.call(this);
            this.redraw();
        };
        CanvasBoard.prototype.on = function (type, callback) {
            _super.prototype.on.call(this, type, callback);
            this.registerBoardListener(type);
        };
        CanvasBoard.prototype.registerBoardListener = function (type) {
            var _this = this;
            this.boardElement.addEventListener(type, function (evt) {
                if (evt.layerX != null) {
                    var pos = _this.getRelativeCoordinates(evt.layerX, evt.layerY);
                    _this.emit(type, evt, pos);
                }
                else {
                    _this.emit(type, evt);
                }
            });
        };
        CanvasBoard.prototype.getRelativeCoordinates = function (absoluteX, absoluteY) {
            // new hopefully better translation of coordinates
            var x = Math.round((absoluteX * this.pixelRatio - this.leftOffset) / this.fieldSize);
            var y = Math.round((absoluteY * this.pixelRatio - this.topOffset) / this.fieldSize);
            if (x < 0 || x >= this.config.size || y < 0 || y >= this.config.size) {
                return null;
            }
            return { x: x, y: y };
        };
        CanvasBoard.prototype.setSize = function (size) {
            _super.prototype.setSize.call(this, size);
            this.resize();
        };
        CanvasBoard.prototype.setViewport = function (viewport) {
            _super.prototype.setViewport.call(this, viewport);
            this.resize();
        };
        CanvasBoard.prototype.setCoordinates = function (coordinates) {
            _super.prototype.setCoordinates.call(this, coordinates);
            this.resize();
        };
        return CanvasBoard;
    }(BoardBase));
    //# sourceMappingURL=CanvasBoard.js.map

    //# sourceMappingURL=index.js.map

    var NS = 'http://www.w3.org/2000/svg';
    var OBJECTS = 'objects';
    var GRID_MASK = 'gridMask';
    var SHADOWS = 'shadows';
    //# sourceMappingURL=types.js.map

    function line(fromX, fromY, toX, toY) {
        var line = document.createElementNS(NS, 'line');
        line.setAttribute('x1', fromX);
        line.setAttribute('y1', fromY);
        line.setAttribute('x2', toX);
        line.setAttribute('y2', toY);
        return line;
    }
    function star(x, y, starSize) {
        var star = document.createElementNS(NS, 'circle');
        star.setAttribute('cx', x);
        star.setAttribute('cy', y);
        star.setAttribute('r', starSize);
        star.setAttribute('fill', '#553310');
        star.setAttribute('stroke-width', '0');
        return star;
    }
    function createGrid(config) {
        var linesWidth = config.theme.grid.linesWidth;
        var grid = document.createElementNS(NS, 'g');
        grid.setAttribute('stroke', config.theme.grid.linesColor);
        grid.setAttribute('stroke-width', linesWidth.toString());
        grid.setAttribute('fill', config.theme.grid.starColor);
        for (var i = 0; i < config.size; i++) {
            grid.appendChild(line(i, 0 - linesWidth / 2, i, config.size - 1 + linesWidth / 2));
            grid.appendChild(line(0 - linesWidth / 2, i, config.size - 1 + linesWidth / 2, i));
        }
        var starPoints = config.starPoints[config.size];
        if (starPoints) {
            starPoints.forEach(function (starPoint) {
                grid.appendChild(star(starPoint.x, starPoint.y, config.theme.grid.starSize));
            });
        }
        return grid;
    }
    //# sourceMappingURL=createGrid.js.map

    function letter(x, y, str) {
        var text = document.createElementNS(NS, 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.textContent = str;
        return text;
    }
    function createCoordinates(config) {
        var coordinates = document.createElementNS(NS, 'g');
        coordinates.style.userSelect = 'none';
        coordinates.setAttribute('font-family', config.theme.font);
        coordinates.setAttribute('font-size', config.theme.coordinates.fontSize);
        coordinates.setAttribute('text-anchor', 'middle');
        coordinates.setAttribute('dominant-baseline', 'middle');
        if (config.theme.coordinates.bold) {
            coordinates.setAttribute('font-weight', 'bold');
        }
        coordinates.setAttribute('fill', config.theme.coordinates.color);
        for (var i = 0; i < config.size; i++) {
            coordinates.appendChild(letter(i, -0.75, config.coordinateLabelsX[i]));
            coordinates.appendChild(letter(i, config.size - 0.25, config.coordinateLabelsX[i]));
            coordinates.appendChild(letter(-0.75, config.size - i - 1, config.coordinateLabelsY[i]));
            coordinates.appendChild(letter(config.size - 0.25, config.size - i - 1, config.coordinateLabelsY[i]));
        }
        return coordinates;
    }
    //# sourceMappingURL=createCoordinates.js.map

    var SVGFieldDrawHandler = /** @class */ (function () {
        function SVGFieldDrawHandler() {
        }
        SVGFieldDrawHandler.prototype.updateElement = function (elem, boardObject, config) {
            var transform = "translate(" + boardObject.x + ", " + boardObject.y + ")";
            var scale = "scale(" + boardObject.scaleX + ", " + boardObject.scaleY + ")";
            var rotate = "rotate(" + boardObject.rotate + ")";
            Object.keys(elem).forEach(function (ctx) {
                elem[ctx].setAttribute('transform', transform + " " + scale + " " + rotate);
                elem[ctx].setAttribute('opacity', boardObject.opacity);
            });
        };
        return SVGFieldDrawHandler;
    }());
    //# sourceMappingURL=SVGFieldDrawHandler.js.map

    function generateId(prefix) {
        return prefix + "-" + Math.floor(Math.random() * 1000000000).toString(36);
    }
    //# sourceMappingURL=generateId.js.map

    var SVGStoneDrawHandler = /** @class */ (function (_super) {
        __extends(SVGStoneDrawHandler, _super);
        function SVGStoneDrawHandler() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        SVGStoneDrawHandler.prototype.createElement = function (config, addDef) {
            /*if (!this.shadowFilterElement) {
              this.shadowFilterElement = document.createElementNS(NS, 'filter');
              this.shadowFilterElement.setAttribute('id', generateId('filter'));
              this.shadowFilterElement.innerHTML = `
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.05" />
                <feOffset dx="0.03" dy="0.03" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.5" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              `;
        
              addDef(this.shadowFilterElement);
            }*/
            return null;
        };
        SVGStoneDrawHandler.prototype.createShadow = function (config, addDef) {
            var stoneRadius = config.theme.stoneSize;
            if (!this.shadowFilterElement) {
                var shadowFilterElement = document.createElementNS(NS, 'radialGradient');
                var blur_1 = config.theme.shadowBlur;
                var startRadius = Math.max(stoneRadius - stoneRadius * blur_1, 0.00001);
                var stopRadius = stoneRadius + (1 / 7 * stoneRadius) * blur_1;
                shadowFilterElement.setAttribute('id', generateId('shadowFilter'));
                shadowFilterElement.setAttribute('fr', String(startRadius));
                shadowFilterElement.setAttribute('r', String(stopRadius));
                shadowFilterElement.innerHTML = "\n        <stop offset=\"0%\" stop-color=\"" + config.theme.shadowColor + "\" />\n        <stop offset=\"100%\" stop-color=\"" + config.theme.shadowTransparentColor + "\" />\n      ";
                addDef(shadowFilterElement);
                this.shadowFilterElement = shadowFilterElement;
            }
            var shadow = document.createElementNS(NS, 'circle');
            shadow.setAttribute('cx', String(config.theme.shadowOffsetX));
            shadow.setAttribute('cy', String(config.theme.shadowOffsetY));
            shadow.setAttribute('r', String(stoneRadius));
            shadow.setAttribute('fill', "url(#" + this.shadowFilterElement.id + ")");
            return shadow;
        };
        return SVGStoneDrawHandler;
    }(SVGFieldDrawHandler));
    //# sourceMappingURL=SVGStoneDrawHandler.js.map

    var GlassStoneBlack$1 = /** @class */ (function (_super) {
        __extends(GlassStoneBlack, _super);
        function GlassStoneBlack() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        GlassStoneBlack.prototype.createElement = function (config, addDef) {
            _super.prototype.createElement.call(this, config, addDef);
            if (!this.filterElement) {
                var filter = document.createElementNS(NS, 'filter');
                filter.setAttribute('id', generateId('filter'));
                filter.setAttribute('x', '-300%');
                filter.setAttribute('y', '-300%');
                filter.setAttribute('width', '600%');
                filter.setAttribute('height', '600%');
                var blur_1 = document.createElementNS(NS, 'feGaussianBlur');
                blur_1.setAttribute('in', 'SourceGraphic');
                blur_1.setAttribute('stdDeviation', 0.3 * config.theme.stoneSize);
                filter.appendChild(blur_1);
                this.filterElement = filter;
                addDef(filter);
            }
            var stoneGroup = document.createElementNS(NS, 'g');
            var stone = document.createElementNS(NS, 'circle');
            stone.setAttribute('cx', '0');
            stone.setAttribute('cy', '0');
            stone.setAttribute('fill', '#000');
            stone.setAttribute('r', config.theme.stoneSize);
            stoneGroup.appendChild(stone);
            var glow1 = document.createElementNS(NS, 'circle');
            glow1.setAttribute('cx', -0.4 * config.theme.stoneSize);
            glow1.setAttribute('cy', -0.4 * config.theme.stoneSize);
            glow1.setAttribute('r', 0.25 * config.theme.stoneSize);
            glow1.setAttribute('fill', '#fff');
            glow1.setAttribute('filter', "url(#" + this.filterElement.id + ")");
            stoneGroup.appendChild(glow1);
            var glow2 = document.createElementNS(NS, 'circle');
            glow2.setAttribute('cx', 0.4 * config.theme.stoneSize);
            glow2.setAttribute('cy', 0.4 * config.theme.stoneSize);
            glow2.setAttribute('r', 0.15 * config.theme.stoneSize);
            glow2.setAttribute('fill', '#fff');
            glow2.setAttribute('filter', "url(#" + this.filterElement.id + ")");
            stoneGroup.appendChild(glow2);
            return stoneGroup;
        };
        return GlassStoneBlack;
    }(SVGStoneDrawHandler));
    //# sourceMappingURL=GlassStoneBlack.js.map

    var GlassStoneWhite$1 = /** @class */ (function (_super) {
        __extends(GlassStoneWhite, _super);
        function GlassStoneWhite() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        GlassStoneWhite.prototype.createElement = function (config, addDef) {
            _super.prototype.createElement.call(this, config, addDef);
            if (!this.filterElement1) {
                var filter1 = document.createElementNS(NS, 'radialGradient');
                filter1.setAttribute('id', generateId('filter'));
                filter1.setAttribute('fx', '30%');
                filter1.setAttribute('fy', '30%');
                filter1.innerHTML = "\n        <stop offset=\"10%\" stop-color=\"rgba(255,255,255,0.9)\" />\n        <stop offset=\"100%\" stop-color=\"rgba(255,255,255,0)\" />\n      ";
                addDef(filter1);
                this.filterElement1 = filter1;
                var filter2 = document.createElementNS(NS, 'radialGradient');
                filter2.setAttribute('id', generateId('filter'));
                filter2.setAttribute('fx', '70%');
                filter2.setAttribute('fy', '70%');
                filter2.innerHTML = "\n        <stop offset=\"10%\" stop-color=\"rgba(255,255,255,0.7)\" />\n        <stop offset=\"100%\" stop-color=\"rgba(255,255,255,0)\" />\n      ";
                addDef(filter2);
                this.filterElement2 = filter2;
            }
            var stoneGroup = document.createElementNS(NS, 'g');
            var stone = document.createElementNS(NS, 'circle');
            stone.setAttribute('cx', '0');
            stone.setAttribute('cy', '0');
            stone.setAttribute('fill', '#ccc');
            stone.setAttribute('r', config.theme.stoneSize);
            stoneGroup.appendChild(stone);
            var glow1 = document.createElementNS(NS, 'circle');
            glow1.setAttribute('cx', '0');
            glow1.setAttribute('cy', '0');
            glow1.setAttribute('r', config.theme.stoneSize);
            glow1.setAttribute('fill', "url(#" + this.filterElement1.id + ")");
            stoneGroup.appendChild(glow1);
            var glow2 = document.createElementNS(NS, 'circle');
            glow2.setAttribute('cx', '0');
            glow2.setAttribute('cy', '0');
            glow2.setAttribute('r', config.theme.stoneSize);
            glow2.setAttribute('fill', "url(#" + this.filterElement2.id + ")");
            stoneGroup.appendChild(glow2);
            return stoneGroup;
        };
        return GlassStoneWhite;
    }(SVGStoneDrawHandler));
    //# sourceMappingURL=GlassStoneWhite.js.map

    var SVGMarkupDrawHandler = /** @class */ (function (_super) {
        __extends(SVGMarkupDrawHandler, _super);
        function SVGMarkupDrawHandler(params) {
            if (params === void 0) { params = {}; }
            var _this = _super.call(this) || this;
            _this.params = params;
            return _this;
        }
        SVGMarkupDrawHandler.prototype.updateElement = function (elem, boardObject, config) {
            _super.prototype.updateElement.call(this, elem, boardObject, config);
            if (boardObject.variation === exports.Color.B) {
                elem[OBJECTS].setAttribute('stroke', config.theme.markupBlackColor);
                elem[OBJECTS].setAttribute('fill', this.params.fillColor || 'rgba(0,0,0,0)');
            }
            else if (boardObject.variation === exports.Color.W) {
                elem[OBJECTS].setAttribute('stroke', config.theme.markupWhiteColor);
                elem[OBJECTS].setAttribute('fill', this.params.fillColor || 'rgba(0,0,0,0)');
            }
            else {
                elem[OBJECTS].setAttribute('stroke', this.params.color || config.theme.markupNoneColor);
                elem[OBJECTS].setAttribute('fill', this.params.fillColor || 'rgba(0,0,0,0)');
            }
            elem[OBJECTS].setAttribute('stroke-width', this.params.lineWidth || config.theme.markupLineWidth);
        };
        return SVGMarkupDrawHandler;
    }(SVGFieldDrawHandler));
    //# sourceMappingURL=SVGMarkupDrawHandler.js.map

    var Circle$1 = /** @class */ (function (_super) {
        __extends(Circle, _super);
        function Circle() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Circle.prototype.createElement = function (config) {
            var _a;
            var circle = document.createElementNS(NS, 'circle');
            circle.setAttribute('cx', '0');
            circle.setAttribute('cy', '0');
            circle.setAttribute('r', '0.25');
            var mask = document.createElementNS(NS, 'circle');
            mask.setAttribute('cx', '0');
            mask.setAttribute('cy', '0');
            mask.setAttribute('r', '0.35');
            mask.setAttribute('fill', "rgba(0,0,0," + config.theme.markupGridMask + ")");
            return _a = {},
                _a[OBJECTS] = circle,
                _a[GRID_MASK] = mask,
                _a;
        };
        return Circle;
    }(SVGMarkupDrawHandler));
    //# sourceMappingURL=Circle.js.map

    var Square$1 = /** @class */ (function (_super) {
        __extends(Square, _super);
        function Square() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Square.prototype.createElement = function (config) {
            var _a;
            var square = document.createElementNS(NS, 'rect');
            square.setAttribute('x', '-0.25');
            square.setAttribute('y', '-0.25');
            square.setAttribute('width', '0.50');
            square.setAttribute('height', '0.50');
            var mask = document.createElementNS(NS, 'rect');
            mask.setAttribute('x', '-0.35');
            mask.setAttribute('y', '-0.35');
            mask.setAttribute('width', '0.70');
            mask.setAttribute('height', '0.70');
            mask.setAttribute('fill', "rgba(0,0,0," + config.theme.markupGridMask + ")");
            return _a = {},
                _a[OBJECTS] = square,
                _a[GRID_MASK] = mask,
                _a;
        };
        return Square;
    }(SVGMarkupDrawHandler));
    //# sourceMappingURL=Square.js.map

    var Triangle$1 = /** @class */ (function (_super) {
        __extends(Triangle, _super);
        function Triangle() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Triangle.prototype.createElement = function (config) {
            var _a;
            var triangle = document.createElementNS(NS, 'polygon');
            triangle.setAttribute('points', '0,-0.25 -0.25,0.166666 0.25,0.166666');
            var mask = document.createElementNS(NS, 'polygon');
            mask.setAttribute('points', '0,-0.35 -0.35,0.2333333 0.35,0.2333333');
            mask.setAttribute('fill', "rgba(0,0,0," + config.theme.markupGridMask + ")");
            return _a = {},
                _a[OBJECTS] = triangle,
                _a[GRID_MASK] = mask,
                _a;
        };
        return Triangle;
    }(SVGMarkupDrawHandler));
    //# sourceMappingURL=Triangle.js.map

    var XMark$1 = /** @class */ (function (_super) {
        __extends(XMark, _super);
        function XMark() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        XMark.prototype.createElement = function (config) {
            var _a;
            var path = document.createElementNS(NS, 'path');
            path.setAttribute('d', 'M -0.20,-0.20 L 0.20,0.20 M 0.20,-0.20 L -0.20,0.20');
            var mask = document.createElementNS(NS, 'circle');
            mask.setAttribute('cx', '0');
            mask.setAttribute('cy', '0');
            mask.setAttribute('r', '0.15');
            mask.setAttribute('fill', "rgba(0,0,0," + config.theme.markupGridMask + ")");
            return _a = {},
                _a[OBJECTS] = path,
                _a[GRID_MASK] = mask,
                _a;
        };
        return XMark;
    }(SVGMarkupDrawHandler));
    //# sourceMappingURL=XMark.js.map

    var Dot$1 = /** @class */ (function (_super) {
        __extends(Dot, _super);
        function Dot(params) {
            var _this = _super.call(this) || this;
            _this.params = params;
            return _this;
        }
        Dot.prototype.createElement = function () {
            var circle = document.createElementNS(NS, 'circle');
            circle.setAttribute('cx', '0');
            circle.setAttribute('cy', '0');
            circle.setAttribute('r', '0.15');
            circle.setAttribute('fill', this.params.color);
            return circle;
        };
        return Dot;
    }(SVGFieldDrawHandler));
    //# sourceMappingURL=Dot.js.map

    var Dim$1 = /** @class */ (function (_super) {
        __extends(Dim, _super);
        function Dim(params) {
            var _this = _super.call(this) || this;
            _this.params = params;
            return _this;
        }
        Dim.prototype.createElement = function () {
            var rect = document.createElementNS(NS, 'rect');
            rect.setAttribute('x', '-0.5');
            rect.setAttribute('y', '-0.5');
            rect.setAttribute('width', '1');
            rect.setAttribute('height', '1');
            rect.setAttribute('fill', this.params.color);
            return rect;
        };
        return Dim;
    }(SVGFieldDrawHandler));
    //# sourceMappingURL=Dim.js.map

    var Line$1 = /** @class */ (function () {
        function Line(params) {
            if (params === void 0) { params = {}; }
            this.params = params;
        }
        Line.prototype.createElement = function () {
            var _a;
            var line = document.createElementNS(NS, 'line');
            var mask = document.createElementNS(NS, 'line');
            return _a = {},
                _a[OBJECTS] = line,
                _a[GRID_MASK] = mask,
                _a;
        };
        Line.prototype.updateElement = function (elem, boardObject, config) {
            elem[OBJECTS].setAttribute('stroke', this.params.color || config.theme.markupNoneColor);
            elem[OBJECTS].setAttribute('stroke-width', this.params.lineWidth || config.theme.markupLineWidth);
            elem[OBJECTS].setAttribute('x1', boardObject.start.x);
            elem[OBJECTS].setAttribute('y1', boardObject.start.y);
            elem[OBJECTS].setAttribute('x2', boardObject.end.x);
            elem[OBJECTS].setAttribute('y2', boardObject.end.y);
            elem[GRID_MASK].setAttribute('stroke', "rgba(0,0,0," + config.theme.markupGridMask + ")");
            elem[GRID_MASK].setAttribute('stroke-width', (this.params.lineWidth || config.theme.markupLineWidth) * 2);
            elem[GRID_MASK].setAttribute('x1', boardObject.start.x);
            elem[GRID_MASK].setAttribute('y1', boardObject.start.y);
            elem[GRID_MASK].setAttribute('x2', boardObject.end.x);
            elem[GRID_MASK].setAttribute('y2', boardObject.end.y);
        };
        return Line;
    }());
    //# sourceMappingURL=Line.js.map

    var Arrow$1 = /** @class */ (function () {
        function Arrow(params) {
            if (params === void 0) { params = {}; }
            this.params = params;
        }
        Arrow.prototype.createElement = function () {
            var _a;
            return _a = {},
                _a[OBJECTS] = this.createSVGElements(),
                _a[GRID_MASK] = this.createSVGElements(),
                _a;
        };
        Arrow.prototype.createSVGElements = function () {
            var group = document.createElementNS(NS, 'g');
            var startCircle = document.createElementNS(NS, 'circle');
            var line = document.createElementNS(NS, 'line');
            var endTriangle = document.createElementNS(NS, 'polygon');
            group.appendChild(startCircle);
            group.appendChild(line);
            group.appendChild(endTriangle);
            return group;
        };
        Arrow.prototype.updateElement = function (elem, boardObject, config) {
            // basic UI definitions
            elem[OBJECTS].setAttribute('stroke', this.params.color || config.theme.markupNoneColor);
            elem[OBJECTS].setAttribute('fill', this.params.color || config.theme.markupNoneColor);
            elem[OBJECTS].setAttribute('stroke-width', this.params.lineWidth || config.theme.markupLineWidth);
            this.updateSVGElements(elem[OBJECTS], boardObject);
            elem[GRID_MASK].setAttribute('stroke', "rgba(0,0,0," + config.theme.markupGridMask + ")");
            elem[GRID_MASK].setAttribute('fill', "rgba(0,0,0," + config.theme.markupGridMask + ")");
            elem[GRID_MASK].setAttribute('stroke-width', (this.params.lineWidth || config.theme.markupLineWidth) * 3);
            this.updateSVGElements(elem[GRID_MASK], boardObject);
        };
        Arrow.prototype.updateSVGElements = function (elem, boardObject) {
            // SVG elements of arrow
            var startCircle = elem.children[0];
            var line = elem.children[1];
            var endTriangle = elem.children[2];
            var x1 = boardObject.start.x;
            var y1 = boardObject.start.y;
            var x2 = boardObject.end.x;
            var y2 = boardObject.end.y;
            // length of the main line
            var length = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
            // line parametric functions
            var getLineX = function (t) { return x1 + t * (x2 - x1); };
            var getLineY = function (t) { return y1 + t * (y2 - y1); };
            // triangle base line position on the main line
            var triangleLen = 1 / length / 2.5;
            var tx = getLineX(1 - triangleLen);
            var ty = getLineY(1 - triangleLen);
            // triangle base line parametric functions
            var getBaseLineX = function (t) { return tx + t * (y2 - y1); };
            var getBaseLineY = function (t) { return ty + t * (x1 - x2); };
            // initial circle length
            var circleLen = 0.1;
            // draw initial circle
            startCircle.setAttribute('cx', x1);
            startCircle.setAttribute('cy', y1);
            startCircle.setAttribute('r', circleLen);
            // draw line
            line.setAttribute('x1', getLineX(1 / length * circleLen));
            line.setAttribute('y1', getLineY(1 / length * circleLen));
            line.setAttribute('x2', tx);
            line.setAttribute('y2', ty);
            // draw triangle at the end to make arrow
            endTriangle.setAttribute('points', "\n      " + getBaseLineX(-triangleLen / 1.75) + "," + getBaseLineY(-triangleLen / 1.75) + "\n      " + getBaseLineX(triangleLen / 1.75) + "," + getBaseLineY(triangleLen / 1.75) + "\n      " + x2 + "," + y2 + "\n    ");
        };
        return Arrow;
    }());
    //# sourceMappingURL=Arrow.js.map

    var Label$1 = /** @class */ (function (_super) {
        __extends(Label, _super);
        function Label(params) {
            if (params === void 0) { params = {}; }
            return _super.call(this, params) || this;
        }
        Label.prototype.createElement = function (config) {
            var _a;
            var text = document.createElementNS(NS, 'text');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            var mask = document.createElementNS(NS, 'text');
            mask.setAttribute('text-anchor', 'middle');
            mask.setAttribute('dominant-baseline', 'middle');
            mask.setAttribute('stroke-width', '0.2');
            mask.setAttribute('stroke', "rgba(0,0,0," + config.theme.markupGridMask + ")");
            return _a = {},
                _a[OBJECTS] = text,
                _a[GRID_MASK] = mask,
                _a;
        };
        Label.prototype.updateElement = function (elem, boardObject, config) {
            _super.prototype.updateElement.call(this, elem, boardObject, config);
            var fontSize = 0.5;
            if (boardObject.text.length === 1) {
                fontSize = 0.7;
            }
            else if (boardObject.text.length === 2) {
                fontSize = 0.6;
            }
            elem[OBJECTS].setAttribute('fill', this.params.color || config.theme.markupNoneColor);
            elem[OBJECTS].setAttribute('font-family', this.params.font || config.theme.font);
            elem[OBJECTS].setAttribute('stroke-width', '0');
            elem[OBJECTS].setAttribute('font-size', fontSize);
            elem[OBJECTS].textContent = boardObject.text;
            elem[GRID_MASK].setAttribute('font-size', fontSize);
            elem[GRID_MASK].textContent = boardObject.text;
        };
        return Label;
    }(SVGMarkupDrawHandler));
    //# sourceMappingURL=Label.js.map

    var SimpleStone$1 = /** @class */ (function (_super) {
        __extends(SimpleStone, _super);
        function SimpleStone(color) {
            var _this = _super.call(this) || this;
            _this.color = color;
            return _this;
        }
        SimpleStone.prototype.createElement = function (config) {
            var stone = document.createElementNS(NS, 'circle');
            stone.setAttribute('cx', '0');
            stone.setAttribute('cy', '0');
            stone.setAttribute('r', config.theme.stoneSize);
            stone.setAttribute('fill', this.color);
            return stone;
        };
        return SimpleStone;
    }(SVGFieldDrawHandler));
    //# sourceMappingURL=SimpleStone.js.map

    var RealisticStone$1 = /** @class */ (function (_super) {
        __extends(RealisticStone, _super);
        function RealisticStone(paths, fallback) {
            var _this = _super.call(this) || this;
            _this.fallback = fallback;
            _this.randSeed = Math.ceil(Math.random() * 9999999);
            _this.paths = paths;
            _this.loadedPaths = {};
            return _this;
        }
        RealisticStone.prototype.createElement = function (config, addDef) {
            var _this = this;
            _super.prototype.createElement.call(this, config, addDef);
            var id = Math.floor(Math.random() * this.paths.length);
            var group = document.createElementNS(NS, 'g');
            var fallbackElement;
            if (!this.loadedPaths[id]) {
                fallbackElement = this.fallback.createElement(config, addDef);
                if (!(fallbackElement instanceof SVGElement)) {
                    fallbackElement = fallbackElement[OBJECTS];
                }
                group.appendChild(fallbackElement);
            }
            var image = document.createElementNS(NS, 'image');
            image.setAttribute('href', this.paths[id]);
            image.setAttribute('width', config.theme.stoneSize * 2);
            image.setAttribute('height', config.theme.stoneSize * 2);
            image.setAttribute('x', -config.theme.stoneSize);
            image.setAttribute('y', -config.theme.stoneSize);
            if (!this.loadedPaths[id]) {
                image.setAttribute('opacity', '0');
            }
            image.addEventListener('load', function () {
                if (fallbackElement) {
                    image.setAttribute('opacity', '1');
                    group.removeChild(fallbackElement);
                    _this.loadedPaths[id] = true;
                }
            });
            group.appendChild(image);
            return group;
        };
        return RealisticStone;
    }(SVGStoneDrawHandler));

    //# sourceMappingURL=index.js.map

    var GlassStoneWhite$2 = /** @class */ (function (_super) {
        __extends(GlassStoneWhite, _super);
        function GlassStoneWhite() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        GlassStoneWhite.prototype.createElement = function (config, addDef) {
            var _a;
            _super.prototype.createElement.call(this, config, addDef);
            if (!this.filterElement1) {
                var filter1 = document.createElementNS(NS, 'radialGradient');
                filter1.setAttribute('id', generateId('filter'));
                filter1.setAttribute('cx', '45%');
                filter1.setAttribute('cy', '45%');
                filter1.setAttribute('fx', '20%');
                filter1.setAttribute('fy', '20%');
                filter1.setAttribute('r', '60%');
                filter1.innerHTML = "\n        <stop offset=\"0%\" stop-color=\"rgba(255,255,255,1)\" />\n        <stop offset=\"80%\" stop-color=\"rgba(215,215,215,1)\" />\n        <stop offset=\"100%\" stop-color=\"rgba(170,170,170,1)\" />\n      ";
                addDef(filter1);
                this.filterElement1 = filter1;
            }
            var stoneGroup = document.createElementNS(NS, 'g');
            var stone = document.createElementNS(NS, 'circle');
            stone.setAttribute('cx', '0');
            stone.setAttribute('cy', '0');
            stone.setAttribute('fill', "url(#" + this.filterElement1.id + ")");
            stone.setAttribute('r', config.theme.stoneSize);
            stoneGroup.appendChild(stone);
            return _a = {},
                _a[OBJECTS] = stoneGroup,
                _a[SHADOWS] = this.createShadow(config, addDef),
                _a;
        };
        return GlassStoneWhite;
    }(SVGStoneDrawHandler));
    //# sourceMappingURL=ModernStoneWhite.js.map

    var GlassStoneWhite$3 = /** @class */ (function (_super) {
        __extends(GlassStoneWhite, _super);
        function GlassStoneWhite() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        GlassStoneWhite.prototype.createElement = function (config, addDef) {
            var _a;
            _super.prototype.createElement.call(this, config, addDef);
            if (!this.filterElement1) {
                var filter1 = document.createElementNS(NS, 'radialGradient');
                filter1.setAttribute('id', generateId('filter'));
                filter1.setAttribute('cx', '45%');
                filter1.setAttribute('cy', '45%');
                filter1.setAttribute('fx', '20%');
                filter1.setAttribute('fy', '20%');
                filter1.setAttribute('r', '60%');
                filter1.innerHTML = "\n        <stop offset=\"0%\" stop-color=\"rgba(48,48,48,1)\" />\n        <stop offset=\"80%\" stop-color=\"rgba(16,16,16,1)\" />\n        <stop offset=\"100%\" stop-color=\"rgba(0,0,0,1)\" />\n      ";
                addDef(filter1);
                this.filterElement1 = filter1;
            }
            var stoneGroup = document.createElementNS(NS, 'g');
            var stone = document.createElementNS(NS, 'circle');
            stone.setAttribute('cx', '0');
            stone.setAttribute('cy', '0');
            stone.setAttribute('fill', "url(#" + this.filterElement1.id + ")");
            stone.setAttribute('r', config.theme.stoneSize);
            stoneGroup.appendChild(stone);
            return _a = {},
                _a[OBJECTS] = stoneGroup,
                _a[SHADOWS] = this.createShadow(config, addDef),
                _a;
        };
        return GlassStoneWhite;
    }(SVGStoneDrawHandler));
    //# sourceMappingURL=ModernStoneBlack.js.map

    var defaultSVGTheme = __assign({}, defaultBoardBaseTheme, { 
        // backgroundImage: 'images/wood1.jpg',
        markupGridMask: 0.8, stoneSize: 0.48, coordinates: __assign({}, defaultBoardBaseTheme.coordinates, { fontSize: 0.5 }), grid: __assign({}, defaultBoardBaseTheme.grid, { linesWidth: 0.03, starSize: 0.09 }), drawHandlers: {
            CR: new Circle$1(),
            SQ: new Square$1(),
            LB: new Label$1(),
            TR: new Triangle$1(),
            MA: new XMark$1({ lineWidth: 0.075 }),
            SL: new Dot$1({ color: 'rgba(32, 32, 192, 0.75)' }),
            LN: new Line$1(),
            AR: new Arrow$1(),
            DD: new Dim$1({ color: 'rgba(0, 0, 0, 0.5)' }),
            //B: new drawHandlers.GlassStoneBlack(),
            //W: new drawHandlers.GlassStoneWhite(),
            W: new GlassStoneWhite$2(),
            B: new GlassStoneWhite$3(),
        } });
    //# sourceMappingURL=defaultSVGTheme.js.map

    var svgBoardDefaultConfig = __assign({}, defaultBoardBaseConfig, { theme: defaultSVGTheme });
    var SVGBoard = /** @class */ (function (_super) {
        __extends(SVGBoard, _super);
        function SVGBoard(elem, config) {
            if (config === void 0) { config = {}; }
            var _this = _super.call(this, elem, makeConfig(svgBoardDefaultConfig, config)) || this;
            /** Drawing contexts - elements to put additional board objects. Similar to layers. */
            _this.contexts = {};
            _this.boardElement = document.createElement('div');
            _this.boardElement.style.display = 'inline-block';
            _this.boardElement.style.position = 'relative';
            _this.boardElement.style.verticalAlign = 'middle';
            _this.element.appendChild(_this.boardElement);
            _this.touchArea = document.createElement('div');
            _this.touchArea.style.position = 'absolute';
            _this.touchArea.style.top = '0';
            _this.touchArea.style.left = '0';
            _this.touchArea.style.bottom = '0';
            _this.touchArea.style.right = '0';
            _this.touchArea.style.zIndex = '1';
            _this.touchArea.style.borderTop = '#F0E7A7 solid 1px';
            _this.touchArea.style.borderRight = '#D1A974 solid 1px';
            _this.touchArea.style.borderLeft = '#CCB467 solid 1px';
            _this.touchArea.style.borderBottom = '#665926 solid 1px';
            _this.boardElement.appendChild(_this.touchArea);
            _this.svgElement = document.createElementNS(NS, 'svg');
            _this.svgElement.style.display = 'block';
            _this.boardElement.appendChild(_this.svgElement);
            _this.defsElement = document.createElementNS(NS, 'defs');
            _this.svgElement.appendChild(_this.defsElement);
            _this.setViewport();
            _this.resize();
            _this.redraw();
            return _this;
        }
        SVGBoard.prototype.resize = function () {
            if (this.config.width && this.config.height) {
                this.boardElement.style.width = '';
                this.svgElement.style.width = this.config.width + "px";
                this.svgElement.style.height = this.config.height + "px";
            }
            else if (this.config.width) {
                this.boardElement.style.width = '';
                this.svgElement.style.width = this.config.width + "px";
                this.svgElement.style.height = 'auto';
            }
            else if (this.config.height) {
                this.boardElement.style.width = '';
                this.svgElement.style.width = 'auto';
                this.svgElement.style.height = this.config.height + "px";
            }
            else {
                this.boardElement.style.width = '100%';
                this.svgElement.style.width = '100%';
                this.svgElement.style.height = 'auto';
            }
        };
        SVGBoard.prototype.redraw = function () {
            this.svgElement.style.backgroundColor = this.config.theme.backgroundColor;
            if (this.config.theme.backgroundImage) {
                this.svgElement.style.backgroundImage = "url('" + this.config.theme.backgroundImage + "')";
            }
            else {
                this.svgElement.style.backgroundImage = '';
            }
            this.drawGrid();
            this.drawCoordinates();
            this.drawObjects();
        };
        SVGBoard.prototype.drawGrid = function () {
            if (this.contexts[GRID_MASK]) {
                this.svgElement.removeChild(this.contexts[GRID_MASK]);
            }
            if (this.contexts.gridElement) {
                this.svgElement.removeChild(this.contexts.gridElement);
            }
            // create grid mask
            var size = this.config.size;
            this.contexts[GRID_MASK] = document.createElementNS(NS, 'mask');
            this.contexts[GRID_MASK].id = generateId('mask');
            this.contexts[GRID_MASK].innerHTML = "<rect x=\"-0.5\" y=\"-0.5\" width=\"" + size + "\" height=\"" + size + "\" fill=\"white\" />";
            this.svgElement.appendChild(this.contexts[GRID_MASK]);
            // create grid
            this.contexts.gridElement = createGrid(this.config);
            this.contexts.gridElement.setAttribute('mask', "url(#" + this.contexts[GRID_MASK].id + ")");
            this.svgElement.appendChild(this.contexts.gridElement);
        };
        SVGBoard.prototype.drawCoordinates = function () {
            if (this.contexts.coordinatesElement) {
                this.svgElement.removeChild(this.contexts.coordinatesElement);
            }
            this.contexts.coordinatesElement = createCoordinates(this.config);
            this.contexts.coordinatesElement.style.opacity = this.config.coordinates ? '' : '0';
            this.svgElement.appendChild(this.contexts.coordinatesElement);
        };
        SVGBoard.prototype.drawObjects = function () {
            var _this = this;
            // remove old shadows layer
            if (this.contexts[SHADOWS]) {
                this.svgElement.removeChild(this.contexts[SHADOWS]);
            }
            // remove old objects layer
            if (this.contexts[OBJECTS]) {
                this.svgElement.removeChild(this.contexts[OBJECTS]);
            }
            // append new shadows layer
            this.contexts[SHADOWS] = document.createElementNS(NS, 'g');
            this.svgElement.appendChild(this.contexts[SHADOWS]);
            // append new object layer
            this.contexts[OBJECTS] = document.createElementNS(NS, 'g');
            this.svgElement.appendChild(this.contexts[OBJECTS]);
            // prepare map for objects and add all objects
            this.objectsElementMap = new Map();
            this.objects.forEach(function (boardObject) { return _this.createObjectElements(boardObject); });
        };
        SVGBoard.prototype.addObject = function (boardObject) {
            _super.prototype.addObject.call(this, boardObject);
            if (!Array.isArray(boardObject)) {
                if (this.objectsElementMap.get(boardObject)) {
                    // already added - just redraw it
                    this.updateObject(boardObject);
                    return;
                }
                this.createObjectElements(boardObject);
            }
        };
        SVGBoard.prototype.createObjectElements = function (boardObject) {
            var _this = this;
            var _a;
            var handler = this.getObjectHandler(boardObject);
            // create element or elements and add them to the svg
            var elem = handler.createElement(this.config, function (def) { return _this.defsElement.appendChild(def); });
            var elements;
            if (elem instanceof SVGElement) {
                elements = (_a = {}, _a[OBJECTS] = elem, _a);
            }
            else {
                elements = elem;
            }
            this.objectsElementMap.set(boardObject, elements);
            Object.keys(elements).forEach(function (key) { return _this.contexts[key].appendChild(elements[key]); });
            handler.updateElement(elements, boardObject, this.config);
        };
        SVGBoard.prototype.getObjectHandler = function (boardObject) {
            return typeof boardObject.type === 'string' ? this.config.theme.drawHandlers[boardObject.type] : boardObject.type;
        };
        SVGBoard.prototype.removeObject = function (boardObject) {
            var _this = this;
            _super.prototype.removeObject.call(this, boardObject);
            if (!Array.isArray(boardObject)) {
                var elements_1 = this.objectsElementMap.get(boardObject);
                if (elements_1) {
                    this.objectsElementMap.delete(boardObject);
                    Object.keys(elements_1).forEach(function (key) { return _this.contexts[key].removeChild(elements_1[key]); });
                }
            }
        };
        SVGBoard.prototype.updateObject = function (boardObject) {
            // handling multiple objects
            if (Array.isArray(boardObject)) {
                for (var i = 0; i < boardObject.length; i++) {
                    this.updateObject(boardObject[i]);
                }
                return;
            }
            var elements = this.objectsElementMap.get(boardObject);
            if (!elements) {
                // updated object isn't on board - ignore, add or warning?
                return;
            }
            var handler = this.getObjectHandler(boardObject);
            handler.updateElement(elements, boardObject, this.config);
        };
        SVGBoard.prototype.setViewport = function (viewport) {
            if (viewport === void 0) { viewport = this.config.viewport; }
            _super.prototype.setViewport.call(this, viewport);
            var _a = this.config, coordinates = _a.coordinates, theme = _a.theme, size = _a.size;
            var marginSize = theme.marginSize;
            var fontSize = theme.coordinates.fontSize;
            this.top = viewport.top - 0.5 - (coordinates && !viewport.top ? fontSize : 0) - marginSize;
            this.left = viewport.left - 0.5 - (coordinates && !viewport.left ? fontSize : 0) - marginSize;
            // tslint:disable-next-line:max-line-length
            this.bottom = size - 0.5 - this.top - viewport.bottom + (coordinates && !viewport.bottom ? fontSize : 0) + marginSize;
            this.right = size - 0.5 - this.left - viewport.right + (coordinates && !viewport.right ? fontSize : 0) + marginSize;
            this.svgElement.setAttribute('viewBox', this.left + " " + this.top + " " + this.right + " " + this.bottom);
        };
        SVGBoard.prototype.setSize = function (size) {
            if (size === void 0) { size = 19; }
            _super.prototype.setSize.call(this, size);
            this.drawGrid();
            this.drawCoordinates();
            this.setViewport();
        };
        SVGBoard.prototype.setCoordinates = function (coordinates) {
            _super.prototype.setCoordinates.call(this, coordinates);
            this.contexts.coordinatesElement.style.opacity = this.config.coordinates ? '' : '0';
            this.setViewport();
        };
        SVGBoard.prototype.on = function (type, callback) {
            _super.prototype.on.call(this, type, callback);
            this.registerBoardListener(type);
        };
        SVGBoard.prototype.registerBoardListener = function (type) {
            var _this = this;
            this.touchArea.addEventListener(type, function (evt) {
                if (evt.layerX != null) {
                    var pos = _this.getRelativeCoordinates(evt.layerX, evt.layerY);
                    _this.emit(type, evt, pos);
                }
                else {
                    _this.emit(type, evt);
                }
            });
        };
        SVGBoard.prototype.getRelativeCoordinates = function (absoluteX, absoluteY) {
            // new hopefully better translation of coordinates
            var fieldWidth = this.touchArea.offsetWidth / (this.right);
            var fieldHeight = this.touchArea.offsetHeight / (this.bottom);
            var x = Math.round((absoluteX / fieldWidth + this.left));
            var y = Math.round((absoluteY / fieldHeight + this.top));
            if (x < 0 || x >= this.config.size || y < 0 || y >= this.config.size) {
                return null;
            }
            return { x: x, y: y };
        };
        return SVGBoard;
    }(BoardBase));
    //# sourceMappingURL=SVGBoard.js.map

    //# sourceMappingURL=index.js.map

    /**
     * WGo's game engine offers to set 3 rules:
     *
     * - *checkRepeat* - one of `repeat.KO`, `repeat.ALL`, `repeat.NONE` - defines if or when a move can be repeated.
     * - *allowRewrite* - if set true a move can rewrite existing move (for uncommon applications)
     * - *allowSuicide* - if set true a suicide will be allowed (and stone will be immediately captured)
     *
     * In this module there are some common preset rule sets (Japanese, Chinese etc...).
     * Extend object `gameRules` if you wish to add some rule set. Names of the rules should correspond with
     * SGF `RU` property.
     */
    (function (Repeating) {
        Repeating["KO"] = "KO";
        Repeating["ALL"] = "ALL";
        Repeating["NONE"] = "NONE";
    })(exports.Repeating || (exports.Repeating = {}));
    var JAPANESE_RULES = {
        repeating: exports.Repeating.KO,
        allowRewrite: false,
        allowSuicide: false,
        komi: 6.5,
    };
    var CHINESE_RULES = {
        repeating: exports.Repeating.NONE,
        allowRewrite: false,
        allowSuicide: false,
        komi: 7.5,
    };
    var ING_RULES = {
        repeating: exports.Repeating.NONE,
        allowRewrite: false,
        allowSuicide: true,
        komi: 7.5,
    };
    var NO_RULES = {
        repeating: exports.Repeating.ALL,
        allowRewrite: true,
        allowSuicide: true,
        komi: 0,
    };
    var goRules = {
        Japanese: JAPANESE_RULES,
        GOE: ING_RULES,
        NZ: ING_RULES,
        AGA: CHINESE_RULES,
        Chinese: CHINESE_RULES,
    };
    //# sourceMappingURL=rules.js.map

    /**
     * Contains implementation of go position class.
     * @module Position
     */
    // creates 2-dim array
    function createGrid$1(size) {
        var grid = [];
        for (var i = 0; i < size; i++) {
            grid.push([]);
        }
        return grid;
    }
    /**
     * Position class represents a state of the go game in one moment in time. It is composed from a grid containing black
     * and white stones, capture counts, and actual turn. It is designed to be mutable.
     */
    var Position = /** @class */ (function () {
        /**
         * Creates instance of position object.
         *
         * @alias WGo.Position
         * @class
         *
         * @param {number} [size = 19] - Size of the board.
         */
        function Position(size) {
            if (size === void 0) { size = 19; }
            /**
             * One dimensional array containing stones of the position.
             */
            this.grid = [];
            /**
             * Contains numbers of stones that both players captured.
             *
             * @property {number} black - Count of white stones captured by **black**.
             * @property {number} white - Count of black stones captured by **white**.
             */
            this.capCount = {
                black: 0,
                white: 0,
            };
            /**
             * Who plays next move.
             */
            this.turn = exports.Color.BLACK;
            this.size = size;
            // init grid
            this.clear();
        }
        Position.prototype.isOnPosition = function (x, y) {
            return x >= 0 && y >= 0 && x < this.size && y < this.size;
        };
        /**
         * Returns stone on the given field.
         *
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @return {Color} Color
         */
        Position.prototype.get = function (x, y) {
            if (!this.isOnPosition(x, y)) {
                return undefined;
            }
            return this.grid[x * this.size + y];
        };
        /**
         * Sets stone on the given field.
         *
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @param {Color} c - Color
         */
        Position.prototype.set = function (x, y, c) {
            if (!this.isOnPosition(x, y)) {
                throw new TypeError('Attempt to set field outside of position.');
            }
            this.grid[x * this.size + y] = c;
            return this;
        };
        /**
         * Clears the whole position (every value is set to EMPTY).
         */
        Position.prototype.clear = function () {
            for (var i = 0; i < this.size * this.size; i++) {
                this.grid[i] = exports.Color.EMPTY;
            }
            return this;
        };
        /**
         * Clones the whole position.
         *
         * @return {WGo.Position} Copy of the position.
         * @todo Clone turn as well.
         */
        Position.prototype.clone = function () {
            var clone = new Position(this.size);
            clone.grid = this.grid.slice(0);
            clone.capCount.black = this.capCount.black;
            clone.capCount.white = this.capCount.white;
            clone.turn = this.turn;
            return clone;
        };
        /**
         * Compares this position with another position and return object with changes
         *
         * @param {WGo.Position} position - Position to compare to.
         * @return {Field[]} Array of different fields
         */
        Position.prototype.compare = function (position) {
            if (position.size !== this.size) {
                throw new TypeError('Positions of different sizes cannot be compared.');
            }
            var diff = [];
            for (var i = 0; i < this.size * this.size; i++) {
                if (this.grid[i] !== position.grid[i]) {
                    diff.push({
                        x: Math.floor(i / this.size),
                        y: i % this.size,
                        c: position.grid[i],
                    });
                }
            }
            return diff;
        };
        /**
         * Sets stone on given coordinates and capture adjacent stones without liberties if there are any.
         * If move is invalid, false is returned.
         */
        Position.prototype.applyMove = function (x, y, c, allowSuicide, allowRewrite) {
            if (c === void 0) { c = this.turn; }
            if (allowSuicide === void 0) { allowSuicide = false; }
            if (allowRewrite === void 0) { allowRewrite = false; }
            // check if move is on empty field of the board
            if (!(allowRewrite || this.get(x, y) === exports.Color.EMPTY)) {
                return false;
            }
            // clone position and add a stone
            var prevColor = this.get(x, y);
            this.set(x, y, c);
            // check capturing of all surrounding stones
            var capturesAbove = this.get(x, y - 1) === -c && this.captureIfNoLiberties(x, y - 1);
            var capturesRight = this.get(x + 1, y) === -c && this.captureIfNoLiberties(x + 1, y);
            var capturesBelow = this.get(x, y + 1) === -c && this.captureIfNoLiberties(x, y + 1);
            var capturesLeft = this.get(x - 1, y) === -c && this.captureIfNoLiberties(x - 1, y);
            var hasCaptured = capturesAbove || capturesRight || capturesBelow || capturesLeft;
            // check suicide
            if (!hasCaptured) {
                if (!this.hasLiberties(x, y)) {
                    if (allowSuicide) {
                        this.capture(x, y, c);
                    }
                    else {
                        // revert position
                        this.set(x, y, prevColor);
                        return false;
                    }
                }
            }
            this.turn = -c;
            return true;
        };
        /**
         * Validate position. Position is tested from 0:0 to size:size, if there are some moves,
         * that should be captured, they will be removed. Returns a new Position object.
         * This position isn't modified.
         */
        Position.prototype.validatePosition = function () {
            for (var x = 0; x < this.size; x++) {
                for (var y = 0; y < this.size; y++) {
                    this.captureIfNoLiberties(x - 1, y);
                }
            }
            return this;
        };
        /**
         * Returns true if stone or group on the given coordinates has at least one liberty.
         */
        Position.prototype.hasLiberties = function (x, y, alreadyTested, c) {
            if (alreadyTested === void 0) { alreadyTested = createGrid$1(this.size); }
            if (c === void 0) { c = this.get(x, y); }
            // out of the board there aren't liberties
            if (!this.isOnPosition(x, y)) {
                return false;
            }
            // however empty field means liberty
            if (this.get(x, y) === exports.Color.EMPTY) {
                return true;
            }
            // already tested field or stone of enemy isn't a liberty.
            if (alreadyTested[x][y] || this.get(x, y) === -c) {
                return false;
            }
            // set this field as tested
            alreadyTested[x][y] = true;
            // in this case we are checking our stone, if we get 4 false, it has no liberty
            return (this.hasLiberties(x, y - 1, alreadyTested, c) ||
                this.hasLiberties(x, y + 1, alreadyTested, c) ||
                this.hasLiberties(x - 1, y, alreadyTested, c) ||
                this.hasLiberties(x + 1, y, alreadyTested, c));
        };
        /**
         * Checks if specified stone/group has zero liberties and if so it captures/removes stones from the position.
         */
        Position.prototype.captureIfNoLiberties = function (x, y) {
            // if it has zero liberties capture it
            if (!this.hasLiberties(x, y)) {
                // capture stones from game
                this.capture(x, y);
                return true;
            }
            return false;
        };
        /**
         * Captures/removes stone on specified position and all adjacent and connected stones. This method ignores liberties.
         */
        Position.prototype.capture = function (x, y, c) {
            if (c === void 0) { c = this.get(x, y); }
            if (this.isOnPosition(x, y) && c !== exports.Color.EMPTY && this.get(x, y) === c) {
                this.set(x, y, exports.Color.EMPTY);
                if (c === exports.Color.BLACK) {
                    this.capCount.white = this.capCount.white + 1;
                }
                else {
                    this.capCount.black = this.capCount.black + 1;
                }
                this.capture(x, y - 1, c);
                this.capture(x, y + 1, c);
                this.capture(x - 1, y, c);
                this.capture(x + 1, y, c);
            }
        };
        /**
         * For debug purposes.
         */
        Position.prototype.toString = function () {
            var TL = '┌';
            var TM = '┬';
            var TR = '┐';
            var ML = '├';
            var MM = '┼';
            var MR = '┤';
            var BL = '└';
            var BM = '┴';
            var BR = '┘';
            var BS = '●';
            var WS = '○';
            var HF = '─'; // horizontal fill
            var output = '   ';
            for (var i = 0; i < this.size; i++) {
                output += i < 9 ? i + " " : i;
            }
            output += '\n';
            for (var y = 0; y < this.size; y++) {
                for (var x = 0; x < this.size; x++) {
                    var color = this.grid[x * this.size + y];
                    if (x === 0) {
                        output += (y < 10 ? " " + y : y) + " ";
                    }
                    if (color !== exports.Color.EMPTY) {
                        output += color === exports.Color.BLACK ? BS : WS;
                    }
                    else {
                        var char = void 0;
                        if (y === 0) {
                            // top line
                            if (x === 0) {
                                char = TL;
                            }
                            else if (x < this.size - 1) {
                                char = TM;
                            }
                            else {
                                char = TR;
                            }
                        }
                        else if (y < this.size - 1) {
                            // middle line
                            if (x === 0) {
                                char = ML;
                            }
                            else if (x < this.size - 1) {
                                char = MM;
                            }
                            else {
                                char = MR;
                            }
                        }
                        else {
                            // bottom line
                            if (x === 0) {
                                char = BL;
                            }
                            else if (x < this.size - 1) {
                                char = BM;
                            }
                            else {
                                char = BR;
                            }
                        }
                        output += char;
                    }
                    if (x === this.size - 1) {
                        if (y !== this.size - 1) {
                            output += '\n';
                        }
                    }
                    else {
                        output += HF;
                    }
                }
            }
            return output;
        };
        /**
         * Returns position grid as two dimensional array.
         */
        Position.prototype.toTwoDimensionalArray = function () {
            var arr = [];
            for (var x = 0; x < this.size; x++) {
                arr[x] = [];
                for (var y = 0; y < this.size; y++) {
                    arr[x][y] = this.grid[x * this.size + y];
                }
            }
            return arr;
        };
        return Position;
    }());
    // import { Color, Field, Move } from '../types';
    // /**
    //  * Position of the board (grid) is represented as 2 dimensional array of colors.
    //  */
    // export type Position = Color[][];
    // /**
    //  * Creates empty position (filled with Color.EMPTY) of specified size.
    //  * @param size
    //  */
    // export function createPosition(size: number) {
    //   const position: Color[][] = [];
    //   for (let i = 0; i < size; i++) {
    //     const row: Color[] = [];
    //     for (let j = 0; j < size; j++) {
    //       row.push(Color.EMPTY);
    //     }
    //     position.push(row);
    //   }
    //   return position;
    // }
    // /**
    //  * Deep clones a position.
    //  * @param position
    //  */
    // export function clonePosition(position: Position) {
    //   return position.map(row => row.slice(0));
    // }
    // /**
    //  * Compares position `pos1` with position `pos2` and returns all differences on `pos2`.
    //  * @param pos1
    //  * @param pos2
    //  */
    // export function comparePositions(pos1: Position, pos2: Position): Field[] {
    //   if (pos1.length !== pos2.length) {
    //     throw new TypeError('Positions of different sizes cannot be compared.');
    //   }
    //   const diff: Field[] = [];
    //   for (let x = 0; x < pos1.length; x++) {
    //     for (let y = 0; y < pos2.length; y++) {
    //       if (pos1[x][y] !== pos2[x][y]) {
    //         diff.push({ x, y, c: pos2[x][y] });
    //       }
    //     }
    //   }
    //   return diff;
    // }
    // function isOnBoard(position: Position, x: number, y: number) {
    //   return x >= 0 && x < position.length && y >= 0 && y < position.length;
    // }
    // /**
    //  * Creates new position with specified move (with rules applied - position won't contain captured stones).
    //  * If move is invalid, null is returned.
    //  */
    // export function applyMove(position: Position, x: number, y: number, c: Color.B | Color.W, allowSuicide = false) {
    //   // check if move is on empty field of the board
    //   if (!isOnBoard(position, x, y) || position[x][y] !== Color.EMPTY) {
    //     return null;
    //   }
    //   // clone position and add a stone
    //   const newPosition = clonePosition(position);
    //   newPosition[x][y] = c;
    //   // check capturing of all surrounding stones
    //   const capturesAbove = captureIfNoLiberties(newPosition, x, y - 1, -c);
    //   const capturesRight = captureIfNoLiberties(newPosition, x + 1, y, -c);
    //   const capturesBelow = captureIfNoLiberties(newPosition, x, y + 1, -c);
    //   const capturesLeft = captureIfNoLiberties(newPosition, x - 1, y, -c);
    //   const hasCaptured = capturesAbove || capturesRight || capturesBelow || capturesLeft;
    //   // check suicide
    //   if (!hasCaptured) {
    //     if (!hasLiberties(newPosition, x, y)) {
    //       if (allowSuicide) {
    //         capture(newPosition, x, y, c);
    //       } else {
    //         return null;
    //       }
    //     }
    //   }
    //   return newPosition;
    // }
    // /**
    //  * Validate position. Position is tested from 0:0 to size:size, if there are some moves,
    //  * that should be captured, they will be removed. Returns a new Position object.
    //  */
    // export function getValidatedPosition(position: Position) {
    //   const newPosition = clonePosition(position);
    //   for (let x = 0; x < position.length; x++) {
    //     for (let y = 0; y < position.length; y++) {
    //       captureIfNoLiberties(newPosition, x, y);
    //     }
    //   }
    //   return newPosition;
    // }
    // /**
    //  * Capture stone or group of stones if they are zero liberties. Mutates the given position.
    //  *
    //  * @param position
    //  * @param x
    //  * @param y
    //  * @param c
    //  */
    // function captureIfNoLiberties(position: Position, x: number, y: number, c: Color = position[x][y]) {
    //   let hasCaptured = false;
    //   // is there a stone possible to capture?
    //   if (isOnBoard(position, x, y) && c !== Color.EMPTY && position[x][y] === c) {
    //     // if it has zero liberties capture it
    //     if (!hasLiberties(position, x, y)) {
    //       // capture stones from game
    //       capture(position, x, y, c);
    //       hasCaptured = true;
    //     }
    //   }
    //   return hasCaptured;
    // }
    // function createTestGrid(size: number) {
    //   const grid: boolean[][] = [];
    //   for (let i = 0; i < size; i++) {
    //     grid.push([]);
    //   }
    //   return grid;
    // }
    // /**
    //  * Returns true if stone or group on the given position has at least one liberty.
    //  */
    // function hasLiberties(
    //   position: Position,
    //   x: number,
    //   y: number,
    //   alreadyTested = createTestGrid(position.length),
    //   c = position[x][y],
    // ): boolean {
    //   // out of the board there aren't liberties
    //   if (!isOnBoard(position, x, y)) {
    //     return false;
    //   }
    //   // however empty field means liberty
    //   if (position[x][y] === Color.EMPTY) {
    //     return true;
    //   }
    //   // already tested field or stone of enemy isn't a liberty.
    //   if (alreadyTested[x][y] || position[x][y] === -c) {
    //     return false;
    //   }
    //   // set this field as tested
    //   alreadyTested[x][y] = true;
    //   // in this case we are checking our stone, if we get 4 false, it has no liberty
    //   return (
    //     hasLiberties(position, x, y - 1, alreadyTested, c) ||
    //     hasLiberties(position, x, y + 1, alreadyTested, c) ||
    //     hasLiberties(position, x - 1, y, alreadyTested, c) ||
    //     hasLiberties(position, x + 1, y, alreadyTested, c)
    //   );
    // }
    // /**
    //  * Captures/removes stone on specified position and all adjacent and connected stones. This method ignores liberties.
    //  * Mutates the given position.
    //  */
    // function capture(position: Position, x: number, y: number, c: Color = position[x][y]) {
    //   if (isOnBoard(position, x, y) && position[x][y] !== Color.EMPTY && position[x][y] === c) {
    //     position[x][y] = Color.EMPTY;
    //     capture(position, x, y - 1, c);
    //     capture(position, x, y + 1, c);
    //     capture(position, x - 1, y, c);
    //     capture(position, x + 1, y, c);
    //   }
    // }
    // /**
    //  * For debug purposes.
    //  */
    // export function stringifyPosition(position: Position) {
    //   const TL = '┌';
    //   const TM = '┬';
    //   const TR = '┐';
    //   const ML = '├';
    //   const MM = '┼';
    //   const MR = '┤';
    //   const BL = '└';
    //   const BM = '┴';
    //   const BR = '┘';
    //   const BS = '●';
    //   const WS = '○';
    //   const HF = '─'; // horizontal fill
    //   let output = '   ';
    //   for (let i = 0; i < position.length; i++) {
    //     output += i < 9 ? `${i} ` : i;
    //   }
    //   output += '\n';
    //   for (let y = 0; y < position.length; y++) {
    //     for (let x = 0; x < position.length; x++) {
    //       const color = position[x][y];
    //       if (x === 0) {
    //         output += `${(y < 10 ? ` ${y}` : y)} `;
    //       }
    //       if (color !== Color.EMPTY) {
    //         output += color === Color.BLACK ? BS : WS;
    //       } else {
    //         let char;
    //         if (y === 0) {
    //           // top line
    //           if (x === 0) {
    //             char = TL;
    //           } else if (x < position.length - 1) {
    //             char = TM;
    //           } else {
    //             char = TR;
    //           }
    //         } else if (y < position.length - 1) {
    //           // middle line
    //           if (x === 0) {
    //             char = ML;
    //           } else if (x < position.length - 1) {
    //             char = MM;
    //           } else {
    //             char = MR;
    //           }
    //         } else {
    //           // bottom line
    //           if (x === 0) {
    //             char = BL;
    //           } else if (x < position.length - 1) {
    //             char = BM;
    //           } else {
    //             char = BR;
    //           }
    //         }
    //         output += char;
    //       }
    //       if (x === position.length - 1) {
    //         if (y !== position.length - 1) {
    //           output += '\n';
    //         }
    //       } else {
    //         output += HF;
    //       }
    //     }
    //   }
    //   return output;
    // }
    //# sourceMappingURL=Position.js.map

    var Game = /** @class */ (function () {
        /**
         * Creates instance of game class.
         *
         * @class
         * This class implements game logic. It basically analyses given moves and returns capture stones.
         * WGo.Game also stores every position from beginning, so it has ability to check repeating positions
         * and it can effectively restore old positions.
         *
         *
         * @param {number} [size = 19] Size of the board
         * @param {string} [checkRepeat = KO] How to handle repeated position:
         *
         * * KO - ko is properly handled - position cannot be same like previous position
         * * ALL - position cannot be same like any previous position - e.g. it forbids triple ko
         * * NONE - position can be repeated
         *
         * @param {boolean} [allowRewrite = false] Allow to play moves, which were already played
         * @param {boolean} [allowSuicide = false] Allow to play suicides, stones are immediately captured
         */
        function Game(size, rules) {
            if (size === void 0) { size = 19; }
            if (rules === void 0) { rules = JAPANESE_RULES; }
            this.size = size;
            this.rules = rules;
            this.komi = rules.komi;
            this.positionStack = [new Position(size)];
        }
        Object.defineProperty(Game.prototype, "position", {
            get: function () {
                return this.positionStack[this.positionStack.length - 1];
            },
            set: function (pos) {
                this.positionStack[this.positionStack.length - 1] = pos;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Game.prototype, "turn", {
            get: function () {
                return this.position.turn;
            },
            set: function (color) {
                this.position.turn = color;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Game.prototype, "capCount", {
            get: function () {
                return this.position.capCount;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Play move. You can specify color.
         */
        Game.prototype.play = function (x, y) {
            var nextPosition = this.tryToPlay(x, y);
            if (nextPosition) {
                this.pushPosition(nextPosition);
            }
            return nextPosition;
        };
        /**
         * Tries to play on given coordinates, returns new position after the play, or error code.
         */
        Game.prototype.tryToPlay = function (x, y) {
            var nextPosition = this.position.clone();
            var success = nextPosition.applyMove(x, y, nextPosition.turn, this.rules.allowSuicide, this.rules.allowRewrite);
            if (success && !this.hasPositionRepeated(nextPosition)) {
                return nextPosition;
            }
            return false;
        };
        /**
         * @param {Position} position to check
         * @return {boolean} Returns true if the position didn't occurred in the past (according to the rule set)
         */
        Game.prototype.hasPositionRepeated = function (position) {
            var depth;
            if (this.rules.repeating === exports.Repeating.KO && this.positionStack.length - 2 >= 0) {
                depth = this.positionStack.length - 2;
            }
            else if (this.rules.repeating === exports.Repeating.NONE) {
                depth = 0;
            }
            else {
                return false;
            }
            for (var i = this.positionStack.length - 1; i >= depth; i--) {
                if (this.positionStack[i].compare(position).length === 0) {
                    return true;
                }
            }
            return false;
        };
        /**
         * Play pass.
         *
         * @param {(BLACK|WHITE)} c color
         */
        Game.prototype.pass = function (c) {
            if (c === void 0) { c = this.turn; }
            var nextPosition = this.position.clone();
            nextPosition.turn = -(c || this.turn);
            this.pushPosition(nextPosition);
        };
        /**
         * Finds out validity of the move.
         *
         * @param {number} x coordinate
         * @param {number} y coordinate
         * @return {boolean} true if move can be played.
         */
        Game.prototype.isValid = function (x, y) {
            return !!this.tryToPlay(x, y);
        };
        /**
         * Controls position of the move.
         *
         * @param {number} x coordinate
         * @param {number} y coordinate
         * @return {boolean} true if move is on board.
         */
        Game.prototype.isOnBoard = function (x, y) {
            return this.position.isOnPosition(x, y);
        };
        /**
         * Inserts move into current position. Use for setting position, for example in handicap game. Field must be empty.
         *
         * @param {number} x coordinate
         * @param {number} y coordinate
         * @param {Color} c color
         * @return {boolean} true if operation is successful.
         */
        Game.prototype.addStone = function (x, y, c) {
            if (this.isOnBoard(x, y) && this.position.get(x, y) === exports.Color.EMPTY) {
                this.position.set(x, y, c);
                return true;
            }
            return false;
        };
        /**
         * Removes move from current position.
         *
         * @param {number} x coordinate
         * @param {number} y coordinate
         * @return {boolean} true if operation is successful.
         */
        Game.prototype.removeStone = function (x, y) {
            if (this.isOnBoard(x, y) && this.position.get(x, y) !== exports.Color.EMPTY) {
                this.position.set(x, y, exports.Color.EMPTY);
                return true;
            }
            return false;
        };
        /**
         * Set or insert move of current position.
         *
         * @param {number} x coordinate
         * @param {number} y coordinate
         * @param {(BLACK|WHITE)} [c] color
         * @return {boolean} true if operation is successful.
         */
        Game.prototype.setStone = function (x, y, c) {
            if (this.isOnBoard(x, y)) {
                this.position.set(x, y, c);
                return true;
            }
            return false;
        };
        /**
         * Get stone on given position.s
         *
         * @param {number} x coordinate
         * @param {number} y coordinate
         * @return {(Color|null)} color
         */
        Game.prototype.getStone = function (x, y) {
            return this.position.get(x, y);
        };
        /**
         * Add position to stack. If position isn't specified current position is cloned and stacked.
         * Pointer of actual position is moved to the new position.
         *
         * @param {WGo.Position} tmp position (optional)
         */
        Game.prototype.pushPosition = function (pos) {
            return this.positionStack.push(pos);
        };
        /**
         * Remove current position from stack. Pointer of actual position is moved to the previous position.
         */
        Game.prototype.popPosition = function () {
            if (this.positionStack.length > 1) {
                return this.positionStack.pop();
            }
            return null;
        };
        /**
         * Removes all positions except the initial.
         */
        Game.prototype.clear = function () {
            this.positionStack = [this.positionStack[0]];
        };
        return Game;
    }());
    //# sourceMappingURL=Game.js.map

    //# sourceMappingURL=index.js.map

    /**
     * From SGF specification, there are these types of property values:
     *
     * CValueType = (ValueType | *Compose*)
     * ValueType  = (*None* | *Number* | *Real* | *Double* | *Color* | *SimpleText* | *Text* | *Point*  | *Move* | *Stone*)
     *
     * WGo's kifu node (KNode object) implements similar types with few exceptions:
     *
     * - Types `Number`, `Real` and `Double` are implemented by javascript's `number`.
     * - Types `SimpleText` and `Text` are considered as the same.
     * - Types `Point`, `Move` and `Stone` are all the same, implemented as simple object with `x` and `y` coordinates.
     * - Type `None` is implemented as `true`
     *
     * Each `Compose` type, which is used in SGF, has its own type.
     *
     * - `Point ':' Point` (used in AR property) has special type `Line` - object with two sets of coordinates.
     * - `Point ':' Simpletext` (used in LB property) has special type `Label` - object with coordinates and text property
     * - `Simpletext ":" Simpletext` (used in AP property) - not implemented
     * - `Number ":" SimpleText` (used in FG property) - not implemented
     *
     * Moreover each property value has these settings:
     *
     * - *Single value* / *Array* (more values)
     * - *Not empty* / *Empty* (value or array can be empty)
     *
     * {@link http://www.red-bean.com/sgf/sgf4.html}
     */
    var NONE = {
        read: function (str) { return true; },
        write: function (value) { return ''; },
    };
    var NUMBER = {
        read: function (str) { return parseFloat(str); },
        write: function (value) { return value.toString(10); },
    };
    var TEXT = {
        read: function (str) { return str; },
        write: function (value) { return value; },
    };
    var COLOR = {
        read: function (str) { return (str === 'w' || str === 'W' ? exports.Color.WHITE : exports.Color.BLACK); },
        write: function (value) { return (value === exports.Color.WHITE ? 'W' : 'B'); },
    };
    var POINT = {
        read: function (str) { return str ? {
            x: str.charCodeAt(0) - 97,
            y: str.charCodeAt(1) - 97,
        } : null; },
        write: function (value) { return value ? String.fromCharCode(value.x + 97) + String.fromCharCode(value.y + 97) : ''; },
    };
    var LABEL = {
        read: function (str) { return ({
            x: str.charCodeAt(0) - 97,
            y: str.charCodeAt(1) - 97,
            text: str.substr(3),
        }); },
        write: function (value) { return (String.fromCharCode(value.x + 97) + String.fromCharCode(value.y + 97) + ":" + value.text); },
    };
    var VECTOR = {
        read: function (str) { return str ? [
            {
                x: str.charCodeAt(0) - 97,
                y: str.charCodeAt(1) - 97,
            },
            {
                x: str.charCodeAt(3) - 97,
                y: str.charCodeAt(4) - 97,
            },
        ] : null; },
        write: function (value) { return (
        // tslint:disable-next-line:max-line-length
        value ? String.fromCharCode(value[0].x + 97) + String.fromCharCode(value[0].y + 97) + ":" + (String.fromCharCode(value[1].x + 97) + String.fromCharCode(value[1].y + 97)) : ''); },
    };
    var propertyValueTypes = {
        _default: {
            transformer: TEXT,
            multiple: false,
            notEmpty: true,
        },
    };
    /// Move properties -------------------------------------------------------------------------------
    propertyValueTypes.B = propertyValueTypes.W = {
        transformer: POINT,
        multiple: false,
        notEmpty: false,
    };
    propertyValueTypes.KO = {
        transformer: NONE,
        multiple: false,
        notEmpty: false,
    };
    propertyValueTypes.MN = {
        transformer: NUMBER,
        multiple: false,
        notEmpty: true,
    };
    /// Setup properties ------------------------------------------------------------------------------
    propertyValueTypes.AB = propertyValueTypes.AW = propertyValueTypes.AE = {
        transformer: POINT,
        multiple: true,
        notEmpty: true,
    };
    propertyValueTypes.PL = {
        transformer: COLOR,
        multiple: false,
        notEmpty: true,
    };
    /// Node annotation properties --------------------------------------------------------------------
    propertyValueTypes.C = propertyValueTypes.N = {
        transformer: TEXT,
        multiple: false,
        notEmpty: true,
    };
    // tslint:disable-next-line:max-line-length
    propertyValueTypes.DM = propertyValueTypes.GB = propertyValueTypes.GW = propertyValueTypes.HO = propertyValueTypes.UC = propertyValueTypes.V = {
        transformer: NUMBER,
        multiple: false,
        notEmpty: true,
    };
    /// Move annotation properties --------------------------------------------------------------------
    propertyValueTypes.BM = propertyValueTypes.TE = {
        transformer: NUMBER,
        multiple: false,
        notEmpty: true,
    };
    propertyValueTypes.DO = propertyValueTypes.IT = {
        transformer: NONE,
        multiple: false,
        notEmpty: false,
    };
    /// Markup properties -----------------------------------------------------------------------------
    // tslint:disable-next-line:max-line-length
    propertyValueTypes.CR = propertyValueTypes.MA = propertyValueTypes.SL = propertyValueTypes.SQ = propertyValueTypes.TR = {
        transformer: POINT,
        multiple: true,
        notEmpty: true,
    };
    propertyValueTypes.LB = {
        transformer: LABEL,
        multiple: true,
        notEmpty: true,
    };
    propertyValueTypes.AR = propertyValueTypes.LN = {
        transformer: VECTOR,
        multiple: true,
        notEmpty: true,
    };
    propertyValueTypes.DD = propertyValueTypes.TB = propertyValueTypes.TW = {
        transformer: POINT,
        multiple: true,
        notEmpty: false,
    };
    /// Root properties -------------------------------------------------------------------------------
    propertyValueTypes.AP = propertyValueTypes.CA = {
        transformer: TEXT,
        multiple: false,
        notEmpty: true,
    };
    // note: rectangular board is not implemented (in SZ property)
    propertyValueTypes.FF = propertyValueTypes.GM = propertyValueTypes.ST = propertyValueTypes.SZ = {
        transformer: NUMBER,
        multiple: false,
        notEmpty: true,
    };
    /// Game info properties --------------------------------------------------------------------------
    propertyValueTypes.AN = propertyValueTypes.BR = propertyValueTypes.BT =
        propertyValueTypes.CP = propertyValueTypes.DT = propertyValueTypes.EV =
            propertyValueTypes.GN = propertyValueTypes.GC = propertyValueTypes.GN =
                propertyValueTypes.ON = propertyValueTypes.OT = propertyValueTypes.PB =
                    propertyValueTypes.PC = propertyValueTypes.PW = propertyValueTypes.RE =
                        propertyValueTypes.RO = propertyValueTypes.RU = propertyValueTypes.SO =
                            propertyValueTypes.US = propertyValueTypes.WR = propertyValueTypes.WT = {
                                transformer: TEXT,
                                multiple: false,
                                notEmpty: true,
                            };
    propertyValueTypes.TM = propertyValueTypes.HA = propertyValueTypes.KM = {
        transformer: NUMBER,
        multiple: false,
        notEmpty: true,
    };
    /// Timing properties -----------------------------------------------------------------------------
    propertyValueTypes.BL = propertyValueTypes.WL = propertyValueTypes.OB = propertyValueTypes.OW = {
        transformer: NUMBER,
        multiple: false,
        notEmpty: true,
    };
    /// Miscellaneous properties ----------------------------------------------------------------------
    propertyValueTypes.PM = {
        transformer: NUMBER,
        multiple: false,
        notEmpty: true,
    };
    // VW property must be specified as compressed list (ab:cd) and only one value is allowed
    // empty value [] will reset the viewport. Other options are not supported.
    propertyValueTypes.VW = {
        transformer: VECTOR,
        multiple: false,
        notEmpty: true,
    };
    //# sourceMappingURL=propertyValueTypes.js.map

    var processJSGF = function (gameTree) {
        var rootNode = new KifuNode();
        rootNode.setSGFProperties(gameTree.sequence[0] || {});
        var lastNode = rootNode;
        for (var i = 1; i < gameTree.sequence.length; i++) {
            var node = new KifuNode();
            node.setSGFProperties(gameTree.sequence[i]);
            lastNode.appendChild(node);
            lastNode = node;
        }
        for (var i = 0; i < gameTree.children.length; i++) {
            lastNode.appendChild(processJSGF(gameTree.children[i]));
        }
        return rootNode;
    };
    /**
     * Class representing one kifu node.
     */
    var KifuNode = /** @class */ (function () {
        function KifuNode() {
            this.parent = null;
            this.children = [];
            this.properties = {};
        }
        Object.defineProperty(KifuNode.prototype, "root", {
            get: function () {
                // tslint:disable-next-line:no-this-assignment
                var node = this;
                while (node.parent != null) {
                    node = node.parent;
                }
                return node;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(KifuNode.prototype, "innerSGF", {
            /*set innerSGF(sgf: string) {
              this.setFromSGF(sgf);
            }*/
            get: function () {
                var output = ';';
                for (var propIdent in this.properties) {
                    if (this.properties.hasOwnProperty(propIdent)) {
                        output += propIdent + this.getSGFProperty(propIdent);
                    }
                }
                if (this.children.length === 1) {
                    return output + ";" + this.children[0].innerSGF;
                }
                if (this.children.length > 1) {
                    return this.children.reduce(function (prev, current) { return prev + "(;" + current.innerSGF + ")"; }, output);
                }
                return output;
            },
            enumerable: true,
            configurable: true
        });
        KifuNode.prototype.getPath = function () {
            var path = { depth: 0, forks: [] };
            // tslint:disable-next-line:no-this-assignment
            var node = this;
            while (node.parent) {
                path.depth++;
                if (node.parent.children.length > 1) {
                    path.forks.unshift(node.parent.children.indexOf(node));
                }
                node = node.parent;
            }
            return path;
        };
        /// GENERAL TREE NODE MANIPULATION METHODS (subset of DOM API's Node)
        /**
         * Insert a KNode as the last child node of this node.
         *
         * @throws  {Error} when argument is invalid.
         * @param   {KifuNode} node to append.
         * @returns {number} position(index) of appended node.
         */
        KifuNode.prototype.appendChild = function (node) {
            if (node == null || !(node instanceof KifuNode) || node === this) {
                throw new Error('Invalid argument passed to `appendChild` method, KNode was expected.');
            }
            if (node.parent) {
                node.parent.removeChild(node);
            }
            node.parent = this;
            return this.children.push(node) - 1;
        };
        /**
         * Hard clones a KNode and all of its contents.
         *
         * @param {boolean}  appendToParent if set true, cloned node will be appended to this parent.
         * @returns {KifuNode}  cloned node
         */
        /*cloneNode(appendToParent?: boolean): KNode {
          const node = new KNode();
          node.innerSGF = this.innerSGF;
      
          if (appendToParent && this.parent) {
            this.parent.appendChild(node);
          }
      
          return node;
        }*/
        /**
         * Returns a Boolean value indicating whether a node is a descendant of a given node or not.
         *
         * @param   {KifuNode}   node to be tested
         * @returns {boolean} true, if this node contains given node.
         */
        KifuNode.prototype.contains = function (node) {
            if (this.children.indexOf(node) >= 0) {
                return true;
            }
            return this.children.some(function (child) { return child.contains(node); });
        };
        /**
         * Inserts the first KNode given in a parameter immediately before the second, child of this KNode.
         *
         * @throws  {Error}   when argument is invalid.
         * @param   {KifuNode}   newNode       node to be inserted
         * @param   {(KifuNode)} referenceNode reference node, if omitted, new node will be inserted at the end.
         * @returns {KifuNode}   this node
         */
        KifuNode.prototype.insertBefore = function (newNode, referenceNode) {
            if (newNode == null || !(newNode instanceof KifuNode) || newNode === this) {
                throw new Error('Invalid argument passed to `insertBefore` method, KNode was expected.');
            }
            if (referenceNode == null) {
                this.appendChild(newNode);
                return this;
            }
            if (newNode.parent) {
                newNode.parent.removeChild(newNode);
            }
            newNode.parent = this;
            this.children.splice(this.children.indexOf(referenceNode), 0, newNode);
            return this;
        };
        /**
         * Removes a child node from the current element, which must be a child of the current node.
         *
         * @param   {KifuNode} child node to be removed
         * @returns {KifuNode}  this node
         */
        KifuNode.prototype.removeChild = function (child) {
            this.children.splice(this.children.indexOf(child), 1);
            child.parent = null;
            return this;
        };
        /**
         * Replaces one child Node of the current one with the second one given in parameter.
         *
         * @throws  {Error} when argument is invalid
         * @param   {KifuNode} newChild node to be inserted
         * @param   {KifuNode} oldChild node to be replaced
         * @returns {KifuNode} this node
         */
        KifuNode.prototype.replaceChild = function (newChild, oldChild) {
            if (newChild == null || !(newChild instanceof KifuNode) || newChild === this) {
                throw new Error('Invalid argument passed to `replaceChild` method, KNode was expected.');
            }
            this.insertBefore(newChild, oldChild);
            this.removeChild(oldChild);
            return this;
        };
        /// BASIC PROPERTY GETTER and SETTER
        /**
         * Gets property by SGF property identificator. Returns property value (type depends on property type)
         *
         * @param   {string}   propIdent - SGF property idetificator
         * @returns {any}    property value or values or undefined, if property is missing.
         */
        KifuNode.prototype.getProperty = function (propIdent) {
            return this.properties[propIdent];
        };
        /**
         * Sets property by SGF property identificator.
         *
         * @param   {string}  propIdent - SGF property idetificator
         * @param   {any}     value - property value or values
         */
        KifuNode.prototype.setProperty = function (propIdent, value) {
            if (value == null) {
                delete this.properties[propIdent];
            }
            else {
                this.properties[propIdent] = value;
            }
            return this;
        };
        /// SGF RAW METHODS
        /**
         * Gets one SGF property value as string (with brackets `[` and `]`).
         *
         * @param   {string} propIdent SGF property identificator.
         * @returns {string[]} Array of SGF property values or null if there is not such property.
         */
        KifuNode.prototype.getSGFProperty = function (propIdent) {
            if (this.properties[propIdent] != null) {
                var propertyValueType_1 = propertyValueTypes[propIdent] || propertyValueTypes._default;
                if (Array.isArray(this.properties[propIdent])) {
                    return this.properties[propIdent].map(function (propValue) { return propertyValueType_1.transformer.write(propValue).replace(/\]/g, '\\]'); });
                }
                return [propertyValueType_1.transformer.write(this.properties[propIdent]).replace(/\]/g, '\\]')];
            }
            return null;
        };
        /**
         * Sets one SGF property.
         *
         * @param   {string}   propIdent SGF property identificator
         * @param   {string[]} propValues SGF property values
         * @returns {KifuNode}    this KNode for chaining
         */
        KifuNode.prototype.setSGFProperty = function (propIdent, propValues) {
            var propertyValueType = propertyValueTypes[propIdent] || propertyValueTypes._default;
            if (propValues == null) {
                delete this.properties[propIdent];
                return this;
            }
            if (propertyValueType.multiple) {
                this.properties[propIdent] = propValues.map(function (val) { return propertyValueType.transformer.read(val); });
            }
            else {
                this.properties[propIdent] = propertyValueType.transformer.read(propValues[0]);
            }
            return this;
        };
        /**
         * Iterates through all properties.
         */
        KifuNode.prototype.forEachProperty = function (callback) {
            var _this = this;
            Object.keys(this.properties).forEach(function (propIdent) { return callback(propIdent, _this.properties[propIdent]); });
        };
        /**
         * Sets multiple SGF properties.
         *
         * @param   {Object}   properties - map with signature propIdent -> propValues.
         * @returns {KifuNode}    this KNode for chaining
         */
        KifuNode.prototype.setSGFProperties = function (properties) {
            for (var ident in properties) {
                if (properties.hasOwnProperty(ident)) {
                    this.setSGFProperty(ident, properties[ident]);
                }
            }
            return this;
        };
        /**
         * Sets properties of Kifu node based on the sgf string. Usually you won't use this method directly,
         * but use innerSGF property instead.
         *
         * Basically it parsers the sgf, takes properties from it and adds them to the node.
         * Then if there are other nodes in the string, they will be appended to the node as well.
         *
         * @param {string} sgf SGF text for current node. It must be without trailing `;`,
         *                     however it can contain following nodes.
         * @throws {SGFSyntaxError} throws exception, if sgf string contains invalid SGF.
         */
        /*setFromSGF(sgf: string) {
          // clean up
          for (let i = this.children.length - 1; i >= 0; i--) {
            this.removeChild(this.children[i]);
          }
          this.SGFProperties = {};
      
          // sgf sequence to parse must start with ;
          const sgfSequence = sgf[0] === ';' ? sgf : `;${sgf}`;
      
          const parser = new SGFParser(sgfSequence);
      
          const sequence = parser.parseSequence();
        }*/
        /**
         * Transforms KNode object to standard SGF string.
         */
        KifuNode.prototype.toSGF = function () {
            return "(" + this.innerSGF + ")";
        };
        /**
         * Creates KNode object from SGF transformed to JavaScript object.
         * @param gameTree
         */
        KifuNode.fromJS = function (gameTree) {
            return processJSGF(gameTree);
        };
        /**
         * Creates KNode object from SGF string.
         *
         * @param sgf
         * @param gameNo
         */
        KifuNode.fromSGF = function (sgf, gameNo) {
            if (gameNo === void 0) { gameNo = 0; }
            var parser = new SGFParser(sgf);
            return KifuNode.fromJS(parser.parseCollection()[gameNo]);
        };
        return KifuNode;
    }());
    //# sourceMappingURL=KifuNode.js.map

    var PropIdent;
    (function (PropIdent) {
        // Move Properties
        PropIdent["BLACK_MOVE"] = "B";
        PropIdent["EXECUTE_ILLEGAL"] = "KO";
        PropIdent["MOVE_NUMBER"] = "MN";
        PropIdent["WHITE_MOVE"] = "W";
        // Setup Properties
        PropIdent["ADD_BLACK"] = "AB";
        PropIdent["CLEAR_FIELD"] = "AE";
        PropIdent["ADD_WHITE"] = "AW";
        PropIdent["SET_TURN"] = "PL";
        // Node Annotation Properties
        PropIdent["COMMENT"] = "C";
        PropIdent["EVEN_POSITION"] = "DM";
        PropIdent["GOOD_FOR_BLACK"] = "GB";
        PropIdent["GOOD_FOR_WHITE"] = "GW";
        PropIdent["HOTSPOT"] = "HO";
        PropIdent["NODE_NAME"] = "N";
        PropIdent["UNCLEAR_POSITION"] = "UC";
        PropIdent["NODE_VALUE"] = "V";
        // Move Annotation Properties
        PropIdent["BAD_MOVE"] = "BM";
        PropIdent["DOUBTFUL_MOVE"] = "DM";
        PropIdent["INTERESTING_MOVE"] = "IT";
        PropIdent["GOOD_MOVE"] = "TE";
        // Markup Properties
        PropIdent["ARROW"] = "AR";
        PropIdent["CIRCLE"] = "CR";
        PropIdent["DIM"] = "DD";
        PropIdent["LABEL"] = "LB";
        PropIdent["LINE"] = "LN";
        PropIdent["X_MARK"] = "MA";
        PropIdent["SELECTED"] = "SL";
        PropIdent["SQUARE"] = "SQ";
        PropIdent["TRIANGLE"] = "TR";
        // Root Properties
        PropIdent["APPLICATION"] = "AP";
        PropIdent["CHARSET"] = "CA";
        PropIdent["SGF_VERSION"] = "FF";
        PropIdent["GAME_TYPE"] = "GM";
        PropIdent["VARIATIONS_STYLE"] = "ST";
        PropIdent["BOARD_SIZE"] = "SZ";
        // Game Info Properties
        PropIdent["ANNOTATOR"] = "AN";
        PropIdent["BLACK_RANK"] = "BR";
        PropIdent["BLACK_TEAM"] = "BT";
        PropIdent["COPYRIGHT"] = "CP";
        PropIdent["DATE"] = "DT";
        PropIdent["EVENT"] = "EV";
        PropIdent["GAME_NAME"] = "GN";
        PropIdent["GAME_COMMENT"] = "GC";
        PropIdent["OPENING_INFO"] = "ON";
        PropIdent["OVER_TIME"] = "OT";
        PropIdent["BLACK_NAME"] = "BN";
        PropIdent["PLACE"] = "PC";
        PropIdent["WHITE_NAME"] = "PW";
        PropIdent["RESULT"] = "RE";
        PropIdent["ROUND"] = "RO";
        PropIdent["RULES"] = "RU";
        PropIdent["SOURCE"] = "SO";
        PropIdent["TIME_LIMITS"] = "TM";
        PropIdent["AUTHOR"] = "US";
        PropIdent["WHITE_RANK"] = "WR";
        PropIdent["WHITE_TEAM"] = "WT";
        // Timing Properties
        PropIdent["BLACK_TIME_LEFT"] = "BL";
        PropIdent["BLACK_STONES_LEFT"] = "OB";
        PropIdent["WHITE_STONES_LEFT"] = "OW";
        PropIdent["WHITE_TIME_LEFT"] = "WL";
        // Miscellaneous Properties
        PropIdent["FIGURE"] = "FG";
        PropIdent["PRINT_MOVE_NUMBERS"] = "PM";
        PropIdent["BOARD_SECTION"] = "VW";
        PropIdent["HANDICAP"] = "HA";
        // GO specific Properties
        PropIdent["KOMI"] = "KM";
        PropIdent["BLACK_TERRITORY"] = "TB";
        PropIdent["WHITE_TERRITORY"] = "TW";
    })(PropIdent || (PropIdent = {}));
    //# sourceMappingURL=sgfTypes.js.map

    function beforeInitSZ(event) {
        event.target.params.size = event.value;
    }
    function beforeInitRU(event) {
        if (goRules[event.value]) {
            event.target.params.rules = goRules[event.value];
        }
    }
    function applyGameChangesHA(event) {
        if (event.value > 1 &&
            event.target.currentNode === event.target.rootNode &&
            !event.target.getProperty(PropIdent.SET_TURN)) {
            event.target.game.position.turn = exports.Color.WHITE;
        }
    }
    function applyGameChangesMove(event) {
        var color = event.propIdent === 'B' ? exports.Color.B : exports.Color.W;
        // if this is false, move is pass
        if (event.value) {
            event.target.game.position.applyMove(event.value.x, event.value.y, color, true, true);
        }
        event.target.game.position.turn = -color;
    }
    function applyGameChangesPL(event) {
        event.target.game.turn = event.value;
    }
    function applyGameChangesSetup(event) {
        var color;
        switch (event.propIdent) {
            case 'AB':
                color = exports.Color.B;
                break;
            case 'AW':
                color = exports.Color.W;
                break;
            case 'AE':
                color = exports.Color.E;
                break;
        }
        event.value.forEach(function (value) {
            // add stone
            event.target.game.setStone(value.x, value.y, color);
        });
    }
    //# sourceMappingURL=basePropertyListeners.js.map

    var PlayerBase = /** @class */ (function (_super) {
        __extends(PlayerBase, _super);
        function PlayerBase() {
            var _this = _super.call(this) || this;
            _this.on('beforeInit.SZ', beforeInitSZ);
            _this.on('beforeInit.RU', beforeInitRU);
            _this.on('applyGameChanges.HA', applyGameChangesHA);
            _this.on('applyGameChanges.B', applyGameChangesMove);
            _this.on('applyGameChanges.W', applyGameChangesMove);
            _this.on('applyGameChanges.PL', applyGameChangesPL);
            _this.on('applyGameChanges.AB', applyGameChangesSetup);
            _this.on('applyGameChanges.AW', applyGameChangesSetup);
            _this.on('applyGameChanges.AE', applyGameChangesSetup);
            return _this;
        }
        /**
         * Load game (kifu) from KifuNode.
         */
        PlayerBase.prototype.loadKifu = function (rootNode) {
            this.rootNode = rootNode;
            this.currentNode = rootNode;
            this.executeRoot();
        };
        /**
         * Create new game (kifu) and init player with it.
         */
        PlayerBase.prototype.newGame = function (size, rules) {
            var rootNode = new KifuNode();
            if (size) {
                rootNode.setProperty('SZ', size);
            }
            if (rules) {
                // TODO: handle rules more correctly
                var rulesName = Object.keys(goRules).find(function (name) { return goRules[name] === rules; });
                if (rulesName) {
                    rootNode.setProperty('RU', rulesName);
                }
            }
            this.loadKifu(rootNode);
        };
        /**
         * Executes root properties during initialization. If some properties change, call this to re-init player.
         */
        PlayerBase.prototype.executeRoot = function () {
            this.params = {
                size: 19,
                rules: JAPANESE_RULES,
            };
            this.emitNodeLifeCycleEvent('beforeInit');
            this.game = new Game(this.params.size, this.params.rules);
            this.executeNode();
        };
        PlayerBase.prototype.executeNode = function () {
            this.emitNodeLifeCycleEvent('applyGameChanges');
            this.emitNodeLifeCycleEvent('applyNodeChanges');
        };
        /**
         * Change current node to specified next node and executes its properties.
         */
        PlayerBase.prototype.executeNext = function (i) {
            this.emitNodeLifeCycleEvent('clearNodeChanges');
            this.game.pushPosition(this.game.position.clone());
            this.currentNode = this.currentNode.children[i];
            this.executeNode();
        };
        /**
         * Change current node to previous/parent next node and executes its properties.
         */
        PlayerBase.prototype.executePrevious = function () {
            this.emitNodeLifeCycleEvent('clearNodeChanges');
            this.emitNodeLifeCycleEvent('clearGameChanges');
            this.game.popPosition();
            this.currentNode = this.currentNode.parent;
            this.emitNodeLifeCycleEvent('applyNodeChanges');
        };
        /**
         * Emits node life cycle method (for every property)
         */
        PlayerBase.prototype.emitNodeLifeCycleEvent = function (name) {
            var _this = this;
            this.emit(name, {
                name: name,
                target: this,
            });
            this.currentNode.forEachProperty(function (propIdent, value) {
                _this.emit(name + "." + propIdent, {
                    name: name,
                    target: _this,
                    propIdent: propIdent,
                    value: value,
                });
            });
        };
        PlayerBase.prototype.getPropertyHandler = function (propIdent) {
            return this.constructor.propertyHandlers[propIdent];
        };
        /**
         * Gets property of current node.
         */
        PlayerBase.prototype.getProperty = function (propIdent) {
            return this.currentNode.getProperty(propIdent);
        };
        /**
         * Sets property of current node.
         */
        // setProperty(propIdent: PropIdent) {
        //   return this.currentNode.setProperty(propIdent);
        // }
        /**
         * Gets property of root node.
         */
        PlayerBase.prototype.getRootProperty = function (propIdent) {
            return this.rootNode.getProperty(propIdent);
        };
        /**
         * Returns array of next nodes (children).
         */
        PlayerBase.prototype.getNextNodes = function () {
            return this.currentNode.children;
        };
        /**
         * Go to (specified) next node and execute it.
         */
        PlayerBase.prototype.next = function (node) {
            if (node === void 0) { node = 0; }
            if (this.currentNode.children.length) {
                var i = void 0;
                if (typeof node === 'number') {
                    i = node;
                }
                else {
                    i = this.currentNode.children.indexOf(node);
                }
                if (this.currentNode.children[i]) {
                    this.executeNext(i);
                    return true;
                }
            }
            return false;
        };
        /**
         * Go to the previous node.
         */
        PlayerBase.prototype.previous = function () {
            if (this.currentNode.parent) {
                this.executePrevious();
                return true;
            }
            return false;
        };
        /**
         * Go to the first position - root node.
         */
        PlayerBase.prototype.first = function () {
            // not sure if effective - TODO: check if there is a better way to do this
            while (this.previous()) { }
        };
        /**
         * Go to the last position.
         */
        PlayerBase.prototype.last = function () {
            while (this.next()) { }
        };
        /**
         * Go to a node specified by path or move number.
         */
        PlayerBase.prototype.goTo = function (pathOrMoveNumber) {
            // TODO: check if there is a better way to do this
            var path = typeof pathOrMoveNumber === 'number' ? { depth: pathOrMoveNumber, forks: [] } : pathOrMoveNumber;
            this.first();
            for (var i = 0, j = 0; i < path.depth; i++) {
                if (this.currentNode.children.length > 1) {
                    this.next(path.forks[j++]);
                }
                else {
                    this.next();
                }
            }
        };
        /**
         * Get path to current node
         */
        PlayerBase.prototype.getCurrentPath = function () {
            var path = { depth: 0, forks: [] };
            var node = this.currentNode;
            while (node.parent) {
                path.depth++;
                if (node.parent.children.length > 1) {
                    path.forks.push(node.parent.children.indexOf(node));
                }
                node = node.parent;
            }
            return path;
        };
        /**
           * Go to previous fork (a node with more than one child).
           */
        PlayerBase.prototype.previousFork = function () {
            while (this.previous()) {
                if (this.currentNode.children.length > 1) {
                    return;
                }
            }
        };
        return PlayerBase;
    }(EventEmitter));
    //# sourceMappingURL=PlayerBase.js.map

    //# sourceMappingURL=PropertyHandler.js.map

    //# sourceMappingURL=index.js.map

    var defaultSimplePlayerConfig = {
        boardTheme: defaultBoardBaseTheme,
        highlightCurrentMove: true,
        currentMoveBlackMark: new Circle$1({ color: 'rgba(255,255,255,0.8)', fillColor: 'rgba(0,0,0,0)' }),
        currentMoveWhiteMark: new Circle$1({ color: 'rgba(0,0,0,0.8)', fillColor: 'rgba(0,0,0,0)' }),
        enableMouseWheel: true,
        enableKeys: true,
        showVariations: true,
        showCurrentVariations: false,
        variationDrawHandler: new Label$1({ color: '#33f' }),
        formatNicks: true,
        formatMoves: true,
    };
    //# sourceMappingURL=defaultSimplePlayerConfig.js.map

    /**
     * Component of Simple Board - can be board, box with comments, control panel, etc...
     */
    var Component = /** @class */ (function () {
        function Component(player) {
            this.player = player;
        }
        return Component;
    }());
    //# sourceMappingURL=Component.js.map

    /**
     * Helper class for storing data (temporary) to SGF properties.
     */
    var PropertiesData = /** @class */ (function () {
        function PropertiesData(player) {
            // init properties data map
            this.propertiesData = new Map();
            this.player = player;
        }
        /**
         * Gets property data of current node - data are temporary not related to SGF.
         */
        PropertiesData.prototype.get = function (propIdent, node) {
            if (node === void 0) { node = this.player.currentNode; }
            var currentNodeData = this.propertiesData.get(node);
            return currentNodeData ? currentNodeData[propIdent] : undefined;
        };
        /**
         * Sets property data of specified node.
         */
        PropertiesData.prototype.set = function (propIdent, data, node) {
            if (node === void 0) { node = this.player.currentNode; }
            var currentNodeData = this.propertiesData.get(node);
            if (data == null) {
                if (currentNodeData) {
                    delete currentNodeData[propIdent];
                }
            }
            else {
                if (!currentNodeData) {
                    currentNodeData = {};
                    this.propertiesData.set(node, currentNodeData);
                }
                currentNodeData[propIdent] = data;
            }
        };
        /**
         * Clears property data of specified node.
         */
        PropertiesData.prototype.clear = function (propIdent, node) {
            if (node === void 0) { node = this.player.currentNode; }
            this.set(propIdent, null, node);
        };
        return PropertiesData;
    }());
    //# sourceMappingURL=PropertiesData.js.map

    var colorsMap = {
        B: exports.Color.BLACK,
        W: exports.Color.WHITE,
    };
    var SVGBoardComponent = /** @class */ (function (_super) {
        __extends(SVGBoardComponent, _super);
        function SVGBoardComponent(player) {
            var _this = _super.call(this, player) || this;
            _this.propertiesData = new PropertiesData(player);
            _this.applyNodeChanges = _this.applyNodeChanges.bind(_this);
            _this.clearNodeChanges = _this.clearNodeChanges.bind(_this);
            _this.applyMarkupProperty = _this.applyMarkupProperty.bind(_this);
            _this.applyLabelMarkupProperty = _this.applyLabelMarkupProperty.bind(_this);
            _this.applyLineMarkupProperty = _this.applyLineMarkupProperty.bind(_this);
            _this.clearMarkupProperty = _this.clearMarkupProperty.bind(_this);
            _this.applyViewportProperty = _this.applyViewportProperty.bind(_this);
            _this.clearViewportProperty = _this.clearViewportProperty.bind(_this);
            _this.applyMoveProperty = _this.applyMoveProperty.bind(_this);
            _this.clearMoveProperty = _this.clearMoveProperty.bind(_this);
            return _this;
        }
        SVGBoardComponent.prototype.create = function () {
            var _this = this;
            this.boardElement = document.createElement('div');
            this.boardElement.className = 'wgo-player__board';
            this.stoneBoardsObjects = [];
            this.variationBoardObjects = [];
            this.board = new SVGBoard(this.boardElement, {
            // theme: this.config.boardTheme,
            });
            this.board.on('click', function (event, point) {
                _this.handleBoardClick(point);
            });
            this.board.on('mousemove', function (event, point) {
                if (!point) {
                    if (_this.boardMouseX != null) {
                        _this.boardMouseX = null;
                        _this.boardMouseY = null;
                        _this.handleBoardMouseOut();
                    }
                    return;
                }
                if (point.x !== _this.boardMouseX || point.y !== _this.boardMouseY) {
                    _this.boardMouseX = point.x;
                    _this.boardMouseY = point.y;
                    _this.handleBoardMouseMove(point);
                }
            });
            this.board.on('mouseout', function (event, point) {
                if (!point && _this.boardMouseX != null) {
                    _this.boardMouseX = null;
                    _this.boardMouseY = null;
                    _this.handleBoardMouseOut();
                    return;
                }
            });
            // add general node listeners - for setting stones on board based on position
            this.player.on('applyNodeChanges', this.applyNodeChanges);
            this.player.on('clearNodeChanges', this.clearNodeChanges);
            // temporary board markup listeners - add
            this.player.on('applyNodeChanges.CR', this.applyMarkupProperty);
            this.player.on('applyNodeChanges.TR', this.applyMarkupProperty);
            this.player.on('applyNodeChanges.SQ', this.applyMarkupProperty);
            this.player.on('applyNodeChanges.SL', this.applyMarkupProperty);
            this.player.on('applyNodeChanges.MA', this.applyMarkupProperty);
            this.player.on('applyNodeChanges.DD', this.applyMarkupProperty);
            this.player.on('applyNodeChanges.LB', this.applyLabelMarkupProperty);
            this.player.on('applyNodeChanges.LN', this.applyLineMarkupProperty);
            this.player.on('applyNodeChanges.AR', this.applyLineMarkupProperty);
            // temporary board markup listeners - clear
            this.player.on('clearNodeChanges.CR', this.clearMarkupProperty);
            this.player.on('clearNodeChanges.TR', this.clearMarkupProperty);
            this.player.on('clearNodeChanges.SQ', this.clearMarkupProperty);
            this.player.on('clearNodeChanges.SL', this.clearMarkupProperty);
            this.player.on('clearNodeChanges.MA', this.clearMarkupProperty);
            this.player.on('clearNodeChanges.DD', this.clearMarkupProperty);
            this.player.on('clearNodeChanges.LB', this.clearMarkupProperty);
            this.player.on('clearNodeChanges.LN', this.clearMarkupProperty);
            this.player.on('clearNodeChanges.AR', this.clearMarkupProperty);
            // viewport SGF property listeners
            this.player.on('applyGameChanges.VW', this.applyViewportProperty);
            this.player.on('clearGameChanges.VW', this.clearViewportProperty);
            // add current move marker
            this.player.on('applyNodeChanges.B', this.applyMoveProperty);
            this.player.on('applyNodeChanges.W', this.applyMoveProperty);
            this.player.on('clearNodeChanges.B', this.clearMoveProperty);
            this.player.on('clearNodeChanges.W', this.clearMoveProperty);
            return this.boardElement;
        };
        SVGBoardComponent.prototype.destroy = function () {
            this.player.off('applyNodeChanges', this.applyNodeChanges);
            this.player.off('clearNodeChanges', this.clearNodeChanges);
            this.player.off('applyNodeChanges', this.applyNodeChanges);
            this.player.off('clearNodeChanges', this.clearNodeChanges);
            this.player.off('applyNodeChanges.CR', this.applyMarkupProperty);
            this.player.off('applyNodeChanges.TR', this.applyMarkupProperty);
            this.player.off('applyNodeChanges.SQ', this.applyMarkupProperty);
            this.player.off('applyNodeChanges.SL', this.applyMarkupProperty);
            this.player.off('applyNodeChanges.MA', this.applyMarkupProperty);
            this.player.off('applyNodeChanges.DD', this.applyMarkupProperty);
            this.player.off('applyNodeChanges.LB', this.applyLabelMarkupProperty);
            this.player.off('applyNodeChanges.LN', this.applyLineMarkupProperty);
            this.player.off('applyNodeChanges.AR', this.applyLineMarkupProperty);
            this.player.off('clearNodeChanges.CR', this.clearMarkupProperty);
            this.player.off('clearNodeChanges.TR', this.clearMarkupProperty);
            this.player.off('clearNodeChanges.SQ', this.clearMarkupProperty);
            this.player.off('clearNodeChanges.SL', this.clearMarkupProperty);
            this.player.off('clearNodeChanges.MA', this.clearMarkupProperty);
            this.player.off('clearNodeChanges.DD', this.clearMarkupProperty);
            this.player.off('clearNodeChanges.LB', this.clearMarkupProperty);
            this.player.off('clearNodeChanges.LN', this.clearMarkupProperty);
            this.player.off('clearNodeChanges.AR', this.clearMarkupProperty);
            this.player.off('applyGameChanges.VW', this.applyViewportProperty);
            this.player.off('clearGameChanges.VW', this.clearViewportProperty);
            this.player.off('applyNodeChanges.B', this.applyMoveProperty);
            this.player.off('applyNodeChanges.W', this.applyMoveProperty);
            this.player.off('clearNodeChanges.B', this.clearMoveProperty);
            this.player.off('clearNodeChanges.W', this.clearMoveProperty);
        };
        SVGBoardComponent.prototype.updateStones = function () {
            var _this = this;
            // Remove missing stones in current position
            this.stoneBoardsObjects = this.stoneBoardsObjects.filter(function (boardObject) {
                if (_this.player.game.getStone(boardObject.x, boardObject.y) !== colorsMap[boardObject.type]) {
                    _this.board.removeObject(boardObject);
                    return false;
                }
                return true;
            });
            // Add new stones from current position
            var position = this.player.game.position;
            var _loop_1 = function (x) {
                var _loop_2 = function (y) {
                    var c = position.get(x, y);
                    if (c && !this_1.stoneBoardsObjects.some(function (boardObject) { return boardObject.x === x && boardObject.y === y && c === colorsMap[boardObject.type]; })) {
                        var boardObject = new FieldObject(c === exports.Color.B ? 'B' : 'W');
                        this_1.board.addObjectAt(x, y, boardObject);
                        this_1.stoneBoardsObjects.push(boardObject);
                    }
                };
                for (var y = 0; y < position.size; y++) {
                    _loop_2(y);
                }
            };
            var this_1 = this;
            for (var x = 0; x < position.size; x++) {
                _loop_1(x);
            }
        };
        SVGBoardComponent.prototype.addVariationMarkup = function () {
            var _this = this;
            var moves = this.player.getVariations();
            if (moves.length > 1) {
                moves.forEach(function (move, i) {
                    if (move) {
                        var obj = new BoardLabelObject(String.fromCodePoint(65 + i));
                        _this.variationBoardObjects.push(obj);
                        obj.type = _this.player.config.variationDrawHandler;
                        _this.board.addObjectAt(move.x, move.y, obj);
                    }
                });
                if (this.boardMouseX != null) {
                    this.handleVariationCursor(this.boardMouseX, this.boardMouseY, moves);
                }
            }
        };
        SVGBoardComponent.prototype.removeVariationMarkup = function () {
            if (this.variationBoardObjects.length) {
                this.board.removeObject(this.variationBoardObjects);
                this.variationBoardObjects = [];
                this.removeVariationCursor();
            }
        };
        SVGBoardComponent.prototype.handleBoardClick = function (point) {
            // this.emit('boardClick', point);
            var moves = this.player.getVariations();
            if (moves.length > 1) {
                var ind = moves.findIndex(function (move) { return move && move.x === point.x && move.y === point.y; });
                if (ind >= 0) {
                    if (this.player.shouldShowCurrentVariations()) {
                        this.player.previous();
                        this.player.next(ind);
                    }
                    else {
                        this.player.next(ind);
                    }
                }
            }
        };
        SVGBoardComponent.prototype.handleBoardMouseMove = function (point) {
            // this.emit('boardMouseMove', point);
            this.handleVariationCursor(point.x, point.y, this.player.getVariations());
        };
        SVGBoardComponent.prototype.handleBoardMouseOut = function () {
            // this.emit('boardMouseOut');
            this.removeVariationCursor();
        };
        SVGBoardComponent.prototype.handleVariationCursor = function (x, y, moves) {
            if (moves.length > 1) {
                var ind = moves.findIndex(function (move) { return move && move.x === x && move.y === y; });
                if (ind >= 0) {
                    this.boardElement.style.cursor = 'pointer';
                    return;
                }
            }
            this.removeVariationCursor();
        };
        SVGBoardComponent.prototype.removeVariationCursor = function () {
            if (this.boardElement.style.cursor) {
                this.boardElement.style.cursor = '';
            }
        };
        SVGBoardComponent.prototype.applyNodeChanges = function () {
            this.updateStones();
            this.addVariationMarkup();
        };
        SVGBoardComponent.prototype.clearNodeChanges = function () {
            this.removeVariationMarkup();
        };
        SVGBoardComponent.prototype.applyMarkupProperty = function (event) {
            var _this = this;
            var objects = [];
            event.value.forEach(function (value) {
                // add markup
                var boardMarkup = new BoardMarkupObject(event.propIdent, _this.player.game.getStone(value.x, value.y));
                boardMarkup.zIndex = 10;
                _this.board.addObjectAt(value.x, value.y, boardMarkup);
                objects.push(boardMarkup);
            });
            this.propertiesData.set(event.propIdent, objects);
        };
        SVGBoardComponent.prototype.applyLabelMarkupProperty = function (event) {
            var _this = this;
            var objects = [];
            event.value.forEach(function (value) {
                // add markup
                var boardMarkup = new BoardLabelObject(value.text, _this.player.game.getStone(value.x, value.y));
                boardMarkup.zIndex = 10;
                _this.board.addObjectAt(value.x, value.y, boardMarkup);
                objects.push(boardMarkup);
            });
            this.propertiesData.set(event.propIdent, objects);
        };
        SVGBoardComponent.prototype.applyLineMarkupProperty = function (event) {
            var _this = this;
            var objects = [];
            event.value.forEach(function (value) {
                // add markup
                var boardMarkup = new BoardLineObject(event.propIdent, value[0], value[1]);
                boardMarkup.zIndex = 10;
                _this.board.addObject(boardMarkup);
                objects.push(boardMarkup);
            });
            this.propertiesData.set(event.propIdent, objects);
        };
        SVGBoardComponent.prototype.clearMarkupProperty = function (event) {
            this.board.removeObject(this.propertiesData.get(event.propIdent));
            this.propertiesData.clear(event.propIdent);
        };
        SVGBoardComponent.prototype.applyViewportProperty = function (event) {
            var currentViewport = this.board.getViewport();
            if (event.value) {
                var minX = Math.min(event.value[0].x, event.value[1].x);
                var minY = Math.min(event.value[0].y, event.value[1].y);
                var maxX = Math.max(event.value[0].x, event.value[1].x);
                var maxY = Math.max(event.value[0].y, event.value[1].y);
                this.board.setViewport({
                    left: minX,
                    top: minY,
                    right: this.board.getSize() - maxX - 1,
                    bottom: this.board.getSize() - maxY - 1,
                });
            }
            else {
                this.board.setViewport({
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                });
            }
            this.propertiesData.set(event.propIdent, currentViewport);
        };
        SVGBoardComponent.prototype.clearViewportProperty = function (event) {
            this.board.setViewport(this.propertiesData.get(event.propIdent));
            this.propertiesData.clear(event.propIdent, null);
        };
        SVGBoardComponent.prototype.applyMoveProperty = function (event) {
            if (this.player.config.highlightCurrentMove) {
                var variationsMarkup = this.player.getVariations().length > 1 && this.player.shouldShowCurrentVariations();
                if (isThereMarkup(event.value, this.player.currentNode.properties) || variationsMarkup) {
                    return;
                }
                // add current move mark
                var boardMarkup = new BoardMarkupObject(event.propIdent === 'B' ? this.player.config.currentMoveBlackMark : this.player.config.currentMoveWhiteMark);
                boardMarkup.zIndex = 10;
                this.board.addObjectAt(event.value.x, event.value.y, boardMarkup);
                this.propertiesData.set(event.propIdent, boardMarkup);
            }
        };
        SVGBoardComponent.prototype.clearMoveProperty = function (event) {
            var propertyData = this.propertiesData.get(event.propIdent);
            if (propertyData) {
                this.board.removeObject(propertyData);
            }
            this.propertiesData.clear(event.propIdent);
        };
        return SVGBoardComponent;
    }(Component));
    function samePoint(p1, p2) {
        return p2 && p1.x === p2.x && p1.y === p2.y;
    }
    function isThereMarkup(field, properties) {
        var propIdents = Object.keys(properties);
        for (var i = 0; i < propIdents.length; i++) {
            if (propIdents[i] === 'B' || propIdents[i] === 'W') {
                continue;
            }
            var value = properties[propIdents[i]];
            if (Array.isArray(value)) {
                for (var j = 0; j < value.length; j++) {
                    if (samePoint(field, value[j])) {
                        return true;
                    }
                }
            }
            else if (samePoint(field, value)) {
                return true;
            }
        }
        return false;
    }
    //# sourceMappingURL=SVGBoardComponent.js.map

    var Container = /** @class */ (function (_super) {
        __extends(Container, _super);
        function Container(player, config, children) {
            var _this = _super.call(this, player) || this;
            _this.children = children;
            _this.config = config;
            return _this;
        }
        Container.prototype.create = function () {
            var _this = this;
            this.element = document.createElement('div');
            this.element.className = "wgo-player__container wgo-player__container--" + this.config.direction;
            this.children.forEach(function (child) {
                _this.element.appendChild(child.create());
            });
            return this.element;
        };
        Container.prototype.destroy = function () {
            var _this = this;
            this.children.forEach(function (child) {
                child.destroy();
                _this.element.removeChild(_this.element.firstChild);
            });
        };
        return Container;
    }(Component));
    //# sourceMappingURL=Container.js.map

    var PlayerTag = /** @class */ (function (_super) {
        __extends(PlayerTag, _super);
        function PlayerTag(player, color) {
            var _this = _super.call(this, player) || this;
            _this.color = color;
            _this.colorChar = color === exports.Color.B ? 'B' : 'W';
            _this.colorName = color === exports.Color.B ? 'black' : 'white';
            _this.setName = _this.setName.bind(_this);
            _this.setRank = _this.setRank.bind(_this);
            _this.setTeam = _this.setTeam.bind(_this);
            _this.setCaps = _this.setCaps.bind(_this);
            return _this;
        }
        PlayerTag.prototype.create = function () {
            // create HTML
            this.element = document.createElement('div');
            this.element.className = 'wgo-player__box wgo-player__player-tag';
            var playerElement = document.createElement('div');
            playerElement.className = 'wgo-player__player-tag__name';
            this.element.appendChild(playerElement);
            this.playerNameElement = document.createElement('span');
            playerElement.appendChild(this.playerNameElement);
            this.playerRankElement = document.createElement('small');
            this.playerRankElement.className = 'wgo-player__player-tag__name__rank';
            playerElement.appendChild(this.playerRankElement);
            this.playerCapsElement = document.createElement('div');
            this.playerCapsElement.className = "wgo-player__player-tag__color wgo-player__player-tag__color--" + this.colorName;
            this.playerCapsElement.textContent = '0';
            this.element.appendChild(this.playerCapsElement);
            // todo team
            this.playerTeamElement = document.createElement('div');
            // attach Kifu listeners
            this.player.on("beforeInit.P" + this.colorChar, this.setName); // property PB or PW
            this.player.on("beforeInit." + this.colorChar + "R", this.setRank); // property BR or WR
            this.player.on("beforeInit." + this.colorChar + "T", this.setTeam); // property BT or WT
            this.player.on('applyNodeChanges', this.setCaps);
            return this.element;
        };
        PlayerTag.prototype.destroy = function () {
            this.player.off("beforeInit.P" + this.colorChar, this.setName);
            this.player.off("beforeInit." + this.colorChar + "R", this.setRank);
            this.player.off("beforeInit." + this.colorChar + "T", this.setTeam);
            this.player.off('applyNodeChanges', this.setCaps);
        };
        PlayerTag.prototype.setName = function (event) {
            this.playerNameElement.textContent = event.value;
        };
        PlayerTag.prototype.setRank = function (event) {
            this.playerRankElement.textContent = event.value;
        };
        PlayerTag.prototype.setTeam = function (event) {
            this.playerTeamElement.textContent = event.value;
        };
        PlayerTag.prototype.setCaps = function () {
            this.playerCapsElement.textContent = this.player.game.position.capCount[this.colorName].toString();
        };
        return PlayerTag;
    }(Component));
    //# sourceMappingURL=PlayerTag.js.map

    var CommentBox = /** @class */ (function (_super) {
        __extends(CommentBox, _super);
        function CommentBox(player) {
            var _this = _super.call(this, player) || this;
            _this.setComments = _this.setComments.bind(_this);
            _this.clearComments = _this.clearComments.bind(_this);
            return _this;
        }
        CommentBox.prototype.create = function () {
            this.element = document.createElement('div');
            this.element.className = 'wgo-player__box wgo-player__box--content wgo-player__box--stretch';
            var title = document.createElement('div');
            title.innerHTML = 'Comments';
            title.className = 'wgo-player__box__title';
            this.element.appendChild(title);
            this.commentsElement = document.createElement('div');
            this.commentsElement.className = 'wgo-player__box__content';
            this.element.appendChild(this.commentsElement);
            this.player.on('applyNodeChanges.C', this.setComments);
            this.player.on('clearNodeChanges.C', this.clearComments);
            return this.element;
        };
        CommentBox.prototype.destroy = function () {
            this.player.off('applyNodeChanges.C', this.setComments);
            this.player.off('clearNodeChanges.C', this.clearComments);
        };
        CommentBox.prototype.setComments = function (event) {
            this.commentsElement.innerHTML = this.formatComment(event.value);
        };
        CommentBox.prototype.clearComments = function () {
            this.commentsElement.textContent = '';
        };
        CommentBox.prototype.formatComment = function (text) {
            // remove HTML tags from text
            var formattedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            // divide text into paragraphs
            formattedText = "<p>" + formattedText.replace(/\n/g, '</p><p>') + "</p>";
            if (this.player.config.formatNicks) {
                formattedText = formattedText.replace(/(<p>)([^:]{3,}:)\s/g, '<p><span class="wgo-player__nick">$2</span> ');
            }
            if (this.player.config.formatMoves) {
                // tslint:disable-next-line:max-line-length
                formattedText = formattedText.replace(/\b[a-zA-Z]1?\d\b/g, '<a href="javascript:void(0)" class="wgo-player__move-link">$&</a>');
            }
            return formattedText;
        };
        return CommentBox;
    }(Component));
    //# sourceMappingURL=CommentsBox.js.map

    var gameInfoProperties = {
        DT: 'Date',
        KM: 'Komi',
        HA: 'Handicap',
        AN: 'Annotations',
        CP: 'Copyright',
        GC: 'Game comments',
        GN: 'Game name',
        ON: 'Fuseki',
        OT: 'Overtime',
        TM: 'Basic time',
        RE: 'Result',
        RO: 'Round',
        RU: 'Rules',
        US: 'Recorder',
        PC: 'Place',
        EV: 'Event',
        SO: 'Source',
    };
    var GameInfoBox = /** @class */ (function (_super) {
        __extends(GameInfoBox, _super);
        function GameInfoBox(player) {
            var _this = _super.call(this, player) || this;
            _this.printInfo = _this.printInfo.bind(_this);
            return _this;
        }
        GameInfoBox.prototype.create = function () {
            this.element = document.createElement('div');
            this.element.className = 'wgo-player__box wgo-player__box--content';
            var title = document.createElement('div');
            title.innerHTML = 'Game information';
            title.className = 'wgo-player__box__title';
            this.element.appendChild(title);
            this.infoTable = document.createElement('table');
            this.infoTable.className = 'wgo-player__box__game-info';
            this.element.appendChild(this.infoTable);
            this.player.on('beforeInit', this.printInfo);
            return this.element;
        };
        GameInfoBox.prototype.destroy = function () {
            this.player.off('beforeInit', this.printInfo);
        };
        GameInfoBox.prototype.addInfo = function (propIdent, value) {
            var row = document.createElement('tr');
            row.dataset.propIdent = propIdent;
            this.infoTable.appendChild(row);
            var label = document.createElement('th');
            label.textContent = gameInfoProperties[propIdent];
            row.appendChild(label);
            var valueElement = document.createElement('td');
            valueElement.textContent = value;
            row.appendChild(valueElement);
        };
        GameInfoBox.prototype.removeInfo = function (propIdent) {
            var elem = this.infoTable.querySelector("[data-id='" + propIdent + "']");
            this.infoTable.removeChild(elem);
        };
        GameInfoBox.prototype.printInfo = function () {
            var _this = this;
            this.infoTable.innerHTML = '';
            this.player.rootNode.forEachProperty(function (propIdent, value) {
                if (gameInfoProperties[propIdent]) {
                    _this.addInfo(propIdent, value);
                }
            });
        };
        return GameInfoBox;
    }(Component));
    //# sourceMappingURL=GameInfoBox.js.map

    var ControlPanel = /** @class */ (function (_super) {
        __extends(ControlPanel, _super);
        function ControlPanel(player) {
            var _this = _super.call(this, player) || this;
            _this.update = _this.update.bind(_this);
            return _this;
        }
        ControlPanel.prototype.create = function () {
            var _this = this;
            this.element = document.createElement('div');
            this.element.className = 'wgo-player__control-panel';
            var buttonGroup = document.createElement('form');
            buttonGroup.className = 'wgo-player__button-group';
            this.element.appendChild(buttonGroup);
            buttonGroup.addEventListener('submit', function (e) {
                e.preventDefault();
                _this.player.goTo(parseInt(_this.moveNumber.value, 10));
            });
            this.first = document.createElement('button');
            this.first.type = 'button';
            this.first.className = 'wgo-player__button';
            this.first.innerHTML = '<span class="wgo-player__icon-to-end wgo-player__icon--reverse"></span>';
            this.first.addEventListener('click', function () { return _this.player.first(); });
            buttonGroup.appendChild(this.first);
            this.previous = document.createElement('button');
            this.previous.type = 'button';
            this.previous.className = 'wgo-player__button';
            this.previous.innerHTML = '<span class="wgo-player__icon-play wgo-player__icon--reverse"></span>';
            this.previous.addEventListener('click', function () { return _this.player.previous(); });
            buttonGroup.appendChild(this.previous);
            this.moveNumber = document.createElement('input');
            this.moveNumber.className = 'wgo-player__button wgo-player__move-number';
            this.moveNumber.value = '0';
            this.moveNumber.addEventListener('blur', function (e) {
                _this.player.goTo(parseInt(_this.moveNumber.value, 10));
            });
            buttonGroup.appendChild(this.moveNumber);
            this.next = document.createElement('button');
            this.next.type = 'button';
            this.next.className = 'wgo-player__button';
            this.next.innerHTML = '<span class="wgo-player__icon-play"></span>';
            this.next.addEventListener('click', function () { return _this.player.next(); });
            buttonGroup.appendChild(this.next);
            this.last = document.createElement('button');
            this.last.type = 'button';
            this.last.className = 'wgo-player__button';
            this.last.innerHTML = '<span class="wgo-player__icon-to-end"></span>';
            this.last.addEventListener('click', function () { return _this.player.last(); });
            buttonGroup.appendChild(this.last);
            var menu = document.createElement('button');
            menu.type = 'button';
            menu.className = 'wgo-player__button wgo-player__button--menu';
            menu.innerHTML = '<span class="wgo-player__icon-menu"></span>';
            // menu.addEventListener('click', () => this.player.last());
            this.element.appendChild(menu);
            this.player.on('applyNodeChanges', this.update);
            return this.element;
        };
        ControlPanel.prototype.destroy = function () {
            this.player.off('applyNodeChanges', this.update);
        };
        ControlPanel.prototype.update = function () {
            this.moveNumber.value = String(this.player.getCurrentPath().depth);
            if (!this.player.currentNode.parent) {
                this.first.disabled = true;
                this.previous.disabled = true;
            }
            else {
                this.first.disabled = false;
                this.previous.disabled = false;
            }
            if (this.player.currentNode.children.length === 0) {
                this.next.disabled = true;
                this.last.disabled = true;
            }
            else {
                this.next.disabled = false;
                this.last.disabled = false;
            }
        };
        return ControlPanel;
    }(Component));
    //# sourceMappingURL=ControlPanel.js.map

    var SimplePlayer = /** @class */ (function (_super) {
        __extends(SimplePlayer, _super);
        function SimplePlayer(element, config) {
            if (config === void 0) { config = {}; }
            var _this = _super.call(this) || this;
            // merge user config with default
            _this.element = element;
            _this.config = makeConfig(defaultSimplePlayerConfig, config);
            _this.init();
            return _this;
        }
        SimplePlayer.prototype.init = function () {
            var _this = this;
            this.mainElement = document.createElement('div');
            this.mainElement.className = 'wgo-player';
            this.mainElement.tabIndex = 1;
            this.element.appendChild(this.mainElement);
            document.addEventListener('mousewheel', this._mouseWheelEvent = function (e) {
                if (document.activeElement === _this.mainElement && _this.config.enableMouseWheel) {
                    if (e.deltaY > 0) {
                        _this.next();
                    }
                    else if (e.deltaY < 0) {
                        _this.previous();
                    }
                    return false;
                }
            });
            document.addEventListener('keydown', this._keyEvent = function (e) {
                if (document.activeElement === _this.mainElement && _this.config.enableKeys) {
                    if (e.key === 'ArrowRight') {
                        _this.next();
                    }
                    else if (e.key === 'ArrowLeft') {
                        _this.previous();
                    }
                    return false;
                }
            });
            // temp (maybe)
            this.layout = new Container(this, { direction: 'row' }, [
                new SVGBoardComponent(this),
                new Container(this, { direction: 'column' }, [
                    new PlayerTag(this, exports.Color.B),
                    new PlayerTag(this, exports.Color.W),
                    new ControlPanel(this),
                    new GameInfoBox(this),
                    new CommentBox(this),
                ]),
            ]);
            this.mainElement.appendChild(this.layout.create());
        };
        SimplePlayer.prototype.destroy = function () {
            document.removeEventListener('mousewheel', this._mouseWheelEvent);
            this._mouseWheelEvent = null;
            document.removeEventListener('keydown', this._keyEvent);
        };
        SimplePlayer.prototype.getVariations = function () {
            if (this.shouldShowVariations()) {
                if (this.shouldShowCurrentVariations()) {
                    if (this.currentNode.parent) {
                        return this.currentNode.parent.children.map(function (node) { return node.getProperty('B') || node.getProperty('W'); });
                    }
                }
                else {
                    return this.currentNode.children.map(function (node) { return node.getProperty('B') || node.getProperty('W'); });
                }
            }
            return [];
        };
        SimplePlayer.prototype.shouldShowVariations = function () {
            var st = this.rootNode.getProperty(PropIdent.VARIATIONS_STYLE);
            if (st != null) {
                return !(st & 2);
            }
            return this.config.showVariations;
        };
        SimplePlayer.prototype.shouldShowCurrentVariations = function () {
            var st = this.rootNode.getProperty(PropIdent.VARIATIONS_STYLE);
            if (st != null) {
                return !!(st & 1);
            }
            return this.config.showCurrentVariations;
        };
        return SimplePlayer;
    }(PlayerBase));
    //# sourceMappingURL=SimplePlayer.js.map

    //# sourceMappingURL=index.js.map

    // All public API is exported here
    //# sourceMappingURL=index.js.map

    exports.BoardBase = BoardBase;
    exports.BoardLabelObject = BoardLabelObject;
    exports.BoardLineObject = BoardLineObject;
    exports.BoardMarkupObject = BoardMarkupObject;
    exports.BoardObject = BoardObject;
    exports.CHINESE_RULES = CHINESE_RULES;
    exports.CanvasBoard = CanvasBoard;
    exports.FieldObject = FieldObject;
    exports.Game = Game;
    exports.ING_RULES = ING_RULES;
    exports.JAPANESE_RULES = JAPANESE_RULES;
    exports.KifuNode = KifuNode;
    exports.NO_RULES = NO_RULES;
    exports.PlayerBase = PlayerBase;
    exports.Position = Position;
    exports.SGFParser = SGFParser;
    exports.SGFSyntaxError = SGFSyntaxError;
    exports.SVGBoard = SVGBoard;
    exports.SimplePlayer = SimplePlayer;
    exports.drawHandlers = index;
    exports.goRules = goRules;
    exports.propertyValueTypes = propertyValueTypes;
    exports.themes = index$1;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=index.js.map
