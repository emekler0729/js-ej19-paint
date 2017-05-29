/**
 * Created by Eduard on 5/27/2017.
 */

/**
 * Helper function for creating DOM Elements.
 *
 * Any extra arguments are inserted as children of the created element. If the extra arguments are strings then
 * they are inserted as text nodes. The attributes object can contain a style attribute with a object value containing
 * additional style name-value pairs.
 *
 * @param type The type of element to be created as a string. Example: 'div'.
 * @param attributes An object containing attribute name-value pairs. Example {width: 500, style: {position: absolute}}.
 * @returns {Element} Returns the created element.
 */
function createElement(type, attributes) {
    var node = document.createElement(type);
    if(attributes) {
        for(var name in attributes) {
            if(attributes.hasOwnProperty(name)) {
                if(name == 'style') {
                    setStyle(node, attributes[name]);
                } else {
                    node.setAttribute(name, attributes[name]);
                }
            }
        }
    }
    for(var i = 2; i < arguments.length; i++) {
        var child = arguments[i];
        if(typeof child == 'string') {
            child = document.createTextNode(child);
        }
        node.appendChild(child);
    }
    return node;
}

/**
 * Helper function for setting style properties on DOM Elements.
 *
 * @param node The DOM Element whose styles will be modified.
 * @param styles An object containing style name-value pairs. Example {top: 500, left: 10}.
 */
function setStyle(node, styles) {
    for(var style in styles) {
        if(styles.hasOwnProperty(style)) {
            node.style[style] = styles[style];
        }
    }
}

/**
 * The controls object holds the constructor function for each toolbar control in the paint program.
 * Each constructor function is called when the program is initialized by the createPaint function.
 */
var controls = Object.create(null);

/**
 * The createPaint function initializes the program by creating the canvas, constructing all controls in the controls
 * object, and adding the UI elements to the parent element provided as an argument.
 *
 * @param parent The element which will contain the Paint program UI.
 */
function createPaint(parent) {
    var canvas = createElement('canvas', {width: 500, height: 300});
    var cx = canvas.getContext('2d');
    var toolbar = createElement('div', {class: 'toolbar'});
    for(var name in controls) {
        toolbar.appendChild(controls[name](cx));
    }

    var panel = createElement('div', {class: 'picturepanel'}, canvas);
    parent.appendChild(createElement('div', null, panel, toolbar));
}

/**
 * The tools object holds the handler functions for each tool in the tool control element. Each tool with a handler
 * will be added to the tools control when it is constructed.
 */
var tools = Object.create(null);

/**
 * The tools control constructor creates a select form control and adds all tools with handlers in the tools object
 * as options to the form control. The constructor also registers an event handler on the canvas that calls the
 * selected tool's handler function when mouse 1 is pressed.
 *
 * @param cx The 2DCanvasContext for the canvas element of the Paint UI.
 * @returns {Element} The DOM Element for the tools control to be added to the toolbar UI.
 */
controls.tools = function(cx) {
    var select = createElement('select');
    for(var name in tools) {
        select.appendChild(createElement('option', null, name));
    }

    cx.canvas.addEventListener('mousedown', function(event) {
        if(event.which == 1) {
            tools[select.value](event, cx);
            event.preventDefault();
        }
    });

    return createElement('span', null, 'Tool: ', select);
};

/**
 * The relativePos function converts a mouse event with absolute coordinates to a coordinate object that is relative
 * to the supplied element. The function also takes into account the border, margin, and padding of the element to
 * ensure the relative coordinates are within the usable space of the element. This is typically used with the canvas
 * element to ensure drawing occurs at the correct location in the canvas.
 *
 * @param event The mouse event which holds the absolute coordinates of the mouse event.
 * @param element The element within which relative coordinates are to be calculated.
 * @returns {{x: number, y: number}} Coordinate object with relative x and y coordinates.
 */
function relativePos(event, element) {
    var rect = element.getBoundingClientRect();
    var xDelta = (rect.width - element.width) / 2;
    var yDelta = (rect.height - element.height) / 2;
    return {x: Math.floor(event.clientX - rect.left - xDelta),
            y: Math.floor(event.clientY - rect.top - yDelta)};
}

/**
 * The trackDrag function is a helper function for handling mouse move events when a mouse button is held down.
 * It accepts an onMove function and onEnd function. The onMove function is registered to the mouse move event.
 * When the mouse button is released the end function is executed which unregisters the listeners and calls the onEnd
 * function if it is present.
 *
 * @param onMove The handler function for mouse move events.
 * @param onEnd The function called after the mouse button is released.
 */
