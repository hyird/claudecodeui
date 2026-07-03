import * as $protobuf from "protobufjs";
import Long = require("long");

/** Namespace cloudcli. */
export namespace cloudcli {

    /**
     * Properties of a Ping.
     * @deprecated Use cloudcli.Ping.$Properties instead.
     */
    interface IPing extends cloudcli.Ping.$Properties {
    }

    /** Represents a Ping. */
    class Ping {

        /**
         * Constructs a new Ping.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.Ping.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /**
         * Creates a new Ping instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Ping instance
         */
        static create(properties: cloudcli.Ping.$Shape): cloudcli.Ping & cloudcli.Ping.$Shape;
        static create(properties?: cloudcli.Ping.$Properties): cloudcli.Ping;

        /**
         * Encodes the specified Ping message. Does not implicitly {@link cloudcli.Ping.verify|verify} messages.
         * @param message Ping message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.Ping.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Ping message, length delimited. Does not implicitly {@link cloudcli.Ping.verify|verify} messages.
         * @param message Ping message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.Ping.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Ping message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.Ping & cloudcli.Ping.$Shape} Ping
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.Ping & cloudcli.Ping.$Shape;

        /**
         * Decodes a Ping message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.Ping & cloudcli.Ping.$Shape} Ping
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.Ping & cloudcli.Ping.$Shape;

        /**
         * Verifies a Ping message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Ping message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Ping
         */
        static fromObject(object: { [k: string]: any }): cloudcli.Ping;

        /**
         * Creates a plain object from a Ping message. Also converts values to other types if specified.
         * @param message Ping
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.Ping, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Ping to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for Ping
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace Ping {

        /** Properties of a Ping. */
        interface $Properties {

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a Ping. */
        type $Shape = cloudcli.Ping.$Properties;
    }

    /**
     * Properties of a Pong.
     * @deprecated Use cloudcli.Pong.$Properties instead.
     */
    interface IPong extends cloudcli.Pong.$Properties {
    }

    /** Represents a Pong. */
    class Pong {

        /**
         * Constructs a new Pong.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.Pong.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /**
         * Creates a new Pong instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Pong instance
         */
        static create(properties: cloudcli.Pong.$Shape): cloudcli.Pong & cloudcli.Pong.$Shape;
        static create(properties?: cloudcli.Pong.$Properties): cloudcli.Pong;

        /**
         * Encodes the specified Pong message. Does not implicitly {@link cloudcli.Pong.verify|verify} messages.
         * @param message Pong message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.Pong.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Pong message, length delimited. Does not implicitly {@link cloudcli.Pong.verify|verify} messages.
         * @param message Pong message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.Pong.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Pong message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.Pong & cloudcli.Pong.$Shape} Pong
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.Pong & cloudcli.Pong.$Shape;

        /**
         * Decodes a Pong message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.Pong & cloudcli.Pong.$Shape} Pong
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.Pong & cloudcli.Pong.$Shape;

        /**
         * Verifies a Pong message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Pong message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Pong
         */
        static fromObject(object: { [k: string]: any }): cloudcli.Pong;

        /**
         * Creates a plain object from a Pong message. Also converts values to other types if specified.
         * @param message Pong
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.Pong, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Pong to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for Pong
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace Pong {

        /** Properties of a Pong. */
        interface $Properties {

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a Pong. */
        type $Shape = cloudcli.Pong.$Properties;
    }

    /**
     * Properties of an ErrorMessage.
     * @deprecated Use cloudcli.ErrorMessage.$Properties instead.
     */
    interface IErrorMessage extends cloudcli.ErrorMessage.$Properties {
    }

    /** Represents an ErrorMessage. */
    class ErrorMessage {

        /**
         * Constructs a new ErrorMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.ErrorMessage.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** ErrorMessage message. */
        message: string;

        /**
         * Creates a new ErrorMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ErrorMessage instance
         */
        static create(properties: cloudcli.ErrorMessage.$Shape): cloudcli.ErrorMessage & cloudcli.ErrorMessage.$Shape;
        static create(properties?: cloudcli.ErrorMessage.$Properties): cloudcli.ErrorMessage;

        /**
         * Encodes the specified ErrorMessage message. Does not implicitly {@link cloudcli.ErrorMessage.verify|verify} messages.
         * @param message ErrorMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.ErrorMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ErrorMessage message, length delimited. Does not implicitly {@link cloudcli.ErrorMessage.verify|verify} messages.
         * @param message ErrorMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.ErrorMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an ErrorMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.ErrorMessage & cloudcli.ErrorMessage.$Shape} ErrorMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.ErrorMessage & cloudcli.ErrorMessage.$Shape;

        /**
         * Decodes an ErrorMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.ErrorMessage & cloudcli.ErrorMessage.$Shape} ErrorMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.ErrorMessage & cloudcli.ErrorMessage.$Shape;

        /**
         * Verifies an ErrorMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an ErrorMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ErrorMessage
         */
        static fromObject(object: { [k: string]: any }): cloudcli.ErrorMessage;

        /**
         * Creates a plain object from an ErrorMessage message. Also converts values to other types if specified.
         * @param message ErrorMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.ErrorMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ErrorMessage to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ErrorMessage
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace ErrorMessage {

        /** Properties of an ErrorMessage. */
        interface $Properties {

            /** ErrorMessage message */
            message?: (string|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of an ErrorMessage. */
        type $Shape = cloudcli.ErrorMessage.$Properties;
    }

    /**
     * Properties of a TerminalInit.
     * @deprecated Use cloudcli.TerminalInit.$Properties instead.
     */
    interface ITerminalInit extends cloudcli.TerminalInit.$Properties {
    }

    /** Represents a TerminalInit. */
    class TerminalInit {

        /**
         * Constructs a new TerminalInit.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.TerminalInit.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** TerminalInit sessionId. */
        sessionId: string;

        /** TerminalInit cols. */
        cols: number;

        /** TerminalInit rows. */
        rows: number;

        /** TerminalInit cwd. */
        cwd: string;

        /** TerminalInit forceRestart. */
        forceRestart: boolean;

        /** TerminalInit lastSeq. */
        lastSeq: number;

        /**
         * Creates a new TerminalInit instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TerminalInit instance
         */
        static create(properties: cloudcli.TerminalInit.$Shape): cloudcli.TerminalInit & cloudcli.TerminalInit.$Shape;
        static create(properties?: cloudcli.TerminalInit.$Properties): cloudcli.TerminalInit;

        /**
         * Encodes the specified TerminalInit message. Does not implicitly {@link cloudcli.TerminalInit.verify|verify} messages.
         * @param message TerminalInit message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalInit.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TerminalInit message, length delimited. Does not implicitly {@link cloudcli.TerminalInit.verify|verify} messages.
         * @param message TerminalInit message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.TerminalInit.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TerminalInit message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.TerminalInit & cloudcli.TerminalInit.$Shape} TerminalInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.TerminalInit & cloudcli.TerminalInit.$Shape;

        /**
         * Decodes a TerminalInit message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalInit & cloudcli.TerminalInit.$Shape} TerminalInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.TerminalInit & cloudcli.TerminalInit.$Shape;

        /**
         * Verifies a TerminalInit message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TerminalInit message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TerminalInit
         */
        static fromObject(object: { [k: string]: any }): cloudcli.TerminalInit;

        /**
         * Creates a plain object from a TerminalInit message. Also converts values to other types if specified.
         * @param message TerminalInit
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.TerminalInit, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TerminalInit to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for TerminalInit
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace TerminalInit {

        /** Properties of a TerminalInit. */
        interface $Properties {

            /** TerminalInit sessionId */
            sessionId?: (string|null);

            /** TerminalInit cols */
            cols?: (number|null);

            /** TerminalInit rows */
            rows?: (number|null);

            /** TerminalInit cwd */
            cwd?: (string|null);

            /** TerminalInit forceRestart */
            forceRestart?: (boolean|null);

