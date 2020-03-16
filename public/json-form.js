(function () {
	'use strict';

	function noop() { }
	const identity = x => x;
	function assign(tar, src) {
	    // @ts-ignore
	    for (const k in src)
	        tar[k] = src[k];
	    return tar;
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
	    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}
	function subscribe(store, ...callbacks) {
	    if (store == null) {
	        return noop;
	    }
	    const unsub = store.subscribe(...callbacks);
	    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
	}
	function component_subscribe(component, store, callback) {
	    component.$$.on_destroy.push(subscribe(store, callback));
	}
	function exclude_internal_props(props) {
	    const result = {};
	    for (const k in props)
	        if (k[0] !== '$')
	            result[k] = props[k];
	    return result;
	}

	const is_client = typeof window !== 'undefined';
	let now = is_client
	    ? () => window.performance.now()
	    : () => Date.now();
	let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

	const tasks = new Set();
	function run_tasks(now) {
	    tasks.forEach(task => {
	        if (!task.c(now)) {
	            tasks.delete(task);
	            task.f();
	        }
	    });
	    if (tasks.size !== 0)
	        raf(run_tasks);
	}
	/**
	 * Creates a new task that runs on each raf frame
	 * until it returns a falsy value or is aborted
	 */
	function loop(callback) {
	    let task;
	    if (tasks.size === 0)
	        raf(run_tasks);
	    return {
	        promise: new Promise(fulfill => {
	            tasks.add(task = { c: callback, f: fulfill });
	        }),
	        abort() {
	            tasks.delete(task);
	        }
	    };
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
	function destroy_each(iterations, detaching) {
	    for (let i = 0; i < iterations.length; i += 1) {
	        if (iterations[i])
	            iterations[i].d(detaching);
	    }
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
	function empty() {
	    return text('');
	}
	function listen(node, event, handler, options) {
	    node.addEventListener(event, handler, options);
	    return () => node.removeEventListener(event, handler, options);
	}
	function prevent_default(fn) {
	    return function (event) {
	        event.preventDefault();
	        // @ts-ignore
	        return fn.call(this, event);
	    };
	}
	function attr(node, attribute, value) {
	    if (value == null)
	        node.removeAttribute(attribute);
	    else if (node.getAttribute(attribute) !== value)
	        node.setAttribute(attribute, value);
	}
	function children(element) {
	    return Array.from(element.childNodes);
	}
	function set_data(text, data) {
	    data = '' + data;
	    if (text.data !== data)
	        text.data = data;
	}
	function set_input_value(input, value) {
	    if (value != null || input.value) {
	        input.value = value;
	    }
	}
	function select_option(select, value) {
	    for (let i = 0; i < select.options.length; i += 1) {
	        const option = select.options[i];
	        if (option.__value === value) {
	            option.selected = true;
	            return;
	        }
	    }
	}
	function select_value(select) {
	    const selected_option = select.querySelector(':checked') || select.options[0];
	    return selected_option && selected_option.__value;
	}
	function toggle_class(element, name, toggle) {
	    element.classList[toggle ? 'add' : 'remove'](name);
	}
	function custom_event(type, detail) {
	    const e = document.createEvent('CustomEvent');
	    e.initCustomEvent(type, false, false, detail);
	    return e;
	}

	let stylesheet;
	let active = 0;
	let current_rules = {};
	// https://github.com/darkskyapp/string-hash/blob/master/index.js
	function hash(str) {
	    let hash = 5381;
	    let i = str.length;
	    while (i--)
	        hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
	    return hash >>> 0;
	}
	function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
	    const step = 16.666 / duration;
	    let keyframes = '{\n';
	    for (let p = 0; p <= 1; p += step) {
	        const t = a + (b - a) * ease(p);
	        keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
	    }
	    const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
	    const name = `__svelte_${hash(rule)}_${uid}`;
	    if (!current_rules[name]) {
	        if (!stylesheet) {
	            const style = element('style');
	            document.head.appendChild(style);
	            stylesheet = style.sheet;
	        }
	        current_rules[name] = true;
	        stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
	    }
	    const animation = node.style.animation || '';
	    node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
	    active += 1;
	    return name;
	}
	function delete_rule(node, name) {
	    node.style.animation = (node.style.animation || '')
	        .split(', ')
	        .filter(name
	        ? anim => anim.indexOf(name) < 0 // remove specific animation
	        : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
	    )
	        .join(', ');
	    if (name && !--active)
	        clear_rules();
	}
	function clear_rules() {
	    raf(() => {
	        if (active)
	            return;
	        let i = stylesheet.cssRules.length;
	        while (i--)
	            stylesheet.deleteRule(i);
	        current_rules = {};
	    });
	}

	let current_component;
	function set_current_component(component) {
	    current_component = component;
	}
	function get_current_component() {
	    if (!current_component)
	        throw new Error(`Function called outside component initialization`);
	    return current_component;
	}
	function onMount(fn) {
	    get_current_component().$$.on_mount.push(fn);
	}
	// TODO figure out if we still want to support
	// shorthand events, or if we want to implement
	// a real bubbling mechanism
	function bubble(component, event) {
	    const callbacks = component.$$.callbacks[event.type];
	    if (callbacks) {
	        callbacks.slice().forEach(fn => fn(event));
	    }
	}

	const dirty_components = [];
	const binding_callbacks = [];
	const render_callbacks = [];
	const flush_callbacks = [];
	const resolved_promise = Promise.resolve();
	let update_scheduled = false;
	function schedule_update() {
	    if (!update_scheduled) {
	        update_scheduled = true;
	        resolved_promise.then(flush);
	    }
	}
	function tick() {
	    schedule_update();
	    return resolved_promise;
	}
	function add_render_callback(fn) {
	    render_callbacks.push(fn);
	}
	function add_flush_callback(fn) {
	    flush_callbacks.push(fn);
	}
	let flushing = false;
	const seen_callbacks = new Set();
	function flush() {
	    if (flushing)
	        return;
	    flushing = true;
	    do {
	        // first, call beforeUpdate functions
	        // and update components
	        for (let i = 0; i < dirty_components.length; i += 1) {
	            const component = dirty_components[i];
	            set_current_component(component);
	            update(component.$$);
	        }
	        dirty_components.length = 0;
	        while (binding_callbacks.length)
	            binding_callbacks.pop()();
	        // then, once components are updated, call
	        // afterUpdate functions. This may cause
	        // subsequent updates...
	        for (let i = 0; i < render_callbacks.length; i += 1) {
	            const callback = render_callbacks[i];
	            if (!seen_callbacks.has(callback)) {
	                // ...so guard against infinite loops
	                seen_callbacks.add(callback);
	                callback();
	            }
	        }
	        render_callbacks.length = 0;
	    } while (dirty_components.length);
	    while (flush_callbacks.length) {
	        flush_callbacks.pop()();
	    }
	    update_scheduled = false;
	    flushing = false;
	    seen_callbacks.clear();
	}
	function update($$) {
	    if ($$.fragment !== null) {
	        $$.update();
	        run_all($$.before_update);
	        const dirty = $$.dirty;
	        $$.dirty = [-1];
	        $$.fragment && $$.fragment.p($$.ctx, dirty);
	        $$.after_update.forEach(add_render_callback);
	    }
	}

	let promise;
	function wait() {
	    if (!promise) {
	        promise = Promise.resolve();
	        promise.then(() => {
	            promise = null;
	        });
	    }
	    return promise;
	}
	function dispatch(node, direction, kind) {
	    node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
	}
	const outroing = new Set();
	let outros;
	function group_outros() {
	    outros = {
	        r: 0,
	        c: [],
	        p: outros // parent group
	    };
	}
	function check_outros() {
	    if (!outros.r) {
	        run_all(outros.c);
	    }
	    outros = outros.p;
	}
	function transition_in(block, local) {
	    if (block && block.i) {
	        outroing.delete(block);
	        block.i(local);
	    }
	}
	function transition_out(block, local, detach, callback) {
	    if (block && block.o) {
	        if (outroing.has(block))
	            return;
	        outroing.add(block);
	        outros.c.push(() => {
	            outroing.delete(block);
	            if (callback) {
	                if (detach)
	                    block.d(1);
	                callback();
	            }
	        });
	        block.o(local);
	    }
	}
	const null_transition = { duration: 0 };
	function create_in_transition(node, fn, params) {
	    let config = fn(node, params);
	    let running = false;
	    let animation_name;
	    let task;
	    let uid = 0;
	    function cleanup() {
	        if (animation_name)
	            delete_rule(node, animation_name);
	    }
	    function go() {
	        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
	        if (css)
	            animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
	        tick(0, 1);
	        const start_time = now() + delay;
	        const end_time = start_time + duration;
	        if (task)
	            task.abort();
	        running = true;
	        add_render_callback(() => dispatch(node, true, 'start'));
	        task = loop(now => {
	            if (running) {
	                if (now >= end_time) {
	                    tick(1, 0);
	                    dispatch(node, true, 'end');
	                    cleanup();
	                    return running = false;
	                }
	                if (now >= start_time) {
	                    const t = easing((now - start_time) / duration);
	                    tick(t, 1 - t);
	                }
	            }
	            return running;
	        });
	    }
	    let started = false;
	    return {
	        start() {
	            if (started)
	                return;
	            delete_rule(node);
	            if (is_function(config)) {
	                config = config();
	                wait().then(go);
	            }
	            else {
	                go();
	            }
	        },
	        invalidate() {
	            started = false;
	        },
	        end() {
	            if (running) {
	                cleanup();
	                running = false;
	            }
	        }
	    };
	}
	function create_out_transition(node, fn, params) {
	    let config = fn(node, params);
	    let running = true;
	    let animation_name;
	    const group = outros;
	    group.r += 1;
	    function go() {
	        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
	        if (css)
	            animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
	        const start_time = now() + delay;
	        const end_time = start_time + duration;
	        add_render_callback(() => dispatch(node, false, 'start'));
	        loop(now => {
	            if (running) {
	                if (now >= end_time) {
	                    tick(0, 1);
	                    dispatch(node, false, 'end');
	                    if (!--group.r) {
	                        // this will result in `end()` being called,
	                        // so we don't need to clean up here
	                        run_all(group.c);
	                    }
	                    return false;
	                }
	                if (now >= start_time) {
	                    const t = easing((now - start_time) / duration);
	                    tick(1 - t, t);
	                }
	            }
	            return running;
	        });
	    }
	    if (is_function(config)) {
	        wait().then(() => {
	            // @ts-ignore
	            config = config();
	            go();
	        });
	    }
	    else {
	        go();
	    }
	    return {
	        end(reset) {
	            if (reset && config.tick) {
	                config.tick(1, 0);
	            }
	            if (running) {
	                if (animation_name)
	                    delete_rule(node, animation_name);
	                running = false;
	            }
	        }
	    };
	}
	function outro_and_destroy_block(block, lookup) {
	    transition_out(block, 1, 1, () => {
	        lookup.delete(block.key);
	    });
	}
	function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
	    let o = old_blocks.length;
	    let n = list.length;
	    let i = o;
	    const old_indexes = {};
	    while (i--)
	        old_indexes[old_blocks[i].key] = i;
	    const new_blocks = [];
	    const new_lookup = new Map();
	    const deltas = new Map();
	    i = n;
	    while (i--) {
	        const child_ctx = get_context(ctx, list, i);
	        const key = get_key(child_ctx);
	        let block = lookup.get(key);
	        if (!block) {
	            block = create_each_block(key, child_ctx);
	            block.c();
	        }
	        else if (dynamic) {
	            block.p(child_ctx, dirty);
	        }
	        new_lookup.set(key, new_blocks[i] = block);
	        if (key in old_indexes)
	            deltas.set(key, Math.abs(i - old_indexes[key]));
	    }
	    const will_move = new Set();
	    const did_move = new Set();
	    function insert(block) {
	        transition_in(block, 1);
	        block.m(node, next);
	        lookup.set(block.key, block);
	        next = block.first;
	        n--;
	    }
	    while (o && n) {
	        const new_block = new_blocks[n - 1];
	        const old_block = old_blocks[o - 1];
	        const new_key = new_block.key;
	        const old_key = old_block.key;
	        if (new_block === old_block) {
	            // do nothing
	            next = new_block.first;
	            o--;
	            n--;
	        }
	        else if (!new_lookup.has(old_key)) {
	            // remove old block
	            destroy(old_block, lookup);
	            o--;
	        }
	        else if (!lookup.has(new_key) || will_move.has(new_key)) {
	            insert(new_block);
	        }
	        else if (did_move.has(old_key)) {
	            o--;
	        }
	        else if (deltas.get(new_key) > deltas.get(old_key)) {
	            did_move.add(new_key);
	            insert(new_block);
	        }
	        else {
	            will_move.add(old_key);
	            o--;
	        }
	    }
	    while (o--) {
	        const old_block = old_blocks[o];
	        if (!new_lookup.has(old_block.key))
	            destroy(old_block, lookup);
	    }
	    while (n)
	        insert(new_blocks[n - 1]);
	    return new_blocks;
	}

	function bind(component, name, callback) {
	    const index = component.$$.props[name];
	    if (index !== undefined) {
	        component.$$.bound[index] = callback;
	        callback(component.$$.ctx[index]);
	    }
	}
	function create_component(block) {
	    block && block.c();
	}
	function mount_component(component, target, anchor) {
	    const { fragment, on_mount, on_destroy, after_update } = component.$$;
	    fragment && fragment.m(target, anchor);
	    // onMount happens before the initial afterUpdate
	    add_render_callback(() => {
	        const new_on_destroy = on_mount.map(run).filter(is_function);
	        if (on_destroy) {
	            on_destroy.push(...new_on_destroy);
	        }
	        else {
	            // Edge case - component was destroyed immediately,
	            // most likely as a result of a binding initialising
	            run_all(new_on_destroy);
	        }
	        component.$$.on_mount = [];
	    });
	    after_update.forEach(add_render_callback);
	}
	function destroy_component(component, detaching) {
	    const $$ = component.$$;
	    if ($$.fragment !== null) {
	        run_all($$.on_destroy);
	        $$.fragment && $$.fragment.d(detaching);
	        // TODO null out other refs, including component.$$ (but need to
	        // preserve final state?)
	        $$.on_destroy = $$.fragment = null;
	        $$.ctx = [];
	    }
	}
	function make_dirty(component, i) {
	    if (component.$$.dirty[0] === -1) {
	        dirty_components.push(component);
	        schedule_update();
	        component.$$.dirty.fill(0);
	    }
	    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
	}
	function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
	    const parent_component = current_component;
	    set_current_component(component);
	    const prop_values = options.props || {};
	    const $$ = component.$$ = {
	        fragment: null,
	        ctx: null,
	        // state
	        props,
	        update: noop,
	        not_equal,
	        bound: blank_object(),
	        // lifecycle
	        on_mount: [],
	        on_destroy: [],
	        before_update: [],
	        after_update: [],
	        context: new Map(parent_component ? parent_component.$$.context : []),
	        // everything else
	        callbacks: blank_object(),
	        dirty
	    };
	    let ready = false;
	    $$.ctx = instance
	        ? instance(component, prop_values, (i, ret, ...rest) => {
	            const value = rest.length ? rest[0] : ret;
	            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
	                if ($$.bound[i])
	                    $$.bound[i](value);
	                if (ready)
	                    make_dirty(component, i);
	            }
	            return ret;
	        })
	        : [];
	    $$.update();
	    ready = true;
	    run_all($$.before_update);
	    // `false` as a special case of no DOM component
	    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
	    if (options.target) {
	        if (options.hydrate) {
	            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	            $$.fragment && $$.fragment.l(children(options.target));
	        }
	        else {
	            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	            $$.fragment && $$.fragment.c();
	        }
	        if (options.intro)
	            transition_in(component.$$.fragment);
	        mount_component(component, options.target, options.anchor);
	        flush();
	    }
	    set_current_component(parent_component);
	}
	class SvelteComponent {
	    $destroy() {
	        destroy_component(this, 1);
	        this.$destroy = noop;
	    }
	    $on(type, callback) {
	        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
	        callbacks.push(callback);
	        return () => {
	            const index = callbacks.indexOf(callback);
	            if (index !== -1)
	                callbacks.splice(index, 1);
	        };
	    }
	    $set() {
	        // overridden by instance, if it has props
	    }
	}

	function styleInject(css, ref) {
	  if ( ref === void 0 ) ref = {};
	  var insertAt = ref.insertAt;

	  if (!css || typeof document === 'undefined') { return; }

	  var head = document.head || document.getElementsByTagName('head')[0];
	  var style = document.createElement('style');
	  style.type = 'text/css';

	  if (insertAt === 'top') {
	    if (head.firstChild) {
	      head.insertBefore(style, head.firstChild);
	    } else {
	      head.appendChild(style);
	    }
	  } else {
	    head.appendChild(style);
	  }

	  if (style.styleSheet) {
	    style.styleSheet.cssText = css;
	  } else {
	    style.appendChild(document.createTextNode(css));
	  }
	}

	var css = "/*! Pickr 1.5.1 MIT | https://github.com/Simonwep/pickr */.pickr{position:relative;overflow:visible;transform:translateY(0)}.pickr *{box-sizing:border-box;outline:none;border:none;-webkit-appearance:none}.pickr .pcr-button{position:relative;height:2em;width:2em;padding:.5em;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;border-radius:.15em;background:url('data:image/svg+xml;utf8, <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 50 50\" stroke=\"%2342445A\" stroke-width=\"5px\" stroke-linecap=\"round\"><path d=\"M45,45L5,5\"></path><path d=\"M45,5L5,45\"></path></svg>') no-repeat 50%;background-size:0;transition:all .3s}.pickr .pcr-button:before{background:url('data:image/svg+xml;utf8, <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 2 2\"><path fill=\"white\" d=\"M1,0H2V1H1V0ZM0,1H1V2H0V1Z\"/><path fill=\"gray\" d=\"M0,0H1V1H0V0ZM1,1H2V2H1V1Z\"/></svg>');background-size:.5em;z-index:-1;z-index:auto}.pickr .pcr-button:after,.pickr .pcr-button:before{position:absolute;content:\"\";top:0;left:0;width:100%;height:100%;border-radius:.15em}.pickr .pcr-button:after{transition:background .3s;background:currentColor}.pickr .pcr-button.clear{background-size:70%}.pickr .pcr-button.clear:before{opacity:0}.pickr .pcr-button.clear:focus{box-shadow:0 0 0 1px hsla(0,0%,100%,.85),0 0 0 3px currentColor}.pickr .pcr-button.disabled{cursor:not-allowed}.pcr-app *,.pickr *{box-sizing:border-box;outline:none;border:none;-webkit-appearance:none}.pcr-app button.pcr-active,.pcr-app button:focus,.pcr-app input.pcr-active,.pcr-app input:focus,.pickr button.pcr-active,.pickr button:focus,.pickr input.pcr-active,.pickr input:focus{box-shadow:0 0 0 1px hsla(0,0%,100%,.85),0 0 0 3px currentColor}.pcr-app .pcr-palette,.pcr-app .pcr-slider,.pickr .pcr-palette,.pickr .pcr-slider{transition:box-shadow .3s}.pcr-app .pcr-palette:focus,.pcr-app .pcr-slider:focus,.pickr .pcr-palette:focus,.pickr .pcr-slider:focus{box-shadow:0 0 0 1px hsla(0,0%,100%,.85),0 0 0 3px rgba(0,0,0,.25)}.pcr-app{position:fixed;display:flex;flex-direction:column;z-index:10000;border-radius:.1em;background:#fff;opacity:0;visibility:hidden;transition:opacity .3s,visibility 0s .3s;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;box-shadow:0 .15em 1.5em 0 rgba(0,0,0,.1),0 0 1em 0 rgba(0,0,0,.03);left:0;top:0}.pcr-app.visible{transition:opacity .3s;visibility:visible;opacity:1}.pcr-app .pcr-swatches{display:flex;flex-wrap:wrap;margin-top:.75em}.pcr-app .pcr-swatches.pcr-last{margin:0}@supports (display:grid){.pcr-app .pcr-swatches{display:grid;align-items:center;grid-template-columns:repeat(auto-fit,1.75em)}}.pcr-app .pcr-swatches>button{font-size:1em;position:relative;width:calc(1.75em - 5px);height:calc(1.75em - 5px);border-radius:.15em;cursor:pointer;margin:2.5px;flex-shrink:0;justify-self:center;transition:all .15s;overflow:hidden;background:transparent;z-index:1}.pcr-app .pcr-swatches>button:before{position:absolute;content:\"\";top:0;left:0;width:100%;height:100%;background:url('data:image/svg+xml;utf8, <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 2 2\"><path fill=\"white\" d=\"M1,0H2V1H1V0ZM0,1H1V2H0V1Z\"/><path fill=\"gray\" d=\"M0,0H1V1H0V0ZM1,1H2V2H1V1Z\"/></svg>');background-size:6px;border-radius:.15em;z-index:-1}.pcr-app .pcr-swatches>button:after{content:\"\";position:absolute;top:0;left:0;width:100%;height:100%;background:currentColor;border:1px solid rgba(0,0,0,.05);border-radius:.15em;box-sizing:border-box}.pcr-app .pcr-swatches>button:hover{-webkit-filter:brightness(1.05);filter:brightness(1.05)}.pcr-app .pcr-interaction{display:flex;flex-wrap:wrap;align-items:center;margin:0 -.2em}.pcr-app .pcr-interaction>*{margin:0 .2em}.pcr-app .pcr-interaction input{letter-spacing:.07em;font-size:.75em;text-align:center;cursor:pointer;color:#75797e;background:#f1f3f4;border-radius:.15em;transition:all .15s;padding:.45em .5em;margin-top:.75em}.pcr-app .pcr-interaction input:hover{-webkit-filter:brightness(.975);filter:brightness(.975)}.pcr-app .pcr-interaction input:focus{box-shadow:0 0 0 1px hsla(0,0%,100%,.85),0 0 0 3px rgba(66,133,244,.75)}.pcr-app .pcr-interaction .pcr-result{color:#75797e;text-align:left;flex:1 1 8em;min-width:8em;transition:all .2s;border-radius:.15em;background:#f1f3f4;cursor:text}.pcr-app .pcr-interaction .pcr-result::-moz-selection{background:#4285f4;color:#fff}.pcr-app .pcr-interaction .pcr-result::selection{background:#4285f4;color:#fff}.pcr-app .pcr-interaction .pcr-type.active{color:#fff;background:#4285f4}.pcr-app .pcr-interaction .pcr-cancel,.pcr-app .pcr-interaction .pcr-clear,.pcr-app .pcr-interaction .pcr-save{width:auto;color:#fff}.pcr-app .pcr-interaction .pcr-cancel:hover,.pcr-app .pcr-interaction .pcr-clear:hover,.pcr-app .pcr-interaction .pcr-save:hover{-webkit-filter:brightness(.925);filter:brightness(.925)}.pcr-app .pcr-interaction .pcr-save{background:#4285f4}.pcr-app .pcr-interaction .pcr-cancel,.pcr-app .pcr-interaction .pcr-clear{background:#f44250}.pcr-app .pcr-interaction .pcr-cancel:focus,.pcr-app .pcr-interaction .pcr-clear:focus{box-shadow:0 0 0 1px hsla(0,0%,100%,.85),0 0 0 3px rgba(244,66,80,.75)}.pcr-app .pcr-selection .pcr-picker{position:absolute;height:18px;width:18px;border:2px solid #fff;border-radius:100%;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.pcr-app .pcr-selection .pcr-color-chooser,.pcr-app .pcr-selection .pcr-color-opacity,.pcr-app .pcr-selection .pcr-color-palette{position:relative;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;display:flex;flex-direction:column;cursor:grab;cursor:-webkit-grab}.pcr-app .pcr-selection .pcr-color-chooser:active,.pcr-app .pcr-selection .pcr-color-opacity:active,.pcr-app .pcr-selection .pcr-color-palette:active{cursor:grabbing;cursor:-webkit-grabbing}.pcr-app[data-theme=nano]{width:14.25em;max-width:95vw}.pcr-app[data-theme=nano] .pcr-swatches{margin-top:.6em;padding:0 .6em}.pcr-app[data-theme=nano] .pcr-interaction{padding:0 .6em .6em}.pcr-app[data-theme=nano] .pcr-selection{display:grid;grid-gap:.6em;grid-template-columns:1fr 4fr;grid-template-rows:5fr auto auto;align-items:center;height:10.5em;width:100%;align-self:flex-start}.pcr-app[data-theme=nano] .pcr-selection .pcr-color-preview{grid-area:2/1/4/1;height:100%;width:100%;display:flex;flex-direction:row;justify-content:center;margin-left:.6em}.pcr-app[data-theme=nano] .pcr-selection .pcr-color-preview .pcr-last-color{display:none}.pcr-app[data-theme=nano] .pcr-selection .pcr-color-preview .pcr-current-color{position:relative;background:currentColor;width:2em;height:2em;border-radius:50em;overflow:hidden}.pcr-app[data-theme=nano] .pcr-selection .pcr-color-preview .pcr-current-color:before{position:absolute;content:\"\";top:0;left:0;width:100%;height:100%;background:url('data:image/svg+xml;utf8, <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 2 2\"><path fill=\"white\" d=\"M1,0H2V1H1V0ZM0,1H1V2H0V1Z\"/><path fill=\"gray\" d=\"M0,0H1V1H0V0ZM1,1H2V2H1V1Z\"/></svg>');background-size:.5em;border-radius:.15em;z-index:-1}.pcr-app[data-theme=nano] .pcr-selection .pcr-color-palette{grid-area:1/1/2/3;width:100%;height:100%;z-index:1}.pcr-app[data-theme=nano] .pcr-selection .pcr-color-palette .pcr-palette{border-radius:.15em;width:100%;height:100%}.pcr-app[data-theme=nano] .pcr-selection .pcr-color-palette .pcr-palette:before{position:absolute;content:\"\";top:0;left:0;width:100%;height:100%;background:url('data:image/svg+xml;utf8, <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 2 2\"><path fill=\"white\" d=\"M1,0H2V1H1V0ZM0,1H1V2H0V1Z\"/><path fill=\"gray\" d=\"M0,0H1V1H0V0ZM1,1H2V2H1V1Z\"/></svg>');background-size:.5em;border-radius:.15em;z-index:-1}.pcr-app[data-theme=nano] .pcr-selection .pcr-color-chooser{grid-area:2/2/2/2}.pcr-app[data-theme=nano] .pcr-selection .pcr-color-opacity{grid-area:3/2/3/2}.pcr-app[data-theme=nano] .pcr-selection .pcr-color-chooser,.pcr-app[data-theme=nano] .pcr-selection .pcr-color-opacity{height:.5em;margin:0 .6em}.pcr-app[data-theme=nano] .pcr-selection .pcr-color-chooser .pcr-picker,.pcr-app[data-theme=nano] .pcr-selection .pcr-color-opacity .pcr-picker{top:50%;transform:translateY(-50%)}.pcr-app[data-theme=nano] .pcr-selection .pcr-color-chooser .pcr-slider,.pcr-app[data-theme=nano] .pcr-selection .pcr-color-opacity .pcr-slider{flex-grow:1;border-radius:50em}.pcr-app[data-theme=nano] .pcr-selection .pcr-color-chooser .pcr-slider{background:linear-gradient(90deg,red,#ff0,#0f0,#0ff,#00f,#f0f,red)}.pcr-app[data-theme=nano] .pcr-selection .pcr-color-opacity .pcr-slider{background:linear-gradient(90deg,transparent,#000),url('data:image/svg+xml;utf8, <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 2 2\"><path fill=\"white\" d=\"M1,0H2V1H1V0ZM0,1H1V2H0V1Z\"/><path fill=\"gray\" d=\"M0,0H1V1H0V0ZM1,1H2V2H1V1Z\"/></svg>');background-size:100%,.25em}";
	styleInject(css);

	var css$1 = "@font-face {\n  font-family: 'iconfont';\n  src: url(\"iconfont.eot?t=1583832295186\");\n  /* IE9 */\n  src: url(\"iconfont.eot?t=1583832295186#iefix\") format(\"embedded-opentype\"), url(\"data:application/x-font-woff2;charset=utf-8;base64,d09GMgABAAAAAASkAAsAAAAACagAAARXAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHEIGVgCDKAqGNIU8ATYCJAMYCw4ABCAFhG0HXhtYCMiusHENiBkGbJfPhSUspyEo3Dwhgqe53nnJJnd/UwJygKwIQbkKWaEqDEogoe//t/O7gTxZkaHeTPxy3p+FJ1upBVV9dyuWckX3wNb5P0La/dqApfNQe3oSBVicVhZZgEmGtQVyw0/N7X/RvJqlOCDSmjZLSTzxiTqx64gmSEvAwbHUr6QHyfvgd+rIAY4HNKCophbeQCboe8im4Cu2GRiZNxPIRpgmVkyZ5QOphO0ViNMFJg1Sl1mKqQ1toQ45MUW8B5F28YJ/A4B39PvxFwyIlEJVYrfacnRyDsb9gNcT3P/PiZV14Mpz4nYaJaYhEQdC3bsIzPQ0pfxJC02hXVsFP/Z/8IMmbq0S/ssLhaQkakzdDbAbMhU/KGJbE1AhzQEV0BSMEkhBY1b1dYmakaNLjfn6aeVvUCl16RqvBSZWfUOsAPqW0Xyqblm4daPkDyLf/M2c6PPzzdu0QQ74XrVgS10JBrbENh6FkgdHcOXLQ0B8/7CUlfOaUPTHUkxayu0qW3bI2t0m8jdvl3S3U4mAPDJufOjIicGcUEW3lyegQFUeK/2A44Tm1UnIO1Tnmc25xXvVvjQaoVmwiZtOlKDFUjRfcUairpuA3JHcpYC8m5Q7lU3IcU0ubHb4fdXZrVJdnGulqKLQDp6CvNnuBvJentq5DI5Ndt3vJvx3mZ2tY0J9GmubOaNNKi+RSW2CmhIfAt+v97+pIFtp4A79w3TqURbGv9zK1xfnXfJ/mX00I6Nj51NBiNGmm1ual5v43FOT1Lyi8Evj61mI5oMH9VmmI6OXXYzpl+hj41WHborOUO6+fNNzdW8er3+sXLnuHXZoAc7HQYt3aYfrpR4yQoKIH5TuOhXO133Lq2UdVXFV/qoEkd9AHZeJS5FAo0E0Jhsv7NopfsGpB7wHYMw1PX1wXamN7UhrbEOvNiA+W4v3l3Z0CNqCNg6HHu99/E5m3ZvGh+bi42AlQGdt/8MBdLiJygcAnYuDcuObVu/u7N/yLfbtPPsba+7sCSU1o75KFQl8fp03JMtfoa0gteSs6ktCOv+ForuMWer09kqJpMqOArWlZOyoXllGB5i/j+9lafunria09beh0DIcSm3jkAk7DSqNeVBrWwzZVKtPb/R1kUCkLkzxRILQywco9PARSr18QibsN6gM8B9qvSKAbFcYLtiYkIJ8IkFpFuWozDKqkMVVWthYuVG7ADGLymnilBE9gEhDIUb1V/fmpqIqImUc0rCYGcCyNEUTXKGmSLdD5TKmagQXUZbtk2fZ2oi+VmFv1CeLKyC3HIGksZAcykHLUE7IwqpobXWW3PfzCyCMRcrSSMzIj2AAQjQorJ8y2wyzUiCnqqupRrZl80sWYwxwGYuWdzuKwCooq8CJlHkao5wP364IyWL1cTxHsmaEmbjS0bTqPvVrK0t5DWTs7nUUUUaKKupoyRdRBS9GvbO4bB1B8BIxWlrDhJWkc7lQMQl/JgAA\") format(\"woff2\"), url(\"iconfont.woff?t=1583832295186\") format(\"woff\"), url(\"iconfont.ttf?t=1583832295186\") format(\"truetype\"), url(\"iconfont.svg?t=1583832295186#iconfont\") format(\"svg\");\n  /* iOS 4.1- */ }\n\n.iconfont {\n  font-family: 'iconfont' !important;\n  font-size: 16px;\n  font-style: normal;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale; }\n\n.icon-remove-col:before {\n  content: '\\e601'; }\n\n.icon-remove-row:before {\n  content: '\\e602'; }\n\n.icon-export:before {\n  content: '\\e604'; }\n\n.icon-add-col:before {\n  content: '\\e603'; }\n\n.icon-add-row:before {\n  content: '\\e600'; }\n\n.json-form__wrapper {\n  display: flex;\n  font-size: var(--font-size);\n  font-weight: 300;\n  line-height: var(--line-height);\n  width: var(--width);\n  height: var(--height);\n  box-sizing: border-box;\n  border: 1.5px solid #dcdfe6;\n  transform: translateZ(0);\n  user-select: none; }\n  .json-form__wrapper .json-form__side-bar {\n    flex: 0 0 auto;\n    line-height: 1.2;\n    width: 60px;\n    border-right: 1.5px solid #dcdfe6; }\n    .json-form__wrapper .json-form__side-bar .icon {\n      text-align: center;\n      padding: 5px;\n      cursor: pointer; }\n      .json-form__wrapper .json-form__side-bar .icon:hover {\n        background-color: #e3edfc !important; }\n    .json-form__wrapper .json-form__side-bar .icon-add-row,\n    .json-form__wrapper .json-form__side-bar .icon-add-col {\n      font-size: 50px; }\n    .json-form__wrapper .json-form__side-bar .icon-remove-row,\n    .json-form__wrapper .json-form__side-bar .icon-remove-col {\n      font-size: 45px; }\n  .json-form__wrapper .json-form__main {\n    overflow: scroll;\n    width: inherit; }\n    .json-form__wrapper .json-form__main::-webkit-scrollbar {\n      width: 6px;\n      height: 6px; }\n    .json-form__wrapper .json-form__main::-webkit-scrollbar-thumb {\n      background-color: #b9bbbe;\n      border-radius: 10px;\n      min-height: 32px; }\n    .json-form__wrapper .json-form__main .json-form {\n      display: table;\n      border-collapse: collapse; }\n      .json-form__wrapper .json-form__main .json-form__top-bar {\n        display: table-header-group;\n        cursor: pointer; }\n        .json-form__wrapper .json-form__main .json-form__top-bar__col {\n          border-top: 0 !important;\n          white-space: nowrap; }\n          .json-form__wrapper .json-form__main .json-form__top-bar__col:hover {\n            background-color: #e3edfc !important; }\n      .json-form__wrapper .json-form__main .json-form__data-area {\n        display: table-row-group; }\n        .json-form__wrapper .json-form__main .json-form__data-area__row {\n          display: table-row; }\n          .json-form__wrapper .json-form__main .json-form__data-area__row div[contenteditable] {\n            word-break: keep-all; }\n          .json-form__wrapper .json-form__main .json-form__data-area__row div[contenteditable='false']:empty {\n            padding-bottom: calc(var(--line-height) * var(--font-size) + var(--padding-top)); }\n          .json-form__wrapper .json-form__main .json-form__data-area__row .row--remove,\n          .json-form__wrapper .json-form__main .json-form__data-area__row .col--remove {\n            cursor: grab;\n            background-color: #fd9b9b !important;\n            border-color: #fd9b9b !important; }\n          .json-form__wrapper .json-form__main .json-form__data-area__row:nth-child(2n + 1).bg-stripe {\n            background-color: #f3faff; }\n        .json-form__wrapper .json-form__main .json-form__data-area .row--hover:hover {\n          background-color: #e3edfc !important; }\n      .json-form__wrapper .json-form__main .json-form .col {\n        display: table-cell;\n        vertical-align: middle;\n        max-width: 250px;\n        border: 1.5px solid #dcdfe6;\n        padding: var(--padding-top) var(--padding-right);\n        overflow-wrap: break-word; }\n        .json-form__wrapper .json-form__main .json-form .col:first-child {\n          border-left: 0; }\n  .json-form__wrapper .message-box__wrapper {\n    display: flex;\n    justify-content: center;\n    align-items: center;\n    position: fixed;\n    left: 0;\n    right: 0;\n    top: 0;\n    bottom: 0;\n    background-color: #0000001c; }\n    .json-form__wrapper .message-box__wrapper .message-box {\n      display: flex;\n      flex-direction: column;\n      font-size: 20px;\n      width: 300px;\n      min-height: 150px;\n      padding: 10px;\n      border-radius: 10px;\n      background-color: #fff; }\n      .json-form__wrapper .message-box__wrapper .message-box header {\n        font-size: 25px;\n        padding-bottom: 10px; }\n      .json-form__wrapper .message-box__wrapper .message-box main {\n        display: flex;\n        flex-direction: column;\n        padding: 10px 5px; }\n        .json-form__wrapper .message-box__wrapper .message-box main label {\n          display: flex;\n          align-items: center;\n          position: relative;\n          padding-bottom: 30px; }\n          .json-form__wrapper .message-box__wrapper .message-box main label select {\n            font-size: inherit;\n            width: 200px;\n            padding: 3px 5px;\n            border: 1.5px solid #dcdfe6; }\n          .json-form__wrapper .message-box__wrapper .message-box main label input,\n          .json-form__wrapper .message-box__wrapper .message-box main label div[contenteditable] {\n            font-size: 20px;\n            width: 190px;\n            min-height: 30px;\n            padding: 0 5px;\n            border-radius: 5px;\n            border: 1.5px solid #dcdfe6;\n            letter-spacing: 1px;\n            outline: none;\n            cursor: text; }\n            .json-form__wrapper .message-box__wrapper .message-box main label input:hover,\n            .json-form__wrapper .message-box__wrapper .message-box main label div[contenteditable]:hover {\n              box-shadow: 0 0 5px #aad7f4;\n              border: 1.5px solid #aad7f4; }\n          .json-form__wrapper .message-box__wrapper .message-box main label .advice {\n            position: absolute;\n            bottom: 0;\n            margin: 0;\n            color: #f74343;\n            left: 70px; }\n          .json-form__wrapper .message-box__wrapper .message-box main label .data-component {\n            width: 190px;\n            padding-bottom: 6px; }\n      .json-form__wrapper .message-box__wrapper .message-box footer {\n        display: flex;\n        justify-content: center; }\n        .json-form__wrapper .message-box__wrapper .message-box footer .button {\n          border-radius: 5px;\n          padding: 5px 15px;\n          margin: 0 20px;\n          cursor: pointer; }\n          .json-form__wrapper .message-box__wrapper .message-box footer .button--confirm {\n            color: #409eff;\n            border: 1px solid #409eff; }\n            .json-form__wrapper .message-box__wrapper .message-box footer .button--confirm:hover {\n              color: #fff;\n              background-color: #409eff; }\n          .json-form__wrapper .message-box__wrapper .message-box footer .button--cancel {\n            color: #f55c5c;\n            border: 1px solid #f55c5c; }\n            .json-form__wrapper .message-box__wrapper .message-box footer .button--cancel:hover {\n              color: #fff;\n              background-color: #f55c5c; }\n          .json-form__wrapper .message-box__wrapper .message-box footer .button.disabled:hover {\n            color: #fff;\n            background-color: #f55c5c;\n            border: 1px solid #f55c5c; }\n  .json-form__wrapper .notification__wrapper {\n    transform: translateZ(0); }\n    .json-form__wrapper .notification__wrapper .notification {\n      position: fixed;\n      right: 20px;\n      top: 20px;\n      box-sizing: border-box;\n      color: #f51d1d;\n      font-weight: 500;\n      width: 320px;\n      padding: 20px;\n      border-radius: 10px;\n      border: 1px solid #dcdfe6;\n      background-color: #fff;\n      box-shadow: 0 0 10px #eeebeb; }\n      .json-form__wrapper .notification__wrapper .notification__content {\n        font-size: 20px;\n        overflow-wrap: break-word; }\n\n.choice-box {\n  width: 36px;\n  height: 24px;\n  margin: 0 auto;\n  border: 1.5px solid #dcdfe6;\n  border-radius: 50%;\n  cursor: pointer; }\n  .choice-box .check-mark {\n    visibility: hidden;\n    box-sizing: border-box;\n    width: 16.97056px;\n    height: 33.94113px;\n    border-right: 3.6px solid #57f19a;\n    border-top: 3.6px solid #57f19a;\n    transform-origin: top left;\n    transform: translate(3px, 12px) scaleY(-1) rotate(-45deg); }\n  .choice-box .show {\n    visibility: visible;\n    animation: show 0.6s ease; }\n\n@keyframes show {\n  0% {\n    width: 0;\n    height: 0; }\n  50% {\n    width: 16.97056px;\n    height: 0; }\n  100% {\n    width: 16.97056px;\n    height: 33.94113px; } }\n\n.pickr {\n  display: flex;\n  justify-content: center; }\n";
	styleInject(css$1);

	const subscriber_queue = [];
	/**
	 * Create a `Writable` store that allows both updating and reading by subscription.
	 * @param {*=}value initial value
	 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
	 */
	function writable(value, start = noop) {
	    let stop;
	    const subscribers = [];
	    function set(new_value) {
	        if (safe_not_equal(value, new_value)) {
	            value = new_value;
	            if (stop) { // store is ready
	                const run_queue = !subscriber_queue.length;
	                for (let i = 0; i < subscribers.length; i += 1) {
	                    const s = subscribers[i];
	                    s[1]();
	                    subscriber_queue.push(s, value);
	                }
	                if (run_queue) {
	                    for (let i = 0; i < subscriber_queue.length; i += 2) {
	                        subscriber_queue[i][0](subscriber_queue[i + 1]);
	                    }
	                    subscriber_queue.length = 0;
	                }
	            }
	        }
	    }
	    function update(fn) {
	        set(fn(value));
	    }
	    function subscribe(run, invalidate = noop) {
	        const subscriber = [run, invalidate];
	        subscribers.push(subscriber);
	        if (subscribers.length === 1) {
	            stop = start(set) || noop;
	        }
	        run(value);
	        return () => {
	            const index = subscribers.indexOf(subscriber);
	            if (index !== -1) {
	                subscribers.splice(index, 1);
	            }
	            if (subscribers.length === 0) {
	                stop();
	                stop = null;
	            }
	        };
	    }
	    return { set, update, subscribe };
	}

	function createCondition() {
	    const { subscribe, set } = writable(null);

	    return {
	        subscribe,
	        set: value => set(value),
	        reset: () => set(null),
	    }
	}

	const condition = createCondition();

	function createMessage() {
	    const data = {
	        type: null,
	        title: null,
	        value: null,
	        fn: null,
	    };
	    const { subscribe, set, update } = writable(data);

	    return {
	        subscribe,
	        set: message => set(message),
	        reset: () => set(data),
	        update: value =>
	            update(m => {
	                m.value = value;
	                return m
	            }),
	    }
	}

	const message = createMessage();

	function createNotification() {
	    const { subscribe, set } = writable(null);

	    let timer;

	    return {
	        subscribe,
	        set: async value => {
	            clearTimeout(timer);
	            set(null);
	            await tick();
	            set(value);
	            timer = setTimeout(() => {
	                set(null);
	            }, 3000);
	        },
	    }
	}

	const notification = createNotification();

	/* src\components\topBar\index.svelte generated by Svelte v3.19.1 */

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[5] = list[i].key;
		child_ctx[6] = list[i].name;
		return child_ctx;
	}

	// (2:4) {#each colList as { key, name }}
	function create_each_block(ctx) {
		let div;
		let t_value = /*name*/ ctx[6] + "";
		let t;
		let dispose;

		return {
			c() {
				div = element("div");
				t = text(t_value);
				attr(div, "class", "json-form__top-bar__col col");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, t);

				dispose = listen(div, "click", function () {
					if (is_function(/*updateCol*/ ctx[1](/*key*/ ctx[5], /*name*/ ctx[6]))) /*updateCol*/ ctx[1](/*key*/ ctx[5], /*name*/ ctx[6]).apply(this, arguments);
				});
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty & /*colList*/ 1 && t_value !== (t_value = /*name*/ ctx[6] + "")) set_data(t, t_value);
			},
			d(detaching) {
				if (detaching) detach(div);
				dispose();
			}
		};
	}

	function create_fragment(ctx) {
		let div;
		let each_value = /*colList*/ ctx[0];
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		return {
			c() {
				div = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(div, "class", "json-form__top-bar");
			},
			m(target, anchor) {
				insert(target, div, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}
			},
			p(ctx, [dirty]) {
				if (dirty & /*updateCol, colList*/ 3) {
					each_value = /*colList*/ ctx[0];
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) detach(div);
				destroy_each(each_blocks, detaching);
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let $message;
		component_subscribe($$self, message, $$value => $$invalidate(4, $message = $$value));
		let { json } = $$props;
		let { options } = $$props;
		let { colList } = $$props;

		function updateCol(oldKey, oldName) {
			condition.reset();
			if (!options.editable) return;

			if (json.length < 1) {
				notification.set("无法更新，请先添加行数据！");
				return;
			}

			message.set({
				type: "updateCol",
				title: "更新列",
				value: { oldKey, oldName },
				fn: () => {
					$$invalidate(2, json = json.map(row => {
						const { key, name } = $message.value;

						if (key !== oldKey) {
							row[key] = row[oldKey];
							delete row[oldKey];
						}

						row[key].name = name;
						return row;
					}));
				}
			});
		}

		$$self.$set = $$props => {
			if ("json" in $$props) $$invalidate(2, json = $$props.json);
			if ("options" in $$props) $$invalidate(3, options = $$props.options);
			if ("colList" in $$props) $$invalidate(0, colList = $$props.colList);
		};

		return [colList, updateCol, json, options];
	}

	class TopBar extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance, create_fragment, safe_not_equal, { json: 2, options: 3, colList: 0 });
		}
	}

	/* src\components\sideBar\index.svelte generated by Svelte v3.19.1 */

	function create_fragment$1(ctx) {
		let div4;
		let div0;
		let t0;
		let div1;
		let t1;
		let div2;
		let t2;
		let div3;
		let dispose;

		return {
			c() {
				div4 = element("div");
				div0 = element("div");
				t0 = space();
				div1 = element("div");
				t1 = space();
				div2 = element("div");
				t2 = space();
				div3 = element("div");
				attr(div0, "class", "icon iconfont icon-add-row");
				attr(div1, "class", "icon iconfont icon-add-col");
				attr(div2, "class", "icon iconfont icon-remove-row");
				attr(div3, "class", "icon iconfont icon-remove-col");
				attr(div4, "class", "json-form__side-bar");
			},
			m(target, anchor) {
				insert(target, div4, anchor);
				append(div4, div0);
				append(div4, t0);
				append(div4, div1);
				append(div4, t1);
				append(div4, div2);
				append(div4, t2);
				append(div4, div3);

				dispose = [
					listen(div0, "click", /*addRow*/ ctx[0]),
					listen(div1, "click", /*addCol*/ ctx[1]),
					listen(div2, "click", /*removeRow*/ ctx[2]),
					listen(div3, "click", /*removeCol*/ ctx[3])
				];
			},
			p: noop,
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) detach(div4);
				run_all(dispose);
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		let $message;
		let $condition;
		component_subscribe($$self, message, $$value => $$invalidate(6, $message = $$value));
		component_subscribe($$self, condition, $$value => $$invalidate(7, $condition = $$value));
		let { json } = $$props;
		let { colList } = $$props;

		function addRow() {
			condition.reset();

			if (colList.length < 1) {
				notification.set("请先添加列信息！");
				return;
			}

			let data = {};

			colList.forEach(({ key, name, type }) => {
				data[key] = { name, type };

				switch (type) {
					case "string":
						data[key].value = "";
						break;
					case "boolean":
						data[key].value = false;
						break;
					case "color":
						data[key].value = "#000000";
						break;
				}
			});

			$$invalidate(4, json = [...json, data]);
		}

		function addCol() {
			condition.reset();

			if (json.length < 1) {
				notification.set("请先添加行数据！");
				return;
			}

			message.set({
				type: "addCol",
				title: "新增列",
				value: null,
				fn: () => {
					$$invalidate(4, json = json.map(row => {
						const { key, name, type, value } = $message.value;
						row[key] = { name, type, value };
						return row;
					}));
				}
			});
		}

		function removeRow() {
			if ($condition === "remove-row") {
				condition.reset();
			} else {
				condition.set("remove-row");
			}
		}

		function removeCol() {
			if ($condition === "remove-col") {
				condition.reset();
			} else {
				condition.set("remove-col");
			}
		}

		$$self.$set = $$props => {
			if ("json" in $$props) $$invalidate(4, json = $$props.json);
			if ("colList" in $$props) $$invalidate(5, colList = $$props.colList);
		};

		return [addRow, addCol, removeRow, removeCol, json, colList];
	}

	class SideBar extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$1, create_fragment$1, safe_not_equal, { json: 4, colList: 5 });
		}
	}

	/* src\components\dataArea\contentEdit.svelte generated by Svelte v3.19.1 */

	function create_else_block(ctx) {
		let div;
		let div_class_value;
		let dispose;

		return {
			c() {
				div = element("div");
				attr(div, "class", div_class_value = /*$$props*/ ctx[4].class);
				attr(div, "contenteditable", "false");
				if (/*data*/ ctx[0][/*key*/ ctx[1]].value === void 0) add_render_callback(() => /*div_input_handler_1*/ ctx[10].call(div));
			},
			m(target, anchor) {
				insert(target, div, anchor);

				if (/*data*/ ctx[0][/*key*/ ctx[1]].value !== void 0) {
					div.innerHTML = /*data*/ ctx[0][/*key*/ ctx[1]].value;
				}

				dispose = [
					listen(div, "input", /*div_input_handler_1*/ ctx[10]),
					listen(div, "mousemove", /*mousemove_handler_1*/ ctx[7]),
					listen(div, "click", /*click_handler_1*/ ctx[8])
				];
			},
			p(ctx, dirty) {
				if (dirty & /*$$props*/ 16 && div_class_value !== (div_class_value = /*$$props*/ ctx[4].class)) {
					attr(div, "class", div_class_value);
				}

				if (dirty & /*data, key*/ 3 && /*data*/ ctx[0][/*key*/ ctx[1]].value !== div.innerHTML) {
					div.innerHTML = /*data*/ ctx[0][/*key*/ ctx[1]].value;
				}
			},
			d(detaching) {
				if (detaching) detach(div);
				run_all(dispose);
			}
		};
	}

	// (1:0) {#if options.editable && !$condition}
	function create_if_block(ctx) {
		let div;
		let div_class_value;
		let dispose;

		return {
			c() {
				div = element("div");
				attr(div, "class", div_class_value = /*$$props*/ ctx[4].class);
				attr(div, "contenteditable", "plaintext-only");
				if (/*data*/ ctx[0][/*key*/ ctx[1]].value === void 0) add_render_callback(() => /*div_input_handler*/ ctx[9].call(div));
			},
			m(target, anchor) {
				insert(target, div, anchor);

				if (/*data*/ ctx[0][/*key*/ ctx[1]].value !== void 0) {
					div.innerHTML = /*data*/ ctx[0][/*key*/ ctx[1]].value;
				}

				dispose = [
					listen(div, "input", /*div_input_handler*/ ctx[9]),
					listen(div, "mousemove", /*mousemove_handler*/ ctx[5]),
					listen(div, "click", /*click_handler*/ ctx[6])
				];
			},
			p(ctx, dirty) {
				if (dirty & /*$$props*/ 16 && div_class_value !== (div_class_value = /*$$props*/ ctx[4].class)) {
					attr(div, "class", div_class_value);
				}

				if (dirty & /*data, key*/ 3 && /*data*/ ctx[0][/*key*/ ctx[1]].value !== div.innerHTML) {
					div.innerHTML = /*data*/ ctx[0][/*key*/ ctx[1]].value;
				}
			},
			d(detaching) {
				if (detaching) detach(div);
				run_all(dispose);
			}
		};
	}

	function create_fragment$2(ctx) {
		let if_block_anchor;

		function select_block_type(ctx, dirty) {
			if (/*options*/ ctx[2].editable && !/*$condition*/ ctx[3]) return create_if_block;
			return create_else_block;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type(ctx);

		return {
			c() {
				if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
			},
			p(ctx, [dirty]) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if_block.d(detaching);
				if (detaching) detach(if_block_anchor);
			}
		};
	}

	function instance$2($$self, $$props, $$invalidate) {
		let $condition;
		component_subscribe($$self, condition, $$value => $$invalidate(3, $condition = $$value));
		let { data } = $$props;
		let { key } = $$props;
		let { options } = $$props;

		function mousemove_handler(event) {
			bubble($$self, event);
		}

		function click_handler(event) {
			bubble($$self, event);
		}

		function mousemove_handler_1(event) {
			bubble($$self, event);
		}

		function click_handler_1(event) {
			bubble($$self, event);
		}

		function div_input_handler() {
			data[key].value = this.innerHTML;
			$$invalidate(0, data);
			$$invalidate(1, key);
		}

		function div_input_handler_1() {
			data[key].value = this.innerHTML;
			$$invalidate(0, data);
			$$invalidate(1, key);
		}

		$$self.$set = $$new_props => {
			$$invalidate(4, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			if ("data" in $$new_props) $$invalidate(0, data = $$new_props.data);
			if ("key" in $$new_props) $$invalidate(1, key = $$new_props.key);
			if ("options" in $$new_props) $$invalidate(2, options = $$new_props.options);
		};

		$$props = exclude_internal_props($$props);

		return [
			data,
			key,
			options,
			$condition,
			$$props,
			mousemove_handler,
			click_handler,
			mousemove_handler_1,
			click_handler_1,
			div_input_handler,
			div_input_handler_1
		];
	}

	class ContentEdit extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$2, create_fragment$2, safe_not_equal, { data: 0, key: 1, options: 2 });
		}
	}

	function cubicOut(t) {
	    const f = t - 1.0;
	    return f * f * f + 1.0;
	}

	function fade(node, { delay = 0, duration = 400, easing = identity }) {
	    const o = +getComputedStyle(node).opacity;
	    return {
	        delay,
	        duration,
	        easing,
	        css: t => `opacity: ${t * o}`
	    };
	}
	function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
	    const style = getComputedStyle(node);
	    const target_opacity = +style.opacity;
	    const transform = style.transform === 'none' ? '' : style.transform;
	    const od = target_opacity * (1 - opacity);
	    return {
	        delay,
	        duration,
	        easing,
	        css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
	    };
	}

	/* src\components\dataArea\choiceBox.svelte generated by Svelte v3.19.1 */

	function create_if_block$1(ctx) {
		let div;
		let div_outro;
		let current;

		return {
			c() {
				div = element("div");
				attr(div, "class", "check-mark show");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				current = true;
			},
			i(local) {
				if (current) return;
				if (div_outro) div_outro.end(1);
				current = true;
			},
			o(local) {
				if (local) {
					div_outro = create_out_transition(div, fade, {});
				}

				current = false;
			},
			d(detaching) {
				if (detaching) detach(div);
				if (detaching && div_outro) div_outro.end();
			}
		};
	}

	function create_fragment$3(ctx) {
		let div1;
		let div0;
		let div1_class_value;
		let dispose;
		let if_block = /*data*/ ctx[0][/*key*/ ctx[1]].value && create_if_block$1();

		return {
			c() {
				div1 = element("div");
				div0 = element("div");
				if (if_block) if_block.c();
				attr(div0, "class", "choice-box");
				attr(div1, "class", div1_class_value = /*$$props*/ ctx[3].class);
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				if (if_block) if_block.m(div0, null);

				dispose = [
					listen(div0, "click", /*click*/ ctx[2]),
					listen(div1, "mousemove", /*mousemove_handler*/ ctx[5]),
					listen(div1, "click", /*click_handler*/ ctx[6])
				];
			},
			p(ctx, [dirty]) {
				if (/*data*/ ctx[0][/*key*/ ctx[1]].value) {
					if (!if_block) {
						if_block = create_if_block$1();
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(div0, null);
					} else {
						transition_in(if_block, 1);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}

				if (dirty & /*$$props*/ 8 && div1_class_value !== (div1_class_value = /*$$props*/ ctx[3].class)) {
					attr(div1, "class", div1_class_value);
				}
			},
			i(local) {
				transition_in(if_block);
			},
			o(local) {
				transition_out(if_block);
			},
			d(detaching) {
				if (detaching) detach(div1);
				if (if_block) if_block.d();
				run_all(dispose);
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let { data } = $$props;
		let { key } = $$props;
		let { options } = $$props;

		function click() {
			if (!options.editable) return;
			$$invalidate(0, data[key].value = !data[key].value, data);
		}

		function mousemove_handler(event) {
			bubble($$self, event);
		}

		function click_handler(event) {
			bubble($$self, event);
		}

		$$self.$set = $$new_props => {
			$$invalidate(3, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			if ("data" in $$new_props) $$invalidate(0, data = $$new_props.data);
			if ("key" in $$new_props) $$invalidate(1, key = $$new_props.key);
			if ("options" in $$new_props) $$invalidate(4, options = $$new_props.options);
		};

		$$props = exclude_internal_props($$props);
		return [data, key, click, $$props, options, mousemove_handler, click_handler];
	}

	class ChoiceBox extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$3, create_fragment$3, safe_not_equal, { data: 0, key: 1, options: 4 });
		}
	}

	function unwrapExports (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var pickr_min = createCommonjsModule(function (module, exports) {
	/*! Pickr 1.5.1 MIT | https://github.com/Simonwep/pickr */
	!function(t,e){module.exports=e();}(window,(function(){return function(t){var e={};function o(n){if(e[n])return e[n].exports;var i=e[n]={i:n,l:!1,exports:{}};return t[n].call(i.exports,i,i.exports,o),i.l=!0,i.exports}return o.m=t,o.c=e,o.d=function(t,e,n){o.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n});},o.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0});},o.t=function(t,e){if(1&e&&(t=o(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(o.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var i in t)o.d(n,i,function(e){return t[e]}.bind(null,i));return n},o.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return o.d(e,"a",e),e},o.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},o.p="",o(o.s=1)}([function(t){t.exports=JSON.parse('{"a":"1.5.1"}');},function(t,e,o){o.r(e);var n={};function i(t,e){var o=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter((function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable}))),o.push.apply(o,n);}return o}function r(t){for(var e=1;e<arguments.length;e++){var o=null!=arguments[e]?arguments[e]:{};e%2?i(Object(o),!0).forEach((function(e){s(t,e,o[e]);})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(o)):i(Object(o)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(o,e));}));}return t}function s(t,e,o){return e in t?Object.defineProperty(t,e,{value:o,enumerable:!0,configurable:!0,writable:!0}):t[e]=o,t}function c(t,e,o,n,i={}){e instanceof HTMLCollection||e instanceof NodeList?e=Array.from(e):Array.isArray(e)||(e=[e]),Array.isArray(o)||(o=[o]);for(const s of e)for(const e of o)s[t](e,n,r({capture:!1},i));return Array.prototype.slice.call(arguments,1)}o.r(n),o.d(n,"on",(function(){return a})),o.d(n,"off",(function(){return l})),o.d(n,"createElementFromString",(function(){return p})),o.d(n,"removeAttribute",(function(){return u})),o.d(n,"createFromTemplate",(function(){return h})),o.d(n,"eventPath",(function(){return d})),o.d(n,"resolveElement",(function(){return f})),o.d(n,"adjustableInputNumbers",(function(){return m}));const a=c.bind(null,"addEventListener"),l=c.bind(null,"removeEventListener");function p(t){const e=document.createElement("div");return e.innerHTML=t.trim(),e.firstElementChild}function u(t,e){const o=t.getAttribute(e);return t.removeAttribute(e),o}function h(t){return function t(e,o={}){const n=u(e,":obj"),i=u(e,":ref"),r=n?o[n]={}:o;i&&(o[i]=e);for(const o of Array.from(e.children)){const e=u(o,":arr"),n=t(o,e?{}:r);e&&(r[e]||(r[e]=[])).push(Object.keys(n).length?n:o);}return o}(p(t))}function d(t){let e=t.path||t.composedPath&&t.composedPath();if(e)return e;let o=t.target.parentElement;for(e=[t.target,o];o=o.parentElement;)e.push(o);return e.push(document,window),e}function f(t){return t instanceof Element?t:"string"==typeof t?t.split(/>>/g).reduce((t,e,o,n)=>(t=t.querySelector(e),o<n.length-1?t.shadowRoot:t),document):null}function m(t,e=(t=>t)){function o(o){const n=[.001,.01,.1][Number(o.shiftKey||2*o.ctrlKey)]*(o.deltaY<0?1:-1);let i=0,r=t.selectionStart;t.value=t.value.replace(/[\d.]+/g,(t,o)=>o<=r&&o+t.length>=r?(r=o,e(Number(t),n,i)):(i++,t)),t.focus(),t.setSelectionRange(r,r),o.preventDefault(),t.dispatchEvent(new Event("input"));}a(t,"focus",()=>a(window,"wheel",o,{passive:!1})),a(t,"blur",()=>l(window,"wheel",o));}var v=o(0);const{min:b,max:y,floor:g,round:_}=Math;function w(t,e,o){e/=100,o/=100;const n=g(t=t/360*6),i=t-n,r=o*(1-e),s=o*(1-i*e),c=o*(1-(1-i)*e),a=n%6;return [255*[o,s,r,r,c,o][a],255*[c,o,o,s,r,r][a],255*[r,r,c,o,o,s][a]]}function A(t,e,o){const n=(2-(e/=100))*(o/=100)/2;return 0!==n&&(e=1===n?0:n<.5?e*o/(2*n):e*o/(2-2*n)),[t,100*e,100*n]}function C(t,e,o){const n=b(t/=255,e/=255,o/=255),i=y(t,e,o),r=i-n;let s,c;if(0===r)s=c=0;else {c=r/i;const n=((i-t)/6+r/2)/r,a=((i-e)/6+r/2)/r,l=((i-o)/6+r/2)/r;t===i?s=l-a:e===i?s=1/3+n-l:o===i&&(s=2/3+a-n),s<0?s+=1:s>1&&(s-=1);}return [360*s,100*c,100*i]}function k(t,e,o,n){return e/=100,o/=100,[...C(255*(1-b(1,(t/=100)*(1-(n/=100))+n)),255*(1-b(1,e*(1-n)+n)),255*(1-b(1,o*(1-n)+n)))]}function S(t,e,o){return e/=100,[t,2*(e*=(o/=100)<.5?o:1-o)/(o+e)*100,100*(o+e)]}function O(t){return C(...t.match(/.{2}/g).map(t=>parseInt(t,16)))}function j(t){t=t.match(/^[a-zA-Z]+$/)?function(t){if("black"===t.toLowerCase())return "#000";const e=document.createElement("canvas").getContext("2d");return e.fillStyle=t,"#000"===e.fillStyle?null:e.fillStyle}(t):t;const e={cmyk:/^cmyk[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)/i,rgba:/^((rgba)|rgb)[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)[\D]*?([\d.]+|$)/i,hsla:/^((hsla)|hsl)[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)[\D]*?([\d.]+|$)/i,hsva:/^((hsva)|hsv)[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)[\D]*?([\d.]+|$)/i,hexa:/^#?(([\dA-Fa-f]{3,4})|([\dA-Fa-f]{6})|([\dA-Fa-f]{8}))$/i},o=t=>t.map(t=>/^(|\d+)\.\d+|\d+$/.test(t)?Number(t):void 0);let n;t:for(const i in e){if(!(n=e[i].exec(t)))continue;const r=t=>!!n[2]==("number"==typeof t);switch(i){case"cmyk":{const[,t,e,r,s]=o(n);if(t>100||e>100||r>100||s>100)break t;return {values:k(t,e,r,s),type:i}}case"rgba":{const[,,,t,e,s,c]=o(n);if(t>255||e>255||s>255||c<0||c>1||!r(c))break t;return {values:[...C(t,e,s),c],a:c,type:i}}case"hexa":{let[,t]=n;4!==t.length&&3!==t.length||(t=t.split("").map(t=>t+t).join(""));const e=t.substring(0,6);let o=t.substring(6);return o=o?parseInt(o,16)/255:void 0,{values:[...O(e),o],a:o,type:i}}case"hsla":{const[,,,t,e,s,c]=o(n);if(t>360||e>100||s>100||c<0||c>1||!r(c))break t;return {values:[...S(t,e,s),c],a:c,type:i}}case"hsva":{const[,,,t,e,s,c]=o(n);if(t>360||e>100||s>100||c<0||c>1||!r(c))break t;return {values:[t,e,s,c],a:c,type:i}}}}return {values:null,type:null}}function x(t=0,e=0,o=0,n=1){const i=(t,e)=>(o=-1)=>e(~o?t.map(t=>Number(t.toFixed(o))):t),r={h:t,s:e,v:o,a:n,toHSVA(){const t=[r.h,r.s,r.v,r.a];return t.toString=i(t,t=>"hsva(".concat(t[0],", ").concat(t[1],"%, ").concat(t[2],"%, ").concat(r.a,")")),t},toHSLA(){const t=[...A(r.h,r.s,r.v),r.a];return t.toString=i(t,t=>"hsla(".concat(t[0],", ").concat(t[1],"%, ").concat(t[2],"%, ").concat(r.a,")")),t},toRGBA(){const t=[...w(r.h,r.s,r.v),r.a];return t.toString=i(t,t=>"rgba(".concat(t[0],", ").concat(t[1],", ").concat(t[2],", ").concat(r.a,")")),t},toCMYK(){const t=function(t,e,o){const n=w(t,e,o),i=n[0]/255,r=n[1]/255,s=n[2]/255,c=b(1-i,1-r,1-s);return [100*(1===c?0:(1-i-c)/(1-c)),100*(1===c?0:(1-r-c)/(1-c)),100*(1===c?0:(1-s-c)/(1-c)),100*c]}(r.h,r.s,r.v);return t.toString=i(t,t=>"cmyk(".concat(t[0],"%, ").concat(t[1],"%, ").concat(t[2],"%, ").concat(t[3],"%)")),t},toHEXA(){const t=function(t,e,o){return w(t,e,o).map(t=>_(t).toString(16).padStart(2,"0"))}(r.h,r.s,r.v),e=r.a>=1?"":Number((255*r.a).toFixed(0)).toString(16).toUpperCase().padStart(2,"0");return e&&t.push(e),t.toString=()=>"#".concat(t.join("").toUpperCase()),t},clone:()=>x(r.h,r.s,r.v,r.a)};return r}const E=t=>Math.max(Math.min(t,1),0);function L(t){const e={options:Object.assign({lock:null,onchange:()=>0,onstop:()=>0},t),_keyboard(t){const{options:o}=e,{type:n,key:i}=t;if(document.activeElement===o.wrapper){const{lock:o}=e.options,r="ArrowUp"===i,s="ArrowRight"===i,c="ArrowDown"===i,a="ArrowLeft"===i;if("keydown"===n&&(r||s||c||a)){let n=0,i=0;"v"===o?n=r||s?1:-1:"h"===o?n=r||s?-1:1:(i=r?-1:c?1:0,n=a?-1:s?1:0),e.update(E(e.cache.x+.01*n),E(e.cache.y+.01*i)),t.preventDefault();}else i.startsWith("Arrow")&&(e.options.onstop(),t.preventDefault());}},_tapstart(t){a(document,["mouseup","touchend","touchcancel"],e._tapstop),a(document,["mousemove","touchmove"],e._tapmove),t.preventDefault(),e._tapmove(t);},_tapmove(t){const{options:o,cache:n}=e,{lock:i,element:r,wrapper:s}=o,c=s.getBoundingClientRect();let a=0,l=0;if(t){const e=t&&t.touches&&t.touches[0];a=t?(e||t).clientX:0,l=t?(e||t).clientY:0,a<c.left?a=c.left:a>c.left+c.width&&(a=c.left+c.width),l<c.top?l=c.top:l>c.top+c.height&&(l=c.top+c.height),a-=c.left,l-=c.top;}else n&&(a=n.x*c.width,l=n.y*c.height);"h"!==i&&(r.style.left="calc(".concat(a/c.width*100,"% - ").concat(r.offsetWidth/2,"px)")),"v"!==i&&(r.style.top="calc(".concat(l/c.height*100,"% - ").concat(r.offsetHeight/2,"px)")),e.cache={x:a/c.width,y:l/c.height};const p=E(a/c.width),u=E(l/c.height);switch(i){case"v":return o.onchange(p);case"h":return o.onchange(u);default:return o.onchange(p,u)}},_tapstop(){e.options.onstop(),l(document,["mouseup","touchend","touchcancel"],e._tapstop),l(document,["mousemove","touchmove"],e._tapmove);},trigger(){e._tapmove();},update(t=0,o=0){const{left:n,top:i,width:r,height:s}=e.options.wrapper.getBoundingClientRect();"h"===e.options.lock&&(o=t),e._tapmove({clientX:n+r*t,clientY:i+s*o});},destroy(){const{options:t,_tapstart:o,_keyboard:n}=e;l(document,["keydown","keyup"],n),l([t.wrapper,t.element],"mousedown",o),l([t.wrapper,t.element],"touchstart",o,{passive:!1});}},{options:o,_tapstart:n,_keyboard:i}=e;return a([o.wrapper,o.element],"mousedown",n),a([o.wrapper,o.element],"touchstart",n,{passive:!1}),a(document,["keydown","keyup"],i),e}function P(t={}){t=Object.assign({onchange:()=>0,className:"",elements:[]},t);const e=a(t.elements,"click",e=>{t.elements.forEach(o=>o.classList[e.target===o?"add":"remove"](t.className)),t.onchange(e);});return {destroy:()=>l(...e)}}function B({el:t,reference:e,padding:o=8}){const n={start:"sme",middle:"mse",end:"ems"},i={top:"tbrl",right:"rltb",bottom:"btrl",left:"lrbt"},r=((t={})=>(e,o=t[e])=>{if(o)return o;const[n,i="middle"]=e.split("-"),r="top"===n||"bottom"===n;return t[e]={position:n,variant:i,isVertical:r}})();return {update(s,c=!1){const{position:a,variant:l,isVertical:p}=r(s),u=e.getBoundingClientRect(),h=t.getBoundingClientRect(),d=t=>t?{t:u.top-h.height-o,b:u.bottom+o}:{r:u.right+o,l:u.left-h.width-o},f=t=>t?{s:u.left+u.width-h.width,m:-h.width/2+(u.left+u.width/2),e:u.left}:{s:u.bottom-h.height,m:u.bottom-u.height/2-h.height/2,e:u.bottom-u.height},m={},v=(t,e,o)=>{const n="top"===o,i=n?h.height:h.width,r=window[n?"innerHeight":"innerWidth"];for(const n of t){const t=e[n],s=m[o]="".concat(t,"px");if(t>0&&t+i<r)return s}return null};for(const e of [p,!p]){const o=e?"top":"left",r=e?"left":"top",s=v(i[a],d(e),o),c=v(n[l],f(e),r);if(s&&c)return t.style[r]=c,void(t.style[o]=s)}c?(t.style.top="".concat((window.innerHeight-h.height)/2,"px"),t.style.left="".concat((window.innerWidth-h.width)/2,"px")):(t.style.left=m.left,t.style.top=m.top);}}}function H(t,e,o){return e in t?Object.defineProperty(t,e,{value:o,enumerable:!0,configurable:!0,writable:!0}):t[e]=o,t}class R{constructor(t){H(this,"_initializingActive",!0),H(this,"_recalc",!0),H(this,"_nanopop",null),H(this,"_root",null),H(this,"_color",x()),H(this,"_lastColor",x()),H(this,"_swatchColors",[]),H(this,"_eventListener",{init:[],save:[],hide:[],show:[],clear:[],change:[],changestop:[],cancel:[],swatchselect:[]}),this.options=t=Object.assign({appClass:null,theme:"classic",useAsButton:!1,padding:8,disabled:!1,comparison:!0,closeOnScroll:!1,outputPrecision:0,lockOpacity:!1,autoReposition:!0,container:"body",components:{interaction:{}},strings:{},swatches:null,inline:!1,sliders:null,default:"#42445a",defaultRepresentation:null,position:"bottom-middle",adjustableNumbers:!0,showAlways:!1,closeWithKey:"Escape"},t);const{swatches:e,components:o,theme:n,sliders:i,lockOpacity:r,padding:s}=t;["nano","monolith"].includes(n)&&!i&&(t.sliders="h"),o.interaction||(o.interaction={});const{preview:c,opacity:a,hue:l,palette:p}=o;o.opacity=!r&&a,o.palette=p||c||a||l,this._preBuild(),this._buildComponents(),this._bindEvents(),this._finalBuild(),e&&e.length&&e.forEach(t=>this.addSwatch(t));const{button:u,app:h}=this._root;this._nanopop=B({reference:u,padding:s,el:h}),u.setAttribute("role","button"),u.setAttribute("aria-label","toggle color picker dialog");const d=this;requestAnimationFrame((function e(){if(!h.offsetWidth&&h.parentElement!==t.container)return requestAnimationFrame(e);d.setColor(t.default),d._rePositioningPicker(),t.defaultRepresentation&&(d._representation=t.defaultRepresentation,d.setColorRepresentation(d._representation)),t.showAlways&&d.show(),d._initializingActive=!1,d._emit("init");}));}_preBuild(){const t=this.options;for(const e of ["el","container"])t[e]=f(t[e]);this._root=(({components:t,strings:e,useAsButton:o,inline:n,appClass:i,theme:r,lockOpacity:s})=>{const c=t=>t?"":'style="display:none" hidden',a=h('\n      <div :ref="root" class="pickr">\n\n        '.concat(o?"":'<button type="button" :ref="button" class="pcr-button"></button>','\n\n        <div :ref="app" class="pcr-app ').concat(i||"",'" data-theme="').concat(r,'" ').concat(n?'style="position: unset"':"",' aria-label="color picker dialog" role="form">\n          <div class="pcr-selection" ').concat(c(t.palette),'>\n            <div :obj="preview" class="pcr-color-preview" ').concat(c(t.preview),'>\n              <button type="button" :ref="lastColor" class="pcr-last-color" aria-label="use previous color"></button>\n              <div :ref="currentColor" class="pcr-current-color"></div>\n            </div>\n\n            <div :obj="palette" class="pcr-color-palette">\n              <div :ref="picker" class="pcr-picker"></div>\n              <div :ref="palette" class="pcr-palette" tabindex="0" aria-label="color selection area" role="listbox"></div>\n            </div>\n\n            <div :obj="hue" class="pcr-color-chooser" ').concat(c(t.hue),'>\n              <div :ref="picker" class="pcr-picker"></div>\n              <div :ref="slider" class="pcr-hue pcr-slider" tabindex="0" aria-label="hue selection slider" role="slider"></div>\n            </div>\n\n            <div :obj="opacity" class="pcr-color-opacity" ').concat(c(t.opacity),'>\n              <div :ref="picker" class="pcr-picker"></div>\n              <div :ref="slider" class="pcr-opacity pcr-slider" tabindex="0" aria-label="opacity selection slider" role="slider"></div>\n            </div>\n          </div>\n\n          <div class="pcr-swatches ').concat(t.palette?"":"pcr-last",'" :ref="swatches"></div> \n\n          <div :obj="interaction" class="pcr-interaction" ').concat(c(Object.keys(t.interaction).length),'>\n            <input :ref="result" class="pcr-result" type="text" spellcheck="false" ').concat(c(t.interaction.input),'>\n\n            <input :arr="options" class="pcr-type" data-type="HEXA" value="').concat(s?"HEX":"HEXA",'" type="button" ').concat(c(t.interaction.hex),'>\n            <input :arr="options" class="pcr-type" data-type="RGBA" value="').concat(s?"RGB":"RGBA",'" type="button" ').concat(c(t.interaction.rgba),'>\n            <input :arr="options" class="pcr-type" data-type="HSLA" value="').concat(s?"HSL":"HSLA",'" type="button" ').concat(c(t.interaction.hsla),'>\n            <input :arr="options" class="pcr-type" data-type="HSVA" value="').concat(s?"HSV":"HSVA",'" type="button" ').concat(c(t.interaction.hsva),'>\n            <input :arr="options" class="pcr-type" data-type="CMYK" value="CMYK" type="button" ').concat(c(t.interaction.cmyk),'>\n\n            <input :ref="save" class="pcr-save" value="').concat(e.save||"Save",'" type="button" ').concat(c(t.interaction.save),' aria-label="save and exit">\n            <input :ref="cancel" class="pcr-cancel" value="').concat(e.cancel||"Cancel",'" type="button" ').concat(c(t.interaction.cancel),' aria-label="cancel and exit">\n            <input :ref="clear" class="pcr-clear" value="').concat(e.clear||"Clear",'" type="button" ').concat(c(t.interaction.clear),' aria-label="clear and exit">\n          </div>\n        </div>\n      </div>\n    ')),l=a.interaction;return l.options.find(t=>!t.hidden&&!t.classList.add("active")),l.type=()=>l.options.find(t=>t.classList.contains("active")),a})(t),t.useAsButton&&(this._root.button=t.el),t.container.appendChild(this._root.root);}_finalBuild(){const t=this.options,e=this._root;if(t.container.removeChild(e.root),t.inline){const o=t.el.parentElement;t.el.nextSibling?o.insertBefore(e.app,t.el.nextSibling):o.appendChild(e.app);}else t.container.appendChild(e.app);t.useAsButton?t.inline&&t.el.remove():t.el.parentNode.replaceChild(e.root,t.el),t.disabled&&this.disable(),t.comparison||(e.button.style.transition="none",t.useAsButton||(e.preview.lastColor.style.transition="none")),this.hide();}_buildComponents(){const t=this,e=this.options.components,o=(t.options.sliders||"v").repeat(2),[n,i]=o.match(/^[vh]+$/g)?o:[],r=()=>this._color||(this._color=this._lastColor.clone()),s={palette:L({element:t._root.palette.picker,wrapper:t._root.palette.palette,onstop:()=>t._emit("changestop",t),onchange(o,n){if(!e.palette)return;const i=r(),{_root:s,options:c}=t,{lastColor:a,currentColor:l}=s.preview;t._recalc&&(i.s=100*o,i.v=100-100*n,i.v<0&&(i.v=0),t._updateOutput());const p=i.toRGBA().toString(0);this.element.style.background=p,this.wrapper.style.background="\n                        linear-gradient(to top, rgba(0, 0, 0, ".concat(i.a,"), transparent),\n                        linear-gradient(to left, hsla(").concat(i.h,", 100%, 50%, ").concat(i.a,"), rgba(255, 255, 255, ").concat(i.a,"))\n                    "),c.comparison?c.useAsButton||t._lastColor||(a.style.color=p):(s.button.style.color=p,s.button.classList.remove("clear"));const u=i.toHEXA().toString();for(const{el:e,color:o}of t._swatchColors)e.classList[u===o.toHEXA().toString()?"add":"remove"]("pcr-active");l.style.color=p;}}),hue:L({lock:"v"===i?"h":"v",element:t._root.hue.picker,wrapper:t._root.hue.slider,onstop:()=>t._emit("changestop",t),onchange(o){if(!e.hue||!e.palette)return;const n=r();t._recalc&&(n.h=360*o),this.element.style.backgroundColor="hsl(".concat(n.h,", 100%, 50%)"),s.palette.trigger();}}),opacity:L({lock:"v"===n?"h":"v",element:t._root.opacity.picker,wrapper:t._root.opacity.slider,onstop:()=>t._emit("changestop",t),onchange(o){if(!e.opacity||!e.palette)return;const n=r();t._recalc&&(n.a=Math.round(100*o)/100),this.element.style.background="rgba(0, 0, 0, ".concat(n.a,")"),s.palette.trigger();}}),selectable:P({elements:t._root.interaction.options,className:"active",onchange(e){t._representation=e.target.getAttribute("data-type").toUpperCase(),t._recalc&&t._updateOutput();}})};this._components=s;}_bindEvents(){const{_root:t,options:e}=this,o=[a(t.interaction.clear,"click",()=>this._clearColor()),a([t.interaction.cancel,t.preview.lastColor],"click",()=>{this._emit("cancel",this),this.setHSVA(...(this._lastColor||this._color).toHSVA(),!0);}),a(t.interaction.save,"click",()=>{!this.applyColor()&&!e.showAlways&&this.hide();}),a(t.interaction.result,["keyup","input"],t=>{this.setColor(t.target.value,!0)&&!this._initializingActive&&this._emit("change",this._color),t.stopImmediatePropagation();}),a(t.interaction.result,["focus","blur"],t=>{this._recalc="blur"===t.type,this._recalc&&this._updateOutput();}),a([t.palette.palette,t.palette.picker,t.hue.slider,t.hue.picker,t.opacity.slider,t.opacity.picker],["mousedown","touchstart"],()=>this._recalc=!0)];if(!e.showAlways){const n=e.closeWithKey;o.push(a(t.button,"click",()=>this.isOpen()?this.hide():this.show()),a(document,"keyup",t=>this.isOpen()&&(t.key===n||t.code===n)&&this.hide()),a(document,["touchstart","mousedown"],e=>{this.isOpen()&&!d(e).some(e=>e===t.app||e===t.button)&&this.hide();},{capture:!0}));}if(e.adjustableNumbers){const e={rgba:[255,255,255,1],hsva:[360,100,100,1],hsla:[360,100,100,1],cmyk:[100,100,100,100]};m(t.interaction.result,(t,o,n)=>{const i=e[this.getColorRepresentation().toLowerCase()];if(i){const e=i[n],r=t+(e>=100?1e3*o:o);return r<=0?0:Number((r<e?r:e).toPrecision(3))}return t});}if(e.autoReposition&&!e.inline){let t=null;const n=this;o.push(a(window,["scroll","resize"],()=>{n.isOpen()&&(e.closeOnScroll&&n.hide(),null===t?(t=setTimeout(()=>t=null,100),requestAnimationFrame((function e(){n._rePositioningPicker(),null!==t&&requestAnimationFrame(e);}))):(clearTimeout(t),t=setTimeout(()=>t=null,100)));},{capture:!0}));}this._eventBindings=o;}_rePositioningPicker(){const{options:t}=this;t.inline||this._nanopop.update(t.position,!this._recalc);}_updateOutput(){const{_root:t,_color:e,options:o}=this;if(t.interaction.type()){const n="to".concat(t.interaction.type().getAttribute("data-type"));t.interaction.result.value="function"==typeof e[n]?e[n]().toString(o.outputPrecision):"";}!this._initializingActive&&this._recalc&&this._emit("change",e);}_clearColor(t=!1){const{_root:e,options:o}=this;o.useAsButton||(e.button.style.color="rgba(0, 0, 0, 0.15)"),e.button.classList.add("clear"),o.showAlways||this.hide(),this._lastColor=null,this._initializingActive||t||(this._emit("save",null),this._emit("clear",this));}_parseLocalColor(t){const{values:e,type:o,a:n}=j(t),{lockOpacity:i}=this.options,r=void 0!==n&&1!==n;return e&&3===e.length&&(e[3]=void 0),{values:!e||i&&r?null:e,type:o}}_emit(t,...e){this._eventListener[t].forEach(t=>t(...e,this));}on(t,e){return "function"==typeof e&&"string"==typeof t&&t in this._eventListener&&this._eventListener[t].push(e),this}off(t,e){const o=this._eventListener[t];if(o){const t=o.indexOf(e);~t&&o.splice(t,1);}return this}addSwatch(t){const{values:e}=this._parseLocalColor(t);if(e){const{_swatchColors:t,_root:o}=this,n=x(...e),i=p('<button type="button" style="color: '.concat(n.toRGBA().toString(0),'" aria-label="color swatch"/>'));return o.swatches.appendChild(i),t.push({el:i,color:n}),this._eventBindings.push(a(i,"click",()=>{this.setHSVA(...n.toHSVA(),!0),this._emit("swatchselect",n),this._emit("change",n);})),!0}return !1}removeSwatch(t){const e=this._swatchColors[t];if(e){const{el:o}=e;return this._root.swatches.removeChild(o),this._swatchColors.splice(t,1),!0}return !1}applyColor(t=!1){const{preview:e,button:o}=this._root,n=this._color.toRGBA().toString(0);return e.lastColor.style.color=n,this.options.useAsButton||(o.style.color=n),o.classList.remove("clear"),this._lastColor=this._color.clone(),this._initializingActive||t||this._emit("save",this._color),this}destroy(){this._eventBindings.forEach(t=>l(...t)),Object.keys(this._components).forEach(t=>this._components[t].destroy());}destroyAndRemove(){this.destroy();const{root:t,app:e}=this._root;t.parentElement&&t.parentElement.removeChild(t),e.parentElement.removeChild(e),Object.keys(this).forEach(t=>this[t]=null);}hide(){return this._root.app.classList.remove("visible"),this._emit("hide",this),this}show(){return this.options.disabled||(this._root.app.classList.add("visible"),this._rePositioningPicker(),this._emit("show",this)),this}isOpen(){return this._root.app.classList.contains("visible")}setHSVA(t=360,e=0,o=0,n=1,i=!1){const r=this._recalc;if(this._recalc=!1,t<0||t>360||e<0||e>100||o<0||o>100||n<0||n>1)return !1;this._color=x(t,e,o,n);const{hue:s,opacity:c,palette:a}=this._components;return s.update(t/360),c.update(n),a.update(e/100,1-o/100),i||this.applyColor(),r&&this._updateOutput(),this._recalc=r,!0}setColor(t,e=!1){if(null===t)return this._clearColor(e),!0;const{values:o,type:n}=this._parseLocalColor(t);if(o){const t=n.toUpperCase(),{options:i}=this._root.interaction,r=i.find(e=>e.getAttribute("data-type")===t);if(r&&!r.hidden)for(const t of i)t.classList[t===r?"add":"remove"]("active");return !!this.setHSVA(...o,e)&&this.setColorRepresentation(t)}return !1}setColorRepresentation(t){return t=t.toUpperCase(),!!this._root.interaction.options.find(e=>e.getAttribute("data-type").startsWith(t)&&!e.click())}getColorRepresentation(){return this._representation}getColor(){return this._color}getSelectedColor(){return this._lastColor}getRoot(){return this._root}disable(){return this.hide(),this.options.disabled=!0,this._root.button.classList.add("disabled"),this}enable(){return this.options.disabled=!1,this._root.button.classList.remove("disabled"),this}}R.utils=n,R.libs={HSVaColor:x,Moveable:L,Nanopop:B,Selectable:P},R.create=t=>new R(t),R.version=v.a;e.default=R;}]).default}));

	});

	var Pickr = unwrapExports(pickr_min);
	var pickr_min_1 = pickr_min.Pickr;

	/* src\components\dataArea\colorPicker.svelte generated by Svelte v3.19.1 */

	function create_fragment$4(ctx) {
		let div1;
		let div0;
		let div1_class_value;
		let dispose;

		return {
			c() {
				div1 = element("div");
				div0 = element("div");
				attr(div1, "class", div1_class_value = /*$$props*/ ctx[1].class);
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				/*div0_binding*/ ctx[9](div0);

				dispose = [
					listen(div1, "mousemove", /*mousemove_handler*/ ctx[7]),
					listen(div1, "click", /*click_handler*/ ctx[8])
				];
			},
			p(ctx, [dirty]) {
				if (dirty & /*$$props*/ 2 && div1_class_value !== (div1_class_value = /*$$props*/ ctx[1].class)) {
					attr(div1, "class", div1_class_value);
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) detach(div1);
				/*div0_binding*/ ctx[9](null);
				run_all(dispose);
			}
		};
	}

	function instance$4($$self, $$props, $$invalidate) {
		let $condition;
		component_subscribe($$self, condition, $$value => $$invalidate(6, $condition = $$value));
		let { data } = $$props;
		let { key } = $$props;
		let { options } = $$props;
		let colorPicker, pickr;

		onMount(() => {
			$$invalidate(5, pickr = Pickr.create({
				el: colorPicker,
				theme: "nano",
				default: data[key].value,
				swatches: [
					"rgba(244, 67, 54, 1)",
					"rgba(233, 30, 99, 0.95)",
					"rgba(156, 39, 176, 0.9)",
					"rgba(103, 58, 183, 0.85)",
					"rgba(63, 81, 181, 0.8)",
					"rgba(33, 150, 243, 0.75)",
					"rgba(3, 169, 244, 0.7)",
					"rgba(0, 188, 212, 0.7)",
					"rgba(0, 150, 136, 0.75)",
					"rgba(76, 175, 80, 0.8)",
					"rgba(139, 195, 74, 0.85)",
					"rgba(205, 220, 57, 0.9)",
					"rgba(255, 235, 59, 0.95)",
					"rgba(255, 193, 7, 1)"
				],
				components: {
					// Main components
					preview: true,
					opacity: true,
					hue: true,
					// Input / output Options
					interaction: {
						hex: true,
						rgba: true,
						hsla: true,
						input: true,
						clear: true,
						save: true
					}
				}
			}));

			const nullColor = "#000000";

			pickr.on("save", color => {
				if (color === null) {
					$$invalidate(2, data[key].value = nullColor, data);
				} else if (pickr.getColorRepresentation() === "HEXA") {
					$$invalidate(2, data[key].value = color.toHEXA().toString(), data);
				} else if (pickr.getColorRepresentation() === "RGBA") {
					$$invalidate(2, data[key].value = color.toRGBA().toString(0), data);
				} else if (pickr.getColorRepresentation() === "HSLA") {
					$$invalidate(2, data[key].value = color.toHSLA().toString(0), data);
				}

				pickr.hide();
			}).on("clear", () => {
				pickr.setColor(nullColor);
			});
		});

		function mousemove_handler(event) {
			bubble($$self, event);
		}

		function click_handler(event) {
			bubble($$self, event);
		}

		function div0_binding($$value) {
			binding_callbacks[$$value ? "unshift" : "push"](() => {
				$$invalidate(0, colorPicker = $$value);
			});
		}

		$$self.$set = $$new_props => {
			$$invalidate(1, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
			if ("data" in $$new_props) $$invalidate(2, data = $$new_props.data);
			if ("key" in $$new_props) $$invalidate(3, key = $$new_props.key);
			if ("options" in $$new_props) $$invalidate(4, options = $$new_props.options);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*options, $condition, pickr*/ 112) {
				 if (options.editable && !$condition) {
					pickr && pickr.enable();
				} else {
					pickr && pickr.disable();
				}
			}
		};

		$$props = exclude_internal_props($$props);

		return [
			colorPicker,
			$$props,
			data,
			key,
			options,
			pickr,
			$condition,
			mousemove_handler,
			click_handler,
			div0_binding
		];
	}

	class ColorPicker extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$4, create_fragment$4, safe_not_equal, { data: 2, key: 3, options: 4 });
		}
	}

	function getComponent(type) {
	    const map = new Map([
	        ['string', ContentEdit],
	        ['boolean', ChoiceBox],
	        ['color', ColorPicker],
	    ]);
	    return map.get(type)
	}

	function createCoordinate() {
	    const data = {
	        x: null,
	        y: null,
	    };
	    const { subscribe, set } = writable(data);

	    return {
	        subscribe,
	        set: value => set(value),
	        reset: () => set(data),
	    }
	}

	const coordinate = createCoordinate();

	/* src\components\dataArea\index.svelte generated by Svelte v3.19.1 */

	function get_each_context_1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[11] = list[i];
		child_ctx[12] = list;
		child_ctx[13] = i;
		return child_ctx;
	}

	function get_each_context$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[8] = list[i];
		child_ctx[9] = list;
		child_ctx[10] = i;
		return child_ctx;
	}

	// (7:12) {#each Object.keys(row) as key, y (row[key])}
	function create_each_block_1(key_1, ctx) {
		let first;
		let updating_data;
		let updating_key;
		let switch_instance_anchor;
		let current;

		function switch_instance_data_binding(value) {
			/*switch_instance_data_binding*/ ctx[6].call(null, value, /*row*/ ctx[8], /*each_value*/ ctx[9], /*x*/ ctx[10]);
		}

		function switch_instance_key_binding(value) {
			/*switch_instance_key_binding*/ ctx[7].call(null, value, /*key*/ ctx[11], /*each_value_1*/ ctx[12], /*y*/ ctx[13]);
		}

		var switch_value = getComponent(/*row*/ ctx[8][/*key*/ ctx[11]].type);

		function switch_props(ctx) {
			let switch_instance_props = {
				options: /*options*/ ctx[1],
				class: `col ${/*$condition*/ ctx[2] === "remove-row" && /*$coordinate*/ ctx[3].x === /*x*/ ctx[10]
			? "row--remove"
			: ""}  ${/*$condition*/ ctx[2] === "remove-col" && /*$coordinate*/ ctx[3].y === /*y*/ ctx[13]
			? "col--remove"
			: ""}`.trim()
			};

			if (/*row*/ ctx[8] !== void 0) {
				switch_instance_props.data = /*row*/ ctx[8];
			}

			if (/*key*/ ctx[11] !== void 0) {
				switch_instance_props.key = /*key*/ ctx[11];
			}

			return { props: switch_instance_props };
		}

		if (switch_value) {
			var switch_instance = new switch_value(switch_props(ctx));
			binding_callbacks.push(() => bind(switch_instance, "data", switch_instance_data_binding));
			binding_callbacks.push(() => bind(switch_instance, "key", switch_instance_key_binding));

			switch_instance.$on("mousemove", function () {
				if (is_function(/*updateCoordinate*/ ctx[4](/*x*/ ctx[10], /*y*/ ctx[13]))) /*updateCoordinate*/ ctx[4](/*x*/ ctx[10], /*y*/ ctx[13]).apply(this, arguments);
			});

			switch_instance.$on("click", function () {
				if (is_function(/*remove*/ ctx[5](/*x*/ ctx[10], /*key*/ ctx[11]))) /*remove*/ ctx[5](/*x*/ ctx[10], /*key*/ ctx[11]).apply(this, arguments);
			});
		}

		return {
			key: key_1,
			first: null,
			c() {
				first = empty();
				if (switch_instance) create_component(switch_instance.$$.fragment);
				switch_instance_anchor = empty();
				this.first = first;
			},
			m(target, anchor) {
				insert(target, first, anchor);

				if (switch_instance) {
					mount_component(switch_instance, target, anchor);
				}

				insert(target, switch_instance_anchor, anchor);
				current = true;
			},
			p(new_ctx, dirty) {
				ctx = new_ctx;
				const switch_instance_changes = {};
				if (dirty & /*options*/ 2) switch_instance_changes.options = /*options*/ ctx[1];

				if (dirty & /*$condition, $coordinate, json*/ 13) switch_instance_changes.class = `col ${/*$condition*/ ctx[2] === "remove-row" && /*$coordinate*/ ctx[3].x === /*x*/ ctx[10]
			? "row--remove"
			: ""}  ${/*$condition*/ ctx[2] === "remove-col" && /*$coordinate*/ ctx[3].y === /*y*/ ctx[13]
			? "col--remove"
			: ""}`.trim();

				if (!updating_data && dirty & /*json*/ 1) {
					updating_data = true;
					switch_instance_changes.data = /*row*/ ctx[8];
					add_flush_callback(() => updating_data = false);
				}

				if (!updating_key && dirty & /*Object, json*/ 1) {
					updating_key = true;
					switch_instance_changes.key = /*key*/ ctx[11];
					add_flush_callback(() => updating_key = false);
				}

				if (switch_value !== (switch_value = getComponent(/*row*/ ctx[8][/*key*/ ctx[11]].type))) {
					if (switch_instance) {
						group_outros();
						const old_component = switch_instance;

						transition_out(old_component.$$.fragment, 1, 0, () => {
							destroy_component(old_component, 1);
						});

						check_outros();
					}

					if (switch_value) {
						switch_instance = new switch_value(switch_props(ctx));
						binding_callbacks.push(() => bind(switch_instance, "data", switch_instance_data_binding));
						binding_callbacks.push(() => bind(switch_instance, "key", switch_instance_key_binding));

						switch_instance.$on("mousemove", function () {
							if (is_function(/*updateCoordinate*/ ctx[4](/*x*/ ctx[10], /*y*/ ctx[13]))) /*updateCoordinate*/ ctx[4](/*x*/ ctx[10], /*y*/ ctx[13]).apply(this, arguments);
						});

						switch_instance.$on("click", function () {
							if (is_function(/*remove*/ ctx[5](/*x*/ ctx[10], /*key*/ ctx[11]))) /*remove*/ ctx[5](/*x*/ ctx[10], /*key*/ ctx[11]).apply(this, arguments);
						});

						create_component(switch_instance.$$.fragment);
						transition_in(switch_instance.$$.fragment, 1);
						mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
					} else {
						switch_instance = null;
					}
				} else if (switch_value) {
					switch_instance.$set(switch_instance_changes);
				}
			},
			i(local) {
				if (current) return;
				if (switch_instance) transition_in(switch_instance.$$.fragment, local);
				current = true;
			},
			o(local) {
				if (switch_instance) transition_out(switch_instance.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) detach(first);
				if (detaching) detach(switch_instance_anchor);
				if (switch_instance) destroy_component(switch_instance, detaching);
			}
		};
	}

	// (2:4) {#each json as row, x (row)}
	function create_each_block$1(key_1, ctx) {
		let div;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let t;
		let current;
		let each_value_1 = Object.keys(/*row*/ ctx[8]);
		const get_key = ctx => /*row*/ ctx[8][/*key*/ ctx[11]];

		for (let i = 0; i < each_value_1.length; i += 1) {
			let child_ctx = get_each_context_1(ctx, each_value_1, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
		}

		return {
			key: key_1,
			first: null,
			c() {
				div = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t = space();
				attr(div, "class", "json-form__data-area__row");
				toggle_class(div, "row--hover", !/*$condition*/ ctx[2]);
				toggle_class(div, "bg-stripe", /*options*/ ctx[1].style.background === "stripe");
				this.first = div;
			},
			m(target, anchor) {
				insert(target, div, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}

				append(div, t);
				current = true;
			},
			p(ctx, dirty) {
				if (dirty & /*getComponent, json, Object, options, $condition, $coordinate, updateCoordinate, remove*/ 63) {
					const each_value_1 = Object.keys(/*row*/ ctx[8]);
					group_outros();
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, div, outro_and_destroy_block, create_each_block_1, t, get_each_context_1);
					check_outros();
				}

				if (dirty & /*$condition*/ 4) {
					toggle_class(div, "row--hover", !/*$condition*/ ctx[2]);
				}

				if (dirty & /*options*/ 2) {
					toggle_class(div, "bg-stripe", /*options*/ ctx[1].style.background === "stripe");
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value_1.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) detach(div);

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}
			}
		};
	}

	function create_fragment$5(ctx) {
		let div;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let current;
		let each_value = /*json*/ ctx[0];
		const get_key = ctx => /*row*/ ctx[8];

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context$1(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
		}

		return {
			c() {
				div = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(div, "class", "json-form__data-area");
			},
			m(target, anchor) {
				insert(target, div, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}

				current = true;
			},
			p(ctx, [dirty]) {
				if (dirty & /*$condition, options, Object, json, getComponent, $coordinate, updateCoordinate, remove*/ 63) {
					const each_value = /*json*/ ctx[0];
					group_outros();
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block$1, null, get_each_context$1);
					check_outros();
				}
			},
			i(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o(local) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) detach(div);

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}
			}
		};
	}

	function instance$5($$self, $$props, $$invalidate) {
		let $condition;
		let $coordinate;
		component_subscribe($$self, condition, $$value => $$invalidate(2, $condition = $$value));
		component_subscribe($$self, coordinate, $$value => $$invalidate(3, $coordinate = $$value));
		let { json } = $$props;
		let { options } = $$props;

		function updateCoordinate(x, y) {
			if ($condition && (x !== $coordinate.x || y !== $coordinate.y)) {
				coordinate.set({ x, y });
			}
		}

		function remove(x, key) {
			if ($condition === "remove-row") {
				$$invalidate(0, json = json.filter((item, index) => index !== x));
			} else if ($condition === "remove-col") {
				$$invalidate(0, json = json.map(row => {
					delete row[key];
					return row;
				}));
			}
		}

		function switch_instance_data_binding(value, row, each_value, x) {
			each_value[x] = value;
			$$invalidate(0, json);
		}

		function switch_instance_key_binding(value, key, each_value_1, y) {
			each_value_1[y] = value;
		}

		$$self.$set = $$props => {
			if ("json" in $$props) $$invalidate(0, json = $$props.json);
			if ("options" in $$props) $$invalidate(1, options = $$props.options);
		};

		return [
			json,
			options,
			$condition,
			$coordinate,
			updateCoordinate,
			remove,
			switch_instance_data_binding,
			switch_instance_key_binding
		];
	}

	class DataArea extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$5, create_fragment$5, safe_not_equal, { json: 0, options: 1 });
		}
	}

	/* src\components\messageBox\input.svelte generated by Svelte v3.19.1 */

	function create_if_block$2(ctx) {
		let p;
		let t;

		return {
			c() {
				p = element("p");
				t = text(/*suggestion*/ ctx[2]);
				attr(p, "class", "advice");
			},
			m(target, anchor) {
				insert(target, p, anchor);
				append(p, t);
			},
			p(ctx, dirty) {
				if (dirty & /*suggestion*/ 4) set_data(t, /*suggestion*/ ctx[2]);
			},
			d(detaching) {
				if (detaching) detach(p);
			}
		};
	}

	function create_fragment$6(ctx) {
		let label;
		let span;
		let t0;
		let t1;
		let t2;
		let input;
		let t3;
		let dispose;
		let if_block = /*error*/ ctx[3] && create_if_block$2(ctx);

		return {
			c() {
				label = element("label");
				span = element("span");
				t0 = text(/*description*/ ctx[1]);
				t1 = text("：");
				t2 = space();
				input = element("input");
				t3 = space();
				if (if_block) if_block.c();
				attr(input, "type", "text");
			},
			m(target, anchor) {
				insert(target, label, anchor);
				append(label, span);
				append(span, t0);
				append(span, t1);
				append(label, t2);
				append(label, input);
				set_input_value(input, /*value*/ ctx[0]);
				append(label, t3);
				if (if_block) if_block.m(label, null);

				dispose = [
					listen(input, "input", /*input_input_handler*/ ctx[7]),
					listen(input, "input", /*check*/ ctx[4])
				];
			},
			p(ctx, [dirty]) {
				if (dirty & /*description*/ 2) set_data(t0, /*description*/ ctx[1]);

				if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
					set_input_value(input, /*value*/ ctx[0]);
				}

				if (/*error*/ ctx[3]) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block$2(ctx);
						if_block.c();
						if_block.m(label, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},
			i: noop,
			o: noop,
			d(detaching) {
				if (detaching) detach(label);
				if (if_block) if_block.d();
				run_all(dispose);
			}
		};
	}

	function isRegExp(val) {
		return Object.prototype.toString.call(val) === "[object RegExp]";
	}

	function instance$6($$self, $$props, $$invalidate) {
		let { description } = $$props;
		let { ruleList } = $$props;
		let { value } = $$props;
		let { isValidated } = $$props;
		let suggestion, error;

		function check() {
			for (const { rule, advice } of ruleList) {
				if (isRegExp(rule)) {
					$$invalidate(5, isValidated = rule.test(value));
				} else if (Array.isArray(rule)) {
					$$invalidate(5, isValidated = !rule.includes(value));
				}

				$$invalidate(3, error = !isValidated);

				if (error) {
					$$invalidate(2, suggestion = advice);
					return;
				}
			}
		}

		function input_input_handler() {
			value = this.value;
			$$invalidate(0, value);
		}

		$$self.$set = $$props => {
			if ("description" in $$props) $$invalidate(1, description = $$props.description);
			if ("ruleList" in $$props) $$invalidate(6, ruleList = $$props.ruleList);
			if ("value" in $$props) $$invalidate(0, value = $$props.value);
			if ("isValidated" in $$props) $$invalidate(5, isValidated = $$props.isValidated);
		};

		return [
			value,
			description,
			suggestion,
			error,
			check,
			isValidated,
			ruleList,
			input_input_handler
		];
	}

	class Input extends SvelteComponent {
		constructor(options) {
			super();

			init(this, options, instance$6, create_fragment$6, safe_not_equal, {
				description: 1,
				ruleList: 6,
				value: 0,
				isValidated: 5
			});
		}
	}

	/* src\components\messageBox\addCol.svelte generated by Svelte v3.19.1 */

	function get_each_context$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[4] = list[i].type;
		child_ctx[16] = list[i].componentName;
		return child_ctx;
	}

	// (4:8) {#each compList as { type, componentName }}
	function create_each_block$2(ctx) {
		let option;
		let t_value = /*componentName*/ ctx[16] + "";
		let t;
		let option_value_value;

		return {
			c() {
				option = element("option");
				t = text(t_value);
				option.__value = option_value_value = /*type*/ ctx[4];
				option.value = option.__value;
			},
			m(target, anchor) {
				insert(target, option, anchor);
				append(option, t);
			},
			p: noop,
			d(detaching) {
				if (detaching) detach(option);
			}
		};
	}

	function create_fragment$7(ctx) {
		let label0;
		let span0;
		let t1;
		let select;
		let t2;
		let updating_value;
		let updating_isValidated;
		let t3;
		let updating_value_1;
		let updating_isValidated_1;
		let t4;
		let label1;
		let span1;
		let t6;
		let updating_data;
		let current;
		let dispose;
		let each_value = /*compList*/ ctx[6];
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
		}

		function input0_value_binding(value) {
			/*input0_value_binding*/ ctx[11].call(null, value);
		}

		function input0_isValidated_binding(value) {
			/*input0_isValidated_binding*/ ctx[12].call(null, value);
		}

		let input0_props = {
			description: "键值",
			ruleList: /*ruleList*/ ctx[5][0]
		};

		if (/*key*/ ctx[0] !== void 0) {
			input0_props.value = /*key*/ ctx[0];
		}

		if (/*validation*/ ctx[2][0] !== void 0) {
			input0_props.isValidated = /*validation*/ ctx[2][0];
		}

		const input0 = new Input({ props: input0_props });
		binding_callbacks.push(() => bind(input0, "value", input0_value_binding));
		binding_callbacks.push(() => bind(input0, "isValidated", input0_isValidated_binding));

		function input1_value_binding(value) {
			/*input1_value_binding*/ ctx[13].call(null, value);
		}

		function input1_isValidated_binding(value) {
			/*input1_isValidated_binding*/ ctx[14].call(null, value);
		}

		let input1_props = {
			description: "列名",
			ruleList: /*ruleList*/ ctx[5][1]
		};

		if (/*name*/ ctx[1] !== void 0) {
			input1_props.value = /*name*/ ctx[1];
		}

		if (/*validation*/ ctx[2][1] !== void 0) {
			input1_props.isValidated = /*validation*/ ctx[2][1];
		}

		const input1 = new Input({ props: input1_props });
		binding_callbacks.push(() => bind(input1, "value", input1_value_binding));
		binding_callbacks.push(() => bind(input1, "isValidated", input1_isValidated_binding));

		function switch_instance_data_binding(value) {
			/*switch_instance_data_binding*/ ctx[15].call(null, value);
		}

		var switch_value = getComponent(/*type*/ ctx[4]);

		function switch_props(ctx) {
			let switch_instance_props = {
				class: "data-component",
				options: /*mock*/ ctx[3].options,
				key: "key"
			};

			if (/*mock*/ ctx[3].data !== void 0) {
				switch_instance_props.data = /*mock*/ ctx[3].data;
			}

			return { props: switch_instance_props };
		}

		if (switch_value) {
			var switch_instance = new switch_value(switch_props(ctx));
			binding_callbacks.push(() => bind(switch_instance, "data", switch_instance_data_binding));
		}

		return {
			c() {
				label0 = element("label");
				span0 = element("span");
				span0.textContent = "组件：";
				t1 = space();
				select = element("select");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t2 = space();
				create_component(input0.$$.fragment);
				t3 = space();
				create_component(input1.$$.fragment);
				t4 = space();
				label1 = element("label");
				span1 = element("span");
				span1.textContent = "初值：";
				t6 = space();
				if (switch_instance) create_component(switch_instance.$$.fragment);
				if (/*type*/ ctx[4] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[10].call(select));
			},
			m(target, anchor) {
				insert(target, label0, anchor);
				append(label0, span0);
				append(label0, t1);
				append(label0, select);

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(select, null);
				}

				select_option(select, /*type*/ ctx[4]);
				insert(target, t2, anchor);
				mount_component(input0, target, anchor);
				insert(target, t3, anchor);
				mount_component(input1, target, anchor);
				insert(target, t4, anchor);
				insert(target, label1, anchor);
				append(label1, span1);
				append(label1, t6);

				if (switch_instance) {
					mount_component(switch_instance, label1, null);
				}

				current = true;
				dispose = listen(select, "change", /*select_change_handler*/ ctx[10]);
			},
			p(ctx, [dirty]) {
				if (dirty & /*compList*/ 64) {
					each_value = /*compList*/ ctx[6];
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$2(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$2(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(select, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}

				if (dirty & /*type*/ 16) {
					select_option(select, /*type*/ ctx[4]);
				}

				const input0_changes = {};

				if (!updating_value && dirty & /*key*/ 1) {
					updating_value = true;
					input0_changes.value = /*key*/ ctx[0];
					add_flush_callback(() => updating_value = false);
				}

				if (!updating_isValidated && dirty & /*validation*/ 4) {
					updating_isValidated = true;
					input0_changes.isValidated = /*validation*/ ctx[2][0];
					add_flush_callback(() => updating_isValidated = false);
				}

				input0.$set(input0_changes);
				const input1_changes = {};

				if (!updating_value_1 && dirty & /*name*/ 2) {
					updating_value_1 = true;
					input1_changes.value = /*name*/ ctx[1];
					add_flush_callback(() => updating_value_1 = false);
				}

				if (!updating_isValidated_1 && dirty & /*validation*/ 4) {
					updating_isValidated_1 = true;
					input1_changes.isValidated = /*validation*/ ctx[2][1];
					add_flush_callback(() => updating_isValidated_1 = false);
				}

				input1.$set(input1_changes);
				const switch_instance_changes = {};
				if (dirty & /*mock*/ 8) switch_instance_changes.options = /*mock*/ ctx[3].options;

				if (!updating_data && dirty & /*mock*/ 8) {
					updating_data = true;
					switch_instance_changes.data = /*mock*/ ctx[3].data;
					add_flush_callback(() => updating_data = false);
				}

				if (switch_value !== (switch_value = getComponent(/*type*/ ctx[4]))) {
					if (switch_instance) {
						group_outros();
						const old_component = switch_instance;

						transition_out(old_component.$$.fragment, 1, 0, () => {
							destroy_component(old_component, 1);
						});

						check_outros();
					}

					if (switch_value) {
						switch_instance = new switch_value(switch_props(ctx));
						binding_callbacks.push(() => bind(switch_instance, "data", switch_instance_data_binding));
						create_component(switch_instance.$$.fragment);
						transition_in(switch_instance.$$.fragment, 1);
						mount_component(switch_instance, label1, null);
					} else {
						switch_instance = null;
					}
				} else if (switch_value) {
					switch_instance.$set(switch_instance_changes);
				}
			},
			i(local) {
				if (current) return;
				transition_in(input0.$$.fragment, local);
				transition_in(input1.$$.fragment, local);
				if (switch_instance) transition_in(switch_instance.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(input0.$$.fragment, local);
				transition_out(input1.$$.fragment, local);
				if (switch_instance) transition_out(switch_instance.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) detach(label0);
				destroy_each(each_blocks, detaching);
				if (detaching) detach(t2);
				destroy_component(input0, detaching);
				if (detaching) detach(t3);
				destroy_component(input1, detaching);
				if (detaching) detach(t4);
				if (detaching) detach(label1);
				if (switch_instance) destroy_component(switch_instance);
				dispose();
			}
		};
	}

	function instance$7($$self, $$props, $$invalidate) {
		let { msgValue } = $$props;
		let { json } = $$props;
		let type, key, name;
		const keyList = Object.keys(json[0]);

		const ruleList = [
			[
				{
					rule: /^[a-zA-Z]{1,12}$/,
					advice: "输入1-12位字母"
				},
				{ rule: keyList, advice: "键值已存在" }
			],
			[{ rule: /^.{1,12}$/, advice: "输入任意1-12位" }]
		];

		const validation = new Array(2).fill(false);

		const compList = [
			{ type: "string", componentName: "文本" },
			{ type: "boolean", componentName: "选择框" },
			{ type: "color", componentName: "拾色器" }
		];

		function select_change_handler() {
			type = select_value(this);
			$$invalidate(4, type);
			$$invalidate(6, compList);
		}

		function input0_value_binding(value) {
			key = value;
			$$invalidate(0, key);
		}

		function input0_isValidated_binding(value) {
			validation[0] = value;
			$$invalidate(2, validation);
		}

		function input1_value_binding(value) {
			name = value;
			$$invalidate(1, name);
		}

		function input1_isValidated_binding(value) {
			validation[1] = value;
			$$invalidate(2, validation);
		}

		function switch_instance_data_binding(value) {
			mock.data = value;
			($$invalidate(3, mock), $$invalidate(4, type));
		}

		$$self.$set = $$props => {
			if ("msgValue" in $$props) $$invalidate(7, msgValue = $$props.msgValue);
			if ("json" in $$props) $$invalidate(8, json = $$props.json);
		};

		let mock;

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*type*/ 16) {
				//创建新列时，调用数据组件的模拟数据
				 $$invalidate(3, mock = {
					options: { editable: true },
					data: {
						key: {
							value: type === "string"
							? ""
							: type === "boolean" ? false : "#000000"
						}
					}
				});
			}

			if ($$self.$$.dirty & /*validation, key, name, type, mock*/ 31) {
				 {
					let isValidated = validation.every(i => i);

					$$invalidate(7, msgValue = {
						isValidated,
						key,
						name,
						type,
						value: mock.data.key.value
					});
				}
			}
		};

		return [
			key,
			name,
			validation,
			mock,
			type,
			ruleList,
			compList,
			msgValue,
			json,
			keyList,
			select_change_handler,
			input0_value_binding,
			input0_isValidated_binding,
			input1_value_binding,
			input1_isValidated_binding,
			switch_instance_data_binding
		];
	}

	class AddCol extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$7, create_fragment$7, safe_not_equal, { msgValue: 7, json: 8 });
		}
	}

	/* src\components\messageBox\updateCol.svelte generated by Svelte v3.19.1 */

	function create_fragment$8(ctx) {
		let updating_value;
		let updating_isValidated;
		let t;
		let updating_value_1;
		let updating_isValidated_1;
		let current;

		function input0_value_binding(value) {
			/*input0_value_binding*/ ctx[10].call(null, value);
		}

		function input0_isValidated_binding(value) {
			/*input0_isValidated_binding*/ ctx[11].call(null, value);
		}

		let input0_props = {
			description: "键值",
			ruleList: /*ruleList*/ ctx[3][0]
		};

		if (/*key*/ ctx[0] !== void 0) {
			input0_props.value = /*key*/ ctx[0];
		}

		if (/*validation*/ ctx[2][0] !== void 0) {
			input0_props.isValidated = /*validation*/ ctx[2][0];
		}

		const input0 = new Input({ props: input0_props });
		binding_callbacks.push(() => bind(input0, "value", input0_value_binding));
		binding_callbacks.push(() => bind(input0, "isValidated", input0_isValidated_binding));

		function input1_value_binding(value) {
			/*input1_value_binding*/ ctx[12].call(null, value);
		}

		function input1_isValidated_binding(value) {
			/*input1_isValidated_binding*/ ctx[13].call(null, value);
		}

		let input1_props = {
			description: "列名",
			ruleList: /*ruleList*/ ctx[3][1]
		};

		if (/*name*/ ctx[1] !== void 0) {
			input1_props.value = /*name*/ ctx[1];
		}

		if (/*validation*/ ctx[2][1] !== void 0) {
			input1_props.isValidated = /*validation*/ ctx[2][1];
		}

		const input1 = new Input({ props: input1_props });
		binding_callbacks.push(() => bind(input1, "value", input1_value_binding));
		binding_callbacks.push(() => bind(input1, "isValidated", input1_isValidated_binding));

		return {
			c() {
				create_component(input0.$$.fragment);
				t = space();
				create_component(input1.$$.fragment);
			},
			m(target, anchor) {
				mount_component(input0, target, anchor);
				insert(target, t, anchor);
				mount_component(input1, target, anchor);
				current = true;
			},
			p(ctx, [dirty]) {
				const input0_changes = {};

				if (!updating_value && dirty & /*key*/ 1) {
					updating_value = true;
					input0_changes.value = /*key*/ ctx[0];
					add_flush_callback(() => updating_value = false);
				}

				if (!updating_isValidated && dirty & /*validation*/ 4) {
					updating_isValidated = true;
					input0_changes.isValidated = /*validation*/ ctx[2][0];
					add_flush_callback(() => updating_isValidated = false);
				}

				input0.$set(input0_changes);
				const input1_changes = {};

				if (!updating_value_1 && dirty & /*name*/ 2) {
					updating_value_1 = true;
					input1_changes.value = /*name*/ ctx[1];
					add_flush_callback(() => updating_value_1 = false);
				}

				if (!updating_isValidated_1 && dirty & /*validation*/ 4) {
					updating_isValidated_1 = true;
					input1_changes.isValidated = /*validation*/ ctx[2][1];
					add_flush_callback(() => updating_isValidated_1 = false);
				}

				input1.$set(input1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(input0.$$.fragment, local);
				transition_in(input1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(input0.$$.fragment, local);
				transition_out(input1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(input0, detaching);
				if (detaching) detach(t);
				destroy_component(input1, detaching);
			}
		};
	}

	function instance$8($$self, $$props, $$invalidate) {
		let $message;
		component_subscribe($$self, message, $$value => $$invalidate(6, $message = $$value));
		let { msgValue } = $$props;
		let { json } = $$props;
		let { oldKey, oldName } = $message.value;
		let key = oldKey, name = oldName;
		const keyList = Object.keys(json[0]).filter(item => item !== oldKey);

		const ruleList = [
			[
				{
					rule: /^[a-zA-Z]{1,12}$/,
					advice: "输入1-12位字母"
				},
				{ rule: keyList, advice: "键值已存在" }
			],
			[{ rule: /^.{1,12}$/, advice: "输入任意1-12位" }]
		];

		const validation = new Array(2).fill(true);

		function input0_value_binding(value) {
			key = value;
			$$invalidate(0, key);
		}

		function input0_isValidated_binding(value) {
			validation[0] = value;
			$$invalidate(2, validation);
		}

		function input1_value_binding(value) {
			name = value;
			$$invalidate(1, name);
		}

		function input1_isValidated_binding(value) {
			validation[1] = value;
			$$invalidate(2, validation);
		}

		$$self.$set = $$props => {
			if ("msgValue" in $$props) $$invalidate(4, msgValue = $$props.msgValue);
			if ("json" in $$props) $$invalidate(5, json = $$props.json);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*validation, key, name*/ 7) {
				 {
					let isValidated = validation.every(i => i);
					$$invalidate(4, msgValue = { isValidated, key, name });
				}
			}
		};

		return [
			key,
			name,
			validation,
			ruleList,
			msgValue,
			json,
			$message,
			oldKey,
			oldName,
			keyList,
			input0_value_binding,
			input0_isValidated_binding,
			input1_value_binding,
			input1_isValidated_binding
		];
	}

	class UpdateCol extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$8, create_fragment$8, safe_not_equal, { msgValue: 4, json: 5 });
		}
	}

	/* src\components\messageBox\index.svelte generated by Svelte v3.19.1 */

	function create_if_block$3(ctx) {
		let div4;
		let div3;
		let header;
		let div0;
		let t0_value = /*$message*/ ctx[2].title + "";
		let t0;
		let t1;
		let main;
		let updating_msgValue;
		let t2;
		let footer;
		let div1;
		let t3;
		let div1_class_value;
		let t4;
		let div2;
		let current;
		let dispose;

		function switch_instance_msgValue_binding(value) {
			/*switch_instance_msgValue_binding*/ ctx[4].call(null, value);
		}

		var switch_value = getComponent$1(/*$message*/ ctx[2].type);

		function switch_props(ctx) {
			let switch_instance_props = { json: /*json*/ ctx[0] };

			if (/*msgValue*/ ctx[1] !== void 0) {
				switch_instance_props.msgValue = /*msgValue*/ ctx[1];
			}

			return { props: switch_instance_props };
		}

		if (switch_value) {
			var switch_instance = new switch_value(switch_props(ctx));
			binding_callbacks.push(() => bind(switch_instance, "msgValue", switch_instance_msgValue_binding));
		}

		return {
			c() {
				div4 = element("div");
				div3 = element("div");
				header = element("header");
				div0 = element("div");
				t0 = text(t0_value);
				t1 = space();
				main = element("main");
				if (switch_instance) create_component(switch_instance.$$.fragment);
				t2 = space();
				footer = element("footer");
				div1 = element("div");
				t3 = text("确认");
				t4 = space();
				div2 = element("div");
				div2.textContent = "取消";

				attr(div1, "class", div1_class_value = "button button--confirm " + (/*msgValue*/ ctx[1] && !/*msgValue*/ ctx[1].isValidated
				? "disabled"
				: ""));

				attr(div2, "class", "button button--cancel");
				attr(div3, "class", "message-box");
				attr(div4, "class", "message-box__wrapper");
			},
			m(target, anchor) {
				insert(target, div4, anchor);
				append(div4, div3);
				append(div3, header);
				append(header, div0);
				append(div0, t0);
				append(div3, t1);
				append(div3, main);

				if (switch_instance) {
					mount_component(switch_instance, main, null);
				}

				append(div3, t2);
				append(div3, footer);
				append(footer, div1);
				append(div1, t3);
				append(footer, t4);
				append(footer, div2);
				current = true;
				dispose = [listen(div1, "click", /*confirm*/ ctx[3]), listen(div2, "click", cancel)];
			},
			p(ctx, dirty) {
				if ((!current || dirty & /*$message*/ 4) && t0_value !== (t0_value = /*$message*/ ctx[2].title + "")) set_data(t0, t0_value);
				const switch_instance_changes = {};
				if (dirty & /*json*/ 1) switch_instance_changes.json = /*json*/ ctx[0];

				if (!updating_msgValue && dirty & /*msgValue*/ 2) {
					updating_msgValue = true;
					switch_instance_changes.msgValue = /*msgValue*/ ctx[1];
					add_flush_callback(() => updating_msgValue = false);
				}

				if (switch_value !== (switch_value = getComponent$1(/*$message*/ ctx[2].type))) {
					if (switch_instance) {
						group_outros();
						const old_component = switch_instance;

						transition_out(old_component.$$.fragment, 1, 0, () => {
							destroy_component(old_component, 1);
						});

						check_outros();
					}

					if (switch_value) {
						switch_instance = new switch_value(switch_props(ctx));
						binding_callbacks.push(() => bind(switch_instance, "msgValue", switch_instance_msgValue_binding));
						create_component(switch_instance.$$.fragment);
						transition_in(switch_instance.$$.fragment, 1);
						mount_component(switch_instance, main, null);
					} else {
						switch_instance = null;
					}
				} else if (switch_value) {
					switch_instance.$set(switch_instance_changes);
				}

				if (!current || dirty & /*msgValue*/ 2 && div1_class_value !== (div1_class_value = "button button--confirm " + (/*msgValue*/ ctx[1] && !/*msgValue*/ ctx[1].isValidated
				? "disabled"
				: ""))) {
					attr(div1, "class", div1_class_value);
				}
			},
			i(local) {
				if (current) return;
				if (switch_instance) transition_in(switch_instance.$$.fragment, local);
				current = true;
			},
			o(local) {
				if (switch_instance) transition_out(switch_instance.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) detach(div4);
				if (switch_instance) destroy_component(switch_instance);
				run_all(dispose);
			}
		};
	}

	function create_fragment$9(ctx) {
		let if_block_anchor;
		let current;
		let if_block = /*$message*/ ctx[2].title && create_if_block$3(ctx);

		return {
			c() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(ctx, [dirty]) {
				if (/*$message*/ ctx[2].title) {
					if (if_block) {
						if_block.p(ctx, dirty);
						transition_in(if_block, 1);
					} else {
						if_block = create_if_block$3(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (if_block) if_block.d(detaching);
				if (detaching) detach(if_block_anchor);
			}
		};
	}

	function getComponent$1(type) {
		const map = new Map([["addCol", AddCol], ["updateCol", UpdateCol]]);
		return map.get(type);
	}

	function cancel() {
		message.reset();
	}

	function instance$9($$self, $$props, $$invalidate) {
		let $message;
		component_subscribe($$self, message, $$value => $$invalidate(2, $message = $$value));
		let { json } = $$props;
		let msgValue;

		function confirm() {
			if (msgValue.isValidated) {
				message.update(msgValue);
				$message.fn();
				message.reset();
			}
		}

		function switch_instance_msgValue_binding(value) {
			msgValue = value;
			$$invalidate(1, msgValue);
		}

		$$self.$set = $$props => {
			if ("json" in $$props) $$invalidate(0, json = $$props.json);
		};

		return [json, msgValue, $message, confirm, switch_instance_msgValue_binding];
	}

	class MessageBox extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$9, create_fragment$9, safe_not_equal, { json: 0 });
		}
	}

	/* src\components\notification\index.svelte generated by Svelte v3.19.1 */

	function create_if_block$4(ctx) {
		let div1;
		let div0;
		let span;
		let t;
		let div1_intro;
		let div1_outro;
		let current;

		return {
			c() {
				div1 = element("div");
				div0 = element("div");
				span = element("span");
				t = text(/*$notification*/ ctx[0]);
				attr(span, "class", "notification__content");
				attr(div0, "class", "notification");
				attr(div1, "class", "notification__wrapper");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				append(div0, span);
				append(span, t);
				current = true;
			},
			p(ctx, dirty) {
				if (!current || dirty & /*$notification*/ 1) set_data(t, /*$notification*/ ctx[0]);
			},
			i(local) {
				if (current) return;

				add_render_callback(() => {
					if (div1_outro) div1_outro.end(1);
					if (!div1_intro) div1_intro = create_in_transition(div1, fly, { x: 200, duration: 1500 });
					div1_intro.start();
				});

				current = true;
			},
			o(local) {
				if (div1_intro) div1_intro.invalidate();
				div1_outro = create_out_transition(div1, fade, {});
				current = false;
			},
			d(detaching) {
				if (detaching) detach(div1);
				if (detaching && div1_outro) div1_outro.end();
			}
		};
	}

	function create_fragment$a(ctx) {
		let if_block_anchor;
		let current;
		let if_block = /*$notification*/ ctx[0] && create_if_block$4(ctx);

		return {
			c() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(ctx, [dirty]) {
				if (/*$notification*/ ctx[0]) {
					if (if_block) {
						if_block.p(ctx, dirty);
						transition_in(if_block, 1);
					} else {
						if_block = create_if_block$4(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (if_block) if_block.d(detaching);
				if (detaching) detach(if_block_anchor);
			}
		};
	}

	function instance$a($$self, $$props, $$invalidate) {
		let $notification;
		component_subscribe($$self, notification, $$value => $$invalidate(0, $notification = $$value));
		return [$notification];
	}

	class Notification extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$a, create_fragment$a, safe_not_equal, {});
		}
	}

	/* src\App.svelte generated by Svelte v3.19.1 */

	function create_if_block$5(ctx) {
		let updating_json;
		let current;

		function sidebar_json_binding(value) {
			/*sidebar_json_binding*/ ctx[5].call(null, value);
		}

		let sidebar_props = { colList: /*colList*/ ctx[3] };

		if (/*json*/ ctx[0] !== void 0) {
			sidebar_props.json = /*json*/ ctx[0];
		}

		const sidebar = new SideBar({ props: sidebar_props });
		binding_callbacks.push(() => bind(sidebar, "json", sidebar_json_binding));

		return {
			c() {
				create_component(sidebar.$$.fragment);
			},
			m(target, anchor) {
				mount_component(sidebar, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const sidebar_changes = {};
				if (dirty & /*colList*/ 8) sidebar_changes.colList = /*colList*/ ctx[3];

				if (!updating_json && dirty & /*json*/ 1) {
					updating_json = true;
					sidebar_changes.json = /*json*/ ctx[0];
					add_flush_callback(() => updating_json = false);
				}

				sidebar.$set(sidebar_changes);
			},
			i(local) {
				if (current) return;
				transition_in(sidebar.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(sidebar.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(sidebar, detaching);
			}
		};
	}

	function create_fragment$b(ctx) {
		let div2;
		let t0;
		let div1;
		let div0;
		let updating_json;
		let t1;
		let updating_json_1;
		let updating_options;
		let t2;
		let t3;
		let current;
		let dispose;
		let if_block = /*options*/ ctx[1].editable && create_if_block$5(ctx);

		function topbar_json_binding(value) {
			/*topbar_json_binding*/ ctx[6].call(null, value);
		}

		let topbar_props = {
			options: /*options*/ ctx[1],
			colList: /*colList*/ ctx[3]
		};

		if (/*json*/ ctx[0] !== void 0) {
			topbar_props.json = /*json*/ ctx[0];
		}

		const topbar = new TopBar({ props: topbar_props });
		binding_callbacks.push(() => bind(topbar, "json", topbar_json_binding));

		function dataarea_json_binding(value) {
			/*dataarea_json_binding*/ ctx[7].call(null, value);
		}

		function dataarea_options_binding(value) {
			/*dataarea_options_binding*/ ctx[8].call(null, value);
		}

		let dataarea_props = {};

		if (/*json*/ ctx[0] !== void 0) {
			dataarea_props.json = /*json*/ ctx[0];
		}

		if (/*options*/ ctx[1] !== void 0) {
			dataarea_props.options = /*options*/ ctx[1];
		}

		const dataarea = new DataArea({ props: dataarea_props });
		binding_callbacks.push(() => bind(dataarea, "json", dataarea_json_binding));
		binding_callbacks.push(() => bind(dataarea, "options", dataarea_options_binding));
		const messagebox = new MessageBox({ props: { json: /*json*/ ctx[0] } });
		const notification = new Notification({});

		return {
			c() {
				div2 = element("div");
				if (if_block) if_block.c();
				t0 = space();
				div1 = element("div");
				div0 = element("div");
				create_component(topbar.$$.fragment);
				t1 = space();
				create_component(dataarea.$$.fragment);
				t2 = space();
				create_component(messagebox.$$.fragment);
				t3 = space();
				create_component(notification.$$.fragment);
				attr(div0, "class", "json-form");
				attr(div1, "class", "json-form__main");
				attr(div2, "class", "json-form__wrapper");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				if (if_block) if_block.m(div2, null);
				append(div2, t0);
				append(div2, div1);
				append(div1, div0);
				mount_component(topbar, div0, null);
				append(div0, t1);
				mount_component(dataarea, div0, null);
				append(div2, t2);
				mount_component(messagebox, div2, null);
				append(div2, t3);
				mount_component(notification, div2, null);
				/*div2_binding*/ ctx[9](div2);
				current = true;
				dispose = listen(div2, "contextmenu", prevent_default(resetCondition));
			},
			p(ctx, [dirty]) {
				if (/*options*/ ctx[1].editable) {
					if (if_block) {
						if_block.p(ctx, dirty);
						transition_in(if_block, 1);
					} else {
						if_block = create_if_block$5(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(div2, t0);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}

				const topbar_changes = {};
				if (dirty & /*options*/ 2) topbar_changes.options = /*options*/ ctx[1];
				if (dirty & /*colList*/ 8) topbar_changes.colList = /*colList*/ ctx[3];

				if (!updating_json && dirty & /*json*/ 1) {
					updating_json = true;
					topbar_changes.json = /*json*/ ctx[0];
					add_flush_callback(() => updating_json = false);
				}

				topbar.$set(topbar_changes);
				const dataarea_changes = {};

				if (!updating_json_1 && dirty & /*json*/ 1) {
					updating_json_1 = true;
					dataarea_changes.json = /*json*/ ctx[0];
					add_flush_callback(() => updating_json_1 = false);
				}

				if (!updating_options && dirty & /*options*/ 2) {
					updating_options = true;
					dataarea_changes.options = /*options*/ ctx[1];
					add_flush_callback(() => updating_options = false);
				}

				dataarea.$set(dataarea_changes);
				const messagebox_changes = {};
				if (dirty & /*json*/ 1) messagebox_changes.json = /*json*/ ctx[0];
				messagebox.$set(messagebox_changes);
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				transition_in(topbar.$$.fragment, local);
				transition_in(dataarea.$$.fragment, local);
				transition_in(messagebox.$$.fragment, local);
				transition_in(notification.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				transition_out(topbar.$$.fragment, local);
				transition_out(dataarea.$$.fragment, local);
				transition_out(messagebox.$$.fragment, local);
				transition_out(notification.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) detach(div2);
				if (if_block) if_block.d();
				destroy_component(topbar);
				destroy_component(dataarea);
				destroy_component(messagebox);
				destroy_component(notification);
				/*div2_binding*/ ctx[9](null);
				dispose();
			}
		};
	}

	function resetCondition() {
		condition.reset();
	}

	function instance$b($$self, $$props, $$invalidate) {
		let { json } = $$props;
		let { options } = $$props;
		let wrapper;
		let colList;

		onMount(() => {
			setStyle();
		});

		function setStyle() {
			const { width, height, fontSize, lineHeight, padding, background } = options.style;
			const set = (key, value) => wrapper.style.setProperty(key, value);
			set("--width", width + "px");
			set("--height", typeof height === "number" ? height + "px" : height);
			set("--font-size", fontSize + "px");
			set("--line-height", lineHeight);
			set("--padding-top", padding.top + "px");
			set("--padding-right", padding.right + "px");
		}

		function sidebar_json_binding(value) {
			json = value;
			$$invalidate(0, json);
		}

		function topbar_json_binding(value) {
			json = value;
			$$invalidate(0, json);
		}

		function dataarea_json_binding(value) {
			json = value;
			$$invalidate(0, json);
		}

		function dataarea_options_binding(value) {
			options = value;
			$$invalidate(1, options);
		}

		function div2_binding($$value) {
			binding_callbacks[$$value ? "unshift" : "push"](() => {
				$$invalidate(2, wrapper = $$value);
			});
		}

		$$self.$set = $$props => {
			if ("json" in $$props) $$invalidate(0, json = $$props.json);
			if ("options" in $$props) $$invalidate(1, options = $$props.options);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*json*/ 1) {
				//数据清空时，仍保存列信息
				 if (json.length > 0) {
					$$invalidate(3, colList = Object.entries(json[0]).map(([key, { name, type }]) => ({ key, name, type })));
				}
			}

			if ($$self.$$.dirty & /*wrapper, options*/ 6) {
				 if (wrapper && options.style) {
					setStyle();
				}
			}
		};

		return [
			json,
			options,
			wrapper,
			colList,
			setStyle,
			sidebar_json_binding,
			topbar_json_binding,
			dataarea_json_binding,
			dataarea_options_binding,
			div2_binding
		];
	}

	class App extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$b, create_fragment$b, safe_not_equal, { json: 0, options: 1 });
		}

		get json() {
			return this.$$.ctx[0];
		}

		set json(json) {
			this.$set({ json });
			flush();
		}

		get options() {
			return this.$$.ctx[1];
		}

		set options(options) {
			this.$set({ options });
			flush();
		}
	}

	function render(container, json, options) {
	    const jsonForm = new App({
	        target: container,
	        props: {
	            json,
	            options,
	        },
	    });
	    return {
	        setJson: json => jsonForm.$set({ json }),
	        getJson: () => jsonForm.json,
	        setOptions: options => jsonForm.$set({ options: override(jsonForm.options, options) }),
	        getOptions: () => jsonForm.options,
	    }
	}

	function override(obj, overrideObj) {
	    Object.entries(overrideObj).forEach(([key, val]) => {
	        if (val !== undefined) {
	            if (typeof val !== 'object') {
	                obj[key] = overrideObj[key];
	            } else {
	                override(obj[key], overrideObj[key]);
	            }
	        }
	    });
	    return obj
	}

	function isCol(val) {
	    const keys = ['name', 'type', 'value'];
	    return keys.every(key => val.hasOwnProperty(key));
	}
	function createForm(container, param, param2) {
	    const json = setDefaultJson(param);
	    const options = setDefaultOptions(param, param2);
	    if (typeof container === 'string') {
	        const element = document.querySelector(container);
	        return element && render(element, json, options);
	    }
	    else {
	        return render(container, json, options);
	    }
	}
	function isObject(val) {
	    return Object.prototype.toString.call(val) === '[object Object]';
	}
	function isVaildJson(json) {
	    return (Array.isArray(json) &&
	        json.length > 0 &&
	        json.every(row => isObject(row) && Object.values(row).every(col => isObject(col) && isCol(col))));
	}
	function setDefaultJson(str) {
	    const defaultJson = [{ key: { name: '键值', type: 'string', value: '属性' } }];
	    let json;
	    if (typeof str === 'string') {
	        try {
	            json = JSON.parse(str);
	            if (!isVaildJson(json)) {
	                json = defaultJson;
	            }
	        }
	        catch {
	            json = defaultJson;
	        }
	    }
	    else {
	        json = defaultJson;
	    }
	    return json;
	}
	function setDefaultOptions(param, param2) {
	    const defaultOptions = {
	        editable: true,
	        style: {
	            width: 800,
	            height: 600,
	            fontSize: 25,
	            lineHeight: 1.6,
	            padding: {
	                top: 10,
	                right: 8,
	            },
	            background: 'none',
	        },
	    };
	    let options = {};
	    if (typeof param !== 'string' && param !== undefined) {
	        options = param;
	    }
	    if (param2 !== undefined) {
	        options = param2;
	    }
	    options = override(defaultOptions, options);
	    return options;
	}
	//# sourceMappingURL=json-form.esm.js.map

	const row1 = {
	    name: {
	        name: "名字",
	        type: "string",
	        value: "iroha"
	    },
	    learning: {
	        name: "学习中",
	        type: "boolean",
	        value: false
	    },
	    color: {
	        name: "颜色",
	        type: "color",
	        value: "#f45838"
	    },
	    addressCode: {
	        name: "邮编",
	        type: "string",
	        value: "200333"
	    },
	    description: {
	        name: "描述",
	        type: "string",
	        value: "这是一段描述语句...\n这是一段描述语句"
	    },
	    address: {
	        name: "地址",
	        type: "string",
	        value: "上海市普陀区金沙江路 1518 弄"
	    }
	};
	const row2 = {
	    name: {
	        name: "名字",
	        type: "string",
	        value: "iroha1024"
	    },
	    learning: {
	        name: "学习中",
	        type: "boolean",
	        value: true
	    },
	    color: {
	        name: "颜色",
	        type: "color",
	        value: "#ccc"
	    },
	    addressCode: {
	        name: "邮编",
	        type: "string",
	        value: "200333"
	    },
	    description: {
	        name: "描述",
	        type: "string",
	        value: "这是一段描述语句"
	    },
	    address: {
	        name: "地址",
	        type: "string",
	        value: "上海市普陀区金沙江路 1518 弄"
	    }
	};
	const json = [
	    row1,
	    row2,
	    row1,
	    row2,
	];
	const jsonForm = createForm('#app', JSON.stringify(json), { style: { background: 'stripe' } });

	const btn1 = document.getElementById('editable');
	btn1.addEventListener('click', () => {
	    let editable = jsonForm.getOptions().editable;
	    jsonForm.setOptions({ editable: !editable });
	});

	const btn2 = document.getElementById('background');
	btn2.addEventListener('click', () => {
	    let background = jsonForm.getOptions().style.background;
	    jsonForm.setOptions({ style: { background: background === 'stripe' ? 'none' : 'stripe' } });
	});

	const btn3 = document.getElementById('json');
	btn3.addEventListener('click', () => {
	    let json = jsonForm.getJson();
	    console.log(json);
	    console.log(JSON.stringify(json, null, 2));
	});

}());
