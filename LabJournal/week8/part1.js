var canvas = document.getElementById("gl-canvas");

var cubemap = [
    'textures/cm_right.png',   // POSITIVE_X
    'textures/cm_left.png',    // NEGATIVE_X
    'textures/cm_top.png',     // POSITIVE_Y
    'textures/cm_bottom.png',  // NEGATIVE_Y
    'textures/cm_back.png',    // POSITIVE_Z
    'textures/cm_front.png'    // NEGATIVE_Z
];

// Load images and initialize when done
loadImages(cubemap, init);

function loadImages(urls, callback) {
    var images = [];
    var imagesToLoad = urls.length;

    // Called each time an image finishes loading.
    var onImageLoad = function() {
        --imagesToLoad;
        if (imagesToLoad == 0) {
            callback(images);
        }
    };

    for (var i = 0; i < urls.length; ++i) {
        var image = new Image();
        images.push(image);
        image.onload = onImageLoad;
        image.src = urls[i];
    }
}

function init(images) {
    var light = vec3(0, 2, 2);
    var at = vec3(0, 0, 0);
    var eye = vec3(0, 0, 2); // Adjusted eye position for frontal view
    var up = vec3(0, 1, 0);
    var fovy = 65;
    var aspect = canvas.width / canvas.height;
    var near = 0.1;
    var far = 30;
    
    var viewMatrix = lookAt(eye, at, up);
    var projectionMatrix = perspective(fovy, aspect, near, far);
    
    var tetrahedron = generateTetrahedron(6);

    var positions = [].concat(tetrahedron);

    var gl = WebGLUtils.setupWebGL(canvas);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    var program = initShaders(gl, "vertex-shader", "fragment-shader");

    // Setup shader and buffer data
    gl.useProgram(program);
    var programInfo = {
        a_position_model: {
            location: gl.getAttribLocation(program, 'a_position_model'),
            buffer: gl.createBuffer()
        },
        u_mvp: gl.getUniformLocation(program, 'u_mvp'),
        u_texture: gl.getUniformLocation(program, 'u_texture'),
        u_eye_camera: gl.getUniformLocation(program, 'u_eye_camera'),
        u_light_camera: gl.getUniformLocation(program, 'u_light_camera')
    };

    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.a_position_model.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
    
    var cubeTexture = createCubeMap(gl, images);

    // Activate texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
    gl.uniform1i(programInfo.u_texture, 0);
    gl.uniform3fv(programInfo.u_light_camera, flatten(normalize(matrixVectorMult(projectionMatrix, light))));
    
    var phi = 0;
    var isSpinning = false; // Initially not spinning

    // Add event listener for the 'Go' button
    document.getElementById('go-button').addEventListener('click', function() {
        isSpinning = true;
    });
    
    requestAnimationFrame(function render() {
        if (isSpinning) {
            phi += 0.01;
            eye[0] = Math.sin(phi) * 2;
            eye[2] = Math.cos(phi) * 2;
        }
        viewMatrix = lookAt(eye, at, up);
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // DRAW SPHERE
        gl.useProgram(program);
        enableProgram(gl, programInfo);
        gl.uniform3fv(programInfo.u_eye_camera, flatten(normalize(matrixVectorMult(projectionMatrix, eye))));
        
        gl.uniformMatrix4fv(programInfo.u_mvp, false, flatten(mult(projectionMatrix, viewMatrix)));
        gl.drawArrays(gl.TRIANGLES, 0, positions.length);
        
        requestAnimationFrame(render);
    })
}


function createCubeMap(gl, images) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    
    var targets = [
        gl.TEXTURE_CUBE_MAP_POSITIVE_X, // POSITIVE_X
        gl.TEXTURE_CUBE_MAP_NEGATIVE_X, // NEGATIVE_X
        gl.TEXTURE_CUBE_MAP_POSITIVE_Y, // POSITIVE_Y
        gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, // NEGATIVE_Y
        gl.TEXTURE_CUBE_MAP_POSITIVE_Z, // POSITIVE_Z
        gl.TEXTURE_CUBE_MAP_NEGATIVE_Z  // NEGATIVE_Z
    ];
    
    for (var i = 0; i < 6; i++) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // Flip images vertically
        gl.texImage2D(targets[i], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[i]);
    }
    
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    return texture;
}

function divideTriangle (points, subdivs, a, b, c) {
  if (subdivs > 0) {
    var ab = normalize(mix(a, b, 0.5));
    var ac = normalize(mix(a, c, 0.5));
    var bc = normalize(mix(b, c, 0.5));

    subdivs -= 1;
    divideTriangle(points, subdivs, a, ab, ac);
    divideTriangle(points, subdivs, ab, b, bc);
    divideTriangle(points, subdivs, bc, c, ac);
    divideTriangle(points, subdivs, ab, bc, ac);
  } else {
    points.push(a);
    points.push(b);
    points.push(c);
  }
}

function generateTetrahedron (subdivs) {
    var a = vec3(0.0, 0.0, -1.0);
    var b = vec3(0.0, 0.942809, 0.333333);
    var c = vec3(-0.816497, -0.471405, 0.333333);
    var d = vec3(0.816497, -0.471405, 0.333333);
    var points = [];
    divideTriangle(points, subdivs, a, b, c);
    divideTriangle(points, subdivs, d, c, b);
    divideTriangle(points, subdivs, a, d, b);
    divideTriangle(points, subdivs, a, c, d);
    return points;
}

function matrixVectorMult(A, x) {
    var Ax = [];
    for (var i = 0; i < x.length; i++) {
        var sum = 0;
        for (var j = 0; j < x.length; j++) {
            sum += A[j][i] * x[i];
        }
        Ax.push(sum);
    }
    return Ax;
}

function enableProgram(gl, programInfo) {
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.a_position_model.buffer);
    gl.enableVertexAttribArray(programInfo.a_position_model.location);
    gl.vertexAttribPointer(programInfo.a_position_model.location, 3, gl.FLOAT, false, 0, 0);
}
