// Initialize WebGL
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL not supported in this browser.");
    throw new Error("WebGL not supported");
}

// vertex shader
const vertexShaderSource = `
    attribute vec3 aPosition;
    attribute vec3 aColor;
    varying vec3 vColor;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uModelViewMatrix;
    void main() {
        vColor = aColor;
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
    }
`;

// fragment shader
const fragmentShaderSource1 = `
    precision mediump float;
    varying vec3 vColor;
    void main() {
        gl_FragColor = vec4(vColor, 1.0); // Gradient color
    }
`;

const fragmentShaderSource2 = `
    precision mediump float;
    varying vec3 vColor;
    void main() {
        gl_FragColor = vec4(vColor.r, vColor.r, vColor.r, 1.0); // Grayscale effect
    }
`;

// helper function for creating a shader
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// helper function to create a WebGL program
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program linking error:", gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

// this is a function to create a program with the current fragment shader
function createCurrentProgram(fragmentShaderSource) {
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    return createProgram(gl, vertexShader, fragmentShader);
}

// creating vertex shader
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);

// initial fragment shader
let currentFragmentShaderSource = fragmentShaderSource1;
let program = createCurrentProgram(currentFragmentShaderSource);
gl.useProgram(program);

// triangle vertices showing colors
const vertices = new Float32Array([
    // Positions       // Colors (R, G, B)
    0.0,  0.5,  0.0,   1.0, 0.0, 0.0,  // Top (Red)
    -0.5, -0.5,  0.0,   0.0, 1.0, 0.0,  // Bottom-left (Green)
    0.5, -0.5,  0.0,   0.0, 0.0, 1.0   // Bottom-right (Blue)
]);

// create buffer and bind data
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// setting up position attribute
const aPosition = gl.getAttribLocation(program, "aPosition");
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
gl.enableVertexAttribArray(aPosition);

// setting up color attribute
const aColor = gl.getAttribLocation(program, "aColor");
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
gl.enableVertexAttribArray(aColor);

// uniform locations
let uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
let uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");

// helper functions for LookAt and Ortho
function lookAt(eye, at, up) {
    const zAxis = normalize(subtract(eye, at));
    const xAxis = normalize(cross(up, zAxis));
    const yAxis = cross(zAxis, xAxis);

    return new Float32Array([
        xAxis[0], yAxis[0], zAxis[0], 0,
        xAxis[1], yAxis[1], zAxis[1], 0,
        xAxis[2], yAxis[2], zAxis[2], 0,
        -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1
    ]);
}

function ortho(left, right, bottom, top, near, far) {
    return new Float32Array([
        2 / (right - left), 0, 0, 0,
        0, 2 / (top - bottom), 0, 0,
        0, 0, -2 / (far - near), 0,
        -(right + left) / (right - left), -(top + bottom) / (top - bottom), -(far + near) / (far - near), 1
    ]);
}

// vector math helper functions
function normalize(v) {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    return v.map((x) => x / len);
}

function subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// initialize zoom and view parameters
let zoom = 5;
const eye = [0, 0, zoom];
const at = [0, 0, 0];
const up = [0, 1, 0];

// render function
function render() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Black background
    gl.clear(gl.COLOR_BUFFER_BIT);

    // update LookAt matrix
    const modelViewMatrix = lookAt(eye, at, up);

    // update orthographic projection
    const projectionMatrix = ortho(
        -zoom, zoom,  // Left, Right
        -zoom, zoom,  // Bottom, Top
        -10, 10       // Near, Far
    );

    // send matrices to shaders
    gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

    // draw triangle
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// handle slider input for zoom
document.getElementById("zoomSlider").oninput = function (event) {
    zoom = parseFloat(event.target.value);
    eye[2] = zoom; // Adjust the camera position along the Z-axis
    render();
};

// handle shader toggle
document.getElementById("toggleShader").onclick = function () {
    currentFragmentShaderSource = currentFragmentShaderSource === fragmentShaderSource1
        ? fragmentShaderSource2
        : fragmentShaderSource1;

    // recreating the program with new shader
    program = createCurrentProgram(currentFragmentShaderSource);
    gl.useProgram(program);

    // update uniform locations
    uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");

    // update attributes
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.enableVertexAttribArray(aPosition);

    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(aColor);

    render();
};

// initial render
render();
