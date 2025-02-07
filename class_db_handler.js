console.log('loaded db_handler.js');
class DB_HANDLER {
    #version;
    #dbName;
    #storeName;
    #db;
    #eventDelayTimeout;

    /**
    * Db Handler to easy use of IndexedDB Object Store Databases
    * @constructor
    * @param {string} dbName Name your Database
    * @param {string} [storeName] Object Store Name
    * @param {number} [version] Object Store Name
    * @param {function} [cb] Callback function executes when database initialisation is done
    * @return {DB_HANDLER} DBHANDLER Object
    */ 
            
    constructor(dbName, storeName, version, cb = (sucess, err) => {}) {
        if (!dbName) throw new Error(`CLASS DB_HANDLER needs a name for the database to init: exampe:  const db = new DB_HANDLER('AnyName')`);
        this.#dbName = dbName;
        this.#version = version || 1;
        this.#storeName = storeName || dbName + '_ObjectStore';
        this.#init().then(cb).catch(cb(null, true));
    }

    /**
     * Class Internal DB Init Function
     * @async
     * @returns {Promise<string>}
     */
    async #init() {
        return new Promise((resolve, reject) => {
            const _request = indexedDB.open(this.#dbName, this.#version);
            const _storeName = this.#storeName; // private class variable is not accessable inside _request functions
                console.log('IndexedDB init()');
                console.log(_request);

                _request.onerror = (event) => {
                    reject(event);
                    console.error(event);
                    throw new Error('Indexed DB has an Error');
                }

                _request.onblocked = (event) => {
                    reject(event);
                    console.warn(event);
                    throw new Error('IndexedDB is blocked');
                }

                _request.onsuccess = (event) => {
                    this.#db = event.target.result;
                    resolve(event.target.result);
                }

                _request.onupgradeneeded = (event) => {
                    console.log(`DB_HANDLER: Database has to be created or Updated`);
                    console.log(JSON.stringify(event, null, 4));
                    console.log(event);

                    const _req = event.target;
                    const _db = _req.result;

                    if (!_db.objectStoreNames.contains(_storeName)) {
                        if (SETTINGS.DebugLevel > 10) console.log('Database needs to be created...');
                        const _storeOS = _db.createObjectStore(_storeName, { keyPath: 'id' });
                         _storeOS.createIndex('isNew', 'isNew', { unique: false });
                         _storeOS.createIndex('isFav', 'isFav', { unique: false });
                        _storeOS.createIndex('data_asin', 'data_asin', { unique: false });
                    } else {
                        // Get a reference to the implicit transaction for this request
                        // @type IDBTransaction
                        const _transaction = _req.transaction;

                        // Now, get a reference to the existing object store
                        // @type IDBObjectStore
                        const _store = _transaction.objectStore(_storeName);

                        console.log(`Updating Database from Version ${event.oldVersion} to ${event.newVersion}`);
                        switch(event.oldVersion) { // existing db version
                            //case 0: // We had to Create the DB, but this case should never happen
                            case 1: { // Update DB from Verion 1 to 2
                                // Add index for New and Favorites
                                // _store.createIndex('data_asin', 'data_asin');
                                break;
                            }
                            /*case 2: {
                                if (this.#checkForDuplicatedASIN()) {
                                    _store.createIndex('data_asin', 'data_asin', { unique: true });
                                }   
                                break;
                            }*/
                            case 2: {
                                  console.log('upgrading db to version 3');
                                  _store.deleteIndex('data_asin');
                                  this.#MigrateStore2(_transaction, _storeName);
                                  _store.createIndex('data_asin', 'data_asin', { unique: false });
                                  _store.createIndex('isNew', 'isNew', { unique: false });
                                  _store.createIndex('isFav', 'isFav', { unique: false });
                                break;
                            }
                            default: {
                                console.error(`There was any Unknown Error while Updating Database from ${event.oldVersion} to ${event.newVersion}`);
                            }
                        }
                    }
                };
        })
    };

    /**
    * DB ASIN CHECKER
    * @param {function} [cb] Callback function executes when database query is done
    */     
    #checkForDuplicatedASIN(){
        const _request = this.#getStore().openCursor();

