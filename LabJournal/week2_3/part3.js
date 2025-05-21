/**
 * @param {Element} canvas. The canvas element to create a
 *     context from
 * @returns {WebGLRenderingContext} The created context
 */

function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

var gl;
var index = 0;
var maxNumPoints = 1000;
var points = [];
var colors = [];
var mode = 'POINT'; // Default mode is point
var triangleVertices = []; // Store vertices for triangles

window.onload = function init() {

    var canvas = document.getElementById("webgl-canvas");  
    gl = setupWebGL(canvas);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Create a buffer to store vertex positions
    var pointBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);  
    gl.bufferData(gl.ARRAY_BUFFER, 8 * maxNumPoints, gl.STATIC_DRAW); // Preallocate space for positions

    // Create a buffer to store vertex colors
    var colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);  
    gl.bufferData(gl.ARRAY_BUFFER, 16 * maxNumPoints, gl.STATIC_DRAW); // Preallocate space for colors (RGBA = 4 floats = 16 bytes per color)

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Set up vertex position attribute
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Set up vertex color attribute
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0); // RGBA colors
    gl.enableVertexAttribArray(vColor);

    // Event listener for mouse clicks to add points and colors
    canvas.addEventListener("click", function(event) {
        var rect = event.target.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;

        var t = vec2(
            -1 + 2 * x / canvas.width,
            -1 + 2 * (canvas.height - y) / canvas.height
        );

        // Add the current selected color
        var color = hexToRGB(document.getElementById("colorPicker").value);

        if (mode === 'POINT') {
            // Add the point to the points array
            points.push(t);
            colors.push(color);

            // Update buffer data on GPU for the point and color
            gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 8 * index, flatten(t));

            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 16 * index, flatten(color));

            index++;
        } else if (mode === 'TRIANGLE') {
            // Store triangle vertices
            triangleVertices.push(t);
            colors.push(color);

            if (triangleVertices.length === 3) {
                // Once 3 vertices are selected, draw the triangle
                triangleVertices.forEach((vertex, i) => {
                    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
                    gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + i), flatten(vertex));

                    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
                    gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (index + i), flatten(colors[index + i]));
                });
                index += 3; // Increment by 3 since we added 3 vertices

                // Reset vertices array
                triangleVertices = [];
            }
        }

        render();
    });

    // Event listener to clear the canvas when the button is clicked
    var clearButton = document.getElementById("clearButton");
    clearButton.addEventListener("click", function() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        index = 0; // Reset point count
        points = []; // Clear points array
        colors = []; // Clear colors array
        triangleVertices = []; // Clear triangle vertices array
    });

    // Event listener for switching to triangle mode
    var triangleButton = document.getElementById("triangle-button");
    triangleButton.addEventListener("click", function() {
        mode = 'TRIANGLE';
        triangleButton.disabled = true;
        document.getElementById("point-button").disabled = false;
    });

    // Event listener for switching to point mode
    var pointButton = document.getElementById("point-button");
    pointButton.addEventListener("click", function() {
        mode = 'POINT';
        pointButton.disabled = true;
        document.getElementById("triangle-button").disabled = false;
    });

    render();
}

// Render function to draw the points or triangles
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (mode === 'POINT') {
        gl.drawArrays(gl.POINTS, 0, index);
    } else if (mode === 'TRIANGLE') {
        gl.drawArrays(gl.TRIANGLES, 0, index);
    }

    window.requestAnimationFrame(render);
}

// Utility function to convert hex color to RGBA for WebGL
function hexToRGB(hex) {
    var bigint = parseInt(hex.slice(1), 16);
    var r = ((bigint >> 16) & 255) / 255.0;
    var g = ((bigint >> 8) & 255) / 255.0;
    var b = (bigint & 255) / 255.0;
    return [r, g, b, 1.0];  // Return RGBA (alpha is always 1.0 for full opacity)
}
