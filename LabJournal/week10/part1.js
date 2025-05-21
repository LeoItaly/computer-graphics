/**
* @param {Element} canvas. The canvas element to create a context from.
* @return {WebGLRenderingContext} The created context.
*/
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

var wrappingMode;
var magFilteringMode;
var minFilteringMode;
var gl;
var quads;
var theta = 0.0;
var theta_2 = 0.0;
var update_theta_2 = true;
var update_theta = true;
var drawingInfo;

function createPlane() {
    // Define the plane vertices
    var vertices = [
        vec3(-2.0, -1.0,  -1.0),  // v0
        vec3( 2.0, -1.0,  -1.0),  // v1
        vec3( 2.0, -1.0, -5.0),  // v2
        vec3(-2.0, -1.0, -5.0),  // v3
    ];

    // Define the triangle indices
    var indices = new Uint32Array([
        0, 1, 2, // tri 1
        0, 2, 3, // tri 2
    ]);

    return {
        vertices: vertices,
        indices: indices
    };
}

function getMp(yl, yg) {
    var eps = 1e-4;
    var d = -(yl - (yg-eps))
    var Mp = mat4();
    Mp[3][1] = 1.0 / d;
    Mp[3][3] = 0.0;
    return Mp;
}

function initAttributeVariable(gl, attribute, buffer)
{
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(attribute);
}

window.onload = async function init() {
    var canvas = document.getElementById("webgl-canvas");
    gl = setupWebGL(canvas);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT); 
    var ext = gl.getExtension('OES_element_index_uint');
    if (!ext) { console.log('Warning: Unable to use an extension'); }
    gl.plane_program = initShaders(gl, "plane-vertex-shader", "plane-fragment-shader");
    gl.obj_program = initShaders(gl, "obj-vertex-shader", "obj-fragment-shader");
    gl.enable(gl.DEPTH_TEST);
    
    // camera
    var eye = vec3(0.0, 0.0, 0.0);
    var at = vec3(0.0, 0.0, 0.0);
    var up = vec3(0.0, 1.0, 0.0);
    var V = lookAt(eye, at, up);
    var fovy = 90;
    var aspect = canvas.width / canvas.height;
    var near = 0.1;  // Near clipping plane
    var far = 100.0; // Far clipping plane
    var P = perspective(fovy, aspect, near, far);
    
    // ------OBJECT--------
    gl.useProgram(gl.obj_program);

    var T = translate(0.0, -1.0, -3.0);
    var S = scalem(0.25, 0.25, 0.25);
    var M = mult(T,S);
    // Lighting
    var lightPos = vec4(0.0, 1.0, -1.0, 0.0);
    lightPosLoc = gl.getUniformLocation(gl.obj_program, "lightPos");
    gl.uniform4fv(lightPosLoc, flatten(lightPos));
    // Eye
    eyePosLoc = gl.getUniformLocation(gl.obj_program, "eyePos");
    gl.uniform3fv(eyePosLoc, flatten(eye));
    // Material Parameters
    let kdLoc = gl.getUniformLocation(gl.obj_program, "kd");
    let ksLoc = gl.getUniformLocation(gl.obj_program, "ks");
    let sLoc = gl.getUniformLocation(gl.obj_program, "s");
    let kd = vec3(1.0, 1.0, 1.0), ks = vec3(0.5, 0.5, 0.5), s = 50;
    // Light Parameters
    let leLoc = gl.getUniformLocation(gl.obj_program, "Le");
    let laLoc = gl.getUniformLocation(gl.obj_program, "La");
    let Le = vec3(1.0, 1.0, 1.0), La = vec3(0.2, 0.2, 0.2);
    // Set default uniforms
    gl.uniform3fv(kdLoc, kd);
    gl.uniform3fv(ksLoc, ks);
    gl.uniform1f(sLoc, s);
    gl.uniform3fv(leLoc, Le);
    gl.uniform3fv(laLoc, La);

    const obj_filename = "teapot.obj";
    drawingInfo = await readOBJFile(obj_filename, 1.0, true);

    gl.iObjBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.iObjBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(drawingInfo.indices), gl.STATIC_DRAW);

    gl.vObjBuffer = gl.createBuffer();
    gl.vObjBuffer.num = 4;
    gl.vObjBuffer.type = gl.FLOAT;
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.vObjBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(drawingInfo.vertices), gl.STATIC_DRAW);

    gl.nObjBuffer = gl.createBuffer();
    gl.nObjBuffer.num = 4;
    gl.nObjBuffer.type = gl.FLOAT;
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.nObjBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(drawingInfo.normals), gl.STATIC_DRAW);

    MLoc = gl.getUniformLocation(gl.obj_program, "M");
    VLoc = gl.getUniformLocation(gl.obj_program, "V");
    PLoc = gl.getUniformLocation(gl.obj_program, "P");
    gl.uniformMatrix4fv(VLoc, false, flatten(V));
    gl.uniformMatrix4fv(PLoc, false, flatten(P));
    gl.uniformMatrix4fv(MLoc, false, flatten(M));

    // ------PLANE--------
    gl.useProgram(gl.plane_program);

    // texture
    var image = document.createElement('img');
    image.crossorigin = 'anonymous';
    image.onload = function () {
        var texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        texLoc = gl.getUniformLocation(gl.plane_program, "texMap");
        gl.uniform1i(texLoc, 0);
        gl.generateMipmap(gl.TEXTURE_2D);
        render();
    };
    image.src = 'xamp23.png';
    // texture coord lookup
    var texCoords = [
        vec2(0.0, 0.0),
        vec2(0.0, 1.0),
        vec2(1.0, 1.0),
        vec2(1.0, 0.0) ];
    gl.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);
    gl.texCoordBuffer.type = gl.FLOAT;
    gl.texCoordBuffer.num = 2;
    
    // plane
    quads = createPlane();
    gl.iPlaneBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.iPlaneBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, quads.indices, gl.STATIC_DRAW);
    gl.vPlaneBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.vPlaneBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(quads.vertices), gl.STATIC_DRAW);
    gl.vPlaneBuffer.type = gl.FLOAT;
    gl.vPlaneBuffer.num = 3;
    
    MLoc = gl.getUniformLocation(gl.plane_program, "M");
    VLoc = gl.getUniformLocation(gl.plane_program, "V");
    PLoc = gl.getUniformLocation(gl.plane_program, "P");
    gl.uniformMatrix4fv(VLoc, false, flatten(V));
    gl.uniformMatrix4fv(PLoc, false, flatten(P));

    var I = mat4(); 
    var M = I;
    gl.uniformMatrix4fv(MLoc, false, flatten(M));

    // callbacks
    var levitatingCheckbox = document.getElementById("levitatingCheckbox");
    var lightCheckbox = document.getElementById("lightCheckbox");

    levitatingCheckbox.addEventListener("change", () => {
        update_theta_2 = levitatingCheckbox.checked;
    });
    lightCheckbox.addEventListener("change", () => {
        update_theta = lightCheckbox.checked;
    });
}

