/** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Path Utils
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
export function getPath(obj, path) {
    let allKeys = getAllKeysFromPath(path);
    let res = obj;
    for (let key of allKeys) {
        if (res === undefined) {
            break;
        }
        res = res[key];
    }
    return res;
}

export function setPath(obj, path, value) {
    return setByKey(obj != null ? obj : {}, getAllKeysFromPath(path), value);
}

function setByKey(obj, splittedKeys, value) {
    let key = splittedKeys[0];
    ensureKey(obj, key, splittedKeys[1]);
    let copy = Array.isArray(obj) ? [...obj] : { ...obj };
    if (splittedKeys.length === 1) {
        if (value === undefined) {
            if (Array.isArray(obj)) {
                copy.splice(key, 1);
            } else {
                delete copy[key];
            }
        } else {
            copy[key] = value;
        }
        return copy;
    }
    let newVal = setByKey(obj[key], splittedKeys.slice(1), value);
    obj[key] = newVal;
    return obj;
}

const ARRAY_INDEX = /(.*)\[(\d+)\]/;

function getAllKeysFromPath(path) {
    return path.split('.').flatMap((key) => {
        if (ARRAY_INDEX.test(key)) {
            let res = key.match(ARRAY_INDEX);
            return res.slice(1);
        }
        return [key];
    });
}

function ensureKey(obj, key, nextKey) {
    if (key in obj) {
        return;
    }
    let nextKeyAsInt = parseInt(
        nextKey !== null && nextKey !== undefined ? nextKey : ''
    );
    if (Number.isNaN(nextKeyAsInt)) {
        obj[key] = {};
    } else {
        obj[key] = Array(nextKeyAsInt + 1).fill(undefined);
    }
}

/** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Task Utils
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
class TaskCount {
    taskCount = 0;

    initialize = () => {
        this.taskCount = 0;
    };

    add = () => {
        this.taskCount = this.taskCount + 1;
    };

    isZero = () => {
        return this.taskCount < 1;
    };

    subtract = () => {
        if (this.taskCount <= 1) {
            this.taskCount = 0;
            return { isZero: true };
        } else {
            this.taskCount = this.taskCount - 1;
            return { isZero: false };
        }
    };
}

class PromiseBuilder {
    resolvers = [];

    makePausedPromise = () => {
        return new Promise((r) => {
            this.resolvers.push(r);
        });
    };

    makeCompletedPromise = () => {
        return Promise.resolve();
    };

    resolveAllPausedPromises = () => {
        const prevResolves = this.resolvers;
        this.resolvers = [];
        prevResolves.forEach((r) => r());
    };
}

const taskCount = new TaskCount();
const promiseBuilder = new PromiseBuilder();

export function startTask() {
    taskCount.add();
    return () => {
        const res = taskCount.subtract();
        if (res.isZero) {
            promiseBuilder.resolveAllPausedPromises();
        }
    };
}

export function task(asyncFunction) {
    const endTask = startTask();
    return asyncFunction().finally(endTask);
}

export function allTasks() {
    return taskCount.isZero()
        ? promiseBuilder.makeCompletedPromise()
        : promiseBuilder.makePausedPromise();
}

export function cleanTasks() {
    taskCount.initialize();
}

/** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Listener Queue Utils
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
export class ListenerQueue {
    queue = [];
    isEmpty = () => {
        return this.queue.length === 0;
    };

    empty = () => {
        this.queue.length = 0;
    };

    add = (props) => {
        if (typeof props.listener !== 'function')
            throw new Error('object must have a listener function');
        if (typeof props.level !== 'number')
            throw new Error('object must have a level number');
        this.queue.push(props);
    };

    emit = () => {
        for (let i = 0; i < this.queue.length; i += 1) {
            const currentListener = this.queue[i];
            const currentIsLowest = this.isListenerTheLowestInTheRestOfTheQueue(
                i,
                currentListener
            );

            if (!currentIsLowest) {
                // add the curent to the end of array, this will cause a duplicate
                // example, if [1,2,3], and we are 2,
                // this will will push to the end, and be [1,2,3,2]
                this.queue.push(currentListener);
            } else {
                currentListener.listener(
                    currentListener.value,
                    currentListener.changedKey
                );
            }
        }
    };

    isListenerTheLowestInTheRestOfTheQueue = (
        startingIndex,
        currentListener
    ) => {
        let isLowest = true;
        for (let i = startingIndex; i < this.queue.length; i += 1) {
            if (!isLowest) break;
            if (currentListener.level > this.queue[i].level) isLowest = false;
        }
        return isLowest;
    };
}

/** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Atoms
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
const globalListenerQueue = new ListenerQueue();

class Atom {
    listeners = [];
    level = 0;
    numberOfListeners = 0;
    value = null;

    constructor(initialValue, level) {
        this.level = level || 0;
        this.value = initialValue;
    }

    /**
     * Getter Setters
     */
    get = () => {
        if (!this.numberOfListeners) {
            this.listen(() => {})();
        }
        return this.value;
    };

    set = (data) => {
        if (this.value === data) return;
        this.value = data;
        this.notify();
    };

    /**
     * Listeners
     */
    #addListener = (listener, listenerLevel) => {
        const item = {
            listener,
            level: listenerLevel || this.level,
            id: Symbol(),
        };
        this.numberOfListeners = this.listeners.push(item);
        return item.id;
    };

    #makeRemoveListener = (id) => {
        return () => {
            let index = this.listeners.findIndex((x) => x.id === id);
            if (~index) {
                this.listeners.splice(index, 1);
                if (!--this.numberOfListeners && this.off) {
                    this.off();
                }
            }
        };
    };

    listen = (listener, listenerLevel) => {
        const id = this.#addListener(listener, listenerLevel);
        return this.#makeRemoveListener(id);
    };

    subscribe = (listener, listenerLevel) => {
        let unsubscribe = this.listen(listener, listenerLevel);
        listener(this.value);
        return unsubscribe;
    };

    /**
     * Notify
     */
    notify = (changedKey) => {
        let runListenerQueue = globalListenerQueue.isEmpty();

        for (let i = 0; i < this.listeners.length; i += 1) {
            globalListenerQueue.add({
                listener: this.listeners[i].listener,
                level: this.listeners[i].level,
                value: this.value,
                changedKey,
            });
        }

        if (runListenerQueue) {
            globalListenerQueue.emit();
            globalListenerQueue.empty();
        }
    };

    off = () => {};
}

