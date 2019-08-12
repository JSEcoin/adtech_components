
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
    	style.id = 'svelte-1n2dmrd-style';
    	style.textContent = "#JSE-overlap,#JSE-overlap *{-webkit-app-region:no-drag}#JSE-overlap{width:300px;height:250px;position:relative;overflow:hidden;background:#000}#JSE-top::before,#JSE-top::after{display:block;content:\"\";position:absolute;height:calc(50% - 14px);width:2px;background:#fff}#JSE-top::before{top:0;right:0}#JSE-top::after{bottom:0;right:0}#JSE-top{z-index:10;background:blue;-webkit-animation:svelte-1n2dmrd-attentionGetter 1s;animation:svelte-1n2dmrd-attentionGetter 1s}#JSE-bottom{background:red}#JSE-top,#JSE-bottom{position:absolute;width:300px;height:250px}#JSE-dragIco{display:block;position:absolute;top:50%;right:-15px;height:28px;width:28px;transform:translate(0, -50%);border:2px solid #fff;border-radius:100%;background-size:50%;background-repeat:no-repeat;background-position:center;background-color:rgba(255,255,255,0);background-image:url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMzcgMzAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDM3IDMwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4uc3Qwe2ZpbGw6I0ZGRkZGRjtzdHJva2U6I0ZGRkZGRjtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fTwvc3R5bGU+PHBvbHlnb24gY2xhc3M9InN0MCIgcG9pbnRzPSIxNS40LDI5LjQgMSwxNSAxNS40LDAuNiAiLz48cG9seWdvbiBjbGFzcz0ic3QwIiBwb2ludHM9IjIxLjIsMC42IDM1LjYsMTUgMjEuMiwyOS40ICIvPjwvc3ZnPg==);cursor:pointer;transition:background 0.2s}#JSE-dragIco:hover{background-color:rgba(255,255,255,0.4)}@-webkit-keyframes svelte-1n2dmrd-attentionGetter{:global(0%){width:75px}:global(55%){width:175px}:global(80%){width:10px}:global(100%){width:150px}}@keyframes svelte-1n2dmrd-attentionGetter{0%{width:75px}55%{width:175px}80%{width:10px}100%{width:150px}}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3ZlcmxhcC5zdmVsdGUiLCJzb3VyY2VzIjpbIk92ZXJsYXAuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjwhLS0gRE9NIFRhZyBOYW1lLS0+XG48c3ZlbHRlOm9wdGlvbnMgdGFnPVwianNlLW92ZXJsYXBcIi8+XG48IS0tIHhET00gVGFnIE5hbWUtLT5cblxuPCEtLSBKU0UgT3ZlcmxhcCAtLT5cbjwhLS0gXG4tLT5cbjxkaXYgaWQ9XCJKU0Utb3ZlcmxhcFwiIG9uOm1vdXNlb3V0PVwie21vdXR9XCIgb246bW91c2Vtb3ZlPVwie21tb3ZlfVwiIG9uOm1vdXNldXA9XCJ7ZHJhZ0VuZH1cIj5cblx0PGRpdiBpZD1cIkpTRS10b3BcIiBzdHlsZT1cIndpZHRoOnt4fXB4XCI+XG5cdFx0PGRpdiBpZD1cIkpTRS1kcmFnSWNvXCIgb246bW91c2Vkb3duPVwie2RyYWdTdGFydH1cIj48L2Rpdj5cblx0PC9kaXY+XG5cdDxkaXYgaWQ9XCJKU0UtYm90dG9tXCI+PC9kaXY+XG48L2Rpdj5cbjwhLS0geEpTRSBPdmVybGFwIC0tPlxuXG5cblxuXG48c2NyaXB0PlxuXHQvL2xpYnNcblx0Ly9pbXBvcnQgeyBvbk1vdW50LCBjcmVhdGVFdmVudERpc3BhdGNoZXIgfSBmcm9tICdzdmVsdGUnO1xuXHRpbXBvcnQgeyBzcHJpbmcgfSBmcm9tICdzdmVsdGUvbW90aW9uJztcblxuXHRsZXQgZW5hYmxlRHJhZyA9IGZhbHNlO1xuXHRsZXQgbW91c2VVcCA9IHRydWU7XG5cdGxldCB4PSAxNTA7XG5cdFxuXHRjb25zdCBkcmFnU3RhcnQgPSAoZSkgPT4ge1xuXHRcdGVuYWJsZURyYWcgPSB0cnVlO1xuXHRcdG1vdXNlVXAgPSBmYWxzZTtcblx0fTtcblx0Y29uc3QgZHJhZ0VuZCA9IChlKSA9PiB7XG5cdFx0ZW5hYmxlRHJhZyA9IGZhbHNlO1xuXHRcdG1vdXNlVXAgPSB0cnVlO1xuXHR9O1xuXHRjb25zdCBtbW92ZSA9IChlKSA9PiB7XG5cdFx0Y29uc29sZS5sb2coZW5hYmxlRHJhZyxtb3VzZVVwKVxuXHRcdGlmICghbW91c2VVcCkge1xuXHRcdFx0Y29uc3QgcmVjdCA9IGUuY3VycmVudFRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblx0XHRcdGNvbnN0IG1vdXNlWCA9IGUucGFnZVggLSByZWN0LmxlZnQ7XG5cdFx0XHRjb25zdCBtb3VzZVkgPSBlLnBhZ2VZIC0gcmVjdC50b3A7XG5cdFx0XHR4ID0gbW91c2VYO1xuXHRcdFx0aWYgKCh4IDwwKSAmJiAoZW5hYmxlRHJhZykpIHtcblx0XHRcdFx0ZW5hYmxlRHJhZyA9IGZhbHNlO1xuXHRcdFx0XHR4ID0gMDtcblx0XHRcdH1cblx0XHRcdGlmICgoeCA+IDMwMCkgJiYgKGVuYWJsZURyYWcpKSB7XG5cdFx0XHRcdGVuYWJsZURyYWcgPSBmYWxzZTtcblx0XHRcdFx0eCA9IDMwMDtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cdGNvbnN0IG1vdXQgPSAoZSkgPT4ge1xuXHRcdGlmICghbW91c2VVcCkge1xuXHRcdFx0aWYgKCh4IDwgMTApICYmIChlbmFibGVEcmFnKSkge1xuXHRcdFx0XHRlbmFibGVEcmFnID0gZmFsc2U7XG5cdFx0XHRcdHggPSAwO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCh4ID4gMjkwKSAmJiAoZW5hYmxlRHJhZykpIHtcblx0XHRcdFx0ZW5hYmxlRHJhZyA9IGZhbHNlO1xuXHRcdFx0XHR4ID0gMzAwO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcbjwvc2NyaXB0PlxuXG5cblxuXG48IS0tIElNUE9SVEFOVCBXaGVuIGRldmVsb3BpbmcgYWRkIGdsb2JhbCBhdHRyaWJ1dGUgLS0+XG48c3R5bGUgZ2xvYmFsPlxuXG46Z2xvYmFsKCNKU0Utb3ZlcmxhcCksXG46Z2xvYmFsKCNKU0Utb3ZlcmxhcCAqKSB7XG5cdC13ZWJraXQtYXBwLXJlZ2lvbjogbm8tZHJhZztcbn1cbjpnbG9iYWwoI0pTRS1vdmVybGFwKSB7XG5cdHdpZHRoOjMwMHB4O1xuXHRoZWlnaHQ6MjUwcHg7XG5cdHBvc2l0aW9uOiByZWxhdGl2ZTtcblx0b3ZlcmZsb3c6IGhpZGRlbjtcblx0YmFja2dyb3VuZDojMDAwO1xufVxuXG46Z2xvYmFsKCNKU0UtdG9wOjpiZWZvcmUpLCBcbjpnbG9iYWwoI0pTRS10b3A6OmFmdGVyKSB7XG4gICAgZGlzcGxheTogYmxvY2s7XG4gICAgY29udGVudDogXCJcIjtcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgaGVpZ2h0OiBjYWxjKDUwJSAtIDE0cHgpO1xuICAgIHdpZHRoOiAycHg7XG4gICAgYmFja2dyb3VuZDogI2ZmZjtcbn1cblxuOmdsb2JhbCgjSlNFLXRvcDo6YmVmb3JlKSB7XG4gICAgdG9wOiAwO1xuICAgIHJpZ2h0OiAwO1xufVxuXG46Z2xvYmFsKCNKU0UtdG9wOjphZnRlcikge1xuICAgIGJvdHRvbTogMDtcbiAgICByaWdodDogMDtcbn1cblxuOmdsb2JhbCgjSlNFLXRvcCkgeyBcblx0Lyp3aWR0aDoxNTBweCAhaW1wb3J0YW50OyovXG5cdHotaW5kZXg6MTA7XG5cdGJhY2tncm91bmQ6Ymx1ZTtcblx0LXdlYmtpdC1hbmltYXRpb246IGF0dGVudGlvbkdldHRlciAxcztcbiAgXHRhbmltYXRpb246IGF0dGVudGlvbkdldHRlciAxcztcbn1cblxuOmdsb2JhbCgjSlNFLWJvdHRvbSkge1xuXHRiYWNrZ3JvdW5kOnJlZDtcbn1cblxuOmdsb2JhbCgjSlNFLXRvcCksXG46Z2xvYmFsKCNKU0UtYm90dG9tKSB7XG5cdHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICB3aWR0aDogMzAwcHg7XG4gICAgaGVpZ2h0OiAyNTBweDtcbn1cblxuOmdsb2JhbCgjSlNFLWRyYWdJY28pIHtcblx0ZGlzcGxheTogYmxvY2s7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIHRvcDogNTAlO1xuICAgIHJpZ2h0OiAtMTVweDtcbiAgICBoZWlnaHQ6IDI4cHg7XG4gICAgd2lkdGg6IDI4cHg7XG4gICAgdHJhbnNmb3JtOiB0cmFuc2xhdGUoMCwgLTUwJSk7XG4gICAgYm9yZGVyOiAycHggc29saWQgI2ZmZjtcbiAgICBib3JkZXItcmFkaXVzOiAxMDAlO1xuXHRiYWNrZ3JvdW5kLXNpemU6IDUwJTtcblx0YmFja2dyb3VuZC1yZXBlYXQ6IG5vLXJlcGVhdDtcblx0YmFja2dyb3VuZC1wb3NpdGlvbjogY2VudGVyO1xuXHRiYWNrZ3JvdW5kLWNvbG9yOiByZ2JhKDI1NSwyNTUsMjU1LDApO1xuICBcdGJhY2tncm91bmQtaW1hZ2U6IHVybChkYXRhOmltYWdlL3N2Zyt4bWw7YmFzZTY0LFBEOTRiV3dnZG1WeWMybHZiajBpTVM0d0lpQmxibU52WkdsdVp6MGlkWFJtTFRnaVB6NDhjM1puSUhabGNuTnBiMjQ5SWpFdU1TSWdhV1E5SWt4aGVXVnlYekVpSUhodGJHNXpQU0pvZEhSd09pOHZkM2QzTG5jekxtOXlaeTh5TURBd0wzTjJaeUlnZUcxc2JuTTZlR3hwYm1zOUltaDBkSEE2THk5M2QzY3Vkek11YjNKbkx6RTVPVGt2ZUd4cGJtc2lJSGc5SWpCd2VDSWdlVDBpTUhCNElpQjJhV1YzUW05NFBTSXdJREFnTXpjZ016QWlJSE4wZVd4bFBTSmxibUZpYkdVdFltRmphMmR5YjNWdVpEcHVaWGNnTUNBd0lETTNJRE13T3lJZ2VHMXNPbk53WVdObFBTSndjbVZ6WlhKMlpTSStQSE4wZVd4bElIUjVjR1U5SW5SbGVIUXZZM056SWo0dWMzUXdlMlpwYkd3NkkwWkdSa1pHUmp0emRISnZhMlU2STBaR1JrWkdSanR6ZEhKdmEyVXRiR2x1WldOaGNEcHliM1Z1WkR0emRISnZhMlV0YkdsdVpXcHZhVzQ2Y205MWJtUTdjM1J5YjJ0bExXMXBkR1Z5YkdsdGFYUTZNVEE3ZlR3dmMzUjViR1UrUEhCdmJIbG5iMjRnWTJ4aGMzTTlJbk4wTUNJZ2NHOXBiblJ6UFNJeE5TNDBMREk1TGpRZ01Td3hOU0F4TlM0MExEQXVOaUFpTHo0OGNHOXNlV2R2YmlCamJHRnpjejBpYzNRd0lpQndiMmx1ZEhNOUlqSXhMaklzTUM0MklETTFMallzTVRVZ01qRXVNaXd5T1M0MElDSXZQand2YzNablBnPT0pO1xuXHRjdXJzb3I6IHBvaW50ZXI7XG5cdHRyYW5zaXRpb246IGJhY2tncm91bmQgMC4ycztcbn1cblxuOmdsb2JhbCgjSlNFLWRyYWdJY286aG92ZXIpIHtcblx0YmFja2dyb3VuZC1jb2xvcjogcmdiYSgyNTUsMjU1LDI1NSwwLjQpO1xufVxuXG5ALXdlYmtpdC1rZXlmcmFtZXMgYXR0ZW50aW9uR2V0dGVyIHtcbiAgOmdsb2JhbCgwJSkge1xuICAgIHdpZHRoOiA3NXB4O1xuICB9XG4gIDpnbG9iYWwoNTUlKSB7XG4gICAgd2lkdGg6IDE3NXB4O1xuICB9XG4gIDpnbG9iYWwoODAlKSB7XG4gICAgd2lkdGg6IDEwcHg7XG4gIH1cbiAgOmdsb2JhbCgxMDAlKSB7XG4gICAgd2lkdGg6IDE1MHB4O1xuICB9XG59XG5Aa2V5ZnJhbWVzIGF0dGVudGlvbkdldHRlciB7XG4gIDAlIHtcbiAgICB3aWR0aDogNzVweDtcbiAgfVxuICA1NSUge1xuICAgIHdpZHRoOiAxNzVweDtcbiAgfVxuICA4MCUge1xuICAgIHdpZHRoOiAxMHB4O1xuICB9XG4gIDEwMCUge1xuICAgIHdpZHRoOiAxNTBweDtcbiAgfVxufVxuLyojIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkluTnlZeTlqYjIxd2IyNWxiblJ6TDNOeVl5OWpiMjF3YjI1bGJuUnpMMDkyWlhKc1lYQXVjM1psYkhSbElsMHNJbTVoYldWeklqcGJYU3dpYldGd2NHbHVaM01pT2lJN08wRkJSVUU3TzBOQlJVTXNNa0pCUVRKQ08wRkJRelZDTzBGQlEwRTdRMEZEUXl4WFFVRlhPME5CUTFnc1dVRkJXVHREUVVOYUxHdENRVUZyUWp0RFFVTnNRaXhuUWtGQlowSTdRMEZEYUVJc1pVRkJaVHRCUVVOb1FqczdRVUZGUVRzN1NVRkZTU3hqUVVGak8wbEJRMlFzVjBGQlZ6dEpRVU5ZTEd0Q1FVRnJRanRKUVVOc1FpeDNRa0ZCZDBJN1NVRkRlRUlzVlVGQlZUdEpRVU5XTEdkQ1FVRm5RanRCUVVOd1FqczdRVUZGUVR0SlFVTkpMRTFCUVUwN1NVRkRUaXhSUVVGUk8wRkJRMW83TzBGQlJVRTdTVUZEU1N4VFFVRlRPMGxCUTFRc1VVRkJVVHRCUVVOYU96dEJRVVZCTzBOQlEwTXNNRUpCUVRCQ08wTkJRekZDTEZWQlFWVTdRMEZEVml4bFFVRmxPME5CUTJZc2NVTkJRWEZETzBkQlEyNURMRFpDUVVFMlFqdEJRVU5vUXpzN1FVRkZRVHREUVVORExHTkJRV003UVVGRFpqczdRVUZGUVRzN1EwRkZReXhyUWtGQmEwSTdTVUZEWml4WlFVRlpPMGxCUTFvc1lVRkJZVHRCUVVOcVFqczdRVUZGUVR0RFFVTkRMR05CUVdNN1NVRkRXQ3hyUWtGQmEwSTdTVUZEYkVJc1VVRkJVVHRKUVVOU0xGbEJRVms3U1VGRFdpeFpRVUZaTzBsQlExb3NWMEZCVnp0SlFVTllMRFpDUVVFMlFqdEpRVU0zUWl4elFrRkJjMEk3U1VGRGRFSXNiVUpCUVcxQ08wTkJRM1JDTEc5Q1FVRnZRanREUVVOd1FpdzBRa0ZCTkVJN1EwRkROVUlzTWtKQlFUSkNPME5CUXpOQ0xIRkRRVUZ4UXp0SFFVTnVReXg1YzBKQlFYbHpRanREUVVNemMwSXNaVUZCWlR0RFFVTm1MREpDUVVFeVFqdEJRVU0xUWpzN1FVRkZRVHREUVVORExIVkRRVUYxUXp0QlFVTjRRenM3UVVGRlFUdEZRVU5GTzBsQlEwVXNWMEZCVnp0RlFVTmlPMFZCUTBFN1NVRkRSU3haUVVGWk8wVkJRMlE3UlVGRFFUdEpRVU5GTEZkQlFWYzdSVUZEWWp0RlFVTkJPMGxCUTBVc1dVRkJXVHRGUVVOa08wRkJRMFk3UVVGRFFUdEZRVU5GTzBsQlEwVXNWMEZCVnp0RlFVTmlPMFZCUTBFN1NVRkRSU3haUVVGWk8wVkJRMlE3UlVGRFFUdEpRVU5GTEZkQlFWYzdSVUZEWWp0RlFVTkJPMGxCUTBVc1dVRkJXVHRGUVVOa08wRkJRMFlpTENKbWFXeGxJam9pYzNKakwyTnZiWEJ2Ym1WdWRITXZUM1psY214aGNDNXpkbVZzZEdVaUxDSnpiM1Z5WTJWelEyOXVkR1Z1ZENJNld5SmNibHh1STBwVFJTMXZkbVZ5YkdGd0xGeHVJMHBUUlMxdmRtVnliR0Z3SUNvZ2UxeHVYSFF0ZDJWaWEybDBMV0Z3Y0MxeVpXZHBiMjQ2SUc1dkxXUnlZV2M3WEc1OVhHNGpTbE5GTFc5MlpYSnNZWEFnZTF4dVhIUjNhV1IwYURvek1EQndlRHRjYmx4MGFHVnBaMmgwT2pJMU1IQjRPMXh1WEhSd2IzTnBkR2x2YmpvZ2NtVnNZWFJwZG1VN1hHNWNkRzkyWlhKbWJHOTNPaUJvYVdSa1pXNDdYRzVjZEdKaFkydG5jbTkxYm1RNkl6QXdNRHRjYm4xY2JseHVJMHBUUlMxMGIzQTZPbUpsWm05eVpTd2dYRzRqU2xORkxYUnZjRG82WVdaMFpYSWdlMXh1SUNBZ0lHUnBjM0JzWVhrNklHSnNiMk5yTzF4dUlDQWdJR052Ym5SbGJuUTZJRndpWENJN1hHNGdJQ0FnY0c5emFYUnBiMjQ2SUdGaWMyOXNkWFJsTzF4dUlDQWdJR2hsYVdkb2REb2dZMkZzWXlnMU1DVWdMU0F4TkhCNEtUdGNiaUFnSUNCM2FXUjBhRG9nTW5CNE8xeHVJQ0FnSUdKaFkydG5jbTkxYm1RNklDTm1abVk3WEc1OVhHNWNiaU5LVTBVdGRHOXdPanBpWldadmNtVWdlMXh1SUNBZ0lIUnZjRG9nTUR0Y2JpQWdJQ0J5YVdkb2REb2dNRHRjYm4xY2JseHVJMHBUUlMxMGIzQTZPbUZtZEdWeUlIdGNiaUFnSUNCaWIzUjBiMjA2SURBN1hHNGdJQ0FnY21sbmFIUTZJREE3WEc1OVhHNWNiaU5LVTBVdGRHOXdJSHNnWEc1Y2RDOHFkMmxrZEdnNk1UVXdjSGdnSVdsdGNHOXlkR0Z1ZERzcUwxeHVYSFI2TFdsdVpHVjRPakV3TzF4dVhIUmlZV05yWjNKdmRXNWtPbUpzZFdVN1hHNWNkQzEzWldKcmFYUXRZVzVwYldGMGFXOXVPaUJoZEhSbGJuUnBiMjVIWlhSMFpYSWdNWE03WEc0Z0lGeDBZVzVwYldGMGFXOXVPaUJoZEhSbGJuUnBiMjVIWlhSMFpYSWdNWE03WEc1OVhHNWNiaU5LVTBVdFltOTBkRzl0SUh0Y2JseDBZbUZqYTJkeWIzVnVaRHB5WldRN1hHNTlYRzVjYmlOS1UwVXRkRzl3TEZ4dUkwcFRSUzFpYjNSMGIyMGdlMXh1WEhSd2IzTnBkR2x2YmpvZ1lXSnpiMngxZEdVN1hHNGdJQ0FnZDJsa2RHZzZJRE13TUhCNE8xeHVJQ0FnSUdobGFXZG9kRG9nTWpVd2NIZzdYRzU5WEc1Y2JpTktVMFV0WkhKaFowbGpieUI3WEc1Y2RHUnBjM0JzWVhrNklHSnNiMk5yTzF4dUlDQWdJSEJ2YzJsMGFXOXVPaUJoWW5OdmJIVjBaVHRjYmlBZ0lDQjBiM0E2SURVd0pUdGNiaUFnSUNCeWFXZG9kRG9nTFRFMWNIZzdYRzRnSUNBZ2FHVnBaMmgwT2lBeU9IQjRPMXh1SUNBZ0lIZHBaSFJvT2lBeU9IQjRPMXh1SUNBZ0lIUnlZVzV6Wm05eWJUb2dkSEpoYm5Oc1lYUmxLREFzSUMwMU1DVXBPMXh1SUNBZ0lHSnZjbVJsY2pvZ01uQjRJSE52Ykdsa0lDTm1abVk3WEc0Z0lDQWdZbTl5WkdWeUxYSmhaR2wxY3pvZ01UQXdKVHRjYmx4MFltRmphMmR5YjNWdVpDMXphWHBsT2lBMU1DVTdYRzVjZEdKaFkydG5jbTkxYm1RdGNtVndaV0YwT2lCdWJ5MXlaWEJsWVhRN1hHNWNkR0poWTJ0bmNtOTFibVF0Y0c5emFYUnBiMjQ2SUdObGJuUmxjanRjYmx4MFltRmphMmR5YjNWdVpDMWpiMnh2Y2pvZ2NtZGlZU2d5TlRVc01qVTFMREkxTlN3d0tUdGNiaUFnWEhSaVlXTnJaM0p2ZFc1a0xXbHRZV2RsT2lCMWNtd29aR0YwWVRwcGJXRm5aUzl6ZG1jcmVHMXNPMkpoYzJVMk5DeFFSRGswWWxkM1oyUnRWbmxqTW14Mlltb3dhVTFUTkhkSmFVSnNZbTFPZGxwSGJIVmFlakJwWkZoU2JVeFVaMmxRZWpRNFl6TmFia2xJV214amJrNXdZakkwT1VscVJYVk5VMGxuWVZkUk9VbHJlR2hsVjFaNVdIcEZhVWxJYUhSaVJ6VjZVRk5LYjJSSVVuZFBhVGgyWkROa00weHVZM3BNYlRsNVduazRlVTFFUVhkTU0wNHlXbmxKWjJWSE1YTmliazAyWlVkNGNHSnRjemxKYldnd1pFaEJOa3g1T1ROa00yTjFaSHBOZFdJelNtNU1la1UxVDFScmRtVkhlSEJpYlhOcFNVaG5PVWxxUW5kbFEwbG5aVlF3YVUxSVFqUkphVUl5WVZkV00xRnRPVFJRVTBsM1NVUkJaMDE2WTJkTmVrRnBTVWhPTUdWWGVHeFFVMHBzWW0xR2FXSkhWWFJaYlVacVlUSmtlV0l6Vm5WYVJIQjFXbGhqWjAxRFFYZEpSRTB6U1VSTmQwOTVTV2RsUnpGelQyNU9kMWxYVG14UVUwcDNZMjFXZWxwWVNqSmFVMGtyVUVoT01HVlhlR3hKU0ZJMVkwZFZPVWx1VW14bFNGRjJXVE5PZWtscU5IVmpNMUYzWlRKYWNHSkhkelpKTUZwSFVtdGFSMUpxZEhwa1NFcDJZVEpWTmtrd1drZFNhMXBIVW1wMGVtUklTblpoTWxWMFlrZHNkVnBYVG1oalJIQjVZak5XZFZwRWRIcGtTRXAyWVRKVmRHSkhiSFZhVjNCMllWYzBObU50T1RGaWJWRTNZek5TZVdJeWRHeE1WekZ3WkVkV2VXSkhiSFJoV0ZFMlRWUkJOMlpVZDNaak0xSTFZa2RWSzFCSVFuWmlTR3h1WWpJMFoxa3llR2hqTTAwNVNXNU9NRTFEU1dkalJ6bHdZbTVTZWxCVFNYaE9VelF3VEVSSk5VeHFVV2ROVTNkNFRsTkJlRTVUTkRCTVJFRjFUbWxCYVV4Nk5EaGpSemx6WlZka2RtSnBRbXBpUjBaNlkzb3dhV016VVhkSmFVSjNZakpzZFdSSVRUbEpha2w0VEdwSmMwMUROREpKUkUweFRHcFpjMDFVVldkTmFrVjFUV2wzZVU5VE5EQkpRMGwyVUdwM2RtTXpXbTVRWnowOUtUdGNibHgwWTNWeWMyOXlPaUJ3YjJsdWRHVnlPMXh1WEhSMGNtRnVjMmwwYVc5dU9pQmlZV05yWjNKdmRXNWtJREF1TW5NN1hHNTlYRzVjYmlOS1UwVXRaSEpoWjBsamJ6cG9iM1psY2lCN1hHNWNkR0poWTJ0bmNtOTFibVF0WTI5c2IzSTZJSEpuWW1Fb01qVTFMREkxTlN3eU5UVXNNQzQwS1R0Y2JuMWNibHh1UUMxM1pXSnJhWFF0YTJWNVpuSmhiV1Z6SUdGMGRHVnVkR2x2YmtkbGRIUmxjaUI3WEc0Z0lEQWxJSHRjYmlBZ0lDQjNhV1IwYURvZ056VndlRHRjYmlBZ2ZWeHVJQ0ExTlNVZ2UxeHVJQ0FnSUhkcFpIUm9PaUF4TnpWd2VEdGNiaUFnZlZ4dUlDQTRNQ1VnZTF4dUlDQWdJSGRwWkhSb09pQXhNSEI0TzF4dUlDQjlYRzRnSURFd01DVWdlMXh1SUNBZ0lIZHBaSFJvT2lBeE5UQndlRHRjYmlBZ2ZWeHVmVnh1UUd0bGVXWnlZVzFsY3lCaGRIUmxiblJwYjI1SFpYUjBaWElnZTF4dUlDQXdKU0I3WEc0Z0lDQWdkMmxrZEdnNklEYzFjSGc3WEc0Z0lIMWNiaUFnTlRVbElIdGNiaUFnSUNCM2FXUjBhRG9nTVRjMWNIZzdYRzRnSUgxY2JpQWdPREFsSUh0Y2JpQWdJQ0IzYVdSMGFEb2dNVEJ3ZUR0Y2JpQWdmVnh1SUNBeE1EQWxJSHRjYmlBZ0lDQjNhV1IwYURvZ01UVXdjSGc3WEc0Z0lIMWNibjFjYmlKZGZRPT0gKi88L3N0eWxlPlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXdFUSxZQUFZLEFBQUMsQ0FDYixjQUFjLEFBQUUsQ0FBQyxBQUN4QixrQkFBa0IsQ0FBRSxPQUFPLEFBQzVCLENBQUMsQUFDTyxZQUFZLEFBQUUsQ0FBQyxBQUN0QixNQUFNLEtBQUssQ0FDWCxPQUFPLEtBQUssQ0FDWixRQUFRLENBQUUsUUFBUSxDQUNsQixRQUFRLENBQUUsTUFBTSxDQUNoQixXQUFXLElBQUksQUFDaEIsQ0FBQyxBQUVPLGdCQUFnQixBQUFDLENBQ2pCLGVBQWUsQUFBRSxDQUFDLEFBQ3RCLE9BQU8sQ0FBRSxLQUFLLENBQ2QsT0FBTyxDQUFFLEVBQUUsQ0FDWCxRQUFRLENBQUUsUUFBUSxDQUNsQixNQUFNLENBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUN4QixLQUFLLENBQUUsR0FBRyxDQUNWLFVBQVUsQ0FBRSxJQUFJLEFBQ3BCLENBQUMsQUFFTyxnQkFBZ0IsQUFBRSxDQUFDLEFBQ3ZCLEdBQUcsQ0FBRSxDQUFDLENBQ04sS0FBSyxDQUFFLENBQUMsQUFDWixDQUFDLEFBRU8sZUFBZSxBQUFFLENBQUMsQUFDdEIsTUFBTSxDQUFFLENBQUMsQ0FDVCxLQUFLLENBQUUsQ0FBQyxBQUNaLENBQUMsQUFFTyxRQUFRLEFBQUUsQ0FBQyxBQUVsQixRQUFRLEVBQUUsQ0FDVixXQUFXLElBQUksQ0FDZixpQkFBaUIsQ0FBRSw4QkFBZSxDQUFDLEVBQUUsQ0FDbkMsU0FBUyxDQUFFLDhCQUFlLENBQUMsRUFBRSxBQUNoQyxDQUFDLEFBRU8sV0FBVyxBQUFFLENBQUMsQUFDckIsV0FBVyxHQUFHLEFBQ2YsQ0FBQyxBQUVPLFFBQVEsQUFBQyxDQUNULFdBQVcsQUFBRSxDQUFDLEFBQ3JCLFFBQVEsQ0FBRSxRQUFRLENBQ2YsS0FBSyxDQUFFLEtBQUssQ0FDWixNQUFNLENBQUUsS0FBSyxBQUNqQixDQUFDLEFBRU8sWUFBWSxBQUFFLENBQUMsQUFDdEIsT0FBTyxDQUFFLEtBQUssQ0FDWCxRQUFRLENBQUUsUUFBUSxDQUNsQixHQUFHLENBQUUsR0FBRyxDQUNSLEtBQUssQ0FBRSxLQUFLLENBQ1osTUFBTSxDQUFFLElBQUksQ0FDWixLQUFLLENBQUUsSUFBSSxDQUNYLFNBQVMsQ0FBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUM3QixNQUFNLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQ3RCLGFBQWEsQ0FBRSxJQUFJLENBQ3RCLGVBQWUsQ0FBRSxHQUFHLENBQ3BCLGlCQUFpQixDQUFFLFNBQVMsQ0FDNUIsbUJBQW1CLENBQUUsTUFBTSxDQUMzQixnQkFBZ0IsQ0FBRSxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUNuQyxnQkFBZ0IsQ0FBRSxJQUFJLGtyQkFBa3JCLENBQUMsQ0FDM3NCLE1BQU0sQ0FBRSxPQUFPLENBQ2YsVUFBVSxDQUFFLFVBQVUsQ0FBQyxJQUFJLEFBQzVCLENBQUMsQUFFTyxrQkFBa0IsQUFBRSxDQUFDLEFBQzVCLGdCQUFnQixDQUFFLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEFBQ3hDLENBQUMsQUFFRCxtQkFBbUIsOEJBQWdCLENBQUMsQUFDbEMsUUFBUSxFQUFFLENBQUMsQUFBQyxDQUFDLEFBQ1gsS0FBSyxDQUFFLElBQUksQUFDYixDQUFDLEFBQ0QsUUFBUSxHQUFHLENBQUMsQUFBQyxDQUFDLEFBQ1osS0FBSyxDQUFFLEtBQUssQUFDZCxDQUFDLEFBQ0QsUUFBUSxHQUFHLENBQUMsQUFBQyxDQUFDLEFBQ1osS0FBSyxDQUFFLElBQUksQUFDYixDQUFDLEFBQ0QsUUFBUSxJQUFJLENBQUMsQUFBQyxDQUFDLEFBQ2IsS0FBSyxDQUFFLEtBQUssQUFDZCxDQUFDLEFBQ0gsQ0FBQyxBQUNELFdBQVcsOEJBQWdCLENBQUMsQUFDMUIsRUFBRSxBQUFDLENBQUMsQUFDRixLQUFLLENBQUUsSUFBSSxBQUNiLENBQUMsQUFDRCxHQUFHLEFBQUMsQ0FBQyxBQUNILEtBQUssQ0FBRSxLQUFLLEFBQ2QsQ0FBQyxBQUNELEdBQUcsQUFBQyxDQUFDLEFBQ0gsS0FBSyxDQUFFLElBQUksQUFDYixDQUFDLEFBQ0QsSUFBSSxBQUFDLENBQUMsQUFDSixLQUFLLENBQUUsS0FBSyxBQUNkLENBQUMsQUFDSCxDQUFDIn0= */";
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
    			add_location(div0, file, 9, 2, 243);
    			div1.id = "JSE-top";
    			set_style(div1, "width", "" + ctx.x + "px");
    			add_location(div1, file, 8, 1, 202);
    			div2.id = "JSE-bottom";
    			add_location(div2, file, 11, 1, 308);
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
    	let enableDrag = false;
    	let mouseUp = true;
    	let x= 150;
    	
    	const dragStart = (e) => {
    		enableDrag = true;
    		mouseUp = false;
    	};
    	const dragEnd = (e) => {
    		enableDrag = false;
    		mouseUp = true;
    	};
    	const mmove = (e) => {
    		console.log(enableDrag,mouseUp);
    		if (!mouseUp) {
    			const rect = e.currentTarget.getBoundingClientRect();
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

    	return { x, dragStart, dragEnd, mmove, mout };
    }

    class Overlap extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-1n2dmrd-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, []);
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
