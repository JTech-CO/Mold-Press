(function (M) {
  'use strict';
  const V = M.V;
  const { matrix, identity, mul } = M.RenderMath;
  class RawRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl =
        canvas.getContext('webgl2', {
          antialias: true,
          preserveDrawingBuffer: true,
          alpha: false
        }) ||
        canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true, alpha: false });
      this.cache = new Map();
      if (!this.gl) {
        this.ctx = canvas.getContext('2d');
        this.name = 'Canvas 3D';
        return;
      }
      this.name = 'WebGL · local';
      const gl = this.gl;
      const vs = `attribute vec3 aPosition; attribute vec3 aNormal; uniform mat4 uVP; uniform mat4 uModel; uniform mat3 uNormal; varying vec3 vN; varying vec3 vP; varying vec3 vSurfacePosition; void main(){vSurfacePosition=aPosition;vec4 p=uModel*vec4(aPosition,1.);vP=p.xyz;vN=normalize(uNormal*aNormal);gl_Position=uVP*p;}`;
      const fs = `precision highp float;${M.surfaceGLSL}varying vec3 vN;varying vec3 vP;uniform vec3 uColor;uniform vec3 uEye;uniform float uAlpha;uniform float uRough;uniform float uMetal;uniform float uLine;void main(){float finish=mpSurface(vSurfacePosition);float rough=clamp(uRough+finish*uSurface.w,.045,1.);vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 l=normalize(vec3(-.4,-.8,1.2));vec3 l2=normalize(vec3(.8,.2,.6));float diff=max(dot(n,l),0.);float fill=max(dot(n,l2),0.);vec3 view=normalize(uEye-vP);float spec=pow(max(dot(n,normalize(l+view)),0.),mix(110.,8.,rough))*(.24+.6*uMetal);float rim=pow(1.-max(dot(n,view),0.),3.)*.12;vec3 color=uColor*(1.+finish*uSurface.y)*(.36+.51*diff+.25*fill)+vec3(spec+rim);if(uLine>.5)color=uColor;gl_FragColor=vec4(color,uAlpha);}`;
      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
        return s;
      };
      this.program = gl.createProgram();
      gl.attachShader(this.program, compile(gl.VERTEX_SHADER, vs));
      gl.attachShader(this.program, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(this.program));
      this.u = {};
      for (const n of [
        'VP',
        'Model',
        'Normal',
        'Color',
        'Eye',
        'Alpha',
        'Rough',
        'Metal',
        'Line',
        'Surface'
      ])
        this.u[n] = gl.getUniformLocation(this.program, 'u' + n);
      this.aP = gl.getAttribLocation(this.program, 'aPosition');
      this.aN = gl.getAttribLocation(this.program, 'aNormal');
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    resize(w, h) {
      const ratio = Math.min(devicePixelRatio || 1, 1.75);
      this.canvas.width = Math.round(w * ratio);
      this.canvas.height = Math.round(h * ratio);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
    }
    render(records, camera) {
      if (!this.gl) {
        this.paint(records, camera);
        return;
      }
      const gl = this.gl;
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0.059, 0.075, 0.089, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.program);
      gl.uniformMatrix4fv(this.u.VP, false, camera.vp);
      gl.uniform3fv(this.u.Eye, camera.eye);
      const sorted = records
        .slice()
        .sort(
          (a, b) =>
            ((a.alpha ?? 1) < 0.99 ? 1 : 0) - ((b.alpha ?? 1) < 0.99 ? 1 : 0) ||
            ((a.alpha ?? 1) < 0.99
              ? V.dot(V.sub(b.pos || [0, 0, 0], camera.eye), camera.forward) -
                V.dot(V.sub(a.pos || [0, 0, 0], camera.eye), camera.forward)
              : 0)
        );
      for (const r of sorted) {
        if (r.alpha <= 0) continue;
        const key = r.geo + (r.lines ? 'line' : 'mesh');
        let c = this.cache.get(key);
        if (!c) {
          const p = M.unpack(r.geo),
            n = r.lines ? new Float32Array(p.length).fill(1) : M.normals(p);
          c = { pos: gl.createBuffer(), normal: gl.createBuffer(), count: p.length / 3 };
          gl.bindBuffer(gl.ARRAY_BUFFER, c.pos);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(p), gl.STATIC_DRAW);
          gl.bindBuffer(gl.ARRAY_BUFFER, c.normal);
          gl.bufferData(gl.ARRAY_BUFFER, n, gl.STATIC_DRAW);
          this.cache.set(key, c);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, c.pos);
        gl.vertexAttribPointer(this.aP, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.aP);
        gl.bindBuffer(gl.ARRAY_BUFFER, c.normal);
        gl.vertexAttribPointer(this.aN, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.aN);
        const sc = r.scale || [1, 1, 1],
          nm = matrix(
            [0, 0, 0],
            r.rot || [0, 0, 0],
            sc.map((s) => 1 / (s || 0.001))
          );
        gl.uniformMatrix4fv(
          this.u.Model,
          false,
          matrix(r.pos || [0, 0, 0], r.rot || [0, 0, 0], sc)
        );
        gl.uniformMatrix3fv(
          this.u.Normal,
          false,
          new Float32Array([nm[0], nm[1], nm[2], nm[4], nm[5], nm[6], nm[8], nm[9], nm[10]])
        );
        gl.uniform3fv(this.u.Color, M.hex(r.color || '#a8b3b9'));
        gl.uniform1f(this.u.Alpha, r.alpha ?? 1);
        gl.uniform1f(this.u.Rough, r.rough ?? 0.4);
        gl.uniform1f(this.u.Metal, r.metal ?? 0);
        gl.uniform1f(this.u.Line, r.lines ? 1 : 0);
        gl.uniform4fv(this.u.Surface, r.surface || M.finishes.none);
        gl.depthMask((r.alpha ?? 1) >= 0.99);
        if (r.lines) {
          gl.depthFunc(gl.LEQUAL);
          gl.drawArrays(gl.LINES, 0, c.count);
        } else {
          gl.enable(gl.POLYGON_OFFSET_FILL);
          gl.polygonOffset(1, 1);
          gl.drawArrays(gl.TRIANGLES, 0, c.count);
          gl.disable(gl.POLYGON_OFFSET_FILL);
        }
      }
      gl.depthMask(true);
      if (this.cache.size > 180) {
        for (const [key, v] of [...this.cache].slice(0, 80)) {
          gl.deleteBuffer(v.pos);
          gl.deleteBuffer(v.normal);
          this.cache.delete(key);
        }
      }
    }

    dispose() {
      if (this.gl) {
        for (const c of this.cache.values()) {
          this.gl.deleteBuffer(c.pos);
          this.gl.deleteBuffer(c.normal);
        }
        this.gl.deleteProgram(this.program);
      }
    }
  }
  M.Renderers.Raw = RawRenderer;
})(window.MP);