function trackDrag(onMove, onEnd) {
    function end(event) {
        removeEventListener('mousemove', onMove);
        removeEventListener('mouseup', end);
        if(onEnd) {
            onEnd(event);
        }
    }
    addEventListener('mousemove', onMove);
    addEventListener('mouseup', end);
}

/**
 * The Line tool handler draws a line under the mouse cursor as long as mouse 1 is held down.
 *
 * @param event The mouse down event that initiated the handler.
 * @param cx The 2DCanvasContext used for drawings the line.
 * @param onEnd A pass through of the onEnd function to allow the Line tool to be extended for other tools.
 */
tools.Line = function(event, cx, onEnd) {
    cx.lineCap = 'round';
    var pos = relativePos(event, cx.canvas);

    trackDrag(function(event) {
        cx.beginPath();
        cx.moveTo(pos.x, pos.y);
        pos = relativePos(event, cx.canvas);
        cx.lineTo(pos.x, pos.y);
        cx.stroke();
    }, onEnd);
};

/**
 * The Erase tool handler extends the Line tool by setting the 2DCanvasContext's operation to 'destination-out' which
 * causes the lines to draw empty 'erased' space instead of colored lines. When the mouse button is released the
 * operation is set back to 'source-over' which causes the 2DCanvasContext to revert to normal operation.
 *
 * @param event The mouse down event which initiated the handler.
 * @param cx The 2DCanvasContext used for drawing the empty 'erased' space.
 */
tools.Erase = function(event, cx) {
    cx.globalCompositeOperation = 'destination-out';
    tools.Line(event, cx, function() {
        cx.globalCompositeOperation = 'source-over';
    });
};

/**
 * The color control constructor creates a color input form control and registers an event listener that updates
 * the 2DCanvasContext's fillStyle and strokeStyle when a change occurs.
 *
 * @param cx The 2DCanvasContext for the canvas element of the Paint UI.
 * @returns {Element} The DOM Element for the color control to be added to the toolbar UI.
 */
controls.color = function(cx) {
    var input = createElement('input', {type: 'color', id: 'color'});
    input.addEventListener('change', function() {
        cx.fillStyle = input.value;
        cx.strokeStyle = input.value;
    });
    return createElement('span', null, 'Color: ', input);
};

/**
 * The brushSize control constructor creates a select form control and adds the hard coded sizes as options to the
 * form control. The constructor also registers an event listener that updates the 2DCanvasContext's lineWidth when
 * a change occurs.
 *
 * @param cx The 2DCanvasContext for the canvas element of the Paint UI.
 * @returns {Element} The DOM Element for the brush size control to be added to the toolbar UI.
 */
controls.brushSize = function(cx) {
    var select = createElement('select');
    var sizes = [1, 2, 3, 5, 8, 12, 25, 35, 50, 75, 100];

    sizes.forEach(function(size) {
        select.appendChild(createElement('option', {value: size},
            size + ' pixels'));
    });

    select.addEventListener('change', function() {
        cx.lineWidth = select.value;
    });

    return createElement('span', null, 'Brush size: ', select);
};

/**
 * The save control constructor creates a link which is updated on mouseover or focus. When updated, the link is
 * set to a data URL which represents the canvas's content. The handler also addresses a potential security error
 * which occurs when the canvas data is locked due to being part of a different domain.
 *
 * @param cx The 2DCanvasContext for the canvas element whose content will be saved.
 * @returns {Element} The DOM Element for the save control to be added to the toolbar UI.
 */
controls.save = function(cx) {
    var link = createElement('a', {href: '/'}, 'Save');
    function update() {
        try {
            link.href = cx.canvas.toDataURL();
        } catch (e) {
            if(e instanceof SecurityError) {
                link.href = 'javascript:alert(' +
                        JSON.stringify("Can't save: " + e.toString()) + ')';
            } else {
                throw e;
            }
        }
    }

    link.addEventListener('mouseover', update);
    link.addEventListener('focus', update);
    return link;
};


/**
 * Given an image data URL and a 2DCanvasContext, the loadImageURL function will draw the loaded image onto the canvas.
 *
 * @param cx The 2DCanvasContext for the canvas on which the image will be loaded.
 * @param url The image data URL to be loaded.
 */
function loadImageURL(cx, url) {
    var image = document.createElement('img');
    image.addEventListener('load', function() {
        var color = cx.fillStyle, size = cx.lineWidth;
        cx.canvas.width = image.width;
        cx.canvas.height = image.height;
        cx.drawImage(image, 0, 0);
        cx.fillStyle = color;
        cx.strokeStyle = color;
        cx.lineWidth = size;
    });
    image.src = url;
}

