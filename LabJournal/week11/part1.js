// @ts-nocheck
/**
 * @param {Element} canvas The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

function createEmptyArrayBuffer(gl, a_attribute, num, type) {
    var buffer = gl.createBuffer(); // Create a buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute); // Enable the assignment
    return buffer;
}

function initVertexBuffers(gl, program) {
    return {
        vertexBuffer: createEmptyArrayBuffer(gl, program.a_Position, 3, gl.FLOAT),
        normalBuffer: createEmptyArrayBuffer(gl, program.a_Normal, 3, gl.FLOAT),
        colorBuffer: createEmptyArrayBuffer(gl, program.a_Color, 4, gl.FLOAT),
        indexBuffer: gl.createBuffer()
    }
}

function context() {

    var g_objDoc = null; // The information of OBJ file
    var g_drawingInfo = null; // The information for drawing 3D model

    // OBJ file has been read
    function onReadOBJFile(fileString, fileName, scale, reverse) {
        var objDoc = new OBJDoc(fileName); // Create a OBJDoc object
        var result = objDoc.parse(fileString, scale, reverse);

        if (!result) {
            g_objDoc = null;
            g_drawingInfo = null;
            console.log("OBJ file parsing error");
        } else {
            g_objDoc = objDoc;
        }
    }

    async function readOBJFile(fileName, scale, reverse) {
        fetch(fileName).then(x => x.text()).then(x => {
            onReadOBJFile(x, fileName, scale, reverse);
        }).catch(err => console.log(err));
    }

    // OBJ File has been read completely
    function onReadComplete(gl, model, objDoc) {

        // Acquire the vertex coordinates and colors from OBJ file
        var drawingInfo = objDoc.getDrawingInfo();
        // Write date into the buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);

        // Write the indices to the buffer object
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

        return drawingInfo;
    }

    // Prepare WebGL
    var canvas = document.getElementById("canvas1");
    var gl = setupWebGL(canvas);

    // Load shaders
    var program = initShaders(gl, "vertex-shader-1", "fragment-shader-1");
    gl.useProgram(program);

    program.a_Position = gl.getAttribLocation(program, 'a_Position');
    program.a_Normal = gl.getAttribLocation(program, 'a_Normal');
    program.a_Color = gl.getAttribLocation(program, 'a_Color');

    var model = initVertexBuffers(gl, program);
    readOBJFile('monkey.obj', 1, false);

    //Event handlers
    var dragging = false;
    var lastX, lastY;
    var currentAngle = [0, 0];

    canvas.onmousedown = ev => {
        let x = ev.clientX,
            y = ev.clientY;

        // Start dragging if a mouse is in <canvas>
        var rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            dragging = true;
            lastX = x;
            lastY = y;
        }
    };

    canvas.onmouseup = () => {
        dragging = false;
    };

    canvas.onmouseleave = () => {
        dragging = false;
    };

    canvas.onmousemove = ev => {
        let x = ev.clientX,
            y = ev.clientY;
        if (dragging) {
            var factor = 100 / canvas.height; // The rotation ratio
            var dx = factor * (x - lastX);
            var dy = factor * (y - lastY);
            // Limit x-axis rotation angle to -90 to 90 degrees
            currentAngle[0] = Math.max(Math.min(currentAngle[0] + dy, 90.0), -90.0);
            currentAngle[1] = currentAngle[1] + dx;
        }
        lastX = x, lastY = y;
    };

    function render() {
        // background
        gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // view
        var modelViewMatrix = [
            translate(0, -1, -10),
            rotateY(-currentAngle[1]),
            rotateX(-currentAngle[0]),
        ].reduce(mult);

        var perspectiveMatrix = perspective(45, 1, 1, 100);

        {
            let uLocation = gl.getUniformLocation(program, 'modelView');
            gl.uniformMatrix4fv(uLocation, false, flatten(modelViewMatrix));
        } {
            let uLocation = gl.getUniformLocation(program, 'perspectiveMatrix');
            gl.uniformMatrix4fv(uLocation, false, flatten(perspectiveMatrix));
        }

        if (!g_drawingInfo && g_objDoc && g_objDoc.isMTLComplete()) {
            // OBJ and all MTLs are available
            g_drawingInfo = onReadComplete(gl, model, g_objDoc);
            console.log("g_drawingInfo set!");
            console.log(g_drawingInfo.indices.length);
        }

        if (!g_drawingInfo) {
            console.log('waiting');
            window.requestAnimationFrame(render);
            return;
        };

        var uniforms = {
            'Ka': 0.2,
            'Kd': 0.8,
            'Ks': 1,
            'shininess': 5,
            'emission': vec3(1, .5, .2)
        };

        for (key in uniforms) {
            let uLocation = gl.getUniformLocation(program, key);
            gl.uniform1f(uLocation, uniforms[key]);
        }

        {
            let uLocation = gl.getUniformLocation(program, 'lightEmission');
            gl.uniform3fv(uLocation, uniforms['emission']);
        }

        // points
        gl.drawElements(gl.TRIANGLES, g_drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
        window.requestAnimationFrame(render);
    }

    gl.enable(gl.DEPTH_TEST);

    window.requestAnimationFrame(render);
}

context()