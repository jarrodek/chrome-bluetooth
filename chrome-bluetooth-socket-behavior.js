'use strict';
/* global window, ArrayBuffer, chrome, console */

window.ChromeBehaviors = window.ChromeBehaviors || {};

window.ChromeBehaviors.BluetoothSocketBehavior = {
  /**
   * Fired when message has been received from the socket.
   * In case of services it is a client message.
   * 
   * @event message
   * @param {ArrayBuffer} buffer Received message.
   * @param {Number} clientId A socketId. For sockets it is the socket and 
   * for services it is a clientId (client's socket id).
   */
  /**
   * Fired when the connection has been closed and resources released.
   * 
   * @event disconnected
   */
  /**
   * Fired when an error occurred.
   * 
   * @event error
   * @param {String} message An error message with explanation.
   */
  properties: {
    /**
     * Current socketId to operate on.
     * For services this is service socket, for sockets it is the socket.
     */
    socketId: {
      type: Number,
      readOnly: true
    },
    /**
     * For services it is the UUID of the service to publish.
     * For sockets it is the UUID of the service to connect to in the remote device.
     */
    uuid: {
      type: String
    },
    /**
     * Last received message.
     */
    lastMessage: {
      type: ArrayBuffer,
      readOnly: true,
      notify: true
    },
    /**
     * Last error message received from the socket.
     */
    lastError: {
      type: String,
      readOnly: true
    },
    /**
     * A handler to be called when socket message has been read.
     */
    _onMessageHandler: {
      value: function() {
        return this._onMessage.bind(this);
      }
    },
    /**
     * A handler to be called when socket message has been read.
     */
    _onMessageErrorHandler: {
      value: function() {
        return this._onMessageError.bind(this);
      }
    }
  },
  
  attached: function() {
    this._attachListeners();
  },
  
  detached: function() {
    this._removeListeners();
  },
  
  /**
   * Disconnects and destroys the socket. Each socket created should be closed 
   * after use. The socket id is no longer valid as soon at the function is 
   * called. However, the socket is guaranteed to be closed only when the 
   * callback is invoked.
   */
  disconnect: () => {
    if (!this.socketId) {
      return;
    }
    chrome.bluetoothSocket.disconnect(this.socketId, () => {
      chrome.bluetoothSocket.close(this.socketId, () => {
        this._setSocketId(undefined);
        this.fire('disconnected');
      });
    });
  },
  /**
   * Checks if the given socket is one of sockets that the app is handling 
   * at the moment.
   * The receiver is receiving all messages comming to the device via bluetooth.
   * This function will filter messages not directed to this app.
   */
  _isAllowedSocket: (socketId) => {
    return false;
  },
  /**
   * Attach socket listeners
   */
  _attachListeners: () => {
    chrome.bluetoothSocket.onReceive.addListener(this._onMessageHandler);
    chrome.bluetoothSocket.onReceiveError.addListener(this._onMessageErrorHandler);
  },
  /**
   * Remove socket listeners.
   */ 
  _removeListeners: () => {
    this.disconnect();
    chrome.bluetoothSocket.onReceive.removeListener(this._onMessageHandler);
    chrome.bluetoothSocket.onReceiveError.removeListener(this._onMessageErrorHandler);
  },
  /**
   * Called when a message has been received.
   * The `message` event will be called then and `lastMessage` property will 
   * be set.
   */
  _onMessage: (info) => {
    if (!this._isAllowedSocket(info.socketId)) {
      return;
    }
    var buffer = info.data;
    this._setLastMessage(buffer);
    var detail = {
      buffer: buffer,
      clientId: info.socketId
    };
    this.fire('message', detail);
  },
  /**
   * Called when the connection error ocurred.
   */
  _onMessageError: function(info) {
    if (!this._isAllowedSocket(info.socketId)) {
      return;
    }
    console.log('_onMessageError', info);
    var message = info.errorMessage;
    this._setLastError(message);
    this.fire('error', {
      message: message
    });
    chrome.bluetoothSocket.setPaused(this.socketId, false, () => {});
  }
};
