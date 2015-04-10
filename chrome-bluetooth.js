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
 * - (optional) deviceClass (integer) - The class of the device, a bit-field defined by http://www.bluetooth.org/en-us/specification/assigned-numbers/baseband.
 * - (optional) vendorIdSource (enum of "bluetooth", or "usb") - The Device ID record of the device, where available.
 * - (optional) vendorId (integer) -
 * - (optional) productId (integer) -
 * - (optional) deviceId (integer) -
 * - (optional) type (enum of "computer", "phone", "modem", "audio", "carAudio", "video", "peripheral", "joystick", "gamepad", "keyboard", "mouse", "tablet", or "keyboardMouseCombo") - The type of the device, if recognized by Chrome. This is obtained from the |deviceClass| field and only represents a small fraction of the possible device types. When in doubt you should use the |deviceClass| field directly.
 * - (optional) paired (boolean) - Indicates whether or not the device is paired with the system.
 * - (optional) connected (boolean) - Indicates whether the device is currently connected to the system.
 * - (optional) uuids (array of string) - UUIDs of protocols, profiles and services advertised by the device. For classic Bluetooth devices, this list is obtained from EIR data and SDP tables. For Low Energy devices, this list is obtained from AD and GATT primary services. For dual mode devices this may be obtained from both.
 *
 */


Polymer('chrome-bluetooth', {
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

  publish: {
    /**
     * Address of device to get.
     *
     * @attribute device
     * @type String
     * @default ''
     */
    'device': ''
  },

  _currentDevice: undefined,

  ready: function(){
    this._addListeners();
  },

  detached: function(){
    this._removeListeners();
  },

  _apiListeners: {},
  _addListeners: function(){
    var context = this;
    var added = function(device){
      context._onDeviceAdded(device);
    };
    var removed = function(device){
      context._onDeviceRemoved(device);
    };
    var changed = function(device){
      context._onDeviceChanged(device);
    };
    var stateChanged = function(adapterState){
      context._onAdapterStateChanged(adapterState);
    };
    this._apiListeners.added = added;
    this._apiListeners.changed = changed;
    this._apiListeners.removed = removed;
    this._apiListeners.stateChanged = stateChanged;
    chrome.bluetooth.onDeviceAdded.addListener(added);
    chrome.bluetooth.onDeviceChanged.addListener(changed);
    chrome.bluetooth.onDeviceRemoved.addListener(removed);
    chrome.bluetooth.onAdapterStateChanged.addListener(stateChanged);
  },

  _removeListeners: function(){
    chrome.bluetooth.onDeviceAdded.removeListener(this._apiListeners.added);
    chrome.bluetooth.onDeviceChanged.removeListener(this._apiListeners.changed);
    chrome.bluetooth.onDeviceRemoved.removeListener(this._apiListeners.removed);
    chrome.bluetooth.onAdapterStateChanged.removeListener(this._apiListeners.stateChanged);
  },

  _onDeviceAdded: function(device){
    this.fire('device-added', device);
  },

  _onDeviceChanged: function(device){
    this.fire('device-changed', device);
  },

  _onDeviceRemoved: function(device){
    this.fire('device-removed', device);
  },

  _onAdapterStateChanged: function(state){
    this.fire('state-changed', state);
  },

  deviceChanged: function(){
    this._currentDevice = undefined;

    if(!this.device.trim()) {
      return;
    }
    chrome.bluetooth.getDevice(this.device, function(device){
      if(chrome.runtime.lastError){
        this.fire('error', {'message': chrome.runtime.lastError});
        return;
      }
      this._currentDevice = device;
      this.fire('device', device);
    }.bind(this));
  },

  /**
   * Get information about the Bluetooth adapter.
   *
   */
  adapterState: function(){
    return new Promise(function(resolve, reject) {
      chrome.bluetooth.getAdapterState(function(adapterInfo){
        if(chrome.runtime.lastError){
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(adapterInfo);
      });
    });
  },

  device: function(){
    return this._currentDevice;
  },

  /**
   * Get a list of Bluetooth devices known to the system, including paired
   * and recently discovered devices.
   *
   */
  devices: function(){
    return new Promise(function(resolve, reject) {
      chrome.bluetooth.getDevices(function(deviceInfos){
        if(chrome.runtime.lastError){
          reject(chrome.runtime.lastError);
          return;
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
  startDiscovery: function(){
    var context = this;
    chrome.bluetooth.startDiscovery(function(){
      if(chrome.runtime.lastError){
        context.fire('error', {'message': chrome.runtime.lastError});
        return;
      }
      context.fire('discovery', {'mode': 'started'});
    });
  },

  /**
   * Stop discovery.
   *
   */
  stopDiscovery: function(){
    var context = this;
    chrome.bluetooth.stopDiscovery(function(){
      if(chrome.runtime.lastError){
        context.fire('error', {'message': chrome.runtime.lastError});
        return;
      }
      context.fire('discovery', {'mode': 'ended'});
    });
  }

});