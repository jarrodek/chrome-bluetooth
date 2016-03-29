'use strict';

/* global chrome, ArrayBuffer, console, ChromeBehaviors */

Polymer({
  /**
   * Fired when the connection has been made and the socket is ready to send
   * and receive data.
   *
   * @event connected
   */
  /**
   * Fired when the message has been sent to a socket.
   *
   * @event sent
   * @param {Number} bytesSent Number of bytes sent by a socket.
   */
  is: 'chrome-bluetooth-socket',
  behaviors: [
    ChromeBehaviors.BluetoothSocketBehavior
  ],
  properties: {
    /**
     * The address of the Bluetooth device.
     * Use `chrome-bluetooth` element to get device address.
     */
    address: {
      type: String,
    }
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
      chrome.bluetoothSocket.connect(createInfo.socketId, this.address, this.uuid, function() {
        if (chrome.runtime.lastError) {
          this.fire('error', chrome.runtime.lastError);
          chrome.bluetoothSocket.close(this.socketId, () => {
            this._setSocketId(undefined);
          });
          return;
        }
        this.fire('connected');
      }.bind(this));
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

  _isAllowedSocket: (socketId) => {
    if (socketId !== this.socketId) {
      return false;
    }
    return true;
  }
});