function render() {
    var speed = 10;

    var T = translate(0.0, Math.sin(theta_2)*0.75-0.25, -3.0);
    var S = scalem(0.25, 0.25, 0.25);
    var M = mult(T,S);
    var lp = vec4(0.0, 2.0, 2.0, 1.0);
    var T = translate(0.0, 0.0, -2.0);
    var R = rotateY(theta);
    var Ml = mult(T, R);
    var lp_world = mult(Ml, lp);
    var Mp = getMp(lp_world[1], -1.0);
    var Tpl = translate(lp_world[0], lp_world[1], lp_world[2]);
    var Tmpl = translate(-lp_world[0], -lp_world[1], -lp_world[2]);
    var Ms = mult(Tpl, mult(Mp, mult(Tmpl, M)));

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // ------PLANE--------
    // ground
    gl.useProgram(gl.plane_program);
    var MLoc = gl.getUniformLocation(gl.plane_program, "M");
    gl.uniformMatrix4fv(MLoc, false, flatten(mat4()));
    var visLoc = gl.getUniformLocation(gl.plane_program, "visibility");
    gl.uniform1f(visLoc, 1.0); 
    initAttributeVariable(gl, gl.getAttribLocation(gl.plane_program, "a_Position"), gl.vPlaneBuffer);
    initAttributeVariable(gl, gl.getAttribLocation(gl.plane_program, "vTexCoord"), gl.texCoordBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.iPlaneBuffer);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_INT, 0);

    // shadows
    gl.uniform1f(visLoc, 0.0);
    gl.depthFunc(gl.GREATER);
    gl.uniformMatrix4fv(MLoc, false, flatten(Ms));
    initAttributeVariable(gl, gl.getAttribLocation(gl.plane_program, "a_Position"), gl.vObjBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.iObjBuffer);
    gl.drawElements(gl.TRIANGLES, drawingInfo.indices.length, gl.UNSIGNED_INT, 0);

    gl.uniform1f(visLoc, 1.0);

    // // ------TEAPOT--------
    gl.useProgram(gl.obj_program);
    gl.depthFunc(gl.LESS);
    lightPosLoc = gl.getUniformLocation(gl.obj_program, "lightPos");
    gl.uniform4fv(lightPosLoc, flatten(lp_world));
    var MLoc = gl.getUniformLocation(gl.obj_program, "M");
    gl.uniformMatrix4fv(MLoc, false, flatten(M));
    initAttributeVariable(gl, gl.getAttribLocation(gl.obj_program, "a_Position"), gl.vObjBuffer);
    initAttributeVariable(gl, gl.getAttribLocation(gl.obj_program, "a_Normal"), gl.nObjBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.iObjBuffer);
    gl.drawElements(gl.TRIANGLES, drawingInfo.indices.length, gl.UNSIGNED_INT, 0);

    if (update_theta) { theta += 0.5; }
    if (update_theta_2) { theta_2 += 0.03; }

    setTimeout(
        function () {requestAnimFrame( render );},
        speed
    );
}
