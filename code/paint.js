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

function relativePos(event, element) {
    var rect = element.getBoundingClientRect();
    return {x: Math.floor(event.clientX - rect.left),
            y: Math.floor(event.clientY - rect.top)};
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
    var input = createElement('input', {type: 'color'});
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