        const existingDataAsinValues = [];
        _request.onsuccess = (event) => {
            const _cursor = event.target.result;
            if (_cursor) {
                    existingDataAsinValues.push(_cursor.key);
                    _cursor.continue();
                } else {
                    const uniqueDataAsinValues = Array.from(new Set(existingDataAsinValues));

                    if (existingDataAsinValues.length !== uniqueDataAsinValues.length) {
                        console.warn('Duplikate in "data_asin" gefunden. Bereinigen oder löschen Sie die Datenbank');
                        return false;
                    } else {
                        // Keine Duplikate gefunden, Sie können den Index jetzt als eindeutig markieren
                        // const uniqueIndex = _storeOS.createIndex('data_asin', 'data_asin', { unique: true });
                        return true;
                    }
                }
        };
        _request.onerror = (event) => {cb([]); throw new Error(`DB_HANDLER.#checkForDuplicatedAsin: ${event.target.error.name}`);};
    };

    // Performance fix: Migrate store to faster indexes, from getAll(s)
    // null is invalid key and will not be in our index, so the indexes will only contain one value: true.
    #MigrateStore2(transaction, storeName){
        const _store = transaction.objectStore(storeName);
        const _request = _store.openCursor();

        _request.onsuccess = (event) => {
            var cursor = event.target.result;
            if(cursor){
                let _updated = false;
                const updateData = cursor.value;
                if (updateData.isNew == false){
                    updateData.isNew = null;
                    _updated = true;
                }
                if (updateData.isFav == false){
                    updateData.isFav = null;
                    _updated = true;
                } else if (updateData.isFav == true){
                     updateData.isFav = 'true';
                    _updated = true;
                }

                if ( _updated ){
                    const request = cursor.update(updateData);
                    request.onsuccess = () => {
                    };
                    request.onerror = (event2) => {console.log(`Migration: ${event2.target.error.name}`);};
                }
                cursor.continue();
            }
            };
            _request.onerror = (event) => {console.log(`Migration:: ${event.target.error.name}`);};

    }
    /**
     * Fires the Event ave-database-changed when any writeaccess has happend
     */
    #fireDataChangedEvent() {
        if (this.#eventDelayTimeout) clearTimeout(this.#eventDelayTimeout);
        this.#eventDelayTimeout = setTimeout(() => {
            ave_eventhandler.emit('ave-database-changed');
            this.#eventDelayTimeout = null;
        }, 250);
    }

    /**
    * Get Object Store Object
    * @param {boolean} [rw] Set to true if u want to create a writeable access
    * @return {object} Object Store Object
    */
    #getStore(rw = false) {
        if (!this.#db) throw new Error('DB_HANDLER.#getStore: Database Object is not defined');
        const _transaction = this.#db.transaction([this.#storeName], (rw) ? 'readwrite':'readonly');
        const _store = _transaction.objectStore(this.#storeName);
        return _store;
    }

    /**
    * Add Object to Database
    * @async
    * @param {object} dbName Name your Database
    * @returns {Promise<void>}
    */ 
    async add(obj) {
        return new Promise((resolve, reject) => {
            if (typeof(obj) != 'object') reject('DB_HANDLER.add(): obj is not defined or is not type of object');
            console.log('Adding Object: ', obj.description_short );
            const _request = this.#getStore(true).add(obj);

            _request.onerror = (event) => {
                if (`${event.target.error}`.includes('data_asin')) {
                    console.error('Tried to ADD New Product with existing ASIN ???', obj.description_short);
                    // reject(event.target.error);
                    // database.add does nothing with the promise why waste resources
                    resolve();
                }
                else
                    reject(`DB_HANDLER.add(): ${event.target.error}`);
            };
            
            _request.onsuccess = (event) => {
                resolve();
                this.#fireDataChangedEvent();
            };
        })
    };

    /**
    * Get Object by ID
    * @async
    * @param {string} id Object ID
    * @returns {Promise<Product>}
    */ 
    async get(id){
        return new Promise((resolve, reject) => {
            if (typeof(id) != 'string') reject('DB_HANDLER.get(): id is not defined or is not typeof string');
            
            const _request = this.#getStore().get(id);
            _request.onerror = (event) => {reject(`DB_HANDLER.add(): ${event.target.error}`);};
            _request.onsuccess = (event) => {resolve(event.target.result);};
        })
    };

    /**
    * Get Object by ASIN
    * @async
    * @param {string} asin ASIN
    * @returns {Promise<Product>}
    */ 
    async getByASIN(asin){
        return new Promise((resolve, reject) => {
            if (typeof(asin) != 'string') reject('DB_HANDLER.get(): asin is not defined or is not typeof string');
            
            const _index = this.#getStore().index('data_asin');
            const _request = _index.get(asin);
            _request.onerror = (event) => {reject(`DB_HANDLER.add(): ${event.target.error.name}`);};
            _request.onsuccess = (event) => {resole(event.target.result);};
        })
    };

    /**
    * Update Object
    * @async
    * @param {object} obj Object to update
    * @returns {Promise<void>}
    */ 
    async update(obj, bFireUpdate = true){
        return new Promise((resolve, reject) => {
            //console.log('Called DB_HANDLER:update()');
            if (typeof(obj) != 'object') reject('DB_HANDLER.update(): obj is not defined or is not type of object');
            // console.log('Called DB_HANDLER:update() Stage 2');

            const _request = this.#getStore(true).put(obj);
            // console.log('Called DB_HANDLER:update() Stage 3');

            _request.onerror = (event) => {
                // console.log('DB_HANDLER:update() --> had an Error');
                reject(event.target.error);};

            _request.onsuccess = (event) => {
                if ( bFireUpdate )
                this.#fireDataChangedEvent();
                resolve();
            }
        })
    };

    /**
    * Query Database for Searchstring
    * @async
    * @param {(string|array)} query String to find
    * @returns {Promise<Product[]>}
    */ 
    async query(query){
        return new Promise((resolve, reject) => {
            if (typeof(query) != 'string' && !Array.isArray(query)) reject('DB_HANDLER.query(): query is not defined or is not typeof string or array');

            const _request = this.#getStore().openCursor();
            const _result = [];

            // Use a Array of words for search
            const _keys = (typeof(query) == 'string') ? [query] : query;
            for (let _key of _keys) {_key = _key.toLowerCase();}

            _request.onsuccess = (event) => {
                const _cursor = event.target.result;
                if (_cursor) {
                    const _descriptionFull = (_cursor.value.description_full || '').toLowerCase();

                    if (_keys.every((_key) => _descriptionFull.includes(_key))) {
                        _result.push(_cursor.value);
                    }

                    _cursor.continue();

                } else { // No more entries
                    resolve(_result);
                }
            };

            _request.onerror = (event) => {
                reject('Error querying records:', event.target.error.name);
            };
        })
    };


   /**
    * Get all keys from Database
    * @async
    * @returns {Promise<string[]>}
    */     
    async getAllKeys(){
        return new Promise((resolve, reject) => {
            const _request = this.#getStore().getAllKeys();
            _request.onsuccess = (event) => {resolve(event.target.result);};
            _request.onerror = (event) => {reject(`DB_HANDLER.getAllKeys(): ${event.target.error.name}`)};
        })
    };

   /**
    * Get all new "unseen" products from Database
    * @async
    * @returns {Promise<Product[]>}
    */     
    async getNewEntries(){
        return new Promise((resolve, reject) => {
            const _result = [];
            //const _request = this.#getStore().openCursor();
            const _request = this.#getStore().index('isNew').openCursor();

            _request.onsuccess = (event) => {
                const _cursor = event.target.result;

                if (_cursor) {
                    if (_cursor.value.isNew == 'true') {
                     _result.push(_cursor.value);
                    }
                    _cursor.continue();
                } else { // No more entries
                    resolve(_result);
                }
            };
            _request.onerror = (event) => {reject(`DB_HANDLER.getNewEntrys(): ${event.target.error.name}`);};
        })
    };

   /**
    * Get all Favorite products from Database
    * @async
    * @returns {Promise<Product[]>}
    */     
    async getFavEntries(cb){
        return new Promise((resolve, reject) => {
            const _result = [];
            //const _request = this.#getStore().openCursor();
            const _request = this.#getStore().index('isFav').openCursor();

            _request.onsuccess = (event) => {
                const _cursor = event.target.result;

                if (_cursor) {
                    if (_cursor.value.isFav == 'true') {
                        _result.push(_cursor.value);
                    }

                    _cursor.continue();
                } else { // No more entries
                    resolve(_result);
                }
            };
            _request.onerror = (event) => {reject(`DB_HANDLER.getNewEntrys(): ${event.target.error.name}`);};
        })
    };
    
    /**
     * Get all the Objects stored in our DB
     * @returns {Promise<Product[]>}
     */
    getAll() {
        return new Promise((resolve, reject) => {
            const _request = this.#getStore().getAll();
            _request.onsuccess = (event) => {resolve(event.target.result);};
            _request.onerror = (event) => {reject(`DB_HANDLER.getAll(): ${event.target.error.name}`);};
        })        
    }

    /**
    * Removes Object with given ID from Database
    * @async
    * @param {string} id Object ID
    * @returns {Promise<void>}
    */ 
    async removeID(id){
        return new Promise((resolve, reject) => {
            if (typeof(id) != 'string') (reject('DB_HANDLER.removeID(): id is not defined or is not typeof string'));

            const _request = this.#getStore(true).delete(id);
            _request.onsuccess = (event) => {
                resolve();
                this.#fireDataChangedEvent();
            };
            _request.onerror = (event) => {reject(`DB_HANDLER.removeID(): ${event.target.error.name}`);};
        })
    };

     /**
     * Deletes the entire database.
     * @async
     * @returns {Promise<void>}
     */
    async deleteDatabase() {
        return new Promise((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(this.#dbName);

            deleteRequest.onerror = (event) => {
                reject(event);
                console.error(event);
                throw new Error('Error deleting the database');
            };

            deleteRequest.onsuccess = () => {
                this.#db = null; // Reset the reference to the database
                resolve();
            };
        });
    }
}
