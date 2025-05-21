var canvas = document.getElementById("gl-canvas");

// Image file names
var imagesToLoad = [
    'textures/cm_right.png',   // POSITIVE_X
    'textures/cm_left.png',    // NEGATIVE_X
    'textures/cm_top.png',     // POSITIVE_Y
    'textures/cm_bottom.png',  // NEGATIVE_Y
    'textures/cm_back.png',    // POSITIVE_Z
    'textures/cm_front.png',   // NEGATIVE_Z
    'textures/normalmap.png'   // Normal map texture
];

// Load images and initialize when done
loadImages(imagesToLoad, init);

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
    // Cube map images are the first six images
    var cubemapImages = images.slice(0, 6);
    var normalMapImage = images[6];

    var eye = vec3(0, 0, 2); // Fixed camera position
    var at = vec3(0, 0, 0);
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
        u_model: gl.getUniformLocation(program, 'u_model'),
        u_mvp: gl.getUniformLocation(program, 'u_mvp'),
        u_texture: gl.getUniformLocation(program, 'u_texture'),
        u_normalMap: gl.getUniformLocation(program, 'u_normalMap'),
        u_eye_world: gl.getUniformLocation(program, 'u_eye_world'),
        reflective: gl.getUniformLocation(program, 'reflective')
    };

    // Sphere buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.a_position_model.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    // Background quad positions
    var backgroundQuadPositions = [
        vec4(-1, -1, 0.999, 1),
        vec4(1, -1, 0.999, 1),
        vec4(1, 1, 0.999, 1),
        vec4(-1, -1, 0.999, 1),
        vec4(1, 1, 0.999, 1),
        vec4(-1, 1, 0.999, 1)
    ];

    // Background quad buffer
    var backgroundQuadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, backgroundQuadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(backgroundQuadPositions), gl.STATIC_DRAW);

    var cubeTexture = createCubeMap(gl, cubemapImages);
    var normalMapTexture = create2DTexture(gl, normalMapImage);

    // Activate texture unit 0 for cube map
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
    gl.uniform1i(programInfo.u_texture, 0);

    // Activate texture unit 1 for normal map
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, normalMapTexture);
    gl.uniform1i(programInfo.u_normalMap, 1);

    // Variables for controlling rotation
    var isSpinning = false; // Initially not spinning
    var theta = 0; // Rotation angle in degrees

    // Event listeners for 'Go' and 'Stop' buttons
    document.getElementById('go-button').addEventListener('click', function() {
        isSpinning = true;
    });

    document.getElementById('stop-button').addEventListener('click', function() {
        isSpinning = false;
    });

    requestAnimationFrame(function render() {
        // Camera remains stationary
        viewMatrix = lookAt(eye, at, up);

        // Update rotation angle if spinning
        if (isSpinning) {
            theta += 1; // Adjust rotation speed as needed
        }

        // Convert theta to radians for rotation
        var thetaRad = radians(theta);

        // Create rotation matrix for the sphere
        var rotationMatrix = rotateY(thetaRad);

        // Define the scaling factor and model matrix for the sphere
        var sphereScale = 0.5; // Adjust the scale factor as needed
        var scaleMatrix = scalem(sphereScale, sphereScale, sphereScale);

        // Combine rotation and scaling to form the sphere's model matrix
        var modelMatrix = mult(rotationMatrix, scaleMatrix);

        // Compute the model-view-projection matrix for the sphere
        var mvpMatrix = mult(projectionMatrix, mult(viewMatrix, modelMatrix));

        // Recompute M_tex for background quad
        var inverseProjectionMatrix = inverse(projectionMatrix);

        var rotViewMatrix = mat4(
            viewMatrix[0][0], viewMatrix[0][1], viewMatrix[0][2], 0,
            viewMatrix[1][0], viewMatrix[1][1], viewMatrix[1][2], 0,
            viewMatrix[2][0], viewMatrix[2][1], viewMatrix[2][2], 0,
            0, 0, 0, 1
        );
        var inverseRotViewMatrix = inverse(rotViewMatrix);

        var M_tex_background = mult(inverseRotViewMatrix, inverseProjectionMatrix);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // DRAW BACKGROUND QUAD
        gl.useProgram(program);

        // Bind background quad buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, backgroundQuadBuffer);
        gl.enableVertexAttribArray(programInfo.a_position_model.location);
        gl.vertexAttribPointer(programInfo.a_position_model.location, 4, gl.FLOAT, false, 0, 0);

        // Set uniforms for background quad
        gl.uniformMatrix4fv(programInfo.u_model, false, flatten(mat4())); // Identity matrix
        gl.uniformMatrix4fv(programInfo.u_mvp, false, flatten(mat4())); // Identity matrix
        gl.uniform1i(programInfo.reflective, false); // Background is not reflective

        // Draw background quad
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // DRAW SPHERE
        // Bind sphere buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.a_position_model.buffer);
        gl.enableVertexAttribArray(programInfo.a_position_model.location);
        gl.vertexAttribPointer(programInfo.a_position_model.location, 4, gl.FLOAT, false, 0, 0);

        // Set uniforms for the sphere
        gl.uniformMatrix4fv(programInfo.u_model, false, flatten(modelMatrix));
        gl.uniformMatrix4fv(programInfo.u_mvp, false, flatten(mvpMatrix));
        gl.uniform3fv(programInfo.u_eye_world, flatten(eye));
        gl.uniform1i(programInfo.reflective, true); // Sphere is reflective

        // Activate texture unit 1 for the normal map
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, normalMapTexture);
        gl.uniform1i(programInfo.u_normalMap, 1);

        // Draw sphere
        gl.drawArrays(gl.TRIANGLES, 0, positions.length);

        requestAnimationFrame(render);
    });
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

function create2DTexture(gl, image) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // Flip images vertically
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    gl.generateMipmap(gl.TEXTURE_2D);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); // or gl.CLAMP_TO_EDGE
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
}

function divideTriangle(points, subdivs, a, b, c) {
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
        points.push(vec4(a, 1.0));
        points.push(vec4(b, 1.0));
        points.push(vec4(c, 1.0));
    }
}

function generateTetrahedron(subdivs) {
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
