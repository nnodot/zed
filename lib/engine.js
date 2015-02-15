/*eslint quotes: [2, "single"]*/

/*global window */

/*global _ */

/*global getElementBlock */

'use strict';
var engine = {};

engine.compileScript = function (element) {
    var string = element.text;
    var script;
    var compiled;
    try {
        // In case script is an expression.
        var maybeExpression = string;
        script = 'return (' + maybeExpression + ');';
        compiled = new Function('in1', 'sendToOutput', 'dest1', script);
        element.compiledScript = compiled;
    } catch (e1) {
        // Compilation failed then it isn't an expression. Try as a
        // function body.
        try {
            script = element.text;
            compiled = new Function('in1', 'sendToOutput', 'dest1', script);
            element.compiledScript = compiled;
        } catch (e) {
            // Not a function body, string is not valid.
            element.compiledScript = null;
        }
    }
};

engine.sendEventToOutputPort = function (element, value) {
    var block = getElementBlock(element);
    var port = block.ports().out;
    if (port) {
        port.links.forEach(function(link) {
            fireEvent(link, value);
        });
    }
};

var getOutputLinksFirstDestinationContent = function (element) {
    var block = getElementBlock(element);
    var port = block.ports().out;
    var content;
    if (port !== null) {
        var links = port.links;
        var link = links[0];
        if (link !== undefined) {
            var target = link.end.port.block;
            content = target.content;
        }
    }
    return content;
};

// TODO change name.
engine.fireEvent2 = function (target, value) {
    var content = target.content;
    var tagName = content.tagName;

    if (tagName === 'SCRIPT') {
        var dataPorts = target.querySelector('z-port.input');
        var dataLinks = dataPorts === null ? [] : dataPorts.links;
        var in1;

        if (dataLinks.length !== 0) {
            if (value === undefined) {
                var dataLink = _.find(dataLinks, function (link) {
                    var tag = link.begin.port.block.content.tagName;
                    return tag !== 'BUTTON';
                });

                if (dataLink !== undefined) {
                    var obj = dataLink.begin.port.block.content;
                    value = obj.value;

                    if (obj.tagName === 'SPAN') {
                        value = obj.innerHTML;
                        if (obj.classList.contains('zed-number')) {
                            value = Number(value);
                        }
                    }

                    if (value === undefined) {
                        value = obj;
                    }
                }
            }
            in1 = value;
        }

        var nextAction = function () {
            sendEventToOutputPort(content, arguments[0]);
        };
        var firstDestinationContent = getOutputLinksFirstDestinationContent(content);

        var theScript = content.compiledScript;
        if (theScript === undefined) {
            compileScript(content);
            theScript = content.compiledScript;
        }
        if (theScript === null) {
            //console.log('Error in script. Aborting.');
            return;
        }

        var result = theScript(in1, nextAction, firstDestinationContent);

        if (result !== undefined) {
            if (typeof result.then === 'function') {
                result.then(function (data) {
                    sendEventToOutputPort(content, data);
                });
            } else {
                sendEventToOutputPort(content, result);
            }
        }
    }

    if (tagName === 'NUMBER') {
        if (value !== undefined) {
            content.innerHTML = value;
        }
    }

    if (tagName === 'DIV' || tagName === 'SPAN') {
        if (value !== undefined) {
            content.innerHTML = value;
        } else {
            value = content.innerHTML;
        }
        sendEventToOutputPort(content, value);
    }

    if (tagName === 'INPUT') {
        if (value !== undefined) {
            content.value = value;
        }
    }
};

engine.fireEvent = function (link, value) {
    var target = link.end.port.block;
    fireEvent2(target, value);
};

engine.init = function () {
    window.compileScript = engine.compileScript;
    window.sendEventToOutputPort = engine.sendEventToOutputPort;
    window.fireEvent2 = engine.fireEvent2;
    window.fireEvent = engine.fireEvent;
};

export default engine;