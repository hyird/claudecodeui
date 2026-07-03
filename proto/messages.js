/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-mixed-operators, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars, default-case, jsdoc/require-param*/
import $protobuf from "protobufjs/minimal.js";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;
const $Object = $util.global.Object, $undefined = $util.global.undefined, $Error = $util.global.Error, $TypeError = $util.global.TypeError, $String = $util.global.String, $Number = $util.global.Number, $Boolean = $util.global.Boolean, $Array = $util.global.Array;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const cloudcli = $root.cloudcli = (() => {

    /**
     * Namespace cloudcli.
     * @exports cloudcli
     * @namespace
     */
    const cloudcli = {};

    cloudcli.Ping = (function() {

        /**
         * Properties of a Ping.
         * @typedef {Object} cloudcli.Ping.$Properties
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a Ping.
         * @memberof cloudcli
         * @interface IPing
         * @augments cloudcli.Ping.$Properties
         * @deprecated Use cloudcli.Ping.$Properties instead.
         */

        /**
         * Shape of a Ping.
         * @typedef {cloudcli.Ping.$Properties} cloudcli.Ping.$Shape
         */

        /**
         * Constructs a new Ping.
         * @memberof cloudcli
         * @classdesc Represents a Ping.
         * @constructor
         * @param {cloudcli.Ping.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const Ping = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * Creates a new Ping instance using the specified properties.
         * @function create
         * @memberof cloudcli.Ping
         * @static
         * @param {cloudcli.Ping.$Properties=} [properties] Properties to set
         * @returns {cloudcli.Ping} Ping instance
         * @type {{
         *   (properties: cloudcli.Ping.$Shape): cloudcli.Ping & cloudcli.Ping.$Shape;
         *   (properties?: cloudcli.Ping.$Properties): cloudcli.Ping;
         * }}
         */
        Ping.create = function(properties) {
            return new Ping(properties);
        };

        /**
         * Encodes the specified Ping message. Does not implicitly {@link cloudcli.Ping.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.Ping
         * @static
         * @param {cloudcli.Ping.$Properties} message Ping message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Ping.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified Ping message, length delimited. Does not implicitly {@link cloudcli.Ping.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.Ping
         * @static
         * @param {cloudcli.Ping.$Properties} message Ping message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Ping.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a Ping message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.Ping
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.Ping & cloudcli.Ping.$Shape} Ping
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Ping.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.Ping();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                reader.skipType(tag & 7, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a Ping message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.Ping
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.Ping & cloudcli.Ping.$Shape} Ping
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Ping.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Ping message.
         * @function verify
         * @memberof cloudcli.Ping
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Ping.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            return null;
        };

        /**
         * Creates a Ping message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.Ping
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.Ping} Ping
         */
        Ping.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.Ping)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.Ping: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            return new $root.cloudcli.Ping();
        };

        /**
         * Creates a plain object from a Ping message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.Ping
         * @static
         * @param {cloudcli.Ping} message Ping
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Ping.toObject = function () {
            return {};
        };

        /**
         * Converts this Ping to JSON.
         * @function toJSON
         * @memberof cloudcli.Ping
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Ping.prototype.toJSON = function() {
            return Ping.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for Ping
         * @function getTypeUrl
         * @memberof cloudcli.Ping
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        Ping.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.Ping";
        };

        return Ping;
    })();

    cloudcli.Pong = (function() {

        /**
         * Properties of a Pong.
         * @typedef {Object} cloudcli.Pong.$Properties
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a Pong.
         * @memberof cloudcli
         * @interface IPong
         * @augments cloudcli.Pong.$Properties
         * @deprecated Use cloudcli.Pong.$Properties instead.
         */

        /**
         * Shape of a Pong.
         * @typedef {cloudcli.Pong.$Properties} cloudcli.Pong.$Shape
         */

        /**
         * Constructs a new Pong.
         * @memberof cloudcli
         * @classdesc Represents a Pong.
         * @constructor
         * @param {cloudcli.Pong.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const Pong = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * Creates a new Pong instance using the specified properties.
         * @function create
         * @memberof cloudcli.Pong
         * @static
         * @param {cloudcli.Pong.$Properties=} [properties] Properties to set
         * @returns {cloudcli.Pong} Pong instance
         * @type {{
         *   (properties: cloudcli.Pong.$Shape): cloudcli.Pong & cloudcli.Pong.$Shape;
         *   (properties?: cloudcli.Pong.$Properties): cloudcli.Pong;
         * }}
         */
        Pong.create = function(properties) {
            return new Pong(properties);
        };

        /**
         * Encodes the specified Pong message. Does not implicitly {@link cloudcli.Pong.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.Pong
         * @static
         * @param {cloudcli.Pong.$Properties} message Pong message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Pong.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified Pong message, length delimited. Does not implicitly {@link cloudcli.Pong.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.Pong
         * @static
         * @param {cloudcli.Pong.$Properties} message Pong message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Pong.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a Pong message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.Pong
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.Pong & cloudcli.Pong.$Shape} Pong
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Pong.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.Pong();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                reader.skipType(tag & 7, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a Pong message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.Pong
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.Pong & cloudcli.Pong.$Shape} Pong
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Pong.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Pong message.
         * @function verify
         * @memberof cloudcli.Pong
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Pong.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            return null;
        };

        /**
         * Creates a Pong message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.Pong
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.Pong} Pong
         */
        Pong.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.Pong)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.Pong: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            return new $root.cloudcli.Pong();
        };

        /**
         * Creates a plain object from a Pong message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.Pong
         * @static
         * @param {cloudcli.Pong} message Pong
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Pong.toObject = function () {
            return {};
        };

        /**
         * Converts this Pong to JSON.
         * @function toJSON
         * @memberof cloudcli.Pong
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Pong.prototype.toJSON = function() {
            return Pong.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for Pong
         * @function getTypeUrl
         * @memberof cloudcli.Pong
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        Pong.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.Pong";
        };

        return Pong;
    })();

    cloudcli.ErrorMessage = (function() {

        /**
         * Properties of an ErrorMessage.
         * @typedef {Object} cloudcli.ErrorMessage.$Properties
         * @property {string|null} [message] ErrorMessage message
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of an ErrorMessage.
         * @memberof cloudcli
         * @interface IErrorMessage
         * @augments cloudcli.ErrorMessage.$Properties
         * @deprecated Use cloudcli.ErrorMessage.$Properties instead.
         */

        /**
         * Shape of an ErrorMessage.
         * @typedef {cloudcli.ErrorMessage.$Properties} cloudcli.ErrorMessage.$Shape
         */

        /**
         * Constructs a new ErrorMessage.
         * @memberof cloudcli
         * @classdesc Represents an ErrorMessage.
         * @constructor
         * @param {cloudcli.ErrorMessage.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ErrorMessage = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ErrorMessage message.
         * @member {string} message
         * @memberof cloudcli.ErrorMessage
         * @instance
         */
        ErrorMessage.prototype.message = "";

        /**
         * Creates a new ErrorMessage instance using the specified properties.
         * @function create
         * @memberof cloudcli.ErrorMessage
         * @static
         * @param {cloudcli.ErrorMessage.$Properties=} [properties] Properties to set
         * @returns {cloudcli.ErrorMessage} ErrorMessage instance
         * @type {{
         *   (properties: cloudcli.ErrorMessage.$Shape): cloudcli.ErrorMessage & cloudcli.ErrorMessage.$Shape;
         *   (properties?: cloudcli.ErrorMessage.$Properties): cloudcli.ErrorMessage;
         * }}
         */
        ErrorMessage.create = function(properties) {
            return new ErrorMessage(properties);
        };

        /**
         * Encodes the specified ErrorMessage message. Does not implicitly {@link cloudcli.ErrorMessage.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.ErrorMessage
         * @static
         * @param {cloudcli.ErrorMessage.$Properties} message ErrorMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ErrorMessage.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.message != null && $Object.hasOwnProperty.call(message, "message") && message.message !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.message);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ErrorMessage message, length delimited. Does not implicitly {@link cloudcli.ErrorMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.ErrorMessage
         * @static
         * @param {cloudcli.ErrorMessage.$Properties} message ErrorMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ErrorMessage.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes an ErrorMessage message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.ErrorMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.ErrorMessage & cloudcli.ErrorMessage.$Shape} ErrorMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ErrorMessage.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.ErrorMessage(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.message = value;
                        else
                            delete message.message;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes an ErrorMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.ErrorMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.ErrorMessage & cloudcli.ErrorMessage.$Shape} ErrorMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ErrorMessage.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an ErrorMessage message.
         * @function verify
         * @memberof cloudcli.ErrorMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ErrorMessage.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.message != null && $Object.hasOwnProperty.call(message, "message"))
                if (!$util.isString(message.message))
                    return "message: string expected";
            return null;
        };

        /**
         * Creates an ErrorMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.ErrorMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.ErrorMessage} ErrorMessage
         */
        ErrorMessage.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.ErrorMessage)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.ErrorMessage: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.ErrorMessage();
            if (object.message != null)
                if (typeof object.message !== "string" || object.message.length)
                    message.message = $String(object.message);
            return message;
        };

        /**
         * Creates a plain object from an ErrorMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.ErrorMessage
         * @static
         * @param {cloudcli.ErrorMessage} message ErrorMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ErrorMessage.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.message = "";
            if (message.message != null && $Object.hasOwnProperty.call(message, "message"))
                object.message = message.message;
            return object;
        };

        /**
         * Converts this ErrorMessage to JSON.
         * @function toJSON
         * @memberof cloudcli.ErrorMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ErrorMessage.prototype.toJSON = function() {
            return ErrorMessage.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ErrorMessage
         * @function getTypeUrl
         * @memberof cloudcli.ErrorMessage
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ErrorMessage.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.ErrorMessage";
        };

        return ErrorMessage;
    })();

    cloudcli.TerminalInit = (function() {

        /**
         * Properties of a TerminalInit.
         * @typedef {Object} cloudcli.TerminalInit.$Properties
         * @property {string|null} [sessionId] TerminalInit sessionId
         * @property {number|null} [cols] TerminalInit cols
         * @property {number|null} [rows] TerminalInit rows
         * @property {string|null} [cwd] TerminalInit cwd
         * @property {boolean|null} [forceRestart] TerminalInit forceRestart
         * @property {number|null} [lastSeq] TerminalInit lastSeq
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TerminalInit.
         * @memberof cloudcli
         * @interface ITerminalInit
         * @augments cloudcli.TerminalInit.$Properties
         * @deprecated Use cloudcli.TerminalInit.$Properties instead.
         */

        /**
         * Shape of a TerminalInit.
         * @typedef {cloudcli.TerminalInit.$Properties} cloudcli.TerminalInit.$Shape
         */

        /**
         * Constructs a new TerminalInit.
         * @memberof cloudcli
         * @classdesc Represents a TerminalInit.
         * @constructor
         * @param {cloudcli.TerminalInit.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TerminalInit = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TerminalInit sessionId.
         * @member {string} sessionId
         * @memberof cloudcli.TerminalInit
         * @instance
         */
        TerminalInit.prototype.sessionId = "";

        /**
         * TerminalInit cols.
         * @member {number} cols
         * @memberof cloudcli.TerminalInit
         * @instance
         */
        TerminalInit.prototype.cols = 0;

        /**
         * TerminalInit rows.
         * @member {number} rows
         * @memberof cloudcli.TerminalInit
         * @instance
         */
        TerminalInit.prototype.rows = 0;

        /**
         * TerminalInit cwd.
         * @member {string} cwd
         * @memberof cloudcli.TerminalInit
         * @instance
         */
        TerminalInit.prototype.cwd = "";

        /**
         * TerminalInit forceRestart.
         * @member {boolean} forceRestart
         * @memberof cloudcli.TerminalInit
         * @instance
         */
        TerminalInit.prototype.forceRestart = false;

        /**
         * TerminalInit lastSeq.
         * @member {number} lastSeq
         * @memberof cloudcli.TerminalInit
         * @instance
         */
        TerminalInit.prototype.lastSeq = 0;

        /**
         * Creates a new TerminalInit instance using the specified properties.
         * @function create
         * @memberof cloudcli.TerminalInit
         * @static
         * @param {cloudcli.TerminalInit.$Properties=} [properties] Properties to set
         * @returns {cloudcli.TerminalInit} TerminalInit instance
         * @type {{
         *   (properties: cloudcli.TerminalInit.$Shape): cloudcli.TerminalInit & cloudcli.TerminalInit.$Shape;
         *   (properties?: cloudcli.TerminalInit.$Properties): cloudcli.TerminalInit;
         * }}
         */
        TerminalInit.create = function(properties) {
            return new TerminalInit(properties);
        };

        /**
         * Encodes the specified TerminalInit message. Does not implicitly {@link cloudcli.TerminalInit.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.TerminalInit
         * @static
         * @param {cloudcli.TerminalInit.$Properties} message TerminalInit message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalInit.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId") && message.sessionId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.sessionId);
            if (message.cols != null && $Object.hasOwnProperty.call(message, "cols") && message.cols !== 0)
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.cols);
            if (message.rows != null && $Object.hasOwnProperty.call(message, "rows") && message.rows !== 0)
                writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.rows);
            if (message.cwd != null && $Object.hasOwnProperty.call(message, "cwd") && message.cwd !== "")
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.cwd);
            if (message.forceRestart != null && $Object.hasOwnProperty.call(message, "forceRestart") && message.forceRestart !== false)
                writer.uint32(/* id 5, wireType 0 =*/40).bool(message.forceRestart);
            if (message.lastSeq != null && $Object.hasOwnProperty.call(message, "lastSeq") && message.lastSeq !== 0)
                writer.uint32(/* id 6, wireType 0 =*/48).uint32(message.lastSeq);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TerminalInit message, length delimited. Does not implicitly {@link cloudcli.TerminalInit.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.TerminalInit
         * @static
         * @param {cloudcli.TerminalInit.$Properties} message TerminalInit message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalInit.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a TerminalInit message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.TerminalInit
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.TerminalInit & cloudcli.TerminalInit.$Shape} TerminalInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalInit.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.TerminalInit(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.sessionId = value;
                        else
                            delete message.sessionId;
                        continue;
                    }
                case 2: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.cols = value;
                        else
                            delete message.cols;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.rows = value;
                        else
                            delete message.rows;
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.cwd = value;
                        else
                            delete message.cwd;
                        continue;
                    }
                case 5: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.forceRestart = value;
                        else
                            delete message.forceRestart;
                        continue;
                    }
                case 6: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.lastSeq = value;
                        else
                            delete message.lastSeq;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TerminalInit message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.TerminalInit
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalInit & cloudcli.TerminalInit.$Shape} TerminalInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalInit.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TerminalInit message.
         * @function verify
         * @memberof cloudcli.TerminalInit
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TerminalInit.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                if (!$util.isString(message.sessionId))
                    return "sessionId: string expected";
            if (message.cols != null && $Object.hasOwnProperty.call(message, "cols"))
                if (!$util.isInteger(message.cols))
                    return "cols: integer expected";
            if (message.rows != null && $Object.hasOwnProperty.call(message, "rows"))
                if (!$util.isInteger(message.rows))
                    return "rows: integer expected";
            if (message.cwd != null && $Object.hasOwnProperty.call(message, "cwd"))
                if (!$util.isString(message.cwd))
                    return "cwd: string expected";
            if (message.forceRestart != null && $Object.hasOwnProperty.call(message, "forceRestart"))
                if (typeof message.forceRestart !== "boolean")
                    return "forceRestart: boolean expected";
            if (message.lastSeq != null && $Object.hasOwnProperty.call(message, "lastSeq"))
                if (!$util.isInteger(message.lastSeq))
                    return "lastSeq: integer expected";
            return null;
        };

        /**
         * Creates a TerminalInit message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.TerminalInit
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.TerminalInit} TerminalInit
         */
        TerminalInit.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.TerminalInit)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.TerminalInit: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.TerminalInit();
            if (object.sessionId != null)
                if (typeof object.sessionId !== "string" || object.sessionId.length)
                    message.sessionId = $String(object.sessionId);
            if (object.cols != null)
                if ($Number(object.cols) !== 0)
                    message.cols = object.cols >>> 0;
            if (object.rows != null)
                if ($Number(object.rows) !== 0)
                    message.rows = object.rows >>> 0;
            if (object.cwd != null)
                if (typeof object.cwd !== "string" || object.cwd.length)
                    message.cwd = $String(object.cwd);
            if (object.forceRestart != null)
                if (object.forceRestart)
                    message.forceRestart = $Boolean(object.forceRestart);
            if (object.lastSeq != null)
                if ($Number(object.lastSeq) !== 0)
                    message.lastSeq = object.lastSeq >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a TerminalInit message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.TerminalInit
         * @static
         * @param {cloudcli.TerminalInit} message TerminalInit
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TerminalInit.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.sessionId = "";
                object.cols = 0;
                object.rows = 0;
                object.cwd = "";
                object.forceRestart = false;
                object.lastSeq = 0;
            }
            if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                object.sessionId = message.sessionId;
            if (message.cols != null && $Object.hasOwnProperty.call(message, "cols"))
                object.cols = message.cols;
            if (message.rows != null && $Object.hasOwnProperty.call(message, "rows"))
                object.rows = message.rows;
            if (message.cwd != null && $Object.hasOwnProperty.call(message, "cwd"))
                object.cwd = message.cwd;
            if (message.forceRestart != null && $Object.hasOwnProperty.call(message, "forceRestart"))
                object.forceRestart = message.forceRestart;
            if (message.lastSeq != null && $Object.hasOwnProperty.call(message, "lastSeq"))
                object.lastSeq = message.lastSeq;
            return object;
        };

        /**
         * Converts this TerminalInit to JSON.
         * @function toJSON
         * @memberof cloudcli.TerminalInit
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TerminalInit.prototype.toJSON = function() {
            return TerminalInit.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TerminalInit
         * @function getTypeUrl
         * @memberof cloudcli.TerminalInit
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TerminalInit.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.TerminalInit";
        };

        return TerminalInit;
    })();

    cloudcli.TerminalInput = (function() {

        /**
         * Properties of a TerminalInput.
         * @typedef {Object} cloudcli.TerminalInput.$Properties
         * @property {string|null} [data] TerminalInput data
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TerminalInput.
         * @memberof cloudcli
         * @interface ITerminalInput
         * @augments cloudcli.TerminalInput.$Properties
         * @deprecated Use cloudcli.TerminalInput.$Properties instead.
         */

        /**
         * Shape of a TerminalInput.
         * @typedef {cloudcli.TerminalInput.$Properties} cloudcli.TerminalInput.$Shape
         */

        /**
         * Constructs a new TerminalInput.
         * @memberof cloudcli
         * @classdesc Represents a TerminalInput.
         * @constructor
         * @param {cloudcli.TerminalInput.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TerminalInput = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TerminalInput data.
         * @member {string} data
         * @memberof cloudcli.TerminalInput
         * @instance
         */
        TerminalInput.prototype.data = "";

        /**
         * Creates a new TerminalInput instance using the specified properties.
         * @function create
         * @memberof cloudcli.TerminalInput
         * @static
         * @param {cloudcli.TerminalInput.$Properties=} [properties] Properties to set
         * @returns {cloudcli.TerminalInput} TerminalInput instance
         * @type {{
         *   (properties: cloudcli.TerminalInput.$Shape): cloudcli.TerminalInput & cloudcli.TerminalInput.$Shape;
         *   (properties?: cloudcli.TerminalInput.$Properties): cloudcli.TerminalInput;
         * }}
         */
        TerminalInput.create = function(properties) {
            return new TerminalInput(properties);
        };

        /**
         * Encodes the specified TerminalInput message. Does not implicitly {@link cloudcli.TerminalInput.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.TerminalInput
         * @static
         * @param {cloudcli.TerminalInput.$Properties} message TerminalInput message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalInput.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.data != null && $Object.hasOwnProperty.call(message, "data") && message.data !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.data);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TerminalInput message, length delimited. Does not implicitly {@link cloudcli.TerminalInput.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.TerminalInput
         * @static
         * @param {cloudcli.TerminalInput.$Properties} message TerminalInput message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalInput.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a TerminalInput message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.TerminalInput
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.TerminalInput & cloudcli.TerminalInput.$Shape} TerminalInput
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalInput.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.TerminalInput(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.data = value;
                        else
                            delete message.data;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TerminalInput message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.TerminalInput
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalInput & cloudcli.TerminalInput.$Shape} TerminalInput
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalInput.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TerminalInput message.
         * @function verify
         * @memberof cloudcli.TerminalInput
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TerminalInput.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.data != null && $Object.hasOwnProperty.call(message, "data"))
                if (!$util.isString(message.data))
                    return "data: string expected";
            return null;
        };

        /**
         * Creates a TerminalInput message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.TerminalInput
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.TerminalInput} TerminalInput
         */
        TerminalInput.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.TerminalInput)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.TerminalInput: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.TerminalInput();
            if (object.data != null)
                if (typeof object.data !== "string" || object.data.length)
                    message.data = $String(object.data);
            return message;
        };

        /**
         * Creates a plain object from a TerminalInput message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.TerminalInput
         * @static
         * @param {cloudcli.TerminalInput} message TerminalInput
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TerminalInput.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.data = "";
            if (message.data != null && $Object.hasOwnProperty.call(message, "data"))
                object.data = message.data;
            return object;
        };

        /**
         * Converts this TerminalInput to JSON.
         * @function toJSON
         * @memberof cloudcli.TerminalInput
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TerminalInput.prototype.toJSON = function() {
            return TerminalInput.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TerminalInput
         * @function getTypeUrl
         * @memberof cloudcli.TerminalInput
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TerminalInput.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.TerminalInput";
        };

        return TerminalInput;
    })();

    cloudcli.TerminalResize = (function() {

        /**
         * Properties of a TerminalResize.
         * @typedef {Object} cloudcli.TerminalResize.$Properties
         * @property {number|null} [cols] TerminalResize cols
         * @property {number|null} [rows] TerminalResize rows
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TerminalResize.
         * @memberof cloudcli
         * @interface ITerminalResize
         * @augments cloudcli.TerminalResize.$Properties
         * @deprecated Use cloudcli.TerminalResize.$Properties instead.
         */

        /**
         * Shape of a TerminalResize.
         * @typedef {cloudcli.TerminalResize.$Properties} cloudcli.TerminalResize.$Shape
         */

        /**
         * Constructs a new TerminalResize.
         * @memberof cloudcli
         * @classdesc Represents a TerminalResize.
         * @constructor
         * @param {cloudcli.TerminalResize.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TerminalResize = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TerminalResize cols.
         * @member {number} cols
         * @memberof cloudcli.TerminalResize
         * @instance
         */
        TerminalResize.prototype.cols = 0;

        /**
         * TerminalResize rows.
         * @member {number} rows
         * @memberof cloudcli.TerminalResize
         * @instance
         */
        TerminalResize.prototype.rows = 0;

        /**
         * Creates a new TerminalResize instance using the specified properties.
         * @function create
         * @memberof cloudcli.TerminalResize
         * @static
         * @param {cloudcli.TerminalResize.$Properties=} [properties] Properties to set
         * @returns {cloudcli.TerminalResize} TerminalResize instance
         * @type {{
         *   (properties: cloudcli.TerminalResize.$Shape): cloudcli.TerminalResize & cloudcli.TerminalResize.$Shape;
         *   (properties?: cloudcli.TerminalResize.$Properties): cloudcli.TerminalResize;
         * }}
         */
        TerminalResize.create = function(properties) {
            return new TerminalResize(properties);
        };

        /**
         * Encodes the specified TerminalResize message. Does not implicitly {@link cloudcli.TerminalResize.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.TerminalResize
         * @static
         * @param {cloudcli.TerminalResize.$Properties} message TerminalResize message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalResize.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.cols != null && $Object.hasOwnProperty.call(message, "cols") && message.cols !== 0)
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.cols);
            if (message.rows != null && $Object.hasOwnProperty.call(message, "rows") && message.rows !== 0)
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.rows);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TerminalResize message, length delimited. Does not implicitly {@link cloudcli.TerminalResize.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.TerminalResize
         * @static
         * @param {cloudcli.TerminalResize.$Properties} message TerminalResize message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalResize.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a TerminalResize message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.TerminalResize
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.TerminalResize & cloudcli.TerminalResize.$Shape} TerminalResize
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalResize.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.TerminalResize(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.cols = value;
                        else
                            delete message.cols;
                        continue;
                    }
                case 2: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.rows = value;
                        else
                            delete message.rows;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TerminalResize message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.TerminalResize
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalResize & cloudcli.TerminalResize.$Shape} TerminalResize
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalResize.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TerminalResize message.
         * @function verify
         * @memberof cloudcli.TerminalResize
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TerminalResize.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.cols != null && $Object.hasOwnProperty.call(message, "cols"))
                if (!$util.isInteger(message.cols))
                    return "cols: integer expected";
            if (message.rows != null && $Object.hasOwnProperty.call(message, "rows"))
                if (!$util.isInteger(message.rows))
                    return "rows: integer expected";
            return null;
        };

        /**
         * Creates a TerminalResize message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.TerminalResize
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.TerminalResize} TerminalResize
         */
        TerminalResize.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.TerminalResize)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.TerminalResize: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.TerminalResize();
            if (object.cols != null)
                if ($Number(object.cols) !== 0)
                    message.cols = object.cols >>> 0;
            if (object.rows != null)
                if ($Number(object.rows) !== 0)
                    message.rows = object.rows >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a TerminalResize message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.TerminalResize
         * @static
         * @param {cloudcli.TerminalResize} message TerminalResize
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TerminalResize.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.cols = 0;
                object.rows = 0;
            }
            if (message.cols != null && $Object.hasOwnProperty.call(message, "cols"))
                object.cols = message.cols;
            if (message.rows != null && $Object.hasOwnProperty.call(message, "rows"))
                object.rows = message.rows;
            return object;
        };

        /**
         * Converts this TerminalResize to JSON.
         * @function toJSON
         * @memberof cloudcli.TerminalResize
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TerminalResize.prototype.toJSON = function() {
            return TerminalResize.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TerminalResize
         * @function getTypeUrl
         * @memberof cloudcli.TerminalResize
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TerminalResize.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.TerminalResize";
        };

        return TerminalResize;
    })();

    cloudcli.TerminalClose = (function() {

        /**
         * Properties of a TerminalClose.
         * @typedef {Object} cloudcli.TerminalClose.$Properties
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TerminalClose.
         * @memberof cloudcli
         * @interface ITerminalClose
         * @augments cloudcli.TerminalClose.$Properties
         * @deprecated Use cloudcli.TerminalClose.$Properties instead.
         */

        /**
         * Shape of a TerminalClose.
         * @typedef {cloudcli.TerminalClose.$Properties} cloudcli.TerminalClose.$Shape
         */

        /**
         * Constructs a new TerminalClose.
         * @memberof cloudcli
         * @classdesc Represents a TerminalClose.
         * @constructor
         * @param {cloudcli.TerminalClose.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TerminalClose = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * Creates a new TerminalClose instance using the specified properties.
         * @function create
         * @memberof cloudcli.TerminalClose
         * @static
         * @param {cloudcli.TerminalClose.$Properties=} [properties] Properties to set
         * @returns {cloudcli.TerminalClose} TerminalClose instance
         * @type {{
         *   (properties: cloudcli.TerminalClose.$Shape): cloudcli.TerminalClose & cloudcli.TerminalClose.$Shape;
         *   (properties?: cloudcli.TerminalClose.$Properties): cloudcli.TerminalClose;
         * }}
         */
        TerminalClose.create = function(properties) {
            return new TerminalClose(properties);
        };

        /**
         * Encodes the specified TerminalClose message. Does not implicitly {@link cloudcli.TerminalClose.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.TerminalClose
         * @static
         * @param {cloudcli.TerminalClose.$Properties} message TerminalClose message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalClose.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TerminalClose message, length delimited. Does not implicitly {@link cloudcli.TerminalClose.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.TerminalClose
         * @static
         * @param {cloudcli.TerminalClose.$Properties} message TerminalClose message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalClose.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a TerminalClose message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.TerminalClose
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.TerminalClose & cloudcli.TerminalClose.$Shape} TerminalClose
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalClose.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.TerminalClose();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                reader.skipType(tag & 7, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TerminalClose message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.TerminalClose
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalClose & cloudcli.TerminalClose.$Shape} TerminalClose
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalClose.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TerminalClose message.
         * @function verify
         * @memberof cloudcli.TerminalClose
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TerminalClose.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            return null;
        };

        /**
         * Creates a TerminalClose message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.TerminalClose
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.TerminalClose} TerminalClose
         */
        TerminalClose.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.TerminalClose)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.TerminalClose: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            return new $root.cloudcli.TerminalClose();
        };

        /**
         * Creates a plain object from a TerminalClose message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.TerminalClose
         * @static
         * @param {cloudcli.TerminalClose} message TerminalClose
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TerminalClose.toObject = function () {
            return {};
        };

        /**
         * Converts this TerminalClose to JSON.
         * @function toJSON
         * @memberof cloudcli.TerminalClose
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TerminalClose.prototype.toJSON = function() {
            return TerminalClose.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TerminalClose
         * @function getTypeUrl
         * @memberof cloudcli.TerminalClose
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TerminalClose.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.TerminalClose";
        };

        return TerminalClose;
    })();

    cloudcli.TerminalClientMessage = (function() {

        /**
         * Properties of a TerminalClientMessage.
         * @typedef {Object} cloudcli.TerminalClientMessage.$Properties
         * @property {cloudcli.TerminalInit.$Properties|null} [init] TerminalClientMessage init
         * @property {cloudcli.TerminalInput.$Properties|null} [input] TerminalClientMessage input
         * @property {cloudcli.TerminalResize.$Properties|null} [resize] TerminalClientMessage resize
         * @property {cloudcli.TerminalClose.$Properties|null} [close] TerminalClientMessage close
         * @property {cloudcli.Ping.$Properties|null} [ping] TerminalClientMessage ping
         * @property {"init"|"input"|"resize"|"close"|"ping"} [body] TerminalClientMessage body
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TerminalClientMessage.
         * @memberof cloudcli
         * @interface ITerminalClientMessage
         * @augments cloudcli.TerminalClientMessage.$Properties
         * @deprecated Use cloudcli.TerminalClientMessage.$Properties instead.
         */

        /**
         * Narrowed shape of a TerminalClientMessage.
         * @typedef {{
         *   init?: cloudcli.TerminalInit.$Shape|null;
         *   input?: cloudcli.TerminalInput.$Shape|null;
         *   resize?: cloudcli.TerminalResize.$Shape|null;
         *   close?: cloudcli.TerminalClose.$Shape|null;
         *   ping?: cloudcli.Ping.$Shape|null;
         *   $unknowns?: Array.<Uint8Array>;
         * } & (
         *   ({ body?: undefined; init?: null; input?: null; resize?: null; close?: null; ping?: null }|{ body?: "init"; init: cloudcli.TerminalInit.$Shape; input?: null; resize?: null; close?: null; ping?: null }|{ body?: "input"; init?: null; input: cloudcli.TerminalInput.$Shape; resize?: null; close?: null; ping?: null }|{ body?: "resize"; init?: null; input?: null; resize: cloudcli.TerminalResize.$Shape; close?: null; ping?: null }|{ body?: "close"; init?: null; input?: null; resize?: null; close: cloudcli.TerminalClose.$Shape; ping?: null }|{ body?: "ping"; init?: null; input?: null; resize?: null; close?: null; ping: cloudcli.Ping.$Shape })
         * )} cloudcli.TerminalClientMessage.$Shape
         */

        /**
         * Constructs a new TerminalClientMessage.
         * @memberof cloudcli
         * @classdesc Represents a TerminalClientMessage.
         * @constructor
         * @param {cloudcli.TerminalClientMessage.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TerminalClientMessage = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TerminalClientMessage init.
         * @member {cloudcli.TerminalInit.$Properties|null|undefined} init
         * @memberof cloudcli.TerminalClientMessage
         * @instance
         */
        TerminalClientMessage.prototype.init = null;

        /**
         * TerminalClientMessage input.
         * @member {cloudcli.TerminalInput.$Properties|null|undefined} input
         * @memberof cloudcli.TerminalClientMessage
         * @instance
         */
        TerminalClientMessage.prototype.input = null;

        /**
         * TerminalClientMessage resize.
         * @member {cloudcli.TerminalResize.$Properties|null|undefined} resize
         * @memberof cloudcli.TerminalClientMessage
         * @instance
         */
        TerminalClientMessage.prototype.resize = null;

        /**
         * TerminalClientMessage close.
         * @member {cloudcli.TerminalClose.$Properties|null|undefined} close
         * @memberof cloudcli.TerminalClientMessage
         * @instance
         */
        TerminalClientMessage.prototype.close = null;

        /**
         * TerminalClientMessage ping.
         * @member {cloudcli.Ping.$Properties|null|undefined} ping
         * @memberof cloudcli.TerminalClientMessage
         * @instance
         */
        TerminalClientMessage.prototype.ping = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * TerminalClientMessage body.
         * @member {"init"|"input"|"resize"|"close"|"ping"|undefined} body
         * @memberof cloudcli.TerminalClientMessage
         * @instance
         */
        $Object.defineProperty(TerminalClientMessage.prototype, "body", {
            get: $util.oneOfGetter($oneOfFields = ["init", "input", "resize", "close", "ping"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new TerminalClientMessage instance using the specified properties.
         * @function create
         * @memberof cloudcli.TerminalClientMessage
         * @static
         * @param {cloudcli.TerminalClientMessage.$Properties=} [properties] Properties to set
         * @returns {cloudcli.TerminalClientMessage} TerminalClientMessage instance
         * @type {{
         *   (properties: cloudcli.TerminalClientMessage.$Shape): cloudcli.TerminalClientMessage & cloudcli.TerminalClientMessage.$Shape;
         *   (properties?: cloudcli.TerminalClientMessage.$Properties): cloudcli.TerminalClientMessage;
         * }}
         */
        TerminalClientMessage.create = function(properties) {
            return new TerminalClientMessage(properties);
        };

        /**
         * Encodes the specified TerminalClientMessage message. Does not implicitly {@link cloudcli.TerminalClientMessage.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.TerminalClientMessage
         * @static
         * @param {cloudcli.TerminalClientMessage.$Properties} message TerminalClientMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalClientMessage.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.init != null && $Object.hasOwnProperty.call(message, "init"))
                $root.cloudcli.TerminalInit.encode(message.init, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.input != null && $Object.hasOwnProperty.call(message, "input"))
                $root.cloudcli.TerminalInput.encode(message.input, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.resize != null && $Object.hasOwnProperty.call(message, "resize"))
                $root.cloudcli.TerminalResize.encode(message.resize, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
            if (message.close != null && $Object.hasOwnProperty.call(message, "close"))
                $root.cloudcli.TerminalClose.encode(message.close, writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
            if (message.ping != null && $Object.hasOwnProperty.call(message, "ping"))
                $root.cloudcli.Ping.encode(message.ping, writer.uint32(/* id 5, wireType 2 =*/42).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TerminalClientMessage message, length delimited. Does not implicitly {@link cloudcli.TerminalClientMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.TerminalClientMessage
         * @static
         * @param {cloudcli.TerminalClientMessage.$Properties} message TerminalClientMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalClientMessage.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a TerminalClientMessage message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.TerminalClientMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.TerminalClientMessage & cloudcli.TerminalClientMessage.$Shape} TerminalClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalClientMessage.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.TerminalClientMessage();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.init = $root.cloudcli.TerminalInit.decode(reader, reader.uint32(), $undefined, _depth + 1, message.init);
                        message.body = "init";
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.input = $root.cloudcli.TerminalInput.decode(reader, reader.uint32(), $undefined, _depth + 1, message.input);
                        message.body = "input";
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        message.resize = $root.cloudcli.TerminalResize.decode(reader, reader.uint32(), $undefined, _depth + 1, message.resize);
                        message.body = "resize";
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        message.close = $root.cloudcli.TerminalClose.decode(reader, reader.uint32(), $undefined, _depth + 1, message.close);
                        message.body = "close";
                        continue;
                    }
                case 5: {
                        if (wireType !== 2)
                            break;
                        message.ping = $root.cloudcli.Ping.decode(reader, reader.uint32(), $undefined, _depth + 1, message.ping);
                        message.body = "ping";
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TerminalClientMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.TerminalClientMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalClientMessage & cloudcli.TerminalClientMessage.$Shape} TerminalClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalClientMessage.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TerminalClientMessage message.
         * @function verify
         * @memberof cloudcli.TerminalClientMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TerminalClientMessage.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.init != null && $Object.hasOwnProperty.call(message, "init")) {
                properties.body = 1;
                {
                    let error = $root.cloudcli.TerminalInit.verify(message.init, _depth + 1);
                    if (error)
                        return "init." + error;
                }
            }
            if (message.input != null && $Object.hasOwnProperty.call(message, "input")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.TerminalInput.verify(message.input, _depth + 1);
                    if (error)
                        return "input." + error;
                }
            }
            if (message.resize != null && $Object.hasOwnProperty.call(message, "resize")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.TerminalResize.verify(message.resize, _depth + 1);
                    if (error)
                        return "resize." + error;
                }
            }
            if (message.close != null && $Object.hasOwnProperty.call(message, "close")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.TerminalClose.verify(message.close, _depth + 1);
                    if (error)
                        return "close." + error;
                }
            }
            if (message.ping != null && $Object.hasOwnProperty.call(message, "ping")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.Ping.verify(message.ping, _depth + 1);
                    if (error)
                        return "ping." + error;
                }
            }
            return null;
        };

        /**
         * Creates a TerminalClientMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.TerminalClientMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.TerminalClientMessage} TerminalClientMessage
         */
        TerminalClientMessage.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.TerminalClientMessage)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.TerminalClientMessage: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.TerminalClientMessage();
            if (object.init != null) {
                if (!$util.isObject(object.init))
                    throw $TypeError(".cloudcli.TerminalClientMessage.init: object expected");
                message.init = $root.cloudcli.TerminalInit.fromObject(object.init, _depth + 1);
            }
            if (object.input != null) {
                if (!$util.isObject(object.input))
                    throw $TypeError(".cloudcli.TerminalClientMessage.input: object expected");
                message.input = $root.cloudcli.TerminalInput.fromObject(object.input, _depth + 1);
            }
            if (object.resize != null) {
                if (!$util.isObject(object.resize))
                    throw $TypeError(".cloudcli.TerminalClientMessage.resize: object expected");
                message.resize = $root.cloudcli.TerminalResize.fromObject(object.resize, _depth + 1);
            }
            if (object.close != null) {
                if (!$util.isObject(object.close))
                    throw $TypeError(".cloudcli.TerminalClientMessage.close: object expected");
                message.close = $root.cloudcli.TerminalClose.fromObject(object.close, _depth + 1);
            }
            if (object.ping != null) {
                if (!$util.isObject(object.ping))
                    throw $TypeError(".cloudcli.TerminalClientMessage.ping: object expected");
                message.ping = $root.cloudcli.Ping.fromObject(object.ping, _depth + 1);
            }
            return message;
        };

        /**
         * Creates a plain object from a TerminalClientMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.TerminalClientMessage
         * @static
         * @param {cloudcli.TerminalClientMessage} message TerminalClientMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TerminalClientMessage.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (message.init != null && $Object.hasOwnProperty.call(message, "init")) {
                object.init = $root.cloudcli.TerminalInit.toObject(message.init, options, _depth + 1);
                if (options.oneofs)
                    object.body = "init";
            }
            if (message.input != null && $Object.hasOwnProperty.call(message, "input")) {
                object.input = $root.cloudcli.TerminalInput.toObject(message.input, options, _depth + 1);
                if (options.oneofs)
                    object.body = "input";
            }
            if (message.resize != null && $Object.hasOwnProperty.call(message, "resize")) {
                object.resize = $root.cloudcli.TerminalResize.toObject(message.resize, options, _depth + 1);
                if (options.oneofs)
                    object.body = "resize";
            }
            if (message.close != null && $Object.hasOwnProperty.call(message, "close")) {
                object.close = $root.cloudcli.TerminalClose.toObject(message.close, options, _depth + 1);
                if (options.oneofs)
                    object.body = "close";
            }
            if (message.ping != null && $Object.hasOwnProperty.call(message, "ping")) {
                object.ping = $root.cloudcli.Ping.toObject(message.ping, options, _depth + 1);
                if (options.oneofs)
                    object.body = "ping";
            }
            return object;
        };

        /**
         * Converts this TerminalClientMessage to JSON.
         * @function toJSON
         * @memberof cloudcli.TerminalClientMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TerminalClientMessage.prototype.toJSON = function() {
            return TerminalClientMessage.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TerminalClientMessage
         * @function getTypeUrl
         * @memberof cloudcli.TerminalClientMessage
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TerminalClientMessage.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.TerminalClientMessage";
        };

        return TerminalClientMessage;
    })();

    cloudcli.TerminalReady = (function() {

        /**
         * Properties of a TerminalReady.
         * @typedef {Object} cloudcli.TerminalReady.$Properties
         * @property {string|null} [cwd] TerminalReady cwd
         * @property {string|null} [sessionId] TerminalReady sessionId
         * @property {boolean|null} [reset] TerminalReady reset
         * @property {boolean|null} [gap] TerminalReady gap
         * @property {number|null} [lastSeq] TerminalReady lastSeq
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TerminalReady.
         * @memberof cloudcli
         * @interface ITerminalReady
         * @augments cloudcli.TerminalReady.$Properties
         * @deprecated Use cloudcli.TerminalReady.$Properties instead.
         */

        /**
         * Shape of a TerminalReady.
         * @typedef {cloudcli.TerminalReady.$Properties} cloudcli.TerminalReady.$Shape
         */

        /**
         * Constructs a new TerminalReady.
         * @memberof cloudcli
         * @classdesc Represents a TerminalReady.
         * @constructor
         * @param {cloudcli.TerminalReady.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TerminalReady = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TerminalReady cwd.
         * @member {string} cwd
         * @memberof cloudcli.TerminalReady
         * @instance
         */
        TerminalReady.prototype.cwd = "";

        /**
         * TerminalReady sessionId.
         * @member {string} sessionId
         * @memberof cloudcli.TerminalReady
         * @instance
         */
        TerminalReady.prototype.sessionId = "";

        /**
         * TerminalReady reset.
         * @member {boolean} reset
         * @memberof cloudcli.TerminalReady
         * @instance
         */
        TerminalReady.prototype.reset = false;

        /**
         * TerminalReady gap.
         * @member {boolean} gap
         * @memberof cloudcli.TerminalReady
         * @instance
         */
        TerminalReady.prototype.gap = false;

        /**
         * TerminalReady lastSeq.
         * @member {number} lastSeq
         * @memberof cloudcli.TerminalReady
         * @instance
         */
        TerminalReady.prototype.lastSeq = 0;

        /**
         * Creates a new TerminalReady instance using the specified properties.
         * @function create
         * @memberof cloudcli.TerminalReady
         * @static
         * @param {cloudcli.TerminalReady.$Properties=} [properties] Properties to set
         * @returns {cloudcli.TerminalReady} TerminalReady instance
         * @type {{
         *   (properties: cloudcli.TerminalReady.$Shape): cloudcli.TerminalReady & cloudcli.TerminalReady.$Shape;
         *   (properties?: cloudcli.TerminalReady.$Properties): cloudcli.TerminalReady;
         * }}
         */
        TerminalReady.create = function(properties) {
            return new TerminalReady(properties);
        };

        /**
         * Encodes the specified TerminalReady message. Does not implicitly {@link cloudcli.TerminalReady.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.TerminalReady
         * @static
         * @param {cloudcli.TerminalReady.$Properties} message TerminalReady message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalReady.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.cwd != null && $Object.hasOwnProperty.call(message, "cwd") && message.cwd !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.cwd);
            if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId") && message.sessionId !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.sessionId);
            if (message.reset != null && $Object.hasOwnProperty.call(message, "reset") && message.reset !== false)
                writer.uint32(/* id 3, wireType 0 =*/24).bool(message.reset);
            if (message.gap != null && $Object.hasOwnProperty.call(message, "gap") && message.gap !== false)
                writer.uint32(/* id 4, wireType 0 =*/32).bool(message.gap);
            if (message.lastSeq != null && $Object.hasOwnProperty.call(message, "lastSeq") && message.lastSeq !== 0)
                writer.uint32(/* id 5, wireType 0 =*/40).uint32(message.lastSeq);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TerminalReady message, length delimited. Does not implicitly {@link cloudcli.TerminalReady.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.TerminalReady
         * @static
         * @param {cloudcli.TerminalReady.$Properties} message TerminalReady message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalReady.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a TerminalReady message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.TerminalReady
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.TerminalReady & cloudcli.TerminalReady.$Shape} TerminalReady
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalReady.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.TerminalReady(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.cwd = value;
                        else
                            delete message.cwd;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.sessionId = value;
                        else
                            delete message.sessionId;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.reset = value;
                        else
                            delete message.reset;
                        continue;
                    }
                case 4: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.gap = value;
                        else
                            delete message.gap;
                        continue;
                    }
                case 5: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.lastSeq = value;
                        else
                            delete message.lastSeq;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TerminalReady message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.TerminalReady
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalReady & cloudcli.TerminalReady.$Shape} TerminalReady
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalReady.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TerminalReady message.
         * @function verify
         * @memberof cloudcli.TerminalReady
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TerminalReady.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.cwd != null && $Object.hasOwnProperty.call(message, "cwd"))
                if (!$util.isString(message.cwd))
                    return "cwd: string expected";
            if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                if (!$util.isString(message.sessionId))
                    return "sessionId: string expected";
            if (message.reset != null && $Object.hasOwnProperty.call(message, "reset"))
                if (typeof message.reset !== "boolean")
                    return "reset: boolean expected";
            if (message.gap != null && $Object.hasOwnProperty.call(message, "gap"))
                if (typeof message.gap !== "boolean")
                    return "gap: boolean expected";
            if (message.lastSeq != null && $Object.hasOwnProperty.call(message, "lastSeq"))
                if (!$util.isInteger(message.lastSeq))
                    return "lastSeq: integer expected";
            return null;
        };

        /**
         * Creates a TerminalReady message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.TerminalReady
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.TerminalReady} TerminalReady
         */
        TerminalReady.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.TerminalReady)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.TerminalReady: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.TerminalReady();
            if (object.cwd != null)
                if (typeof object.cwd !== "string" || object.cwd.length)
                    message.cwd = $String(object.cwd);
            if (object.sessionId != null)
                if (typeof object.sessionId !== "string" || object.sessionId.length)
                    message.sessionId = $String(object.sessionId);
            if (object.reset != null)
                if (object.reset)
                    message.reset = $Boolean(object.reset);
            if (object.gap != null)
                if (object.gap)
                    message.gap = $Boolean(object.gap);
            if (object.lastSeq != null)
                if ($Number(object.lastSeq) !== 0)
                    message.lastSeq = object.lastSeq >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a TerminalReady message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.TerminalReady
         * @static
         * @param {cloudcli.TerminalReady} message TerminalReady
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TerminalReady.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.cwd = "";
                object.sessionId = "";
                object.reset = false;
                object.gap = false;
                object.lastSeq = 0;
            }
            if (message.cwd != null && $Object.hasOwnProperty.call(message, "cwd"))
                object.cwd = message.cwd;
            if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                object.sessionId = message.sessionId;
            if (message.reset != null && $Object.hasOwnProperty.call(message, "reset"))
                object.reset = message.reset;
            if (message.gap != null && $Object.hasOwnProperty.call(message, "gap"))
                object.gap = message.gap;
            if (message.lastSeq != null && $Object.hasOwnProperty.call(message, "lastSeq"))
                object.lastSeq = message.lastSeq;
            return object;
        };

        /**
         * Converts this TerminalReady to JSON.
         * @function toJSON
         * @memberof cloudcli.TerminalReady
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TerminalReady.prototype.toJSON = function() {
            return TerminalReady.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TerminalReady
         * @function getTypeUrl
         * @memberof cloudcli.TerminalReady
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TerminalReady.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.TerminalReady";
        };

        return TerminalReady;
    })();

    cloudcli.TerminalOutput = (function() {

        /**
         * Properties of a TerminalOutput.
         * @typedef {Object} cloudcli.TerminalOutput.$Properties
         * @property {Uint8Array|null} [data] TerminalOutput data
         * @property {boolean|null} [compressed] TerminalOutput compressed
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TerminalOutput.
         * @memberof cloudcli
         * @interface ITerminalOutput
         * @augments cloudcli.TerminalOutput.$Properties
         * @deprecated Use cloudcli.TerminalOutput.$Properties instead.
         */

        /**
         * Shape of a TerminalOutput.
         * @typedef {cloudcli.TerminalOutput.$Properties} cloudcli.TerminalOutput.$Shape
         */

        /**
         * Constructs a new TerminalOutput.
         * @memberof cloudcli
         * @classdesc Represents a TerminalOutput.
         * @constructor
         * @param {cloudcli.TerminalOutput.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TerminalOutput = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TerminalOutput data.
         * @member {Uint8Array} data
         * @memberof cloudcli.TerminalOutput
         * @instance
         */
        TerminalOutput.prototype.data = $util.newBuffer([]);

        /**
         * TerminalOutput compressed.
         * @member {boolean} compressed
         * @memberof cloudcli.TerminalOutput
         * @instance
         */
        TerminalOutput.prototype.compressed = false;

        /**
         * Creates a new TerminalOutput instance using the specified properties.
         * @function create
         * @memberof cloudcli.TerminalOutput
         * @static
         * @param {cloudcli.TerminalOutput.$Properties=} [properties] Properties to set
         * @returns {cloudcli.TerminalOutput} TerminalOutput instance
         * @type {{
         *   (properties: cloudcli.TerminalOutput.$Shape): cloudcli.TerminalOutput & cloudcli.TerminalOutput.$Shape;
         *   (properties?: cloudcli.TerminalOutput.$Properties): cloudcli.TerminalOutput;
         * }}
         */
        TerminalOutput.create = function(properties) {
            return new TerminalOutput(properties);
        };

        /**
         * Encodes the specified TerminalOutput message. Does not implicitly {@link cloudcli.TerminalOutput.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.TerminalOutput
         * @static
         * @param {cloudcli.TerminalOutput.$Properties} message TerminalOutput message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalOutput.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.data != null && $Object.hasOwnProperty.call(message, "data") && message.data.length)
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.data);
            if (message.compressed != null && $Object.hasOwnProperty.call(message, "compressed") && message.compressed !== false)
                writer.uint32(/* id 2, wireType 0 =*/16).bool(message.compressed);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TerminalOutput message, length delimited. Does not implicitly {@link cloudcli.TerminalOutput.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.TerminalOutput
         * @static
         * @param {cloudcli.TerminalOutput.$Properties} message TerminalOutput message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalOutput.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a TerminalOutput message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.TerminalOutput
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.TerminalOutput & cloudcli.TerminalOutput.$Shape} TerminalOutput
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalOutput.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.TerminalOutput(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.data = value;
                        else
                            delete message.data;
                        continue;
                    }
                case 2: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.compressed = value;
                        else
                            delete message.compressed;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TerminalOutput message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.TerminalOutput
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalOutput & cloudcli.TerminalOutput.$Shape} TerminalOutput
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalOutput.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TerminalOutput message.
         * @function verify
         * @memberof cloudcli.TerminalOutput
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TerminalOutput.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.data != null && $Object.hasOwnProperty.call(message, "data"))
                if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                    return "data: buffer expected";
            if (message.compressed != null && $Object.hasOwnProperty.call(message, "compressed"))
                if (typeof message.compressed !== "boolean")
                    return "compressed: boolean expected";
            return null;
        };

        /**
         * Creates a TerminalOutput message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.TerminalOutput
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.TerminalOutput} TerminalOutput
         */
        TerminalOutput.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.TerminalOutput)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.TerminalOutput: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.TerminalOutput();
            if (object.data != null)
                if (object.data.length)
                    if (typeof object.data === "string")
                        $util.base64.decode(object.data, message.data = $util.newBuffer($util.base64.length(object.data)), 0);
                    else if (object.data.length >= 0)
                        message.data = object.data;
            if (object.compressed != null)
                if (object.compressed)
                    message.compressed = $Boolean(object.compressed);
            return message;
        };

        /**
         * Creates a plain object from a TerminalOutput message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.TerminalOutput
         * @static
         * @param {cloudcli.TerminalOutput} message TerminalOutput
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TerminalOutput.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                if (options.bytes === $String)
                    object.data = "";
                else {
                    object.data = [];
                    if (options.bytes !== $Array)
                        object.data = $util.newBuffer(object.data);
                }
                object.compressed = false;
            }
            if (message.data != null && $Object.hasOwnProperty.call(message, "data"))
                object.data = options.bytes === $String ? $util.base64.encode(message.data, 0, message.data.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.data) : message.data;
            if (message.compressed != null && $Object.hasOwnProperty.call(message, "compressed"))
                object.compressed = message.compressed;
            return object;
        };

        /**
         * Converts this TerminalOutput to JSON.
         * @function toJSON
         * @memberof cloudcli.TerminalOutput
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TerminalOutput.prototype.toJSON = function() {
            return TerminalOutput.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TerminalOutput
         * @function getTypeUrl
         * @memberof cloudcli.TerminalOutput
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TerminalOutput.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.TerminalOutput";
        };

        return TerminalOutput;
    })();

    cloudcli.TerminalExit = (function() {

        /**
         * Properties of a TerminalExit.
         * @typedef {Object} cloudcli.TerminalExit.$Properties
         * @property {number|null} [exitCode] TerminalExit exitCode
         * @property {string|null} [signal] TerminalExit signal
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TerminalExit.
         * @memberof cloudcli
         * @interface ITerminalExit
         * @augments cloudcli.TerminalExit.$Properties
         * @deprecated Use cloudcli.TerminalExit.$Properties instead.
         */

        /**
         * Shape of a TerminalExit.
         * @typedef {cloudcli.TerminalExit.$Properties} cloudcli.TerminalExit.$Shape
         */

        /**
         * Constructs a new TerminalExit.
         * @memberof cloudcli
         * @classdesc Represents a TerminalExit.
         * @constructor
         * @param {cloudcli.TerminalExit.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TerminalExit = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TerminalExit exitCode.
         * @member {number} exitCode
         * @memberof cloudcli.TerminalExit
         * @instance
         */
        TerminalExit.prototype.exitCode = 0;

        /**
         * TerminalExit signal.
         * @member {string} signal
         * @memberof cloudcli.TerminalExit
         * @instance
         */
        TerminalExit.prototype.signal = "";

        /**
         * Creates a new TerminalExit instance using the specified properties.
         * @function create
         * @memberof cloudcli.TerminalExit
         * @static
         * @param {cloudcli.TerminalExit.$Properties=} [properties] Properties to set
         * @returns {cloudcli.TerminalExit} TerminalExit instance
         * @type {{
         *   (properties: cloudcli.TerminalExit.$Shape): cloudcli.TerminalExit & cloudcli.TerminalExit.$Shape;
         *   (properties?: cloudcli.TerminalExit.$Properties): cloudcli.TerminalExit;
         * }}
         */
        TerminalExit.create = function(properties) {
            return new TerminalExit(properties);
        };

        /**
         * Encodes the specified TerminalExit message. Does not implicitly {@link cloudcli.TerminalExit.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.TerminalExit
         * @static
         * @param {cloudcli.TerminalExit.$Properties} message TerminalExit message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalExit.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.exitCode != null && $Object.hasOwnProperty.call(message, "exitCode") && message.exitCode !== 0)
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.exitCode);
            if (message.signal != null && $Object.hasOwnProperty.call(message, "signal") && message.signal !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.signal);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TerminalExit message, length delimited. Does not implicitly {@link cloudcli.TerminalExit.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.TerminalExit
         * @static
         * @param {cloudcli.TerminalExit.$Properties} message TerminalExit message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalExit.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a TerminalExit message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.TerminalExit
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.TerminalExit & cloudcli.TerminalExit.$Shape} TerminalExit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalExit.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.TerminalExit(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.int32())
                            message.exitCode = value;
                        else
                            delete message.exitCode;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.signal = value;
                        else
                            delete message.signal;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TerminalExit message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.TerminalExit
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalExit & cloudcli.TerminalExit.$Shape} TerminalExit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalExit.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TerminalExit message.
         * @function verify
         * @memberof cloudcli.TerminalExit
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TerminalExit.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.exitCode != null && $Object.hasOwnProperty.call(message, "exitCode"))
                if (!$util.isInteger(message.exitCode))
                    return "exitCode: integer expected";
            if (message.signal != null && $Object.hasOwnProperty.call(message, "signal"))
                if (!$util.isString(message.signal))
                    return "signal: string expected";
            return null;
        };

        /**
         * Creates a TerminalExit message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.TerminalExit
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.TerminalExit} TerminalExit
         */
        TerminalExit.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.TerminalExit)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.TerminalExit: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.TerminalExit();
            if (object.exitCode != null)
                if ($Number(object.exitCode) !== 0)
                    message.exitCode = object.exitCode | 0;
            if (object.signal != null)
                if (typeof object.signal !== "string" || object.signal.length)
                    message.signal = $String(object.signal);
            return message;
        };

        /**
         * Creates a plain object from a TerminalExit message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.TerminalExit
         * @static
         * @param {cloudcli.TerminalExit} message TerminalExit
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TerminalExit.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.exitCode = 0;
                object.signal = "";
            }
            if (message.exitCode != null && $Object.hasOwnProperty.call(message, "exitCode"))
                object.exitCode = message.exitCode;
            if (message.signal != null && $Object.hasOwnProperty.call(message, "signal"))
                object.signal = message.signal;
            return object;
        };

        /**
         * Converts this TerminalExit to JSON.
         * @function toJSON
         * @memberof cloudcli.TerminalExit
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TerminalExit.prototype.toJSON = function() {
            return TerminalExit.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TerminalExit
         * @function getTypeUrl
         * @memberof cloudcli.TerminalExit
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TerminalExit.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.TerminalExit";
        };

        return TerminalExit;
    })();

    cloudcli.TerminalServerMessage = (function() {

        /**
         * Properties of a TerminalServerMessage.
         * @typedef {Object} cloudcli.TerminalServerMessage.$Properties
         * @property {cloudcli.TerminalReady.$Properties|null} [ready] TerminalServerMessage ready
         * @property {cloudcli.TerminalOutput.$Properties|null} [output] TerminalServerMessage output
         * @property {cloudcli.TerminalExit.$Properties|null} [exit] TerminalServerMessage exit
         * @property {cloudcli.ErrorMessage.$Properties|null} [error] TerminalServerMessage error
         * @property {cloudcli.Pong.$Properties|null} [pong] TerminalServerMessage pong
         * @property {number|null} [seq] TerminalServerMessage seq
         * @property {"ready"|"output"|"exit"|"error"|"pong"} [body] TerminalServerMessage body
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TerminalServerMessage.
         * @memberof cloudcli
         * @interface ITerminalServerMessage
         * @augments cloudcli.TerminalServerMessage.$Properties
         * @deprecated Use cloudcli.TerminalServerMessage.$Properties instead.
         */

        /**
         * Narrowed shape of a TerminalServerMessage.
         * @typedef {{
         *   ready?: cloudcli.TerminalReady.$Shape|null;
         *   output?: cloudcli.TerminalOutput.$Shape|null;
         *   exit?: cloudcli.TerminalExit.$Shape|null;
         *   error?: cloudcli.ErrorMessage.$Shape|null;
         *   pong?: cloudcli.Pong.$Shape|null;
         *   seq?: number|null;
         *   $unknowns?: Array.<Uint8Array>;
         * } & (
         *   ({ body?: undefined; ready?: null; output?: null; exit?: null; error?: null; pong?: null }|{ body?: "ready"; ready: cloudcli.TerminalReady.$Shape; output?: null; exit?: null; error?: null; pong?: null }|{ body?: "output"; ready?: null; output: cloudcli.TerminalOutput.$Shape; exit?: null; error?: null; pong?: null }|{ body?: "exit"; ready?: null; output?: null; exit: cloudcli.TerminalExit.$Shape; error?: null; pong?: null }|{ body?: "error"; ready?: null; output?: null; exit?: null; error: cloudcli.ErrorMessage.$Shape; pong?: null }|{ body?: "pong"; ready?: null; output?: null; exit?: null; error?: null; pong: cloudcli.Pong.$Shape })
         * )} cloudcli.TerminalServerMessage.$Shape
         */

        /**
         * Constructs a new TerminalServerMessage.
         * @memberof cloudcli
         * @classdesc Represents a TerminalServerMessage.
         * @constructor
         * @param {cloudcli.TerminalServerMessage.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TerminalServerMessage = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TerminalServerMessage ready.
         * @member {cloudcli.TerminalReady.$Properties|null|undefined} ready
         * @memberof cloudcli.TerminalServerMessage
         * @instance
         */
        TerminalServerMessage.prototype.ready = null;

        /**
         * TerminalServerMessage output.
         * @member {cloudcli.TerminalOutput.$Properties|null|undefined} output
         * @memberof cloudcli.TerminalServerMessage
         * @instance
         */
        TerminalServerMessage.prototype.output = null;

        /**
         * TerminalServerMessage exit.
         * @member {cloudcli.TerminalExit.$Properties|null|undefined} exit
         * @memberof cloudcli.TerminalServerMessage
         * @instance
         */
        TerminalServerMessage.prototype.exit = null;

        /**
         * TerminalServerMessage error.
         * @member {cloudcli.ErrorMessage.$Properties|null|undefined} error
         * @memberof cloudcli.TerminalServerMessage
         * @instance
         */
        TerminalServerMessage.prototype.error = null;

        /**
         * TerminalServerMessage pong.
         * @member {cloudcli.Pong.$Properties|null|undefined} pong
         * @memberof cloudcli.TerminalServerMessage
         * @instance
         */
        TerminalServerMessage.prototype.pong = null;

        /**
         * TerminalServerMessage seq.
         * @member {number} seq
         * @memberof cloudcli.TerminalServerMessage
         * @instance
         */
        TerminalServerMessage.prototype.seq = 0;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * TerminalServerMessage body.
         * @member {"ready"|"output"|"exit"|"error"|"pong"|undefined} body
         * @memberof cloudcli.TerminalServerMessage
         * @instance
         */
        $Object.defineProperty(TerminalServerMessage.prototype, "body", {
            get: $util.oneOfGetter($oneOfFields = ["ready", "output", "exit", "error", "pong"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new TerminalServerMessage instance using the specified properties.
         * @function create
         * @memberof cloudcli.TerminalServerMessage
         * @static
         * @param {cloudcli.TerminalServerMessage.$Properties=} [properties] Properties to set
         * @returns {cloudcli.TerminalServerMessage} TerminalServerMessage instance
         * @type {{
         *   (properties: cloudcli.TerminalServerMessage.$Shape): cloudcli.TerminalServerMessage & cloudcli.TerminalServerMessage.$Shape;
         *   (properties?: cloudcli.TerminalServerMessage.$Properties): cloudcli.TerminalServerMessage;
         * }}
         */
        TerminalServerMessage.create = function(properties) {
            return new TerminalServerMessage(properties);
        };

        /**
         * Encodes the specified TerminalServerMessage message. Does not implicitly {@link cloudcli.TerminalServerMessage.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.TerminalServerMessage
         * @static
         * @param {cloudcli.TerminalServerMessage.$Properties} message TerminalServerMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalServerMessage.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.ready != null && $Object.hasOwnProperty.call(message, "ready"))
                $root.cloudcli.TerminalReady.encode(message.ready, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.output != null && $Object.hasOwnProperty.call(message, "output"))
                $root.cloudcli.TerminalOutput.encode(message.output, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.exit != null && $Object.hasOwnProperty.call(message, "exit"))
                $root.cloudcli.TerminalExit.encode(message.exit, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
            if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                $root.cloudcli.ErrorMessage.encode(message.error, writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
            if (message.pong != null && $Object.hasOwnProperty.call(message, "pong"))
                $root.cloudcli.Pong.encode(message.pong, writer.uint32(/* id 5, wireType 2 =*/42).fork(), _depth + 1).ldelim();
            if (message.seq != null && $Object.hasOwnProperty.call(message, "seq") && message.seq !== 0)
                writer.uint32(/* id 100, wireType 0 =*/800).uint32(message.seq);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TerminalServerMessage message, length delimited. Does not implicitly {@link cloudcli.TerminalServerMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.TerminalServerMessage
         * @static
         * @param {cloudcli.TerminalServerMessage.$Properties} message TerminalServerMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TerminalServerMessage.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a TerminalServerMessage message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.TerminalServerMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.TerminalServerMessage & cloudcli.TerminalServerMessage.$Shape} TerminalServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalServerMessage.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.TerminalServerMessage(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.ready = $root.cloudcli.TerminalReady.decode(reader, reader.uint32(), $undefined, _depth + 1, message.ready);
                        message.body = "ready";
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.output = $root.cloudcli.TerminalOutput.decode(reader, reader.uint32(), $undefined, _depth + 1, message.output);
                        message.body = "output";
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        message.exit = $root.cloudcli.TerminalExit.decode(reader, reader.uint32(), $undefined, _depth + 1, message.exit);
                        message.body = "exit";
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        message.error = $root.cloudcli.ErrorMessage.decode(reader, reader.uint32(), $undefined, _depth + 1, message.error);
                        message.body = "error";
                        continue;
                    }
                case 5: {
                        if (wireType !== 2)
                            break;
                        message.pong = $root.cloudcli.Pong.decode(reader, reader.uint32(), $undefined, _depth + 1, message.pong);
                        message.body = "pong";
                        continue;
                    }
                case 100: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.seq = value;
                        else
                            delete message.seq;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TerminalServerMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.TerminalServerMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalServerMessage & cloudcli.TerminalServerMessage.$Shape} TerminalServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TerminalServerMessage.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TerminalServerMessage message.
         * @function verify
         * @memberof cloudcli.TerminalServerMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TerminalServerMessage.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.ready != null && $Object.hasOwnProperty.call(message, "ready")) {
                properties.body = 1;
                {
                    let error = $root.cloudcli.TerminalReady.verify(message.ready, _depth + 1);
                    if (error)
                        return "ready." + error;
                }
            }
            if (message.output != null && $Object.hasOwnProperty.call(message, "output")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.TerminalOutput.verify(message.output, _depth + 1);
                    if (error)
                        return "output." + error;
                }
            }
            if (message.exit != null && $Object.hasOwnProperty.call(message, "exit")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.TerminalExit.verify(message.exit, _depth + 1);
                    if (error)
                        return "exit." + error;
                }
            }
            if (message.error != null && $Object.hasOwnProperty.call(message, "error")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.ErrorMessage.verify(message.error, _depth + 1);
                    if (error)
                        return "error." + error;
                }
            }
            if (message.pong != null && $Object.hasOwnProperty.call(message, "pong")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.Pong.verify(message.pong, _depth + 1);
                    if (error)
                        return "pong." + error;
                }
            }
            if (message.seq != null && $Object.hasOwnProperty.call(message, "seq"))
                if (!$util.isInteger(message.seq))
                    return "seq: integer expected";
            return null;
        };

        /**
         * Creates a TerminalServerMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.TerminalServerMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.TerminalServerMessage} TerminalServerMessage
         */
        TerminalServerMessage.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.TerminalServerMessage)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.TerminalServerMessage: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.TerminalServerMessage();
            if (object.ready != null) {
                if (!$util.isObject(object.ready))
                    throw $TypeError(".cloudcli.TerminalServerMessage.ready: object expected");
                message.ready = $root.cloudcli.TerminalReady.fromObject(object.ready, _depth + 1);
            }
            if (object.output != null) {
                if (!$util.isObject(object.output))
                    throw $TypeError(".cloudcli.TerminalServerMessage.output: object expected");
                message.output = $root.cloudcli.TerminalOutput.fromObject(object.output, _depth + 1);
            }
            if (object.exit != null) {
                if (!$util.isObject(object.exit))
                    throw $TypeError(".cloudcli.TerminalServerMessage.exit: object expected");
                message.exit = $root.cloudcli.TerminalExit.fromObject(object.exit, _depth + 1);
            }
            if (object.error != null) {
                if (!$util.isObject(object.error))
                    throw $TypeError(".cloudcli.TerminalServerMessage.error: object expected");
                message.error = $root.cloudcli.ErrorMessage.fromObject(object.error, _depth + 1);
            }
            if (object.pong != null) {
                if (!$util.isObject(object.pong))
                    throw $TypeError(".cloudcli.TerminalServerMessage.pong: object expected");
                message.pong = $root.cloudcli.Pong.fromObject(object.pong, _depth + 1);
            }
            if (object.seq != null)
                if ($Number(object.seq) !== 0)
                    message.seq = object.seq >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a TerminalServerMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.TerminalServerMessage
         * @static
         * @param {cloudcli.TerminalServerMessage} message TerminalServerMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TerminalServerMessage.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.seq = 0;
            if (message.ready != null && $Object.hasOwnProperty.call(message, "ready")) {
                object.ready = $root.cloudcli.TerminalReady.toObject(message.ready, options, _depth + 1);
                if (options.oneofs)
                    object.body = "ready";
            }
            if (message.output != null && $Object.hasOwnProperty.call(message, "output")) {
                object.output = $root.cloudcli.TerminalOutput.toObject(message.output, options, _depth + 1);
                if (options.oneofs)
                    object.body = "output";
            }
            if (message.exit != null && $Object.hasOwnProperty.call(message, "exit")) {
                object.exit = $root.cloudcli.TerminalExit.toObject(message.exit, options, _depth + 1);
                if (options.oneofs)
                    object.body = "exit";
            }
            if (message.error != null && $Object.hasOwnProperty.call(message, "error")) {
                object.error = $root.cloudcli.ErrorMessage.toObject(message.error, options, _depth + 1);
                if (options.oneofs)
                    object.body = "error";
            }
            if (message.pong != null && $Object.hasOwnProperty.call(message, "pong")) {
                object.pong = $root.cloudcli.Pong.toObject(message.pong, options, _depth + 1);
                if (options.oneofs)
                    object.body = "pong";
            }
            if (message.seq != null && $Object.hasOwnProperty.call(message, "seq"))
                object.seq = message.seq;
            return object;
        };

        /**
         * Converts this TerminalServerMessage to JSON.
         * @function toJSON
         * @memberof cloudcli.TerminalServerMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TerminalServerMessage.prototype.toJSON = function() {
            return TerminalServerMessage.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TerminalServerMessage
         * @function getTypeUrl
         * @memberof cloudcli.TerminalServerMessage
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TerminalServerMessage.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.TerminalServerMessage";
        };

        return TerminalServerMessage;
    })();

    cloudcli.AddTab = (function() {

        /**
         * Properties of an AddTab.
         * @typedef {Object} cloudcli.AddTab.$Properties
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of an AddTab.
         * @memberof cloudcli
         * @interface IAddTab
         * @augments cloudcli.AddTab.$Properties
         * @deprecated Use cloudcli.AddTab.$Properties instead.
         */

        /**
         * Shape of an AddTab.
         * @typedef {cloudcli.AddTab.$Properties} cloudcli.AddTab.$Shape
         */

        /**
         * Constructs a new AddTab.
         * @memberof cloudcli
         * @classdesc Represents an AddTab.
         * @constructor
         * @param {cloudcli.AddTab.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const AddTab = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * Creates a new AddTab instance using the specified properties.
         * @function create
         * @memberof cloudcli.AddTab
         * @static
         * @param {cloudcli.AddTab.$Properties=} [properties] Properties to set
         * @returns {cloudcli.AddTab} AddTab instance
         * @type {{
         *   (properties: cloudcli.AddTab.$Shape): cloudcli.AddTab & cloudcli.AddTab.$Shape;
         *   (properties?: cloudcli.AddTab.$Properties): cloudcli.AddTab;
         * }}
         */
        AddTab.create = function(properties) {
            return new AddTab(properties);
        };

        /**
         * Encodes the specified AddTab message. Does not implicitly {@link cloudcli.AddTab.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.AddTab
         * @static
         * @param {cloudcli.AddTab.$Properties} message AddTab message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AddTab.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified AddTab message, length delimited. Does not implicitly {@link cloudcli.AddTab.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.AddTab
         * @static
         * @param {cloudcli.AddTab.$Properties} message AddTab message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AddTab.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes an AddTab message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.AddTab
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.AddTab & cloudcli.AddTab.$Shape} AddTab
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AddTab.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.AddTab();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                reader.skipType(tag & 7, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes an AddTab message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.AddTab
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.AddTab & cloudcli.AddTab.$Shape} AddTab
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AddTab.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an AddTab message.
         * @function verify
         * @memberof cloudcli.AddTab
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        AddTab.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            return null;
        };

        /**
         * Creates an AddTab message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.AddTab
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.AddTab} AddTab
         */
        AddTab.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.AddTab)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.AddTab: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            return new $root.cloudcli.AddTab();
        };

        /**
         * Creates a plain object from an AddTab message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.AddTab
         * @static
         * @param {cloudcli.AddTab} message AddTab
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AddTab.toObject = function () {
            return {};
        };

        /**
         * Converts this AddTab to JSON.
         * @function toJSON
         * @memberof cloudcli.AddTab
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AddTab.prototype.toJSON = function() {
            return AddTab.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for AddTab
         * @function getTypeUrl
         * @memberof cloudcli.AddTab
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        AddTab.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.AddTab";
        };

        return AddTab;
    })();

    cloudcli.SetActive = (function() {

        /**
         * Properties of a SetActive.
         * @typedef {Object} cloudcli.SetActive.$Properties
         * @property {string|null} [activeId] SetActive activeId
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a SetActive.
         * @memberof cloudcli
         * @interface ISetActive
         * @augments cloudcli.SetActive.$Properties
         * @deprecated Use cloudcli.SetActive.$Properties instead.
         */

        /**
         * Shape of a SetActive.
         * @typedef {cloudcli.SetActive.$Properties} cloudcli.SetActive.$Shape
         */

        /**
         * Constructs a new SetActive.
         * @memberof cloudcli
         * @classdesc Represents a SetActive.
         * @constructor
         * @param {cloudcli.SetActive.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const SetActive = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * SetActive activeId.
         * @member {string} activeId
         * @memberof cloudcli.SetActive
         * @instance
         */
        SetActive.prototype.activeId = "";

        /**
         * Creates a new SetActive instance using the specified properties.
         * @function create
         * @memberof cloudcli.SetActive
         * @static
         * @param {cloudcli.SetActive.$Properties=} [properties] Properties to set
         * @returns {cloudcli.SetActive} SetActive instance
         * @type {{
         *   (properties: cloudcli.SetActive.$Shape): cloudcli.SetActive & cloudcli.SetActive.$Shape;
         *   (properties?: cloudcli.SetActive.$Properties): cloudcli.SetActive;
         * }}
         */
        SetActive.create = function(properties) {
            return new SetActive(properties);
        };

        /**
         * Encodes the specified SetActive message. Does not implicitly {@link cloudcli.SetActive.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.SetActive
         * @static
         * @param {cloudcli.SetActive.$Properties} message SetActive message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SetActive.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.activeId != null && $Object.hasOwnProperty.call(message, "activeId") && message.activeId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.activeId);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified SetActive message, length delimited. Does not implicitly {@link cloudcli.SetActive.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.SetActive
         * @static
         * @param {cloudcli.SetActive.$Properties} message SetActive message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SetActive.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a SetActive message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.SetActive
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.SetActive & cloudcli.SetActive.$Shape} SetActive
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SetActive.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.SetActive(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.activeId = value;
                        else
                            delete message.activeId;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a SetActive message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.SetActive
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.SetActive & cloudcli.SetActive.$Shape} SetActive
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SetActive.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SetActive message.
         * @function verify
         * @memberof cloudcli.SetActive
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SetActive.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.activeId != null && $Object.hasOwnProperty.call(message, "activeId"))
                if (!$util.isString(message.activeId))
                    return "activeId: string expected";
            return null;
        };

        /**
         * Creates a SetActive message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.SetActive
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.SetActive} SetActive
         */
        SetActive.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.SetActive)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.SetActive: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.SetActive();
            if (object.activeId != null)
                if (typeof object.activeId !== "string" || object.activeId.length)
                    message.activeId = $String(object.activeId);
            return message;
        };

        /**
         * Creates a plain object from a SetActive message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.SetActive
         * @static
         * @param {cloudcli.SetActive} message SetActive
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SetActive.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.activeId = "";
            if (message.activeId != null && $Object.hasOwnProperty.call(message, "activeId"))
                object.activeId = message.activeId;
            return object;
        };

        /**
         * Converts this SetActive to JSON.
         * @function toJSON
         * @memberof cloudcli.SetActive
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SetActive.prototype.toJSON = function() {
            return SetActive.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for SetActive
         * @function getTypeUrl
         * @memberof cloudcli.SetActive
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        SetActive.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.SetActive";
        };

        return SetActive;
    })();

    cloudcli.UpdateTitle = (function() {

        /**
         * Properties of an UpdateTitle.
         * @typedef {Object} cloudcli.UpdateTitle.$Properties
         * @property {string|null} [tabId] UpdateTitle tabId
         * @property {string|null} [title] UpdateTitle title
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of an UpdateTitle.
         * @memberof cloudcli
         * @interface IUpdateTitle
         * @augments cloudcli.UpdateTitle.$Properties
         * @deprecated Use cloudcli.UpdateTitle.$Properties instead.
         */

        /**
         * Shape of an UpdateTitle.
         * @typedef {cloudcli.UpdateTitle.$Properties} cloudcli.UpdateTitle.$Shape
         */

        /**
         * Constructs a new UpdateTitle.
         * @memberof cloudcli
         * @classdesc Represents an UpdateTitle.
         * @constructor
         * @param {cloudcli.UpdateTitle.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const UpdateTitle = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * UpdateTitle tabId.
         * @member {string} tabId
         * @memberof cloudcli.UpdateTitle
         * @instance
         */
        UpdateTitle.prototype.tabId = "";

        /**
         * UpdateTitle title.
         * @member {string} title
         * @memberof cloudcli.UpdateTitle
         * @instance
         */
        UpdateTitle.prototype.title = "";

        /**
         * Creates a new UpdateTitle instance using the specified properties.
         * @function create
         * @memberof cloudcli.UpdateTitle
         * @static
         * @param {cloudcli.UpdateTitle.$Properties=} [properties] Properties to set
         * @returns {cloudcli.UpdateTitle} UpdateTitle instance
         * @type {{
         *   (properties: cloudcli.UpdateTitle.$Shape): cloudcli.UpdateTitle & cloudcli.UpdateTitle.$Shape;
         *   (properties?: cloudcli.UpdateTitle.$Properties): cloudcli.UpdateTitle;
         * }}
         */
        UpdateTitle.create = function(properties) {
            return new UpdateTitle(properties);
        };

        /**
         * Encodes the specified UpdateTitle message. Does not implicitly {@link cloudcli.UpdateTitle.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.UpdateTitle
         * @static
         * @param {cloudcli.UpdateTitle.$Properties} message UpdateTitle message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UpdateTitle.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.tabId != null && $Object.hasOwnProperty.call(message, "tabId") && message.tabId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.tabId);
            if (message.title != null && $Object.hasOwnProperty.call(message, "title") && message.title !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.title);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified UpdateTitle message, length delimited. Does not implicitly {@link cloudcli.UpdateTitle.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.UpdateTitle
         * @static
         * @param {cloudcli.UpdateTitle.$Properties} message UpdateTitle message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UpdateTitle.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes an UpdateTitle message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.UpdateTitle
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.UpdateTitle & cloudcli.UpdateTitle.$Shape} UpdateTitle
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UpdateTitle.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.UpdateTitle(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.tabId = value;
                        else
                            delete message.tabId;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.title = value;
                        else
                            delete message.title;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes an UpdateTitle message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.UpdateTitle
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.UpdateTitle & cloudcli.UpdateTitle.$Shape} UpdateTitle
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UpdateTitle.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an UpdateTitle message.
         * @function verify
         * @memberof cloudcli.UpdateTitle
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        UpdateTitle.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.tabId != null && $Object.hasOwnProperty.call(message, "tabId"))
                if (!$util.isString(message.tabId))
                    return "tabId: string expected";
            if (message.title != null && $Object.hasOwnProperty.call(message, "title"))
                if (!$util.isString(message.title))
                    return "title: string expected";
            return null;
        };

        /**
         * Creates an UpdateTitle message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.UpdateTitle
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.UpdateTitle} UpdateTitle
         */
        UpdateTitle.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.UpdateTitle)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.UpdateTitle: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.UpdateTitle();
            if (object.tabId != null)
                if (typeof object.tabId !== "string" || object.tabId.length)
                    message.tabId = $String(object.tabId);
            if (object.title != null)
                if (typeof object.title !== "string" || object.title.length)
                    message.title = $String(object.title);
            return message;
        };

        /**
         * Creates a plain object from an UpdateTitle message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.UpdateTitle
         * @static
         * @param {cloudcli.UpdateTitle} message UpdateTitle
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        UpdateTitle.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.tabId = "";
                object.title = "";
            }
            if (message.tabId != null && $Object.hasOwnProperty.call(message, "tabId"))
                object.tabId = message.tabId;
            if (message.title != null && $Object.hasOwnProperty.call(message, "title"))
                object.title = message.title;
            return object;
        };

        /**
         * Converts this UpdateTitle to JSON.
         * @function toJSON
         * @memberof cloudcli.UpdateTitle
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        UpdateTitle.prototype.toJSON = function() {
            return UpdateTitle.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for UpdateTitle
         * @function getTypeUrl
         * @memberof cloudcli.UpdateTitle
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        UpdateTitle.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.UpdateTitle";
        };

        return UpdateTitle;
    })();

    cloudcli.RestartTab = (function() {

        /**
         * Properties of a RestartTab.
         * @typedef {Object} cloudcli.RestartTab.$Properties
         * @property {string|null} [tabId] RestartTab tabId
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a RestartTab.
         * @memberof cloudcli
         * @interface IRestartTab
         * @augments cloudcli.RestartTab.$Properties
         * @deprecated Use cloudcli.RestartTab.$Properties instead.
         */

        /**
         * Shape of a RestartTab.
         * @typedef {cloudcli.RestartTab.$Properties} cloudcli.RestartTab.$Shape
         */

        /**
         * Constructs a new RestartTab.
         * @memberof cloudcli
         * @classdesc Represents a RestartTab.
         * @constructor
         * @param {cloudcli.RestartTab.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const RestartTab = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * RestartTab tabId.
         * @member {string} tabId
         * @memberof cloudcli.RestartTab
         * @instance
         */
        RestartTab.prototype.tabId = "";

        /**
         * Creates a new RestartTab instance using the specified properties.
         * @function create
         * @memberof cloudcli.RestartTab
         * @static
         * @param {cloudcli.RestartTab.$Properties=} [properties] Properties to set
         * @returns {cloudcli.RestartTab} RestartTab instance
         * @type {{
         *   (properties: cloudcli.RestartTab.$Shape): cloudcli.RestartTab & cloudcli.RestartTab.$Shape;
         *   (properties?: cloudcli.RestartTab.$Properties): cloudcli.RestartTab;
         * }}
         */
        RestartTab.create = function(properties) {
            return new RestartTab(properties);
        };

        /**
         * Encodes the specified RestartTab message. Does not implicitly {@link cloudcli.RestartTab.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.RestartTab
         * @static
         * @param {cloudcli.RestartTab.$Properties} message RestartTab message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RestartTab.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.tabId != null && $Object.hasOwnProperty.call(message, "tabId") && message.tabId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.tabId);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified RestartTab message, length delimited. Does not implicitly {@link cloudcli.RestartTab.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.RestartTab
         * @static
         * @param {cloudcli.RestartTab.$Properties} message RestartTab message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RestartTab.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a RestartTab message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.RestartTab
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.RestartTab & cloudcli.RestartTab.$Shape} RestartTab
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RestartTab.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.RestartTab(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.tabId = value;
                        else
                            delete message.tabId;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a RestartTab message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.RestartTab
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.RestartTab & cloudcli.RestartTab.$Shape} RestartTab
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RestartTab.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a RestartTab message.
         * @function verify
         * @memberof cloudcli.RestartTab
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        RestartTab.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.tabId != null && $Object.hasOwnProperty.call(message, "tabId"))
                if (!$util.isString(message.tabId))
                    return "tabId: string expected";
            return null;
        };

        /**
         * Creates a RestartTab message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.RestartTab
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.RestartTab} RestartTab
         */
        RestartTab.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.RestartTab)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.RestartTab: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.RestartTab();
            if (object.tabId != null)
                if (typeof object.tabId !== "string" || object.tabId.length)
                    message.tabId = $String(object.tabId);
            return message;
        };

        /**
         * Creates a plain object from a RestartTab message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.RestartTab
         * @static
         * @param {cloudcli.RestartTab} message RestartTab
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        RestartTab.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.tabId = "";
            if (message.tabId != null && $Object.hasOwnProperty.call(message, "tabId"))
                object.tabId = message.tabId;
            return object;
        };

        /**
         * Converts this RestartTab to JSON.
         * @function toJSON
         * @memberof cloudcli.RestartTab
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        RestartTab.prototype.toJSON = function() {
            return RestartTab.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for RestartTab
         * @function getTypeUrl
         * @memberof cloudcli.RestartTab
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        RestartTab.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.RestartTab";
        };

        return RestartTab;
    })();

    cloudcli.CloseTab = (function() {

        /**
         * Properties of a CloseTab.
         * @typedef {Object} cloudcli.CloseTab.$Properties
         * @property {string|null} [tabId] CloseTab tabId
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a CloseTab.
         * @memberof cloudcli
         * @interface ICloseTab
         * @augments cloudcli.CloseTab.$Properties
         * @deprecated Use cloudcli.CloseTab.$Properties instead.
         */

        /**
         * Shape of a CloseTab.
         * @typedef {cloudcli.CloseTab.$Properties} cloudcli.CloseTab.$Shape
         */

        /**
         * Constructs a new CloseTab.
         * @memberof cloudcli
         * @classdesc Represents a CloseTab.
         * @constructor
         * @param {cloudcli.CloseTab.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const CloseTab = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * CloseTab tabId.
         * @member {string} tabId
         * @memberof cloudcli.CloseTab
         * @instance
         */
        CloseTab.prototype.tabId = "";

        /**
         * Creates a new CloseTab instance using the specified properties.
         * @function create
         * @memberof cloudcli.CloseTab
         * @static
         * @param {cloudcli.CloseTab.$Properties=} [properties] Properties to set
         * @returns {cloudcli.CloseTab} CloseTab instance
         * @type {{
         *   (properties: cloudcli.CloseTab.$Shape): cloudcli.CloseTab & cloudcli.CloseTab.$Shape;
         *   (properties?: cloudcli.CloseTab.$Properties): cloudcli.CloseTab;
         * }}
         */
        CloseTab.create = function(properties) {
            return new CloseTab(properties);
        };

        /**
         * Encodes the specified CloseTab message. Does not implicitly {@link cloudcli.CloseTab.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.CloseTab
         * @static
         * @param {cloudcli.CloseTab.$Properties} message CloseTab message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CloseTab.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.tabId != null && $Object.hasOwnProperty.call(message, "tabId") && message.tabId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.tabId);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified CloseTab message, length delimited. Does not implicitly {@link cloudcli.CloseTab.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.CloseTab
         * @static
         * @param {cloudcli.CloseTab.$Properties} message CloseTab message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CloseTab.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a CloseTab message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.CloseTab
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.CloseTab & cloudcli.CloseTab.$Shape} CloseTab
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CloseTab.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.CloseTab(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.tabId = value;
                        else
                            delete message.tabId;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a CloseTab message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.CloseTab
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.CloseTab & cloudcli.CloseTab.$Shape} CloseTab
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CloseTab.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a CloseTab message.
         * @function verify
         * @memberof cloudcli.CloseTab
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        CloseTab.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.tabId != null && $Object.hasOwnProperty.call(message, "tabId"))
                if (!$util.isString(message.tabId))
                    return "tabId: string expected";
            return null;
        };

        /**
         * Creates a CloseTab message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.CloseTab
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.CloseTab} CloseTab
         */
        CloseTab.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.CloseTab)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.CloseTab: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.CloseTab();
            if (object.tabId != null)
                if (typeof object.tabId !== "string" || object.tabId.length)
                    message.tabId = $String(object.tabId);
            return message;
        };

        /**
         * Creates a plain object from a CloseTab message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.CloseTab
         * @static
         * @param {cloudcli.CloseTab} message CloseTab
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        CloseTab.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                object.tabId = "";
            if (message.tabId != null && $Object.hasOwnProperty.call(message, "tabId"))
                object.tabId = message.tabId;
            return object;
        };

        /**
         * Converts this CloseTab to JSON.
         * @function toJSON
         * @memberof cloudcli.CloseTab
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        CloseTab.prototype.toJSON = function() {
            return CloseTab.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for CloseTab
         * @function getTypeUrl
         * @memberof cloudcli.CloseTab
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        CloseTab.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.CloseTab";
        };

        return CloseTab;
    })();

    cloudcli.TabsClientMessage = (function() {

        /**
         * Properties of a TabsClientMessage.
         * @typedef {Object} cloudcli.TabsClientMessage.$Properties
         * @property {cloudcli.Ping.$Properties|null} [ping] TabsClientMessage ping
         * @property {cloudcli.AddTab.$Properties|null} [addTab] TabsClientMessage addTab
         * @property {cloudcli.SetActive.$Properties|null} [setActive] TabsClientMessage setActive
         * @property {cloudcli.UpdateTitle.$Properties|null} [updateTitle] TabsClientMessage updateTitle
         * @property {cloudcli.RestartTab.$Properties|null} [restartTab] TabsClientMessage restartTab
         * @property {cloudcli.CloseTab.$Properties|null} [closeTab] TabsClientMessage closeTab
         * @property {"ping"|"addTab"|"setActive"|"updateTitle"|"restartTab"|"closeTab"} [body] TabsClientMessage body
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TabsClientMessage.
         * @memberof cloudcli
         * @interface ITabsClientMessage
         * @augments cloudcli.TabsClientMessage.$Properties
         * @deprecated Use cloudcli.TabsClientMessage.$Properties instead.
         */

        /**
         * Narrowed shape of a TabsClientMessage.
         * @typedef {{
         *   ping?: cloudcli.Ping.$Shape|null;
         *   addTab?: cloudcli.AddTab.$Shape|null;
         *   setActive?: cloudcli.SetActive.$Shape|null;
         *   updateTitle?: cloudcli.UpdateTitle.$Shape|null;
         *   restartTab?: cloudcli.RestartTab.$Shape|null;
         *   closeTab?: cloudcli.CloseTab.$Shape|null;
         *   $unknowns?: Array.<Uint8Array>;
         * } & (
         *   ({ body?: undefined; ping?: null; addTab?: null; setActive?: null; updateTitle?: null; restartTab?: null; closeTab?: null }|{ body?: "ping"; ping: cloudcli.Ping.$Shape; addTab?: null; setActive?: null; updateTitle?: null; restartTab?: null; closeTab?: null }|{ body?: "addTab"; ping?: null; addTab: cloudcli.AddTab.$Shape; setActive?: null; updateTitle?: null; restartTab?: null; closeTab?: null }|{ body?: "setActive"; ping?: null; addTab?: null; setActive: cloudcli.SetActive.$Shape; updateTitle?: null; restartTab?: null; closeTab?: null }|{ body?: "updateTitle"; ping?: null; addTab?: null; setActive?: null; updateTitle: cloudcli.UpdateTitle.$Shape; restartTab?: null; closeTab?: null }|{ body?: "restartTab"; ping?: null; addTab?: null; setActive?: null; updateTitle?: null; restartTab: cloudcli.RestartTab.$Shape; closeTab?: null }|{ body?: "closeTab"; ping?: null; addTab?: null; setActive?: null; updateTitle?: null; restartTab?: null; closeTab: cloudcli.CloseTab.$Shape })
         * )} cloudcli.TabsClientMessage.$Shape
         */

        /**
         * Constructs a new TabsClientMessage.
         * @memberof cloudcli
         * @classdesc Represents a TabsClientMessage.
         * @constructor
         * @param {cloudcli.TabsClientMessage.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TabsClientMessage = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TabsClientMessage ping.
         * @member {cloudcli.Ping.$Properties|null|undefined} ping
         * @memberof cloudcli.TabsClientMessage
         * @instance
         */
        TabsClientMessage.prototype.ping = null;

        /**
         * TabsClientMessage addTab.
         * @member {cloudcli.AddTab.$Properties|null|undefined} addTab
         * @memberof cloudcli.TabsClientMessage
         * @instance
         */
        TabsClientMessage.prototype.addTab = null;

        /**
         * TabsClientMessage setActive.
         * @member {cloudcli.SetActive.$Properties|null|undefined} setActive
         * @memberof cloudcli.TabsClientMessage
         * @instance
         */
        TabsClientMessage.prototype.setActive = null;

        /**
         * TabsClientMessage updateTitle.
         * @member {cloudcli.UpdateTitle.$Properties|null|undefined} updateTitle
         * @memberof cloudcli.TabsClientMessage
         * @instance
         */
        TabsClientMessage.prototype.updateTitle = null;

        /**
         * TabsClientMessage restartTab.
         * @member {cloudcli.RestartTab.$Properties|null|undefined} restartTab
         * @memberof cloudcli.TabsClientMessage
         * @instance
         */
        TabsClientMessage.prototype.restartTab = null;

        /**
         * TabsClientMessage closeTab.
         * @member {cloudcli.CloseTab.$Properties|null|undefined} closeTab
         * @memberof cloudcli.TabsClientMessage
         * @instance
         */
        TabsClientMessage.prototype.closeTab = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * TabsClientMessage body.
         * @member {"ping"|"addTab"|"setActive"|"updateTitle"|"restartTab"|"closeTab"|undefined} body
         * @memberof cloudcli.TabsClientMessage
         * @instance
         */
        $Object.defineProperty(TabsClientMessage.prototype, "body", {
            get: $util.oneOfGetter($oneOfFields = ["ping", "addTab", "setActive", "updateTitle", "restartTab", "closeTab"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new TabsClientMessage instance using the specified properties.
         * @function create
         * @memberof cloudcli.TabsClientMessage
         * @static
         * @param {cloudcli.TabsClientMessage.$Properties=} [properties] Properties to set
         * @returns {cloudcli.TabsClientMessage} TabsClientMessage instance
         * @type {{
         *   (properties: cloudcli.TabsClientMessage.$Shape): cloudcli.TabsClientMessage & cloudcli.TabsClientMessage.$Shape;
         *   (properties?: cloudcli.TabsClientMessage.$Properties): cloudcli.TabsClientMessage;
         * }}
         */
        TabsClientMessage.create = function(properties) {
            return new TabsClientMessage(properties);
        };

        /**
         * Encodes the specified TabsClientMessage message. Does not implicitly {@link cloudcli.TabsClientMessage.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.TabsClientMessage
         * @static
         * @param {cloudcli.TabsClientMessage.$Properties} message TabsClientMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TabsClientMessage.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.ping != null && $Object.hasOwnProperty.call(message, "ping"))
                $root.cloudcli.Ping.encode(message.ping, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.addTab != null && $Object.hasOwnProperty.call(message, "addTab"))
                $root.cloudcli.AddTab.encode(message.addTab, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.setActive != null && $Object.hasOwnProperty.call(message, "setActive"))
                $root.cloudcli.SetActive.encode(message.setActive, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
            if (message.updateTitle != null && $Object.hasOwnProperty.call(message, "updateTitle"))
                $root.cloudcli.UpdateTitle.encode(message.updateTitle, writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
            if (message.restartTab != null && $Object.hasOwnProperty.call(message, "restartTab"))
                $root.cloudcli.RestartTab.encode(message.restartTab, writer.uint32(/* id 5, wireType 2 =*/42).fork(), _depth + 1).ldelim();
            if (message.closeTab != null && $Object.hasOwnProperty.call(message, "closeTab"))
                $root.cloudcli.CloseTab.encode(message.closeTab, writer.uint32(/* id 6, wireType 2 =*/50).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TabsClientMessage message, length delimited. Does not implicitly {@link cloudcli.TabsClientMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.TabsClientMessage
         * @static
         * @param {cloudcli.TabsClientMessage.$Properties} message TabsClientMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TabsClientMessage.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a TabsClientMessage message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.TabsClientMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.TabsClientMessage & cloudcli.TabsClientMessage.$Shape} TabsClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TabsClientMessage.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.TabsClientMessage();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.ping = $root.cloudcli.Ping.decode(reader, reader.uint32(), $undefined, _depth + 1, message.ping);
                        message.body = "ping";
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.addTab = $root.cloudcli.AddTab.decode(reader, reader.uint32(), $undefined, _depth + 1, message.addTab);
                        message.body = "addTab";
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        message.setActive = $root.cloudcli.SetActive.decode(reader, reader.uint32(), $undefined, _depth + 1, message.setActive);
                        message.body = "setActive";
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        message.updateTitle = $root.cloudcli.UpdateTitle.decode(reader, reader.uint32(), $undefined, _depth + 1, message.updateTitle);
                        message.body = "updateTitle";
                        continue;
                    }
                case 5: {
                        if (wireType !== 2)
                            break;
                        message.restartTab = $root.cloudcli.RestartTab.decode(reader, reader.uint32(), $undefined, _depth + 1, message.restartTab);
                        message.body = "restartTab";
                        continue;
                    }
                case 6: {
                        if (wireType !== 2)
                            break;
                        message.closeTab = $root.cloudcli.CloseTab.decode(reader, reader.uint32(), $undefined, _depth + 1, message.closeTab);
                        message.body = "closeTab";
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TabsClientMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.TabsClientMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.TabsClientMessage & cloudcli.TabsClientMessage.$Shape} TabsClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TabsClientMessage.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TabsClientMessage message.
         * @function verify
         * @memberof cloudcli.TabsClientMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TabsClientMessage.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.ping != null && $Object.hasOwnProperty.call(message, "ping")) {
                properties.body = 1;
                {
                    let error = $root.cloudcli.Ping.verify(message.ping, _depth + 1);
                    if (error)
                        return "ping." + error;
                }
            }
            if (message.addTab != null && $Object.hasOwnProperty.call(message, "addTab")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.AddTab.verify(message.addTab, _depth + 1);
                    if (error)
                        return "addTab." + error;
                }
            }
            if (message.setActive != null && $Object.hasOwnProperty.call(message, "setActive")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.SetActive.verify(message.setActive, _depth + 1);
                    if (error)
                        return "setActive." + error;
                }
            }
            if (message.updateTitle != null && $Object.hasOwnProperty.call(message, "updateTitle")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.UpdateTitle.verify(message.updateTitle, _depth + 1);
                    if (error)
                        return "updateTitle." + error;
                }
            }
            if (message.restartTab != null && $Object.hasOwnProperty.call(message, "restartTab")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.RestartTab.verify(message.restartTab, _depth + 1);
                    if (error)
                        return "restartTab." + error;
                }
            }
            if (message.closeTab != null && $Object.hasOwnProperty.call(message, "closeTab")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.CloseTab.verify(message.closeTab, _depth + 1);
                    if (error)
                        return "closeTab." + error;
                }
            }
            return null;
        };

        /**
         * Creates a TabsClientMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.TabsClientMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.TabsClientMessage} TabsClientMessage
         */
        TabsClientMessage.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.TabsClientMessage)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.TabsClientMessage: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.TabsClientMessage();
            if (object.ping != null) {
                if (!$util.isObject(object.ping))
                    throw $TypeError(".cloudcli.TabsClientMessage.ping: object expected");
                message.ping = $root.cloudcli.Ping.fromObject(object.ping, _depth + 1);
            }
            if (object.addTab != null) {
                if (!$util.isObject(object.addTab))
                    throw $TypeError(".cloudcli.TabsClientMessage.addTab: object expected");
                message.addTab = $root.cloudcli.AddTab.fromObject(object.addTab, _depth + 1);
            }
            if (object.setActive != null) {
                if (!$util.isObject(object.setActive))
                    throw $TypeError(".cloudcli.TabsClientMessage.setActive: object expected");
                message.setActive = $root.cloudcli.SetActive.fromObject(object.setActive, _depth + 1);
            }
            if (object.updateTitle != null) {
                if (!$util.isObject(object.updateTitle))
                    throw $TypeError(".cloudcli.TabsClientMessage.updateTitle: object expected");
                message.updateTitle = $root.cloudcli.UpdateTitle.fromObject(object.updateTitle, _depth + 1);
            }
            if (object.restartTab != null) {
                if (!$util.isObject(object.restartTab))
                    throw $TypeError(".cloudcli.TabsClientMessage.restartTab: object expected");
                message.restartTab = $root.cloudcli.RestartTab.fromObject(object.restartTab, _depth + 1);
            }
            if (object.closeTab != null) {
                if (!$util.isObject(object.closeTab))
                    throw $TypeError(".cloudcli.TabsClientMessage.closeTab: object expected");
                message.closeTab = $root.cloudcli.CloseTab.fromObject(object.closeTab, _depth + 1);
            }
            return message;
        };

        /**
         * Creates a plain object from a TabsClientMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.TabsClientMessage
         * @static
         * @param {cloudcli.TabsClientMessage} message TabsClientMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TabsClientMessage.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (message.ping != null && $Object.hasOwnProperty.call(message, "ping")) {
                object.ping = $root.cloudcli.Ping.toObject(message.ping, options, _depth + 1);
                if (options.oneofs)
                    object.body = "ping";
            }
            if (message.addTab != null && $Object.hasOwnProperty.call(message, "addTab")) {
                object.addTab = $root.cloudcli.AddTab.toObject(message.addTab, options, _depth + 1);
                if (options.oneofs)
                    object.body = "addTab";
            }
            if (message.setActive != null && $Object.hasOwnProperty.call(message, "setActive")) {
                object.setActive = $root.cloudcli.SetActive.toObject(message.setActive, options, _depth + 1);
                if (options.oneofs)
                    object.body = "setActive";
            }
            if (message.updateTitle != null && $Object.hasOwnProperty.call(message, "updateTitle")) {
                object.updateTitle = $root.cloudcli.UpdateTitle.toObject(message.updateTitle, options, _depth + 1);
                if (options.oneofs)
                    object.body = "updateTitle";
            }
            if (message.restartTab != null && $Object.hasOwnProperty.call(message, "restartTab")) {
                object.restartTab = $root.cloudcli.RestartTab.toObject(message.restartTab, options, _depth + 1);
                if (options.oneofs)
                    object.body = "restartTab";
            }
            if (message.closeTab != null && $Object.hasOwnProperty.call(message, "closeTab")) {
                object.closeTab = $root.cloudcli.CloseTab.toObject(message.closeTab, options, _depth + 1);
                if (options.oneofs)
                    object.body = "closeTab";
            }
            return object;
        };

        /**
         * Converts this TabsClientMessage to JSON.
         * @function toJSON
         * @memberof cloudcli.TabsClientMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TabsClientMessage.prototype.toJSON = function() {
            return TabsClientMessage.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TabsClientMessage
         * @function getTypeUrl
         * @memberof cloudcli.TabsClientMessage
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TabsClientMessage.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.TabsClientMessage";
        };

        return TabsClientMessage;
    })();

    cloudcli.Tab = (function() {

        /**
         * Properties of a Tab.
         * @typedef {Object} cloudcli.Tab.$Properties
         * @property {string|null} [id] Tab id
         * @property {string|null} [title] Tab title
         * @property {string|null} [status] Tab status
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a Tab.
         * @memberof cloudcli
         * @interface ITab
         * @augments cloudcli.Tab.$Properties
         * @deprecated Use cloudcli.Tab.$Properties instead.
         */

        /**
         * Shape of a Tab.
         * @typedef {cloudcli.Tab.$Properties} cloudcli.Tab.$Shape
         */

        /**
         * Constructs a new Tab.
         * @memberof cloudcli
         * @classdesc Represents a Tab.
         * @constructor
         * @param {cloudcli.Tab.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const Tab = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * Tab id.
         * @member {string} id
         * @memberof cloudcli.Tab
         * @instance
         */
        Tab.prototype.id = "";

        /**
         * Tab title.
         * @member {string} title
         * @memberof cloudcli.Tab
         * @instance
         */
        Tab.prototype.title = "";

        /**
         * Tab status.
         * @member {string} status
         * @memberof cloudcli.Tab
         * @instance
         */
        Tab.prototype.status = "";

        /**
         * Creates a new Tab instance using the specified properties.
         * @function create
         * @memberof cloudcli.Tab
         * @static
         * @param {cloudcli.Tab.$Properties=} [properties] Properties to set
         * @returns {cloudcli.Tab} Tab instance
         * @type {{
         *   (properties: cloudcli.Tab.$Shape): cloudcli.Tab & cloudcli.Tab.$Shape;
         *   (properties?: cloudcli.Tab.$Properties): cloudcli.Tab;
         * }}
         */
        Tab.create = function(properties) {
            return new Tab(properties);
        };

        /**
         * Encodes the specified Tab message. Does not implicitly {@link cloudcli.Tab.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.Tab
         * @static
         * @param {cloudcli.Tab.$Properties} message Tab message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Tab.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.id != null && $Object.hasOwnProperty.call(message, "id") && message.id !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
            if (message.title != null && $Object.hasOwnProperty.call(message, "title") && message.title !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.title);
            if (message.status != null && $Object.hasOwnProperty.call(message, "status") && message.status !== "")
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.status);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified Tab message, length delimited. Does not implicitly {@link cloudcli.Tab.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.Tab
         * @static
         * @param {cloudcli.Tab.$Properties} message Tab message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Tab.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a Tab message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.Tab
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.Tab & cloudcli.Tab.$Shape} Tab
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Tab.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.Tab(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.id = value;
                        else
                            delete message.id;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.title = value;
                        else
                            delete message.title;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.status = value;
                        else
                            delete message.status;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a Tab message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.Tab
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.Tab & cloudcli.Tab.$Shape} Tab
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Tab.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Tab message.
         * @function verify
         * @memberof cloudcli.Tab
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Tab.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            if (message.title != null && $Object.hasOwnProperty.call(message, "title"))
                if (!$util.isString(message.title))
                    return "title: string expected";
            if (message.status != null && $Object.hasOwnProperty.call(message, "status"))
                if (!$util.isString(message.status))
                    return "status: string expected";
            return null;
        };

        /**
         * Creates a Tab message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.Tab
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.Tab} Tab
         */
        Tab.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.Tab)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.Tab: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.Tab();
            if (object.id != null)
                if (typeof object.id !== "string" || object.id.length)
                    message.id = $String(object.id);
            if (object.title != null)
                if (typeof object.title !== "string" || object.title.length)
                    message.title = $String(object.title);
            if (object.status != null)
                if (typeof object.status !== "string" || object.status.length)
                    message.status = $String(object.status);
            return message;
        };

        /**
         * Creates a plain object from a Tab message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.Tab
         * @static
         * @param {cloudcli.Tab} message Tab
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Tab.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.id = "";
                object.title = "";
                object.status = "";
            }
            if (message.id != null && $Object.hasOwnProperty.call(message, "id"))
                object.id = message.id;
            if (message.title != null && $Object.hasOwnProperty.call(message, "title"))
                object.title = message.title;
            if (message.status != null && $Object.hasOwnProperty.call(message, "status"))
                object.status = message.status;
            return object;
        };

        /**
         * Converts this Tab to JSON.
         * @function toJSON
         * @memberof cloudcli.Tab
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Tab.prototype.toJSON = function() {
            return Tab.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for Tab
         * @function getTypeUrl
         * @memberof cloudcli.Tab
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        Tab.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.Tab";
        };

        return Tab;
    })();

    cloudcli.TabsState = (function() {

        /**
         * Properties of a TabsState.
         * @typedef {Object} cloudcli.TabsState.$Properties
         * @property {Array.<cloudcli.Tab.$Properties>|null} [tabs] TabsState tabs
         * @property {string|null} [activeId] TabsState activeId
         * @property {number|null} [nextIndex] TabsState nextIndex
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TabsState.
         * @memberof cloudcli
         * @interface ITabsState
         * @augments cloudcli.TabsState.$Properties
         * @deprecated Use cloudcli.TabsState.$Properties instead.
         */

        /**
         * Shape of a TabsState.
         * @typedef {cloudcli.TabsState.$Properties} cloudcli.TabsState.$Shape
         */

        /**
         * Constructs a new TabsState.
         * @memberof cloudcli
         * @classdesc Represents a TabsState.
         * @constructor
         * @param {cloudcli.TabsState.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TabsState = function (properties) {
            this.tabs = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TabsState tabs.
         * @member {Array.<cloudcli.Tab.$Properties>} tabs
         * @memberof cloudcli.TabsState
         * @instance
         */
        TabsState.prototype.tabs = $util.emptyArray;

        /**
         * TabsState activeId.
         * @member {string} activeId
         * @memberof cloudcli.TabsState
         * @instance
         */
        TabsState.prototype.activeId = "";

        /**
         * TabsState nextIndex.
         * @member {number} nextIndex
         * @memberof cloudcli.TabsState
         * @instance
         */
        TabsState.prototype.nextIndex = 0;

        /**
         * Creates a new TabsState instance using the specified properties.
         * @function create
         * @memberof cloudcli.TabsState
         * @static
         * @param {cloudcli.TabsState.$Properties=} [properties] Properties to set
         * @returns {cloudcli.TabsState} TabsState instance
         * @type {{
         *   (properties: cloudcli.TabsState.$Shape): cloudcli.TabsState & cloudcli.TabsState.$Shape;
         *   (properties?: cloudcli.TabsState.$Properties): cloudcli.TabsState;
         * }}
         */
        TabsState.create = function(properties) {
            return new TabsState(properties);
        };

        /**
         * Encodes the specified TabsState message. Does not implicitly {@link cloudcli.TabsState.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.TabsState
         * @static
         * @param {cloudcli.TabsState.$Properties} message TabsState message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TabsState.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.tabs != null && message.tabs.length)
                for (let i = 0; i < message.tabs.length; ++i)
                    $root.cloudcli.Tab.encode(message.tabs[i], writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.activeId != null && $Object.hasOwnProperty.call(message, "activeId") && message.activeId !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.activeId);
            if (message.nextIndex != null && $Object.hasOwnProperty.call(message, "nextIndex") && message.nextIndex !== 0)
                writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.nextIndex);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TabsState message, length delimited. Does not implicitly {@link cloudcli.TabsState.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.TabsState
         * @static
         * @param {cloudcli.TabsState.$Properties} message TabsState message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TabsState.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a TabsState message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.TabsState
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.TabsState & cloudcli.TabsState.$Shape} TabsState
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TabsState.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.TabsState(), value;
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if (!(message.tabs && message.tabs.length))
                            message.tabs = [];
                        message.tabs.push($root.cloudcli.Tab.decode(reader, reader.uint32(), $undefined, _depth + 1));
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.activeId = value;
                        else
                            delete message.activeId;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.nextIndex = value;
                        else
                            delete message.nextIndex;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TabsState message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.TabsState
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.TabsState & cloudcli.TabsState.$Shape} TabsState
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TabsState.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TabsState message.
         * @function verify
         * @memberof cloudcli.TabsState
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TabsState.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.tabs != null && $Object.hasOwnProperty.call(message, "tabs")) {
                if (!$Array.isArray(message.tabs))
                    return "tabs: array expected";
                for (let i = 0; i < message.tabs.length; ++i) {
                    let error = $root.cloudcli.Tab.verify(message.tabs[i], _depth + 1);
                    if (error)
                        return "tabs." + error;
                }
            }
            if (message.activeId != null && $Object.hasOwnProperty.call(message, "activeId"))
                if (!$util.isString(message.activeId))
                    return "activeId: string expected";
            if (message.nextIndex != null && $Object.hasOwnProperty.call(message, "nextIndex"))
                if (!$util.isInteger(message.nextIndex))
                    return "nextIndex: integer expected";
            return null;
        };

        /**
         * Creates a TabsState message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.TabsState
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.TabsState} TabsState
         */
        TabsState.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.TabsState)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.TabsState: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.TabsState();
            if (object.tabs) {
                if (!$Array.isArray(object.tabs))
                    throw $TypeError(".cloudcli.TabsState.tabs: array expected");
                message.tabs = $Array(object.tabs.length);
                for (let i = 0; i < object.tabs.length; ++i) {
                    if (!$util.isObject(object.tabs[i]))
                        throw $TypeError(".cloudcli.TabsState.tabs: object expected");
                    message.tabs[i] = $root.cloudcli.Tab.fromObject(object.tabs[i], _depth + 1);
                }
            }
            if (object.activeId != null)
                if (typeof object.activeId !== "string" || object.activeId.length)
                    message.activeId = $String(object.activeId);
            if (object.nextIndex != null)
                if ($Number(object.nextIndex) !== 0)
                    message.nextIndex = object.nextIndex >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a TabsState message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.TabsState
         * @static
         * @param {cloudcli.TabsState} message TabsState
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TabsState.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.tabs = [];
            if (options.defaults) {
                object.activeId = "";
                object.nextIndex = 0;
            }
            if (message.tabs && message.tabs.length) {
                object.tabs = $Array(message.tabs.length);
                for (let j = 0; j < message.tabs.length; ++j)
                    object.tabs[j] = $root.cloudcli.Tab.toObject(message.tabs[j], options, _depth + 1);
            }
            if (message.activeId != null && $Object.hasOwnProperty.call(message, "activeId"))
                object.activeId = message.activeId;
            if (message.nextIndex != null && $Object.hasOwnProperty.call(message, "nextIndex"))
                object.nextIndex = message.nextIndex;
            return object;
        };

        /**
         * Converts this TabsState to JSON.
         * @function toJSON
         * @memberof cloudcli.TabsState
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TabsState.prototype.toJSON = function() {
            return TabsState.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TabsState
         * @function getTypeUrl
         * @memberof cloudcli.TabsState
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TabsState.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.TabsState";
        };

        return TabsState;
    })();

    cloudcli.TabsServerMessage = (function() {

        /**
         * Properties of a TabsServerMessage.
         * @typedef {Object} cloudcli.TabsServerMessage.$Properties
         * @property {cloudcli.TabsState.$Properties|null} [tabs] TabsServerMessage tabs
         * @property {cloudcli.ErrorMessage.$Properties|null} [error] TabsServerMessage error
         * @property {cloudcli.Pong.$Properties|null} [pong] TabsServerMessage pong
         * @property {"tabs"|"error"|"pong"} [body] TabsServerMessage body
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a TabsServerMessage.
         * @memberof cloudcli
         * @interface ITabsServerMessage
         * @augments cloudcli.TabsServerMessage.$Properties
         * @deprecated Use cloudcli.TabsServerMessage.$Properties instead.
         */

        /**
         * Narrowed shape of a TabsServerMessage.
         * @typedef {{
         *   tabs?: cloudcli.TabsState.$Shape|null;
         *   error?: cloudcli.ErrorMessage.$Shape|null;
         *   pong?: cloudcli.Pong.$Shape|null;
         *   $unknowns?: Array.<Uint8Array>;
         * } & (
         *   ({ body?: undefined; tabs?: null; error?: null; pong?: null }|{ body?: "tabs"; tabs: cloudcli.TabsState.$Shape; error?: null; pong?: null }|{ body?: "error"; tabs?: null; error: cloudcli.ErrorMessage.$Shape; pong?: null }|{ body?: "pong"; tabs?: null; error?: null; pong: cloudcli.Pong.$Shape })
         * )} cloudcli.TabsServerMessage.$Shape
         */

        /**
         * Constructs a new TabsServerMessage.
         * @memberof cloudcli
         * @classdesc Represents a TabsServerMessage.
         * @constructor
         * @param {cloudcli.TabsServerMessage.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const TabsServerMessage = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * TabsServerMessage tabs.
         * @member {cloudcli.TabsState.$Properties|null|undefined} tabs
         * @memberof cloudcli.TabsServerMessage
         * @instance
         */
        TabsServerMessage.prototype.tabs = null;

        /**
         * TabsServerMessage error.
         * @member {cloudcli.ErrorMessage.$Properties|null|undefined} error
         * @memberof cloudcli.TabsServerMessage
         * @instance
         */
        TabsServerMessage.prototype.error = null;

        /**
         * TabsServerMessage pong.
         * @member {cloudcli.Pong.$Properties|null|undefined} pong
         * @memberof cloudcli.TabsServerMessage
         * @instance
         */
        TabsServerMessage.prototype.pong = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * TabsServerMessage body.
         * @member {"tabs"|"error"|"pong"|undefined} body
         * @memberof cloudcli.TabsServerMessage
         * @instance
         */
        $Object.defineProperty(TabsServerMessage.prototype, "body", {
            get: $util.oneOfGetter($oneOfFields = ["tabs", "error", "pong"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new TabsServerMessage instance using the specified properties.
         * @function create
         * @memberof cloudcli.TabsServerMessage
         * @static
         * @param {cloudcli.TabsServerMessage.$Properties=} [properties] Properties to set
         * @returns {cloudcli.TabsServerMessage} TabsServerMessage instance
         * @type {{
         *   (properties: cloudcli.TabsServerMessage.$Shape): cloudcli.TabsServerMessage & cloudcli.TabsServerMessage.$Shape;
         *   (properties?: cloudcli.TabsServerMessage.$Properties): cloudcli.TabsServerMessage;
         * }}
         */
        TabsServerMessage.create = function(properties) {
            return new TabsServerMessage(properties);
        };

        /**
         * Encodes the specified TabsServerMessage message. Does not implicitly {@link cloudcli.TabsServerMessage.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.TabsServerMessage
         * @static
         * @param {cloudcli.TabsServerMessage.$Properties} message TabsServerMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TabsServerMessage.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.tabs != null && $Object.hasOwnProperty.call(message, "tabs"))
                $root.cloudcli.TabsState.encode(message.tabs, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                $root.cloudcli.ErrorMessage.encode(message.error, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.pong != null && $Object.hasOwnProperty.call(message, "pong"))
                $root.cloudcli.Pong.encode(message.pong, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified TabsServerMessage message, length delimited. Does not implicitly {@link cloudcli.TabsServerMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.TabsServerMessage
         * @static
         * @param {cloudcli.TabsServerMessage.$Properties} message TabsServerMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TabsServerMessage.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a TabsServerMessage message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.TabsServerMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.TabsServerMessage & cloudcli.TabsServerMessage.$Shape} TabsServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TabsServerMessage.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.TabsServerMessage();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.tabs = $root.cloudcli.TabsState.decode(reader, reader.uint32(), $undefined, _depth + 1, message.tabs);
                        message.body = "tabs";
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.error = $root.cloudcli.ErrorMessage.decode(reader, reader.uint32(), $undefined, _depth + 1, message.error);
                        message.body = "error";
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        message.pong = $root.cloudcli.Pong.decode(reader, reader.uint32(), $undefined, _depth + 1, message.pong);
                        message.body = "pong";
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a TabsServerMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.TabsServerMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.TabsServerMessage & cloudcli.TabsServerMessage.$Shape} TabsServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TabsServerMessage.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TabsServerMessage message.
         * @function verify
         * @memberof cloudcli.TabsServerMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TabsServerMessage.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.tabs != null && $Object.hasOwnProperty.call(message, "tabs")) {
                properties.body = 1;
                {
                    let error = $root.cloudcli.TabsState.verify(message.tabs, _depth + 1);
                    if (error)
                        return "tabs." + error;
                }
            }
            if (message.error != null && $Object.hasOwnProperty.call(message, "error")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.ErrorMessage.verify(message.error, _depth + 1);
                    if (error)
                        return "error." + error;
                }
            }
            if (message.pong != null && $Object.hasOwnProperty.call(message, "pong")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.Pong.verify(message.pong, _depth + 1);
                    if (error)
                        return "pong." + error;
                }
            }
            return null;
        };

        /**
         * Creates a TabsServerMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.TabsServerMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.TabsServerMessage} TabsServerMessage
         */
        TabsServerMessage.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.TabsServerMessage)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.TabsServerMessage: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.TabsServerMessage();
            if (object.tabs != null) {
                if (!$util.isObject(object.tabs))
                    throw $TypeError(".cloudcli.TabsServerMessage.tabs: object expected");
                message.tabs = $root.cloudcli.TabsState.fromObject(object.tabs, _depth + 1);
            }
            if (object.error != null) {
                if (!$util.isObject(object.error))
                    throw $TypeError(".cloudcli.TabsServerMessage.error: object expected");
                message.error = $root.cloudcli.ErrorMessage.fromObject(object.error, _depth + 1);
            }
            if (object.pong != null) {
                if (!$util.isObject(object.pong))
                    throw $TypeError(".cloudcli.TabsServerMessage.pong: object expected");
                message.pong = $root.cloudcli.Pong.fromObject(object.pong, _depth + 1);
            }
            return message;
        };

        /**
         * Creates a plain object from a TabsServerMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.TabsServerMessage
         * @static
         * @param {cloudcli.TabsServerMessage} message TabsServerMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TabsServerMessage.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (message.tabs != null && $Object.hasOwnProperty.call(message, "tabs")) {
                object.tabs = $root.cloudcli.TabsState.toObject(message.tabs, options, _depth + 1);
                if (options.oneofs)
                    object.body = "tabs";
            }
            if (message.error != null && $Object.hasOwnProperty.call(message, "error")) {
                object.error = $root.cloudcli.ErrorMessage.toObject(message.error, options, _depth + 1);
                if (options.oneofs)
                    object.body = "error";
            }
            if (message.pong != null && $Object.hasOwnProperty.call(message, "pong")) {
                object.pong = $root.cloudcli.Pong.toObject(message.pong, options, _depth + 1);
                if (options.oneofs)
                    object.body = "pong";
            }
            return object;
        };

        /**
         * Converts this TabsServerMessage to JSON.
         * @function toJSON
         * @memberof cloudcli.TabsServerMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TabsServerMessage.prototype.toJSON = function() {
            return TabsServerMessage.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for TabsServerMessage
         * @function getTypeUrl
         * @memberof cloudcli.TabsServerMessage
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        TabsServerMessage.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.TabsServerMessage";
        };

        return TabsServerMessage;
    })();

    cloudcli.AuthClientMessage = (function() {

        /**
         * Properties of an AuthClientMessage.
         * @typedef {Object} cloudcli.AuthClientMessage.$Properties
         * @property {cloudcli.Ping.$Properties|null} [ping] AuthClientMessage ping
         * @property {"ping"} [body] AuthClientMessage body
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of an AuthClientMessage.
         * @memberof cloudcli
         * @interface IAuthClientMessage
         * @augments cloudcli.AuthClientMessage.$Properties
         * @deprecated Use cloudcli.AuthClientMessage.$Properties instead.
         */

        /**
         * Narrowed shape of an AuthClientMessage.
         * @typedef {{
         *   ping?: cloudcli.Ping.$Shape|null;
         *   $unknowns?: Array.<Uint8Array>;
         * } & (
         *   ({ body?: undefined; ping?: null }|{ body?: "ping"; ping: cloudcli.Ping.$Shape })
         * )} cloudcli.AuthClientMessage.$Shape
         */

        /**
         * Constructs a new AuthClientMessage.
         * @memberof cloudcli
         * @classdesc Represents an AuthClientMessage.
         * @constructor
         * @param {cloudcli.AuthClientMessage.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const AuthClientMessage = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * AuthClientMessage ping.
         * @member {cloudcli.Ping.$Properties|null|undefined} ping
         * @memberof cloudcli.AuthClientMessage
         * @instance
         */
        AuthClientMessage.prototype.ping = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * AuthClientMessage body.
         * @member {"ping"|undefined} body
         * @memberof cloudcli.AuthClientMessage
         * @instance
         */
        $Object.defineProperty(AuthClientMessage.prototype, "body", {
            get: $util.oneOfGetter($oneOfFields = ["ping"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new AuthClientMessage instance using the specified properties.
         * @function create
         * @memberof cloudcli.AuthClientMessage
         * @static
         * @param {cloudcli.AuthClientMessage.$Properties=} [properties] Properties to set
         * @returns {cloudcli.AuthClientMessage} AuthClientMessage instance
         * @type {{
         *   (properties: cloudcli.AuthClientMessage.$Shape): cloudcli.AuthClientMessage & cloudcli.AuthClientMessage.$Shape;
         *   (properties?: cloudcli.AuthClientMessage.$Properties): cloudcli.AuthClientMessage;
         * }}
         */
        AuthClientMessage.create = function(properties) {
            return new AuthClientMessage(properties);
        };

        /**
         * Encodes the specified AuthClientMessage message. Does not implicitly {@link cloudcli.AuthClientMessage.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.AuthClientMessage
         * @static
         * @param {cloudcli.AuthClientMessage.$Properties} message AuthClientMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AuthClientMessage.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.ping != null && $Object.hasOwnProperty.call(message, "ping"))
                $root.cloudcli.Ping.encode(message.ping, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified AuthClientMessage message, length delimited. Does not implicitly {@link cloudcli.AuthClientMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.AuthClientMessage
         * @static
         * @param {cloudcli.AuthClientMessage.$Properties} message AuthClientMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AuthClientMessage.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes an AuthClientMessage message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.AuthClientMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.AuthClientMessage & cloudcli.AuthClientMessage.$Shape} AuthClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AuthClientMessage.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.AuthClientMessage();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.ping = $root.cloudcli.Ping.decode(reader, reader.uint32(), $undefined, _depth + 1, message.ping);
                        message.body = "ping";
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes an AuthClientMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.AuthClientMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.AuthClientMessage & cloudcli.AuthClientMessage.$Shape} AuthClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AuthClientMessage.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an AuthClientMessage message.
         * @function verify
         * @memberof cloudcli.AuthClientMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        AuthClientMessage.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.ping != null && $Object.hasOwnProperty.call(message, "ping")) {
                properties.body = 1;
                {
                    let error = $root.cloudcli.Ping.verify(message.ping, _depth + 1);
                    if (error)
                        return "ping." + error;
                }
            }
            return null;
        };

        /**
         * Creates an AuthClientMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.AuthClientMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.AuthClientMessage} AuthClientMessage
         */
        AuthClientMessage.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.AuthClientMessage)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.AuthClientMessage: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.AuthClientMessage();
            if (object.ping != null) {
                if (!$util.isObject(object.ping))
                    throw $TypeError(".cloudcli.AuthClientMessage.ping: object expected");
                message.ping = $root.cloudcli.Ping.fromObject(object.ping, _depth + 1);
            }
            return message;
        };

        /**
         * Creates a plain object from an AuthClientMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.AuthClientMessage
         * @static
         * @param {cloudcli.AuthClientMessage} message AuthClientMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AuthClientMessage.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (message.ping != null && $Object.hasOwnProperty.call(message, "ping")) {
                object.ping = $root.cloudcli.Ping.toObject(message.ping, options, _depth + 1);
                if (options.oneofs)
                    object.body = "ping";
            }
            return object;
        };

        /**
         * Converts this AuthClientMessage to JSON.
         * @function toJSON
         * @memberof cloudcli.AuthClientMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AuthClientMessage.prototype.toJSON = function() {
            return AuthClientMessage.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for AuthClientMessage
         * @function getTypeUrl
         * @memberof cloudcli.AuthClientMessage
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        AuthClientMessage.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.AuthClientMessage";
        };

        return AuthClientMessage;
    })();

    cloudcli.SessionActive = (function() {

        /**
         * Properties of a SessionActive.
         * @typedef {Object} cloudcli.SessionActive.$Properties
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a SessionActive.
         * @memberof cloudcli
         * @interface ISessionActive
         * @augments cloudcli.SessionActive.$Properties
         * @deprecated Use cloudcli.SessionActive.$Properties instead.
         */

        /**
         * Shape of a SessionActive.
         * @typedef {cloudcli.SessionActive.$Properties} cloudcli.SessionActive.$Shape
         */

        /**
         * Constructs a new SessionActive.
         * @memberof cloudcli
         * @classdesc Represents a SessionActive.
         * @constructor
         * @param {cloudcli.SessionActive.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const SessionActive = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * Creates a new SessionActive instance using the specified properties.
         * @function create
         * @memberof cloudcli.SessionActive
         * @static
         * @param {cloudcli.SessionActive.$Properties=} [properties] Properties to set
         * @returns {cloudcli.SessionActive} SessionActive instance
         * @type {{
         *   (properties: cloudcli.SessionActive.$Shape): cloudcli.SessionActive & cloudcli.SessionActive.$Shape;
         *   (properties?: cloudcli.SessionActive.$Properties): cloudcli.SessionActive;
         * }}
         */
        SessionActive.create = function(properties) {
            return new SessionActive(properties);
        };

        /**
         * Encodes the specified SessionActive message. Does not implicitly {@link cloudcli.SessionActive.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.SessionActive
         * @static
         * @param {cloudcli.SessionActive.$Properties} message SessionActive message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SessionActive.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified SessionActive message, length delimited. Does not implicitly {@link cloudcli.SessionActive.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.SessionActive
         * @static
         * @param {cloudcli.SessionActive.$Properties} message SessionActive message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SessionActive.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a SessionActive message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.SessionActive
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.SessionActive & cloudcli.SessionActive.$Shape} SessionActive
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SessionActive.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.SessionActive();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                reader.skipType(tag & 7, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a SessionActive message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.SessionActive
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.SessionActive & cloudcli.SessionActive.$Shape} SessionActive
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SessionActive.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SessionActive message.
         * @function verify
         * @memberof cloudcli.SessionActive
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SessionActive.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            return null;
        };

        /**
         * Creates a SessionActive message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.SessionActive
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.SessionActive} SessionActive
         */
        SessionActive.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.SessionActive)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.SessionActive: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            return new $root.cloudcli.SessionActive();
        };

        /**
         * Creates a plain object from a SessionActive message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.SessionActive
         * @static
         * @param {cloudcli.SessionActive} message SessionActive
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SessionActive.toObject = function () {
            return {};
        };

        /**
         * Converts this SessionActive to JSON.
         * @function toJSON
         * @memberof cloudcli.SessionActive
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SessionActive.prototype.toJSON = function() {
            return SessionActive.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for SessionActive
         * @function getTypeUrl
         * @memberof cloudcli.SessionActive
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        SessionActive.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.SessionActive";
        };

        return SessionActive;
    })();

    cloudcli.SessionInvalidated = (function() {

        /**
         * Properties of a SessionInvalidated.
         * @typedef {Object} cloudcli.SessionInvalidated.$Properties
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a SessionInvalidated.
         * @memberof cloudcli
         * @interface ISessionInvalidated
         * @augments cloudcli.SessionInvalidated.$Properties
         * @deprecated Use cloudcli.SessionInvalidated.$Properties instead.
         */

        /**
         * Shape of a SessionInvalidated.
         * @typedef {cloudcli.SessionInvalidated.$Properties} cloudcli.SessionInvalidated.$Shape
         */

        /**
         * Constructs a new SessionInvalidated.
         * @memberof cloudcli
         * @classdesc Represents a SessionInvalidated.
         * @constructor
         * @param {cloudcli.SessionInvalidated.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const SessionInvalidated = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * Creates a new SessionInvalidated instance using the specified properties.
         * @function create
         * @memberof cloudcli.SessionInvalidated
         * @static
         * @param {cloudcli.SessionInvalidated.$Properties=} [properties] Properties to set
         * @returns {cloudcli.SessionInvalidated} SessionInvalidated instance
         * @type {{
         *   (properties: cloudcli.SessionInvalidated.$Shape): cloudcli.SessionInvalidated & cloudcli.SessionInvalidated.$Shape;
         *   (properties?: cloudcli.SessionInvalidated.$Properties): cloudcli.SessionInvalidated;
         * }}
         */
        SessionInvalidated.create = function(properties) {
            return new SessionInvalidated(properties);
        };

        /**
         * Encodes the specified SessionInvalidated message. Does not implicitly {@link cloudcli.SessionInvalidated.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.SessionInvalidated
         * @static
         * @param {cloudcli.SessionInvalidated.$Properties} message SessionInvalidated message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SessionInvalidated.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified SessionInvalidated message, length delimited. Does not implicitly {@link cloudcli.SessionInvalidated.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.SessionInvalidated
         * @static
         * @param {cloudcli.SessionInvalidated.$Properties} message SessionInvalidated message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SessionInvalidated.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes a SessionInvalidated message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.SessionInvalidated
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.SessionInvalidated & cloudcli.SessionInvalidated.$Shape} SessionInvalidated
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SessionInvalidated.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.SessionInvalidated();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                reader.skipType(tag & 7, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a SessionInvalidated message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.SessionInvalidated
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.SessionInvalidated & cloudcli.SessionInvalidated.$Shape} SessionInvalidated
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SessionInvalidated.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SessionInvalidated message.
         * @function verify
         * @memberof cloudcli.SessionInvalidated
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SessionInvalidated.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            return null;
        };

        /**
         * Creates a SessionInvalidated message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.SessionInvalidated
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.SessionInvalidated} SessionInvalidated
         */
        SessionInvalidated.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.SessionInvalidated)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.SessionInvalidated: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            return new $root.cloudcli.SessionInvalidated();
        };

        /**
         * Creates a plain object from a SessionInvalidated message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.SessionInvalidated
         * @static
         * @param {cloudcli.SessionInvalidated} message SessionInvalidated
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SessionInvalidated.toObject = function () {
            return {};
        };

        /**
         * Converts this SessionInvalidated to JSON.
         * @function toJSON
         * @memberof cloudcli.SessionInvalidated
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SessionInvalidated.prototype.toJSON = function() {
            return SessionInvalidated.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for SessionInvalidated
         * @function getTypeUrl
         * @memberof cloudcli.SessionInvalidated
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        SessionInvalidated.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.SessionInvalidated";
        };

        return SessionInvalidated;
    })();

    cloudcli.AuthServerMessage = (function() {

        /**
         * Properties of an AuthServerMessage.
         * @typedef {Object} cloudcli.AuthServerMessage.$Properties
         * @property {cloudcli.SessionActive.$Properties|null} [sessionActive] AuthServerMessage sessionActive
         * @property {cloudcli.SessionInvalidated.$Properties|null} [sessionInvalidated] AuthServerMessage sessionInvalidated
         * @property {cloudcli.Pong.$Properties|null} [pong] AuthServerMessage pong
         * @property {"sessionActive"|"sessionInvalidated"|"pong"} [body] AuthServerMessage body
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of an AuthServerMessage.
         * @memberof cloudcli
         * @interface IAuthServerMessage
         * @augments cloudcli.AuthServerMessage.$Properties
         * @deprecated Use cloudcli.AuthServerMessage.$Properties instead.
         */

        /**
         * Narrowed shape of an AuthServerMessage.
         * @typedef {{
         *   sessionActive?: cloudcli.SessionActive.$Shape|null;
         *   sessionInvalidated?: cloudcli.SessionInvalidated.$Shape|null;
         *   pong?: cloudcli.Pong.$Shape|null;
         *   $unknowns?: Array.<Uint8Array>;
         * } & (
         *   ({ body?: undefined; sessionActive?: null; sessionInvalidated?: null; pong?: null }|{ body?: "sessionActive"; sessionActive: cloudcli.SessionActive.$Shape; sessionInvalidated?: null; pong?: null }|{ body?: "sessionInvalidated"; sessionActive?: null; sessionInvalidated: cloudcli.SessionInvalidated.$Shape; pong?: null }|{ body?: "pong"; sessionActive?: null; sessionInvalidated?: null; pong: cloudcli.Pong.$Shape })
         * )} cloudcli.AuthServerMessage.$Shape
         */

        /**
         * Constructs a new AuthServerMessage.
         * @memberof cloudcli
         * @classdesc Represents an AuthServerMessage.
         * @constructor
         * @param {cloudcli.AuthServerMessage.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const AuthServerMessage = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * AuthServerMessage sessionActive.
         * @member {cloudcli.SessionActive.$Properties|null|undefined} sessionActive
         * @memberof cloudcli.AuthServerMessage
         * @instance
         */
        AuthServerMessage.prototype.sessionActive = null;

        /**
         * AuthServerMessage sessionInvalidated.
         * @member {cloudcli.SessionInvalidated.$Properties|null|undefined} sessionInvalidated
         * @memberof cloudcli.AuthServerMessage
         * @instance
         */
        AuthServerMessage.prototype.sessionInvalidated = null;

        /**
         * AuthServerMessage pong.
         * @member {cloudcli.Pong.$Properties|null|undefined} pong
         * @memberof cloudcli.AuthServerMessage
         * @instance
         */
        AuthServerMessage.prototype.pong = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * AuthServerMessage body.
         * @member {"sessionActive"|"sessionInvalidated"|"pong"|undefined} body
         * @memberof cloudcli.AuthServerMessage
         * @instance
         */
        $Object.defineProperty(AuthServerMessage.prototype, "body", {
            get: $util.oneOfGetter($oneOfFields = ["sessionActive", "sessionInvalidated", "pong"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new AuthServerMessage instance using the specified properties.
         * @function create
         * @memberof cloudcli.AuthServerMessage
         * @static
         * @param {cloudcli.AuthServerMessage.$Properties=} [properties] Properties to set
         * @returns {cloudcli.AuthServerMessage} AuthServerMessage instance
         * @type {{
         *   (properties: cloudcli.AuthServerMessage.$Shape): cloudcli.AuthServerMessage & cloudcli.AuthServerMessage.$Shape;
         *   (properties?: cloudcli.AuthServerMessage.$Properties): cloudcli.AuthServerMessage;
         * }}
         */
        AuthServerMessage.create = function(properties) {
            return new AuthServerMessage(properties);
        };

        /**
         * Encodes the specified AuthServerMessage message. Does not implicitly {@link cloudcli.AuthServerMessage.verify|verify} messages.
         * @function encode
         * @memberof cloudcli.AuthServerMessage
         * @static
         * @param {cloudcli.AuthServerMessage.$Properties} message AuthServerMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AuthServerMessage.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.sessionActive != null && $Object.hasOwnProperty.call(message, "sessionActive"))
                $root.cloudcli.SessionActive.encode(message.sessionActive, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.sessionInvalidated != null && $Object.hasOwnProperty.call(message, "sessionInvalidated"))
                $root.cloudcli.SessionInvalidated.encode(message.sessionInvalidated, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.pong != null && $Object.hasOwnProperty.call(message, "pong"))
                $root.cloudcli.Pong.encode(message.pong, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified AuthServerMessage message, length delimited. Does not implicitly {@link cloudcli.AuthServerMessage.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cloudcli.AuthServerMessage
         * @static
         * @param {cloudcli.AuthServerMessage.$Properties} message AuthServerMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AuthServerMessage.encodeDelimited = function(message, writer) {
            return this.encode(message, writer && writer.len ? writer.fork() : writer).ldelim();
        };

        /**
         * Decodes an AuthServerMessage message from the specified reader or buffer.
         * @function decode
         * @memberof cloudcli.AuthServerMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cloudcli.AuthServerMessage & cloudcli.AuthServerMessage.$Shape} AuthServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AuthServerMessage.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end = length === $undefined ? reader.len : reader.pos + length, message = _target || new $root.cloudcli.AuthServerMessage();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.sessionActive = $root.cloudcli.SessionActive.decode(reader, reader.uint32(), $undefined, _depth + 1, message.sessionActive);
                        message.body = "sessionActive";
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.sessionInvalidated = $root.cloudcli.SessionInvalidated.decode(reader, reader.uint32(), $undefined, _depth + 1, message.sessionInvalidated);
                        message.body = "sessionInvalidated";
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        message.pong = $root.cloudcli.Pong.decode(reader, reader.uint32(), $undefined, _depth + 1, message.pong);
                        message.body = "pong";
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes an AuthServerMessage message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cloudcli.AuthServerMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cloudcli.AuthServerMessage & cloudcli.AuthServerMessage.$Shape} AuthServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AuthServerMessage.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an AuthServerMessage message.
         * @function verify
         * @memberof cloudcli.AuthServerMessage
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        AuthServerMessage.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.sessionActive != null && $Object.hasOwnProperty.call(message, "sessionActive")) {
                properties.body = 1;
                {
                    let error = $root.cloudcli.SessionActive.verify(message.sessionActive, _depth + 1);
                    if (error)
                        return "sessionActive." + error;
                }
            }
            if (message.sessionInvalidated != null && $Object.hasOwnProperty.call(message, "sessionInvalidated")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.SessionInvalidated.verify(message.sessionInvalidated, _depth + 1);
                    if (error)
                        return "sessionInvalidated." + error;
                }
            }
            if (message.pong != null && $Object.hasOwnProperty.call(message, "pong")) {
                if (properties.body === 1)
                    return "body: multiple values";
                properties.body = 1;
                {
                    let error = $root.cloudcli.Pong.verify(message.pong, _depth + 1);
                    if (error)
                        return "pong." + error;
                }
            }
            return null;
        };

        /**
         * Creates an AuthServerMessage message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cloudcli.AuthServerMessage
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cloudcli.AuthServerMessage} AuthServerMessage
         */
        AuthServerMessage.fromObject = function (object, _depth) {
            if (object instanceof $root.cloudcli.AuthServerMessage)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".cloudcli.AuthServerMessage: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.cloudcli.AuthServerMessage();
            if (object.sessionActive != null) {
                if (!$util.isObject(object.sessionActive))
                    throw $TypeError(".cloudcli.AuthServerMessage.sessionActive: object expected");
                message.sessionActive = $root.cloudcli.SessionActive.fromObject(object.sessionActive, _depth + 1);
            }
            if (object.sessionInvalidated != null) {
                if (!$util.isObject(object.sessionInvalidated))
                    throw $TypeError(".cloudcli.AuthServerMessage.sessionInvalidated: object expected");
                message.sessionInvalidated = $root.cloudcli.SessionInvalidated.fromObject(object.sessionInvalidated, _depth + 1);
            }
            if (object.pong != null) {
                if (!$util.isObject(object.pong))
                    throw $TypeError(".cloudcli.AuthServerMessage.pong: object expected");
                message.pong = $root.cloudcli.Pong.fromObject(object.pong, _depth + 1);
            }
            return message;
        };

        /**
         * Creates a plain object from an AuthServerMessage message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cloudcli.AuthServerMessage
         * @static
         * @param {cloudcli.AuthServerMessage} message AuthServerMessage
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AuthServerMessage.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (message.sessionActive != null && $Object.hasOwnProperty.call(message, "sessionActive")) {
                object.sessionActive = $root.cloudcli.SessionActive.toObject(message.sessionActive, options, _depth + 1);
                if (options.oneofs)
                    object.body = "sessionActive";
            }
            if (message.sessionInvalidated != null && $Object.hasOwnProperty.call(message, "sessionInvalidated")) {
                object.sessionInvalidated = $root.cloudcli.SessionInvalidated.toObject(message.sessionInvalidated, options, _depth + 1);
                if (options.oneofs)
                    object.body = "sessionInvalidated";
            }
            if (message.pong != null && $Object.hasOwnProperty.call(message, "pong")) {
                object.pong = $root.cloudcli.Pong.toObject(message.pong, options, _depth + 1);
                if (options.oneofs)
                    object.body = "pong";
            }
            return object;
        };

        /**
         * Converts this AuthServerMessage to JSON.
         * @function toJSON
         * @memberof cloudcli.AuthServerMessage
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AuthServerMessage.prototype.toJSON = function() {
            return AuthServerMessage.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for AuthServerMessage
         * @function getTypeUrl
         * @memberof cloudcli.AuthServerMessage
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        AuthServerMessage.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/cloudcli.AuthServerMessage";
        };

        return AuthServerMessage;
    })();

    return cloudcli;
})();

export {
  $root as default
};
