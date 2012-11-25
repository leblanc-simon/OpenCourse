var indexedDBClosure = function (options)
{
  var self = this;
  
  self.db;
  self.version = 1
  self.name = 'my-database';
  self.tables = [];
  self._onready = [];
  self.isReady = false;
  self.debug = false
  indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
  window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.mozIDBTransaction || window.msIDBTransaction;
  window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.mozIDBKeyRange || window.msIDBKeyRange;
  
  window.IDBTransaction.READ_WRITE = (window.IDBTransaction && 'READ_WRITE' in window.IDBTransaction) ? window.IDBTransaction.READ_WRITE : 'readwrite';
  
  // management options
  if (options) {
    if (options.name) {
      self.name = options.name;
    }
    if (options.tables) {
      self.tables = options.tables;
    }
    if (options.version) {
      self.version = options.version;
    }
    if (options.debug) {
      self.debug = options.debug;
    }
  }
  
  /**
   * Debug function
   *
   * @param   mixed   data  the datas to show when debug
   */
  var debugFn = function(data) {
    if (self.debug == true) {
      console.log(data);
    }
  }
  
  // management errors
  var onerror = function(event) {
    console.log('An error occured : ' + event.target.errorCode);
  };
  
  
  /**
   * Create all defined tables
   */
  var createTable = function() {
    debugFn('indexedDBClosure : createTable begin');
    for (var i = 0; i < self.tables.length; i++) {
      debugFn('indexedDBClosure : create table ' + self.tables[i].name);
      debugFn(self.tables[i]);
      
      try {
        var objectStore = self.db.createObjectStore(self.tables[i].name, { keyPath: self.tables[i].key });
      } catch (e) {
        debugFn(e);
      }
      
      if (self.tables[i].indexes) {
        for (var j = 0; j < self.tables[i].indexes.length; j++) {
          debugFn('indexedDBClosure : create index ' + self.tables[i].indexes[j].name);
          debugFn(self.tables[i].indexes[j]);
          
          var index = self.tables[i].indexes[j];
          try {
            objectStore.createIndex(index.name, index.key);
          } catch (e) {
            debugFn(e);
          }
        }
      }
    }
    debugFn('indexedDBClosure : createTable end');
  };
  
  
  /**
   * Update database in the last version
   */
  var updateDb = function() {
    debugFn('indexedDBClosure : updateDb begin');
    if (self.db.setVersion) {
      if (self.db.version != self.version) {
        var set_version = self.db.setVersion(self.version);
        
        set_version.onfailure = self.onerror;
        
        set_version.onsuccess = function(event) {
          createTable();
        }
      }
    }
    debugFn('indexedDBClosure : updateDb end');
  };
  
  // Open database
  var request = indexedDB.open(self.name, self.version);
  
  // Error while open the database
  request.onerror = onerror;
  
  // Success while open the database
  request.onsuccess = function(event) {
    debugFn('indexedDBClosure : indexedDB.open.success begin');
    self.db = request.result;
    updateDb();
    self.isReady = true;
    for (var i = 0; i < self._onready.length; i++) {
      self._onready[i]();
    }
    debugFn('indexedDBClosure : indexedDB.open.success end');
  };
  
  // Upgrade database if necessary
  request.onupgradeneeded = function(event) {
    debugFn('indexedDBClosure : onupgradeneeded begin');
    self.db = event.target.result;
    createTable();
    debugFn('indexedDBClosure : onupgradeneeded end');
  };
  
  //###########################################################
  //#
  //# Closures
  //#
  //###########################################################
  
  /**
   * Closure call when database is ready
   */
  this.ready = function(callBack) {
    debugFn('indexedDBClosure : ready begin');
    if (self.isReady == false) {
      self._onready.push(callBack);
    } else {
      callBack();
    }
    debugFn('indexedDBClosure : ready end');
  };
  
  
  /**
   * Get all items in a table
   *
   * @param   string    table     the table name
   * @param   function  callBack  the callback to call for each items found
   */
  this.getAll = function(table, callBack) {
    debugFn('indexedDBClosure : getAll begin');
    var transaction = self.db.transaction(table, IDBTransaction.READ_WRITE);
    
    transaction.onerror = onerror;
    
    transaction.oncomplete = function(event) {
      // TODO : transaction completed
    };  
    
    var objectStore = transaction.objectStore(table[0]);
    
    objectStore.openCursor().onsuccess = function(event) {
      debugFn('indexedDBClosure : getAll.success begin');
      var cursor = event.target.result;
      if (cursor) {
        callBack(cursor.value);
        cursor.continue();
      }
      debugFn('indexedDBClosure : getAll.success end');
    };
    debugFn('indexedDBClosure : getAll end');
  };
  
  
  /**
   * Get all items in a table and return in JSON format
   *
   * @param   string    table     the table name
   * @param   function  callBack  the callback to call when all items are found
   */
  this.getAllJSON = function(table, callBack) {
    debugFn('indexedDBClosure : getAllJSON begin');
    var transaction = self.db.transaction(table, IDBTransaction.READ_WRITE);
    
    transaction.onerror = onerror;
    
    transaction.oncomplete = function(event) {
      // TODO : transaction completed
    };  
    
    var objectStore = transaction.objectStore(table[0]);
    
    var allObjects = [];
    objectStore.openCursor().onsuccess = function(event) {
      debugFn('indexedDBClosure : getAllJSON.success begin');
      var cursor = event.target.result;
      if (cursor) {
        allObjects.push(cursor.value);
        cursor.continue();
      } else {
        callBack(allObjects);
      }
      debugFn('indexedDBClosure : getAllJSON.success end');
    };
    debugFn('indexedDBClosure : getAllJSON end');
  };
  
  
  /**
   * Get an item in a table by key
   *
   * @param   string    table     the table name
   * @param   mixed     key       the key to search
   * @param   function  callBack  the callback to call when the item is found
   */
  this.get = function(table, key, callBack) {
    debugFn('indexedDBClosure : get begin with key ' + key);
    var transaction = self.db.transaction(table, IDBTransaction.READ_WRITE);
    
    transaction.onerror = onerror;
    
    transaction.oncomplete = function(event) {
      // TODO : transaction completed
    };  
    
    var objectStore = transaction.objectStore(table[0]);
    
    objectStore.get(key).onsuccess = function(event) {
      debugFn('indexedDBClosure : get.success begin');
      callBack(event.target.result);
      debugFn('indexedDBClosure : get.success end');
    };
    debugFn('indexedDBClosure : get end');
  };
  
  
  /**
   * Add an item in a table
   *
   * @param   string    table           the table name
   * @param   object    datas           the datas to add in the table
   * @param   function  callBackSuccess the callback to call if datas is saved in the table
   * @param   function  callBackError   the callback to call if datas is *not* saved in the table
   */
  this.add = function(table, datas, callBackSuccess, callBackError) {
    debugFn('indexedDBClosure : add begin');
    var transaction = self.db.transaction(table, IDBTransaction.READ_WRITE);
    
    transaction.onerror = onerror;
    
    transaction.oncomplete = function(event) {
      // TODO : transaction completed
    };  
    
    var objectStore = transaction.objectStore(table[0]);
    var request = objectStore.add(datas);
    
    request.onsuccess = function(event) {  
      if (callBackSuccess) {
        debugFn('indexedDBClosure : add.success begin');
        callBackSuccess(event);
        debugFn('indexedDBClosure : add.success end');
      }
    };
    
    request.onerror = function(event) {  
      if (callBackError) {
        debugFn('indexedDBClosure : add.error begin');
        callBackError(event);
        debugFn('indexedDBClosure : add.error end');
      }
    };
    debugFn('indexedDBClosure : add end');
  };
  
  
  /**
   * Remove an item in a table
   *
   * @param   string    table           the table name
   * @param   mixed     key             the key of the object to remove
   * @param   function  callBackSuccess the callback to call if the object is removed in the table
   * @param   function  callBackError   the callback to call if the object is *not* removed in the table
   */
  this.remove = function(table, key, callBackSuccess, callBackError) {
    debugFn('indexedDBClosure : remove begin with key ' + key);
    var transaction = self.db.transaction(table, IDBTransaction.READ_WRITE);
    
    transaction.onerror = onerror;
    
    transaction.oncomplete = function(event) {
      // TODO : transaction completed
    };  
    
    var objectStore = transaction.objectStore(table[0]);
    var request = objectStore.delete(key);
    
    
    request.onsuccess = function(event) {  
      if (callBackSuccess) {
        debugFn('indexedDBClosure : remove.success begin');
        callBackSuccess(event);
        debugFn('indexedDBClosure : remove.success end');
      }
    };
    
    request.onerror = function(event) {  
      if (callBackError) {
        debugFn('indexedDBClosure : remove.error begin');
        callBackError(event);
        debugFn('indexedDBClosure : remove.error end');
      }
    };
    debugFn('indexedDBClosure : remove end');
  };
  
  
  /**
   * Update an item in a table
   *
   * @param   string    table           the table name
   * @param   mixed     key             the key of the object to update
   * @param   object    datas           the datas to add in the table
   * @param   function  callBackSuccess the callback to call if datas is updated in the table
   * @param   function  callBackError   the callback to call if datas is *not* updated in the table
   */
  this.update = function(table, key, datas, callBackSuccess, callBackError) {
    debugFn('indexedDBClosure : update begin');
    var transaction = self.db.transaction(table, IDBTransaction.READ_WRITE);
    
    transaction.onerror = onerror;
    
    transaction.oncomplete = function(event) {
      // TODO : transaction completed
    };  
    
    var objectStore = transaction.objectStore(table[0]);
    
    objectStore.openCursor(new IDBKeyRange.only(key)).onsuccess = function(event) {
      debugFn('indexedDBClosure : update.success begin');
      var cursor = event.target.result;
      if (cursor) {
        var request = cursor.update(datas);
        
        if (callBackSuccess) {
          request.onsuccess = callBackSuccess;
        }
        
        if (callBackError) {
          request.onerror = callBackError;
        }
      }
      debugFn('indexedDBClosure : update.success end');
    };
    debugFn('indexedDBClosure : update end');
  };
  
  
  /**
   * Search items in a table
   *
   * @param   string    table           the table name
   * @param   string    index           the index name where you search
   * @param   mixed     key             the value of the index that you search
   * @param   function  callBack        the callback to call for each item found
   * @param   function  callBackFinish  the callback to call when all items are found
   */
  this.search = function(table, index, key, callBack, callBackFinish) {
    debugFn('indexedDBClosure : search begin with index "' + index + '" and key ' + key);
    var transaction = self.db.transaction(table, IDBTransaction.READ_WRITE);
    
    transaction.onerror = onerror;
    
    transaction.oncomplete = function(event) {
      // TODO : transaction completed
    };  
    
    var objectStore = transaction.objectStore(table[0]);
    
    objectStore.index(index).openCursor(new IDBKeyRange.only(key)).onsuccess = function(event) {
      debugFn('indexedDBClosure : search.success begin');
      var cursor = event.target.result;
      if (cursor) {
        callBack(cursor.value);
        cursor.continue();
      } else {
        if (callBackFinish) {
          callBackFinish();
        }
      }
      debugFn('indexedDBClosure : search.success end');
    };
    debugFn('indexedDBClosure : search end');
  };
  
  
  /**
   * Count number of items in a table with criteria
   *
   * @param   string    table           the table name
   * @param   string    index           the index name where you search
   * @param   mixed     key             the value of the index that you search
   * @param   function  callBack        the callback to call when count is found
   */
  this.count = function(table, index, key, callBack){
    debugFn('indexedDBClosure : count begin with index "' + index + '" and key ' + key);
    var transaction = self.db.transaction(table, IDBTransaction.READ_WRITE);
    
    transaction.onerror = onerror;
    
    transaction.oncomplete = function(event) {
      // TODO : transaction completed
    };  
    
    var objectStore = transaction.objectStore(table[0]);
    
    objectStore.index(index).count(key).onsuccess = function(event) {
      debugFn('indexedDBClosure : count.success begin');
      callBack(event.target.result);
      debugFn('indexedDBClosure : count.success end');
    };
    debugFn('indexedDBClosure : count end');
  };
}