/**
 * The openFile control creates a file input form control. When the file input form control is changed, the selected
 * file will be read as a data URL and then loaded onto the supplied canvas.
 *
 * @param cx The 2DCanvasContext of the canvas which the loaded image will be drawn onto.
 * @returns {Element} The DOM Element for the openFile control to be added to the toolbar UI.
 */
controls.openFile = function(cx) {
    var input = createElement('input', {type: 'file'});
    input.addEventListener('change', function() {
        if(input.files.length == 0) return;
        var reader = new FileReader();
        reader.addEventListener('load', function() {
            loadImageURL(cx, reader.result);
        });
        reader.readAsDataURL(input.files[0]);
    });
    return createElement('div', null, 'Open file: ', input);
};

/**
 * The openURL control creates a text input form control & a submit button form control. The form control accepts an
 * image data URL string which will be loaded onto the supplied context when the form is submitted via the load button.
 *
 * @param cx The 2DCanvasContext of the canvas which the loaded image will be drawn onto.
 * @returns {Element} The DOM Element for the openURL control to be added to the toolbar UI.
 */
controls.openURL = function(cx) {
    var input = createElement('input', {type: 'text'});
    var form = createElement('form', null,
        'Open URL: ', input,
        createElement('button', {type: 'submit'}, 'load'));
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        loadImageURL(cx, input.value);
    });
    return form;
};

/**
 * The text tool handler prompts the user for input text and then draws it on the canvas at the mouse down location.
 * The text uses the size set by the brushSize control (minimum of 7pt size) and sans-serif font.
 *
 * @param event The mouse down event that initiated the handler.
 * @param cx The 2DCanvasContext used for drawing the text.
 */
tools.Text = function(event, cx) {
    var text = prompt('Text:', "");
    if(text) {
        var pos = relativePos(event, cx.canvas);
        cx.font = Math.max(7, cx.lineWidth) + 'px sans-serif';
        cx.fillText(text, pos.x, pos.y);
    }
};

/**
 * The spray tool handler acts like the traditional spray can tool found in drawing applications. The diameter of the
 * spray circle is set by the brushSize control. The circle will move with the mouse if it is held down and the dots
 * are placed at a 25ms tick. Each a number of dots equal to 1/30 of the area of the circle are placed.
 *
 * @param event The mouse down event that initiated the handler.
 * @param cx The 2DCanvasContext used for drawing the spray.
 */
tools.Spray = function(event, cx) {
    var radius = cx.lineWidth / 2;
    var area = radius * radius * Math.PI;
    var dotsPerTick = Math.ceil(area / 30);

    var currentPos = relativePos(event, cx.canvas);
    var spray = setInterval(function() {
        for(var i = 0; i < dotsPerTick; i++) {
            var offset = randomPointInRadius(radius);
            cx.fillRect(currentPos.x + offset.x,
                currentPos.y + offset.y, 1, 1);
        }
    }, 25);
    trackDrag(function(event) {
        currentPos = relativePos(event, cx.canvas);
    }, function() {
        clearInterval(spray);
    });
};

/**
 * The randomPointInRadius function is a crude way to generate random coordinates within a circle that are not
 * tightly distributed towards the center.
 *
 * @param radius The radius of the circle within which the points will fall.
 * @returns {{x: number, y: number}} A coordinate object containing the random point.
 */
function randomPointInRadius(radius) {
    for(;;) {
        var x = Math.random() * 2 - 1;
        var y = Math.random() * 2 - 1;
        if(x * x + y * y <= 1) {
            return {x: x*radius, y: y * radius};
        }
    }
}

/**
 * The rectangle tool draws a rectangle on the canvas between the points where the mouse was clicked and released.
 * A placeholder rectangle is displayed before the change is committed to the canvas to the assist the user in seeing
 * where the rectangle will be drawn.
 *
 * @param event The mouse down event which initiated the handler.
 * @param cx The 2DCanvasContext used for drawing the rectangle.
 */
tools.Rectangle = function(event, cx) {
    var canvasStartPos = relativePos(event, cx.canvas);
    var pageStartPos = {x: event.clientX, y: event.clientY};
    var placeholder = createElement('div', {
        style: {
            background: cx.fillStyle,
            position: 'absolute',
            left: pageStartPos.x + 'px',
            top: pageStartPos.y + 'px',
            width: '1px',
            height: '1px'
        }
    });
    cx.canvas.parentNode.appendChild(placeholder);

    trackDrag(function(event) {
        var pos = {x: event.clientX, y: event.clientY};
        pos = keepInBounds(pos, cx.canvas);
        var rect = rectangleFromPoints(pageStartPos, pos);
        setStyle(placeholder, {
            left: rect.left + 'px',
            top: rect.top + 'px',
            width: rect.width + 'px',
            height: rect.height + 'px'
        });
    }, function(event) {
        var canvasEndPos = relativePos(event, cx.canvas);
        var rect = rectangleFromPoints(canvasStartPos, canvasEndPos);
        cx.fillRect(rect.left, rect.top, rect.width, rect.height);
        cx.canvas.parentNode.removeChild(placeholder);
    })
};

