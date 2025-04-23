/**
 * Set a property value
 * @param {Object|Array} object
 * @param {[string]} keys
 * @param {*} value
 * @throws {Cannot locate intermediate key: ${keys}}
 */
export function setKeys (object, keys, value) {
  const initialKeys = keys.slice(0, -1)
  const lastKey = keys[keys.length - 1]
  const finalObject = initialKeys.reduce((object, key) => {
    if (!(key in object)) throw new Error(`Cannot locate intermediate key: ${keys}`)
    return object[key]
  }, object)
  finalObject[lastKey] = value
}

/**
 * Get a property value
 * @param {Object|Array} object
 * @param {[string]} keys
 * @returns {*}
 * @throws {Cannot locate intermediate key: ${keys}}
 */
export function getKeys (object, keys) {
  return keys.reduce((object, key) => {
    if (!(key in object)) throw new Error(`Cannot locate intermediate key: ${keys}`)
    return object[key]
  }, object)
}

/**
 * Delete a property
 * @param {Object|Array} object
 * @param {[string]} keys
 * @throws {Cannot locate intermediate key: ${keys}}
 */
export function deleteKeys (object, keys) {
  const initialKeys = keys.slice(0, -1)
  const lastKey = keys[keys.length - 1]
  const finalObject = initialKeys.reduce((object, key) => {
    if (!(key in object)) throw new Error(`Cannot locate intermediate key: ${keys}`)
    return object[key]
  }, object)
  delete finalObject[lastKey]
}

/**
 * Clones some JSON
 * @param {Object|Array|string|number|null} object
 * @returns {Object|Array|string|number|null}
 */
export function clone (object) {
  return JSON.parse(JSON.stringify(object))
}

/**
 * Wraps a JSON hierarchy in transparent, dynamically generated
 * Proxy instances to trap JSON change entries, keeping them in
 * a journal to undo, patch or capture.
 */
