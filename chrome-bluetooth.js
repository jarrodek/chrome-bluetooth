'use strict';

/* global chrome, window */

/**
 * Types:
 *
 * AdapterState (https://developer.chrome.com/apps/bluetooth#type-AdapterState)
 * - address (String) - The address of the adapter, in the format 'XX:XX:XX:XX:XX:XX'.
 * - name (String) - The human-readable name of the adapter.
 * - powered (boolean) - Indicates whether or not the adapter has power.
 * - available (boolean) - Indicates whether or not the adapter is available (i.e. enabled).
 * - discovering (boolean) - Indicates whether or not the adapter is currently discovering.
 *
 * Device (https://developer.chrome.com/apps/bluetooth#type-Device)
 * - address (string) - The address of the device, in the format 'XX:XX:XX:XX:XX:XX'.
 * - (optional) name (string) - The human-readable name of the device.
 * - (optional) deviceClass (integer) - The class of the device,
 *   a bit-field defined by http://www.bluetooth.org/en-us/specification/assigned-numbers/baseband.
 * - (optional) vendorIdSource (enum of "bluetooth", or "usb") - The Device ID record of the
 *   device, where available.
 * - (optional) vendorId (integer) -
 * - (optional) productId (integer) -
 * - (optional) deviceId (integer) -
 * - (optional) type (enum of "computer", "phone", "modem", "audio", "carAudio", "video",
 *   "peripheral", "joystick", "gamepad", "keyboard", "mouse", "tablet", or "keyboardMouseCombo")
 *    - The type of the device, if recognized by Chrome. This is obtained from the |deviceClass|
 *    field and only represents a small fraction of the possible device types. When in doubt you
 *    should use the |deviceClass| field directly.
 * - (optional) paired (boolean) - Indicates whether or not the device is paired with the system.
 * - (optional) connected (boolean) - Indicates whether the device is currently connected to
 *   the system.
 * - (optional) uuids (array of string) - UUIDs of protocols, profiles and services advertised
 *   by the device. For classic Bluetooth devices, this list is obtained from EIR data and SDP
 *   tables. For Low Energy devices, this list is obtained from AD and GATT primary services.
 *   For dual mode devices this may be obtained from both.
 *
 */