/**
 * The rectangleFromPoints functions takes two coordinate objects representing opposing corners of a rectangles and
 * generates an equivalent rectangle coordinate object in terms of its top coordinate, left coordinate, width, and
 * height. This is required due to the API for placing DOM Elements & drawing rectangles on the canvas.
 *
 * @param a A coordinate object for a corner of the rectangle. {{x: number, y: number}}
 * @param b A coordinate object for a corner of the rectangle. {{x: number, y: number}}
 * @returns {{left: number, top: number, width: number, height: number}} A rectangle coordinate object.
 */
function rectangleFromPoints(a, b) {
    return {left: Math.min(a.x, b.x),
            top: Math.min(a.y, b.y),
            width: Math.abs(a.x - b.x),
            height: Math.abs(a.y - b.y)};
}

/**
 * The keepInBounds function takes a coordinate object and an element and returns a coordinate object that does not
 * exceed the bounding client rectangle of the element. This function is used to ensure that mouse move events do not
 * exceed the object that they are initiated in, for example to draw the rectangle assisting element before committing
 * it to the canvas.
 *
 * @param point A coordinate object {{x: number, y: number}}.
 * @param element The element which should contain the coordinate object.
 * @returns {{x: number, y: number}} The original coordinate if it is in the element or the closest coordinate in the
 * element otherwise.
 */
function keepInBounds(point, element) {
    var rect = element.getBoundingClientRect();
    var result = {};

    result.x = point.x < rect.left ? rect.left : point.x;
    result.x = point.x > rect.right ? rect.right : result.x;
    result.y = point.y < rect.top ? rect.top : point.y;
    result.y = point.y > rect.bottom ? rect.bottom : result.y;

    return result;
}

/**
 * A color object which holds the red, green, blue, and alpha values for a color.
 *
 * @param r Red value (0 to 255).
 * @param g Green value (0 to 255).
 * @param b Blue value (0 to 255).
 * @param a Alpha value (0 to 255).
 */
// @TODO Add validators on the constructor to ensure input values do not exceed limits.
function Color(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
}

/**
 * The toContextString function returns a string that can be assigned to the 2DCanvasContext's fillStyle and
 * strokeStyle properties to change its color.
 *
 * @returns {string} Example: 'rgb(0, 0, 0)'
 */
Color.prototype.toContextString = function() {
    return 'rgb(' + this.r + ', ' + this.g + ', ' + this.b + ')';
};

/**
 * The toDOMString function returns a string that can be assigned to the color control value property to change
 * its color.
 *
 * @returns {string} Example: '#000000'
 */
Color.prototype.toDOMString = function() {
    var result = '#';
    var val = 'r g b'.split(' ');

    for(var i = 0; i < val.length; i++) {
        var stub = '0' + this[val[i]].toString(16);
        result += stub.slice(-2);
    }

    return result;
};

/**
 * The color matcher tool detects the pixel color at the location of the mousedown event and sets the color control and
 * 2DCanvasContext color to the detected color.
 *
 * @param event The mousedown event which initialized the handler.
 * @param cx The 2DCanvasContext for the canvas in which the pixel color is to be detected.
 */
//@TODO Address the possible security exception.
tools['Color Matcher'] = function(event, cx) {
    var pos = relativePos(event, cx.canvas);
    var color = pixelColor(pos, cx);
    cx.fillStyle = cx.strokeStyle = color.toContextString();
    var picker = document.getElementById('color');
    picker.value = color.toDOMString();
};

/**
 * Returns a color object representing the r, g, b, a values at the supplied coordinate in the canvas of the supplied
 * 2DCanvasContext object.
 *
 * @param coord Location of the pixel of interest {{x: number, y: number}}.
 * @param cx The 2DCanvasContext of the canvas in which the pixel resides.
 * @returns {Color} Color object {{r: number, g: number, b: number, a: number}}.
 */
function pixelColor(coord, cx) {
    var data = cx.getImageData(coord.x, coord.y, 1, 1).data;
    return new Color(data[0], data[1], data[2], data[3])
}