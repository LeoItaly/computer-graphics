function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

var gl;
var drawingInfo;

function initAttributeVariable(gl, attribute, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(attribute);
}

window.onload = async function init() {
    var canvas = document.getElementById("webgl-canvas");
    gl = setupWebGL(canvas);

    if (!gl) {
        console.error('Failed to get WebGL context.');
        return;
    }

    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.enable(gl.DEPTH_TEST);

    var ext = gl.getExtension('OES_element_index_uint');
    if (!ext) {
        console.warn('Warning: OES_element_index_uint extension not available.');
    }

    // Initialize shaders
    var program = initShaders(gl, "obj-vertex-shader", "obj-fragment-shader");
    gl.useProgram(program);

    // Set up camera
    var eye = vec3(0.0, 0.0, 5.0); // Move the camera back
    var at = vec3(0.0, 0.0, 0.0);  // Look at the origin
    var up = vec3(0.0, 1.0, 0.0);
    var V = lookAt(eye, at, up);
    var fovy = 60.0; // Increased field of view
    var aspect = canvas.width / canvas.height;
    var near = 0.1;
    var far = 100.0;
    var P = perspective(fovy, aspect, near, far);

    // Model matrix: Scale and translate
    var S = scalem(0.50, 0.50, 0.50); // Scale down the object
    var T = translate(0.0, -0.5, -3.0); // Move the object into view
    var M = mult(T, S);

    // Lighting
    var lightPos = vec4(0.0, 1.0, 1.0, 0.0); // Directional light
    gl.uniform4fv(gl.getUniformLocation(program, "lightPos"), flatten(lightPos));

    // Eye position
    gl.uniform3fv(gl.getUniformLocation(program, "eyePos"), flatten(eye));

    // Material parameters
    var kd = vec3(1.0, 1.0, 1.0);
    var ks = vec3(0.5, 0.5, 0.5);
    var s = 50.0;
    gl.uniform3fv(gl.getUniformLocation(program, "kd"), flatten(kd));
    gl.uniform3fv(gl.getUniformLocation(program, "ks"), flatten(ks));
    gl.uniform1f(gl.getUniformLocation(program, "s"), s);

    // Light parameters
    var Le = vec3(1.0, 1.0, 1.0);
    var La = vec3(0.2, 0.2, 0.2);
    gl.uniform3fv(gl.getUniformLocation(program, "Le"), flatten(Le));
    gl.uniform3fv(gl.getUniformLocation(program, "La"), flatten(La));

    // Load the object
    var obj_filename = "teapot.obj";
    drawingInfo = await readOBJFile(obj_filename, 1.0, true);

    if (!drawingInfo) {
        console.error('Failed to read the OBJ file');
        return;
    }

    // Log the drawing info to verify loading
    console.log('Vertices loaded:', drawingInfo.vertices.length);
    console.log('Indices loaded:', drawingInfo.indices.length);
    console.log('Normals loaded:', drawingInfo.normals.length);

    // Set up buffers
    gl.iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(drawingInfo.indices), gl.STATIC_DRAW);

    gl.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(drawingInfo.vertices), gl.STATIC_DRAW);
    gl.vBuffer.num = 4;
    gl.vBuffer.type = gl.FLOAT;

    gl.nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(drawingInfo.normals), gl.STATIC_DRAW);
    gl.nBuffer.num = 4;
    gl.nBuffer.type = gl.FLOAT;

    // Pass matrices to shaders
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "M"), false, flatten(M));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "V"), false, flatten(V));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "P"), false, flatten(P));

    // Start rendering
    render(program);
};

function render(program) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Use the program
    gl.useProgram(program);

    // Bind attribute buffers
    initAttributeVariable(gl, gl.getAttribLocation(program, "a_Position"), gl.vBuffer);
    initAttributeVariable(gl, gl.getAttribLocation(program, "a_Normal"), gl.nBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.iBuffer);

    // Draw the object
    gl.drawElements(gl.TRIANGLES, drawingInfo.indices.length, gl.UNSIGNED_INT, 0);
}
