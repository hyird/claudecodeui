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
         * Encodes the specified Ping message. Does not implicitly {@link cloudcli.Ping.verify|verify} messages.
         * @param message Ping message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.Ping.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified Pong message. Does not implicitly {@link cloudcli.Pong.verify|verify} messages.
         * @param message Pong message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.Pong.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified ErrorMessage message. Does not implicitly {@link cloudcli.ErrorMessage.verify|verify} messages.
         * @param message ErrorMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.ErrorMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified TerminalInit message. Does not implicitly {@link cloudcli.TerminalInit.verify|verify} messages.
         * @param message TerminalInit message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalInit.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified TerminalInput message. Does not implicitly {@link cloudcli.TerminalInput.verify|verify} messages.
         * @param message TerminalInput message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalInput.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified TerminalResize message. Does not implicitly {@link cloudcli.TerminalResize.verify|verify} messages.
         * @param message TerminalResize message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalResize.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified TerminalClose message. Does not implicitly {@link cloudcli.TerminalClose.verify|verify} messages.
         * @param message TerminalClose message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalClose.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified TerminalClientMessage message. Does not implicitly {@link cloudcli.TerminalClientMessage.verify|verify} messages.
         * @param message TerminalClientMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalClientMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified TerminalReady message. Does not implicitly {@link cloudcli.TerminalReady.verify|verify} messages.
         * @param message TerminalReady message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalReady.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified TerminalOutput message. Does not implicitly {@link cloudcli.TerminalOutput.verify|verify} messages.
         * @param message TerminalOutput message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalOutput.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified TerminalExit message. Does not implicitly {@link cloudcli.TerminalExit.verify|verify} messages.
         * @param message TerminalExit message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalExit.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified TerminalServerMessage message. Does not implicitly {@link cloudcli.TerminalServerMessage.verify|verify} messages.
         * @param message TerminalServerMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TerminalServerMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified AddTab message. Does not implicitly {@link cloudcli.AddTab.verify|verify} messages.
         * @param message AddTab message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.AddTab.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified SetActive message. Does not implicitly {@link cloudcli.SetActive.verify|verify} messages.
         * @param message SetActive message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.SetActive.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified UpdateTitle message. Does not implicitly {@link cloudcli.UpdateTitle.verify|verify} messages.
         * @param message UpdateTitle message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.UpdateTitle.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified RestartTab message. Does not implicitly {@link cloudcli.RestartTab.verify|verify} messages.
         * @param message RestartTab message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.RestartTab.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified CloseTab message. Does not implicitly {@link cloudcli.CloseTab.verify|verify} messages.
         * @param message CloseTab message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.CloseTab.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified TabsClientMessage message. Does not implicitly {@link cloudcli.TabsClientMessage.verify|verify} messages.
         * @param message TabsClientMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TabsClientMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified Tab message. Does not implicitly {@link cloudcli.Tab.verify|verify} messages.
         * @param message Tab message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.Tab.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified TabsState message. Does not implicitly {@link cloudcli.TabsState.verify|verify} messages.
         * @param message TabsState message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TabsState.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified TabsServerMessage message. Does not implicitly {@link cloudcli.TabsServerMessage.verify|verify} messages.
         * @param message TabsServerMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.TabsServerMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified AuthClientMessage message. Does not implicitly {@link cloudcli.AuthClientMessage.verify|verify} messages.
         * @param message AuthClientMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.AuthClientMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified SessionActive message. Does not implicitly {@link cloudcli.SessionActive.verify|verify} messages.
         * @param message SessionActive message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.SessionActive.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified SessionInvalidated message. Does not implicitly {@link cloudcli.SessionInvalidated.verify|verify} messages.
         * @param message SessionInvalidated message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.SessionInvalidated.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
         * Encodes the specified AuthServerMessage message. Does not implicitly {@link cloudcli.AuthServerMessage.verify|verify} messages.
         * @param message AuthServerMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: cloudcli.AuthServerMessage.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

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
