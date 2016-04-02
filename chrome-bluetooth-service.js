'use strict';

/* global chrome, ArrayBuffer, console, ChromeBehaviors */
Polymer({
  /**
   * Fired when the service has been created.
   *
   * @event created
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
  behaviors: [
    ChromeBehaviors.BluetoothSocketBehavior
  ],
  properties: {
    /**
     * Type of the service to publish.
     */
    type: {
      type: String,
      value: 'RFCOMM'
    },
    /**
     * Clients connected to the service.
     */
    clients: {
      type: Array,
      readOnly: true,
      value: []
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
    },
    _onMessageHandler: {
      value: function() {
        return this._onMessage.bind(this);
      }
    },
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
        console.log('service is now created.');
        this.fire('created');
      });
    });
  },
  /**
   * Closes the service and releases the resources.
   */
  disconnect: function() {
    if (this.socketId) {
      return new Promise((resolve, reject) => {
        chrome.bluetoothSocket.close(this.socketId, () => {
          this._setSocketId(undefined);
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          console.log('The service is disconnected');
          this.fire('disconnected');
          resolve();
        });
      });
    } else {
      console.log('The service was disconnected');
      this.fire('disconnected');
      return Promise.resolve();
    }
  },
  /**
   * Sends a message to a client.
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
    chrome.bluetoothSocket.onReceive.addListener(this._onMessageHandler);
    chrome.bluetoothSocket.onReceiveError.addListener(this._onMessageErrorHandler);
    chrome.bluetoothSocket.onAccept.addListener(this._onAcceptHandler);
    chrome.bluetoothSocket.onAcceptError.addListener(this._onAcceptErrorHandler);
  },

  _removeListeners: function() {
    this.disconnect();
    chrome.bluetoothSocket.onReceive.removeListener(this._onMessageHandler);
    chrome.bluetoothSocket.onReceiveError.removeListener(this._onMessageErrorHandler);
    chrome.bluetoothSocket.onAccept.removeListener(this._onAcceptHandler);
    chrome.bluetoothSocket.onAcceptError.removeListener(this._onAcceptErrorHandler);
  },

  _isAllowedSocket: (socketId) => {
    var clientIndex = this._clientIndexOf(socketId);
    if (clientIndex === -1) {
      return false;
    }
    return true;
  },
  // Called when message arrive from the client
  _onMessage: function(info) {
    console.log('Client message', info);
  },
  /**
   * Called when the connection error ocurred.
   */
  _onMessageError: function(info) {
    if (!this._isAllowedSocket(info.socketId)) {
      return;
    }
    if (info.errorMessage) {
      switch (info.errorMessage) {
        case 'net::ERR_CONNECTION_CLOSED':
          this.disconnect();
          return;
      }
    }
    if (info.error) {
      switch (info.error) {
        case 'disconnected':
          let clientIndex = this._clientIndexOf(info.socketId);
          this.clients.splice(clientIndex, 1);
          console.log('client disconnected', info);
          this.fire('client-disconnected', {
            clientId: info.clientSocketId
          });
          return;
      }
    }
    console.log('Client message error', info);
    var message = info.errorMessage;
    this._setLastError(message);
    this.fire('error', {
      message: message,
      clientId: info.socketId
    });

    chrome.bluetoothSocket.setPaused(this.socketId, false, () => {
      if (chrome.runtime.lastError) {
        this.fire('error', {
          message: chrome.runtime.lastError.message,
          clientId: info.socketId
        });
      }
    });
  },

  /**
   * Called when the client has connected to the service.
   */
  _onAcceptConnection: function(info) {
    if (info.socketId !== this.socketId) {
      return;
    }
    console.log('Client accepted', info);
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
    if (info.errorMessage) {
      switch (info.errorMessage) {
        case 'net::ERR_CONNECTION_CLOSED':
          this.disconnect();
          return;
      }
    }
    console.log('Client accept error', info);
    this._setLastError(info.errorMessage);
    this.fire('client-error', {
      clientId: info.errorMessage
    });
    chrome.bluetoothSocket.setPaused(this.socketId, false, () => {
      if (chrome.runtime.lastError) {
        this.fire('error', {
          message: chrome.runtime.lastError.message,
          clientId: info.socketId
        });
      }
    });
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