            /** TerminalInit lastSeq */
            lastSeq?: (number|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a TerminalInit. */
        type $Shape = cloudcli.TerminalInit.$Properties;
    }

    /**
     * Properties of a TerminalInput.
     * @deprecated Use cloudcli.TerminalInput.$Properties instead.
     */
    interface ITerminalInput extends cloudcli.TerminalInput.$Properties {
    }

    /** Represents a TerminalInput. */
    class TerminalInput {

        /**
         * Constructs a new TerminalInput.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.TerminalInput.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** TerminalInput data. */
        data: string;

        /**
         * Creates a new TerminalInput instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TerminalInput instance
         */
        static create(properties: cloudcli.TerminalInput.$Shape): cloudcli.TerminalInput & cloudcli.TerminalInput.$Shape;
        static create(properties?: cloudcli.TerminalInput.$Properties): cloudcli.TerminalInput;

        /**
         * Encodes the specified TerminalInput message. Does not implicitly {@link cloudcli.TerminalInput.verify|verify} messages.
         * @param message TerminalInput message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalInput.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TerminalInput message, length delimited. Does not implicitly {@link cloudcli.TerminalInput.verify|verify} messages.
         * @param message TerminalInput message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.TerminalInput.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TerminalInput message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.TerminalInput & cloudcli.TerminalInput.$Shape} TerminalInput
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.TerminalInput & cloudcli.TerminalInput.$Shape;

        /**
         * Decodes a TerminalInput message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalInput & cloudcli.TerminalInput.$Shape} TerminalInput
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.TerminalInput & cloudcli.TerminalInput.$Shape;

        /**
         * Verifies a TerminalInput message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TerminalInput message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TerminalInput
         */
        static fromObject(object: { [k: string]: any }): cloudcli.TerminalInput;

        /**
         * Creates a plain object from a TerminalInput message. Also converts values to other types if specified.
         * @param message TerminalInput
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.TerminalInput, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TerminalInput to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for TerminalInput
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace TerminalInput {

        /** Properties of a TerminalInput. */
        interface $Properties {

            /** TerminalInput data */
            data?: (string|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a TerminalInput. */
        type $Shape = cloudcli.TerminalInput.$Properties;
    }

    /**
     * Properties of a TerminalResize.
     * @deprecated Use cloudcli.TerminalResize.$Properties instead.
     */
    interface ITerminalResize extends cloudcli.TerminalResize.$Properties {
    }

    /** Represents a TerminalResize. */
    class TerminalResize {

        /**
         * Constructs a new TerminalResize.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.TerminalResize.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** TerminalResize cols. */
        cols: number;

        /** TerminalResize rows. */
        rows: number;

        /**
         * Creates a new TerminalResize instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TerminalResize instance
         */
        static create(properties: cloudcli.TerminalResize.$Shape): cloudcli.TerminalResize & cloudcli.TerminalResize.$Shape;
        static create(properties?: cloudcli.TerminalResize.$Properties): cloudcli.TerminalResize;

        /**
         * Encodes the specified TerminalResize message. Does not implicitly {@link cloudcli.TerminalResize.verify|verify} messages.
         * @param message TerminalResize message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalResize.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TerminalResize message, length delimited. Does not implicitly {@link cloudcli.TerminalResize.verify|verify} messages.
         * @param message TerminalResize message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.TerminalResize.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TerminalResize message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.TerminalResize & cloudcli.TerminalResize.$Shape} TerminalResize
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.TerminalResize & cloudcli.TerminalResize.$Shape;

        /**
         * Decodes a TerminalResize message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalResize & cloudcli.TerminalResize.$Shape} TerminalResize
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.TerminalResize & cloudcli.TerminalResize.$Shape;

        /**
         * Verifies a TerminalResize message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TerminalResize message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TerminalResize
         */
        static fromObject(object: { [k: string]: any }): cloudcli.TerminalResize;

        /**
         * Creates a plain object from a TerminalResize message. Also converts values to other types if specified.
         * @param message TerminalResize
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.TerminalResize, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TerminalResize to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for TerminalResize
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace TerminalResize {

        /** Properties of a TerminalResize. */
        interface $Properties {

            /** TerminalResize cols */
            cols?: (number|null);

            /** TerminalResize rows */
            rows?: (number|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a TerminalResize. */
        type $Shape = cloudcli.TerminalResize.$Properties;
    }

    /**
     * Properties of a TerminalClose.
     * @deprecated Use cloudcli.TerminalClose.$Properties instead.
     */
    interface ITerminalClose extends cloudcli.TerminalClose.$Properties {
    }

    /** Represents a TerminalClose. */
    class TerminalClose {

        /**
         * Constructs a new TerminalClose.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.TerminalClose.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /**
         * Creates a new TerminalClose instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TerminalClose instance
         */
        static create(properties: cloudcli.TerminalClose.$Shape): cloudcli.TerminalClose & cloudcli.TerminalClose.$Shape;
        static create(properties?: cloudcli.TerminalClose.$Properties): cloudcli.TerminalClose;

        /**
         * Encodes the specified TerminalClose message. Does not implicitly {@link cloudcli.TerminalClose.verify|verify} messages.
         * @param message TerminalClose message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalClose.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TerminalClose message, length delimited. Does not implicitly {@link cloudcli.TerminalClose.verify|verify} messages.
         * @param message TerminalClose message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.TerminalClose.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TerminalClose message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.TerminalClose & cloudcli.TerminalClose.$Shape} TerminalClose
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.TerminalClose & cloudcli.TerminalClose.$Shape;

        /**
         * Decodes a TerminalClose message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalClose & cloudcli.TerminalClose.$Shape} TerminalClose
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.TerminalClose & cloudcli.TerminalClose.$Shape;

        /**
         * Verifies a TerminalClose message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TerminalClose message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TerminalClose
         */
        static fromObject(object: { [k: string]: any }): cloudcli.TerminalClose;

        /**
         * Creates a plain object from a TerminalClose message. Also converts values to other types if specified.
         * @param message TerminalClose
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.TerminalClose, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TerminalClose to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for TerminalClose
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace TerminalClose {

        /** Properties of a TerminalClose. */
        interface $Properties {

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a TerminalClose. */
        type $Shape = cloudcli.TerminalClose.$Properties;
    }

    /**
     * Properties of a TerminalClientMessage.
     * @deprecated Use cloudcli.TerminalClientMessage.$Properties instead.
     */
    interface ITerminalClientMessage extends cloudcli.TerminalClientMessage.$Properties {
    }

    /** Represents a TerminalClientMessage. */
    class TerminalClientMessage {

        /**
         * Constructs a new TerminalClientMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.TerminalClientMessage.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** TerminalClientMessage init. */
        init?: (cloudcli.TerminalInit.$Properties|null);

        /** TerminalClientMessage input. */
        input?: (cloudcli.TerminalInput.$Properties|null);

        /** TerminalClientMessage resize. */
        resize?: (cloudcli.TerminalResize.$Properties|null);

        /** TerminalClientMessage close. */
        close?: (cloudcli.TerminalClose.$Properties|null);

        /** TerminalClientMessage ping. */
        ping?: (cloudcli.Ping.$Properties|null);

        /** TerminalClientMessage body. */
        body?: ("init"|"input"|"resize"|"close"|"ping");

        /**
         * Creates a new TerminalClientMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TerminalClientMessage instance
         */
        static create(properties: cloudcli.TerminalClientMessage.$Shape): cloudcli.TerminalClientMessage & cloudcli.TerminalClientMessage.$Shape;
        static create(properties?: cloudcli.TerminalClientMessage.$Properties): cloudcli.TerminalClientMessage;