Polymer({
  is: 'chrome-bluetooth',
  /**
   * Fired when the state of the Bluetooth adapter changes.
   * The details object will contain AdapterState object.
   *
   * @event state-changed
   */
  /**
   * Fired when information about a new Bluetooth device is available.
   * The details object will contain Device object.
   *
   * @event device-added
   */
  /**
   * Fired when information about a known Bluetooth device has changed.
   * The details object will contain Device object.
   *
   * @event device-changed
   */
  /**
   * Fired when a Bluetooth device that was previously discovered has been
   * out of range for long enough to be considered unavailable again,
   * and when a paired device is removed.
   * The details object will contain Device object.
   *
   * @event device-removed
   */
  /**
   * Fired when device's discovery started or ended.
   * The details object will contain "mode" key with enum of "started" or "ended".
   *
   * @event discovery
   */
  /**
   * Fired when an information about the device is available.
   * The details object will contain Device object.
   *
   * @event device
   */
  properties: {
    /**
     * Address of the device to get.
     *
     * @type String
     */
    device: String,
    /**
     * A handler to currently connected device.
     */
    currentDevice: {
      type: Object,
      readOnly: true,
      notify: true
    },
    /**
     * A map of discovered devices.
     * Keys are dicovered device address and the value is device name.
     */
    devices: {
      type: Array,
      readOnly: true,
      notify: true,
      value: []
    },
    /**
     * State of the Bluetooth adapter.
     * The keys are:
     * - {String} address The address of the adapter, in the format 'XX:XX:XX:XX:XX:XX'.
     * - {String} name The human-readable name of the adapter.
     * - {Boolean} powered Indicates whether or not the adapter has power.
     * - {Boolean} available Indicates whether or not the adapter is available (i.e. enabled).
     * - {Boolean} discovering Indicates whether or not the adapter is currently discovering.
     */
    adapterState: {
      type: Object,
      readOnly: true,
      notify: true
    },
    /**
     * True if the adapter is discoverying devices nearby.
     */
    discoverying: {
      type: Boolean,
      readOnly: true,
      notify: true,
      value: false
    },
    /**
     * A handler to be called when device has been added.
     */
    _onDeviceAddedHandler: {
      value: function() {
        return this._onDeviceAdded.bind(this);
      }
    },
    /**
     * A handler to be called when device has been removed.
     */
    _onDeviceRemovedHandler: {
      value: function() {
        return this._onDeviceRemoved.bind(this);
      }
    },
    /**
     * A handler to be called when device has been changed.
     */
    _onDeviceChangedHandler: {
      value: function() {
        return this._onDeviceChanged.bind(this);
      }
    },
    /**
     * A handler to be called when device state has changed.
     */
    _onAdapterStateChangedHandler: {
      value: function() {
        return this._onAdapterStateChanged.bind(this);
      }
    },
    /**
     * True when the element is detecting adapter state
     */
    detectingState: {
      type: Boolean,
      readOnly: true,
      value: true,
    },
    /**
     * A timeout in miliseconds after the Bluetooth will exit discovery mode 
     * after entering into it.
     * 
     */
    discoveryTimeout: {
      type: Number,
      value: 30000
    }
  },

  ready: function() {
    this._addListeners();
    this.detectAdapterState();
  },

  detached: function() {
    this._removeListeners();
    this.getDevices();
  },

  _addListeners: function() {
    chrome.bluetooth.onDeviceAdded.addListener(this._onDeviceAddedHandler);
    chrome.bluetooth.onDeviceChanged.addListener(this._onDeviceChangedHandler);
    chrome.bluetooth.onDeviceRemoved.addListener(this._onDeviceRemovedHandler);
    chrome.bluetooth.onAdapterStateChanged.addListener(this._onAdapterStateChangedHandler);
  },

  _removeListeners: function() {
    chrome.bluetooth.onDeviceAdded.removeListener(this._onDeviceAddedHandler);
    chrome.bluetooth.onDeviceChanged.removeListener(this._onDeviceChangedHandler);
    chrome.bluetooth.onDeviceRemoved.removeListener(this._onDeviceRemovedHandler);
    chrome.bluetooth.onAdapterStateChanged.removeListener(this._onAdapterStateChangedHandler);
  },
  /**
   * Detects Bluetooth adapter state.
   * Result will be saved in `adapterState` property.
   * When ready the `state-changed` event will be fired.
   * 
   * @return {Promise} Fulfilled promise will return current state.
   */
  detectAdapterState: function() {
    return new Promise((resolve) => {
      this._setDetectingState(true);
      chrome.bluetooth.getAdapterState((state) => {
        this._setDetectingState(false);
        this._setAdapterState(state);
        this.fire('state-changed', state);
        resolve(state);
      });
    });
  },

  _onDeviceAdded: function(device) {
    this._updateDeviceName(device);
    this.fire('device-added', device);
  },

  _onDeviceChanged: function(device) {
    this._updateDeviceName(device);
    this.fire('device-changed', device);
  },

  _onDeviceRemoved: function(device) {
    this._removeDeviceName(device);
    this.fire('device-removed', device);
  },

  _onAdapterStateChanged: function(state) {
    this.fire('state-changed', state);
  },
  /**
   * Updates dicovered devices list.
   */
  _updateDeviceName: function(device) {
    var devices = this.devices;
    var found = false; 
    for (let i=0, len = devices.length; i<len; i++) {
      if (device.address === devices[i].address) {
        this.splice('devices', i, 1, device);
        found = true;
        break;
      }
    }
    if (!found) {
      this.push('devices', device);
    }
    // devices.push(device);
    // this._setDevices(devices);
  },
  /**
   * Remove device name from the list of the devices names.
   */
  _removeDeviceName: function(device) {
    var devices = this.devices;
    //device.address
    for (let i=0, len = devices.length; i<len; i++) {
      if (device.address === devices[i].address) {
        // devices.splice(i, 1);
        this.splice('devices', i, 1);
        // this._setDevices(devices);
        break;
      }
    }
  },
  
  deviceChanged: function() {
    this._setCurrentDevice(null);

    if (!this.device.trim()) {
      return;
    }

    chrome.bluetooth.getDevice(this.device, (device) => {
      if (chrome.runtime.lastError) {
        this.fire('error', {
          'message': chrome.runtime.lastError
        });
        return;
      }
      this._setCurrentDevice(device);
      this.fire('device', device);
    });
  },

  device: function() {
    return this.currentDevice;
  },

  /**
   * Get a list of Bluetooth devices known to the system, including paired
   * and recently discovered devices.
   *
   * @return {Promise} Fulfilled promise will result with a list of available devices.
   */
  getDevices: function() {
    return new Promise((resolve, reject) => {
      chrome.bluetooth.getDevices((deviceInfos) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        for (var i = 0, len = deviceInfos.length; i < len; i++) {
          this._updateDeviceName(deviceInfos[i]);
        }
        resolve(deviceInfos);
      });
    });
  },

  /**
   * Start discovery. Newly discovered devices will be returned via
   * the onDeviceAdded event. Previously discovered devices already known
   * to the adapter must be obtained using getDevices and will only be updated
   * using the |on-device-changed| event if information about them changes.
   *
   * Discovery will fail to start if this application has already called
   * startDiscovery. Discovery can be resource intensive: stopDiscovery
   * should be called as soon as possible.
   *
   */
  startDiscovery: function() {
    this._setDiscoverying(true);
    chrome.bluetooth.startDiscovery(() => {
      if (chrome.runtime.lastError) {
        this._setDiscoverying(false);
        this.fire('error', {
          'message': chrome.runtime.lastError
        });
        return;
      }
      this.fire('discovery', {
        'mode': 'started'
      });
      if (!this.discoveryTimeout) {
        return;
      }
      window.setTimeout(() => {
        chrome.bluetooth.stopDiscovery(function() {});
      }, this.discoveryTimeout);
    });
  },

  /**
   * Stop discovery.
   *
   */
  stopDiscovery: function() {
    chrome.bluetooth.stopDiscovery(() => {
      if (chrome.runtime.lastError) {
        this.fire('error', {
          'message': chrome.runtime.lastError
        });
        return;
      }
      this._setDiscoverying(false);
      this.fire('discovery', {
        'mode': 'ended'
      });
    });
  }
});
