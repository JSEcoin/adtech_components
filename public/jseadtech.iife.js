
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var Adtech_components = (function () {
    'use strict';

    function noop() {}

    function add_location(element, file, line, column, char) {
      element.__svelte_meta = {
        loc: {
          file,
          line,
          column,
          char
        }
      };
    }

    function run(fn) {
      return fn();
    }

    function blank_object() {
      return Object.create(null);
    }

    function run_all(fns) {
      fns.forEach(run);
    }

    function is_function(thing) {
      return typeof thing === 'function';
    }

    function safe_not_equal(a, b) {
      return a != a ? b == b : a !== b || a && typeof a === 'object' || typeof a === 'function';
    }

    function append(target, node) {
      target.appendChild(node);
    }

    function insert(target, node, anchor) {
      target.insertBefore(node, anchor || null);
    }

    function detach(node) {
      node.parentNode.removeChild(node);
    }

    function element(name) {
      return document.createElement(name);
    }

    function text(data) {
      return document.createTextNode(data);
    }

    function space() {
      return text(' ');
    }

    function listen(node, event, handler, options) {
      node.addEventListener(event, handler, options);
      return () => node.removeEventListener(event, handler, options);
    }

    function children(element) {
      return Array.from(element.childNodes);
    }

    function set_style(node, key, value) {
      node.style.setProperty(key, value);
    }

    let current_component;

    function set_current_component(component) {
      current_component = component;
    }

    const dirty_components = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];

    function schedule_update() {
      if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
      }
    }

    function add_render_callback(fn) {
      render_callbacks.push(fn);
    }

    function flush() {
      const seen_callbacks = new Set();

      do {
        // first, call beforeUpdate functions
        // and update components
        while (dirty_components.length) {
          const component = dirty_components.shift();
          set_current_component(component);
          update(component.$$);
        }

        while (binding_callbacks.length) binding_callbacks.shift()(); // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...


        while (render_callbacks.length) {
          const callback = render_callbacks.pop();

          if (!seen_callbacks.has(callback)) {
            callback(); // ...so guard against infinite loops

            seen_callbacks.add(callback);
          }
        }
      } while (dirty_components.length);

      while (flush_callbacks.length) {
        flush_callbacks.pop()();
      }

      update_scheduled = false;
    }

    function update($$) {
      if ($$.fragment) {
        $$.update($$.dirty);
        run_all($$.before_render);
        $$.fragment.p($$.dirty, $$.ctx);
        $$.dirty = null;
        $$.after_render.forEach(add_render_callback);
      }
    }

    function mount_component(component, target, anchor) {
      const {
        fragment,
        on_mount,
        on_destroy,
        after_render
      } = component.$$;
      fragment.m(target, anchor); // onMount happens after the initial afterUpdate. Because
      // afterUpdate callbacks happen in reverse order (inner first)
      // we schedule onMount callbacks before afterUpdate callbacks

      add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);

        if (on_destroy) {
          on_destroy.push(...new_on_destroy);
        } else {
          // Edge case - component was destroyed immediately,
          // most likely as a result of a binding initialising
          run_all(new_on_destroy);
        }

        component.$$.on_mount = [];
      });
      after_render.forEach(add_render_callback);
    }

    function destroy(component, detaching) {
      if (component.$$) {
        run_all(component.$$.on_destroy);
        component.$$.fragment.d(detaching); // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)

        component.$$.on_destroy = component.$$.fragment = null;
        component.$$.ctx = {};
      }
    }

    function make_dirty(component, key) {
      if (!component.$$.dirty) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty = blank_object();
      }

      component.$$.dirty[key] = true;
    }

    function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
      const parent_component = current_component;
      set_current_component(component);
      const props = options.props || {};
      const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props: prop_names,
        update: noop,
        not_equal: not_equal$$1,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_render: [],
        after_render: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty: null
      };
      let ready = false;
      $$.ctx = instance ? instance(component, props, (key, value) => {
        if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
          if ($$.bound[key]) $$.bound[key](value);
          if (ready) make_dirty(component, key);
        }
      }) : props;
      $$.update();
      ready = true;
      run_all($$.before_render);
      $$.fragment = create_fragment($$.ctx);

      if (options.target) {
        if (options.hydrate) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          $$.fragment.l(children(options.target));
        } else {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          $$.fragment.c();
        }

        if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
        mount_component(component, options.target, options.anchor);
        flush();
      }

      set_current_component(parent_component);
    }

    class SvelteComponent {
      $destroy() {
        destroy(this, true);
        this.$destroy = noop;
      }

      $on(type, callback) {
        const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
        callbacks.push(callback);
        return () => {
          const index = callbacks.indexOf(callback);
          if (index !== -1) callbacks.splice(index, 1);
        };
      }

      $set() {// overridden by instance, if it has props
      }

    }

    class SvelteComponentDev extends SvelteComponent {
      constructor(options) {
        if (!options || !options.target && !options.$$inline) {
          throw new Error(`'target' is a required option`);
        }

        super();
      }

      $destroy() {
        super.$destroy();

        this.$destroy = () => {
          console.warn(`Component was already destroyed`); // eslint-disable-line no-console
        };
      }

    }

    /* src\components\Overlap.svelte generated by Svelte v3.5.1 */

    const file = "src\\components\\Overlap.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = 'svelte-svydsr-style';
    	style.textContent = "#JSE-overlap,#JSE-overlap *{-webkit-app-region:no-drag}#JSE-overlap{width:300px;height:250px;position:relative;overflow:hidden;background:#000}#JSE-top::before,#JSE-top::after{display:block;content:\"\";position:absolute;height:calc(50% - 14px);width:2px;background:#fff}#JSE-top::before{top:0;right:0}#JSE-top::after{bottom:0;right:0}#JSE-top{z-index:10;-webkit-animation:svelte-svydsr-attentionGetter 1s;animation:svelte-svydsr-attentionGetter 1s}#JSE-bottom{}#JSE-top,#JSE-bottom{position:absolute;width:300px;height:250px;background-size:300px 250px}#JSE-dragIco{display:block;position:absolute;top:50%;right:-15px;height:28px;width:28px;transform:translate(0, -50%);border:2px solid #fff;border-radius:100%;background-size:50%;background-repeat:no-repeat;background-position:center;background-color:rgba(0,0,0,0);background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMzcgMzAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDM3IDMwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4uc3Qwe2ZpbGw6I0ZGRkZGRjtzdHJva2U6I0ZGRkZGRjtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fTwvc3R5bGU+PHBvbHlnb24gY2xhc3M9InN0MCIgcG9pbnRzPSIxNS40LDI5LjQgMSwxNSAxNS40LDAuNiAiLz48cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjIxLjIsMC42IDM1LjYsMTUgMjEuMiwyOS40ICIvPjwvc3ZnPg==);cursor:pointer;transition:background 0.2s}#JSE-dragIco:hover{background-color:rgba(0,0,0,0.4)}@-webkit-keyframes svelte-svydsr-attentionGetter{:global(0%){width:75px}:global(55%){width:175px}:global(80%){width:10px}:global(100%){width:150px}}@keyframes svelte-svydsr-attentionGetter{0%{width:75px}55%{width:175px}80%{width:10px}100%{width:150px}}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3ZlcmxhcC5zdmVsdGUiLCJzb3VyY2VzIjpbIk92ZXJsYXAuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjwhLS0gRE9NIFRhZyBOYW1lLS0+XG48c3ZlbHRlOm9wdGlvbnMgdGFnPVwianNlLW92ZXJsYXBcIi8+XG48IS0tIHhET00gVGFnIE5hbWUtLT5cblxuPCEtLSBKU0UgT3ZlcmxhcCAtLT5cbjwhLS0gXG4tLT5cbjxkaXYgaWQ9XCJKU0Utb3ZlcmxhcFwiIG9uOm1vdXNlb3V0PVwie21vdXR9XCIgb246bW91c2Vtb3ZlPVwie21tb3ZlfVwiIG9uOm1vdXNldXA9XCJ7ZHJhZ0VuZH1cIj5cblx0PGRpdiBpZD1cIkpTRS10b3BcIiBzdHlsZT1cIndpZHRoOnt4fXB4OyBiYWNrZ3JvdW5kLWltYWdlOnVybCh7dG9wfSlcIj5cblx0XHQ8ZGl2IGlkPVwiSlNFLWRyYWdJY29cIiBvbjptb3VzZWRvd249XCJ7ZHJhZ1N0YXJ0fVwiPjwvZGl2PlxuXHQ8L2Rpdj5cblx0PGRpdiBpZD1cIkpTRS1ib3R0b21cIiBzdHlsZT1cImJhY2tncm91bmQtaW1hZ2U6dXJsKHtib3R0b219KVwiPjwvZGl2PlxuPC9kaXY+XG48IS0tIHhKU0UgT3ZlcmxhcCAtLT5cblxuXG5cblxuPHNjcmlwdD5cblx0Ly9saWJzXG5cdC8vaW1wb3J0IHsgb25Nb3VudCwgY3JlYXRlRXZlbnREaXNwYXRjaGVyIH0gZnJvbSAnc3ZlbHRlJztcblx0aW1wb3J0IHsgc3ByaW5nIH0gZnJvbSAnc3ZlbHRlL21vdGlvbic7XG5cdFxuXHQvL1Byb3BzXG5cdGV4cG9ydCBsZXQgdG9wID0gJ2ltYWdlcy8xLnBuZyc7XG5cdGV4cG9ydCBsZXQgYm90dG9tID0gJ2ltYWdlcy8yLnBuZyc7XG5cdGV4cG9ydCBsZXQgdXJsID0gJ2h0dHBzOi8vanNlY29pbi5jb20nO1xuXG5cdGxldCBlbmFibGVEcmFnID0gZmFsc2U7XG5cdGxldCBtb3VzZVVwID0gdHJ1ZTtcblx0bGV0IHg9IDE1MDtcblx0bGV0IGNsaWNrUG9zID0gMDtcblx0bGV0IHJlY3QgPSAnJztcblx0XG5cdGNvbnN0IGRyYWdTdGFydCA9IChlKSA9PiB7XG5cdFx0ZW5hYmxlRHJhZyA9IHRydWU7XG5cdFx0bW91c2VVcCA9IGZhbHNlO1xuXHRcdGNsaWNrUG9zID0gZS5wYWdlWCAtIHJlY3QubGVmdDtcblx0fTtcblx0Y29uc3QgZHJhZ0VuZCA9IChlKSA9PiB7XG5cdFx0ZW5hYmxlRHJhZyA9IGZhbHNlO1xuXHRcdG1vdXNlVXAgPSB0cnVlO1xuXHRcdC8vY29uc29sZS5sb2coY2xpY2tQb3MsIChlLnBhZ2VYIC0gcmVjdC5sZWZ0KSk7XG5cdFx0aWYgKGNsaWNrUG9zID09PSAoZS5wYWdlWCAtIHJlY3QubGVmdCkpIHtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IHVybDtcblx0XHR9XG5cdH07XG5cdGNvbnN0IG1tb3ZlID0gKGUpID0+IHtcblx0XHQvL2NvbnNvbGUubG9nKGVuYWJsZURyYWcsbW91c2VVcCk7XG5cdFx0cmVjdCA9IGUuY3VycmVudFRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblx0XHRpZiAoIW1vdXNlVXApIHtcblx0XHRcdGNvbnN0IG1vdXNlWCA9IGUucGFnZVggLSByZWN0LmxlZnQ7XG5cdFx0XHRjb25zdCBtb3VzZVkgPSBlLnBhZ2VZIC0gcmVjdC50b3A7XG5cdFx0XHR4ID0gbW91c2VYO1xuXHRcdFx0aWYgKCh4IDwwKSAmJiAoZW5hYmxlRHJhZykpIHtcblx0XHRcdFx0ZW5hYmxlRHJhZyA9IGZhbHNlO1xuXHRcdFx0XHR4ID0gMDtcblx0XHRcdH1cblx0XHRcdGlmICgoeCA+IDMwMCkgJiYgKGVuYWJsZURyYWcpKSB7XG5cdFx0XHRcdGVuYWJsZURyYWcgPSBmYWxzZTtcblx0XHRcdFx0eCA9IDMwMDtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cdGNvbnN0IG1vdXQgPSAoZSkgPT4ge1xuXHRcdGlmICghbW91c2VVcCkge1xuXHRcdFx0aWYgKCh4IDwgMTApICYmIChlbmFibGVEcmFnKSkge1xuXHRcdFx0XHRlbmFibGVEcmFnID0gZmFsc2U7XG5cdFx0XHRcdHggPSAwO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCh4ID4gMjkwKSAmJiAoZW5hYmxlRHJhZykpIHtcblx0XHRcdFx0ZW5hYmxlRHJhZyA9IGZhbHNlO1xuXHRcdFx0XHR4ID0gMzAwO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcbjwvc2NyaXB0PlxuXG5cblxuXG48IS0tIElNUE9SVEFOVCBXaGVuIGRldmVsb3BpbmcgYWRkIGdsb2JhbCBhdHRyaWJ1dGUgLS0+XG48c3R5bGUgZ2xvYmFsPlxuXG46Z2xvYmFsKCNKU0Utb3ZlcmxhcCksXG46Z2xvYmFsKCNKU0Utb3ZlcmxhcCAqKSB7XG5cdC13ZWJraXQtYXBwLXJlZ2lvbjogbm8tZHJhZztcbn1cbjpnbG9iYWwoI0pTRS1vdmVybGFwKSB7XG5cdHdpZHRoOjMwMHB4O1xuXHRoZWlnaHQ6MjUwcHg7XG5cdHBvc2l0aW9uOiByZWxhdGl2ZTtcblx0b3ZlcmZsb3c6IGhpZGRlbjtcblx0YmFja2dyb3VuZDojMDAwO1xufVxuXG46Z2xvYmFsKCNKU0UtdG9wOjpiZWZvcmUpLCBcbjpnbG9iYWwoI0pTRS10b3A6OmFmdGVyKSB7XG4gICAgZGlzcGxheTogYmxvY2s7XG4gICAgY29udGVudDogXCJcIjtcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgaGVpZ2h0OiBjYWxjKDUwJSAtIDE0cHgpO1xuICAgIHdpZHRoOiAycHg7XG4gICAgYmFja2dyb3VuZDogI2ZmZjtcbn1cblxuOmdsb2JhbCgjSlNFLXRvcDo6YmVmb3JlKSB7XG4gICAgdG9wOiAwO1xuICAgIHJpZ2h0OiAwO1xufVxuXG46Z2xvYmFsKCNKU0UtdG9wOjphZnRlcikge1xuICAgIGJvdHRvbTogMDtcbiAgICByaWdodDogMDtcbn1cblxuOmdsb2JhbCgjSlNFLXRvcCkgeyBcblx0Lyp3aWR0aDoxNTBweCAhaW1wb3J0YW50OyovXG5cdHotaW5kZXg6MTA7XG5cdC8qYmFja2dyb3VuZDpibHVlOyovXG5cdC13ZWJraXQtYW5pbWF0aW9uOiBhdHRlbnRpb25HZXR0ZXIgMXM7XG4gIFx0YW5pbWF0aW9uOiBhdHRlbnRpb25HZXR0ZXIgMXM7XG59XG5cbjpnbG9iYWwoI0pTRS1ib3R0b20pIHtcblx0LypiYWNrZ3JvdW5kOnJlZDsqL1xufVxuXG46Z2xvYmFsKCNKU0UtdG9wKSxcbjpnbG9iYWwoI0pTRS1ib3R0b20pIHtcblx0cG9zaXRpb246IGFic29sdXRlO1xuICAgIHdpZHRoOiAzMDBweDtcbiAgICBoZWlnaHQ6IDI1MHB4O1xuXHRiYWNrZ3JvdW5kLXNpemU6IDMwMHB4IDI1MHB4O1xufVxuXG46Z2xvYmFsKCNKU0UtZHJhZ0ljbykge1xuXHRkaXNwbGF5OiBibG9jaztcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgdG9wOiA1MCU7XG4gICAgcmlnaHQ6IC0xNXB4O1xuICAgIGhlaWdodDogMjhweDtcbiAgICB3aWR0aDogMjhweDtcbiAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZSgwLCAtNTAlKTtcbiAgICBib3JkZXI6IDJweCBzb2xpZCAjZmZmO1xuICAgIGJvcmRlci1yYWRpdXM6IDEwMCU7XG5cdGJhY2tncm91bmQtc2l6ZTogNTAlO1xuXHRiYWNrZ3JvdW5kLXJlcGVhdDogbm8tcmVwZWF0O1xuXHRiYWNrZ3JvdW5kLXBvc2l0aW9uOiBjZW50ZXI7XG5cdGJhY2tncm91bmQtY29sb3I6IHJnYmEoMCwwLDAsMCk7XG4gIFx0YmFja2dyb3VuZC1pbWFnZTogdXJsKGRhdGE6aW1hZ2Uvc3ZnK3htbDtiYXNlNjQsUEQ5NGJXd2dkbVZ5YzJsdmJqMGlNUzR3SWlCbGJtTnZaR2x1WnowaWRYUm1MVGdpUHo0OGMzWm5JSFpsY25OcGIyNDlJakV1TVNJZ2FXUTlJa3hoZVdWeVh6RWlJSGh0Ykc1elBTSm9kSFJ3T2k4dmQzZDNMbmN6TG05eVp5OHlNREF3TDNOMlp5SWdlRzFzYm5NNmVHeHBibXM5SW1oMGRIQTZMeTkzZDNjdWR6TXViM0puTHpFNU9Ua3ZlR3hwYm1zaUlIZzlJakJ3ZUNJZ2VUMGlNSEI0SWlCMmFXVjNRbTk0UFNJd0lEQWdNemNnTXpBaUlITjBlV3hsUFNKbGJtRmliR1V0WW1GamEyZHliM1Z1WkRwdVpYY2dNQ0F3SURNM0lETXdPeUlnZUcxc09uTndZV05sUFNKd2NtVnpaWEoyWlNJK1BITjBlV3hsSUhSNWNHVTlJblJsZUhRdlkzTnpJajR1YzNRd2UyWnBiR3c2STBaR1JrWkdSanR6ZEhKdmEyVTZJMFpHUmtaR1JqdHpkSEp2YTJVdGJHbHVaV05oY0RweWIzVnVaRHR6ZEhKdmEyVXRiR2x1WldwdmFXNDZjbTkxYm1RN2MzUnliMnRsTFcxcGRHVnliR2x0YVhRNk1UQTdmVHd2YzNSNWJHVStQSEJ2YkhsbmIyNGdZMnhoYzNNOUluTjBNQ0lnY0c5cGJuUnpQU0l4TlM0MExESTVMalFnTVN3eE5TQXhOUzQwTERBdU5pQWlMejQ4Y0c5c2VXZHZiaUJqYkdGemN6MGljM1F3SWlCd2IybHVkSE05SWpJeExqSXNNQzQySURNMUxqWXNNVFVnTWpFdU1pd3lPUzQwSUNJdlBqd3ZjM1puUGc9PSk7XG5cdGN1cnNvcjogcG9pbnRlcjtcblx0dHJhbnNpdGlvbjogYmFja2dyb3VuZCAwLjJzO1xufVxuXG46Z2xvYmFsKCNKU0UtZHJhZ0ljbzpob3Zlcikge1xuXHRiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDAsMCwwLDAuNCk7XG59XG5cbkAtd2Via2l0LWtleWZyYW1lcyBhdHRlbnRpb25HZXR0ZXIge1xuICA6Z2xvYmFsKDAlKSB7XG4gICAgd2lkdGg6IDc1cHg7XG4gIH1cbiAgOmdsb2JhbCg1NSUpIHtcbiAgICB3aWR0aDogMTc1cHg7XG4gIH1cbiAgOmdsb2JhbCg4MCUpIHtcbiAgICB3aWR0aDogMTBweDtcbiAgfVxuICA6Z2xvYmFsKDEwMCUpIHtcbiAgICB3aWR0aDogMTUwcHg7XG4gIH1cbn1cbkBrZXlmcmFtZXMgYXR0ZW50aW9uR2V0dGVyIHtcbiAgMCUge1xuICAgIHdpZHRoOiA3NXB4O1xuICB9XG4gIDU1JSB7XG4gICAgd2lkdGg6IDE3NXB4O1xuICB9XG4gIDgwJSB7XG4gICAgd2lkdGg6IDEwcHg7XG4gIH1cbiAgMTAwJSB7XG4gICAgd2lkdGg6IDE1MHB4O1xuICB9XG59XG4vKiMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW5OeVl5OWpiMjF3YjI1bGJuUnpMM055WXk5amIyMXdiMjVsYm5SekwwOTJaWEpzWVhBdWMzWmxiSFJsSWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUk3TzBGQlJVRTdPME5CUlVNc01rSkJRVEpDTzBGQlF6VkNPMEZCUTBFN1EwRkRReXhYUVVGWE8wTkJRMWdzV1VGQldUdERRVU5hTEd0Q1FVRnJRanREUVVOc1FpeG5Ra0ZCWjBJN1EwRkRhRUlzWlVGQlpUdEJRVU5vUWpzN1FVRkZRVHM3U1VGRlNTeGpRVUZqTzBsQlEyUXNWMEZCVnp0SlFVTllMR3RDUVVGclFqdEpRVU5zUWl4M1FrRkJkMEk3U1VGRGVFSXNWVUZCVlR0SlFVTldMR2RDUVVGblFqdEJRVU53UWpzN1FVRkZRVHRKUVVOSkxFMUJRVTA3U1VGRFRpeFJRVUZSTzBGQlExbzdPMEZCUlVFN1NVRkRTU3hUUVVGVE8wbEJRMVFzVVVGQlVUdEJRVU5hT3p0QlFVVkJPME5CUTBNc01FSkJRVEJDTzBOQlF6RkNMRlZCUVZVN1EwRkRWaXh0UWtGQmJVSTdRMEZEYmtJc2NVTkJRWEZETzBkQlEyNURMRFpDUVVFMlFqdEJRVU5vUXpzN1FVRkZRVHREUVVORExHdENRVUZyUWp0QlFVTnVRanM3UVVGRlFUczdRMEZGUXl4clFrRkJhMEk3U1VGRFppeFpRVUZaTzBsQlExb3NZVUZCWVR0RFFVTm9RaXcwUWtGQk5FSTdRVUZETjBJN08wRkJSVUU3UTBGRFF5eGpRVUZqTzBsQlExZ3NhMEpCUVd0Q08wbEJRMnhDTEZGQlFWRTdTVUZEVWl4WlFVRlpPMGxCUTFvc1dVRkJXVHRKUVVOYUxGZEJRVmM3U1VGRFdDdzJRa0ZCTmtJN1NVRkROMElzYzBKQlFYTkNPMGxCUTNSQ0xHMUNRVUZ0UWp0RFFVTjBRaXh2UWtGQmIwSTdRMEZEY0VJc05FSkJRVFJDTzBOQlF6VkNMREpDUVVFeVFqdERRVU16UWl3clFrRkJLMEk3UjBGRE4wSXNlWE5DUVVGNWMwSTdRMEZETTNOQ0xHVkJRV1U3UTBGRFppd3lRa0ZCTWtJN1FVRkROVUk3TzBGQlJVRTdRMEZEUXl4cFEwRkJhVU03UVVGRGJFTTdPMEZCUlVFN1JVRkRSVHRKUVVORkxGZEJRVmM3UlVGRFlqdEZRVU5CTzBsQlEwVXNXVUZCV1R0RlFVTmtPMFZCUTBFN1NVRkRSU3hYUVVGWE8wVkJRMkk3UlVGRFFUdEpRVU5GTEZsQlFWazdSVUZEWkR0QlFVTkdPMEZCUTBFN1JVRkRSVHRKUVVORkxGZEJRVmM3UlVGRFlqdEZRVU5CTzBsQlEwVXNXVUZCV1R0RlFVTmtPMFZCUTBFN1NVRkRSU3hYUVVGWE8wVkJRMkk3UlVGRFFUdEpRVU5GTEZsQlFWazdSVUZEWkR0QlFVTkdJaXdpWm1sc1pTSTZJbk55WXk5amIyMXdiMjVsYm5SekwwOTJaWEpzWVhBdWMzWmxiSFJsSWl3aWMyOTFjbU5sYzBOdmJuUmxiblFpT2xzaVhHNWNiaU5LVTBVdGIzWmxjbXhoY0N4Y2JpTktVMFV0YjNabGNteGhjQ0FxSUh0Y2JseDBMWGRsWW10cGRDMWhjSEF0Y21WbmFXOXVPaUJ1Ynkxa2NtRm5PMXh1ZlZ4dUkwcFRSUzF2ZG1WeWJHRndJSHRjYmx4MGQybGtkR2c2TXpBd2NIZzdYRzVjZEdobGFXZG9kRG95TlRCd2VEdGNibHgwY0c5emFYUnBiMjQ2SUhKbGJHRjBhWFpsTzF4dVhIUnZkbVZ5Wm14dmR6b2dhR2xrWkdWdU8xeHVYSFJpWVdOclozSnZkVzVrT2lNd01EQTdYRzU5WEc1Y2JpTktVMFV0ZEc5d09qcGlaV1p2Y21Vc0lGeHVJMHBUUlMxMGIzQTZPbUZtZEdWeUlIdGNiaUFnSUNCa2FYTndiR0Y1T2lCaWJHOWphenRjYmlBZ0lDQmpiMjUwWlc1ME9pQmNJbHdpTzF4dUlDQWdJSEJ2YzJsMGFXOXVPaUJoWW5OdmJIVjBaVHRjYmlBZ0lDQm9aV2xuYUhRNklHTmhiR01vTlRBbElDMGdNVFJ3ZUNrN1hHNGdJQ0FnZDJsa2RHZzZJREp3ZUR0Y2JpQWdJQ0JpWVdOclozSnZkVzVrT2lBalptWm1PMXh1ZlZ4dVhHNGpTbE5GTFhSdmNEbzZZbVZtYjNKbElIdGNiaUFnSUNCMGIzQTZJREE3WEc0Z0lDQWdjbWxuYUhRNklEQTdYRzU5WEc1Y2JpTktVMFV0ZEc5d09qcGhablJsY2lCN1hHNGdJQ0FnWW05MGRHOXRPaUF3TzF4dUlDQWdJSEpwWjJoME9pQXdPMXh1ZlZ4dVhHNGpTbE5GTFhSdmNDQjdJRnh1WEhRdktuZHBaSFJvT2pFMU1IQjRJQ0ZwYlhCdmNuUmhiblE3S2k5Y2JseDBlaTFwYm1SbGVEb3hNRHRjYmx4MEx5cGlZV05yWjNKdmRXNWtPbUpzZFdVN0tpOWNibHgwTFhkbFltdHBkQzFoYm1sdFlYUnBiMjQ2SUdGMGRHVnVkR2x2YmtkbGRIUmxjaUF4Y3p0Y2JpQWdYSFJoYm1sdFlYUnBiMjQ2SUdGMGRHVnVkR2x2YmtkbGRIUmxjaUF4Y3p0Y2JuMWNibHh1STBwVFJTMWliM1IwYjIwZ2UxeHVYSFF2S21KaFkydG5jbTkxYm1RNmNtVmtPeW92WEc1OVhHNWNiaU5LVTBVdGRHOXdMRnh1STBwVFJTMWliM1IwYjIwZ2UxeHVYSFJ3YjNOcGRHbHZiam9nWVdKemIyeDFkR1U3WEc0Z0lDQWdkMmxrZEdnNklETXdNSEI0TzF4dUlDQWdJR2hsYVdkb2REb2dNalV3Y0hnN1hHNWNkR0poWTJ0bmNtOTFibVF0YzJsNlpUb2dNekF3Y0hnZ01qVXdjSGc3WEc1OVhHNWNiaU5LVTBVdFpISmhaMGxqYnlCN1hHNWNkR1JwYzNCc1lYazZJR0pzYjJOck8xeHVJQ0FnSUhCdmMybDBhVzl1T2lCaFluTnZiSFYwWlR0Y2JpQWdJQ0IwYjNBNklEVXdKVHRjYmlBZ0lDQnlhV2RvZERvZ0xURTFjSGc3WEc0Z0lDQWdhR1ZwWjJoME9pQXlPSEI0TzF4dUlDQWdJSGRwWkhSb09pQXlPSEI0TzF4dUlDQWdJSFJ5WVc1elptOXliVG9nZEhKaGJuTnNZWFJsS0RBc0lDMDFNQ1VwTzF4dUlDQWdJR0p2Y21SbGNqb2dNbkI0SUhOdmJHbGtJQ05tWm1ZN1hHNGdJQ0FnWW05eVpHVnlMWEpoWkdsMWN6b2dNVEF3SlR0Y2JseDBZbUZqYTJkeWIzVnVaQzF6YVhwbE9pQTFNQ1U3WEc1Y2RHSmhZMnRuY205MWJtUXRjbVZ3WldGME9pQnVieTF5WlhCbFlYUTdYRzVjZEdKaFkydG5jbTkxYm1RdGNHOXphWFJwYjI0NklHTmxiblJsY2p0Y2JseDBZbUZqYTJkeWIzVnVaQzFqYjJ4dmNqb2djbWRpWVNnd0xEQXNNQ3d3S1R0Y2JpQWdYSFJpWVdOclozSnZkVzVrTFdsdFlXZGxPaUIxY213b1pHRjBZVHBwYldGblpTOXpkbWNyZUcxc08ySmhjMlUyTkN4UVJEazBZbGQzWjJSdFZubGpNbXgyWW1vd2FVMVROSGRKYVVKc1ltMU9kbHBIYkhWYWVqQnBaRmhTYlV4VVoybFFlalE0WXpOYWJrbElXbXhqYms1d1lqSTBPVWxxUlhWTlUwbG5ZVmRST1VscmVHaGxWMVo1V0hwRmFVbElhSFJpUnpWNlVGTktiMlJJVW5kUGFUaDJaRE5rTTB4dVkzcE1iVGw1V25rNGVVMUVRWGRNTTA0eVdubEpaMlZITVhOaWJrMDJaVWQ0Y0dKdGN6bEpiV2d3WkVoQk5reDVPVE5rTTJOMVpIcE5kV0l6U201TWVrVTFUMVJyZG1WSGVIQmliWE5wU1Vobk9VbHFRbmRsUTBsblpWUXdhVTFJUWpSSmFVSXlZVmRXTTFGdE9UUlFVMGwzU1VSQlowMTZZMmROZWtGcFNVaE9NR1ZYZUd4UVUwcHNZbTFHYVdKSFZYUlpiVVpxWVRKa2VXSXpWblZhUkhCMVdsaGpaMDFEUVhkSlJFMHpTVVJOZDA5NVNXZGxSekZ6VDI1T2QxbFhUbXhRVTBwM1kyMVdlbHBZU2pKYVUwa3JVRWhPTUdWWGVHeEpTRkkxWTBkVk9VbHVVbXhsU0ZGMldUTk9la2xxTkhWak0xRjNaVEphY0dKSGR6WkpNRnBIVW10YVIxSnFkSHBrU0VwMllUSlZOa2t3V2tkU2ExcEhVbXAwZW1SSVNuWmhNbFYwWWtkc2RWcFhUbWhqUkhCNVlqTldkVnBFZEhwa1NFcDJZVEpWZEdKSGJIVmFWM0IyWVZjME5tTnRPVEZpYlZFM1l6TlNlV0l5ZEd4TVZ6RndaRWRXZVdKSGJIUmhXRkUyVFZSQk4yWlVkM1pqTTFJMVlrZFZLMUJJUW5aaVNHeHVZakkwWjFreWVHaGpNMDA1U1c1T01FMURTV2RqUnpsd1ltNVNlbEJUU1hoT1V6UXdURVJKTlV4cVVXZE5VM2Q0VGxOQmVFNVROREJNUkVGMVRtbEJhVXg2TkRoalJ6bHpaVmRrZG1KcFFtcGlSMFo2WTNvd2FXTXpVWGRKYVVKM1lqSnNkV1JJVFRsSmFrbDRUR3BKYzAxRE5ESkpSRTB4VEdwWmMwMVVWV2ROYWtWMVRXbDNlVTlUTkRCSlEwbDJVR3AzZG1NeldtNVFaejA5S1R0Y2JseDBZM1Z5YzI5eU9pQndiMmx1ZEdWeU8xeHVYSFIwY21GdWMybDBhVzl1T2lCaVlXTnJaM0p2ZFc1a0lEQXVNbk03WEc1OVhHNWNiaU5LVTBVdFpISmhaMGxqYnpwb2IzWmxjaUI3WEc1Y2RHSmhZMnRuY205MWJtUXRZMjlzYjNJNklISm5ZbUVvTUN3d0xEQXNNQzQwS1R0Y2JuMWNibHh1UUMxM1pXSnJhWFF0YTJWNVpuSmhiV1Z6SUdGMGRHVnVkR2x2YmtkbGRIUmxjaUI3WEc0Z0lEQWxJSHRjYmlBZ0lDQjNhV1IwYURvZ056VndlRHRjYmlBZ2ZWeHVJQ0ExTlNVZ2UxeHVJQ0FnSUhkcFpIUm9PaUF4TnpWd2VEdGNiaUFnZlZ4dUlDQTRNQ1VnZTF4dUlDQWdJSGRwWkhSb09pQXhNSEI0TzF4dUlDQjlYRzRnSURFd01DVWdlMXh1SUNBZ0lIZHBaSFJvT2lBeE5UQndlRHRjYmlBZ2ZWeHVmVnh1UUd0bGVXWnlZVzFsY3lCaGRIUmxiblJwYjI1SFpYUjBaWElnZTF4dUlDQXdKU0I3WEc0Z0lDQWdkMmxrZEdnNklEYzFjSGc3WEc0Z0lIMWNiaUFnTlRVbElIdGNiaUFnSUNCM2FXUjBhRG9nTVRjMWNIZzdYRzRnSUgxY2JpQWdPREFsSUh0Y2JpQWdJQ0IzYVdSMGFEb2dNVEJ3ZUR0Y2JpQWdmVnh1SUNBeE1EQWxJSHRjYmlBZ0lDQjNhV1IwYURvZ01UVXdjSGc3WEc0Z0lIMWNibjFjYmlKZGZRPT0gKi88L3N0eWxl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 */";
    	append(document.head, style);
    }

    function create_fragment(ctx) {
    	var div3, div1, div0, t, div2, dispose;

    	return {
    		c: function create() {
    			div3 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t = space();
    			div2 = element("div");
    			div0.id = "JSE-dragIco";
    			add_location(div0, file, 9, 2, 272);
    			div1.id = "JSE-top";
    			set_style(div1, "width", "" + ctx.x + "px");
    			set_style(div1, "background-image", "url(" + ctx.top + ")");
    			add_location(div1, file, 8, 1, 202);
    			div2.id = "JSE-bottom";
    			set_style(div2, "background-image", "url(" + ctx.bottom + ")");
    			add_location(div2, file, 11, 1, 337);
    			div3.id = "JSE-overlap";
    			add_location(div3, file, 7, 0, 111);

    			dispose = [
    				listen(div0, "mousedown", ctx.dragStart),
    				listen(div3, "mouseout", ctx.mout),
    				listen(div3, "mousemove", ctx.mmove),
    				listen(div3, "mouseup", ctx.dragEnd)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div1);
    			append(div1, div0);
    			append(div3, t);
    			append(div3, div2);
    		},

    		p: function update(changed, ctx) {
    			if (changed.x) {
    				set_style(div1, "width", "" + ctx.x + "px");
    			}

    			if (changed.top) {
    				set_style(div1, "background-image", "url(" + ctx.top + ")");
    			}

    			if (changed.bottom) {
    				set_style(div2, "background-image", "url(" + ctx.bottom + ")");
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div3);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	//Props
    	let { top = 'images/1.png', bottom = 'images/2.png', url = 'https://jsecoin.com' } = $$props;

    	let enableDrag = false;
    	let mouseUp = true;
    	let x= 150;
    	let clickPos = 0;
    	let rect = '';
    	
    	const dragStart = (e) => {
    		enableDrag = true;
    		mouseUp = false;
    		clickPos = e.pageX - rect.left;
    	};
    	const dragEnd = (e) => {
    		enableDrag = false;
    		mouseUp = true;
    		//console.log(clickPos, (e.pageX - rect.left));
    		if (clickPos === (e.pageX - rect.left)) {
    			window.location = url;
    		}
    	};
    	const mmove = (e) => {
    		//console.log(enableDrag,mouseUp);
    		rect = e.currentTarget.getBoundingClientRect();
    		if (!mouseUp) {
    			const mouseX = e.pageX - rect.left;
    			const mouseY = e.pageY - rect.top;
    			$$invalidate('x', x = mouseX);
    			if ((x <0) && (enableDrag)) {
    				enableDrag = false;
    				$$invalidate('x', x = 0);
    			}
    			if ((x > 300) && (enableDrag)) {
    				enableDrag = false;
    				$$invalidate('x', x = 300);
    			}
    		}
    	};
    	const mout = (e) => {
    		if (!mouseUp) {
    			if ((x < 10) && (enableDrag)) {
    				enableDrag = false;
    				$$invalidate('x', x = 0);
    			}
    			if ((x > 290) && (enableDrag)) {
    				enableDrag = false;
    				$$invalidate('x', x = 300);
    			}
    		}
    	};

    	const writable_props = ['top', 'bottom', 'url'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Overlap> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('top' in $$props) $$invalidate('top', top = $$props.top);
    		if ('bottom' in $$props) $$invalidate('bottom', bottom = $$props.bottom);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    	};

    	return {
    		top,
    		bottom,
    		url,
    		x,
    		dragStart,
    		dragEnd,
    		mmove,
    		mout
    	};
    }

    class Overlap extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-svydsr-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, ["top", "bottom", "url"]);
    	}

    	get top() {
    		throw new Error("<Overlap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set top(value) {
    		throw new Error("<Overlap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bottom() {
    		throw new Error("<Overlap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bottom(value) {
    		throw new Error("<Overlap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Overlap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Overlap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.5.1 */

    const file$1 = "src\\App.svelte";

    function create_fragment$1(ctx) {
    	var div, current;

    	var jseadtech = new Overlap({ $$inline: true });

    	return {
    		c: function create() {
    			div = element("div");
    			jseadtech.$$.fragment.c();
    			div.id = "JSE-AdTechExamples";
    			add_location(div, file$1, 4, 0, 81);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(jseadtech, div, null);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			jseadtech.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			jseadtech.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			jseadtech.$destroy();
    		}
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, []);
    	}
    }

    const app = new App({
      // eslint-disable-next-line no-undef
      target: document.body,
      props: {}
    });

    return app;

}());
//# sourceMappingURL=jseadtech.iife.js.map