        /**
         * Encodes the specified TerminalClientMessage message. Does not implicitly {@link cloudcli.TerminalClientMessage.verify|verify} messages.
         * @param message TerminalClientMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalClientMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TerminalClientMessage message, length delimited. Does not implicitly {@link cloudcli.TerminalClientMessage.verify|verify} messages.
         * @param message TerminalClientMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.TerminalClientMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TerminalClientMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.TerminalClientMessage & cloudcli.TerminalClientMessage.$Shape} TerminalClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.TerminalClientMessage & cloudcli.TerminalClientMessage.$Shape;

        /**
         * Decodes a TerminalClientMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalClientMessage & cloudcli.TerminalClientMessage.$Shape} TerminalClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.TerminalClientMessage & cloudcli.TerminalClientMessage.$Shape;

        /**
         * Verifies a TerminalClientMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TerminalClientMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TerminalClientMessage
         */
        static fromObject(object: { [k: string]: any }): cloudcli.TerminalClientMessage;

        /**
         * Creates a plain object from a TerminalClientMessage message. Also converts values to other types if specified.
         * @param message TerminalClientMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.TerminalClientMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TerminalClientMessage to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for TerminalClientMessage
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace TerminalClientMessage {

        /** Properties of a TerminalClientMessage. */
        interface $Properties {

            /** TerminalClientMessage init */
            init?: (cloudcli.TerminalInit.$Properties|null);

            /** TerminalClientMessage input */
            input?: (cloudcli.TerminalInput.$Properties|null);

            /** TerminalClientMessage resize */
            resize?: (cloudcli.TerminalResize.$Properties|null);

            /** TerminalClientMessage close */
            close?: (cloudcli.TerminalClose.$Properties|null);

            /** TerminalClientMessage ping */
            ping?: (cloudcli.Ping.$Properties|null);

            /** TerminalClientMessage body */
            body?: ("init"|"input"|"resize"|"close"|"ping");

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Narrowed shape of a TerminalClientMessage. */
        type $Shape = {
          init?: cloudcli.TerminalInit.$Shape|null;
          input?: cloudcli.TerminalInput.$Shape|null;
          resize?: cloudcli.TerminalResize.$Shape|null;
          close?: cloudcli.TerminalClose.$Shape|null;
          ping?: cloudcli.Ping.$Shape|null;
          $unknowns?: Uint8Array[];
        } & (
          ({ body?: undefined; init?: null; input?: null; resize?: null; close?: null; ping?: null }|{ body?: "init"; init: cloudcli.TerminalInit.$Shape; input?: null; resize?: null; close?: null; ping?: null }|{ body?: "input"; init?: null; input: cloudcli.TerminalInput.$Shape; resize?: null; close?: null; ping?: null }|{ body?: "resize"; init?: null; input?: null; resize: cloudcli.TerminalResize.$Shape; close?: null; ping?: null }|{ body?: "close"; init?: null; input?: null; resize?: null; close: cloudcli.TerminalClose.$Shape; ping?: null }|{ body?: "ping"; init?: null; input?: null; resize?: null; close?: null; ping: cloudcli.Ping.$Shape })
        );
    }

    /**
     * Properties of a TerminalReady.
     * @deprecated Use cloudcli.TerminalReady.$Properties instead.
     */
    interface ITerminalReady extends cloudcli.TerminalReady.$Properties {
    }

    /** Represents a TerminalReady. */
    class TerminalReady {

        /**
         * Constructs a new TerminalReady.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.TerminalReady.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** TerminalReady cwd. */
        cwd: string;

        /** TerminalReady sessionId. */
        sessionId: string;

        /** TerminalReady reset. */
        reset: boolean;

        /** TerminalReady gap. */
        gap: boolean;

        /** TerminalReady lastSeq. */
        lastSeq: number;

        /**
         * Creates a new TerminalReady instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TerminalReady instance
         */
        static create(properties: cloudcli.TerminalReady.$Shape): cloudcli.TerminalReady & cloudcli.TerminalReady.$Shape;
        static create(properties?: cloudcli.TerminalReady.$Properties): cloudcli.TerminalReady;

        /**
         * Encodes the specified TerminalReady message. Does not implicitly {@link cloudcli.TerminalReady.verify|verify} messages.
         * @param message TerminalReady message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalReady.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TerminalReady message, length delimited. Does not implicitly {@link cloudcli.TerminalReady.verify|verify} messages.
         * @param message TerminalReady message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.TerminalReady.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TerminalReady message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.TerminalReady & cloudcli.TerminalReady.$Shape} TerminalReady
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.TerminalReady & cloudcli.TerminalReady.$Shape;

        /**
         * Decodes a TerminalReady message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalReady & cloudcli.TerminalReady.$Shape} TerminalReady
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.TerminalReady & cloudcli.TerminalReady.$Shape;

        /**
         * Verifies a TerminalReady message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TerminalReady message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TerminalReady
         */
        static fromObject(object: { [k: string]: any }): cloudcli.TerminalReady;

        /**
         * Creates a plain object from a TerminalReady message. Also converts values to other types if specified.
         * @param message TerminalReady
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.TerminalReady, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TerminalReady to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for TerminalReady
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace TerminalReady {

        /** Properties of a TerminalReady. */
        interface $Properties {

            /** TerminalReady cwd */
            cwd?: (string|null);

            /** TerminalReady sessionId */
            sessionId?: (string|null);

            /** TerminalReady reset */
            reset?: (boolean|null);

            /** TerminalReady gap */
            gap?: (boolean|null);

            /** TerminalReady lastSeq */
            lastSeq?: (number|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a TerminalReady. */
        type $Shape = cloudcli.TerminalReady.$Properties;
    }

    /**
     * Properties of a TerminalOutput.
     * @deprecated Use cloudcli.TerminalOutput.$Properties instead.
     */
    interface ITerminalOutput extends cloudcli.TerminalOutput.$Properties {
    }

    /** Represents a TerminalOutput. */
    class TerminalOutput {

        /**
         * Constructs a new TerminalOutput.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.TerminalOutput.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** TerminalOutput data. */
        data: Uint8Array;

        /** TerminalOutput compressed. */
        compressed: boolean;

        /**
         * Creates a new TerminalOutput instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TerminalOutput instance
         */
        static create(properties: cloudcli.TerminalOutput.$Shape): cloudcli.TerminalOutput & cloudcli.TerminalOutput.$Shape;
        static create(properties?: cloudcli.TerminalOutput.$Properties): cloudcli.TerminalOutput;

        /**
         * Encodes the specified TerminalOutput message. Does not implicitly {@link cloudcli.TerminalOutput.verify|verify} messages.
         * @param message TerminalOutput message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalOutput.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TerminalOutput message, length delimited. Does not implicitly {@link cloudcli.TerminalOutput.verify|verify} messages.
         * @param message TerminalOutput message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.TerminalOutput.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TerminalOutput message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.TerminalOutput & cloudcli.TerminalOutput.$Shape} TerminalOutput
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.TerminalOutput & cloudcli.TerminalOutput.$Shape;

        /**
         * Decodes a TerminalOutput message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalOutput & cloudcli.TerminalOutput.$Shape} TerminalOutput
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.TerminalOutput & cloudcli.TerminalOutput.$Shape;

        /**
         * Verifies a TerminalOutput message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TerminalOutput message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TerminalOutput
         */
        static fromObject(object: { [k: string]: any }): cloudcli.TerminalOutput;

        /**
         * Creates a plain object from a TerminalOutput message. Also converts values to other types if specified.
         * @param message TerminalOutput
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.TerminalOutput, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TerminalOutput to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for TerminalOutput
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace TerminalOutput {

        /** Properties of a TerminalOutput. */
        interface $Properties {

            /** TerminalOutput data */
            data?: (Uint8Array|null);

            /** TerminalOutput compressed */
            compressed?: (boolean|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a TerminalOutput. */
        type $Shape = cloudcli.TerminalOutput.$Properties;
    }

    /**
     * Properties of a TerminalExit.
     * @deprecated Use cloudcli.TerminalExit.$Properties instead.
     */
    interface ITerminalExit extends cloudcli.TerminalExit.$Properties {
    }

    /** Represents a TerminalExit. */
    class TerminalExit {

