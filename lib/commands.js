/*eslint quotes: [2, "single"]*/

/*global document, window */

/*global utils */

/*global TermGlobals */
/*global termKey */
/*global Parser */
/*global Terminal */

/*global Mousetrap */


import storage from 'lib/storage';
import editor from 'lib/editor';

export function init () {
    'use strict';

    window.commands = {};
    var commands = window.commands;

    commands.prev = editor.offsetCurrent.bind(null, -1);
    commands.next = editor.offsetCurrent.bind(null, 1);
    commands.add = editor.add;
    commands.remove = editor.remove;
    commands.inputs = editor.port.bind(null, 'input');
    commands.outputs = editor.port.bind(null, 'output');
    commands.block = editor.block;
    commands.fire = editor.fire;
    commands.set = editor.set;
    commands.move = editor.move;

    var goOutOfCommandLine = function () {
        TermGlobals.keylock = true;
        TermGlobals.activeTerm.cursorOff();
        bindKeysForMainMode();
        var termDiv = document.querySelector('#command-line-frame');
        termDiv.classList.toggle('focused');
        editor.startBlinking();
    };

    var ctrlHandler = function () {
        if (this.inputChar === termKey.ESC) {
            goOutOfCommandLine();
        }
    };

    var termHandler = function () {
        this.newLine();
        var parser = new Parser();
        parser.parseLine(this);
        var commandName = this.argv[0];
        if (commands.hasOwnProperty(commandName)) {
            var args = this.argv.slice(1);
            try {
                var result = commands[commandName].apply(null, args);
                if (result !== undefined) {
                    this.write(result);
                }
            } catch (e) {
                this.write(e.message);
            }
        } else {
            this.write('unknown command "' + commandName + '".');
        }
        this.prompt();
    };

    var initHandler = function () {
        this.prompt();
    };

    var term = new Terminal( {
        termDiv: 'command-line-frame',
        handler: termHandler,
        bgColor: '#f0f0f0',
        crsrBlinkMode: true,
        crsrBlockMode: false,
        rows: 10,
        frameWidth: 0,
        closeOnESC: false,
        ctrlHandler: ctrlHandler,
        initHandler: initHandler

    } );
    term.open();

    commands.goToCommandLine = function () {
        if (TermGlobals.keylock === false) {
            return;
        }
        TermGlobals.keylock = false;
        Mousetrap.reset();
        TermGlobals.activeTerm.cursorOn();
        var termDiv = document.querySelector('#command-line-frame');
        termDiv.classList.toggle('focused');
        editor.stopBlinking();
    };

    var editBlock = function (block) {
        Mousetrap.reset();
        Mousetrap.bind('esc', commands.escape);
        block.content.focus();
    };

    commands.edit = function () {
        if (editor.context === 'block') {
            var block = editor.getCurrentBlock();
            editBlock(block);
            editor.stopBlinking();
            // Prevent default when this function is used with Moustrap.
            return false;
        }
    };

    commands.help = function (subject) {
        if (subject === undefined) {
            term.write('Press Esc to leave the command line and go back to normal mode.');
            term.newLine();
            term.newLine();
            term.write('Commands: next, prev, remove, add and set content.');
        } else if (subject === 'add') {
            term.write('Add a new block just below the current block.');
            term.newLine();
            term.newLine();
            term.write('add html <what> <content> <nb inputs> <nb outputs>');
            term.newLine();
            term.write('  <what>    is either "button", "script", "text", "number" or a HTML tag.');
            term.newLine();
            term.write('  <content> is the content of the block (i.e. the button name, the');
            term.newLine();
            term.write('            script code, the text or number value, etc.).');
        } else {
            term.write('No help for "' + subject + '".');
        }
    };

    commands.addButton = commands.add.bind(null, 'html', 'button', 'go', 0, 1, undefined, undefined);
    commands.addScript = commands.add.bind(null, 'html', 'script', 'return in1 + 2;', 1, 1, undefined, undefined);
    commands.addText = commands.add.bind(null, 'html', 'span', 'empty', 1, 1, undefined, undefined);
    commands.addNumber = commands.add.bind(null, 'zed', 'number', '42', 1, 1, undefined, undefined);
    var bindKeysForMainMode = function () {
        Mousetrap.reset();
        Mousetrap.bind('k', commands.prev);
        Mousetrap.bind('j', commands.next);
        Mousetrap.bind('a n', commands.add.bind(null, 'New'));
        Mousetrap.bind('a h b', commands.addButton);
        Mousetrap.bind('a h s', commands.addScript);
        Mousetrap.bind('a h t', commands.addText);
        Mousetrap.bind('a h n', commands.addNumber);
        Mousetrap.bind('r', commands.remove);
        Mousetrap.bind('i', commands.inputs);
        Mousetrap.bind('o', commands.outputs);
        Mousetrap.bind('b', commands.block);
        Mousetrap.bind('c', commands.goToCommandLine);
        Mousetrap.bind('l', commands.link);
        Mousetrap.bind('g', commands.goToBlock);
        Mousetrap.bind('e', commands.edit);
        Mousetrap.bind('space', commands.fire);
    };
    window.bindKeysForMainMode = bindKeysForMainMode;

    commands.escape = function () {
        if (editor.context === 'block') {
            var currentlyEditingElement = utils.dom.getSelectionStart();
            if (currentlyEditingElement !== null) {
                currentlyEditingElement.blur();
                editor.startBlinking();
            }
            bindKeysForMainMode();
        }
    };

    var hideAllPorts = function () {
        var ports = document.querySelectorAll('z-port');
        [].forEach.call(ports, function (port) {
            port.hideKey();
        });
    };
    var firstPort;
    var selectPort = function (port) {
        if (firstPort === undefined) {
            firstPort = port;
        } else {
            if (port.connectable(port, firstPort)) {
                port.connect(port, firstPort);
                firstPort = undefined;
                hideAllPorts();
                bindKeysForMainMode();
            }
        }
    };

    var portToLinkTo;
    commands.link = function () {
        if (editor.context === 'block') {
            firstPort = undefined;
            Mousetrap.reset();
            var ports = document.querySelectorAll('z-port');
            var index = 1;
            [].forEach.call(ports, function (port) {
                port.showKey();
                var key = port.querySelector('span.port-key').innerHTML;
                // Convert 'aae' into 'a a e'.
                key = key.split('').join(' ');
                Mousetrap.bind(key, selectPort.bind(null, port));
                index++;
            });
            Mousetrap.bind('esc', function () {
                bindKeysForMainMode();
                hideAllPorts();
            });
        } else {
            var port = editor.getCurrentPort();
            if (port !== null) {
                if (portToLinkTo === undefined) {
                    portToLinkTo = port;
                    portToLinkTo.classList.toggle('to-link-to');
                } else if (port.connectable(port, portToLinkTo)) {
                    port.connect(port, portToLinkTo);
                    portToLinkTo.classList.toggle('to-link-to');
                    portToLinkTo = undefined;
                } else {
                    portToLinkTo.classList.toggle('to-link-to');
                    portToLinkTo = port;
                    portToLinkTo.classList.toggle('to-link-to');
                }
            }
        }
    };

    var setCurrentBlockAndBackToMainMode = function (block) {
        editor.setCurrentBlock(block);
        var blocks = document.querySelectorAll('z-block');
        [].forEach.call(blocks, function (block) {
            block.hideKey();
        });
        bindKeysForMainMode();
    };

    commands.goToBlock = function () {
        Mousetrap.reset();
        var blocks = document.querySelectorAll('z-block');
        var index = 0;
        [].forEach.call(blocks, function (block) {
            block.showKey();
            var key = block.querySelector('span.id').innerHTML;
            // Convert 'aae' into 'a a e'.
            key = key.split('').join(' ');
            Mousetrap.bind(key, setCurrentBlockAndBackToMainMode.bind(null, block));
            index++;
        });
        Mousetrap.bind('esc', bindKeysForMainMode);
    };

    // Set a new stopCallback for Moustrap to avoid stopping when we start
    // editing a contenteditable, so that we can use escape to leave editing.
    Mousetrap.stopCallback = function(e, element, combo) {
        // if the element has the class "mousetrap" then no need to stop
        if ((' ' + element.className + ' ').indexOf(' mousetrap ') > -1) {
            return false;
        }

         // stop for input, select, and textarea
         return element.tagName == 'INPUT' || element.tagName == 'SELECT' || element.tagName == 'TEXTAREA';
     };

    bindKeysForMainMode();
    goOutOfCommandLine();

    // TODO move elsewhere
    var http = {};
    window.http = http;
    http.get = function (url, success) {
      var request = new XMLHttpRequest();
      request.onload = function (e) {
        success(JSON.parse(request.responseText));
      };
      request.open("get", url, true);
      request.send();
    };

    commands.save = storage.savePatch;
    commands.load = storage.loadPatch;
    commands.rm = storage.removePatch;
    commands.list = storage.getPatchNames;
    commands.clear = storage.clearAll;
};