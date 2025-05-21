/**
 * @param {Element} canvas. The canvas element to create a
 *     context from
 * @returns {WebGLRenderingContext} The created context
 */

function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

var vertices = [
    vec3(-0.5, -0.5, 0.5),
    vec3(-0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, -0.5, 0.5),
    vec3(-0.5, -0.5, -0.5),
    vec3(-0.5, 0.5, -0.5),
    vec3(0.5, 0.5, -0.5),
    vec3(0.5, -0.5, -0.5)
];

var indices = [
    0, 1, 1, 2, 2, 3, 3, 0,  // Front face
    4, 5, 5, 6, 6, 7, 7, 4,  // Back face
    0, 4, 1, 5, 2, 6, 3, 7   // Connecting edges
];

window.onload = function init() {
    var canvas = document.getElementById("webgl-canvas");
    var gl = setupWebGL(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Load vertices into WebGL
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Load indices into WebGL
    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    // Set up the orthographic projection matrix
    var uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    var uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");

    var projectionMatrix = ortho(-1, 1, -1, 1, -1, 1);
    var modelViewMatrix = mat4();

    // Isometric transformation: Rotate 45 degrees around the Y-axis
    modelViewMatrix = mult(modelViewMatrix, rotateY(45));

    // Then rotate 35.264 degrees around the X-axis
    modelViewMatrix = mult(modelViewMatrix, rotateX(35.264));

    // Pass the matrices to the shader
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));

    // Pass the matrices to the shader
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Draw the wireframe cube
    gl.drawElements(gl.LINES, indices.length, gl.UNSIGNED_SHORT, 0);
};