        /**
         * Constructs a new TerminalExit.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.TerminalExit.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** TerminalExit exitCode. */
        exitCode: number;

        /** TerminalExit signal. */
        signal: string;

        /**
         * Creates a new TerminalExit instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TerminalExit instance
         */
        static create(properties: cloudcli.TerminalExit.$Shape): cloudcli.TerminalExit & cloudcli.TerminalExit.$Shape;
        static create(properties?: cloudcli.TerminalExit.$Properties): cloudcli.TerminalExit;

        /**
         * Encodes the specified TerminalExit message. Does not implicitly {@link cloudcli.TerminalExit.verify|verify} messages.
         * @param message TerminalExit message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalExit.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TerminalExit message, length delimited. Does not implicitly {@link cloudcli.TerminalExit.verify|verify} messages.
         * @param message TerminalExit message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.TerminalExit.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TerminalExit message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.TerminalExit & cloudcli.TerminalExit.$Shape} TerminalExit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.TerminalExit & cloudcli.TerminalExit.$Shape;

        /**
         * Decodes a TerminalExit message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalExit & cloudcli.TerminalExit.$Shape} TerminalExit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.TerminalExit & cloudcli.TerminalExit.$Shape;

        /**
         * Verifies a TerminalExit message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TerminalExit message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TerminalExit
         */
        static fromObject(object: { [k: string]: any }): cloudcli.TerminalExit;

        /**
         * Creates a plain object from a TerminalExit message. Also converts values to other types if specified.
         * @param message TerminalExit
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.TerminalExit, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TerminalExit to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for TerminalExit
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace TerminalExit {

        /** Properties of a TerminalExit. */
        interface $Properties {

            /** TerminalExit exitCode */
            exitCode?: (number|null);

            /** TerminalExit signal */
            signal?: (string|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a TerminalExit. */
        type $Shape = cloudcli.TerminalExit.$Properties;
    }

    /**
     * Properties of a TerminalServerMessage.
     * @deprecated Use cloudcli.TerminalServerMessage.$Properties instead.
     */
    interface ITerminalServerMessage extends cloudcli.TerminalServerMessage.$Properties {
    }

    /** Represents a TerminalServerMessage. */
    class TerminalServerMessage {

        /**
         * Constructs a new TerminalServerMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.TerminalServerMessage.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** TerminalServerMessage ready. */
        ready?: (cloudcli.TerminalReady.$Properties|null);

        /** TerminalServerMessage output. */
        output?: (cloudcli.TerminalOutput.$Properties|null);

        /** TerminalServerMessage exit. */
        exit?: (cloudcli.TerminalExit.$Properties|null);

        /** TerminalServerMessage error. */
        error?: (cloudcli.ErrorMessage.$Properties|null);

        /** TerminalServerMessage pong. */
        pong?: (cloudcli.Pong.$Properties|null);

        /** TerminalServerMessage seq. */
        seq: number;

        /** TerminalServerMessage body. */
        body?: ("ready"|"output"|"exit"|"error"|"pong");

        /**
         * Creates a new TerminalServerMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TerminalServerMessage instance
         */
        static create(properties: cloudcli.TerminalServerMessage.$Shape): cloudcli.TerminalServerMessage & cloudcli.TerminalServerMessage.$Shape;
        static create(properties?: cloudcli.TerminalServerMessage.$Properties): cloudcli.TerminalServerMessage;

        /**
         * Encodes the specified TerminalServerMessage message. Does not implicitly {@link cloudcli.TerminalServerMessage.verify|verify} messages.
         * @param message TerminalServerMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalServerMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TerminalServerMessage message, length delimited. Does not implicitly {@link cloudcli.TerminalServerMessage.verify|verify} messages.
         * @param message TerminalServerMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.TerminalServerMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TerminalServerMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.TerminalServerMessage & cloudcli.TerminalServerMessage.$Shape} TerminalServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.TerminalServerMessage & cloudcli.TerminalServerMessage.$Shape;

        /**
         * Decodes a TerminalServerMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.TerminalServerMessage & cloudcli.TerminalServerMessage.$Shape} TerminalServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.TerminalServerMessage & cloudcli.TerminalServerMessage.$Shape;

        /**
         * Verifies a TerminalServerMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TerminalServerMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TerminalServerMessage
         */
        static fromObject(object: { [k: string]: any }): cloudcli.TerminalServerMessage;

        /**
         * Creates a plain object from a TerminalServerMessage message. Also converts values to other types if specified.
         * @param message TerminalServerMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.TerminalServerMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TerminalServerMessage to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for TerminalServerMessage
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace TerminalServerMessage {

        /** Properties of a TerminalServerMessage. */
        interface $Properties {

            /** TerminalServerMessage ready */
            ready?: (cloudcli.TerminalReady.$Properties|null);

            /** TerminalServerMessage output */
            output?: (cloudcli.TerminalOutput.$Properties|null);

            /** TerminalServerMessage exit */
            exit?: (cloudcli.TerminalExit.$Properties|null);

            /** TerminalServerMessage error */
            error?: (cloudcli.ErrorMessage.$Properties|null);

            /** TerminalServerMessage pong */
            pong?: (cloudcli.Pong.$Properties|null);

            /** TerminalServerMessage seq */
            seq?: (number|null);

            /** TerminalServerMessage body */
            body?: ("ready"|"output"|"exit"|"error"|"pong");

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Narrowed shape of a TerminalServerMessage. */
        type $Shape = {
          ready?: cloudcli.TerminalReady.$Shape|null;
          output?: cloudcli.TerminalOutput.$Shape|null;
          exit?: cloudcli.TerminalExit.$Shape|null;
          error?: cloudcli.ErrorMessage.$Shape|null;
          pong?: cloudcli.Pong.$Shape|null;
          seq?: number|null;
          $unknowns?: Uint8Array[];
        } & (
          ({ body?: undefined; ready?: null; output?: null; exit?: null; error?: null; pong?: null }|{ body?: "ready"; ready: cloudcli.TerminalReady.$Shape; output?: null; exit?: null; error?: null; pong?: null }|{ body?: "output"; ready?: null; output: cloudcli.TerminalOutput.$Shape; exit?: null; error?: null; pong?: null }|{ body?: "exit"; ready?: null; output?: null; exit: cloudcli.TerminalExit.$Shape; error?: null; pong?: null }|{ body?: "error"; ready?: null; output?: null; exit?: null; error: cloudcli.ErrorMessage.$Shape; pong?: null }|{ body?: "pong"; ready?: null; output?: null; exit?: null; error?: null; pong: cloudcli.Pong.$Shape })
        );
    }

    /**
     * Properties of an AddTab.
     * @deprecated Use cloudcli.AddTab.$Properties instead.
     */
    interface IAddTab extends cloudcli.AddTab.$Properties {
    }

    /** Represents an AddTab. */
    class AddTab {

        /**
         * Constructs a new AddTab.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.AddTab.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /**
         * Creates a new AddTab instance using the specified properties.
         * @param [properties] Properties to set
         * @returns AddTab instance
         */
        static create(properties: cloudcli.AddTab.$Shape): cloudcli.AddTab & cloudcli.AddTab.$Shape;
        static create(properties?: cloudcli.AddTab.$Properties): cloudcli.AddTab;

        /**
         * Encodes the specified AddTab message. Does not implicitly {@link cloudcli.AddTab.verify|verify} messages.
         * @param message AddTab message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.AddTab.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified AddTab message, length delimited. Does not implicitly {@link cloudcli.AddTab.verify|verify} messages.
         * @param message AddTab message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.AddTab.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an AddTab message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.AddTab & cloudcli.AddTab.$Shape} AddTab
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.AddTab & cloudcli.AddTab.$Shape;

        /**
         * Decodes an AddTab message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.AddTab & cloudcli.AddTab.$Shape} AddTab
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.AddTab & cloudcli.AddTab.$Shape;

        /**
         * Verifies an AddTab message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an AddTab message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns AddTab
         */
        static fromObject(object: { [k: string]: any }): cloudcli.AddTab;

