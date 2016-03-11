'use strict';

/* global chrome, ArrayBuffer, console */
Polymer({
  /**
   * Fired when an error occurred.
   * 
   * @event error
   * @param {String} message An error message with explanation.
   */
  /**
   * Fired when the connection has been made and the socket is ready to send
   * and receive data.
   * 
   * @event connected
   */
  /**
   * Fired when the connection has been closed and resources released.
   * 
   * @event disconnected
   */
  /**
   * Fired when message has been received.
   * 
   * @event message
   * @param {ArrayBuffer} buffer Received message.
   */
  /**
   * Fired when the message has been sent to a socket.
   * 
   * @event sent
   * @param {Number} bytesSent Number of bytes sent by a socket.
   */
  is: 'chrome-bluetooth-socket',
  
  properties: {
    /**
     * The UUID of the service to connect to.
     */
    uuid: {
      type: String
    },
    /**
     * The address of the Bluetooth device.
     * Use `chrome-bluetooth` element to get device address.
     */
    address: {
      type: String,
    },
    /**
     * Current socketId created by the app.
     */
    socketId: {
      type: Number,
      readOnly: true
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
    },
  },
  attached: function() {
    this._attachListeners();
  },
  
  detached: function() {
    this._removeListeners();
  },
  /**
   * Connnect to a socket.
   * The `uuid` and `address` properties must be set before calling this function.
   */
  connect: function() {
    if (!this.uuid || !this.address) {
      this.fire('error', {
        message: 'You must set uuid and address before calling connect.'
      });
      return;
    }
    chrome.bluetoothSocket.create((createInfo) => {
      this._setSocketId(createInfo.socketId);
      chrome.bluetoothSocket.connect(createInfo.socketId, this.address, this.uuid, () => {
        if (chrome.runtime.lastError) {
          this.fire('error', chrome.runtime.lastError);
          chrome.bluetoothSocket.close(this.socketId, () => {
            this._setSocketId(undefined);
          });
          return;
        }
        this.fire('connected');
      });
    });
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
   * Sends a message to a socket.
   * 
   * @param {ArrayBuffer} buffer A message to send.
   */
  send: function(buffer) {
    if (!this.socketId) {
      throw new Error('Not connected to a socket.');
    }
    chrome.bluetoothSocket.send(this.socketId, buffer, (bytesSent) => {
      if (chrome.runtime.lastError) {
        this.fire('error', chrome.runtime.lastError);
        return;
      }
      this.fire('sent', {
        bytesSent: bytesSent
      });
    });
  },
  
  _attachListeners: function() {
    chrome.bluetoothSocket.onRecieve.addListener(this._onMessageHandler);
    chrome.bluetoothSocket.onReceiveError.addListener(this._onMessageErrorHandler);
  },
  
  _removeListeners: function() {
    this.disconnect();
    chrome.bluetoothSocket.onRecieve.removeListener(this._onMessageHandler);
    chrome.bluetoothSocket.onReceiveError.removeListener(this._onMessageErrorHandler);
  },
  /**
   * Called when the message has been received
   */
  _onMessage: function(info) {
    if (info.socketId !== this.socketId) {
      return;
    }
    var buffer = info.data;
    this._setLastMessage(buffer);
    this.fire('message', {
      buffer: buffer
    });
  },
  /**
   * Called when the connection error ocurred.
   */
  _onMessageError: function(info) {
    if (info.socketId !== this.socketId) {
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
});