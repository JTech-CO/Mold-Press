(function (M) {
  'use strict';
  const V = M.V;
  const { matrix, identity, mul } = M.RenderMath;
  Object.assign(M.Viewport.prototype, {
    bind() {
      const c = this.canvas;
      let down = null;
      c.style.touchAction = 'none';
      c.addEventListener('contextmenu', (e) => e.preventDefault());
      c.addEventListener('pointerdown', (e) => {
        if (e.button > 2 || down) return;
        c.focus();
        const hit = e.button === 0 ? this.pick(e.clientX, e.clientY) : null;
        const object =
          e.button === 0 &&
          !e.ctrlKey &&
          !e.altKey &&
          !!hit?.id &&
          !!this.callbacks.dragStart?.(hit, e);
        down = {
          x: e.clientX,
          y: e.clientY,
          sx: e.clientX,
          sy: e.clientY,
          button: e.button,
          shift: e.shiftKey,
          moved: false,
          object,
          pointerId: e.pointerId
        };
        c.setPointerCapture(e.pointerId);
        if (object) c.style.cursor = 'grabbing';
      });
      c.addEventListener('pointermove', (e) => {
        if (!down || e.pointerId !== down.pointerId) return;
        const dx = e.clientX - down.x,
          dy = e.clientY - down.y,
          tx = e.clientX - down.sx,
          ty = e.clientY - down.sy;
        if (Math.hypot(tx, ty) > 3) down.moved = true;
        if (down.moved) {
          if (down.object) this.callbacks.dragMove?.(tx, ty, e);
          else if (down.button === 2 || down.button === 1 || e.ctrlKey || e.altKey) {
            const cam = this.camera();
            this.target = V.add(
              this.target,
              V.add(
                V.mul(cam.right, (-dx * this.viewH) / this.h),
                V.mul(cam.up, (dy * this.viewH) / this.h)
              )
            );
          } else if (!down.shift) {
            // Grab the view: a rightward drag carries the visible front surface rightward.
            this.az -= dx * 0.4;
            this.el = Math.max(-85, Math.min(89.9, this.el + dy * 0.35));
          }
        }
        down.x = e.clientX;
        down.y = e.clientY;
      });
      const finish = (e, cancel = false) => {
        if (!down || e.pointerId !== down.pointerId) return;
        const d = down;
        down = null;
        c.style.cursor = '';
        if (d.object) this.callbacks.dragEnd?.(cancel || !d.moved);
        if (!cancel && !d.moved && d.button === 0)
          this.callbacks.pick?.(this.pick(e.clientX, e.clientY), e.shiftKey);
        if (c.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId);
      };
      c.addEventListener('pointerup', (e) => finish(e));
      c.addEventListener('pointercancel', (e) => finish(e, true));
      c.addEventListener('lostpointercapture', (e) => finish(e, true));
      c.addEventListener(
        'wheel',
        (e) => {
          e.preventDefault();
          if (down?.object) return;
          this.viewH = Math.max(8, Math.min(1500, this.viewH * Math.exp(e.deltaY * 0.001)));
        },
        { passive: false }
      );
    }
  });
})(window.MP);