        /**
         * Creates a plain object from an AddTab message. Also converts values to other types if specified.
         * @param message AddTab
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.AddTab, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this AddTab to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for AddTab
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace AddTab {

        /** Properties of an AddTab. */
        interface $Properties {

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of an AddTab. */
        type $Shape = cloudcli.AddTab.$Properties;
    }

    /**
     * Properties of a SetActive.
     * @deprecated Use cloudcli.SetActive.$Properties instead.
     */
    interface ISetActive extends cloudcli.SetActive.$Properties {
    }

    /** Represents a SetActive. */
    class SetActive {

        /**
         * Constructs a new SetActive.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.SetActive.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** SetActive activeId. */
        activeId: string;

        /**
         * Creates a new SetActive instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SetActive instance
         */
        static create(properties: cloudcli.SetActive.$Shape): cloudcli.SetActive & cloudcli.SetActive.$Shape;
        static create(properties?: cloudcli.SetActive.$Properties): cloudcli.SetActive;

        /**
         * Encodes the specified SetActive message. Does not implicitly {@link cloudcli.SetActive.verify|verify} messages.
         * @param message SetActive message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.SetActive.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SetActive message, length delimited. Does not implicitly {@link cloudcli.SetActive.verify|verify} messages.
         * @param message SetActive message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.SetActive.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SetActive message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.SetActive & cloudcli.SetActive.$Shape} SetActive
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.SetActive & cloudcli.SetActive.$Shape;

        /**
         * Decodes a SetActive message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.SetActive & cloudcli.SetActive.$Shape} SetActive
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.SetActive & cloudcli.SetActive.$Shape;

        /**
         * Verifies a SetActive message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SetActive message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SetActive
         */
        static fromObject(object: { [k: string]: any }): cloudcli.SetActive;

        /**
         * Creates a plain object from a SetActive message. Also converts values to other types if specified.
         * @param message SetActive
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.SetActive, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SetActive to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for SetActive
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace SetActive {

        /** Properties of a SetActive. */
        interface $Properties {

            /** SetActive activeId */
            activeId?: (string|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a SetActive. */
        type $Shape = cloudcli.SetActive.$Properties;
    }

    /**
     * Properties of an UpdateTitle.
     * @deprecated Use cloudcli.UpdateTitle.$Properties instead.
     */
    interface IUpdateTitle extends cloudcli.UpdateTitle.$Properties {
    }

    /** Represents an UpdateTitle. */
    class UpdateTitle {

        /**
         * Constructs a new UpdateTitle.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.UpdateTitle.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** UpdateTitle tabId. */
        tabId: string;

        /** UpdateTitle title. */
        title: string;

        /**
         * Creates a new UpdateTitle instance using the specified properties.
         * @param [properties] Properties to set
         * @returns UpdateTitle instance
         */
        static create(properties: cloudcli.UpdateTitle.$Shape): cloudcli.UpdateTitle & cloudcli.UpdateTitle.$Shape;
        static create(properties?: cloudcli.UpdateTitle.$Properties): cloudcli.UpdateTitle;

        /**
         * Encodes the specified UpdateTitle message. Does not implicitly {@link cloudcli.UpdateTitle.verify|verify} messages.
         * @param message UpdateTitle message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.UpdateTitle.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified UpdateTitle message, length delimited. Does not implicitly {@link cloudcli.UpdateTitle.verify|verify} messages.
         * @param message UpdateTitle message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.UpdateTitle.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an UpdateTitle message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.UpdateTitle & cloudcli.UpdateTitle.$Shape} UpdateTitle
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.UpdateTitle & cloudcli.UpdateTitle.$Shape;

        /**
         * Decodes an UpdateTitle message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.UpdateTitle & cloudcli.UpdateTitle.$Shape} UpdateTitle
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.UpdateTitle & cloudcli.UpdateTitle.$Shape;

        /**
         * Verifies an UpdateTitle message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an UpdateTitle message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns UpdateTitle
         */
        static fromObject(object: { [k: string]: any }): cloudcli.UpdateTitle;

        /**
         * Creates a plain object from an UpdateTitle message. Also converts values to other types if specified.
         * @param message UpdateTitle
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.UpdateTitle, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this UpdateTitle to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for UpdateTitle
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace UpdateTitle {

        /** Properties of an UpdateTitle. */
        interface $Properties {

            /** UpdateTitle tabId */
            tabId?: (string|null);

            /** UpdateTitle title */
            title?: (string|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of an UpdateTitle. */
        type $Shape = cloudcli.UpdateTitle.$Properties;
    }

    /**
     * Properties of a RestartTab.
     * @deprecated Use cloudcli.RestartTab.$Properties instead.
     */
    interface IRestartTab extends cloudcli.RestartTab.$Properties {
    }

    /** Represents a RestartTab. */
    class RestartTab {

        /**
         * Constructs a new RestartTab.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.RestartTab.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** RestartTab tabId. */
        tabId: string;

        /**
         * Creates a new RestartTab instance using the specified properties.
         * @param [properties] Properties to set
         * @returns RestartTab instance
         */
        static create(properties: cloudcli.RestartTab.$Shape): cloudcli.RestartTab & cloudcli.RestartTab.$Shape;
        static create(properties?: cloudcli.RestartTab.$Properties): cloudcli.RestartTab;

        /**
         * Encodes the specified RestartTab message. Does not implicitly {@link cloudcli.RestartTab.verify|verify} messages.
         * @param message RestartTab message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.RestartTab.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified RestartTab message, length delimited. Does not implicitly {@link cloudcli.RestartTab.verify|verify} messages.
         * @param message RestartTab message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.RestartTab.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a RestartTab message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.RestartTab & cloudcli.RestartTab.$Shape} RestartTab
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.RestartTab & cloudcli.RestartTab.$Shape;

        /**
         * Decodes a RestartTab message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.RestartTab & cloudcli.RestartTab.$Shape} RestartTab
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.RestartTab & cloudcli.RestartTab.$Shape;

        /**
         * Verifies a RestartTab message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a RestartTab message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns RestartTab
         */
        static fromObject(object: { [k: string]: any }): cloudcli.RestartTab;

        /**
         * Creates a plain object from a RestartTab message. Also converts values to other types if specified.
         * @param message RestartTab
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.RestartTab, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this RestartTab to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for RestartTab
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace RestartTab {

        /** Properties of a RestartTab. */
        interface $Properties {

            /** RestartTab tabId */
            tabId?: (string|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a RestartTab. */
        type $Shape = cloudcli.RestartTab.$Properties;
    }

    /**
     * Properties of a CloseTab.
     * @deprecated Use cloudcli.CloseTab.$Properties instead.
     */
    interface ICloseTab extends cloudcli.CloseTab.$Properties {
    }

    /** Represents a CloseTab. */
    class CloseTab {

        /**
         * Constructs a new CloseTab.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.CloseTab.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** CloseTab tabId. */
        tabId: string;

        /**
         * Creates a new CloseTab instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CloseTab instance
         */
        static create(properties: cloudcli.CloseTab.$Shape): cloudcli.CloseTab & cloudcli.CloseTab.$Shape;
        static create(properties?: cloudcli.CloseTab.$Properties): cloudcli.CloseTab;

        /**
         * Encodes the specified CloseTab message. Does not implicitly {@link cloudcli.CloseTab.verify|verify} messages.
         * @param message CloseTab message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.CloseTab.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CloseTab message, length delimited. Does not implicitly {@link cloudcli.CloseTab.verify|verify} messages.
         * @param message CloseTab message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.CloseTab.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CloseTab message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.CloseTab & cloudcli.CloseTab.$Shape} CloseTab
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.CloseTab & cloudcli.CloseTab.$Shape;

        /**
         * Decodes a CloseTab message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.CloseTab & cloudcli.CloseTab.$Shape} CloseTab
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.CloseTab & cloudcli.CloseTab.$Shape;

        /**
         * Verifies a CloseTab message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CloseTab message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CloseTab
         */
        static fromObject(object: { [k: string]: any }): cloudcli.CloseTab;

