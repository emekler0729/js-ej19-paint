/**
 * Created by Eduard on 5/27/2017.
 */

function createElement(name, attributes) {
    var node = document.createElement(name);
    if(attributes) {
        for(var attr in attributes) {
            if(attributes.hasOwnProperty(attr)) {
                node.setAttribute(attr, attributes[attr]);
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

function setStyle(node, styles) {
    for(var style in styles) {
        if(styles.hasOwnProperty(style)) {
            node.style[style] = styles[style];
        }
    }
}

var controls = Object.create(null);

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

var tools = Object.create(null);

controls.tool = function(cx) {
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

function relativePos(event, canvas) {
    var rect = canvas.getBoundingClientRect();
    var xDelta = (rect.width - canvas.width) / 2;
    var yDelta = (rect.height - canvas.height) / 2;
    return {x: Math.floor(event.clientX - rect.left - xDelta),
            y: Math.floor(event.clientY - rect.top - yDelta)};
}

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

tools.Erase = function(event, cx) {
    cx.globalCompositeOperation = 'destination-out';
    tools.Line(event, cx, function() {
        cx.globalCompositeOperation = 'source-over';
    });
};

controls.color = function(cx) {
    var input = createElement('input', {type: 'color', id: 'color'});
    input.addEventListener('change', function() {
        cx.fillStyle = input.value;
        cx.strokeStyle = input.value;
    });
    return createElement('span', null, 'Color: ', input);
};

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

tools.Text = function(event, cx) {
    var text = prompt('Text:', "");
    if(text) {
        var pos = relativePos(event, cx.canvas);
        cx.font = Math.max(7, cx.lineWidth) + 'px sans-serif';
        cx.fillText(text, pos.x, pos.y);
    }
};

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

function randomPointInRadius(radius) {
    for(;;) {
        var x = Math.random() * 2 - 1;
        var y = Math.random() * 2 - 1;
        if(x * x + y * y <= 1) {
            return {x: x*radius, y: y * radius};
        }
    }
}

tools.Rectangle = function(event, cx) {
    var canvasStartPos = relativePos(event, cx.canvas);
    var pageStartPos = {x: event.clientX, y: event.clientY};
    var placeholder = createElement('div');
    setStyle(placeholder, {
        background: cx.fillStyle,
        position: 'absolute',
        left: pageStartPos.x + 'px',
        top: pageStartPos.y + 'px',
        width: '1px',
        height: '1px'
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

function rectangleFromPoints(a, b) {
    return {left: Math.min(a.x, b.x),
            top: Math.min(a.y, b.y),
            width: Math.abs(a.x - b.x),
            height: Math.abs(a.y - b.y)};
}

function keepInBounds(point, element) {
    var rect = element.getBoundingClientRect();
    var result = {};

    result.x = point.x < rect.left ? rect.left : point.x;
    result.x = point.x > rect.right ? rect.right : result.x;
    result.y = point.y < rect.top ? rect.top : point.y;
    result.y = point.y > rect.bottom ? rect.bottom : result.y;

    return result;
}

function Color(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
}

Color.prototype.toContextString = function() {
    return 'rgb(' + this.r + ', ' + this.g + ', ' + this.b + ')';
};

Color.prototype.toDOMString = function() {
    var result = '#';
    var val = 'r g b'.split(' ');

    for(var i = 0; i < val.length; i++) {
        var stub = '0' + this[val[i]].toString(16);
        result += stub.slice(-2);
    }

    return result;
};

tools.ColorMatcher = function(event, cx) {
    var color = pixelColor(event, cx);
    cx.fillStyle = cx.strokeStyle = color.toContextString();
    var picker = document.getElementById('color');
    picker.value = color.toDOMString();
};

function pixelColor(event, cx) {
    var pos = relativePos(event, cx.canvas);
    var data = cx.getImageData(pos.x, pos.y, 1, 1).data;
    return new Color(data[0], data[1], data[2], data[3])
}