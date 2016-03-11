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
   * Fired when the service has been created.
   * 
   * @event created
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
  /**
   * Fired when new client has connected to a service.
   * 
   * @event client-connected
   * @param {Number} client A client id (socketId) that should be used to 
   * identify the receiver of messages sent to clients.
   */
  is: 'chrome-bluetooth-service',
  
  properties: {
    /**
     * The UUID of the service to publish.
     * It will throw an error if the uuid is not set before calling `publish()` 
     * function.
     */
    uuid: {
      type: String
    },
    /**
     * Type of the service to publish.
     */
    type: {
      type: String,
      value: 'RFCOMM'
    },
    /**
     * Created server socket id.
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
     * Clients connected to a service.
     */
    clients: {
      type: Array,
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
    /**
     * A handler to be called when connection from the remote device 
     * was accepted.
     */
    _onAcceptHandler: {
      value: function() {
        return this._onAcceptConnection.bind(this);
      }
    },
    _onAcceptErrorHandler: {
      value: function() {
        return this._onAcceptConnectionError.bind(this);
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
   * Publish the service.
   * This function can be called only once. Next calls will silently exit.
   */
  publish: function() {
    if (this.socketId) {
      return;
    }
    if (!this.uuid || !this.type) {
      this.fire('error', {
        message: 'You must set uuid and address before calling connect.'
      });
      return;
    }
    var type = this.type.toLowerCase();
    if (['rfcomm', 'l2cap'].indexOf(type) === -1) {
      this.fire('error', {
        message: `Unknown service type ${type}`
      });
      return;
    }
    chrome.bluetoothSocket.create((createInfo) => {
      this._setSocketId(createInfo.socketId);
      let fn = type === 'rfcomm' ? 'listenUsingRfcomm' : 'listenUsingL2cap';
      chrome.bluetoothSocket[fn](createInfo.socketId, this.uuid, () => {
        if (chrome.runtime.lastError) {
          this.fire('error', chrome.runtime.lastError);
          chrome.bluetoothSocket.close(this.socketId, () => {
            this._setSocketId(undefined);
          });
          return;
        }
        this.fire('created');
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
   * @param {Number} client A client to send message to.
   * @param {ArrayBuffer} buffer A message to send.
   */
  send: function(clientId, buffer) {
    if (!this.socketId) {
      throw new Error('Not connected to a socket.');
    }
    chrome.bluetoothSocket.send(clientId, buffer, (bytesSent) => {
      if (chrome.runtime.lastError) {
        this.fire('error', chrome.runtime.lastError);
        return;
      }
      this.fire('sent', {
        bytesSent: bytesSent,
        clientId: clientId
      });
    });
  },
  
  _attachListeners: function() {
    chrome.bluetoothSocket.onRecieve.addListener(this._onMessageHandler);
    chrome.bluetoothSocket.onReceiveError.addListener(this._onMessageErrorHandler);
    chrome.bluetoothSocket.onAccept.addListener(this._onAcceptHandler);
    chrome.bluetoothSocket.onAcceptError.addListener(this._onAcceptErrorHandler);
  },
  
  _removeListeners: function() {
    this.disconnect();
    chrome.bluetoothSocket.onRecieve.removeListener(this._onMessageHandler);
    chrome.bluetoothSocket.onReceiveError.removeListener(this._onMessageErrorHandler);
    chrome.bluetoothSocket.onAccept.removeListener(this._onAcceptHandler);
    chrome.bluetoothSocket.onAcceptError.removeListener(this._onAcceptErrorHandler);
  },
  /**
   * Called when the message has been received
   * TODO: is info.socketId a this.socketId or clients[].socketId? 
   */
  _onMessage: function(info) {
    var clientIndex = this._clientIndexOf(info.socketId);
    if (clientIndex === -1) {
      return;
    }
    var buffer = info.data;
    this._setLastMessage(buffer);
    this.fire('message', {
      buffer: buffer,
      clientId: info.socketId
    });
  },
  /**
   * Called when the connection error ocurred.
   */
  _onMessageError: function(info) {
    var clientIndex = this._clientIndexOf(info.socketId);
    if (clientIndex === -1) {
      return;
    }
    if (info.error) {
      switch (info.error) {
        case 'disconnected':
          this.clients.splice(clientIndex, 1);
          this.fire('client-disconnected', {
            clientId: info.clientSocketId
          });
          return;
      }
    }
    
    var message = info.errorMessage;
    this._setLastError(message);
    this.fire('error', {
      message: message,
      clientId: info.socketId
    });
    chrome.bluetoothSocket.setPaused(this.socketId, false, () => {});
  },
  
  /**
   * Called when the client has connected to the service.
   */
  _onAcceptConnection: function(info) {
    if (info.socketId !== this.socketId) {
      return;
    }
    this.clients.push(info);
    this.fire('client-connected', {
      clientId: info.clientSocketId
    });
    chrome.bluetoothSocket.setPaused(false);
  },
  /**
   * Client when there was an error during client connection.
   */
  _onAcceptConnectionError: function(info) {
    if (info.socketId !== this.socketId) {
      return;
    }
    this._setLastError(info.errorMessage);
    this.fire('client-error', {
      clientId: info.errorMessage
    });
    chrome.bluetoothSocket.setPaused(this.socketId, false, () => {});
  },
  /**
   * Check if given socket belongs to registered client.
   * 
   * @param {Number} clientId A client id (it's socketId)
   * @return {Number} An index possition of the client in `clients` property 
   * or -1 if not a registered client.
   */
  _clientIndexOf: function(clientId) {
    var clientIndex = -1;
    for(let i = 0, len = this.clients.length; i < len; i++) {
      if (this.clients[i].clientSocketId === clientId) {
        clientIndex = i;
        break;
      }
    }
    return clientIndex;
  }
});