/**
 * Atoms
 */
export let atom = (initialValue, level) => {
    return new Atom(initialValue, level);
};

export function atomDeep(initial = {}) {
    let $deepMap = new Atom(initial);
    $deepMap.setKey = (key, value) => {
        if (getPath($deepMap.value, key) !== value) {
            $deepMap.value = setPath($deepMap.value, key, value);
            $deepMap.notify(key);
        }
    };
    return $deepMap;
}

export let atomMap = (value = {}) => {
    let map = new Atom(value);

    map.setKey = function (key, newValue) {
        if (typeof newValue === 'undefined') {
            if (key in map.value) {
                map.value = { ...map.value };
                delete map.value[key];
                map.notify(key);
            }
        } else if (map.value[key] !== newValue) {
            map.value = {
                ...map.value,
                [key]: newValue,
            };
            map.notify(key);
        }
    };

    return map;
};

/** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Add Lifecycle
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
const START = 0;
const STOP = 1;
const SET = 2;
const NOTIFY = 3;
const MOUNT = 5;
const UNMOUNT = 6;
const ACTION = 7;
const REVERT_MUTATION = 10;

export let STORE_UNMOUNT_DELAY = 1000;

export let on = (object, listener, eventKey, mutateStore) => {
    object.events = object.events || {};
    if (!object.events[eventKey + REVERT_MUTATION]) {
        object.events[eventKey + REVERT_MUTATION] = mutateStore(
            (eventProps) => {
                // eslint-disable-next-line no-sequences
                object.events[eventKey].reduceRight(
                    (event, l) => (l(event), event),
                    {
                        shared: {},
                        ...eventProps,
                    }
                );
            }
        );
    }
    object.events[eventKey] = object.events[eventKey] || [];
    object.events[eventKey].push(listener);
    return () => {
        let currentListeners = object.events[eventKey];
        let index = currentListeners.indexOf(listener);
        currentListeners.splice(index, 1);
        if (!currentListeners.length) {
            delete object.events[eventKey];
            object.events[eventKey + REVERT_MUTATION]();
            delete object.events[eventKey + REVERT_MUTATION];
        }
    };
};

export let onMount = (store, initialize) => {
    let listener = (payload) => {
        let destroy = initialize(payload);
        if (destroy) {
            store.events[UNMOUNT].push(destroy);
        }
    };
    return on(store, listener, MOUNT, (runListeners) => {
        let originListen = store.listen;
        store.listen = (...args) => {
            if (!store.numberOfListeners && !store.active) {
                store.active = true;
                runListeners();
            }
            return originListen(...args);
        };

        let originOff = store.off;
        store.events[UNMOUNT] = [];
        store.off = () => {
            originOff();
            setTimeout(() => {
                if (store.active && !store.numberOfListeners) {
                    store.active = false;
                    for (let destroy of store.events[UNMOUNT]) destroy();
                    store.events[UNMOUNT] = [];
                }
            }, STORE_UNMOUNT_DELAY);
        };

        return () => {
            store.listen = originListen;
            store.off = originOff;
        };
    });
};

export let onNotify = ($store, listener) =>
    on($store, listener, NOTIFY, (runListeners) => {
        let originNotify = $store.notify;
        $store.notify = (changed) => {
            let isAborted;
            let abort = () => {
                isAborted = true;
            };

            runListeners({ abort, changed });
            if (!isAborted) return originNotify(changed);
        };
        return () => {
            $store.notify = originNotify;
        };
    });

/** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Add Actions
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
export let lastAction = Symbol();
export let actionId = Symbol();

let uid = 0;

export let doAction = ($store, actionName, cb, args) => {
    let id = ++uid;
    let tracker = { ...$store };
    tracker.set = (...setArgs) => {
        $store[lastAction] = actionName;
        $store[actionId] = id;
        $store.set(...setArgs);
        delete $store[lastAction];
        delete $store[actionId];
    };
    if ($store.setKey) {
        tracker.setKey = (...setArgs) => {
            $store[lastAction] = actionName;
            $store[actionId] = id;
            $store.setKey(...setArgs);
            delete $store[lastAction];
            delete $store[actionId];
        };
    }
    let onError, onEnd;
    if ($store.action) {
        const res = $store.action(id, actionName, args);
        onError = res[0];
        onEnd = res[1];
    }
    let result = cb(tracker, ...args);
    if (result instanceof Promise) {
        let endTask = startTask();
        return result
            .catch((error) => {
                if (onError) onError(error);
                throw error;
            })
            .finally(() => {
                endTask();
                if (onEnd) onEnd();
            });
    }
    if (onEnd) onEnd();
    return result;
};

export let action =
    ($store, actionName, cb) =>
    (...args) =>
        doAction($store, actionName, cb, args);

/** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Add Computed
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
export let computed = (stores, cb) => {
    if (!Array.isArray(stores)) stores = [stores];

    let diamondArgs;
    let run = () => {
        let args = stores.map(($store) => $store.get());
        if (
            diamondArgs === undefined ||
            args.some((arg, i) => arg !== diamondArgs[i])
        ) {
            diamondArgs = args;
            $computed.set(cb(...args));
        }
    };
    let $computed = atom(
        undefined,
        Math.max(...stores.map((s) => s.level)) + 1
    );

    onMount($computed, () => {
        let unbinds = stores.map(($store) =>
            $store.listen(run, $computed.level)
        );
        run();
        return () => {
            for (let unbind of unbinds) unbind();
        };
    });

    return $computed;
};

/** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Add ListenKeys
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
export function listenKeys($store, keys, listener) {
    let keysSet = new Set([...keys, undefined]);
    return $store.listen((value, changed) => {
        if (keysSet.has(changed)) {
            listener(value, changed);
        }
    });
}
