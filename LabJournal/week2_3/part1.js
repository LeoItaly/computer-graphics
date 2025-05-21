/**
 * @param {Element} canvas. The canvas element to create a
 *     context from
 * @returns {WebGLRenderingContext} The created context
 */

function setupWebGL(canvas){
    return WebGLUtils.setupWebGL(canvas);
}
var gl;
var index = 0;
window.onload = function init(){
    
    var canvas = document.getElementById("webgl-canvas");  
    gl = setupWebGL(canvas);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //We start by creating a vertex buffer object (VBO) on the GPU in init and later place our data in that object. 
    var buffer = gl.createBuffer(); // creates the buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer); // gl.ARRAY_BUFFER parameter indicates that the data in the buffer will be vertex attribute data rather than indices to the data.    
    gl.bufferData(gl.ARRAY_BUFFER, 8 * 1000, gl.STATIC_DRAW);

    //  Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);



    // Add event listener to handle mouse clicks
    canvas.addEventListener("click", function(event) {

        var rect = event.target.getBoundingClientRect();

        x = event.clientX - rect.left;
        y = event.clientY - rect.top

        var t = vec2(
            -1 + 2 * x / canvas.width,
            -1 + 2 * (canvas.height - y) / canvas.height
        );

        // Place the point in the buffer on the GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 8 * index, flatten(t)); 
        index++;

        render();

    });

    render();
}

function render(){
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, index);
    window.requestAnimationFrame(render);
}