        /**
         * Creates a plain object from a CloseTab message. Also converts values to other types if specified.
         * @param message CloseTab
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.CloseTab, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CloseTab to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for CloseTab
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace CloseTab {

        /** Properties of a CloseTab. */
        interface $Properties {

            /** CloseTab tabId */
            tabId?: (string|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a CloseTab. */
        type $Shape = cloudcli.CloseTab.$Properties;
    }

    /**
     * Properties of a TabsClientMessage.
     * @deprecated Use cloudcli.TabsClientMessage.$Properties instead.
     */
    interface ITabsClientMessage extends cloudcli.TabsClientMessage.$Properties {
    }

    /** Represents a TabsClientMessage. */
    class TabsClientMessage {

        /**
         * Constructs a new TabsClientMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.TabsClientMessage.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** TabsClientMessage ping. */
        ping?: (cloudcli.Ping.$Properties|null);

        /** TabsClientMessage addTab. */
        addTab?: (cloudcli.AddTab.$Properties|null);

        /** TabsClientMessage setActive. */
        setActive?: (cloudcli.SetActive.$Properties|null);

        /** TabsClientMessage updateTitle. */
        updateTitle?: (cloudcli.UpdateTitle.$Properties|null);

        /** TabsClientMessage restartTab. */
        restartTab?: (cloudcli.RestartTab.$Properties|null);

        /** TabsClientMessage closeTab. */
        closeTab?: (cloudcli.CloseTab.$Properties|null);

        /** TabsClientMessage body. */
        body?: ("ping"|"addTab"|"setActive"|"updateTitle"|"restartTab"|"closeTab");

        /**
         * Creates a new TabsClientMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TabsClientMessage instance
         */
        static create(properties: cloudcli.TabsClientMessage.$Shape): cloudcli.TabsClientMessage & cloudcli.TabsClientMessage.$Shape;
        static create(properties?: cloudcli.TabsClientMessage.$Properties): cloudcli.TabsClientMessage;

        /**
         * Encodes the specified TabsClientMessage message. Does not implicitly {@link cloudcli.TabsClientMessage.verify|verify} messages.
         * @param message TabsClientMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TabsClientMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TabsClientMessage message, length delimited. Does not implicitly {@link cloudcli.TabsClientMessage.verify|verify} messages.
         * @param message TabsClientMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.TabsClientMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TabsClientMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.TabsClientMessage & cloudcli.TabsClientMessage.$Shape} TabsClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.TabsClientMessage & cloudcli.TabsClientMessage.$Shape;

        /**
         * Decodes a TabsClientMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.TabsClientMessage & cloudcli.TabsClientMessage.$Shape} TabsClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.TabsClientMessage & cloudcli.TabsClientMessage.$Shape;

        /**
         * Verifies a TabsClientMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TabsClientMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TabsClientMessage
         */
        static fromObject(object: { [k: string]: any }): cloudcli.TabsClientMessage;

        /**
         * Creates a plain object from a TabsClientMessage message. Also converts values to other types if specified.
         * @param message TabsClientMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.TabsClientMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TabsClientMessage to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for TabsClientMessage
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace TabsClientMessage {

        /** Properties of a TabsClientMessage. */
        interface $Properties {

            /** TabsClientMessage ping */
            ping?: (cloudcli.Ping.$Properties|null);

            /** TabsClientMessage addTab */
            addTab?: (cloudcli.AddTab.$Properties|null);

            /** TabsClientMessage setActive */
            setActive?: (cloudcli.SetActive.$Properties|null);

            /** TabsClientMessage updateTitle */
            updateTitle?: (cloudcli.UpdateTitle.$Properties|null);

            /** TabsClientMessage restartTab */
            restartTab?: (cloudcli.RestartTab.$Properties|null);

            /** TabsClientMessage closeTab */
            closeTab?: (cloudcli.CloseTab.$Properties|null);

            /** TabsClientMessage body */
            body?: ("ping"|"addTab"|"setActive"|"updateTitle"|"restartTab"|"closeTab");

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Narrowed shape of a TabsClientMessage. */
        type $Shape = {
          ping?: cloudcli.Ping.$Shape|null;
          addTab?: cloudcli.AddTab.$Shape|null;
          setActive?: cloudcli.SetActive.$Shape|null;
          updateTitle?: cloudcli.UpdateTitle.$Shape|null;
          restartTab?: cloudcli.RestartTab.$Shape|null;
          closeTab?: cloudcli.CloseTab.$Shape|null;
          $unknowns?: Uint8Array[];
        } & (
          ({ body?: undefined; ping?: null; addTab?: null; setActive?: null; updateTitle?: null; restartTab?: null; closeTab?: null }|{ body?: "ping"; ping: cloudcli.Ping.$Shape; addTab?: null; setActive?: null; updateTitle?: null; restartTab?: null; closeTab?: null }|{ body?: "addTab"; ping?: null; addTab: cloudcli.AddTab.$Shape; setActive?: null; updateTitle?: null; restartTab?: null; closeTab?: null }|{ body?: "setActive"; ping?: null; addTab?: null; setActive: cloudcli.SetActive.$Shape; updateTitle?: null; restartTab?: null; closeTab?: null }|{ body?: "updateTitle"; ping?: null; addTab?: null; setActive?: null; updateTitle: cloudcli.UpdateTitle.$Shape; restartTab?: null; closeTab?: null }|{ body?: "restartTab"; ping?: null; addTab?: null; setActive?: null; updateTitle?: null; restartTab: cloudcli.RestartTab.$Shape; closeTab?: null }|{ body?: "closeTab"; ping?: null; addTab?: null; setActive?: null; updateTitle?: null; restartTab?: null; closeTab: cloudcli.CloseTab.$Shape })
        );
    }

    /**
     * Properties of a Tab.
     * @deprecated Use cloudcli.Tab.$Properties instead.
     */
    interface ITab extends cloudcli.Tab.$Properties {
    }

    /** Represents a Tab. */
    class Tab {

        /**
         * Constructs a new Tab.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.Tab.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** Tab id. */
        id: string;

        /** Tab title. */
        title: string;

        /** Tab status. */
        status: string;

        /**
         * Creates a new Tab instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Tab instance
         */
        static create(properties: cloudcli.Tab.$Shape): cloudcli.Tab & cloudcli.Tab.$Shape;
        static create(properties?: cloudcli.Tab.$Properties): cloudcli.Tab;

        /**
         * Encodes the specified Tab message. Does not implicitly {@link cloudcli.Tab.verify|verify} messages.
         * @param message Tab message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.Tab.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Tab message, length delimited. Does not implicitly {@link cloudcli.Tab.verify|verify} messages.
         * @param message Tab message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.Tab.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Tab message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.Tab & cloudcli.Tab.$Shape} Tab
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.Tab & cloudcli.Tab.$Shape;

        /**
         * Decodes a Tab message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.Tab & cloudcli.Tab.$Shape} Tab
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.Tab & cloudcli.Tab.$Shape;

        /**
         * Verifies a Tab message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Tab message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Tab
         */
        static fromObject(object: { [k: string]: any }): cloudcli.Tab;

        /**
         * Creates a plain object from a Tab message. Also converts values to other types if specified.
         * @param message Tab
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.Tab, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Tab to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for Tab
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace Tab {

        /** Properties of a Tab. */
        interface $Properties {

            /** Tab id */
            id?: (string|null);

            /** Tab title */
            title?: (string|null);

            /** Tab status */
            status?: (string|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a Tab. */
        type $Shape = cloudcli.Tab.$Properties;
    }

    /**
     * Properties of a TabsState.
     * @deprecated Use cloudcli.TabsState.$Properties instead.
     */
    interface ITabsState extends cloudcli.TabsState.$Properties {
    }

    /** Represents a TabsState. */
    class TabsState {