export default class Journal {
  /**
   * @param {Object} options
   * @param {Object|Array} options.data JSON to wrap
   * @param {Function} [options.supplementEntry] Entry supplementation function
   */
  constructor ({
    logger,
    data
  }) {

    /**
     * Add supplemental information to the journal
     *   for both adapt content and plugins
     */
    const supplementEntry = (entry, data) => {
      switch (entry.keys[0]) {
        case 'fromPlugins':
          // plugin name
          entry._name = data[entry.keys[0]][entry.keys[1]]?.name ?? '';
          break;
        case 'content':
          // object _id, _type and _component or _extension if available
          entry._id = data[entry.keys[0]][entry.keys[1]]?._id ?? '';
          entry._type = data[entry.keys[0]][entry.keys[1]]?._type ?? '';
          if (entry._type && data[entry.keys[0]][entry.keys[1]]?.[`_${entry._type}`]) {
            entry._name = entry[`_${entry._type}`] = data[entry.keys[0]][entry.keys[1]]?.[`_${entry._type}`] ?? '';
          }
      }
      return entry;
    }
    /**
     *
     * @param {string} method add/set/delete to signify how the JSON was modified
     * @param {[string]} keys An array of key names to a location in the JSON hierarchy
     * @param {Object|Array|string|number|null}  value Value after change
     * @param {Object|Array|string|number|null}  previous Value before change
     * @returns
     */
    const addEntry = (method, keys, value = null, previous = null) => {
      // Prevent entries from being added whilst undoing.
      if (this.isUndoing) return
      // Add entries to the entries list with any necessary supplemental information.
      this.entries.push(supplementEntry({
        method,
        keys,
        // Clone the value and previous to preserve the values of objects by reference.
        value: clone(value),
        previous: clone(previous)
      }, this.data))
    }
    /**
     * Wrap an Object or Array in a proxy to trap changes
     * @param {Object|Array} data JSON object or array to wrap in a proxy
     * @param {[string]} [keys] Use the closure to store the key location of the generated proxy instance
     * @returns {Proxy<Object|Array>}
     */
    const wrap = (data, keys = []) => {
      const journal = this
      return new Proxy(data, {
        /**
         * Getter trap. If the property value is an Array or Object, return wrapped at the next key location
         * @param {Object|Array} target
         * @param {string} prop Array index or object property name
         * @returns {Proxy<Object|Array>|string|number|null}
         */
        get (target, prop) {
          const value = target[prop]
          if (prop === 'valueOf' && typeof value === 'function') {
            // Special case for turning a proxy into its JSON, which is otherwise not possible
            // This prevents the data side from being infected by proxies.
            return function () {
              return target
            }
          }
          if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
            // Wrap an array or object in a new proxy, passing the appropriate key into the closure.
            return wrap(value, keys.concat([prop]))
          }
          return Reflect.get(...arguments)
        },
        /**
         * Setter trap. Adds entries to the journal at the current key location for sets or adds to the Object or Array.
         * Has special cases for array length modifications.
         * @param {Object|Array} target
         * @param {string} prop
         * @param {Object|Array|string|number|null} value
         * @param {Proxy} proxy
         * @returns {boolean}
         * @throws {Data is frozen, cannot modify}
         */
        set (target, prop, value, proxy) {
          if (journal.isFrozen) throw new Error('Data is frozen, cannot modify')
          // Special case for turning a proxy into its JSON, which is otherwise not possible.
          // This prevents the data side from being infected by proxies.
          if (value?.valueOf) value = value.valueOf()
          const previous = target[prop]
          const isArrayLength = (Array.isArray(target) && prop === 'length')
          const isObjectPropertyAdd = !(prop in target)
          if (isArrayLength && target.length === value) {
            // Ignore identically set lengths for array (splice can do this)
            // We don't need to add an entry for this.
            return true
          } else if (isObjectPropertyAdd) {
            if (Array.isArray(target) && !isNaN(prop)) {
              // An array index value is being set.
              const intProp = parseInt(prop)
              if (intProp >= target.length) {
                // Make sure to keep the previous length if the array is growing.
                addEntry('set', keys.concat(['length']), intProp + 1, target.length)
              }
            }
            // Add an entry for an indexed/named property addition, with its new value.
            addEntry('add', keys.concat([prop]), value, undefined)
          } else {
            // Add an entry for a changed indexed/named property value.
            addEntry('set', keys.concat([prop]), value, previous)
          }
          return Reflect.set(target, prop, value, proxy)
        },
        /**
         * Delete trap. Adds a journal entry if an indexed/named property is deleted.
         * Splice on an array or delete on an object.
         * @param {Object|Array} target
         * @param {string} prop
         * @returns {boolean}
         * @throws {Data is frozen, cannot modify}
         */
        deleteProperty (target, prop) {
          if (journal.isFrozen) throw new Error('Data is frozen, cannot modify')
          const previous = target[prop]
          addEntry('delete', keys.concat([prop]), undefined, previous)
          return Reflect.deleteProperty(...arguments)
        }
      })
    }
    /**
     * Original JSON.
     * @type {Object|Array}
     * */
    this.data = data
    /**
     * Proxied version of data.
     * @type {Proxy<Object|Array>}
     * */
    this.subject = wrap(data)
  }

  /**
   * Signifies if the proxy is frozen for sets.
   * @type {boolean}
   */
  get isFrozen () {
    return this._isFrozen ?? false
  }

  /**
   * Freeze the subject for sets.
   */
  freeze () {
    this._isFrozen = true
  }

  /**
   * Open the subject to sets.
   */
  unfreeze () {
    this._isFrozen = false
  }

  /**
   * Undo and return entries.
   * @param {number} [count] Number of entries to undo. Defaults to all.
   * @returns {Array<Object>} Returns undone journal entries.
   * @throws {Cannot locate intermediate key: ${keys}}
   */
  undo (count = this.entries.length) {
    const entries = []
    this.isUndoing = true
    for (let i = 0, l = count; i < l; i++) {
      const entry = this.entries.pop()
      entries.unshift(entry)
      switch (entry.method) {
        case 'delete':
        case 'set':
          setKeys(this.subject, entry.keys, entry.previous)
          break
        case 'add':
          deleteKeys(this.subject, entry.keys)
          break
      }
    }
    this.isUndoing = false
    return entries
  }

  /**
   * Undo entries up until a specified index.
   * @param {Number} [index=-1] Index up to which to undo. Used in conjunction with lastEntryIndex.
   * @returns {Array<Object>} Returns undone journal entries.
   * @throws {Cannot locate intermediate key: ${keys}}
   */
  undoToIndex (index = -1) {
    const lastIndex = this.entries.length - 1
    const count = lastIndex - index
    return this.undo(count)
  }

  /**
   * Apply specified entries to the data JSON
   * @param {Array<Object>} entries Entries to apply to the data JSON.
   * @throws Cannot locate intermediate key: ${keys}
   */
  patch (entries) {
    for (const entry of entries) {
      switch (entry.method) {
        case 'delete':
          deleteKeys(this.subject, entry.keys)
          break
        case 'set':
        case 'add':
          setKeys(this.subject, entry.keys, entry.value)
          break
      }
    }
  }

  /** @type {number} */
  get lastEntryIndex () {
    return this.entries.length - 1
  }

  /** @type {Array<Object>} */
  get entries () {
    return (this._entries = this._entries || [])
  }

  /** @type {Object} */
  get lastEntry () {
    return this.entries[this.entries.length - 1]
  }
}
