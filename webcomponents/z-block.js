/*global restyle */
/*global Draggabilly */

'use strict';

var utils = require('../lib/utils');
var selector = require('../lib/selector');

var tagName = 'z-block';

var htmlTemplate = `
    <div class="ports-container inputs">
        <content select="z-port.input"></content>
    </div>
    <div id="main">
        <div class="content-container">
            <content></content>
        </div>
        <span class="block-key">a</span>
    </div>
    <div class="ports-container outputs">
        <content select="z-port.output"></content>
    </div>
`;
var template = utils.dom.createFragment(htmlTemplate);

var cssAsJson = {
    // The following will apply to the root DOM element of the custom
    // element.
    '': {
        // By default custom elements are inline elements. Current element
        // has its own height and width and can be insterted in a text
        // flow. So we need a 'display: inline-block' style. Moreover, this
        // is needed as a workaround for a bug in Draggabilly (which only
        // works on block elements, not on inline ones).
        'display': 'inline-block',
        'position': 'absolute'
    },
    '#main': {
        'background': 'rgba(1, 1, 1, 0)',
        'border-left': '3px solid',
        'border-left-color': 'rgba(1, 1, 1, 0)',
        'border-right': '3px solid',
        'border-right-color': 'rgba(1, 1, 1, 0)'
    },
    '.content-container': {
        'background': 'white',
        'border': '1px solid #e1e8ed',
        'border-radius': 2,
        'overflow': 'hidden'
    },
    '.content-container > script': {
        'padding': '4px 8px 2px 8px'
    },
    '.content-container > span': {
        'padding': '4px 8px 2px 8px'
    },
    '.content-container > div': {
        'padding': '4px 8px 2px 8px'
    },
    '.ports-container': {
        'padding': 0,
        'minHeight': 2,
        'overflow': 'visible'
    },
    '.ports-container z-port': {
        'float': 'left',
        'marginLeft': 8,
        'marginRight': 8
    },
    'span.block-key': {
        'font-size': 11,
        'color': '#444',
        'position': 'absolute',
        'bottom': 3,
        'right': 3,
        'padding-right': 3,
        'padding-left': 3,
        'background': '#fff'
    },
    'z-port.input .port-key': {
        'top': -3
    },
    'z-port.output .port-key': {
        'bottom': -3
    }
};
// Apply the css definition and prepending the custom element tag to all
// CSS selectors.
var style = restyle(tagName, cssAsJson);

var redraw = function (block) {
    var ports = block.querySelectorAll('z-port');
    [].forEach.call(ports, function (port) {
        port.redraw();
    });
};

var makeItDraggable = function (block) {
    block.draggie = new Draggabilly(block, {
    });
    block.draggie.externalAnimate = function () {
        redraw(block);
    };
    block.draggie.on('staticClick', function (event) {
        // TODO depends on the port's DOM wich might change.
        if (event.target.parentNode.tagName === 'Z-PORT') {
            // In that case we have clicked on the "selector" of a port and the
            // action is to select it and not to do something with the block.
            return;
        }
        // TODO don't use globals
        window.setCurrentBlock(block);
        window.app.commands.editBlock(block);
    });
};

var properties = {
    createdCallback: {value: function() {
        // At the beginning the light DOM is stored in the current element.
        var lightDom = this;
        // Start composed DOM with a copy of the template
        var composedDom = template.cloneNode(true);
        // Then progressively move elements from light to composed DOM based on
        // selectors on light DOM and fill <content> tags in composed DOM with
        // them.
        ['z-port.input', 'z-port.output', ''].forEach(function(selector) {
            utils.dom.move({
                from: lightDom, withSelector: selector,
                to: composedDom, onTag: 'content'
            });
        });
        // At this stage composed DOM is completed and light DOM is empty (i.e.
        // 'this' has no children). Composed DOM is set as the content of the
        // current element.
        this.appendChild(composedDom);

        this.hideKey();

        var that = this;
        var ports = that.querySelectorAll('z-port');
        [].forEach.call(ports, function(port) {
            port.block = that;
        });

        this.content = this.querySelector('.ze-content');

        this.redraw = redraw.bind(null, this);
        selector.setSelectable(this, true);
    }},

    attachedCallback: {value: function() {
        // TODO bug in chrome or in webreflection polyfill. If makeItDraggable
        // is called in createdCallback then Draggabily adds a
        // 'position:relative' because the css style of block that set
        // position to absolute has not been applied yet (with chrome). With
        // WebReflection's polyfill the style is applied so Draggabilly doesn't
        // change position. Why a different behaviour? Which is wrong ? Chrome,
        // webreflection or the spec? Maybe we can try with polymer polyfill.
        makeItDraggable(this);
    }},

    unplug: {value: function() {
        var ports = this.querySelectorAll('z-port');
        [].forEach.call(ports, function (port) {
            port.unplug();
        });
    }},

    addPort: {value: function (htmlString) {
        var fragment = utils.dom.createFragment(htmlString);
        var port = fragment.firstChild;
        port.block = this;
        if (port.classList.contains('input')) {
            var portContainer = this.querySelector('.ports-container.inputs');
            portContainer.appendChild(fragment);
        } else if (port.classList.contains('output')) {
            var portContainer = this.querySelector('.ports-container.outputs');
            portContainer.appendChild(fragment);
        }
        return port;
    }},

    keyElement: {
        get: function () {
            return this.querySelector('span.block-key');
        }
    },

    key: {
        set: function (value) {
            this.keyElement.innerHTML = value;
        }
    },

    showKey: {value: function () {
        this.keyElement.style.visibility = 'visible';
    }},

    hideKey: {value: function () {
        this.keyElement.style.visibility = 'hidden';
    }},

    ports: {
        get: function () {
            return {
                'out': this.querySelector('z-port.output'),
                'inputs': this.querySelectorAll('z-port.input'),
                'outputs': this.querySelectorAll('z-port.output')
            };
        }
    },

    draggable: {
        set: function(value) {
            if (value) {
                this.draggie.enable();
            } else {
                this.draggie.disable();
            }
        }
    },

    contentInnerHTML: {
        get: function () {
            return this.querySelector('.content-container').innerHTML;
        },
        set: function (string) {
            this.querySelector('.content-container').innerHTML = string;
            this.content = this.querySelector('.ze-content');
        }
    }
};

var proto = Object.create(HTMLElement.prototype, properties);
proto.css = style;
document.registerElement(tagName, {prototype: proto});

// TODO clean globals
window.getElementBlock = function (element) {
    // TODO do a search to find the first parent block for cases where
    // element is down in the element hiearchy.
    var maybeBlock = element.parentNode.parentNode.parentNode;
    var block;
    if (maybeBlock.tagName === 'Z-BLOCK') {
        block = maybeBlock;
    } else {
        block = element.phantomedBy.parentNode.parentNode.parentNode;
    }
    return block;
};