        /**
         * Constructs a new TabsState.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.TabsState.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** TabsState tabs. */
        tabs: cloudcli.Tab.$Properties[];

        /** TabsState activeId. */
        activeId: string;

        /** TabsState nextIndex. */
        nextIndex: number;

        /**
         * Creates a new TabsState instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TabsState instance
         */
        static create(properties: cloudcli.TabsState.$Shape): cloudcli.TabsState & cloudcli.TabsState.$Shape;
        static create(properties?: cloudcli.TabsState.$Properties): cloudcli.TabsState;

        /**
         * Encodes the specified TabsState message. Does not implicitly {@link cloudcli.TabsState.verify|verify} messages.
         * @param message TabsState message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TabsState.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TabsState message, length delimited. Does not implicitly {@link cloudcli.TabsState.verify|verify} messages.
         * @param message TabsState message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.TabsState.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TabsState message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.TabsState & cloudcli.TabsState.$Shape} TabsState
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.TabsState & cloudcli.TabsState.$Shape;

        /**
         * Decodes a TabsState message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.TabsState & cloudcli.TabsState.$Shape} TabsState
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.TabsState & cloudcli.TabsState.$Shape;

        /**
         * Verifies a TabsState message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TabsState message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TabsState
         */
        static fromObject(object: { [k: string]: any }): cloudcli.TabsState;

        /**
         * Creates a plain object from a TabsState message. Also converts values to other types if specified.
         * @param message TabsState
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.TabsState, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TabsState to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for TabsState
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace TabsState {

        /** Properties of a TabsState. */
        interface $Properties {

            /** TabsState tabs */
            tabs?: (cloudcli.Tab.$Properties[]|null);

            /** TabsState activeId */
            activeId?: (string|null);

            /** TabsState nextIndex */
            nextIndex?: (number|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a TabsState. */
        type $Shape = cloudcli.TabsState.$Properties;
    }

    /**
     * Properties of a TabsServerMessage.
     * @deprecated Use cloudcli.TabsServerMessage.$Properties instead.
     */
    interface ITabsServerMessage extends cloudcli.TabsServerMessage.$Properties {
    }

    /** Represents a TabsServerMessage. */
    class TabsServerMessage {

        /**
         * Constructs a new TabsServerMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.TabsServerMessage.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** TabsServerMessage tabs. */
        tabs?: (cloudcli.TabsState.$Properties|null);

        /** TabsServerMessage error. */
        error?: (cloudcli.ErrorMessage.$Properties|null);

        /** TabsServerMessage pong. */
        pong?: (cloudcli.Pong.$Properties|null);

        /** TabsServerMessage body. */
        body?: ("tabs"|"error"|"pong");

        /**
         * Creates a new TabsServerMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TabsServerMessage instance
         */
        static create(properties: cloudcli.TabsServerMessage.$Shape): cloudcli.TabsServerMessage & cloudcli.TabsServerMessage.$Shape;
        static create(properties?: cloudcli.TabsServerMessage.$Properties): cloudcli.TabsServerMessage;

        /**
         * Encodes the specified TabsServerMessage message. Does not implicitly {@link cloudcli.TabsServerMessage.verify|verify} messages.
         * @param message TabsServerMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TabsServerMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TabsServerMessage message, length delimited. Does not implicitly {@link cloudcli.TabsServerMessage.verify|verify} messages.
         * @param message TabsServerMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.TabsServerMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TabsServerMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.TabsServerMessage & cloudcli.TabsServerMessage.$Shape} TabsServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.TabsServerMessage & cloudcli.TabsServerMessage.$Shape;

        /**
         * Decodes a TabsServerMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.TabsServerMessage & cloudcli.TabsServerMessage.$Shape} TabsServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.TabsServerMessage & cloudcli.TabsServerMessage.$Shape;

        /**
         * Verifies a TabsServerMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TabsServerMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TabsServerMessage
         */
        static fromObject(object: { [k: string]: any }): cloudcli.TabsServerMessage;

        /**
         * Creates a plain object from a TabsServerMessage message. Also converts values to other types if specified.
         * @param message TabsServerMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.TabsServerMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TabsServerMessage to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for TabsServerMessage
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace TabsServerMessage {

        /** Properties of a TabsServerMessage. */
        interface $Properties {

            /** TabsServerMessage tabs */
            tabs?: (cloudcli.TabsState.$Properties|null);

            /** TabsServerMessage error */
            error?: (cloudcli.ErrorMessage.$Properties|null);

            /** TabsServerMessage pong */
            pong?: (cloudcli.Pong.$Properties|null);

            /** TabsServerMessage body */
            body?: ("tabs"|"error"|"pong");

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Narrowed shape of a TabsServerMessage. */
        type $Shape = {
          tabs?: cloudcli.TabsState.$Shape|null;
          error?: cloudcli.ErrorMessage.$Shape|null;
          pong?: cloudcli.Pong.$Shape|null;
          $unknowns?: Uint8Array[];
        } & (
          ({ body?: undefined; tabs?: null; error?: null; pong?: null }|{ body?: "tabs"; tabs: cloudcli.TabsState.$Shape; error?: null; pong?: null }|{ body?: "error"; tabs?: null; error: cloudcli.ErrorMessage.$Shape; pong?: null }|{ body?: "pong"; tabs?: null; error?: null; pong: cloudcli.Pong.$Shape })
        );
    }

    /**
     * Properties of an AuthClientMessage.
     * @deprecated Use cloudcli.AuthClientMessage.$Properties instead.
     */
    interface IAuthClientMessage extends cloudcli.AuthClientMessage.$Properties {
    }

    /** Represents an AuthClientMessage. */
    class AuthClientMessage {

        /**
         * Constructs a new AuthClientMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.AuthClientMessage.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** AuthClientMessage ping. */
        ping?: (cloudcli.Ping.$Properties|null);

        /** AuthClientMessage body. */
        body?: "ping";

        /**
         * Creates a new AuthClientMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns AuthClientMessage instance
         */
        static create(properties: cloudcli.AuthClientMessage.$Shape): cloudcli.AuthClientMessage & cloudcli.AuthClientMessage.$Shape;
        static create(properties?: cloudcli.AuthClientMessage.$Properties): cloudcli.AuthClientMessage;

        /**
         * Encodes the specified AuthClientMessage message. Does not implicitly {@link cloudcli.AuthClientMessage.verify|verify} messages.
         * @param message AuthClientMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.AuthClientMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified AuthClientMessage message, length delimited. Does not implicitly {@link cloudcli.AuthClientMessage.verify|verify} messages.
         * @param message AuthClientMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.AuthClientMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an AuthClientMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.AuthClientMessage & cloudcli.AuthClientMessage.$Shape} AuthClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.AuthClientMessage & cloudcli.AuthClientMessage.$Shape;

        /**
         * Decodes an AuthClientMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.AuthClientMessage & cloudcli.AuthClientMessage.$Shape} AuthClientMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.AuthClientMessage & cloudcli.AuthClientMessage.$Shape;

        /**
         * Verifies an AuthClientMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an AuthClientMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns AuthClientMessage
         */
        static fromObject(object: { [k: string]: any }): cloudcli.AuthClientMessage;

        /**
         * Creates a plain object from an AuthClientMessage message. Also converts values to other types if specified.
         * @param message AuthClientMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.AuthClientMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this AuthClientMessage to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for AuthClientMessage
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace AuthClientMessage {

        /** Properties of an AuthClientMessage. */
        interface $Properties {

            /** AuthClientMessage ping */
            ping?: (cloudcli.Ping.$Properties|null);

            /** AuthClientMessage body */
            body?: "ping";

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Narrowed shape of an AuthClientMessage. */
        type $Shape = {
          ping?: cloudcli.Ping.$Shape|null;
          $unknowns?: Uint8Array[];
        } & (
          ({ body?: undefined; ping?: null }|{ body?: "ping"; ping: cloudcli.Ping.$Shape })
        );
    }

