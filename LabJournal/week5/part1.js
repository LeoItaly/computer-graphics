var canvas;
var gl;

var numTimesToSubdivide = 3; // Initial subdivision level
var maxSubdivisionLevel = 6;
var minSubdivisionLevel = 0;

var pointsArray = [];

var va = vec4(0.0, 0.0, 1.0, 1);
var vb = vec4(0.0, 0.942809, -0.333333, 1);
var vc = vec4(-0.816497, -0.471405, -0.333333, 1);
var vd = vec4(0.816497, -0.471405, -0.333333, 1);

var vBuffer;
var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

window.onload = init;

function triangle(a, b, c) {
    pointsArray.push(a);
    pointsArray.push(b);
    pointsArray.push(c);
}

function divideTriangle(a, b, c, count) {
    if (count > 0) {
        var ab = normalize(mix(a, b, 0.5), true);
        var ac = normalize(mix(a, c, 0.5), true);
        var bc = normalize(mix(b, c, 0.5), true);
        
        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(bc, c, ac, count - 1);
        divideTriangle(ab, bc, ac, count - 1);
    } else {
        triangle(a, b, c);
    }
}

function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(a, c, d, n);
    divideTriangle(a, d, b, n);
    divideTriangle(b, d, c, n);
}

function init() {
    canvas = document.getElementById("gl-canvas");
    
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }
    
    // Generate the sphere data
    pointsArray = [];
    tetrahedron(va, vb, vc, vd, numTimesToSubdivide);
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.5, 0.5, 1.0);
    
    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    
    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    
    // Create buffer for vertex positions
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    // Associate shader variables with data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    // Get uniform locations for matrices
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    
    // Event listeners for buttons
    document.getElementById("IncreaseSubdivision").onclick = function() {
        if (numTimesToSubdivide < maxSubdivisionLevel) {
            numTimesToSubdivide++;
            updateGeometry();
        }
    };
    
    document.getElementById("DecreaseSubdivision").onclick = function() {
        if (numTimesToSubdivide > minSubdivisionLevel) {
            numTimesToSubdivide--;
            updateGeometry();
        }
    };
    
    updateSubdivisionDisplay();
    render();
}

function updateSubdivisionDisplay() {
    document.getElementById("subdivisionLevelDisplay").textContent = "Current Subdivision Level: " + numTimesToSubdivide;
}

function updateGeometry() {
    pointsArray = [];
    tetrahedron(va, vb, vc, vd, numTimesToSubdivide);
    
    // Update buffer data
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    updateSubdivisionDisplay();
    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var eye = vec3(0.0, 0.0, 2.0);
    var at = vec3(0.0, 0.0, 0.0);
    var up = vec3(0.0, 1.0, 0.0);

    modelViewMatrix = lookAt(eye, at, up);
    var s = scalem(0.4, 0.4, 0.4); // Scale down the sphere
    modelViewMatrix = mult(modelViewMatrix, s);
    projectionMatrix = perspective(45.0, canvas.width / canvas.height, 0.1, 10.0);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, pointsArray.length);
}