    /**
     * Properties of a SessionActive.
     * @deprecated Use cloudcli.SessionActive.$Properties instead.
     */
    interface ISessionActive extends cloudcli.SessionActive.$Properties {
    }

    /** Represents a SessionActive. */
    class SessionActive {

        /**
         * Constructs a new SessionActive.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.SessionActive.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /**
         * Creates a new SessionActive instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SessionActive instance
         */
        static create(properties: cloudcli.SessionActive.$Shape): cloudcli.SessionActive & cloudcli.SessionActive.$Shape;
        static create(properties?: cloudcli.SessionActive.$Properties): cloudcli.SessionActive;

        /**
         * Encodes the specified SessionActive message. Does not implicitly {@link cloudcli.SessionActive.verify|verify} messages.
         * @param message SessionActive message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.SessionActive.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SessionActive message, length delimited. Does not implicitly {@link cloudcli.SessionActive.verify|verify} messages.
         * @param message SessionActive message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.SessionActive.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SessionActive message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.SessionActive & cloudcli.SessionActive.$Shape} SessionActive
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.SessionActive & cloudcli.SessionActive.$Shape;

        /**
         * Decodes a SessionActive message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.SessionActive & cloudcli.SessionActive.$Shape} SessionActive
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.SessionActive & cloudcli.SessionActive.$Shape;

        /**
         * Verifies a SessionActive message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SessionActive message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SessionActive
         */
        static fromObject(object: { [k: string]: any }): cloudcli.SessionActive;

        /**
         * Creates a plain object from a SessionActive message. Also converts values to other types if specified.
         * @param message SessionActive
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.SessionActive, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SessionActive to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for SessionActive
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace SessionActive {

        /** Properties of a SessionActive. */
        interface $Properties {

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a SessionActive. */
        type $Shape = cloudcli.SessionActive.$Properties;
    }

    /**
     * Properties of a SessionInvalidated.
     * @deprecated Use cloudcli.SessionInvalidated.$Properties instead.
     */
    interface ISessionInvalidated extends cloudcli.SessionInvalidated.$Properties {
    }

    /** Represents a SessionInvalidated. */
    class SessionInvalidated {

        /**
         * Constructs a new SessionInvalidated.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.SessionInvalidated.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /**
         * Creates a new SessionInvalidated instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SessionInvalidated instance
         */
        static create(properties: cloudcli.SessionInvalidated.$Shape): cloudcli.SessionInvalidated & cloudcli.SessionInvalidated.$Shape;
        static create(properties?: cloudcli.SessionInvalidated.$Properties): cloudcli.SessionInvalidated;

        /**
         * Encodes the specified SessionInvalidated message. Does not implicitly {@link cloudcli.SessionInvalidated.verify|verify} messages.
         * @param message SessionInvalidated message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.SessionInvalidated.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SessionInvalidated message, length delimited. Does not implicitly {@link cloudcli.SessionInvalidated.verify|verify} messages.
         * @param message SessionInvalidated message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.SessionInvalidated.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SessionInvalidated message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.SessionInvalidated & cloudcli.SessionInvalidated.$Shape} SessionInvalidated
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.SessionInvalidated & cloudcli.SessionInvalidated.$Shape;

        /**
         * Decodes a SessionInvalidated message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.SessionInvalidated & cloudcli.SessionInvalidated.$Shape} SessionInvalidated
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.SessionInvalidated & cloudcli.SessionInvalidated.$Shape;

        /**
         * Verifies a SessionInvalidated message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SessionInvalidated message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SessionInvalidated
         */
        static fromObject(object: { [k: string]: any }): cloudcli.SessionInvalidated;

        /**
         * Creates a plain object from a SessionInvalidated message. Also converts values to other types if specified.
         * @param message SessionInvalidated
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.SessionInvalidated, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SessionInvalidated to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for SessionInvalidated
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace SessionInvalidated {

        /** Properties of a SessionInvalidated. */
        interface $Properties {

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a SessionInvalidated. */
        type $Shape = cloudcli.SessionInvalidated.$Properties;
    }

    /**
     * Properties of an AuthServerMessage.
     * @deprecated Use cloudcli.AuthServerMessage.$Properties instead.
     */
    interface IAuthServerMessage extends cloudcli.AuthServerMessage.$Properties {
    }

    /** Represents an AuthServerMessage. */
    class AuthServerMessage {

        /**
         * Constructs a new AuthServerMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: cloudcli.AuthServerMessage.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** AuthServerMessage sessionActive. */
        sessionActive?: (cloudcli.SessionActive.$Properties|null);

        /** AuthServerMessage sessionInvalidated. */
        sessionInvalidated?: (cloudcli.SessionInvalidated.$Properties|null);

        /** AuthServerMessage pong. */
        pong?: (cloudcli.Pong.$Properties|null);

        /** AuthServerMessage body. */
        body?: ("sessionActive"|"sessionInvalidated"|"pong");

        /**
         * Creates a new AuthServerMessage instance using the specified properties.
         * @param [properties] Properties to set
         * @returns AuthServerMessage instance
         */
        static create(properties: cloudcli.AuthServerMessage.$Shape): cloudcli.AuthServerMessage & cloudcli.AuthServerMessage.$Shape;
        static create(properties?: cloudcli.AuthServerMessage.$Properties): cloudcli.AuthServerMessage;

        /**
         * Encodes the specified AuthServerMessage message. Does not implicitly {@link cloudcli.AuthServerMessage.verify|verify} messages.
         * @param message AuthServerMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.AuthServerMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified AuthServerMessage message, length delimited. Does not implicitly {@link cloudcli.AuthServerMessage.verify|verify} messages.
         * @param message AuthServerMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: cloudcli.AuthServerMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an AuthServerMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {cloudcli.AuthServerMessage & cloudcli.AuthServerMessage.$Shape} AuthServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cloudcli.AuthServerMessage & cloudcli.AuthServerMessage.$Shape;

        /**
         * Decodes an AuthServerMessage message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {cloudcli.AuthServerMessage & cloudcli.AuthServerMessage.$Shape} AuthServerMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cloudcli.AuthServerMessage & cloudcli.AuthServerMessage.$Shape;

        /**
         * Verifies an AuthServerMessage message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an AuthServerMessage message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns AuthServerMessage
         */
        static fromObject(object: { [k: string]: any }): cloudcli.AuthServerMessage;

        /**
         * Creates a plain object from an AuthServerMessage message. Also converts values to other types if specified.
         * @param message AuthServerMessage
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: cloudcli.AuthServerMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this AuthServerMessage to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for AuthServerMessage
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace AuthServerMessage {

        /** Properties of an AuthServerMessage. */
        interface $Properties {

            /** AuthServerMessage sessionActive */
            sessionActive?: (cloudcli.SessionActive.$Properties|null);

            /** AuthServerMessage sessionInvalidated */
            sessionInvalidated?: (cloudcli.SessionInvalidated.$Properties|null);

            /** AuthServerMessage pong */
            pong?: (cloudcli.Pong.$Properties|null);

            /** AuthServerMessage body */
            body?: ("sessionActive"|"sessionInvalidated"|"pong");

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Narrowed shape of an AuthServerMessage. */
        type $Shape = {
          sessionActive?: cloudcli.SessionActive.$Shape|null;
          sessionInvalidated?: cloudcli.SessionInvalidated.$Shape|null;
          pong?: cloudcli.Pong.$Shape|null;
          $unknowns?: Uint8Array[];
        } & (
          ({ body?: undefined; sessionActive?: null; sessionInvalidated?: null; pong?: null }|{ body?: "sessionActive"; sessionActive: cloudcli.SessionActive.$Shape; sessionInvalidated?: null; pong?: null }|{ body?: "sessionInvalidated"; sessionActive?: null; sessionInvalidated: cloudcli.SessionInvalidated.$Shape; pong?: null }|{ body?: "pong"; sessionActive?: null; sessionInvalidated?: null; pong: cloudcli.Pong.$Shape })
        );
    }
}
